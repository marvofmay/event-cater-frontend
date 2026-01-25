import { UserProfileDataResponse } from '@/app/types/UserProfileDataResponse';
import React from 'react';
import { useTranslation } from 'react-i18next';

const MainData: React.FC<{ data?: UserProfileDataResponse['data'] }> = ({ data }) => {
    const { t } = useTranslation();

    return (
        <div className="p-4 bg-white shadow-md rounded-lg">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-gray-500 font-normal">
                        {t('employee.form.field.firstName')}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">{data?.employee?.firstName || 'N/D'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 font-normal">
                        {t('employee.form.field.lastName')}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">{data?.employee?.lastName || 'N/D'}</p>
                </div>
                <div className="col-span-1 xs:col-span-2">
                    <p className="text-xs text-gray-500 font-normal">
                        {t('employee.form.field.position')}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">{data?.employee?.position || 'N/D'}</p>
                </div>
                <div className="col-span-1 xs:col-span-2">
                    <p className="text-xs text-gray-500 font-normal">
                        {t('employee.form.field.role')}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">{data?.employee?.role || 'N/D'}</p>
                </div>
            </div>
        </div>
    );
};

export default MainData;
