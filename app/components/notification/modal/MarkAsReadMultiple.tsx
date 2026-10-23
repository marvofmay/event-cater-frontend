import React, { useState } from "react";
import Notification from "../../../types/Notification";
import MarkAsReadMultipleConfirmModal from "../../modal/MarkAsReadMultipleConfirm";
import { useTranslation } from "react-i18next";

interface MarkAsReadMultipleNotificationsModalProps {
  open: boolean;
  selectedNotifications: Notification[] | null;
  onClose: () => void;
  onMarkAsReadMultipleConfirm: (notifications: Notification[]) => Promise<void>;
}

const MarkAsReadMultipleNotificationsModal: React.FC<
  MarkAsReadMultipleNotificationsModalProps
> = ({ open, selectedNotifications, onClose, onMarkAsReadMultipleConfirm }) => {
  const { t } = useTranslation();

  const [errorAPI, setErrorAPI] = useState<string>();
  const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(
    null,
  );

  const handleMarkAsReadMultiple = async () => {
    try {
      if (selectedNotifications) {
        await onMarkAsReadMultipleConfirm(selectedNotifications);
      }

      onClose();
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as any).response?.data?.message
      ) {
        setErrorAPI((error as any).response.data.message);
        setErrorsAPI((error as any).response.data.errors);
      } else {
        setErrorAPI("Wystąpił nieznany błąd");
      }
    }
  };

  return (
    <MarkAsReadMultipleConfirmModal
      open={open}
      selectedItems={selectedNotifications}
      onClose={onClose}
      onMarkAsReadMultipleConfirm={handleMarkAsReadMultiple}
      title={t("notification.modal.markAsRead.title")}
      description={`${t("notification.modal.markAsRead.question")}: ${selectedNotifications?.length ? selectedNotifications.map((notification) => notification.message.title).join(", ") : ""}?`}
      errorAPI={errorAPI}
      errorsAPI={errorsAPI}
    />
  );
};

export default MarkAsReadMultipleNotificationsModal;
