const fs = require('fs');
const file = 'apps/vuttik-pos-web/server/index.js';
let content = fs.readFileSync(file, 'utf8');

const target = "app.use('/api/auth', authRouter);";
const replacement = `app.use('/api/auth', authRouter);
app.use('/pos/api/auth', authRouter);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log('index.js patched successfully');
} else {
    console.log('Target not found in index.js');
}
