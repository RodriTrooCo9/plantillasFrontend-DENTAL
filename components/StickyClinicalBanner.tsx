"use client";

import React from "react";
import type { Paciente } from "@/domain";
import { Badge } from "@/components/ui";
import { formatCurrencyBs, calcularEdad } from "@/lib/formatters";
import {
  AlertTriangle,
  HeartPulse,
  Droplet,
  User,
  Phone,
  FileText,
  CreditCard,
  Baby,
} from "lucide-react";

interface StickyClinicalBannerProps {
  paciente: Paciente | null;
  saldoPendienteBs?: number;
  onCobrarClick?: () => void;
  onVerOdontogramaClick?: () => void;
}

export function StickyClinicalBanner({
  paciente,
  saldoPendienteBs = 0,
  onCobrarClick,
  onVerOdontogramaClick,
}: StickyClinicalBannerProps) {
  if (!paciente) return null;

  const edad = paciente.edad || calcularEdad(paciente.fechaNacimiento);
  const esMenor = edad > 0 && edad < 18;
  const tieneAlergias =
    Array.isArray(paciente.alergias) && paciente.alergias.length > 0;
  const tieneAlertasMedicas = Boolean(
    paciente.alertasMedicas &&
      paciente.alertasMedicas.trim().length > 0 &&
      paciente.alertasMedicas !== "Ninguna" &&
      paciente.alertasMedicas !== "Sin alertas",
  );

  return (
    <aside
      aria-label={`Banner Clínico de Seguridad del Paciente: ${paciente.nombreCompleto}`}
      className="sticky top-14 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2 border-stone-300 dark:border-slate-700 shadow-xs px-4 py-2.5 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Identidad y Demografía del Paciente */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            {paciente.nombreCompleto
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {paciente.nombreCompleto}
              </h2>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                EXP: {paciente.codigoExpediente}
              </span>
              {esMenor && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">
                  <Baby className="w-3 h-3" />
                  Menor de edad ({edad} años)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                {edad ? `${edad} años` : "Edad no esp."}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Droplet className="w-3 h-3 text-red-500" />
                Tipo: <strong>{paciente.tipoSangre || "S/D"}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <a
                  href={`tel:${paciente.telefono}`}
                  className="hover:underline text-teal-800 dark:text-teal-400"
                >
                  {paciente.telefono}
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Banners Clínicos de Seguridad Crítica (Alergias y Condiciones Sistémicas) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Alerta Roja Crítica de Alergias */}
          {tieneAlergias ? (
            <div
              role="alert"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md shadow-xs animate-pulse"
              title="Alergias registradas en expediente clínico"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
              <span>ALERGIA: {paciente.alergias.join(", ").toUpperCase()}</span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-stone-100 dark:bg-slate-800 px-2 py-1 rounded">
              Sin alergias conocidas
            </span>
          )}

          {/* Alerta Ámbar de Condiciones Sistémicas */}
          {tieneAlertasMedicas && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-semibold rounded-md"
            >
              <HeartPulse className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>{paciente.alertasMedicas}</span>
            </div>
          )}

          {/* Saldo Financiero en Bolivianos (Bs) */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-stone-300 dark:border-slate-700">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">
                Saldo Pendiente
              </span>
              <span
                className={`font-mono text-xs sm:text-sm font-bold tabular-nums ${
                  saldoPendienteBs > 0
                    ? "text-red-700 dark:text-red-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {formatCurrencyBs(saldoPendienteBs)}
              </span>
            </div>

            {saldoPendienteBs > 0 && onCobrarClick && (
              <button
                type="button"
                onClick={onCobrarClick}
                className="min-h-8 px-2.5 py-1 bg-teal-800 hover:bg-teal-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Registrar pago o abono"
              >
                <CreditCard className="w-3 h-3" />
                <span>Cobrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
