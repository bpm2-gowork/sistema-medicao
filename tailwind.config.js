/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0056D2', // Azul Gowork
        secondary: '#FF6B35', // Laranja Energia
        alert: '#DC2626', // Vermelho Alerta
      },
      borderRadius: {
        'gowork': '12px',
      }
    },
  },
  plugins: [],
}