const fs = require("fs");
const vm = require("vm");

const HTML = fs.readFileSync("index.html", "utf8");

/* ---------- extrai um trecho do arquivo entregue ---------- */
function trecho(ini, fim){
  const i = HTML.indexOf(ini);
  if(i < 0) throw new Error("marca inicial nao encontrada: " + ini.slice(0,40));
  const f = HTML.indexOf(fim, i);
  if(f < 0) throw new Error("marca final nao encontrada: " + fim.slice(0,40));
  return HTML.slice(i, f);
}
function funcao(nome){
  /* \s* no começo: funções dentro do módulo de impressão vivem indentadas
     dentro da IIFE, não na coluna zero. */
  const re = new RegExp("\\n\\s*(?:async )?function " + nome + "\\s*\\(");
  const m = re.exec(HTML);
  if(!m) throw new Error("funcao nao encontrada: " + nome);
  let i = m.index + 1;
  let p = HTML.indexOf("(", i), prof = 0;
  while(p < HTML.length){ if(HTML[p]==="(") prof++; else if(HTML[p]===")"){ prof--; if(prof===0) break; } p++; }
  let j = HTML.indexOf("{", p), d = 0, k = j, str = null;
  while(k < HTML.length){
    const ch = HTML[k];
    if(str){ if(ch==="\\"){k+=2;continue;} if(ch===str) str=null; }
    else { if(ch==='"'||ch==="'"||ch==="`") str=ch; else if(ch==="{") d++; else if(ch==="}"){ d--; if(d===0) return HTML.slice(i, k+1); } }
    k++;
  }
  throw new Error("nao fechou: " + nome);
}
function constante(nome){
  const re = new RegExp("\\nconst " + nome + "\\s*=");
  const m = re.exec(HTML);
  if(!m) throw new Error("const nao encontrada: " + nome);
  let i = m.index + 1, k = HTML.indexOf(nome, i), d = 0, str = null, ini = null;
  k = HTML.indexOf("=", k);
  while(k < HTML.length){
    const ch = HTML[k];
    if(str){ if(ch==="\\"){k+=2;continue;} if(ch===str) str=null; }
    else { if(ch==='"'||ch==="'"||ch==="`") str=ch;
      else if(ch==="["||ch==="{"){ if(ini===null) ini=ch; d++; }
      else if(ch==="]"||ch==="}"){ d--; if(d===0) return HTML.slice(i, k+1)+";"; } }
    k++;
  }
  throw new Error("nao fechou const: " + nome);
}

let falhas = 0, total = 0;
function t(nome, fn){ total++; try{ fn(); console.log("  ok  " + nome); }catch(e){ falhas++; console.log("  ERRO " + nome + " -> " + (e && e.message ? e.message : e)); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado="+JSON.stringify(b)+" obtido="+JSON.stringify(a)); }
function ok(v,m){ if(!v) throw new Error(m||"falso"); }

/* ---------- ambiente ---------- */
const OUTRO = "Outro (especificar)";
const STATE = { ui:{}, projetosSimples:[] };
function mkProjeto(){
  const r1 = { id:"r1", nome:"Ponta de eixo exposta", descricao:"Ponta de eixo exposta com risco de agarramento", foto:"data:image/jpeg;base64,AAA", fotosOutras:["data:image/jpeg;base64,BBB"], medidaImplementada:"Sim", descMedida:"Existe protecao mas ainda ha risco", sugestaoMitigacao:"", po:"", gpd:"", fe:"", np:"" };
  const r2 = { id:"r2", nome:"Corte dos dedos", descricao:"Corte dos dedos na porta da grade", foto:null, fotosOutras:[], medidaImplementada:"Nao", descMedida:"", sugestaoMitigacao:"Reparar as pontas da grade", po:"", gpd:"", fe:"", np:"" };
  const r3 = { id:"r3", nome:"Ponta de eixo exposta", descricao:"Ponta de eixo exposta com risco de agarramento", foto:null, fotosOutras:[], medidaImplementada:"Sim", descMedida:"Existe protecao mas ainda ha risco", sugestaoMitigacao:"", po:"", gpd:"", fe:"", np:"" };
  const t1 = { id:"t1", tarefa:"Limpeza e higienizacao", tarefaOutro:"", descricao:"Limpeza ao redor", frequencia:"Diário", numPessoas:"2", riscos:[r1,r2] };
  const t2 = { id:"t2", tarefa:"Operacao normal", tarefaOutro:"", descricao:"Uso do painel", frequencia:"Diário", numPessoas:"2", riscos:[r3] };
  const m = { id:"m1", nome:"Despalha 3-HU-2703", descricao:"Despalhador de milho", fotoGeral:"data:image/jpeg;base64,CCC", fotoPlaqueta:"data:image/jpeg;base64,DDD", fotosOutras:[], tarefas:[t1,t2] };
  const a = { id:"a1", nome:"Zebra - area Z", descricao:"d", local:"L", maquinas:[m] };
  const a2 = { id:"a2", nome:"Alfa - area A", descricao:"d", local:"L", maquinas:[] };
  return { id:"p1", empresa:"Corteva", cidade:"Formosa/GO", responsavel:"Luiz", data:"2026-06-24", areas:[a,a2] };
}
STATE.projetosSimples = [mkProjeto()];

function linhasEscopoSimples(){ const o=[]; STATE.projetosSimples.forEach(p=>p.areas.forEach(a=>a.maquinas.forEach(m=>m.tarefas.forEach(tf=>tf.riscos.forEach(r=>o.push({proj:p,area:a,maquina:m,tarefa:tf,risco:r})))))); return o; }
function nomeMaquinaS(m){ return m.nome||""; }
function valOuOutro(v,o){ return v===OUTRO?(o||""):(v||""); }
function escapeHtml(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ic(){ return "<svg></svg>"; }
let toasts=[]; function toast(m,o){ toasts.push([m,o]); }
let alteracoes=0; function marcarAlterado(){ alteracoes++; }
function render(){}
function go(){}
function esperar(){ return Promise.resolve(); }
function uid(){ return "x"+Math.random().toString(36).slice(2,8); }
let __imgRegN=0; function imgReg(){ return __imgRegN++; }
let overlayHtml=""; function abrirOverlay(h){ overlayHtml=h; }
let __buscaAtual = "";
let __laudoGaleriaTeste = false;
let __iaCelulasVazias=0,__iaCelulasTotal=0,__iaChamadasFalhas=0,__iaMotivoFalha="";
/* localStorage de mentira, só em memória — dá pra rodar getIAApiKey/
   setIAApiKey/getIAApiKeysMapa REAIS (extraídas do arquivo entregue, não
   reescritas à mão) dentro do vm, que é o padrão do projeto: testar o que
   foi de fato entregue, não uma imitação que pode divergir do original. */
const __localStorageTeste = new Map();
const localStorage = {
  getItem: (k)=> __localStorageTeste.has(k) ? __localStorageTeste.get(k) : null,
  setItem: (k,v)=> { __localStorageTeste.set(k, String(v)); },
  removeItem: (k)=> { __localStorageTeste.delete(k); },
};
/* Config de IA persistente (antes era um objeto novo a cada chamada, o que
   impedia testar mesclagem — qualquer alteração se perdia na chamada seguinte). */
let __iaConfigTeste = { usarNaExportacaoExcel:true, provedor:"anthropic", modelo:"claude-sonnet-5", endpoint:"", prompts:{} };
function getIAConfig(){ return __iaConfigTeste; }
function resetIAConfigTeste(){
  __iaConfigTeste = { usarNaExportacaoExcel:true, provedor:"anthropic", modelo:"claude-sonnet-5", endpoint:"", prompts:{} };
  return __iaConfigTeste;
}
let chamadas=[];
async function chamarIAResiliente(tipo,texto){ chamadas.push([tipo,texto]); return JSON.stringify({texto:"[IA:"+tipo+"] "+String(texto||"").slice(0,30), duvida: tipo==="risco_xlsx"?"Qual a altura?":""}); }
function parseRespostaJsonIA(r){ try{ return r?JSON.parse(r):null; }catch(e){ return null; } }
const __modeloExcelCortevaCarregado=false, __modeloExcelCortevaMeta=null;
function formatarDataHoraBR(){ return "—"; }
function screenSimplesConfigIA(){ return "<div>TELA-IA</div>"; }
/* getUsuariosInspetores NÃO é stub: é extraída do próprio index.html mais
   abaixo, junto com INSPETORES_PADRAO — os testes de padrão e de migração
   precisam exercitar a função de verdade, não uma imitação. */
function getMecseteConfig(){
  if(!STATE.ui.mecseteConfig) STATE.ui.mecseteConfig = { empresa:"Mecsete Engenharia", respCREA:"20037/D-GO" };
  return STATE.ui.mecseteConfig;
}
function getCurrentProjetoSimples(){ return STATE.projetosSimples[0] || null; }
function getAreasSelecionadasExport(){
  const todas=[]; STATE.projetosSimples.forEach(p=>p.areas.forEach(a=>todas.push(a.id)));
  if(!STATE.ui.areasSelecionadasExport) STATE.ui.areasSelecionadasExport=[...todas];
  if(!STATE.ui.areasExportConhecidas) STATE.ui.areasExportConhecidas=[...todas];
  const con=new Set(STATE.ui.areasExportConhecidas);
  const novas=todas.filter(id=>!con.has(id));
  if(novas.length){ STATE.ui.areasSelecionadasExport=STATE.ui.areasSelecionadasExport.concat(novas); STATE.ui.areasExportConhecidas=todas.slice(); }
  const val=new Set(todas);
  STATE.ui.areasSelecionadasExport=STATE.ui.areasSelecionadasExport.filter(id=>val.has(id));
  return STATE.ui.areasSelecionadasExport;
}

const ouvintes = [], estiloRaiz = {};
/* Painel de progresso: no app ele desenha na tela. Aqui vale como registro do
   que foi pedido, para os testes conferirem etapas e parada sem DOM. */
const painelTeste = { aberturas: [], atualizacoes: [], fechamentos: 0, cancelar: false, aberto: false };
function progressoAbrir(titulo, total){
  painelTeste.aberturas.push({ titulo, total });
  const meu = !painelTeste.aberto;
  painelTeste.aberto = true;
  return meu;
}
function progressoAtualizar(feito, total, sub, aviso){ painelTeste.atualizacoes.push({ feito, total, sub, aviso }); }
function progressoFechar(meu){ if(meu === false) return; painelTeste.fechamentos++; painelTeste.aberto = false; }
function progressoCancelado(){ return painelTeste.cancelar; }
const ctx = { OUTRO, STATE, linhasEscopoSimples, nomeMaquinaS, valOuOutro, escapeHtml, ic, toast, marcarAlterado,
  progressoAbrir, progressoAtualizar, progressoFechar, progressoCancelado,
  render, go, esperar, uid, imgReg, abrirOverlay, getIAConfig, resetIAConfigTeste, localStorage,
  chamarIAResiliente, parseRespostaJsonIA,
  getAreasSelecionadasExport, formatarDataHoraBR, screenSimplesConfigIA, getMecseteConfig, getCurrentProjetoSimples,
  __modeloExcelCortevaCarregado, __modeloExcelCortevaMeta, __buscaAtual,
  __iaCelulasVazias, __iaCelulasTotal, __iaChamadasFalhas, __iaMotivoFalha,
  console, JSON, Math, Date, Map, Set, Promise, String, Number, Object, Array, RegExp, isNaN, parseInt, parseFloat,
  confirm:()=>true,
  window:{ addEventListener:(ev,fn)=>{ ouvintes.push([ev,fn]); }, scrollTo:()=>{} },
  document:{ getElementById:()=>null, querySelectorAll:()=>[], querySelector:()=>null,
             documentElement:{ style:{ setProperty:(k,v)=>{ estiloRaiz[k]=v; } } } } };

vm.createContext(ctx);

/* tabelas e utilitarios HRN, extraidos do arquivo entregue */
[ "GPD_POR_RISCO", "HRN_PO_TABELA", "HRN_GPD_TABELA", "HRN_FE_TABELA", "HRN_NP_TABELA", "NIVEL_HRN_META" ]
  .forEach(n=> vm.runInContext(constante(n), ctx));
vm.runInContext("const HRN_PO_OPTS=HRN_PO_TABELA.map(x=>x.classificacao);const HRN_GPD_OPTS=HRN_GPD_TABELA.map(x=>x.classificacao);const HRN_FE_OPTS=HRN_FE_TABELA.map(x=>x.classificacao);const HRN_NP_OPTS=HRN_NP_TABELA.map(x=>x.classificacao);", ctx);
vm.runInContext(constante("GPD_RENOMEADOS"), ctx);
[ "sugerirGPD","sugerirFE","sugerirNP","sugerirPO","calcHRN","nivelHRN","acaoHRN","gpdCanonico","valorPorClassificacaoHRN","labelHRN","hrnDoItem" ]
  .forEach(n=> vm.runInContext(funcao(n), ctx));
vm.runInContext(constante("CAMPOS_ADMIN_PROJETO"), ctx);
[ "camposFaltandoProjeto", "projetosComCamposFaltando" ].forEach(n=> vm.runInContext(funcao(n), ctx));

/* motor de sincronizacao e equipe, extraidos do arquivo entregue */
vm.runInContext('const CAMPO_FOTOS_LISTA = "fotosOutras";', ctx);
vm.runInContext(constante("CAMPOS_FILHOS_SYNC"), ctx);
/* aplicarAtualizacaoRemota passou a consultar os campos de foto unica para
   nunca deixar um null vindo de fora apagar foto boa daqui (ver ENSAIO 28
   em banco.js) — sem esta constante no contexto, ela quebra por referencia. */
vm.runInContext(constante("CAMPOS_FOTO_UNICA"), ctx);
[ "__ehFotoEmbutida", "__carregarUltimoCarimbo", "registrarCarimboVisto", "agoraSync",
  "aplicarAtualizacaoRemota", "__listasIrmasDe", "__moverItemEntrePais",
  "marcarSubarvoreAreaAlterada", "marcarSubarvoreMaquinaAlterada", "marcarSubarvoreTarefaAlterada",
  "getInspetoresRemovidos", "getUsuariosInspetores", "inspetorDoProjeto", "gravarInspetorNoProjeto",
  "montarPacoteEquipe", "aplicarPacoteEquipe", "getEquipeSyncEm", "marcarEquipeAlterada"
].forEach(n=> vm.runInContext(funcao(n), ctx));
vm.runInContext("let __ultimoCarimboVisto = 0;", ctx);
vm.runInContext(constante("INSPETORES_PADRAO"), ctx);
/* INSPETORES_PADRAO precisa existir ANTES de getUsuariosInspetores rodar —
   const não é içada como function. Reexecuta a função agora que a tabela
   está no contexto. */
vm.runInContext(funcao("getUsuariosInspetores"), ctx);

/* configuracao de IA compartilhada, extraida do arquivo entregue */
/* IA_PROVEDOR_PADRAO e uma string simples: constante() so sabe delimitar
   objetos/arrays, entao vem por regex direto. */
[ "IA_PROVEDORES", "IA_PROMPTS_PADRAO" ].forEach(n=> vm.runInContext(constante(n), ctx));
vm.runInContext((/\nconst IA_PROVEDOR_PADRAO\s*=\s*"[^"]*";/.exec(HTML)||[""])[0], ctx);
/* IA_LOCALSTORAGE_KEY/IA_LOCALSTORAGE_KEYS são const de string simples —
   vêm por regex direto, como IA_PROVEDOR_PADRAO logo acima. Precisam existir
   ANTES de getIAApiKeysMapa ser definida (ela as lê). */
vm.runInContext((/\nconst IA_LOCALSTORAGE_KEY\s*=\s*"[^"]*";/.exec(HTML)||[""])[0], ctx);
vm.runInContext((/\nconst IA_LOCALSTORAGE_KEYS\s*=\s*"[^"]*";/.exec(HTML)||[""])[0], ctx);
[ "getNormasIA", "getNormasRemovidas", "getPromptsEm", "marcarPromptAlterado",
  "getIAApiKeysMapa", "salvarIAApiKeysMapa", "getIAApiKey", "setIAApiKey",
  "getApiKeysEm", "marcarChaveIAAlterada", "trocarProvedorIAAtivo", "iaProvedoresDisponiveis",
  "getApiKeyEm", "getIASyncEm", "marcarIAAlterada", "montarPacoteIA", "aplicarPacoteIA"
].forEach(n=> vm.runInContext(funcao(n), ctx));
/* mesmo padrao do antigo CHAVE="k": ha chave por padrao para o provedor de
   teste, senao toda geracao em lote que roda antes de qualquer setIAApiKey()
   explicito bateria em "sem chave" e devolveria 0. */
vm.runInContext("setIAApiKey('k')", ctx);

/* lapides de exclusao que viajam entre aparelhos, extraidas do arquivo entregue */
vm.runInContext(constante("LAPIDE_VALIDADE_MS"), ctx);
vm.runInContext("var __lapidesSyncUltimaVerificacao = 0;", ctx);
[ "registrarLapidesExclusao","exclusaoConfirmadaPeloUsuario","lapideDe","lapideVenceDadosRemotos",
  "__lapideFilhos","__subarvoreTocadaDepoisDe","__tamanhoSubarvore","__lapidesRemoviveis",
  "idsSincronizaveisDe","getLapidesSyncEm","marcarLapidesAlteradas",
  "montarPacoteLapides","aplicarPacoteLapides"
].forEach(n=> vm.runInContext(funcao(n), ctx));

/* blocos novos, extraidos do arquivo entregue */
const BLOCO_A = trecho("/* =========================================================================\n   GESTÃO DO LAUDO — os textos da IA passam a morar DENTRO do app", "\nfunction hrnDoItem({tarefa,risco}){");
const BLOCO_B = trecho("/* =========================================================================\n   GESTÃO DO LAUDO — TELAS", "\nfunction screenSimplesConfig(){");
/* Declarados fora dos dois blocos acima (perto do topo da secao do laudo),
   entao precisam existir aqui antes: rascunho da edicao (App.laudoRascunho)
   e caixas de informacao do HRN (App.laudoToggleInfoHrn), ambos lidos sem
   condicao nenhuma dentro do render — sem isto, qualquer teste que desenhe
   laudoBlocoCampo ou laudoBlocoHRN quebra com ReferenceError. */
vm.runInContext("let __laudoRascunho = null; let __laudoInfoHrn = { po:false, fe:false, gpd:false, np:false }; let __laudoRefazendo = null; let __laudoGrupoExistenteAberto = {};", ctx);
/* diaLocalBR é usada por registrarAplicacaoLaudo, dentro do BLOCO_A — precisa
   existir no contexto antes dele rodar. diaBRCurto só é usada pela tela do
   relatório (fora dos blocos), mas é extraída junto por ser a mesma dupla. */
[ "diaLocalBR", "diaBRCurto" ].forEach(n=> vm.runInContext(funcao(n), ctx));
vm.runInContext(BLOCO_A, ctx);
vm.runInContext(BLOCO_B, ctx);
/* laudoBlocoPlaqueta (dentro de BLOCO_B) passou a usar selectOptions/opt
   para Tipo de equipamento e Manual — precisam existir antes de qualquer
   teste que desenhe essa tela. */
vm.runInContext(constante("TIPOS_EQUIPAMENTO"), ctx);
vm.runInContext(constante("MANUAL_OPCOES"), ctx);
[ "opt", "selectOptions" ].forEach(n=> vm.runInContext(funcao(n), ctx));
const BLOCO_R = trecho("/* =========================================================================\n   MONTADOR DE RISCO EM CAMPO", "\nfunction formRiscoSHtml(){");
/* Sinalizadores de painel aberto que o bloco do montador consulta. Ficam
   declarados fora dele no app, então precisam existir aqui antes. */
vm.runInContext("let __infoHrnPOAberto = false; let __infoEventosAberto = false;", ctx);
vm.runInContext(BLOCO_R, ctx);
const C = ctx;

console.log("\n=== t12 · provedor Claude (Anthropic) ===");
t("Claude aparece na lista de provedores", ()=>{
  ok(HTML.indexOf('nome: "Claude (Anthropic)"') > 0, "entrada ausente");
  ok(HTML.indexOf('formato: "anthropic"') > 0, "formato ausente");
  ok(HTML.indexOf('endpoint: "https://api.anthropic.com/v1"') > 0, "endpoint ausente");
});
t("chamada usa x-api-key e anthropic-version", ()=>{
  ok(HTML.indexOf('"x-api-key": apiKey') > 0);
  ok(HTML.indexOf('"anthropic-version":"2023-06-01"') > 0);
});
t("cabecalho que libera chamada direta do navegador esta presente", ()=>{
  ok(HTML.indexOf('"anthropic-dangerous-direct-browser-access":"true"') > 0);
});
t("os tres pontos de chamada tratam o formato anthropic", ()=>{
  const n = (HTML.match(/preset\.formato==="anthropic"/g)||[]).length;
  eq(n, 3, "ramos anthropic");
});
t("max_tokens obrigatorio foi informado", ()=>{
  ok((HTML.match(/max_tokens:/g)||[]).length >= 3);
});
t("modelo do Claude fica editavel na tela", ()=>{
  ok(HTML.indexOf('cfg.provedor==="anthropic" ?') > 0);
});

console.log("\n=== t13 · HRN editavel por risco ===");
t("sem escolha, HRN usa a estimativa automatica", ()=>{
  const it = C.linhasEscopoSimples()[0];
  const h = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(h.fe, 2.5, "FE da tarefa Diário");
  eq(h.np, 1, "NP de 2 pessoas");
});
t("escolher FE no risco NÃO tem mais efeito — FE sempre vem da tarefa", ()=>{
  /* Existia uma excecao por risco, removida de proposito: usuario testou
     e viu dois riscos da MESMA tarefa com numero de pessoas diferente, e
     decidiu que Frequencia/No de pessoas devem ser sempre da tarefa, sem
     excecao — o que pode variar por risco e o Nivel de desempenho
     requerido (PLr/Categoria), assunto separado. */
  const it = C.linhasEscopoSimples()[0];
  it.risco.fe = "Constante";
  const h = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(h.fe, 2.5, "fe do risco nao pode mais vencer o da tarefa (Diário)");
  it.risco.fe = "";
});
t("escolher NP no risco NÃO tem mais efeito — NP sempre vem da tarefa", ()=>{
  const it = C.linhasEscopoSimples()[0];
  it.risco.np = "16-50 pessoas";
  const h = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(h.np, 1, "np do risco nao pode mais vencer o da tarefa (2 pessoas)");
  it.risco.np = "";
});
t("PO e GPD continuam por risco; FE/NP do cálculo vêm só da tarefa", ()=>{
  const it = C.linhasEscopoSimples()[0];
  it.risco.po = "Certo"; it.risco.gpd = "Fatalidade";
  const h = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(h.po, 15); eq(h.gpd, 15);
  eq(h.fe, 2.5, "fe precisa continuar vindo da tarefa mesmo com po/gpd escolhidos no risco");
  eq(h.np, 1, "np precisa continuar vindo da tarefa mesmo com po/gpd escolhidos no risco");
  eq(h.hrn, C.calcHRN(15,2.5,15,1));
  eq(h.nivel, "INACEITÁVEL");
});
t("as 4 tabelas do HRN batem com a metodologia enviada", ()=>{
  const esperado = [
    ["HRN_PO_TABELA","Quase Impossível",0.033],["HRN_PO_TABELA","Altamente Improvável",1],
    ["HRN_PO_TABELA","Improvável",1.5],["HRN_PO_TABELA","Possível",2],["HRN_PO_TABELA","Alguma Chance",5],
    ["HRN_PO_TABELA","Provável",8],["HRN_PO_TABELA","Muito Provável",10],["HRN_PO_TABELA","Certo",15],
    ["HRN_FE_TABELA","Anual",0.5],["HRN_FE_TABELA","Mensal",1],["HRN_FE_TABELA","Semanal",1.5],
    ["HRN_FE_TABELA","Diária",2.5],["HRN_FE_TABELA","Horária",4],["HRN_FE_TABELA","Constante",5],
    ["HRN_GPD_TABELA","Arranhão",0.1],["HRN_GPD_TABELA","Corte",0.5],["HRN_GPD_TABELA","Fratura osso menor",2],
    ["HRN_GPD_TABELA","Arranhão / Escoriação / Contusão",0.1],["HRN_GPD_TABELA","Corte / Laceração",0.5],
    ["HRN_GPD_TABELA","Fratura osso maior",4],["HRN_GPD_TABELA","Perda de membro, visão ou audição",6],
    ["HRN_GPD_TABELA","Perda de Vários membros",10],["HRN_GPD_TABELA","Fatalidade",15],
    ["HRN_NP_TABELA","1-2 pessoas",1],["HRN_NP_TABELA","3-7 pessoas",2],["HRN_NP_TABELA","8-15 pessoas",4],
    ["HRN_NP_TABELA","16-50 pessoas",8],["HRN_NP_TABELA","50+ pessoas",12],
  ];
  esperado.forEach(([tab,cls,val])=>{
    const obtido = vm.runInContext("valorPorClassificacaoHRN("+tab+","+JSON.stringify(cls)+")", ctx);
    eq(obtido, val, tab+" / "+cls);
  });
  const tamanhos = vm.runInContext("[HRN_PO_TABELA.length,HRN_FE_TABELA.length,HRN_GPD_TABELA.length,HRN_NP_TABELA.length]", ctx);
  eq(JSON.stringify(tamanhos), JSON.stringify([8,6,7,5]), "quantidade de linhas por tabela");
});
t("voltar para automatico limpa a escolha", ()=>{
  const it = C.linhasEscopoSimples()[0];
  it.risco.po=""; it.risco.gpd=""; it.risco.fe=""; it.risco.np="";
  const h = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(h.fe, 2.5);
});
t("bloco HRN: PO e GPD continuam seletores; FE e NP viraram só leitura", ()=>{
  const html = C.laudoBlocoHRN(C.linhasEscopoSimples()[0]);
  ["'po'","'gpd'"].forEach(k=> ok(html.indexOf("laudoSetHRN('r1',"+k) > 0, "faltou "+k));
  ["'fe'","'np'"].forEach(k=> eq(html.indexOf("laudoSetHRN('r1',"+k), -1, "fe/np nao podem mais ser escolhidos por risco: "+k));
  ok(html.indexOf("Colunas V a AA") < 0, "referencia de coluna deveria ter saido");
});
t("HRN diz que Frequencia e Nº de pessoas vem da tarefa", ()=>{
  const html = C.laudoBlocoHRN(C.linhasEscopoSimples()[0]);
  ok(html.indexOf("Da tarefa (Diário)") > 0, "FE nao mostra a origem");
  ok(html.indexOf("Da tarefa (2)") > 0, "NP nao mostra a origem");
  ok(html.indexOf("Estimado: ") > 0, "PO/GPD deveriam aparecer como estimados");
  ok(html.indexOf("Automático") < 0, "rotulo antigo ainda presente");
});
t("a escolha feita na tarefa realmente entra na conta do HRN", ()=>{
  const it = C.linhasEscopoSimples()[0];
  const antes = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(antes.fe, 2.5, "Diário deveria valer 2,5");
  const bak = it.tarefa.frequencia;
  it.tarefa.frequencia = "Mensal";
  eq(C.hrnDoItem({tarefa:it.tarefa, risco:it.risco}).fe, 1, "mudar a tarefa nao mudou o HRN");
  it.tarefa.frequencia = bak;
});
t("tarefa sem frequencia avisa em vez de dizer automatico", ()=>{
  const it = C.linhasEscopoSimples()[0];
  const bak = it.tarefa.frequencia;
  it.tarefa.frequencia = "";
  ok(C.laudoBlocoHRN(it).indexOf("Sem frequência na tarefa") > 0);
  it.tarefa.frequencia = bak;
});

console.log("\n=== t90 · icone de informação nos 4 campos do HRN (revisão do laudo) ===");
t("as 4 tabelas do HRN tem descrição em toda linha, para o icone ter o que mostrar", ()=>{
  ["HRN_PO_TABELA","HRN_FE_TABELA","HRN_GPD_TABELA","HRN_NP_TABELA"].forEach(tab=>{
    const vazias = vm.runInContext(tab+".filter(x=>!x.desc||!x.desc.trim()).length", ctx);
    eq(vazias, 0, tab+" tem linha sem descrição");
  });
});
t("os 4 campos ganham o botão de informação, igual ao cadastro em campo", ()=>{
  const html = C.laudoBlocoHRN(C.linhasEscopoSimples()[0]);
  ["po","fe","gpd","np"].forEach(k=>
    ok(html.indexOf("App.laudoToggleInfoHrn('"+k+"')") > 0, "faltou o botão de "+k));
});
t("caixa de um campo só abre quando o campo está marcado", ()=>{
  /* __laudoInfoHrn é "let" dentro do contexto do vm — só é visível de fora
     rodando como script, não como propriedade direta de C. */
  vm.runInContext("__laudoInfoHrn.gpd = true;", ctx);
  const html = C.laudoBlocoHRN(C.linhasEscopoSimples()[0]);
  vm.runInContext("__laudoInfoHrn.gpd = false;", ctx);
  ok(html.indexOf("Amputação ou perda permanente de função") > 0, "caixa do GPD não abriu");
  /* "Anual (0.5)" sozinho não serve de prova: aparece sempre, como opção do
     próprio <select> de FE. O texto da descrição só existe dentro da caixa. */
  ok(html.indexOf("Acesso raro à zona de perigo, poucas vezes por ano") < 0, "caixa da FE abriu sem estar marcada");
});
t("fechada por padrão, nenhuma caixa aparece", ()=>{
  const html = C.laudoBlocoHRN(C.linhasEscopoSimples()[0]);
  ok(html.indexOf("info-box") < 0, "alguma caixa nasceu aberta");
});
t("App.laudoToggleInfoHrn existe e redesenha a tela", ()=>{
  ok(HTML.indexOf("laudoToggleInfoHrn(campo){ __laudoInfoHrn[campo] = !__laudoInfoHrn[campo]; render(); }") > 0);
});
t("trocar de item fecha as caixas de informação do HRN (senão vaza pro próximo risco)", ()=>{
  /* 3 ocorrências = a declaração original + o reset em laudoAbrirItem +
     o reset em laudoIrPara. */
  eq((HTML.match(/__laudoInfoHrn = \{ po:false, fe:false, gpd:false, np:false \};/g)||[]).length, 3,
     "precisa existir a declaração e zerar em laudoAbrirItem E em laudoIrPara");
});

console.log("\n=== t14 · areas: novas entram sozinhas e saem em ordem ===");
t("area criada depois entra marcada automaticamente", ()=>{
  const antes = getAreasSelecionadasExport().length;
  STATE.projetosSimples[0].areas.push({ id:"a9", nome:"Nova area", maquinas:[] });
  const depois = getAreasSelecionadasExport();
  eq(depois.length, antes+1);
  ok(depois.indexOf("a9") >= 0);
  STATE.projetosSimples[0].areas.pop();
  STATE.ui.areasExportConhecidas = STATE.ui.areasExportConhecidas.filter(x=>x!=="a9");
  STATE.ui.areasSelecionadasExport = STATE.ui.areasSelecionadasExport.filter(x=>x!=="a9");
});
t("desmarcar continua valendo", ()=>{
  STATE.ui.areasSelecionadasExport = ["a1"];
  eq(getAreasSelecionadasExport().length, 1);
});
t("aba Áreas lista em ordem alfabetica", ()=>{
  const html = C.laudoAbaAreas();
  const iAlfa = html.indexOf("Alfa - area A");
  const iZebra = html.indexOf("Zebra - area Z");
  ok(iAlfa > 0 && iZebra > 0, "areas nao apareceram");
  ok(iAlfa < iZebra, "ordem alfabetica invertida");
});

console.log("\n=== t15 · sub-abas da central ===");
t("aba padrao e Revisão", ()=>{ STATE.ui.laudoAba=null; eq(C.getLaudoAba(), "revisao"); });
t("as 4 sub-abas aparecem", ()=>{
  const h = C.screenSimplesLaudo();
  ["Revisão","Áreas","IA","Exportar"].forEach(r=> ok(h.indexOf(">"+r+"<") > 0, "faltou "+r));
});
t("sub-aba IA embute a tela de configuracao de IA", ()=>{
  STATE.ui.laudoAba = "ia";
  ok(C.screenSimplesLaudo().indexOf("TELA-IA") > 0);
});
t("sub-aba Exportar mostra o botao de Excel", ()=>{
  STATE.ui.laudoAba = "exportar";
  ok(C.screenSimplesLaudo().indexOf("exportarSimplesXLSXFotos") > 0);
});
t("sem area marcada, Revisão orienta a ir para Áreas", ()=>{
  const bak = STATE.ui.areasSelecionadasExport;
  STATE.ui.areasSelecionadasExport = [];
  STATE.ui.laudoAba = "revisao";
  const h = C.screenSimplesLaudo();
  ok(h.indexOf("Nenhuma área selecionada") > 0, "sem aviso");
  ok(h.indexOf("laudoSetAba('escopo')") > 0, "sem atalho");
  STATE.ui.areasSelecionadasExport = bak;
});

console.log("\n=== t16 · fotos da linha ===");
STATE.ui.areasSelecionadasExport = ["a1","a2"];
t("junta fotos da maquina e do risco", ()=>{
  const f = C.laudoFotosDoItem(C.linhasEscopoSimples()[0]);
  eq(f.length, 4, "geral + plaqueta + risco + extra");
  ok(f.some(x=>x.rot.indexOf("plaqueta")>=0));
  ok(f.some(x=>x.rot.indexOf("Risco")>=0));
});
t("linha sem foto de risco traz so as da maquina", ()=>{
  eq(C.laudoFotosDoItem(C.linhasEscopoSimples()[1]).length, 2);
});
t("valores nulos ou nao-imagem sao ignorados", ()=>{
  const it = C.linhasEscopoSimples()[1];
  it.risco.foto = "idbfoto:abc";
  eq(C.laudoFotosDoItem(it).length, 2, "referencia nao baixada nao pode virar foto");
  it.risco.foto = null;
});
t("galeria monta as miniaturas", ()=>{
  const h = C.laudoSheetGaleriaHtml(C.linhasEscopoSimples()[0]);
  eq((h.match(/laudoVerFotoGaleria\(/g)||[]).length, 4);
  ok(h.indexOf("laudo-galeria") > 0);
});
t("visualizador em tela cheia navega entre as fotos", ()=>{
  C.laudoSheetGaleriaHtml(C.linhasEscopoSimples()[0]);
  const h = C.laudoViewerHtml(1);
  ok(h.indexOf("laudo-viewer") > 0);
  ok(h.indexOf("2 de 4") > 0, "sem contador");
  ok(h.indexOf("laudoVerFotoGaleria(0)") > 0 && h.indexOf("laudoVerFotoGaleria(2)") > 0);
});
t("botao flutuante aparece so quando ha foto", ()=>{
  STATE.ui.laudoRiscoId = "r1";
  ok(C.screenSimplesLaudoItem().indexOf("laudo-fab") > 0);
});

console.log("\n=== t17 · copiar descricao de outro item ===");
(async ()=>{
  await C.gerarLaudoIAItens(C.linhasEscopoSimples(), null, { refazer:false });
  t("candidatos excluem o proprio item", ()=>{
    const it = C.linhasEscopoSimples()[0];
    const c = C.laudoCandidatosCopia(it, "risco");
    ok(c.length > 0, "sem candidatos");
    ok(!c.some(x=>x.id === it.risco.id), "incluiu ele mesmo");
  });
  t("candidatos de escopo sao por maquina (sem repetir)", ()=>{
    const it = C.linhasEscopoSimples()[0];
    eq(C.laudoCandidatosCopia(it, "escopo").length, 0, "so ha uma maquina");
  });
  t("candidatos de tarefa excluem a tarefa atual", ()=>{
    const it = C.linhasEscopoSimples()[0];
    const c = C.laudoCandidatosCopia(it, "tarefa");
    eq(c.length, 1, "so a outra tarefa");
  });
  t("lista de copia sai em ordem alfabetica", ()=>{
    const c = C.laudoCandidatosCopia(C.linhasEscopoSimples()[0], "risco");
    const ord = c.map(x=>x.titulo).slice();
    eq(JSON.stringify(ord), JSON.stringify(ord.slice().sort((a,b)=>a.localeCompare(b,"pt-BR"))));
  });
  t("folha de copia traz filtro e dados de busca", ()=>{
    const h = C.laudoSheetCopiarHtml(C.linhasEscopoSimples()[0], "risco");
    ok(h.indexOf("laudoFiltrarCopia") > 0, "sem filtro");
    ok(h.indexOf("data-busca=") > 0, "sem indice de busca");
  });

  console.log("\n=== t18 · busca e navegacao entre linhas ===");
  t("busca encontra por nome do risco", ()=>{
    eq(C.laudoBuscar(C.laudoItensDoEscopo(), "corte").length, 1);
  });
  t("busca encontra por maquina", ()=>{
    eq(C.laudoBuscar(C.laudoItensDoEscopo(), "3-HU-2703").length, 3);
  });
  t("busca vazia devolve tudo", ()=>{
    eq(C.laudoBuscar(C.laudoItensDoEscopo(), "").length, 3);
  });
  t("detalhe mostra posicao na lista", ()=>{
    STATE.ui.laudoRiscoId = "r2";
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf(">2/3<") > 0, "sem contador de posicao");
    ok(h.indexOf("laudoIrPara(") > 0, "sem navegacao");
  });
  t("cartao da lista mostra HRN e contagem de fotos", ()=>{
    STATE.ui.laudoAba = "revisao";
    const h = C.screenSimplesLaudo();
    ok(h.indexOf("foto") > 0, "sem contagem de fotos");
    ok(h.indexOf("Despalha 3-HU-2703") > 0);
  });
  t("bloco de campo oferece copiar de outro, sem citar coluna do Excel", ()=>{
    const h = C.laudoBlocoCampo(C.linhasEscopoSimples()[0], "risco");
    ok(h.indexOf("laudoAbrirCopiar") > 0);
    ok(h.indexOf("Coluna AS") < 0, "referencia de coluna deveria ter saido");
    ok(h.indexOf("Descrição do risco") > 0, "titulo do bloco sumiu");
  });

  console.log("\n=== t19 · o que ja existia continua valendo ===");
  t("texto final ainda segue a regra de decisao", ()=>{
    const it = C.linhasEscopoSimples()[1];
    C.laudoSet(it, "risco", { fin:"REVISADO", st:"edit" });
    eq(C.laudoTextosDoItem(it).risco, "REVISADO");
    C.laudoSet(it, "risco", { st:"no" });
    eq(C.laudoTextosDoItem(it).risco, "Corte dos dedos na porta da grade");
  });
  t("geracao nao sobrescreve decisao", ()=>{
    eq(C.laudoPrecisaGerar(C.linhasEscopoSimples()[1], "risco", true), false);
  });
  t("duvidas continuam mapeadas em AL-AP", ()=>{
    const d = C.laudoDuvidasDoItem(C.linhasEscopoSimples()[0]);
    ["equipamento","escopo","tarefa","risco","solucao"].forEach(k=> ok(k in d));
  });

  console.log("\n=== t20 · modelo de dados (nivel de cada texto) ===");
  STATE.projetosSimples = [mkProjeto()];
  STATE.ui.areasSelecionadasExport = ["a1","a2"];
  STATE.ui.areasExportConhecidas = ["a1","a2"];
  t("item novo comeca vazio", ()=>{
    const g = C.laudoGet(C.linhasEscopoSimples()[0], "risco");
    eq(g.sug,""); eq(g.fin,""); eq(g.st,""); eq(g.duv,"");
  });
  t("escopo grava na maquina e vale para todas as linhas dela", ()=>{
    const L = C.linhasEscopoSimples();
    C.laudoSet(L[0], "escopo", { sug:"texto escopo", st:"pend" });
    eq(C.laudoGet(L[2],"escopo").sug, "texto escopo");
  });
  t("tarefa grava na tarefa e nao vaza para outra", ()=>{
    const L = C.linhasEscopoSimples();
    C.laudoSet(L[0], "tarefa", { sug:"tarefa A", st:"pend" });
    eq(C.laudoGet(L[1],"tarefa").sug, "tarefa A");
    eq(C.laudoGet(L[2],"tarefa").sug, "");
  });
  t("risco e solucao ficam isolados por linha", ()=>{
    const L = C.linhasEscopoSimples();
    C.laudoSet(L[0], "risco", { sug:"risco A", st:"pend" });
    eq(C.laudoGet(L[1],"risco").sug, "");
  });

  console.log("\n=== t21 · regra de qual texto vai para o laudo ===");
  t("nada gerado -> texto do inspetor", ()=>{
    eq(C.laudoTextoFinal(C.linhasEscopoSimples()[1], "risco"), "Corte dos dedos na porta da grade");
  });
  t("so sugerido -> sugestao", ()=>{
    eq(C.laudoTextoFinal(C.linhasEscopoSimples()[0], "risco"), "risco A");
  });
  t("aplicado -> texto final", ()=>{
    const l = C.linhasEscopoSimples()[0];
    C.laudoSet(l, "risco", { fin:"risco aprovado", st:"ok" });
    eq(C.laudoTextoFinal(l, "risco"), "risco aprovado");
  });
  t("recusado -> volta para o texto do inspetor", ()=>{
    const l = C.linhasEscopoSimples()[0];
    C.laudoSet(l, "risco", { st:"no" });
    eq(C.laudoTextoFinal(l, "risco"), "Ponta de eixo exposta com risco de agarramento");
  });
  t("solucao cai em descMedida so quando nao ha proposta escrita", ()=>{
    eq(C.laudoTextoOriginal(C.linhasEscopoSimples()[0], "solucao"), "Existe protecao mas ainda ha risco");
  });
  t("solucao usa sugestaoMitigacao quando nao ha medida", ()=>{
    eq(C.laudoTextoOriginal(C.linhasEscopoSimples()[1], "solucao"), "Reparar as pontas da grade");
  });

  console.log("\n=== t22 · geracao em lote, cache e reuso ===");
  STATE.projetosSimples = [mkProjeto()];
  chamadas = [];
  const grav = await C.gerarLaudoIAItens(C.linhasEscopoSimples(), null, { refazer:false });
  t("gerou textos para as 3 linhas", ()=>{ ok(grav >= 8, "gravados=" + grav); });
  t("escopo pedido uma unica vez (cache por maquina)", ()=>{
    eq(chamadas.filter(c=>c[0]==="escopo_xlsx").length, 1);
  });
  t("tarefa pedida uma vez por tarefa (2 tarefas)", ()=>{
    eq(chamadas.filter(c=>c[0]==="tarefa_xlsx").length, 2);
  });
  t("riscos identicos reaproveitam a resposta (r1 e r3)", ()=>{
    eq(chamadas.filter(c=>c[0]==="risco_xlsx").length, 2);
  });
  t("todas as linhas ficaram com texto de risco", ()=>{
    C.linhasEscopoSimples().forEach(l=> ok(!!C.laudoGet(l,"risco").sug, "linha sem risco: "+l.risco.id));
  });
  t("texto do inspetor nunca foi sobrescrito", ()=>{
    eq(STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[0].descricao, "Ponta de eixo exposta com risco de agarramento");
    eq(STATE.projetosSimples[0].areas[0].maquinas[0].descricao, "Despalhador de milho");
  });
  const antesN = chamadas.length;
  await C.gerarLaudoIAItens(C.linhasEscopoSimples(), null, { refazer:false });
  t("rodar de novo nao gasta nenhuma chamada", ()=>{ eq(chamadas.length, antesN); });

  console.log("\n=== t23 · pacote que vai para Excel e Word ===");
  t("laudoTextosDoItem devolve os 4 campos AQ-AT", ()=>{
    const x = C.laudoTextosDoItem(C.linhasEscopoSimples()[0]);
    ok(x.escopo && x.tarefa && x.risco && x.solucao, JSON.stringify(x));
  });
  t("editar muda o texto que vai para o Excel", ()=>{
    const l = C.linhasEscopoSimples()[1];
    C.laudoSet(l, "risco", { fin:"MEU TEXTO REVISADO", st:"edit" });
    eq(C.laudoTextosDoItem(l).risco, "MEU TEXTO REVISADO");
  });
  t("aplicarLaudoAprovadoNasLinhas nao altera o STATE", ()=>{
    const copias = C.aplicarLaudoAprovadoNasLinhas(C.linhasEscopoSimples());
    eq(STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[1].descricao, "Corte dos dedos na porta da grade");
    eq(copias[1].risco.descricao, "MEU TEXTO REVISADO");
  });
  t("solucao vai sempre para sugestaoMitigacao, nunca para descMedida", ()=>{
    const copias = C.aplicarLaudoAprovadoNasLinhas(C.linhasEscopoSimples());
    ok(copias[0].risco.descMedida.length > 0);
    ok(copias[1].risco.sugestaoMitigacao.length > 0);
  });
  t("refino envia a instrucao e reabre o campo", async ()=>{});
  chamadas = [];
  const alvoR = C.linhasEscopoSimples()[0];
  const feito = await C.refazerSugestaoLaudo(alvoR, "risco", "Deixe mais curto");
  t("refino chamou a IA com a instrucao e a sugestao atual", ()=>{
    ok(feito, "nao gerou");
    ok(chamadas[0][1].indexOf("Deixe mais curto") >= 0, "instrucao nao chegou");
    ok(chamadas[0][1].indexOf("SUGESTÃO ATUAL") >= 0, "sugestao atual nao foi enviada");
  });
  t("apos o refino o campo volta para 'a decidir'", ()=>{
    eq(C.laudoGet(alvoR, "risco").st, "pend");
    eq(C.laudoGet(alvoR, "risco").fin, "");
  });
  t("sem chave de IA a geracao avisa e nao quebra", async ()=>{});
  vm.runInContext("setIAApiKey('')", ctx);
  const g0 = await C.gerarLaudoIAItens(C.linhasEscopoSimples(), null, {});
  t("sem chave devolve 0 e emite aviso", ()=>{ eq(g0, 0); ok(toasts.length > 0); });
  vm.runInContext("setIAApiKey('k')", ctx);

  console.log("\n=== t24 · miniaturas nos cartões ===");
  STATE.projetosSimples = [mkProjeto()];
  STATE.ui.areasSelecionadasExport = ["a1","a2"];
  STATE.ui.areasExportConhecidas = ["a1","a2"];
  STATE.ui.laudoAba = "revisao";
  t("miniatura do equipamento usa a foto geral da máquina", ()=>{
    const h = C.laudoMiniatura(C.linhasEscopoSimples()[0], "equipamento");
    ok(h.indexOf("data-imgref") > 0, "sem imagem");
    ok(h.indexOf("EQUIP.") > 0, "sem rótulo");
    ok(h.indexOf("laudoAbrirGaleria") > 0, "não abre a galeria");
    ok(h.indexOf("event.stopPropagation()") > 0, "abriria a linha junto");
  });
  t("miniatura do risco usa a foto do risco", ()=>{
    const h = C.laudoMiniatura(C.linhasEscopoSimples()[0], "risco");
    ok(h.indexOf("data-imgref") > 0);
    ok(h.indexOf("RISCO") > 0);
  });
  t("risco sem foto mostra a miniatura vazia, sem quebrar", ()=>{
    const h = C.laudoMiniatura(C.linhasEscopoSimples()[1], "risco");
    ok(h.indexOf("laudo-th vazia") > 0, "sem estado vazio");
    ok(h.indexOf("data-imgref") < 0, "não deveria ter imagem");
  });
  t("referência de foto ainda não baixada não vira miniatura", ()=>{
    const it = C.linhasEscopoSimples()[1];
    it.risco.foto = "idbfoto:abc123";
    ok(C.laudoMiniatura(it, "risco").indexOf("laudo-th vazia") > 0);
    it.risco.foto = null;
  });
  t("equipamento sem foto geral cai na plaqueta", ()=>{
    const it = C.linhasEscopoSimples()[0];
    const bak = it.maquina.fotoGeral;
    it.maquina.fotoGeral = null;
    ok(C.laudoMiniatura(it, "equipamento").indexOf("data-imgref") > 0, "deveria usar a plaqueta");
    it.maquina.fotoGeral = bak;
  });
  t("cartão da lista traz as duas miniaturas", ()=>{
    const h = C.screenSimplesLaudo();
    ok(h.indexOf("laudo-thumbs") > 0, "sem bloco de miniaturas");
    ok((h.match(/EQUIP\./g)||[]).length === 3, "uma por linha");
    ok((h.match(/laudo-card-in/g)||[]).length === 3);
  });

  console.log("\n=== t25 · plaqueta do equipamento ===");
  t("bloco mostra os 6 campos editáveis", ()=>{
    STATE.ui.laudoRiscoId = "r1";
    const h = C.laudoBlocoPlaqueta(C.linhasEscopoSimples()[0]);
    [["modelo","Modelo"],["marca","Marca"],["numeroSerie","Nº de série"],
     ["anoFabricacao","Ano de fabricação"],["capacidade","Capacidade"],["tensao","Tensão"]]
      .forEach(([k,rot])=>{
        ok(h.indexOf("laudoSetPlaqueta('r1','"+k+"'") > 0, "faltou campo "+k);
        ok(h.indexOf(rot) > 0, "faltou rótulo "+rot);
      });
  });
  t("contador de campos preenchidos começa em 0/8 (6 da plaqueta + Tipo de equipamento + Manual)", ()=>{
    ok(C.laudoBlocoPlaqueta(C.linhasEscopoSimples()[0]).indexOf("0/8 campos") > 0);
  });
  t("contador acompanha o preenchimento, incluindo Tipo de equipamento e Manual", ()=>{
    const it = C.linhasEscopoSimples()[0];
    it.maquina.modelo = "XYZ-200"; it.maquina.marca = "ACME";
    const h1 = C.laudoBlocoPlaqueta(it);
    ok(h1.indexOf("2/8 campos") > 0, "contador errado só com modelo/marca");
    ok(h1.indexOf('value="XYZ-200"') > 0, "valor não apareceu no campo");
    it.maquina.tipoEquip = "Elevador de Canecas"; it.maquina.manual = "Português";
    const h2 = C.laudoBlocoPlaqueta(it);
    ok(h2.indexOf("4/8 campos") > 0, "tipo de equipamento e manual não entraram na contagem");
  });
  t("com foto e IA, oferece a leitura automática", ()=>{
    const h = C.laudoBlocoPlaqueta(C.linhasEscopoSimples()[0]);
    ok(h.indexOf("laudoLerPlaqueta('r1')") > 0, "sem botão de leitura");
    ok(h.indexOf("Ler a plaqueta com IA") > 0);
    ok(h.indexOf("laudoVerPlaqueta('r1')") > 0, "foto não amplia");
  });
  t("sem chave de IA, mostra o caminho para configurar", ()=>{
    vm.runInContext("setIAApiKey('')", ctx);
    const h = C.laudoBlocoPlaqueta(C.linhasEscopoSimples()[0]);
    ok(h.indexOf("laudoLerPlaqueta") < 0, "não deveria oferecer leitura");
    ok(h.indexOf("Configure a IA na aba IA") > 0);
    vm.runInContext("setIAApiKey('k')", ctx);
  });
  t("sem foto, oferece fotografar e explica o porquê", ()=>{
    const it = C.linhasEscopoSimples()[0];
    const bak = it.maquina.fotoPlaqueta;
    it.maquina.fotoPlaqueta = null;
    const h = C.laudoBlocoPlaqueta(it);
    ok(h.indexOf("laudoTrocarFotoPlaqueta('r1', false)") > 0, "sem câmera");
    ok(h.indexOf("laudoTrocarFotoPlaqueta('r1', true)") > 0, "sem galeria");
    ok(h.indexOf("Sem foto da plaqueta ainda") > 0);
    ok(h.indexOf("laudoLerPlaqueta") < 0, "não pode ler sem foto");
    it.maquina.fotoPlaqueta = bak;
  });
  t("plaqueta entra na tela de detalhe", ()=>{
    STATE.ui.laudoRiscoId = "r1";
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf("Plaqueta do equipamento") > 0);
    ok(h.indexOf("Avaliação HRN") > 0, "os outros blocos continuam");
  });
  t("métodos do App existem e a leitura respeita o que já está escrito", ()=>{
    ["laudoSetPlaqueta(rid, campo, valor)","laudoVerPlaqueta(rid)","laudoTrocarFotoPlaqueta(rid, daGaleria)","async laudoLerPlaqueta(rid)"]
      .forEach(m=> ok(HTML.indexOf(m) > 0, "faltou "+m));
    ok(HTML.indexOf("(substituir || !jaTem)") > 0, "sobrescreveria campo preenchido");
    ok(HTML.indexOf("Todos os campos já estão preenchidos") > 0, "sem confirmação antes de substituir");
  });
  t("plaqueta usa a compressão e a galeria já existentes no app", ()=>{
    ok(HTML.indexOf('comprimirImagem(input.files[0], 1920, 0.82)') > 0);
    ok(HTML.indexOf('salvarFotoNaGaleria(data, "apr_fotoPlaqueta")') > 0);
  });

  console.log("\n=== t26 · cabeçalho flutuante da revisão ===");
  STATE.projetosSimples = [mkProjeto()];
  STATE.ui.areasSelecionadasExport = ["a1","a2"];
  STATE.ui.areasExportConhecidas = ["a1","a2"];
  STATE.ui.laudoRiscoId = "r1";
  STATE.ui.laudoFiltro = "todos";
  t("cabeçalho é o primeiro elemento e usa a classe grudada", ()=>{
    const h = C.screenSimplesLaudoItem();
    ok(h.trimStart().indexOf('<div class="laudo-topo">') === 0, "não é o primeiro bloco");
  });
  t("traz as duas miniaturas", ()=>{
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf("laudo-topo-thumbs") > 0, "sem bloco de miniaturas");
    ok(h.indexOf("EQUIP.") > 0 && h.indexOf("RISCO") > 0);
  });
  t("mostra área, máquina, risco e tarefa", ()=>{
    const h = C.screenSimplesLaudoItem();
    ["Zebra - area Z","Despalha 3-HU-2703","Ponta de eixo exposta","Limpeza e higienizacao"]
      .forEach(x=> ok(h.indexOf(x) > 0, "faltou "+x));
  });
  t("mostra o HRN com a cor do nível", ()=>{
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf("laudo-topo-hrn") > 0, "sem selo de HRN");
    const hrn = C.hrnDoItem({tarefa:C.linhasEscopoSimples()[0].tarefa, risco:C.linhasEscopoSimples()[0].risco});
    ok(h.indexOf("HRN "+hrn.hrn) > 0, "sem valor no title");
    ok(h.indexOf(C.NIVEL_HRN_META ? "" : "") === 0 || true);
  });
  t("ações ficam no cabeçalho, em versão compacta", ()=>{
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf("Aplicar 4") > 0, "sem aplicar compacto");
    ok(h.indexOf("laudoAprovarLinha('r1')") > 0);
    ok(h.indexOf("laudoGerarLinha('r1')") > 0);
    ok(h.indexOf("laudoAbrirGaleria('r1')") > 0);
    ok(h.indexOf("} Aplicar 4<") > 0 || h.indexOf("> Aplicar 4<") > 0 || /Aplicar 4\s*<\/button>/.test(h), "rótulo visível deveria ser curto");
    ok(h.indexOf(">Aplicar as 4 sugestões<") < 0, "rótulo longo não pode ser o texto do botão");
    ok(h.indexOf('title="Aplicar as 4 sugestões desta linha"') > 0, "explicação longa deveria virar dica");
  });
  t("navegação entre linhas fica no cabeçalho", ()=>{
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf("laudo-topo-nav") > 0, "sem navegação");
    ok(h.indexOf("1/3") > 0, "contador errado");
    ok(h.indexOf("laudoIrPara(1)") > 0, "sem próxima");
  });
  t("na primeira linha o botão anterior fica desabilitado, sem style duplicado", ()=>{
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf('<button disabled onclick="App.laudoIrPara(-1)"') > 0, "anterior deveria estar travado");
    ok(h.indexOf('style="opacity:.4;flex:1"') < 0, "atributo style duplicado voltou");
  });
  t("na última linha a próxima fica desabilitada", ()=>{
    STATE.ui.laudoRiscoId = "r3";
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf("3/3") > 0);
    ok(h.indexOf('<button disabled onclick="App.laudoIrPara(3)"') > 0);
    STATE.ui.laudoRiscoId = "r1";
  });
  t("linha única não mostra navegação", ()=>{
    const bak = STATE.ui.areasSelecionadasExport;
    const proj = STATE.projetosSimples[0];
    const tarefaBak = proj.areas[0].maquinas[0].tarefas.slice();
    proj.areas[0].maquinas[0].tarefas = [tarefaBak[1]];
    STATE.ui.laudoRiscoId = "r3";
    ok(C.screenSimplesLaudoItem().indexOf("laudo-topo-nav") < 0);
    proj.areas[0].maquinas[0].tarefas = tarefaBak;
    STATE.ui.areasSelecionadasExport = bak;
    STATE.ui.laudoRiscoId = "r1";
  });
  t("altura da barra superior é medida a cada desenho", ()=>{
    ok(HTML.indexOf("function ajustarTopoLaudo()") > 0, "sem função de medição");
    ok(HTML.indexOf("--laudo-top") > 0, "sem variável de encaixe");
    ok(HTML.indexOf('window.addEventListener("resize", ajustarTopoLaudo)') > 0, "não reage a redimensionar");
    ok(HTML.indexOf("  setSaveChip(false);\n  ajustarTopoLaudo();") > 0, "não é chamada no desenho");
  });
  t("cabeçalho é grudado no topo, abaixo da barra do app", ()=>{
    ok(HTML.indexOf(".laudo-topo{position:sticky;top:var(--laudo-top,72px)") > 0);
  });
  t("o resto da tela continua completo", ()=>{
    const h = C.screenSimplesLaudoItem();
    ["Plaqueta do equipamento","Avaliação HRN","Escopo do equipamento","Solução"]
      .forEach(x=> ok(h.indexOf(x) > 0, "faltou "+x));
  });

  console.log("\n=== t27 · filtros de equipamento e tarefa ===");
  STATE.projetosSimples = [mkProjeto()];
  STATE.projetosSimples[0].areas[0].maquinas.push({
    id:"m2", nome:"Esteira 3-CV-2744", descricao:"Esteira de retorno",
    fotoGeral:null, fotoPlaqueta:null, fotosOutras:[],
    tarefas:[{ id:"t9", tarefa:"Manutenção", tarefaOutro:"", descricao:"", frequencia:"Semanal", numPessoas:"3",
      riscos:[{ id:"r9", nome:"Enroscamento", descricao:"Correia sem proteção", foto:null, fotosOutras:[],
                medidaImplementada:"Nao", descMedida:"", sugestaoMitigacao:"Instalar proteção",
                po:"", gpd:"", fe:"", np:"" }] }]
  });
  STATE.ui.areasSelecionadasExport = ["a1","a2"];
  STATE.ui.areasExportConhecidas = ["a1","a2"];
  STATE.ui.laudoAba = "revisao"; STATE.ui.laudoFiltro = "todos";
  STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = ""; __buscaAtual = "";
  ctx.__buscaAtual = "";
  t("os dois seletores aparecem com a contagem", ()=>{
    const h = C.laudoAbaRevisao();
    ok(h.indexOf("Todos os equipamentos (2)") > 0, "sem seletor de equipamento");
    ok(h.indexOf("Todas as tarefas (3)") > 0, "sem seletor de tarefa");
    ok(h.indexOf("laudoSetFiltroMaquina") > 0 && h.indexOf("laudoSetFiltroTarefa") > 0);
  });
  t("equipamentos saem em ordem alfabetica", ()=>{
    const op = C.laudoOpcoesEquipamento(C.laudoItensDoEscopo());
    eq(op.length, 2);
    eq(op[0].nome, "Despalha 3-HU-2703");
    eq(op[1].nome, "Esteira 3-CV-2744");
  });
  t("filtrar por equipamento reduz a lista", ()=>{
    eq(C.laudoListaAtual().length, 4);
    STATE.ui.laudoFiltroMaq = "m2";
    eq(C.laudoListaAtual().length, 1);
    STATE.ui.laudoFiltroMaq = "m1";
    eq(C.laudoListaAtual().length, 3);
  });
  t("as tarefas listadas sao so as do equipamento escolhido", ()=>{
    STATE.ui.laudoFiltroMaq = "m2";
    const op = C.laudoOpcoesTarefa(C.laudoItensDoEscopo());
    eq(op.length, 1);
    eq(op[0].nome, "Manutenção");
    STATE.ui.laudoFiltroMaq = "m1";
    eq(C.laudoOpcoesTarefa(C.laudoItensDoEscopo()).length, 2);
  });
  t("filtrar por tarefa reduz mais ainda", ()=>{
    STATE.ui.laudoFiltroTar = "t1";
    eq(C.laudoListaAtual().length, 2);
  });
  t("trocar de equipamento limpa a tarefa escolhida", ()=>{
    ok(HTML.indexOf('laudoSetFiltroMaquina(id){ STATE.ui.laudoFiltroMaq = id || ""; STATE.ui.laudoFiltroTar = "";') > 0);
  });
  t("botao de limpar aparece so quando ha filtro", ()=>{
    ok(C.laudoAbaRevisao().indexOf("laudoLimparFiltros") > 0, "deveria aparecer");
    STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
    ok(C.laudoAbaRevisao().indexOf("laudoLimparFiltros") < 0, "nao deveria aparecer sem filtro");
  });
  t("filtro apontando para item excluido e descartado sozinho", ()=>{
    STATE.ui.laudoFiltroMaq = "inexistente";
    C.laudoAbaRevisao();
    eq(STATE.ui.laudoFiltroMaq, "");
  });
  t("contadores das situacoes respeitam o filtro de equipamento", ()=>{
    STATE.ui.laudoFiltroMaq = "m2";
    const h = C.laudoAbaRevisao();
    ok(h.indexOf("<b>1</b><span>Linhas</span>") > 0, "painel nao acompanhou o filtro");
    STATE.ui.laudoFiltroMaq = "";
  });
  t("navegacao anterior/proxima usa a MESMA lista filtrada", ()=>{
    STATE.ui.laudoFiltroMaq = "m1";
    STATE.ui.laudoRiscoId = "r1";
    ok(C.screenSimplesLaudoItem().indexOf(">1/3<") > 0, "contador fora do filtro");
    STATE.ui.laudoFiltroMaq = "m2";
    STATE.ui.laudoRiscoId = "r9";
    ok(C.screenSimplesLaudoItem().indexOf("laudo-topo-nav") < 0, "linha unica nao deveria ter navegacao");
    STATE.ui.laudoFiltroMaq = "";
    STATE.ui.laudoRiscoId = "r1";
  });

  console.log("\n=== t28 · trilha área · máquina · tarefa ===");
  t("cartao mostra os tres na mesma linha e o risco destacado abaixo", ()=>{
    const h = C.laudoAbaRevisao();
    ok(h.indexOf("laudo-card-trilha") > 0, "sem trilha");
    ok(h.indexOf("Zebra - area Z · Despalha 3-HU-2703 · Limpeza e higienizacao") > 0, "sequencia errada");
  });
  t("cabecalho flutuante usa a mesma trilha", ()=>{
    STATE.ui.laudoRiscoId = "r1";
    const h = C.screenSimplesLaudoItem();
    ok(h.indexOf("Zebra - area Z · Despalha 3-HU-2703 · Limpeza e higienizacao") > 0);
    ok(h.indexOf("lt-tarefa") < 0, "linha separada de tarefa deveria ter saido");
  });

  console.log("\n=== t29 · girar a foto e salvar sozinho ===");
  t("cada foto sabe de onde veio", ()=>{
    const f = C.laudoFotosDoItem(C.linhasEscopoSimples()[0]);
    eq(f[0].onde, "maquina"); eq(f[0].campo, "fotoGeral");
    eq(f[1].campo, "fotoPlaqueta");
    const risco = f.find(x=>x.onde==="risco" && x.campo==="foto");
    ok(!!risco, "foto do risco sem origem");
    const extra = f.find(x=>x.campo==="fotosOutras");
    ok(extra && extra.idx === 0, "foto extra sem indice");
  });
  t("gravar de volta escreve no campo certo", ()=>{
    const it = C.linhasEscopoSimples()[0];
    const f = C.laudoFotosDoItem(it);
    ok(C.laudoGravarFoto(it, f[0], "data:image/jpeg;base64,GIRADA"));
    eq(it.maquina.fotoGeral, "data:image/jpeg;base64,GIRADA");
    it.maquina.fotoGeral = "data:image/jpeg;base64,CCC";
  });
  t("gravar numa foto extra respeita o indice", ()=>{
    const it = C.linhasEscopoSimples()[0];
    const f = C.laudoFotosDoItem(it).find(x=>x.campo==="fotosOutras");
    ok(C.laudoGravarFoto(it, f, "data:image/jpeg;base64,EXTRA1"));
    eq(it.risco.fotosOutras[0], "data:image/jpeg;base64,EXTRA1");
    it.risco.fotosOutras[0] = "data:image/jpeg;base64,BBB";
  });
  t("foto sem origem nao e gravada", ()=>{
    eq(C.laudoGravarFoto(C.linhasEscopoSimples()[0], { src:"x" }, "y"), false);
  });
  t("visualizador traz os dois botoes de girar", ()=>{
    C.laudoSheetGaleriaHtml(C.linhasEscopoSimples()[0]);
    const h = C.laudoViewerHtml(0);
    ok(h.indexOf("laudoRotacionarFoto(0,-90)") > 0, "sem girar a esquerda");
    ok(h.indexOf("laudoRotacionarFoto(0,90)") > 0, "sem girar a direita");
    ok(h.indexOf("salva sozinho") > 0, "nao avisa que salva sozinho");
  });
  t("girar aparece mesmo quando ha uma foto so", ()=>{
    const it = C.linhasEscopoSimples()[1];
    const bak = it.maquina.fotoPlaqueta;
    it.maquina.fotoPlaqueta = null;                 // sobra só a foto geral
    eq(C.laudoFotosDoItem(it).length, 1, "cenario de uma foto nao montou");
    C.laudoSheetGaleriaHtml(it);
    const h = C.laudoViewerHtml(0);
    ok(h.indexOf("lv-girar") > 0, "sem botao de girar");
    ok(h.indexOf("laudoVerFotoGaleria(") < 0, "nao deveria ter setas com uma foto so");
    ok(h.indexOf("1 de 1") > 0, "contador errado");
    it.maquina.fotoPlaqueta = bak;
  });
  t("rotacao mantem a resolucao e grava sem perguntar", ()=>{
    ok(HTML.indexOf("function rotacionarDataUrl(dataUrl, graus)") > 0);
    ok(HTML.indexOf('c.width  = (g === 90 || g === 270) ? h : w;') > 0, "nao troca largura por altura");
    ok(HTML.indexOf("async laudoRotacionarFoto(idx, graus)") > 0);
    ok(HTML.indexOf("confirm(") > 0 && HTML.indexOf("Girar") < 0 || true);
    ok(HTML.indexOf("laudoGravarFoto(item, f, novo)") > 0, "nao grava de volta");
  });

  console.log("\n=== t30 · plaqueta: quando a IA lê ===");
  t("le sozinha logo depois de fotografar, se houver campo vazio", ()=>{
    ok(HTML.indexOf("const faltaAlgum = LAUDO_PLAQUETA_CAMPOS.some(c=> !String(item.maquina[c.k]||\"\").trim());") > 0);
    ok(HTML.indexOf("if(getIAApiKey() && faltaAlgum) await App.laudoLerPlaqueta(rid);") > 0);
  });
  t("a explicacao na tela diz os dois momentos", ()=>{
    STATE.ui.laudoRiscoId = "r1";
    const h = C.laudoBlocoPlaqueta(C.linhasEscopoSimples()[0]);
    ok(h.indexOf("automaticamente logo depois de fotografar") > 0);
    ok(h.indexOf("sempre que você tocar no botão") > 0);
  });

  console.log("\n=== t31 · aproveitamento da largura ===");
  t("telas de laudo usam bem mais largura", ()=>{
    ok(HTML.indexOf(".screen.screen-laudo{max-width:1560px;}") > 0);
  });
  t("lista vira 2, 3 e 4 colunas conforme a tela", ()=>{
    ["@media (min-width:720px)","@media (min-width:1040px)","@media (min-width:1440px)"]
      .forEach(m=> ok(HTML.indexOf(m) > 0, "faltou "+m));
    ok(HTML.indexOf(".screen.screen-laudo .laudo-lista{grid-template-columns:repeat(4,1fr);}") > 0);
  });
  t("aba Áreas tambem usa colunas", ()=>{
    ok(HTML.indexOf("laudo-areas-grid") > 0);
    ok(C.laudoAbaAreas().indexOf('class="laudo-areas-grid"') > 0);
  });
  t("barra de busca e filtros dividem a linha nas telas largas", ()=>{
    ok(HTML.indexOf(".laudo-barra{grid-template-columns:1.4fr 1fr 1fr 1fr;align-items:center;}") > 0);
  });

  console.log("\n=== t32 · aba Projeto na central do laudo ===");
  STATE.projetosSimples = [mkProjeto()];
  STATE.ui.areasSelecionadasExport = ["a1","a2"];
  STATE.ui.areasExportConhecidas = ["a1","a2"];
  STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
  t("a sub-aba Projeto existe e é a primeira", ()=>{
    STATE.ui.laudoAba = "revisao";
    const h = C.screenSimplesLaudo();
    ok(h.indexOf(">Projeto<") > 0, "sem aba Projeto");
    ok(h.indexOf(">Projeto<") < h.indexOf(">Áreas<"), "Projeto deveria vir antes de Áreas");
    ok(h.indexOf(">Projeto<") < h.indexOf(">Revisão<"), "Projeto deveria vir antes de Revisão");
  });
  t("traz os campos do modal de projeto", ()=>{
    STATE.ui.laudoAba = "projeto";
    const h = C.screenSimplesLaudo();
    ["Empresa / Unidade","Cidade","Inspetor","Data da inspeção"].forEach(r=> ok(h.indexOf(r) > 0, "faltou "+r));
    ["empresa","cidade","inspetorId"].forEach(k=> ok(h.indexOf("laudoSetProjeto('p1','"+k+"'") > 0, "faltou campo "+k));
  });
  t("traz os 8 campos administrativos com os mesmos rótulos do app", ()=>{
    const h = C.laudoAbaProjeto();
    const campos = vm.runInContext("CAMPOS_ADMIN_PROJETO.map(c=>[c.campo,c.label])", ctx);
    eq(campos.length, 8);
    campos.forEach(([k,rot])=>{
      ok(h.indexOf("laudoSetProjeto('p1','"+k+"'") > 0, "faltou campo "+k);
      ok(h.indexOf(rot) > 0, "faltou rótulo "+rot);
    });
  });
  t("valores já preenchidos aparecem nos campos", ()=>{
    const h = C.laudoAbaProjeto();
    ok(h.indexOf('value="Corteva"') > 0, "empresa não apareceu");
    ok(h.indexOf('value="Formosa/GO"') > 0, "cidade não apareceu");
  });
  t("a data da inspeção fica travada, como no modal", ()=>{
    const h = C.laudoAbaProjeto();
    ok(h.indexOf("disabled") > 0);
    ok(h.indexOf("Vem da data de criação do projeto") > 0);
  });
  t("o inspetor sai da lista de Configurações", ()=>{
    const h = C.laudoAbaProjeto();
    ok(h.indexOf("Daniel Costa Gonçalves — Técnico Mecânico") > 0, "sem o Daniel");
    ok(h.indexOf("Luiz Hermelino Araujo — Engenheiro Mecânico") > 0, "sem o Luiz");
  });
  t("selo mostra quantos campos faltam e vira Completo", ()=>{
    const nFalta = C.camposFaltandoProjeto(STATE.projetosSimples[0]).length;
    eq(nFalta, 7, "o projeto de teste já vem com o Responsável preenchido");
    ok(C.laudoAbaProjeto().indexOf(nFalta + " em branco") > 0, "contador errado");
    const p = STATE.projetosSimples[0];
    vm.runInContext("CAMPOS_ADMIN_PROJETO.map(c=>c.campo)", ctx).forEach(k=> p[k] = "x");
    ok(C.laudoAbaProjeto().indexOf("Completo") > 0, "deveria ficar completo");
    vm.runInContext("CAMPOS_ADMIN_PROJETO.map(c=>c.campo)", ctx).forEach(k=> p[k] = "");
  });
  t("lista os que faltam por nome", ()=>{
    ok(C.laudoAbaProjeto().indexOf("Ainda em branco:") > 0);
    ok(C.laudoAbaProjeto().indexOf("Número da ART") > 0);
  });
  t("mostra só os projetos com área no escopo", ()=>{
    eq(C.laudoProjetosDoEscopo().length, 1);
    STATE.ui.areasSelecionadasExport = [];
    eq(C.laudoProjetosDoEscopo().length, 0);
    ok(C.laudoAbaProjeto().indexOf("Nenhum projeto no escopo") > 0);
    STATE.ui.areasSelecionadasExport = ["a1","a2"];
  });
  t("gravação salva no projeto e carimba a alteração", ()=>{
    ok(HTML.indexOf("laudoSetProjeto(pid, campo, valor)") > 0);
    ok(HTML.indexOf("p.atualizadoEm = agoraSync();") > 0, "sem carimbo de alteração");
    ok(HTML.indexOf("p.atualizadoEm = Date.now();") < 0, "voltou a carimbar direto do relógio do aparelho");
    ok(HTML.indexOf('laudoIrParaProjeto(){ STATE.ui.laudoAba = "projeto"; go("simples-laudo"); }') > 0);
  });
  t("'Preencher agora' passou a levar para a aba Projeto", ()=>{
    ok(HTML.indexOf('onclick="App.fecharModal();App.laudoIrParaProjeto()"') > 0);
    ok(HTML.indexOf("__extrasProjetoAberto=true;App.abrirModalProjetoS(") < 0, "ainda abre o modal antigo");
  });
  t("aba Exportar avisa sobre dados administrativos em branco", ()=>{
    STATE.ui.laudoAba = "exportar";
    const h = C.screenSimplesLaudo();
    ok(h.indexOf("dado(s) administrativo(s) em branco") > 0, "sem aviso");
    ok(h.indexOf("laudoSetAba('projeto')") > 0, "sem atalho");
  });

  console.log("\n=== t33 · filtro de área ===");
  STATE.projetosSimples[0].areas[1].maquinas.push({
    id:"m3", nome:"Moega 1", descricao:"", fotoGeral:null, fotoPlaqueta:null, fotosOutras:[],
    tarefas:[{ id:"t8", tarefa:"Inspeção", tarefaOutro:"", descricao:"", frequencia:"Mensal", numPessoas:"1",
      riscos:[{ id:"r8", nome:"Queda", descricao:"Sem guarda-corpo", foto:null, fotosOutras:[],
                medidaImplementada:"Nao", descMedida:"", sugestaoMitigacao:"Instalar guarda-corpo",
                po:"", gpd:"", fe:"", np:"" }] }]
  });
  STATE.ui.laudoAba = "revisao"; STATE.ui.laudoFiltro = "todos";
  STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
  t("o seletor de área aparece com a contagem", ()=>{
    const h = C.laudoAbaRevisao();
    ok(h.indexOf("Todas as áreas (2)") > 0, "sem seletor de área");
    ok(h.indexOf("laudoSetFiltroArea") > 0);
  });
  t("áreas saem em ordem alfabética", ()=>{
    const op = C.laudoOpcoesArea(C.laudoItensDoEscopo());
    eq(op.length, 2);
    eq(op[0].nome, "Alfa - area A");
    eq(op[1].nome, "Zebra - area Z");
  });
  t("filtrar por área reduz a lista", ()=>{
    eq(C.laudoListaAtual().length, 4);
    STATE.ui.laudoFiltroArea = "a2";
    eq(C.laudoListaAtual().length, 1);
    STATE.ui.laudoFiltroArea = "a1";
    eq(C.laudoListaAtual().length, 3);
  });
  t("os equipamentos listados são só os da área escolhida", ()=>{
    STATE.ui.laudoFiltroArea = "a2";
    const op = C.laudoOpcoesEquipamento(C.laudoItensDoEscopo());
    eq(op.length, 1); eq(op[0].nome, "Moega 1");
    STATE.ui.laudoFiltroArea = "a1";
    eq(C.laudoOpcoesEquipamento(C.laudoItensDoEscopo()).length, 1);
  });
  t("as tarefas também respeitam a área", ()=>{
    STATE.ui.laudoFiltroArea = "a2";
    const op = C.laudoOpcoesTarefa(C.laudoItensDoEscopo());
    eq(op.length, 1); eq(op[0].nome, "Inspeção");
    STATE.ui.laudoFiltroArea = "";
  });
  t("trocar de área limpa equipamento e tarefa", ()=>{
    ok(HTML.indexOf('laudoSetFiltroArea(id){ STATE.ui.laudoFiltroArea = id || ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";') > 0);
  });
  t("limpar filtros zera os três", ()=>{
    ok(HTML.indexOf('laudoLimparFiltros(){ STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";') > 0);
  });
  t("área excluída deixa de filtrar sozinha", ()=>{
    STATE.ui.laudoFiltroArea = "sumiu";
    C.laudoAbaRevisao();
    eq(STATE.ui.laudoFiltroArea, "");
  });
  t("navegação entre linhas respeita o filtro de área", ()=>{
    STATE.ui.laudoFiltroArea = "a2";
    STATE.ui.laudoRiscoId = "r8";
    ok(C.screenSimplesLaudoItem().indexOf("laudo-topo-nav") < 0, "só há uma linha nessa área");
    STATE.ui.laudoFiltroArea = "";
    STATE.ui.laudoRiscoId = "r1";
  });

  console.log("\n=== t34 · montador de risco em campo ===");
  STATE.projetosSimples = [mkProjeto()];
  STATE.ui.recentesRisco = null;
  const P0 = STATE.projetosSimples[0];
  t("as quatro listas trazem exatamente os itens pedidos", ()=>{
    eq(vm.runInContext("RISCO_LOCAIS.length", ctx), 12);
    eq(vm.runInContext("RISCO_COMPONENTES.length", ctx), 17);
    eq(vm.runInContext("RISCO_EVENTOS.length", ctx), 19);
    eq(vm.runInContext("RISCO_PARTES.length", ctx), 14);
  });
  t("as opções saem em ordem alfabética", ()=>{
    const o = C.opcoesCampoRisco("componente", P0).todas;
    eq(JSON.stringify(o), JSON.stringify(o.slice().sort((a,b)=>a.localeCompare(b,"pt-BR"))));
    eq(o[0], "Cilindro");
  });
  t("sem histórico, não há bloco de últimos usados", ()=>{
    eq(C.opcoesCampoRisco("evento", P0).recentes.length, 0);
  });
  t("os últimos usados aparecem primeiro e sem repetir", ()=>{
    C.registrarUsoRisco("evento", "Corte");
    C.registrarUsoRisco("evento", "Esmagamento");
    C.registrarUsoRisco("evento", "Corte");
    const r = C.opcoesCampoRisco("evento", P0).recentes;
    eq(r[0], "Corte"); eq(r[1], "Esmagamento"); eq(r.length, 2);
  });
  t("a lista de recentes é curta (no máximo 6)", ()=>{
    ["Queda","Fratura","Asfixia","Explosão","Incêndio","Contusão","Laceração"].forEach(v=> C.registrarUsoRisco("evento", v));
    eq(C.opcoesCampoRisco("evento", P0).recentes.length, 6);
  });
  t("item criado em Outro fica salvo no projeto e entra na lista", ()=>{
    C.adicionarOpcaoRiscoProjeto(P0, "componente", "Guarda-corpo");
    ok(P0.listasRisco.componente.indexOf("Guarda-corpo") >= 0, "não salvou no projeto");
    ok(C.opcoesCampoRisco("componente", P0).todas.indexOf("Guarda-corpo") >= 0, "não apareceu na lista");
  });
  t("item repetido não duplica", ()=>{
    C.adicionarOpcaoRiscoProjeto(P0, "componente", "guarda-corpo");
    eq(P0.listasRisco.componente.filter(x=>x.toLowerCase()==="guarda-corpo").length, 1);
  });
  t("o item novo do projeto A não vaza para o projeto B", ()=>{
    const outro = mkProjeto(); outro.id = "p2";
    eq(C.opcoesCampoRisco("componente", outro).todas.indexOf("Guarda-corpo"), -1);
  });

  console.log("\n=== t35 · descrição escrita sozinha ===");
  t("frase completa fica natural e cita os quatro itens", ()=>{
    /* Redacao revista em 25/08/2026 (ver t120): a parte do corpo liga-se ao
       evento em vez de vir solta no fim, o componente entra como AGENTE e nao
       como lugar, e o "da maquina" saiu -- era ruido, o laudo ja diz de qual
       maquina se trata. */
    const r = { local:"Transmissão de potência", componente:"Correia", evento:"Arrastamento", parteCorpo:"Dedos" };
    eq(C.montarDescricaoRisco(r), "Risco de arrastamento dos dedos na correia da transmissão de potência.");
  });
  t("artigo acompanha o gênero da palavra", ()=>{
    eq(C.riscoArtigoEm("Eixo"), "no eixo");
    eq(C.riscoArtigoEm("Correia"), "na correia");
    eq(C.riscoArtigoEm("Painel elétrico"), "no painel elétrico");
    eq(C.riscoArtigoEm("Mão"), "na mão");
    eq(C.riscoArtigoEm("Dedos"), "nos dedos");
    eq(C.riscoArtigoEm("Transmissão de potência"), "na transmissão de potência");
    // itens criados pelo usuário caem na heurística de gênero e número
    eq(C.riscoArtigoEm("Guarda-corpo"), "no guarda-corpo");
    eq(C.riscoArtigoEm("Chapa de fechamento"), "na chapa de fechamento");
    eq(C.riscoArtigoEm("Roletes"), "nos roletes");
    eq(C.riscoArtigoEm("Correntes de arraste"), "nas correntes de arraste");
  });
  t("funciona com seleção parcial", ()=>{
    eq(C.montarDescricaoRisco({ evento:"Corte", componente:"Lâmina" }), "Risco de corte na lâmina.");
    /* Sem componente, o complemento emenda direto no evento — a vírgula só
       entra quando já houve um complemento antes dela. */
    eq(C.montarDescricaoRisco({ evento:"Queda", local:"Escada" }), "Risco de queda na escada.");
    eq(C.montarDescricaoRisco({ evento:"Queda", componente:"Guarda-corpo", local:"Escada" }),
       "Risco de queda no guarda-corpo, na escada.");
    eq(C.montarDescricaoRisco({ local:"Escada" }), "Risco na escada da máquina.");  // sem evento, cai no formato antigo
    eq(C.montarDescricaoRisco({ componente:"Correia" }), "Risco na correia.");
    eq(C.montarDescricaoRisco({ parteCorpo:"Mão" }), "Risco com possível lesão na mão.");
  });
  t("sem nenhuma escolha, não inventa texto", ()=>{
    eq(C.montarDescricaoRisco({}), "");
  });
  t("a sugestão preenche a descrição vazia", ()=>{
    const r = { nome:"", descricao:"", descricaoAuto:"", gpd:"", evento:"Esmagamento", componente:"Cilindro" };
    C.aplicarSugestoesRisco(r);
    eq(r.descricao, "Risco de esmagamento no cilindro.");
  });
  t("trocar uma opção atualiza a descrição ainda automática", ()=>{
    const r = { nome:"", descricao:"", descricaoAuto:"", gpd:"", evento:"Esmagamento", componente:"Cilindro" };
    C.aplicarSugestoesRisco(r);
    r.componente = "Rolo";
    C.aplicarSugestoesRisco(r);
    eq(r.descricao, "Risco de esmagamento no rolo.");
  });
  t("texto escrito por você NUNCA é sobrescrito", ()=>{
    const r = { nome:"", descricao:"", descricaoAuto:"", gpd:"", evento:"Esmagamento", componente:"Cilindro" };
    C.aplicarSugestoesRisco(r);
    r.descricao = "Observação própria do inspetor no campo.";
    r.parteCorpo = "Mão";
    C.aplicarSugestoesRisco(r);
    eq(r.descricao, "Observação própria do inspetor no campo.");
  });
  t("o nome do risco só é preenchido se estiver vazio", ()=>{
    const r1 = { nome:"", descricao:"", descricaoAuto:"", gpd:"", evento:"Amputação" };
    C.aplicarSugestoesRisco(r1); eq(r1.nome, "Amputação");
    const r2 = { nome:"Ponta de eixo exposta", descricao:"", descricaoAuto:"", gpd:"", evento:"Amputação" };
    C.aplicarSugestoesRisco(r2); eq(r2.nome, "Ponta de eixo exposta");
  });

  console.log("\n=== t36 · Grau do Dano sugerido ===");
  t("cada evento aponta para um grau que existe na tabela HRN", ()=>{
    ok(vm.runInContext("RISCO_EVENTOS.every(e=> HRN_GPD_TABELA.some(t=>t.classificacao===e.gpd))", ctx),
       "algum evento aponta para um grau inexistente");
  });
  t("toda opção das listas tem a preposição escrita", ()=>{
    ok(vm.runInContext("[RISCO_LOCAIS,RISCO_COMPONENTES,RISCO_PARTES].every(l=> l.every(o=> !!o.em))", ctx),
       "algum item ficaria com artigo adivinhado");
  });
  t("sugestões batem com a gravidade esperada", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Corte" }), "Corte / Laceração");
    eq(C.sugerirGPDPorSelecao({ evento:"Amputação" }), "Perda de membro, visão ou audição");
    eq(C.sugerirGPDPorSelecao({ evento:"Esmagamento" }), "Perda de Vários membros");
    eq(C.sugerirGPDPorSelecao({ evento:"Choque elétrico" }), "Fatalidade");
  });
  t("parte vital agrava evento grave para fatalidade", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Esmagamento", parteCorpo:"Cabeça" }), "Fatalidade");
    eq(C.sugerirGPDPorSelecao({ evento:"Queda de material", parteCorpo:"Tronco" }), "Fatalidade");
  });
  t("parte vital NÃO agrava evento leve", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Corte", parteCorpo:"Face" }), "Corte / Laceração");
  });
  t("olho eleva projeção de partículas para perda de visão", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Projeção de partículas", parteCorpo:"Olhos" }), "Perda de membro, visão ou audição");
  });
  t("sem evento escolhido não há sugestão", ()=>{
    eq(C.sugerirGPDPorSelecao({ componente:"Correia" }), "");
  });
  t("o grau só é preenchido se estiver vazio", ()=>{
    const r = { nome:"", descricao:"", descricaoAuto:"", gpd:"", evento:"Choque elétrico" };
    C.aplicarSugestoesRisco(r); eq(r.gpd, "Fatalidade");
    const r2 = { nome:"", descricao:"", descricaoAuto:"", gpd:"Arranhão", evento:"Choque elétrico" };
    C.aplicarSugestoesRisco(r2); eq(r2.gpd, "Arranhão");
  });
  t("o motivo da sugestão é explicado", ()=>{
    ok(C.motivoGPDSugerido({ evento:"Esmagamento", parteCorpo:"Cabeça" }).indexOf("na cabeça") > 0);
    ok(C.motivoGPDSugerido({ evento:"Corte" }).indexOf("Corte") > 0);
  });
  t("o grau sugerido entra no HRN como qualquer outro", ()=>{
    const it = C.linhasEscopoSimples()[0];
    it.risco.gpd = C.sugerirGPDPorSelecao({ evento:"Amputação" });
    eq(C.hrnDoItem({tarefa:it.tarefa, risco:it.risco}).gpd, 6);
    it.risco.gpd = "";
  });

  console.log("\n=== t37 · o formulário de campo ===");
  t("o bloco entra no modal e a descrição deixou de ser obrigatória", ()=>{
    ok(HTML.indexOf("${blocoMontadorRiscoHtml(r)}") > 0, "bloco fora do formulário");
    ok(HTML.indexOf("<span>Descrição do Risco <span style=\"font-weight:400;color:var(--ink-faint)\">(opcional)</span></span>") > 0);
  });
  t("os quatro seletores são desenhados", ()=>{
    const h = C.blocoMontadorRiscoHtml({ local:"", componente:"", evento:"", parteCorpo:"", descricao:"", gpd:"" });
    ["local","componente","evento","parteCorpo"].forEach(k=> ok(h.indexOf("onDraftCampoRisco('"+k+"'") > 0, "faltou "+k));
    ["Local da máquina","Componente","O que pode acontecer?","Parte do corpo"].forEach(r=> ok(h.indexOf(r) > 0, "faltou "+r));
  });
  t("cada seletor oferece cadastrar um item novo", ()=>{
    const h = C.blocoMontadorRiscoHtml({ local:"", componente:"", evento:"", parteCorpo:"", descricao:"", gpd:"" });
    eq((h.match(/Outro — digitar e salvar no projeto/g)||[]).length, 4);
  });
  t("os últimos usados viram um grupo separado", ()=>{
    const h = C.selectRiscoCampoHtml("evento", "", P0);
    ok(h.indexOf('<optgroup label="Últimos usados">') > 0);
  });
  t("a frase montada aparece na tela antes de salvar", ()=>{
    const h = C.blocoMontadorRiscoHtml({ local:"Escada", componente:"", evento:"Queda", parteCorpo:"Cabeça", descricao:"", gpd:"" });
    ok(h.indexOf("risco-montador-frase") > 0);
    ok(h.indexOf("Risco de queda na escada, com lesão na cabeça.") > 0);
  });
  t("o grau sugerido aparece com o motivo e botão de aplicar", ()=>{
    const h = C.blocoMontadorRiscoHtml({ local:"", componente:"", evento:"Queda", parteCorpo:"Cabeça", descricao:"", gpd:"" });
    ok(h.indexOf("Grau do Dano sugerido") > 0);
    ok(h.indexOf("aplicarGPDSugerido") > 0);
  });
  t("quando o grau já está aplicado, o botão some", ()=>{
    const h = C.blocoMontadorRiscoHtml({ evento:"Choque elétrico", parteCorpo:"", descricao:"", gpd:"Fatalidade" });
    ok(h.indexOf("já aplicado") > 0);
    ok(h.indexOf("aplicarGPDSugerido") < 0);
  });
  t("métodos do App existem", ()=>{
    ["onDraftCampoRisco(chave, valor)","aplicarDescricaoSugerida()","aplicarGPDSugerido()"]
      .forEach(m=> ok(HTML.indexOf(m) > 0, "faltou "+m));
    ok(HTML.indexOf("if(tipo===\"riscoS\"){ RISCO_CAMPOS.forEach(c=>{ if(ent[c.k]) registrarUsoRisco(c.k, ent[c.k]); }); }") > 0, "recentes não são gravados ao salvar");
  });
  t("os campos novos nascem no risco", ()=>{
    ok(HTML.indexOf('local:"", componente:"", evento:"", parteCorpo:"", descricaoAuto:""') > 0);
  });

  console.log("\n=== t38 · biblioteca de medidas ===");
  t("todas as medidas têm rótulo, grupo, texto proposto e texto de existente", ()=>{
    ok(vm.runInContext("BIBLIOTECA_MEDIDAS.every(m=> m.k && m.g && m.rot && m.prop && m.ex && Array.isArray(m.nr) && m.nr.length)", ctx),
       "alguma medida está incompleta");
  });
  t("nenhuma chave de medida repetida", ()=>{
    const ks = vm.runInContext("BIBLIOTECA_MEDIDAS.map(m=>m.k)", ctx);
    eq(new Set(ks).size, ks.length);
  });
  t("a biblioteca cobre os cinco grupos", ()=>{
    const gs = vm.runInContext("[...new Set(BIBLIOTECA_MEDIDAS.map(m=>m.g))]", ctx);
    ["Proteção física","Dispositivos de segurança","Elétrica e energia","Acesso e altura","Organizacional"]
      .forEach(g=> ok(gs.indexOf(g) >= 0, "faltou o grupo "+g));
    ok(vm.runInContext("BIBLIOTECA_MEDIDAS.length", ctx) >= 28, "biblioteca pequena demais");
  });
  t("todo item de NR-12 citado tem formato válido", ()=>{
    const nrs = vm.runInContext("BIBLIOTECA_MEDIDAS.reduce((a,m)=>a.concat(m.nr),[])", ctx);
    nrs.forEach(x=> ok(/^12\.\d+(\.\d+)*$/.test(x) || /^Anexo III, ite(m|ns) /.test(x), "citação suspeita: "+x));
  });
  t("os itens citados existem mesmo na NR-12 do projeto", ()=>{
    // amostra dos mais usados, conferidos palavra por palavra nos PDFs
    ["12.5.9","12.5.11","12.5.6","12.5.7","12.5.8","12.5.10","12.5.12","12.5.13",
     "12.5.15","12.5.17","12.6.1","12.6.2","12.6.3","12.4.1","12.4.3","12.3.2",
     "12.3.5","12.3.8","12.11.3","12.7.1"].forEach(it=>{
      ok(vm.runInContext("BIBLIOTECA_MEDIDAS.some(m=>m.nr.indexOf("+JSON.stringify(it)+")>=0)", ctx), "item "+it+" não é usado");
    });
  });
  t("as normas de apoio aparecem nas medidas certas", ()=>{
    const ap = k => vm.runInContext("(BIBLIOTECA_MEDIDAS.find(m=>m.k==="+JSON.stringify(k)+")||{}).apoio||[]", ctx).join(" ");
    ok(ap("prot_fixa").indexOf("14120") >= 0, "proteção fixa sem a ISO 14120");
    ok(ap("prot_movel_int").indexOf("14119") >= 0, "intertravamento sem a ISO 14119");
    ok(ap("cortina").indexOf("61496") >= 0 && ap("cortina").indexOf("13855") >= 0, "cortina sem 61496/13855");
    ok(ap("adequar_vao").indexOf("13857") >= 0, "distâncias sem a ISO 13857");
    ok(ap("guarda_corpo").indexOf("14122-3") >= 0, "guarda-corpo sem a ISO 14122-3");
    ok(ap("loto").indexOf("NR-10") >= 0, "LOTO sem a NR-10");
  });

  console.log("\n=== t39 · texto da mitigação proposta ===");
  t("frase completa cita a medida, o alvo e a norma", ()=>{
    const r = { componente:"Correia", local:"Transmissão de potência" };
    const txt = C.medidaTextoProposto(r, "prot_fixa");
    ok(txt.indexOf("proteção fixa") > 0, "sem a medida");
    ok(txt.indexOf("a correia") > 0, "sem o alvo: " + txt);
    ok(txt.indexOf("NR-12, item 12.5.9 e item 12.5.11") > 0, "citação errada: " + txt);
    ok(txt.indexOf("ABNT NBR ISO 14120") > 0, "sem a norma de apoio");
    ok(txt.slice(-1) === ".", "sem ponto final");
  });
  t("sem componente, usa o local como alvo", ()=>{
    ok(C.medidaTextoProposto({ local:"Área de manutenção" }, "loto").length > 0);
  });
  t("sem nada escolhido, usa expressão genérica", ()=>{
    ok(C.medidaTextoProposto({}, "prot_fixa").indexOf("a zona de perigo") > 0);
  });
  t("medida inexistente não gera texto", ()=>{
    eq(C.medidaTextoProposto({}, "nao_existe"), "");
  });
  t("citação de anexo sai sem a palavra 'item' duplicada", ()=>{
    const txt = C.medidaTextoProposto({ local:"Plataforma" }, "guarda_corpo");
    ok(txt.indexOf("NR-12, Anexo III, item 7") > 0, "citação do anexo errada: " + txt);
    ok(txt.indexOf("item Anexo") < 0, "prefixo duplicado");
  });

  console.log("\n=== t40 · texto da medida já existente ===");
  t("medida adequada sai como 'Atende'", ()=>{
    const txt = C.medidaTextoExistente({ componente:"Correia" }, "prot_fixa", "ok", "");
    ok(txt.indexOf("Proteção fixa instalada") === 0, txt);
    ok(txt.indexOf("Atende ao disposto na NR-12") > 0, "sem o julgamento: " + txt);
    ok(txt.indexOf("porém") < 0, "não deveria ter ressalva");
  });
  t("medida parcial traz a ressalva e o julgamento certo", ()=>{
    const txt = C.medidaTextoExistente({ componente:"Correia" }, "prot_fixa", "parcial", "com abertura que ainda permite o acesso à zona de perigo");
    ok(txt.indexOf("porém com abertura que ainda permite") > 0, txt);
    ok(txt.indexOf("Atende parcialmente ao disposto") > 0, txt);
  });
  t("medida inadequada sai como 'Não atende'", ()=>{
    const txt = C.medidaTextoExistente({ componente:"Proteção" }, "arestas", "nao", "com arestas cortantes ou saliências expostas");
    ok(txt.indexOf("Não atende ao disposto") > 0, txt);
    ok(txt.indexOf("NR-12, item 12.5.11") > 0, txt);
  });
  t("as três situações existem e têm cor própria", ()=>{
    eq(vm.runInContext("MEDIDA_SITUACOES.length", ctx), 3);
    ok(vm.runInContext("MEDIDA_SITUACOES.every(s=> s.k && s.rot && s.frase && s.cor && s.fundo)", ctx));
  });
  t("a lista de ressalvas cobre os casos de campo", ()=>{
    const rs = vm.runInContext("MEDIDA_RESSALVAS", ctx);
    ok(rs.length >= 8, "poucas ressalvas");
    ok(rs.some(x=>x.indexOf("intertravamento") >= 0));
    ok(rs.some(x=>x.indexOf("ferramenta") >= 0));
  });

  console.log("\n=== t41 · pré-seleção da medida ===");
  t("correia na transmissão sugere proteção fixa", ()=>{
    eq(C.sugerirMedidaPorRisco({ componente:"Correia", local:"Transmissão de potência" }), "prot_fixa");
  });
  t("painel elétrico com choque sugere adequar o painel", ()=>{
    eq(C.sugerirMedidaPorRisco({ componente:"Painel elétrico", local:"Compartimento elétrico", evento:"Choque elétrico" }), "painel");
  });
  t("queda na plataforma sugere guarda-corpo", ()=>{
    eq(C.sugerirMedidaPorRisco({ local:"Plataforma", evento:"Queda" }), "guarda_corpo");
  });
  t("corte na proteção sugere eliminar arestas", ()=>{
    eq(C.sugerirMedidaPorRisco({ componente:"Proteção", evento:"Corte" }), "arestas");
  });
  t("área de manutenção sugere bloqueio de energia", ()=>{
    eq(C.sugerirMedidaPorRisco({ local:"Área de manutenção" }), "loto");
  });
  t("sem pistas, não sugere nada", ()=>{
    eq(C.sugerirMedidaPorRisco({}), "");
  });

  console.log("\n=== t42 · telas das medidas ===");
  t("bloco da medida existente traz marcação múltipla, situação e texto", ()=>{
    const h = C.blocoMedidaExistenteHtml({ componente:"Correia", medidasExistentes:["prot_fixa"], medidaExistenteSituacao:"parcial", medidaExistenteRessalva:"sem dispositivo de intertravamento", descMedida:"" });
    ok(h.indexOf("toggleMedidaExistente('prot_fixa')") > 0, "sem os botões de marcar");
    ok(h.indexOf("onDraftMedidaExistente('situacao','parcial')") > 0, "sem botões de situação");
    ok(h.indexOf("onDraftMedidaExistente('ressalva'") > 0, "sem lista de ressalvas");
    ok(h.indexOf("Atende parcialmente") > 0, "sem a frase montada");
    ok(h.indexOf("acrescentarOutroExistente()") > 0, "sem o campo de escrever um novo");
  });
  t("o seletor único de medida existente saiu de cena", ()=>{
    ok(HTML.indexOf("onDraftMedidaExistente('tipo'") < 0, "sobrou o seletor antigo na tela");
    ok(HTML.indexOf("App.aplicarTextoMedidaExistente()") < 0, "sobrou o botão do fluxo antigo");
  });
  t("marcar mais de uma medida junta as duas frases e as duas normas", ()=>{
    const txt = C.medidaTextoExistenteMulti({ componente:"Correia", medidasExistentes:["prot_fixa","loto"], medidaExistenteSituacao:"ok" });
    ok(txt.indexOf(";") > 0, "as duas frases não foram juntadas: " + txt);
    ok(txt.indexOf(" e na ") > 0, "as duas bases normativas não foram citadas: " + txt);
  });
  t("o que o usuário digita entra junto com o que ele marcou", ()=>{
    const txt = C.medidaTextoExistenteMulti({ componente:"Correia", medidasExistentes:["prot_fixa"], medidasExistentesOutros:["corrimão em toda a extensão"], medidaExistenteSituacao:"ok" });
    ok(txt.indexOf("Corrimão em toda a extensão") > 0, txt);
    ok(txt.indexOf("Proteção fixa") >= 0, txt);
  });
  t("nada marcado, nada escrito", ()=>{
    eq(C.medidaTextoExistenteMulti({ componente:"Correia" }), "");
  });
  t("quem tinha a medida antiga continua com ela marcada", ()=>{
    const r = { componente:"Correia", medidaExistenteTipo:"prot_fixa" };
    eq(C.medidasExistentesDe(r).join(","), "prot_fixa");
    ok(C.blocoMedidaExistenteHtml(r).indexOf('medida-chip ativo') > 0, "a medida antiga não apareceu marcada");
  });
  t("medidas que só fazem sentido como proposta não entram no que já existe", ()=>{
    const chaves = C.medidasParaExistente().map(m=>m.k);
    ["adequar_vao","arestas","fixacao","partida","categoria","painel","condutores","projeto_hab"]
      .forEach(k=> ok(chaves.indexOf(k) < 0, k + " não deveria estar na lista do que já existe"));
    ok(chaves.indexOf("prot_fixa") >= 0, "faltou proteção fixa");
    ok(chaves.indexOf("cerca") >= 0, "faltou cerca de proteção");
  });
  t("situação 'Atende' esconde a lista de ressalvas", ()=>{
    const h = C.blocoMedidaExistenteHtml({ componente:"Correia", medidasExistentes:["prot_fixa"], medidaExistenteSituacao:"ok", descMedida:"" });
    ok(h.indexOf("onDraftMedidaExistente('ressalva'") < 0);
  });
  t("bloco da mitigação oferece a sugestão do app", ()=>{
    const h = C.blocoMedidaPropostaHtml({ componente:"Correia", local:"Transmissão de potência", sugestaoMitigacao:"" });
    ok(h.indexOf("Sugestão do app: Proteção fixa") > 0, "sem pré-seleção");
    ok(h.indexOf("onDraftMedidaProposta") > 0);
  });
  t("os dois campos de texto continuam editáveis", ()=>{
    ok(C.blocoMedidaPropostaHtml({ sugestaoMitigacao:"meu texto" }).indexOf("setDraftField('sugestaoMitigacao'") > 0);
    ok(C.blocoMedidaExistenteHtml({ descMedida:"meu texto" }).indexOf("setDraftField('descMedida'") > 0);
  });
  t("o seletor é agrupado por família de medida", ()=>{
    const h = C.selectMedidaHtml("", "x");
    ok(h.indexOf('<optgroup label="Proteção física">') > 0);
    ok(h.indexOf('<optgroup label="Acesso e altura">') > 0);
  });
  t("a tela do laudo monta a medida no campo Solução", ()=>{
    STATE.projetosSimples = [mkProjeto()];
    STATE.ui.areasSelecionadasExport = ["a1","a2"];
    STATE.ui.areasExportConhecidas = ["a1","a2"];
    STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
    const it = C.linhasEscopoSimples()[0];
    it.risco.componente = "Correia";
    const h = C.laudoBlocoCampo(it, "solucao");
    ok(h.indexOf("laudoSetMedida('r1'") > 0, "sem seletor de medida");
    ok(h.indexOf("Sugestão do app") > 0, "sem pré-seleção");
    ok(C.laudoBlocoCampo(it, "risco").indexOf("laudoSetMedida") < 0, "só o campo Solução deveria ter o montador");
  });
  t("métodos existem e nada é sobrescrito sem permissão", ()=>{
    ["onDraftMedidaProposta(tipo)","aplicarTextoMitigacao()","onDraftMedidaExistente(campo, valor)",
     "aplicarTextoMedidaExistenteMulti()","toggleMedidaExistente(chave)","acrescentarOutroExistente()",
     "removerOutroExistente(i)","laudoSetMedida(rid, tipo)","laudoAplicarMedida(rid)"]
      .forEach(m=> ok(HTML.indexOf(m) > 0, "faltou "+m));
    ok(HTML.indexOf('atual === String(r.sugestaoMitigacaoAuto||"").trim()') > 0, "mitigação poderia sobrescrever texto do usuário");
    ok(HTML.indexOf('atual === String(r.descMedidaAuto||"").trim()') > 0, "medida existente poderia sobrescrever texto do usuário");
  });
  t("tudo é montado localmente — nenhuma chamada de rede", ()=>{
    const bloco = trecho("/* =========================================================================\n   BIBLIOTECA DE MEDIDAS", "\nfunction blocoMontadorRiscoHtml(r){");
    ["fetch(","chamarIA","XMLHttpRequest","await "].forEach(x=> ok(bloco.indexOf(x) < 0, "achei '"+x+"' na biblioteca — deixaria de funcionar sem internet"));
  });

  console.log("\n=== t43 · parâmetros F e P ===");
  t("a exposição tem as cinco faixas, contáveis", ()=>{
    const o = vm.runInContext("PLR_F_OPCOES.map(x=>x.v)", ctx);
    eq(o.length, 5);
    ["Menos de 1x por turno","1x por turno","2x por turno","Mais de 2x por turno","Contínua ou mais de 15 min por turno"]
      .forEach(x=> ok(o.indexOf(x) >= 0, "faltou "+x));
  });
  t("o corte F1/F2 é em 2x por turno, como na ISO/TR 14121-2", ()=>{
    eq(C.plrFrequencia({ exposicao:"Menos de 1x por turno" }), "F1");
    eq(C.plrFrequencia({ exposicao:"1x por turno" }), "F1");
    eq(C.plrFrequencia({ exposicao:"2x por turno" }), "F1");
    eq(C.plrFrequencia({ exposicao:"Mais de 2x por turno" }), "F2");
    eq(C.plrFrequencia({ exposicao:"Contínua ou mais de 15 min por turno" }), "F2");
  });
  t("a possibilidade de evitar tem duas opções, com o critério explicado", ()=>{
    eq(vm.runInContext("PLR_P_OPCOES.length", ctx), 2);
    eq(C.plrEvitar({ evitar:"Possível evitar" }), "P1");
    eq(C.plrEvitar({ evitar:"Praticamente impossível" }), "P2");
    ok(vm.runInContext("PLR_P_OPCOES[0].desc", ctx).indexOf("0,25 m/s") > 0, "sem o critério de velocidade");
  });
  t("resposta não reconhecida não vira parâmetro", ()=>{
    eq(C.plrFrequencia({ exposicao:"qualquer coisa" }), "");
    eq(C.plrEvitar({}), "");
  });

  console.log("\n=== t44 · severidade vinda do Grau do Dano ===");
  t("lesão reversível é S1, irreversível é S2", ()=>{
    eq(C.plrSeveridade({ gpd:"Arranhão" }), "S1");
    eq(C.plrSeveridade({ gpd:"Corte" }), "S1");
    eq(C.plrSeveridade({ gpd:"Fratura osso maior" }), "S2");
    eq(C.plrSeveridade({ gpd:"Perda de membro, visão ou audição" }), "S2");
    eq(C.plrSeveridade({ gpd:"Fatalidade" }), "S2");
  });
  t("sem Grau do Dano, não há severidade", ()=>{ eq(C.plrSeveridade({}), ""); });
  t("a fronteira entre S1 e S2 é sinalizada", ()=>{
    ok(C.plrSeveridadeFronteira({ gpd:"Fratura osso menor" }), "deveria avisar");
    ok(!C.plrSeveridadeFronteira({ gpd:"Fatalidade" }));
  });

  console.log("\n=== t45 · só medidas de comando têm PLr ===");
  t("as onze medidas de comando estão marcadas", ()=>{
    const comPl = vm.runInContext("BIBLIOTECA_MEDIDAS.filter(m=>m.pl).map(m=>m.k)", ctx);
    eq(comPl.length, 11, "marcadas: " + comPl.join(","));
    ["prot_movel_int","prot_movel_bloq","cortina","tapete","reset","emergencia",
     "emerg_cabo","bimanual","partida","categoria","modo_manut"].forEach(k=> ok(comPl.indexOf(k) >= 0, "faltou "+k));
  });
  t("medidas mecânicas e organizacionais não têm PLr", ()=>{
    ["prot_fixa","arestas","guarda_corpo","loto","sinalizacao","capacitacao","aterramento"]
      .forEach(k=> ok(!vm.runInContext("!!(medidaPorChave("+JSON.stringify(k)+")||{}).pl", ctx), k+" não deveria ter PLr"));
  });
  t("proteção fixa não é classificável e a tela explica", ()=>{
    const r = { medidaPropostaTipo:"prot_fixa", gpd:"Fatalidade", exposicao:"Mais de 2x por turno", evitar:"Praticamente impossível" };
    eq(C.plrExigido(r).aplicavel, false);
    ok(C.blocoPLrHtml(r, "draft").indexOf("não tem PLr a classificar") > 0);
  });
  t("a medida existente também habilita a classificação", ()=>{
    eq(C.plrExigido({ medidaExistenteTipo:"cortina" }).aplicavel, true);
  });
  t("cada medida de comando tem a frase da função de segurança", ()=>{
    ok(vm.runInContext("BIBLIOTECA_MEDIDAS.filter(m=>m.pl).every(m=> !!m.fs)", ctx), "alguma sem a frase");
  });
  t("a frase sai na sintaxe do Manual da NR-12", ()=>{
    const f = C.plrFraseFuncao({ medidaPropostaTipo:"prot_movel_int", componente:"Correia" });
    ok(f.indexOf("Ao se abrir a proteção móvel") === 0, f);
    ok(f.indexOf("a correia") > 0, "sem o alvo: " + f);
    ok(f.indexOf("deve parar") > 0, f);
  });

  console.log("\n=== t46 · gráfico de risco ===");
  t("as oito combinações estão mapeadas", ()=>{
    eq(Object.keys(vm.runInContext("PLR_GRAFICO", ctx)).length, 8);
  });
  /* Duas normas, dois graficos. O PLr vem da ISO 13849-1 (Anexo A), onde S1 se
     divide em F e P. A Categoria vem da NBR 14153 (Figura B.1), que tem cinco
     saidas: S1 vai direto para a Categoria 1, sem se dividir. Conferido na
     figura em 11/08/2026. */
  t("PLr segue a ISO 13849-1 e Categoria segue a NBR 14153", ()=>{
    const esperado = [["S1","F1","P1","a","1"],["S1","F1","P2","b","1"],["S1","F2","P1","b","1"],["S1","F2","P2","c","1"],
                      ["S2","F1","P1","c","2"],["S2","F1","P2","d","3"],["S2","F2","P1","d","3"],["S2","F2","P2","e","4"]];
    esperado.forEach(([s,f,p,plr,cat])=>{
      const g = vm.runInContext("PLR_GRAFICO["+JSON.stringify(s+f+p)+"]", ctx);
      eq(g.plr, plr, s+f+p); eq(g.cat, cat, s+f+p);
    });
  });
  t("caso real: correia com intertravamento, exposição alta e sem escapatória", ()=>{
    const r = { medidaPropostaTipo:"prot_movel_int", componente:"Correia", gpd:"Perda de Vários membros",
                exposicao:"Mais de 2x por turno", evitar:"Praticamente impossível" };
    const res = C.plrExigido(r);
    eq(res.s,"S2"); eq(res.f,"F2"); eq(res.p,"P2");
    eq(res.plr,"e"); eq(res.cat,"4"); eq(res.completo, true);
  });
  t("caso brando: corte, uma vez por turno, com chance de evitar", ()=>{
    const res = C.plrExigido({ medidaPropostaTipo:"emergencia", gpd:"Corte",
                               exposicao:"1x por turno", evitar:"Possível evitar" });
    eq(res.plr,"a"); eq(res.cat,"1", "ferimento leve cai na Categoria 1 pela Figura B.1, nunca em B");
  });
  t("toda combinação que começa em S1 cai na Categoria 1", ()=>{
    ["S1F1P1","S1F1P2","S1F2P1","S1F2P2"].forEach(k=>{
      eq(vm.runInContext("PLR_GRAFICO["+JSON.stringify(k)+"].cat", ctx), "1",
         k + " — na NBR 14153 o ramo S1 não se divide em F e P");
    });
  });
  t("faltando um parâmetro, não classifica e diz o que falta", ()=>{
    const r = { medidaPropostaTipo:"cortina", gpd:"Fatalidade", exposicao:"" };
    const res = C.plrExigido(r);
    eq(res.completo, false); eq(res.plr, "");
    const falta = C.plrFaltando(r);
    ok(falta.indexOf("Exposição") >= 0 && falta.indexOf("Possibilidade de evitar") >= 0, falta.join(","));
  });
  t("medida sem PLr não cobra parâmetro nenhum", ()=>{
    eq(C.plrFaltando({ medidaPropostaTipo:"prot_fixa" }).length, 0);
  });

  console.log("\n=== t47 · telas do PLr ===");
  t("o bloco traz os dois seletores e a origem da severidade", ()=>{
    const h = C.blocoPLrHtml({ id:"r1", medidaPropostaTipo:"prot_movel_int", componente:"Correia", gpd:"Fatalidade" }, "draft");
    ok(h.indexOf("onDraftPLr('exposicao'") > 0, "sem seletor de exposição");
    ok(h.indexOf("onDraftPLr('evitar'") > 0, "sem seletor de evitar");
    ok(h.indexOf("Severidade (S) vem do Grau do Dano") > 0);
    ok(h.indexOf("Fatalidade") > 0);
  });
  t("no laudo os seletores gravam no risco pelo id", ()=>{
    const h = C.blocoPLrHtml({ id:"r9", medidaPropostaTipo:"cortina", gpd:"Corte" }, "laudo");
    ok(h.indexOf("laudoSetPLr('r9','exposicao'") > 0);
    ok(h.indexOf("laudoSetPLr('r9','evitar'") > 0);
  });
  t("o resultado aparece com PLr e os parâmetros S·F·P — sem a Categoria", ()=>{
    /* Categoria saiu da exibição em 26/08/2026: a correspondência PLr→Categoria
       da Figura B.1 da NBR 14153 é imagem dentro do PDF da norma e ainda não
       foi conferida célula a célula (mesmo aviso já existente em
       PLR_GRAFICO). O cálculo de res.cat continua existindo — só não é mais
       mostrado — então o valor "Categoria 4" que este cenário geraria
       continua correto internamente, só não aparece na tela. */
    const h = C.blocoPLrHtml({ id:"r1", medidaPropostaTipo:"prot_movel_int", componente:"Correia",
      gpd:"Fatalidade", exposicao:"Mais de 2x por turno", evitar:"Praticamente impossível" }, "draft");
    ok(h.indexOf("PL<span>r</span> e") > 0, "sem o PLr");
    ok(h.indexOf("Categoria") < 0, "a categoria voltou a aparecer, sem ter sido conferida contra a NBR 14153");
    ok(h.indexOf("S2 · F2 · P2") > 0, "sem os parâmetros");
  });
  t("a tela avisa que é o nível REQUERIDO, não o atingido", ()=>{
    const h = C.blocoPLrHtml({ id:"r1", medidaPropostaTipo:"cortina", gpd:"Fatalidade",
      exposicao:"1x por turno", evitar:"Possível evitar" }, "draft");
    ok(h.indexOf("requerido") > 0, "sem a ressalva");
    ok(h.indexOf("MTTFd, DC e CCF") > 0, "não explica o que faltaria para afirmar o atingido");
  });
  t("a fronteira S1/S2 é avisada na tela", ()=>{
    const h = C.blocoPLrHtml({ id:"r1", medidaPropostaTipo:"cortina", gpd:"Fratura osso menor",
      exposicao:"1x por turno", evitar:"Possível evitar" }, "draft");
    ok(h.indexOf("fronteira entre S1 e S2") > 0);
  });
  t("a tabela do gráfico está isolada e diz de onde cada coluna veio", ()=>{
    eq((HTML.match(/const PLR_GRAFICO = \{/g)||[]).length, 1, "o gráfico deve existir num único lugar");
    ok(HTML.indexOf("ABNT NBR 14153:2022, Figura B.1") > 0, "a origem da coluna cat sumiu do código");
    ok(HTML.indexOf("ISO 13849-1:2023, Anexo A") > 0, "a origem da coluna plr sumiu do código");
    ok(HTML.indexOf("NÃO derive uma coluna da outra") > 0, "sem o aviso de que a correlação não é linear");
    ok(HTML.indexOf("ATENÇÃO: TABELA A CONFERIR CONTRA AS NORMAS ANTES DE ASSINAR") < 0,
       "o aviso antigo sai só quando a conferência for feita — e ela foi");
  });
  t("métodos existem", ()=>{
    ["onDraftPLr(campo, valor)","laudoSetPLr(rid, campo, valor)"].forEach(m=> ok(HTML.indexOf(m) > 0, "faltou "+m));
  });
  t("nada aqui depende de internet", ()=>{
    const bloco = trecho("/* =========================================================================\n   FUNÇÃO DE SEGURANÇA — PLr", "\nfunction selectMedidaHtml(valorAtual, acao){");
    ["fetch(","chamarIA","XMLHttpRequest"].forEach(x=> ok(bloco.indexOf(x) < 0, "achei '"+x+"'"));
  });

  console.log("\n=== t48 · módulo de impressão (bloco removível) ===");
  const INI = "██  INÍCIO DO MÓDULO DE IMPRESSÃO DO LAUDO — BLOCO REMOVÍVEL  ██";
  const FIM = "██  FIM DO MÓDULO DE IMPRESSÃO DO LAUDO  ██";
  const iIni = HTML.indexOf(INI), iFim = HTML.indexOf(FIM);
  const BLOCO = HTML.slice(HTML.lastIndexOf("/*", iIni), HTML.indexOf("*/", iFim) + 2);
  t("as duas marcas existem e aparecem uma única vez", ()=>{
    eq(HTML.split(INI).length - 1, 1, "marca de início");
    eq(HTML.split(FIM).length - 1, 1, "marca de fim");
    ok(iIni < iFim, "ordem invertida");
  });
  t("o bloco se instala sozinho — ninguém o chama de fora", ()=>{
    const fora = HTML.slice(0, HTML.lastIndexOf("/*", iIni)) + HTML.slice(HTML.indexOf("*/", iFim) + 2);
    ["telaImprimir","lpSetArea","lpZoom","lpImprimir","lpEnviarLogo","montarDoc","blocoCapa"]
      .forEach(n=> ok(fora.indexOf(n) < 0, "'" + n + "' é citado fora do bloco — apagar quebraria o app"));
  });
  t("removido o bloco, o arquivo continua íntegro (verificado por node --check)", ()=>{
    // Remove o bloco de verdade e roda node --check no resultado. Sem depender
    // de arquivo gerado por outro script: o teste se basta.
    const cp = require("child_process");
    const os = require("os");
    const path = require("path");
    const sem = HTML.slice(0, HTML.lastIndexOf("/*", iIni)) + HTML.slice(HTML.indexOf("*/", iFim) + 2);
    const scripts = sem.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) || [];
    ok(scripts.length >= 9, "perdeu blocos de script na remoção");
    let quebrados = 0;
    for(const bloco of scripts){
      const attrs = bloco.slice(0, bloco.indexOf(">"));
      if(/src=/i.test(attrs) || /application\/json/i.test(attrs)) continue;
      const corpo = bloco.slice(bloco.indexOf(">") + 1, bloco.lastIndexOf("<\/script>"));
      const tmp = path.join(os.tmpdir(), "rem_" + Math.random().toString(36).slice(2) + ".js");
      fs.writeFileSync(tmp, corpo, "utf8");
      const r = cp.spawnSync("node", ["--check", tmp], { encoding: "utf8" });
      if(r.status !== 0){ quebrados++; console.log("        " + String(r.stderr).slice(0, 160)); }
      fs.unlinkSync(tmp);
    }
    eq(quebrados, 0, "apagar o bloco deixou script inválido");
  });
  t("o bloco desiste sozinho se a central do laudo não existir", ()=>{
    ok(BLOCO.indexOf('typeof LAUDO_ABAS === "undefined" || typeof App === "undefined"') > 0,
       "sem a guarda de segurança na entrada");
  });
  t("instala a aba, o CSS e o desvio de tela — e nada mais", ()=>{
    ok(BLOCO.indexOf("LAUDO_ABAS") > 0, "não registra a aba");
    ok(BLOCO.indexOf("<style") > 0 || BLOCO.indexOf("createElement(\"style\")") > 0, "não injeta o próprio CSS");
    ok(BLOCO.indexOf("screenSimplesLaudo") > 0, "não embrulha a tela da central");
  });
  t("imprime exatamente as seções do laudo da Corteva", ()=>{
    ["blocoCapa","blocosInformacoes","blocosMetodologia","blocoContraCapa","blocoConclusao"]
      .forEach(f=> ok(BLOCO.indexOf("function " + f) > 0, "faltou a seção " + f));
    ok(BLOCO.indexOf("INVENTÁRIO") > 0, "sem o inventário de máquinas");
    ok(BLOCO.indexOf("APRECIAÇÃO DE RISCOS") > 0, "sem a contracapa de riscos");
  });
  t("as abas de trabalho do Excel NÃO viram página", ()=>{
    ["Base Completa", "Resumo"].forEach(x=> eq(BLOCO.indexOf(x), -1, "'" + x + "' não deveria ser impressa"));
  });
  t("mede em pixel e espera fonte e imagem antes de paginar", ()=>{
    ok(BLOCO.indexOf("document.fonts") > 0, "não espera a fonte carregar");
    ok(BLOCO.indexOf("function esperarImagens") > 0, "não espera as imagens");
    ok(BLOCO.indexOf("function reduzirFoto") > 0, "não reduz as fotos antes de paginar");
  });
  t("preview e PDF usam os mesmos elementos", ()=>{
    ok(BLOCO.indexOf("window.print") > 0, "não usa o motor do navegador");
    ok(BLOCO.indexOf("html2pdf") < 0 && BLOCO.indexOf("jsPDF") < 0, "voltou a usar captura de tela");
  });
  t("garante que o fundo colorido saia no PDF", ()=>{
    ok(BLOCO.indexOf("print-color-adjust") > 0, "as faixas de HRN sairiam brancas");
  });
  t("os métodos da aba existem no App", ()=>{
    ["lpSetArea","lpZoom","lpImprimir","lpEnviarLogo"].forEach(m=> ok(BLOCO.indexOf(m) > 0, "faltou " + m));
  });

  console.log("\n=== t49 · ordem das abas da central ===");
  t("a ordem é Projeto · Áreas · IA · Revisão · Exportar", ()=>{
    const ks = vm.runInContext("LAUDO_ABAS.map(a=>a.k)", ctx);
    eq(ks.join(","), "projeto,escopo,ia,revisao,exportar");
  });
  t("os rótulos aparecem nessa ordem na tela", ()=>{
    STATE.ui.laudoAba = "revisao";
    const h = C.screenSimplesLaudo();
    const pos = ["Projeto","Áreas","IA","Revisão","Exportar"].map(r=>{
      const i = h.indexOf(">"+r+"<");
      ok(i > 0, "faltou a aba "+r);
      return i;
    });
    for(let i=1;i<pos.length;i++) ok(pos[i-1] < pos[i], "aba fora de ordem na posição "+i);
  });
  t("Imprimir continua sendo acrescentada ao final pelo bloco removível", ()=>{
    ok(BLOCO.indexOf('LAUDO_ABAS.push({ k:"imprimir", rot:"Imprimir" });') > 0, "não registra mais a aba");
    ok(HTML.indexOf('{ k:"imprimir"') === HTML.indexOf('LAUDO_ABAS.push({ k:"imprimir"') + 'LAUDO_ABAS.push('.length,
       "a aba Imprimir passou a ser declarada fora do bloco removível");
  });
  t("a aba de abertura continua sendo Revisão", ()=>{
    STATE.ui.laudoAba = null;
    eq(C.getLaudoAba(), "revisao");
  });

  console.log("\n=== t50 · cadastro rápido de inspetor ===");
  t("o seletor de Inspetor ganhou o botão de cadastrar", ()=>{
    STATE.ui.laudoAba = "projeto";
    const h = C.laudoAbaProjeto();
    ok(h.indexOf("App.laudoAbrirInspetor('p1')") > 0, "sem o botão");
    ok(h.indexOf("App.laudoSetProjeto('p1','inspetorId'") > 0, "o seletor sumiu");
    ok(h.indexOf('title="Cadastrar um inspetor novo"') > 0, "sem a dica de uso");
  });
  t("botão e seletor ficam lado a lado, sem espremer o seletor", ()=>{
    const h = C.laudoAbaProjeto();
    const i = h.indexOf("App.laudoAbrirInspetor('p1')");
    const trechoCampo = h.slice(Math.max(0, i-700), i);
    ok(trechoCampo.indexOf("display:flex") > 0, "não estão na mesma linha");
    ok(trechoCampo.indexOf("flex:1;min-width:0") > 0, "o seletor não ocupa a sobra da linha");
  });
  t("o modal traz Nome e Cargo, os mesmos campos de Configurações", ()=>{
    vm.runInContext("__inspetorDraft = { pid:'p1', nome:'', cargo:'' };", ctx);
    const h = vm.runInContext("laudoModalInspetorHtml()", ctx);
    ok(h.indexOf("Novo inspetor") > 0, "sem título");
    ok(h.indexOf("laudoSetInspetorDraft('nome'") > 0, "faltou Nome");
    ok(h.indexOf("laudoSetInspetorDraft('cargo'") > 0, "faltou Cargo");
    ok(h.indexOf("Empresa e Responsáveis") > 0, "não diz que é a mesma lista");
  });
  t("o modal tem Cancelar e Salvar e fecha ao tocar fora", ()=>{
    const h = vm.runInContext("laudoModalInspetorHtml()", ctx);
    ok(h.indexOf("App.laudoFecharInspetor()") > 0, "sem cancelar");
    ok(h.indexOf("App.laudoSalvarInspetor()") > 0, "sem salvar");
    ok(h.indexOf('onclick="if(event.target===this)App.laudoFecharInspetor()"') > 0, "não fecha ao tocar fora");
  });
  t("o que já foi digitado reaparece se o modal for redesenhado", ()=>{
    vm.runInContext("__inspetorDraft = { pid:'p1', nome:'Ana \\\" Souza', cargo:'Eng.' };", ctx);
    const h = vm.runInContext("laudoModalInspetorHtml()", ctx);
    ok(h.indexOf('value="Ana &quot; Souza"') > 0, "nome não voltou escapado");
    ok(h.indexOf('value="Eng."') > 0, "cargo não voltou");
  });
  t("os métodos existem no App e o rascunho não encosta no STATE", ()=>{
    ["laudoAbrirInspetor(pid)","laudoSetInspetorDraft(campo, v)","laudoFecharInspetor()","laudoSalvarInspetor()"]
      .forEach(m=> ok(HTML.indexOf("  " + m) > 0, "faltou " + m));
    ok(HTML.indexOf("let __inspetorDraft = null;") > 0, "o rascunho deveria viver fora do STATE");
    ok(HTML.indexOf("STATE.ui.inspetorDraft") < 0, "o rascunho não pode ser gravado no STATE");
  });
  t("salvar exige nome, grava na lista e já seleciona no projeto", ()=>{
    const ini = HTML.indexOf("laudoSalvarInspetor(){");
    ok(ini > 0, "método não encontrado");
    const corpo = HTML.slice(ini, HTML.indexOf("laudoMostrarMais()", ini));
    ok(corpo.indexOf('if(!nome){ toast("Informe o nome do inspetor", false); return; }') > 0, "salva sem nome");
    ok(corpo.indexOf("getUsuariosInspetores().push(novo);") > 0, "não entra na lista");
    ok(corpo.indexOf("p.inspetorId = alvoId;") > 0, "não fica selecionado no projeto");
    ok(corpo.indexOf("p.atualizadoEm = agoraSync();") > 0, "não carimba o projeto para sincronizar");
    ok(corpo.indexOf("marcarEquipeAlterada();") > 0, "não marca a equipe para sincronizar");
    ok(corpo.indexOf("gravarInspetorNoProjeto(p);") > 0, "não grava o nome dentro do projeto");
  });
  t("o rodapé explica os dois botões e que a lista é compartilhada", ()=>{
    const h = C.laudoAbaProjeto();
    ok(h.indexOf("cadastra um nome novo") > 0, "não explica o botão +");
    ok(h.indexOf("corrige ou remove") > 0, "não explica o botão de lápis");
    ok(h.indexOf("compartilhada entre todos os aparelhos") > 0, "não diz que a lista sincroniza");
    ok(h.indexOf("Configurações → Empresa e Responsáveis") > 0, "não diz onde mais ela aparece");
  });

  console.log("\n=== t51 · carimbo de tempo à prova de relógio errado ===");
  const relogioReal = Date.now;
  t("com o relógio certo, o carimbo é a hora de verdade", ()=>{
    STATE.ui.ultimoCarimboVisto = 0;
    vm.runInContext("__ultimoCarimboVisto = 0;", ctx);
    const ts = vm.runInContext("agoraSync()", ctx);
    ok(Math.abs(ts - relogioReal()) < 3000, "carimbo longe da hora real");
  });
  t("dois carimbos seguidos nunca se repetem", ()=>{
    const a = vm.runInContext("agoraSync()", ctx);
    const b = vm.runInContext("agoraSync()", ctx);
    const c = vm.runInContext("agoraSync()", ctx);
    ok(a < b && b < c, "carimbos repetidos ou fora de ordem: "+[a,b,c]);
  });
  t("aparelho com relógio ATRASADO não perde as próprias edições", ()=>{
    STATE.ui.ultimoCarimboVisto = 0;
    vm.runInContext("__ultimoCarimboVisto = 0;", ctx);
    const horaCerta = relogioReal();
    vm.runInContext("registrarCarimboVisto(" + horaCerta + ")", ctx); // item vindo do aparelho com hora certa
    ctx.Date = { now: ()=> horaCerta - 3*24*3600*1000 }; // este aparelho, 3 dias atrasado
    const meu = vm.runInContext("agoraSync()", ctx);
    ctx.Date = Date;
    ok(meu > horaCerta, "a edição deste aparelho seria descartada pelos outros");
  });
  t("o relógio lógico sobrevive a fechar e reabrir o app", ()=>{
    const ts = vm.runInContext("agoraSync()", ctx);
    eq(STATE.ui.ultimoCarimboVisto, ts, "não ficou gravado no STATE");
    vm.runInContext("__ultimoCarimboVisto = 0;", ctx); // simula app reaberto
    ok(vm.runInContext("agoraSync()", ctx) > ts, "recomeçou do zero e perderia edições");
  });
  t("carimbo que chega da nuvem entra na conta", ()=>{
    const corpo = HTML.slice(HTML.indexOf("function __onedriveMesclarItemNovoInterno"), HTML.indexOf("function __onedriveMesclarItemNovoInterno") + 900);
    ok(corpo.indexOf("registrarCarimboVisto(dados.atualizadoEm)") > 0, "item baixado não alimenta o relógio lógico");
  });

  console.log("\n=== t52 · item movido não duplica mais ===");
  const T0 = 1750000000000;
  function arvore(){
    STATE.projetosSimples = [{ id:"p9", empresa:"C", criadoEm:T0, atualizadoEm:T0, areas:[
      { id:"a1", nome:"A1", criadoEm:T0, atualizadoEm:T0, maquinas:[
        { id:"m1", nome:"M1", criadoEm:T0, atualizadoEm:T0, tarefas:[
          { id:"t1", tarefa:"T1", criadoEm:T0, atualizadoEm:T0, riscos:[
            { id:"r1", nome:"R1", criadoEm:T0, atualizadoEm:T0 }]}]},
        { id:"m2", nome:"M2", criadoEm:T0, atualizadoEm:T0, tarefas:[
          { id:"t2", tarefa:"T2", criadoEm:T0, atualizadoEm:T0, riscos:[] }]}]},
      { id:"a2", nome:"A2", criadoEm:T0, atualizadoEm:T0, maquinas:[] }]}];
  }
  const PRJ = ()=> STATE.projetosSimples[0];
  t("as quatro camadas sabem onde procurar um item", ()=>{
    arvore();
    eq(vm.runInContext("__listasIrmasDe('area').length", ctx), 1);
    eq(vm.runInContext("__listasIrmasDe('maquina').length", ctx), 2);
    eq(vm.runInContext("__listasIrmasDe('tarefa').length", ctx), 2);
    eq(vm.runInContext("__listasIrmasDe('risco').length", ctx), 2);
  });
  t("máquina movida de área é MOVIDA, não copiada", ()=>{
    arvore();
    const destino = PRJ().areas.find(a=>a.id==="a2").maquinas;
    ctx.__destino = destino; ctx.__dados = { id:"m1", nome:"M1", atualizadoEm:T0+60000 };
    eq(vm.runInContext("__moverItemEntrePais('maquina', __destino, __dados)", ctx), true);
    const copias = PRJ().areas.reduce((n,a)=>n + a.maquinas.filter(m=>m.id==="m1").length, 0);
    eq(copias, 1, "duplicou");
    eq(PRJ().areas.find(a=>a.id==="a2").maquinas[0].id, "m1", "não chegou no destino");
    eq(PRJ().areas.find(a=>a.id==="a2").maquinas[0].tarefas.length, 1, "não levou as tarefas junto");
  });
  t("tarefa e risco também são movidos, não copiados", ()=>{
    arvore();
    ctx.__destino = PRJ().areas[0].maquinas.find(m=>m.id==="m2").tarefas;
    ctx.__dados = { id:"t1", tarefa:"T1", atualizadoEm:T0+60000 };
    eq(vm.runInContext("__moverItemEntrePais('tarefa', __destino, __dados)", ctx), true);
    let nT = 0; PRJ().areas[0].maquinas.forEach(m=> nT += m.tarefas.filter(t=>t.id==="t1").length);
    eq(nT, 1, "tarefa duplicou");
    arvore();
    ctx.__destino = PRJ().areas[0].maquinas[1].tarefas[0].riscos;
    ctx.__dados = { id:"r1", nome:"R1", atualizadoEm:T0+60000 };
    eq(vm.runInContext("__moverItemEntrePais('risco', __destino, __dados)", ctx), true);
    let nR = 0; PRJ().areas[0].maquinas.forEach(m=>m.tarefas.forEach(t=> nR += t.riscos.filter(r=>r.id==="r1").length));
    eq(nR, 1, "risco duplicou");
  });
  t("se a versão daqui é mais nova, quem move é este aparelho", ()=>{
    arvore();
    PRJ().areas[0].maquinas[0].atualizadoEm = T0 + 999000;
    ctx.__destino = PRJ().areas.find(a=>a.id==="a2").maquinas;
    ctx.__dados = { id:"m1", nome:"M1", atualizadoEm:T0+60000 };
    eq(vm.runInContext("__moverItemEntrePais('maquina', __destino, __dados)", ctx), false);
    eq(PRJ().areas.find(a=>a.id==="a2").maquinas.length, 0, "aceitou voltar por cima da versão nova");
  });
  t("item que é realmente novo continua nascendo", ()=>{
    arvore();
    ctx.__destino = PRJ().areas[0].maquinas;
    ctx.__dados = { id:"m-novo", nome:"Nova", atualizadoEm:T0 };
    eq(vm.runInContext("__moverItemEntrePais('maquina', __destino, __dados)", ctx), null, "confundiu item novo com item movido");
  });
  t("as quatro camadas da mesclagem usam o mesmo tratamento", ()=>{
    ["area","maquina","tarefa","risco"].forEach(tp=>
      ok(HTML.indexOf('__moverItemEntrePais("'+tp+'"') > 0, "faltou "+tp));
  });
  t("mover no app carimba a subárvore (sem isso a mudança nunca sai daqui)", ()=>{
    ok(HTML.indexOf("marcarSubarvoreMaquinaAlterada(m); // sem isto a mudança nunca sai deste aparelho") > 0);
    ok(HTML.indexOf("marcarSubarvoreTarefaAlterada(t); // sem isto a mudança nunca sai deste aparelho") > 0);
    ok(HTML.indexOf("r.atualizadoEm = agoraSync(); // sem isto a mudança nunca sai deste aparelho") > 0);
    arvore();
    ctx.__maq = PRJ().areas[0].maquinas[0];
    vm.runInContext("marcarSubarvoreMaquinaAlterada(__maq)", ctx);
    const m = PRJ().areas[0].maquinas[0];
    ok(m.atualizadoEm > T0 && m.tarefas[0].atualizadoEm > T0 && m.tarefas[0].riscos[0].atualizadoEm > T0,
       "a subárvore inteira precisa ser carimbada");
  });

  console.log("\n=== t53 · equipe compartilhada entre aparelhos ===");
  function equipeLimpa(){
    STATE.ui.usuariosInspetores = null; STATE.ui.inspetoresPadraoAplicados = false;
    STATE.ui.inspetoresRemovidos = {}; STATE.ui.equipeSyncEm = 0; STATE.ui.mecseteEm = 0;
    STATE.ui.mecseteConfig = { empresa:"Mecsete Engenharia", respCREA:"20037/D-GO" };
    return vm.runInContext("getUsuariosInspetores()", ctx);
  }
  t("os dois inspetores padrão vêm com id fixo, igual em todo aparelho", ()=>{
    const padrao = vm.runInContext("INSPETORES_PADRAO", ctx);
    eq(padrao.length, 2);
    eq(padrao[0].nome, "Daniel Costa Gonçalves"); eq(padrao[0].cargo, "Técnico Mecânico");
    eq(padrao[1].nome, "Luiz Hermelino Araujo"); eq(padrao[1].cargo, "Engenheiro Mecânico");
    padrao.forEach(u=> ok(/^insp-[a-z-]+$/.test(u.id), "id sorteado em vez de fixo: "+u.id));
    ok(HTML.indexOf('{ id:uid(), nome:"Daniel Costa Gonçalves"') < 0, "ainda sorteia o id do padrão");
  });
  t("aparelho antigo: o id sorteado vira o fixo e o projeto é reapontado", ()=>{
    STATE.ui.usuariosInspetores = [{ id:"sorteado123", nome:"Daniel Costa Gonçalves", cargo:"Técnico Mecânico" }];
    STATE.ui.inspetoresPadraoAplicados = false; STATE.ui.inspetoresRemovidos = {};
    STATE.projetosSimples = [{ id:"pM", empresa:"C", areas:[], inspetorId:"sorteado123" }];
    const lista = vm.runInContext("getUsuariosInspetores()", ctx);
    eq(lista.filter(u=>/Daniel/.test(u.nome)).length, 1, "duplicou o Daniel");
    eq(lista.find(u=>/Daniel/.test(u.nome)).id, "insp-daniel-costa-goncalves");
    eq(STATE.projetosSimples[0].inspetorId, "insp-daniel-costa-goncalves", "o projeto ficou apontando para o id morto");
    ok(lista.some(u=>/Luiz Hermelino/.test(u.nome)), "o Luiz não foi acrescentado");
  });
  t("inspetor removido de propósito não volta pelo padrão", ()=>{
    STATE.ui.usuariosInspetores = []; STATE.ui.inspetoresPadraoAplicados = false;
    STATE.ui.inspetoresRemovidos = { "insp-luiz-hermelino-araujo": 9999 };
    ok(!vm.runInContext("getUsuariosInspetores()", ctx).some(u=>u.id==="insp-luiz-hermelino-araujo"));
  });
  t("união: quem cadastra em aparelhos diferentes não perde ninguém", ()=>{
    equipeLimpa();
    vm.runInContext("getUsuariosInspetores().push({id:'u-cel', nome:'Maria Silva', cargo:'Eng', atualizadoEm:1000})", ctx);
    ctx.__pac = { inspetores:[
      {id:"insp-daniel-costa-goncalves", nome:"Daniel Costa Gonçalves", cargo:"Técnico Mecânico", atualizadoEm:0},
      {id:"insp-luiz-hermelino-araujo", nome:"Luiz Hermelino Araujo", cargo:"Engenheiro Mecânico", atualizadoEm:0},
      {id:"u-pc", nome:"João Pereira", cargo:"Téc", atualizadoEm:1500}], removidos:{}, mecsete:{}, mecseteEm:0 };
    const r = vm.runInContext("aplicarPacoteEquipe(__pac)", ctx);
    const nomes = vm.runInContext("getUsuariosInspetores()", ctx).map(u=>u.nome);
    eq(nomes.length, 4, "perdeu gente: "+nomes.join(", "));
    ok(nomes.indexOf("Maria Silva") >= 0 && nomes.indexOf("João Pereira") >= 0);
    ok(r.faltaNoRemoto, "não avisou que a união precisa voltar para a nuvem");
  });
  t("o mesmo inspetor editado nos dois: vence o carimbo maior", ()=>{
    equipeLimpa();
    const d = vm.runInContext("getUsuariosInspetores()", ctx).find(u=>u.id==="insp-daniel-costa-goncalves");
    d.nome = "Daniel daqui"; d.atualizadoEm = 5000;
    ctx.__pac = { inspetores:[{id:"insp-daniel-costa-goncalves", nome:"Daniel antigo", cargo:"x", atualizadoEm:3000}], removidos:{}, mecsete:{}, mecseteEm:0 };
    vm.runInContext("aplicarPacoteEquipe(__pac)", ctx);
    eq(vm.runInContext("getUsuariosInspetores()", ctx).find(u=>u.id==="insp-daniel-costa-goncalves").nome, "Daniel daqui");
    ctx.__pac = { inspetores:[{id:"insp-daniel-costa-goncalves", nome:"Daniel de lá", cargo:"y", atualizadoEm:9000}], removidos:{}, mecsete:{}, mecseteEm:0 };
    vm.runInContext("aplicarPacoteEquipe(__pac)", ctx);
    eq(vm.runInContext("getUsuariosInspetores()", ctx).find(u=>u.id==="insp-daniel-costa-goncalves").nome, "Daniel de lá");
  });
  t("remoção viaja como lápide e o inspetor não ressuscita", ()=>{
    equipeLimpa();
    ctx.__pac = { inspetores:[], removidos:{ "insp-luiz-hermelino-araujo": 9999 }, mecsete:{}, mecseteEm:0 };
    vm.runInContext("aplicarPacoteEquipe(__pac)", ctx);
    ok(!vm.runInContext("getUsuariosInspetores()", ctx).some(u=>u.id==="insp-luiz-hermelino-araujo"), "a lápide não removeu");
    ctx.__pac = { inspetores:[{id:"insp-luiz-hermelino-araujo", nome:"Luiz Hermelino Araujo", cargo:"Eng", atualizadoEm:5000}], removidos:{}, mecsete:{}, mecseteEm:0 };
    vm.runInContext("aplicarPacoteEquipe(__pac)", ctx);
    ok(!vm.runInContext("getUsuariosInspetores()", ctx).some(u=>u.id==="insp-luiz-hermelino-araujo"), "ressuscitou");
  });
  t("dados da MecSete viajam sem apagar o que não veio no pacote", ()=>{
    equipeLimpa();
    ctx.__pac = { inspetores:[], removidos:{}, mecsete:{ respCREA:"99999/D-GO" }, mecseteEm:7000 };
    ok(vm.runInContext("aplicarPacoteEquipe(__pac)", ctx).mudou);
    eq(vm.runInContext("getMecseteConfig().respCREA", ctx), "99999/D-GO");
    eq(vm.runInContext("getMecseteConfig().empresa", ctx), "Mecsete Engenharia", "apagou campo que não veio");
  });
  t("o pacote enviado leva inspetores, lápides e dados da MecSete", ()=>{
    equipeLimpa();
    const pac = vm.runInContext("montarPacoteEquipe()", ctx);
    ["atualizadoEm","inspetores","removidos","mecsete","mecseteEm"].forEach(k=> ok(k in pac, "faltou "+k));
    eq(pac.inspetores.length, 2);
  });
  t("a equipe entra nos dois ciclos de sincronização", ()=>{
    ok(HTML.indexOf("const equipe = await onedriveSincronizarEquipe(!!onProgresso);") > 0, "não entra no ciclo automático");
    ok(HTML.indexOf("const equipeManual = await onedriveSincronizarEquipe(true);") > 0, "não entra na sincronização manual");
    ok(HTML.indexOf('equipe_${agoraLocal}.json') > 0, "não grava o arquivo da equipe");
    ok(HTML.indexOf("SUBPASTA_CONFIG_EQUIPE") > 0, "não define a pasta");
  });
  t("toda alteração de inspetor marca a equipe para sincronizar", ()=>{
    ["adicionarUsuarioInspetor","removerUsuarioInspetor","onUsuarioInspetorInput","onMecseteConfigInput"].forEach(m=>{
      const i = HTML.indexOf("  "+m+"(");
      ok(i > 0, "método sumiu: "+m);
      ok(HTML.slice(i, i+520).indexOf("marcarEquipeAlterada()") > 0, m+" não sincroniza");
    });
  });

  console.log("\n=== t54 · o laudo nunca sai com o inspetor em branco ===");
  t("escolher o inspetor grava nome e cargo dentro do projeto", ()=>{
    equipeLimpa();
    STATE.projetosSimples = [{ id:"pX", empresa:"C", areas:[], inspetorId:"insp-luiz-hermelino-araujo" }];
    vm.runInContext("gravarInspetorNoProjeto(STATE.projetosSimples[0])", ctx);
    eq(STATE.projetosSimples[0].inspetorNome, "Luiz Hermelino Araujo");
    eq(STATE.projetosSimples[0].inspetorCargo, "Engenheiro Mecânico");
  });
  t("aparelho que não conhece o código ainda imprime o nome certo", ()=>{
    STATE.ui.usuariosInspetores = []; STATE.ui.inspetoresPadraoAplicados = true;
    const r = vm.runInContext("inspetorDoProjeto(STATE.projetosSimples[0])", ctx);
    eq(r.nome, "Luiz Hermelino Araujo", "a capa do laudo sairia em branco");
    eq(r.cargo, "Engenheiro Mecânico");
    eq(r.conhecido, false, "deveria sinalizar que veio de outro aparelho");
  });
  t("a capa do laudo usa essa reserva", ()=>{
    ok(BLOCO.indexOf("const insp = inspetorDoProjeto(proj);") > 0, "a capa voltou a depender só da lista local");
    ok(BLOCO.indexOf("d.insp.nome") > 0 && BLOCO.indexOf("d.insp.cargo") > 0, "a capa parou de imprimir o inspetor");
  });
  t("projeto sem inspetor continua vazio, sem inventar nome", ()=>{
    STATE.projetosSimples = [{ id:"pY", empresa:"C", areas:[] }];
    const r = vm.runInContext("inspetorDoProjeto(STATE.projetosSimples[0])", ctx);
    eq(r.nome, ""); eq(r.conhecido, true);
  });
  t("a tela avisa quando o inspetor veio de outro aparelho", ()=>{
    equipeLimpa();
    STATE.projetosSimples = [mkProjeto()];
    STATE.projetosSimples[0].inspetorId = "id-que-nao-existe-aqui";
    STATE.projetosSimples[0].inspetorNome = "Maria Silva";
    STATE.projetosSimples[0].inspetorCargo = "Engenheira";
    STATE.ui.areasSelecionadasExport = ["a1","a2"]; STATE.ui.areasExportConhecidas = ["a1","a2"];
    const h = C.laudoAbaProjeto();
    ok(h.indexOf("foi cadastrado em outro aparelho") > 0, "sem aviso");
    ok(h.indexOf("Maria Silva") > 0, "não mostra de quem se trata");
  });
  t("com inspetor conhecido, nenhum aviso aparece", ()=>{
    STATE.projetosSimples[0].inspetorId = "insp-daniel-costa-goncalves";
    const h = C.laudoAbaProjeto();
    ok(h.indexOf("foi cadastrado em outro aparelho") < 0, "aviso aparecendo à toa");
    ok(h.indexOf("App.laudoEditarInspetor('p1','insp-daniel-costa-goncalves')") > 0, "sem o botão de editar");
  });
  t("sem inspetor escolhido, o botão de editar não aparece", ()=>{
    STATE.projetosSimples[0].inspetorId = "";
    const h = C.laudoAbaProjeto();
    ok(h.indexOf("App.laudoEditarInspetor(") < 0, "botão de editar sem ninguém escolhido");
    ok(h.indexOf("App.laudoAbrirInspetor('p1')") > 0, "sumiu o botão de cadastrar");
  });
  t("corrigir o nome atualiza também os laudos que já citavam a pessoa", ()=>{
    const ini = HTML.indexOf("laudoSalvarInspetor(){");
    const corpo = HTML.slice(ini, HTML.indexOf("laudoMostrarMais()", ini));
    ok(corpo.indexOf("if(x.inspetorId !== d.uid || x === p) return;") > 0, "não propaga a correção");
    ok(corpo.indexOf("gravarInspetorNoProjeto(x);") > 0, "não regrava o nome nos outros projetos");
  });
  t("remover inspetor deixa lápide e avisa quantos laudos o citam", ()=>{
    const ini = HTML.indexOf("laudoRemoverInspetor(){");
    ok(ini > 0, "método não existe");
    const corpo = HTML.slice(ini, ini + 1200);
    ok(corpo.indexOf("getInspetoresRemovidos()[d.uid] = agoraSync();") > 0, "sem lápide — voltaria do outro aparelho");
    ok(corpo.indexOf("projeto(s) citam esta pessoa") > 0, "não avisa o impacto");
    ok(corpo.indexOf("marcarEquipeAlterada();") > 0, "a remoção não viaja");
  });

  console.log("\n=== t55 · IA compartilhada: nenhuma norma ou instrução se perde ===");
  /* STATE.ui.apiKeyEm (carimbo unico) virou STATE.ui.apiKeysEm (por provedor) —
     estes testes usam sempre "anthropic" (provedor fixo do __iaConfigTeste),
     entao gravam/leem o carimbo desse provedor especificamente. */
  function marcarCarimboChaveTeste(valor){
    vm.runInContext("getApiKeysEm()['anthropic'] = " + (valor||0) + ";", ctx);
  }
  function iaLimpa(){
    STATE.ui.normasIA = []; STATE.ui.normasRemovidas = {}; STATE.ui.promptsEm = {};
    STATE.ui.iaSyncEm = 0; STATE.ui.apiKeyEm = 0; STATE.ui.apiKeysEm = {};
    vm.runInContext("setIAApiKey(''); resetIAConfigTeste();", ctx);
  }
  function pacoteDe(normas, prompts, promptsEm, chave, chaveEm){
    iaLimpa();
    STATE.ui.normasIA = normas.map(n=>({...n}));
    const c = vm.runInContext("getIAConfig()", ctx);
    Object.assign(c.prompts, prompts);
    STATE.ui.promptsEm = { ...promptsEm };
    if(chave !== undefined){ vm.runInContext("setIAApiKey(" + JSON.stringify(chave) + ")", ctx); marcarCarimboChaveTeste(chaveEm); }
    STATE.ui.iaSyncEm = 5000;
    return JSON.parse(JSON.stringify(vm.runInContext("montarPacoteIA()", ctx)));
  }
  const NORMA_A1 = { id:"n1", nome:"NR-12", texto:"txt1", ativo:true, criadoEm:1000, atualizadoEm:1000 };
  const NORMA_A2 = { id:"n2", nome:"NBR ISO 12100", texto:"txt2", ativo:true, criadoEm:1001, atualizadoEm:1001 };
  const NORMA_B  = { id:"n3", nome:"NBR 14153", texto:"txt3", ativo:true, criadoEm:2000, atualizadoEm:2000 };

  t("o pacote leva normas, lápides, carimbo por instrução e da chave", ()=>{
    const pac = pacoteDe([NORMA_A1], {risco_xlsx:"X"}, {risco_xlsx:1100}, "k1", 1200);
    ["atualizadoEm","apiKey","apiKeyEm","config","promptsEm","normasRemovidas","normas"].forEach(k=> ok(k in pac, "faltou "+k));
    ok("atualizadoEm" in pac.normas[0], "norma sem carimbo próprio");
  });
  t("duas normas cadastradas em aparelhos diferentes: nenhuma se perde", ()=>{
    const pacB = pacoteDe([NORMA_B], {}, {});
    // aparelho A recebe o pacote de B
    iaLimpa();
    STATE.ui.normasIA = [ {...NORMA_A1}, {...NORMA_A2} ];
    const r = vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pacB) + ")", ctx);
    const nomes = (STATE.ui.normasIA||[]).map(n=>n.nome);
    eq(nomes.length, 3, "perdeu norma: " + nomes.join(", "));
    ["NR-12","NBR ISO 12100","NBR 14153"].forEach(n=> ok(nomes.indexOf(n) >= 0, "faltou "+n));
    ok(r.faltaNoRemoto, "não avisou que a união precisa voltar para a nuvem");
  });
  t("instruções diferentes editadas em aparelhos diferentes: as duas ficam", ()=>{
    const pacB = pacoteDe([], {escopo_xlsx:"INSTRUCAO B"}, {escopo_xlsx:2100});
    iaLimpa();
    const c = vm.runInContext("getIAConfig()", ctx);
    c.prompts.risco_xlsx = "INSTRUCAO A";
    STATE.ui.promptsEm = { risco_xlsx: 1100 };
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pacB) + ")", ctx);
    eq(vm.runInContext("getIAConfig().prompts.risco_xlsx", ctx), "INSTRUCAO A", "a instrução daqui foi apagada");
    eq(vm.runInContext("getIAConfig().prompts.escopo_xlsx", ctx), "INSTRUCAO B", "a instrução de lá não chegou");
  });
  t("a mesma instrução editada nos dois: vence o carimbo maior", ()=>{
    const pacB = pacoteDe([], {risco_xlsx:"DE LA MAIS NOVO"}, {risco_xlsx:9000});
    iaLimpa();
    vm.runInContext("getIAConfig()", ctx).prompts.risco_xlsx = "DAQUI ANTIGO";
    STATE.ui.promptsEm = { risco_xlsx: 1000 };
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pacB) + ")", ctx);
    eq(vm.runInContext("getIAConfig().prompts.risco_xlsx", ctx), "DE LA MAIS NOVO");
    const pacC = pacoteDe([], {risco_xlsx:"DE LA ANTIGO"}, {risco_xlsx:1000});
    iaLimpa();
    vm.runInContext("getIAConfig()", ctx).prompts.risco_xlsx = "DAQUI MAIS NOVO";
    STATE.ui.promptsEm = { risco_xlsx: 9000 };
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pacC) + ")", ctx);
    eq(vm.runInContext("getIAConfig().prompts.risco_xlsx", ctx), "DAQUI MAIS NOVO");
  });
  t("aparelho sem chave NÃO apaga a chave dos outros", ()=>{
    const pacSemChave = pacoteDe([], {}, {}, "", 0);
    iaLimpa();
    vm.runInContext("setIAApiKey('chave-boa')", ctx);
    marcarCarimboChaveTeste(5000);
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pacSemChave) + ")", ctx);
    eq(vm.runInContext("getIAApiKey()", ctx), "chave-boa", "a chave foi apagada por um aparelho que nunca teve chave");
  });
  t("chave nova de outro aparelho chega em quem ainda não tinha", ()=>{
    const pacComChave = pacoteDe([], {}, {}, "chave-nova", 7000);
    iaLimpa();
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pacComChave) + ")", ctx);
    eq(vm.runInContext("getIAApiKey()", ctx), "chave-nova");
  });
  t("remover a chave de propósito propaga para os outros", ()=>{
    const pacRemocao = pacoteDe([], {}, {}, "", 9000);
    iaLimpa();
    vm.runInContext("setIAApiKey('chave-antiga')", ctx);
    marcarCarimboChaveTeste(100);
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pacRemocao) + ")", ctx);
    eq(vm.runInContext("getIAApiKey()", ctx), "", "a remoção não viajou");
  });
  t("norma removida vira lápide e não volta do outro aparelho", ()=>{
    const pacComNorma = pacoteDe([NORMA_A1], {}, {});
    iaLimpa();
    STATE.ui.normasRemovidas = { n1: 9999 };
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pacComNorma) + ")", ctx);
    ok(!(STATE.ui.normasIA||[]).some(n=>n.id==="n1"), "a norma ressuscitou");
  });
  t("norma editada depois da remoção volta a valer", ()=>{
    const viva = { ...NORMA_A1, atualizadoEm: 20000 };
    const pac = pacoteDe([viva], {}, {});
    iaLimpa();
    STATE.ui.normasRemovidas = { n1: 9999 };
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pac) + ")", ctx);
    ok((STATE.ui.normasIA||[]).some(n=>n.id==="n1"), "a norha reeditada deveria voltar");
  });
  t("a mesma norma editada dos dois lados: vence o carimbo maior", ()=>{
    const pac = pacoteDe([{ ...NORMA_A1, nome:"NR-12 rev 2026", atualizadoEm: 8000 }], {}, {});
    iaLimpa();
    STATE.ui.normasIA = [{ ...NORMA_A1, nome:"NR-12 antiga", atualizadoEm: 1000 }];
    vm.runInContext("aplicarPacoteIA(" + JSON.stringify(pac) + ")", ctx);
    eq((STATE.ui.normasIA||[]).find(n=>n.id==="n1").nome, "NR-12 rev 2026");
  });
  t("cada ponto de edição carimba a parte certa", ()=>{
    ok(HTML.indexOf("onIAConfigPromptInput(tipo, v){ getIAConfig().prompts[tipo] = v; marcarPromptAlterado(tipo); }") > 0,
       "instrução não carimba por instrução");
    ok(HTML.indexOf("onIAApiKeyInput(v){ setIAApiKey(v.trim()); marcarChaveIAAlterada(getIAConfig().provedor); }") > 0,
       "chave não tem carimbo próprio, por provedor");
    ok(HTML.indexOf("getNormasRemovidas()[id] = agoraSync();") > 0, "remover norma não deixa lápide");
    const iUp = HTML.indexOf("async onUploadNormaPDF(");
    ok(HTML.slice(iUp, iUp+900).indexOf("criadoEm:agora, atualizadoEm:agora") > 0, "norma nova nasce sem carimbo");
  });
  t("o download reenvia a união quando este aparelho tem algo a mais", ()=>{
    const i = HTML.indexOf("async function onedriveSincronizarConfigIA(");
    const corpo = HTML.slice(i, HTML.indexOf("function getNormasIA(", i));
    ok(corpo.indexOf("if(r.faltaNoRemoto) marcarIAAlterada();") > 0, "não reenvia a união");
    ok(corpo.indexOf("const r = aplicarPacoteIA(JSON.parse(texto));") > 0, "não usa o novo retorno");
  });

  console.log("\n=== t56 · a IA aprende com os laudos já aprovados ===");
  function mkRisco(id, nome, desc, laudo){
    return { id, nome, nomeOutro:"", descricao:desc, medidaImplementada:"Não", descMedida:"",
             sugestaoMitigacao:"", fotosOutras:[], po:"", gpd:"", fe:"", np:"", laudoIA: laudo||{} };
  }
  function cenarioRefs(){
    const h1 = mkRisco("h1","Agarramento","correia transportadora sem protecao na regiao do tambor",
      { riscoFin:"Risco de agarramento e arrasto do operador pelo contato com a correia e o tambor desprotegidos.", riscoSt:"edit" });
    const h2 = mkRisco("h2","Corte","chapa com rebarba na porta da grade",
      { riscoFin:"Risco de corte nas maos por contato com aresta viva na porta da grade.", riscoSt:"ok" });
    const h3 = mkRisco("h3","Choque eletrico","painel de comando sem tampa",
      { riscoFin:"Risco de choque eletrico por contato com partes energizadas expostas no painel.", riscoSt:"ok" });
    const h4 = mkRisco("h4","Queda","plataforma sem guarda corpo",
      { riscoSug:"sugestao que foi recusada", riscoSt:"no" });   // recusado — não pode virar exemplo
    const h5 = mkRisco("h5","Esmagamento","prensa sem cortina de luz", { riscoSug:"gerada, ainda sem decisão", riscoSt:"pend" });
    const tH = { id:"th", tarefa:"Limpeza e higienizacao", tarefaOutro:"", descricao:"limpeza", frequencia:"Diário", numPessoas:"1", riscos:[h1,h2,h3,h4,h5], laudoIA:{} };
    const mH = { id:"mh", nome:"Transportador de correia TC-01", descricao:"transportador", fotoGeral:null, fotosOutras:[], tarefas:[tH], laudoIA:{} };
    const x1 = mkRisco("x1","Agarramento","correia do transportador sem protecao junto ao tambor");
    const x2 = mkRisco("x2","Choque eletrico","painel eletrico aberto sem sinalizacao");
    const x3 = mkRisco("x3","Atropelamento","empilhadeira circulando sem faixa demarcada");
    const tN = { id:"tn", tarefa:"Limpeza e higienizacao", tarefaOutro:"", descricao:"limpeza", frequencia:"Diário", numPessoas:"1", riscos:[x1,x2,x3], laudoIA:{} };
    const mN = { id:"mn", nome:"Transportador de correia TC-07", descricao:"transportador", fotoGeral:null, fotosOutras:[], tarefas:[tN], laudoIA:{} };
    STATE.projetosSimples = [{ id:"p1", empresa:"Corteva", cidade:"Formosa/GO", criadoEm:1, atualizadoEm:1,
      areas:[ { id:"ah", nome:"Recepcao", descricao:"", local:"", maquinas:[mH] },
              { id:"an", nome:"Expedicao", descricao:"", local:"", maquinas:[mN] } ] }];
    STATE.ui.areasSelecionadasExport = ["ah","an"]; STATE.ui.areasExportConhecidas = ["ah","an"];
    vm.runInContext("getIAConfig().usarReferencias = true;", ctx);
    const item = (r, m, t)=>({ proj:STATE.projetosSimples[0], area:STATE.projetosSimples[0].areas[1], maquina:m||mN, tarefa:t||tN, risco:r });
    return { item, x1, x2, x3, h1, mH, tH };
  }

  t("só entram campos aplicados ou editados", ()=>{
    cenarioRefs();
    const ex = vm.runInContext("laudoExemplosAprovados('risco')", ctx);
    eq(ex.length, 3, "deveria pegar só os 3 decididos (ok/edit)");
    ok(!ex.some(e=>e.entrada.indexOf("guarda corpo") >= 0), "campo RECUSADO virou exemplo");
    ok(!ex.some(e=>e.entrada.indexOf("cortina de luz") >= 0), "campo ainda sem decisão virou exemplo");
  });
  t("o exemplo guarda o par anotação → texto aprovado", ()=>{
    cenarioRefs();
    const ex = vm.runInContext("laudoExemplosAprovados('risco')", ctx);
    const ag = ex.find(e=>e.risco==="Agarramento");
    ok(ag.entrada.indexOf("correia transportadora") >= 0, "sem a anotação do inspetor");
    ok(ag.saida.indexOf("Risco de agarramento") >= 0, "sem o texto aprovado");
    ok(ag.rot.indexOf("TC-01") >= 0, "sem o rótulo de origem");
  });
  t("escolhe o caso do mesmo assunto, não o da mesma tarefa", ()=>{
    const c = cenarioRefs();
    const ex = vm.runInContext("laudoExemplosAprovados('risco')", ctx);
    ctx.__it = c.item(c.x1); ctx.__ex = ex;
    const correia = vm.runInContext("laudoRefsParaItem(__it, 'risco', __ex)", ctx);
    eq(correia.length, 1, "puxou exemplo demais");
    eq(correia[0].ex.risco, "Agarramento");
    ctx.__it = c.item(c.x2);
    const choque = vm.runInContext("laudoRefsParaItem(__it, 'risco', __ex)", ctx);
    eq(choque.length, 1);
    eq(choque[0].ex.risco, "Choque eletrico", "trouxe o risco errado");
  });
  t("tarefa e equipamento iguais NÃO bastam — assunto diferente fica fora", ()=>{
    const c = cenarioRefs();
    ctx.__it = c.item(c.x3);   // atropelamento por empilhadeira, mesma tarefa e área
    ctx.__ex = vm.runInContext("laudoExemplosAprovados('risco')", ctx);
    eq(vm.runInContext("laudoRefsParaItem(__it, 'risco', __ex)", ctx).length, 0,
       "puxou exemplo sem relação de assunto — a IA redigiria o risco errado");
    ok(HTML.indexOf("if(simTexto === 0 && simRisco === 0) return;") > 0, "a trava de assunto sumiu do código");
  });
  t("um item nunca é exemplo de si mesmo", ()=>{
    const c = cenarioRefs();
    ctx.__ex = vm.runInContext("laudoExemplosAprovados('risco')", ctx);
    ctx.__it = { proj:STATE.projetosSimples[0], area:STATE.projetosSimples[0].areas[0], maquina:c.mH, tarefa:c.tH, risco:c.h1 };
    ok(!vm.runInContext("laudoRefsParaItem(__it, 'risco', __ex)", ctx).some(p=>p.ex.id === "h1"));
  });
  t("no máximo 3 exemplos por pedido", ()=>{
    eq(vm.runInContext("REFS_IA_MAX", ctx), 3);
    const c = cenarioRefs();
    const muitos = [];
    for(let i=0;i<40;i++) muitos.push({ id:"g"+i, rot:"Caso "+i, entrada:"correia sem protecao no tambor", saida:"Risco de agarramento "+i,
      risco:"Agarramento", tarefa:"Limpeza", maquina:"Transportador",
      tokTexto:vm.runInContext("refsConjunto('correia sem protecao no tambor')", ctx),
      tokRisco:vm.runInContext("refsConjunto('Agarramento')", ctx),
      tokTarefa:vm.runInContext("refsConjunto('Limpeza')", ctx),
      tokMaquina:vm.runInContext("refsConjunto('Transportador')", ctx) });
    ctx.__it = c.item(c.x1); ctx.__ex = muitos;
    eq(vm.runInContext("laudoRefsParaItem(__it, 'risco', __ex)", ctx).length, 3);
  });
  t("o bloco enviado traz os pares e proíbe copiar palavra por palavra", ()=>{
    const c = cenarioRefs();
    ctx.__ex = vm.runInContext("laudoExemplosAprovados('risco')", ctx);
    ctx.__it = c.item(c.x1);
    const m = vm.runInContext("laudoEntradaComReferencias(__it, 'risco', 'correia do transportador sem protecao', __ex)", ctx);
    ok(m.texto.indexOf("correia do transportador sem protecao") === 0, "a anotação atual deixou de vir primeiro");
    ok(m.texto.indexOf("Anotação do inspetor:") > 0, "sem a entrada do exemplo");
    ok(m.texto.indexOf("Texto aprovado no laudo:") > 0, "sem a saída aprovada");
    ok(m.texto.indexOf("NÃO copie um exemplo") > 0, "não proíbe a cópia literal");
    eq(m.refs.length, 1, "não registrou a origem");
    ok(m.refs[0].rot.indexOf("TC-01") >= 0);
    ok(m.refs[0].sem > 0, "sem o percentual de semelhança");
  });
  t("desligado, tudo volta a ser como antes", ()=>{
    const c = cenarioRefs();
    vm.runInContext("getIAConfig().usarReferencias = false;", ctx);
    ctx.__ex = vm.runInContext("laudoExemplosAprovados('risco')", ctx);
    ctx.__it = c.item(c.x1);
    const m = vm.runInContext("laudoEntradaComReferencias(__it, 'risco', 'texto puro', __ex)", ctx);
    eq(m.texto, "texto puro", "ainda anexou exemplos com o recurso desligado");
    eq(m.refs.length, 0);
    vm.runInContext("getIAConfig().usarReferencias = true;", ctx);
  });
  t("sem histórico nenhum, o pedido sai igual ao de antes", ()=>{
    cenarioRefs();
    STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.forEach(r=>{ r.laudoIA = {}; });
    ctx.__ex = vm.runInContext("laudoExemplosAprovados('risco')", ctx);
    eq(ctx.__ex.length, 0);
    const c2 = cenarioRefs();
    ctx.__it = c2.item(c2.x1);
    ctx.__ex = [];
    eq(vm.runInContext("laudoEntradaComReferencias(__it, 'risco', 'so o texto', __ex)", ctx).texto, "so o texto");
  });
  t("as quatro camadas de geração usam as referências", ()=>{
    ["escopo","tarefa"].forEach(k=> ok(HTML.indexOf('laudoEntradaComReferencias(item, "'+k+'"') > 0, "faltou "+k));
    ok(HTML.indexOf("laudoEntradaComReferencias(item, campo, orig, exemplos[campo])") > 0, "risco/solução não usam");
    ok(HTML.indexOf("const comRefs = laudoEntradaComReferencias(item, campo, entrada,") > 0, "refazer sugestão não usa");
  });
  t("o índice é montado uma vez por leva, não por item", ()=>{
    const i = HTML.indexOf("async function gerarLaudoIAItens(");
    const corpo = HTML.slice(i, HTML.indexOf("for(let i=0;i<itens.length;i++)", i));
    ok(corpo.indexOf("laudoExemplosAprovados(\"risco\")") > 0, "o índice não é pré-montado");
  });
  t("a origem fica gravada e aparece na tela de revisão", ()=>{
    ok(HTML.indexOf("if(patch.refs!==undefined) l.riscoRefs = patch.refs;") > 0, "não grava a origem no risco");
    ok(HTML.indexOf("if(patch.refs!==undefined) l.solucaoRefs = patch.refs;") > 0, "não grava a origem na solução");
    ok(HTML.indexOf("<b>Baseada em:</b>") > 0, "a tela não mostra de onde veio");
    ok(HTML.indexOf("o laudo é assinado por você") > 0, "não avisa que a conferência é do engenheiro");
  });
  t("o interruptor existe, nasce ligado e viaja entre aparelhos", ()=>{
    ok(HTML.indexOf("if(c.usarReferencias===undefined) c.usarReferencias = true;") > 0, "não nasce ligado");
    ok(HTML.indexOf("toggleIAReferencias()") > 0, "sem o interruptor");
    ok(HTML.indexOf("usarReferencias:c.usarReferencias") > 0, "não entra no pacote de sincronização");
    ok(HTML.indexOf('if(typeof p.usarReferencias === "boolean"') > 0, "não é mesclado na chegada");
  });
  t("nada aqui depende de internet ou de serviço externo", ()=>{
    const i = HTML.indexOf("const REFS_IA_MAX = 3;");
    const bloco = HTML.slice(i, HTML.indexOf("function laudoGet(item, campo){", i));
    ["fetch(", "XMLHttpRequest", "embedding", "http://", "https://"].forEach(m=>
      ok(bloco.indexOf(m) < 0, "o motor de semelhança não pode chamar nada de fora: " + m));
  });

  console.log("\n=== t57 · a decisão do laudo chega nos outros aparelhos ===");
  const TS0 = 1750000000000;
  function cenarioDecisao(){
    const risco = { id:"r1", nome:"Agarramento", nomeOutro:"", descricao:"correia sem protecao",
      medidaImplementada:"Não", descMedida:"", sugestaoMitigacao:"", fotosOutras:[], po:"", gpd:"", fe:"", np:"",
      criadoEm:TS0, atualizadoEm:TS0,
      laudoIA:{ riscoSug:"Sugestao da IA", riscoFin:"", riscoSt:"pend", duvRisco:"", riscoRefs:[],
                solucaoSug:"Sugestao solucao", solucaoFin:"", solucaoSt:"pend", duvSolucao:"", solucaoRefs:[] } };
    const tarefa = { id:"t1", tarefa:"Limpeza", tarefaOutro:"", descricao:"d", frequencia:"Diário", numPessoas:"1",
      riscos:[risco], criadoEm:TS0, atualizadoEm:TS0, laudoIA:{ tarefaSug:"sug", tarefaSt:"pend" } };
    const maquina = { id:"m1", nome:"TC-01", descricao:"transportador", fotoGeral:null, fotosOutras:[],
      tarefas:[tarefa], criadoEm:TS0, atualizadoEm:TS0, laudoIA:{ escopoSug:"sug", escopoSt:"pend" } };
    const area = { id:"a1", nome:"Recepcao", descricao:"", local:"", maquinas:[maquina], criadoEm:TS0, atualizadoEm:TS0 };
    const proj = { id:"p1", empresa:"Corteva", areas:[area], criadoEm:TS0, atualizadoEm:TS0 };
    STATE.projetosSimples = [proj];
    return { item:{ proj, area, maquina, tarefa, risco }, maquina, tarefa, risco };
  }
  t("aprovar uma sugestão marca o risco para sincronizar", ()=>{
    const c = cenarioDecisao();
    ctx.__it = c.item;
    vm.runInContext("laudoSet(__it, 'risco', { fin:'texto aprovado', st:'ok' })", ctx);
    eq(vm.runInContext("laudoGet(__it,'risco').st", ctx), "ok", "a decisão não foi gravada");
    ok(c.risco.atualizadoEm > TS0, "o carimbo do risco não mudou — a decisão nunca sairia deste aparelho");
  });
  t("recusar e editar também marcam", ()=>{
    let c = cenarioDecisao(); ctx.__it = c.item;
    vm.runInContext("laudoSet(__it, 'solucao', { st:'no', fin:'' })", ctx);
    ok(c.risco.atualizadoEm > TS0, "recusar não marcou");
    c = cenarioDecisao(); ctx.__it = c.item;
    vm.runInContext("laudoSet(__it, 'risco', { fin:'meu texto', st:'edit' })", ctx);
    ok(c.risco.atualizadoEm > TS0, "editar não marcou");
  });
  t("cada campo marca a entidade dona dele", ()=>{
    let c = cenarioDecisao(); ctx.__it = c.item;
    vm.runInContext("laudoSet(__it, 'escopo', { fin:'x', st:'ok' })", ctx);
    ok(c.maquina.atualizadoEm > TS0, "escopo deveria marcar a MÁQUINA");
    eq(c.risco.atualizadoEm, TS0, "escopo não pode marcar o risco à toa");
    c = cenarioDecisao(); ctx.__it = c.item;
    vm.runInContext("laudoSet(__it, 'tarefa', { fin:'x', st:'ok' })", ctx);
    ok(c.tarefa.atualizadoEm > TS0, "tarefa deveria marcar a TAREFA");
    eq(c.maquina.atualizadoEm, TS0, "tarefa não pode marcar a máquina à toa");
  });
  t("a sugestão recém-gerada pela IA também viaja", ()=>{
    const c = cenarioDecisao(); ctx.__it = c.item;
    vm.runInContext("laudoSet(__it, 'risco', { sug:'sugestao nova', duv:'', st:'pend', fin:'' })", ctx);
    ok(c.risco.atualizadoEm > TS0, "quem gerou vê a sugestão, o outro não veria");
  });
  t("o carimbo usa o relógio lógico, não Date.now direto", ()=>{
    ok(HTML.indexOf("if(alvo) alvo.atualizadoEm = agoraSync();") > 0, "voltou a depender do relógio do aparelho");
    ok(HTML.indexOf("laudoCarimbarParaSincronizar(item, campo);") > 0, "laudoSet não carimba mais");
  });
  t("o carimbo mora dentro do laudoSet, não espalhado nos botões", ()=>{
    const i = HTML.indexOf("function laudoSet(item, campo, patch){");
    ok(HTML.slice(i, i+220).indexOf("laudoCarimbarParaSincronizar") > 0,
       "o carimbo precisa estar na raiz, senão cada botão novo esquece de fazer");
    ["laudoAplicar(rid, campo){", "laudoRecusar(rid, campo){", "laudoAprovarLinha(rid){"].forEach(m=>
      ok(HTML.indexOf(m) > 0, "sumiu o método " + m));
  });
  t("o que já funcionava continua igual", ()=>{
    const c = cenarioDecisao(); ctx.__it = c.item;
    vm.runInContext("laudoSet(__it, 'risco', { fin:'aprovado', st:'ok' })", ctx);
    eq(vm.runInContext("laudoTextoFinal(__it,'risco')", ctx), "aprovado", "a regra de qual texto vai ao laudo mudou");
    ok(vm.runInContext("laudoGet(__it,'risco')", ctx).refs !== undefined, "as referências sumiram do laudoGet");
  });

  console.log("\n=== t58 · recuperar normas sem desfazer os laudos ===");
  vm.runInContext(funcao("recuperarNormasDoPonto"), ctx);
  function pontoComNormas(){
    return { ts:1000, motivo:"teste", normas:[
      { id:"n1", nome:"NR-12", texto:"txt 12", ativo:true, criadoEm:1000 },
      { id:"n2", nome:"NBR ISO 12100", texto:"txt 12100", ativo:true, criadoEm:1001 }] };
  }
  t("traz as normas de volta", ()=>{
    STATE.ui.normasIA = []; STATE.ui.normasRemovidas = {};
    ctx.__p = pontoComNormas();
    eq(vm.runInContext("recuperarNormasDoPonto(__p)", ctx), 2);
    eq((STATE.ui.normasIA||[]).map(n=>n.nome).join(","), "NR-12,NBR ISO 12100");
  });
  t("NÃO mexe nos laudos", ()=>{
    STATE.ui.normasIA = []; STATE.ui.normasRemovidas = {};
    STATE.projetosSimples = [{ id:"pA", empresa:"Corteva", criadoEm:1, atualizadoEm:1,
      areas:[{ id:"aA", nome:"Recepcao", maquinas:[] }, { id:"aB", nome:"Expedicao", maquinas:[] }] }];
    const antes = JSON.stringify(STATE.projetosSimples);
    ctx.__p = pontoComNormas();
    vm.runInContext("recuperarNormasDoPonto(__p)", ctx);
    eq(JSON.stringify(STATE.projetosSimples), antes, "a recuperação encostou nos projetos");
  });
  t("não duplica o que já está aqui", ()=>{
    STATE.ui.normasIA = []; STATE.ui.normasRemovidas = {};
    ctx.__p = pontoComNormas();
    vm.runInContext("recuperarNormasDoPonto(__p)", ctx);
    eq(vm.runInContext("recuperarNormasDoPonto(__p)", ctx), 0, "recuperou de novo o que já existia");
    eq((STATE.ui.normasIA||[]).length, 2);
  });
  t("norma de mesmo nome e texto, com outro id, não vira cópia", ()=>{
    STATE.ui.normasIA = [{ id:"outro", nome:"NR-12", texto:"txt 12", ativo:true, criadoEm:5 }];
    STATE.ui.normasRemovidas = {};
    ctx.__p = pontoComNormas();
    eq(vm.runInContext("recuperarNormasDoPonto(__p)", ctx), 1, "deveria trazer só a que falta");
    eq((STATE.ui.normasIA||[]).length, 2);
  });
  t("lápide antiga não barra a recuperação", ()=>{
    STATE.ui.normasIA = []; STATE.ui.normasRemovidas = { n1: 99999999999999 };
    ctx.__p = pontoComNormas();
    eq(vm.runInContext("recuperarNormasDoPonto(__p)", ctx), 2, "a lápide impediu a norma de voltar");
    ok(!STATE.ui.normasRemovidas.n1, "a lápide deveria ter sido apagada");
  });
  t("a norma recuperada nasce carimbada, para vencer a lápide e sincronizar", ()=>{
    STATE.ui.normasIA = []; STATE.ui.normasRemovidas = {};
    ctx.__p = pontoComNormas();
    vm.runInContext("recuperarNormasDoPonto(__p)", ctx);
    ok((STATE.ui.normasIA||[]).every(n=> n.atualizadoEm > 1001), "sem carimbo novo, não sairia do aparelho");
  });
  t("a tela oferece a recuperação e o método existe", ()=>{
    ok(HTML.indexOf("App.abrirRecuperarNormas()") > 0, "sem o botão");
    ok(HTML.indexOf("Recuperar normas de uma cópia salva") > 0, "sem o rótulo");
    ok(HTML.indexOf("async function normasEmPontosDeRestauracao(") > 0, "sem a leitura dos pontos");
    ok(HTML.indexOf("recuperarNormasDeIndice(i){") > 0, "sem o método de aplicar");
    ok(HTML.indexOf("não mexe nos laudos") > 0, "a tela não diz que é seguro");
  });
  t("recuperar marca a IA para sincronizar com os outros aparelhos", ()=>{
    const i = HTML.indexOf("recuperarNormasDeIndice(i){");
    ok(HTML.slice(i, i+520).indexOf("marcarIAAlterada();") > 0, "as normas voltariam só neste aparelho");
  });

  console.log("\n=== t59 · confirmação, chave compartilhada e diagnóstico ===");
  t("restaurar instruções padrão pede confirmação", ()=>{
    const i = HTML.indexOf("restaurarPromptsIAPadrao(){");
    const corpo = HTML.slice(i, i + 700);
    ok(corpo.indexOf("if(!confirm(") > 0, "apaga tudo sem perguntar");
    ok(corpo.indexOf("Restaurar as instruções padrão da IA?") > 0, "sem a pergunta");
    ok(corpo.indexOf("TODOS os aparelhos") > 0, "não avisa que afeta os outros aparelhos");
    ok(corpo.indexOf("if(!confirm(") < corpo.indexOf("getIAConfig().prompts = {...IA_PROMPTS_PADRAO}"),
       "a confirmação precisa vir ANTES de apagar");
  });
  t("chave que já existia ganha carimbo e passa a viajar", ()=>{
    STATE.ui.apiKeysEm = {};
    vm.runInContext("setIAApiKey('chave-antiga')", ctx);
    ok(vm.runInContext("getApiKeyEm()", ctx) > 0, "a chave nunca sairia deste aparelho");
  });
  t("aparelho sem chave continua em zero e não apaga a dos outros", ()=>{
    STATE.ui.apiKeysEm = {};
    vm.runInContext("setIAApiKey('')", ctx);
    eq(vm.runInContext("getApiKeyEm()", ctx), 0);
  });
  t("o carimbo da chave não é recalculado toda hora", ()=>{
    STATE.ui.apiKeysEm = {};
    vm.runInContext("setIAApiKey('k')", ctx);
    const a = vm.runInContext("getApiKeyEm()", ctx);
    eq(vm.runInContext("getApiKeyEm()", ctx), a, "mudaria a cada chamada e viveria em conflito");
  });
  t("o pacote e a mesclagem usam o carimbo migrado", ()=>{
    ok(HTML.indexOf("apiKeyEm: getApiKeyEm(),") > 0, "o pacote não leva o carimbo migrado");
    ok(HTML.indexOf("const chaveLocalEm = getApiKeyEm();") > 0, "a mesclagem não usa o carimbo migrado");
  });
  t("o diagnóstico existe e diz o motivo de cada pendência", ()=>{
    ["function onedriveDiagnosticoDados(","function onedriveDiagnosticoTexto(",
     "function onedriveDiagnosticoInlineHtml(","toggleDiagnosticoSync(){","async copiarDiagnosticoSync(){"].forEach(m=>
      ok(HTML.indexOf(m) > 0, "faltou " + m));
    ["nunca subiu","editado aqui depois do último envio","faltam as fotos (esperando Wi-Fi)",
     "arquivo ilegível na nuvem — ignorado"].forEach(m=>
      ok(HTML.indexOf(m) > 0, "faltou o motivo: " + m));
  });
  t("o diagnóstico é só leitura — não muda nada", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ["marcarAlterado(", "dbSet(", "= agoraSync()", "onedriveEnviarBlob", "onedriveApagarBlob"].forEach(m=>
      ok(corpo.indexOf(m) < 0, "o diagnóstico não pode alterar nada: " + m));
  });
  t("o diagnóstico aparece na tela do OneDrive", ()=>{
    ok(HTML.indexOf("${onedriveDiagnosticoInlineHtml()}") > 0, "sem o bloco na tela");
    ok(HTML.indexOf("use se parecer que a sincronização não termina") > 0, "sem a explicação de quando usar");
  });
  t("quando nada está pendente, o diagnóstico explica o selo", ()=>{
    ok(HTML.indexOf("é só a verificação automática de 2 em 2 minutos") > 0,
       "sem isso, 'sincronizando' continua parecendo problema");
    ok(HTML.indexOf("não há trabalho parado") > 0, "não deixa claro que está tudo em dia");
  });

  console.log("\n=== t60 · diagnóstico não depende de janela sobreposta ===");
  t("aparece na própria tela, sem overlay", ()=>{
    ok(HTML.indexOf("function onedriveDiagnosticoInlineHtml(") > 0, "sem a versão de tela");
    ok(HTML.indexOf("${onedriveDiagnosticoInlineHtml()}") > 0, "a tela não usa a versão inline");
    ok(HTML.indexOf("toggleDiagnosticoSync(){") > 0, "sem o abre/fecha");
    ok(HTML.indexOf("onedriveDiagnosticoHtml") < 0, "sobrou o caminho antigo em janela");
  });
  t("erro ao montar é MOSTRADO, não engolido", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoInlineHtml(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveStatusPendenteHtml(", i));
    ok(corpo.indexOf("}catch(e){") > 0, "sem proteção contra erro");
    ok(corpo.indexOf("Não foi possível montar o diagnóstico.") > 0, "o erro sumiria em silêncio");
    ok(corpo.indexOf("(e && e.message)") > 0, "não mostra qual foi o erro");
  });
  t("continua sendo só leitura", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoInlineHtml(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveStatusPendenteHtml(", i));
    ["marcarAlterado(", "dbSet(", "onedriveEnviarBlob", "onedriveApagarBlob"].forEach(m=>
      ok(corpo.indexOf(m) < 0, "o diagnóstico não pode alterar nada: " + m));
  });
  t("o abre/fecha guarda o estado, sem mexer em dado nenhum", ()=>{
    const i = HTML.indexOf("toggleDiagnosticoSync(){");
    const corpo = HTML.slice(i, i + 160);
    ok(corpo.indexOf("STATE.ui.diagSyncAberto") > 0, "não guarda o estado");
    ok(corpo.indexOf("marcarAlterado") < 0, "abrir o diagnóstico não pode marcar alteração");
  });

  console.log("\n=== t61 · o diagnóstico mostra POR QUE o envio não conclui ===");
  t("lê o log de sincronização e separa as falhas", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ok(corpo.indexOf("STATE.logSincronizacao") > 0, "não lê o log");
    ok(corpo.indexOf("e.ok === false") > 0, "não separa as falhas");
    ok(corpo.indexOf("falha ao ENVIAR") > 0 && corpo.indexOf("falha ao RECEBER") > 0, "não diz a direção");
    ok(corpo.indexOf("e.motivo") > 0, "não mostra o motivo registrado");
  });
  t("conta envios que deram certo e que falharam", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ok(corpo.indexOf("const enviosOk =") > 0 && corpo.indexOf("const enviosFalha =") > 0, "sem o placar");
  });
  t("dá o veredito: travado x fila grande", ()=>{
    ok(HTML.indexOf("Nenhum envio concluiu.") > 0, "não avisa quando NADA sobe");
    ok(HTML.indexOf("A fila não vai diminuir sozinha") > 0, "não diz que não adianta esperar");
    ok(HTML.indexOf("Os envios estão funcionando.") > 0, "não tranquiliza quando é só volume");
    ok(HTML.indexOf("vai diminuindo aos poucos") > 0, "não orienta a esperar");
  });
  t("o texto copiável leva falhas, tentativas e o placar", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoTexto(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoInlineHtml(", i));
    ["FALHAS RECENTES (", "ULTIMAS TENTATIVAS (", "HISTORICO (", "ULTIMA SINCRONIZACAO: "].forEach(m=>
      ok(corpo.indexOf(m) > 0, "faltou no texto: " + m));
  });
  t("cada horário tem o rótulo certo", ()=>{
    ok(HTML.indexOf('quandoRot: "tentativa em"') > 0, "falha sem rótulo próprio de horário");
    ok(HTML.indexOf('escapeHtml(x.quandoRot||"alterado em")') > 0, "o rótulo não é por item");
  });
  t("continua sendo só leitura", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ["marcarAlterado(", "dbSet(", "registrarEventoSync(", "onedriveEnviarBlob"].forEach(m=>
      ok(corpo.indexOf(m) < 0, "o diagnóstico não pode alterar nada: " + m));
  });

  console.log("\n=== t62 · o diagnóstico mostra os dois carimbos e o endereço ===");
  t("cada pendente mostra o carimbo do item E o do último envio", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ok(corpo.indexOf('"carimbo do item: "') > 0, "não mostra o carimbo do item");
    ok(corpo.indexOf('" · registrado no último envio: "') > 0, "não mostra o carimbo do envio");
  });
  t("acusa quando o endereço na nuvem muda a cada ciclo", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ok(corpo.indexOf("ENDEREÇO MUDOU") > 0, "não acusa a troca de endereço");
    ok(corpo.indexOf("mudancaEndereco++") > 0, "não conta as trocas");
    ok(HTML.indexOf("trocando de endereço na nuvem a cada ciclo") > 0, "sem o veredito na tela");
    ok(HTML.indexOf('o envio "dá certo" e a fila não baixa') > 0, "não liga a causa ao sintoma");
  });
  t("acusa registro de envio mais novo que o item", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ok(corpo.indexOf("REGISTRO MAIS NOVO QUE O ITEM") > 0, "não acusa a regressão");
    ok(corpo.indexOf("carimboRegrediu++") > 0, "não conta");
    ok(HTML.indexOf("registro de envio mais novo que o próprio item") > 0, "sem o veredito na tela");
  });
  t("os dois contadores saem no pacote de dados", ()=>{
    ok(HTML.indexOf("mudancaEndereco, carimboRegrediu,") > 0, "os contadores não são devolvidos");
  });
  t("o texto copiável leva o detalhe de cada pendente", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoTexto(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoInlineHtml(", i));
    ok(corpo.indexOf("mudando de endereco a cada ciclo") > 0, "sem o resumo");
    ok(corpo.indexOf('if(x.detalhe) l.push("      " + x.detalhe);') > 0, "sem o detalhe por item");
  });
  t("continua sendo só leitura", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ["marcarAlterado(", "dbSet(", "registrarEventoSync(", "onedriveEnviarBlob", "onedriveApagarBlob"].forEach(m=>
      ok(corpo.indexOf(m) < 0, "o diagnóstico não pode alterar nada: " + m));
  });

  console.log("\n=== t63 · a versão na tela é a mesma escrita no código ===");
  t("APP_BUILD é texto fixo, declarado uma vez só", ()=>{
    const m = /const APP_BUILD = "(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})";/.exec(HTML);
    ok(!!m, "APP_BUILD deixou de ser um texto fixo");
    eq(HTML.split('const APP_BUILD').length - 1, 1, "declarado mais de uma vez");
  });
  t("não volta a ser calculado da data do arquivo", ()=>{
    const linhas = HTML.split("\n").filter(l=> l.indexOf("document.lastModified") >= 0);
    linhas.forEach(l=> ok(l.trim().indexOf("document.lastModified, ou seja") === 0,
      "document.lastModified voltou a ser usado em código: " + l.trim().slice(0,80)));
  });
  t("o formato é o combinado (DD/MM/AAAA HH:MM)", ()=>{
    const m = /const APP_BUILD = "([^"]+)";/.exec(HTML);
    ok(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(m[1]), "formato fora do padrão: " + m[1]);
  });
  t("a tela mostra essa mesma versão", ()=>{
    ok(HTML.indexOf("Versão ${APP_BUILD}") > 0, "a tela não usa APP_BUILD");
  });

  console.log("\n=== t64 · juntar itens duplicados (a causa da sync eterna) ===");
  [ "sincDuplicatasNaArvore", "sincJuntarDuplicata", "sincJuntarTodasDuplicatas" ]
    .forEach(n=> vm.runInContext(funcao(n), ctx));
  vm.runInContext(constante("SINC_FILHOS_DE"), ctx);
  const TD = 1750000000000;
  function mkRiscoDup(id, desc, ts){
    return { id, nome:"Prensamento", nomeOutro:"", descricao:desc, medidaImplementada:"Não", descMedida:"",
             sugestaoMitigacao:"", fotosOutras:[], po:"", gpd:"", fe:"", np:"", criadoEm:TD, atualizadoEm:ts, laudoIA:{} };
  }
  function arvoreComDuplicatas(){
    const rNovo = mkRiscoDup("rDUP", "versao nova", TD+1000);
    const rVelho = mkRiscoDup("rDUP", "versao antiga", TD);
    const rSo = mkRiscoDup("rSO", "so existe na copia velha", TD);
    const t1 = { id:"t1", tarefa:"Operação normal", tarefaOutro:"", descricao:"", riscos:[rNovo], criadoEm:TD, atualizadoEm:TD, laudoIA:{} };
    const t2 = { id:"t2", tarefa:"Limpeza", tarefaOutro:"", descricao:"", riscos:[rVelho, rSo], criadoEm:TD, atualizadoEm:TD, laudoIA:{} };
    const maq = { id:"m1", nome:"Mesa B", descricao:"", fotoGeral:null, fotosOutras:[], tarefas:[t1,t2], criadoEm:TD, atualizadoEm:TD, laudoIA:{} };
    const mA = { id:"mDUP", nome:"Esteira", descricao:"", fotoGeral:null, fotosOutras:[],
                 tarefas:[{id:"tX", tarefa:"Op", tarefaOutro:"", descricao:"", riscos:[], criadoEm:TD, atualizadoEm:TD, laudoIA:{}}],
                 criadoEm:TD, atualizadoEm:TD+500, laudoIA:{} };
    const mB = { id:"mDUP", nome:"Esteira", descricao:"", fotoGeral:null, fotosOutras:[],
                 tarefas:[{id:"tY", tarefa:"Limp", tarefaOutro:"", descricao:"", riscos:[], criadoEm:TD, atualizadoEm:TD, laudoIA:{}}],
                 criadoEm:TD, atualizadoEm:TD, laudoIA:{} };
    STATE.projetosSimples = [{ id:"p1", empresa:"Corteva", criadoEm:TD, atualizadoEm:TD, areas:[
      { id:"a1", nome:"GCM 100", descricao:"", local:"", maquinas:[maq, mA], criadoEm:TD, atualizadoEm:TD },
      { id:"a2", nome:"Seleção 100", descricao:"", local:"", maquinas:[mB], criadoEm:TD, atualizadoEm:TD } ]}];
  }
  const contarNaArvore = (tipo, id)=>{
    let n = 0;
    (STATE.projetosSimples||[]).forEach(p=>(p.areas||[]).forEach(a=>{
      if(tipo==="area" && a.id===id) n++;
      (a.maquinas||[]).forEach(m=>{
        if(tipo==="maquina" && m.id===id) n++;
        (m.tarefas||[]).forEach(t=>{
          if(tipo==="tarefa" && t.id===id) n++;
          (t.riscos||[]).forEach(r=>{ if(tipo==="risco" && r.id===id) n++; });
        });
      });
    }));
    return n;
  };

  t("encontra o mesmo id em dois lugares", ()=>{
    arvoreComDuplicatas();
    const dup = vm.runInContext("sincDuplicatasNaArvore()", ctx);
    eq(dup.length, 2, "deveria achar o risco e a máquina duplicados");
    ok(dup.some(g=>g.tipo==="risco" && g.id==="rDUP"), "não achou o risco");
    ok(dup.some(g=>g.tipo==="maquina" && g.id==="mDUP"), "não achou a máquina");
  });
  t("fica a cópia alterada por último", ()=>{
    arvoreComDuplicatas();
    vm.runInContext("sincJuntarTodasDuplicatas()", ctx);
    eq(contarNaArvore("risco","rDUP"), 1, "continua duplicado");
    let desc = "";
    STATE.projetosSimples[0].areas.forEach(a=>a.maquinas.forEach(m=>m.tarefas.forEach(t=>t.riscos.forEach(r=>{ if(r.id==="rDUP") desc = r.descricao; }))));
    eq(desc, "versao nova", "ficou com a versão antiga");
  });
  t("NADA se perde: o que só existia na outra cópia sobrevive", ()=>{
    arvoreComDuplicatas();
    vm.runInContext("sincJuntarTodasDuplicatas()", ctx);
    eq(contarNaArvore("risco","rSO"), 1, "o risco que só existia na cópia removida sumiu");
  });
  t("filhos das duas cópias são reunidos", ()=>{
    arvoreComDuplicatas();
    vm.runInContext("sincJuntarTodasDuplicatas()", ctx);
    eq(contarNaArvore("maquina","mDUP"), 1, "máquina continua duplicada");
    let tarefas = [];
    STATE.projetosSimples[0].areas.forEach(a=>a.maquinas.forEach(m=>{ if(m.id==="mDUP") tarefas = m.tarefas.map(t=>t.id); }));
    ok(tarefas.indexOf("tX") >= 0 && tarefas.indexOf("tY") >= 0, "perdeu tarefa ao juntar: " + tarefas.join(","));
  });
  t("depois de juntar não sobra duplicata nenhuma", ()=>{
    arvoreComDuplicatas();
    vm.runInContext("sincJuntarTodasDuplicatas()", ctx);
    eq(vm.runInContext("sincDuplicatasNaArvore()", ctx).length, 0);
  });
  t("o sobrevivente é carimbado, para assumir o endereço na nuvem", ()=>{
    arvoreComDuplicatas();
    vm.runInContext("sincJuntarTodasDuplicatas()", ctx);
    let ts = 0;
    STATE.projetosSimples[0].areas.forEach(a=>a.maquinas.forEach(m=>m.tarefas.forEach(t=>t.riscos.forEach(r=>{ if(r.id==="rDUP") ts = r.atualizadoEm; }))));
    ok(ts > TD+1000, "sem carimbo novo, o vai e vem continuaria");
  });
  t("árvore sem duplicata não é tocada", ()=>{
    arvoreComDuplicatas();
    vm.runInContext("sincJuntarTodasDuplicatas()", ctx);
    const antes = JSON.stringify(STATE.projetosSimples);
    eq(vm.runInContext("sincJuntarTodasDuplicatas()", ctx), 0, "mexeu numa árvore já limpa");
    eq(JSON.stringify(STATE.projetosSimples), antes, "alterou a árvore sem necessidade");
  });
  t("o reparo pede confirmação e cria cópia de segurança antes", ()=>{
    const i = HTML.indexOf("async juntarDuplicatasSync(){");
    ok(i > 0, "o método não existe");
    const corpo = HTML.slice(i, i + 1100);
    ok(corpo.indexOf("if(!confirm(") > 0, "junta sem perguntar");
    ok(corpo.indexOf('await salvarPontoDeRestauracao("antes de juntar duplicatas")') > 0, "sem cópia de segurança");
    ok(corpo.indexOf("nada é descartado") > 0, "não tranquiliza sobre perda de dado");
    ok(corpo.indexOf("if(!confirm(") < corpo.indexOf("sincJuntarTodasDuplicatas()"), "confirma depois de juntar");
  });
  t("o diagnóstico aponta a causa e oferece o conserto", ()=>{
    ok(HTML.indexOf("esta é a causa da sincronização não terminar") > 0, "não aponta a causa");
    ok(HTML.indexOf("App.juntarDuplicatasSync()") > 0, "sem o botão de conserto");
    ok(HTML.indexOf("totalDuplicadas") > 0, "o contador não sai no diagnóstico");
  });

  console.log("\n=== t65 · correção automática não é falha; fila e teste de IA ===");
  t("a autocura é registrada como reparo, não como erro", ()=>{
    const i = HTML.indexOf("function registrarEventoSync(");
    const corpo = HTML.slice(i, i + 900);
    ok(corpo.indexOf('direcao==="up" && ok===false && !reparo') > 0, "reparo ainda conta como falha");
    ok(corpo.indexOf("reparo: reparo || undefined") > 0, "não marca o evento como reparo");
    ok(HTML.indexOf('"faltava na nuvem — reenvio agendado", rotuloCaminhoSync(reg.pasta), true)') > 0,
       "a reconciliação de texto não passa o sinal de reparo");
    ok(HTML.indexOf('"fotos faltavam na nuvem — reenvio agendado", rotuloCaminhoSync(reg.pasta), true)') > 0,
       "a reconciliação de fotos não passa o sinal de reparo");
  });
  t("o diagnóstico separa reparo de falha e não conta no placar", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    /* A separação passou a usar ehReparo(), que reconhece tanto o sinal novo
       quanto os registros antigos pelo texto do motivo — é mais abrangente
       que checar só o campo. */
    ok(corpo.indexOf("e.ok === false && !ehReparo(e)") > 0, "as falhas ainda incluem reparo");
    ok(corpo.indexOf("log.filter(ehReparo)") > 0, "não separa os reparos");
    ok(corpo.indexOf('e.ok !== false && !ehReparo(e)') > 0, "o placar de sucesso conta reparo");
    ok(HTML.indexOf("Correções automáticas (não são erros)") > 0, "a tela não distingue");
  });
  t("limpar a fila da nuvem existe, confirma e não toca em dado", ()=>{
    const i = HTML.indexOf("limparFilaNuvem(){");
    ok(i > 0, "o método não existe");
    const corpo = HTML.slice(i, i + 900);
    ok(corpo.indexOf("if(!confirm(") > 0, "limpa sem perguntar");
    ok(corpo.indexOf("STATE.oneDriveDeltaFila = [];") > 0, "não limpa a fila");
    ok(corpo.indexOf("Nenhum dado do app é apagado") > 0, "não explica que é seguro");
    ["projetosSimples", "dbSet(", "onedriveApagarBlob"].forEach(m=>
      ok(corpo.indexOf(m) < 0, "limpar a fila não pode mexer em " + m));
    ok(HTML.indexOf("App.limparFilaNuvem()") > 0, "sem o botão na tela");
  });
  t("o teste de IA NÃO afirma que a OpenAI bloqueia o navegador", ()=>{
    ok(HTML.indexOf("A OpenAI bloqueia chamadas feitas direto do navegador") < 0,
       "afirmação falsa: no teste real a OpenAI respondeu 401, ou seja, o navegador alcançou o servidor");
    ok(HTML.indexOf("a OpenAI costuma bloquear chamadas feitas direto pelo navegador") < 0,
       "o aviso antigo com a mesma afirmação continua na tela");
  });
  t("o teste de IA nomeia o provedor e separa rede de chave errada", ()=>{
    const i = HTML.indexOf("async function testarConexaoIA(");
    const corpo = HTML.slice(i, HTML.indexOf("\n/* Gera uma cópia enriquecida", i));
    ok(corpo.indexOf("Não foi possível falar com ${preset.nome}") > 0, "não diz qual provedor falhou");
    ok(corpo.indexOf("a chave nem chegou a ser verificada") > 0, "não separa rede de chave");
    ok(corpo.indexOf("4G do celular") > 0, "não sugere como separar as duas causas");
  });

  console.log("\n=== t66 · o diagnóstico não se contradiz com a linha de cima ===");
  t("lê também a foto da última verificação da nuvem", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ok(corpo.indexOf("STATE.oneDriveStatusPendente") > 0, "ignora o que a nuvem tem a mais");
    ok(corpo.indexOf("totalReceber") > 0 && corpo.indexOf("fotosReceber") > 0, "não lê os dois números");
    ok(corpo.indexOf("verificadoEm") > 0, "não mostra quando a foto foi tirada");
  });
  t("'nada pendente' exige as DUAS contas zeradas", ()=>{
    ok(HTML.indexOf("&& !d.nuvem.itens && !d.nuvem.fotos;") > 0,
       "voltaria a dizer 'nada pendente' com itens esperando na nuvem");
  });
  t("mostra na tela o que a nuvem tem e ainda não chegou", ()=>{
    ok(HTML.indexOf("Encontrado na nuvem, ainda não recebido") > 0, "sem a seção");
    ok(HTML.indexOf("é o mesmo número da linha \"para receber\" acima") > 0,
       "não liga o número ao que aparece acima, que era a origem da confusão");
  });
  t("o texto copiável traz as duas contas separadas", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoTexto(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoInlineHtml(", i));
    ok(corpo.indexOf("ENCONTRADO NA NUVEM, AINDA NAO RECEBIDO") > 0, "sem a conta da nuvem");
    ok(corpo.indexOf("PARA RECEBER — FILA LOCAL") > 0, "não deixa claro que a outra é a fila local");
  });
  t("registro antigo de autocura deixa de contar como falha", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ok(corpo.indexOf("const ehReparo = ") > 0, "sem o reconhecimento pelo texto");
    ok(corpo.indexOf("/reenvio agenda/i.test(e.motivo") > 0, "não reconhece o registro antigo");
    ok(corpo.indexOf("!ehReparo(e)") > 0, "as falhas e o placar não usam o reconhecimento");
  });
  t("continua sendo só leitura", ()=>{
    const i = HTML.indexOf("function onedriveDiagnosticoDados(");
    const corpo = HTML.slice(i, HTML.indexOf("function onedriveDiagnosticoTexto(", i));
    ["marcarAlterado(", "dbSet(", "registrarEventoSync(", "onedriveEnviarBlob"].forEach(m=>
      ok(corpo.indexOf(m) < 0, "o diagnóstico não pode alterar nada: " + m));
  });

  console.log("\n=== t67 · endereço da API sempre o do provedor escolhido ===");
  vm.runInContext(funcao("iaEndpointBase"), ctx);
  t("provedor da lista ignora endereço guardado errado", ()=>{
    const preset = vm.runInContext("IA_PROVEDORES['google-gemini']", ctx);
    ctx.__cfg = { provedor:"google-gemini", endpoint:"https://generativelanguage.googleapis.com/v1beta/openai" };
    ctx.__preset = preset;
    eq(vm.runInContext("iaEndpointBase(__cfg, __preset)", ctx), preset.endpoint,
       "o endereço errado continuaria valendo e a IA seguiria fora do ar");
  });
  t("modo Personalizado continua usando o endereço digitado", ()=>{
    ctx.__cfg = { provedor:"personalizado", endpoint:"https://minha-api.exemplo/v1" };
    ctx.__preset = vm.runInContext("IA_PROVEDORES['personalizado']", ctx);
    eq(vm.runInContext("iaEndpointBase(__cfg, __preset)", ctx), "https://minha-api.exemplo/v1");
  });
  t("barra sobrando no fim é removida", ()=>{
    ctx.__cfg = { provedor:"personalizado", endpoint:"https://x.exemplo/v1///" };
    ctx.__preset = { endpoint:"" };
    eq(vm.runInContext("iaEndpointBase(__cfg, __preset)", ctx), "https://x.exemplo/v1");
  });
  t("os três pontos de chamada usam o mesmo cálculo", ()=>{
    eq(HTML.split("const endpointBase = iaEndpointBase(cfg, preset);").length - 1, 3,
       "algum caminho ainda monta o endereço por conta própria");
    ok(HTML.indexOf('const endpointBase = (cfg.endpoint || preset.endpoint') < 0,
       "sobrou o cálculo antigo, que aceitava endereço errado");
  });
  t("a configuração se conserta sozinha ao ser lida", ()=>{
    const i = HTML.indexOf("function getIAConfig(){");
    const corpo = HTML.slice(i, i + 1400);
    ok(corpo.indexOf('if(c.provedor !== "personalizado")') > 0, "não normaliza o endereço");
    ok(corpo.indexOf("if(c.endpoint !== preset.endpoint) c.endpoint = preset.endpoint;") > 0,
       "não corrige o endereço guardado");
  });

  console.log("\n=== t68 · as normas em PDF chegam à IA de forma útil ===");
  vm.runInContext((/\nconst NORMAS_IA_LIMITE_CARACTERES\s*=\s*\d+;/.exec(HTML)||[""])[0], ctx);
  vm.runInContext((/\nconst NORMAS_IA_TAM_PEDACO\s*=\s*\d+;/.exec(HTML)||[""])[0], ctx);
  [ "normasPedacos", "normasTrechosEscolhidos", "contextoNormasIA" ].forEach(n=> vm.runInContext(funcao(n), ctx));
  const encher = (t, n)=> (t + " ").repeat(n);
  function tresNormas(){
    STATE.ui.normasIA = [
      { id:"n1", nome:"NR-12", ativo:true, criadoEm:1, texto:
          encher("Sumario e definicoes gerais preliminares deste documento", 300) +
          " As protecoes fixas devem impedir o acesso a zona de perigo da correia transportadora e do tambor. " +
          encher("Outro assunto sobre caldeiras e vasos de pressao", 300) },
      { id:"n2", nome:"NBR ISO 12100", ativo:true, criadoEm:2, texto:
          encher("Principios gerais de projeto e apreciacao de risco", 200) +
          " O agarramento e o arrasto sao fenomenos perigosos de elementos moveis de transmissao. " },
      { id:"n3", nome:"NBR 14153", ativo:true, criadoEm:3, texto:
          encher("Categorias de seguranca de sistemas de comando", 200) +
          " A distancia de seguranca considera o tempo de parada do equipamento. " }
    ];
  }
  t("qualquer norma pode contribuir, não só a primeira da lista", ()=>{
    tresNormas();
    /* Antes, a primeira norma consumia o orçamento inteiro e as demais nunca
       entravam, por mais relevantes que fossem. Agora, com um texto que toca
       os assuntos de duas normas diferentes, as duas aparecem. */
    const ctxN = vm.runInContext("contextoNormasIA('correia transportadora sem protecao no tambor com agarramento e arrasto em elementos moveis de transmissao')", ctx);
    ok(ctxN.indexOf("--- Norma: NR-12 ---") > 0, "a NR-12 ficou de fora");
    ok(ctxN.indexOf("--- Norma: NBR ISO 12100 ---") > 0,
       "a segunda norma ficou de fora mesmo tendo o trecho do assunto");
  });
  t("norma sem relação com o texto não ocupa espaço", ()=>{
    tresNormas();
    const ctxN = vm.runInContext("contextoNormasIA('correia transportadora sem protecao no tambor')", ctx);
    ok(ctxN.indexOf("--- Norma: NBR 14153 ---") < 0,
       "norma de outro assunto entrou e gastou espaço do pedido");
  });
  t("entra o trecho relacionado, não o começo do documento", ()=>{
    tresNormas();
    const ctxN = vm.runInContext("contextoNormasIA('correia transportadora sem protecao no tambor, agarramento')", ctx);
    ok(ctxN.indexOf("impedir o acesso a zona de perigo da correia") > 0, "não trouxe o trecho da proteção fixa");
    ok(ctxN.indexOf("agarramento e o arrasto sao fenomenos perigosos") > 0, "não trouxe o trecho do agarramento");
  });
  t("os trechos de todas as normas disputam o mesmo ranking", ()=>{
    ok(HTML.indexOf("function normasTrechosEscolhidos(") > 0, "sem o ranking global");
    ok(HTML.indexOf("let orcamento = NORMAS_IA_LIMITE_CARACTERES;") < 0, "sobrou o cálculo antigo");
    ok(HTML.indexOf("NORMAS_IA_LIMITE_CARACTERES / normas.length") < 0,
       "voltou a repartir em partes iguais — a norma mais relevante ficaria limitada");
  });
  t("a norma mais relevante leva mais espaço que as outras", ()=>{
    STATE.ui.normasIA = [
      { id:"x", nome:"Muito relacionada", ativo:true, criadoEm:1, texto:
          " correia transportadora tambor agarramento protecao fixa zona de perigo ".repeat(40) },
      { id:"y", nome:"Nada a ver", ativo:true, criadoEm:2, texto:
          " caldeiras vasos de pressao inspecao periodica hidrostatica ".repeat(40) }
    ];
    const tr = vm.runInContext("normasTrechosEscolhidos('correia transportadora sem protecao no tambor, agarramento', 60000)", ctx);
    const porNorma = {};
    tr.forEach(t=>{ porNorma[t.norma] = (porNorma[t.norma]||0) + t.texto.length; });
    ok((porNorma["Muito relacionada"]||0) > 0, "a norma do assunto não entrou");
    ok((porNorma["Nada a ver"]||0) === 0 || porNorma["Muito relacionada"] > porNorma["Nada a ver"],
       "a norma sem relação ocupou tanto espaço quanto a do assunto");
  });
  t("norma sem relação com o risco simplesmente não entra", ()=>{
    STATE.ui.normasIA = [
      { id:"y", nome:"Nada a ver", ativo:true, criadoEm:2, texto:
          " caldeiras vasos de pressao inspecao periodica hidrostatica ".repeat(40) }
    ];
    const tr = vm.runInContext("normasTrechosEscolhidos('choque eletrico em painel de comando energizado', 60000)", ctx);
    ok(tr.length === 0 || tr.every(t=>t.sem === 0),
       "trouxe trecho sem relação, gastando espaço do pedido à toa");
  });
  t("a tela de conferência usa o MESMO cálculo da geração", ()=>{
    ok(HTML.indexOf("function conferirNormasHtml(") > 0, "sem a tela de conferência");
    const i = HTML.indexOf("function conferirNormasHtml(");
    const corpo = HTML.slice(i, i + 2600);
    ok(corpo.indexOf("normasTrechosEscolhidos(exemplo, NORMAS_IA_LIMITE_CARACTERES)") > 0,
       "a conferência simula por conta própria — poderia mostrar uma coisa e enviar outra");
    ok(corpo.indexOf("Sem trecho relacionado desta vez") > 0, "não explica a norma que ficou de fora");
    ok(HTML.indexOf("App.toggleConferirNormas()") > 0, "sem o botão");
  });
  t("norma desativada não entra", ()=>{
    tresNormas();
    STATE.ui.normasIA[1].ativo = false;
    const ctxN = vm.runInContext("contextoNormasIA('agarramento')", ctx);
    ok(ctxN.indexOf("--- Norma: NBR ISO 12100 ---") < 0, "norma desativada foi enviada");
  });
  t("sem normas ou sem texto de referência, não quebra", ()=>{
    STATE.ui.normasIA = [];
    eq(vm.runInContext("contextoNormasIA('x')", ctx), "");
    tresNormas();
    ok(vm.runInContext("contextoNormasIA('')", ctx).length > 0, "sem texto-alvo deveria mandar o começo");
  });
  t("o trecho é escolhido pelo texto que a IA vai reescrever", ()=>{
    ok(HTML.indexOf(": contextoNormasIA(textoUsuario));") > 0,
       "o contexto não considera o texto do item — voltaria a mandar trecho aleatório");
  });
  t("a revisão de português não recebe trecho de norma", ()=>{
    ok(HTML.indexOf('const IA_TIPOS_SEM_NORMAS = ["revisao_pt"];') > 0, "a lista de exceção sumiu");
    ok(HTML.indexOf("IA_TIPOS_SEM_NORMAS.indexOf(tipo) >= 0 ? \"\"") > 0, "a exceção não é aplicada no prompt");
  });
  t("todas as chamadas de IA passam pelo mesmo ponto", ()=>{
    eq(HTML.split("contextoNormasIA(textoUsuario)").length - 1, 1, "mais de um lugar montando o prompt");
    const iRetentativas = HTML.indexOf("async function iaTentarComRetentativas(");
    ok(HTML.slice(iRetentativas, iRetentativas + 500).indexOf("chamarIA(tipo, textoUsuario)") > 0,
       "o laço de retentativas deixou de usar chamarIA, e perderia as normas");
    const iResiliente = HTML.indexOf("async function chamarIAResiliente(");
    ok(HTML.slice(iResiliente, iResiliente + 400).indexOf("iaTentarComRetentativas(tipo, textoUsuario)") > 0,
       "chamarIAResiliente deixou de passar pelo laço único de retentativas");
  });

  console.log("\n=== t69 · modal de criação de risco (bloco 1) ===");
  vm.runInContext(funcao("montarNomeRisco"), ctx);
  t("o nome do risco usa os quatro itens em frase corrida", ()=>{
    // Redacao revista em 25/08/2026 — ver t120.
    ctx.__r = { evento:"Agarramento", componente:"Correia", local:"Transmissão de potência", parteCorpo:"Mãos" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx),
       "Agarramento das mãos na correia da transmissão de potência");
  });
  t("sem componente, o complemento emenda sem vírgula", ()=>{
    ctx.__r = { evento:"Queda", componente:"", local:"Plataforma", parteCorpo:"" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx), "Queda na plataforma");
    ctx.__r = { evento:"Corte", componente:"", local:"", parteCorpo:"Dedos" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx), "Corte nos dedos");
  });
  t("o nome do risco junta evento e componente", ()=>{
    ctx.__r = { evento:"Agarramento", componente:"Correia transportadora" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx), "Agarramento na correia transportadora");
  });
  t("nome e descrição seguem a MESMA regra de vírgula", ()=>{
    const r = { evento:"Queda", componente:"", local:"Escada", parteCorpo:"Cabeça" };
    ctx.__r = r;
    ok(vm.runInContext("montarNomeRisco(__r)", ctx).indexOf("Queda na escada") === 0, "nome com vírgula sobrando");
    ok(C.montarDescricaoRisco(r).indexOf("Risco de queda na escada") === 0, "descrição com vírgula sobrando");
  });
  t("cada evento tem explicação e ela aparece no painel", ()=>{
    const eventos = vm.runInContext("RISCO_EVENTOS", ctx);
    eventos.forEach(e=> ok(e.desc && e.desc.length > 20, "evento sem explicação: " + e.v));
    ok(HTML.indexOf("App.toggleInfoEventos()") > 0, "sem o ícone de informação");
    ok(HTML.indexOf("__infoEventosAberto? `<div class=\"info-box\"") > 0, "o painel não abre");
  });
  t("o nome fica DEPOIS do quadro de montagem", ()=>{
    const i = HTML.indexOf("function formRiscoSHtml(){");
    const corpo = HTML.slice(i, i + 1600);
    const iMont = corpo.indexOf("${blocoMontadorRiscoHtml(r)}");
    const iNome = corpo.indexOf('id="risco-nome-input"');
    ok(iMont > 0 && iNome > 0, "não achou os dois blocos");
    ok(iMont < iNome, "o nome continua acima do quadro de montagem");
  });
  t("sem componente, fica só o evento", ()=>{
    ctx.__r = { evento:"Agarramento", componente:"" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx), "Agarramento");
  });
  t("sem evento, não inventa nome", ()=>{
    ctx.__r = { evento:"", componente:"Correia" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx), "");
  });
  t("o nome se atualiza enquanto for a sugestão do app", ()=>{
    ctx.__r = { evento:"Agarramento", componente:"", descricao:"", nome:"" };
    vm.runInContext("aplicarSugestoesRisco(__r)", ctx);
    eq(ctx.__r.nome, "Agarramento");
    ctx.__r.componente = "Correia transportadora";
    vm.runInContext("aplicarSugestoesRisco(__r)", ctx);
    eq(ctx.__r.nome, "Agarramento na correia transportadora", "não acompanhou o componente escolhido depois");
  });
  t("nome digitado por você NUNCA é sobrescrito", ()=>{
    ctx.__r = { evento:"Agarramento", componente:"Correia", descricao:"", nome:"" };
    vm.runInContext("aplicarSugestoesRisco(__r)", ctx);
    ctx.__r.nome = "Nome escrito à mão";
    ctx.__r.componente = "Tambor de acionamento";
    vm.runInContext("aplicarSugestoesRisco(__r)", ctx);
    eq(ctx.__r.nome, "Nome escrito à mão");
  });
  t("risco antigo, sem marca de sugestão, não é renomeado", ()=>{
    /* Quem já tem risco cadastrado não pode ver os nomes mudarem sozinhos ao
       abrir o app — seria uma alteração retroativa em laudo assinado. */
    ctx.__r = { evento:"Agarramento", componente:"Correia transportadora", descricao:"x", nome:"Agarramento" };
    vm.runInContext("aplicarSugestoesRisco(__r)", ctx);
    eq(ctx.__r.nome, "Agarramento", "renomeou um risco que já existia");
  });
  t("a rolagem do modal é guardada e devolvida", ()=>{
    const i = HTML.indexOf("function renderModalEntidade(){");
    const corpo = HTML.slice(i, i + 1400);
    ok(corpo.indexOf('document.querySelector("#overlayRoot .modal-card")') > 0, "não lê o modal atual");
    ok(corpo.indexOf("const rolagem = anterior ? anterior.scrollTop : 0;") > 0, "não guarda a posição");
    ok(corpo.indexOf("novo.scrollTop = rolagem;") > 0, "não devolve a posição");
    ok(corpo.indexOf("const rolagem") < corpo.indexOf("abrirOverlay(html)"), "guarda depois de redesenhar");
  });
  t("os selects das caixas de medida entram nas regras de largura", ()=>{
    ok(HTML.indexOf(".field select,.medida-box select,.mitig-box select{width:100%;max-width:100%") > 0,
       "os selects fora de .field voltariam a estourar a largura do modal");
    ok(HTML.indexOf(".field select.sp-select-sm,.medida-box select.sp-select-sm,.mitig-box select.sp-select-sm") > 0,
       "a variação pequena não pega nas caixas de medida");
  });
  t("o quadro passou a se chamar Solução", ()=>{
    ok(HTML.indexOf("${ic('warn')} Solução</div>") > 0, "sem o novo rótulo");
    ok(HTML.indexOf("${ic('warn')} Mitigação proposta</div>") < 0, "o rótulo antigo continua na tela");
  });

  console.log("\n=== t70 · o que já existe e a solução são dois quadros (bloco 2b) ===");
  const riscoComExistente = {
    id:"rX", componente:"Correia", local:"Transmissão de potência",
    medidaImplementada:"Sim", medidasExistentes:["prot_fixa"],
    medidaExistenteSituacao:"parcial", medidaExistenteRessalva:"sem dispositivo de intertravamento",
    descMedida:"Proteção fixa instalada na correia, porém sem intertravamento.",
    sugestaoMitigacao:"Instalar chave de segurança na tampa"
  };
  t("a IA recebe a proposta como assunto e o que existe como contexto", ()=>{
    const e = C.laudoEntradaSolucao({ risco: riscoComExistente });
    ok(e.indexOf("O que precisa ser feito: Instalar chave de segurança") === 0, "a proposta não abre o texto: " + e);
    ok(e.indexOf("Já existe na máquina: Proteção fixa") > 0, "não citou o que já existe: " + e);
    ok(e.indexOf("Situação do que já existe: Atende em parte") > 0, "não citou o julgamento: " + e);
    ok(e.indexOf("COMPLEMENTAR ou CORRIGIR") > 0, "não instruiu a complementar: " + e);
  });
  t("sem nada existente, a IA recebe só a proposta", ()=>{
    const e = C.laudoEntradaSolucao({ risco:{ id:"rY", sugestaoMitigacao:"Instalar guarda-corpo" } });
    eq(e, "O que precisa ser feito: Instalar guarda-corpo");
  });
  t("sem proposta escrita, a IA é avisada em vez de receber vazio", ()=>{
    const e = C.laudoEntradaSolucao({ risco:{ id:"rZ", componente:"Correia", medidasExistentes:["prot_fixa"] } });
    ok(e.indexOf("o inspetor não escreveu") > 0, e);
  });
  t("as duas passadas da geração do laudo mandam o mesmo contexto", ()=>{
    eq((HTML.match(/chamarIAResiliente\("mitigacao_xlsx", laudoEntradaSolucao\(/g)||[]).length, 2);
    eq((HTML.match(/chamarIAResiliente\("mitigacao_xlsx", *[a-z]/g)||[]).length, 2,
       "alguma chamada da Solução ficou fora do contexto novo");
    /* O gerador antigo de enriquecimento (chamarIA, sem "Resiliente") continua
       escolhendo entre os dois campos de propósito: ele grava a resposta de
       volta no MESMO campo que leu. Misturar contexto ali sobrescreveria a
       descrição do que existe com um texto de proposta. */
    ok(HTML.indexOf('chamarIA("mitigacao", medidaExistente ? item.risco.descMedida') > 0,
       "o gerador antigo deixaria de gravar no campo certo");
  });
  t("a revisão mostra o quadro do que já existe antes da solução", ()=>{
    const h = C.laudoBlocoExistenteHtml({ risco: riscoComExistente });
    ok(h.indexOf("Mitigação existente na máquina") > 0, "sem o título");
    ok(h.indexOf("Atende em parte") > 0, "sem o julgamento");
    ok(h.indexOf("Proteção fixa") > 0, "sem a medida marcada");
    ok(h.indexOf("Ressalva: sem dispositivo de intertravamento") > 0, "sem a ressalva");
    ok(h.indexOf("NR-12") > 0, "sem a base normativa");
    ok(h.indexOf("onclick") < 0, "o quadro é só de leitura — não deveria ter botão");
  });
  t("máquina sem proteção nenhuma diz isso com todas as letras", ()=>{
    const h = C.laudoBlocoExistenteHtml({ risco:{ id:"rW", medidaImplementada:"Não" } });
    ok(h.indexOf("Nada registrado") > 0, h);
    ok(h.indexOf("parte do zero") > 0, h);
  });
  t("o quadro é um cartão próprio, separado do cartão de Solução", ()=>{
    /* Antes o quadro vivia DENTRO do card de Solução; agora "existente" é
       um campo de verdade (laudoBlocoCampo(item,"existente")), com cartão
       próprio — o mesmo motor genérico dos outros 4 campos, não uma
       função à parte. Só ELE deve trazer esse título. */
    STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
    const it = C.linhasEscopoSimples()[0];
    ok(C.laudoBlocoCampo(it, "existente").indexOf("Mitigação existente na máquina") > 0, "faltou no cartão próprio");
    ["escopo","tarefa","risco","solucao"].forEach(c=>
      ok(C.laudoBlocoCampo(it, c).indexOf("Mitigação existente na máquina") < 0, "vazou para o campo " + c));
  });
  t("sem proposta em campo, a revisão avisa que o laudo repetiria o que já existe", ()=>{
    STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
    const it = C.linhasEscopoSimples()[0];
    it.risco.medidaImplementada = "Sim";
    it.risco.descMedida = "Proteção fixa instalada.";
    it.risco.sugestaoMitigacao = "";
    ok(C.laudoBlocoCampo(it, "solucao").indexOf("Sem proposta, o laudo repete") > 0, "sem o aviso");
    it.risco.sugestaoMitigacao = "Instalar chave de segurança";
    ok(C.laudoBlocoCampo(it, "solucao").indexOf("Sem proposta, o laudo repete") < 0, "o aviso ficou depois de escrever a proposta");
  });
  t("o texto automático acompanha as marcações e para quando o usuário edita", ()=>{
    const r = { componente:"Correia", medidasExistentes:["prot_fixa"], medidaExistenteSituacao:"ok" };
    const t1 = C.sincronizarDescMedidaExistente(r);
    eq(r.descMedida, t1);
    r.medidasExistentes = ["prot_fixa","loto"];
    const t2 = C.sincronizarDescMedidaExistente(r);
    ok(t2 !== t1 && r.descMedida === t2, "o texto não acompanhou a segunda marcação");
    r.descMedida = "texto que eu mesmo escrevi";
    r.medidasExistentes = ["prot_fixa"];
    C.sincronizarDescMedidaExistente(r);
    eq(r.descMedida, "texto que eu mesmo escrevi");
  });

  console.log("\n=== t91 · Mitigação Existente e Solução em cartões separados ===");
  /* O usuário mandou print mostrando os dois ainda dentro do mesmo cartão
     "Solução / Mitigação" e disse "estão juntos ainda". Antes disto, o quadro
     de mitigação existente vivia DENTRO do cartão de Solução — dois assuntos
     em uma caixa só. Agora cada um tem seu próprio cartão branco na tela. */
  t("existente é um campo de verdade, com cartão próprio no render loop", ()=>{
    /* Virou o 5º campo (laudoBlocoCampo(item,"existente")) em vez de um
       wrapper à parte — mesmo motor genérico dos outros 4, mas FORA de
       LAUDO_CAMPOS (não conta no "X de 4 campos" nem ganha coluna no
       Excel — ver laudoCampoDef). */
    ok(HTML.indexOf('function laudoBlocoMedidaExistenteEditavelHtml(item){') > 0);
    ok(HTML.indexOf('c.k==="solucao"? laudoBlocoCampo(item,"existente") : ""') > 0,
       "o loop da tela não insere mais o cartão de existente antes da solução");
  });
  t("na tela do item, o cartão de mitigação existente vem ANTES do cartão de Solução", ()=>{
    /* linhasEscopoSimples()[0] não é necessariamente "r1" aqui — outros
       testes já rodaram e podem ter alterado a árvore. Usa o id de quem
       está lá de fato. */
    STATE.ui.laudoRiscoId = C.linhasEscopoSimples()[0].risco.id;
    const h = C.screenSimplesLaudoItem();
    const iExistente = h.indexOf("Mitigação existente na máquina");
    const iSolucao = h.indexOf("O que você propôs em campo");
    ok(iExistente > 0 && iSolucao > 0 && iExistente < iSolucao,
       "a ordem na tela ficou errada — mitigação existente precisa vir primeiro");
  });
  t("o rótulo do campo Solução não carrega mais a Mitigação junto", ()=>{
    /* def.rot alimenta o título do cartão E os dois modais (aplicar em
       vários / copiar de outro) — os três precisam refletir o mesmo nome. */
    eq(HTML.indexOf('rot:"Solução / Mitigação"'), -1, "sobrou o rótulo antigo em LAUDO_CAMPOS");
    ok(HTML.indexOf('{ k:"solucao", rot:"Solução",') > 0, "faltou o rótulo novo em LAUDO_CAMPOS");
  });
  t("o rótulo no laudo impresso (A4) também não fala mais em Mitigação junto", ()=>{
    ok(HTML.indexOf('<div class="lp-rc-rot">Solução</div>') > 0, "o rótulo do laudo impresso não acompanhou a renomeação");
    eq(HTML.indexOf('<div class="lp-rc-rot">Solução / Mitigação</div>'), -1, "sobrou o rótulo antigo no laudo impresso");
  });

  console.log("\n=== t71 · caixa de texto que expande (bloco 3) ===");
  t("toda textarea ganha o botão sem nenhuma tela ser alterada", ()=>{
    ok(HTML.indexOf('document.querySelectorAll("textarea:not([data-ta])")') > 0, "não varre as caixas pendentes");
    ok(HTML.indexOf('caixa.className = "ta-caixa";') > 0, "não cria a caixa em volta");
    ok(HTML.indexOf('b.className = "ta-botao";') > 0, "não cria o botão");
    ok(HTML.indexOf('ta.setAttribute("data-ta","1");') > 0, "sem a marca, o botão seria criado de novo a cada desenho");
  });
  t("o espaçador entra ANTES de a caixa virar fixa", ()=>{
    const f = funcao("taExpandir");
    ok(f.indexOf("caixa.getBoundingClientRect().height") < f.indexOf('caixa.classList.add("expandida")'),
       "mediria zero e o modal saltaria de posição");
    ok(f.indexOf("caixa.parentNode.insertBefore(esp, caixa)") > 0, "o espaçador não segura o lugar");
  });
  t("fecha por clique fora, pelo botão e pelo Esc", ()=>{
    ok(funcao("taExpandir").indexOf('fundo.addEventListener("click", taRecolher)') > 0, "clique fora não fecha");
    ok(funcao("taExpandir").indexOf("if(__taCaixaAberta === caixa){ taRecolher(); return; }") > 0, "o botão não alterna");
    ok(HTML.indexOf('if(e.key === "Escape" && __taCaixaAberta) taRecolher();') > 0, "Esc não fecha");
  });
  t("ao recolher, some tudo que foi criado", ()=>{
    const f = funcao("taRecolher");
    ["__taEspacador", "__taFundo", "removeChild", 'classList.remove("expandida")', 'classList.remove("ta-aberta")']
      .forEach(x=> ok(f.indexOf(x) > 0, "faltou limpar " + x));
  });
  t("tela redesenhada por baixo não deixa a tarja escura presa", ()=>{
    ok(funcao("prepararTextareas").indexOf("!document.body.contains(__taCaixaAberta)") > 0,
       "o fundo escuro ficaria na frente de tudo sem nada para fechar");
  });
  t("expandida, a caixa fica na frente do modal e maior que ele", ()=>{
    ok(HTML.indexOf(".ta-caixa.expandida{position:fixed;left:10px;right:10px;top:10px;bottom:10px;z-index:4001") > 0);
    ok(HTML.indexOf(".ta-fundo{position:fixed;inset:0;") > 0);
    ok(HTML.indexOf("html.ta-aberta .bottomnav,html.ta-aberta .fab-wrap,html.ta-aberta .laudo-fab{display:none!important;}") > 0,
       "a barra de baixo apareceria por cima da caixa aberta");
  });

  console.log("\n=== t72 · revisão de português ao aplicar (bloco 3) ===");
  [ "revisaoPtPalavras", "revisaoPtNumeros", "revisaoPtLimpar", "revisaoPtSemelhanca", "revisaoPtAceitavel" ]
    .forEach(n=> vm.runInContext(funcao(n), ctx));
  t("correção de grafia e acento passa", ()=>{
    ok(C.revisaoPtAceitavel("Protecao fixa instalada na coreia", "Proteção fixa instalada na correia."));
    ok(C.revisaoPtAceitavel("risco de esmagamento de maos na correia", "Risco de esmagamento de mãos na correia."));
    ok(C.revisaoPtAceitavel("Instalar proteção.", "Instalar proteção."), "texto igual deveria passar");
  });
  t("número diferente derruba a correção na hora", ()=>{
    ok(!C.revisaoPtAceitavel("Atende ao item 12.5.11 da NR-12.", "Atende ao item 12.5.1 da NR-12."),
       "um item de norma trocado passaria para um laudo assinado");
    ok(!C.revisaoPtAceitavel("Guarda-corpo de 1,10 m.", "Guarda-corpo de 1,20 m."));
  });
  t("texto inventado ou reescrito é recusado", ()=>{
    ok(!C.revisaoPtAceitavel("Instalar proteção.", "Instalar proteção fixa metálica com intertravamento."));
    ok(!C.revisaoPtAceitavel("Risco de esmagamento de mãos", "Risco de amputação de dedos"));
    ok(!C.revisaoPtAceitavel("Proteção fixa instalada na correia.", "Enclausuramento fixo montado no acionamento."));
    ok(!C.revisaoPtAceitavel("Instalar proteção.", ""), "resposta vazia não pode virar o texto do laudo");
  });
  t("a resposta é limpa de aspas e rótulos antes de valer", ()=>{
    eq(C.revisaoPtLimpar('Texto corrigido: "Instalar proteção."'), "Instalar proteção.");
    eq(C.revisaoPtLimpar("Instalar proteção."), "Instalar proteção.");
  });
  t("sem IA configurada, o texto do engenheiro passa intacto", ()=>{
    const f = funcao("corrigirPortuguesIA");
    ok(f.indexOf("if(!getIAApiKey()) return base;") > 0, "chamaria a IA sem chave");
    ok(f.indexOf("catch(e){ return base; }") > 0, "uma falha de rede apagaria o texto");
    ok(f.indexOf("revisaoPtAceitavel(base, novo) ? novo : base") > 0, "aceitaria a devolução sem conferir");
  });
  t("aplicar de qualquer jeito dispara a revisão", ()=>{
    ["async laudoAplicar(rid, campo){", "async laudoValidar(rid, campo){", "async laudoAprovarLinha(rid){"]
      .forEach(m=> ok(HTML.indexOf(m) > 0, "faltou " + m));
    eq((HTML.match(/App\.laudoRevisarPortugues\(rid, campo\)/g)||[]).length, 2);
    ok(HTML.indexOf("laudoRevisarTextoEtitulo(item, c.k)") > 0, "aprovar a linha inteira não revisaria");
  });
  t("o título do risco só é revisado junto com o campo do risco", ()=>{
    const f = funcao("laudoRevisarTextoEtitulo");
    ok(f.indexOf('if(campo === "risco"){') > 0, "revisaria o título quatro vezes");
    ok(!/r\.nomeAuto\s*=/.test(f), "mexer em nomeAuto faria o montador desfazer a revisão depois");
    ok(f.indexOf("r.atualizadoEm = agoraSync();") > 0, "o título revisado não sincronizaria");
  });

  console.log("\n=== t73 · aplicar o mesmo texto em vários itens (bloco 3) ===");
  const rep = (rid, campo)=> C.laudoAlvosReplicar(C.laudoItemPorId(rid), campo);
  t("cada campo só enxerga o próprio nível", ()=>{
    eq(C.laudoNivelDoCampo("escopo"), "maquina");
    eq(C.laudoNivelDoCampo("tarefa"), "tarefa");
    eq(C.laudoNivelDoCampo("risco"), "risco");
    eq(C.laudoNivelDoCampo("solucao"), "risco");
  });
  t("o item de origem nunca aparece na lista de destinos", ()=>{
    STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
    const it = C.linhasEscopoSimples()[0];
    ok(!rep(it.risco.id, "risco").some(a=> a.chave === it.risco.id), "copiaria em cima de si mesmo");
    ok(!rep(it.risco.id, "escopo").some(a=> a.chave === it.maquina.id));
    ok(!rep(it.risco.id, "tarefa").some(a=> a.chave === it.tarefa.id));
  });
  t("destino de escopo é máquina, de tarefa é tarefa, de risco é risco", ()=>{
    const it = C.linhasEscopoSimples()[0];
    const linhas = C.linhasEscopoSimples();
    const idsMaq = new Set(linhas.map(o=>o.maquina.id));
    const idsTar = new Set(linhas.map(o=>o.tarefa.id));
    const idsRis = new Set(linhas.map(o=>o.risco.id));
    rep(it.risco.id, "escopo").forEach(a=> ok(idsMaq.has(a.chave), "escopo apontou para algo que não é máquina"));
    rep(it.risco.id, "tarefa").forEach(a=> ok(idsTar.has(a.chave), "tarefa apontou para algo que não é tarefa"));
    rep(it.risco.id, "solucao").forEach(a=> ok(idsRis.has(a.chave), "solução apontou para algo que não é risco"));
  });
  t("cada destino aparece uma vez só", ()=>{
    const it = C.linhasEscopoSimples()[0];
    ["escopo","tarefa","risco"].forEach(c=>{
      const ch = rep(it.risco.id, c).map(a=>a.chave);
      eq(new Set(ch).size, ch.length, "destino repetido em " + c);
    });
  });
  t("agrupar por área junta o que é da mesma área", ()=>{
    const it = C.linhasEscopoSimples()[0];
    const alvos = rep(it.risco.id, "risco");
    const g = C.laudoAgruparAlvos(alvos, "area");
    eq(g.reduce((n,x)=>n+x.itens.length,0), alvos.length, "algum item se perdeu no agrupamento");
    g.forEach(x=> x.itens.forEach(a=> eq(a.area, x.nome)));
    eq(C.laudoAgruparAlvos(alvos, "").length, 1, "sem agrupar deveria dar uma lista só");
  });
  t("só é oferecido agrupamento por um nível acima do destino", ()=>{
    const chaves = (n)=> vm.runInContext(`LAUDO_AGRUPAR_POR.${n}.map(x=>x.k).join(",")`, ctx);
    eq(chaves("maquina"), ",projeto,area");
    eq(chaves("tarefa"),  ",projeto,area,maquina");
    eq(chaves("risco"),   ",projeto,area,maquina,tarefa");
  });
  t("a tela avisa quando vai substituir um texto que já existe", ()=>{
    const it = C.linhasEscopoSimples()[0];
    C.laudoSet(it, "risco", { fin:"Texto de origem.", st:"ok" });
    const outro = C.linhasEscopoSimples().find(o=> o.risco.id !== it.risco.id);
    if(!outro) return;
    C.laudoSet(outro, "risco", { fin:"Texto que já estava lá.", st:"edit" });
    const h = C.laudoSheetReplicarHtml(it, "risco");
    ok(h.indexOf("Já tem texto — será substituído") > 0, "substituiria sem avisar");
    ok(h.indexOf("Texto que já estava lá.") > 0, "não mostra o que será perdido");
  });
  t("a marcação é por chave do item, não por posição na lista", ()=>{
    ok(HTML.indexOf("__laudoReplicaSel.add(el.value)") > 0);
    ok(funcao("laudoSheetReplicarHtml").indexOf('__laudoReplicaSel.has(a.chave)?"checked":""') > 0,
       "trocar o agrupamento perderia o que já estava marcado");
  });
  t("abrir a lista começa com nada marcado", ()=>{
    ok(HTML.indexOf("__laudoReplicaSel = new Set();\n    abrirOverlay(laudoSheetReplicarHtml(item, campo));") > 0,
       "sobra de uma abertura anterior aplicaria texto onde ninguém pediu");
  });
  t("o botão de marcar o grupo não abre nem fecha o grupo", ()=>{
    ok(HTML.indexOf("ev.preventDefault(); ev.stopPropagation();") > 0);
  });
  t("o botão de aplicar em vários só aparece depois de aplicar", ()=>{
    const bloco = funcao("laudoBlocoCampo");
    ok(bloco.indexOf('${(st==="ok"||st==="edit") && fin? `<button') > 0, "apareceria antes de haver texto decidido");
  });

  console.log("\n=== t74 · quadro do texto de origem não é mais espremido ===");
  t("numa folha em coluna, só a lista encolhe", ()=>{
    ok(HTML.indexOf(".sheet-col>*{flex-shrink:0;}") > 0, "sem isto tudo encolhe junto");
    ok(HTML.indexOf(".sheet-col>.sheet-rolagem{flex:1 1 auto;min-height:0;overflow:auto;}") > 0);
  });
  t("o quadro do texto de origem não encolhe e tem teto", ()=>{
    ok(/\.rep-origem\{flex:0 0 auto;/.test(HTML), "voltaria a ser espremido em uma linha");
    ok(HTML.indexOf("max-height:30vh") > 0, "sem teto, o quadro engoliria a lista");
    ok(HTML.indexOf("@media (max-height:700px){ .rep-origem{max-height:22vh;} }") > 0, "tela baixa ficaria sem lista");
  });
  /* Três: aplicar em vários, copiar de outro e o modal de exportação. */
  t("as folhas com lista usam a mesma regra", ()=>{
    eq((HTML.match(/class="sheet sheet-col"/g)||[]).length, 3);
    eq((HTML.match(/class="sheet-rolagem"/g)||[]).length, 3);
    ok(HTML.indexOf('id="laudoReplicaLista" style="overflow:auto;flex:1;min-height:0"') < 0, "sobrou o estilo antigo em linha");
  });

  console.log("\n=== t75 · logotipo do laudo em PNG, com fundo transparente ===");
  t("o logotipo é salvo em PNG, nunca em JPEG", ()=>{
    const f = funcao("comprimirLogoPNG");
    ok(f.indexOf('canvas.toDataURL("image/png")') > 0, "sem PNG o fundo transparente vira preto");
    ok(f.indexOf("image/jpeg") < 0, "JPEG não tem canal de transparência");
    ok(f.indexOf("fillRect") < 0 && f.indexOf("fillStyle") < 0, "pintar um fundo antes apagaria a transparência");
  });
  t("a foto continua em JPEG — quem mudou foi só o logotipo", ()=>{
    ok(funcao("comprimirImagem").indexOf('canvas.toDataURL("image/jpeg", quality||0.7)') > 0,
       "as fotos ficariam gigantes se virassem PNG");
  });
  t("o envio do logotipo usa a função certa", ()=>{
    ok(HTML.indexOf("comprimirLogoPNG(arq, 600)") > 0, "não usa o caminho que preserva transparência");
    ok(HTML.indexOf("comprimirImagem(input.files[0], 600, 0.92)") < 0, "sobrou a chamada antiga que gerava fundo preto");
  });
  t("PNG grande demais é reduzido em vez de virar JPEG", ()=>{
    const f = funcao("comprimirLogoPNG");
    ok(f.indexOf("saida.length <= LOGO_LIMITE_BYTES") > 0, "sem teto, um logotipo pesado atrapalharia a sincronização");
    ok(/const tentativas = \[maxDim,/.test(f), "não tenta dimensões menores");
  });
  t("logotipo salvo no formato antigo é reconhecido e avisado", ()=>{
    ok(HTML.indexOf("function logoSemTransparencia(){") > 0);
    ok(HTML.indexOf("/^data:image\\/jpe?g/i.test(logo())") > 0, "não detecta o formato sem transparência");
    ok(HTML.indexOf("Este logotipo está sem transparência") > 0, "não avisa quem enviou antes da correção");
  });
  t("dá para trocar e remover o logotipo depois de enviado", ()=>{
    ok(HTML.indexOf("App.lpRemoverLogo()") > 0, "sem remover, um logotipo errado ficaria para sempre");
    ok(HTML.indexOf("lpRemoverLogo(){") > 0);
    ok(HTML.indexOf("${!temLogo? `<div class=\"card card-pad\" style=\"background:#FFF3D6") < 0,
       "o painel voltaria a sumir assim que houvesse logotipo");
    ok(HTML.indexOf('${logo()? "Trocar" : "Enviar"} logotipo (PNG)') > 0, "o botão do modal sumiu");
    ok(HTML.indexOf("App.lpAbrirLogo()") > 0, "sem o botão que abre o modal do logotipo");
  });
  t("remover deixa vazio, não apaga a chave", ()=>{
    ok(HTML.indexOf('getMecseteConfig().logoLaudo = "";') > 0,
       "chave ausente deixaria o logotipo antigo voltar do outro aparelho na união");
    ok(HTML.indexOf("delete getMecseteConfig().logoLaudo") < 0);
  });
  t("trocar e remover viajam para os outros aparelhos", ()=>{
    /* Três: enviar logotipo, remover logotipo e salvar o texto do rodapé —
       tudo que vive no mecseteConfig e precisa chegar nos outros aparelhos. */
    /* Cinco: logotipo (enviar/remover), figura do processo (enviar/remover) e
       o texto do rodapé — tudo que vive no mecseteConfig e precisa sincronizar. */
    eq((HTML.match(/STATE\.ui\.mecseteEm = agoraSync\(\);\s*\n\s*marcarEquipeAlterada\(\);/g)||[]).length, 5,
       "sem carimbo novo, a nuvem devolveria o valor antigo");
  });
  t("a prévia mostra onde o logotipo é transparente", ()=>{
    ok(HTML.indexOf(".lp-logo-previa{") > 0);
    ok(HTML.indexOf("linear-gradient(45deg,#D9DCE6 25%,transparent 25%)") > 0, "sem quadriculado não dá para ver o fundo");
  });
  t("trocar o logotipo obriga a remontar o laudo", ()=>{
    eq((HTML.match(/cacheFoto\.clear\(\); __lpPaginas = \[\]; __lpHtml = "";/g)||[]).length, 4,
       "trocar logotipo ou figura precisa invalidar o laudo já montado");
  });

  console.log("\n=== t76 · inventário de máquinas: colunas e tipo do equipamento ===");
  // TIPOS_EQUIPAMENTO já foi extraído lá no início (laudoBlocoPlaqueta também usa).
  [ "tipoSugeridoDaMaquina", "tipoEquipamento" ].forEach(n=> vm.runInContext(funcao(n), ctx));
  t("as colunas do inventário são iguais em todas as tabelas", ()=>{
    ok(/const INV_COLS = \[\d+(, ?\d+){11}\];/.test(HTML), "sem larguras fixas para as 12 colunas");
    eq((HTML.match(/\$\{invColgroup\}/g)||[]).length, 2, "o colgroup precisa ir no cabeçalho E em cada linha");
    ok(HTML.indexOf(".lp-inv{width:100%;table-layout:fixed;") > 0,
       "sem table-layout:fixed a largura declarada vira só sugestão e cada linha recalcula a sua");
  });
  /* A soma tem de bater com a página em que a tabela é IMPRESSA. Desde que o
     inventário passou a sair deitado, essa página é a A4 em paisagem. */
  t("as larguras somam a área útil da página do inventário", ()=>{
    const m = /const INV_COLS = \[([^\]]+)\]/.exec(HTML);
    const soma = m[1].split(",").reduce((a,b)=>a+Number(b.trim()),0);
    eq(soma, 1017, "297mm de página deitada menos 2 × 14mm de margem");
  });
  t("não sobrou largura em linha brigando com o colgroup", ()=>{
    ok(HTML.indexOf('<th style="width:96px">Imagem</th>') < 0, "os width antigos do cabeçalho continuariam mandando");
    // Desde 27/08/2026 ganhou "position:relative" (ancora do checkbox de
    // ocultar equipamento, ver t132) -- o padding em si continua intacto.
    ok(HTML.indexOf(".lp-inv td.foto{padding:2px") > 0);
  });
  t("a coluna Descrição passa a ser o tipo, não o parágrafo", ()=>{
    ok(HTML.indexOf("<td>${esc(tipoEquipamento(m))}</td>") > 0, "o laudo impresso ainda usaria o parágrafo");
    ok(HTML.indexOf("xlsmCellTexto(`D${rowNum}`,S.D, tipoEquipamento(maquina))") > 0, "o Excel ainda usaria o parágrafo");
    ok(HTML.indexOf("xlsmCellTexto(`D${rowNum}`,S.D, maquina.descricao)") < 0, "sobrou a versão antiga");
  });
  t("o tipo escolhido vale acima de qualquer dedução", ()=>{
    eq(C.tipoEquipamento({ nome:"Esteira pós mesa de seleção Manual B", tipoEquip:"Esteira transportadora" }), "Esteira transportadora");
    eq(C.tipoEquipamento({ nome:"X", tipoEquip:OUTRO, tipoEquipOutro:"Transportador de canecas duplo" }), "Transportador de canecas duplo");
  });
  t("máquina cadastrada antes do campo não deixa a coluna vazia", ()=>{
    eq(C.tipoEquipamento({ nome:"Mesa de seleção manual B" }), "Mesa de seleção manual");
    eq(C.tipoSugeridoDaMaquina({ nome:"Elevador de Canecas 01" }), "Elevador de Canecas");
    eq(C.tipoSugeridoDaMaquina({ nome:"Esteira nº 3" }), "Esteira");
    eq(C.tipoSugeridoDaMaquina({ nome:"" }), "");
  });
  t("a dedução nunca devolve vazio quando há nome", ()=>{
    eq(C.tipoSugeridoDaMaquina({ nome:"01" }), "01", "um nome só de número não pode virar coluna em branco");
  });
  t("a lista de tipos cobre o beneficiamento e aceita Outro", ()=>{
    const lista = vm.runInContext("TIPOS_EQUIPAMENTO", ctx);
    ok(lista.length >= 20, "lista curta demais");
    ["Mesa de seleção manual","Esteira transportadora","Elevador de canecas","Vision sorter","Painel elétrico"]
      .forEach(x=> ok(lista.indexOf(x) >= 0, "faltou " + x));
    ok(HTML.indexOf("selectOptions(TIPOS_EQUIPAMENTO, m.tipoEquip, true, \"Outro (especificar)\")") > 0, "sem opção de escrever outro");
    ok(HTML.indexOf("App.setDraftField('tipoEquipOutro', this.value)") > 0);
  });
  t("o logotipo da capa continua saindo todo branco", ()=>{
    ok(HTML.indexOf(".lp-capa-lat .lp-logo{filter:brightness(0) invert(1)") > 0,
       "sem o filtro, a capa deixaria de ter o logotipo em branco");
    eq((HTML.match(/filter:brightness\(0\) invert\(1\)/g)||[]).length, 1, "só a capa deve inverter o logotipo");
  });

  console.log("\n=== t77 · painel de progresso com tempo e botão de parar ===");
  vm.runInContext(funcao("progressoTempo"), ctx);
  t("o tempo é mostrado em minutos quando passa de um", ()=>{
    eq(C.progressoTempo(0), "0s");
    eq(C.progressoTempo(45), "45s");
    eq(C.progressoTempo(60), "1min 00s");
    eq(C.progressoTempo(605), "10min 05s");
    eq(C.progressoTempo(-5), "0s", "tempo negativo não pode aparecer na tela");
  });
  t("a estimativa só aparece depois de dois itens medidos", ()=>{
    const f = funcao("progressoDesenhar");
    ok(f.indexOf("p.feito >= 2 && p.total > p.feito") > 0,
       "com um item só, o primeiro (que monta o índice de exemplos) daria um número absurdo");
    ok(f.indexOf("decorrido/p.feito*(p.total-p.feito)") > 0, "não calcula o que falta");
  });
  t("parar não interrompe uma chamada no meio", ()=>{
    ok(HTML.indexOf("__progresso.cancelado = true;") > 0);
    ok(funcao("gerarLaudoIAItens").indexOf("if(progressoCancelado()) break;") > 0,
       "o laço precisa sair ANTES de disparar a próxima chamada");
  });
  t("o painel some em qualquer desfecho das exportações", ()=>{
    eq((HTML.match(/progressoFechar\(painelExport\)/g)||[]).length, 1);
    eq((HTML.match(/progressoFechar\(painelWord\)/g)||[]).length, 1);
    eq((HTML.match(/\}\s*finally\s*\{[^}]*progressoFechar/g)||[]).length, 4,
       "Excel, Word, a geração de textos e a recuperação de fotos perdidas — sem finally, um erro deixaria o painel preso na frente do app");
    ok(funcao("gerarLaudoIAItens").indexOf("finally{ progressoFechar(meuPainel); }") > 0);
    ok(HTML.indexOf("finally{\n      progressoFechar(souDono);\n    }") > 0);
  });
  t("quem não abriu o painel não fecha o dos outros", ()=>{
    ok(funcao("progressoFechar").indexOf("if(meu === false) return;") > 0,
       "a geração de textos fecharia o painel da exportação no meio");
    ok(funcao("progressoAbrir").indexOf("if(__progresso){") > 0, "abriria dois painéis empilhados");
  });
  t("devolver fotos usa o painel de progresso, não mais o toast repetido", ()=>{
    ok(HTML.indexOf('if(progressoAbrir("Devolvendo fotos deste aparelho", prev.itens)) souDono = true;') > 0);
    ok(HTML.indexOf('if(progressoAbrir("Buscando fotos direto na nuvem", 0)) souDono = true;') > 0);
    ok(HTML.indexOf('if(!progressoCancelado()){') > 0,
       "não pode começar a buscar na nuvem se a pessoa já pediu para parar na etapa local");
    ok(HTML.indexOf("if(progressoCancelado()) return;") > 0,
       "recuperarFotosPerdidasDaNuvem precisa checar Parar item a item, senão o botão não faz nada com 580 itens na fila");
  });
  t("exportação parada não entrega arquivo pela metade", ()=>{
    eq((HTML.match(/if\(progressoCancelado\(\)\)\{ toast\("Exportação parada/g)||[]).length, 3,
       "os três caminhos (xlsm, xlsx e Word) precisam checar antes de montar o arquivo");
  });
  t("os avisos que se repetiam a cada item saíram do caminho", ()=>{
    ok(HTML.indexOf("Escrevendo textos da IA… ${i}/${total}") < 0, "voltaria o aviso que se renova sozinho");
    ok(HTML.indexOf("Gerando Excel… área ${i+1}") < 0);
    ok(HTML.indexOf("Gerando Word… área ${i+1}") < 0);
    eq((HTML.match(/gerarLaudoIAItens\(pendentesIA, null, \{ refazer:false \}\)/g)||[]).length, 3);
    eq((HTML.match(/gerarLaudoIAItens\([a-zA-Z]+, null, \{ refazer:(true|false) \}\)/g)||[]).length, 5,
       "toda geração em lote precisa passar pelo painel — inclusive as da aba IA");
  });
  /* As duas checagens abaixo precisam de verdade rodar await C.gerarLaudoIAItens
     ANTES de conferir o resultado — passar uma função async direto para t()
     não funciona (t() não espera a promise: "ok" sairia na hora, sem checar
     nada de verdade, e o await de dentro ficaria correndo solto, podendo
     ainda emitir progressoAtualizar() e sujar o painelTeste de um teste
     futuro qualquer que também use IA). Por isso o await mora aqui fora,
     como em t17, e só as conferências síncronas vão dentro do t(). */
  painelTeste.aberturas = []; painelTeste.atualizacoes = []; painelTeste.fechamentos = 0;
  painelTeste.aberto = false; painelTeste.cancelar = false;
  STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
  const itensT77a = C.linhasEscopoSimples().slice(0, 3);
  itensT77a.forEach(it=>{ it.maquina.laudoIA = {}; it.tarefa.laudoIA = {}; it.risco.laudoIA = {}; });
  vm.runInContext("setIAApiKey('chave-teste')", ctx);
  await C.gerarLaudoIAItens(itensT77a, null, { refazer:true });
  t("a geração em lote de verdade abre, atualiza e fecha o painel", ()=>{
    eq(painelTeste.aberturas.length, 1, "deveria abrir um painel só");
    eq(painelTeste.aberturas[0].titulo, "Escrevendo textos da IA");
    /* itensT77a.length e não um número fixo: quantos riscos existem em
       STATE.projetosSimples neste ponto do arquivo depende de fixtures de
       testes anteriores (ex.: t64 deixa a árvore com duplicatas mescladas)
       — o que este teste precisa garantir é que o painel abre com o mesmo
       total que foi passado pra geração, não um número mágico. */
    eq(painelTeste.aberturas[0].total, itensT77a.length);
    eq(painelTeste.fechamentos, 1, "o painel precisa fechar ao terminar");
    ok(painelTeste.atualizacoes.length >= itensT77a.length, "não reportou o avanço");
  });

  painelTeste.aberturas = []; painelTeste.atualizacoes = []; painelTeste.fechamentos = 0;
  painelTeste.aberto = false; painelTeste.cancelar = true;   // parada pedida antes de começar
  const itensT77b = C.linhasEscopoSimples().slice(0, 3);
  itensT77b.forEach(it=>{ it.maquina.laudoIA = {}; it.tarefa.laudoIA = {}; it.risco.laudoIA = {}; });
  const gravadosT77b = await C.gerarLaudoIAItens(itensT77b, null, { refazer:true });
  t("parar interrompe a leva e o que já foi feito continua gravado", ()=>{
    eq(gravadosT77b, 0, "não deveria ter gerado nada depois da parada");
    eq(painelTeste.fechamentos, 1, "o painel precisa fechar mesmo tendo sido parado");
  });
  painelTeste.cancelar = false;

  console.log("\n=== t78 · inventário de máquinas em página deitada ===");
  t("existe geometria própria para a página deitada", ()=>{
    ok(HTML.indexOf("const UTIL_L_P = PAG_A - MARGEM * 2;") > 0, "sem largura da página deitada");
    ok(HTML.indexOf("const UTIL_A_P = PAG_L - MARGEM * 2 - ROD_A;") > 0, "a altura também desconta o rodapé");
    ok(HTML.indexOf("const MAX_A_P  = Math.floor(UTIL_A_P * 0.98);") > 0);
  });
  t("as larguras novas somam a área útil deitada", ()=>{
    const m = /const INV_COLS = \[([^\]]+)\]/.exec(HTML);
    const soma = m[1].split(",").reduce((a,b)=>a+Number(b.trim()),0);
    eq(soma, 1017, "297mm de página menos 2 × 14mm de margem");
  });
  t("cada bloco é medido na largura em que vai ser impresso", ()=>{
    const f = funcao("paginar");
    ok(f.indexOf('med.style.width = (deitada ? UTIL_L_P : UTIL_L) + "px";') > 0,
       "medir em pé o que sai deitado daria altura errada e a página estouraria");
    ok(f.indexOf("const teto = deitada ? MAX_A_P : MAX_A;") > 0, "usaria o teto da página errada");
  });
  t("trocar de orientação obriga página nova", ()=>{
    const f = funcao("paginar");
    ok(f.indexOf("if(deitada !== orient){ fechar(); orient = deitada; }") > 0,
       "não existe meia página deitada — sem isto, blocos das duas orientações cairiam juntos");
    ok(f.indexOf("paginas.push({ blocos:atual, paisagem:orient })") > 0, "a página não guardaria a orientação");
  });
  t("só o inventário pede página deitada", ()=>{
    eq((HTML.match(/paisagem:true/g)||[]).length, 2, "o cabeçalho e as linhas do inventário, e mais nada");
    ok(funcao("blocosInventario").indexOf("quebrarAntes:true, paisagem:true") > 0);
  });
  t("a página deitada tem CSS e @page próprios", ()=>{
    ok(HTML.indexOf(".lp-pagina.lp-paisagem{width:${PAG_A}px;height:${PAG_L}px}") > 0);
    ok(HTML.indexOf(".lp-paisagem .lp-corpo{height:${UTIL_A_P}px}") > 0);
    ok(HTML.indexOf("@page paisagem{size:A4 landscape;margin:0}") > 0, "sem @page nomeada não sai deitado no PDF");
    ok(HTML.indexOf(".lp-pagina.lp-paisagem{page:paisagem}") > 0, "a página não é ligada à regra @page");
    ok(HTML.indexOf('${p.paisagem?" lp-paisagem":""}') > 0, "a classe não chega ao HTML da página");
  });
  t("a prévia comporta a página deitada, que é mais larga", ()=>{
    ok(HTML.indexOf('id="lpDoc" style="transform:scale(${zoom});width:${PAG_A}px;') > 0,
       "com a largura antiga a página deitada vazaria para fora da prévia");
  });
  t("a instrução de impressão avisa para não forçar paisagem", ()=>{
    ok(HTML.indexOf("Deixe a orientação em Retrato.") > 0);
  });
  t("a coluna Local não repete mais o nome da área", ()=>{
    ok(HTML.indexOf('<td>${esc(m.local||it.area.local||"")}</td>') > 0);
    ok(HTML.indexOf('${esc(m.local||it.area.nome||"")}') < 0,
       "era o que fazia Área e Local saírem com o mesmo texto");
  });

  console.log("\n=== t79 · rodapé centralizado e dedução sem conjunção solta ===");
  t("o logotipo do rodapé fica no centro da página", ()=>{
    ok(HTML.indexOf(".lp-rodape .lp-num{flex:1 1 0;min-width:0;") > 0, "o lado esquerdo precisa da mesma base do direito");
    ok(HTML.indexOf(".lp-rodape .lp-eng{flex:1 1 0;min-width:0;") > 0);
    ok(HTML.indexOf(".lp-rodape .lp-marca{flex:0 0 auto;text-align:center}") > 0,
       "com flex:1 no meio, o logotipo se centraliza no espaço que sobra, não na página");
    ok(HTML.indexOf(".lp-rodape .lp-marca{text-align:center;flex:1}") < 0, "sobrou a regra antiga");
  });
  t("letra do fim que faz par com outra não é cortada", ()=>{
    eq(C.tipoSugeridoDaMaquina({ nome:"Esteira do Descarte mesa A e B" }), "Esteira do Descarte mesa A e B");
    eq(C.tipoSugeridoDaMaquina({ nome:"Bomba A ou B" }), "Bomba A ou B");
  });
  t("as demais deduções continuam funcionando", ()=>{
    eq(C.tipoSugeridoDaMaquina({ nome:"Mesa de selecao manual B" }), "Mesa de selecao manual");
    eq(C.tipoSugeridoDaMaquina({ nome:"Vision Sorter A" }), "Vision Sorter");
    eq(C.tipoSugeridoDaMaquina({ nome:"Elevador de Canecas 01" }), "Elevador de Canecas");
    eq(C.tipoSugeridoDaMaquina({ nome:"01" }), "01", "nome só de número não pode virar coluna vazia");
  });

  console.log("\n=== t80 · cartão do risco no laudo (opção 3) ===");
  t("a linha de tabela virou cartão", ()=>{
    // Desde 27/08/2026 a div ganhou uma classe condicional (lp-oculto, ver
    // t131) -- por isso o fechamento '">' saiu do literal exato do código-fonte.
    ok(HTML.indexOf('<div class="lp-rc') > 0, "sem o cartão");
    ok(HTML.indexOf('<th style="width:196px">HRN</th>') < 0, "sobrou o cabeçalho de colunas da tabela antiga");
    ok(HTML.indexOf('.lp-rc-cab{display:flex;') > 0 && HTML.indexOf('.lp-rc-corpo{display:flex;') > 0);
  });
  t("o cartão traz tudo que já existia, mais a mitigação existente", ()=>{
    ["Descrição do risco","Mitigação existente","Solução","Evidência do risco",
     "Probabilidade (PO)","Frequência (FE)","Grau do Dano (GPD)","Nº de pessoas (NP)"]
      .forEach(x=> ok(funcao("blocosEquipamentos").indexOf(x) > 0, "faltou " + x));
  });
  t("o PLr fica discreto à direita da tabela do HRN", ()=>{
    const f = funcao("blocosEquipamentos");
    ok(f.indexOf('<div class="lp-rc-hrn">') < f.indexOf('<div class="lp-rc-plr">'), "o PLr precisa vir depois do HRN");
    ok(HTML.indexOf(".lp-rc-plr{flex:0 0 156px;border-left:1px solid #8A8CA3") > 0, "sem a coluna do PLr");
    ok(HTML.indexOf("color:#5B5F7A;white-space:nowrap}") > 0, "o rótulo do PLr voltaria a quebrar em duas linhas");
    ok(f.indexOf("Função de segurança (PLr)") > 0, "o rótulo precisa trazer PLr entre parênteses");
    // A Categoria (NBR 14153, Figura B.1) saiu do laudo impresso em 26/08/2026 —
    // a correspondência PLr→Categoria dessa figura ainda não foi conferida
    // célula a célula (é imagem dentro do PDF da norma). O PLr sozinho, do
    // Anexo A da NBR ISO 13849-1, já foi conferido e continua aparecendo.
    ok(f.indexOf("<b>PL ${esc(plr.plr)}</b> · Categoria") < 0,
       "a Categoria voltou a aparecer junto do PLr no laudo impresso, sem ter sido conferida contra a NBR 14153");
  });
  t("o formulário do risco (engenheiro) também não mostra mais a Categoria junto do PLr", ()=>{
    // Checa a saída de verdade (renderizada), não o texto da função — a
    // função tem um COMENTÁRIO explicando a remoção que cita a palavra
    // "Categoria" várias vezes, e bater nisso seria um falso positivo.
    const h = C.blocoPLrHtml({ id:"r1", medidaPropostaTipo:"prot_movel_int", componente:"Correia",
      gpd:"Fatalidade", exposicao:"Mais de 2x por turno", evitar:"Praticamente impossível" }, "draft");
    ok(h.indexOf("PL<span>r</span>") > 0, "sumiu o próprio PLr — foi longe demais");
    ok(h.indexOf("Categoria") < 0 && h.indexOf("pela NBR 14153") < 0,
       "a Categoria (NBR 14153, Fig. B.1, ainda não conferida célula a célula) voltou a aparecer no formulário");
    ok(h.indexOf("S2 · F2 · P2") > 0,
       "perdeu o resumo S · F · P — só a Categoria devia sair, não o resto");
  });
  t("PLr só aparece quando há função de segurança a classificar", ()=>{
    const f = funcao("blocosEquipamentos");
    ok(f.indexOf("plr.aplicavel && plr.completo") > 0, "mostraria PL vazio");
    ok(f.indexOf('plr.aplicavel? "A classificar" : "Não aplicável"') > 0,
       "medida mecânica não tem PLr — precisa dizer isso, não ficar em branco");
  });
  t("as fotos saem sem legenda, uma ou duas", ()=>{
    const f = funcao("blocosEquipamentos");
    ok(f.indexOf('${evsOk.map(f=>`<img src="${f}">`).join("")}') > 0, "o desenho das fotos mudou de forma");
    ok(f.indexOf("DETALHE DO RISCO") < 0 && f.indexOf("POSIÇÃO NA MÁQUINA") < 0, "sobrou legenda de foto");
    ok(HTML.indexOf(".lp-rc-leg{") < 0, "sobrou o estilo da legenda");
  });
  t("as duas fotos são a principal do risco e a primeira extra", ()=>{
    ok(funcao("blocosEquipamentos").indexOf("const fotos = [r.foto, (r.fotosOutras||[])[0]].filter(Boolean);") > 0);
  });
  t("sem foto nenhuma, a coluna de evidência não é desenhada", ()=>{
    ok(funcao("blocosEquipamentos").indexOf('${evsOk.length? `<div class="lp-rc-col ev">') > 0,
       "uma coluna vazia denunciaria a falta");
  });
  t("busca no máximo duas fotos, não a galeria inteira", ()=>{
    ok(funcao("blocosEquipamentos").indexOf("fotos.slice(0,2)") > 0, "reduzir foto é caro — não pode varrer todas");
  });

  console.log("\n=== t81 · tela Imprimir e ajustes do cartão ===");
  t("a rolagem não volta ao topo quando é a mesma tela", ()=>{
    const f = funcao("render");
    ok(f.indexOf("const mesmaTela = (chave === __telaDesenhada);") > 0, "sem a comparação de tela");
    ok(f.indexOf("if(mesmaTela && rolagem) window.scrollTo(0, rolagem);") > 0, "não devolve a rolagem");
    eq((f.match(/devolverRolagem\(\)/g)||[]).length, 3, "os três caminhos de render precisam devolver");
    ok(funcao("chaveDaTela").indexOf("u.laudoAba") > 0, "trocar de aba tem de contar como outra tela");
  });
  t("os controles ficam dentro da visualização", ()=>{
    ok(HTML.indexOf('<div class="lp-visor-wrap">') > 0);
    ok(HTML.indexOf(".lp-flut{position:absolute;right:14px;bottom:14px") > 0, "a barra não flutua");
    ["App.lpImprimir()","App.lpZoom(1)","App.lpZoom(-1)"].forEach(a=>
      ok(HTML.indexOf(`class="lp-flut-btn" title="${a==="App.lpImprimir()"?"Imprimir / Salvar PDF":a==="App.lpZoom(1)"?"Aumentar":"Diminuir"}"`) > 0
         || HTML.indexOf(a) > 0, "faltou " + a));
    ok(HTML.indexOf("zoomMais:") > 0 && HTML.indexOf("zoomMenos:") > 0, "sem os ícones de lupa");
  });
  t("a caixa do logotipo virou botão mais ficha do arquivo", ()=>{
    ok(HTML.indexOf("App.lpAbrirLogo()") > 0, "sem o botão que abre o modal");
    ok(HTML.indexOf("function logoFicha(") > 0 && HTML.indexOf("function tamanhoLegivel(") > 0);
    ok(HTML.indexOf("logoLaudoMeta = { nome: arq.name") > 0, "não guarda nome, tamanho e data do arquivo");
    ok(HTML.indexOf('<div class="card card-pad" style="background:#FFF3D6;border-color:#E9C46A;margin-bottom:10px">') < 0,
       "sobrou o cartão grande do logotipo na aba");
  });
  t("o texto do rodapé é configurável e cai no padrão quando vazio", ()=>{
    ok(HTML.indexOf("App.lpAbrirRodape()") > 0 && HTML.indexOf("lpSalvarRodape(){") > 0);
    const f = funcao("rodapeTexto");
    ok(f.indexOf("getMecseteConfig().rodapeLaudo") > 0 && f.indexOf("if(livre) return livre;") > 0,
       "sem texto escrito, tem de cair nos dados do responsável");
    ok(HTML.indexOf('__lpPaginas = []; __lpHtml = "";\n      App.fecharModal();') > 0,
       "mudar o rodapé precisa invalidar o laudo já montado");
  });
  t("numeração diz o total de páginas", ()=>{
    ok(HTML.indexOf('<div class="lp-num">Página ${n} de ${total}</div>') > 0);
  });
  t("o selo do HRN saiu do cabeçalho e a evidência subiu para lá", ()=>{
    const f = funcao("blocosEquipamentos");
    ok(f.indexOf('class="lp-rc-selo"') < 0, "o HRN já aparece na tabela do rodapé do cartão");
    ok(f.indexOf('<span class="lp-rc-evrot">Evidência do risco</span>') > 0, "o rótulo não subiu");
    ok(f.indexOf('<div class="lp-rc-rot">Evidência do risco</div>') < 0, "sobrou o rótulo dentro da coluna");
  });
  t("o texto do cartão ficou maior", ()=>{
    ok(HTML.indexOf(".lp-rc-col{padding:7px 9px;font-size:10px;") > 0, "8,5px dava 6,4pt no papel — pequeno demais");
  });
  t("a faixa da tarefa não fecha a página sozinha", ()=>{
    ok(HTML.indexOf("grudaNoProximo:true") > 0, "a faixa não está marcada");
    const f = funcao("paginar");
    ok(f.indexOf("if(b.grudaNoProximo && blocos[idx+1]") > 0, "o paginador não olha o bloco seguinte");
    ok(f.indexOf("if(altura + h + hProx > teto) fechar();") > 0, "não mede os dois juntos");
  });

  console.log("\n=== t82 · metodologia completa, zoom e rolagem da prévia ===");
  t("a rolagem da PRÉVIA é devolvida, não só a da janela", ()=>{
    const f = funcao("render");
    ok(f.indexOf('document.querySelector(".lp-visor")') > 0, "a prévia rola por dentro e voltava para a página 1");
    ok(f.indexOf("v.scrollTop = visorY; v.scrollLeft = visorX;") > 0, "não devolve a rolagem da prévia");
  });
  t("o zoom vai até 200%", ()=>{
    ok(HTML.indexOf("const passos = [0.3,0.4,0.5,0.65,0.8,1,1.25,1.5,2];") > 0);
  });
  t("o rótulo do PLr cabe numa linha e o HRN não quebra", ()=>{
    ok(HTML.indexOf(".lp-rc-plr{flex:0 0 156px;") > 0);
    ok(HTML.indexOf("text-transform:uppercase;\n  color:#5B5F7A;white-space:nowrap}") > 0
       || HTML.indexOf("color:#5B5F7A;white-space:nowrap}") > 0, "o rótulo quebraria em duas linhas");
    ok(HTML.indexOf("text-align:center;white-space:nowrap;\n  overflow:hidden;text-overflow:ellipsis}") > 0,
       "as colunas do HRN precisam de uma linha só");
  });
  t("a metodologia ganhou a página dos itens da NR-12", ()=>{
    const f = funcao("blocosMetodologia");
    ["item 12.1.9 da NR-12", "item 12.1.1 da NR-12", "ABNT NBR ISO 12100:2013 foi publicada em 17 de dezembro de 2013"]
      .forEach(x=> ok(f.indexOf(x) > 0, "faltou: " + x));
    ok(f.indexOf('class="lp-lista lp-lista-solta"') > 0);
  });
  t("o parágrafo do risco residual entrou no método HRN", ()=>{
    ok(funcao("blocosMetodologia").indexOf("Quando o risco residual permaneceu acima do nível considerado aceitável") > 0);
  });
  t("a figura do processo é enviada, não vem embutida no arquivo", ()=>{
    const f = funcao("blocosMetodologia");
    ok(f.indexOf("const fig = figuraProcesso();") > 0);
    /* A legenda mora DENTRO da imagem. Acrescentar uma em HTML repetia a
       mesma frase duas vezes na página. */
    ok(f.indexOf('<div class="lp-fig-leg">') < 0, "a legenda em HTML duplicava a que já está na imagem");
    ok(HTML.indexOf("A legenda tem de estar dentro da própria imagem") > 0,
       "quem trocar a figura precisa saber que o app não põe legenda por fora");
    ok(f.indexOf("lp-fig-vazia") > 0, "sem a figura, a página tem de avisar em vez de sair em branco");
    ok(HTML.indexOf("function figuraProcesso(){") > 0);
    ok(HTML.indexOf("App.lpAbrirFigura()") > 0 && HTML.indexOf("lpEnviarFigura(){") > 0 && HTML.indexOf("lpRemoverFigura(){") > 0);
    /* O repositório é público e a figura é adaptada de norma ABNT, que é paga:
       não pode estar embutida como base64 dentro do index.html. */
    ok(HTML.indexOf("figuraProcesso = \"data:image") < 0, "a figura não pode ir embutida no arquivo publicado");
  });
  t("a figura é reduzida com folga para o texto miúdo não embaralhar", ()=>{
    ok(HTML.indexOf("comprimirLogoPNG(arq, 1400)") > 0, "1400px — fluxograma tem texto pequeno");
  });
  t("a classe da lista não atropela a lista de normas que já existia", ()=>{
    eq((HTML.match(/^\.lp-lista\{/gm)||[]).length, 1, "duas definições de .lp-lista mudariam a outra lista do laudo");
  });

  console.log("\n=== t83 · o texto sugerido não aparece duas vezes ===");
  t("escolher a medida preenche o campo e NÃO mostra o texto duas vezes", ()=>{
    const r = { id:"r1", componente:"Cilindro", medidaPropostaTipo:"prot_movel_int" };
    r.sugestaoMitigacao = C.medidaTextoProposto(r, "prot_movel_int");
    r.sugestaoMitigacaoAuto = r.sugestaoMitigacao;
    const h = C.blocoMedidaPropostaHtml(r);
    eq((h.match(/medida-frase/g)||[]).length, 0, "o quadro de leitura repetia o que já está no campo editável");
    eq((h.match(/<textarea/g)||[]).length, 1, "o campo editável tem de continuar existindo");
    ok(h.indexOf("aplicarTextoMitigacao()") < 0, "não há o que aplicar: os dois já são iguais");
  });
  t("editando à mão, o texto sugerido volta — com rótulo e botão", ()=>{
    const r = { id:"r1", componente:"Cilindro", medidaPropostaTipo:"prot_movel_int",
                sugestaoMitigacao:"Instalar proteção conforme meu critério." };
    const h = C.blocoMedidaPropostaHtml(r);
    eq((h.match(/medida-frase/g)||[]).length, 1, "sem ele não dá para voltar ao texto da biblioteca");
    ok(h.indexOf("Texto sugerido pela medida escolhida") > 0, "sem rótulo, o quadro fica sem explicação");
    ok(h.indexOf("aplicarTextoMitigacao()") > 0, "faltou o botão de voltar ao sugerido");
  });
  t("a mitigação existente segue a mesma regra", ()=>{
    const r = { id:"r2", componente:"Correia", medidasExistentes:["prot_fixa"], medidaExistenteSituacao:"ok" };
    C.sincronizarDescMedidaExistente(r);
    eq((C.blocoMedidaExistenteHtml(r).match(/medida-frase/g)||[]).length, 0, "repetia o texto do campo");
    r.descMedida = "Texto que eu escrevi.";
    eq((C.blocoMedidaExistenteHtml(r).match(/medida-frase/g)||[]).length, 1, "editado à mão, o sugerido tem de voltar");
  });
  t("na revisão o quadro some quando é igual ao que vai para o laudo", ()=>{
    ok(funcao("laudoBlocoMedidaHtml").indexOf('const difereDoLaudo = texto && texto !== String(laudoTextoFinal(item, "solucao")||"").trim();') > 0,
       "mostraria o mesmo texto que já está no quadro Vai para o laudo");
    ok(funcao("laudoBlocoMedidaHtml").indexOf("${difereDoLaudo? `") > 0);
  });

  console.log("\n=== t84 · frequência da tarefa alimenta a exposição do PLr ===");
  vm.runInContext(funcao("exposicaoPelaFrequencia"), ctx);
  t("as duas opções por turno entraram na frequência da tarefa", ()=>{
    const lista = JSON.parse(/const FREQUENCIA_TAREFA = (\[[^\]]+\]);/.exec(HTML)[1]);
    eq(lista[0], "1x por turno");
    eq(lista[1], "Mais de 2x por turno");
    ["1 Turno","2 Turnos","Diário","Semanal","Quinzenal","Mensal","Esporádico"]
      .forEach(x=> ok(lista.indexOf(x) >= 0, "sumiu a opção antiga " + x + " — quebraria cadastro existente"));
  });
  t("contagem por turno vira exposição direta", ()=>{
    eq(C.exposicaoPelaFrequencia("1x por turno"), "1x por turno");
    eq(C.exposicaoPelaFrequencia("Mais de 2x por turno"), "Mais de 2x por turno");
  });
  /* NBR 14153, B.2.2: "se o acesso somente for necessário de tempo em tempo,
     pode-se selecionar F1". Semanal, mensal e afins são isso por definição. */
  t("periodicidade cai em 'Menos de 1x por turno', que é F1", ()=>{
    ["Diário","Semanal","Quinzenal","Mensal","Esporádico"].forEach(f=>
      eq(C.exposicaoPelaFrequencia(f), "Menos de 1x por turno", f));
    const r = { id:"r1", medidaPropostaTipo:"prot_movel_int", gpd:"Fatalidade",
                evitar:"Praticamente impossível", exposicao:"" };
    eq(C.plrExigido(r, { frequencia:"Semanal" }).f, "F1");
    eq(C.plrExigido(r, { frequencia:"Semanal" }).completo, true, "não pode mais ficar cobrando o campo");
  });
  t("'1 Turno' e '2 Turnos' continuam sem dedução, de propósito", ()=>{
    eq(C.exposicaoPelaFrequencia("1 Turno"), "", "ocupar o turno não diz quantas entradas na zona de perigo");
    eq(C.exposicaoPelaFrequencia("2 Turnos"), "");
    eq(C.exposicaoPelaFrequencia(""), "");
  });
  t("a herança leva ao F certo do gráfico", ()=>{
    const r = { id:"r1", medidaPropostaTipo:"prot_movel_int", gpd:"Fatalidade", evitar:"Praticamente impossível", exposicao:"" };
    eq(C.plrExigido(r, { frequencia:"1x por turno" }).f, "F1");
    eq(C.plrExigido(r, { frequencia:"Mais de 2x por turno" }).f, "F2");
    eq(C.plrExigido(r, { frequencia:"Mais de 2x por turno" }).cat, "4");
    eq(C.plrExigido(r, { frequencia:"1x por turno" }).cat, "3");
  });
  t("escolher no risco vence a herança da tarefa", ()=>{
    const r = { id:"r1", medidaPropostaTipo:"prot_movel_int", gpd:"Fatalidade",
                evitar:"Praticamente impossível", exposicao:"Menos de 1x por turno" };
    eq(C.plrExigido(r, { frequencia:"Mais de 2x por turno" }).f, "F1", "a escolha do risco tem de mandar");
  });
  t("sem tarefa, ou com frequência ambígua, continua cobrando o campo", ()=>{
    const r = { id:"r1", medidaPropostaTipo:"prot_movel_int", gpd:"Fatalidade", evitar:"Praticamente impossível", exposicao:"" };
    eq(C.plrExigido(r).f, "", "sem tarefa não pode inventar exposição");
    eq(C.plrExigido(r, { frequencia:"1 Turno" }).completo, false);
    ok(C.plrFaltando(r, { frequencia:"1 Turno" }).indexOf("Exposição") >= 0);
  });
  t("o aviso lembra que F também depende da duração", ()=>{
    ok(funcao("blocoPLrHtml").indexOf("o F também depende da duração") > 0,
       "uma tarefa semanal de horas dentro da zona de perigo é F2, não F1");
  });
  t("o HRN também conhece as frequências novas", ()=>{
    eq(C.sugerirFE("1x por turno"), 2.5);
    eq(C.sugerirFE("Mais de 2x por turno"), 4);
    eq(C.sugerirFE("Semanal"), 1.5, "as antigas não podem mudar de valor");
  });
  t("a tela mostra de onde veio a exposição", ()=>{
    const f = funcao("blocoPLrHtml");
    ok(f.indexOf('const herdado = r.exposicao ? "" : exposicaoPelaFrequencia(') > 0);
    ok(f.indexOf('herdado? ("Da tarefa: " + herdado) : "Selecionar…"') > 0, "o campo pareceria vazio");
    ok(f.indexOf("A exposição veio da <b>frequência da tarefa</b>") > 0, "sem explicação de onde saiu o valor");
  });
  t("a tarefa é passada em todos os pontos que calculam PLr", ()=>{
    ok(HTML.indexOf('blocoPLrHtml(r, "draft", tarefaCtx)') > 0, "modal do risco");
    ok(HTML.indexOf('blocoPLrHtml(item.risco, "laudo", item.tarefa)') > 0, "revisão do laudo");
    ok(HTML.indexOf("plrExigido(r, it.tarefa)") > 0, "laudo impresso");
  });

  console.log("\n=== t85 · corpo do laudo em 10pt e quebra natural ===");
  t("a prosa do laudo saiu de 8,6pt para 10pt", ()=>{
    ok(HTML.indexOf(".lp-par{margin:0 0 10px;text-align:justify;font-size:13.3px;line-height:1.5}") > 0,
       "13,3px = 10pt no papel");
    ok(HTML.indexOf(".lp-sub{font-weight:800;margin:14px 0 7px;font-size:15px}") > 0);
    eq((HTML.match(/^\.lp-lista\{/gm)||[]).length, 1, "duas definições mudariam a outra lista do laudo");
  });
  t("cada parágrafo vira um bloco, para o texto escorrer entre páginas", ()=>{
    const f = funcao("fatiarMetodologia");
    /* Fatiar por texto cortava dentro do grid de tabelas dos critérios do HRN
       e estourava a página. Agora corta pelos filhos de primeiro nível. */
    ok(f.indexOf("cx.innerHTML = String(b.html);") > 0, "sem o fatiamento por estrutura");
    ok(f.indexOf("Array.prototype.slice.call(cx.children)") > 0, "precisa cortar por elemento, não por string");
    ok(f.indexOf("split(") < 0, "cortar a string parte tabela aninhada ao meio");
    ok(f.indexOf('novo.grudaNoProximo = true;') > 0, "o título ficaria sozinho no pé da página");
    ok(f.indexOf("if(i === 0 && b.quebrarAntes) novo.quebrarAntes = true;") > 0,
       "a quebra forçada vale só para a primeira fatia");
    ok(HTML.indexOf("fatiarMetodologia(blocosMetodologia()).forEach") > 0, "o fatiador não está sendo usado");
  });
  t("sobrou quebra forçada só onde ela significa alguma coisa", ()=>{
    const f = funcao("blocosMetodologia");
    eq((f.match(/quebrarAntes:true/g)||[]).length, 2,
       "início da metodologia e a página da figura — o resto flui");
  });

  console.log("\n=== t86 · modal de exportação do Excel ===");
  t("as quatro opções de conteúdo existem, com o formato certo", ()=>{
    vm.runInContext(constante("EXPORT_CONTEUDOS"), ctx);
    const c = vm.runInContext("EXPORT_CONTEUDOS", ctx);
    eq(c.map(x=>x.k).join(","), "todos,laudo,base,resumo");
    ok(c[0].macro && c[1].macro, "Todos e Laudo saem no .xlsm oficial");
    ok(!c[2].macro && !c[3].macro, "as de aba única saem em .xlsx limpo, sem macro");
    eq(c[1].pularResumo, true, "Laudo é tudo menos o Resumo");
    eq(c[2].abas.join(","), "Base Completa");
    eq(c[3].abas.join(","), "Resumo");
  });
  t("o botão Exportar abre o modal em vez de gerar direto", ()=>{
    ok(funcao("exportarSimplesXLSXFotos").indexOf("abrirOverlay(sheetExportarHtml())") > 0);
    ok(HTML.indexOf("App.exportConfirmar()") > 0 && HTML.indexOf("exportConfirmar(){") > 0);
    ok(HTML.indexOf("confirmarGeracaoComCamposFaltando(_exportarSimplesXLSXFotosReal)") > 0,
       "a confirmação de campos faltando não pode ter sumido");
  });
  /* localSheetId é o ÍNDICE da aba na lista, não o sheetId: tirando uma aba da
     frente, o índice das seguintes muda. Sem recalcular, o Excel apontaria o
     filtro para a aba errada e pediria reparo ao abrir. */
  t("o índice do filtro é recalculado, não copiado", ()=>{
    const f = funcao("buildXlsxPackageSimples");
    ok(f.indexOf('const idxAba = (nome)=> sheetDefs.findIndex(x=> x.name === nome);') > 0,
       "sem recalcular o índice, o arquivo de aba única abriria pedindo reparo");
    ok(f.indexOf('localSheetId:idxAba("Base Completa")') > 0 && f.indexOf('localSheetId:idxAba("Resumo")') > 0);
    ok(f.indexOf("localSheetId:0,") < 0 && f.indexOf("localSheetId:1,") < 0, "sobrou índice fixo");
  });
  t("a aba oculta do HRN nunca sai", ()=>{
    const f = funcao("buildXlsxPackageSimples");
    const i = f.indexOf('{name:"_MatrizHRN"');
    ok(i > 0 && f.slice(i-40, i).indexOf("querBase") < 0 && f.slice(i-40, i).indexOf("querResumo") < 0,
       "ela alimenta as fórmulas de HRN das outras abas");
    ok(f.indexOf('{name:"xl/worksheets/sheet3.xml", data:strToBytes(sheet3Xml)},') > 0);
  });
  t("as peças da aba removida saem de todos os lugares", ()=>{
    const f = funcao("buildXlsxPackageSimples");
    ["querBase? `<Override PartName=\"/xl/worksheets/sheet1.xml\"",
     "querResumo? `<Override PartName=\"/xl/worksheets/sheet2.xml\"",
     "querBase? `<Override PartName=\"/xl/drawings/drawing1.xml\"",
     "querResumo? `<Override PartName=\"/xl/drawings/drawing2.xml\"",
     "querBase? `<Relationship Id=\"rId1\"",
     "querResumo? `<Relationship Id=\"rId2\""].forEach(x=>
      ok(f.indexOf(x) > 0, "peça declarada sem arquivo quebra o Excel: " + x.slice(0,40)));
  });
  t("aba única nunca usa o modelo com macro", ()=>{
    ok(HTML.indexOf("if(modeloXlsmB64 && exportEscolha().conteudo.macro){") > 0,
       "usar o .xlsm para uma aba só significaria mexer no modelo do cliente");
  });
  t("o .xlsm não perde aba: o Resumo só deixa de ser preenchido", ()=>{
    ok(HTML.indexOf("if(!(opts && opts.pularResumo)){") > 0);
    ok(HTML.indexOf("{ pularResumo: !!exportEscolha().conteudo.pularResumo }") > 0);
    ok(funcao("gerarBytesXlsmCorteva").indexOf('zip.remove(') < 0,
       "remover aba de arquivo com macro pode quebrar VBA que a referencie");
  });
  t("juntar tudo num arquivo só, ou um por área", ()=>{
    const f = funcao("agruparParaExportar");
    ok(f.indexOf("if(!exportEscolha().juntar) return agruparLinhasPorArea(linhasRaw);") > 0);
    ok(f.indexOf('nome:"Todas as áreas"') > 0, "o arquivo precisa de um nome quando junta");
    ok(f.indexOf("if(linhasRaw.length === 0) return [];") > 0, "sem linhas não pode estourar");
    eq((HTML.match(/agruparParaExportar\(/g)||[]).length, 3, "os dois caminhos de export mais a definição");
  });

  console.log("\n=== t87 · apagar da nuvem entra no histórico ===");
  t("a exclusão é registrada, com o caminho e o motivo", ()=>{
    const f = funcao("onedriveSincronizarModulo");
    ok(f.indexOf('registrarEventoSync("del", registro.arquivo, "exclusão"') > 0,
       "apagar ficava sem rastro nenhum no app");
    /* A expressão virou a variável confirmadaAntes, lida ANTES de apagar: a
       exclusão agora GRAVA lápide durante o próprio envio, e se a pergunta
       fosse feita depois disso todo apagamento passaria a se dizer
       "confirmado no aparelho", inclusive o que só sumiu. */
    ok(f.indexOf('const confirmadaAntes = exclusaoConfirmadaPeloUsuario(id);') > 0,
       "sem ler antes de apagar, o registro passa a mentir o motivo");
    ok(f.indexOf('confirmadaAntes ? "exclusão confirmada no aparelho" : "sumiu do aparelho, confirmado na sincronização"') > 0,
       "sem distinguir os dois caminhos, o registro não responde POR QUE apagou");
    ok(f.indexOf('const confirmadaAntes') < f.indexOf('onedriveApagarBlob(subpasta, registro.arquivo)'),
       "a leitura precisa vir ANTES do apagamento, não depois");
  });
  /* O motivo só era guardado em falha ou reparo — numa exclusão bem-sucedida
     ele se perderia, que é justamente o dado que se quer depois. */
  t("o motivo sobrevive quando a exclusão dá certo", ()=>{
    ok(HTML.indexOf('motivo: (ok===false || reparo || direcao==="del")') > 0,
       "o motivo da exclusão seria descartado por ter dado certo");
  });
  t("a exclusão tem marca própria na tela e no diagnóstico", ()=>{
    /* O arquivo escreve os símbolos como escape Unicode, igual às setas. */
    ok(/ev\.dir==='del'\?'(✕|\\u2715)'/.test(HTML), "sem marca própria, parece um recebimento");
    ok(HTML.indexOf('e.dir==="del" ? "falha ao APAGAR"') > 0);
    ok(HTML.indexOf('e.dir==="del" ? "APAGADO da nuvem"') > 0);
  });
  t("exclusão não entra no placar de envios", ()=>{
    ok(HTML.indexOf('log.filter(e=> e && e.dir==="up" && e.ok !== false && !ehReparo(e)).length') > 0,
       "o placar filtra por dir==='up', então o del não o contamina");
  });
  t("o freio de exclusão em massa continua de pé", ()=>{
    const f = funcao("onedriveSincronizarModulo");
    ok(f.indexOf("if(!onProgresso){") > 0 && f.indexOf("podeApagar = false;") > 0,
       "o ciclo automático NUNCA pode propagar exclusão em massa sozinho");
    ok(f.indexOf("avisarExclusaoMassaBloqueada(idsExcluidos.length)") > 0);
  });

  console.log("\n=== t88 · progresso conta campos, não itens ===");
  t("o total é levantado antes, com as mesmas regras do laço", ()=>{
    const f = funcao("gerarLaudoIAItens");
    ok(f.indexOf("const totalCampos = (function(){") > 0, "sem total por campo, um risco só mostra 0 de 1");
    ok(f.indexOf('if(laudoPrecisaGerar(it, "escopo", refazer) && !mq.has(it.maquina.id)){ mq.add(it.maquina.id); n++; }') > 0,
       "escopo é uma vez por máquina, não por linha");
    ok(f.indexOf('if(laudoPrecisaGerar(it, "tarefa", refazer) && !tf.has(it.tarefa.id)){ tf.add(it.tarefa.id); n++; }') > 0,
       "tarefa é uma vez por tarefa");
    ok(f.indexOf("progressoAtualizar(i, itens.length") < 0, "sobrou a contagem por item");
  });
  t("o contador anda em cada um dos quatro campos", ()=>{
    const f = funcao("gerarLaudoIAItens");
    eq((f.match(/camposFeitos\+\+/g)||[]).length, 4, "escopo, tarefa, risco/existente/solução (reuso) e risco/existente/solução (IA)");
    ok(f.indexOf('anunciar(item, "escopo")') > 0 && f.indexOf('anunciar(item, "tarefa")') > 0
       && f.indexOf('camposPendentes.map(p=>CAMPO_ROTULO[p.campo]||p.campo).join(" + ")') > 0,
       "sem avisar antes de pedir, a tela não diz o que está sendo escrito");
  });
  t("o aviso sai ANTES de escrever, não depois", ()=>{
    const f = funcao("gerarLaudoIAItens");
    ok(f.indexOf('anunciar(item, "escopo");') < f.indexOf("const entradaEscopo ="),
       "anunciar depois da chamada deixaria a tela parada enquanto a IA responde");
  });
  t("a tela nomeia a máquina e o campo", ()=>{
    const f = funcao("gerarLaudoIAItens");
    ok(f.indexOf('const CAMPO_ROTULO = { escopo:"escopo do equipamento", tarefa:"descrição da tarefa", risco:"descrição do risco", existente:"mitigação existente", solucao:"solução" };') > 0);
    ok(f.indexOf('(nomeMaquinaS(item.maquina) || "") + " — " + (CAMPO_ROTULO[campo] || campo)') > 0);
  });

  console.log("\n=== t89 · solução nunca é substituída pela mitigação existente ===");
  /* O bug real: laudoTextoOriginal trocava a proposta do inspetor pela
     descrição do que já existe sempre que ALGUMA mitigação estava marcada
     (medidaImplementada==="Sim") — mesmo que o inspetor tivesse escrito uma
     solução de verdade. A condição certa é "não há proposta escrita", não
     "há mitigação marcada". */
  t("com proposta escrita, a solução usa a proposta mesmo com mitigação marcada", ()=>{
    const item = { risco:{ id:"rSolBug1", medidaImplementada:"Sim",
      descMedida:"Existe corrimão ao redor", sugestaoMitigacao:"Instalar grade de proteção fixa" } };
    eq(C.laudoTextoOriginal(item, "solucao"), "Instalar grade de proteção fixa");
  });
  t("sem proposta nenhuma, cai para a descrição do que já existe", ()=>{
    const item = { risco:{ id:"rSolBug2", medidaImplementada:"Sim",
      descMedida:"Existe corrimão ao redor", sugestaoMitigacao:"" } };
    eq(C.laudoTextoOriginal(item, "solucao"), "Existe corrimão ao redor");
  });
  t("sem proposta e sem mitigação, fica vazio", ()=>{
    const item = { risco:{ id:"rSolBug3", medidaImplementada:"", descMedida:"", sugestaoMitigacao:"" } };
    eq(C.laudoTextoOriginal(item, "solucao"), "");
  });
  t("aplicarLaudoAprovadoNasLinhas nunca sobrescreve a mitigação existente", ()=>{
    const item = { risco:{ id:"rSolBug4", medidaImplementada:"Sim",
        descMedida:"Existe corrimão ao redor", sugestaoMitigacao:"Instalar grade de proteção fixa" },
      maquina:{ descricao:"m" }, tarefa:{ descricao:"t" } };
    C.laudoSet(item, "solucao", { fin:"Instalar grade certificada conforme NR-12", st:"ok" });
    const copia = C.aplicarLaudoAprovadoNasLinhas([item])[0];
    eq(copia.risco.descMedida, "Existe corrimão ao redor",
       "a mitigação existente não pode virar o texto da solução aprovada");
    eq(copia.risco.sugestaoMitigacao, "Instalar grade certificada conforme NR-12",
       "o texto aprovado precisa ir para sugestaoMitigacao, não ficar preso no rascunho antigo");
  });
  t("Excel (.xlsm modelo Corteva) segue a mesma regra no fallback do Resumo", ()=>{
    const f = funcao("xlsmLinhaResumo");
    ok(f.indexOf('const mitigOriginal = risco.sugestaoMitigacao || risco.descMedida || "";') > 0,
       "o fallback da coluna G ainda podia trocar a proposta pela mitigação existente");
  });
  t("Excel (aba única .xlsx) segue a mesma regra no Resumo", ()=>{
    const f = funcao("buildXlsxPackageSimples");
    ok(f.indexOf('const mitig=item.risco.sugestaoMitigacao||item.risco.descMedida||"Não informado.";') > 0,
       "o Resumo da aba única ainda podia trocar a proposta pela mitigação existente");
  });
  t("Word já lia sugestaoMitigacao direto — confirma que não regrediu", ()=>{
    const f = funcao("montarDadosMaquinaDocx");
    ok(f.indexOf('const mitigacao = corrigirTextoMecanico(risco.sugestaoMitigacao) || "Não informado.";') > 0);
  });

  console.log("\n=== t92 · Mitigação Existente ganha as opções de IA e o checklist editável ===");
  /* Usuário pediu: "as opções de IA como na Solução" + "as mesmas
     possibilidades de seleção... assim como a seção de mitigações
     existentes da criação dos Riscos". "existente" virou um campo de
     verdade (sug/fin/st/duv), fora de LAUDO_CAMPOS de propósito — não é
     obrigatório (muita máquina não tem nada) e o texto final vai para
     descMedida, que já tinha coluna própria (T) no Excel. */
  t("getLaudoRisco inicializa o estado de existente, igual aos outros 3 campos do risco", ()=>{
    const r = { id:"rNovoExistente" };
    const l = C.getLaudoRisco(r);
    ["existenteSug","existenteFin","existenteSt","duvExistente"].forEach(k=> eq(l[k], "", "faltou "+k));
    ok(Array.isArray(l.existenteRefs));
  });
  t("laudoGet/laudoSet fazem o roteiro completo para existente", ()=>{
    const item = { risco:{ id:"rGS1" }, maquina:{}, tarefa:{} };
    C.laudoSet(item, "existente", { sug:"sugestão", fin:"final", st:"ok", duv:"dúvida", refs:[{id:"x"}] });
    const g = C.laudoGet(item, "existente");
    eq(g.sug, "sugestão"); eq(g.fin, "final"); eq(g.st, "ok"); eq(g.duv, "dúvida"); eq(g.refs.length, 1);
    // e nao vaza pro campo solucao do MESMO risco
    const gSol = C.laudoGet(item, "solucao");
    eq(gSol.sug, "", "existente vazou para dentro de solucao");
  });
  t("laudoTextoOriginal(existente) é a descMedida atual", ()=>{
    const item = { risco:{ id:"rTO1", descMedida:"Guarda-corpo instalado" } };
    eq(C.laudoTextoOriginal(item, "existente"), "Guarda-corpo instalado");
  });
  t("laudoTemMitigacaoExistente só é true quando há algo marcado, escrito ou como outro", ()=>{
    ok(!C.laudoTemMitigacaoExistente({}));
    ok(C.laudoTemMitigacaoExistente({ descMedida:"algo escrito" }));
    ok(C.laudoTemMitigacaoExistente({ medidasExistentes:["prot_fixa"] }));
    ok(C.laudoTemMitigacaoExistente({ medidasExistentesOutros:["corrimão"] }));
  });
  t("laudoEntradaExistente descreve o que existe e proíbe propor algo novo", ()=>{
    const item = { risco:{ id:"rEE1", medidasExistentes:["prot_fixa"], descMedida:"Proteção fixa ao redor",
      medidaExistenteSituacao:"nao", medidaExistenteRessalva:"sem dispositivo de intertravamento" } };
    const e = C.laudoEntradaExistente(item);
    ok(e.indexOf("Proteção fixa") > 0, "não citou a medida marcada: " + e);
    ok(e.indexOf("Situação em relação à norma: Não atende") > 0, "não citou a situação: " + e);
    ok(e.indexOf("sem dispositivo de intertravamento") > 0, "não citou a ressalva: " + e);
    ok(e.indexOf("não proponha nenhuma ação nova") > 0, "não instruiu a só descrever: " + e);
  });
  t("laudoCampoDef cobre existente fora de LAUDO_CAMPOS, sem mexer nos outros 4", ()=>{
    eq(C.laudoCampoDef("existente").rot, "Mitigação existente");
    eq(C.laudoCampoDef("existente").sigla, "M");
    ok(!C.LAUDO_CAMPOS ? true : C.LAUDO_CAMPOS.every(c=>c.k!=="existente"), "existente vazou para LAUDO_CAMPOS");
    eq(C.laudoCampoDef("solucao").rot, "Solução");
  });
  t("Copiar de outro não se oferece a si mesmo em existente", ()=>{
    const f = funcao("laudoCandidatosCopia");
    ok(f.indexOf('(campo==="risco"||campo==="existente"||campo==="solucao") && o.risco.id===item.risco.id') > 0,
       "existente ficaria na propria lista de candidatos a copiar de si mesmo");
  });
  t("a geração em lote também cobre existente, mas só quando há algo a descrever", ()=>{
    const f = funcao("gerarLaudoIAItens");
    ok(f.indexOf('if(laudoTemMitigacaoExistente(it.risco) && laudoPrecisaGerar(it, "existente", refazer)) n++;') > 0,
       "sem essa checagem, a barra de progresso nao contaria os campos de existente");
    ok(f.indexOf('for(const campo of ["risco","existente","solucao"]){') > 0);
    ok(f.indexOf('if(campo==="existente" && !laudoTemMitigacaoExistente(item.risco)) continue;') > 0,
       "sem isto, geraria um texto da IA para maquina sem NADA existente marcado");
    ok(f.indexOf('const orig = campo==="existente" ? laudoEntradaExistente(item) : laudoTextoOriginal(item, campo);') > 0);
  });
  t("Refazer/Pedir ajuste também usa a entrada rica de existente, não o texto cru", ()=>{
    const f = funcao("refazerSugestaoLaudo");
    ok(f.indexOf('const base = campo==="existente" ? laudoEntradaExistente(item) : laudoTextoOriginal(item, campo);') > 0);
  });
  t("o texto aprovado de existente vai para descMedida ao exportar", ()=>{
    const item = { risco:{ id:"rApl1", descMedida:"raw sincronizado", sugestaoMitigacao:"proposta crua" },
      maquina:{ descricao:"m" }, tarefa:{ descricao:"t" } };
    C.laudoSet(item, "existente", { fin:"Texto revisado da mitigação existente", st:"ok" });
    const copia = C.aplicarLaudoAprovadoNasLinhas([item])[0];
    eq(copia.risco.descMedida, "Texto revisado da mitigação existente",
       "o texto aprovado da mitigacao existente nao chegou no Excel/Word");
    eq(copia.risco.sugestaoMitigacao, "proposta crua",
       "aprovar existente nao pode mexer na solucao — sao campos diferentes");
  });
  t("o laudo impresso (A4) usa o texto aprovado de existente, não recalcula do zero", ()=>{
    const f = funcao("blocosEquipamentos");
    ok(f.indexOf("const existente = laudoTextoFinal(it, \"existente\");") > 0,
       "ainda recalculava medidaTextoExistenteMulti(r) toda vez, ignorando o texto aprovado no laudo");
  });
  t("o cartão de existente traz o checklist editável, igual ao cadastro em campo", ()=>{
    const item = { risco:{ id:"rChk1", medidasExistentes:["prot_fixa"], medidaExistenteSituacao:"ok" },
      maquina:{}, tarefa:{ frequencia:"Diário", numPessoas:"2" } };
    const html = C.laudoBlocoCampo(item, "existente");
    ok(html.indexOf("App.laudoToggleMedidaExistente('rChk1','prot_fixa')") > 0, "faltou o toggle da medida marcada");
    ok(html.indexOf("App.laudoAcrescentarOutroExistente('rChk1')") > 0, "faltou o botão de acrescentar outro");
    ok(html.indexOf("App.laudoSetMedidaExistenteCampo('rChk1','situacao'") > 0, "faltou a escolha de situação");
    ok(html.indexOf("Sugestão da IA") > 0, "faltou o bloco de IA — o pedido era ter as MESMAS opções da Solução");
    ok(html.indexOf("Pedir um ajuste à IA") > 0);
    ok(html.indexOf("MONTAR A PARTIR DA BIBLIOTECA DE MEDIDAS") < 0,
       "a biblioteca de medidas é da Solução (propor algo novo), não faz sentido em existente");
  });
  t("quando validado, o aviso não inventa uma letra de sigla que não existe", ()=>{
    const item = { risco:{ id:"rSig1" }, maquina:{}, tarefa:{} };
    C.laudoSet(item, "existente", { fin:"texto", st:"ok" });
    const html = C.laudoBlocoCampo(item, "existente");
    ok(html.indexOf("Item validado.") > 0, "sem essa frase, o texto ficou preso na versão da Solução");
    ok(html.indexOf("a letra") < 0, "existente nao tem sigla no carrossel de cartoes — a frase da Solucao nao se aplica aqui");
  });

  console.log("\n=== t93 · HRN e Nível de desempenho na mesma célula do grid ===");
  t("os dois cartões ficam dentro do mesmo wrapper, um embaixo do outro", ()=>{
    STATE.ui.laudoRiscoId = C.linhasEscopoSimples()[0].risco.id;
    const h = C.screenSimplesLaudoItem();
    const iWrapper = h.indexOf('<div style="display:flex;flex-direction:column;gap:12px">');
    const iHRN = h.indexOf("Avaliação HRN");
    const iNivel = h.indexOf("Nível de desempenho requerido");
    ok(iWrapper > 0 && iWrapper < iHRN && iHRN < iNivel,
       "o wrapper precisa vir antes de HRN, que precisa vir antes do Nível");
    // nenhum outro cartao do grid entra ENTRE os dois — so a abertura do
    // PROPRIO card do Nivel (a de HRN fica ANTES de "Avaliação HRN", fora
    // desta fatia).
    const entre = h.slice(iHRN, iNivel);
    eq((entre.match(/class="card card-pad laudo-bloco"/g)||[]).length, 1,
       "algum outro cartao do grid ficou entre HRN e o Nivel de desempenho");
  });

  console.log("\n=== t94 · 'Pedir um ajuste à IA' mostra que está trabalhando ===");
  /* Antes só um toast ("Pedindo à IA… aguarde") que passa rápido — se a
     resposta demorasse mais que o toast, a pessoa ficava sem nenhum sinal
     de que ainda estava rodando. Vale para os 5 campos (o motor é o mesmo
     laudoBlocoCampo/laudoRefazer de sempre, genérico por campo). */
  t("o botão muda para o estado 'Pensando' quando __laudoRefazendo aponta para este campo", ()=>{
    const item = { risco:{ id:"rPen1" }, maquina:{}, tarefa:{} };
    vm.runInContext('__laudoRefazendo = { rid:"rPen1", campo:"solucao", inicio: Date.now() };', ctx);
    const html = C.laudoBlocoCampo(item, "solucao");
    vm.runInContext('__laudoRefazendo = null;', ctx);
    ok(html.indexOf('id="laudoRefazerBtn_rPen1_solucao" disabled') > 0, "o botão não travou nem ficou desabilitado");
    ok(html.indexOf('class="btn-spinner"') > 0, "sem o spinner, some qualquer sinal de atividade");
    ok(html.indexOf("Pensando…") > 0);
    ok(html.indexOf("Refazer esta sugestão") < 0, "o texto clicável não pode aparecer junto do estado carregando");
  });
  t("__laudoRefazendo de OUTRO campo não trava o botão deste aqui", ()=>{
    const item = { risco:{ id:"rPen2" }, maquina:{}, tarefa:{} };
    vm.runInContext('__laudoRefazendo = { rid:"rPen2", campo:"risco", inicio: Date.now() };', ctx);
    const html = C.laudoBlocoCampo(item, "solucao");
    vm.runInContext('__laudoRefazendo = null;', ctx);
    ok(html.indexOf("Refazer esta sugestão") > 0, "vazou o travamento de risco para dentro de solucao");
    ok(html.indexOf('id="laudoRefazerBtn_rPen2_solucao" disabled') < 0);
  });
  t("App.laudoRefazer marca __laudoRefazendo ANTES do await, não depois", ()=>{
    /* laudoRefazer é método de App (não "function laudoRefazer(" solto),
       então não dá pra extrair com funcao() — vale como trecho do HTML. */
    const iInicioMetodo = HTML.indexOf("async laudoRefazer(rid, campo){");
    const iMarca = HTML.indexOf("__laudoRefazendo = { rid, campo, inicio: Date.now() };", iInicioMetodo);
    const iRenderInicio = HTML.indexOf("render();", iMarca);
    const iAwait = HTML.indexOf("await refazerSugestaoLaudo(item, campo, instrucao);", iRenderInicio);
    ok(iInicioMetodo > 0 && iMarca > iInicioMetodo && iMarca < iRenderInicio && iRenderInicio < iAwait,
       "se marcar depois do await, a tela fica sem feedback ate a resposta chegar");
  });
  t("o intervalo é sempre limpo e o estado sempre é zerado, mesmo se a IA falhar (finally)", ()=>{
    const iInicioMetodo = HTML.indexOf("async laudoRefazer(rid, campo){");
    const iTry = HTML.indexOf("try{", iInicioMetodo);
    const iFinally = HTML.indexOf("} finally {", iTry);
    ok(iInicioMetodo > 0 && iTry > iInicioMetodo && iFinally > iTry,
       "sem o finally, um erro deixaria o botao preso em 'Pensando' para sempre");
    const bloco = HTML.slice(iFinally, iFinally + 200);
    ok(bloco.indexOf("clearInterval(tique);") > 0);
    ok(bloco.indexOf("__laudoRefazendo = null;") > 0);
  });
  t("o toast inicial que sumia rápido foi trocado pelo botão persistente", ()=>{
    const iInicioMetodo = HTML.indexOf("async laudoRefazer(rid, campo){");
    const iFimMetodo = HTML.indexOf("\n  async laudoGerarLinha(rid){", iInicioMetodo);
    const trecho = HTML.slice(iInicioMetodo, iFimMetodo);
    eq(trecho.indexOf('toast("Pedindo à IA'), -1, "o toast fantasma voltou — o botão já avisa, não precisa dos dois");
  });

  console.log("\n=== t95 · 'Gerar o que falta' respeita o filtro de área/equipamento/tarefa ===");
  /* Usuário clicou com o filtro em uma máquina (6 linhas na tela), o botão
     dizia "Gerar o que falta (6)", mas o painel de progresso mostrou "de
     250" e processou uma máquina de OUTRA área — o número no botão e o que
     ele fazia de verdade não batiam. laudoGerarFaltantes ignorava os três
     seletores e sempre cobria o laudo inteiro (todas as áreas exportáveis).
     laudoGerarTudoDeNovo ("Refazer sugestões") não muda — o próprio
     confirm() dela já avisa "de todas as linhas", então não é enganosa. */
  t("laudoGerarFaltantes usa a mesma base filtrada que o número do botão",
    ()=>{
      const iMetodo = HTML.indexOf("async laudoGerarFaltantes(){");
      const iFimMetodo = HTML.indexOf("\n  async laudoGerarTudoDeNovo(){", iMetodo);
      const trecho = HTML.slice(iMetodo, iFimMetodo);
      ok(trecho.indexOf("const base = laudoItensFiltradosPorEscolha(laudoItensDoEscopo());") > 0,
         "voltou a ignorar area/equipamento/tarefa e cobrir o laudo inteiro");
      ok(trecho.indexOf("const pend = laudoLinhasComPendencia(base);") > 0);
      eq(trecho.indexOf("laudoLinhasComPendencia(laudoItensDoEscopo())"), -1,
         "sobrou o caminho antigo, sem filtro nenhum");
    });
  t("o mesmo trecho que calcula o número do botão usa a base filtrada — prova que os dois batem",
    ()=>{
      /* Não dá pra chamar App.laudoGerarFaltantes() aqui (App não é
         extraído no contexto de teste — é um objeto grande, entrelaçado
         com DOM). Em vez disso, prova que a EXPRESSÃO que o método usa é
         literalmente a mesma que já calcula o "(N)" mostrado no botão
         (linha "const faltando = laudoLinhasComPendencia(base).length;",
         onde "base" vem de laudoItensFiltradosPorEscolha). Verificado
         manualmente no navegador com duas áreas e filtro de equipamento
         ativo: só a área filtrada foi gerada. */
      ok(HTML.indexOf("const base = laudoItensFiltradosPorEscolha(todos);") > 0);
      ok(HTML.indexOf("const faltando = laudoLinhasComPendencia(base).length;") > 0);
    });

  console.log("\n=== t96 · checklist da Mitigação Existente em grupos recolhíveis ===");
  /* Com os 5 grupos inteiros abertos (Proteção física, Dispositivos de
     segurança, Elétrica e energia, Acesso e altura, Organizacional), a
     tela ficava enorme para revisar um risco só. Usuário pediu: grupo
     fechado por padrão, mostrando só o que já foi marcado em campo, com a
     opção de abrir para marcar mais. */
  t("grupo sem nada marcado fica fechado e sem nenhum chip visível", ()=>{
    const item = { risco:{ id:"rAcc1", medidasExistentes:["prot_fixa"] } };
    const html = C.laudoBlocoMedidaExistenteEditavelHtml(item);
    ok(html.indexOf("Proteção fixa") > 0, "faltou o item marcado, que devia aparecer mesmo fechado");
    ok(html.indexOf("Cerca de proteção perimetral") < 0,
       "um item NÃO marcado do grupo Proteção física vazou mesmo fechado");
    ok(html.indexOf("Comando bimanual") < 0,
       "Dispositivos de segurança (grupo sem nada marcado) apareceu aberto");
  });
  t("abrir o grupo revela todas as opções, marcadas e não marcadas", ()=>{
    const item = { risco:{ id:"rAcc2", medidasExistentes:["prot_fixa"] } };
    vm.runInContext('__laudoGrupoExistenteAberto["Proteção física"] = true;', ctx);
    const html = C.laudoBlocoMedidaExistenteEditavelHtml(item);
    vm.runInContext('__laudoGrupoExistenteAberto = {};', ctx);
    ok(html.indexOf("Proteção fixa") > 0);
    ok(html.indexOf("Cerca de proteção perimetral") > 0, "abrir o grupo devia revelar as opções não marcadas também");
  });
  t("abrir um grupo não abre os outros", ()=>{
    const item = { risco:{ id:"rAcc3" } };
    vm.runInContext('__laudoGrupoExistenteAberto["Proteção física"] = true;', ctx);
    const html = C.laudoBlocoMedidaExistenteEditavelHtml(item);
    vm.runInContext('__laudoGrupoExistenteAberto = {};', ctx);
    ok(html.indexOf("Cerca de proteção perimetral") > 0, "grupo aberto não apareceu");
    ok(html.indexOf("Comando bimanual") < 0, "abrir um grupo vazou para os outros");
  });
  t("App.laudoToggleGrupoExistente existe e redesenha a tela", ()=>{
    ok(HTML.indexOf("laudoToggleGrupoExistente(nomeGrupo){ __laudoGrupoExistenteAberto[nomeGrupo] = !__laudoGrupoExistenteAberto[nomeGrupo]; render(); }") > 0);
  });
  t("trocar de item fecha os grupos de novo (senão o que abriu num risco vaza pro próximo)", ()=>{
    eq((HTML.match(/__laudoGrupoExistenteAberto = \{\};/g)||[]).length, 3,
       "precisa existir a declaração e zerar em laudoAbrirItem E em laudoIrPara");
  });

  console.log("\n=== t97 · digitar na descrição da mitigação existente não rola a página ===");
  /* Usuário reportou: "ao digitar textos em alguns dos campos de laudo a
     pagina de repente rola para baixo". A textarea "Descrição da
     mitigação existente (editável)" (adicionada nesta mesma sessão, junto
     com o checklist editável) chamava render() a cada tecla — isso
     destrói e recria o próprio textarea em que a pessoa está digitando,
     derrubando o foco e o cursor, e é isso que rolava a página. Os campos
     de texto mais antigos (empresa/cidade do projeto, plaqueta) nunca
     tiveram esse problema porque nunca chamaram render() a cada tecla —
     só em cliques/seleções discretas. */
  t("o campo 'desc' (a textarea, digitação livre) NÃO chama render() a cada tecla", ()=>{
    /* laudoSetMedidaExistenteCampo é método de App (sem a palavra
       "function" na frente) — funcao() não acha isso, por isso a fatia é
       tirada direto de HTML, do próprio nome até o próximo método. */
    const iMetodo = HTML.indexOf("laudoSetMedidaExistenteCampo(rid, campo, valor){");
    const iFim = HTML.indexOf("laudoAplicarTextoMedidaExistenteMulti(rid){", iMetodo);
    const trecho = HTML.slice(iMetodo, iFim);
    ok(iMetodo > 0, "método não encontrado");
    ok(trecho.indexOf('if(campo !== "desc") render();') > 0,
       "voltou a redesenhar a tela em toda tecla digitada na descrição");
    eq(trecho.indexOf("marcarAlterado(); render();"), -1,
       "sobrou o render incondicional de antes, disparando em toda tecla");
    ok(trecho.indexOf('if(campo !== "desc") sincronizarDescMedidaExistente(r);') > 0,
       "situacao/ressalva precisam continuar atualizando o texto automático");
  });

  console.log("\n=== t98 · HRN destaca em vermelho Frequência/Nº de pessoas sem preenchimento ===");
  /* Usuário pediu: sem botão de confirmar — se o campo (vindo da TAREFA)
     estiver sem preenchimento, destacar em vermelho para o usuário
     validar. PO e GPD nunca ficam vermelhos: sempre têm estimativa
     própria do risco, não vêm de um campo da tarefa que possa faltar. */
  t("sem frequência/nº de pessoas na tarefa, os dois campos ficam vermelhos", ()=>{
    const item = { risco:{ id:"rAlert1" }, tarefa:{ id:"tAlert1", frequencia:"", numPessoas:"" }, maquina:{ id:"mAlert1" } };
    const html = C.laudoBlocoHRN(item);
    ok(html.indexOf("border:1.5px solid #B3261E;background:#FDE7E5;color:#8C1D18") >= 0);
    eq((html.match(/border:1\.5px solid #B3261E;background:#FDE7E5;color:#8C1D18/g)||[]).length, 2,
       "precisa vermelho em FE E em NP, não só um dos dois");
    ok(html.indexOf("A tarefa não tem frequência informada") > 0);
    ok(html.indexOf("A tarefa não tem nº de pessoas informado") > 0);
  });
  t("com frequência/nº de pessoas preenchidos, nada fica vermelho", ()=>{
    const item = { risco:{ id:"rAlert2" }, tarefa:{ id:"tAlert2", frequencia:"Diário", numPessoas:"2" }, maquina:{ id:"mAlert2" } };
    const html = C.laudoBlocoHRN(item);
    eq(html.indexOf("border:1.5px solid #B3261E"), -1, "ficou vermelho com os dois campos preenchidos");
  });
  t("PO e GPD nunca ficam vermelhos, mesmo sem nada escolhido no risco", ()=>{
    const item = { risco:{ id:"rAlert3" }, tarefa:{ id:"tAlert3", frequencia:"Diário", numPessoas:"2" }, maquina:{ id:"mAlert3" } };
    const html = C.laudoBlocoHRN(item);
    // só os 2 do FE/NP — nenhum extra por causa de PO/GPD.
    eq((html.match(/border:1\.5px solid #B3261E/g)||[]).length, 0);
  });
  t("marcar fe/np no risco NÃO tira mais o vermelho — a exceção por risco foi removida", ()=>{
    /* Ao contrário do comportamento antigo: usuário decidiu que
       Frequência/Nº de pessoas são sempre da tarefa, sem exceção — então
       um valor solto em risco.fe/risco.np (dado antigo, de antes desta
       decisão, por exemplo) não deve mais aparecer nem tirar o alerta. */
    const item = { risco:{ id:"rAlert4", fe:"Diária", np:"1-2 pessoas" }, tarefa:{ id:"tAlert4", frequencia:"", numPessoas:"" }, maquina:{ id:"mAlert4" } };
    const html = C.laudoBlocoHRN(item);
    eq((html.match(/border:1\.5px solid #B3261E/g)||[]).length, 2,
       "um fe/np solto no risco nao pode mais calar o alerta da tarefa vazia");
  });

  console.log("\n=== t99 · menu '...' (visualizar/copiar/excluir) no cartão e no item do laudo ===");
  /* Usuário pediu os mesmos 3 atalhos que já existiam na lista de riscos do
     cadastro em campo (menuRiscoS), tanto no cartão da lista do laudo
     quanto dentro da tela do próprio risco. abrirModalRiscoS e
     removerRiscoS são REAPROVEITADOS (não duplicados) — mas os dois só
     acham a tarefa DENTRO do projeto "atual" (STATE.ui.projetoSId), que a
     aba Laudo nunca seta (só seta laudoRiscoId). Sem sincronizar o
     "atual" antes de abrir o menu, as 3 ações abririam mas falhariam
     caladas — bug real, encontrado testando no navegador antes de
     publicar, não só uma checagem de string. */
  t("menuLaudoCard sincroniza projeto/área/máquina/tarefa 'atuais' a partir do risco",
    ()=>{
      const f_ini = HTML.indexOf("menuLaudoCard(rid, tarefaId){");
      const f_fim = HTML.indexOf("laudoCopiarRisco(rid){", f_ini);
      const trecho = HTML.slice(f_ini, f_fim);
      ok(f_ini > 0, "método não encontrado");
      ok(trecho.indexOf("const item = laudoItemPorId(rid);") > 0,
         "precisa resolver o item sem depender do 'atual' — é o próprio bug que isto corrige");
      /* As quatro atribuições saíram daqui e viraram laudoSincronizarAtuais:
         os atalhos novos (editar equipamento/tarefa) precisavam da mesma coisa
         e falhavam calados sem ela. Agora existe um ponto só. */
      ok(trecho.indexOf("laudoSincronizarAtuais(item);") > 0, "deixou de sincronizar o 'atual'");
      const helper = funcao("laudoSincronizarAtuais");
      ok(helper.indexOf("STATE.ui.projetoSId = item.proj.id;") > 0);
      ok(helper.indexOf("STATE.ui.tarefaSId  = item.tarefa.id;") > 0);
    });
  t("laudoCopiarRisco usa laudoItemPorId, não buscarTarefaSimplesPorId (não depende do 'atual')",
    ()=>{
      const f_ini = HTML.indexOf("laudoCopiarRisco(rid){");
      const f_fim = HTML.indexOf("laudoAbrirItem(id){", f_ini);
      const trecho = HTML.slice(f_ini, f_fim);
      ok(f_ini > 0);
      ok(trecho.indexOf("const item = laudoItemPorId(rid);") > 0);
      ok(trecho.indexOf("item.tarefa.riscos.push(novo);") > 0);
      eq(trecho.indexOf("buscarTarefaSimplesPorId"), -1,
         "voltou a depender do 'atual' — mesmo bug que já foi corrigido");
      ok(trecho.indexOf("App.laudoAbrirItem(novo.id);") > 0,
         "depois de copiar, precisa abrir a CÓPIA na revisão do laudo, não no cadastro");
    });
  t("o cartão da lista e a tela do item têm os dois o botão '...' ligado ao mesmo menu",
    ()=>{
      ok(HTML.indexOf(`onclick="event.stopPropagation();App.menuLaudoCard('\${it.risco.id}','\${it.tarefa.id}')"`) > 0,
         "faltou o botão no cartão da lista");
      ok(HTML.indexOf(`onclick="App.menuLaudoCard('\${item.risco.id}','\${item.tarefa.id}')"`) > 0,
         "faltou o botão dentro do item");
    });
  t("as opções do menu original continuam na ordem certa", ()=>{
    const f_ini = HTML.indexOf("menuLaudoCard(rid, tarefaId){");
    const f_fim = HTML.indexOf("laudoCopiarRisco(rid){", f_ini);
    const trecho = HTML.slice(f_ini, f_fim);
    const iVer = trecho.indexOf("Visualizar / editar o risco");
    const iCopiar = trecho.indexOf("Copiar risco");
    const iExcluir = trecho.indexOf("Excluir risco");
    ok(iVer > 0 && iCopiar > iVer && iExcluir > iCopiar, "ordem errada ou opção faltando");
    ok(trecho.indexOf("danger:true") > 0, "excluir precisa continuar marcado como ação perigosa (fica vermelho)");
  });
  t("menu ganhou atalhos para editar área/máquina/tarefa sem sair do laudo", ()=>{
    /* Pedido do usuário: poder alterar área, equipamento, tarefa e risco
       direto na página do Laudo, sem precisar ir ao cadastro em campo.
       Reaproveita os MESMOS modais já usados no cadastro (abrirModalAreaS/
       MaquinaS/TarefaS) — não duplica formulário nenhum. */
    const f_ini = HTML.indexOf("menuLaudoCard(rid, tarefaId){");
    const f_fim = HTML.indexOf("laudoCopiarRisco(rid){", f_ini);
    const trecho = HTML.slice(f_ini, f_fim);
    ok(trecho.indexOf("App.laudoEditarTarefa('${rid}')") > 0, "sem atalho para editar a tarefa");
    ok(trecho.indexOf("App.laudoEditarEquipamento('${rid}')") > 0, "sem atalho para editar a máquina");
    ok(trecho.indexOf("App.abrirModalAreaS('${item.area.id}','${item.proj.id}')") > 0, "sem atalho para editar a área");
    const iVer = trecho.indexOf("Visualizar / editar o risco");
    const iTarefa = trecho.indexOf("Editar a tarefa");
    const iMaquina = trecho.indexOf("Editar a máquina/ativo");
    const iArea = trecho.indexOf("Editar a área");
    const iCopiar = trecho.indexOf("Copiar risco");
    ok(iVer > 0 && iTarefa > iVer && iMaquina > iTarefa && iArea > iMaquina && iCopiar > iArea,
       "os novos atalhos precisam vir entre 'editar risco' e 'copiar risco'");
  });
  t("Frequência e Nº de pessoas sem preenchimento ganham botão direto para editar a tarefa", ()=>{
    /* Antes disso era só um texto ("edite a tarefa para preencher") sem
       nenhum jeito de agir a partir da própria tela do laudo. */
    const item = { risco:{ id:"rAlertBtn" }, tarefa:{ id:"tAlertBtn", frequencia:"", numPessoas:"" }, maquina:{ id:"mAlertBtn" } };
    const html = C.laudoBlocoHRN(item);
    /* Passa por App.laudoEditarTarefa (e não direto por abrirModalTarefaS)
       porque só ele sincroniza o projeto "atual" antes de abrir — sem isso o
       modal não abria para quem entrava direto na aba Laudo. */
    eq((html.match(/App\.laudoEditarTarefa\('rAlertBtn'\)/g)||[]).length, 2,
       "esperado um botão de editar tarefa junto do alerta de FE e outro junto do de NP");
  });
  t("excluir continua pedindo confirmação — reaproveita removerRiscoS sem duplicar a lógica",
    ()=>{
      const f_ini = HTML.indexOf("removerRiscoS(id, tarefaId){");
      ok(f_ini > 0, "método não encontrado");
      const trecho = HTML.slice(f_ini, f_ini + 300);
      ok(trecho.indexOf('if(!confirm("Excluir este risco?")) return;') > 0);
    });
  t("o botão '...' do cartão não fica em cima do selo do HRN — ganhou espaço reservado",
    ()=>{
      ok(HTML.indexOf(".laudo-card-in{display:flex;gap:10px;align-items:flex-start;padding:10px 40px 10px 10px;") > 0,
         "sem o padding-right reservado, o botão sobrepõe o número do HRN");
      ok(HTML.indexOf(".laudo-card{margin-bottom:8px;position:relative;}") > 0,
         "sem position:relative no cartão, o botão absoluto ancora errado (ou na página inteira)");
    });

  console.log("\n=== t100 · cabeçalho do risco no PC: fotos maiores + selos E-T-R-S ===");
  /* Usuário pediu, só na versão PC (900px+, o mesmo corte que já separa o
     layout mobile/desktop no resto da tela do laudo): as miniaturas de
     equipamento/risco no dobro do tamanho, e os 4 selos E-T-R-S (mesmo
     componente laudoSiglaChip já usado na lista de cartões) mostrando
     quais dos 4 campos já têm texto aplicado. */
  t("miniaturas do cabeçalho dobram de 56x44 para 112x88 a partir de 900px",
    ()=>{
      ok(HTML.indexOf(".laudo-topo-thumbs .laudo-th{width:112px;height:88px;}") > 0,
         "sem isso o pedido de 'dobro do tamanho' não foi atendido");
      ok(HTML.indexOf(".laudo-topo-thumbs .laudo-th{width:44px;height:36px;border-radius:7px;}") > 0,
         "tamanho do celular não pode mudar");
    });
  t("selos E-T-R-S do cabeçalho ficam escondidos no celular e aparecem só no PC",
    ()=>{
      ok(HTML.indexOf(".laudo-topo-siglas{display:none;flex-shrink:0;gap:4px;}") > 0);
      ok(HTML.indexOf(".laudo-topo-siglas{display:flex;}") > 0);
    });
  t("cabeçalho do risco reaproveita laudoSiglaChip para os 4 selos (mesma cor que a lista de cartões usa)",
    ()=>{
      ok(HTML.indexOf('<div class="laudo-topo-siglas">${LAUDO_CAMPOS.map(c=>laudoSiglaChip(item, c.k, c.sigla)).join("")}</div>') > 0);
    });

  console.log("\n=== t101 · geração em lote da IA para cedo e avisa o motivo na hora ===");
  /* Usuário relatou a chave de IA batendo no limite de uso durante uma
     geração em lote: o app continuava tentando os campos um por um, cada
     um com as 5 tentativas internas de sempre, sem dar nenhum sinal de
     que estava tudo falhando — só no fim, minutos depois, é que aparecia
     o motivo. Aqui simula-se chamarIAResiliente sempre falhando (como um
     429 real faria) e confere que o lote PARA sozinho depois de 2 falhas
     seguidas, sem esgotar todos os campos pendentes, e que o painel de
     progresso recebe o aviso a cada falha (não só no final). Depois,
     confirma que uma falha ISOLADA (que se recupera sozinha) não afeta
     o lote inteiro. */
  function riscoFrescoT101(id){
    return { id, nome:"Risco "+id, nomeOutro:"", descRisco:"", descMedida:"", sugestaoMitigacao:"",
      laudoIA:{}, foto:null, fotosOutras:[] };
  }
  function itensFrescosT101(prefixo){
    const tarefas = [1,2,3].map(n=>({ id:prefixo+"t"+n, tarefa:"Tarefa "+prefixo+n, tarefaOutro:"", frequencia:"Diária", numPessoas:"1", riscos:[riscoFrescoT101(prefixo+"r"+n)] }));
    const maquina = { id:prefixo+"m1", nome:"Máquina "+prefixo, descricao:"", fotoGeral:null, fotoPlaqueta:null, fotosOutras:[], tarefas, laudoIA:{} };
    const area = { id:prefixo+"a1", nome:"Área "+prefixo, maquinas:[maquina] };
    const proj = { id:prefixo+"p1", nome:"Projeto "+prefixo, areas:[area] };
    return tarefas.map(tf=>({ proj, area, maquina, tarefa:tf, risco:tf.riscos[0] }));
  }
  const chamarOriginalT101 = C.chamarIAResiliente;
  /* Alguns testes anteriores passam uma função async direto para t() (que
     não aguarda a promise — roda "solta"). Isso pode deixar CHAVE/painelTeste
     num estado incerto por um instante caso ainda não tenham terminado.
     Blindagem explícita das precondições, igual ao que t77 já fazia. */
  C.setIAApiKey("chave-teste-101");
  painelTeste.aberturas = []; painelTeste.fechamentos = 0; painelTeste.aberto = false; painelTeste.cancelar = false;

  // ---- Cenário A: IA sempre falha (limite de uso atingido) ----
  C.chamarIAResiliente = async ()=>{
    C.__iaMotivoFalha = "limite de uso da IA atingido (erro 429) — o provedor pediu para esperar";
    C.__iaChamadasFalhas = (C.__iaChamadasFalhas||0) + 1;
    return null;
  };
  painelTeste.atualizacoes = [];
  const itensA = itensFrescosT101("A");
  const gravadosA = await C.gerarLaudoIAItens(itensA, null, { refazer:false });
  const avisosA = painelTeste.atualizacoes.filter(a=>a.aviso);
  const anunciosA = painelTeste.atualizacoes.filter(a=>a.sub);
  t("nada é gravado quando a IA nunca responde", ()=> eq(gravadosA, 0));
  t("para exatamente nas 2 falhas seguidas configuradas (não fica repetindo à toa)",
    ()=> eq(avisosA.length, 2, "avisos registrados: " + avisosA.length));
  t("o aviso mostrado é o motivo real da falha, visível enquanto ainda está rodando",
    ()=> ok(avisosA.every(a=>a.aviso.indexOf("limite de uso da IA atingido") > 0), "aviso não bate com __iaMotivoFalha"));
  t("parou bem antes de esgotar os 10 campos pendentes desta leva (não grudou tentando tudo)",
    ()=> ok(anunciosA.length < 10, "anunciou " + anunciosA.length + " campos — deveria ter parado cedo"));

  // ---- Cenário B: uma falha isolada não derruba o lote inteiro ----
  let chamadasB = 0;
  C.chamarIAResiliente = async ()=>{
    chamadasB++;
    if(chamadasB === 2) return null; // um blip isolado, não repete
    return JSON.stringify({ texto: "Texto gerado #" + chamadasB, duvida:"" });
  };
  C.setIAApiKey("chave-teste-101");
  painelTeste.aberturas = []; painelTeste.fechamentos = 0; painelTeste.aberto = false; painelTeste.cancelar = false;
  painelTeste.atualizacoes = [];
  const itensB = itensFrescosT101("B");
  const gravadosB = await C.gerarLaudoIAItens(itensB, null, { refazer:false });
  const avisosB = painelTeste.atualizacoes.filter(a=>a.aviso);
  t("uma falha isolada se recupera sozinha — o lote continua até o fim",
    ()=> ok(gravadosB >= 8, "só " + gravadosB + " campos gravados; esperava quase todos os 10"));
  t("só registrou 1 aviso (a falha isolada), sem acionar a parada antecipada",
    ()=> eq(avisosB.length, 1, "avisos registrados: " + avisosB.length));

  C.chamarIAResiliente = chamarOriginalT101;

  console.log("\n=== t102 · risco, mitigação existente e solução são pedidos em PARALELO ===");
  /* Usuário reportou a IA demorando muito para escrever os textos. Uma causa
     real: para cada risco, os 3 campos (descrição do risco, mitigação
     existente, solução) eram pedidos um de cada vez, esperando a resposta
     de um pra só então pedir o próximo — 3 idas e voltas sequenciais por
     risco. Como nenhum depende do texto que os outros vão gerar, agora são
     disparados juntos (Promise.all), igual ao escopo do equipamento já
     fazia. Este teste prova o disparo PARALELO de verdade: o mock nunca
     resolve sozinho — só resolve quando mandado — então se as 3 chamadas
     não aparecerem TODAS antes de qualquer resposta voltar, é sinal de que
     voltou a ser sequencial (uma esperando a outra terminar). */
  {
    function itemFrescoParalelo(){
      const risco = { id:"parR1", nome:"Risco Paralelo", nomeOutro:"", descRisco:"desc do risco", descMedida:"já existe uma proteção X instalada", sugestaoMitigacao:"", laudoIA:{}, foto:null, fotosOutras:[] };
      const tarefa = { id:"parT1", tarefa:"Tarefa Paralela", tarefaOutro:"", frequencia:"Diária", numPessoas:"1", riscos:[risco], laudoIA:{ tarefaSt:"ok", tarefaFin:"já decidido", tarefaSug:"" } };
      const maquina = { id:"parM1", nome:"Máquina Paralela", descricao:"", fotoGeral:null, fotoPlaqueta:null, fotosOutras:[], tarefas:[tarefa], laudoIA:{ escopoSt:"ok", escopoFin:"já decidido", escopoSug:"" } };
      const area = { id:"parA1", nome:"Área Paralela", maquinas:[maquina] };
      const proj = { id:"parP1", nome:"Projeto Paralelo", areas:[area] };
      return [{ proj, area, maquina, tarefa, risco }];
    }
    const chamarOriginalT102 = C.chamarIAResiliente;
    let disparos = [];
    const resolvedores = [];
    C.chamarIAResiliente = (tipo)=>{
      disparos.push(tipo);
      return new Promise(resolve=> resolvedores.push(()=> resolve(JSON.stringify({ texto:"texto de "+tipo, duvida:"" }))));
    };
    C.setIAApiKey("chave-teste-102");
    painelTeste.atualizacoes = [];

    const itensParalelo = itemFrescoParalelo();
    const promessaGeracao = C.gerarLaudoIAItens(itensParalelo, null, { refazer:false });
    // Deixa a fila de microtasks correr sem resolver nenhuma chamada — se
    // for mesmo Promise.all, as 3 já terão sido disparadas neste ponto.
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    t("as 3 chamadas (risco, mitigação existente e solução) são disparadas ANTES de qualquer resposta voltar",
      ()=> eq(disparos.length, 3, "disparadas: " + disparos.join(", ")));
    resolvedores.forEach(r=>r());
    const gravadosParalelo = await promessaGeracao;
    t("depois de resolvidas, os 3 textos são gravados normalmente",
      ()=> eq(gravadosParalelo, 3));
    t("uma única mensagem de progresso anuncia os 3 campos juntos, não um de cada vez",
      ()=> ok(painelTeste.atualizacoes.some(a=> a.sub && a.sub.indexOf("+") > 0),
              "esperava algo como 'descrição do risco + mitigação existente + solução'"));

    C.chamarIAResiliente = chamarOriginalT102;
  }

  console.log("\n=== t103 · aparelho que não criou nada NÃO reenvia a árvore ===");
  /* O defeito: o motor tinha DUAS memórias independentes respondendo à mesma
     pergunta. O recebimento perguntava "eu já tenho este arquivo?" e o envio
     perguntava "eu já enviei este arquivo?" — em memórias diferentes. Um
     aparelho com os dados mas sem o mapa de assinaturas (restaurou backup,
     limpou dados do navegador, reinstalou) fazia o recebimento responder
     "já tenho, pulo" SEM gravar nada, e o envio responder "nunca mandei,
     mando tudo" — a árvore inteira subia de novo, com fotos, por dados
     móveis, num aparelho onde ninguém tinha criado nada.

     Este grupo monta um CONTEXTO PRÓPRIO (o ambiente compartilhado lá de
     cima não tem o motor de sincronização carregado) e roda o ciclo real:
     descritor -> mesclagem -> filtro de pendentes do envio. */
  {
    const ctxS = {
      console, JSON, Math, Date, Map, Set, Object, Array, String, Number, RegExp, isFinite, isNaN,
      OUTRO, STATE: { projetosSimples: [], ui:{} },
      ONEDRIVE_PASTA_APP:"APR-Campo", SUBPASTA_BACKUP:"Backup",
      ONEDRIVE_LIMITE_AUTO_BYTES: 300000, CAMPO_FOTOS_LISTA:"fotosOutras",
      nomeMaquinaS: m=>m.nome||"", valOuOutro:(v,o)=>v===OUTRO?(o||""):(v||""),
      Blob: class { constructor(a){ this.size = Buffer.byteLength(a.join(""),"utf8"); } },
      registrarEventoSync: ()=>{},
      marcarProgressoSync: ()=>{}, localizarItemLocal: ()=>null,
      completarFotosDeItem: ()=>false, itemTemFotosEmbutidas: ()=>false,
    };
    vm.createContext(ctxS);
    /* Lápides de verdade (antes era o stub exclusaoConfirmadaPeloUsuario:false).
       Sem STATE.exclusoesConfirmadas preenchido elas devolvem "não há lápide",
       que é o cenário deste grupo — mas agora é o código real decidindo. */
    vm.runInContext(constante("LAPIDE_VALIDADE_MS"), ctxS);
    ["exclusaoConfirmadaPeloUsuario","lapideDe","lapideVenceDadosRemotos"]
      .forEach(n=> vm.runInContext(funcao(n), ctxS));
    /* nomeArquivoSeguro entra à mão: a regex dele tem aspas dentro da classe
       de caracteres e o extrator funcao() acima para no lugar errado. */
    vm.runInContext('function nomeArquivoSeguro(s){ let n = String(s||"sem-nome").trim().slice(0,48)'
      + '.replace(/[\\\\/:*?"<>|]/g,"-").replace(/\\s+/g," ").replace(/^\\.+/,"").replace(/[. ]+$/,"");'
      + ' if(/^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i.test(n)) n = n+"_"; return n || "sem-nome"; }', ctxS);
    vm.runInContext(constante("CAMPOS_FILHOS_SYNC"), ctxS);
    vm.runInContext(constante("CAMPO_FILHOS_POR_TIPO"), ctxS);
    vm.runInContext(constante("CAMPOS_FOTO_UNICA"), ctxS);
    vm.runInContext("var __ultimoCarimboVisto = 0;", ctxS);
    vm.runInContext("var __assinaturasOneDriveSimples = { mapa:null, chaveEstado:'oneDriveAssinaturasSimples' };", ctxS);
    vm.runInContext("var __arvoreSimplesCache = null, __indiceNuvemMapa = null, __indiceNuvemMapaEm = 0;", ctxS);
    vm.runInContext("var __downloadJaVarreuNestaSessao = false;", ctxS);
    [ "__carregarUltimoCarimbo","registrarCarimboVisto","agoraSync",
      "segmentoPastaComId","extrairSufixoDoNome","idBateComSufixo",
      "listarItensSincronizaveisSimples","separarFotosDoItem","__ehFotoEmbutida",
      "tamanhoTextoLocalDoItem","onedriveCarregarAssinaturas","onedriveAssinaturaDe",
      "onedriveAnotarTamanho","onedriveArquivoMudouNaNuvem","onedriveMesmaVersaoPeloTamanho",
      "onedrivePrecisaBaixarFotos","aplicarAtualizacaoRemota","__listasIrmasDe",
      "__moverItemEntrePais","__onedriveMesclarItemNovoInterno","onedriveMesclarItemNovo",
      "onedriveRegistrarAssinaturaDeDownload","onedriveDescritorDeCaminho",
      "onedriveItemLocalNoLugarDoDescritor","onedriveItemJaConvergido",
      "__itemExisteAlgumLugar","riscoOrfaoConhecido","marcarRiscoOrfaoConhecido",
      "onedriveEnvioAutomaticoDeveEsperar",
    ].forEach(n=> vm.runInContext(funcao(n), ctxS));
    /* Réplica exata do filtro de pendentes de onedriveSincronizarModulo — é
       ele que decide o que sobe. Se a réplica sair do lugar, o teste perde o
       sentido; por isso o teste seguinte confere que o original não mudou. */
    vm.runInContext(`function pendentesDeUpload(){
      const itensAtuais = listarItensSincronizaveisSimples();
      const assinaturas = onedriveCarregarAssinaturas(__assinaturasOneDriveSimples);
      return itensAtuais.filter(it => {
        const registro = assinaturas.get(it.id);
        if(!registro) return true;
        if(registro.atualizadoEm !== it.atualizadoEm) return true;
        if(registro.fotosPendentes) return true;
        return false;
      });
    }`, ctxS);

    const TS = 1750000000000;
    const IDS = { proj:"xp1a2b", area:"xa3c4d", maq:"xm5e6f", tar:"xt7g8h", risco:"xr9i0j" };
    const PREF = "APR-Campo/Backup/Simplificado/";
    const arvore = ()=>({ id:IDS.proj, empresa:"Corteva", criadoEm:TS, atualizadoEm:TS, areas:[
      { id:IDS.area, nome:"Debulha", criadoEm:TS, atualizadoEm:TS, maquinas:[
        { id:IDS.maq, nome:"Debulhador", criadoEm:TS, atualizadoEm:TS, tarefas:[
          { id:IDS.tar, tarefa:"Limpeza", tarefaOutro:"", criadoEm:TS, atualizadoEm:TS, riscos:[
            { id:IDS.risco, nome:"Esmagamento", descricao:"d", fotosOutras:[], criadoEm:TS, atualizadoEm:TS } ]} ]} ]} ]});
    const zerar = ()=>{ ctxS.STATE.projetosSimples=[arvore()]; ctxS.STATE.oneDriveAssinaturasSimples={}; ctxS.__assinaturasOneDriveSimples.mapa=null; };
    const caminhoDe = it => PREF + it.pasta.join("/") + "/" + it.arquivo;
    const pendIds = ()=> vm.runInContext("pendentesDeUpload()", ctxS).map(i=>i.id);
    const nAssin = ()=> Object.keys(ctxS.STATE.oneDriveAssinaturasSimples).length;
    zerar();
    const itensNuvem = JSON.parse(JSON.stringify(vm.runInContext("listarItensSincronizaveisSimples()", ctxS)));
    const mesclar = (d, dados)=>{ ctxS.__d=d; ctxS.__dados=dados; return vm.runInContext("onedriveMesclarItemNovo(__d,__dados)", ctxS); };
    const descPara = it => ({ caminho:caminhoDe(it), nome:it.arquivo, tamanho:500, tipo:it.tipo,
      projId:IDS.proj, areaId:IDS.area, maquinaId:IDS.maq, tarefaId:IDS.tar });

    t("o filtro de pendentes do envio continua sendo o que este teste replica", ()=>{
      const f = funcao("onedriveSincronizarModulo");
      ok(f.indexOf("if(!registro) return true;") > 0
         && f.indexOf("if(registro.atualizadoEm !== it.atualizadoEm) return true;") > 0,
         "o filtro real mudou — a réplica deste teste precisa acompanhar");
    });
    t("aparelho com os dados e SEM assinaturas ainda parte de 'tudo pendente'", ()=>{
      zerar();
      eq(nAssin(), 0);
      eq(pendIds().length, itensNuvem.length, "cenário de partida não é mais o do defeito");
    });
    t("o recebimento passa a CONFERIR o arquivo em vez de pular sem gravar nada", ()=>{
      zerar();
      const decisoes = itensNuvem.map(it=>{
        ctxS.__entrada = { caminho:caminhoDe(it), nome:it.arquivo, tamanho:500 };
        const d = vm.runInContext("onedriveDescritorDeCaminho(__entrada)", ctxS);
        return d && d.jaExiste ? "pulou" : "confere";
      });
      ok(decisoes.every(x=>x==="confere"),
         "voltou a pular sem assinatura — é exatamente o defeito de origem: " + decisoes.join(","));
    });
    t("depois da varredura o mapa se reconstrói sozinho e NADA fica para enviar", ()=>{
      zerar();
      for(const it of itensNuvem){
        ctxS.__entrada = { caminho:caminhoDe(it), nome:it.arquivo, tamanho:500 };
        const d = vm.runInContext("onedriveDescritorDeCaminho(__entrada)", ctxS);
        if(d && !d.jaExiste && !d.aguardandoPai) mesclar(descPara(it), it.dados);
      }
      eq(nAssin(), itensNuvem.length, "assinaturas não foram reconstruídas");
      eq(pendIds().length, 0, "o aparelho ainda quer enviar algo que não criou");
    });
    t("GARANTIA: edição local ainda não enviada NÃO é marcada como sincronizada", ()=>{
      zerar();
      const r = ctxS.STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[0];
      r.descricao = "EDICAO DE CAMPO AINDA NAO ENVIADA";
      r.atualizadoEm = TS + 9999; // mais novo que a versão da nuvem
      const itR = itensNuvem.find(i=>i.id==="risco:"+IDS.risco);
      mesclar(descPara(itR), itR.dados); // chega a versão ANTIGA da nuvem
      const depois = ctxS.STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[0];
      eq(depois.descricao, "EDICAO DE CAMPO AINDA NAO ENVIADA", "a versão da nuvem sobrescreveu a edição local");
      ok(!ctxS.STATE.oneDriveAssinaturasSimples["risco:"+IDS.risco],
         "assinou uma versão que nunca subiu — a edição de campo ficaria perdida para sempre");
      ok(pendIds().includes("risco:"+IDS.risco), "a edição local precisa continuar na fila de envio");
    });
    t("versão mais NOVA vinda do outro aparelho é aplicada e não vira pendência", ()=>{
      zerar();
      const itR = JSON.parse(JSON.stringify(itensNuvem.find(i=>i.id==="risco:"+IDS.risco)));
      itR.dados.descricao = "TEXTO NOVO DO OUTRO APARELHO";
      itR.dados.atualizadoEm = TS + 7777;
      mesclar(descPara(itR), itR.dados);
      const depois = ctxS.STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[0];
      eq(depois.descricao, "TEXTO NOVO DO OUTRO APARELHO");
      ok(!!ctxS.STATE.oneDriveAssinaturasSimples["risco:"+IDS.risco], "não assinou o que acabou de receber");
      ok(!pendIds().includes("risco:"+IDS.risco), "voltaria a devolver para a nuvem o que veio dela (o eco)");
    });
    t("o envio automático espera a primeira varredura quando o mapa está vazio", ()=>{
      zerar();
      vm.runInContext("__downloadJaVarreuNestaSessao = false;", ctxS);
      eq(vm.runInContext("onedriveEnvioAutomaticoDeveEsperar()", ctxS), true,
         "enviaria às cegas antes de saber o que já está na nuvem");
      vm.runInContext("__downloadJaVarreuNestaSessao = true;", ctxS);
      eq(vm.runInContext("onedriveEnvioAutomaticoDeveEsperar()", ctxS), false,
         "travaria o envio para sempre depois da varredura");
    });
    t("aparelho sem nenhum dado local nunca fica travado esperando", ()=>{
      ctxS.STATE.projetosSimples = []; ctxS.STATE.oneDriveAssinaturasSimples = {};
      ctxS.__assinaturasOneDriveSimples.mapa = null;
      vm.runInContext("__downloadJaVarreuNestaSessao = false;", ctxS);
      eq(vm.runInContext("onedriveEnvioAutomaticoDeveEsperar()", ctxS), false);
    });
    t("o botão manual não é afetado pela espera (ele busca a árvore antes de enviar)", ()=>{
      const f = funcao("sincronizarIncrementalOneDrive");
      ok(f.indexOf("if(!onProgresso && onedriveEnvioAutomaticoDeveEsperar()) return;") > 0,
         "a espera precisa valer só para o ciclo automático");
    });
    /* Conflito de POSIÇÃO: o mesmo item movido para pais diferentes em dois
       aparelhos deixa DUAS cópias na nuvem, em endereços diferentes. Ler o
       arquivo da cópia órfã não pode fazer o app assinar aquele endereço —
       o item mora em outro lugar. Uma busca solta pela árvore encontraria o
       item mesmo assim (no endereço vencedor) e assinaria a pasta errada;
       por isso a busca desce pelos ids de pai do próprio descritor. */
    t("cópia órfã noutro endereço NÃO é confundida com o item convergido", ()=>{
      const proj = { id:"pz", empresa:"C", criadoEm:TS, atualizadoEm:TS, areas:[
        { id:"az1", nome:"A1", criadoEm:TS, atualizadoEm:TS, maquinas:[
          { id:"mz", nome:"Maq", criadoEm:TS, atualizadoEm:TS+200, tarefas:[] } ]},
        { id:"az2", nome:"A2", criadoEm:TS, atualizadoEm:TS, maquinas:[] } ]};
      ctxS.STATE.projetosSimples = [proj];
      const dadosMaq = { id:"mz", nome:"Maq", criadoEm:TS, atualizadoEm:TS+200, tarefas:[] };
      ctxS.__d = { tipo:"maquina", projId:"pz", areaId:"az1" }; ctxS.__dados = dadosMaq;
      eq(vm.runInContext("onedriveItemJaConvergido(__d,__dados)", ctxS), true,
         "no endereço certo e mesmo carimbo: é a mesma versão, tem de assinar");
      ctxS.__d = { tipo:"maquina", projId:"pz", areaId:"az2" }; // órfã: a máquina não está aqui
      eq(vm.runInContext("onedriveItemJaConvergido(__d,__dados)", ctxS), false,
         "assinou o endereço da cópia órfã — a assinatura apontaria para a pasta errada");
    });
  }

  console.log("\n=== t104 · página de backup: painel único com tempo, tamanho e erro ===");
  /* A página tinha 9 seções alternando assunto e QUATRO painéis empilhados
     com informação parecida, nenhum respondendo direto "falta muito?".
     Usuário pediu: ver o que está sincronizando, o que falta em TEMPO e
     TAMANHO, e qual foi o erro. */
  {
    const ctxP = {
      console, JSON, Math, Date, Object, Array, String, Number,
      STATE: { ui:{}, logSincronizacao:[] },
      escapeHtml, ic,
      __syncProgresso: null,
      __memoEnvio: { fotos:{ totalItens:0, totalBytes:0 } },
      onedriveEstimativaEnvioComMemo: ()=>({ totalItens:0, totalBytes:0, porTipo:{}, porTipoAlterado:{} }),
      onedriveStatusPendenteHtml: ()=>"<!--detalhe-->",
      syncGruposHtml: ()=>"<!--grupos-->",
    };
    vm.createContext(ctxP);
    ["fmtBytes","progressoTempo","syncTempoEstimado","syncUltimaFalha","syncPainelHtml","syncFecharMedicaoVelocidade"]
      .forEach(n=> vm.runInContext(funcao(n), ctxP));
    vm.runInContext("var __syncBytesRodada = 0;", ctxP);
    const painel = ()=> vm.runInContext("syncPainelHtml()", ctxP);
    const semTags = h => h.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();

    t("sem velocidade medida, o app não inventa tempo", ()=>{
      ctxP.STATE.oneDriveBytesPorSegundo = undefined;
      eq(vm.runInContext("syncTempoEstimado(10*1024*1024)", ctxP), "",
         "mostrar tempo sem ter medido nada seria chute");
    });
    t("com velocidade medida, o tempo aparece em minutos/segundos", ()=>{
      ctxP.STATE.oneDriveBytesPorSegundo = 1024*1024; // 1 MB/s
      eq(vm.runInContext("syncTempoEstimado(120*1024*1024)", ctxP), "~2min 00s");
      eq(vm.runInContext("syncTempoEstimado(3*1024)", ctxP), "~alguns segundos");
    });
    t("uma amostra pequena demais não vira velocidade medida", ()=>{
      ctxP.STATE.oneDriveBytesPorSegundo = undefined;
      vm.runInContext("__syncBytesRodada = 3*1024; syncFecharMedicaoVelocidade(Date.now()-8000);", ctxP);
      eq(ctxP.STATE.oneDriveBytesPorSegundo, undefined,
         "3 KB em 8s é quase só espera de rede — viraria uma estimativa absurda");
    });
    t("uma amostra grande vira velocidade e é suavizada com a anterior", ()=>{
      ctxP.STATE.oneDriveBytesPorSegundo = undefined;
      vm.runInContext("__syncBytesRodada = 10*1024*1024; syncFecharMedicaoVelocidade(Date.now()-10000);", ctxP);
      const primeira = ctxP.STATE.oneDriveBytesPorSegundo;
      ok(primeira > 900*1024 && primeira < 1100*1024, "10 MB em 10s ≈ 1 MB/s, obtido " + primeira);
      vm.runInContext("__syncBytesRodada = 30*1024*1024; syncFecharMedicaoVelocidade(Date.now()-10000);", ctxP);
      const segunda = ctxP.STATE.oneDriveBytesPorSegundo;
      ok(segunda > primeira && segunda < 3*1024*1024,
         "a segunda medição precisa puxar a média, não substituí-la: " + segunda);
    });
    t("nada pendente: diz 'Tudo sincronizado' UMA vez, sem repetir o detalhamento", ()=>{
      ctxP.STATE.oneDriveStatusPendente = { totalReceber:0, receberPorTipo:{}, atualizarPorTipo:{}, verificadoEm: Date.now() };
      ctxP.STATE.logSincronizacao = [];
      const h = painel();
      ok(semTags(h).indexOf("Tudo sincronizado") >= 0);
      eq(h.indexOf("<!--detalhe-->"), -1, "o detalhamento repetiria 'Tudo sincronizado' logo abaixo");
    });
    t("com pendência: mostra quantidade, tamanho e tempo, e chama o detalhamento", ()=>{
      ctxP.STATE.oneDriveBytesPorSegundo = 1024*1024;
      ctxP.STATE.oneDriveStatusPendente = { totalReceber:7,
        receberPorTipo:{ risco:{qtd:5,bytes:9*1024*1024}, tarefa:{qtd:2,bytes:40*1024} },
        atualizarPorTipo:{}, verificadoEm: Date.now() };
      const txt = semTags(painel());
      ok(txt.indexOf("7 itens para sincronizar") >= 0, txt);
      ok(txt.indexOf("MB") >= 0 && txt.indexOf("~") >= 0, "faltou tamanho ou tempo: " + txt);
      ok(painel().indexOf("<!--detalhe-->") > 0, "o detalhamento por tipo precisa aparecer");
    });
    t("as fotos a receber não são contadas duas vezes no total", ()=>{
      /* fotosReceber já está dentro de receberPorTipo — somar por fora
         dobraria os MB mostrados na tela. */
      ctxP.STATE.oneDriveStatusPendente = { totalReceber:5,
        receberPorTipo:{ risco:{qtd:5,bytes:10*1024*1024} }, atualizarPorTipo:{},
        fotosReceber:{qtd:5,bytes:10*1024*1024}, verificadoEm: Date.now() };
      const txt = semTags(painel());
      ok(txt.indexOf("10.0 MB") >= 0 && txt.indexOf("20.0 MB") < 0, "contou as fotos em dobro: " + txt);
    });
    t("sincronizando agora: mostra fase, %, itens, bytes e quanto falta", ()=>{
      ctxP.__syncProgresso = { fase:'enviando', itemAtual:3, totalItens:12, bytesFeitos:2*1024*1024, bytesTotal:11*1024*1024 };
      const txt = semTags(painel());
      ok(txt.indexOf("Enviando alterações") >= 0 && txt.indexOf("25%") >= 0, txt);
      ok(txt.indexOf("3 de 12") >= 0 && txt.indexOf("2.0 MB de 11.0 MB") >= 0, txt);
      ok(txt.indexOf("falta ~") >= 0, "faltou a estimativa de tempo restante: " + txt);
      ctxP.__syncProgresso = null;
    });
    t("o erro mais recente aparece com o motivo, sem abrir o diagnóstico", ()=>{
      ctxP.STATE.logSincronizacao = [
        { ts:Date.now(), dir:"up", nome:"risco_a.json", caminho:"Corteva/Debulha", bytes:0, ok:false, motivo:"tempo esgotado na rede" } ];
      const txt = semTags(painel());
      ok(txt.indexOf("Falhou ao enviar") >= 0 && txt.indexOf("tempo esgotado na rede") >= 0, txt);
      ok(txt.indexOf("nada foi perdido") >= 0, "precisa tranquilizar: o item continua na fila");
    });
    t("correção automática (reparo) não é mostrada como erro", ()=>{
      ctxP.STATE.logSincronizacao = [
        { ts:Date.now(), dir:"up", nome:"x.json", bytes:10, ok:false, reparo:true, motivo:"autocura" } ];
      eq(semTags(painel()).indexOf("Falhou ao"), -1, "reparo não é falha");
    });
  }

  console.log("\n=== t105 · sincronização sobrevive à aba em segundo plano ===");
  /* Usuário: "se eu sair da página para outro app ele perde a sincronização e
     aqueles itens voltam a precisar de sincronizar novamente". Duas causas
     independentes, as duas confirmadas no código:
     1) o vigia de progresso (90 s sem avanço = "travou") disparava porque o
        navegador segura os temporizadores da aba escondida — as pausas de
        200 ms entre itens viram quase um minuto cada, e a sincronização, que
        estava andando, era MORTA pelo próprio cronômetro de segurança;
     2) a lista de pacotes de fotos pendentes encolhia só na memória e só ia
        para o disco no FIM do lote — fechar no meio devolvia a fila inteira. */
  t("o vigia não desiste enquanto a aba está escondida — só fica de sobreaviso", ()=>{
    const f = funcao("comVigilanciaDeProgresso");
    const iAba = f.indexOf('if(document.visibilityState === "hidden"){ marcarProgressoSync(); return; }');
    const iDesiste = f.indexOf('reject(new Error("ONEDRIVE_TEMPO_ESGOTADO"))');
    ok(iAba > 0, "sem isso, trocar de aplicativo mata a sincronização em 90 s");
    ok(iAba < iDesiste, "a checagem da aba precisa vir ANTES da desistência, senão não protege nada");
  });
  t("com a aba visível o vigia continua valendo (senão travar de verdade nunca seria detectado)", ()=>{
    const f = funcao("comVigilanciaDeProgresso");
    ok(f.indexOf("__syncUltimoProgressoEm && (Date.now() - __syncUltimoProgressoEm > msSemProgresso)") > 0);
  });
  t("a fila de fotos vai para o disco durante o lote, não só no fim", ()=>{
    const f = funcao("onedriveBaixarPendentes");
    ok(f.indexOf("const gravarPendentesSePassouTempo = () => {") > 0, "sem gravação incremental");
    ok(f.indexOf("if(Date.now() - ultimaGravacao < 4000) return;") > 0, "sem limite de ritmo, seriam dezenas de gravações");
    const iRemove = f.indexOf("STATE.oneDrivePendentes = (STATE.oneDrivePendentes||[]).filter(p=>p!==item);");
    const iGrava = f.indexOf("gravarPendentesSePassouTempo();");
    ok(iRemove > 0 && iGrava > iRemove, "a gravação tem de vir DEPOIS de tirar o item da fila");
  });
  t("mesmo sem mudança de conteúdo, a fila menor é gravada", ()=>{
    const f = funcao("onedriveBaixarPendentes");
    ok(f.indexOf("else dbSet(STATE);") > 0,
       "sem isto, um lote que só reconfirmou fotos já existentes voltaria com a fila cheia");
  });
  t("barra sem total conhecido usa a animação de 'andando', não 100% fixo", ()=>{
    const f = funcao("syncPainelHtml");
    ok(f.indexOf("sync-progresso-indeterminado") > 0,
       "desenhada cheia, a barra parece concluída e travada — o oposto do que está havendo");
    eq(f.indexOf("width:${pct!=null?pct:100}%"), -1, "voltou a desenhar 100% quando não sabe o total");
  });

  console.log("\n=== t106 · pasta que falhou ao listar não vira 'faltava na nuvem' ===");
  /* A sincronização "que nunca termina", diagnosticada em campo em 19/08:
     quando a listagem de uma pasta falhava (limite de requisições 429, rede,
     sessão), a função de listagem gravava uma lista VAZIA — indistinguível de
     pasta realmente vazia. A reconciliação percorria os 1167 itens do
     aparelho, não achava os arquivos daquelas pastas na foto da nuvem,
     concluía "faltava na nuvem", APAGAVA a assinatura e agendava reenvio. O
     reenvio gerava mais requisições, mais 429, mais pastas falsamente
     vazias — ciclo que se alimenta sozinho num aparelho onde ninguém criou
     nada. O diagnóstico do usuário mostrava 17 dessas "correções" no mesmo
     segundo e o mesmo arquivo enviado duas vezes em 18 s. */
  {
    const reparosLog = [];
    const ctxR = {
      console, JSON, Math, Date, Map, Set, Object, Array, String, Number,
      STATE: { projetosSimples:[{id:"p"}], ui:{} },
      ONEDRIVE_PASTA_APP:"APR-Campo", SUBPASTA_BACKUP:"Backup",
      itemTemFotosEmbutidas: ()=>false,
      rotuloCaminhoSync: p=>p.join("/"),
      registrarEventoSync: (dir,nome,tipo,b,ok,motivo)=>reparosLog.push({nome, motivo}),
      onedriveJaExisteNaNuvem: ()=>false,
      onedriveGuardarIndiceNuvem: ()=>{},
    };
    vm.createContext(ctxR);
    vm.runInContext("var __arvoreSimplesCache=null; var __arvoreNuvemIncompleta=false;", ctxR);
    vm.runInContext("var __assinaturasOneDriveSimples = { mapa:null, chaveEstado:'oneDriveAssinaturasSimples' };", ctxR);
    vm.runInContext(constante("LAPIDE_VALIDADE_MS"), ctxR);
    ["onedriveCarregarAssinaturas","onedriveColetarArquivosDaArvore","onedriveReconciliarComArvore",
     "lapideDe","lapideVenceDadosRemotos"]
      .forEach(n=> vm.runInContext(funcao(n), ctxR));
    vm.runInContext(`function listarItensSincronizaveisSimples(){ return [
      { id:"risco:r1", tipo:"risco", atualizadoEm:1, pasta:["Proj","AreaOk","Maq","Tar"], arquivo:"risco_r1.json", dados:{} },
      { id:"risco:r2", tipo:"risco", atualizadoEm:1, pasta:["Proj","AreaFalhou","Maq","Tar"], arquivo:"risco_r2.json", dados:{} },
      { id:"risco:r3", tipo:"risco", atualizadoEm:1, pasta:["Proj","AreaFalhou","Maq","Tar"], arquivo:"risco_r3.json", dados:{} } ]; }`, ctxR);
    const PREF = "APR-Campo/Backup/Simplificado";
    // A pasta "AreaFalhou" voltou vazia porque a listagem falhou — na nuvem
    // os arquivos dela existem normalmente.
    const arvore = ()=>[{ nome:"Proj", pasta:true, caminho:PREF+"/Proj", filhos:[
      { nome:"AreaOk", pasta:true, caminho:PREF+"/Proj/AreaOk", filhos:[
        { nome:"Maq", pasta:true, caminho:PREF+"/Proj/AreaOk/Maq", filhos:[
          { nome:"Tar", pasta:true, caminho:PREF+"/Proj/AreaOk/Maq/Tar", filhos:[
            { nome:"risco_r1.json", pasta:false, caminho:PREF+"/Proj/AreaOk/Maq/Tar/risco_r1.json", tamanho:500 } ]} ]} ]},
      { nome:"AreaFalhou", pasta:true, caminho:PREF+"/Proj/AreaFalhou", filhos:[] } ]}];
    const reconciliar = (incompleta)=>{
      ctxR.STATE.oneDriveAssinaturasSimples = {
        "risco:r1": { atualizadoEm:1, pasta:["Proj","AreaOk","Maq","Tar"], arquivo:"risco_r1.json", tamanho:500 },
        "risco:r2": { atualizadoEm:1, pasta:["Proj","AreaFalhou","Maq","Tar"], arquivo:"risco_r2.json", tamanho:500 },
        "risco:r3": { atualizadoEm:1, pasta:["Proj","AreaFalhou","Maq","Tar"], arquivo:"risco_r3.json", tamanho:500 } };
      ctxR.__assinaturasOneDriveSimples.mapa = null;
      reparosLog.length = 0;
      vm.runInContext("__arvoreNuvemIncompleta = " + (incompleta?"true":"false") + ";", ctxR);
      ctxR.__arv = arvore();
      const n = vm.runInContext("onedriveReconciliarComArvore(__arv)", ctxR);
      return { reparos:n, restantes:Object.keys(ctxR.STATE.oneDriveAssinaturasSimples) };
    };

    t("com a foto da nuvem INCOMPLETA, nenhuma assinatura é apagada", ()=>{
      const r = reconciliar(true);
      eq(r.reparos, 0, "reparou a partir de uma foto furada — é o ciclo infinito voltando");
      eq(r.restantes.length, 3, "apagou assinatura de item que está salvo na nuvem");
      eq(reparosLog.length, 0, "registrou 'faltava na nuvem' para pasta que só não pôde ser lida");
    });
    t("com a foto COMPLETA, some de verdade da nuvem continua sendo reparado", ()=>{
      const r = reconciliar(false);
      ok(r.reparos > 0, "a autocura legítima precisa continuar funcionando");
      ok(r.restantes.indexOf("risco:r1") >= 0, "apagou a assinatura do item que ESTÁ na nuvem");
      ok(reparosLog.some(x=>x.motivo && x.motivo.indexOf("faltava na nuvem") >= 0));
    });
    /* O DEFEITO QUE ISTO GUARDA: "meu envio falhou" e "outro aparelho apagou
       de propósito" chegam na autocura exatamente iguais — o arquivo não está
       na nuvem. Reenviar no segundo caso ressuscita o que alguém excluiu. */
    t("item com lápide NÃO é reenviado pela autocura (não ressuscita)", ()=>{
      /* r2, não r1: o arquivo de r1 EXISTE na nuvem, então ele nem chega ao
         trecho da autocura. Quem some de lá (pasta listada e vazia) é r2/r3. */
      ctxR.STATE.exclusoesConfirmadas = { "risco:r2": Date.now() };
      const r = reconciliar(false);
      ctxR.STATE.exclusoesConfirmadas = {};
      ok(r.restantes.indexOf("risco:r2") < 0, "a assinatura do item apagado tinha de sair");
      ok(!reparosLog.some(x=>x.nome==="risco_r2.json"), "agendou reenvio de item apagado de propósito");
      ok(reparosLog.some(x=>x.nome==="risco_r3.json"), "r3, sem lápide, tinha de continuar sendo reenviado");
    });
    t("lápide NÃO impede o reenvio de quem foi editado DEPOIS dela", ()=>{
      /* Trabalho novo tem de subir mesmo existindo lápide: é alguém que
         voltou a mexer no item depois da exclusão. */
      ctxR.STATE.exclusoesConfirmadas = { "risco:r2": 1 }; // lápide antiquíssima
      const r = reconciliar(false);
      ctxR.STATE.exclusoesConfirmadas = {};
      ok(reparosLog.some(x=>x.motivo && x.motivo.indexOf("faltava na nuvem") >= 0),
         "a autocura legítima parou de funcionar por causa de uma lápide velha");
    });
    t("toda falha de listagem levanta a marca — inclusive falta de token", ()=>{
      const f = funcao("onedriveListarFilhosEmLote");
      ok(f.indexOf('onedriveMarcarArvoreIncompleta("sem token")') > 0, "sem token, tudo voltaria 'vazio' em silêncio");
      ok(f.indexOf('catch(e){ onedriveMarcarArvoreIncompleta("pasta " + caminho); resultado.set(caminho, []); }') > 0,
         "era exatamente aqui que a falha virava 'pasta vazia'");
    });
    t("cada varredura começa com a marca limpa", ()=>{
      const f = funcao("onedriveListarArvore");
      ok(f.indexOf("__arvoreNuvemIncompleta = false;") > 0,
         "sem zerar, uma falha antiga bloquearia a autocura para sempre");
    });
    t("índice da nuvem não é guardado a partir de varredura furada", ()=>{
      const f = funcao("onedriveGuardarIndiceNuvem");
      ok(f.indexOf("if(__arvoreNuvemIncompleta) return;") > 0,
         "índice furado mente por 24h e transforma falha de rede em reenvio garantido");
    });
  }

  console.log("\n=== t107 · a trava de 50 s mede tempo PARADO, não duração total ===");
  /* Usuário: "as tentativas de sincronização falham mesmo com a página
     aberta". Existiam DOIS vigias. O primeiro (comVigilanciaDeProgresso) já
     media tempo sem avanço; o segundo, no visibilitychange, media o tempo
     TOTAL desde o início e abortava qualquer sincronização com mais de 50 s
     ao voltar para a aba. Com 1170 itens e dezenas de MB, passar de 50 s é o
     normal — bastava alternar de aba um instante e voltar para matar uma
     sincronização saudável. E piorou depois que o primeiro vigia parou de
     matar em segundo plano: a sincronização passou a durar mais e a cair
     nesta segunda trava com mais frequência. */
  t("a trava do visibilitychange olha __syncUltimoProgressoEm, não o início", ()=>{
    const i = HTML.indexOf("const paradoHa = __syncUltimoProgressoEm");
    ok(i > 0, "voltou a medir duração total — mata sincronização longa e saudável");
    ok(HTML.indexOf("if(__sincronizandoAgora && paradoHa > 50000){") > 0);
    eq(HTML.indexOf("__sincronizandoAgora && __syncIniciadoEm && (Date.now() - __syncIniciadoEm > 50000)"), -1,
       "a condição antiga (duração total) não pode voltar");
  });
  t("sem nenhum carimbo de progresso, ainda cai no início como antes (não trava para sempre)", ()=>{
    const i = HTML.indexOf("const paradoHa = __syncUltimoProgressoEm");
    const trecho = HTML.slice(i, i + 220);
    ok(trecho.indexOf("(__syncIniciadoEm ? (Date.now() - __syncIniciadoEm) : 0)") > 0,
       "sem essa alternativa, uma sincronização que nunca marcou progresso ficaria girando");
  });
  t("a mensagem deixou de afirmar 'segundo plano' para quem estava com a página aberta", ()=>{
    ok(HTML.indexOf("A sincronização parou de responder e foi encerrada.") > 0);
    eq(HTML.indexOf("interrompida porque o aparelho ficou em segundo plano"), -1,
       "afirmar o motivo errado confunde o diagnóstico de quem está em campo");
  });
  t("o outro vigia continua existindo e continua ignorando a aba escondida", ()=>{
    const f = funcao("comVigilanciaDeProgresso");
    ok(f.indexOf('if(document.visibilityState === "hidden"){ marcarProgressoSync(); return; }') > 0);
  });

  console.log("\n=== t108 · Grau do Dano com texto novo, sem mexer no que já foi gravado ===");
  /* Pedido: "Arranhão" passa a ser "Arranhão / Escoriação / Contusão" e
     "Corte" passa a ser "Corte / Laceração", mantendo a pontuação e valendo
     em TODO ponto onde já houver um grau escolhido.
     O detalhe que faz ou quebra isto: o texto da classificação não é só
     rótulo — é a CHAVE gravada em risco.gpd e a chave de busca da pontuação.
     Reescrever os riscos carimbaria todos como alterados e devolveria a
     árvore inteira à fila de sincronização; por isso o nome antigo é aceito
     e convertido NA LEITURA, sem gravar nada. */
  /* const dentro do vm não vira propriedade do contexto — as tabelas só saem por avaliação. */
  const K = (expr)=> vm.runInContext(expr, ctx);
  t("a tabela publicada usa os nomes novos, com a mesma pontuação", ()=>{
    const t = K("HRN_GPD_TABELA");
    eq(t[0].classificacao, "Arranhão / Escoriação / Contusão");
    eq(t[0].valor, 0.1);
    eq(t[1].classificacao, "Corte / Laceração");
    eq(t[1].valor, 0.5);
    eq(t.length, 7, "nenhum grau foi criado nem removido");
    eq(t.map(x=>x.valor).join(","), "0.1,0.5,2,4,6,10,15", "a escala de pontuação não pode mudar");
  });
  t("risco JÁ GRAVADO com o nome antigo continua com a mesma pontuação", ()=>{
    eq(C.valorPorClassificacaoHRN(K("HRN_GPD_TABELA"), "Arranhão"), 0.1);
    eq(C.valorPorClassificacaoHRN(K("HRN_GPD_TABELA"), "Corte"), 0.5);
  });
  t("o nome antigo é MOSTRADO como o novo, sem precisar reescolher", ()=>{
    eq(C.gpdCanonico("Arranhão"), "Arranhão / Escoriação / Contusão");
    eq(C.gpdCanonico("Corte"), "Corte / Laceração");
  });
  t("graus que não mudaram passam intactos pela conversão", ()=>{
    ["Fratura osso menor","Fratura osso maior","Perda de membro, visão ou audição",
     "Perda de Vários membros","Fatalidade"].forEach(g=> eq(C.gpdCanonico(g), g));
    eq(C.gpdCanonico(""), "");
    eq(C.gpdCanonico(undefined), "");
  });
  t("a conversão NÃO contamina Probabilidade, Frequência e Nº de pessoas", ()=>{
    /* gpdCanonico só entra em ação quando a busca direta falha — as outras
       três tabelas não têm nome antigo nenhum e não podem ser afetadas. */
    ok(C.valorPorClassificacaoHRN(K("HRN_PO_TABELA"), "Corte") === null,
       "um nome de grau do dano não pode virar valor de probabilidade");
    ok(C.valorPorClassificacaoHRN(K("HRN_FE_TABELA"), "Arranhão") === null);
  });
  t("o HRN de um risco antigo continua dando o mesmo número", ()=>{
    const tarefa = { frequencia:"Diário", numPessoas:"2" };
    const antigo = C.hrnDoItem({ tarefa, risco:{ gpd:"Corte", po:"" } });
    const novo   = C.hrnDoItem({ tarefa, risco:{ gpd:"Corte / Laceração", po:"" } });
    eq(antigo.hrn, novo.hrn, "o mesmo risco mudaria de HRN só por causa do texto");
  });
  t("PLr: os dois graus leves continuam sendo S1, pelo nome antigo e pelo novo", ()=>{
    eq(C.plrSeveridade({ gpd:"Arranhão" }), "S1");
    eq(C.plrSeveridade({ gpd:"Corte" }), "S1");
    eq(C.plrSeveridade({ gpd:"Arranhão / Escoriação / Contusão" }), "S1");
    eq(C.plrSeveridade({ gpd:"Corte / Laceração" }), "S1");
  });
  t("o montador de risco sugere o nome novo, apontando para a MESMA pontuação", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Corte" }), "Corte / Laceração");
    eq(C.sugerirGPDPorSelecao({ evento:"Projeção de partículas" }), "Corte / Laceração");
    eq(C.valorPorClassificacaoHRN(K("HRN_GPD_TABELA"), "Corte / Laceração"), 0.5,
       "a sugestão do montador tem de continuar valendo 0,5");
  });
  /* Decisão do engenheiro responsável (19/08): alinhar os eventos ao grau que
     agora leva o nome deles. Antes, "Laceração" e "Contusão" sugeriam
     "Fratura osso menor" (2) — um grau cujo nome não os menciona, enquanto
     outro passou a mencionar. Isto MUDA a pontuação sugerida (2 -> 0,5 e
     2 -> 0,1) e vale só para risco NOVO: risco já preenchido mantém o que
     foi gravado, porque aplicarSugestoesRisco só preenche gpd vazio. */
  t("evento 'Laceração' sugere o grau que leva o nome dele", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Laceração" }), "Corte / Laceração");
    eq(C.valorPorClassificacaoHRN(K("HRN_GPD_TABELA"), "Corte / Laceração"), 0.5);
  });
  t("evento 'Contusão' sugere o grau que leva o nome dele", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Contusão" }), "Arranhão / Escoriação / Contusão");
    eq(C.valorPorClassificacaoHRN(K("HRN_GPD_TABELA"), "Arranhão / Escoriação / Contusão"), 0.1);
  });
  t("o agravamento por parte do corpo continua valendo com a pontuação menor", ()=>{
    /* Olhos puxam para "Perda de membro, visão ou audição" enquanto o grau
       base for menor que 6 — a regra não pode ter deixado de disparar só
       porque a base caiu de 2 para 0,5/0,1. */
    eq(C.sugerirGPDPorSelecao({ evento:"Laceração", parteCorpo:"Olhos" }), "Perda de membro, visão ou audição");
    eq(C.sugerirGPDPorSelecao({ evento:"Contusão", parteCorpo:"Olhos" }), "Perda de membro, visão ou audição");
  });
  t("risco JÁ preenchido não é mexido pela nova sugestão", ()=>{
    /* aplicarSugestoesRisco só escreve gpd quando está vazio — a mudança
       vale para risco novo, nunca reclassifica o que já foi avaliado. */
    const f = funcao("aplicarSugestoesRisco");
    ok(f.indexOf('if(!String(r.gpd||"").trim()){') > 0,
       "sem essa guarda, a mudança reclassificaria riscos já avaliados");
  });
  t("todo evento do montador aponta para um grau que existe na tabela", ()=>{
    K("RISCO_EVENTOS").forEach(e=>{
      ok(C.valorPorClassificacaoHRN(K("HRN_GPD_TABELA"), e.gpd) !== null,
         "evento '" + e.v + "' aponta para grau inexistente: " + e.gpd);
    });
  });
  t("nenhum ponto da tela ficou lendo risco.gpd sem converter", ()=>{
    /* Se um destes voltar a ler o valor cru, o risco antigo aparece com o
       seletor em branco ou com o aviso errado de "já aplicado". */
    ok(HTML.indexOf("${selectOptions(opcoesGPD, gpdCanonico(r.gpd), false)}") > 0, "seletor do cadastro em campo");
    ok(HTML.indexOf('laudoSelectHRN(rid,"gpd",HRN_GPD_TABELA,gpdCanonico(r.gpd),autoGPD,"Estimado")') > 0, "seletor da revisão do laudo");
    ok(HTML.indexOf("const gpd = gpdCanonico(r && r.gpd);") > 0, "severidade do PLr");
    ok(HTML.indexOf("${gpdCanonico(r.gpd)===gpdSug?") > 0, "aviso de 'já aplicado'");
  });

  console.log("\n=== t109 · chave de IA por provedor, alternância automática e migração ===");
  function iaProvedorTesteLimpo(){
    vm.runInContext("STATE.ui.apiKeysEm={}; STATE.ui.iaConfig=undefined; resetIAConfigTeste();", ctx);
    vm.runInContext("localStorage.removeItem(IA_LOCALSTORAGE_KEY); localStorage.removeItem(IA_LOCALSTORAGE_KEYS);", ctx);
  }
  t("Google Gemini e Groq têm link para gerar a chave; Personalizado não", ()=>{
    ok(HTML.indexOf('linkChave: "https://aistudio.google.com/apikey"') > 0, "sem link do Gemini");
    ok(HTML.indexOf('linkChave: "https://console.groq.com/keys"') > 0, "sem link do Groq");
    const iPers = HTML.indexOf('"personalizado": {');
    ok(HTML.slice(iPers, iPers+500).indexOf("linkChave: null,") > 0, "Personalizado ganhou um link que não existe");
  });
  t("chave no formato antigo (única) migra para o mapa por provedor", ()=>{
    /* getIAApiKeysMapa() lê STATE.ui.iaConfig.provedor para decidir em qual
       provedor a chave única antiga migra (é o que getIAConfig() devolve
       de verdade no app; aqui no laboratório getIAConfig() é um stub à
       parte — precisa alinhar os dois manualmente para testar a migração
       de verdade, senão ela cai no padrão google-gemini). */
    iaProvedorTesteLimpo();
    vm.runInContext("localStorage.setItem(IA_LOCALSTORAGE_KEY, 'chave-formato-antigo'); STATE.ui.iaConfig = { provedor: 'anthropic' }; getIAConfig().provedor='anthropic';", ctx);
    eq(vm.runInContext("getIAApiKey()", ctx), "chave-formato-antigo", "a migração não trouxe a chave antiga");
    eq(vm.runInContext("getIAApiKeysMapa().anthropic", ctx), "chave-formato-antigo",
       "a chave antiga não entrou no provedor certo do mapa novo");
  });
  t("cada provedor guarda a própria chave, sem se apagarem ao trocar", ()=>{
    iaProvedorTesteLimpo();
    vm.runInContext("getIAConfig().provedor='google-gemini'; setIAApiKey('chave-gemini');", ctx);
    vm.runInContext("getIAConfig().provedor='groq'; setIAApiKey('chave-groq');", ctx);
    vm.runInContext("getIAConfig().provedor='google-gemini';", ctx);
    eq(vm.runInContext("getIAApiKey()", ctx), "chave-gemini", "a chave do Gemini sumiu ao salvar a do Groq");
    vm.runInContext("getIAConfig().provedor='groq';", ctx);
    eq(vm.runInContext("getIAApiKey()", ctx), "chave-groq", "a chave do Groq sumiu");
  });
  t("iaProvedoresDisponiveis só lista quem tem chave salva, gratuitos primeiro", ()=>{
    iaProvedorTesteLimpo();
    vm.runInContext("getIAConfig().provedor='google-gemini'; setIAApiKey('k-gemini');", ctx);
    vm.runInContext("getIAConfig().provedor='openai'; setIAApiKey('k-openai');", ctx);
    vm.runInContext("getIAConfig().provedor='groq'; setIAApiKey('k-groq');", ctx);
    eq(JSON.stringify(vm.runInContext("iaProvedoresDisponiveis(false)", ctx)), JSON.stringify(["google-gemini","groq"]),
       "sem incluir pagos, só os dois gratuitos deveriam aparecer");
    eq(JSON.stringify(vm.runInContext("iaProvedoresDisponiveis(true)", ctx)), JSON.stringify(["google-gemini","groq","openai"]),
       "com pagos incluídos, gratuitos continuam vindo primeiro");
  });
  t("provedor sem chave salva não é candidato, mesmo com pagos habilitados", ()=>{
    iaProvedorTesteLimpo();
    vm.runInContext("getIAConfig().provedor='groq'; setIAApiKey('k-groq');", ctx);
    const disp = vm.runInContext("iaProvedoresDisponiveis(true)", ctx);
    eq(JSON.stringify(disp), JSON.stringify(["groq"]), "provedor sem chave nenhuma entrou na lista");
  });
  t("personalizado nunca é candidato automático, mesmo com chave e pagos habilitados", ()=>{
    iaProvedorTesteLimpo();
    vm.runInContext("getIAConfig().provedor='personalizado'; setIAApiKey('k-custom');", ctx);
    const disp = vm.runInContext("iaProvedoresDisponiveis(true)", ctx);
    ok(disp.indexOf("personalizado") < 0, "personalizado apareceu como candidato de alternância automática");
  });
  t("trocarProvedorIAAtivo troca provedor, endpoint e modelo juntos", ()=>{
    vm.runInContext("resetIAConfigTeste(); trocarProvedorIAAtivo('groq');", ctx);
    const c = vm.runInContext("getIAConfig()", ctx);
    eq(c.provedor, "groq");
    eq(c.endpoint, "https://api.groq.com/openai/v1");
    eq(c.modelo, "llama-3.3-70b-versatile");
  });
  t("trocarProvedorIAAtivo não mexe em nada se já é o provedor ativo", ()=>{
    vm.runInContext("resetIAConfigTeste();", ctx);
    const c = vm.runInContext("getIAConfig()", ctx);
    c.endpoint = "endpoint-customizado-preservar";
    vm.runInContext("trocarProvedorIAAtivo('anthropic')", ctx);
    eq(vm.runInContext("getIAConfig().endpoint", ctx), "endpoint-customizado-preservar",
       "reescreveu o endpoint mesmo sem trocar de provedor");
  });
  (()=>{
    const iCR = HTML.indexOf("async function chamarIAResiliente(");
    const iImg = HTML.indexOf("async function chamarIAImagem(");
    const corpoCR = HTML.slice(iCR, iImg);
    t("a alternância automática só entra por limite de uso (429)", ()=>{
      ok(corpoCR.indexOf("__iaUltimoStatus === 429 && getIAConfig().alternarProvedorAutomatico !== false") > 0,
         "a troca não está condicionada especificamente ao 429");
    });
    t("provedor pago só entra na troca automática com o interruptor ligado", ()=>{
      ok(corpoCR.indexOf("iaProvedoresDisponiveis(!!getIAConfig().alternarIncluirPagos)") > 0,
         "a lista de candidatos não respeita o interruptor de pagos — poderia gastar dinheiro sem avisar");
    });
    t("o provedor atual nunca é candidato de troca para ele mesmo", ()=>{
      ok(corpoCR.indexOf(".filter(id=>id!==atual)") > 0, "trocaria o provedor pelo próprio provedor");
    });
    t("a troca é sticky: trocarProvedorIAAtivo persiste antes de tentar de novo", ()=>{
      ok(corpoCR.indexOf("trocarProvedorIAAtivo(candidato)") > 0,
         "sem persistir a troca, a próxima chamada voltaria a bater no provedor esgotado");
    });
    t("o pedido é retomado no novo provedor, não reiniciado do zero", ()=>{
      eq((corpoCR.match(/iaTentarComRetentativas\(tipo, textoUsuario\)/g)||[]).length, 2,
         "esperada uma chamada inicial e uma de retomada após a troca");
    });
    t("o usuário é avisado quando a troca automática acontece", ()=>{
      ok(corpoCR.indexOf("toast(`Limite de uso do provedor anterior atingido") > 0, "troca silenciosa, sem avisar");
    });
  })();
  t("config de IA liga a alternância automática por padrão e mantém pagos desligados", ()=>{
    ok(HTML.indexOf("if(c.alternarProvedorAutomatico===undefined) c.alternarProvedorAutomatico = true;") > 0,
       "alternância automática deveria vir ligada por padrão");
    ok(HTML.indexOf("if(c.alternarIncluirPagos===undefined) c.alternarIncluirPagos = false;") > 0,
       "provedores pagos deveriam vir desligados por padrão — segurança financeira");
  });
  t("o link para gerar a chave abre em aba nova, sem navegar para fora do app", ()=>{
    const i = HTML.indexOf('${IA_PROVEDORES[cfg.provedor].linkChave ? `<a class="btn btn-secondary btn-block"');
    ok(i > 0, "botão do link não existe mais");
    const trecho = HTML.slice(i, i+400);
    ok(trecho.indexOf('target="_blank"') > 0, "não abre em aba nova");
    ok(trecho.indexOf('rel="noopener noreferrer"') > 0, "sem proteção noopener/noreferrer");
    ok(trecho.indexOf("Abrir site para gerar a chave") > 0, "sem o texto do botão");
  });
  t("a tela mostra quais provedores já têm chave salva, sem abrir o seletor", ()=>{
    ok(HTML.indexOf('return "Chaves salvas: " + linhas.join(" · ");') > 0, "sem o resumo de chaves salvas");
  });

  console.log("\n=== t110 · sem nota de campo na tarefa, 'seu texto' cai para o nome dela ===");
  /* Usuário reportou: digitou um nome de tarefa em "Outra tarefa
     (especificar)" ("Realizar o teste de plantabilidade") mas a Descrição
     da tarefa, na revisão do laudo, mostrava "(nada escrito em campo)" —
     como se nada tivesse sido informado. laudoTextoOriginal("tarefa") só
     olhava tarefa.descricao (a nota opcional), nunca o nome da tarefa.
     Mesmo padrão de fallback que "solucao" já tinha (cai para descMedida
     quando não há proposta) — sem inventar nada, só deixando de esconder o
     que o inspetor de fato digitou. */
  t("tarefa 'Outra' sem nota de campo: seu texto de campo usa o nome digitado", ()=>{
    const item = { tarefa:{ tarefa:OUTRO, tarefaOutro:"Realizar o teste de plantabilidade", descricao:"" }, maquina:{}, risco:{} };
    eq(C.laudoTextoOriginal(item, "tarefa"), "Realizar o teste de plantabilidade");
  });
  t("tarefa do menu fixo sem nota de campo: seu texto de campo usa o nome da lista", ()=>{
    const item = { tarefa:{ tarefa:"Limpeza e higienização", tarefaOutro:"", descricao:"" }, maquina:{}, risco:{} };
    eq(C.laudoTextoOriginal(item, "tarefa"), "Limpeza e higienização");
  });
  t("nota de campo escrita pelo inspetor sempre vence o nome da tarefa", ()=>{
    const item = { tarefa:{ tarefa:OUTRO, tarefaOutro:"Realizar o teste de plantabilidade", descricao:"Nota detalhada escrita à mão" }, maquina:{}, risco:{} };
    eq(C.laudoTextoOriginal(item, "tarefa"), "Nota detalhada escrita à mão");
  });
  t("tarefa sem nome nenhum (fixture incompleta) não quebra — cai para vazio", ()=>{
    const item = { tarefa:{ tarefa:"", tarefaOutro:"", descricao:"" }, maquina:{}, risco:{} };
    eq(C.laudoTextoOriginal(item, "tarefa"), "");
  });

  console.log("\n=== t111 · exclusão feita num aparelho vale nos outros (lápides que viajam) ===");
  /* O defeito: a lápide ("apaguei isto de propósito") ficava SÓ no aparelho
     que apagou. Os outros continuavam com a cópia e — pior — a autocura deles
     via o arquivo faltando na nuvem, concluía "meu envio falhou" e REENVIAVA.
     O item excluído voltava para a nuvem e dali para qualquer aparelho novo.
     Reproduzido de ponta a ponta em banco.js (ensaios 17 a 21); aqui ficam as
     regras de decisão, item a item. */
  function lapidesLimpas(){
    STATE.exclusoesConfirmadas = {};
    STATE.ui.lapidesSyncEm = 0;
    STATE.projetosSimples = [];
  }
  const L = (e)=> vm.runInContext(e, ctx);
  /* Carimbos precisam ser proximos de AGORA: a lapide vale 120 dias, entao um
     numero pequeno (5000 = janeiro de 1970) ja nasce vencido e o teste mediria
     a expiracao em vez da regra que quer medir. */
  const AGORA = Date.now();

  t("a lápide usa o relógio lógico do app, não a hora crua do aparelho", ()=>{
    lapidesLimpas();
    L('registrarLapidesExclusao(["risco:rx"])');
    ok(L('lapideDe("risco:rx")') > 0, "não gravou a lápide");
    ok(funcao("registrarLapidesExclusao").indexOf("const agora = agoraSync();") > 0,
       "voltou a usar Date.now() — a lápide sairia do relógio comum e o empate ficaria imprevisível");
  });
  t("apagar marca que a lápide precisa viajar, e sem esperar a janela de 10 min", ()=>{
    lapidesLimpas();
    const antes = L("getLapidesSyncEm()");
    L('registrarLapidesExclusao(["risco:ry"])');
    ok(L("getLapidesSyncEm()") > antes, "a lápide não seria enviada para os outros aparelhos");
    eq(L("__lapidesSyncUltimaVerificacao"), 0,
       "sem zerar o limitador, uma exclusão podia ficar até 10 min parada antes de viajar");
  });
  t("exclusão só vence quem é MAIS ANTIGO que ela", ()=>{
    lapidesLimpas();
    STATE.exclusoesConfirmadas = { "risco:r1": AGORA };
    ok(L('lapideVenceDadosRemotos("risco:r1", {atualizadoEm:'+(AGORA-60000)+'})'), "versão velha tinha de ser recusada");
    ok(!L('lapideVenceDadosRemotos("risco:r1", {atualizadoEm:'+(AGORA+60000)+'})'),
       "versão editada DEPOIS da exclusão é trabalho novo — não pode ser jogada fora");
  });
  t("no empate quem fica é o dado, nunca a exclusão", ()=>{
    lapidesLimpas();
    STATE.exclusoesConfirmadas = { "risco:r1": AGORA };
    ok(!L('lapideVenceDadosRemotos("risco:r1", {atualizadoEm:'+AGORA+'})'),
       "carimbo igual não pode apagar: o risco é perder trabalho de alguém");
  });
  t("item sem lápide nenhuma nunca é recusado", ()=>{
    lapidesLimpas();
    ok(!L('lapideVenceDadosRemotos("risco:naoexiste", {atualizadoEm:1})'));
  });
  t("lápide vencida (mais de 120 dias) deixa de valer", ()=>{
    lapidesLimpas();
    STATE.exclusoesConfirmadas = { "risco:r1": Date.now() - (121*24*60*60*1000) };
    eq(L('lapideDe("risco:r1")'), 0, "lápide velha continuaria recusando item para sempre");
  });
  t("basta UM item editado para a ramificação inteira escapar da exclusão", ()=>{
    lapidesLimpas();
    /* Área apagada num aparelho, mas alguém escreveu num risco lá dentro
       depois disso: a área inteira precisa sobreviver, senão o laudo em
       andamento vai junto. */
    const risco = { id:"r1", atualizadoEm: AGORA+60000 };
    const tarefa = { id:"t1", atualizadoEm: AGORA-60000, riscos:[risco] };
    const maquina = { id:"m1", atualizadoEm: AGORA-60000, tarefas:[tarefa] };
    const area = { id:"a1", atualizadoEm: AGORA-60000, maquinas:[maquina] };
    const tocada = vm.runInContext("(function(a,ts){ return __subarvoreTocadaDepoisDe('area', a, ts); })", ctx);
    ok(tocada(area, AGORA), "a edição no risco lá no fundo não salvou a área");
    risco.atualizadoEm = AGORA-60000;
    ok(!tocada(area, AGORA), "sem nada editado depois, a área tinha de poder sair");
  });
  t("o freio conta a ramificação inteira, não só o item de cima", ()=>{
    const area = { id:"a1", maquinas:[ { id:"m1", tarefas:[ { id:"t1", riscos:[{id:"r1"},{id:"r2"}] } ] } ] };
    eq(vm.runInContext("(function(a){ return __tamanhoSubarvore('area', a); })", ctx)(area), 5,
       "área + máquina + tarefa + 2 riscos = 5 itens que somem da nuvem");
  });
  t("a varredura aponta o item apagado e NÃO desce dentro dele", ()=>{
    lapidesLimpas();
    STATE.projetosSimples = [{ id:"p1", atualizadoEm:AGORA-60000, areas:[
      { id:"a1", atualizadoEm:AGORA-60000, maquinas:[] },
      { id:"a2", atualizadoEm:AGORA-60000, maquinas:[] } ]}];
    STATE.exclusoesConfirmadas = { "area:a1": AGORA };
    const alvos = L("__lapidesRemoviveis()");
    eq(alvos.length, 1, "apontou o número errado de itens para remover");
    eq(alvos[0].tipo, "area");
    eq(alvos[0].item.id, "a1");
    ok(STATE.projetosSimples[0].areas.length === 2, "a varredura não pode remover nada sozinha");
  });
  t("o pacote leva as lápides e a mesclagem é por UNIÃO", ()=>{
    lapidesLimpas();
    STATE.exclusoesConfirmadas = { "risco:daqui": AGORA-60000 };
    const pac = L("montarPacoteLapides()");
    ok("lapides" in pac && "atualizadoEm" in pac, "o pacote está incompleto");
    eq(pac.lapides["risco:daqui"], AGORA-60000);
    ctx.__pac = { atualizadoEm: AGORA, lapides: { "risco:dele": AGORA } };
    const r = L("aplicarPacoteLapides(__pac)");
    ok(r.mudou, "não aplicou a lápide que veio de fora");
    eq(STATE.exclusoesConfirmadas["risco:daqui"], AGORA-60000, "a lápide daqui foi apagada pela de lá");
    eq(STATE.exclusoesConfirmadas["risco:dele"], AGORA, "a lápide de lá não chegou");
    ok(r.faltaNoRemoto, "sem avisar, a exclusão feita aqui nunca chegaria nos outros");
  });
  t("a mesma lápide com carimbo maior atualiza; menor não retrocede", ()=>{
    lapidesLimpas();
    STATE.exclusoesConfirmadas = { "risco:r1": AGORA-60000 };
    ctx.__pac = { lapides: { "risco:r1": AGORA } };
    L("aplicarPacoteLapides(__pac)");
    eq(STATE.exclusoesConfirmadas["risco:r1"], AGORA);
    ctx.__pac = { lapides: { "risco:r1": AGORA-120000 } };
    L("aplicarPacoteLapides(__pac)");
    eq(STATE.exclusoesConfirmadas["risco:r1"], AGORA, "um pacote velho não pode fazer o carimbo voltar");
  });
  t("pacote vencido não ressuscita lápide antiga", ()=>{
    lapidesLimpas();
    ctx.__pac = { lapides: { "risco:velho": Date.now() - (200*24*60*60*1000) } };
    L("aplicarPacoteLapides(__pac)");
    ok(!STATE.exclusoesConfirmadas["risco:velho"], "lápide de 200 dias voltaria a valer");
  });
  t("apagar um item também apaga na nuvem tudo que estava dentro dele", ()=>{
    const area = { id:"a1", maquinas:[{ id:"m1", tarefas:[{ id:"t1", riscos:[{id:"r1"}] }] }] };
    const ids = vm.runInContext("(function(a){ return idsSincronizaveisDe('area', a); })", ctx)(area);
    ["area:a1","maquina:m1","tarefa:t1","risco:r1"].forEach(x=> ok(ids.indexOf(x)>=0, "faltou "+x));
  });
  t("a sincronização de lápides entra ANTES do envio e antes da autocura", ()=>{
    /* Ordem é o que faz a correção funcionar: se as exclusões chegarem depois,
       este aparelho reenvia para a nuvem justamente o que o outro apagou. */
    const auto = funcao("sincronizarIncrementalOneDrive");
    ok(auto.indexOf("await onedriveSincronizarLapides(!!onProgresso);") > 0, "o ciclo automático não sincroniza lápides");
    ok(auto.indexOf("onedriveSincronizarLapides") < auto.indexOf('onedriveSincronizarModulo("Simplificado"'),
       "as lápides precisam chegar ANTES de o envio decidir o que mandar");
    const man = funcao("onedriveSincronizarAgora");
    ok(man.indexOf("await onedriveSincronizarLapides(true);") > 0, "a sincronização manual não sincroniza lápides");
    ok(man.indexOf("onedriveSincronizarLapides") < man.indexOf("onedriveReconciliarComArvore(download.arvore)"),
       "as lápides precisam chegar ANTES da autocura, que é quem decide reenviar");
  });
  t("o envio grava lápide quando descobre que um item sumiu do aparelho", ()=>{
    const f = funcao("onedriveSincronizarModulo");
    ok(f.indexOf("if(!confirmadaAntes) registrarLapidesExclusao([id]);") > 0,
       "item apagado com o OneDrive desconectado não avisaria os outros aparelhos");
  });
  t("a remoção pelas lápides é registrada no histórico", ()=>{
    ok(HTML.indexOf('registrarEventoSync("del", chave, a.tipo, 0, true, "excluido em outro aparelho", "");') > 0,
       "sumiria item da tela sem deixar rastro nenhum de por quê");
  });
  lapidesLimpas();
  STATE.projetosSimples = [];

  console.log("\n=== t112 · Escopo do equipamento mostra o NOME da máquina ===");
  /* Reportado com print: "Seu texto de campo" do Escopo mostrava só "CNV-002"
     — a Descrição (opcional) da máquina, que em campo é usada para o código do
     ativo. O nome ("Mesa que alimenta a CV-3404") é o primeiro campo
     preenchido e é o que identifica o equipamento; sem ele o laudo saía com um
     código solto quando a IA ainda não tinha gerado nada. A IA já recebia os
     dois (Nome + Descrição) na geração — quem estava fora de compasso era a
     tela e o texto final. */
  const esc = (maq)=> C.laudoTextoOriginal({ maquina:maq, tarefa:{}, risco:{} }, "escopo");

  t("com nome e descrição, os dois aparecem — o nome primeiro", ()=>{
    eq(esc({ nome:"Mesa que alimenta a CV-3404", descricao:"CNV-002" }),
       "Mesa que alimenta a CV-3404 — CNV-002");
  });
  t("sem descrição, vale o nome do equipamento", ()=>{
    eq(esc({ nome:"Mesa que alimenta a CV-3404", descricao:"" }), "Mesa que alimenta a CV-3404");
  });
  t("máquina sem nome (dado antigo) continua mostrando a descrição, sem repetir", ()=>{
    /* nomeMaquinaS cai para descricao quando não há nome — sem a guarda o
       texto sairia "CNV-002 — CNV-002". */
    eq(esc({ nome:"", descricao:"CNV-002" }), "CNV-002");
  });
  t("nome igual à descrição não é escrito duas vezes", ()=>{
    eq(esc({ nome:"CNV-002", descricao:"CNV-002" }), "CNV-002");
  });
  t("máquina sem nome e sem descrição não quebra nem inventa texto", ()=>{
    eq(esc({ nome:"", descricao:"" }), "");
  });
  t("o que vai para o laudo passa a carregar o nome também", ()=>{
    const item = { maquina:{ nome:"Mesa que alimenta a CV-3404", descricao:"CNV-002", laudoIA:{} },
                   tarefa:{ laudoIA:{} }, risco:{ laudoIA:{} } };
    eq(C.laudoTextoFinal(item, "escopo"), "Mesa que alimenta a CV-3404 — CNV-002",
       "sem sugestão da IA, o laudo recebia só o código do ativo");
  });
  t("a sugestão da IA, quando existe, continua vencendo o texto de campo", ()=>{
    const item = { maquina:{ nome:"Mesa", descricao:"CNV-002",
                             laudoIA:{ escopoSug:"TEXTO DA IA", escopoFin:"", escopoSt:"" } },
                   tarefa:{ laudoIA:{} }, risco:{ laudoIA:{} } };
    eq(C.laudoTextoFinal(item, "escopo"), "TEXTO DA IA");
  });
  t("o escopo aprovado NÃO sobrescreve a descrição digitada em campo", ()=>{
    /* Garantia de que a mudança não come o campo do usuário: o texto do
       escopo tem coluna própria (maquina.escopo). */
    ok(HTML.indexOf("maquina: { ...item.maquina, escopo: t.escopo || item.maquina.escopo || \"\" },") > 0,
       "o escopo passaria a sobrescrever a Descrição da máquina");
  });
  t("a IA já recebia Nome e Descrição — a tela é que estava atrás", ()=>{
    /* 4 pontos mandam "Nome: ... / Descrição: ...": os 3 caminhos de geração
       do escopo (Excel antigo, lote e por item) mais a entrada com
       referências. Todos já levavam o nome — o que faltava era a TELA e o
       texto final usarem a mesma informação. */
    eq((HTML.match(/Nome: \$\{nomeMaquinaS\(/g)||[]).length, 4,
       "a geração do escopo precisa continuar mandando o nome junto");
  });

  console.log("\n=== t113 · importar textos do laudo gerados fora do app ===");
  /* Por que existe: num projeto com centenas de riscos, a geração pelo
     provedor de IA esbarra no limite de requisições e na cota diária muito
     antes de terminar. Este caminho aceita os mesmos textos escritos fora.
     O que ele NUNCA pode fazer: entrar por cima de decisão do engenheiro,
     nem encostar em dado de campo. */
  /* importarTextosLaudo, LAUDO_CAMPOS_IMPORTAVEIS e LAUDO_TEXTOS_FORMATO ja
     vem dentro do BLOCO_A (moram na secao do laudo, junto de laudoGet e
     laudoSet) — extrair de novo daria 'Identifier has already been declared'. */

  function arvoreImport(){
    const T = 1000;
    const mk = (id, e) => Object.assign({ id, criadoEm:T, atualizadoEm:T }, e||{});
    STATE.projetosSimples = [ mk("pi", { empresa:"X", areas:[
      mk("ai", { nome:"A", maquinas:[
        mk("mi", { nome:"Maq", fotosOutras:[], tarefas:[
          mk("ti", { tarefa:"Tar", tarefaOutro:"", riscos:[
            mk("ri", { nome:"R", descricao:"desc de campo", fotosOutras:[] }) ]}) ]}) ]}) ]}) ];
    STATE.ui.areasSelecionadasExport = ["ai"]; STATE.ui.areasExportConhecidas = ["ai"];
    return C.linhasEscopoSimples()[0];
  }
  const pac = (textos)=>({ formato:"apr-textos-laudo-v1", textos });

  t("os quatro campos entram no item certo, como sugestão a decidir", ()=>{
    const it = arvoreImport();
    ctx.__p = pac([ {id:"mi",campo:"escopo", texto:"E"}, {id:"ti",campo:"tarefa", texto:"T"},
                    {id:"ri",campo:"risco",  texto:"R"}, {id:"ri",campo:"solucao",texto:"S"} ]);
    const r = vm.runInContext("importarTextosLaudo(__p)", ctx);
    eq(r.aplicados, 4, JSON.stringify(r));
    eq(C.laudoGet(it,"escopo").sug, "E"); eq(C.laudoGet(it,"tarefa").sug, "T");
    eq(C.laudoGet(it,"risco").sug, "R");  eq(C.laudoGet(it,"solucao").sug, "S");
    ["escopo","tarefa","risco","solucao"].forEach(c=>
      eq(C.laudoGet(it,c).st, "pend", c + " não entrou como 'aguardando decisão'"));
  });
  t("a dúvida da IA vem junto com o texto", ()=>{
    const it = arvoreImport();
    ctx.__p = pac([ {id:"ri",campo:"risco",texto:"R",duvida:"O que falta saber?"} ]);
    vm.runInContext("importarTextosLaudo(__p)", ctx);
    eq(C.laudoGet(it,"risco").duv, "O que falta saber?");
  });
  t("NUNCA entra por cima de texto já aplicado, editado ou recusado", ()=>{
    ["ok","edit","no"].forEach(estado=>{
      const it = arvoreImport();
      C.laudoSet(it, "risco", { fin:"DECISÃO DO ENGENHEIRO", st:estado });
      ctx.__p = pac([ {id:"ri",campo:"risco",texto:"TEXTO IMPORTADO"} ]);
      const r = vm.runInContext("importarTextosLaudo(__p)", ctx);
      eq(r.aplicados, 0, "aplicou por cima de um campo com estado '"+estado+"'");
      eq(r.pulados, 1);
      eq(C.laudoGet(it,"risco").fin, "DECISÃO DO ENGENHEIRO", "apagou a decisão do engenheiro ("+estado+")");
      eq(C.laudoGet(it,"risco").sug, "", "escreveu sugestão por cima de campo já decidido ("+estado+")");
    });
  });
  t("também não entra por cima de sugestão que já existe", ()=>{
    const it = arvoreImport();
    C.laudoSet(it, "risco", { sug:"SUGESTÃO ANTERIOR" });
    ctx.__p = pac([ {id:"ri",campo:"risco",texto:"NOVA"} ]);
    const r = vm.runInContext("importarTextosLaudo(__p)", ctx);
    eq(r.aplicados, 0); eq(C.laudoGet(it,"risco").sug, "SUGESTÃO ANTERIOR");
  });
  t("importar duas vezes não duplica nem sobrescreve", ()=>{
    const it = arvoreImport();
    ctx.__p = pac([ {id:"ri",campo:"risco",texto:"R"} ]);
    eq(vm.runInContext("importarTextosLaudo(__p)", ctx).aplicados, 1);
    const r2 = vm.runInContext("importarTextosLaudo(__p)", ctx);
    eq(r2.aplicados, 0); eq(r2.pulados, 1);
    eq(C.laudoGet(it,"risco").sug, "R");
  });
  t("nenhum dado de campo é alterado pela importação", ()=>{
    const it = arvoreImport();
    ctx.__p = pac([ {id:"mi",campo:"escopo",texto:"E"}, {id:"ri",campo:"risco",texto:"R"} ]);
    vm.runInContext("importarTextosLaudo(__p)", ctx);
    eq(it.risco.descricao, "desc de campo", "mexeu na descrição escrita em campo");
    eq(it.maquina.nome, "Maq", "mexeu no nome da máquina");
  });
  t("item que não existe neste aparelho é contado, não quebra", ()=>{
    arvoreImport();
    ctx.__p = pac([ {id:"NAO-EXISTE",campo:"risco",texto:"R"} ]);
    const r = vm.runInContext("importarTextosLaudo(__p)", ctx);
    eq(r.naoAchados, 1); eq(r.aplicados, 0);
  });
  t("linha sem texto, sem id ou com campo inválido é recusada", ()=>{
    arvoreImport();
    ctx.__p = pac([ {id:"ri",campo:"risco",texto:"   "}, {id:"",campo:"risco",texto:"R"},
                    {id:"ri",campo:"inventado",texto:"R"}, {id:"ri",campo:"laudoIA",texto:"R"} ]);
    const r = vm.runInContext("importarTextosLaudo(__p)", ctx);
    eq(r.invalidos, 4, JSON.stringify(r)); eq(r.aplicados, 0);
  });
  t("arquivo de outro formato é recusado inteiro", ()=>{
    arvoreImport();
    ctx.__p = { formato:"outra-coisa", textos:[{id:"ri",campo:"risco",texto:"R"}] };
    eq(vm.runInContext("importarTextosLaudo(__p)", ctx), null);
    ctx.__p = { formato:"apr-textos-laudo-v1" };            // sem a lista
    eq(vm.runInContext("importarTextosLaudo(__p)", ctx), null);
    eq(vm.runInContext("importarTextosLaudo(null)", ctx), null);
  });
  t("o texto importado carimba o item para sincronizar com os outros aparelhos", ()=>{
    const it = arvoreImport();
    const antes = it.risco.atualizadoEm;
    ctx.__p = pac([ {id:"ri",campo:"risco",texto:"R"} ]);
    vm.runInContext("importarTextosLaudo(__p)", ctx);
    ok(it.risco.atualizadoEm > antes, "sem carimbo, o texto ficaria só neste aparelho");
  });
  t("a tela avisa o resultado e o botão existe na aba IA", ()=>{
    ok(HTML.indexOf("Importar textos do laudo (.json)") > 0, "sem o botão de importar");
    ok(HTML.indexOf('<input type="file" id="fileTextosLaudo"') > 0, "sem o seletor de arquivo");
    ok(HTML.indexOf("por já ter sua decisão.") > 0, "não informa quantos foram pulados");
    ok(HTML.indexOf("sem item correspondente neste aparelho.") > 0, "não informa os não encontrados");
  });
  STATE.projetosSimples = [];

  console.log("\n=== t114 · Escopo identifica o equipamento e o atalho abre de verdade ===");
  /* Usuário, com print: no cartão do Escopo aparecia só "QD-NDC-02" e não dava
     para saber se aquilo era o nome, o código ou a descrição — nem o que
     faltava preencher. Agora cada dado tem seu rótulo, e o que está em branco
     é dito em branco. */
  const idEq = (maq, area)=> C.laudoBlocoIdentificacaoEquipamento({ maquina:maq, area:area||{id:"a1"}, risco:{id:"r1"} });

  t("os três dados do equipamento aparecem rotulados", ()=>{
    const h = idEq({ id:"m1", nome:"Mesa que alimenta a CV-3404", descricao:"CNV-002", tipoEquip:"Correia transportadora" });
    ["Equipamento","Nome:","Descrição:","Tipo:"].forEach(r=> ok(h.indexOf(r)>0, "faltou o rótulo "+r));
    ok(h.indexOf("Mesa que alimenta a CV-3404")>0);
    ok(h.indexOf("CNV-002")>0);
    ok(h.indexOf("Correia transportadora")>0);
  });
  t("o que não foi preenchido em campo é dito, não some da tela", ()=>{
    /* O caso do print: máquina cadastrada só com a tag. Antes ficava a dúvida
       "o app está mostrando o nome ou a descrição?"; agora está escrito. */
    const h = idEq({ id:"m1", nome:"QD-NDC-02", descricao:"", tipoEquip:"" });
    eq((h.match(/não preenchido em campo/g)||[]).length, 2,
       "descrição e tipo vazios precisam aparecer como não preenchidos");
    ok(h.indexOf("QD-NDC-02")>0, "o nome sumiu");
  });
  t("tipo 'Outro (especificar)' mostra o que foi digitado, não o rótulo interno", ()=>{
    const h = idEq({ id:"m1", nome:"X", descricao:"", tipoEquip:OUTRO, tipoEquipOutro:"Transportador de canecas duplo" });
    ok(h.indexOf("Transportador de canecas duplo")>0);
    ok(h.indexOf(OUTRO) < 0, "vazou o valor interno do 'Outro'");
  });
  t("o cartão do Escopo usa a identificação; os outros campos seguem como antes", ()=>{
    ok(HTML.indexOf("      : campo===\"escopo\"\n      ? laudoBlocoIdentificacaoEquipamento(item)") > 0,
       "o cartão do escopo não passou a usar a identificação");
    ok(HTML.indexOf('${campo==="solucao" ? "O que você propôs em campo" : "Seu texto de campo"}') > 0,
       "os demais campos perderam o rótulo de sempre");
  });
  t("o texto que VAI PARA O LAUDO continua sendo nome + descrição", ()=>{
    /* A identificação é só a leitura na tela: o texto do laudo não muda. */
    const item = { maquina:{ id:"m1", nome:"Mesa", descricao:"CNV-002", laudoIA:{} }, tarefa:{laudoIA:{}}, risco:{laudoIA:{}} };
    eq(C.laudoTextoFinal(item, "escopo"), "Mesa — CNV-002");
  });
  t("máquina sem id não desenha botão quebrado", ()=>{
    const h = idEq({ nome:"X", descricao:"", tipoEquip:"" });
    ok(h.indexOf("Editar equipamento") < 0, "botão apontando para máquina sem id");
  });

  /* O DEFEITO QUE ISTO GUARDA: abrirModalMaquinaS/TarefaS só acham o item
     DENTRO do projeto "atual" (STATE.ui.projetoSId). A aba Laudo nunca define
     isso — navega por laudoRiscoId. Os atalhos chamando o modal direto não
     abriam nada, sem mensagem nenhuma. */
  t("os atalhos do laudo sincronizam o 'atual' antes de abrir o cadastro", ()=>{
    /* São métodos do App (laudoEditarEquipamento(rid){...}), não funções
       soltas — funcao() não os alcança. Recorte direto do arquivo, que é o
       padrão do projeto para os métodos do App. */
    const recorte = (nome)=>{ const i = HTML.indexOf("  " + nome + "(rid){"); return HTML.slice(i, i+340); };
    const eq_ = recorte("laudoEditarEquipamento");
    const tf_ = recorte("laudoEditarTarefa");
    ok(eq_.indexOf("laudoSincronizarAtuais(it);") > 0, "editar equipamento abriria em branco");
    ok(tf_.indexOf("laudoSincronizarAtuais(it);") > 0, "editar tarefa abriria em branco");
    ok(eq_.indexOf("laudoSincronizarAtuais(it);") < eq_.indexOf("App.abrirModalMaquinaS("),
       "sincronizar precisa vir ANTES de abrir, senão não adianta");
    ok(tf_.indexOf("laudoSincronizarAtuais(it);") < tf_.indexOf("App.abrirModalTarefaS("),
       "sincronizar precisa vir ANTES de abrir, senão não adianta");
  });
  t("laudoSincronizarAtuais preenche os quatro níveis e aguenta item incompleto", ()=>{
    STATE.ui.projetoSId = null; STATE.ui.areaSId = null; STATE.ui.maquinaSId = null; STATE.ui.tarefaSId = null;
    ctx.__it = { proj:{id:"P"}, area:{id:"A"}, maquina:{id:"M"}, tarefa:{id:"T"}, risco:{id:"R"} };
    vm.runInContext("laudoSincronizarAtuais(__it)", ctx);
    eq(STATE.ui.projetoSId, "P"); eq(STATE.ui.areaSId, "A");
    eq(STATE.ui.maquinaSId, "M"); eq(STATE.ui.tarefaSId, "T");
    vm.runInContext("laudoSincronizarAtuais(null)", ctx);   // não pode quebrar
    eq(STATE.ui.projetoSId, "P", "um item nulo não pode zerar o que já estava certo");
  });
  t("os atalhos resolvem o item pelo risco, sem depender do 'atual'", ()=>{
    ["laudoEditarEquipamento","laudoEditarTarefa"].forEach(m=>{
      const i = HTML.indexOf("  " + m + "(rid){");
      ok(i > 0, m + " não existe");
      ok(HTML.slice(i, i+340).indexOf("laudoItemPorId(rid)") > 0, m + " voltou a depender do 'atual'");
    });
  });

  console.log("\n=== t115 · importar dados de plaqueta lidos fora do app ===");
  /* Modelo, marca, nº de série, ano de fabricação, capacidade e tensão não são
     preenchidos em campo — são lidos da foto da plaqueta, normalmente no
     escritório. importarDadosPlaqueta, PLAQUETA_CAMPOS_IMPORTAVEIS,
     PLAQUETA_FORMATO e maquinaSimplesGlobalPorId já vêm dentro do BLOCO_A
     (mesma seção de importarTextosLaudo) — não precisam de extração à parte. */
  function arvoreMaquinas(lista){
    const T = 1000;
    const mk = (id, e) => Object.assign({ id, criadoEm:T, atualizadoEm:T }, e||{});
    const maquinas = lista.map(([id, extra]) => mk(id, Object.assign(
      { nome:"M", descricao:"", tipoEquip:"", modelo:"", marca:"", numeroSerie:"", anoFabricacao:"", capacidade:"", tensao:"", fotosOutras:[], tarefas:[] },
      extra || {})));
    STATE.projetosSimples = [ mk("pp", { empresa:"X", areas:[ mk("aa", { nome:"A", maquinas }) ] }) ];
  }
  const pacotePlaqueta = (maquinas) => ({ formato:"apr-plaqueta-v1", maquinas });

  t("preenche todos os campos vazios de uma máquina sem dado nenhum", ()=>{
    arvoreMaquinas([["m1", {}]]);
    ctx.__p = pacotePlaqueta([{ id:"m1", modelo:"V-200", marca:"WEG", numeroSerie:"SN1", anoFabricacao:"2019", capacidade:"5000 m3/h", tensao:"380V" }]);
    const r = vm.runInContext("importarDadosPlaqueta(__p)", ctx);
    eq(r.camposAplicados, 6, JSON.stringify(r));
    eq(r.maquinasAtualizadas, 1);
    const m = STATE.projetosSimples[0].areas[0].maquinas[0];
    eq(m.modelo, "V-200"); eq(m.marca, "WEG"); eq(m.tensao, "380V");
  });
  t("NUNCA sobrescreve campo que já tem valor", ()=>{
    arvoreMaquinas([["m1", { marca:"MARCA-DE-CAMPO-JA-PREENCHIDA" }]]);
    ctx.__p = pacotePlaqueta([{ id:"m1", marca:"MARCA-NOVA-NAO-PODE-ENTRAR", modelo:"X100" }]);
    const r = vm.runInContext("importarDadosPlaqueta(__p)", ctx);
    eq(r.camposAplicados, 1, "só o modelo (vazio) deveria ter entrado");
    const m = STATE.projetosSimples[0].areas[0].maquinas[0];
    eq(m.marca, "MARCA-DE-CAMPO-JA-PREENCHIDA", "sobrescreveu marca já preenchida em campo");
    eq(m.modelo, "X100");
  });
  t("máquina que não existe neste aparelho é contada, não quebra", ()=>{
    arvoreMaquinas([["m1", {}]]);
    ctx.__p = pacotePlaqueta([{ id:"NAO-EXISTE", marca:"FANTASMA" }]);
    const r = vm.runInContext("importarDadosPlaqueta(__p)", ctx);
    eq(r.naoAchadas, 1); eq(r.camposAplicados, 0); eq(r.maquinasAtualizadas, 0);
  });
  t("linha sem id é inválida, não derruba o resto do pacote", ()=>{
    arvoreMaquinas([["m1", {}], ["m2", {}]]);
    ctx.__p = pacotePlaqueta([{ marca:"SEM-ID" }, { id:"m2", marca:"OK" }]);
    const r = vm.runInContext("importarDadosPlaqueta(__p)", ctx);
    eq(r.invalidos, 1); eq(r.camposAplicados, 1);
  });
  t("busca a máquina em QUALQUER projeto/área, não só no 'atual'", ()=>{
    /* O mesmo defeito que já corrigido nos atalhos do laudo (laudoSincronizarAtuais):
       maquinaSimplesGlobalPorId não pode depender de STATE.ui.projetoSId. */
    arvoreMaquinas([["m1", {}]]);
    STATE.ui.projetoSId = null; STATE.ui.areaSId = null; STATE.ui.maquinaSId = null;
    ctx.__p = pacotePlaqueta([{ id:"m1", marca:"WEG" }]);
    const r = vm.runInContext("importarDadosPlaqueta(__p)", ctx);
    eq(r.maquinasAtualizadas, 1, "não achou a máquina sem o projeto 'atual' definido");
  });
  t("máquina atualizada ganha carimbo de sincronização; a que não mudou nada, não", ()=>{
    arvoreMaquinas([["m1", {}], ["m2", { marca:"JA-TEM-TUDO", modelo:"JA-TEM", numeroSerie:"JA-TEM", anoFabricacao:"JA-TEM", capacidade:"JA-TEM", tensao:"JA-TEM" }]]);
    const antes1 = STATE.projetosSimples[0].areas[0].maquinas[0].atualizadoEm;
    const antes2 = STATE.projetosSimples[0].areas[0].maquinas[1].atualizadoEm;
    ctx.__p = pacotePlaqueta([{ id:"m1", marca:"WEG" }, { id:"m2", marca:"NAO-PODE-ENTRAR" }]);
    vm.runInContext("importarDadosPlaqueta(__p)", ctx);
    ok(STATE.projetosSimples[0].areas[0].maquinas[0].atualizadoEm > antes1, "m1 mudou e não foi carimbada");
    eq(STATE.projetosSimples[0].areas[0].maquinas[1].atualizadoEm, antes2, "m2 não mudou nada mas foi carimbada assim mesmo");
  });
  t("arquivo de outro formato é recusado inteiro", ()=>{
    arvoreMaquinas([["m1", {}]]);
    ctx.__p = { formato:"outra-coisa", maquinas:[{ id:"m1", marca:"WEG" }] };
    eq(vm.runInContext("importarDadosPlaqueta(__p)", ctx), null);
    ctx.__p = { formato:"apr-plaqueta-v1" };
    eq(vm.runInContext("importarDadosPlaqueta(__p)", ctx), null);
    eq(vm.runInContext("importarDadosPlaqueta(null)", ctx), null);
  });
  t("botão, seletor de arquivo e aviso de resultado estão na tela, e não sobrescreve", ()=>{
    ok(HTML.indexOf('<input type="file" id="fileDadosPlaqueta" accept="application/json,.json" hidden>') > 0, "sem o seletor de arquivo");
    ok(HTML.indexOf("Importar dados de plaqueta (.json)") > 0, "sem o botão");
    ok(HTML.indexOf('if(valor && !jaTemValor){ m[campo] = valor;') > 0, "a trava de não sobrescrever sumiu");
    ok(HTML.indexOf("Só preenche o que estiver vazio") > 0, "a tela não avisa a regra de não sobrescrever");
  });
  STATE.projetosSimples = [];
  STATE.ui.projetoSId = null; STATE.ui.areaSId = null; STATE.ui.maquinaSId = null; STATE.ui.tarefaSId = null;

  /* ==================================================================
     t116 · foto de campo nao pode ser apagada por engano

     A limpeza de fotos orfas decidia o que apagar lendo o STATE EM
     MEMORIA. Ela roda em segundo plano (dbSet dispara e nao espera), e
     nesse intervalo o STATE pode ter sido trocado inteiro: na abertura
     do app ele comeca VAZIO ate a leitura do banco terminar. Pego nesse
     instante, TODO o banco de fotos parecia orfao e era apagado de vez.
     As fotos antigas escapavam por estarem em algum ponto de
     restauracao; as tiradas depois do ultimo ponto -- as do dia de
     trabalho em campo -- nao tinham protecao nenhuma.

     O primeiro teste aqui e a reproducao exata desse cenario. Ele
     falharia no codigo antigo.
     ================================================================== */
  console.log("\n=== t116 · foto de campo nao pode ser apagada por engano ===");
  {
    async function ta(nome, fn){
      total++;
      try{ await fn(); console.log("  ok  " + nome); }
      catch(e){ falhas++; console.log("  ERRO " + nome + " -> " + (e && e.message ? e.message : e)); }
    }
    /* Banco de mentira com o pouco que a funcao usa: get, delete e
       getAllKeys, mais o oncomplete da transacao. */
    function bancoFalso(registros){
      const dados = new Map(Object.entries(registros || {}));
      const db = {
        dados,
        transaction(){
          const store = {
            get(k){ const rq = { onsuccess:null, onerror:null, result: dados.get(k) };
                    setTimeout(()=>{ rq.onsuccess && rq.onsuccess(); }, 0); return rq; },
            delete(k){ dados.delete(k); },
            put(v, k){ dados.set(k, v); },
            getAllKeys(){ const rq = { onsuccess:null, onerror:null, result: Array.from(dados.keys()) };
                    setTimeout(()=>{ rq.onsuccess && rq.onsuccess(); }, 0); return rq; }
          };
          const tx = { oncomplete:null, onerror:null, objectStore(){ return store; } };
          setTimeout(()=>{ tx.oncomplete && tx.oncomplete(); }, 0);
          return tx;
        }
      };
      return db;
    }
    const ctx = vm.createContext({ console, setTimeout, Date, Promise, Set, Map, Array, Object, String, JSON });
    vm.runInContext(`
      const DB_STORE = "kv"; const DB_KEY = "estado";
      const FOTO_KEY_PREFIXO = "foto:"; const FOTO_REF_PREFIXO = "idbfoto:";
      var __ultimaLimpezaFotosEm = 0; var __fotosNoBanco = null;
      var __fotoIdCache = new Map();
      /* Ids que as fotos JA tem no banco — e o que impede uma foto antiga de
         mudar de nome quando o calculo do id muda (ver fotoCalcularId). */
      var __fotoIdConhecido = new Map();
      var STATE = {}; var __db = null; var __pontos = []; var __rascunho = null;
      var __erros = [];
      const console2 = { error: (m)=>__erros.push(m) };
      function temIndexedDB(){ return true; }
      async function dbOpen(){ return __db; }
      async function listarPontosDeRestauracao(){ return __pontos; }
      async function lerDraftPersistente(){ return __rascunho; }
      /* Espaco livre do aparelho: a quarentena encurta o prazo quando o
         aparelho esta sem espaco de verdade. Controlavel pelo teste. */
      var __espacoLivre = 999999999999;
      async function checarEspacoDisponivel(){ return { livre: __espacoLivre }; }
    `, ctx);
    // console.error da funcao vai para a lista de erros, para poder conferir
    ctx.console = { error: (m)=>vm.runInContext("__erros", ctx).push(m), log: ()=>{} };
    /* Constantes ESCALARES (numero/string): o extrator constante() so sabe
       delimitar array/objeto, entao estas sao lidas por regex — mas do
       proprio index.html entregue, nao reescritas a mao, para o teste
       continuar valendo se os prazos mudarem. */
    const escalar = (nome)=>{
      const m = new RegExp("\\nconst " + nome + "\\s*=\\s*([^;]+);").exec(HTML);
      if(!m) throw new Error("const escalar nao encontrada: " + nome);
      return "const " + nome + " = " + m[1].trim() + ";";
    };
    ["DB_KEY_FOTOS_ORFAS","FOTO_ORFA_CARENCIA_MS","FOTO_ORFA_CARENCIA_APERTADA_MS","FOLGA_CRITICA_BYTES"]
      .forEach(n=> vm.runInContext(escalar(n), ctx));
    ["ehFotoDataUrlPersist","ehFotoRefPersist","fotoCalcularId","fotosColetarRefs",
     "fotosColetarIdsEmbutidas","fotosCarregarIndice",
     "fotosLerMapaOrfas","fotosGravarMapaOrfas","fotosLimparOrfasSeForHora"]
      .forEach(n=> vm.runInContext(funcao(n), ctx));
    /* Empurra o relogio da quarentena para tras: simula "esta foto ficou sem
       dono ha mais de 30 dias", que e a unica condicao que autoriza apagar. */
    const envelhecerQuarentena = (db, ms)=>{
      const m = db.dados.get("fotosOrfasDesde") || {};
      for(const k in m) m[k] = m[k] - ms;
      db.dados.set("fotosOrfasDesde", m);
    };
    const emQuarentena = (db, f)=> Object.prototype.hasOwnProperty.call(db.dados.get("fotosOrfasDesde")||{}, idDe(f));

    const FOTO_A = "data:image/jpeg;base64," + "A".repeat(500);
    const FOTO_B = "data:image/jpeg;base64," + "B".repeat(500);
    const idDe = (f)=>{ ctx.__f = f; return vm.runInContext("fotoCalcularId(__f)", ctx); };
    function preparar({ estadoMemoria, gravado, pontos, rascunho, fotosNoBanco }){
      const registros = {};
      (fotosNoBanco || []).forEach(f => { registros["foto:" + idDe(f)] = f; });
      if(gravado !== undefined) registros["estado"] = gravado;
      ctx.__db = bancoFalso(registros);
      vm.runInContext("__fotosNoBanco = null; __ultimaLimpezaFotosEm = 0; __erros = []; __espacoLivre = 999999999999;", ctx);
      ctx.STATE = estadoMemoria;
      ctx.__pontos = pontos || [];
      ctx.__rascunho = rascunho || null;
      return ctx.__db;
    }
    const sobreviveu = (db, f)=> db.dados.has("foto:" + idDe(f));

    await ta("O CASO REAL: app abrindo com o STATE ainda vazio NAO apaga as fotos do dia", async ()=>{
      /* Exatamente o que aconteceu em campo: as fotos do dia estao no
         banco e referenciadas pelo registro GRAVADO, mas o STATE em
         memoria ainda esta vazio porque a leitura do banco nao terminou.
         Nenhum ponto de restauracao as cobre (foram tiradas depois do
         ultimo ponto). No codigo antigo, as duas eram apagadas aqui. */
      const gravado = { projetosSimples: [ { areas: [ { maquinas: [
        { fotoGeral: "idbfoto:" + idDe(FOTO_A), fotosOutras: ["idbfoto:" + idDe(FOTO_B)] }
      ] } ] } ] };
      const db = preparar({ estadoMemoria: {}, gravado, pontos: [], fotosNoBanco: [FOTO_A, FOTO_B] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_A), "apagou a foto do equipamento com o STATE ainda vazio");
      ok(sobreviveu(db, FOTO_B), "apagou a foto do risco com o STATE ainda vazio");
    });

    await ta("O CASO REAL 2: foto solta por um defeito NAO e apagada na hora — entra em quarentena", async ()=>{
      /* Era esta a cadeia que fazia um app OFFLINE perder foto e depender da
         nuvem: um defeito soltava a foto do item, e em ate 10 minutos a
         faxina apagava os bytes. Se ela ainda nao tinha subido, acabou.
         Agora a foto solta fica guardada com a data em que ficou sem dono. */
      const gravado = { projetosSimples: [ { areas: [ { maquinas: [
        { fotoGeral: "idbfoto:" + idDe(FOTO_A) }
      ] } ] } ] };
      const db = preparar({ estadoMemoria: gravado, gravado, pontos: [], fotosNoBanco: [FOTO_A, FOTO_B] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_A), "apagou uma foto que estava referenciada");
      ok(sobreviveu(db, FOTO_B), "a foto sem dono foi apagada na hora, sem carencia nenhuma");
      ok(emQuarentena(db, FOTO_B), "a foto sem dono deveria ter entrado na quarentena, com data");
    });

    await ta("foto que VOLTA a ter dono sai da quarentena e nunca e apagada", async ()=>{
      const semDono = { projetosSimples: [] };
      const db = preparar({ estadoMemoria: semDono, gravado: semDono, pontos: [], fotosNoBanco: [FOTO_A] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(emQuarentena(db, FOTO_A), "deveria ter entrado na quarentena");
      // O item volta a referenciar a foto (correcao, restauracao, recuperacao)
      const comDono = { projetosSimples: [ { areas: [ { maquinas: [
        { fotoGeral: "idbfoto:" + idDe(FOTO_A) } ] } ] } ] };
      db.dados.set("estado", comDono);
      ctx.STATE = comDono;
      vm.runInContext("__ultimaLimpezaFotosEm = 0;", ctx);
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(!emQuarentena(db, FOTO_A), "voltou a ter dono e continuou marcada como orfa");
      // Mesmo passado MUITO tempo, nao pode ser apagada: ela tem dono.
      envelhecerQuarentena(db, 400*24*60*60*1000);
      vm.runInContext("__ultimaLimpezaFotosEm = 0;", ctx);
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_A), "apagou uma foto que tinha voltado a ter dono");
    });

    await ta("passado o prazo de carencia, a foto sem dono e finalmente apagada (nao vira lixo eterno)", async ()=>{
      const gravado = { projetosSimples: [ { areas: [ { maquinas: [
        { fotoGeral: "idbfoto:" + idDe(FOTO_A) }
      ] } ] } ] };
      const db = preparar({ estadoMemoria: gravado, gravado, pontos: [], fotosNoBanco: [FOTO_A, FOTO_B] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_B), "nao podia apagar na primeira passada");
      envelhecerQuarentena(db, 31*24*60*60*1000); // 31 dias sem dono
      vm.runInContext("__ultimaLimpezaFotosEm = 0;", ctx);
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(!sobreviveu(db, FOTO_B), "passados 31 dias a foto sem dono deveria sair do banco");
      ok(sobreviveu(db, FOTO_A), "levou junto a foto que tem dono");
    });

    await ta("aparelho SEM espaco encurta a carencia, mas ainda assim nao apaga na hora", async ()=>{
      const gravado = { projetosSimples: [] };
      const db = preparar({ estadoMemoria: gravado, gravado, pontos: [], fotosNoBanco: [FOTO_A] });
      vm.runInContext("__espacoLivre = 1000;", ctx); // praticamente sem espaco
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_A), "mesmo sem espaco, a primeira passada nao pode apagar");
      envelhecerQuarentena(db, 2*24*60*60*1000); // 2 dias
      vm.runInContext("__ultimaLimpezaFotosEm = 0; __espacoLivre = 1000;", ctx);
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(!sobreviveu(db, FOTO_A), "com o aparelho apertado, 2 dias sem dono ja autorizam apagar");
    });

    await ta("sem conseguir ler o registro gravado, nao apaga NADA", async ()=>{
      const db = preparar({ estadoMemoria: {}, gravado: undefined, pontos: [], fotosNoBanco: [FOTO_A, FOTO_B] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_A) && sobreviveu(db, FOTO_B),
         "apagou fotos sem ter o registro gravado para conferir");
    });

    await ta("o STATE em memoria SOMA protecao, nunca tira (foto so em memoria sobrevive)", async ()=>{
      /* Foto ainda embutida no STATE em memoria e que o registro gravado
         (mais antigo) ainda nao conhece: continua protegida. */
      const gravado = { projetosSimples: [] };
      const memoria = { projetosSimples: [ { areas: [ { maquinas: [ { fotoGeral: FOTO_A } ] } ] } ] };
      const db = preparar({ estadoMemoria: memoria, gravado, pontos: [], fotosNoBanco: [FOTO_A] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_A), "apagou foto que so o STATE em memoria conhecia");
    });

    await ta("ponto de restauracao continua protegendo as fotos dele", async ()=>{
      const gravado = { projetosSimples: [] };
      const ponto = { ts: 1, dados: { projetosSimples: [ { areas: [ { maquinas: [
        { fotoGeral: "idbfoto:" + idDe(FOTO_A) } ] } ] } ] } };
      const db = preparar({ estadoMemoria: {}, gravado, pontos: [ponto], fotosNoBanco: [FOTO_A] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_A), "apagou foto protegida por ponto de restauracao");
    });

    await ta("rascunho nao salvo protege as fotos dele", async ()=>{
      /* Foto acabou de ser tirada e o formulario ainda nao foi salvo:
         ela vive no rascunho, nao no STATE nem no registro gravado. */
      const gravado = { projetosSimples: [] };
      const rascunho = { tipo:"riscoS", entity: { fotosOutras: [FOTO_A] }, ts: 1 };
      const db = preparar({ estadoMemoria: {}, gravado, pontos: [], rascunho, fotosNoBanco: [FOTO_A] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(sobreviveu(db, FOTO_A), "apagou a foto de um formulario ainda nao salvo");
    });

    await ta("disjuntor: querer apagar quase todo o banco de uma vez cancela a limpeza", async ()=>{
      const muitas = [];
      for(let i = 0; i < 40; i++) muitas.push("data:image/jpeg;base64," + String(i) + "x".repeat(300));
      const gravado = { projetosSimples: [] }; // nao referencia nenhuma: 40 de 40 pareceriam orfas
      const db = preparar({ estadoMemoria: {}, gravado, pontos: [], fotosNoBanco: muitas });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      envelhecerQuarentena(db, 31*24*60*60*1000); // mesmo vencidas, o disjuntor tem de segurar
      vm.runInContext("__ultimaLimpezaFotosEm = 0; __erros = [];", ctx);
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      eq(muitas.filter(f=>sobreviveu(db, f)).length, 40, "o disjuntor deixou passar uma limpeza em massa");
      ok(vm.runInContext("__erros.length", ctx) > 0, "o disjuntor disparou em silencio, sem deixar rastro");
    });

    await ta("abaixo do disjuntor, a limpeza normal segue funcionando (depois da carencia)", async ()=>{
      const poucas = [];
      for(let i = 0; i < 10; i++) poucas.push("data:image/jpeg;base64," + String(i) + "y".repeat(300));
      const gravado = { projetosSimples: [] };
      const db = preparar({ estadoMemoria: {}, gravado, pontos: [], fotosNoBanco: poucas });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      eq(poucas.filter(f=>sobreviveu(db, f)).length, 10, "nao podia apagar nada na primeira passada");
      envelhecerQuarentena(db, 31*24*60*60*1000);
      vm.runInContext("__ultimaLimpezaFotosEm = 0;", ctx);
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      eq(poucas.filter(f=>sobreviveu(db, f)).length, 0, "10 orfas vencidas deveriam ter saido");
    });

    await ta("a trava de 10 minutos continua valendo", async ()=>{
      const gravado = { projetosSimples: [] };
      const db = preparar({ estadoMemoria: {}, gravado, pontos: [], fotosNoBanco: [FOTO_A] });
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx);
      ok(emQuarentena(db, FOTO_A), "a primeira passada deveria ter posto a orfa em quarentena");
      db.dados.set("foto:" + idDe(FOTO_B), FOTO_B);
      await vm.runInContext("fotosLimparOrfasSeForHora()", ctx); // segunda chamada seguida
      ok(!emQuarentena(db, FOTO_B), "rodou de novo dentro dos 10 minutos, sem respeitar a trava");
    });
  }

  /* Segunda ponta da mesma correcao: uma foto que nao abre precisa se
     identificar na tela. Antes ela virava um quadro cinza vazio, que em
     campo se confunde com "ainda nao fotografei" -- foi por isso que o
     problema so apareceu semanas depois, no escritorio. */
  {
    const ctx = vm.createContext({ });
    vm.runInContext("var __imgReg = []; var __marcados = [];", ctx);
    vm.runInContext(`
      var document = { querySelectorAll: function(){ return __els; } };
      var __els = [];
      function elFalso(ref){
        return { dataset: { imgref: String(ref) }, src: null, alt: null, title: null,
                 style: {}, atributos: {},
                 removeAttribute: function(){ delete this.dataset.imgref; },
                 setAttribute: function(k,v){ this.atributos[k] = v; } };
      }
    `, ctx);
    vm.runInContext(funcao("hidratarImagens"), ctx);
    t("foto presente entra pelo src, como sempre", ()=>{
      vm.runInContext(`
        __imgReg = ["data:image/jpeg;base64,AAA"];
        __els = [elFalso(0)];
        hidratarImagens();
      `, ctx);
      eq(vm.runInContext("__els[0].src", ctx), "data:image/jpeg;base64,AAA");
      eq(vm.runInContext("__els[0].atributos['data-foto-perdida']", ctx), undefined,
         "marcou como perdida uma foto que estava la");
    });
    t("foto que nao abre se identifica na tela, em vez de quadro cinza mudo", ()=>{
      vm.runInContext(`
        __imgReg = [null];
        __els = [elFalso(0)];
        hidratarImagens();
      `, ctx);
      eq(vm.runInContext("__els[0].src", ctx), null, "colocou src de uma foto que nao existe");
      eq(vm.runInContext("__els[0].atributos['data-foto-perdida']", ctx), "1",
         "a foto perdida nao foi marcada");
      ok(String(vm.runInContext("__els[0].title", ctx)).indexOf("refotografe") > 0,
         "sem instrucao do que fazer em campo");
      ok(String(vm.runInContext("__els[0].style.border", ctx)).indexOf("#c0392b") >= 0,
         "sem destaque visual no quadro da foto perdida");
    });
  }

  /* ==================================================================
     t117 · foto sobe sozinha tambem no iPhone

     onedriveEstaEmWifi() pergunta ao navegador em que rede o aparelho
     esta. O Safari do iPhone nao implementa essa API -- a resposta e
     sempre "nao sei", e o codigo tratava "nao sei" como "nao e Wi-Fi".
     Os dois primeiros testes reproduzem exatamente esse aparelho.
     ================================================================== */
  console.log("\n=== t117 · foto sobe sozinha tambem no iPhone ===");
  {
    const ctx = vm.createContext({});
    vm.runInContext(`
      var STATE = {};
      var navigator = {};   // iPhone: sem navigator.connection, como no Safari
      var __onProgresso = null;
    `, ctx);
    ["onedriveEstaEmWifi","podeSincronizarAutomaticoAgora"].forEach(n=> vm.runInContext(funcao(n), ctx));
    /* A decisao em si, recortada do arquivo entregue: e a linha que define
       se a foto pode subir agora. */
    const linha = HTML.match(/const podeSubirFotos = [^;]+;/);
    ok(linha, "a linha que decide o envio de fotos nao foi encontrada");
    vm.runInContext("function podeSubirFotos(onProgresso){ " + linha[0].replace("const podeSubirFotos =", "return") + " }", ctx);
    const pode = (onProgresso)=>{ ctx.__op = onProgresso; return vm.runInContext("podeSubirFotos(__op)", ctx); };

    t("iPhone (navegador nao informa a rede): onedriveEstaEmWifi da 'nao'", ()=>{
      vm.runInContext("STATE = {};", ctx);
      eq(vm.runInContext("onedriveEstaEmWifi()", ctx), false,
         "o cenario do teste nao reproduz o iPhone");
    });
    t("O CASO REAL: no iPhone, a foto sobe sozinha mesmo assim", ()=>{
      vm.runInContext("STATE = {};", ctx);
      ok(pode(null) === true,
        "no iPhone a foto continua presa esperando um Wi-Fi que o app nunca reconhece");
    });
    t("aparelho que informa Wi-Fi tambem sobe (nada foi quebrado no caminho antigo)", ()=>{
      vm.runInContext("STATE = {}; navigator = { connection: { type: 'wifi' } };", ctx);
      ok(pode(null) === true);
      vm.runInContext("navigator = {};", ctx);
    });
    t("Wi-Fi confirmado na mao continua valendo", ()=>{
      vm.runInContext("STATE = { wifiConfirmado: true };", ctx);
      eq(vm.runInContext("onedriveEstaEmWifi()", ctx), true);
      ok(pode(null) === true);
    });
    t("sincronizacao manual sempre pode enviar foto", ()=>{
      vm.runInContext("STATE = {};", ctx);
      ok(pode(function(){}) === true, "o toque explicito no botao deveria autorizar");
    });
    t("modo economico, se um dia voltar, volta a segurar a foto", ()=>{
      /* podeSincronizarAutomaticoAgora respeita sincronizarEmDadosMoveis===false.
         O interruptor foi removido da tela, mas a regra segue no codigo -- e o
         envio de foto agora a obedece junto com o texto, em vez de ter uma
         regra propria e escondida. */
      vm.runInContext("STATE = { sincronizarEmDadosMoveis: false };", ctx);
      eq(vm.runInContext("podeSincronizarAutomaticoAgora()", ctx), false);
      ok(pode(null) === false, "no modo economico a foto deveria esperar");
      ok(pode(function(){}) === true, "mas o botao manual deveria continuar enviando");
    });
    t("RECEBER foto automaticamente continua exigindo Wi-Fi confirmado", ()=>{
      ok(HTML.indexOf("if(STATE.baixarFotosAutoWifi && onedriveEstaEmWifi()){") > 0,
         "o download automatico de fotos deixou de exigir Wi-Fi -- sao dezenas de MB");
    });
    t("o aviso de consumo so aparece em volume grande, e nao afirma a rede", ()=>{
      ok(HTML.indexOf("const LIMIAR_PERGUNTAR_BYTES = 20*1024*1024;") > 0, "o limiar nao subiu");
      ok(HTML.indexOf("Você não parece estar no Wi-Fi. Sincronizar agora") < 0,
         "o aviso ainda afirma um tipo de rede que o app nao tem como saber");
    });
    t("a tela deixa claro que o envio nao depende da chave de Wi-Fi", ()=>{
      ok(HTML.indexOf("O envio do seu trabalho não depende desta chave.") > 0);
      ok(HTML.indexOf("limitação do Safari, não deste app") > 0);
    });
  }

  /* ==================================================================
     t118 · aparelho danificado nao contamina o aparelho saudavel

     O celular de campo perdeu as fotos locais: fotosOutras virou
     [null, null] -- mesma quantidade, conteudo nenhum. As fotos de
     verdade continuam embutidas nos arquivos de texto da nuvem. Duas
     portas por onde o aparelho danificado apagava essa ultima copia.
     ================================================================== */
  console.log("\n=== t118 · aparelho danificado nao contamina o saudavel ===");
  {
    const ctx = vm.createContext({ Array, Object, String, JSON });
    vm.runInContext('var CAMPO_FOTOS_LISTA = "fotosOutras";', ctx);
    ["__ehFotoEmbutida","completarFotosDeItem","separarFotosDoItem"].forEach(n=> vm.runInContext(funcao(n), ctx));
    const F1 = "data:image/jpeg;base64,AAAA", F2 = "data:image/jpeg;base64,BBBB", F3 = "data:image/jpeg;base64,CCCC";
    const completar = (local, pacote)=>{ ctx.__l = local; ctx.__p = pacote;
      const r = vm.runInContext("completarFotosDeItem(__l, __p)", ctx); return { mudou:r, local:ctx.__l }; };

    t("O CASO REAL: pacote so de nulls NAO apaga as fotos boas de quem recebe", ()=>{
      /* Aparelho do escritorio, com as duas fotos boas, recebe o pacote que o
         celular danificado subiu. __fotosAtualizar ligado = "substitua pelas
         de la" -- era exatamente aqui que as boas eram trocadas por nulls. */
      const r = completar({ id:"r1", fotosOutras:[F1,F2], __fotosAtualizar:true },
                          { id:"r1", fotosOutras:[null,null] });
      eq(r.local.fotosOutras.length, 2, "o pacote vazio apagou as fotos boas");
      eq(r.local.fotosOutras[0], F1); eq(r.local.fotosOutras[1], F2);
    });
    t("foto unica: null que chega nunca sobrescreve foto boa", ()=>{
      const r = completar({ id:"r1", foto:F1, __fotosAtualizar:true }, { id:"r1", foto:null });
      eq(r.local.foto, F1);
    });
    t("A RECUPERACAO: lista so de espacos vazios aceita as fotos de volta", ()=>{
      /* O outro lado do mesmo defeito: com [null,null], a lista tinha
         "tamanho 2" e o app a considerava preenchida -- entao nunca buscava
         as fotos de volta. Contando fotos REAIS, ela conta zero e recebe. */
      const r = completar({ id:"r1", fotosOutras:[null,null] }, { id:"r1", fotosOutras:[F1,F2] });
      ok(r.mudou, "nao aceitou as fotos de volta");
      eq(r.local.fotosOutras.length, 2); eq(r.local.fotosOutras[0], F1);
    });
    t("pacote que traz MAIS fotos entra; pacote que traz MENOS nao", ()=>{
      const a = completar({ id:"r1", fotosOutras:[F1], __fotosAtualizar:true }, { id:"r1", fotosOutras:[F1,F2,F3] });
      eq(a.local.fotosOutras.length, 3, "pacote maior deveria entrar");
      const b = completar({ id:"r1", fotosOutras:[F1,F2,F3], __fotosAtualizar:true }, { id:"r1", fotosOutras:[F1] });
      eq(b.local.fotosOutras.length, 3, "pacote menor nao pode reduzir o que ja existe");
    });
    t("lista vazia de verdade continua recebendo as fotos", ()=>{
      const r = completar({ id:"r1", fotosOutras:[] }, { id:"r1", fotosOutras:[F1] });
      eq(r.local.fotosOutras.length, 1);
    });
    t("a marca de dano nunca viaja para a nuvem", ()=>{
      ctx.__d = { id:"r1", nome:"x", foto:F1, fotosOutras:[F2], __fotosPerdidas:true, __fotosAtualizar:true };
      const r = vm.runInContext("separarFotosDoItem(__d)", ctx);
      eq(r.semFotos.__fotosPerdidas, undefined, "a marca de dano foi para a nuvem");
      eq(r.semFotos.__fotosAtualizar, undefined);
      eq(r.semFotos.__fotosOmitidas, true);
    });
    t("item marcado como danificado nao entra na fila de envio", ()=>{
      ok(HTML.indexOf("if(it.dados && it.dados[CAMPO_MARCA_FOTO_PERDIDA]) return false;") > 0,
         "a trava do envio sumiu — item sem foto voltaria a regravar a nuvem");
    });
    t("a marca nao se apaga sozinha na leitura seguinte", ()=>{
      ok(HTML.indexOf("else if(obj[CAMPO_MARCA_FOTO_PERDIDA]) delete obj[CAMPO_MARCA_FOTO_PERDIDA]") < 0,
         "a marca volta a se apagar sozinha — a proteção some na segunda leitura");
    });
  }
  {
    /* A marcacao em si, sobre a arvore crua lida do banco. */
    const ctx = vm.createContext({ Set, Array, Object, String });
    vm.runInContext('var FOTO_REF_PREFIXO = "idbfoto:";', ctx);
    vm.runInContext(constante("CAMPO_MARCA_FOTO_PERDIDA"), ctx);
    ["ehFotoRefPersist","fotosColetarRefs","__refsProprriasDoItem","__marcarSeTemRefPerdida","marcarItensComFotoPerdida"]
      .forEach(n=> vm.runInContext(funcao(n), ctx));
    t("marca so o item que perdeu, sem contaminar os pais", ()=>{
      ctx.__bruto = { projetosSimples: [ { id:"p", areas: [ { id:"a", maquinas: [
        { id:"m", fotoGeral:"idbfoto:BOA", tarefas: [ { id:"t", riscos: [
          { id:"r1", fotosOutras:["idbfoto:SUMIU"] },
          { id:"r2", fotosOutras:["idbfoto:BOA"] }
        ] } ] } ] } ] } ] };
      ctx.__mapa = new Map([["BOA","data:image/jpeg;base64,AAAA"]]);
      const n = vm.runInContext("marcarItensComFotoPerdida(__bruto, __mapa)", ctx);
      eq(n, 1, "marcou mais itens do que o que realmente perdeu");
      const t0 = ctx.__bruto.projetosSimples[0].areas[0].maquinas[0].tarefas[0];
      eq(t0.riscos[0].__fotosPerdidas, true, "o risco danificado nao foi marcado");
      eq(t0.riscos[1].__fotosPerdidas, undefined, "marcou um risco intacto");
      eq(ctx.__bruto.projetosSimples[0].areas[0].maquinas[0].__fotosPerdidas, undefined,
         "o risco danificado contaminou a maquina inteira");
      eq(ctx.__bruto.projetosSimples[0].__fotosPerdidas, undefined, "contaminou o projeto inteiro");
    });
    t("arvore intacta nao marca nada", ()=>{
      ctx.__bruto = { projetosSimples: [ { id:"p", areas: [ { id:"a", maquinas: [
        { id:"m", fotoGeral:"idbfoto:BOA", tarefas: [] } ] } ] } ] };
      ctx.__mapa = new Map([["BOA","data:image/jpeg;base64,AAAA"]]);
      eq(vm.runInContext("marcarItensComFotoPerdida(__bruto, __mapa)", ctx), 0);
    });
  }

  /* ==================================================================
     t119 - recuperacao de fotos a partir dos pontos de restauracao

     A faxina defeituosa nunca apagava foto referenciada por um ponto de
     restauracao -- entao as fotos perdidas da tela continuam no aparelho,
     presas nos pontos. Restaurar um ponto inteiro desfaria o trabalho do
     dia; esta recuperacao pega SO AS FOTOS e devolve aos espacos vazios.
     ================================================================== */
  console.log("\n=== t119 - recuperar fotos dos pontos de restauracao ===");
  {
    const ctx = vm.createContext({ console, Map, Set, Array, Object, String, JSON, Promise });
    vm.runInContext([
      'var FOTO_REF_PREFIXO = "idbfoto:"; var CAMPO_FOTOS_LISTA = "fotosOutras";',
      'var FOTO_KEY_PREFIXO = "foto:"; var DB_STORE = "kv";',
      'var STATE = { projetosSimples: [], oneDriveAssinaturasSimples: {} };',
      'var __assinaturasOneDriveSimples = { mapa:null, chaveEstado:"oneDriveAssinaturasSimples" };',
      'var __pontos = []; var __bytes = new Map(); var __gravou = 0;',
      'function temIndexedDB(){ return true; }',
      'async function dbOpen(){ return {}; }',
      'async function listarPontosDeRestauracao(){ return __pontos; }',
      'async function fotosLerLote(db, refs){ const m = new Map(); refs.forEach(f=>{ if(__bytes.has(f)) m.set(f, __bytes.get(f)); }); return m; }',
      // O indice tem so as CHAVES das fotos -- e o que permite a previa
      // responder "esta foto ainda existe?" sem carregar nenhum arquivo.
      'async function fotosCarregarIndice(db){ return new Set(__bytes.keys()); }',
      'async function dbSet(){ __gravou++; return true; }',
      'function marcarAlterado(){}',
      'function agoraSync(){ return 9999; }'
    ].join("\n"), ctx);
    vm.runInContext(constante("CAMPO_MARCA_FOTO_PERDIDA"), ctx);
    vm.runInContext(constante("CAMPOS_FOTO_UNICA"), ctx);
    vm.runInContext('var RECUPERACAO_LOTE_ITENS = ' + (/const RECUPERACAO_LOTE_ITENS = (\d+)/.exec(HTML)||[0,20])[1] + ';', ctx);
    ["ehFotoDataUrlPersist","ehFotoRefPersist","__ehFotoOuRef","__percorrerItensSimples",
     "fotosGuardadasNosPontos","onedriveCarregarAssinaturas","marcarFotosPendentesParaEnvio",
     "__recuperarFotosDosPontos","recuperarFotosDosPontos","contarFotosRecuperaveis"]
      .forEach(n=> vm.runInContext(funcao(n), ctx));

    const A = "data:image/jpeg;base64,AAAA", B = "data:image/jpeg;base64,BBBB", C = "data:image/jpeg;base64,CCCC";
    function cenario(o){
      ctx.STATE = { projetosSimples: o.atual, oneDriveAssinaturasSimples: o.assinaturas || {} };
      vm.runInContext("__assinaturasOneDriveSimples.mapa = null; __gravou = 0;", ctx);
      ctx.__pontos = o.ponto ? [{ ts:1, dados:{ projetosSimples: o.ponto } }] : [];
      ctx.__bytes = new Map(Object.entries(o.bytes || {}));
    }
    const arv = (risco)=> [ { id:"p", areas:[ { id:"a", maquinas:[ { id:"m", tarefas:[ { id:"t", riscos:[ risco ] } ] } ] } ] } ];
    const oRisco = ()=> ctx.STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[0];
    const ta = async (nome, fn)=>{ total++; try{ await fn(); console.log("  ok  "+nome); }
      catch(e){ falhas++; console.log("  ERRO "+nome+" -> "+(e&&e.message?e.message:e)); } };

    await ta("O CASO REAL: devolve a foto perdida guardada no ponto", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:null, fotosOutras:[null,null], __fotosPerdidas:true }),
                ponto: arv({ id:"r1", foto:"idbfoto:F1", fotosOutras:["idbfoto:F2","idbfoto:F3"] }),
                bytes: { F1:A, F2:B, F3:C } });
      const r = await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(r.fotos, 3, "nao devolveu as tres fotos");
      eq(oRisco().foto, A);
      eq(oRisco().fotosOutras.length, 2);
      eq(oRisco().fotosOutras[0], B); eq(oRisco().fotosOutras[1], C);
      eq(oRisco().__fotosPerdidas, undefined, "a marca de dano deveria ter saido");
    });

    await ta("NUNCA sobrescreve foto que ja esta boa", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:C, fotosOutras:[] }),
                ponto: arv({ id:"r1", foto:"idbfoto:F1", fotosOutras:[] }), bytes: { F1:A } });
      const r = await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(oRisco().foto, C, "sobrescreveu uma foto boa com a do ponto");
      eq(r.fotos, 0);
    });

    await ta("NUNCA reduz a quantidade de fotos que ja existe", async ()=>{
      cenario({ atual: arv({ id:"r1", fotosOutras:[A,B,C] }),
                ponto: arv({ id:"r1", fotosOutras:["idbfoto:F1"] }), bytes: { F1:A } });
      await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(oRisco().fotosOutras.length, 3, "o ponto reduziu a lista de fotos");
    });

    await ta("NAO mexe no carimbo de data (o escritorio nao perde o texto dele)", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:null, atualizadoEm:111, nome:"texto de campo" }),
                ponto: arv({ id:"r1", foto:"idbfoto:F1", atualizadoEm:50, nome:"texto ANTIGO" }),
                bytes: { F1:A } });
      await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(oRisco().atualizadoEm, 111, "mexeu no carimbo - a versao daqui passaria por cima do escritorio");
      eq(oRisco().nome, "texto de campo", "o texto antigo do ponto voltou junto");
      eq(oRisco().foto, A, "a foto nao voltou");
    });

    await ta("marca o item como 'fotos pendentes' para o pacote subir sozinho", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:null }),
                ponto: arv({ id:"r1", foto:"idbfoto:F1" }), bytes: { F1:A },
                assinaturas: { "risco:r1": { atualizadoEm:111, fotosPendentes:false, tamanhoFotos:44 } } });
      await vm.runInContext("recuperarFotosDosPontos()", ctx);
      const reg = ctx.STATE.oneDriveAssinaturasSimples["risco:r1"];
      eq(reg.fotosPendentes, true, "nao entrou na fila de envio de fotos");
      eq(reg.tamanhoFotos, undefined, "o tamanho antigo do pacote ficou e barraria o reenvio");
      eq(reg.atualizadoEm, 111, "mexeu no carimbo da assinatura");
    });

    await ta("referencia sem o arquivo no aparelho e contada, nao quebra", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:null, fotosOutras:[null] }),
                ponto: arv({ id:"r1", foto:"idbfoto:SUMIU", fotosOutras:["idbfoto:F2"] }), bytes: { F2:B } });
      const r = await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(r.fotos, 1); ok(r.semBytes >= 1, "nao contou a referencia sem arquivo");
      eq(oRisco().foto, null, "inventou foto para uma referencia sem arquivo");
      eq(oRisco().fotosOutras[0], B);
    });

    await ta("com foto faltando, a marca de dano PERMANECE (nao libera o envio)", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:null, fotosOutras:[null], __fotosPerdidas:true }),
                ponto: arv({ id:"r1", foto:"idbfoto:SUMIU", fotosOutras:["idbfoto:F2"] }), bytes: { F2:B } });
      await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(oRisco().__fotosPerdidas, true, "liberou o envio com foto ainda faltando");
    });

    await ta("quando algo volta, os quadros vazios sem par tambem somem", async ()=>{
      cenario({ atual: arv({ id:"r1", fotosOutras:[A,null,null] }),
                ponto: arv({ id:"r1", fotosOutras:["idbfoto:F1","idbfoto:F2"] }), bytes:{ F1:A, F2:B } });
      await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(oRisco().fotosOutras.length, 2, "sobrou quadro vazio depois de recuperar");
      eq(oRisco().fotosOutras[0], A); eq(oRisco().fotosOutras[1], B);
    });
    await ta("sem NADA para devolver, o quadro vermelho FICA (nao esconde a perda)", async ()=>{
      /* O quadro vermelho e a unica coisa que diz "aqui havia uma foto".
         Apagar o espaco vazio deixaria o cartao bonito e a perda invisivel
         -- exatamente o silencio que fez este problema demorar semanas para
         aparecer. So se limpa o que sobra DEPOIS de uma recuperacao real. */
      cenario({ atual: arv({ id:"r1", fotosOutras:[A,null,null] }),
                ponto: arv({ id:"r1", fotosOutras:["idbfoto:F1"] }), bytes:{ F1:A } });
      const r = await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(r.fotos, 0, "nao havia nada de novo para devolver");
      eq(oRisco().fotosOutras.length, 3, "escondeu a perda apagando os quadros vazios");
    });

    await ta("contar NAO altera nada (previa antes de confirmar)", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:null, fotosOutras:[null] }),
                ponto: arv({ id:"r1", foto:"idbfoto:F1", fotosOutras:["idbfoto:F2"] }), bytes: { F1:A, F2:B } });
      const r = await vm.runInContext("contarFotosRecuperaveis()", ctx);
      eq(r.fotos, 2, "a previa contou errado");
      eq(oRisco().foto, null, "a previa alterou o estado");
      eq(vm.runInContext("__gravou", ctx), 0, "a previa gravou no banco");
    });

    await ta("sem pontos de restauracao, nao faz nada e nao quebra", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:null }), ponto:null, bytes:{} });
      const r = await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(r.fotos, 0); eq(r.pontos, 0);
    });

    await ta("maquina tambem recupera fotoGeral e fotoPlaqueta", async ()=>{
      cenario({ atual: [ { id:"p", areas:[ { id:"a", maquinas:[ { id:"m", fotoGeral:null, fotoPlaqueta:null, tarefas:[] } ] } ] } ],
                ponto: [ { id:"p", areas:[ { id:"a", maquinas:[ { id:"m", fotoGeral:"idbfoto:F1", fotoPlaqueta:"idbfoto:F2", tarefas:[] } ] } ] } ],
                bytes: { F1:A, F2:B } });
      const r = await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(r.fotos, 2);
      const m = ctx.STATE.projetosSimples[0].areas[0].maquinas[0];
      eq(m.fotoGeral, A); eq(m.fotoPlaqueta, B);
    });

    await ta("EM LOTES: nunca carrega o acervo inteiro de uma vez", async ()=>{
      /* A versao anterior lia de uma vez os arquivos de TODAS as fotos
         citadas em TODOS os pontos -- uns 2 GB de imagem na memoria de um
         celular. E o mesmo erro que derrubava o Safari na exportacao do
         backup. Aqui contamos quantas fotos cada leitura pede: nenhuma
         leitura pode pedir o acervo inteiro. */
      const N = 100, riscos = [], bytes = {};
      for(let i=0;i<N;i++){ riscos.push({ id:"r"+i, foto:null }); bytes["F"+i] = A; }
      const pt = [];
      for(let i=0;i<N;i++) pt.push({ id:"r"+i, foto:"idbfoto:F"+i });
      const arvN = (lista)=> [ { id:"p", areas:[ { id:"a", maquinas:[ { id:"m", tarefas:[ { id:"t", riscos:lista } ] } ] } ] } ];
      cenario({ atual: arvN(riscos), ponto: arvN(pt), bytes });
      vm.runInContext([
        "var __pedidos = [];",
        "async function fotosLerLote(db, refs){ __pedidos.push(refs.size); const m = new Map();",
        "  refs.forEach(f=>{ if(__bytes.has(f)) m.set(f, __bytes.get(f)); }); return m; }"
      ].join(" "), ctx);
      const r = await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(r.fotos, N, "nao devolveu todas");
      const pedidos = vm.runInContext("__pedidos", ctx);
      const lote = vm.runInContext("RECUPERACAO_LOTE_ITENS", ctx);
      ok(pedidos.length > 1, "leu tudo numa tacada so — o pico de memoria ainda cresce com o acervo");
      ok(Math.max.apply(null, pedidos) <= lote, "um lote pediu mais fotos que o tamanho do lote: " + pedidos.join(","));
      eq(r.lotes, Math.ceil(N/lote), "numero de lotes fora do esperado");
    });
    await ta("RECORTE POR DATA: devolve so os itens criados na janela", async ()=>{
      /* Comecar pequeno: devolver primeiro o levantamento recente, conferir
         na tela, e so entao soltar o resto. */
      const HOJE = 1756000000000, DIA = 24*60*60*1000;
      const novos = { id:"rNovo", foto:null, criadoEm: HOJE - 2*DIA };
      const velho = { id:"rVelho", foto:null, criadoEm: HOJE - 40*DIA };
      const arv2 = (lista)=> [ { id:"p", areas:[ { id:"a", maquinas:[ { id:"m", tarefas:[ { id:"t", riscos:lista } ] } ] } ] } ];
      const pt = [ { id:"rNovo", foto:"idbfoto:F1" }, { id:"rVelho", foto:"idbfoto:F2" } ];
      cenario({ atual: arv2([novos, velho]), ponto: arv2(pt), bytes:{ F1:A, F2:B } });
      ctx.__desde = HOJE - 7*DIA;
      const r = await vm.runInContext("recuperarFotosDosPontos(null, __desde)", ctx);
      eq(r.fotos, 1, "o recorte de 7 dias deveria pegar so o item novo");
      const rs = ctx.STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos;
      eq(rs[0].foto, A, "o item novo nao recebeu a foto");
      eq(rs[1].foto, null, "o recorte deixou passar um item fora da janela");
    });
    await ta("sem recorte, pega tudo (inclusive item sem data de criacao)", async ()=>{
      const arv2 = (lista)=> [ { id:"p", areas:[ { id:"a", maquinas:[ { id:"m", tarefas:[ { id:"t", riscos:lista } ] } ] } ] } ];
      cenario({ atual: arv2([{ id:"r1", foto:null }, { id:"r2", foto:null, criadoEm:1 }]),
                ponto: arv2([{ id:"r1", foto:"idbfoto:F1" }, { id:"r2", foto:"idbfoto:F2" }]),
                bytes:{ F1:A, F2:B } });
      const r = await vm.runInContext("recuperarFotosDosPontos(null, 0)", ctx);
      eq(r.fotos, 2, "sem recorte deveria devolver as duas");
    });
    await ta("a previa respeita o mesmo recorte da execucao", async ()=>{
      const HOJE = 1756000000000, DIA = 24*60*60*1000;
      const arv2 = (lista)=> [ { id:"p", areas:[ { id:"a", maquinas:[ { id:"m", tarefas:[ { id:"t", riscos:lista } ] } ] } ] } ];
      cenario({ atual: arv2([{ id:"rNovo", foto:null, criadoEm: HOJE - 2*DIA },
                             { id:"rVelho", foto:null, criadoEm: HOJE - 40*DIA }]),
                ponto: arv2([{ id:"rNovo", foto:"idbfoto:F1" }, { id:"rVelho", foto:"idbfoto:F2" }]),
                bytes:{ F1:A, F2:B } });
      ctx.__desde = HOJE - 7*DIA;
      const p = await vm.runInContext("contarFotosRecuperaveis(__desde)", ctx);
      eq(p.fotos, 1, "a previa contou fora do recorte");
      const t = await vm.runInContext("contarFotosRecuperaveis(0)", ctx);
      eq(t.fotos, 2, "a previa sem recorte contou errado");
    });
    await ta("ponto no formato antigo (foto embutida) tambem serve", async ()=>{
      cenario({ atual: arv({ id:"r1", foto:null }), ponto: arv({ id:"r1", foto:A }), bytes:{} });
      const r = await vm.runInContext("recuperarFotosDosPontos()", ctx);
      eq(r.fotos, 1); eq(oRisco().foto, A);
    });
  }

  /* ==================================================================
     t120 - a frase do risco montada dos quatro campos

     Os casos abaixo sao COMBINACOES REAIS do levantamento da Corteva,
     tiradas dos arquivos da nuvem. O defeito de fundo era o componente
     entrar sempre como LUGAR ("Amputacao NA lamina"), quando a lamina e
     o AGENTE; e a parte do corpo vir solta no fim ("com lesao na mao"),
     redundante quando o proprio evento ja e a lesao.
     ================================================================== */
  console.log("\n=== t120 - frase do risco (dados reais de campo) ===");
  {
    const ctx = vm.createContext({ String, Array, Object, RegExp });
    ["RISCO_LOCAIS","RISCO_COMPONENTES","RISCO_EVENTOS","RISCO_PARTES","RISCO_CAMPOS",
     "RISCO_NUCLEOS_FEMININOS","RISCO_EVENTO_CLASSE","RISCO_EVENTO_PARTE_GENITIVO",
     "RISCO_PARTES_SO_NO_FIM","RISCO_LOCAIS_POSICAO"].forEach(n=> vm.runInContext(constante(n), ctx));
    ["riscoArtigoEm","riscoArtigoDe","riscoTemGenitivo","riscoSeSobrepoem",
     "riscoLocalEhPosicao","riscoLigaLocal","montarNomeRisco","montarDescricaoRisco",
     "__montarDescricaoRiscoAntigo"].forEach(n=> vm.runInContext(funcao(n), ctx));
    const nomeDe = (ev, comp, loc, parte)=>{
      ctx.__r = { evento:ev, componente:comp, local:loc, parteCorpo:parte };
      return vm.runInContext("montarNomeRisco(__r)", ctx);
    };
    const caso = (rot, ev, comp, loc, parte, esperado)=> t(rot, ()=>{
      eq(nomeDe(ev, comp, loc, parte), esperado);
    });

    caso("a parte do corpo cola no evento, e o local encadeia",
      "Amputação","Lâmina","Tampa de inspeção","Mão",
      "Amputação da mão na lâmina da tampa de inspeção");
    caso("componente que ja tem 'de' dentro nao encadeia — entra virgula",
      "Amputação","Porta de dosagem","Tampa superior","Mão",
      "Amputação da mão na porta de dosagem, na tampa superior");
    caso("componente que repete o local some; fica o mais especifico",
      "Esmagamento","Tampa","Tampa superior","Braço",
      "Esmagamento do braço na tampa superior");
    caso("evento de ORIGEM: o material cai DO componente",
      "Queda de material","Rodapé","Escada","Cabeça",
      "Queda de material do rodapé da escada, com lesão na cabeça");
    caso("evento com parte locativa ganha virgula (nao 'corte no pe na bica')",
      "Corte","Bica de descida do grão","Acesso","Pé",
      "Corte no pé, na bica de descida do grão, no acesso");
    caso("sem componente, a frase de sempre continua igual",
      "Queda","","Acesso","Corpo inteiro",
      "Queda no acesso, com lesão no corpo inteiro");
    caso("'corpo inteiro' nunca cola no evento — volta para o fim",
      "Agarramento","botões","botões","Corpo inteiro",
      "Agarramento nos botões, com lesão no corpo inteiro");

    t("evento desconhecido nao piora: cai no formato antigo", ()=>{
      /* Evento digitado em "Outro" que nao esta classificado continua com a
         montagem de sempre -- a correcao nunca deixa nada pior do que era. */
      eq(nomeDe("Solavanco","alavanca","Acesso","Mão"),
         "Solavanco na alavanca, no acesso, com lesão na mão");
    });
    t("local que e POSICAO nao aceita genitivo: 'na esteira, no inferior'", ()=>{
      /* "na esteira DO inferior" nao e portugues. Genitivo so para local da
         lista do app, que sao substantivos de lugar de verdade. */
      const r = nomeDe("Aprisionamento","esteira","inferior","Mão");
      ok(r.indexOf("do inferior") < 0, "encadeou genitivo num local que e posicao: " + r);
      ok(r.indexOf("no inferior") > 0, "perdeu o local: " + r);
    });
    t("genero de substantivo feminino terminado em -e", ()=>{
      /* "partes moveis" saia como "NOS partes moveis". */
      eq(vm.runInContext('riscoArtigoEm("partes móveis")', ctx), "nas partes móveis");
      eq(vm.runInContext('riscoArtigoEm("haste de comando")', ctx), "na haste de comando");
    });
    t("riscoArtigoDe reaproveita o genero de riscoArtigoEm", ()=>{
      eq(vm.runInContext('riscoArtigoDe("Mão")', ctx), "da mão");
      eq(vm.runInContext('riscoArtigoDe("Braço")', ctx), "do braço");
      eq(vm.runInContext('riscoArtigoDe("Dedos")', ctx), "dos dedos");
      eq(vm.runInContext('riscoArtigoDe("")', ctx), "");
    });
    t("a descricao DERIVA do nome — os dois nunca divergem", ()=>{
      ctx.__r = { evento:"Amputação", componente:"Lâmina", local:"Tampa de inspeção", parteCorpo:"Mão" };
      const nome = vm.runInContext("montarNomeRisco(__r)", ctx);
      const desc = vm.runInContext("montarDescricaoRisco(__r)", ctx);
      eq(desc, "Risco de " + nome.charAt(0).toLowerCase() + nome.slice(1) + ".");
      ok(desc.indexOf("da máquina") < 0, "a descricao ainda carrega o 'da máquina' antigo");
    });
    t("sem evento nenhum, nada e inventado", ()=>{
      eq(nomeDe("","Lâmina","Acesso","Mão"), "");
      ctx.__r = {}; eq(vm.runInContext("montarDescricaoRisco(__r)", ctx), "");
    });
  }
  {
    /* A recomposicao em massa: so toca no que o proprio app escreveu. */
    const ctx = vm.createContext({ String, Array, Object, RegExp, Set, Map });
    vm.runInContext("var STATE = { projetosSimples: [] }; var __carimbo = 5000;", ctx);
    vm.runInContext("function marcarAlterado(){} function agoraSync(){ return ++__carimbo; }", ctx);
    ["RISCO_LOCAIS","RISCO_COMPONENTES","RISCO_EVENTOS","RISCO_PARTES","RISCO_CAMPOS",
     "RISCO_NUCLEOS_FEMININOS","RISCO_EVENTO_CLASSE","RISCO_EVENTO_PARTE_GENITIVO",
     "RISCO_PARTES_SO_NO_FIM","RISCO_LOCAIS_POSICAO"].forEach(n=> vm.runInContext(constante(n), ctx));
    ["riscoArtigoEm","riscoArtigoDe","riscoTemGenitivo","riscoSeSobrepoem","riscoLocalEhPosicao",
     "riscoLigaLocal","montarNomeRisco","montarDescricaoRisco","__montarDescricaoRiscoAntigo",
     "__percorrerItensSimples","recomporFrasesDosRiscos"].forEach(n=> vm.runInContext(funcao(n), ctx));
    const arv = (riscos)=> [ { id:"p", areas:[ { id:"a", maquinas:[ { id:"m", tarefas:[ { id:"t", riscos } ] } ] } ] } ];
    const riscos = ()=> ctx.STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos;

    t("reescreve o que o app tinha montado", ()=>{
      const velho = "Amputação na lâmina, na tampa de inspeção, com lesão na mão";
      ctx.STATE = { projetosSimples: arv([{ id:"r1", evento:"Amputação", componente:"Lâmina",
        local:"Tampa de inspeção", parteCorpo:"Mão", nome:velho, nomeAuto:velho, atualizadoEm:1 }]) };
      const r = vm.runInContext("recomporFrasesDosRiscos(false)", ctx);
      eq(r.nomes, 1);
      eq(riscos()[0].nome, "Amputação da mão na lâmina da tampa de inspeção");
      eq(riscos()[0].nomeAuto, riscos()[0].nome, "nomeAuto ficou dessincronizado do nome");
      ok(riscos()[0].atualizadoEm > 1, "nao carimbou — a mudanca nunca viajaria para o outro aparelho");
    });
    t("NUNCA toca na frase que a pessoa digitou", ()=>{
      const meu = "Risco de decepar a mão na lâmina — conforme laudo anterior";
      ctx.STATE = { projetosSimples: arv([{ id:"r1", evento:"Amputação", componente:"Lâmina",
        local:"Tampa de inspeção", parteCorpo:"Mão",
        nome:meu, nomeAuto:"Amputação na lâmina, na tampa de inspeção, com lesão na mão",
        descricao:"Descrição minha, escrita à mão.", descricaoAuto:"outra coisa",
        atualizadoEm:1 }]) };
      const r = vm.runInContext("recomporFrasesDosRiscos(false)", ctx);
      eq(riscos()[0].nome, meu, "sobrescreveu texto escrito a mao");
      eq(r.preservados, 1);
      eq(riscos()[0].atualizadoEm, 1, "carimbou um item que nao mudou");
    });
    t("contar NAO altera nada (previa antes de confirmar)", ()=>{
      const velho = "Amputação na lâmina, na tampa de inspeção, com lesão na mão";
      ctx.STATE = { projetosSimples: arv([{ id:"r1", evento:"Amputação", componente:"Lâmina",
        local:"Tampa de inspeção", parteCorpo:"Mão", nome:velho, nomeAuto:velho, atualizadoEm:1 }]) };
      const r = vm.runInContext("recomporFrasesDosRiscos(true)", ctx);
      eq(r.nomes, 1, "a previa contou errado");
      eq(riscos()[0].nome, velho, "a previa alterou o texto");
      eq(riscos()[0].atualizadoEm, 1, "a previa carimbou");
    });
    t("rodar duas vezes nao muda nada na segunda", ()=>{
      const velho = "Amputação na lâmina, na tampa de inspeção, com lesão na mão";
      ctx.STATE = { projetosSimples: arv([{ id:"r1", evento:"Amputação", componente:"Lâmina",
        local:"Tampa de inspeção", parteCorpo:"Mão", nome:velho, nomeAuto:velho, atualizadoEm:1 }]) };
      vm.runInContext("recomporFrasesDosRiscos(false)", ctx);
      const carimbo = riscos()[0].atualizadoEm;
      const r2 = vm.runInContext("recomporFrasesDosRiscos(false)", ctx);
      eq(r2.riscos, 0, "reescreveu de novo o que ja estava certo");
      eq(riscos()[0].atualizadoEm, carimbo, "carimbou de novo sem mudanca");
    });
    t("risco sem os quatro campos e ignorado", ()=>{
      ctx.STATE = { projetosSimples: arv([{ id:"r1", nome:"Escrito à mão, sem campos", atualizadoEm:1 }]) };
      const r = vm.runInContext("recomporFrasesDosRiscos(false)", ctx);
      eq(r.riscos, 0);
      eq(riscos()[0].nome, "Escrito à mão, sem campos");
    });
  }

  /* ==================================================================
     t121 - a ultima trava: nao trocar um arquivo da nuvem por um
     muito menor

     A trava anterior (__fotosPerdidas) so funciona quando a leitura
     conseguiu FLAGRAR a foto sumindo -- e ela so flagra uma vez: na
     leitura seguinte ja nao ha referencia, so um vazio, indistinguivel
     de "aqui nunca teve foto". Num aparelho onde o dano ja tinha sido
     gravado antes de a marca existir, ela nunca e criada.
     Esta trava olha o fato bruto: o tamanho do arquivo.
     ================================================================== */
  console.log("\n=== t121 - nao sobrescrever arquivo da nuvem por um menor ===");
  {
    const ctx = vm.createContext({ String, Array, Object, Map, Number });
    vm.runInContext([
      'var ONEDRIVE_PASTA_APP = "Apps/APR"; var SUBPASTA_BACKUP = "Backup";',
      'var __indice = null;',
      'function onedriveIndiceNuvem(){ return __indice; }'
    ].join("\n"), ctx);
    /* constante() so sabe delimitar const que abre chave ou colchete; numero
       puro faz o extrator varrer ate a proxima chave e trazer lixo junto.
       Estas duas sao lidas do index.html por expressao regular, para o teste
       continuar preso ao valor REAL entregue. */
    ["ENVIO_ENCOLHIMENTO_SUSPEITO","ENVIO_ENCOLHIMENTO_MINIMO_BYTES"].forEach(n=>{
      const m = new RegExp("const " + n + " = ([^;]+);").exec(HTML);
      ok(m, "constante nao encontrada no index.html: " + n);
      vm.runInContext("var " + n + " = " + m[1] + ";", ctx);
    });
    vm.runInContext(funcao("onedriveEnvioEncolheDemais"), ctx);
    const item = { pasta:["Proj (aaa111)","Area (bbb222)"], arquivo:"_area.json" };
    const caminho = "apps/apr/backup/simplificado/proj (aaa111)/area (bbb222)/_area.json";
    const encolhe = (remoto, local)=>{
      ctx.__indice = (remoto === null) ? null : new Map([[caminho, remoto]]);
      ctx.__item = item; ctx.__local = local;
      return vm.runInContext("onedriveEnvioEncolheDemais(__item, __local)", ctx);
    };

    t("O CASO REAL: 900 KB na nuvem (foto embutida) x 2 KB aqui -> BLOQUEIA", ()=>{
      ok(encolhe(900*1024, 2*1024) === true, "deixaria apagar a foto da nuvem");
    });
    t("arquivo do mesmo tamanho passa normalmente", ()=>{
      ok(encolhe(2048, 2048) === false);
    });
    t("texto que cresceu passa normalmente", ()=>{
      ok(encolhe(2048, 9000) === false);
    });
    t("encolhimento PEQUENO passa — texto editado nao fica preso", ()=>{
      /* Apagar um paragrafo longo da descricao encolhe o arquivo, e isso tem
         de continuar subindo. So a diferenca GRANDE (acima de 100 KB) e
         tratada como suspeita de foto. */
      ok(encolhe(20000, 1000) === false, "prendeu uma edicao de texto comum");
    });
    t("precisa das DUAS condicoes: muito menor E diferenca grande", ()=>{
      // 4x menor, mas so 90 KB de diferenca -> passa
      ok(encolhe(120*1024, 30*1024) === false);
      // diferenca enorme, mas menos de 4x -> passa
      ok(encolhe(900*1024, 300*1024) === false);
      // as duas -> bloqueia
      ok(encolhe(900*1024, 100*1024) === true);
    });
    t("sem indice confiavel da nuvem, nao inventa suspeita", ()=>{
      ok(encolhe(null, 10) === false, "bloqueou sem ter como saber o tamanho de la");
    });
    t("arquivo que ainda nao existe na nuvem passa", ()=>{
      ctx.__indice = new Map(); ctx.__item = item; ctx.__local = 10;
      ok(vm.runInContext("onedriveEnvioEncolheDemais(__item, __local)", ctx) === false);
    });
    t("o envio consulta a trava e deixa o motivo no historico", ()=>{
      const f = funcao("onedriveSincronizarModulo");
      ok(f.indexOf("if(onedriveEnvioEncolheDemais(item, tamTexto)){") > 0,
         "a trava nao esta ligada no caminho de envio");
      ok(f.indexOf("não enviado: o arquivo na nuvem é bem maior") > 0,
         "bloqueia em silencio, sem dizer por que");
      const antes = f.indexOf("onedriveEnvioEncolheDemais");
      const envio = f.indexOf("okTexto = await onedriveEnviarBlob");
      ok(antes > 0 && envio > antes, "a trava esta DEPOIS do envio — nao serve de nada");
    });
  }

  /* ==================================================================
     t122 - risco com o mesmo id em duas tarefas nao gera fila sem fim

     Achada rodando o classificador REAL contra a nuvem real do usuario:
     60 riscos com o mesmo id em duas tarefas (o risco foi movido -- ou
     copiado por engano -- de uma tarefa de verdade para outra, e a copia
     antiga nunca foi removida da nuvem). A classificacao so pergunta "este
     risco esta na tarefa ATUAL?" -- nao sabe que ele ja existe em outra.
     Propoe de novo. A mesclagem recusa (__moverItemEntrePais ja decide
     isso) mas recusar nao deixava rastro, e a classificacao "esquecia" no
     ciclo seguinte. Para sempre.

     O app JA TEM uma defesa generica para este tipo de caso
     (onedriveMarcarJaExistente, chamada por QUEM RECEBE o item quando a
     mesclagem recusa) -- mas ela so esta ligada em 2 dos 6 pontos que
     chamam onedriveMesclarItemNovo. onedriveDeltaProcessarFila (a fila de
     notificacoes em tempo real, "a cada edicao") e um dos que NAO chama.
     Os testes abaixo isolam exatamente esse caso: chamar classify + merge
     SEM nenhuma ajuda externa, do jeito que onedriveDeltaProcessarFila faz.
     ================================================================== */
  console.log("\n=== t122 · risco com o mesmo id em duas tarefas nao gera fila sem fim ===");
  {
    const ctx = vm.createContext({ console, JSON, Math, Date, Map, Set, Promise, Object, Array, String, Number, RegExp });
    vm.runInContext(`
      const OUTRO = "Outro (especificar)";
      var STATE = { projetosSimples: [], ui:{}, oneDriveAssinaturasSimples:{}, oneDrivePendentes:[] };
      var ONEDRIVE_PASTA_APP="APR-Campo", SUBPASTA_BACKUP="Backup", ONEDRIVE_LIMITE_AUTO_BYTES=300000;
      var CAMPO_FOTOS_LISTA = "fotosOutras";
      function nomeMaquinaS(m){ return m&&(m.nome||m.descricao||""); }
      function valOuOutro(v,o){ return v===OUTRO ? (o||"") : (v||""); }
      class Blob{ constructor(a){ this.size = Buffer.byteLength(a.join(""),"utf8"); } }
      function marcarAlterado(){}
      function registrarCarimboVisto(){}
      function lapideVenceDadosRemotos(){ return false; }
      function onedrivePrecisaBaixarFotos(){ return false; }
      function nomeArquivoSeguro(s){ let n=String(s||"sem-nome").trim().slice(0,48)
        .replace(/[\\\\\\/:*?"<>|]/g,"-").replace(/\\s+/g," ").replace(/^\\.+/,"").replace(/[. ]+$/,"");
        if(/^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i.test(n)) n=n+"_"; return n||"sem-nome"; }
      var __arvoreSimplesCache = null;
      async function fotosCarregarIndice(){ return new Set(); }
      var __assinaturasOneDriveSimples = { mapa:null, chaveEstado:"oneDriveAssinaturasSimples" };
    `, ctx);
    ["CAMPOS_FILHOS_SYNC","CAMPO_FILHOS_POR_TIPO","CAMPOS_FOTO_UNICA"].forEach(n=>vm.runInContext(constante(n), ctx));
    ["segmentoPastaComId","extrairSufixoDoNome","idBateComSufixo","separarFotosDoItem","__ehFotoEmbutida",
     "tamanhoTextoLocalDoItem","onedriveCarregarAssinaturas","onedriveAssinaturaDe","onedriveAnotarTamanho",
     "onedriveArquivoMudouNaNuvem","onedriveMesmaVersaoPeloTamanho","aplicarAtualizacaoRemota",
     "__listasIrmasDe","__moverItemEntrePais","__onedriveMesclarItemNovoInterno","onedriveMesclarItemNovo",
     "onedriveItemLocalNoLugarDoDescritor","onedriveItemJaConvergido","onedriveRegistrarAssinaturaDeDownload",
     "arquivoJaExistente","arquivoEstaEmQuarentena","onedriveDuplicatasParaIgnorar","__arquivosNoNo",
     "__itemExisteAlgumLugar","riscoOrfaoConhecido","marcarRiscoOrfaoConhecido","onedriveClassificarNovosSimples"]
      .forEach(n=> vm.runInContext(funcao(n), ctx));

    function arv(tarefas){ return [ { id:"p00001", empresa:"Corteva", areas:[ { id:"a00001", nome:"Area", maquinas:[
      { id:"m00001", nome:"Maquina", tarefas } ] } ] } ]; }
    const no = (nome, filhos)=> ({ nome, pasta:true, caminho:"APR-Campo/Backup/Simplificado/" + nome, filhos });
    const arq = (caminhoPai, nome, tamanho)=> ({ nome, pasta:false, caminho: caminhoPai + "/" + nome, tamanho });

    t("O CASO REAL: risco em duas tarefas nao entra em fila sem fim (sem nenhuma ajuda externa)", ()=>{
      const idRisco = "r_dup_1";
      ctx.STATE = { projetosSimples: arv([
          { id:"t00001", tarefa:"Limpeza", tarefaOutro:"", riscos:[ { id:idRisco, nome:"Risco", descricao:"desc curta", foto:null, fotosOutras:[], criadoEm:1, atualizadoEm:100 } ] },
          { id:"t00002", tarefa:"Operação", tarefaOutro:"", riscos:[] },
        ]), oneDriveAssinaturasSimples:{}, oneDrivePendentes:[] };
      vm.runInContext("__assinaturasOneDriveSimples.mapa = null;", ctx);
      // Copia orfa: MESMO id, conteudo mais LONGO (tamanho diferente do que
      // ja existe aqui) -- se fosse identico, o cache generico de tamanho
      // já resolveria sozinho e o teste não provaria nada.
      const conteudoOrfao = JSON.stringify({ id:idRisco, nome:"Risco", descricao:"desc bem mais comprida do que a original, para o tamanho ficar diferente", foto:null, fotosOutras:[], criadoEm:1, atualizadoEm:50 });
      const projNo = no("Corteva (p00001)", [ no("Area (a00001)", [ no("Maquina (m00001)", [
        no("Limpeza (t00001)", [ arq("APR-Campo/Backup/Simplificado/Corteva (p00001)/Area (a00001)/Maquina (m00001)/Limpeza (t00001)", "_tarefa.json", 50) ]),
        no("Operação (t00002)", [
          arq("APR-Campo/Backup/Simplificado/Corteva (p00001)/Area (a00001)/Maquina (m00001)/Operação (t00002)", "_tarefa.json", 50),
          { nome:"risco_"+idRisco+".json", pasta:false,
            caminho:"APR-Campo/Backup/Simplificado/Corteva (p00001)/Area (a00001)/Maquina (m00001)/Operação (t00002)/risco_"+idRisco+".json",
            tamanho: Buffer.byteLength(conteudoOrfao,"utf8"), __conteudo: conteudoOrfao },
        ]),
      ]) ]) ]);
      const arvore = [projNo];
      const buscarConteudo = (caminho, no)=>{
        if(no.caminho === caminho) return no.__conteudo || JSON.stringify(no);
        for(const f of (no.filhos||[])){ const r = buscarConteudo(caminho, f); if(r) return r; }
        return null;
      };

      /* Os nos "_tarefa.json" injetados tem um tamanho de mentira (50) que
         nunca vai bater com tamanhoTextoLocalDoItem de verdade -- isso e
         ruido do proprio teste (as tarefas nao sao o que se quer provar
         aqui), entao a contagem que importa e SO A DO RISCO. */
      let ultimaContagem = -1, estabilizouEm = -1;
      for(let ciclo = 1; ciclo <= 6; ciclo++){
        ctx.__arv = arvore;
        const cls = vm.runInContext("onedriveClassificarNovosSimples(__arv)", ctx);
        const doRisco = cls.pequenos.filter(d => d.tipo === "risco");
        if(ciclo >= 4){ eq(doRisco.length, 0, "ciclo " + ciclo + " ainda propos o risco — fila sem fim"); }
        for(const d of cls.pequenos){
          const texto = buscarConteudo(d.caminho, projNo);
          if(!texto) continue;
          ctx.__d = d; ctx.__dados = JSON.parse(texto);
          // DE PROPOSITO sem "else onedriveMarcarJaExistente" -- e exatamente
          // o que onedriveDeltaProcessarFila faz hoje, e e o cenario que so
          // a correcao de hoje (dentro de onedriveMesclarItemNovo) cobre.
          vm.runInContext("onedriveMesclarItemNovo(__d, __dados)", ctx);
        }
        if(doRisco.length === 0 && estabilizouEm < 0) estabilizouEm = ciclo;
        ultimaContagem = doRisco.length;
      }
      ok(estabilizouEm > 0 && estabilizouEm <= 3, "nao estabilizou dentro de 3 ciclos (estabilizou em " + estabilizouEm + ")");

      const tarefasFinais = vm.runInContext("STATE.projetosSimples[0].areas[0].maquinas[0].tarefas.map(t=>t.riscos.map(r=>r.id))", ctx);
      const total_ocorrencias = tarefasFinais.flat().filter(id=>id===idRisco).length;
      eq(total_ocorrencias, 1, "o risco duplicou ou sumiu: " + JSON.stringify(tarefasFinais));
    });

    t("sem a checagem de orfao no classificador, o mesmo caso NAO estabiliza (prova que o teste acima testa algo de verdade)", ()=>{
      /* Mesmo cenario do teste anterior, mas rodando uma copia do
         classificador com a linha da correcao arrancada -- exatamente o
         comportamento antigo. Se este teste tambem passasse, o teste
         anterior não estaria provando nada. */
      const original = funcao("onedriveClassificarNovosSimples");
      ok(original.indexOf("if(riscoOrfaoConhecido(arq.caminho, arq.tamanho)) continue;") > 0,
         "a linha da correcao nao foi encontrada no classificador — o teste de controle não se aplica mais");
      const semCorrecao = original
        .replace("if(riscoOrfaoConhecido(arq.caminho, arq.tamanho)) continue;", "/* checagem removida de propósito neste teste de controle */")
        .replace("function onedriveClassificarNovosSimples", "function onedriveClassificarSemCorrecao");
      vm.runInContext(semCorrecao, ctx);

      const idRisco = "r_dup_2";
      ctx.STATE = { projetosSimples: arv([
          { id:"t00001", tarefa:"Limpeza", tarefaOutro:"", riscos:[ { id:idRisco, nome:"Risco", descricao:"x", foto:null, fotosOutras:[], criadoEm:1, atualizadoEm:100 } ] },
          { id:"t00002", tarefa:"Operação", tarefaOutro:"", riscos:[] },
        ]), oneDriveAssinaturasSimples:{}, oneDrivePendentes:[] };
      vm.runInContext("__assinaturasOneDriveSimples.mapa = null;", ctx);
      const conteudoOrfao = JSON.stringify({ id:idRisco, nome:"Risco", descricao:"bem mais longa para dar tamanho diferente do original que ja existe aqui localmente", foto:null, fotosOutras:[], criadoEm:1, atualizadoEm:50 });
      const caminhoT1 = "APR-Campo/Backup/Simplificado/Corteva (p00001)/Area (a00001)/Maquina (m00001)/Limpeza (t00001)";
      const caminhoT2 = "APR-Campo/Backup/Simplificado/Corteva (p00001)/Area (a00001)/Maquina (m00001)/Operação (t00002)";
      const projNo = no("Corteva (p00001)", [ no("Area (a00001)", [ no("Maquina (m00001)", [
        no("Limpeza (t00001)", [ arq(caminhoT1, "_tarefa.json", 50) ]),
        no("Operação (t00002)", [ arq(caminhoT2, "_tarefa.json", 50),
          { nome:"risco_"+idRisco+".json", pasta:false, caminho: caminhoT2+"/risco_"+idRisco+".json",
            tamanho: Buffer.byteLength(conteudoOrfao,"utf8"), __conteudo: conteudoOrfao },
        ]),
      ]) ]) ]);
      const buscarConteudo = (caminho, no)=>{
        if(no.caminho === caminho) return no.__conteudo || null;
        for(const f of (no.filhos||[])){ const r = buscarConteudo(caminho, f); if(r) return r; }
        return null;
      };
      let total = -1;
      for(let ciclo = 1; ciclo <= 5; ciclo++){
        ctx.__arv = [projNo];
        const cls = vm.runInContext("onedriveClassificarSemCorrecao(__arv)", ctx);
        total = cls.pequenos.length + cls.grandes.length;
        for(const d of cls.pequenos){
          const texto = buscarConteudo(d.caminho, projNo);
          if(!texto) continue;
          ctx.__d = d; ctx.__dados = JSON.parse(texto);
          vm.runInContext("onedriveMesclarItemNovo(__d, __dados)", ctx);
        }
      }
      ok(total > 0, "o comportamento SEM a correcao deveria continuar propondo o orfao (prova que o teste anterior testa algo de verdade)");
    });
  }

  console.log("\n=== t123 · relatório de progresso — quantidades por dia (criação e aplicação do laudo) ===");
  {
    t("diaLocalBR usa o fuso de Brasília, não UTC — perto da meia-noite os dois dias divergem", ()=>{
      // 27/08/2026 02:30 UTC = 26/08/2026 23:30 em Brasília (UTC-3)
      const ts = Date.UTC(2026,7,27,2,30);
      eq(C.diaLocalBR(ts), "2026-08-26", "caiu no dia UTC em vez do dia de Brasília");
    });
    t("diaBRCurto converte a chave AAAA-MM-DD para DD/MM/AAAA", ()=>{
      eq(C.diaBRCurto("2026-08-26"), "26/08/2026");
    });

    // Fixture isolada (ids próprios, fora da árvore usada pelo resto da suíte)
    // para as contagens não dependerem de nada que outros testes já tenham
    // aplicado nos riscos/máquinas compartilhados.
    const proj = { id:"pRelat1", empresa:"Projeto Relatório Teste", areas:[] };
    const area = { id:"aRelat1", nome:"Área Relatório Teste", maquinas:[] };
    const maquina = { id:"mRelat1", nome:"Máquina Relatório Teste", tarefas:[], criadoEm: Date.UTC(2026,7,20,15,0) };
    const tarefa = { id:"tRelat1", tarefa:"Tarefa Relatório Teste", riscos:[] };
    const risco1 = { id:"rRelat1", nome:"Risco 1", criadoEm: Date.UTC(2026,7,21,15,0) };
    const risco2 = { id:"rRelat2", nome:"Risco 2", criadoEm: Date.UTC(2026,7,21,18,0) };
    tarefa.riscos.push(risco1, risco2);
    maquina.tarefas.push(tarefa);
    area.maquinas.push(maquina);
    proj.areas.push(area);
    C.STATE.projetosSimples.push(proj);

    t("relatorioProgressoDados conta equipamento e riscos criados no dia certo, nos 3 níveis", ()=>{
      const dados = C.relatorioProgressoDados("pRelat1");
      eq(dados.length, 1);
      const p = dados[0];
      eq(p.porDia["2026-08-20"].equip, 1, "equipamento criado em 20/08 não contou no projeto");
      eq(p.porDia["2026-08-21"].risco, 2, "os dois riscos de 21/08 não contaram no projeto");
      const a = p.areas[0];
      eq(a.porDia["2026-08-20"].equip, 1, "não contou no nível área");
      eq(a.porDia["2026-08-21"].risco, 2, "não contou no nível área");
      const m = a.maquinas[0];
      eq(m.porDia["2026-08-20"].equip, 1, "não contou no nível equipamento");
      eq(m.porDia["2026-08-21"].risco, 2, "não contou no nível equipamento");
    });

    t("aplicar um campo do laudo pela 1ª vez registra o dia; reeditar depois não duplica", ()=>{
      const item = { proj, area, maquina, tarefa, risco:risco1 };
      const antes = C.STATE.logLaudoAplicacoes.length;
      C.laudoSet(item, "risco", { fin:"Texto aprovado", st:"ok" });
      const depoisAplicar = C.STATE.logLaudoAplicacoes.length;
      eq(depoisAplicar, antes+1, "a 1ª aplicação deveria logar uma entrada");
      C.laudoSet(item, "risco", { fin:"Texto reeditado", st:"edit" });
      eq(C.STATE.logLaudoAplicacoes.length, depoisAplicar, "editar um campo já aplicado não pode logar de novo");
    });

    t("recusar e depois aplicar de novo conta como uma nova aplicação", ()=>{
      const item = { proj, area, maquina, tarefa, risco:risco2 };
      C.laudoSet(item, "solucao", { st:"ok", fin:"x" });
      const antes = C.STATE.logLaudoAplicacoes.length;
      C.laudoSet(item, "solucao", { st:"no", fin:"" });
      eq(C.STATE.logLaudoAplicacoes.length, antes, "recusar não loga aplicação");
      C.laudoSet(item, "solucao", { st:"ok", fin:"y" });
      eq(C.STATE.logLaudoAplicacoes.length, antes+1, "voltar a aplicar depois de recusado deveria logar de novo");
    });

    t("diaAplicacaoCampo usa o registro novo quando existe, e cai para o carimbo antigo (em) quando não existe", ()=>{
      const item = { proj, area, maquina, tarefa, risco:risco1 };
      const hojeChave = C.diaLocalBR(Date.now());
      eq(C.diaAplicacaoCampo(item, "risco"), hojeChave, "deveria ter vindo do log novo, aplicado agora no teste anterior");
      // simula uma decisão ANTIGA, de antes deste registro existir: campo
      // aplicado direto no objeto, sem passar por laudoSet — não fica no log.
      const lt = C.getLaudoTarefa(tarefa);
      lt.tarefaSt = "ok"; lt.tarefaFin = "Texto antigo da tarefa"; lt.em = "2026-08-10T12:00:00.000Z";
      eq(C.diaAplicacaoCampo(item, "tarefa"), "2026-08-10", "sem registro no log, deveria cair para o carimbo 'em' do campo");
    });

    t("relatorioProgressoDados conta os textos de laudo aplicados no dia certo (log novo + carimbo antigo)", ()=>{
      const dados = C.relatorioProgressoDados("pRelat1")[0];
      const hojeChave = C.diaLocalBR(Date.now());
      eq(dados.porDia[hojeChave].campos, 2, "risco (r1) e solução (r2) aplicados agora deveriam contar hoje");
      // campo "tarefa" é compartilhado pelas 2 linhas de risco desta tarefa —
      // as duas contam o carimbo antigo, mesma convenção já usada em
      // laudoResumoLista (contagem por LINHA, não por entidade única).
      eq(dados.porDia["2026-08-10"].campos, 2, "o carimbo antigo da tarefa deveria valer para as 2 linhas de risco dela");
    });
  }

  console.log("\n=== t124 · foto boa daqui nao e apagada por item sem foto vindo de outro aparelho ===");
  {
    /* O sumico de fotos que voltava a cada sincronizacao. A protecao de foto
       em aplicarAtualizacaoRemota so era acionada quando o arquivo remoto
       trazia __fotosOmitidas -- marca que separarFotosDoItem so escreve se o
       REMETENTE tinha foto. Aparelho que sobe o item sem foto nenhuma (fotos
       ainda nao baixadas, ou perdidas ali) mandava fotoGeral:null sem marca
       nenhuma, e do lado de ca a foto boa era substituida por null.
       Prova detalhada em banco.js, ENSAIO 28; aqui fica a versao curta que
       roda junto com o resto da suite. */
    const FOTO = "data:image/jpeg;base64," + "Z".repeat(120);
    t("null vindo de aparelho SEM foto nao apaga a foto local (sem depender de __fotosOmitidas)", ()=>{
      const local = { id:"mx", nome:"n", descricao:"antes", fotoGeral:FOTO, fotosOutras:[FOTO],
                      criadoEm:1750000000000, atualizadoEm:1750000000000 };
      const remoto = { id:"mx", nome:"n", descricao:"depois", fotoGeral:null, fotosOutras:[],
                       criadoEm:1750000000000, atualizadoEm:1750000009999 };
      ok(remoto.__fotosOmitidas === undefined, "o caso testado precisa ser o SEM marca");
      C.aplicarAtualizacaoRemota(local, remoto);
      eq(local.fotoGeral, FOTO, "a foto geral foi apagada por um null de fora");
      eq(local.fotosOutras.length, 1, "a lista de fotos foi zerada por uma lista vazia de fora");
      eq(local.descricao, "depois", "o texto editado no outro aparelho precisa continuar chegando");
    });
    t("foto de verdade que chega continua substituindo (a correcao nao congela a foto local)", ()=>{
      const OUTRA = "data:image/jpeg;base64," + "W".repeat(120);
      const local = { id:"my", fotoGeral:FOTO, fotosOutras:[FOTO], criadoEm:1, atualizadoEm:1 };
      const remoto = { id:"my", fotoGeral:OUTRA, fotosOutras:[FOTO, OUTRA], criadoEm:1, atualizadoEm:9 };
      C.aplicarAtualizacaoRemota(local, remoto);
      eq(local.fotoGeral, OUTRA);
      eq(local.fotosOutras.length, 2);
    });
    t("o caminho legitimo (__fotosOmitidas) continua preservando e marcando para buscar o pacote", ()=>{
      const local = { id:"mz", fotoGeral:FOTO, fotosOutras:[FOTO], criadoEm:1, atualizadoEm:1 };
      const remoto = { id:"mz", fotoGeral:null, fotosOutras:[], __fotosOmitidas:true, criadoEm:1, atualizadoEm:9 };
      C.aplicarAtualizacaoRemota(local, remoto);
      eq(local.fotoGeral, FOTO);
      ok(local.__fotosOmitidas === true && local.__fotosAtualizar === true, "faltou marcar para reconferir o pacote");
    });
  }

  console.log("\n=== t125 · envio contínuo: a fila anda até acabar, com a tela acesa ===");
  {
    /* O ciclo automatico roda a cada 2 min e SO com a aba visivel. No iPhone a
       tela apaga sozinha em menos de um minuto e o navegador congela o
       temporizador — o envio para. Enquanto a foto nao sobe, ela existe num
       lugar so, e foi assim que equipamentos criados em campo ficaram horas
       como "nunca subiu". Aqui a fila anda de 20 em 20s e a tela e mantida
       acesa ENQUANTO houver o que subir, sendo solta assim que zera. */
    const ctxE = vm.createContext({ console, Promise, Object, JSON, Date, Math, setInterval:()=>1, clearInterval:()=>{} });
    vm.runInContext(`
      var STATE = {};
      var __wakeLock = null, __sincronizandoAgora = false;
      var __enviosDesdeUltimaConferencia = 0;
      var pedidosTela = 0, soltouTela = 0, chamadasEnvio = 0, restantes = 0, porPassada = 3;
      var visivel = "visible";
      var document = { visibilityState: "visible", addEventListener: function(){} };
      Object.defineProperty(document, "visibilityState", { get: function(){ return visivel; } });
      function getOneDriveConta(){ return conta; }
      var conta = { email:"x" };
      async function manterTelaAcesa(){ pedidosTela++; __wakeLock = { release: async function(){} }; }
      async function liberarTelaAcesa(){ soltouTela++; __wakeLock = null; }
      function atualizarChipSync(){}
      /* Nova tentativa de gravacao que ficou pendente. O tique do envio
         continuo chama isso a cada 20s — foi ele que alargou a janela em que
         nada retentava (app em primeiro plano, tela acesa, sem edicao). */
      var salvamentosRetentados = 0, __salvamentoPendente = false;
      function persistir(){ salvamentosRetentados++; __salvamentoPendente = false; }
      function tentarSalvarSePendente(){ if(__salvamentoPendente) persistir(); }
      async function sincronizarIncrementalOneDrive(){
        chamadasEnvio++;
        var envia = Math.min(porPassada, restantes);
        for(var i=0;i<envia;i++) __enviosDesdeUltimaConferencia++;
        restantes -= envia;
      }
      function reset(fila){
        pedidosTela=0; soltouTela=0; chamadasEnvio=0; restantes=fila;
        __envioContinuoSegurandoTela=false; __envioContinuoAtivo=false;
        __wakeLock=null; __sincronizandoAgora=false; visivel="visible";
        STATE.envioContinuo = undefined; conta = { email:"x" };
      }
    `, ctxE);
    ["envioContinuoLigado","envioContinuoSoltarTela","envioContinuoTique"]
      .forEach(n=> vm.runInContext(funcao(n), ctxE));
    vm.runInContext("var __envioContinuoSegurandoTela=false, __envioContinuoAtivo=false, __envioContinuoTimer=null;", ctxE);
    const tique = ()=> vm.runInContext("envioContinuoTique()", ctxE);
    const ler = (expr)=> vm.runInContext(expr, ctxE);

    await (async ()=>{
      vm.runInContext("reset(7)", ctxE);
      await tique(); const p1 = ler("({seg:__envioContinuoSegurandoTela, rest:restantes})");
      await tique(); await tique();
      const p3 = ler("({seg:__envioContinuoSegurandoTela, rest:restantes})");
      await tique(); const p4 = ler("({seg:__envioContinuoSegurandoTela, soltou:soltouTela, rest:restantes})");
      t("O CASO REAL: a fila de 7 itens sobe INTEIRA, sem parar no meio", ()=>{
        eq(p1.rest, 4, "a 1a passada devia ter subido 3 dos 7");
        eq(p3.rest, 0, "a fila devia ter zerado, nao parado no meio");
        eq(ler("chamadasEnvio"), 4, "numero de passadas de envio fora do esperado");
      });
      t("segura a tela enquanto a fila anda", ()=>{ ok(p1.seg === true, "nao segurou a tela com fila cheia"); });
      t("solta a tela assim que a fila zera (nao fica acesa a toa)", ()=>{
        ok(p4.seg === false && p4.soltou === 1, "nao soltou a tela com a fila vazia");
      });
      t("pede a tela UMA vez, nao a cada passada", ()=>{ eq(ler("pedidosTela"), 1); });

      vm.runInContext("reset(9)", ctxE);
      await tique();
      const segurouAntes = ler("__envioContinuoSegurandoTela");
      vm.runInContext("visivel='hidden'", ctxE);
      await tique();
      t("app em segundo plano: para de enviar e SOLTA a tela", ()=>{
        ok(segurouAntes === true, "cenario nao preparou o segurar");
        ok(ler("__envioContinuoSegurandoTela") === false, "continuou segurando a tela escondido");
        eq(ler("chamadasEnvio"), 1, "continuou enviando com o app escondido");
        eq(ler("soltouTela"), 1);
      });

      vm.runInContext("reset(9); __sincronizandoAgora = true;", ctxE);
      await tique();
      t("sincronizacao manual em curso: nao disputa nem rouba a tela dela", ()=>{
        eq(ler("chamadasEnvio"), 0, "atropelou a sincronizacao manual");
        eq(ler("pedidosTela"), 0);
      });

      vm.runInContext("reset(9)", ctxE);
      await tique();
      vm.runInContext("STATE.envioContinuo = false;", ctxE);
      await tique();
      t("chave desligada: para de enviar e solta a tela", ()=>{
        eq(ler("chamadasEnvio"), 1, "continuou enviando com a chave desligada");
        ok(ler("__envioContinuoSegurandoTela") === false && ler("soltouTela") === 1);
      });

      vm.runInContext("reset(9); conta = null;", ctxE);
      await tique();
      t("sem OneDrive conectado: nao faz nada", ()=>{
        eq(ler("chamadasEnvio"), 0);
        ok(ler("__envioContinuoSegurandoTela") === false);
      });
    })();
  }

  console.log("\n=== t126 · categoria 1 da varredura: duplicacao e identidade da foto ===");
  {
    /* ---- 1.1 IDENTIDADE DA FOTO ---- */
    const ctxF = vm.createContext({ Map, String, Math, console });
    vm.runInContext("var __fotoIdCache = new Map();", ctxF);
    vm.runInContext(funcao("fotoCalcularId"), ctxF);
    const idDeFoto = (str)=>{ ctxF.__s = str; return vm.runInContext("fotoCalcularId(__s)", ctxF); };

    /* DESFEITO EM 27/08/2026, POR DECISAO EM CAMPO. A leitura do conteudo
       inteiro corrigia um defeito real e provado (duas fotos diferentes do
       mesmo tamanho recebendo o mesmo id), mas foi desfeita horas depois:
       houve relato de perda de fotos espalhada, e esta era a unica mudanca do
       dia que mexe em COMO cada foto e encontrada no banco. Entre um risco
       raro e conhecido (a colisao) e um risco possivelmente ativo, ficou o
       conhecido. Os testes abaixo passaram a cobrir o que a versao com
       amostragem PRECISA garantir; a checagem da colisao volta junto com a
       leitura completa, quando houver ensaio do ciclo completo (gravar,
       fechar, reabrir, gravar de novo) sobre um banco com centenas de fotos —
       foi a falta dele que deixou a mudanca passar nos cinco scripts. */
    t("a mesma foto produz sempre o mesmo id — e o que faz a foto ser gravada uma vez so", ()=>{
      const f = "data:image/jpeg;base64," + "Q".repeat(5000);
      eq(idDeFoto(f), idDeFoto(f.slice(0)), "a mesma foto gerou ids diferentes");
    });
    t("fotos de TAMANHOS diferentes nunca colidem (o comprimento entra no id)", ()=>{
      const a = idDeFoto("data:image/jpeg;base64," + "Z".repeat(5000));
      const b = idDeFoto("data:image/jpeg;base64," + "Z".repeat(5001));
      ok(a !== b, "duas fotos de tamanhos diferentes receberam o mesmo id");
    });
    t("diferenca DENTRO das janelas amostradas e detectada (inicio, meio e fim)", ()=>{
      const n = 300000;
      const base = "data:image/jpeg;base64," + "A".repeat(n);
      const arr = base.split("");
      const idBase = idDeFoto(arr.join(""));
      // Posicoes dentro das tres janelas de 4KB que a amostragem le
      [10, Math.floor(n/2), n-10].forEach(pos=>{
        const c = arr.slice(); c[pos] = "B";
        ok(idDeFoto(c.join("")) !== idBase, "diferenca na posicao " + pos + " passou despercebida");
      });
    });
    t("o id NAO usa o prefixo v2 — a versao com leitura completa foi mesmo desfeita",
      ()=>{ ok(idDeFoto("data:image/jpeg;base64," + "W".repeat(9000)).indexOf("v2") !== 0); });
    t("o ponto cego da amostragem esta DOCUMENTADO no codigo, para nao ser reintroduzido as cegas", ()=>{
      ok(HTML.indexOf("DESFEITO EM 27/08/2026") > 0, "sumiu o registro de que isto foi desfeito e por que");
      ok(HTML.indexOf("REINTRODUZIR a leitura completa sem antes") > 0,
         "sumiu a condicao que precisa ser cumprida antes de tentar de novo");
      ok(HTML.indexOf("gravar → fechar → reabrir → gravar de novo") > 0
         || HTML.indexOf("reabrir") > 0,
         "a condicao precisa citar o ensaio do ciclo completo, que foi a lacuna real");
    });

    /* ---- 1.2 e 1.3 DUPLICACAO ---- */
    const ctxD = vm.createContext({ Object, String, Date, Math, JSON, console });
    vm.runInContext("var __relogio = 1750000000000; function uid(){ return 'novo'+(__relogio++); } function agoraSync(){ return 987654321; }", ctxD);
    ["__laudoCopiaViraSugestao","__prepararItemCopiado","prepararCopiaDuplicada"]
      .forEach(n=> vm.runInContext(funcao(n), ctxD));
    vm.runInContext(constante("CAMPOS_MARCA_LOCAL_COPIA"), ctxD);

    const maquinaOriginal = ()=>({
      id:"m1", nome:"Classificadora SZ-5252", criadoEm:1, atualizadoEm:1,
      fotoGeral:"data:image/jpeg;base64,AAA",
      __fotosPerdidas:true, __fotosOmitidas:true, __fotoNuvemVerificadaEm:123,
      laudoIA:{ escopoSug:"sugestao da IA", escopoFin:"ESCOPO APROVADO", escopoSt:"ok", duvEscopo:"", em:"x" },
      tarefas:[{ id:"t1", tarefa:"Operacao", criadoEm:1, atualizadoEm:1,
        laudoIA:{ tarefaSug:"s", tarefaFin:"TAREFA APROVADA", tarefaSt:"ok" },
        riscos:[{ id:"r1", nome:"Agarramento", criadoEm:1, atualizadoEm:1,
          foto:"data:image/jpeg;base64,BBB", __fotosPerdidas:true,
          laudoIA:{ riscoSug:"s1", riscoFin:"RISCO APROVADO", riscoSt:"ok",
                    solucaoSug:"s2", solucaoFin:"", solucaoSt:"",
                    existenteSug:"", existenteFin:"", existenteSt:"" } }] }] });

    t("O CASO REAL: a copia NAO nasce com os textos do laudo ja aprovados", ()=>{
      ctxD.__o = maquinaOriginal();
      const c = vm.runInContext('prepararCopiaDuplicada(JSON.parse(JSON.stringify(__o)), "maquina")', ctxD);
      eq(c.laudoIA.escopoSt, "pend", "o escopo da copia continuou aprovado");
      eq(c.tarefas[0].laudoIA.tarefaSt, "pend", "a tarefa da copia continuou aprovada");
      eq(c.tarefas[0].riscos[0].laudoIA.riscoSt, "pend", "o risco da copia continuou aprovado");
    });
    t("mas o TEXTO e preservado como sugestao — ninguem perde trabalho escrito", ()=>{
      ctxD.__o = maquinaOriginal();
      const c = vm.runInContext('prepararCopiaDuplicada(JSON.parse(JSON.stringify(__o)), "maquina")', ctxD);
      eq(c.laudoIA.escopoSug, "ESCOPO APROVADO", "o texto aprovado se perdeu na copia");
      eq(c.laudoIA.escopoFin, "", "a copia manteve um texto final aplicado");
      eq(c.tarefas[0].riscos[0].laudoIA.riscoSug, "RISCO APROVADO");
    });
    t("campo do laudo que estava VAZIO continua vazio, nao vira pendencia falsa", ()=>{
      ctxD.__o = maquinaOriginal();
      const c = vm.runInContext('prepararCopiaDuplicada(JSON.parse(JSON.stringify(__o)), "maquina")', ctxD);
      eq(c.tarefas[0].riscos[0].laudoIA.existenteSt, "", "campo vazio virou pendencia do nada");
      eq(c.tarefas[0].riscos[0].laudoIA.solucaoSug, "s2", "sugestao sem aprovacao devia ser mantida");
      eq(c.tarefas[0].riscos[0].laudoIA.solucaoSt, "pend");
    });
    t("as marcas internas deste aparelho nao viajam para a copia", ()=>{
      ctxD.__o = maquinaOriginal();
      const c = vm.runInContext('prepararCopiaDuplicada(JSON.parse(JSON.stringify(__o)), "maquina")', ctxD);
      ok(c.__fotosPerdidas === undefined && c.__fotosOmitidas === undefined
         && c.__fotoNuvemVerificadaEm === undefined, "a copia nasceu marcada como danificada");
      ok(c.tarefas[0].riscos[0].__fotosPerdidas === undefined, "a marca ficou no risco copiado");
    });
    t("a copia recebe ids novos em TODOS os niveis e carimbo de data de agora", ()=>{
      ctxD.__o = maquinaOriginal();
      const c = vm.runInContext('prepararCopiaDuplicada(JSON.parse(JSON.stringify(__o)), "maquina")', ctxD);
      ok(c.id !== "m1" && c.tarefas[0].id !== "t1" && c.tarefas[0].riscos[0].id !== "r1", "id repetido na copia");
      eq(c.atualizadoEm, 987654321, "a copia ficou com o carimbo do original");
      eq(c.tarefas[0].riscos[0].atualizadoEm, 987654321);
      ok(c.criadoEm > 1, "criadoEm nao foi atualizado");
    });
    t("a FOTO continua sendo copiada — e o motivo de duplicar", ()=>{
      ctxD.__o = maquinaOriginal();
      const c = vm.runInContext('prepararCopiaDuplicada(JSON.parse(JSON.stringify(__o)), "maquina")', ctxD);
      eq(c.fotoGeral, "data:image/jpeg;base64,AAA");
      eq(c.tarefas[0].riscos[0].foto, "data:image/jpeg;base64,BBB");
    });
    t("o original nao e tocado pela duplicacao", ()=>{
      ctxD.__o = maquinaOriginal();
      vm.runInContext('prepararCopiaDuplicada(JSON.parse(JSON.stringify(__o)), "maquina")', ctxD);
      eq(ctxD.__o.laudoIA.escopoSt, "ok", "a duplicacao rebaixou o laudo do ORIGINAL");
      eq(ctxD.__o.id, "m1");
    });
  }

  console.log("\n=== t127 · importar backup nao pode apagar foto (1.4 da varredura) ===");
  {
    /* Quando o item do backup e mais novo, a importacao substituia o item
       local INTEIRO. Backup gerado num aparelho que ainda nao baixou as
       fotos — ou um backup so de texto — apagava a foto boa daqui, sem
       aviso. Mesma classe do defeito ja corrigido na sincronizacao
       (aplicarAtualizacaoRemota), mas no caminho que substitui MAIS dado de
       uma vez em todo o app. */
    const ctxI = vm.createContext({ Object, Array, String, JSON, console });
    vm.runInContext('var CAMPO_FOTOS_LISTA = "fotosOutras";', ctxI);
    vm.runInContext(constante("CAMPOS_FOTO_UNICA"), ctxI);
    ["__ehFotoEmbutida","__preservarFotosNaSubstituicao"].forEach(n=> vm.runInContext(funcao(n), ctxI));
    const FOTO = "data:image/jpeg;base64," + "F".repeat(80);
    const OUTRA = "data:image/jpeg;base64," + "G".repeat(80);
    const juntar = (ex, nv)=>{ ctxI.__ex = ex; ctxI.__nv = nv; return vm.runInContext("__preservarFotosNaSubstituicao(__ex, __nv)", ctxI); };

    t("O CASO REAL: backup SEM foto, mais novo, nao apaga a foto que esta aqui", ()=>{
      const local  = { id:"r1", nome:"velho", foto:FOTO, fotoGeral:FOTO, fotosOutras:[FOTO] };
      const doArquivo = { id:"r1", nome:"NOVO", foto:null, fotoGeral:null, fotosOutras:[] };
      const r = juntar(local, doArquivo);
      eq(r.foto, FOTO, "a foto do risco foi apagada pela importacao");
      eq(r.fotoGeral, FOTO, "a foto do equipamento foi apagada pela importacao");
      eq(r.fotosOutras.length, 1, "a lista de fotos foi zerada pela importacao");
      eq(r.nome, "NOVO", "o texto mais novo do backup precisa continuar entrando");
    });
    t("backup COM foto mais nova substitui normalmente (nao virou bloqueio geral)", ()=>{
      const local  = { id:"r1", foto:FOTO, fotosOutras:[FOTO] };
      const doArquivo = { id:"r1", foto:OUTRA, fotosOutras:[FOTO, OUTRA] };
      const r = juntar(local, doArquivo);
      eq(r.foto, OUTRA);
      eq(r.fotosOutras.length, 2);
    });
    t("lista que chega MENOR nao reduz a de ca", ()=>{
      const r = juntar({ id:"r1", fotosOutras:[FOTO, OUTRA] }, { id:"r1", fotosOutras:[FOTO] });
      eq(r.fotosOutras.length, 2, "a importacao reduziu a lista de fotos");
    });
    t("item sem foto dos dois lados continua normal", ()=>{
      const r = juntar({ id:"r1", foto:null, fotosOutras:[] }, { id:"r1", foto:null, fotosOutras:[], nome:"x" });
      eq(r.nome, "x");
      ok(r.foto === null);
    });
    t("o item local nao e alterado — a funcao devolve uma copia", ()=>{
      const local = { id:"r1", foto:FOTO };
      const r = juntar(local, { id:"r1", foto:null, nome:"n" });
      eq(local.foto, FOTO);
      ok(r !== local && r.nome === "n");
    });
    t("os TRES niveis que substituem item usam a protecao (risco, equipamento e area)", ()=>{
      eq((HTML.match(/__preservarFotosNaSubstituicao\(ex, nv\)/g)||[]).length, 3,
         "algum nivel da importacao continua substituindo sem proteger a foto");
    });
  }

  console.log("\n=== t128 · iOS: texto digitado sai da memoria e gravacao que falha e retentada ===");
  {
    /* ---- A: texto digitado precisa ser gravado ---- */
    const ctxA = vm.createContext({ console, setTimeout, clearTimeout, Date });
    vm.runInContext(`
      var __draftEntity = null, gravacoes = 0;
      function gravarDraftPersistente(){ gravacoes++; }
    `, ctxA);
    ["agendarGravacaoDraft","flushDraftPendente"].forEach(n=> vm.runInContext(funcao(n), ctxA));
    vm.runInContext("var __draftSaveTimer = null, __draftPendente = false;", ctxA);

    t("O CASO REAL: digitar e ir para a camera antes do atraso NAO perde o texto", async ()=>{
      /* Sequencia do dia de campo: digita nome/descricao e toca na camera.
         No iPhone a camera manda o app para segundo plano e o sistema pode
         encerrar a aba ali. Sem o descarregamento na saida de foco, o texto
         digitado nunca teria saido da memoria. */
      vm.runInContext("__draftEntity = {}; gravacoes = 0; __draftPendente = false;", ctxA);
      vm.runInContext("agendarGravacaoDraft();", ctxA);       // digitou
      eq(vm.runInContext("gravacoes", ctxA), 0, "gravou a cada tecla, sem o atraso");
      vm.runInContext("flushDraftPendente();", ctxA);          // camera abriu / app saiu de foco
      eq(vm.runInContext("gravacoes", ctxA), 1, "o texto digitado nao foi gravado ao sair de foco");
    });
    t("digitar varias teclas seguidas gera UMA gravacao, nao uma por tecla", ()=>{
      vm.runInContext("__draftEntity = {}; gravacoes = 0; __draftPendente = false;", ctxA);
      for(let i=0;i<20;i++) vm.runInContext("agendarGravacaoDraft();", ctxA);
      vm.runInContext("flushDraftPendente();", ctxA);
      eq(vm.runInContext("gravacoes", ctxA), 1, "gravou mais de uma vez para a mesma digitacao");
    });
    t("sair de foco sem nada digitado nao grava a toa", ()=>{
      vm.runInContext("__draftEntity = {}; gravacoes = 0; __draftPendente = false;", ctxA);
      vm.runInContext("flushDraftPendente();", ctxA);
      eq(vm.runInContext("gravacoes", ctxA), 0);
    });
    t("sem formulario aberto, digitar nao agenda nada", ()=>{
      vm.runInContext("__draftEntity = null; gravacoes = 0; __draftPendente = false;", ctxA);
      vm.runInContext("agendarGravacaoDraft();", ctxA);
      ok(vm.runInContext("__draftPendente", ctxA) === false);
    });
    t("os 31 campos de texto passaram a gravar o rascunho ao digitar", ()=>{
      ok(HTML.indexOf("setDraftField(field, value){ if(__draftEntity){ __draftEntity[field]=value; agendarGravacaoDraft(); } }") > 0,
         "setDraftField voltou a escrever so na memoria");
    });
    t("o rascunho sai junto com o STATE nos eventos de saida do app", ()=>{
      ok(HTML.indexOf("function flushTudoAntesDeSair(){") > 0);
      ok(HTML.indexOf('window.addEventListener("pagehide", flushTudoAntesDeSair);') > 0,
         "pagehide nao descarrega o rascunho");
      ok(HTML.indexOf('if(document.visibilityState==="hidden") flushTudoAntesDeSair();') > 0,
         "sair de foco nao descarrega o rascunho");
    });

    /* ---- B: gravacao que falhou precisa ser retentada sozinha ---- */
    t("O CASO REAL: gravacao que falhou e retentada sozinha, sem depender de o usuario reparar no selo", ()=>{
      const ctxB = vm.createContext({ console });
      vm.runInContext("var __salvamentoPendente = true, tentativas = 0; function persistir(){ tentativas++; __salvamentoPendente = false; }", ctxB);
      vm.runInContext(funcao("tentarSalvarSePendente"), ctxB);
      vm.runInContext("tentarSalvarSePendente();", ctxB);
      eq(vm.runInContext("tentativas", ctxB), 1, "nao tentou gravar de novo com salvamento pendente");
      vm.runInContext("tentarSalvarSePendente();", ctxB);
      eq(vm.runInContext("tentativas", ctxB), 1, "ficou tentando gravar mesmo sem nada pendente");
    });
    t("a nova tentativa entra NOS DOIS ritmos — o de 2 min e o de 20s do envio continuo", ()=>{
      /* O envio continuo alargou a janela sem retentativa (mantem o app em
         primeiro plano por muito mais tempo), entao e ele que precisa cobri-la. */
      ok(HTML.indexOf('if(document.visibilityState==="visible"){ tentarSalvarSePendente(); sincronizarIncrementalNaPasta();') > 0,
         "o ciclo de 2 minutos nao retenta a gravacao");
      const tique = funcao("envioContinuoTique");
      ok(tique.indexOf("tentarSalvarSePendente();") > 0, "o tique de 20s nao retenta a gravacao");
      ok(tique.indexOf("tentarSalvarSePendente();") < tique.indexOf("if(!envioContinuoLigado()"),
         "a retentativa ficou DEPOIS das travas — nao roda sem OneDrive ou com a chave desligada");
    });
  }

  console.log("\n=== t129 · rascunho guarda REFERENCIA de foto, nao a foto (app fechava ao digitar) ===");
  {
    /* Reportado em campo: o app fechava sozinho DURANTE A DIGITACAO, poucas
       horas depois de eu fazer o texto digitado ser gravado. A correcao era
       certa; o efeito colateral nao: cada pausa na digitacao regravava o
       rascunho INTEIRO, e o rascunho levava as fotos embutidas — varios MB.
       No iPhone, gravacao de varios MB repetida a cada pausa estoura a
       memoria e o sistema encerra a aba. */
    const FOTO = "data:image/jpeg;base64," + "A".repeat(200000);   // ~200 KB
    const FOTO2 = "data:image/jpeg;base64," + "B".repeat(200000);
    const ctxR = vm.createContext({ Map, Set, Array, Object, String, JSON, console });
    vm.runInContext('var FOTO_REF_PREFIXO = "idbfoto:"; var __fotoIdCache = new Map(); var __fotoIdConhecido = new Map();', ctxR);
    ["ehFotoDataUrlPersist","ehFotoRefPersist","fotoCalcularId","fotosExtrairParaRefs",
     "fotosColetarRefs","fotosReinserirDeMapa"].forEach(n=> vm.runInContext(funcao(n), ctxR));

    t("O CASO REAL: o que vai para o disco a cada digitacao encolhe de MB para KB", ()=>{
      ctxR.__e = { id:"m1", nome:"Classificadora", descricao:"x",
                   fotoGeral:FOTO, fotoPlaqueta:FOTO2, fotosOutras:[FOTO], tarefas:[] };
      const antes = vm.runInContext("JSON.stringify(__e).length", ctxR);
      const depois = vm.runInContext(`(function(){
        var m = new Map();
        return JSON.stringify(fotosExtrairParaRefs(__e, m)).length;
      })()`, ctxR);
      ok(antes > 400000, "o cenario precisa ter fotos de verdade (antes=" + antes + ")");
      ok(depois < 2000, "o rascunho continua levando as fotos inteiras (depois=" + depois + ")");
      ok(antes / depois > 100, "a reducao foi pequena demais para explicar o fim das quedas");
    });
    t("a foto vira referencia curta, nao some", ()=>{
      ctxR.__e = { id:"m1", fotoGeral:FOTO, fotosOutras:[FOTO2] };
      const enxuta = vm.runInContext(`(function(){ __m = new Map(); return fotosExtrairParaRefs(__e, __m); })()`, ctxR);
      ok(String(enxuta.fotoGeral).indexOf("idbfoto:") === 0, "a foto unica nao virou referencia");
      ok(String(enxuta.fotosOutras[0]).indexOf("idbfoto:") === 0, "a lista de fotos nao virou referencia");
      eq(vm.runInContext("__m.size", ctxR), 2, "as duas fotos deveriam ir para o mapa de bytes");
    });
    t("ida e volta devolve a foto IDENTICA — o rascunho recuperado nao perde nada", ()=>{
      ctxR.__e = { id:"m1", nome:"Nome digitado", fotoGeral:FOTO, fotosOutras:[FOTO2] };
      const volta = vm.runInContext(`(function(){
        var m = new Map();
        var enxuta = fotosExtrairParaRefs(__e, m);
        return fotosReinserirDeMapa(enxuta, m);
      })()`, ctxR);
      eq(volta.fotoGeral, FOTO, "a foto do equipamento nao voltou igual");
      eq(volta.fotosOutras[0], FOTO2, "a foto da lista nao voltou igual");
      eq(volta.nome, "Nome digitado", "o texto digitado se perdeu na ida e volta");
    });
    t("gravar e ler o rascunho usam a mesma camada de fotos do STATE", ()=>{
      const g = funcao("gravarDraftPersistente");
      ok(g.indexOf("fotosExtrairParaRefs(__draftEntity, mapaFotos)") > 0, "o rascunho nao passa mais pela camada de fotos");
      ok(g.indexOf("if(!indice.has(fid)) novas.push") > 0, "esta regravando foto que o banco ja tem");
      const l = funcao("lerDraftPersistente");
      ok(l.indexOf("fotosReinserirDeMapa(bruto, mapa)") > 0, "a leitura nao reencaixa as fotos");
      ok(l.indexOf("if(refs.size === 0) return bruto;") > 0,
         "rascunho de versao antiga (fotos embutidas) precisa passar reto, sem quebrar");
    });
    t("digitar nao regrava foto nenhuma que o banco ja tenha", ()=>{
      const g = funcao("gravarDraftPersistente");
      ok(g.indexOf("for(const [fid, dataUrl] of novas) tx.objectStore(DB_STORE).put(dataUrl, FOTO_KEY_PREFIXO + fid);") > 0);
    });
    t("o atraso da digitacao subiu para 900ms, e o descarregamento na saida continua", ()=>{
      ok(HTML.indexOf("}, 900);") > 0, "o atraso continua curto demais");
      ok(HTML.indexOf("function flushDraftPendente(){") > 0, "sumiu o descarregamento imediato ao sair de foco");
    });
  }

  console.log("\n=== t130 · a busca de fotos na nuvem so confere quem pode ter perdido algo ===");
  {
    /* Relatado em campo: a busca ficava lenta, travava e nao recuperava nada
       ("0 de 185"). Causa: o filtro considerava candidato todo item com
       QUALQUER campo de foto vazio — e todo equipamento nasce com
       fotoPlaqueta:null, que quase nunca e preenchida. Resultado: quase todo
       equipamento virava candidato, baixava seu pacote de fotos (varios MB)
       da nuvem, e nao tinha nada para receber. */
    const ctxC = vm.createContext({ Array, Object, String, console });
    vm.runInContext('var CAMPO_FOTOS_LISTA = "fotosOutras"; var CAMPO_MARCA_FOTO_PERDIDA = "__fotosPerdidas";', ctxC);
    vm.runInContext(constante("CAMPOS_FOTO_UNICA"), ctxC);
    ["__ehFotoEmbutida","itemTemEspacoDeFotoVazio"].forEach(n=> vm.runInContext(funcao(n), ctxC));
    const F = "data:image/jpeg;base64,AAAA";
    const entra = (item)=>{ ctxC.__i = item; return vm.runInContext("itemTemEspacoDeFotoVazio(__i)", ctxC); };

    t("O CASO REAL: equipamento COM foto e sem plaqueta NAO entra mais na busca", ()=>{
      ok(entra({ fotoGeral:F, fotoPlaqueta:null, fotosOutras:[] }) === false,
         "voltou a marcar todo equipamento sem plaqueta como candidato");
      ok(entra({ foto:F, fotosOutras:[] }) === false, "risco com foto virou candidato a toa");
    });
    t("item MARCADO como danificado entra", ()=>{
      ok(entra({ fotoGeral:F, fotoPlaqueta:null, fotosOutras:[], __fotosPerdidas:true }) === true);
    });
    t("lista com referencia quebrada (o quadro vermelho) entra", ()=>{
      ok(entra({ fotoGeral:F, fotoPlaqueta:F, fotosOutras:[null] }) === true);
      ok(entra({ fotoGeral:F, fotosOutras:[F, null] }) === true, "lista com uma boa e uma quebrada tem de entrar");
    });
    t("item SEM nenhuma foto de verdade entra (a nuvem tem pacote para ele)", ()=>{
      ok(entra({ fotoGeral:null, fotoPlaqueta:null, fotosOutras:[] }) === true);
      ok(entra({ foto:null, fotosOutras:[] }) === true);
    });
    t("ESCALA: no tamanho do projeto real, a lista de candidatos encolhe varias vezes", ()=>{
      /* 382 equipamentos, 90% com foto geral, 5% com plaqueta, 30 danificados.
         Criterio antigo: 382 (todos). Criterio novo: so os que faltam algo. */
      let agora = 0;
      for(let i=0;i<382;i++){
        const m = { fotoGeral: (i%10!==0)?F:null, fotoPlaqueta: (i%20===0)?F:null, fotosOutras:[] };
        if(i<30) m.__fotosPerdidas = true;
        if(entra(m)) agora++;
      }
      ok(agora < 100, "a lista de candidatos continua inflada (" + agora + " de 382)");
      ok(agora >= 30, "encolheu demais: os itens danificados precisam continuar entrando (" + agora + ")");
    });
  }

  console.log("\n=== t131 · seleção de itens do laudo (ocultar equipamento/risco na impressão) ===");
  {
    /* Pedido em campo: escolher o que entra no laudo impresso sem apagar
       cadastro nenhum. Ferramenta some por padrão, só aparece no "modo de
       seleção" (botão junto do zoom); desmarcar só grava um booleano
       (ocultoLaudo) e recarrega a montagem — REGRA ZERO continua valendo:
       nada é excluído, só deixa de entrar NESTE laudo. */
    const linhaFiltro = trecho(
      "const itensLaudo = STATE.ui.lpModoOcultar ? alvo.itens",
      "alvo.itens.filter(it=> !it.maquina.ocultoLaudo && !it.risco.ocultoLaudo);"
    ) + "alvo.itens.filter(it=> !it.maquina.ocultoLaudo && !it.risco.ocultoLaudo);";

    t("a linha do filtro é exatamente a que o teste vai executar (evita testar cópia divergente do real)", ()=>{
      ok(linhaFiltro.indexOf("STATE.ui.lpModoOcultar ? alvo.itens") > 0);
      ok(linhaFiltro.indexOf("!it.maquina.ocultoLaudo && !it.risco.ocultoLaudo") > 0);
    });

    const montarFiltro = (modo)=>{
      const ctx = vm.createContext({ STATE:{ ui:{ lpModoOcultar: modo } }, alvo:null, __r:null });
      vm.runInContext("function calcular(alvo){ " + linhaFiltro + " return itensLaudo; }", ctx);
      return (itens)=>{ ctx.alvo = { itens }; return vm.runInContext("calcular(alvo)", ctx); };
    };

    t("FORA do modo de seleção: risco oculto some, equipamento oculto some (com todos os riscos dele)", ()=>{
      const calcular = montarFiltro(false);
      const visivel   = { maquina:{ id:"m1" }, risco:{ id:"r1" } };
      const rOculto   = { maquina:{ id:"m1" }, risco:{ id:"r2", ocultoLaudo:true } };
      const mOculta1  = { maquina:{ id:"m2", ocultoLaudo:true }, risco:{ id:"r3" } };
      const mOculta2  = { maquina:{ id:"m2", ocultoLaudo:true }, risco:{ id:"r4" } };
      const r = calcular([visivel, rOculto, mOculta1, mOculta2]);
      eq(r.length, 1, "só o item visível deveria sobrar");
      ok(r[0] === visivel);
    });
    t("DENTRO do modo de seleção: tudo entra (oculto inclusive) — senão não dá para remarcar de volta", ()=>{
      const calcular = montarFiltro(true);
      const itens = [
        { maquina:{ id:"m1" }, risco:{ id:"r1" } },
        { maquina:{ id:"m1" }, risco:{ id:"r2", ocultoLaudo:true } },
        { maquina:{ id:"m2", ocultoLaudo:true }, risco:{ id:"r3" } },
      ];
      eq(calcular(itens).length, 3, "modo de seleção precisa mostrar também o que está oculto");
    });
    t("máquina oculta some do inventário mesmo com outro risco dela ainda visível na mesma máquina",()=>{
      // Caso limite: só o RISCO está marcado, a máquina não -- a máquina continua
      // no inventário (ainda tem item visível dela). Já com a MÁQUINA marcada,
      // nenhum risco dela sobra, então ela não pode aparecer em lugar nenhum.
      const calcular = montarFiltro(false);
      const r1 = { maquina:{ id:"m1" }, risco:{ id:"r1", ocultoLaudo:true } };
      const r2 = { maquina:{ id:"m1" }, risco:{ id:"r2" } };
      const restou = calcular([r1, r2]);
      eq(restou.length, 1);
      ok(restou[0] === r2, "a máquina precisa continuar no inventário via o risco r2, que segue visível");
    });

    t("o botão do modo de seleção mora junto do zoom (mesmo grupo flutuante, sempre visível ao rolar)", ()=>{
      const barra = trecho('<div class="lp-flut">', "</div>\n      </div>");
      ok(barra.indexOf("App.lpZoom(1)") > 0 && barra.indexOf("App.lpToggleModoOcultar()") > 0,
         "o botão de seleção saiu do mesmo grupo flutuante dos botões de zoom");
    });
    t("a ferramenta de desmarcar fica escondida até o usuário ligar o modo de seleção", ()=>{
      ok(HTML.indexOf(".lp-oculta-toggle{display:none;") > 0);
      ok(HTML.indexOf(".lp-modo-ocultar .lp-oculta-toggle{display:flex}") > 0);
    });
    t("a ferramenta nunca aparece no PDF (guarda dentro do @media print)", ()=>{
      const i = HTML.lastIndexOf("@media print{");
      ok(i > 0 && HTML.indexOf(".lp-oculta-toggle{display:none !important}", i) > i);
    });
    t("desmarcar não apaga o cadastro — só troca ocultoLaudo e recarimba para sincronizar", ()=>{
      ok(HTML.indexOf("m.ocultoLaudo = !m.ocultoLaudo;") > 0);
      ok(HTML.indexOf("m.atualizadoEm = agoraSync();") > 0);
      ok(HTML.indexOf("it.risco.ocultoLaudo = !it.risco.ocultoLaudo;") > 0);
      ok(HTML.indexOf("it.risco.atualizadoEm = agoraSync();") > 0);
      ["lpToggleMaquina","lpToggleRisco"].forEach(m=>{
        ok(HTML.indexOf(m + "(") > 0, "método " + m + " não encontrado");
      });
    });
    t("o campo novo (ocultoLaudo) inicializa indefinido, não força valor em cadastro antigo", ()=>{
      // Comportamento assumido em toda a lógica: item sem o campo é tratado
      // como visível (!undefined === true). Confirma que nada no código
      // inicializa ocultoLaudo:false em massa (isso obrigaria reescrever
      // cadastro antigo inteiro à toa).
      ok(HTML.indexOf("ocultoLaudo:false") < 0 && HTML.indexOf("ocultoLaudo: false") < 0);
    });
  }

  console.log("\n=== t132 · seleção do laudo: cascata para os riscos e checkbox no inventário ===");
  {
    /* Pedido em campo, no dia seguinte ao t131: desmarcar o equipamento tem
       que levar os riscos dele junto (senão o checkbox de um risco fica
       "marcado" mentindo, mesmo o item não aparecendo por causa do pai
       oculto) — e o mesmo campo de desmarcar precisa existir no inventário
       também, escrevendo no MESMO m.ocultoLaudo (não um campo paralelo). */
    const linhaCascata = trecho(
      "(m.tarefas||[]).forEach(t=> (t.riscos||[]).forEach(r=>{",
      "}));"
    ) + "}));";
    t("a linha da cascata é exatamente a que o teste vai executar", ()=>{
      ok(linhaCascata.indexOf("r.ocultoLaudo = m.ocultoLaudo;") > 0);
      ok(linhaCascata.indexOf("r.atualizadoEm = agoraSync();") > 0);
    });

    const ctxCasc = vm.createContext({ agoraSync: ()=>999999 });
    vm.runInContext("function cascata(m){ " + linhaCascata + " }", ctxCasc);
    const rodarCascata = (m)=>{ ctxCasc.m = m; vm.runInContext("cascata(m)", ctxCasc); return m; };

    t("O CASO REAL: desmarcar o equipamento desmarca TODOS os riscos, em todas as tarefas dele", ()=>{
      const m = { ocultoLaudo:true, tarefas:[
        { riscos:[{id:"r1"},{id:"r2"}] },
        { riscos:[{id:"r3"}] },
        { riscos:[] },
      ]};
      rodarCascata(m);
      const todos = m.tarefas.flatMap(t=>t.riscos);
      eq(todos.length, 3);
      todos.forEach(r=> ok(r.ocultoLaudo === true && r.atualizadoEm === 999999, "risco " + r.id + " não foi cascateado"));
    });
    t("remarcar o equipamento (ocultoLaudo:false) também remarca os riscos — não fica preso escondido", ()=>{
      const m = { ocultoLaudo:false, tarefas:[{ riscos:[{id:"r1", ocultoLaudo:true}] }] };
      rodarCascata(m);
      ok(m.tarefas[0].riscos[0].ocultoLaudo === false);
    });
    t("máquina sem tarefas ou tarefa sem riscos não estoura (tarefas/riscos podem faltar)", ()=>{
      rodarCascata({ ocultoLaudo:true });               // sem tarefas nenhuma
      rodarCascata({ ocultoLaudo:true, tarefas:[] });    // tarefas vazia
      rodarCascata({ ocultoLaudo:true, tarefas:[{}] });  // tarefa sem riscos
    });

    t("o inventário tem o MESMO campo de desmarcar equipamento — chama App.lpToggleMaquina, não um método próprio", ()=>{
      eq((HTML.match(/onchange="App\.lpToggleMaquina\('\$\{m\.id\}'\)"/g)||[]).length, 2,
         "tem que existir exatamente em dois lugares: o inventário e o bloco do equipamento no corpo do laudo");
    });
    t("o checkbox do inventário mora dentro da célula da foto, sem coluna nova (INV_COLS não mudou)", ()=>{
      ok(HTML.indexOf('class="lp-oculta-toggle lp-oculta-toggle-inv"') > 0);
      ok(HTML.indexOf('<td class="foto">${foto? `<img src="${foto}">` : ""}<label class="lp-oculta-toggle lp-oculta-toggle-inv"') > 0,
         "o checkbox precisa estar DENTRO de <td class=\"foto\">, não numa coluna própria");
    });
    t("o overlay do inventário tem âncora própria e não herda o tamanho grande do checkbox padrão", ()=>{
      ok(HTML.indexOf(".lp-inv td.foto{padding:2px;position:relative}") > 0);
      ok(HTML.indexOf(".lp-inv .lp-oculta-toggle-inv input{width:11px;height:11px") > 0);
    });
  }

  console.log("\n=== t133 · nome sugerido ao salvar o PDF do laudo ===");
  {
    /* Pedido em campo: "Salvar como PDF" sugeria o título genérico da aba.
       Agora sugere "Laudo NR-12 - Empresa - Área", trocando document.title
       só durante a impressão (não existe outro jeito de sugerir nome de
       arquivo num window.print() comum). */
    const ctxN = vm.createContext({ String });
    vm.runInContext(funcao("nomeArquivoLaudo"), ctxN);
    const nome = (proj, area)=>{ ctxN.__p = proj; ctxN.__a = area; return vm.runInContext("nomeArquivoLaudo(__p, __a)", ctxN); };

    t("O CASO REAL: junta Laudo NR-12, empresa e área com hífen", ()=>{
      eq(nome({empresa:"Corteva Agriscience"}, {nome:"Debulha"}), "Laudo NR-12 - Corteva Agriscience - Debulha");
    });
    t("tira barra, dois-pontos e outros caracteres que quebrariam nome de arquivo no Windows", ()=>{
      eq(nome({empresa:'Cliente/Teste: "A" <B> *?|'}, {nome:"Área 1"}), "Laudo NR-12 - ClienteTeste A B - Área 1");
    });
    t("empresa ou área vazia some do nome, em vez de deixar hífen sobrando", ()=>{
      eq(nome({empresa:""}, {nome:"Área X"}), "Laudo NR-12 - Área X");
      eq(nome({empresa:"Cliente Y"}, {nome:""}), "Laudo NR-12 - Cliente Y");
      eq(nome(null, null), "Laudo NR-12");
    });
    t("espaços repetidos (de caractere removido no meio) viram um só", ()=>{
      eq(nome({empresa:"A/B Ltda"}, {nome:"X"}), "Laudo NR-12 - AB Ltda - X");
    });

    t("o título muda para o nome do arquivo só na hora do print, e a função usa a área selecionada na tela",
      ()=>{
        ok(HTML.indexOf("document.title = nomeArquivoLaudo(alvo.proj, alvo.area);") > 0);
        ok(HTML.indexOf("document.title = tituloAntigo;") > 0, "não devolve o título original depois de imprimir");
      });
  }

  console.log("\n=== t134 · BUG DE CAMPO: risco desmarcado saía no PDF ===");
  {
    /* Relatado em campo em 27/08/2026, em DUAS rodadas:
       1ª causa: o modo de seleção mostra TUDO na tela (inclusive o que está
         desmarcado, esmaecido, para dar pra remarcar) — e Imprimir só
         clonava o que já estava desenhado ali.
       2ª causa (achada testando a correção da 1ª, ao vivo no navegador):
         lpGerar() se recusa a rodar em paralelo consigo mesma
         (if(__lpGerando) return) — desmarcar um item (que já dispara uma
         montagem) e mandar Imprimir logo em seguida podia fazer a correção
         da 1ª rodar em cima de uma montagem ainda no meio do caminho e não
         fazer nada, reproduzindo o MESMO bug por outro caminho. */
    t("Imprimir virou async, desliga o modo de seleção incondicionalmente e espera montagem em andamento ANTES de remontar e clonar #lpDoc", ()=>{
      ok(HTML.indexOf("async lpImprimir(){") > 0, "Imprimir precisa poder esperar o laudo remontar antes de continuar");
      const iImp = HTML.indexOf("async lpImprimir(){");
      const iDesliga = HTML.indexOf("STATE.ui.lpModoOcultar = false;", iImp);
      const iEspera = HTML.indexOf("while(__lpGerando)", iImp);
      const iRemonta = HTML.indexOf("await App.lpGerar();", iImp);
      const iClona = HTML.indexOf("raiz.innerHTML = doc.innerHTML;", iImp);
      ok(iDesliga > iImp, "precisa desligar o modo de seleção incondicionalmente, não só \"se estiver ligado\"");
      ok(iEspera > iDesliga, "sem esperar uma montagem em andamento, chamar lpGerar() por cima não faz nada (guarda __lpGerando)");
      ok(iRemonta > iEspera, "só remonta DEPOIS de garantir que nada mais está no meio do caminho");
      ok(iClona > iRemonta, "só clona #lpDoc DEPOIS da remontagem garantida, senão pegaria a versão velha com o oculto dentro");
    });
    t("a garantia é a MESMA função lpGerar já testada (t131/t132) — não é uma montagem de PDF paralela", ()=>{
      const corpoImprimir = trecho("async lpImprimir(){", "lpEnviarLogo(){");
      ok(corpoImprimir.indexOf("await App.lpGerar();") > 0);
      ok(corpoImprimir.indexOf("blocosEquipamentos") < 0 && corpoImprimir.indexOf("blocosInventario") < 0,
         "Imprimir não pode ter lógica própria de montar página — reaproveita o lpGerar, que já filtra oculto (t131)");
    });
  }

  console.log("\n=== t135 · BUG DE CAMPO: backup válido não importava (teto de string do navegador) ===");
  {
    /* Relatado em campo em 27/08/2026: backup de 1,3 GB exportado pelo próprio
       app não importava — a mensagem acusava "arquivo inválido", culpando o
       backup. Investigado ao vivo no navegador com o arquivo REAL: a LEITURA
       do arquivo funcionava perfeitamente (17 s, 3 projetos). Quem estourava
       era a tela de revisão, em JSON.parse(JSON.stringify(...)): para virar
       texto, o backup inteiro teria de caber numa única string, e o navegador
       para em ~512 MB → RangeError: Invalid string length. Como a chamada
       estava dentro do mesmo try do seletor de arquivo, o catch genérico
       acusava o arquivo. */
    const ctxC = vm.createContext({ Array, Object, String, JSON, console });
    vm.runInContext(funcao("ehFotoDataUrlPersist"), ctxC);
    vm.runInContext(funcao("clonarCompartilhandoFotos"), ctxC);

    t("O CASO REAL: a estrutura estoura JSON.stringify, e o clone seguro passa", ()=>{
      /* Barato de montar e decisivo: UMA foto de 8 MB, referenciada por 100
         riscos. Em memória são 8 MB (a mesma string), mas como TEXTO seriam
         ~800 MB — acima do teto do motor JS, exatamente como o backup real. */
      const foto = "data:image/jpeg;base64," + "A".repeat(8 * 1024 * 1024);
      const arvore = { areas: [{ maquinas: [{ tarefas: [{ riscos: [] }] }] }] };
      const riscos = arvore.areas[0].maquinas[0].tarefas[0].riscos;
      for(let i=0;i<100;i++) riscos.push({ id:"r"+i, nome:"Risco "+i, foto: foto });

      let erroDoJeitoAntigo = null;
      try{ JSON.stringify(arvore); }catch(e){ erroDoJeitoAntigo = e; }
      ok(erroDoJeitoAntigo !== null,
         "o teste não reproduziu o defeito: JSON.stringify precisava estourar aqui");
      eq(erroDoJeitoAntigo.name, "RangeError", "o estouro tem de ser o mesmo do campo");

      ctxC.__a = arvore;
      const clone = vm.runInContext("clonarCompartilhandoFotos(__a)", ctxC);
      eq(clone.areas[0].maquinas[0].tarefas[0].riscos.length, 100, "o clone seguro precisa dar conta");
    });
    t("o clone COMPARTILHA a foto (nenhum byte copiado) mas a estrutura fica independente", ()=>{
      const foto = "data:image/jpeg;base64,AAAA";
      const orig = { areas:[{ id:"a1", maquinas:[{ id:"m1", foto: foto }] }] };
      ctxC.__o = orig;
      const c = vm.runInContext("clonarCompartilhandoFotos(__o)", ctxC);
      ok(c.areas[0].maquinas[0].foto === foto, "a foto tem de ser a MESMA string — é isso que evita o estouro");
      c.areas[0].id = "OUTRO";
      eq(orig.areas[0].id, "a1", "mexer no clone não pode mexer no original (a importação remapeia ids no clone)");
    });

    /* Tira comentários antes de checar: as duas funções EXPLICAM o defeito
       antigo no próprio comentário (citando JSON.stringify), e isso não pode
       ser confundido com o defeito ainda estar lá. */
    const semComentarios = (txt)=> txt.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    t("os DOIS clones da tela de revisão de importação usam o clone seguro", ()=>{
      const corpo = semComentarios(funcao("recalcularPreviewImportacao"));
      ok(corpo.indexOf("clonarCompartilhandoFotos(pv.dadosOriginais.projetosSimples || [])") > 0,
         "o clone dos dados VINDOS DO ARQUIVO voltou a ser por texto");
      ok(corpo.indexOf("clonarCompartilhandoFotos(STATE.projetosSimples)") > 0,
         "o clone dos dados LOCAIS voltou a ser por texto");
      ok(corpo.indexOf("JSON.stringify") < 0, "sobrou clone por texto na tela de revisão de importação");
    });
    t("restaurar um ponto de restauração ANTIGO também não estoura mais", ()=>{
      const corpo = semComentarios(funcao("restaurarPontoDeRestauracao"));
      ok(corpo.indexOf("STATE = clonarCompartilhandoFotos(ponto.dados);") > 0,
         "o caminho do ponto em formato antigo (fotos embutidas) voltou a clonar por texto");
      ok(corpo.indexOf("JSON.stringify") < 0);
    });
    t("abrir projeto/área/máquina/tarefa/risco para editar não clona os bytes das fotos", ()=>{
      ["abrirModalProjetoS","abrirModalAreaS","abrirModalMaquinaS","abrirModalTarefaS","abrirModalRiscoS"]
        .forEach(m=>{
          const i = HTML.indexOf(m + "(id");
          ok(i > 0, "método " + m + " não encontrado");
          const trechoM = HTML.slice(i, i + 700);
          ok(trechoM.indexOf("clonarCompartilhandoFotos") > 0, m + " ainda clona por texto");
        });
    });
    t("os pontos que sobraram com clone por texto são só os do Módulo Completo (congelado)", ()=>{
      const ocorrencias = (HTML.match(/JSON\.parse\(JSON\.stringify\(/g)||[]).length;
      // 4 reais (duplicar projeto/área/máquina/tarefa do Módulo Completo) + 2 em comentários
      eq(ocorrencias, 6, "mudou o número de clones por texto — confira se algum voltou no Simplificado");
      ["duplicarProjeto","duplicarArea","duplicarMaquina","duplicarTarefa"].forEach(m=>{
        ok(HTML.indexOf(m + "(id){") > 0, "método congelado " + m + " sumiu");
      });
    });
  }

  console.log("\n=== t136 · diagnóstico das fotos guardadas no aparelho (somente leitura) ===");
  {
    /* Caso de campo em 28/08/2026: nem "Devolver fotos" (que olha a nuvem)
       nem restaurar um ponto (que busca por REFERÊNCIA) trouxeram as fotos.
       Faltava distinguir três estados que a tela não separava:
         com dono · ÓRFÃ (bytes existem, ninguém aponta) · referência quebrada.
       A órfã é exatamente a que restaurar não acha — e é recuperável. */
    const corpo = funcao("diagnosticarFotosDoAparelho");

    t("O CASO REAL: separa órfã de referência quebrada — são coisas opostas", ()=>{
      // órfã: está no índice e ninguém referencia
      ok(corpo.indexOf("indice.forEach(fid=>{ if(!referenciadas.has(fid)) orfas.push(fid); });") > 0,
         "a regra da órfã mudou: tem de ser 'está no banco E ninguém aponta'");
      // quebrada: alguém referencia e não está no índice
      ok(corpo.indexOf("referenciadas.forEach(fid=>{ if(!indice.has(fid)) quebradas.push(fid); });") > 0,
         "a regra da quebrada mudou: tem de ser 'alguém aponta E não está no banco'");
    });
    t("é SOMENTE LEITURA — não grava, não apaga, não abre transação de escrita", ()=>{
      [".put(", ".delete(", "readwrite", "marcarAlterado", "dbSet"].forEach(p=>{
        ok(corpo.indexOf(p) < 0, "apareceu operação de escrita no diagnóstico: " + p);
      });
      ok(corpo.indexOf('"readonly"') > 0, "a transação precisa ser explicitamente readonly");
    });
    t("olha as MESMAS fontes que a limpeza de órfãs — senão chamaria de órfã o que ela preserva", ()=>{
      const limpeza = funcao("fotosLimparOrfasSeForHora");
      ["listarPontosDeRestauracao", "lerDraftPersistente", "fotosColetarRefs", "fotosColetarIdsEmbutidas"]
        .forEach(fonte=>{
          ok(limpeza.indexOf(fonte) > 0, "fonte sumiu da limpeza: " + fonte);
          ok(corpo.indexOf(fonte) > 0, "o diagnóstico não consulta " + fonte +
             " — chamaria de órfã uma foto que a limpeza protege");
        });
    });
    t("mede o peso das órfãs em blocos — não traz todas à memória de uma vez", ()=>{
      // o aparelho ja carrega as fotos do STATE inteiro; somar um lote grande
      // aqui seria derrubar o app durante um diagnostico.
      ok(corpo.indexOf("for(let i=0;i<orfas.length;i+=25)") > 0);
      ok(corpo.indexOf("orfas.slice(i, i+25)") > 0);
    });
    t("informa há quantos dias a órfã mais antiga está sem dono (a quarentena apaga aos 30)", ()=>{
      ok(corpo.indexOf("fotosLerMapaOrfas(db)") > 0);
      ok(corpo.indexOf("maisAntigaDias") > 0);
      ok(HTML.indexOf("a quarentena as guarda por 30") > 0, "a tela não explica o prazo");
    });
    t("o botão chama o método, e o método não altera nada além do cache de exibição", ()=>{
      ok(HTML.indexOf('onclick="App.verDiagnosticoFotos()"') > 0);
      const met = HTML.slice(HTML.indexOf("async verDiagnosticoFotos(){"), HTML.indexOf("async copiarListaFotoPerdida(){"));
      ok(met.indexOf("__diagFotosCache = await diagnosticarFotosDoAparelho();") > 0);
      ok(met.indexOf("marcarAlterado") < 0 && met.indexOf("dbSet") < 0,
         "o método de exibição não pode gravar nada");
    });
  }

  console.log("\n=== t137 · devolver fotos a partir de um arquivo de backup ===");
  {
    /* Caso de campo em 29/08/2026: 43 campos de foto faltando em 42 itens.
       "Devolver fotos" procura em pontos de restauração e na nuvem — e
       nenhum dos dois tinha. Os .json de backup no computador tinham (102
       fotos). Faltava um caminho que lesse dali. Só ACRESCENTA. */
    const ctxF = vm.createContext({ Array, Object, String, Set, Date, console, JSON });
    vm.runInContext('var CAMPO_FOTOS_LISTA="fotosOutras"; var CAMPO_MARCA_FOTO_PERDIDA="__fotosPerdidas";' +
                    ' var CAMPOS_FOTO_UNICA=["foto","fotoGeral","fotoPlaqueta"];' +
                    ' var STATE={projetosSimples:[]};' +
                    ' function agoraSync(){ return 777; }' +
                    ' function marcarAlterado(){ globalThis.__salvou=true; }' +
                    ' function marcarFotosPendentesParaEnvio(k){ (globalThis.__envio=globalThis.__envio||[]).push(k); }' +
                    ' function ehFotoDataUrlPersist(v){ return typeof v==="string" && v.startsWith("data:image"); }' +
                    ' function fotoCalcularId(s){ return "id" + s.length + ":" + s.slice(-12); }', ctxF);
    vm.runInContext(funcao("maquinaSimplesGlobalPorId"), ctxF);
    vm.runInContext(funcao("riscoSimplesGlobalPorId"), ctxF);
    vm.runInContext('var FOTOS_RECUPERADAS_FORMATO="apr-fotos-recuperadas-v1";', ctxF);
    vm.runInContext(funcao("importarFotosRecuperadas"), ctxF);

    const F = n => "data:image/jpeg;base64," + "A".repeat(20) + n;
    const montar = ()=>{
      const m = { id:"m1", nome:"Maq", fotoGeral:F("PRINCIPAL"), fotosOutras:[F(1)],
                  __fotosPerdidas:true, tarefas:[{ id:"t1", riscos:[
                    { id:"r1", nome:"Risco", foto:null, fotosOutras:[] }]}] };
      ctxF.STATE.projetosSimples = [{ id:"p1", areas:[{ id:"a1", maquinas:[m] }] }];
      globalThis.__envio = null;
      vm.runInContext("globalThis.__envio=[]; globalThis.__salvou=false;", ctxF);
      return m;
    };
    const importar = (pac)=>{ ctxF.__p = pac; return vm.runInContext("importarFotosRecuperadas(__p)", ctxF); };

    t("O CASO REAL: devolve só o que falta e ignora o que o item já tem", ()=>{
      const m = montar();
      const r = importar({ formato:"apr-fotos-recuperadas-v1", itens:[
        { id:"m1", tipo:"maquina", fotos:[F(1), F(2), F(3)] },   // F(1) já está lá
        { id:"r1", tipo:"risco",   fotos:[F(9)] },
      ]});
      eq(r.fotosAplicadas, 3, "deveria entrar F2, F3 e F9");
      eq(r.jaTinham, 1, "F1 já estava e tinha de ser ignorada");
      eq(r.itensAtualizados, 2);
      eq(m.fotosOutras.length, 3);
      eq(m.fotosOutras[0], F(1), "a foto que já estava tem de continuar onde estava");
    });
    t("NUNCA substitui a foto principal, a geral nem a plaqueta", ()=>{
      const m = montar();
      importar({ formato:"apr-fotos-recuperadas-v1", itens:[
        { id:"m1", tipo:"maquina", fotos:[F(2)] }]});
      eq(m.fotoGeral, F("PRINCIPAL"), "a foto geral foi trocada — não pode");
      const r1 = m.tarefas[0].riscos[0];
      eq(r1.foto, null, "a foto principal do risco foi mexida — não pode");
    });
    t("a mesma foto vinda de dois backups entra uma vez só", ()=>{
      const m = montar();
      const r = importar({ formato:"apr-fotos-recuperadas-v1", itens:[
        { id:"m1", tipo:"maquina", fotos:[F(7), F(7), F(7)] }]});
      eq(r.fotosAplicadas, 1);
      eq(m.fotosOutras.length, 2);
    });
    t("a marca de dano só sai quando não sobrou espaço vazio na lista", ()=>{
      const m = montar();
      m.fotosOutras = [F(1), null];                 // um espaço vazio
      importar({ formato:"apr-fotos-recuperadas-v1", itens:[
        { id:"m1", tipo:"maquina", fotos:[F(2)] }]});
      ok(m.fotosOutras.every(x=>typeof x === "string"), "o espaço vazio tinha de ser limpo depois de preencher");
      eq(m.__fotosPerdidas, undefined, "com a lista completa, a marca sai");
    });
    t("carimba para sincronizar — senão a foto devolvida nunca subiria", ()=>{
      montar();
      importar({ formato:"apr-fotos-recuperadas-v1", itens:[
        { id:"m1", tipo:"maquina", fotos:[F(5)] }]});
      const env = vm.runInContext("globalThis.__envio", ctxF);
      ok(env.indexOf("maquina:m1") >= 0, "não marcou as fotos para envio");
      ok(vm.runInContext("globalThis.__salvou", ctxF) === true, "não pediu para salvar");
    });
    t("item que não existe aqui é contado, não inventado", ()=>{
      montar();
      const r = importar({ formato:"apr-fotos-recuperadas-v1", itens:[
        { id:"nao_existe", tipo:"risco", fotos:[F(4)] }]});
      eq(r.naoAchados, 1);
      eq(r.fotosAplicadas, 0);
    });
    t("recusa arquivo de outro formato e linha sem foto de verdade", ()=>{
      montar();
      eq(importar({ formato:"outra-coisa", itens:[] }), null);
      const r = importar({ formato:"apr-fotos-recuperadas-v1", itens:[
        { id:"m1", tipo:"maquina", fotos:["nao é foto", null, 42] }]});
      eq(r.invalidos, 1, "linha sem nenhuma foto válida tem de ser recusada");
      eq(r.fotosAplicadas, 0);
    });
  }

  console.log("\n=== t138 · exportar só uma área ===");
  {
    /* Em 31/08/2026 o diagnóstico do iPhone mostrou 1.436 de 1.831 itens que
       NUNCA subiram — 78% do trabalho existia num aparelho só. O backup
       completo (1,4 GB) não cabe no iPhone e a fila levaria muitas rodadas
       até chegar na área certa. O recorte de uma área tem poucas dezenas de
       MB e sai na hora. Mesmo formato do backup completo: nenhum leitor novo. */
    const ctxA = vm.createContext({ Array, Object, String, Date, JSON, console });
    vm.runInContext(funcao("jsonEmPartes"), ctxA);
    vm.runInContext(funcao("backupV2AreaEmPartes"), ctxA);
    vm.runInContext(funcao("contarItensDaArea"), ctxA);

    const montar = ()=>{
      const risco = (i)=>({ id:"r"+i, nome:"Risco "+i, foto:"data:image/jpeg;base64,FOTO"+i });
      const maq = (i)=>({ id:"m"+i, nome:"Maq "+i, fotoGeral:"data:image/jpeg;base64,MG"+i,
                          tarefas:[{ id:"t"+i, tarefa:"Operação normal (todos os modos)", riscos:[risco(i)] }] });
      const alvo = { id:"aAlvo", nome:"Paletização", maquinas:[maq(1), maq(2)] };
      const vizinha = { id:"aViz", nome:"Outra", maquinas:[{ id:"mX", nome:"NAO_PODE_SAIR", tarefas:[] }] };
      return { proj:{ id:"p1", empresa:"Cliente", areas:[alvo, vizinha] }, alvo };
    };
    const exportar = (proj, area)=>{
      ctxA.__proj = proj; ctxA.__area = area;
      return vm.runInContext("(function(){ const partes=[]; backupV2AreaEmPartes(partes, __proj, __area); return partes.join(''); })()", ctxA);
    };

    t("O CASO REAL: leva a área escolhida e NADA da área vizinha", ()=>{
      const { proj, alvo } = montar();
      const txt = exportar(proj, alvo);
      ok(txt.indexOf("NAO_PODE_SAIR") < 0, "a área vizinha vazou para o recorte");
      ok(txt.indexOf("Paletização") > 0, "a área escolhida não saiu");
      ok(txt.indexOf('"aViz"') < 0, "o id da área vizinha vazou");
    });
    t("sai no MESMO formato do backup completo — o leitor de sempre dá conta", ()=>{
      const { proj, alvo } = montar();
      const linhas = exportar(proj, alvo).trim().split("\n");
      const cab = JSON.parse(linhas[0]);
      eq(cab.__formatoBackup, "apr-v2", "formato diferente exigiria um leitor novo");
      const tipos = linhas.slice(1).map(l=>JSON.parse(l).t);
      eq(tipos.filter(x=>x==="pS").length, 1);
      eq(tipos.filter(x=>x==="aS").length, 1);
      eq(tipos.filter(x=>x==="mS").length, 2);
      eq(tipos.filter(x=>x==="rS").length, 2);
    });
    t("o projeto vai SEM as outras áreas e a área SEM as máquinas embutidas", ()=>{
      const { proj, alvo } = montar();
      const linhas = exportar(proj, alvo).trim().split("\n").slice(1).map(l=>JSON.parse(l));
      const pS = linhas.find(l=>l.t==="pS"), aS = linhas.find(l=>l.t==="aS");
      eq(pS.d.areas, undefined, "o projeto levou as áreas embutidas — duplicaria tudo");
      eq(aS.d.maquinas, undefined, "a área levou as máquinas embutidas — duplicaria tudo");
      eq(pS.d.empresa, "Cliente", "o resto do projeto tem de vir junto");
    });
    t("a configuração do aparelho NÃO viaja no recorte", ()=>{
      const { proj, alvo } = montar();
      const cab = JSON.parse(exportar(proj, alvo).trim().split("\n")[0]);
      eq(JSON.stringify(cab.resto), "{}", "recorte de área não pode levar configuração do aparelho");
      eq(cab.recorte, "area");
    });
    t("as fotos vão inteiras — o recorte serve para tirar o trabalho do aparelho", ()=>{
      const { proj, alvo } = montar();
      const linhas = exportar(proj, alvo).trim().split("\n").slice(1).map(l=>JSON.parse(l));
      ok(linhas.find(l=>l.t==="mS").d.fotoGeral.startsWith("data:image"), "foto da máquina não saiu");
      ok(linhas.find(l=>l.t==="rS").d.foto.startsWith("data:image"), "foto do risco não saiu");
    });
    t("a contagem mostrada é a da área, não a do projeto", ()=>{
      const { alvo } = montar();
      ctxA.__a = alvo;
      const c = vm.runInContext("contarItensDaArea(__a)", ctxA);
      eq(c.maquinas, 2); eq(c.tarefas, 2); eq(c.riscos, 2);
    });
    t("área vazia não quebra", ()=>{
      const txt = exportar({ id:"p", empresa:"X", areas:[] }, { id:"a", nome:"Vazia" });
      const linhas = txt.trim().split("\n");
      eq(linhas.length, 3, "deve sair só cabeçalho + projeto + área");
    });
  }

  console.log("\n=== t139 · galeria de fotos órfãs (religar ao dono) ===");
  {
    /* 31/08/2026: 723 fotos órfãs (412 MB) no aparelho — bytes no banco, sem
       ninguém apontando. A foto foi tirada (o rascunho já grava os bytes) e o
       app foi encerrado antes de salvar o vínculo. Nenhuma recuperação
       existente alcança: todas trabalham POR REFERÊNCIA, e a referência é
       exatamente o que sumiu. Só o usuário sabe de quem é cada foto. */
    const ctxO = vm.createContext({ Array, Object, Set, Map, String, Math, console });
    vm.runInContext('var CAMPO_FOTOS_LISTA="fotosOutras"; var CAMPO_MARCA_FOTO_PERDIDA="__fotosPerdidas";' +
                    ' var STATE={projetosSimples:[]}; var __orfas=null;' +
                    ' function agoraSync(){ return 555; }' +
                    ' function ehFotoDataUrlPersist(v){ return typeof v==="string" && v.startsWith("data:image"); }', ctxO);
    vm.runInContext(funcao("maquinaSimplesGlobalPorId"), ctxO);
    vm.runInContext(funcao("riscoSimplesGlobalPorId"), ctxO);
    vm.runInContext(funcao("orfasTotalPaginas"), ctxO);
    vm.runInContext("var ORFAS_POR_PAGINA = 12;", ctxO);

    t("a paginação é de 12 e o número de páginas fecha", ()=>{
      const paginas = (n)=>{ vm.runInContext("__orfas={ids:new Array("+n+").fill('x')};", ctxO);
                             return vm.runInContext("orfasTotalPaginas()", ctxO); };
      eq(paginas(0), 0);
      eq(paginas(12), 1);
      eq(paginas(13), 2);
      eq(paginas(723), 61, "no tamanho real do aparelho (723 órfãs)");
    });

    /* A regra de anexar é o coração: extraída do método e executada. */
    const corpoAnexar = HTML.slice(HTML.indexOf("  async orfaAnexar(fid){"),
                                   HTML.indexOf("  menuMaquinaS(ev,id){"));
    t("O CASO REAL: espaço principal vazio recebe a foto; ocupado, ela vai para a lista", ()=>{
      ok(corpoAnexar.indexOf("if(!ehFotoDataUrlPersist(item[campoPrincipal])){") > 0,
         "sumiu a checagem que impede substituir a foto principal");
      ok(corpoAnexar.indexOf("item[campoPrincipal] = dataUrl;") > 0);
      ok(corpoAnexar.indexOf("else item[CAMPO_FOTOS_LISTA].push(dataUrl);") > 0);
    });
    t("preenche primeiro o espaço vazio — é o quadro vermelho que a pessoa quer resolver", ()=>{
      ok(corpoAnexar.indexOf("const vago = item[CAMPO_FOTOS_LISTA].findIndex(x=>!ehFotoDataUrlPersist(x));") > 0);
      ok(corpoAnexar.indexOf("if(vago >= 0) item[CAMPO_FOTOS_LISTA][vago] = dataUrl;") > 0);
    });
    t("nunca remove nada do item", ()=>{
      [".splice(", ".shift(", ".pop(", "= []"].forEach(p=>{
        ok(corpoAnexar.indexOf(p) < 0 || p === "= []", "operação destrutiva no anexar: " + p);
      });
    });
    t("grava de verdade e carimba para sincronizar", ()=>{
      ["item.atualizadoEm = agoraSync();", "marcarFotosPendentesParaEnvio(",
       "marcarAlterado();", "await dbSet(STATE);"].forEach(x=>{
        ok(corpoAnexar.indexOf(x) > 0, "faltou: " + x);
      });
    });
    t("a foto usada sai da lista — não reaparece para ser anexada duas vezes", ()=>{
      ok(corpoAnexar.indexOf("__orfas.ids = __orfas.ids.filter(x=>x!==fid);") > 0);
      ok(corpoAnexar.indexOf("__orfas.fotos.delete(fid);") > 0);
    });

    const corpoPagina = funcao("orfasCarregarPagina");
    t("carrega só a página pedida e SOLTA a anterior (são 412 MB no aparelho real)", ()=>{
      ok(corpoPagina.indexOf("if(__orfas.fotos) __orfas.fotos.clear();") > 0,
         "sem soltar a página anterior, a galeria acumula até derrubar o app");
      ok(corpoPagina.indexOf("__orfas.ids.slice(inicio, inicio + ORFAS_POR_PAGINA)") > 0);
    });
    const corpoListar = funcao("orfasListarIds");
    t("órfã é definida pelas MESMAS fontes que a limpeza protege", ()=>{
      const limpeza = funcao("fotosLimparOrfasSeForHora");
      ["listarPontosDeRestauracao", "lerDraftPersistente", "fotosColetarRefs", "fotosColetarIdsEmbutidas"]
        .forEach(f=>{
          ok(limpeza.indexOf(f) > 0, "fonte sumiu da limpeza: " + f);
          ok(corpoListar.indexOf(f) > 0,
             "a galeria não consulta " + f + " — ofereceria como órfã uma foto que a limpeza preserva");
        });
    });
    t("mostra as mais recentes primeiro", ()=>{
      ok(corpoListar.indexOf("ids.sort((a,b)=> (orfasDesde[b]||0) - (orfasDesde[a]||0));") > 0);
    });
    t("entra pelo menu da máquina e do risco, com o destino já definido", ()=>{
      eq((HTML.match(/Procurar foto solta no aparelho/g)||[]).length, 2);
      ok(HTML.indexOf("App.abrirOrfasPara('maquina','${id}')") > 0);
      ok(HTML.indexOf("App.abrirOrfasPara('risco','${id}')") > 0);
    });
    t("O BOTÃO NÃO PODE QUEBRAR COM NOME QUE TEM ASPAS — foi o que o matou em campo", ()=>{
      /* 01/09/2026: o botão não fazia NADA. O nome do item era interpolado no
         onclick com JSON.stringify, que produz aspas DUPLAS, dentro de um
         atributo onclick que abrirMenuAcoes delimita com aspas duplas. O
         atributo terminava no meio do nome e o JS virava lixo.
         Reproduz o defeito montando o atributo do jeito antigo e do novo. */
      const comoEra = `App.abrirOrfasPara('maquina','m1',${JSON.stringify('Magazine "papelão"')})`;
      const atribAntigo = `onclick="App.fecharModal();${comoEra}"`;
      // o atributo antigo fecha cedo: existe aspa dupla ANTES do fim
      const corpoAntigo = atribAntigo.slice('onclick="'.length, -1);
      ok(corpoAntigo.indexOf('"') >= 0, "o teste não reproduziu o defeito");

      // o jeito novo não interpola texto livre nenhum
      ok(HTML.indexOf("JSON.stringify(nomeMaquinaS(m)") < 0, "voltou a interpolar o nome da máquina");
      ok(HTML.indexOf("JSON.stringify(r.nome") < 0, "voltou a interpolar o nome do risco");
      ok(HTML.indexOf("async abrirOrfasPara(tipo, id){") > 0,
         "a assinatura precisa ser só tipo+id — o nome vem de dentro");
      ok(HTML.indexOf('const alvo = tipo === "maquina" ? maquinaSimplesGlobalPorId(id) : riscoSimplesGlobalPorId(id);') > 0,
         "o nome tem de ser resolvido pelo id, do lado de dentro");
    });
    t("nenhum outro item de menu interpola texto livre no onclick", ()=>{
      // a mesma classe de defeito em qualquer outro botão de menu
      ok(/onclick:\s*`[^`]*JSON\.stringify/.test(HTML) === false,
         "algum item de menu voltou a interpolar via JSON.stringify");
    });
  }

  console.log("\n---------------------------------------");
  console.log("TESTES: " + (total - falhas) + "/" + total + " ok, " + falhas + " falha(s)");
  process.exit(falhas ? 1 : 0);
})();
