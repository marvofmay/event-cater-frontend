export const SAAS_SESSION_EVENT = "saas-session-changed";

export function readSaasToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("saas_token");
}

export function notifySaasSession(): void {
  window.dispatchEvent(new Event(SAAS_SESSION_EVENT));
}
