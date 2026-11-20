export const DataField = ({ label, value }: { label: string; value?: string }) => (
    <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xs text-gray-700 font-medium break-words [overflow-wrap:anywhere]">
            {value || "N/D"}
        </p>
    </div>
);
