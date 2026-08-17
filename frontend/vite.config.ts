/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    // userEvent driving antd portals/motion in jsdom runs 3-4x slower on CI
    // runners than locally - several suites already land within a second of
    // the 5s default there. Raised so a slow runner isn't a red build.
    testTimeout: 15000,
  },
});
