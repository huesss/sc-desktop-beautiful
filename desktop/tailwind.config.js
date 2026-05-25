
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        main: '#0a0a0a',
        secondary: '#141414',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-contrast': 'var(--color-accent-contrast)',
        'text-muted-50': 'rgba(255, 255, 255, 0.5)',
        'text-muted-60': 'rgba(255, 255, 255, 0.6)',
        border: 'rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'btn-inset':
          '0px -1px 0px 0px rgba(0,0,0,0.2) inset, 0px 1px 0px 0px rgba(255,255,255,0.1) inset',
      },
    },
  },
};
