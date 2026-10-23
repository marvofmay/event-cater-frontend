"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { useUser } from "@/app/context/userContext";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function failure(response: Response): Promise<never> {
  const data = await response.json().catch(() => ({}));
  if (response.status === 409)
    throw new ApiError(
      409,
      "Dane zmieniły się od ich wczytania. Odśwież widok i porównaj zmiany przed ponownym zapisem. " +
        (data.message ?? ""),
    );
  if (response.status === 401)
    throw new ApiError(401, "Sesja wygasła. Zaloguj się ponownie.");
  if (response.status === 403)
    throw new ApiError(403, "Brak uprawnień do tej operacji.");
  throw new ApiError(
    response.status,
    data.message ?? "Nie udało się wykonać operacji.",
  );
}
export function useApi() {
  const { token } = useUser();
  return useCallback(
    async <T>(path: string, method = "GET", body?: unknown): Promise<T> => {
      if (!token) throw new ApiError(401, "Zaloguj się, aby kontynuować.");
      const multipart = body instanceof FormData;
      const response = await fetch("/api" + path, {
        method,
        cache: "no-store",
        headers: {
          Authorization: "Bearer " + token,
          ...(!multipart && body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          body === undefined
            ? undefined
            : multipart
              ? body
              : JSON.stringify(body),
      });
      if (!response.ok) return failure(response);
      return response.json() as Promise<T>;
    },
    [token],
  );
}
export function useRemote<T>(path: string | null) {
  const api = useApi();
  const { token } = useUser();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let current = true;
    if (!path || !token) {
      setData(null);
      setError("");
      setLoading(false);
      return;
    }
    setData(null);
    setLoading(true);
    setError("");
    setStatus(0);
    api<T>(path)
      .then((value) => {
        if (current) setData(value);
      })
      .catch((error) => {
        if (current) {
          setError(error instanceof Error ? error.message : "Błąd połączenia");
          setStatus(error instanceof ApiError ? error.status : 500);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [path, api, token, revision]);
  return { data, setData, error, status, loading, reload };
}
export function useAction() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const run = async (
    action: () => Promise<void>,
    message = "Zapisano zmiany.",
  ) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(message);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Błąd połączenia");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { busy, error, success, run };
}
export async function downloadPrivate(
  path: string,
  token: string | null,
  name: string,
) {
  if (!token) throw new ApiError(401, "Zaloguj się ponownie.");
  const response = await fetch("/api" + path, {
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
  });
  if (!response.ok) return failure(response);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function localDateTime(
  value?: string | null,
  timezone = "Europe/Warsaw",
) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
// Convert an entered event wall time using its actual timezone (including DST); reject non-existent spring times.
export function eventDateTime(
  value: string,
  timezone = "Europe/Warsaw",
): string | null {
  if (!value) return null;
  const target = new Date(value + "Z").getTime();
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const seen = new Date(
      localDateTime(new Date(guess).toISOString(), timezone) + "Z",
    ).getTime();
    guess += target - seen;
  }
  if (localDateTime(new Date(guess).toISOString(), timezone) !== value)
    throw new Error("Ta godzina nie istnieje w wybranej strefie czasowej.");
  return new Date(guess).toISOString().replace(".000Z", "Z");
}
export const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(
    new Date(),
  );
