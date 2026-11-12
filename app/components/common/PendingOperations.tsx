"use client";

import { useEffect, useSyncExternalStore } from "react";
import axios, { InternalAxiosRequestConfig } from "axios";
import { Backdrop } from "@mui/material";
import { BrandSpinner } from "@/app/components/common/BrandSpinner";
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
        <Backdrop open={pending} transitionDuration={160} sx={{ zIndex: theme => theme.zIndex.tooltip + 100, backgroundColor: "rgba(243, 246, 244, 0.55)", backdropFilter: "blur(1.5px)", cursor: "wait" }}>
            <BrandSpinner size={32} label="Proszę czekać" />
        </Backdrop>
    );
}
