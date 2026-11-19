# Roadmap

- [x] Auditar funcionamento real, dados, integrações e informações institucionais
- [x] Atualizar integralmente Termos e Política de Privacidade
- [x] Atualizar consentimento de cadastro/login e aviso pré-OAuth
- [x] Registrar concordância da conexão Google com versão, data, finalidade e ação
- [x] Aplicar assinatura EFCSYS conforme configuração existente
- [x] Validar rotas públicas, links, desktop/mobile e estados existentes da integração
- [ ] Validar conclusão real de reautorização e desconexão — depende de autorização Google e revogaria a conexão ativa
- [ ] Preencher dados institucionais — depende de razão social/nome, CPF/CNPJ se aplicável, município/UF e e-mails @efcsys.com confirmados
## Reformulação administrativa de artistas
- [x] Unificar eventos manuais e Google na Agenda de Artistas e nos links compartilhados, com escopo por proprietário e atualização após edições manuais
  - Agenda Master validada com os dois eventos manuais publicados existentes, filtros de artista/cidade/estado/status, ordem cronológica, páginas públicas e link compartilhado ativo; sem eventos Google ou manuais ocultos disponíveis para validar essas variantes ao vivo. Isolamento entre administradores continua dependente de segunda conta administrativa.
- [x] Migrar artistas para perfis gerenciados sem exigir login, vinculados ao Master
- [x] Manter dois níveis no acesso aos artistas: Master global e Admin isolado por ownership (incluindo agendas antigas)
- [x] Centralizar cadastro, edição, mídia, contatos, redes, agenda e publicação em Artistas
- [x] Criar páginas públicas /artistas/{slug} e /artistas/{slug}/eventos/{slug-evento}
- [x] Implementar eventos internos, compartilhamento de agenda e metadados sociais individuais
- [x] Preservar Google Calendar como integração opcional
- [x] Implementar gestão de contas administrativas pelo Master (convidar, ativar, bloquear, excluir com transferência dos artistas)
- [x] Acrescentar definição de senha para convidados e verificar bloqueio nas funções administrativas do servidor
- [ ] Validar rotas públicas, isolamento e fluxos administrativos
  - Master autenticado, páginas públicas e tela de convite sem sessão validados; conta legada de artista impedida de abrir a gestão Artistas após o carregamento. Cadastro, edição, upload, aceite real de convite e isolamento entre dois administradores ainda precisam de validação sem alterar dados reais.
  - Bloqueio: não há atualmente uma conta de Administrador comum para verificar o isolamento entre dois administradores; convidar uma conta de teste enviaria um e-mail real.
  - Confirmar em conta de teste que o bloqueio interrompe também o acesso direto aos dados enquanto um token anterior ainda é válido.
