/** Mirrors backend PasswordPolicy (8–64 chars, upper/lower/digit/special, match). */
export function passwordPolicyErrors(
  password: string,
  confirmation: string,
): string[] {
  const errors: string[] = [];
  const len = [...password].length;
  const byteLen = new TextEncoder().encode(password).length;
  if (len < 8 || len > 64 || byteLen > 72) {
    errors.push(
      "Hasło musi mieć od 8 do 64 znaków i nie więcej niż 72 bajty.",
    );
  }
  if (!/\p{Lu}/u.test(password)) {
    errors.push("Hasło musi zawierać dużą literę.");
  }
  if (!/\p{Ll}/u.test(password)) {
    errors.push("Hasło musi zawierać małą literę.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Hasło musi zawierać cyfrę.");
  }
  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    errors.push("Hasło musi zawierać znak specjalny.");
  }
  if (/[\x00-\x1F\x7F]/.test(password)) {
    errors.push("Hasło nie może zawierać znaków sterujących.");
  }
  if (password !== confirmation) {
    errors.push("Podane hasła muszą być identyczne.");
  }
  return errors;
}
