import React, { useState, useEffect } from 'react';
import { X, Lock, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  planName: string;
  planPrice: number;
}

export default function LemonSqueezyMockCheckout({ isOpen, onClose, onSuccess, planName, planPrice }: CheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setCardNumber('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate network request
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-100 p-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Lock size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Pago Seguro (Test Mode)</span>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 overflow-y-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900 mb-1">Vuttik Market</h2>
              <p className="text-gray-500 text-sm">Suscripción al plan {planName}</p>
              
              <div className="mt-6 py-4 border-y border-gray-100 flex justify-between items-center">
                <span className="font-bold text-gray-700">Total a pagar hoy</span>
                <span className="text-2xl font-black text-gray-900">${planPrice}<span className="text-sm text-gray-500 font-bold">/mes</span></span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Correo Electrónico</label>
                <input 
                  type="email" 
                  defaultValue="usuario@test.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Información de Tarjeta</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <input 
                    type="text" 
                    placeholder="MM / YY"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="CVC"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-[#7047EB] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#5b36c4] transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    `Pagar $${planPrice}`
                  )}
                </button>
              </div>
              
              <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                Powered by <strong className="text-gray-600">Lemon Squeezy</strong>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
