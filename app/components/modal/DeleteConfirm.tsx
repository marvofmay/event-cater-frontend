import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmModalProps<T> {
    open: boolean;
    selectedItem: T | null;
    onClose: () => void;
    onDeleteConfirm: (item: T) => void;
    title: string;
    description: string;
    errorAPI?: string;
}

const DeleteConfirmModal = <T,>({
    open,
    selectedItem,
    onClose,
    onDeleteConfirm,
    title,
    description,
    errorAPI
}: DeleteConfirmModalProps<T>) => {
    const handleDelete = () => {
        if (selectedItem) {
            onDeleteConfirm(selectedItem);
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
                <Button onClick={handleDelete} color="error" variant="contained">
                    {t('common.button.delete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteConfirmModal;
