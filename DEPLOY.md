# Deploy a Railway — United Draft Hub

## 1. Crear proyecto en Railway

1. Ir a [railway.app](https://railway.app) → New Project
2. **Add PostgreSQL** → esperar que levante → copiar `DATABASE_URL`
3. **Add Service → GitHub Repo** → conectar este repositorio → branch `main`

## 2. Variables de entorno en Railway

En el servicio de la app → Variables → agregar todas:

```
DATABASE_URL        = (copiar de PostgreSQL service en Railway)
AUTH_SECRET         = (correr: openssl rand -base64 32)
NEXTAUTH_URL        = https://[tu-app].railway.app
GHL_API_KEY         = (tu API key de GoHighLevel)
GHL_LOCATION_ID     = (tu Location ID de GHL)
ANTHROPIC_API_KEY   = (tu API key de Anthropic)
CRON_SECRET         = (correr: openssl rand -base64 32)
```

## 3. Migraciones y seed

Desde tu máquina local con el DATABASE_URL de Railway en `.env.local`:

```bash
pnpm db:migrate      # aplica las migraciones
pnpm db:seed         # carga usuarios + clientes + routing rules
```

## 4. Cron Jobs en Railway

Railway → tu proyecto → Settings → Cron Jobs → Add Cron Job:

| Nombre | Expresión | Endpoint |
|--------|-----------|----------|
| Análisis diario | `0 7 * * *` | `POST /api/cron/analyze-conversations` |
| Reportes semanales | `0 13 * * 1` | `POST /api/cron/generate-reports` |
| Sync GHL | `*/30 * * * *` | `POST /api/cron/sync-ghl-tasks` |

Para cada cron job agregar el header:
```
Authorization: Bearer [valor de CRON_SECRET]
```

> Horarios en UTC. Colombia es UTC-5:
> - `0 7 * * *` = 2:00 AM Colombia (análisis diario)
> - `0 13 * * 1` = 8:00 AM Colombia lunes (reportes semanales)

## 5. Verificar deploy

```bash
# Test login
open https://[tu-app].railway.app/login

# Test job diario
curl -X POST https://[tu-app].railway.app/api/cron/analyze-conversations \
  -H "Authorization: Bearer [CRON_SECRET]"

# Test sync
curl -X POST https://[tu-app].railway.app/api/cron/sync-ghl-tasks \
  -H "Authorization: Bearer [CRON_SECRET]"
```

## 6. Usuarios para login

Contraseña inicial para todos: `UnitedDraft2025!`

| Usuario | Email | Rol |
|---------|-------|-----|
| Laura | laura.sanchez@udtgroup.co | Asesora |
| Mariana | mariana.ruiz@gmail.com | Asesora |
| Norexis | norexis@udtgroup.co | Asesora |
| Juan Diego | direccion@udtgroup.co | Gerente |

## 7. Configurar clientes en GHL

Antes de que el job diario funcione:
1. En GHL, agregar la etiqueta **"cliente united"** a cada contacto cliente activo
2. Actualizar `ghlContactId` en la DB con los IDs reales:
   ```sql
   UPDATE clients SET ghl_contact_id = '<ID_GHL>' WHERE name = '<NOMBRE>';
   ```
