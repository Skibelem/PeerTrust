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
          navy: '#0A192F',
          darkBlue: '#172A45',
          lightBlue: '#306EE8',
          teal: '#0D9488',
        }
      }
    },
  },
  plugins: [],
}
