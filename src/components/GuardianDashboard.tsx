import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, CheckCircle2, AlertCircle, Clock, Search, 
  Filter, MoreVertical, Check, X, ShieldCheck,
  MessageSquare, User, Eye, Trash2, Ban, ShieldAlert
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  limit,
  where,
  deleteDoc
} from 'firebase/firestore';

interface Product {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  price: number;
  currency: string;
  createdAt: string;
  status: 'pending' | 'verified' | 'rejected';
  upVotes: string[];
  downVotes: string[];
  isFlagged?: boolean;
}

interface FlaggedReport {
  id: string;
  productId: string;
  productTitle: string;
  authorId: string;
  authorName: string;
  upVotes: number;
  downVotes: number;
  flaggedAt: string;
  status: 'pending' | 'dismissed' | 'warned' | 'banned';
}

export default function GuardianDashboard({ onViewProduct }: { onViewProduct?: (id: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [flaggedReports, setFlaggedReports] = useState<FlaggedReport[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected' | 'flagged'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'flaggedProducts'), where('status', '==', 'pending'), orderBy('flaggedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlaggedReport));
      setFlaggedReports(reports);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flaggedProducts');
    });
    return () => unsubscribe();
  }, []);

  const handleVerify = async (productId: string, status: 'verified' | 'rejected' | 'pending') => {
    try {
      await updateDoc(doc(db, 'products', productId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'products');
    }
  };

  const handleModerationAction = async (report: FlaggedReport, action: 'dismiss' | 'warn' | 'ban') => {
    try {
      if (action === 'dismiss') {
        await updateDoc(doc(db, 'flaggedProducts', report.id), { status: 'dismissed' });
        await updateDoc(doc(db, 'products', report.productId), { isFlagged: false });
      } else if (action === 'warn') {
        // In a real app, send a notification/email
        await updateDoc(doc(db, 'flaggedProducts', report.id), { status: 'warned' });
        alert(`Usuario ${report.authorName} advertido.`);
      } else if (action === 'ban') {
        await updateDoc(doc(db, 'users', report.authorId), { isBanned: true });
        await updateDoc(doc(db, 'flaggedProducts', report.id), { status: 'banned' });
        // Optionally delete the product
        await deleteDoc(doc(db, 'products', report.productId));
        alert(`Usuario ${report.authorName} baneado y producto eliminado.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'moderation');
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeTab === 'pending') return !p.status || p.status === 'pending';
    if (activeTab === 'flagged') return false; // Handled separately
    return p.status === activeTab;
  });

  return (
    <div className="flex flex-col gap-8 pb-32 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-vuttik-blue text-white rounded-[20px] flex items-center justify-center shadow-xl shadow-vuttik-blue/20">
            <Shield size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-vuttik-navy">Panel Guardian</h2>
            <p className="text-vuttik-text-muted text-sm font-bold uppercase tracking-widest">Moderación y Verificación Comunitaria</p>
          </div>
        </div>

        <div className="flex bg-vuttik-gray p-1 rounded-2xl overflow-x-auto no-scrollbar">
          {[
            { id: 'pending', label: 'Pendientes', icon: Clock },
            { id: 'verified', label: 'Verificados', icon: CheckCircle2 },
            { id: 'rejected', label: 'Rechazados', icon: AlertCircle },
            { id: 'flagged', label: 'Reportados', icon: ShieldAlert },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-vuttik-blue shadow-sm' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'flagged' && flaggedReports.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{flaggedReports.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest mb-1">Por Verificar</p>
          <p className="text-3xl font-display font-black text-vuttik-navy">{products.filter(p => !p.status || p.status === 'pending').length}</p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest mb-1">Reportes Activos</p>
          <p className="text-3xl font-display font-black text-red-500">{flaggedReports.length}</p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest mb-1">Verificados Hoy</p>
          <p className="text-3xl font-display font-black text-vuttik-blue">{products.filter(p => p.status === 'verified').length}</p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest mb-1">Votos Totales</p>
          <p className="text-3xl font-display font-black text-green-600">
            {products.reduce((acc, p) => acc + (p.upVotes?.length || 0) + (p.downVotes?.length || 0), 0)}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-gray-100 rounded-[40px] shadow-sm overflow-hidden">
        {activeTab === 'flagged' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-vuttik-gray border-b border-gray-100">
                  <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Producto Reportado</th>
                  <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Usuario</th>
                  <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Votos (Desaprobación)</th>
                  <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Acciones de Moderación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {flaggedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-sm font-black text-vuttik-navy">{report.productTitle}</p>
                        <p className="text-[10px] text-vuttik-text-muted font-bold uppercase">Reportado el {new Date(report.flaggedAt).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-vuttik-gray rounded-lg flex items-center justify-center text-[10px] font-bold text-vuttik-navy">
                          {report.authorName.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-vuttik-navy">{report.authorName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-red-500 uppercase">Downvotes: {report.downVotes}</span>
                          <span className="text-[10px] font-bold text-vuttik-text-muted uppercase">Total: {report.upVotes + report.downVotes}</span>
                        </div>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500" 
                            style={{ width: `${(report.downVotes / (report.upVotes + report.downVotes)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleModerationAction(report, 'dismiss')}
                          className="p-2.5 bg-gray-100 text-vuttik-navy rounded-xl hover:bg-vuttik-navy hover:text-white transition-all"
                          title="Descartar Reporte"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleModerationAction(report, 'warn')}
                          className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all"
                          title="Advertir Usuario"
                        >
                          <AlertCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleModerationAction(report, 'ban')}
                          className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                          title="Banear Usuario"
                        >
                          <Ban size={18} />
                        </button>
                        <button 
                          onClick={() => onViewProduct?.(report.productId)}
                          className="p-2.5 bg-vuttik-gray text-vuttik-navy rounded-xl hover:bg-vuttik-blue hover:text-white transition-all"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {flaggedReports.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-vuttik-text-muted">
                        <ShieldCheck size={48} className="opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No hay reportes críticos pendientes</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-vuttik-gray border-b border-gray-100">
                  <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Producto</th>
                  <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Autor</th>
                  <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Confianza (Votos)</th>
                  <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-vuttik-gray/50 transition-colors">
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-sm font-black text-vuttik-navy">{product.title}</p>
                        <p className="text-xs text-vuttik-blue font-bold">{product.price} {product.currency}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-vuttik-navy">
                          {product.authorName.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-vuttik-navy">{product.authorName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-green-600 font-bold text-xs">
                          <Check size={14} /> {product.upVotes?.length || 0}
                        </div>
                        <div className="flex items-center gap-1 text-red-500 font-bold text-xs">
                          <X size={14} /> {product.downVotes?.length || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {activeTab === 'pending' ? (
                          <>
                            <button 
                              onClick={() => handleVerify(product.id, 'verified')}
                              className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                              title="Verificar"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              onClick={() => handleVerify(product.id, 'rejected')}
                              className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                              title="Rechazar"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleVerify(product.id, 'pending')}
                            className="p-2.5 bg-vuttik-gray text-vuttik-navy rounded-xl hover:bg-vuttik-blue hover:text-white transition-all"
                            title="Mover a Pendientes"
                          >
                            <Clock size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => onViewProduct?.(product.id)}
                          className="p-2.5 bg-vuttik-gray text-vuttik-navy rounded-xl hover:bg-vuttik-blue hover:text-white transition-all"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-vuttik-text-muted">
                        <ShieldCheck size={48} className="opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No hay productos en esta sección</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
