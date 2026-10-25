import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DeleteMultipleConfirmModalProps<T> {
    open: boolean;
    selectedItems: T | null;
    onClose: () => void;
    onDeleteMultipleConfirm: (items: T) => void;
    title: string;
    description: string;
    errorAPI?: string;
    errorsAPI?: Record<string, string> | null;
}

const DeleteMultipleConfirmModal = <T,>({
    open,
    selectedItems,
    onClose,
    onDeleteMultipleConfirm,
    title,
    description,
    errorAPI,
    errorsAPI
}: DeleteMultipleConfirmModalProps<T>) => {
    const handleDeleteMultiple = () => {
        if (selectedItems) {
            onDeleteMultipleConfirm(selectedItems);
        }
    };

    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle
                sx={{
                    backgroundColor: '#34495e',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                }}
            >
                {title}
            </DialogTitle>
            <DialogContent>
                {errorAPI && (
                    <div style={{ color: 'red', marginBottom: '1rem' }}>
                        <strong> {errorAPI}</strong>
                    </div>

                )}
                {errorsAPI && (
                    <ul style={{ color: 'red', marginBottom: '1rem' }}>
                        {Object.entries(errorsAPI).map(([field, message]) => (
                            <li key={field}>
                                <strong>{field}:</strong> {message}
                            </li>
                        ))}
                    </ul>
                )}
                <DialogContentText sx={{ marginTop: '1rem' }}>
                    {description}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button color="primary"
                    onClick={onClose}
                    variant="contained"
                >
                    {t('common.button.cancel')}
                </Button>
                <Button onClick={handleDeleteMultiple} color="error" variant="contained">
                    {t('common.button.delete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteMultipleConfirmModal;
