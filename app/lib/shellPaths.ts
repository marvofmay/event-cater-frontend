import { isPublicMarketingPath } from "./publicMarketing";

/** Auth pages that should not show the logged-out "Login" chrome link. */
export function isBareAuthPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/")
  );
}

/** Pages that skip the heavy authenticated app shell (breadcrumbs / paper). */
export function isMinimalShellPath(pathname: string | null): boolean {
  return isPublicMarketingPath(pathname) || isBareAuthPath(pathname);
}
