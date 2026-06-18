import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

async function handle<T>(r: Response, method: string, url: string): Promise<T> {
  if (r.status === 204) return undefined as T;
  if (!r.ok) {
    const msg = await r.json().catch(() => ({}));
    throw new Error((msg as any).error ?? `${method} ${url} falhou (${r.status})`);
  }
  return r.json();
}

export const api = {
  get: <T>(url: string) => fetch(url).then((r) => handle<T>(r, "GET", url)),
  post: <T>(url: string, body: unknown) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(
      (r) => handle<T>(r, "POST", url)
    ),
  put: <T>(url: string, body: unknown) =>
    fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(
      (r) => handle<T>(r, "PUT", url)
    ),
  del: (url: string) => fetch(url, { method: "DELETE" }).then((r) => handle<void>(r, "DELETE", url)),
};
