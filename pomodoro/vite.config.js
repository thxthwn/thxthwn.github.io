import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    base: "/thxthwn.github.io/pomodoro/", // ← your repo name
});
