export type Row = Record<string, any>;
export const money = (cents: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    cents / 100,
  );
export const labId = () => localStorage.getItem("qa-lab-id") ?? "";
export const headers = () => ({
  "Content-Type": "application/json",
  "X-Lab-Id": labId(),
  Authorization: "Bearer " + (sessionStorage.getItem("qa-token") ?? ""),
});
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
  extra: Record<string, string> = {},
): Promise<any> {
  const res = await fetch("/api" + path, {
    method,
    headers: { ...headers(), ...extra },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "HTTP " + res.status);
  return data;
}
export async function ensureLab() {
  if (!labId()) {
    const r = await fetch("/api/labs", { method: "POST" });
    if (!r.ok) throw new Error("No se pudo crear el laboratorio.");
    localStorage.setItem("qa-lab-id", (await r.json()).labId);
  }
}
export const idem = () => ({ "Idempotency-Key": crypto.randomUUID() });
export async function download(path: string, name: string) {
  const r = await fetch("/api" + path, { headers: headers() });
  if (!r.ok) throw new Error((await r.json()).error.message);
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
