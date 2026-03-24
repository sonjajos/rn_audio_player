import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  SharedValue,
  useFrameCallback,
  makeMutable,
  withRepeat,
  withTiming,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";

const LERP_FACTOR = 0.3;
const ROTATION_DURATION_MS = 12000;

// Module-level rotation shared across all instances — never resets on navigation.
// Identical to the Skia version.
const rotationProgress = makeMutable(0);
rotationProgress.value = withRepeat(
  withTiming(1, { duration: ROTATION_DURATION_MS, easing: Easing.linear }),
  -1,
  false,
);

// ── HSL → hex ─────────────────────────────────────────────────────────────
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Props (identical interface to Skia version) ───────────────────────────
interface ReanimatedCircularVisualizerProps {
  bandValues: SharedValue<number>[];
  bandCount: number;
  width: number;
  height: number;
  maxHeightFraction?: number;
}

export default function ReanimatedCircularVisualizer({
  bandValues,
  bandCount,
  width,
  height,
  maxHeightFraction = 1.0,
}: ReanimatedCircularVisualizerProps) {
  // Smoothed bands — identical to Skia version
  const smoothedBands = useSharedValue<number[]>(new Array(bandCount).fill(0));

  useEffect(() => {
    const current = smoothedBands.value;
    if (current.length !== bandCount) {
      const next = new Array(bandCount).fill(0);
      for (let i = 0; i < Math.min(current.length, bandCount); i++) {
        next[i] = current[i];
      }
      smoothedBands.value = next;
    }
  }, [bandCount]);

  // Lerp smoothing — runs on UI thread every frame (identical to Skia version)
  useFrameCallback(() => {
    "worklet";
    const arr = smoothedBands.value;
    const next = new Array(arr.length);
    let changed = false;
    for (let i = 0; i < arr.length; i++) {
      const target = i < bandValues.length ? bandValues[i].value : 0;
      const val = arr[i] + (target - arr[i]) * LERP_FACTOR;
      next[i] = val;
      if (val !== arr[i]) changed = true;
    }
    if (changed) {
      smoothedBands.value = next;
    }
  });

  const side = Math.min(width, height);
  const innerRadius = side * 0.28;
  const maxBarLength = side * 0.22 * maxHeightFraction;
  const minBarLength = side * 0.01;
  const barThickness = ((2 * Math.PI * innerRadius) / (bandCount * 2)) * 0.55;
  const angleStep = Math.PI / Math.max(bandCount - 1, 1);
  const cx = width / 2;
  const cy = height / 2;

  // Pre-compute static bar descriptors
  const bars = useMemo(() => {
    const result: { angle: number; color: string; bandIdx: number }[] = [];
    for (let i = 0; i < bandCount; i++) {
      const t = bandCount > 1 ? i / (bandCount - 1) : 0;
      const hue = 340 - t * 160;
      const color = hslToHex(hue, 0.8, 0.6);
      // Right side (clockwise from top)
      result.push({ angle: angleStep * i - Math.PI / 2, color, bandIdx: i });
      // Left side (counter-clockwise mirror)
      result.push({ angle: -angleStep * i - Math.PI / 2, color, bandIdx: i });
    }
    return result;
  }, [bandCount, angleStep]);

  // Rotation style — UI thread via Reanimated worklet
  const rotationStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ rotate: `${rotationProgress.value * 360}deg` }],
    };
  });

  return (
    <View style={{ width, height }}>
      <Animated.View style={[StyleSheet.absoluteFill, rotationStyle]}>
        {bars.map((bar, idx) => (
          <BarView
            key={`${bandCount}-${idx}`}
            smoothedBands={smoothedBands}
            bandIdx={bar.bandIdx}
            angle={bar.angle}
            color={bar.color}
            barThickness={barThickness}
            innerRadius={innerRadius}
            maxBarLength={maxBarLength}
            minBarLength={minBarLength}
            cx={cx}
            cy={cy}
          />
        ))}
      </Animated.View>
    </View>
  );
}

// ── Individual bar — useAnimatedStyle runs entirely on UI thread ──────────
interface BarViewProps {
  smoothedBands: SharedValue<number[]>;
  bandIdx: number;
  angle: number;
  color: string;
  barThickness: number;
  innerRadius: number;
  maxBarLength: number;
  minBarLength: number;
  cx: number;
  cy: number;
}

const BarView = React.memo(function BarView({
  smoothedBands,
  bandIdx,
  angle,
  color,
  barThickness,
  innerRadius,
  maxBarLength,
  minBarLength,
  cx,
  cy,
}: BarViewProps) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const halfW = barThickness / 2;
  const angleDeg = (angle * 180) / Math.PI + 90;

  // All computation happens in a UI-thread worklet — no bridge, no JS thread
  const animStyle = useAnimatedStyle(() => {
    "worklet";
    const bands = smoothedBands.value;
    const amp = Math.min(Math.max(bands[bandIdx] ?? 0, 0), 1);
    const barH = amp * maxBarLength + minBarLength;
    // Bar center at (cx + (innerRadius + barH/2) * cos(θ), cy + (innerRadius + barH/2) * sin(θ))
    const dist = innerRadius + barH / 2;
    return {
      left: cx + dist * cosA - halfW,
      top: cy + dist * sinA - barH / 2,
      height: barH,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute" as const,
          width: barThickness,
          backgroundColor: color,
          borderRadius: barThickness / 2,
          transform: [{ rotate: `${angleDeg}deg` }],
        },
        animStyle,
      ]}
    />
  );
});
