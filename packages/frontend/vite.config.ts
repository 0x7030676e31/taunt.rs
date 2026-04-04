import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "node:path";

export default defineConfig(({ command }) => ({
    base: command === "build" ? "/public/" : "/",
    plugins: [solid()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            palette: path.resolve(__dirname, "src/palette.scss"),
        }
    }
}));
