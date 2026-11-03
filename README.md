# Lumina Odontología — Frontend Desacoplado (Next.js App Router + TypeScript)

Sistema web integral para consultorio odontológico diseñado bajo una **arquitectura limpia y estrictamente desacoplada**. Funciona de inmediato con datos simulados en memoria (`mock`) y está preparado para conectarse a un backend **NestJS** (`http`) mediante una variable de entorno sin modificar ninguna pantalla ni componente.

---

## Credenciales de Prueba (Modo Mock)

En la pantalla `/login` puedes hacer clic en los botones de acceso rápido o ingresar manualmente:

| Rol | Email | Contraseña | Acceso principal |
| :--- | :--- | :--- | :--- |
| **Paciente** | `paciente@demo.com` | `123456` | `/paciente` (Resumen, Historial e Informe de Odontograma en **solo lectura**, Tratamientos y Citas) |
| **Dentista** | `dentista@demo.com` | `123456` | `/dentista` (Agenda diaria/semanal, 5 Pacientes, **Odontograma FDI 32 dientes editable** con historial de auditoría, Evoluciones y Tratamientos) |

---

## Arquitectura de Capas

```text
/domain                # Entidades puras de negocio (Paciente, Dentista, Cita, Tratamiento, Odontograma, Diente, MensajeChat)
/data
  ├── repositories/    # Contratos/Interfaces (IAuthRepository, IPacientesRepository, ICitasRepository, IOdontogramaRepository, IChatRepository)
  ├── mock/            # Implementación en memoria con latencia simulada y semilla realista (2 dentistas, 5 pacientes, 32 dientes FDI)
  ├── http/            # Cliente HTTP único con interceptor JWT + Refresh y Mappers DTO -> Dominio para NestJS
  └── factory.ts       # Selector automático según NEXT_PUBLIC_DATA_SOURCE=mock|http
/hooks                 # Hooks de dominio (useAuth, usePacientes, useCitas, useOdontograma, useChatbot)
/styles/tokens.css     # Variables CSS (Design Tokens: colores, tipografía, espaciados, radios, estados clínicos)
/components/ui         # Primitivas UI propias desacopladas (Button, Card, Modal, Input, Select, Badge, Tabs)
/features
  ├── odontograma/     # Visor/Editor interactivo de los 32 dientes FDI (5 superficies por diente + bitácora de cambios)
  └── chatbot/         # Asistente transversal consciente del rol con tarjetas embebidas y confirmación de acciones sensibles
/app                   # Rutas Next.js App Router (/, /login, /paciente, /dentista) + middleware.ts de protección por rol
/docs/API_CONTRACT.md  # Especificación completa de endpoints para el backend NestJS
```

---

## Cómo ejecutar el proyecto

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno** (`.env.local` o `.env`):
   ```env
   NEXT_PUBLIC_DATA_SOURCE="mock"
   NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
   ```

3. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abrir `http://localhost:3000`.

4. **Ejecutar pruebas unitarias de lógica y repositorios**:
   ```bash
   npx tsx --test data/mock/repositories.test.ts
   ```

---

## Cómo cambiar de `mock` a `http` (Conexión con NestJS)

El cambio entre datos simulados y el backend real **no requiere tocar ningún componente React ni hook**:

1. Asegúrate de que tu servidor NestJS implemente los endpoints descritos en [`/docs/API_CONTRACT.md`](./docs/API_CONTRACT.md).
2. En tu archivo `.env.local`, cambia:
   ```env
   NEXT_PUBLIC_DATA_SOURCE="http"
   NEXT_PUBLIC_API_URL="https://tu-api-nestjs.com/api/v1"
   ```
3. Reinicia la aplicación. La fábrica [`/data/factory.ts`](./data/factory.ts) inyectará automáticamente `HttpAuthRepository`, `HttpPacientesRepository`, `HttpCitasRepository`, `HttpOdontogramaRepository` y `HttpChatRepository`.
4. Si la estructura JSON del backend cambia en el futuro (por ejemplo, si se divide en microservicios detrás de un API Gateway), solo debes ajustar los transformadores en [`/data/http/mappers.ts`](./data/http/mappers.ts).

---

## Cómo personalizar el Tema Visual o la Librería de UI

El diseño está desacoplado de plantillas externas mediante dos puntos únicos de control:

1. **Design Tokens (`/styles/tokens.css`)**:
   Modifica las variables CSS semánticas (`--color-bg-primary`, `--color-brand-primary`, `--color-tooth-caries`, `--radius-md`, etc.) para cambiar la paleta cromática, tipografías o radios de borde en toda la aplicación.
2. **Primitivas UI (`/components/ui/index.tsx`)**:
   Todas las pantallas consumen exclusivamente `Button`, `Card`, `Input`, `Select`, `Badge`, `Tabs` y `Modal` desde `/components/ui`. Si deseas reemplazar la implementación interna por otra librería de componentes, basta con editar `/components/ui/index.tsx` respetando sus props públicas.
