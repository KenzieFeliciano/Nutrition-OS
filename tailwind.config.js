/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Karla', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        doto: ['Doto', 'ui-monospace', 'monospace'],
      },
      colors: {
        oat: '#e9e4db',
        cream: '#f7f4ee',
        card: '#fdfbf7',
        ink: '#403a32',
        gold: '#c2a878',
        butter: '#efe3cd',
        sage: '#9faf91',
        clay: '#c98268',
      },
    },
  },
  plugins: [],
};
