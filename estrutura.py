import re, sys

# Uso: python3 estrutura.py [original.html] [novo.html]
# Sem argumentos, compara original.html x index.html na pasta atual.
caminho_orig = sys.argv[1] if len(sys.argv) > 1 else "original.html"
caminho_novo = sys.argv[2] if len(sys.argv) > 2 else "index.html"
orig = open(caminho_orig, encoding="utf-8").read()
novo = open(caminho_novo, encoding="utf-8").read()

falhas = 0
def chk(nome, cond, detalhe=""):
    global falhas
    if not cond:
        falhas += 1
    print(("  ok   " if cond else "  ERRO ") + nome + ((" -> " + detalhe) if detalhe and not cond else ""))

print("=== 3. ARQUITETURA DE FOTOS (CAMADA_FOTOS) ===")
for marca in ["idbfoto:", "foto:", "CAMADA_FOTOS"]:
    a, b = orig.count(marca), novo.count(marca)
    chk("ocorrencias de '%s' inalteradas (%d)" % (marca, a), a == b, "orig=%d novo=%d" % (a, b))

print("\n=== 4. MOTOR DE SINCRONIZACAO ===")
# oneDriveDeltaFila ganhou +1 ocorrencia de proposito: o diagnostico da
# sincronizacao LE a fila para mostrar o que esta esperando. E leitura pura —
# a checagem seguinte prova que o diagnostico nao escreve nada.
_extra = {"oneDriveDeltaFila": 1}
for marca in ["oneDriveDeltaFila", "lapide", "tombstone", "exclusoesConfirmadas", "__backupV2AplicarLinha"]:
    a, b = orig.count(marca) + _extra.get(marca, 0), novo.count(marca)
    chk("'%s' inalterado (%d)" % (marca, a), a == b, "orig+extra=%d novo=%d" % (a, b))

# O numero cresceu porque esta entrega mexeu de proposito nos carimbos:
# subarvore de maquina/tarefa ao mover, equipe, inspetor no projeto e o proprio
# relogio logico. O que NAO pode acontecer e um carimbo continuar saindo direto
# de Date.now() — e isso que a checagem seguinte garante.
chk("nenhum carimbo de 'atualizadoEm' usa Date.now() direto",
    len(re.findall(r'atualizadoEm\s*=\s*Date\.now\(\)', novo)) == 0,
    "ainda restam %d" % len(re.findall(r'atualizadoEm\s*=\s*Date\.now\(\)', novo)))
chk("os carimbos do laudo continuam existindo, agora via agoraSync",
    novo.count("item.risco.atualizadoEm = agoraSync();") == 3
    and novo.count("item.maquina.atualizadoEm = agoraSync();") == 2)

print("\n=== 5. NENHUM SPREAD EM ARRAY GRANDE INTRODUZIDO ===")
padrao = re.compile(r'Math\.(?:max|min)\s*\(\s*[^)]*\.\.\.[^)]*\)')
a, b = len(padrao.findall(orig)), len(padrao.findall(novo))
chk("nenhum spread novo em Math.max/min (pre-existentes: %d)" % a, a == b, "orig=%d novo=%d" % (a, b))

print("\n=== 6. NAVEGACAO E TELAS NOVAS ===")
for marca, n in [('body = screenSimplesLaudo();', 1),
                 ('body = screenSimplesLaudoItem();', 1),
                 ("onclick=\"App.go('simples-laudo')\"", 4),
                 ('function screenSimplesLaudo(', 1),
                 ('function screenSimplesLaudoItem(', 1),
                 ('App.trocarModulo()', orig.count('App.trocarModulo()')),
                 ('function laudoAbaRevisao(', 1),
                 ('function laudoAbaAreas(', 1),
                 ('function laudoAbaExportar(', 1),
                 ('function laudoBlocoHRN(', 1),
                 ('function laudoFotosDoItem(', 1),
                 ('function laudoCandidatosCopia(', 1),
                 ('function laudoMiniatura(', 1),
                 ('function laudoBlocoPlaqueta(', 1),
                 ('function laudoFotoValida(', 1),
                 ('laudo-th', 13),
                 ('function ajustarTopoLaudo(', 1),
                 ('class="laudo-topo"', 1),
                 ('function laudoListaAtual(', 1),
                 ('function laudoOpcoesEquipamento(', 1),
                 ('function laudoOpcoesTarefa(', 1),
                 ('function rotacionarDataUrl(', 1),
                 ('function laudoGravarFoto(', 1),
                 ('laudo-areas-grid', 5),
                 ('function laudoAbaProjeto(', 1),
                 ('function laudoProjetosDoEscopo(', 1),
                 ('function laudoOpcoesArea(', 1),
                 ('laudo-proj-grid', 4),
                 ('laudoSetFiltroArea', 2),
                 ('function montarDescricaoRisco(', 1),
                 ('function sugerirGPDPorSelecao(', 1),
                 ('function blocoMontadorRiscoHtml(', 1),
                 ('function riscoArtigoEm(', 1),
                 ('const BIBLIOTECA_MEDIDAS', 1),
                 ('function medidaTextoProposto(', 1),
                 ('function medidaTextoExistente(', 1),
                 ('function sugerirMedidaPorRisco(', 1),
                 ('blocoMedidaExistenteHtml(r)', 2),
                 ('blocoMedidaPropostaHtml(r)', 2),
                 ('laudoBlocoMedidaHtml(item)', 2),
                 ('const PLR_GRAFICO', 1),
                 ('function plrExigido(', 1),
                 ('function blocoPLrHtml(', 1),
                 ('blocoPLrHtml(r, "draft")', 1),
                 ('blocoPLrHtml(item.risco, "laudo")', 1),
                 ('${blocoMontadorRiscoHtml(r)}', 1),
                 ('screen-laudo', 10),
                 ('<span>Laudo</span>', 1),
                 ('<b>Trocar de módulo</b>', 1)]:
    c = novo.count(marca)
    chk("'%s' x%d" % (marca[:46], n), c == n, "achei %d" % c)

print("\n=== 6b. REFERENCIAS DE COLUNA SAIRAM DA INTERFACE ===")
import re as _re
for marca in ["Coluna ${def.col} da Base Completa", "Colunas V a AA da Base Completa",
              "Aba Inventário do Excel", "coluna ${colDuv}", "(coluna AL)", "colunas AQ a AT"]:
    chk("sem '%s' na tela" % marca[:34], novo.count(marca) == 0)

print("\n=== 7. COLUNAS AL-AT CONTINUAM MAPEADAS ===")
for col in ["AL", "AM", "AN", "AO", "AP", "AQ", "AR", "AS", "AT"]:
    marca = 'xlsmCellTexto(`%s${rowNum}`' % col
    chk("coluna %s escrita na Base Completa" % col, novo.count(marca) == 1, "achei %d" % novo.count(marca))

chk("botao 'Módulo' saiu da barra inferior", novo.count("<span>Módulo</span>") == 0)

print("\n=== 8. IDs PERMANENTES AU/AV PRESERVADOS ===")
chk("AU = ID_Risco", novo.count('xlsmCellTexto(`AU${rowNum}`') == 1)
chk("AV = ID_Maquina", novo.count('xlsmCellTexto(`AV${rowNum}`') == 1)

print("\n=== 9. SELO DE VERSAO ===")
chk("APP_BUILD atualizado 2x", novo.count('"07/08/2026 10:30"') == 2, "achei %d" % novo.count('"07/08/2026 10:30"'))
chk("nenhum resquicio de build antigo",
    all(novo.count('"%s"' % b) == 0 for b in ["29/07/2026 08:44","30/07/2026 16:20","30/07/2026 18:05","30/07/2026 19:40","30/07/2026 21:10","31/07/2026 09:30","31/07/2026 11:20","31/07/2026 15:40","31/07/2026 19:15","31/07/2026 22:30","31/07/2026 23:55","03/08/2026 17:20","03/08/2026 20:35","05/08/2026 17:30","05/08/2026 19:05","05/08/2026 21:40","05/08/2026 22:30","06/08/2026 19:30","06/08/2026 20:45","07/08/2026 09:40"]))

print("\n=== 10. CRESCIMENTO DO ARQUIVO ===")
# ATENCAO ao ler este numero: original.html e a versao publicada ANTES da
# Central do Laudo, e o delta e CUMULATIVO — Central do Laudo (~185 KB) mais
# as entregas de sincronizacao, equipe, IA compartilhada e aprendizado com
# laudos aprovados (~42 KB). O teto so existe para pegar acidente grosseiro
# (arquivo duplicado, bloco colado duas vezes), nao para medir uma entrega.
d = len(novo) - len(orig)
chk("crescimento coerente com os novos modulos (%d bytes)" % d, 20000 < d < 320000, "delta=%d" % d)
chk("nada foi removido do original por engano",
    all(novo.count(m) >= 1 for m in ["exportarMasterXLSXFotos", "gerarBytesXlsmCorteva", "montarItensInventario", "gerarBytesDocxSimples"]))

print("\n=== 11. O BLOCO DE IMPRESSAO E MESMO REMOVIVEL ===")
import subprocess, tempfile, os
INI = "\u2588\u2588  IN\u00cdCIO DO M\u00d3DULO DE IMPRESS\u00c3O DO LAUDO \u2014 BLOCO REMOV\u00cdVEL  \u2588\u2588"
FIM = "\u2588\u2588  FIM DO M\u00d3DULO DE IMPRESS\u00c3O DO LAUDO  \u2588\u2588"
i, f = novo.find(INI), novo.find(FIM)
chk("as duas marcas existem", i > 0 and f > i)
ok_remocao = False
if i > 0 and f > i:
    ini = novo.rfind("/*", 0, i)
    fim = novo.find("*/", f) + 2
    sem = novo[:ini] + novo[fim:]
    chk("o bloco tem tamanho coerente (%d bytes)" % (fim - ini), 20000 < (fim - ini) < 90000)
    import re as _re2
    blocos = _re2.findall(r'<script\b([^>]*)>([\s\S]*?)</script>', sem, _re2.I)
    erros = 0
    for attrs, corpo in blocos:
        if "src=" in attrs.lower() or "application/json" in attrs.lower():
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
            t.write(corpo); tmp = t.name
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
        if r.returncode != 0:
            erros += 1
            print("     ", r.stderr[:200])
        os.unlink(tmp)
    chk("apagando o bloco, os %d scripts continuam validos" % len(blocos), erros == 0)
    ok_remocao = (erros == 0)
    for nome in ["telaImprimir", "lpSetArea", "lpImprimir", "montarDoc", "blocoCapa"]:
        chk("'%s' nao e citado fora do bloco" % nome, sem.count(nome) == 0)
open("remocao_ok.txt", "w").write("OK" if ok_remocao else "FALHOU")

# ---------------------------------------------------------------------------
# Checagens desta entrega (03/08/2026): nova ordem das abas do Laudo e cadastro
# rapido de inspetor na aba Projeto. Numeros calibrados para ESTA mudanca.
# ---------------------------------------------------------------------------
print("\n=== 12. ORDEM DAS ABAS DA CENTRAL DO LAUDO ===")
import re as _re3
m_abas = _re3.search(r'const LAUDO_ABAS = \[(.*?)\];', novo, _re3.S)
chk("LAUDO_ABAS continua sendo declarada uma unica vez", novo.count("const LAUDO_ABAS = [") == 1)
if m_abas:
    ordem = _re3.findall(r'k:"([a-z]+)"', m_abas.group(1))
    chk("ordem = projeto, escopo, ia, revisao, exportar",
        ordem == ["projeto", "escopo", "ia", "revisao", "exportar"], "achei %s" % ordem)
chk("a aba Imprimir so existe dentro do bloco removivel",
    novo.count('LAUDO_ABAS.push({ k:"imprimir", rot:"Imprimir" });') == 1
    and novo.count('k:"imprimir"') == 1)
chk("a aba de abertura continua sendo Revisao",
    novo.count('STATE.ui.laudoAba = "revisao";\n  return STATE.ui.laudoAba;') == 1)
chk("nenhuma aba foi perdida no caminho",
    all(novo.count('rot:"%s"' % r) == 1 for r in ["Projeto", "Áreas", "IA", "Revisão", "Exportar", "Imprimir"]))

print("\n=== 13. CADASTRO RAPIDO DE INSPETOR ===")
for marca, n in [('let __inspetorDraft = null;', 1),
                 ('function laudoModalInspetorHtml(', 1),
                 ('App.laudoAbrirInspetor(', 1),
                 ('laudoAbrirInspetor(pid){', 1),
                 ('laudoSetInspetorDraft(campo, v){', 1),
                 ('laudoFecharInspetor(){', 1),
                 ('laudoSalvarInspetor(){', 1)]:
    chk("'%s' x%d" % (marca, n), novo.count(marca) == n, "achei %d" % novo.count(marca))
chk("o rascunho do modal NAO e gravado no STATE", novo.count("STATE.ui.inspetorDraft") == 0)
chk("o modal reaproveita getUsuariosInspetores (mesma lista de Configuracoes)",
    novo.count("getUsuariosInspetores().push(novo);") == 1)
chk("salvar sem nome e bloqueado",
    novo.count('if(!nome){ toast("Informe o nome do inspetor", false); return; }') == 1)
chk("o projeto e carimbado ao receber o inspetor escolhido (para sincronizar)",
    novo.count("if(p){ p.inspetorId = alvoId; gravarInspetorNoProjeto(p); p.atualizadoEm = agoraSync(); }") == 1)
chk("a lista de inspetores continua vindo de um unico lugar",
    novo.count("function getUsuariosInspetores(") == 1)

# ---------------------------------------------------------------------------
print("\n=== 14. CARIMBO DE TEMPO A PROVA DE RELOGIO ERRADO ===")
for marca, n in [("function agoraSync(", 1), ("function registrarCarimboVisto(", 1),
                 ("function __carregarUltimoCarimbo(", 1), ("let __ultimoCarimboVisto = 0;", 1)]:
    chk("'%s' x%d" % (marca, n), novo.count(marca) == n, "achei %d" % novo.count(marca))
chk("o carimbo nunca anda para tras nem repete",
    novo.count("const ts = Math.max(Date.now(), __ultimoCarimboVisto + 1);") == 1)
chk("o relogio logico sobrevive a fechar o app (fica no STATE)",
    novo.count("STATE.ui.ultimoCarimboVisto = ts;") == 2)
chk("carimbo vindo da nuvem alimenta o relogio logico",
    novo.count("registrarCarimboVisto(dados.atualizadoEm)") == 1)
chk("a protecao que ja existia na config de IA nao foi mexida",
    novo.count("STATE.ui.iaSyncEm = Math.max(Date.now(), anterior + 1);") == 1)

print("\n=== 15. ITEM MOVIDO NAO DUPLICA MAIS ===")
for marca, n in [("function __listasIrmasDe(", 1), ("function __moverItemEntrePais(", 1),
                 ("function marcarSubarvoreMaquinaAlterada(", 1), ("function marcarSubarvoreTarefaAlterada(", 1)]:
    chk("'%s' x%d" % (marca, n), novo.count(marca) == n, "achei %d" % novo.count(marca))
chk("as QUATRO camadas usam o mesmo tratamento de item movido",
    all(novo.count('__moverItemEntrePais("%s"' % t) == 1 for t in ["area", "maquina", "tarefa", "risco"]))
chk("o laco antigo, so de area, foi mesmo substituido",
    novo.count("for(const outro of STATE.projetosSimples){") == 0)
chk("mover no app carimba a subarvore (senao a mudanca nunca sai daqui)",
    novo.count("marcarSubarvoreMaquinaAlterada(m); // sem isto a mudança nunca sai deste aparelho") == 1
    and novo.count("marcarSubarvoreTarefaAlterada(t); // sem isto a mudança nunca sai deste aparelho") == 1
    and novo.count("r.atualizadoEm = agoraSync(); // sem isto a mudança nunca sai deste aparelho") == 1)
chk("a limpeza da copia antiga na nuvem continua intacta",
    novo.count("MUDANÇA DE ENDEREÇO") == orig.count("MUDANÇA DE ENDEREÇO"))
chk("o anti-eco do download continua intacto",
    novo.count("function onedriveRegistrarAssinaturaDeDownload(") == 1
    and novo.count("onedriveRegistrarAssinaturaDeDownload(descritor, dados);") == orig.count("onedriveRegistrarAssinaturaDeDownload(descritor, dados);"))

print("\n=== 16. EQUIPE COMPARTILHADA ENTRE APARELHOS ===")
for marca, n in [("const INSPETORES_PADRAO", 1), ("function getInspetoresRemovidos(", 1),
                 ("function inspetorDoProjeto(", 1), ("function gravarInspetorNoProjeto(", 1),
                 ("function montarPacoteEquipe(", 1), ("function aplicarPacoteEquipe(", 1),
                 ("async function onedriveSincronizarEquipe(", 1), ("function marcarEquipeAlterada(", 1)]:
    chk("'%s' x%d" % (marca, n), novo.count(marca) == n, "achei %d" % novo.count(marca))
chk("os dois inspetores padrao estao la, com id FIXO",
    novo.count('id:"insp-daniel-costa-goncalves"') == 1
    and novo.count('id:"insp-luiz-hermelino-araujo"') == 1
    and novo.count('{ id:uid(), nome:"Daniel Costa Gonçalves"') == 0)
chk("a equipe entra no ciclo automatico E na sincronizacao manual",
    novo.count("await onedriveSincronizarEquipe(!!onProgresso)") == 1
    and novo.count("await onedriveSincronizarEquipe(true)") == 1)
chk("usa a mesma pasta Config ja usada pela IA (nao inventa outra)",
    novo.count('const SUBPASTA_CONFIG_EQUIPE = SUBPASTA_BACKUP + "/Config";') == 1)
chk("a config de IA continua sincronizando como antes",
    novo.count("async function onedriveSincronizarConfigIA(") == 1
    and novo.count("await onedriveSincronizarConfigIA(") == orig.count("await onedriveSincronizarConfigIA("))
chk("a capa do laudo usa a reserva gravada no projeto",
    novo.count("const insp = inspetorDoProjeto(proj);") == 1
    and novo.count("getUsuariosInspetores().find(u=> u.id === proj.inspetorId)") == 0)
chk("remocao de inspetor deixa lapide (senao ele volta do outro aparelho)",
    novo.count("getInspetoresRemovidos()[d.uid] = agoraSync();") == 1
    and novo.count("getInspetoresRemovidos()[id] = agoraSync();") == 1)

print("\n=== 17. CONFIG DE IA MESCLADA POR UNIAO ===")
for marca, n in [("function getNormasRemovidas(", 1), ("function getPromptsEm(", 1),
                 ("function marcarPromptAlterado(", 1), ("function marcarChaveIAAlterada(", 1)]:
    chk("'%s' x%d" % (marca, n), novo.count(marca) == n, "achei %d" % novo.count(marca))
# apiKeyEm passou a vir de getApiKeyEm() (migracao da chave que ja existia).
chk("o pacote de IA leva carimbo por parte",
    all(novo.count(m) == 1 for m in ["apiKeyEm: getApiKeyEm(),",
                                     "promptsEm: { ...getPromptsEm() }",
                                     "normasRemovidas: { ...getNormasRemovidas() }"]))
# 2 = equipe (entrega anterior) + IA (esta entrega): as duas mesclagens por
# uniao usam exatamente o mesmo contrato de retorno.
chk("aplicarPacoteIA devolve {mudou, faltaNoRemoto} (nao mais booleano)",
    novo.count("return { mudou, faltaNoRemoto };") == 2
    and novo.count("if(Array.isArray(pacote.normas)) STATE.ui.normasIA = pacote.normas.filter(n=>n && n.texto);") == 0)
chk("a substituicao em bloco das instrucoes foi removida",
    novo.count("c.prompts = { ...IA_PROMPTS_PADRAO, ...p.prompts };") == 0)
chk("cada ponto de edicao carimba a parte certa",
    novo.count("marcarPromptAlterado(tipo);") == 1
    and novo.count("marcarChaveIAAlterada();") == 2
    and novo.count("getNormasRemovidas()[id] = agoraSync();") == 1)
chk("norma nova nasce com carimbo proprio",
    novo.count("criadoEm:agora, atualizadoEm:agora") == 1)
chk("o download reenvia a uniao quando ha algo so aqui",
    novo.count("if(r.faltaNoRemoto) marcarIAAlterada();") == 1)
chk("a sincronizacao da equipe (entrega anterior) continua intacta",
    novo.count("async function onedriveSincronizarEquipe(") == 1
    and novo.count("if(r.faltaNoRemoto) marcarEquipeAlterada();") == 1)

print("\n=== 18. APRENDER COM OS LAUDOS APROVADOS ===")
for marca, n in [("function refsTokens(", 1), ("function refsConjunto(", 1), ("function refsSemelhanca(", 1),
                 ("function laudoExemplosAprovados(", 1), ("function laudoRefsParaItem(", 1),
                 ("function laudoBlocoReferencias(", 1), ("function laudoEntradaComReferencias(", 1),
                 ("function laudoUsaReferencias(", 1), ("const REFS_IA_MAX = 3;", 1)]:
    chk("'%s' x%d" % (marca, n), novo.count(marca) == n, "achei %d" % novo.count(marca))
chk("so campos aplicados/editados viram exemplo",
    novo.count('if(g.st !== "ok" && g.st !== "edit") return;') == 1)
chk("a trava de assunto existe (tarefa/maquina iguais nao bastam)",
    novo.count("if(simTexto === 0 && simRisco === 0) return;") == 1)
chk("o item nunca e exemplo de si mesmo",
    novo.count("if(ex.id === item.risco.id) return;") == 1)
chk("as 4 camadas de geracao usam as referencias",
    novo.count('laudoEntradaComReferencias(item, "escopo"') == 1
    and novo.count('laudoEntradaComReferencias(item, "tarefa"') == 1
    and novo.count("laudoEntradaComReferencias(item, campo, orig, exemplos[campo])") == 1
    and novo.count("const comRefs = laudoEntradaComReferencias(item, campo, entrada,") == 1)
chk("o indice e montado uma vez por leva (nao por item)",
    novo.count('risco:laudoExemplosAprovados("risco"),  solucao:laudoExemplosAprovados("solucao")') == 1)
chk("a origem fica gravada nos 4 campos",
    all(novo.count("if(patch.refs!==undefined) l.%sRefs = patch.refs;" % k) == 1
        for k in ["escopo", "tarefa", "risco", "solucao"]))
chk("a tela mostra de onde veio a sugestao",
    novo.count("<b>Baseada em:</b>") == 1 and novo.count("o laudo é assinado por você") == 1)
chk("o interruptor nasce ligado e viaja entre aparelhos",
    novo.count("if(c.usarReferencias===undefined) c.usarReferencias = true;") == 1
    and novo.count("usarReferencias:c.usarReferencias") == 1
    and novo.count('if(typeof p.usarReferencias === "boolean"') == 1)
_i = novo.find("const REFS_IA_MAX = 3;")
_bloco_refs = novo[_i:novo.find("function laudoGet(item, campo){", _i)]
chk("o motor de semelhanca nao chama nada de fora",
    all(m not in _bloco_refs for m in ["fetch(", "XMLHttpRequest", "http://", "https://"]))
chk("a regra de qual texto vai para o laudo NAO foi tocada",
    novo.count("function laudoTextoFinal(item, campo){") == 1
    and novo.count('if(g.st==="no") return laudoTextoOriginal(item, campo);') == 1)

print("\n=== 19. A DECISAO DO LAUDO SINCRONIZA ===")
chk("laudoSet carimba a entidade dona do campo",
    novo.count("function laudoCarimbarParaSincronizar(") == 1
    and novo.count("laudoCarimbarParaSincronizar(item, campo);") == 1)
chk("o carimbo usa o relogio logico",
    novo.count("if(alvo) alvo.atualizadoEm = agoraSync();") == 1)
chk("o carimbo esta DENTRO do laudoSet (nao espalhado nos botoes)",
    "laudoCarimbarParaSincronizar" in novo[novo.find("function laudoSet(item, campo, patch){"):
                                          novo.find("function laudoSet(item, campo, patch){") + 220])
chk("os pontos de decisao continuam existindo",
    all(novo.count(m) == 1 for m in ["laudoAplicar(rid, campo){", "laudoRecusar(rid, campo){",
                                     "laudoSalvarEdicao(rid, campo){", "laudoAprovarLinha(rid){"]))
chk("a regra de qual texto vai para o laudo NAO foi tocada (de novo)",
    novo.count('if(g.st==="no") return laudoTextoOriginal(item, campo);') == 1)

print("\n=== 20. RECUPERAR NORMAS SEM DESFAZER OS LAUDOS ===")
for marca, n in [("async function normasEmPontosDeRestauracao(", 1),
                 ("function recuperarNormasDoPonto(", 1),
                 ("async abrirRecuperarNormas(){", 1),
                 ("recuperarNormasDeIndice(i){", 1),
                 ("App.abrirRecuperarNormas()", 1)]:
    chk("'%s' x%d" % (marca, n), novo.count(marca) == n, "achei %d" % novo.count(marca))
_i = novo.find("function recuperarNormasDoPonto(")
_corpo = novo[_i:novo.find("function getNormasIA(", _i)]
chk("a recuperacao NAO encosta nos projetos",
    "projetosSimples" not in _corpo,
    "recuperarNormasDoPonto nao pode tocar em projetosSimples")
chk("a norma recuperada nasce carimbada (vence lapide e sincroniza)",
    "atualizadoEm: agoraSync()" in _corpo)
chk("lapide antiga nao barra a recuperacao",
    "delete removidas[n.id];" in _corpo)
chk("recuperar marca a IA para sincronizar",
    "marcarIAAlterada();" in novo[novo.find("recuperarNormasDeIndice(i){"):
                                  novo.find("recuperarNormasDeIndice(i){") + 520])
chk("restaurar ponto INTEIRO continua existindo e separado",
    novo.count("async function restaurarPontoDeRestauracao(") == 1)

print("\n=== 21. CONFIRMACAO, CHAVE COMPARTILHADA E DIAGNOSTICO ===")
_i = novo.find("restaurarPromptsIAPadrao(){")
_corpo = novo[_i:_i+700]
chk("restaurar instrucoes padrao pede confirmacao ANTES de apagar",
    "if(!confirm(" in _corpo
    and _corpo.find("if(!confirm(") < _corpo.find("getIAConfig().prompts = {...IA_PROMPTS_PADRAO}"))
chk("a confirmacao avisa que afeta os outros aparelhos", "TODOS os aparelhos" in _corpo)
chk("a chave que ja existia ganha carimbo e passa a viajar",
    novo.count("function getApiKeyEm(") == 1
    and novo.count("STATE.ui.apiKeyEm = getIAApiKey() ? agoraSync() : 0;") == 1
    and novo.count("apiKeyEm: getApiKeyEm(),") == 1
    and novo.count("const chaveLocalEm = getApiKeyEm();") == 1)
for marca in ["function onedriveDiagnosticoDados(", "function onedriveDiagnosticoTexto(",
              "function onedriveDiagnosticoInlineHtml(", "toggleDiagnosticoSync(){",
              "async copiarDiagnosticoSync(){", "${onedriveDiagnosticoInlineHtml()}"]:
    chk("'%s' x1" % marca, novo.count(marca) == 1, "achei %d" % novo.count(marca))
chk("o diagnostico explica o motivo de cada pendencia",
    all(m in novo for m in ["nunca subiu", "editado aqui depois do último envio",
                            "faltam as fotos (esperando Wi-Fi)", "arquivo ilegível na nuvem — ignorado"]))
_j = novo.find("function onedriveDiagnosticoDados(")
_diag = novo[_j:novo.find("function onedriveDiagnosticoTexto(", _j)]
_diag2 = _diag
chk("o diagnostico aparece na propria tela, sem janela sobreposta",
    novo.count("function onedriveDiagnosticoInlineHtml(") == 1
    and novo.count("${onedriveDiagnosticoInlineHtml()}") == 1
    and novo.count("toggleDiagnosticoSync(){") == 1)
chk("a versao antiga em janela foi REMOVIDA (sem caminho duplicado)",
    novo.count("onedriveDiagnosticoHtml") == 0 and novo.count("abrirDiagnosticoSync") == 0)
_k = novo.find("function onedriveDiagnosticoInlineHtml(")
_inline = novo[_k:novo.find("function onedriveStatusPendenteHtml(", _k)]
chk("erro ao montar o diagnostico e MOSTRADO, nao engolido",
    "}catch(e){" in _inline and "Não foi possível montar o diagnóstico." in _inline)
chk("o diagnostico le o log e separa as falhas com o motivo",
    all(m in _diag2 for m in ["STATE.logSincronizacao", "e.ok === false", "falha ao ENVIAR", "e.motivo"]))
chk("o diagnostico da o veredito travado x fila grande",
    novo.count("Nenhum envio concluiu.") == 1
    and novo.count("Os envios estão funcionando.") == 1)
chk("cada horario tem rotulo proprio (tentativa em x alterado em)",
    novo.count('quandoRot: "tentativa em"') == 1
    and novo.count('escapeHtml(x.quandoRot||"alterado em")') == 1)
chk("cada pendente mostra os DOIS carimbos (item x ultimo envio)",
    '"carimbo do item: "' in _diag2 and '" · registrado no último envio: "' in _diag2)
chk("acusa troca de endereco na nuvem a cada ciclo",
    "ENDEREÇO MUDOU" in _diag2 and "mudancaEndereco++" in _diag2
    and novo.count("trocando de endereço na nuvem a cada ciclo") == 1)
chk("acusa registro de envio mais novo que o item",
    "REGISTRO MAIS NOVO QUE O ITEM" in _diag2 and "carimboRegrediu++" in _diag2
    and novo.count("registro de envio mais novo que o próprio item") == 1)
chk("os contadores saem no pacote de dados",
    novo.count("mudancaEndereco, carimboRegrediu,") == 1)
chk("o diagnostico nao ESCREVE no log que ele mesmo le",
    "registrarEventoSync(" not in _diag2)
chk("a versao inline tambem e so leitura",
    all(m not in _inline for m in ["marcarAlterado(", "dbSet(", "onedriveEnviarBlob", "onedriveApagarBlob"]))
chk("o diagnostico e SO LEITURA (nao altera nem envia nada)",
    all(m not in _diag for m in ["marcarAlterado(", "dbSet(", "= agoraSync()",
                                 "onedriveEnviarBlob", "onedriveApagarBlob"]))

print("\n---------------------------------------")
print("CHECAGENS ESTRUTURAIS:", "FALHOU (%d)" % falhas if falhas else "TODAS OK")
sys.exit(1 if falhas else 0)
