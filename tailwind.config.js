/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // SafeRoad brand palette
        brand: {
          DEFAULT: '#176B45',
          dark: '#104B34',
          light: '#F5F7F5',
        },
      },
    },
  },
  plugins: [],
}
