// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The dev-only devtools plugin injects `data-tsd-source` into every JSX element.
// React Three Fiber treats dashed props as nested paths and crashes, so strip it from 3D files.
const stripTsdSourceFrom3D = {
  name: "strip-tsd-source-3d",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    const file = id.split("?")[0]!;
    if (!/src\/components\/(game\/|Sumo\.tsx)/.test(file) || !code.includes("data-tsd-source")) return;
    return { code: code.replace(/\s+data-tsd-source=(?:"[^"]*"|\{[^}]*\})/g, ""), map: null };
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { plugins: [stripTsdSourceFrom3D] },
});
