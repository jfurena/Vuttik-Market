const fs = require('fs');
const file = 'apps/vuttik-pos-web/server/pos-backend.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("app.get('/api/auth/me', (req, res) => {", "app.get('/api/auth/me', async (req, res) => {");
content = content.replace(
"const owner = db.owners.find((o) => o.id === s.owner_id);",
`let owner = db.owners.find((o) => o.id === s.owner_id);
            if (!owner) {
                const sqlUser = await get('SELECT * FROM vuttik_users WHERE uid = ?', [s.owner_id]);
                if (sqlUser) owner = { id: sqlUser.uid, nombre: sqlUser.display_name, correo: sqlUser.email, password_hash: '' };
            }`
);
content = content.replace(
"const owner = db.owners.find((o) => o.id === s.owner_id);",
`let owner = db.owners.find((o) => o.id === s.owner_id);
            if (!owner) {
                const sqlUser = await get('SELECT * FROM vuttik_users WHERE uid = ?', [s.owner_id]);
                if (sqlUser) owner = { id: sqlUser.uid, nombre: sqlUser.display_name, correo: sqlUser.email, password_hash: '' };
            }`
);

fs.writeFileSync(file, content);
console.log('patched successfully');
