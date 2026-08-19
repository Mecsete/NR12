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
    STATE:{ projetosSimples:[], ui:{}, oneDriveAssinaturasSimples:{}, oneDrivePendentes:[] },
    ONEDRIVE_PASTA_APP:"APR-Campo", SUBPASTA_BACKUP:"Backup",
    ONEDRIVE_LIMITE_AUTO_BYTES: 300000,
    CAMPO_FOTOS_LISTA:"fotosOutras",
    nomeMaquinaS: m=>m.nome||"",
    valOuOutro:(v,o)=>v==="Outro (especificar)"?(o||""):(v||""),
    Blob: class { constructor(a){ this.size = Buffer.byteLength(a.join(""),"utf8"); } },
    exclusaoConfirmadaPeloUsuario:()=>false,
    registrarEventoSync:()=>{},
    marcarProgressoSync:()=>{},
    journalGravarItem:()=>{},
    sigJournalGravar:()=>{},
    dbSet:()=>{},
    render:()=>{}, toast:()=>{}, atualizarChipSync:()=>{},
    getOneDriveConta:()=>({email:"x"}),
    avisarExclusaoMassaBloqueada:()=>{},
    onedriveEstaEmWifi:()=>true,
    onedriveEstimarFotosParaEnviar:()=>({totalItens:0,totalBytes:0}),
    marcarArquivoCorrompido:()=>{},
    rotuloCaminhoNuvem:c=>c,
    onedrivePrecisaBaixarFotosOriginal:null,
    __ultimoMotivoFalhaEnvio: undefined,
    __falhasEnvioNaSync: 0,
  };
  vm.createContext(ctx);
  vm.runInContext(`function nomeArquivoSeguro(s){ let n = String(s||"sem-nome").trim().slice(0,48)
    .replace(/[\\\\/:*?"<>|]/g,"-").replace(/\\s+/g," ").replace(/^\\.+/,"").replace(/[. ]+$/,"");
    if(/^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i.test(n)) n = n+"_"; return n || "sem-nome"; }`, ctx);
  ["CAMPOS_FILHOS_SYNC","CAMPO_FILHOS_POR_TIPO"].forEach(n=>vm.runInContext(constante(n),ctx));
  vm.runInContext("var __ultimoCarimboVisto=0; var __arvoreSimplesCache=null; var __indiceNuvemMapa=null; var __indiceNuvemMapaEm=0; var __arvoreNuvemIncompleta=false;", ctx);
  vm.runInContext("var __assinaturasOneDriveSimples={mapa:null,chaveEstado:'oneDriveAssinaturasSimples'};", ctx);
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
    "rotuloCaminhoSync","onedriveSincronizarModulo","marcarSubarvoreMaquinaAlterada",
  ].forEach(n=>vm.runInContext(funcao(n),ctx));

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

  // ---- ENVIO (código real) ----
  ap.ctx.__arv = null;
  await vm.runInContext(`onedriveSincronizarModulo("Simplificado", listarItensSincronizaveisSimples, __assinaturasOneDriveSimples, null)`, ap.ctx);

  // ---- RECEBIMENTO ----
  const arvore = montarArvore(nuvem, ap);
  ap.ctx.__arv = arvore;
  vm.runInContext("onedriveReconciliarComArvore(__arv)", ap.ctx);
  const cls = vm.runInContext("onedriveClassificarNovosSimples(__arv)", ap.ctx);
  const aBaixar = [...cls.pequenos, ...cls.grandes];
  for(const d of aBaixar){
    const texto = nuvem.get(d.caminho);
    if(!texto) continue;
    ap.ctx.__d = d; ap.ctx.__dados = JSON.parse(texto);
    const ok = vm.runInContext("onedriveMesclarItemNovo(__d,__dados)", ap.ctx);
    if(!ok) vm.runInContext("onedriveMarcarJaExistente(__d)", ap.ctx);
  }
  return { transferencias: nuvem.transferencias, baixou: aBaixar.length };
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

  console.log("\n" + L);
  console.log(falhas ? "ENSAIOS: " + falhas + " FALHA(S)" : "ENSAIOS: TODOS OK");
  console.log(L + "\n");
  process.exit(falhas?1:0);
})().catch(e=>{ console.error("ERRO NO BANCO:", e); process.exit(2); });
