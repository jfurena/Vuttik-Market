import React from 'react';
import { ExternalLink, ArrowRight, Barcode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Herramientas() {
  const { userProfile, user } = useAuth();

  const isProd = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');
  const posUrl = isProd
    ? `${window.location.protocol}//pos.${window.location.host}`
    : `${window.location.protocol}//${window.location.host}/pos`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black text-vuttik-navy mb-2 tracking-tight">Otras Herramientas</h1>
            <p className="text-vuttik-text-muted font-medium">Ecosistema de aplicaciones interrelacionadas con Vuttik Market.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Vuttik POS Card */}
            <a 
              href={posUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className="block group relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-800/50 dark:to-slate-900 border border-indigo-100/50 dark:border-slate-700/50 shadow-xl shadow-indigo-100/20 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-vuttik-blue/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              
              <div className="flex flex-col items-center justify-center text-center mb-6 z-10">
                <img src="/vuttik-pos-logo.png" alt="Vuttik POS" className="h-28 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform mb-4" />
                <h3 className="text-2xl font-display font-black text-vuttik-navy tracking-tight group-hover:text-vuttik-blue transition-colors">Vuttik POS</h3>
              </div>
              
              <p className="text-vuttik-text-muted text-sm leading-relaxed mb-8 flex-grow z-10 text-center">
                Sistema de Punto de Venta (POS) local. Administra tu inventario, ventas y facturación en tiempo real con sincronización directa hacia Vuttik Market.
              </p>
              
              <div className="w-full py-4 px-6 bg-vuttik-blue text-white rounded-2xl font-bold flex items-center justify-center gap-2 group-hover:bg-blue-600 transition-colors shadow-md group-hover:shadow-lg active:scale-95 z-10">
                <span>Acceder al Login</span>
                <ExternalLink size={18} />
              </div>
            </a>

            {/* EAN Recollector Card */}
            <Link 
              to="/herramientas/ean-recollector"
              className="block group relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-900/20 dark:to-slate-900 border border-purple-100/50 dark:border-purple-800/50 shadow-xl shadow-purple-100/20 dark:shadow-none hover:shadow-2xl hover:shadow-purple-200/40 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              
              <div className="flex flex-col items-center justify-center text-center mb-6 z-10">
                <div className="h-28 w-28 bg-white shadow-md rounded-3xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-105 transition-transform border border-purple-100">
                  <Barcode size={64} />
                </div>
                <h3 className="text-2xl font-display font-black text-vuttik-navy tracking-tight group-hover:text-purple-600 transition-colors">EAN Recollector</h3>
              </div>
              
              <p className="text-vuttik-text-muted text-sm leading-relaxed mb-8 flex-grow z-10 text-center">
                Base de Datos Global EAN. Explora y alimenta el repositorio universal de códigos de barra para facilitar la publicación en Vuttik Market.
              </p>
              
              <div className="w-full py-4 px-6 bg-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 group-hover:bg-purple-700 transition-colors shadow-md group-hover:shadow-lg active:scale-95 z-10">
                <span>Abrir Recollector</span>
                <ArrowRight size={18} />
              </div>
            </Link>

            {/* Placeholder for future apps */}
            <div className="bg-vuttik-gray/50 rounded-[32px] border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mb-4">
                <ArrowRight size={32} />
              </div>
              <h3 className="text-lg font-bold text-vuttik-navy mb-2">Más herramientas pronto</h3>
              <p className="text-vuttik-text-muted text-sm">El ecosistema sigue creciendo.</p>
            </div>
          </div>
    </div>
  );
}
