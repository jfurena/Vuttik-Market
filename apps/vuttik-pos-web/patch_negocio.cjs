const fs = require('fs');
let content = fs.readFileSync('src/components/NegocioDashboard.tsx', 'utf8');

const target = `  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const isNew = !profile || profile.name === user.displayName;
      const targetBizUid = isNew && (!businessUid || businessUid === user.uid) ? \`biz-\${Date.now()}\` : businessUid;`;

const replacement = `  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const isNew = !profile || profile.name === user.displayName;
      const targetBizUid = isNew && (!businessUid || businessUid === user.uid) ? \`biz-\${Date.now()}\` : businessUid;

      // Mega Guardian Interception for Multi-Businesses
      if (isNew) {
        try {
          // In GlobalBusinessSelector we saw api.getBusinesses(user.uid) returning an array.
          const res = await fetch(\`/api/users/\${user.uid}\`);
          if (res.ok) {
            const udata = await res.json();
            if (udata.role !== 'admin' && udata.role !== 'mega_guardian') {
              const reqRes = await fetch('/api/business-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('vuttik_token')}\` },
                body: JSON.stringify({ name: profileForm.name })
              });
              
              if (reqRes.ok) {
                alert('Como ya tienes una cuenta, tu solicitud para crear este negocio ha sido enviada al Mega Guardian para su aprobación. Te notificaremos por correo.');
                setIsEditingProfile(false);
                return;
              } else {
                const reqData = await reqRes.json();
                if (reqData.error === 'Ya tienes una solicitud pendiente.') {
                  alert(reqData.error);
                  setIsEditingProfile(false);
                  return;
                }
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/NegocioDashboard.tsx', content, 'utf8');
console.log('NegocioDashboard.tsx patched successfully');
