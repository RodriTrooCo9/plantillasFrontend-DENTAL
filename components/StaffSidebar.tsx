"use client";

import React, { useState } from "react";
import {
  Calendar,
  Users,
  Grid,
  FileText,
  DollarSign,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Activity,
  Layers,
} from "lucide-react";

export type StaffModuleTab =
  | "agenda"
  | "pacientes"
  | "odontograma"
  | "historial"
  | "tratamientos"
  | "pagos"
  | "inventario";

interface StaffSidebarProps {
  activeTab: StaffModuleTab;
  onSelectTab: (tab: StaffModuleTab) => void;
  waitingRoomCount?: number;
  onOpenCommandPalette?: () => void;
  onNewAppointmentClick?: () => void;
}

export function StaffSidebar({
  activeTab,
  onSelectTab,
  waitingRoomCount = 0,
  onOpenCommandPalette,
  onNewAppointmentClick,
}: StaffSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems: {
    id: StaffModuleTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: "agenda",
      label: "Agenda y Espera",
      icon: Calendar,
      badge: waitingRoomCount > 0 ? waitingRoomCount : undefined,
      badgeColor: "bg-teal-700 text-white",
    },
    {
      id: "pacientes",
      label: "Directorio Pacientes",
      icon: Users,
    },
    {
      id: "odontograma",
      label: "Odontograma Anatómico",
      icon: Layers,
    },
    {
      id: "historial",
      label: "Historial Clínico",
      icon: FileText,
    },
    {
      id: "tratamientos",
      label: "Tratamientos y Presupuestos",
      icon: Activity,
    },
    {
      id: "pagos",
      label: "Pagos y Caja (Bs)",
      icon: DollarSign,
    },
    {
      id: "inventario",
      label: "Inventario Dental",
      icon: Package,
    },
  ];

  return (
    <nav
      aria-label="Barra de navegación del consultorio dental"
      className={`hidden md:flex flex-col bg-slate-900 text-slate-200 transition-all duration-200 border-r border-slate-800 select-none shrink-0 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Encabezado del menú y botón para colapsar */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0" />
            <span className="font-bold text-sm tracking-wide text-white truncate">
              Módulos Clínicos
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Botón de Acceso Rápido / Command Palette */}
      <div className="p-3">
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title="Búsqueda global rápida (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-teal-400 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">Buscar rápido...</span>
                <kbd className="ml-auto font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                  Ctrl+K
                </kbd>
              </>
            )}
          </button>
        )}

        {onNewAppointmentClick && !collapsed && (
          <button
            type="button"
            onClick={onNewAppointmentClick}
            className="w-full mt-2 min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cita</span>
          </button>
        )}
      </div>

      {/* Lista de Navegación de Módulos */}
      <div className="flex-1 px-2 py-1 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full min-h-11 flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-teal-700 text-white font-semibold shadow-xs"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "text-white" : "text-slate-400"
                }`}
              />
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    item.badgeColor || "bg-slate-700 text-slate-200"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pie de la barra lateral */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="truncate">Lumina Dental v2.5</span>
            <span className="font-mono text-[10px] text-teal-400">BOB (Bs)</span>
          </div>
        ) : (
          <div className="text-center font-bold text-teal-400">Bs</div>
        )}
      </div>
    </nav>
  );
}
