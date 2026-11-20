import Address from "@/app/types/Address";
import { useTranslation } from "react-i18next";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@mui/material";
import { DataField } from "../DataField";

const AddressDataView: React.FC<{
  address: Address;
  onEdit: () => void;
}> = ({ address, onEdit }) => {
  const { t } = useTranslation();

  return (
    <div className="relative p-4 pr-12 bg-white shadow-md rounded-lg min-w-0">
      <div className="grid grid-cols-1 gap-4 min-w-0">
        <DataField label={t("employee.form.field.street")} value={address.street} />
        <DataField label={t("employee.form.field.postcode")} value={address.postcode} />
        <DataField label={t("employee.form.field.city")} value={address.city} />
        <DataField label={t("employee.form.field.country")} value={address.country} />
      </div>

      <div className="absolute top-2 right-2 z-10">
        <Tooltip title={t("common.edit")}>
          <button
            type="button"
            onClick={onEdit}
            aria-label={t("common.edit")}
            className="p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default AddressDataView;
