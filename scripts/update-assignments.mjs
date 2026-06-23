import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL)

const advisors = await sql`SELECT id, name FROM users WHERE role IN ('advisor','manager') ORDER BY name`
const clients = await sql`SELECT id, name FROM clients ORDER BY name`

console.log('Advisors:', advisors.map(a => `${a.name} (${a.id.slice(0,8)})`))
console.log('\nAll clients:')
clients.forEach(c => console.log(' -', c.name))

// Exact name → advisor
const map = {
  // Laura
  'Aurora - Admin & Contable': 'Laura',
  'ADM CG DECORATION GROUP': 'Laura',
  'ADM ELEVAPPS': 'Laura',
  'ADM FONTAHOGAR': 'Laura',
  'CONCILIACIÓN FONTAHOGAR': 'Laura',
  'ADM MAESTRÍA PARA EL ALMA': 'Laura',
  'Admin Mamut Rojo': 'Laura',
  'Mamut Rojo Administración y Contabilidad': 'Laura',
  'ADM MERECITY': 'Laura',
  'ADM UPZEN': 'Laura',
  // Mariana
  'ADM ACADEMIA EME': 'Mariana',
  'Adm. Anabeauty': 'Mariana',
  'Adminístrate': 'Mariana',
  'ADM DIGITAL VIBES SAS': 'Mariana',
  'Contabilidad DigitalVbs': 'Mariana',
  'ADM DOCVETS': 'Mariana',
  'Contabilidad Restrepo': 'Mariana',
  'ADM RL BUSINESS': 'Mariana',
  // Norexis
  'ADM EL MUNDO DE MAGORI': 'Norexis',
  'Contabilidad Admin Happy': 'Norexis',
  'ADM NOVUS LAUNCH SAS': 'Norexis',
  'ADM PYMELO': 'Norexis',
  'Admin. KUGRA': 'Norexis',
  'United Adm Emp HB y BTI': 'Norexis',
}

const advisorId = (name) => advisors.find(a => a.name === name)?.id

let updated = 0
for (const client of clients) {
  const advisorName = map[client.name]
  if (!advisorName) { console.log(`⚠ No mapping for: ${client.name}`); continue }
  const id = advisorId(advisorName)
  if (!id) { console.log(`⚠ Advisor not found: ${advisorName}`); continue }
  await sql`UPDATE clients SET assigned_advisor_id = ${id}, updated_at = NOW() WHERE id = ${client.id}`
  console.log(`✓ ${client.name} → ${advisorName}`)
  updated++
}

console.log(`\n${updated}/${clients.length} clients updated`)
await sql.end()
