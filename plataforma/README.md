# Plataforma Pixel Burger

App para clientes (pedir domicilio, sumar XP, jugar la garra, códigos, ranking de la Misión Pixel) y panel para el personal. Funciona en el navegador y se instala en el celular como app (PWA), sin tiendas de aplicaciones.

| Parte | Tecnología | Carpeta |
|---|---|---|
| App web / PWA | Next.js 16 + React 19 + Tailwind 4 | `web/` |
| Base de datos, inicio de sesión, tiempo real | Supabase (Postgres) | `supabase/` |
| Pruebas de seguridad de la base de datos | Node + PGlite | `supabase/tests/` |

## Modelo de seguridad (lo importante)

- **El celular nunca suma XP.** La XP y las fichas solo se escriben desde funciones del servidor (`SECURITY DEFINER`) que validan quién llama y con qué límites. La app no tiene permiso de escribir en ninguna tabla.
- **Libros contables de solo inserción** (`xp_ledger`, `ficha_ledger`) con claves de idempotencia: un mismo pedido, ticket, código o partida nunca suma dos veces.
- **Row Level Security en todas las tablas**: cada cliente solo lee sus datos; el ranking expone solo alias y XP.
- **Precios y domicilio se calculan en el servidor**: el cliente solo envía qué productos y cuántos.
- **Juego:** el servidor gasta la ficha al empezar, valida duración, premio y topes al terminar (máximo 80 XP/día), y marca patrones de bot.
- **Códigos secretos** guardados como hash SHA-256 y con límite de 10 intentos por hora.
- **Personal y administradores**: roles en la base de datos; todas sus acciones quedan en `audit_log`.
- **Navegador**: CSP estricta con nonce por solicitud, HSTS, sin iframes, permisos de cámara solo para el escáner del panel.
- **Ley 1581**: autorización explícita, política de datos, edición de datos y borrado de cuenta desde el perfil.

Pruebas: `cd supabase/tests && npm install && npm test` → 15 escenarios de ataque y reglas de negocio.

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto en Supabase
1. Crear cuenta en https://supabase.com y un proyecto nuevo (región **São Paulo**, la más cercana a Medellín). Guarda la contraseña de la base de datos en un gestor de contraseñas.
2. **SQL Editor** → pegar y ejecutar `supabase/migrations/20261010000001_plataforma.sql`, luego `supabase/seed.sql`.
3. **Authentication → Providers → Email**: activado. En **Authentication → Email Templates → Magic Link** cambiar el cuerpo para que envíe el código:
   ```html
   <h2>Tu código de Pixel Burger</h2>
   <p>Escribe este código en la app: <b style="font-size:24px">{{ .Token }}</b></p>
   <p>Vence en 10 minutos. Si no fuiste tú, ignora este correo.</p>
   ```
4. **Authentication → Providers → Google** (opcional): crear credenciales OAuth en Google Cloud y pegar el Client ID y Secret. URL de redirección autorizada: la que muestra Supabase.
5. **Authentication → URL Configuration**: Site URL = la URL de la app (ej. `https://pixelburger.vercel.app`) y agregar `https://pixelburger.vercel.app/auth/callback` a Redirect URLs.
6. **Authentication → Rate limits / Attack protection**: activar CAPTCHA (Cloudflare Turnstile) antes del lanzamiento público.
7. **Project Settings → API**: copiar la **URL** y la **Publishable key**. ⚠️ Nunca usar la *secret / service_role key* en la app.

### 2. Correr la app en tu computador
```bash
cd web
cp .env.example .env.local   # y pega la URL y la publishable key
npm install
npm run dev
```
Abre http://localhost:3000.

### 3. Primer administrador
Entra a la app, crea tu jugador y en el SQL Editor de Supabase ejecuta:
```sql
update public.profiles set role = 'admin' where player_no = 1;
```
Desde el panel (`/staff` → Admin) ya puedes dar el rol de personal a tu equipo.

### 4. Publicar en internet (Vercel)
1. Importar el repositorio en https://vercel.com, con **Root Directory = `plataforma/web`**.
2. Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Deploy. Cada `git push` a `main` publica una versión nueva.

## Configuración del negocio (sin tocar código)

En Supabase → Table Editor:

| Tabla | Qué controla |
|---|---|
| `settings` → `xp` | XP por compra, hamburguesa extra, bonus Montañera, referidos, compras con XP por día |
| `settings` → `game` | XP por peluche, tope diario, bonus del álbum |
| `settings` → `campaign` | Nombre, premio y fechas de la Misión Pixel |
| `settings` → `store` | Abrir o cerrar pedidos (`open`) |
| `menu_items` | Productos, precios y disponibilidad |
| `delivery_zones` | Barrios con domicilio y su costo (**verificar con el mapa de domicilios**) |
| `levels` | Niveles y recompensas |

## Pendiente antes del lanzamiento

- Revisar con un abogado la política de datos (`/privacidad`) y las bases de la Misión (Coljuegos).
- Confirmar barrios y costo de domicilio en `delivery_zones`.
- Activar CAPTCHA en Supabase y agregar su dominio a la CSP (`web/src/proxy.ts`).
- Prueba completa con el equipo: pedido → panel → entregado → XP → juego.
