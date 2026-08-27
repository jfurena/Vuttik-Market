import fs from 'fs';
import path from 'path';

const pagesDir = path.join(process.cwd(), 'pos-vuttik', 'src', 'pages');
const componentsDir = path.join(process.cwd(), 'pos-vuttik', 'src', 'components');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/\.\.\/\.\.\/components/g, '../components');
      content = content.replace(/\.\.\/\.\.\/lib/g, '../lib');
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceInDir(pagesDir);
replaceInDir(componentsDir);
console.log('Imports fixed!');
