const fs = require('fs');
let file = fs.readFileSync('server/index.ts', 'utf8');

// The file currently has `/api/users/search` at the bottom (or wherever it was originally). Let's extract it.
const searchStart = file.indexOf("app.get('/api/users/search'");
const searchEnd = file.indexOf("});", searchStart) + 3;
const searchRouteStr = file.substring(searchStart, searchEnd);

if (searchStart === -1) {
    console.log("Could not find search route");
    process.exit(1);
}

// Remove it from the current location
file = file.substring(0, searchStart) + file.substring(searchEnd);

// Place it before `/api/users/:uid`
const uidStart = file.indexOf("app.get('/api/users/:uid'");
file = file.substring(0, uidStart) + searchRouteStr + '\n\n' + file.substring(uidStart);

fs.writeFileSync('server/index.ts', file);
console.log("Fixed search route!");
