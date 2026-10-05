export type User = {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  avatarUrl?: string | null;
  role: "OWNER" | "CASHIER";
  isActive?: boolean;
  createdAt?: string;
};

export async function api(path: string, options: RequestInit = {}, token?: string) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) throw new Error(result?.error ?? "Request failed");
  return result;
}

export async function uploadAvatar(token: string, file: File, userId?: string) {
  const data = new FormData();
  data.append("image", file);
  if (userId) data.append("userId", userId);
  const response = await fetch("/api/uploads/avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: data,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "Could not upload photo");
  return result as User;
}
