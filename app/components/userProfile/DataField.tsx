export const DataField = ({ label, value }: { label: string; value?: string }) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xs text-gray-700 font-medium">{value || 'N/D'}</p>
    </div>
);


