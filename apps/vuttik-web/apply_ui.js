const fs = require('fs');

const files = [
  'src/pos/components/Layout.tsx',
  'src/pos/pages/POS.tsx',
  'src/pos/pages/Dashboard.tsx'
];

const replacements = [
  { regex: /bg-gray-50/g, replacement: 'bg-surface' },
  { regex: /text-blue-600/g, replacement: 'text-vuttik-blue' },
  { regex: /bg-blue-600/g, replacement: 'bg-vuttik-blue' },
  { regex: /text-gray-900/g, replacement: 'text-vuttik-navy' },
  { regex: /text-gray-950/g, replacement: 'text-vuttik-navy' },
  { regex: /text-gray-500/g, replacement: 'text-on-surface-variant' },
  { regex: /rounded-2xl/g, replacement: 'rounded-3xl' },
  { regex: /rounded-xl/g, replacement: 'rounded-2xl' },
  { regex: /shadow-md/g, replacement: 'shadow-pro' },
  { regex: /shadow-lg/g, replacement: 'shadow-pro-hover' },
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Navigation updates
    content = content.replace(/bg-white border-b border-gray-200/g, 'glass-nav-pro border-b border-outline-variant/20');
    content = content.replace(/bg-white border-r border-gray-200/g, 'bg-surface-container-lowest border-r border-outline-variant/20');
    content = content.replace(/bg-white border-t border-gray-100/g, 'glass-nav-pro border-t border-outline-variant/20');
    content = content.replace(/bg-white shadow-sm/g, 'glass-card-pro');
    content = content.replace(/bg-white rounded-lg/g, 'glass-card-pro rounded-2xl');
    
    replacements.forEach(({regex, replacement}) => {
      content = content.replace(regex, replacement);
    });
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
