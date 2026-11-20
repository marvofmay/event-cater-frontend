import { UserProfileDataResponse } from "@/app/types/UserProfileDataResponse";
import { useTranslation } from "react-i18next";
import { DataField } from "../DataField";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@mui/material";

const MainDataView: React.FC<{
  employee: UserProfileDataResponse["data"]["employee"];
  onEdit: () => void;
}> = ({ employee, onEdit }) => {
  const { t } = useTranslation();

  return (
    <div className="relative p-4 pr-12 bg-white shadow-md rounded-lg min-w-0">
      <div className="grid grid-cols-1 gap-4 min-w-0">
        <DataField label={t("employee.form.field.firstName")} value={employee?.firstName} />
        <DataField label={t("employee.form.field.lastName")} value={employee?.lastName} />
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

export default MainDataView;
