/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cta-blue': '#2563eb',
        'black-900': '#0f0f0f',
        'gray-900': '#0f0f0f',
        'gray-800': '#1e1e1e',
        'panel-gray': '#303030',
        
        
      }
    },
  },
  plugins: [],
}

