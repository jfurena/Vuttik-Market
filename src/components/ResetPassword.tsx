import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('El enlace de recuperación es inválido o no se proporcionó.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('El enlace de recuperación es inválido.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(token, newPassword);
      setSuccess(res.message || 'Contraseña actualizada correctamente.');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f6f9fc]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Vuttik Logo" className="h-16 mx-auto mb-6 object-contain" />
          <h2 className="text-3xl font-display font-black text-vuttik-navy mb-2">Nueva Contraseña</h2>
          <p className="text-vuttik-text-muted">Crea una nueva contraseña segura para tu cuenta.</p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-red-50 text-red-500 border border-red-100 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3">
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-green-50 text-green-600 border border-green-100 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3">
              <CheckCircle2 size={20} />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-sm font-bold text-vuttik-navy">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} disabled={loading || !!success}
                className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:border-[#1E62FF] focus:ring-4 focus:ring-[#1E62FF]/10 transition-all text-sm" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-sm font-bold text-vuttik-navy">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} disabled={loading || !!success}
                className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:border-[#1E62FF] focus:ring-4 focus:ring-[#1E62FF]/10 transition-all text-sm" />
            </div>
          </div>

          <button type="submit" disabled={loading || !token || !!success}
            className="w-full mt-4 py-3 md:py-3.5 bg-[#1E62FF] hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
            {loading ? 'Guardando...' : 'Establecer Contraseña'}
            <ArrowRight size={18} />
          </button>
        </form>

        <button onClick={() => navigate('/')}
          className="mt-8 flex items-center justify-center text-vuttik-text-muted hover:text-vuttik-navy transition-colors text-sm font-bold w-full">
          Cancelar y Volver al Inicio
        </button>
      </motion.div>
    </div>
  );
}
