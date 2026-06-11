const fs = require('fs');
let c = fs.readFileSync('src/components/BusinessDashboard.tsx', 'utf8');

c = c.replace(/const loadData = async \(\) => \{/, `const handleDeletePromo = async (promoId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar o pausar esta promoción?')) return;
    try {
      await api.deletePromotion(promoId);
      setPromotions(prev => prev.filter(p => p.id !== promoId));
      alert('Promoción eliminada exitosamente');
    } catch (err) {
      console.error('Error deleting promotion:', err);
      alert('Error al eliminar la promoción');
    }
  };

  const loadData = async () => {`);

c = c.replace(/<p className="text-\[10px\] text-vuttik-text-muted font-bold">\s*\{promo\.createdAt \? new Date\(promo\.createdAt\)\.toLocaleDateString\(\) : 'Sin fecha'\}\s*<\/p>/, `<div className="flex items-center gap-3">
                    <p className="text-[10px] text-vuttik-text-muted font-bold">
                      {promo.createdAt ? new Date(promo.createdAt).toLocaleDateString() : 'Sin fecha'}
                    </p>
                    <button 
                      onClick={() => handleDeletePromo(promo.id)}
                      title="Eliminar Promoción"
                      className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>`);

fs.writeFileSync('src/components/BusinessDashboard.tsx', c);
console.log('done');
