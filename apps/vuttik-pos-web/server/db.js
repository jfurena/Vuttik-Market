import pg from 'pg';

const SUPABASE_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const pool = new pg.Pool({
    connectionString: SUPABASE_DB_URL,
    max: 20, // max connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle pg client', err);
});

export async function initDB() {
    console.log('PostgreSQL (Supabase) Database connected via proxy adapter.');
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log('Postgres connection test:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('Error connecting to Postgres:', err.stack);
    }
}

// Convert SQLite query syntax `?` to Postgres syntax `$1, $2`
// Also handle `INSERT OR IGNORE` and `INSERT OR REPLACE`
function convertQuery(sql) {
    let pgSql = sql;
    
    // Check for INSERT OR IGNORE / REPLACE BEFORE replacing `?`
    // Postgres equivalent of INSERT OR IGNORE
    if (pgSql.match(/^INSERT OR IGNORE INTO/i)) {
        pgSql = pgSql.replace(/^INSERT OR IGNORE INTO/i, 'INSERT INTO');
        // Simple append ON CONFLICT DO NOTHING (assumes no RETURNING at the end)
        pgSql += ' ON CONFLICT DO NOTHING';
    } 
    // Postgres equivalent of INSERT OR REPLACE
    else if (pgSql.match(/^INSERT OR REPLACE INTO/i)) {
        // Full upsert syntax requires knowing the conflict target (e.g. PRIMARY KEY) and the columns.
        // It's very complex to regex. Instead, we can just change to INSERT INTO and let the run() catch the error and execute an UPDATE.
        // For simplicity, we just turn it into a regular INSERT and handle the conflict in JS if needed.
        // Since we cannot easily know the conflict target, we'll replace with INSERT INTO and add ON CONFLICT DO NOTHING as a fallback,
        // or we handle it in the execute wrapper.
        // Let's just do INSERT INTO and catch the unique constraint error.
        pgSql = pgSql.replace(/^INSERT OR REPLACE INTO/i, 'INSERT INTO');
    }

    let i = 1;
    return pgSql.replace(/\?/g, () => `$${i++}`);
}

export async function run(sql, params = []) {
    const isReplace = /^INSERT OR REPLACE/i.test(sql);
    const pgSql = convertQuery(sql);
    const client = await pool.connect();
    try {
        await client.query(pgSql, params);
        return { changes: 1, lastID: null };
    } catch (err) {
        // Error 23505 is unique_violation in Postgres
        if (err.code === '23505' && isReplace) {
            // We need to do an UPDATE instead.
            // This is a naive workaround since we don't have an AST parser.
            // Most REPLACE INTO in the codebase have the first param as ID.
            try {
                const tableMatch = sql.match(/INTO\s+([a-zA-Z0-9_]+)/i);
                if (tableMatch) {
                    const table = tableMatch[1];
                    const columnsMatch = sql.match(/\((.*?)\)/);
                    if (columnsMatch) {
                        const columns = columnsMatch[1].split(',').map(c => c.trim());
                        // build UPDATE query dynamically
                        const updateCols = columns.map((col, idx) => `${col} = $${idx+1}`).join(', ');
                        const updateSql = `UPDATE ${table} SET ${updateCols} WHERE ${columns[0]} = $1`;
                        await client.query(updateSql, params);
                        return { changes: 1, lastID: null };
                    }
                }
            } catch (updateErr) {
                console.error('Failed to fallback UPDATE:', updateErr);
                throw updateErr;
            }
        } else if (err.code === '23505' && /^INSERT OR IGNORE/i.test(sql)) {
            // Do nothing, we handled it with ON CONFLICT DO NOTHING or catching here.
            return { changes: 0, lastID: null };
        } else {
            console.error('Error in run():', err, 'SQL:', pgSql, 'Params:', params);
            throw err;
        }
    } finally {
        client.release();
    }
}

export async function all(sql, params = []) {
    const pgSql = convertQuery(sql);
    const client = await pool.connect();
    try {
        const res = await client.query(pgSql, params);
        return res.rows;
    } catch (err) {
        console.error('Error in all():', err, 'SQL:', pgSql, 'Params:', params);
        throw err;
    } finally {
        client.release();
    }
}

export async function get(sql, params = []) {
    const pgSql = convertQuery(sql);
    const client = await pool.connect();
    try {
        const res = await client.query(pgSql, params);
        return res.rows[0]; 
    } catch (err) {
        console.error('Error in get():', err, 'SQL:', pgSql, 'Params:', params);
        throw err;
    } finally {
        client.release();
    }
}
