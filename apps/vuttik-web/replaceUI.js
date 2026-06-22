const fs = require('fs');
const path = require('path');

const targetDirs = [
  'c:/Users/Dell Inspiron/Downloads/Vuttik-app/src/pos/pages',
  'c:/Users/Dell Inspiron/Downloads/Vuttik-app/src/pos/components'
];

const replacements = [
  { search: /bg-gray-50/g, replace: 'bg-surface' },
  { search: /bg-gray-100/g, replace: 'bg-surface-variant' },
  { search: /border-gray-100/g, replace: 'border-surface-variant' },
  { search: /border-gray-200/g, replace: 'border-surface-variant' },
  { search: /text-gray-900/g, replace: 'text-on-surface' },
  { search: /text-gray-950/g, replace: 'text-on-surface' },
  { search: /text-gray-800/g, replace: 'text-on-surface' },
  { search: /text-gray-500/g, replace: 'text-on-surface-variant' },
  { search: /text-gray-400/g, replace: 'text-on-surface-variant' },
  { search: /text-gray-600/g, replace: 'text-on-surface-variant' },
  { search: /bg-blue-600/g, replace: 'bg-vuttik-blue' },
  { search: /bg-blue-700/g, replace: 'bg-vuttik-blue hover:opacity-90' },
  { search: /text-blue-600/g, replace: 'text-vuttik-blue' },
  { search: /text-blue-700/g, replace: 'text-vuttik-blue hover:opacity-90' },
  { search: /border-blue-700/g, replace: 'border-vuttik-blue' },
  { search: /shadow-xl/g, replace: 'shadow-pro' },
  { search: /shadow-lg/g, replace: 'shadow-pro' },
  { search: /shadow-2xl/g, replace: 'shadow-pro' },
  { search: /rounded-2xl/g, replace: 'rounded-3xl' },
  { search: /rounded-\[2rem\]/g, replace: 'rounded-3xl' },
  { search: /rounded-\[2\.5rem\]/g, replace: 'rounded-3xl' },
  { search: /rounded-xl/g, replace: 'rounded-full' },
  { search: /rounded-lg/g, replace: 'rounded-2xl' },
  { search: /font-sans/g, replace: 'font-body-md' },
  { search: /font-black text-xs/g, replace: 'font-headline-md text-xs' },
  { search: /font-black text-xl/g, replace: 'font-headline-lg' },
  { search: /font-black text-2xl/g, replace: 'font-headline-lg' },
  { search: /font-black text-3xl/g, replace: 'font-display-lg' },
  { search: /font-black/g, replace: 'font-bold' },
];

function processDir(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const { search, replace } of replacements) {
        content = content.replace(search, replace);
      }
      
      // Additional targeted replacements
      if (file === 'Layout.tsx') {
        content = content.replace(/bg-white border-r border-surface-variant/g, 'bg-white/80 backdrop-blur-xl border-r border-surface-variant');
        content = content.replace(/<header className="md:hidden bg-white/g, '<header className="md:hidden glass-card-pro bg-white/80 backdrop-blur-xl');
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  }
}

for (const dir of targetDirs) {
  processDir(dir);
}
console.log('Done');
