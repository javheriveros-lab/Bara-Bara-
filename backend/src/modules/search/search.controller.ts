import { Controller, Get, Query } from '@nestjs/common';
import { SuggestQuery } from './dto/suggest.query';
import { SearchService } from './search.service';

/** Autocorrector y sugerencias del buscador (público, sin sesión). */
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  // Se llama mientras la persona escribe; trabaja en memoria (sin consultas a la base por llamada).
  @Get('suggest')
  suggest(@Query() query: SuggestQuery) {
    return this.search.suggest(query.q ?? '');
  }
}
