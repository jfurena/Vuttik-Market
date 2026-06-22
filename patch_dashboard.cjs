const fs = require('fs');
let content = fs.readFileSync('apps/vuttik-pos-web/src/components/MegaGuardianDashboard.tsx', 'utf8');

content = content.replace(/const \[cats, txTypes, usrs, pls, bReqs\] = await Promise\.all\(\[\s*api\.getCategories\(\),\s*api\.getTransactionTypes\(\),\s*api\.getAllUsers\(\),\s*api\.getSubscriptionPlans\(\)\s*\]\);\s*setCategories\(cats\);\s*setTransactionTypes\(txTypes\);\s*setUsers\(usrs\);\s*setPlans\(pls\);/s, `const [cats, txTypes, usrs, pls, bReqs] = await Promise.all([
          api.getCategories(),
          api.getTransactionTypes(),
          api.getAllUsers(),
          api.getSubscriptionPlans(),
          fetch('/api/business-requests', { headers: { 'Authorization': \`Bearer \${localStorage.getItem('vuttik_token')}\` }}).then(r => r.ok ? r.json() : [])
        ]);
        setCategories(cats);
        setTransactionTypes(txTypes);
        setUsers(usrs);
        setPlans(pls);
        setBusinessRequests(bReqs || []);`);

fs.writeFileSync('apps/vuttik-pos-web/src/components/MegaGuardianDashboard.tsx', content, 'utf8');
console.log('Patched MegaGuardianDashboard successfully');
