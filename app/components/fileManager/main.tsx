"use client";

import { useEffect, useState } from "react";
import { Locale } from "@svar-ui/react-core";
import { Filemanager, Willow } from "@svar-ui/react-filemanager";
import "@svar-ui/react-filemanager/all.css";
import plSvar from "@/app/i18n/svar/pl";
import { SERVICE_COMPANY_URL } from "@/app/utils/constans";

type FileItem = {
  id: string;
  type: "file" | "folder";
  size?: number;
  date?: string | Date;
};

const API_URL = `${SERVICE_COMPANY_URL}/api/files`;

export default function MainFileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);

  const loadFiles = async () => {
    //const res = await fetch(API_URL);

    const data: FileItem[] = [
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
    ];

    // if (!res.ok) throw new Error("Nie udało się pobrać plików");
    // const data = await res.json();
    setFiles(data);
  };

  useEffect(() => {
    loadFiles().catch(console.error);
  }, []);

  const init = (api: any) => {
    api.on(
      "create-file",
      async (ev: { id: string; parent?: string; file?: any }) => {
        await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: ev.id,
            parent: ev.parent ?? null,
            file: ev.file ?? null,
          }),
        });

        await loadFiles();
      },
    );

    api.on("rename-file", async (ev: { id: string; name: string }) => {
      await fetch(`${API_URL}/${encodeURIComponent(ev.id)}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ev.name }),
      });

      await loadFiles();
    });

    api.on("delete-files", async (ev: { ids: string[] }) => {
      await fetch(`${API_URL}/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ev.ids }),
      });

      await loadFiles();
    });

    api.on("move-files", async (ev: { ids: string[]; target: string }) => {
      console.log("move-files", ev);

      // await fetch(`${API_URL}/move`, {
      //   method: "PATCH",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     ids: ev.ids,
      //     target: nextParent ?? null,
      //   }),
      // });

      // await loadFiles();
    });

    api.on("copy-files", async (ev: { ids: string[]; target: string }) => {
      await fetch(`${API_URL}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: ev.ids,
          target: ev.target,
        }),
      });

      await loadFiles();
    });

    api.on("download-file", (ev: { id: string }) => {
      window.open(`${API_URL}/${encodeURIComponent(ev.id)}/download`, "_self");
    });
  };

  return (
    <Locale words={plSvar}>
      <Willow>
        <div style={{ height: "70vh", minHeight: "600px" }}>
          <Filemanager init={init} data={files} />
        </div>
      </Willow>
    </Locale>
  );
}
