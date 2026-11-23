/**
 * Atualiza a seção "Dependências reais entre módulos" do README.md (Mermaid + métricas Ca/Ce)
 * a partir das importações REAIS do código, usando o dependency-cruiser.
 * Assim o diagrama não pode divergir da implementação.
 *
 * Uso: npm run arch:mermaid
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const json = JSON.parse(
  execSync('npx depcruise apps/api/src --config .dependency-cruiser.cjs --output-type json', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
);

const moduloDe = (caminho) => caminho.match(/apps\/api\/src\/modules\/([^/]+)\//)?.[1];
const ehContrato = (caminho) => /\/contracts\//.test(caminho);

// aresta "origem → destino" com o tipo: chamada a contrato (interface) ou tipo de evento consumido
const arestas = new Map();
for (const m of json.modules) {
  const de = moduloDe(m.source);
  if (!de) continue;
  for (const d of m.dependencies) {
    const para = moduloDe(d.resolved);
    if (!para || para === de || !ehContrato(d.resolved)) continue;
    const chave = `${de}->${para}`;
    arestas.set(chave, (arestas.get(chave) ?? new Set()).add(m.source.replace(/^apps\/api\/src\/modules\//, '')));
  }
}

const ROTULO = {
  identidade: 'Identidade e Acesso',
  pacientes: 'Pacientes',
  'corpo-clinico': 'Corpo Clínico',
  agendamento: 'Agendamento',
  atendimento: 'Atendimento',
  internacao: 'Internação e Leitos',
  faturamento: 'Faturamento',
  notificacoes: 'Notificações',
  relatorios: 'Relatórios',
};
const id = (m) => m.replace('-', '_');

// Ca / Ce por módulo (contando dependências de contrato entre módulos)
const ca = {}, ce = {};
for (const k of Object.keys(ROTULO)) ca[k] = ce[k] = 0;
for (const chave of arestas.keys()) {
  const [de, para] = chave.split('->');
  ce[de]++;
  ca[para]++;
}

const linhas = ['```mermaid', 'flowchart BT'];
for (const [m, r] of Object.entries(ROTULO)) linhas.push(`  ${id(m)}["${r}"]`);
for (const chave of [...arestas.keys()].sort()) {
  const [de, para] = chave.split('->');
  linhas.push(`  ${id(de)} --> ${id(para)}`);
}
linhas.push('  classDef saida fill:#FCEBD9,stroke:#B85C00;', '  class faturamento,notificacoes,relatorios saida;', '```');

const tabela = [
  '| Módulo | Ca (aferente) | Ce (eferente) | I = Ce/(Ca+Ce) |',
  '|---|---|---|---|',
  ...Object.entries(ROTULO).map(([m, r]) => {
    const i = ca[m] + ce[m] === 0 ? '—' : (ce[m] / (ca[m] + ce[m])).toFixed(2).replace('.', ',');
    return `| ${r} | ${ca[m]} | ${ce[m]} | ${i} |`;
  }),
];

const detalhe = [...arestas.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, arquivos]) => `- **${k.replace('->', ' → ')}**: ${[...arquivos].map((a) => `\`${a}\``).join(', ')}`);

const INICIO = '<!-- dependencias:inicio -->';
const FIM = '<!-- dependencias:fim -->';
const secao = [
  INICIO,
  `> Gerado por \`npm run arch:mermaid\` em ${new Date().toISOString().slice(0, 10)} a partir das importações do código`,
  '> (dependency-cruiser). Uma seta A → B significa: algum arquivo de A importa `B/contracts`.',
  '> Nenhuma seta aponta para fora de `contracts/`, e isso é garantido por `npm run arch:check`.',
  '',
  ...linhas,
  '',
  '**Métricas de acoplamento medidas no código** (Ca = quantos módulos dependem dele; Ce = de quantos ele depende):',
  '',
  ...tabela,
  '',
  '<details><summary>Arquivos que originam cada dependência</summary>',
  '',
  ...detalhe,
  '',
  '</details>',
  FIM,
].join('\n');

const readme = readFileSync('README.md', 'utf8');
const ini = readme.indexOf(INICIO);
const fim = readme.indexOf(FIM);
if (ini < 0 || fim < 0) throw new Error(`README.md precisa conter os marcadores ${INICIO} e ${FIM}`);
writeFileSync('README.md', readme.slice(0, ini) + secao + readme.slice(fim + FIM.length));
console.log(`ok: ${arestas.size} dependências entre módulos → README.md (seção Diagramas)`);
