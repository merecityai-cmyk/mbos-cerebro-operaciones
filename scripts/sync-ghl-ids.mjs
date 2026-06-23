import postgres from 'postgres';

const GHL_API_KEY = 'pit-e3e75746-ebd9-470f-81b7-99fabc99633e';
const GHL_LOCATION_ID = 'NY5af4rnbL9QtpgfgZfR';
const DB_URL = 'postgresql://postgres:uyHOYVnYxzOKVRKaNbIFzWADTVVCxgNL@acela.proxy.rlwy.net:35899/railway';
const TAG = 'cliente united';

async function getAllUnitedClients() {
  const clients = [];
  let startAfterId = null;

  while (true) {
    const url = new URL(`https://services.leadconnectorhq.com/contacts/`);
    url.searchParams.set('locationId', GHL_LOCATION_ID);
    url.searchParams.set('limit', '100');
    if (startAfterId) url.searchParams.set('startAfterId', startAfterId);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        Version: '2021-07-28',
      },
    });

    const data = await res.json();
    const contacts = data.contacts ?? [];

    for (const c of contacts) {
      if (c.tags?.some(t => t.toLowerCase() === TAG)) {
        clients.push({ id: c.id, name: c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() });
      }
    }

    if (!data.meta?.startAfterId || contacts.length < 100) break;
    startAfterId = data.meta.startAfterId;
  }

  return clients;
}

// Normalize name for matching
function normalize(name) {
  return name.toLowerCase().replace(/[^a-záéíóúüñ\s]/gi, '').replace(/\s+/g, ' ').trim();
}

// Score similarity between two names
function similarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const wordsA = na.split(' '), wordsB = nb.split(' ');
  const common = wordsA.filter(w => wordsB.includes(w) && w.length > 2);
  return common.length / Math.max(wordsA.length, wordsB.length);
}

console.log('🔍 Obteniendo contactos de GHL con etiqueta "cliente united"...');
const ghlClients = await getAllUnitedClients();
console.log(`✓ ${ghlClients.length} contactos encontrados en GHL\n`);

const sql = postgres(DB_URL);
const dbClients = await sql`SELECT id, name, ghl_contact_id FROM clients ORDER BY name`;
console.log(`✓ ${dbClients.length} clientes en DB\n`);

const updates = [];
const unmatched = [];

for (const db of dbClients) {
  let best = null, bestScore = 0;
  for (const ghl of ghlClients) {
    const score = similarity(db.name, ghl.name);
    if (score > bestScore) { bestScore = score; best = ghl; }
  }
  if (bestScore >= 0.5) {
    updates.push({ dbId: db.id, dbName: db.name, ghlId: best.id, ghlName: best.name, score: bestScore });
  } else {
    unmatched.push(db.name);
  }
}

console.log(`📋 Matches encontrados: ${updates.length}`);
console.log(`⚠️  Sin match: ${unmatched.length}\n`);

if (updates.length > 0) {
  console.log('Actualizando DB...');
  for (const u of updates) {
    await sql`UPDATE clients SET ghl_contact_id = ${u.ghlId} WHERE id = ${u.dbId}`;
    console.log(`  ✓ ${u.dbName} → ${u.ghlId} (GHL: "${u.ghlName}", score: ${u.score.toFixed(2)})`);
  }
}

if (unmatched.length > 0) {
  console.log('\n⚠️  Clientes sin match en GHL:');
  unmatched.forEach(n => console.log(`  - ${n}`));
}

console.log('\n✅ Sync completado.');
await sql.end();
