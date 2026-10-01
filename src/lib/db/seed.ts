/**
 * Seed script — Johan Pérez NEX
 *
 * Carga datos iniciales:
 * - 6 usuarios del equipo
 * - 9 clientes con ghlContactId placeholder
 * - Reglas de routing por tipo de tarea
 *
 * Uso: npx tsx src/lib/db/seed.ts
 *
 * IMPORTANTE: Los GHL Contact IDs de los clientes son placeholders.
 * Actualizar con los IDs reales antes de ir a producción:
 *   UPDATE clients SET ghl_contact_id = '<ID_REAL>' WHERE name = '<NOMBRE>';
 *
 * Los ghlUserId del equipo también son PENDING — reemplazar con los IDs reales de GHL.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import * as schema from './schema'

const connection = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(connection, { schema })

const INITIAL_PASSWORD = 'JohanNEX2025!'

// ─── Users ────────────────────────────────────────────────────────────────────

const USERS = [
  {
    name: 'Johan',
    email: 'johan@johanpereznex.com',
    role: 'manager' as const,
    ghlUserId: 'PENDING_JOHAN_GHL_ID',
  },
  {
    name: 'Editor',
    email: 'editor@johanpereznex.com',
    role: 'advisor' as const,
    ghlUserId: 'PENDING_EDITOR_GHL_ID',
  },
  {
    name: 'Sari',
    email: 'sari@johanpereznex.com',
    role: 'advisor' as const,
    ghlUserId: 'PENDING_SARI_GHL_ID',
  },
  {
    name: 'Vanina',
    email: 'vanina@johanpereznex.com',
    role: 'advisor' as const,
    ghlUserId: 'PENDING_VANINA_GHL_ID',
  },
  {
    name: 'SellerChat',
    email: 'sellerchat@johanpereznex.com',
    role: 'advisor' as const,
    ghlUserId: 'PENDING_SELLERCHAT_GHL_ID',
  },
  {
    name: 'Tráfico',
    email: 'trafico@johanpereznex.com',
    role: 'advisor' as const,
    ghlUserId: 'PENDING_TRAFICO_GHL_ID',
  },
]

// ─── Clients ─────────────────────────────────────────────────────────────────
// ghlContactId = placeholder — reemplazar con IDs reales de GHL

const CLIENT_NAMES = [
  'Cliente 1 NEX',
  'Cliente 2 NEX',
  'Cliente 3 NEX',
  'Cliente 4 NEX',
  'Cliente 5 NEX',
  'Cliente 6 NEX',
  'Cliente 7 NEX',
  'Cliente 8 NEX',
  'Cliente 9 NEX',
]

// ─── Routing Rules ────────────────────────────────────────────────────────────

const EDITOR_KEYWORDS = [
  'edición',
  'edicion',
  'video',
  'reels',
  'reel',
  'corte',
  'montaje',
  'editar',
]

const SARI_KEYWORDS = [
  'contenido',
  'post',
  'publicación',
  'publicacion',
  'redes',
  'instagram',
  'feed',
  'stories',
  'tiktok',
  'copy',
]

const VANINA_KEYWORDS = [
  'agendar',
  'agenda',
  'agendamiento',
  'cita',
  'reunión',
  'reunion',
  'llamada',
]

const SELLERCHAT_KEYWORDS = [
  'whatsapp',
  'sellerchat',
  'automatización',
  'automatizacion',
  'bot',
  'flujo',
]

const TRAFICO_KEYWORDS = [
  'pauta',
  'ads',
  'publicidad',
  'campaña',
  'campana',
  'meta ads',
  'inversión',
  'inversion',
]

const JOHAN_KEYWORDS = [
  'cobro',
  'factura',
  'pago',
  'deuda',
  'cobrar',
  'cuenta de cobro',
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed — Johan Pérez NEX...\n')

  // 1. Hashear contraseña
  console.log('🔐 Hasheando contraseñas...')
  const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 12)

  // 2. Insertar usuarios
  console.log('👤 Insertando usuarios...')
  const insertedUsers = await db
    .insert(schema.users)
    .values(
      USERS.map((u) => ({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        ghlUserId: u.ghlUserId,
      }))
    )
    .onConflictDoNothing()
    .returning()

  let allUsers = insertedUsers
  if (allUsers.length === 0) {
    console.log('  ⚠️  Usuarios ya existían — recuperando desde DB...')
    allUsers = await db.select().from(schema.users)
  }

  const userByName = Object.fromEntries(allUsers.map((u) => [u.name, u]))
  console.log(`  ✓ ${allUsers.length} usuarios listos`)
  allUsers.forEach((u) => console.log(`    - ${u.name} (${u.email}) [${u.role}]`))

  // 3. Insertar clientes — asignados a Johan como manager por defecto
  console.log('\n🏢 Insertando clientes...')
  const johanUser = userByName['Johan']
  if (!johanUser) throw new Error('Usuario Johan no encontrado')

  const clientsToInsert = CLIENT_NAMES.map((name) => ({
    name,
    ghlContactId: `PENDING_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    assignedAdvisorId: johanUser.id,
  }))

  const insertedClients = await db
    .insert(schema.clients)
    .values(clientsToInsert)
    .onConflictDoNothing()
    .returning()

  console.log(`  ✓ ${insertedClients.length} clientes insertados`)
  if (insertedClients.length === 0) {
    console.log('  ⚠️  Clientes ya existían — omitiendo')
  }

  // 4. Insertar reglas de routing
  console.log('\n🔀 Insertando reglas de routing...')
  const editor = userByName['Editor']
  const sari = userByName['Sari']
  const vanina = userByName['Vanina']
  const sellerChat = userByName['SellerChat']
  const trafico = userByName['Tráfico']
  const johan = userByName['Johan']

  if (!editor || !sari || !vanina || !sellerChat || !trafico || !johan) {
    throw new Error('No se encontraron todos los usuarios necesarios para routing rules')
  }

  const routingRules = [
    ...EDITOR_KEYWORDS.map((keyword, i) => ({ keyword, assignedToId: editor.id, priority: 10 + i })),
    ...SARI_KEYWORDS.map((keyword, i) => ({ keyword, assignedToId: sari.id, priority: 10 + i })),
    ...VANINA_KEYWORDS.map((keyword, i) => ({ keyword, assignedToId: vanina.id, priority: 10 + i })),
    ...SELLERCHAT_KEYWORDS.map((keyword, i) => ({ keyword, assignedToId: sellerChat.id, priority: 10 + i })),
    ...TRAFICO_KEYWORDS.map((keyword, i) => ({ keyword, assignedToId: trafico.id, priority: 10 + i })),
    ...JOHAN_KEYWORDS.map((keyword, i) => ({ keyword, assignedToId: johan.id, priority: 20 + i })),
  ]

  const insertedRules = await db
    .insert(schema.taskRoutingRules)
    .values(routingRules)
    .onConflictDoNothing()
    .returning()

  console.log(`  ✓ ${insertedRules.length} reglas de routing insertadas`)
  if (insertedRules.length === 0) {
    console.log('  ⚠️  Reglas ya existían — omitiendo')
  }

  // 5. Resumen final
  console.log('\n✅ Seed completado exitosamente!')
  console.log('\n📋 Resumen:')
  console.log(`   Usuarios:          ${allUsers.length}`)
  console.log(`   Clientes:          ${clientsToInsert.length} (ghlContactId = PENDING_*)`)
  console.log(`   Reglas routing:    ${routingRules.length}`)
  console.log('\n⚠️  IMPORTANTE:')
  console.log('   1. Actualizar ghlContactId con los IDs reales de GHL por cliente')
  console.log('   2. Actualizar ghlUserId del equipo con los IDs reales de GHL')
  console.log('   3. Agregar offerContext a cada cliente desde el dashboard')

  await connection.end()
}

main().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
