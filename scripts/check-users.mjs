import postgres from 'postgres';

const sql = postgres('postgresql://postgres:uyHOYVnYxzOKVRKaNbIFzWADTVVCxgNL@acela.proxy.rlwy.net:35899/railway');
const users = await sql`SELECT id, name, email, role, LEFT(password_hash, 30) as hash_preview FROM users`;
console.table(users);
await sql.end();
