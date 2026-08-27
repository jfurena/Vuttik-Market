const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/vuttik-pos-logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // allow localhost API requests
    }
  });

  Menu.setApplicationMenu(null); // Remove default menu

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, we load from the local Express server that serves the static files
    mainWindow.loadURL('http://localhost:3005');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startLocalServer() {
  // Set environment variables for the local server
  const env = { 
    ...process.env, 
    PORT: '3005', 
    NODE_ENV: isDev ? 'development' : 'production',
    VUTTIK_OFFLINE_MODE: 'true', // Flag to indicate offline portable mode
    VUTTIK_DB_JSON_PATH: path.join(app.getPath('userData'), 'vuttik_db.json'), // Keep DB in AppData
    ELECTRON_RUN_AS_NODE: '1' // CRITICAL: Run electron as a normal node instance
  };

  const scriptPath = path.join(__dirname, '../dist-server/index.cjs');

  // Spawn the internal Node.js version packaged with Electron
  serverProcess = spawn(process.execPath, [scriptPath], {
    env,
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Local Server]: ${data.toString()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Local Server Error]: ${data.toString()}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Local server exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  startLocalServer();
  
  // Wait a bit for the server to start before creating the window
  setTimeout(createWindow, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
