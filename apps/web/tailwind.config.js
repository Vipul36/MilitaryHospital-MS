/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        military: {
          900: '#1B3320',
          800: '#25442B',
          700: '#2F5536',
          DEFAULT: '#355E3B',
          500: '#46754C',
          400: '#5C8F63',
          300: '#7BAE82',
          200: '#A4CDA9',
          100: '#D5EAD8',
          50: '#F0F7F1',
        },
        navy: {
          900: '#0F1D30',
          800: '#14253E',
          700: '#1E3A5F',
          DEFAULT: '#274B7A',
          500: '#34609B',
          400: '#4C7DBC',
          300: '#73A0D7',
          200: '#A4C3EB',
          100: '#D5E5F7',
          50: '#F0F6FC',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
