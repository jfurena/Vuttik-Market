import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Shield, ShieldAlert, Briefcase, User, Search, 
  MoreVertical, Mail, Key, Trash2, Check, X, ShieldCheck,
  CreditCard, Plus, Edit2, Save
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  addDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'business' | 'guardian' | 'mega_guardian' | 'admin';
  createdAt: string;
  planId?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  isDefault?: boolean;
}

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<'users' | 'subscriptions'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'subscriptionPlans'), (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap default plans
        const defaultPlans = [
          { name: 'Gratis', price: 0, features: ['market', 'social', 'messages'], isDefault: true },
          { name: 'Business', price: 29.99, features: ['market', 'social', 'messages', 'business_dash'] }
        ];
        defaultPlans.forEach(p => addDoc(collection(db, 'subscriptionPlans'), p));
      }
      const plansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan));
      setPlans(plansData);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: UserProfile['role']) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setSelectedUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Correo de restablecimiento enviado a ' + email);
    } catch (error) {
      console.error('Error sending reset email:', error);
      alert('Error al enviar el correo');
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    try {
      const { id, ...data } = editingPlan;
      if (id) {
        await updateDoc(doc(db, 'subscriptionPlans', id), data);
      } else {
        await addDoc(collection(db, 'subscriptionPlans'), data);
      }
      setEditingPlan(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subscriptionPlans');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="text-red-500" size={16} />;
      case 'mega_guardian': return <ShieldCheck className="text-vuttik-blue" size={16} />;
      case 'guardian': return <Shield className="text-vuttik-blue" size={16} />;
      case 'business': return <Briefcase className="text-vuttik-navy" size={16} />;
      default: return <User className="text-gray-400" size={16} />;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-32 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-vuttik-navy text-white rounded-[20px] flex items-center justify-center shadow-xl shadow-vuttik-navy/20">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-vuttik-navy">Panel de Dueño</h2>
            <p className="text-vuttik-text-muted text-sm font-bold uppercase tracking-widest">Gestión de Plataforma</p>
          </div>
        </div>

        <div className="flex bg-vuttik-gray p-1 rounded-2xl">
          <button 
            onClick={() => setActiveView('users')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'users' ? 'bg-white text-vuttik-blue shadow-sm' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
          >
            Usuarios
          </button>
          <button 
            onClick={() => setActiveView('subscriptions')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'subscriptions' ? 'bg-white text-vuttik-blue shadow-sm' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
          >
            Suscripciones
          </button>
        </div>
      </div>

      {activeView === 'users' ? (
        <>
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={20} />
            <input 
              type="text" 
              placeholder="Buscar usuario por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[32px] px-16 py-6 shadow-sm focus:ring-4 focus:ring-vuttik-blue/10 transition-all outline-none text-lg font-medium"
            />
          </div>

          <div className="bg-white border border-gray-100 rounded-[40px] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-vuttik-gray border-b border-gray-100">
                    <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Usuario</th>
                    <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Rol Actual</th>
                    <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Suscripción</th>
                    <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-vuttik-gray/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-vuttik-gray rounded-xl flex items-center justify-center text-vuttik-navy font-bold">
                            {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-vuttik-navy">{user.displayName || 'Sin nombre'}</p>
                            <p className="text-xs text-vuttik-text-muted">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          <span className="text-xs font-bold uppercase tracking-wider text-vuttik-navy">{user.role.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-vuttik-text-muted">
                          {plans.find(p => p.id === user.planId)?.name || 'Gratis'}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="p-2.5 bg-vuttik-gray text-vuttik-navy rounded-xl hover:bg-vuttik-blue hover:text-white transition-all"
                            title="Cambiar Rol"
                          >
                            <Shield size={18} />
                          </button>
                          <button 
                            onClick={() => handleResetPassword(user.email)}
                            className="p-2.5 bg-vuttik-gray text-vuttik-navy rounded-xl hover:bg-vuttik-blue hover:text-white transition-all"
                            title="Resetear Contraseña"
                          >
                            <Key size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-display font-black text-vuttik-navy">{plan.name}</h3>
                  <p className="text-vuttik-blue font-black text-3xl mt-1">${plan.price}<span className="text-sm text-vuttik-text-muted font-bold">/mes</span></p>
                </div>
                <button 
                  onClick={() => setEditingPlan(plan)}
                  className="p-3 bg-vuttik-gray text-vuttik-navy rounded-2xl hover:bg-vuttik-blue hover:text-white transition-all"
                >
                  <Edit2 size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-8">
                <p className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Funciones Habilitadas</p>
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-bold text-vuttik-navy">
                    <Check size={16} className="text-vuttik-blue" />
                    {f.replace('_', ' ')}
                  </div>
                ))}
              </div>

              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-vuttik-blue opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-500" />
            </div>
          ))}

          <button 
            onClick={() => setEditingPlan({ id: '', name: '', price: 0, features: [] })}
            className="border-2 border-dashed border-gray-200 rounded-[40px] p-8 flex flex-col items-center justify-center gap-4 text-vuttik-text-muted hover:border-vuttik-blue hover:text-vuttik-blue transition-all group"
          >
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-vuttik-blue/10 transition-colors">
              <Plus size={32} />
            </div>
            <span className="font-black uppercase tracking-widest text-sm">Nueva Suscripción</span>
          </button>
        </div>
      )}

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vuttik-navy/60 backdrop-blur-sm" onClick={() => setEditingPlan(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl"
          >
            <h3 className="text-2xl font-display font-black text-vuttik-navy mb-6">{editingPlan.id ? 'Editar Plan' : 'Nuevo Plan'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest mb-1 block">Nombre del Plan</label>
                <input 
                  type="text" 
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest mb-1 block">Precio Mensual ($)</label>
                <input 
                  type="number" 
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                  className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest mb-1 block">Funciones (separadas por coma)</label>
                <input 
                  type="text" 
                  value={editingPlan.features.join(', ')}
                  onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split(',').map(s => s.trim()) })}
                  placeholder="market, social, business_dash..."
                  className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 outline-none font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setEditingPlan(null)}
                className="flex-1 py-4 text-sm font-black text-vuttik-text-muted uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSavePlan}
                className="flex-1 bg-vuttik-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-vuttik-blue/20"
              >
                Guardar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Role Selection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vuttik-navy/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl"
          >
            <h3 className="text-2xl font-display font-black text-vuttik-navy mb-2">Cambiar Rol</h3>
            <p className="text-vuttik-text-muted mb-8 text-sm">Selecciona el nuevo nivel de acceso para <b>{selectedUser.displayName || selectedUser.email}</b></p>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'user', label: 'Usuario Estándar', icon: User },
                { id: 'business', label: 'Empresa / Negocio', icon: Briefcase },
                { id: 'guardian', label: 'Guardian', icon: Shield },
                { id: 'mega_guardian', label: 'Mega Guardian', icon: ShieldCheck },
                { id: 'admin', label: 'Administrador (Dueño)', icon: ShieldAlert },
              ].map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleUpdateRole(selectedUser.id, role.id as any)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    selectedUser.role === role.id 
                      ? 'border-vuttik-blue bg-vuttik-blue/5' 
                      : 'border-gray-50 hover:border-vuttik-blue/20'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${selectedUser.role === role.id ? 'bg-vuttik-blue text-white' : 'bg-gray-50 text-vuttik-navy'}`}>
                    <role.icon size={20} />
                  </div>
                  <span className="font-bold text-vuttik-navy">{role.label}</span>
                  {selectedUser.role === role.id && <Check className="ml-auto text-vuttik-blue" size={20} />}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setSelectedUser(null)}
              className="w-full mt-8 py-4 text-sm font-black text-vuttik-text-muted uppercase tracking-widest"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
