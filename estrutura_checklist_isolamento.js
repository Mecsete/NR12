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
  // Foto ampla da linha: só o HTML do campo é função pura/extraível; a captura
  // (App.chkFotoAmplaAdicionar/Remover) roda de verdade abaixo com um input de
  // arquivo e um comprimirImagem de mentira.
  "chkFotoAmplaHtml",
  // O que falta num item (nao atende: motivo/nota/foto; nao aplica: foto) -- base da trava ao fechar.
  "chkPendenciasItem",
  "chkPrioridadeValida", "chkPrioridadeItem", "chkPrioridadeRotulo", "chkPrioridadeDeTexto", "chkTipoLinha", "chkTipoHorizontal", "chkRotuloTipoLinha", "chkCitarFotos",
  // Laudo em capitulos (linha de vida): so as funcoes puras -- a montagem do
  // DOM (medidor, fotos reduzidas, impressao) fica fora deste ensaio de dados.
  "chkDataExtenso", "lclEsc", "lclTemFoto", "lclCfg", "lclTextos", "lclResultado", "lclSecoesCorpo", "lclPlano",
  "lclMaisMeses", "lclProximaInspecao", "lclDados", "lclDonut", "lclSbar", "lclFaixa", "lclParagrafos", "lclMarca",
  "lclBlocoCapa", "lclBlocosPagina2", "lclBlocosSumario", "lclBlocosMetodologia", "lclBlocosChecklist", "lclBlocosCorpo",
  "lclBlocosConclusao", "lclMontarBlocos", "lclPaginar", "lclAncoras", "lclRodapeTexto", "lclRodapeHtml", "lclMontarDoc",
  // Memorial ZLQ (campo + calculo) e fotos por motivo: funcoes puras e o HTML do campo.
  "chkMemorialNum", "chkMemorialDe", "chkTotalAbas", "chkMemorialFaltas", "chkMemorialAtivo", "chkStatusAbaMemorial", "chkMemFmt",
  "chkMemorialCalc", "chkMemorialVeredito", "chkMemorialLegenda", "chkMemorialCondicoes", "chkMemorialPremissas", "chkMemorialParecer",
  "chkMemorialFormulas", "chkMemorialTabelas", "chkMemorialAvatar", "chkMemorialFigura", "chkMemorialVivoHtml", "chkMemorialCampoHtml",
  "chkCaboRuptura", "chkMemDiam", "chkMemorialDiametroMin", "chkMemorialAlertas", "chkMemorialFormulasLista", "chkMemorialPassoHtml", "chkMemorialRedesenhar",
  "chkCartaoFoto", "chkFotosItemHtml",
  // Capitulos novos: parecer, quadro de nao conformidades, Metodologia, Memorial, Anexos.
  "lclItemModeloAtual", "lclPrioridade", "lclAcaoMotivo", "lclNaoConformidades", "lclParecerAuto", "lclParecer",
  "lclListaPt", "lclVariaveis", "lclAplicarVariaveis", "lclMarkup", "lclBlocosMemorial", "lclBlocosAnexos", "lclListaImagensHtml",
  "chkRenderItem", "screenChkPreencher", "screenChkFinalizar", "chkResumoHtml",
  "lclTextoEditado", "lclHtmlParaTexto", "lclTextoParaHtml", "lclConclusaoAuto", "lclFotosSecaoHtml", "lclNumItem",
  // Cadastro do projeto: mascaras, validade automatica e cadastro de inspetores.
  "chkSoDigitos", "chkMascaraDocumento", "chkMascaraTelefone", "chkExibirDocumento", "chkExibirTelefone", "chkValidarCpf", "chkValidarCnpj",
  "chkAvisoDocumento", "chkMaisMesesISO", "chkOpcoesInspetor", "novoChkInspetor", "chkInspetoresHtml", "screenChkProjetoForm",
  // Editor de modelo (Modelo 3, linhas de fluxo): lista com busca/secoes abertas e o item aberto.
  "chkBuscaNorm", "chkModeloSvg", "chkAutoAltura", "chkModeloAjustarAlturas", "chkModeloRedesenhar", "chkModeloPreviaPergunta",
  "chkModeloPainelAberto", "chkModeloSecAberta", "chkMostrarItemAberto", "screenChkLinhas", "lclDataBR", "chkModeloResetTela", "chkModeloArvoreHtml", "getChkModeloSelecao", "screenChkModeloForm",
];
let fonte = "let __ultimoCarimboVisto = 0;\n";
fonte += "let __buscaAtual = '';\n"; // usado por chkAbrirSetor (lista de linhas) -- nao testado aqui, so pra nao faltar
fonte += "let __imgReg = [];\n"; // registro de fotos pra exibicao (imgReg/data-imgref) -- usado por App.chkInfoItem
fonte += constString("CHK_MODELO_PADRAO_ID");
fonte += letEscalar("__chkAcaoConfirmada");
fonte += constObjeto("CHK_MODELO_XLSX_COLUNAS") + "\n";
fonte += constObjeto("CHK_MESES") + "\n";
fonte += constObjeto("CHK_PRIORIDADES") + "\n";
fonte += constObjeto("CHK_PRIORIDADE_SECAO_PADRAO") + "\n";
fonte += constObjeto("CHK_TIPOS_LINHA") + "\n";
fonte += constObjeto("CHK_MEMORIAL_PARAMS") + "\n";
fonte += constObjeto("CHK_MEMORIAL_PARAMS_ROT") + "\n";
fonte += constObjeto("CHK_MEMORIAL_VIGA") + "\n";
fonte += constObjeto("CHK_MEMORIAL_CAMPOS") + "\n";
fonte += constObjeto("CHK_MEMORIAL_LIMITES") + "\n";
fonte += constObjeto("CHK_CABOS") + "\n";
fonte += constObjeto("LCL_PARECERES") + "\n";
fonte += constObjeto("LCL_PRI_COR") + "\n";
fonte += constObjeto("LCL_METODOLOGIA_PADRAO") + "\n";
fonte += constObjeto("LCL_METODOLOGIA_VARIAVEIS") + "\n";
fonte += constObjeto("CHK_STATUS_META") + "\n";
fonte += constObjeto("LCL_COR") + "\n";
fonte += constObjeto("LCL_CAPITULOS") + "\n";
fonte += constObjeto("LCL_NORMATIVO_PADRAO") + "\n";
fonte += letObjeto("__lclPaginas") + "\n";
fonte += letEscalar("__lclHtml");
fonte += letObjeto("__lclEdit") + "\n";
fonte += letEscalar("__lclFotosSec");
fonte += letObjeto("__lclMetDraft") + "\n";
fonte += letEscalar("__lclParaLinha");
fonte += letEscalar("__lclOrigem");
// escapeHtml DE VERDADE (o laudo escapa o que a pessoa digita e o ensaio precisa ver isso). O extrator
// por nome se perde com as aspas dentro da expressao regular dela, entao pega pelo fim da funcao.
const mEsc = /\nfunction escapeHtml\(s\)\{[\s\S]*?\n\}\n/.exec(HTML);
if(!mEsc) throw new Error("escapeHtml nao encontrada");
fonte += mEsc[0];
for(const nome of FUNCOES) fonte += funcao(nome) + "\n";
fonte += letObjeto("__chkNovaLinhaDraft") + "\n";
fonte += letEscalar("__chkLinhasFiltro");
fonte += letEscalar("__chkModeloBusca");
fonte += letObjeto("__chkModeloSecAbertas") + "\n";
fonte += letObjeto("__chkModeloPainel") + "\n";
const metodosApp = trecho(
  "/* ---------- Checklist — só lê/escreve STATE.checklists ---------- */",
  "\n};\nwindow.App = App;"
);
fonte += "const App = {\n" + metodosApp + "\n};\n";
fonte += "App.fecharModal = function(){};\n"; // o fechar do modal de verdade mexe no DOM; aqui so precisa existir

// ---------- ambiente mínimo (sem DOM — este ensaio é só de dados) ----------
// Input de arquivo de mentira p/ a foto ampla: click() "escolhe" o arquivo que
// o teste deixou em __arquivo e dispara o onchange REAL registrado pelo app.
const inputsFake = {};
function inputFake(id){
  return inputsFake[id] || (inputsFake[id] = {
    files: [], value: "", onchange: null, __arquivo: null, __p: null,
    click(){
      if(!this.__arquivo) return;
      this.files = [this.__arquivo]; this.__arquivo = null;
      this.__p = Promise.resolve(this.onchange());
    },
  });
}
const sandbox = {
  console,
  // a lista e o editor do modelo nao existem aqui (sem DOM): getElementById devolve null para eles e as funcoes seguem sem tocar na tela
  document: { getElementById: (id) => (id === "chkModeloLista" || id === "chkModeloEditor" || id === "chkModeloItens") ? null : inputFake(id), querySelector: () => null, querySelectorAll: () => [] },
  comprimirImagem: async (file) => "data:image/jpeg;base64," + file.nome,
  salvarFotoNaGaleria: () => {},
  getMecseteConfig: () => ({ empresa: "Mecsete Engenharia", respNome: "Luiz Hermelino Araujo", respFuncao: "Engenheiro Mecanico", respCREA: "20037/D-GO", cidade: "Rio Verde - GO", endereco: "R. Major Oscar Campos", telefone: "(64) 99615-4510", email: "luiz@mecsete.com.br", logoLaudo: "", rodapeLaudo: "" }),
  confirm: () => true,
  toast: () => {},
  marcarAlterado: () => {},
  render: () => {},
  go: () => {},
  ic: () => "",
  hidratarImagens: () => {},
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

// Marcar item como "Nao aplica" aplica NA HORA (sem trava ao marcar) e limpa os motivos; e nao
// cobra foto nenhuma -- nem ao marcar, nem ao fechar o item, nem ao abrir outro (so a SECAO inteira
// pede confirmacao, testada em testarTravas).
App.chkSetConforme(item1.itemId, "na");
if(item1.conforme !== "na" || item1.motivosSelecionados.length !== 0)
  throw new Error("marcar item como Nao aplica deveria aplicar na hora e limpar os motivos: " + JSON.stringify(item1));
if(__ultimoOverlayHtml && __ultimoOverlayHtml.includes("Item sem foto"))
  throw new Error("marcar como Nao aplica NAO deveria abrir a trava de item sem foto");
item1.fotos.length = 0;
STATE.ui.chkItemAberto = item1.itemId;
__ultimoOverlayHtml = null;
App.chkToggleItemAberto(item1.itemId); // FECHAR o item Nao aplica, sem foto
if(STATE.ui.chkItemAberto !== null || __ultimoOverlayHtml)
  throw new Error("item Nao aplica SEM foto deveria fechar direto, sem confirmacao: " + __ultimoOverlayHtml);
// Abrir OUTRO item deixando um Nao aplica sem foto tambem nao pede nada.
STATE.ui.chkItemAberto = item1.itemId;
__ultimoOverlayHtml = null;
App.chkToggleItemAberto(item2.itemId);
if(STATE.ui.chkItemAberto !== item2.itemId || __ultimoOverlayHtml)
  throw new Error("trocar de item deixando um Nao aplica sem foto deveria abrir o outro direto");
STATE.ui.chkItemAberto = null;
// Um item "Atende" (nao e Nao aplica) nunca cobra foto ao fechar.
App.chkSetConforme(item1.itemId, "atende");
STATE.ui.chkItemAberto = item1.itemId;
__ultimoOverlayHtml = null;
App.chkToggleItemAberto(item1.itemId);
if(STATE.ui.chkItemAberto !== null || __ultimoOverlayHtml)
  throw new Error("item Atende sem foto deveria fechar direto, sem trava");
// volta ao estado que o resto do ensaio espera (item1 em Nao aplica, como antes)
App.chkSetConforme(item1.itemId, "na");
if(item1.conforme !== "na") throw new Error("item1 deveria voltar a Nao aplica");

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

// ---------- foto ampla da linha de vida: App.chkFotoAmplaAdicionar/Remover
// e App.chkCriarLinha rodando DE VERDADE (input de arquivo e comprimirImagem
// de mentira, ver topo) -- foto na tela Nova linha (rascunho) vai pra linha
// criada; foto numa linha existente troca/remove; a foto vai pra linha que
// estava aberta NO TOQUE (a leitura é assíncrona); remover pede confirmação.
const roda = (codigo) => vm.runInContext(codigo, sandbox);
async function escolherFoto(codigoApp, idInput, nomeArquivo){
  const inp = inputFake(idInput);
  inp.__arquivo = { nome: nomeArquivo }; inp.__p = null;
  roda(codigoApp);
  await inp.__p;
}
async function testarFotoAmpla(){
  const FOTO = (n) => "data:image/jpeg;base64," + n;
  // HTML do campo (função real extraída)
  const semFotoHtml = roda("chkFotoAmplaHtml('', 'draft', true)");
  if(semFotoHtml.includes("data-imgref") || semFotoHtml.includes("chkFotoAmplaRemover"))
    throw new Error("campo foto ampla SEM foto nao deveria ter imagem nem botao de remover: " + semFotoHtml);
  if(!semFotoHtml.includes("chkFotoAmplaAdicionar('draft',false)") || !semFotoHtml.includes("chkFotoAmplaAdicionar('draft',true)"))
    throw new Error("campo foto ampla sem foto nao tem os botoes de camera e galeria ligados ao rascunho: " + semFotoHtml);
  // Linha salva ANTES do campo existir (fotoAmpla undefined): trata como sem foto, sem erro.
  const linhaAntigaHtml = roda("chkFotoAmplaHtml(undefined, 'linha', false)");
  if(linhaAntigaHtml.includes("data-imgref") || linhaAntigaHtml.includes("chkFotoAmplaRemover"))
    throw new Error("linha antiga (sem o campo fotoAmpla) deveria aparecer como sem foto: " + linhaAntigaHtml);
  for(const grande of [true, false]){
    const comFotoHtml = roda("chkFotoAmplaHtml('data:image/jpeg;base64,X', 'linha', " + grande + ")");
    if(!comFotoHtml.includes("data-imgref") || !comFotoHtml.includes("chkFotoAmplaRemover('linha')"))
      throw new Error("campo foto ampla COM foto (grande=" + grande + ") deveria ter imagem e botao de remover da linha: " + comFotoHtml);
  }

  // Nova linha: foto no rascunho vai pra linha criada, e o rascunho zera.
  await escolherFoto("App.chkFotoAmplaAdicionar('draft', false)", "fileGeneral", "DRAFT1");
  if(roda("__chkNovaLinhaDraft.fotoAmpla") !== FOTO("DRAFT1"))
    throw new Error("foto escolhida na tela Nova linha nao ficou no rascunho");
  roda(`App.chkSetNovaLinhaDraft("nome","LV-FOTO"); App.chkSetNovaLinhaDraft("modeloId", modelo.id); App.chkCriarLinha();`);
  const linhaFoto = roda("setor.linhas[setor.linhas.length-1]");
  if(linhaFoto.nome !== "LV-FOTO" || linhaFoto.fotoAmpla !== FOTO("DRAFT1"))
    throw new Error("a linha criada nao recebeu a foto ampla do rascunho: " + JSON.stringify({ nome: linhaFoto.nome, foto: linhaFoto.fotoAmpla }));
  if(roda("__chkNovaLinhaDraft.fotoAmpla") !== "")
    throw new Error("o rascunho de Nova linha deveria zerar a foto depois de criar a linha");
  // Sem foto no rascunho, a linha nasce sem foto (string vazia, nunca undefined).
  roda(`App.chkSetNovaLinhaDraft("nome","LV-SEM-FOTO"); App.chkSetNovaLinhaDraft("modeloId", modelo.id); App.chkCriarLinha();`);
  const linhaSem = roda("setor.linhas[setor.linhas.length-1]");
  if(linhaSem.nome !== "LV-SEM-FOTO" || linhaSem.fotoAmpla !== "")
    throw new Error("linha criada sem foto deveria ter fotoAmpla vazio: " + JSON.stringify(linhaSem.fotoAmpla));

  // Linha aberta (linhaSem): adiciona, troca, e remove com confirmacao.
  await escolherFoto("App.chkFotoAmplaAdicionar('linha', true)", "fileGeneralGaleria", "LINHA1");
  if(linhaSem.fotoAmpla !== FOTO("LINHA1")) throw new Error("foto ampla da galeria nao foi gravada na linha aberta");
  await escolherFoto("App.chkFotoAmplaAdicionar('linha', false)", "fileGeneral", "LINHA2");
  if(linhaSem.fotoAmpla !== FOTO("LINHA2")) throw new Error("foto ampla nova nao substituiu a anterior na linha aberta");
  if(linhaFoto.fotoAmpla !== FOTO("DRAFT1")) throw new Error("foto ampla de uma linha vazou pra OUTRA linha");
  sandbox.confirm = () => false;
  roda("App.chkFotoAmplaRemover('linha')");
  sandbox.confirm = () => true;
  if(linhaSem.fotoAmpla !== FOTO("LINHA2"))
    throw new Error("remover a foto ampla SEM confirmar nao deveria apagar nada");
  roda("App.chkFotoAmplaRemover('linha')");
  if(linhaSem.fotoAmpla !== "") throw new Error("remover a foto ampla confirmado nao limpou o campo");

  // A foto vai pra linha que estava aberta NO TOQUE, mesmo que a pessoa
  // navegue para outra linha enquanto a imagem é lida.
  const inp = inputFake("fileGeneral");
  inp.__arquivo = null; inp.__p = null;
  roda("App.chkFotoAmplaAdicionar('linha', false)"); // toque com linhaSem aberta (aguarda o arquivo)
  roda("STATE.ui.chkLinhaId = '" + linhaFoto.id + "'"); // navega pra outra linha
  inp.files = [{ nome: "TARDIA" }];
  await inp.onchange();
  if(linhaSem.fotoAmpla !== FOTO("TARDIA"))
    throw new Error("a foto deveria ficar na linha aberta NO TOQUE, nao na que ficou aberta depois");
  if(linhaFoto.fotoAmpla !== FOTO("DRAFT1"))
    throw new Error("a foto lida tardiamente caiu na linha errada (a que ficou aberta depois do toque)");
}
// ---------- travas ao FECHAR o item e ao marcar SECAO "nao aplica" -- App.chkToggleItemAberto
// / App.chkToggleSecaoNA rodando de verdade, com a funcao pura chkPendenciasItem
// por baixo. Nao atende cobra motivo (se o modelo tem motivos), nota e foto;
// Nao aplica cobra foto; Atende nao cobra nada; secao sempre pede confirmacao.
// ---------- laudo em capitulos (linha de vida): funcoes puras + montagem de blocos +
// paginador (medidor de mentira) + liga/desliga de capitulo, tudo rodando o codigo REAL ----------
// ---------- dados novos do laudo em capitulos: foto por motivo (citacao no texto), prioridade do
// item, acao do motivo, tipo da linha -- narrativa, migracao aditiva e planilha ----------
async function testarDadosLaudo(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("dados do laudo: " + msg); };
  // helpers puros
  T(roda("chkCitarFotos([])") === "" && roda("chkCitarFotos([2])") === "Foto 2" && roda("chkCitarFotos([2,3])") === "Fotos 2 e 3" && roda("chkCitarFotos([2,3,5])") === "Fotos 2, 3 e 5", "chkCitarFotos");
  T(roda(`chkPrioridadeDeTexto("Crítica")`) === "critica" && roda(`chkPrioridadeDeTexto(" ALTA ")`) === "alta" && roda(`chkPrioridadeDeTexto("Média")`) === "media" && roda(`chkPrioridadeDeTexto("xx")`) === "", "chkPrioridadeDeTexto");
  T(roda(`chkPrioridadeItem({})`) === "media" && roda(`chkPrioridadeItem({ prioridade:"critica" })`) === "critica" && roda(`chkPrioridadeItem({ prioridade:"zzz" })`) === "media", "chkPrioridadeItem");
  T(roda(`chkTipoLinha({ tipoLinha:"vertical" })`) === "vertical" && roda(`chkTipoLinha({ modeloId:"chk-modelo-padrao-linhas-de-vida" })`) === "horizontal_flexivel" && roda(`chkTipoLinha({ modeloId:"nao-existe" })`) === "", "chkTipoLinha");
  T(roda(`chkTipoHorizontal("horizontal_rigida")`) === true && roda(`chkTipoHorizontal("vertical")`) === false, "chkTipoHorizontal");

  // narrativa: cada motivo cita as fotos DELE; foto sem motivo e nota no fim do item
  roda(`(function(){
    const m = novoChkModelo(); const s = novoChkSecao(); s.titulo = "Sec";
    const it = novoChkItem(); it.descricao = "Item N"; it.textoAtende = "Atende N.";
    it.motivosPadrao = [{ motivo:"MA", texto:"Texto A." }, { motivo:"MB", texto:"Texto B." }];
    s.itens = [it]; m.secoes = [s];
    const l = novoChkLinha(m); const ie = chkItemExec(l, it.id);
    ie.conforme = "naoAtende"; ie.motivosSelecionados = ["MA", "MB"]; ie.observacao = "Medido em campo.";
    ie.fotos = [{ foto:"data:image/jpeg;base64,P1", motivo:"MA" }, { foto:"data:image/jpeg;base64,P2", motivo:"MB" }, { foto:"data:image/jpeg;base64,P3", motivo:"MB" }, { foto:"data:image/jpeg;base64,P4" }, { foto:"data:image/jpeg;base64,P5", motivo:"MX-desmarcado" }];
    globalThis.__lclN = { s, l, it, ie };
  })()`);
  const n1 = roda("chkNarrativaSecao(__lclN.s, __lclN.l)");
  T(n1.html === '<mark class="nc">Texto A. (Foto 1) Texto B. (Fotos 2 e 3) (Fotos 4 e 5) Nota do inspetor: Medido em campo.</mark>', "narrativa por motivo errada: " + n1.html);
  T(n1.fotos.length === 5, "a lista de fotos da secao continua com todas, na ordem");
  // foto reatribuida a outro motivo muda a citacao dos dois
  roda(`__lclN.ie.fotos[2].motivo = "MA"`);
  const n2 = roda("chkNarrativaSecao(__lclN.s, __lclN.l)");
  T(n2.html.includes("Texto A. (Fotos 1 e 2)") && n2.html.includes("Texto B. (Foto 3)"), "mover a foto de motivo deveria mudar as duas citacoes e renumerar na ordem dos motivos: " + n2.html);
  // motivo desmarcado: a foto dele vira "sem motivo" (nao some)
  roda(`__lclN.ie.motivosSelecionados = ["MA"]`);
  const n3 = roda("chkNarrativaSecao(__lclN.s, __lclN.l)");
  T(n3.html.includes("Texto A. (Fotos 1 e 2)") && n3.html.includes("(Fotos 3, 4 e 5)") && !n3.html.includes("Texto B."), "foto de motivo desmarcado deveria virar sem motivo (depois das dos motivos marcados), nao sumir: " + n3.html);
  // item que atende: texto padrao e nota, sem destaque
  roda(`__lclN.ie.conforme = "atende"; __lclN.ie.motivosSelecionados = []`);
  const n4 = roda("chkNarrativaSecao(__lclN.s, __lclN.l)");
  T(n4.html === "Atende N. Nota do inspetor: Medido em campo.", "item que atende nao tem destaque e leva a nota: " + n4.html);

  // migracao aditiva: tipo da linha, prioridade e acao
  const estadoNovo = roda(`(function(){
    const padrao = { id: CHK_MODELO_PADRAO_ID, nome:"Padrao", descricao:"", criadoEm:1, atualizadoEm:1, secoes:[
      { id:"sp1", titulo:"Cabo de Aço", itens:[ { id:"ip1", descricao:"x", normativo:"", textoAtende:"", motivosPadrao:[{ motivo:"M", texto:"T" }], info:{texto:"",fotos:[]} } ], contexto:"" },
      { id:"sp2", titulo:"Documentação", itens:[ { id:"ip2", descricao:"y", normativo:"", textoAtende:"", motivosPadrao:[{ motivo:"M2", texto:"T2", acao:"Ja escrita" }], info:{texto:"",fotos:[]}, prioridade:"media" } ], contexto:"" },
      { id:"sp3", titulo:"Secao Nova", itens:[ { id:"ip3", descricao:"z", normativo:"", textoAtende:"", motivosPadrao:[], info:{texto:"",fotos:[]} } ], contexto:"" } ] };
    const outro = { id:"outro", nome:"Outro", descricao:"", criadoEm:1, atualizadoEm:1, tipoLinha:"vertical", secoes:[
      { id:"so1", titulo:"Cabo de Aço", itens:[ { id:"io1", descricao:"w", normativo:"", textoAtende:"", motivosPadrao:[{ motivo:"M3", texto:"T3" }], info:{texto:"",fotos:[]}, prioridade:"critica" } ], contexto:"" } ] };
    const est = { modulo:"checklist", projetos:[], projetosSimples:[], checklists:{ modelos:[padrao, outro], projetos:[] }, ui:{ chkModeloPadraoAplicado:true, chkModeloPadraoTextoAplicado:true, chkMotivoArrayMigrado:true } };
    chkGarantirNamespace(est);
    const a = JSON.stringify(est.checklists);
    chkGarantirNamespace(est);
    return { est, idem: a === JSON.stringify(est.checklists) };
  })()`);
  const mp = estadoNovo.est.checklists.modelos[0], mo = estadoNovo.est.checklists.modelos[1];
  T(mp.tipoLinha === "horizontal_flexivel", "o modelo padrao deveria ser horizontal flexivel: " + mp.tipoLinha);
  T(mp.secoes[0].itens[0].prioridade === "critica" && mp.secoes[1].itens[0].prioridade === "media" && mp.secoes[2].itens[0].prioridade === "media", "prioridade sugerida por secao no modelo padrao, sem sobrescrever o valor ja existente: " + JSON.stringify(mp.secoes.map(s=>s.itens[0].prioridade)));
  T(mp.secoes[0].itens[0].motivosPadrao[0].acao === "" && mp.secoes[1].itens[0].motivosPadrao[0].acao === "Ja escrita", "acao: vazia onde faltava, intacta onde ja existia");
  T(mo.tipoLinha === "vertical" && mo.secoes[0].itens[0].prioridade === "critica", "modelo que nao e o padrao nao pode ser alterado alem do que faltava");
  T(estadoNovo.idem, "a migracao aditiva de tipoLinha/prioridade/acao deveria ser idempotente");
  const semTipo = roda(`(function(){ const est = { modulo:"checklist", projetos:[], projetosSimples:[], checklists:{ modelos:[{ id:"m9", nome:"M9", descricao:"", criadoEm:1, atualizadoEm:1, secoes:[{ id:"s9", titulo:"Cabo de Aço", itens:[{ id:"i9", descricao:"", normativo:"", textoAtende:"", motivosPadrao:[], info:{texto:"",fotos:[]} }], contexto:"" }] }], projetos:[] }, ui:{ chkModeloPadraoAplicado:true, chkModeloPadraoTextoAplicado:true, chkMotivoArrayMigrado:true } }; chkGarantirNamespace(est); return est.checklists.modelos[0]; })()`);
  T(semTipo.tipoLinha === "" && semTipo.secoes[0].itens[0].prioridade === "media", "modelo proprio sem tipo fica sem tipo e com prioridade media (a sugestao por secao e so do modelo padrao)");

  // planilha: Prioridade e Acao fazem a ida e a volta (e planilha antiga, sem as colunas, continua entrando)
  const rt = roda(`(function(){
    function colLetra(n){ let s=""; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
    function esc(v){ return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    function xml(linhasArr){ let x="<sheetData>"; linhasArr.forEach((l,idx)=>{ let c=""; l.forEach((v,ci)=>{ if(!v) return; c+='<c r="'+colLetra(ci+1)+(idx+1)+'" t="inlineStr"><is><t>'+esc(v)+'</t></is></c>'; }); x+='<row r="'+(idx+1)+'">'+c+'</row>'; }); return x+"</sheetData>"; }
    const m = novoChkModelo(); const s = novoChkSecao(); s.titulo = "S"; s.contexto = "Contexto da secao S.";
    const a = novoChkItem(); a.descricao = "Pergunta A?"; a.prioridade = "critica"; a.motivosPadrao = [{ motivo:"M1", texto:"T1", acao:"Substituir." }, { motivo:"M2", texto:"T2", acao:"Reapertar." }];
    const b = novoChkItem(); b.descricao = "Pergunta B?"; b.prioridade = "alta";
    const c3 = novoChkItem(); c3.descricao = "Pergunta C?"; c3.motivosPadrao = [{ motivo:"M9", texto:"T9", acao:"" }];
    s.itens = [a, b, c3]; m.secoes = [s];
    const linhas = chkModeloXLSXLinhasDoModelo(m);
    const cab = CHK_MODELO_XLSX_COLUNAS.map(c=>c.cabecalho);
    const lidas = baseIALerCelulas(xml([cab, ...linhas]), []);
    const r1 = chkModeloXLSXLinhasParaSecoes(lidas);
    const cabAntigo = cab.slice(0, 7);
    const r2 = chkModeloXLSXLinhasParaSecoes(baseIALerCelulas(xml([cabAntigo, ...linhas.map(l=>l.slice(0,7))]), []));
    const vazia = novoChkSecao(); vazia.titulo = "Vazia"; vazia.contexto = "Ctx vazia.";
    const m2 = novoChkModelo(); m2.secoes = [vazia];
    const l2 = chkModeloXLSXLinhasDoModelo(m2);
    const r3 = chkModeloXLSXLinhasParaSecoes(baseIALerCelulas(xml([cab, ...l2]), []));
    return { cab, linha0: linhas[0], linha1: linhas[1], linha2: linhas[2], linha3: linhas[3], r1, r2, l2, r3 };
  })()`);
  T(rt.cab.includes("Prioridade") && rt.cab.includes("Ação Recomendada"), "cabecalho da planilha com as 2 colunas novas: " + rt.cab.join("|"));
  T(rt.linha0[7] === "Crítica" && rt.linha0[8] === "Substituir.", "exportacao: prioridade do item e acao do motivo na 1a linha: " + JSON.stringify(rt.linha0));
  const ri = rt.r1.secoes[0].itens;
  T(ri[0].prioridade === "critica" && ri[0].motivosPadrao[0].acao === "Substituir." && ri[0].motivosPadrao[1].acao === "Reapertar." && ri[1].prioridade === "alta", "importacao: prioridade e acao voltam iguais: " + JSON.stringify(ri.map(i=>[i.prioridade, i.motivosPadrao.map(m=>m.acao)])));
  T(rt.cab.includes("Contexto da Seção") && rt.linha0[9] === "Contexto da secao S." && rt.linha1[9] === "" && rt.linha2[9] === "" && rt.linha3[9] === "", "o contexto da secao vai so na 1a linha da secao: " + JSON.stringify([rt.linha0[9], rt.linha1[9], rt.linha2[9], rt.linha3[9]]));
  T(rt.r1.secoes[0].contexto === "Contexto da secao S." && rt.r2.secoes[0].contexto === "" && rt.l2[0][9] === "Ctx vazia." && rt.r3.secoes.length === 1 && rt.r3.secoes[0].contexto === "Ctx vazia.", "contexto da secao faz a ida e a volta (inclusive secao sem itens); planilha antiga entra com contexto vazio");
  const rv = rt.r2.secoes[0].itens;
  T(rt.r2.erro === false && rv[0].prioridade === "media" && rv[0].motivosPadrao[0].acao === "", "planilha antiga (sem as colunas) deveria continuar importando, com prioridade media e acao vazia");

  // modelo padrao recem-criado (instalacao nova): ja nasce flexivel e com a prioridade sugerida por secao
  const np = roda(`(function(){ const m = chkModeloPadraoLinhasDeVida(); return { tipo: m.tipoLinha, pri: m.secoes.map(s=>[s.titulo, [...new Set(s.itens.map(i=>i.prioridade))].join("/")]) }; })()`);
  T(np.tipo === "horizontal_flexivel" && np.pri.find(x=>x[0] === "Cabo de Aço")[1] === "critica" && np.pri.find(x=>x[0] === "Documentação")[1] === "alta" && np.pri.find(x=>x[0] === "Esticador")[1] === "alta", "modelo padrao novo: tipo flexivel e prioridade sugerida por secao: " + JSON.stringify(np));
}
async function testarLaudoCapitulos(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("laudo em capitulos: " + msg); };
  // modelo e linha de teste (3 secoes: a 3a marcada "nao se aplica")
  roda(`(function(){
    const m = novoChkModelo(); m.nome = "Modelo laudo";
    const sA = novoChkSecao(); sA.titulo = "Documentacao"; sA.contexto = "Contexto A.";
    const i1 = novoChkItem(); i1.descricao = "Item 1"; i1.normativo = "NR-35 8.2"; i1.textoAtende = "Atende 1.";
    i1.motivosPadrao = [{ motivo: "M1", texto: "Texto M1." }];
    const i2 = novoChkItem(); i2.descricao = "Item 2"; i2.normativo = "NBR 1"; i2.textoAtende = "Atende 2.";
    sA.itens = [i1, i2];
    const sB = novoChkSecao(); sB.titulo = "Ancoragem"; const i3 = novoChkItem(); i3.descricao = "Item 3"; i3.textoAtende = "Atende 3."; sB.itens = [i3];
    const sC = novoChkSecao(); sC.titulo = "Viga"; const i4 = novoChkItem(); i4.descricao = "Item 4"; sC.itens = [i4];
    m.secoes = [sA, sB, sC];
    const l = novoChkLinha(m); l.nome = "LV-T1"; l.fotoAmpla = "data:image/jpeg;base64,CAPA";
    chkItemExec(l, i1.id).conforme = "naoAtende"; chkItemExec(l, i1.id).motivosSelecionados = ["M1"];
    chkItemExec(l, i1.id).fotos = [{ foto: "data:image/jpeg;base64,F1", tags: [] }];
    chkItemExec(l, i2.id).conforme = "atende"; chkItemExec(l, i3.id).conforme = "atende";
    l.secoesNA = [sC.id]; chkItemExec(l, i4.id).conforme = "na";
    globalThis.__lclT = { linha: l, setor: { nome: "Silo 2" }, proj: { empresa: "Cliente T", responsavel: "Resp T", solicitanteCargo: "Cargo T", numeroDocumento: "DOC-1", art: "ART123", dataInspecao: "2026-09-24", objetivo: "Primeiro paragrafo.\\n\\nSegundo paragrafo." } };
  })()`);

  // lclCfg / lclTextos
  const cfg0 = roda("JSON.stringify(lclCfg({}))");
  T(cfg0 === '{"fotoCapa":true,"capitulos":{"metodologia":true,"checklist":true,"corpo":true,"memorial":true,"conclusao":true,"anexos":true},"parecer":"","anexos":[]}', "lclCfg sem nada gravado deveria ligar tudo: " + cfg0);
  T(roda("lclCfg({ laudo:{ fotoCapa:false, capitulos:{ corpo:false } } }).capitulos.corpo") === false && roda("lclCfg({ laudo:{ capitulos:{ corpo:false } } }).capitulos.checklist") === true, "lclCfg deveria mesclar so o que foi gravado");
  roda("STATE.checklists.textos = undefined");
  T(roda("lclTextos().normativo.intro") === roda("LCL_NORMATIVO_PADRAO.intro") && roda("lclTextos().normativo.normas.length") === 4, "sem texto salvo, o Normativo deveria ser o padrao");
  roda(`STATE.checklists.textos = { normativo: { intro: "", normas: ["X"] } }`);
  T(roda("lclTextos().normativo.intro") === "" && roda("lclTextos().normativo.normas.length") === 1, "intro vazio salvo de proposito deveria continuar vazio");
  roda("delete STATE.checklists.textos");

  // lclResultado: NA da secao inteira fica fora do percentual
  const res = roda("lclResultado(__lclT.linha)");
  T(res.ok === 2 && res.nok === 1 && res.na === 1 && res.pend === 0 && res.pct === 67, "lclResultado errado: " + JSON.stringify(res));

  // lclPlano: numeracao acompanha o que esta ligado; Metodologia so entra com texto
  const plano = roda("lclPlano(__lclT.proj, __lclT.linha)");
  T(plano.map(c=>c.id + ":" + c.num).join(",") === "metodologia:1,checklist:2,corpo:3,conclusao:4", "numeracao dos capitulos errada: " + JSON.stringify(plano.map(c=>c.id + ":" + c.num)));
  const corpo = plano.find(c=>c.id === "corpo");
  T(corpo.subs.length === 2 && corpo.subs[0].num === "3.1" && corpo.subs[1].titulo === "Ancoragem", "subitens do corpo deveriam ser so as secoes que se aplicam: " + JSON.stringify(corpo.subs));
  roda(`STATE.checklists.textos = { metodologia: { texto: "" } }`);
  const semMet = roda(`lclPlano({ objetivo: "" }, __lclT.linha).map(c=>c.id + ":" + c.num).join(",")`);
  roda("delete STATE.checklists.textos");
  T(semMet === "checklist:1,corpo:2,conclusao:3", "sem texto de metodologia, o Checklist deveria virar o capitulo 1: " + semMet);
  const semCorpo = roda(`(function(){ const l = JSON.parse(JSON.stringify(__lclT.linha)); l.laudo = { capitulos:{ corpo:false } }; return lclPlano(__lclT.proj, l).map(c=>c.id).join(","); })()`);
  T(semCorpo === "metodologia,checklist,conclusao", "capitulo desligado nao deveria entrar: " + semCorpo);

  // proxima inspecao
  T(roda(`lclMaisMeses("2026-09-24", 12)`) === "24/09/2027" && roda(`lclMaisMeses("2024-02-29", 12)`) === "28/02/2025" && roda(`lclMaisMeses("", 12)`) === "" && roda(`lclMaisMeses("2026-11-15", 3)`) === "15/02/2027", "lclMaisMeses errado");
  T(roda(`lclProximaInspecao({ dataInspecao:"2026-09-24" })`) === "24/09/2027" && roda(`lclProximaInspecao({ dataInspecao:"2026-09-24", validadeInspecao:"2027-01-10" })`) === "10/01/2027", "lclProximaInspecao: a validade informada deveria vencer o calculo de 12 meses");

  // blocos: capa, pagina 2, sumario, capitulos
  const blocos = roda("(function(){ const d = lclDados(__lclT.proj, __lclT.setor, __lclT.linha); return lclMontarBlocos(d, lclTextos(), lclPlano(__lclT.proj, __lclT.linha), new Map([['data:image/jpeg;base64,CAPA','data:image/jpeg;base64,rCAPA'],['data:image/jpeg;base64,F1','data:image/jpeg;base64,rF1'],['assinatura','data:image/jpeg;base64,ASS']]), null); })()");
  const capa = blocos[0];
  T(capa.paginaInteira && capa.semRodape && capa.html.includes("com-foto") && capa.html.includes("rCAPA") && capa.html.includes("VISTA GERAL · LV-T1") && capa.html.includes("CLIENTE T") && capa.html.includes("SILO 2"), "capa com foto principal errada");
  const capaSem = roda(`(function(){ const l = JSON.parse(JSON.stringify(__lclT.linha)); l.laudo = { fotoCapa:false }; const d = lclDados(__lclT.proj, __lclT.setor, l); return lclMontarBlocos(d, lclTextos(), lclPlano(__lclT.proj, l), new Map([["data:image/jpeg;base64,CAPA","data:image/jpeg;base64,rCAPA"]]), null)[0]; })()`);
  T(!capaSem.html.includes("com-foto") && !capaSem.html.includes("rCAPA"), "com a foto da capa desligada, a capa deveria sair sem foto");
  T(blocos.some(b=>b.ancora === "cap-normativo" && b.html.includes("NR-35")), "pagina 2 deveria ter o Normativo com ancora");
  T(blocos.filter(b=>b.sumario).length === 1 && blocos.find(b=>b.sumario).html.includes("3.2  Ancoragem"), "sumario com os subitens do corpo");
  const ck = blocos.filter(b=>b.html.includes("lcl-cd")).map(b=>b.html).join("");
  T(ck.includes("NR-35 8.2") && ck.includes("ver 3.1") && ck.includes("Seção marcada como") && ck.includes("1 OK · 1 NÃO OK"), "checklist em cartoes: norma do item, 'ver 3.1' no que nao atende, secao NA e contagem por secao");
  const corpoBl = blocos.filter(b=>b.ancora && b.ancora.startsWith("cap-sec-"));
  T(corpoBl.length === 2 && corpoBl[0].ancoraExtra === "cap-corpo" && typeof corpoBl[0].alternativa === "function", "um bloco de corpo por secao que se aplica, o 1o carregando a ancora do capitulo");
  T(corpoBl[0].html.includes("rF1") && corpoBl[0].html.includes("Foto 1") && corpoBl[0].html.includes("Texto M1.") && corpoBl[0].html.includes("Contexto A."), "corpo: narrativa, contexto e foto numerada");
  const conc = blocos.slice(blocos.findIndex(b=>b.ancora === "cap-conclusao")).map(b=>b.html).join("");
  T(/ART nº <b>ART123<\/b><\/p>\s*<p[^>]*>Rio Verde - GO, /.test(conc), "conclusao: a cidade e a data ficam numa linha ABAIXO do 'Relatorio documentado...'");
  T(conc.includes("Próxima inspeção até: 24/09/2027") && conc.includes("data:image/jpeg;base64,ASS") && conc.includes("67%"), "conclusao: proxima inspecao, assinatura e percentual");
  const concSemAss = roda(`(function(){ const d = lclDados(__lclT.proj, __lclT.setor, __lclT.linha); const caps = lclPlano(__lclT.proj, __lclT.linha); return lclBlocosConclusao(d, caps.find(c=>c.id==="conclusao"), "").map(b=>b.html).join(""); })()`);
  T(!concSemAss.includes('<img src="data:image'), "sem assinatura salva, a conclusao nao deveria ter imagem de assinatura");

  // paginador com medidor de mentira (altura = numero depois de H:)
  const medir = async (html)=> Number((/H:(\d+)/.exec(html) || [0, 10])[1]);
  const pg = (bl, teto)=> roda(`lclPaginar`)(bl, medir, teto);
  const nomes = (pgs)=> pgs.map(p=>p.blocos.map(b=>b.id).join("+")).join(" | ");
  let r = await pg([{ id:"a", html:"H:300" }, { id:"b", html:"H:300" }, { id:"c", html:"H:300" }, { id:"d", html:"H:300" }], 700);
  T(nomes(r) === "a+b | c+d", "paginador: enche a pagina e passa para a seguinte: " + nomes(r));
  r = await pg([{ id:"a", html:"H:100" }, { id:"b", html:"H:100", quebrarAntes:true }, { id:"c", html:"H:100" }], 700);
  T(nomes(r) === "a | b+c", "paginador: quebrarAntes abre pagina nova: " + nomes(r));
  r = await pg([{ id:"capa", html:"H:5", paginaInteira:true, semRodape:true }, { id:"a", html:"H:100" }], 700);
  T(nomes(r) === "capa | a" && r[0].semRodape === true, "paginador: pagina inteira fica sozinha e sem rodape");
  r = await pg([{ id:"a", html:"H:600" }, { id:"t", html:"H:50", grudaNoProximo:true }, { id:"p", html:"H:200" }], 700);
  T(nomes(r) === "a | t+p", "paginador: o titulo gruda no bloco seguinte, nunca fica sozinho no fim da pagina: " + nomes(r));
  r = await pg([{ id:"x", html:"H:900", alternativa: ()=>[{ id:"x1", html:"H:400" }, { id:"x2", html:"H:400" }] }], 700);
  T(nomes(r) === "x1 | x2", "paginador: bloco maior que a folha usa a alternativa: " + nomes(r));
  const anc = roda("lclAncoras")([{ blocos:[{ ancora:"a1" }] }, { blocos:[{ id:"z" }, { ancora:"a2", ancoraExtra:"a2x" }] }, { blocos:[{ ancora:"a1" }] }]);
  T(anc.a1 === 1 && anc.a2 === 2 && anc.a2x === 2, "ancoras: pagina da 1a ocorrencia: " + JSON.stringify(anc));

  // fluxo completo: 2a passada deixa o sumario com o numero REAL de cada capitulo
  const medirReal = async (html)=> Math.ceil(html.length / 9);
  const fluxo = await roda(`(async function(){
    const d = lclDados(__lclT.proj, __lclT.setor, __lclT.linha), caps = lclPlano(__lclT.proj, __lclT.linha);
    const fotos = new Map([["data:image/jpeg;base64,CAPA","data:image/jpeg;base64,rCAPA"],["data:image/jpeg;base64,F1","data:image/jpeg;base64,rF1"]]);
    const medirReal = async (html)=> Math.ceil(html.length / 9);
    let mapa = null, paginas = null;
    for(let i = 0; i < 3; i++){
      paginas = await lclPaginar(lclMontarBlocos(d, lclTextos(), caps, fotos, mapa), medirReal, 900);
      const novo = lclAncoras(paginas);
      if(mapa && JSON.stringify(novo) === JSON.stringify(mapa)) break;
      mapa = novo;
    }
    return { paginas, mapa, doc: lclMontarDoc(paginas, d) };
  })()`);
  T(fluxo.paginas.length >= 5, "o laudo de teste deveria ter varias paginas: " + fluxo.paginas.length);
  const total = fluxo.paginas.length;
  T(fluxo.doc.includes("Página 2 de " + total) && fluxo.doc.includes("Página " + total + " de " + total) && !fluxo.doc.includes("Página 1 de"), "rodape 'Pagina N de M' em todas, menos na capa");
  const pagSumario = fluxo.paginas.find(p=>p.blocos.some(b=>b.sumario));
  const htmlSum = pagSumario.blocos.filter(b=>b.sumario).map(b=>b.html).join("");
  ["cap-normativo", "cap-metodologia", "cap-checklist", "cap-corpo", "cap-conclusao"].forEach(a=>{
    T(fluxo.mapa[a] > 1, "ancora " + a + " sem pagina");
  });
  T(htmlSum.includes("Normativo<i></i>" + fluxo.mapa["cap-normativo"]) && htmlSum.includes("Checklist<i></i>" + fluxo.mapa["cap-checklist"]) && htmlSum.includes("Conclusão<i></i>" + fluxo.mapa["cap-conclusao"]), "sumario com o numero real de pagina de cada capitulo: " + htmlSum.replace(/<[^>]+>/g, " ").slice(0, 200));
  T(!htmlSum.includes(">00<") && !/<i><\/i>00/.test(htmlSum), "sumario nao pode ficar com o numero provisorio (00)");

  // liga/desliga de capitulo e foto da capa pelo App: grava SO na linha
  const Lt = roda("getCurrentChkLinha()");
  T(Lt, "preparo: deveria haver uma linha aberta");
  roda(`App.lclSetCap("checklist", false)`);
  T(roda("lclCfg(getCurrentChkLinha()).capitulos.checklist") === false && roda("lclCfg(getCurrentChkLinha()).capitulos.corpo") === true, "lclSetCap desligou o capitulo errado");
  roda(`App.lclSetCap("checklist", true)`); roda(`App.lclSetFotoCapa(false)`);
  T(roda("lclCfg(getCurrentChkLinha()).capitulos.checklist") === true && roda("lclCfg(getCurrentChkLinha()).fotoCapa") === false, "lclSetCap/lclSetFotoCapa: religar capitulo e desligar a foto da capa");
  roda(`App.lclSetFotoCapa(true)`);
  T(roda("getCurrentChkLinha().laudo.fotoCapa") === true, "lclSetFotoCapa(true)");
}
async function testarTravas(){
  // --- funcao pura
  const pend = (itemModelo, exec) => JSON.stringify(vm.runInContext("chkPendenciasItem(" + JSON.stringify(itemModelo) + "," + JSON.stringify(exec) + ")", sandbox));
  const comMotivos = { motivosPadrao: [{ motivo: "M", texto: "T" }] }, semMotivos = { motivosPadrao: [] };
  const vazio = { conforme: "naoAtende", motivosSelecionados: [], observacao: "", fotos: [] };
  if(pend(comMotivos, vazio) !== '["motivo","nota","foto"]') throw new Error("nao atende vazio deveria faltar motivo, nota e foto: " + pend(comMotivos, vazio));
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"] }) !== '["nota","foto"]') throw new Error("nao atende com motivo, sem foto, deveria faltar nota e foto");
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"], fotos: [{}] }) !== '[]') throw new Error("nao atende com motivo E foto nao deveria cobrar a nota");
  if(pend(comMotivos, { ...vazio, fotos: [{}] }) !== '["motivo","nota"]') throw new Error("nao atende com foto mas sem motivo deveria faltar motivo e nota: " + pend(comMotivos, { ...vazio, fotos: [{}] }));
  if(pend(semMotivos, { ...vazio, fotos: [{}] }) !== '["nota"]') throw new Error("modelo sem motivos: foto sozinha ainda pede a nota (nao ha motivo para marcar): " + pend(semMotivos, { ...vazio, fotos: [{}] }));
  if(pend(semMotivos, { ...vazio, observacao: "n", fotos: [{}] }) !== '[]') throw new Error("modelo sem motivos: foto e nota completam o item");
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"], observacao: "n" }) !== '["foto"]') throw new Error("nao atende com motivo e nota deveria faltar so a foto");
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"], observacao: "n", fotos: [{}] }) !== '[]') throw new Error("nao atende completo nao deveria faltar nada");
  if(pend(semMotivos, vazio) !== '["nota","foto"]') throw new Error("modelo SEM motivos padrao nunca deveria cobrar motivo: " + pend(semMotivos, vazio));
  if(pend(comMotivos, { conforme: "na", motivosSelecionados: [], observacao: "", fotos: [] }) !== '[]') throw new Error("nao aplica sem foto NAO deveria faltar nada");
  if(pend(comMotivos, { conforme: "na", motivosSelecionados: [], observacao: "", fotos: [{}] }) !== '[]') throw new Error("nao aplica com foto nao deveria faltar nada");
  if(pend(comMotivos, { conforme: "atende", motivosSelecionados: [], observacao: "", fotos: [] }) !== '[]') throw new Error("atende nunca cobra nada");
  if(pend(comMotivos, { conforme: null, motivosSelecionados: [], observacao: "", fotos: [] }) !== '[]') throw new Error("item sem resposta nao cobra nada");
  if(vm.runInContext("JSON.stringify(chkPendenciasItem(null, null))", sandbox) !== "[]") throw new Error("exec nulo deveria devolver lista vazia");

  // --- travas de verdade numa linha nova (modelo com motivos padrao no item 1)
  roda(`App.chkSetNovaLinhaDraft("nome","LV-TRAVA"); App.chkSetNovaLinhaDraft("modeloId", modelo.id); App.chkCriarLinha();`);
  const lt = roda("setor.linhas[setor.linhas.length-1]");
  const itM = lt.modeloSnapshot[0].itens[0];
  const ie = lt.itens.find(i => i.itemId === itM.id);
  if(!itM.motivosPadrao.length) throw new Error("preparo: o item 1 do modelo deveria ter motivos padrao");
  const tentarFechar = () => { sandbox.__ultimoOverlayHtml = null; roda("STATE.ui.chkItemAberto = '" + ie.itemId + "'; App.chkToggleItemAberto('" + ie.itemId + "')"); };
  roda("App.chkSetConforme('" + ie.itemId + "', 'naoAtende')");
  tentarFechar();
  let aberto = roda("STATE.ui.chkItemAberto");
  if(aberto !== ie.itemId || !sandbox.__ultimoOverlayHtml || !sandbox.__ultimoOverlayHtml.includes("motivo, nota e foto"))
    throw new Error("fechar Nao atende vazio deveria avisar 'motivo, nota e foto' e nao fechar: " + sandbox.__ultimoOverlayHtml);
  if(!sandbox.__ultimoOverlayHtml.includes("Fechar mesmo assim")) throw new Error("trava de Nao atende incompleto deveria oferecer 'Fechar mesmo assim'");
  roda("App.chkConfirmarAcao()");
  if(roda("STATE.ui.chkItemAberto") !== null) throw new Error("'Fechar mesmo assim' deveria fechar o item");
  roda("App.chkSelecionarMotivo('" + ie.itemId + "', '" + itM.motivosPadrao[0].motivo + "')");
  ie.fotos.push({ foto: "data:image/jpeg;base64,NFOTO", tags: [] });
  tentarFechar();
  if(roda("STATE.ui.chkItemAberto") !== null || sandbox.__ultimoOverlayHtml)
    throw new Error("Nao atende com motivo e foto, mesmo SEM nota, deveria fechar direto (nota e opcional): " + sandbox.__ultimoOverlayHtml);
  // tirando a foto, volta a cobrar foto E nota (o item deixa de estar documentado)
  ie.fotos.length = 0;
  tentarFechar();
  if(roda("STATE.ui.chkItemAberto") !== ie.itemId || !sandbox.__ultimoOverlayHtml.includes("nota e foto"))
    throw new Error("Nao atende com motivo, sem foto e sem nota deveria avisar 'nota e foto': " + sandbox.__ultimoOverlayHtml);
  roda("App.chkConfirmarAcao()");
  ie.fotos.push({ foto: "data:image/jpeg;base64,NFOTO", tags: [] });
  roda("App.chkSetObservacao('" + ie.itemId + "', 'Nota escrita em campo')");
  tentarFechar();
  if(roda("STATE.ui.chkItemAberto") !== null || sandbox.__ultimoOverlayHtml)
    throw new Error("Nao atende completo (motivo, nota e foto) deveria fechar direto, sem trava");
  // Nao aplica (o item) nunca cobra foto: fecha direto mesmo sem nenhuma
  roda("App.chkSetConforme('" + ie.itemId + "', 'na')");
  ie.fotos.length = 0;
  tentarFechar();
  if(roda("STATE.ui.chkItemAberto") !== null || sandbox.__ultimoOverlayHtml)
    throw new Error("Nao aplica sem foto deveria fechar direto: " + sandbox.__ultimoOverlayHtml);
  // a faixa da foto ampla nao aparece mais na tela de preenchimento (mas continua na finalizacao)
  const hPreencher = roda("screenChkPreencher()");
  if(hPreencher.includes("chk-foto-ampla") || hPreencher.includes("Foto ampla"))
    throw new Error("a tela de preenchimento nao deveria mais mostrar a faixa da Foto ampla");
  if(!roda("screenChkFinalizar()").includes("Foto ampla"))
    throw new Error("a tela de finalizar deveria continuar com o campo da Foto ampla");
  roda("App.chkSetConforme('" + ie.itemId + "', 'na')"); // desfaz o toggle para o estado seguinte do teste

  // --- secao "nao aplica": sempre pede confirmacao, mesmo sem nada respondido
  const secLimpa = lt.modeloSnapshot[1];
  if(secLimpa.itens.some(it => { const x = lt.itens.find(i => i.itemId === it.id); return x && x.conforme !== null; }))
    throw new Error("preparo: a secao 2 da linha nova deveria estar sem nenhuma resposta");
  sandbox.__ultimoOverlayHtml = null;
  roda("App.chkToggleSecaoNA('" + secLimpa.id + "')");
  if(lt.secoesNA.includes(secLimpa.id)) throw new Error("marcar secao como Nao aplica deveria pedir confirmacao ANTES, mesmo sem item respondido");
  if(!sandbox.__ultimoOverlayHtml || !sandbox.__ultimoOverlayHtml.includes("Nenhum item da seção"))
    throw new Error("a confirmacao da secao sem respostas nao apareceu: " + sandbox.__ultimoOverlayHtml);
  roda("App.chkConfirmarAcao()");
  if(!lt.secoesNA.includes(secLimpa.id)) throw new Error("confirmar a secao Nao aplica nao a marcou");
  // Desfazer (Aplicar secao) nao pede nada.
  sandbox.__ultimoOverlayHtml = null;
  roda("App.chkToggleSecaoNA('" + secLimpa.id + "')");
  if(lt.secoesNA.includes(secLimpa.id) || sandbox.__ultimoOverlayHtml) throw new Error("desmarcar a secao Nao aplica deveria ser direto, sem trava");
}
// ---------- memorial ZLQ no campo + foto por motivo: calculo (valores do memorial de referencia),
// dados normalizados, abas, interruptor unico do capitulo, medidas digitadas e fotos arrastadas entre motivos ----------
async function testarMemorial(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("memorial: " + msg); };
  const perto = (a, b, tol)=> typeof a === "number" && Math.abs(a - b) <= tol;
  T(roda(`chkMemorialNum("6,7")`) === 6.7 && roda(`chkMemorialNum(" 3.5 ")`) === 3.5 && roda(`chkMemorialNum("")`) === null && roda(`chkMemorialNum("abc")`) === null && roda(`chkMemorialNum(0)`) === null && roda(`chkMemorialNum(-2)`) === null && roda(`chkMemorialNum(null)`) === null, "chkMemorialNum (virgula, vazio, texto, zero, negativo)");

  // linha antiga (sem linha.memorial) le tudo vazio, com os padroes
  const vz = roda(`chkMemorialDe({})`);
  T(vz.hanc === null && vz.hpos === null && vz.vao === null && vz.flechaCm === null && vz.diametro === null && vz.uso === "vida" && vz.usuarios === 1 && vz.params.Ecabo === 9500 && vz.params.kA === 0.416 && vz.epi === "tq" && vz.memoria === true && vz.params.peso === 100 && vz.params.Frup === 3900 && vz.params.FS === 2 && vz.params.b1 === 1 && vz.params.fren === 0.5, "linha antiga deveria ler tudo vazio com os padroes");
  const ov = roda(`chkMemorialDe({ memorial:{ hanc:"5,5", epi:"tab", memoria:false, params:{ peso:"90", Frup:"abc", FS:0 } } })`);
  T(ov.hanc === 5.5 && ov.epi === "tab" && ov.memoria === false && ov.params.peso === 90 && ov.params.Frup === 3900 && ov.params.FS === 2, "parametro invalido/zero deveria cair no padrao, valido deveria valer: " + JSON.stringify(ov));
  T(roda(`JSON.stringify(CHK_MEMORIAL_PARAMS)`) === roda(`JSON.stringify(chkMemorialDe({}).params)`), "ler nao pode alterar o padrao");

  // calculo do cabo (flexivel): bate com o memorial de referencia (vao 6,7 m, flecha 7% = 469 mm)
  const mF = roda(`chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8 } })`);
  const cF = roda(`chkMemorialCalc("horizontal_flexivel", ${JSON.stringify(mF)})`);
  T(perto(cF.fl, 7, 1e-9) && perto(cF.f1, 0.469, 1e-9), "flecha de 46,9 cm em 6,7 m deveria ser 7% e f1 = 469 mm: " + JSON.stringify([cF.fl, cF.f1]));
  T(perto(cF.f2, 0.5433, 5e-4) && perto(cF.f3, 0.6609, 5e-4), "f2/f3 do memorial de referencia (543,3 e 660,9 mm): " + JSON.stringify([cF.f2, cF.f3]));
  T(perto(cF.T1, 1549.958, 0.01) && perto(cF.dL, 41.5945, 0.005) && perto(cF.f3, 0.660903, 2e-6) && cF.conv === true && cF.voltas > 5 && cF.voltas < 200, "T1 1549,96 kgf, dL 41,59 mm, f3 660,9 mm (planilha do memorial, aba Dimensionamento) e iteracao que estabiliza: " + JSON.stringify([cF.T1, cF.dL, cF.f3, cF.voltas, cF.conv]));
  T(perto(cF.uso, 0.79485, 1e-4) && perto(cF.FSs, 2.51620, 1e-4) && perto(cF.fq, 0.208333, 1e-5) && perto(cF.fren3 * 1000, 117.58, 0.01) && perto(cF.ang, 157.6795, 1e-3), "utilizacao 79,5%, fator de servico 2,52, fator de queda 0,21, frenagem 117,58 mm e angulo 157,68 (planilha): " + JSON.stringify([cF.uso, cF.FSs, cF.fq, cF.fren3, cF.ang]));
  T(perto(cF.ZLQ1, 5.56, 0.005) && perto(cF.Hp1, 2.19, 0.005) && perto(cF.ZLQ2, 4.66, 0.005) && perto(cF.Hp2, 1.69, 0.005), "ZLQ1 5,56 / Hp1 2,19 / ZLQ2 4,66 / Hp2 1,69: " + JSON.stringify([cF.ZLQ1, cF.Hp1, cF.ZLQ2, cF.Hp2]));
  T(perto(cF.Fadm, 1950, 1e-9) && cF.uso < 1 && cF.tipo === "flex", "admissivel 1950 kgf e uso abaixo de 100%");
  T(roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, flechaCm:46.9, diametro:8 } }))`) === null, "sem vao nao calcula");
  T(roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, diametro:8 } }))`) === null, "cabo sem flecha nao calcula");
  T(roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9 } }))`) === null, "cabo sem diametro nao calcula (nao ha mais diametro padrao escondido)");

  // outros casos da planilha: aba oculta Original (2 usuarios, 12,7 mm, vao 20,5 m, flecha 3%: esforco iterado a mao 2961,5 kgf) e a "Inicial" (4 m, 9,5 mm)
  const cO = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:20.5, flechaCm:61.5, diametro:12.7, usuarios:2 } }))`);
  T(perto(cO.P, 700, 1e-9) && perto(cO.T1, 2961.57, 0.05) && perto(cO.dL, 95.4756, 0.01) && perto(cO.f3, 1.2199, 1e-3) && cO.conv && perto(cO.Fadm, 5400, 1e-9), "caso 2 usuarios/12,7 mm/20,5 m (planilha Original): P 700, T1 2961,6, dL 95,5 mm: " + JSON.stringify([cO.P, cO.T1, cO.dL, cO.f3]));
  const cI = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:10, hpos:4, vao:4, flechaCm:12, diametro:9.52 } }))`);
  T(perto(cI.L1, 4.0096, 1e-6) && perto(cI.f2, 0.138647, 1e-5) && cI.conv && cI.T1 > 2000 && cI.T1 < 2500, "caso 4 m / 3% (planilha Inicial): comprimento do cabo 4,0096 m e f2 138,6 mm: " + JSON.stringify([cI.L1, cI.f2, cI.T1]));
  // fator de queda quando a posicao de trabalho fica a menos de 1,5 m da ancoragem (outro ramo da formula da planilha)
  const cBaixo = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:4, vao:6.7, flechaCm:46.9, diametro:8 } }))`);
  T(perto(cBaixo.fq, (1.5 - 1 + 2.4) / 2.4, 1e-9), "fator de queda com ancoragem a 1 m acima: (1,5 - 1 + 2,4) / 2,4 = 1,21: " + cBaixo.fq);
  T(roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ vao:6.7, flechaCm:46.9, diametro:8 } })).fq`) === null, "sem as alturas nao ha fator de queda (nem erro)");
  // linha de restricao: carga = peso de cada usuario (100 kgf por pessoa) e fator de seguranca padrao 3
  const mRe = roda(`chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:6.7, diametro:8, usuarios:2, uso:"restricao" } })`);
  const cRe = roda(`chkMemorialCalc("horizontal_flexivel", ${JSON.stringify(mRe)})`);
  T(mRe.uso === "restricao" && mRe.params.FS === 3 && perto(cRe.P, 200, 1e-9) && perto(cRe.Fadm, 1300, 1e-9) && cRe.conv, "restricao: FS 3, P = 100 kgf x 2 pessoas, admissivel 1300: " + JSON.stringify([mRe.params.FS, cRe.P, cRe.Fadm]));
  T(roda(`chkMemorialDe({ memorial:{ uso:"qualquer" } }).uso`) === "vida" && roda(`chkMemorialDe({ memorial:{ uso:"restricao", params:{ FS:5 } } }).params.FS`) === 5, "uso invalido vira vida; FS informado vale mais que o padrao");
  // a carga de uma linha de vida: 600 kgf + peso dos usuarios alem do primeiro
  const pu = (n, peso) => roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8, usuarios:${n}, params:{ peso:${peso} } } })).P`);
  T(pu(1, 100) === 600 && pu(1, 120) === 600 && pu(2, 100) === 700 && pu(3, 90) === 780, "carga da linha de vida: 600 + (n-1) x peso");
  // flecha muito pequena: o esforco explode, mas o calculo nao trava nem devolve NaN
  const cMini = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:20, flechaCm:1, diametro:8 } }))`);
  T(cMini && Number.isFinite(cMini.T1) && Number.isFinite(cMini.f3) && cMini.voltas <= 2000, "flecha de 1 cm em 20 m: sem NaN e sem laco infinito: " + JSON.stringify(cMini && [cMini.T1, cMini.voltas, cMini.conv]));
  // diametro e tabela de cabos
  const rup = (d) => roda(`chkCaboRuptura(${JSON.stringify(d)})`);
  T(rup(8).Frup === 3900 && rup(8).grau === "IPS" && rup(9.52).Frup === 6100 && rup(9.52).grau === "EIPS" && rup(12.7).Frup === 10800 && rup(52).Frup === 170300 && rup(6.4).Frup === 2500 && rup("8,0").Frup === 3900, "ruptura da tabela por diametro (IPS onde existe, senao EIPS, como na planilha)");
  T(rup(10).dTab === 9.52 && rup(10).exato === false && rup(2) === null && rup(null) === null && rup(0) === null, "diametro fora da tabela usa o menor vizinho (lado seguro); menor que a tabela ou vazio, nada");
  T(roda(`chkMemorialDe({ memorial:{ diametro:12.7 } }).params.Frup`) === 10800 && roda(`chkMemorialDe({ memorial:{ diametro:12.7, params:{ Frup:9000 } } }).params.Frup`) === 9000 && roda(`chkMemorialDe({ memorial:{ diametro:12.7 } }).frupNota`).includes("EIPS") && roda(`chkMemorialDe({ memorial:{ diametro:12.7, params:{ Frup:9000 } } }).frupNota`).includes("informado"), "a ruptura vem do diametro; valor informado na linha vale mais");
  // menor cabo da tabela que atende
  const mn = roda(`chkMemorialDiametroMin("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8 } }))`);
  T(mn && mn[0] <= 8 && mn[0] >= 6.4, "menor cabo que atende com 1 usuario e 7% de flecha: " + JSON.stringify(mn));
  // avisos de flecha
  const al = (uso, cm) => roda(`(function(){ const m = chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:10, flechaCm:${cm}, diametro:8, uso:"${uso}" } }); return chkMemorialAlertas(chkMemorialCalc("horizontal_flexivel", m), m); })()`);
  T(al("vida", 20).length === 1 && al("vida", 20)[0].includes("abaixo do mínimo de 3%") && al("vida", 40).length === 0 && al("restricao", 20).length === 1 && al("restricao", 20)[0].includes("acima do máximo de 1%") && al("restricao", 5).length === 0, "avisos de flecha: vida minimo 3%, restricao maximo 1%");
  // um parametro trocado muda o resultado so onde deve (peso maior => mais forca no cabo)
  const cDois = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8, usuarios:2, params:{ peso:120 } } }))`);
  T(perto(cDois.P, 720, 1e-9) && cDois.T1 > cF.T1 && cDois.f3 > cF.f3 && cDois.ZLQ2 > cF.ZLQ2, "2 usuarios de 120 kg: carga 720 kgf, mais esforco e mais flecha dinamica: " + JSON.stringify([cDois.P, cDois.T1, cDois.f3]));

  // calculo da viga (rigida): independente da flecha, com a formula de viga biapoiada
  const mR = roda(`chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:3 } })`);
  const cR = roda(`chkMemorialCalc("horizontal_rigida", ${JSON.stringify(mR)})`);
  const PN = 100 * 6 * 9.80665, dEsp = PN * Math.pow(3, 3) / (48 * 200e9 * 2611e-8);
  T(cR.tipo === "rig" && perto(cR.d, dEsp, 1e-12) && perto(cR.f3, dEsp, 1e-12) && cR.f1 === 0, "viga: deflexao P.L3/48EI: " + JSON.stringify(cR));
  T(!("sig" in cR) && !("M" in cR) && !("uso" in cR) && roda(`chkMemorialVeredito(${JSON.stringify(cR)}, ${JSON.stringify(mR)})`).okC === true, "viga rigida: sem momento, tensao nem utilizacao (a resistencia nao e verificada)");
  T(perto(cR.ZLQ1, dEsp + 1.4 + 1 + 1.5 + 1, 1e-9) && perto(cR.ZLQ2, dEsp + 1.5 + 1.5 + 1, 1e-9) && perto(cR.Hp2, dEsp + 1.5 - 1 + 1, 1e-9), "ZLQ/Hp da viga");

  // veredito e parecer
  const vd = (hanc, hpos, extra) => roda(`(function(){ const m = chkMemorialDe({ memorial:{ hanc:${hanc}, hpos:${hpos}, vao:6.7, flechaCm:46.9, diametro:8${extra || ""} } }); const c = chkMemorialCalc("horizontal_flexivel", m); return { v: chkMemorialVeredito(c, m), p: chkMemorialParecer(c, m) }; })()`);
  let r = vd(5, 3);
  T(r.v.okTq === true && r.v.okTab === false && r.v.okC === true && r.v.okHp === true && r.p.includes("somente com trava-quedas"), "ancoragem 5 m: so trava-quedas: " + r.p);
  r = vd(6, 3);
  T(r.v.okTq && r.v.okTab && r.p.includes("trava-quedas retrátil ou talabarte"), "ancoragem 6 m: os dois EPI");
  r = vd(4, 3);
  T(!r.v.okTq && !r.v.okTab && r.p.includes("nenhum dos EPI"), "ancoragem 4 m: nenhum EPI");
  r = vd(5, 1.5);
  T(r.v.okHp === false, "posicao de trabalho baixa (1,5 m < Hp 1,69 m)");
  r = vd(5, 3, ", params:{ Frup:3000 }");
  T(r.v.okC === false && r.p.includes("não suporta"), "cabo fraco: nao suporta: " + r.p);

  // textos do capitulo
  const txt = roda(`(function(){ const m = chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8 } }); const c = chkMemorialCalc("horizontal_flexivel", m); return { f: chkMemorialFormulas(c, m), t: chkMemorialTabelas(c, m), pr: chkMemorialPremissas(c, m), co: chkMemorialCondicoes(c, m), le: chkMemorialLegenda(c, m) }; })()`);
  T(txt.f.includes("<math>") && txt.f.includes("<mn>4,66</mn>") && txt.f.includes("<mn>1550</mn>") && txt.f.includes("Alongamento do cabo") && txt.f.includes("<mn>41,6</mn>") && txt.f.includes("Distância de frenagem") && txt.f.includes("Fator de queda") && txt.f.includes("<mn>0,21</mn>") && txt.f.includes("voltas") && txt.f.includes("<mn>0,661</mn>") && txt.f.includes("<mn>6,70</mn>"), "formulas com os numeros substituidos (ZLQ2 4,66; T1 1550; f3 0,661; vao 6,70)");
  T(!/NaN|undefined|Infinity/.test(txt.f + txt.t + txt.pr.join("") + txt.co.join("") + txt.le.join("")), "texto do memorial sem NaN/undefined");
  T(txt.t.includes("Força no cabo (T1)") && txt.t.includes("<b>1550</b>") && txt.t.includes("Diâmetro do cabo") && txt.t.includes("<td class=\"v\">8</td>") && txt.t.includes("Alongamento (ΔL)") && txt.t.includes("Fator de queda") && txt.t.includes("Módulo E do cabo"), "tabelas de entrada e resultado, com o diametro, o alongamento e o fator de queda");
  T(txt.pr[0].includes("Cabo de aço de 8 mm") && txt.pr[0].includes("IPS") && txt.pr[1].includes("600 kgf") && txt.pr[2].includes("9500") && txt.pr[2].includes("voltas") && txt.co.some(x=> x.includes("Fator de queda do sistema: <b>0,2</b>")) && txt.co.some(x=> x.includes("Cabo de aço de 8 mm") && x.includes("atende")) && txt.le.length === 11 && txt.le[9].includes("5,00 m") && txt.le[10].includes("3,00 m") && txt.le[6].includes("4,66 m"), "premissa com o diametro; legenda com 11 itens e os valores 7, 10 e 11");
  const txtR = roda(`(function(){ const m = chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:3 } }); const c = chkMemorialCalc("horizontal_rigida", m); return { f: chkMemorialFormulas(c, m), pr: chkMemorialPremissas(c, m), le: chkMemorialLegenda(c, m) }; })()`);
  T(txtR.f.includes("δ") && txtR.f.includes("<mn>2611</mn>") && txtR.pr[0].includes("W200x26,6") && txtR.le[1].includes("viga W200x26,6") && !/NaN|undefined/.test(txtR.f) && !txtR.f.includes("Momento fletor") && !txtR.f.includes("Tensão de flexão") && !txtR.pr.join("").includes("Tensão") && !txtR.pr.join("").includes("fy"), "viga: formulas de deflexao, premissa e legenda, sem a verificacao de resistencia");

  // ilustracao: 11 numeros; so mostra valores com dados completos
  const fig = (obj, tipo)=> roda(`chkMemorialFigura(${JSON.stringify(tipo || "horizontal_flexivel")}, chkMemorialDe(${JSON.stringify({ memorial: obj })}))`);
  const figOk = fig({ hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8 });
  T(figOk.startsWith("<svg") && (figOk.match(/r="7.5"/g) || []).length === 11, "a ilustracao tem os 11 numeros");
  T(figOk.includes(">5,00 m<") && figOk.includes(">3,00 m<") && figOk.includes(">4,66 m<") && !/NaN|undefined/.test(figOk), "ilustracao completa mostra os valores 10, 11 e 7");
  const figEx = fig({});
  T((figEx.match(/r="7.5"/g) || []).length === 11 && !/ m<\/text>/.test(figEx) && !/NaN|undefined/.test(figEx), "ilustracao sem dados e so um exemplo, sem nenhum valor");
  T(fig({ hanc:5, hpos:3, vao:3 }, "horizontal_rigida").includes("rect") && !/NaN|undefined/.test(fig({ hanc:5, hpos:3, vao:3 }, "horizontal_rigida")), "ilustracao da viga");
  T(!/NaN|undefined|Infinity/.test(fig({ hanc:0.5, hpos:0.2, vao:12, flechaCm:90 })), "valores extremos nao quebram a ilustracao");

  // abas, status e interruptor unico — numa linha de verdade
  roda(`App.chkSetNovaLinhaDraft("nome","LV-MEM"); App.chkSetNovaLinhaDraft("modeloId", modelo.id); App.chkCriarLinha();`);
  const lm = roda("setor.linhas[setor.linhas.length-1]");
  const outra = roda("setor.linhas[0]");
  const nSec = lm.modeloSnapshot.length;
  const antesOutra = JSON.stringify(outra);
  T(roda(`chkTotalAbas(${JSON.stringify({ modeloSnapshot: lm.modeloSnapshot.slice(0, 2), tipoLinha:"vertical" })})`) === 2, "linha vertical: so as abas das secoes");
  T(roda(`chkTotalAbas(${JSON.stringify({ modeloSnapshot: lm.modeloSnapshot.slice(0, 2), tipoLinha:"horizontal_rigida" })})`) === 3, "linha horizontal: uma aba a mais");
  lm.tipoLinha = "horizontal_flexivel";
  T(roda("chkTotalAbas(getCurrentChkLinha())") === nSec + 1, "linha horizontal na tela: secoes + memorial");
  T(roda("chkMemorialAtivo(getCurrentChkLinha())") === true && roda("chkStatusAbaMemorial(getCurrentChkLinha())") === "vazia", "memorial ligado e vazio de saida");
  T(roda("chkMemorialFaltas(getCurrentChkLinha())").join(",") === "altura da ancoragem,altura da posição de trabalho,vão entre apoios,flecha,diâmetro do cabo", "o que falta medir no cabo: " + roda("chkMemorialFaltas(getCurrentChkLinha())"));
  roda("App.chkMemorialSet('hanc', '5,2')");
  T(lm.memorial && lm.memorial.hanc === 5.2 && roda("chkStatusAbaMemorial(getCurrentChkLinha())") === "parcial", "digitar na aba grava na linha (virgula) e deixa a aba parcial");
  roda("App.chkMemorialSet('hpos', '3'); App.chkMemorialSet('vao', '6.7');");
  T(roda("chkMemorialFaltas(getCurrentChkLinha())").join(",") === "flecha,diâmetro do cabo", "faltando a flecha e o diametro");
  roda("App.chkMemorialSet('flechaCm', '46,9')");
  T(roda("chkMemorialFaltas(getCurrentChkLinha())").join(",") === "diâmetro do cabo" && roda("chkStatusAbaMemorial(getCurrentChkLinha())") === "parcial", "faltando so o diametro: aba ainda parcial");
  roda("App.chkMemorialSet('diametro', '8')");
  T(roda("chkMemorialFaltas(getCurrentChkLinha())").length === 0 && roda("chkStatusAbaMemorial(getCurrentChkLinha())") === "completa", "tudo medido: aba completa");
  roda("App.chkMemorialSetUso('restricao')");
  T(lm.memorial.uso === "restricao" && roda("chkMemorialDe(getCurrentChkLinha()).params.FS") === 3, "tipo de linha de restricao: grava na linha e muda o fator de seguranca padrao");
  roda("App.chkMemorialSetUso('xyz')");
  T(lm.memorial.uso === "vida", "tipo invalido volta para linha de vida");
  roda("App.chkMemorialSet('hanc', 'abc'); App.chkMemorialSet('nao_existe', '9');");
  T(lm.memorial.hanc === null && !("nao_existe" in lm.memorial), "texto vira vazio; campo desconhecido e ignorado");
  roda("App.chkMemorialSet('hanc', '5.2')");
  roda("App.chkMemorialSetParam('peso', '90'); App.chkMemorialSetParam('Frup', '4200'); App.chkMemorialSetParam('xx', '1');");
  T(lm.memorial.params.peso === 90 && lm.memorial.params.Frup === 4200 && !("xx" in lm.memorial.params), "parametros trocados ficam so em memorial.params");
  roda("App.chkMemorialSetParam('peso', '')");
  T(!("peso" in lm.memorial.params) && roda("chkMemorialDe(getCurrentChkLinha()).params.peso") === 100, "parametro apagado volta ao padrao");
  roda("App.chkIrParaSecao(999)");
  T(roda("STATE.ui.chkSecaoAtual") === nSec, "ir para a ultima aba chega no memorial (indice = numero de secoes)");
  lm.tipoLinha = "vertical";
  roda("App.chkIrParaSecao(999)");
  T(roda("STATE.ui.chkSecaoAtual") === nSec - 1 && roda("chkMemorialFaltas(getCurrentChkLinha())").length === 0 && roda("chkMemorialAtivo(getCurrentChkLinha())") === false, "linha vertical: sem aba do memorial, nada a medir");
  lm.tipoLinha = "horizontal_flexivel";

  // interruptor unico (campo = laudo): desligar pede confirmacao; ligar e direto; nao apaga as medidas
  sandbox.__ultimoOverlayHtml = null;
  roda("App.chkMemorialToggle()");
  T(roda("chkMemorialAtivo(getCurrentChkLinha())") === true && sandbox.__ultimoOverlayHtml && sandbox.__ultimoOverlayHtml.includes("Esta linha não terá memorial"), "desligar o memorial deveria pedir confirmacao antes");
  roda("App.chkConfirmarAcao()");
  T(lm.laudo.capitulos.memorial === false && roda("lclCfg(getCurrentChkLinha()).capitulos.memorial") === false && roda("chkStatusAbaMemorial(getCurrentChkLinha())") === "naoaplica" && lm.memorial.hanc === 5.2, "confirmado: capitulo desligado no laudo tambem (um so interruptor) e medidas guardadas");
  const htmlOff = roda("chkMemorialCampoHtml(getCurrentChkLinha())");
  T(htmlOff.includes("Incluir memorial") && !htmlOff.includes("chkMemVivo"), "aba desligada mostra so o botao de incluir");
  sandbox.__ultimoOverlayHtml = null;
  roda("App.chkMemorialToggle()");
  T(lm.laudo.capitulos.memorial === true && !sandbox.__ultimoOverlayHtml, "ligar de novo e direto, sem confirmacao");
  const htmlOn = roda("chkMemorialCampoHtml(getCurrentChkLinha())");
  T(htmlOn.includes("chkMemorialSet('flechaCm'") && htmlOn.includes("chkMemorialSet('diametro'") && htmlOn.includes("chkMemorialSetUso(") && htmlOn.includes("5/16”") && htmlOn.includes("chkMemorialSetParam('Frup'") && htmlOn.includes("chkMemorialSetParam('Ecabo'") && htmlOn.includes('placeholder="3900"') && htmlOn.includes("Cálculo passo a passo") && htmlOn.includes('id="chkMemPasso"') && htmlOn.includes("Alongamento do cabo") && htmlOn.includes("Esta linha não terá memorial") && htmlOn.includes("Trava-quedas: pode"), "aba do cabo: campos, parametros com o padrao dentro e resultado preliminar");
  lm.tipoLinha = "horizontal_rigida";
  const htmlRig = roda("chkMemorialCampoHtml(getCurrentChkLinha())");
  T(!htmlRig.includes("chkMemorialSet('flechaCm'") && !htmlRig.includes("chkMemorialSet('diametro'") && !htmlRig.includes("chkMemorialSetUso(") && !htmlRig.includes("chkMemorialSetParam('Ecabo'") && htmlRig.includes("chkMemorialSet('hanc'"), "viga nao pede flecha, diametro, tipo de linha nem os dados do cabo");
  lm.tipoLinha = "horizontal_flexivel";
  T(JSON.stringify(outra) === antesOutra, "mexer no memorial de uma linha nao pode tocar em outra linha");

  // fotos por motivo: a foto nasce ligada ao motivo, pode ser movida (menu/arrastar) e nada se perde
  const itM = lm.modeloSnapshot[0].itens[0];
  const ieM = lm.itens.find(i => i.itemId === itM.id);
  const motivos = itM.motivosPadrao.map(x => x.motivo);
  T(motivos.length >= 1, "preparo: o item 1 deveria ter motivo padrao");
  roda(`App.chkSetConforme('${ieM.itemId}','naoAtende')`);
  roda(`App.chkSelecionarMotivo('${ieM.itemId}', ${JSON.stringify(motivos[0])})`);
  const mB = motivos[1] || "Motivo B";
  if(!ieM.motivosSelecionados.includes(mB)) ieM.motivosSelecionados.push(mB);
  ieM.fotos = [];
  roda(`STATE.ui.chkItemAberto = '${ieM.itemId}'`);
  await escolherFoto(`App.chkTirarFotoMotivo('${ieM.itemId}', 1, true)`, "fileGeneralGaleria", "F-B");
  T(ieM.fotos.length === 1 && ieM.fotos[0].motivo === mB, "foto tirada na caixa do 2o motivo nasce ligada a ele: " + JSON.stringify(ieM.fotos));
  await escolherFoto(`App.chkTirarFotoMotivo('${ieM.itemId}', 0, true)`, "fileGeneralGaleria", "F-A");
  T(ieM.fotos[1].motivo === motivos[0], "foto tirada na caixa do 1o motivo nasce ligada a ele");
  const antesN = ieM.fotos.length;
  roda(`App.chkTirarFotoMotivo('${ieM.itemId}', 9, true)`);
  T(ieM.fotos.length === antesN, "indice de motivo inexistente nao faz nada");
  roda(`App.chkMoverFoto('${ieM.itemId}', 0, 0)`);
  T(ieM.fotos[0].motivo === motivos[0] && ieM.fotos.length === 2, "mover a foto para o 1o motivo");
  roda(`App.chkMoverFoto('${ieM.itemId}', 0, -1)`);
  T(ieM.fotos[0].motivo === "" && ieM.fotos.length === 2, "mover para 'sem motivo' limpa o vinculo e nao apaga a foto");
  roda(`App.chkDropFoto({ preventDefault(){}, dataTransfer:{ getData: () => "1" } }, '${ieM.itemId}', 1)`);
  T(ieM.fotos[1].motivo === mB, "soltar a foto 2 na caixa do 2o motivo (arrastar)");
  roda(`App.chkDropFoto({ preventDefault(){}, dataTransfer:{ getData: () => "x" } }, '${ieM.itemId}', 0)`);
  T(ieM.fotos[1].motivo === mB && ieM.fotos.length === 2, "arrasto sem indice valido nao mexe em nada");
  roda(`App.chkMoverFoto('${ieM.itemId}', 99, 0)`);
  T(ieM.fotos.length === 2, "mover foto inexistente nao faz nada");
  // foto tirada pelo botao geral: com um so motivo marcado liga sozinha; com dois, fica sem motivo
  await escolherFoto(`App.chkTirarFoto('${ieM.itemId}', true)`, "fileGeneralGaleria", "F-G2");
  T(ieM.fotos[2].motivo === "", "botao geral com 2 motivos marcados: foto sem motivo");
  ieM.motivosSelecionados = [motivos[0]];
  await escolherFoto(`App.chkTirarFoto('${ieM.itemId}', true)`, "fileGeneralGaleria", "F-G1");
  T(ieM.fotos[3].motivo === motivos[0], "botao geral com 1 motivo marcado: foto ligada a ele");
  const html = roda(`chkFotosItemHtml(getCurrentChkLinha().modeloSnapshot[0].itens[0], getCurrentChkLinha().itens.find(i => i.itemId === '${ieM.itemId}'), ${JSON.stringify([motivos[0]])})`);
  T(html.includes("chk-mfoto") && html.includes("Sem motivo") && html.includes("draggable") && html.includes(`chkTirarFotoMotivo('${ieM.itemId}',0,false)`), "caixa por motivo, caixa 'sem motivo' (foto do motivo desmarcado), arrastavel e com botao de camera");
  const htmlSem = roda(`chkFotosItemHtml({ id:'x' }, { conforme:'atende', fotos:[] }, [])`);
  T(htmlSem.includes("Nenhuma foto ainda") && !htmlSem.includes("chk-mfoto"), "item que atende: sem caixas por motivo");
  // motivo desmarcado e remarcado: a foto volta para a caixa dele
  ieM.motivosSelecionados = [motivos[0], mB];
  T(ieM.fotos[1].motivo === mB, "motivo remarcado: a foto continua ligada a ele");

  // telas de verdade: cada aba do preenchimento (secoes + memorial) e a revisao final renderizam sem erro
  lm.tipoLinha = "horizontal_flexivel";
  for(let i = 0; i < nSec + 1; i++){
    roda(`STATE.ui.chkSecaoAtual = ${i}`);
    const h = roda("screenChkPreencher()");
    T(typeof h === "string" && h.includes("chk-tabs") && !/undefined|NaN/.test(h.replace(/placeholder="[^"]*"/g, "")), "aba " + i + " do preenchimento nao renderizou direito");
    if(i === nSec) T(h.includes("chkMemVivo") && h.includes("Revisar e finalizar") && h.includes("Memorial ZLQ") && !h.includes("chk-fab-stack"), "aba do memorial: campos, botao de revisar e sem botao de camera de item");
    else T(!h.includes("chkMemVivo") && h.includes("Memorial ZLQ"), "aba de secao " + i + ": tem a aba do memorial na barra e nao o conteudo dele");
  }
  roda(`STATE.ui.chkSecaoAtual = ${nSec - 1}`);
  T(!roda("screenChkPreencher()").includes("Revisar e finalizar"), "com o memorial existindo, a ultima secao nao e mais a ultima aba");
  lm.tipoLinha = "vertical";
  roda(`STATE.ui.chkSecaoAtual = ${nSec - 1}`);
  const hv = roda("screenChkPreencher()");
  T(!hv.includes("Memorial ZLQ") && hv.includes("Revisar e finalizar"), "linha vertical: sem aba do memorial e a ultima secao fecha com o botao de revisar");
  lm.tipoLinha = "horizontal_flexivel";
  const memGuardado = lm.memorial;
  lm.memorial = {};
  const fin = roda("screenChkFinalizar()");
  T(fin.includes("Memorial ZLQ incompleto") && fin.includes("altura da ancoragem"), "revisao final avisa memorial incompleto");
  lm.memorial = { hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8 };
  T(!roda("screenChkFinalizar()").includes("Memorial ZLQ incompleto"), "memorial completo: sem aviso na revisao final");
  lm.memorial = memGuardado;

  // o tipo da linha nasce do modelo e fica congelado na linha (editar o modelo depois nao muda linha ja criada)
  roda(`(function(){ const m = novoChkModelo(); m.nome = "Modelo vertical"; m.tipoLinha = "vertical"; const s = novoChkSecao(); s.titulo = "S"; const i = novoChkItem(); i.descricao = "i"; s.itens = [i]; m.secoes = [s]; STATE.checklists.modelos.push(m); globalThis.__mv = m; })()`);
  roda(`App.chkSetNovaLinhaDraft("nome","LV-VERT"); App.chkSetNovaLinhaDraft("modeloId", __mv.id); App.chkCriarLinha();`);
  const lv = roda("setor.linhas[setor.linhas.length-1]");
  T(lv.tipoLinha === "vertical" && roda("chkTipoLinha(getCurrentChkLinha())") === "vertical", "a linha criada guarda o tipo do modelo");
  roda(`__mv.tipoLinha = "horizontal_rigida"`);
  T(lv.tipoLinha === "vertical" && roda("chkTipoLinha(getCurrentChkLinha())") === "vertical" && roda("chkTotalAbas(getCurrentChkLinha())") === 1, "mudar o tipo no modelo depois nao altera a linha ja criada");
  roda("setor.linhas.pop(); STATE.checklists.modelos.pop(); delete globalThis.__mv;");
}
// ---------- capitulos novos do laudo: parecer, quadro de nao conformidades, Metodologia (variaveis e marcacao),
// Memorial ZLQ, Anexos, ordem dos capitulos e as telas/acoes que os ligam ----------
async function testarCapitulosNovos(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("capitulos novos: " + msg); };
  const FOTO = (n)=> "data:image/jpeg;base64," + n;
  roda(`(function(){
    const m = novoChkModelo(); m.nome = "Modelo F3"; m.tipoLinha = "horizontal_flexivel";
    const s1 = novoChkSecao(); s1.titulo = "Cabo de Aço";
    const a = novoChkItem(); a.descricao = "Cabo integro"; a.prioridade = "critica"; a.motivosPadrao = [{ motivo:"Corrosao", texto:"T1", acao:"Substituir o cabo." }, { motivo:"Fios rompidos", texto:"T2", acao:"" }];
    const b = novoChkItem(); b.descricao = "Grampos"; b.prioridade = "media"; b.motivosPadrao = [{ motivo:"Folgados", texto:"T3", acao:"Reapertar." }];
    s1.itens = [a, b];
    const s2 = novoChkSecao(); s2.titulo = "Documentação"; const c = novoChkItem(); c.descricao = "ART"; c.prioridade = "alta"; s2.itens = [c];
    const s3 = novoChkSecao(); s3.titulo = "Trólei"; const d3 = novoChkItem(); d3.descricao = "Trolei ok"; d3.prioridade = "critica"; s3.itens = [d3];
    m.secoes = [s1, s2, s3];
    STATE.checklists.modelos.push(m);
    const l = novoChkLinha(m); l.nome = "LV-F3"; l.descricao = "Acesso ao telhado.";
    l.secoesNA = [s3.id];
    const ex = (it)=> chkItemExec(l, it.id);
    ex(a).conforme = "naoAtende"; ex(a).motivosSelecionados = ["Corrosao", "Fios rompidos"]; ex(a).fotos = [{ foto:"data:image/jpeg;base64,P1", motivo:"Fios rompidos" }, { foto:"data:image/jpeg;base64,P2", motivo:"Corrosao" }];
    ex(b).conforme = "naoAtende"; ex(b).motivosSelecionados = ["Folgados"]; ex(b).fotos = [];
    ex(c).conforme = "naoAtende"; ex(c).motivosSelecionados = []; ex(c).fotos = [];
    ex(d3).conforme = "naoAtende"; ex(d3).motivosSelecionados = []; ex(d3).fotos = [{ foto:"data:image/jpeg;base64,PNA" }];
    globalThis.__f3 = { m, l, a, b, c, d3, proj: { empresa:"Cliente F3", responsavel:"Resp F3", solicitanteCargo:"Cargo F3", art:"ART999", dataInspecao:"2026-09-24", objetivo:"" }, setor: { nome:"Silo 3" } };
  })()`);
  const L = roda("__f3.l");

  // --- lclCfg (novo formato) e lclTextos
  T(roda("JSON.stringify(lclCfg({}))") === '{"fotoCapa":true,"capitulos":{"metodologia":true,"checklist":true,"corpo":true,"memorial":true,"conclusao":true,"anexos":true},"parecer":"","anexos":[]}', "lclCfg sem nada gravado: " + roda("JSON.stringify(lclCfg({}))"));
  T(roda(`lclCfg({ laudo:{ parecer:"inapta" } }).parecer`) === "inapta" && roda(`lclCfg({ laudo:{ parecer:"xx" } }).parecer`) === "", "parecer invalido gravado vira automatico");
  const anx = roda(`(function(){ const l = { laudo:{ anexos:[{ src:"data:image/jpeg;base64,X", legenda:"ART" }, { src:"" }, null, { src:"data:image/jpeg;base64,Y" }] } }; const c = lclCfg(l); c.anexos[0].legenda = "mexi"; return { n: c.anexos.length, leg: l.laudo.anexos[0].legenda, l1: c.anexos[1].legenda }; })()`);
  T(anx.n === 2 && anx.leg === "ART" && anx.l1 === "", "anexos: so os validos, e mexer no resultado nao altera a linha");
  roda("delete STATE.checklists.textos");
  T(roda("lclTextos().metodologia.texto") === roda("LCL_METODOLOGIA_PADRAO.join('\\n')") && roda("lclTextos().metodologia.figuras.length") === 0, "sem texto salvo, a Metodologia deveria ser a padrao");
  roda(`STATE.checklists.textos = { metodologia: { texto: "", figuras: [{ src:"data:image/jpeg;base64,Z", legenda:"L" }, { src:"" }] } }`);
  T(roda("lclTextos().metodologia.texto") === "" && roda("lclTextos().metodologia.figuras.length") === 1, "texto vazio salvo de proposito continua vazio; figura sem imagem e descartada");
  roda("delete STATE.checklists.textos");

  // --- prioridade, acao e quadro de nao conformidades
  const nc = roda("lclNaoConformidades(__f3.l)");
  T(nc.map(x=>x.num + ":" + x.prioridade).join(",") === "1.1:critica,2.1:alta,1.2:media", "ordem do quadro: critica, alta, media (secao nao se aplica fora): " + nc.map(x=>x.num + ":" + x.prioridade).join(","));
  T(nc[0].imagem === FOTO("P2") && nc[0].acoes.join("|") === "Substituir o cabo.|Regularizar: Fios rompidos", "foto do 1o motivo e acoes (vazia cai em 'Regularizar: motivo'): " + JSON.stringify([nc[0].imagem, nc[0].acoes]));
  T(nc[1].acoes.join("|") === "Regularizar o item." && nc[1].imagem === "" && nc[2].acoes.join("|") === "Reapertar.", "item sem motivo e acao preenchida");
  T(roda("lclParecerAuto(__f3.l)") === "inapta" && roda("lclParecer(__f3.l)") === "inapta", "item critico que nao atende deixa a linha inapta");
  roda("chkItemExec(__f3.l, __f3.a.id).conforme = 'atende'");
  T(roda("lclParecerAuto(__f3.l)") === "ressalvas", "so alta/media: apta com ressalvas");
  roda("chkItemExec(__f3.l, __f3.b.id).conforme = 'atende'; chkItemExec(__f3.l, __f3.c.id).conforme = 'atende'");
  T(roda("lclParecerAuto(__f3.l)") === "apta" && roda("lclNaoConformidades(__f3.l).length") === 0, "nada que nao atende: apta (a secao NA nao conta)");
  roda("__f3.l.laudo = { parecer:'inapta' }");
  T(roda("lclParecer(__f3.l)") === "inapta" && roda("lclParecerAuto(__f3.l)") === "apta", "o parecer escolhido vence o automatico");
  roda("delete __f3.l.laudo");
  roda("chkItemExec(__f3.l, __f3.a.id).conforme = 'naoAtende'; chkItemExec(__f3.l, __f3.b.id).conforme = 'naoAtende'; chkItemExec(__f3.l, __f3.c.id).conforme = 'naoAtende'");
  // linha criada antes de prioridade/acao existirem: o campo ausente cai no modelo de hoje, depois no padrao
  const leg = roda(`(function(){
    const l = JSON.parse(JSON.stringify(__f3.l));
    const ia = l.modeloSnapshot[0].itens[0]; delete ia.prioridade; ia.motivosPadrao.forEach(mp=>{ delete mp.acao; });
    const r1 = lclNaoConformidades(l).find(x=>x.num === "1.1");
    l.modeloId = "nao-existe";
    const r2 = lclNaoConformidades(l).find(x=>x.num === "1.1");
    return { p1: r1.prioridade, a1: r1.acoes, p2: r2.prioridade, a2: r2.acoes };
  })()`);
  T(leg.p1 === "critica" && leg.a1[0] === "Substituir o cabo." && leg.p2 === "media" && leg.a2[0] === "Regularizar: Corrosao", "snapshot antigo: prioridade/acao do modelo de hoje, e padrao se o modelo sumiu: " + JSON.stringify(leg));

  // --- Metodologia: variaveis e marcacao
  const vars = roda(`({ a: "Alfa", b: ["x", "y", "z"], c: ["so"] })`);
  const ap = (t)=> roda(`lclAplicarVariaveis(${JSON.stringify(t)}, { a:"Alfa", b:["x","y","z"], c:["so"], vazio:"" })`);
  T(ap("Oi {{a}} e {{ a }}.") === "Oi Alfa e Alfa.", "variavel simples (com e sem espaco)");
  T(ap("Lista: {{b}}.") === "Lista: x, y e z.", "lista no meio do texto vira 'x, y e z'");
  T(ap("{{b}}") === "- x\n- y\n- z" && ap("antes\n{{c}}\ndepois") === "antes\n- so\ndepois", "lista sozinha numa linha vira itens");
  T(ap("{{nao_existe}} e {{vazio}}!") === "{{nao_existe}} e !", "variavel desconhecida fica como escrita; vazia some");
  const mk = (t, figs, redu)=> roda(`lclMarkup(${JSON.stringify(t)}, ${JSON.stringify(figs || [])}, ${redu || "(x)=> x ? 'r' + x : ''"})`);
  let b = mk("## Titulo\nLinha 1\nLinha 2\n\n- um\n- dois\n\nNome | Valor\n--- | ---\nA | 1\nB | 2\n\nFim <b>x</b>");
  T(b.length === 5 && b[0].html === '<div class="lcl-h3">Titulo</div>' && b[0].grudaNoProximo === true && b[1].html === '<p class="lcl-par">Linha 1<br>Linha 2</p>', "titulo, paragrafo com quebra: " + JSON.stringify(b.map(x=>x.html)));
  T(b[2].html === '<ul class="lcl-lista"><li>um</li><li>dois</li></ul>' && b[3].html === '<table class="lcl-tbl"><tr><th>Nome</th><th>Valor</th></tr><tr><td>A</td><td>1</td></tr><tr><td>B</td><td>2</td></tr></table>', "lista e tabela (a linha de tracos some): " + b[3].html);
  T(b[4].html.includes("&lt;b&gt;x&lt;/b&gt;") && !b[4].html.includes("<b>x"), "HTML digitado no texto e escapado");
  b = mk("Antes\n[figura 2]\nDepois", [{ src:"s1", legenda:"Primeira" }, { src:"s2", legenda:"Segunda" }]);
  T(b.length === 4 && b[1].html.includes('src="rs2"') && b[1].html.includes("Figura 2 — Segunda") && b[3].html.includes('src="rs1"') && b[3].html.includes("Figura 1 — Primeira"), "figura no lugar citado; a nao citada vai para o fim: " + JSON.stringify(b.map(x=>x.html.slice(0, 60))));
  T(mk("[figura 1]", [{ src:"s1", legenda:"" }], "(x)=> ''").length === 0 && mk("[figura 9]", [{ src:"s1", legenda:"" }]).length === 1, "figura que nao carrega some; numero que nao existe e ignorado (a figura 1 vai para o fim)");

  // --- blocos da Metodologia e do laudo inteiro
  roda("__f3.l.tipoLinha = 'horizontal_flexivel'; __f3.l.memorial = { hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8 }");
  const d = "(function(){ return lclDados(__f3.proj, __f3.setor, __f3.l); })()";
  const caps0 = roda(`lclPlano(__f3.proj, __f3.l).map(c=>c.id + ":" + c.num).join(",")`);
  T(caps0 === "metodologia:1,checklist:2,corpo:3,memorial:4,conclusao:5", "ordem e numeracao com memorial: " + caps0);
  const capMem = roda("lclPlano(__f3.proj, __f3.l).find(c=>c.id === 'memorial')");
  T(capMem.subs.length === 1 && capMem.subs[0].num === "4.1" && capMem.subs[0].ancora === "cap-memoria", "memorial tem o subcapitulo 'Memoria de calculo'");
  const metB = roda(`lclBlocosMetodologia(${d}, lclPlano(__f3.proj, __f3.l)[0], lclTextos(), (x)=> x)`);
  const metHtml = metB.map(x=>x.html).join("");
  T(metB[0].quebrarAntes === true && metB[0].ancora === "cap-metodologia" && metB[0].html.includes("1  Metodologia"), "Metodologia abre pagina nova com a ancora do capitulo");
  T(metHtml.includes("LV-F3") && metHtml.includes("Cliente F3") && metHtml.includes("24 de setembro de 2026") && metHtml.includes("horizontal flexível") && metHtml.includes("Cabo de Aço e Documentação") && metHtml.includes("NR-35") && !metHtml.includes("{{") && metHtml.includes("<li>ABNT NBR 14626"), "texto padrao com as variaveis trocadas (nome, empresa, data, tipo, secoes, normas em lista): " + metHtml.slice(0, 300));
  const metObj = roda(`(function(){ const p = Object.assign({}, __f3.proj, { objetivo:"Descricao livre." }); const d = lclDados(p, __f3.setor, __f3.l); return lclBlocosMetodologia(d, { num:1, rot:"Metodologia", ancora:"cap-metodologia" }, { metodologia:{ texto:"## Corpo\\nTexto.", figuras:[] } }, (x)=> x).map(x=>x.html); })()`);
  T(metObj[0].includes("Descrição do trabalho") && metObj[0].includes("1  Metodologia") && metObj[1].includes("Descricao livre.") && metObj[2].includes("Corpo"), "a descricao do trabalho do projeto vem antes do texto da Metodologia: " + JSON.stringify(metObj));
  T(roda(`lclBlocosMetodologia(${d}, { num:1, rot:"M", ancora:"a" }, { metodologia:{ texto:"", figuras:[] } }, (x)=> x).length`) === 0 && roda(`lclPlano(__f3.proj, __f3.l).some(c=>c.id === "metodologia")`) === true, "sem texto e sem descricao nao ha blocos");
  roda("STATE.checklists.textos = { metodologia: { texto: '' } }");
  T(roda(`lclPlano(__f3.proj, __f3.l).some(c=>c.id === "metodologia")`) === false, "Metodologia vazia e sem descricao: o capitulo nao entra");
  roda("delete STATE.checklists.textos");

  // --- conclusao
  const fotosMapa = "new Map([['" + FOTO("P1") + "','" + FOTO("rP1") + "'],['" + FOTO("P2") + "','" + FOTO("rP2") + "'],['assinatura','" + FOTO("ASS") + "']])";
  const todos = roda(`(function(){ const d = lclDados(__f3.proj, __f3.setor, __f3.l); return lclMontarBlocos(d, lclTextos(), lclPlano(__f3.proj, __f3.l), ${fotosMapa}, null); })()`);
  const iConc = todos.findIndex(x=> x.ancora === "cap-conclusao");
  const conc = todos.slice(iConc);
  const c0 = conc[0].html, cq = conc.filter(x=> x.html.includes("lcl-ncr")).map(x=> x.html).join(""), cFim = conc[conc.length - 1].html;
  T(c0.includes("PARECER: INAPTA") && c0.includes("lcl-selo no") && c0.includes("1 não atendem") === false, "selo do parecer na conclusao: " + c0.slice(0, 400));
  T(/lcl-pb"><span>Crítica<\/span><div class="tr"><i style="width:100%;background:#D9534F"><\/i><\/div><b>1<\/b>/.test(c0) && c0.includes("<b>1</b></div><div class=\"lcl-pb\"><span>Média") , "barras de acao por prioridade: " + c0.slice(c0.indexOf("lcl-pri"), c0.indexOf("lcl-pri") + 500));
  T(c0.includes("Foram avaliados 3 itens") && c0.includes("não atendem") && c0.includes("não deve ser utilizada"), "texto automatico com a frase do parecer");
  T(conc[1].grudaNoProximo === true && conc[1].html.includes("Quadro de não conformidades") && cq.includes("1.1 · Cabo de Aço") && cq.includes("rP2") && cq.includes("sem foto") && cq.includes("Substituir o cabo.<br>Regularizar: Fios rompidos") && cq.indexOf("1.1 · ") < cq.indexOf("2.1 · ") && cq.indexOf("2.1 · ") < cq.indexOf("1.2 · "), "quadro: imagem do item, prioridade, acao e ordem: " + cq.slice(0, 300));
  T(cFim.includes("ART nº <b>ART999</b>") && cFim.includes("Próxima inspeção até: 24/09/2027") && cFim.includes(FOTO("ASS")) && !cFim.includes("lcl-ncr"), "fim da conclusao: ART, proxima inspecao e assinatura");
  roda("__f3.l.conclusaoTexto = 'Texto do engenheiro.'");
  T(roda(`lclBlocosConclusao(${d}, { num:5, rot:"Conclusão", ancora:"cap-conclusao" }, "", (x)=> x)[0].html`).includes("Texto do engenheiro.") && !roda(`lclBlocosConclusao(${d}, { num:5, rot:"Conclusão", ancora:"cap-conclusao" }, "", (x)=> x)[0].html`).includes("Foram avaliados"), "a conclusao escrita pelo engenheiro substitui a automatica");
  roda("__f3.l.conclusaoTexto = ''");
  roda("[__f3.a, __f3.b, __f3.c].forEach(it=>{ chkItemExec(__f3.l, it.id).conforme = 'atende'; })");
  const concOk = roda(`lclBlocosConclusao(${d}, { num:5, rot:"Conclusão", ancora:"cap-conclusao" }, "", (x)=> x)`);
  T(concOk.length === 2 && concOk[0].html.includes("PARECER: APTA") && concOk[0].html.includes("lcl-selo ok") && concOk[0].html.includes("Nenhuma ação recomendada.") && !concOk[0].html.includes("Quadro de não conformidades"), "sem nao conformidades: apta, sem barras nem quadro");
  roda("[__f3.a, __f3.b, __f3.c].forEach(it=>{ chkItemExec(__f3.l, it.id).conforme = 'naoAtende'; })");

  // --- memorial
  const memB = todos.filter(x=> { const i = todos.indexOf(x); const iM = todos.findIndex(y=> y.ancora === "cap-memorial"); return i >= iM && i < iConc; });
  const iFx = memB.findIndex(x=> x.ancora === "cap-memoria"), nFx = memB.length - iFx - 1;
  T(iFx === 3 && nFx >= 10 && memB.length === 3 + nFx + 1 && memB[0].ancora === "cap-memorial" && memB[0].html.includes("4  Memorial de Cálculo — Zona Livre de Queda") && memB[0].html.includes("<svg") && memB[0].html.includes("lcl-mcard") && memB[0].html.includes("PODE USAR") && memB[0].html.includes("NÃO USAR") && memB[0].html.includes("Cabo de aço 8 mm") && memB[0].html.includes("ATENDE"), "memorial: blocos (uma formula por bloco), ancora, cartoes dos 2 EPI e do cabo e ilustracao: " + memB.length);
  T(memB[1].html.includes("Legenda") && memB[1].html.includes("Condições de uso") && memB[2].html.includes("Premissas") && memB[2].html.includes("Parecer.") && memB[3].ancora === "cap-memoria" && memB[3].quebrarAntes === true && memB[3].html.includes("4.1  Memória de cálculo") && memB[3].html.includes("<math>") && memB[memB.length - 1].html.includes("lcl-tz") && memB.slice(3, -1).every(x=> x.html.includes("lcl-fm")), "memorial: legenda, condicoes, premissas, parecer, e a memoria de calculo em pagina nova (uma formula por bloco)");
  roda("__f3.l.memorial.memoria = false");
  T(roda(`lclMontarBlocos(${d}, lclTextos(), lclPlano(__f3.proj, __f3.l), new Map(), null).filter(x=> x.ancora === "cap-memoria").length`) === 0 && roda("lclPlano(__f3.proj, __f3.l).find(c=>c.id === 'memorial').subs.length") === 0, "sem a pagina da memoria de calculo: sem bloco e sem subitem");
  roda("__f3.l.memorial.memoria = true");
  roda("__f3.l.tipoLinha = 'horizontal_rigida'; delete __f3.l.memorial.flechaCm");
  T(roda("lclPlano(__f3.proj, __f3.l).some(c=>c.id === 'memorial')") === true && roda(`lclBlocosMemorial(${d}, { num:4, rot:"Memorial", ancora:"cap-memorial" })[0].html`).includes("viga W200x26,6"), "viga rigida nao precisa de flecha");
  roda("__f3.l.tipoLinha = 'horizontal_flexivel'");
  T(roda("lclPlano(__f3.proj, __f3.l).some(c=>c.id === 'memorial')") === false && roda(`lclBlocosMemorial(${d}, { num:4, rot:"M", ancora:"a" }).length`) === 0, "cabo sem flecha: o memorial nao entra");
  roda("__f3.l.memorial.flechaCm = 46.9");
  roda("__f3.l.laudo = { capitulos:{ memorial:false } }");
  T(roda("lclPlano(__f3.proj, __f3.l).some(c=>c.id === 'memorial')") === false, "memorial desligado: nao entra");
  roda("delete __f3.l.laudo");
  roda("__f3.l.tipoLinha = 'vertical'");
  T(roda("lclPlano(__f3.proj, __f3.l).some(c=>c.id === 'memorial')") === false, "linha vertical: sem memorial");
  roda("__f3.l.tipoLinha = 'horizontal_flexivel'");

  // --- anexos
  roda(`__f3.l.laudo = { anexos:[{ src:"${FOTO("A1")}", legenda:"ART" }, { src:"${FOTO("A2")}", legenda:"" }, { src:"${FOTO("A3")}", legenda:"Certificado" }] }`);
  const capsA = roda("lclPlano(__f3.proj, __f3.l).map(c=>c.id).join(',')");
  T(capsA === "metodologia,checklist,corpo,memorial,conclusao,anexos", "anexos entram por ultimo: " + capsA);
  const anB = roda(`lclBlocosAnexos(${d}, { num:6, rot:"Anexos", ancora:"cap-anexos" }, (x)=> x === "${FOTO("A2")}" ? "" : "r" + x)`);
  T(anB.length === 2 && anB[0].ancora === "cap-anexos" && anB[0].quebrarAntes && anB[0].html.includes("6  Anexos") && anB[0].html.includes("Anexo A — ART") && anB[1].html.includes("Anexo B — Certificado") && anB[1].ancora === undefined && !anB[1].html.includes("6  Anexos"), "um bloco por imagem que carrega, A e B em sequencia: " + JSON.stringify(anB.map(x=>x.html.slice(0, 90))));
  roda("__f3.l.laudo = { capitulos:{ anexos:false }, anexos:[{ src:'" + FOTO("A1") + "', legenda:'' }] }");
  T(roda("lclPlano(__f3.proj, __f3.l).some(c=>c.id === 'anexos')") === false, "anexos desligado: nao entra");
  roda("delete __f3.l.laudo");
  T(roda("lclPlano(__f3.proj, __f3.l).some(c=>c.id === 'anexos')") === false, "sem imagem de anexo o capitulo nao entra");

  // --- fluxo completo (2 passadas) com todos os capitulos: ordem das paginas e sumario com o numero real
  roda(`__f3.l.laudo = { anexos:[{ src:"${FOTO("A1")}", legenda:"ART" }] }`);
  const fluxo = await roda(`(async function(){
    const d = lclDados(__f3.proj, __f3.setor, __f3.l), caps = lclPlano(__f3.proj, __f3.l);
    const fotos = new Map([["${FOTO("P1")}","${FOTO("rP1")}"],["${FOTO("P2")}","${FOTO("rP2")}"],["${FOTO("A1")}","${FOTO("rA1")}"]]);
    const medirReal = async (html)=> Math.ceil(html.length / 9);
    let mapa = null, paginas = null;
    for(let i = 0; i < 3; i++){
      paginas = await lclPaginar(lclMontarBlocos(d, lclTextos(), caps, fotos, mapa), medirReal, 900);
      const novo = lclAncoras(paginas);
      if(mapa && JSON.stringify(novo) === JSON.stringify(mapa)) break;
      mapa = novo;
    }
    return { mapa, sum: paginas.find(p=>p.blocos.some(b=>b.sumario)).blocos.filter(b=>b.sumario).map(b=>b.html).join(""), doc: lclMontarDoc(paginas, d) };
  })()`);
  const ordem = ["cap-metodologia", "cap-checklist", "cap-corpo", "cap-memorial", "cap-memoria", "cap-conclusao", "cap-anexos"];
  ordem.forEach((a, i)=>{
    T(fluxo.mapa[a] > 1, "ancora " + a + " sem pagina");
    if(i) T(fluxo.mapa[a] >= fluxo.mapa[ordem[i - 1]], "capitulos fora de ordem: " + a + " (pag " + fluxo.mapa[a] + ") antes de " + ordem[i - 1] + " (pag " + fluxo.mapa[ordem[i - 1]] + ")");
  });
  T(fluxo.mapa["cap-memoria"] > fluxo.mapa["cap-memorial"], "a memoria de calculo comeca em pagina nova depois do memorial");
  T(fluxo.sum.includes("4  Memorial de Cálculo — Zona Livre de Queda<i></i>" + fluxo.mapa["cap-memorial"]) && fluxo.sum.includes("4.1  Memória de cálculo<i></i>" + fluxo.mapa["cap-memoria"]) && fluxo.sum.includes("6  Anexos<i></i>" + fluxo.mapa["cap-anexos"]) && !fluxo.sum.includes(">00<"), "sumario com memorial, subitem e anexos, cada um com a pagina real: " + fluxo.sum.replace(/<[^>]+>/g, " ").slice(0, 300));
  // links: cada "ver 3.1" e cada linha do sumario aponta para um destino que existe, uma unica vez, no documento montado
  const hrefs = [...fluxo.doc.matchAll(/href="#(lcl-a-[^"]+)"/g)].map(m=>m[1]);
  const ids = [...fluxo.doc.matchAll(/class="lcl-alvo" id="([^"]+)"/g)].map(m=>m[1]);
  T(new Set(ids).size === ids.length, "destinos de link duplicados no documento: " + ids.join(","));
  T(hrefs.length >= 13 && hrefs.every(h=> ids.includes(h)), "link sem destino no documento: " + hrefs.filter(h=> !ids.includes(h)).join(","));
  T(fluxo.sum.includes('href="#lcl-a-cap-normativo"') && fluxo.sum.includes('href="#lcl-a-cap-memoria"') && fluxo.sum.includes('href="#lcl-a-cap-anexos"') && fluxo.sum.includes('onclick="return App.lclIrPara(event)"'), "linhas do sumario sao links: " + fluxo.sum.slice(0, 200));
  const verLinks = [...fluxo.doc.matchAll(/<a class="lcl-rver" href="#(lcl-a-cap-sec-[^"]+)"[^>]*>ver ([0-9.]+)<\/a>/g)].map(m=>[m[1], m[2]]);
  T(verLinks.length === 3 && verLinks.every(v=> ids.includes(v[0])) && verLinks.map(v=>v[1]).join(",") === "3.1,3.1,3.2", "'ver N' do checklist vira link para a secao certa do corpo: " + JSON.stringify(verLinks));
  T(fluxo.mapa["cap-sec-" + roda("__f3.l.modeloSnapshot[0].id")] >= 1, "a secao de destino tem pagina");
  // mesma ancora em dois blocos: so a 1a ocorrencia vira destino (id repetido faria o link cair na pagina errada)
  const dup = roda(`lclMontarDoc([{ blocos:[{ ancora:"a", html:"x" }] }, { blocos:[{ ancora:"a", ancoraExtra:"b", html:"y" }, { ancora:"b", html:"z" }] }], lclDados(__f3.proj, __f3.setor, __f3.l))`);
  T((dup.match(/id="lcl-a-a"/g) || []).length === 1 && (dup.match(/id="lcl-a-b"/g) || []).length === 1 && dup.indexOf('id="lcl-a-a"') < dup.indexOf('id="lcl-a-b"'), "destino repetido: so a 1a ocorrencia de cada ancora vira id: " + dup.slice(0, 300));
  // clique na previa: nao deixa o navegador mudar o endereco e nao quebra se o destino sumiu
  let evitou = false;
  const ret = roda("App.lclIrPara")({ preventDefault(){ evitou = true; }, currentTarget:{ getAttribute: ()=> "#lcl-a-nao-existe" } });
  T(evitou === true && ret === false, "lclIrPara: cancela a navegacao padrao e devolve false");
  T(roda("App.lclIrPara")({ preventDefault(){}, currentTarget:null }) === false && roda("App.lclIrPara")(null) === false, "lclIrPara sem evento valido nao quebra");
  roda("delete __f3.l.laudo");

  // --- acoes do App: parecer, memorial, Metodologia (com figuras) e anexos
  roda(`STATE.ui.chkLinhaId = "${L.id}"; STATE.ui.chkSetorId = setor.id; STATE.ui.chkProjetoId = proj.id;`);
  const sa = roda("setor.linhas.push(__f3.l), setor.id"); // a linha de teste precisa estar no setor aberto para o App achar
  roda("App.lclSetParecer('ressalvas')");
  T(L.laudo.parecer === "ressalvas" && roda("lclParecer(__f3.l)") === "ressalvas", "lclSetParecer grava na linha");
  roda("App.lclSetParecer('lixo')");
  T(L.laudo.parecer === "", "parecer invalido volta ao automatico");
  roda("App.lclSetMemorial('epi','tab'); App.lclSetMemorial('memoria', false); App.lclSetMemorial('hanc', 99);");
  T(L.memorial.epi === "tab" && L.memorial.memoria === false && L.memorial.hanc === 5 && roda("chkMemorialDe(__f3.l).epi") === "tab", "lclSetMemorial grava so epi/memoria e ignora outras chaves");
  roda("App.lclSetMemorial('epi','qualquer')");
  T(L.memorial.epi === "tq", "EPI invalido volta para trava-quedas");
  roda("App.lclSetMemorial('memoria', true)");
  roda("__f3.l.status = 'finalizado'; STATE.ui.chkSecaoAtual = 0; App.lclIrMemorial()");
  T(roda("STATE.ui.chkSecaoAtual") === 0, "linha finalizada: nao abre a aba de medidas (so avisa)");
  roda("__f3.l.status = 'em_andamento'; App.lclIrMemorial()");
  T(roda("STATE.ui.chkSecaoAtual") === L.modeloSnapshot.length, "Medidas leva para a aba do memorial");
  // Metodologia: rascunho de figuras so vale ao salvar
  roda(`__lclMetDraft = [{ src:"${FOTO("G1")}", legenda:"" }, { src:"${FOTO("G2")}", legenda:"" }]`);
  roda("App.lclMetLegenda(0, 'Primeira'); App.lclMetRemoverFigura(1);");
  T(roda("__lclMetDraft.length") === 1 && roda("__lclMetDraft[0].legenda") === "Primeira", "rascunho de figuras: legenda e remocao");
  inputFake("lclMetTexto").value = "## Meu texto\nCom {{empresa}}.";
  roda("App.lclSalvarMetodologia()");
  const mt = roda("lclTextos().metodologia");
  T(mt.texto === "## Meu texto\nCom {{empresa}}." && mt.figuras.length === 1 && mt.figuras[0].legenda === "Primeira" && roda("__lclMetDraft.length") === 0, "salvar a Metodologia grava texto e figuras e zera o rascunho");
  roda(`globalThis.__tmp = STATE.checklists.textos.metodologia.figuras`);
  roda(`__lclMetDraft = [{ src:"${FOTO("G3")}", legenda:"x" }]`);
  T(roda("STATE.checklists.textos.metodologia.figuras.length") === 1 && roda("STATE.checklists.textos.metodologia.figuras[0].src") === FOTO("G1"), "mexer no rascunho depois nao altera o que foi salvo");
  roda("App.lclRestaurarMetodologia()");
  T(inputFake("lclMetTexto").value === roda("LCL_METODOLOGIA_PADRAO.join('\\n')") && roda("lclTextos().metodologia.texto") === "## Meu texto\nCom {{empresa}}.", "'Texto padrao' so preenche o campo; nada e gravado sem Salvar");
  roda("delete STATE.checklists.textos; __lclMetDraft = [];");
  // Anexos
  roda(`__f3.l.laudo = { anexos:[{ src:"${FOTO("A1")}", legenda:"" }, { src:"${FOTO("A2")}", legenda:"" }] }`);
  roda("App.lclAnexoLegenda(1, 'Certificado'); App.lclAnexoLegenda(9, 'x')");
  T(L.laudo.anexos[1].legenda === "Certificado" && L.laudo.anexos.length === 2, "legenda do anexo (indice invalido ignorado)");
  roda("App.lclAnexoRemover(0)");
  T(L.laudo.anexos.length === 1 && L.laudo.anexos[0].src === FOTO("A2"), "remover anexo");
  roda("delete __f3.l.laudo");
  roda("setor.linhas.pop(); STATE.checklists.modelos.pop();");
}
// ---------- editar o texto do laudo na leitura: texto da secao (por linha), conclusao, e os atalhos para
// Metodologia e Normativo; o texto editado so vale na linha, volta ao automatico e nao sai com botao no PDF ----------
async function testarEdicaoTexto(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("edicao de texto: " + msg); };
  const J = (v)=> JSON.stringify(v);
  // --- funcoes puras
  T(roda("lclHtmlParaTexto(" + J('<mark class="nc">A &amp; B (Foto 1)</mark> C &lt;x&gt; &quot;q&quot; &#39;s&#39;') + ")") === `**A & B (Foto 1)** C <x> "q" 's'`, "HTML da narrativa para texto simples (destaque vira **, entidades voltam)");
  T(roda("lclTextoParaHtml(" + J("Um **dest** & <b>\n\nDois\nlinha") + ")") === '<p>Um <mark class="nc">dest</mark> &amp; &lt;b&gt;</p><p>Dois<br>linha</p>', "texto editado vira paragrafos, destaque e escape: " + roda("lclTextoParaHtml(" + J("Um **dest** & <b>\n\nDois\nlinha") + ")"));
  T(roda("lclTextoParaHtml(" + J("a ** b") + ")") === "<p>a ** b</p>" && roda("lclTextoParaHtml('')") === "" && roda("lclTextoParaHtml(null)") === "", "asteriscos soltos ficam como estao; vazio nao gera nada");
  T(roda(`lclTextoEditado({ laudo:{ textos:{ a:"Oi", b:"  ", c:5 } } }, "a")`) === "Oi" && roda(`lclTextoEditado({ laudo:{ textos:{ b:"  " } } }, "b")`) === null && roda(`lclTextoEditado({ laudo:{ textos:{ c:5 } } }, "c")`) === null && roda(`lclTextoEditado({}, "a")`) === null && roda(`lclTextoEditado(null, "a")`) === null, "lclTextoEditado: so texto nao vazio conta como edicao");

  const L = roda("__f3.l");
  const secId = roda("__f3.l.modeloSnapshot[0].id"), secId2 = roda("__f3.l.modeloSnapshot[1].id");
  const auto = roda("chkNarrativaSecao(__f3.l.modeloSnapshot[0], __f3.l).html");
  T(auto.includes('<mark class="nc">'), "preparo: a narrativa automatica da secao 1 deveria ter trecho destacado");
  T(roda("lclTextoParaHtml(lclHtmlParaTexto(chkNarrativaSecao(__f3.l.modeloSnapshot[0], __f3.l).html))") === "<p>" + auto + "</p>", "ida e volta: narrativa automatica -> texto -> HTML preserva o destaque");

  // --- blocos do laudo com texto editado
  roda("delete __f3.l.laudo");
  const d = "lclDados(__f3.proj, __f3.setor, __f3.l)";
  const capCorpo = "lclPlano(__f3.proj, __f3.l).find(c=>c.id === 'corpo')";
  const fotosReduzidas = "(x)=> x";
  const corpoAuto = roda(`lclBlocosCorpo(${d}, ${capCorpo}, ${fotosReduzidas})`);
  T(corpoAuto[0].editar.tipo === "secao" && corpoAuto[0].editar.id === secId && corpoAuto[0].editar.editado === false && corpoAuto[0].html.includes(auto), "sem edicao: o corpo usa a narrativa automatica e o botao diz 'Editar texto'");
  roda("__f3.l.laudo = " + J({ textos: { [secId]: "Texto do engenheiro com **destaque**.\n\nSegundo paragrafo." } }));
  const corpoEd = roda(`lclBlocosCorpo(${d}, ${capCorpo}, ${fotosReduzidas})`);
  T(corpoEd[0].html.includes('<p>Texto do engenheiro com <mark class="nc">destaque</mark>.</p><p>Segundo paragrafo.</p>') && !corpoEd[0].html.includes(auto) && corpoEd[0].editar.editado === true, "com edicao: o texto do engenheiro substitui a narrativa");
  T(corpoEd[0].html.includes("lcl-fotos-col") && corpoEd[0].html.includes("Foto 1"), "as fotos da secao continuam ao lado do texto editado");
  T(corpoEd[1].editar.editado === false && corpoEd[1].editar.id === secId2 && !corpoEd[1].html.includes("Texto do engenheiro"), "a edicao de uma secao nao vaza para a outra");
  T(corpoEd[0].alternativa().every((b, i)=> i > 0 || (b.editar && b.editar.id === secId)), "o layout alternativo (muitas fotos) tambem leva o botao de editar");
  const outra = roda("(function(){ const l2 = JSON.parse(JSON.stringify(__f3.l)); delete l2.laudo; return lclTextoEditado(l2, '" + secId + "'); })()");
  T(outra === null, "uma copia da linha sem a edicao continua automatica (a edicao e por linha)");

  // --- conclusao
  const auto2 = roda("lclConclusaoAuto(__f3.l)");
  T(auto2.includes("Foram avaliados") && auto2.includes("LV-F3") && auto2.includes("não atendem"), "texto automatico da conclusao: " + auto2);
  roda("__f3.l.conclusaoTexto = ''");
  const c1 = roda(`lclBlocosConclusao(${d}, { num:5, rot:"Conclusão", ancora:"cap-conclusao" }, "", (x)=> x)[0]`);
  T(c1.editar.tipo === "conclusao" && c1.editar.editado === false && c1.html.includes(auto2.slice(0, 40)), "conclusao automatica: botao 'Editar texto'");
  roda("__f3.l.conclusaoTexto = 'Conclusao escrita.'");
  const c2 = roda(`lclBlocosConclusao(${d}, { num:5, rot:"Conclusão", ancora:"cap-conclusao" }, "", (x)=> x)[0]`);
  T(c2.editar.editado === true && c2.html.includes("Conclusao escrita.") && !c2.html.includes("Foram avaliados"), "conclusao escrita: marcada como editada");
  roda("__f3.l.conclusaoTexto = ''");
  const p2 = roda(`lclBlocosPagina2(${d}, lclTextos())`);
  T(p2.find(b=> b.ancora === "cap-normativo").editar.tipo === "normativo", "o Normativo oferece o atalho para o editor do Normativo");
  T(roda(`lclBlocosMetodologia(${d}, { num:1, rot:"Metodologia", ancora:"cap-metodologia" }, lclTextos(), (x)=> x)[0].editar.tipo`) === "metodologia", "a Metodologia oferece o atalho para o editor dela");

  // --- botao no documento da tela (e so nos blocos que pedem)
  const doc = roda(`lclMontarDoc([{ blocos:[{ html:"<i>x</i>", editar:{ tipo:"secao", id:"abc", editado:false } }] }, { blocos:[{ html:"<i>y</i>", editar:{ tipo:"conclusao", id:"", editado:true } }] }, { blocos:[{ html:"<i>z</i>" }] }], ${d})`);
  T((doc.match(/class="lcl-edit-btn/g) || []).length === 2, "so os blocos com 'editar' ganham botao: " + (doc.match(/class="lcl-edit-btn/g) || []).length);
  T(doc.includes(`<div class="lcl-edit-bar"><button type="button" class="lcl-edit-btn" onclick="App.lclEditarTexto('secao','abc')">Editar texto</button></div><div class="lcl-corpo">`) && doc.includes(`class="lcl-edit-btn ed" onclick="App.lclEditarTexto('conclusao','')">Texto editado · editar</button>`), "botao no canto da pagina, antes do corpo (nao ocupa espaco do texto), com o rotulo certo: " + doc.slice(0, 260));

  // --- acoes do App
  roda("setor.linhas.push(__f3.l); STATE.ui.chkLinhaId = __f3.l.id; STATE.ui.chkSetorId = setor.id; STATE.ui.chkProjetoId = proj.id;");
  roda("delete __f3.l.laudo");
  const abrir = (tipo, id)=>{ sandbox.__ultimoOverlayHtml = null; roda(`App.lclEditarTexto(${J(tipo)}, ${J(id)})`); return sandbox.__ultimoOverlayHtml; };
  let ov = abrir("secao", secId);
  T(ov && ov.includes('id="lclEditTexto"') && ov.includes("**") && ov.includes("Texto automático: ao salvar") && !ov.includes("Voltar ao automático") && ov.includes('Texto da seção &quot;Cabo de Aço&quot;'), "editor da secao abre com o texto automatico, sem 'Voltar ao automatico'");
  inputFake("lclEditTexto").value = "Meu texto.";
  roda("__lclParaLinha = 'montado'; __lclPaginas = [1]; __lclHtml = 'x';");
  roda("App.lclSalvarTextoEditado()");
  T(L.laudo.textos[secId] === "Meu texto." && roda("__lclParaLinha") === null && roda("__lclPaginas.length") === 0 && roda("__lclHtml") === "", "salvar grava na linha e descarta a montagem antiga (pede nova)");
  ov = abrir("secao", secId);
  T(ov.includes("Voltar ao automático") && ov.includes("Este texto foi editado por você.") && ov.includes("Meu texto."), "reabrir mostra o texto editado e oferece voltar ao automatico");
  inputFake("lclEditTexto").value = "  " + roda("__lclEdit.auto").replace(/ /g, "  ") + " ";
  roda("App.lclSalvarTextoEditado()");
  T(!(secId in L.laudo.textos), "salvar com o texto igual ao automatico (so espacos diferentes) nao vira edicao");
  roda("App.lclGravarTextoEditado('x')"); // __lclEdit ja foi zerado: nao pode quebrar nem gravar
  T(!("undefined" in L.laudo.textos) && Object.keys(L.laudo.textos).length === 0, "gravar sem edicao em andamento nao faz nada");
  L.laudo.textos[secId] = "Editado de novo.";
  abrir("secao", secId);
  inputFake("lclEditTexto").value = "   ";
  roda("App.lclSalvarTextoEditado()");
  T(!(secId in L.laudo.textos), "salvar em branco volta ao automatico");
  L.laudo.textos[secId] = "Vai ser descartado?";
  abrir("secao", secId);
  sandbox.confirm = () => false;
  roda("App.lclRestaurarTextoEditado()");
  sandbox.confirm = () => true;
  T(L.laudo.textos[secId] === "Vai ser descartado?", "voltar ao automatico sem confirmar nao descarta o texto");
  roda("App.lclRestaurarTextoEditado()");
  T(!(secId in L.laudo.textos), "voltar ao automatico confirmado descarta o texto editado");
  // conclusao
  ov = abrir("conclusao", "");
  T(ov.includes("Texto da conclusão") && ov.includes("Foram avaliados") && !ov.includes("Voltar ao automático"), "editor da conclusao abre com o texto automatico");
  inputFake("lclEditTexto").value = "Conclusao do engenheiro.";
  roda("App.lclSalvarTextoEditado()");
  T(L.conclusaoTexto === "Conclusao do engenheiro." && !("conclusao" in (L.laudo.textos || {})), "a conclusao usa o mesmo campo da tela Finalizar");
  ov = abrir("conclusao", "");
  T(ov.includes("Voltar ao automático") && ov.includes("Conclusao do engenheiro."), "conclusao editada: reabre com o texto e oferece voltar");
  inputFake("lclEditTexto").value = roda("__lclEdit.auto");
  roda("App.lclSalvarTextoEditado()");
  T(L.conclusaoTexto === "", "conclusao igual a automatica volta a ser automatica");
  // desconhecidos e atalhos
  T(abrir("secao", "nao-existe") === null && abrir("xx", "") === null, "secao inexistente ou tipo desconhecido nao abre nada");
  T((abrir("metodologia", "") || "").includes("Texto da Metodologia") && (abrir("normativo", "") || "").includes("Texto do Normativo"), "os atalhos abrem os editores de Metodologia e Normativo");
  roda("__lclMetDraft = [];");
  roda("setor.linhas.pop(); delete __f3.l.laudo;");
}
// ---------- fotos da secao na leitura do laudo: mover entre motivos (arrastar ou "Mover para"), excluir com
// confirmacao, numeracao "Foto N" e botao so quando ha foto ----------
async function testarFotosLeituraLaudo(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("fotos na leitura do laudo: " + msg); };
  const J = (v)=> JSON.stringify(v);
  const L = roda("__f3.l");
  const sec1 = roda("__f3.l.modeloSnapshot[0].id"), sec2 = roda("__f3.l.modeloSnapshot[1].id"), sec3 = roda("__f3.l.modeloSnapshot[2].id");
  const itA = roda("__f3.a.id"), itB = roda("__f3.b.id");
  // estado de partida: item A (nao atende; motivos Corrosao e Fios rompidos) com 2 fotos; B sem foto; secao 2 sem foto
  roda(`(function(){ const ex = chkItemExec(__f3.l, __f3.a.id); ex.conforme = "naoAtende"; ex.motivosSelecionados = ["Corrosao", "Fios rompidos"]; ex.fotos = [{ foto:"data:image/jpeg;base64,P1", motivo:"Fios rompidos" }, { foto:"data:image/jpeg;base64,P2", motivo:"Corrosao" }]; delete __f3.l.laudo; })()`);

  // --- numeracao: chkFotosDaSecao devolve os objetos na ordem do laudo (as de um motivo em sequencia)
  const ob = roda("chkFotosDaSecao(__f3.l.modeloSnapshot[0], __f3.l)");
  T(ob.objetos.length === 2 && ob.objetos[0].foto === "data:image/jpeg;base64,P2" && ob.fotos[0] === ob.objetos[0].foto, "objetos na mesma ordem das fotos do laudo (Corrosao primeiro)");

  // --- HTML da janela
  let h = roda(`lclFotosSecaoHtml(__f3.l, ${J(sec1)})`);
  T(h.includes("1.1 · Cabo integro") && !h.includes("1.2 · Grampos") && h.includes('<div class="chk-mfoto-t">Corrosao</div>') && h.includes('<div class="chk-mfoto-t">Fios rompidos</div>') && !h.includes("Sem motivo</div>"), "so itens com foto, uma caixa por motivo marcado, sem caixa 'Sem motivo' quando todas tem motivo");
  T(h.indexOf("Foto 1") < h.indexOf("Foto 2") && h.indexOf('chk-mfoto-t">Corrosao') < h.indexOf("Foto 1") && h.indexOf("Foto 1") < h.indexOf('chk-mfoto-t">Fios rompidos'), "o numero e o da foto no laudo (P2, do 1o motivo, e a Foto 1)");
  T((h.match(/draggable="true"/g) || []).length === 2 && h.includes(`App.lclFotoDrop(event,'${itA}',0)`) && h.includes(`App.lclFotoDrop(event,'${itA}',1)`) && h.includes("App.lclFotoExcluir(") && h.includes('<option value="-1"'), "fotos arrastaveis, caixas que recebem, lixeira e 'Mover para'");
  T(roda(`lclFotosSecaoHtml(__f3.l, ${J(sec2)})`).includes("Nenhuma foto nesta seção.") && roda(`lclFotosSecaoHtml(__f3.l, "nao-existe")`) === "", "secao sem foto avisa; secao inexistente nao devolve nada");
  // item que atende com foto: so lixeira, sem arrastar nem 'Mover para'
  roda(`(function(){ const ex = chkItemExec(__f3.l, __f3.b.id); ex.conforme = "atende"; ex.motivosSelecionados = ["Folgados"]; ex.fotos = [{ foto:"data:image/jpeg;base64,PB" }]; })()`);
  h = roda(`lclFotosSecaoHtml(__f3.l, ${J(sec1)})`);
  const blocoB = h.slice(h.indexOf("1.2 · Grampos"));
  T(blocoB.includes("lcl-fcard") && !blocoB.includes("draggable") && !blocoB.includes("lcl-fsel") && !blocoB.includes("chk-mfoto"), "item que atende (mesmo com motivo marcado antes): so as fotos e a lixeira");
  roda(`(function(){ const ex = chkItemExec(__f3.l, __f3.b.id); ex.conforme = "naoAtende"; ex.motivosSelecionados = ["Folgados"]; ex.fotos = []; })()`);
  // foto de motivo desmarcado cai na caixa 'Sem motivo'
  roda(`chkItemExec(__f3.l, __f3.a.id).motivosSelecionados = ["Corrosao"]`);
  h = roda(`lclFotosSecaoHtml(__f3.l, ${J(sec1)})`);
  T(h.includes('<div class="chk-mfoto-t">Sem motivo</div>') && h.includes(`App.lclFotoDrop(event,'${itA}',-1)`) && !h.includes('chk-mfoto-t">Fios rompidos'), "foto de motivo desmarcado aparece em 'Sem motivo'");
  roda(`chkItemExec(__f3.l, __f3.a.id).motivosSelecionados = ["Corrosao", "Fios rompidos"]`);

  // --- botao "Fotos (n)" so quando a secao tem foto; barra unica no canto da pagina
  const d = "lclDados(__f3.proj, __f3.setor, __f3.l)";
  const corpo = roda(`lclBlocosCorpo(${d}, lclPlano(__f3.proj, __f3.l).find(c=>c.id === 'corpo'), (x)=> x)`);
  T(corpo[0].fotosEd && corpo[0].fotosEd.id === sec1 && corpo[0].fotosEd.n === 2 && corpo[0].alternativa()[0].fotosEd.n === 2, "secao com foto oferece 'Fotos (2)' (tambem no layout alternativo)");
  T(!corpo[1].fotosEd, "secao sem foto nao oferece o botao de fotos");
  const doc = roda(`lclMontarDoc([{ blocos:[{ html:"<i>x</i>", editar:{ tipo:"secao", id:"abc", editado:false }, fotosEd:{ id:"abc", n:3 } }] }, { blocos:[{ html:"<i>y</i>", editar:{ tipo:"conclusao", id:"", editado:false } }] }, { blocos:[{ html:"<i>z</i>" }] }], ${d})`);
  T(doc.includes(`<div class="lcl-edit-bar"><button type="button" class="lcl-edit-btn" onclick="App.lclEditarTexto('secao','abc')">Editar texto</button><button type="button" class="lcl-edit-btn" onclick="App.lclAbrirFotos('abc')">Fotos (3)</button></div><div class="lcl-corpo">`), "uma barra por pagina, com os dois botoes juntos: " + doc.slice(0, 330));
  T((doc.match(/class="lcl-edit-bar"/g) || []).length === 2, "pagina sem botao nao ganha barra");

  // --- acoes do App
  roda("setor.linhas.push(__f3.l); STATE.ui.chkLinhaId = __f3.l.id; STATE.ui.chkSetorId = setor.id; STATE.ui.chkProjetoId = proj.id;");
  const outraAntes = J(roda("setor.linhas[0]"));
  sandbox.__ultimoOverlayHtml = null;
  roda(`App.lclAbrirFotos(${J(sec1)})`);
  T(sandbox.__ultimoOverlayHtml && sandbox.__ultimoOverlayHtml.includes('id="lclFotosCorpo"') && sandbox.__ultimoOverlayHtml.includes('Fotos da seção "Cabo de Aço"') && !sandbox.__ultimoOverlayHtml.includes("foi editado por você") && roda("__lclFotosSec") === sec1, "a janela abre com as fotos da secao");
  roda(`__f3.l.laudo = { textos:{ ${J(sec1)}: "Texto editado." } }`);
  sandbox.__ultimoOverlayHtml = null;
  roda(`App.lclAbrirFotos(${J(sec1)})`);
  T(sandbox.__ultimoOverlayHtml.includes("foi editado por você"), "texto da secao editado: a janela avisa para conferir os numeros de foto");
  roda("delete __f3.l.laudo");
  sandbox.__ultimoOverlayHtml = null;
  roda(`App.lclAbrirFotos("nao-existe")`);
  T(sandbox.__ultimoOverlayHtml === null, "secao inexistente nao abre janela");
  roda(`App.lclAbrirFotos(${J(sec1)})`);

  const fotoA = (i)=> L.itens.find(x=> x.itemId === itA).fotos[i];
  roda("__lclParaLinha = 'montado'; __lclPaginas = [1]; __lclHtml = 'x';");
  const antesTempo = L.atualizadoEm;
  roda(`App.lclFotoMover(${J(itA)}, 0, 0)`); // P1 (Fios rompidos) -> Corrosao
  T(fotoA(0).motivo === "Corrosao" && roda("__lclParaLinha") === null && roda("__lclPaginas.length") === 0, "mover para outro motivo muda o vinculo e descarta a montagem antiga");
  T(roda(`chkNarrativaSecao(__f3.l.modeloSnapshot[0], __f3.l).html`).includes("(Fotos 1 e 2)"), "a citacao automatica do texto acompanha: as duas fotos agora sao do mesmo motivo");
  roda(`App.lclFotoMover(${J(itA)}, 0, -1)`);
  T(fotoA(0).motivo === "" && L.itens.find(x=> x.itemId === itA).fotos.length === 2, "'Sem motivo' limpa o vinculo e nao apaga a foto");
  roda(`App.lclFotoMover(${J(itA)}, 9, 0); App.lclFotoMover("nao-existe", 0, 0);`);
  T(fotoA(0).motivo === "", "foto ou item inexistente: nada muda");
  // arrastar: so vale dentro do mesmo item
  const dt = (txt)=> ({ preventDefault(){}, dataTransfer:{ getData: ()=> txt } });
  roda("App.lclFotoDrop")(dt(itA + "|0"), itA, 1);
  T(fotoA(0).motivo === "Fios rompidos", "soltar a foto na caixa do 2o motivo (arrastar)");
  roda(`App.lclFotoMover(${J(itA)}, 0, 9)`);
  T(fotoA(0).motivo === "Fios rompidos", "motivo inexistente: a foto continua onde estava");
  roda("App.lclFotoDrop")(dt(itB + "|0"), itA, 0);
  roda("App.lclFotoDrop")(dt("lixo"), itA, 0);
  roda("App.lclFotoDrop")(dt(itA + "|x"), itA, 0);
  T(fotoA(0).motivo === "Fios rompidos", "soltar foto de outro item, ou dado invalido: nada muda");
  T(roda("(function(){ const e = { dataTransfer:{ setData(k, v){ this.v = v; } } }; App.lclFotoDrag(e, 'i1', 3); return e.dataTransfer.v; })()") === "i1|3", "ao arrastar, a foto se identifica com item e posicao");
  // excluir: pede confirmacao
  sandbox.confirm = () => false;
  roda(`App.lclFotoExcluir(${J(itA)}, 0)`);
  sandbox.confirm = () => true;
  T(L.itens.find(x=> x.itemId === itA).fotos.length === 2, "excluir sem confirmar nao apaga");
  roda(`App.lclFotoExcluir(${J(itA)}, 9); App.lclFotoExcluir("nao-existe", 0);`);
  T(L.itens.find(x=> x.itemId === itA).fotos.length === 2, "excluir foto inexistente: nada acontece");
  const depoisIds = L.itens.find(x=> x.itemId === itA).fotos.map(f=> f.foto);
  roda(`App.lclFotoExcluir(${J(itA)}, 0)`);
  const restantes = L.itens.find(x=> x.itemId === itA).fotos;
  T(restantes.length === 1 && restantes[0].foto === depoisIds[1], "excluir confirmado tira so a foto escolhida");
  T(roda(`chkNarrativaSecao(__f3.l.modeloSnapshot[0], __f3.l).fotos.length`) === 1, "o laudo ja nao tem a foto excluida");
  T(L.atualizadoEm !== antesTempo, "a linha e marcada como alterada (para sincronizar)");
  roda("App.lclFecharFotos()");
  T(roda("__lclFotosSec") === "", "fechar a janela limpa o estado");
  T(J(roda("setor.linhas[0]")) === outraAntes, "mexer nas fotos de uma linha nao toca em outra linha");
  roda("setor.linhas.pop(); delete __f3.l.laudo;");
}
// ---------- cadastro do projeto: mascaras de CPF/CNPJ e telefone, validade 12 meses depois, cadastro de inspetores
// (ativar/desativar), descricao do trabalho editavel no laudo e formatacao no laudo ----------
async function testarCadastroProjeto(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("cadastro do projeto: " + msg); };
  const J = (v)=> JSON.stringify(v);
  const doc = (v)=> roda("chkMascaraDocumento(" + J(v) + ")"), tel = (v)=> roda("chkMascaraTelefone(" + J(v) + ")");

  // --- CPF ou CNPJ no mesmo campo, conforme a quantidade de digitos
  T(doc("") === "" && doc("1") === "1" && doc("123") === "123" && doc("1234") === "123.4" && doc("12345678") === "123.456.78" && doc("123456789") === "123.456.789" && doc("1234567890") === "123.456.789-0" && doc("12345678901") === "123.456.789-01", "CPF progressivo: " + doc("12345678901"));
  T(doc("123456789012") === "12.345.678/9012" && doc("1234567890123") === "12.345.678/9012-3" && doc("12345678901234") === "12.345.678/9012-34", "com o 12o digito vira CNPJ: " + doc("123456789012"));
  T(doc("12345678901234999") === "12.345.678/9012-34" && doc("abc") === "" && doc("12.345.678/9012-34") === "12.345.678/9012-34" && doc("123.456.789-01") === "123.456.789-01" && doc(null) === "", "limite de 14 digitos, letras ignoradas, valor ja formatado nao muda");
  // --- telefone com DDD
  T(tel("") === "" && tel("6") === "(6" && tel("64") === "(64" && tel("649") === "(64) 9" && tel("6499615") === "(64) 9961-5" && tel("6499615451") === "(64) 9961-5451" && tel("64996154510") === "(64) 99615-4510" && tel("649961545109999") === "(64) 99615-4510", "telefone: " + tel("64996154510"));
  T(tel("(64) 99615-4510") === "(64) 99615-4510" && tel("64 9961-5451") === "(64) 9961-5451", "telefone ja formatado ou com espacos");
  // --- mostrar valor antigo sem perder nada
  const ex = (f, v)=> roda(f + "(" + J(v) + ")");
  T(ex("chkExibirDocumento", "32825302000195") === "32.825.302/0001-95" && ex("chkExibirDocumento", "00000000191") === "000.000.001-91" && ex("chkExibirDocumento", "123") === "123" && ex("chkExibirDocumento", "Isento") === "Isento" && ex("chkExibirDocumento", "") === "", "exibir documento antigo");
  T(ex("chkExibirTelefone", "64996154510") === "(64) 99615-4510" && ex("chkExibirTelefone", "64 90000-0000") === "(64) 90000-0000" && ex("chkExibirTelefone", "+55 64 99615-4510") === "+55 64 99615-4510" && ex("chkExibirTelefone", "ramal 123") === "ramal 123" && ex("chkExibirTelefone", "") === "", "exibir telefone antigo; numero de fora/ramal fica como foi escrito");
  // --- validacao (so avisa)
  T(roda(`chkValidarCpf("52998224725")`) === true && roda(`chkValidarCpf("529.982.247-25")`) === true && roda(`chkValidarCpf("52998224724")`) === false && roda(`chkValidarCpf("11111111111")`) === false && roda(`chkValidarCpf("00000000000")`) === false && roda(`chkValidarCpf("123")`) === false, "CPF: digito verificador");
  T(roda(`chkValidarCnpj("11444777000161")`) === true && roda(`chkValidarCnpj("32825302000195")`) === true && roda(`chkValidarCnpj("11444777000162")`) === false && roda(`chkValidarCnpj("11111111111111")`) === false && roda(`chkValidarCnpj("00000000000000")`) === false, "CNPJ: digito verificador (todos zeros nao vale)");
  T(roda(`chkAvisoDocumento("")`) === "" && roda(`chkAvisoDocumento("529.982.247-25")`) === "" && roda(`chkAvisoDocumento("529.982.247-24")`).startsWith("CPF inválido") && roda(`chkAvisoDocumento("11.444.777/0001-61")`) === "" && roda(`chkAvisoDocumento("11.444.777/0001-62")`).startsWith("CNPJ inválido") && roda(`chkAvisoDocumento("12345")`).startsWith("Incompleto"), "mensagens de aviso do CPF/CNPJ");

  // --- validade: 12 meses depois
  T(roda(`chkMaisMesesISO("2026-09-24", 12)`) === "2027-09-24" && roda(`chkMaisMesesISO("2024-02-29", 12)`) === "2025-02-28" && roda(`chkMaisMesesISO("", 12)`) === "" && roda(`chkMaisMesesISO("lixo", 12)`) === "" && roda(`chkMaisMesesISO("2026-01-31", 1)`) === "2026-02-28" && roda(`chkMaisMesesISO("2026-11-15", 3)`) === "2027-02-15", "chkMaisMesesISO");

  // --- projeto novo e o setter com validade automatica
  const idAntes = roda("STATE.ui.chkProjetoId"), nAntes = roda("STATE.checklists.projetos.length");
  roda("App.chkNovoProjeto()");
  const P = roda("getCurrentChkProjeto()");
  T(P.validadeInspecao === roda("chkMaisMesesISO(hoje(), 12)") && P.validadeInspecao !== "" && P.inspetorId === "", "projeto novo ja nasce com a validade 12 meses depois e sem inspetor");
  roda(`App.chkSetProjetoField("dataInspecao", "2026-09-01")`);
  T(P.validadeInspecao === "2027-09-01" && inputFake("chkPfValidade").value === "2027-09-01", "mudar a data da inspecao acompanha a validade automatica (e o campo na tela)");
  roda(`App.chkSetProjetoField("validadeInspecao", "2027-03-15")`);
  roda(`App.chkSetProjetoField("dataInspecao", "2026-10-10")`);
  T(P.validadeInspecao === "2027-03-15", "validade escolhida pela pessoa nao e mais mexida: " + P.validadeInspecao);
  roda(`App.chkSetProjetoField("validadeInspecao", "")`);
  roda(`App.chkSetProjetoField("dataInspecao", "2026-12-31")`);
  T(P.validadeInspecao === "2027-12-31", "validade apagada volta a acompanhar a data");
  roda(`App.chkSetProjetoField("dataInspecao", "")`);
  T(P.validadeInspecao === "" && P.dataInspecao === "", "sem data de inspecao, sem validade automatica");
  roda(`App.chkSetProjetoField("empresa", "Empresa Y")`);
  T(P.empresa === "Empresa Y", "os outros campos continuam gravando normalmente");

  // --- mascara enquanto digita (cursor volta para depois do mesmo digito)
  const el = (valor, pos)=>({ value: valor, selectionStart: pos, pos: null, setSelectionRange(a){ this.pos = a; } });
  let e = el("1234", 4);
  roda("App.chkMascarar")(e, "solicitanteCpfCnpj");
  T(e.value === "123.4" && e.pos === 5 && P.solicitanteCpfCnpj === "123.4", "digitando no fim: formata e o cursor fica no fim: " + e.value + "/" + e.pos);
  e = el("1234", 2);
  roda("App.chkMascarar")(e, "solicitanteCpfCnpj");
  T(e.value === "123.4" && e.pos === 2, "digitando no meio: o cursor fica depois do mesmo digito: " + e.pos);
  e = el("123456789012", 12);
  roda("App.chkMascarar")(e, "solicitanteCpfCnpj");
  T(e.value === "12.345.678/9012" && P.solicitanteCpfCnpj === "12.345.678/9012", "ao passar de 11 digitos o campo vira CNPJ");
  e = el("64996154510", 11);
  roda("App.chkMascarar")(e, "solicitanteTelefone");
  T(e.value === "(64) 99615-4510" && P.solicitanteTelefone === "(64) 99615-4510", "telefone formatado e gravado");
  e = el("abc", 3);
  roda("App.chkMascarar")(e, "solicitanteTelefone");
  T(e.value === "" && P.solicitanteTelefone === "" && e.pos === 0, "so letras: campo fica vazio");
  e = el("999", 3);
  roda("App.chkMascarar")(e, "empresa");
  T(e.value === "999" && P.empresa === "Empresa Y", "campo que nao e de mascara e ignorado");
  inputFake("chkPfDocAviso").textContent = "velho";
  roda("App.chkMascarar")(el("5299", 4), "solicitanteCpfCnpj");
  T(inputFake("chkPfDocAviso").textContent === "", "digitando, o aviso antigo some");
  roda("App.chkVerificarDocumento")({ value: "529.982.247-24" });
  T(inputFake("chkPfDocAviso").textContent.startsWith("CPF inválido"), "ao sair do campo, avisa CPF invalido");
  roda("App.chkVerificarDocumento")({ value: "529.982.247-25" });
  T(inputFake("chkPfDocAviso").textContent === "", "CPF certo: sem aviso");

  // --- opcoes da lista de inspetores
  const reg = [{ id:"a", nome:"Zé Silva", cargo:"Engenheiro", ativo:true }, { id:"b", nome:"Ana Souza", cargo:"", ativo:true }, { id:"c", nome:"Carlos", cargo:"Técnico", ativo:false }, { id:"d", nome:"  ", ativo:true }];
  const op = (proj)=> roda(`chkOpcoesInspetor(${J(proj)}, ${J(reg)})`).map(o=> o.valor + "|" + o.rotulo);
  T(op({}).join(";") === "|Responsável técnico (padrão);b|Ana Souza;a|Zé Silva — Engenheiro", "so os ativos, em ordem alfabetica, com o cargo; sem nome nao aparece: " + op({}).join(";"));
  T(op({ inspetorId:"c" }).includes("c|Carlos (inativo)") && !op({}).some(x=> x.startsWith("c|")), "inspetor desativado some da lista, mas continua no projeto que ja o usa");
  T(op({ inspetorId:"", inspetorNome:"Fulano" }).includes("__texto|Fulano (não cadastrado)") && op({ inspetorId:"a" }).length === 3, "nome antigo sem cadastro continua aparecendo; inspetor ativo nao duplica");

  // --- escolher o inspetor no projeto
  roda("STATE.checklists.inspetores = " + J(reg));
  roda(`App.chkSetProjetoInspetor("a")`);
  T(P.inspetorId === "a" && P.inspetorNome === "Zé Silva" && P.inspetorCargo === "Engenheiro", "escolher inspetor preenche id, nome e cargo");
  roda(`App.chkSetProjetoInspetor("__texto")`);
  roda(`App.chkSetProjetoInspetor("nao-existe")`);
  T(P.inspetorId === "a" && P.inspetorNome === "Zé Silva", "'nao cadastrado' e id desconhecido nao mexem em nada");
  roda(`App.chkSetProjetoInspetor("")`);
  T(P.inspetorId === "" && P.inspetorNome === "" && P.inspetorCargo === "", "voltar ao padrao limpa o inspetor (o laudo usa o responsavel tecnico)");
  roda(`App.chkSetProjetoInspetor("a")`);

  // --- cadastro de inspetores
  sandbox.__ultimoOverlayHtml = null;
  roda("App.chkAbrirInspetores()");
  T(sandbox.__ultimoOverlayHtml && sandbox.__ultimoOverlayHtml.includes('id="chkInspetoresLista"') && sandbox.__ultimoOverlayHtml.includes("Zé Silva") && sandbox.__ultimoOverlayHtml.includes("Inativo"), "a janela do cadastro lista os inspetores, ativos e inativos");
  const nIns = roda("STATE.checklists.inspetores.length");
  roda("App.chkInspetorNovo()");
  const novo = roda("STATE.checklists.inspetores[STATE.checklists.inspetores.length - 1]");
  T(roda("STATE.checklists.inspetores.length") === nIns + 1 && novo.nome === "" && novo.ativo === true && novo.id, "novo inspetor nasce ativo e em branco");
  roda(`App.chkInspetorSet("a", "nome", "Zé Silva Jr.")`);
  T(roda(`STATE.checklists.inspetores.find(i=>i.id==="a").nome`) === "Zé Silva Jr." && P.inspetorNome === "Zé Silva Jr.", "corrigir o nome atualiza os projetos que usam esse inspetor");
  roda(`App.chkInspetorSet("a", "cargo", "Eng. Mecânico")`);
  T(P.inspetorCargo === "Eng. Mecânico", "idem para o cargo");
  roda(`App.chkInspetorSet("a", "ativo", false); App.chkInspetorSet("nao-existe", "nome", "x");`);
  T(roda(`STATE.checklists.inspetores.find(i=>i.id==="a").ativo`) === true, "so nome e cargo se editam por aqui");
  roda(`App.chkInspetorAtivo("a")`);
  T(roda(`STATE.checklists.inspetores.find(i=>i.id==="a").ativo`) === false && P.inspetorNome === "Zé Silva Jr.", "desativar nao mexe no projeto que ja usa");
  T(roda(`chkOpcoesInspetor(getCurrentChkProjeto(), STATE.checklists.inspetores)`).some(o=> o.valor === "a" && o.rotulo.includes("(inativo)")), "o projeto continua mostrando o inspetor desativado");
  roda(`App.chkInspetorAtivo("a")`);
  T(roda(`STATE.checklists.inspetores.find(i=>i.id==="a").ativo`) === true, "ativar de novo");

  // --- a tela do cadastro
  roda(`App.chkSetProjetoField("solicitanteCpfCnpj", "32825302000195"); App.chkSetProjetoField("solicitanteTelefone", "64996154510"); App.chkSetProjetoField("solicitanteEmail", "a@b.com");`);
  let tela = roda("screenChkProjetoForm()");
  T(!/undefined|NaN/.test(tela.replace(/placeholder="[^"]*"/g, "")), "a tela renderiza sem undefined/NaN");
  T(tela.includes('value="32.825.302/0001-95"') && tela.includes('value="(64) 99615-4510"') && tela.includes(`oninput="App.chkMascarar(this,'solicitanteCpfCnpj')"`) && tela.includes(`oninput="App.chkMascarar(this,'solicitanteTelefone')"`), "valor guardado so em digitos aparece formatado e os campos usam a mascara");
  T(tela.includes('type="email"') && tela.includes('id="chkPfValidade"') && tela.includes("chk-pf-card") && tela.includes("App.chkAbrirInspetores()") && tela.includes("Descrição do trabalho") && !tela.includes("Conclusão geral") && !tela.includes("conclusaoGeral"), "campos e blocos da tela (sem a Conclusão geral: o laudo da linha não a usa)");
  T(tela.includes('<option value="a" selected>'), "o inspetor do projeto vem selecionado na lista");
  roda(`App.chkSetProjetoField("solicitanteCpfCnpj", "529.982.247-24")`);
  T(roda("screenChkProjetoForm()").includes('id="chkPfDocAviso">CPF inválido'), "CPF completo e errado ja abre com o aviso");
  roda(`App.chkSetProjetoField("solicitanteCpfCnpj", "12.345")`);
  T(!roda("screenChkProjetoForm()").includes("Incompleto"), "documento ainda incompleto nao abre com aviso (so ao sair do campo)");

  // --- no laudo: CPF/CNPJ e telefone formatados mesmo se guardados so em digitos
  const p2 = roda(`lclBlocosPagina2(lclDados({ empresa:"X", solicitanteCpfCnpj:"32825302000195", solicitanteTelefone:"64996154510", dataInspecao:"2026-09-24" }, { nome:"S" }, __f3.l), lclTextos())[0].html`);
  T(p2.includes("32.825.302/0001-95") && p2.includes("(64) 99615-4510"), "o laudo imprime CPF/CNPJ e telefone formatados");

  // --- descricao do trabalho editavel na janela da Metodologia
  roda(`App.chkSetProjetoField("objetivo", "Descricao inicial.")`);
  sandbox.__ultimoOverlayHtml = null;
  roda("App.lclAbrirMetodologia()");
  T(sandbox.__ultimoOverlayHtml.includes('id="lclMetObjetivo"') && sandbox.__ultimoOverlayHtml.includes("Descricao inicial."), "a janela da Metodologia mostra a descricao do trabalho do projeto");
  inputFake("lclMetObjetivo").value = "Descricao editada no laudo.";
  inputFake("lclMetTexto").value = "Texto base.";
  roda("App.lclSalvarMetodologia()");
  T(P.objetivo === "Descricao editada no laudo.", "salvar a Metodologia grava a descricao no projeto");
  roda("delete STATE.checklists.textos; __lclMetDraft = [];");

  // --- migracoes: cadastro de inspetores a partir dos projetos antigos, e validade em branco
  const estado = roda(`(function(){
    const mk = (nome, cargo, data, validade)=> ({ id:uid(), empresa:"E", responsavel:"", data:"2026-01-01", setores:[], numeroDocumento:"", art:"", dataInspecao:data, validadeInspecao:validade, solicitanteCpfCnpj:"", solicitanteEndereco:"", solicitanteCidade:"", solicitanteTelefone:"", solicitanteCargo:"", solicitanteEmail:"", inspetorNome:nome, inspetorCargo:cargo, objetivo:"", conclusaoGeral:"", criadoEm:1, atualizadoEm:1 });
    const est = { modulo:"checklist", projetos:[], projetosSimples:[], checklists:{ modelos:[], projetos:[ mk("João Silva", "Técnico", "2026-09-24", ""), mk("joão silva ", "", "2026-02-28", "2026-12-01"), mk("", "", "2026-05-10", ""), mk("Maria", "Eng.", "", "") ] }, ui:{ chkModeloPadraoAplicado:true, chkModeloPadraoTextoAplicado:true, chkMotivoArrayMigrado:true } };
    chkGarantirNamespace(est);
    const depois1 = JSON.stringify(est.checklists);
    chkGarantirNamespace(est);
    return { est, idem: depois1 === JSON.stringify(est.checklists) };
  })()`);
  const ps = estado.est.checklists.projetos, ins = estado.est.checklists.inspetores;
  T(ins.length === 2 && ins[0].nome === "João Silva" && ins[0].cargo === "Técnico" && ins[0].ativo === true && ins[1].nome === "Maria" && ins[1].cargo === "Eng.", "cada nome de inspetor ja digitado vira um inspetor do cadastro (mesmo nome com outra caixa/espaco: um so): " + J(ins));
  T(ps[0].inspetorId === ins[0].id && ps[1].inspetorId === ins[0].id && !ps[2].inspetorId && ps[3].inspetorId === ins[1].id && ps[1].inspetorNome === "joão silva " && ps[0].inspetorCargo === "Técnico", "projetos passam a apontar para o inspetor, sem mudar o nome/cargo que ja tinham");
  T(ps[0].validadeInspecao === "2027-09-24" && ps[1].validadeInspecao === "2026-12-01" && ps[2].validadeInspecao === "2027-05-10" && ps[3].validadeInspecao === "", "validade em branco vira 12 meses depois; a ja escolhida e a sem data de inspecao ficam como estavam");
  T(estado.idem, "as migracoes de inspetores e de validade sao idempotentes");
  const refeito = roda(`(function(){ const est = { modulo:"checklist", projetos:[], projetosSimples:[], checklists:{ modelos:[], projetos:[{ id:"p1", empresa:"E", setores:[], dataInspecao:"2026-09-24", validadeInspecao:"", inspetorNome:"", inspetorCargo:"" }] }, ui:{ chkModeloPadraoAplicado:true, chkModeloPadraoTextoAplicado:true, chkMotivoArrayMigrado:true } }; chkGarantirNamespace(est); est.checklists.projetos[0].validadeInspecao = ""; chkGarantirNamespace(est); return est.checklists.projetos[0].validadeInspecao; })()`);
  T(refeito === "", "a validade preenchida na migracao so acontece uma vez: se a pessoa apagar, nao volta sozinha");

  // limpeza: tira o projeto de teste e devolve a selecao
  roda(`STATE.checklists.projetos = STATE.checklists.projetos.filter(p => p.id !== ${J(P.id)}); STATE.ui.chkProjetoId = ${J(idAntes)}; STATE.checklists.inspetores = [];`);
  T(roda("STATE.checklists.projetos.length") === nAntes, "preparo/limpeza: o projeto de teste saiu");
}
async function testarEditorModelo(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("editor de modelo: " + msg); };
  const J = (v)=> JSON.stringify(v);
  const conta = (html, trecho)=> html.split(trecho).length - 1;
  const modeloAntes = roda("STATE.ui.chkModeloId"), nAntes = roda("STATE.checklists.modelos.length");

  // --- modelo vazio: so a barra do topo, o aviso e o menu Planilha
  roda("App.chkNovoModelo()");
  let h = roda("screenChkModeloForm()");
  T(h.includes("Nenhuma seção ainda") && h.includes("chk-mod-planilha") && h.includes("App.chkImportarModeloXLSX()") && h.includes("App.chkBaixarModeloXLSX()") && !h.includes("App.chkExportarModeloXLSX()") && !h.includes("chk-mod-split"), "modelo vazio: aviso + menu Planilha (sem 'Baixar esta planilha') e sem painel dividido");

  // --- modelo com 2 secoes: A (3 itens, o primeiro com 2 motivos) e B (2 itens)
  roda(`(function(){
    const m = getCurrentChkModelo();
    m.nome = "Modelo <Teste>"; m.descricao = "Descricao do modelo"; m.tipoLinha = "horizontal_flexivel";
    const mkS = (t, ctx)=>{ const s = novoChkSecao(); s.titulo = t; s.contexto = ctx || ""; return s; };
    const mkI = (d)=>{ const i = novoChkItem(); i.descricao = d; return i; };
    const A = mkS("Ancoragem"), B = mkS("Cabo de Aço");
    const a1 = mkI("Verificar a ancoragem <b>\\"x\\"</b>"), a2 = mkI("Torque dos parafusos"), a3 = mkI("");
    a1.normativo = "NBR 16325-2"; a1.textoAtende = "Atende bem."; a1.prioridade = "critica";
    a1.motivosPadrao = [ { motivo:"Corroida", texto:"Texto da corrosao.", acao:"Substituir." }, { motivo:"Sem ancoragem", texto:"Texto sem.", acao:"" } ];
    A.itens = [a1, a2, a3];
    const b1 = mkI("Cabo sem desfiamento"), b2 = mkI("Cabo com protecao galvanica");
    B.itens = [b1, b2];
    m.secoes = [A, B];
    STATE.ui.chkModeloSecaoSel = null; STATE.ui.chkModeloItemSel = null;
    chkModeloResetTela();
    globalThis.__M = { A, B, a1, a2, a3, b1, b2 };
  })()`);
  const M = roda("globalThis.__M");
  h = roda("screenChkModeloForm()");
  T(h.includes("chk-mod-split") && h.includes('id="chkModeloLista"') && h.includes('id="chkModeloItens"') && h.includes('id="chkModeloEditor"') && h.includes('id="chkModeloBusca"'), "painel dividido com lista, itens, editor e busca");
  T(!h.includes("item-aberto"), "sem selecao explicita o celular abre na lista (nao pula para o editor)");
  T(!h.includes("chk-bloco") && !h.includes("chk-motivo-card") && !h.includes("chk-modelo-split") && !h.includes("chk-modelo-tree"), "classes do editor antigo nao sobraram");
  // barra do topo
  T(h.includes('value="Modelo &lt;Teste&gt;"') && h.includes("Descricao do modelo") && h.includes("selected>Horizontal flexível") && h.includes("App.chkSetModeloField('nome',this.value)") && h.includes("App.chkSetModeloField('descricao',this.value)") && h.includes("App.chkSetModeloField('tipoLinha',this.value)"), "barra: nome (escapado), descricao e tipo de linha ligados ao modelo");
  T(h.includes("App.chkExportarModeloXLSX()") && h.includes("this.closest('details').open=false"), "menu Planilha com 'Baixar esta planilha' quando ha secoes, e fecha ao escolher");
  // lista: A aberta por padrao (primeiro item selecionado), B recolhida
  T(conta(h, "data-chk-item=") === 3 && h.includes(`data-chk-item="${M.a1.id}"`) && !h.includes(`data-chk-item="${M.b1.id}"`), "so a secao da selecao fica aberta na lista (3 itens de A, nenhum de B)");
  T(h.includes('<span class="chk-mod-item-num">1.1</span>') && h.includes('<span class="chk-mod-item-num">1.3</span>') && h.includes("Pergunta ainda não escrita"), "numeracao 1.1.. e item sem texto avisa 'Pergunta ainda nao escrita'");
  T(h.includes("Verificar a ancoragem &lt;b&gt;&quot;x&quot;&lt;/b&gt;") && !h.includes("<b>\"x\"</b>"), "o texto da pergunta e escapado na lista e no editor");
  T(h.includes(`App.chkSelecionarModeloItem('${M.A.id}','${M.a1.id}')`) && h.includes(`App.chkNovoItem('${M.A.id}')`) && h.includes(`App.chkRemoverSecao('${M.A.id}')`) && h.includes(`App.chkModeloToggleSecao('${M.B.id}')`) && h.includes("App.chkNovaSecao()") && h.includes(`App.chkSetSecaoTitulo('${M.A.id}',this.value)`), "lista: selecionar item, + Item, remover secao, abrir/recolher, nova secao, titulo da secao editavel");
  // item aberto: pergunta, norma, prioridade, remover
  T(h.includes("Ancoragem · Item 1.1") && h.includes("App.chkSetItemField('" + M.A.id + "','" + M.a1.id + "','descricao',this.value)") && h.includes('value="NBR 16325-2"') && h.includes("App.chkSetItemField('" + M.A.id + "','" + M.a1.id + "','normativo',this.value)") && h.includes("App.chkRemoverItem('" + M.A.id + "','" + M.a1.id + "')"), "item aberto: pergunta, norma e remover item ligados ao item certo");
  T(h.includes("p-critica") && h.includes('<option value="critica" selected>Crítica</option>') && conta(h, "<option value=\"critica\"") === 1 && h.includes("'prioridade',this.value)"), "prioridade do item (critica marcada) com todas as opcoes");
  // linhas de fluxo: Atende + 2 motivos
  T(h.includes("chk-fl-atende") && h.includes("Atende bem.") && h.includes("'textoAtende',this.value)"), "linha Atende com o texto padrao do laudo");
  T(conta(h, 'class="chk-fl-pilula') === 2 && conta(h, 'class="chk-fl-linha"') === 2 && conta(h, 'class="chk-fl-del"') === 2, "um botao (pilula), uma linha e um excluir por motivo");
  for(const [mi, campo] of [[0,"motivo"],[0,"texto"],[0,"acao"],[1,"motivo"],[1,"texto"],[1,"acao"]]){
    T(h.includes(`App.chkSetMotivoPadrao('${M.A.id}','${M.a1.id}',${mi},'${campo}',this.value)`), "motivo " + mi + " campo " + campo + " ligado");
  }
  T(h.includes(">Corroida</textarea>") && h.includes(">Texto da corrosao.</textarea>") && h.includes(">Substituir.</textarea>") && h.includes(">Sem ancoragem</textarea>") && h.includes(">Texto sem.</textarea>"), "os textos dos motivos aparecem nos campos certos");
  T(h.includes(`App.chkRemoverMotivoPadrao('${M.A.id}','${M.a1.id}',1)`) && h.includes(`App.chkNovoMotivoPadrao('${M.A.id}','${M.a1.id}')`), "excluir motivo e + Motivo");
  T(h.includes("Não atende") && h.includes("chk-fl-cab") && h.includes("chk-fl-seta"), "cabecalho Botao/Laudo/Acao, setas e o grupo 'Nao atende'");
  T(h.includes("onkeydown=\"if(event.key==='Enter')event.preventDefault()\""), "o botao do motivo nao aceita quebra de linha");
  // paineis extras recolhidos (info e contexto vazios), com os dois botoes
  T(h.includes("App.chkModeloPainel('info')") && h.includes("App.chkModeloPainel('contexto')") && !h.includes("chk-mod-painel-tit") && !h.includes('class="dot"'), "Orientacao e Contexto vazios: botoes sem ponto e paineis recolhidos");

  // --- tocar num item: vira selecao explicita (celular abre o editor), so a secao tocada fica aberta
  roda(`App.chkSelecionarModeloItem(${J(M.B.id)}, ${J(M.b2.id)})`);
  h = roda("screenChkModeloForm()");
  T(h.includes("item-aberto") && h.includes("Cabo de Aço · Item 2.2") && h.includes(`data-chk-item="${M.b1.id}"`) && !h.includes(`data-chk-item="${M.a1.id}"`), "tocar em B 2.2: abre o editor, B aberta e A recolhida");
  T(h.includes("App.chkModeloVoltarLista()") && !h.includes("chkSelecionarModeloItem(null,null)"), "botao Secoes e itens (celular) volta para a lista");
  roda("App.chkModeloVoltarLista()");
  T(roda("STATE.ui.chkModeloItemSel") === null && !roda("screenChkModeloForm()").includes("item-aberto"), "voltar para a lista tira a selecao explicita");
  roda(`App.chkSelecionarModeloItem(${J(M.B.id)}, ${J(M.b2.id)})`);

  // --- abrir/recolher secao: primeira escolha congela o padrao e so muda a secao tocada
  roda(`App.chkModeloToggleSecao(${J(M.A.id)})`);
  h = roda("screenChkModeloForm()");
  T(h.includes(`data-chk-item="${M.a1.id}"`) && h.includes(`data-chk-item="${M.b1.id}"`), "abrir A mantem B aberta");
  roda(`App.chkModeloToggleSecao(${J(M.B.id)})`);
  h = roda("screenChkModeloForm()");
  T(h.includes(`data-chk-item="${M.a1.id}"`) && !h.includes(`data-chk-item="${M.b1.id}"`), "recolher B deixa so A");
  roda(`App.chkModeloToggleSecao(${J(M.A.id)})`);
  h = roda("screenChkModeloForm()");
  T(!h.includes("data-chk-item=") && h.includes("Ancoragem") && h.includes("Cabo de Aço") && h.includes("chk-mod-sec-seta"), "tudo recolhido: so os titulos das secoes");

  // --- busca (sem acento e sem diferenca de maiuscula); ao buscar todas as secoes com resultado abrem
  roda(`App.chkModeloBusca("ANCORAGEM")`);
  h = roda("screenChkModeloForm()");
  T(conta(h, "data-chk-item=") === 3 && h.includes(`data-chk-item="${M.a1.id}"`) && !h.includes(`data-chk-item="${M.b1.id}"`) && h.includes('value="ANCORAGEM"'), "busca ANCORAGEM (titulo da secao A, sem acento nem maiuscula) mostra os 3 itens de A e a caixa guarda o termo");
  roda(`App.chkModeloBusca("desfiamento")`);
  h = roda("screenChkModeloForm()");
  T(conta(h, "data-chk-item=") === 1 && h.includes(`data-chk-item="${M.b1.id}"`) && h.includes("Cabo de Aço"), "busca por trecho da pergunta acha so o item (e abre a secao dele)");
  roda(`App.chkModeloBusca("cabo")`);
  h = roda("screenChkModeloForm()");
  T(conta(h, "data-chk-item=") === 2 && h.includes(`data-chk-item="${M.b1.id}"`) && h.includes(`data-chk-item="${M.b2.id}"`), "busca 'cabo' acha os dois itens da secao B (pelo titulo da secao tambem)");
  roda(`App.chkModeloBusca("aco")`);
  h = roda("screenChkModeloForm()");
  T(conta(h, "data-chk-item=") === 2 && h.includes(`data-chk-item="${M.b1.id}"`) && !h.includes(`data-chk-item="${M.a1.id}"`), "busca 'aco' (sem cedilha nem til) acha o titulo 'Cabo de Aço'");
  roda(`App.chkModeloBusca("AÇO")`);
  h = roda("screenChkModeloForm()");
  T(conta(h, "data-chk-item=") === 2 && h.includes(`data-chk-item="${M.b2.id}"`), "busca 'AÇO' (maiuscula e acento) acha o mesmo");
  roda(`App.chkModeloBusca("1.2")`);
  h = roda("screenChkModeloForm()");
  T(conta(h, "data-chk-item=") === 1 && h.includes(`data-chk-item="${M.a2.id}"`), "busca pelo numero 1.2");
  roda(`App.chkModeloBusca("zzzzz")`);
  h = roda("screenChkModeloForm()");
  T(h.includes("Nada encontrado para essa busca") && !h.includes("data-chk-item="), "busca sem resultado avisa");
  roda(`App.chkModeloBusca("")`);

  // --- paineis Orientacao/Contexto: abrem sozinhos quando ha conteudo; o clique vale ate trocar de item
  roda(`App.chkSelecionarModeloItem(${J(M.A.id)}, ${J(M.a1.id)})`);
  roda(`App.chkSetItemInfoTexto(${J(M.A.id)}, ${J(M.a1.id)}, "Use torquimetro.")`);
  h = roda("screenChkModeloForm()");
  T(h.includes("Orientação para o inspetor") && h.includes("Use torquimetro.") && h.includes("App.chkSetItemInfoTexto(") && h.includes("App.chkInfoFotoAdicionar(") && conta(h, 'class="dot"') === 1 && !h.includes('Contexto da seção "Ancoragem"'), "Orientacao preenchida abre sozinha (com fotos e ponto no botao); Contexto vazio continua recolhido");
  roda("App.chkModeloPainel('info')");
  h = roda("screenChkModeloForm()");
  T(!h.includes("Orientação para o inspetor") && conta(h, 'class="dot"') === 1, "clicar em Orientacao aberta recolhe (o ponto continua porque tem conteudo)");
  roda("App.chkModeloPainel('contexto')");
  h = roda("screenChkModeloForm()");
  T(h.includes('Contexto da seção "Ancoragem"') && h.includes(`App.chkSetSecaoContexto('${M.A.id}',this.value)`) && !h.includes("Orientação para o inspetor"), "clicar em Contexto vazio abre o painel da secao");
  roda(`App.chkSelecionarModeloItem(${J(M.A.id)}, ${J(M.a2.id)})`);
  h = roda("screenChkModeloForm()");
  T(!h.includes('Contexto da seção "Ancoragem"'), "trocar de item volta os paineis ao automatico");
  roda(`App.chkSetSecaoContexto(${J(M.A.id)}, "Pontos fixos da linha.")`);
  h = roda("screenChkModeloForm()");
  T(h.includes('Contexto da seção "Ancoragem"') && h.includes("Pontos fixos da linha.") && conta(h, 'class="dot"') === 1, "Contexto preenchido abre sozinho");

  // --- nova secao e novo item entram abertos e selecionados
  roda("App.chkNovaSecao()");
  const nova = roda("getCurrentChkModelo().secoes[2]");
  h = roda("screenChkModeloForm()");
  T(roda("__chkModeloSecAbertas")[nova.id] === true && h.includes(`data-chk-sec="${nova.id}"`) && h.includes("Nenhum item ainda.") && h.includes(`App.chkNovoItem('${nova.id}')`) && !h.includes(`data-chk-item="${M.a1.id}"`), "nova secao nasce aberta (so ela), com '+ Item'");
  roda(`App.chkNovoItem(${J(nova.id)})`);
  const novoItem = roda("getCurrentChkModelo().secoes[2].itens[0]");
  h = roda("screenChkModeloForm()");
  T(roda("STATE.ui.chkModeloItemSel") === novoItem.id && h.includes("item-aberto") && h.includes("· Item 3.1") && h.includes(`data-chk-item="${novoItem.id}"`), "novo item ja vem selecionado no editor");

  // --- abrir outro modelo zera busca/secoes/paineis
  roda(`App.chkModeloBusca("abc"); App.chkAbrirModelo(${J(roda("STATE.ui.chkModeloId"))})`);
  T(roda("__chkModeloBusca") === "" && Object.keys(roda("__chkModeloSecAbertas")).length === 0 && roda("__chkModeloPainel.info") === null && roda("__chkModeloPainel.contexto") === null, "abrir o modelo reinicia o estado so de tela");

  // --- o editor nunca derruba a tela com dados antigos: item sem info/motivos/prioridade
  roda(`(function(){ const m = getCurrentChkModelo(); const i = m.secoes[0].itens[0]; delete i.info; delete i.motivosPadrao; delete i.prioridade; delete i.textoAtende; delete i.normativo; m.secoes[0].contexto = undefined; STATE.ui.chkModeloSecaoSel = m.secoes[0].id; STATE.ui.chkModeloItemSel = i.id; })()`);
  h = roda("screenChkModeloForm()");
  T(h.includes("chk-fl-atende") && conta(h, 'class="chk-fl-pilula') === 0 && h.includes("p-media"), "item antigo (sem info, motivos, prioridade) abre sem erro");

  // limpeza
  roda(`STATE.checklists.modelos = STATE.checklists.modelos.filter(x => x.id !== STATE.ui.chkModeloId); STATE.ui.chkModeloId = ${J(modeloAntes)}; STATE.ui.chkModeloSecaoSel = null; STATE.ui.chkModeloItemSel = null; chkModeloResetTela(); delete globalThis.__M;`);
  T(roda("STATE.checklists.modelos.length") === nAntes, "preparo/limpeza: o modelo de teste saiu");
}
async function testarAtalhoLaudo(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("atalho do laudo: " + msg); };
  const J = (v)=> JSON.stringify(v);
  const antes = roda("({ p: STATE.ui.chkProjetoId, s: STATE.ui.chkSetorId, l: STATE.ui.chkLinhaId, n: STATE.checklists.projetos.length })");
  roda(`(function(){
    const m = novoChkModelo(); m.nome = "M atalho"; const sc = novoChkSecao(); sc.titulo = "S"; const it = novoChkItem(); it.descricao = "Pergunta"; sc.itens = [it]; m.secoes = [sc];
    const proj = novoChkProjeto(); proj.empresa = "Empresa atalho"; const st = novoChkSetor(); st.nome = "Setor atalho";
    const a = novoChkLinha(m); a.nome = "LV-A"; a.status = "em_andamento"; const b = novoChkLinha(m); b.nome = "LV-B"; b.status = "finalizado";
    st.linhas = [a, b]; proj.setores = [st]; STATE.checklists.projetos.push(proj);
    STATE.ui.chkProjetoId = proj.id; STATE.ui.chkSetorId = st.id; STATE.ui.chkLinhaId = null;
  })()`);
  const setor = roda("getCurrentChkSetor()");
  T(setor && setor.linhas.length === 2, "preparo: o setor de teste precisa ter 2 linhas (" + (setor && setor.linhas.length) + ")");
  const l1 = setor.linhas[0], l2 = setor.linhas[1];
  const h = roda("screenChkLinhas()");
  T(h.includes("App.chkAbrirLaudoLinha('" + l1.id + "')") && h.includes("App.chkAbrirLaudoLinha('" + l2.id + "')"), "cada cartao de linha tem o botao Laudo ligado ao id certo");
  T(h.split("class=\"chk-linha-laudo\"").length - 1 === setor.linhas.length, "um botao Laudo por linha, em qualquer status (nao so nas finalizadas)");
  T(h.includes("event.stopPropagation();App.chkAbrirLaudoLinha("), "o clique no botao nao abre a linha por baixo");
  // abrir o laudo pelo atalho: escolhe a linha, lembra a origem e descarta montagem antiga
  roda("STATE.ui.chkLinhaId = null; __lclParaLinha = 'montado'; __lclPaginas = [1]; __lclHtml = 'x';");
  roda("App.chkAbrirLaudoLinha(" + J(l2.id) + ")");
  T(roda("STATE.ui.chkLinhaId") === l2.id && roda("__lclOrigem") === "checklist-linhas", "o atalho escolhe a linha tocada e marca a lista como origem");
  T(roda("__lclParaLinha") === null && roda("__lclPaginas.length") === 0 && roda("__lclHtml") === "", "o laudo abre limpo (monta de novo para a linha escolhida)");
  roda("App.chkAbrirLaudoLinha('nao-existe')");
  T(roda("STATE.ui.chkLinhaId") === l2.id, "id que nao existe nao troca a linha");
  // o caminho antigo (Revisar e finalizar) continua voltando para a finalizacao
  roda("App.lclAbrir()");
  T(roda("__lclOrigem") === "", "abrir pela tela de finalizar zera a origem (o voltar continua indo para a finalizacao)");
  // limpeza
  roda(`STATE.checklists.projetos = STATE.checklists.projetos.filter(p => p.id !== STATE.ui.chkProjetoId); STATE.ui.chkProjetoId = ${J(antes.p)}; STATE.ui.chkSetorId = ${J(antes.s)}; STATE.ui.chkLinhaId = ${J(antes.l)};`);
  T(roda("STATE.checklists.projetos.length") === antes.n, "preparo/limpeza: o projeto de teste saiu");
}
async function testarCapaLaudo(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("capa do laudo: " + msg); };
  const J = (v)=> JSON.stringify(v);
  const br = (v)=> roda("lclDataBR(" + J(v) + ")");
  T(br("2026-10-03") === "03/10/2026" && br("2027-01-09") === "09/01/2027" && br("") === "" && br(null) === "" && br("texto livre") === "texto livre", "lclDataBR: ISO vira DD/MM/AAAA, vazio fica vazio e texto que nao e data volta como veio");
  const d = "lclDados(__f3.proj, __f3.setor, __f3.l)";
  roda("__f3.proj.dataInspecao = '2026-10-03'");
  const capa = roda("lclBlocoCapa(" + d + ", '').html");
  T(capa.includes("<br>03/10/2026</div>") && !capa.includes("de outubro de 2026"), "a data da capa sai em DD/MM/AAAA (nao por extenso): " + capa.slice(-160));
  const capaFoto = roda("lclBlocoCapa(" + d + ", 'data:image/jpeg;base64,AAAA').html");
  T(capaFoto.includes("lcl-fotocapa") && capaFoto.includes("<br>03/10/2026</div>"), "capa com foto tambem usa DD/MM/AAAA");
  T(roda("LCL_CAPITULOS.find(c => c.id === 'corpo').rot") === "Avaliação por Componente" && roda("LCL_CAPITULOS.find(c => c.id === 'corpo').curto") === "Avaliação por Componente", "o capitulo 'corpo' agora se chama Avaliacao por Componente (o id interno nao muda)");
  const sum = roda("lclBlocosSumario(lclPlano(__f3.proj, __f3.l), {}).map(b => b.html).join('')");
  T(sum.includes("Avaliação por Componente") && !sum.includes("Corpo do laudo"), "o Sumario usa o novo nome do capitulo");
}
testarFotoAmpla().then(() => testarTravas()).then(() => testarDadosLaudo()).then(() => testarLaudoCapitulos()).then(() => testarMemorial()).then(() => testarCapitulosNovos()).then(() => testarEdicaoTexto()).then(() => testarFotosLeituraLaudo()).then(() => testarCadastroProjeto()).then(() => testarEditorModelo()).then(() => testarAtalhoLaudo()).then(() => testarCapaLaudo()).then(() => {
  // as arvores do Completo/Simplificado continuam byte a byte identicas apos a foto ampla tambem
  if(JSON.stringify(sandbox.STATE.projetos) !== antesCompleto || JSON.stringify(sandbox.STATE.projetosSimples) !== antesSimples){
    console.error("FALHOU: a foto ampla da linha mexeu em STATE.projetos/projetosSimples");
    process.exit(1);
  }
  console.log("ISOLAMENTO OK: STATE.projetos e STATE.projetosSimples byte a byte identicos apos criar/editar/salvar/vincular/finalizar/excluir na hierarquia Projeto>Setor>Linha do Checklist (motivo de multipla escolha, travas de confirmacao, abas de secao, o painel dividido do editor de modelo com info/foto por item, a importacao de modelo via XLSX -- linha de continuacao, item sem motivo e linha orfa incluidos -- o roundtrip exportar/reimportar modelo via XLSX incluindo secao vazia, o laudo narrativo -- narrativa com destaque e citacao de foto do item nao atende, item nao aplica fora da narrativa e da tabela do checklist -- e a foto ampla da linha -- do rascunho da Nova linha pra linha criada, trocar/remover com confirmacao e foto presa a linha do toque), as travas ao fechar item e ao marcar secao nao aplica, e o laudo em capitulos -- numeracao que acompanha os capitulos ligados, capa com/sem foto, pagina 2 com Normativo, sumario com pagina real em 2 passadas, paginador (gruda no proximo, alternativa, pagina inteira) e conclusao com ART e data em linhas separadas, e as seis migracoes de STATE antigo (namespace ausente, execucoes em lista plana, modelo padrao sem texto padrao, linha com motivo unico do formato antigo, item de modelo sem o campo info, e secao/linha sem contexto/descricao do laudo narrativo) preenchem/reorganizam/atualizam o namespace sem tocar nas duas arvores");
  process.exit(0);
}).catch((e) => { console.error("FALHOU (ensaios assincronos): " + (e && e.message || e)); process.exit(1); });
