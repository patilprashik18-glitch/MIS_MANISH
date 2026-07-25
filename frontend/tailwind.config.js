/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#fef3c7', // warm amber base
          DEFAULT: '#f59e0b', // amber-500
          dark: '#b45309', // amber-700
        }
      }
    },
  },
  plugins: [],
}
