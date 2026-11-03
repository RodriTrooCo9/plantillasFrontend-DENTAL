"use client";
import { useEffect, useState, useCallback } from "react";
export function useQuery<T>(
  key: string,
  load: () => Promise<T>,
  enabled = true,
) {
  const [revision, setRevision] = useState(0);
  const identity = `${key}:${revision}`;
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    load()
      .then((data) => {
        if (active) setResult({ key: identity, data });
      })
      .catch((error) => {
        if (active)
          setResult({
            key: identity,
            error:
              error instanceof Error
                ? error.message
                : "No fue posible cargar los datos.",
          });
      });
    return () => {
      active = false;
    };
  }, [identity, load, enabled]);
  const current = result?.key === identity ? result : undefined;
  const reload = useCallback(() => {
    setRevision((n) => n + 1);
  }, []);
  return {
    data: enabled ? current?.data : undefined,
    error: enabled ? current?.error : undefined,
    loading: enabled && !current,
    reload,
  };
}
