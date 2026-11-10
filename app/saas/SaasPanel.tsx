"use client";
import AddIcon from "@mui/icons-material/Add";
import { RowAction } from "../components/common/RowAction";
import { notifySaasSession, SAAS_SESSION_EVENT } from "./session";
import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Tab, Tabs, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody, MenuItem } from '@mui/material';

type Tenant = { uuid: string; slug: string; name: string; contactEmail: string; status: string; provisioning: string; version: number; plan?: string; trialEndsAt?: string | null; history?: {action: string; reason: string; actor: string; createdAt: string}[] };
const statuses: Record<string,string> = {inactive:'Nieaktywny',active:'Aktywny',suspended:'Zawieszony',deleted:'Usunięty'};
const provisioning: Record<string,string> = {pending:'Przygotowanie bazy',ready:'Baza gotowa',failed:'Błąd przygotowania - wymagana pomoc operatora'};
const plans: Record<string,string> = {trial:'Trial',paid:'Abonament'};
const dialogTitleSx = { backgroundColor: '#10261f', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' };

export default function SaasPanel() {
    const [token,setToken] = useState<string|null>(null);
    const [items,setItems] = useState<Tenant[]>([]);
    const [error,setError] = useState('');
    const [busy,setBusy] = useState(false);
    const [creating,setCreating] = useState(false);
    const [selected,setSelected] = useState<Tenant|null>(null);
    const [status,setStatus] = useState('inactive');
    const [reason,setReason] = useState('');
    const [confirmSlug,setConfirmSlug] = useState('');
    const [manageTab,setManageTab] = useState(0);
    const [notice,setNotice] = useState('');
    useEffect(()=>{
        const sync=()=>{ const next=sessionStorage.getItem('saas_token'); setToken(next); if(!next){ setItems([]); setSelected(null); setCreating(false); } };
        sync();
        window.addEventListener(SAAS_SESSION_EVENT, sync);
        return ()=>window.removeEventListener(SAAS_SESSION_EVENT, sync);
    },[]);
    async function api(path:string,method='GET',body?:unknown,auth=token) {
        const response=await fetch('/api/saas'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});
        const data=response.status===204?null:await response.json();
        if(!response.ok) { if(response.status===403 && path!=='/login') { sessionStorage.removeItem('saas_token'); notifySaasSession(); setToken(null); } throw new Error(data?.message || 'Operacja nie powiodła się.'); }
        return data;
    }
    async function refresh() { try { setItems((await api('/tenants')).items); } catch(e) { setError((e as Error).message); } }
    useEffect(()=>{ if(token) void refresh(); },[token]); // eslint-disable-line react-hooks/exhaustive-deps
    async function login(event:FormEvent<HTMLFormElement>) {
        event.preventDefault(); const form=new FormData(event.currentTarget); setBusy(true); setError('');
        try { const data=await api('/login','POST',{email:form.get('email'),password:form.get('password')}); sessionStorage.setItem('saas_token',data.token); setToken(data.token); notifySaasSession(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
    }
    async function create(event:FormEvent<HTMLFormElement>) {
        event.preventDefault(); const form=new FormData(event.currentTarget); setBusy(true); setError('');
        try { const tenant=await api('/tenants','POST',Object.fromEntries(form)); setCreating(false); setNotice(tenant.provisioning==='ready'?'Klient utworzony. Aktywuj go, gdy będzie gotowy do pracy.':'Klient zapisany, ale przygotowanie bazy nie powiodło się. Wymagana diagnostyka operatora.'); await refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
    }
    async function changeStatus() {
        if(!selected) return; setBusy(true); setError('');
        try { const updated=await api('/tenants/'+selected.uuid+'/status','PATCH',{status,reason,version:Number(selected.version)}); setSelected(updated); setReason(''); await refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
    }
    async function purgeTenant() {
        if(!selected || confirmSlug !== selected.slug) return; setBusy(true); setError('');
        try { await api('/tenants/'+selected.uuid,'DELETE',{confirmSlug}); setNotice('Firma '+selected.name+' została trwale usunięta. Kod '+selected.slug+' można nadać ponownie.'); setSelected(null); setConfirmSlug(''); await refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
    }
    async function details(tenant:Tenant) { setError(''); setConfirmSlug(''); setManageTab(0); try { const detail=await api('/tenants/'+tenant.uuid); setSelected(detail); setStatus(detail.status); setReason(''); } catch(e) { setError((e as Error).message); } }
    return <Box sx={{p:3}}>
        <Typography variant="h4" gutterBottom>Administracja SaaS</Typography>
        <Typography color="text.secondary" sx={{mb:2}}>Klienci systemu cateringowego</Typography>
        {error && !creating && !selected && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
        {notice && <Alert severity="info" onClose={()=>setNotice('')} sx={{mb:2}}>{notice}</Alert>}
        {!token ? <Box component="form" onSubmit={login} sx={{maxWidth:420}}><Stack spacing={2}>
            <Typography>Logowanie superadministratora</Typography>
            <TextField name="email" label="E-mail" type="email" autoComplete="username" required />
            <TextField name="password" label="Hasło" type="password" autoComplete="current-password" required />
            <Button type="submit" variant="contained" disabled={busy}>Zaloguj do SaaS</Button>
            <Button href="/login">Logowanie pracownika firmy</Button>
        </Stack></Box> : <>
            <Stack direction="row" spacing={2} useFlexGap sx={{mb:2, flexWrap:'wrap'}}><Button color="success" startIcon={<AddIcon fontSize="medium" />} variant="contained" disabled={busy} onClick={()=>setCreating(true)}>Dodaj klienta</Button><Button variant="contained" sx={{ backgroundColor: '#34495e', color: '#fff', fontWeight: 'bold' }} onClick={refresh}>Odśwież</Button></Stack>
            <Box sx={{overflowX:'auto'}}><Table><TableHead><TableRow>{['Firma','Kod firmy','Kontakt','Plan','Status','Przygotowanie',''].map(v=><TableCell key={v}>{v}</TableCell>)}</TableRow></TableHead><TableBody>{items.map(item=><TableRow key={item.uuid}><TableCell>{item.name}</TableCell><TableCell>{item.slug}</TableCell><TableCell>{item.contactEmail}</TableCell><TableCell><Chip size="small" label={plans[item.plan || 'paid'] || item.plan || '—'} color={item.plan==='trial'?'info':'default'} />{item.trialEndsAt ? <Typography variant="caption" display="block" color="text.secondary">do {item.trialEndsAt}</Typography> : null}</TableCell><TableCell><Chip label={statuses[item.status]} color={item.status==='active'?'success':item.status==='suspended'?'warning':'default'} /></TableCell><TableCell>{provisioning[item.provisioning]}</TableCell><TableCell><RowAction action="preview" label="Zarządzaj" onClick={()=>details(item)} /></TableCell></TableRow>)}</TableBody></Table></Box>
        </>}
        <Dialog open={creating} onClose={()=>{if(!busy)setCreating(false);}} fullWidth PaperProps={{ sx: { overflow: 'hidden' } }}><Box component="form" onSubmit={create}><DialogTitle sx={dialogTitleSx}>Nowy klient SaaS</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
            {error && <Alert severity="error">{error}</Alert>}
            <Alert severity="info">Klient powstanie jako nieaktywny. Otrzyma osobną bazę i własne konto administratora firmy.</Alert>
            <TextField name="name" label="Nazwa firmy" required inputProps={{maxLength:200}} />
            <TextField name="slug" label="Kod firmy" helperText="2-63 znaki: małe litery, cyfry, myślniki. Kod służy do logowania." required inputProps={{pattern:'[a-z0-9][a-z0-9-]{1,62}',maxLength:63}} />
            <TextField name="ownerEmail" label="E-mail administratora firmy" type="email" required inputProps={{maxLength:100}} />
            <TextField name="ownerPassword" label="Początkowe hasło administratora" type="password" autoComplete="new-password" required inputProps={{minLength:12,maxLength:72}} />
        </Stack></DialogContent><DialogActions>{busy&&<CircularProgress size={22}/>}<Button color="primary" variant="contained" disabled={busy} onClick={()=>setCreating(false)}>Anuluj</Button><Button type="submit" variant="contained" disabled={busy}>Utwórz klienta</Button></DialogActions></Box></Dialog>
        <Dialog open={!!selected} onClose={()=>{if(!busy)setSelected(null);}} fullWidth maxWidth="md" PaperProps={{ sx: { overflow: 'hidden' } }}><DialogTitle sx={dialogTitleSx}>{selected?.name} - zarządzanie</DialogTitle><Tabs value={manageTab} onChange={(_,value)=>setManageTab(value)} aria-label="Szczegóły firmy" sx={{px:3, borderBottom:1, borderColor:'divider', '& .MuiTab-root.Mui-selected': { color: '#10261f' }, '& .MuiTabs-indicator': { backgroundColor: '#10261f' } }}><Tab label="Zarządzanie" /><Tab label={selected?.history?.length ? `Historia (${selected.history.length})` : 'Historia'} /></Tabs><DialogContent><Stack spacing={2} sx={{pt:1}}>
            {manageTab === 0 && <>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography>Kod firmy: {selected?.slug}</Typography>
            <Typography>{selected && provisioning[selected.provisioning]}</Typography>
            <Alert severity="info">Zawieszenie, dezaktywacja i status „Usunięty” blokują dostęp, ale zostawiają rekord, więc ten sam kod firmy jest nadal zajęty. Trwałe usunięcie kasuje rekord i bazę firmy. Przywrócenie ze statusu „Usunięty” wymaga najpierw statusu „Nieaktywny”. Zmiana statusu unieważnia dotychczasowe sesje.</Alert>
            {selected?.plan === 'trial' && selected.trialEndsAt && <Typography color="text.secondary">Trial do: {selected.trialEndsAt}</Typography>}
            <TextField label="Status" select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statuses).map(([value,label])=><MenuItem key={value} value={value} disabled={value==='active'&&selected?.provisioning!=='ready' || selected?.status==='deleted'&&value!=='inactive'}>{label}</MenuItem>)}</TextField>
            <TextField label="Uzasadnienie zmiany" value={reason} multiline minRows={2} onChange={e=>setReason(e.target.value)} inputProps={{maxLength:1000}} />
            <Button sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} color="primary" variant="contained" disabled={busy || !reason.trim() || status===selected?.status} onClick={changeStatus}>Zapisz status</Button>
            {selected?.status === 'deleted' && <Stack spacing={1} sx={{p:2, border:'1px solid', borderColor:'error.main', borderRadius:1}}>
                <Typography fontWeight="bold">Trwałe usunięcie</Typography>
                <Typography color="text.secondary">Kasuje firmę z listy tenantów i jej bazę. Kod {selected.slug} będzie wolny. Tej operacji nie da się cofnąć.</Typography>
                <TextField label="Wpisz kod firmy, aby potwierdzić" value={confirmSlug} onChange={e=>setConfirmSlug(e.target.value)} autoComplete="off" />
                <Button color="error" variant="contained" disabled={busy || confirmSlug !== selected.slug} onClick={purgeTenant}>Usuń trwale z bazy</Button>
            </Stack>}
            </>}
            {manageTab === 1 && <>
            {error && <Alert severity="error">{error}</Alert>}
            {(selected?.history?.length ?? 0) === 0 && <Typography color="text.secondary">Brak wpisów.</Typography>}
            {selected?.history?.map((entry,index)=>{ const line=[entry.createdAt, entry.actor?.trim(), entry.action].filter(Boolean).join(' - '); return <Box key={index}><Typography>{line}</Typography>{entry.reason ? <Typography color="text.secondary">{entry.reason}</Typography> : null}</Box>; })}
            </>}
        </Stack></DialogContent><DialogActions><Button variant="contained" color="primary" disabled={busy} onClick={()=>setSelected(null)}>Zamknij</Button></DialogActions></Dialog>
    </Box>;
}
