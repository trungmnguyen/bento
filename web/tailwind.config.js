/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        card: '#12141c',
        border: '#1f2433',
        primary: '#3b82f6',
      }
    },
  },
  plugins: [],
}
