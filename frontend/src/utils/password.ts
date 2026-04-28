export function isStrongPassword(password: string): boolean {
  const normalized = password.trim();

  return (
    normalized.length >= 8 &&
    /[A-Z]/.test(normalized) &&
    /[a-z]/.test(normalized) &&
    /\d/.test(normalized) &&
    /[^A-Za-z0-9]/.test(normalized)
  );
}


export const PASSWORD_POLICY_HINT =
  "Use 8+ caracteres com letra maiuscula, minuscula, numero e simbolo.";
