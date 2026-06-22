const fs = require('fs');
let content = fs.readFileSync('db.js', 'utf8');

const target = `    )
  \`);
    try {
        await run("ALTER TABLE vuttik_subscription_plans`;

const replacement = `    )
  \`);
    // Business Requests Table
    await run(\`
    CREATE TABLE IF NOT EXISTS vuttik_business_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT,
      user_email TEXT,
      business_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  \`);
    try {
        await run("ALTER TABLE vuttik_subscription_plans`;

content = content.replace(target, replacement);
fs.writeFileSync('db.js', content, 'utf8');
console.log('db.js patched successfully');
