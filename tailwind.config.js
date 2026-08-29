/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta SIGLO — azul marino oscuro como primario
        brand: {
          50:  '#EEF4FA',
          100: '#D4E5F5',
          200: '#A9CBEB',
          300: '#7EB1E1',
          400: '#5397D7',
          500: '#2B7DBD',
          600: '#1A3C5E', // ← theme_color principal
          700: '#152F4B',
          800: '#102238',
          900: '#0B1625',
          950: '#060C13',
        },
        // Acento — ámbar para acciones de venta/cobro
        accent: {
          400: '#FBB040',
          500: '#F7931E',
          600: '#E07B10',
        },
        // Verde para estados OK / sincronizado
        success: {
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
        },
        // Rojo para errores / advertencias críticas
        danger: {
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
        },
        // Superficie para modo oscuro
        surface: {
          800: '#0F1C2E',
          850: '#0C1621',
          900: '#080F18',
          950: '#040810',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Escala móvil-first
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
        '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top':    'env(safe-area-inset-top)',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card':    '0 4px 24px rgba(0,0,0,0.18)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.28)',
        'glow':    '0 0 20px rgba(43,125,189,0.35)',
      },
      animation: {
        'fade-in':       'fadeIn 0.2s ease-out',
        'slide-up':      'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':     'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
      },
    },
  },
  plugins: [],
};
