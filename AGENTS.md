# Agenda Point do Ingresso — regras do projeto

- Padrão global: repositório `epilifcire-debug/efcsys-skills` (EFCsys.md → skills/efcsys-standard + skills específicas).
- Projeto fora do Lovable: não reintroduzir `@lovable.dev/*`, gateway de conectores ou storage de preview.
- Design: segue o design system "Point do Ingresso" (artefato no Claude). Tokens em `src/styles.css`; componentes em `src/components/brand.tsx` (Ingresso, Status, PageHeader, EmptyState, SummaryRows, IconButton, BrandMark, EfcsysSignature, ThemeToggle) e `EventDrawer.tsx`. O Ingresso é o único elemento com personalidade forte; sem degradês, bolhas, glassmorphism ou ColorBends neste produto. Tema claro por padrão.
- Tipografia: Big Shoulders Display (datas, nomes, títulos — pesos 600/700) + Onest (interface — 400/500/600), self-hosted via @fontsource. Corpo 16px, secundário 14px, meta 12px.
- Acesso: Master global, Admin isolado por ownership — validar sempre no servidor/RLS.
- Google Calendar: OAuth direto (`src/server/googleOAuth.server.ts`), tokens cifrados.
- Integrações de dados antigos: eventos manuais são a fonte de verdade; Google é opcional.
- Operações de contas exclusivas do Master ficam em server functions autenticadas; ao excluir um administrador, transferir os artistas ao Master antes.
