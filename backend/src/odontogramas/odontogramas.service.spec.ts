import {
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { OdontogramasService } from "./odontogramas.service";
import { PrismaService } from "../prisma/prisma.service";
import { ORDEN_32_DIENTES_FDI } from "../common/clinical-time";
import type { UserResponseDto } from "../auth/dto/auth.dto";

describe("Servicio de Odontograma Anatómico FDI (OdontogramasService)", () => {
  const dentistaUser: UserResponseDto = {
    id: "usr-admin",
    email: "admin@demo.com",
    nombre_completo: "Dr. Admin Principal",
    rol: "DENTISTA",
    paciente_id: null,
    dentista_id: "den-admin",
    avatar_url: null,
  };

  const pacienteUser: UserResponseDto = {
    id: "usr-prueba1",
    email: "prueba1@demo.com",
    nombre_completo: "Usuario Prueba 1",
    rol: "PACIENTE",
    paciente_id: "pac-prueba1",
    dentista_id: null,
    avatar_url: null,
  };

  const createInMemoryOdontograma = () => {
    const dientes = ORDEN_32_DIENTES_FDI.map((fdi) => ({
      id: `d-${fdi}`,
      pacienteId: "pac-prueba1",
      numeroFDI: fdi,
      nombreAnatomico: `Pieza #${fdi}`,
      cuadrante: Math.floor(fdi / 10),
      estadoGeneral: "SANO",
      supOclusal: "SANO",
      supVestibular: "SANO",
      supLingual: "SANO",
      supMesial: "SANO",
      supDistal: "SANO",
      ultimaActualizacion: "2026-11-01",
      notaClinica: "Sano",
    }));
    const cambios: Array<Record<string, unknown>> = [];

    const prisma = {
      odontograma: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.pacienteId !== "pac-prueba1") return Promise.resolve(null);
          return Promise.resolve({
            pacienteId: "pac-prueba1",
            actualizadoEn: "2026-11-09",
            dientes,
            historialCambios: cambios,
          });
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      dienteOdontograma: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          const found = dientes.find(
            (d) =>
              d.pacienteId === where.pacienteId_numeroFDI.pacienteId &&
              d.numeroFDI === where.pacienteId_numeroFDI.numeroFDI,
          );
          return Promise.resolve(found || null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = dientes.findIndex((d) => d.id === where.id);
          Object.assign(dientes[idx], data);
          return Promise.resolve(dientes[idx]);
        }),
      },
      cambioOdontograma: {
        create: jest.fn().mockImplementation(({ data }) => {
          cambios.unshift(data);
          return Promise.resolve(data);
        }),
      },
      $transaction: jest.fn().mockImplementation(async (ops: Promise<unknown>[]) => {
        return Promise.all(ops);
      }),
    } as unknown as PrismaService;

    return { prisma, dientes, cambios, service: new OdontogramasService(prisma) };
  };

  it("rechaza dientes inexistentes en numeración FDI y caras del diente inválidas", async () => {
    // Arrange
    const { service } = createInMemoryOdontograma();

    // Act & Assert: Dientes FDI inválidos (0, 19, 29, 55, 99)
    for (const fdiInvalido of [0, 19, 29, 55, 99]) {
      await expect(
        service.actualizarDiente(dentistaUser, "pac-prueba1", fdiInvalido, {
          superficie: "oclusal",
          estadoNuevo: "OBTURADO",
          procedimiento: "Resina compuesta",
          nota: "Nota clínica",
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    }

    // Cara / superficie inválida
    await expect(
      service.actualizarDiente(dentistaUser, "pac-prueba1", 16, {
        superficie: "cara_inexistente" as "oclusal",
        estadoNuevo: "OBTURADO",
        procedimiento: "Resina compuesta",
        nota: "Nota clínica",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("impide que un paciente edite su propio odontograma o consulte el de otro paciente", async () => {
    // Arrange
    const { service } = createInMemoryOdontograma();

    // Act & Assert
    await expect(
      service.obtenerOdontograma(pacienteUser, "pac-otro"),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.actualizarDiente(pacienteUser, "pac-prueba1", 16, {
        superficie: "oclusal",
        estadoNuevo: "OBTURADO",
        procedimiento: "Intento no autorizado",
        nota: "Sin permiso",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("serializa ediciones concurrentes al mismo odontograma y registra quién modificó qué en la auditoría", async () => {
    // Arrange
    const { service, cambios } = createInMemoryOdontograma();

    // Act: Dos ediciones concurrentes sobre el diente #16
    await Promise.all([
      service.actualizarDiente(dentistaUser, "pac-prueba1", 16, {
        superficie: "oclusal",
        estadoNuevo: "CARIES",
        procedimiento: "Diagnóstico inicial",
        nota: "Caries detectada",
      }),
      service.actualizarDiente(dentistaUser, "pac-prueba1", 16, {
        superficie: "oclusal",
        estadoNuevo: "OBTURADO",
        procedimiento: "Resina fotopolimerizable",
        nota: "Restauración completada",
      }),
    ]);
    const odontoFinal = await service.obtenerOdontograma(
      dentistaUser,
      "pac-prueba1",
    );

    // Assert
    const diente16 = odontoFinal.dientes.find((d) => d.numeroFDI === 16)!;
    expect(diente16.superficies.oclusal).toBe("OBTURADO");
    expect(cambios).toHaveLength(2);
    expect(cambios[0].estadoAnterior).toBe("CARIES");
    expect(cambios[0].estadoNuevo).toBe("OBTURADO");
    expect(cambios[0].autorNombre).toBe("Dr. Admin Principal");

    // También actualiza estado GENERAL propagando a las 5 caras cuando es CORONA
    const odontoCorona = await service.actualizarDiente(
      dentistaUser,
      "pac-prueba1",
      46,
      {
        superficie: "GENERAL",
        estadoNuevo: "CORONA",
        procedimiento: "Cementación de corona de zirconio",
        nota: "Ajuste oclusal completo",
      },
    );
    const diente46 = odontoCorona.dientes.find((d) => d.numeroFDI === 46)!;
    expect(diente46.estadoGeneral).toBe("CORONA");
    expect(diente46.superficies.vestibular).toBe("CORONA");
  });
});
