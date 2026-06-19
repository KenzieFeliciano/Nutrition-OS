/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        // numeric readouts: Inter with tabular figures (see styles.css .font-doto)
        doto: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // warm ivory / cream canvas (≈80% of the palette)
        ivory: '#f7f4ef',
        oat: '#efe9e1',
        cream: '#f1ece4',
        card: '#fbf9f6',
        // mushroom & taupe card surfaces
        mushroom: '#d9d0c5',
        taupe: '#b8aa9a',
        // text
        ink: '#2e2a26',
        muted: '#6e665e',
        // sage / olive health accents (≈15%)
        sage: '#a8b39f',
        olive: '#8f9a82',
        // champagne-gold details (≈5%)
        gold: '#c9a97d',
        butter: '#ece4d6',
        // muted terracotta, reserved for low-coverage status only
        clay: '#bf8a6f',
      },
    },
  },
  plugins: [],
};
