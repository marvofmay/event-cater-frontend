"use client";

import { COMPANY_STRUCTURE_CHANGED } from '@/app/utils/companyStructureChanges';

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { Alert, Avatar, Box, Button, Chip, IconButton, LinearProgress, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { AccountTreeOutlined, ApartmentOutlined, BusinessOutlined, ChevronRight, ExpandMore, PersonOutline, Refresh, UnfoldLess, VisibilityOutlined } from "@mui/icons-material";
import { useInfiniteQuery, useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/app/context/userContext";
import CompanyStructureSearch from "@/app/components/company/CompanyStructureSearch";
import EmployeeContactPreview from './EmployeeContactPreview';

type NodeType = "company" | "department" | "employee";
type ParentType = "root" | "company" | "department";
export interface StructureNode {
    type: NodeType;
    uuid: string;
    name: string;
    subtitle: string | null;
    active: boolean;
}
interface StructurePage {
    items: StructureNode[];
    total: number;
    page: number;
    hasMore: boolean;
}

const ExpansionContext = createContext<{ expanded: Set<string>; toggle: (key: string) => void; revealPath: StructureNode[]; highlighted: string | null; preview: (node: StructureNode) => void }>({ expanded: new Set(), toggle: () => {}, revealPath: [], highlighted: null, preview: () => {} });
const presentation = {
    company: { label: "Firma", icon: BusinessOutlined, color: "#1d4ed8", background: "#eff6ff" },
    department: { label: "Oddział", icon: ApartmentOutlined, color: "#0f766e", background: "#f0fdfa" },
    employee: { label: "Pracownik", icon: PersonOutline, color: "#64748b", background: "#f1f5f9" },
};

function StructureRow({ node, path }: { node: StructureNode; path: string[] }) {
    const { expanded, toggle, highlighted, preview } = useContext(ExpansionContext);
    const key = `${node.type}:${node.uuid}`;
    const canExpand = node.type !== "employee" && !path.includes(key);
    const open = canExpand && expanded.has(key);
    const contentId = useId();
    const style = presentation[node.type];
    const Icon = style.icon;
    const row = useRef<HTMLLIElement>(null);
    const selected = highlighted === key;
    useEffect(() => {
        if (selected) {
            row.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            row.current?.focus({ preventScroll: true });
        }
    }, [selected]);
    const content = <>
        <Avatar variant="rounded" sx={{ width: 34, height: 34, color: style.color, bgcolor: style.background }}><Icon fontSize="small" /></Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="span" sx={{ display: "block", fontSize: 14, fontWeight: node.type === "employee" ? 500 : 650, overflowWrap: "anywhere" }}>{node.name}</Typography>
            <Typography component="span" variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>{style.label}{node.subtitle && node.subtitle !== node.name ? ` - ${node.subtitle}` : ""}</Typography>
        </Box>
        {!node.active && <Chip label="Nieaktywny" size="small" variant="outlined" sx={{ fontSize: 11 }} />}
        {node.type === 'employee' && <Tooltip title="Podgląd kontaktu"><IconButton size="small" aria-label={`Podgląd pracownika: ${node.name}`} onClick={() => preview(node)}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>}
    </>;

    return <Box component="li" ref={row} tabIndex={-1} aria-label={selected ? `Znaleziony element: ${node.name}` : undefined} sx={{ listStyle: "none", my: 0.5, borderRadius: 2, ...(selected ? { outline: "2px solid", outlineColor: "primary.main", bgcolor: "#eff6ff" } : {}) }}>
        {canExpand ? <Button fullWidth
            aria-label={`${open ? "Zwiń" : "Rozwiń"} ${style.label.toLowerCase()}: ${node.name}`}
            aria-expanded={open} aria-controls={open ? contentId : undefined} onClick={() => toggle(key)}
            sx={{ justifyContent: "flex-start", textAlign: "left", gap: 1, px: 1, py: 1, color: "text.primary", textTransform: "none", border: "1px solid", borderColor: open ? "divider" : "transparent", bgcolor: open ? "action.hover" : "transparent", borderRadius: 2 }}>
            {open ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}{content}
        </Button> : <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 4.5, pr: 1, py: 0.75 }}>{content}</Stack>}
        {open && <Box id={contentId} sx={{ ml: { xs: 1.5, sm: 3 }, pl: { xs: 1, sm: 2 }, borderLeft: "1px solid", borderColor: "divider", mt: 1, mb: 1.5 }}>
            <StructureBranch type={node.type as "company" | "department"} uuid={node.uuid} path={[...path, key]} />
        </Box>}
    </Box>;
}

function StructureBranch({ type, uuid, path = [] }: { type: ParentType; uuid?: string; path?: string[] }) {
    const { token } = useUser();
    const departments = true;
    const employees = true;
    const phrase = '';
    const query = useInfiniteQuery({
        queryKey: ["companyStructure", token, departments, employees, type, uuid, phrase],
        initialPageParam: 1,
        queryFn: async ({ pageParam, signal }): Promise<StructurePage> => {
            const parameters = new URLSearchParams({ parentType: type, page: String(pageParam), pageSize: "30", phrase });
            if (uuid) parameters.set("parentUuid", uuid);
            const response = await fetch(`/api/company-structure?${parameters}`, { signal, headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            if (!response.ok) throw new Error(response.status === 403 ? "Brak uprawnień do tej gałęzi." : "Nie udało się pobrać struktury firmy.");
            return (await response.json()).data;
        },
        getNextPageParam: lastPage => lastPage.hasMore ? lastPage.page + 1 : undefined,
        enabled: Boolean(token), staleTime: 120000, gcTime: 600000, refetchOnWindowFocus: false, retry: false,
    });
    const { revealPath } = useContext(ExpansionContext);
    const loadedItems = query.data?.pages.flatMap(page => page.items) ?? [];
    const parentIndex = type === "root" ? -1 : revealPath.findIndex(node => node.type === type && node.uuid === uuid);
    const requiredNode = type === "root" || parentIndex >= 0 ? revealPath[parentIndex + 1] : undefined;
    const extraNode = requiredNode && !loadedItems.some(node => node.type === requiredNode.type && node.uuid === requiredNode.uuid) ? requiredNode : undefined;
    const items = extraNode ? [...loadedItems, extraNode].sort((first, second) => Number(first.type === "department") - Number(second.type === "department") || first.name.localeCompare(second.name, "pl") || first.uuid.localeCompare(second.uuid)) : loadedItems;
    const total = query.data?.pages[0]?.total ?? 0;
    return <Box>
        {query.isFetching && <LinearProgress aria-label="Ładowanie gałęzi" sx={{ height: 2, borderRadius: 1 }} />}
        {query.isError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => query.refetch()}>Ponów</Button>}>{query.error.message}</Alert>}
        {!query.isPending && !query.isError && items.length === 0 && <Typography color="text.secondary" variant="body2" sx={{ p: 2 }} role="status">
            {phrase ? "Brak wyników w tej gałęzi." : type === "root" ? "Nie dodano jeszcze żadnej firmy." : "Ta gałąź nie zawiera dostępnych elementów."}
        </Typography>}
        <Box component="ul" aria-label={type === "root" ? "Struktura firmy" : "Elementy gałęzi"} sx={{ m: 0, p: 0 }}>
            {items.map(node => <StructureRow key={`${node.type}:${node.uuid}`} node={node} path={path} />)}
        </Box>
        {extraNode && !query.isPending && <Typography variant="caption" color="text.secondary">Wybrany wynik pokazano dodatkowo poza bieżącą stroną.</Typography>}
        {items.length > 0 && <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 1, pt: 0.5, pb: 1 }}>
            <Typography variant="caption" color="text.secondary">Załadowano {loadedItems.length} z {total}</Typography>
            {query.hasNextPage && <Button size="small" disabled={query.isFetching} onClick={() => query.fetchNextPage()}>Pokaż kolejne 30</Button>}
        </Stack>}
    </Box>;
}

export default function CompanyStructure() {
    const [expanded, setExpanded] = useState(new Set<string>());
    const [revealPath, setRevealPath] = useState<StructureNode[]>([]);
    const [revealVersion, setRevealVersion] = useState(0);
    const [preview, setPreview] = useState<StructureNode | null>(null);
    const queryClient = useQueryClient();
    const refreshing = useIsFetching({ queryKey: ["companyStructure"] }) > 0;
    useEffect(() => {
        const refresh = () => {
            setRevealPath([]);
            void queryClient.invalidateQueries({ queryKey: ["companyStructure"] });
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === COMPANY_STRUCTURE_CHANGED || event.key === null) refresh();
        };
        window.addEventListener(COMPANY_STRUCTURE_CHANGED, refresh);
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", refresh);
        return () => {
            window.removeEventListener(COMPANY_STRUCTURE_CHANGED, refresh);
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", refresh);
        };
    }, [queryClient]);
    const reveal = (nodes: StructureNode[]) => {
        setRevealPath(nodes);
        setExpanded(previous => new Set([...previous, ...nodes.filter(node => node.type !== "employee").map(node => `${node.type}:${node.uuid}`)]));
        setRevealVersion(previous => previous + 1);
    };
    const selected = revealPath.at(-1);
    return <ExpansionContext.Provider value={{ expanded, revealPath, preview: setPreview, highlighted: selected ? `${selected.type}:${selected.uuid}` : null, toggle: key => setExpanded(previous => {
        const next = new Set(previous);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    }) }}>
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ p: { xs: 2, sm: 3 }, borderBottom: "1px solid", borderColor: "divider", bgcolor: "#f8fafc" }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar variant="rounded" sx={{ bgcolor: "#e0e7ff", color: "#3730a3" }}><AccountTreeOutlined /></Avatar>
                    <Box><Typography variant="h6" sx={{ fontWeight: 650 }}>Struktura firmy</Typography><Typography variant="body2" color="text.secondary">Firma → oddziały i pododdziały → pracownicy</Typography></Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Button startIcon={<UnfoldLess />} size="small" disabled={expanded.size === 0} onClick={() => { setExpanded(new Set()); setRevealPath([]); }}>Zwiń wszystko</Button>
                    <Tooltip title="Odśwież strukturę"><span><IconButton aria-label="Odśwież strukturę" disabled={refreshing} onClick={() => { setRevealPath([]); queryClient.invalidateQueries({ queryKey: ["companyStructure"] }); }}><Refresh /></IconButton></span></Tooltip>
                </Stack>
            </Stack>
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
                <CompanyStructureSearch onReveal={reveal} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Wyszukaj firmę, oddział lub pracownika w całej strukturze - bez rozwijania gałęzi.</Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
                    {Object.entries(presentation).map(([key, style]) => <Typography key={key} variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><style.icon sx={{ fontSize: 16, color: style.color }} />{style.label}</Typography>)}
                </Stack>
                <StructureBranch key={revealVersion} type="root" />
            </Box>
        </Paper>
        {preview && <EmployeeContactPreview employee={preview} onClose={() => setPreview(null)} />}
    </ExpansionContext.Provider>;
}
