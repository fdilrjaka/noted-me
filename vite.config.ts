// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Pre-bundle the router before a split route (such as /auth) is requested.
    // Otherwise Vite can invalidate its dependency cache mid-navigation and mix
    // two React module generations, leaving the hook dispatcher null.
    optimizeDeps: {
      include: ["@tanstack/react-router"],
    },
    // Keep the SSR renderer in the same optimized React graph as the app.
    environments: {
      ssr: {
        optimizeDeps: {
          include: ["react-dom/server"],
        },
      },
    },
  },
});
