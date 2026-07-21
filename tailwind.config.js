
module.exports = {
  darkMode: 'class', 
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", 
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#121212",      
          surface: "#1E1E1E", 
          border: "#2C2C2C",  
        },
        brand: {
          blue: "#3B82F6",    
          pink: "#E11D48",    
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        slideUp: 'slideUp 0.3s ease-out',
        'particle-burst': 'particleBurst 0.8s ease-out forwards',
        'orbital-spin-1': 'spin 1.2s linear infinite',
        'orbital-spin-2': 'spin 2s linear infinite reverse',
        'orbital-spin-3': 'spin 3s linear infinite',
        'shimmer-scan': 'shimmerScan 1.2s ease-in-out forwards',
        'rocket-launch': 'rocketLaunch 0.35s ease-in forwards',
        'check-pop': 'checkPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'holo-slide': 'holoSlide 1.5s ease-in-out infinite',
        'step-enter': 'stepEnter 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        particleBurst: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' }
        },
        shimmerScan: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' }
        },
        rocketLaunch: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-24px) scale(0.8)', opacity: '0' }
        },
        checkPop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        holoSlide: {
          '0%, 100%': { backgroundPosition: '-100% center' },
          '50%': { backgroundPosition: '100% center' }
        },
        stepEnter: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}