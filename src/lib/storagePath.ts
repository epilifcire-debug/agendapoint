export const IMAGES_BUCKET = "avatars";

/**
 * Stored image values can be either a storage object path ("<uid>/avatar-123.jpg")
 * or a legacy absolute URL (older rows kept long-lived signed URLs).
 * This normalizes both into { path, url }.
 */
export function resolveStoredImage(value?: string | null): { path: string | null; url: string | null } {
  const v = (value ?? "").trim();
  if (!v) return { path: null, url: null };
  if (!/^https?:\/\//i.test(v)) return { path: v.replace(/^\/+/, ""), url: null };

  const m = v.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/i);
  if (m && m[1] === IMAGES_BUCKET && m[2]) {
    return { path: decodeURIComponent(m[2].split("?")[0]!), url: null };
  }
  return { path: null, url: v };
}
