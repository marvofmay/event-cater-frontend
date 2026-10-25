"use client";

import { useState } from "react";
import { Alert } from "@mui/material";
import { Locale } from "@svar-ui/react-core";
import { Filemanager, Willow } from "@svar-ui/react-filemanager";
import "@svar-ui/react-filemanager/all.css";
import "./theme.css";
import plSvar from "@/app/i18n/svar/pl";

type FileItem = {
  id: string;
  type: "file" | "folder";
  size?: number;
  date?: Date;
};

export default function MainFileManager() {
  const [files] = useState<FileItem[]>(() => [
      {
        id: "/lorem",
        type: "folder",
        size: 4096,
      },
      {
        id: "/ipsum",
        type: "folder",
        size: 0,
      },
      {
        id: "/ipsum/dolor",
        type: "folder",
        size: 0,
      },
      {
        id: "/lorem/plik1.txt",
        type: "file",
      },
      {
        id: "/lorem/plik2.txt",
        type: "file",
      },
      {
        id: "/plik3.txt",
        type: "file",
      },
  ]);

  return (
    <div className="eventcater-file-manager">
    <Locale words={plSvar}>
      <Willow>
        <Alert severity="info" sx={{ mb: 2 }}>
          Widok demonstracyjny. Zmiany plików i folderów działają tylko w tym
          widoku i znikają po jego opuszczeniu lub odświeżeniu strony. Zapis na
          serwerze nie jest jeszcze podłączony.
        </Alert>
        <div style={{ height: "70vh", minHeight: "600px" }}>
          <Filemanager data={files} />
        </div>
      </Willow>
    </Locale>
    </div>
  );
}
