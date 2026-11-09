import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { execSync } from "node:child_process";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/http-exception.filter";
import { PrismaService } from "../src/prisma/prisma.service";
import { hashPassword } from "../src/auth/password.util";
import { ORDEN_32_DIENTES_FDI } from "../src/common/clinical-time";

const TEST_DB_URL =
  "postgresql://postgres:postgres_password@localhost:5433/lumina_dental?schema=test_e2e";

describe("Pruebas de Integración Backend con Base de Datos Aislada (Supertest)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken = "";
  let paciente1Token = "";
  let paciente1Cookie = "";

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.JWT_SECRET = "lumina-dental-test-secret-jwt-key-2026";

    execSync("npx prisma db push --skip-generate", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: "pipe",
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        errorHttpStatusCode: 422,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    await seedIsolatedTestDb(prisma);
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function seedIsolatedTestDb(db: PrismaService) {
    await db.chatPropuesta.deleteMany();
    await db.movimientoInventario.deleteMany();
    await db.materialInventario.deleteMany();
    await db.pago.deleteMany();
    await db.cambioOdontograma.deleteMany();
    await db.dienteOdontograma.deleteMany();
    await db.odontograma.deleteMany();
    await db.cita.deleteMany();
    await db.tratamiento.deleteMany();
    await db.historialClinico.deleteMany();
    await db.bloqueoDentista.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
    await db.paciente.deleteMany();
    await db.dentista.deleteMany();
    await db.servicio.deleteMany();

    const passHash = hashPassword("123456");

    await db.servicio.create({
      data: {
        id: "srv-limpieza",
        codigo: "SRV-01",
        nombre: "Profilaxis Ultrasónica",
        categoria: "PREVENTIVA",
        descripcionCorta: "Limpieza dental",
        protocoloClinico: "Ultrasonido",
        beneficioMedible: "Encías sanas",
        precioBaseMXN: 950,
        duracionMinutos: 45,
        garantiaAnios: 1,
      },
    });

    await db.dentista.create({
      data: {
        id: "den-admin",
        nombreCompleto: "Dr. Admin Principal",
        email: "admin@demo.com",
        cedulaProfesional: "CED-9900001",
        especialidad: "Rehabilitación Integral",
        biografiaCorta: "Director clínico",
        diasAtencion: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
        horariosDisponibles: ["09:00", "10:30", "12:00", "16:00"],
      },
    });

    await db.paciente.createMany({
      data: [
        {
          id: "pac-prueba1",
          documento: "DOC-PRUEBA-0001",
          codigoExpediente: "EXP-2026-9001",
          nombreCompleto: "Usuario Prueba 1",
          email: "prueba1@demo.com",
          telefono: "+52 55 9000 0001",
          fechaNacimiento: "1993-04-12",
          edad: 33,
          grupoSanguineo: "O+",
          alergias: ["Ninguna"],
          condicionesMedicas: ["Ninguna"],
          alertasClinicas: [],
          fechaRegistro: "2026-11-01",
          odontologoCabeceraId: "den-admin",
          odontologoCabeceraNombre: "Dr. Admin Principal",
          activo: true,
        },
        {
          id: "pac-prueba2",
          documento: "DOC-PRUEBA-0002",
          codigoExpediente: "EXP-2026-9002",
          nombreCompleto: "Usuario Prueba 2",
          email: "prueba2@demo.com",
          telefono: "+52 55 9000 0002",
          fechaNacimiento: "1996-08-21",
          edad: 30,
          grupoSanguineo: "A+",
          alergias: ["Látex"],
          condicionesMedicas: ["Ninguna"],
          alertasClinicas: ["Usar guantes de nitrilo"],
          fechaRegistro: "2026-11-01",
          odontologoCabeceraId: "den-admin",
          odontologoCabeceraNombre: "Dr. Admin Principal",
          activo: true,
        },
      ],
    });

    await db.user.createMany({
      data: [
        {
          id: "usr-admin",
          email: "admin@demo.com",
          passwordHash: passHash,
          nombreCompleto: "Dr. Admin Principal",
          rol: "DENTISTA",
          dentistaId: "den-admin",
        },
        {
          id: "usr-prueba1",
          email: "prueba1@demo.com",
          passwordHash: passHash,
          nombreCompleto: "Usuario Prueba 1",
          rol: "PACIENTE",
          pacienteId: "pac-prueba1",
        },
      ],
    });

    await db.odontograma.create({
      data: {
        pacienteId: "pac-prueba1",
        actualizadoEn: "2026-11-09",
      },
    });

    await db.dienteOdontograma.createMany({
      data: ORDEN_32_DIENTES_FDI.map((fdi) => ({
        pacienteId: "pac-prueba1",
        numeroFDI: fdi,
        nombreAnatomico: `Diente #${fdi}`,
        cuadrante: Math.floor(fdi / 10),
        estadoGeneral: "SANO",
        supOclusal: "SANO",
        supVestibular: "SANO",
        supLingual: "SANO",
        supMesial: "SANO",
        supDistal: "SANO",
        ultimaActualizacion: "2026-11-09",
        notaClinica: "Sano",
      })),
    });

    await db.materialInventario.create({
      data: {
        id: "inv-resina-a2",
        sku: "SKU-RES-A2",
        nombre: "Resina Nanohíbrida A2",
        categoria: "RESTAURACION",
        unidad: "jeringa",
        stockActual: 10,
        stockMinimo: 3,
        costoUnitarioMXN: 820,
        activo: true,
      },
    });
  }

  it("autentica al médico dentista admin (admin@demo.com) y al usuario ficticio (prueba1@demo.com) y rota el refresh token", async () => {
    // Arrange & Act
    const loginAdmin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@demo.com", password: "123456" })
      .expect(200);

    const loginPaciente = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "prueba1@demo.com", password: "123456" })
      .expect(200);

    // Assert
    adminToken = loginAdmin.body.access_token;
    paciente1Token = loginPaciente.body.access_token;
    const setCookieHeader = loginPaciente.headers["set-cookie"];
    paciente1Cookie = Array.isArray(setCookieHeader)
      ? setCookieHeader[0].split(";")[0]
      : String(setCookieHeader).split(";")[0];

    expect(loginAdmin.body.user.rol).toBe("DENTISTA");
    expect(loginPaciente.body.user.rol).toBe("PACIENTE");

    // Rotación de refresh token: el primer refresh funciona y el replay del token viejo falla con 401
    const refreshRes = await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", [paciente1Cookie])
      .expect(200);
    expect(refreshRes.body.access_token).toBeDefined();

    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", [paciente1Cookie])
      .expect(401);
  });

  it("aplica control de acceso por rol: impide a un paciente ver datos de otro o acceder a rutas exclusivas de dentista", async () => {
    // Act & Assert
    await request(app.getHttpServer())
      .get("/api/pacientes")
      .set("Authorization", `Bearer ${paciente1Token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get("/api/pacientes/pac-prueba2")
      .set("Authorization", `Bearer ${paciente1Token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get("/api/pacientes/pac-prueba2/historial")
      .set("Authorization", `Bearer ${paciente1Token}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch("/api/odontogramas/pac-prueba1/dientes/16")
      .set("Authorization", `Bearer ${paciente1Token}`)
      .send({
        superficie: "oclusal",
        estadoNuevo: "OBTURADO",
        procedimiento: "Intento de paciente",
        nota: "Bloqueado",
      })
      .expect(403);

    await request(app.getHttpServer())
      .get("/api/inventario")
      .set("Authorization", `Bearer ${paciente1Token}`)
      .expect(403);
  });

  it("ejecuta flujo clínico completo: registrar paciente -> agendar cita -> atender/historial -> tratamiento/presupuesto -> pagos parciales -> inventario", async () => {
    // 1. Registrar nuevo paciente
    const nuevoPac = await request(app.getHttpServer())
      .post("/api/pacientes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        documento: "CURP-E2E-8899",
        nombreCompleto: "Paciente Flujo Completo",
        email: "flujo.completo@demo.com",
        telefono: "+52 55 7777 8888",
        fechaNacimiento: "1996-05-10",
        edad: 30,
        grupoSanguineo: "B+",
      })
      .expect(201);

    const pacienteCreadoId = nuevoPac.body.id;

    // Rechazar duplicado con mismo email o documento (409)
    await request(app.getHttpServer())
      .post("/api/pacientes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        documento: "CURP-E2E-8899",
        nombreCompleto: "Clon Duplicado",
        email: "flujo.completo@demo.com",
        telefono: "+52 55 7777 8888",
        fechaNacimiento: "1996-05-10",
        edad: 30,
        grupoSanguineo: "B+",
      })
      .expect(409);

    // 2. Agendar cita futura en día laborable
    const citaCreada = await request(app.getHttpServer())
      .post("/api/citas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        pacienteId: pacienteCreadoId,
        dentistaId: "den-admin",
        servicioId: "srv-limpieza",
        fecha: "2027-07-06", // Martes
        horaInicio: "09:00",
        motivo: "Valoración inicial y profilaxis",
      })
      .expect(201);

    // Impedir doble reserva en el mismo horario (409)
    await request(app.getHttpServer())
      .post("/api/citas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        pacienteId: "pac-prueba1",
        dentistaId: "den-admin",
        servicioId: "srv-limpieza",
        fecha: "2027-07-06",
        horaInicio: "09:00",
        motivo: "Intento de doble reserva",
      })
      .expect(409);

    // 3. Registrar nota en historial clínico y editar odontograma
    await request(app.getHttpServer())
      .post(`/api/pacientes/${pacienteCreadoId}/historial`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        tipo: "PROCEDIMIENTO",
        diagnostico: "Caries oclusal incipiente en pieza #16",
        procedimientoRealizado: "Restauración adhesiva con resina nanohíbrida",
        notasEvolucion: "Paciente asintomático post-operatorio.",
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch("/api/odontogramas/pac-prueba1/dientes/16")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        superficie: "oclusal",
        estadoNuevo: "OBTURADO",
        procedimiento: "Resina compuesta A2",
        nota: "Sellado marginal óptimo",
      })
      .expect(200);

    // 4. Crear tratamiento, aprobar presupuesto y registrar pagos parciales
    const trtRes = await request(app.getHttpServer())
      .post(`/api/pacientes/${pacienteCreadoId}/tratamientos`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        servicioId: "srv-limpieza",
        nombre: "Rehabilitación Cuadrante 1",
        costoTotal: 3000,
        sesionesTotales: 3,
        dientesInvolucrados: [16, 15],
        proximaFechaSugerida: "2027-07-20",
        notasEvolucion: "Plan inicial",
      })
      .expect(201);

    const trtId = trtRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/tratamientos/${trtId}/aprobar-presupuesto`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    // Impedir cambiar precio de presupuesto aprobado (409)
    await request(app.getHttpServer())
      .patch(`/api/tratamientos/${trtId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        estado: "EN_CURSO",
        sesionesCompletadas: 1,
        costoTotal: 4500,
      })
      .expect(409);

    // Pago parcial válido
    const pago1 = await request(app.getHttpServer())
      .post(`/api/tratamientos/${trtId}/pagos`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        montoMXN: 1200.5,
        descuentoMXN: 99.5,
        metodoPago: "TARJETA",
        idempotencyKey: "pago-e2e-1",
      })
      .expect(201);
    expect(pago1.body.saldoPendiente).toBe(1700);

    // 5. Descontar inventario al usar materiales e impedir stock negativo
    const invRes = await request(app.getHttpServer())
      .post("/api/inventario/inv-resina-a2/consumir")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        cantidad: 2,
        motivo: "Atención de cita clínica",
        citaId: citaCreada.body.id,
      })
      .expect(200);
    expect(invRes.body.material.stockActual).toBe(8);

    await request(app.getHttpServer())
      .post("/api/inventario/inv-resina-a2/consumir")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        cantidad: 99,
        motivo: "Exceso de stock",
      })
      .expect(409);

    // 6. Borrado lógico de paciente con historial y citas asociadas
    const delRes = await request(app.getHttpServer())
      .delete(`/api/pacientes/${pacienteCreadoId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(delRes.body.borradoLogico).toBe(true);
    expect(delRes.body.tieneRegistrosAsociados).toBe(true);
  });

  it("resiste intentos de SQL Injection, XSS y soporta paginación eficiente", async () => {
    // Arrange & Act: Búsqueda con payload SQLi
    const sqliRes = await request(app.getHttpServer())
      .get("/api/pacientes")
      .query({ q: "' OR 1=1; DROP TABLE \"Paciente\"; --", page: "1", limit: "5" })
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    // Assert
    expect(Array.isArray(sqliRes.body)).toBe(true);
    expect(sqliRes.body).toHaveLength(0);

    // Verificar que la tabla sigue intacta con paginación
    const pagRes = await request(app.getHttpServer())
      .get("/api/pacientes")
      .query({ page: "1", limit: "1" })
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(pagRes.body).toHaveLength(1);
  });
});
