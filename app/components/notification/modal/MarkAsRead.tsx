import React, { useState } from "react";
import Notification from "../../../types/Notification";
import MarkAsReadConfirmModal from "../../modal/MarkAsReadConfirm";
import { useTranslation } from "react-i18next";

interface MarkAsReadNotificationsModalProps {
  open: boolean;
  selectedNotification: Notification | null;
  onClose: () => void;
  onMarkAsReadConfirm: (notifications: Notification) => Promise<void>;
}

const MarkAsReadNotificationsModal: React.FC<
  MarkAsReadNotificationsModalProps
> = ({ open, selectedNotification, onClose, onMarkAsReadConfirm }) => {
  const { t } = useTranslation();

  const [errorAPI, setErrorAPI] = useState<string>();
  const [errorsAPI, setErrorsAPI] = useState<Record<string, string> | null>(
    null,
  );

  const handleMarkAsRead = async () => {
    try {
      if (selectedNotification) {
        await onMarkAsReadConfirm(selectedNotification);
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
    <MarkAsReadConfirmModal
      open={open}
      selectedItem={selectedNotification}
      onClose={onClose}
      onMarkAsReadConfirm={handleMarkAsRead}
      title={t("notification.modal.markAsRead.title")}
      description={`${t("notification.modal.markAsRead.question")}: ${selectedNotification ? selectedNotification.message.title : ""}?`}
      errorAPI={errorAPI}
      errorsAPI={errorsAPI}
    />
  );
};

export default MarkAsReadNotificationsModal;
