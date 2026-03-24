import { ExpoConfig, ConfigContext } from "expo/config";
import * as fs from "fs";
import * as path from "path";

// Read .env file at config time (build-time)
function readEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, ".env");
  const env: Record<string, string> = {};
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  } catch {
    // .env missing — fall back to defaults
  }
  return env;
}

const env = readEnv();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "RN Audio Player",
  slug: "rn-audio-player",
  extra: {
    renderer: env.RENDERER || "skia",
  },
});
