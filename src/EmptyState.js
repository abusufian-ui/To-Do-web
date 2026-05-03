import React from 'react';
import { motion } from 'framer-motion';

const EmptyState = ({ icon: Icon, title, message }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="flex flex-col items-center justify-center w-full h-full min-h-[400px] p-8"
    >
      <div className="w-24 h-24 rounded-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center mb-8 text-gray-400 dark:text-gray-500 transition-all hover:scale-105 duration-300">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight text-center">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md font-medium leading-relaxed">
        {message}
      </p>
    </motion.div>
  );
};

export default EmptyState;
