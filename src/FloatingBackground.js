import React from 'react';
import { motion } from 'framer-motion';

const FloatingBackground = () => {
  // Array of education-themed SVG paths
  const icons = [
    // Code Brackets </>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
    // Math Sigma ∑
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h12l-6 6 6 6H6" />,
    // Notebook/Book
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    // Atom/Science
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M19.071 4.929c-1.562-1.562-6.104-1.562-10.142 2.476S4.929 15.985 6.49 17.547m12.581 0c1.562-1.562 1.562-6.104-2.476-10.142s-8.58-4.038-10.142-2.476" />,
    // Calculator/Grid
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 4h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
  ];

  // Configuration for each floating icon (position, speed, size)
  const floatingElements = [
    { icon: 0, x: '10%', y: '20%', size: 40, duration: 15, delay: 0 },
    { icon: 1, x: '80%', y: '15%', size: 50, duration: 18, delay: 2 },
    { icon: 2, x: '20%', y: '70%', size: 45, duration: 20, delay: 5 },
    { icon: 3, x: '75%', y: '80%', size: 60, duration: 22, delay: 1 },
    { icon: 4, x: '50%', y: '10%', size: 35, duration: 16, delay: 3 },
    { icon: 0, x: '85%', y: '50%', size: 45, duration: 19, delay: 4 },
    { icon: 2, x: '15%', y: '45%', size: 55, duration: 21, delay: 2 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {floatingElements.map((el, index) => (
        <motion.div
          key={index}
          className="absolute text-white/5" // 🚀 Perfect subtle visibility on pure black
          style={{ left: el.x, top: el.y }}
          animate={{
            y: [0, -40, 0], // Float up and down
            x: [0, 20, 0],  // Drift slightly left and right
            rotate: [0, 15, -15, 0], // Gentle rotation
          }}
          transition={{
            duration: el.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: el.delay,
          }}
        >
          <svg
            width={el.size}
            height={el.size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {icons[el.icon]}
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingBackground;