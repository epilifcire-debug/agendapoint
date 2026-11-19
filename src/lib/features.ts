/**
 * Integração com Google (login + Google Calendar) é opcional.
 * Fica desligada até VITE_GOOGLE_ENABLED=true no build e as credenciais GOOGLE_* no servidor.
 * Sem ela, os shows são cadastrados manualmente pelos administradores.
 */
export const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_ENABLED === "true";
