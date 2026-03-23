import React from 'react';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, SharedValue } from 'react-native-reanimated';

const LERP_FACTOR = 0.3;
const BORDER_RADIUS = 4;
const GAP_RATIO = 0.2;

interface PillarBarProps {
  index: number;
  bandValue: SharedValue<number>;
  x: number;
  barWidth: number;
  canvasHeight: number;
  maxHeightFraction: number;
  totalBands: number;
}

function PillarBar({
  index,
  bandValue,
  x,
  barWidth,
  canvasHeight,
  maxHeightFraction,
  totalBands,
}: PillarBarProps) {
  // Lerp smoothing on UI thread
  const smoothed = useSharedValue(0);
  useDerivedValue(() => {
    smoothed.value = smoothed.value + (bandValue.value - smoothed.value) * LERP_FACTOR;
    return smoothed.value;
  });

  // Hue gradient: 180° (cyan) at band 0 → 340° (pink) at last band
  const hue = 180 + (160 * index) / Math.max(totalBands - 1, 1);
  const color = `hsl(${hue}, 80%, 60%)`;

  // Bar height derived from smoothed SharedValue
  const barHeight = useDerivedValue(() => {
    return smoothed.value * canvasHeight * maxHeightFraction;
  });

  // Y position: bars grow upward from bottom
  const y = useDerivedValue(() => {
    return canvasHeight - barHeight.value;
  });

  return (
    <RoundedRect
      x={x}
      y={y}
      width={barWidth}
      height={barHeight}
      r={BORDER_RADIUS}
      color={color}
    />
  );
}

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
  const pillarWidth = width / bandCount;
  const gap = pillarWidth * GAP_RATIO;
  const barWidth = pillarWidth - gap;

  return (
    <Canvas style={{ width, height }}>
      {Array.from({ length: bandCount }, (_, i) => (
        <PillarBar
          key={`${bandCount}-${i}`}
          index={i}
          bandValue={bandValues[i]}
          x={i * pillarWidth + gap / 2}
          barWidth={barWidth}
          canvasHeight={height}
          maxHeightFraction={maxHeightFraction}
          totalBands={bandCount}
        />
      ))}
    </Canvas>
  );
}
