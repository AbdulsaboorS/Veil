import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const isExtBuild = process.env.BUILD_TARGET === "extension";

// The extension bundle is committed and shipped as-is, so a build without these
// vars would silently bake `undefined/functions/v1/...` URLs into it. Fail loudly.
const REQUIRED_EXT_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

function assertExtensionEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const missing = REQUIRED_EXT_ENV.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Extension build requires ${missing.join(", ")} (set in env or .env.local).`,
    );
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  if (isExtBuild && command === "build") assertExtensionEnv(mode);

  return {
    base: isExtBuild ? "./" : "/",
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: isExtBuild ? "extension/app" : "dist",
      ...(isExtBuild && {
        rollupOptions: {
          output: {
            entryFileNames: "assets/index.js",
            chunkFileNames: "assets/[name].js",
            assetFileNames: "assets/[name][extname]",
          },
        },
      }),
    },
  };
});
