import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import * as LucideIcons from 'lucide-react';
import { 
  Shield, TrendingUp, Users, ShoppingBag, Download, Filter, 
  Search, ArrowUpRight, ArrowDownRight, MapPin, Store, BarChart2,
  Plus, Edit2, Trash2, Check, X, ChevronRight, LayoutGrid,
  ShieldAlert, ShieldCheck, CreditCard, Tag, UserMinus, UserCheck, Mail,
  UserCog, Ban, Unlock, AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  where
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';

interface CategoryField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  allowedTypes: string[];
  fields?: CategoryField[];
  systemFields?: {
    title?: { label: string; required: boolean };
    price?: { label: string; required: boolean };
    location?: { label: string; required: boolean };
    description?: { label: string; required: boolean };
    barcode?: { label: string; required: boolean; active: boolean };
    images?: { label: string; required: boolean };
  };
  order: number;
  active: boolean;
}

const DATA_TRENDS = [
  { name: 'Lun', busquedas: 4000, ventas: 2400 },
  { name: 'Mar', busquedas: 3000, ventas: 1398 },
  { name: 'Mie', busquedas: 2000, ventas: 9800 },
  { name: 'Jue', busquedas: 2780, ventas: 3908 },
  { name: 'Vie', busquedas: 1890, ventas: 4800 },
  { name: 'Sab', busquedas: 2390, ventas: 3800 },
  { name: 'Dom', busquedas: 3490, ventas: 4300 },
];

const CATEGORY_DATA = [
  { name: 'Comida', value: 400 },
  { name: 'Vehículos', value: 300 },
  { name: 'Inmuebles', value: 300 },
  { name: 'Electrónica', value: 200 },
];

const COLORS = ['#3B82F6', '#002B49', '#10B981', '#F59E0B'];

const COMMON_ICONS = [
  'ShoppingBag', 'Car', 'Home', 'Smartphone', 'Briefcase', 'Key', 'Banknote', 
  'Utensils', 'Zap', 'Heart', 'Camera', 'Music', 'Book', 'Gift', 'Coffee', 
  'Plane', 'Bicycle', 'Truck', 'Monitor', 'Watch', 'Gamepad', 'Headphones', 
  'Tool', 'Scissors', 'Brush', 'Palette', 'Dumbbell', 'Anchor', 'Sun', 'Moon', 
  'Cloud', 'Star', 'MapPin', 'DollarSign', 'CreditCard', 'Wallet', 'Tag', 
  'Percent', 'ShoppingBasket', 'ShoppingCart', 'Store', 'Package', 'Box', 
  'Archive', 'Layers', 'LayoutGrid', 'Activity', 'TrendingUp', 'PieChart', 
  'BarChart', 'LineChart', 'Globe', 'Compass', 'Navigation', 'Map', 'Flag', 
  'Bell', 'Mail', 'MessageSquare', 'Phone', 'User', 'Users', 'Shield', 'Lock'
];

const CategoryIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LayoutGrid;
  return <IconComponent size={size} className={className} />;
};

interface TransactionType {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isBanned?: boolean;
  createdAt: string;
}

export default function MegaGuardianDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'categories' | 'subcategories' | 'users' | 'comparison' | 'reports' | 'subscriptions'>('overview');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isEditingType, setIsEditingType] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  const [typeForm, setTypeForm] = useState<Partial<TransactionType>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [flaggedReports, setFlaggedReports] = useState<any[]>([]);
  const [megaStats, setMegaStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(u);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'subscriptionPlans'), (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlans(plansData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'transactionTypes'), orderBy('label', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const types = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionType));
      setTransactionTypes(types);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactionTypes');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeView !== 'reports') return;
    const q = query(collection(db, 'flaggedProducts'), orderBy('flaggedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFlaggedReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flaggedProducts');
    });
    return () => unsubscribe();
  }, [activeView]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [stats, trendsData] = await Promise.all([
          api.getMegaGuardianStats(),
          api.getTrends()
        ]);
        setMegaStats(stats);
        setTrends(trendsData);
      } catch (error) {
        console.error('Error loading mega stats:', error);
      }
    };
    loadStats();
    const interval = setInterval(loadStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const handleSaveCategory = async (id?: string) => {
    try {
      // Create a clean data object without the ID
      const { id: _, ...dataToSave } = editForm as any;
      
      if (id) {
        await updateDoc(doc(db, 'categories', id), dataToSave);
        setIsEditing(null);
      } else {
        await addDoc(collection(db, 'categories'), {
          ...dataToSave,
          active: true,
          order: categories.length + 1
        });
        setIsAdding(false);
      }
      setEditForm({});
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, 'categories');
    }
  };

  const handleOpenEdit = (cat: Category) => {
    setIsEditing(cat.id);
    setEditForm({
      ...cat,
      systemFields: cat.systemFields || {
        title: { label: 'Nombre/Título', required: true },
        price: { label: 'Precio', required: true },
        location: { label: 'Ubicación', required: true },
        description: { label: 'Descripción', required: false },
        barcode: { label: 'Código de Barras', required: false, active: false },
        images: { label: 'Fotos', required: true }
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdd = () => {
    setIsAdding(true);
    setEditForm({ 
      allowedTypes: [], 
      fields: [],
      systemFields: {
        title: { label: 'Nombre/Título', required: true },
        price: { label: 'Precio', required: true },
        location: { label: 'Ubicación', required: true },
        description: { label: 'Descripción', required: false },
        barcode: { label: 'Código de Barras', required: false, active: false },
        images: { label: 'Fotos', required: true }
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'categories');
    }
  };

  const toggleType = (typeId: string) => {
    const currentTypes = editForm.allowedTypes || [];
    if (currentTypes.includes(typeId)) {
      setEditForm({ ...editForm, allowedTypes: currentTypes.filter(t => t !== typeId) });
    } else {
      setEditForm({ ...editForm, allowedTypes: [...currentTypes, typeId] });
    }
  };

  const addField = () => {
    const currentFields = editForm.fields || [];
    const newField: CategoryField = {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      required: false
    };
    setEditForm({ ...editForm, fields: [...currentFields, newField] });
  };

  const removeField = (fieldId: string) => {
    const currentFields = editForm.fields || [];
    setEditForm({ ...editForm, fields: currentFields.filter(f => f.id !== fieldId) });
  };

  const updateField = (fieldId: string, updates: Partial<CategoryField>) => {
    const currentFields = editForm.fields || [];
    setEditForm({
      ...editForm,
      fields: currentFields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    });
  };

  const bootstrapCategories = async () => {
    const initial = [
      { 
        name: 'Comida', 
        icon: 'ShoppingBag', 
        allowedTypes: ['sell', 'buy'], 
        order: 1, 
        active: true,
        systemFields: {
          title: { label: 'Nombre/Título', required: true },
          price: { label: 'Precio', required: true },
          location: { label: 'Ubicación', required: true },
          description: { label: 'Descripción', required: false },
          barcode: { label: 'Código de Barras', required: true, active: true },
          images: { label: 'Fotos', required: true }
        }
      },
      { 
        name: 'Terrenos', 
        icon: 'MapPin', 
        allowedTypes: ['sell', 'buy', 'rent'], 
        order: 2, 
        active: true,
        systemFields: {
          title: { label: 'Nombre/Título', required: true },
          price: { label: 'Precio', required: true },
          location: { label: 'Ubicación', required: true },
          description: { label: 'Descripción', required: false },
          barcode: { label: 'Código de Barras', required: false, active: false },
          images: { label: 'Fotos', required: true }
        }
      },
      { 
        name: 'Divisas', 
        icon: 'DollarSign', 
        allowedTypes: ['sell', 'buy'], 
        order: 3, 
        active: true,
        systemFields: {
          title: { label: 'Nombre/Título', required: true },
          price: { label: 'Precio', required: true },
          location: { label: 'Ubicación', required: true },
          description: { label: 'Descripción', required: false },
          barcode: { label: 'Código de Barras', required: false, active: false },
          images: { label: 'Fotos', required: true }
        }
      },
    ];

    for (const cat of initial) {
      await addDoc(collection(db, 'categories'), cat);
    }
  };

  const handleSaveType = async (id?: string) => {
    try {
      const { id: _, ...dataToSave } = typeForm as any;
      if (id) {
        await updateDoc(doc(db, 'transactionTypes', id), dataToSave);
        setIsEditingType(null);
      } else {
        await addDoc(collection(db, 'transactionTypes'), {
          ...dataToSave,
          active: true
        });
        setIsAddingType(false);
      }
      setTypeForm({});
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, 'transactionTypes');
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este tipo de transacción?')) return;
    try {
      await deleteDoc(doc(db, 'transactionTypes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactionTypes');
    }
  };

  const bootstrapTransactionTypes = async () => {
    const initial = [
      { label: 'Venta', icon: 'ArrowUpCircle', active: true },
      { label: 'Compra', icon: 'ArrowDownCircle', active: true },
      { label: 'Alquiler', icon: 'Key', active: true },
      { label: 'Préstamo', icon: 'Banknote', active: true },
      { label: 'Contratación', icon: 'BriefcaseBusiness', active: true },
      { label: 'Servicio', icon: 'ShieldCheck', active: true },
    ];
    for (const type of initial) {
      await addDoc(collection(db, 'transactionTypes'), type);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setNotification({ message: `Correo de restablecimiento enviado a ${email}`, type: 'success' });
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error sending reset email:', error);
      setNotification({ message: 'Error al enviar el correo de restablecimiento.', type: 'error' });
      setTimeout(() => setNotification(null), 5000);
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
      setNotification({ message: 'Plan guardado con éxito', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subscriptionPlans');
    }
  };

  const renderUsers = () => {
    const filteredUsers = users.filter(u => 
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
      <div className="space-y-6 px-4 md:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl md:text-2xl font-display font-black text-vuttik-navy">Gestión de Usuarios</h3>
            <p className="text-vuttik-text-muted text-xs md:text-sm">Administra roles, accesos y estados de cuenta.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Buscar usuario..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-vuttik-gray border-none rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((u) => (
            <div key={u.id} className={`bg-white border ${u.isBanned ? 'border-red-200 bg-red-50/30' : 'border-gray-100'} p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-4 group transition-all`}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-base md:text-lg shrink-0 ${u.isBanned ? 'bg-red-100 text-red-500' : 'bg-vuttik-gray text-vuttik-navy'}`}>
                  {u.displayName?.charAt(0) || u.email?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base md:text-lg font-black text-vuttik-navy truncate">{u.displayName || 'Sin nombre'}</h4>
                    {u.isBanned && <span className="bg-red-500 text-white text-[7px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 rounded-md uppercase tracking-widest">Baneado</span>}
                  </div>
                  <p className="text-[10px] md:text-xs text-vuttik-text-muted font-bold truncate">{u.email}</p>
                  <p className="text-[8px] md:text-[10px] text-vuttik-text-muted mt-0.5 md:mt-1 uppercase tracking-widest font-black">ID: {u.id.slice(-8)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <label className="text-[8px] font-black text-vuttik-text-muted uppercase tracking-widest">Rol de Usuario</label>
                  <select 
                    value={u.role || 'user'}
                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                    className="w-full sm:w-auto bg-vuttik-gray border-none rounded-xl px-4 py-2 text-xs font-bold text-vuttik-navy outline-none"
                  >
                    <option value="user">Usuario Estándar</option>
                    <option value="business">Empresa / Negocio</option>
                    <option value="negocio">Vendedor Certificado</option>
                    <option value="guardian">Guardian</option>
                    <option value="mega_guardian">Mega Guardian</option>
                    <option value="admin">Administrador (Dueño)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <label className="text-[8px] font-black text-vuttik-text-muted uppercase tracking-widest">Plan</label>
                  <p className="text-xs font-bold text-vuttik-navy bg-vuttik-gray px-3 py-2 rounded-xl">
                    {plans.find(p => p.id === u.plan_id)?.name || 'Gratis'}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                  <button 
                    onClick={() => handleResetPassword(u.email)}
                    className="p-2.5 md:p-3 text-vuttik-blue hover:bg-vuttik-blue/10 rounded-xl transition-all"
                    title="Resetear Contraseña"
                  >
                    <Mail size={18} />
                  </button>
                  <button 
                    onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                    className={`p-2.5 md:p-3 rounded-xl transition-all ${u.isBanned ? 'text-green-500 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                    title={u.isBanned ? 'Desbanear' : 'Banear'}
                  >
                    {u.isBanned ? <Unlock size={18} /> : <Ban size={18} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSubscriptions = () => (
    <div className="space-y-8 px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-display font-black text-vuttik-navy">Planes de Suscripción</h3>
          <p className="text-vuttik-text-muted text-sm">Gestiona los planes y beneficios de la plataforma.</p>
        </div>
        <button 
          onClick={() => setEditingPlan({ name: '', price: 0, features: [] })}
          className="bg-vuttik-blue text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-vuttik-blue/20 flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              {plan.features.map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm font-bold text-vuttik-navy">
                  <Check size={16} className="text-vuttik-blue" />
                  {f.replace('_', ' ')}
                </div>
              ))}
            </div>

            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-vuttik-blue opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-500" />
          </div>
        ))}
      </div>

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
    </div>
  );

  const renderSubcategories = () => (
    <div className="space-y-6 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-display font-black text-vuttik-navy">Tipos de Transacción (Subcategorías)</h3>
          <p className="text-vuttik-text-muted text-xs md:text-sm">Administra las opciones de acción (Venta, Compra, etc.) globales.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {transactionTypes.length === 0 && (
            <button 
              onClick={bootstrapTransactionTypes}
              className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-vuttik-navy text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold"
            >
              Inicializar Tipos
            </button>
          )}
          <button 
            onClick={() => { setIsAddingType(true); setTypeForm({ label: '' }); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-vuttik-blue text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold shadow-lg shadow-vuttik-blue/20"
          >
            <Plus size={14} className="md:size-4" />
            Nuevo Tipo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {(isAddingType || isEditingType) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-vuttik-gray p-6 rounded-[32px] border-2 border-vuttik-blue/20 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Nombre del Tipo</label>
                  <input 
                    type="text" 
                    value={typeForm.label || ''}
                    onChange={(e) => setTypeForm({ ...typeForm, label: e.target.value })}
                    className="w-full bg-white border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none"
                    placeholder="Ej. Venta, Alquiler, Subasta..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Icono del Tipo</label>
                  <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4">
                    <div className="w-10 h-10 bg-vuttik-gray rounded-xl flex items-center justify-center text-vuttik-navy">
                      <CategoryIcon name={typeForm.icon || 'Tag'} size={24} />
                    </div>
                    <input 
                      type="text" 
                      value={typeForm.icon || ''}
                      onChange={(e) => setTypeForm({ ...typeForm, icon: e.target.value })}
                      className="flex-1 bg-transparent border-none font-bold text-vuttik-navy outline-none"
                      placeholder="Nombre del icono..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Seleccionar Icono (Visual)</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 max-h-48 overflow-y-auto p-4 bg-white rounded-2xl no-scrollbar">
                  {COMMON_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setTypeForm({ ...typeForm, icon: iconName })}
                      className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                        typeForm.icon === iconName 
                          ? 'bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/20 scale-110' 
                          : 'bg-vuttik-gray text-vuttik-navy hover:bg-gray-200'
                      }`}
                      title={iconName}
                    >
                      <CategoryIcon name={iconName} size={20} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => { setIsAddingType(false); setIsEditingType(null); setTypeForm({}); }}
                  className="px-6 py-3 text-xs font-bold text-vuttik-text-muted uppercase"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleSaveType(isEditingType || undefined)}
                  className="px-8 py-3 bg-vuttik-navy text-white rounded-2xl text-xs font-bold flex items-center gap-2"
                >
                  <Check size={16} />
                  Guardar Tipo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {transactionTypes.map((type) => (
          <div key={type.id} className="bg-white border border-gray-100 p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-vuttik-blue/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-vuttik-gray text-vuttik-navy rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                <CategoryIcon name={type.icon || 'Tag'} size={20} className="md:size-6" />
              </div>
              <h4 className="text-base md:text-lg font-black text-vuttik-navy truncate">{type.label}</h4>
            </div>
            <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all justify-end border-t sm:border-t-0 border-gray-50 pt-3 sm:pt-0">
              <button 
                onClick={() => { setIsEditingType(type.id); setTypeForm(type); }}
                className="p-2.5 md:p-3 text-vuttik-navy hover:bg-vuttik-gray rounded-xl transition-all"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => handleDeleteType(type.id)}
                className="p-2.5 md:p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-display font-black text-vuttik-navy">Gestión de Categorías</h3>
          <p className="text-vuttik-text-muted text-xs md:text-sm">Administra las categorías y sus tipos de transacción permitidos.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {categories.length === 0 && (
            <button 
              onClick={bootstrapCategories}
              className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-vuttik-navy text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold"
            >
              Inicializar Datos
            </button>
          )}
          <button 
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-vuttik-blue text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold shadow-lg shadow-vuttik-blue/20"
          >
            <Plus size={14} className="md:size-4" />
            Nueva Categoría
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {(isAdding || isEditing) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-vuttik-gray p-4 md:p-6 rounded-2xl md:rounded-[32px] border-2 border-vuttik-blue/20 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Nombre de Categoría</label>
                  <input 
                    type="text" 
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-white border-none rounded-2xl px-6 py-4 font-bold text-vuttik-navy outline-none"
                    placeholder="Ej. Comida, Vehículos..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Icono Seleccionado</label>
                  <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4">
                    <div className="w-10 h-10 bg-vuttik-gray rounded-xl flex items-center justify-center text-vuttik-navy">
                      <CategoryIcon name={editForm.icon || ''} size={24} />
                    </div>
                    <input 
                      type="text" 
                      value={editForm.icon || ''}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      className="flex-1 bg-transparent border-none font-bold text-vuttik-navy outline-none"
                      placeholder="Nombre del icono..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Seleccionar Icono (Visual)</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 max-h-48 overflow-y-auto p-4 bg-white rounded-2xl no-scrollbar">
                  {COMMON_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, icon: iconName })}
                      className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                        editForm.icon === iconName 
                          ? 'bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/20 scale-110' 
                          : 'bg-vuttik-gray text-vuttik-navy hover:bg-gray-200'
                      }`}
                      title={iconName}
                    >
                      <CategoryIcon name={iconName} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Subcategorías Permitidas (Tipos de Transacción)</label>
                <div className="flex flex-wrap gap-3">
                  {transactionTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => toggleType(type.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        editForm.allowedTypes?.includes(type.id)
                          ? 'bg-vuttik-blue text-white shadow-md shadow-vuttik-blue/20'
                          : 'bg-white text-vuttik-navy border border-gray-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-white/20">
                <div>
                  <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Campos Base del Sistema</label>
                  <p className="text-[10px] text-vuttik-text-muted font-medium mb-4">Configura los campos estándar que toda publicación debe tener.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(editForm.systemFields || {}).map(([key, config]: [string, any]) => (
                      <div key={key} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-vuttik-navy uppercase tracking-wider">{config.label}</span>
                          {key === 'barcode' && (
                            <button 
                              onClick={() => setEditForm({
                                ...editForm,
                                systemFields: {
                                  ...editForm.systemFields,
                                  [key]: { ...config, active: !config.active }
                                }
                              })}
                              className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${config.active ? 'bg-vuttik-blue text-white' : 'bg-gray-100 text-gray-400'}`}
                            >
                              {config.active ? 'Activo' : 'Inactivo'}
                            </button>
                          )}
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${config.required ? 'bg-vuttik-blue border-vuttik-blue' : 'border-gray-200 group-hover:border-vuttik-blue'}`}>
                            {config.required && <Check size={10} className="text-white" strokeWidth={4} />}
                          </div>
                          <input 
                            type="checkbox" 
                            checked={config.required}
                            disabled={key === 'title'} // Title must always be required
                            onChange={(e) => setEditForm({
                              ...editForm,
                              systemFields: {
                                ...editForm.systemFields,
                                [key]: { ...config, required: e.target.checked }
                              }
                            })}
                            className="hidden"
                          />
                          <span className="text-[10px] font-bold text-vuttik-text-muted uppercase">Obligatorio</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-bold text-vuttik-text-muted uppercase tracking-widest">Campos Personalizados</label>
                    <p className="text-[10px] text-vuttik-text-muted font-medium">Define qué información extra debe llenar el usuario al publicar.</p>
                  </div>
                  <button 
                    onClick={addField}
                    className="flex items-center gap-2 bg-vuttik-blue/10 text-vuttik-blue px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-vuttik-blue hover:text-white transition-all"
                  >
                    <Plus size={14} /> Añadir Campo
                  </button>
                </div>
                
                <div className="space-y-4">
                  {(!editForm.fields || editForm.fields.length === 0) && (
                    <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center">
                      <LayoutGrid className="mx-auto text-gray-300 mb-3" size={32} />
                      <p className="text-xs font-bold text-vuttik-text-muted">No hay campos personalizados definidos.</p>
                    </div>
                  )}
                  {editForm.fields?.map((field) => (
                    <motion.div 
                      key={field.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4 relative group/field"
                    >
                      <button 
                        onClick={() => removeField(field.id)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg md:opacity-0 md:group-hover/field:opacity-100 transition-all hover:scale-110"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-vuttik-text-muted uppercase tracking-widest">Nombre del Campo</label>
                          <input 
                            type="text" 
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                            placeholder="Ej: Kilometraje, Marca, Material..."
                            className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-vuttik-text-muted uppercase tracking-widest">Tipo de Dato</label>
                          <select 
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                            className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                          >
                            <option value="text">Texto Corto</option>
                            <option value="number">Número</option>
                            <option value="select">Lista de Selección</option>
                          </select>
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-vuttik-text-muted uppercase tracking-widest">Opciones (Separadas por coma)</label>
                          <input 
                            type="text" 
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                            placeholder="Ej: Toyota, Honda, Ford"
                            className="w-full bg-vuttik-gray border-none rounded-xl px-4 py-3 text-[10px] font-medium outline-none focus:ring-2 focus:ring-vuttik-blue/20"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <label className="flex items-center gap-3 cursor-pointer group/check">
                          <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${field.required ? 'bg-vuttik-blue border-vuttik-blue' : 'border-gray-200 group-hover/check:border-vuttik-blue'}`}>
                            {field.required && <Check size={12} className="text-white" strokeWidth={4} />}
                          </div>
                          <input 
                            type="checkbox" 
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="hidden"
                          />
                          <span className="text-[10px] font-black text-vuttik-navy uppercase tracking-widest">Campo Obligatorio</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-vuttik-text-muted uppercase">ID: {field.id.slice(-4)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => { setIsEditing(null); setIsAdding(false); setEditForm({}); }}
                  className="px-6 py-3 text-xs font-bold text-vuttik-text-muted uppercase"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleSaveCategory(isEditing || undefined)}
                  className="px-8 py-3 bg-vuttik-navy text-white rounded-2xl text-xs font-bold flex items-center gap-2"
                >
                  <Check size={16} />
                  Guardar Categoría
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {categories.map((cat) => (
          <div key={cat.id} className="bg-white border border-gray-100 p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-vuttik-blue/30 transition-all">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-vuttik-gray text-vuttik-navy rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                <CategoryIcon name={cat.icon} size={20} className="md:size-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base md:text-lg font-black text-vuttik-navy truncate">{cat.name}</h4>
                <div className="flex flex-wrap gap-1 md:gap-2 mt-1">
                  {cat.allowedTypes.map(t => (
                    <span key={t} className="text-[8px] md:text-[10px] font-bold text-vuttik-text-muted bg-gray-50 px-1.5 md:px-2 py-0.5 rounded-md uppercase">
                      {transactionTypes.find(tt => tt.id === t)?.label || t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all justify-end border-t sm:border-t-0 border-gray-50 pt-3 sm:pt-0">
              <button 
                onClick={() => handleOpenEdit(cat)}
                className="p-2.5 md:p-3 text-vuttik-navy hover:bg-vuttik-gray rounded-xl transition-all"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => handleDeleteCategory(cat.id)}
                className="p-2.5 md:p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => {
    const handleModerationAction = async (report: any, action: 'dismiss' | 'warn' | 'ban') => {
      try {
        if (action === 'dismiss') {
          await updateDoc(doc(db, 'flaggedProducts', report.id), { status: 'dismissed' });
          await updateDoc(doc(db, 'products', report.productId), { isFlagged: false });
        } else if (action === 'warn') {
          await updateDoc(doc(db, 'flaggedProducts', report.id), { status: 'warned' });
          alert(`Usuario ${report.authorName} advertido.`);
        } else if (action === 'ban') {
          await updateDoc(doc(db, 'users', report.authorId), { isBanned: true });
          await updateDoc(doc(db, 'flaggedProducts', report.id), { status: 'banned' });
          await deleteDoc(doc(db, 'products', report.productId));
          alert(`Usuario ${report.authorName} baneado y producto eliminado.`);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'moderation');
      }
    };

    return (
      <div className="space-y-6 px-4 md:px-0">
        <div>
          <h3 className="text-xl md:text-2xl font-display font-black text-vuttik-navy">Reportes Críticos</h3>
          <p className="text-vuttik-text-muted text-xs md:text-sm">Publicaciones con más de 100 votos y 50%+ de desaprobación.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {flaggedReports.map((report) => (
            <div key={report.id} className={`bg-white border ${report.status === 'pending' ? 'border-red-200 bg-red-50/10' : 'border-gray-100'} p-6 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-6 group transition-all`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-vuttik-gray text-vuttik-navy rounded-2xl flex items-center justify-center font-black shrink-0">
                  {report.productTitle?.charAt(0)}
                </div>
                <div>
                  <h4 className="text-lg font-black text-vuttik-navy">{report.productTitle}</h4>
                  <p className="text-xs text-vuttik-text-muted font-bold uppercase tracking-widest">Autor: {report.authorName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                      report.status === 'pending' ? 'bg-red-500 text-white' : 
                      report.status === 'dismissed' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-[8px] text-vuttik-text-muted font-bold uppercase tracking-widest">
                      {new Date(report.flaggedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-red-500 uppercase">Downvotes: {report.downVotes}</span>
                  <span className="text-[10px] font-bold text-vuttik-text-muted uppercase">Total: {report.upVotes + report.downVotes}</span>
                  <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${(report.downVotes / (report.upVotes + report.downVotes)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {report.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleModerationAction(report, 'dismiss')}
                        className="p-3 bg-gray-100 text-vuttik-navy rounded-xl hover:bg-vuttik-navy hover:text-white transition-all"
                        title="Descartar"
                      >
                        <Check size={20} />
                      </button>
                      <button 
                        onClick={() => handleModerationAction(report, 'warn')}
                        className="p-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all"
                        title="Advertir"
                      >
                        <AlertCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleModerationAction(report, 'ban')}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                        title="Banear"
                      >
                        <Ban size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {flaggedReports.length === 0 && (
            <div className="py-20 text-center bg-white border border-gray-100 rounded-[40px]">
              <ShieldCheck size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-sm font-bold text-vuttik-text-muted uppercase tracking-widest">No hay reportes críticos registrados</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-32 px-4 md:px-0">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl font-bold text-sm ${
              notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 md:gap-2 bg-vuttik-gray p-1 md:p-1.5 rounded-xl md:rounded-2xl self-start max-w-full overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Resumen', icon: BarChart2 },
          { id: 'categories', label: 'Categorías', icon: LayoutGrid },
          { id: 'subcategories', label: 'Subcategorías', icon: Tag },
          { id: 'users', label: 'Usuarios', icon: UserCog },
          { id: 'subscriptions', label: 'Suscripciones', icon: CreditCard },
          { id: 'comparison', label: 'Comparador', icon: MapPin },
          { id: 'reports', label: 'Informes', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${
              activeView === tab.id 
                ? 'bg-white text-vuttik-navy shadow-sm' 
                : 'text-vuttik-text-muted hover:text-vuttik-navy'
            }`}
          >
            <tab.icon size={14} className="md:size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'categories' ? renderCategories() : 
       activeView === 'subcategories' ? renderSubcategories() : 
       activeView === 'users' ? renderUsers() : 
       activeView === 'subscriptions' ? renderSubscriptions() : 
       activeView === 'reports' ? renderReports() : (
        <>
          {/* Header */}
          <header className="bg-white border-b border-vuttik-blue/20 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-vuttik-blue p-2 rounded-xl">
                <Shield className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-vuttik-navy">Mega Guardian</h1>
                <p className="text-sm text-vuttik-blue font-medium flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Inteligencia de Mercado en Tiempo Real
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-100 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-vuttik-navy hover:border-vuttik-blue transition-all">
                <Download size={14} className="md:size-4" />
                Exportar PDF
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-vuttik-blue text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold shadow-lg shadow-vuttik-blue/20">
                Nuevo Informe
              </button>
            </div>
          </header>

          {activeView === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: 'Usuarios Activos', value: megaStats?.overview?.activeUsers || '...', trend: '+12%', icon: Users, color: 'text-vuttik-blue' },
                  { label: 'Volumen P2P', value: megaStats?.overview?.p2pVolume ? `$${(megaStats.overview.p2pVolume / 1000).toFixed(1)}k` : '...', trend: '+8%', icon: TrendingUp, color: 'text-green-600' },
                  { label: 'Nuevos Negocios', value: megaStats?.overview?.newBusinesses || '0', trend: '+24%', icon: Store, color: 'text-vuttik-navy' },
                  { label: 'Reportes Pendientes', value: megaStats?.overview?.pendingReports || '0', trend: '-5%', icon: Shield, color: 'text-orange-500' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white border border-gray-100 p-4 md:p-6 rounded-2xl md:rounded-[32px] shadow-sm">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl bg-gray-50 ${stat.color}`}>
                        <stat.icon size={20} className="md:size-6" />
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold flex items-center gap-1 ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                        {stat.trend}
                        {stat.trend.startsWith('+') ? <ArrowUpRight size={12} className="md:size-3.5" /> : <ArrowDownRight size={12} className="md:size-3.5" />}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-sm font-bold text-vuttik-text-muted uppercase tracking-wider">{stat.label}</p>
                    <p className="text-xl md:text-3xl font-display font-black text-vuttik-navy">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Special Functions Quick Access */}
              <div className="bg-vuttik-navy rounded-[40px] p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldAlert className="text-vuttik-blue" size={24} />
                  <h3 className="text-xl font-display font-black">Funciones Especiales Mega Guardian</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: 'Auditoría de Sistema', desc: 'Revisa logs y acciones críticas', icon: ShieldCheck },
                    { title: 'Gestión de Suscripciones', desc: 'Configura planes y precios', icon: CreditCard },
                    { title: 'Control de Categorías', desc: 'Estructura el mercado global', icon: LayoutGrid },
                  ].map((tool, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-all cursor-pointer group">
                      <tool.icon className="text-vuttik-blue mb-4 group-hover:scale-110 transition-transform" size={32} />
                      <h4 className="font-bold mb-1">{tool.title}</h4>
                      <p className="text-xs text-white/40">{tool.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Trends Chart */}
                <div className="lg:col-span-2 bg-white border border-gray-100 p-4 md:p-8 rounded-2xl md:rounded-[40px] shadow-sm">
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                    <h3 className="text-lg md:text-xl font-display font-black text-vuttik-navy">Tendencias</h3>
                    <select className="bg-vuttik-gray border-none rounded-lg md:rounded-xl px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold outline-none">
                      <option>Últimos 7 días</option>
                      <option>Último mes</option>
                    </select>
                  </div>
                  <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends.length > 0 ? trends : DATA_TRENDS}>
                        <defs>
                          <linearGradient id="colorBusquedas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }}
                        />
                        <Area type="monotone" dataKey="busquedas" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorBusquedas)" />
                        <Area type="monotone" dataKey="ventas" stroke="#002B49" strokeWidth={2} fillOpacity={0} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories Distribution */}
                <div className="bg-white border border-gray-100 p-4 md:p-8 rounded-2xl md:rounded-[40px] shadow-sm">
                  <h3 className="text-lg md:text-xl font-display font-black text-vuttik-navy mb-6 md:mb-8">Distribución</h3>
                  <div className="h-[200px] md:h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={megaStats?.distribution || CATEGORY_DATA}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {(megaStats?.distribution || CATEGORY_DATA).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 md:space-y-3 mt-4">
                    {(megaStats?.distribution || CATEGORY_DATA).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                          <span className="text-xs md:text-sm font-bold text-vuttik-navy">{item.name}</span>
                        </div>
                        <span className="text-xs md:text-sm font-bold text-vuttik-text-muted">{item.value} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'comparison' && (
            <div className="bg-vuttik-navy rounded-[48px] p-10 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-vuttik-blue/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1">
                  <h3 className="text-3xl font-display font-black mb-4">Comparador de Inventarios</h3>
                  <p className="text-white/60 text-lg mb-8 max-w-lg">
                    Compara precios y demanda entre dos tiendas usando solo su dirección. Analiza la competencia en tiempo real.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tienda A (Dirección)</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                        <input type="text" placeholder="Ej. Av. Churchill #123" className="w-full bg-white/10 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-vuttik-blue transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tienda B (Dirección)</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-blue" />
                        <input type="text" placeholder="Ej. Av. Lincoln #456" className="w-full bg-white/10 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-vuttik-blue transition-all" />
                      </div>
                    </div>
                  </div>
                  <button className="mt-8 bg-vuttik-blue text-white font-black px-10 py-5 rounded-3xl shadow-2xl shadow-vuttik-blue/40 hover:scale-105 transition-all">
                    Generar Comparativa
                  </button>
                </div>
                <div className="w-full lg:w-1/3 bg-white/5 backdrop-blur-xl rounded-[40px] p-8 border border-white/10">
                  <h4 className="text-sm font-bold mb-6 text-vuttik-blue uppercase tracking-widest">Métricas de Comparación</h4>
                  <div className="space-y-6">
                    {[
                      { label: 'Diferencia de Precios', value: '8.4%', desc: 'Tienda A es más barata' },
                      { label: 'Semejanza de Inventario', value: '92%', desc: 'Productos en común' },
                      { label: 'Popularidad Relativa', value: '1.2x', desc: 'Tienda B tiene más tráfico' },
                    ].map((m, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-bold text-white/60">{m.label}</span>
                          <span className="text-xl font-black text-white">{m.value}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-vuttik-blue rounded-full" style={{ width: m.value }}></div>
                        </div>
                        <p className="text-[10px] text-white/40 mt-1">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

