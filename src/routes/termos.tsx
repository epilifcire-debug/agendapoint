import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/termos")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Termos de Serviço — Agenda Point do Ingresso" },
      { name: "description", content: "Regras de uso da Agenda Point do Ingresso: painel interno de gerenciamento mantido pela Point do Ingresso e páginas públicas de artistas." },
      { property: "og:title", content: "Termos de Serviço — Agenda Point do Ingresso" },
      { property: "og:description", content: "Conheça as regras de uso da Agenda Point do Ingresso." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://agenda.efcsys.com/termos" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://agenda.efcsys.com/termos" }],
  }),
});

const sections: LegalSection[] = [
  {
    id: "identificacao",
    title: "Identificação e aceitação",
    content: <>
      <p>A <strong>Agenda Point do Ingresso</strong> é uma plataforma de gerenciamento das agendas de artistas da empresa, desenvolvida e mantida pela <strong>EFCSYS</strong>. O painel de administração é de uso interno da empresa, destinado ao controle e gerenciamento dos eventos dos artistas; a única área aberta ao público são as páginas públicas dos artistas e seus eventos.</p>
      <p>Ao criar uma conta, o usuário declara que leu e aceitou estes Termos e a Política de Privacidade. A razão social da responsável é <strong>Point do Ingresso</strong>; o CNPJ, o endereço e demais dados empresariais serão incluídos neste documento quando confirmados, sem alteração das obrigações aqui assumidas.</p>
    </>,
  },
  {
    id: "servico",
    title: "Descrição do serviço",
    content: <>
      <p>Artistas, bandas, DJs, humoristas, produtores e outros profissionais criam e administram uma página pública com nome artístico, biografia, imagens, cidade, gênero, contatos profissionais, redes sociais e agenda de shows.</p>
      <p>O acesso ao painel é interno e restrito a administradores autorizados pela Point do Ingresso. Através dele, a empresa cria e gerencia os perfis dos artistas, cadastra e acompanha a agenda de apresentações, conecta o Google Calendar quando necessário, compartilha agendas por link e, quando disponível na interface, por QR Code. Visitantes podem consultar as páginas públicas dos artistas e dos eventos sem criar conta.</p>
    </>,
  },
  {
    id: "cadastro",
    title: "Cadastro, elegibilidade e segurança",
    content: <>
      <p>O cadastro exige informações verdadeiras e atualizadas. O usuário deve ter pelo menos 18 anos ou atuar com autorização e representação válida de seu responsável legal.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>O usuário é responsável por proteger sua senha e não compartilhar credenciais.</li>
        <li>São proibidos perfis falsos, duplicados para abuso ou que personifiquem terceiros.</li>
        <li>Cadastros podem depender de aprovação e verificações de segurança.</li>
        <li>Suspeitas de acesso indevido devem ser comunicadas imediatamente pelo canal de contato.</li>
      </ul>
    </>,
  },
  {
    id: "dados-publicos",
    title: "Dados públicos e responsabilidade do artista",
    content: <>
      <p>Conforme o preenchimento do perfil, podem ficar públicos: nome artístico, fotografia, biografia, cidade, gênero musical, redes sociais, contato profissional e informações dos shows, incluindo título, data, horário e local.</p>
      <p>O artista é responsável pela legitimidade, exatidão e atualização dessas informações e pelas autorizações necessárias sobre imagem, marca, obras e demais conteúdos publicados.</p>
    </>,
  },
  {
    id: "google-calendar",
    title: "Integração com o Google Calendar",
    content: <>
      <p>A conexão é opcional e ocorre mediante autorização explícita do usuário. Atualmente, a integração usa o calendário principal e solicita permissão para listar, criar, editar e excluir eventos, exclusivamente para organizar e divulgar a agenda.</p>
      <p>Eventos sincronizados podem ser exibidos publicamente. Por isso, o usuário deve manter nesse calendário apenas os eventos que pretende tratar como shows na plataforma. A Agenda Point do Ingresso não autoriza administradores a acessar calendários particulares de outros usuários.</p>
      <p>A integração pode ser desconectada nas configurações. A revogação interrompe novos acessos e sincronizações; a confirmação de desconexão só ocorre após a revogação remota ser concluída.</p>
    </>,
  },
  {
    id: "uso-permitido",
    title: "Uso permitido e proibições",
    content: <>
      <p>A plataforma deve ser usada de forma lícita, respeitosa e compatível com a divulgação artística. É proibido:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>publicar eventos falsos, fraudes, spam, conteúdo ilegal, discriminatório ou ofensivo;</li>
        <li>violar direitos de imagem, marca, autoria, privacidade ou outros direitos de terceiros;</li>
        <li>personificar pessoas, burlar autenticação ou tentar acessar contas e dados sem autorização;</li>
        <li>realizar coleta automatizada não autorizada, sobrecarregar ou interferir no serviço;</li>
        <li>usar a plataforma para phishing, malware ou qualquer prática abusiva.</li>
      </ul>
    </>,
  },
  {
    id: "propriedade",
    title: "Propriedade intelectual",
    content: <>
      <p>O usuário mantém a propriedade de seu conteúdo e concede à plataforma licença limitada, não exclusiva e necessária para armazenar, processar e exibir esse conteúdo enquanto a conta ou a publicação estiver ativa.</p>
      <p>A licença termina com a exclusão, ressalvados backups temporários, registros de segurança e obrigações legais. Marca, identidade visual, código, textos institucionais e demais elementos próprios da plataforma pertencem aos seus responsáveis ou licenciantes.</p>
    </>,
  },
  {
    id: "moderacao",
    title: "Moderação e proteção do serviço",
    content: <>
      <p>A Point do Ingresso poderá aprovar ou recusar cadastros, suspender páginas, remover conteúdo denunciado, arquivar contas inativas, bloquear riscos e preservar registros quando necessário à segurança, ao cumprimento legal ou à defesa de direitos.</p>
      <p>Sempre que possível e permitido, o usuário será informado sobre medidas relevantes e poderá entrar em contato para esclarecimentos.</p>
    </>,
  },
  {
    id: "disponibilidade",
    title: "Disponibilidade e serviços externos",
    content: <>
      <p>Não há garantia de funcionamento ininterrupto. Podem ocorrer manutenções, falhas de internet e indisponibilidade de fornecedores de calendário, autenticação, hospedagem, banco de dados e armazenamento, incluindo Google, Supabase e Shard Cloud.</p>
      <p>A plataforma poderá alterar recursos para manter segurança, compatibilidade e qualidade, procurando preservar as funções essenciais.</p>
    </>,
  },
  {
    id: "precos",
    title: "Gratuidade e planos futuros",
    content: <p>Os recursos atualmente oferecidos como gratuitos não geram cobrança. Eventuais planos pagos futuros serão apresentados previamente, com preço, condições e aceite específico. Nenhuma cobrança será aplicada retroativamente ou sem informação e aceitação do usuário.</p>,
  },
  {
    id: "cancelamento",
    title: "Cancelamento, desconexão e exclusão",
    content: <>
      <p>O usuário pode desconectar o Google Calendar nas configurações e solicitar a exclusão da conta pelo canal de contato. A página pública deixa de ser disponibilizada após a exclusão operacional da conta.</p>
      <p>Credenciais da integração são revogadas e removidas após a desconexão concluída. Alguns registros podem ser preservados pelo prazo legal e operacional aplicável para segurança, prevenção a fraude, backups temporários e exercício de direitos.</p>
    </>,
  },
  {
    id: "responsabilidade",
    title: "Limitação de responsabilidade",
    content: <>
      <p>O artista responde pelos dados e eventos que cadastra ou sincroniza. A plataforma não garante realização, cancelamento, alteração, qualidade ou segurança de shows divulgados. Visitantes devem confirmar detalhes nos canais oficiais do artista.</p>
      <p>Na medida permitida por lei, a Point do Ingresso não responde por falhas causadas por terceiros, internet, Google ou uso indevido pelo usuário. Nada nestes Termos exclui direitos assegurados pela legislação brasileira.</p>
    </>,
  },
  {
    id: "alteracoes",
    title: "Alterações dos Termos",
    content: <p>Este documento poderá ser atualizado para refletir mudanças legais, técnicas ou do serviço. Mudanças relevantes serão comunicadas por meio adequado. Quando afetarem substancialmente direitos ou o tratamento de dados, poderá ser solicitada nova concordância antes da continuidade do uso.</p>,
  },
  {
    id: "lei-contato",
    title: "Lei aplicável e contato",
    content: <>
      <p>Aplicam-se as leis da República Federativa do Brasil. Eventuais controvérsias serão tratadas no foro competente conforme a legislação, preservado o direito do consumidor quando aplicável.</p>
      <p>Para suporte, privacidade, denúncias ou questões de direitos autorais e de imagem, escreva para <a className="font-semibold text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </>,
  },
];

function TermsPage() {
  return <LegalPage title="Termos de Serviço" intro="Leia as regras aplicáveis ao uso da Agenda Point do Ingresso: painel interno de gerenciamento da empresa, páginas públicas dos artistas e integração opcional com o Google Calendar." sections={sections} />;
}
