// Standalone Vite config (no @lovable.dev/vite-tanstack-config).
// Manually replicates what the Lovable wrapper used to configure for us:
//   - tsconfig path aliases (tsConfigPaths), Tailwind CSS 4 (tailwindcss),
//     TanStack Start SSR/file routing (tanstackStart), React (viteReact),
//     and the Nitro build (nitro) that turns the SSR output into a portable
//     server — targeted at Cloudflare Workers via nitro.config.ts.
//   - VITE_* env variable injection is native Vite behavior and needs no plugin.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      router: {
        codeSplittingOptions: {
          // Keep the auth screen in the initial route graph. Vite can otherwise
          // refresh its optimized React graph when this hook-heavy chunk first
          // loads, which causes React's dispatcher to be null until a reload.
          splitBehavior: ({ routeId }: { routeId: string }) =>
            routeId === "/auth" ? [] : undefined,
        },
      },
    }),
    viteReact(),
    nitro(),
  ],
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
  // Keep the SSR renderer in the same optimized React graph as the app, and
  // point Nitro's server build at src/server.ts (our SSR error wrapper)
  // instead of the framework's default entry.
  environments: {
    ssr: {
      optimizeDeps: {
        include: ["react-dom/server"],
      },
      build: {
        rollupOptions: {
          input: "./src/server.ts",
        },
      },
    },
  },
});
