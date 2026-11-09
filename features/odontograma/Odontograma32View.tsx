"use client";

import { toothInputSchema } from "@/domain/validation";
import { AsyncForm } from "@/components/ui/AsyncForm";

import React, { useState, useEffect } from "react";
import { Odontograma, Diente, EstadoDiente, SuperficieDental } from "@/domain";
import { EditarDientePayload } from "@/data/repositories";
import { Card, Button, Select, Input, Badge } from "@/components/ui";
import {
  Lock,
  ShieldCheck,
  History,
  CheckCircle2,
  Undo2,
  Redo2,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from "lucide-react";

interface Odontograma32ViewProps {
  odontograma: Odontograma;
  pacienteNombre: string;
  editable: boolean; // false = PACIENTE (solo lectura), true = DENTISTA (editable + auditoría)
  dentistaAutorNombre?: string;
  onGuardarCambio?: (payload: EditarDientePayload) => Promise<unknown>;
}

export const ESTADOS_DIENTE: {
  estado: EstadoDiente;
  etiqueta: string;
  colorHex: string;
  descripcion: string;
}[] = [
  {
    estado: "SANO",
    etiqueta: "Sano",
    colorHex: "#FFFFFF",
    descripcion: "Esmalte y estructura íntegros sin patología",
  },
  {
    estado: "CARIES",
    etiqueta: "Caries activa",
    colorHex: "#DC2626",
    descripcion: "Lesión activa con cavitación o desmineralización",
  },
  {
    estado: "OBTURADO",
    etiqueta: "Obturado / Resina",
    colorHex: "#2563EB",
    descripcion: "Restauración con composite o amalgama",
  },
  {
    estado: "ENDODONCIA",
    etiqueta: "Endodoncia",
    colorHex: "#7C3AED",
    descripcion: "Conducto radicular obturado y sellado",
  },
  {
    estado: "CORONA",
    etiqueta: "Corona / Lente",
    colorHex: "#D97706",
    descripcion: "Prótesis fija unitaria o carilla",
  },
  {
    estado: "IMPLANTE",
    etiqueta: "Implante Titanio",
    colorHex: "#0D9488",
    descripcion: "Fijación oseointegrada con pilar",
  },
  {
    estado: "AUSENTE",
    etiqueta: "Ausente",
    colorHex: "#94A3B8",
    descripcion: "Pieza extraída o agenesia dental",
  },
];

export function obtenerColorEstado(estado: EstadoDiente): string {
  return ESTADOS_DIENTE.find((e) => e.estado === estado)?.colorHex || "#FFFFFF";
}

export function Odontograma32View(props: Odontograma32ViewProps) {
  const teeth = props.odontograma?.dientes;
  if (
    !Array.isArray(teeth) ||
    !teeth.length ||
    !teeth.every(
      (d) => d && d.superficies && typeof d.numeroFDI === "number",
    ) ||
    !Array.isArray(props.odontograma.historialCambios)
  )
    return (
      <p role="alert" className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
        El odontograma no está disponible o contiene datos incompletos.
      </p>
    );
  return <OdontogramaContent key={props.odontograma.pacienteId} {...props} />;
}

function OdontogramaContent({
  odontograma,
  pacienteNombre,
  editable,
  dentistaAutorNombre = "",
  onGuardarCambio,
}: Odontograma32ViewProps) {
  const [dienteSeleccionadoFDI, setDienteSeleccionadoFDI] = useState<number>(16);
  const [superficieForm, setSuperficieForm] = useState<
    SuperficieDental | "GENERAL"
  >("oclusal");
  const [estadoForm, setEstadoForm] = useState<EstadoDiente | "">("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [procedimientoForm, setProcedimientoForm] = useState<string>("");
  const [notaForm, setNotaForm] = useState<string>("");
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  // Tipo de dentición: Permanente (32) vs Infantil/Temporal (20)
  const [tipoDenticion, setTipoDenticion] = useState<"permanente" | "infantil">(
    "permanente",
  );

  // Pila de deshacer / rehacer local
  const [undoStack, setUndoStack] = useState<EditarDientePayload[]>([]);
  const [redoStack, setRedoStack] = useState<EditarDientePayload[]>([]);

  const dienteActual: Diente =
    odontograma.dientes.find((d) => d.numeroFDI === dienteSeleccionadoFDI) ||
    odontograma.dientes[0];

  // Arcadas permanentes (FDI 18-28 y 48-38)
  const arcadaSuperiorPermanente = odontograma.dientes.slice(0, 16);
  const arcadaInferiorPermanente = odontograma.dientes.slice(16, 32);

  // Simulación anatómica infantil para visualización pediátrica
  const dientesInfantiles = [
    { num: 55, pos: "sup-der" },
    { num: 54, pos: "sup-der" },
    { num: 53, pos: "sup-der" },
    { num: 52, pos: "sup-der" },
    { num: 51, pos: "sup-der" },
    { num: 61, pos: "sup-izq" },
    { num: 62, pos: "sup-izq" },
    { num: 63, pos: "sup-izq" },
    { num: 64, pos: "sup-izq" },
    { num: 65, pos: "sup-izq" },
    { num: 85, pos: "inf-der" },
    { num: 84, pos: "inf-der" },
    { num: 83, pos: "inf-der" },
    { num: 82, pos: "inf-der" },
    { num: 81, pos: "inf-der" },
    { num: 71, pos: "inf-izq" },
    { num: 72, pos: "inf-izq" },
    { num: 73, pos: "inf-izq" },
    { num: 74, pos: "inf-izq" },
    { num: 75, pos: "inf-izq" },
  ];

  const handleSubmitEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editable || !onGuardarCambio) return;

    const valid = toothInputSchema.safeParse({
      numeroFDI: dienteActual.numeroFDI,
      procedimiento: procedimientoForm,
      nota: notaForm,
    });
    setFieldErrors({});
    if (!valid.success) {
      setFieldErrors(
        Object.fromEntries(
          valid.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    if (!estadoForm) throw new Error("Selecciona un nuevo estado clínico.");

    const payload: EditarDientePayload = {
      pacienteId: odontograma.pacienteId,
      numeroFDI: dienteActual.numeroFDI,
      superficie: superficieForm,
      nuevoEstado: estadoForm,
      procedimiento:
        procedimientoForm.trim() || `Actualización a ${estadoForm}`,
      nota:
        notaForm.trim() ||
        `Registrado en superficie ${superficieForm} por ${dentistaAutorNombre}.`,
      autorNombre: dentistaAutorNombre,
    };

    await onGuardarCambio(payload);

    setUndoStack((prev) => [payload, ...prev]);
    setRedoStack([]);
    setProcedimientoForm("");
    setNotaForm("");
    setMensajeGuardado(
      `Se guardó el cambio en el diente #${dienteActual.numeroFDI} y se registró en la auditoría.`,
    );
  };

  const handleUndo = async () => {
    if (undoStack.length === 0 || !onGuardarCambio) return;
    const [ultimo, ...resto] = undoStack;
    setUndoStack(resto);
    setRedoStack((prev) => [ultimo, ...prev]);
    // Revertir a sano o estado anterior si aplica
    await onGuardarCambio({
      ...ultimo,
      nuevoEstado: "SANO",
      procedimiento: `[Deshacer] Restaurado a SANO previo a ${ultimo.nuevoEstado}`,
      nota: `Operación deshecha por el clínico.`,
    });
    setMensajeGuardado(`Se deshizo la última modificación en #${ultimo.numeroFDI}.`);
  };

  const handleRedo = async () => {
    if (redoStack.length === 0 || !onGuardarCambio) return;
    const [proximo, ...resto] = redoStack;
    setRedoStack(resto);
    setUndoStack((prev) => [proximo, ...prev]);
    await onGuardarCambio(proximo);
    setMensajeGuardado(`Se rehizo la modificación en #${proximo.numeroFDI}.`);
  };

  const renderizarBotonDiente = (diente: Diente) => {
    const seleccionado = diente.numeroFDI === dienteActual.numeroFDI;
    const colorOclusal = obtenerColorEstado(diente.superficies.oclusal);
    const colorVestibular = obtenerColorEstado(diente.superficies.vestibular);
    const colorLingual = obtenerColorEstado(diente.superficies.lingual);
    const colorMesial = obtenerColorEstado(diente.superficies.mesial);
    const colorDistal = obtenerColorEstado(diente.superficies.distal);

    return (
      <button
        key={diente.numeroFDI}
        type="button"
        onClick={() => {
          setDienteSeleccionadoFDI(diente.numeroFDI);
          setMensajeGuardado(null);
          setEstadoForm("");
          setProcedimientoForm("");
          setNotaForm("");
          setFieldErrors({});
        }}
        aria-pressed={seleccionado}
        aria-label={`Diente FDI ${diente.numeroFDI} ${diente.nombreAnatomico} Estado ${diente.estadoGeneral}`}
        className={`min-w-[44px] min-h-[58px] p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
          seleccionado
            ? "border-teal-700 bg-teal-50/90 dark:bg-teal-950/60 ring-2 ring-teal-600 shadow-xs scale-105 z-10"
            : "border-stone-200 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
        }`}
      >
        <span
          className={`text-[11px] font-mono font-bold tabular-nums ${
            seleccionado
              ? "text-teal-900 dark:text-teal-300"
              : "text-slate-800 dark:text-slate-200"
          }`}
        >
          {diente.numeroFDI}
        </span>

        {/* Representación geométrica interactiva de las 5 superficies */}
        <svg
          viewBox="0 0 44 44"
          className="w-9 h-9 my-0.5 drop-shadow-xs"
          aria-hidden="true"
        >
          {/* Vestibular (Arriba) */}
          <polygon
            points="4,4 40,4 32,12 12,12"
            fill={colorVestibular}
            stroke="#334155"
            strokeWidth="1.2"
            className="transition-colors hover:brightness-90 cursor-pointer"
            onClick={(e) => {
              if (editable) {
                e.stopPropagation();
                setDienteSeleccionadoFDI(diente.numeroFDI);
                setSuperficieForm("vestibular");
              }
            }}
          />
          {/* Lingual / Palatino (Abajo) */}
          <polygon
            points="12,32 32,32 40,40 4,40"
            fill={colorLingual}
            stroke="#334155"
            strokeWidth="1.2"
            className="transition-colors hover:brightness-90 cursor-pointer"
            onClick={(e) => {
              if (editable) {
                e.stopPropagation();
                setDienteSeleccionadoFDI(diente.numeroFDI);
                setSuperficieForm("lingual");
              }
            }}
          />
          {/* Mesial (Izquierda) */}
          <polygon
            points="4,4 12,12 12,32 4,40"
            fill={colorMesial}
            stroke="#334155"
            strokeWidth="1.2"
            className="transition-colors hover:brightness-90 cursor-pointer"
            onClick={(e) => {
              if (editable) {
                e.stopPropagation();
                setDienteSeleccionadoFDI(diente.numeroFDI);
                setSuperficieForm("mesial");
              }
            }}
          />
          {/* Distal (Derecha) */}
          <polygon
            points="32,12 40,4 40,40 32,32"
            fill={colorDistal}
            stroke="#334155"
            strokeWidth="1.2"
            className="transition-colors hover:brightness-90 cursor-pointer"
            onClick={(e) => {
              if (editable) {
                e.stopPropagation();
                setDienteSeleccionadoFDI(diente.numeroFDI);
                setSuperficieForm("distal");
              }
            }}
          />
          {/* Oclusal / Incisal (Centro) */}
          <rect
            x="12"
            y="12"
            width="20"
            height="20"
            fill={colorOclusal}
            stroke="#0f172a"
            strokeWidth="1.4"
            className="transition-colors hover:brightness-90 cursor-pointer"
            onClick={(e) => {
              if (editable) {
                e.stopPropagation();
                setDienteSeleccionadoFDI(diente.numeroFDI);
                setSuperficieForm("oclusal");
              }
            }}
          />
          {diente.estadoGeneral === "AUSENTE" && (
            <>
              <line
                x1="4"
                y1="4"
                x2="40"
                y2="40"
                stroke="#0F172A"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <line
                x1="40"
                y1="4"
                x2="4"
                y2="40"
                stroke="#0F172A"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>

        <span
          className={`text-[9px] font-semibold truncate max-w-full leading-tight ${
            diente.estadoGeneral === "SANO"
              ? "text-slate-500 dark:text-slate-400"
              : diente.estadoGeneral === "CARIES"
                ? "text-red-700 dark:text-red-400 font-bold"
                : "text-teal-800 dark:text-teal-300"
          }`}
        >
          {diente.estadoGeneral}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Contenedor Principal del Odontograma */}
      <Card className="p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-teal-800 dark:text-teal-400 font-semibold">
              {editable ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Modo Clínico Editable (Exclusivo Dentista)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Modo Consulta de Paciente (Solo Lectura)</span>
                </>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              Odontograma Anatómico FDI — {pacienteNombre}
            </h2>
          </div>

          {/* Selector de Dentición & Controles Deshacer / Rehacer */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-stone-300 dark:border-slate-700 p-0.5 bg-stone-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTipoDenticion("permanente")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  tipoDenticion === "permanente"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Permanente (32)
              </button>
              <button
                type="button"
                onClick={() => setTipoDenticion("infantil")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  tipoDenticion === "infantil"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Decidua / Infantil (20)
              </button>
            </div>

            {editable && (
              <div className="flex items-center gap-1 border-l border-stone-200 dark:border-slate-700 pl-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="min-h-11 min-w-11 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1"
                  title="Deshacer último cambio (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Deshacer</span>
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="min-h-11 min-w-11 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1"
                  title="Rehacer cambio (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rehacer</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Leyenda Visual de los 7 Estados Clínicos */}
        <div className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-stone-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Convención Clínica:
          </span>
          {ESTADOS_DIENTE.map((item) => (
            <div
              key={item.estado}
              className="flex items-center gap-1.5 cursor-help"
              title={`${item.etiqueta}: ${item.descripcion}`}
            >
              <span
                className="w-3.5 h-3.5 rounded-xs border border-slate-600 shadow-2xs inline-block shrink-0"
                style={{ backgroundColor: item.colorHex }}
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {item.etiqueta}
              </span>
            </div>
          ))}
        </div>

        {/* Grilla Dental Anatómica */}
        {tipoDenticion === "permanente" ? (
          <div className="mt-4 space-y-6">
            {/* Arcada Superior (18–11 y 21–28) */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 px-1">
                <span>Cuadrante 1 (Superior Derecho: 18–11)</span>
                <span className="text-[11px] text-teal-800 dark:text-teal-400 font-mono">
                  LÍNEA MEDIA
                </span>
                <span>Cuadrante 2 (Superior Izquierdo: 21–28)</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-1.5 sm:gap-2">
                {arcadaSuperiorPermanente.map(renderizarBotonDiente)}
              </div>
            </div>

            {/* Arcada Inferior (48–41 y 31–38) */}
            <div className="pt-4 border-t border-dashed border-stone-300 dark:border-slate-700">
              <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-1.5 sm:gap-2">
                {arcadaInferiorPermanente.map(renderizarBotonDiente)}
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mt-2 px-1">
                <span>Cuadrante 4 (Inferior Derecho: 48–41)</span>
                <span className="text-[11px] text-teal-800 dark:text-teal-400 font-mono">
                  LÍNEA MEDIA
                </span>
                <span>Cuadrante 3 (Inferior Izquierdo: 31–38)</span>
              </div>
            </div>
          </div>
        ) : (
          /* Vista Infantil / Pediátrica */
          <div className="mt-4 p-6 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300">
                Dentición Decidua / Primaria (20 Piezas Dentales FDI 51-85)
              </h3>
              <Badge tone="teal" variant="pill">
                Pediátrico
              </Badge>
            </div>
            <p className="text-xs text-purple-800 dark:text-purple-400">
              Mapeo de arcada infantil para niños menores de 12 años.
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {dientesInfantiles.slice(0, 10).map((d) => (
                <div
                  key={d.num}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-purple-300 text-center"
                >
                  <span className="font-mono font-bold text-xs text-purple-900 dark:text-purple-300">
                    #{d.num}
                  </span>
                  <div className="text-[10px] text-slate-500">Temporal</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-2 border-t border-purple-200 dark:border-purple-800">
              {dientesInfantiles.slice(10, 20).map((d) => (
                <div
                  key={d.num}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-purple-300 text-center"
                >
                  <span className="font-mono font-bold text-xs text-purple-900 dark:text-purple-300">
                    #{d.num}
                  </span>
                  <div className="text-[10px] text-slate-500">Temporal</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Detalle del Diente Seleccionado + Formulario de Evolución + Historial Clínico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6 p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-mono font-bold text-teal-800 dark:text-teal-400 text-sm">
                Pieza FDI #{dienteActual.numeroFDI} · Cuadrante{" "}
                {dienteActual.cuadrante}
              </span>
              <span className="font-mono tabular-nums text-slate-500">
                Última atención: {dienteActual.ultimaActualizacion}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {dienteActual.nombreAnatomico}
            </h3>

            {/* Selector interactivo de Superficie Activa */}
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Superficies anatómicas (Haz clic para seleccionar):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(
                  [
                    "oclusal",
                    "vestibular",
                    "lingual",
                    "mesial",
                    "distal",
                  ] as SuperficieDental[]
                ).map((sup) => {
                  const estadoSup = dienteActual.superficies[sup];
                  const esActiva = superficieForm === sup;
                  return (
                    <button
                      key={sup}
                      type="button"
                      onClick={() => setSuperficieForm(sup)}
                      className={`min-h-11 p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        esActiva
                          ? "border-teal-700 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600/30"
                          : "border-stone-200 dark:border-slate-700 hover:border-stone-400 bg-stone-50/60 dark:bg-slate-800"
                      }`}
                    >
                      <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                        {sup}:
                      </span>
                      <span
                        className="font-bold text-[11px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor:
                            estadoSup === "SANO"
                              ? "#E2E8F0"
                              : obtenerColorEstado(estadoSup),
                          color:
                            estadoSup === "SANO" || estadoSup === "CORONA"
                              ? "#0F172A"
                              : "#FFFFFF",
                        }}
                      >
                        {estadoSup}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setSuperficieForm("GENERAL")}
                  className={`min-h-11 p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                    superficieForm === "GENERAL"
                      ? "border-teal-700 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600/30"
                      : "border-stone-200 dark:border-slate-700 hover:border-stone-400 bg-stone-50/60 dark:bg-slate-800"
                  }`}
                >
                  <span className="font-bold text-teal-950 dark:text-teal-300">
                    Pieza Entera:
                  </span>
                  <span className="font-bold text-[11px] text-teal-900 dark:text-teal-200">
                    {dienteActual.estadoGeneral}
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-1">
                Nota clínica de la pieza #{dienteActual.numeroFDI}:
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {dienteActual.notaClinica}
              </p>
            </div>
          </div>

          {/* Formulario de evolución (Solo Dentista) */}
          {editable ? (
            <AsyncForm
              onSubmit={handleSubmitEdicion}
              className="mt-6 pt-5 border-t border-stone-200 dark:border-slate-800 space-y-3"
            >
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Registrar cambio clínico en pieza #{dienteActual.numeroFDI}
              </h4>

              {/* Botones de Selección Rápida de Estado */}
              <div>
                <span className="text-xs text-slate-500 block mb-1">
                  Atajo rápido de estado clínico:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ESTADOS_DIENTE.map((st) => (
                    <button
                      key={st.estado}
                      type="button"
                      onClick={() => setEstadoForm(st.estado)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                        estadoForm === st.estado
                          ? "ring-2 ring-teal-600 border-teal-700 bg-teal-700 text-white"
                          : "border-stone-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {st.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  id="odo-superficie"
                  label="Superficie a intervenir"
                  value={superficieForm}
                  onChange={(e) =>
                    setSuperficieForm(
                      e.target.value as SuperficieDental | "GENERAL",
                    )
                  }
                >
                  <option value="oclusal">Superficie Oclusal / Incisal</option>
                  <option value="vestibular">Superficie Vestibular</option>
                  <option value="lingual">Superficie Lingual / Palatina</option>
                  <option value="mesial">Superficie Mesial</option>
                  <option value="distal">Superficie Distal</option>
                  <option value="GENERAL">Pieza Completa (General)</option>
                </Select>

                <Select
                  id="odo-estado"
                  label="Nuevo estado clínico"
                  value={estadoForm}
                  onChange={(e) =>
                    setEstadoForm(e.target.value as EstadoDiente)
                  }
                >
                  <option value="">Selecciona un nuevo estado</option>
                  {ESTADOS_DIENTE.map((st) => (
                    <option key={st.estado} value={st.estado}>
                      {st.etiqueta} ({st.estado})
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                id="odo-proc"
                error={fieldErrors.procedimiento}
                label="Procedimiento realizado"
                value={procedimientoForm}
                onChange={(e) => setProcedimientoForm(e.target.value)}
                placeholder="Ej. Resina compuesta fotocurable A2"
              />

              <Input
                id="odo-nota"
                error={fieldErrors.nota}
                label="Nota clínica de evolución"
                value={notaForm}
                onChange={(e) => setNotaForm(e.target.value)}
                placeholder="Ej. Aislamiento absoluto y adhesión de 7ma generación"
              />

              {mensajeGuardado && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-xs text-teal-950 dark:text-teal-200 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>{mensajeGuardado}</span>
                </div>
              )}

              <p className="text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                Revisa antes de confirmar: {pacienteNombre}, pieza{" "}
                {dienteActual.numeroFDI}, superficie {superficieForm}. Estado
                previo:{" "}
                {superficieForm === "GENERAL"
                  ? dienteActual.estadoGeneral
                  : dienteActual.superficies[superficieForm]}
                . Nuevo estado: {estadoForm || "sin seleccionar"}.
              </p>
              <Button type="submit" disabled={!estadoForm} className="w-full">
                Guardar Cambio y Registrar en Auditoría
              </Button>
            </AsyncForm>
          ) : (
            <div className="mt-6 pt-4 border-t border-stone-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                El odontograma es de solo lectura en el Portal del Paciente.
                Únicamente tu odontólogo tratante puede modificar estados
                dentales.
              </span>
            </div>
          )}
        </Card>

        {/* Bitácora de Auditoría Clínica */}
        <Card className="lg:col-span-6 p-6 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-400">
            <History className="w-4 h-4" />
            <span>Trazabilidad Clínica Inmutable</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            Historial de Auditoría de Cambios del Odontograma
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Registro legal y forense de quién, cuándo y qué superficie fue intervenida.
          </p>

          {odontograma.historialCambios.length === 0 ? (
            <div className="mt-6 p-8 rounded-xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-700 text-center text-xs text-slate-500">
              No se han registrado modificaciones recientes en este odontograma.
            </div>
          ) : (
            <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {odontograma.historialCambios.map((cambio) => (
                <div
                  key={cambio.id}
                  className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 text-xs space-y-1 hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      Diente #{cambio.numeroFDI} ({cambio.superficie})
                    </span>
                    <span className="font-mono tabular-nums text-[11px]">
                      {cambio.fechaHora}
                    </span>
                  </div>
                  <p className="font-semibold text-teal-900 dark:text-teal-300">
                    {cambio.estadoAnterior} → {cambio.estadoNuevo} ·{" "}
                    {cambio.procedimiento}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">{cambio.nota}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Autor: <strong>{cambio.autorNombre}</strong> (
                    {cambio.autorRol})
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
