/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        chai: {
          50:  '#fdf8f0',
          100: '#faefd8',
          200: '#f4dba8',
          300: '#ecc370',
          400: '#e2a53a',
          500: '#d4891c',
          600: '#b86d14',
          700: '#8f5112',
          800: '#744216',
          900: '#5e3515',
          950: '#361907',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
