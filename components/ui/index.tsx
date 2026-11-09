"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * SISTEMA DE COMPONENTES UI PROPIOS Y DESACOPLADOS
 * Basados exclusivamente en Design Tokens CSS (--color-*, --radius-*).
 * Cambiar el tema visual implica editar únicamente styles/tokens.css y este archivo.
 */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-xs sm:text-sm",
    lg: "px-5 py-2.5 text-sm",
  }[size];

  const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold",
    secondary:
      "bg-[var(--color-bg-subtle)] hover:opacity-90 text-[var(--color-text-main)] font-semibold",
    outline:
      "bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] font-medium",
    danger: "bg-red-50 hover:bg-red-100 text-red-700 font-semibold",
    ghost:
      "bg-transparent hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-medium",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] transition-colors cursor-pointer whitespace-normal text-center min-h-11 disabled:opacity-50 ${sizeClasses} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`min-w-0 bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] rounded-[var(--radius-xl)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Input({
  label,
  id,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  const generated = useId();
  const inputId = id || generated;
  const errorId = `${inputId}-error`;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-[var(--color-text-muted)] mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full min-h-11 px-3.5 py-2 text-sm bg-[var(--color-bg-canvas)] border border-[var(--color-border-strong)] rounded-[var(--radius-md)] text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-primary)] ${className}`}
        {...props}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={
          [props["aria-describedby"], error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  id,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
}) {
  const generated = useId();
  const selectId = id || generated;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-[var(--color-text-muted)] mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full min-h-11 px-3 py-2 text-sm bg-[var(--color-bg-canvas)] border border-[var(--color-border-strong)] rounded-[var(--radius-md)] text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-primary)] ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-stone-200 dark:bg-slate-800 rounded-md ${className}`}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
  variant = "pill",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "amber" | "red" | "success" | "danger" | "warning" | "info";
  variant?: "inline" | "pill";
  className?: string;
}) {
  const toneClass = {
    neutral:
      variant === "pill"
        ? "bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-300 border border-stone-300 dark:border-slate-700"
        : "text-[var(--color-text-muted)]",
    teal:
      variant === "pill"
        ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
        : "text-[var(--color-primary)] font-semibold",
    amber:
      variant === "pill"
        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
        : "text-amber-700 font-semibold",
    warning:
      variant === "pill"
        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
        : "text-amber-700 font-semibold",
    red:
      variant === "pill"
        ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold"
        : "text-red-700 font-semibold",
    danger:
      variant === "pill"
        ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold"
        : "text-red-700 font-semibold",
    success:
      variant === "pill"
        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        : "text-emerald-700 font-semibold",
    info:
      variant === "pill"
        ? "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
        : "text-sky-700 font-semibold",
  }[tone];

  const pillClass =
    variant === "pill"
      ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      : "text-xs";

  return <span className={`${pillClass} ${toneClass} ${className}`}>{children}</span>;
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel,
  id = "portal-tabs",
}: {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  id?: string;
}) {
  return (
    <>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1.5 border-b border-stone-200 pb-3 overflow-x-auto max-w-full"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${id}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={tab.id === activeTab ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + tabs.length) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              onChange(tabs[next].id);
              document.getElementById(`${id}-tab-${tabs[next].id}`)?.focus();
            }}
            className={`min-h-11 px-3 py-2 text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 ${tab.id === activeTab ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-stone-100"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs
        .filter((tab) => tab.id !== activeTab)
        .map((tab) => (
          <div
            key={tab.id}
            hidden
            role="tabpanel"
            id={`${id}-panel-${tab.id}`}
            aria-labelledby={`${id}-tab-${tab.id}`}
          />
        ))}
    </>
  );
}
export function TabPanel({
  activeTab,
  id = "portal-tabs",
  children,
}: {
  activeTab: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      role="tabpanel"
      tabIndex={0}
      id={`${id}-panel-${activeTab}`}
      aria-labelledby={`${id}-tab-${activeTab}`}
    >
      {children}
    </section>
  );
}
export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    if (!isOpen || !node) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const siblings = [...document.body.children].filter((el) => el !== node);
    const inert = siblings.map((el) => [el, el.hasAttribute("inert")] as const);
    siblings.forEach((el) => el.setAttribute("inert", ""));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node.showModal();
    (
      node.querySelector<HTMLElement>("[data-autofocus]") ||
      node.querySelector<HTMLElement>(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
      ) ||
      node
    ).focus();
    return () => {
      if (node.open) node.close();
      inert.forEach(([el, wasInert]) => {
        if (!wasInert) el.removeAttribute("inert");
      });
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={dialog}
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed m-auto z-[100] w-[calc(100%_-_2rem)] max-w-lg max-h-[calc(100dvh_-_2rem)] overflow-y-auto bg-white text-slate-900 border border-stone-300 rounded-2xl p-5 shadow-xl backdrop:bg-slate-900/50"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          return;
        }
        if (event.key !== "Tab") return;
        event.stopPropagation();
        const elements = [
          ...event.currentTarget.querySelectorAll<HTMLElement>("*"),
        ].filter(
          (el) =>
            el.matches("button,a[href],input,select,textarea,[tabindex]") &&
            !el.matches(":disabled") &&
            el.tabIndex >= 0 &&
            el.getAttribute("type") !== "hidden" &&
            !el.closest("[hidden]"),
        );
        const first = elements[0],
          last = elements.at(-1);
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="min-w-11 min-h-11 flex items-center justify-center shrink-0"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </dialog>,
    document.body,
  );
}
