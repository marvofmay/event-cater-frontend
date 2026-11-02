"use client";

import { useEffect, useState } from "react";
import { Alert, Avatar, Box, Button, Chip, IconButton, InputAdornment, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { ApartmentOutlined, BusinessOutlined, Close, PersonOutline, Search } from "@mui/icons-material";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/app/context/userContext";
import type { StructureNode } from "@/app/components/company/CompanyStructure";

interface SearchNode extends StructureNode {
    companyName: string;
    departmentName: string | null;
}
interface SearchPage {
    items: SearchNode[];
    total: number;
    page: number;
    hasMore: boolean;
}
const kinds = {
    company: { label: "Firma", icon: BusinessOutlined },
    department: { label: "Oddział", icon: ApartmentOutlined },
    employee: { label: "Pracownik", icon: PersonOutline },
};

export default function CompanyStructureSearch({ onReveal }: { onReveal: (nodes: StructureNode[]) => void }) {
    const { token } = useUser();
    const [value, setValue] = useState("");
    const [phrase, setPhrase] = useState("");
    const departments = true;
    const employees = true;
    useEffect(() => {
        const timeout = setTimeout(() => setPhrase(value.trim()), 300);
        return () => clearTimeout(timeout);
    }, [value]);
    const search = useInfiniteQuery({
        queryKey: ["companyStructure", "search", token, departments, employees, phrase],
        initialPageParam: 1,
        enabled: Boolean(token) && phrase.length >= 2,
        queryFn: async ({ pageParam, signal }): Promise<SearchPage> => {
            const parameters = new URLSearchParams({ mode: "search", phrase, page: String(pageParam), pageSize: "20" });
            const response = await fetch(`/api/company-structure?${parameters}`, { signal, headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            if (!response.ok) throw new Error("Nie udało się wyszukać elementów struktury.");
            return (await response.json()).data;
        },
        getNextPageParam: lastPage => lastPage.hasMore ? lastPage.page + 1 : undefined,
        staleTime: 30000, gcTime: 120000, refetchOnWindowFocus: false, retry: false,
    });
    const reveal = useMutation({
        mutationFn: async (node: StructureNode): Promise<StructureNode[]> => {
            const parameters = new URLSearchParams({ mode: "path", nodeType: node.type, nodeUuid: node.uuid });
            const response = await fetch(`/api/company-structure?${parameters}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            if (!response.ok) throw new Error("Nie udało się otworzyć elementu w drzewie. Mógł zostać usunięty lub zmieniły się uprawnienia.");
            return (await response.json()).data.items;
        },
        onSuccess: onReveal,
    });
    const ready = phrase.length >= 2 && phrase === value.trim();
    const items = search.data?.pages.flatMap(page => page.items) ?? [];
    const total = search.data?.pages[0]?.total ?? 0;

    return <Box sx={{ mb: 2 }}>
        <TextField fullWidth label="Szukaj w całej strukturze" placeholder="Np. imię/nazwisko/dział/firma/telefon/email" value={value}
            onChange={event => { setValue(event.target.value); reveal.reset(); }}
            inputProps={{ maxLength: 100 }}
            helperText="Wpisz co najmniej 2 znaki - imię, nazwisko, dział, firma, stanowisko, telefon lub e-mail."
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment>, endAdornment: value ? <InputAdornment position="end"><IconButton aria-label="Wyczyść wyszukiwanie" onClick={() => { setValue(""); reveal.reset(); }} edge="end"><Close /></IconButton></InputAdornment> : undefined }} />
        {(search.isFetching || reveal.isPending) && <LinearProgress aria-label="Wyszukiwanie struktury" sx={{ mt: 1 }} />}
        {ready && search.isError && <Alert severity="error" action={<Button color="inherit" onClick={() => search.refetch()}>Ponów wyszukiwanie</Button>}>{search.error.message}</Alert>}
        {reveal.isError && <Alert severity="error" sx={{ mt: 1 }}>{reveal.error.message}</Alert>}
        {ready && search.isSuccess && <Box sx={{ mt: 1.5, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "#f8fafc" }}>
            <Typography role="status" variant="body2" sx={{ mb: 1, fontWeight: 600 }}>{total === 0 ? "Brak wyników w całej strukturze." : `Znaleziono: ${total}. Kliknij wynik, aby pokazać go w drzewie.`}</Typography>
            <Box component="ul" aria-label="Wyniki wyszukiwania struktury" sx={{ m: 0, p: 0, maxHeight: 420, overflowY: "auto" }}>
                {items.map(node => {
                    const kind = kinds[node.type];
                    const Icon = kind.icon;
                    return <Box component="li" key={`${node.type}:${node.uuid}`} sx={{ listStyle: "none" }}>
                        <Button fullWidth disabled={reveal.isPending} aria-label={`Pokaż w drzewie: ${node.name}`} onClick={() => reveal.mutate(node)} sx={{ justifyContent: "flex-start", textAlign: "left", textTransform: "none", color: "text.primary", gap: 1.5, p: 1 }}>
                            <Avatar variant="rounded" sx={{ bgcolor: "#e0e7ff", color: "#3730a3", width: 32, height: 32 }}><Icon fontSize="small" /></Avatar>
                            <Box sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                                <Typography variant="body2" fontWeight={600}>{node.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{kind.label}{node.subtitle ? ` - ${node.subtitle}` : ""}</Typography>
                                {node.type !== "company" && <Typography component="div" variant="caption" color="text.secondary">{node.companyName}{node.type === "employee" && node.departmentName ? ` → ${node.departmentName}` : ""}</Typography>}
                            </Box>
                            {!node.active && <Chip size="small" label="Nieaktywny" />}
                        </Button>
                    </Box>;
                })}
            </Box>
            {search.hasNextPage && <Stack alignItems="center" sx={{ mt: 1 }}><Button size="small" disabled={search.isFetching} onClick={() => search.fetchNextPage()}>Pokaż kolejne wyniki</Button></Stack>}
        </Box>}
    </Box>;
}
