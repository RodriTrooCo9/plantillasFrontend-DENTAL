import { httpClient } from "./api.client";

export interface MaterialInventarioItem {
  id: string;
  sku: string;
  nombre: string;
  categoria:
    | "CONSUMIBLE"
    | "ANESTESIA"
    | "ENDODONCIA"
    | "RESTAURACION"
    | "BIOSEGURIDAD";
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  costoUnitarioMXN: number;
  alertaBajoStock: boolean;
  activo: boolean;
}

export interface MovimientoInventarioPayload {
  cantidad: number;
  motivo: string;
  citaId?: string;
}

export const inventoryService = {
  listarInventario(): Promise<MaterialInventarioItem[]> {
    return httpClient<MaterialInventarioItem[]>("/inventario");
  },

  consumirMaterial(
    materialId: string,
    payload: MovimientoInventarioPayload,
  ): Promise<{ material: MaterialInventarioItem }> {
    return httpClient<{ material: MaterialInventarioItem }>(
      `/inventario/${encodeURIComponent(materialId)}/consumir`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  reabastecerMaterial(
    materialId: string,
    payload: MovimientoInventarioPayload,
  ): Promise<{ material: MaterialInventarioItem }> {
    return httpClient<{ material: MaterialInventarioItem }>(
      `/inventario/${encodeURIComponent(materialId)}/reabastecer`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};
