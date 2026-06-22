const fs = require('fs');
let content = fs.readFileSync('src/components/MegaGuardianDashboard.tsx', 'utf8');

content = content.replace(
  `useState<'overview' | 'categories' | 'subcategories' | 'users' | 'reports' | 'subscriptions' | 'auditoria'>('overview');`,
  `useState<'overview' | 'categories' | 'subcategories' | 'users' | 'reports' | 'subscriptions' | 'auditoria' | 'business_requests'>('overview');`
);

content = content.replace(
  `const [trends, setTrends] = useState<any[]>([]);`,
  `const [trends, setTrends] = useState<any[]>([]);\n  const [businessRequests, setBusinessRequests] = useState<any[]>([]);`
);

content = content.replace(
  `const [cats, txTypes, usrs, pls] = await Promise.all([`,
  `const [cats, txTypes, usrs, pls, bReqs] = await Promise.all([`
);

content = content.replace(
  `          api.getSubscriptionPlans()
        ]);
        setCategories(cats);
        setTransactionTypes(txTypes);
        setUsers(usrs);
        setPlans(pls);`,
  `          api.getSubscriptionPlans(),
          fetch('/api/business-requests', { headers: { 'Authorization': \`Bearer \${localStorage.getItem('vuttik_token')}\` }}).then(r => r.ok ? r.json() : [])
        ]);
        setCategories(cats);
        setTransactionTypes(txTypes);
        setUsers(usrs);
        setPlans(pls);
        setBusinessRequests(bReqs || []);`
);

// Add Tab Button
content = content.replace(
  `<button onClick={() => setActiveView('auditoria')} className={\`flex items-center gap-3 w-full p-3 rounded-xl transition-all \${activeView === 'auditoria' ? 'bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/30' : 'text-vuttik-text-muted hover:bg-white hover:text-vuttik-navy'}\`}>
              <ShieldAlert size={20} />
              <span className="font-bold">Auditoría</span>
            </button>`,
  `<button onClick={() => setActiveView('auditoria')} className={\`flex items-center gap-3 w-full p-3 rounded-xl transition-all \${activeView === 'auditoria' ? 'bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/30' : 'text-vuttik-text-muted hover:bg-white hover:text-vuttik-navy'}\`}>
              <ShieldAlert size={20} />
              <span className="font-bold">Auditoría</span>
            </button>
            <button onClick={() => setActiveView('business_requests')} className={\`flex items-center gap-3 w-full p-3 rounded-xl transition-all \${activeView === 'business_requests' ? 'bg-vuttik-blue text-white shadow-lg shadow-vuttik-blue/30' : 'text-vuttik-text-muted hover:bg-white hover:text-vuttik-navy'}\`}>
              <Store size={20} />
              <span className="font-bold">Solicitudes Negocios</span>
            </button>`
);

// Define Handle functions for Approve/Reject
const functions = `
  const handleApproveBusiness = async (id) => {
    try {
      const res = await fetch(\`/api/business-requests/\${id}/approve\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${localStorage.getItem('vuttik_token')}\` }});
      if (res.ok) {
        setNotification({ message: 'Negocio aprobado.', type: 'success' });
        setBusinessRequests(businessRequests.map(r => r.id === id ? { ...r, status: 'approved' } : r));
      } else {
        throw new Error('Error approving');
      }
    } catch (e) {
      setNotification({ message: 'Error al aprobar', type: 'error' });
    }
  };

  const handleRejectBusiness = async (id) => {
    try {
      const res = await fetch(\`/api/business-requests/\${id}/reject\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${localStorage.getItem('vuttik_token')}\` }});
      if (res.ok) {
        setNotification({ message: 'Negocio rechazado.', type: 'success' });
        setBusinessRequests(businessRequests.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
      } else {
        throw new Error('Error rejecting');
      }
    } catch (e) {
      setNotification({ message: 'Error al rechazar', type: 'error' });
    }
  };
`;

content = content.replace(`  const handleAddCategory = async () => {`, functions + `\n  const handleAddCategory = async () => {`);

// Render View
const viewCode = `
{activeView === 'business_requests' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-display font-black text-vuttik-navy">Solicitudes de Negocios</h3>
                <p className="text-vuttik-text-muted text-sm">Aprueba o rechaza nuevos negocios solicitados por usuarios existentes.</p>
              </div>
            </div>
            <div className="space-y-4">
              {businessRequests.length === 0 && <p className="text-gray-500">No hay solicitudes.</p>}
              {businessRequests.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row justify-between items-center p-4 border border-gray-100 rounded-xl">
                  <div>
                    <h4 className="font-bold text-lg">{req.business_name}</h4>
                    <p className="text-sm text-gray-500">Solicitado por: {req.user_name} ({req.user_email})</p>
                    <p className="text-xs text-gray-400">Fecha: {new Date(req.created_at).toLocaleString()}</p>
                    <p className="text-xs font-bold mt-1">
                      Estado: <span className={req.status === 'pending' ? 'text-yellow-600' : req.status === 'approved' ? 'text-green-600' : 'text-red-600'}>{req.status.toUpperCase()}</span>
                    </p>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 mt-4 sm:mt-0">
                      <button onClick={() => handleApproveBusiness(req.id)} className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-sm">Aprobar</button>
                      <button onClick={() => handleRejectBusiness(req.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm">Rechazar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
`;

content = content.replace(`{activeView === 'auditoria' && (`, viewCode + `{activeView === 'auditoria' && (`);

// Ensure Store icon is imported
if (!content.includes('Store')) {
  content = content.replace(`import { ShieldAlert,`, `import { ShieldAlert, Store,`);
} else {
  content = content.replace(`import { ShieldAlert`, `import { Store, ShieldAlert`);
}

fs.writeFileSync('src/components/MegaGuardianDashboard.tsx', content, 'utf8');
console.log('MegaGuardianDashboard.tsx patched successfully');
