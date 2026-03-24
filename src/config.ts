import Constants from "expo-constants";

export type RendererType = "skia" | "reanimated";

export const RENDERER: RendererType =
  (Constants.expoConfig?.extra?.renderer as RendererType) || "skia";
