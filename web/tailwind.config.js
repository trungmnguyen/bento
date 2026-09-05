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
        background: '#131117',
        card: '#1b1722',
        cardHeader: '#231d2c',
        border: '#2c2537',
        bento: {
          lacquer: '#17141a',
          surface: '#1e1a25',
          elevated: '#262030',
          border: '#332b40',
          salmon: '#ff6b6b',
          'salmon-hover': '#fa5252',
          'salmon-soft': '#ff6b6b20',
          matcha: '#40c057',
          'matcha-hover': '#37b24d',
          'matcha-soft': '#40c05720',
          tamago: '#ffd43b',
          'tamago-hover': '#fcc419',
          'tamago-soft': '#ffd43b20',
          ginger: '#f783ac',
          'ginger-soft': '#f783ac20',
          nori: '#152019',
          'nori-border': '#26382b',
          rice: '#fbf9f5',
          cream: '#f3ede2',
        },
      },
      borderRadius: {
        'bento': '18px',
        'bento-lg': '24px',
      },
      boxShadow: {
        'bento-card': '0 6px 20px -2px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'bento-glow': '0 0 25px -5px rgba(255, 107, 107, 0.25)',
        'matcha-glow': '0 0 25px -5px rgba(64, 192, 87, 0.25)',
        'tamago-glow': '0 0 25px -5px rgba(255, 212, 59, 0.25)',
      }
    },
  },
  plugins: [],
}
