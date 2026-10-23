"use client";
import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody, MenuItem } from '@mui/material';

type Tenant = { uuid: string; slug: string; name: string; contactEmail: string; status: string; provisioning: string; version: number; history?: {action: string; reason: string; actor: string; createdAt: string}[] };
const statuses: Record<string,string> = {inactive:'Nieaktywny',active:'Aktywny',suspended:'Zawieszony',deleted:'Usunięty'};
const provisioning: Record<string,string> = {pending:'Przygotowanie bazy',ready:'Baza gotowa',failed:'Błąd przygotowania — wymagana pomoc operatora'};

export default function SaasPanel() {
    const [token,setToken] = useState<string|null>(null);
    const [items,setItems] = useState<Tenant[]>([]);
    const [error,setError] = useState('');
    const [busy,setBusy] = useState(false);
    const [creating,setCreating] = useState(false);
    const [selected,setSelected] = useState<Tenant|null>(null);
    const [status,setStatus] = useState('inactive');
    const [reason,setReason] = useState('');
    const [notice,setNotice] = useState('');
    useEffect(()=>{ setToken(sessionStorage.getItem('saas_token')); },[]);
    async function api(path:string,method='GET',body?:unknown,auth=token) {
        const response=await fetch('/api/saas'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});
        const data=response.status===204?null:await response.json();
        if(!response.ok) { if(response.status===403 && path!=='/login') { sessionStorage.removeItem('saas_token'); setToken(null); } throw new Error(data?.message || 'Operacja nie powiodła się.'); }
        return data;
    }
    async function refresh() { try { setItems((await api('/tenants')).items); } catch(e) { setError((e as Error).message); } }
    useEffect(()=>{ if(token) void refresh(); },[token]); // eslint-disable-line react-hooks/exhaustive-deps
    async function login(event:FormEvent<HTMLFormElement>) {
        event.preventDefault(); const form=new FormData(event.currentTarget); setBusy(true); setError('');
        try { const data=await api('/login','POST',{email:form.get('email'),password:form.get('password')}); sessionStorage.setItem('saas_token',data.token); setToken(data.token); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
    }
    async function create(event:FormEvent<HTMLFormElement>) {
        event.preventDefault(); const form=new FormData(event.currentTarget); setBusy(true); setError('');
        try { const tenant=await api('/tenants','POST',Object.fromEntries(form)); setCreating(false); setNotice(tenant.provisioning==='ready'?'Klient utworzony. Aktywuj go, gdy będzie gotowy do pracy.':'Klient zapisany, ale przygotowanie bazy nie powiodło się. Wymagana diagnostyka operatora.'); await refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
    }
    async function changeStatus() {
        if(!selected) return; setBusy(true); setError('');
        try { const updated=await api('/tenants/'+selected.uuid+'/status','PATCH',{status,reason,version:Number(selected.version)}); setSelected(updated); setReason(''); await refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
    }
    async function details(tenant:Tenant) { setError(''); try { const detail=await api('/tenants/'+tenant.uuid); setSelected(detail); setStatus(detail.status); setReason(''); } catch(e) { setError((e as Error).message); } }
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
            <Stack direction="row" spacing={2} sx={{mb:2}}><Button variant="contained" disabled={busy} onClick={()=>setCreating(true)}>Dodaj klienta</Button><Button onClick={refresh}>Odśwież</Button><Button onClick={async()=>{try{await api('/logout','POST');}catch(e){setError((e as Error).message);}finally{sessionStorage.removeItem('saas_token');setToken(null);setItems([]);}}}>Wyloguj z SaaS</Button></Stack>
            <Box sx={{overflowX:'auto'}}><Table><TableHead><TableRow>{['Firma','Kod firmy','Kontakt','Status','Przygotowanie',''].map(v=><TableCell key={v}>{v}</TableCell>)}</TableRow></TableHead><TableBody>{items.map(item=><TableRow key={item.uuid}><TableCell>{item.name}</TableCell><TableCell>{item.slug}</TableCell><TableCell>{item.contactEmail}</TableCell><TableCell><Chip label={statuses[item.status]} color={item.status==='active'?'success':item.status==='suspended'?'warning':'default'} /></TableCell><TableCell>{provisioning[item.provisioning]}</TableCell><TableCell><Button onClick={()=>details(item)}>Zarządzaj</Button></TableCell></TableRow>)}</TableBody></Table></Box>
        </>}
        <Dialog open={creating} onClose={()=>{if(!busy)setCreating(false);}} fullWidth><Box component="form" onSubmit={create}><DialogTitle>Nowy klient SaaS</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
            {error && <Alert severity="error">{error}</Alert>}
            <Alert severity="info">Klient powstanie jako nieaktywny. Otrzyma osobną bazę i własne konto administratora firmy.</Alert>
            <TextField name="name" label="Nazwa firmy" required inputProps={{maxLength:200}} />
            <TextField name="slug" label="Kod firmy" helperText="2–63 znaki: małe litery, cyfry, myślniki. Kod służy do logowania." required inputProps={{pattern:'[a-z0-9][a-z0-9-]{1,62}',maxLength:63}} />
            <TextField name="ownerEmail" label="E-mail administratora firmy" type="email" required inputProps={{maxLength:100}} />
            <TextField name="ownerPassword" label="Początkowe hasło administratora" type="password" autoComplete="new-password" required inputProps={{minLength:12,maxLength:72}} />
        </Stack></DialogContent><DialogActions>{busy&&<CircularProgress size={22}/>}<Button disabled={busy} onClick={()=>setCreating(false)}>Anuluj</Button><Button type="submit" variant="contained" disabled={busy}>Utwórz klienta</Button></DialogActions></Box></Dialog>
        <Dialog open={!!selected} onClose={()=>{if(!busy)setSelected(null);}} fullWidth maxWidth="md"><DialogTitle>{selected?.name} — zarządzanie</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography>Kod firmy: {selected?.slug}</Typography>
            <Typography>{selected && provisioning[selected.provisioning]}</Typography>
            <Alert severity="info">Zawieszenie, dezaktywacja i usunięcie blokują dostęp do aplikacji. Usunięcie zachowuje dane; przywrócenie wymaga najpierw statusu „Nieaktywny”. Zmiana statusu unieważnia dotychczasowe sesje.</Alert>
            <TextField label="Status" select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statuses).map(([value,label])=><MenuItem key={value} value={value} disabled={value==='active'&&selected?.provisioning!=='ready' || selected?.status==='deleted'&&value!=='inactive'}>{label}</MenuItem>)}</TextField>
            <TextField label="Uzasadnienie zmiany" value={reason} multiline minRows={2} onChange={e=>setReason(e.target.value)} inputProps={{maxLength:1000}} />
            <Button variant="contained" disabled={busy || !reason.trim() || status===selected?.status} onClick={changeStatus}>Zapisz status</Button>
            <Typography variant="h6">Historia</Typography>
            {selected?.history?.map((entry,index)=><Box key={index}><Typography>{entry.createdAt} · {entry.actor} · {entry.action}</Typography><Typography color="text.secondary">{entry.reason}</Typography></Box>)}
        </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setSelected(null)}>Zamknij</Button></DialogActions></Dialog>
    </Box>;
}
