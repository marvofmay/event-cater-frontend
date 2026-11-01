"use client";

import { Alert, Box, Paper } from "@mui/material";
import { useEffect, useState } from "react";
import SignIn from "../components/user/login/SignIn";

const Login: React.FC = () => {
  const [inactiveLogout, setInactiveLogout] = useState(false);
  useEffect(() => {
    setInactiveLogout(new URLSearchParams(window.location.search).get('reason') === 'inactivity');
  }, []);
  return (
    <Box
      minHeight="80vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
      px={2}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 900,
          p: 4,
          borderRadius: 3,
        }}
      >
        {inactiveLogout && <Alert severity="info" sx={{ mb: 2 }}>Sesja została zakończona z powodu bezczynności. Zaloguj się ponownie, aby kontynuować.</Alert>}
        <SignIn />
      </Paper>
    </Box>
  );
};

export default Login;
