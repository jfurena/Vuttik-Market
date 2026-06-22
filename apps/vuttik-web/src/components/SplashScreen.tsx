import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <motion.div 
        className="relative flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Loading ring around the logo */}
        <motion.div 
          className="absolute inset-[-25%] border-[3px] border-slate-100 border-t-blue-600 border-r-blue-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Logo */}
        <motion.img 
          src="/logo_solo.png" 
          alt="Vuttik" 
          className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
