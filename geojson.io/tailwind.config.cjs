/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.js'],
  safelist: [
    'bg-[#071e25]',
    'text-[#d5f7ff]',
    'text-[#071e25]',
    'border-[#0e3942]',
    'text-teal-500',
    'bg-teal-500',
    'hover:bg-teal-400',
    'hover:text-pink-400',
    'shadow-black/40'
  ],
  theme: {
    extend: {
      colors: {
        'mb-gray-dark': '#0e2127',
        'mb-purple': {
          500: '#4264fb',
          700: '#0f38bf'
        }
      },
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif']
      }
    }
  },
  plugins: []
};
