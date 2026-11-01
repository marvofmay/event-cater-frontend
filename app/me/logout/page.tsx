"use client";

import { useUser } from "@/app/context/userContext";
import { useEffect } from "react";

const Logout: React.FC = () => {
    const { logout } = useUser();

    useEffect(() => {
        void logout();
    }, [logout]);

    return null;
}

export default Logout;
