# Correcciones y verificación

Fecha: 3 de noviembre de 2026. Se conserva la arquitectura original: dominio, interfaces de repositorio, adaptadores mock/HTTP y UI compartida. No se implementó ni modificó un backend.

## Verificación por fase

| Fase | Cambios | TypeScript | Lint | Pruebas | Build |
| --- | --- | --- | --- | --- | --- |
| 0 | Diez errores originales de hooks/pureza; Zod; ejecutor permanente | Pasa | Pasa | 16 pasan | Pasa |
| 1 | Contrato, mappers, proxy, sesión validada y guard de recursos | Pasa | Pasa, sin advertencias | 53 pasan | Pasa |
| 2 | Mocks, reloj inyectable, conflictos, formularios asíncronos y consultas por clave | Pasa | Pasa | 61 pasan | Pasa |
| 3 | Catálogo público, servicio elegido, reagenda, calendario y navegación compartida | Pasa | Pasa | 66 pasan | Pasa |
| 4 | Diálogos, pestañas, errores accesibles, chat y odontograma | Pasa | Pasa | 74 pasan | Pasa |
| 5 / cierre | Retirada de alternativas y Gemini; contraste de tokens; pruebas de sesión, flujo y contexto | Pasa | Pasa, sin advertencias | 80 pasan | Pasa en modo HTTP |

Comandos ejecutados: `npm run typecheck` (`tsc --noEmit`), `npm run lint`, `npm test`, `npm run build`; el cierre también compila con `NEXT_PUBLIC_DATA_SOURCE=http npm run build`. Se eliminó `eslint.ignoreDuringBuilds`: el build vuelve a ejecutar lint y comprobación de tipos.

La compilación HTTP encontró inicialmente una restricción DNS al descargar Google Fonts. Se repitió con acceso de red autorizado. Al retirar `/api/clinical-chat`, también se regeneraron tipos de rutas y se retiró su archivo generado obsoleto de `.next/types`.

La suite usa `node:test` + `tsx`, sin sondeos en `/tmp`. Sus 80 pruebas incluyen las 12 originales. Las pruebas DOM usan jsdom y un simulador explícito de `showModal`/`close`; no acreditan comportamiento nativo ni diseño visual de un navegador real.

## Matriz de hallazgos

“Resuelto” significa corregido en el frontend y cubierto en el alcance indicado. “Parcial” identifica trabajo que depende de evidencia externa o comprobación visual; no implica autorización del backend ni certificación WCAG.

| Hallazgo | Estado | Archivos principales | Prueba / evidencia |
| --- | --- | --- | --- |
| B01: rutas, métodos y campos HTTP | Resuelto | `data/http/repositories.ts`, `mappers.ts`, `schemas.ts`; contrato e interfaces | `http.test.ts`: entradas, respuestas y DTO inválido por operación, incluido GET de bloqueos; recuperación, disponibilidad y chat |
| B01: login y refresh anidados | Resuelto | Cliente y repositorio de autenticación | `schemas.test.ts`, `http.test.ts`: rol/ID obligatorios, Bearer restaurado y renovación compartida |
| B01: 204 / cuerpo vacío | Resuelto | `data/http/client.ts` | Transporte acepta vacío; un repositorio que exige DTO lo rechaza; logout acepta 204 |
| B02: middleware y guard | Resuelto en frontend | `middleware.ts`, `data/auth/server.ts`, `AuthGate.tsx` | `auth-server.test.ts`: cookie de rol falsa, sesión revocada, malformada, red caída y redirección por rol; `session-gate.test.tsx`: no monta recursos antes de validar |
| B02: identidad propia de paciente/dentista | Resuelto | Portales, hooks, guard | Sin IDs clínicos de semilla ni selector de profesional; prueba DOM de ficha propia sin directorio; sesión exige ID del rol |
| B02: propiedad/permiso real de cada recurso | Parcial | Contrato, repositorios y proxy | La UI no permite editar odontograma al paciente; adaptador rechaza escritura clínica de un paciente. El flujo simulado propaga 403 ajenos. Nest aún debe demostrar autorización real mediante peticiones directas |
| B02: autor clínico | Resuelto en frontend; backend pendiente | `data/http/repositories.ts`, contrato | Autor del payload reemplazado por identidad de `/auth/me`; prueba con autor falsificado. Nest debe volver a derivarlo de la sesión |
| B03: tokens y rehidratación | Resuelto | `data/auth/session.ts`, cliente, proxy | Sin tokens en almacenamiento web; `/auth/me` + refresh restablecen sesión; proxy excluye refresh del JSON y normaliza cookie HttpOnly |
| B03: varios 401 / logout / cierre entre pestañas | Resuelto en alcance de pruebas | Cliente, store de sesión | Un refresh compartido; renovación tardía no revive sesión; logout fallido limpia estado; evento storage desmonta contenido clínico. Queda la comprobación con varias pestañas reales |
| B04: autenticación mock | Resuelto | `data/mock/repositories.ts` | `clinical.test.ts`: correo desconocido, palabra “dentista” y contraseña incorrecta se rechazan |
| B04: reservas y bloqueos | Resuelto | Mock, reglas y validación de dominio | Doble reserva 409, bloqueo completo, solapamiento parcial por duración, cancelación libera horario y bloqueo invertido 422 |
| B04: 24 horas | Resuelto | `domain/clinical.ts`, mock | Reloj real inyectable; 23h40m se rechazan, 24h exactas se aceptan; zona horaria de clínica configurable |
| B04: notificaciones | Resuelto | Dominio, mappers, mock, portales y chat | Estados solicitada/pendiente/enviada; mock no afirma entrega; mensaje de reagenda usa el estado recibido |
| Inicio: catálogo sin solicitudes privadas | Resuelto | `useCatalogoPublico`, portada | `interaction.test.tsx`: no consulta citas ni directorio; estados de carga/error/vacío y reintento |
| Inicio: servicio y destino después del acceso | Resuelto | `domain/auth-routing.ts`, portada, login y paciente | `auth-server.test.ts`: conserva `?servicio=`, destino local y rol; bloquea redirección externa y travesía de ruta |
| Inicio: textos y menú móvil | Resuelto en código; revisión visual parcial | `TopNavbar.tsx`, portada | Navegación compartida con disclosure, `aria-expanded`, Escape y controles táctiles; móvil real pendiente |
| Login: demo, errores y recuperación | Resuelto | Login, AsyncForm, Input, sesión | Demo condicionado a mock; acceso rápido con bloqueo/catch; recuperación asíncrona; `message` mapeado; errores asociados al campo |
| Paciente: disponibilidad y reserva | Resuelto | Portal, `useDisponibilidad`, AsyncForm | Sin horarios iniciales ficticios; cero horarios bloquea envío; descarta respuesta tardía; revalida antes de mutar; errores conservan formulario |
| Paciente: fechas, citas pasadas y reagenda | Resuelto | Portal, `RescheduleForm`, dominio | Fechas actuales con mínimo; cita confirmada antigua va a pasadas; reagenda según contrato con disponibilidad y notificación real |
| Dentista: calendario semanal | Resuelto | Portal y `weekDays` | Siete días desde lunes; anterior/siguiente y filtro; prueba cruzando cambio de año |
| Dentista: buscador y contexto | Resuelto | Portal, useQuery, useOperation | Debounce 300 ms; nombre accesible; búsqueda conserva expediente seleccionado; descarte de respuesta obsoleta. Cambiar paciente limpia borradores; operaciones pendientes bloquean cambio de contexto |
| Dentista: validaciones y errores de mutación | Resuelto | `domain/validation.ts`, AsyncForm y portal | Sesiones cero, costo negativo, FDI 99 y bloqueo invertido; error junto al campo; espera, bloqueo y conservación del texto ante 409 |
| U01: Modal | Resuelto en DOM; navegador nativo pendiente | `components/ui/index.tsx` | Foco inicial/retorno, Tab/Shift+Tab, Escape, fondo inerte y scroll interno. Eventos de diálogos anidados no cierran ambos |
| U02: Tabs | Resuelto en DOM | UI y portales | Flechas, Home/End, tabIndex gestionado; IDs/controles/paneles asociados |
| U03: conversaciones por expediente | Resuelto | Chat y hook | Cambio de paciente reinicia conversación/acciones; callbacks de una instancia desmontada no refrescan el expediente nuevo |
| U03: confirmación y reintento | Resuelto | Chat, adaptadores y mock | Segundo envío por `/chat`; no ejecuta repositorio clínico desde UI; fallida no se marca completada; token vinculado a contexto e idempotencia mock; texto se conserva tras caída de red |
| U04: odontograma | Resuelto en alcance probado | Visor y AsyncForm | Sin OBTURADO predeterminado; limpia borrador por pieza/paciente; resumen previo/nuevo; selección aria-pressed; vacío/malformado básico no rompe; paciente sin editor; error de guardado conserva texto |
| U05: contraste y tamaños | Parcial | Tokens, CSS, UI y chat | `contrast.test.ts`: texto de tokens ≥4.5:1, marca/blanco ≥4.5:1, bordes/foco ≥3:1; controles generales ≥24 px y principales ~44 px. Pendiente contraste completo renderizado y espaciado de objetivos |
| U05: responsive, zoom y foco no oculto | Parcial | Navegación compartida, grillas, CSS y diálogos | Se corrigieron riesgos del código y se añadieron reflujo de etiquetas/scroll interno. Falta medición visual a 320/375/768/1280 px, 200 % y 320 CSS px |
| Ruta de chat paralela | Resuelto | Eliminado `app/api/clinical-chat/route.ts` | No aparece en las rutas compiladas; no se consume GEMINI_API_KEY desde el frontend |
| Componentes alternativos | Resuelto, según aprobación | Eliminados AuthClinicSection, PatientPortalDashboard, ServicesCatalogSection y ClinicalChatbotWidget | Sin referencias activas; TopNavbar integrado en las cuatro rutas |

## Escenarios comprobados

- Contrato simulado: login → ficha propia → crear/reagendar/cancelar → datos del simulador sobreviven a reinicializar tokens → refresh tras expiración → logout. Es una prueba de cliente contra un servidor simulado en memoria, no una prueba e2e de navegador o de base de datos real.
- 401, 403, 409, 422, JSON inválido, DTO incompleto, 204 y fallo de red. Un fallo no se interpreta como listado vacío.
- Cero horarios, cambio rápido de fecha, doble submit, borrador conservado ante 409 y respuesta clínica tardía descartada.
- Cita antigua confirmada, costo negativo, sesiones cero, FDI 99, bloqueo invertido y solapamiento parcial.
- Teclado/foco de componentes compartidos, aislamiento del chat y confirmación idempotente.

## Lo que no se pudo verificar

1. Integración con un NestJS real, persistencia en base de datos, revocación/rotación real de cookies y autorización de paciente A frente a B mediante solicitudes directas.
2. Entrega de notificaciones y proveedor conversacional real.
3. Navegador real: móvil 320/375/768/1280 px, orientación horizontal, zoom 200 %, reflujo a 320 CSS px, desbordamientos y foco no oculto.
4. Lector de pantalla y semántica percibida, contraste renderizado de todas las variantes, estados y elementos gráficos clínicos.
5. Varias pestañas reales y comportamiento nativo de diálogos, autofill y almacenamiento restringido.

El modo mock sigue siendo una demostración con datos en memoria, explícitamente identificado. No debe usarse con expedientes reales. El estado de U05 y de autorización real permanece parcial: no se declara conformidad WCAG 2.2 AA ni aprobación clínica para producción.

## Comprobación del servidor compilado

Se inició temporalmente el build HTTP en `127.0.0.1:3107` y se consultó sin seguir redirecciones:

| Solicitud sin sesión | Resultado |
| --- | --- |
| `/login` | 200 |
| `/paciente?servicio=s-a` | 307 a login, conserva `next=/paciente?servicio=s-a` |
| `/dentista` | 307 a login, conserva `next=/dentista` |
| `/api/clinical-chat` | 404 |

Esto verifica respuestas reales del frontend compilado, sin ejecutar JavaScript en navegador ni conectarse a NestJS.
