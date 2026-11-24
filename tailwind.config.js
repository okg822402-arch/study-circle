/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#FAFAF7',
          canvas: '#EDEBE5',
          card: '#FFFFFF',
          subtle: '#F5F2EC',
          border: '#EDEAE4',
          'border-strong': '#DDD9D1'
        },
        navy: {
          DEFAULT: '#1B2B4B',
          light: '#2C4A6E',
          soft: '#3A5A7A',
          deep: '#131F37',
          muted: '#4A5568'
        },
        teal: {
          DEFAULT: '#3D7A8A',
          hover: '#306070',
          light: 'rgba(61, 122, 138, 0.12)',
          dark: '#244852'
        },
        amber: {
          DEFAULT: '#E8A83E',
          hover: '#D4952D',
          light: 'rgba(232, 168, 62, 0.15)',
          muted: '#B8821E'
        },
        feedback: {
          success: '#28B464',
          'success-light': 'rgba(40, 180, 100, 0.12)',
          danger: '#DC3C3C',
          'danger-light': 'rgba(220, 60, 60, 0.1)'
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'button': '14px',
        'input': '12px',
        'badge': '9999px'
      },
      boxShadow: {
        'card': '0 1px 3px rgba(27, 43, 75, 0.05)',
        'elevated': '0 8px 24px rgba(27, 43, 75, 0.08)',
        'focus-teal': '0 0 0 3px rgba(61, 122, 138, 0.15)',
      }
    },
  },
  plugins: [],
}
