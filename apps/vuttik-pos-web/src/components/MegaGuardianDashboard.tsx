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
  UserCog, Ban, Unlock, AlertCircle, ClipboardList
} from 'lucide-react';
import AuditLog from './AuditLog';
import { api } from '../lib/api';

// Removed sendPasswordResetEmail import

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
  isService?: boolean;
  requiresEan?: boolean;
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
  const [activeView, setActiveView] = useState<'overview' | 'categories' | 'subcategories' | 'users' | 'reports' | 'subscriptions' | 'auditoria' | 'business_requests'>('overview');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  const [plans, setPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<any | null>(null);
  const [fallbackPlanId, setFallbackPlanId] = useState<string>('');
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
  const [businessRequests, setBusinessRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, txTypes, usrs, pls, bReqs] = await Promise.all([
          api.getCategories(),
          api.getTransactionTypes(),
          api.getAllUsers(),
          api.getSubscriptionPlans()
        ]);
        setCategories(cats);
        setTransactionTypes(txTypes);
        setUsers(usrs);
        setPlans(pls);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const reloadData = async () => {
    try {
      const [cats, txTypes, usrs, pls] = await Promise.all([
        api.getCategories(),
        api.getTransactionTypes(),
        api.getAllUsers(),
        api.getSubscriptionPlans()
      ]);
      setCategories(cats);
      setTransactionTypes(txTypes);
      setUsers(usrs);
      setPlans(pls);
    } catch (err) {
      console.error('Error reloading data:', err);
    }
  };

  useEffect(() => {
    if (activeView !== 'reports') return;
    const loadReports = async () => {
      try {
        const reports = await api.getFlaggedProducts();
        setFlaggedReports(reports);
      } catch (err) {
        console.error('Error loading reports:', err);
      }
    };
    loadReports();
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
    if (!editForm.name?.trim()) {
      setNotification({ message: 'El nombre de la categoría es obligatorio', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    try {
      const payload: any = {
        name: editForm.name.trim(),
        icon: editForm.icon || 'Tag',
        order: (editForm as any).order || 0,
        allowedTypes: (editForm as any).allowedTypes || [],
        fields: (editForm as any).fields || [],
        systemFields: (editForm as any).systemFields || {},
        isService: editForm.isService || false,
        requiresEan: editForm.requiresEan || false,
      };
      if (id) payload.id = id; // only include id when editing
      
      await api.saveCategory(payload);
      
      if (id) {
        setIsEditing(null);
      } else {
        setIsAdding(false);
      }
      setEditForm({});
      setNotification({ message: 'Categoría guardada con éxito', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      await reloadData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      setNotification({ message: `Error: ${error?.message || 'No se pudo guardar'}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
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
      await api.deleteCategory(id);
    } catch (error) {
      console.error('Error deleting category:', error);
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
      await api.saveCategory(cat);
    }
  };

  const handleSaveType = async (id?: string) => {
    if (!typeForm.label?.trim()) {
      setNotification({ message: 'El nombre del tipo es obligatorio', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    try {
      const payload: any = {
        label: typeForm.label.trim(),
        icon: typeForm.icon || 'Tag',
        active: typeForm.active !== undefined ? typeForm.active : true,
      };
      if (id) payload.id = id; // only include id when editing

      await api.saveTransactionType(payload);
      
      if (id) {
        setIsEditingType(null);
      } else {
        setIsAddingType(false);
      }
      setTypeForm({});
      setNotification({ message: 'Tipo guardado con éxito', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      await reloadData();
    } catch (error: any) {
      console.error('Error saving transaction type:', error);
      setNotification({ message: `Error: ${error?.message || 'No se pudo guardar'}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este tipo de transacción?')) return;
    try {
      await api.deleteTransactionType(id);
    } catch (error) {
      console.error('Error deleting transaction type:', error);
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
      await api.saveTransactionType(type);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const userToUpdate = users.find(u => u.id === userId);
      if (userToUpdate) {
        await api.saveUser({ ...userToUpdate, role: newRole, uid: userId });
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        // Currently banned -> unban
        await api.unbanUser(userId, 'mega_guardian');
        setNotification({ message: 'Usuario desbaneado exitosamente.', type: 'success' });
      } else {
        // Not banned -> ban
        await api.banUser(userId, 'mega_guardian');
        setNotification({ message: 'Usuario baneado exitosamente.', type: 'success' });
      }
      setUsers(users.map(u => u.id === userId ? { ...u, isBanned: !currentStatus } : u));
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error toggling ban:', error);
      setNotification({ message: 'Error al cambiar el estado del usuario.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    try {
      await api.verifyUser(userId, !currentStatus, 'mega_guardian');
      setUsers(users.map(u => u.id === userId ? { ...u, isVerified: !currentStatus } : u));
      setNotification({ message: !currentStatus ? 'Usuario verificado exitosamente.' : 'Verificación removida exitosamente.', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error toggling verification:', error);
      setNotification({ message: 'Error al cambiar la verificación del usuario.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      alert(`Simulando envío de correo de restablecimiento a ${email} en entorno local.`);
    } catch (error) {
      console.error('Error sending reset email:', error);
      setNotification({ message: 'Error al enviar el correo de restablecimiento.', type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    try {
      await api.saveSubscriptionPlan(editingPlan);
      setEditingPlan(null);
      setNotification({ message: 'Plan guardado con éxito', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      await reloadData();
    } catch (error) {
      console.error('Error saving plan:', error);
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
                    {u.isVerified && <ShieldCheck size={16} className="text-vuttik-blue" title="Verificado por Mega Guardian" />}
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
                    onClick={() => handleToggleVerify(u.id, !!u.isVerified)}
                    className={`p-2.5 md:p-3 hover:bg-vuttik-blue/10 rounded-xl transition-all ${u.isVerified ? 'text-vuttik-blue' : 'text-gray-400'}`}
                    title={u.isVerified ? "Quitar Verificación" : "Verificar Usuario"}
                  >
                    <ShieldCheck size={18} />
                  </button>
                  <button 
                    onClick={() => handleResetPassword(u.email)}
                    className="p-2.5 md:p-3 text-vuttik-blue hover:bg-vuttik-blue/10 rounded-xl transition-all"
                    title="Resetear Contraseña"
                  >
                    <Mail size={18} />
                  </button>
                  <button 
                    onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                    className={`p-2.5 md:p-3 rounded-xl transition-all ${u.isBanned ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'text-red-400 hover:bg-red-50'}`}
                    title={u.isBanned ? 'Desbanear Usuario' : 'Banear Usuario'}
                  >
                    <Ban size={18} />
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
          onClick={() => setEditingPlan({ name: '', price: 0, features: [], is_hidden: false, is_coming_soon: false, is_recommended: false, order_index: 0 })}
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
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-display font-black text-vuttik-navy">{plan.name}</h3>
                  {!plan.is_hidden && !plan.is_coming_soon && <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Público</span>}
                  {!!plan.is_hidden && <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Borrador / Oculto</span>}
                  {!!plan.is_coming_soon && <span className="bg-yellow-100 text-yellow-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Próximamente</span>}
                  {!!plan.is_recommended && <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Recomendado</span>}
                </div>
                <p className="text-vuttik-blue font-black text-3xl mt-1">${plan.price}<span className="text-sm text-vuttik-text-muted font-bold">/mes</span></p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingPlan(plan)}
                  className="p-3 bg-vuttik-gray text-vuttik-navy rounded-2xl hover:bg-vuttik-blue hover:text-white transition-all"
                  title="Editar Plan"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setDeletingPlan(plan)}
                  className="p-3 bg-vuttik-gray text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                  title="Eliminar Plan"
                >
                  <Trash2 size={18} />
                </button>
              </div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-0">
          <div className="absolute inset-0 bg-vuttik-navy/60 backdrop-blur-sm" onClick={() => setEditingPlan(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md md:max-w-none md:w-full md:h-full bg-white rounded-[40px] md:rounded-none p-8 md:p-16 shadow-2xl flex flex-col"
          >
            <h3 className="text-2xl md:text-4xl font-display font-black text-vuttik-navy mb-6 md:mb-10">{editingPlan.id ? 'Editar Plan' : 'Nuevo Plan'}</h3>
            
            <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-12 mt-2">
              <div className="flex flex-col gap-4 md:gap-8 md:w-1/3">
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
                  <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest mb-1 block">Orden de Visualización</label>
                  <input 
                    type="number" 
                    value={editingPlan.order_index ?? 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, order_index: parseInt(e.target.value) || 0 })}
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 outline-none font-bold"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="md:w-2/3 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest block">Funciones del Plan</label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 flex-1">
                  {(() => {
                    const baseFeatures = [
                      { id: 'market', label: 'Marketplace' },
                      { id: 'social', label: 'Red Social' },
                      { id: 'business_dash', label: 'Panel de Negocios' },
                      { id: 'admin_dash', label: 'Panel de Admin' },
                      { id: 'analytics', label: 'Analíticas Avanzadas' },
                      { id: 'premium_support', label: 'Soporte Premium' },
                      { id: 'promotions', label: 'Crear Promociones' }
                    ];

                    const dynamicFeatures = [...baseFeatures];
                    // Derive custom features from all existing plans
                    plans.forEach(p => {
                      (p.features || []).forEach(f => {
                        if (!dynamicFeatures.find(df => df.id === f)) {
                          dynamicFeatures.push({ id: f, label: f });
                        }
                      });
                    });
                    // Also include any new features added to the currently editing plan
                    (editingPlan.features || []).forEach(f => {
                       if (!dynamicFeatures.find(df => df.id === f)) {
                          dynamicFeatures.push({ id: f, label: f });
                       }
                    });

                    return dynamicFeatures.map(feature => {
                      const isSelected = editingPlan.features.includes(feature.id);
                      return (
                        <label key={feature.id} className="flex items-center justify-between p-4 bg-vuttik-gray/50 rounded-2xl cursor-pointer hover:bg-vuttik-gray transition-colors h-16">
                          <span className="text-sm md:text-base font-bold text-vuttik-navy truncate pr-2">{feature.label}</span>
                          <div className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${isSelected ? 'bg-vuttik-blue' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${isSelected ? 'left-6' : 'left-1'}`} />
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => {
                              const newFeatures = isSelected 
                                ? editingPlan.features.filter(f => f !== feature.id)
                                : [...editingPlan.features, feature.id];
                              setEditingPlan({ ...editingPlan, features: newFeatures });
                            }}
                          />
                        </label>
                      );
                    });
                  })()}
                  
                  {/* New Custom Feature Input */}
                  <div className="flex items-center gap-2 p-2 bg-vuttik-gray/30 rounded-2xl h-16 border border-dashed border-vuttik-text-muted/30">
                    <input 
                      type="text"
                      placeholder="Nueva función..."
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-vuttik-navy px-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                           e.preventDefault();
                           const val = e.currentTarget.value.trim();
                           if (!editingPlan.features.includes(val)) {
                             setEditingPlan({ ...editingPlan, features: [...editingPlan.features, val] });
                           }
                           e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button 
                      type="button"
                      className="w-8 h-8 rounded-full bg-vuttik-blue text-white flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform"
                      onClick={(e) => {
                         const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                         const val = input.value.trim();
                         if (val && !editingPlan.features.includes(val)) {
                            setEditingPlan({ ...editingPlan, features: [...editingPlan.features, val] });
                            input.value = '';
                         }
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex flex-col md:flex-row gap-4">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-2xl flex-1">
                    <div className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${!editingPlan.is_hidden ? 'bg-vuttik-blue' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${!editingPlan.is_hidden ? 'left-6' : 'left-1'}`} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-vuttik-navy block">Público</span>
                      <span className="text-[10px] text-vuttik-text-muted">Visible para todos</span>
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={!editingPlan.is_hidden}
                      onChange={(e) => setEditingPlan({ ...editingPlan, is_hidden: !e.target.checked })}
                    />
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-2xl flex-1">
                    <div className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${editingPlan.is_coming_soon ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${editingPlan.is_coming_soon ? 'left-6' : 'left-1'}`} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-vuttik-navy block">Próximamente</span>
                      <span className="text-[10px] text-vuttik-text-muted">Visible pero sin botón de compra</span>
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={editingPlan.is_coming_soon}
                      onChange={(e) => setEditingPlan({ ...editingPlan, is_coming_soon: e.target.checked })}
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-bold text-vuttik-navy text-sm">Plan Recomendado</p>
                      <p className="text-xs text-vuttik-text-muted">Destaca este plan con una etiqueta de "Recomendado" para los usuarios.</p>
                    </div>
                    <div className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${editingPlan.is_recommended ? 'bg-orange-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${editingPlan.is_recommended ? 'left-6' : 'left-1'}`} />
                      <input 
                        type="checkbox" 
                        className="opacity-0 w-0 h-0"
                        checked={editingPlan.is_recommended}
                        onChange={(e) => setEditingPlan({ ...editingPlan, is_recommended: e.target.checked })}
                      />
                    </div>
                  </label>
                </div>
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

      {deletingPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vuttik-navy/60 backdrop-blur-sm" onClick={() => setDeletingPlan(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl flex flex-col"
          >
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-display font-black text-vuttik-navy text-center mb-2">Eliminar Plan: {deletingPlan.name}</h3>
            <p className="text-sm text-vuttik-text-muted text-center mb-6">
              Este plan será eliminado. Selecciona un plan de respaldo al que migrarán todos los usuarios actuales (con 2 meses de gracia).
            </p>

            <label className="text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest mb-2 block">Plan de Respaldo</label>
            <select
              value={fallbackPlanId}
              onChange={(e) => setFallbackPlanId(e.target.value)}
              className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 outline-none font-bold text-vuttik-navy appearance-none"
            >
              <option value="">Selecciona un plan...</option>
              {plans.filter(p => p.id !== deletingPlan.id).map(p => (
                <option key={p.id} value={p.id}>{p.name} (${p.price}/mes)</option>
              ))}
            </select>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => { setDeletingPlan(null); setFallbackPlanId(''); }}
                className="flex-1 py-4 text-sm font-black text-vuttik-text-muted uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (!fallbackPlanId) return alert('Debes seleccionar un plan de respaldo para migrar a los usuarios.');
                  try {
                    await api.deleteSubscriptionPlan(deletingPlan.id, fallbackPlanId);
                    setPlans(plans.filter(p => p.id !== deletingPlan.id));
                    setDeletingPlan(null);
                    setFallbackPlanId('');
                    alert('Plan eliminado y usuarios migrados con éxito.');
                  } catch(e) {
                    alert('Error eliminando plan');
                  }
                }}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
              >
                Eliminar Plan
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-white rounded-2xl border border-gray-100">
                  <div className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${editForm.requiresEan ? 'bg-vuttik-blue' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${editForm.requiresEan ? 'left-6' : 'left-1'}`} />
                  </div>
                  <div>
                    <span className="text-[12px] font-bold text-vuttik-navy block">Requiere EAN (Obligatorio)</span>
                    <span className="text-[10px] text-vuttik-text-muted">Si está activo, los productos publicados aquí exigirán código de barras.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={!!editForm.requiresEan}
                    onChange={(e) => setEditForm({ ...editForm, requiresEan: e.target.checked })}
                  />
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-4 bg-white rounded-2xl border border-gray-100">
                  <div className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${editForm.isService ? 'bg-vuttik-blue' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${editForm.isService ? 'left-6' : 'left-1'}`} />
                  </div>
                  <div>
                    <span className="text-[12px] font-bold text-vuttik-navy block">Es un Servicio (Sin inventario físico)</span>
                    <span className="text-[10px] text-vuttik-text-muted">Actívalo para servicios profesionales, alquileres o similares.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={!!editForm.isService}
                    onChange={(e) => setEditForm({ ...editForm, isService: e.target.checked })}
                  />
                </label>
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
          await api.updateFlaggedReport(report.id, 'dismissed', 'mega_guardian');
        } else if (action === 'warn') {
          await api.updateFlaggedReport(report.id, 'warned', 'mega_guardian');
          alert(`Usuario ${report.authorName} advertido.`);
        } else if (action === 'ban') {
          await api.updateFlaggedReport(report.id, 'banned', 'mega_guardian');
          // Note: Full ban/delete user logic would need a specific API endpoint.
          // Fallback to local API flagged status update for now.
          alert(`Usuario ${report.authorName} baneado y producto marcado como baneado.`);
        }
        setFlaggedReports(flaggedReports.filter((r: any) => r.id !== report.id));
      } catch (error) {
        console.error('Error during moderation action:', error);
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
          { id: 'reports', label: 'Informes', icon: Shield },
          { id: 'auditoria', label: 'Actividad Global', icon: ClipboardList },
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
       activeView === 'reports' ? renderReports() : 
       activeView === 'auditoria' ? <AuditLog /> : (
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
                    { title: 'Auditoría de Sistema', desc: 'Revisa logs y acciones críticas', icon: ShieldCheck, view: 'auditoria' },
                    { title: 'Gestión de Suscripciones', desc: 'Configura planes y precios', icon: CreditCard, view: 'subscriptions' },
                    { title: 'Control de Categorías', desc: 'Estructura el mercado global', icon: LayoutGrid, view: 'categories' },
                  ].map((tool, i) => (
                    <div key={i} onClick={() => setActiveView(tool.view as any)} className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-all cursor-pointer group">
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
        </>
      )}
    </div>
  );
}

