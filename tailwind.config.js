/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // <--- IMPORTANT: Enables the toggle functionality
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", 
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#121212",      // Class: bg-dark-bg
          surface: "#1E1E1E", // Class: bg-dark-surface
          border: "#2C2C2C",  // Class: border-dark-border
        },
        brand: {
          blue: "#3B82F6",    // Class: bg-brand-blue
          pink: "#E11D48",    // Class: bg-brand-pink
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        slideUp: 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}