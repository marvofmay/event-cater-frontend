"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/context/userContext";

import TaskIcon from "@mui/icons-material/Task";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import DescriptionIcon from "@mui/icons-material/Description";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

const moduleIcons: Record<string, React.ReactNode> = {
  company: <DashboardIcon fontSize="inherit" />,
  system: <SettingsIcon fontSize="inherit" />,
  tasks: <TaskIcon fontSize="inherit" />,
  calendar: <CalendarTodayIcon fontSize="inherit" />,
  notes: <StickyNote2Icon fontSize="inherit" />,
  documents: <DescriptionIcon fontSize="inherit" />,
  file_manager: <FolderOpenIcon fontSize="inherit" />,
};

const Items: React.FC = () => {
  const { t } = useTranslation();
  const { modules } = useUser();

  return (
    <div className="w-full min-h-[60vh] flex justify-center items-center px-4">
      <div
        className="grid 
        grid-cols-2 
        sm:grid-cols-3 
        md:grid-cols-4 
        lg:grid-cols-5 
        gap-8 
        justify-items-center"
      >
        {modules.map((moduleName, index) => (
          <Link
            key={`${moduleName}-${index}`}
            href={`/module/${moduleName}`}
            className="group"
          >
            <div
              className="relative flex flex-col items-center justify-center
              w-24 h-24 
              sm:w-32 sm:h-32 
              md:w-40 md:h-40
              rounded-full
              bg-[#34495e]
              hover:bg-[#2c3e50]
              transition-all duration-300
              shadow-lg
              cursor-pointer
              overflow-hidden"
            >
              {/* IKONA */}
              <div className="text-3xl sm:text-4xl md:text-5xl text-white z-10">
                {moduleIcons[moduleName]}
              </div>

              {/* NAZWA */}
              <span className="text-xs sm:text-sm md:text-base text-center mt-2 text-gray-200 z-10 px-2">
                {t(`module.${moduleName}`)}
              </span>

              {/* EFEKT BŁYSKU */}
              <div
                className="
                absolute inset-0
                bg-gradient-to-r
                from-transparent
                via-white/40
                to-transparent
                opacity-0
                group-hover:opacity-100
                -translate-x-[150%]
                group-hover:translate-x-[150%]
                transition-all
                duration-700
                ease-in-out
              "
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Items;
