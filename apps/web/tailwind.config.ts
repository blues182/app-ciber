import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111418',
        steel: '#1d2935',
        sand: '#f3eee7',
        clay: '#cead8f',
        moss: '#335944',
        alert: '#bd452a',
      },
      boxShadow: {
        panel: '0 18px 50px -30px rgba(17, 20, 24, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
