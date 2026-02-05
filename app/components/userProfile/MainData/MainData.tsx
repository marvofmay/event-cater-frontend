import { UserProfileDataResponse } from '@/app/types/UserProfileDataResponse';
import React from 'react';
import MainDataEdit from './MainDataEdit';
import MainDataView from './MainDataView';

export const MainData: React.FC<{ data?: UserProfileDataResponse['data'] }> = ({ data }) => {
    const [isEditing, setIsEditing] = React.useState(false);

    if (!data?.employee) return null;

    return isEditing ? (
        <MainDataEdit
            employee={data.employee}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
        />
    ) : (
        <MainDataView
            employee={data.employee}
            onEdit={() => setIsEditing(true)}
        />
    );
};
