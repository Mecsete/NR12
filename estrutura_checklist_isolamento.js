/* Ensaio de isolamento do módulo Checklist — chamado por estrutura.py (seção
   138). Não é uma checagem estrutural de string: extrai as funções REAIS do
   módulo Checklist do arquivo entregue (mesma técnica de extração de
   testes2.js/banco.js — função por função, por chaves balanceadas, do texto
   do próprio index.html), monta um STATE de teste com dados já preenchidos
   de Módulo Completo (STATE.projetos) e Módulo Simplificado
   (STATE.projetosSimples), executa uma sequência real de operações do
   Checklist (criar modelo, editar seções/itens, motivos padrão, criar
   projeto → setor → linha de vida, marcar conformidade, observação, foto,
   tags, marcar seção N/A, navegar, finalizar, reabrir, excluir), e compara
   byte a byte o JSON de STATE.projetos e STATE.projetosSimples antes e
   depois. Também confere as duas migrações de chkGarantirNamespace (STATE
   sem `checklists`, e STATE com o formato antigo de execuções em lista
   plana) sem tocar nas duas árvores.
   Sai com código 0 e imprime "ISOLAMENTO OK" se nada mudou; sai com código 1
   e imprime a diferença se qualquer byte mudou, ou se qualquer operação
   lançar exceção. */
const fs = require("fs");
const vm = require("vm");

const caminho = process.argv[2];
if(!caminho){ console.error("uso: node estrutura_checklist_isolamento.js <arquivo.html>"); process.exit(1); }
const HTML = fs.readFileSync(caminho, "utf8");

function trecho(ini, fim){
  const i = HTML.indexOf(ini);
  if(i < 0) throw new Error("marca inicial nao encontrada: " + ini.slice(0, 60));
  const f = HTML.indexOf(fim, i);
  if(f < 0) throw new Error("marca final nao encontrada: " + fim.slice(0, 60));
  return HTML.slice(i, f);
}
function funcao(nome){
  const re = new RegExp("\\n\\s*(?:async )?function " + nome + "\\s*\\(");
  const m = re.exec(HTML);
  if(!m) throw new Error("funcao nao encontrada: " + nome);
  const i = m.index + 1;
  let p = HTML.indexOf("(", i), prof = 0;
  while(p < HTML.length){
    if(HTML[p] === "(") prof++;
    else if(HTML[p] === ")"){ prof--; if(prof === 0) break; }
    p++;
  }
  let k = HTML.indexOf("{", p), d = 0, str = null;
  const j0 = k;
  while(k < HTML.length){
    const ch = HTML[k];
    if(str){ if(ch === "\\"){ k += 2; continue; } if(ch === str) str = null; }
    else{
      if(ch === '"' || ch === "'" || ch === "`") str = ch;
      else if(ch === "{") d++;
      else if(ch === "}"){ d--; if(d === 0) return HTML.slice(i, k + 1); }
    }
    k++;
  }
  throw new Error("nao fechou: " + nome + " (abriu em " + j0 + ")");
}
function letObjeto(nome){
  const re = new RegExp("\\n\\s*let " + nome + "\\s*=");
  const m = re.exec(HTML);
  if(!m) throw new Error("let nao encontrado: " + nome);
  const iniLinha = m.index + 1;
  let k = HTML.indexOf("=", iniLinha), d = 0, str = null, ini = null;
  while(k < HTML.length){
    const ch = HTML[k];
    if(str){ if(ch === "\\"){ k += 2; continue; } if(ch === str) str = null; }
    else{
      if(ch === '"' || ch === "'" || ch === "`") str = ch;
      else if(ch === "{" || ch === "["){ if(ini === null) ini = ch; d++; }
      else if(ch === "}" || ch === "]"){ d--; if(d === 0) return HTML.slice(iniLinha, k + 1) + ";"; }
    }
    k++;
  }
  throw new Error("nao fechou let: " + nome);
}

function constString(nome){
  const re = new RegExp("\\nconst " + nome + '\\s*=\\s*"[^"]*";');
  const m = re.exec(HTML);
  if(!m) throw new Error("const string nao encontrada: " + nome);
  return m[0].slice(1) + "\n"; // tira a quebra de linha inicial usada só pra ancorar
}

// ---------- monta o código a testar, extraído de verdade do arquivo ----------
const FUNCOES = [
  "uid", "hoje", "ehFotoDataUrlPersist", "clonarCompartilhandoFotos",
  "agoraSync", "__carregarUltimoCarimbo",
  "novoChkModelo", "novoChkSecao", "novoChkItem", "chkModeloPadraoLinhasDeVida",
  "novoChkProjeto", "novoChkSetor", "novoChkLinha",
  "getCurrentChkModelo", "getCurrentChkProjeto", "getCurrentChkSetor", "getCurrentChkLinha",
  "chkItemExec", "chkContarStatus", "chkProgresso",
  "chkGarantirNamespace",
];
let fonte = "let __ultimoCarimboVisto = 0;\n";
fonte += constString("CHK_MODELO_PADRAO_ID");
for(const nome of FUNCOES) fonte += funcao(nome) + "\n";
fonte += letObjeto("__chkNovaLinhaDraft") + "\n";
const metodosApp = trecho(
  "/* ---------- Checklist — só lê/escreve STATE.checklists ---------- */",
  "\n};\nwindow.App = App;"
);
fonte += "const App = {\n" + metodosApp + "\n};\n";

// ---------- ambiente mínimo (sem DOM — este ensaio é só de dados) ----------
const sandbox = {
  console,
  confirm: () => true,
  toast: () => {},
  marcarAlterado: () => {},
  render: () => {},
  go: () => {},
  window: { scrollTo: () => {} },
};
vm.createContext(sandbox);
vm.runInContext(fonte, sandbox, { filename: "checklist-extraido.js" });

// ---------- STATE de teste: Completo e Simplificado já preenchidos ----------
function mkProjetoCompleto(){
  const pg1 = { id: "pg1", nome: "Ponto de esmagamento", descricao: "Esmagamento na correia",
    foto: "data:image/jpeg;base64,EEE", fotosOutras: ["data:image/jpeg;base64,FFF"],
    medidaImplementada: "Nao", descMedida: "", sugestaoMitigacao: "Instalar protecao fixa",
    po: "", gpd: "", fe: "", np: "" };
  const pg2 = { id: "pg2", nome: "Ruido excessivo", descricao: "Ruido do motor",
    foto: null, fotosOutras: [], medidaImplementada: "Sim", descMedida: "Protetor auricular obrigatorio",
    sugestaoMitigacao: "", po: "", gpd: "", fe: "", np: "" };
  const t1 = { id: "tc1", tarefa: "Manutencao preventiva", tarefaOutro: "", descricao: "Troca de correia",
    frequencia: "Mensal", numPessoas: "1", perigos: [pg1, pg2] };
  const m1 = { id: "mc1", nome: "Esteira EST-04", descricao: "Esteira transportadora",
    fotoGeral: "data:image/jpeg;base64,GGG", fotoPlaqueta: null, fotosOutras: [], tarefas: [t1] };
  const a1 = { id: "ac1", nome: "Recepcao", descricao: "d", local: "L", maquinas: [m1] };
  return { id: "pc1", empresa: "Cliente Teste Completo", cidade: "Rio Verde/GO",
    responsavel: "Eng. Teste", data: "2026-06-01", areas: [a1] };
}
function mkProjetoSimples(){
  const r1 = { id: "r1", nome: "Ponta de eixo exposta", descricao: "Ponta de eixo exposta com risco de agarramento",
    foto: "data:image/jpeg;base64,AAA", fotosOutras: ["data:image/jpeg;base64,BBB"],
    medidaImplementada: "Sim", descMedida: "Existe protecao mas ainda ha risco", sugestaoMitigacao: "",
    po: "", gpd: "", fe: "", np: "" };
  const t1 = { id: "t1", tarefa: "Limpeza e higienizacao", tarefaOutro: "", descricao: "Limpeza ao redor",
    frequencia: "Diario", numPessoas: "2", riscos: [r1] };
  const m1 = { id: "m1", nome: "Despalha 3-HU-2703", descricao: "Despalhador de milho",
    fotoGeral: "data:image/jpeg;base64,CCC", fotoPlaqueta: "data:image/jpeg;base64,DDD",
    fotosOutras: [], tarefas: [t1] };
  const a1 = { id: "a1", nome: "Zebra - area Z", descricao: "d", local: "L", maquinas: [m1] };
  return { id: "p1", empresa: "Corteva", cidade: "Formosa/GO", responsavel: "Luiz",
    data: "2026-06-24", areas: [a1] };
}

sandbox.STATE = {
  modulo: "checklist",
  projetos: [mkProjetoCompleto()],
  projetosSimples: [mkProjetoSimples()],
  checklists: { modelos: [], projetos: [] },
  ui: { chkModeloId: null, chkProjetoId: null, chkSetorId: null, chkLinhaId: null, chkSecaoAtual: 0 },
};

const antesCompleto = JSON.stringify(sandbox.STATE.projetos);
const antesSimples = JSON.stringify(sandbox.STATE.projetosSimples);

// ---------- sequência real de operações do Checklist ----------
const operar = `
const modelo = novoChkModelo();
STATE.checklists.modelos.push(modelo);
STATE.ui.chkModeloId = modelo.id;
App.chkSetModeloField("nome", "Inspecao Linha de Vida - Teste");
App.chkSetModeloField("descricao", "Modelo de teste do checklist");
App.chkNovaSecao();
App.chkNovaSecao();
const sec1 = modelo.secoes[0], sec2 = modelo.secoes[1];
App.chkSetSecaoTitulo(sec1.id, "Ancoragem");
App.chkSetSecaoTitulo(sec2.id, "Cabo e EPI");
App.chkNovoItem(sec1.id);
App.chkNovoItem(sec1.id);
App.chkNovoItem(sec2.id);
App.chkSetItemField(sec1.id, sec1.itens[0].id, "descricao", "Verificar fixacao da ancoragem");
App.chkSetItemField(sec1.id, sec1.itens[0].id, "normativo", "NR-35 8.2.1");
App.chkSetItemField(sec1.id, sec1.itens[1].id, "descricao", "Verificar torque dos parafusos");
App.chkSetItemField(sec2.id, sec2.itens[0].id, "descricao", "Verificar integridade do cabo de aco");
App.chkRemoverItem(sec1.id, sec1.itens[1].id);
App.chkNovoMotivoPadrao(sec1.id, sec1.itens[0].id);
App.chkNovoMotivoPadrao(sec1.id, sec1.itens[0].id);
App.chkSetMotivoPadrao(sec1.id, sec1.itens[0].id, 0, "Ancoragem corroida");
App.chkSetMotivoPadrao(sec1.id, sec1.itens[0].id, 1, "Ausencia de ancoragem");
App.chkRemoverMotivoPadrao(sec1.id, sec1.itens[0].id, 1);

// Hierarquia Projeto > Setor > Linha de vida — sem nenhum vinculo a maquina
// do Completo/Simplificado (removido de proposito, sao assuntos diferentes).
App.chkNovoProjeto();
const proj = STATE.checklists.projetos[0];
if(!proj) throw new Error("projeto nao foi criado");
App.chkSetProjetoField("empresa", "Cliente Teste Checklist");
App.chkSetProjetoField("responsavel", "Inspetor Teste");
App.chkSetProjetoField("solicitanteCpfCnpj", "000.000.000-00");
App.chkSetProjetoField("solicitanteEndereco", "Rod. Teste KM 1");
App.chkSetProjetoField("solicitanteCidade", "Rio Verde - GO");
App.chkSetProjetoField("solicitanteTelefone", "64 90000-0000");
App.chkSetProjetoField("solicitanteCargo", "Proprietario");
App.chkSetProjetoField("numeroDocumento", "MEC7.TESTE.001");
App.chkSetProjetoField("art", "1020260000000");
App.chkSetProjetoField("dataInspecao", "2026-09-01");
App.chkSetProjetoField("validadeInspecao", "2027-09-01");
App.chkSetProjetoField("inspetorNome", "Inspetor de Teste");
App.chkSetProjetoField("inspetorCargo", "Tecnico Mecanico");
App.chkSetProjetoField("objetivo", "Objetivo de teste da inspecao.");
App.chkSetProjetoField("conclusaoGeral", "Conclusao geral de teste.");
App.chkNovoSetor();
const setor = proj.setores[0];
if(!setor) throw new Error("setor nao foi criado");
App.chkSetSetorField("nome", "Silo 2");
App.chkSetNovaLinhaDraft("nome", "LV-014");
App.chkSetNovaLinhaDraft("modeloId", modelo.id);
App.chkCriarLinha();
const linha = setor.linhas[0];
if(!linha) throw new Error("linha de vida nao foi criada");

const item1 = linha.itens[0];
App.chkSetConforme(item1.itemId, "atende");
App.chkSetConforme(item1.itemId, "naoAtende");
App.chkAplicarMotivoPadrao(item1.itemId, "Ancoragem corroida");
App.chkSetObservacao(item1.itemId, "Parafuso frouxo, ajustado em campo");
item1.fotos.push({ foto: "data:image/jpeg;base64,ZZZZ", tags: [] });
App.chkToggleTagFoto(item1.itemId, 0, "Ajustar");
App.chkToggleTagFoto(item1.itemId, 0, "Risco");
App.chkToggleTagFoto(item1.itemId, 0, "Risco");
App.chkRemoverFoto(item1.itemId, 0);

App.chkToggleSecaoNA(linha.modeloSnapshot[1].id);
App.chkToggleSecaoNA(linha.modeloSnapshot[1].id);
App.chkIrSecao(1);
App.chkIrSecao(-1);

App.chkSetConclusao("Inspecao concluida sem pendencias criticas.");
App.chkFinalizar();
App.chkReabrirLinha();

// Segundo projeto/setor/linha e um segundo modelo, so pra exercitar exclusao
// em todos os niveis da hierarquia.
const modelo2 = novoChkModelo();
STATE.checklists.modelos.push(modelo2);
STATE.ui.chkModeloId = modelo2.id;
App.chkNovaSecao();
App.chkNovoItem(modelo2.secoes[0].id);
App.chkNovoProjeto();
const proj2 = STATE.checklists.projetos[1];
STATE.ui.chkProjetoId = proj2.id;
App.chkNovoSetor();
const setor2 = proj2.setores[0];
STATE.ui.chkSetorId = setor2.id;
App.chkSetNovaLinhaDraft("nome", "LV-999");
App.chkSetNovaLinhaDraft("modeloId", modelo2.id);
App.chkCriarLinha();
if(setor2.linhas.length !== 1) throw new Error("linha de vida do segundo setor nao foi criada");
App.chkExcluirLinha(setor2.linhas[0].id);
App.chkExcluirSetor(setor2.id);
App.chkExcluirProjeto(proj2.id);
App.chkExcluirModelo(modelo2.id);
STATE.ui.chkProjetoId = proj.id; STATE.ui.chkSetorId = setor.id;
App.chkRemoverSecao(sec2.id);
`;
vm.runInContext(operar, sandbox, { filename: "checklist-operacoes.js" });

// ---------- comparação byte a byte ----------
const depoisCompleto = JSON.stringify(sandbox.STATE.projetos);
const depoisSimples = JSON.stringify(sandbox.STATE.projetosSimples);

let falhou = false;
if(antesCompleto !== depoisCompleto){
  falhou = true;
  console.error("FALHOU: STATE.projetos (Modulo Completo) mudou depois de operar o Checklist");
  console.error("antes :", antesCompleto.slice(0, 400));
  console.error("depois:", depoisCompleto.slice(0, 400));
}
if(antesSimples !== depoisSimples){
  falhou = true;
  console.error("FALHOU: STATE.projetosSimples (Modulo Simplificado) mudou depois de operar o Checklist");
  console.error("antes :", antesSimples.slice(0, 400));
  console.error("depois:", depoisSimples.slice(0, 400));
}
if(falhou){ process.exit(1); }

// ---------- migração 1: STATE salvo por versão anterior ao Checklist (sem `checklists`) ----------
const estadoSemChecklists = {
  modulo: "checklist",
  projetos: JSON.parse(antesCompleto),
  projetosSimples: JSON.parse(antesSimples),
  ui: { screen: "checklist-modelos" },
  // sem "checklists" -- exatamente o formato salvo antes deste módulo existir
};
const antesMig1Completo = JSON.stringify(estadoSemChecklists.projetos);
const antesMig1Simples = JSON.stringify(estadoSemChecklists.projetosSimples);
vm.runInContext("chkGarantirNamespace(estadoSemChecklists);", Object.assign(sandbox, { estadoSemChecklists }), { filename: "checklist-migracao1.js" });

if(!estadoSemChecklists.checklists || !Array.isArray(estadoSemChecklists.checklists.modelos) || !Array.isArray(estadoSemChecklists.checklists.projetos)){
  console.error("FALHOU: chkGarantirNamespace nao criou STATE.checklists (modelos/projetos) num STATE sem a chave");
  process.exit(1);
}
if(estadoSemChecklists.ui.chkModeloId !== null || estadoSemChecklists.ui.chkProjetoId !== null
   || estadoSemChecklists.ui.chkSetorId !== null || estadoSemChecklists.ui.chkLinhaId !== null
   || estadoSemChecklists.ui.chkSecaoAtual !== 0){
  console.error("FALHOU: chkGarantirNamespace nao preencheu os ponteiros de ui do Checklist");
  process.exit(1);
}
if(JSON.stringify(estadoSemChecklists.projetos) !== antesMig1Completo || JSON.stringify(estadoSemChecklists.projetosSimples) !== antesMig1Simples){
  console.error("FALHOU: chkGarantirNamespace (sem checklists) mudou projetos/projetosSimples de um STATE antigo");
  process.exit(1);
}

// ---------- modelo pronto "Linhas de Vida (NR-35)": semeado sozinho, sem botão ----------
// Reaproveita o mesmo estadoSemChecklists (aparelho novo) que a migração 1
// acabou de rodar: já passou por UM chkGarantirNamespace, então já deveria
// ter recebido o modelo pronto.
const MODELO_PADRAO_ID = "chk-modelo-padrao-linhas-de-vida";
const modeloPadrao = estadoSemChecklists.checklists.modelos.find(m => m.id === MODELO_PADRAO_ID);
if(!modeloPadrao) throw new Error("modelo padrao Linhas de Vida nao foi semeado num aparelho novo");
if(modeloPadrao.secoes.length !== 9) throw new Error("modelo padrao deveria ter 9 secoes, tem " + modeloPadrao.secoes.length);
const totalItensPadrao = modeloPadrao.secoes.reduce((n, s) => n + s.itens.length, 0);
if(totalItensPadrao < 40) throw new Error("modelo padrao com poucos itens: " + totalItensPadrao);
if(modeloPadrao.secoes.some(s => s.itens.some(it => !it.motivosPadrao || !it.motivosPadrao.length)))
  throw new Error("algum item do modelo padrao ficou sem motivos padrao");
// Abrir o app de novo (segunda chamada) não duplica o modelo.
vm.runInContext("chkGarantirNamespace(estadoSemChecklists);", sandbox, { filename: "checklist-seed-2a-chamada.js" });
if(estadoSemChecklists.checklists.modelos.filter(m => m.id === MODELO_PADRAO_ID).length !== 1)
  throw new Error("modelo padrao duplicou numa segunda chamada de chkGarantirNamespace");
// Usuário decide apagar o modelo padrão -- não pode voltar sozinho depois.
estadoSemChecklists.checklists.modelos = estadoSemChecklists.checklists.modelos.filter(m => m.id !== MODELO_PADRAO_ID);
vm.runInContext("chkGarantirNamespace(estadoSemChecklists);", sandbox, { filename: "checklist-seed-3a-chamada.js" });
if(estadoSemChecklists.checklists.modelos.some(m => m.id === MODELO_PADRAO_ID))
  throw new Error("modelo padrao voltou sozinho depois de o usuario te-lo apagado");

// ---------- migração 2: STATE com o formato antigo (execuções em lista plana) ----------
const estadoExecucoesPlanas = {
  modulo: "checklist",
  projetos: JSON.parse(antesCompleto),
  projetosSimples: JSON.parse(antesSimples),
  checklists: {
    modelos: [],
    execucoes: [{ id: "exec-antiga", modeloId: "m-antigo", modeloNome: "Modelo antigo",
      modeloSnapshot: [], status: "finalizado", dataInicio: "2026-08-01", dataFinalizacao: "2026-08-02",
      secoesNA: [], itens: [], conclusaoTexto: "Texto antigo", empresaNome: "Empresa antiga",
      criadoEm: 1, atualizadoEm: 2 }],
  },
  ui: { screen: "checklist-modelos" },
};
const antesMig2Completo = JSON.stringify(estadoExecucoesPlanas.projetos);
const antesMig2Simples = JSON.stringify(estadoExecucoesPlanas.projetosSimples);
vm.runInContext("chkGarantirNamespace(estadoExecucoesPlanas);", Object.assign(sandbox, { estadoExecucoesPlanas }), { filename: "checklist-migracao2.js" });

if(estadoExecucoesPlanas.checklists.execucoes !== undefined){
  console.error("FALHOU: chkGarantirNamespace nao removeu o formato antigo (execucoes) apos migrar");
  process.exit(1);
}
const linhaMigrada = (estadoExecucoesPlanas.checklists.projetos[0] || {}).setores?.[0]?.linhas?.[0];
if(!linhaMigrada || linhaMigrada.id !== "exec-antiga" || linhaMigrada.conclusaoTexto !== "Texto antigo"){
  console.error("FALHOU: a execucao antiga (formato em lista plana) nao virou Linha de vida corretamente");
  process.exit(1);
}
if(JSON.stringify(estadoExecucoesPlanas.projetos) !== antesMig2Completo || JSON.stringify(estadoExecucoesPlanas.projetosSimples) !== antesMig2Simples){
  console.error("FALHOU: chkGarantirNamespace (execucoes antigas) mudou projetos/projetosSimples de um STATE antigo");
  process.exit(1);
}

console.log("ISOLAMENTO OK: STATE.projetos e STATE.projetosSimples byte a byte identicos apos criar/editar/salvar/vincular/finalizar/excluir na hierarquia Projeto>Setor>Linha do Checklist, e as duas migracoes de STATE antigo preenchem/reorganizam o namespace sem tocar nas duas arvores");
process.exit(0);
