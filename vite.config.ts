import devtoolsJson from "vite-plugin-devtools-json";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    devtoolsJson(),
    SvelteKitPWA({
      registerType: "autoUpdate",
      // Manual registration in +layout.svelte
      injectRegister: false,
      // static/manifest.json is maintained in-repo (app.html)
      manifest: false,
    }),
  ],
});
