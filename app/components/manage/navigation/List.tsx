import { Box, Button, ListItemButton, Menu, MenuItem, Link, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import DashboardIcon from '@mui/icons-material/Dashboard';
import '../../../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { lowercaseFirstLetter } from '@/app/utils/stringMethod';
import { useUser } from "@/app/context/userContext";

const menuItems = [
    { label: "Companies", href: "/manage/companies/list", key: "companies" },
    { label: "Departments", href: "/manage/departments/list", key: "departments" },
    { label: "Employees", href: "/manage/employees/list", key: "employees" },
    { label: "Positions", href: "/manage/positions/list", key: "positions" },
    { label: "Roles", href: "/manage/roles/list", key: "roles" },
    { label: "Industries", href: "/manage/industries/list", key: "industries" },
    { label: "ContractTypes", href: "/manage/contractTypes/list", key: "contract_types" },
];

const ManageListNavigation: React.FC<{ variant?: "bar" | "drawer"; onNavigate?: () => void }> = ({
    variant = "bar",
    onNavigate,
}) => {
    const { hasAccess, hasPermission } = useUser();
    const visibleItems = menuItems.filter(item => hasAccess(item.key) && hasPermission(`${item.key}.list`));
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

    useEffect(() => {
        const matchedItem = menuItems.find(item => pathname.includes(item.href));

        if (matchedItem) {
            setSelectedMenuItem(matchedItem.key);
        }
    }, [pathname]);

    if (!hasAccess('manage') || visibleItems.length === 0) return null;
    if (variant === "drawer") {
        return (
            <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ px: 2, pb: 0.5, fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(247,250,248,0.55)" }}>
                    {t("navigation.manage")}
                </Typography>
                {visibleItems.map((item) => {
                    const active = pathname.includes(item.href);
                    const label = t(`navigation.${lowercaseFirstLetter(item.label)}`);
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
                aria-controls="manage-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                sx={{
                    textTransform: "none",
                    fontWeight: 520,
                    backgroundColor: open || selectedMenuItem ? "rgba(255, 255, 255, 0.14)" : "transparent",
                }}
            >
                <DashboardIcon fontSize="small" />
                <Box component="span" sx={{ ml: 0.75 }}>{t('navigation.manage')}</Box>
            </Button>

            <Menu
                id="manage-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                MenuListProps={{
                    "aria-labelledby": "manage-button",
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
                        {t(`navigation.${lowercaseFirstLetter(item.label)}`)}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export default ManageListNavigation;
