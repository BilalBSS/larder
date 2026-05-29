// / brand tokens
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './src/ui/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#FBF7F0',
        surface: '#FFFFFF',
        ink: '#2B2622',
        muted: '#8A8178',
        line: '#E7DFD3',
        terracotta: {
          DEFAULT: '#C8663F',
          dark: '#A8512F',
        },
        urgency: {
          green: '#3F8F5B',
          yellow: '#D9A441',
          red: '#C24A3A',
        },
      },
      fontSize: {
        title: ['28px', '34px'],
        heading: ['20px', '26px'],
        body: ['16px', '22px'],
        label: ['14px', '18px'],
        caption: ['12px', '16px'],
      },
    },
  },
  plugins: [],
};
