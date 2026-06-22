const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  socialLogin: (provider) => ipcRenderer.invoke('oauth-login', provider)
});
