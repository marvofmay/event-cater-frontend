import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import Tasks from './settings/Tasks';
import Requests from './settings/Requests';

interface EditNotificationModalProps {
    open: boolean;
    onClose: () => void;
}

const SettingsNotificationsModal: React.FC<EditNotificationModalProps> = ({ open, onClose }) => {
    const { t } = useTranslation();

    const validationSchema = Yup.object({
        name: Yup.string().required(t('validation.fieldIsRequired')),
        description: Yup.string(),
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {t('notification.modal.settings.title')}
            </DialogTitle>
            <Formik
                initialValues={{}}
                validationSchema={validationSchema}
                onSubmit={() => { }}
            >
                {() => (
                    <Form>
                        <DialogContent>
                            <Box
                                display="flex"
                                flexWrap="wrap"
                                gap={2}
                                justifyContent="space-between"
                            >
                                <Tasks />
                                <Requests />
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button color="primary" onClick={onClose}  variant="contained">
                                {t('common.button.cancel')}
                            </Button>
                            <Button color="primary" type="submit" sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }} variant="contained">
                                {t('common.button.save')}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default SettingsNotificationsModal;
