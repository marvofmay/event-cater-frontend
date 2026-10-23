import { UserProfileDataResponse } from "@/app/types/UserProfileDataResponse";
import { useTranslation } from "react-i18next";
import { DataField } from "../DataField";
import { PencilIcon } from '@heroicons/react/24/outline';
import { Tooltip } from "@mui/material";

const MainDataView: React.FC<{
    employee: UserProfileDataResponse['data']['employee'];
    onEdit: () => void;
}> = ({ employee, onEdit }) => {
    const { t } = useTranslation();

    return (
        <div className="p-4 bg-white shadow-md rounded-lg relative">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <DataField label={t('employee.form.field.firstName')} value={employee?.firstName} />
                <DataField label={t('employee.form.field.lastName')} value={employee?.lastName} />
            </div>

            <div className="absolute top-3 right-3">
                <Tooltip title={t('common.edit')}>
                    <button
                        onClick={onEdit}
                        className="
                            p-2 rounded-full
                            text-gray-500 hover:text-blue-600
                            hover:bg-blue-50
                            transition
                        "
                    >
                        <PencilIcon className="w-5 h-5" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

export default MainDataView;
