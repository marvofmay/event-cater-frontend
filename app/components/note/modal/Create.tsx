"use client";

import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, IconButton, MenuItem } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import CloseIcon from "@mui/icons-material/Close";
import NotePayload from '@/app/types/NotePayload';

interface AddNoteModalProps {
    open: boolean;
    onClose: () => void;
    onAddNote: (newNote: NotePayload) => Promise<void>;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ open, onClose, onAddNote }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        title: Yup.string().required(t('validation.fieldIsRequired')),
        content: Yup.string(),
    });

    const initialValues: NotePayload = {
        uuid: null,
        title: '',
        content: '',
        priority: 'low'
    };

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: NotePayload) => {
        setErrorAPI(null);
        setErrorsAPI(null);

        try {
            await onAddNote(values);
            onClose();
        } catch (error: unknown) {
            const err = error as any;

            const message = err?.response?.data?.message ?? 'Wystąpił nieznany błąd';
            const errors = err?.response?.data?.errors ?? null;

            setErrorAPI(message);
            setErrorsAPI(errors);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={(_, reason) => {
                if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                    return;
                }
                onClose();
            }}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {t('note.modal.add.title')}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: '#ffffff', position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ errors, touched }) => (
                    <Form noValidate>
                        <DialogContent>
                            {errorAPI && (
                                <div style={{ color: 'red', marginBottom: '1rem' }}>
                                    {errorAPI}
                                </div>
                            )}

                            {errorsAPI && (
                                <ul style={{ color: 'red', marginBottom: '1rem' }}>
                                    {Object.entries(errorsAPI).map(([field, msg]) => (
                                        <li key={field}>
                                            <strong>{field}:</strong> {msg}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <Field
                                as={TextField}
                                name="title"
                                label={t('note.form.field.title')}
                                fullWidth
                                margin="normal"
                                error={touched.title && Boolean(errors.title)}
                                helperText={touched.title && errors.title}
                                required
                            />

                            <Field
                                as={TextField}
                                name="contnet"
                                label={t('note.form.field.content')}
                                fullWidth
                                margin="normal"
                                multiline
                                rows={3}
                                error={touched.content && Boolean(errors.content)}
                                helperText={touched.content && errors.content}
                            />

                            <Field
                                as={TextField}
                                select
                                name="priority"
                                label={t('note.form.field.priority')}
                                fullWidth
                                margin="normal"
                                error={touched.priority && Boolean(errors.priority)}
                                helperText={touched.priority && errors.priority}
                                required
                            >
                                <MenuItem value="low">
                                    {t('note.priority.low')}
                                </MenuItem>
                                <MenuItem value="medium">
                                    {t('note.priority.medium')}
                                </MenuItem>
                                <MenuItem value="high">
                                    {t('note.priority.high')}
                                </MenuItem>
                            </Field>
                        </DialogContent>

                        <DialogActions>
                            <Button color="primary"
                                onClick={onClose}
                                variant="contained"
                            >
                                {t('common.button.cancel')}
                            </Button>

                            <Button color="primary"
                                type="submit"
                                variant="contained"
                                sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }}
                            >
                                {t('common.button.save')}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default AddNoteModal;
