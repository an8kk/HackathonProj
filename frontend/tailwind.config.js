/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#141210',
        amber: {
          DEFAULT: '#F5A300',
          light: '#FFF3CC',
          dark: '#C47F00',
        },
        theft: '#D62828',
        'theft-light': '#FDE8E8',
        success: '#2E7D32',
        'success-light': '#E8F5E9',
        offwhite: '#F6F3EE',
        'text-primary': '#33312E',
        'text-muted': '#8C8780',
        'text-faint': '#B8B4AF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(20,18,16,0.08), 0 4px 16px rgba(20,18,16,0.06)',
        'card-hover': '0 2px 8px rgba(20,18,16,0.12), 0 8px 24px rgba(20,18,16,0.10)',
      },
    },
  },
  plugins: [],
}
