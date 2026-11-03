# Auditoría de plantillas: backend y UX/UI

Fecha: 3 de noviembre de 2026.

## Dictamen

El proyecto tiene una base útil para integrar un backend: interfaces de repositorios, adaptadores HTTP/mock, dominio TypeScript y componentes compartidos. **Actualmente no está preparado para conectar sin cambios al backend descrito en `API_CONTRACT.md`, ni para aprobar su uso clínico en producción.** Cambiar únicamente `NEXT_PUBLIC_DATA_SOURCE=http` no resuelve las incompatibilidades de rutas, respuestas, sesión y permisos.

En UX/UI hay elementos favorables —etiquetas en muchos formularios, jerarquía de títulos, grillas adaptables, confirmación de cancelación y odontograma de solo lectura para el paciente—, pero persisten barreras de teclado, errores sin recuperación y flujos que pueden inducir a equivocaciones. No se certifica conformidad WCAG ni usabilidad móvil con esta revisión.

## Alcance y evidencia

Se revisaron las cuatro rutas reales y sus módulos compartidos:

| Plantilla | Conexión al backend | UX/UI | Dictamen actual |
| --- | --- | --- | --- |
| Inicio `/` | Usa repositorios; también solicita citas privadas innecesariamente | CTA de servicio pierde la selección; navegación móvil incompleta | Requiere correcciones |
| Acceso `/login` | Login, recuperación y refresh incompatibles con el contrato | Validación básica presente; demos siempre visibles; modal incompleto | Bloquea integración |
| Paciente `/paciente` | Solicita directorio de dentista y usa identificadores demo | Selector de otros pacientes; disponibilidad y errores incompletos | No aprobar para datos reales |
| Dentista `/dentista` | Identidad clínica fija y contrato incompatible | Agenda semanal fija; validaciones y estados de operación incompletos | No aprobar para datos reales |

También se inspeccionaron odontograma, chatbot, primitivas UI y componentes alternativos que no están importados en las rutas actuales. Una revisión de código permite confirmar defectos de implementación; los riesgos de desbordamiento y percepción visual requieren comprobación en navegador.

No se recibió un backend ejecutable ni credenciales de integración. Las comprobaciones HTTP usaron respuestas sintéticas con la estructura documentada, interceptando `fetch` en memoria; no se enviaron datos a servicios externos. No hubo navegador conectado para inspección visual, lector de pantalla, medición de contraste renderizado o pruebas de interacción móvil. No se modificó la implementación de las pantallas.

## Resultados de ejecución

| Comprobación | Resultado | Interpretación |
| --- | --- | --- |
| `npx --no-install tsc --noEmit --incremental false` | Pasa | Tipado estático correcto; no valida JSON del servidor |
| `npm run lint` | Falla: 10 errores, 0 advertencias | Incluye reglas de hooks y pureza; requiere revisión antes de CI |
| `npm run build` | Pasa | Primero falló por DNS de Google Fonts en el entorno restringido; pasó al repetir con acceso autorizado |
| Pruebas existentes de `lib/dental-logic.test.ts` y `data/mock/repositories.test.ts` | 12 pasan | Cubren lógica local y mocks, no una conexión real |
| Respuestas HTTP sintéticas del contrato | Defectos reproducidos | Login sin rol/token utilizable; recuperación sin `mensaje`; disponibilidad con objetos; chat sin `texto`; ruta de pacientes distinta |
| Casos adicionales del mock | Defectos reproducidos | Doble reserva, bloqueo parcial, redondeo de 24 horas y autenticación permisiva |

Las pruebas TypeScript se ejecutaron con un cargador temporal basado en el `typescript` ya instalado, sin instalar `tsx` ni dependencias. Comando utilizado: `node --require /tmp/lumina-audit-loader.cjs -e "require('./lib/dental-logic.test.ts'); require('./data/mock/repositories.test.ts')"`. Los sondeos temporales `/tmp/lumina-http-audit.cjs` y `/tmp/lumina-mock-audit.cjs` documentan las reproducciones en esta sesión; no son una suite permanente del repositorio.

Los 10 errores de lint se distribuyen en `app/paciente/page.tsx` (1), `components/ClinicalChatbotWidget.tsx` (2), `components/PatientPortalDashboard.tsx` (1), `features/odontograma/Odontograma32View.tsx` (1), `hooks/index.ts` (4) y `hooks/use-mobile.ts` (1). Estos diagnósticos no equivalen por sí solos a fallos funcionales observados.

## Bloqueos comunes de integración

### B01 · Crítico: el contrato publicado y el adaptador HTTP no coinciden

Evidencia: `data/http/repositories.ts:38`, `data/http/mappers.ts:17`, `data/http/client.ts:48` y `docs/API_CONTRACT.md`.

| Operación | Implementación HTTP | Documento |
| --- | --- | --- |
| Login | Usuario plano con `rol`, `accessToken`, `refreshToken` | `{access_token, refresh_token, expires_in, user: {...}}` |
| Refresh | Lee `accessToken` | Responde con la misma estructura que login: `access_token` |
| Recuperación | Espera `mensaje` | Devuelve `message` |
| Directorio | `/patients?search=` | `/pacientes?q=` |
| Ficha de paciente | `full_name`, `medical_record_code`, `birth_date`, etc. | `nombre_completo`, `documento`, `fecha_nacimiento`, etc. |
| Historial | `/patients/:id/clinical-history` | `/pacientes/:id/historial` |
| Tratamientos | `/patients/:id/treatments`, `/treatments/:id` | `/pacientes/:id/tratamientos`, `/tratamientos/:id` |
| Servicios y dentistas | `/services`, `/dentists` | `/servicios`, `/dentistas` |
| Disponibilidad | `/dentists/:id/availability?date=`, espera `string[]` | `/dentistas/:id/disponibilidad?fecha=`, devuelve objetos con `hora` y `disponible` |
| Citas | `/appointments?patientId=&dentistId=&date=` | `/citas?pacienteId=&dentistaId=&fecha=` |
| Alta de cita | Envía `hora`, `motivoConsulta` | Espera `horaInicio`, `motivo` |
| Cancelación | `/appointments/:id/cancel`, `{motivo}` | `/citas/:id/cancelar`, `{motivoCancelacion}` |
| Reagenda | `/appointments/:id/reschedule`, `nuevaHora`, `motivo` | `/citas/:id/reagendar`, `nuevaHoraInicio`, `notificarPaciente` |
| Bloqueos | `/dentists/:id/blocks` | `/dentistas/:id/bloqueos` |
| Odontograma | `/patients/:id/odontogram/teeth/:numeroFDI`, `nuevoEstado`, `autorNombre` | `/odontogramas/:id/dientes/:numero`, `estadoNuevo`, `dentistaId`, `dentistaNombre` |
| Chat | Envía `{mensaje, contexto}`, lee `texto`, `acciones`, `componentes` | Recibe contexto plano y devuelve `mensaje`, `tarjetas`, `accion_ejecutada` |

Reproducción: con la respuesta de login documentada, `session.rol` queda `undefined` y la siguiente solicitud no lleva Bearer. Una anotación genérica `httpClient<UsuarioAutenticado>` no transforma el JSON. La recuperación no muestra el éxito esperado y la disponibilidad entrega objetos a un selector que espera texto.

Corrección: acordar un único contrato y adaptar rutas, solicitudes y respuestas en la capa HTTP. Definir los DTO aún incompletos del documento, validar respuestas en ejecución y probar cada operación contra un servidor de integración. No basta con traducir nombres de endpoints.

### B02 · Crítico: protección de rutas e identidad insuficientes

Evidencia: `middleware.ts:10`, `app/paciente/page.tsx:35`, `app/paciente/page.tsx:195`, `app/dentista/page.tsx:36`.

- El middleware solo redirige a `/paciente` si alguien entra a `/dentista` con la cookie literal `PACIENTE`. Sin cookie o con cualquier otro valor permite continuar. La cookie se escribe desde JavaScript y no prueba identidad.
- Las pantallas no esperan una sesión autenticada antes de solicitar datos. No existe el `RoleGuard` mencionado en el comentario del middleware.
- El portal del paciente parte de `pac-1` y presenta botones para seleccionar los cinco expedientes. El dentista usa `den-valeria` y permite cambiar de profesional, sin obtener la identidad del usuario autenticado.
- El autor de cambios clínicos se transmite desde el cliente. Su autenticidad debe resolverla el backend desde la sesión.

Impacto: acceso a la interfaz sin autenticación y solicitudes sobre identidades equivocadas. No se afirma una filtración desde un backend real: no se proporcionó uno y debe aplicar autorización independiente en cada recurso.

Corrección: validar sesión y rol en servidor, derivar la identidad del usuario validado, esperar esa validación antes de cargar recursos y limitar los selectores demo al modo demo. El servidor debe devolver `401/403` y verificar propiedad y permisos de lectura/escritura, aunque se alteren IDs o cookies.

### B03 · Alto: la sesión visual y el cliente HTTP se desincronizan

Evidencia: `hooks/index.ts:34`, `hooks/index.ts:55`, `hooks/index.ts:73`, `data/http/client.ts:10`.

Se guarda la sesión completa en `localStorage`, incluidos los tokens del modelo, pero al recargar solo se restablece `user`. Los tokens en memoria del cliente HTTP quedan vacíos: se pierde el Bearer y no se activa el refresh basado en `inMemoryRefreshToken`. No hay revalidación de sesión ni sincronización entre pestañas. Si falla logout, la limpieza local no se ejecuta.

El interceptor tampoco actualiza un refresh token rotado ni coordina varios `401` simultáneos. Siempre intenta leer JSON, incluso ante una respuesta válida `204`; este último es un problema de robustez, pues el logout documentado sí devuelve JSON.

Corrección: definir una estrategia única de sesión, preferiblemente refresh mediante cookie HttpOnly y rehidratación validada por servidor; sincronizar expiración, cierre y renovaciones concurrentes. Verificar CORS con origen explícito y credenciales si se mantiene acceso directo a otro origen. Estas configuraciones dependen del despliegue y no fueron comprobadas.

### B04 · Alto: los mocks pueden dar una falsa impresión de integración

Evidencia: `data/mock/repositories.ts:46`, `data/mock/repositories.ts:66`, `data/mock/repositories.ts:245`, `data/mock/repositories.ts:268`.

Reproducciones confirmadas únicamente sobre el mock:

1. Un correo ficticio que contiene `dentista` y una contraseña arbitraria de seis o más caracteres obtiene el rol dentista. Otros correos desconocidos terminan en el primer paciente.
2. Se aceptan dos reservas para el mismo dentista, día y hora.
3. Un bloqueo de 09:00 a 18:00 solo excluye la hora inicial y deja horas interiores disponibles. No se validan solapamientos por duración del servicio.
4. La regla de cancelación usa por defecto una fecha fija (`2026-11-03T12:00:00`) y redondea horas: 23 h 40 min se consideran 24 horas.
5. Las modificaciones viven en memoria y se pierden al recargar. `notificacionEnviada: true` es un valor simulado, no una entrega comprobada.

Corrección: identificar claramente el modo demo y aproximar los mocks a las restricciones reales. En el backend, validar disponibilidad y duración dentro de una operación atómica, usar el reloj y zona horaria de la clínica y devolver el estado real de notificación.

## Auditoría de cada plantilla

### Inicio público `/`

**Puntos favorables:** navegación semántica, idioma español declarado, secciones identificadas, precios visibles y CTA reconocibles en el código.

**Hallazgos:**

- **Alto:** `useCitas()` carga servicios, dentistas y citas de `pac-1` cuando no recibe IDs (`hooks/index.ts:175`, `app/page.tsx:46`). La portada pública genera una solicitud privada que un backend bien protegido debe rechazar. Separar el catálogo público de las citas autenticadas.
- **Medio:** todos los botones “Agendar servicio” hacen `router.push('/paciente')` (`app/page.tsx:248`) y no conservan el servicio seleccionado ni orientan primero al login cuando es necesario. Preservar selección y destino tras autenticarse.
- **Medio:** la navegación se oculta con `hidden md:flex` sin menú móvil equivalente. El encabezado combina elementos que no encogen, márgenes y `gap-8`; hay riesgo de desbordamiento en 320–375 px, pendiente de medición.
- **Medio:** se ignoran carga y errores del hook; un fallo de catálogo se puede presentar como contenido vacío. Mostrar carga, error con reintento y vacío legítimo como estados diferentes.
- **Bajo:** textos como “Arquitectura Clínica Conectada” o “Catálogo Clínico Configurable” explican implementación en una página de pacientes. Priorizar instrucciones de atención, reserva y contacto.

**Aceptación:** un visitante carga solo recursos públicos, reserva un servicio conservando su elección y encuentra navegación y contacto en móvil. Probar catálogo lento, vacío y caído.

### Acceso `/login`

**Puntos favorables:** valida correo y longitud de contraseña, expone errores con `role="alert"` y bloquea el envío principal mientras procesa.

**Hallazgos:**

- **Crítico:** B01 impide interpretar una sesión del backend documentado.
- **Alto:** credenciales y botones demo aparecen sin condicionar `repositories.mode`. En producción crean confusión y lanzan intentos de acceso con cuentas de prueba.
- **Medio:** el modal de recuperación permite reenvíos mientras procesa y no tiene un estado de espera. Los botones de acceso rápido tampoco se deshabilitan durante el envío; su rechazo no se captura localmente.
- **Medio:** el componente `Input` muestra el error, pero no asigna automáticamente `aria-invalid` ni asocia el mensaje con `aria-describedby`.
- **Medio:** el encabezado no cambia a una composición compacta; comprobar marca y “Volver a Inicio” en 320 px. El modal hereda las barreras descritas en U01.
- **Bajo:** “Autenticación Segura JWT · Redirección por Rol” y rutas técnicas son texto de demostración. Sustituir por instrucciones de acceso comprensibles.

**Aceptación:** probar credenciales válidas e inválidas, servidor caído, sesión expirada, recarga, recuperación lenta y navegación completa por teclado. Ocultar accesos demo fuera del entorno de demostración.

### Portal del paciente `/paciente`

**Puntos favorables:** separa resumen, historial, odontograma, tratamientos y citas; el odontograma se entrega como solo lectura y cancelar requiere una confirmación.

**Hallazgos:**

- **Crítico:** B02: un paciente puede seleccionar otros expedientes en la interfaz. Además, `usePacientes` primero solicita el directorio completo (`hooks/index.ts:96`), reservado a dentistas en el contrato; si recibe `403`, ni siquiera llega a cargar su propia ficha.
- **Alto:** la disponibilidad arranca con horarios simulados, sin estado de carga/error. Cuando el servidor devuelve una lista vacía se mantiene `horaCita`; “Confirmar Cita” permanece habilitado (`app/paciente/page.tsx:70`, `app/paciente/page.tsx:93`, `app/paciente/page.tsx:601`). Puede enviarse una hora que ya no está disponible.
- **Alto:** crear cita no captura errores ni tiene estado de envío; el hook solo publica ciertos errores de cancelación. La interfaz permite envíos repetidos y no explica un rechazo por conflicto o conexión.
- **Alto:** al cambiar de paciente, solicitudes anteriores pueden terminar después de las nuevas; no hay cancelación ni protección contra respuestas obsoletas en los hooks. Los datos previos tampoco se limpian inmediatamente. Riesgo de presentar información de otro expediente durante una operación.
- **Medio:** fechas e IDs iniciales están fijados a la semilla. Calcular fechas desde el calendario actual y derivar servicio/especialista de catálogos recibidos; impedir fechas pasadas según reglas reales.
- **Medio:** “Citas Futuras” filtra por estado, no por fecha; una cita antigua todavía confirmada puede aparecer como futura (`app/paciente/page.tsx:147`). La FAQ promete reagendar, pero no hay un flujo directo de reagenda para el paciente y el chat solo ejecuta ese tipo de acción para dentistas.
- **Medio:** faltan estados de carga, vacío y error diferenciados para ficha, tratamientos, historial y odontograma.

**Aceptación:** el paciente solo consulta su ID validado; `403` del directorio no debe afectar su portal porque no debe solicitarlo. Probar cero horarios, cambio rápido de fecha, conflicto `409`, doble clic, red caída, datos vacíos y cita antigua confirmada.

### Portal del dentista `/dentista`

**Puntos favorables:** agrupa agenda y expediente, ofrece acceso al odontograma desde una cita y muestra confirmaciones de algunas operaciones.

**Hallazgos:**

- **Crítico:** B02: profesional y autor no están ligados a una sesión validada.
- **Alto:** reagendar, bloquear, agregar evolución, crear tratamiento y guardar odontograma carecen de un manejo uniforme de espera/error. Varios handlers usan `await` sin `catch` y no bloquean un segundo envío.
- **Alto:** el mensaje asegura “Notificación enviada” después de reagendar sin comprobar la confirmación de entrega del servidor (`app/dentista/page.tsx:112`, `features/chatbot/ChatbotAssistant.tsx:136`). Mostrar “solicitada”, “pendiente” o “enviada” según respuesta real.
- **Medio:** la “Vista Calendario Semanal” usa tres fechas fijas, sin navegación de semanas (`app/dentista/page.tsx:381`). No representa una agenda semanal operativa. Incorporar semana actual, controles anterior/siguiente y filtro de fecha.
- **Medio:** el buscador realiza solicitudes en cada pulsación y recarga también el expediente; no aplica debounce ni descarta respuestas obsoletas (`app/dentista/page.tsx:491`, `hooks/index.ts:92`). Además, el campo solo tiene placeholder, sin nombre accesible explícito.
- **Medio:** sesiones y costo admiten negativos; los FDI solo se filtran con `parseInt`, sin verificar pertenencia a las 32 piezas. Los bloqueos no validan fin posterior al inicio (`app/dentista/page.tsx:144`, `app/dentista/page.tsx:681`). Validar e indicar errores junto al campo; el backend debe repetir las validaciones.

**Aceptación:** el dentista activo coincide con la sesión; una nota se guarda una sola vez en el expediente indicado; el calendario muestra cualquier semana y los errores conservan el contenido escrito. Probar costo negativo, sesiones cero, FDI 99 y bloqueo invertido.

## Módulos compartidos y accesibilidad

### U01 · Alto: modal sin manejo de foco ni teclado

`components/ui/index.tsx:192` declara `role="dialog"` y `aria-modal`, pero no mueve el foco al abrir, no lo contiene, no cierra con Escape ni lo devuelve al control de origen. Tampoco desactiva el fondo ni limita altura con desplazamiento interno. Afecta recuperación, cancelación y reagenda.

Implementar el comportamiento completo con `<dialog>` o una primitiva accesible y comprobar foco inicial, Tab/Shift+Tab, Escape, retorno de foco y pantallas de poca altura. El comportamiento esperado está descrito por el [patrón de diálogo modal de WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### U02 · Medio: pestañas con semántica incompleta

`components/ui/index.tsx:149` define roles `tablist/tab` y `aria-selected`, pero no navegación por flechas, tabulación gestionada ni asociación con paneles `tabpanel` mediante IDs. Las rutas tampoco definen estos paneles. Completar el [patrón de pestañas de WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### U03 · Alto: chatbot mezcla contextos y no permite recuperarse bien

Evidencia: `hooks/index.ts:303`, `features/chatbot/ChatbotAssistant.tsx:85`, `features/chatbot/ChatbotAssistant.tsx:151`.

- El historial y las acciones propuestas se mantienen al cambiar de paciente. Una acción previa conserva su `payload`, aunque el contexto visible ya sea otro. Reiniciar o separar conversaciones por expediente e invalidar acciones antiguas.
- Ante un error de ejecución se llama a `marcarAccionConfirmada`; una operación fallida queda marcada como confirmada y se deshabilita. Usar estados separados de pendiente, completada y fallida con reintento.
- Enviar mensajes no captura fallos de red para mostrarlos en la conversación; permite envíos concurrentes sin control. Preservar el texto fallido y ofrecer reintento.
- No existe un registro accesible `role="log"`/región viva para anunciar respuestas; la confirmación sensible tampoco gestiona el foco. Comprobar mensajes, cierre y confirmación con teclado y lector de pantalla.
- La confirmación ejecuta directamente repositorios de dominio; difiere del segundo `POST /chat` con `confirmarAccion` descrito en el contrato. Elegir un único flujo y autorizarlo en servidor.

### U04 · Medio: odontograma y formularios necesitan prevenir errores

Evidencia: `features/odontograma/Odontograma32View.tsx:47`, `features/odontograma/Odontograma32View.tsx:69`, `features/odontograma/Odontograma32View.tsx:183`.

Hay nombres accesibles para dientes y detalle textual por superficie, lo cual es favorable. Sin embargo, el editor inicia con estado “OBTURADO” y lo mantiene al cambiar de diente; conserva también notas y procedimiento. Un cambio de contexto debería limpiar o advertir sobre el borrador e indicar claramente paciente, pieza, superficie, valor previo y nuevo antes de guardar. La selección visual no se expone mediante `aria-pressed` u otra semántica de selección.

El visor presupone un array de dientes no vacío y puede fallar con una respuesta vacía/malformada. Las etiquetas del mapa usan 9 px y el guardado no bloquea duplicados ni presenta error. No hay base para declarar incumplimiento por tamaño de texto únicamente; sí es un problema de legibilidad a evaluar con zoom y usuarios.

### U05 · Pendiente visual: móviles, contraste y zoom

El código usa grillas adaptables y scroll horizontal en las pestañas, pero eso no prueba una buena experiencia en dispositivos. Antes de aprobar:

- Comprobar a 320, 375, 768 y 1280 px, orientación horizontal, zoom de 200 % y reflujo equivalente a 320 CSS px. Evitar scroll horizontal de toda la página; el odontograma puede requerir tratamiento específico como contenido bidimensional.
- Medir contraste de todas las combinaciones de texto, controles y estados. Objetivo AA: 4.5:1 para texto normal, 3:1 para texto grande y los componentes pertinentes. No se midieron todos los colores renderizados en esta auditoría.
- Verificar objetivos de interacción según 2.5.8 (mínimo 24 × 24 CSS px o sus excepciones de espaciado/equivalencia). Como objetivo de comodidad táctil, buscar aproximadamente 44 × 44 px; no confundirlo con el mínimo AA.
- Comprobar foco visible y no oculto por cabeceras/chat, etiquetas persistentes, errores asociados a campos y anuncio de resultados sin mover el foco innecesariamente.

La referencia utilizada es [WCAG 2.2, criterios y técnicas de W3C](https://www.w3.org/WAI/WCAG22/quickref/). Las recomendaciones no constituyen una evaluación exhaustiva de conformidad.

## Componentes alternativos fuera de las rutas actuales

La búsqueda de referencias no encontró importaciones activas de estas cinco plantillas/componentes en las rutas actuales:

| Componente | Observación | Requisito antes de reutilizar |
| --- | --- | --- |
| `components/AuthClinicSection.tsx` | Construye una sesión local después de validar formato, sin autenticar contra servidor; registro y recuperación son demostrativos | Conectarlo al flujo de autenticación real y eliminar el acceso por elección de rol |
| `components/PatientPortalDashboard.tsx` | Depende de callbacks y del modelo de `lib/dental-logic.ts`, distinto de `domain`; no tiene adaptador HTTP propio | Unificar modelos, propiedad del expediente y permisos; conectar callbacks a operaciones verificadas |
| `components/ServicesCatalogSection.tsx` | Recibe catálogo y callbacks; incluye búsqueda/presupuesto que la portada actual no utiliza | Decidir si reemplazará el catálogo actual; conectar a la misma fuente de servicios y corregir pestañas |
| `components/ClinicalChatbotWidget.tsx` | Llama a `/api/clinical-chat`, separado del `/chat` de los repositorios | Unificar contrato, sesión y fuente de datos antes de activarlo |
| `components/TopNavbar.tsx` | Navegación alternativa sin uso en las rutas actuales | Consolidar una navegación compartida y accesible en móvil |

`app/api/clinical-chat/route.ts:12` sí es una ruta expuesta aunque el widget no esté montado. No verifica sesión, rol ni límite de solicitudes; confía en el perfil y las citas enviados por el cliente y puede usar la clave Gemini del servidor. Esto permite respuestas sobre datos inventados y consumo no autenticado del servicio. Si se activa con datos reales, debe cargar el expediente autorizado desde el servidor, validar entradas, limitar solicitudes y definir qué datos se comparten con el proveedor. Esta auditoría no realizó llamadas a Gemini ni verificó la disponibilidad del modelo configurado.

## Prioridades y criterios de salida

1. **P0, antes de conectar datos reales:** resolver B01 y B02; autenticación y autorización por recurso en backend; separar catálogo público del directorio clínico; retirar identidades demo de los flujos reales; proteger o retirar la ruta de chat paralela.
2. **P1, antes del piloto:** sesión y refresh coherentes; carga/error/vacío/reintento en cada consulta; bloqueo de envíos repetidos; validación de horarios, fechas y tratamientos; aislamiento de conversaciones y solicitudes por expediente; modales y pestañas accesibles.
3. **P2, antes de publicar:** calendario operativo, navegación móvil, conservación del servicio elegido, texto orientado a pacientes, consolidación de componentes y revisión visual con usuarios.

La integración se podrá aprobar cuando una prueba de extremo a extremo demuestre login → carga del recurso propio → alta/reagenda/cancelación → recarga persistente → expiración/renovación → logout, junto con rechazos `401`, `403`, `409`, errores de validación y caída de red. Debe comprobarse que paciente A no lee ni modifica recursos de B y que un paciente nunca edita un odontograma, aun haciendo peticiones directas.

La UX/UI se podrá aprobar tras cerrar las barreras identificadas y comprobar móvil/escritorio, teclado y lector de pantalla. Una prueba breve con pacientes y personal debe observar si pueden reservar, encontrar su próxima cita, consultar un tratamiento y registrar una evolución sin ayuda ni errores de expediente. No se asigna una puntuación numérica de usabilidad sin esa evidencia.
