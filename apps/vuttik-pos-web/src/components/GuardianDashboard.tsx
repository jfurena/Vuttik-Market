import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, AlertCircle, Clock, Search, 
  Check, X, ShieldCheck,
  MessageSquare, User, Eye, Trash2, Ban, ShieldAlert, Activity, GitPullRequest, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
interface Report {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: string;
  target_title: string;
  author_id: string;
  author_name: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_username?: string;
  reporter_name?: string;
  reporter_strikes?: number;
  reporter_photo?: string;
}

interface AuditLog {
  id: number;
  user_id: string;
  display_name: string;
  photo_url: string;
  action: string;
  target_id: string;
  target_type: string;
  metadata: string;
  timestamp: string;
}

interface CategoryProposal {
  id: string;
  name: string;
  suggested_by_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  upVotes: number;
  downVotes: number;
  totalGuardians: number;
  myVote: 'up' | 'down' | null;
}

export default function GuardianDashboard({ onViewProduct }: { onViewProduct?: (id: string) => void }) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [proposals, setProposals] = useState<CategoryProposal[]>([]);
  const [activeTab, setActiveTab] = useState<'flagged' | 'audit' | 'proposals'>('flagged');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState('');

  const loadData = async () => {
    try {
      const [allReports, allLogs, allProposals] = await Promise.all([
        api.getReports(),
        api.getAuditLogs(),
        api.getCategoryProposals(currentUser?.uid)
      ]);
      setReports(allReports);
      setAuditLogs(allLogs);
      setProposals(allProposals);
    } catch (error) {
      console.error('Error loading Guardian data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleModerationAction = async (report: Report, action: 'dismiss' | 'delete_post' | 'ban') => {
    const guardianId = currentUser?.uid || 'guardian';
    try {
      if (action === 'dismiss') {
        await api.updateReportStatus(report.id, 'dismissed', guardianId);
        setAlertMessage('Reporte descartado.');
      } else if (action === 'delete_post') {
        if (report.target_type !== 'post' && report.target_type !== 'product') {
          setAlertMessage('Este reporte no es sobre una publicación.');
          return;
        }
        if (!window.confirm(`¿Estás seguro de que deseas eliminar la publicación "${report.target_title}"?`)) return;
        
        if (report.target_type === 'product') {
          await api.deleteProduct(report.target_id, 'guardian', true);
        } else {
          await api.deletePost(report.target_id, 'guardian', true);
        }
        await api.updateReportStatus(report.id, 'resolved', guardianId);
        setAlertMessage(`Publicación eliminada correctamente.`);
      } else if (action === 'ban') {
        if (!report.author_id) {
          setAlertMessage('No se puede banear porque no hay un autor asociado.');
          return;
        }
        const reason = prompt(`Indica el motivo del baneo permanente para ${report.author_name}:`);
        if (reason === null) return;
        if (!window.confirm(`¿Estás seguro de que deseas banear a ${report.author_name}? Esta acción es irreversible.`)) return;
        await api.banUser(report.author_id, guardianId);
        await api.updateReportStatus(report.id, 'resolved', guardianId);
        setAlertMessage(`Usuario ${report.author_name} baneado correctamente.`);
      }
      await loadData();
    } catch (error) {
      console.error('Error in moderation action:', error);
      setAlertMessage('Error al ejecutar la acción. Intenta de nuevo.');
    }
  };

  const handleReporterAction = async (report: Report, action: 'strike' | 'ban') => {
    const guardianId = currentUser?.uid || 'guardian';
    try {
      if (action === 'strike') {
        if (!window.confirm(`¿Dar un strike a @${report.reporter_username || 'usuario'} por abuso del sistema de reportes?`)) return;
        const res = await api.issueStrike(report.reporter_id, guardianId);
        setAlertMessage(`Strike aplicado. El usuario ahora tiene ${res.strikes} strike(s).`);
      } else if (action === 'ban') {
        const reason = prompt(`Indica el motivo del baneo permanente para @${report.reporter_username || 'usuario'}:`);
        if (reason === null) return;
        if (!window.confirm(`¿Estás seguro de que deseas banear a @${report.reporter_username || 'usuario'}? Esta acción es irreversible.`)) return;
        await api.banUser(report.reporter_id, guardianId);
        await api.updateReportStatus(report.id, 'resolved', guardianId);
        setAlertMessage(`Usuario baneado correctamente.`);
      }
      await loadData();
    } catch (error) {
      console.error('Error in reporter action:', error);
      setAlertMessage('Error al aplicar la penalización al usuario.');
    }
  };

  const handleVoteProposal = async (proposalId: string, voteType: 'up' | 'down') => {
    if (!currentUser) return;
    try {
      await api.voteCategoryProposal(proposalId, currentUser.uid, voteType);
      await loadData();
    } catch (error: any) {
      console.error('Error voting on proposal:', error);
      setAlertMessage('Hubo un error al emitir el voto. Si el servidor se actualizó recientemente, por favor reinícialo.');
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (log.display_name || '').toLowerCase().includes(q) || 
           (log.action || '').toLowerCase().includes(q) ||
           (log.target_type || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-8 pb-32 px-4 md:px-0">
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-vuttik-navy/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-blue-50 text-vuttik-blue rounded-full flex items-center justify-center">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-display font-black text-vuttik-navy">Aviso</h3>
                <p className="text-vuttik-text-muted text-sm">{alertMessage}</p>
                <button
                  onClick={() => setAlertMessage('')}
                  className="w-full mt-2 py-3 bg-vuttik-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-vuttik-blue text-white rounded-[20px] flex items-center justify-center shadow-xl shadow-vuttik-blue/20">
            <Shield size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-black text-vuttik-navy">Panel Guardian</h2>
            <p className="text-vuttik-text-muted text-sm font-bold uppercase tracking-widest">Auditoría y Democracia</p>
          </div>
        </div>

        <div className="flex bg-vuttik-gray p-1 rounded-2xl overflow-x-auto no-scrollbar">
          {[
            { id: 'flagged', label: 'Reportes', icon: ShieldAlert },
            { id: 'audit', label: 'Trazabilidad', icon: Activity },
            { id: 'proposals', label: 'Propuestas', icon: GitPullRequest },
            { id: 'chat', label: 'Chat Global', icon: MessageSquare },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => {
                if (tab.id === 'chat') {
                  navigate('/mensajes', { state: { targetConversationId: 'guardian_global_chat' } });
                } else {
                  setActiveTab(tab.id as any);
                }
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-vuttik-blue shadow-sm' : 'text-vuttik-text-muted hover:text-vuttik-navy'}`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'flagged' && reports.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{reports.filter(r => r.status === 'pending').length}</span>
              )}
              {tab.id === 'proposals' && proposals.filter(p => p.status === 'pending').length > 0 && (
                <span className="ml-1 bg-vuttik-blue text-white text-[8px] px-1.5 py-0.5 rounded-full">{proposals.filter(p => p.status === 'pending').length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-gray-100 rounded-[40px] shadow-sm overflow-hidden flex flex-col min-h-[60vh]">
        <>
          {activeTab === 'audit' && (
              <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vuttik-text-muted" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar por usuario, acción o tipo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-vuttik-gray border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-vuttik-blue/20 transition-all"
                  />
                </div>
              </div>
            )}

            {activeTab === 'flagged' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-vuttik-gray border-b border-gray-100">
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Contenido Reportado</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Reportado Por</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Motivo</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Acciones de Moderación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reports.filter(r => r.status === 'pending').map((report) => (
                      <tr key={report.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <div>
                            <p className="text-sm font-black text-vuttik-navy">{report.target_title || 'Perfil de Usuario'}</p>
                            <p className="text-[10px] text-vuttik-text-muted font-bold uppercase">Reportado el {new Date(report.created_at).toLocaleDateString()}</p>
                            <p className="text-[10px] font-black uppercase bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full inline-block mt-1">{report.target_type}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              {report.reporter_photo ? (
                                <img src={report.reporter_photo} alt={report.reporter_username || 'U'} className="w-8 h-8 rounded-lg object-cover" />
                              ) : (
                                <div className="w-8 h-8 bg-vuttik-gray rounded-lg flex items-center justify-center text-[10px] font-bold text-vuttik-navy">
                                  {(report.reporter_name || report.reporter_username || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-vuttik-navy">{report.reporter_name || 'Desconocido'}</span>
                                <span className="text-[10px] text-vuttik-blue font-bold">@{report.reporter_username || 'desconocido'}</span>
                                <span className="text-[10px] font-bold text-red-500 mt-0.5">{report.reporter_strikes || 0} Strikes</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleReporterAction(report, 'strike')}
                                className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-[10px] font-bold hover:bg-orange-600 hover:text-white transition-all"
                                title="Dar Strike por Mal Uso"
                              >
                                Strike
                              </button>
                              <button
                                onClick={() => handleReporterAction(report, 'ban')}
                                className="px-2 py-1 bg-red-50 text-red-500 rounded text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all"
                                title="Banear a quien reporta"
                              >
                                Banear
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs text-vuttik-navy max-w-xs">{report.reason}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                if (report.target_type === 'product' && onViewProduct) {
                                  onViewProduct(report.target_id);
                                } else if (report.author_id) {
                                  navigate(`/perfil/${report.author_id}`);
                                } else {
                                  setAlertMessage('El ID del autor o del contenido se perdió al hacer el reporte originalmente, por lo que no puede ser visualizado.');
                                }
                              }}
                              className="p-2.5 bg-blue-50 text-vuttik-blue rounded-xl hover:bg-vuttik-blue hover:text-white transition-all"
                              title="Ver Contenido / Perfil del Autor"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => handleModerationAction(report, 'dismiss')}
                              className="p-2.5 bg-gray-100 text-vuttik-navy rounded-xl hover:bg-vuttik-navy hover:text-white transition-all flex items-center gap-1"
                              title="Ignorar Reporte"
                            >
                              <Check size={18} />
                              <span className="text-[10px] font-bold">Ignorar</span>
                            </button>
                            {(report.target_type === 'post' || report.target_type === 'product') && (
                              <button 
                                onClick={() => handleModerationAction(report, 'delete_post')}
                                className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all flex items-center gap-1"
                                title="Eliminar Publicación"
                              >
                                <Trash2 size={18} />
                                <span className="text-[10px] font-bold">Eliminar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reports.filter(r => r.status === 'pending').length === 0 && (
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
            )}

            {activeTab === 'audit' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-vuttik-gray border-b border-gray-100">
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Fecha/Hora</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Usuario</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Acción</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-vuttik-gray/50 transition-colors">
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className="text-xs font-bold text-vuttik-navy">{new Date(log.timestamp).toLocaleString()}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {log.user_avatar ? (
                              <img src={log.user_avatar} className="w-8 h-8 rounded-full object-cover bg-gray-200" alt={log.user_name || 'U'} />
                            ) : (
                              <div className="w-8 h-8 bg-vuttik-blue/10 rounded-full flex items-center justify-center text-[10px] font-bold text-vuttik-blue">
                                {(log.user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-bold text-vuttik-navy">{log.user_name || 'Desconocido'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-vuttik-blue/10 text-vuttik-blue rounded-full text-[10px] font-black uppercase tracking-widest">
                            {
                              {
                                'USER_REGISTERED': 'Registro',
                                'USER_LOGIN': 'Inicio Sesión',
                                'SWITCH_MODE': 'Cambio Perfil',
                                'UPDATE_PROFILE': 'Edición Perfil',
                                'CHANGE_USER_ROLE': 'Cambio Rol',
                                'BAN_USER': 'Baneo',
                                'UNBAN_USER': 'Desbaneo',
                                'CREATE_PRODUCT': 'Nuevo Producto',
                                'UPDATE_PRODUCT': 'Editó Producto',
                                'DELETE_PRODUCT': 'Borró Producto',
                                'CREATE_POST': 'Nuevo Post',
                                'EDIT_POST': 'Editó Post',
                                'DELETE_POST': 'Borró Post',
                                'LIKE_POST': 'Like Post',
                                'UNLIKE_POST': 'Unlike Post',
                                'COMMENT': 'Comentario',
                                'DELETE_COMMENT': 'Borró Comentario',
                                'VOTE_VERACITY': 'Voto Veracidad',
                                'report_created': 'Reporte',
                                'report_dismissed': 'Ignoró Reporte',
                                'report_resolved': 'Resolvió Reporte',
                                'category_vote': 'Voto Categoría',
                                'category_approved_mega': 'Mega Aprobó Cat.',
                                'FOLLOW': 'Siguió',
                                'UNFOLLOW': 'Dejó de Seguir',
                                'UPDATE_BUSINESS_PROFILE': 'Edición Negocio',
                                'INVITE_MEMBER': 'Invitó Miembro',
                                'ACCEPT_INVITE': 'Aceptó Invitación',
                              }[log.action] || log.action.replace(/_/g, ' ')
                            }
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs font-medium text-vuttik-text-muted truncate block max-w-[200px]" title={`ID: ${log.target_id} | ${log.metadata || ''}`}>
                            {log.target_type}: {log.target_id} {log.metadata ? '- ' + log.metadata : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-vuttik-text-muted font-bold text-sm">
                          No hay registros de auditoría que coincidan con tu búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'proposals' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-vuttik-gray border-b border-gray-100">
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Categoría Propuesta</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Sugerida Por</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Estado</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest">Votos</th>
                      <th className="px-8 py-6 text-[10px] font-black text-vuttik-text-muted uppercase tracking-widest text-right">Votar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {proposals.map((proposal) => (
                      <tr key={proposal.id} className="hover:bg-vuttik-gray/50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="text-sm font-black text-vuttik-navy">{proposal.name}</span>
                          <span className="block text-[10px] text-vuttik-text-muted font-bold mt-1">{new Date(proposal.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs font-bold text-vuttik-navy">{proposal.suggested_by_name}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            proposal.status === 'approved' ? 'bg-green-100 text-green-600' :
                            proposal.status === 'rejected' ? 'bg-red-100 text-red-500' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            {proposal.status === 'approved' ? 'Aprobada' : proposal.status === 'rejected' ? 'Rechazada' : 'En Votación'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex items-center justify-between text-[10px] font-bold text-vuttik-navy">
                              <span className="text-green-600">{proposal.upVotes} Sí</span>
                              <span className="text-red-500">{proposal.downVotes} No</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                              <div 
                                style={{ width: `${(proposal.upVotes / proposal.totalGuardians) * 100}%` }} 
                                className="h-full bg-green-500"
                              />
                              <div 
                                style={{ width: `${(proposal.downVotes / proposal.totalGuardians) * 100}%` }} 
                                className="h-full bg-red-500"
                              />
                            </div>
                            <div className="text-[9px] text-vuttik-text-muted text-center uppercase tracking-wider mt-1">
                              {proposal.totalGuardians} Guardianes Totales
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {proposal.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleVoteProposal(proposal.id, 'up')}
                                className={`p-2 rounded-lg transition-colors ${
                                  proposal.myVote === 'up' 
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                                title="Votar a favor"
                              >
                                <ThumbsUp size={16} />
                              </button>
                              <button 
                                onClick={() => handleVoteProposal(proposal.id, 'down')}
                                className={`p-2 rounded-lg transition-colors ${
                                  proposal.myVote === 'down' 
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                                    : 'bg-red-50 text-red-500 hover:bg-red-100'
                                }`}
                                title="Votar en contra"
                              >
                                <ThumbsDown size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-vuttik-text-muted uppercase">Finalizada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {proposals.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-vuttik-text-muted font-bold text-sm">
                          No hay propuestas de categorías pendientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
      </div>
    </div>
  );
}
