import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: true,
    exports: true,
  },
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**", ".pnpm-store/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ["dist/**", "node_modules/**", ".pnpm-store/**"],
  },
});
