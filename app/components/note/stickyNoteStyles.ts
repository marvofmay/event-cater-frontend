import { alpha } from '@mui/material/styles';
import type { NotePriority } from '@/app/types/NotePriority';
import { priorityColorMap } from '@/app/components/note/renderNotePriority';

export function stickyNoteStyles(priority: NotePriority) {
    const color = priorityColorMap[priority] ?? priorityColorMap.low;
    return {
        position: 'relative', color: '#292524', borderRadius: '2px 2px 18px 2px', borderTop: `5px solid ${color}`, bgcolor: '#fff',
        backgroundImage: `linear-gradient(145deg, ${alpha(color, 0.38)}, ${alpha(color, 0.22)})`,
        boxShadow: '2px 5px 10px rgba(71, 55, 27, 0.15)',
        '&::after': { content: '""', position: 'absolute', bottom: 0, right: 0, width: 23, height: 23, background: `linear-gradient(135deg, rgba(0,0,0,0.10) 0%, ${alpha(color, 0.45)} 49%, #fff 50%)`, borderTopLeftRadius: 3, pointerEvents: 'none' },
    };
}
