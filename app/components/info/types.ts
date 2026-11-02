export type NoticeImageMeta = {
  uuid: string;
  fileName: string;
  mimeType: string;
  size: number;
  role: "cover" | "gallery";
  sortOrder: number;
};

export type CompanyNotice = {
  uuid: string;
  title: string;
  body: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  cover: NoticeImageMeta | null;
  gallery: NoticeImageMeta[];
};
