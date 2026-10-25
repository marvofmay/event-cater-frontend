import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import NotePayload from '../../../types/NotePayload';
import { useTranslation } from 'react-i18next';

interface EditNoteModalProps {
    open: boolean;
    note: NotePayload | null;
    onSave: (updatedNote: NotePayload) => Promise<void>;
    onClose: () => void;
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({ open, note, onSave, onClose }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        title: Yup.string().required(t('validation.fieldIsRequired')),
        content: Yup.string(),
    });

    const [errorAPI, setErrorAPI] = useState<string | null>(null);
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(null);

    const handleSubmit = async (values: NotePayload) => {
        setErrorAPI(null);
        setErrorsAPI(null);

        try {
            if (note) {
                await onSave({ ...note, ...values });
                onClose();
            }
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
                {t('note.modal.edit.title')}
            </DialogTitle>

            <Formik
                initialValues={{
                    uuid: note?.uuid ?? '',
                    title: note?.title ?? '',
                    content: note?.content ?? '',
                    priority: note?.priority ?? 'low'
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize={true}
            >
                {({ errors, touched }) => (
                    <Form>
                        <DialogContent>
                            {errorAPI && (
                                <div style={{ color: 'red', marginBottom: '1rem' }}>
                                    {errorAPI}
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

                            <Field
                                as={TextField}
                                fullWidth
                                name="title"
                                label={t('note.form.field.title')}
                                variant="outlined"
                                margin="dense"
                                error={touched.title && Boolean(errors.title)}
                                helperText={touched.title && errors.title}
                                required
                            />

                            <Field
                                as={TextField}
                                fullWidth
                                name="content"
                                label={t('note.form.field.content')}
                                variant="outlined"
                                margin="dense"
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
                                sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }}
                                variant="contained"
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

export default EditNoteModal;
