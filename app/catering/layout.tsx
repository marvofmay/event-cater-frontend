"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useUser } from "@/app/context/userContext";
const sections = [
  ["events", "Wydarzenia", "events.list"],
  ["venues", "Miejsca obsługi", "venues.list"],
  ["equipment", "Sprzęt", "equipment.list"],
  ["supplies", "Produkty i materiały", "consumables.list"],
  ["templates", "Szablony kompletacji", "preparation_templates.list"],
  ["kitchen", "Kuchnia", "orders.list"],
];
export default function CateringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasPermission } = useUser();
  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1600, mx: "auto" }}>
      <Typography variant="h4" component="h1" mb={1}>
        Obsługa cateringu
      </Typography>
      <Typography color="text.secondary" mb={2}>
        Przyjęcia i wydarzenia — wyjazdowo lub w bazie firmy
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" mb={3}>
        {sections
          .filter((s) => hasPermission(s[2]))
          .map(([path, label]) => (
            <Button
              key={path}
              component={Link}
              href={"/catering/" + path}
              variant={
                pathname.startsWith("/catering/" + path)
                  ? "contained"
                  : "outlined"
              }
            >
              {label}
            </Button>
          ))}
      </Stack>
      {children}
    </Box>
  );
}
