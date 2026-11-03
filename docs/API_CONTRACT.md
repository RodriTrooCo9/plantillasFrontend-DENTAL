# Contrato de API — Lumina Odontología (Frontend ↔ Backend NestJS)

Este documento especifica el contrato REST que espera el frontend desacoplado de **Lumina Odontología** cuando se configura `NEXT_PUBLIC_DATA_SOURCE=http` y `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`.

Toda comunicación se realiza a través de una **única URL base** (`NEXT_PUBLIC_API_URL`). El frontend desconoce si detrás existe un monolito NestJS, un API Gateway o microservicios.

---

## 1. Convenciones Generales

- **Base URL**: `${NEXT_PUBLIC_API_URL}` (ej. `http://localhost:4000/api/v1`)
- **Autenticación**: Header `Authorization: Bearer <accessToken>` y cookies `httpOnly` para refresh.
- **Roles del Sistema**:
  - `PACIENTE`: Acceso únicamente a sus propios recursos clínicos, odontograma en modo **solo lectura**, citas y tratamientos.
  - `DENTISTA`: Acceso al directorio clínico, agenda general, creación de evoluciones clínicas, gestión de tratamientos y **edición exclusiva del odontograma** con auditoría.
- **Formato de Fechas**: ISO-8601 (`YYYY-MM-DD` para fechas calendario, `YYYY-MM-DDTHH:mm:ss.sssZ` para marcas de tiempo).

---

## 2. Autenticación (`/auth`)

### `POST /auth/login`
Inicia sesión para paciente o dentista.
- **Acceso**: Público
- **Request Body**:
```json
{
  "email": "paciente@demo.com",
  "password": "123456"
}
```
- **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "user": {
    "id": "usr-pac-1",
    "email": "paciente@demo.com",
    "nombre_completo": "Sofía Mendoza",
    "rol": "PACIENTE",
    "paciente_id": "pac-1",
    "avatar_url": null
  }
}
```

### `POST /auth/refresh`
Renueva el `access_token` cuando expira (invocado automáticamente por el interceptor HTTP ante respuestas `401 Unauthorized`).
- **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```
- **Response `200 OK`**: Misma estructura que `/auth/login`.

### `POST /auth/forgot-password`
Envía instrucciones de recuperación de contraseña al correo registrado.
- **Acceso**: Público
- **Request Body**:
```json
{
  "email": "paciente@demo.com"
}
```
- **Response `200 OK`**:
```json
{
  "message": "Se han enviado las instrucciones de recuperación a tu correo electrónico."
}
```

### `POST /auth/logout`
Invalida la sesión activa.
- **Acceso**: Autenticado (`PACIENTE` | `DENTISTA`)
- **Response `200 OK`**: `{ "ok": true }`

---

## 3. Pacientes, Historial Clínico y Tratamientos (`/pacientes`)

### `GET /pacientes?q={busqueda}`
Lista todos los pacientes (con filtro opcional por nombre, documento o email).
- **Acceso**: `DENTISTA`
- **Response `200 OK`**: `PacienteDto[]`

### `GET /pacientes/:id`
Obtiene la ficha de un paciente por ID.
- **Acceso**: `DENTISTA` o el propio `PACIENTE`
- **Response `200 OK`**:
```json
{
  "id": "pac-1",
  "documento": "45892103",
  "nombre_completo": "Sofía Mendoza",
  "email": "paciente@demo.com",
  "telefono": "+52 55 4123 8910",
  "fecha_nacimiento": "1991-05-14",
  "grupo_sanguineo": "O+",
  "alergias": ["Penicilina", "Látex"],
  "condiciones_medicas": ["Bruxismo nocturno leve"],
  "alertas_clinicas": ["Alergia severa a Penicilina: usar Clindamicina o Azitromicina"],
  "fecha_registro": "2023-08-12",
  "odontologo_cabecera_id": "den-1"
}
```

### `GET /pacientes/:id/historial`
Lista cronológica de consultas, diagnósticos y procedimientos del paciente.
- **Acceso**: `DENTISTA` (lectura/escritura), `PACIENTE` (solo lectura)
- **Response `200 OK`**: `HistorialDto[]`

### `POST /pacientes/:id/historial`
Agrega una nueva evolución o nota de consulta al historial clínico.
- **Acceso**: `DENTISTA`
- **Request Body**:
```json
{
  "dentistaId": "den-1",
  "dentistaNombre": "Dra. Valeria Solís",
  "especialidad": "Rehabilitación Oral y Estética",
  "motivoConsulta": "Control de sensibilidad y ajuste oclusal",
  "diagnostico": "Pulpitis reversible en pieza 16",
  "procedimientoRealizado": "Sellado dentinarios y ajuste de punto de contacto",
  "notasEvolucion": "Paciente evoluciona favorablemente sin dolor espontáneo.",
  "dientesInvolucrados": [16],
  "indicacionesPostoperatorias": "Evitar alimentos muy fríos por 48h."
}
```
- **Response `201 Created`**: `HistorialDto`

### `GET /pacientes/:id/tratamientos`
Obtiene los planes de tratamiento del paciente con progreso, costo y sesiones.
- **Acceso**: `DENTISTA` | `PACIENTE`
- **Response `200 OK`**: `TratamientoDto[]`

### `POST /pacientes/:id/tratamientos`
Crea un nuevo plan de tratamiento para el paciente.
- **Acceso**: `DENTISTA`
- **Request Body**:
```json
{
  "servicioId": "srv-endodoncia",
  "nombre": "Endodoncia Molar 16 + Corona",
  "descripcion": "Tratamiento de conducto mecanizado y rehabilitación protésica.",
  "dienteNumero": 16,
  "dentistaId": "den-1",
  "dentistaNombre": "Dra. Valeria Solís",
  "costoTotal": 480,
  "sesionesTotales": 3,
  "proximaFechaSugerida": "2025-05-25"
}
```
- **Response `201 Created`**: `TratamientoDto`

### `PATCH /tratamientos/:id`
Actualiza el estado (`PLANIFICADO` | `EN_CURSO` | `FINALIZADO`), el número de sesiones completadas o el monto abonado.
- **Acceso**: `DENTISTA`
- **Request Body**:
```json
{
  "estado": "EN_CURSO",
  "sesionesCompletadas": 2
}
```
- **Response `200 OK`**: `TratamientoDto`

---

## 4. Servicios, Dentistas, Disponibilidad y Citas (`/servicios`, `/dentistas`, `/citas`)

### `GET /servicios`
Catálogo público de servicios odontológicos.
- **Acceso**: Público
- **Response `200 OK`**: `ServicioDto[]`

### `GET /dentistas`
Equipo de especialistas y sus horarios de atención.
- **Acceso**: Público
- **Response `200 OK`**: `DentistaDto[]`

### `GET /dentistas/:id/disponibilidad?fecha=YYYY-MM-DD`
Calcula los bloques horarios para una fecha, descontando citas confirmadas y bloqueos de agenda.
- **Acceso**: Público / Autenticado
- **Response `200 OK`**:
```json
[
  { "hora": "09:00", "disponible": true },
  { "hora": "10:00", "disponible": false, "motivoNoDisponible": "CITA_OCUPADA" },
  { "hora": "11:00", "disponible": false, "motivoNoDisponible": "BLOQUEO_DENTISTA" }
]
```

### `GET /dentistas/:id/bloqueos` & `POST /dentistas/:id/bloqueos`
Consulta o registra un bloqueo de horario propio del dentista (congreso, cirugía extensa, descanso).
- **Acceso**: `DENTISTA`
- **POST Body**:
```json
{
  "fecha": "2025-05-20",
  "horaInicio": "15:00",
  "horaFin": "17:00",
  "motivo": "Seminario de actualización en implantes"
}
```

### `GET /citas?pacienteId={id}&dentistaId={id}&fecha={YYYY-MM-DD}`
Lista citas filtradas por paciente, dentista o fecha.
- **Acceso**: `PACIENTE` (solo propias) | `DENTISTA` (todas)
- **Response `200 OK`**: `CitaDto[]`

### `POST /citas`
Agenda una nueva cita (directa o vinculada a la siguiente sesión de un tratamiento en curso).
- **Acceso**: `PACIENTE` | `DENTISTA`
- **Request Body**:
```json
{
  "pacienteId": "pac-1",
  "dentistaId": "den-1",
  "servicioId": "srv-limpieza",
  "tratamientoId": "trat-1",
  "fecha": "2025-05-22",
  "horaInicio": "10:00",
  "motivo": "Continuación de tratamiento / Sesión 2"
}
```
- **Response `201 Created`**: `CitaDto`

### `PATCH /citas/:id/cancelar`
Cancela una cita verificando la regla configurable de anticipación mínima (por defecto 24 horas para pacientes).
- **Acceso**: `PACIENTE` | `DENTISTA`
- **Request Body**: `{ "motivoCancelacion": "Imprevisto laboral" }`
- **Response `200 OK`**: `CitaDto` (o `400 Bad Request` si incumple la regla de 24 h).

### `PATCH /citas/:id/reagendar`
Reagenda una cita validando disponibilidad y marcando `notificacionEnviadaPaciente = true`.
- **Acceso**: `DENTISTA` | `PACIENTE`
- **Request Body**:
```json
{
  "nuevaFecha": "2025-05-26",
  "nuevaHoraInicio": "11:00",
  "notificarPaciente": true
}
```
- **Response `200 OK`**: `CitaDto`

---

## 5. Odontograma FDI de 32 Dientes (`/odontogramas`)

### `GET /odontogramas/:pacienteId`
Devuelve el odontograma completo de 32 dientes (numeración FDI: `11-18`, `21-28`, `31-38`, `41-48`), cada uno con sus 5 superficies (`oclusal`, `vestibular`, `lingual`, `mesial`, `distal`), estado general y el historial inmutable de cambios.
- **Acceso**: `PACIENTE` (solo lectura) | `DENTISTA` (lectura y edición)
- **Response `200 OK`**: `OdontogramaDto`

### `PATCH /odontogramas/:pacienteId/dientes/:dienteNumero`
Modifica el estado de una superficie o del diente completo y registra automáticamente una entrada en `historial_cambios` con fecha/hora, dentista autor, estado previo y estado nuevo.
- **Acceso**: **EXCLUSIVO `DENTISTA`** (debe retornar `403 Forbidden` si lo invoca un `PACIENTE`).
- **Request Body**:
```json
{
  "superficie": "oclusal",
  "estadoNuevo": "OBTURADO",
  "procedimiento": "Resina compuesta nanohíbrida A2",
  "nota": "Sellado marginal verificado con radiografía bitewing",
  "dentistaId": "den-1",
  "dentistaNombre": "Dra. Valeria Solís"
}
```
- **Response `200 OK`**: `OdontogramaDto` actualizado.

---

## 6. Chatbot Asistente Transversal (`/chat`)

### `POST /chat`
Endpoint conversacional que recibe el mensaje del usuario y el contexto de sesión, e invoca internamente los mismos servicios/casos de uso del dominio.
- **Acceso**: Público (`VISITANTE`) y Autenticado (`PACIENTE` | `DENTISTA`)
- **Request Body**:
```json
{
  "mensaje": "Quiero ver mis citas próximas",
  "rol": "PACIENTE",
  "pacienteId": "pac-1",
  "dentistaId": null,
  "confirmarAccion": null
}
```
- **Response `200 OK`**:
```json
{
  "mensaje": "Aquí tienes tus próximas citas programadas, Sofía:",
  "tarjetas": [
    {
      "tipo": "TARJETA_CITAS",
      "datos": [ /* Cita[] */ ]
    }
  ],
  "sugerencias": [
    "Agendar nueva cita",
    "Ver mi odontograma",
    "Consultar mis tratamientos"
  ],
  "accion_ejecutada": {
    "tipo": "NINGUNA",
    "descripcion": "Consulta de citas activas",
    "requiere_confirmacion": false
  }
}
```
- **Flujo de Confirmación para Acciones Sensibles**:
  Para `CANCELAR_CITA`, `REAGENDAR_CITA` o `MODIFICAR_ODONTOGRAMA`, la primera respuesta devuelve `requiere_confirmacion: true` y `payload_confirmacion`. Cuando el usuario confirma en el diálogo de la interfaz, el frontend envía nuevamente `POST /chat` con `confirmarAccion` para ejecutar el cambio definitivo.
