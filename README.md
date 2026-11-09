# Lumina Odontología — Full-Stack (Next.js 15 + NestJS 11 + Prisma + PostgreSQL)

Sistema clínico odontológico de punta a punta con **Next.js App Router** (Frontend) y **NestJS + Prisma + PostgreSQL** (Backend), con autenticación JWT + cookie `HttpOnly` (`lumina_refresh`), control de acceso por rol (`PACIENTE` y `DENTISTA`), odontograma interactivo de 32 piezas FDI con auditoría médica y asistente clínico con confirmación por token opaco.

---

## 1. Levantar todo el entorno en local

### Paso 1: Base de datos PostgreSQL (Docker)
Desde la raíz del proyecto:
```bash
docker compose up -d
```
Levanta `lumina_dental_postgres` en `localhost:5433` (base de datos `lumina_dental`).

### Paso 2: Backend NestJS (`./backend`)
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run seed
npm run start:dev
```
- **API Base**: `http://localhost:3001/api`
- **Swagger UI**: `http://localhost:3001/api/docs`

### Paso 3: Frontend Next.js (raíz)
En otra terminal, desde la raíz del proyecto:
```bash
cp .env.example .env.local
npm install
npm run dev
```
- **Aplicación Web**: `http://localhost:3000` (o el puerto asignado si el 3000 está ocupado en tu máquina).

---

## 2. Credenciales de Prueba (Seed PostgreSQL)

| Rol | Nombre | Correo | Contraseña | Destino |
| --- | --- | --- | --- | --- |
| **Dentista Admin** | Dr. Admin Principal | `admin@demo.com` | `123456` | `/dentista` (Agenda, bloqueo de horarios, directorio de todos los pacientes, edición de odontograma FDI de 32 piezas con auditoría, notas de historial y tratamientos) |
| **Paciente Ficticio 1** | Usuario Prueba 1 (`EXP-2026-9001`) | `prueba1@demo.com` | `123456` | `/paciente` (Expediente propio, odontograma 32 piezas solo lectura, historial, tratamientos y citas con Dr. Admin) |
| **Paciente Ficticio 2** | Usuario Prueba 2 (`EXP-2026-9002`) | `prueba2@demo.com` | `123456` | `/paciente` (Expediente propio, odontograma 32 piezas solo lectura, historial, tratamientos y citas con Dr. Admin) |
| **Paciente Demo** | Lucía Fernández Vega | `paciente@demo.com` | `123456` | `/paciente` |
| **Dentista Demo** | Dra. Valeria Mendoza | `dentista@demo.com` | `123456` | `/dentista` |

---

## 3. Verificación de Calidad y Pruebas

```bash
# En la raíz (Frontend):
npm run typecheck
npm run lint
npm test

# En ./backend (Backend NestJS):
cd backend
npm run typecheck
npm run build
```
