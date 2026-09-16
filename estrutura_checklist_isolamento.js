/* Ensaio de isolamento do módulo Checklist — chamado por estrutura.py (seção
   138). Não é uma checagem estrutural de string: extrai as funções REAIS do
   módulo Checklist do arquivo entregue (mesma técnica de extração de
   testes2.js/banco.js — função por função, por chaves balanceadas, do texto
   do próprio index.html), monta um STATE de teste com dados já preenchidos
   de Módulo Completo (STATE.projetos) e Módulo Simplificado
   (STATE.projetosSimples), executa uma sequência real de operações do
   Checklist (criar modelo, editar seções/itens, motivos padrão, criar
   projeto → setor → linha de vida, marcar conformidade, motivo de múltipla
   escolha, observação, foto, tags, travas de confirmação, navegar entre
   seções por aba, marcar seção N/A, finalizar, reabrir, excluir), e compara
   byte a byte o JSON de STATE.projetos e STATE.projetosSimples antes e
   depois. Também confere as quatro migrações de chkGarantirNamespace (STATE
   sem `checklists`; STATE com o formato antigo de execuções em lista plana;
   modelo padrão semeado antes do texto padrão existir; linha com motivo
   único do formato antigo) sem tocar nas duas árvores.
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
function letEscalar(nome){
  // pra `let nome = valorSimples;` (null, string, numero...) -- diferente de
  // letObjeto(), que só sabe balancear {...}/[...].
  const re = new RegExp("\\n(let " + nome + "\\s*=\\s*[^;]+;)");
  const m = re.exec(HTML);
  if(!m) throw new Error("let escalar nao encontrado: " + nome);
  return m[1] + "\n";
}

// ---------- monta o código a testar, extraído de verdade do arquivo ----------
const FUNCOES = [
  "uid", "hoje", "ehFotoDataUrlPersist", "clonarCompartilhandoFotos",
  "agoraSync", "__carregarUltimoCarimbo",
  "novoChkModelo", "novoChkSecao", "novoChkItem", "chkModeloPadraoLinhasDeVida",
  "novoChkProjeto", "novoChkSetor", "novoChkLinha",
  "getCurrentChkModelo", "getCurrentChkProjeto", "getCurrentChkSetor", "getCurrentChkLinha",
  "chkItemExec", "chkContarStatus", "chkProgresso", "chkStatusAbaSecao", "chkStatusLinha",
  "chkTextoLaudoItem", "chkAbrirConfirmacao",
  "chkGarantirNamespace",
];
let fonte = "let __ultimoCarimboVisto = 0;\n";
fonte += "let __buscaAtual = '';\n"; // usado por chkAbrirSetor (lista de linhas) -- nao testado aqui, so pra nao faltar
fonte += constString("CHK_MODELO_PADRAO_ID");
fonte += letEscalar("__chkAcaoConfirmada");
for(const nome of FUNCOES) fonte += funcao(nome) + "\n";
fonte += letObjeto("__chkNovaLinhaDraft") + "\n";
fonte += letEscalar("__chkLinhasFiltro");
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
  ic: () => "",
  escapeHtml: (s) => String(s == null ? "" : s),
  abrirOverlay: () => {}, // chkAbrirConfirmacao chama isso pra "mostrar" o modal -- aqui só ignora o HTML e guarda a ação pendente, que é o que este ensaio testa
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
  ui: { chkModeloId: null, chkProjetoId: null, chkSetorId: null, chkLinhaId: null, chkSecaoAtual: 0, chkItemAberto: null },
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
App.chkSetItemField(sec1.id, sec1.itens[0].id, "textoAtende", "A ancoragem esta fixada corretamente, sem sinais de folga.");
App.chkSetItemField(sec1.id, sec1.itens[1].id, "descricao", "Verificar torque dos parafusos");
App.chkSetItemField(sec2.id, sec2.itens[0].id, "descricao", "Verificar integridade do cabo de aco");
App.chkSetItemField(sec2.id, sec2.itens[0].id, "textoAtende", "O cabo de aco esta integro, sem sinais de desgaste.");
App.chkRemoverItem(sec1.id, sec1.itens[1].id);
App.chkNovoMotivoPadrao(sec1.id, sec1.itens[0].id);
App.chkNovoMotivoPadrao(sec1.id, sec1.itens[0].id);
App.chkNovoMotivoPadrao(sec1.id, sec1.itens[0].id);
App.chkSetMotivoPadrao(sec1.id, sec1.itens[0].id, 0, "motivo", "Ancoragem corroida");
App.chkSetMotivoPadrao(sec1.id, sec1.itens[0].id, 0, "texto", "A ancoragem apresenta oxidacao avancada, comprometendo sua resistencia estrutural.");
App.chkSetMotivoPadrao(sec1.id, sec1.itens[0].id, 1, "motivo", "Ausencia de ancoragem");
App.chkSetMotivoPadrao(sec1.id, sec1.itens[0].id, 1, "texto", "Nao foi identificado ponto de ancoragem na estrutura avaliada.");
App.chkSetMotivoPadrao(sec1.id, sec1.itens[0].id, 2, "motivo", "Fixacao com folga");
App.chkSetMotivoPadrao(sec1.id, sec1.itens[0].id, 2, "texto", "A fixacao apresenta folga perceptivel ao manuseio.");
App.chkRemoverMotivoPadrao(sec1.id, sec1.itens[0].id, 2);

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
if(linha.itens[0].motivosSelecionados === undefined || !Array.isArray(linha.itens[0].motivosSelecionados))
  throw new Error("item novo da linha deveria nascer com motivosSelecionados como array");

const item1 = linha.itens[0];
App.chkSetConforme(item1.itemId, "atende");
App.chkSetConforme(item1.itemId, "naoAtende");
App.chkSelecionarMotivo(item1.itemId, "Ancoragem corroida");
App.chkSelecionarMotivo(item1.itemId, "Ausencia de ancoragem");
if(item1.motivosSelecionados.length !== 2)
  throw new Error("motivo de multipla escolha deveria aceitar os dois motivos selecionados: " + JSON.stringify(item1.motivosSelecionados));
App.chkSelecionarMotivo(item1.itemId, "Ancoragem corroida"); // seleciona nao atende de novo -- alterna (remove)
if(item1.motivosSelecionados.length !== 1 || item1.motivosSelecionados[0] !== "Ausencia de ancoragem")
  throw new Error("selecionar o mesmo motivo de novo deveria REMOVER (alternar), nao duplicar: " + JSON.stringify(item1.motivosSelecionados));
App.chkSelecionarMotivo(item1.itemId, "Ancoragem corroida"); // adiciona de volta -- fica com os dois outra vez
App.chkSetObservacao(item1.itemId, "Parafuso frouxo, ajustado em campo");
item1.fotos.push({ foto: "data:image/jpeg;base64,ZZZZ", tags: [] });
App.chkToggleTagFoto(item1.itemId, 0, "Ajustar");
App.chkToggleTagFoto(item1.itemId, 0, "Risco");
App.chkToggleTagFoto(item1.itemId, 0, "Risco");
App.chkRemoverFoto(item1.itemId, 0);

// Texto padrao do laudo: nunca aparece em campo (so o rotulo curto do motivo
// aparece na tela de preenchimento) -- prova que motivo de multipla escolha
// devolve o texto de CADA motivo selecionado (chkTextoLaudoItem agora sempre
// devolve array), com a mesma funcao usada de verdade por screenChkLaudo.
const item1Modelo = linha.modeloSnapshot[0].itens[0];
const textosItem1 = chkTextoLaudoItem(item1Modelo, item1);
if(!Array.isArray(textosItem1) || textosItem1.length !== 2)
  throw new Error("chkTextoLaudoItem deveria devolver os textos dos DOIS motivos selecionados em item1: " + JSON.stringify(textosItem1));
if(!textosItem1.includes("A ancoragem apresenta oxidacao avancada, comprometendo sua resistencia estrutural.") ||
   !textosItem1.includes("Nao foi identificado ponto de ancoragem na estrutura avaliada."))
  throw new Error("chkTextoLaudoItem nao recuperou os textos certos dos motivos selecionados em item1: " + JSON.stringify(textosItem1));

const item2 = linha.itens[1];
App.chkSetConforme(item2.itemId, "atende");
const item2Modelo = linha.modeloSnapshot[1].itens[0];
const textosItem2 = chkTextoLaudoItem(item2Modelo, item2);
if(!Array.isArray(textosItem2) || textosItem2.length !== 1 || textosItem2[0] !== "O cabo de aco esta integro, sem sinais de desgaste.")
  throw new Error("chkTextoLaudoItem deveria devolver array de 1 com o textoAtende de item2: " + JSON.stringify(textosItem2));

// Trava de seguranca: marcar item como "Nao aplica" pede confirmacao SEMPRE
// -- o estado so muda depois de App.chkConfirmarAcao() (simula o toque no
// botao "Marcar mesmo assim" do modal).
const item1AntesNA = JSON.stringify(item1);
App.chkSetConforme(item1.itemId, "na");
if(JSON.stringify(item1) !== item1AntesNA)
  throw new Error("marcar item como Nao aplica NAO deveria mudar nada antes de confirmar");
App.chkConfirmarAcao();
if(item1.conforme !== "na" || item1.motivosSelecionados.length !== 0)
  throw new Error("marcar item como Nao aplica nao aplicou depois de confirmado: " + JSON.stringify(item1));

// chkStatusAbaSecao/chkStatusLinha -- usados pra colorir aba de secao e card
// da lista de linhas de vida.
if(chkStatusAbaSecao(linha, linha.modeloSnapshot[0]) !== "completa")
  throw new Error("secao 1 (com o unico item respondido) deveria estar 'completa'");
if(chkStatusAbaSecao(linha, linha.modeloSnapshot[1]) !== "completa")
  throw new Error("secao 2 tem 1 unico item, ja respondido (atende) -- deveria estar 'completa'");
if(chkStatusLinha(linha) !== "andamento")
  throw new Error("linha com progresso >0% e nao finalizada deveria ser 'andamento'");

// Trava de seguranca: marcar SECAO como "Nao aplica" com item ja respondido
// pede confirmacao -- sec2 tem item2 respondido (atende).
const secoesNAAntes = linha.secoesNA.length;
App.chkToggleSecaoNA(linha.modeloSnapshot[1].id);
if(linha.secoesNA.length !== secoesNAAntes)
  throw new Error("marcar secao como Nao aplica com item respondido NAO deveria mudar nada antes de confirmar");
App.chkConfirmarAcao();
if(!linha.secoesNA.includes(linha.modeloSnapshot[1].id))
  throw new Error("marcar secao como Nao aplica nao aplicou depois de confirmado");
if(chkStatusAbaSecao(linha, linha.modeloSnapshot[1]) !== "naoaplica")
  throw new Error("secao marcada Nao aplica deveria ter status 'naoaplica' na aba");
App.chkToggleSecaoNA(linha.modeloSnapshot[1].id); // desliga de novo -- sem item respondido (foi resetado), sem trava

App.chkIrParaSecao(1);
App.chkIrParaSecao(0);

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
   || estadoSemChecklists.ui.chkSecaoAtual !== 0 || estadoSemChecklists.ui.chkItemAberto !== null){
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
// Cada item carrega texto padrao pra AMBOS os desfechos (atende / cada motivo
// de nao atende) -- e esse texto so aparece no laudo, nunca em campo. Aqui se
// confere que nada ficou esquecido e que a busca por rotulo (o mesmo caminho
// de screenChkLaudo, via chkTextoLaudoItem) realmente acha o texto certo —
// inclusive que nenhum item tem dois motivos com o mesmo rotulo (o que
// deixaria o texto de um deles inacessivel para quem preenche em campo).
if(modeloPadrao.secoes.some(s => s.itens.some(it => !it.textoAtende || !it.textoAtende.trim())))
  throw new Error("algum item do modelo padrao ficou sem textoAtende (texto padrao para quando o item atende)");
if(modeloPadrao.secoes.some(s => s.itens.some(it => it.motivosPadrao.some(mp => !mp.motivo || !mp.motivo.trim() || !mp.texto || !mp.texto.trim()))))
  throw new Error("algum motivo padrao do modelo padrao ficou sem rotulo (motivo) ou sem texto padrao (texto)");
modeloPadrao.secoes.forEach(s => s.itens.forEach(it => {
  const rotulos = it.motivosPadrao.map(mp => mp.motivo);
  if(new Set(rotulos).size !== rotulos.length)
    throw new Error('item "' + it.descricao + '" do modelo padrao tem motivos padrao com rotulo repetido -- o texto de um deles fica inacessivel');
}));
// chkTextoLaudoItem só existe dentro do sandbox (foi extraído pro `fonte` lá
// em cima) — roda aqui via vm, no mesmo contexto, pra provar de verdade que a
// busca por rótulo acha o texto certo de cada item/motivo do modelo padrão
// (agora sempre como array — devolve array de 1 pro motivo unico daqui).
vm.runInContext(`
(function(){
  const modeloPadrao = estadoSemChecklists.checklists.modelos.find(m => m.id === "${MODELO_PADRAO_ID}");
  modeloPadrao.secoes.forEach(s => s.itens.forEach(it => {
    it.motivosPadrao.forEach(mp => {
      const achado = chkTextoLaudoItem(it, { conforme: "naoAtende", motivosSelecionados: [mp.motivo] });
      if(!Array.isArray(achado) || achado.length !== 1 || achado[0] !== mp.texto)
        throw new Error('chkTextoLaudoItem nao recuperou o texto do motivo "' + mp.motivo + '" do item "' + it.descricao + '"');
    });
    const achadoAtende = chkTextoLaudoItem(it, { conforme: "atende" });
    if(!Array.isArray(achadoAtende) || achadoAtende.length !== 1 || achadoAtende[0] !== it.textoAtende)
      throw new Error('chkTextoLaudoItem nao recuperou o textoAtende do item "' + it.descricao + '"');
  }));
})();
`, sandbox, { filename: "checklist-validar-textos-modelo-padrao.js" });
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

// ---------- migração 3: upgrade do texto padrão em modelo semeado ANTES do
// recurso existir (motivosPadrao ainda em string[], sem textoAtende) --
// aparelho que abriu o Checklist entre o modelo nascer pronto e o texto
// padrão chegar (mesmo dia, janela de horas) ----------
const estadoModeloAntigo = {
  modulo: "checklist",
  projetos: JSON.parse(antesCompleto),
  projetosSimples: JSON.parse(antesSimples),
  checklists: { modelos: [], projetos: [] },
  ui: { chkModeloId: null, chkProjetoId: null, chkSetorId: null, chkLinhaId: null, chkSecaoAtual: 0,
        chkModeloPadraoAplicado: true }, // já tinha sido semeado antes -- não pode semear de novo
};
vm.runInContext(`
(function(){
  const atual = chkModeloPadraoLinhasDeVida();
  const antigo = JSON.parse(JSON.stringify(atual));
  antigo.secoes.forEach(s => s.itens.forEach(it => {
    delete it.textoAtende;
    it.motivosPadrao = it.motivosPadrao.map(mp => mp.motivo); // string[] -- formato de antes do recurso
  }));
  // Simula um rótulo editado à mão pelo usuário antes do recurso existir --
  // esse texto tem que sobreviver ao upgrade, nunca ser substituído.
  antigo.secoes[0].itens[0].motivosPadrao[0] = "Projeto NAO apresentado (editado pelo usuario)";
  estadoModeloAntigo.checklists.modelos.push(antigo);
})();
`, Object.assign(sandbox, { estadoModeloAntigo }), { filename: "checklist-migracao3-prep.js" });

const antesMig3Completo = JSON.stringify(estadoModeloAntigo.projetos);
const antesMig3Simples = JSON.stringify(estadoModeloAntigo.projetosSimples);
vm.runInContext("chkGarantirNamespace(estadoModeloAntigo);", sandbox, { filename: "checklist-migracao3.js" });

const modeloUpgradeado = estadoModeloAntigo.checklists.modelos.find(m => m.id === MODELO_PADRAO_ID);
if(!modeloUpgradeado) throw new Error("modelo antigo sumiu depois do upgrade de texto padrao");
if(modeloUpgradeado.secoes[0].itens[0].motivosPadrao[0].motivo !== "Projeto NAO apresentado (editado pelo usuario)")
  throw new Error("upgrade de texto padrao NAO preservou o rotulo de motivo editado pelo usuario");
if(!modeloUpgradeado.secoes[0].itens[0].motivosPadrao[0].texto)
  throw new Error("upgrade de texto padrao nao acrescentou o texto do motivo, mesmo com o rotulo editado preservado");
if(modeloUpgradeado.secoes.some(s => s.itens.some(it => !it.textoAtende || (it.motivosPadrao||[]).some(mp => typeof mp === "string"))))
  throw new Error("upgrade de texto padrao deixou algum item sem textoAtende ou com motivosPadrao ainda em string");
if(JSON.stringify(estadoModeloAntigo.projetos) !== antesMig3Completo || JSON.stringify(estadoModeloAntigo.projetosSimples) !== antesMig3Simples)
  throw new Error("upgrade de texto padrao do modelo antigo mudou projetos/projetosSimples de um STATE antigo");

// idempotente: abrir o app de novo (segunda chamada) nao muda mais nada.
const modeloAntesDaSegundaChamada = JSON.stringify(modeloUpgradeado);
vm.runInContext("chkGarantirNamespace(estadoModeloAntigo);", sandbox, { filename: "checklist-migracao3-2a-chamada.js" });
if(JSON.stringify(estadoModeloAntigo.checklists.modelos.find(m => m.id === MODELO_PADRAO_ID)) !== modeloAntesDaSegundaChamada)
  throw new Error("upgrade de texto padrao rodou de novo numa segunda chamada (deveria ser uma unica vez por aparelho)");

// controle negativo: se a ESTRUTURA do modelo antigo foi alterada pelo
// usuário (um item a menos numa seção), o upgrade tem que ficar de fora --
// pra não arriscar reescrever por cima de uma edição de verdade.
const estadoModeloEditado = {
  modulo: "checklist",
  projetos: JSON.parse(antesCompleto),
  projetosSimples: JSON.parse(antesSimples),
  checklists: { modelos: [], projetos: [] },
  ui: { chkModeloId: null, chkProjetoId: null, chkSetorId: null, chkLinhaId: null, chkSecaoAtual: 0,
        chkModeloPadraoAplicado: true },
};
vm.runInContext(`
(function(){
  const atual = chkModeloPadraoLinhasDeVida();
  const antigo = JSON.parse(JSON.stringify(atual));
  antigo.secoes.forEach(s => s.itens.forEach(it => {
    delete it.textoAtende;
    it.motivosPadrao = it.motivosPadrao.map(mp => mp.motivo);
  }));
  antigo.secoes[0].itens.pop(); // usuario removeu um item -- estrutura nao bate mais
  estadoModeloEditado.checklists.modelos.push(antigo);
})();
`, Object.assign(sandbox, { estadoModeloEditado }), { filename: "checklist-migracao3-editado-prep.js" });
vm.runInContext("chkGarantirNamespace(estadoModeloEditado);", sandbox, { filename: "checklist-migracao3-editado.js" });
const modeloEditadoDepois = estadoModeloEditado.checklists.modelos.find(m => m.id === MODELO_PADRAO_ID);
if(modeloEditadoDepois.secoes[0].itens.some(it => it.textoAtende || (it.motivosPadrao||[]).some(mp => typeof mp === "object")))
  throw new Error("upgrade de texto padrao mexeu num modelo cuja estrutura o usuario ja tinha alterado -- deveria ter ficado de fora");

// ---------- migração 4: linha de vida salva com o formato antigo de motivo
// único (motivoSelecionado: string|null) -- aparelho que preencheu um
// checklist antes do motivo de múltipla escolha existir ----------
const estadoMotivoAntigo = {
  modulo: "checklist",
  projetos: JSON.parse(antesCompleto),
  projetosSimples: JSON.parse(antesSimples),
  checklists: {
    modelos: [],
    projetos: [{
      id: "proj-antigo", empresa: "Empresa com linha antiga", responsavel: "", data: "2026-09-01",
      setores: [{
        id: "setor-antigo", nome: "Setor antigo", descricao: "", criadoEm: 1, atualizadoEm: 1,
        linhas: [{
          id: "linha-antiga", nome: "LV-ANTIGA", modeloId: "m-x", modeloNome: "Modelo x",
          modeloSnapshot: [], status: "em_andamento", dataInicio: "2026-09-01", dataFinalizacao: null,
          secoesNA: [],
          itens: [
            { itemId: "it1", conforme: "naoAtende", motivoSelecionado: "Motivo antigo escolhido em campo", observacao: "", fotos: [] },
            { itemId: "it2", conforme: "atende", motivoSelecionado: null, observacao: "", fotos: [] },
            { itemId: "it3", conforme: null, motivosSelecionados: [], observacao: "", fotos: [] }, // item que ja tinha sido migrado (idempotencia)
          ],
          conclusaoTexto: "", criadoEm: 1, atualizadoEm: 1,
        }],
      }],
      numeroDocumento: "", art: "", dataInspecao: "2026-09-01", validadeInspecao: "",
      solicitanteCpfCnpj: "", solicitanteEndereco: "", solicitanteCidade: "", solicitanteTelefone: "", solicitanteCargo: "", solicitanteEmail: "",
      inspetorNome: "", inspetorCargo: "", objetivo: "", conclusaoGeral: "",
      criadoEm: 1, atualizadoEm: 1,
    }],
  },
  ui: { screen: "checklist-modelos" },
};
const antesMig4Completo = JSON.stringify(estadoMotivoAntigo.projetos);
const antesMig4Simples = JSON.stringify(estadoMotivoAntigo.projetosSimples);
vm.runInContext("chkGarantirNamespace(estadoMotivoAntigo);", Object.assign(sandbox, { estadoMotivoAntigo }), { filename: "checklist-migracao4.js" });

const linhaAntigaMigrada = estadoMotivoAntigo.checklists.projetos[0].setores[0].linhas[0];
const [it1Mig, it2Mig, it3Mig] = linhaAntigaMigrada.itens;
if(!Array.isArray(it1Mig.motivosSelecionados) || it1Mig.motivosSelecionados.length !== 1 || it1Mig.motivosSelecionados[0] !== "Motivo antigo escolhido em campo")
  throw new Error("upgrade de motivo unico nao preservou o motivo ja escolhido em campo: " + JSON.stringify(it1Mig));
if(it1Mig.motivoSelecionado !== undefined)
  throw new Error("upgrade de motivo unico deveria ter removido o campo antigo motivoSelecionado");
if(!Array.isArray(it2Mig.motivosSelecionados) || it2Mig.motivosSelecionados.length !== 0)
  throw new Error("item sem motivo (null) deveria virar array vazio: " + JSON.stringify(it2Mig));
if(!Array.isArray(it3Mig.motivosSelecionados) || it3Mig.motivosSelecionados.length !== 0)
  throw new Error("item ja migrado (array) nao deveria ser mexido de novo: " + JSON.stringify(it3Mig));
if(JSON.stringify(estadoMotivoAntigo.projetos) !== antesMig4Completo || JSON.stringify(estadoMotivoAntigo.projetosSimples) !== antesMig4Simples)
  throw new Error("upgrade de motivo unico mudou projetos/projetosSimples de um STATE antigo");
// idempotente: segunda chamada nao mexe mais em nada.
const linhaAntesDaSegundaChamada = JSON.stringify(linhaAntigaMigrada);
vm.runInContext("chkGarantirNamespace(estadoMotivoAntigo);", sandbox, { filename: "checklist-migracao4-2a-chamada.js" });
if(JSON.stringify(estadoMotivoAntigo.checklists.projetos[0].setores[0].linhas[0]) !== linhaAntesDaSegundaChamada)
  throw new Error("upgrade de motivo unico rodou de novo numa segunda chamada (deveria ser uma unica vez por aparelho)");

console.log("ISOLAMENTO OK: STATE.projetos e STATE.projetosSimples byte a byte identicos apos criar/editar/salvar/vincular/finalizar/excluir na hierarquia Projeto>Setor>Linha do Checklist (motivo de multipla escolha, travas de confirmacao e abas de secao incluidos), e as quatro migracoes de STATE antigo (namespace ausente, execucoes em lista plana, modelo padrao sem texto padrao, e linha com motivo unico do formato antigo) preenchem/reorganizam/atualizam o namespace sem tocar nas duas arvores");
process.exit(0);
