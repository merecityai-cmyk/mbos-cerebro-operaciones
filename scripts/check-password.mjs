import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres('postgresql://postgres:uyHOYVnYxzOKVRKaNbIFzWADTVVCxgNL@acela.proxy.rlwy.net:35899/railway');
const [user] = await sql`SELECT password_hash FROM users WHERE email = 'direccion@udtgroup.co'`;
const match = await bcrypt.compare('UnitedDraft2025!', user.password_hash);
console.log('Password match:', match);
await sql.end();
