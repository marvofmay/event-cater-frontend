/** Public marketing pages that should skip the authenticated app chrome. */
export function isPublicMarketingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/" ||
    pathname === "/polityka-prywatnosci" ||
    pathname === "/trial" ||
    pathname === "/oplata"
  );
}
