import React, { useEffect } from "react";
import {
  Canvas,
  Picture,
  Skia,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  SharedValue,
  useFrameCallback,
  makeMutable,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";

const LERP_FACTOR = 0.3;
const ROTATION_DURATION_MS = 12000;

// Module-level rotation shared across all instances — never resets on navigation.
const rotationProgress = makeMutable(0);
rotationProgress.value = withRepeat(
  withTiming(1, { duration: ROTATION_DURATION_MS, easing: Easing.linear }),
  -1,
  false,
);

interface PillarVisualizerProps {
  bandValues: SharedValue<number>[];
  bandCount: number;
  width: number;
  height: number;
  maxHeightFraction?: number;
}

export default function PillarVisualizer({
  bandValues,
  bandCount,
  width,
  height,
  maxHeightFraction = 1.0,
}: PillarVisualizerProps) {
  const smoothedBands = useSharedValue<number[]>(
    new Array(bandCount).fill(0),
  );

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

  // Lerp smoothing — runs on the UI thread every frame
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

  // Single derived picture — redraws all bars in one pass, like Flutter's CustomPainter
  const picture = useDerivedValue(() => {
    const bands = smoothedBands.value;
    const rotation = rotationProgress.value;
    const n = bands.length;
    if (n === 0) {
      const r = Skia.PictureRecorder();
      r.beginRecording(Skia.XYWHRect(0, 0, width, height));
      return r.finishRecordingAsPicture();
    }

    const side = Math.min(width, height);
    const cx = width / 2;
    const cy = height / 2;
    const innerRadius = side * 0.28;
    const maxBarLength = side * 0.22 * maxHeightFraction;
    const minBarLength = side * 0.01;
    const barWidth = ((2 * Math.PI * innerRadius) / (n * 2)) * 0.55;
    const angleStep = Math.PI / Math.max(n - 1, 1);
    const rotationAngle = rotation * 2 * Math.PI;

    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(
      Skia.XYWHRect(0, 0, width, height),
    );

    const paint = Skia.Paint();
    paint.setStrokeWidth(barWidth);
    paint.setStyle(1 /* Stroke */);
    paint.setStrokeCap(1 /* Round */);
    paint.setAntiAlias(true);

    for (let i = 0; i < n; i++) {
      const amplitude = Math.min(Math.max(bands[i] ?? 0, 0), 1);
      const barHeight = amplitude * maxBarLength + minBarLength;

      // Hue: pink (340) at top → cyan (180) at bottom
      const t = n > 1 ? i / (n - 1) : 0;
      const hue = 340 - t * 160;
      // Convert HSL(hue, 80%, 60%) to an ARGB int for Skia
      paint.setColor(hslToSkiaColor(hue, 0.8, 0.6));

      // Right side (clockwise from top)
      const angleR = angleStep * i - Math.PI / 2 + rotationAngle;
      const cosR = Math.cos(angleR);
      const sinR = Math.sin(angleR);
      canvas.drawLine(
        cx + innerRadius * cosR,
        cy + innerRadius * sinR,
        cx + (innerRadius + barHeight) * cosR,
        cy + (innerRadius + barHeight) * sinR,
        paint,
      );

      // Left side (counter-clockwise mirror)
      const angleL = -angleStep * i - Math.PI / 2 + rotationAngle;
      const cosL = Math.cos(angleL);
      const sinL = Math.sin(angleL);
      canvas.drawLine(
        cx + innerRadius * cosL,
        cy + innerRadius * sinL,
        cx + (innerRadius + barHeight) * cosL,
        cy + (innerRadius + barHeight) * sinL,
        paint,
      );
    }

    return recorder.finishRecordingAsPicture();
  });

  return (
    <Canvas style={{ width, height }}>
      <Picture picture={picture} />
    </Canvas>
  );
}

/**
 * Convert HSL to a Skia color (Float32Array [r, g, b, a] in 0-1 range).
 * Runs in a worklet so must be pure and use no imports.
 */
function hslToSkiaColor(
  h: number,
  s: number,
  l: number,
): Float32Array {
  "worklet";
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  const arr = new Float32Array(4);
  arr[0] = r + m;
  arr[1] = g + m;
  arr[2] = b + m;
  arr[3] = 1.0;
  return arr;
}
