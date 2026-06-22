import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, HelpCircle, Info, X } from 'lucide-react';

type DialogType = 'confirm' | 'prompt' | 'alert';

interface DialogOptions {
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
  iconType?: 'warning' | 'info' | 'success' | 'danger' | 'question';
}

interface DialogState extends DialogOptions {
  isOpen: boolean;
  onConfirm: (value?: string | boolean) => void;
  onCancel: () => void;
}

interface DialogContextType {
  confirm: (options: DialogOptions | string) => Promise<boolean>;
  prompt: (options: DialogOptions | string) => Promise<string | null>;
  alert: (options: DialogOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState('');

  const confirm = useCallback((options: DialogOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const parsedOptions = typeof options === 'string' ? { title: 'Confirmar', message: options } : options;
      
      setDialogState({
        ...parsedOptions,
        type: 'confirm',
        isOpen: true,
        onConfirm: () => {
          setDialogState(null);
          resolve(true);
        },
        onCancel: () => {
          setDialogState(null);
          resolve(false);
        }
      });
    });
  }, []);

  const prompt = useCallback((options: DialogOptions | string) => {
    return new Promise<string | null>((resolve) => {
      const parsedOptions = typeof options === 'string' ? { title: 'Ingresar información', message: options } : options;
      setInputValue(''); // reset input
      
      setDialogState({
        ...parsedOptions,
        type: 'prompt',
        isOpen: true,
        onConfirm: (val) => {
          setDialogState(null);
          resolve((val as string) || '');
        },
        onCancel: () => {
          setDialogState(null);
          resolve(null);
        }
      });
    });
  }, []);

  const alert = useCallback((options: DialogOptions | string) => {
    return new Promise<void>((resolve) => {
      const parsedOptions = typeof options === 'string' ? { title: 'Atención', message: options } : options;
      
      setDialogState({
        ...parsedOptions,
        type: 'alert',
        isOpen: true,
        onConfirm: () => {
          setDialogState(null);
          resolve();
        },
        onCancel: () => {
          setDialogState(null);
          resolve();
        }
      });
    });
  }, []);

  const handleConfirm = () => {
    if (dialogState?.type === 'prompt') {
      dialogState.onConfirm(inputValue);
    } else {
      dialogState?.onConfirm(true);
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="text-orange-500 w-8 h-8" />;
      case 'danger': return <AlertCircle className="text-red-500 w-8 h-8" />;
      case 'success': return <CheckCircle className="text-green-500 w-8 h-8" />;
      case 'question': return <HelpCircle className="text-vuttik-blue w-8 h-8" />;
      case 'info':
      default:
        return <Info className="text-vuttik-blue w-8 h-8" />;
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      
      <AnimatePresence>
        {dialogState?.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-vuttik-navy/40 backdrop-blur-sm"
              onClick={dialogState.onCancel}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-8"
            >
              <button 
                onClick={dialogState.onCancel}
                className="absolute top-6 right-6 p-2 bg-vuttik-gray rounded-xl text-vuttik-text-muted hover:bg-vuttik-blue hover:text-white transition-all z-10"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col gap-4">
                <div className="w-16 h-16 bg-vuttik-gray rounded-2xl flex items-center justify-center shadow-inner">
                  {getIcon(dialogState.iconType || (dialogState.type === 'confirm' ? 'question' : 'info'))}
                </div>
                
                <div>
                  <h3 className="text-2xl font-display font-black text-vuttik-navy">{dialogState.title}</h3>
                  <p className="text-vuttik-text-muted font-medium mt-2 leading-relaxed">
                    {dialogState.message}
                  </p>
                </div>

                {dialogState.type === 'prompt' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      autoFocus
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirm();
                        if (e.key === 'Escape') dialogState.onCancel();
                      }}
                      placeholder={dialogState.placeholder || 'Escribe aquí...'}
                      className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                  {dialogState.type !== 'alert' && (
                    <button
                      onClick={dialogState.onCancel}
                      className="flex-1 py-4 bg-gray-100 text-vuttik-navy rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      {dialogState.cancelText || 'Cancelar'}
                    </button>
                  )}
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-4 bg-vuttik-blue text-white rounded-2xl font-bold shadow-lg shadow-vuttik-blue/30 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {dialogState.confirmText || 'Aceptar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
