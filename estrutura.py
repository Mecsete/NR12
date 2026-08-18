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
# oneDriveDeltaFila ganhou +3 ocorrencias de proposito:
#   +1 o diagnostico LE a fila para mostrar o que esta esperando (leitura pura);
#   +2 o botao "limpar a fila da nuvem" (le o tamanho e zera a fila).
# A fila e um atalho descartavel — a varredura completa de 30 em 30 min
# reconstroi o que for real, entao limpa-la nao perde dado. A checagem da
# secao 23 garante que limparFilaNuvem nao encosta em projetosSimples.
_extra = {"oneDriveDeltaFila": 3}
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
                 ('blocoPLrHtml(r, "draft", tarefaCtx)', 1),
                 ('blocoPLrHtml(item.risco, "laudo", item.tarefa)', 1),
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
# APP_BUILD passou a ser UM texto fixo (antes eram 2: o valor e o fallback da
# IIFE que lia document.lastModified). O numero na tela agora e exatamente este.
# O selo tem de MUDAR a cada entrega (senao o aparelho nao sabe que atualizou)
# e tem de estar no formato combinado.
_selo_o = re.search(r'const APP_BUILD = "([^"]*)"', orig)
_selo_n = re.search(r'const APP_BUILD = "([^"]*)"', novo)
chk("APP_BUILD atualizado",
    bool(_selo_n) and re.fullmatch(r'\d{2}/\d{2}/\d{4} \d{2}:\d{2}', _selo_n.group(1))
    and (not _selo_o or _selo_o.group(1) != _selo_n.group(1)),
    "achei %s" % (_selo_n.group(1) if _selo_n else "nada"))
chk("APP_BUILD e texto fixo, nao derivado da data do arquivo",
    novo.count('const APP_BUILD = "') == 1
    and len([l for l in novo.split(chr(10)) if "document.lastModified" in l and not l.strip().startswith("document.lastModified, ou seja")]) == 0)
chk("nenhum resquicio de build antigo",
    all(novo.count('"%s"' % b) == 0 for b in ["29/07/2026 08:44","30/07/2026 16:20","30/07/2026 18:05","30/07/2026 19:40","30/07/2026 21:10","31/07/2026 09:30","31/07/2026 11:20","31/07/2026 15:40","31/07/2026 19:15","31/07/2026 22:30","31/07/2026 23:55","03/08/2026 17:20","03/08/2026 20:35","05/08/2026 17:30","05/08/2026 19:05","05/08/2026 21:40","05/08/2026 22:30","06/08/2026 19:30","06/08/2026 20:45","07/08/2026 09:40","07/08/2026 10:30"]))

print("\n=== 10. CRESCIMENTO DO ARQUIVO ===")
# ATENCAO ao ler este numero: original.html e a versao publicada ANTES da
# Central do Laudo, e o delta e CUMULATIVO — Central do Laudo (~185 KB) mais
# as entregas de sincronizacao, equipe, IA compartilhada e aprendizado com
# laudos aprovados (~42 KB). O teto so existe para pegar acidente grosseiro
# (arquivo duplicado, bloco colado duas vezes), nao para medir uma entrega.
d = len(novo) - len(orig)
# Teto subido de 320 KB para 420 KB: entraram os blocos 2b e 3 (mitigacao
# existente, caixa em tela cheia, revisao de portugues, aplicar em varios) e o
# tipo do equipamento. O teto continua servindo so para pegar acidente
# grosseiro — uma foto embutida no arquivo somaria MEGAbytes, nao centenas de
# KB, e cairia aqui na hora.
# Teto de 420 para 700 KB: entrou a figura do processo embutida em base64
# (~228 KB). O teto continua pegando acidente grosseiro — foto embutida por
# engano somaria MEGAbytes, nao centenas de KB.
chk("crescimento coerente com os novos modulos (%d bytes)" % d, 20000 < d < 700000, "delta=%d" % d)
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
    # Teto de 90 para 400 KB: a figura do processo (~228 KB em base64) vive
    # DENTRO do bloco de impressao, que e justamente onde ela tem de estar —
    # sai junto se o bloco for removido. O teto segue servindo para pegar
    # acidente grosseiro, como o bloco colado duas vezes.
    chk("o bloco tem tamanho coerente (%d bytes)" % (fim - ini), 20000 < (fim - ini) < 400000)
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
# Procura os rotulos DENTRO da declaracao de LAUDO_ABAS (mais o push da aba
# Imprimir): fora dela ha outras listas com rotulos iguais, como as opcoes de
# agrupamento do "aplicar em varios".
chk("nenhuma aba foi perdida no caminho",
    bool(m_abas) and all(
        ('rot:"%s"' % r) in (m_abas.group(1) + 'rot:"Imprimir"')
        for r in ["Projeto", "Áreas", "IA", "Revisão", "Exportar", "Imprimir"]))

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
    novo.count('risco:laudoExemplosAprovados("risco"),  existente:laudoExemplosAprovados("existente"), solucao:laudoExemplosAprovados("solucao")') == 1)
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

print("\n=== 22. JUNTAR ITENS DUPLICADOS ===")
for marca in ["function sincDuplicatasNaArvore(", "function sincJuntarDuplicata(",
              "function sincJuntarTodasDuplicatas(", "async juntarDuplicatasSync(){",
              "App.juntarDuplicatasSync()", "const SINC_FILHOS_DE"]:
    chk("'%s' x1" % marca, novo.count(marca) == 1, "achei %d" % novo.count(marca))
_r = novo.find("async juntarDuplicatasSync(){")
_rep = novo[_r:_r+1100]
chk("o reparo pede confirmacao ANTES de juntar",
    "if(!confirm(" in _rep and _rep.find("if(!confirm(") < _rep.find("sincJuntarTodasDuplicatas()"))
chk("cria ponto de restauracao antes de mexer",
    'await salvarPontoDeRestauracao("antes de juntar duplicatas")' in _rep)
_j = novo.find("function sincJuntarDuplicata(")
_jun = novo[_j:novo.find("function sincJuntarTodasDuplicatas(", _j)]
chk("fica a copia alterada por ultimo", "sort((a,b)=>" in _jun and "atualizadoEm" in _jun)
chk("os filhos da copia removida sao trazidos junto (nao perde dado)",
    "fica.obj[campo].push(f)" in _jun)
chk("o sobrevivente e carimbado para assumir o endereco",
    "fica.obj.atualizadoEm = agoraSync();" in _jun)
chk("o diagnostico aponta a causa",
    novo.count("esta é a causa da sincronização não terminar") == 1)
chk("a correcao que impede NOVAS duplicatas continua no lugar",
    all(novo.count('__moverItemEntrePais("%s"' % t) == 1 for t in ["area", "maquina", "tarefa", "risco"]))

print("\n=== 23. REPARO x FALHA, FILA DA NUVEM E TESTE DE IA ===")
chk("autocura e registrada como reparo, nao como erro",
    'direcao==="up" && ok===false && !reparo' in novo
    and novo.count('rotuloCaminhoSync(reg.pasta), true)') == 2)
chk("o diagnostico separa reparo de falha",
    "e.ok === false && !ehReparo(e)" in novo
    and "log.filter(ehReparo)" in novo
    and novo.count("Correções automáticas (não são erros)") == 1)
_lf = novo.find("limparFilaNuvem(){")
chk("limpar fila da nuvem existe, confirma e nao toca em dado",
    novo.count("limparFilaNuvem(){") == 1
    and novo.count("App.limparFilaNuvem()") == 1
    and "if(!confirm(" in novo[_lf:_lf+900]
    and "projetosSimples" not in novo[_lf:_lf+900])
chk("NAO afirma que a OpenAI bloqueia o navegador (era falso)",
    "A OpenAI bloqueia chamadas feitas direto do navegador" not in novo
    and "a OpenAI costuma bloquear chamadas feitas direto pelo navegador" not in novo)
chk("o teste de IA nomeia o provedor e separa rede de chave errada",
    "Não foi possível falar com ${preset.nome}" in novo
    and "a chave nem chegou a ser verificada" in novo)

print("\n=== 24. DIAGNOSTICO COERENTE COM A LINHA DE CIMA ===")
_dd = novo[novo.find("function onedriveDiagnosticoDados("):novo.find("function onedriveDiagnosticoTexto(")]
chk("le tambem a foto da ultima verificacao da nuvem",
    "STATE.oneDriveStatusPendente" in _dd and "totalReceber" in _dd and "fotosReceber" in _dd)
chk("'nada pendente' exige as DUAS contas zeradas",
    novo.count("&& !d.nuvem.itens && !d.nuvem.fotos;") == 1)
chk("mostra o que a nuvem tem e ainda nao chegou",
    novo.count("Encontrado na nuvem, ainda não recebido") == 1)
chk("registro antigo de autocura nao conta mais como falha",
    "const ehReparo = " in novo and "/reenvio agenda/i.test(e.motivo" in novo
    and novo.count("!ehReparo(e)") == 3)
chk("o texto copiavel separa as duas contas de recebimento",
    novo.count("ENCONTRADO NA NUVEM, AINDA NAO RECEBIDO") == 1
    and novo.count("PARA RECEBER — FILA LOCAL") == 1)

print("\n=== 25. ENDERECO DA API SEMPRE DO PROVEDOR ===")
chk("existe um unico calculo do endereco-base",
    novo.count("function iaEndpointBase(") == 1
    and novo.count("const endpointBase = iaEndpointBase(cfg, preset);") == 3)
chk("o calculo antigo (que aceitava endereco errado) foi removido",
    "const endpointBase = (cfg.endpoint || preset.endpoint" not in novo)
_ie = novo.find("function iaEndpointBase(")
chk("so o modo Personalizado usa endereco proprio",
    'cfg.provedor === "personalizado"' in novo[_ie:_ie+420])
chk("a configuracao se conserta sozinha ao ser lida",
    'if(c.provedor !== "personalizado")' in novo
    and "if(c.endpoint !== preset.endpoint) c.endpoint = preset.endpoint;" in novo)

print("\n=== 26. NORMAS EM PDF CHEGAM DE FORMA UTIL ===")
chk("os trechos de TODAS as normas disputam o mesmo ranking",
    novo.count("function normasTrechosEscolhidos(") == 1
    and "let orcamento = NORMAS_IA_LIMITE_CARACTERES;" not in novo
    and "NORMAS_IA_LIMITE_CARACTERES / normas.length" not in novo)
chk("a norma e dividida em pedacos e o relevante e escolhido",
    novo.count("function normasPedacos(") == 1
    and "refsSemelhanca(alvo, refsConjunto(p))" in novo)
chk("a tela de conferencia usa o MESMO calculo da geracao",
    novo.count("function conferirNormasHtml(") == 1
    and novo.count("normasTrechosEscolhidos(exemplo, NORMAS_IA_LIMITE_CARACTERES)") == 1
    # 2 = o botao que abre + o "Fechar" de dentro do proprio bloco
    and novo.count("App.toggleConferirNormas()") == 2)
chk("a conferencia explica a norma que ficou de fora",
    novo.count("Sem trecho relacionado desta vez") == 1)
chk("o trecho e escolhido pelo texto que a IA vai reescrever",
    novo.count(': contextoNormasIA(textoUsuario));') == 1)
chk("a revisao de portugues nao recebe trecho de norma",
    novo.count('const IA_TIPOS_SEM_NORMAS = ["revisao_pt"];') == 1
    and novo.count('IA_TIPOS_SEM_NORMAS.indexOf(tipo) >= 0 ? "" :') == 1)
# 2 = a definicao da funcao + o UNICO ponto que monta o prompt (chamarIA).
# Um terceiro significaria alguem montando prompt por fora, sem as normas.
chk("existe um unico ponto montando o prompt com as normas",
    novo.count("contextoNormasIA(") == 2)
chk("norma desativada continua fora",
    "filter(n=>n.ativo!==false && n.texto)" in novo)

print("\n=== 27. MODAL DE CRIACAO DE RISCO (BLOCO 1) ===")
_rm = novo.find("function renderModalEntidade(){")
_rmc = novo[_rm:_rm+1400]
chk("a rolagem do modal e guardada ANTES de redesenhar",
    "const rolagem = anterior ? anterior.scrollTop : 0;" in _rmc
    and _rmc.find("const rolagem") < _rmc.find("abrirOverlay(html)"))
chk("e devolvida depois", "novo.scrollTop = rolagem;" in _rmc)
chk("selects fora de .field entram nas regras de largura",
    ".field select,.medida-box select,.mitig-box select{width:100%;max-width:100%" in novo
    and ".field select.sp-select-sm,.medida-box select.sp-select-sm,.mitig-box select.sp-select-sm" in novo)
chk("a regra antiga, que so pegava .field, nao ficou para tras",
    novo.count(".field select{width:100%;background:var(--surface)") == 0)
chk("o quadro se chama Solucao",
    novo.count("${ic('warn')} Solução</div>") == 1
    and novo.count("${ic('warn')} Mitigação proposta</div>") == 0)
chk("o nome do risco junta evento e componente",
    novo.count("function montarNomeRisco(") == 1
    and "const nomeSugerido = montarNomeRisco(r);" in novo)
chk("nome escrito a mao nunca e sobrescrito",
    'nomeAtual === String(r.nomeAuto||"").trim()' in novo)

print("\n=== 28. BARRA INFERIOR COM O TECLADO ABERTO ===")
chk("existe o vigia da janela visivel",
    novo.count("function vigiarTeclado(){") == 1
    and "window.visualViewport" in novo)
chk("o corte evita confundir com a barra de endereco",
    "(window.innerHeight - vv.height) > 140" in novo)
chk("a classe some quando o teclado fecha",
    'classList.toggle("teclado-aberto", agora)' in novo)
chk("a barra e os botoes flutuantes somem com o teclado",
    "html.teclado-aberto .bottomnav," in novo
    and "html.teclado-aberto .fab-wrap," in novo
    and "html.teclado-aberto .laudo-fab{display:none!important;}" in novo)
chk("sem visualViewport (computador/navegador antigo) nada muda",
    "if(!vv) return;" in novo[novo.find("function vigiarTeclado(){"):novo.find("function vigiarTeclado(){")+300])

print("\n=== 29. MONTAGEM DO RISCO (BLOCO 2a) ===")
chk("o nome do risco usa os quatro itens",
    novo.count("function montarNomeRisco(") == 1
    and all(m in novo[novo.find("function montarNomeRisco("):novo.find("function montarNomeRisco(")+900]
            for m in ["r.evento", "r.componente", "r.local", "r.parteCorpo"]))
chk("nome e descricao usam a MESMA regra de virgula",
    novo.count('nome += (comp ? ", " : " ") + seq.join(", ");') == 1
    and novo.count('const emenda = seq.length ? (comp ? ", " : " ") + seq.join(", ") : "";') == 1)
chk("a regra antiga da descricao (cabeca === 'Risco') saiu",
    'cabeca === "Risco" ? " " : ", "' not in novo)
_ff = novo.find("function formRiscoSHtml(){")
_ffc = novo[_ff:_ff+1600]
chk("o campo do nome fica DEPOIS do quadro de montagem",
    _ffc.find("${blocoMontadorRiscoHtml(r)}") < _ffc.find('id="risco-nome-input"')
    and _ffc.find("${blocoMontadorRiscoHtml(r)}") > 0)
chk("todo evento tem explicacao curta",
    len(re.findall(r'\{ v:"[^"]+",\s*\n?\s*gpd:"[^"]+",\s*\n?\s*desc:"', novo)) >= 19)
chk("o icone de informacao dos eventos existe e abre o painel",
    novo.count("App.toggleInfoEventos()") == 1
    and novo.count("toggleInfoEventos(){") == 1
    and "let __infoEventosAberto = false;" in novo)

print("\n=== 30. MITIGACAO EXISTENTE SEPARADA DA SOLUCAO (BLOCO 2b) ===")
chk("a marcacao do que existe virou lista, com os dois campos novos",
    novo.count("function medidasExistentesDe(") == 1
    and novo.count("function outrosExistentesDe(") == 1
    and "r.medidasExistentes = lista;" in novo
    and "r.medidasExistentesOutros = lista;" in novo)
chk("o formato antigo (uma medida so) continua sendo lido",
    'const antiga = String(r.medidaExistenteTipo||"").trim();' in novo
    and "return antiga ? [antiga] : [];" in novo)
chk("o seletor unico e o botao do fluxo antigo sairam de cena",
    "onDraftMedidaExistente('tipo'" not in novo
    and "App.aplicarTextoMedidaExistente()" not in novo
    and "aplicarTextoMedidaExistente(){" not in novo)
chk("as tres acoes de marcar gravam o rascunho e reescrevem o texto",
    novo.count("sincronizarDescMedidaExistente(r);\n    gravarDraftPersistente();") == 4)
chk("o texto so e reescrito enquanto for automatico",
    novo.count('atual === String(r.descMedidaAuto||"").trim()') == 1
    and novo.count("function sincronizarDescMedidaExistente(") == 1)
chk("o texto do conjunto junta frases e nao repete norma",
    novo.count("function medidaTextoExistenteMulti(") == 1
    and 'let corpo = partes.join("; ");' in novo
    and "if(ref && refs.indexOf(ref) < 0) refs.push(ref);" in novo
    and 'refs.join(" e na ")' in novo)
chk("medidas que so existem como proposta ficam fora do que ja existe",
    novo.count("function medidasParaExistente(") == 1
    and novo.count("soProposta:true") == 8)
chk("a IA da Solucao recebe a proposta e o que existe como contexto",
    novo.count("function laudoEntradaSolucao(") == 1
    and novo.count('chamarIAResiliente("mitigacao_xlsx", laudoEntradaSolucao(') == 2
    and "COMPLEMENTAR ou CORRIGIR" in novo)
chk("o gerador antigo continua gravando no campo que leu",
    'chamarIA("mitigacao", medidaExistente ? item.risco.descMedida' in novo)
_qe = novo.find("function laudoBlocoExistenteHtml(")
chk("a revisao tem um quadro so de leitura do que ja existe",
    _qe > 0
    and "onclick" not in novo[_qe:novo.find("function laudoBlocoMedidaExistenteEditavelHtml(")])
# As duas checagens que existiam aqui ("chamada dentro de laudoBlocoCampo" e
# "vem antes do texto de campo, DENTRO do mesmo cartao") travavam a
# arquitetura ANTIGA -- os dois quadros num cartao so. Isso mudou na secao
# 46: cada um ganhou cartao proprio, e a ordem passou a ser garantida no
# LOOP da tela, nao mais dentro de laudoBlocoCampo. As checagens novas dessa
# mudanca moram na secao 46 -- nao reaproveitar as antigas aqui.
chk("sem proposta escrita, a revisao avisa em vez de esconder",
    "const solucaoSemProposta = campo===\"solucao\"" in novo
    and "Sem proposta, o laudo repete" in novo)
# Esta checagem travava a regra ANTIGA (medidaImplementada decidindo qual
# campo usar) como se fosse a correta. Era o proprio bug corrigido na secao
# 44: com mitigacao marcada, a coluna AT trocava a proposta do inspetor pela
# descricao do que ja existe mesmo com uma proposta de verdade escrita. A
# checagem da regra atual (proposta sempre, descMedida so como ultimo
# recurso) mora na secao 44 — nao reaproveitar o texto antigo aqui.
chk("o texto do laudo (coluna AT) usa a regra atual, nao a antiga travada aqui por engano",
    'return (item.risco.medidaImplementada==="Sim") ? (item.risco.descMedida||"") : (item.risco.sugestaoMitigacao||"");' not in novo)

print("\n=== 31. CAIXA DE TEXTO EXPANSIVEL, REVISAO E APLICAR EM VARIOS (BLOCO 3) ===")
# O botao tem de nascer SO no JS. Se algum dia aparecer "ta-caixa"/"ta-botao"
# escrito dentro de um template de tela, quer dizer que alguem comecou a
# repetir isso a mao — e a proxima caixa nova vai sair sem botao.
chk("nenhuma tela precisou ser alterada para ganhar o botao",
    novo.count('document.querySelectorAll("textarea:not([data-ta])")') == 1
    and novo.count('caixa.className = "ta-caixa";') == 1
    and '<div class="ta-caixa"' not in novo
    and 'class="ta-botao"' not in novo)
_te = novo.find("function taExpandir(")
_tec = novo[_te:novo.find("function prepararTextareas(")]
chk("o espacador entra antes de a caixa virar fixa",
    _tec.find("caixa.getBoundingClientRect().height") < _tec.find('caixa.classList.add("expandida")')
    and _tec.find("caixa.getBoundingClientRect().height") > 0)
chk("o fundo escuro nunca fica preso na tela",
    "!document.body.contains(__taCaixaAberta)" in novo
    and 'if(e.key === "Escape" && __taCaixaAberta) taRecolher();' in novo)
chk("a caixa aberta fica na frente do modal",
    ".ta-caixa.expandida{position:fixed;left:10px;right:10px;top:10px;bottom:10px;z-index:4001" in novo
    and ".ta-fundo{position:fixed;inset:0;" in novo)
chk("a rede de seguranca da revisao esta inteira",
    all(novo.count("function %s(" % f) == 1 for f in
        ["revisaoPtPalavras", "revisaoPtNumeros", "revisaoPtLimpar", "revisaoPtSemelhanca", "revisaoPtAceitavel"])
    and novo.count("async function corrigirPortuguesIA(") == 1)
chk("numero trocado e texto reescrito nao passam",
    "if(revisaoPtNumeros(orig) !== revisaoPtNumeros(novo)) return false;" in novo
    and "if(Math.abs(a.length - b.length) > 1) return false;" in novo
    and 'revisaoPtSemelhanca(a.join(" "), b.join(" ")) >= 0.85' in novo)
chk("sem IA ou com falha, vale o texto do engenheiro",
    "if(!getIAApiKey()) return base;" in novo
    and "catch(e){ return base; }" in novo
    and "revisaoPtAceitavel(base, novo) ? novo : base" in novo)
chk("aplicar (individual, sugestao ou linha inteira) dispara a revisao",
    novo.count("async laudoAplicar(rid, campo){") == 1
    and novo.count("async laudoValidar(rid, campo){") == 1
    and novo.count("async laudoAprovarLinha(rid){") == 1
    and novo.count("App.laudoRevisarPortugues(rid, campo)") == 2)
chk("o titulo do risco e revisado uma vez so, junto do campo do risco",
    novo.count("async function laudoRevisarTextoEtitulo(") == 1
    and 'if(campo === "risco"){' in novo)
chk("a trava de nivel do aplicar-em-varios existe e cobre os quatro campos",
    'const LAUDO_NIVEL_CAMPO = { escopo:"maquina", tarefa:"tarefa", risco:"risco", solucao:"risco" };' in novo
    and novo.count("function laudoAlvosReplicar(") == 1
    and 'if(nivel==="maquina" && o.maquina.id === item.maquina.id) return;' in novo)
chk("so ha agrupamento por um nivel acima do destino",
    novo.count("const LAUDO_AGRUPAR_POR = {") == 1
    and novo.count('{k:"tarefa",rot:"Tarefa"}') == 1)
chk("a marcacao sobrevive a troca de agrupamento",
    '__laudoReplicaSel.has(a.chave)?"checked":""' in novo
    and "__laudoReplicaSel.add(el.value)" in novo)
chk("abrir a lista comeca sem nada marcado",
    "__laudoReplicaSel = new Set();\n    abrirOverlay(laudoSheetReplicarHtml(item, campo));" in novo)
chk("substituir texto existente e avisado antes",
    "Já tem texto — será substituído" in novo)
chk("o botao de aplicar em varios so aparece com texto decidido",
    '${(st==="ok"||st==="edit") && fin? `<button' in novo)

print("\n=== 32. QUADRO DE ORIGEM E LOGOTIPO DO LAUDO ===")
chk("numa folha em coluna so a lista encolhe",
    ".sheet-col>*{flex-shrink:0;}" in novo
    and ".sheet-col>.sheet-rolagem{flex:1 1 auto;min-height:0;overflow:auto;}" in novo
    # Tres: aplicar em varios, copiar de outro e o modal de exportacao.
    and novo.count('class="sheet sheet-col"') == 3
    and novo.count('class="sheet-rolagem"') == 3)
chk("o quadro do texto de origem nao encolhe e tem teto",
    ".rep-origem{flex:0 0 auto;" in novo
    and "max-height:30vh" in novo
    and "@media (max-height:700px){ .rep-origem{max-height:22vh;} }" in novo)
chk("nao sobrou o estilo em linha que espremia o quadro",
    'id="laudoReplicaLista" style="overflow:auto;flex:1;min-height:0"' not in novo
    and 'style="max-height:96px;overflow:auto' not in novo)
# JPEG nao tem canal alfa: pixel transparente vira PRETO. Era a causa do
# logotipo com fundo preto e da capa estragada.
chk("o logotipo sai em PNG e a foto continua em JPEG",
    novo.count("function comprimirLogoPNG(") == 1
    and 'canvas.toDataURL("image/png")' in novo
    and 'canvas.toDataURL("image/jpeg", quality||0.7)' in novo
    and "comprimirLogoPNG(arq, 600)" in novo
    and "comprimirImagem(input.files[0], 600, 0.92)" not in novo)
_cl = novo.find("function comprimirLogoPNG(")
_clc = novo[_cl:novo.find("function comprimirImagem(", _cl)]
chk("nada e pintado atras do logotipo antes de salvar",
    "fillRect" not in _clc and "fillStyle" not in _clc and "image/jpeg" not in _clc)
chk("PNG pesado e reduzido, nao convertido",
    "const LOGO_LIMITE_BYTES = " in novo
    and "saida.length <= LOGO_LIMITE_BYTES" in novo)
chk("logotipo no formato antigo e reconhecido e avisado",
    "function logoSemTransparencia(){" in novo
    and "Este logotipo está sem transparência" in novo)
chk("da para trocar e remover o logotipo depois de enviado",
    novo.count("lpRemoverLogo(){") == 1
    and novo.count("App.lpRemoverLogo()") == 1
    and '${logo()? "Trocar" : "Enviar"} logotipo (PNG)' in novo
    and "App.lpAbrirLogo()" in novo
    and "lp-logo-previa" in novo)
chk("remover deixa vazio (a uniao com a nuvem traria de volta uma chave ausente)",
    'getMecseteConfig().logoLaudo = "";' in novo
    and "delete getMecseteConfig().logoLaudo" not in novo)
chk("trocar e remover carimbam para sincronizar e forcam remontar",
    # Cinco: logotipo (enviar/remover), figura do processo (enviar/remover) e o
    # texto do rodape. Quatro deles tambem invalidam o laudo ja montado.
    len(re.findall(r"STATE\.ui\.mecseteEm = agoraSync\(\);\s*\n\s*marcarEquipeAlterada\(\);", novo)) == 5
    and novo.count('cacheFoto.clear(); __lpPaginas = []; __lpHtml = "";') == 4)

print("\n=== 33. INVENTARIO DE MAQUINAS: COLUNAS FIXAS E TIPO DO EQUIPAMENTO ===")
# O inventario sai em varias tabelas (uma por maquina, para poder paginar).
# Tabela HTML calcula largura pelo proprio conteudo: sem table-layout:fixed +
# o MESMO colgroup em todas, cada linha inventa a sua e nada alinha.
chk("colunas fixas e iguais em todas as tabelas do inventario",
    bool(re.search(r"const INV_COLS = \[\d+(?:, ?\d+){11}\];", novo))
    and novo.count("${invColgroup}") == 2
    and ".lp-inv{width:100%;table-layout:fixed;" in novo)
# A soma tem de bater com a pagina em que a tabela e IMPRESSA. Desde que o
# inventario passou a sair deitado, essa pagina e a A4 em paisagem (297mm).
_m_cols = re.search(r"const INV_COLS = \[([^\]]+)\]", novo)
chk("as larguras somam a area util da pagina deitada (1123 - 2x53)",
    bool(_m_cols) and sum(int(x.strip()) for x in _m_cols.group(1).split(",")) == 1017)
chk("nao sobrou largura em linha brigando com o colgroup",
    '<th style="width:96px">Imagem</th>' not in novo
    and ".lp-inv td.foto{padding:2px}" in novo)
chk("a coluna Descricao passou a ser o TIPO nos dois lugares",
    "<td>${esc(tipoEquipamento(m))}</td>" in novo
    and "xlsmCellTexto(`D${rowNum}`,S.D, tipoEquipamento(maquina))" in novo
    and "xlsmCellTexto(`D${rowNum}`,S.D, maquina.descricao)" not in novo)
chk("o campo novo existe, tem lista e aceita Outro",
    novo.count("const TIPOS_EQUIPAMENTO = [") == 1
    and novo.count("function tipoEquipamento(") == 1
    and novo.count("function tipoSugeridoDaMaquina(") == 1
    and 'selectOptions(TIPOS_EQUIPAMENTO, m.tipoEquip, true, "Outro (especificar)")' in novo
    and "App.setDraftField('tipoEquipOutro', this.value)" in novo)
chk("a descricao longa continua existindo (vai para o corpo do laudo)",
    "App.setDraftField('descricao', this.value)" in novo
    and novo.count("m.descricao") >= 1)
# A capa pinta o logotipo inteiro de branco por filtro. Com PNG transparente
# isso da o resultado certo; o filtro NAO pode sumir.
chk("o logotipo da capa continua saindo todo branco",
    novo.count("filter:brightness(0) invert(1)") == 1
    and ".lp-capa-lat .lp-logo{filter:brightness(0) invert(1)" in novo)

print("\n=== 34. PAINEL DE PROGRESSO COM PARADA ===")
chk("o painel existe inteiro",
    all(novo.count("function %s(" % f) == 1 for f in
        ["progressoTempo", "progressoAbrir", "progressoDesenhar", "progressoAtualizar",
         "progressoFechar", "progressoCancelado"])
    and novo.count("progressoParar(){") == 1)
chk("fica acima de modal e de caixa de texto expandida",
    ".prog-fundo{position:fixed;inset:0;z-index:5000;" in novo)
chk("dois painies nao se empilham nem se fecham entre si",
    "if(__progresso){ __progresso.titulo = titulo; progressoDesenhar(); return false; }" in novo
    and "if(meu === false) return;" in novo)
chk("a estimativa so aparece com pelo menos dois itens medidos",
    "p.feito >= 2 && p.total > p.feito" in novo
    and "decorrido/p.feito*(p.total-p.feito)" in novo)
chk("parar sai antes da proxima chamada, nao no meio de uma",
    "__progresso.cancelado = true;" in novo
    and novo.count("if(progressoCancelado()) break;") == 4)
# Excel, Word e a geracao de textos. Sem finally o painel ficaria preso na
# tela — exatamente o defeito do aviso que se renovava sozinho.
chk("o painel fecha em qualquer desfecho",
    len(re.findall(r"\}\s*finally\s*\{[^}]*progressoFechar", novo)) == 3
    and novo.count("progressoFechar(painelExport)") == 1
    and novo.count("progressoFechar(painelWord)") == 1
    and novo.count("finally{ progressoFechar(meuPainel); }") == 1)
chk("exportacao parada nao entrega arquivo pela metade",
    novo.count('if(progressoCancelado()){ toast("Exportação parada') == 3)
chk("os avisos repetidos por item sairam do caminho",
    "Escrevendo textos da IA… ${i}/${total}" not in novo
    and "Gerando Excel… área ${i+1}" not in novo
    and "Gerando Word… área ${i+1}" not in novo
    and len(re.findall(r"gerarLaudoIAItens\([a-zA-Z]+, null, \{ refazer:(?:true|false) \}\)", novo)) == 5)

print("\n=== 35. INVENTARIO EM PAGINA DEITADA ===")
chk("geometria propria da pagina deitada",
    "const UTIL_L_P = PAG_A - MARGEM * 2;" in novo
    and "const UTIL_A_P = PAG_L - MARGEM * 2 - ROD_A;" in novo
    and "const MAX_A_P  = Math.floor(UTIL_A_P * 0.98);" in novo)
# Medir em pe um bloco que sai deitado daria altura errada e a pagina
# estouraria; e nao existe meia pagina deitada, entao trocar de orientacao
# tem de fechar a pagina anterior.
chk("cada bloco e medido na largura em que vai ser impresso",
    'med.style.width = (deitada ? UTIL_L_P : UTIL_L) + "px";' in novo
    and "const teto = deitada ? MAX_A_P : MAX_A;" in novo)
chk("trocar de orientacao fecha a pagina",
    "if(deitada !== orient){ fechar(); orient = deitada; }" in novo
    and "paginas.push({ blocos:atual, paisagem:orient })" in novo)
chk("so o inventario pede pagina deitada",
    novo.count("paisagem:true") == 2
    and "quebrarAntes:true, paisagem:true" in novo)
chk("CSS e @page da pagina deitada",
    ".lp-pagina.lp-paisagem{width:${PAG_A}px;height:${PAG_L}px}" in novo
    and ".lp-paisagem .lp-corpo{height:${UTIL_A_P}px}" in novo
    and "@page paisagem{size:A4 landscape;margin:0}" in novo
    and ".lp-pagina.lp-paisagem{page:paisagem}" in novo
    and '${p.paisagem?" lp-paisagem":""}' in novo)
chk("a previa comporta a pagina deitada",
    'id="lpDoc" style="transform:scale(${zoom});width:${PAG_A}px;' in novo)
chk("a instrucao de impressao avisa para nao forcar paisagem",
    "Deixe a orientação em Retrato." in novo)
chk("a coluna Local nao repete mais o nome da area",
    '<td>${esc(m.local||it.area.local||"")}</td>' in novo
    and '${esc(m.local||it.area.nome||"")}' not in novo)

print("\n=== 36. RODAPE CENTRALIZADO E DEDUCAO DO TIPO ===")
# Com flex:1 so no meio, o logotipo se centralizava no espaco que sobrava
# entre o numero da pagina (5px) e os dados do engenheiro (158px) — 76px a
# esquerda do centro real. Bases iguais nos dois lados resolvem.
chk("logotipo do rodape no centro da pagina",
    ".lp-rodape .lp-num{flex:1 1 0;min-width:0;" in novo
    and ".lp-rodape .lp-eng{flex:1 1 0;min-width:0;" in novo
    and ".lp-rodape .lp-marca{flex:0 0 auto;text-align:center}" in novo
    and ".lp-rodape .lp-marca{text-align:center;flex:1}" not in novo)
chk("a deducao do tipo nao deixa conjuncao solta",
    "const par = /^(.*?)\\s+[A-Z]$/.exec(limpo);" in novo
    and "if(par && !/\\s(e|ou)$/i.test(par[1])) limpo = par[1].trim();" in novo)

print("\n=== 37. GRAFICO DE RISCO CONFERIDO E CARTAO DO RISCO ===")
# Sao DOIS graficos. Na NBR 14153 (Figura B.1) o ramo S1 nao se divide em F e
# P: vai direto para a Categoria 1. Na ISO 13849-1 (Anexo A) S1 se divide e
# gera PLr a/b/b/c. Conferido nas normas em 11/08/2026.
chk("o ramo S1 inteiro cai na Categoria 1",
    all(('"S1F%dP%d": { plr:"%s", cat:"1" }' % (f,p,x)) in novo
        for f,p,x in [(1,1,"a"),(1,2,"b"),(2,1,"b"),(2,2,"c")]))
chk("o ramo S2 segue a Figura B.1",
    '"S2F1P1": { plr:"c", cat:"2" }' in novo
    and '"S2F1P2": { plr:"d", cat:"3" }' in novo
    and '"S2F2P1": { plr:"d", cat:"3" }' in novo
    and '"S2F2P2": { plr:"e", cat:"4" }' in novo)
chk("a tabela registra a procedencia de cada coluna e o aviso saiu",
    novo.count("const PLR_GRAFICO = {") == 1
    and "ABNT NBR 14153:2022, Figura B.1" in novo
    and "ISO 13849-1:2023, Anexo A" in novo
    and "NÃO derive uma coluna da outra" in novo
    and "ATENÇÃO: TABELA A CONFERIR CONTRA AS NORMAS ANTES DE ASSINAR" not in novo)
chk("o risco virou cartao e o cabecalho de colunas saiu",
    '<div class="lp-rc">' in novo
    and '<th style="width:196px">HRN</th>' not in novo)
chk("o PLr fica a direita da tabela do HRN",
    novo.find('<div class="lp-rc-hrn">') < novo.find('<div class="lp-rc-plr">')
    and ".lp-rc-plr{flex:0 0 156px;border-left:1px solid #8A8CA3" in novo)
chk("as fotos saem sem legenda e sao no maximo duas",
    "const fotos = [r.foto, (r.fotosOutras||[])[0]].filter(Boolean);" in novo
    and "fotos.slice(0,2)" in novo
    and "DETALHE DO RISCO" not in novo
    and ".lp-rc-leg{" not in novo
    and '${evsOk.length? `<div class="lp-rc-col ev">' in novo)

print("\n=== 38. TELA IMPRIMIR, ROLAGEM E AJUSTES DO CARTAO ===")
# render() troca o innerHTML inteiro e isso zera o scroll. Como a sincronizacao
# redesenha sozinha de tempos em tempos, a pagina pulava para o topo no meio da
# leitura. Sao 132 chamadas de render() — a correcao tem de ficar dentro dele.
chk("a rolagem e devolvida quando continua a mesma tela",
    "const mesmaTela = (chave === __telaDesenhada);" in novo
    and "if(mesmaTela && rolagem) window.scrollTo(0, rolagem);" in novo
    and novo.count("devolverRolagem()") == 3   # os tres caminhos de saida de render()
    and "function chaveDaTela(" in novo)
chk("os controles ficam dentro da visualizacao",
    '<div class="lp-visor-wrap">' in novo
    and ".lp-flut{position:absolute;right:14px;bottom:14px" in novo
    and novo.count('class="lp-flut-btn"') == 3
    and "zoomMais:" in novo and "zoomMenos:" in novo)
chk("a caixa do logotipo virou botao mais ficha do arquivo",
    "App.lpAbrirLogo()" in novo
    and novo.count("function logoFicha(") == 1
    and novo.count("function tamanhoLegivel(") == 1
    and "logoLaudoMeta = { nome: arq.name" in novo
    and '<div class="card card-pad" style="background:#FFF3D6;border-color:#E9C46A;margin-bottom:10px">' not in novo)
chk("o rodape e configuravel e cai no padrao quando vazio",
    "App.lpAbrirRodape()" in novo and "lpSalvarRodape(){" in novo
    and novo.count("function rodapeTexto(") == 1
    and "getMecseteConfig().rodapeLaudo" in novo)
chk("a numeracao diz o total de paginas",
    '<div class="lp-num">Página ${n} de ${total}</div>' in novo)
chk("o selo do HRN saiu do cabecalho e a evidencia subiu",
    'class="lp-rc-selo"' not in novo
    and '<span class="lp-rc-evrot">Evidência do risco</span>' in novo
    and '<div class="lp-rc-rot">Evidência do risco</div>' not in novo)
chk("o texto do cartao ficou maior",
    ".lp-rc-col{padding:7px 9px;font-size:10px;" in novo)
chk("a faixa da tarefa nao fecha a pagina sozinha",
    "grudaNoProximo:true" in novo
    and "if(b.grudaNoProximo && blocos[idx+1]" in novo
    and "if(altura + h + hProx > teto) fechar();" in novo)

print("\n=== 39. METODOLOGIA COMPLETA, ZOOM E ROLAGEM DA PREVIA ===")
# A previa (.lp-visor) rola por DENTRO. Trocar o innerHTML zera essa rolagem, e
# era isso que jogava o documento de volta para a primeira pagina — separado da
# rolagem da janela, que ja tinha sido corrigida.
chk("a rolagem da previa e devolvida, nao so a da janela",
    'const visorAntes = document.querySelector(".lp-visor");' in novo
    and "v.scrollTop = visorY; v.scrollLeft = visorX;" in novo)
chk("o zoom vai ate 200%",
    "const passos = [0.3,0.4,0.5,0.65,0.8,1,1.25,1.5,2];" in novo)
chk("o rotulo do PLr cabe numa linha e o HRN nao quebra",
    ".lp-rc-plr{flex:0 0 156px;" in novo
    and "color:#5B5F7A;white-space:nowrap}" in novo
    and "text-align:center;white-space:nowrap;" in novo)
chk("a metodologia tem a pagina dos itens da NR-12 e o paragrafo do residual",
    "item 12.1.9 da NR-12" in novo
    and "item 12.1.1 da NR-12" in novo
    and "Quando o risco residual permaneceu acima do nível considerado aceitável" in novo
    and 'class="lp-lista lp-lista-solta"' in novo)
# O repositorio e PUBLICO e a figura e adaptada de norma ABNT, que e paga:
# ela e enviada pelo engenheiro, nunca embutida no arquivo publicado.
chk("a figura do processo vem embutida e ainda pode ser trocada",
    novo.count("function figuraProcesso(){") == 1
    and novo.count('const FIGURA_PROCESSO_PADRAO = "data:image/jpeg;base64,') == 1
    and "? c.figuraProcesso : FIGURA_PROCESSO_PADRAO;" in novo
    and "App.lpAbrirFigura()" in novo
    and "lpEnviarFigura(){" in novo and "lpRemoverFigura(){" in novo
    # A legenda vive DENTRO da imagem; acrescentar uma em HTML duplicava a frase.
    and '<div class="lp-fig-leg">' not in novo
    and "A legenda tem de estar dentro da própria imagem" in novo)
chk("o fatiador corta por estrutura, nao por texto",
    "cx.innerHTML = String(b.html);" in novo
    and "Array.prototype.slice.call(cx.children)" in novo)
chk("a figura e reduzida com folga para o texto miudo",
    "comprimirLogoPNG(arq, 1400)" in novo)
chk("a classe da lista nao foi redefinida por cima da que ja existia",
    len(re.findall(r"^\.lp-lista\{", novo, re.M)) == 1)

print("\n=== 40. TEXTO SUGERIDO NAO APARECE DUAS VEZES ===")
# Escolher a medida ja preenche o campo editavel sozinho (onDraftMedidaProposta
# e sincronizarDescMedidaExistente). O quadro de leitura ao lado mostrava a
# mesma frase — so faz sentido quando DIFERE do campo, que e quando o texto foi
# editado a mao e da para voltar ao sugerido.
chk("os tres quadros so aparecem quando ha diferenca",
    "${podeAplicar? `<div class=\"medida-rot\">Texto sugerido pela medida escolhida</div>" in novo
    and "${podeAplicar? `<div class=\"medida-rot\">Texto sugerido pelo que foi marcado</div>" in novo
    and "${difereDoLaudo? `<div class=\"medida-rot\">" in novo)
chk("nenhum quadro ficou preso ao antigo 'se existe texto'",
    '${sugestao? `<div class="medida-frase">' not in novo
    and '${texto? `<div class="medida-frase">' not in novo)
chk("a revisao compara com o que ja vai para o laudo",
    'const difereDoLaudo = texto && texto !== String(laudoTextoFinal(item, "solucao")||"").trim();' in novo)
chk("o quadro ganhou rotulo proprio",
    ".medida-rot{margin-top:10px;" in novo
    and ".medida-rot + .medida-frase{margin-top:4px;}" in novo)

print("\n=== 41. FREQUENCIA DA TAREFA ALIMENTA A EXPOSICAO DO PLr ===")
chk("as duas opcoes por turno entraram sem tirar as antigas",
    '"1x por turno","Mais de 2x por turno","1 Turno","2 Turnos"' in novo
    and all(('"%s"' % x) in novo for x in ["Diário", "Semanal", "Quinzenal", "Mensal", "Esporádico"]))
# NBR 14153 B.2.2: "se o acesso somente for necessario de tempo em tempo,
# pode-se selecionar F1". Semanal/mensal/esporadico sao isso por definicao.
# "1 Turno"/"2 Turnos" ficam de fora de proposito: dizem que a tarefa ocupa o
# turno, nao quantas vezes se entra na zona de perigo.
chk("a ponte cobre contagem por turno E periodicidade",
    novo.count("function exposicaoPelaFrequencia(") == 1
    and 'const FREQ_MENOS_DE_1X = ["Diário", "Semanal", "Quinzenal", "Mensal", "Esporádico"];' in novo
    and 'return FREQ_MENOS_DE_1X.indexOf(f) >= 0 ? "Menos de 1x por turno" : "";' in novo
    and '"1 Turno"' not in novo[novo.find("const FREQ_MENOS_DE_1X"):novo.find("const FREQ_MENOS_DE_1X")+200])
chk("o aviso lembra que F depende tambem da duracao",
    "o F também depende da duração" in novo)
chk("a tarefa e passada em todos os pontos que calculam PLr",
    "function plrExigido(r, tarefa){" in novo
    and "function plrFrequencia(r, tarefa){" in novo
    and 'blocoPLrHtml(r, "draft", tarefaCtx)' in novo
    and 'blocoPLrHtml(item.risco, "laudo", item.tarefa)' in novo
    and "plrExigido(r, it.tarefa)" in novo)
chk("a escolha no risco vence a heranca",
    'const escolhido = String(r && r.exposicao || "").trim();' in novo
    and "const valor = escolhido || exposicaoPelaFrequencia(" in novo)
# "herdado" so existe dentro de blocoPLrHtml. O aviso chegou a cair em
# plrResultadoHtml, onde daria ReferenceError em tempo de execucao — o
# check.py nao pega isso, entao a posicao fica travada aqui.
_bp = novo.find("function blocoPLrHtml(")
_fim = novo.find("\nfunction ", _bp + 10)
chk("o aviso da heranca vive dentro de blocoPLrHtml",
    novo.count("A exposição veio da <b>frequência da tarefa</b>") == 1
    and "A exposição veio da <b>frequência da tarefa</b>" in novo[_bp:_fim])
chk("o HRN conhece as frequencias novas",
    '"1x por turno":2.5, "Mais de 2x por turno":4' in novo)

print("\n=== 42. MODAL DE EXPORTACAO DO EXCEL ===")
chk("as quatro opcoes de conteudo e o modal existem",
    novo.count("const EXPORT_CONTEUDOS = [") == 1
    and all(('k:"%s"' % k) in novo for k in ["todos", "laudo", "base", "resumo"])
    and novo.count("function sheetExportarHtml(") == 1
    and "abrirOverlay(sheetExportarHtml())" in novo
    and novo.count("exportConfirmar(){") == 1)
chk("a confirmacao de campos faltando continua no caminho",
    "confirmarGeracaoComCamposFaltando(_exportarSimplesXLSXFotosReal)" in novo)
# localSheetId e o INDICE da aba na lista, nao o sheetId. Tirando uma aba da
# frente, o indice das seguintes muda — sem recalcular, o Excel aponta o filtro
# para a aba errada e pede reparo ao abrir.
chk("o indice do filtro e recalculado, nao copiado",
    "const idxAba = (nome)=> sheetDefs.findIndex(x=> x.name === nome);" in novo
    and 'localSheetId:idxAba("Base Completa")' in novo
    and 'localSheetId:idxAba("Resumo")' in novo)
chk("a aba oculta _MatrizHRN nunca sai",
    '{name:"_MatrizHRN",sheetId:3,rId:"rId5",hidden:true},' in novo
    and '{name:"xl/worksheets/sheet3.xml", data:strToBytes(sheet3Xml)},' in novo)
# Peca declarada no [Content_Types] ou apontada por rel sem o arquivo
# correspondente faz o Excel recusar o arquivo.
chk("as pecas da aba removida saem de todos os lugares",
    all(x in novo for x in [
      'querBase? `<Override PartName="/xl/worksheets/sheet1.xml"',
      'querResumo? `<Override PartName="/xl/worksheets/sheet2.xml"',
      'querBase? `<Override PartName="/xl/drawings/drawing1.xml"',
      'querResumo? `<Override PartName="/xl/drawings/drawing2.xml"',
      'querBase? `<Relationship Id="rId1"',
      'querResumo? `<Relationship Id="rId2"']))
chk("aba unica sai em .xlsx limpo, sem tocar no modelo do cliente",
    "if(modeloXlsmB64 && exportEscolha().conteudo.macro){" in novo)
chk("o .xlsm nao perde aba — o Resumo so deixa de ser preenchido",
    "if(!(opts && opts.pularResumo)){" in novo
    and "{ pularResumo: !!exportEscolha().conteudo.pularResumo }" in novo)
chk("juntar todas as areas ou uma por arquivo",
    novo.count("function agruparParaExportar(") == 1
    and "if(!exportEscolha().juntar) return agruparLinhasPorArea(linhasRaw);" in novo
    and novo.count("agruparParaExportar(") == 3)

print("\n=== 43. RASCUNHO DA EDICAO NAO SE PERDE COM RENDER DE FORA ===")
# A caixa "Editar" (Vai para o laudo) nao tinha oninput: nada guardava o que
# estava sendo digitado fora do proprio no do DOM. Um render() vindo de fora
# (sincronizacao com o OneDrive chegando em segundo plano, por exemplo)
# reconstroi a tela inteira a partir do ultimo texto SALVO, e o que estava
# sendo digitado, ainda nao salvo, sumia. __laudoRascunho guarda o rascunho
# em memoria (nunca no STATE) para sobreviver a esse redesenho.
chk("'let __laudoRascunho = null;' existe uma unica vez",
    novo.count("let __laudoRascunho = null;") == 1)
chk("a caixa de edicao le o rascunho e grava a cada tecla",
    'oninput="App.laudoRascunho(\'${campo}\', this.value)"' in novo
    and "(__laudoRascunho && __laudoRascunho.campo===campo) ? __laudoRascunho.texto : fin" in novo)
chk("'laudoRascunho(campo, texto){' existe uma unica vez",
    novo.count("laudoRascunho(campo, texto){") == 1)
# Sem limpar o rascunho ao trocar de campo/item, o texto de UM campo vazaria
# para a caixa de edicao de outro campo com o mesmo nome, num item diferente.
_pontos_limpeza = [
  "laudoAbrirItem(id){ STATE.ui.laudoRiscoId = id; STATE.ui.laudoEditandoCampo = null; __laudoRascunho = null;",
  "STATE.ui.laudoRiscoId = alvo.risco.id; STATE.ui.laudoEditandoCampo = null; __laudoRascunho = null;",
  "laudoEditar(campo){ STATE.ui.laudoEditandoCampo = campo; __laudoRascunho = null; render(); },",
  "laudoCancelarEdicao(){ STATE.ui.laudoEditandoCampo = null; __laudoRascunho = null; render(); },",
  "STATE.ui.laudoEditandoCampo = null; __laudoRascunho = null;\n    marcarAlterado(); render(); toast(\"Texto salvo no app\");",
]
chk("o rascunho e limpo em todo ponto de saida da edicao (abrir item, ir para, editar, cancelar, salvar)",
    all(p in novo for p in _pontos_limpeza))

print("\n=== 44. SOLUCAO NUNCA E SUBSTITUIDA PELA MITIGACAO EXISTENTE ===")
# laudoTextoOriginal trocava a proposta do inspetor (sugestaoMitigacao) pela
# descricao do que ja existe (descMedida) sempre que ALGUMA mitigacao estava
# marcada (medidaImplementada==="Sim") — mesmo com uma proposta de verdade
# escrita. A regra certa: proposta sempre que existir; descMedida so como
# ultimo recurso, quando nao ha proposta nenhuma.
chk("laudoTextoOriginal usa a proposta sempre, descMedida so como ultimo recurso",
    "return item.risco.sugestaoMitigacao || item.risco.descMedida || \"\";" in novo
    and 'return (item.risco.medidaImplementada==="Sim")' not in novo)
# O escritor tem que seguir a mesma regra: a solucao aprovada vai sempre para
# sugestaoMitigacao. Se voltasse a gravar em descMedida, apagaria a descricao
# da mitigacao EXISTENTE por cima, com o texto da SOLUCAO.
chk("aplicarLaudoAprovadoNasLinhas grava a solucao so em sugestaoMitigacao",
    "sugestaoMitigacao: t.solucao || item.risco.sugestaoMitigacao };" in novo
    and "if(medidaExistente) risco.descMedida = t.solucao" not in novo)
# As duas rotas de Excel que recalculavam o mesmo fallback (uma delas,
# xlsmLinhaResumo, na pratica nunca era usada — iaTextos.solucao ja vem
# pronto — mas precisa estar certa se algum dia for o caminho tomado).
chk("o fallback do Resumo no .xlsm modelo Corteva segue a mesma regra",
    'const mitigOriginal = risco.sugestaoMitigacao || risco.descMedida || "";' in novo)
chk("o fallback do Resumo na aba unica .xlsx segue a mesma regra",
    'const mitig=item.risco.sugestaoMitigacao||item.risco.descMedida||"Não informado.";' in novo)
# O Word (montarDadosMaquinaDocx) ja lia sugestaoMitigacao direto, sem o
# ternario — e por isso, ANTES desta entrega, exportava o texto ERRADO
# sempre que medidaImplementada era "Sim" (o escritor grava em descMedida,
# nao em sugestaoMitigacao, e o Word so le sugestaoMitigacao). Trava aqui
# para o Word nunca ganhar de volta esse mesmo ternario.
chk("o Word continua lendo sugestaoMitigacao direto, sem ternario novo",
    'const mitigacao = corrigirTextoMecanico(risco.sugestaoMitigacao) || "Não informado.";' in novo
    and 'risco.medidaImplementada==="Sim"?risco.sugestaoMitigacao' not in novo)
# Zona congelada do Modulo Completo: linhaResumo/buildResumoSheetXml/
# buildXlsxPackage alimentam exportarMasterXLSXFotos (identificador
# congelado) e NAO fazem parte desta correcao — o modelo de risco antigo
# pode ter uma regra propria, intencional, que nao e desta entrega para
# mexer. Ver frozen.py.
chk("linhaResumo do Modulo Completo (frozen-adjacente) nao foi tocada",
    'const mitig = risco.medidaImplementada==="Sim" ? risco.descMedida : (risco.sugestaoMitigacao||"Sem medida de mitigação registrada");' in novo)

print("\n=== 45. ICONE DE INFORMACAO NOS 4 CAMPOS DO HRN NA REVISAO DO LAUDO ===")
# Mesmo padrao do cadastro em campo (toggleInfoHrnPO), so que aqui os quatro
# campos (PO/FE/GPD/NP) sao editaveis na tela de revisao, entao os quatro
# ganham o icone -- no cadastro em campo so PO tinha.
chk("laudoInfoBtnHrn e laudoInfoBoxHrn existem uma unica vez cada",
    novo.count("function laudoInfoBtnHrn(campo){") == 1
    and novo.count("function laudoInfoBoxHrn(campo, tabela){") == 1)
chk("os 4 campos do bloco HRN usam o botao e a caixa",
    all(('laudoInfoBtnHrn("%s")' % k) in novo and ('laudoInfoBoxHrn("%s", HRN_%s_TABELA)' % (k, k.upper())) in novo
        for k in ["po","fe","gpd","np"]))
# As 3 tabelas que nao tinham desc (GPD vazio, FE e NP sem o campo) ganharam
# texto em toda linha -- sem isso o icone abriria uma caixa com espacos em
# branco, que e pior que nao ter icone.
chk("as tabelas de FE, GPD e NP ganharam desc em toda linha (antes so PO tinha)",
    novo.count('desc:""') == 0
    and re.search(r'const HRN_FE_TABELA=\[[^\]]*desc:', novo, re.S)
    and re.search(r'const HRN_NP_TABELA=\[[^\]]*desc:', novo, re.S))
chk("__laudoInfoHrn nasce fechado e some ao trocar de item",
    novo.count("let __laudoInfoHrn = { po:false, fe:false, gpd:false, np:false };") == 1
    and novo.count("__laudoInfoHrn = { po:false, fe:false, gpd:false, np:false };") == 3)
chk("laudoToggleInfoHrn existe e redesenha a tela",
    "laudoToggleInfoHrn(campo){ __laudoInfoHrn[campo] = !__laudoInfoHrn[campo]; render(); }," in novo)

print("\n=== 46. MITIGACAO EXISTENTE E SOLUCAO EM CARTOES SEPARADOS ===")
# O usuario mandou print mostrando os dois ainda dentro do MESMO cartao
# "Solucao / Mitigacao" e disse "estao juntos ainda" -- o quadro de
# mitigacao existente vivia DENTRO do cartao de Solucao. Agora cada um tem
# seu proprio cartao branco, na ordem certa. Nesta MESMA entrega, o cartao
# separado virou um campo de verdade (laudoBlocoCampo(item,"existente")) em
# vez de um wrapper a parte -- ver secao 47.
chk("laudoBlocoCampo nao chama mais laudoBlocoExistenteHtml por dentro do campo solucao",
    'campo==="solucao" ? laudoBlocoExistenteHtml(item) : ""' not in novo)
chk("o loop da tela insere o cartao de existente IMEDIATAMENTE ANTES do cartao de Solucao",
    'c.k==="solucao"? laudoBlocoCampo(item,"existente") : "") + laudoBlocoCampo(item, c.k)' in novo)
chk("o rotulo do campo Solucao nao carrega mais a Mitigacao no nome (afeta cartao + os 2 modais)",
    '{ k:"solucao", rot:"Solução",' in novo and 'rot:"Solução / Mitigação"' not in novo)
chk("o laudo impresso (A4) segue o mesmo rotulo novo",
    '<div class="lp-rc-rot">Solução</div>' in novo and '<div class="lp-rc-rot">Solução / Mitigação</div>' not in novo)

print("\n=== 47. MITIGACAO EXISTENTE GANHA IA E CHECKLIST EDITAVEL ===")
# Pedido do usuario: "as opcoes de IA como na Solucao" + "as mesmas
# possibilidades de selecao... assim como a secao de mitigacoes existentes
# da criacao dos Riscos". "existente" virou campo de verdade (sug/fin/st/
# duv, igual aos outros 4), mas fora de LAUDO_CAMPOS de proposito: nao e
# obrigatorio (muita maquina nao tem nada) e nao ganha coluna propria no
# Excel -- o texto final vai para descMedida, que ja tinha a coluna T.
chk("getLaudoRisco inicializa o estado de existente",
    novo.count('"existenteSug","existenteFin","existenteSt","duvExistente"') == 1
    and novo.count("if(!Array.isArray(l.existenteRefs)) l.existenteRefs = [];") == 1)
chk("laudoGet e laudoSet tem branch propria para existente, sem cair no else de solucao",
    'if(campo==="existente"){ const l = getLaudoRisco(item.risco);  return { sug:l.existenteSug' in novo
    and "}else if(campo===\"existente\"){" in novo)
chk("laudoTextoOriginal(existente) e a descMedida, nao a proposta da solucao",
    'if(campo==="existente") return item.risco.descMedida || "";' in novo)
chk("laudoEntradaExistente existe e instrui a IA a nao propor nada novo",
    novo.count("function laudoEntradaExistente(item){") == 1
    and "não proponha nenhuma ação nova" in novo)
chk("laudoTemMitigacaoExistente evita gerar texto da IA para maquina sem nada marcado",
    novo.count("function laudoTemMitigacaoExistente(r){") == 1)
chk("existente usa o mesmo prompt persona da Solucao (mitigacao_xlsx)",
    'existente:"mitigacao_xlsx"' in novo)
chk("laudoCampoDef cobre existente sem entrar em LAUDO_CAMPOS (nao conta no X de 4 campos)",
    novo.count('function laudoCampoDef(campo){') == 1
    and 'if(campo==="existente") return { k:"existente", rot:"Mitigação existente", sigla:"M" };' in novo
    and novo.count("const def = LAUDO_CAMPOS.find(c=>c.k===campo);") == 0)
chk("os 3 lugares que liam LAUDO_CAMPOS.find direto agora usam laudoCampoDef",
    novo.count("const def = laudoCampoDef(campo);") == 3)
chk("aplicarLaudoAprovadoNasLinhas escreve o texto aprovado de existente em descMedida",
    "descMedida: t.existente || item.risco.descMedida," in novo)
chk("o laudo impresso (A4) le o texto aprovado de existente em vez de recalcular sempre do checklist",
    'const existente = laudoTextoFinal(it, "existente");' in novo
    and "const existente = medidaTextoExistenteMulti(r) || String(r.descMedida||\"\").trim();" not in novo)
chk("laudoBlocoCampo troca o texto cru pelo checklist editavel so no campo existente",
    'campo==="existente"\n      ? laudoBlocoMedidaExistenteEditavelHtml(item)' in novo)
chk("os 5 handlers do checklist (laudo-scoped) existem, paralelos aos do cadastro em campo",
    all(novo.count(h) == 1 for h in [
        "laudoToggleMedidaExistente(rid, chave){",
        "laudoAcrescentarOutroExistente(rid){",
        "laudoRemoverOutroExistente(rid, i){",
        "laudoSetMedidaExistenteCampo(rid, campo, valor){",
        "laudoAplicarTextoMedidaExistenteMulti(rid){",
    ]))
chk("o checklist do cadastro em campo (blocoMedidaExistenteHtml) nao foi tocado",
    'onclick="App.toggleMedidaExistente(\'${m.k}\')"' in novo
    and 'onclick="App.acrescentarOutroExistente()"' in novo)

print("\n=== 48. HRN E NIVEL DE DESEMPENHO EMPILHADOS NA MESMA CELULA DO GRID ===")
# .laudo-grid e um CSS grid comum (nao masonry): com 7 celulas soltas, HRN e
# "Nivel de desempenho requerido" caiam em colunas DIFERENTES (2 ou 3
# colunas conforme a largura) e nunca ficavam um embaixo do outro de
# verdade -- o usuario pediu para otimizar o espaco juntando os dois.
chk("HRN e o Nivel de desempenho viram UMA celula so do grid (par, nao impar)",
    'grid">\n    ${LAUDO_CAMPOS.map(c=> (c.k==="solucao"? laudoBlocoCampo(item,"existente") : "") + laudoBlocoCampo(item, c.k)).join("")}\n    <div style="display:flex;flex-direction:column;gap:12px">\n      ${laudoBlocoHRN(item)}' in novo)

print("\n=== 49. 'PEDIR UM AJUSTE A IA' MOSTRA QUE ESTA TRABALHANDO ===")
# Antes so um toast ("Pedindo a IA... aguarde") que passa rapido -- se a
# resposta demorasse mais que o toast, quem clicou ficava sem nenhum sinal
# de que ainda estava rodando. Vale para os 5 campos com este recurso
# (escopo/tarefa/risco/existente/solucao), porque o motor e o mesmo
# laudoBlocoCampo/laudoRefazer generico, nao uma copia por campo.
chk("__laudoRefazendo existe e comeca nulo",
    novo.count("let __laudoRefazendo = null;") == 1)
chk("laudoBlocoCampo calcula 'refazendo' comparando rid E campo (nao vaza entre campos do mesmo risco)",
    'const refazendo = !!(__laudoRefazendo && __laudoRefazendo.rid===rid && __laudoRefazendo.campo===campo);' in novo)
chk("o botao tem 2 estados exclusivos: Pensando (desabilitado, com spinner) ou clicavel",
    'id="${idBtnRefazer}" disabled><span class="btn-spinner"></span> Pensando' in novo
    and 'id="${idBtnRefazer}" onclick="App.laudoRefazer' in novo)
chk("App.laudoRefazer marca o estado ANTES do await, nao depois (senao a tela fica muda ate a resposta)",
    novo.find("__laudoRefazendo = { rid, campo, inicio: Date.now() };") <
    novo.find("await refazerSugestaoLaudo(item, campo, instrucao);"))
chk("o contador de segundos busca o botao de novo a cada tick (sobrevive a um render() vindo de fora)",
    "const btn = document.getElementById(idBtn);\n      if(!btn || !__laudoRefazendo) return;" in novo)
chk("finally sempre limpa o intervalo e zera o estado, mesmo se a IA falhar",
    "} finally {\n      clearInterval(tique);\n      __laudoRefazendo = null;\n      render();\n    }" in novo)
chk("o toast fantasma que sumia rapido foi removido, nao duplicado",
    novo.count('toast("Pedindo à IA') == 0)
chk("CSS do spinner existe uma unica vez",
    novo.count(".btn-spinner{") == 1 and novo.count("@keyframes girar{") == 1)

print("\n=== 50. 'GERAR O QUE FALTA' RESPEITA O FILTRO DE AREA/EQUIPAMENTO/TAREFA ===")
# O botao mostrava "Gerar o que falta (6)" com um filtro de equipamento
# ativo, mas o clique ignorava os 3 seletores e cobria o laudo INTEIRO
# (todas as areas exportaveis) -- o numero no botao e o que ele fazia de
# verdade nao batiam. O usuario pediu para o clique respeitar o filtro,
# igual ao numero que ja aparece no botao.
_lgf = novo.find("async laudoGerarFaltantes(){")
_fimLgf = novo.find("\n  async laudoGerarTudoDeNovo(){", _lgf)
_trechoLgf = novo[_lgf:_fimLgf]
chk("laudoGerarFaltantes usa laudoItensFiltradosPorEscolha, nao o laudo inteiro",
    _lgf > 0 and "const base = laudoItensFiltradosPorEscolha(laudoItensDoEscopo());" in _trechoLgf
    and "const pend = laudoLinhasComPendencia(base);" in _trechoLgf
    and "laudoLinhasComPendencia(laudoItensDoEscopo())" not in _trechoLgf)
chk("laudoGerarTudoDeNovo (Refazer sugestoes) continua cobrindo tudo de proposito -- o confirm() ja avisa isso",
    "Reescrever as sugestões da IA de todas as linhas?" in novo
    and "const itens = laudoItensDoEscopo();" in novo)

print("\n=== 51. CHECKLIST DA MITIGACAO EXISTENTE EM GRUPOS RECOLHIVEIS ===")
# Com os 5 grupos (Protecao fisica, Dispositivos de seguranca, Eletrica e
# energia, Acesso e altura, Organizacional) sempre abertos, a tela ficava
# enorme so pra revisar 1 risco. Usuario pediu: fechado por padrao,
# mostrando so o que ja foi marcado em campo, com opcao de abrir.
chk("__laudoGrupoExistenteAberto existe e comeca vazio",
    novo.count("let __laudoGrupoExistenteAberto = {};") >= 1)
chk("fechado, so mostra os itens JA marcados do grupo (nao a lista toda)",
    "const marcadosDoGrupo = g.itens.filter(m=>marcadas.indexOf(m.k)>=0);" in novo
    and "const itensMostrados = aberto ? g.itens : marcadosDoGrupo;" in novo)
chk("grupo vazio (fechado, nada marcado) nao desenha a caixa de chips a toa",
    "${itensMostrados.length? `<div class=\"medida-chips\">" in novo)
chk("laudoToggleGrupoExistente existe e redesenha a tela",
    "laudoToggleGrupoExistente(nomeGrupo){ __laudoGrupoExistenteAberto[nomeGrupo] = !__laudoGrupoExistenteAberto[nomeGrupo]; render(); }," in novo)
chk("trocar de risco fecha os grupos de novo (senao o que abriu vaza pro proximo risco)",
    novo.count("__laudoGrupoExistenteAberto = {};") == 3)

print("\n=== 52. DIGITAR NA DESCRICAO DA MITIGACAO EXISTENTE NAO ROLA A PAGINA ===")
# Usuario reportou a pagina rolando sozinha ao digitar em campos do laudo.
# A textarea "Descricao da mitigacao existente (editavel)" (adicionada na
# MESMA sessao que o checklist editavel) chamava render() a cada tecla --
# isso destroi e recria o proprio textarea onde a pessoa esta digitando,
# derrubando foco e cursor. Campos de texto mais antigos (empresa/cidade
# do projeto, plaqueta) nunca tiveram isso porque nunca chamam render()
# por tecla, so em cliques/selecoes discretas.
_ism = novo.find("laudoSetMedidaExistenteCampo(rid, campo, valor){")
_fimIsm = novo.find("laudoAplicarTextoMedidaExistenteMulti(rid){", _ism)
_trechoIsm = novo[_ism:_fimIsm] if _ism > 0 else ""
chk("'desc' (digitacao livre) nao chama render() a cada tecla",
    _ism > 0 and 'if(campo !== "desc") render();' in _trechoIsm
    and "marcarAlterado(); render();" not in _trechoIsm)
chk("'situacao'/'ressalva' (clique/selecao) continuam sincronizando e redesenhando",
    'if(campo !== "desc") sincronizarDescMedidaExistente(r);' in _trechoIsm)

print("\n=== 53. TIPO DE EQUIPAMENTO E MANUAL ENTRAM NA REVISAO DO LAUDO ===")
# Preenchidos no cadastro da maquina, mas nao apareciam em NENHUM lugar da
# revisao do laudo -- so no inventario (Excel/impressao). Usuario pediu
# para todo campo preenchido em campo aparecer para avaliacao final.
chk("os dois campos entram no cartao da Plaqueta, com o select certo de cada um",
    'onchange="App.laudoSetPlaqueta(\'${rid}\',\'tipoEquip\', this.value)">${selectOptions(TIPOS_EQUIPAMENTO,' in novo
    and 'onchange="App.laudoSetPlaqueta(\'${rid}\',\'manual\', this.value)">${selectOptions(MANUAL_OPCOES,' in novo)
chk("o contador do cartao passou de 6 para 8 campos, contando os dois novos",
    "const totalCamposPlaqueta = LAUDO_PLAQUETA_CAMPOS.length + 2;" in novo
    and '${preenchidos}/${totalCamposPlaqueta} campos' in novo)
chk("sem selo de confirmacao nos dois -- decisao explicita do usuario, so mostrar",
    "tipoEquipOk?1:0" in novo and "manualOk?1:0" in novo)

print("\n=== 54. FE/NP SEMPRE DA TAREFA (SEM EXCECAO POR RISCO) + ALERTA VERMELHO ===")
# Historico desta secao, dentro da MESMA entrega: primeiro veio o pedido de
# destacar em vermelho Frequencia/No de pessoas sem preenchimento na
# tarefa (FE/NP ainda eram <select> por risco, com prioridade sobre a
# tarefa). Na sequencia o usuario testou e viu dois riscos da MESMA tarefa
# com No de pessoas diferente -- e decidiu que FE/NP devem ser SEMPRE da
# tarefa, sem excecao nenhuma (o que continua ajustavel por risco e o
# Nivel de desempenho requerido/PLr, outro cartao). As checagens abaixo
# sao do estado FINAL, nao da etapa intermediaria.
chk("hrnDoItem nao le mais risco.fe/risco.np -- fe/np vem so da tarefa",
    "const fe  = sugerirFE(valOuOutro(tarefa.frequencia, tarefa.frequenciaOutro));" in novo
    and "const np  = sugerirNP(valOuOutro(tarefa.numPessoas, tarefa.numPessoasOutro));" in novo
    and "risco.fe ? valorPorClassificacaoHRN(HRN_FE_TABELA, risco.fe)" not in novo
    and "risco.np ? valorPorClassificacaoHRN(HRN_NP_TABELA, risco.np)" not in novo)
chk("PO e GPD continuam <select> por risco, sem parametro de alerta (nunca ficam vermelhos)",
    novo.count('function laudoSelectHRN(rid, chave, tabela, valorAtual, rotuloAuto, origem){') == 1
    and novo.count('laudoSelectHRN(rid,"po",HRN_PO_TABELA,r.po||"",autoPO,"Estimado")') == 1
    and novo.count('laudoSelectHRN(rid,"gpd",HRN_GPD_TABELA,r.gpd||"",autoGPD,"Estimado")') == 1)
chk("FE e NP viraram exibicao so-leitura (laudoValorTarefaHrn), nao <select>",
    novo.count("function laudoValorTarefaHrn(rotulo, alerta){") == 1
    and 'laudoSelectHRN(rid,"fe"' not in novo and 'laudoSelectHRN(rid,"np"' not in novo
    and novo.count('${laudoValorTarefaHrn(freqTarefa? "Da tarefa ("+freqTarefa+"): "+autoFE : "Sem frequência na tarefa", !freqTarefa)}') == 1
    and novo.count('${laudoValorTarefaHrn(npTarefa? "Da tarefa ("+npTarefa+"): "+autoNP : "Sem nº na tarefa", !npTarefa)}') == 1)
chk("vermelho (borda + fundo + texto) só quando a tarefa não tem o dado, sem botão de confirmar",
    'border:1.5px solid #B3261E;background:#FDE7E5;color:#8C1D18;border-radius:' in novo
    and "A tarefa não tem frequência informada — edite a tarefa para preencher." in novo
    and "A tarefa não tem nº de pessoas informado — edite a tarefa para preencher." in novo)

print("\n=== 55. REDESENHO DE FUNDO NAO DERRUBA MAIS O FOCO DE QUEM DIGITA ===")
# Usuario reportou de novo, depois do fix anterior (laudoSetMedidaExistenteCampo
# parar de chamar render() por tecla): "a pagina subir para o top ainda
# aparece mas com uma frequencia bem menor". Causa restante: a varredura
# periodica de fundo (a cada 2 minutos -- sincronizacao incremental,
# estimativa de pendente, estatistica de armazenamento) chama render()
# quase sempre, mesmo sem nada relevante ter mudado -- raro coincidir com
# alguem digitando, mas acontece. renderAdiavelSeDigitando() adia esses
# render() de fundo para quando o foco sair do campo de texto, em vez de
# reconstruir o proprio campo em que a pessoa esta no meio de uma tecla.
chk("renderAdiavelSeDigitando existe e so adia quando input/textarea tem foco",
    novo.count("function renderAdiavelSeDigitando(){") == 1
    and 'ae.tagName==="INPUT" || ae.tagName==="TEXTAREA"' in novo
    and "__renderAdiadoPendente = true;" in novo)
chk("o listener de focusout dispara o redesenho adiado quando o foco sai de vez",
    'document.addEventListener("focusout", ()=>{' in novo
    and "if(!__renderAdiadoPendente) return;" in novo)
chk("os 4 gatilhos de fundo identificados usam a versao adiavel, nao render() direto",
    "if((cfgIA && cfgIA.recebeu) || (equipe && equipe.recebeu)) renderAdiavelSeDigitando();" in novo
    and 'journalLimpar(); // STATE gravado com os itens dentro — o diário deles virou redundância\n    renderAdiavelSeDigitando();' in novo
    and "onedriveSalvarStatusPendente(upload, download); renderAdiavelSeDigitando();" in novo
    and "__statusArmazenamentoCache = { espaco, persistente };\n  renderAdiavelSeDigitando();" in novo)
chk("nenhuma acao DIRETA do usuario foi trocada por engano -- render() comum continua sendo a maioria",
    novo.count("render();") > 50)

print("\n=== 56. MENU '...' (VISUALIZAR/COPIAR/EXCLUIR) NO CARTAO E NO ITEM DO LAUDO ===")
# Usuario pediu os mesmos 3 atalhos que ja existiam na lista de riscos do
# cadastro em campo (menuRiscoS), tanto no cartao da lista do laudo quanto
# dentro da tela do proprio risco. abrirModalRiscoS e removerRiscoS sao
# REAPROVEITADOS -- mas os dois so acham a tarefa DENTRO do projeto
# "atual" (STATE.ui.projetoSId), que a aba Laudo nunca seta (so seta
# laudoRiscoId). Bug real encontrado testando no navegador antes de
# publicar: sem sincronizar o "atual" a partir do risco antes de abrir o
# menu, as 3 acoes abririam normalmente mas falhariam caladas.
_imlc = novo.find("menuLaudoCard(rid, tarefaId){")
_fimImlc = novo.find("laudoCopiarRisco(rid){", _imlc)
_trechoImlc = novo[_imlc:_fimImlc] if _imlc > 0 else ""
chk("menuLaudoCard resolve o item via laudoItemPorId (nao depende do 'atual')",
    _imlc > 0 and "const item = laudoItemPorId(rid);" in _trechoImlc)
chk("menuLaudoCard sincroniza projeto/area/maquina/tarefa 'atuais' antes de abrir o menu",
    "STATE.ui.projetoSId = item.proj.id; STATE.ui.areaSId = item.area.id;" in _trechoImlc
    and "STATE.ui.maquinaSId = item.maquina.id; STATE.ui.tarefaSId = item.tarefa.id;" in _trechoImlc)
_fimLcr = novo.find("laudoAbrirItem(id){", _imlc)
_trechoLcr = novo[novo.find("laudoCopiarRisco(rid){", _imlc):_fimLcr]
chk("laudoCopiarRisco tambem usa laudoItemPorId -- nao volta a depender de buscarTarefaSimplesPorId",
    "const item = laudoItemPorId(rid);" in _trechoLcr
    and "item.tarefa.riscos.push(novo);" in _trechoLcr
    and "buscarTarefaSimplesPorId" not in _trechoLcr)
chk("copiar abre a copia na revisao do laudo, nao deixa a tela no risco antigo",
    "App.laudoAbrirItem(novo.id);" in _trechoLcr)
chk("botao '...' existe no cartao da lista e dentro da tela do item, os dois chamando menuLaudoCard",
    "onclick=\"event.stopPropagation();App.menuLaudoCard('${it.risco.id}','${it.tarefa.id}')\"" in novo
    and "onclick=\"App.menuLaudoCard('${item.risco.id}','${item.tarefa.id}')\"" in novo)
chk("as 3 opcoes (visualizar/copiar/excluir) estao no menu, excluir marcado como perigoso",
    "label:\"Visualizar / editar o risco\", icon:\"edit\", onclick:`App.abrirModalRiscoS('${rid}','${tarefaId}')`" in _trechoImlc
    and "label:\"Copiar risco\", icon:\"copy\", onclick:`App.laudoCopiarRisco('${rid}')`" in _trechoImlc
    and "label:\"Excluir risco\", icon:\"trash\", onclick:`App.removerRiscoS('${rid}','${tarefaId}')`, danger:true" in _trechoImlc)
chk("cartao ganhou espaco reservado para o botao, sem sobrepor o selo do HRN",
    ".laudo-card{margin-bottom:8px;position:relative;}" in novo
    and ".laudo-card-in{display:flex;gap:10px;align-items:flex-start;padding:10px 40px 10px 10px;" in novo)

print("\n---------------------------------------")
print("CHECAGENS ESTRUTURAIS:", "FALHOU (%d)" % falhas if falhas else "TODAS OK")
sys.exit(1 if falhas else 0)
