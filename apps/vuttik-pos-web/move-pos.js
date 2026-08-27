import fs from 'fs';
import path from 'path';

const root = process.cwd();
const posRoot = path.join(root, 'pos-vuttik');

// Make dirs
['src', 'src/components', 'src/lib', 'src/constants', 'src/context', 'server', 'public', 'electron'].forEach(dir => {
  fs.mkdirSync(path.join(posRoot, dir), { recursive: true });
});

// Helper to copy recursively
function copySync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => {
      copySync(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Copy src/pos to pos-vuttik/src
copySync(path.join(root, 'src', 'pos'), path.join(posRoot, 'src'));

// 2. Move electron folder
copySync(path.join(root, 'electron'), path.join(posRoot, 'electron'));

// 3. Move pos backend stuff
['pos-backend.ts', 'db.ts'].forEach(f => {
  copySync(path.join(root, 'server', f), path.join(posRoot, 'server', f));
});

// 4. Move public logo
copySync(path.join(root, 'public', 'vuttik-pos-logo.png'), path.join(posRoot, 'public', 'vuttik-pos-logo.png'));

// 5. Create index.html for POS
const indexHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/vuttik-pos-logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Vuttik POS</title>
  </head>
  <body class="bg-surface text-on-surface antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
fs.writeFileSync(path.join(posRoot, 'index.html'), indexHtml);

// 6. Create POS package.json
const pkg = {
  name: "pos-vuttik",
  private: true,
  version: "1.0.0",
  type: "module",
  main: "electron/main.cjs",
  scripts: {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "electron:dev": "concurrently 'npm run dev' 'wait-on tcp:5173 && electron .'",
    "electron:build": "npm run build && electron-builder"
  },
  build: {
    "appId": "com.vuttik.pos",
    "productName": "Vuttik POS",
    "directories": {
      "output": "../pos-portable/"
    },
    "files": [
      "dist/**/*",
      "server/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": "portable",
      "icon": "public/vuttik-pos-logo.png"
    },
    "portable": {
      "artifactName": "${productName} Portable.${ext}"
    }
  },
  dependencies: {
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "date-fns": "^4.4.0",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "lucide-react": "^0.546.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.14.2",
    "recharts": "^3.8.1",
    "sqlite3": "^6.0.1",
    "tailwind-merge": "^3.6.0",
    "uuid": "^13.0.0"
  },
  devDependencies: {
    "@tailwindcss/vite": "^4.1.14",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^5.0.4",
    "concurrently": "^9.2.1",
    "electron": "^42.4.1",
    "electron-builder": "^26.15.3",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "wait-on": "^9.0.10"
  }
};
fs.writeFileSync(path.join(posRoot, 'package.json'), JSON.stringify(pkg, null, 2));

console.log("POS files copied to pos-vuttik successfully!");
