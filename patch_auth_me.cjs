const fs = require('fs');
const file = 'apps/vuttik-pos-web/server/pos-backend.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `  app.get('/api/auth/me', (req, res) => {
    const s = req.session as any;
    if (!s.owner_id && !s.employee_id) return res.json(null);

    const db = getDB();

    if (s.owner_id && !s.business_id) {
      // Owner without business selected \u2192 return owner info
      const owner = db.owners.find((o: any) => o.id === s.owner_id);
      if (!owner) return res.json(null);
      const { password_hash: _, ...safe } = owner;
      return res.json({ ...safe, rol: 'admin', estado: 'activo' });
    }

    if (s.owner_id && s.business_id) {
      // Owner inside a business
      const owner = db.owners.find((o: any) => o.id === s.owner_id);
      const biz = db.businesses.find((b: any) => b.id === s.business_id);
      if (!owner || !biz) return res.json(null);
      return res.json({
        id: owner.id,`;

const replacement = `  app.get('/api/auth/me', async (req, res) => {
    const s = req.session as any;
    if (!s.owner_id && !s.employee_id) return res.json(null);

    const db = getDB();

    if (s.owner_id && !s.business_id) {
      // Owner without business selected \u2192 return owner info
      let owner = db.owners.find((o: any) => o.id === s.owner_id);
      if (!owner) {
        const sqlUser: any = await get('SELECT * FROM vuttik_users WHERE uid = ?', [s.owner_id]);
        if (sqlUser) owner = { id: sqlUser.uid, nombre: sqlUser.display_name, correo: sqlUser.email, password_hash: '' };
      }
      if (!owner) return res.json(null);
      const { password_hash: _, ...safe } = owner;
      return res.json({ ...safe, rol: 'admin', estado: 'activo' });
    }

    if (s.owner_id && s.business_id) {
      // Owner inside a business
      let owner = db.owners.find((o: any) => o.id === s.owner_id);
      const biz = db.businesses.find((b: any) => b.id === s.business_id);
      if (!owner) {
        const sqlUser: any = await get('SELECT * FROM vuttik_users WHERE uid = ?', [s.owner_id]);
        if (sqlUser) owner = { id: sqlUser.uid, nombre: sqlUser.display_name, correo: sqlUser.email, password_hash: '' };
      }
      if (!owner || !biz) return res.json(null);
      return res.json({
        id: owner.id,`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('patched');
