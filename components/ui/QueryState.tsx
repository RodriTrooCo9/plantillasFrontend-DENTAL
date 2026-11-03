"use client";
import React from "react";
export function QueryState({
  loading,
  error,
  empty,
  onRetry,
  children,
  emptyMessage = "No hay registros para mostrar.",
}: {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry: () => void;
  children: React.ReactNode;
  emptyMessage?: string;
}) {
  if (loading)
    return (
      <p role="status" className="p-4 text-sm text-slate-700">
        Cargando información…
      </p>
    );
  if (error)
    return (
      <div className="p-4">
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
        <button
          type="button"
          className="mt-2 min-h-11 underline text-teal-900"
          onClick={onRetry}
        >
          Reintentar
        </button>
      </div>
    );
  if (empty)
    return (
      <p role="status" className="p-4 text-sm text-slate-700">
        {emptyMessage}
      </p>
    );
  return <>{children}</>;
}
