import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

// Logo oficial con el rayo en amarillo eléctrico (#FDD835); 800×481.
const LOGO = require('../../assets/logo-splash.png');
// Halo violeta, rayo (dos formas para la vibración), ola de luz y brillo de recarga.
const GLOW = require('../../assets/glow.png');
const BOLT_A = require('../../assets/bolt-a.png');
const BOLT_B = require('../../assets/bolt-b.png');
const RING = require('../../assets/ring.png');
const CHARGE = require('../../assets/charge.png');

const LOGO_RATIO = 481 / 800;
// Geometría de la esfera medida sobre el logo: centro 49.5% × 31.4%, cima al 11.5% del alto.
const SPHERE_X = 0.495;
const SPHERE_Y = 0.314;
const SPHERE_TOP = 0.115;

/** Un ciclo del trueno: caída (0–7%), destello (7.4–11.5%), recarga (7–40%) y respiración. */
const LOOP_MS = 2400;
const LOOP_START_MS = 350;

type Variant = 'screen' | 'overlay' | 'card';

interface LoadingSpinnerProps {
  /** screen: ocupa su pantalla · overlay: cubre todo sobre la UI · card: placeholder de tarjeta. */
  variant?: Variant;
  label?: string;
  style?: ViewStyle;
}

/**
 * Estado de carga "Esfera y trueno": el logo aparece; en bucle, un rayo amarillo cae sobre la
 * esfera, el impacto destella y la esfera se recarga en neón violeta. Sigue mientras esté montado:
 * renderízalo solo mientras `isLoading` sea true.
 *
 * Se mide con onLayout, así escala igual a pantalla completa que dentro de una tarjeta. Todo
 * cuelga de un solo valor de ciclo con el driver nativo (60 fps, fuera del hilo de JS).
 * Con "reducir movimiento": solo el logo y su halo.
 */
export function LoadingSpinner({ variant = 'screen', label = 'Cargando la comunidad…', style }: LoadingSpinnerProps) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current; // 0 → 1: aparición del logo
  const cycle = useRef(new Animated.Value(0)).current; // 0 → 1 en bucle: el trueno

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        setReduceMotion(reduce);
        Animated.timing(reveal, {
          toValue: 1,
          duration: reduce ? 0 : 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
        if (reduce) return;
        loop = Animated.loop(
          Animated.timing(cycle, { toValue: 1, duration: LOOP_MS, easing: Easing.linear, useNativeDriver: true }),
        );
        Animated.sequence([Animated.delay(LOOP_START_MS), loop]).start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [reveal, cycle]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  return (
    <View
      style={[styles.stage, styles[variant], style]}
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      {box && <Scene box={box} variant={variant} reveal={reveal} cycle={cycle} reduceMotion={reduceMotion} />}
      {variant !== 'card' && (
        <Text style={styles.caption} accessibilityElementsHidden importantForAccessibility="no">
          {label}
        </Text>
      )}
    </View>
  );
}

interface SceneProps {
  box: { w: number; h: number };
  variant: Variant;
  reveal: Animated.Value;
  cycle: Animated.Value;
  reduceMotion: boolean;
}

function Scene({ box, variant, reveal, cycle, reduceMotion }: SceneProps) {
  // El logo cabe a lo ancho y a lo alto; está centrado, así que el rayo va del borde superior a la esfera.
  const logoW = Math.min(box.w * (variant === 'card' ? 0.74 : 0.7), box.h * 1.12, 420);
  const logoH = logoW * LOGO_RATIO;
  const boltH = box.h / 2 - logoH / 2 + logoH * SPHERE_TOP;
  const boltW = logoW * 0.24;
  const flashPeak = variant === 'card' ? 0.55 : 0.9;

  // ── Tramos del ciclo (mismos porcentajes que la web) ──
  const at = (inputRange: number[], outputRange: number[] | string[]) =>
    cycle.interpolate({ inputRange, outputRange: outputRange as number[] });

  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const boltY = at([0, 0.07, 1], [-boltH, 0, 0]);
  const boltOpacity = at([0, 0.14, 0.16, 1], [1, 1, 0, 0]);
  const shapeA = at([0, 0.079, 0.08, 0.099, 0.1, 0.119, 0.12, 1], [1, 1, 0, 0, 1, 1, 0, 0]);
  const shapeB = at([0, 0.079, 0.08, 0.099, 0.1, 0.119, 0.12, 0.14, 0.15, 1], [0, 0, 1, 1, 0, 0, 1, 1, 0, 0]);
  const flash = at([0, 0.068, 0.074, 0.115, 1], [0, 0, flashPeak, 0, 0]);
  const chargeOpacity = at([0, 0.07, 0.1, 0.4, 1], [0, 0, 0.95, 0, 0]);
  const chargeScale = at([0, 0.07, 0.1, 0.4, 1], [0.96, 0.96, 1.04, 1, 1]);
  const ringOpacity = at([0, 0.075, 0.09, 0.3, 0.36, 1], [0, 0, 1, 1, 0, 0]);
  const ringRotate = at([0, 0.075, 0.3, 1], ['-90deg', '-90deg', '270deg', '270deg']);
  const glowOpacity = at([0, 0.07, 0.1, 0.22, 0.4, 0.6, 0.8, 1], [0.55, 0.55, 1, 0.95, 0.6, 0.95, 0.6, 0.55]);
  const glowScale = at([0, 0.07, 0.1, 0.22, 0.4, 0.6, 0.8, 1], [0.95, 0.95, 1.32, 1.12, 0.96, 1.06, 0.96, 0.95]);

  // Capas centradas en la esfera.
  const centered = (size: number) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    left: logoW * SPHERE_X - size / 2,
    top: logoH * SPHERE_Y - size / 2,
  });
  const boltBox = {
    position: 'absolute' as const,
    width: boltW,
    height: boltH,
    left: logoW * SPHERE_X - boltW / 2,
    top: logoH * SPHERE_TOP - boltH,
  };

  return (
    <>
      <Animated.View style={{ width: logoW, height: logoH, opacity: reveal, transform: [{ scale }] }}>
        <Animated.Image
          source={GLOW}
          style={[centered(logoW * 0.6), { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
        />

        {/* El trueno: dos formas que se alternan mientras cae y vibra. */}
        {!reduceMotion && (
          <Animated.View style={[boltBox, { opacity: boltOpacity, transform: [{ translateY: boltY }] }]}>
            <Animated.Image source={BOLT_A} resizeMode="stretch" style={[StyleSheet.absoluteFill, { opacity: shapeA }]} />
            <Animated.Image source={BOLT_B} resizeMode="stretch" style={[StyleSheet.absoluteFill, { opacity: shapeB }]} />
          </Animated.View>
        )}

        <Image source={LOGO} style={{ width: logoW, height: logoH }} resizeMode="contain" />

        {/* Recarga: la esfera se ilumina y una ola de luz recorre su borde. */}
        {!reduceMotion && (
          <>
            <Animated.Image
              source={CHARGE}
              style={[centered(logoW * 0.25), { opacity: chargeOpacity, transform: [{ scale: chargeScale }] }]}
            />
            <Animated.Image
              source={RING}
              style={[centered(logoW * 0.29), { opacity: ringOpacity, transform: [{ rotate: ringRotate }] }]}
            />
          </>
        )}
      </Animated.View>

      {/* Impacto: destello amarillo en todo el contenedor (~0.1 s). */}
      {!reduceMotion && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  screen: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  card: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  flash: {
    backgroundColor: 'rgba(253, 216, 53, 0.8)',
  },
  caption: {
    position: 'absolute',
    bottom: '8%',
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 16,
    letterSpacing: 0.4,
  },
});
