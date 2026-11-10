"use client";

import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/app/context/userContext';
import type { StructureNode } from './CompanyStructure';

interface ContactPreview { firstName: string; lastName: string; phones: string[]; emails: string[] }

export default function EmployeeContactPreview({ employee, onClose }: { employee: StructureNode; onClose: () => void }) {
    const { token } = useUser();
    const query = useQuery({
        queryKey: ['companyStructure', 'employeeContact', token, employee.uuid],
        queryFn: async ({ signal }): Promise<ContactPreview> => {
            const response = await fetch(`/api/company-structure/employees/${encodeURIComponent(employee.uuid)}`, { signal, headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            if (!response.ok) throw new Error('Nie udało się pobrać danych kontaktowych pracownika.');
            return (await response.json()).data;
        },
        staleTime: 0, gcTime: 60000, retry: false,
    });
    return <Dialog open onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="employee-contact-title">
        <DialogTitle id="employee-contact-title" sx={{ backgroundColor: '#171717', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Dane kontaktowe pracownika</DialogTitle>
        <DialogContent>
            {query.isPending && <CircularProgress aria-label="Ładowanie kontaktu" />}
            {query.isError && <Alert severity="error" action={<Button onClick={() => query.refetch()}>Ponów</Button>}>{query.error.message}</Alert>}
            {query.data && <Stack spacing={1.5}>
                <Typography><strong>Imię:</strong> {query.data.firstName}</Typography>
                <Typography><strong>Nazwisko:</strong> {query.data.lastName || '-'}</Typography>
                <Typography variant="subtitle2">Telefon</Typography>
                {query.data.phones.length ? query.data.phones.map(phone => <Link key={phone} href={`tel:${phone.replace(/[^+0-9]/g, '')}`}>{phone}</Link>) : <Typography color="text.secondary">Nie podano telefonu.</Typography>}
                <Typography variant="subtitle2">E-mail</Typography>
                {query.data.emails.length ? query.data.emails.map(email => <Link key={email} href={`mailto:${encodeURIComponent(email)}`}>{email}</Link>) : <Typography color="text.secondary">Nie podano e-maila.</Typography>}
            </Stack>}
        </DialogContent>
        <DialogActions><Button color="primary" variant="contained" onClick={onClose}>Zamknij</Button></DialogActions>
    </Dialog>;
}
