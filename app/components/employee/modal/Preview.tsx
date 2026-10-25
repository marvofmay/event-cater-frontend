import React from 'react';
import Employee from '../../../types/Employee';
import Preview from '../../modal/Preview';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';

interface PreviewEmployeeModalProps {
    open: boolean;
    selectedEmployee: Employee | null;
    onClose: () => void;
}

const PreviewEmployeeModal: React.FC<PreviewEmployeeModalProps> = ({ open, selectedEmployee, onClose }) => {
    const { t } = useTranslation();

    const getContactsByType = (type: "phone" | "email" | "website"): string[] => {
        return selectedEmployee?.contacts
            ?.filter(c => c.type === type)
            .map(c => c.data) ?? [];
    };

    const phones = getContactsByType("phone");
    const emails = getContactsByType("email");

    return (
        <Preview
            open={open}
            title={t('employee.modal.preview.title')}
            details={{
                UUID: selectedEmployee?.uuid || 'N/D',
                [t('employee.form.field.firstName')]: selectedEmployee?.firstName || 'N/D',
                [t('employee.form.field.lastName')]: selectedEmployee?.lastName || 'N/D',
                [t('employee.form.field.pesel')]: selectedEmployee?.pesel ? `${selectedEmployee.pesel}${selectedEmployee.isPeselFake ? ' — Fikcyjny PESEL' : ''}` : 'N/D',
                [t('employee.form.field.phone')]: phones.length > 0 ? phones.join(', ') : 'N/D',
                [t('employee.form.field.email')]: emails.length > 0 ? emails.join(', ') : 'N/D',
                [t('employee.form.field.company')]: selectedEmployee?.company?.fullName || 'N/D',
                [t('employee.form.field.department')]: selectedEmployee?.department?.name || 'N/D',
                [t('employee.form.field.externalCode')]: selectedEmployee?.externalCode || 'N/D',
                [t('employee.form.field.internalCode')]: selectedEmployee?.internalCode || 'N/D',
                [t('employee.form.field.parentEmployee')]: selectedEmployee?.parentEmployee ? `${selectedEmployee.parentEmployee.firstName} ${selectedEmployee.parentEmployee.lastName} (${selectedEmployee.parentEmployee.uuid})` : 'N/D',
                [t('employee.form.field.employmentFrom')]: selectedEmployee?.employmentFrom || 'N/D',
                [t('employee.form.field.employmentTo')]: selectedEmployee?.employmentTo || 'N/D',
                [t('employee.form.field.position')]: selectedEmployee?.position?.name || 'N/D',
                [t('employee.form.field.contractType')]: selectedEmployee?.contractType?.name || 'N/D',
                [t('employee.form.field.active')]: selectedEmployee?.active === true ? (<CheckCircleIcon color="success" fontSize="small" />) : selectedEmployee?.active === false ? (<CancelIcon color="error" fontSize="small" />) : 'N/D',
                [t('employee.form.field.country')]: selectedEmployee?.address?.country || 'N/D',
                [t('employee.form.field.city')]: selectedEmployee?.address?.city || 'N/D',
                [t('employee.form.field.postcode')]: selectedEmployee?.address?.postcode || 'N/D',
                [t('employee.form.field.street')]: selectedEmployee?.address?.street || 'N/D',
                [t('employee.form.field.role')]: selectedEmployee?.role?.name || 'N/D',
                [t('employee.form.field.createdAt')]: selectedEmployee?.createdAt || 'N/D',
                [t('employee.form.field.updatedAt')]: selectedEmployee?.updatedAt || 'N/D',
                [t('employee.form.field.deletedAt')]: selectedEmployee?.deletedAt || 'N/D',
            }}
            onClose={onClose}
        />
    );
};

export default PreviewEmployeeModal;
