import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password.util";

const prisma = new PrismaClient();

const NOMBRES_POSICION: Record<number, string> = {
  1: "Incisivo Central",
  2: "Incisivo Lateral",
  3: "Canino",
  4: "Primer Premolar",
  5: "Segundo Premolar",
  6: "Primer Molar",
  7: "Segundo Molar",
  8: "Tercer Molar",
};

const ETIQUETA_CUADRANTE: Record<1 | 2 | 3 | 4, string> = {
  1: "Sup. Der.",
  2: "Sup. Izq.",
  3: "Inf. Izq.",
  4: "Inf. Der.",
};

const ORDEN_32_DIENTES_FDI: number[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

type EstadoDiente =
  | "SANO"
  | "CARIES"
  | "OBTURADO"
  | "ENDODONCIA"
  | "CORONA"
  | "AUSENTE"
  | "IMPLANTE";

type Superficie = "oclusal" | "vestibular" | "lingual" | "mesial" | "distal";

function build32Teeth(
  pacienteId: string,
  overrides: Partial<
    Record<
      number,
      {
        estadoGeneral: EstadoDiente;
        superficies?: Partial<Record<Superficie, EstadoDiente>>;
        notaClinica: string;
        ultimaActualizacion?: string;
      }
    >
  >,
) {
  return ORDEN_32_DIENTES_FDI.map((fdi) => {
    const cuadrante = Math.floor(fdi / 10) as 1 | 2 | 3 | 4;
    const posicion = fdi % 10;
    const nombreAnatomico = `${NOMBRES_POSICION[posicion]} ${ETIQUETA_CUADRANTE[cuadrante]}`;
    const custom = overrides[fdi];
    const estadoGeneral: EstadoDiente = custom?.estadoGeneral || "SANO";
    const defaultSurf: EstadoDiente =
      estadoGeneral === "CORONA" ||
      estadoGeneral === "AUSENTE" ||
      estadoGeneral === "IMPLANTE"
        ? estadoGeneral
        : "SANO";

    const superficies: Record<Superficie, EstadoDiente> = {
      oclusal: defaultSurf,
      vestibular: defaultSurf,
      lingual: defaultSurf,
      mesial: defaultSurf,
      distal: defaultSurf,
    };

    if (custom?.superficies) {
      Object.assign(superficies, custom.superficies);
    } else if (estadoGeneral === "CARIES" || estadoGeneral === "OBTURADO") {
      superficies.oclusal = estadoGeneral;
    }

    return {
      pacienteId,
      numeroFDI: fdi,
      nombreAnatomico,
      cuadrante,
      estadoGeneral,
      supOclusal: superficies.oclusal,
      supVestibular: superficies.vestibular,
      supLingual: superficies.lingual,
      supMesial: superficies.mesial,
      supDistal: superficies.distal,
      ultimaActualizacion: custom?.ultimaActualizacion || "2026-10-15",
      notaClinica:
        custom?.notaClinica ||
        "Esmalte y periodonto íntegros sin hallazgos patológicos.",
    };
  });
}

async function main(): Promise<void> {
  console.log("Sembrando base de datos PostgreSQL de Lumina Odontología...");

  await prisma.chatPropuesta.deleteMany();
  await prisma.movimientoInventario.deleteMany();
  await prisma.materialInventario.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.cambioOdontograma.deleteMany();
  await prisma.dienteOdontograma.deleteMany();
  await prisma.odontograma.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.tratamiento.deleteMany();
  await prisma.historialClinico.deleteMany();
  await prisma.bloqueoDentista.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.dentista.deleteMany();
  await prisma.servicio.deleteMany();

  // 1. Servicios Clínicos
  await prisma.servicio.createMany({
    data: [
      {
        id: "srv-limpieza",
        codigo: "PREV-01",
        nombre: "Profilaxis Ultrasónica y Pulido Airflow",
        categoria: "Prevención",
        descripcionCorta:
          "Remoción indolora de cálculo y biofilm con ultrasonido piezoeléctrico tibio y fluorización.",
        protocoloClinico:
          "Tinción de biofilm + ultrasonido EMS + pasta de hidroxiapatita",
        beneficioMedible:
          "Elimina el 99% del biofilm subgingival en 45 minutos",
        precioBaseMXN: 1450,
        duracionMinutos: 45,
        garantiaAnios: 1,
      },
      {
        id: "srv-ortodoncia",
        codigo: "ORTO-02",
        nombre: "Ortodoncia Invisible Digital 3D",
        categoria: "Ortodoncia",
        descripcionCorta:
          "Alineadores transparentes personalizados mediante escaneo intraoral óptico iTero 5D.",
        protocoloClinico:
          "Simulación ClinCheck 3D + recambio quincenal de alineadores",
        beneficioMedible:
          "35% menos tiempo clínico frente a brackets convencionales",
        precioBaseMXN: 42000,
        duracionMinutos: 60,
        garantiaAnios: 5,
      },
      {
        id: "srv-blanqueamiento",
        codigo: "ESTE-03",
        nombre: "Blanqueamiento Dental Fotoactivado LED",
        categoria: "Estética",
        descripcionCorta:
          "Aclaramiento clínico de baja sensibilidad con barrera gingival y kit ambulatorio nocturno.",
        protocoloClinico:
          "Gel peróxido con desensibilizante + lámpara de arco frío",
        beneficioMedible: "Hasta 6 tonos más claros en escala VITA en 1 sesión",
        precioBaseMXN: 4200,
        duracionMinutos: 50,
        garantiaAnios: 2,
      },
      {
        id: "srv-endodoncia",
        codigo: "ENDO-04",
        nombre: "Endodoncia Microscópica Rotatoria",
        categoria: "Endodoncia",
        descripcionCorta:
          "Tratamiento de conductos bajo magnificación óptica 25x para conservar piezas con infección o dolor.",
        protocoloClinico:
          "Localizador apical electrónico + obturación termoplástica 3D",
        beneficioMedible:
          "Alivio inmediato del dolor en una sola sesión de 60 min",
        precioBaseMXN: 5600,
        duracionMinutos: 60,
        garantiaAnios: 5,
      },
      {
        id: "srv-implantes",
        codigo: "IMPL-05",
        nombre: "Implante de Titanio Guiado + Corona Zirconio",
        categoria: "Implantología",
        descripcionCorta:
          "Rehabilitación fija guiada por tomografía CBCT 3D sin incisiones extensas.",
        protocoloClinico:
          "Guía quirúrgica impresa en 3D + corona monolítica CAD/CAM",
        beneficioMedible:
          "98.6% de tasa de osteointegración documentada a 10 años",
        precioBaseMXN: 24500,
        duracionMinutos: 90,
        garantiaAnios: 10,
      },
      {
        id: "srv-odontopediatria",
        codigo: "PEDI-06",
        nombre: "Odontopediatría Preventiva y Selladores",
        categoria: "Odontopediatría",
        descripcionCorta:
          "Atención odontológica infantil adaptada con selladores de fosetas y barniz de flúor.",
        protocoloClinico:
          "Adaptación conductual + resinas preventivas bioactivas",
        beneficioMedible:
          "85% de reducción en incidencia de caries en molares permanentes",
        precioBaseMXN: 1200,
        duracionMinutos: 40,
        garantiaAnios: 2,
      },
    ],
  });

  // 2. Dentistas y Bloqueos
  await prisma.dentista.createMany({
    data: [
      {
        id: "den-admin",
        nombreCompleto: "Dr. Admin Principal",
        email: "admin@demo.com",
        cedulaProfesional: "CED-9900001",
        especialidad:
          "Dirección Clínica, Rehabilitación Integral e Implantología",
        biografiaCorta:
          "Director clínico y especialista jefe del consultorio con acceso completo a expedientes, agenda y auditoría odontológica.",
        diasAtencion: [
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
        ],
        horariosDisponibles: [
          "09:00",
          "10:30",
          "12:00",
          "13:30",
          "16:00",
          "17:30",
        ],
      },
      {
        id: "den-valeria",
        nombreCompleto: "Dra. Valeria Mendoza",
        email: "dentista@demo.com",
        cedulaProfesional: "CED-8492014",
        especialidad: "Ortodoncia Digital, Rehabilitación y Estética",
        biografiaCorta:
          "Especialista por la UNAM con certificación internacional en alineadores invisibles y diseño digital de sonrisa.",
        diasAtencion: [
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
        ],
        horariosDisponibles: ["09:00", "10:30", "12:00", "16:00", "17:30"],
      },
      {
        id: "den-alejandro",
        nombreCompleto: "Dr. Alejandro Silva",
        email: "alejandro.silva@demo.com",
        cedulaProfesional: "CED-7103948",
        especialidad:
          "Implantología Guiada, Cirugía y Endodoncia Microscópica",
        biografiaCorta:
          "Cirujano maxilofacial e implantólogo con más de 1,400 rehabilitaciones asistidas por computadora.",
        diasAtencion: ["Lunes", "Miércoles", "Jueves", "Viernes", "Sábado"],
        horariosDisponibles: ["09:00", "11:00", "13:00", "16:30", "18:00"],
      },
    ],
  });

  await prisma.bloqueoDentista.create({
    data: {
      id: "bloq-1",
      dentistaId: "den-valeria",
      fecha: "2026-11-12",
      horaInicio: "16:00",
      horaFin: "18:00",
      motivo: "Junta clínica interdisciplinaria de ortodoncia",
    },
  });

  // 3. Pacientes
  await prisma.paciente.createMany({
    data: [
      {
        id: "pac-prueba1",
        documento: "DOC-930510-MX",
        codigoExpediente: "EXP-2026-9001",
        nombreCompleto: "Usuario Prueba 1",
        email: "prueba1@demo.com",
        telefono: "+52 55 9001 1111",
        fechaNacimiento: "1993-05-10",
        edad: 33,
        grupoSanguineo: "O+",
        alergias: ["Ninguna conocida"],
        condicionesMedicas: ["Paciente de verificación funcional #1"],
        alertasClinicas: ["Revisión general y profilaxis ultrasónica."],
        fechaRegistro: "2026-11-01",
        odontologoCabeceraId: "den-admin",
        odontologoCabeceraNombre: "Dr. Admin Principal",
      },
      {
        id: "pac-prueba2",
        documento: "DOC-960822-MX",
        codigoExpediente: "EXP-2026-9002",
        nombreCompleto: "Usuario Prueba 2",
        email: "prueba2@demo.com",
        telefono: "+52 55 9002 2222",
        fechaNacimiento: "1996-08-22",
        edad: 30,
        grupoSanguineo: "A+",
        alergias: ["Ibuprofeno (usar paracetamol)"],
        condicionesMedicas: ["Paciente de verificación funcional #2"],
        alertasClinicas: ["Seguimiento de rehabilitación en sector posterior."],
        fechaRegistro: "2026-11-02",
        odontologoCabeceraId: "den-admin",
        odontologoCabeceraNombre: "Dr. Admin Principal",
      },
      {
        id: "pac-1",
        documento: "DOC-950418-MX",
        codigoExpediente: "EXP-2026-0842",
        nombreCompleto: "Lucía Fernández Vega",
        email: "paciente@demo.com",
        telefono: "+52 55 4182 9012",
        fechaNacimiento: "1995-04-18",
        edad: 31,
        grupoSanguineo: "O+",
        alergias: ["Ninguna alergia medicamentosa conocida"],
        condicionesMedicas: ["Bruxismo nocturno leve"],
        alertasClinicas: ["Controlado con alineadores nocturnos."],
        fechaRegistro: "2026-01-15",
        odontologoCabeceraId: "den-valeria",
        odontologoCabeceraNombre: "Dra. Valeria Mendoza",
      },
      {
        id: "pac-2",
        documento: "DOC-820825-MX",
        codigoExpediente: "EXP-2026-1190",
        nombreCompleto: "Carlos Eduardo Navarro",
        email: "carlos.navarro@demo.com",
        telefono: "+52 55 8923 1104",
        fechaNacimiento: "1982-08-25",
        edad: 44,
        grupoSanguineo: "A+",
        alergias: ["Penicilina", "Amoxicilina"],
        condicionesMedicas: ["Hipertensión controlada con Losartán 50mg."],
        alertasClinicas: ["Evitar antibióticos beta-lactámicos."],
        fechaRegistro: "2026-02-10",
        odontologoCabeceraId: "den-alejandro",
        odontologoCabeceraNombre: "Dr. Alejandro Silva",
      },
      {
        id: "pac-3",
        documento: "DOC-880211-MX",
        codigoExpediente: "EXP-2026-0519",
        nombreCompleto: "Roberto Méndez Soto",
        email: "roberto.mendez@demo.com",
        telefono: "+52 55 3391 7740",
        fechaNacimiento: "1988-02-11",
        edad: 38,
        grupoSanguineo: "B+",
        alergias: ["Ninguna conocida"],
        condicionesMedicas: ["Sin patologías sistémicas."],
        alertasClinicas: ["Portador de lentes cerámicos anteriores."],
        fechaRegistro: "2026-03-05",
        odontologoCabeceraId: "den-valeria",
        odontologoCabeceraNombre: "Dra. Valeria Mendoza",
      },
      {
        id: "pac-4",
        documento: "DOC-991130-MX",
        codigoExpediente: "EXP-2026-1402",
        nombreCompleto: "Sofía Ramírez Luna",
        email: "sofia.ramirez@demo.com",
        telefono: "+52 55 6712 4490",
        fechaNacimiento: "1999-11-30",
        edad: 26,
        grupoSanguineo: "O-",
        alergias: ["Látex (usar guantes de nitrilo)"],
        condicionesMedicas: ["Sensibilidad dentinaria moderada."],
        alertasClinicas: ["Sector premolar inferior sensible al frío."],
        fechaRegistro: "2026-04-20",
        odontologoCabeceraId: "den-valeria",
        odontologoCabeceraNombre: "Dra. Valeria Mendoza",
      },
      {
        id: "pac-5",
        documento: "DOC-750604-MX",
        codigoExpediente: "EXP-2026-1688",
        nombreCompleto: "Miguel Ángel Torres",
        email: "miguel.torres@demo.com",
        telefono: "+52 55 2109 8831",
        fechaNacimiento: "1975-06-04",
        edad: 51,
        grupoSanguineo: "AB+",
        alergias: ["AINEs (preferir paracetamol)"],
        condicionesMedicas: ["Rehabilitación implantológica en cuadrante 4."],
        alertasClinicas: ["Control radiográfico de osteointegración."],
        fechaRegistro: "2026-05-12",
        odontologoCabeceraId: "den-alejandro",
        odontologoCabeceraNombre: "Dr. Alejandro Silva",
      },
    ],
  });

  // 4. Usuarios (contraseña para todos: 123456)
  const defaultPasswordHash = hashPassword("123456");
  await prisma.user.createMany({
    data: [
      {
        id: "usr-den-admin",
        email: "admin@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Dr. Admin Principal",
        rol: "DENTISTA",
        dentistaId: "den-admin",
      },
      {
        id: "usr-pac-prueba1",
        email: "prueba1@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Usuario Prueba 1",
        rol: "PACIENTE",
        pacienteId: "pac-prueba1",
      },
      {
        id: "usr-pac-prueba2",
        email: "prueba2@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Usuario Prueba 2",
        rol: "PACIENTE",
        pacienteId: "pac-prueba2",
      },
      {
        id: "usr-den-valeria",
        email: "dentista@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Dra. Valeria Mendoza",
        rol: "DENTISTA",
        dentistaId: "den-valeria",
      },
      {
        id: "usr-den-alejandro",
        email: "alejandro.silva@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Dr. Alejandro Silva",
        rol: "DENTISTA",
        dentistaId: "den-alejandro",
      },
      {
        id: "usr-pac-1",
        email: "paciente@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Lucía Fernández Vega",
        rol: "PACIENTE",
        pacienteId: "pac-1",
      },
      {
        id: "usr-pac-2",
        email: "carlos.navarro@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Carlos Eduardo Navarro",
        rol: "PACIENTE",
        pacienteId: "pac-2",
      },
      {
        id: "usr-pac-3",
        email: "roberto.mendez@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Roberto Méndez Soto",
        rol: "PACIENTE",
        pacienteId: "pac-3",
      },
      {
        id: "usr-pac-4",
        email: "sofia.ramirez@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Sofía Ramírez Luna",
        rol: "PACIENTE",
        pacienteId: "pac-4",
      },
      {
        id: "usr-pac-5",
        email: "miguel.torres@demo.com",
        passwordHash: defaultPasswordHash,
        nombreCompleto: "Miguel Ángel Torres",
        rol: "PACIENTE",
        pacienteId: "pac-5",
      },
    ],
  });

  // 5. Tratamientos
  await prisma.tratamiento.createMany({
    data: [
      {
        id: "trt-prueba1",
        pacienteId: "pac-prueba1",
        dentistaId: "den-admin",
        dentistaNombre: "Dr. Admin Principal",
        servicioId: "srv-ortodoncia",
        nombre: "Alineadores Invisibles 3D + Resina (#16)",
        estado: "EN_CURSO",
        fechaInicio: "2026-10-01",
        progresoPorcentaje: 50,
        sesionesCompletadas: 3,
        sesionesTotales: 6,
        costoTotal: 21000,
        dientesInvolucrados: [16, 11, 21],
        proximaFechaSugerida: "2026-11-14",
        notasEvolucion:
          "Paciente Prueba 1 en seguimiento activo con el Dr. Admin Principal.",
      },
      {
        id: "trt-prueba2",
        pacienteId: "pac-prueba2",
        dentistaId: "den-admin",
        dentistaNombre: "Dr. Admin Principal",
        servicioId: "srv-blanqueamiento",
        nombre: "Blanqueamiento Fotoactivado LED + Profilaxis",
        estado: "PLANIFICADO",
        fechaInicio: "2026-11-05",
        progresoPorcentaje: 0,
        sesionesCompletadas: 0,
        sesionesTotales: 2,
        costoTotal: 5650,
        dientesInvolucrados: [13, 12, 11, 21, 22, 23],
        proximaFechaSugerida: "2026-11-15",
        notasEvolucion:
          "Paciente Prueba 2 programado para sesión inicial con Dr. Admin Principal.",
      },
      {
        id: "trt-1",
        pacienteId: "pac-1",
        dentistaId: "den-valeria",
        dentistaNombre: "Dra. Valeria Mendoza",
        servicioId: "srv-ortodoncia",
        nombre: "Ortodoncia Invisible Digital 3D (Arcada Dual)",
        estado: "EN_CURSO",
        fechaInicio: "2026-05-15",
        progresoPorcentaje: 75,
        sesionesCompletadas: 9,
        sesionesTotales: 12,
        costoTotal: 42000,
        dientesInvolucrados: [11, 12, 13, 21, 22, 23],
        proximaFechaSugerida: "2026-11-12",
        notasEvolucion:
          "Alineación anterior completada al 85%. Excelente colaboración.",
      },
      {
        id: "trt-2",
        pacienteId: "pac-1",
        dentistaId: "den-alejandro",
        dentistaNombre: "Dr. Alejandro Silva",
        servicioId: "srv-implantes",
        nombre: "Rehabilitación sobre Implante de Titanio (#46)",
        estado: "FINALIZADO",
        fechaInicio: "2026-03-10",
        progresoPorcentaje: 100,
        sesionesCompletadas: 3,
        sesionesTotales: 3,
        costoTotal: 24500,
        dientesInvolucrados: [46],
        proximaFechaSugerida: "2027-08-12",
        notasEvolucion:
          "Corona de zirconio cementada con éxito. Control anual.",
      },
      {
        id: "trt-3",
        pacienteId: "pac-1",
        dentistaId: "den-valeria",
        dentistaNombre: "Dra. Valeria Mendoza",
        servicioId: "srv-blanqueamiento",
        nombre: "Resina Estética Oclusal (#16) + Aclaramiento LED",
        estado: "PLANIFICADO",
        fechaInicio: "2026-11-24",
        progresoPorcentaje: 10,
        sesionesCompletadas: 0,
        sesionesTotales: 2,
        costoTotal: 5800,
        dientesInvolucrados: [16, 11, 21],
        proximaFechaSugerida: "2026-11-24",
        notasEvolucion:
          "Recambio de resina filtrada en #16 seguido de aclaramiento.",
      },
      {
        id: "trt-4",
        pacienteId: "pac-2",
        dentistaId: "den-alejandro",
        dentistaNombre: "Dr. Alejandro Silva",
        servicioId: "srv-endodoncia",
        nombre: "Endodoncia Microscópica y Corona Cerámica (#24)",
        estado: "EN_CURSO",
        fechaInicio: "2026-10-22",
        progresoPorcentaje: 50,
        sesionesCompletadas: 1,
        sesionesTotales: 2,
        costoTotal: 9800,
        dientesInvolucrados: [24],
        proximaFechaSugerida: "2026-11-12",
        notasEvolucion:
          "Conducto obturado; siguiente sesión cementación de incrustación.",
      },
    ],
  });

  // 6. Citas (con fechas futuras respecto a 2026-11-09 para probar cancelación >24h y reagenda)
  await prisma.cita.createMany({
    data: [
      {
        id: "cit-prueba1",
        pacienteId: "pac-prueba1",
        pacienteNombre: "Usuario Prueba 1",
        dentistaId: "den-admin",
        dentistaNombre: "Dr. Admin Principal",
        servicioId: "srv-ortodoncia",
        servicioNombre: "Ortodoncia Invisible Digital 3D",
        tratamientoId: "trt-prueba1",
        fecha: "2026-11-14",
        horaInicio: "09:00",
        estado: "CONFIRMADA",
        motivo: "Control de alineadores y revisión de pieza #16 con Dr. Admin.",
        costoMXN: 3500,
      },
      {
        id: "cit-prueba2",
        pacienteId: "pac-prueba2",
        pacienteNombre: "Usuario Prueba 2",
        dentistaId: "den-admin",
        dentistaNombre: "Dr. Admin Principal",
        servicioId: "srv-blanqueamiento",
        servicioNombre: "Blanqueamiento Dental Fotoactivado LED",
        tratamientoId: "trt-prueba2",
        fecha: "2026-11-14",
        horaInicio: "12:00",
        estado: "CONFIRMADA",
        motivo: "Valoración estética y profilaxis inicial con Dr. Admin.",
        costoMXN: 4200,
      },
      {
        id: "cit-101",
        pacienteId: "pac-1",
        pacienteNombre: "Lucía Fernández Vega",
        dentistaId: "den-valeria",
        dentistaNombre: "Dra. Valeria Mendoza",
        servicioId: "srv-ortodoncia",
        servicioNombre: "Ortodoncia Invisible Digital 3D",
        tratamientoId: "trt-1",
        fecha: "2026-11-12",
        horaInicio: "10:30",
        estado: "CONFIRMADA",
        motivo:
          "Entrega de juegos de alineadores #10 al #12 y control de ataches.",
        costoMXN: 3500,
      },
      {
        id: "cit-102",
        pacienteId: "pac-1",
        pacienteNombre: "Lucía Fernández Vega",
        dentistaId: "den-valeria",
        dentistaNombre: "Dra. Valeria Mendoza",
        servicioId: "srv-blanqueamiento",
        servicioNombre: "Blanqueamiento Dental Fotoactivado LED",
        tratamientoId: null,
        fecha: "2026-11-24",
        horaInicio: "16:00",
        estado: "CONFIRMADA",
        motivo:
          "Sesión de aclaramiento fotoactivado previo a fin de tratamiento.",
        costoMXN: 4200,
      },
      {
        id: "cit-103",
        pacienteId: "pac-1",
        pacienteNombre: "Lucía Fernández Vega",
        dentistaId: "den-alejandro",
        dentistaNombre: "Dr. Alejandro Silva",
        servicioId: "srv-implantes",
        servicioNombre: "Implante de Titanio Guiado + Corona Zirconio",
        tratamientoId: "trt-2",
        fecha: "2026-08-12",
        horaInicio: "12:00",
        estado: "COMPLETADA",
        motivo:
          "Colocación definitiva de corona de zirconio sobre implante #46.",
        costoMXN: 24500,
      },
      {
        id: "cit-104",
        pacienteId: "pac-2",
        pacienteNombre: "Carlos Eduardo Navarro",
        dentistaId: "den-alejandro",
        dentistaNombre: "Dr. Alejandro Silva",
        servicioId: "srv-endodoncia",
        servicioNombre: "Endodoncia Microscópica Rotatoria",
        tratamientoId: "trt-4",
        fecha: "2026-11-12",
        horaInicio: "11:00",
        estado: "CONFIRMADA",
        motivo:
          "Reconstrucción post-endodóntica en premolar superior #24.",
        costoMXN: 5600,
      },
      {
        id: "cit-105",
        pacienteId: "pac-3",
        pacienteNombre: "Roberto Méndez Soto",
        dentistaId: "den-valeria",
        dentistaNombre: "Dra. Valeria Mendoza",
        servicioId: "srv-limpieza",
        servicioNombre: "Profilaxis Ultrasónica y Pulido Airflow",
        tratamientoId: null,
        fecha: "2026-11-12",
        horaInicio: "12:00",
        estado: "EN_SALA",
        motivo:
          "Mantenimiento semestral de carillas cerámicas con Airflow.",
        costoMXN: 1450,
      },
    ],
  });

  // 7. Historial Clínico
  await prisma.historialClinico.createMany({
    data: [
      {
        id: "his-prueba1",
        pacienteId: "pac-prueba1",
        fecha: "2026-11-01",
        dentistaId: "den-admin",
        dentistaNombre: "Dr. Admin Principal",
        tipo: "DIAGNOSTICO",
        diagnostico:
          "Apertura de expediente de prueba #1. Caries oclusal incipiente en molar #16.",
        procedimientoRealizado:
          "Escaneo intraoral 3D completo y radiografía digital.",
        notasEvolucion:
          "Se inicia plan de alineadores y se programa obturación en #16.",
      },
      {
        id: "his-prueba2",
        pacienteId: "pac-prueba2",
        fecha: "2026-11-02",
        dentistaId: "den-admin",
        dentistaNombre: "Dr. Admin Principal",
        tipo: "CONSULTA",
        diagnostico:
          "Apertura de expediente de prueba #2. Pigimentación extrínseca leve y obturación previa en #36.",
        procedimientoRealizado:
          "Sondaje periodontal y profilaxis ultrasónica.",
        notasEvolucion:
          "Paciente apto para blanqueamiento fotoactivado LED.",
      },
      {
        id: "his-1",
        pacienteId: "pac-1",
        fecha: "2026-10-28",
        dentistaId: "den-valeria",
        dentistaNombre: "Dra. Valeria Mendoza",
        tipo: "DIAGNOSTICO",
        diagnostico:
          "Filtración marginal en resina oclusal de primer molar superior derecho (#16).",
        procedimientoRealizado:
          "Inspección con cámara intraoral y escaneo iTero 5D.",
        notasEvolucion:
          "Paciente asintomática. Se programa recambio de resina en #16 y entrega de alineadores #10-#12.",
      },
      {
        id: "his-2",
        pacienteId: "pac-1",
        fecha: "2026-08-12",
        dentistaId: "den-alejandro",
        dentistaNombre: "Dr. Alejandro Silva",
        tipo: "PROCEDIMIENTO",
        diagnostico:
          "Edentulismo parcial unitario en zona de molar #46 rehabilitado con implante.",
        procedimientoRealizado:
          "Torque protésico a 35 Ncm de corona monolítica de zirconio en #46.",
        notasEvolucion:
          "Radiografía periapical de control muestra ajuste pasivo y cresta ósea estable.",
      },
      {
        id: "his-3",
        pacienteId: "pac-1",
        fecha: "2026-05-15",
        dentistaId: "den-valeria",
        dentistaNombre: "Dra. Valeria Mendoza",
        tipo: "CONSULTA",
        diagnostico:
          "Maloclusión Clase I con apiñamiento leve anterior superior e inferior.",
        procedimientoRealizado:
          "Colocación de ataches ópticos y entrega de alineadores etapa 1.",
        notasEvolucion:
          "Se instruye uso de 22 horas diarias e higiene interproximal.",
      },
      {
        id: "his-4",
        pacienteId: "pac-2",
        fecha: "2026-10-22",
        dentistaId: "den-alejandro",
        dentistaNombre: "Dr. Alejandro Silva",
        tipo: "PROCEDIMIENTO",
        diagnostico:
          "Pulpitis irreversible sintomática en primer premolar superior izquierdo (#24).",
        procedimientoRealizado:
          "Endodoncia rotatoria bajo microscopio óptico 25x y obturación 3D.",
        notasEvolucion:
          "Paciente alérgico a penicilina; se maneja analgesia antiinflamatoria sin antibiótico beta-lactámico.",
      },
    ],
  });

  // 8. Odontogramas de 32 dientes FDI para todos los pacientes
  const odontogramConfigs: Array<{
    pacienteId: string;
    actualizadoEn: string;
    overrides: Parameters<typeof build32Teeth>[1];
  }> = [
    {
      pacienteId: "pac-prueba1",
      actualizadoEn: "2026-11-01",
      overrides: {
        16: {
          estadoGeneral: "CARIES",
          superficies: { oclusal: "CARIES" },
          notaClinica: "Caries oclusal superficial programada para resina.",
          ultimaActualizacion: "2026-11-01",
        },
        26: {
          estadoGeneral: "OBTURADO",
          superficies: { oclusal: "OBTURADO" },
          notaClinica: "Resina oclusal previa en buen estado.",
        },
      },
    },
    {
      pacienteId: "pac-prueba2",
      actualizadoEn: "2026-11-02",
      overrides: {
        36: {
          estadoGeneral: "OBTURADO",
          superficies: { oclusal: "OBTURADO", mesial: "OBTURADO" },
          notaClinica: "Restauración compuesta funcional.",
          ultimaActualizacion: "2026-11-02",
        },
        46: {
          estadoGeneral: "CORONA",
          notaClinica: "Corona monolítica de zirconio.",
        },
      },
    },
    {
      pacienteId: "pac-1",
      actualizadoEn: "2026-10-28",
      overrides: {
        18: {
          estadoGeneral: "AUSENTE",
          notaClinica: "Tercer molar extraído quirúrgicamente en 2023.",
        },
        16: {
          estadoGeneral: "CARIES",
          superficies: { oclusal: "CARIES", mesial: "OBTURADO" },
          notaClinica: "Lesión cariosa en fosa oclusal; programada resina.",
          ultimaActualizacion: "2026-10-28",
        },
        12: {
          estadoGeneral: "CORONA",
          notaClinica: "Carilla cerámica de disilicato cementada en 2025.",
        },
        24: {
          estadoGeneral: "OBTURADO",
          superficies: { oclusal: "OBTURADO", distal: "OBTURADO" },
          notaClinica: "Resina compuesta nano-híbrida en buen estado.",
        },
        28: {
          estadoGeneral: "AUSENTE",
          notaClinica: "Agenesia de tercer molar superior izquierdo.",
        },
        36: {
          estadoGeneral: "ENDODONCIA",
          superficies: { oclusal: "OBTURADO" },
          notaClinica: "Conductos obturados sin lesión periapical.",
        },
        46: {
          estadoGeneral: "IMPLANTE",
          notaClinica:
            "Implante de titanio osteointegrado con corona de zirconio.",
          ultimaActualizacion: "2026-08-12",
        },
      },
    },
    {
      pacienteId: "pac-2",
      actualizadoEn: "2026-10-22",
      overrides: {
        16: {
          estadoGeneral: "CORONA",
          notaClinica: "Incrustación onlay cerámica funcional.",
        },
        24: {
          estadoGeneral: "ENDODONCIA",
          superficies: { oclusal: "ENDODONCIA" },
          notaClinica:
            "Endodoncia microscópica finalizada; pendiente incrustación.",
          ultimaActualizacion: "2026-10-22",
        },
        26: {
          estadoGeneral: "CARIES",
          superficies: { mesial: "CARIES" },
          notaClinica:
            "Caries interproximal incipiente detectada en radiografía.",
        },
        46: {
          estadoGeneral: "OBTURADO",
          superficies: { oclusal: "OBTURADO" },
          notaClinica: "Restauración oclusal sellada.",
        },
      },
    },
    {
      pacienteId: "pac-3",
      actualizadoEn: "2026-10-05",
      overrides: {
        12: {
          estadoGeneral: "CORONA",
          notaClinica: "Lente cerámico disilicato BL3.",
        },
        11: {
          estadoGeneral: "CORONA",
          notaClinica: "Lente cerámico disilicato BL3.",
        },
        21: {
          estadoGeneral: "CORONA",
          notaClinica: "Lente cerámico disilicato BL3.",
        },
        22: {
          estadoGeneral: "CORONA",
          notaClinica: "Lente cerámico disilicato BL3.",
        },
      },
    },
    {
      pacienteId: "pac-4",
      actualizadoEn: "2026-10-19",
      overrides: {
        35: {
          estadoGeneral: "CARIES",
          superficies: { vestibular: "CARIES" },
          notaClinica:
            "Lesión cervical no cariosa + desmineralización vestibular.",
        },
        45: {
          estadoGeneral: "OBTURADO",
          superficies: { vestibular: "OBTURADO" },
          notaClinica:
            "Ionómero de vidrio modificado con resina en cuello dental.",
        },
      },
    },
    {
      pacienteId: "pac-5",
      actualizadoEn: "2026-10-11",
      overrides: {
        46: {
          estadoGeneral: "IMPLANTE",
          notaClinica: "Implante guiado osteointegrado.",
        },
        47: {
          estadoGeneral: "IMPLANTE",
          notaClinica: "Implante guiado osteointegrado.",
        },
        17: {
          estadoGeneral: "CORONA",
          notaClinica: "Corona metal-porcelana antigua estable.",
        },
      },
    },
  ];

  for (const cfg of odontogramConfigs) {
    await prisma.odontograma.create({
      data: {
        pacienteId: cfg.pacienteId,
        actualizadoEn: cfg.actualizadoEn,
      },
    });
    await prisma.dienteOdontograma.createMany({
      data: build32Teeth(cfg.pacienteId, cfg.overrides),
    });
  }

  await prisma.cambioOdontograma.createMany({
    data: [
      {
        id: "aud-prueba1",
        pacienteId: "pac-prueba1",
        numeroFDI: 16,
        superficie: "oclusal",
        estadoAnterior: "SANO",
        estadoNuevo: "CARIES",
        procedimiento: "Valoración diagnóstica inicial",
        nota: "Registro de caries oclusal en pieza #16 por Dr. Admin Principal.",
        autorNombre: "Dr. Admin Principal",
        autorRol: "DENTISTA",
        fechaHora: "2026-11-01T10:00:00Z",
      },
      {
        id: "aud-prueba2",
        pacienteId: "pac-prueba2",
        numeroFDI: 36,
        superficie: "oclusal",
        estadoAnterior: "CARIES",
        estadoNuevo: "OBTURADO",
        procedimiento: "Obturación con resina compuesta",
        nota: "Restauración oclusal sellada por Dr. Admin Principal.",
        autorNombre: "Dr. Admin Principal",
        autorRol: "DENTISTA",
        fechaHora: "2026-11-02T11:30:00Z",
      },
      {
        id: "aud-1",
        pacienteId: "pac-1",
        numeroFDI: 16,
        superficie: "oclusal",
        estadoAnterior: "OBTURADO",
        estadoNuevo: "CARIES",
        procedimiento: "Diagnóstico con cámara intraoral",
        nota: "Se detecta filtración marginal en resina antigua de pieza #16.",
        autorNombre: "Dra. Valeria Mendoza",
        autorRol: "DENTISTA",
        fechaHora: "2026-10-28T11:20:00Z",
      },
      {
        id: "aud-2",
        pacienteId: "pac-1",
        numeroFDI: 46,
        superficie: "GENERAL",
        estadoAnterior: "AUSENTE",
        estadoNuevo: "IMPLANTE",
        procedimiento: "Rehabilitación definitiva sobre implante",
        nota: "Torque a 35 Ncm y verificación oclusal de corona de zirconio.",
        autorNombre: "Dr. Alejandro Silva",
        autorRol: "DENTISTA",
        fechaHora: "2026-08-12T17:05:00Z",
      },
      {
        id: "aud-3",
        pacienteId: "pac-2",
        numeroFDI: 24,
        superficie: "oclusal",
        estadoAnterior: "CARIES",
        estadoNuevo: "ENDODONCIA",
        procedimiento: "Endodoncia rotatoria bajo microscopio",
        nota: "Obturación tridimensional de conducto único sin dolor post-operatorio.",
        autorNombre: "Dr. Alejandro Silva",
        autorRol: "DENTISTA",
        fechaHora: "2026-10-22T13:15:00Z",
      },
    ],
  });

  // 9. Inventario Clínico Dental
  await prisma.materialInventario.createMany({
    data: [
      {
        id: "inv-resina-a2",
        sku: "SKU-RES-A2",
        nombre: "Resina Nanohíbrida Fotopolimerizable Tono A2",
        categoria: "RESTAURACION",
        unidad: "jeringa",
        stockActual: 25,
        stockMinimo: 5,
        costoUnitarioMXN: 820,
        activo: true,
      },
      {
        id: "inv-anestesia-lido",
        sku: "SKU-ANE-LIDO",
        nombre: "Cartuchos Lidocaína 2% con Epinefrina 1:100,000",
        categoria: "ANESTESIA",
        unidad: "cartucho",
        stockActual: 120,
        stockMinimo: 30,
        costoUnitarioMXN: 18,
        activo: true,
      },
      {
        id: "inv-endo-lima",
        sku: "SKU-ENDO-LIMA",
        nombre: "Kit Limas Rotatorias NiTi Protaper Gold",
        categoria: "ENDODONCIA",
        unidad: "caja",
        stockActual: 12,
        stockMinimo: 4,
        costoUnitarioMXN: 1450,
        activo: true,
      },
      {
        id: "inv-bio-guantes",
        sku: "SKU-BIO-GUAN",
        nombre: "Caja Guantes de Nitrilo Clínico Sin Polvo (100 pzas)",
        categoria: "BIOSEGURIDAD",
        unidad: "caja",
        stockActual: 40,
        stockMinimo: 10,
        costoUnitarioMXN: 240,
        activo: true,
      },
      {
        id: "inv-imp-titanio",
        sku: "SKU-IMP-TIT",
        nombre: "Implante Endóseo de Titanio Grado V 4.0x10mm",
        categoria: "RESTAURACION",
        unidad: "pieza",
        stockActual: 8,
        stockMinimo: 2,
        costoUnitarioMXN: 4200,
        activo: true,
      },
    ],
  });

  console.log("Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error("Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
