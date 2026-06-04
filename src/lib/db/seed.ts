/**
 * Seed script — United Draft Internal Hub
 *
 * Carga datos iniciales:
 * - 4 usuarios (Laura, Mariana, Norexis, Juan Diego)
 * - 32 clientes con ghlContactId placeholder
 * - Reglas de routing iniciales
 *
 * Uso: npx tsx src/lib/db/seed.ts
 *
 * IMPORTANTE: Los GHL Contact IDs de los clientes son placeholders.
 * Actualizar con los IDs reales antes de ir a producción:
 *   UPDATE clients SET ghl_contact_id = '<ID_REAL>' WHERE name = '<NOMBRE>';
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import * as schema from './schema'

const connection = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(connection, { schema })

const INITIAL_PASSWORD = 'UnitedDraft2025!'

// ─── Users ────────────────────────────────────────────────────────────────────

const USERS = [
  {
    name: 'Laura',
    email: 'laura.sanchez@udtgroup.co',
    role: 'advisor' as const,
    ghlUserId: '80JYPfisuglrFL4dkfkx',
  },
  {
    name: 'Mariana',
    email: 'mariana.ruiz@gmail.com',
    role: 'advisor' as const,
    ghlUserId: 'VT1iSiL62I8cV1uATEwe',
  },
  {
    name: 'Norexis',
    email: 'norexis@udtgroup.co',
    role: 'advisor' as const,
    ghlUserId: 'xIPJ7wT4kZh5Q5EMYgCX',
  },
  {
    name: 'Juan Diego',
    email: 'direccion@udtgroup.co',
    role: 'manager' as const,
    ghlUserId: 'PlKnjNt3tb1Xrxor4U8t',
  },
]

// ─── Clients ─────────────────────────────────────────────────────────────────
// ghlContactId = placeholder — reemplazar con IDs reales de GHL

const CLIENT_NAMES = [
  'Abogados Ospina & Asociados',
  'Agropecuaria La Esperanza SAS',
  'Arquitectura y Diseño Moderno SAS',
  'Auto Partes El Rápido Ltda',
  'Carga Segura Transportes SAS',
  'Clínica Veterinaria San Paws',
  'Comercializadora Frutas del Valle',
  'Confecciones Textil Andina SAS',
  'Constructora Horizonte Verde',
  'Consultores Tecnología Digital SAS',
  'Dental Estética Sonrisa Perfecta',
  'Distribuidora Lácteos del Norte',
  'Editorial Palabras Vivas SAS',
  'Electrónica y Redes Conecta Ltda',
  'Eventos y Catering Celebrando SAS',
  'Farmacia y Droguería Salud Total',
  'Ferretería Industrial El Tornillo',
  'Gestión Ambiental Tierra Verde',
  'Inmobiliaria Propiedades Plus SAS',
  'Instituto Educativo Semillas',
  'Inversiones y Portafolios Capital',
  'Joyería y Relojería El Diamante',
  'Laboratorio Clínico BioAnalysis',
  'Logística y Almacenamiento MaxStore',
  'Manufactura Plásticos Innovación',
  'Optica Vision Clara SAS',
  'Panadería y Pastelería Dulce Arte',
  'Publicidad y Medios Creativos SAS',
  'Seguros y Riesgos Proteger Ltda',
  'Servicios de Aseo y Limpieza Clean',
  'Telecomunicaciones NetWork Solutions',
  'Turismo y Aventura Colombia Tours',
]

// ─── Routing Rules ────────────────────────────────────────────────────────────

// Keywords para Norexis (impuestos / DIAN)
const NOREXIS_KEYWORDS = [
  'impuestos',
  'dian',
  'retención',
  'retenciones',
  'declaración de renta',
  'renta',
  'iva',
  'tributario',
]

// Keywords para Laura (seguridad social / nómina)
const LAURA_KEYWORDS = [
  'seguridad social',
  'pila',
  'eps',
  'pensión',
  'pensiones',
  'arl',
  'planilla',
  'parafiscales',
]

// Keywords para Juan Diego (dirección)
const JUAN_DIEGO_KEYWORDS = ['juan diego']

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed...\n')

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

  // Si ya existían, recuperarlos
  let allUsers = insertedUsers
  if (allUsers.length === 0) {
    console.log('  ⚠️  Usuarios ya existían — recuperando desde DB...')
    allUsers = await db.select().from(schema.users)
  }

  const userByName = Object.fromEntries(allUsers.map((u) => [u.name, u]))
  console.log(`  ✓ ${allUsers.length} usuarios listos`)
  allUsers.forEach((u) => console.log(`    - ${u.name} (${u.email}) [${u.role}]`))

  // 3. Insertar clientes — distribuidos equitativamente entre asesoras
  console.log('\n🏢 Insertando clientes...')
  const advisors = [userByName['Laura'], userByName['Mariana'], userByName['Norexis']]

  const clientsToInsert = CLIENT_NAMES.map((name, i) => ({
    name,
    ghlContactId: `PENDING_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    assignedAdvisorId: advisors[i % 3].id,
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
  const norexis = userByName['Norexis']
  const laura = userByName['Laura']
  const juanDiego = userByName['Juan Diego']

  if (!norexis || !laura || !juanDiego) {
    throw new Error('No se encontraron todos los usuarios necesarios para routing rules')
  }

  const routingRules = [
    ...NOREXIS_KEYWORDS.map((keyword, i) => ({
      keyword,
      assignedToId: norexis.id,
      priority: 10 + i,
    })),
    ...LAURA_KEYWORDS.map((keyword, i) => ({
      keyword,
      assignedToId: laura.id,
      priority: 10 + i,
    })),
    ...JUAN_DIEGO_KEYWORDS.map((keyword, i) => ({
      keyword,
      assignedToId: juanDiego.id,
      priority: 20 + i,
    })),
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
  console.log('\n⚠️  IMPORTANTE: Actualizar los ghlContactId con los IDs reales de GHL')
  console.log('   SQL de ejemplo:')
  console.log("   UPDATE clients SET ghl_contact_id = '<ID_REAL>' WHERE name = '<NOMBRE>';")

  await connection.end()
}

main().catch((err) => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
