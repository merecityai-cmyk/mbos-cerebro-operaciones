import postgres from 'postgres';

const DB_URL = 'postgresql://postgres:uyHOYVnYxzOKVRKaNbIFzWADTVVCxgNL@acela.proxy.rlwy.net:35899/railway';

// Clients from GHL with "cliente united" tag (fetched via MCP)
const ghlClients = [
  { id: 'ZLTd09RTT3dtOSO9urbq', name: 'ADM CG DECORATION GROUP' },
  { id: 'rgF5muR7zRoBmfGYBlM0', name: 'ADM ELEVAPPS' },
  { id: 'UQheBiskpuLJmh27D2aE', name: 'Admin. KUGRA' },
  { id: 'AqgXKDyI1Lzs2jrJTLWR', name: 'Mamut Rojo Administración y Contabilidad' },
  { id: 'fPpfEzq6I48dnB7W6u9T', name: 'ADM MAESTRÍA PARA EL ALMA' },
  { id: '2ilFtXIoJq9DR0HCDvaA', name: 'Contabilidad Admin Happy' },
  { id: 'DlOdDyLo2zPBFn5hkH9b', name: 'Contabilidad DigitalVbs' },
  { id: 'ik2XBUyxpfZWUtDTPctX', name: 'Adm. Anabeauty' },
  { id: 'NyWyQM101sqT6AELqaLY', name: 'ADM ACADEMIA EME' },
  { id: '0OVzXotn45wqxzrqbsry', name: 'ADM DIGITAL VIBES SAS' },
  { id: '8g4PiiyxabKM9zCjZN1q', name: 'ADM NOVUS LAUNCH SAS' },
  { id: 'TaeospFpFQgYlTd2DZEv', name: 'ADM PYMELO' },
  { id: '9yG7DKx9XRIZBqD3YWWY', name: 'ADM RL BUSINESS' },
  { id: 'kZn7RJg6SBisVyXPY8le', name: 'Admin Mamut Rojo' },
  { id: 'Nlqn4de7uaSXssQhZVor', name: 'CONCILIACIÓN FONTAHOGAR' },
  { id: 'EywZVft9ZPp2ocDxkdJf', name: 'ADM UPZEN' },
  { id: 'puUnPEprn8EEAUXhqwKE', name: 'Adminístrate' },
  { id: 'EYthAib0WHn7Qf1NUX0d', name: 'Contabilidad Restrepo' },
  { id: 'ruPPadI8LpFQZ984CC84', name: 'Aurora - Admin & Contable' },
  { id: 'B9VDm94WIugWWSbuHO8g', name: 'ADM FONTAHOGAR' },
  { id: 'AVXCIT9mVfJw9s04idK3', name: 'United Adm Emp HB y BTI' },
  { id: 'NiBbJZdoAhBsPHBuRKvt', name: 'ADM EL MUNDO DE MAGORI' },
  { id: 'XZrTdonwFwr90HRM2te3', name: 'ADM DOCVETS' },
  { id: 'C5CTBLSV9Mx5I08ZGGOJ', name: 'ADM MERECITY' },
];

const sql = postgres(DB_URL);

// Get advisors to distribute clients
const advisors = await sql`SELECT id, name FROM users WHERE role = 'advisor' ORDER BY name`;
console.log(`👥 Asesores: ${advisors.map(a => a.name).join(', ')}`);

console.log('\n🗑️  Eliminando clientes ficticios del seed...');
await sql`DELETE FROM clients`;
console.log('  ✓ Clientes eliminados');

console.log('\n📥 Insertando 24 clientes reales de GHL...');
for (let i = 0; i < ghlClients.length; i++) {
  const client = ghlClients[i];
  const advisor = advisors[i % advisors.length]; // round-robin
  await sql`
    INSERT INTO clients (name, ghl_contact_id, assigned_advisor_id, created_at, updated_at)
    VALUES (${client.name}, ${client.id}, ${advisor.id}, NOW(), NOW())
  `;
  console.log(`  ✓ ${client.name} → ${advisor.name}`);
}

const count = await sql`SELECT COUNT(*) FROM clients`;
console.log(`\n✅ ${count[0].count} clientes cargados con GHL IDs reales.`);

await sql.end();
