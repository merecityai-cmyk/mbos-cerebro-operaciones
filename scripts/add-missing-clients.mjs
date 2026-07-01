import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL)

// Nuevos grupos GHL con prefijo válido (ADM/admin/UD-AZ) que no están en el sistema
const newClients = [
  { name: 'Admin Gema Academia', ghlContactId: 'DOTCgAQ896H6cxhjtCHX' },
  { name: 'Admin Juan Jasbon', ghlContactId: 'MtElcj3gy98Par1QLFA6' },
  { name: 'Admin Elevate Group', ghlContactId: 'ESKe3Ywoj3bp7CHZMiFl' },
  { name: 'Admin Maestria Para El Alma', ghlContactId: 'o7obL7SMDMKj4qt1DqeD' },
  { name: 'Admin Brandiando', ghlContactId: 'wYrN5vjzUJZdn3EeoqOY' },
  { name: 'Admin Brotherhood', ghlContactId: 'qcilGezcA0wOS8NLFOnS' },
  { name: 'Admin Black Wolf', ghlContactId: 'Mqm6OC90w9nHXCpoNS7O' },
  { name: 'Admin Automechanics', ghlContactId: '1zqDJJtBaeUAoviHeEhj' },
  { name: 'Admin Emprendedor Digital', ghlContactId: 'GdaZ041LkESRfOboaSLi' },
  { name: 'Admin Asesoria y Consultoria Transformar', ghlContactId: 'vvtf0qAeVHesZ5RAnUIB' },
  { name: 'UD-AZ ADM Brandiando, Aurora y Brother', ghlContactId: 'NYxjfnupzfbFvGaeJ34u' },
  { name: 'UD-AZ ADM Happy y United', ghlContactId: 'PkgPBwOnBP3cxkr2PTfO' },
]

// Obtener manager como responsable por defecto
const [manager] = await sql`SELECT id, name FROM users WHERE role = 'manager' LIMIT 1`
if (!manager) { console.error('No hay manager en el sistema'); process.exit(1) }
console.log(`Asignando nuevos clientes al gerente: ${manager.name}`)

// Verificar cuáles ya existen
const existing = await sql`SELECT ghl_contact_id FROM clients`
const existingIds = new Set(existing.map(r => r.ghl_contact_id))

let added = 0, skipped = 0
for (const client of newClients) {
  if (existingIds.has(client.ghlContactId)) {
    console.log(`⏭  Ya existe: ${client.name}`)
    skipped++
    continue
  }
  await sql`
    INSERT INTO clients (name, ghl_contact_id, assigned_advisor_id)
    VALUES (${client.name}, ${client.ghlContactId}, ${manager.id})
    ON CONFLICT (ghl_contact_id) DO NOTHING
  `
  console.log(`✓ Añadido: ${client.name}`)
  added++
}

console.log(`\n${added} clientes añadidos, ${skipped} ya existían`)
console.log(`Recuerda asignar las asesoras correctas en Configuración > Gestión de clientes`)
await sql.end()
