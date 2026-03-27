# KatalythOne

**KatalythOne** es una plataforma integral de gestión empresarial construida con tecnologías modernas. Permite gestionar empresas, clientes, proyectos, inventario, gastos, ingresos y mucho más.

## 📋 Requisitos previos

Antes de comenzar, asegúrate de tener instalado lo siguiente en tu computadora:

- **Node.js** (versión 18 o superior): [Descargar](https://nodejs.org/)
  - Puedes verificar tu versión ejecutando: `node --version`
- **npm** (generalmente viene con Node.js) o **yarn**/**pnpm** como alternativa
  - Verifica con: `npm --version`
- **PostgreSQL** (versión 12 o superior): [Descargar](https://www.postgresql.org/download/)
  - Debes tener acceso a una instancia de PostgreSQL (local o remota)

## 🚀 Instalación rápida (5 pasos)

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/itsnicolasrl/KatalythOne.git
cd KatalythOne
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

O si prefieres usar yarn o pnpm:

```bash
yarn install
# o
pnpm install
```

### 3️⃣ Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local`:

```bash
# En Windows (PowerShell)
Copy-Item .env.example .env.local

# O en Linux/Mac
cp .env.example .env.local
```

**Luego, abre `.env.local` y actualiza las siguientes variables:**

#### Variables de Base de Datos (OBLIGATORIO)

```env
# Formato: postgresql://USUARIO:CONTRASEÑA@HOST:PUERTO/NOMBRE_DB?schema=public
# Ejemplo local:
DATABASE_URL="postgresql://postgres:password@localhost:5432/katalyth_dev?schema=public"

# Ejemplo remoto (Vercel, Railway, etc):
DATABASE_URL="postgresql://user:password@db.provider.com:5432/dbname?schema=public"
```

#### Variables de Autenticación (OBLIGATORIO)

```env
# Secreto JWT (genera uno largo y aleatorio, mínimo 32 caracteres)
# Puedes usar: openssl rand -base64 32 (en Mac/Linux)
AUTH_JWT_SECRET="tu_secreto_muy_largo_y_aleatorio_aqui"

# Expiración del token de acceso
AUTH_JWT_EXPIRES_IN=15m

# Nombres de las cookies
AUTH_COOKIE_NAME=katalyth_token
AUTH_REFRESH_COOKIE_NAME=katalyth_refresh_token

# Expiración del token de refresco
AUTH_REFRESH_EXPIRES_IN=30d

# En desarrollo (HTTP local): false
# En producción (HTTPS): true
AUTH_COOKIE_SECURE=false
```

#### Variables de la Aplicación (OBLIGATORIO)

```env
# URL base de tu aplicación
# Local: http://localhost:3000
# Producción: https://tudominio.com
APP_BASE_URL="http://localhost:3000"
```

#### Variables opcionales

```env
# Facturación (simula pagos sin integración externa)
BILLING_SIMULATED_MODE=true

# Secreto para limpieza automática de cuentas
ACCOUNT_DELETION_CRON_SECRET="secreto_para_cron"
```

### 4️⃣ Configurar la base de datos

#### Opción A: Base de datos PostgreSQL local (recomendado para desarrollo)

Si tienes PostgreSQL instalado localmente:

```bash
# Crea la base de datos (si no existe)
createdb katalyth_dev

# Actualiza DATABASE_URL en .env.local a:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/katalyth_dev?schema=public"
```

#### Opción B: Base de datos remota

- **Railway**: [Railway.app](https://railway.app/) - Copia la URL de conexión
- **Vercel Postgres**: [Vercel Postgres](https://vercel.com/storage/postgres)
- **Supabase**: [Supabase.com](https://supabase.com/)
- **AWS RDS**: [AWS RDS](https://aws.amazon.com/rds/)

Luego actualiza `DATABASE_URL` en `.env.local` con tu URL de conexión.

### 5️⃣ Aplicar migraciones de base de datos

```bash
npm run prisma:migrate:dev
```

Este comando:
- Aplica las migraciones existentes
- Genera el cliente Prisma
- Sincroniza tu esquema de base de datos

## 🏃 Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

Para detener el servidor, presiona `Ctrl + C` en la terminal.

## 📚 Scripts disponibles

| Comando | Descripción |
|---------|------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Compila la aplicación para producción |
| `npm start` | Inicia servidor de producción |
| `npm run lint` | Ejecuta ESLint para verificar errores de código |
| `npm test` | Ejecuta tests (una vez) |
| `npm run test:watch` | Ejecuta tests en modo observación |
| `npm run prisma:generate` | Regenera cliente Prisma |
| `npm run prisma:migrate:dev` | Crea y aplica migraciones |
| `npm run prisma:studio` | Abre Prisma Studio (interfaz gráfica de BD) |

## 🏗️ Estructura del proyecto

```
KatalythOne/
├── app/                    # Rutas y componentes Next.js (App Router)
│   ├── api/               # Rutas API REST
│   ├── dashboard/         # Dashboard principal
│   ├── login/             # Página de login
│   ├── register/          # Página de registro
│   └── ...
├── src/
│   ├── api/               # Lógica de autenticación y HTTP
│   ├── db/                # Configuración de Prisma
│   ├── lib/               # Utilidades y funciones auxiliares
│   ├── server/            # Lógica del servidor
│   ├── services/          # Servicios de negocio
│   └── ui/                # Componentes UI reutilizables
├── prisma/
│   ├── schema.prisma      # Definición del modelo de datos
│   └── migrations/        # Historial de migraciones
├── tests/                 # Tests unitarios e integración
├── public/                # Archivos estáticos
├── .env.example           # Plantilla de variables de entorno
└── package.json           # Dependencias y scripts
```

## 🔧 Troubleshooting

### Error: "ECONNREFUSED" - No puedo conectarme a la base de datos

**Problema**: La aplicación no puede conectarse a PostgreSQL.

**Solución**:
1. Verifica que PostgreSQL esté corriendo:
   - Windows: Abre servicios y busca "PostgreSQL"
   - Linux/Mac: `pg_isready`
2. Verifica `DATABASE_URL` en `.env.local`
3. Prueba la conexión: `psql "postgresql://USER:PASSWORD@HOST:5432/DB_NAME"`

### Error: "PRISMA not found" o "Prisma Client not generated"

**Solución**:
```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev

```

### Las migraciones no se aplican

**Solución**:
```bash
# Regenera el cliente y aplica migraciones
npm run prisma:generate
npm run prisma:migrate:dev

# O si necesitas ver el estado:
npm run prisma:studio
```

## 🚀 Deployment

### Desplegar en Vercel (recomendado)

1. Push tu código a GitHub
2. Ve a [Vercel.com](https://vercel.com)
3. Conecta tu repositorio
4. Configura variables de entorno:
   - `DATABASE_URL`
   - `AUTH_JWT_SECRET`
   - `AUTH_COOKIE_SECURE=true`
   - `APP_BASE_URL=https://tudominio.vercel.app`
5. Deploy

### Desplegar en tu propio servidor

```bash
# En el servidor
npm install
npm run build
npm start
```

### Variables de entorno en producción

**IMPORTANTE**: En producción, SIEMPRE:
- ✅ Usa URLs seguras (HTTPS)
- ✅ Establece `AUTH_COOKIE_SECURE=true`
- ✅ Usa valores aleatorios fuertes para secretos
- ✅ No incluyas `.env.local` en el repositorio

## 📖 Tecnologías

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Runtime**: Node.js
- **BD**: [PostgreSQL](https://www.postgresql.org/) con [Prisma ORM](https://www.prisma.io/)
- **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Auth**: JWT + Cookies HTTP-only
- **Testing**: [Vitest](https://vitest.dev/)
- **Linting**: [ESLint](https://eslint.org/)
- **Internacionalización**: [next-intl](https://next-intl-docs.vercel.app/)
