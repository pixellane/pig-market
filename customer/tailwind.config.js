export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FFF8EE',
          50: '#FFFCF7',
          100: '#F7F0E4',
          200: '#EFE4D2',
        },
        burgundy: {
          DEFAULT: '#7A1F2B',
          soft: '#9D3344',
          deep: '#54151E',
          ink: '#292522',
        },
        leaf: {
          DEFAULT: '#3F7D4A',
          soft: '#76A574',
          mist: '#E8F0E6',
        },
        gold: {
          DEFAULT: '#F2C14E',
          warm: '#D98B3A',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(75, 15, 24, 0.18)',
        card: '0 8px 24px -10px rgba(75, 15, 24, 0.12)',
      },
      backgroundImage: {
        market: 'radial-gradient(ellipse at top, rgba(168, 50, 66, 0.08), transparent 55%), radial-gradient(ellipse at bottom right, rgba(63, 107, 58, 0.08), transparent 45%)',
        hero: 'linear-gradient(135deg, rgba(75, 15, 24, 0.92), rgba(139, 30, 45, 0.78)), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        rise: 'rise 0.6s ease-out both',
        'rise-delay': 'rise 0.8s ease-out 0.12s both',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
