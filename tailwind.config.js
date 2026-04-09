/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#FFFFFF', secondary: '#F7F7F8', tertiary: '#ECECF1' },
        text: { primary: '#202123', secondary: '#6E6E80', tertiary: '#8E8EA0' },
        green: { primary: '#10A37F', hover: '#0D8A6B', light: 'rgba(16,163,127,0.08)', border: 'rgba(16,163,127,0.2)' },
        border: { DEFAULT: '#E5E5E7', hover: '#CDCDD1', focus: '#10A37F' },
        node: { page: '#10A37F', component: '#3B82F6', util: '#8E8EA0', api: '#F59E0B', config: '#8B5CF6', circular: '#EF4444' },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
