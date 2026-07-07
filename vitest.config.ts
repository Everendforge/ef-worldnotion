import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const setupFile = fileURLToPath(new URL("./src/test/setup.ts", import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [setupFile],
    // Los tests de componentes con user-event superan los 5s por defecto
    // cuando la máquina está bajo carga (p. ej. workers paralelos en CI).
    testTimeout: 20000,
  },
});
