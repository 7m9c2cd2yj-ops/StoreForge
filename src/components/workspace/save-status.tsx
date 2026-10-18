"use client";

import * as React from "react";
import { AlertCircle, Check, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";

type Status = { state: "dirty" | "saving" | "saved" | "error"; error?: string };
type SaveResult = { ok: true } | { ok: false; error: string };

type Ctx = {
  statuses: Record<string, Status>;
  report: (key: string, status: Status) => void;
  register: (key: string, flush: () => Promise<void>) => () => void;
  retryAll: () => void;
};

const SaveStatusContext = React.createContext<Ctx | null>(null);

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = React.useState<Record<string, Status>>({});
  const flushers = React.useRef(new Map<string, () => Promise<void>>());

  const report = React.useCallback((key: string, status: Status) => {
    setStatuses((prev) => (prev[key]?.state === status.state && prev[key]?.error === status.error ? prev : { ...prev, [key]: status }));
  }, []);

  const register = React.useCallback((key: string, flush: () => Promise<void>) => {
    flushers.current.set(key, flush);
    return () => {
      flushers.current.delete(key);
    };
  }, []);

  const retryAll = React.useCallback(() => {
    flushers.current.forEach((flush) => void flush());
  }, []);

  // Warn before leaving with unsaved changes.
  const hasUnsaved = Object.values(statuses).some((s) => s.state !== "saved");
  React.useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  const value = React.useMemo(() => ({ statuses, report, register, retryAll }), [statuses, report, register, retryAll]);
  return <SaveStatusContext value={value}>{children}</SaveStatusContext>;
}

function useSaveStatusContext(): Ctx {
  const ctx = React.useContext(SaveStatusContext);
  if (!ctx) throw new Error("SaveStatusProvider missing");
  return ctx;
}

/**
 * Debounced autosave. Saves run one at a time; edits made during a save are
 * saved right after it, so the latest value always wins and is never lost.
 */
export function useAutosave<T>(key: string, value: T, save: (value: T) => Promise<SaveResult>, delay = 800) {
  const { report, register } = useSaveStatusContext();
  const serialized = JSON.stringify(value);
  const lastSaved = React.useRef(serialized);
  const latest = React.useRef(value);
  const saveRef = React.useRef(save);
  const inFlight = React.useRef(false);
  const queued = React.useRef(false);

  React.useEffect(() => {
    latest.current = value;
    saveRef.current = save;
  });

  const flush = React.useCallback(async (): Promise<void> => {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    try {
      do {
        queued.current = false;
        const snapshot = latest.current;
        const snapshotSerialized = JSON.stringify(snapshot);
        if (snapshotSerialized === lastSaved.current) {
          report(key, { state: "saved" });
          continue;
        }
        report(key, { state: "saving" });
        let result: SaveResult;
        try {
          result = await saveRef.current(snapshot);
        } catch {
          result = { ok: false, error: "Network error. Check your connection." };
        }
        if (!result.ok) {
          report(key, { state: "error", error: result.error });
          break;
        }
        lastSaved.current = snapshotSerialized;
        report(key, JSON.stringify(latest.current) === snapshotSerialized ? { state: "saved" } : { state: "dirty" });
      } while (queued.current);
    } finally {
      inFlight.current = false;
    }
  }, [key, report]);

  React.useEffect(() => register(key, flush), [key, flush, register]);

  React.useEffect(() => {
    if (serialized === lastSaved.current) return;
    report(key, { state: "dirty" });
    const timer = setTimeout(() => void flush(), delay);
    return () => clearTimeout(timer);
  }, [serialized, key, delay, flush, report]);

  // Save pending edits when the editor unmounts (e.g. switching tabs).
  React.useEffect(() => () => void flush(), [flush]);

  return flush;
}

/** Removes a key's status entry (e.g. after a product is deleted). */
export function useForgetStatus() {
  const { report } = useSaveStatusContext();
  return (key: string) => report(key, { state: "saved" });
}

export function SaveIndicator() {
  const { statuses, retryAll } = useSaveStatusContext();
  const values = Object.values(statuses);
  const error = values.find((s) => s.state === "error");
  const saving = values.some((s) => s.state === "saving");
  const dirty = values.some((s) => s.state === "dirty");

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-danger" role="alert">
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        <span className="line-clamp-1">{error.error ?? "Couldn't save"}</span>
        <Button size="sm" variant="secondary" onClick={retryAll}>
          Retry
        </Button>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-fg-subtle" aria-live="polite">
      {saving ? (
        <>
          <Spinner /> Saving…
        </>
      ) : dirty ? (
        <>
          <CloudUpload className="size-4" aria-hidden /> Unsaved changes
        </>
      ) : (
        <>
          <Check className="size-4 text-success" aria-hidden /> All changes saved
        </>
      )}
    </p>
  );
}
