"use client";

import React from "react";
import Link from "next/link";
import { Alert, Stack } from '@mui/material';
import { useDashboardTiles } from './useDashboardTiles';

const Items: React.FC = () => {
  const { tiles } = useDashboardTiles();

  return (
    <Stack spacing={3}>
    {tiles.length === 0 && <Alert severity="info">Nie masz jeszcze przydzielonych dostępów do modułów. Skontaktuj się z administratorem firmy.</Alert>}
    <div className="w-full flex justify-center items-center px-4">
      <div
        className="grid
        grid-cols-2
        sm:grid-cols-3
        md:grid-cols-4
        lg:grid-cols-5
        gap-8
        justify-items-center"
      >
        {tiles.map(tile => (
          <Link
            key={tile.id}
            href={tile.href}
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
                {tile.icon}
              </div>

              {/* NAZWA */}
              <span className="text-xs sm:text-sm md:text-base text-center mt-2 text-gray-200 z-10 px-2">
                {tile.label}
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
    </Stack>
  );
};

export default Items;
