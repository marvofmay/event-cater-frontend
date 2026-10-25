"use client";

import { useEffect, useSyncExternalStore } from "react";
import axios, { InternalAxiosRequestConfig } from "axios";
import { Backdrop, CircularProgress, Modal, Paper, Typography } from "@mui/material";
import { beginPendingOperation, hasPendingOperations, isWriteMethod, subscribePendingOperations } from "@/app/utils/pendingOperations";

export default function PendingOperations() {
    const pending = useSyncExternalStore(subscribePendingOperations, hasPendingOperations, () => false);

    useEffect(() => {
        const operations = new Map<InternalAxiosRequestConfig, () => void>();
        const finish = (config?: InternalAxiosRequestConfig) => {
            if (!config) return;
            operations.get(config)?.();
            operations.delete(config);
        };
        const requestInterceptor = axios.interceptors.request.use(config => {
            if (isWriteMethod(config.method)) operations.set(config, beginPendingOperation());
            return config;
        });
        const responseInterceptor = axios.interceptors.response.use(response => {
            finish(response.config);
            return response;
        }, error => {
            finish(error.config);
            return Promise.reject(error);
        });
        const blockInteraction = (event: Event) => {
            if (!hasPendingOperations()) return;
            if (event instanceof KeyboardEvent && !["Enter", " ", "Escape"].includes(event.key)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        const events = ["click", "submit", "keydown"];
        events.forEach(event => document.addEventListener(event, blockInteraction, true));
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
            operations.forEach(complete => complete());
            events.forEach(event => document.removeEventListener(event, blockInteraction, true));
        };
    }, []);

    return (
        <Modal open={pending} disableEscapeKeyDown hideBackdrop sx={{ zIndex: theme => theme.zIndex.tooltip + 100 }}>
        <Backdrop aria-hidden={false} open={pending} transitionDuration={180} sx={{ zIndex: theme => theme.zIndex.tooltip + 100, backgroundColor: "rgba(30, 41, 59, 0.22)", backdropFilter: "blur(1px)", cursor: "wait" }}>
            <Paper role="status" aria-live="polite" elevation={3} sx={{ display: "flex", alignItems: "center", gap: 2, px: 3, py: 2, borderRadius: 2 }}>
                <CircularProgress size={26} thickness={3} aria-label="Proszę czekać" />
                <Typography variant="body2" color="text.secondary">Proszę czekać…</Typography>
            </Paper>
        </Backdrop>
        </Modal>
    );
}
