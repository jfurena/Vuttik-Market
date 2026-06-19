import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, User, Lock, Eye, EyeOff, Trash2, Edit3, X, AlertCircle, CheckCircle2, Loader2, Hash, Copy } from 'lucide-react';

interface Employee {
  id: string;
  nombre: string;
  username: string;
  rol: string;
  estado: string;
  fecha_creacion: string;
}

interface EmployeeForm {
  nombre: string;
  username: string;
  password: string;
  rol: string;
}

const EMPTY_FORM: EmployeeForm = { nombre: '', username: '', password: '', rol: 'cajero' };

export default function EmployeeManager() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setEmployees(await ApiService.getEmployees()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowPassword(false); setError(''); setShowForm(true); };
  const openEdit = (emp: Employee) => { setEditing(emp); setForm({ nombre: emp.nombre, username: emp.username, password: '', rol: emp.rol }); setShowPassword(false); setError(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.username.trim()) { setError('Nombre y usuario son obligatorios.'); return; }
    if (!editing && form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updateData: any = { nombre: form.nombre, username: form.username, rol: form.rol };
        if (form.password.length >= 6) updateData.password = form.password;
        await ApiService.updateEmployee(editing.id, updateData);
        setSuccess('Empleado actualizado correctamente.');
      } else {
        await ApiService.addEmployee({ nombre: form.nombre, username: form.username, password: form.password, rol: form.rol });
        setSuccess('Empleado creado correctamente.');
      }
      await load();
      closeForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(`¿Eliminar al empleado ${emp.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await ApiService.deleteEmployee(emp.id);
      setSuccess('Empleado eliminado.');
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar.');
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    const nuevoEstado = emp.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await ApiService.updateEmployee(emp.id, { estado: nuevoEstado });
      await load();
    } catch (err: any) { setError(err.message); }
  };

  const copyCode = () => {
    if (profile?.business_codigo) {
      navigator.clipboard.writeText(profile.business_codigo);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div id="employees-main-view" className="space-y-6">
      {/* Business Code Banner */}
      {profile?.business_codigo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-3xl p-6 flex items-center gap-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Hash className="text-blue-400" size={22} />
          </div>
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-bold">Código del Negocio para Empleados</p>
            <p className="text-white text-3xl font-black font-mono tracking-widest mt-1">{profile.business_codigo}</p>
            <p className="text-slate-500 text-xs mt-1">Comparte este código con tus empleados para que puedan iniciar sesión</p>
          </div>
          <button onClick={copyCode} className="flex items-center gap-2 px-5 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/20 rounded-2xl text-blue-300 font-bold text-sm transition-all">
            {copiedCode ? <><CheckCircle2 size={16} />¡Copiado!</> : <><Copy size={16} />Copiar</>}
          </button>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Gestión de Empleados</h2>
          <p className="text-gray-500 text-sm mt-1">{employees.length} empleado{employees.length !== 1 ? 's' : ''} registrado{employees.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
        >
          <Plus size={18} />
          Agregar Empleado
        </button>
      </div>

      {/* Success / Error */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-2xl text-sm flex items-center gap-3">
            <CheckCircle2 size={16} /> {success}
          </motion.div>
        )}
        {error && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-2xl text-sm flex items-center gap-3">
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-500" size={28} /></div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold">Aún no tienes empleados registrados</p>
          <p className="text-sm mt-1">Agrega tu primer empleado para que pueda acceder al sistema</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {employees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-gray-100 rounded-3xl p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${emp.estado === 'activo' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                <User className={emp.estado === 'activo' ? 'text-emerald-600' : 'text-gray-400'} size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-gray-900">{emp.nombre}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${emp.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {emp.estado}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mt-0.5 font-mono">@{emp.username}</p>
                <p className="text-gray-400 text-xs mt-0.5 capitalize">{emp.rol}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleToggleStatus(emp)} className={`p-2.5 rounded-xl transition-colors text-xs font-bold ${emp.estado === 'activo' ? 'bg-orange-50 text-orange-500 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                  {emp.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => openEdit(emp)} className="p-2.5 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(emp)} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={e => { if (e.target === e.currentTarget) closeForm(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">{editing ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-2xl text-sm flex items-center gap-2 mb-5">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Nombre completo" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-400 text-sm font-medium transition-all" />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">@</span>
                  <input type="text" placeholder="Nombre de usuario (sin espacios)" value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value.replace(/\s/g, '').toLowerCase() })}
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-400 text-sm font-medium font-mono transition-all" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type={showPassword ? 'text' : 'password'} placeholder={editing ? 'Nueva contraseña (dejar vacío = no cambiar)' : 'Contraseña (mín. 6 caracteres)'}
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-11 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-400 text-sm font-medium transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Rol</label>
                  <div className="flex gap-3">
                    {(['cajero', 'supervisor'] as const).map(r => (
                      <button key={r} type="button" onClick={() => setForm({ ...form, rol: r })}
                        className={`flex-1 py-3 rounded-2xl border-2 font-bold text-sm capitalize transition-all ${form.rol === r ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForm} className="flex-1 py-4 rounded-2xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-all text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 text-sm">
                    {saving ? <Loader2 className="animate-spin" size={16} /> : editing ? 'Guardar Cambios' : 'Crear Empleado'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
