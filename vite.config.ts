import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import polyfillNode from 'rollup-plugin-polyfill-node'; // Add this line

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    polyfillNode(), // Add this line
  ],
});