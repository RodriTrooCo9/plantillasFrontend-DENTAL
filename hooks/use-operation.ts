"use client";
import { useState, useRef, useCallback, useSyncExternalStore } from "react";
import { operationError } from "@/domain/clinical";
let activeOperations = 0;
const operationListeners = new Set<() => void>();
function notifyOperations() {
  operationListeners.forEach((listener) => listener());
}
function subscribeOperations(listener: () => void) {
  operationListeners.add(listener);
  return () => {
    operationListeners.delete(listener);
  };
}
export function useAnyOperationPending() {
  return useSyncExternalStore(
    subscribeOperations,
    () => activeOperations > 0,
    () => false,
  );
}
export function useOperation() {
  const lock = useRef(false);
  const [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T>(operation: () => Promise<T>) => {
    if (lock.current) return;
    lock.current = true;
    activeOperations++;
    notifyOperations();
    setPending(true);
    setError(null);
    try {
      return await operation();
    } catch (e) {
      setError(operationError(e));
      return undefined;
    } finally {
      lock.current = false;
      activeOperations--;
      notifyOperations();
      setPending(false);
    }
  }, []);
  return { pending, error, run };
}
