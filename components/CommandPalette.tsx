"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Paciente } from "@/domain";
import { Search, User, Calendar, Layers, DollarSign, Package, X, ArrowRight } from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  pacientes: Paciente[];
  onSelectPaciente: (pacienteId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  pacientes,
  onSelectPaciente,
  onNavigateTab,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Escuchar atajo global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        }
      }
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Autofocus en el input al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalized = query.toLowerCase().trim();

  // Filtrar pacientes
  const filteredPacientes = pacientes
    .filter(
      (p) =>
        p.nombreCompleto.toLowerCase().includes(normalized) ||
        p.codigoExpediente.toLowerCase().includes(normalized) ||
        p.telefono.includes(normalized),
    )
    .slice(0, 5);

  // Acciones rápidas estándar
  const quickActions = [
    {
      id: "action-agenda",
      title: "Ir a Agenda de Citas",
      subtitle: "Ver citas de hoy y sala de espera",
      tab: "agenda",
      icon: Calendar,
    },
    {
      id: "action-odontograma",
      title: "Abrir Odontograma Anatómico",
      subtitle: "Ver piezas dentales FDI",
      tab: "odontograma",
      icon: Layers,
    },
    {
      id: "action-pagos",
      title: "Caja y Registro de Pagos (Bs)",
      subtitle: "Consultar saldos y registrar abonos",
      tab: "pagos",
      icon: DollarSign,
    },
    {
      id: "action-inventario",
      title: "Consultar Inventario Dental",
      subtitle: "Ver insumos críticos e instrumental",
      tab: "inventario",
      icon: Package,
    },
  ].filter(
    (a) =>
      !normalized ||
      a.title.toLowerCase().includes(normalized) ||
      a.subtitle.toLowerCase().includes(normalized),
  );

  const totalResults = [...filteredPacientes.map((p) => ({ type: "patient", data: p })), ...quickActions.map((a) => ({ type: "action", data: a }))];

  const handleSelect = (index: number) => {
    const item = totalResults[index];
    if (!item) return;
    if (item.type === "patient") {
      const p = item.data as Paciente;
      onSelectPaciente(p.id);
      handleClose();
    } else {
      const a = item.data as (typeof quickActions)[0];
      onNavigateTab(a.tab);
      handleClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev - 1 < 0 ? totalResults.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos rápidos"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-stone-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar paciente por nombre, expediente o acción clínica..."
            className="w-full text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar búsqueda"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de resultados */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {totalResults.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">
              No se encontraron pacientes ni acciones que coincidan con &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <>
              {filteredPacientes.length > 0 && (
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Pacientes
                </div>
              )}
              {filteredPacientes.map((p, i) => {
                const isSelected = selectedIndex === i;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPaciente(p.id);
                      handleClose();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200"
                        : "hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {p.nombreCompleto[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {p.nombreCompleto}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          EXP: {p.codigoExpediente} · Tel: {p.telefono}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}

              {quickActions.length > 0 && (
                <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider border-t border-stone-200 dark:border-slate-800 mt-1">
                  Acciones Rápidas
                </div>
              )}
              {quickActions.map((a, i) => {
                const actionIndex = filteredPacientes.length + i;
                const isSelected = selectedIndex === actionIndex;
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onNavigateTab(a.tab);
                      handleClose();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200"
                        : "hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {a.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {a.subtitle}
                        </div>
                      </div>
                    </div>
                    <kbd className="font-mono text-[10px] text-slate-400 bg-stone-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                      ↵
                    </kbd>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Pie con indicaciones de teclado */}
        <div className="px-3 py-2 bg-stone-50 dark:bg-slate-950 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>↑↓ para navegar</span>
            <span>↵ para seleccionar</span>
            <span>ESC para cerrar</span>
          </div>
          <span className="font-mono">Consultorio Dental</span>
        </div>
      </div>
    </div>
  );
}
