/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        figma: {
          green: '#00AA4F',
          greenHover: '#009243',
          greenLight: '#E8F8EE',
          greenBorder: '#B2E8CA',
          inputBg: '#F3F5F7',
          sidebarBg: '#FFFFFF',
          textDark: '#111827',
          textMuted: '#6B7280',
          textSubtle: '#9CA3AF',
          border: '#E5E7EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
