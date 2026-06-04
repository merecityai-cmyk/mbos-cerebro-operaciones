# United Draft Internal Hub

Herramienta interna de gestión de tareas e inteligencia de clientes para United Draft S.A.S.
Lee conversaciones de GHL diariamente, extrae tareas con Claude, las enruta a la asesora correcta, y genera reportes semanales de satisfacción por cliente.

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
- Los jobs cron llaman GHL → Claude → DB → GHL (en ese orden)
- Job sync cada 30 min: consulta GHL API por cada tarea activa y reconcilia estados con DB

### Key Patterns
- Server Components por defecto. Solo agregar "use client" cuando el componente necesita estado o eventos del browser
- Todas las queries pasan por `src/lib/db/index.ts` (nunca instanciar Drizzle directo)
- Todos los prompts de Claude están centralizados en `src/lib/ai/prompts.ts`
- Las reglas de routing se leen de la DB primero; las DEFAULT_RULES de `routing-rules.ts` son el fallback
- Zona horaria: siempre usar UTC en la DB, convertir a America/Bogota solo en el display

## Usuarios del Sistema

| Nombre | Email | Rol | GHL User ID |
|--------|-------|-----|-------------|
| Laura | laura.sanchez@udtgroup.co | advisor | `80JYPfisuglrFL4dkfkx` |
| Mariana | mariana.ruiz@gmail.com | advisor | `VT1iSiL62I8cV1uATEwe` |
| Norexis | norexis@udtgroup.co | advisor | `xIPJ7wT4kZh5Q5EMYgCX` |
| Juan Diego | direccion@udtgroup.co | manager | `PlKnjNt3tb1Xrxor4U8t` |

## Task Routing Rules (Default)

- "impuestos", "dian", "retención", "retenciones", "declaración de renta", "renta", "iva", "tributario" → Norexis
- "seguridad social", "pila", "eps", "pensión", "pensiones", "arl", "planilla", "parafiscales" → Laura
- "juan diego" → Juan Diego
- Sin match → asesor asignado al cliente

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
| `GHL_LOCATION_ID` | Location ID de United Draft en GHL |
| `ANTHROPIC_API_KEY` | API Key Anthropic |
| `CRON_SECRET` | Token de autorización para endpoints cron |

## Reglas No Negociables

1. TypeScript strict mode. Sin `any` types. Sin excepciones.
2. Los endpoints `/api/cron/*` SIEMPRE validan `Authorization: Bearer CRON_SECRET` primero.
3. Nunca romper el job completo por un cliente que falla — try/catch por cliente, loguear y continuar.
4. Todas las fechas se almacenan en UTC. Se convierten a America/Bogota solo en el display.
5. Al crear una tarea en DB, SIEMPRE crearla también en GHL en la misma operación (no son opcionales el uno sin el otro).
6. La sincronización con GHL es pull, no push. El job `sync-ghl-tasks` consulta GHL cada 30 min. No hay webhooks. Si alguien cambia un estado en GHL, se refleja en la próxima corrida del job.
