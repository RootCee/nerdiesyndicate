/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        brand: ['var(--font-brand)', 'Georgia', 'serif'],
        display: ['var(--font-brand)', 'Georgia', 'serif'],
        body: ['var(--font-ui)', 'sans-serif'],
        ui: ['var(--font-ui)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
