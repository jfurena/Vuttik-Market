const fs = require('fs');
let content = fs.readFileSync('apps/vuttik-pos-web/server/pos-backend.ts', 'utf8');

content = content.replace('const emptyBusiness = ', 'export const emptyBusiness = ');
content = content.replace('const getDB = ', 'export const getDB = ');
content = content.replace('const saveDB = ', 'export const saveDB = ');

// Replace the end
content = content.replace('export const posApp = await startServer();', 'export const initPosApp = startServer;');

fs.writeFileSync('apps/vuttik-pos-web/server/pos-backend.ts', content, 'utf8');
console.log('Fixed exports');
