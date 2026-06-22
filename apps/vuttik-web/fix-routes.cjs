const fs = require('fs');
const file = fs.readFileSync('server/index.ts', 'utf8');

// Find the start of /api/users/search block
const searchStartIdx = file.indexOf("app.get('/api/users/search'");
const searchEndIdx = file.indexOf("});", searchStartIdx) + 3;
const searchBlock = file.substring(searchStartIdx, searchEndIdx) + '\n\n';

// Remove the search block from its current position
let newFile = file.substring(0, searchStartIdx) + file.substring(searchEndIdx);

// Find the comment "// --- User Routes ---" and insert the search block after it
const userRoutesIdx = newFile.indexOf('// --- User Routes ---');
const insertIdx = newFile.indexOf('\n', userRoutesIdx) + 1;

newFile = newFile.substring(0, insertIdx) + searchBlock + newFile.substring(insertIdx);

fs.writeFileSync('server/index.ts', newFile);
console.log('Fixed route order');
