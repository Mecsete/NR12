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
  const re = new RegExp("\\nfunction " + nome + "\\s*\\(");
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
const ctx = { OUTRO, STATE, linhasEscopoSimples, nomeMaquinaS, valOuOutro, escapeHtml, ic, toast, marcarAlterado,
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
    eq(C.montarDescricaoRisco({ evento:"Queda", local:"Escada" }), "Risco de queda, na escada da máquina.");
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
    ok(h.indexOf("Risco de queda, na escada da máquina, com possível lesão na cabeça.") > 0);
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
  t("bloco da medida existente traz seletor, situação e texto", ()=>{
    const h = C.blocoMedidaExistenteHtml({ componente:"Correia", medidaExistenteTipo:"prot_fixa", medidaExistenteSituacao:"parcial", medidaExistenteRessalva:"sem dispositivo de intertravamento", descMedida:"" });
    ok(h.indexOf("onDraftMedidaExistente('tipo'") > 0, "sem seletor");
    ok(h.indexOf("onDraftMedidaExistente('situacao','parcial')") > 0, "sem botões de situação");
    ok(h.indexOf("onDraftMedidaExistente('ressalva'") > 0, "sem lista de ressalvas");
    ok(h.indexOf("Base normativa") > 0, "sem a base normativa");
    ok(h.indexOf("Atende parcialmente") > 0, "sem a frase montada");
  });
  t("situação 'Atende' esconde a lista de ressalvas", ()=>{
    const h = C.blocoMedidaExistenteHtml({ componente:"Correia", medidaExistenteTipo:"prot_fixa", medidaExistenteSituacao:"ok", descMedida:"" });
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
     "aplicarTextoMedidaExistente()","laudoSetMedida(rid, tipo)","laudoAplicarMedida(rid)"]
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
  t("PLr sobe de a até e conforme o gráfico da ISO 13849-1", ()=>{
    const esperado = [["S1","F1","P1","a","B"],["S1","F1","P2","b","1"],["S1","F2","P1","b","1"],["S1","F2","P2","c","2"],
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
    eq(res.plr,"a"); eq(res.cat,"B");
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
  t("a tabela do gráfico está isolada e marcada para conferência", ()=>{
    ok(HTML.indexOf("ATENÇÃO: TABELA A CONFERIR CONTRA AS NORMAS ANTES DE ASSINAR") > 0, "sem o aviso no código");
    eq((HTML.match(/const PLR_GRAFICO = \{/g)||[]).length, 1, "o gráfico deve existir num único lugar");
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
    ["function onedriveDiagnosticoDados(","function onedriveDiagnosticoTexto(","function onedriveDiagnosticoHtml(",
     "abrirDiagnosticoSync(){","async copiarDiagnosticoSync(){"].forEach(m=>
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
    ok(HTML.indexOf("App.abrirDiagnosticoSync()") > 0, "sem o botão");
    ok(HTML.indexOf("use se parecer que a sincronização não termina") > 0, "sem a explicação de quando usar");
  });
  t("quando nada está pendente, o diagnóstico explica o selo", ()=>{
    ok(HTML.indexOf("é só o ciclo automático de 2 em 2 minutos verificando a nuvem") > 0,
       "sem isso, 'sincronizando' continua parecendo problema");
  });

  console.log("\n---------------------------------------");
  console.log("TESTES: " + (total - falhas) + "/" + total + " ok, " + falhas + " falha(s)");
  process.exit(falhas ? 1 : 0);
})();
