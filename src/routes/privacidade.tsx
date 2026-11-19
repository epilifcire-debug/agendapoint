import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/privacidade")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Agenda Point do Ingresso" },
      { name: "description", content: "Entenda como a Agenda Point do Ingresso trata dados pessoais e informações do Google Calendar." },
      { property: "og:title", content: "Política de Privacidade — Agenda Point do Ingresso" },
      { property: "og:description", content: "Como tratamos dados pessoais e informações do Google Calendar." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://agenda.efcsys.com/privacidade" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://agenda.efcsys.com/privacidade" }],
  }),
});

const sections: LegalSection[] = [
  {
    id: "controlador",
    title: "Quem somos e quem controla os dados",
    content: <>
      <p>A <strong>Agenda Point do Ingresso</strong>, desenvolvida e mantida pela <strong>EFCSYS</strong>, é uma plataforma de gerenciamento das agendas dos artistas da empresa. O painel é de uso interno da empresa; as páginas públicas dos artistas e seus eventos são a única área aberta ao público.</p>
      <p>A razão social do controlador é <strong>Point do Ingresso</strong>; o CNPJ, o endereço e demais dados empresariais serão publicados quando confirmados. Até lá, solicitações sobre privacidade e LGPD devem ser enviadas para <a className="font-semibold text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </>,
  },
  {
    id: "dados-coletados",
    title: "Dados que tratamos",
    content: <>
      <h3 className="font-bold">Cadastro e perfil</h3>
      <p>Nome artístico, e-mail, telefone, WhatsApp quando informado, cidade, gênero musical, biografia, endereço público do perfil, avatar, imagem de capa e links de redes sociais.</p>
      <h3 className="font-bold">Conta e Google Calendar</h3>
      <p>Credencial de conexão e identificadores necessários à autorização. No calendário principal, a integração pode tratar título, descrição, data, horário, duração, local, identificador do evento e informações de criação, edição ou cancelamento.</p>
      <h3 className="font-bold">Dados técnicos</h3>
      <p>Fornecedores de autenticação, hospedagem e segurança podem registrar endereço IP, navegador, dispositivo, sistema operacional, data e hora de acesso, falhas, autenticações e eventos de segurança para operar e proteger o serviço.</p>
      <h3 className="font-bold">Visitantes</h3>
      <p>Visitantes acessam páginas públicas sem conta. O código atual não contém ferramenta de publicidade comportamental nem analytics publicitário. Registros técnicos essenciais de hospedagem e segurança podem existir.</p>
    </>,
  },
  {
    id: "finalidades-bases",
    title: "Finalidades e bases legais",
    content: <div className="overflow-x-auto">
      <table className="w-full min-w-[38rem] border-collapse text-left">
        <thead><tr className="border-b border-border"><th className="py-2 pr-4">Finalidade</th><th className="py-2">Base legal aplicável</th></tr></thead>
        <tbody className="divide-y divide-border">
          <tr><td className="py-3 pr-4">Criar a conta, o perfil e prestar as funções solicitadas</td><td className="py-3">Execução do contrato e procedimentos preliminares</td></tr>
          <tr><td className="py-3 pr-4">Conectar e sincronizar o Google Calendar</td><td className="py-3">Consentimento explícito e execução do serviço solicitado</td></tr>
          <tr><td className="py-3 pr-4">Exibir perfil e agenda ao público</td><td className="py-3">Execução do contrato e manifestação do usuário ao publicar</td></tr>
          <tr><td className="py-3 pr-4">Segurança, prevenção a fraude e melhoria operacional</td><td className="py-3">Legítimo interesse, proteção do crédito e prevenção à fraude, conforme o caso</td></tr>
          <tr><td className="py-3 pr-4">Atender autoridades e preservar provas</td><td className="py-3">Obrigação legal e exercício regular de direitos</td></tr>
        </tbody>
      </table>
    </div>,
  },
  {
    id: "google",
    title: "Dados das APIs do Google e Uso Limitado",
    content: <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p>O acesso ocorre somente após autorização explícita e é usado exclusivamente para listar, criar, editar e excluir eventos necessários à integração com a agenda pública. Atualmente, a conexão usa o calendário principal. Eventos sincronizados podem ser divulgados; portanto, o usuário deve usar a integração apenas para eventos que deseja tratar como shows públicos.</p>
      <p className="mt-3">Esses dados não são usados para publicidade, venda, criação de perfil comercial ou fornecimento a corretores de dados. Pessoas não acessam conteúdo privado, salvo quando o próprio usuário solicitar suporte, quando for necessário investigar segurança ou quando houver obrigação legal.</p>
      <p className="mt-3"><strong>Declaração de Uso Limitado:</strong> O uso e a transferência, pela Agenda Point do Ingresso, das informações recebidas das APIs do Google obedecerão à <a className="font-semibold text-primary underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.</p>
    </div>,
  },
  {
    id: "publicacao",
    title: "Exibição pública dos eventos",
    content: <>
      <p>Título, data, horário, cidade, estado e local dos eventos sincronizados podem aparecer na página pública do artista e em links de agenda compartilhados.</p>
      <p>Antes da conexão, a plataforma informa essa finalidade. Como ainda não existe seleção granular por evento dentro da integração, o usuário deve evitar manter no calendário principal conectado eventos particulares que não queira associar à agenda pública.</p>
    </>,
  },
  {
    id: "compartilhamento",
    title: "Compartilhamento e operadores",
    content: <>
      <p>Não vendemos dados pessoais. Dados podem ser tratados por fornecedores essenciais, conforme a função: Google, como provedor da conta e calendário; Supabase, para autenticação, banco de dados e armazenamento; Shard Cloud, para hospedagem da aplicação; e serviços técnicos de infraestrutura, segurança e entrega de comunicações quando utilizados.</p>
      <p>Administradores recebem somente os acessos previstos pelas regras da plataforma. O compartilhamento de agendas entre administradores é explícito e somente para leitura.</p>
    </>,
  },
  {
    id: "transferencia",
    title: "Transferência internacional",
    content: <p>Alguns fornecedores podem processar ou armazenar dados fora do Brasil. Nesses casos, buscamos usar fornecedores com medidas contratuais, técnicas e organizacionais compatíveis com a LGPD e com a proteção esperada para os dados tratados.</p>,
  },
  {
    id: "retencao",
    title: "Retenção, desconexão e exclusão",
    content: <>
      <p>Dados de conta permanecem durante a relação com o usuário. Após solicitação de exclusão, são removidos dentro do prazo legal e operacional aplicável, ressalvados backups temporários, prevenção a fraude, segurança e obrigações legais.</p>
      <p>Na desconexão do Google Calendar, a revogação remota é concluída antes da exclusão da credencial armazenada. Eventos já exibidos podem permanecer em caches temporários ou registros legitimamente preservados, mas não haverá nova sincronização.</p>
    </>,
  },
  {
    id: "seguranca",
    title: "Segurança",
    content: <p>Adotamos controles de autenticação, OAuth, isolamento de acesso por usuário, políticas de acesso no banco e no armazenamento, credenciais protegidas e registros técnicos. Nenhum sistema é totalmente imune; por isso, medidas são revistas conforme riscos e evolução do serviço.</p>,
  },
  {
    id: "cookies",
    title: "Cookies, armazenamento local e analytics",
    content: <>
      <p>A aplicação utiliza armazenamento local e recursos equivalentes estritamente necessários para manter a sessão, autenticação e preferências técnicas. A infraestrutura pode usar cookies essenciais de segurança e funcionamento.</p>
      <p>Não identificamos no código atual analytics publicitário ou cookies de publicidade. Se esse cenário mudar, esta Política e os controles de escolha serão atualizados antes do uso quando exigido.</p>
    </>,
  },
  {
    id: "direitos",
    title: "Direitos dos titulares",
    content: <>
      <p>Nos termos da LGPD, o titular pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio ou eliminação, portabilidade quando aplicável, informação sobre compartilhamentos, revogação do consentimento, oposição e revisão de decisões automatizadas, além de apresentar reclamação à ANPD.</p>
      <p>Pedidos devem ser enviados para <a className="font-semibold text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Poderemos pedir confirmação razoável de identidade para proteger a conta e responderemos dentro do prazo legal e operacional aplicável.</p>
    </>,
  },
  {
    id: "menores-incidentes",
    title: "Crianças, adolescentes e incidentes",
    content: <>
      <p>O serviço não é direcionado a crianças. Menores de 18 anos somente podem usar a plataforma com autorização e representação de responsável legal.</p>
      <p>Incidentes de segurança serão avaliados e, quando houver risco ou dano relevante e a legislação exigir, comunicados aos titulares e à Autoridade Nacional de Proteção de Dados.</p>
    </>,
  },
  {
    id: "alteracoes-contato",
    title: "Alterações e contato",
    content: <>
      <p>Esta Política poderá ser atualizada com indicação da versão e data. Mudanças relevantes serão comunicadas. Nova concordância poderá ser solicitada para finalidade incompatível ou mudança relevante no uso de dados do Google.</p>
      <p>Para acesso, correção, exclusão, revogação, dúvidas ou denúncias, escreva para <a className="font-semibold text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </>,
  },
];

function PrivacyPage() {
  return <LegalPage title="Política de Privacidade" intro="Esta Política explica quais dados pessoais tratamos, por que os utilizamos, com quem podem ser compartilhados e como exercer seus direitos." sections={sections} />;
}
