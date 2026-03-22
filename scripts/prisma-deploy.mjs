import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function hasMigrations() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return false;

  // Si existe el directorio pero está vacío, tratamos como "sin migraciones"
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  return entries.some((e) => e.isDirectory() || e.isFile());
}

function run(cmd) {
  console.log(`\n[prisma-deploy] Ejecutando: ${cmd}\n`);
  execSync(cmd, { stdio: "inherit" });
}

const hasAnyMigrations = hasMigrations();

if (hasAnyMigrations) {
  run("npx prisma migrate deploy");
} else {
  console.warn(
    "[prisma-deploy] No se detectan migraciones en `prisma/migrations`. " +
      "Usando `prisma db push --accept-data-loss` (para producción idealmente commitea migraciones).",
  );
  run("npx prisma db push --accept-data-loss");
}

