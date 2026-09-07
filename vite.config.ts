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
    router: {
      codeSplittingOptions: {
        // Keep the auth screen in the initial route graph. Vite can otherwise
        // refresh its optimized React graph when this hook-heavy chunk first
        // loads, which causes React's dispatcher to be null until a reload.
        splitBehavior: ({ routeId }: { routeId: string }) =>
          routeId === "/auth" ? [] : undefined,
      },
    },
  },
  vite: {
    // Pre-bundle the router before a split route (such as /auth) is requested.
    // Otherwise Vite can invalidate its dependency cache mid-navigation and mix
    // two React module generations, leaving the hook dispatcher null.
    optimizeDeps: {
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/client",
        "@tanstack/react-router",
        "@tanstack/react-query",
        // Lazily imported by the PDF export path. Without pre-bundling, the
        // first dynamic import triggers a mid-session re-optimize + reload that
        // leaves React's hook dispatcher null (blank screen).
        "html2canvas",
        "jspdf",
      ],
    },
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router"],
    },
    server: {
      warmup: {
        clientFiles: ["./src/routes/*.tsx"],
      },
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
