import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ethersproject/keccak256': '@ethersproject/keccak256/lib.esm/index.js',
    },
    // Deduplicate @tanstack/react-query so all Thirdweb internals share one instance
    dedupe: ['@tanstack/react-query'],
  },
});