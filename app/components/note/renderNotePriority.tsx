import { Box } from '@mui/material';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import type { NotePriority } from '@/app/types/NotePriority';
import React from 'react';
import { TFunction } from 'i18next';

const priorityColorMap: Record<NotePriority, string> = {
    high: '#e53935',
    medium: '#fb8c00',
    low: '#fdd835',
};

export const renderNotePriority = (t: TFunction, priority?: NotePriority, fallback: React.ReactNode = 'N/D'): React.ReactNode => {

    if (!priority) {
        return fallback;
    }

    return (
        <Box
            sx={{
                display: 'inline',
                gap: 1,
                whiteSpace: 'nowrap',
            }}
        >
            <StickyNote2Icon
                fontSize="small"
                sx={{ color: priorityColorMap[priority] }}
            />
            {t(`note.priority.${priority}`)}
        </Box>
    );
};