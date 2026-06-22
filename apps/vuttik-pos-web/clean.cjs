const fs = require('fs');
const lines = fs.readFileSync('src/components/BusinessDashboard.tsx', 'utf8').split('\n');
const cleaned = lines.map(l => {
  const m = l.match(/^\d+:\s(.*)/);
  return m ? m[1] : l;
});
fs.writeFileSync('src/components/BusinessDashboard.tsx', cleaned.join('\n'));
