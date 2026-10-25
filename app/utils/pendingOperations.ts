"use client";

let pending = 0;
const listeners = new Set<() => void>();

export function subscribePendingOperations(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function hasPendingOperations() {
    return pending > 0;
}

export function beginPendingOperation() {
    pending++;
    listeners.forEach(listener => listener());
    let completed = false;
    return () => {
        if (completed) return;
        completed = true;
        pending--;
        listeners.forEach(listener => listener());
    };
}

export function isWriteMethod(method?: string) {
    return ["POST", "PUT", "PATCH", "DELETE"].includes((method ?? "GET").toUpperCase());
}
