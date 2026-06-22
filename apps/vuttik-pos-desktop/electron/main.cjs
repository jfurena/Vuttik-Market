const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../public/vuttik-pos-logo.png'),
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('http://localhost:3005');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const isDev = !app.isPackaged;
  console.log('Starting Express Server...');
  process.env.USER_DATA_PATH = app.getPath('userData');
  process.env.PORT = '3005';
  
  if (isDev) {
    // In dev, use tsx to run the server directly
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    serverProcess = spawn(command, ['tsx', 'server/server.ts'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '3005' },
    });

    serverProcess.stdout.on('data', (data) => console.log(`Server: ${data}`));
    serverProcess.stderr.on('data', (data) => console.error(`Server Error: ${data}`));
    serverProcess.on('close', (code) => console.log(`Server exited with ${code}`));
  } else {
    // In production, run the compiled JS server
    process.env.NODE_ENV = 'production';
    try {
      const server = require('../dist-server/server.cjs');
      if (server.start) server.start();
      console.log('Server loaded and started successfully in prod mode.');
    } catch (e) {
      console.error('Failed to load server.js', e);
    }
  }
}

ipcMain.handle('oauth-login', async (event, provider) => {
  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 650,
      parent: mainWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'phantom-preload.cjs')
      }
    });

    authWindow.loadURL('https://pos.vuttik.com/login');
    
    authWindow.once('ready-to-show', () => {
      authWindow.show();
    });

    let tokenResolved = false;

    authWindow.webContents.on('did-navigate', (event, url) => {
      // If the URL goes to any logged-in page, capture localStorage and close!
      if (url.includes('/dashboard') || url.includes('/pos') || url.includes('/businesses') || url.includes('/terminal')) {
        if (!tokenResolved) {
          authWindow.webContents.executeJavaScript(`JSON.stringify(localStorage)`).then(data => {
            tokenResolved = true;
            try {
              resolve({ rawLocalStorage: JSON.parse(data) });
            } catch(e) {
              resolve({ rawLocalStorage: {} });
            }
            authWindow.close();
          }).catch(() => {
            tokenResolved = true;
            resolve({ rawLocalStorage: {} });
            authWindow.close();
          });
        }
      }
    });

    ipcMain.once('intercepted-token', (e, data) => {
      if (!tokenResolved && e.sender === authWindow.webContents) {
        tokenResolved = true;
        authWindow.close();
        resolve(data);
      }
    });

    ipcMain.once('intercepted-localstorage', (e, data) => {
      if (!tokenResolved && e.sender === authWindow.webContents) {
        try {
          const parsed = JSON.parse(data);
          const possibleTokens = Object.keys(parsed).filter(k => k.includes('token') || k.includes('Token') || k.includes('auth'));
          if (possibleTokens.length > 0) {
            tokenResolved = true;
            authWindow.close();
            resolve({ rawLocalStorage: parsed });
          }
        } catch(err) {}
      }
    });

    authWindow.on('closed', () => {
      if (!tokenResolved) {
        resolve(null);
      }
    });
  });
});

app.whenReady().then(() => {
  startServer();
  setTimeout(() => {
    createWindow();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    console.log('Killing server process...');
    serverProcess.kill();
  }
});
