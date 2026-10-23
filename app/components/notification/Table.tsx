import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  IconButton,
  Button,
  Box,
  CircularProgress,
  TextField,
  Checkbox,
} from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { Preview, Delete, Search } from "@mui/icons-material";
import Notification from "@/app/types/Notification";
import PreviewNotificationModal from "@/app/components/notification/modal/Preview";
import DeleteNotificationModal from "@/app/components/notification/modal/Delete";
import DeleteMultipleNotificationsModal from "@/app/components/notification/modal/DeleteMultiple";
import useNotificationsQuery from "@/app/hooks/notification/useNotificationsQuery";
import useDeleteNotificationMutation from "@/app/hooks/notification/useDeleteNotificationMutation";
import useDeleteMultipleNotificationMutation from "@/app/hooks/notification/useDeleteMultipleNotificationMutation";
import useMarkAsReadNotificationMutation from "@/app/hooks/notification/markAsReadNotificationMutate";

import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/context/userContext";
import { SortDirection } from "@/app/types/SortDirection";
import MarkAsReadMultipleNotificationsModal from "./modal/MarkAsReadMultiple";
import CheckIcon from "@mui/icons-material/Check";
import useMarkAsReadMultipleNotificationMutation from "@/app/hooks/notification/markAsReadMultipleNotificationMutate";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import MarkAsReadNotificationsModal from "./modal/MarkAsRead";

const NotificationsTable = () => {
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchPhrase, setSearchPhrase] = useState<string>("");
  const [phrase, setPhrase] = useState<string>("");
  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const { mutate: deleteNotificationMutate } = useDeleteNotificationMutation();
  const { mutate: deleteMultipleNotificationMutate } =
    useDeleteMultipleNotificationMutation();
  const { mutate: markAsReadMultipleNotificationMutate } =
    useMarkAsReadMultipleNotificationMutation();
  const { mutate: markAsReadNotificationMutate } =
    useMarkAsReadNotificationMutation();
  const { t } = useTranslation();
  const { hasPermission } = useUser();

  const result = useNotificationsQuery(
    pageSize,
    page,
    sortBy,
    sortDirection,
    phrase,
  );
  const { data: rawData, isLoading, error, refetch } = result;

  const notifications: Notification[] = Array.isArray(rawData)
    ? rawData
    : rawData?.items || [];
  const totalCount: number = Array.isArray(rawData)
    ? notifications.length
    : rawData?.total || 0;

  const allSelected =
    selected.length === notifications.length && notifications.length > 0;

  const handleSearch = () => {
    setPhrase(searchPhrase);
    setPage(1);
  };

  const handleSort = (column: string) => {
    const direction =
      sortBy === column && sortDirection === "asc" ? "desc" : "asc";
    setSortBy(column);
    setSortDirection(direction);
  };

  const openModal = (
    type: string,
    notification: Notification | null = null,
  ) => {
    setModalType(type);
    setSelectedNotification(notification);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedNotification(null);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setPageSize(Number(event.target.value));
    setSelected([]);
  };

  const handleDelete = (notificationToDelete: Notification): Promise<void> => {
    return new Promise((resolve, reject) => {
      deleteNotificationMutate(notificationToDelete, {
        onSuccess: (message: string) => {
          toast.success(message);

          refetch().then((freshData) => {
            if (!freshData.data?.items?.length && page > 1) {
              setPage(page - 1);
            }
          });

          resolve();
        },
        onError: (error: object) => {
          toast.error(t("notification.delete.error"));
          reject(error);
        },
      });
    });
  };

  const toggleSelectAll = () => {
    setSelected(
      allSelected ? [] : notifications.map((notification) => notification.uuid),
    );
  };

  const toggleSelectRow = (uuid: string) => {
    setSelected((prev) =>
      prev.includes(uuid)
        ? prev.filter((item) => item !== uuid)
        : [...prev, uuid],
    );
  };

  const handleDeleteMultiple = (
    notificationsToDelete: Notification[],
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      deleteMultipleNotificationMutate(notificationsToDelete, {
        onSuccess: (message: string) => {
          setSelected([]);
          toast.success(message);

          refetch().then((freshData) => {
            if (!freshData.data?.items?.length && page > 1) {
              setPage(page - 1);
            }
          });

          resolve();
        },
        onError: (error: object) => {
          toast.error(t("notification.delete.multiple.error"));
          reject(error);
        },
      });
    });
  };

  const handleMarkAsReadMultiple = (
    notificationsToMarkAsRead: Notification[],
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      markAsReadMultipleNotificationMutate(notificationsToMarkAsRead, {
        onSuccess: (message: string) => {
          setSelected([]);
          toast.success(message);

          refetch().then((freshData) => {
            if (!freshData.data?.items?.length && page > 1) {
              setPage(page - 1);
            }
          });

          resolve();
        },
        onError: (error: object) => {
          toast.error(t("notification.markAsRead.multiple.error"));
          reject(error);
        },
      });
    });
  };

  const handleMarkAsRead = (
    notificationToMarkAsRead: Notification,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      markAsReadNotificationMutate(notificationToMarkAsRead, {
        onSuccess: (message: string) => {
          toast.success(message);

          refetch().then((freshData) => {
            if (!freshData.data?.items?.length && page > 1) {
              setPage(page - 1);
            }
          });

          resolve();
        },
        onError: (error: object) => {
          toast.error(t("notification.markAsRead.error"));
          reject(error);
        },
      });
    });
  };

  return (
    <div>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={2}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <TextField
            variant="outlined"
            placeholder={t("common.enterPhraseToSearch")}
            size="small"
            sx={{ width: "500px" }}
            onChange={(e) => setSearchPhrase(e.target.value)}
          />
          <Button
            startIcon={<Search />}
            variant="contained"
            color="primary"
            onClick={handleSearch}
          >
            {t("common.button.search")}
          </Button>
        </Box>

        <Box display="flex" alignItems="center" gap={1} ml="auto">
          {hasPermission("notifications.delete") && selected.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={() => openModal("multipleDelete")}
            >
              {t("notification.button.deleteChecked")} ({selected.length})
            </Button>
          )}

          {selected.some(
            (uuid) =>
              notifications.find((n) => n.uuid === uuid)?.readAt === null,
          ) &&
            hasPermission("notifications.markAsRead") &&
            selected.length > 0 && (
              <Button
                variant="contained"
                color="info"
                startIcon={<CheckIcon />}
                onClick={() => openModal("multipleMarkAsRead")}
              >
                {t("notification.button.markAsReadChecked")} (
                {
                  selected.filter(
                    (uuid) =>
                      notifications.find((n) => n.uuid === uuid)?.readAt ===
                      null,
                  ).length
                }
                )
              </Button>
            )}
        </Box>
      </Box>

      {isLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="300px"
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="300px"
        >
          <div>{t("common.message.somethingWentWrong")} :(</div>
        </Box>
      ) : notifications.length === 0 ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="300px"
        >
          <div>{t("common.noData")}</div>
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxHeight: "65vh",
            overflowY: "auto",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                {hasPermission("notifications.delete") && (
                  <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                    <Checkbox
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                )}
                <TableCell
                  sortDirection={sortBy === "id" ? sortDirection : false}
                  onClick={() => handleSort("id")}
                  sx={{ padding: "4px 8px" }}
                >
                  <TableSortLabel
                    active={sortBy === "id"}
                    direction={sortBy === "id" ? sortDirection : "asc"}
                  >
                    #
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sortDirection={sortBy === "title" ? sortDirection : false}
                  onClick={() => handleSort("title")}
                  sx={{ padding: "4px 8px" }}
                >
                  <TableSortLabel
                    active={sortBy === "title"}
                    direction={sortBy === "title" ? sortDirection : "asc"}
                  >
                    {t("notification.table.column.title")}
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sortDirection={
                    sortBy === "receivedAt" ? sortDirection : false
                  }
                  onClick={() => handleSort("receivedAt")}
                  sx={{ padding: "4px 8px" }}
                >
                  <TableSortLabel
                    active={sortBy === "receivedAt"}
                    direction={sortBy === "receivedAt" ? sortDirection : "asc"}
                  >
                    {t("notification.table.column.receivedAt")}
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sortDirection={sortBy === "readAt" ? sortDirection : false}
                  onClick={() => handleSort("readAt")}
                  sx={{ padding: "4px 8px" }}
                >
                  <TableSortLabel
                    active={sortBy === "readAt"}
                    direction={sortBy === "readAt" ? sortDirection : "asc"}
                  >
                    {t("notification.table.column.readAt")}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ padding: "4px 8px" }}>
                  {t("notification.table.column.actions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((notification, index) => (
                <TableRow key={notification.uuid}>
                  {hasPermission("notifications.delete") && (
                    <TableCell sx={{ width: 50, padding: "4px 8px" }}>
                      <Checkbox
                        checked={selected.includes(notification.uuid)}
                        onChange={() => toggleSelectRow(notification.uuid)}
                      />
                    </TableCell>
                  )}
                  <TableCell sx={{ padding: "4px 8px" }}>
                    {(page - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell sx={{ padding: "4px 8px" }}>
                    {notification.readAt === null ? (
                      <strong>{notification.message.title}</strong>
                    ) : (
                      notification.message.title
                    )}
                  </TableCell>
                  <TableCell sx={{ padding: "4px 8px" }}>
                    {notification.readAt === null ? (
                      <strong>{notification.receivedAt}</strong>
                    ) : (
                      notification.receivedAt
                    )}
                  </TableCell>
                  <TableCell sx={{ padding: "4px 8px" }}>
                    {notification.readAt}
                  </TableCell>
                  <TableCell sx={{ padding: "4px 8px" }}>
                    <Tooltip title={t("common.view")} placement="top">
                      <IconButton
                        onClick={() => openModal("preview", notification)}
                      >
                        <Preview />
                      </IconButton>
                    </Tooltip>

                    {hasPermission("notifications.delete") && (
                      <Tooltip title={t("common.delete")} placement="top">
                        <IconButton
                          onClick={() => openModal("delete", notification)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    )}

                    {hasPermission("notifications.markAsRead") && (
                      <Tooltip
                        title={t("notification.markAsRead.title")}
                        placement="top"
                      >
                        <IconButton
                          onClick={() => openModal("markAsRead", notification)}
                        >
                          <MarkEmailReadIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {totalCount > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={pageSize}
          page={page - 1}
          onPageChange={(_, newPage) => {
            setPage(newPage + 1);
            setSelected([]);
          }}
          onRowsPerPageChange={handlePageSizeChange}
          labelRowsPerPage={t("common.rowPerPage")}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} ${t("common.of")} ${count}`
          }
        />
      )}

      {modalType === "preview" && (
        <PreviewNotificationModal
          open={true}
          selectedNotification={selectedNotification}
          onClose={closeModal}
        />
      )}

      {modalType === "delete" && (
        <DeleteNotificationModal
          open={true}
          selectedNotification={selectedNotification}
          onClose={closeModal}
          onDeleteConfirm={handleDelete}
        />
      )}

      {modalType === "multipleDelete" && (
        <DeleteMultipleNotificationsModal
          open={true}
          selectedNotifications={notifications.filter((notification) =>
            selected.includes(notification.uuid),
          )}
          onClose={closeModal}
          onDeleteMultipleConfirm={handleDeleteMultiple}
        />
      )}

      {modalType === "multipleMarkAsRead" && (
        <MarkAsReadMultipleNotificationsModal
          open={true}
          selectedNotifications={notifications.filter((notification) =>
            selected.includes(notification.uuid),
          )}
          onClose={closeModal}
          onMarkAsReadMultipleConfirm={handleMarkAsReadMultiple}
        />
      )}

      {modalType === "markAsRead" && (
        <MarkAsReadNotificationsModal
          open={true}
          selectedNotification={selectedNotification}
          onClose={closeModal}
          onMarkAsReadConfirm={handleMarkAsRead}
        />
      )}
    </div>
  );
};

export default NotificationsTable;
