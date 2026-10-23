"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import TaskIcon from '@mui/icons-material/Task';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import DescriptionIcon from '@mui/icons-material/Description';
import FlightIcon from '@mui/icons-material/Flight';
import RequestPageIcon from '@mui/icons-material/RequestPage';
import DashboardIcon from '@mui/icons-material/Dashboard';;
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FeedbackIcon from '@mui/icons-material/Feedback';
import SettingsIcon from "@mui/icons-material/Settings"
import { useUser } from "@/app/context/userContext";

const moduleIcons: Record<string, React.ReactNode> = {
    events: <CalendarTodayIcon fontSize="inherit" />,
    equipment: <RequestPageIcon fontSize="inherit" />,
    supplies: <TaskIcon fontSize="inherit" />,
    kitchen: <TaskIcon fontSize="inherit" />,
    company: <DashboardIcon fontSize="inherit" color="inherit" />,
    system: <SettingsIcon fontSize="inherit" color="inherit" />,
    tasks: <TaskIcon fontSize="inherit" color="inherit" />,
    calendar: <CalendarTodayIcon fontSize="inherit" color="inherit" />,
    notes: <StickyNote2Icon fontSize="inherit" color="inherit" />,
    documents: <DescriptionIcon fontSize="inherit" color="inherit" />,
    trips: <FlightIcon fontSize="inherit" color="inherit" />,
    requests: <RequestPageIcon fontSize="inherit" color="inherit" />,
    substitutions: <SwapHorizIcon fontSize="inherit" color="inherit" />,
    feedback: <FeedbackIcon fontSize="inherit" color="inherit" />,
};


const Items: React.FC = () => {
    const { t } = useTranslation();
    const { modules } = useUser();


    return (
        <div className="grid grid-rows-[10px_1fr_10px] justify-items-center min-h-screen p-4 font-[family-name:var(--font-geist-sans)]">
            <main className="grid grid-cols-4 gap-10 justify-center items-center">
                {modules.map((moduleName, index) => (
                    (
                        <Link
                            key={`${moduleName}-${index}`}
                            href={`/module/${moduleName}`}
                        >
                            <div className="relative flex flex-col items-center justify-center w-24 h-24 sm:w-48 sm:h-48 rounded-full bg-[#34495e] hover:bg-[#2c3e50] transition-all shadow-lg cursor-pointer group overflow-hidden">
                                <div className="text-4xl sm:text-5xl text-white z-10 relative">{moduleIcons[moduleName]}</div>
                                <span className="text-sm sm:text-base text-center mt-2 text-gray-200 z-10 relative">
                                    {t(`module.${moduleName}`)}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-100 transform translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out"></div>
                            </div>
                        </Link>
                    )
                ))}
            </main>
        </div>
    );
};

export default Items;

