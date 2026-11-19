import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';

interface ImageKitConfig {
  /** Sin "/" final, p. ej. https://ik.imagekit.io/tu_id */
  urlEndpoint: string;
  publicKey: string;
  privateKey: string;
}

/**
 * Firma con la que el navegador sube directo a ImageKit (los archivos no pasan por nuestra API).
 * Se envían `publicKey`, `token`, `expire`, `signature` y `params` tal cual, más `file` y `fileName`.
 */
export interface UploadSignature {
  uploadUrl: string;
  publicKey: string;
  token: string;
  expire: number;
  signature: string;
  params: Record<string, string>;
}

const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const API_URL = 'https://api.imagekit.io/v1/files';
/** ImageKit acepta firmas de hasta 1 h; 30 min alcanzan con señal lenta. */
const SIGNATURE_TTL_S = 30 * 60;
/** Lo que dura el enlace con el que un admin ve un documento privado. */
const PRIVATE_URL_TTL_S = 10 * 60;
const PRIVATE_MAX_BYTES = 10 * 1024 * 1024;
const PRIVATE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

export const userFolder = (userId: string) => `bara-bara/u/${userId}`;

/** Documentos que nunca deben ser públicos: INE/comprobante (kyc) y comprobantes de pago. */
export type PrivatePurpose = 'kyc' | 'payment';
export const privateFolder = (purpose: PrivatePurpose, userId: string) => `bara-bara/private/${purpose}/${userId}`;

/** Respuesta de GET /v1/files/:id/details (solo lo que revisamos). */
interface FileDetails {
  filePath: string;
  isPrivateFile: boolean;
  mime?: string;
  size: number;
}

/**
 * Almacenamiento de imágenes y documentos en ImageKit.
 *
 * La firma de subida de ImageKit (v1) cubre solo token + expiración, no la carpeta ni la marca de
 * privado. Por eso nada se acepta a ciegas:
 *  - fotos públicas: la API solo guarda URLs de la carpeta del propio vecino;
 *  - documentos privados: el backend consulta el archivo en ImageKit y exige carpeta propia,
 *    isPrivateFile = true, tipo y tamaño permitidos.
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly config: ImageKitConfig | null;

  constructor(config: ConfigService) {
    const urlEndpoint = config.get<string>('IMAGEKIT_URL_ENDPOINT')?.trim().replace(/\/+$/, '');
    const publicKey = config.get<string>('IMAGEKIT_PUBLIC_KEY')?.trim();
    const privateKey = config.get<string>('IMAGEKIT_PRIVATE_KEY')?.trim();
    this.config =
      urlEndpoint?.startsWith('https://') && publicKey && privateKey ? { urlEndpoint, publicKey, privateKey } : null;
  }

  get enabled(): boolean {
    return this.config !== null;
  }

  /** Fotos de publicaciones y chambas (públicas). */
  createSignature(userId: string): UploadSignature {
    if (!this.config) throw new ServiceUnavailableException('La subida de fotos no está configurada');
    return this.sign({ folder: `/${userFolder(userId)}`, useUniqueFileName: 'true' });
  }

  /** INE, comprobante de domicilio o de pago: archivo privado, solo visible con URL firmada. */
  createPrivateSignature(userId: string, purpose: PrivatePurpose): UploadSignature {
    if (!this.config) throw new ServiceUnavailableException('La subida de documentos no está configurada');
    return this.sign({ folder: `/${privateFolder(purpose, userId)}`, useUniqueFileName: 'true', isPrivateFile: 'true' });
  }

  /** https://imagekit.io/docs/api-reference/upload-file/upload-file#how-to-implement-client-side-file-upload */
  private sign(params: Record<string, string>): UploadSignature {
    const { publicKey, privateKey } = this.config!;
    const token = randomUUID();
    const expire = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_S;
    const signature = createHmac('sha1', privateKey).update(token + expire).digest('hex');
    return { uploadUrl: UPLOAD_URL, publicKey, token, expire, signature, params };
  }

  /**
   * Comprueba en ImageKit un documento privado que el vecino dice haber subido y devuelve su ruta
   * (lo que se guarda en la base). Si alguien lo subió como público en la carpeta privada, se borra.
   */
  async verifyPrivateUpload(upload: { fileId: string }, userId: string, purpose: PrivatePurpose): Promise<string> {
    if (!this.config) throw new ServiceUnavailableException('La subida de documentos no está configurada');
    const reject = () => new BadRequestException('Solo puedes enviar documentos que subiste desde Bara Bara');

    const details = await this.fileDetails(upload.fileId);
    if (!details) throw reject();

    const inOwnFolder = details.filePath.startsWith(`/${privateFolder(purpose, userId)}/`) && !details.filePath.includes('..');
    if (!inOwnFolder) throw reject();
    if (!details.isPrivateFile) {
      await this.deleteFile(upload.fileId); // nunca dejamos una INE con enlace público
      throw reject();
    }
    if (!details.mime || !PRIVATE_MIME.includes(details.mime)) {
      throw new BadRequestException('Formato no permitido: sube una foto (JPG, PNG, WEBP, HEIC) o un PDF');
    }
    if (details.size > PRIVATE_MAX_BYTES) throw new BadRequestException('El archivo pesa más de 10 MB');
    return details.filePath;
  }

  /**
   * Enlace a un archivo privado que caduca en 10 minutos. Solo para la revisión de un admin.
   * null si ImageKit no está configurado. https://imagekit.io/docs/media-delivery-basic-security
   */
  signedPrivateUrl(filePath: string): string | null {
    if (!this.config) return null;
    const expire = Math.floor(Date.now() / 1000) + PRIVATE_URL_TTL_S;
    const path = encodeURI(filePath.replace(/^\/+/, ''));
    const signature = createHmac('sha1', this.config.privateKey).update(path + expire).digest('hex');
    return `${this.config.urlEndpoint}/${path}?ik-t=${expire}&ik-s=${signature}`;
  }

  /**
   * Solo se aceptan fotos subidas por el propio vecino a nuestra cuenta de ImageKit.
   * Evita enlazar imágenes de terceros (rastreo, contenido ajeno) o de otros usuarios.
   */
  assertOwnImages(images: string[] | undefined, userId: string) {
    if (!images?.length) return;

    const prefix = this.config && `${this.config.urlEndpoint}/${userFolder(userId)}/`;
    const valid = images.every((raw) => {
      try {
        const url = new URL(raw);
        return (
          !!prefix &&
          url.protocol === 'https:' &&
          !url.username &&
          !url.search &&
          `${url.origin}${url.pathname}`.startsWith(prefix) &&
          !url.pathname.includes('..')
        );
      } catch {
        return false;
      }
    });

    if (!valid) {
      const message = 'Solo puedes usar fotos que subiste desde Bara Bara';
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: [message],
        fields: { images: message },
      });
    }
  }

  // ── API de administración de ImageKit (autenticación básica con la llave privada) ──

  private authHeader() {
    return `Basic ${Buffer.from(`${this.config!.privateKey}:`).toString('base64')}`;
  }

  private async fileDetails(fileId: string): Promise<FileDetails | null> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/${encodeURIComponent(fileId)}/details`, {
        headers: { Authorization: this.authHeader() },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('No pudimos comprobar el documento. Intenta de nuevo.');
    }
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) {
      this.logger.error(`ImageKit respondió ${res.status} al consultar un archivo`);
      throw new ServiceUnavailableException('No pudimos comprobar el documento. Intenta de nuevo.');
    }
    return (await res.json()) as FileDetails;
  }

  private async deleteFile(fileId: string) {
    try {
      await fetch(`${API_URL}/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
        headers: { Authorization: this.authHeader() },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      this.logger.warn(`No se pudo borrar el archivo ${fileId} subido como público en carpeta privada`);
    }
  }
}
