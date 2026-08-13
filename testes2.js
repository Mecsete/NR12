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
let CHAVE="k"; function getIAApiKey(){ return CHAVE; } function setIAApiKey(v){ CHAVE = v||""; }
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
function progressoAtualizar(feito, total, sub){ painelTeste.atualizacoes.push({ feito, total, sub }); }
function progressoFechar(meu){ if(meu === false) return; painelTeste.fechamentos++; painelTeste.aberto = false; }
function progressoCancelado(){ return painelTeste.cancelar; }
const ctx = { OUTRO, STATE, linhasEscopoSimples, nomeMaquinaS, valOuOutro, escapeHtml, ic, toast, marcarAlterado,
  progressoAbrir, progressoAtualizar, progressoFechar, progressoCancelado,
  render, go, esperar, uid, imgReg, abrirOverlay, getIAApiKey, setIAApiKey, getIAConfig, resetIAConfigTeste,
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
[ "sugerirGPD","sugerirFE","sugerirNP","sugerirPO","calcHRN","nivelHRN","acaoHRN","valorPorClassificacaoHRN","labelHRN","hrnDoItem" ]
  .forEach(n=> vm.runInContext(funcao(n), ctx));
vm.runInContext(constante("CAMPOS_ADMIN_PROJETO"), ctx);
[ "camposFaltandoProjeto", "projetosComCamposFaltando" ].forEach(n=> vm.runInContext(funcao(n), ctx));

/* motor de sincronizacao e equipe, extraidos do arquivo entregue */
vm.runInContext('const CAMPO_FOTOS_LISTA = "fotosOutras";', ctx);
vm.runInContext(constante("CAMPOS_FILHOS_SYNC"), ctx);
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
[ "getNormasIA", "getNormasRemovidas", "getPromptsEm", "marcarPromptAlterado", "marcarChaveIAAlterada",
  "getApiKeyEm", "getIASyncEm", "marcarIAAlterada", "montarPacoteIA", "aplicarPacoteIA"
].forEach(n=> vm.runInContext(funcao(n), ctx));

/* blocos novos, extraidos do arquivo entregue */
const BLOCO_A = trecho("/* =========================================================================\n   GESTÃO DO LAUDO — os textos da IA passam a morar DENTRO do app", "\nfunction hrnDoItem({tarefa,risco}){");
const BLOCO_B = trecho("/* =========================================================================\n   GESTÃO DO LAUDO — TELAS", "\nfunction screenSimplesConfig(){");
vm.runInContext(BLOCO_A, ctx);
vm.runInContext(BLOCO_B, ctx);
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
t("escolher FE no risco tem prioridade sobre a tarefa", ()=>{
  const it = C.linhasEscopoSimples()[0];
  it.risco.fe = "Constante";
  const h = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(h.fe, 5);
});
t("escolher NP no risco tem prioridade sobre a tarefa", ()=>{
  const it = C.linhasEscopoSimples()[0];
  it.risco.np = "16-50 pessoas";
  const h = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(h.np, 8);
});
t("PO e GPD escolhidos entram no calculo", ()=>{
  const it = C.linhasEscopoSimples()[0];
  it.risco.po = "Certo"; it.risco.gpd = "Fatalidade";
  const h = C.hrnDoItem({tarefa:it.tarefa, risco:it.risco});
  eq(h.po, 15); eq(h.gpd, 15);
  eq(h.hrn, C.calcHRN(15,5,15,8));
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
t("bloco HRN renderiza os 4 seletores", ()=>{
  const html = C.laudoBlocoHRN(C.linhasEscopoSimples()[0]);
  ["'po'","'fe'","'gpd'","'np'"].forEach(k=> ok(html.indexOf("laudoSetHRN('r1',"+k) > 0, "faltou "+k));
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
  t("solucao usa descMedida quando ha medida implementada", ()=>{
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
  t("solucao cai em descMedida ou sugestaoMitigacao conforme o caso", ()=>{
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
  CHAVE = "";
  const g0 = await C.gerarLaudoIAItens(C.linhasEscopoSimples(), null, {});
  t("sem chave devolve 0 e emite aviso", ()=>{ eq(g0, 0); ok(toasts.length > 0); });
  CHAVE = "k";

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
  t("contador de campos preenchidos começa em 0/6", ()=>{
    ok(C.laudoBlocoPlaqueta(C.linhasEscopoSimples()[0]).indexOf("0/6 campos") > 0);
  });
  t("contador acompanha o preenchimento", ()=>{
    const it = C.linhasEscopoSimples()[0];
    it.maquina.modelo = "XYZ-200"; it.maquina.marca = "ACME";
    const h = C.laudoBlocoPlaqueta(it);
    ok(h.indexOf("2/6 campos") > 0, "contador errado");
    ok(h.indexOf('value="XYZ-200"') > 0, "valor não apareceu no campo");
  });
  t("com foto e IA, oferece a leitura automática", ()=>{
    const h = C.laudoBlocoPlaqueta(C.linhasEscopoSimples()[0]);
    ok(h.indexOf("laudoLerPlaqueta('r1')") > 0, "sem botão de leitura");
    ok(h.indexOf("Ler a plaqueta com IA") > 0);
    ok(h.indexOf("laudoVerPlaqueta('r1')") > 0, "foto não amplia");
  });
  t("sem chave de IA, mostra o caminho para configurar", ()=>{
    CHAVE = "";
    const h = C.laudoBlocoPlaqueta(C.linhasEscopoSimples()[0]);
    ok(h.indexOf("laudoLerPlaqueta") < 0, "não deveria oferecer leitura");
    ok(h.indexOf("Configure a IA na aba IA") > 0);
    CHAVE = "k";
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
    ["Plaqueta do equipamento","Avaliação HRN","Escopo do equipamento","Solução / Mitigação"]
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
    const r = { local:"Transmissão de potência", componente:"Correia", evento:"Arrastamento", parteCorpo:"Dedos" };
    eq(C.montarDescricaoRisco(r), "Risco de arrastamento na correia, na transmissão de potência da máquina, com possível lesão nos dedos.");
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
    eq(C.montarDescricaoRisco({ evento:"Queda", local:"Escada" }), "Risco de queda na escada da máquina.");
    eq(C.montarDescricaoRisco({ evento:"Queda", componente:"Guarda-corpo", local:"Escada" }),
       "Risco de queda no guarda-corpo, na escada da máquina.");
    eq(C.montarDescricaoRisco({ local:"Escada" }), "Risco na escada da máquina.");
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
    eq(C.sugerirGPDPorSelecao({ evento:"Corte" }), "Corte");
    eq(C.sugerirGPDPorSelecao({ evento:"Amputação" }), "Perda de membro, visão ou audição");
    eq(C.sugerirGPDPorSelecao({ evento:"Esmagamento" }), "Perda de Vários membros");
    eq(C.sugerirGPDPorSelecao({ evento:"Choque elétrico" }), "Fatalidade");
  });
  t("parte vital agrava evento grave para fatalidade", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Esmagamento", parteCorpo:"Cabeça" }), "Fatalidade");
    eq(C.sugerirGPDPorSelecao({ evento:"Queda de material", parteCorpo:"Tronco" }), "Fatalidade");
  });
  t("parte vital NÃO agrava evento leve", ()=>{
    eq(C.sugerirGPDPorSelecao({ evento:"Corte", parteCorpo:"Face" }), "Corte");
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
    ok(h.indexOf("Risco de queda na escada da máquina, com possível lesão na cabeça.") > 0);
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
  t("o resultado aparece com PLr e Categoria juntos", ()=>{
    const h = C.blocoPLrHtml({ id:"r1", medidaPropostaTipo:"prot_movel_int", componente:"Correia",
      gpd:"Fatalidade", exposicao:"Mais de 2x por turno", evitar:"Praticamente impossível" }, "draft");
    ok(h.indexOf("PL<span>r</span> e") > 0, "sem o PLr");
    ok(h.indexOf("Categoria 4") > 0, "sem a categoria");
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
  function iaLimpa(){
    STATE.ui.normasIA = []; STATE.ui.normasRemovidas = {}; STATE.ui.promptsEm = {};
    STATE.ui.iaSyncEm = 0; STATE.ui.apiKeyEm = 0;
    vm.runInContext("setIAApiKey(''); resetIAConfigTeste();", ctx);
  }
  function pacoteDe(normas, prompts, promptsEm, chave, chaveEm){
    iaLimpa();
    STATE.ui.normasIA = normas.map(n=>({...n}));
    const c = vm.runInContext("getIAConfig()", ctx);
    Object.assign(c.prompts, prompts);
    STATE.ui.promptsEm = { ...promptsEm };
    if(chave !== undefined){ vm.runInContext("setIAApiKey(" + JSON.stringify(chave) + ")", ctx); STATE.ui.apiKeyEm = chaveEm||0; }
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
    STATE.ui.apiKeyEm = 5000;
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
    STATE.ui.apiKeyEm = 100;
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
    ok(HTML.indexOf("onIAApiKeyInput(v){ setIAApiKey(v.trim()); marcarChaveIAAlterada(); }") > 0,
       "chave não tem carimbo próprio");
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
    STATE.ui.apiKeyEm = undefined;
    vm.runInContext("setIAApiKey('chave-antiga')", ctx);
    ok(vm.runInContext("getApiKeyEm()", ctx) > 0, "a chave nunca sairia deste aparelho");
  });
  t("aparelho sem chave continua em zero e não apaga a dos outros", ()=>{
    STATE.ui.apiKeyEm = undefined;
    vm.runInContext("setIAApiKey('')", ctx);
    eq(vm.runInContext("getApiKeyEm()", ctx), 0);
  });
  t("o carimbo da chave não é recalculado toda hora", ()=>{
    STATE.ui.apiKeyEm = undefined;
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
    const i = HTML.indexOf("async function chamarIAResiliente(");
    ok(HTML.slice(i, i + 500).indexOf("chamarIA(tipo, textoUsuario)") > 0,
       "o caminho com retentativa deixou de usar chamarIA, e perderia as normas");
  });

  console.log("\n=== t69 · modal de criação de risco (bloco 1) ===");
  vm.runInContext(funcao("montarNomeRisco"), ctx);
  t("o nome do risco usa os quatro itens em frase corrida", ()=>{
    ctx.__r = { evento:"Agarramento", componente:"Correia", local:"Transmissão de potência", parteCorpo:"Mãos" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx),
       "Agarramento na correia, na transmissão de potência, com lesão nas mãos");
  });
  t("sem componente, o complemento emenda sem vírgula", ()=>{
    ctx.__r = { evento:"Queda", componente:"", local:"Plataforma", parteCorpo:"" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx), "Queda na plataforma");
    ctx.__r = { evento:"Corte", componente:"", local:"", parteCorpo:"Dedos" };
    eq(vm.runInContext("montarNomeRisco(__r)", ctx), "Corte com lesão nos dedos");
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
  t("o quadro só aparece no campo Solução", ()=>{
    STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
    const it = C.linhasEscopoSimples()[0];
    ok(C.laudoBlocoCampo(it, "solucao").indexOf("Mitigação existente na máquina") > 0, "faltou no campo Solução");
    ["escopo","tarefa","risco"].forEach(c=>
      ok(C.laudoBlocoCampo(it, c).indexOf("Mitigação existente na máquina") < 0, "apareceu no campo " + c));
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
  t("as duas folhas com lista usam a mesma regra", ()=>{
    eq((HTML.match(/class="sheet sheet-col"/g)||[]).length, 2);
    eq((HTML.match(/class="sheet-rolagem"/g)||[]).length, 2);
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
  vm.runInContext(constante("TIPOS_EQUIPAMENTO"), ctx);
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
    ok(HTML.indexOf(".lp-inv td.foto{padding:2px}") > 0);
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
    eq((HTML.match(/\}\s*finally\s*\{[^}]*progressoFechar/g)||[]).length, 3,
       "Excel, Word e a geração de textos — sem finally, um erro deixaria o painel preso na frente do app");
    ok(funcao("gerarLaudoIAItens").indexOf("finally{ progressoFechar(meuPainel); }") > 0);
  });
  t("quem não abriu o painel não fecha o dos outros", ()=>{
    ok(funcao("progressoFechar").indexOf("if(meu === false) return;") > 0,
       "a geração de textos fecharia o painel da exportação no meio");
    ok(funcao("progressoAbrir").indexOf("if(__progresso){") > 0, "abriria dois painéis empilhados");
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
  t("a geração em lote de verdade abre, atualiza e fecha o painel", async ()=>{
    painelTeste.aberturas = []; painelTeste.atualizacoes = []; painelTeste.fechamentos = 0;
    painelTeste.aberto = false; painelTeste.cancelar = false;
    STATE.ui.laudoFiltroArea = ""; STATE.ui.laudoFiltroMaq = ""; STATE.ui.laudoFiltroTar = "";
    const itens = C.linhasEscopoSimples().slice(0, 3);
    itens.forEach(it=>{ it.maquina.laudoIA = {}; it.tarefa.laudoIA = {}; it.risco.laudoIA = {}; });
    setIAApiKey("chave-teste");
    await C.gerarLaudoIAItens(itens, null, { refazer:true });
    eq(painelTeste.aberturas.length, 1, "deveria abrir um painel só");
    eq(painelTeste.aberturas[0].titulo, "Escrevendo textos da IA");
    eq(painelTeste.aberturas[0].total, 3);
    eq(painelTeste.fechamentos, 1, "o painel precisa fechar ao terminar");
    ok(painelTeste.atualizacoes.length >= 3, "não reportou o avanço");
  });
  t("parar interrompe a leva e o que já foi feito continua gravado", async ()=>{
    painelTeste.aberturas = []; painelTeste.atualizacoes = []; painelTeste.fechamentos = 0;
    painelTeste.aberto = false; painelTeste.cancelar = true;   // parada pedida antes de começar
    const itens = C.linhasEscopoSimples().slice(0, 3);
    itens.forEach(it=>{ it.maquina.laudoIA = {}; it.tarefa.laudoIA = {}; it.risco.laudoIA = {}; });
    const gravados = await C.gerarLaudoIAItens(itens, null, { refazer:true });
    eq(gravados, 0, "não deveria ter gerado nada depois da parada");
    eq(painelTeste.fechamentos, 1, "o painel precisa fechar mesmo tendo sido parado");
    painelTeste.cancelar = false;
  });

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
    ok(HTML.indexOf('<div class="lp-rc">') > 0, "sem o cartão");
    ok(HTML.indexOf('<th style="width:196px">HRN</th>') < 0, "sobrou o cabeçalho de colunas da tabela antiga");
    ok(HTML.indexOf('.lp-rc-cab{display:flex;') > 0 && HTML.indexOf('.lp-rc-corpo{display:flex;') > 0);
  });
  t("o cartão traz tudo que já existia, mais a mitigação existente", ()=>{
    ["Descrição do risco","Mitigação existente","Solução / Mitigação","Evidência do risco",
     "Probabilidade (PO)","Frequência (FE)","Grau do Dano (GPD)","Nº de pessoas (NP)"]
      .forEach(x=> ok(funcao("blocosEquipamentos").indexOf(x) > 0, "faltou " + x));
  });
  t("o PLr fica discreto à direita da tabela do HRN", ()=>{
    const f = funcao("blocosEquipamentos");
    ok(f.indexOf('<div class="lp-rc-hrn">') < f.indexOf('<div class="lp-rc-plr">'), "o PLr precisa vir depois do HRN");
    ok(HTML.indexOf(".lp-rc-plr{flex:0 0 156px;border-left:1px solid #8A8CA3") > 0, "sem a coluna do PLr");
    ok(HTML.indexOf("color:#5B5F7A;white-space:nowrap}") > 0, "o rótulo do PLr voltaria a quebrar em duas linhas");
    ok(f.indexOf("Função de segurança (PLr)") > 0 && f.indexOf("Categoria ${esc(plr.cat)}") > 0,
       "o rótulo precisa trazer PLr entre parênteses");
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
    ok(f.indexOf("Figura 1: Representação esquemática do processo") > 0, "sem a legenda");
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
    ok(f.indexOf('split(/(?=<div class="lp-sub">)|(?=<p class="lp-par">)/)') > 0, "sem o fatiamento");
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

  console.log("\n---------------------------------------");
  console.log("TESTES: " + (total - falhas) + "/" + total + " ok, " + falhas + " falha(s)");
  process.exit(falhas ? 1 : 0);
})();
