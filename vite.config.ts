import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["dist/**", "node_modules/**", ".pnpm-store/**"],
  },
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**", ".pnpm-store/**"],
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});
