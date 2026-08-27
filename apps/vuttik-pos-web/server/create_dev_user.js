import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.VUTTIK_DB_JSON_PATH || path.join(__dirname, 'db.json');

const email = 'jfurena02@gmail.com';
const password = '123456';
const name = 'Admin Furena';

async function createUser() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('Database file not found:', DB_FILE);
    return;
  }

  const raw = fs.readFileSync(DB_FILE, 'utf8');
  let db;
  try {
    db = JSON.parse(raw);
  } catch (err) {
    console.error('Error parsing DB:', err);
    return;
  }

  // Check if user already exists
  let user = db.owners.find((u) => u.correo === email);
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  if (user) {
    console.log('User already exists, updating password and role.');
    user.password = hashedPassword;
    user.rol = 'admin';
  } else {
    console.log('Creating new user.');
    user = {
      id: 'owner-' + Date.now() + '-' + uuidv4().slice(0, 8),
      nombre: name,
      correo: email,
      password: hashedPassword,
      rol: 'admin',
      estado: 'activo',
      fecha_creacion: new Date().toISOString()
    };
    db.owners.push(user);
  }

  // Assign user to the first business if a business exists and the user is not owner of any
  if (db.businesses && db.businesses.length > 0) {
    const biz = db.businesses[0];
    biz.owner_id = user.id;
    console.log('Assigned user as owner of business:', biz.nombre);
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log('User successfully created/updated.');
}

createUser().catch(console.error);
