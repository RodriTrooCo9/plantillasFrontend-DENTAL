"use client";

import React from "react";
import {
  Calendar,
  Layers,
  Activity,
  User,
  Home,
  MessageSquare,
} from "lucide-react";

export type PatientTab =
  | "inicio"
  | "citas"
  | "odontograma"
  | "tratamientos"
  | "perfil";

interface PatientBottomBarProps {
  activeTab: PatientTab;
  onSelectTab: (tab: PatientTab) => void;
  proximaCitaCount?: number;
  onOpenChatbot?: () => void;
}

export function PatientBottomBar({
  activeTab,
  onSelectTab,
  proximaCitaCount = 0,
  onOpenChatbot,
}: PatientBottomBarProps) {
  const items: {
    id: PatientTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: "inicio", label: "Inicio", icon: Home },
    {
      id: "citas",
      label: "Citas",
      icon: Calendar,
      badge: proximaCitaCount > 0 ? proximaCitaCount : undefined,
    },
    { id: "odontograma", label: "Dientes", icon: Layers },
    { id: "tratamientos", label: "Plan & Pagos", icon: Activity },
    { id: "perfil", label: "Perfil", icon: User },
  ];

  return (
    <nav
      aria-label="Navegación inferior móvil del paciente"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-stone-200 dark:border-slate-800 shadow-lg px-2 py-1 flex items-center justify-around h-16 safe-bottom"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 min-h-12 min-w-11 relative py-1 rounded-md transition-all ${
              isActive
                ? "text-teal-700 dark:text-teal-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold bg-teal-600 text-white rounded-full min-w-3.5 h-3.5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-none">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
