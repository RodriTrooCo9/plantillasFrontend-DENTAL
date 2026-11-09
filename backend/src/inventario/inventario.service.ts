import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { randomUUID } from "node:crypto";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import type {
  CreateMaterialInventarioDto,
  MovimientoInventarioDto,
} from "./dto/inventario.dto";
import type { MaterialInventario } from "@prisma/client";

@Injectable()
export class InventarioService {
  private inventoryLockChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  private withInventoryLock<T>(task: () => Promise<T>): Promise<T> {
    const next = this.inventoryLockChain.then(task, task);
    this.inventoryLockChain = next.catch(() => undefined);
    return next;
  }

  private assertDentistAccess(user: UserResponseDto): void {
    if (user.rol !== "DENTISTA") {
      throw new ForbiddenException(
        "El control de inventario clínico es exclusivo para odontólogos y administradores.",
      );
    }
  }

  mapMaterial(m: MaterialInventario) {
    return {
      id: m.id,
      sku: m.sku,
      nombre: m.nombre,
      categoria: m.categoria,
      unidad: m.unidad,
      stockActual: m.stockActual,
      stockMinimo: m.stockMinimo,
      costoUnitarioMXN: m.costoUnitarioMXN,
      alertaBajoStock: m.stockActual <= m.stockMinimo,
      activo: m.activo,
    };
  }

  async listarInventario(user: UserResponseDto) {
    this.assertDentistAccess(user);
    const items = await this.prisma.materialInventario.findMany({
      where: { activo: true },
      orderBy: { sku: "asc" },
    });
    return items.map((m) => this.mapMaterial(m));
  }

  async crearMaterial(
    user: UserResponseDto,
    dto: CreateMaterialInventarioDto,
  ) {
    this.assertDentistAccess(user);
    if (dto.stockActual < 0 || dto.stockMinimo < 0) {
      throw new UnprocessableEntityException(
        "El inventario no permite registrar stock inicial ni mínimo negativo.",
      );
    }

    const cleanSku = dto.sku.trim().toUpperCase();
    const existente = await this.prisma.materialInventario.findUnique({
      where: { sku: cleanSku },
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe un insumo registrado con el código SKU ${cleanSku}.`,
      );
    }

    const created = await this.prisma.materialInventario.create({
      data: {
        id: `inv-${randomUUID().slice(0, 8)}`,
        sku: cleanSku,
        nombre: dto.nombre.trim(),
        categoria: dto.categoria,
        unidad: dto.unidad.trim(),
        stockActual: dto.stockActual,
        stockMinimo: dto.stockMinimo,
        costoUnitarioMXN: dto.costoUnitarioMXN,
        activo: true,
      },
    });
    return this.mapMaterial(created);
  }

  async consumirMaterial(
    user: UserResponseDto,
    materialId: string,
    dto: MovimientoInventarioDto,
  ) {
    this.assertDentistAccess(user);
    if (!Number.isInteger(dto.cantidad) || dto.cantidad <= 0) {
      throw new UnprocessableEntityException(
        "La cantidad a descontar debe ser un entero positivo.",
      );
    }

    return this.withInventoryLock(async () => {
      const material = await this.prisma.materialInventario.findUnique({
        where: { id: materialId },
      });
      if (!material || !material.activo) {
        throw new NotFoundException("Material de inventario no encontrado.");
      }

      if (material.stockActual - dto.cantidad < 0) {
        throw new ConflictException(
          `Stock insuficiente para ${material.nombre} (disponible: ${material.stockActual}, solicitado: ${dto.cantidad}). El inventario no puede quedar con stock negativo.`,
        );
      }

      const nuevoStock = material.stockActual - dto.cantidad;
      const updated = await this.prisma.materialInventario.update({
        where: { id: materialId },
        data: { stockActual: nuevoStock },
      });

      const movimiento = await this.prisma.movimientoInventario.create({
        data: {
          id: `mov-${randomUUID().slice(0, 8)}`,
          materialId: material.id,
          tipo: "CONSUMO_CLINICO",
          cantidad: dto.cantidad,
          motivo: dto.motivo.trim(),
          citaId: dto.citaId ?? null,
          autorId: user.id,
        },
      });

      return {
        material: this.mapMaterial(updated),
        movimiento,
      };
    });
  }

  async reabastecerMaterial(
    user: UserResponseDto,
    materialId: string,
    dto: MovimientoInventarioDto,
  ) {
    this.assertDentistAccess(user);
    if (!Number.isInteger(dto.cantidad) || dto.cantidad <= 0) {
      throw new UnprocessableEntityException(
        "La cantidad a reabastecer debe ser un entero positivo.",
      );
    }

    return this.withInventoryLock(async () => {
      const material = await this.prisma.materialInventario.findUnique({
        where: { id: materialId },
      });
      if (!material || !material.activo) {
        throw new NotFoundException("Material de inventario no encontrado.");
      }

      const nuevoStock = material.stockActual + dto.cantidad;
      const updated = await this.prisma.materialInventario.update({
        where: { id: materialId },
        data: { stockActual: nuevoStock },
      });

      const movimiento = await this.prisma.movimientoInventario.create({
        data: {
          id: `mov-${randomUUID().slice(0, 8)}`,
          materialId: material.id,
          tipo: "ENTRADA",
          cantidad: dto.cantidad,
          motivo: dto.motivo.trim(),
          citaId: dto.citaId ?? null,
          autorId: user.id,
        },
      });

      return {
        material: this.mapMaterial(updated),
        movimiento,
      };
    });
  }
}
