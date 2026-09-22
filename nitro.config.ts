import { defineConfig } from "nitro";

// Builds the SSR server produced by vite+nitro into a Cloudflare Workers
// module worker. `nitro build` (run via `vite build`) emits
// .output/server/index.mjs plus a generated .output/server/wrangler.json —
// deploy with `npx wrangler deploy --config .output/server/wrangler.json`
// (see package.json "deploy" script).
export default defineConfig({
  preset: "cloudflare-module",
  compatibilityDate: "2026-09-01",
  cloudflare: {
    // Let Nitro generate wrangler.json for us with the ASSETS binding wired
    // up correctly for the static client build.
    deployConfig: true,
    wrangler: {
      name: "noted-me",
      compatibility_flags: ["nodejs_compat"],
    },
  },
});
