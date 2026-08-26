/* BANCO DE ENSAIO DO MOTOR DE SINCRONIZAÇÃO
   Dois aparelhos + uma nuvem de mentira, rodando o código REAL do index.html.
   A propriedade cobrada é a que os três defeitos recentes violaram:
   sem ninguém mexer em nada, a sincronização tem de PARAR sozinha
   (quiescência). Se um ciclo sem edição ainda transfere alguma coisa, há
   defeito — não importa qual. */
const fs=require("fs"), vm=require("vm");
const CAMINHO = process.argv[2] || "index.html";
const HTML = fs.readFileSync(CAMINHO,"utf8");

function funcao(nome){
  const re = new RegExp("\\n\\s*(?:async )?function " + nome + "\\s*\\(");
  const m = re.exec(HTML); if(!m) throw new Error("nao achou: "+nome);
  let i=m.index+1, p=HTML.indexOf("(",i), prof=0;
  while(p<HTML.length){ if(HTML[p]==="(")prof++; else if(HTML[p]===")"){prof--; if(prof===0)break;} p++; }
  let j=HTML.indexOf("{",p), d=0, k=j, str=null;
  while(k<HTML.length){ const ch=HTML[k];
    if(str){ if(ch==="\\"){k+=2;continue;} if(ch===str)str=null; }
    else { if(ch==='"'||ch==="'"||ch==="`")str=ch; else if(ch==="{")d++; else if(ch==="}"){d--; if(d===0)return HTML.slice(i,k+1);} }
    k++; }
  throw new Error("nao fechou: "+nome);
}
function constante(nome){
  const re=new RegExp("\\nconst "+nome+"\\s*="); const m=re.exec(HTML);
  if(!m) throw new Error("const nao achada: "+nome);
  let i=m.index+1,k=HTML.indexOf("=",HTML.indexOf(nome,i)),d=0,str=null;
  while(k<HTML.length){ const ch=HTML[k];
    if(str){ if(ch==="\\"){k+=2;continue;} if(ch===str)str=null; }
    else { if(ch==='"'||ch==="'"||ch==="`")str=ch;
      else if(ch==="["||ch==="{"){ d++; }
      else if(ch==="]"||ch==="}"){ d--; if(d===0) return HTML.slice(i,k+1)+";"; } }
    k++; }
}

const PREFIXO = "APR-Campo/Backup/Simplificado";
/* ---------------- NUVEM DE MENTIRA ---------------- */
function novaNuvem(){
  return {
    arquivos: new Map(),           // caminho -> {tamanho, texto}
    falharPastas: new Set(),       // pastas cuja listagem "falha" (429)
    transferencias: 0,             // contador zerado a cada ciclo
    put(caminho, texto){ this.arquivos.set(caminho, {tamanho: Buffer.byteLength(texto,"utf8"), texto}); this.transferencias++; },
    del(caminho){ this.arquivos.delete(caminho); },
    get(caminho){ const a = this.arquivos.get(caminho); if(a) this.transferencias++; return a ? a.texto : null; },
    filhos(pasta){
      if(this.falharPastas.has(pasta)) return null; // null = falhou ao listar
      const out = new Map();
      for(const [c,a] of this.arquivos){
        if(!c.startsWith(pasta + "/")) continue;
        const resto = c.slice(pasta.length+1);
        const barra = resto.indexOf("/");
        if(barra < 0) out.set(resto, { nome:resto, tamanho:a.tamanho, pasta:false });
        else { const nome = resto.slice(0,barra); if(!out.has(nome)) out.set(nome, { nome, tamanho:0, pasta:true }); }
      }
      return [...out.values()];
    },
  };
}

/* ---------------- APARELHO ---------------- */
function novoAparelho(nome, nuvem){
  const ctx = {
    console, JSON, Math, Date, Map, Set, Promise, Object, Array, String, Number, RegExp, isFinite, isNaN,
    OUTRO:"Outro (especificar)",
    STATE:{ projetosSimples:[], ui:{}, oneDriveAssinaturasSimples:{}, oneDrivePendentes:[], exclusoesConfirmadas:{} },
    ONEDRIVE_PASTA_APP:"APR-Campo", SUBPASTA_BACKUP:"Backup",
    ONEDRIVE_LIMITE_AUTO_BYTES: 300000,
    CAMPO_FOTOS_LISTA:"fotosOutras",
    nomeMaquinaS: m=>m.nome||"",
    valOuOutro:(v,o)=>v==="Outro (especificar)"?(o||""):(v||""),
    Blob: class { constructor(a){ this.size = Buffer.byteLength(a.join(""),"utf8"); } },
    /* exclusaoConfirmadaPeloUsuario ERA um stub fixo em false — com ele, toda a
       lógica de lápide ficava fora do ensaio, e foi exatamente aí que o defeito
       "risco excluído volta do outro aparelho" pôde nascer sem nenhum ensaio
       reclamar. Agora as funções de lápide são extraídas do index.html, como o
       resto do motor. */
    marcarAlterado:()=>{},
    navigator:{ onLine:true },
    registrarEventoSync:()=>{},
    marcarProgressoSync:()=>{},
    journalGravarItem:()=>{},
    sigJournalGravar:()=>{},
    dbSet:()=>{},
    render:()=>{}, toast:()=>{}, atualizarChipSync:()=>{},
    getOneDriveConta:()=>({email:"x"}),
    avisarExclusaoMassaBloqueada:()=>{},
    onedriveEstaEmWifi:()=>true,
    /* O envio de fotos passou a seguir a política do texto (qualquer rede)
       em vez da detecção de Wi-Fi — que no iPhone nunca dizia "sim". Aqui o
       ensaio quer a rede liberada, como já queria com onedriveEstaEmWifi. */
    podeSincronizarAutomaticoAgora:()=>true,
    onedriveEstimarFotosParaEnviar:()=>({totalItens:0,totalBytes:0}),
    marcarArquivoCorrompido:()=>{},
    rotuloCaminhoNuvem:c=>c,
    onedriveBaixarTexto: async (c)=>nuvem.get(c),
    onedrivePrecisaBaixarFotosOriginal:null,
    __ultimoMotivoFalhaEnvio: undefined,
    __falhasEnvioNaSync: 0,
  };
  vm.createContext(ctx);
  vm.runInContext(`function nomeArquivoSeguro(s){ let n = String(s||"sem-nome").trim().slice(0,48)
    .replace(/[\\\\/:*?"<>|]/g,"-").replace(/\\s+/g," ").replace(/^\\.+/,"").replace(/[. ]+$/,"");
    if(/^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i.test(n)) n = n+"_"; return n || "sem-nome"; }`, ctx);
  ["CAMPOS_FILHOS_SYNC","CAMPO_FILHOS_POR_TIPO","CAMPOS_FOTO_UNICA"].forEach(n=>vm.runInContext(constante(n),ctx));
  try{ vm.runInContext(constante("SINC_FILHOS_DE"), ctx); }
  catch(e){ vm.runInContext('var SINC_FILHOS_DE = { area:"maquinas", maquina:"tarefas", tarefa:"riscos", risco:null };', ctx); }
  /* Marca local de "este item está com foto perdida" — o envio a consulta para
     não regravar na nuvem o arquivo que ainda tem a foto embutida dentro dele.
     Versões anteriores à correção não têm a const; nelas fica um nome que
     nenhum item carrega, e o comportamento é o de antes. */
  try{ vm.runInContext(constante("CAMPO_MARCA_FOTO_PERDIDA"), ctx); }
  catch(e){ vm.runInContext('var CAMPO_MARCA_FOTO_PERDIDA = "__fotosPerdidas";', ctx); }
  vm.runInContext(constante("LAPIDE_VALIDADE_MS"),ctx);
  vm.runInContext("var __ultimoCarimboVisto=0; var __arvoreSimplesCache=null; var __indiceNuvemMapa=null; var __indiceNuvemMapaEm=0; var __arvoreNuvemIncompleta=false;", ctx);
  vm.runInContext("var __assinaturasOneDriveSimples={mapa:null,chaveEstado:'oneDriveAssinaturasSimples'};", ctx);
  /* SUBPASTA_CONFIG_LAPIDES e uma const de EXPRESSAO (concatenacao), que o
     extrator constante() nao sabe delimitar — vem escrita aqui. */
  vm.runInContext("var SUBPASTA_CONFIG_LAPIDES = SUBPASTA_BACKUP + '/Config';", ctx);
  vm.runInContext("var LAPIDES_SYNC_INTERVALO_AUTO_MS = 600000; var __lapidesSyncUltimaVerificacao=0; var __lapidesSyncEmAndamento=false; var __avisoLapidesMassaEm=0;", ctx);
  // Listagem de pasta da nuvem de mentira, no formato que o app espera.
  ctx.onedriveListarFilhosEmLote = async (pastas) => {
    const m = new Map();
    for(const p of pastas){ const f = nuvem.filhos(p); m.set(p, f===null ? [] : f); }
    return m;
  };
  [ "__carregarUltimoCarimbo","registrarCarimboVisto","agoraSync",
    "segmentoPastaComId","extrairSufixoDoNome","idBateComSufixo",
    "listarItensSincronizaveisSimples","separarFotosDoItem","__ehFotoEmbutida",
    "itemTemFotosEmbutidas","tamanhoTextoLocalDoItem",
    "onedriveCarregarAssinaturas","onedriveAssinaturaDe","onedriveAnotarTamanho",
    "onedriveArquivoMudouNaNuvem","onedriveMesmaVersaoPeloTamanho","onedrivePrecisaBaixarFotos",
    "aplicarAtualizacaoRemota","__listasIrmasDe","__moverItemEntrePais",
    "__onedriveMesclarItemNovoInterno","onedriveMesclarItemNovo","completarFotosDeItem",
    "localizarItemLocal","onedriveRegistrarAssinaturaDeDownload",
    "onedriveItemLocalNoLugarDoDescritor","onedriveItemJaConvergido",
    "onedriveConteudoJaEnviado","onedriveColetarArquivosDaArvore",
    "onedriveGuardarIndiceNuvem","onedriveIndiceNuvem","onedriveCurarAssinatura",
    "onedriveJaExisteNaNuvem","onedriveFotosJaExistemNaNuvem","onedriveReconciliarComArvore",
    "onedriveClassificarNovosSimples","onedriveMarcarJaExistente","arquivoJaExistente",
    "arquivoEstaEmQuarentena","executarComConcorrencia","exclusaoEmMassaSuspeita",
    "rotuloCaminhoSync","onedriveSincronizarModulo","marcarSubarvoreMaquinaAlterada","onedriveBaixarPendentes",
    "sincDuplicatasNaArvore","sincJuntarDuplicata",
    "marcarFotosPendentesParaEnvio","recuperarFotosPerdidasDaNuvem","manterTelaAcesa","liberarTelaAcesa",
    // lapides de exclusao — o codigo real, nao mais um stub fixo em false
    "registrarLapidesExclusao","exclusaoConfirmadaPeloUsuario","lapideDe","lapideVenceDadosRemotos",
    "__lapideFilhos","__subarvoreTocadaDepoisDe","__tamanhoSubarvore","__lapidesRemoviveis",
    "aplicarLapidesNaArvore","idsSincronizaveisDe","getLapidesSyncEm","marcarLapidesAlteradas",
    "montarPacoteLapides","aplicarPacoteLapides","onedriveSincronizarLapides",
  ].forEach(n=>vm.runInContext(funcao(n),ctx));

  /* Comparação de endereço por ESQUELETO DE IDS (ensaios 22 e 23). Extraída
     quando existe; quando não existe — ou seja, ao rodar a bancada contra uma
     versão ANTERIOR à correção — entram estas versões, que reproduzem o
     comportamento antigo (compara o caminho inteiro, letra por letra). É o que
     permite `node banco.js original.html` rodar e REPROVAR nos ensaios 22 e 23,
     em vez de estourar por função inexistente. */
  ["enderecoLogicoDaPasta","onedriveMesmoEnderecoLogico",
   "__arquivosNoNo","onedriveDuplicatasParaIgnorar",
   "onedriveEnvioEncolheDemais",
   "__itemExisteAlgumLugar","riscoOrfaoConhecido","marcarRiscoOrfaoConhecido"].forEach(n=>{
    try{ vm.runInContext(funcao(n), ctx); }
    catch(e){ if(process.env.BANCO_DEBUG) console.log("  [extracao] " + n + " -> " + e.message); }
  });
  /* Versão anterior à correção do risco órfão: nunca marca nada, então o
     classificador (que só CONSULTA riscoOrfaoConhecido, sem depender de ela
     existir) nunca acha nada marcado — comportamento antigo preservado. */
  if(typeof ctx.riscoOrfaoConhecido !== "function") ctx.riscoOrfaoConhecido = () => false;
  if(typeof ctx.marcarRiscoOrfaoConhecido !== "function") ctx.marcarRiscoOrfaoConhecido = () => {};
  if(typeof ctx.__itemExisteAlgumLugar !== "function") ctx.__itemExisteAlgumLugar = () => false;
  /* Preenchidos aqui do lado do Node, e NÃO por um script rodado dentro do
     contexto: `function f(){}` dentro de um `if` é hasteada para o escopo do
     script e nasce como undefined, sobrescrevendo a função que a extração
     acabou de definir. O sintoma era um ReferenceError em ensaio nenhum
     relacionado, difícil de enxergar. Atribuir direto na propriedade do
     contexto não tem essa armadilha. */
  if(typeof ctx.enderecoLogicoDaPasta !== "function")
    ctx.enderecoLogicoDaPasta = p => Array.isArray(p) ? p.join("/") : null;
  if(typeof ctx.onedriveMesmoEnderecoLogico !== "function")
    ctx.onedriveMesmoEnderecoLogico = (a,b) => Array.isArray(a) && Array.isArray(b) && a.join("/") === b.join("/");
  /* Versão anterior à correção: não ignorava pasta duplicada nenhuma. */
  if(typeof ctx.onedriveDuplicatasParaIgnorar !== "function")
    ctx.onedriveDuplicatasParaIgnorar = () => new Set();
  if(typeof ctx.__arquivosNoNo !== "function")
    ctx.__arquivosNoNo = () => 0;
  /* A trava de encolhimento precisa das duas constantes numéricas, que o
     extrator constante() não sabe delimitar (número puro não abre chave).
     Lidas do arquivo por expressão regular, para o ensaio ficar preso ao
     valor REAL entregue. Versão anterior à correção: nunca bloqueia. */
  if(typeof ctx.onedriveEnvioEncolheDemais !== "function"){
    ctx.onedriveEnvioEncolheDemais = () => false;
  } else {
    for(const n of ["ENVIO_ENCOLHIMENTO_SUSPEITO","ENVIO_ENCOLHIMENTO_MINIMO_BYTES"]){
      const m = new RegExp("const " + n + " = ([^;]+);").exec(HTML);
      if(m) vm.runInContext("var " + n + " = " + m[1] + ";", ctx);
    }
    if(typeof ctx.onedriveIndiceNuvem !== "function") ctx.onedriveIndiceNuvem = () => null;
  }

  // Rede de mentira: envia/apaga/baixa direto na nuvem em memória.
  ctx.onedriveEnviarBlob = async (subpasta, blob, filename) => {
    nuvem.put("APR-Campo/" + subpasta + "/" + filename, blob.__texto);
    return true;
  };
  ctx.onedriveApagarBlob = async (subpasta, filename) => {
    nuvem.del("APR-Campo/" + subpasta + "/" + filename); return true;
  };
  // Blob precisa guardar o texto para a nuvem de mentira
  vm.runInContext(`var Blob = class { constructor(a){ this.__texto = a.join(""); this.size = __tamBytes(this.__texto); } };`, ctx);
  ctx.__tamBytes = t => Buffer.byteLength(t, "utf8");

  return { nome, ctx, nuvem };
}

/* Monta a árvore no formato que o app espera, a partir da nuvem de mentira. */
function montarArvore(nuvem, ap){
  let incompleta = false;
  const construir = (pasta, prof) => {
    const filhos = nuvem.filhos(pasta);
    if(filhos === null){ incompleta = true; return []; }
    return filhos.map(f => f.pasta
      ? { nome:f.nome, pasta:true, caminho:pasta+"/"+f.nome, filhos: prof>0 ? construir(pasta+"/"+f.nome, prof-1) : [] }
      : { nome:f.nome, pasta:false, caminho:pasta+"/"+f.nome, tamanho:f.tamanho });
  };
  const raiz = construir(PREFIXO, 4);
  vm.runInContext("__arvoreNuvemIncompleta = " + (incompleta?"true":"false") + ";", ap.ctx);
  return raiz;
}

/* Um ciclo completo de sincronização de um aparelho. */
async function ciclo(ap){
  const nuvem = ap.nuvem;
  nuvem.transferencias = 0;

  /* ---- EXCLUSOES DE OUTROS APARELHOS (codigo real) ----
     Primeiro item do ciclo, igual ao app (ver sincronizarIncrementalOneDrive):
     a arvore precisa ja estar limpa quando o envio decidir o que mandar. */
  await vm.runInContext("onedriveSincronizarLapides(true)", ap.ctx);

  // ---- ENVIO (código real) ----
  ap.ctx.__arv = null;
  await vm.runInContext(`onedriveSincronizarModulo("Simplificado", listarItensSincronizaveisSimples, __assinaturasOneDriveSimples, null)`, ap.ctx);

  // ---- RECEBIMENTO ----
  const arvore = montarArvore(nuvem, ap);
  ap.ctx.__arv = arvore;
  vm.runInContext("onedriveReconciliarComArvore(__arv)", ap.ctx);
  const cls = vm.runInContext("onedriveClassificarNovosSimples(__arv)", ap.ctx);
  /* Fiel ao app: o que é PEQUENO baixa na hora; o que é GRANDE (pacote de
     fotos) NÃO baixa aqui — vai para STATE.oneDrivePendentes e depois passa
     por onedriveBaixarPendentes, que é o caminho de verdade das fotos (e
     onde mora o sintoma "N fotos para receber" que não sai do lugar). */
  for(const d of cls.pequenos){
    const texto = nuvem.get(d.caminho);
    if(!texto) continue;
    ap.ctx.__d = d; ap.ctx.__dados = JSON.parse(texto);
    const ok = vm.runInContext("onedriveMesclarItemNovo(__d,__dados)", ap.ctx);
    if(!ok) vm.runInContext("onedriveMarcarJaExistente(__d)", ap.ctx);
  }
  const pend = ap.ctx.STATE.oneDrivePendentes || [];
  for(const g of cls.grandes){ if(!pend.some(p=>p.caminho===g.caminho)) pend.push(g); }
  ap.ctx.STATE.oneDrivePendentes = pend;
  await vm.runInContext("onedriveBaixarPendentes(null)", ap.ctx);
  return { transferencias: nuvem.transferencias,
           baixou: cls.pequenos.length,
           pendentes: (ap.ctx.STATE.oneDrivePendentes||[]).length };
}

/* ---------------- ÁRVORE DE EXEMPLO ---------------- */
let seq = 0;
const uid = () => "id" + (++seq).toString(36).padStart(4,"0");
function arvoreExemplo(nAreas, nMaq, nTar, nRisco, comFoto){
  const T = 1750000000000;
  const areas = [];
  for(let a=0;a<nAreas;a++){
    const maquinas = [];
    for(let m=0;m<nMaq;m++){
      const tarefas = [];
      for(let t=0;t<nTar;t++){
        const riscos = [];
        for(let r=0;r<nRisco;r++){
          riscos.push({ id:uid(), nome:"Risco "+r, descricao:"desc "+r,
            foto: comFoto ? "data:image/jpeg;base64,"+"A".repeat(200) : null,
            fotosOutras:[], criadoEm:T, atualizadoEm:T });
        }
        tarefas.push({ id:uid(), tarefa:"Tarefa "+t, tarefaOutro:"", riscos, criadoEm:T, atualizadoEm:T });
      }
      maquinas.push({ id:uid(), nome:"Maquina "+m, tarefas, criadoEm:T, atualizadoEm:T });
    }
    areas.push({ id:uid(), nome:"Area "+a, maquinas, criadoEm:T, atualizadoEm:T });
  }
  return { id:uid(), empresa:"Corteva", areas, criadoEm:T, atualizadoEm:T };
}

/* ---------------- ENSAIOS ---------------- */
let falhas = 0;
function checar(nome, cond, detalhe){
  if(cond) console.log("  ok   " + nome);
  else { falhas++; console.log("  FALHOU " + nome + (detalhe?" -> "+detalhe:"")); }
}
async function rodarAteParar(ap, maxCiclos, rotulo){
  const hist = [];
  for(let i=0;i<maxCiclos;i++){
    const r = await ciclo(ap);
    hist.push(r.transferencias);
    if(r.transferencias === 0) return { parou:true, ciclos:i+1, hist };
  }
  return { parou:false, ciclos:maxCiclos, hist };
}

(async ()=>{
  const L = "-".repeat(70);

  console.log("\n" + L + "\nENSAIO 1 — aparelho que criou tudo: envia e depois PARA\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,2,false)];
    const r = await rodarAteParar(A, 6);
    checar("chega ao silêncio (nenhuma transferência num ciclo)", r.parou, "transferências por ciclo: "+r.hist.join(", "));
    checar("silêncio em no máximo 3 ciclos", r.parou && r.ciclos<=3, "levou "+r.ciclos);
  }

  console.log("\n" + L + "\nENSAIO 2 — aparelho que só RECEBE: nunca envia nada\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,2,false)];
    await rodarAteParar(A, 6);
    const B = novoAparelho("B", nuvem);
    const antes = new Map(nuvem.arquivos);
    const r = await rodarAteParar(B, 8);
    checar("B chega ao silêncio", r.parou, "transferências por ciclo: "+r.hist.join(", "));
    let alterou = false;
    for(const [c,a] of nuvem.arquivos){ const o = antes.get(c); if(!o || o.texto !== a.texto) alterou = true; }
    checar("B não escreveu NADA na nuvem (não criou nada)", !alterou);
    checar("B recebeu a árvore inteira",
      vm.runInContext("listarItensSincronizaveisSimples().length", B.ctx) === vm.runInContext("listarItensSincronizaveisSimples().length", A.ctx),
      "A="+vm.runInContext("listarItensSincronizaveisSimples().length", A.ctx)+" B="+vm.runInContext("listarItensSincronizaveisSimples().length", B.ctx));
  }

  console.log("\n" + L + "\nENSAIO 3 — aparelho que restaurou BACKUP (dados sem assinaturas)\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    const arv = arvoreExemplo(2,2,2,2,false);
    A.ctx.STATE.projetosSimples = [arv];
    await rodarAteParar(A, 6);
    const antes = new Map(nuvem.arquivos);
    const C = novoAparelho("C", nuvem);
    C.ctx.STATE.projetosSimples = JSON.parse(JSON.stringify([arv])); // mesmos dados, zero assinaturas
    const r = await rodarAteParar(C, 8);
    checar("C chega ao silêncio", r.parou, "transferências por ciclo: "+r.hist.join(", "));
    let reescreveu = 0;
    for(const [c,a] of nuvem.arquivos){ const o = antes.get(c); if(o && o.texto !== a.texto) reescreveu++; }
    checar("C não reescreveu arquivo nenhum", reescreveu===0, reescreveu+" arquivos reescritos");
  }

  console.log("\n" + L + "\nENSAIO 4 — pasta que FALHA ao listar (429) não vira reenvio\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,2,false)];
    await rodarAteParar(A, 6);
    const assinaturasAntes = JSON.stringify(A.ctx.STATE.oneDriveAssinaturasSimples);
    // uma pasta de área passa a falhar
    const umaArea = [...nuvem.arquivos.keys()].map(c=>c.split("/").slice(0,5).join("/")).find(p=>p.split("/").length===5);
    nuvem.falharPastas.add(umaArea);
    const r = await ciclo(A);
    checar("nenhuma transferência mesmo com pasta falhando", r.transferencias===0, r.transferencias+" transferências");
    checar("nenhuma assinatura foi apagada",
      JSON.stringify(A.ctx.STATE.oneDriveAssinaturasSimples) === assinaturasAntes);
    nuvem.falharPastas.clear();
  }

  console.log("\n" + L + "\nENSAIO 5 — dois aparelhos alternando ciclos convergem e silenciam\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    const B = novoAparelho("B", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,2,false)];
    let silencioSeguido = 0, ciclos = 0;
    const hist = [];
    while(ciclos < 20 && silencioSeguido < 2){
      const ra = await ciclo(A); const rb = await ciclo(B);
      hist.push(ra.transferencias + "/" + rb.transferencias);
      if(ra.transferencias===0 && rb.transferencias===0) silencioSeguido++; else silencioSeguido = 0;
      ciclos++;
    }
    checar("os dois silenciam juntos", silencioSeguido>=2, "A/B por ciclo: "+hist.join(" "));
    const nA = vm.runInContext("listarItensSincronizaveisSimples().length", A.ctx);
    const nB = vm.runInContext("listarItensSincronizaveisSimples().length", B.ctx);
    checar("os dois terminam com a mesma quantidade de itens", nA===nB, "A="+nA+" B="+nB);
  }

  console.log("\n" + L + "\nENSAIO 6 — uma edição em B chega em A e o silêncio volta\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    const B = novoAparelho("B", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1,1,1,2,false)];
    for(let i=0;i<6;i++){ await ciclo(A); await ciclo(B); }
    // B edita um risco
    vm.runInContext(`(function(){ const r = STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[0];
      r.descricao = "EDITADO EM B"; r.atualizadoEm = agoraSync(); })()`, B.ctx);
    let ciclos = 0, silencioSeguido = 0;
    while(ciclos < 12 && silencioSeguido < 2){
      const rb = await ciclo(B); const ra = await ciclo(A);
      if(ra.transferencias===0 && rb.transferencias===0) silencioSeguido++; else silencioSeguido = 0;
      ciclos++;
    }
    const descA = vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[0].descricao`, A.ctx);
    checar("a edição chegou em A", descA === "EDITADO EM B", "A tem: "+descA);
    checar("o silêncio volta depois da edição", silencioSeguido>=2);
  }

  /* Daqui em diante: os casos onde EU JÁ SEI que há risco arquitetural —
     o caminho na nuvem carrega o NOME de todos os pais, então renomear ou
     mover mexe no endereço de toda a subárvore. */

  console.log("\n" + L + "\nENSAIO 7 — itens COM FOTO: silencia e não reenvia foto à toa\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1,2,2,2,true)];
    const rA = await rodarAteParar(A, 8);
    checar("A silencia com fotos", rA.parou, "A: "+rA.hist.join(", "));
    const antes = new Map(nuvem.arquivos);
    const B = novoAparelho("B", nuvem);
    const rB = await rodarAteParar(B, 10);
    checar("B (só recebe) silencia com fotos", rB.parou, "B: "+rB.hist.join(", "));
    let reescreveu = 0;
    for(const [c,a] of nuvem.arquivos){ const o = antes.get(c); if(!o || o.texto !== a.texto) reescreveu++; }
    checar("B não escreveu nada na nuvem", reescreveu===0, reescreveu+" arquivos");
    const temFoto = vm.runInContext(`!!STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos[0].foto`, B.ctx);
    checar("as fotos chegaram em B", temFoto);
  }

  console.log("\n" + L + "\nENSAIO 8 — RENOMEAR equipamento em A (muda o endereço da subárvore)\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    const B = novoAparelho("B", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1,1,2,2,false)];
    for(let i=0;i<6;i++){ await ciclo(A); await ciclo(B); }
    const arquivosAntes = nuvem.arquivos.size;
    vm.runInContext(`(function(){ const m = STATE.projetosSimples[0].areas[0].maquinas[0];
      m.nome = "Maquina RENOMEADA"; marcarSubarvoreMaquinaAlterada(m); })()`, A.ctx);
    let ciclos=0, silencio=0; const hist=[];
    while(ciclos<15 && silencio<2){
      const ra = await ciclo(A); const rb = await ciclo(B);
      hist.push(ra.transferencias+"/"+rb.transferencias);
      if(ra.transferencias===0 && rb.transferencias===0) silencio++; else silencio=0;
      ciclos++;
    }
    checar("volta ao silêncio depois do rename", silencio>=2, "A/B: "+hist.join(" "));
    const nomeB = vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].nome`, B.ctx);
    checar("B recebeu o nome novo", nomeB==="Maquina RENOMEADA", "B tem: "+nomeB);
    const nB = vm.runInContext("listarItensSincronizaveisSimples().length", B.ctx);
    const nA = vm.runInContext("listarItensSincronizaveisSimples().length", A.ctx);
    checar("nenhum item duplicou em B", nA===nB, "A="+nA+" B="+nB);
    checar("a nuvem não acumulou cópias órfãs", nuvem.arquivos.size===arquivosAntes,
      "antes="+arquivosAntes+" depois="+nuvem.arquivos.size);
  }

  console.log("\n" + L + "\nENSAIO 9 — MOVER equipamento de área em A\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    const B = novoAparelho("B", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,1,1,2,false)];
    for(let i=0;i<6;i++){ await ciclo(A); await ciclo(B); }
    const arquivosAntes = nuvem.arquivos.size;
    vm.runInContext(`(function(){ const p = STATE.projetosSimples[0];
      const m = p.areas[0].maquinas.pop(); p.areas[1].maquinas.push(m);
      marcarSubarvoreMaquinaAlterada(m); })()`, A.ctx);
    let ciclos=0, silencio=0; const hist=[];
    while(ciclos<15 && silencio<2){
      const ra = await ciclo(A); const rb = await ciclo(B);
      hist.push(ra.transferencias+"/"+rb.transferencias);
      if(ra.transferencias===0 && rb.transferencias===0) silencio++; else silencio=0;
      ciclos++;
    }
    checar("volta ao silêncio depois de mover", silencio>=2, "A/B: "+hist.join(" "));
    const distB = vm.runInContext(`STATE.projetosSimples[0].areas.map(a=>a.maquinas.length).join(",")`, B.ctx);
    const distA = vm.runInContext(`STATE.projetosSimples[0].areas.map(a=>a.maquinas.length).join(",")`, A.ctx);
    checar("B ficou com a mesma distribuição de A", distA===distB, "A=["+distA+"] B=["+distB+"]");
    checar("a nuvem não acumulou cópias órfãs", nuvem.arquivos.size===arquivosAntes,
      "antes="+arquivosAntes+" depois="+nuvem.arquivos.size);
  }

  console.log("\n" + L + "\nENSAIO 10 — nomes que colidem depois do corte de 48 caracteres\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    const B = novoAparelho("B", nuvem);
    const base = "Esteira de Retorno da mesa de selecao com nome muito comprido ";
    const T = 1750000000000;
    const mk = (sufixo) => ({ id:uid(), nome: base + sufixo, criadoEm:T, atualizadoEm:T,
      tarefas:[{ id:uid(), tarefa:"Limpeza", tarefaOutro:"", criadoEm:T, atualizadoEm:T,
        riscos:[{ id:uid(), nome:"R", descricao:"d "+sufixo, fotosOutras:[], criadoEm:T, atualizadoEm:T }] }] });
    A.ctx.STATE.projetosSimples = [{ id:uid(), empresa:"Corteva", criadoEm:T, atualizadoEm:T,
      areas:[{ id:uid(), nome:"Area", criadoEm:T, atualizadoEm:T, maquinas:[mk("A"), mk("B")] }] }];
    let ciclos=0, silencio=0; const hist=[];
    while(ciclos<12 && silencio<2){
      const ra = await ciclo(A); const rb = await ciclo(B);
      hist.push(ra.transferencias+"/"+rb.transferencias);
      if(ra.transferencias===0 && rb.transferencias===0) silencio++; else silencio=0;
      ciclos++;
    }
    checar("silencia mesmo com nomes cortados no mesmo ponto", silencio>=2, "A/B: "+hist.join(" "));
    const nA = vm.runInContext("listarItensSincronizaveisSimples().length", A.ctx);
    const nB = vm.runInContext("listarItensSincronizaveisSimples().length", B.ctx);
    checar("os dois equipamentos sobrevivem (um não sobrescreve o outro)", nA===nB && nB>=6, "A="+nA+" B="+nB);
    const descs = vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas.map(m=>m.tarefas[0].riscos[0].descricao).sort().join("|")`, B.ctx);
    checar("os dois riscos mantêm conteúdos distintos", descs==="d A|d B", "B tem: "+descs);
  }

  console.log("\n" + L + "\nENSAIO 11 — EXCLUIR um risco em A propaga e silencia\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    const B = novoAparelho("B", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1,1,1,3,false)];
    for(let i=0;i<6;i++){ await ciclo(A); await ciclo(B); }
    vm.runInContext(`(function(){ const t = STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0];
      t.riscos.pop(); })()`, A.ctx);
    let ciclos=0, silencio=0; const hist=[];
    while(ciclos<15 && silencio<2){
      const ra = await ciclo(A); const rb = await ciclo(B);
      hist.push(ra.transferencias+"/"+rb.transferencias);
      if(ra.transferencias===0 && rb.transferencias===0) silencio++; else silencio=0;
      ciclos++;
    }
    checar("volta ao silêncio depois da exclusão", silencio>=2, "A/B: "+hist.join(" "));
    const nA = vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.length`, A.ctx);
    const nB = vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.length`, B.ctx);
    checar("A e B terminam com a mesma quantidade de riscos", nA===nB, "A="+nA+" B="+nB);
  }

  /* ---- INJEÇÃO DE FALHAS: é aqui que os defeitos reais moraram ---- */

  console.log("\n" + L + "\nENSAIO 12 — envio falha de vez em quando (429) e mesmo assim converge\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,2,false)];
    let n = 0;
    const envioOriginal = A.ctx.onedriveEnviarBlob;
    A.ctx.onedriveEnviarBlob = async (sub, blob, fn) => {
      n++;
      if(n % 3 === 0) return false;          // 1 em cada 3 envios é recusado
      return envioOriginal(sub, blob, fn);
    };
    let ciclos=0, parou=false; const hist=[];
    while(ciclos<20){
      const r = await ciclo(A); hist.push(r.transferencias);
      if(r.transferencias===0){ parou=true; break; }
      ciclos++;
    }
    checar("converge apesar das recusas", parou, "transferências: "+hist.join(", "));
    A.ctx.onedriveEnviarBlob = envioOriginal;
    // com a rede boa de novo, tudo tem de estar lá e ficar quieto
    const r2 = await rodarAteParar(A, 8);
    checar("com a rede boa, silencia de novo", r2.parou, r2.hist.join(", "));
  }

  console.log("\n" + L + "\nENSAIO 13 — sincronização MORTA no meio retoma sem refazer\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,2,false)];
    let n = 0;
    const envioOriginal = A.ctx.onedriveEnviarBlob;
    A.ctx.onedriveEnviarBlob = async (sub, blob, fn) => {
      if(++n > 5) throw new Error("MORREU_NO_MEIO");   // app fechado / aba morta
      return envioOriginal(sub, blob, fn);
    };
    try{ await ciclo(A); }catch(e){ /* como o app faz: o erro não derruba nada */ }
    const jaNaNuvem = new Map(nuvem.arquivos);   // exatamente o que sobreviveu à morte
    checar("o que subiu antes da morte ficou na nuvem", jaNaNuvem.size>0, jaNaNuvem.size+" arquivos");
    /* A assinatura de cada item é gravada na hora, dentro do laço — em memória
       (o Map) e no diário do IndexedDB (sigJournalGravar). O objeto do STATE
       só é atualizado no fim do lote, mas isso não é perda: na mesma sessão
       vale o Map, e numa reabertura o sigJournalReaplicar() restaura do
       diário. O que interessa checar é o efeito prático: reenviou ou não. */
    const mapaMem = A.ctx.__assinaturasOneDriveSimples.mapa;
    checar("as assinaturas do que subiu ficaram registradas na hora",
      mapaMem && mapaMem.size>0, mapaMem ? mapaMem.size+" assinaturas" : "sem mapa");
    A.ctx.onedriveEnviarBlob = envioOriginal;
    // Marca os arquivos já corretos e vê se algum é REESCRITO ao retomar.
    const reescritos = [];
    const envioVigiado = async (sub, blob, fn) => {
      const caminho = "APR-Campo/" + sub + "/" + fn;
      const antigo = jaNaNuvem.get(caminho);
      if(antigo && antigo.texto === blob.__texto) reescritos.push(caminho);
      return envioOriginal(sub, blob, fn);
    };
    A.ctx.onedriveEnviarBlob = envioVigiado;
    await ciclo(A);
    checar("ao retomar, NÃO reescreve nenhum arquivo que já estava correto",
      reescritos.length===0, reescritos.length+" reescritos: "+reescritos.slice(0,2).join(", "));
    A.ctx.onedriveEnviarBlob = envioOriginal;
    const r2 = await rodarAteParar(A, 8);
    checar("e chega ao silêncio", r2.parou, r2.hist.join(", "));
  }

  console.log("\n" + L + "\nENSAIO 14 — resistência: 30 rodadas com falhas aleatórias\n" + L);
  {
    let semente = 12345;
    const aleatorio = () => { semente = (semente*1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    const B = novoAparelho("B", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,2,false)];
    const envioA = A.ctx.onedriveEnviarBlob, envioB = B.ctx.onedriveEnviarBlob;
    const comFalha = (orig) => async (sub, blob, fn) => (aleatorio() < 0.2) ? false : orig(sub, blob, fn);
    A.ctx.onedriveEnviarBlob = comFalha(envioA);
    B.ctx.onedriveEnviarBlob = comFalha(envioB);
    const todasPastas = () => [...nuvem.arquivos.keys()].map(c=>c.split("/").slice(0,-1).join("/"));
    for(let i=0;i<30;i++){
      // uma pasta aleatória falha ao listar nesta rodada
      nuvem.falharPastas.clear();
      const pastas = todasPastas();
      if(pastas.length && aleatorio() < 0.3) nuvem.falharPastas.add(pastas[Math.floor(aleatorio()*pastas.length)]);
      try{ await ciclo(A); }catch(e){}
      try{ await ciclo(B); }catch(e){}
    }
    // agora tudo volta ao normal: tem de silenciar
    nuvem.falharPastas.clear();
    A.ctx.onedriveEnviarBlob = envioA; B.ctx.onedriveEnviarBlob = envioB;
    let silencio = 0, ciclos = 0; const hist = [];
    while(ciclos<15 && silencio<2){
      const ra = await ciclo(A); const rb = await ciclo(B);
      hist.push(ra.transferencias+"/"+rb.transferencias);
      if(ra.transferencias===0 && rb.transferencias===0) silencio++; else silencio=0;
      ciclos++;
    }
    checar("depois de 30 rodadas caóticas, silencia quando a rede normaliza", silencio>=2, "A/B: "+hist.join(" "));
    const nA = vm.runInContext("listarItensSincronizaveisSimples().length", A.ctx);
    const nB = vm.runInContext("listarItensSincronizaveisSimples().length", B.ctx);
    checar("nenhum item se perdeu nem duplicou", nA===nB && nA===vm.runInContext("listarItensSincronizaveisSimples().length", A.ctx),
      "A="+nA+" B="+nB);
    checar("A e B terminam idênticos", nA===nB, "A="+nA+" B="+nB);
  }

  console.log("\n" + L + "\nENSAIO 15 — ESCALA REAL: projeto do tamanho do usado em campo\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    // ~1170 itens, a ordem de grandeza medida no aparelho do engenheiro
    A.ctx.STATE.projetosSimples = [arvoreExemplo(10,5,4,4,false)];
    const total = vm.runInContext("listarItensSincronizaveisSimples().length", A.ctx);
    console.log("  (árvore com " + total + " itens)");
    checar("a árvore de ensaio tem porte de campo", total > 900, total+" itens");
    const rA = await rodarAteParar(A, 10);
    checar("A silencia mesmo com a árvore grande", rA.parou, "A: "+rA.hist.join(", "));
    const antes = new Map(nuvem.arquivos);
    const B = novoAparelho("B", nuvem);
    const rB = await rodarAteParar(B, 15);
    checar("B (só recebe) silencia na escala real", rB.parou, "B: "+rB.hist.join(", "));
    let reescreveu = 0;
    for(const [c,a] of nuvem.arquivos){ const o = antes.get(c); if(!o || o.texto !== a.texto) reescreveu++; }
    checar("B não escreveu nada na nuvem, mesmo com 1000+ itens", reescreveu===0, reescreveu+" arquivos");
    checar("B recebeu a árvore inteira",
      vm.runInContext("listarItensSincronizaveisSimples().length", B.ctx) === total,
      "B="+vm.runInContext("listarItensSincronizaveisSimples().length", B.ctx)+" de "+total);
  }

  console.log("\n" + L + "\nENSAIO 16 — a fila de FOTOS PARA RECEBER chega a ZERO\n" + L);
  {
    /* O sintoma que ficou aberto em campo: "N fotos para receber" que não sai
       do lugar. Aqui a fila é acompanhada ciclo a ciclo e tem de esvaziar. */
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,3,true)];
    await rodarAteParar(A, 10);
    const B = novoAparelho("B", nuvem);
    const fila = [];
    for(let i=0;i<12;i++){
      const r = await ciclo(B);
      fila.push(r.pendentes);
      if(r.transferencias===0 && r.pendentes===0) break;
    }
    checar("a fila de fotos pendentes zera", fila[fila.length-1]===0, "fila por ciclo: "+fila.join(", "));
    checar("a fila nunca cresce depois de começar a baixar",
      fila.every((v,i)=> i===0 || v<=fila[i-1]), "fila por ciclo: "+fila.join(", "));
    const semFoto = vm.runInContext(`(function(){ let n=0; STATE.projetosSimples.forEach(p=>p.areas.forEach(a=>a.maquinas.forEach(m=>m.tarefas.forEach(t=>t.riscos.forEach(r=>{ if(!r.foto) n++; }))))); return n; })()`, B.ctx);
    checar("todos os riscos de B ficaram com a foto", semFoto===0, semFoto+" riscos sem foto");
  }

  /* ------------------------------------------------------------------
     Atalhos para os ensaios de exclusao. excluirRisco/excluirArea fazem o
     mesmo que a tela faz: gravam a lapide e tiram o item da arvore. */
  const riscosDe = ap => vm.runInContext(
    `(STATE.projetosSimples[0]?STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.map(r=>r.id):[])`, ap.ctx);
  const idsDe = ap => vm.runInContext(`listarItensSincronizaveisSimples().map(i=>i.id)`, ap.ctx);
  function excluirRisco(ap, rid){
    vm.runInContext(`(function(){
      const t = STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0];
      const r = t.riscos.find(x=>x.id===${JSON.stringify(rid)});
      registrarLapidesExclusao(idsSincronizaveisDe("risco", r));
      t.riscos = t.riscos.filter(x=>x.id!==${JSON.stringify(rid)});
    })()`, ap.ctx);
  }
  function excluirArea(ap, aid){
    vm.runInContext(`(function(){
      const p = STATE.projetosSimples[0];
      const a = p.areas.find(x=>x.id===${JSON.stringify(aid)});
      registrarLapidesExclusao(idsSincronizaveisDe("area", a));
      p.areas = p.areas.filter(x=>x.id!==${JSON.stringify(aid)});
    })()`, ap.ctx);
  }
  const arquivosCom = (nuvem, id) => [...nuvem.arquivos.keys()].filter(c=>c.includes(id));

  console.log("\n" + L + "\nENSAIO 17 - risco excluido num aparelho some do outro (e nao volta)\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1,1,1,3,false)];
    await rodarAteParar(A, 8);
    const B = novoAparelho("B", nuvem);
    await rodarAteParar(B, 8);
    checar("A e B comecam iguais", riscosDe(A).join()===riscosDe(B).join(),
      "A="+riscosDe(A).join()+" B="+riscosDe(B).join());

    const alvo = riscosDe(A)[1];
    excluirRisco(A, alvo);
    await rodarAteParar(A, 8);
    checar("o arquivo do risco sai da nuvem", arquivosCom(nuvem, alvo).length===0);

    for(let i=0;i<4;i++) await ciclo(B);
    checar("B removeu o risco excluido", riscosDe(B).indexOf(alvo)<0, "B="+riscosDe(B).join());
    checar("B NAO ressuscitou o arquivo na nuvem", arquivosCom(nuvem, alvo).length===0,
      arquivosCom(nuvem, alvo).join());
    checar("B nao perdeu os outros riscos", riscosDe(B).length===2, "B="+riscosDe(B).join());

    const C = novoAparelho("C", nuvem);
    await rodarAteParar(C, 10);
    checar("aparelho NOVO nao recebe o risco excluido", riscosDe(C).indexOf(alvo)<0, "C="+riscosDe(C).join());
    checar("aparelho NOVO recebe os outros dois", riscosDe(C).length===2, "C="+riscosDe(C).join());

    const rA = await rodarAteParar(A, 6), rB = await rodarAteParar(B, 6);
    checar("depois da exclusao os dois voltam ao silencio", rA.parou && rB.parou,
      "A: "+rA.hist.join(",")+" | B: "+rB.hist.join(","));
  }

  console.log("\n" + L + "\nENSAIO 18 - SEGURANCA: quem editou depois da exclusao nao perde o trabalho\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1,1,1,3,false)];
    await rodarAteParar(A, 8);
    const B = novoAparelho("B", nuvem);
    await rodarAteParar(B, 8);

    const alvo = riscosDe(A)[1];
    excluirRisco(A, alvo);
    await rodarAteParar(A, 8);
    vm.runInContext(`(function(){
      const t = STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0];
      const r = t.riscos.find(x=>x.id===${JSON.stringify(alvo)});
      r.descricao = "TEXTO ESCRITO DEPOIS DA EXCLUSAO";
      r.atualizadoEm = agoraSync();
    })()`, B.ctx);
    for(let i=0;i<4;i++) await ciclo(B);

    checar("o risco editado depois da exclusao SOBREVIVE em B", riscosDe(B).indexOf(alvo)>=0, "B="+riscosDe(B).join());
    checar("o texto novo continua intacto",
      vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.find(r=>r.id===${JSON.stringify(alvo)}).descricao`, B.ctx)
      === "TEXTO ESCRITO DEPOIS DA EXCLUSAO");
    checar("o trabalho novo volta para a nuvem", arquivosCom(nuvem, alvo).length>0);

    for(let i=0;i<4;i++) await ciclo(A);
    checar("A aceita de volta o risco que ele mesmo apagou (edicao mais nova vence)",
      riscosDe(A).indexOf(alvo)>=0, "A="+riscosDe(A).join());
    checar("A e B convergem para a MESMA arvore", idsDe(A).sort().join()===idsDe(B).sort().join(),
      "A="+idsDe(A).length+" itens, B="+idsDe(B).length);
  }

  console.log("\n" + L + "\nENSAIO 19 - SEGURANCA: um risco editado salva a AREA inteira da exclusao\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,1,1,3,false)];
    await rodarAteParar(A, 8);
    const B = novoAparelho("B", nuvem);
    await rodarAteParar(B, 8);

    const areaAlvo = vm.runInContext("STATE.projetosSimples[0].areas[0].id", A.ctx);
    excluirArea(A, areaAlvo);
    await rodarAteParar(A, 8);
    /* Busca a area POR ID dentro de B: a ordem do array em B vem da ordem de
       download, que nao e a mesma de A. Editar "areas[0]" as cegas mexia na
       area errada e o ensaio media outra coisa. */
    const riscoDentro = vm.runInContext(`(function(){
      const a = STATE.projetosSimples[0].areas.find(x=>x.id===${JSON.stringify(areaAlvo)});
      const r = a.maquinas[0].tarefas[0].riscos[0];
      r.descricao = "LAUDO EM ANDAMENTO"; r.atualizadoEm = agoraSync();
      return r.id;
    })()`, B.ctx);
    for(let i=0;i<5;i++) await ciclo(B);

    const areasB = vm.runInContext("STATE.projetosSimples[0].areas.map(a=>a.id)", B.ctx);
    checar("a area NAO foi removida de B (tinha trabalho novo dentro)", areasB.indexOf(areaAlvo)>=0, "areas de B: "+areasB.join());
    checar("o caminho inteiro ate o risco sobreviveu (area > maquina > tarefa > risco)",
      vm.runInContext(`(function(){
        const a = STATE.projetosSimples[0].areas.find(x=>x.id===${JSON.stringify(areaAlvo)});
        if(!a || !a.maquinas[0] || !a.maquinas[0].tarefas[0]) return false;
        return a.maquinas[0].tarefas[0].riscos.some(r=>r.id===${JSON.stringify(riscoDentro)});
      })()`, B.ctx));
    checar("o texto escrito em campo continua intacto",
      vm.runInContext(`(function(){
        const a = STATE.projetosSimples[0].areas.find(x=>x.id===${JSON.stringify(areaAlvo)});
        const r = a.maquinas[0].tarefas[0].riscos.find(r=>r.id===${JSON.stringify(riscoDentro)});
        return r && r.descricao;
      })()`, B.ctx) === "LAUDO EM ANDAMENTO");
    checar("a outra area, sem edicao, permanece intacta", areasB.length===2, "areas de B: "+areasB.join());
  }

  console.log("\n" + L + "\nENSAIO 20 - SEGURANCA: freio de massa segura exclusao gigante no automatico\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2,2,2,2,false)];
    await rodarAteParar(A, 8);
    const B = novoAparelho("B", nuvem);
    await rodarAteParar(B, 8);
    const antesB = idsDe(B).length;

    /* Pacote de lapides mandando apagar TUDO — o que um estado corrompido ou
       um defeito futuro produziria. Nao pode limpar a arvore sozinho. */
    const todos = idsDe(A);
    const carimbo = vm.runInContext("agoraSync()", B.ctx) + 1000;
    const lap = {}; todos.forEach(id=>{ lap[id] = carimbo; });
    B.ctx.__lap = { atualizadoEm: carimbo, lapides: lap };
    vm.runInContext("aplicarPacoteLapides(__lap)", B.ctx);

    const auto = vm.runInContext("aplicarLapidesNaArvore(false)", B.ctx);
    checar("no automatico o freio segura: nada foi removido", auto.removidos===0 && auto.bloqueados>0,
      JSON.stringify(auto));
    checar("a arvore de B continua inteira", idsDe(B).length===antesB,
      "antes="+antesB+" agora="+idsDe(B).length);

    const manual = vm.runInContext("aplicarLapidesNaArvore(true)", B.ctx);
    checar("no manual (usuario mandou) a mesma exclusao e aplicada", manual.removidos>0, JSON.stringify(manual));
  }

  console.log("\n" + L + "\nENSAIO 21 - item que sumiu do aparelho (sem confirmacao) tambem propaga\n" + L);
  {
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1,1,1,3,false)];
    await rodarAteParar(A, 8);
    const B = novoAparelho("B", nuvem);
    await rodarAteParar(B, 8);

    /* Caminho SEM lapide na origem: o item some da arvore (excluido com o
       OneDrive desconectado, por exemplo) e quem descobre e a sincronizacao. */
    const alvo = riscosDe(A)[2];
    vm.runInContext(`(function(){
      const t = STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0];
      t.riscos = t.riscos.filter(x=>x.id!==${JSON.stringify(alvo)});
    })()`, A.ctx);
    checar("A nao tem lapide antes de sincronizar",
      vm.runInContext(`lapideDe("risco:"+${JSON.stringify(alvo)})`, A.ctx)===0);

    await rodarAteParar(A, 8);
    checar("a sincronizacao gravou a lapide sozinha",
      vm.runInContext(`lapideDe("risco:"+${JSON.stringify(alvo)})`, A.ctx)>0);
    /* Um ciclo a mais em A: a lapide nasce DENTRO do envio, depois da rodada
       de lapides deste ciclo — quem a leva para a nuvem e o ciclo seguinte.
       (No app isso acontece sozinho: o ciclo automatico repete a cada 2 min e
       marcarLapidesAlteradas zera o limitador de 10 min para nao atrasar.) */
    await ciclo(A);
    checar("a lapide subiu para a nuvem",
      [...nuvem.arquivos.keys()].some(c=>c.includes("lapides_")));

    for(let i=0;i<4;i++) await ciclo(B);
    checar("B removeu o item que sumiu de A", riscosDe(B).indexOf(alvo)<0, "B="+riscosDe(B).join());
    checar("nada ressuscitou na nuvem", arquivosCom(nuvem, alvo).length===0);
  }

  console.log("\n" + L + "\nENSAIO 22 - renomear equipamento NAO reenvia a arvore inteira\n" + L);
  {
    /* O endereco do arquivo na nuvem e montado com o NOME legivel de cada
       nivel. Quem identifica o item e o sufixo de id no fim da pasta -- o
       nome e so para quem for olhar as pastas pelo gerenciador de arquivos.
       Mas o envio comparava o caminho INTEIRO com o gravado na assinatura:
       renomear qualquer nivel fazia o app concluir "mudou de endereco",
       APAGAR a copia antiga e subir tudo de novo -- o item e todos os filhos
       dele. Era o par de linhas "arquivo X (- bytes)" seguido de "arquivo X
       (459 B)" no historico, no mesmo minuto, sem ninguem ter tocado no item. */
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1, 2, 2, 3, false)];
    await rodarAteParar(A, 8);
    const B = novoAparelho("B", nuvem);
    await rodarAteParar(B, 8);
    checar("A e B comecam iguais e em silencio",
      riscosDe(A).join() === riscosDe(B).join(), "A=" + riscosDe(A).length + " B=" + riscosDe(B).length);

    const arquivosAntes = new Set(nuvem.arquivos.keys());
    const totalAntes = arquivosAntes.size;

    /* A pessoa corrige o nome do equipamento -- so o nome, mais nada. */
    vm.runInContext(`(function(){
      const m = STATE.projetosSimples[0].areas[0].maquinas[0];
      m.nome = "Mesa de selecao manual B (corrigido)";
      m.atualizadoEm = (m.atualizadoEm||0) + 1000;
    })()`, A.ctx);

    const rA = await rodarAteParar(A, 8);
    checar("A volta ao silencio depois de renomear", rA.parou,
      "transferencias por ciclo: " + rA.hist.join(", "));

    const arquivosDepois = new Set(nuvem.arquivos.keys());
    const sumiram = [...arquivosAntes].filter(c => !arquivosDepois.has(c));
    const nasceram = [...arquivosDepois].filter(c => !arquivosAntes.has(c));
    checar("NENHUM arquivo foi apagado da nuvem so por causa da renomeacao",
      sumiram.length === 0, sumiram.length + " apagados: " + sumiram.slice(0,3).join(" | "));
    checar("nenhum arquivo novo foi criado em endereco diferente",
      nasceram.length === 0, nasceram.length + " novos: " + nasceram.slice(0,3).join(" | "));
    checar("o total de arquivos na nuvem nao mudou",
      nuvem.arquivos.size === totalAntes, totalAntes + " -> " + nuvem.arquivos.size);

    /* O outro aparelho recebe o nome novo e nao desfaz nada. */
    const rB = await rodarAteParar(B, 8);
    checar("B volta ao silencio depois de receber o nome novo", rB.parou,
      "transferencias por ciclo: " + rB.hist.join(", "));
    checar("B recebeu o nome corrigido",
      vm.runInContext("STATE.projetosSimples[0].areas[0].maquinas[0].nome", B.ctx) === "Mesa de selecao manual B (corrigido)",
      vm.runInContext("STATE.projetosSimples[0].areas[0].maquinas[0].nome", B.ctx));

    /* O TESTE QUE PEGA O PING-PONG: com os dois em silencio, alternar ciclos
       nao pode voltar a transferir nada. No codigo antigo, cada aparelho
       recalculava o nome com o que sabia, via o caminho do outro como
       "endereco errado", apagava e reenviava -- para sempre. */
    let trafegoDepois = 0;
    for(let i = 0; i < 3; i++){
      trafegoDepois += (await ciclo(A)).transferencias;
      trafegoDepois += (await ciclo(B)).transferencias;
    }
    checar("SEM PING-PONG: 6 ciclos alternados sem ninguem editar = zero trafego",
      trafegoDepois === 0, "ainda transferiu " + trafegoDepois);
    /* riscosDe olha uma tarefa so (maquinas[0].tarefas[0]): 3 riscos. O que
       importa aqui e que a renomeacao nao levou nenhum deles embora. */
    checar("os riscos continuam todos la, nos dois aparelhos",
      riscosDe(A).length === 3 && riscosDe(B).length === 3,
      "A=" + riscosDe(A).length + " B=" + riscosDe(B).length);
    checar("a arvore inteira continua na nuvem, item por item",
      nuvem.arquivos.size === totalAntes, totalAntes + " -> " + nuvem.arquivos.size);
  }

  console.log("\n" + L + "\nENSAIO 23 - mover de pai DE VERDADE continua movendo na nuvem\n" + L);
  {
    /* O contraponto do ensaio 22: a correcao nao pode ter desligado a
       mudanca de endereco legitima. Mover uma maquina de area TEM de mover
       o arquivo na nuvem -- senao a mudanca nunca chegaria ao outro
       aparelho e a copia antiga ficaria orfa la, sendo rebaixada de volta
       como se fosse item novo. */
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2, 1, 1, 2, false)];
    await rodarAteParar(A, 8);
    const caminhoAntes = [...nuvem.arquivos.keys()].filter(c => c.endsWith("_maquina.json"));
    checar("as duas maquinas estao na nuvem", caminhoAntes.length === 2, caminhoAntes.length + "");

    /* Move a maquina da area 0 para a area 1 -- muda de PAI, nao so de nome.
       Fiel ao app: executarMoverMaquinaS chama marcarSubarvoreMaquinaAlterada,
       que recarimba tarefas e riscos junto. Sem esse recarimbo os filhos nunca
       entrariam na fila de envio e os arquivos deles ficariam orfaos no
       endereco antigo -- que e justamente o que o recarimbo existe para
       evitar ("sem isto a mudanca nunca sai deste aparelho"). */
    const idMaq = vm.runInContext(`(function(){
      const p = STATE.projetosSimples[0];
      const m = p.areas[0].maquinas.shift();
      p.areas[1].maquinas.push(m);
      marcarSubarvoreMaquinaAlterada(m);
      return m.id;
    })()`, A.ctx);
    const sufixo = String(idMaq).slice(-6);

    const rA = await rodarAteParar(A, 8);
    checar("A volta ao silencio depois de mover", rA.parou, rA.hist.join(", "));

    const doMovido = [...nuvem.arquivos.keys()].filter(c => c.includes("(" + sufixo + ")"));
    checar("a maquina movida existe em UM endereco so na nuvem",
      doMovido.filter(c => c.endsWith("_maquina.json")).length === 1,
      doMovido.join(" | "));
    checar("o arquivo esta embaixo da area NOVA",
      doMovido.some(c => c.includes("Area 1")), doMovido.join(" | "));
    checar("nao sobrou copia orfa embaixo da area antiga",
      !doMovido.some(c => c.includes("Area 0")), doMovido.join(" | "));

    const B = novoAparelho("B", nuvem);
    await rodarAteParar(B, 10);
    checar("B recebe a maquina na area certa",
      vm.runInContext(`(STATE.projetosSimples[0].areas[1].maquinas||[]).some(m=>m.id===${JSON.stringify(idMaq)})`, B.ctx));
    checar("B nao ficou com a maquina duplicada nas duas areas",
      vm.runInContext(`(STATE.projetosSimples[0].areas[0].maquinas||[]).every(m=>m.id!==${JSON.stringify(idMaq)})`, B.ctx));
  }

  console.log("\n" + L + "\nENSAIO 24 - pasta duplicada do MESMO id nao gera vaivem eterno\n" + L);
  {
    /* Na nuvem real do usuario, o projeto de id c268c7 existe em TRES pastas
       ("Corteva", "Corteva A", "Corteva Agriscience") -- heranca das
       renomeacoes antigas, que criavam pasta nova sem remover a antiga.
       O app descia em todas, e a assinatura de cada item e guardada por
       "tipo:id": UMA so para todas as copias. Cada copia sobrescrevia o
       tamanho registrado pela outra e, na varredura seguinte, as duas
       pareciam ter mudado. Fila que nunca zerava, com itens que ninguem
       tocou -- era a linha "N atualizados em outro aparelho, para receber". */
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1, 2, 2, 2, false)];
    await rodarAteParar(A, 8);
    const idProj = A.ctx.STATE.projetosSimples[0].id;
    const sufixo = String(idProj).slice(-6);
    const pastaViva = "Corteva (" + sufixo + ")";
    const pastaVelha = "Corteva Agriscience LTDA (" + sufixo + ")";

    /* Reproduz o estrago historico: uma copia da arvore inteira numa pasta de
       projeto com o MESMO id e outro nome legivel. E ela precisa ser uma copia
       VELHA, com conteudo diferente -- e isso que dispara o vaivem. Na nuvem
       real do usuario, 79 arquivos da pasta antiga eram MAIORES que os da
       viva. Copia identica nao reproduz nada: os tamanhos batem e o app nao
       ve novidade. */
    let copiados = 0;
    for(const [caminho, arq] of [...nuvem.arquivos]){
      if(caminho.indexOf("/" + pastaViva + "/") < 0) continue;
      let texto = arq.texto;
      try{
        const o = JSON.parse(texto);
        if(o && typeof o === "object" && o.id){
          // versao ANTIGA: texto mais longo (tamanho diferente) e carimbo mais velho
          if(typeof o.nome === "string") o.nome = o.nome + " (nome antigo, bem mais comprido)";
          if(typeof o.atualizadoEm === "number") o.atualizadoEm = o.atualizadoEm - 100000;
          texto = JSON.stringify(o, null, 0);
        }
      }catch(e){}
      nuvem.arquivos.set(caminho.replace("/" + pastaViva + "/", "/" + pastaVelha + "/"),
                         { tamanho: Buffer.byteLength(texto, "utf8"), texto });
      copiados++;
    }
    checar("o cenario montou a pasta duplicada", copiados > 0, copiados + " arquivos");
    checar("a nuvem tem as duas pastas do mesmo id",
      [...nuvem.arquivos.keys()].some(c=>c.includes(pastaViva)) &&
      [...nuvem.arquivos.keys()].some(c=>c.includes(pastaVelha)));

    /* O QUE A CORRECAO PROMETE: a varredura para de DESCER na pasta parada.
       Sem isso, os 1226 arquivos das pastas antigas do projeto do usuario
       eram listados e avaliados a cada ciclo, e cada copia sobrescrevia o
       tamanho registrado pela outra (a assinatura e uma so por "tipo:id").
       Aqui a arvore da nuvem e classificada e conferimos se algum item
       proposto aponta para a pasta parada. */
    {
      const arv = montarArvore(nuvem, A);
      A.ctx.__arv = arv;
      const cls = vm.runInContext("onedriveClassificarNovosSimples(__arv)", A.ctx);
      const propostos = [...(cls.pequenos||[]), ...(cls.grandes||[])];
      const daVelha = propostos.filter(d => String(d.caminho||"").includes(pastaVelha));
      checar("a varredura IGNORA a pasta parada (nao propoe nada de la)",
        daVelha.length === 0, daVelha.length + " itens propostos da pasta antiga: " +
        daVelha.slice(0,2).map(d=>d.caminho).join(" | "));
    }

    const r = await rodarAteParar(A, 10);
    checar("A volta ao silencio mesmo com a pasta duplicada la", r.parou,
      "transferencias por ciclo: " + r.hist.join(", "));
    checar("nada foi APAGADO da nuvem (as copias continuam intactas)",
      [...nuvem.arquivos.keys()].filter(c=>c.includes(pastaVelha)).length === copiados,
      [...nuvem.arquivos.keys()].filter(c=>c.includes(pastaVelha)).length + " de " + copiados);

    const B = novoAparelho("B", nuvem);
    const rB = await rodarAteParar(B, 12);
    checar("aparelho NOVO tambem silencia", rB.parou, "B: " + rB.hist.join(", "));
    const nA = idsDe(A).length, nB = idsDe(B).length;
    checar("B recebeu a arvore UMA vez, sem duplicar itens", nA === nB, "A=" + nA + " B=" + nB);

    let depois = 0;
    for(let i=0;i<3;i++){ depois += (await ciclo(A)).transferencias; depois += (await ciclo(B)).transferencias; }
    checar("SEM VAIVEM: 6 ciclos alternados sem editar = zero trafego", depois === 0,
      "ainda transferiu " + depois);
  }

  console.log("\n" + L + "\nENSAIO 25 - risco com o MESMO id em DUAS tarefas reais nao gera vaivem eterno\n" + L);
  {
    /* A CAUSA REAL da "fila que nunca termina" reportada pelo usuario, achada
       rodando o codigo contra a nuvem real dele: 60 riscos com o mesmo id
       espalhados em duas tarefas. 51 eram efeito colateral de pasta-pai
       duplicada (ensaio 24 ja cobre). Os outros 9 sao um risco que foi movido
       (ou copiado por engano) de uma tarefa de verdade para outra tarefa de
       verdade -- as duas continuam existindo, distintas -- e a copia antiga
       nunca foi removida da nuvem.

       O mecanismo do loop infinito: a classificacao so pergunta "este risco
       esta na tarefa ATUAL?" -- nao sabe que ele ja existe em outra tarefa.
       Propoe baixar de novo. A mesclagem sabe (via __moverItemEntrePais) e
       recusa -- mas recusar nao deixava rastro, e a classificacao "esquecia"
       na sincronizacao seguinte. Para sempre. */
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1, 1, 2, 0, false)]; // 2 tarefas, riscos vazios
    const idRisco = uid();
    const riscoOriginal = { id:idRisco, nome:"Risco compartilhado", descricao:"desc",
      foto:null, fotosOutras:[], criadoEm:1750000000000, atualizadoEm:1750000000000 };
    vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.push(${JSON.stringify(riscoOriginal)})`, A.ctx);
    await rodarAteParar(A, 8);

    const tarefas = () => vm.runInContext(
      `STATE.projetosSimples[0].areas[0].maquinas[0].tarefas.map(t=>({id:t.id, riscos:t.riscos.map(r=>r.id)}))`, A.ctx);
    const antes = tarefas();
    checar("o risco comeca so na tarefa 0", antes[0].riscos.includes(idRisco) && !antes[1].riscos.includes(idRisco));

    /* Injeta na nuvem a copia orfa, debaixo da OUTRA tarefa -- exatamente o
       estrago historico encontrado na nuvem real (mover risco de tarefa nunca
       limpava a copia antiga). O CONTEUDO PRECISA TER TAMANHO DIFERENTE do
       original: uma copia byte-a-byte identica já é resolvida sozinha pelo
       cache `arquivoJaExistente` (que existia antes de qualquer coisa de
       hoje) — isso mascararia se a correção nova importa. Na nuvem real do
       usuário as duas cópias tinham tamanhos diferentes (615 B x 1299 B,
       uma edição depois da duplicação), e é essa diferença de tamanho que
       faz a classificação insistir em propor de novo a cada ciclo. */
    const arqOriginal = [...nuvem.arquivos.keys()].find(c => c.endsWith("risco_" + idRisco + ".json"));
    checar("achou o arquivo original na nuvem para copiar", !!arqOriginal, arqOriginal);
    const dadosOrfao = { ...riscoOriginal, descricao: "desc " + "x".repeat(200), atualizadoEm: 1750000000000 - 5000 };
    const conteudoOrfao = JSON.stringify(dadosOrfao, null, 0);
    const caminhoOrfao = arqOriginal.replace(/Tarefa 0 \([a-z0-9]+\)/, m => {
      const idTarefa1 = tarefas()[1].id;
      return m.replace(/\([a-z0-9]+\)$/, "(" + idTarefa1.slice(-6) + ")").replace("Tarefa 0", "Tarefa 1");
    });
    checar("o caminho orfao aponta para a OUTRA tarefa", caminhoOrfao !== arqOriginal && caminhoOrfao.includes("Tarefa 1"),
      caminhoOrfao);
    checar("a copia orfa tem tamanho DIFERENTE do original (senao o cache de conteudo ja resolveria sozinho)",
      conteudoOrfao.length !== nuvem.arquivos.get(arqOriginal).texto.length);
    nuvem.put(caminhoOrfao, conteudoOrfao);

    const r1 = await rodarAteParar(A, 10);
    checar("A converge (para de transferir) mesmo com a copia orfa na nuvem", r1.parou,
      "transferencias por ciclo: " + r1.hist.join(", "));

    const depois = tarefas();
    const numTarefasComRisco = depois.filter(t => t.riscos.includes(idRisco)).length;
    checar("o risco vive em EXATAMENTE uma tarefa (nao duplicou, nao sumiu)",
      numTarefasComRisco === 1, "vive em " + numTarefasComRisco + " tarefa(s): " + JSON.stringify(depois));

    /* Aparelho NOVO, sincronizando do zero com a nuvem (que ainda tem as DUAS
       copias): tambem nao pode entrar em loop, nem duplicar o risco. */
    const B = novoAparelho("B", nuvem);
    const r2 = await rodarAteParar(B, 12);
    checar("aparelho NOVO tambem converge", r2.parou, "B: " + r2.hist.join(", "));
    const riscosB = vm.runInContext(
      `STATE.projetosSimples[0].areas[0].maquinas[0].tarefas.flatMap(t=>t.riscos.map(r=>r.id))`, B.ctx);
    checar("aparelho NOVO recebeu o risco UMA vez so", riscosB.filter(id=>id===idRisco).length === 1,
      riscosB.join(","));

    /* Depois de tudo assentado, ciclos alternados sem editar nada = zero
       trafego -- o mesmo padrao cobrado em todos os ensaios de convergencia. */
    let semTrafego = 0;
    for(let i=0;i<3;i++){ semTrafego += (await ciclo(A)).transferencias; semTrafego += (await ciclo(B)).transferencias; }
    checar("SEM VAIVEM: 6 ciclos alternados sem editar = zero trafego", semTrafego === 0,
      "ainda transferiu " + semTrafego);
  }

  console.log("\n" + L + "\nENSAIO 26 - maquina com o MESMO id em duas posicoes da arvore LOCAL nao apaga a foto boa no envio\n" + L);
  {
    /* Achado investigando o sumico de fotos do Abacus 02 e da Cuba Lumialza 100
       em 26/08/2026, depois de a correcao do dia anterior ja estar publicada.
       Causa: duas copias da MESMA maquina (mesmo id) na arvore LOCAL -- resto
       de uma duplicacao historica ainda nao resolvida por "Juntar duplicatas"
       -- dividem A MESMA entrada no mapa de assinaturas (indexado por id). Ao
       processar a copia mais recente (que nao tem a foto), o envio automatico
       ve o endereco da copia BOA como "endereco antigo" desse id e apaga o
       arquivo dela na nuvem -- fotos inclusas -- mesmo sem ninguem ter
       apertado nada alem de "Sincronizar agora". A correcao: enquanto o mesmo
       id existir duas vezes na arvore, nenhuma das copias sobe naquele ciclo. */
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(2, 1, 1, 0, false)]; // 2 areas, cada uma com 1 maquina
    const idMaquina = vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].id`, A.ctx);
    vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].fotoGeral = "data:image/jpeg;base64,"+"F".repeat(300);
      STATE.projetosSimples[0].areas[0].maquinas[0].atualizadoEm = 1750000000000;`, A.ctx);
    await rodarAteParar(A, 8);

    const arqFotoOriginal = [...nuvem.arquivos.keys()].find(c =>
      c.endsWith("fotos__maquina.json") && c.includes(idMaquina.slice(-6)));
    checar("a maquina subiu com a foto (pacote fotos__maquina.json na nuvem)", !!arqFotoOriginal, arqFotoOriginal);
    const conteudoFotoOriginal = arqFotoOriginal ? nuvem.arquivos.get(arqFotoOriginal).texto : null;

    /* Reproduz o estrago: a MESMA maquina (mesmo id) passa a existir tambem
       na OUTRA area, ja convergida antes -- sem foto, com carimbo mais novo
       (e por isso "vence" num eventual merge por ultima edicao). Nao cria
       nenhum item novo alem da propria duplicata: a area 1 ja tinha subido
       na convergencia inicial, entao nada aqui deveria gerar trafego novo
       que nao seja o da propria duplicata. */
    vm.runInContext(`STATE.projetosSimples[0].areas[1].maquinas.push({
      id:"${idMaquina}", nome:"Maquina 0", tarefas:[], criadoEm:1750000000000, atualizadoEm:1750000005000
    })`, A.ctx);

    const dupsAntes = vm.runInContext("sincDuplicatasNaArvore()", A.ctx);
    checar("o cenario montou uma duplicata de verdade (mesmo id em duas posicoes)",
      dupsAntes.some(g=>g.tipo==="maquina" && g.id===idMaquina), JSON.stringify(dupsAntes.map(g=>g.tipo+":"+g.id)));

    /* PROVA DE QUE O TESTE TESTA ALGO DE VERDADE: rodando a MESMA reproducao
       contra a versao do envio SEM a trava nova (a linha que ignora id
       duplicado removida do texto extraido), a foto boa e apagada da nuvem.
       Isola só esta chamada — não mexe no restante do ensaio. */
    {
      const nuvemSemCorrecao = novaNuvem();
      for(const [c,a] of nuvem.arquivos) nuvemSemCorrecao.arquivos.set(c, {tamanho:a.tamanho, texto:a.texto});
      const B = novoAparelho("B", nuvemSemCorrecao);
      B.ctx.STATE.projetosSimples = JSON.parse(JSON.stringify(A.ctx.STATE.projetosSimples));
      B.ctx.STATE.oneDriveAssinaturasSimples = JSON.parse(JSON.stringify(A.ctx.STATE.oneDriveAssinaturasSimples));
      const fonteSemTrava = funcao("onedriveSincronizarModulo")
        .replace("if(idsDuplicadosNaArvore.has(it.id)) return false;\n    ", "");
      checar("a fonte SEM a trava realmente ficou sem a linha da trava",
        fonteSemTrava.indexOf("idsDuplicadosNaArvore.has(it.id)) return false") < 0);
      vm.runInContext(fonteSemTrava.replace("function onedriveSincronizarModulo", "function onedriveSincronizarModulo_SEM_CORRECAO"), B.ctx);
      await vm.runInContext(`onedriveSincronizarModulo_SEM_CORRECAO("Simplificado", listarItensSincronizaveisSimples, __assinaturasOneDriveSimples, null)`, B.ctx);
      const sumiuSemCorrecao = arqFotoOriginal && !nuvemSemCorrecao.arquivos.has(arqFotoOriginal);
      checar("SEM A CORRECAO: a mesma duplicata apaga a foto boa da nuvem (prova que o ensaio testa algo real)",
        sumiuSemCorrecao, arqFotoOriginal + " ainda existe? " + nuvemSemCorrecao.arquivos.has(arqFotoOriginal||""));
    }

    const r = await ciclo(A); // UM ciclo de sincronizacao real, com a duplicata presente
    checar("O CASO REAL: com a duplicata presente, o envio automatico nao mexe em nada",
      r.transferencias === 0, "transferencias=" + r.transferencias);
    const fotoAindaNaNuvem = arqFotoOriginal && nuvem.arquivos.has(arqFotoOriginal)
      && nuvem.arquivos.get(arqFotoOriginal).texto === conteudoFotoOriginal;
    checar("a foto boa que ja estava na nuvem continua exatamente igual",
      fotoAindaNaNuvem, arqFotoOriginal + " -> " + (nuvem.arquivos.has(arqFotoOriginal||"") ? "existe" : "SUMIU"));

    /* O caminho correto de resolver a duplicata e "Juntar duplicatas" -- e o
       merge manual precisa preservar a foto da copia descartada, mesmo ela
       nao sendo a "vencedora" por ultima edicao. */
    A.ctx.__grupoDup = vm.runInContext("sincDuplicatasNaArvore().find(g=>g.tipo==='maquina')", A.ctx);
    const removidas = vm.runInContext("sincJuntarDuplicata(__grupoDup)", A.ctx);
    checar("juntar duplicatas removeu a copia extra", removidas === 1, "removidas=" + removidas);
    const fotoSobrevivente = vm.runInContext(
      `(()=>{ let achou=null; STATE.projetosSimples[0].areas.forEach(a=>a.maquinas.forEach(m=>{ if(m.id==="${idMaquina}") achou=m.fotoGeral; })); return achou; })()`, A.ctx);
    checar("a foto sobreviveu ao merge de duplicatas, mesmo a copia sem foto tendo sido editada por ultimo",
      typeof fotoSobrevivente === "string" && fotoSobrevivente.startsWith("data:image"), String(fotoSobrevivente).slice(0,30));
  }

  console.log("\n" + L + "\nENSAIO 27 - recuperar foto perdida direto da nuvem (quando o ponto de restauracao local ja nao tem)\n" + L);
  {
    /* Complementa a recuperacao pelos pontos de restauracao (que so olha
       ESTE aparelho): quando nem os pontos tem mais a foto, mas a nuvem,
       se ninguem regravou o arquivo por cima, ainda tem, este e o unico
       caminho que sobra. So mexe em item marcado __fotosPerdidas -- e so
       preenche o que estiver vazio, nunca substitui foto boa. */
    const nuvem = novaNuvem();
    const A = novoAparelho("A", nuvem);
    A.ctx.STATE.projetosSimples = [arvoreExemplo(1, 1, 1, 2, true)]; // 2 riscos, cada um com foto
    await rodarAteParar(A, 8);

    const riscos = () => vm.runInContext(
      `STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos`, A.ctx);
    const idBoa = riscos()[0].id, idPerdidaDeVerdade = riscos()[1].id;

    /* Risco 0: simula o dano local (a foto sumiu do IndexedDB deste
       aparelho, exatamente como marcarItensComFotoPerdida faria) -- MAS a
       nuvem, que ninguem tocou, ainda tem o pacote de fotos intacto. */
    vm.runInContext(`(()=>{ const r = STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.find(x=>x.id==="${idBoa}");
      r.foto = null; r.${'__fotosPerdidas'} = true; })()`, A.ctx);
    const existiaNaNuvemAntes = [...nuvem.arquivos.keys()].some(c => c.endsWith("fotos_risco_" + idBoa + ".json"));
    checar("o cenario confirma que a nuvem ainda tem o pacote de fotos deste risco", existiaNaNuvemAntes);

    /* Risco 1: dano local IGUAL, mas aqui a nuvem tambem nao tem mais nada
       -- e o caso de perda de verdade, sem volta por nenhuma das duas vias. */
    vm.runInContext(`(()=>{ const r = STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.find(x=>x.id==="${idPerdidaDeVerdade}");
      r.foto = null; r.${'__fotosPerdidas'} = true; })()`, A.ctx);
    const caminhoPerdidaDeVerdade = [...nuvem.arquivos.keys()].find(c => c.endsWith("fotos_risco_" + idPerdidaDeVerdade + ".json"));
    if(caminhoPerdidaDeVerdade) nuvem.del(caminhoPerdidaDeVerdade);

    const r = await vm.runInContext("recuperarFotosPerdidasDaNuvem(null)", A.ctx);
    checar("encontrou os dois itens marcados como danificados", r.itens === 2, "itens=" + r.itens);
    checar("recuperou exatamente o que a nuvem ainda tinha", r.recuperados === 1, "recuperados=" + r.recuperados);
    checar("contou o outro como sem nada na nuvem (perda de verdade)", r.semNadaNaNuvem === 1, "semNadaNaNuvem=" + r.semNadaNaNuvem);

    const depois = riscos();
    const boaDepois = depois.find(x=>x.id===idBoa);
    const perdidaDepois = depois.find(x=>x.id===idPerdidaDeVerdade);
    checar("O CASO REAL: a foto recuperavel voltou de verdade", typeof boaDepois.foto === "string" && boaDepois.foto.startsWith("data:image"));
    checar("a marca de dano saiu do item recuperado", !boaDepois.__fotosPerdidas);
    checar("o item SEM nada na nuvem continua sem foto (nada inventado)", !perdidaDepois.foto);
    checar("a marca de dano continua no item sem nada na nuvem -- protege contra reenvio apagar a ultima chance",
      !!perdidaDepois.__fotosPerdidas);

    /* Achado em campo: com 580 itens marcados, um por vez era lento demais e
       uma interrupcao no meio (tela apagando) parecia travar sem terminar.
       Prova que agora baixa VARIOS ao mesmo tempo, nao um por um. */
    {
      const nuvem2 = novaNuvem();
      const A2 = novoAparelho("A2", nuvem2);
      A2.ctx.STATE.projetosSimples = [arvoreExemplo(1, 1, 1, 6, true)];
      await rodarAteParar(A2, 8);
      vm.runInContext(`STATE.projetosSimples[0].areas[0].maquinas[0].tarefas[0].riscos.forEach(r=>{ r.foto=null; r.__fotosPerdidas=true; })`, A2.ctx);
      let emAndamento = 0, maxSimultaneo = 0;
      A2.ctx.onedriveBaixarTexto = async (c) => {
        emAndamento++; maxSimultaneo = Math.max(maxSimultaneo, emAndamento);
        await new Promise(resolve=>setTimeout(resolve, 15));
        emAndamento--;
        return nuvem2.get(c);
      };
      const r2 = await vm.runInContext("recuperarFotosPerdidasDaNuvem(null)", A2.ctx);
      checar("baixa VARIOS itens ao mesmo tempo, nao um por um (mais rapido num projeto grande)",
        maxSimultaneo > 1, "maximo simultaneo=" + maxSimultaneo);
      checar("mesmo em paralelo, recupera todos os itens corretamente", r2.recuperados === 6, "recuperados=" + r2.recuperados);
    }
  }

  console.log("\n" + L);
  console.log(falhas ? "ENSAIOS: " + falhas + " FALHA(S)" : "ENSAIOS: TODOS OK");
  console.log(L + "\n");
  process.exit(falhas?1:0);
})().catch(e=>{ console.error("ERRO NO BANCO:", e); process.exit(2); });
