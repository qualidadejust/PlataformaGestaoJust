import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const api = {
  async get<T>(url: string): Promise<T> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`GET ${url} falhou (${r.status})`);
    return r.json();
  },
  async post<T>(url: string, body: unknown): Promise<T> {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const msg = await r.json().catch(() => ({}));
      throw new Error((msg as any).error ?? `POST ${url} falhou (${r.status})`);
    }
    return r.json();
  },
};
