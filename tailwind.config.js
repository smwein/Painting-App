/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f1f2e',
          light: '#1a2332',
          dark: '#0a1520',
        },
        teal: {
          50: '#e6f7f6',
          100: '#ccefed',
          200: '#99dfdb',
          300: '#66cfc9',
          400: '#33bfb7',
          500: '#0ea5a0',
          600: '#0c8583',
          700: '#096462',
          800: '#064341',
          900: '#032221',
        },
        gold: {
          DEFAULT: '#d4a24e',
          light: '#e0b565',
          dark: '#b8893e',
        },
        cream: '#f5f2ed',
        primary: {
          50: '#e6f7f6',
          100: '#ccefed',
          200: '#99dfdb',
          300: '#66cfc9',
          400: '#33bfb7',
          500: '#0ea5a0',
          600: '#0c8583',
          700: '#096462',
          800: '#064341',
          900: '#032221',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
