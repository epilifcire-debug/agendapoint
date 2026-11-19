# Agenda Point do Ingresso — regras do projeto

- Padrão global: repositório `epilifcire-debug/efcsys-skills` (EFCsys.md → skills/efcsys-standard + skills específicas).
- Projeto fora do Lovable: não reintroduzir `@lovable.dev/*`, gateway de conectores ou storage de preview.
- Design: tokens em `src/styles.css`; componentes de marca em `src/components/brand.tsx` (BrandMark, PageHeader, StatCard, EmptyState, EfcsysSignature, ThemeToggle). ColorBends (`src/components/ColorBends.tsx`) só em hero/login, nunca em listas ou formulários.
- Tipografia: Outfit (títulos) + Plus Jakarta Sans (interface), self-hosted via @fontsource.
- Acesso: Master global, Admin isolado por ownership — validar sempre no servidor/RLS.
- Google Calendar: OAuth direto (`src/server/googleOAuth.server.ts`), tokens cifrados.
- Integrações de dados antigos: eventos manuais são a fonte de verdade; Google é opcional.
- Operações de contas exclusivas do Master ficam em server functions autenticadas; ao excluir um administrador, transferir os artistas ao Master antes.
