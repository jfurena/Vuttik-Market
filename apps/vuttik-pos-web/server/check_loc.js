const fs = require('fs');
const content = fs.readFileSync('/var/www/vuttik/backend/server/db.js', 'utf-8');
const dbCode = content.replace('export const db =', 'const db =').replace('module.exports =', 'const db =');
eval(dbCode + '; console.log("LOCATION:", db.businesses.find(b => b.id === "biz-1782309245503")?.location)');
