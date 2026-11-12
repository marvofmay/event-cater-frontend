import { Avatar, Box, Button, ListItemButton, Menu, MenuItem, Link, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Person2Icon from '@mui/icons-material/Person2';
import '../../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { useNavigationAvatar } from '@/app/hooks/userProfile/useNavigationAvatar';

const menuItems = [
    { label: "Settings", href: "/me/settings", key: "companies" },
    { label: "UserData", href: "/me/data", key: "employees" },
    { label: "ChangePassword", href: "/me/password", key: "password" },
    { label: "Logout", href: "/me/logout", key: "roles" },
];

const UserProfileNavigation: React.FC<{ variant?: "bar" | "drawer"; onNavigate?: () => void }> = ({
    variant = "bar",
    onNavigate,
}) => {
    const avatarUrl = useNavigationAvatar();
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

    if (variant === "drawer") {
        return (
            <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ px: 2, pb: 0.5, fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(247,250,248,0.55)" }}>
                    {t("navigation.userProfile")}
                </Typography>
                {menuItems.map((item) => {
                    const active = pathname.includes(item.href);
                    const label = item.key === "password"
                        ? "Zmień hasło"
                        : t(`navigation.${item.label.charAt(0).toLowerCase()}${item.label.slice(1)}`);
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
                aria-label="Menu użytkownika"
                aria-controls="manage-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                sx={{
                    backgroundColor: open || selectedMenuItem ? "rgba(255, 255, 255, 0.3)" : "transparent",
                }}
            >
                {avatarUrl ? <Avatar src={avatarUrl} alt="Avatar użytkownika" sx={{ width: 32, height: 32, bgcolor: 'transparent', color: 'inherit' }}><Person2Icon /></Avatar> : <Person2Icon />}
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
                {menuItems.map((item) => (
                    <MenuItem
                        key={item.key}
                        onClick={() => handleMenuItemClick(item.key)}
                        component={Link}
                        href={item.href}
                        sx={{
                            backgroundColor: selectedMenuItem === item.key ? "rgba(0, 0, 0, 0.1)" : "transparent",
                        }}
                    >
                        {item.key === 'password' ? 'zmień hasło' : t(`navigation.${item.label.charAt(0).toLowerCase()}${item.label.slice(1)}`)}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export default UserProfileNavigation;
