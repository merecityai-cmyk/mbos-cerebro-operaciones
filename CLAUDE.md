# Johan Pérez NEX — Hub de Operaciones

Herramienta interna de gestión de tareas e inteligencia de clientes para la agencia de marketing Johan Pérez NEX.
Lee conversaciones de GHL, extrae tareas con Claude, las enruta al miembro del equipo correcto, y genera reportes semanales de satisfacción por cliente.

## Commands

- `pnpm dev` — Servidor de desarrollo en localhost:3000
- `pnpm build` — Build de producción
- `pnpm lint` — ESLint
- `pnpm drizzle-kit generate` — Generar migración desde cambios en schema.ts
- `pnpm drizzle-kit migrate` — Aplicar migraciones pendientes
- `npx tsx src/lib/db/seed.ts` — Cargar datos iniciales (usuarios, clientes, routing rules)

## Tech Stack

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Tremor + Railway PostgreSQL + Drizzle ORM + NextAuth v5 + Anthropic Claude API + GoHighLevel API v2

## Architecture

### Directory Structure
- `src/app/(dashboard)/` — Todas las páginas protegidas del dashboard
- `src/app/api/cron/` — Jobs diario y semanal (protegidos por CRON_SECRET)
- `src/app/api/cron/sync-ghl-tasks/` — Job de sync: consulta GHL API cada 30 min y reconcilia estados
- `src/components/` — Componentes organizados por dominio (tasks/, clients/, reports/, layout/)
- `src/lib/db/` — Schema Drizzle + cliente de base de datos
- `src/lib/ghl/` — Wrapper completo de la API de GoHighLevel
- `src/lib/ai/` — Prompts y funciones de análisis con Claude
- `src/lib/routing/` — Lógica de enrutamiento de tareas por keywords

### Data Flow
- Server Components hacen queries directas a DB via `src/lib/db/index.ts`
- Client Components usan SWR para revalidación y optimistic updates
- Los jobs se activan **manualmente** desde el dashboard (scheduler automático deshabilitado)
- Job sync cada 30 min: consulta GHL API por cada tarea activa y reconcilia estados con DB

### Key Patterns
- Server Components por defecto. Solo agregar "use client" cuando el componente necesita estado o eventos del browser
- Todas las queries pasan por `src/lib/db/index.ts` (nunca instanciar Drizzle directo)
- Todos los prompts de Claude están centralizados en `src/lib/ai/prompts.ts`
- Las reglas de routing se leen de la DB primero; las DEFAULT_RULES de `routing-rules.ts` son el fallback
- Zona horaria: siempre usar UTC en la DB, convertir a America/Bogota solo en el display
- `offerContext` en cada cliente describe los servicios activos — se pasa al prompt de extracción de tareas

## Modo Manual de Jobs

El scheduler automático está **deshabilitado**. Johan activa los jobs desde el dashboard.
No hay cron automático en producción. Para correr el análisis manualmente:
- Dashboard → botón "Analizar conversaciones" → llama `/api/cron/daily-analysis`
- Todos los endpoints cron siguen requiriendo `Authorization: Bearer CRON_SECRET`

## Equipo del Sistema

| Nombre | Email | Rol | GHL User ID |
|--------|-------|-----|-------------|
| Johan | johan@johanpereznex.com | manager | PENDING_JOHAN_GHL_ID |
| Editor | editor@johanpereznex.com | advisor | PENDING_EDITOR_GHL_ID |
| Sari | sari@johanpereznex.com | advisor | PENDING_SARI_GHL_ID |
| Vanina | vanina@johanpereznex.com | advisor | PENDING_VANINA_GHL_ID |
| SellerChat | sellerchat@johanpereznex.com | advisor | PENDING_SELLERCHAT_GHL_ID |
| Tráfico | trafico@johanpereznex.com | advisor | PENDING_TRAFICO_GHL_ID |

**Pendiente:** reemplazar todos los `PENDING_*_GHL_ID` con los IDs reales de GHL una vez disponibles.

## Task Routing Rules (Default)

- "edición", "video", "reels", "montaje" → Editor
- "contenido", "post", "redes", "instagram", "tiktok", "copy" → Sari
- "agendar", "cita", "reunión", "llamada" → Vanina
- "whatsapp", "sellerchat", "bot", "flujo", "automatización" → SellerChat
- "pauta", "ads", "publicidad", "campaña", "inversión" → Tráfico
- "cobro", "factura", "pago", "deuda" → Johan
- Sin match → asesor asignado al cliente

## Tipos de Tarea

| taskType | Descripción |
|----------|-------------|
| `edicion_video` | Edición, corte, montaje de video |
| `redes_contenido` | Posts, stories, copy, calendario de contenido |
| `agendamiento` | Citas, reuniones, llamadas, recordatorios |
| `whatsapp_sistema` | Automatizaciones, flujos, configuración SellerChat |
| `pauta_ads` | Campañas Meta Ads, presupuestos, optimización |
| `cobro_factura` | Cobros, facturas, seguimiento de pagos |

## Fathom (Próximo)

Conectar Fathom cuando Johan entregue el API token.
Crear job en `src/app/api/cron/analyze-fathom/route.ts`.
El enum `task_source` ya incluye `'fathom'` para cuando esté listo.

## Design System

### Colors
- Primary: `#1E40AF` — botones, links, accents
- Background: `#F8FAFC` — fondo de página
- Surface: `#FFFFFF` — cards y panels
- Success: `#16A34A` — completado, satisfacción alta
- Warning: `#D97706` — próximo a vencer, satisfacción media
- Destructive: `#DC2626` — vencido, satisfacción baja

### Typography
- Fuente: Inter (Next.js font optimization)
- Headings: 600 weight; Body: 14px / 400 weight; Labels: 12px / 500 weight

### Style
- Border radius: 6px default, 8px cards
- Sin animaciones de entrada. Funcionalidad sobre estética.
- Tablas densas con tipografía clara

## Environment Variables

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL Railway |
| `AUTH_SECRET` | Secret para NextAuth JWT |
| `NEXTAUTH_URL` | URL base de la app |
| `GHL_API_KEY` | API Key de GoHighLevel |
| `GHL_LOCATION_ID` | Location ID de la subcuenta Johan NEX en GHL |
| `ANTHROPIC_API_KEY` | API Key Anthropic |
| `CRON_SECRET` | Token de autorización para endpoints cron |

## Reglas No Negociables

1. TypeScript strict mode. Sin `any` types. Sin excepciones.
2. Los endpoints `/api/cron/*` SIEMPRE validan `Authorization: Bearer CRON_SECRET` primero.
3. Nunca romper el job completo por un cliente que falla — try/catch por cliente, loguear y continuar.
4. Todas las fechas se almacenan en UTC. Se convierten a America/Bogota solo en el display.
5. Al crear una tarea en DB, SIEMPRE crearla también en GHL en la misma operación (no son opcionales el uno sin el otro).
6. La sincronización con GHL es pull, no push. El job `sync-ghl-tasks` consulta GHL cada 30 min. No hay webhooks. Si alguien cambia un estado en GHL, se refleja en la próxima corrida del job.
