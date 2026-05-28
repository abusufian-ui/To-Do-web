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

  // Configuration for each floating icon (placed in left and right gutters to avoid card occlusion)
  const floatingElements = [
    // --- LEFT SIDE Gutter (x: 5% to 33%) ---
    { icon: 0, x: '6%', y: '8%', size: 38, duration: 15, delay: 0, opacity: 0.12 },
    { icon: 1, x: '18%', y: '15%', size: 34, duration: 13, delay: 2, opacity: 0.08 },
    { icon: 2, x: '8%', y: '28%', size: 44, duration: 19, delay: 4, opacity: 0.10 },
    { icon: 3, x: '25%', y: '35%', size: 50, duration: 22, delay: 1, opacity: 0.12 },
    { icon: 4, x: '12%', y: '48%', size: 36, duration: 16, delay: 5, opacity: 0.06 },
    { icon: 0, x: '28%', y: '55%', size: 40, duration: 14, delay: 3, opacity: 0.10 },
    { icon: 2, x: '5%', y: '65%', size: 48, duration: 20, delay: 2, opacity: 0.08 },
    { icon: 1, x: '22%', y: '72%', size: 32, duration: 15, delay: 6, opacity: 0.12 },
    { icon: 3, x: '10%', y: '82%', size: 52, duration: 18, delay: 3, opacity: 0.10 },
    { icon: 4, x: '26%', y: '88%', size: 38, duration: 21, delay: 7, opacity: 0.08 },
    { icon: 1, x: '15%', y: '95%', size: 42, duration: 17, delay: 0, opacity: 0.10 },
    { icon: 0, x: '30%', y: '20%', size: 36, duration: 16, delay: 4, opacity: 0.08 },

    // --- RIGHT SIDE Gutter (x: 67% to 95%) ---
    { icon: 1, x: '88%', y: '6%', size: 46, duration: 16, delay: 1, opacity: 0.12 },
    { icon: 0, x: '72%', y: '12%', size: 38, duration: 14, delay: 3, opacity: 0.08 },
    { icon: 3, x: '82%', y: '24%', size: 54, duration: 21, delay: 5, opacity: 0.10 },
    { icon: 2, x: '70%', y: '32%', size: 42, duration: 18, delay: 0, opacity: 0.12 },
    { icon: 4, x: '90%', y: '42%', size: 35, duration: 15, delay: 6, opacity: 0.06 },
    { icon: 1, x: '75%', y: '50%', size: 48, duration: 20, delay: 2, opacity: 0.10 },
    { icon: 0, x: '85%', y: '62%', size: 40, duration: 17, delay: 4, opacity: 0.08 },
    { icon: 3, x: '68%', y: '70%', size: 50, duration: 22, delay: 3, opacity: 0.12 },
    { icon: 2, x: '78%', y: '80%', size: 44, duration: 19, delay: 1, opacity: 0.10 },
    { icon: 4, x: '92%', y: '88%', size: 36, duration: 15, delay: 5, opacity: 0.08 },
    { icon: 0, x: '80%', y: '95%', size: 42, duration: 18, delay: 7, opacity: 0.12 },
    { icon: 2, x: '72%', y: '2%', size: 34, duration: 13, delay: 2, opacity: 0.08 }
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {floatingElements.map((el, index) => (
        <motion.div
          key={index}
          className="absolute text-white"
          style={{ left: el.x, top: el.y, opacity: el.opacity }}
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