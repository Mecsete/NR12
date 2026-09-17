/* Ensaio de isolamento do módulo Checklist — chamado por estrutura.py (seção
   138). Não é uma checagem estrutural de string: extrai as funções REAIS do
   módulo Checklist do arquivo entregue (mesma técnica de extração de
   testes2.js/banco.js — função por função, por chaves balanceadas, do texto
   do próprio index.html), monta um STATE de teste com dados já preenchidos
   de Módulo Completo (STATE.projetos) e Módulo Simplificado
   (STATE.projetosSimples), executa uma sequência real de operações do
   Checklist (criar modelo, editar seções/itens, motivos padrão, criar
   projeto → setor → linha de vida, marcar conformidade, motivo de múltipla
   escolha, observação, foto, travas de confirmação, navegar entre
   seções por aba, marcar seção N/A, finalizar, reabrir, excluir), e compara
   byte a byte o JSON de STATE.projetos e STATE.projetosSimples antes e
   depois. Também confere as cinco migrações de chkGarantirNamespace (STATE
   sem `checklists`; STATE com o formato antigo de execuções em lista plana;
   modelo padrão semeado antes do texto padrão existir; linha com motivo
   único do formato antigo; item de modelo sem o campo `info`) sem tocar nas
   duas árvores, que App.chkInfoItem (ⓘ da tela de preenchimento) lê a
   informação do item sempre do modeloSnapshot CONGELADO da linha, nunca do
   modelo vivo, e que a importação de modelo via XLSX (chkModeloXLSXLinhasParaSecoes,
   rodando por cima do baseIALerCelulas REAL sobre um <sheetData> montado à
   mão) reconhece linha de continuação (mais de um motivo por item), item
   sem motivo nenhum e linha órfã (motivo sem item aberto ainda), e só
   ACRESCENTA ao modelo — nunca mexe no que já existia.
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
function constObjeto(nome){
  // igual letObjeto(), só que pra `const nome = {...}`/`[...]` em vez de `let`.
  const re = new RegExp("\\nconst " + nome + "\\s*=");
  const m = re.exec(HTML);
  if(!m) throw new Error("const objeto/array nao encontrado: " + nome);
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
  throw new Error("nao fechou const: " + nome);
}

// ---------- monta o código a testar, extraído de verdade do arquivo ----------
const FUNCOES = [
  "uid", "hoje", "ehFotoDataUrlPersist", "clonarCompartilhandoFotos",
  "agoraSync", "__carregarUltimoCarimbo", "imgReg",
  "novoChkModelo", "novoChkSecao", "novoChkItem", "chkModeloPadraoLinhasDeVida",
  "novoChkProjeto", "novoChkSetor", "novoChkLinha",
  "getCurrentChkModelo", "getCurrentChkProjeto", "getCurrentChkSetor", "getCurrentChkLinha",
  "chkItemExec", "chkContarStatus", "chkProgresso", "chkStatusAbaSecao", "chkStatusLinha",
  "chkTextoLaudoItem", "chkAbrirConfirmacao",
  "chkGarantirNamespace",
  // Import/export de modelo via .xlsx: baseIATextosDe/baseIADesescapar são
  // dependência interna de baseIALerSst/baseIALerCelulas (leitura genérica de
  // célula/linha de planilha .xlsx já descompactada, construída pra
  // importação da IA e reaproveitada aqui tal como está — ver comentário de
  // chkModeloXLSXLinhasParaSecoes).
  "baseIATextosDe", "baseIADesescapar", "baseIALerSst", "baseIALerCelulas", "baseIANormalizarCabecalho",
  "chkModeloXLSXAcharCabecalho", "chkModeloXLSXLinhasParaSecoes", "chkModeloXLSXLinhasDoModelo",
  // Laudo narrativo (Modelo 3): funções puras que montam a narrativa por
  // seção, a numeração de fotos e a tabela-resumo do checklist -- nunca
  // guardam nada, só leem modelo+execução, mesmo espírito de chkTextoLaudoItem.
  "chkFotosDaSecao", "chkNarrativaSecao", "chkChecklistLinhaRows",
];
let fonte = "let __ultimoCarimboVisto = 0;\n";
fonte += "let __buscaAtual = '';\n"; // usado por chkAbrirSetor (lista de linhas) -- nao testado aqui, so pra nao faltar
fonte += "let __imgReg = [];\n"; // registro de fotos pra exibicao (imgReg/data-imgref) -- usado por App.chkInfoItem
fonte += constString("CHK_MODELO_PADRAO_ID");
fonte += letEscalar("__chkAcaoConfirmada");
fonte += constObjeto("CHK_MODELO_XLSX_COLUNAS") + "\n";
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
  abrirOverlay: (html) => { sandbox.__ultimoOverlayHtml = html; }, // chkAbrirConfirmacao/chkInfoItem chamam isso pra "mostrar" o modal -- guarda o HTML pra dar pra inspecionar o que teria sido exibido
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
  ui: { chkModeloId: null, chkProjetoId: null, chkSetorId: null, chkLinhaId: null, chkSecaoAtual: 0, chkItemAberto: null,
        chkModeloSecaoSel: null, chkModeloItemSel: null },
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

// Campo novo info (sem crase de proposito -- este bloco inteiro roda dentro
// de um template literal, ver mais abaixo) do item do MODELO (orientacao +
// fotos de referencia pro inspetor em campo, ver App.chkInfoItem) --
// aditivo, todo item novo ja nasce com ele, sem precisar de migracao de
// formato.
if(!sec1.itens[0].info || sec1.itens[0].info.texto !== "" || !Array.isArray(sec1.itens[0].info.fotos) || sec1.itens[0].info.fotos.length !== 0)
  throw new Error("item novo do MODELO deveria nascer com info:{texto:'',fotos:[]}: " + JSON.stringify(sec1.itens[0].info));
App.chkSelecionarModeloItem(sec1.id, sec1.itens[0].id);
if(STATE.ui.chkModeloSecaoSel !== sec1.id || STATE.ui.chkModeloItemSel !== sec1.itens[0].id)
  throw new Error("chkSelecionarModeloItem nao marcou a selecao da arvore do editor de modelo");
App.chkSetItemInfoTexto(sec1.id, sec1.itens[0].id, "Verificar torque com torquimetro calibrado.");
// Simula uma foto de referencia anexada no editor -- o upload de verdade via
// câmera/galeria usa File/DOM, fora do alcance deste ensaio de dados (mesma
// razão pela qual item1.fotos é preenchido direto mais abaixo, sem passar
// por App.chkTirarFoto).
sec1.itens[0].info.fotos.push({ foto: "data:image/jpeg;base64,INFOFOTO1" });
sec1.itens[0].info.fotos.push({ foto: "data:image/jpeg;base64,INFOFOTO2" });
App.chkInfoFotoRemover(sec1.id, sec1.itens[0].id, 0);
if(sec1.itens[0].info.fotos.length !== 1 || sec1.itens[0].info.fotos[0].foto !== "data:image/jpeg;base64,INFOFOTO2")
  throw new Error("chkInfoFotoRemover nao removeu a foto certa da info do item: " + JSON.stringify(sec1.itens[0].info.fotos));

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

// App.chkInfoItem (tela real de preenchimento) lê a informação do item do
// modeloSnapshot CONGELADO da linha, nunca do modelo "vivo" em
// STATE.checklists.modelos -- mesma regra que já vale pra descrição/motivos
// (ver comentário de novoChkLinha). Prova as duas pontas: o conteúdo certo
// aparece primeiro, e editar o modelo DEPOIS não vaza pra linha já criada.
App.chkInfoItem(item1.itemId);
if(!__ultimoOverlayHtml || !__ultimoOverlayHtml.includes("Verificar torque com torquimetro calibrado."))
  throw new Error("chkInfoItem nao mostrou o texto de info cadastrado no modelo no momento em que a linha foi criada");
if(!__ultimoOverlayHtml.includes('data-imgref="0"'))
  throw new Error("chkInfoItem nao mostrou a foto de info cadastrada no modelo (data-imgref)");
App.chkSetItemInfoTexto(sec1.id, sec1.itens[0].id, "Texto novo, editado no modelo DEPOIS da linha ja criada.");
__ultimoOverlayHtml = null;
App.chkInfoItem(item1.itemId);
if(__ultimoOverlayHtml.includes("Texto novo, editado no modelo DEPOIS"))
  throw new Error("chkInfoItem vazou a edicao do modelo VIVO pra linha ja criada -- deveria ter ficado congelado no modeloSnapshot");
if(!__ultimoOverlayHtml.includes("Verificar torque com torquimetro calibrado."))
  throw new Error("chkInfoItem deveria continuar mostrando o texto congelado no modeloSnapshot, mesmo apos editar o modelo vivo");

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

// Restaura o modelo em foco -- o teste do segundo modelo (excluido acima)
// deixou STATE.ui.chkModeloId apontando pra um modelo que nao existe mais.
STATE.ui.chkModeloId = modelo.id;

// Importar modelo via XLSX -- so a parte PURA (sem PizZip/DOM, ver
// App.chkImportarModeloXLSX) e testavel aqui: monta um <sheetData> minimo a
// mao (celulas t="inlineStr", sem precisar de tabela de strings), roda
// pelas funcoes REAIS extraidas (baseIALerCelulas -> chkModeloXLSXLinhasParaSecoes),
// e confere linha de continuacao (2 motivos pro mesmo item), item sem
// motivo nenhum, linha em branco ignorada, e motivo orfao (sem item aberto
// ainda) contado como invalida -- exatamente as regras do formato.
const modeloXlsxSheetXml = '<sheetData>' +
  '<row r="1"><c r="A1" t="inlineStr"><is><t>Seção</t></is></c><c r="B1" t="inlineStr"><is><t>Item</t></is></c><c r="C1" t="inlineStr"><is><t>Norma/Referência</t></is></c><c r="D1" t="inlineStr"><is><t>Motivo</t></is></c><c r="E1" t="inlineStr"><is><t>Texto do Motivo</t></is></c><c r="F1" t="inlineStr"><is><t>Texto Quando Atende</t></is></c><c r="G1" t="inlineStr"><is><t>Informação</t></is></c></row>' +
  '<row r="2"><c r="D2" t="inlineStr"><is><t>Motivo orfao (sem item aberto)</t></is></c></row>' +
  '<row r="3"><c r="A3" t="inlineStr"><is><t>Ancoragem Teste</t></is></c><c r="B3" t="inlineStr"><is><t>Pergunta teste 1?</t></is></c><c r="C3" t="inlineStr"><is><t>NBR-X</t></is></c><c r="D3" t="inlineStr"><is><t>Motivo 1</t></is></c><c r="E3" t="inlineStr"><is><t>Texto motivo 1</t></is></c><c r="F3" t="inlineStr"><is><t>Atende texto</t></is></c><c r="G3" t="inlineStr"><is><t>Info texto</t></is></c></row>' +
  '<row r="4"><c r="D4" t="inlineStr"><is><t>Motivo 2</t></is></c><c r="E4" t="inlineStr"><is><t>Texto motivo 2</t></is></c></row>' +
  '<row r="5"><c r="B5" t="inlineStr"><is><t>Pergunta teste 2 sem motivo?</t></is></c></row>' +
  '<row r="6"></row>' +
  '</sheetData>';
const linhasXlsx = baseIALerCelulas(modeloXlsxSheetXml, []);
const resultadoXlsx = chkModeloXLSXLinhasParaSecoes(linhasXlsx);
if(resultadoXlsx.erro) throw new Error("chkModeloXLSXLinhasParaSecoes nao reconheceu o cabecalho de teste");
if(resultadoXlsx.contagem.secoes !== 1 || resultadoXlsx.contagem.itens !== 2 || resultadoXlsx.contagem.motivos !== 2 || resultadoXlsx.contagem.linhasInvalidas !== 1)
  throw new Error("contagem do import de xlsx saiu errada: " + JSON.stringify(resultadoXlsx.contagem));
const secaoImportada = resultadoXlsx.secoes[0];
if(secaoImportada.titulo !== "Ancoragem Teste") throw new Error("titulo da secao importada errado: " + secaoImportada.titulo);
if(secaoImportada.itens.length !== 2) throw new Error("secao importada deveria ter 2 itens, tem " + secaoImportada.itens.length);
const [itImp1, itImp2] = secaoImportada.itens;
if(itImp1.descricao !== "Pergunta teste 1?" || itImp1.normativo !== "NBR-X" || itImp1.textoAtende !== "Atende texto" || itImp1.info.texto !== "Info texto")
  throw new Error("item 1 importado com campo errado: " + JSON.stringify(itImp1));
if(itImp1.motivosPadrao.length !== 2 || itImp1.motivosPadrao[0].motivo !== "Motivo 1" || itImp1.motivosPadrao[1].motivo !== "Motivo 2" || itImp1.motivosPadrao[1].texto !== "Texto motivo 2")
  throw new Error("motivos do item 1 importado (linha de continuacao) sairam errados: " + JSON.stringify(itImp1.motivosPadrao));
if(itImp2.descricao !== "Pergunta teste 2 sem motivo?" || itImp2.motivosPadrao.length !== 0)
  throw new Error("item 2 importado (sem motivo nenhum) saiu errado: " + JSON.stringify(itImp2));
// Aplica pelo método REAL (App.chkAplicarImportModeloXLSX, chamado pelo
// listener do input de arquivo) -- não reimplementa "só acrescenta" aqui:
// chama o mesmo código que roda de verdade, pra sabotagem nele ser pega.
const secoesAntesImport = modelo.secoes.length;
const itensAntesImport = JSON.stringify(modelo.secoes);
const msgImport = App.chkAplicarImportModeloXLSX(resultadoXlsx);
if(!msgImport || !msgImport.includes("1 seção") || !msgImport.includes("2 itens") || !msgImport.includes("2 motivos") || !msgImport.includes("1 linha"))
  throw new Error("mensagem de retorno da importacao nao bate com a contagem esperada: " + JSON.stringify(msgImport));
if(modelo.secoes.length !== secoesAntesImport + 1)
  throw new Error("import de xlsx nao ACRESCENTOU exatamente uma secao nova ao modelo: tinha " + secoesAntesImport + ", ficou com " + modelo.secoes.length);
if(JSON.stringify(modelo.secoes.slice(0, secoesAntesImport)) !== itensAntesImport)
  throw new Error("import de xlsx mexeu nas secoes que ja existiam no modelo, deveria so ter acrescentado");
if(modelo.secoes[secoesAntesImport].titulo !== "Ancoragem Teste")
  throw new Error("secao importada nao foi acrescentada no modelo");
// Sem resultado (aba sem cabecalho reconhecivel) nao aplica nada e devolve null.
if(App.chkAplicarImportModeloXLSX(null) !== null)
  throw new Error("chkAplicarImportModeloXLSX deveria devolver null quando nao ha resultado (arquivo nao reconhecido)");
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

// ---------- migração 5 (aditiva): campo `info` do item do MODELO (texto +
// fotos de referência pro inspetor) -- item de modelo salvo ANTES deste
// campo existir não tem `info` nenhum; diferente das migrações 1-4 acima,
// não há formato antigo pra CONVERTER, só um campo ausente pra ACRESCENTAR
// -- por isso roda em toda chamada, sem flag "uma vez" (idempotente por
// natureza: uma vez presente, a condição nunca mais é verdadeira) ----------
const estadoSemInfo = {
  modulo: "checklist",
  projetos: JSON.parse(antesCompleto),
  projetosSimples: JSON.parse(antesSimples),
  checklists: {
    modelos: [{
      id: "modelo-sem-info", nome: "Modelo antigo sem info", descricao: "", criadoEm: 1, atualizadoEm: 1,
      secoes: [{
        id: "sec-sem-info", titulo: "Secao", itens: [
          { id: "item-sem-info", normativo: "", descricao: "Item sem info nenhum (formato anterior a este campo)", textoAtende: "", motivosPadrao: [] },
          { id: "item-com-info", normativo: "", descricao: "Item que ja tinha info preenchido", textoAtende: "", motivosPadrao: [],
            info: { texto: "Info ja cadastrada, nao pode ser sobrescrita", fotos: [{ foto: "data:image/jpeg;base64,JAEXISTIA" }] } },
        ],
      }],
    }],
    projetos: [],
  },
  ui: { screen: "checklist-modelos" },
};
const antesMigInfoCompleto = JSON.stringify(estadoSemInfo.projetos);
const antesMigInfoSimples = JSON.stringify(estadoSemInfo.projetosSimples);
vm.runInContext("chkGarantirNamespace(estadoSemInfo);", Object.assign(sandbox, { estadoSemInfo }), { filename: "checklist-migracao-info.js" });

const [itemSemInfoMigrado, itemComInfoMigrado] = estadoSemInfo.checklists.modelos[0].secoes[0].itens;
if(!itemSemInfoMigrado.info || itemSemInfoMigrado.info.texto !== "" || !Array.isArray(itemSemInfoMigrado.info.fotos) || itemSemInfoMigrado.info.fotos.length !== 0)
  throw new Error("migracao aditiva nao acrescentou info:{texto:'',fotos:[]} no item que nao tinha: " + JSON.stringify(itemSemInfoMigrado));
if(itemComInfoMigrado.info.texto !== "Info ja cadastrada, nao pode ser sobrescrita" || itemComInfoMigrado.info.fotos.length !== 1)
  throw new Error("migracao aditiva MEXEU num item que ja tinha info (deveria ter ficado intocado): " + JSON.stringify(itemComInfoMigrado));
if(JSON.stringify(estadoSemInfo.projetos) !== antesMigInfoCompleto || JSON.stringify(estadoSemInfo.projetosSimples) !== antesMigInfoSimples)
  throw new Error("migracao aditiva do campo info mudou projetos/projetosSimples de um STATE antigo");
// idempotente: segunda chamada nao mexe mais em nada (nem no item que acabou de ganhar info).
const itemSemInfoAntesDaSegunda = JSON.stringify(itemSemInfoMigrado);
vm.runInContext("chkGarantirNamespace(estadoSemInfo);", sandbox, { filename: "checklist-migracao-info-2a-chamada.js" });
if(JSON.stringify(estadoSemInfo.checklists.modelos[0].secoes[0].itens[0]) !== itemSemInfoAntesDaSegunda)
  throw new Error("migracao aditiva do campo info rodou de novo na segunda chamada e mudou o item");

// ---------- exportar modelo via XLSX (chkModeloXLSXLinhasDoModelo) e
// reimportar (chkModeloXLSXLinhasParaSecoes) -- prova que as duas funções
// são inversas de verdade: serializa um modelo com um item de 2 motivos,
// um item sem motivo e uma SEÇÃO VAZIA (sem item nenhum), converte pra XML
// mínimo (mesma leitura real de célula/linha, baseIALerCelulas) e confere
// que volta exatamente a mesma estrutura -- rodando por cima das funções
// REAIS extraídas, não reimplementando a serialização aqui. ----------
vm.runInContext(`
(function(){
  function colLetraTeste(n){ let s=""; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
  function escXmlTeste(v){ return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function linhasParaSheetDataXmlTeste(linhasArr){
    let xml = "<sheetData>";
    linhasArr.forEach((linha, idx)=>{
      const rn = idx+1;
      let cells = "";
      linha.forEach((v,ci)=>{
        if(!v) return;
        cells += '<c r="'+colLetraTeste(ci+1)+rn+'" t="inlineStr"><is><t>'+escXmlTeste(v)+'</t></is></c>';
      });
      xml += '<row r="'+rn+'">'+cells+'</row>';
    });
    return xml + "</sheetData>";
  }

  const modeloExport = novoChkModelo();
  const secA = novoChkSecao(); secA.titulo = "Seção com itens";
  const itA1 = novoChkItem();
  itA1.descricao = "Item A1, com dois motivos?";
  itA1.normativo = "NORMA-A1";
  itA1.textoAtende = "Texto de atende do item A1.";
  itA1.info = { texto: "Info do item A1.", fotos: [] };
  itA1.motivosPadrao = [ { motivo: "Motivo X", texto: "Texto do motivo X." }, { motivo: "Motivo Y", texto: "Texto do motivo Y." } ];
  const itA2 = novoChkItem();
  itA2.descricao = "Item A2, sem motivo nenhum?";
  secA.itens = [itA1, itA2];
  const secVazia = novoChkSecao(); secVazia.titulo = "Seção vazia (sem item)";
  modeloExport.secoes = [secA, secVazia];

  const linhasExportadas = chkModeloXLSXLinhasDoModelo(modeloExport);
  const cabecalho = ["Seção","Item","Norma/Referência","Motivo","Texto do Motivo","Texto Quando Atende","Informação"];
  const xmlGerado = linhasParaSheetDataXmlTeste([cabecalho, ...linhasExportadas]);
  const linhasRelidas = baseIALerCelulas(xmlGerado, []);
  const resultadoRoundTrip = chkModeloXLSXLinhasParaSecoes(linhasRelidas);
  if(resultadoRoundTrip.erro) throw new Error("exportar+reimportar modelo: cabecalho gerado nao foi reconhecido de volta");
  if(resultadoRoundTrip.contagem.secoes !== 2 || resultadoRoundTrip.contagem.itens !== 2 || resultadoRoundTrip.contagem.motivos !== 2)
    throw new Error("exportar+reimportar modelo: contagem nao bateu -- " + JSON.stringify(resultadoRoundTrip.contagem));
  const [secARelida, secVaziaRelida] = resultadoRoundTrip.secoes;
  if(secARelida.titulo !== "Seção com itens" || secARelida.itens.length !== 2)
    throw new Error("exportar+reimportar modelo: primeira secao voltou errada -- " + JSON.stringify(secARelida));
  const [itA1Relido, itA2Relido] = secARelida.itens;
  if(itA1Relido.descricao !== itA1.descricao || itA1Relido.normativo !== itA1.normativo || itA1Relido.textoAtende !== itA1.textoAtende || itA1Relido.info.texto !== itA1.info.texto)
    throw new Error("exportar+reimportar modelo: campos do item A1 nao bateram -- " + JSON.stringify(itA1Relido));
  if(itA1Relido.motivosPadrao.length !== 2 || itA1Relido.motivosPadrao[0].motivo !== "Motivo X" || itA1Relido.motivosPadrao[1].motivo !== "Motivo Y" || itA1Relido.motivosPadrao[1].texto !== "Texto do motivo Y.")
    throw new Error("exportar+reimportar modelo: motivos do item A1 (linha de continuacao) nao bateram -- " + JSON.stringify(itA1Relido.motivosPadrao));
  if(itA2Relido.descricao !== itA2.descricao || itA2Relido.motivosPadrao.length !== 0)
    throw new Error("exportar+reimportar modelo: item A2 (sem motivo) nao bateu -- " + JSON.stringify(itA2Relido));
  if(secVaziaRelida.titulo !== "Seção vazia (sem item)" || secVaziaRelida.itens.length !== 0)
    throw new Error("exportar+reimportar modelo: secao vazia nao bateu -- " + JSON.stringify(secVaziaRelida));
})();
`, sandbox, { filename: "checklist-export-xlsx-roundtrip.js" });

// ---------- laudo narrativo (Modelo 3): chkFotosDaSecao/chkNarrativaSecao/
// chkChecklistLinhaRows -- modelo+linha construídos do zero (não reaproveita
// o `modelo`/`item1` do operar principal, que por essa altura já foi
// marcado "não aplica" pelas travas de confirmação testadas antes; aqui
// preciso de um item "atende", um "não atende" com foto, e um "não aplica"
// bem definidos, sem depender do estado final daquela sequência). ----------
vm.runInContext(`
(function(){
  const modeloTeste = novoChkModelo();
  const secTeste = novoChkSecao();
  secTeste.titulo = "Ancoragem Teste";
  secTeste.contexto = "Contexto de teste da seção.";
  const itA = novoChkItem();
  itA.descricao = "Item OK"; itA.normativo = "NORMA-A"; itA.textoAtende = "Texto de atende A.";
  const itB = novoChkItem();
  itB.descricao = "Item NOK"; itB.normativo = "NORMA-B";
  itB.motivosPadrao = [{ motivo: "Motivo 1", texto: "Texto do motivo 1." }];
  const itC = novoChkItem();
  itC.descricao = "Item nao aplica"; itC.normativo = "NORMA-C"; itC.textoAtende = "Nunca deveria aparecer na narrativa nem na tabela.";
  secTeste.itens = [itA, itB, itC];
  modeloTeste.secoes = [secTeste];

  const linhaTeste = novoChkLinha(modeloTeste);
  const ieA = linhaTeste.itens.find(i=>i.itemId===itA.id); ieA.conforme = "atende";
  const ieB = linhaTeste.itens.find(i=>i.itemId===itB.id); ieB.conforme = "naoAtende"; ieB.motivosSelecionados = ["Motivo 1"]; ieB.fotos = [{ foto: "data:image/jpeg;base64,FOTOB" }];
  const ieC = linhaTeste.itens.find(i=>i.itemId===itC.id); ieC.conforme = "na";

  const { fotos: fotosSecao, porItem } = chkFotosDaSecao(secTeste, linhaTeste);
  if(fotosSecao.length !== 1 || fotosSecao[0] !== "data:image/jpeg;base64,FOTOB")
    throw new Error("chkFotosDaSecao nao achou a foto certa: " + JSON.stringify(fotosSecao));
  if(!porItem[itB.id] || porItem[itB.id].length !== 1 || porItem[itB.id][0] !== 1)
    throw new Error("chkFotosDaSecao nao numerou a foto do item B certo: " + JSON.stringify(porItem));
  if(porItem[itA.id])
    throw new Error("chkFotosDaSecao nao deveria ter entrada pro item A, que nao tem foto nenhuma");

  const { html: narrHtml, fotos: narrFotos } = chkNarrativaSecao(secTeste, linhaTeste);
  if(!narrHtml.includes("Texto de atende A."))
    throw new Error("narrativa nao incluiu o texto do item atende: " + narrHtml);
  if(narrHtml.includes('<mark class="nc">Texto de atende A.'))
    throw new Error("narrativa destacou (mark) um item que ATENDE -- so nao atende deveria ficar destacado: " + narrHtml);
  if(!narrHtml.includes('<mark class="nc">Texto do motivo 1. (Foto 1)</mark>'))
    throw new Error("narrativa nao destacou o item nao atende com a citacao da foto certa: " + narrHtml);
  if(narrHtml.includes("Nunca deveria aparecer"))
    throw new Error("narrativa incluiu texto de um item marcado nao aplica, que nao deveria aparecer: " + narrHtml);
  if(narrFotos.length !== 1)
    throw new Error("chkNarrativaSecao devolveu lista de fotos errada: " + JSON.stringify(narrFotos));

  const rows = chkChecklistLinhaRows(linhaTeste);
  if(rows.length !== 2)
    throw new Error("tabela do checklist deveria ter 2 linhas (excluindo o item nao aplica): " + JSON.stringify(rows));
  if(rows[0].status !== "atende" || rows[0].normativo !== "NORMA-A" || rows[1].status !== "naoAtende" || rows[1].normativo !== "NORMA-B")
    throw new Error("linhas da tabela do checklist sairam com o conteudo errado: " + JSON.stringify(rows));
})();
`, sandbox, { filename: "checklist-laudo-narrativo.js" });

// ---------- migração aditiva: secao.contexto (modelo) e linha.descricao
// (linha) -- mesmo espírito da migração do campo info: sem formato antigo
// pra converter, só acrescenta quando falta ----------
const estadoSemContextoDescricao = {
  modulo: "checklist",
  projetos: JSON.parse(antesCompleto),
  projetosSimples: JSON.parse(antesSimples),
  checklists: {
    modelos: [{
      id: "modelo-sem-contexto", nome: "Modelo sem contexto", descricao: "", criadoEm: 1, atualizadoEm: 1,
      secoes: [
        { id: "sec-sem-contexto", titulo: "Secao sem contexto", itens: [] },
        { id: "sec-com-contexto", titulo: "Secao com contexto", itens: [], contexto: "Contexto ja cadastrado, nao pode ser sobrescrito" },
      ],
    }],
    projetos: [{
      id: "proj-sem-descricao", empresa: "Empresa X", responsavel: "", data: "2026-09-17",
      setores: [{ id: "setor-x", nome: "Setor X", descricao: "", criadoEm: 1, atualizadoEm: 1,
        linhas: [
          { id: "linha-sem-descricao", nome: "LV-SEM-DESC", modeloId: "m-x", modeloNome: "M", modeloSnapshot: [], status: "em_andamento", dataInicio: "2026-09-17", dataFinalizacao: null, secoesNA: [], itens: [], conclusaoTexto: "", criadoEm: 1, atualizadoEm: 1 },
          { id: "linha-com-descricao", nome: "LV-COM-DESC", modeloId: "m-x", modeloNome: "M", modeloSnapshot: [], status: "em_andamento", dataInicio: "2026-09-17", dataFinalizacao: null, secoesNA: [], itens: [], conclusaoTexto: "", descricao: "Descricao ja cadastrada, nao pode ser sobrescrita", criadoEm: 1, atualizadoEm: 1 },
        ],
      }],
      numeroDocumento: "", art: "", dataInspecao: "2026-09-17", validadeInspecao: "",
      solicitanteCpfCnpj: "", solicitanteEndereco: "", solicitanteCidade: "", solicitanteTelefone: "", solicitanteCargo: "", solicitanteEmail: "",
      inspetorNome: "", inspetorCargo: "", objetivo: "", conclusaoGeral: "",
      criadoEm: 1, atualizadoEm: 1,
    }],
  },
  ui: { screen: "checklist-modelos" },
};
const antesMigCDCompleto = JSON.stringify(estadoSemContextoDescricao.projetos);
const antesMigCDSimples = JSON.stringify(estadoSemContextoDescricao.projetosSimples);
vm.runInContext("chkGarantirNamespace(estadoSemContextoDescricao);", Object.assign(sandbox, { estadoSemContextoDescricao }), { filename: "checklist-migracao-contexto-descricao.js" });

const [secSemCtx, secComCtx] = estadoSemContextoDescricao.checklists.modelos[0].secoes;
if(secSemCtx.contexto !== "")
  throw new Error("migracao aditiva nao deu contexto vazio pra secao sem contexto: " + JSON.stringify(secSemCtx));
if(secComCtx.contexto !== "Contexto ja cadastrado, nao pode ser sobrescrito")
  throw new Error("migracao aditiva MEXEU num contexto ja cadastrado (deveria ter ficado intocado): " + JSON.stringify(secComCtx));

const [linhaSemDesc, linhaComDesc] = estadoSemContextoDescricao.checklists.projetos[0].setores[0].linhas;
if(linhaSemDesc.descricao !== "")
  throw new Error("migracao aditiva nao deu descricao vazia pra linha sem descricao: " + JSON.stringify(linhaSemDesc));
if(linhaComDesc.descricao !== "Descricao ja cadastrada, nao pode ser sobrescrita")
  throw new Error("migracao aditiva MEXEU numa descricao ja cadastrada (deveria ter ficado intocada): " + JSON.stringify(linhaComDesc));

if(JSON.stringify(estadoSemContextoDescricao.projetos) !== antesMigCDCompleto || JSON.stringify(estadoSemContextoDescricao.projetosSimples) !== antesMigCDSimples)
  throw new Error("migracao aditiva de contexto/descricao mudou projetos/projetosSimples de um STATE antigo");
// idempotente: segunda chamada nao mexe mais em nada.
const secSemCtxAntes = JSON.stringify(secSemCtx);
const linhaSemDescAntes = JSON.stringify(linhaSemDesc);
vm.runInContext("chkGarantirNamespace(estadoSemContextoDescricao);", sandbox, { filename: "checklist-migracao-contexto-descricao-2a.js" });
if(JSON.stringify(secSemCtx) !== secSemCtxAntes || JSON.stringify(linhaSemDesc) !== linhaSemDescAntes)
  throw new Error("migracao aditiva de contexto/descricao rodou de novo na segunda chamada");

console.log("ISOLAMENTO OK: STATE.projetos e STATE.projetosSimples byte a byte identicos apos criar/editar/salvar/vincular/finalizar/excluir na hierarquia Projeto>Setor>Linha do Checklist (motivo de multipla escolha, travas de confirmacao, abas de secao, o painel dividido do editor de modelo com info/foto por item, a importacao de modelo via XLSX -- linha de continuacao, item sem motivo e linha orfa incluidos -- o roundtrip exportar/reimportar modelo via XLSX incluindo secao vazia, e o laudo narrativo -- narrativa com destaque e citacao de foto do item nao atende, item nao aplica fora da narrativa e da tabela do checklist), e as seis migracoes de STATE antigo (namespace ausente, execucoes em lista plana, modelo padrao sem texto padrao, linha com motivo unico do formato antigo, item de modelo sem o campo info, e secao/linha sem contexto/descricao do laudo narrativo) preenchem/reorganizam/atualizam o namespace sem tocar nas duas arvores");
process.exit(0);
