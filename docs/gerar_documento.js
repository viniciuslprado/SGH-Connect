// Gera docs/SGH_Connect_Documentacao_Arquitetural.docx (uso: npm run docs:word; depois abra no Word e exporte o PDF)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, Footer, Header, PageNumber,
  TableOfContents, LevelFormat,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const DIAG = path.join(ROOT, "docs/diagramas");
const OUT = path.join(ROOT, "docs/SGH_Connect_Documentacao_Arquitetural.docx");

const FONT = "Calibri";
const MONO = "Consolas";
const AZUL = "1F4E79";
const CW = 9026; // largura util A4 com margens de 1"

// ---------------------------------------------------------------- helpers
function runs(text, base = {}) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p) => {
    if (p.startsWith("**")) return new TextRun({ text: p.slice(2, -2), bold: true, ...base });
    if (p.startsWith("`")) return new TextRun({ text: p.slice(1, -1), font: MONO, size: 19, color: "7A2E0E", ...base });
    return new TextRun({ text: p, ...base });
  });
}
const P = (t, o = {}) => new Paragraph({ children: runs(t), spacing: { after: 120, line: 276 }, alignment: AlignmentType.JUSTIFIED, ...o });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: true });
const H1n = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t, lvl = 0) => new Paragraph({ children: runs(t), numbering: { reference: "bul", level: lvl }, spacing: { after: 60, line: 264 } });
const N = (t, ref = "num") => new Paragraph({ children: runs(t), numbering: { reference: ref, level: 0 }, spacing: { after: 60, line: 264 } });
const CAP = (t) => new Paragraph({ children: [new TextRun({ text: t, italics: true, size: 18, color: "555555" })], alignment: AlignmentType.CENTER, spacing: { after: 240 } });

function CODE(lines) {
  return lines.split("\n").map((l, i, arr) => new Paragraph({
    children: [new TextRun({ text: l.length ? l : " ", font: MONO, size: 17 })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F3F3F3" },
    spacing: { after: i === arr.length - 1 ? 160 : 0, line: 240 }, keepNext: i !== arr.length - 1, keepLines: true,
    indent: { left: 200, right: 200 },
  }));
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
function T(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (txt, w, head) => new TableCell({
    width: { size: w, type: WidthType.DXA }, borders,
    shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: AZUL } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: String(txt).split("\n").map((line) => new Paragraph({
      children: runs(line, head ? { bold: true, color: "FFFFFF", size: 19 } : { size: 19 }),
      spacing: { after: 20 },
    })),
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false)) })),
    ],
  });
}
const GAP = () => new Paragraph({ children: [], spacing: { after: 120 } });

function IMG(file, widthPx = 600) {
  const buf = fs.readFileSync(path.join(DIAG, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
      altText: { title: file, description: file, name: file } })],
  });
}

// ---------------------------------------------------------------- conteudo
const c = [];

// Capa
c.push(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 60 }, children: [new TextRun({ text: "Uni-FACEF — Centro Universitário Municipal de Franca", bold: true, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Departamento de Computação", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1400 }, children: [new TextRun({ text: "Arquitetura de Software — 6º semestre — Prof. Carlos Alberto Lucas", size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "SGH Connect", bold: true, size: 64, color: AZUL })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Sistema Integrado de Gestão Hospitalar", size: 32, color: AZUL })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1400 }, children: [new TextRun({ text: "Documento Arquitetural — coesão, acoplamento e conascência", italics: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Integrantes", bold: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Nome: ____________________________________   RA: __________", size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Nome: ____________________________________   RA: __________", size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1400 }, children: [new TextRun({ text: "Nome: ____________________________________   RA: __________", size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Franca — novembro de 2026", size: 22 })] }),
);

// Sumario
c.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 160 }, children: [new TextRun({ text: "Sumário", bold: true, size: 32, color: AZUL })] }));
c.push(new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-2" }));

// ---------------------------------------------------------------- 1
c.push(H1("1. Descrição do problema"));
c.push(H2("1.1 Contexto"));
c.push(P("Hospitais de pequeno e médio porte costumam operar com sistemas isolados ou planilhas para cadastro de pacientes, agenda médica, controle de leitos e faturamento. A mesma informação é digitada várias vezes, a ocupação de leitos não é conhecida em tempo real e o fechamento da conta do paciente depende de conferência manual entre setores. Cada setor resolve o próprio problema, mas o hospital não tem uma visão integrada do paciente."));
c.push(P("O **SGH Connect** é um sistema de informação web que integra esses processos: o paciente é cadastrado uma única vez, a consulta agendada vira atendimento, o atendimento pode gerar internação, e tudo o que acontece com o paciente alimenta automaticamente o faturamento, as notificações e os indicadores gerenciais."));
c.push(H2("1.2 Objetivos"));
[
  "Centralizar o cadastro de pacientes e do corpo clínico, eliminando redigitação.",
  "Controlar a agenda de consultas, impedindo conflitos de horário de profissionais.",
  "Registrar atendimentos (triagem, prontuário, prescrição) e internações com controle de leitos em tempo real.",
  "Gerar a conta hospitalar automaticamente a partir dos eventos clínicos.",
  "Oferecer indicadores (ocupação de leitos, produção por profissional, consultas por período).",
  "Servir como **objeto de estudo arquitetural**: cada decisão é guiada por coesão, acoplamento e conascência (Richards e Ford, 2020).",
].forEach((t) => c.push(B(t)));
c.push(H2("1.3 Escopo"));
c.push(T(["Dentro do escopo", "Fora do escopo (evolução futura)"], [
  ["Cadastro de pacientes, profissionais e usuários", "Integração TISS com operadoras de convênio"],
  ["Agendamento de consultas com verificação de conflito", "Farmácia, estoque e centro cirúrgico"],
  ["Atendimento ambulatorial e prontuário simplificado", "Assinatura digital de prontuário (ICP-Brasil)"],
  ["Internação, transferência e alta com mapa de leitos", "Aplicativo móvel para pacientes"],
  ["Conta hospitalar gerada por eventos", "Emissão de nota fiscal"],
  ["Notificações por e-mail (simuladas em ambiente de desenvolvimento)", "Telemedicina"],
  ["Relatórios gerenciais e controle de acesso por perfil", ""],
], [4513, 4513]));
c.push(GAP());
c.push(H2("1.4 Atores"));
c.push(T(["Ator", "Responsabilidades no sistema"], [
  ["Recepcionista", "Cadastra pacientes, agenda e cancela consultas"],
  ["Médico", "Realiza atendimentos, registra diagnóstico e prescrição, solicita internação"],
  ["Enfermeiro", "Realiza triagem e registra evolução de pacientes internados"],
  ["Gestor de leitos", "Interna, transfere e dá alta; acompanha o mapa de leitos"],
  ["Faturista", "Acompanha e fecha contas hospitalares"],
  ["Administrador", "Gerencia usuários e perfis; acessa todos os relatórios"],
], [2200, 6826]));
c.push(GAP());
c.push(H2("1.5 Requisitos funcionais"));
c.push(T(["ID", "Requisito", "Módulo"], [
  ["RF01", "Autenticar usuário e restringir funções por perfil (RBAC)", "Identidade e Acesso"],
  ["RF02", "Cadastrar, editar e pesquisar pacientes (CPF único e válido)", "Pacientes"],
  ["RF03", "Cadastrar profissionais com registro (CRM/COREN) e especialidade", "Corpo Clínico"],
  ["RF04", "Agendar consulta sem conflito de horário do profissional", "Agendamento"],
  ["RF05", "Cancelar consulta e notificar o paciente (remarcar = cancelar e agendar de novo)", "Agendamento + Notificações"],
  ["RF06", "Registrar triagem com classificação de risco", "Atendimento"],
  ["RF07", "Registrar prontuário, diagnóstico (CID) e prescrição", "Atendimento"],
  ["RF08", "Internar paciente em leito livre, transferir e registrar alta", "Internação e Leitos"],
  ["RF09", "Exibir mapa de leitos (livre, ocupado, em higienização, manutenção)", "Internação e Leitos"],
  ["RF10", "Gerar itens da conta automaticamente ao finalizar atendimento ou dar alta", "Faturamento"],
  ["RF11", "Fechar conta hospitalar e calcular total", "Faturamento"],
  ["RF12", "Emitir relatórios: ocupação, produção por profissional, consultas por período", "Relatórios"],
  ["RF13", "Registrar trilha de auditoria das ações relevantes, sem texto clínico", "Kernel (shared/auditoria)"],
], [900, 5626, 2500]));
c.push(GAP());
c.push(H2("1.6 Características arquiteturais priorizadas"));
c.push(P("Richards e Ford recomendam escolher poucas características arquiteturais (“-ilities”) e deixar que elas guiem o estilo, em vez de tentar maximizar todas. Para o SGH Connect, as prioridades são:"));
c.push(T(["Característica", "Por que importa no hospital", "Como a arquitetura responde"], [
  ["Manutenibilidade / modificabilidade", "Regras de convênio, faturamento e fluxos clínicos mudam com frequência", "Módulos por domínio, alta coesão, contratos estáveis entre módulos"],
  ["Testabilidade", "Erros de agenda, leito ou conta têm impacto direto no paciente", "Domínio sem dependência de framework; casos de uso testáveis com repositórios em memória"],
  ["Integridade de dados", "Um leito não pode ser ocupado por dois pacientes; uma conta não pode perder itens", "Transação local por caso de uso, travamento otimista, outbox transacional"],
  ["Segurança / privacidade (LGPD)", "Dados de saúde são dados pessoais sensíveis (art. 11 da LGPD)", "JWT, RBAC por perfil, auditoria de acesso ao prontuário"],
  ["Evolutividade", "Módulos como Notificações e Relatórios podem precisar escalar separadamente", "Comunicação por eventos permite extrair módulos para serviços sem reescrita"],
], [2300, 3363, 3363]));
c.push(GAP());
c.push(P("Características conscientemente **não priorizadas**: escalabilidade elástica extrema e implantação independente por equipe. Um hospital de médio porte tem carga previsível e uma única equipe de desenvolvimento — exatamente o cenário em que, segundo os autores, microsserviços trazem mais custo do que benefício."));

// ---------------------------------------------------------------- 2
c.push(H1("2. Estilo arquitetural e visão geral"));
c.push(H2("2.1 Decisão: monólito modular particionado por domínio"));
c.push(P("O SGH Connect adota um **monólito modular** (modular monolith). A aplicação é implantada como uma única unidade, mas internamente é dividida em **módulos de domínio** (particionamento por domínio, e não técnico). Cada módulo é organizado em **camadas internas** (api → application → domain ← infrastructure) e só expõe para os demais uma pasta `contracts/` com interfaces, DTOs e eventos."));
c.push(P("A tabela abaixo resume os estilos considerados, avaliados contra as características priorizadas na seção 1.6 (escala: ★ baixo a ★★★ alto)."));
c.push(T(["Critério", "Camadas tradicional (particionamento técnico)", "Monólito modular (escolhido)", "Microsserviços"], [
  ["Manutenibilidade", "★ — uma regra de negócio se espalha por controller, service e repository globais", "★★★ — a mudança fica dentro de um módulo", "★★★"],
  ["Testabilidade", "★★", "★★★", "★★ — testes de integração entre serviços são caros"],
  ["Integridade de dados", "★★★", "★★★ — transações locais no mesmo banco", "★ — exige sagas e consistência eventual em tudo"],
  ["Custo operacional", "★★★ (baixo custo)", "★★★ (baixo custo)", "★ — vários deploys, rede, observabilidade distribuída"],
  ["Evolutividade", "★", "★★ — módulos extraíveis", "★★★"],
  ["Adequação à equipe (trio, prazo curto)", "★★★", "★★★", "★"],
], [1900, 2500, 2400, 2226]));
c.push(GAP());
c.push(P("**Trade-off assumido:** abrimos mão da escalabilidade e da implantação independente por módulo (vantagens de microsserviços) em troca de simplicidade operacional, transações locais e menor custo de desenvolvimento. Para não perder a evolutividade, os módulos se comunicam **como se fossem serviços**: apenas por contratos e eventos, nunca acessando o banco ou as classes internas uns dos outros."));
c.push(H2("2.2 Quantum arquitetural"));
c.push(P("Richards e Ford definem o **quantum arquitetural** como um artefato implantável de forma independente, com alta coesão funcional e conascência síncrona. O SGH Connect tem **um único quantum**: um deploy da API, um banco de dados e um front-end. Essa escolha é coerente com as características priorizadas, pois todas as partes do hospital exigem o mesmo nível de disponibilidade e consistência. A seção 11 mostra como Notificações e Relatórios podem se tornar quanta separados no futuro, porque já dependem apenas de eventos assíncronos."));
c.push(H2("2.3 Tecnologias"));
c.push(P("A tecnologia não é critério de avaliação; foi escolhida por suportar bem a modularização:"));
c.push(T(["Camada", "Tecnologia", "Motivo arquitetural"], [
  ["Back-end", "Node.js + NestJS + TypeScript", "Sistema de módulos e injeção de dependências nativos; tipagem estática gera conascência de tipo verificada pelo compilador"],
  ["Persistência", "PostgreSQL + Prisma ORM", "Um schema por módulo (multiSchema), migrações versionadas"],
  ["Eventos", "EventEmitter do NestJS + tabela outbox", "Barramento in-process com entrega após commit"],
  ["Front-end", "React + Vite + TypeScript", "SPA organizada por módulo, consumindo apenas a API REST"],
  ["Qualidade", "Jest + Supertest (API), Vitest (web e shared), dependency-cruiser 17", "Testes unitários, e2e contra banco de teste e verificação automática das fronteiras entre módulos (fitness function)"],
  ["Segurança", "JWT (@nestjs/jwt) e bcryptjs", "bcryptjs: mesmo algoritmo do bcrypt, sem compilação nativa no Windows"],
  ["Execução local", "Docker Compose (PostgreSQL 16, porta 5433)", "Ambiente reproduzível com um comando; cria também o banco de testes sgh_test"],
], [1700, 2600, 4726]));

// ---------------------------------------------------------------- 3
c.push(H1("3. Diagrama da arquitetura"));
c.push(P("A arquitetura é representada com o **modelo C4** (contexto, contêineres e componentes), complementada por um diagrama da estrutura interna dos módulos e por um diagrama de sequência."));
c.push(H2("3.1 Nível 1 — Contexto"));
c.push(IMG("01_c4_contexto.png", 590));
c.push(CAP("Figura 1 — Atores e sistemas externos que interagem com o SGH Connect."));
c.push(H2("3.2 Nível 2 — Contêineres"));
c.push(IMG("02_c4_conteineres.png", 590));
c.push(CAP("Figura 2 — SPA, API (monólito modular), worker de eventos e banco de dados."));
c.push(H2("3.3 Nível 3 — Módulos e dependências"));
c.push(IMG("03_modulos_dependencias.png", 600));
c.push(CAP("Figura 3 — Os nove módulos da API. Setas contínuas: chamadas síncronas a contratos públicos. Setas tracejadas: eventos de domínio."));
c.push(P("Observe que **não existe nenhum ciclo** no grafo de dependências e que os módulos “de saída” (Faturamento, Notificações, Relatórios) não são chamados por ninguém: eles apenas reagem a eventos."));
c.push(H2("3.4 Estrutura interna de um módulo"));
c.push(IMG("04_camadas_modulo.png", 560));
c.push(CAP("Figura 4 — Camadas internas, exemplificadas pelo módulo de Internação."));
c.push(H2("3.5 Fluxo — finalizar atendimento"));
c.push(IMG("05_sequencia_finalizar_atendimento.png", 600));
c.push(CAP("Figura 5 — O módulo de Atendimento não conhece Faturamento nem Notificações; ele apenas publica um fato."));

// ---------------------------------------------------------------- 4
c.push(H1("4. Identificação dos módulos"));
c.push(P("Cada módulo corresponde a um **subdomínio do hospital** com vocabulário, atores e ritmo de mudança próprios. A tabela abaixo é a referência para a implementação."));
c.push(T(["Módulo", "Responsabilidade única", "Principais casos de uso", "Interface pública (contracts)"], [
  ["Identidade e Acesso", "Saber quem é o usuário e o que ele pode fazer", "Login, cadastrar usuário, atribuir perfil", "`@Perfis()`, `@Publico()`, `@UsuarioAtual()`, `UsuarioAutenticado` (os guards ficam na infraestrutura do módulo e são globais)"],
  ["Pacientes", "Manter o cadastro único do paciente", "Cadastrar, editar, pesquisar por CPF/nome", "`PacientesApi.buscarResumo(id)`, `buscarContato(id)`, `PacienteResumoDto`"],
  ["Corpo Clínico", "Manter profissionais, registros e especialidades", "Cadastrar profissional, ativar/inativar", "`CorpoClinicoApi.buscarProfissional(id)`"],
  ["Agendamento", "Garantir uma agenda sem conflitos", "Agendar, cancelar, remarcar, listar agenda", "Eventos `ConsultaAgendada`, `ConsultaCancelada`"],
  ["Atendimento", "Registrar o cuidado prestado no atendimento", "Triagem, registrar prontuário, prescrever, finalizar", "Evento `AtendimentoFinalizado`"],
  ["Internação e Leitos", "Controlar a ocupação de leitos e a permanência", "Internar, transferir, dar alta, mapa de leitos", "Eventos `PacienteInternado`, `AltaRegistrada`"],
  ["Faturamento", "Transformar fatos clínicos em conta hospitalar", "Abrir conta, lançar item (por evento), fechar conta", "— (só consome eventos)"],
  ["Notificações", "Comunicar o paciente", "Enviar confirmação, cancelamento e resumo", "— (só consome eventos)"],
  ["Relatórios", "Produzir indicadores de gestão", "Ocupação, produção, consultas por período", "— (projeções de leitura)"],
], [1700, 2300, 2700, 2326]));
c.push(GAP());
c.push(H2("4.1 Estrutura de pastas"));
c.push(P("A estrutura do repositório torna os módulos visíveis — a arquitetura pode ser lida na árvore de diretórios:"));
c.push(...CODE(`sgh-connect/
├── apps/
│   ├── api/src/
│   │   ├── modules/
│   │   │   ├── identidade/
│   │   │   ├── pacientes/
│   │   │   ├── corpo-clinico/
│   │   │   ├── agendamento/
│   │   │   ├── atendimento/
│   │   │   ├── internacao/
│   │   │   │   ├── api/  application/  domain/  infrastructure/
│   │   │   │   └── contracts/        # única pasta visível a outros módulos
│   │   │   ├── faturamento/
│   │   │   ├── notificacoes/
│   │   │   └── relatorios/
│   │   └── shared/                   # kernel: eventos, outbox, erros
│   └── web/src/modules/              # mesmas fronteiras no front-end
├── packages/shared/                  # enums e Cpf usados por api e web
├── docs/                             # este documento, ADRs e diagramas
└── .dependency-cruiser.cjs           # regras que impedem violar fronteiras`));

// ---------------------------------------------------------------- 5
c.push(H1("5. Análise de coesão"));
c.push(P("Coesão mede o quanto os elementos de um módulo pertencem juntos. Richards e Ford apresentam uma escala que vai da coesão **funcional** (a melhor: tudo o que o módulo contém é necessário para uma única função) até a **coincidental** (a pior: elementos agrupados apenas por estarem no mesmo arquivo). O objetivo do SGH Connect é que todo módulo tenha coesão funcional, e que nenhum tenha coesão lógica ou coincidental."));
c.push(H2("5.1 Critérios usados para separar responsabilidades"));
[
  "**Mesmo motivo para mudar:** elementos que mudam juntos ficam juntos (Princípio do Fechamento Comum). Ex.: `Leito` e `Internacao` mudam juntos quando muda a regra de ocupação, por isso estão no mesmo módulo.",
  "**Mesmo ator:** responsabilidades pedidas por atores diferentes ficam separadas. Agendamento atende a recepção; Atendimento atende médicos e enfermeiros.",
  "**Mesmo vocabulário:** dentro de um módulo, cada termo tem um único significado. “Paciente” no Faturamento é apenas um `pacienteId` + convênio; no módulo Pacientes é o cadastro completo.",
  "**Mesmo ciclo de vida dos dados:** uma consulta existe antes do atendimento; uma conta existe depois. Ciclos diferentes indicam módulos diferentes.",
].forEach((t) => c.push(B(t)));
c.push(H2("5.2 Separações justificadas"));
c.push(T(["Decisão", "Alternativa rejeitada", "Justificativa (coesão)"], [
  ["Agendamento separado de Atendimento", "Um único módulo “Consultas”", "Agenda é sobre tempo e recursos (horários, conflitos); atendimento é sobre conteúdo clínico. Mudam por motivos e atores diferentes. Juntos, teriam coesão apenas temporal."],
  ["Leitos dentro de Internação", "Módulo “Leitos” separado", "Ocupar leito e internar são a mesma operação de negócio. Separar criaria conascência de execução entre módulos (seção 7.6)."],
  ["Faturamento como módulo próprio", "Cada módulo calcula seu valor", "Regras de preço e convênio ficam em um único lugar; módulos clínicos não conhecem dinheiro."],
  ["Relatórios com projeções próprias", "Consultas SQL com JOIN em todas as tabelas", "Relatórios mantêm seus próprios dados de leitura, montados por eventos. Mudanças no esquema de outro módulo não quebram relatórios."],
  ["Identidade isolada", "Usuário com campos de médico", "Credenciais e perfis mudam por razões de segurança; dados profissionais mudam por razões clínicas. O vínculo é feito por `usuarioId` no Corpo Clínico."],
], [2300, 2200, 4526]));
c.push(GAP());
c.push(H2("5.3 Evidências de alta coesão"));
[
  "**Nenhum serviço “genérico”:** não existem classes como `HospitalService`, `Utils` ou `Helpers` com métodos de vários assuntos. Cada comando é uma classe com um único método `executar()` (ex.: `InternarPacienteUseCase`, `AgendarConsultaUseCase`). Operações apenas de leitura do mesmo módulo ficam agrupadas em uma classe de consulta (ex.: `ConsultarPacientesUseCase.pesquisar/obter`), pois mudam juntas e não alteram estado.",
  "**Regras no domínio:** a regra “leito só pode ser ocupado se estiver LIVRE” fica em `Leito.ocupar()`, e não espalhada em controllers.",
  "**Classes do domínio usam todos os seus atributos:** `Consulta` usa `inicio`, `fim` e `profissionalId` para detectar conflito; não carrega dados de prontuário ou de conta (baixa LCOM).",
  "**O front-end respeita as mesmas fronteiras:** `web/src/modules/agendamento` contém telas, hooks e chamadas HTTP apenas de agendamento.",
  "**Teste de coesão prático:** a pergunta “se a regra de convênio mudar, quais pastas serão alteradas?” tem uma única resposta: `modules/faturamento`.",
].forEach((t) => c.push(B(t)));
c.push(H2("5.4 Tipos de coesão presentes"));
c.push(T(["Módulo", "Tipo de coesão", "Observação"], [
  ["Pacientes, Corpo Clínico, Internação, Faturamento", "Funcional", "Todos os elementos contribuem para uma única responsabilidade"],
  ["Atendimento", "Funcional / sequencial", "Triagem → prontuário → prescrição → finalização formam uma sequência em que a saída de um passo alimenta o próximo"],
  ["Relatórios", "Comunicacional", "Elementos operam sobre os mesmos dados de leitura; aceitável para um módulo de consulta"],
  ["shared/ (kernel)", "Lógica — mantida pequena de propósito", "Contém apenas infraestrutura transversal (eventos, outbox, erros, `Cpf`). Regra: nada de negócio entra aqui."],
], [3000, 2000, 4026]));

// ---------------------------------------------------------------- 6
c.push(H1("6. Análise de acoplamento"));
c.push(P("Acoplamento mede o quanto um módulo depende de outros. Richards e Ford distinguem **acoplamento aferente** (Ca: quantos módulos dependem dele) e **eferente** (Ce: de quantos ele depende), e a **instabilidade** I = Ce / (Ca + Ce). Um módulo com I próximo de 0 é estável (muitos dependem dele, por isso deve mudar pouco); próximo de 1 é instável (fácil de mudar, ninguém depende dele)."));
c.push(H2("6.1 Mapeamento das dependências"));
c.push(T(["Módulo (origem)", "Depende de", "Tipo de comunicação", "Motivo"], [
  ["Agendamento", "Pacientes, Corpo Clínico", "Síncrona — interface `PacientesApi`, `CorpoClinicoApi`", "Validar que paciente e profissional existem e estão ativos"],
  ["Atendimento", "Pacientes, Corpo Clínico", "Síncrona — interfaces", "Exibir dados do paciente e do profissional responsável"],
  ["Internação", "Pacientes", "Síncrona — interface", "Validar paciente antes de ocupar leito"],
  ["Faturamento", "Atendimento, Internação, Pacientes", "Eventos `AtendimentoFinalizado`, `AltaRegistrada` + interface (convênio)", "Lançar itens e calcular valores por convênio"],
  ["Notificações", "Agendamento, Atendimento, Pacientes", "Eventos + interface (contato)", "Enviar e-mail ao paciente"],
  ["Relatórios", "Agendamento, Atendimento, Internação", "Somente eventos", "Atualizar projeções de leitura"],
  ["Todos os módulos", "Identidade", "Decorators do contrato (`@Perfis()`, `@UsuarioAtual()`)", "Proteger rotas por perfil"],
  ["Pacientes, Corpo Clínico", "somente Identidade", "—", "Módulos-base do domínio"],
  ["Identidade", "nenhum módulo", "—", "Base de todos os módulos"],
], [1800, 2000, 2800, 2426]));
c.push(GAP());
c.push(H2("6.2 Métricas de acoplamento"));
c.push(P("Os valores abaixo **foram medidos no código** pelo script `npm run arch:mermaid`, que lê as importações reais com o dependency-cruiser e conta, para cada par de módulos, se algum arquivo de um importa o `contracts/` do outro. A dependência de todos os módulos em Identidade (decorators de autorização) está incluída no Ce."));
c.push(T(["Módulo", "Ca (aferente)", "Ce (eferente)", "I = Ce/(Ca+Ce)", "Interpretação"], [
  ["Identidade", "8", "0", "0,00", "Máxima estabilidade — o contrato de autorização deve mudar raramente"],
  ["Pacientes", "5", "1", "0,17", "Estável — `PacientesApi` é versionada com cuidado"],
  ["Corpo Clínico", "2", "1", "0,33", "Estável"],
  ["Internação", "2", "2", "0,50", "Equilibrado"],
  ["Atendimento", "3", "3", "0,50", "Equilibrado"],
  ["Agendamento", "2", "3", "0,60", "Equilibrado"],
  ["Faturamento", "0", "4", "1,00", "Instável — livre para mudar (regras de preço)"],
  ["Notificações", "0", "4", "1,00", "Instável — candidato natural a extração"],
  ["Relatórios", "0", "4", "1,00", "Instável — candidato natural a extração"],
], [1800, 1200, 1200, 1500, 3326]));
c.push(GAP());
c.push(P("O resultado respeita o **Princípio das Dependências Estáveis**: as dependências sempre apontam de módulos instáveis para módulos estáveis. E o **Princípio das Dependências Acíclicas**: não há ciclos — nenhum módulo-base conhece módulos de processo."));
c.push(H2("6.3 Como a comunicação ocorre"));
c.push(T(["Mecanismo", "Quando é usado", "Exemplo no SGH Connect"], [
  ["API REST (HTTP/JSON)", "Front-end → API. Única forma de comunicação entre contêineres.", "`POST /api/consultas`"],
  ["Interface / contrato de serviço", "Consulta síncrona entre módulos quando a resposta é necessária para continuar", "`PacientesApi.buscarResumo(id)` chamada pelo Agendamento"],
  ["Injeção de dependências", "Ligar a interface à implementação sem o consumidor conhecer a classe concreta", "Token `PACIENTES_API` resolvido pelo container do NestJS"],
  ["Eventos de domínio assíncronos", "Quando outro módulo precisa reagir a um fato, mas o emissor não precisa esperar", "`AtendimentoFinalizado` → Faturamento, Notificações e Relatórios"],
  ["Outbox transacional", "Garantir que o evento só é entregue se a transação for confirmada", "Tabela `shared.OutboxEvento` lida pelo `OutboxWorker`"],
], [2300, 3400, 3326]));
c.push(GAP());
c.push(H2("6.4 Estratégias para reduzir o acoplamento"));
[
  "**Contratos explícitos (`contracts/`):** um módulo só pode importar a pasta `contracts/` de outro. Classes de domínio e repositórios são privados. Mudanças internas não se propagam.",
  "**Inversão de dependência:** o Agendamento depende da interface `PacientesApi`, e não da classe `PacientesService`. Nos testes, a interface é substituída por um dublê.",
  "**Eventos em vez de chamadas:** o Atendimento não chama Faturamento nem Notificações. Adicionar um novo interessado (ex.: auditoria) não exige alterar o Atendimento — princípio aberto/fechado no nível de módulo.",
  "**Dados privados por módulo:** cada módulo tem seu próprio schema no PostgreSQL. Não há chaves estrangeiras nem JOINs entre schemas; referências entre módulos são por identificador (`pacienteId`).",
  "**DTOs mínimos:** `PacienteResumoDto` expõe só id, nome, CPF mascarado e convênio — quanto menos dados expostos, menor o acoplamento de dados (stamp coupling).",
  "**Fitness function automatizada:** o `dependency-cruiser` falha o build se um módulo importar `domain/` ou `infrastructure/` de outro, ou se surgir um ciclo. A arquitetura é verificada a cada commit, e não só documentada.",
].forEach((t) => c.push(B(t)));
c.push(...CODE(`// .dependency-cruiser.cjs (trecho real)
{
  name: 'somente-contratos-entre-modulos',
  severity: 'error',
  from: { path: '(^|/)modules/([^/]+)/' },
  to: { path: '(^|/)modules/([^/]+)/(?!contracts/)', pathNot: '(^|/)modules/$2/' },
}`));
c.push(P("Além dessa regra, há outras quatro: `sem-ciclos`, `dominio-sem-framework` (a camada `domain/` não importa NestJS nem Prisma), `contratos-nao-dependem-de-implementacao` e `kernel-nao-conhece-interior-de-modulos`. Para provar que a verificação funciona, o repositório contém uma violação proposital isolada (`apps/api/test/arch-fixture`): `npm run arch:demo` a reprova, e um teste automatizado confere que o código real passa e a violação falha."));
c.push(H2("6.5 Impacto de mudanças futuras"));
c.push(T(["Mudança provável", "Módulos alterados", "Por que o impacto é pequeno"], [
  ["Novo convênio com tabela de preços própria", "Faturamento", "Nenhum outro módulo conhece preços"],
  ["Enviar notificações por WhatsApp", "Notificações", "Novo adaptador atrás da porta `CanalNotificacao`"],
  ["Novo tipo de leito (UTI neonatal)", "Internação", "Enum e regras ficam no domínio de Internação"],
  ["Novo relatório de tempo médio de permanência", "Relatórios", "Já recebe `PacienteInternado` e `AltaRegistrada`"],
  ["Trocar PostgreSQL por outro banco em um módulo", "infrastructure/ do módulo", "Repositórios implementam portas do domínio"],
  ["Auditoria de todos os atendimentos", "Novo módulo Auditoria", "Basta assinar eventos existentes; zero alteração nos emissores"],
], [3000, 2000, 4026]));

// ---------------------------------------------------------------- 7
c.push(H1("7. Análise de conascência"));
c.push(P("Conascência (Meilir Page-Jones, adotada por Richards e Ford) é uma forma mais precisa de falar de acoplamento: dois componentes são conascentes se uma mudança em um exige mudança no outro para manter o sistema correto. Ela é avaliada por três propriedades:"));
[
  "**Força:** do mais fraco ao mais forte — estática (nome < tipo < significado/convenção < posição < algoritmo) e dinâmica (execução < temporal < valor < identidade).",
  "**Localidade:** conascência forte é aceitável dentro de um módulo, mas deve ser fraca entre módulos.",
  "**Grau:** quantos elementos são afetados.",
].forEach((t) => c.push(B(t)));
c.push(P("A regra seguida no SGH Connect é: **entre módulos, só conascência de nome e de tipo; formas mais fortes são convertidas em formas mais fracas ou confinadas dentro de um módulo.**"));
c.push(H2("7.1 Resumo"));
c.push(T(["#", "Tipo", "Classe", "Onde ocorre", "Decisão"], [
  ["1", "Nome", "Estática", "Módulos chamando `PacientesApi.buscarResumo`", "Mantida"],
  ["2", "Tipo", "Estática", "`PacienteResumoDto` e payload de eventos", "Mantida"],
  ["3", "Convenção (significado)", "Estática", "Status de leito e de consulta", "Eliminada (enum)"],
  ["4", "Posição", "Estática", "Parâmetros de `agendarConsulta`", "Reduzida para nome"],
  ["5", "Algoritmo", "Estática", "Validação de CPF no front e no back", "Eliminada (código único)"],
  ["6", "Execução", "Dinâmica", "Ocupar leito antes de criar internação", "Reduzida (encapsulada)"],
  ["7", "Temporal", "Dinâmica", "Faturar antes do commit / internações simultâneas", "Reduzida (outbox + versão)"],
], [500, 1900, 1100, 3326, 2200]));
c.push(GAP());

const con = (titulo, onde, classif, decisao, just, impacto, codigo) => {
  c.push(H2(titulo));
  c.push(P(`**Onde ocorre:** ${onde}`));
  c.push(P(`**Classificação:** ${classif}`));
  c.push(P(`**Decisão:** ${decisao}`));
  c.push(P(`**Justificativa:** ${just}`));
  c.push(P(`**Impacto na manutenção e evolução:** ${impacto}`));
  if (codigo) c.push(...CODE(codigo));
};

con("7.2 Conascência de nome — mantida",
  "Agendamento, Atendimento, Internação, Faturamento e Notificações chamam `PacientesApi.buscarResumo(id)`. Se o método for renomeado, todos os chamadores precisam mudar.",
  "estática, a forma mais fraca; grau 5; localidade entre módulos.",
  "mantida.",
  "Algum acoplamento entre módulos é inevitável. Conascência de nome é a forma mais fraca e é detectada pelo compilador e pela refatoração automática da IDE (“renomear símbolo”).",
  "renomear é seguro e barato. Para proteger os 5 consumidores, `PacientesApi` é tratada como contrato estável (I = 0); métodos novos são adicionados sem remover os antigos.",
  `// apps/api/src/modules/pacientes/contracts/index.ts
export interface PacientesApi {
  buscarResumo(id: string): Promise<PacienteResumoDto | null>;
  buscarContato(id: string): Promise<ContatoPacienteDto | null>;
}
export const PACIENTES_API = Symbol('PACIENTES_API');`);

con("7.3 Conascência de tipo — mantida",
  "O Agendamento recebe um `PacienteResumoDto`; o Faturamento recebe o payload tipado de `AtendimentoFinalizado`. Emissor e receptor precisam concordar sobre o tipo de cada campo.",
  "estática, fraca; localidade entre módulos.",
  "mantida, com tipos declarados em `contracts/` e verificados pelo TypeScript.",
  "Sem tipos, o acordo seria implícito (conascência de significado, mais forte). Com TypeScript, qualquer incompatibilidade aparece em tempo de compilação, e não em produção.",
  "uma mudança de tipo quebra o build imediatamente em todos os consumidores, tornando o impacto visível antes da entrega.",
  `// shared/eventos/evento-dominio.ts — envelope comum
export interface EventoDominio<TTipo extends string, TPayload> {
  readonly eventId: string;     // usado para idempotência
  readonly tipo: TTipo;
  readonly ocorridoEm: string;  // ISO 8601 UTC
  readonly payload: TPayload;
}
// modules/atendimento/contracts/index.ts
export interface AtendimentoFinalizadoPayload {
  atendimentoId: string; pacienteId: string;
  profissionalId: string; profissionalNome: string;
  procedimentos: { codigo: string; quantidade: number }[];
  finalizadoEm: string;         // ISO 8601 UTC
}`);

con("7.4 Conascência de convenção (significado) — eliminada",
  "Em uma versão ingênua, o status do leito seria guardado como `'L'`, `'O'`, `'H'`, `'M'` e a tela de mapa de leitos, o relatório de ocupação e a regra de internação precisariam todos “saber” que `'O'` significa ocupado.",
  "estática, de força média; alto grau (front-end, relatórios, domínio).",
  "eliminada com o enum `StatusLeito`, definido uma única vez em `packages/shared` e usado por API e web.",
  "Valores mágicos criam um acordo invisível. Se alguém criar `'I'` (interditado), nada avisa os demais componentes. Com enum, o significado tem nome, e o compilador aponta todo `switch` que não trata o novo valor.",
  "acrescentar um status passa a ser uma mudança localizada e verificada; a mesma técnica foi aplicada a `StatusConsulta`, `ClassificacaoRisco`, `Perfil`, `Convenio` e `StatusConta`. Datas seguem uma única convenção explícita: ISO 8601 UTC em toda a API.",
  `// antes (convenção implícita)
if (leito.status === 'O') throw new Error('ocupado');

// depois (convenção explícita, conascência de nome)
export enum StatusLeito { LIVRE = 'LIVRE', OCUPADO = 'OCUPADO',
  HIGIENIZACAO = 'HIGIENIZACAO', MANUTENCAO = 'MANUTENCAO' }
// modules/internacao/domain/leito.ts
ocupar(): void {
  if (this.d.status !== StatusLeito.LIVRE) throw new LeitoIndisponivelError(this.d.codigo, this.d.status);
  this.d.status = StatusLeito.OCUPADO;
}`);

con("7.5 Conascência de posição — reduzida",
  "Uma assinatura como `agendar(pacienteId, profissionalId, data, hora, duracao, sala)` obriga todos os chamadores a conhecer a ordem dos argumentos. Trocar `pacienteId` por `profissionalId` compila (ambos são `string`) e gera um erro grave silencioso.",
  "estática, forte; ocorre entre controller, testes e casos de uso.",
  "reduzida de posição para nome, com um objeto de comando.",
  "Parâmetros nomeados tornam a ordem irrelevante e o código autodocumentado. Richards e Ford recomendam justamente converter conascências fortes em fracas.",
  "adicionar um campo (ex.: `observacao`) não quebra chamadas existentes; trocas acidentais de argumentos deixam de ser possíveis.",
  `// antes
agendar('p-1', 'm-7', '2026-11-26', '14:00', 30, 'S2');

// depois — modules/agendamento/application/agendar-consulta.command.ts
export interface AgendarConsultaCommand {
  pacienteId: string; profissionalId: string;
  inicio: string;      // ISO 8601 com fuso
  duracaoMin: number; sala?: string; observacao?: string;
}
agendar.executar({ pacienteId: 'p-1', profissionalId: 'm-7',
  inicio: '2026-11-26T14:00:00-03:00', duracaoMin: 30, sala: 'S2' }, ator);`);

con("7.6 Conascência de algoritmo — eliminada",
  "O CPF é validado no formulário do front-end e na API. Se cada lado implementasse o cálculo do dígito verificador, os dois algoritmos precisariam permanecer idênticos para sempre.",
  "estática, forte; localidade entre contêineres diferentes (web e api).",
  "eliminada: o value object `Cpf` (validação + formatação + máscara) fica em `packages/shared` e é importado pelos dois lados.",
  "Algoritmos duplicados divergem com o tempo; o usuário veria um CPF aceito na tela e rejeitado pela API.",
  "correção ou mudança de regra em um único lugar, com um único conjunto de testes.",
  `// packages/shared/src/cpf.ts — importado por apps/api e apps/web
function digitoVerificador(base: string, pesoInicial: number): number { ... }
export class Cpf {
  static criar(entrada: string): Cpf    // lança CpfInvalidoError → HTTP 400
  static ehValido(entrada: string): boolean   // usado no formulário web
  formatado(): string                    // 529.982.247-25
  mascarado(): string                    // ***.982.***-**
}`);

con("7.7 Conascência de execução — reduzida e confinada",
  "Para internar é preciso, nesta ordem: (1) verificar se o leito está livre, (2) marcá-lo como ocupado, (3) criar a internação e (4) publicar `PacienteInternado`. Se essa ordem fosse responsabilidade de quem chama (por exemplo, o controller chamando vários serviços), qualquer novo chamador poderia esquecer um passo.",
  "dinâmica, forte; grau 4 passos.",
  "reduzida: a sequência é encapsulada em um único método de caso de uso (`InternarPacienteUseCase.executar`) que executa tudo em uma transação. A conascência continua existindo, mas com **localidade máxima** — dentro de uma única classe de um único módulo.",
  "Esta é a principal razão para Leitos e Internação estarem no mesmo módulo (seção 5.2). Se fossem módulos separados, a ordem de execução cruzaria a fronteira e exigiria uma saga.",
  "quem chama não conhece a ordem; mudar a regra (ex.: exigir higienização registrada) altera apenas o caso de uso. A mesma técnica aparece no agregado `Atendimento`: `registrarEvolucao()` só é aceito com o atendimento ABERTO (senão HTTP 422) e `finalizar()` exige ao menos um registro clínico — a ordem é garantida pelo domínio, não pela tela.",
  `// modules/internacao/application/internar-paciente.use-case.ts (resumido)
return this.uow.executar(async (tx) => {
  if (await this.internacoes.obterAtivaDoPaciente(cmd.pacienteId, tx)) throw new ConflitoError(...);
  const leito = await this.leitos.obter(cmd.leitoId, tx);
  leito.ocupar();                                  // regra de domínio → 409
  const internacao = Internacao.iniciar(cmd, leito);
  await this.leitos.salvar(leito, tx);             // controle de versão → 409
  const salva = await this.internacoes.salvar(internacao, tx);
  await this.outbox.adicionar(criarEvento(PACIENTE_INTERNADO, { ... }), tx);
  await this.auditoria.registrar({ ator, acao: PACIENTE_INTERNADO, ... }, tx);
  return salva;
});`);

con("7.8 Conascência temporal — reduzida",
  "Dois casos: (a) o Faturamento poderia receber `AtendimentoFinalizado` antes de a transação do Atendimento ser confirmada e, se ela falhasse, cobraria por um atendimento inexistente; (b) dois gestores poderiam internar pacientes diferentes no mesmo leito ao mesmo tempo.",
  "dinâmica, forte; o resultado depende do momento em que as operações acontecem.",
  "reduzida com três técnicas: (1) **outbox transacional** — o evento é gravado na mesma transação e só é despachado após o commit; (2) **controle de concorrência otimista** — o leito tem coluna `versao`, e a segunda gravação falha com `409 Conflict`; (3) **handlers idempotentes** — o Faturamento registra o `eventId` processado e ignora reentregas.",
  "Conascência temporal é uma das formas mais difíceis de detectar, pois só aparece sob carga ou falha. Torná-la explícita no desenho evita erros de cobrança e de ocupação de leitos.",
  "os módulos consumidores podem ser lentos, reiniciados ou futuramente extraídos para outro processo sem perder ou duplicar eventos. Como defesa adicional, o banco tem um índice único parcial que impede duas internações ATIVAS no mesmo leito. A alta também é atômica: encerrar a internação, mandar o leito para HIGIENIZACAO e gravar `AltaRegistrada` ocorrem na mesma transação.",
  `// modules/internacao/infrastructure/repositorios.ts
const { count } = await cliente.leito.updateMany({
  where: { id: leito.id, versao: leito.versao },        // versão lida
  data: { status: leito.status, versao: { increment: 1 } },
});
if (count === 0) throw new ConflitoError('O leito foi alterado por outra operação...');

// modules/faturamento/infrastructure/prisma-conta.repositorio.ts
const { count } = await cliente.eventoProcessadoFaturamento
  .createMany({ data: [{ eventId }], skipDuplicates: true });
return count === 1;   // false = evento já processado → ignora`);
c.push(H2("7.9 Síntese"));
c.push(P("Entre módulos, o SGH Connect só apresenta conascência de **nome** e **tipo**, ambas verificadas pelo compilador. As formas mais fortes (posição, convenção, algoritmo) foram eliminadas ou reduzidas, e as formas dinâmicas (execução, temporal) foram confinadas a um único caso de uso ou tratadas por mecanismos explícitos (transação, versão, outbox e idempotência)."));

// ---------------------------------------------------------------- 8
c.push(H1("8. Justificativas arquiteturais (ADRs)"));
c.push(P("As decisões são registradas no formato ADR (Architecture Decision Record), recomendado por Richards e Ford: contexto, decisão, alternativas e consequências. Cópias em Markdown ficam em `docs/adr/` no repositório."));
const adr = (t, ctx, dec, alt, cons) => {
  c.push(H2(t));
  c.push(P(`**Contexto:** ${ctx}`));
  c.push(P(`**Decisão:** ${dec}`));
  c.push(P(`**Alternativas consideradas:** ${alt}`));
  c.push(P(`**Consequências e trade-offs:** ${cons}`));
};
adr("ADR-01 — Por que monólito modular e não microsserviços?",
  "Equipe de três pessoas, prazo curto, carga previsível e forte necessidade de consistência (leitos, contas).",
  "Uma única unidade implantável dividida em módulos de domínio com fronteiras rígidas.",
  "Microsserviços (rejeitado: custo operacional, consistência eventual em operações críticas, testes distribuídos); monólito sem módulos (rejeitado: tende ao “big ball of mud”).",
  "(+) simplicidade, transações locais, depuração fácil. (−) escala e implantação apenas do sistema inteiro. Mitigação: módulos se comunicam como serviços, permitindo extração futura.");
adr("ADR-02 — Por que particionar por domínio e usar camadas dentro de cada módulo?",
  "Em um particionamento técnico (controllers/, services/, repositories/ globais), uma mudança em “internação” toca as três pastas e se mistura com outros assuntos.",
  "Particionamento de primeiro nível por domínio; camadas apenas dentro do módulo.",
  "Arquitetura em camadas tradicional.",
  "(+) alta coesão, mudança localizada, alinhamento com a linguagem do hospital. (−) algum código de infraestrutura se repete entre módulos; aceitável, pois duplicar infraestrutura é mais barato do que acoplar domínios.");
adr("ADR-03 — Por que separar contratos públicos (contracts/)?",
  "Sem uma fronteira explícita, qualquer classe pode ser importada por qualquer módulo, e o acoplamento cresce sem ser notado.",
  "Cada módulo expõe apenas interfaces, DTOs e eventos em `contracts/`; o restante é privado e verificado pelo dependency-cruiser.",
  "Confiar na disciplina da equipe (rejeitado: não é verificável).",
  "(+) acoplamento visível e controlado; refatoração interna livre. (−) um pouco mais de código (DTOs e mapeadores).");
adr("ADR-04 — Por que eventos de domínio com outbox?",
  "Faturamento, Notificações e Relatórios precisam reagir a fatos clínicos, mas os módulos clínicos não devem depender deles.",
  "Eventos de domínio publicados via outbox transacional e consumidos por handlers idempotentes.",
  "Chamadas diretas (rejeitado: inverte dependências e cria ciclos); fila externa como RabbitMQ (adiado: custo operacional sem necessidade atual).",
  "(+) acoplamento mínimo e extensibilidade. (−) consistência eventual entre módulos (a conta pode aparecer alguns segundos depois) e fluxo mais difícil de seguir — mitigado com logs de correlação por `eventId`.");
adr("ADR-05 — Por que um banco com um schema por módulo?",
  "Banco compartilhado sem regras gera acoplamento de dados: JOINs entre tabelas de módulos diferentes tornam impossível mudar um esquema sem afetar outro.",
  "Um único PostgreSQL, com um schema por módulo e proibição de FKs e JOINs entre schemas.",
  "Banco por módulo (adiado: custo); tabelas misturadas (rejeitado).",
  "(+) transações locais e operação simples; propriedade clara dos dados. (−) integridade entre módulos não é garantida por FK; garantida pelas validações via contrato.");
adr("ADR-06 — Por que JWT com RBAC?",
  "Dados de saúde exigem controle de acesso por função (LGPD).",
  "Autenticação com JWT de curta duração; autorização por perfil com o decorator `@Perfis()` em cada rota; acesso a prontuário registrado em log de auditoria.",
  "Sessão em servidor (rejeitado: estado na API dificulta escalar horizontalmente).",
  "(+) API sem estado e regras de acesso declarativas. (−) revogação imediata de token exige lista de bloqueio — aceitável no escopo.");
c.push(H2("ADR-07 — Síntese dos trade-offs aceitos"));
c.push(P("Richards e Ford lembram que “tudo em arquitetura de software é um trade-off”. Os principais trade-offs aceitos no SGH Connect são:"));
[
  "**Consistência eventual** nos módulos de saída (Faturamento, Notificações, Relatórios) em troca de **baixo acoplamento** com os módulos clínicos.",
  "**Implantação única** em troca de **simplicidade operacional** e transações locais.",
  "**Mais arquivos** (contracts, DTOs, mapeadores) em troca de **fronteiras explícitas e verificáveis**.",
  "**Ausência de FKs entre módulos** em troca de **autonomia de dados** e possibilidade de extração futura.",
].forEach((t) => c.push(B(t)));

// ---------------------------------------------------------------- 9
c.push(H1("9. Modelo de dados por módulo"));
c.push(P("Cada schema pertence a um único módulo. Referências a outros módulos são apenas identificadores (sem FK)."));
c.push(T(["Schema", "Entidades principais", "Referências externas (por id)"], [
  ["identidade", "Usuario (id, email, senhaHash, perfil, ativo)", "—"],
  ["pacientes", "Paciente (id, nome, cpf único, nascimento, telefone, email, convenio, numeroCarteirinha)", "—"],
  ["corpo_clinico", "Profissional (id, nome, tipo, registro, especialidade, ativo)", "usuarioId"],
  ["agendamento", "Consulta (id, inicio, fim, status, sala, observacao)", "pacienteId, profissionalId"],
  ["atendimento", "Atendimento (id, status, inicio, fim), Triagem (risco, sinais vitais), RegistroClinico (anamnese, cid, conduta), Prescricao", "pacienteId, profissionalId, consultaId?"],
  ["internacao", "Leito (id, codigo, ala, tipo, status, versao), Internacao (id, inicio, alta, motivo)", "pacienteId"],
  ["faturamento", "Conta (id, status, total), ItemConta (descricao, codigo, qtd, valorUnit), EventoProcessadoFaturamento (eventId)", "pacienteId; itens guardam o eventId de origem"],
  ["notificacoes", "Notificacao (id, eventId único, canal, destino, assunto, mensagem, status, enviadaEm)", "pacienteId"],
  ["relatorios", "ProjecaoOcupacao, ProjecaoProducao, ProjecaoConsultas", "ids diversos"],
  ["shared", "OutboxEvento (id, tipo, payload, criadoEm, processadoEm, tentativas, ultimoErro), RegistroAuditoria (atorId, atorEmail, acao, entidade, entidadeId, criadoEm)", "—"],
], [1600, 4800, 2626]));

// ---------------------------------------------------------------- 10
c.push(H1n("10. Segurança e privacidade"));
[
  "Senhas com hash bcrypt (biblioteca bcryptjs); JWT com expiração de 8 horas.",
  "Autorização por perfil em todas as rotas (`@Perfis(Perfil.MEDICO)`), validada por testes.",
  "Prontuário acessível apenas a médicos e enfermeiros; registro clínico só é aceito em atendimento aberto.",
  "Trilha de auditoria (porta `RegistroAuditoria` em `shared/auditoria`) para login, consultas, atendimentos, leitura de prontuário, internação, alta e fechamento de conta: grava ator, ação, entidade, id e data — **nunca o texto clínico**. Consulta restrita ao perfil Administrador.",
  "DTOs públicos expõem CPF mascarado; o CPF completo só circula dentro do módulo Pacientes.",
  "Validação de entrada na borda (DTOs com class-validator) e regras de negócio no domínio; erros devolvidos em formato uniforme (400, 401, 403, 404, 409, 422).",
  "Datas trafegam em ISO 8601 UTC; API documentada com Swagger.",
  "Projeto acadêmico: utiliza exclusivamente dados fictícios; um produto real exigiria controles adicionais de retenção, criptografia e conformidade.",
].forEach((t) => c.push(B(t)));

// ---------------------------------------------------------------- 11
c.push(H1n("11. Escalabilidade e evolução"));
c.push(P("A arquitetura foi desenhada para evoluir de forma incremental, sem reescrita:"));
c.push(T(["Etapa", "Gatilho", "Ação", "Por que é viável"], [
  ["1", "Volume de e-mails/SMS cresce", "Extrair Notificações para um serviço separado", "Ca = 0 e só consome eventos: troca-se o barramento in-process por uma fila"],
  ["2", "Relatórios pesados afetam a operação", "Extrair Relatórios com banco de leitura próprio", "Já usa projeções próprias montadas por eventos"],
  ["3", "Integração com operadoras", "Adaptador TISS no Faturamento", "Basta criar uma porta de exportação no Faturamento; nenhum outro módulo muda"],
  ["4", "Vários hospitais (rede)", "Multi-tenant por `hospitalId`", "Fronteiras por domínio permitem adicionar o conceito módulo a módulo"],
], [700, 2400, 2800, 3126]));
c.push(GAP());
c.push(P("Para escalar sem extrair módulos, a API é sem estado (JWT) e pode ser replicada horizontalmente atrás de um balanceador; o worker de outbox usa `SELECT ... FOR UPDATE SKIP LOCKED` para permitir várias instâncias."));

// ---------------------------------------------------------------- 12
c.push(H1n("12. Rastreabilidade: documentação × implementação"));
c.push(P("A tabela liga cada decisão deste documento ao local onde ela pode ser verificada no repositório `sgh-connect`."));
c.push(T(["Decisão / conceito", "Onde verificar no código", "Evidência esperada"], [
  ["Módulos por domínio", "`apps/api/src/modules/*`", "9 pastas, uma por módulo"],
  ["Camadas internas", "`modules/<m>/{api,application,domain,infrastructure}`", "Domínio sem import de NestJS ou Prisma"],
  ["Contratos públicos", "`modules/<m>/contracts/`", "Interfaces, DTOs e eventos"],
  ["Fronteiras verificadas", "`.dependency-cruiser.cjs` + `npm run arch:check`", "Build falha ao violar regra"],
  ["Eventos + outbox", "`apps/api/src/shared/eventos/`", "Tabela outbox e worker"],
  ["Conascência de convenção eliminada", "`packages/shared/src/enums.ts`", "`StatusLeito`, `StatusConsulta`"],
  ["Conascência de algoritmo eliminada", "`packages/shared/src/cpf.ts`", "Usado na api e na web"],
  ["Conascência de posição reduzida", "`agendamento/application/agendar-consulta.command.ts`", "Objeto de comando"],
  ["Conascência de execução confinada", "`internacao/application/internar-paciente.use-case.ts`", "Transação única"],
  ["Conascência temporal reduzida", "Coluna `versao` em Leito (`internacao/infrastructure/repositorios.ts`); `EventoProcessadoFaturamento`", "Testes e2e de concorrência, alta atômica e idempotência"],
  ["Coesão por módulo", "Testes em `modules/<m>/**/*.spec.ts`", "Testes de domínio sem banco"],
  ["Violação reprovada", "`apps/api/test/arch-fixture` + `npm run arch:demo`", "Regra `somente-contratos-entre-modulos` falha"],
  ["Diagrama a partir do código", "`docs/diagramas/modulos-dependencias-reais.md` (`npm run arch:mermaid`)", "Grafo e métricas Ca/Ce medidos"],
  ["Testes de ponta a ponta", "`apps/api/test/sgh.e2e-spec.ts`", "22 testes e2e contra banco de teste"],
  ["Segurança e auditoria", "`shared/auditoria/` + testes e2e", "401 sem token, 403 sem perfil, log sem texto clínico"],
  ["Evidências consolidadas", "`EVIDENCIAS_ARQUITETURA.md`", "Tabela critério × arquivo × teste × status"],
], [2700, 3600, 2726]));

// ---------------------------------------------------------------- 13
c.push(H1n("13. Resultados da implementação"));
c.push(P("A aplicação foi implementada conforme este documento no repositório `sgh-connect` (monorepo com `apps/api`, `apps/web` e `packages/shared`). Os resultados abaixo foram obtidos executando os comandos do projeto em 23/11/2026; nenhum valor foi estimado."));
c.push(T(["Verificação", "Comando", "Resultado obtido"], [
  ["Testes do pacote compartilhado (Cpf)", "`npm test` (Vitest)", "4 de 4 passaram"],
  ["Testes unitários da API (domínio e caso de uso sem banco)", "`npm test` (Jest)", "18 de 18 passaram"],
  ["Testes e2e da API (HTTP + PostgreSQL de teste)", "`npm test` (Jest + Supertest)", "22 de 22 passaram"],
  ["Testes do front-end", "`npm test` (Vitest)", "4 de 4 passaram"],
  ["Fronteiras entre módulos", "`npm run arch:check`", "Nenhuma violação (79 arquivos, 325 dependências)"],
  ["Violação proposital", "`npm run arch:demo`", "Reprovada pela regra `somente-contratos-entre-modulos`"],
], [3400, 2400, 3226]));
c.push(GAP());
c.push(P("Os testes e2e cobrem os cenários críticos descritos nas seções 6 e 7:"));
[
  "Sem token → **401**; perfil sem permissão (ex.: recepcionista lendo prontuário, médico fechando conta) → **403**.",
  "CPF inválido, data fora do ISO 8601 ou campo desconhecido → **400** com mensagens claras; CPF duplicado → **409**.",
  "Consulta sobreposta para o mesmo médico → **409**, inclusive com duas requisições simultâneas (uma 201 e uma 409).",
  "Registro clínico em atendimento finalizado → **422**; a auditoria registra as ações sem o texto clínico.",
  "Duas internações simultâneas no mesmo leito → uma 201 e uma 409; alta com falha simulada no meio da transação não altera nada.",
  "O mesmo evento `AtendimentoFinalizado` entregue duas vezes gera os itens da conta e a notificação uma única vez.",
].forEach((t) => c.push(B(t)));
c.push(P("Evidências detalhadas (arquivo, trecho, teste e status de cada critério) estão em `EVIDENCIAS_ARQUITETURA.md`, na raiz do repositório."));

c.push(H1n("14. Referências"));
[
  "RICHARDS, Mark; FORD, Neal. **Fundamentos da Arquitetura de Software: uma abordagem de engenharia**. Rio de Janeiro: Alta Books, 2024.",
  "PAGE-JONES, Meilir. **What Every Programmer Should Know About Object-Oriented Design**. Dorset House, 1995.",
  "BROWN, Simon. **The C4 model for visualising software architecture**. Disponível em: https://c4model.com.",
  "MARTIN, Robert C. **Arquitetura Limpa**. Rio de Janeiro: Alta Books, 2019.",
  "BRASIL. Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD).",
].forEach((t) => c.push(P(t, { alignment: AlignmentType.LEFT })));

// ---------------------------------------------------------------- documento
const doc = new Document({
  creator: "Equipe SGH Connect",
  title: "SGH Connect — Documento Arquitetural",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 32, bold: true, color: AZUL },
        paragraph: { spacing: { before: 240, after: 160 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: AZUL },
        paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 23, bold: true, color: "333333" },
        paragraph: { spacing: { before: 160, after: 80 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 270 } } } },
      ] },
      { reference: "num", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } },
      ] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }, titlePage: true },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "SGH Connect — Documento Arquitetural", size: 16, color: "888888" })] })] }),
      first: new Header({ children: [new Paragraph({ children: [] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })] })] }),
      first: new Footer({ children: [new Paragraph({ children: [] })] }),
    },
    children: c,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("ok", OUT); });
