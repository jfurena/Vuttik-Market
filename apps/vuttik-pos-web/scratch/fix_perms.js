const fs = require('fs');
try {
  fs.chmodSync('Accesos/antigravity_rsa', 0o600);
  console.log('Successfully set permissions of Accesos/antigravity_rsa to 600.');
} catch (e) {
  console.error(e);
}
