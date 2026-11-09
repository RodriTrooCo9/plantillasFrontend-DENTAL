"use client";

import React, { useState } from "react";
import type { Cita, Paciente } from "@/domain";
import { Card, Button, Badge } from "@/components/ui";
import { formatCurrencyBs } from "@/lib/formatters";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  Sparkles,
} from "lucide-react";

export interface PacienteEnEspera {
  citaId: string;
  pacienteId: string;
  pacienteNombre: string;
  horaCita: string;
  horaLlegada: string;
  servicioNombre: string;
  estado: "ESPERANDO" | "EN_SILLON" | "ATENDIDO";
  esPrimeraVez?: boolean;
  alergias?: string[];
  saldoPendienteBs?: number;
}

interface WaitingRoomPanelProps {
  citasHoy: Cita[];
  pacientes: Paciente[];
  onLlamarAlSillon: (pacienteId: string) => void;
}

export function WaitingRoomPanel({
  citasHoy,
  pacientes,
  onLlamarAlSillon,
}: WaitingRoomPanelProps) {
  // Simulación dinámica de pacientes en sala según las citas del día
  const [pacientesEspera, setPacientesEspera] = useState<PacienteEnEspera[]>(() => {
    return citasHoy.slice(0, 3).map((c, i) => {
      const p = pacientes.find((item) => item.id === c.pacienteId);
      return {
        citaId: c.id,
        pacienteId: c.pacienteId,
        pacienteNombre: c.pacienteNombre,
        horaCita: c.hora,
        horaLlegada: `${c.hora.split(":")[0]}:${(Math.max(0, Number(c.hora.split(":")[1]) - 10)).toString().padStart(2, "0")}`,
        servicioNombre: c.servicioNombre,
        estado: i === 0 ? "EN_SILLON" : "ESPERANDO",
        esPrimeraVez: i === 1,
        alergias: p?.alergias || [],
        saldoPendienteBs: i === 1 ? 450 : 0,
      };
    });
  });

  const cambiarEstado = (citaId: string, nuevoEstado: PacienteEnEspera["estado"]) => {
    setPacientesEspera((prev) =>
      prev.map((item) =>
        item.citaId === citaId ? { ...item, estado: nuevoEstado } : item,
      ),
    );
  };

  const enEsperaCount = pacientesEspera.filter((p) => p.estado === "ESPERANDO").length;
  const enSillonCount = pacientesEspera.filter((p) => p.estado === "EN_SILLON").length;

  return (
    <Card className="p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Sala de Espera en Vivo
            </h3>
            <p className="text-[11px] text-slate-500">
              Pacientes presentes en recepción hoy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
            {enEsperaCount} esperando
          </span>
          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px]">
            {enSillonCount} en sillón
          </span>
        </div>
      </div>

      <div className="mt-3.5 space-y-2.5">
        {pacientesEspera.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-stone-50 dark:bg-slate-800/50 rounded-xl">
            No hay pacientes esperando en sala en este momento.
          </div>
        ) : (
          pacientesEspera.map((item) => {
            const tieneAlergias =
              Array.isArray(item.alergias) && item.alergias.length > 0;
            return (
              <div
                key={item.citaId}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  item.estado === "EN_SILLON"
                    ? "bg-teal-50/80 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 ring-1 ring-teal-500/20"
                    : item.estado === "ATENDIDO"
                      ? "bg-stone-100 dark:bg-slate-800 opacity-60 border-stone-200"
                      : "bg-[#FAF9F6] dark:bg-slate-800/80 border-stone-200 dark:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {item.pacienteNombre}
                      </span>
                      {item.esPrimeraVez && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          1ª Vez
                        </span>
                      )}
                      {tieneAlergias && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Alergia
                        </span>
                      )}
                      {item.saldoPendienteBs && item.saldoPendienteBs > 0 ? (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-100 text-amber-800 font-mono">
                          Saldo: {formatCurrencyBs(item.saldoPendienteBs)}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>Cita: {item.horaCita} hrs</span>
                      <span>Llegada: {item.horaLlegada} hrs</span>
                      <span className="text-teal-800 dark:text-teal-400 font-medium">
                        {item.servicioNombre}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.estado === "ESPERANDO" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          cambiarEstado(item.citaId, "EN_SILLON");
                          onLlamarAlSillon(item.pacienteId);
                        }}
                        className="min-h-11 flex items-center gap-1"
                      >
                        <span>Llamar al Sillón</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {item.estado === "EN_SILLON" && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 px-2 py-1 bg-teal-100 dark:bg-teal-950 rounded">
                          En Atención
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cambiarEstado(item.citaId, "ATENDIDO")}
                        >
                          Marcar Atendido
                        </Button>
                      </div>
                    )}

                    {item.estado === "ATENDIDO" && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Finalizado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
