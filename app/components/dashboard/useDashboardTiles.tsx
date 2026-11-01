import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/context/userContext';
import { usePreferences } from '@/app/context/preferencesContext';
import { CalendarToday, Dashboard, Description, FolderOpen, Settings, StickyNote2, Task } from '@mui/icons-material';

const icons: Record<string, React.ReactNode> = {
    events: <CalendarToday fontSize="inherit" />, equipment: <Description fontSize="inherit" />,
    supplies: <Task fontSize="inherit" />, kitchen: <Task fontSize="inherit" />,
    company: <Dashboard fontSize="inherit" />, system: <Settings fontSize="inherit" />,
    notes: <StickyNote2 fontSize="inherit" />, documents: <Description fontSize="inherit" />,
    file_manager: <FolderOpen fontSize="inherit" />,
};

export function orderTiles<T extends { id: string }>(tiles: T[], order: string[]): T[] {
    const byId = new Map(tiles.map(tile => [tile.id, tile]));
    const ids = [...new Set([...order, ...tiles.map(tile => tile.id)])];
    return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
}

export function useDashboardTiles() {
    const { t } = useTranslation();
    const { modules, hasAccess, hasPermission } = useUser();
    const { dashboardOrder } = usePreferences();
    const permitted = (access: string) => hasAccess(access) && hasPermission(`${access}.list`);
    const targets: Record<string, string | null> = {
        events: permitted('events') ? '/module/events' : null,
        equipment: permitted('equipment') ? '/module/equipment' : null,
        supplies: permitted('consumables') ? '/module/supplies' : null,
        kitchen: permitted('orders') ? '/module/kitchen' : null,
        notes: permitted('notes') ? '/module/notes' : null,
        company: hasAccess('company_structure') && hasPermission('company_structure.view') ? '/module/company' : null,
        system: permitted('notification_messages') ? '/notifications' : permitted('notifications') ? '/settings/notifications' : null,
        file_manager: hasAccess('file_manager') ? '/module/file_manager' : null,
        documents: '/module/documents',
    };
    const tiles = modules.filter(module => targets[module]).map(id => ({
        id, href: targets[id]!, icon: icons[id], label: t(`module.${id}`).replace(/^./u, character => character.toLocaleUpperCase('pl-PL')),
    }));

    return { tiles: orderTiles(tiles, dashboardOrder), defaultTiles: tiles };
}
