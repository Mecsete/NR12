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
  "screenChkSetorForm", "chkFotosSecaoHtml", "chkFotosSecaoResumoHtml", "chkRenderItem", "screenChkPreencher", "screenChkFinalizar", "chkResumoHtml",
  "lclTextoEditado", "lclHtmlParaTexto", "lclTextoParaHtml", "lclConclusaoAuto", "lclFotosSecaoHtml", "lclNumItem",
  // Cadastro do projeto: mascaras, validade automatica e cadastro de inspetores.
  "chkSoDigitos", "chkMascaraDocumento", "chkMascaraTelefone", "chkExibirDocumento", "chkExibirTelefone", "chkValidarCpf", "chkValidarCnpj",
  "chkAvisoDocumento", "chkMaisMesesISO", "chkOpcoesInspetor", "novoChkInspetor", "chkInspetoresHtml", "screenChkProjetoForm",
  // Editor de modelo (Modelo 3, linhas de fluxo): lista com busca/secoes abertas e o item aberto.
  "chkBuscaNorm", "chkModeloSvg", "chkAutoAltura", "chkModeloAjustarAlturas", "chkModeloRedesenhar", "chkModeloPreviaPergunta",
  "chkModeloPainelAberto", "chkModeloSecAberta", "chkMostrarItemAberto", "screenChkLinhas", "lclDataBR",
  // Sincronizacao do Checklist entre aparelhos (nuvem falsa nos ensaios) e as camadas de foto que ela usa.
  "registrarCarimboVisto", "ehFotoRefPersist", "fotoCalcularId", "fotosColetarRefs", "fotosExtrairParaRefs", "__fotosTrocarNoLugar",
  "chkSyncHash", "chkSyncSig", "chkSyncModeloNorm", "chkSyncGarantir", "chkSyncSemCampo", "chkSyncVista", "chkSyncLocais", "chkSyncLocalDe", "chkSyncSementeIntocada",
  "chkSyncParseNomes", "chkSyncRegistrarRemocao", "chkSyncMesclarRemovidos", "chkSyncMesclarInspetores", "chkSyncLerRemoto", "chkSyncSingleton",
  "chkSyncApagarRemoto", "chkSyncEnviar", "chkSyncRotuloCopia", "chkSyncInserir", "chkSyncAplicar", "chkSyncBaixar", "chkSyncCopiarLocal", "chkSyncConflito",
  "chkResumoCardLinha", "chkRolarParaProximoItem", "chkProximaSecaoPendente", "chkRodapeSecaoHtml", "chkIncoerencias", "lclNumeroSecao", "getMecseteConfig", "chkAcoesCartao", "chkBotaoMenu", "chkBuscaChipsHtml", "chkSyncInfoHtml", "chkPrimeiraSecaoPendente", "lclSemResposta", "lclAvisos", "chkResumoLinhas", "chkPassaFiltroStatus", "chkContagensFiltro", "chkNaoConformesHtml", "chkUltimaLinhaEmAndamento", "chkContinuarHtml", "lclPrioridadeNc", "chkMigPlanoEmbutido", "chkMigModelosEmbutidos", "chkMoverLinha", "lclPrioChip", "lclPrioLegenda", "chkEuInspetorId", "chkNomeInspetor", "chkDonoDaLinhaOutro", "chkFotoPendId", "chkFotosRefsObrigatorias", "chkFotosParaPendentes", "chkFotosPendentesIds", "chkFotosPendentesTrocar", "chkSyncBaixarFotosPendentes", "chkFotosNuvemTotal", "screenChkSetores", "screenChkLinhas", "chkAcoesCartao", "chkVistosAtuais", "ehComputadorDeMesa", "chkModoVisual", "chkEhCampo", "chkPendentesTotal", "chkFaixaHtml", "chkAvisoDeProjeto", "chkProntoParaLaudo", "screenChkPronto", "chkBuscarTudo", "chkBuscaResultadosHtml", "screenChkBusca", "chkLinhaEmBranco", "chkLinhaCopiaCompleta", "chkSetorCopia", "chkDuplicarSetor", "chkDuplicarProjeto", "configAparenciaHtml", "bottomNavChk", "screenChkConfig", "topBarChk", "chkTabsRolagem", "chkLinhasPendentesEnvio", "chkDevePuxarAntesDeAbrir", "chkAltConteudo", "chkAltSig", "chkAltEntrada", "chkAltUnir", "chkAltAdicionar", "chkAltResumo", "chkAltTrocar", "chkAltExcluir", "chkNomeCopia", "chkAltCopiarVisivel", "chkEsconderCopiasLinhas", "chkAltModalHtml", "chkAltDaLinha", "chkAcharLinhaPorId", "chkCopiarLinha", "chkMigAutoPendente", "chkMigAutoAplicar", "chkMigPendenciasAplicar", "chkPendenciasLinhas", "chkMigN", "chkMigTabela", "chkMigPlano", "chkMigAcharModeloNovo", "chkMigrarLinha", "chkMigracaoSimular", "chkMigracaoAplicar", "chkSyncFotoValorId", "chkSyncFotoId", "chkSyncRespondidos", "chkSyncDivergencias", "chkSyncMesclarLinha", "chkConsolidarCopiasLinhas", "chkSyncVisto", "chkSyncMudou", "chkSyncRemoverLocal", "chkSyncEntidade", "chkSyncRodar", "chkModeloResetTela", "chkModeloArvoreHtml", "getChkModeloSelecao", "screenChkModeloForm",
];
let fonte = "let __ultimoCarimboVisto = 0;\n";
fonte += "let __buscaAtual = '';\n"; // usado por chkAbrirSetor (lista de linhas) -- nao testado aqui, so pra nao faltar
fonte += "const APP_BUILD = 'ensaio';\n";
fonte += "function getOneDriveConta(){ return null; }\n"; // sem conta do OneDrive nos ensaios (o selo 'nao enviada' so aparece com conta)
fonte += "let __imgReg = [];\n"; // registro de fotos pra exibicao (imgReg/data-imgref) -- usado por App.chkInfoItem
fonte += constString("CHK_MODELO_PADRAO_ID");
fonte += constString("FOTO_REF_PREFIXO");
fonte += 'const SUBPASTA_CHECKLIST = "Backup/Checklist";\nconst SUBPASTA_CHECKLIST_FOTOS = "Backup/Checklist/Fotos";\n'; // o valor real e SUBPASTA_BACKUP + ...: conferido em estrutura.py
fonte += "let __chkSyncSigPadrao = null;\n";
fonte += "const __fotoIdCache = new Map();\n";
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
fonte += constObjeto("CHK_PRIORIDADE_PESO") + "\n";
fonte += "const CHK_STATUS_ORDEM_BOTOES = ['na', 'naoAtende', 'atende'];\n";
fonte += "const CHK_FOTO_PEND = 'pendente:';\n";
fonte += 'const CHK_ALT_CAMPO = "versoesAlternativas";\n';
fonte += constObjeto("CHK_ALT_ORIGEM") + "\n";
fonte += constObjeto("LCL_PRI_ICONE") + "\n";
fonte += constObjeto("CHK_MIG_TIPOS") + "\n";
fonte += constObjeto("CHK_MIG_FOTOS_REMOVIDAS") + "\n";
fonte += constObjeto("CHK_MIG_NOMES") + "\n";
fonte += constObjeto("CHK_MIG_DADOS") + "\n";
fonte += constObjeto("CHK_SYNC_CAMPOS_TEXTO_LINHA") + "\n";
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
fonte += letEscalar("__chkDaRevisao");
fonte += letEscalar("__chkProjEditado");
fonte += letEscalar("__chkProjFiltro");
fonte += letEscalar("__chkSetFiltro");
fonte += letEscalar("__chkProjFormOrigem");
fonte += letEscalar("__chkModeloBusca");
fonte += letObjeto("__chkModeloSecAbertas") + "\n";
fonte += letObjeto("__chkModeloPainel") + "\n";
fonte += letObjeto("__chkPendCache") + "\n";
fonte += letObjeto("__chkBusca") + "\n";
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
  T(roda("chkCitarFotos([1], \"3.4\")") === "Foto 3.4.1" && roda("chkCitarFotos([1,2], \"3.4\")") === "Fotos 3.4.1 e 3.4.2" && roda("chkCitarFotos([1,2,3], \"3.4\")") === "Fotos 3.4.1, 3.4.2 e 3.4.3", "foto numerada pela secao: 3.4.1, 3.4.2...");
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
  const n1p = roda("chkNarrativaSecao(__lclN.s, __lclN.l, \"3.4\")");
  T(n1p.html === '<mark class="nc">Texto A. (Foto 3.4.1) Texto B. (Fotos 3.4.2 e 3.4.3) (Fotos 3.4.4 e 3.4.5) Nota do inspetor: Medido em campo.</mark>', "narrativa com o numero da secao nas fotos: " + n1p.html);
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
  T(n4.html === "Atende N. Nota do inspetor: Medido em campo. (Fotos 1 a 5)" && n4.conforme === n4.html && n4.pend === "" && n4.nOk === 5, "item que atende nao tem destaque, leva a nota e cita as fotos em faixa: " + n4.html);

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
  T(roda("lclTextos().normativo.intro") === roda("LCL_NORMATIVO_PADRAO.intro") && roda("lclTextos().normativo.normas.length") === roda("LCL_NORMATIVO_PADRAO.normas.length") && roda("LCL_NORMATIVO_PADRAO.normas.length") > 15, "sem texto salvo, o Normativo deveria ser o padrao");
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
  T(!blocos.some(b=>b.ancora === "cap-normativo"), "pagina 2 nao deve mais ter o Normativo (as normas ficam na Metodologia)");
  T(blocos.filter(b=>b.sumario).length === 1 && blocos.find(b=>b.sumario).html.includes("3.2  Ancoragem"), "sumario com os subitens do corpo");
  const ck = blocos.filter(b=>b.html.includes("lcl-cd")).map(b=>b.html).join("");
  T(ck.includes("NR-35 8.2") && ck.includes("ver 3.1") && ck.includes("Seção marcada como") && ck.includes("1 OK · 1 NÃO OK"), "checklist em cartoes: norma do item, 'ver 3.1' no que nao atende, secao NA e contagem por secao");
  const corpoBl = blocos.filter(b=>b.ancora && b.ancora.startsWith("cap-sec-"));
  T(corpoBl.length === 2 && corpoBl[0].ancoraExtra === "cap-corpo", "um bloco de corpo por secao que se aplica, o 1o carregando a ancora do capitulo");
  const corpo0 = blocos.slice(blocos.indexOf(corpoBl[0]), blocos.indexOf(corpoBl[1])).map(b=>b.html).join("");
  T(corpo0.includes("rF1") && /Foto \d+\.\d+\.1</.test(corpo0) && !corpo0.includes(">Foto 1<") && corpo0.includes("Texto M1.") && corpoBl[0].html.includes("Contexto A.") && corpo0.includes("lcl-pend"), "corpo: contexto no 1o bloco; texto das pendencias e foto numerada no bloco das pendencias");
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
  ["cap-metodologia", "cap-checklist", "cap-corpo", "cap-conclusao"].forEach(a=>{
    T(fluxo.mapa[a] > 1, "ancora " + a + " sem pagina");
  });
  T(!htmlSum.includes("Normativo") && htmlSum.includes("Checklist<i></i>" + fluxo.mapa["cap-checklist"]) && htmlSum.includes("Conclusão<i></i>" + fluxo.mapa["cap-conclusao"]), "sumario com o numero real de pagina de cada capitulo: " + htmlSum.replace(/<[^>]+>/g, " ").slice(0, 200));
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
  if(pend(comMotivos, vazio) !== '["motivo","foto"]') throw new Error("nao atende vazio deveria faltar motivo e foto (a nota so e cobrada quando o modelo nao tem motivos): " + pend(comMotivos, vazio));
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"] }) !== '["foto"]') throw new Error("nao atende com motivo, sem foto, deveria faltar so a foto (nota opcional com motivo): " + pend(comMotivos, { ...vazio, motivosSelecionados: ["M"] }));
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"], fotos: [{}] }) !== '[]') throw new Error("nao atende com motivo E foto nao deveria cobrar nada");
  if(pend(comMotivos, { ...vazio, fotos: [{}] }) !== '["motivo"]') throw new Error("nao atende com foto mas sem motivo deveria faltar so o motivo: " + pend(comMotivos, { ...vazio, fotos: [{}] }));
  if(pend(semMotivos, { ...vazio, fotos: [{}] }) !== '["nota"]') throw new Error("modelo sem motivos: foto sozinha ainda pede a nota (nao ha motivo para marcar): " + pend(semMotivos, { ...vazio, fotos: [{}] }));
  if(pend(semMotivos, { ...vazio, observacao: "n", fotos: [{}] }) !== '[]') throw new Error("modelo sem motivos: foto e nota completam o item");
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"], observacao: "n" }) !== '["foto"]') throw new Error("nao atende com motivo e nota deveria faltar so a foto");
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"], observacao: "n", fotos: [{}] }) !== '[]') throw new Error("nao atende completo nao deveria faltar nada");
  if(pend(semMotivos, vazio) !== '["nota","foto"]') throw new Error("modelo SEM motivos padrao nunca deveria cobrar motivo: " + pend(semMotivos, vazio));
  if(pend(comMotivos, { ...vazio, motivosSelecionados: ["M"], semFoto: true }) !== '[]') throw new Error("'Sem foto' confirmado, com motivo, nao deixa pendencia: " + pend(comMotivos, { ...vazio, motivosSelecionados: ["M"], semFoto: true }));
  if(pend(comMotivos, { ...vazio, semFoto: true }) !== '["motivo"]') throw new Error("'Sem foto' confirmado tira so a foto da lista: o motivo continua faltando");
  if(pend(semMotivos, { ...vazio, semFoto: true }) !== '["nota"]') throw new Error("'Sem foto' confirmado, modelo sem motivos: falta so a nota");
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
  if(aberto !== ie.itemId || !sandbox.__ultimoOverlayHtml || !sandbox.__ultimoOverlayHtml.includes("motivo e foto"))
    throw new Error("fechar Nao atende vazio deveria avisar 'motivo e foto' e nao fechar: " + sandbox.__ultimoOverlayHtml);
  if(!sandbox.__ultimoOverlayHtml.includes("Fechar mesmo assim")) throw new Error("trava de Nao atende incompleto deveria oferecer 'Fechar mesmo assim'");
  roda("App.chkConfirmarAcao()");
  if(roda("STATE.ui.chkItemAberto") !== null) throw new Error("'Fechar mesmo assim' deveria fechar o item");
  roda("App.chkSelecionarMotivo('" + ie.itemId + "', '" + itM.motivosPadrao[0].motivo + "')");
  ie.fotos.push({ foto: "data:image/jpeg;base64,NFOTO", tags: [] });
  tentarFechar();
  if(roda("STATE.ui.chkItemAberto") !== null || sandbox.__ultimoOverlayHtml)
    throw new Error("Nao atende com motivo e foto, mesmo SEM nota, deveria fechar direto (nota e opcional): " + sandbox.__ultimoOverlayHtml);
  // tirando a foto, volta a cobrar a foto (a nota e opcional quando ha motivo)
  ie.fotos.length = 0;
  tentarFechar();
  if(roda("STATE.ui.chkItemAberto") !== ie.itemId || !sandbox.__ultimoOverlayHtml.includes("Item sem foto") || sandbox.__ultimoOverlayHtml.includes("nota"))
    throw new Error("Nao atende com motivo, sem foto, deveria avisar so da foto: " + sandbox.__ultimoOverlayHtml);
  roda("App.chkConfirmarAcao()");
  // 'Sem foto' confirmado: pede confirmacao, depois o item fecha direto e nao deixa pendencia; desfazer volta a cobrar
  sandbox.__ultimoOverlayHtml = null;
  roda("App.chkSemFoto('" + ie.itemId + "')");
  if(!sandbox.__ultimoOverlayHtml || !sandbox.__ultimoOverlayHtml.includes("Item sem foto?") || ie.semFoto) throw new Error("'Sem foto' deveria pedir confirmacao antes de marcar");
  roda("App.chkConfirmarAcao()");
  if(ie.semFoto !== true) throw new Error("confirmando, o item deveria ficar marcado como sem foto");
  tentarFechar();
  if(roda("STATE.ui.chkItemAberto") !== null || sandbox.__ultimoOverlayHtml) throw new Error("item 'sem foto' confirmado deveria fechar direto, sem trava: " + sandbox.__ultimoOverlayHtml);
  roda("App.chkSemFoto('" + ie.itemId + "')");
  if(ie.semFoto !== false) throw new Error("tocar de novo em 'Sem foto' deveria desfazer");
  ie.fotos.push({ foto: "data:image/jpeg;base64,NFOTO", tags: [] });
  sandbox.__ultimoOverlayHtml = null;
  roda("App.chkSemFoto('" + ie.itemId + "')");
  if(sandbox.__ultimoOverlayHtml || ie.semFoto) throw new Error("item que ja tem foto nao pode ser marcado sem foto");
  ie.fotos.length = 0;
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
  T(vz.hanc === null && vz.hpos === null && vz.vao === null && vz.flechaCm === null && vz.diametro === null && vz.uso === "vida" && vz.usuarios === 1 && vz.params.Ecabo === 9500 && vz.params.kA === 0.416 && vz.epi === "tq" && vz.memoria === true && vz.params.peso === 100 && vz.params.Frup === 3755 && vz.params.FS === 2 && vz.params.b1 === 1 && vz.params.fren === 0.5, "linha antiga deveria ler tudo vazio com os padroes");
  const ov = roda(`chkMemorialDe({ memorial:{ hanc:"5,5", epi:"tab", memoria:false, params:{ peso:"90", Frup:"abc", FS:0 } } })`);
  T(ov.hanc === 5.5 && ov.epi === "tab" && ov.memoria === false && ov.params.peso === 90 && ov.params.Frup === 3755 && ov.params.FS === 2, "parametro invalido/zero deveria cair no padrao, valido deveria valer: " + JSON.stringify(ov));
  T(roda(`JSON.stringify(CHK_MEMORIAL_PARAMS)`) === roda(`JSON.stringify(chkMemorialDe({}).params)`), "ler nao pode alterar o padrao");

  // calculo do cabo (flexivel): bate com o memorial de referencia (vao 6,7 m, flecha 7% = 469 mm)
  const mF = roda(`chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8 } })`);
  const cF = roda(`chkMemorialCalc("horizontal_flexivel", ${JSON.stringify(mF)})`);
  T(perto(cF.fl, 7, 1e-9) && perto(cF.f1, 0.469, 1e-9), "flecha de 46,9 cm em 6,7 m deveria ser 7% e f1 = 469 mm: " + JSON.stringify([cF.fl, cF.f1]));
  T(perto(cF.f2, 0.5433, 5e-4) && perto(cF.f3, 0.6609, 5e-4), "f2/f3 do memorial de referencia (543,3 e 660,9 mm): " + JSON.stringify([cF.f2, cF.f3]));
  T(perto(cF.T1, 1549.958, 0.01) && perto(cF.dL, 41.5945, 0.005) && perto(cF.f3, 0.660903, 2e-6) && cF.conv === true && cF.voltas > 5 && cF.voltas < 200, "T1 1549,96 kgf, dL 41,59 mm, f3 660,9 mm (planilha do memorial, aba Dimensionamento) e iteracao que estabiliza: " + JSON.stringify([cF.T1, cF.dL, cF.f3, cF.voltas, cF.conv]));
  T(perto(cF.uso, 0.82554, 1e-4) && perto(cF.FSs, 2.42265, 1e-4) && perto(cF.fq, 0.208333, 1e-5) && perto(cF.fren3 * 1000, 117.58, 0.01) && perto(cF.ang, 157.6795, 1e-3), "utilizacao 79,5%, fator de servico 2,52, fator de queda 0,21, frenagem 117,58 mm e angulo 157,68 (planilha): " + JSON.stringify([cF.uso, cF.FSs, cF.fq, cF.fren3, cF.ang]));
  T(perto(cF.ZLQ1, 5.56, 0.005) && perto(cF.Hp1, 2.19, 0.005) && perto(cF.ZLQ2, 4.66, 0.005) && perto(cF.Hp2, 1.69, 0.005), "ZLQ1 5,56 / Hp1 2,19 / ZLQ2 4,66 / Hp2 1,69: " + JSON.stringify([cF.ZLQ1, cF.Hp1, cF.ZLQ2, cF.Hp2]));
  T(perto(cF.Fadm, 1877.5, 1e-9) && cF.uso < 1 && cF.tipo === "flex", "admissivel 1877,5 kgf e uso abaixo de 100%");
  T(roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, flechaCm:46.9, diametro:8 } }))`) === null, "sem vao nao calcula");
  T(roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, diametro:8 } }))`) === null, "cabo sem flecha nao calcula");
  T(roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9 } }))`) === null, "cabo sem diametro nao calcula (nao ha mais diametro padrao escondido)");

  // outros casos da planilha: aba oculta Original (2 usuarios, 12,7 mm, vao 20,5 m, flecha 3%: esforco iterado a mao 2961,5 kgf) e a "Inicial" (4 m, 9,5 mm)
  const cO = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:20.5, flechaCm:61.5, diametro:12.7, usuarios:2 } }))`);
  T(perto(cO.P, 700, 1e-9) && perto(cO.T1, 2961.57, 0.05) && perto(cO.dL, 95.4756, 0.01) && perto(cO.f3, 1.2199, 1e-3) && cO.conv && perto(cO.Fadm, 4803.5, 1e-9), "caso 2 usuarios/12,7 mm/20,5 m (planilha Original; ruptura IPS 9,607 tf do catalogo SIVA): P 700, T1 2961,6, dL 95,5 mm: " + JSON.stringify([cO.P, cO.T1, cO.dL, cO.f3]));
  const cI = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:10, hpos:4, vao:4, flechaCm:12, diametro:9.52 } }))`);
  T(perto(cI.L1, 4.0096, 1e-6) && perto(cI.f2, 0.138647, 1e-5) && cI.conv && cI.T1 > 2000 && cI.T1 < 2500, "caso 4 m / 3% (planilha Inicial): comprimento do cabo 4,0096 m e f2 138,6 mm: " + JSON.stringify([cI.L1, cI.f2, cI.T1]));
  // fator de queda quando a posicao de trabalho fica a menos de 1,5 m da ancoragem (outro ramo da formula da planilha)
  const cBaixo = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:4, vao:6.7, flechaCm:46.9, diametro:8 } }))`);
  T(perto(cBaixo.fq, (1.5 - 1 + 2.4) / 2.4, 1e-9), "fator de queda com ancoragem a 1 m acima: (1,5 - 1 + 2,4) / 2,4 = 1,21: " + cBaixo.fq);
  T(roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ vao:6.7, flechaCm:46.9, diametro:8 } })).fq`) === null, "sem as alturas nao ha fator de queda (nem erro)");
  // varios vaos (planilha: comprimento da linha / vao): a folga de todos os vaos se concentra no vao carregado
  const mV = (comp) => roda(`chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, comprimento:${comp}, flechaCm:46.9, diametro:8 } })`);
  const cV1 = roda(`chkMemorialCalc("horizontal_flexivel", ${JSON.stringify(mV(6.7))})`);
  T(perto(cV1.T1, cF.T1, 1e-9) && cV1.nv === 1 && perto(cV1.J, cV1.L1, 1e-12) && perto(cV1.f3, cF.f3, 1e-12), "comprimento igual ao vao (1 vao): nada muda");
  const cV2 = roda(`chkMemorialCalc("horizontal_flexivel", ${JSON.stringify(mV(13.4))})`);
  T(perto(cV2.nv, 2, 1e-9) && perto(cV2.L1, 13.57509333, 1e-6) && perto(cV2.J, 6.87509333, 1e-6) && perto(cV2.dL, 62.1058, 0.01) && perto(cV2.f3, 0.899268, 2e-5) && perto(cV2.T1, 1157.14, 0.05) && cV2.conv, "2 vaos de 6,7 m (modelo da planilha, conferido em Python): L1 13,575 m, J 6,875 m, dL 62,1 mm, f3 899,3 mm, T1 1157,1 kgf: " + JSON.stringify([cV2.L1, cV2.J, cV2.dL, cV2.f3, cV2.T1]));
  T(perto(cV2.ZLQ2, 4.899268, 1e-4) && perto(cV2.ZLQ1, 5.799268, 1e-4) && cV2.T1 < cF.T1 && cV2.f3 > cF.f3, "mais vaos: mais folga no vao carregado, flecha dinamica e ZLQ maiores, esforco menor");
  const cV3 = roda(`chkMemorialCalc("horizontal_flexivel", ${JSON.stringify(mV(20.1))})`);
  T(perto(cV3.nv, 3, 1e-9) && perto(cV3.f3, 1.082617, 3e-5) && perto(cV3.T1, 975.578, 0.05), "3 vaos: f3 1082,6 mm e T1 975,6 kgf");
  T(mV(6).comprimento === 6.7 && mV(6).comprimentoInformado === 6 && roda(`(function(){ const m = ${JSON.stringify(mV(6))}; return chkMemorialAlertas(chkMemorialCalc("horizontal_flexivel", m), m); })()`).some(x=> x.includes("menor que o vão")), "comprimento menor que o vao: usa o vao e avisa");
  T(roda(`chkMemorialDe({ memorial:{ vao:6.7, diametro:8, flechaCm:46.9 } }).comprimento`) === 6.7 && roda(`chkMemorialDe({ memorial:{ comprimento:10 } }).comprimento`) === null, "sem comprimento informado vale o vao; sem vao nao ha comprimento");
  const fV = roda(`(function(){ const m = ${JSON.stringify(mV(13.4))}; const c = chkMemorialCalc("horizontal_flexivel", m); return { f: chkMemorialFormulas(c, m), t: chkMemorialTabelas(c, m), p: chkMemorialPremissas(c, m) }; })()`);
  T(fV.f.includes("Comprimento do cabo em um vão") && fV.f.includes("Comprimento do cabo na linha toda") && fV.f.includes("Cabo disponível no vão carregado") && fV.t.includes("Comprimento da linha (C)") && fV.t.includes("Número de vãos") && fV.t.includes("Cabo no vão carregado (J)") && fV.p.some(x=> x.includes("2,0 vãos de 6,70 m") && x.includes("concentra no vão carregado")) && !/NaN|undefined/.test(fV.f + fV.t + fV.p.join("")), "passo a passo, tabelas e premissas de uma linha com 2 vaos");
  const f1V = roda(`(function(){ const m = ${JSON.stringify(mV(6.7))}; const c = chkMemorialCalc("horizontal_flexivel", m); return { f: chkMemorialFormulas(c, m), t: chkMemorialTabelas(c, m), p: chkMemorialPremissas(c, m) }; })()`);
  T(!f1V.f.includes("na linha toda") && !f1V.f.includes("vão carregado") && f1V.f.includes("Comprimento do cabo") && !f1V.t.includes("Número de vãos") && !f1V.p.some(x=> x.includes("vãos de")), "1 vao: a tela e o laudo continuam como antes");
  // linha de restricao: carga = peso de cada usuario (100 kgf por pessoa) e fator de seguranca padrao 3
  const mRe = roda(`chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:6.7, diametro:8, usuarios:2, uso:"restricao" } })`);
  const cRe = roda(`chkMemorialCalc("horizontal_flexivel", ${JSON.stringify(mRe)})`);
  T(mRe.uso === "restricao" && mRe.params.FS === 3 && perto(cRe.P, 200, 1e-9) && perto(cRe.Fadm, 1251.6667, 1e-3) && cRe.conv, "restricao: FS 3, P = 100 kgf x 2 pessoas, admissivel 1251,7: " + JSON.stringify([mRe.params.FS, cRe.P, cRe.Fadm]));
  T(roda(`chkMemorialDe({ memorial:{ uso:"qualquer" } }).uso`) === "vida" && roda(`chkMemorialDe({ memorial:{ uso:"restricao", params:{ FS:5 } } }).params.FS`) === 5, "uso invalido vira vida; FS informado vale mais que o padrao");
  // a carga de uma linha de vida: 600 kgf + peso dos usuarios alem do primeiro
  const pu = (n, peso) => roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:6.7, flechaCm:46.9, diametro:8, usuarios:${n}, params:{ peso:${peso} } } })).P`);
  T(pu(1, 100) === 600 && pu(1, 120) === 600 && pu(2, 100) === 700 && pu(3, 90) === 780, "carga da linha de vida: 600 + (n-1) x peso");
  // flecha muito pequena: o esforco explode, mas o calculo nao trava nem devolve NaN
  const cMini = roda(`chkMemorialCalc("horizontal_flexivel", chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:20, flechaCm:1, diametro:8 } }))`);
  T(cMini && Number.isFinite(cMini.T1) && Number.isFinite(cMini.f3) && cMini.voltas <= 2000, "flecha de 1 cm em 20 m: sem NaN e sem laco infinito: " + JSON.stringify(cMini && [cMini.T1, cMini.voltas, cMini.conv]));
  // diametro e tabela de cabos
  const rup = (d) => roda(`chkCaboRuptura(${JSON.stringify(d)})`);
  T(rup(8).Frup === 3755 && rup(8).grau === "IPS" && rup(8).est === false && rup(9.52).Frup === 5409 && rup(9.52).est === false && rup(12.7).Frup === 9607 && rup(52).Frup === 86460 && rup(6.4).Frup === 2402 && rup(22.2).Frup === 29354 && rup("8,0").Frup === 3755, "ruptura por diametro, tudo IPS do catalogo SIVA");
  T(roda(`CHK_CABOS.every(r => r[3] > 0 && r.length === 5)`) && roda(`CHK_CABOS.length`) === 15 && roda(`CHK_CABOS.filter(r => r[4]).length`) === 0 && roda(`CHK_CABOS.every((r, i) => i === 0 || r[3] > CHK_CABOS[i - 1][3])`), "tabela de 15 cabos do catalogo SIVA 6x19 AF, todos IPS, nenhum estimado, ruptura crescente com o diametro");
  T(rup(10).dTab === 9.53 && rup(10).exato === false && rup(2) === null && rup(null) === null && rup(0) === null, "diametro fora da tabela usa o menor vizinho (lado seguro); menor que a tabela ou vazio, nada");
  T(roda(`chkMemorialDe({ memorial:{ diametro:12.7 } }).params.Frup`) === 9607 && roda(`chkMemorialDe({ memorial:{ diametro:12.7, params:{ Frup:9000 } } }).params.Frup`) === 9000 && roda(`chkMemorialDe({ memorial:{ diametro:12.7 } }).frupNota`).includes("catálogo SIVA") && roda(`chkMemorialDe({ memorial:{ diametro:8 } }).frupNota`).includes("IPS") && roda(`chkMemorialDe({ memorial:{ diametro:12.7, params:{ Frup:9000 } } }).frupNota`).includes("informado"), "a ruptura vem do diametro; valor informado na linha vale mais");
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
  const dEsp = 0; // a flecha da viga metalica nao entra mais no calculo
  T(cR.tipo === "rig" && cR.d === 0 && cR.f3 === 0 && cR.f1 === 0, "viga: sem flecha no calculo: " + JSON.stringify(cR));
  T(!("sig" in cR) && !("M" in cR) && !("uso" in cR) && roda(`chkMemorialVeredito(${JSON.stringify(cR)}, ${JSON.stringify(mR)})`).okC === true, "viga rigida: sem momento, tensao nem utilizacao (a resistencia nao e verificada)");
  T(perto(cR.ZLQ1, dEsp + 1.4 + 1 + 1.5 + 1, 1e-9) && perto(cR.ZLQ2, dEsp + 1.5 + 1.5 + 1, 1e-9) && perto(cR.Hp2, dEsp + 1.5 - 1 + 1, 1e-9), "ZLQ/Hp da viga");

  // veredito e parecer
  const vd = (hanc, hpos, extra) => roda(`(function(){ const m = chkMemorialDe({ memorial:{ hanc:${hanc}, hpos:${hpos}, vao:6.7, flechaCm:46.9, diametro:8${extra || ""} } }); const c = chkMemorialCalc("horizontal_flexivel", m); return { v: chkMemorialVeredito(c, m), p: chkMemorialParecer(c, m) }; })()`);
  let r = vd(5, 3);
  T(r.v.okTq === true && r.v.okTab === false && r.v.okC === true && r.v.okHp === true && r.p.includes("somente trava-quedas") && r.p.includes("O talabarte <b>não atende</b>") && r.p.includes("não substitui o parecer da Conclusão"), "ancoragem 5 m: so trava-quedas: " + r.p);
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
  T(txt.pr[0].includes("Cabo de aço de 8 mm") && txt.pr[0].includes("catálogo SIVA") && txt.pr[1].includes("600 kgf") && txt.pr[2].includes("9500") && txt.pr[2].includes("voltas") && txt.co.some(x=> x.includes("Fator de queda do sistema: <b>0,2</b>")) && txt.co.some(x=> x.includes("Cabo de aço de 8 mm") && x.includes("atende")) && txt.le.length === 11 && txt.le[9].includes("5,00 m") && txt.le[10].includes("3,00 m") && txt.le[6].includes("4,66 m"), "premissa com o diametro; legenda com 11 itens e os valores 7, 10 e 11");
  const txtR = roda(`(function(){ const m = chkMemorialDe({ memorial:{ hanc:5, hpos:3, vao:3 } }); const c = chkMemorialCalc("horizontal_rigida", m); return { f: chkMemorialFormulas(c, m), pr: chkMemorialPremissas(c, m), le: chkMemorialLegenda(c, m) }; })()`);
  T(!txtR.f.includes("δ") && !txtR.f.includes("<mn>2611</mn>") && !txtR.f.includes("Deflexão") && txtR.f.includes("Zona livre de queda — trava-quedas") && txtR.f.includes("Zona livre de queda — talabarte") && txtR.pr[0].includes("Linha rígida (viga de aço)") && txtR.pr[0].includes("não é considerada") && !txtR.pr.join("").includes("Ix") && !txtR.pr.join("").includes("carga dinâmica") && txtR.le[1] === "Trilho rígido: viga" && !txtR.le[1].includes("W200") && !/NaN|undefined/.test(txtR.f), "viga: sem formula de deflexao, sem E/Ix/carga dinamica; premissa avisa que a flecha nao e considerada; legenda sem medida");

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
  roda("App.chkMemorialSet('comprimento', '13,4')");
  T(lm.memorial.comprimento === 13.4 && roda("chkMemorialCalc('horizontal_flexivel', chkMemorialDe(getCurrentChkLinha()))").nv > 1.99, "digitar o comprimento da linha grava na linha e o calculo passa a usar 2 vaos");
  roda("App.chkMemorialSet('comprimento', '')");
  T(lm.memorial.comprimento === null, "apagar o comprimento volta a 1 vao");
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
  T(htmlOn.includes("chkMemorialSet('flechaCm'") && htmlOn.includes("chkMemorialSet('comprimento'") && htmlOn.includes("chkMemorialSet('diametro'") && htmlOn.includes("chkMemorialSetUso(") && htmlOn.includes("5/16”") && htmlOn.includes("chkMemorialSetParam('Frup'") && htmlOn.includes("chkMemorialSetParam('Ecabo'") && htmlOn.includes('placeholder="3755"') && htmlOn.includes("Cálculo passo a passo") && htmlOn.includes('id="chkMemPasso"') && htmlOn.includes("Alongamento do cabo") && htmlOn.includes("Esta linha não terá memorial") && htmlOn.includes("Trava-quedas: pode"), "aba do cabo: campos, parametros com o padrao dentro e resultado preliminar");
  lm.tipoLinha = "horizontal_rigida";
  const htmlRig = roda("chkMemorialCampoHtml(getCurrentChkLinha())");
  T(!htmlRig.includes("chkMemorialSet('flechaCm'") && !htmlRig.includes("chkMemorialSet('comprimento'") && !htmlRig.includes("chkMemorialSet('diametro'") && !htmlRig.includes("chkMemorialSetUso(") && !htmlRig.includes("chkMemorialSetParam('Ecabo'") && htmlRig.includes("chkMemorialSet('hanc'"), "viga nao pede flecha, diametro, tipo de linha nem os dados do cabo");
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
  T(conc[1].grudaNoProximo === true && conc[1].html.includes("Quadro de não conformidades") && cq.includes("1.1 · Cabo de Aço") && cq.includes("rP2") && cq.includes("Sem registro fotográfico") && !cq.includes(">sem foto<") && cq.includes("Substituir o cabo.<br>Regularizar: Fios rompidos") && cq.indexOf("1.1 · ") < cq.indexOf("2.1 · ") && cq.indexOf("2.1 · ") < cq.indexOf("1.2 · "), "quadro: imagem do item, prioridade, acao e ordem: " + cq.slice(0, 300));
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
  T(iFx === 3 && nFx >= 10 && memB.length === 3 + nFx + 1 && memB[0].ancora === "cap-memorial" && memB[0].html.includes("4  Memorial de Cálculo — Zona Livre de Queda") && memB[0].html.includes("<svg") && memB[0].html.includes("lcl-mcard") && memB[0].html.includes("ZLQ ATENDE") && memB[0].html.includes("ZLQ NÃO ATENDE") && !memB[0].html.includes("PODE USAR") && memB[0].html.includes("Cabo de aço 8 mm") && memB[0].html.includes("ATENDE"), "memorial: blocos (uma formula por bloco), ancora, cartoes dos 2 EPI e do cabo e ilustracao: " + memB.length);
  T(memB[1].html.includes("Legenda") && memB[1].html.includes("Condições de uso") && memB[2].html.includes("Premissas") && memB[2].html.includes("Conclusão do dimensionamento.") && !memB[2].html.includes("Parecer.") && memB[3].ancora === "cap-memoria" && memB[3].quebrarAntes === true && memB[3].html.includes("4.1  Memória de cálculo") && memB[3].html.includes("<math>") && memB[memB.length - 1].html.includes("lcl-tz") && memB.slice(3, -1).every(x=> x.html.includes("lcl-fm")), "memorial: legenda, condicoes, premissas, parecer, e a memoria de calculo em pagina nova (uma formula por bloco)");
  roda("__f3.l.memorial.memoria = false");
  T(roda(`lclMontarBlocos(${d}, lclTextos(), lclPlano(__f3.proj, __f3.l), new Map(), null).filter(x=> x.ancora === "cap-memoria").length`) === 0 && roda("lclPlano(__f3.proj, __f3.l).find(c=>c.id === 'memorial').subs.length") === 0, "sem a pagina da memoria de calculo: sem bloco e sem subitem");
  roda("__f3.l.memorial.memoria = true");
  roda("__f3.l.tipoLinha = 'horizontal_rigida'; delete __f3.l.memorial.flechaCm");
  T(roda("lclPlano(__f3.proj, __f3.l).some(c=>c.id === 'memorial')") === true && roda(`lclBlocosMemorial(${d}, { num:4, rot:"Memorial", ancora:"cap-memorial" })[0].html`).includes("rígida (viga)") && !roda(`lclBlocosMemorial(${d}, { num:4, rot:"Memorial", ancora:"cap-memorial" })[0].html`).includes("W200"), "viga rigida nao precisa de flecha; a dimensao da viga nao aparece no laudo");
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
  T(hrefs.length >= 12 && hrefs.every(h=> ids.includes(h)), "link sem destino no documento: " + hrefs.filter(h=> !ids.includes(h)).join(","));
  T(!fluxo.sum.includes('cap-normativo') && fluxo.sum.includes('href="#lcl-a-cap-memoria"') && fluxo.sum.includes('href="#lcl-a-cap-anexos"') && fluxo.sum.includes('onclick="return App.lclIrPara(event)"'), "linhas do sumario sao links: " + fluxo.sum.slice(0, 200));
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
  const secBlocos = (arr, k)=>{ const idx = []; for(let q = 0; q < arr.length; q++) if(arr[q].ancora) idx.push(q); return arr.slice(idx[k], idx[k + 1] === undefined ? arr.length : idx[k + 1]); };
  const juntar = (bs)=> bs.map(b=> b.html).join("");
  const corpoAuto = roda(`lclBlocosCorpo(${d}, ${capCorpo}, ${fotosReduzidas})`);
  const narrAuto = roda("chkNarrativaSecao(__f3.l.modeloSnapshot[0], __f3.l, " + capCorpo + ".subs[0].num)");
  const sec0 = secBlocos(corpoAuto, 0);
  T(corpoAuto[0].editar.tipo === "secao" && corpoAuto[0].editar.id === secId && corpoAuto[0].editar.editado === false && (!narrAuto.conforme || juntar(sec0).includes(narrAuto.conforme)) && (!narrAuto.pend || juntar(sec0).includes(narrAuto.pend)), "sem edicao: o corpo usa a narrativa automatica (conformes no 1o bloco, pendencias no bloco proprio) e o botao diz 'Editar texto'");
  roda("__f3.l.laudo = " + J({ textos: { [secId]: "Texto do engenheiro com **destaque**.\n\nSegundo paragrafo." } }));
  const corpoEd = roda(`lclBlocosCorpo(${d}, ${capCorpo}, ${fotosReduzidas})`);
  const ed0 = juntar(secBlocos(corpoEd, 0));
  T(ed0.includes('<p>Texto do engenheiro com <mark class="nc">destaque</mark>.</p><p>Segundo paragrafo.</p>') && !ed0.includes(auto) && corpoEd[0].editar.editado === true, "com edicao: o texto do engenheiro substitui a narrativa");
  T(ed0.includes("lcl-fotos-col") && /Foto \d+\.\d+\.\d+</.test(ed0), "as fotos da secao continuam ao lado do texto editado");
  const sec1 = secBlocos(corpoEd, 1);
  T(sec1[0].editar.editado === false && sec1[0].editar.id === secId2 && !juntar(sec1).includes("Texto do engenheiro"), "a edicao de uma secao nao vaza para a outra");
  const comAlt = secBlocos(corpoEd, 0).filter(b=> typeof b.alternativa === "function");
  T(comAlt.length === 1 && comAlt[0].alternativa().length >= 1 && comAlt[0].alternativa()[0].html.includes("lcl-larga"), "o layout alternativo (muitas fotos) existe no bloco do texto das pendencias e deixa o texto em largura cheia");
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
  T(!p2.some(b=> b.ancora === "cap-normativo"), "pagina 2 sem Normativo");
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
  const f1 = h.indexOf("Foto 3.1.1"), f2 = h.indexOf("Foto 3.1.2");
  T(f1 > -1 && f1 < f2 && h.indexOf('chk-mfoto-t">Corrosao') < f1 && f1 < h.indexOf('chk-mfoto-t">Fios rompidos'), "o numero e o da foto no laudo, com o numero da secao (3.1.1 do 1o motivo, 3.1.2 do 2o)");
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
  T(corpo[0].fotosEd && corpo[0].fotosEd.id === sec1 && corpo[0].fotosEd.n === 2, "secao com foto oferece 'Fotos (2)' no bloco que leva a ancora e o botao de editar");
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
  T(h.includes("p-critica") && h.includes('<option value="critica" selected>Crítica</option>') && conta(h, "<option value=\"critica\"") >= 1 && h.includes("<option value=\"boa\"") && h.includes("'prioridade',this.value)"), "prioridade do item (critica marcada) com todas as opcoes");
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
async function testarUsabilidade(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("usabilidade: " + msg); };
  const J = (v)=> JSON.stringify(v);
  const mk = (conf, extra)=> J(Object.assign({ id:"LU", nome:"LV usab", status:"em_andamento", secoesNA:[], laudo:{},
    modeloSnapshot:[ { id:"s1", titulo:"Ancoragem", itens:[ { id:"i1", descricao:"Item 1", prioridade:"media", motivosPadrao:[] }, { id:"i2", descricao:"Item 2", prioridade:"media", motivosPadrao:[] } ] },
                     { id:"s2", titulo:"Cabo", itens:[ { id:"i3", descricao:"Item 3", prioridade:"media", motivosPadrao:[] } ] } ],
    itens:[ "i1", "i2", "i3" ].map((id, k)=>({ itemId:id, conforme:conf[k], motivosSelecionados:[], observacao:"", fotos:[] })) }, extra || {}));
  const L = (conf, extra)=> "(" + mk(conf, extra) + ")";
  // parecer: item sem resposta -> NAO CONCLUSIVO; tudo respondido -> APTA; nao conformidade critica continua INAPTA
  T(roda("lclParecerAuto(" + L(["atende", null, null]) + ")") === "inconclusivo", "item sem resposta deveria dar parecer inconclusivo");
  T(roda("lclParecerAuto(" + L(["atende", "atende", "atende"]) + ")") === "apta", "tudo respondido e conforme deveria ser apta");
  T(roda("lclParecerAuto(" + L([null, null, null]) + ")") === "", "nada avaliado continua sem parecer");
  T(roda("lclParecerAuto(" + L(["atende", "naoAtende", null]) + ")") === "inconclusivo", "nao conformidade nao critica + item sem resposta tambem e inconclusivo");
  T(roda("lclParecerAuto(" + L(["atende", "naoAtende", "atende"]) + ")") === "ressalvas", "nao conformidade nao critica, tudo respondido: com ressalvas");
  const critica = { modeloSnapshot:[ { id:"s1", titulo:"Ancoragem", itens:[ { id:"i1", descricao:"Item 1", prioridade:"media", motivosPadrao:[] }, { id:"i2", descricao:"Item 2", prioridade:"critica", motivosPadrao:[] } ] }, { id:"s2", titulo:"Cabo", itens:[ { id:"i3", descricao:"Item 3", prioridade:"media", motivosPadrao:[] } ] } ] };
  T(roda("lclParecerAuto(" + L(["atende", "naoAtende", null], critica) + ")") === "inapta", "critica que nao atende vence: inapta mesmo com item sem resposta");
  T(roda("LCL_PARECERES.inconclusivo.rot") === "NÃO CONCLUSIVO", "rotulo do parecer inconclusivo");
  // sem resposta por secao; secao que nao se aplica nao conta
  const sr = roda("lclSemResposta(" + L(["atende", null, null]) + ")");
  T(sr.length === 2 && sr[0].secao === "Ancoragem" && sr[0].n === 1 && sr[1].secao === "Cabo" && sr[1].n === 1, "itens sem resposta por secao: " + J(sr));
  const srNA = roda("lclSemResposta(" + L(["atende", null, null], { secoesNA:["s2"] }) + ")");
  T(srNA.length === 1 && srNA[0].secao === "Ancoragem", "secao que nao se aplica nao entra nos itens sem resposta: " + J(srNA));
  T(roda("lclParecerAuto(" + L(["atende", "atende", null], { secoesNA:["s2"] }) + ")") === "apta", "pendencia so em secao que nao se aplica: apta");
  // a conclusao automatica diz o que ficou sem resposta
  const concl = roda("lclConclusaoAuto(" + L(["atende", null, null]) + ")");
  T(concl.includes("sem resposta") && concl.includes("Ancoragem: 1") && concl.includes("Cabo: 1") && concl.includes("Não foi possível concluir"), "conclusao automatica lista o que falta: " + concl);
  T(!roda("lclConclusaoAuto(" + L(["atende", "atende", "atende"]) + ")").includes("sem resposta"), "sem pendencia, a conclusao nao fala de itens sem resposta");
  // primeira secao pendente (para 'Continuar' e 'Preencher')
  T(roda("chkPrimeiraSecaoPendente(" + L(["atende", null, null]) + ")") === 0 && roda("chkPrimeiraSecaoPendente(" + L(["atende", "atende", null]) + ")") === 1 && roda("chkPrimeiraSecaoPendente(" + L(["atende", "atende", "atende"]) + ")") === 0 && roda("chkPrimeiraSecaoPendente(" + L([null, null, null], { secoesNA:["s1"] }) + ")") === 1, "primeira secao com item sem resposta (pula as que nao se aplicam)");
  // avisos antes de imprimir
  const estadoAntes = roda("({ p: STATE.ui.chkProjetoId, lista: STATE.checklists.projetos })");
  roda("STATE.checklists.projetos = [{ id:'PU', empresa:'E', setores:[] }]; STATE.ui.chkProjetoId = 'PU';");
  const avTxt = (conf, extra)=> roda("lclAvisos(" + L(conf, extra) + ")").map(a=> a.txt).join(" | ");
  const t1 = avTxt(["atende", null, null]);
  T(t1.includes("2 itens sem resposta") && t1.includes("Ancoragem: 1; Cabo: 1") && t1.includes("Sem foto ampla") && t1.includes("Dados do projeto em branco no laudo: nº do documento, ART, data da inspeção, validade da inspeção, responsável do solicitante, CPF/CNPJ, e-mail, cidade, cargo, telefone, endereço."), "avisos: sem resposta, sem foto, sem data, sem ART: " + t1);
  const tCamp = avTxt(["atende", "atende", "atende"], { fotoAmpla:"idbfoto:x" });
  roda("Object.assign(STATE.checklists.projetos[0], { dataInspecao:'2026-10-03', art:'123' })");
  const tParc = avTxt(["atende", "atende", "atende"], { fotoAmpla:"idbfoto:x" });
  T(tCamp.includes("nº do documento") && tParc.includes("Dados do projeto em branco no laudo: nº do documento, validade da inspeção, responsável do solicitante") && !tParc.includes("ART,") && !tParc.includes("data da inspeção"), "avisos: so lista os campos que faltam (ART e data preenchidas saem da lista): " + tParc);
  roda("Object.assign(STATE.checklists.projetos[0], { numeroDocumento:'D1', validadeInspecao:'2027-10-03', responsavel:'R', solicitanteCpfCnpj:'1', solicitanteEmail:'a@b', solicitanteCidade:'C', solicitanteCargo:'G', solicitanteTelefone:'9', solicitanteEndereco:'E' })");
  roda("STATE.ui.mecseteConfig = { empresa:'', respNome:'' }");
  const tMc = avTxt(["atende", "atende", "atende"], { fotoAmpla:"idbfoto:x" });
  T(tMc.includes("Dados da empresa e do responsável técnico em branco no laudo: empresa, nome do responsável técnico") && !tMc.includes("Dados do projeto"), "avisos: dados da empresa/responsavel tecnico em branco: " + tMc);
  roda("delete STATE.ui.mecseteConfig");
  const t2 = avTxt(["atende", "atende", "atende"], { fotoAmpla:"idbfoto:x" });
  T(t2 === "", "linha completa: nenhum aviso (veio: " + t2 + ")");
  const t3 = avTxt(["atende", null, "atende"], { fotoAmpla:"idbfoto:x", laudo:{ parecer:"apta" } });
  T(t3.includes("1 item sem resposta") && t3.includes("escolhido à mão (APTA)") && t3.includes("automático (NÃO CONCLUSIVO)"), "avisos: parecer manual diferente do automatico: " + t3);
  roda("STATE.ui.chkProjetoId = " + J(estadoAntes.p) + "; STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  // filtros de status das listas
  const res = (n, fin)=> J({ n, fin, aberta: n - fin });
  T(roda("chkResumoLinhas([{status:'finalizado'},{status:'em_andamento'},{}]).aberta") === 2, "resumo de linhas: abertas = total - finalizadas");
  T(roda("chkPassaFiltroStatus(" + res(2, 1) + ", 'andamento')") === true && roda("chkPassaFiltroStatus(" + res(2, 2) + ", 'andamento')") === false && roda("chkPassaFiltroStatus(" + res(2, 2) + ", 'concluidos')") === true && roda("chkPassaFiltroStatus(" + res(0, 0) + ", 'concluidos')") === false && roda("chkPassaFiltroStatus(" + res(0, 0) + ", 'todos')") === true, "filtro de status: em aberto, concluido (precisa ter linha) e todos");
  const cf = roda("chkContagensFiltro([" + res(2, 1) + "," + res(2, 2) + "," + res(0, 0) + "])");
  T(cf[0].n === 3 && cf[1].n === 1 && cf[2].n === 1, "contagem dos filtros: " + J(cf));
  // revisao: nao conformidades com motivo, foto e atalho para corrigir
  T(roda("chkNaoConformesHtml(" + L(["atende", "atende", "atende"]) + ")") === "", "sem nao conformidade, o bloco some");
  const nc = roda("chkNaoConformesHtml(" + L(["atende", "naoAtende", "atende"]) + ")");
  T(nc.includes("Não conformidades (1)") && nc.includes("1.2") && nc.includes("Item 2") && nc.includes("Sem motivo informado") && nc.includes("Sem foto") && nc.includes("App.chkIrDaRevisao(0,'i2')"), "bloco de nao conformidades: " + nc.slice(0, 300));
  T(roda("chkNaoConformesHtml(" + L(["atende", "atende", "naoAtende"], { secoesNA:["s2"] }) + ")") === "", "nao conformidade em secao que nao se aplica nao entra");
  const ncSF = roda("chkNaoConformesHtml(" + L(["atende", "naoAtende", "atende"], { itens:[{ itemId:"i1", conforme:"atende", motivosSelecionados:[], observacao:"", fotos:[] }, { itemId:"i2", conforme:"naoAtende", motivosSelecionados:[], observacao:"", fotos:[], semFoto:true }, { itemId:"i3", conforme:"atende", motivosSelecionados:[], observacao:"", fotos:[] }] }) + ")");
  T(ncSF.includes("Sem foto (confirmado)") && !ncSF.includes('color:#C23F12">Sem foto<'), "revisao: item com 'Sem foto' confirmado mostra a marca discreta, nao o vermelho de pendencia");
  // cartoes: menu com nome das acoes, em vez da lixeira solta
  const bm = roda("chkBotaoMenu('projeto', 'P1')");
  T(bm.includes("App.chkMenuCartao('projeto','P1')") && bm.includes('aria-label="Mais opções"') && !bm.includes("chkExcluir"), "botao de menu do cartao");
  // icones discretos ao lado do menu: editar e laudos nos cartoes grandes; a exclusao so no menu
  const aP = roda("chkAcoesCartao('projeto', 'P1')"), aS = roda("chkAcoesCartao('setor', 'S1')"), aM = roda("chkAcoesCartao('modelo', 'M1')"), aL = roda("chkAcoesCartao('linha', 'L1')");
  T(aP.includes("App.chkEditarProjeto('P1')") && aP.includes("App.chkLaudosProjeto('P1')") && aP.includes("App.chkMenuCartao('projeto','P1')") && aP.includes('aria-label="Laudos do projeto em um PDF"') && !aP.includes("chkExcluir"), "projeto: editar, laudos e menu; sem excluir solto");
  T(aS.includes("App.chkEditarSetor('S1')") && aS.includes("App.chkLaudosSetor('S1')") && !aS.includes("chkMenuCartao") && !aS.includes("chkExcluir"), "setor: so editar e laudos, sem o menu de tres pontos");
  T(roda("screenChkSetorForm.toString()").includes("App.chkExcluirSetor('${s.id}')"), "a exclusao do setor fica na tela de edicao do setor");
  T(aM.includes("App.chkAbrirModelo('M1')") && aM.includes("chkMenuCartao('modelo','M1')") && !aM.includes("chkExcluir") && !aL.includes("chkEditar") && aL.includes("chkMenuCartao('linha','L1')") && aL.includes("App.chkAbrirLinha('L1')") && !aL.includes("chkExcluir"), "modelo: editar e menu; linha: abrir o checklist e menu (o botao Laudo ja fica no cartao)");
  // continuar de onde parou: a linha em andamento mais recente
  roda("STATE.checklists.projetos = [{ id:'P1', empresa:'Emp', setores:[{ id:'S1', nome:'Setor', linhas:[ Object.assign(" + L(["atende", null, null]) + ", { id:'LA', atualizadoEm:5 }), Object.assign(" + L(["atende", "atende", null]) + ", { id:'LB', atualizadoEm:9 }), Object.assign(" + L(["atende", "atende", "atende"]) + ", { id:'LC', status:'finalizado', atualizadoEm:99 }) ] }] }];");
  const u = roda("chkUltimaLinhaEmAndamento()");
  T(u && u.l.id === "LB" && u.s.id === "S1" && u.p.id === "P1", "continuar: a linha em andamento mais recente (nao a finalizada): " + (u && u.l.id));
  const ch = roda("chkContinuarHtml()");
  T(ch.includes("Continuar de onde parou") && ch.includes("App.chkContinuar('P1','S1','LB')") && ch.includes("67% preenchido"), "cartao Continuar: " + ch.slice(0, 200));
  roda("STATE.checklists.projetos = [{ id:'P1', empresa:'Emp', setores:[{ id:'S1', nome:'Setor', linhas:[ Object.assign(" + L(["atende", "atende", "atende"]) + ", { id:'LC', status:'finalizado' }) ] }] }];");
  T(roda("chkContinuarHtml()") === "", "sem linha em andamento, nao ha cartao Continuar");
  roda("STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  // ---- resposta com um toque, marcar restantes, proxima secao pendente, laudo em lote ----
  T(roda("chkProximaSecaoPendente(" + L(["atende", "atende", null]) + ", 0)") === 1 && roda("chkProximaSecaoPendente(" + L(["atende", "atende", "atende"]) + ", 0)") === -1 && roda("chkProximaSecaoPendente(" + L([null, null, null]) + ", 1)") === 0 && roda("chkProximaSecaoPendente(" + L([null, "atende", "atende"]) + ", 0)") === -1 && roda("chkProximaSecaoPendente(" + L(["atende", "atende", null], { secoesNA:["s2"] }) + ", 0)") === -1, "proxima secao com pendencia (da a volta, pula as que nao se aplicam)");
  const rp1 = roda("chkRodapeSecaoHtml(" + L(["atende", "atende", null]) + ", 0, 2)");
  T(rp1.includes("Próxima seção com pendência: Cabo") && !rp1.includes("Revisar e finalizar"), "rodape no meio da lista, com pendencia adiante: so o atalho da proxima secao: " + rp1.slice(0, 200));
  const rp2 = roda("chkRodapeSecaoHtml(" + L(["atende", "atende", "atende"]) + ", 0, 2)");
  T(rp2.includes("Revisar e finalizar") && rp2.includes("btn-primary") && !rp2.includes("Próxima seção"), "tudo respondido: Revisar e finalizar em destaque, em qualquer aba");
  const rp3 = roda("chkRodapeSecaoHtml(" + L(["atende", null, "atende"]) + ", 1, 2)");
  T(rp3.includes("Próxima seção com pendência: Ancoragem") && rp3.includes("Revisar e finalizar"), "ultima aba com pendencia atras: os dois botoes");
  roda("STATE.checklists.projetos = [{ id:'P9', empresa:'E9', setores:[{ id:'S9', nome:'S9', linhas:[ Object.assign(" + L([null, null, null]) + ", { id:'L9' }) ] }] }]; STATE.ui.chkProjetoId = 'P9'; STATE.ui.chkSetorId = 'S9'; STATE.ui.chkLinhaId = 'L9'; STATE.ui.chkItemAberto = null;");
  const conf = (id)=> roda("chkItemExec(getCurrentChkLinha(), '" + id + "').conforme");
  roda("App.chkRespostaRapida('i1', 'atende')");
  T(conf("i1") === "atende" && roda("STATE.ui.chkItemAberto") === null, "toque em Atende grava e nao abre o item");
  roda("App.chkRespostaRapida('i1', 'atende')");
  T(conf("i1") === null, "tocar de novo na mesma resposta desfaz");
  roda("App.chkRespostaRapida('i2', 'naoAtende')");
  T(conf("i2") === "naoAtende" && roda("STATE.ui.chkItemAberto") === "i2", "toque em Nao atende grava e abre o item (motivo e foto)");
  roda("chkItemExec(getCurrentChkLinha(), 'i2').motivosSelecionados = ['x']; App.chkRespostaRapida('i2', 'na')");
  T(conf("i2") === "na" && roda("chkItemExec(getCurrentChkLinha(), 'i2').motivosSelecionados.length") === 0 && roda("STATE.ui.chkItemAberto") === null, "trocar de Nao atende para N/A limpa o motivo e fecha o item");
  roda("App.chkRespostaRapida('i2', 'na')"); // volta a sem resposta
  roda("App.chkRespostaRapida('i3', 'atende')");
  // marcar os restantes como Atende: confirma antes; so a secao pedida; nao mexe no que ja foi respondido
  roda("chkItemExec(getCurrentChkLinha(), 'i1').conforme = 'naoAtende'");
  roda("App.chkMarcarRestantesAtende('s1')");
  T(conf("i2") === null, "marcar restantes so age depois de confirmar");
  roda("App.chkConfirmarAcao()");
  T(conf("i1") === "naoAtende" && conf("i2") === "atende" && conf("i3") === "atende", "restantes viram Atende, o ja respondido nao muda");
  // cartao: botoes de resposta so no cartao fechado
  roda("STATE.ui.chkItemAberto = null");
  const cardF = roda("chkRenderItem(getCurrentChkLinha(), getCurrentChkLinha().modeloSnapshot[0].itens[0], 0, 0)");
  T(cardF.includes("chk-quick") && cardF.includes("App.chkRespostaRapida('i1','atende')") && cardF.includes("App.chkRespostaRapida('i1','naoAtende')") && cardF.includes("App.chkRespostaRapida('i1','na')") && cardF.includes('data-item="i1"'), "cartao fechado tem os tres botoes de resposta: " + cardF.slice(0, 200));
  T(cardF.indexOf("App.chkRespostaRapida('i1','na')") < cardF.indexOf("App.chkRespostaRapida('i1','naoAtende')") && cardF.indexOf("App.chkRespostaRapida('i1','naoAtende')") < cardF.indexOf("App.chkRespostaRapida('i1','atende')"), "botoes de resposta na ordem Nao aplicavel, Nao atende, Atende (so a posicao mudou)");
  roda("STATE.ui.chkItemAberto = 'i1'");
  const cardA = roda("chkRenderItem(getCurrentChkLinha(), getCurrentChkLinha().modeloSnapshot[0].itens[0], 0, 0)");
  T(!cardA.includes("chk-quick") && cardA.includes("Tirar foto") && cardA.includes("App.chkTirarFoto('i1',false)"), "cartao aberto de Nao atende: sem a fileira rapida, com Tirar foto/Galeria dentro do cartao");
  // Corrigir, na revisao de uma linha ja finalizada: reabre a linha e vai ao item (nao ao laudo em branco)
  roda("(function(){ const l = getCurrentChkLinha(); l.status = 'finalizado'; l.dataFinalizacao = '2026-10-07'; STATE.ui.chkItemAberto = null; })()");
  roda("App.chkIrDaRevisao(0, 'i1')");
  T(roda("getCurrentChkLinha().status") === "finalizado", "Corrigir numa linha finalizada NAO reabre sozinho: pede confirmacao antes (so olhar nao pode mudar a linha)");
  roda("App.chkConfirmarAcao()");
  T(roda("getCurrentChkLinha().status") === "em_andamento" && roda("getCurrentChkLinha().dataFinalizacao") === null && roda("STATE.ui.chkItemAberto") === "i1" && roda("STATE.ui.chkSecaoAtual") === 0, "Corrigir numa linha finalizada reabre a linha e abre o item no preenchimento");
  roda("App.chkIrDaRevisao(0, 'i2')");
  T(roda("getCurrentChkLinha().status") === "em_andamento" && roda("STATE.ui.chkItemAberto") === "i2", "Corrigir numa linha em andamento nao muda o status");
  // revisao: o cartao Itens sem resposta e o primeiro da tela e o toque nele leva ao primeiro item sem resposta
  roda("(function(){ const l = getCurrentChkLinha(); l.itens.forEach(i=>{ i.conforme = 'atende'; }); l.itens.find(i=> i.itemId === 'i2').conforme = null; l.itens.find(i=> i.itemId === 'i3').conforme = null; l.status = 'em_andamento'; })()");
  const fin = roda("screenChkFinalizar()");
  T(fin.indexOf("Itens sem resposta") > -1 && fin.indexOf("Itens sem resposta") < fin.indexOf(">Resumo<") && fin.includes("class=\"card card-pad chk-pend-card\"") && fin.includes("onclick=\"App.chkIrDaRevisao(0,'i2')\"") && fin.includes("Toque aqui para responder"), "o cartao Itens sem resposta vem antes do Resumo e o toque leva ao primeiro item sem resposta: " + fin.slice(0, 300));
  T(fin.includes("event.stopPropagation();App.chkIrDaRevisao(0,'i2')") && fin.includes("event.stopPropagation();App.chkIrDaRevisao(1,'i3')"), "cada Ir leva ao primeiro item sem resposta da propria secao");
  roda("(function(){ getCurrentChkLinha().itens.forEach(i=>{ i.conforme = 'atende'; }); })()");
  T(!roda("screenChkFinalizar()").includes("Itens sem resposta"), "sem pendencia, o cartao some");
  roda("STATE.ui.chkItemAberto = null; STATE.ui.chkProjetoId = " + J(estadoAntes.p) + "; STATE.ui.chkSetorId = null; STATE.ui.chkLinhaId = null; STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  // ---- conferencia ao finalizar: nao atende sem explicacao, motivo sem texto/acao no modelo, sem resposta ----
  const mkM = (conf, motivos, sel, nota)=> "(" + J({ id:"LM", nome:"LV conf", status:"em_andamento", secoesNA:[], laudo:{},
    modeloSnapshot:[ { id:"s1", titulo:"Trólei", itens:[ { id:"i1", descricao:"Capacidade marcada?", prioridade:"alta", motivosPadrao: motivos }, { id:"i2", descricao:"Plaqueta?", prioridade:"media", motivosPadrao: motivos } ] } ],
    itens:[ { itemId:"i1", conforme:"atende", motivosSelecionados:[], observacao:"", fotos:[] }, { itemId:"i2", conforme:conf, motivosSelecionados:sel || [], observacao:nota || "", fotos:[] } ] }) + ")";
  const mp = (texto, acao)=> [{ motivo:"M1", texto, acao }];
  const inc = (l)=> roda("chkIncoerencias(" + l + ")");
  let r1 = inc(mkM("naoAtende", mp("T1", "A1"), [], ""));
  T(r1.length === 1 && r1[0].tipo === "motivo" && r1[0].ref === "1.2" && r1[0].itemId === "i2" && r1[0].txt.includes("Regularizar o item"), "nao atende sem motivo escolhido (o caso do item 7.2): " + J(r1));
  T(inc(mkM("naoAtende", mp("T1", "A1"), ["M1"], "")).length === 0, "motivo escolhido, com texto e acao no modelo: sem incoerencia");
  const r3 = inc(mkM("naoAtende", mp("T1", ""), ["M1"], ""));
  T(r3.length === 1 && r3[0].tipo === "modelo" && r3[0].txt.includes("não tem ação recomendada") && r3[0].txt.includes("Regularizar: M1"), "motivo sem acao no modelo: " + J(r3));
  const r4 = inc(mkM("naoAtende", mp("", "A1"), ["M1"], ""));
  T(r4.length === 1 && r4[0].tipo === "modelo" && r4[0].txt.includes("não tem texto"), "motivo sem texto no modelo: " + J(r4));
  T(inc(mkM("naoAtende", [], [], "")).length === 1 && inc(mkM("naoAtende", [], [], "Falta a plaqueta")).length === 0, "item sem motivos no modelo: exige a nota; com nota nao ha incoerencia");
  const r6 = inc(mkM(null, mp("T1", "A1"), [], ""));
  T(r6.length === 1 && r6[0].tipo === "sem-resposta" && r6[0].itemId === "i2" && r6[0].txt.includes("1 item sem resposta"), "item sem resposta entra na conferencia: " + J(r6));
  T(inc(mkM("atende", mp("T1", "A1"), [], "")).length === 0 && inc(mkM("na", mp("T1", "A1"), [], "")).length === 0, "atende e nao se aplica nao geram incoerencia");
  T(inc("(" + J(Object.assign(JSON.parse(mkM("naoAtende", mp("T1", "A1"), [], "").slice(1, -1)), { secoesNA:["s1"] })) + ")").length === 0, "secao que nao se aplica fica de fora");
  // Finalizar: com incoerencia nao fecha a linha (abre a conferencia); sem incoerencia fecha direto; o botao 'Esta certo' fecha
  roda("STATE.checklists.projetos = [{ id:'PF', empresa:'EF', setores:[{ id:'SF', nome:'SF', linhas:[ Object.assign(" + mkM("naoAtende", mp("T1", "A1"), [], "") + ", { id:'LF' }) ] }] }]; STATE.ui.chkProjetoId = 'PF'; STATE.ui.chkSetorId = 'SF'; STATE.ui.chkLinhaId = 'LF';");
  roda("App.chkFinalizar()");
  T(roda("getCurrentChkLinha().status") === "em_andamento", "com incoerencia, Finalizar nao fecha a linha: abre a conferencia");
  roda("App.chkFinalizarConfirmado()");
  T(roda("getCurrentChkLinha().status") === "finalizado" && roda("getCurrentChkLinha().dataFinalizacao") !== null, "confirmando na conferencia, a linha finaliza");
  roda("(function(){ const l = getCurrentChkLinha(); l.status = 'em_andamento'; l.dataFinalizacao = null; l.itens.find(i=> i.itemId === 'i2').motivosSelecionados = ['M1']; })()");
  roda("App.chkFinalizar()");
  T(roda("getCurrentChkLinha().status") === "finalizado", "sem incoerencia, Finalizar fecha direto");
  // quadro de nao conformidades da Conclusao: sem nenhuma foto a coluna Imagem some; com algumas, sem quadro cinza "sem foto"
  const capC = "{ num:5, rot:'Conclusão', ancora:'cap-conclusao' }", dF3 = "lclDados(__f3.proj, __f3.setor, __f3.l)";
  const qSem = roda("lclBlocosConclusao(" + dF3 + ", " + capC + ", '', (x)=> '').filter(b=> b.html.includes('lcl-ncr')).map(b=> b.html).join('')");
  T(qSem.includes("lcl-ncr sem-im h") && !qSem.includes("<span>Imagem</span>") && !qSem.includes('class="im') && !qSem.includes("sem foto") && !qSem.includes("Sem registro fotográfico"), "nenhuma nao conformidade com foto: a coluna Imagem some do quadro");
  const qCom = roda("lclBlocosConclusao(" + dF3 + ", " + capC + ", '', (x)=> x ? 'data:image/jpeg;base64,RR' : '').filter(b=> b.html.includes('lcl-ncr')).map(b=> b.html).join('')");
  T(qCom.includes("<span>Imagem</span>") && qCom.includes('class="im"') && !qCom.includes("sem-im"), "com foto em alguma nao conformidade: a coluna Imagem fica");
  // normas de referencia agrupadas por tipo de linha (texto padrao unico) e cabecalho de grupo na Metodologia
  T(roda("LCL_NORMATIVO_PADRAO.normas.filter(x => /^###\\s/.test(x)).length") === 4 && roda("LCL_NORMATIVO_PADRAO.normas[0]").startsWith("### Normas gerais") && roda("LCL_NORMATIVO_PADRAO.normas.some(x => x.includes('rígidas'))") && roda("LCL_NORMATIVO_PADRAO.normas.some(x => x.includes('flexíveis'))") && roda("LCL_NORMATIVO_PADRAO.normas.some(x => x.includes('verticais'))"), "normas padrao: gerais, rigidas, flexiveis e verticais");
  T(roda("LCL_NORMATIVO_PADRAO.normas.join('|')").includes("NBR 16325-1:2014") && roda("LCL_NORMATIVO_PADRAO.normas.join('|')").includes("NBR 16489") && roda("LCL_NORMATIVO_PADRAO.normas.join('|')").includes("NBR 15837") && roda("LCL_NORMATIVO_PADRAO.normas.join('|')").includes("NR-35"), "as normas citadas nos itens do checklist estao na lista");
  T(roda(`lclAplicarVariaveis("{{normas}}", { normas: ["### G", "NBR 1", "NBR 2"] })`) === "### G\n- NBR 1\n- NBR 2", "cabecalho de grupo (###) nao vira item de lista");
  const mk4 = roda(`lclMarkup("### Grupo\\n- NBR 1\\n- NBR 2", [], (x)=> x).map(b => b.html).join("")`);
  T(mk4.includes('<div class="lcl-h4">Grupo</div>') && mk4.includes("<li>NBR 1</li>"), "### vira subtitulo menor e a lista segue: " + mk4);
  // frase do CREA so quando ha ART
  const concArt = (art)=> { roda("__f3.proj.art = " + J(art)); return roda("lclBlocosConclusao(lclDados(__f3.proj, __f3.setor, __f3.l), { num:5, rot:'Conclusão', ancora:'cap-conclusao' }, '', (x)=> '').map(b => b.html).join('')"); };
  const artAntes = roda("__f3.proj.art");
  T(concArt("ART123").includes("documentado perante o CREA na ART nº <b>ART123</b>") && !concArt("").includes("perante o CREA"), "a frase 'documentado perante o CREA' so sai quando ha ART");
  roda("__f3.proj.art = " + J(artAntes));
  // memorial da viga: altura minima da posicao de trabalho para talabarte e para trava-quedas
  const condR = roda(`(function(){ const m = chkMemorialDe({ memorial:{ hanc:6.5, hpos:4.9, vao:1 } }); const c = chkMemorialCalc("horizontal_rigida", m); return chkMemorialCondicoes(c, m).join("|"); })()`);
  T(condR.includes("talabarte <b>2,00 m</b>; trava-quedas <b>1,50 m</b>"), "condicoes de uso do memorial citam a altura minima de talabarte e de trava-quedas: " + condR);
  roda("STATE.ui.chkProjetoId = " + J(estadoAntes.p) + "; STATE.ui.chkSetorId = null; STATE.ui.chkLinhaId = null; STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  // ---- secao do laudo: faixa de fotos no topo (itens que atendem), texto de conformidade, pendencias com fotos ao lado ----
  const itn = (id, desc, extra)=> Object.assign({ id, descricao:desc, prioridade:"media", textoAtende:"Texto " + id + " ok.", motivosPadrao:[{ motivo:"M1", texto:"Pendencia " + id + ".", acao:"A" }] }, extra || {});
  const exe = (id, conf, nFotos, extra)=> Object.assign({ itemId:id, conforme:conf, motivosSelecionados:[], observacao:"", fotos: Array.from({ length:nFotos }, (_, k)=> ({ foto:"data:image/jpeg;base64,F" + id + k, motivo:"" })) }, extra || {});
  const linhaCorpo = (itens, execs)=> J({ id:"LC", nome:"LV corpo", secoesNA:[], laudo:{}, modeloSnapshot:[{ id:"s1", titulo:"Documentação", contexto:"Como deve estar X.", itens }], itens: execs });
  const capC1 = "{ num:3, rot:'Avaliação por Componente', ancora:'cap-corpo', subs:[{ id:'s1', num:'3.1', titulo:'Documentação', ancora:'cap-sec-s1' }] }";
  const corpoDe = (lin)=> roda("lclBlocosCorpo({ linha:" + lin + " }, " + capC1 + ", (x)=> x)");
  const junta = (bs)=> bs.map(b=> b.html).join("");
  // numeracao: fotos dos itens que atendem primeiro, depois as das pendencias; nOk = quantas sao do primeiro grupo
  const lin1 = linhaCorpo([itn("a", "Item A"), itn("b", "Item B"), itn("c", "Item C")], [exe("a", "naoAtende", 2, { motivosSelecionados:["M1"] }), exe("b", "atende", 1), exe("c", "atende", 2)]);
  const fs = roda("chkFotosDaSecao(" + lin1 + ".modeloSnapshot[0], " + lin1 + ")");
  T(fs.nOk === 3 && fs.fotos.length === 5 && fs.fotos[0].endsWith("Fb0") && fs.fotos[1].endsWith("Fc0") && fs.fotos[3].endsWith("Fa0"), "numeracao: fotos dos itens que atendem primeiro (nOk=3), depois as das pendencias: " + J(fs.fotos));
  T(roda("chkCitarFotos([1,2,3], '3.1', true)") === "Fotos 3.1.1 a 3.1.3" && roda("chkCitarFotos([1,2], '3.1', true)") === "Fotos 3.1.1 e 3.1.2" && roda("chkCitarFotos([1,3,4], '3.1', true)") === "Fotos 3.1.1, 3.1.3 e 3.1.4" && roda("chkCitarFotos([3,4,5], '', false)") === "Fotos 3, 4 e 5", "citacao em faixa so quando pedida e so para numeros seguidos");
  const nr = roda("chkNarrativaSecao(" + lin1 + ".modeloSnapshot[0], " + lin1 + ", '3.1')");
  T(nr.conforme === "Texto b ok. Texto c ok. (Fotos 3.1.1 a 3.1.3)" && nr.pend.includes("Pendencia a. (Fotos 3.1.4 e 3.1.5)") && nr.pend.includes('<mark class="nc">'), "conformes num paragrafo so, sem citar o item, com as fotos em faixa; pendencia cita as duas fotos: " + J(nr));
  // pendencia sem motivo (ou motivo sem texto) nunca some: entra com a descricao do item e a nota
  const linNc = linhaCorpo([itn("t", "Plaqueta de identificação do trólei"), itn("u", "Item U", { motivosPadrao:[{ motivo:"M1", texto:"", acao:"" }] })], [exe("t", "naoAtende", 0, { observacao:"Plaqueta ausente" }), exe("u", "naoAtende", 0, { motivosSelecionados:["M1"] })]);
  const nNc = roda("chkNarrativaSecao(" + linNc + ".modeloSnapshot[0], " + linNc + ")");
  T(nNc.pend.includes("Não atendem os requisitos dos itens 1.1 — nota do inspetor: Plaqueta ausente e 1.2, conforme o Checklist deste relatório.") && !nNc.pend.includes("Plaqueta de identificação do trólei") && !nNc.pend.includes("Item U"), "nao atende sem texto de motivo continua no laudo pelo numero do item e pela nota, SEM repetir a pergunta do checklist: " + nNc.pend);
  // com norma e foto: "item 1.1 (NR-35 Anexo II 3.3; Foto 3.1.1)"; um item so no singular
  const linNc2 = linhaCorpo([itn("t", "Pergunta do checklist?", { normativo:"NR-35 Anexo II 3.3" })], [exe("t", "naoAtende", 1)]);
  const nNc2 = roda("chkNarrativaSecao(" + linNc2 + ".modeloSnapshot[0], " + linNc2 + ", '3.1')");
  T(nNc2.pend.includes("Não atende o requisito do item 1.1 (NR-35 Anexo II 3.3; Foto 3.1.1), conforme o Checklist deste relatório.") && !nNc2.pend.includes("Pergunta do checklist"), "um item sem motivo, com norma e foto: frase no singular, sem a pergunta: " + nNc2.pend);
  // secao com todos os itens 'nao se aplica' nao diz que falta responder
  const linTodosNa = linhaCorpo([itn("a", "Item A"), itn("b", "Item B")], [exe("a", "na", 0), exe("b", "na", 0)]);
  const bsNa = corpoDe(linTodosNa);
  T(junta(bsNa).includes("Todos os itens desta seção foram marcados como não se aplicam") && !junta(bsNa).includes("Nenhum item desta seção foi respondido ainda"), "secao so com 'nao se aplica': mensagem propria, nao 'nenhum item respondido'");
  const bsPend = corpoDe(linhaCorpo([itn("a", "Item A")], [exe("a", null, 0)]));
  T(junta(bsPend).includes("Nenhum item desta seção foi respondido ainda"), "secao sem resposta continua com a mensagem de pendencia");
  // faixa do topo: 1 foto = 1 coluna; 2 = 2; 3 = 3; 4 = 2 por linha; 5 e 6 = 3 por linha; no maximo 6 (as outras descem ao fim)
  const faixaDe = (n)=>{
    const itens = Array.from({ length:n }, (_, k)=> itn("p" + k, "Item " + k)), ex = Array.from({ length:n }, (_, k)=> exe("p" + k, "atende", 1));
    const bs = corpoDe(linhaCorpo(itens, ex));
    const h0 = bs[0].html, m = /lcl-ftopo c(\d)/.exec(h0);
    return { cols: m ? Number(m[1]) : 0, fotos: (h0.match(/class="lcl-fnum"/g) || []).length, extra: bs.slice(1).filter(b=> b.html.includes("lcl-fgrade")).reduce((a, b)=> a + (b.html.match(/class="lcl-fnum"/g) || []).length, 0), resto: junta(bs.slice(1)) };
  };
  const f1 = faixaDe(1), f2 = faixaDe(2), f3 = faixaDe(3), f4 = faixaDe(4), f5 = faixaDe(5), f6 = faixaDe(6), f8 = faixaDe(8);
  T(f1.cols === 1 && f2.cols === 2 && f3.cols === 3 && f4.cols === 2 && f5.cols === 3 && f6.cols === 3 && f1.fotos === 1 && f4.fotos === 4 && f6.fotos === 6, "faixa do topo: colunas e quantidade de fotos: " + J([f1.cols, f2.cols, f3.cols, f4.cols, f5.cols, f6.cols]));
  T(f8.fotos === 6 && f8.cols === 3 && f8.extra === 2 && f8.resto.includes("Foto 3.1.7") && f8.resto.includes("Foto 3.1.8"), "mais de 6 fotos: seis no topo, as outras descem para o fim da secao: " + J([f8.fotos, f8.extra]));
  // ordem na pagina: foto(s) do topo, 'Como deve estar', texto das conformidades; pendencias em bloco proprio com as fotos ao lado
  const bsMix = corpoDe(lin1);
  const hA = bsMix[0].html;
  T(hA.indexOf("lcl-ftopo") < hA.indexOf("Como deve estar") && hA.indexOf("Como deve estar") < hA.indexOf("Texto b ok.") && bsMix[1].html.includes("lcl-pend") && bsMix[1].html.includes("lcl-fotos-col") && bsMix[1].html.includes("Foto 3.1.4") && bsMix[1].html.includes("Foto 3.1.5") && bsMix[1].html.includes("Pendencia a."), "pagina: fotos do topo, Como deve estar, conformes; pendencias com as fotos empilhadas ao lado");
  // sem pendencia: nao ha bloco de pendencias; sem foto: nao ha faixa
  const linOk = linhaCorpo([itn("a", "Item A")], [exe("a", "atende", 0)]);
  const bsOk = corpoDe(linOk);
  T(bsOk.length === 1 && !bsOk[0].html.includes("lcl-ftopo") && bsOk[0].html.includes("Texto a ok."), "so conformes e sem fotos: um bloco, sem faixa e sem pendencias");
  // ---- dados do projeto: o app deixa claro que salva sozinho (sem botao Salvar) e avisa ao sair
  roda("STATE.checklists.projetos = [{ id:'PS', empresa:'E', setores:[], solicitanteCpfCnpj:'', solicitanteTelefone:'', validadeInspecao:'', dataInspecao:'' }]; STATE.ui.chkProjetoId = 'PS'; __chkProjEditado = false;");
  const fPf = roda("screenChkProjetoForm()");
  T(fPf.includes("salvo na hora, sem precisar de botão") && fPf.includes('id="chkPfSalvo"') && fPf.includes("Ver setores") && !fPf.includes("Salvar e ver setores"), "o formulario do projeto diz que salva sozinho e o botao so leva aos setores");
  roda("App.chkSetProjetoField('solicitanteCpfCnpj', '11222333000144')");
  T(roda("STATE.checklists.projetos[0].solicitanteCpfCnpj") === "11222333000144" && roda("__chkProjEditado") === true, "digitar grava na hora e marca que houve edicao (o aviso 'Dados do projeto salvos' sai ao deixar a tela)");
  roda("STATE.ui.chkProjetoId = " + J(estadoAntes.p) + "; STATE.checklists.projetos = " + J(estadoAntes.lista) + "; __chkProjEditado = false;");
  // ---- pagina 2 do laudo: datas em DD/MM/AAAA (inspecao e validade)
  const dtAntes = roda("({ a: __f3.proj.dataInspecao, b: __f3.proj.validadeInspecao })");
  roda("__f3.proj.dataInspecao = '2026-10-03'; __f3.proj.validadeInspecao = '2027-10-03';");
  const p2d = roda("lclBlocosPagina2(lclDados(__f3.proj, __f3.setor, __f3.l), lclTextos()).map(b => b.html).join('')");
  T(p2d.includes("<i>Data da Inspeção:</i><b>03/10/2026</b>") && p2d.includes("<i>Validade da Inspeção:</i><b>03/10/2027</b>") && !p2d.includes("de outubro de"), "pagina 2: data e validade da inspecao em DD/MM/AAAA: " + p2d.slice(0, 400));
  roda("__f3.proj.dataInspecao = " + J(dtAntes.a) + "; __f3.proj.validadeInspecao = " + J(dtAntes.b) + ";");
  // ---- cartao da linha: resumo (atendem / nao atendem / N/A / pendentes) e fotos do laudo separadas em conformidade e nao conformidade
  const fotoCard = (id, n)=> Array.from({ length:n }, (_, k)=> ({ foto:"data:image/jpeg;base64,FC" + id + k, motivo:"" }));
  const linhaCard = J({ id:"LCARD", nome:"LV card", secoesNA:["s2"], laudo:{},
    modeloSnapshot:[ { id:"s1", titulo:"A", itens:[ { id:"a", descricao:"A", motivosPadrao:[] }, { id:"b", descricao:"B", motivosPadrao:[] }, { id:"c", descricao:"C", motivosPadrao:[] }, { id:"d", descricao:"D", motivosPadrao:[] } ] }, { id:"s2", titulo:"B", itens:[ { id:"e", descricao:"E", motivosPadrao:[] } ] } ],
    itens:[ { itemId:"a", conforme:"naoAtende", motivosSelecionados:[], observacao:"", fotos: fotoCard("a", 2) }, { itemId:"b", conforme:"atende", motivosSelecionados:[], observacao:"", fotos: fotoCard("b", 1) }, { itemId:"c", conforme:"na", motivosSelecionados:[], observacao:"", fotos:[] }, { itemId:"d", conforme:null, motivosSelecionados:[], observacao:"", fotos:[] }, { itemId:"e", conforme:"na", motivosSelecionados:[], observacao:"", fotos: fotoCard("e", 3) } ] });
  const rc = roda("chkResumoCardLinha(" + linhaCard + ")");
  T(rc.atende === 1 && rc.naoAtende === 1 && rc.na === 2 && rc.pendente === 1 && rc.fotosOk === 1 && rc.fotosNc === 2, "resumo do cartao: itens por situacao e fotos do laudo (conformidade x nao conformidade; secao que nao se aplica fica de fora): " + J(rc));
  // ---- prioridade por motivo e nivel "Boa pratica"
  T(roda("chkPrioridadeValida('boa')") === true && roda("chkPrioridadeDeTexto('Boa prática')") === "boa" && roda("chkPrioridadeDeTexto(' BOA PRATICA ')") === "boa" && roda("chkPrioridadeRotulo('boa')") === "Boa prática" && roda("CHK_PRIORIDADES.length") === 4, "nivel Boa pratica reconhecido (texto com e sem acento) e com rotulo");
  const itPr = J({ id:"x", prioridade:"media", motivosPadrao:[{ motivo:"M1", prioridade:"critica" }, { motivo:"M2", prioridade:"boa" }, { motivo:"M3" }] });
  const prNc = (sel)=> roda("lclPrioridadeNc({}, " + itPr + ", " + J({ motivosSelecionados: sel }) + ")");
  T(prNc(["M2"]) === "boa" && prNc(["M1", "M2"]) === "critica" && prNc(["M3"]) === "media" && prNc([]) === "media" && prNc(["M3", "M2"]) === "boa", "prioridade da nao conformidade: a mais alta entre os motivos escolhidos que tem prioridade; sem prioridade no motivo vale a do item");
  const xmlP = '<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Seção</t></is></c><c r="B1" t="inlineStr"><is><t>Item</t></is></c><c r="D1" t="inlineStr"><is><t>Motivo</t></is></c><c r="E1" t="inlineStr"><is><t>Texto do Motivo</t></is></c><c r="H1" t="inlineStr"><is><t>Prioridade</t></is></c></row>'
    + '<row r="2"><c r="A2" t="inlineStr"><is><t>Sec</t></is></c><c r="B2" t="inlineStr"><is><t>Perg?</t></is></c><c r="D2" t="inlineStr"><is><t>M1</t></is></c><c r="E2" t="inlineStr"><is><t>t1</t></is></c><c r="H2" t="inlineStr"><is><t>Alta</t></is></c></row>'
    + '<row r="3"><c r="D3" t="inlineStr"><is><t>M2</t></is></c><c r="E3" t="inlineStr"><is><t>t2</t></is></c><c r="H3" t="inlineStr"><is><t>Boa prática</t></is></c></row>'
    + '<row r="4"><c r="D4" t="inlineStr"><is><t>M3</t></is></c><c r="E4" t="inlineStr"><is><t>t3</t></is></c><c r="H4" t="inlineStr"><is><t>Crítica</t></is></c></row></sheetData>';
  const impP = roda("chkModeloXLSXLinhasParaSecoes(baseIALerCelulas(" + J(xmlP) + ", []))");
  const itImp = impP.secoes[0].itens[0];
  T(!impP.erro && itImp.prioridade === "alta" && itImp.motivosPadrao.map(m => m.prioridade).join(",") === "alta,boa,critica", "importar XLSX: a prioridade de CADA linha de motivo e lida (a do item e a da 1a linha): " + J(itImp.motivosPadrao));
  const volta = roda("chkModeloXLSXLinhasDoModelo({ secoes:" + J(impP.secoes) + " })");
  T(volta.map(l => l[7]).join(",") === "Alta,Boa prática,Crítica", "exportar XLSX: a prioridade de cada motivo volta nas linhas (ida e volta): " + J(volta.map(l => l[7])));
  // parecer: so 'boa pratica' nao deixa a linha com ressalvas
  const linPr = (prio, sel)=> J({ id:"LP", nome:"LV", secoesNA:[], laudo:{}, modeloSnapshot:[{ id:"s1", titulo:"A", itens:[{ id:"i1", descricao:"Q", prioridade:"media", motivosPadrao:[{ motivo:"M", texto:"T", acao:"A", prioridade:prio }] }, { id:"i2", descricao:"Q2", prioridade:"media", motivosPadrao:[] }] }], itens:[{ itemId:"i1", conforme:"naoAtende", motivosSelecionados:sel, observacao:"", fotos:[] }, { itemId:"i2", conforme:"atende", motivosSelecionados:[], observacao:"", fotos:[] }] });
  T(roda("lclParecerAuto(" + linPr("boa", ["M"]) + ")") === "apta" && roda("lclParecerAuto(" + linPr("media", ["M"]) + ")") === "ressalvas" && roda("lclParecerAuto(" + linPr("critica", ["M"]) + ")") === "inapta", "parecer: Boa pratica nao tira a aptidao, Media da ressalvas, Critica deixa inapta");
  const ncBoa = roda("lclNaoConformidades(" + linPr("boa", ["M"]) + ")");
  T(ncBoa.length === 1 && ncBoa[0].prioridade === "boa", "quadro de nao conformidades usa a prioridade do motivo escolhido");
  // ---- fotos da secao (gerais, sem ligar a item): numeracao, laudo, campo, mescla
  const linSec = (extra)=> JSON.parse(linhaCorpo([itn("a", "Item A"), itn("b", "Item B")], [exe("a", "atende", 1), exe("b", "naoAtende", 1, { motivosSelecionados:["M1"] })]).replace(/^/, "")); // objeto
  const comFs = Object.assign(linSec(), { fotosSecao: { s1: [{ foto:"data:image/jpeg;base64,FS1", tags:[], motivo:"" }, { foto:"data:image/jpeg;base64,FS2", tags:[], motivo:"" }] } });
  const fsx = roda("chkFotosDaSecao(" + J(comFs) + ".modeloSnapshot[0], " + J(comFs) + ")");
  T(fsx.fotos.length === 4 && fsx.nOk === 3 && fsx.fotos[0].endsWith("FS1") && fsx.fotos[1].endsWith("FS2") && fsx.fotos[2].endsWith("Fa0") && fsx.fotos[3].endsWith("Fb0"), "numeracao: fotos da secao primeiro, depois as dos itens que atendem, depois as das pendencias: " + J(fsx.fotos) + " nOk=" + fsx.nOk);
  const nrs = roda("chkNarrativaSecao(" + J(comFs) + ".modeloSnapshot[0], " + J(comFs) + ", '3.1')");
  T(nrs.conforme === "Texto a ok. (Fotos 3.1.1 a 3.1.3)" && nrs.pend.includes("Pendencia b. (Foto 3.1.4)"), "o paragrafo das conformidades cita as fotos da secao e as dos itens em faixa; a pendencia cita a sua: " + J([nrs.conforme, nrs.pend]));
  const bsFs = corpoDe(J(comFs));
  T(/lcl-ftopo c3/.test(bsFs[0].html) && (bsFs[0].html.match(/class="lcl-fnum"/g) || []).length === 3 && bsFs[0].html.includes("Foto 3.1.1") && bsFs[0].html.includes("Foto 3.1.3") && bsFs[1].html.includes("Foto 3.1.4"), "laudo: as fotos da secao abrem a faixa do topo junto das dos itens que atendem; a pendencia fica ao lado do texto dela");
  // so fotos da secao, nenhum item com foto nem texto de conformidade: a faixa aparece mesmo assim
  const soSec = Object.assign(JSON.parse(linhaCorpo([itn("a", "Item A")], [exe("a", null, 0)])), { fotosSecao: { s1: [{ foto:"data:image/jpeg;base64,FS9", tags:[], motivo:"" }] } });
  const bsSoSec = corpoDe(J(soSec));
  T(bsSoSec[0].html.includes("lcl-ftopo c1") && bsSoSec[0].html.includes("Foto 3.1.1"), "so com foto da secao (sem itens respondidos): a faixa do topo aparece");
  // campo: bloco, adicionar/remover
  const hFs = roda("chkFotosSecaoHtml(" + J(comFs) + ", " + J(comFs) + ".modeloSnapshot[0])");
  T(hFs.includes("Fotos da seção") && hFs.includes("2 fotos") && hFs.includes("App.chkSecaoFoto('s1',true)") && hFs.includes("App.chkSecaoFoto('s1',false)") && hFs.includes("App.chkSecaoFotoRemover('s1',1)"), "tela de campo: bloco Fotos da secao com contagem, camera, galeria e excluir: " + hFs.slice(0, 200));
  roda("STATE.checklists.projetos = [{ id:'PF2', empresa:'E', setores:[{ id:'SF2', nome:'S', linhas:[ Object.assign(" + J(comFs) + ", { id:'LF2' }) ] }] }]; STATE.ui.chkProjetoId = 'PF2'; STATE.ui.chkSetorId = 'SF2'; STATE.ui.chkLinhaId = 'LF2';");
  roda("App.chkSecaoFotoRemover('s1', 0)");
  T(roda("getCurrentChkLinha().fotosSecao.s1.length") === 2, "excluir foto da secao pede confirmacao antes");
  roda("App.chkConfirmarAcao()");
  T(roda("getCurrentChkLinha().fotosSecao.s1.length") === 1 && roda("getCurrentChkLinha().fotosSecao.s1[0].foto").endsWith("FS2"), "confirmado: so a foto escolhida sai");
  roda("STATE.ui.chkProjetoId = " + J(estadoAntes.p) + "; STATE.ui.chkSetorId = null; STATE.ui.chkLinhaId = null; STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  // mescla: uniao das fotos da secao
  const mA = { itens:[], secoesNA:[], status:"em_andamento", fotosSecao:{ s1:[{ foto:"data:image/jpeg;base64,U1" }] } };
  const mB = { itens:[], secoesNA:[], status:"em_andamento", fotosSecao:{ s1:[{ foto:"data:image/jpeg;base64,U1" }, { foto:"data:image/jpeg;base64,U2" }], s2:[{ foto:"data:image/jpeg;base64,U3" }] } };
  const mm = roda("chkSyncMesclarLinha(" + J(mA) + ", " + J(mB) + ")");
  T(mm.fotosSecao.s1.length === 2 && mm.fotosSecao.s2.length === 1, "mescla de versoes: as fotos da secao se somam sem repetir: " + J(mm.fotosSecao));
  // ---- versoes da mesma linha com modelos diferentes nunca se juntam
  const snapA = [{ id:"s1", itens:[{ id:"i1" }, { id:"i2" }] }], snapB = [{ id:"sN", itens:[{ id:"n1" }] }];
  T(roda("chkSyncDivergencias({ itens:[], secoesNA:[], modeloSnapshot:" + J(snapA) + " }, { itens:[], secoesNA:[], modeloSnapshot:" + J(snapB) + " }).includes('modelo')") === true && roda("chkSyncDivergencias({ itens:[], secoesNA:[], modeloSnapshot:" + J(snapA) + " }, { itens:[], secoesNA:[], modeloSnapshot:" + J(snapA) + " }).length") === 0, "mescla: modelos diferentes (linha migrada x nao migrada) contam como divergencia; o mesmo modelo nao");
  // ---- migracao de checklists (modelo antigo -> novo) pelo De-Para
  const CP = ["Checklist", "ID antigo", "Seção antiga", "Pergunta antiga (texto exato)", "Relação", "ID novo", "Seção nova", "Pergunta nova (texto exato)", "O que fazer com as fotos", "Observação"];
  const CM = ["Checklist", "ID perg. antiga", "Pergunta antiga (texto exato)", "Motivo antigo (texto exato)", "ID perg. nova", "Pergunta nova (texto exato)", "Motivo novo (texto exato)", "Tipo", "Prioridade do motivo novo", "Observação"];
  const lin = (vals, n)=> { const cells = {}; vals.forEach((v, i)=>{ if(v !== "") cells[String.fromCharCode(65 + i)] = v; }); return { n, cells }; };
  const R = "Horizontal Rígida";
  const tabP = [lin(CP, 1),
    lin([R, "2", "Documentação", "Q1 projeto?", "Fundida (N→1)", "2", "Documentação", "N1 projeto e inspecoes?", "", ""], 2),
    lin([R, "5", "Documentação", "Q2 relatorio?", "Fundida (N→1)", "2", "Documentação", "N1 projeto e inspecoes?", "", ""], 3),
    lin([R, "8", "Viga / Trilho", "Q3 viga integra?", "Ajustada (1→1)", "5", "Viga / Trilho", "N2 viga?", "", ""], 4),
    lin([R, "11", "Compatibilidade e Uso", "Q4 cinturao?", "Removida", "", "", "", "", ""], 5),
    lin([R, "14", "Dispositivos de Ancoragem", "Q5 olhal integro?", "Removida", "", "", "", "", ""], 6),
    lin([R, "", "", "", "Nova (sem pergunta antiga)", "9", "Viga / Trilho", "N9 validade?", "", ""], 7)];
  const tabM = [lin(CM, 1),
    lin([R, "2", "Q1 projeto?", "m projeto ausente", "2", "N1 projeto e inspecoes?", "n projeto ausente", "Igual", "Alta", ""], 2),
    lin([R, "5", "Q2 relatorio?", "m sem relatorio", "2", "N1 projeto e inspecoes?", "n sem relatorio periodico", "Renomeado", "Alta", ""], 3),
    lin([R, "5", "Q2 relatorio?", "m outro", "", "", "", "Sem equivalente (removido)", "", ""], 4),
    lin([R, "8", "Q3 viga integra?", "m viga trincada", "5", "N2 viga?", "n viga deformada", "Igual", "Crítica", ""], 5)];
  const plano = roda("chkMigPlano(chkMigTabela(" + J(tabP) + "), chkMigTabela(" + J(tabM) + "))");
  T(Object.keys(plano.horizontal_rigida.perguntas).length === 5 && plano.horizontal_rigida.novas.length === 1 && plano.horizontal_rigida.perguntas["Q4 cinturao?"].relacao === "Removida" && Object.keys(plano.horizontal_rigida.motivos).length === 4, "plano lido do De-Para (perguntas, motivos e a pergunta nova sem dados): " + J(Object.keys(plano.horizontal_rigida.perguntas)));
  const modeloNovo = { id:"MN", nome:"Rigida v2", tipoLinha:"horizontal_rigida", secoes:[
    { id:"sd", titulo:"Documentação", contexto:"", itens:[{ id:"n1", descricao:"N1 projeto e inspecoes?", motivosPadrao:[{ motivo:"n projeto ausente", texto:"t", acao:"a" }, { motivo:"n sem relatorio periodico", texto:"t", acao:"a" }] }] },
    { id:"sv", titulo:"Viga / Trilho", contexto:"", itens:[{ id:"n2", descricao:"N2 viga?", motivosPadrao:[{ motivo:"n viga deformada", texto:"t", acao:"a" }] }] },
    { id:"sa", titulo:"Ancoragem Estrutural", contexto:"", itens:[{ id:"n3", descricao:"N3 ancoragem?", motivosPadrao:[] }] } ] };
  T(roda("chkMigAcharModeloNovo([" + J(modeloNovo) + ", { secoes:[] }], chkMigPlano(chkMigTabela(" + J(tabP) + "), chkMigTabela(" + J(tabM) + ")).horizontal_rigida)") !== null, "acha o modelo novo pelo texto exato das perguntas novas");
  const ft = (id, mo)=> ({ foto:"data:image/jpeg;base64,MG" + id, tags:[], motivo: mo || "" });
  const velha = (status, extra)=> Object.assign({ id:"LM", nome:"LV mig", status, dataFinalizacao: status === "finalizado" ? "2026-10-07" : null, tipoLinha:"horizontal_rigida", modeloId:"MV", modeloNome:"Rigida v1", secoesNA:[], laudo:{}, descricao:"d", conclusaoTexto:"", fotoAmpla:"", criadoEm:100,
    modeloSnapshot:[ { id:"o1", titulo:"Documentação", itens:[{ id:"q1", descricao:"Q1 projeto?" }, { id:"q2", descricao:"Q2 relatorio?" }] }, { id:"o2", titulo:"Viga / Trilho", itens:[{ id:"q3", descricao:"Q3 viga integra?" }] }, { id:"o3", titulo:"Compatibilidade e Uso", itens:[{ id:"q4", descricao:"Q4 cinturao?" }] }, { id:"o4", titulo:"Dispositivos de Ancoragem", itens:[{ id:"q5", descricao:"Q5 olhal integro?" }] } ],
    itens:[ { itemId:"q1", conforme:"naoAtende", motivosSelecionados:["m projeto ausente"], observacao:"obs q1", fotos:[ft("A1", "m projeto ausente")] },
            { itemId:"q2", conforme:"naoAtende", motivosSelecionados:["m sem relatorio", "m outro"], observacao:"", fotos:[] },
            { itemId:"q3", conforme:"atende", motivosSelecionados:[], observacao:"", fotos:[ft("P3"), ft("P3b")] },
            { itemId:"q4", conforme:"naoAtende", motivosSelecionados:["m epi"], observacao:"", fotos:[] },
            { itemId:"q5", conforme:"atende", motivosSelecionados:[], observacao:"", fotos:[ft("D1"), ft("D2")] } ] }, extra || {});
  const args = (l)=> J(l) + ", " + J(modeloNovo) + ", chkMigPlano(chkMigTabela(" + J(tabP) + "), chkMigTabela(" + J(tabM) + ")).horizontal_rigida, 'horizontal_rigida'";
  const lv = velha("em_andamento"); const lvAntes = J(lv);
  const mg = roda("chkMigrarLinha(" + args(lv) + ")");
  const nl = mg.linha, rl = mg.rel;
  const e1 = nl.itens.find(i => i.itemId === "n1"), e2 = nl.itens.find(i => i.itemId === "n2");
  T(e1.conforme === "naoAtende" && J(e1.motivosSelecionados) === J(["n projeto ausente", "n sem relatorio periodico"]) && e1.observacao.includes("obs q1") && e1.observacao.includes("Motivo do checklist antigo (sem equivalente no novo): m outro") && e1.fotos.length === 1 && e1.fotos[0].motivo === "n projeto ausente" && e1.fotos[0].origem === "Q1 projeto?", "pergunta fundida: Nao atende vence, motivos migrados, motivo sem equivalente vira observacao, foto fica no motivo novo: " + J(e1));
  T(e2.conforme === "atende" && e2.fotos.length === 0 && nl.fotosSecao.sv.length === 2 && nl.fotosSecao.sa.length === 2 && nl.fotosSecao.sa[0].origem === "Q5 olhal integro?", "fotos de itens que atendem vao para a secao; as de 'Dispositivos de Ancoragem' (removida) vao para Ancoragem Estrutural");
  T(rl.fotosAntes === 5 && rl.fotosNoItem + rl.fotosNaSecao + rl.fotosSoHistorico === 5 && rl.fotosNoItem === 1 && rl.fotosNaSecao === 4 && rl.fotosSoHistorico === 0, "a conta das fotos fecha (antes = no item + na secao + so historico): " + J(rl));
  T(rl.motivosAntes === 4 && rl.motivosMigrados === 2 && rl.motivosComoObservacao === 1 && rl.motivosSoHistorico === 1 && rl.perguntasSoHistorico === 2, "a conta dos motivos fecha (antes = migrados + observacao + so historico): " + J(rl));
  T(nl.versaoAnterior.modeloSnapshot.length === 4 && nl.versaoAnterior.itens.length === 5 && nl.versaoAnterior.itens[3].motivosSelecionados[0] === "m epi" && nl.migracao.estado === "migrada-revisar" && nl.modeloId === "MN" && nl.itens.find(i => i.itemId === "n3").conforme === null, "a linha antiga fica inteira em versaoAnterior (inclusive a pergunta removida) e a nova pergunta sem dados fica sem resposta");
  T(J(lv) === lvAntes, "migrar nao altera a linha original (funcao pura)");
  // atende em pergunta fundida: em andamento -> revisar; finalizada -> sinalizada; resposta faltando nunca vira 'atende'
  const fundAtende = (status)=> { const l = velha(status); l.itens[0].conforme = "atende"; l.itens[0].motivosSelecionados = []; l.itens[1].conforme = "atende"; l.itens[1].motivosSelecionados = []; return roda("chkMigrarLinha(" + args(l) + ")"); };
  const fa1 = fundAtende("em_andamento"), fa2 = fundAtende("finalizado");
  T(fa1.linha.itens.find(i => i.itemId === "n1").conforme === "atende" && fa1.rel.revisar.length === 1 && fa1.rel.fundidasAtende.length === 0 && fa2.rel.fundidasAtende.length === 1 && fa2.rel.revisar.length === 0 && fa2.linha.migracao.estado === "migrada-finalizada", "Atende em pergunta fundida: em andamento marca 'revisar', finalizada marca a origem antiga");
  const semR = velha("em_andamento"); semR.itens[1].conforme = null; semR.itens[0].conforme = "atende"; semR.itens[0].motivosSelecionados = [];
  T(roda("chkMigrarLinha(" + args(semR) + ")").linha.itens.find(i => i.itemId === "n1").conforme === null, "uma das antigas sem resposta: a nova fica sem resposta (nunca se infere Atende)");
  // aplicar: so uma vez; simulacao nao altera
  roda("STATE.checklists.projetos = [{ id:'PM', empresa:'E', setores:[{ id:'SM', nome:'S', linhas:[ " + J(velha("finalizado")) + ", Object.assign(" + J(velha("em_andamento")) + ", { id:'LM2', tipoLinha:'vertical' }) ] }] }];");
  const modelosPT = "{ horizontal_rigida: " + J(modeloNovo) + " }";
  const simu = roda("chkMigracaoSimular(STATE, chkMigPlano(chkMigTabela(" + J(tabP) + "), chkMigTabela(" + J(tabM) + ")), " + modelosPT + ")");
  T(simu.length === 2 && simu[0].estado === "ok" && simu[1].estado === "sem-modelo-novo" && !roda("STATE.checklists.projetos[0].setores[0].linhas[0].migracao"), "simulacao: uma ok, outra sem modelo novo para o tipo; nada e alterado");
  const ap1 = roda("chkMigracaoAplicar(STATE, chkMigPlano(chkMigTabela(" + J(tabP) + "), chkMigTabela(" + J(tabM) + ")), " + modelosPT + ")");
  const ap2 = roda("chkMigracaoAplicar(STATE, chkMigPlano(chkMigTabela(" + J(tabP) + "), chkMigTabela(" + J(tabM) + ")), " + modelosPT + ")");
  T(ap1 === 1 && ap2 === 0 && roda("STATE.checklists.projetos[0].setores[0].linhas[0].modeloId") === "MN" && roda("STATE.checklists.projetos[0].setores[0].linhas[1].modeloId") === "MV", "aplicar migra so a linha com modelo novo e e idempotente (segunda vez nao faz nada)");
  roda("STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  // ---- migracao com os dados reais (15 linhas) e os 3 checklists novos
  const fx = JSON.parse(require("fs").readFileSync("C:/Users/luiza/AppData/Local/Temp/claude/novos/fixture_migracao.json", "utf8"));
  const planoReal = roda("chkMigPlano(chkMigTabela(" + J(fx.perg) + "), chkMigTabela(" + J(fx.mot) + "))");
  const modelosReal = {};
  Object.keys(fx.modelos).forEach(tk=>{ const r = roda("chkModeloXLSXLinhasParaSecoes(" + J(fx.modelos[tk]) + ")"); modelosReal[tk] = { id:"MN_" + tk, nome:"Novo " + tk, tipoLinha:tk, secoes:r.secoes }; });
  T(Object.keys(planoReal).length === 3 && Object.keys(modelosReal).every(tk => modelosReal[tk].secoes.length > 0), "plano e os 3 modelos novos lidos: " + J(Object.keys(planoReal)) + " " + J(Object.keys(modelosReal).map(tk => modelosReal[tk].secoes.length)));
  Object.keys(modelosReal).forEach(tk=>{ T(roda("chkMigAcharModeloNovo([" + J(modelosReal[tk]) + "], " + J(planoReal[tk]) + ")") !== null, "modelo novo " + tk + " reconhecido pelo De-Para"); });
  const linhasReal = JSON.parse(JSON.stringify(fx.linhas));
  roda("STATE.checklists.projetos = [{ id:'PR', empresa:'Real', setores:[{ id:'SR', nome:'S', linhas:" + J(linhasReal) + " }] }];");
  const antesReal = J(linhasReal);
  const simuReal = roda("chkMigracaoSimular(STATE, " + J(planoReal) + ", " + J(modelosReal) + ")");
  T(simuReal.length === 15 && simuReal.every(s => s.estado === "ok"), "as 15 linhas reais tem modelo novo: " + J(simuReal.map(s => s.estado)));
  T(J(roda("STATE.checklists.projetos[0].setores[0].linhas")) === antesReal, "simulacao nao altera nenhuma linha real");
  let tot = { fotosAntes:0, fotosNoItem:0, fotosNaSecao:0, fotosSoHistorico:0, motivosAntes:0, motivosMigrados:0, motivosComoObservacao:0, motivosSoHistorico:0 };
  simuReal.forEach(s=>{
    const r = s.rel;
    T(r.fotosAntes === r.fotosNoItem + r.fotosNaSecao + r.fotosSoHistorico, "fotos fecham na linha " + s.nome + ": " + J(r));
    T(r.motivosAntes === r.motivosMigrados + r.motivosComoObservacao + r.motivosSoHistorico, "motivos fecham na linha " + s.nome + ": " + J(r));
    Object.keys(tot).forEach(k=>{ tot[k] += (r[k] || 0); });
  });
  const aplicadas = roda("chkMigracaoAplicar(STATE, " + J(planoReal) + ", " + J(modelosReal) + ")");
  const linhasMig = roda("STATE.checklists.projetos[0].setores[0].linhas");
  T(aplicadas === 15 && linhasMig.every(l => l.migracao && l.versaoAnterior && l.modeloId === "MN_" + l.tipoLinha), "aplicadas as 15 e todas guardam a versao anterior");
  linhasMig.forEach((l, i)=>{
    const o = linhasReal[i];
    T(J(l.versaoAnterior.itens) === J(o.itens) && J(l.versaoAnterior.modeloSnapshot) === J(o.modeloSnapshot), "versaoAnterior identica ao original (linha " + o.nome + ")");
    const fotosOrig = o.itens.reduce((a, it)=> a + (it.fotos || []).length, 0);
    const fotosNova = l.itens.reduce((a, it)=> a + (it.fotos || []).length, 0) + Object.keys(l.fotosSecao || {}).reduce((a, k)=> a + l.fotosSecao[k].length, 0);
    T(fotosNova <= fotosOrig && fotosNova + l.migracao.fotosSoHistorico === fotosOrig || fotosNova === fotosOrig - (l.migracao.fotosSoHistorico || 0), "nenhuma foto some sem ir para o historico (linha " + o.nome + "): " + fotosOrig + " -> " + fotosNova);
  });
  T(roda("chkMigracaoAplicar(STATE, " + J(planoReal) + ", " + J(modelosReal) + ")") === 0, "segunda aplicacao nao faz nada");
  console.log("MIGRACAO REAL (15 linhas): " + J(tot) + " revisar=" + simuReal.reduce((a, s)=> a + s.rel.revisar.length, 0) + " fundidasAtende=" + simuReal.reduce((a, s)=> a + s.rel.fundidasAtende.length, 0));
  roda("STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  // ---- migracao automatica (dados embutidos no codigo)
  const modelosOrig = J(roda("STATE.checklists.modelos"));
  const emb1 = roda("chkMigModelosEmbutidos()"), emb2 = roda("chkMigModelosEmbutidos()");
  const semHora = (o)=> J(Object.keys(o).map(k => Object.assign({}, o[k], { criadoEm:0, atualizadoEm:0 })));
  T(Object.keys(emb1).sort().join() === "horizontal_flexivel,horizontal_rigida,vertical" && semHora(emb1) === semHora(emb2) && emb1.horizontal_rigida.id === "mg_horizontal_rigida" && emb1.vertical.secoes[0].id === "mg_vertical_s0", "modelos embutidos: 3 tipos, ids fixos e resultado igual a cada chamada");
  T(emb1.horizontal_rigida.secoes.length === modelosReal.horizontal_rigida.secoes.length && emb1.vertical.secoes.length === modelosReal.vertical.secoes.length && emb1.horizontal_flexivel.secoes.length === modelosReal.horizontal_flexivel.secoes.length, "os modelos embutidos tem as mesmas secoes das planilhas novas");
  T(J(roda("chkMigPlanoEmbutido()").horizontal_rigida) === J(planoReal.horizontal_rigida), "o De-Para embutido da rigida e o mesmo lido da planilha");
  roda("STATE.checklists.modelos = []; delete STATE.checklists.migracao2026; STATE.checklists.projetos = [{ id:'PA', empresa:'Real', setores:[{ id:'SA', nome:'S', linhas:" + J(linhasReal.concat([Object.assign(JSON.parse(J(linhasReal[0])), { id:'LVERT', tipoLinha:'vertical' })])) + " }] }];");
  T(roda("chkMigAutoPendente(STATE)") === true, "pendente antes de migrar");
  const aa = roda("chkMigAutoAplicar(STATE)");
  const linhasAuto = roda("STATE.checklists.projetos[0].setores[0].linhas");
  T(aa.criados === 3 && aa.linhas === 15 && roda("STATE.checklists.modelos.length") === 3 && roda("STATE.checklists.migracao2026") && linhasAuto.filter(l => l.migracao).length === 15 && !linhasAuto.find(l => l.id === 'LVERT').migracao, "aplicacao automatica: 3 modelos, 15 linhas rigidas migradas, a vertical (sem plano) intacta: " + J(aa));
  T(linhasAuto.filter(l => l.migracao).every(l => l.modeloId === "mg_horizontal_rigida") && linhasAuto.filter(l => l.migracao).reduce((a, l) => a + Object.keys(l.fotosSecao).reduce((b, k) => b + l.fotosSecao[k].length, 0), 0) === 90, "todas apontam para o modelo novo e as 90 fotos da secao estao la");
  T(roda("chkMigAutoPendente(STATE)") === false, "depois de migrar nao ha mais nada pendente");
  const ab = roda("chkMigAutoAplicar(STATE)");
  T(ab.criados === 0 && ab.linhas === 0 && roda("STATE.checklists.modelos.length") === 3, "rodar de novo nao cria modelo nem migra de novo");
  roda("STATE.checklists.modelos = STATE.checklists.modelos.filter(m => m.tipoLinha !== 'vertical');");
  T(roda("chkMigAutoAplicar(STATE).criados") === 0 && roda("STATE.checklists.modelos.length") === 2, "modelo novo apagado depois pelo usuario nao e recriado");
  roda("STATE.checklists.projetos[0].setores[0].linhas.push(" + J(Object.assign(JSON.parse(J(linhasReal[0])), { id:'LNOVA' })) + ");");
  T(roda("chkMigAutoPendente(STATE)") === true && roda("chkMigAutoAplicar(STATE).linhas") === 1, "linha rigida antiga que chegar depois (de outro aparelho) tambem e migrada");
  roda("STATE.checklists.modelos = " + modelosOrig + "; delete STATE.checklists.migracao2026; STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  // ---- fotos da secao tambem na tela de Finalizar (linha finalizada nao abre o preenchimento)
  const lfr = Object.assign(JSON.parse(linhaCorpo([itn("a", "Item A")], [exe("a", "atende", 0)])), { fotosSecao: { s1: [{ foto:"data:image/jpeg;base64,FR1", tags:[], motivo:"" }, { foto:"data:image/jpeg;base64,FR2", tags:[], motivo:"" }] } });
  const hfr = roda("chkFotosSecaoResumoHtml(" + J(lfr) + ")");
  T(hfr.includes("Fotos da seção") && hfr.includes("2 fotos da seção") && (hfr.match(/data-imgref/g) || []).length === 2, "tela de Finalizar lista as fotos da secao: " + hfr.slice(0, 160));
  T(roda("chkFotosSecaoResumoHtml(" + J(Object.assign({}, lfr, { fotosSecao:{} })) + ")") === "", "sem fotos da secao, nada aparece na tela de Finalizar");
  // ---- "Nao atende" sem motivo vira pendencia (sem resposta); pendencias evidentes nos cartoes
  { const modeloP = { id:"MP", nome:"P", tipoLinha:"horizontal_rigida", secoes:[ { id:"sp", titulo:"Viga / Trilho", contexto:"", itens:[
      { id:"p1", descricao:"N2 viga?", motivosPadrao:[{ motivo:"n viga deformada", texto:"t", acao:"a" }] },
      { id:"p2", descricao:"N3 sem motivos?", motivosPadrao:[] } ] } ] };
    const planoP = { perguntas:{ "Q3 viga integra?":{ relacao:"Igual", nova:"N2 viga?", secaoAntiga:"Viga / Trilho", secaoNova:"Viga / Trilho" }, "Q9 livre?":{ relacao:"Igual", nova:"N3 sem motivos?", secaoAntiga:"Viga / Trilho", secaoNova:"Viga / Trilho" } }, motivos:{}, novas:[] };
    const mkP = (status)=> ({ id:"LP", nome:"LP", status, dataFinalizacao: status === "finalizado" ? "2026-10-07" : null, tipoLinha:"horizontal_rigida", modeloId:"MV", modeloNome:"v1", secoesNA:[], laudo:{}, descricao:"", conclusaoTexto:"", fotoAmpla:"", criadoEm:1,
      modeloSnapshot:[ { id:"o2", titulo:"Viga / Trilho", itens:[{ id:"q3", descricao:"Q3 viga integra?" }, { id:"q9", descricao:"Q9 livre?" }] } ],
      itens:[ { itemId:"q3", conforme:"naoAtende", motivosSelecionados:[], observacao:"obs viga", fotos:[ { foto:"data:image/jpeg;base64,PD1", tags:[], motivo:"" } ] },
              { itemId:"q9", conforme:"naoAtende", motivosSelecionados:[], observacao:"", fotos:[] } ] });
    const a = (l)=> J(l) + ", " + J(modeloP) + ", " + J(planoP) + ", 'horizontal_rigida'";
    const pf = roda("chkMigrarLinha(" + a(mkP("finalizado")) + ")"), pe = roda("chkMigrarLinha(" + a(mkP("em_andamento")) + ")");
    const x1 = pf.linha.itens.find(i => i.itemId === "p1"), x2 = pf.linha.itens.find(i => i.itemId === "p2");
    T(x1.conforme === null && x1.observacao === "obs viga" && x1.fotos.length === 1 && pf.rel.zeradas.length === 1, "Nao atende sem motivo marcado vira pendencia, mantendo observacao e foto: " + J(x1));
    T(x2.conforme === "naoAtende", "Nao atende em item que nao tem motivos para escolher continua Nao atende");
    T(pf.linha.status === "em_andamento" && pf.linha.dataFinalizacao === null && pf.linha.migracao.finalizadaEm === "2026-10-07" && pe.linha.status === "em_andamento", "linha finalizada que ganha pendencia e reaberta (a data de finalizacao antiga fica em migracao)");
    // linhas ja migradas antes da regra
    const jaMig = JSON.parse(J(pe.linha)); delete jaMig.migracao.pendencias; jaMig.itens[0].conforme = "naoAtende"; jaMig.itens[0].motivosSelecionados = []; jaMig.status = "finalizado"; jaMig.dataFinalizacao = "2026-10-07";
    roda("STATE.checklists.migracao2026 = 'x'; STATE.checklists.projetos = [{ id:'PP', empresa:'E', setores:[{ id:'SP', nome:'S', linhas:[ " + J(jaMig) + " ] }] }];");
    T(roda("chkMigAutoPendente(STATE)") === true, "linha migrada sem a marca de pendencias conta como pendente");
    const rp = roda("chkMigPendenciasAplicar(STATE)");
    const lp = roda("STATE.checklists.projetos[0].setores[0].linhas[0]");
    T(rp.itens === 1 && lp.itens[0].conforme === null && lp.status === "em_andamento" && lp.migracao.finalizadaEm === "2026-10-07" && lp.migracao.pendencias.itens === 1, "passagem das ja migradas: zera o item e reabre a linha: " + J(rp));
    T(roda("chkMigPendenciasAplicar(STATE).itens") === 0 && roda("chkMigAutoPendente(STATE)") === false, "so uma vez por linha");
    T(roda("chkPendenciasLinhas(STATE.checklists.projetos[0].setores[0].linhas)") === 1, "pendencias do setor: soma dos itens sem resposta das linhas comecadas");
    T(roda("chkPendenciasLinhas([{ status:'em_andamento', itens:[{ conforme:null }, { conforme:null }] }])") === 0, "linha sem nenhuma resposta (nao iniciada) nao entra na soma de pendencias");
    roda("STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  }
  // dados reais: nenhum "Nao atende" sem motivo sobra (nos itens que tem motivos para escolher)
  { roda("STATE.checklists.modelos = []; delete STATE.checklists.migracao2026; STATE.checklists.projetos = [{ id:'PRZ', empresa:'Real', setores:[{ id:'SRZ', nome:'S', linhas:" + J(linhasReal) + " }] }];");
    const rz = roda("chkMigAutoAplicar(STATE)");
    const lz = roda("STATE.checklists.projetos[0].setores[0].linhas");
    const comPend = lz.filter(l => l.migracao.pendencias.itens > 0).length, reabertas = lz.filter(l => l.migracao.finalizadaEm !== undefined).length;
    const sobra = lz.reduce((a, l) => a + l.itens.filter(it => { const d = []; l.modeloSnapshot.forEach(s => s.itens.forEach(x => { if(x.id === it.itemId) d.push(x); })); return it.conforme === "naoAtende" && !(it.motivosSelecionados || []).length && d[0] && d[0].motivosPadrao.length; }).length, 0);
    T(rz.linhas === 15 && sobra === 0 && rz.zeradas === lz.reduce((a, l) => a + l.migracao.pendencias.itens, 0) && lz.filter(l => l.status === "finalizado").every(l => l.migracao.pendencias.itens === 0), "dados reais: 15 migradas, nenhum Nao atende sem motivo sobrou, linha finalizada so se mantem se nao ganhou pendencia");
    console.log("PENDENCIAS REAIS: itens=" + rz.zeradas + " linhas com pendencia=" + comPend + " finalizadas reabertas=" + reabertas + " sem resposta por linha=" + lz.map(l => l.nome.slice(0, 14) + ":" + l.itens.filter(i => i.conforme === null).length).join(", "));
    roda("STATE.checklists.modelos = " + modelosOrig + "; delete STATE.checklists.migracao2026; STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  }
  // ---- cartao: fotos da secao contadas a parte das fotos de conformidade dos itens
  const rcs = roda("chkResumoCardLinha(Object.assign(" + linhaCard + ", { fotosSecao: { s1:[{ foto:'data:image/jpeg;base64,CS1' }, { foto:'data:image/jpeg;base64,CS2' }], s2:[{ foto:'data:image/jpeg;base64,CS3' }] } }))");
  T(rcs.fotosSecao === 2 && rcs.fotosOk === 1 && rcs.fotosNc === 2, "cartao: 2 fotos da secao (a secao que nao se aplica fica de fora) separadas das de conformidade dos itens: " + J(rcs));
  // ---- mover linha de vida entre setores
  { const lnA = (id, n)=> ({ id, nome:n, status:"em_andamento", itens:[], modeloSnapshot:[], secoesNA:[], criadoEm: id === "LMV1" ? 1 : 2 });
    roda("STATE.checklists.projetos = [{ id:'PMV', empresa:'Emp', setores:[ { id:'S1', nome:'Setor 1', linhas:[ " + J(lnA("LMV1", "Linha 1")) + ", " + J(lnA("LMV2", "Linha 2")) + " ] }, { id:'S2', nome:'Setor 2', linhas:[] } ] }, { id:'PMV2', empresa:'Outra', setores:[ { id:'S3', nome:'Setor 3', linhas:[] } ] }];");
    const sigAntes = roda("chkSyncVisto(1, chkSyncVista(chkSyncLocalDe('l:LMV1'))) ");
    T(roda("chkMoverLinha(STATE, 'LMV1', 'S1')") === null && roda("chkMoverLinha(STATE, 'LMV1', 'NAOEXISTE')") === null && roda("chkMoverLinha(STATE, 'NAOEXISTE', 'S2')") === null, "mover para o mesmo setor, setor ou linha inexistente: nada acontece");
    const mv = roda("chkMoverLinha(STATE, 'LMV1', 'S2')");
    const setores = roda("STATE.checklists.projetos[0].setores");
    T(mv.para === "Setor 2" && setores[0].linhas.map(l => l.id).join() === "LMV2" && setores[1].linhas.map(l => l.id).join() === "LMV1" && setores[1].linhas[0].setorId === "S2" && setores[1].linhas[0].projetoId === "PMV", "linha sai do setor de origem e entra no de destino, sem duplicar: " + J(setores.map(s => s.linhas.map(l => l.id))));
    T(roda("chkSyncLocais().filter(e => e.chave === 'l:LMV1').length") === 1 && roda("chkSyncLocalDe('l:LMV1').setorId") === "S2", "a sincronizacao enxerga a linha uma vez, no setor novo");
    T(roda("chkSyncMudou(chkSyncLocalDe('l:LMV1'), " + J(sigAntes) + ")") === true, "mover conta como mudanca da linha (vai para a nuvem)");
    roda("chkMoverLinha(STATE, 'LMV1', 'S3')");
    T(roda("STATE.checklists.projetos[1].setores[0].linhas[0].projetoId") === "PMV2" && roda("STATE.checklists.projetos[0].setores.every(s => s.linhas.every(l => l.id !== 'LMV1'))"), "tambem pode mover para um setor de outro projeto");
    // outro aparelho: a linha chega da nuvem com o setor novo; a copia local no setor antigo some
    roda("chkMoverLinha(STATE, 'LMV1', 'S1')");
    const objVelho = roda("JSON.parse(JSON.stringify(chkSyncLocalDe('l:LMV1').obj))");
    roda("chkMoverLinha(STATE, 'LMV1', 'S2')");
    roda("chkMoverLinha(STATE, 'LMV1', 'S1')");   // aparelho "local" deixa a linha em S1
    const objNuvem = Object.assign({}, objVelho, { setorId:"S2", projetoId:"PMV", nome:"Linha 1 editada" });
    T(roda("chkSyncAplicar(" + J({ obj: objNuvem, projetoId:"PMV", setorId:"S2" }) + ", 'l', 'LMV1', false)") === "ok", "aplicar da nuvem ok");
    const sx = roda("STATE.checklists.projetos[0].setores");
    T(sx[0].linhas.every(l => l.id !== "LMV1") && sx[1].linhas.filter(l => l.id === "LMV1").length === 1 && sx[1].linhas.find(l => l.id === "LMV1").nome === "Linha 1 editada", "linha movida em outro aparelho: sai do setor antigo e fica uma so no novo: " + J(sx.map(s => s.linhas.map(l => l.id))));
    roda("STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  }
  // ---- gerar copia da linha de vida
  { const orig = { id:"LCP1", nome:"Linha A", status:"finalizado", dataFinalizacao:"2026-10-07", secoesNA:[], modeloSnapshot:[], criadoEm:5, fotoAmpla:"data:image/jpeg;base64,CPAMPLA",
      itens:[ { itemId:"x1", conforme:"naoAtende", motivosSelecionados:["M"], observacao:"obs", fotos:[ { foto:"data:image/jpeg;base64,CP1", tags:[], motivo:"M" } ] } ], fotosSecao:{ s1:[ { foto:"data:image/jpeg;base64,CPS", tags:[], motivo:"" } ] } };
    roda("STATE.checklists.projetos = [{ id:'PCP', empresa:'Emp', setores:[ { id:'SC1', nome:'Setor 1', linhas:[ " + J(orig) + " ] }, { id:'SC2', nome:'Setor 2', linhas:[] } ] }];");
    const antes = J(roda("STATE.checklists.projetos[0].setores[0].linhas[0]"));
    const c1 = roda("chkCopiarLinha(STATE, 'LCP1', 'SC1')"), c2 = roda("chkCopiarLinha(STATE, 'LCP1', 'SC1')"), c3 = roda("chkCopiarLinha(STATE, 'LCP1', 'SC2')");
    const s = roda("STATE.checklists.projetos[0].setores");
    T(c1.nome === "Linha A (cópia)" && c2.nome === "Linha A (cópia 2)" && c3.nome === "Linha A (cópia)" && s[0].linhas.length === 3 && s[1].linhas.length === 1, "copias nomeadas Linha A (copia), (copia 2), e no outro setor volta a (copia): " + J([c1.nome, c2.nome, c3.nome]));
    const cp = s[0].linhas.find(l => l.id === c1.id), og = s[0].linhas.find(l => l.id === "LCP1");
    T(cp.id !== "LCP1" && cp.setorId === "SC1" && cp.itens[0].observacao === "obs" && cp.itens[0].motivosSelecionados[0] === "M" && cp.itens[0].fotos.length === 1 && cp.fotosSecao.s1.length === 1 && cp.status === "finalizado", "a copia leva respostas, motivo, observacao e fotos");
    T(J(og) === antes, "a linha original nao muda");
    T(!/\(versão de/.test(cp.nome) && roda("chkSyncLocais().filter(e => e.tipo === 'l').length") === 4, "o nome da copia nao usa o rotulo '(versao de ...)' (que a sincronizacao junta ao original) e as 4 linhas existem");
    T(roda("chkCopiarLinha(STATE, 'NAO', 'SC1')") === null && roda("chkCopiarLinha(STATE, 'LCP1', 'NAO')") === null, "linha ou setor inexistente: sem copia");
    T(roda("chkCopiarLinha(STATE, '" + c1.id + "', 'SC1')").nome === "Linha A (cópia 3)", "copiar uma copia nao empilha '(copia) (copia)'");
    roda("STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  }
  // ---- copias "(versao de ...)" que discordam do original saem da lista e ficam guardadas dentro dele
  { const mkA = (id, nome, itens, extra)=> Object.assign({ id, nome, status:"em_andamento", criadoEm:100, modeloId:"MX", secoesNA:[], modeloSnapshot:[], itens: itens.map((c, k) => ({ itemId:"i" + k, conforme:c, motivosSelecionados:[], observacao:"", fotos:[] })) }, extra || {});
    roda("STATE.checklists.projetos = [{ id:'PEC', empresa:'E', setores:[{ id:'SEC', nome:'S', linhas:[ " + J(mkA("LO1", "Armazem", ["atende", "naoAtende", null])) + ", " + J(mkA("LC1", "Armazem (versão de 07/10 14:56)", ["atende", "atende", "na"])) + ", " + J(mkA("LC2", "Sem original (versão de 07/10 15:09)", ["atende"], { criadoEm:200 })) + " ] }] }];");
    T(roda("chkEsconderCopiasLinhas(STATE, true).escondidas") === 1 && roda("STATE.checklists.projetos[0].setores[0].linhas.length") === 3, "so contar: nao mexe em nada");
    const re = roda("chkEsconderCopiasLinhas(STATE)");
    const ls = roda("STATE.checklists.projetos[0].setores[0].linhas");
    T(re.escondidas === 1 && re.semOriginal === 1 && ls.length === 2 && ls.map(l => l.id).sort().join() === "LC2,LO1", "a copia com original sai da lista; a sem original fica: " + J([re, ls.map(l => l.id)]));
    const og = ls.find(l => l.id === "LO1");
    T(og.versoesAlternativas.length === 1 && og.versoesAlternativas[0].de === "copia" && og.versoesAlternativas[0].linha.itens[1].conforme === "atende" && og.nome === "Armazem" && og.itens[1].conforme === "naoAtende", "o original continua como estava e leva a copia inteira guardada");
    T(roda("chkEsconderCopiasLinhas(STATE).escondidas") === 0, "rodar de novo nao faz nada");
    // helpers
    const e1 = roda("chkAltEntrada(STATE.checklists.projetos[0].setores[0].linhas[0], 'nuvem')"), e2 = Object.assign({}, e1, { id:"outro" });
    T(roda("chkAltUnir(" + J([e1]) + ", " + J([e2]) + ")").length === 1 && roda("chkAltUnir(null, undefined)").length === 0, "a mesma versao (mesmo conteudo) nunca entra duas vezes");
    T(roda("chkAltAdicionar(STATE.checklists.projetos[0].setores[0].linhas[0], chkAltEntrada(STATE.checklists.projetos[0].setores[0].linhas[0], 'nuvem'))") === false, "versao igual ao conteudo atual da linha nao e guardada");
    const lO = roda("STATE.checklists.projetos[0].setores[0].linhas.find(l => l.id === 'LO1')");
    const hm = roda("chkAltModalHtml(" + J(lO) + ")");
    T(hm.includes("Versões guardadas") && hm.includes("Usar esta versão") && hm.includes("Gerar cópia") && hm.includes("Cópia antiga da lista") && hm.includes("3/3 respondidos"), "janela das versoes guardadas: origem, resumo e as tres acoes");
    const cv = roda("chkAltCopiarVisivel(STATE, 'LO1', " + J(lO.versoesAlternativas[0].id) + ")");
    T(cv.nome === "Armazem (cópia)" && roda("STATE.checklists.projetos[0].setores[0].linhas.length") === 3 && !roda("STATE.checklists.projetos[0].setores[0].linhas.find(l => l.id === " + J(cv.id) + ").versoesAlternativas") && roda("STATE.checklists.projetos[0].setores[0].linhas.find(l => l.id === 'LO1').versoesAlternativas.length") === 1, "gerar copia visivel a partir da guardada: linha nova sem guardadas, a guardada continua guardada");
    roda("STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  }
  // ---- barra de abas, linhas nao enviadas e puxar a nuvem antes de abrir
  T(roda("chkTabsRolagem(0, 300, 20, 100)") === 0 && roda("chkTabsRolagem(0, 300, 450, 120)") === 282 && roda("chkTabsRolagem(500, 300, 100, 80)") === 88 && roda("chkTabsRolagem(40, 300, 100, 80)") === 40, "barra de abas: nao mexe se a aba ativa esta visivel; rola para a direita ou para a esquerda so o necessario");
  { const lnP = (id, obs)=> ({ id, nome:id, status:"em_andamento", itens:[ { itemId:"a", conforme:"atende", motivosSelecionados:[], observacao:obs, fotos:[] } ], modeloSnapshot:[], secoesNA:[], criadoEm:1, atualizadoEm:5 });
    const l1 = lnP("P1", ""), l2 = lnP("P2", "x");
    const vistosP = { "l:P1": roda("chkSyncVisto(1, chkSyncVista({ tipo:'l', obj:" + J(l1) + " }))") };
    const pn = roda("Array.from(chkLinhasPendentesEnvio(" + J([l1, l2]) + ", " + J(vistosP) + "))");
    T(J(pn) === J(["P2"]), "linha sem registro de envio conta como nao enviada; a igual ao que subiu nao: " + J(pn));
    const l1b = Object.assign({}, l1, { itens:[ Object.assign({}, l1.itens[0], { observacao:"editei" }) ] });
    T(J(roda("Array.from(chkLinhasPendentesEnvio(" + J([l1b]) + ", " + J(vistosP) + "))")) === J(["P1"]), "editar depois de subir volta a contar como nao enviada");
    T(roda("chkLinhasPendentesEnvio([Object.assign(" + J(l1) + ", { atualizadoEm: 999 })], " + J(vistosP) + ").size") === 0, "so o carimbo mudar nao conta como alteracao");
  }
  T(roda("chkDevePuxarAntesDeAbrir({ u:1 }, true, false, 30000)") === true && roda("chkDevePuxarAntesDeAbrir(null, true, false, 30000)") === false && roda("chkDevePuxarAntesDeAbrir({ u:1 }, false, false, 30000)") === false && roda("chkDevePuxarAntesDeAbrir({ u:1 }, true, true, 30000)") === false && roda("chkDevePuxarAntesDeAbrir({ u:1 }, true, false, 5000)") === false, "puxar a nuvem antes de abrir: so com conta, rede liberada, sem sincronizacao em curso e se faz mais de 20 s da ultima");
  // ---- navegacao do modulo Linhas de vida: abre nos projetos, atalhos de configuracoes e modulos
  { const tela0 = roda("STATE.ui.screen");
    const srcHtml = require("fs").readFileSync(process.argv[2], "utf8");
    T(srcHtml.includes('else if(m==="checklist") go("checklist-projetos", { chkSetorId:null, chkLinhaId:null });') && !srcHtml.includes('else if(m==="checklist") go("checklist-modelos")'), "entrar no modulo abre direto os projetos (e nao mais os modelos)");
    T(srcHtml.includes('<div style="font-weight:800;font-size:16px;margin-bottom:4px">Linhas de vida</div>') && !srcHtml.includes('margin-bottom:4px">Checklist</div>'), "o cartao do modulo na escolha de modulos se chama Linhas de vida");
    T(srcHtml.includes('else if(STATE.modulo==="checklist") go("checklist-config-backup");'), "o aviso de backup nao configurado leva ao Backup do modulo Linhas de vida");
    const nav = roda("STATE.ui.screen = 'checklist-projetos'; bottomNavChk()");
    T(nav.indexOf("Projetos") < nav.indexOf("Modelos") && nav.indexOf("Modelos") < nav.indexOf("Configurações") && nav.indexOf("Configurações") < nav.indexOf("Módulos") && nav.includes("App.go('checklist-config')") && nav.includes("App.trocarModulo()"), "barra de baixo: Projetos, Modelos, Configuracoes e Modulos, nessa ordem");
    T(/bottomnav-item active[^>]*>[^<]*<svg[\s\S]*?<span>Projetos/.test(nav) || nav.indexOf("active") < nav.indexOf("Modelos"), "Projetos fica ativo na tela de projetos");
    const cfg = roda("screenChkConfig()");
    T(cfg.includes("App.go('checklist-config-backup')") && cfg.includes("App.go('checklist-config-empresa')") && cfg.includes("App.trocarModulo()") && cfg.includes("Alto contraste") && cfg.includes("Versão "), "tela de configuracoes do modulo: backup, empresa e responsaveis, trocar de modulo e aparencia");
    const topo = (s)=> roda("STATE.ui.screen = " + J(s) + "; topBarChk()");
    T(topo("checklist-projetos").includes("App.go('checklist-config')") && topo("checklist-projetos").includes("App.trocarModulo()") && topo("checklist-projetos").includes("Linhas de vida") && !topo("checklist-projetos").includes(">Checklist<"), "barra de cima dos projetos: atalho de configuracoes e de modulos, com o nome Linhas de vida");
    T(topo("checklist-config").includes("App.go('checklist-projetos')") && topo("checklist-config-backup").includes("App.go('checklist-config')") && topo("checklist-config-empresa").includes("App.go('checklist-config')"), "voltar: configuracoes -> projetos; backup e empresa -> configuracoes");
    roda("STATE.ui.screen = " + J(tela0) + ";");
  }
  // ---- modo campo/escritorio, faixa offline, conferir antes do laudo, busca global e duplicar
  { const conf = (n, d)=> ({ itemId:"i" + n, conforme:d.c === undefined ? "atende" : d.c, motivosSelecionados: d.m || [], observacao: d.o || "", fotos: d.f || [] });
    const mkL = (id, nome, status, confs, extra)=> Object.assign({ id, nome, status, dataFinalizacao: status === "finalizado" ? "2026-10-07" : null, tipoLinha:"vertical", modeloId:"MN", modeloNome:"Mod", secoesNA:[], laudo:{}, descricao:"d", conclusaoTexto:"", fotoAmpla:"data:image/jpeg;base64,AMPLA" + id, criadoEm: 10, atualizadoEm: 10,
      modeloSnapshot:[ { id:"sec1", titulo:"Viga e trilho", itens: confs.map((c, k) => ({ id:"i" + k, descricao:"Pergunta " + k + (k === 0 ? " da viga" : ""), normativo:"", motivosPadrao:[{ motivo:"M1", texto:"texto M1", acao:"acao M1" }] })) } ],
      itens: confs.map((c, k) => conf(k, c)) }, extra || {});
    const estP = (linhasA, linhasB)=> "STATE.checklists.projetos = [{ id:'PN', empresa:'Vylor', responsavel:'Resp', art:'', numeroDocumento:'', dataInspecao:'2026-10-01', validadeInspecao:'2027-10-01', data:'2026-10-01', conclusaoGeral:'', setores:[ { id:'SN1', nome:'Armazem 1', descricao:'', criadoEm:1, atualizadoEm:1, linhas:" + J(linhasA) + " }, { id:'SN2', nome:'Secador', descricao:'', criadoEm:2, atualizadoEm:2, linhas:" + J(linhasB) + " } ] }, { id:'PN2', empresa:'Outra empresa', responsavel:'', setores:[ { id:'SN3', nome:'Setor X', linhas:[] } ] } ];";
    const lOk = mkL("LK1", "Linha completa", "finalizado", [{}, {}]);
    const lPend = mkL("LK2", "Linha com pendencia", "em_andamento", [{}, { c:null }]);
    const lNc = mkL("LK3", "Linha com NC", "em_andamento", [{}, { c:"naoAtende", o:"cabo desfiado na viga" }]);
    roda(estP([lOk, lPend], [lNc]));
    // ---- modo visual
    T(roda("chkModoVisual()") === "escritorio" && roda("chkEhCampo()") === false, "fora de celular: modo escritorio (sempre automatico)");
    const navE = roda("STATE.ui.screen = 'checklist-projetos'; bottomNavChk()");
    T(navE.includes("Modelos"), "modo escritorio: barra de baixo com Modelos");
    roda("globalThis.navigator = { userAgent:'Mozilla/5.0 (iPhone)', onLine:true }");
    const navC = roda("bottomNavChk()");
    T(roda("chkModoVisual()") === "campo" && !navC.includes("Modelos") && navC.includes("Projetos") && navC.includes("Configurações") && navC.includes("Módulos"), "modo campo: sem Modelos na barra de baixo");
    roda("STATE.ui.chkProjetoId = 'PN'; STATE.ui.chkSetorId = 'SN1'");
    const linhasC = roda("screenChkLinhas()");
    T(!linhasC.includes("chk-linha-laudo") && !roda("chkAcoesCartao('projeto', 'PN')").includes("chkLaudosProjeto") && !roda("chkAcoesCartao('setor', 'SN1')").includes("chkLaudosSetor") && roda("chkAcoesCartao('setor', 'SN1')").includes("chkDuplicarAbrir('setor','SN1')"), "modo campo: sem botoes de laudo nos cartoes; duplicar setor continua");
    T(!roda("screenChkSetores()").includes("Conferir antes do laudo"), "modo campo: sem o painel de conferir antes do laudo");
    roda("globalThis.navigator = { userAgent:'Mozilla/5.0 (Windows NT 10.0)', onLine:true }");
    T(roda("screenChkLinhas()").includes("chk-linha-laudo") && roda("screenChkSetores()").includes("Conferir antes do laudo") && roda("chkAcoesCartao('projeto', 'PN')").includes("chkLaudosProjeto"), "modo escritorio: laudo e conferencia a mostra");
    T(roda("chkModoVisual()") === "escritorio", "computador = escritorio");
    roda("delete globalThis.navigator");
    // ---- faixa de situacao
    roda("globalThis.navigator = { onLine:false, userAgent:'x' }");
    T(roda("chkFaixaHtml()").includes("Sem internet") && roda("chkFaixaHtml()").includes("chk-faixa off"), "offline: faixa avisa que esta sem internet (mesmo sem conta)");
    roda("globalThis.navigator = { onLine:true, userAgent:'x' }");
    T(roda("chkFaixaHtml()") === '<div id="chkFaixa"></div>', "online sem conta do OneDrive: faixa vazia");
    roda("getOneDriveConta = function(){ return { email:'a@b.c' }; }; __chkPendCache.em = 0;");
    T(roda("chkFaixaHtml()").includes("chk-faixa pend") && roda("chkFaixaHtml()").includes("aguardando envio"), "online com conta e linhas por enviar: faixa mostra quantas aguardam");
    roda("globalThis.navigator = { onLine:false, userAgent:'x' }; __chkPendCache.em = 0;");
    T(/\d+ linhas? aguardando envio; sobe sozinho/.test(roda("chkFaixaHtml()")), "offline com pendencias: diz quantas linhas aguardam e que sobem sozinhas");
    roda("getOneDriveConta = function(){ return null; }; delete globalThis.navigator;");
    // ---- conferir antes do laudo
    const pr = roda("chkProntoParaLaudo(STATE.checklists.projetos[0])");
    T(pr.prontas === 1 && pr.comAjustes === 2 && pr.projeto.length >= 1 && pr.projeto.some(t => t.includes("ART")), "painel: 1 pronta, 2 com ajustes; dados do projeto em branco aparecem uma vez: " + J([pr.prontas, pr.comAjustes, pr.projeto]));
    const lp = pr.linhas.find(x => x.id === "LK2"), ln = pr.linhas.find(x => x.id === "LK3");
    T(lp.avisos.some(t => t.includes("sem resposta")) && ln.avisos.some(t => t.includes("sem motivo")) && pr.linhas.find(x => x.id === "LK1").pronta === true, "painel: pendencia e 'nao atende sem motivo' aparecem na linha certa; a completa fica pronta");
    T(!pr.linhas.some(x => x.avisos.some(t => t.startsWith("Dados do projeto em branco"))), "o aviso de dados do projeto nao se repete em cada linha");
    roda("STATE.ui.chkProjetoId = 'PN'");
    const ph = roda("screenChkPronto()");
    T(ph.includes("1 prontas") && ph.includes("2 com ajustes") && ph.includes("Corrigir na linha") && ph.includes("Linha com pendencia") && ph.includes("Gerar laudos em um PDF"), "tela do painel: contagens, corrigir na linha e gerar laudos");
    // ---- busca global
    const b = (t, f)=> roda("chkBuscarTudo(STATE, " + J(t) + ", " + J(f || "todos") + ")");
    T(b("").linhas.length === 0 && b("", "todos").itens.length === 0, "busca vazia nao lista nada");
    T(b("vylor").projetos.length === 1 && b("armazem").setores.length === 1 && b("completa").linhas.length === 1 && b("outra").projetos.length === 1, "busca acha projeto, setor e linha (sem acento e sem diferenciar maiuscula)");
    const bv = b("viga");
    T(bv.itens.length >= 3 && bv.itens.every(i => i.ref && i.linhaId && i.setorId && i.projetoId) && bv.itens.some(i => i.nome.includes("da viga")), "busca acha itens pela descricao: " + bv.itens.length);
    T(b("cabo desfiado").itens.length === 1 && b("cabo desfiado").itens[0].linhaId === "LK3", "busca acha o texto de observacao do item");
    T(b("viga", "nc").itens.length === 1 && b("viga", "nc").itens[0].status === "naoAtende", "filtro nao conformidade: so itens que nao atendem");
    T(b("", "pendencia").linhas.length === 1 && b("", "pendencia").linhas[0].id === "LK2", "filtro pendencia sem termo: lista as linhas com itens sem resposta");
    T(b("", "nc").linhas.length === 1 && b("", "nc").linhas[0].id === "LK3", "filtro nao conformidade sem termo: lista as linhas com nao atende");
    T(b("", "naoenviadas").linhas.length === 3, "filtro nao enviadas: todas, ja que nada foi enviado nos ensaios");
    const bh = roda("chkBuscaResultadosHtml(" + J(bv) + ", 'viga', 'todos')");
    T(bh.includes("Itens (") && bh.includes("App.chkBuscaIr('item'") && roda("chkBuscaResultadosHtml(" + J(b("zzzz")) + ", 'zzzz', 'todos')").includes("Nada encontrado"), "resultados: grupos clicaveis; 'Nada encontrado' quando nao ha");
    // ---- duplicar setor e projeto
    const orig = J(roda("STATE.checklists.projetos"));
    roda("STATE.checklists.projetos[0].setores[0].linhas[0].itens[0].fotos = [{ foto:'data:image/jpeg;base64,DUPF', tags:[], motivo:'' }]; STATE.checklists.projetos[0].setores[0].linhas[0].fotosSecao = { sec1:[{ foto:'data:image/jpeg;base64,DUPS' }] };");
    const antesDup = J(roda("STATE.checklists.projetos"));
    const d1 = roda("chkDuplicarSetor(STATE, 'SN1', false)");
    const ps = roda("STATE.checklists.projetos[0].setores");
    const nova = ps.find(s => s.id === d1.id), velha = ps.find(s => s.id === "SN1");
    T(d1.nome === "Armazem 1 (cópia)" && d1.linhas === 2 && ps.length === 3 && nova.linhas.every(l => l.status === "em_andamento" && l.itens.every(i => i.conforme === null && !i.fotos.length && !(i.observacao)) && !l.fotoAmpla && !l.fotosSecao && !l.migracao) && nova.linhas.every(l => !velha.linhas.some(o => o.id === l.id)), "duplicar setor so com a estrutura: linhas em branco, ids novos: " + J(d1));
    T(J(velha.linhas) === J(JSON.parse(antesDup)[0].setores[0].linhas) && nova.linhas[0].modeloSnapshot.length === 1 && nova.linhas[0].nome === "Linha completa", "o setor original nao muda e a copia mantem nome e modelo das linhas");
    const d2 = roda("chkDuplicarSetor(STATE, 'SN1', true)");
    const nova2 = roda("STATE.checklists.projetos[0].setores").find(s => s.id === d2.id);
    T(d2.nome === "Armazem 1 (cópia 2)" && nova2.linhas[0].itens[0].fotos.length === 1 && nova2.linhas[0].fotosSecao.sec1.length === 1 && nova2.linhas[0].fotoAmpla && nova2.linhas[0].status === "finalizado" && nova2.linhas[0].id !== "LK1", "duplicar setor com respostas: leva fotos, foto da secao, foto ampla e status; nome (copia 2)");
    const dp = roda("chkDuplicarProjeto(STATE, 'PN', false)");
    const projs = roda("STATE.checklists.projetos");
    const pc = projs.find(p => p.id === dp.id);
    T(dp.nome === "Vylor (cópia)" && dp.setores === 4 && pc.art === "" && pc.setores.length === 4 && pc.setores.every(s => !["SN1", "SN2"].includes(s.id)) && new Set(pc.setores.flatMap(s => s.linhas.map(l => l.id))).size === pc.setores.reduce((n, s) => n + s.linhas.length, 0) && pc.setores.flatMap(s => s.linhas).every(l => l.itens.every(i => i.conforme === null)), "duplicar projeto so com a estrutura: setores e linhas novos, em branco, sem repetir ids: " + J(dp));
    roda("STATE.checklists.projetos[0].art = 'ART-1'; STATE.checklists.projetos[0].numeroDocumento = 'DOC-9';");
    const dp2 = roda("chkDuplicarProjeto(STATE, 'PN', true)");
    const pc2 = roda("STATE.checklists.projetos").find(p => p.id === dp2.id);
    T(dp2.nome === "Vylor (cópia 2)" && pc2.art === "ART-1" && pc2.numeroDocumento === "DOC-9", "duplicar projeto com respostas leva ART e numero do documento");
    T(roda("chkDuplicarSetor(STATE, 'NAO', true)") === null && roda("chkDuplicarProjeto(STATE, 'NAO', true)") === null, "id inexistente: nada acontece");
    roda("STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  }
  // ---- fotos pendentes: ajudantes, faixa e aviso do laudo
  { const obj = { a:[{ foto:"idbfoto:abc-1", tags:[] }, { foto:"idbfoto:zzz", tags:[] }], fotoAmpla:"idbfoto:abc-1", t:"pendente: texto livre" };
    const n = roda("chkFotosParaPendentes(" + J(obj) + ", new Set(['abc-1']))");
    const o2 = roda("(function(){ const o = " + J(obj) + "; chkFotosParaPendentes(o, new Set(['abc-1'])); return o; })()");
    T(n === 1 && o2.a[0].foto === "pendente:abc-1" && o2.a[1].foto === "idbfoto:zzz" && o2.fotoAmpla === "idbfoto:abc-1" && o2.t === "pendente: texto livre", "so o campo 'foto' das entradas vira pendente; foto ampla e texto livre ficam como estao");
    T(J(Array.from(roda("chkFotosPendentesIds(" + J(o2) + ")"))) === J(["abc-1"]) && Array.from(roda("chkFotosRefsObrigatorias(" + J(obj) + ")")).join() === "abc-1", "ids pendentes e referencias obrigatorias (foto ampla)");
    const o3 = roda("(function(){ const o = " + J(o2) + "; chkFotosPendentesTrocar(o, new Map([['abc-1', 'data:image/jpeg;base64,XYZ']])); return o; })()");
    const o4 = roda("(function(){ const o = " + J(o2) + "; chkFotosPendentesTrocar(o, null); return o; })()");
    T(o3.a[0].foto === "data:image/jpeg;base64,XYZ" && o4.a[0].foto === "idbfoto:abc-1" && o4.t === "pendente: texto livre", "trocar pendente pela foto ou voltar para a referencia (para subir); texto livre intocado");
    roda("STATE.checklists.projetos = [{ id:'PFN', empresa:'E', setores:[{ id:'SFN', nome:'S', linhas:[ { id:'LFN', nome:'LFN', status:'em_andamento', secoesNA:[], laudo:{}, modeloSnapshot:[], fotoAmpla:'x', itens:[ { itemId:'a', conforme:'atende', motivosSelecionados:[], observacao:'', fotos:[ { foto:'pendente:abc-1', tags:[] }, { foto:'pendente:def-2', tags:[] } ] } ] } ] }] }];");
    roda("getOneDriveConta = function(){ return { email:'a@b.c' }; }; globalThis.navigator = { onLine:true, userAgent:'x' }; __chkPendCache.em = 0;");
    const fx = roda("chkFaixaHtml()");
    T(roda("chkFotosNuvemTotal()") === 2 && fx.includes("2 fotos ainda estão na nuvem") && fx.includes("App.chkBaixarFotosPendentes()"), "faixa mostra quantas fotos ainda estao na nuvem e o botao Baixar fotos: " + fx.slice(0, 200));
    const av = roda("lclAvisos(STATE.checklists.projetos[0].setores[0].linhas[0], STATE.checklists.projetos[0])");
    T(av.some(a => a.txt.includes("2 fotos ainda não foram baixadas") && a.acao === "App.chkBaixarFotosPendentes()"), "o laudo avisa antes de imprimir que ha fotos nao baixadas");
    const cartao = roda("STATE.ui.chkProjetoId = 'PFN'; STATE.ui.chkSetorId = 'SFN'; screenChkLinhas()");
    T(cartao.includes("2 fotos na nuvem: baixar"), "cartao da linha mostra 'N fotos na nuvem: baixar'");
    roda("getOneDriveConta = function(){ return null; }; delete globalThis.navigator; STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  }
  // ---- dono da linha (sem login): aviso ao abrir a linha de outro inspetor
  { const lD = (id, resp)=> ({ id, nome:id, status:"em_andamento", secoesNA:[], laudo:{}, modeloSnapshot:[], itens:[], responsavelId: resp, fotoAmpla:"x" });
    roda("STATE.checklists.inspetores = [{ id:'I1', nome:'Daniel', ativo:true }, { id:'I2', nome:'Luiz', ativo:true }]; STATE.checklists.projetos = [{ id:'PDN', empresa:'E', setores:[{ id:'SDN', nome:'S', linhas:[ " + J(lD("LD1", "I2")) + ", " + J(lD("LD2", "I1")) + ", " + J(lD("LD3", undefined)) + ", " + J(Object.assign(lD("LD4", "I2"), { status:"finalizado" })) + " ] }] }]; STATE.ui.chkProjetoId = 'PDN'; STATE.ui.chkSetorId = 'SDN'; STATE.ui.chkLinhaId = null;");
    T(roda("chkDonoDaLinhaOutro(STATE.checklists.projetos[0].setores[0].linhas[0])") === "", "sem 'quem sou eu' escolhido: nenhum aviso");
    roda("globalThis.localStorage = { _d:{ chkEuInspetor:'I1' }, getItem(k){ return this._d[k] || null; }, setItem(k, v){ this._d[k] = v; }, removeItem(k){ delete this._d[k]; } }");
    const dn = (n)=> roda("chkDonoDaLinhaOutro(STATE.checklists.projetos[0].setores[0].linhas[" + n + "])");
    T(dn(0) === "Luiz" && dn(1) === "" && dn(2) === "", "linha de outro inspetor avisa com o nome; a minha e a sem dono nao avisam");
    roda("App.chkAbrirLinha('LD2')");
    T(roda("STATE.ui.chkLinhaId") === "LD2", "minha linha abre direto");
    roda("STATE.ui.chkLinhaId = null; App.chkAbrirLinha('LD1')");
    T(roda("STATE.ui.chkLinhaId") === null, "linha de outro inspetor: pergunta antes de abrir");
    roda("App.chkConfirmarAcao()");
    T(roda("STATE.ui.chkLinhaId") === "LD1", "confirmado: abre mesmo assim");
    roda("STATE.ui.chkLinhaId = null; App.chkAbrirLinha('LD4')");
    T(roda("STATE.ui.chkLinhaId") === "LD4", "linha finalizada de outro inspetor abre sem aviso (so leitura)");
    roda("App.chkAssumirLinha('LD1')");
    T(roda("STATE.checklists.projetos[0].setores[0].linhas[0].responsavelId") === "I1" && dn(0) === "", "assumir a linha passa o dono para quem sou eu");
    // nova linha fica com quem criou
    roda("STATE.checklists.modelos = [{ id:'MD', nome:'Mod', tipoLinha:'vertical', secoes:[{ id:'sx', titulo:'T', contexto:'', itens:[{ id:'ix', descricao:'D', motivosPadrao:[] }] }], criadoEm:1, atualizadoEm:1 }]; __chkNovaLinhaDraft = { modeloId:'MD', nome:'Nova do Daniel', fotoAmpla:'' }; App.chkCriarLinha()");
    T(roda("STATE.checklists.projetos[0].setores[0].linhas.find(l => l.nome === 'Nova do Daniel').responsavelId") === "I1", "linha criada fica com o inspetor deste aparelho");
    const cfg = roda("screenChkConfig()");
    T(cfg.includes("Quem sou eu neste aparelho") && cfg.includes('value="I1" selected') && cfg.includes("Luiz"), "configuracoes: seletor de quem sou eu com os inspetores ativos");
    const card = roda("STATE.ui.screen = 'checklist-linhas'; screenChkLinhas()");
    T(card.includes("Responsável: Luiz") && card.includes("Responsável: Daniel"), "cartao mostra o responsavel de cada linha");
    roda("delete globalThis.localStorage; STATE.checklists.inspetores = []; STATE.checklists.modelos = " + modelosOrig + "; STATE.checklists.projetos = " + J(estadoAntes.lista) + ";");
  }
  // ---- laudo: acao recomendada na avaliacao por componente; checklist com coluna da pergunta larga; texto sem negrito
  { const itA = itn("a", "Item A", { motivosPadrao:[{ motivo:"M1", texto:"Pend A1.", acao:"Fazer A1", prioridade:"critica" }, { motivo:"M2", texto:"Pend A2.", acao:"Fazer A2" }] });
    const itB = itn("b", "Item B", { motivosPadrao:[{ motivo:"M1", texto:"Pend B1.", acao:"Fazer A1" }] });
    const linAc = linhaCorpo([itA, itB], [exe("a", "naoAtende", 0, { motivosSelecionados:["M1", "M2"] }), exe("b", "naoAtende", 0, { motivosSelecionados:["M1"] })]);
    const nAc = roda("chkNarrativaSecao(" + linAc + ".modeloSnapshot[0], " + linAc + ", '3.1')");
    T(nAc.acoes.length === 2 && nAc.acoes[0].txt === "Fazer A1" && nAc.acoes[0].prio === "critica" && nAc.acoes[1].txt === "Fazer A2" && nAc.acoes[1].prio === "media", "acoes recomendadas dos motivos escolhidos, sem repetir a mesma acao, com a prioridade de cada uma: " + J(nAc.acoes));
    const bAc = corpoDe(linAc);
    const htmlAc = bAc.map(b => b.html).join("");
    T(htmlAc.includes('class="lcl-acoes"') && htmlAc.includes("Ação recomendada") && htmlAc.includes(" Fazer A1</li>") && htmlAc.includes(" Fazer A2</li>") && htmlAc.includes("lcl-pchip critica") && htmlAc.includes("lcl-pchip media") && htmlAc.includes("lcl-pri-leg") && !/Crítica \d|Alta \d/.test(htmlAc) && (htmlAc.match(/Fazer A1/g) || []).length === 1, "a avaliacao por componente mostra a Acao recomendada logo depois do texto das nao conformidades");
    const linSemNc = linhaCorpo([itA], [exe("a", "atende", 0)]);
    T(!corpoDe(linSemNc).map(b => b.html).join("").includes("lcl-acoes"), "sem nao conformidade, sem bloco de acao");
    const srcH = require("fs").readFileSync(process.argv[2], "utf8");
    T(srcH.includes(".lcl-rt{flex:1 1 56%;min-width:0}") && srcH.includes("flex:0 1 30%;max-width:30%") && srcH.includes("white-space:normal;overflow-wrap:anywhere") && srcH.includes(".lcl-narr mark.nc{background:none;color:#1E2148;font-weight:400}"), "checklist do laudo: pergunta larga e normas estreitas com quebra; texto das nao conformidades sem negrito");
  }
  // ---- memorial da linha rigida: sem flecha, sem E/Ix, sem carga dinamica nas tabelas
  { const tR = roda(`(function(){ const m = chkMemorialDe({ memorial:{ hanc:6.5, hpos:2, vao:1 } }); const c = chkMemorialCalc("horizontal_rigida", m); return { t: chkMemorialTabelas(c, m), v: chkMemorialVeredito(c, m), zlq1: c.ZLQ1, zlq2: c.ZLQ2 }; })()`);
    T(!/Módulo E|Inércia|Deflexão|Carga dinâmica|Perfil da viga/.test(tR.t) && tR.t.includes("ZLQ talabarte") && tR.t.includes("ZLQ trava-quedas") && Math.abs(tR.zlq1 - 4.9) < 1e-9 && Math.abs(tR.zlq2 - 4) < 1e-9 && tR.v.okC === true, "tabelas da linha rigida: sem flecha/E/Ix/carga dinamica; ZLQ = a + b + C1 + D1 (4,90 m) e B1 + C1 + D1 (4,00 m)");
  }
}
async function testarSincronizacaoChecklist(){
  const T = (cond, msg)=>{ if(!cond) throw new Error("sincronizacao do checklist: " + msg); };
  const J = (v)=> JSON.stringify(v);
  const estadoOriginal = sandbox.STATE;
  const nuvem = new Map(); // pasta -> Map(nome -> texto): a "nuvem" compartilhada pelos dois aparelhos de mentira
  const pasta = (p)=>{ if(!nuvem.has(p)) nuvem.set(p, new Map()); return nuvem.get(p); };
  const mkT = (opc)=>{
    opc = opc || {};
    const log = [];
    return {
      log,
      listar: async (p)=> opc.listagemFalha ? null : Array.from(pasta(p).keys()),
      baixar: async (p, n)=>{ if(opc.aoBaixar) opc.aoBaixar(p, n); return (opc.falharBaixar && opc.falharBaixar(p, n)) ? null : (pasta(p).has(n) ? pasta(p).get(n) : null); },
      enviar: async (p, n, t)=>{ if(opc.falharEnvio && opc.falharEnvio(p, n)) return false; pasta(p).set(n, t); return true; },
      apagar: async (p, n)=>{ pasta(p).delete(n); return true; },
      fotosLocais: async ()=> new Set(),
      resolverFotos: async ()=>{},
      motivoFalha: ()=> "falha simulada",
    };
  };
  const dispositivo = ()=> roda(`(function(){ const e = { modulo:"checklist", projetos:[], projetosSimples:[], checklists:{ modelos:[], projetos:[] }, ui:{} }; chkGarantirNamespace(e); return e; })()`);
  const sync = async (estado, opc)=>{
    sandbox.STATE = estado;
    const t = mkT(opc);
    t.log = (...a)=>{ t.eventos = t.eventos || []; t.eventos.push(a); };
    sandbox.__T = t;
    sandbox.__OPC = { limite: (opc && opc.limite) || Infinity, baixarFotos: opc ? opc.baixarFotos : undefined, limiteFotos: opc ? opc.limiteFotos : undefined };
    const r = await roda("chkSyncRodar(__T, __OPC)");
    r.eventos = t.eventos || [];
    return r;
  };
  const nomesNuvem = (p)=> Array.from(pasta(p || "Backup/Checklist").keys());
  const emDia = async (a, b)=>{ // roda ate estabilizar (no maximo 4 rodadas por aparelho) e devolve se terminou sem mover nada
    for(let i = 0; i < 4; i++){
      const ra = await sync(a), rb = await sync(b);
      if(!ra.enviou && !ra.baixou && !ra.removeu && !rb.enviou && !rb.baixou && !rb.removeu) return true;
    }
    return false;
  };
  const doModelo = (e)=> { sandbox.STATE = e; return roda(`STATE.checklists.modelos.find(x => x.id === CHK_MODELO_PADRAO_ID)`); };
  const difere = (x, y, caminho)=>{ // primeira diferenca entre duas arvores (para mensagem de erro)
    caminho = caminho || "";
    if(typeof x !== typeof y) return caminho + ": tipos " + typeof x + " x " + typeof y;
    if(x && y && typeof x === "object"){
      const ks = new Set(Object.keys(x).concat(Object.keys(y)));
      for(const k of ks){ const d = difere(x[k], y[k], caminho + "." + k); if(d) return d; }
      return "";
    }
    return x === y ? "" : caminho + ": " + J(x).slice(0, 60) + " x " + J(y).slice(0, 60);
  };

  // ---------------------------------------------------------------- 1) o modelo pronto de cada aparelho (sementes) nunca briga
  const A = dispositivo(), B = dispositivo();
  const mA0 = doModelo(A), mB0 = doModelo(B);
  T(mA0.semente === true && mA0.sementeEm === mA0.atualizadoEm && mB0.semente === true, "o modelo pronto nasce como semente (intocado)");
  T(mA0.secoes[0].id !== mB0.secoes[0].id, "preparo: cada aparelho semeia o modelo pronto com ids proprios");
  let r = await sync(A);
  T(r.enviou === 1 && nomesNuvem().filter(n => n.startsWith("m_")).length === 1, "o primeiro aparelho sobe o modelo pronto: " + J(r));
  r = await sync(B);
  const mB1 = doModelo(B);
  T(r.baixou === 1 && r.conflitos === 0 && mB1.secoes[0].id === mA0.secoes[0].id && mB1.semente === true && mB1.atualizadoEm === mB1.sementeEm && B.checklists.modelos.length === 1, "o outro aparelho, com o modelo pronto intocado, adota o da nuvem sem copia nem briga: " + J(r));
  T(await emDia(A, B), "dois aparelhos em dia: uma segunda rodada nao move nada");

  // ---------------------------------------------------------------- 2) editar o modelo pronto num aparelho chega no outro; semente nunca vence modelo editado
  sandbox.STATE = A;
  roda(`(function(){ const m = STATE.checklists.modelos[0]; m.nome = "Linhas de Vida EDITADO"; m.secoes[0].itens[0].descricao = "Pergunta alterada no aparelho A"; m.atualizadoEm = agoraSync(); })()`);
  r = await sync(A);
  T(r.enviou === 1 && r.baixou === 0, "a edicao do modelo sobe: " + J(r));
  r = await sync(B);
  const mB2 = doModelo(B);
  T(r.baixou === 1 && mB2.nome === "Linhas de Vida EDITADO" && mB2.secoes[0].itens[0].descricao === "Pergunta alterada no aparelho A" && B.checklists.modelos.length === 1, "o modelo editado em A chega em B, no mesmo modelo (sem duplicar): " + J(r));
  const C = dispositivo(); // aparelho novo, com o modelo pronto recem-semeado (carimbo mais novo que a edicao de A)
  r = await sync(C);
  T(C.checklists.modelos.length === 1 && doModelo(C).nome === "Linhas de Vida EDITADO" && r.conflitos === 0 && r.enviou === 0, "modelo pronto recem-criado nunca passa por cima do editado: " + J(r));
  T(Array.from(pasta("Backup/Checklist").keys()).filter(n => n.startsWith("m_")).length === 1, "so uma versao do modelo na nuvem");

  // ---------------------------------------------------------------- 3) modelo novo: aparece no outro; editar la volta; nada de copia
  sandbox.STATE = B;
  const idNovo = roda(`(function(){ const m = novoChkModelo(); m.nome = "Meu modelo"; const s = novoChkSecao(); s.titulo = "Sec A"; const it = novoChkItem(); it.descricao = "P1"; it.info = { texto:"orientacao", fotos:[{ foto:"data:image/jpeg;base64,INFOFOTO1" }] }; s.itens.push(it); m.secoes.push(s); STATE.checklists.modelos.push(m); return m.id; })()`);
  await sync(B);
  T(Array.from(pasta("Backup/Checklist/Fotos").keys()).length === 1, "a foto de orientacao sobe como arquivo proprio (uma vez): " + J(nomesNuvem("Backup/Checklist/Fotos")));
  r = await sync(A);
  const mNovoA = A.checklists.modelos.find(x => x.id === idNovo);
  T(r.baixou === 1 && mNovoA && mNovoA.nome === "Meu modelo" && mNovoA.secoes[0].itens[0].info.fotos[0].foto === "data:image/jpeg;base64,INFOFOTO1", "o modelo novo e a foto de orientacao chegam no outro aparelho");
  sandbox.STATE = A;
  roda(`(function(){ const m = STATE.checklists.modelos.find(x => x.id === ${J(idNovo)}); m.secoes[0].itens[0].descricao = "P1 (alterada em A)"; m.atualizadoEm = agoraSync(); })()`);
  T(await emDia(A, B) && B.checklists.modelos.find(x => x.id === idNovo).secoes[0].itens[0].descricao === "P1 (alterada em A)" && A.checklists.modelos.length === 2 && B.checklists.modelos.length === 2, "editar o modelo em qualquer aparelho chega no outro, sem copias");

  // ---------------------------------------------------------------- 4) projeto > setor > linha, com foto
  sandbox.STATE = A;
  const ids = roda(`(function(){ const m = STATE.checklists.modelos.find(x => x.id === CHK_MODELO_PADRAO_ID); const p = novoChkProjeto(); p.empresa = "Empresa X"; const s = novoChkSetor(); s.nome = "Setor 1"; const l = novoChkLinha(m); l.nome = "LV-1"; l.itens[0].fotos = [{ foto:"data:image/jpeg;base64,FOTOLINHA1", tags:[] }]; l.fotoAmpla = "data:image/jpeg;base64,FOTOAMPLA1"; s.linhas.push(l); p.setores.push(s); STATE.checklists.projetos.push(p); return { p:p.id, s:s.id, l:l.id }; })()`);
  r = await sync(A);
  const nom = nomesNuvem();
  T(r.enviou === 3 && nom.some(n => n.startsWith("p_" + ids.p + "_")) && nom.some(n => n.startsWith("s_" + ids.s + "_")) && nom.some(n => n.startsWith("l_" + ids.l + "_")) && nomesNuvem("Backup/Checklist/Fotos").length === 3, "projeto, setor e linha sobem em arquivos separados; as fotos (2 + 1 do modelo) a parte: " + J([r, nom, nomesNuvem("Backup/Checklist/Fotos")]));
  const textoLinha = pasta("Backup/Checklist").get(nom.find(n => n.startsWith("l_" + ids.l + "_")));
  T(!textoLinha.includes("FOTOLINHA1") && textoLinha.includes("idbfoto:"), "o arquivo da linha leva so a referencia da foto, nao os bytes");
  r = await sync(B);
  T(r.baixou === 3 && difere(A.checklists.projetos, B.checklists.projetos) === "", "o aparelho B recebe o projeto inteiro (projeto, setor, linha e fotos) igualzinho: " + difere(A.checklists.projetos, B.checklists.projetos));
  T(B.checklists.projetos[0].setores[0].linhas[0].itens[0].fotos[0].foto === "data:image/jpeg;base64,FOTOLINHA1" && B.checklists.projetos[0].setores[0].linhas[0].fotoAmpla === "data:image/jpeg;base64,FOTOAMPLA1", "as fotos chegam com os bytes de verdade");
  T(await emDia(A, B), "em dia depois da primeira troca");

  // ---------------------------------------------------------------- 5) editar na linha (mesmo campo sem carimbo) e no projeto
  sandbox.STATE = B;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens[0].observacao = "nota digitada em campo"; })()`); // chkSetObservacao nao carimba
  roda(`(function(){ STATE.checklists.projetos[0].empresa = "Empresa X Ltda"; STATE.checklists.projetos[0].atualizadoEm = agoraSync(); })()`);
  r = await sync(B);
  T(r.enviou === 2, "alteracao que nao carimba tambem e detectada (por assinatura): " + J(r));
  r = await sync(A);
  T(A.checklists.projetos[0].setores[0].linhas[0].itens[0].observacao === "nota digitada em campo" && A.checklists.projetos[0].empresa === "Empresa X Ltda" && A.checklists.projetos[0].setores.length === 1, "as alteracoes de B chegam em A sem mexer nos filhos");
  T(await emDia(A, B), "em dia de novo");

  // ---------------------------------------------------------------- 6) alteracao dos dois lados na mesma linha, com DISCORDANCIA (o mesmo item respondido de formas diferentes): ninguem perde nada, uma versao vira copia
  sandbox.STATE = A;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens[1].conforme = "atende"; l.itens[1].observacao = "A: sapatilha trincada"; l.atualizadoEm = agoraSync(); })()`);
  sandbox.STATE = B;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens[1].conforme = "naoAtende"; l.itens[1].observacao = "B: cabo desfiado"; l.atualizadoEm = agoraSync(); })()`);
  await sync(A);
  r = await sync(B);
  const linhasB = B.checklists.projetos[0].setores[0].linhas;
  T(r.conflitos === 0 && r.guardadas === 1 && linhasB.length === 1 && !linhasB[0].nome.includes("(versão de ") && (linhasB[0].versoesAlternativas || []).length === 1, "alteracao dos dois lados: continua UMA linha na lista e a outra versao fica guardada dentro dela (sem copia visivel): " + J([r.conflitos, r.guardadas, linhasB.length]));
  const obs = [linhasB[0].itens[1].observacao, linhasB[0].versoesAlternativas[0].linha.itens[1].observacao].sort();
  T(J(obs) === J(["A: sapatilha trincada", "B: cabo desfiado"]) && linhasB[0].itens[1].observacao === "A: sapatilha trincada", "a mais nova (a da nuvem) vale; a outra esta inteira na versao guardada: " + J(obs));
  T(await emDia(A, B) && A.checklists.projetos[0].setores[0].linhas.length === 1 && (A.checklists.projetos[0].setores[0].linhas[0].versoesAlternativas || []).length === 1 && difere(A.checklists.projetos, B.checklists.projetos) === "", "a versao guardada vai para os dois aparelhos e tudo estabiliza");
  // a mesma alteracao feita nos dois lados (so o carimbo difere) nao gera versao guardada
  sandbox.STATE = A;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.conclusaoTexto = "igual"; l.atualizadoEm = agoraSync(); })()`);
  sandbox.STATE = B;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas.find(x => x.id === ${J(ids.l)}); l.conclusaoTexto = "igual"; l.atualizadoEm = agoraSync(); })()`);
  await sync(A);
  r = await sync(B);
  T(r.conflitos === 0 && r.guardadas === 0 && B.checklists.projetos[0].setores[0].linhas.length === 1 && B.checklists.projetos[0].setores[0].linhas[0].versoesAlternativas.length === 1, "mesmo conteudo nos dois lados: nada novo guardado: " + J(r));
  await emDia(A, B);

  // ---------------------------------------------------------------- 7) excluir a versao guardada: viaja para o outro aparelho
  sandbox.STATE = A;
  const lA7 = A.checklists.projetos[0].setores[0].linhas[0];
  T(roda(`chkAltExcluir(STATE.checklists.projetos[0].setores[0].linhas[0], ${J(lA7.versoesAlternativas[0].id)})`) === true && !A.checklists.projetos[0].setores[0].linhas[0].versoesAlternativas, "excluir a versao guardada tira da linha");
  r = await sync(A);
  r = await sync(B);
  T(!B.checklists.projetos[0].setores[0].linhas[0].versoesAlternativas && B.checklists.projetos[0].setores[0].linhas.length === 1, "a exclusao da versao guardada chega no outro aparelho");
  T(await emDia(A, B), "em dia depois da exclusao da versao guardada");

  // ---------------------------------------------------------------- 7b) conflito no sentido contrario: o aparelho daqui e o mais novo, a versao da nuvem fica guardada
  sandbox.STATE = B;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens[3].conforme = "naoAtende"; l.itens[3].observacao = "B7: nuvem"; l.atualizadoEm = agoraSync(); })()`);
  await sync(B);
  await new Promise(res => setTimeout(res, 15));
  sandbox.STATE = A;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens[3].conforme = "atende"; l.itens[3].observacao = "A7: daqui"; l.atualizadoEm = agoraSync(); })()`);
  r = await sync(A);
  const lA7b = A.checklists.projetos[0].setores[0].linhas[0];
  T(r.guardadas === 1 && A.checklists.projetos[0].setores[0].linhas.length === 1 && lA7b.itens[3].observacao === "A7: daqui" && (lA7b.versoesAlternativas || []).length === 1 && lA7b.versoesAlternativas[0].linha.itens[3].observacao === "B7: nuvem" && lA7b.versoesAlternativas[0].de === "nuvem", "o daqui e mais novo: vale o daqui, a versao da nuvem fica guardada: " + J([r.guardadas, lA7b.itens[3].observacao, (lA7b.versoesAlternativas || []).length]));
  r = await sync(B);
  T(B.checklists.projetos[0].setores[0].linhas[0].itens[3].observacao === "A7: daqui" && (B.checklists.projetos[0].setores[0].linhas[0].versoesAlternativas || []).length === 1 && await emDia(A, B), "o outro aparelho recebe a linha e a versao guardada, sem copia");
  // usar a versao guardada e voltar atras: nada se perde
  sandbox.STATE = A;
  A.ui.chkProjetoId = ids.p; A.ui.chkSetorId = ids.s;
  const altId7 = lA7b.versoesAlternativas[0].id;
  roda(`App.chkAltUsar(${J(ids.l)}, ${J(altId7)})`);
  T(A.checklists.projetos[0].setores[0].linhas[0].itens[3].observacao === "A7: daqui", "usar a versao guardada pede confirmacao antes");
  roda("App.chkConfirmarAcao()");
  const lA7c = A.checklists.projetos[0].setores[0].linhas[0];
  T(lA7c.itens[3].observacao === "B7: nuvem" && lA7c.versoesAlternativas.length === 1 && lA7c.versoesAlternativas[0].linha.itens[3].observacao === "A7: daqui" && lA7c.id === ids.l && lA7c.nome === lA7b.nome, "trocou: a da nuvem passa a valer e a que estava em uso fica guardada (id e nome da linha iguais)");
  await sync(A); await sync(B);
  T(await emDia(A, B) && B.checklists.projetos[0].setores[0].linhas[0].itens[3].observacao === "B7: nuvem", "a troca vai para o outro aparelho");
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; delete l.versoesAlternativas; l.atualizadoEm = agoraSync(); })()`);
  await sync(A); await sync(B);
  await emDia(A, B);

  // ---------------------------------------------------------------- 8) exclusao do projeto inteiro; e a protecao de quem tem alteracao ainda nao enviada
  sandbox.STATE = B;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens[2].observacao = "B editou depois"; })()`);
  sandbox.STATE = A;
  A.ui.chkProjetoId = ids.p;
  roda(`App.chkExcluirProjeto(${J(ids.p)})`);
  await sync(A);
  T(!nomesNuvem().some(n => /^[psl]_/.test(n) && (n.includes(ids.p) || n.includes(ids.s) || n.includes(ids.l))), "projeto excluido: nada dele fica na nuvem: " + J(nomesNuvem()));
  r = await sync(B);
  T(B.checklists.projetos.length === 1 && B.checklists.projetos[0].setores[0].linhas[0].itens[2].observacao === "B editou depois", "B tinha alteracao nao enviada: o projeto e mantido (nada se perde): " + J([r, B.checklists.projetos.length]));
  T(await emDia(A, B) && A.checklists.projetos.length === 1 && A.checklists.projetos[0].setores[0].linhas[0].itens[2].observacao === "B editou depois", "e o projeto volta para o outro aparelho, com a alteracao");
  // agora sem alteracao pendente: a exclusao vale
  A.ui.chkProjetoId = ids.p;
  sandbox.STATE = A;
  roda(`App.chkExcluirProjeto(${J(ids.p)})`);
  T(await emDia(A, B) && A.checklists.projetos.length === 0 && B.checklists.projetos.length === 0, "exclusao sem alteracao pendente: projeto sai dos dois aparelhos");

  // ---------------------------------------------------------------- 9) inspetores: uniao
  sandbox.STATE = A;
  const idInspA = roda(`(function(){ const i = novoChkInspetor(); i.nome = "Ana"; i.cargo = "Eng"; STATE.checklists.inspetores = [i]; return i.id; })()`);
  sandbox.STATE = B;
  const idInspB = roda(`(function(){ const i = novoChkInspetor(); i.nome = "Bruno"; i.cargo = "Tec"; STATE.checklists.inspetores = [i]; return i.id; })()`);
  T(await emDia(A, B), "inspetores: estabiliza");
  T(A.checklists.inspetores.length === 2 && B.checklists.inspetores.length === 2 && A.checklists.inspetores.some(i => i.nome === "Bruno") && B.checklists.inspetores.some(i => i.nome === "Ana"), "inspetor cadastrado em cada aparelho aparece nos dois (uniao)");
  sandbox.STATE = B;
  B.ui.chkProjetoId = null;
  roda(`App.chkInspetorSet(${J(idInspA)}, "cargo", "Engenheira")`);
  roda(`App.chkInspetorAtivo(${J(idInspB)})`);
  T(await emDia(A, B) && A.checklists.inspetores.find(i => i.id === idInspA).cargo === "Engenheira" && A.checklists.inspetores.find(i => i.id === idInspB).ativo === false, "editar/desativar inspetor num aparelho chega no outro");

  // ---------------------------------------------------------------- 10) falhas: nada se corrompe e a proxima rodada conserta
  sandbox.STATE = A;
  const idsF = roda(`(function(){ const m = STATE.checklists.modelos.find(x => x.id === CHK_MODELO_PADRAO_ID); const p = novoChkProjeto(); p.empresa = "F"; const s = novoChkSetor(); s.nome = "S"; const l = novoChkLinha(m); l.nome = "LV-F"; l.fotoAmpla = "data:image/jpeg;base64,FOTOFALHA"; s.linhas.push(l); p.setores.push(s); STATE.checklists.projetos.push(p); return { p:p.id, l:l.id }; })()`);
  r = await sync(A, { falharEnvio: (p, n) => p === "Backup/Checklist/Fotos" });
  T(r.falhas >= 1 && !nomesNuvem().some(n => n.startsWith("l_" + idsF.l + "_")), "foto que nao subiu: a linha NAO sobe sem ela (ninguem recebe referencia quebrada): " + J(r));
  r = await sync(A);
  T(r.falhas === 0 && nomesNuvem().some(n => n.startsWith("l_" + idsF.l + "_")), "a rodada seguinte, com rede, conclui");
  r = await sync(B, { listagemFalha: true });
  T(r.erro === true && r.baixou === 0 && B.checklists.projetos.length === 0, "listagem que falha nao muda nada (nem apaga)");
  // foto ainda nao disponivel para baixar: a linha fica de fora ate chegar, sem perder nada
  r = await sync(B, { falharBaixar: (p, n) => p === "Backup/Checklist/Fotos" });
  T(r.falhas >= 1 && B.checklists.projetos.every(p => p.id !== idsF.p || p.setores.every(s => s.linhas.length === 0)), "linha cuja foto ainda nao veio nao e aplicada pela metade: " + J(r));
  T(await emDia(A, B) && B.checklists.projetos.some(p => p.id === idsF.p && p.setores[0].linhas[0].fotoAmpla === "data:image/jpeg;base64,FOTOFALHA"), "e chega inteira quando a foto chega");

  // ---------------------------------------------------------------- 11) a nuvem esvaziada nunca apaga o que esta no aparelho (e tudo volta a subir)
  nuvem.clear();
  sandbox.STATE = A;
  const conteudoA = ()=> roda(`chkSyncSig(STATE.checklists.projetos, true)`) + J(A.checklists.modelos.map(m => m.id));
  const antesA = conteudoA();
  r = await sync(A);
  T(conteudoA() === antesA && r.enviou >= 3 && r.removeu === 0, "nuvem vazia: nada local e apagado e o que existe sobe de novo: " + J(r));

  // ---------------------------------------------------------------- 12) limite de operacoes por rodada (ciclo automatico)
  nuvem.clear();
  const D = dispositivo();
  sandbox.STATE = D;
  roda(`(function(){ const m = STATE.checklists.modelos[0]; const p = novoChkProjeto(); const s = novoChkSetor(); for(let i = 0; i < 6; i++){ const l = novoChkLinha(m); l.nome = "L" + i; s.linhas.push(l); } p.setores.push(s); STATE.checklists.projetos.push(p); })()`);
  r = await sync(D, { limite: 3 });
  T(r.adiado === true && r.enviou === 3, "com limite, a rodada para e avisa que sobrou trabalho: " + J(r));
  T(await emDia(D, dispositivo()), "as rodadas seguintes terminam o servico");

  // ---------------------------------------------------------------- 12b) aparelhos que ja existiam (sem a marca de semente)
  nuvem.clear();
  const P = dispositivo(), Q = dispositivo(), R2 = dispositivo();
  sandbox.STATE = P;
  roda(`(function(){ const m = STATE.checklists.modelos[0]; m.nome = "Modelo do escritorio"; m.secoes[0].itens[0].descricao = "Texto ajustado no escritorio"; m.atualizadoEm = agoraSync(); })()`);
  await sync(P);
  // Q: modelo de fabrica nunca editado, mas de um app antigo (sem marca de semente, carimbo mais novo que o do escritorio)
  sandbox.STATE = Q;
  roda(`(function(){ const m = STATE.checklists.modelos[0]; delete m.semente; delete m.sementeEm; m.atualizadoEm = agoraSync(); })()`);
  r = await sync(Q);
  T(r.conflitos === 0 && Q.checklists.modelos.length === 1 && doModelo(Q).nome === "Modelo do escritorio", "modelo de fabrica de um aparelho antigo (so tem o conteudo original) adota o da nuvem, sem copia: " + J(r));
  // R: aparelho antigo que EDITOU o modelo de fabrica por conta propria: nada se perde (a outra versao vira copia)
  sandbox.STATE = R2;
  roda(`(function(){ const m = STATE.checklists.modelos[0]; delete m.semente; delete m.sementeEm; m.nome = "Editado no celular"; m.atualizadoEm = agoraSync(); })()`);
  r = await sync(R2);
  T(r.conflitos === 1 && R2.checklists.modelos.length === 2 && R2.checklists.modelos.some(m => m.nome === "Editado no celular" || m.nome.startsWith("Editado no celular (versão de ")) && R2.checklists.modelos.some(m => m.nome === "Modelo do escritorio" || m.nome.startsWith("Modelo do escritorio (versão de ")), "os dois aparelhos editaram o modelo de fabrica: as duas versoes ficam (uma como copia): " + J([r, R2.checklists.modelos.map(m => m.nome)]));

  // ---------------------------------------------------------------- 12c) trabalho em paralelo no mesmo projeto, em partes diferentes: sem briga
  nuvem.clear();
  const U = dispositivo(), V2 = dispositivo();
  sandbox.STATE = U;
  const idsU = roda(`(function(){ const m = STATE.checklists.modelos[0]; const p = novoChkProjeto(); p.empresa = "Paralelo"; const s = novoChkSetor(); s.nome = "Base"; const l = novoChkLinha(m); l.nome = "LV-base"; s.linhas.push(l); p.setores.push(s); STATE.checklists.projetos.push(p); return { p:p.id, s:s.id, l:l.id }; })()`);
  T(await emDia(U, V2), "preparo: projeto base nos dois aparelhos");
  sandbox.STATE = U;
  roda(`(function(){ const p = STATE.checklists.projetos[0]; const s = novoChkSetor(); s.nome = "Setor do U"; const l = novoChkLinha(STATE.checklists.modelos[0]); l.nome = "LV-U"; s.linhas.push(l); p.setores.push(s); p.atualizadoEm = agoraSync(); })()`);
  sandbox.STATE = V2;
  roda(`(function(){ const p = STATE.checklists.projetos[0]; const s = novoChkSetor(); s.nome = "Setor do V"; p.setores.push(s); p.atualizadoEm = agoraSync(); const l = p.setores[0].linhas[0]; l.itens[0].observacao = "V editou a linha base"; })()`);
  T(await emDia(U, V2), "trabalho em paralelo estabiliza");
  const nomesSet = (e)=> e.checklists.projetos[0].setores.map(s => s.nome).sort();
  T(J(nomesSet(U)) === J(["Base", "Setor do U", "Setor do V"]) && J(nomesSet(V2)) === J(nomesSet(U)) && U.checklists.projetos[0].setores.find(s => s.nome === "Base").linhas[0].itens[0].observacao === "V editou a linha base" && V2.checklists.projetos[0].setores.find(s => s.nome === "Setor do U").linhas.length === 1, "setor novo de cada lado e edicao de linha em paralelo: tudo chega nos dois, sem copia nem conflito");
  const conteudo = (e)=> { sandbox.STATE = e; return roda(`chkSyncSig(STATE.checklists.projetos, true)`); };
  T(U.checklists.projetos[0].setores.every(s => s.linhas.every(l => !l.nome.includes("(versão de "))) && conteudo(U) === conteudo(V2), "nenhuma copia de conflito apareceu e os dois ficaram iguais: " + difere(U.checklists.projetos, V2.checklists.projetos) + " | " + J(U.checklists.projetos[0].setores.map(s => s.linhas.map(l => l.nome))));

  // ---------------------------------------------------------------- 12d) modelo editado nos dois lados, o da nuvem mais novo: o daqui vira copia
  nuvem.clear();
  const M1 = dispositivo(), M2 = dispositivo();
  sandbox.STATE = M1;
  const idMod = roda(`(function(){ const m = novoChkModelo(); m.nome = "Modelo comum"; const s = novoChkSecao(); s.titulo = "S"; const it = novoChkItem(); it.descricao = "P"; s.itens.push(it); m.secoes.push(s); STATE.checklists.modelos.push(m); return m.id; })()`);
  T(await emDia(M1, M2), "preparo: modelo comum nos dois");
  sandbox.STATE = M2;
  roda(`(function(){ const m = STATE.checklists.modelos.find(x => x.id === ${J(idMod)}); m.secoes[0].itens[0].descricao = "versao do M2"; m.atualizadoEm = agoraSync(); })()`);
  sandbox.STATE = M1;
  roda(`(function(){ const m = STATE.checklists.modelos.find(x => x.id === ${J(idMod)}); m.secoes[0].itens[0].descricao = "versao do M1 (mais nova)"; m.atualizadoEm = agoraSync(); })()`);
  await sync(M1);
  r = await sync(M2);
  const descs = M2.checklists.modelos.filter(m => m.secoes.length && m.nome.startsWith("Modelo comum")).map(m => m.secoes[0].itens[0].descricao).sort();
  T(r.conflitos === 1 && J(descs) === J(["versao do M1 (mais nova)", "versao do M2"]) && M2.checklists.modelos.find(m => m.id === idMod).secoes[0].itens[0].descricao === "versao do M1 (mais nova)", "modelo editado nos dois lados, o da nuvem mais novo: vence o mais novo e o daqui fica como copia: " + J([r.conflitos, descs]));
  await emDia(M1, M2);

  // ---------------------------------------------------------------- 12e) a pessoa digita no meio da sincronizacao: o que foi digitado nunca e sobrescrito
  nuvem.clear();
  const N1 = dispositivo(), N2 = dispositivo();
  sandbox.STATE = N1;
  const idsN = roda(`(function(){ const m = STATE.checklists.modelos[0]; const p = novoChkProjeto(); p.empresa = "Digitando"; const s = novoChkSetor(); s.nome = "S"; const l = novoChkLinha(m); l.nome = "LV-N"; s.linhas.push(l); p.setores.push(s); STATE.checklists.projetos.push(p); return { l:l.id }; })()`);
  T(await emDia(N1, N2), "preparo: linha nos dois aparelhos");
  sandbox.STATE = N1;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens[0].observacao = "do N1"; l.atualizadoEm = agoraSync(); })()`);
  await sync(N1);
  r = await sync(N2, { aoBaixar: (p, n)=>{ if(n.startsWith("l_")){ sandbox.STATE = N2; roda(`STATE.checklists.projetos[0].setores[0].linhas[0].itens[0].observacao = "digitado no N2 durante a sincronizacao"`); } } });
  sandbox.STATE = N2;
  T(r.baixou === 0 && N2.checklists.projetos[0].setores[0].linhas[0].itens[0].observacao === "digitado no N2 durante a sincronizacao", "o que a pessoa digita no meio do download nunca e sobrescrito pelo que veio da nuvem: " + J(r));
  await emDia(N1, N2);
  const obsN = N2.checklists.projetos[0].setores[0].linhas.map(l => l.itens[0].observacao).sort();
  T(obsN.length === 1 && obsN[0].includes("digitado no N2 durante a sincronizacao") && obsN[0].includes("do N1"), "na rodada seguinte as duas notas ficam guardadas na mesma linha (sem discordancia de resposta, as versoes se juntam): " + J(obsN));

  // ---------------------------------------------------------------- 14) tudo o que muda o laudo viaja: configuracao e textos da linha, anexos com foto, textos-base (Metodologia e Normas)
  nuvem.clear();
  const L1 = dispositivo(), L2 = dispositivo();
  sandbox.STATE = L1;
  roda(`(function(){ const m = STATE.checklists.modelos[0]; const p = novoChkProjeto(); p.empresa = "Laudo"; const s = novoChkSetor(); s.nome = "S"; const l = novoChkLinha(m); l.nome = "LV-L"; s.linhas.push(l); p.setores.push(s); STATE.checklists.projetos.push(p); })()`);
  T(await emDia(L1, L2), "preparo (laudo): linha nos dois aparelhos");
  sandbox.STATE = L1;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.laudo = { fotoCapa:false, capitulos:{ memorial:false, anexos:false }, parecer:"ressalvas", textos:{ "sec-x":"Texto editado no L1" }, anexos:[{ src:"data:image/jpeg;base64,ANEXO1", legenda:"Legenda 1" }] }; l.conclusaoTexto = "Conclusao L1"; l.descricao = "Descricao L1"; l.memorial = { hanc:5, hpos:3 };
    STATE.checklists.textos = { metodologia:{ texto:"Metodologia nova", figuras:[{ src:"data:image/jpeg;base64,FIGMET1", legenda:"Fig 1" }] }, normativo:{ intro:"Intro nova", normas:["NR-35", "ABNT X"] } }; })()`);
  T(await emDia(L1, L2), "em dia depois de configurar o laudo em L1");
  sandbox.STATE = L2;
  const lL2 = roda(`STATE.checklists.projetos[0].setores[0].linhas[0]`);
  T(lL2.laudo && lL2.laudo.parecer === "ressalvas" && lL2.laudo.fotoCapa === false && lL2.laudo.capitulos.memorial === false && lL2.laudo.textos["sec-x"] === "Texto editado no L1" && lL2.laudo.anexos[0].src === "data:image/jpeg;base64,ANEXO1" && lL2.laudo.anexos[0].legenda === "Legenda 1" && lL2.conclusaoTexto === "Conclusao L1" && lL2.descricao === "Descricao L1" && lL2.memorial.hanc === 5, "configuracao, textos, anexo com foto, conclusao e memorial da linha chegam no outro aparelho: " + J(lL2.laudo));
  const tx = roda(`STATE.checklists.textos`);
  T(tx && tx.metodologia && tx.metodologia.texto === "Metodologia nova" && tx.metodologia.figuras[0].src === "data:image/jpeg;base64,FIGMET1" && tx.normativo.normas.length === 2 && tx.normativo.intro === "Intro nova", "os textos-base do laudo (Metodologia com figura e Normas de referencia) chegam no outro aparelho: " + J(tx));
  // editar os textos-base no L2 volta para o L1; a edicao mais nova vence, sem duplicar nada
  roda(`(function(){ STATE.checklists.textos.normativo = { intro:"Intro do L2", normas:["NR-35"] }; STATE.checklists.textos.atualizadoEm = agoraSync(); })()`);
  T(await emDia(L1, L2), "em dia depois de editar os textos-base em L2");
  sandbox.STATE = L1;
  T(roda(`STATE.checklists.textos.normativo.intro`) === "Intro do L2" && roda(`STATE.checklists.textos.metodologia.texto`) === "Metodologia nova" && roda(`STATE.checklists.projetos.length`) === 1 && Array.from(pasta("Backup/Checklist").keys()).filter(n => n.startsWith("t_")).length === 1, "a edicao dos textos-base em L2 chega em L1 (um so arquivo na nuvem)");
  // aparelho novo, sem nenhum texto-base editado, recebe os da nuvem; texto-base vazio nunca apaga o da nuvem
  const L3 = dispositivo();
  await sync(L3);
  sandbox.STATE = L3;
  T(roda(`STATE.checklists.textos && STATE.checklists.textos.normativo.intro`) === "Intro do L2" && roda(`STATE.checklists.projetos[0].setores[0].linhas[0].laudo.parecer`) === "ressalvas", "aparelho novo recebe os textos-base e a linha com o laudo configurado");
  T(await emDia(L1, L3) && roda(`STATE.checklists.textos.normativo.intro`) === "Intro do L2", "aparelho novo sem texto-base proprio nao apaga o da nuvem");

  // ---------------------------------------------------------------- 15) caso do Deposito de Inflamaveis: um toque numa copia desatualizada nao derruba o trabalho do colega
  nuvem.clear();
  const D1 = dispositivo(), D2 = dispositivo();
  sandbox.STATE = D1;
  const idsD = roda(`(function(){ const m = STATE.checklists.modelos[0]; const p = novoChkProjeto(); p.empresa = "Vylor"; const s = novoChkSetor(); s.nome = "Setor D"; const l = novoChkLinha(m); l.nome = "Deposito"; s.linhas.push(l); p.setores.push(s); STATE.checklists.projetos.push(p); return { p:p.id, s:s.id, l:l.id }; })()`);
  T(await emDia(D1, D2), "preparo (mescla): linha nos dois aparelhos");
  // o colega (D1) responde 40 itens e finaliza
  sandbox.STATE = D1;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens.slice(0, 40).forEach((it, k)=>{ it.conforme = k === 7 ? "naoAtende" : "atende"; if(k === 7) it.motivosSelecionados = ["M"]; }); l.status = "finalizado"; l.atualizadoEm = agoraSync(); })()`);
  await sync(D1);
  // o usuario (D2), com a copia ANTIGA, toca em um item (mesma resposta do colega) e fica com o carimbo mais novo
  sandbox.STATE = D2;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.itens[0].conforme = "atende"; l.atualizadoEm = agoraSync(); })()`);
  r = await sync(D2);
  const lD2 = D2.checklists.projetos[0].setores[0].linhas;
  const respD2 = lD2[0].itens.filter(i => i.conforme !== null).length;
  T(r.conflitos === 0 && r.mesclados === 1 && lD2.length === 1 && respD2 === 40 && lD2[0].status === "finalizado" && lD2[0].itens[7].conforme === "naoAtende" && !lD2.some(l => l.nome.includes("(versão de ")), "um toque numa copia antiga: as respostas do colega ficam, sem copia (mescla): " + J([r.conflitos, r.mesclados, lD2.length, respD2, lD2[0].status]));
  T(await emDia(D1, D2) && D1.checklists.projetos[0].setores[0].linhas.length === 1 && difere(D1.checklists.projetos, D2.checklists.projetos) === "", "os dois aparelhos terminam iguais, com uma linha so: " + difere(D1.checklists.projetos, D2.checklists.projetos));
  T(nomesNuvem().filter(n => n.startsWith("l_" + idsD.l + "_")).length === 1 && !nomesNuvem().some(n => n.includes("versão")), "na nuvem fica uma versao da linha");
  // as duas pessoas respondem itens DIFERENTES ao mesmo tempo: as respostas se somam
  sandbox.STATE = D1;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.status = "em_andamento"; l.itens[41].conforme = "atende"; l.atualizadoEm = agoraSync(); })()`);
  sandbox.STATE = D2;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.status = "em_andamento"; l.itens[42].conforme = "naoAtende"; l.itens[42].observacao = "nota do D2"; l.itens[42].fotos = [{ foto:"data:image/jpeg;base64,FOTOD2", tags:[], motivo:"" }]; l.atualizadoEm = agoraSync(); })()`);
  await sync(D1);
  r = await sync(D2);
  const linhaSoma = D2.checklists.projetos[0].setores[0].linhas;
  T(r.conflitos === 0 && linhaSoma.length === 1 && linhaSoma[0].itens[41].conforme === "atende" && linhaSoma[0].itens[42].conforme === "naoAtende" && linhaSoma[0].itens[42].observacao === "nota do D2" && linhaSoma[0].itens[42].fotos.length === 1, "itens diferentes respondidos nos dois lados: as respostas, a nota e a foto se somam numa linha so: " + J([r.conflitos, linhaSoma.length]));
  T(await emDia(D1, D2) && D1.checklists.projetos[0].setores[0].linhas[0].itens[42].fotos[0].foto === "data:image/jpeg;base64,FOTOD2" && D1.checklists.projetos[0].setores[0].linhas.length === 1, "a soma chega no outro aparelho, foto incluida");
  // so o carimbo mudou (conteudo igual): nao e mudanca, nao envia
  sandbox.STATE = D1;
  roda(`(function(){ const l = STATE.checklists.projetos[0].setores[0].linhas[0]; l.atualizadoEm = agoraSync(); })()`);
  r = await sync(D1);
  T(r.enviou === 0 && r.conflitos === 0, "carimbo que anda sozinho nao conta como mudanca (nao reenvia a linha): " + J([r.enviou, r.conflitos]));

  // ---------------------------------------------------------------- 16) juntar as copias "(versao de ...)" que ja existem, sem perder nada
  const E = dispositivo();
  sandbox.STATE = E;
  const resC = roda(`(function(){
    const mk = (nome, conf, extra) => Object.assign({ id: uid(), nome, criadoEm: 100, modeloId: "M", status: "em_andamento", dataFinalizacao: null, secoesNA: [], laudo: {}, descricao: "", conclusaoTexto: "", fotoAmpla: "",
      itens: conf.map((c, k) => ({ itemId: "i" + k, conforme: c, motivosSelecionados: [], observacao: "", fotos: [] })), atualizadoEm: 5 }, extra || {});
    const p = novoChkProjeto(); const s = novoChkSetor();
    const orig = mk("Deposito", ["atende", null, null]);
    const c1 = mk("Deposito (versão de 07/10 14:36)", ["atende", "atende", "atende"], { status: "finalizado", dataFinalizacao: "2026-10-07" });
    const c2 = mk("Deposito (versão de 07/10 14:36) (versão de 07/10 15:02)", ["atende", "atende", null]);
    c1.itens[1].fotos = [{ foto:"data:image/jpeg;base64,FC1", tags:[], motivo:"" }]; c1.itens[2].observacao = "nota da copia";
    const origY = mk("Secador", ["atende", "atende"], { criadoEm: 200 });
    const cY = mk("Secador (versão de 07/10 15:09)", ["atende", "naoAtende"], { criadoEm: 200 });
    const cZ = mk("Fornalha (versão de 07/10 15:09)", ["atende", null], { criadoEm: 300 });
    s.linhas.push(orig, c1, c2, origY, cY, cZ); p.setores.push(s); STATE.checklists.projetos.push(p);
    const r = chkConsolidarCopiasLinhas(STATE);
    const ls = s.linhas;
    return { r, nomes: ls.map(l => l.nome), orig: ls.find(l => l.nome === "Deposito"), tomb: Object.keys(STATE.checklists.sync.removidos).length, ids: { c1: c1.id, c2: c2.id, cY: cY.id } };
  })()`);
  T(resC.r.fundidas === 2 && resC.r.mantidas === 2 && resC.nomes.length === 4 && !resC.nomes.some(n => n.startsWith("Deposito (")) && resC.nomes.includes("Secador (versão de 07/10 15:09)") && resC.nomes.includes("Fornalha (versão de 07/10 15:09)"), "copias que nao discordam sao juntadas; a que discorda e a sem original ficam: " + J(resC));
  T(resC.orig.itens.every(i => i.conforme === "atende") && resC.orig.status === "finalizado" && resC.orig.itens[1].fotos.length === 1 && resC.orig.itens[2].observacao === "nota da copia", "o original fica com a uniao: respostas, status, foto e nota da copia");
  T(resC.tomb === 2 && Object.prototype.hasOwnProperty.call(roda("STATE.checklists.sync.removidos"), resC.ids.c1) && Object.prototype.hasOwnProperty.call(roda("STATE.checklists.sync.removidos"), resC.ids.c2) && !Object.prototype.hasOwnProperty.call(roda("STATE.checklists.sync.removidos"), resC.ids.cY), "so as copias juntadas viram lapide (a exclusao viaja para os outros aparelhos)");
  // divergencia: o mesmo item respondido de formas diferentes nunca e junto
  T(roda("chkSyncDivergencias({ itens:[{ itemId:'a', conforme:'atende' }], secoesNA:[] }, { itens:[{ itemId:'a', conforme:'naoAtende' }], secoesNA:[] }).length") === 1 && roda("chkSyncDivergencias({ itens:[{ itemId:'a', conforme:'atende' }], secoesNA:[] }, { itens:[{ itemId:'a', conforme:null }], secoesNA:[] }).length") === 0 && roda("chkSyncDivergencias({ itens:[], secoesNA:[], descricao:'x' }, { itens:[], secoesNA:[], descricao:'y' }).length") === 1, "divergencia: so quando o mesmo item/campo tem respostas diferentes dos dois lados");

  // ---------------------------------------------------------------- 17) dados do projeto digitados em dois aparelhos: o que esta preenchido nunca e apagado por um aparelho que tem o campo em branco
  nuvem.clear();
  const P1 = dispositivo(), P2 = dispositivo();
  sandbox.STATE = P1;
  const idsP = roda(`(function(){ const m = STATE.checklists.modelos[0]; const p = novoChkProjeto(); p.empresa = "Vylor"; const s = novoChkSetor(); s.nome = "Setor P"; p.setores.push(s); STATE.checklists.projetos.push(p); return { p:p.id, s:s.id }; })()`);
  T(await emDia(P1, P2), "preparo (projeto): projeto nos dois aparelhos");
  // o colega (P1) preenche os dados do solicitante
  sandbox.STATE = P1;
  roda(`(function(){ const p = STATE.checklists.projetos[0]; p.solicitanteCpfCnpj = "11.222.333/0001-44"; p.solicitanteTelefone = "(64) 99999-0000"; p.responsavel = "Joao"; p.numeroDocumento = "DOC-A"; p.atualizadoEm = agoraSync(); })()`);
  await sync(P1);
  // o usuario (P2), ainda sem esses dados, mexe em OUTRO campo e fica com o carimbo mais novo
  sandbox.STATE = P2;
  roda(`(function(){ const p = STATE.checklists.projetos[0]; p.art = "ART-9"; p.numeroDocumento = "DOC-B"; p.atualizadoEm = agoraSync(); })()`);
  r = await sync(P2);
  const pP2 = roda("STATE.checklists.projetos[0]");
  T(r.mesclados === 1 && pP2.solicitanteCpfCnpj === "11.222.333/0001-44" && pP2.solicitanteTelefone === "(64) 99999-0000" && pP2.responsavel === "Joao" && pP2.art === "ART-9" && pP2.numeroDocumento === "DOC-B" && pP2.setores.length === 1, "dados do projeto: o preenchido do colega e o do usuario se somam; no campo em disputa vale o mais novo: " + J([r.mesclados, pP2.solicitanteCpfCnpj, pP2.art, pP2.numeroDocumento]));
  T(await emDia(P1, P2), "projeto: os dois aparelhos terminam iguais");
  sandbox.STATE = P1;
  const pP1 = roda("STATE.checklists.projetos[0]");
  T(pP1.solicitanteCpfCnpj === "11.222.333/0001-44" && pP1.art === "ART-9" && pP1.numeroDocumento === "DOC-B" && pP1.setores.length === 1, "projeto: o colega tambem recebe o que o usuario digitou");
  // setor: o mesmo vale
  sandbox.STATE = P1;
  roda(`(function(){ const s = STATE.checklists.projetos[0].setores[0]; s.descricao = "Descricao do colega"; s.atualizadoEm = agoraSync(); })()`);
  await sync(P1);
  sandbox.STATE = P2;
  roda(`(function(){ const s = STATE.checklists.projetos[0].setores[0]; s.nome = "Setor P (renomeado)"; s.atualizadoEm = agoraSync(); })()`);
  await sync(P2);
  T(roda("STATE.checklists.projetos[0].setores[0].descricao") === "Descricao do colega" && roda("STATE.checklists.projetos[0].setores[0].nome") === "Setor P (renomeado)", "setor: nome do usuario e descricao do colega se somam");
  T(await emDia(P1, P2) && difere(P1.checklists.projetos, P2.checklists.projetos) === "", "setor: iguais nos dois aparelhos");

  // ---------------------------------------------------------------- 16b) a copia que discorda fica; quando a pessoa acerta a diferenca, na rodada seguinte ela e juntada sozinha
  const E2 = dispositivo();
  sandbox.STATE = E2;
  roda(`(function(){
    const mk = (nome, conf, extra) => Object.assign({ id: uid(), nome, criadoEm: 100, modeloId: "M", status: "em_andamento", dataFinalizacao: null, secoesNA: [], laudo: {}, descricao: "", conclusaoTexto: "", fotoAmpla: "",
      itens: conf.map((c, k) => ({ itemId: "i" + k, conforme: c, motivosSelecionados: [], observacao: "", fotos: [] })), atualizadoEm: 5 }, extra || {});
    const p = novoChkProjeto(); const s = novoChkSetor();
    s.linhas.push(mk("Secador 203", ["atende", "naoAtende"]), mk("Secador 203 (versão de 07/10 15:09)", ["atende", "na"]));
    p.setores.push(s); STATE.checklists.projetos.push(p);
  })()`);
  const contar = roda("chkConsolidarCopiasLinhas(STATE, true)");
  T(contar.fundidas === 0 && contar.mantidas === 1 && roda("STATE.checklists.projetos[0].setores[0].linhas.length") === 2, "copia que discorda (resposta diferente no mesmo item): so conta, nao junta, e nao mexe em nada");
  roda("STATE.checklists.projetos[0].setores[0].linhas[0].itens[1].conforme = 'na'"); // a pessoa acerta a diferenca no original
  const contar2 = roda("chkConsolidarCopiasLinhas(STATE, true)");
  T(contar2.fundidas === 1 && roda("STATE.checklists.projetos[0].setores[0].linhas.length") === 2, "acertada a diferenca, a copia passa a ser 'juntavel' (a contagem nao altera nada)");
  const feito = roda("chkConsolidarCopiasLinhas(STATE)");
  T(feito.fundidas === 1 && roda("STATE.checklists.projetos[0].setores[0].linhas.length") === 1 && roda("STATE.checklists.projetos[0].setores[0].linhas[0].nome") === "Secador 203", "juntada: sobra so o original, com o nome original");

  // ---------------------------------------------------------------- 16c) item deixado em branco de proposito no original quase completo: a copia nao preenche sozinha
  const E3 = dispositivo();
  sandbox.STATE = E3;
  const r3c = roda(`(function(){
    const mk = (nome, conf, extra) => Object.assign({ id: uid(), nome, criadoEm: 100, modeloId: "M", status: "em_andamento", dataFinalizacao: null, secoesNA: [], laudo: {}, descricao: "", conclusaoTexto: "", fotoAmpla: "",
      itens: conf.map((c, k) => ({ itemId: "i" + k, conforme: c, motivosSelecionados: [], observacao: "", fotos: [] })), atualizadoEm: 5 }, extra || {});
    const p = novoChkProjeto(); const s = novoChkSetor();
    s.linhas.push(mk("Secador 203", ["atende", "atende", "atende", null]), mk("Secador 203 (versão de 07/10 15:09)", ["atende", "atende", "atende", "na"]));
    p.setores.push(s); STATE.checklists.projetos.push(p);
    return chkConsolidarCopiasLinhas(STATE, true);
  })()`);
  T(r3c.fundidas === 0 && r3c.mantidas === 1 && roda("STATE.checklists.projetos[0].setores[0].linhas.length") === 2 && roda("STATE.checklists.projetos[0].setores[0].linhas[0].itens[3].conforme") === null, "original quase completo com um item em branco (talvez proposital): a copia com resposta nesse item fica para a pessoa decidir, o branco nao e preenchido: " + J(r3c));

  // ---------------------------------------------------------------- 13) nomes na nuvem e isolamento
  const pr = roda(`(function(){ const r = chkSyncParseNomes(["l_abc_100.json", "l_abc_200.json", "m_chk-modelo-padrao-linhas-de-vida_50.json", "i_7.json", "x_9.json", "lixo.txt"]); return { l: r.entidades.get("l:abc"), m: r.entidades.get("m:chk-modelo-padrao-linhas-de-vida"), i: r.singles.i, x: r.singles.x }; })()`);
  T(pr.l.ts === 200 && pr.l.nome === "l_abc_200.json" && pr.l.antigos.length === 1 && pr.m.id === "chk-modelo-padrao-linhas-de-vida" && pr.m.ts === 50 && pr.i[0].ts === 7 && pr.x[0].ts === 9, "leitura dos nomes de arquivo da nuvem (id com hifen, versoes antigas, i e x)");
  T(roda(`chkSyncSig({ a:1, b:[1,2] })`) === roda(`chkSyncSig({ b:[1,2], a:1 })`) && roda(`chkSyncSig({ f:"data:image/jpeg;base64,ZZZ" })`) === roda(`chkSyncSig({ f:"idbfoto:" + fotoCalcularId("data:image/jpeg;base64,ZZZ") })`) && roda(`chkSyncSig({ a:1, atualizadoEm:5 }, true)`) === roda(`chkSyncSig({ a:1, atualizadoEm:9 }, true)`) && roda(`chkSyncSig({ a:1 })`) !== roda(`chkSyncSig({ a:2 })`), "assinatura: ignora a ordem das chaves, trata foto embutida e em referencia como a mesma e, se pedido, ignora o carimbo");
  // ---------------------------------------------------------------- 14) fotos que ficam na nuvem (como no Modulo Completo): o texto chega primeiro, a foto depois
  sandbox.STATE = A;
  const idf = (b)=> roda(`fotoCalcularId("data:image/jpeg;base64,${b}")`);
  const ids14 = roda(`(function(){ const m = STATE.checklists.modelos.find(x => x.id === CHK_MODELO_PADRAO_ID); const p = novoChkProjeto(); p.empresa = "Empresa Lazy"; const s = novoChkSetor(); s.nome = "Setor L"; const l = novoChkLinha(m); l.nome = "LV-LAZY"; l.itens[0].fotos = [{ foto:"data:image/jpeg;base64,LAZY1", tags:[] }]; l.itens[1].fotos = [{ foto:"data:image/jpeg;base64,LAZY2", tags:[] }]; s.linhas.push(l); p.setores.push(s); STATE.checklists.projetos.push(p); return { p:p.id, s:s.id, l:l.id }; })()`);
  const semFalha14 = (rr)=> !rr.eventos.some(e => e[4] === false && String(e[1]).includes(ids14.l));
  r = await sync(A);
  T(r.enviou >= 3 && pasta("Backup/Checklist/Fotos").has("f_" + idf("LAZY1") + ".txt"), "a linha com fotos sobe (texto e fotos)");
  sandbox.STATE = B;
  r = await sync(B, { baixarFotos: false });
  const lB14 = ()=> { sandbox.STATE = B; return roda(`STATE.checklists.projetos.find(p => p.id === ${J(ids14.p)}).setores[0].linhas[0]`); };
  T(semFalha14(r) && r.baixou >= 3 && lB14().itens[0].fotos[0].foto === "pendente:" + idf("LAZY1") && lB14().itens[1].fotos[0].foto === "pendente:" + idf("LAZY2"), "celular fora do Wi-Fi: a linha chega so com o texto e as fotos ficam 'pendente:': " + J([r.falhas, r.baixou, lB14().itens[0].fotos[0].foto]));
  const lA14 = ()=> { sandbox.STATE = A; return roda(`STATE.checklists.projetos.find(p => p.id === ${J(ids14.p)}).setores[0].linhas[0]`); };
  T(roda(`chkSyncSig(${J(lA14())}, true)`) === roda(`chkSyncSig(${J(lB14())}, true)`), "foto pendente conta como a mesma foto na assinatura (nao parece alteracao)");
  r = await sync(B, { baixarFotos: false });
  T(r.enviou === 0 && r.baixou === 0 && semFalha14(r), "nova rodada sem fotos: nada sobe nem desce: " + J(r));
  T(roda(`chkFotosPendentesIds({ x: ${J(lB14())} }).size`) === 2 && roda(`chkFotosPendentesIds({ x: ${J(lA14())} }).size`) === 0, "so o aparelho sem as fotos tem pendentes");
  // editar a linha no aparelho que ainda nao tem as fotos: sobe o texto novo e as fotos continuam sendo as mesmas (nenhuma se perde)
  sandbox.STATE = B;
  roda(`(function(){ const l = STATE.checklists.projetos.find(p => p.id === ${J(ids14.p)}).setores[0].linhas[0]; l.itens[2].observacao = "anotei no celular"; })()`);
  r = await sync(B, { baixarFotos: false });
  const nomeL14 = nomesNuvem().filter(n => n.startsWith("l_" + ids14.l + "_"))[0];
  const textoL14 = pasta("Backup/Checklist").get(nomeL14);
  T(r.enviou === 1 && semFalha14(r) && textoL14.includes("idbfoto:" + idf("LAZY1")) && textoL14.includes("idbfoto:" + idf("LAZY2")) && !textoL14.includes("pendente:") && !textoL14.includes("LAZY1"), "editar sem as fotos: sobe o texto com as referencias de sempre, sem 'pendente:' e sem bytes: " + J([r.enviou, r.falhas]));
  sandbox.STATE = A;
  r = await sync(A);
  T(lA14().itens[2].observacao === "anotei no celular" && lA14().itens[0].fotos[0].foto === "data:image/jpeg;base64,LAZY1" && lA14().itens[1].fotos[0].foto === "data:image/jpeg;base64,LAZY2", "a edicao chega no outro aparelho e as fotos dele ficam intactas");
  // agora baixa as fotos (forcado): os 'pendente:' viram foto de verdade e nada sobe
  r = await sync(B, { baixarFotos: true });
  T(r.fotosBaixadas === 2 && lB14().itens[0].fotos[0].foto === "data:image/jpeg;base64,LAZY1" && lB14().itens[1].fotos[0].foto === "data:image/jpeg;base64,LAZY2" && roda(`chkFotosPendentesIds({ x: ${J(lB14())} }).size`) === 0, "baixando as fotos: os pendentes viram foto de verdade: " + J(r.fotosBaixadas));
  r = await sync(B, { baixarFotos: true });
  T(r.enviou === 0 && r.baixou === 0 && await emDia(A, B), "depois de baixar, tudo em dia e nada sobe de novo");
  // foto que ainda nao esta na nuvem: a linha chega e a foto fica pendente (nao derruba a linha); quando chegar, entra
  sandbox.STATE = A;
  roda(`(function(){ const l = STATE.checklists.projetos.find(p => p.id === ${J(ids14.p)}).setores[0].linhas[0]; l.itens[3].fotos = [{ foto:"data:image/jpeg;base64,LAZY3", tags:[] }]; l.atualizadoEm = agoraSync(); })()`);
  await sync(A);
  const textoF3 = pasta("Backup/Checklist/Fotos").get("f_" + idf("LAZY3") + ".txt");
  pasta("Backup/Checklist/Fotos").delete("f_" + idf("LAZY3") + ".txt");
  sandbox.STATE = B;
  roda(`STATE.checklists.projetos.find(p => p.id === ${J(ids14.p)}).setores[0].linhas[0].itens[3].fotos = []`); // B ainda nao tem a foto 3
  r = await sync(B, { baixarFotos: true });
  T(semFalha14(r) && r.baixou >= 1 && lB14().itens[3].fotos[0].foto === "pendente:" + idf("LAZY3"), "foto ainda nao enviada pela outra ponta: a linha chega e a foto fica pendente, sem falha: " + J([r.falhas, r.baixou, lB14().itens[3].fotos[0] && lB14().itens[3].fotos[0].foto]));
  pasta("Backup/Checklist/Fotos").set("f_" + idf("LAZY3") + ".txt", textoF3);
  r = await sync(B, { baixarFotos: true });
  T(r.fotosBaixadas === 1 && lB14().itens[3].fotos[0].foto === "data:image/jpeg;base64,LAZY3", "quando a foto chega na nuvem, a proxima rodada baixa e troca o pendente");
  // limite de fotos por rodada
  sandbox.STATE = B;
  roda(`(function(){ const l = STATE.checklists.projetos.find(p => p.id === ${J(ids14.p)}).setores[0].linhas[0]; l.itens[0].fotos[0].foto = CHK_FOTO_PEND + ${J(idf("LAZY1"))}; l.itens[1].fotos[0].foto = CHK_FOTO_PEND + ${J(idf("LAZY2"))}; })()`);
  r = await sync(B, { baixarFotos: true, limiteFotos: 1 });
  T(r.fotosBaixadas === 1 && r.fotosAdiadas >= 1, "limite por rodada: baixa uma e adia a outra: " + J([r.fotosBaixadas, r.fotosAdiadas]));
  r = await sync(B, { baixarFotos: true, limiteFotos: 1 });
  T(r.fotosBaixadas === 1 && roda(`chkFotosPendentesIds({ x: ${J(lB14())} }).size`) === 0, "a rodada seguinte baixa a que faltava");
  await emDia(A, B);
  sandbox.STATE = estadoOriginal;
}
testarFotoAmpla().then(() => testarTravas()).then(() => testarDadosLaudo()).then(() => testarLaudoCapitulos()).then(() => testarMemorial()).then(() => testarCapitulosNovos()).then(() => testarEdicaoTexto()).then(() => testarFotosLeituraLaudo()).then(() => testarCadastroProjeto()).then(() => testarEditorModelo()).then(() => testarAtalhoLaudo()).then(() => testarCapaLaudo()).then(() => testarUsabilidade()).then(() => testarSincronizacaoChecklist()).then(() => {
  // as arvores do Completo/Simplificado continuam byte a byte identicas apos a foto ampla tambem
  if(JSON.stringify(sandbox.STATE.projetos) !== antesCompleto || JSON.stringify(sandbox.STATE.projetosSimples) !== antesSimples){
    console.error("FALHOU: a foto ampla da linha mexeu em STATE.projetos/projetosSimples");
    process.exit(1);
  }
  console.log("ISOLAMENTO OK: STATE.projetos e STATE.projetosSimples byte a byte identicos apos criar/editar/salvar/vincular/finalizar/excluir na hierarquia Projeto>Setor>Linha do Checklist (motivo de multipla escolha, travas de confirmacao, abas de secao, o painel dividido do editor de modelo com info/foto por item, a importacao de modelo via XLSX -- linha de continuacao, item sem motivo e linha orfa incluidos -- o roundtrip exportar/reimportar modelo via XLSX incluindo secao vazia, o laudo narrativo -- narrativa com destaque e citacao de foto do item nao atende, item nao aplica fora da narrativa e da tabela do checklist -- e a foto ampla da linha -- do rascunho da Nova linha pra linha criada, trocar/remover com confirmacao e foto presa a linha do toque), as travas ao fechar item e ao marcar secao nao aplica, e o laudo em capitulos -- numeracao que acompanha os capitulos ligados, capa com/sem foto, pagina 2 com Normativo, sumario com pagina real em 2 passadas, paginador (gruda no proximo, alternativa, pagina inteira) e conclusao com ART e data em linhas separadas, e as seis migracoes de STATE antigo (namespace ausente, execucoes em lista plana, modelo padrao sem texto padrao, linha com motivo unico do formato antigo, item de modelo sem o campo info, e secao/linha sem contexto/descricao do laudo narrativo) preenchem/reorganizam/atualizam o namespace sem tocar nas duas arvores");
  process.exit(0);
}).catch((e) => { console.error("FALHOU (ensaios assincronos): " + (e && e.message || e)); process.exit(1); });
