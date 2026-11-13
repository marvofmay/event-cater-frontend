import { Box, Button, ListItemButton, Menu, MenuItem, Link, Typography } from "@mui/material";
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

const SettingsListNavigation: React.FC<{ variant?: "bar" | "drawer"; onNavigate?: () => void }> = ({
    variant = "bar",
    onNavigate,
}) => {
    const { hasAccess, hasPermission, user, roles } = useUser();
    const isTechnical = user?.technicalAdministrator || roles.includes('Administrator techniczny SaaS') || roles.includes('Superadministrator');
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
    if (variant === "drawer") {
        return (
            <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ px: 2, pb: 0.5, fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(247,250,248,0.55)" }}>
                    {t("navigation.settings")}
                </Typography>
                {visibleItems.map((item) => {
                    const active = pathname.includes(item.href);
                    const label = t(`navigation.${item.label}`);
                    return (
                        <ListItemButton
                            key={item.key}
                            component={Link}
                            href={item.href}
                            underline="none"
                            onClick={() => onNavigate?.()}
                            sx={{
                                color: "#f7faf8",
                                textDecoration: "none",
                                mx: 1,
                                my: 0.25,
                                borderRadius: "0.45rem",
                                minHeight: 48,
                                backgroundColor: active ? "rgba(255,255,255,0.14)" : "transparent",
                                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                            }}
                        >
                            {label.charAt(0).toUpperCase() + label.slice(1)}
                        </ListItemButton>
                    );
                })}
            </Box>
        );
    }
    return (
        <>
            <Button
                color="inherit"
                id="settings-button"
                aria-controls="settings-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                sx={{
                    textTransform: "none",
                    fontWeight: 520,
                    backgroundColor: open || selectedMenuItem ? "rgba(255, 255, 255, 0.14)" : "transparent",
                }}
            >
                <SettingsIcon fontSize="small" />
                <Box component="span" sx={{ ml: 0.75 }}>{t('navigation.settings')}</Box>
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
