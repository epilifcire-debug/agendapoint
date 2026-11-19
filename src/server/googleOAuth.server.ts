/**
 * Integração direta com o Google Calendar (OAuth 2.0, sem gateway do Lovable).
 * Server-only: lê segredos e guarda o refresh token cifrado em app_user_connections.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { decryptConnectionKey, encryptConnectionKey } from "./connectionKeyCrypto";
import {
  deleteConnectionKeyForUser,
  getConnectionKeyForUser,
  saveConnectionKeyForUser,
} from "./appUserConnections.server";

export const GOOGLE_CONNECTOR_ID = "google_calendar";
export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API_BASE = "https://www.googleapis.com";
const STATE_TTL_MS = 10 * 60 * 1000;

type StoredGoogleConnection = { v: 2; refresh_token: string; scope?: string; connected_at: string };
export type GoogleConnectionStatus = "connected" | "legacy" | "disconnected";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada no servidor.`);
  return value;
}

/** Google só funciona com as três variáveis configuradas; sem elas o app ignora a integração. */
export function googleEnabled(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.APP_USER_CONNECTION_KEY_SECRET);
}

export function googleRedirectUri(fallbackOrigin?: string): string {
  const origin = (process.env.APP_URL || fallbackOrigin || "").replace(/\/+$/, "");
  if (!origin) throw new Error("APP_URL não configurada no servidor.");
  return `${origin}/oauth/google/return`;
}

const b64url = (buf: Buffer) => buf.toString("base64url");
function sign(payload: string): string {
  return b64url(createHmac("sha256", env("APP_USER_CONNECTION_KEY_SECRET")).update(payload).digest());
}

export function createOAuthState(userId: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ u: userId, e: Date.now() + STATE_TTL_MS, n: b64url(randomBytes(12)) })));
  return `${payload}.${sign(payload)}`;
}

export function verifyOAuthState(state: string, userId: string): void {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Estado OAuth inválido.");
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new Error("Estado OAuth inválido.");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u: string; e: number };
  if (data.u !== userId) throw new Error("A autorização pertence a outra conta.");
  if (Date.now() > data.e) throw new Error("A autorização expirou. Tente novamente.");
}

export function buildGoogleAuthorizationUrl(userId: string, fallbackOrigin?: string): string {
  if (!googleEnabled()) throw new Error("A integração com o Google não está ativada neste servidor.");
  const params = new URLSearchParams({
    client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
    redirect_uri: googleRedirectUri(fallbackOrigin),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: createOAuthState(userId),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(userId: string, code: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(`Google recusou a autorização (${res.status}): ${body.error_description ?? body.error ?? ""}`);
  if (!body.refresh_token) {
    throw new Error("O Google não retornou acesso offline. Remova o app em myaccount.google.com/permissions e conecte novamente.");
  }
  const stored: StoredGoogleConnection = { v: 2, refresh_token: body.refresh_token, scope: body.scope, connected_at: new Date().toISOString() };
  await saveConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID, JSON.stringify(stored));
  if (body.access_token) tokenCache.set(userId, { token: body.access_token, exp: Date.now() + (Number(body.expires_in ?? 3600) - 60) * 1000 });
}

async function readStored(userId: string): Promise<StoredGoogleConnection | "legacy" | null> {
  const raw = await getConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredGoogleConnection;
    if (parsed?.v === 2 && parsed.refresh_token) return parsed;
  } catch {
    /* chave antiga do gateway Lovable */
  }
  return "legacy";
}

export async function googleConnectionStatus(userId: string): Promise<GoogleConnectionStatus> {
  if (!googleEnabled()) return "disconnected";
  const stored = await readStored(userId);
  return stored === null ? "disconnected" : stored === "legacy" ? "legacy" : "connected";
}

const tokenCache = new Map<string, { token: string; exp: number }>();

async function accessTokenFor(userId: string): Promise<string | null> {
  const cached = tokenCache.get(userId);
  if (cached && cached.exp > Date.now()) return cached.token;
  const stored = await readStored(userId);
  if (!stored || stored === "legacy") return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: stored.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    // Acesso revogado pelo usuário no Google: remove a conexão para exigir nova autorização.
    if (body.error === "invalid_grant") await deleteConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
    return null;
  }
  tokenCache.set(userId, { token: body.access_token, exp: Date.now() + (Number(body.expires_in ?? 3600) - 60) * 1000 });
  return body.access_token as string;
}

/** Chama a API do Google como o usuário. Retorna null quando não há conexão válida. */
export async function googleApiFetch(userId: string, path: string, init?: RequestInit): Promise<Response | null> {
  if (!googleEnabled()) return null;
  const token = await accessTokenFor(userId);
  if (!token) return null;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers });
}

export async function disconnectGoogle(userId: string): Promise<void> {
  const stored = await readStored(userId);
  if (stored && stored !== "legacy") {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(stored.refresh_token)}`, { method: "POST" }).catch(() => undefined);
  }
  tokenCache.delete(userId);
  await deleteConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
}

export { encryptConnectionKey, decryptConnectionKey };
