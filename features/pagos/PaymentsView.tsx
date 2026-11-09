"use client";

import React, { useState, useEffect } from "react";
import type { Paciente, Tratamiento } from "@/domain";
import { Card, Button, Input, Select, Badge, Modal } from "@/components/ui";
import { AsyncForm } from "@/components/ui/AsyncForm";
import { formatCurrencyBs, formatFechaClinica } from "@/lib/formatters";
import {
  patientsService,
  type EstadoCuentaTratamiento,
  type PagoRecord,
} from "@/services/patients.service";
import {
  DollarSign,
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ShieldCheck,
  QrCode,
  Banknote,
} from "lucide-react";

interface PaymentsViewProps {
  paciente: Paciente;
  tratamientos: Tratamiento[];
  dentistaNombre?: string;
  onTratamientoActualizado?: () => void;
}

export function PaymentsView({
  paciente,
  tratamientos,
  dentistaNombre = "Dr. Dentista Tratante",
  onTratamientoActualizado,
}: PaymentsViewProps) {
  const [selectedTrtId, setSelectedTrtId] = useState<string>(
    tratamientos[0]?.id || "",
  );
  const [estadoCuenta, setEstadoCuenta] =
    useState<EstadoCuentaTratamiento | null>(null);
  const [loadingCuenta, setLoadingCuenta] = useState(false);
  const [pagoMonto, setPagoMonto] = useState<number>(0);
  const [pagoDescuento, setPagoDescuento] = useState<number>(0);
  const [pagoMetodo, setPagoMetodo] = useState<
    "EFECTIVO" | "TARJETA" | "TRANSFERENCIA"
  >("EFECTIVO");
  const [pagoNotas, setPagoNotas] = useState<string>("");
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recibo para imprimir
  const [reciboModalOpen, setReciboModalOpen] = useState(false);
  const [ultimoPagoEmitido, setUltimoPagoEmitido] = useState<{
    monto: number;
    metodo: string;
    fecha: string;
    tratamientoNombre: string;
    numeroRecibo: string;
  } | null>(null);

  const tratamientoActivo =
    tratamientos.find((t) => t.id === selectedTrtId) || tratamientos[0];

  const cargarEstadoCuenta = async (trtId: string) => {
    if (!trtId) return;
    setLoadingCuenta(true);
    try {
      const data = await patientsService.obtenerEstadoCuenta(trtId);
      setEstadoCuenta(data);
      // Sugerir monto del saldo pendiente por defecto
      if (data && data.saldoPendiente > 0) {
        setPagoMonto(data.saldoPendiente);
      } else {
        setPagoMonto(0);
      }
    } catch {
      // Ignorar fallback si mock
    } finally {
      setLoadingCuenta(false);
    }
  };

  useEffect(() => {
    if (selectedTrtId) {
      void cargarEstadoCuenta(selectedTrtId);
    }
  }, [selectedTrtId]);

  const handleAprobarPresupuesto = async (trtId: string) => {
    try {
      await patientsService.aprobarPresupuesto(trtId);
      setMensajeExito("Presupuesto pactado y aprobado. Costo congelado.");
      await cargarEstadoCuenta(trtId);
      onTratamientoActualizado?.();
    } catch {
      // Manejar error si aplica
    }
  };

  const handleRegistrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tratamientoActivo || pagoMonto <= 0) return;

    setIsSubmitting(true);
    setMensajeExito(null);

    // Clave de idempotencia única contra doble clic
    const idempotencyKey = `pay-${tratamientoActivo.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      await patientsService.registrarPago(tratamientoActivo.id, {
        montoMXN: pagoMonto,
        descuentoMXN: pagoDescuento || 0,
        metodoPago: pagoMetodo,
        idempotencyKey,
        notas: pagoNotas || `Abono de tratamiento ${tratamientoActivo.nombre}`,
      });

      const numeroRecibo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
      setUltimoPagoEmitido({
        monto: pagoMonto,
        metodo: pagoMetodo,
        fecha: new Date().toLocaleDateString("es-BO"),
        tratamientoNombre: tratamientoActivo.nombre,
        numeroRecibo,
      });

      setMensajeExito(
        `Abono de ${formatCurrencyBs(pagoMonto)} registrado con éxito bajo comprobante #${numeroRecibo}.`,
      );
      setReciboModalOpen(true);
      setPagoNotas("");
      setPagoDescuento(0);
      await cargarEstadoCuenta(tratamientoActivo.id);
      onTratamientoActualizado?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar el pago.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cálculos globales del paciente en Bs
  const totalPresupuestoBs = tratamientos.reduce(
    (acc, t) => acc + (t.costoTotalMXN || 0),
    0,
  );
  const totalAbonadoBs = estadoCuenta ? estadoCuenta.totalPagado : 0;
  const saldoPendienteBs = estadoCuenta
    ? estadoCuenta.saldoPendiente
    : Math.max(0, (tratamientoActivo?.costoTotalMXN || 0) - totalAbonadoBs);

  return (
    <div className="space-y-6">
      {/* Resumen Financiero Superior en Bolivianos (Bs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-teal-700 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">
            Total Presupuestado
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {formatCurrencyBs(totalPresupuestoBs)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {tratamientos.length} plan(es) de tratamiento
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">
            Total Pagado / Abonado
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatCurrencyBs(totalAbonadoBs)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Abonos registrados en caja
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">
            Descuentos Clínicos
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums mt-1">
            {formatCurrencyBs(estadoCuenta?.totalDescuentos || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Descuentos autorizados
          </div>
        </Card>

        <Card
          className={`p-4 border-l-4 bg-white dark:bg-slate-900 shadow-xs ${
            saldoPendienteBs > 0 ? "border-l-red-600" : "border-l-emerald-600"
          }`}
        >
          <div className="text-xs text-slate-500 uppercase font-semibold">
            Saldo Pendiente (Bs)
          </div>
          <div
            className={`font-mono text-xl sm:text-2xl font-bold tabular-nums mt-1 ${
              saldoPendienteBs > 0
                ? "text-red-700 dark:text-red-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {formatCurrencyBs(saldoPendienteBs)}
          </div>
          <div className="text-[11px] mt-0.5">
            {saldoPendienteBs > 0 ? (
              <span className="text-red-600 font-medium">Deuda activa</span>
            ) : (
              <span className="text-emerald-600 font-medium">Al día</span>
            )}
          </div>
        </Card>
      </div>

      {mensajeExito && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-xs text-teal-950 dark:text-teal-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-teal-800 hover:underline font-semibold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Selector de Plan de Tratamiento y Formulario de Cobro */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario de Caja y Registro de Cobros */}
        <Card className="lg:col-span-6 p-6 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-400">
            <DollarSign className="w-4 h-4" />
            <span>Módulo de Cobranza y Caja</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            Registrar Abono o Pago Parcial (Bs)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Transacciones seguras con clave de idempotencia anti-doble clic.
          </p>

          <form onSubmit={handleRegistrarAbono} className="mt-4 space-y-3.5">
            <Select
              id="pay-treatment"
              label="Tratamiento / Concepto a Cobrar"
              value={selectedTrtId}
              onChange={(e) => setSelectedTrtId(e.target.value)}
            >
              {tratamientos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} — {formatCurrencyBs(t.costoTotalMXN)} ({t.estado})
                </option>
              ))}
            </Select>

            {/* Presupuesto Aprobado Banner */}
            {estadoCuenta && (
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-700 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Estado del Presupuesto:
                  </span>
                  <span className="text-slate-500">
                    {estadoCuenta.presupuestoAprobado
                      ? "Aprobado (Precio congelado)"
                      : "Borrador preliminar"}
                  </span>
                </div>
                {!estadoCuenta.presupuestoAprobado && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAprobarPresupuesto(selectedTrtId)}
                  >
                    Aprobar Presupuesto
                  </Button>
                )}
              </div>
            )}

            <div>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0.5"
                required
                label="Monto a Abonar (en Bolivianos - Bs)"
                value={pagoMonto || ""}
                onChange={(e) => setPagoMonto(Number(e.target.value))}
                placeholder="0.00"
              />

              {/* Botones de sugerencia de montos */}
              {saldoPendienteBs > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] text-slate-500">Sugerencias:</span>
                  <button
                    type="button"
                    onClick={() => setPagoMonto(saldoPendienteBs)}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-slate-700"
                  >
                    Saldo Total ({formatCurrencyBs(saldoPendienteBs)})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPagoMonto(Math.round((saldoPendienteBs / 2) * 100) / 100)
                    }
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-slate-700"
                  >
                    50%
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="pay-discount"
                type="number"
                step="0.01"
                min="0"
                label="Descuento aplicado (Bs, opcional)"
                value={pagoDescuento || ""}
                onChange={(e) => setPagoDescuento(Number(e.target.value))}
                placeholder="0.00"
              />

              <Select
                id="pay-method"
                label="Método de Pago"
                value={pagoMetodo}
                onChange={(e) =>
                  setPagoMetodo(
                    e.target.value as "EFECTIVO" | "TARJETA" | "TRANSFERENCIA",
                  )
                }
              >
                <option value="EFECTIVO">Efectivo (Bs)</option>
                <option value="TRANSFERENCIA">Transferencia / QR Simple</option>
                <option value="TARJETA">Tarjeta de Débito / Crédito</option>
              </Select>
            </div>

            <Input
              id="pay-notes"
              label="Observaciones / Referencia del Recibo"
              value={pagoNotas}
              onChange={(e) => setPagoNotas(e.target.value)}
              placeholder="Ej. Recibo de anticipo para ortodoncia"
            />

            <Button
              type="submit"
              disabled={isSubmitting || pagoMonto <= 0}
              className="w-full flex items-center justify-center gap-2 mt-4"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Procesando abono..."
                  : `Cobrar ${formatCurrencyBs(pagoMonto)}`}
              </span>
            </Button>
          </form>
        </Card>

        {/* Historial de Pagos y Abonos Registrados */}
        <Card className="lg:col-span-6 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-400">
                <Receipt className="w-4 h-4" />
                <span>Libro de Ingresos del Tratamiento</span>
              </div>
              <Badge tone="teal" variant="pill">
                Auditoría Financiera
              </Badge>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              Comprobantes y Abonos Emitidos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paciente: {paciente.nombreCompleto} (EXP: {paciente.codigoExpediente})
            </p>

            <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {!estadoCuenta || estadoCuenta.pagos.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-stone-50 dark:bg-slate-800/50 rounded-xl border border-stone-200 dark:border-slate-700">
                  Aún no se han emitido pagos para este tratamiento.
                </div>
              ) : (
                estadoCuenta.pagos.map((pago, index) => (
                  <div
                    key={pago.id || index}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrencyBs(pago.montoMXN)}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-semibold">
                          {pago.metodoPago}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        {pago.createdAt
                          ? new Date(pago.createdAt).toLocaleString("es-BO")
                          : "Fecha confirmada"}
                      </div>
                      {pago.notas && (
                        <p className="text-slate-600 dark:text-slate-400 mt-1 text-[11px]">
                          {pago.notas}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUltimoPagoEmitido({
                          monto: pago.montoMXN,
                          metodo: pago.metodoPago,
                          fecha: pago.createdAt
                            ? new Date(pago.createdAt).toLocaleDateString("es-BO")
                            : new Date().toLocaleDateString("es-BO"),
                          tratamientoNombre:
                            tratamientoActivo?.nombre || "Tratamiento Dental",
                          numeroRecibo: `REC-${pago.id.slice(-6).toUpperCase()}`,
                        });
                        setReciboModalOpen(true);
                      }}
                      className="min-h-11 min-w-11 px-2.5 py-1 text-slate-600 hover:text-teal-800 dark:text-slate-400 dark:hover:text-teal-300 rounded border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-700 text-xs flex items-center gap-1 transition-colors"
                      title="Ver e imprimir recibo"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Recibo</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
            <span>Moneda oficial: Bolivianos (Bs)</span>
            <span className="font-mono">Lumina Dental Facturación</span>
          </div>
        </Card>
      </div>

      {/* Modal de Comprobante / Recibo de Pago Imprimible */}
      <Modal
        isOpen={reciboModalOpen}
        onClose={() => setReciboModalOpen(false)}
        title="Comprobante Oficial de Pago Dental"
      >
        {ultimoPagoEmitido && (
          <div className="space-y-4 print:p-6" id="comprobante-recibo">
            <div className="border border-stone-300 dark:border-slate-700 rounded-xl p-5 bg-[#FAF9F6] dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              {/* Encabezado Clínica */}
              <div className="flex justify-between items-start border-b border-stone-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-base text-teal-900 dark:text-teal-400">
                    CLÍNICA ODONTOLÓGICA LUMINA
                  </h4>
                  <p className="text-xs text-slate-500">
                    Atención Odontológica Integral & Especialidades
                  </p>
                  <p className="text-xs text-slate-500">
                    La Paz / Cochabamba / Santa Cruz, Bolivia
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {ultimoPagoEmitido.numeroRecibo}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Fecha: {ultimoPagoEmitido.fecha}
                  </span>
                </div>
              </div>

              {/* Datos del Paciente */}
              <div className="grid grid-cols-2 gap-3 py-3 border-b border-stone-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Paciente:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {paciente.nombreCompleto}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expediente Clínico:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {paciente.codigoExpediente}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Odontólogo:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {dentistaNombre}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Método de Cobro:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {ultimoPagoEmitido.metodo}
                  </span>
                </div>
              </div>

              {/* Detalle del Pago */}
              <div className="py-3 border-b border-stone-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">
                    Concepto:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {ultimoPagoEmitido.tratamientoNombre}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-stone-300 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    TOTAL ABONADO:
                  </span>
                  <span className="font-mono font-bold text-teal-800 dark:text-teal-400 text-base tabular-nums">
                    {formatCurrencyBs(ultimoPagoEmitido.monto)}
                  </span>
                </div>
              </div>

              {/* Firmas de Conformidad */}
              <div className="pt-8 grid grid-cols-2 gap-6 text-center text-[11px] text-slate-500">
                <div className="border-t border-stone-400 pt-1">
                  <span>Firma del Odontólogo / Caja</span>
                </div>
                <div className="border-t border-stone-400 pt-1">
                  <span>Firma de Conformidad del Paciente</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReciboModalOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprobante</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
