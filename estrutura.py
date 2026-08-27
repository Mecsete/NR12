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
# O +3 de oneDriveDeltaFila era da entrega do diagnostico/limpar fila: a
# referencia (original.html) JA vem daquele commit, entao contar de novo
# somaria duas vezes. Zerado.
# exclusoesConfirmadas +6: a lapide deixou de ser um dado so local e virou um
# dado SINCRONIZADO (ver secao 69) — o pacote que viaja, a mesclagem por uniao
# e a aplicacao na arvore tocam o mapa em pontos novos, de proposito.
# "lapide" saiu desta lista: a palavra agora aparece em dezenas de comentarios
# do subsistema novo, e pinar a contagem exata quebraria a validacao a cada
# comentario escrito. O que importa dela e estrutural e esta na secao 69.
# O +6 de exclusoesConfirmadas era da entrega da lapide sincronizada: a
# referencia (original.html) JA vem daquele commit, entao contar de novo
# somaria duas vezes -- exatamente o que ja tinha acontecido com
# oneDriveDeltaFila logo acima. Zerado pelo mesmo motivo.
# oneDriveDeltaFila +5 (entrega do dreno da fila no scan completo): a fila do
# delta so era esvaziada por onedriveDeltaProcessarFila, chamado so no
# caminho rapido do ciclo automatico -- nem a varredura completa (automatica
# ou pelo botao "Sincronizar agora") nem o caminho de resync a tocavam. Um
# item anunciado ficava "esperando processar" no diagnostico para sempre
# mesmo com o mesmo dado ja tendo chegado por fora. +3 chamadas novas a
# onedriveDeltaProcessarFila (2 no ciclo automatico, 1 no botao manual) +2
# ocorrencias em comentarios explicando o motivo -- por isso e o codigo
# comentado que soma 5, nao so as chamadas. Some ao ORIGINAL na proxima
# geracao de original.html (mesmo padrao do oneDriveDeltaFila/exclusoesConfirmadas acima).
_extra = {"oneDriveDeltaFila": 5, "exclusoesConfirmadas": 0}
for marca in ["oneDriveDeltaFila", "tombstone", "exclusoesConfirmadas", "__backupV2AplicarLinha"]:
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
                 ('laudo-th', 14),
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
# Piso de 20.000 para 5.000 bytes: aquele numero foi escrito quando a entrega
# em questao acrescentava modulos inteiros. Uma correcao cirurgica no motor de
# sincronizacao cresce alguns milhares de bytes e nao pode ser reprovada por
# isso. O teto (que e o que pega acidente grosseiro, tipo foto embutida por
# engano) continua igual.
# Piso de 5.000 para 500 bytes: uma correcao de uma funcao so (como a da
# secao 73) cresce pouco mais de 3 KB, e ja foi reprovada por isso. O piso
# nunca foi a defesa real contra "nao mudou nada" -- essa defesa sao as
# checagens por funcionalidade de cada secao, que exigem o texto exato do
# que entrou. O piso so pega o arquivo trocado por engano por um identico.
chk("crescimento coerente com o que a entrega mexeu (%d bytes)" % d, 500 < d < 700000, "delta=%d" % d)
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
# 3 = equipe + IA + lapides: as tres mesclagens por uniao usam exatamente o
# mesmo contrato de retorno. A de lapides entrou nesta entrega (secao 69).
chk("aplicarPacoteIA devolve {mudou, faltaNoRemoto} (nao mais booleano)",
    novo.count("return { mudou, faltaNoRemoto };") == 3
    and novo.count("if(Array.isArray(pacote.normas)) STATE.ui.normasIA = pacote.normas.filter(n=>n && n.texto);") == 0)
chk("a substituicao em bloco das instrucoes foi removida",
    novo.count("c.prompts = { ...IA_PROMPTS_PADRAO, ...p.prompts };") == 0)
# marcarChaveIAAlterada() passou a exigir o provedor (carimbo por provedor,
# ver secao 22) -- os 2 pontos de edicao (colar a chave / remover a chave)
# agora chamam com o provedor explicito, nao mais sem parametro nenhum.
chk("cada ponto de edicao carimba a parte certa",
    novo.count("marcarPromptAlterado(tipo);") == 1
    and novo.count("marcarChaveIAAlterada(getIAConfig().provedor);") == 1
    and novo.count("marcarChaveIAAlterada(provedor);") == 1
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
# getApiKeyEm() virou um espelho do carimbo POR PROVEDOR (getApiKeysEm) do
# provedor ativo agora -- existe so para o pacote de sincronizacao continuar
# levando os 2 campos antigos (apiKey/apiKeyEm) tambem, para um aparelho
# ainda na versao anterior a chave-por-provedor continuar recebendo algo.
chk("a chave que ja existia ganha carimbo e passa a viajar",
    novo.count("function getApiKeyEm(") == 1
    and novo.count("porProvedor[pid] = getIAApiKey() ? agoraSync() : 0;") == 1
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
# Excel, Word, a geracao de textos e (desde 26/08/2026) a recuperacao de
# fotos perdidas. Sem finally o painel ficaria preso na tela — exatamente o
# defeito do aviso que se renovava sozinho.
chk("o painel fecha em qualquer desfecho",
    len(re.findall(r"\}\s*finally\s*\{[^}]*progressoFechar", novo)) == 4
    and novo.count("progressoFechar(painelExport)") == 1
    and novo.count("progressoFechar(painelWord)") == 1
    and novo.count("finally{ progressoFechar(meuPainel); }") == 1
    and novo.count("finally{\n      progressoFechar(souDono);\n    }") == 1)
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
    and novo.count('laudoSelectHRN(rid,"gpd",HRN_GPD_TABELA,gpdCanonico(r.gpd),autoGPD,"Estimado")') == 1)
chk("FE e NP viraram exibicao so-leitura (laudoValorTarefaHrn), nao <select>",
    novo.count("function laudoValorTarefaHrn(rotulo, alerta){") == 1
    and 'laudoSelectHRN(rid,"fe"' not in novo and 'laudoSelectHRN(rid,"np"' not in novo
    and novo.count('${laudoValorTarefaHrn(freqTarefa? "Da tarefa ("+freqTarefa+"): "+autoFE : "Sem frequência na tarefa", !freqTarefa)}') == 1
    and novo.count('${laudoValorTarefaHrn(npTarefa? "Da tarefa ("+npTarefa+"): "+autoNP : "Sem nº na tarefa", !npTarefa)}') == 1)
chk("vermelho (borda + fundo + texto) só quando a tarefa não tem o dado",
    'border:1.5px solid #B3261E;background:#FDE7E5;color:#8C1D18;border-radius:' in novo
    and "A tarefa não tem frequência informada." in novo
    and "A tarefa não tem nº de pessoas informado." in novo)
# 19/08: em vez de só um texto pedindo para editar a tarefa em outra tela, o
# alerta ganhou um botão que abre o MESMO modal de edição de tarefa usado no
# cadastro em campo (abrirModalTarefaS) — sem sair da página do laudo.
# 21/08: os botoes passaram a chamar App.laudoEditarTarefa, que sincroniza o
# projeto "atual" ANTES de abrir. Chamando abrirModalTarefaS direto, como era
# antes, o modal nao abria quando a pessoa entrava direto no Laudo (o estado em
# que STATE.ui.projetoSId ainda esta vazio) -- falha calada.
chk("o alerta de FE/NP sem preenchimento tem botão que abre a tarefa sem sair do laudo",
    novo.count("App.laudoEditarTarefa('${item.risco.id}')") == 2)

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
# 21/08: as quatro atribuicoes sairam de dentro de menuLaudoCard e viraram
# laudoSincronizarAtuais, porque os atalhos NOVOS (editar equipamento, editar
# tarefa) precisavam exatamente da mesma coisa e falhavam calados sem ela.
# A checagem passou a cobrir o ponto unico onde isso agora mora.
chk("menuLaudoCard sincroniza projeto/area/maquina/tarefa 'atuais' antes de abrir o menu",
    "laudoSincronizarAtuais(item);" in _trechoImlc)
chk("laudoSincronizarAtuais faz as quatro sincronizacoes, num lugar so",
    novo.count("function laudoSincronizarAtuais(item){") == 1
    and "if(item.proj)    STATE.ui.projetoSId = item.proj.id;" in novo
    and "if(item.area)    STATE.ui.areaSId    = item.area.id;" in novo
    and "if(item.maquina) STATE.ui.maquinaSId = item.maquina.id;" in novo
    and "if(item.tarefa)  STATE.ui.tarefaSId  = item.tarefa.id;" in novo)
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

print("\n=== 57. CABECALHO DO RISCO NO PC: FOTOS MAIORES + SIGLAS E-T-R-S ===")
# Usuario pediu, so para a versao PC (o mesmo ponto de corte de 900px que ja
# separa layout mobile/desktop no resto da tela do laudo): as miniaturas de
# equipamento/risco no dobro do tamanho (56x44 -> 112x88) e os 4 selos
# E-T-R-S (mesmo componente laudoSiglaChip ja usado na lista de cartoes,
# reaproveitado -- nao duplicado) mostrando quais campos ja tem texto
# aplicado. No celular nada muda: selos ficam escondidos e a miniatura
# continua do tamanho de sempre.
chk("miniaturas dobram de tamanho so a partir de 900px (o dobro do que ja era o tamanho de PC)",
    ".laudo-topo-thumbs .laudo-th{width:112px;height:88px;}" in novo
    and ".laudo-topo-thumbs .laudo-th{width:44px;height:36px;border-radius:7px;}" in novo)
chk("selos E-T-R-S comecam escondidos (mobile) e so aparecem a partir de 900px",
    ".laudo-topo-siglas{display:none;flex-shrink:0;gap:4px;}" in novo
    and ".laudo-topo-siglas{display:flex;}" in novo)
chk("cabecalho do risco desenha os 4 selos reaproveitando laudoSiglaChip (mesma logica de cor da lista)",
    '<div class="laudo-topo-siglas">${LAUDO_CAMPOS.map(c=>laudoSiglaChip(item, c.k, c.sigla)).join("")}</div>' in novo)

print("\n=== 58. GERACAO EM LOTE DA IA PARA CEDO E AVISA O MOTIVO NA HORA ===")
# Usuario relatou: a IA tinha estourado o limite de uso, mas a geracao em
# lote ("Gerar o que falta") continuava tentando os 30 campos, um por um,
# cada um com ate 5 tentativas internas (chamarIAResiliente ja tinha isso),
# sem dar nenhum sinal de que estava tudo falhando -- so no final, depois
# de ~12 minutos, o toast dizia o motivo. Pedido do usuario: o app parar e
# mostrar o motivo, sem deixar a pessoa esperando a toa. Duas falhas
# SEGUIDAS (cada uma ja passou pelas 5 tentativas internas) e o gatilho --
# uma falha isolada (blip de rede) nao para nada, so a repeticao para.
chk("registrarResultadoCampo existe: limpa o aviso e zera a contagem no sucesso, acumula e avisa na falha",
    "let falhasSeguidas = 0, paradoPorFalhas = false;" in novo
    and "const LIMITE_FALHAS_SEGUIDAS = 2;" in novo
    and 'progressoAtualizar(undefined, undefined, undefined, "Sem resposta da IA — " + (__iaMotivoFalha || "motivo desconhecido"));' in novo
    and "if(falhasSeguidas >= LIMITE_FALHAS_SEGUIDAS) paradoPorFalhas = true;" in novo)
chk("os 3 pontos que chamam a IA (escopo, tarefa, risco/existente/solucao em paralelo) registram o resultado e podem parar o lote",
    novo.count("registrarResultadoCampo(!!jEscopo.texto);") == 1
    and novo.count("registrarResultadoCampo(!!j.texto);") == 2
    and novo.count("if(paradoPorFalhas) break;") == 3)
chk("painel de progresso ganhou uma linha de aviso visivel (nao só um toast escondido até o fim)",
    ".prog-aviso{font-size:11.5px;font-weight:700;color:#8A5B00;background:#FFF3D6;" in novo
    and '<div class="prog-aviso" id="progAviso" style="display:none"></div>' in novo
    and "function progressoAtualizar(feito, total, sub, aviso){" in novo)
chk("laudoGerarLinha (gerar 1 linha) tambem mostra o motivo da falha, igual laudoGerarFaltantes ja mostrava",
    'toast(__iaCelulasVazias>0 ? `Alguns campos não puderam ser gerados${__iaMotivoFalha? ` — ${__iaMotivoFalha}` : ""}` : "Textos gerados", __iaCelulasVazias===0);' in novo)

print("\n=== 59. RISCO + MITIGACAO EXISTENTE + SOLUCAO PEDIDOS EM PARALELO ===")
# Usuario reportou a IA demorando muito para escrever os textos. Os 3 campos
# de um mesmo risco eram pedidos um de cada vez -- ate 3 idas e voltas
# sequenciais por risco, esperando a resposta de um para so entao pedir o
# proximo. Nenhum dos 3 depende do texto que os outros vao gerar (cada um
# parte so do que o inspetor preencheu em campo), entao agora sao
# disparados juntos via Promise.all -- igual ja era feito para o escopo do
# equipamento (equipamento+escopo, mais acima na mesma funcao).
_irp = novo.find("const camposPendentes = [];")
_fimIrp = novo.find("if(i % 5 === 4) marcarAlterado();", _irp)
_trechoIrp = novo[_irp:_fimIrp] if _irp > 0 else ""
chk("cache de reuso continua resolvido na hora, sem virar chamada paralela",
    _irp > 0 and "gravados++; camposFeitos++;\n        continue;" in _trechoIrp
    and "camposPendentes.push({ campo, orig, ch, entradaCampo: laudoEntradaComReferencias(item, campo, orig, exemplos[campo]) });" in _trechoIrp)
chk("as chamadas pendentes disparam TODAS juntas (Promise.all), nao uma esperando a outra",
    "const respostas = await Promise.all(camposPendentes.map(p=> chamarIAResiliente(LAUDO_TIPO_PROMPT[p.campo], p.entradaCampo.texto)));" in _trechoIrp)
chk("cada resposta ainda passa por registrarResultadoCampo e pelo reuso, na mesma ordem em que foi pedida",
    "registrarResultadoCampo(!!j.texto);" in _trechoIrp
    and 'if(orig.trim()) reuso.set(ch, { texto:j.texto, duv:j.duvida||"", refs:entradaCampo.refs });' in _trechoIrp)
chk("so existe UMA pausa de 250ms por risco agora (depois do lote), nao mais uma por campo",
    novo.count("await esperar(250);") == 1)
chk("o aviso na tela junta os campos pedidos numa frase so, em vez de trocar um por vez",
    'camposPendentes.map(p=>CAMPO_ROTULO[p.campo]||p.campo).join(" + ")' in novo)

print("\n=== 60. APARELHO QUE NAO CRIOU NADA NAO REENVIA A ARVORE ===")
# Defeito relatado em campo e reproduzido com o codigo real: o motor tinha
# DUAS memorias respondendo a mesma pergunta. O recebimento perguntava "ja
# tenho este arquivo?" e o envio perguntava "ja enviei este arquivo?", em
# memorias diferentes. Aparelho com os dados mas sem o mapa de assinaturas
# (restaurou backup -- o mapa e excluido de proposito do backup --, limpou
# dados do navegador, reinstalou) fazia o recebimento responder "ja tenho,
# pulo" SEM gravar nada, e o envio responder "nunca mandei, mando tudo".
chk("sem assinatura, 'nao sei' -- nao mais 'nao mudou' (era a linha de origem do defeito)",
    "if(!reg) return !!seAindaNaoSabe;" in novo
    and "if(!reg) return false; // sem assinatura o item nem foi enviado/baixado por aqui" not in novo)
chk("sem assinatura, tamanho igual NAO basta -- confere o texto de verdade (protege edicao de campo)",
    "  if(!onedriveAssinaturaDe(chave)) return false;\n  if(tamanhoTextoLocalDoItem(tipo, itemLocal) !== tamanhoRemoto) return false;" in novo)
chk("os dois atalhos do cache de convergencia so valem com assinatura ja existente",
    "if(onedriveAssinaturaDe(chave) && arquivoJaExistente(arq.caminho, arq.tamanho)){" in novo
    and "&& !(onedriveAssinaturaDe(\"risco:\"+riscoExistente.id) && arquivoJaExistente(arq.caminho, arq.tamanho))" in novo)
chk("item convergido tambem assina -- e o que reconstroi o mapa sem enviar nada",
    "if(descritor.tipo !== \"fotos\" && (inseriu || onedriveItemJaConvergido(descritor, dados)))" in novo
    and novo.count("function onedriveItemJaConvergido(descritor, dados){") == 1
    and novo.count("function onedriveItemLocalNoLugarDoDescritor(descritor, id){") == 1)
chk("so assina quando os carimbos sao IGUAIS -- versao local mais nova continua subindo",
    "return (dados.atualizadoEm || dados.criadoEm || 0) === (local.atualizadoEm || local.criadoEm || 0);" in novo)
# Conflito de POSICAO: o mesmo item movido para pais diferentes em dois
# aparelhos deixa DUAS copias na nuvem, em enderecos diferentes. Uma busca
# solta pela arvore acharia o item (no endereco vencedor) mesmo estando
# lendo o arquivo da copia orfa -- e a assinatura sairia apontando para a
# pasta errada. Descendo pelos ids de pai do proprio descritor, a orfa
# simplesmente nao e reconhecida.
chk("a busca desce pelos ids do descritor -- copia orfa noutro endereco nao e reconhecida",
    "const local = onedriveItemLocalNoLugarDoDescritor(descritor, dados.id);" in novo
    and "const proj = projs.find(p=>p.id===descritor.projId);" in novo
    and "const area = (proj.areas||[]).find(a=>a.id===descritor.areaId);" in novo
    and "onedriveItemLocalPorTipoId" not in novo)
chk("cinto de seguranca: envio automatico espera a primeira varredura com o mapa vazio",
    novo.count("function onedriveEnvioAutomaticoDeveEsperar(){") == 1
    and "if(!onProgresso && onedriveEnvioAutomaticoDeveEsperar()) return;" in novo
    and "if(onedriveCarregarAssinaturas(__assinaturasOneDriveSimples).size > 0) return false;" in novo)
chk("a varredura de recebimento libera o envio ao terminar (nao trava para sempre)",
    novo.count("let __downloadJaVarreuNestaSessao = false;") == 1
    and novo.count("__downloadJaVarreuNestaSessao = true;") == 1)
chk("nada do filtro de pendentes do envio foi alterado -- a correcao e toda do lado do recebimento",
    "    if(!registro) return true;                              // nunca subiu" in novo
    and "    if(registro.atualizadoEm !== it.atualizadoEm) return true; // mudou desde a última subida" in novo)

print("\n=== 61. PAGINA DE BACKUP LIMPA: UM PAINEL SO, SECOES AGRUPADAS ===")
# A pagina tinha 9 secoes alternando assunto (Sincronizacao / Backup /
# Sincronizacao / Backup...), "Aparencia" no meio sem pertencer a nenhum dos
# dois, e QUATRO geradores de painel empilhados dentro de "Entre aparelhos"
# (syncProgressoHtml + syncGruposHtml + onedriveStatusPendenteHtml +
# onedriveDiagnosticoInlineHtml), cada um criado numa investigacao diferente
# e nenhum removido depois. Usuario pediu: ver o que esta sincronizando, o
# que falta em TEMPO e TAMANHO, e qual foi o erro.
chk("existe um painel unico que junta andamento + o que falta + erro",
    novo.count("function syncPainelHtml(){") == 1
    and "${syncPainelHtml()}" in novo)
chk("os tres paineis antigos nao sao mais empilhados soltos na tela",
    "${syncProgressoHtml()}\n  ${syncGruposHtml()}" not in novo
    and "${!__sincronizandoAgora ? onedriveStatusPendenteHtml() : ''}" not in novo)
chk("syncGruposHtml e onedriveStatusPendenteHtml continuam existindo, agora usados DENTRO do painel",
    "const detalhe = emAndamento ? syncGruposHtml() : (nadaPendente ? \"\" : onedriveStatusPendenteHtml());" in novo)
chk("estimativa de TEMPO existe e so aparece com velocidade realmente medida",
    novo.count("function syncTempoEstimado(bytes){") == 1
    and 'if(typeof bps !== "number" || bps <= 0) return "";' in novo
    and novo.count("function syncFecharMedicaoVelocidade(iniciadoEm){") == 1)
chk("a velocidade e medida no unico ponto por onde passa todo byte transferido",
    "if(ok !== false && bytes > 0) __syncBytesRodada += bytes;" in novo
    and "syncFecharMedicaoVelocidade(__syncIniciadoEm);" in novo)
chk("amostra pequena demais nao vira velocidade (estragaria toda estimativa seguinte)",
    "if(__syncBytesRodada >= 200*1024 && seg >= 2){" in novo)
chk("o ERRO mais recente aparece no painel, com motivo, sem precisar abrir o diagnostico",
    novo.count("function syncUltimaFalha(){") == 1
    and "if(ev && ev.ok === false && !ev.reparo) return ev;" in novo
    and "Falhou ao enviar" in novo and "Falhou ao receber" in novo)
chk("historico virou bloco recolhivel, com o mesmo padrao do diagnostico",
    novo.count("function syncHistoricoHtml(){") == 1
    and "toggleHistoricoSync(){ STATE.ui.histSyncAberto = !STATE.ui.histSyncAberto; render(); }," in novo
    and "if(!STATE.ui.histSyncAberto){" in novo)
chk("'Aparencia' saiu da pagina de backup e foi para Configuracoes",
    novo.count('<div class="section-title">Aparência</div>') == 1
    and novo.find('<div class="section-title">Aparência</div>') < novo.find("function screenSimplesConfigBackup"))
# A funcao seguinte no arquivo e screenSimplesConfigEmpresa (nao a de
# Exportacoes, que vem ANTES) -- o recorte precisa terminar nela.
_ini61 = novo.find("function screenSimplesConfigBackup")
_fim61 = novo.find("\nfunction screenSimplesConfigEmpresa", _ini61)
chk("as secoes nao alternam mais de assunto: Sincronizacao, depois Backup, depois Dados",
    _ini61 > 0 and _fim61 > _ini61 and
    re.findall(r'<div class="section-title">([^<]+)</div>', novo[_ini61:_fim61])
    == ["Sincronização", "Sincronização · Fotos e consumo de dados", "Sincronização · Conta",
        "Backup · Pasta local do aparelho", "Backup · Arquivo completo (.json)",
        # "Recuperar fotos perdidas" entrou logo ANTES dos pontos de restauração,
        # que é de onde ela puxa as fotos — os dois assuntos ficam vizinhos, e a
        # regra desta checagem (não alternar de assunto) continua respeitada.
        "Backup · Recuperar fotos perdidas",
        # "Reescrever as frases" entrou entre a recuperacao de fotos e os
        # pontos: as tres sao ferramentas de conserto do que ja existe e ficam
        # juntas. A regra desta checagem (nao alternar de assunto) segue
        # valendo -- tudo aqui e "Backup".
        "Backup · Reescrever as frases dos riscos",
        "Backup · Pontos de restauração (neste aparelho)", "Dados"])
chk("tamanho pequeno nao aparece mais como '0.0 MB'",
    "return `${g.qtd} ${onedriveRotuloTipo(t,g.qtd)} ${fecho} (${fmtBytes(g.bytes)})`;" in novo)
chk("nenhum recurso foi removido -- diagnostico, historico e os dois controles de foto continuam",
    novo.count("onedriveDiagnosticoInlineHtml()") >= 1
    and "App.onedriveToggleWifiConfirmado()" in novo
    and "App.onedriveToggleAutoWifi()" in novo
    and "App.onedriveBaixarPendentesConfirmar()" in novo
    and "App.onedriveVerificarBootstrapNovoDispositivo(true)" in novo)

print("\n=== 62. SINCRONIZACAO SOBREVIVE A ABA EM SEGUNDO PLANO ===")
# Usuario: "se eu sair da pagina para outro app ele perde a sincronizacao e
# aqueles itens voltam a precisar de sincronizar novamente". Duas causas
# independentes: (1) o vigia de 90 s sem avanco disparava porque o navegador
# segura os temporizadores da aba escondida -- as pausas de 200 ms entre
# itens viram quase um minuto cada e a sincronizacao, andando, era MORTA
# pelo proprio cronometro de seguranca; (2) a fila de fotos pendentes
# encolhia so na memoria e so ia ao disco no FIM do lote.
chk("vigia fica de sobreaviso com a aba escondida, em vez de desistir",
    'if(document.visibilityState === "hidden"){ marcarProgressoSync(); return; }' in novo)
chk("a checagem da aba vem ANTES da desistencia (senao nao protege nada)",
    novo.find('if(document.visibilityState === "hidden"){ marcarProgressoSync(); return; }')
    < novo.find('reject(new Error("ONEDRIVE_TEMPO_ESGOTADO"))'))
chk("com a aba visivel o vigia continua valendo -- travar de verdade ainda e detectado",
    "if(__syncUltimoProgressoEm && (Date.now() - __syncUltimoProgressoEm > msSemProgresso)){" in novo)
chk("fila de fotos gravada durante o lote, com limite de ritmo",
    "const gravarPendentesSePassouTempo = () => {" in novo
    and "if(Date.now() - ultimaGravacao < 4000) return;" in novo
    and "else dbSet(STATE); // mesmo sem mudança de conteúdo, a fila encolheu" in novo)
chk("barra sem total conhecido volta a ser a animada, nao 100% fixo",
    "sync-progresso-trilha${pct==null?' sync-progresso-indeterminado':''}" in novo
    and "width:${pct!=null?pct:100}%" not in novo)

print("\n=== 63. 'NAO CONSEGUI VER' DEIXA DE VIRAR 'ESTA VAZIO' NA NUVEM ===")
# Causa da "sincronizacao que nunca tem fim", diagnosticada em campo em
# 19/08 com 1167 itens: quando a listagem de uma pasta falhava (429, rede,
# sessao), onedriveListarFilhosEmLote gravava lista VAZIA -- indistinguivel
# de pasta realmente vazia. A reconciliacao nao achava os arquivos daquelas
# pastas, concluia "faltava na nuvem", APAGAVA a assinatura e agendava
# reenvio; o reenvio gerava mais requisicoes, mais 429, mais pastas
# falsamente vazias. O diagnostico do usuario mostrava 17 dessas correcoes
# no mesmo segundo e o mesmo arquivo enviado duas vezes em 18 s.
chk("existe uma marca de varredura incompleta, levantada por toda falha de listagem",
    novo.count("let __arvoreNuvemIncompleta = false;") == 1
    and novo.count("function onedriveMarcarArvoreIncompleta(motivo){") == 1
    and 'onedriveMarcarArvoreIncompleta("sem token")' in novo
    and 'catch(e){ onedriveMarcarArvoreIncompleta("pasta " + caminho); resultado.set(caminho, []); }' in novo)
chk("cada varredura comeca com a marca limpa (senao a autocura travaria para sempre)",
    "__arvoreNuvemIncompleta = false; // cada varredura começa limpa" in novo)
chk("reconciliacao nao apaga assinatura a partir de foto furada",
    "if(__arvoreNuvemIncompleta) return 0;" in novo)
chk("a protecao antiga (nuvem TOTALMENTE vazia) continua de pe -- a nova cobre o caso parcial",
    "if(existentes.size===0 && temProjetosLocais) return 0;" in novo)
chk("indice da nuvem nao e guardado a partir de varredura furada",
    "if(__arvoreNuvemIncompleta) return;" in novo
    and novo.find("if(__arvoreNuvemIncompleta) return;") > novo.find("function onedriveGuardarIndiceNuvem"))
chk("a autocura legitima continua existindo -- so passou a exigir foto completa",
    'registrarEventoSync("up", reg.arquivo, item.tipo, 0, true, "faltava na nuvem — reenvio agendado"' in novo
    and "mapa.delete(item.id);" in novo)

print("\n=== 64. A TRAVA DE 50 S MEDE TEMPO PARADO, NAO DURACAO TOTAL ===")
# Usuario: "as tentativas de sincronizacao falham mesmo com a pagina aberta".
# Existiam DOIS vigias. comVigilanciaDeProgresso ja media tempo sem avanco; o
# segundo, no visibilitychange, media o tempo TOTAL desde o inicio e abortava
# qualquer sincronizacao com mais de 50 s ao voltar para a aba. Com 1170 itens
# e dezenas de MB, passar de 50 s e o normal -- bastava alternar de aba um
# instante e voltar para matar uma sincronizacao saudavel. Piorou depois que o
# primeiro vigia parou de matar em segundo plano: a sincronizacao passou a
# durar mais e a cair nesta segunda trava com mais frequencia.
chk("a trava do visibilitychange mede tempo SEM AVANCO, nao duracao total",
    "const paradoHa = __syncUltimoProgressoEm" in novo
    and "if(__sincronizandoAgora && paradoHa > 50000){" in novo
    and "__sincronizandoAgora && __syncIniciadoEm && (Date.now() - __syncIniciadoEm > 50000)" not in novo)
chk("sem carimbo de progresso ainda ha alternativa -- nao fica girando para sempre",
    "(__syncIniciadoEm ? (Date.now() - __syncIniciadoEm) : 0)" in novo)
chk("a mensagem nao afirma mais 'segundo plano' para quem estava com a pagina aberta",
    "A sincronização parou de responder e foi encerrada." in novo
    and "interrompida porque o aparelho ficou em segundo plano" not in novo)

print("\n=== 65. GRAU DO DANO COM TEXTO NOVO, SEM MEXER NO QUE JA FOI GRAVADO ===")
# Pedido: "Arranhao" vira "Arranhao / Escoriacao / Contusao" e "Corte" vira
# "Corte / Laceracao", mantendo a pontuacao e valendo em TODO ponto onde ja
# houver um grau escolhido. O texto da classificacao nao e so rotulo: e a
# CHAVE gravada em risco.gpd e a chave de busca da pontuacao. Reescrever os
# riscos carimbaria os 1.100+ como alterados e devolveria a arvore inteira a
# fila de sincronizacao -- caro e arriscado para uma mudanca de redacao. Por
# isso o nome antigo e aceito e convertido NA LEITURA, sem gravar nada.
chk("a tabela usa os nomes novos com a pontuacao intacta",
    'classificacao:"Arranhão / Escoriação / Contusão"' in novo
    and 'classificacao:"Corte / Laceração"' in novo
    and 'valor:0.1' in novo and 'valor:0.5' in novo)
chk("existe a camada de compatibilidade com o nome antigo",
    novo.count("const GPD_RENOMEADOS = {") == 1
    and novo.count("function gpdCanonico(valor){") == 1
    and '"Arranhão": "Arranhão / Escoriação / Contusão",' in novo
    and '"Corte":    "Corte / Laceração",' in novo)
chk("a conversao so entra quando a busca direta falha (nao contamina PO/FE/NP)",
    "let item = tabela.find(x=>x.classificacao===classificacao);" in novo
    and "const c = gpdCanonico(classificacao);" in novo
    and "if(c !== classificacao) item = tabela.find(x=>x.classificacao===c);" in novo)
chk("os pontos que LEEM risco.gpd convertem antes de usar",
    "${selectOptions(opcoesGPD, gpdCanonico(r.gpd), false)}" in novo
    and 'laudoSelectHRN(rid,"gpd",HRN_GPD_TABELA,gpdCanonico(r.gpd),autoGPD,"Estimado")' in novo
    and "const gpd = gpdCanonico(r && r.gpd);" in novo
    and "PLR_GPD_FRONTEIRA.indexOf(gpdCanonico(r && r.gpd)) >= 0" in novo
    and "${gpdCanonico(r.gpd)===gpdSug?" in novo)
# 3 eventos apontam para "Corte / Laceração": Corte, Projeção de particulas e
# — depois do alinhamento decidido em 19/08 — a propria Laceração.
chk("montador de risco e tabela do PLr passaram a citar os nomes novos",
    novo.count('gpd:"Corte / Laceração"') == 3
    and novo.count('gpd:"Arranhão / Escoriação / Contusão"') == 1
    and 'const PLR_GPD_S1 = ["Arranhão / Escoriação / Contusão", "Corte / Laceração"];' in novo)
chk("nenhum dado do usuario e reescrito -- nao ha migracao carimbando risco.gpd",
    "r.gpd = gpdCanonico(" not in novo and "risco.gpd = gpdCanonico(" not in novo)
# Decisao do engenheiro responsavel (19/08): alinhar os eventos ao grau que
# passou a levar o nome deles. Antes "Laceracao" e "Contusao" sugeriam
# "Fratura osso menor" (2) -- grau cujo nome nao os cita, enquanto outro
# passou a citar. Isto MUDA a pontuacao sugerida (2 -> 0,5 e 2 -> 0,1) e vale
# so para risco NOVO: aplicarSugestoesRisco so preenche gpd vazio.
chk("eventos 'Laceracao' e 'Contusao' apontam para o grau que leva o nome deles",
    '{ v:"Laceração",              gpd:"Corte / Laceração",' in novo
    and '{ v:"Contusão",               gpd:"Arranhão / Escoriação / Contusão",' in novo
    and '{ v:"Laceração",              gpd:"Fratura osso menor",' not in novo
    and '{ v:"Contusão",               gpd:"Fratura osso menor",' not in novo)
chk("risco ja preenchido continua intocado -- a sugestao so entra em gpd vazio",
    'if(!String(r.gpd||"").trim()){' in novo)

print("\n=== 66. CHAVE DE IA POR PROVEDOR, COM ALTERNANCIA AUTOMATICA NO LIMITE DE USO ===")
# Pedido do usuario: configurar as chaves dos provedores gratuitos de uma vez
# e o app alternar sozinho quando um esgota o limite, em vez de precisar
# perceber, abrir Configuracoes e copiar a chave de novo do site. Antes havia
# UMA chave salva (apr_ia_apikey) para o provedor ativo -- trocar de provedor
# perdia a chave do anterior. Agora ha um mapa por provedor
# (apr_ia_apikeys) e um carimbo por provedor (o mesmo padrao ja usado em
# getPromptsEm/marcarPromptAlterado), para que sincronizar o Gemini de um
# aparelho e o Groq de outro nao apague nenhum dos dois.
chk("mapa de chaves por provedor existe, com migracao do formato antigo (uma chave so)",
    novo.count('const IA_LOCALSTORAGE_KEYS = "apr_ia_apikeys";') == 1
    and novo.count("function getIAApiKeysMapa(){") == 1
    and "const antiga = localStorage.getItem(IA_LOCALSTORAGE_KEY);" in novo
    and 'localStorage.setItem(IA_LOCALSTORAGE_KEYS, JSON.stringify(mapa));' in novo)
chk("getIAApiKey/setIAApiKey continuam sem argumento (30+ pontos de chamada nao mudam)",
    "function getIAApiKey(){ return getIAApiKeysMapa()[getIAConfig().provedor] || \"\"; }" in novo
    and novo.count("function setIAApiKey(v){") == 1)
chk("cada provedor tem seu proprio carimbo de sincronizacao, nao um so compartilhado",
    novo.count("function getApiKeysEm(){") == 1
    and novo.count("function marcarChaveIAAlterada(provedorId){") == 1
    and "marcarChaveIAAlterada(getIAConfig().provedor);" in novo  # onIAApiKeyInput
    and "marcarChaveIAAlterada(provedor);" in novo)  # App.removerChaveIA
chk("o pacote de sincronizacao leva o mapa novo E o campo antigo (compatibilidade)",
    "apiKeys: { ...getIAApiKeysMapa() }," in novo
    and "apiKeysEm: { ...getApiKeysEm() }," in novo
    and "apiKeyEm: getApiKeyEm()," in novo)
chk("a mesclagem percorre a UNIAO de apiKeys e apiKeysEm, nao so apiKeys",
    "const idsProvedores = new Set([...Object.keys(pacote.apiKeys), ...Object.keys(emRemotoPorProvedor)]);" in novo)
chk("pacote antigo (so uma chave, sem apiKeys) ainda e aceito -- aparelho nao atualizado nao para de sincronizar",
    'else if(typeof pacote.apiKey === "string"){' in novo)
chk("provedor disponivel para alternancia so entra com chave salva, gratuitos primeiro, pago so com o interruptor",
    novo.count("function iaProvedoresDisponiveis(incluirPagos){") == 1
    and 'id !== "personalizado"' in novo
    and "(incluirPagos || IA_PROVEDORES[id].gratuito)" in novo)
chk("trocar de provedor troca tambem endpoint e modelo juntos, e nao repete se ja e o ativo",
    novo.count("function trocarProvedorIAAtivo(novoId){") == 1
    and "if(!IA_PROVEDORES[novoId] || c.provedor === novoId) return;" in novo)
chk("a alternancia automatica so entra por limite de uso (429) e persiste a troca antes de repetir o pedido",
    "if(__iaUltimoStatus === 429 && getIAConfig().alternarProvedorAutomatico !== false){" in novo
    and "trocarProvedorIAAtivo(candidato);" in novo
    and novo.count("await iaTentarComRetentativas(tipo, textoUsuario);") == 2)
chk("provedor pago nunca entra na alternancia automatica sem o interruptor ligado (por padrao, desligado)",
    "if(c.alternarIncluirPagos===undefined) c.alternarIncluirPagos = false;" in novo
    and "iaProvedoresDisponiveis(!!getIAConfig().alternarIncluirPagos)" in novo)
chk("cada provedor com link de geracao de chave abre em aba nova (Personalizado nao tem link)",
    novo.count("linkChave:") == 5
    and 'linkChave: null,' in novo
    and 'target="_blank" rel="noopener noreferrer">${ic(\'share\')} Abrir site para gerar a chave</a>' in novo)

print("\n=== 67. EDITAR AREA/MAQUINA/TAREFA/RISCO SEM SAIR DA PAGINA DO LAUDO ===")
# Pedido do usuario, a partir da tela de Avaliacao HRN: quando Frequencia ou
# Nº de pessoas nao estao preenchidos na tarefa, o alerta so dizia "edite a
# tarefa para preencher" -- sem nenhum jeito de agir dali, era preciso sair
# do laudo, ir ate o cadastro em campo, achar a tarefa e voltar. O pedido foi
# mais amplo: poder alterar area, equipamento, tarefa E risco direto da
# pagina do laudo. A solucao REAPROVEITA os mesmos modais do cadastro em
# campo (abrirModalAreaS/MaquinaS/TarefaS/RiscoS, com o mesmo formulario e a
# mesma gravacao) -- nao existe formulario duplicado so para o laudo.
chk("o menu '...' do laudo ganhou atalhos para area, maquina e tarefa, alem do risco que ja existia",
    novo.count("App.laudoEditarTarefa('${rid}')") == 1
    and novo.count("App.laudoEditarEquipamento('${rid}')") == 1
    and novo.count("App.abrirModalAreaS('${item.area.id}','${item.proj.id}')") == 1)
chk("os atalhos passam por metodos que sincronizam o 'atual' antes de abrir",
    "  laudoEditarEquipamento(rid){" in novo and "  laudoEditarTarefa(rid){" in novo
    and novo.count("laudoSincronizarAtuais(it);") == 2)
_iniMenu = novo.find("menuLaudoCard(rid, tarefaId){")
_fimMenu = novo.find("laudoCopiarRisco(rid){", _iniMenu)
_trechoMenu = novo[_iniMenu:_fimMenu]
chk("os atalhos novos ficam entre 'editar risco' e 'copiar risco', sem reordenar o resto do menu",
    _trechoMenu.find("Visualizar / editar o risco") < _trechoMenu.find("Editar a tarefa")
    < _trechoMenu.find("Editar a máquina/ativo") < _trechoMenu.find("Editar a área")
    < _trechoMenu.find("Copiar risco") < _trechoMenu.find("Excluir risco"))
chk("nenhum modal foi duplicado -- os atalhos chamam as MESMAS funcoes do cadastro em campo",
    novo.count("abrirModalAreaS(id, projetoSId, onSaved){") == 1
    and novo.count("abrirModalMaquinaS(id, areaSId, onSaved){") == 1
    and novo.count("abrirModalTarefaS(id, maquinaSId, onSaved){") == 1
    and novo.count("function formAreaSHtml(){") == 1
    and novo.count("function formMaquinaSHtml(){") == 1
    and novo.count("function formTarefaSHtml(){") == 1)
chk("o alerta de FE/NP sem preenchimento virou acao direta, nao so texto",
    "A tarefa não tem frequência informada." in novo
    and "A tarefa não tem nº de pessoas informado." in novo
    and novo.count("Editar tarefa</button>") >= 2)

print("\n=== 68. TAREFA SEM NOTA DE CAMPO: 'SEU TEXTO' CAI PARA O NOME DELA ===")
# Usuario reportou: digitou o nome da tarefa em "Outra tarefa (especificar)"
# mas a Descricao da tarefa, na revisao do laudo, mostrava "(nada escrito em
# campo)" -- como se nada tivesse sido informado. laudoTextoOriginal so olhava
# tarefa.descricao (a nota opcional), nunca o nome/tarefaOutro. Mesmo padrao
# de fallback que "solucao" ja usava (cai para descMedida quando nao ha
# proposta) -- so deixa de esconder o que o inspetor de fato digitou.
chk("laudoTextoOriginal('tarefa') cai para o nome da tarefa quando a nota de campo esta vazia",
    'if(campo==="tarefa")  return item.tarefa.descricao || valOuOutro(item.tarefa.tarefa, item.tarefa.tarefaOutro) || "";' in novo)
chk("a nota de campo escrita pelo inspetor continua vencendo (fallback so entra quando ela esta vazia)",
    novo.find('if(campo==="tarefa")  return item.tarefa.descricao ||') > 0)
# 21/08: o escopo saiu desta checagem porque passou a levar o NOME da maquina
# de proposito (secao 70). Risco e Mitigacao existente continuam sem fallback
# nenhum — sao texto que o engenheiro escreveu, e nao ha outro campo de onde
# tirar substituto sem inventar conteudo.
chk("Risco e Mitigacao existente continuam sem fallback -- a mudanca nao vazou para eles",
    'if(campo==="risco")   return item.risco.descricao || "";' in novo
    and 'if(campo==="existente") return item.risco.descMedida || "";' in novo)

print("\n=== 69. LAPIDES QUE VIAJAM: EXCLUSAO FEITA NUM APARELHO VALE NOS OUTROS ===")
# Usuario: "riscos excluidos em outro dispositivo estao ficando duplicados no
# meu". Reproduzido em banco.js: a lapide ("apaguei isto de proposito") ficava
# SO no aparelho que apagou. Os outros continuavam com a copia e a autocura
# deles via o arquivo faltando na nuvem, concluia "meu envio falhou" e
# REENVIAVA — o item excluido voltava para a nuvem e dali para todo aparelho
# novo. Tres defeitos numa causa so.
chk("a lapide entrou no relogio logico (nao sai mais de Date.now() cru)",
    "  const agora = agoraSync();\n  ids.forEach(id=>{ if(id) STATE.exclusoesConfirmadas[id] = agora; });" in novo)
chk("existe o subsistema de sincronizacao das lapides, no mesmo molde de equipe/IA",
    novo.count("function montarPacoteLapides(){") == 1
    and novo.count("function aplicarPacoteLapides(pacote){") == 1
    and novo.count("async function onedriveSincronizarLapides(forcar){") == 1
    and "const SUBPASTA_CONFIG_LAPIDES = SUBPASTA_BACKUP + \"/Config\";" in novo)
chk("a mesclagem e por UNIAO, com carimbo por id e sem aceitar lapide vencida",
    "if(ts > (minhas[chave] || 0)){ minhas[chave] = ts; registrarCarimboVisto(ts); mudou = true; }" in novo
    and "if(agora - ts > LAPIDE_VALIDADE_MS) continue;" in novo
    and "const faltaNoRemoto = Object.keys(minhas).some(k=>!(k in remotas));" in novo)
# TRAVA 1 — exclusao so vence quem e mais antigo que ela.
chk("edicao feita DEPOIS da exclusao vence a exclusao",
    novo.count("function lapideVenceDadosRemotos(chave, dados){") == 1
    and "return ((dados && (dados.atualizadoEm || dados.criadoEm)) || 0) < ts;" in novo)
# TRAVA 2 — a ramificacao inteira e poupada por um unico item editado.
chk("um item editado salva a ramificacao inteira (area > maquina > tarefa > risco)",
    novo.count("function __subarvoreTocadaDepoisDe(tipo, item, ts){") == 1
    and "if((item.atualizadoEm || item.criadoEm || 0) >= ts) return true;" in novo
    and novo.count("function __lapideFilhos(tipo){") == 1)
# TRAVA 3 — o freio de exclusao em massa passa a valer tambem na CHEGADA.
chk("freio de exclusao em massa tambem na chegada, contando a subarvore",
    novo.count("function aplicarLapidesNaArvore(permitirEmMassa){") == 1
    and "if(!permitirEmMassa && exclusaoEmMassaSuspeita(itensQueSaem, Math.max(0, totalAgora - itensQueSaem))){" in novo
    and novo.count("function __tamanhoSubarvore(tipo, item){") == 1)
chk("a autocura deixou de ressuscitar o que foi apagado de proposito",
    "if(lapideVenceDadosRemotos(item.id, item.dados)){" in novo
    and novo.find("if(lapideVenceDadosRemotos(item.id, item.dados)){") < novo.find('"faltava na nuvem — reenvio agendado"'))
chk("item que sumiu do aparelho tambem gera lapide (segunda porta da exclusao)",
    "if(!confirmadaAntes) registrarLapidesExclusao([id]);" in novo
    and "const confirmadaAntes = exclusaoConfirmadaPeloUsuario(id);" in novo)
chk("a mesclagem recusa por carimbo, nao mais recusa seca",
    "if(descritor.tipo!==\"fotos\" && dados && dados.id && lapideVenceDadosRemotos(descritor.tipo+\":\"+dados.id, dados)) return false;" in novo
    and "exclusaoConfirmadaPeloUsuario(descritor.tipo+\":\"+dados.id)) return false;" not in novo)
chk("as lapides chegam ANTES do envio e ANTES da autocura (a ordem e o que corrige)",
    novo.find("await onedriveSincronizarLapides(!!onProgresso);") < novo.find('await onedriveSincronizarModulo("Simplificado"')
    and novo.find("await onedriveSincronizarLapides(true);") < novo.find("onedriveReconciliarComArvore(download.arvore)"))
chk("exclusao nova nao espera a janela de 10 min para viajar",
    "__lapidesSyncUltimaVerificacao = 0;" in novo)
chk("toda remocao por lapide deixa rastro no historico",
    'registrarEventoSync("del", chave, a.tipo, 0, true, "excluido em outro aparelho", "");' in novo)

print("\n=== 70. ESCOPO DO EQUIPAMENTO LEVA O NOME DA MAQUINA ===")
# Usuario, com print: "Seu texto de campo" do Escopo mostrava so "CNV-002" — a
# Descricao (opcional) da maquina, que em campo e usada para o codigo do ativo.
# O nome ("Mesa que alimenta a CV-3404") e o primeiro campo preenchido e e o que
# identifica o equipamento; sem ele o laudo saia com um codigo solto sempre que a
# IA ainda nao tivesse gerado o texto. A geracao da IA ja mandava Nome +
# Descricao — quem estava atras eram a tela e o texto final.
chk("o escopo monta nome + descricao, sem repetir quando sao iguais",
    "const nomeMaq = nomeMaquinaS(item.maquina);" in novo
    and 'if(nomeMaq && descMaq && descMaq !== nomeMaq) return nomeMaq + " — " + descMaq;' in novo
    and 'return descMaq || nomeMaq || "";' in novo)
chk("o texto do escopo continua com coluna propria e NAO sobrescreve a descricao de campo",
    'maquina: { ...item.maquina, escopo: t.escopo || item.maquina.escopo || "" },' in novo)
chk("a geracao da IA continua mandando Nome e Descricao juntos",
    novo.count("Nome: ${nomeMaquinaS(") == 4)

print("\n=== 71. IMPORTAR TEXTOS DO LAUDO GERADOS FORA DO APP ===")
# Usuario: "criamos todo um sistema de IA para alimentar os laudos atraves da
# API mas a API nao consegue tratar o volume". Medido no backup dele: 1209
# textos pendentes — muito acima do que os planos gratuitos entregam em limite
# de requisicao e cota diaria. Este caminho aceita os mesmos textos escritos
# fora do app. O que ele NUNCA pode fazer e passar por cima de decisao do
# engenheiro ou encostar em dado de campo — e disso que tratam as checagens.
chk("existe a funcao de importacao, com formato proprio e campos declarados",
    novo.count("function importarTextosLaudo(pacote){") == 1
    and 'const LAUDO_TEXTOS_FORMATO = "apr-textos-laudo-v1";' in novo
    and 'const LAUDO_CAMPOS_IMPORTAVEIS = ["escopo", "tarefa", "risco", "existente", "solucao"];' in novo)
chk("o texto entra como SUGESTAO a decidir, nunca como decisao tomada",
    'laudoSet(item, campo, { sug: texto, st: "pend", duv: String((linha && linha.duvida) || "").trim() });' in novo)
chk("campo que ja tem texto ou decisao NAO e tocado",
    "if(g.sug || g.fin || g.st){ res.pulados++; return; }" in novo)
chk("arquivo de outro formato e recusado inteiro, sem aplicar nada",
    "if(pacote.formato !== LAUDO_TEXTOS_FORMATO || !Array.isArray(pacote.textos)) return null;" in novo)
chk("a importacao passa por laudoSet — ou seja, carimba para sincronizar",
    novo.count("laudoSet(item, campo, { sug: texto") == 1
    and "function laudoCarimbarParaSincronizar(item, campo){" in novo)
chk("botao, seletor de arquivo e aviso de resultado estao na tela",
    '<input type="file" id="fileTextosLaudo" accept="application/json,.json" hidden>' in novo
    and "Importar textos do laudo (.json)" in novo
    and "por já ter sua decisão." in novo
    and "sem item correspondente neste aparelho." in novo)
# O corpo da funcao so escreve via laudoSet: nenhuma atribuicao direta a campo
# de dado (descricao, nome, foto). Se algum dia alguem acrescentar uma, esta
# checagem cai — que e exatamente o ponto.
_ini71 = novo.find("function importarTextosLaudo(pacote){")
_corpo71 = novo[_ini71:novo.find("\n}", novo.find("if(res.aplicados > 0)", _ini71))]
chk("a importacao nao escreve em nenhum campo de dado de campo",
    _ini71 > 0
    and ".descricao =" not in _corpo71 and ".nome =" not in _corpo71
    and ".foto" not in _corpo71 and "atualizadoEm =" not in _corpo71)

print("\n=== 72. IMPORTAR DADOS DE PLAQUETA LIDOS FORA DO APP ===")
# Modelo, marca, numero de serie, ano, capacidade e tensao nao sao dados de
# campo -- sao lidos da foto da plaqueta, normalmente no escritorio. O app ja
# tem lerPlaquetaIA (leitura por API de visao, direto no draft da maquina).
# Este caminho aceita os mesmos seis campos quando a leitura foi feita fora
# do app -- e precisa da MESMA garantia: nunca sobrescrever o que ja existe.
chk("existe a funcao de importacao, com formato e campos proprios",
    novo.count("function importarDadosPlaqueta(pacote){") == 1
    and 'const PLAQUETA_FORMATO = "apr-plaqueta-v1";' in novo
    and 'const PLAQUETA_CAMPOS_IMPORTAVEIS = ["modelo", "marca", "numeroSerie", "anoFabricacao", "capacidade", "tensao"];' in novo)
chk("so preenche campo vazio -- nunca sobrescreve o que ja existe",
    "if(valor && !jaTemValor){ m[campo] = valor; res.camposAplicados++; mudouEsta = true; }" in novo)
chk("a maquina e localizada em QUALQUER projeto/area, nao so no 'atual'",
    novo.count("function maquinaSimplesGlobalPorId(id){") == 1
    and "for(const p of (STATE.projetosSimples||[])){" in novo)
chk("maquina alterada ganha carimbo de sincronizacao (agoraSync), nao Date.now() cru",
    "if(mudouEsta){ m.atualizadoEm = agoraSync(); res.maquinasAtualizadas++; }" in novo)
chk("arquivo de outro formato e recusado inteiro, sem aplicar nada",
    'if(pacote.formato !== PLAQUETA_FORMATO || !Array.isArray(pacote.maquinas)) return null;' in novo)
chk("botao, seletor de arquivo e aviso de resultado estao na tela",
    '<input type="file" id="fileDadosPlaqueta" accept="application/json,.json" hidden>' in novo
    and "Importar dados de plaqueta (.json)" in novo
    and "Só preenche o que estiver vazio" in novo)

print("\n=== 73. FOTO DE CAMPO NAO PODE SER APAGADA POR ENGANO ===")
# A limpeza de fotos orfas decidia o que apagar lendo o STATE EM MEMORIA. Ela
# roda em segundo plano (quem chama nao espera), e nesse intervalo o STATE
# pode ter sido trocado inteiro -- na abertura do app ele comeca VAZIO ate a
# leitura do banco terminar. Pego nesse instante, todo o banco de fotos
# parecia orfao e era apagado de vez. As fotos antigas escapavam por estarem
# em algum ponto de restauracao; as tiradas depois do ultimo ponto (as do dia
# de campo) nao tinham protecao nenhuma. Estas checagens travam as duas
# pontas: de onde vem a lista de referencias, e o que acontece na duvida.
chk("a lista de referencias sai do registro GRAVADO, nao so do STATE em memoria",
    "const gravado = await new Promise((resolve)=>{" in novo
    and "fotosColetarRefs(gravado, referenciadas);" in novo
    and "fotosColetarIdsEmbutidas(gravado, referenciadas);" in novo)
chk("sem conseguir ler o registro gravado, NAO apaga nada",
    novo.count("if(!gravado) return;") == 1)
chk("o STATE em memoria continua sendo somado (uniao), nunca substituindo",
    "fotosColetarIdsEmbutidas(STATE, referenciadas);" in novo
    and "fotosColetarRefs(STATE, referenciadas);" in novo)
chk("os pontos de restauracao continuam protegendo as fotos deles",
    "for(const p of pontos) fotosColetarRefs(p, referenciadas);" in novo)
chk("o rascunho nao salvo tambem protege as fotos dele",
    "const rascunho = await lerDraftPersistente();" in novo
    and "if(rascunho){ fotosColetarIdsEmbutidas(rascunho, referenciadas); fotosColetarRefs(rascunho, referenciadas); }" in novo)
chk("existe disjuntor contra apagar quase todo o banco de uma vez",
    "if(remover.length >= 30 && remover.length > indice.size * 0.6){" in novo)
chk("o disjuntor deixa rastro em vez de sumir em silencio",
    'console.error("Limpeza de fotos abortada por seguran' in novo)
# Segunda ponta: foto que nao abre deixa de ser um quadro cinza mudo.
chk("foto que nao abre se identifica na tela, em vez de quadro vazio",
    'el.setAttribute("data-foto-perdida", "1");' in novo
    and 'el.title = "Foto n\u00e3o encontrada neste aparelho \u2014 refotografe";' in novo)
chk("a foto que ABRE continua entrando pelo mesmo caminho de sempre",
    "if(f){ el.src = f; return; }" in novo)
# A limpeza continua sendo limpeza: nada disso pode ter desligado a funcao.
chk("a limpeza continua sendo disparada pela gravacao, como antes",
    novo.count("fotosLimparOrfasSeForHora();") == orig.count("fotosLimparOrfasSeForHora();"))
chk("a trava de 10 minutos continua no lugar",
    "if(Date.now() - __ultimaLimpezaFotosEm < 10*60*1000) return;" in novo)
chk("a remocao em si nao mudou -- so a lista de quem pode ser removido",
    "remover.forEach(fid => store.delete(FOTO_KEY_PREFIXO + fid));" in novo)

print("\n=== 74. FOTO SOBE SOZINHA TAMBEM NO IPHONE ===")
# onedriveEstaEmWifi() pergunta ao navegador o tipo de rede. O Safari do
# iPhone NAO implementa essa API (limitacao da Apple), entao a resposta era
# sempre "nao sei" -- e o codigo tratava "nao sei" como "nao e Wi-Fi". Na
# pratica, no iPhone a foto so subia no toque manual: um dia inteiro de campo
# no Wi-Fi terminava com tudo parado no aparelho, sem aviso nenhum.
chk("o ENVIO de fotos segue a politica do texto, nao a deteccao de Wi-Fi",
    "const podeSubirFotos = podeSincronizarAutomaticoAgora() || !!onProgresso;" in novo
    and "const podeSubirFotos = onedriveEstaEmWifi() || !!onProgresso;" not in novo)
chk("a deteccao de Wi-Fi continua existindo (nao foi arrancada do app)",
    novo.count("function onedriveEstaEmWifi(){") == 1)
chk("RECEBER foto automaticamente continua exigindo Wi-Fi confirmado",
    "if(STATE.baixarFotosAutoWifi && onedriveEstaEmWifi()){" in novo)
chk("o aviso de consumo so aparece em volume grande",
    "const LIMIAR_PERGUNTAR_BYTES = 20*1024*1024;" in novo)
chk("o aviso parou de afirmar em que rede o aparelho esta",
    "Voc\u00ea n\u00e3o parece estar no Wi-Fi. Sincronizar agora" not in novo)
chk("a tela explica que o envio NAO depende da chave de Wi-Fi",
    "O envio do seu trabalho n\u00e3o depende desta chave." in novo)
chk("a tela atribui a limitacao ao Safari, nao ao app",
    "limita\u00e7\u00e3o do Safari, n\u00e3o deste app" in novo)

print("\n=== 75. APARELHO DANIFICADO NAO CONTAMINA O SAUDAVEL ===")
# As fotos que sumiram do aparelho continuam EMBUTIDAS nos arquivos de texto
# da nuvem. Duas portas por onde o aparelho danificado destruia essa ultima
# copia: (a) subindo o proprio item e regravando o arquivo sem a foto;
# (b) subindo um pacote "fotos_" com [null,null], que do outro lado
# substituia as fotos BOAS por nulls.
chk("a leitura MARCA os itens cuja foto nao foi encontrada",
    novo.count("function marcarItensComFotoPerdida(") == 1
    and 'const CAMPO_MARCA_FOTO_PERDIDA = "__fotosPerdidas";' in novo)
chk("a marca e posta ANTES de a referencia virar null",
    "marcarItensComFotoPerdida(bruto, mapa);\n    return fotosReinserirDeMapa(bruto, mapa);" in novo)
chk("so os campos PROPRIOS marcam o item (risco nao marca a maquina inteira)",
    novo.count("function __refsProprriasDoItem(") == 1
    and "if(k === campoFilhos) continue;" in novo)
chk("a marca NAO se apaga sozinha na leitura seguinte",
    "else if(obj[CAMPO_MARCA_FOTO_PERDIDA]) delete obj[CAMPO_MARCA_FOTO_PERDIDA]" not in novo)
chk("item marcado NAO entra na fila de envio",
    "if(it.dados && it.dados[CAMPO_MARCA_FOTO_PERDIDA]) return false;" in novo)
chk("a marca de dano nunca viaja para a nuvem",
    "delete semFotos.__fotosPerdidas;" in novo)
chk("pacote de fotos so entra quando traz MAIS fotos reais do que ja existe",
    "const chegaram = v.filter(__ehFotoEmbutida);" in novo
    and "if(chegaram.length > aqui.length){ local[k] = chegaram; mudou = true; }" in novo)
chk("o teste antigo, que olhava so o TAMANHO da lista, saiu",
    "Array.isArray(v) && v.length>0 && (substituir || !Array.isArray(local[k]) || local[k].length===0)" not in novo)
chk("existe contagem de itens com foto perdida para a tela",
    novo.count("function contarItensComFotoPerdida(") == 1)

print("\n=== 76. RECUPERAR FOTOS DOS PONTOS DE RESTAURACAO ===")
# A faxina defeituosa nunca apagava foto referenciada por um ponto de
# restauracao -- entao as fotos que sumiram da tela continuam no aparelho,
# presas dentro dos pontos. Restaurar um ponto INTEIRO traria as fotos e
# levaria junto todo o trabalho feito depois dele; esta recuperacao entra nos
# pontos e pega SO AS FOTOS.
# Ancora pelo NOME, nao pela assinatura: a lista de parametros ja mudou
# duas vezes (onProgresso, depois desde) e cada vez derrubava a secao
# inteira por um motivo que nada tinha a ver com o que se quer provar.
_ini76 = novo.find("async function __recuperarFotosDosPontos(")
# O recorte termina na funcao seguinte a recuperacao. Entre ela e
# onedriveEstaEmWifi entrou depois a recomposicao de frases, que MEXE em
# atualizadoEm de proposito -- sem estreitar o recorte, a checagem de "a
# recuperacao nao mexe no carimbo" passava a acusar a funcao errada.
_fim76 = novo.find("\nfunction recomporFrasesDosRiscos", _ini76)
if _fim76 < 0:
    _fim76 = novo.find("\nfunction onedriveEstaEmWifi", _ini76)
chk("existe a recuperacao, com previa que nao altera nada",
    _ini76 > 0 and _fim76 > _ini76
    and novo.count("async function recuperarFotosDosPontos(") == 1
    and novo.count("async function contarFotosRecuperaveis(") == 1)
chk("junta os pontos do mais novo para o mais antigo",
    novo.count("function fotosGuardadasNosPontos(") == 1
    and "if(!reg.unicas[campo] && __ehFotoOuRef(item[campo])) reg.unicas[campo] = item[campo];" in novo)
chk("NUNCA sobrescreve foto que ja esta boa",
    "if(ehFotoDataUrlPersist(item[campo])) continue;" in novo)
chk("NUNCA reduz a quantidade de fotos que ja existe",
    "if(doPonto.length > aqui.length){" in novo)
# O carimbo e o que decide quem vence na sincronizacao. Mexer nele faria a
# versao deste aparelho passar por cima do texto que a outra pessoa esta
# editando no escritorio -- perda de trabalho alheio para devolver uma foto.
chk("a recuperacao NAO mexe no carimbo de data de nenhum item",
    _ini76 > 0 and "atualizadoEm" not in novo[_ini76:_fim76])
chk("poe o item na fila SO pelas fotos, sem tocar no carimbo",
    novo.count("function marcarFotosPendentesParaEnvio(") == 1
    and "reg.fotosPendentes = true;" in novo
    and "delete reg.tamanhoFotos;" in novo)
chk("a marca de dano so sai quando NADA ficou faltando",
    "if(faltou === 0) delete item[CAMPO_MARCA_FOTO_PERDIDA];" in novo)
chk("ponto no formato antigo (foto embutida) tambem serve",
    novo.count("function __ehFotoOuRef(") == 1
    and "return ehFotoDataUrlPersist(v) || ehFotoRefPersist(v);" in novo)
chk("botao e aviso de resultado estao na tela",
    "App.recuperarFotosPerdidas(" in novo
    and "Devolver fotos — " in novo
    and "let __ultimaRecuperacaoFotos = null;" in novo)
chk("a tela deixa claro que nada e desfeito",
    "não desfaz nada" in novo)
# A versao 14:30 lia de uma vez os arquivos de TODAS as fotos citadas em TODOS
# os pontos -- uns 2 GB de imagem na memoria de um celular. E o mesmo erro que
# derrubava o Safari na exportacao do backup: corrigido o sintoma la, repetido
# aqui. A previa passa a usar o INDICE (so as chaves, sem byte nenhum) e a
# devolucao trabalha em lotes.
chk("a previa nao carrega nenhuma foto -- usa so o indice de chaves",
    "const indice = await fotosCarregarIndice(db);" in novo[_ini76:_fim76]
    and "if(ehFotoRefPersist(v)) return indice.has(v.slice(FOTO_REF_PREFIXO.length));" in novo)
chk("a devolucao trabalha em lotes, com tamanho declarado",
    "const RECUPERACAO_LOTE_ITENS = 20;" in novo
    and "for(let ini = 0; ini < alvos.length; ini += RECUPERACAO_LOTE_ITENS){" in novo)
chk("cada lote le so os seus arquivos e grava antes do seguinte",
    "const mapa = await fotosLerLote(db, refs);" in novo[_ini76:_fim76]
    and "mapa.clear();" in novo
    and "await dbSet(STATE);" in novo[_ini76:_fim76])
chk("a tela mostra o andamento por lote",
    "progressoAtualizar(feitos, total, feitos + \" de \" + total + \" itens\");" in novo)
# Recorte por data: comecar pequeno (o levantamento recente), conferir na
# tela, e so entao soltar o resto. Numa operacao que mexe em centenas de
# itens, poder testar num pedaco pequeno antes vale mais do que a pressa.
chk("da para recortar por data de criacao, e a previa usa o mesmo recorte",
    "async function contarFotosRecuperaveis(desde){" in novo
    and "async function recuperarFotosDosPontos(onProgresso, desde){" in novo
    and "if(corte && (Number(item.criadoEm) || 0) < corte) return;" in novo)
chk("a tela oferece os dois recortes",
    "App.recuperarFotosPerdidas(7)" in novo
    and "App.recuperarFotosPerdidas(0)" in novo
    and "criados nos últimos ${Number(dias)} dias" in novo)
# O ponto de restauracao e a UNICA coisa que segura as fotos que sumiram do
# resto do aparelho (fotosLimparOrfasSeForHora nunca remove foto referenciada
# por um ponto). Com o teto normal de 8 e um ponto criado a cada abertura
# depois de 4 h, bastavam algumas aberturas para os pontos antigos -- as
# fontes das perdas mais antigas -- irem embora em silencio.
chk("nao descarta ponto antigo enquanto houver foto perdida conhecida",
    "const MAX_PONTOS_COM_FOTO_PERDIDA = 20;" in novo
    and "if(contarItensComFotoPerdida() > 0) return Math.max(base, MAX_PONTOS_COM_FOTO_PERDIDA);" in novo)
chk("o teto normal continua valendo quando nao ha dano",
    "const base = onedriveTudoConfirmadoNaNuvem() ? MIN_PONTOS_RESTAURACAO : MAX_PONTOS_RESTAURACAO;" in novo)

print("\n=== 77. UM ITEM TEM UM ENDERECO NA NUVEM ===")
# Na nuvem real do usuario o projeto de id c268c7 existe em TRES pastas
# ("Corteva", "Corteva A", "Corteva Agriscience") -- heranca das renomeacoes
# antigas, que criavam pasta nova sem remover a antiga (ver secao 73). 25 das
# 70 areas ficaram duplicadas: 1226 arquivos a mais para listar e avaliar a
# cada ciclo. Pior, a assinatura de cada item e guardada por "tipo:id" -- UMA
# so para todas as copias -- entao cada copia sobrescrevia o tamanho
# registrado pela outra.
chk("existe a escolha da pasta canonica entre irmas de mesmo id",
    novo.count("function onedriveDuplicatasParaIgnorar(") == 1
    and novo.count("function __arquivosNoNo(") == 1)
chk("desempata pelo nome que o app calcularia hoje; sem ele, pela mais completa",
    "let escolhida = esperado ? lista.find(n=>n.nome === esperado) : null;" in novo
    and "if(!escolhida) escolhida = lista.reduce((a,b)=> __arquivosNoNo(b) > __arquivosNoNo(a) ? b : a);" in novo)
chk("uma pasta sozinha (o caso normal) nunca e ignorada",
    "if(lista.length <= 1) return;" in novo)
chk("os quatro niveis pulam as duplicatas",
    novo.count("if(pularProj.has(nodeProj)) continue;") == 1
    and novo.count("if(pularArea.has(nodeArea)) continue;") == 1
    and novo.count("if(pularMaq.has(nodeMaq)) continue;") == 1
    and novo.count("if(pularTar.has(nodeTar)) continue;") == 1)
# 1 definicao + 4 usos + mencoes em comentarios (o numero exato de mencoes em
# texto explicativo nao e o que importa aqui -- por isso o piso, nao a
# igualdade). NADA e apagado da nuvem: as copias continuam la, intactas --
# so param de ser lidas. O ensaio 24 do banco.js cobra isso de verdade,
# conferindo que a classificacao nao propoe nenhum item vindo da pasta parada.
chk("a escolha e usada nos quatro niveis, e nada e apagado",
    novo.count("onedriveDuplicatasParaIgnorar") >= 6
    and "NADA é apagado da nuvem" in novo)

print("\n=== 78. A FRASE DO RISCO MONTADA DOS QUATRO CAMPOS ===")
# O componente entrava sempre como LUGAR ("Amputacao NA lamina"), quando a
# lamina e o AGENTE que causa; e a parte do corpo vinha solta no fim ("com
# lesao na mao"), redundante quando o proprio evento ja e a lesao. Os casos
# concretos, com dados reais de campo, estao no t120 do testes2.js.
chk("o componente tem CLASSE conforme o evento (contato/origem/lugar)",
    novo.count("const RISCO_EVENTO_CLASSE = {") == 1
    and '"Amputação":"contato"' in novo and '"Queda de material":"origem"' in novo)
chk("evento nao classificado cai no formato antigo, sem piorar",
    'const classe = RISCO_EVENTO_CLASSE[ev] || "lugar";' in novo)
chk("a preposicao da parte do corpo muda com o evento",
    novo.count("const RISCO_EVENTO_PARTE_GENITIVO = [") == 1
    and novo.count("function riscoArtigoDe(") == 1
    and 'return em ? em.replace(/^n/i, "d") : "";' in novo)
chk("'corpo inteiro' nunca cola no evento",
    novo.count("const RISCO_PARTES_SO_NO_FIM = [") == 1)
chk("componente que repete o local e descartado",
    novo.count("function riscoSeSobrepoem(") == 1)
chk("local que e POSICAO nao aceita genitivo",
    novo.count("const RISCO_LOCAIS_POSICAO = [") == 1
    and novo.count("function riscoLocalEhPosicao(") == 1)
chk("genero de substantivo feminino terminado em -e",
    novo.count("const RISCO_NUCLEOS_FEMININOS = [") == 1
    and "RISCO_NUCLEOS_FEMININOS.indexOf(raiz) >= 0" in novo)
chk("a descricao DERIVA do nome -- uma fonte so, dois textos coerentes",
    novo.count("function __montarDescricaoRiscoAntigo(") == 1)
chk("existe a recomposicao em massa, com previa que nao altera nada",
    novo.count("function recomporFrasesDosRiscos(apenasContar){") == 1
    and "if(!apenasContar){ item.nome = nomeNovo; item.nomeAuto = nomeNovo; }" in novo)
chk("NUNCA reescreve frase digitada a mao",
    "const nomeEhAuto = !nomeAtual || nomeAtual === String(item.nomeAuto||" in novo)
chk("item reescrito ganha carimbo (a mudanca precisa viajar)",
    "if(mexeu){ res.riscos++; if(!apenasContar) item.atualizadoEm = agoraSync(); }" in novo)
chk("a tela avisa para sincronizar antes, por causa da segunda pessoa",
    "sincronize antes" in novo and "App.recomporFrasesRiscos()" in novo)

print("\n=== 79. NAO TROCAR ARQUIVO DA NUVEM POR UM MUITO MENOR ===")
# A trava da secao 75 (__fotosPerdidas) so funciona quando a leitura conseguiu
# FLAGRAR a foto sumindo -- e ela so flagra uma vez: na leitura seguinte ja nao
# ha referencia, so um vazio, indistinguivel de "aqui nunca teve foto". Num
# aparelho onde o dano ja tinha sido gravado ANTES de a marca existir, ela
# nunca e criada e nao protege nada. Esta olha o fato bruto: o tamanho.
_sync79 = novo[novo.find("async function onedriveSincronizarModulo"):]
_sync79 = _sync79[:_sync79.find("\nfunction ")]
_f79 = _sync79.find("if(onedriveEnvioEncolheDemais(item, tamTexto)){")
_e79 = _sync79.find("okTexto = await onedriveEnviarBlob")
chk("existe a trava, com as duas condicoes declaradas",
    novo.count("function onedriveEnvioEncolheDemais(") == 1
    and "const ENVIO_ENCOLHIMENTO_SUSPEITO = 4;" in novo
    and "const ENVIO_ENCOLHIMENTO_MINIMO_BYTES = 100*1024;" in novo)
chk("sem indice confiavel da nuvem, nao inventa suspeita",
    "if(!indice) return false; // sem índice confiável não se inventa suspeita" in novo)
chk("precisa ser muito menor E com diferenca grande",
    "if(bytesLocais * ENVIO_ENCOLHIMENTO_SUSPEITO >= remoto) return false;" in novo
    and "return (remoto - bytesLocais) > ENVIO_ENCOLHIMENTO_MINIMO_BYTES;" in novo)
chk("a trava e consultada ANTES de enviar, nao depois",
    _f79 > 0 and _e79 > _f79)
chk("bloqueio deixa o motivo no historico, nao some em silencio",
    "não enviado: o arquivo na nuvem é bem maior" in novo)

print("\n=== 80. RISCO COM O MESMO ID EM DUAS TAREFAS NAO GERA FILA SEM FIM ===")
# Achado rodando o classificador REAL contra a nuvem real do usuario: 60
# riscos com o mesmo id em duas tarefas (risco movido -- ou copiado por
# engano -- de uma tarefa de verdade para outra, copia antiga nunca
# removida). A classificacao so pergunta "esta na tarefa ATUAL?" -- nao sabe
# que ja existe em outra. A mesclagem sabe (via __moverItemEntrePais) e
# recusa, mas recusar nao deixava rastro: a classificacao "esquecia" no
# ciclo seguinte, para sempre.
chk("existem os tres helpers do risco orfao",
    novo.count("function __itemExisteAlgumLugar(") == 1
    and novo.count("function riscoOrfaoConhecido(") == 1
    and novo.count("function marcarRiscoOrfaoConhecido(") == 1)
chk("__itemExisteAlgumLugar reaproveita __listasIrmasDe (mesma nocao de 'irmaos')",
    "for(const lista of __listasIrmasDe(tipo)){" in novo
    and "if(lista.some(x=>x && x.id===id)) return true;" in novo)
chk("a mesclagem marca o orfao SEM depender do motivo exato da recusa",
    "if(!inseriu && descritor.tipo===\"risco\" && dados && dados.id && descritor.caminho" in novo
    and '__itemExisteAlgumLugar("risco", dados.id)){' in novo
    and "marcarRiscoOrfaoConhecido(descritor.caminho, descritor.tamanho);" in novo)
_ini80 = novo.find("function onedriveMesclarItemNovo(descritor, dados){")
_fim80 = novo.find("\n  const chaveFotos = descritor.chaveAssinatura", _ini80)
chk("a marcacao mora DENTRO de onedriveMesclarItemNovo -- vale para os 6 pontos que a chamam, incluindo o que nao tinha protecao nenhuma (onedriveDeltaProcessarFila)",
    novo.count("function onedriveMesclarItemNovo(descritor, dados){") == 1
    and _ini80 > 0 and _fim80 > _ini80
    and "marcarRiscoOrfaoConhecido(descritor.caminho, descritor.tamanho);" in novo[_ini80:_fim80])
chk("o classificador consulta o orfao conhecido antes de propor o risco de novo",
    "if(riscoOrfaoConhecido(arq.caminho, arq.tamanho)) continue;" in novo)
chk("chave keyed por CAMINHO + TAMANHO -- muda de tamanho, e conferido de novo (chance de 'movido de verdade, desta vez')",
    "return !!(mapa && mapa[caminho] === tamanho);" in novo)
chk("o cache de orfaos fica fora do backup exportado",
    '"oneDriveRiscosOrfaosConhecidos"' in novo and "__BACKUP_CAMPOS_EXCLUIR" in novo)

print("\n=== 81. CATEGORIA (NBR 14153) SAIU DE PERTO DO PLR ===")
# A correspondencia PLr -> Categoria preferencial vem da Figura B.1 da NBR
# 14153, que e IMAGEM dentro do PDF da norma e nao pode ser lida pelo
# extrator de texto -- e a unica parte do PLR_GRAFICO nao conferida celula a
# celula (aviso ja existente no proprio codigo). Ate essa conferencia
# acontecer, a Categoria nao pode ser citada para o cliente. O PLr em si
# (Anexo A da NBR ISO 13849-1, ja conferido) continua aparecendo.
chk("o formulario do risco (engenheiro) nao mostra mais a Categoria",
    "<b>Categoria ${escapeHtml(res.cat)}</b> pela NBR 14153" not in novo
    and "function plrResultadoHtml(res){" in novo)
chk("o laudo impresso (PDF/A4) nao mostra mais a Categoria",
    '<div class="v"><b>PL ${esc(plr.plr)}</b> · Categoria ${esc(plr.cat)}</div>' not in novo
    and '<div class="v"><b>PL ${esc(plr.plr)}</b></div>' in novo)
chk("o CALCULO da categoria continua existindo (so a exibicao saiu)",
    "if(g){ res.plr = g.plr; res.cat = g.cat; }" in novo)
chk("o Modulo Completo (congelado) nao foi tocado -- continua mostrando Categoria estrutural",
    'PLr exigido: <b>${m.plr}</b> · Categoria estrutural: <b>${m.cat}</b>' in novo)

print("\n=== 82. ID DUPLICADO NA ARVORE LOCAL NAO APAGA FOTO BOA DA NUVEM ===")
# Achado investigando o sumico de foto do Abacus 02 e da Cuba Lumialza 100 em
# 26/08/2026: item com o mesmo id em duas posicoes da arvore local divide UMA
# SO entrada no mapa de assinaturas, e o envio automatico apagava o endereco
# "antigo" (a copia boa, com foto) achando que era mudanca de endereco do
# mesmo id. Duas partes da correcao: o envio para de subir qualquer copia
# enquanto o id estiver duplicado; e o merge manual de duplicatas ("Juntar
# duplicatas") passa a preservar foto da copia descartada, nao so a dos
# filhos (tarefas/riscos).
chk("o envio automatico ignora id duplicado na arvore antes de decidir o que subir",
    "if(idsDuplicadosNaArvore.has(it.id)) return false;" in novo)
chk("a deteccao de duplicata conta ocorrencias por id na propria listagem do ciclo",
    "__contagemPorId.set(it.id, (__contagemPorId.get(it.id)||0) + 1)" in novo)
chk("juntar duplicatas preserva foto EMBUTIDA da copia descartada",
    "if(__ehFotoEmbutida(v) && !__ehFotoEmbutida(fica.obj[k])) fica.obj[k] = v;" in novo)
chk("juntar duplicatas preserva a lista de fotos com MAIS fotos de verdade, nao só a mais nova",
    novo.count("if(chegaram.length > aqui.length) fica.obj[k] = chegaram;") == 1)

print("\n=== 83. RECUPERAR FOTO PERDIDA DIRETO DA NUVEM (MESMO BOTAO) ===")
# Pedido explicito: nao criar um terceiro botao -- o mesmo botao de sempre
# ("Devolver fotos") passa a tentar os pontos de restauracao deste aparelho
# e, em seguida, a nuvem, sem pedir um segundo toque.
chk("a funcao de recuperacao direto da nuvem existe",
    "async function recuperarFotosPerdidasDaNuvem(onProgresso){" in novo)
chk("so preenche campo vazio -- nunca sobrescreve foto que ja esteja aqui",
    "if(alvo.dados[campo]) continue; // já tem foto boa aqui — não se toca" in novo)
chk("so libera o item (tira a marca de dano) quando achou algo de verdade na nuvem",
    "if(mexeu){" in novo and "delete alvo.dados[CAMPO_MARCA_FOTO_PERDIDA];" in novo)
chk("o botao de sempre chama as DUAS fontes em sequencia, sem botao novo",
    novo.count('onclick="App.recuperarFotosPerdidas(7)"') == 1
    and novo.count('onclick="App.recuperarFotosPerdidas(0)"') == 1
    and "await recuperarFotosPerdidasDaNuvem(" in novo)
chk("item duplicado (mesma id em duas posicoes) so baixa o pacote da nuvem UMA vez",
    "if(idsJaAlvo.has(alvo.id)){ duplicadosIgnorados++; return; }" in novo)

print("\n=== 84. LISTA COPIAVEL DOS ITENS COM FOTO PERDIDA ===")
# Pedido em campo: depois de saber QUANTOS itens sao perda de verdade, o
# proximo passo e saber QUAIS -- para planejar a revisita. A lista le o
# STATE atual (nao depende de guardar o resultado de uma corrida especifica
# de recuperarFotosPerdidasDaNuvem) e junta duplicata do mesmo id numa linha
# so, pelo mesmo motivo que a busca na nuvem: e o mesmo item, nao dois.
chk("a funcao de listagem existe e le o STATE atual, nao um resultado guardado",
    "function listarItensFotoPerdidaTexto(){" in novo)
chk("junta duplicata do mesmo id numa linha so (mesmo item perdido, nao dois)",
    "if(idsJaListados.has(id)) return;" in novo)
chk("cobre os quatro niveis que podem carregar a marca de dano (area/maquina/tarefa/risco)",
    novo.count("CAMPO_MARCA_FOTO_PERDIDA]) addLinha(") == 3
    and "if(risco[CAMPO_MARCA_FOTO_PERDIDA]){" in novo)
chk("o botao copia para a area de transferencia, com o mesmo padrao do diagnostico",
    'onclick="App.copiarListaFotoPerdida()"' in novo
    and "async copiarListaFotoPerdida(){" in novo
    and novo.count("await navigator.clipboard.writeText(txt);") == 2)

print("\n=== 85. NAO RECONFERE NA NUVEM UM ITEM JA CHECADO HA POUCO ===")
# Achado em campo: projeto com 218 itens marcados continuava em 218 a cada
# nova rodada -- nada registrava "isto ja foi conferido", entao cada toque
# em "Devolver fotos" refazia as MESMAS chamadas de rede para itens que a
# rodada anterior ja tinha confirmado sem nada na nuvem. A marca de dano
# (CAMPO_MARCA_FOTO_PERDIDA) continua de pe -- ela protege contra reenvio,
# nao e sobre "ja conferi" -- ganhou uma companheira com validade de 24h.
chk("guarda quando um item foi conferido na nuvem sem achar nada",
    "alvo.dados.__fotoNuvemVerificadaEm = Date.now();" in novo
    and novo.count("alvo.dados.__fotoNuvemVerificadaEm") >= 2)
chk("pula quem foi conferido ha menos de 24h, sem gastar chamada de rede",
    "const VERIFICACAO_NUVEM_VALIDADE_MS = 24*60*60*1000;" in novo
    and "if(foiVerificadoRecentemente(alvo.dados)){ jaVerificadosRecentemente++; return; }" in novo)
chk("quando acha algo, tira o carimbo de verificacao (nao faz mais sentido)",
    "delete alvo.dados.__fotoNuvemVerificadaEm;" in novo)
chk("o carimbo local nunca viaja para a nuvem, mesma regra dos outros marcadores locais",
    "delete semFotos.__fotoNuvemVerificadaEm; // carimbo local de \"já conferi a nuvem\" — idem" in novo)

print("\n=== 86. TOCAR FORA DO FORMULARIO NAO DESCARTA FOTO EM SILENCIO ===")
# Achado em campo em 26/08/2026: maquinas recem-criadas perderam foto sem
# nenhum bug de sincronizacao por tras -- so a falta de um salvamento
# automatico aqui. Tocar fora do cartao (ou no botao, que por isso deixou
# de se chamar "Cancelar") fechava o formulario na hora, mesmo com fotos
# tiradas segundos antes, e ainda limpava o rascunho de emergencia junto,
# achando que era decisao consciente. Um toque sem querer na borda da tela
# (comum em campo, rolando um formulario grande) apagava a foto sem
# nenhum rastro -- nem marca de dano, nem ponto de restauracao, nem nuvem,
# porque ela nunca chegou a ser salva em lugar nenhum.
# Uma primeira versao desta correcao perguntava antes de descartar; a
# pedido do usuario em campo (mais seguro e mais rapido que decidir sob
# pressao), a pergunta foi trocada por salvar direto, sem perguntar nada.
chk("existe a lista compartilhada entre salvar e cancelar (as duas nunca podem divergir sobre onde o item mora)",
    "function __listaAlvoDoDraft(tipo, parent){" in novo
    and novo.count("__listaAlvoDoDraft(") == 3)  # a propria definicao + as duas chamadas (salvar e cancelar)
chk("fechar sem salvar SALVA sozinho quando ha mudanca nao salva, em vez de perguntar",
    "if(!semMudanca){ App.salvarDraftEntidade(); return; }" in novo)
chk("nao existe mais nenhum confirm() pedindo para descartar foto ao fechar o formulario",
    "Sair sem salvar?" not in novo)
chk("o botao (que salva, nao cancela mais) chama-se Fechar, no lugar de Cancelar, nos 5 formularios",
    novo.count('onclick="App.cancelarDraftEntidade()">Fechar</button>') == 5
    and novo.count('onclick="App.cancelarDraftEntidade()">Cancelar</button>') == 0)
chk("a checagem usa a MESMA funcao que decide se o Salvar carimba o item como alterado",
    novo.count("conteudoIgualAoSalvo(listaAlvo,") == 2)  # salvar e cancelar
chk("abrir so para conferir (sem mudar nada) continua fechando direto, sem gravar nada novo",
    "if(__draftEntity){" in novo and "const semMudanca = listaAlvo && conteudoIgualAoSalvo(listaAlvo, __draftEntity);" in novo)

print("\n=== 87. ZOOM COM PINCA NO VISUALIZADOR DE FOTO ===")
chk("a funcao de zoom existe e e ligada toda vez que uma foto abre",
    "function ativarZoomLightbox(lb){" in novo and "ativarZoomLightbox(lb);" in novo)
chk("pinca de dois dedos amplia (nao so translada)",
    'if(ev.touches.length === 2){' in novo
    and "escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, pinçaEscalaInicial * (nova / pinçaDistanciaInicial)));" in novo)
chk("toque duplo alterna zoom rapido",
    "if(escala > ESCALA_MIN){ escala = 1; transX = 0; transY = 0; } else { escala = ESCALA_TOQUE_DUPLO; }" in novo)
chk("fechar com toque simples so acontece no tamanho normal -- nao fecha sem querer ampliado",
    "if(escala <= ESCALA_MIN){" in novo
    and "toqueFecharPendente = setTimeout(()=>{ if(document.body.contains(lb)) lb.remove(); }, 320);" in novo)
chk("o fechamento do primeiro toque e cancelado se um segundo toque vira par (toque duplo nao fecha no meio do gesto)",
    "clearTimeout(toqueFecharPendente); toqueFecharPendente = null;" in novo)
chk("fechar tocando fora so conta o toque na propria caixa, nunca um toque na foto que borbulhou",
    'lb.onclick = (ev)=>{ if(ev.target===lb) lb.remove(); };' in novo)
chk("a foto nunca foge da tela quando ampliada e arrastada (translacao com limite)",
    "const limitarTranslacao = () => {" in novo
    and novo.count("limitarTranslacao();") == 2)  # depois da pinca e depois do arrasto

print("\n=== 88. RELATORIO DE PROGRESSO (CRIACAO E APLICACAO DO LAUDO, POR DIA) ===")
chk("dia local usa Intl com fuso de Brasilia -- nao pode usar toISOString (vira dia errado perto da meia-noite)",
    "function diaLocalBR(timestamp){" in novo
    and 'new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"' in novo)
chk("STATE ganhou o log de aplicacoes do laudo, com valor padrao seguro para backups antigos",
    "logLaudoAplicacoes: []," in novo)
chk("laudoSet registra a 1a vez que um campo passa a aplicado (ok/edit) -- reeditar nao duplica",
    "function laudoCampoAplicado(st){ return st===\"ok\" || st===\"edit\"; }" in novo
    and "function registrarAplicacaoLaudo(item, campo){" in novo
    and novo.count("registrarAplicacaoLaudo(item, campo);") == 3)  # escopo, tarefa, e o fallthrough risco/existente/solucao
chk("a decisao de logar compara o estado ANTES da mutacao, nao depois (senao nunca detectaria a 1a vez)",
    "const estavaAplicado = laudoCampoAplicado(laudoGet(item, campo).st);" in novo)
chk("decisao antiga (de antes deste registro existir) cai para o carimbo 'em' do proprio campo, sem quebrar",
    "function diaAplicacaoCampo(item, campo){" in novo
    and "return l.em ? diaLocalBR(l.em) : \"\";" in novo)
chk("o relatorio existe nos 3 niveis (projeto/area/equipamento) e aceita filtrar por projeto",
    "function relatorioProgressoDados(projetoId){" in novo
    and novo.count("relatorioProgressoSomar(maqBalde,") == 3   # equip, risco, campos
    and novo.count("relatorioProgressoSomar(areaBalde,") == 3
    and novo.count("relatorioProgressoSomar(projBalde,") == 3)
chk("a tela do relatorio existe, esta ligada no roteador e tem botao de entrada em Configuracoes",
    "function screenSimplesConfigRelatorio(){" in novo
    and 'else if(s==="simples-config-relatorio") body = screenSimplesConfigRelatorio();' in novo
    and "App.go('simples-config-relatorio')" in novo)

print("\n=== 89. FILA DO DELTA (ONEDRIVE) NAO FICA PRESA PARA SEMPRE ===")
# Antes: onedriveDeltaProcessarFila (unica funcao que esvazia
# STATE.oneDriveDeltaFila) so era chamada no caminho rapido do ciclo
# automatico de fundo. Nem a varredura completa automatica (sem link/a cada
# 30 min), nem o recomeco por resync (410), nem o botao manual "Sincronizar
# agora" chamavam essa funcao -- um item anunciado pelo delta e ja coberto
# por uma dessas varreduras completas ficava "esperando processar" no
# diagnostico para sempre, mesmo com o dado certo ja no aparelho.
_linha_dreno = "if((STATE.oneDriveDeltaFila||[]).length>0) mesclados += await onedriveDeltaProcessarFila();"
chk("a varredura completa automatica (sem link ainda / 30 min de seguranca) e o recomeco por resync -- os DOIS agora drenam a fila do delta",
    orig.count(_linha_dreno) == 0 and novo.count(_linha_dreno) == 2)
_pos_resync = novo.find("Marcador invalidado pela Microsoft")
chk("o dreno do resync fica DEPOIS do 'Marcador invalidado', ou seja, dentro do proprio ramo de resync -- nao so duplicado no ramo errado",
    _pos_resync >= 0 and novo.find(_linha_dreno, _pos_resync) >= 0)
chk("o botao manual 'Sincronizar agora' passa a drenar a fila do delta tambem, nao so o ciclo automatico",
    "if(!ultimaPassadaComErro && (STATE.oneDriveDeltaFila||[]).length>0){" in novo
    and "totalRecebidoTexto += await onedriveDeltaProcessarFila();" in novo)
chk("o dreno manual so roda quando a passada de recebimento nao deu erro -- nao mascara falha de rede como sucesso",
    "if(!ultimaPassadaComErro && (STATE.oneDriveDeltaFila||[]).length>0){" in novo)
chk("onedriveDeltaProcessarFila em si nao foi alterado -- so ganhou pontos novos de chamada (mudanca aditiva)",
    orig.count("async function onedriveDeltaProcessarFila(){") == 1
    and novo.count("async function onedriveDeltaProcessarFila(){") == 1
    and orig.count("if(d===null || d.jaExiste) continue;") == novo.count("if(d===null || d.jaExiste) continue;")
    and orig.count("STATE.oneDriveDeltaFila = fila;\n  return mesclados;\n}") == novo.count("STATE.oneDriveDeltaFila = fila;\n  return mesclados;\n}"))

print("\n=== 90. FOTO BOA NAO E APAGADA POR ITEM SEM FOTO VINDO DE OUTRO APARELHO ===")
# A protecao de foto em aplicarAtualizacaoRemota (caminho do item de TEXTO) so
# era acionada quando o arquivo remoto trazia __fotosOmitidas -- marca que
# separarFotosDoItem so escreve quando o REMETENTE tinha foto
# ("if(tinhaFotos) semFotos.__fotosOmitidas = true"). Um aparelho que sobe o
# item SEM foto nenhuma (fotos ainda nao baixadas ali, ou perdidas ali --
# __fotosPerdidas, em que a referencia nao resolve e vira null) manda
# fotoGeral:null SEM marca; do lado de quem recebe, remotoOmitiuFotos dava
# false, a protecao nao era acionada, e a foto BOA virava null. Mesmo estrago
# ja fechado no caminho dos PACOTES de foto (completarFotosDeItem, secao ja
# coberta pelo t118), que continuou aberto neste caminho.
chk("a protecao de foto NAO depende mais da marca do remetente (__fotosOmitidas)",
    "const ehCampoFotoUnica = (k)=> CAMPOS_FOTO_UNICA.indexOf(k) >= 0;" in novo
    and "if(__ehFotoEmbutida(v)) local[k] = v;" in novo)
chk("campo de foto unica so aceita foto DE VERDADE por cima de foto que ja existe aqui",
    "else if(!__ehFotoEmbutida(local[k])) local[k] = v; // aqui também não há foto — nada a perder" in novo)
chk("a lista de fotos nunca e REDUZIDA pelo que chega (mesma contagem de fotos reais ja usada em completarFotosDeItem)",
    "if(chegaram.length >= aqui.length) local[k] = v;" in novo
    # +1 ocorrencia: a contagem de fotos reais passou a existir tambem em
    # aplicarAtualizacaoRemota, alem dos 2 pontos que ja a usavam
    # (completarFotosDeItem e a juncao de duplicatas).
    and novo.count("const chegaram = v.filter(__ehFotoEmbutida);")
        == orig.count("const chegaram = v.filter(__ehFotoEmbutida);") + 1)
chk("a linha antiga que apagava a foto sem checar nada saiu de aplicarAtualizacaoRemota",
    "const vazioPorqueViajouSeparado = remotoOmitiuFotos" in orig
    and "const vazioPorqueViajouSeparado = remotoOmitiuFotos" not in novo)
chk("o caminho legitimo (__fotosOmitidas) continua marcando o item para reconferir o pacote de fotos",
    "if(remotoOmitiuFotos){ local.__fotosOmitidas = true; local.__fotosAtualizar = true; }" in novo)
chk("o TEXTO comum continua sendo atualizado normalmente -- a correcao nao virou um bloqueio geral",
    "    local[k] = v;\n  }" in novo)

print("\n=== 91. VARREDURA AMPLA: RECUPERA FOTO DE ITEM SEM MARCA DE DANO ===")
# A perda causada pela mesclagem (secao 90) nao deixava marca nenhuma -- o campo
# so recebia null. Todas as recuperacoes anteriores so olham item marcado com
# CAMPO_MARCA_FOTO_PERDIDA, entao esses itens ficavam invisiveis para elas.
# A varredura usa outro sinal: o pacote "fotos_*.json" que existe na nuvem
# prova que aquele item TEVE foto. Prova de comportamento no ENSAIO 29.
chk("a varredura ampla existe e nao depende da marca de dano",
    "async function recuperarFotosVarrendoNuvem(onProgresso){" in novo
    and "function itemTemEspacoDeFotoVazio(obj){" in novo
    and "function __itemLocalDoCaminhoFotosNuvem(caminho){" in novo)
chk("usa UMA listagem da arvore, nao uma chamada de rede por item",
    # +1 em relacao ao original: a varredura reaproveita a MESMA listagem em
    # lote que a sincronizacao ja usava, em vez de perguntar item a item.
    novo.count("await onedriveListarArvore(`${ONEDRIVE_PASTA_APP}/${SUBPASTA_BACKUP}/Simplificado`, 4)")
        == orig.count("await onedriveListarArvore(`${ONEDRIVE_PASTA_APP}/${SUBPASTA_BACKUP}/Simplificado`, 4)") + 1
    and "arvore = await onedriveListarArvore(" in novo)
chk("o gatilho e o pacote fotos_* que existe na nuvem (prova de que o item TEVE foto)",
    'if(typeof no.nome === "string" && no.nome.startsWith("fotos_")) pacotes.push(no);' in novo)
chk("so preenche espaco vazio -- nunca sobrescreve foto boa que ja esta aqui",
    "if(__ehFotoEmbutida(alvo.obj[campo])) continue;" in novo
    and "if(chegaram.length > aqui.length){ alvo.obj[CAMPO_FOTOS_LISTA] = chegaram; mexeu = true; }" in novo)
chk("o mesmo item em duas pastas (renomeacao antiga) vira UM alvo so, nao dois",
    "if(idsJaAlvo.has(local.id)) return;" in novo)
chk("respeita o Parar do painel de progresso, igual as outras recuperacoes",
    novo.count("if(progressoCancelado()) return;") >= 2)
chk("falha de rede vira erro explicito, nao 'conferi tudo e nao achei nada'",
    "}catch(e){ res.erro = true; return res; }" in novo
    and "if(!arvore){ res.erro = true; return res; }" in novo)
chk("entra no MESMO botao de sempre, como terceira etapa -- nenhum botao novo foi criado",
    "rv = await recuperarFotosVarrendoNuvem((feitos, total)=>{" in novo
    and novo.count('onclick="App.recuperarFotosPerdidas(') == orig.count('onclick="App.recuperarFotosPerdidas('))
chk("grava de tempos em tempos -- interrupcao no meio nao perde o que ja voltou",
    novo.count("const gravarSePassouTempo = async () => {") == 2)  # recuperarFotosPerdidasDaNuvem + a varredura

print("\n---------------------------------------")
print("CHECAGENS ESTRUTURAIS:", "FALHOU (%d)" % falhas if falhas else "TODAS OK")
sys.exit(1 if falhas else 0)
