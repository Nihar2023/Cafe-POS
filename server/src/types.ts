export type Role = "OWNER" | "CASHIER";
export interface AuthUser { id: string; name: string; email: string; mobile?: string | null; avatarUrl?: string | null; role: Role; isActive?: boolean }
