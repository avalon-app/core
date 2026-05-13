import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    target: "es2019",
    dts: { resolve: true },
    splitting: false,
    sourcemap: true,
    treeshake: true,
    clean: true,
});
