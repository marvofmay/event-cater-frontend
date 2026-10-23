"use client";

import { Box, Paper } from "@mui/material";
import SignIn from "../components/user/login/SignIn";

const Login: React.FC = () => {
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
        <SignIn />
      </Paper>
    </Box>
  );
};

export default Login;
