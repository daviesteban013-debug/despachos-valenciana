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
        valenciana: {
          DEFAULT: '#E11D24', // Rojo Valenciana FERREHOGAR
          dark: '#B91C1C',
          darker: '#991B1B',
          light: '#F87171',
          surface: '#FEF2F2'
        },
        wms: {
          bg: '#0F172A',
          surface: '#1E293B',
          card: '#111827',
          border: '#334155',
          urgent: '#DC2626',
          warning: '#F59E0B',
          success: '#10B981',
          bay: '#8B5CF6',
          packing: '#06B6D4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace']
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-valenciana': 'glowValenciana 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glowValenciana: {
          '0%': { boxShadow: '0 0 4px rgba(225, 29, 36, 0.4)' },
          '100%': { boxShadow: '0 0 16px rgba(225, 29, 36, 0.9)' }
        }
      }
    },
  },
  plugins: [],
}
