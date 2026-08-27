import { get, run } from './db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const email = 'dev@vuttikpos.local';
const password = '123456';
const name = 'Admin POS';

async function createUser() {
  try {
    // Remove any existing user with this email
    await run('DELETE FROM vuttik_users WHERE email = ?', [email]);
    console.log('Cleared any previous dev user.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = uuidv4();

    await run(
      `INSERT INTO vuttik_users 
        (uid, display_name, email, password_hash, oauth_provider, role, email_verified, onboarding_completed, multi_business_approved)
       VALUES (?, ?, ?, ?, 'local', 'admin', 1, 1, 1)`,
      [uid, name, email, hashedPassword]
    );

    console.log('--------------------------------------------------');
    console.log('✅ Usuario de desarrollo creado exitosamente!');
    console.log(`   Correo:    ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

createUser();
