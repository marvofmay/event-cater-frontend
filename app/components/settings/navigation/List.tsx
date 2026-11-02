import { Button, Menu, MenuItem, Link } from "@mui/material";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import SettingsIcon from "@mui/icons-material/Settings"
import '../../../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/context/userContext';

const menuItems = [
    { label: "companies", href: "/settings/companies", key: "companies" },
    { label: "departments", href: "/settings/departments", key: "departments" },
    { label: "employees", href: "/settings/employees", key: "employees" },
    { label: "positions", href: "/settings/positions", key: "positions" },
    { label: "roles", href: "/settings/roles", key: "roles" },
    { label: "contractTypes", href: "/settings/contractTypes", key: "contract_types" },
    { label: "industries", href: "/settings/industries", key: "industries" },
    { label: "notifications", href: "/settings/notifications", key: "notifications" },
    { label: "facebook", href: "/settings/facebook", key: "facebook" },
];

const SettingsListNavigation: React.FC = () => {
    const { hasAccess, hasPermission, user, roles } = useUser();
    const isTechnical = user?.technicalAdministrator || roles.includes('Administrator techniczny SaaS');
    const canFacebook = hasPermission("events.publish_facebook");
    const visibleItems = menuItems.filter(item => {
        if (item.key === "facebook") return canFacebook;
        return isTechnical && hasAccess(item.key) && hasPermission(`${item.key}.list`);
    });
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const pathname = usePathname();
    const [selectedMenuItem, setSelectedMenuItem] = useState<string>("");

    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleMenuItemClick = (menuItem: string) => {
        setSelectedMenuItem(menuItem);
        handleMenuClose();
    };

    const { t } = useTranslation();

    // Ustaw wybrany element menu na podstawie ścieżki URL
    useEffect(() => {
        const matchedItem = menuItems.find(item => pathname.includes(item.href));
        if (matchedItem) {
            setSelectedMenuItem(matchedItem.key);
        }
    }, [pathname]);

    if (visibleItems.length === 0) return null;
    return (
        <>
            <Button
                color="inherit"
                id="settings-button"
                aria-controls="settings-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                sx={{
                    backgroundColor: open || selectedMenuItem ? "rgba(255, 255, 255, 0.3)" : "transparent",
                }}
            >
                <SettingsIcon /> {t('navigation.settings')}
            </Button>
            <Menu
                id="settings-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                MenuListProps={{
                    "aria-labelledby": "settings-button",
                }}
            >
                {visibleItems.map((item) => (
                    <MenuItem
                        key={item.key}
                        onClick={() => handleMenuItemClick(item.key)}
                        component={Link}
                        href={item.href}
                        sx={{
                            backgroundColor: selectedMenuItem === item.key ? "rgba(0, 0, 0, 0.1)" : "transparent",
                        }}
                    >
                        {t(`navigation.${item.label}`)}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export default SettingsListNavigation;
