/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#fef3c7',
          DEFAULT: '#0050cb', // upgraded to MillOps primary blue
          dark: '#003fa4',
        },
        primary: {
          DEFAULT: '#0050cb',
          container: '#0066ff',
          fixed: '#dae1ff',
        },
        surface: {
          DEFAULT: '#faf8ff',
          bright: '#faf8ff',
          container: '#eaedff',
          'container-low': '#f2f3ff',
          'container-high': '#e2e7ff',
          'container-highest': '#dae2fd',
          'container-lowest': '#ffffff',
          dim: '#d2d9f4',
        },
        'on-surface': {
          DEFAULT: '#131b2e',
          variant: '#424656',
        },
        outline: {
          DEFAULT: '#727687',
          variant: '#c2c6d8',
        },
      },
      fontFamily: {
        'display-lg': ['Outfit', 'Hanken Grotesk', 'sans-serif'],
        'headline-md': ['Outfit', 'Hanken Grotesk', 'sans-serif'],
        'body-md': ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        'body-lg': ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        'label-sm': ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
