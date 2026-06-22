import { db, run, all } from './server/db.js';

async function update() {
  try {
    console.log('Updating transaction types and categories...');

    // Add new transaction types
    await run("INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)", ['offer_job', 'Ofrezco Empleo', 'Briefcase', 1]);
    await run("INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)", ['seek_job', 'Busco Empleo', 'Search', 1]);
    
    await run("INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)", ['offer_service', 'Ofrezco Servicio', 'Wrench', 1]);
    await run("INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)", ['seek_service', 'Busco Servicio', 'UserPlus', 1]);

    await run("INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)", ['rent_out', 'Pongo en Alquiler', 'Key', 1]);
    await run("INSERT OR REPLACE INTO vuttik_transaction_types (id, label, icon, active) VALUES (?, ?, ?, ?)", ['rent_in', 'Busco Alquilar', 'Home', 1]);

    // Update categories

    // Empleos & Tutorías -> Jobs
    await run("UPDATE vuttik_categories SET allowed_types = ? WHERE name IN ('Empleos', 'Tutorías')", [JSON.stringify(['offer_job', 'seek_job'])]);
    
    // Services
    const services = ['Asesoría', 'Mudanzas', 'Catering', 'Fotografía', 'Imprenta', 'Contabilidad', 'Notaría', 'Logística', 'Peluquería', 'Barbería', 'Sastrería', 'Lavandería', 'Veterinaria', 'Guarderías', 'Turismo', 'Mecánica'];
    for (const s of services) {
      await run("UPDATE vuttik_categories SET allowed_types = ? WHERE name = ?", [JSON.stringify(['offer_service', 'seek_service']), s]);
    }

    // Rentals / Inmuebles
    const rentals = ['Hospedaje', 'Almacenaje', 'Inmuebles', 'Terrenos', 'Locales', 'Oficinas'];
    for (const r of rentals) {
      // Inmuebles y locales also can be sold/bought
      if (['Inmuebles', 'Terrenos', 'Locales'].includes(r)) {
        await run("UPDATE vuttik_categories SET allowed_types = ? WHERE name = ?", [JSON.stringify(['sell', 'buy', 'rent_out', 'rent_in']), r]);
      } else {
        await run("UPDATE vuttik_categories SET allowed_types = ? WHERE name = ?", [JSON.stringify(['rent_out', 'rent_in']), r]);
      }
    }

    // Mixed Buy/Sell/Rent
    await run("UPDATE vuttik_categories SET allowed_types = ? WHERE name IN ('Vehículos', 'Maquinaria', 'Herramientas', 'Vestidos')", [JSON.stringify(['sell', 'buy', 'rent_out', 'rent_in'])]);

    console.log('Update completed!');
  } catch (err) {
    console.error('Error updating types:', err);
  }
}

update();
