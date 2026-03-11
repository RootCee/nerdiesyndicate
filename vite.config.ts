import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ethersproject/keccak256': '@ethersproject/keccak256/lib.esm/index.js',
      // Force all @tanstack/react-query imports to use the same v4 instance
      // (prevents Thirdweb's internal v5 sub-dep from creating a separate context)
      '@tanstack/react-query': path.resolve(
        __dirname,
        'node_modules/@thirdweb-dev/react/node_modules/@tanstack/react-query'
      ),
    },
  },
});