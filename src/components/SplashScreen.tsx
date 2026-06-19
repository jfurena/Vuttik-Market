import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function SplashScreen({ message = "Preparando tu espacio..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950">
      <div className="absolute inset-0 mesh-gradient-premium opacity-50" />
      <motion.div 
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.img 
          src="/logo_solo.png" 
          alt="Vuttik" 
          className="w-32 h-32 md:w-40 md:h-40 object-contain mb-8 drop-shadow-2xl"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Loader2 className="animate-spin text-vuttik-cyan mb-4" size={32} />
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">{message}</h2>
        </motion.div>
      </motion.div>
    </div>
  );
}
