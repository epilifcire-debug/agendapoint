# Agenda Point do Ingresso

Plataforma de gestão e divulgação de agendas de artistas (Point do Ingresso), fora do Lovable.
**Stack:** TanStack Start (React 19, SSR) · Tailwind 4 · Supabase · Nitro (Node) · Docker · PWA instalável.
Padrão visual: design system "Point do Ingresso" (efcsys-skills `design-direction`) — Big Shoulders Display + Onest, cores do logo, o ingresso como elemento principal, tema claro/escuro.

## Rodar localmente

```bash
cp .env.example .env   # preencha
npm install
npm run dev            # http://localhost:3000
```

## Produção (Shard Cloud — Aplicação com Dockerfile)

1. Crie a aplicação apontando para este repositório (`Dockerfile` na raiz, porta **80**).
2. Variáveis de **build**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (e `VITE_GOOGLE_ENABLED=true` só quando for ligar o Google).
3. Variáveis de **execução**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `PORT`. As do Google são opcionais.
4. Domínio: `agenda.efcsys.com` → defina `APP_URL=https://agenda.efcsys.com`.

Teste local da imagem:
```bash
docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... -t agendapoint .
docker run --env-file .env -p 8080:80 agendapoint
```

## Supabase (projeto novo)

O app no Lovable usava o Lovable Cloud. Para sair dele:

1. Crie um projeto em supabase.com (região São Paulo).
2. SQL Editor → rode, nesta ordem: `supabase/setup/001_schema_parte1.sql`, depois `002_schema_parte2.sql`.
3. Authentication → URL Configuration: **Site URL** `https://agenda.efcsys.com`; **Redirect URLs** `https://agenda.efcsys.com/**` e `http://localhost:3000/**`.
4. Login por **e-mail e senha** já vem ativo (Authentication → Providers → Email). O Google fica para depois.
5. Crie sua conta (login no app ou Authentication → Users) e rode `003_primeiro_master.sql` com seu e-mail.
6. Settings → API: copie URL, publishable key e secret (service role) para o `.env`.
7. **Dados antigos**: exporte as tabelas no Lovable (Cloud → Database → exportar CSV) e importe na mesma ordem: `profiles` → `user_roles` → `managed_artists` → `managed_artist_events` → `managed_artist_media` → `agenda_shares` / `admin_agenda_access`. Imagens do bucket `avatars` precisam ser reenviadas (mesmo caminho).

## Google Cloud (OPCIONAL — login com Google + Google Calendar)

Desligado por padrão: o app funciona só com o cadastro manual de shows. Para ligar, defina `VITE_GOOGLE_ENABLED=true` (build e execução), preencha as variáveis `GOOGLE_*` e `APP_USER_CONNECTION_KEY_SECRET` e ative o provedor Google no Supabase.

Um único cliente OAuth "Aplicativo da Web" atende os dois usos:

- **URIs de redirecionamento autorizados**
  - `https://SEU-PROJETO.supabase.co/auth/v1/callback` (login com Google)
  - `https://agenda.efcsys.com/oauth/google/return` (Google Calendar)
  - `http://localhost:3000/oauth/google/return` (dev)
- Escopo do Calendar: `https://www.googleapis.com/auth/calendar.events`.
- Coloque Client ID/Secret em `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.
- Gere `APP_USER_CONNECTION_KEY_SECRET` (32 bytes base64). Os refresh tokens ficam cifrados (AES-256-GCM) em `app_user_connections`.

> Conexões do Calendar feitas pelo gateway do Lovable não funcionam aqui: o app avisa "precisa reconectar" e o administrador conecta de novo em **Configurações**.

## PWA

`public/manifest.webmanifest`, ícones circulares em `public/icons/`, `public/sw.js` (cache só de assets versionados e ícones; nunca de server functions/dados) e `public/offline.html`. Nova versão → aviso "Atualizar" (sem reload forçado).

---
by: efcsys — Desenvolvido por EFCsys • Todos os direitos reservados.
