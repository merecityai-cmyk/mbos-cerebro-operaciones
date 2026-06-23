import { readFileSync } from 'fs';

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
const PROJECT_ID = 'd6d41f0e-4501-404b-be29-0194504f2980';
const ENV_ID = '4cbb2a57-5761-453e-80e7-e40079ee5ec4';
const APP_URL = 'https://united-draft-hub-production.up.railway.app';
const CRON_SECRET = process.env.CRON_SECRET;

async function gql(query, variables) {
  const res = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RAILWAY_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function createCronJob({ name, schedule, endpoint }) {
  console.log(`\nCreando cron job: ${name}`);

  // 1. Create service
  const { serviceCreate } = await gql(`
    mutation($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id name }
    }
  `, {
    input: {
      projectId: PROJECT_ID,
      name,
      source: { image: 'curlimages/curl:8.7.1' },
    }
  });

  const serviceId = serviceCreate.id;
  console.log(`  ✓ Servicio creado: ${serviceId}`);

  // 2. Update service instance with cron schedule and start command
  await gql(`
    mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }
  `, {
    serviceId,
    environmentId: ENV_ID,
    input: {
      cronSchedule: schedule,
      startCommand: `curl -s -X POST ${APP_URL}${endpoint} -H "Authorization: Bearer ${CRON_SECRET}"`,
    }
  });

  console.log(`  ✓ Schedule configurado: ${schedule}`);
  console.log(`  ✓ Endpoint: ${endpoint}`);
  return serviceId;
}

const jobs = [
  { name: 'analisis-diario',    schedule: '0 12 * * *',   endpoint: '/api/cron/analyze-conversations' },
  { name: 'reportes-semanales', schedule: '0 13 * * 1',   endpoint: '/api/cron/generate-reports' },
  { name: 'sync-ghl',           schedule: '*/30 * * * *', endpoint: '/api/cron/sync-ghl-tasks' },
];

for (const job of jobs) {
  await createCronJob(job);
}

console.log('\n✅ Los 3 cron jobs creados exitosamente.');
