import { Button, Menu, MenuItem, Link } from "@mui/material";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Person2Icon from '@mui/icons-material/Person2';
import '../../i18n/i18n';
import { useTranslation } from 'react-i18next';

const menuItems = [
    { label: "Settings", href: "/me/settings", key: "companies" },
    { label: "UserData", href: "/me/data", key: "employees" },
    { label: "Logout", href: "/me/logout", key: "roles" },
];

const UserProfileNavigation: React.FC = () => {
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

    return (
        <>
            <Button
                color="inherit"
                aria-controls="manage-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                sx={{
                    backgroundColor: open || selectedMenuItem ? "rgba(255, 255, 255, 0.3)" : "transparent",
                }}
            >
                <Person2Icon />
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
                        {t(`navigation.${item.label.charAt(0).toLowerCase()}${item.label.slice(1)}`)}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export default UserProfileNavigation;
