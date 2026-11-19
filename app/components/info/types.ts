export type NoticeImageMeta = {
  uuid: string;
  fileName: string;
  mimeType: string;
  size: number;
  role: "cover" | "gallery";
  sortOrder: number;
};

export type NoticeStatus = "published" | "scheduled" | "inactive" | "archived";

export type CompanyNotice = {
  uuid: string;
  title: string;
  body: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  publishAt: string;
  active: boolean;
  archivedAt: string | null;
  status: NoticeStatus;
  cover: NoticeImageMeta | null;
  gallery: NoticeImageMeta[];
};
