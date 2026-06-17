import re

with open('src/pos/pages/BusinessSelector.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    \"import { Plus, Store, Loader2, LogOut, Hash, Package, ShoppingBag, ChevronRight, X, AlertCircle, User, TrendingUp, DollarSign, MapPin, Briefcase } from 'lucide-react';\",
    \"import { Plus, Store, Loader2, LogOut, Hash, Package, ShoppingBag, ChevronRight, X, AlertCircle, User, TrendingUp, DollarSign, MapPin, Briefcase, Settings, Edit2, Send, Trash2 } from 'lucide-react';\"
)

state_vars = \"\"\"  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingBiz, setEditingBiz] = useState<BizSummary | null>(null);
  const [transferBiz, setTransferBiz] = useState<BizSummary | null>(null);
  const [deleteBiz, setDeleteBiz] = useState<BizSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);\"\"\"

content = content.replace(
    \"  const [creating, setCreating] = useState(false);\\n  const [error, setError] = useState('');\",
    state_vars
)

handle_funcs = \"\"\"  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editingBiz) return;
    setIsProcessing(true);
    setError('');
    try {
      await ApiService.updateBusinessName(editingBiz.id, editName.trim());
      setEditingBiz(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar negocio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmail.trim() || !transferBiz) return;
    setIsProcessing(true);
    setError('');
    try {
      await ApiService.transferBusiness(transferBiz.id, transferEmail.trim());
      setTransferBiz(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al transferir negocio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteBiz) return;
    setIsProcessing(true);
    setError('');
    try {
      await ApiService.deleteBusiness(deleteBiz.id);
      setDeleteBiz(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar negocio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {\"\"\"

content = content.replace(
    \"  const handleLogout = async () => {\",
    handle_funcs
)

card_menu = \"\"\"                className=\"group relative bg-white border border-gray-100 hover:border-blue-200 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 flex flex-col min-h-[220px]\"
              >
                {/* Options Menu */}
                <div className=\"absolute top-4 right-4 z-10\">
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === biz.id ? null : biz.id); }} className=\"p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors\">
                    <Settings size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {activeMenu === biz.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className=\"absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-2xl p-2 z-20\"
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setEditingBiz(biz); setEditName(biz.nombre); }}
                          className=\"w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-bold\"
                        >
                          <Edit2 size={14} className=\"text-blue-500\" />
                          Editar Nombre
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setTransferBiz(biz); setTransferEmail(''); }}
                          className=\"w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-bold mt-1\"
                        >
                          <Send size={14} className=\"text-amber-500\" />
                          Transferir
                        </button>
                        <div className=\"h-px bg-gray-100 my-1\"></div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setDeleteBiz(biz); }}
                          className=\"w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold\"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Business icon + name */}
\"\"\"

content = content.replace(
    \"\"\"                className=\"group relative bg-white border border-gray-100 hover:border-blue-200 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 flex flex-col min-h-[220px]\"
              >
                {/* Business icon + name */}
\"\"\",
    card_menu
)

modals = \"\"\"      </AnimatePresence>

      {/* Edit Business Name Modal */}
      <AnimatePresence>
        {editingBiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className=\"fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50\"
            onClick={e => { if (e.target === e.currentTarget) setEditingBiz(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className=\"bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100\"
            >
              <div className=\"flex items-center justify-between mb-6\">
                <h2 className=\"text-xl font-black text-gray-900\">Editar Nombre</h2>
                <button onClick={() => setEditingBiz(null)} className=\"text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full\">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className=\"space-y-5\">
                <div className=\"relative\">
                  <Store className=\"absolute left-4 top-1/2 -translate-y-1/2 text-gray-400\" size={18} />
                  <input
                    autoFocus required type=\"text\" value={editName} onChange={e => setEditName(e.target.value)}
                    placeholder=\"Nombre del negocio\"
                    className=\"w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold\"
                  />
                </div>
                <div className=\"flex gap-3 pt-2\">
                  <button type=\"button\" onClick={() => setEditingBiz(null)} className=\"flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 font-black transition-all text-xs uppercase tracking-widest\">
                    Cancelar
                  </button>
                  <button type=\"submit\" disabled={isProcessing || !editName.trim()} className=\"flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-blue-100\">
                    {isProcessing ? <Loader2 className=\"animate-spin\" size={16} /> : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Business Modal */}
      <AnimatePresence>
        {transferBiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className=\"fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50\"
            onClick={e => { if (e.target === e.currentTarget) setTransferBiz(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className=\"bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100\"
            >
              <div className=\"flex items-center justify-between mb-6\">
                <h2 className=\"text-xl font-black text-gray-900\">Transferir Negocio</h2>
                <button onClick={() => setTransferBiz(null)} className=\"text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full\">
                  <X size={20} />
                </button>
              </div>
              <p className=\"text-sm text-gray-600 font-bold mb-4\">
                Vas a transferir <span className=\"text-blue-600\">{transferBiz.nombre}</span>. Esta acción es irreversible y perderás acceso inmediato.
              </p>
              <form onSubmit={handleTransferSubmit} className=\"space-y-5\">
                <div className=\"relative\">
                  <User className=\"absolute left-4 top-1/2 -translate-y-1/2 text-gray-400\" size={18} />
                  <input
                    autoFocus required type=\"email\" value={transferEmail} onChange={e => setTransferEmail(e.target.value)}
                    placeholder=\"Correo electrónico del nuevo dueño\"
                    className=\"w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-sm font-bold\"
                  />
                </div>
                <div className=\"flex gap-3 pt-2\">
                  <button type=\"button\" onClick={() => setTransferBiz(null)} className=\"flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 font-black transition-all text-xs uppercase tracking-widest\">
                    Cancelar
                  </button>
                  <button type=\"submit\" disabled={isProcessing || !transferEmail.trim()} className=\"flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-amber-100\">
                    {isProcessing ? <Loader2 className=\"animate-spin\" size={16} /> : 'Transferir'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Business Modal */}
      <AnimatePresence>
        {deleteBiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className=\"fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50\"
            onClick={e => { if (e.target === e.currentTarget) setDeleteBiz(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className=\"bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100\"
            >
              <div className=\"flex items-center justify-between mb-6\">
                <h2 className=\"text-xl font-black text-gray-900\">Eliminar Negocio</h2>
                <button onClick={() => setDeleteBiz(null)} className=\"text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full\">
                  <X size={20} />
                </button>
              </div>
              <div className=\"mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3\">
                <AlertCircle className=\"text-red-500 shrink-0 mt-0.5\" size={20} />
                <p className=\"text-sm text-red-700 font-bold leading-relaxed\">
                  ¿Estás seguro de eliminar <span className=\"font-black\">{deleteBiz.nombre}</span>? Perderás todos los productos, ventas y empleados asociados permanentemente.
                </p>
              </div>
              <div className=\"flex gap-3\">
                <button onClick={() => setDeleteBiz(null)} className=\"flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 font-black transition-all text-xs uppercase tracking-widest\">
                  Cancelar
                </button>
                <button onClick={handleDeleteSubmit} disabled={isProcessing} className=\"flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-red-100\">
                  {isProcessing ? <Loader2 className=\"animate-spin\" size={16} /> : 'Sí, Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>\"\"\"

content = content.replace(
    \"      </AnimatePresence>\\n    </div>\",
    modals
)

with open('src/pos/pages/BusinessSelector.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
