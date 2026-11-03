# Contrato de API — Lumina Odontología

Fecha: 3 de noviembre de 2026. Implementación de referencia del frontend: `data/http/schemas.ts` y `data/http/repositories.ts`. Los schemas Zod verifican las respuestas; el servidor sigue siendo la autoridad de identidad y permisos.

## Operaciones

Base NestJS: `API_URL`, normalmente `http://localhost:4000/api/v1`. Base del navegador: `/api/backend`.

| Método | Ruta NestJS | Entrada / respuesta | Acceso |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{email,password}` → `AuthDto` + cookie | Público |
| POST | `/auth/refresh` | Cookie → `AuthDto` + cookie rotada opcional | Sesión |
| GET | `/auth/me` | `UserDto` | Sesión |
| POST | `/auth/forgot-password` | `{email}` → `{message}` | Público |
| POST | `/auth/logout` | `{ok:true}` o 204; revoca sesión | Sesión |
| GET | `/pacientes?q=` | `PacienteDto[]` | Dentista |
| GET | `/pacientes/:id` | `PacienteDto` | Dentista o paciente propio |
| GET / POST | `/pacientes/:id/historial` | `HistorialDto[]` / alta → `HistorialDto` | Lectura propia; escritura dentista |
| GET / POST | `/pacientes/:id/tratamientos` | `TratamientoDto[]` / alta → `TratamientoDto` | Lectura propia; escritura dentista |
| PATCH | `/tratamientos/:id` | `{estado,sesionesCompletadas}` → `TratamientoDto` | Dentista |
| GET | `/servicios` | `ServicioDto[]` | Público |
| GET | `/dentistas` | `DentistaDto[]`, sin bloqueos privados | Público |
| GET | `/dentistas/:id/disponibilidad?fecha=&servicioId=` | `DisponibilidadDto[]` | Público |
| GET / POST | `/dentistas/:id/bloqueos` | `BloqueoDto[]` / alta → `BloqueoDto` | Dentista propio |
| GET | `/citas?pacienteId=&dentistaId=&fecha=` | `CitaDto[]` | Paciente propio o dentista autorizado |
| POST | `/citas` | Alta → `CitaDto` | Paciente propio o dentista autorizado |
| POST | `/citas/:id/cancelar` | `{motivoCancelacion}` → `CitaDto` | Propietario o dentista autorizado |
| PATCH | `/citas/:id/reagendar` | Reagenda → `CitaDto` | Propietario o dentista autorizado |
| GET | `/odontogramas/:pacienteId` | `OdontogramaDto` | Lectura autorizada |
| PATCH | `/odontogramas/:pacienteId/dientes/:numero` | Cambio → `OdontogramaDto` | Exclusivo dentista autorizado |
| POST | `/chat` | Mensaje / confirmación → `ChatDto` | Visitante o sesión; escrituras autenticadas |

Las altas responden 201; consultas, login, refresh y actualizaciones responden 200. Los listados vacíos devuelven `[]`, nunca 204. No existe `/api/clinical-chat`: se retiró el proveedor paralelo del frontend.

## DTOs y comportamiento


Este documento es la única especificación de intercambio entre frontend y NestJS. No implementa un backend: especifica requisitos que NestJS debe cumplir. Todos los importes están en MXN. Los IDs son cadenas no vacías. No se permiten datos clínicos ficticios ni valores por defecto para completar una respuesta incompleta. Fechas calendario: `YYYY-MM-DD`; horas: `HH:mm`; marcas de auditoría: ISO 8601 con zona. Los campos descritos son obligatorios salvo `?`.

### Sesión y despliegue

El navegador accede a `/api/backend/*` en el mismo origen. El proxy Next usa `API_URL` (solo servidor), sin elegir destinos desde la solicitud. Se conserva `NEXT_PUBLIC_API_URL` únicamente como compatibilidad de configuración del servidor; nunca se usa para enviar tokens directamente desde el navegador.

- `POST /auth/login`: entrada `{email,password}`. Respuesta `AuthDto`.
- `POST /auth/refresh`: sin refresh token en el cuerpo; lo recibe de `lumina_refresh`, cookie HttpOnly. Respuesta `AuthDto`; puede rotar la cookie. El navegador mantiene solo `access_token` en memoria.
- `GET /auth/me`: respuesta `UserDto`. Acepta Bearer o la cookie de sesión/refresh válida; valida revocación y expiración en servidor sin rotar la cookie. Permite validar rol en middleware sin depender de tokens en memoria del navegador.
- `POST /auth/logout`: revoca sesión, elimina cookie; `200 {ok:true}` o `204`.
- `POST /auth/forgot-password`: `{email}` → `{message:string}`.
- Cookie `lumina_refresh`: `HttpOnly; SameSite=Lax; Path=/`, `Secure` en producción, sin `Domain` (host del frontend a través del proxy). Nest emite `Set-Cookie`; el proxy la transporta y normaliza su alcance. No se guarda ningún token en localStorage/sessionStorage. Refresh nunca se devuelve al JavaScript del navegador: el proxy elimina `refresh_token` del cuerpo por compatibilidad de transporte.
- `AuthDto`: `{access_token:string, expires_in:number>0, user:UserDto, refresh_token?:string}`. El campo opcional solo es admisible entre Nest y el proxy y no sustituye `Set-Cookie`.
- `UserDto`: `{id,email,nombre_completo,rol: 'PACIENTE'|'DENTISTA',paciente_id?:string|null,dentista_id?:string|null,avatar_url?:string|null}`. PACIENTE exige `paciente_id`; DENTISTA exige `dentista_id`.
- Origen: el proxy rechaza mutaciones de otros orígenes, no reenvía encabezados arbitrarios ni redirecciones del upstream y no cachea respuestas de sesión o recursos clínicos. Un fallo de `/auth/me` bloquea el acceso; una cookie presente por sí sola no autoriza.
- Modo mock: acceso de demostración separado, sin validar contra Nest ni conceder autoridad sobre el modo HTTP. Banner obligatorio; el servidor solo permite este modo si `NEXT_PUBLIC_DATA_SOURCE=mock` (también es el valor predeterminado local).

### DTO de paciente

`PacienteDto`: `{id,documento,codigo_expediente,nombre_completo,email,telefono,fecha_nacimiento,edad:number>=0,grupo_sanguineo,alergias:string[],condiciones_medicas:string[],alertas_clinicas:string[],fecha_registro,odontologo_cabecera_id,odontologo_cabecera_nombre}`.

`codigo_expediente`, `edad` y `odontologo_cabecera_nombre` son campos obligatorios: el documento de identidad no es el código de expediente; no se inventa un nombre de profesional ni se calcula una edad con un reloj distinto del servidor. `condiciones_medicas` y `alertas_clinicas` se conservan y presentan como información clínica. El directorio sigue siendo exclusivo de dentistas; un paciente solicita únicamente `/pacientes/:suId` y sus subrecursos.

### DTO de catálogos y bloqueo

- `ServicioDto`: `{id,codigo,nombre,categoria,descripcionCorta,protocoloClinico,beneficioMedible,precioBaseMXN:number>=0,duracionMinutos:integer>0,garantiaAnios:number>=0}`. Categorías: `Prevención|Ortodoncia|Estética|Endodoncia|Implantología|Odontopediatría`.
- `DentistaDto`: `{id,nombreCompleto,email,cedulaProfesional,especialidad,biografiaCorta,diasAtencion:string[],horariosDisponibles:HH:mm[],bloqueos:BloqueoDto[]}`. En el catálogo público `bloqueos` debe ser `[]`; los motivos y horarios de bloqueos propios se obtienen autenticados mediante `GET /dentistas/:id/bloqueos`.
- `BloqueoDto`: `{id,dentistaId,fecha,horaInicio,horaFin,motivo}`. Fin estrictamente posterior al inicio. `POST /dentistas/:id/bloqueos` devuelve el objeto creado; `GET` devuelve una lista.
- Disponibilidad: `{hora:HH:mm,disponible:boolean,motivoNoDisponible?:string}[]`. El frontend solo ofrece los disponibles. Se admite `servicioId` opcional como query para descontar la duración completa del servicio; sin él el resultado es orientativo y Nest debe revalidar la duración al reservar.

### DTO de cita y escrituras

`CitaDto`: `{id,pacienteId,pacienteNombre,dentistaId,dentistaNombre,servicioId,servicioNombre,tratamientoId?:string|null,fecha,horaInicio,estado,motivo,costoMXN:number>=0,estadoNotificacion?:'solicitada'|'pendiente'|'enviada'}`. Estados: `CONFIRMADA|EN_SALA|COMPLETADA|CANCELADA|REPROGRAMADA`.

- Cancelar es `POST /citas/:id/cancelar` con `{motivoCancelacion}`.
- Alta mantiene `{pacienteId,dentistaId,servicioId,tratamientoId?,fecha,horaInicio,motivo}`.
- Reagenda es `PATCH /citas/:id/reagendar` con `{nuevaFecha,nuevaHoraInicio,notificarPaciente:boolean}`. Paciente y dentista pueden usarla sobre recursos autorizados; la regla mínima de 24 horas aplica a pacientes.
- La reasignación del horario NO demuestra envío de notificación: `estadoNotificacion` expresa el estado informado por el proveedor/servidor. El estado no se infiere de una operación de reagenda exitosa.
- Nest impide reservas solapadas por duración, bloqueos y concurrencia de forma atómica. Conflicto: `409`. La zona horaria de negocio se configura en la clínica y se aplica uniformemente en servidor.

### Historial y tratamientos

- `HistorialDto`: `{id,pacienteId,fecha,dentistaId,dentistaNombre,tipo,diagnostico,procedimientoRealizado,notasEvolucion}`. Tipos: `CONSULTA|DIAGNOSTICO|PROCEDIMIENTO|CONTROL_PERIODONTAL`.
- Alta de evolución: `{tipo,diagnostico,procedimientoRealizado,notasEvolucion,dentistaId,dentistaNombre}`; los campos adicionales de la evolución ampliada (`especialidad`, `motivoConsulta`, `dientesInvolucrados`, `indicacionesPostoperatorias`) son opcionales. No se sintetizan diagnósticos o notas.
- `TratamientoDto`: `{id,pacienteId,dentistaId,dentistaNombre,servicioId,nombre,estado,fechaInicio,progresoPorcentaje:0..100,sesionesCompletadas:integer>=0,sesionesTotales:integer>=1,costoTotal:number>=0,dientesInvolucrados:FDI[],proximaFechaSugerida,notasEvolucion}`. Sesiones completadas no exceden el total. Estados: `PLANIFICADO|EN_CURSO|FINALIZADO`.
- Alta de tratamiento: `{servicioId,nombre,dentistaId,dentistaNombre,costoTotal,sesionesTotales,dientesInvolucrados,proximaFechaSugerida,notasEvolucion}`. `descripcion` es opcional; se usa `dientesInvolucrados` para planes de varias piezas.
- Actualización mantiene `{estado,sesionesCompletadas}`.

### Odontograma e identidad del autor

- `DienteDto`: `{numeroFDI,nombreAnatomico,cuadrante:1|2|3|4,estadoGeneral,superficies:{oclusal,vestibular,lingual,mesial,distal},ultimaActualizacion,notaClinica}`. Cada superficie usa un estado clínico. FDI: únicamente 11–18, 21–28, 31–38 y 41–48; cuadrante coherente con el número.
- Estados clínicos: `SANO|CARIES|OBTURADO|ENDODONCIA|CORONA|AUSENTE|IMPLANTE`.
- `CambioDto`: `{id,pacienteId,numeroFDI,superficie,estadoAnterior,estadoNuevo,procedimiento,nota,autorNombre,autorRol:'DENTISTA',fechaHora}`. Superficie: las cinco anteriores o `GENERAL`.
- `OdontogramaDto`: `{pacienteId,actualizadoEn,dientes:DienteDto[32],historial_cambios:CambioDto[]}`. Exactamente las 32 piezas, sin duplicados; cada cambio corresponde al mismo paciente.
- PATCH mantiene `{superficie,estadoNuevo,procedimiento,nota,dentistaId,dentistaNombre}`. **Nest deriva y verifica siempre autor/rol desde la sesión**; los datos de autor del cuerpo son solo compatibilidad y nunca otorgan permiso. Esto también aplica a notas y tratamientos.
- El backend exige autorización por recurso en todas las operaciones, incluso peticiones directas: paciente A no lee ni escribe recursos de B; un paciente recibe `403` al editar un odontograma; usuario sin sesión recibe `401`.

### Chat y confirmación

Se utiliza exclusivamente `POST /chat` para proponer y confirmar acciones. Entrada: `{mensaje,rol,pacienteId?:string|null,dentistaId?:string|null,confirmarAccion?:{id,token}|null}`. Nest toma rol e identidad de la sesión y verifica acceso al paciente del contexto.

`ChatDto`: `{mensaje:string,tarjetas:TarjetaDto[],sugerencias:string[],accion_ejecutada:{tipo,descripcion,requiere_confirmacion:boolean,payload_confirmacion?:{id,token}}}`.

- Tipos de tarjeta: `TARJETA_CITAS` (`CitaDto[]`), `MINI_ODONTOGRAMA` (`OdontogramaDto`), `RESUMEN_TRATAMIENTOS` (`TratamientoDto[]`), `TABLA_SERVICIOS` (`ServicioDto[]`).
- Tipos de acción: `NINGUNA|MOSTRAR_SERVICIOS|MOSTRAR_CITAS|AGENDAR_CITA|CANCELAR_CITA|REAGENDAR_CITA|CONTINUAR_TRATAMIENTO|ABRIR_ODONTOGRAMA|MODIFICAR_ODONTOGRAMA|IR_A_LOGIN`.
- Toda escritura requiere confirmación explícita. Una propuesta exige `payload_confirmacion`. El token opaco identifica una acción almacenada en servidor, vinculada a sesión, paciente, parámetros y expiración; no es un permiso editable por el cliente. La confirmación reenvía únicamente `{id,token}` junto al contexto, nunca ejecuta repositorios desde la UI.
- Nest aplica la acción como máximo una vez, vuelve a validar permisos y disponibilidad, y rechaza tokens ajenos, caducados o con otro contexto (`403/409`). Una repetición devuelve el resultado previo o conflicto, sin duplicar escrituras. El resultado completado lleva `requiere_confirmacion:false`.

### Errores y respuestas vacías

Formato de error: `{message:string|string[],code?:string}`. Casos obligatorios: `400/422` validación, `401` sesión ausente/expirada, `403` permisos, `404` recurso inexistente y `409` conflicto. Solo logout puede devolver `204` en el contrato actual; el transporte acepta cuerpos vacíos, pero los repositorios que requieren un DTO los rechazan como respuesta inválida. El proxy no devuelve datos clínicos en errores de validación de esquemas.
