const { ipcRenderer } = require('electron');

// Intercept network requests to capture tokens (e.g. Firebase or custom REST)
const origFetch = window.fetch;
window.fetch = async (...args) => {
  const res = await origFetch(...args);
  const url = args[0]?.toString() || '';
  
  if (url.includes('identitytoolkit.googleapis.com') || url.includes('/api/auth/login') || url.includes('verifyAssertion') || url.includes('/auth/google')) {
    const clone = res.clone();
    clone.json().then(data => {
      if (data.idToken || data.token) {
        ipcRenderer.send('intercepted-token', data);
      }
    }).catch(() => {});
  }
  return res;
};

// Also poll localStorage just in case
setInterval(() => {
  const data = JSON.stringify(localStorage);
  if (data.includes('"token"') || data.includes('idToken')) {
    ipcRenderer.send('intercepted-localstorage', data);
  }
}, 2000);
