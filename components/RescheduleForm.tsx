"use client";
import React, { useState } from "react";
import type { Cita } from "@/domain";
import type { ReagendarCitaPayload } from "@/data/repositories";
import { today, addDays } from "@/domain/clinical";
import { useDisponibilidad } from "@/hooks";
import { Input, Select, Button } from "./ui";
import { AsyncForm } from "./ui/AsyncForm";
import { QueryState } from "./ui/QueryState";
export function RescheduleForm({
  cita,
  onSave,
}: {
  cita: Cita;
  onSave: (payload: ReagendarCitaPayload) => Promise<void>;
}) {
  const [date, setDate] = useState(() => addDays(today(), 1)),
    [time, setTime] = useState("");
  const availability = useDisponibilidad(
    cita.dentistaId,
    date,
    cita.servicioId,
  );
  const selected = availability.horarios.includes(time) ? time : "";
  return (
    <AsyncForm
      className="space-y-4"
      onSubmit={async () => {
        await availability.revalidate(selected);
        await onSave({
          citaId: cita.id,
          nuevaFecha: date,
          nuevaHora: selected,
        });
      }}
    >
      <p className="text-sm">
        {cita.pacienteNombre} · {cita.servicioNombre} · Actual: {cita.fecha}{" "}
        {cita.hora}
      </p>
      <Input
        id="reschedule-date"
        label="Nueva fecha"
        type="date"
        min={today()}
        required
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          setTime("");
        }}
      />
      <QueryState
        loading={availability.loading}
        error={availability.error}
        empty={!availability.horarios.length}
        onRetry={availability.reload}
        emptyMessage="No hay horarios disponibles para esta fecha."
      >
        <Select
          id="reschedule-time"
          label="Nuevo horario"
          required
          value={selected}
          onChange={(e) => setTime(e.target.value)}
        >
          <option value="">Selecciona un horario</option>
          {availability.horarios.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </Select>
      </QueryState>
      <Button
        type="submit"
        disabled={
          availability.loading ||
          !!availability.error ||
          !selected ||
          date < today()
        }
      >
        Confirmar nuevo horario
      </Button>
    </AsyncForm>
  );
}
