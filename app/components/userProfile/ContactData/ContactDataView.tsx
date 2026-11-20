import React from "react";
import { useTranslation } from "react-i18next";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@mui/material";
import Contact from "@/app/types/Contact";

interface ContactDataViewProps {
  contacts: Contact[];
  onEdit: () => void;
}

const ContactDataView: React.FC<ContactDataViewProps> = ({ contacts, onEdit }) => {
  const { t } = useTranslation();

  const email = contacts.find((c) => c.type === "email" && c.active);
  const phones = contacts.filter((c) => c.type === "phone" && c.active).slice(0, 3);

  return (
    <div className="relative p-4 pr-12 bg-white shadow-md rounded-lg min-w-0">
      <div className="grid grid-cols-1 gap-4 min-w-0">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-normal">{t("employee.form.field.email")}</p>
          <p className="text-xs text-gray-700 font-medium break-all [overflow-wrap:anywhere]">
            {email ? email.data : "N/D"}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{t("employee.form.field.phone")}</p>
          {phones.length > 0 ? (
            phones.map((p, i) => (
              <p key={i} className="text-xs text-gray-700 font-medium break-all">
                {p.data}
              </p>
            ))
          ) : (
            <p className="text-xs text-gray-700 font-medium">N/D</p>
          )}
        </div>
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

export default ContactDataView;
