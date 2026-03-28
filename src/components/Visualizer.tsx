import React from "react";
import { SharedValue } from "react-native-reanimated";
import { RENDERER } from "../config";

// Lazy imports — only the active renderer's module is loaded.
const SkiaVisualizer =
  RENDERER === "skia" ? require("./SkiaCircularVisualizer").default : null;

const ReanimatedVisualizer =
  RENDERER === "reanimated"
    ? require("./ReanimatedCircularVisualizer").default
    : null;

interface VisualizerProps {
  bandValues: SharedValue<number>[];
  bandCount: number;
  width: number;
  height: number;
  maxHeightFraction?: number;
}

export default function Visualizer(props: VisualizerProps) {
  if (RENDERER === "skia" && SkiaVisualizer) {
    return <SkiaVisualizer {...props} />;
  }
  if (ReanimatedVisualizer) {
    return <ReanimatedVisualizer {...props} />;
  }
  return null;
}
