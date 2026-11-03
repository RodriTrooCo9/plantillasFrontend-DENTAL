# Lumina Odontología

Frontend de consultorio dental con Next.js App Router y TypeScript estricto. Conserva dominio, contratos de repositorio, adaptadores mock/HTTP y componentes UI compartidos.

## Ejecutar

```bash
npm install
cp .env.example .env.local
npm run dev
```

En modo demo (`NEXT_PUBLIC_DATA_SOURCE=mock`), usa `paciente@demo.com` o `dentista@demo.com`, contraseña `123456`. Son cuentas ficticias: los cambios del repositorio mock viven en memoria y se reinician al recargar. No uses datos reales en ese modo.

## Conectar NestJS

```env
NEXT_PUBLIC_DATA_SOURCE=http
API_URL=https://tu-servidor.example/api/v1
NEXT_PUBLIC_CLINIC_TIME_ZONE=America/Mexico_City
```

Configura la zona horaria real de la clínica también en NestJS. El valor anterior es un ejemplo y el predeterminado de la plantilla. Cambiar una variable `NEXT_PUBLIC_*` requiere reconstruir la aplicación en producción.

El navegador solicita `/api/backend` en el mismo origen. El proxy Next utiliza `API_URL`, transporta la cookie HttpOnly y excluye el refresh token del JSON entregado al navegador. El access token vive en memoria. Las rutas clínicas se verifican en servidor mediante `/auth/me` y el guard espera la sesión antes de montar consultas.

NestJS debe implementar el [contrato completo](docs/API_CONTRACT.md), incluidos sesión por cookie, autorización por recurso, disponibilidad atómica, auditoría del autor validado y confirmación del chat. No se proporciona un backend en este repositorio. No se acredita una integración real únicamente con la compilación o las pruebas sintéticas.

## Verificar

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test` ejecuta `node:test` con `tsx`, incluyendo lógica de dominio, mocks, DTOs, operaciones HTTP, proxy, rutas protegidas, flujo de contrato simulado y pruebas DOM de formularios/teclado. Las pruebas DOM usan jsdom; su soporte de diálogo se simula y no sustituye un navegador real.

La compilación usa Google Fonts y necesita acceso al proveedor si las fuentes no están en caché. La revisión visual, los escenarios pendientes y la evidencia por hallazgo están en [CORRECCIONES.md](docs/CORRECCIONES.md).

## Estructura

- `domain/`: entidades, reglas clínicas y validaciones de entrada.
- `data/repositories/`: interfaces; `data/mock/` y `data/http/`: implementaciones.
- `data/auth/`: validación en servidor y sesión compartida del cliente.
- `hooks/`: consultas con descarte de respuestas obsoletas y operaciones con bloqueo de envíos.
- `components/ui/`: controles, formulario asíncrono, estado de consulta, diálogo y pestañas.
- `features/`: odontograma y chatbot. Toda escritura del chat se confirma mediante `/chat`.
- `tests/`: pruebas permanentes y fixtures sintéticos.

Se retiraron el endpoint paralelo `/api/clinical-chat` y sus componentes alternativos. El frontend no consume una clave Gemini; el proveedor conversacional corresponde al backend del contrato.
