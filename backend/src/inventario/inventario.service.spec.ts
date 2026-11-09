import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InventarioService } from "./inventario.service";
import { PrismaService } from "../prisma/prisma.service";
import type { UserResponseDto } from "../auth/dto/auth.dto";

describe("Servicio de Inventario Clínico y Control de Stock (InventarioService)", () => {
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

  const createInMemoryInventory = () => {
    const materiales: Array<Record<string, unknown>> = [
      {
        id: "inv-resina-a2",
        sku: "SKU-RES-A2",
        nombre: "Resina Nanohíbrida A2",
        categoria: "RESTAURACION",
        unidad: "jeringa",
        stockActual: 5,
        stockMinimo: 2,
        costoUnitarioMXN: 820,
        activo: true,
      },
    ];
    const movimientos: Array<Record<string, unknown>> = [];

    const prisma = {
      materialInventario: {
        findMany: jest.fn().mockResolvedValue(materiales),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          const found = materiales.find(
            (m) =>
              (where.id && m.id === where.id) ||
              (where.sku && m.sku === where.sku),
          );
          return Promise.resolve(found || null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          materiales.push(data);
          return Promise.resolve(data);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = materiales.findIndex((m) => m.id === where.id);
          materiales[idx] = { ...materiales[idx], ...data };
          return Promise.resolve(materiales[idx]);
        }),
      },
      movimientoInventario: {
        create: jest.fn().mockImplementation(({ data }) => {
          movimientos.push(data);
          return Promise.resolve(data);
        }),
      },
    } as unknown as PrismaService;

    return {
      prisma,
      materiales,
      movimientos,
      service: new InventarioService(prisma),
    };
  };

  it("descuenta inventario al usar materiales en consulta e impide estrictamente stock negativo", async () => {
    // Arrange
    const { service } = createInMemoryInventory();

    // Act: Consumo válido de 3 unidades (quedan 2, igual al mínimo -> alertaBajoStock = true)
    const consumo = await service.consumirMaterial(
      dentistaUser,
      "inv-resina-a2",
      {
        cantidad: 3,
        motivo: "Obturación oclusal en diente #16",
        citaId: "cit-prueba1",
      },
    );

    // Assert
    expect(consumo.material.stockActual).toBe(2);
    expect(consumo.material.alertaBajoStock).toBe(true);
    expect(consumo.movimiento.tipo).toBe("CONSUMO_CLINICO");

    // Intento de consumir 3 unidades adicionales cuando solo quedan 2 -> rechazado (no permite stock negativo)
    await expect(
      service.consumirMaterial(dentistaUser, "inv-resina-a2", {
        cantidad: 3,
        motivo: "Intento que dejaría stock en -1",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("serializa consumos concurrentes de inventario para evitar que dos peticiones simultáneas dejen stock negativo", async () => {
    // Arrange
    const { service, materiales } = createInMemoryInventory();

    // Act: Dos peticiones simultáneas pidiendo 4 jeringas cada una cuando hay 5 disponibles
    const resultados = await Promise.allSettled([
      service.consumirMaterial(dentistaUser, "inv-resina-a2", {
        cantidad: 4,
        motivo: "Consumo concurrente A",
      }),
      service.consumirMaterial(dentistaUser, "inv-resina-a2", {
        cantidad: 4,
        motivo: "Consumo concurrente B",
      }),
    ]);

    // Assert
    const exitosos = resultados.filter((r) => r.status === "fulfilled");
    const rechazados = resultados.filter((r) => r.status === "rejected");
    expect(exitosos).toHaveLength(1);
    expect(rechazados).toHaveLength(1);
    expect(materiales[0].stockActual).toBe(1);
  });

  it("impide registrar insumos con stock negativo, SKU duplicado o acceso por parte de un paciente", async () => {
    // Arrange
    const { service } = createInMemoryInventory();

    // Act & Assert: Paciente bloqueado con 403
    await expect(service.listarInventario(pacienteUser)).rejects.toThrow(
      ForbiddenException,
    );

    // Stock inicial negativo rechazado con 422
    await expect(
      service.crearMaterial(dentistaUser, {
        sku: "SKU-NUEVO",
        nombre: "Insumo Inválido",
        categoria: "CONSUMIBLE",
        unidad: "caja",
        stockActual: -5,
        stockMinimo: 2,
        costoUnitarioMXN: 100,
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    // SKU duplicado rechazado con 409
    await expect(
      service.crearMaterial(dentistaUser, {
        sku: "SKU-RES-A2",
        nombre: "Clon Resina",
        categoria: "RESTAURACION",
        unidad: "jeringa",
        stockActual: 10,
        stockMinimo: 2,
        costoUnitarioMXN: 820,
      }),
    ).rejects.toThrow(ConflictException);

    // Crear nuevo material válido y reabastecerlo
    const nuevo = await service.crearMaterial(dentistaUser, {
      sku: "SKU-GUAN-01",
      nombre: "Guantes de Nitrilo",
      categoria: "BIOSEGURIDAD",
      unidad: "caja",
      stockActual: 10,
      stockMinimo: 3,
      costoUnitarioMXN: 240,
    });
    const reabastecido = await service.reabastecerMaterial(
      dentistaUser,
      nuevo.id,
      {
        cantidad: 5,
        motivo: "Compra mensual de insumos",
      },
    );
    expect(reabastecido.material.stockActual).toBe(15);
  });
});
