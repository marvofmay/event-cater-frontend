import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import { useTranslation } from "react-i18next";

interface MarkAsReadMultipleConfirmModalProps<T> {
  open: boolean;
  selectedItems: T | null;
  onClose: () => void;
  onMarkAsReadMultipleConfirm: (items: T) => void;
  title: string;
  description: string;
  errorAPI?: string;
  errorsAPI?: Record<string, string> | null;
}

const MarkAsReadMultipleConfirmModal = <T,>({
  open,
  selectedItems,
  onClose,
  onMarkAsReadMultipleConfirm,
  title,
  description,
  errorAPI,
  errorsAPI,
}: MarkAsReadMultipleConfirmModalProps<T>) => {
  const handleMarkAsReadMultiple = () => {
    if (selectedItems) {
      onMarkAsReadMultipleConfirm(selectedItems);
    }
  };

  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle
        sx={{
          backgroundColor: "#34495e",
          color: "white",
          fontSize: "1.2rem",
          fontWeight: "bold",
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent>
        {errorAPI && (
          <div style={{ color: "red", marginBottom: "1rem" }}>
            <strong> {errorAPI}</strong>
          </div>
        )}
        {errorsAPI && (
          <ul style={{ color: "red", marginBottom: "1rem" }}>
            {Object.entries(errorsAPI).map(([field, message]) => (
              <li key={field}>
                <strong>{field}:</strong> {message}
              </li>
            ))}
          </ul>
        )}
        <DialogContentText sx={{ marginTop: "1rem" }}>
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: "#999a99",
            color: "white",
            fontWeight: "bold",
          }}
        >
          {t("common.button.cancel")}
        </Button>
        <Button
          onClick={handleMarkAsReadMultiple}
          color="info"
          variant="contained"
        >
          {t("common.button.markAsRead")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MarkAsReadMultipleConfirmModal;
