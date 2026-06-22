const fs = require('fs');
let file = fs.readFileSync('server/index.ts', 'utf8');

// The original search route:
const searchTarget = `
// Search users — MUST be before /:uid route
app.get('/api/users/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json([]);
  }
  try {
    const rows = await all(
      \`SELECT uid, email, display_name, photo_url, role FROM vuttik_users 
       WHERE display_name LIKE ? OR email LIKE ? LIMIT 20\`,
      [\`%\${q}%\`, \`%\${q}%\`]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

// Remove searchTarget from the file (it might have slightly different spacing or comments)
const searchStart = file.indexOf("app.get('/api/users/search'");
const searchBlockStart = file.lastIndexOf("// Search users", searchStart);
const searchEnd = file.indexOf("});", searchStart) + 3;

if (searchStart === -1) {
    console.log("Could not find search route");
    process.exit(1);
}

const extractedSearchBlock = file.substring(searchBlockStart !== -1 ? searchBlockStart : searchStart, searchEnd);
file = file.replace(extractedSearchBlock, '');

// Place it before the /api/users/:uid block
const uidStart = file.indexOf("app.get('/api/users/:uid'");
file = file.substring(0, uidStart) + extractedSearchBlock + '\n\n' + file.substring(uidStart);

fs.writeFileSync('server/index.ts', file);
console.log("Fixed route safely!");
