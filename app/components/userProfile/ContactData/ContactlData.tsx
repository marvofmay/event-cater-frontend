import React from 'react';
import Contact from '@/app/types/Contact';
import ContactDataEdit from './ContactDateEdit';
import ContactDataView from './ContactDataView';

interface ContactMainDataProps {
    data?: Contact[];
}

const ContactData: React.FC<ContactMainDataProps> = ({ data }) => {
    const [isEditing, setIsEditing] = React.useState(false);

    if (!data) return null;

    return isEditing ? (
        <ContactDataEdit
            contacts={data}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
        />
    ) : (
        <ContactDataView
            contacts={data}
            onEdit={() => setIsEditing(true)}
        />
    );
};

export default ContactData;
