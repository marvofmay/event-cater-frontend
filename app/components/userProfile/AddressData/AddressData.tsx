import Address from '@/app/types/Address';
import React from 'react';
import AddressDataEdit from './AddressDataEdit';
import AddressDataView from './AddressDataView';

interface AddressDataProps {
    data: Address | undefined;
}

export const AddressMainData: React.FC<{ data?: Address }> = ({ data }) => {
    const [isEditing, setIsEditing] = React.useState(false);

    if (!data) return null;

    return isEditing ? (
        <AddressDataEdit
            address={data}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
        />
    ) : (
        <AddressDataView
            address={data}
            onEdit={() => setIsEditing(true)}
        />
    );
};

export default AddressMainData;