const fs = require('fs');
let content = fs.readFileSync('index.ts', 'utf8');

const target = `app.get('/api/business-profiles/:uid', async (req: any, res) => {`;

const newRoutes = `// --- Business Requests ---
app.post('/api/business-requests', authenticateToken, async (req: any, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const uid = req.user.uid;
  
  try {
    const existingReq = await get('SELECT * FROM vuttik_business_requests WHERE user_id = ? AND status = ?', [uid, 'pending']);
    if (existingReq) return res.status(400).json({ error: 'Ya tienes una solicitud pendiente.' });

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await run('INSERT INTO vuttik_business_requests (id, user_id, user_name, user_email, business_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, uid, req.user.displayName || 'Usuario', req.user.email || '', name, 'pending', new Date().toISOString()]
    );
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/business-requests', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'mega_guardian') return res.status(403).json({ error: 'Forbidden' });
  try {
    const requests = await all('SELECT * FROM vuttik_business_requests ORDER BY created_at DESC');
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/business-requests/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'mega_guardian') return res.status(403).json({ error: 'Forbidden' });
  try {
    const request = await get('SELECT * FROM vuttik_business_requests WHERE id = ?', [req.params.id]);
    if (!request || request.status !== 'pending') return res.status(400).json({ error: 'Invalid request' });

    // Mark as approved
    await run('UPDATE vuttik_business_requests SET status = ? WHERE id = ?', ['approved', req.params.id]);

    // Send email notification
    try {
      const { sendMail } = await import('./mailer.js');
      await sendMail(request.user_email, '¡Tu negocio ha sido aprobado!', \`Hola \${request.user_name}, tu solicitud para el negocio "\${request.business_name}" ha sido aprobada. Ya puedes comenzar a gestionarlo desde el panel de Vuttik POS.\`);
    } catch (e) {
      console.error('Failed to send approval email:', e);
    }

    res.json({ success: true, user_id: request.user_id, business_name: request.business_name });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/business-requests/:id/reject', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'mega_guardian') return res.status(403).json({ error: 'Forbidden' });
  try {
    const request = await get('SELECT * FROM vuttik_business_requests WHERE id = ?', [req.params.id]);
    if (!request || request.status !== 'pending') return res.status(400).json({ error: 'Invalid request' });

    await run('UPDATE vuttik_business_requests SET status = ? WHERE id = ?', ['rejected', req.params.id]);

    // Send email notification
    try {
      const { sendMail } = await import('./mailer.js');
      await sendMail(request.user_email, 'Solicitud de negocio rechazada', \`Hola \${request.user_name}, tu solicitud para el negocio "\${request.business_name}" no pudo ser aprobada en este momento. Si tienes dudas, contáctanos.\`);
    } catch (e) {
      console.error('Failed to send rejection email:', e);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/business-profiles/:uid', async (req: any, res) => {`;

content = content.replace(target, newRoutes);
fs.writeFileSync('index.ts', content, 'utf8');
console.log('index.ts patched successfully');
