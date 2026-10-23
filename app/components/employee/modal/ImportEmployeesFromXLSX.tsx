import React, { useState } from 'react';
import UploadFile from '../../modal/UploadFile';
import { useTranslation } from 'react-i18next';

type APIError422 = {
    response: {
        status: number;
        data: {
            errors: Record<string, string[]>;
        };
    };
};

interface ImportEmployeesFromXLSXProps {
    open: boolean;
    onClose: () => void;
    onImportEmployeesFromXLSX: (file: File) => Promise<void>;
    allowedTypes?: string[];
}

const ImportEmployeesFromXLSXModal: React.FC<ImportEmployeesFromXLSXProps> = ({ open, onClose, onImportEmployeesFromXLSX, allowedTypes }) => {
    const { t } = useTranslation();
    const [errorsAPI, setErrorsAPI] = useState<Record<string, string[]> | undefined>();

    const onUploadFile = async (file: File) => {
        try {
            await onImportEmployeesFromXLSX(file);

            onClose();
        } catch (error: unknown) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof (error as { response?: unknown }).response === 'object' &&
                (error as APIError422).response?.status === 422
            ) {
                setErrorsAPI((error as APIError422).response.data.errors);
            }
        }
    };

    return (
        <UploadFile
            open={open}
            onClose={onClose}
            onUploadFile={onUploadFile}
            allowedTypes={allowedTypes}
            title={t('employee.modal.import.title')}
            errorsAPI={errorsAPI}
            sampleFileUrl="/samples/employees-import-example.xlsx"
        />
    );
};


export default ImportEmployeesFromXLSXModal;
