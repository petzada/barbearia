export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "visitante";
  return fullName.trim().split(/\s+/)[0] ?? "visitante";
}

export function getInitials(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
