/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#e11d48',   // 玫瑰红，可自行调整
        secondary: '#fda4af',
      }
    },
  },
  plugins: [],
}
