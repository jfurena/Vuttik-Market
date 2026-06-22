const fs = require('fs');
const path = require('path');

function findInDir(dir, search) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findInDir(fullPath, search);
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(search.toLowerCase())) {
        console.log(`Found "${search}" in: ${fullPath}`);
      }
    }
  }
}

try {
  findInDir(path.resolve(__dirname, 'src'), 'Juan');
} catch (e) {
  console.error(e);
}
