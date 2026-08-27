import React from 'react';

export default function AdBanner() {
  return (
    <div className="w-full bg-vuttik-gray/30 border border-vuttik-gray rounded-3xl p-6 flex flex-col items-center justify-center my-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      <span className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest mb-2 block w-full text-center">Publicidad</span>
      <div className="w-full max-w-sm flex items-center gap-4 opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex-shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded-full w-1/2 animate-pulse" />
        </div>
      </div>
      <p className="text-xs font-medium text-vuttik-text-muted mt-4 text-center">
        ¿Quieres eliminar los anuncios y acceder a métricas de tu negocio? <br />
        <span className="text-vuttik-blue font-bold cursor-pointer hover:underline">Mejora tu plan Vuttik</span>
      </p>
    </div>
  );
}
