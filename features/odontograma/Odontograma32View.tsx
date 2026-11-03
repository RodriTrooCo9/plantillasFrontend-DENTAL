"use client";

import { toothInputSchema } from "@/domain/validation";
import { AsyncForm } from "@/components/ui/AsyncForm";

import React, { useState, useEffect } from "react";
import { Odontograma, Diente, EstadoDiente, SuperficieDental } from "@/domain";
import { EditarDientePayload } from "@/data/repositories";
import { Card, Button, Select, Input } from "@/components/ui";
import { Lock, ShieldCheck, History, CheckCircle2 } from "lucide-react";

interface Odontograma32ViewProps {
  odontograma: Odontograma;
  pacienteNombre: string;
  editable: boolean; // false = PACIENTE (solo lectura), true = DENTISTA (editable + auditoría)
  dentistaAutorNombre?: string;
  onGuardarCambio?: (payload: EditarDientePayload) => Promise<unknown>;
}

const ESTADOS_DIENTE: {
  estado: EstadoDiente;
  etiqueta: string;
  colorHex: string;
}[] = [
  { estado: "SANO", etiqueta: "Sano", colorHex: "#FFFFFF" },
  { estado: "CARIES", etiqueta: "Caries activa", colorHex: "#DC2626" },
  { estado: "OBTURADO", etiqueta: "Obturado / Resina", colorHex: "#2563EB" },
  { estado: "ENDODONCIA", etiqueta: "Endodoncia", colorHex: "#7C3AED" },
  { estado: "CORONA", etiqueta: "Corona / Lente", colorHex: "#D97706" },
  { estado: "IMPLANTE", etiqueta: "Implante Titanio", colorHex: "#0D9488" },
  { estado: "AUSENTE", etiqueta: "Ausente", colorHex: "#94A3B8" },
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
      <p role="alert">
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
  const [dienteSeleccionadoFDI, setDienteSeleccionadoFDI] =
    useState<number>(16);
  const [superficieForm, setSuperficieForm] = useState<
    SuperficieDental | "GENERAL"
  >("oclusal");
  const [estadoForm, setEstadoForm] = useState<EstadoDiente | "">("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [procedimientoForm, setProcedimientoForm] = useState<string>("");
  const [notaForm, setNotaForm] = useState<string>("");
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  const dienteActual: Diente =
    odontograma.dientes.find((d) => d.numeroFDI === dienteSeleccionadoFDI) ||
    odontograma.dientes[0];

  const arcadaSuperior = odontograma.dientes.slice(0, 16);
  const arcadaInferior = odontograma.dientes.slice(16, 32);

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
    await onGuardarCambio({
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
    });

    setProcedimientoForm("");
    setNotaForm("");
    setMensajeGuardado(
      `Se guardó el cambio en el diente #${dienteActual.numeroFDI} y se registró en la auditoría.`,
    );
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
        className={`p-1.5 rounded-lg border flex flex-col items-center transition-all cursor-pointer ${
          seleccionado
            ? "border-teal-800 bg-teal-50/80 ring-2 ring-teal-700/20"
            : "border-stone-200 hover:border-stone-400 bg-white"
        }`}
      >
        <span className="text-[11px] font-mono font-bold tabular-nums text-slate-900">
          {diente.numeroFDI}
        </span>

        {/* Representación geométrica de las 5 superficies dentales */}
        <svg viewBox="0 0 40 40" className="w-8 h-8 my-1" aria-hidden="true">
          {/* Vestibular (Arriba) */}
          <polygon
            points="4,4 36,4 28,12 12,12"
            fill={colorVestibular}
            stroke="#475569"
            strokeWidth="1.2"
          />
          {/* Lingual/Palatino (Abajo) */}
          <polygon
            points="12,28 28,28 36,36 4,36"
            fill={colorLingual}
            stroke="#475569"
            strokeWidth="1.2"
          />
          {/* Mesial (Izquierda) */}
          <polygon
            points="4,4 12,12 12,28 4,36"
            fill={colorMesial}
            stroke="#475569"
            strokeWidth="1.2"
          />
          {/* Distal (Derecha) */}
          <polygon
            points="28,12 36,4 36,36 28,28"
            fill={colorDistal}
            stroke="#475569"
            strokeWidth="1.2"
          />
          {/* Oclusal/Incisal (Centro) */}
          <rect
            x="12"
            y="12"
            width="16"
            height="16"
            fill={colorOclusal}
            stroke="#334155"
            strokeWidth="1.4"
          />
          {diente.estadoGeneral === "AUSENTE" && (
            <>
              <line
                x1="4"
                y1="4"
                x2="36"
                y2="36"
                stroke="#1E293B"
                strokeWidth="2.5"
              />
              <line
                x1="36"
                y1="4"
                x2="4"
                y2="36"
                stroke="#1E293B"
                strokeWidth="2.5"
              />
            </>
          )}
        </svg>

        <span className="text-[11px] font-medium text-slate-600 truncate max-w-full">
          {diente.estadoGeneral}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Mapa de 32 dientes FDI + Leyenda de Colores */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-teal-800 font-semibold">
              {editable ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Modo Clínico Editable (Exclusivo Dentista)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Modo Consulta de Paciente (Solo Lectura)</span>
                </>
              )}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-1">
              Odontograma Anatómico de 32 Dientes (Numeración FDI) —{" "}
              {pacienteNombre}
            </h2>
          </div>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {ESTADOS_DIENTE.map((item) => (
              <div key={item.estado} className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-xs border border-slate-500 inline-block shrink-0"
                  style={{ backgroundColor: item.colorHex }}
                />
                <span className="text-slate-700">{item.etiqueta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arcada Superior (18-11 | 21-28) */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
            <span>Cuadrante 1 (Superior Derecho: 18–11)</span>
            <span>Cuadrante 2 (Superior Izquierdo: 21–28)</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-1.5">
            {arcadaSuperior.map(renderizarBotonDiente)}
          </div>
        </div>

        {/* Arcada Inferior (48-41 | 31-38) */}
        <div className="mt-6 pt-5 border-t border-stone-200">
          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-1.5">
            {arcadaInferior.map(renderizarBotonDiente)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
            <span>Cuadrante 4 (Inferior Derecho: 48–41)</span>
            <span>Cuadrante 3 (Inferior Izquierdo: 31–38)</span>
          </div>
        </div>
      </Card>

      {/* Detalle del Diente Seleccionado + Editor (Solo Dentista) + Historial de Auditoría */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-mono font-bold text-teal-800">
                Diente FDI #{dienteActual.numeroFDI} · Cuadrante{" "}
                {dienteActual.cuadrante}
              </span>
              <span className="font-mono tabular-nums">
                Actualizado: {dienteActual.ultimaActualizacion}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mt-1">
              {dienteActual.nombreAnatomico}
            </h3>

            {/* Estado por superficie */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {(
                [
                  "oclusal",
                  "vestibular",
                  "lingual",
                  "mesial",
                  "distal",
                ] as SuperficieDental[]
              ).map((sup) => (
                <div
                  key={sup}
                  className="p-2.5 rounded-lg bg-[#FAF9F6] border border-stone-200 flex items-center justify-between"
                >
                  <span className="capitalize text-slate-600">{sup}:</span>
                  <span className="font-semibold text-slate-900">
                    {dienteActual.superficies[sup]}
                  </span>
                </div>
              ))}
              <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 flex items-center justify-between">
                <span className="text-teal-900 font-medium">General:</span>
                <span className="font-bold text-teal-950">
                  {dienteActual.estadoGeneral}
                </span>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 text-xs">
              <span className="font-semibold text-slate-900 block mb-1">
                Nota clínica e historial de la pieza #{dienteActual.numeroFDI}:
              </span>
              <p className="text-slate-700 leading-relaxed">
                {dienteActual.notaClinica}
              </p>
            </div>
          </div>

          {/* Formulario de edición EXCLUSIVO para rol DENTISTA */}
          {editable ? (
            <AsyncForm
              onSubmit={handleSubmitEdicion}
              className="mt-6 pt-5 border-t border-stone-200 space-y-3"
            >
              <h4 className="text-sm font-semibold text-slate-900">
                Registrar cambio clínico en pieza #{dienteActual.numeroFDI}
              </h4>
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
                  className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-950 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>{mensajeGuardado}</span>
                </div>
              )}

              <p className="text-sm bg-amber-50 p-3 rounded-lg">
                Revisa antes de guardar: {pacienteNombre}, pieza{" "}
                {dienteActual.numeroFDI}, superficie {superficieForm}. Estado
                previo:{" "}
                {superficieForm === "GENERAL"
                  ? dienteActual.estadoGeneral
                  : dienteActual.superficies[superficieForm]}
                . Nuevo: {estadoForm || "sin seleccionar"}.
              </p>
              <Button type="submit" disabled={!estadoForm} className="w-full">
                Guardar Cambio y Registrar en Auditoría
              </Button>
            </AsyncForm>
          ) : (
            <div className="mt-6 pt-4 border-t border-stone-200 text-xs text-slate-600 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                El odontograma es de solo lectura en el Portal del Paciente.
                Únicamente tu odontólogo tratante puede modificar estados
                dentales.
              </span>
            </div>
          )}
        </Card>

        {/* Bitácora de Auditoría de Cambios del Odontograma */}
        <Card className="lg:col-span-6 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
            <History className="w-4 h-4" />
            <span>Trazabilidad Clínica</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mt-1">
            Historial de Auditoría de Cambios del Odontograma
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Registro inmutable de quién, cuándo y qué superficie fue modificada.
          </p>

          {odontograma.historialCambios.length === 0 ? (
            <div className="mt-6 p-8 rounded-xl bg-[#FAF9F6] border border-stone-200 text-center text-xs text-slate-600">
              No se han registrado modificaciones recientes en este odontograma.
            </div>
          ) : (
            <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {odontograma.historialCambios.map((cambio) => (
                <div
                  key={cambio.id}
                  className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-mono font-bold text-slate-900">
                      Diente #{cambio.numeroFDI} ({cambio.superficie})
                    </span>
                    <span className="font-mono tabular-nums">
                      {cambio.fechaHora}
                    </span>
                  </div>
                  <p className="font-semibold text-teal-900">
                    {cambio.estadoAnterior} → {cambio.estadoNuevo} ·{" "}
                    {cambio.procedimiento}
                  </p>
                  <p className="text-slate-700">{cambio.nota}</p>
                  <p className="text-[11px] text-slate-600 pt-1">
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
