"use client";
import React from "react";
import { useOperation } from "@/hooks/use-operation";
export function AsyncForm({
  onSubmit,
  children,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const { pending, error, run } = useOperation();
  return (
    <form
      {...props}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        void run(() => onSubmit(event));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {pending && (
        <p role="status" className="text-sm text-slate-700">
          Guardando…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
