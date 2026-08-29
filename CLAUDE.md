# APR Campo NR12 — instruções do projeto

Aplicação de campo para inspeções de conformidade de máquinas conforme NR-12,
usada pela MecSete Engenharia (Rio Verde/GO), principal cliente Corteva
(Formosa-GO). Site publicado em mecsete.github.io/NR12.

## Arquitetura

- **`index.html`** é o app inteiro: um único arquivo HTML de ~3,3 MB / ~15.500
  linhas, sem build step. Publicado direto no GitHub Pages — todo dispositivo
  recebe a mesma versão ao abrir.
- Sem `npm install`, sem bundler, sem framework. Editar é editar o
  `index.html` diretamente.
- Duas telas/módulos dentro do mesmo arquivo:
  - **Módulo Simplificado** — em desenvolvimento ativo. Inclui a central
    "Laudo": revisão de textos da IA, biblioteca de medidas de mitigação,
    classificação PLr/Categoria, HRN editável, plaqueta do equipamento,
    módulo de impressão A4.
  - **Módulo Completo** — **CONGELADO**. Ver seção seguinte.

## ⚠️ Módulo Completo — identificadores congelados

Estes 7 identificadores NUNCA podem ser alterados, nem por refatoração,
nem por "melhoria", nem por engano ao mexer em algo próximo:

```
linhaMaster, exportarMasterCSV, exportarMasterXLSX (grafado exportarMasterXLS
no código), exportarMasterXLSXFotos, catByKey, calcRisco, GRUPOS_MASTER
```

Antes de qualquer entrega que toque `index.html`, rode:

```bash
python3 frozen.py original.html index.html
```

`original.html` é uma cópia de uma versão já confirmada como correta —
manter sempre uma na pasta do projeto (git facilita: `git show
<sha-do-ultimo-commit-bom>:index.html > original.html`). Isso compara o
hash SHA256 do corpo de cada identificador entre os dois arquivos. Se
qualquer um mudar 1 byte, a validação PRECISA falhar e a entrega PRECISA
ser corrigida antes de prosseguir. Nunca ignore essa falha.

## ⛔ REGRA ZERO — ANÁLISE DE PERDA DE DADOS ANTES DE QUALQUER ENTREGA

**Esta regra vem antes de todas as outras, inclusive da sequência de
validação.** Ela existe porque, em agosto/2026, o engenheiro responsável
descobriu **em campo, com dado real de cliente**, uma sequência de perdas de
foto que eu deveria ter encontrado antes de entregar: duplicata apagando
foto boa na nuvem, aparelho sem foto sobrescrevendo aparelho com foto,
rascunho descartado ao tocar fora do formulário, e exclusão inferida
apagando até 516 arquivos da nuvem sem perguntar. Todas foram encontradas
por quem não é programador, depois de já estarem publicadas.

### O princípio, na forma em que o responsável o enunciou

> **"Só excluir o que for apagado pelo usuário."**

Generalizando: **o app só pode destruir dado quando existe INTENÇÃO
DECLARADA do usuário para aquele dado específico.** Ausência, silêncio,
divergência, erro de leitura, timeout, campo vazio vindo de fora — nada
disso é intenção. Inferência nunca autoriza destruição.

### As sete perguntas obrigatórias

Antes de entregar QUALQUER mudança que toque em `index.html`, responder por
escrito, uma a uma. Se a mudança não toca em dado, responder "não se
aplica" — mas responder.

1. **Esta mudança pode apagar, esvaziar ou sobrescrever algum campo que o
   usuário preencheu?** Rastrear toda atribuição nova: `x = y`, `delete x`,
   `splice`, `filter`, `length = n`, `push` que substitui.
2. **Se um valor chegar vazio/nulo/ausente de fora (nuvem, importação,
   outro aparelho, arquivo), o que acontece com o valor bom que já está
   aqui?** A resposta certa é sempre "nada". Vazio de fora nunca vence
   conteúdo local.
3. **Existe algum caminho em que o app conclui "isto foi apagado" sem o
   usuário ter apagado?** Se existe, esse caminho não pode destruir —
   no máximo perguntar, e no automático nem isso.
4. **O que acontece se esta operação for interrompida no meio?** (app
   fechado, tela apagada, bateria, aba morta, rede caindo). O que já foi
   feito continua salvo? O que faltava se perde ou fica na fila?
   **E a pergunta gêmea, que faltou em 27/08/2026:** esta operação pode
   CAUSAR a interrupção? Pico de memória, cópia de estrutura grande, laço
   longo — tudo que pode fazer o sistema encerrar a aba é caminho de perda
   de dados, porque leva embora o que ainda não foi gravado. Travamento
   nunca é "só desempenho": duplicar equipamento alocava 120 MB, derrubava
   o app e apagava as fotos recém-tiradas, e passou uma varredura inteira
   classificado como problema de escala.
5. **O que acontece se a leitura do banco falhar e o app abrir com uma
   cópia antiga?** A gravação seguinte destrói o registro bom? (Foi
   exatamente esse o furo do `dbGet` → `localStorage` → `dbSet`.)
6. **Um aparelho em estado ruim pode contaminar um aparelho em estado
   bom?** O aparelho danificado é o que MAIS envia — a sincronização
   precisa presumir que quem chega pode estar pior do que quem está aqui.
7. **Se eu estiver errado sobre tudo acima, o usuário consegue voltar
   atrás?** Ponto de restauração, cópia na nuvem, backup — e ele consegue
   PERCEBER que perdeu algo, ou o dano fica invisível?

### Regras de projeto derivadas (não flexibilizar)

- **Assimetria de custo é lei.** Errar para o lado conservador custa um
  arquivo a mais, espaço em disco, uma pergunta extra. Errar para o outro
  lado custa trabalho de campo que não volta — o inspetor teria que dirigir
  de volta à planta, quando ainda é possível. Na dúvida, **preserve**.
- **Foto de campo é o dado mais caro do app.** É o único que não pode ser
  redigitado. Toda mudança que encosta em foto exige ensaio próprio em
  `banco.js`, não só teste estático.
- **A nuvem costuma ser a ÚLTIMA cópia.** Todo `DELETE` na nuvem é
  potencialmente irreversível. Nenhum caminho automático pode apagar na
  nuvem sem lápide de intenção declarada.
- **Vazio nunca vence cheio.** Nem em mesclagem, nem em importação, nem em
  restauração, nem em complemento de fotos.
- **Perda silenciosa é pior que erro barulhento.** Se não dá para preservar,
  tem que dar para PERCEBER: marca no item, aviso na tela, linha no
  diagnóstico. Um campo que fica vazio sem avisar é o pior desfecho
  possível — some a informação e some também a chance de recuperá-la.
- **Mudança em motor de sincronização é ADITIVA.** Ponto novo de chamada,
  guarda nova, listener novo — nunca reescrever a lógica central existente.

### O que entregar junto com a correção

Toda mudança que responda "sim" a qualquer uma das sete perguntas precisa
de **um ensaio em `banco.js` que reproduza o estrago e prove que ele não
acontece mais**. O padrão do projeto (ver ENSAIO 26, 28 e 29) inclui uma
checagem que roda a REGRA ANTIGA no mesmo cenário e confirma que ela
destruiria o dado — sem isso, não há prova de que o teste testa algo.

### Documento de referência

`AUDITORIA-PERDA-DADOS.md`, na raiz do repositório, tem o levantamento de
todos os pontos do código que podem destruir dado, o estado de cada um e o
que ainda é risco aceito. Reler antes de mexer em sincronização, fotos,
exclusão, importação ou armazenamento — e **atualizar** quando um caminho
novo for criado.

## Sequência de validação obrigatória antes de qualquer entrega

Rodar sempre, nesta ordem, depois de qualquer edição no `index.html`:

1. `python3 frozen.py original.html index.html` — identificadores
   congelados byte a byte
2. `python3 check.py index.html` — `node --check` em todos os blocos
   `<script>` do arquivo
3. `python3 estrutura.py original.html index.html` — checagens estruturais
   (arquitetura de fotos, motor de sincronização, colunas do Excel, módulo
   de impressão removível etc. — ver o próprio arquivo para a lista
   completa; sem argumentos, assume `original.html` e `index.html` na
   pasta atual)
4. `node testes2.js` — suíte funcional que roda sobre o
   código **extraído do próprio `index.html` entregue**, não sobre um
   rascunho separado
5. `node banco.js` — banco de ensaio do motor de sincronização (ver abaixo)

Todos os cinco precisam passar limpo antes de considerar uma tarefa
concluída. Se qualquer um falhar, o trabalho não está pronto — não existe
"passa na maioria".

### `banco.js` — por que existe

Os testes de 1 a 4 conferem o código **parado**: se a função tem tal linha,
se o identificador não mudou, se a função devolve tal valor. Três defeitos
graves de sincronização passaram por todos eles em agosto/2026 — aparelho
que não criou nada reenviando a árvore inteira, sincronização que nunca
terminava, e um cronômetro de segurança matando sincronização saudável.
Nenhum era detectável olhando uma função isolada: só apareciam **rodando o
motor em ciclos**.

`banco.js` sobe dois aparelhos e uma nuvem de mentira em memória, roda o
código real do `index.html` e cobra uma propriedade só, que é a que todos
os três violaram:

> Sem ninguém mexer em nada, a sincronização tem de PARAR sozinha.

Se um ciclo sem edição nenhuma ainda transfere alguma coisa, existe defeito
— não importa qual seja. Os ensaios cobrem: aparelho que só recebe,
aparelho que restaurou backup, renomear, mover, excluir, fotos, nomes que
colidem depois do corte de 48 caracteres, pasta que falha ao listar,
envio recusado por limite de requisições, sincronização morta no meio, e
uma rodada de resistência com falhas aleatórias.

Ao mexer em qualquer coisa do motor de sincronização, o certo é
**acrescentar um ensaio novo aqui** reproduzindo o caso, e não só uma
checagem de texto no `estrutura.py`.

## Histórico de versões (`VERSOES.md`)

Toda versão publicada precisa de uma entrada nova **no topo** de
`VERSOES.md`, com o mesmo `APP_BUILD` gravado no `index.html` e uma
descrição do que mudou em relação à versão anterior — escrita para quem
usa o app, não para quem programa. Manter pelo menos as 10 últimas.

Publicar é: `git commit` com mensagem descritiva + `git push`. O GitHub
Pages atualiza sozinho e o `sw.js` leva a versão nova para os aparelhos na
próxima abertura com internet. **Nunca publicar sem passar antes pelos
quatro passos de validação.**

## Metodologia de patch

- Mudanças no `index.html` são **substituições de string cirúrgicas**, não
  reescritas amplas. Historicamente aplicadas via scripts Python com uma
  função `rep(old, new, tag, cnt=1)` que garante contagem exata de
  ocorrências antes de substituir — isso evita substituir o trecho errado
  silenciosamente.
- Nunca usar spread em array grande (`Math.max(0, ...array)`) — estoura a
  pilha acima de ~130 mil itens. Usar `.reduce()`.
- `APP_BUILD` (formato `"DD/MM/AAAA HH:MM"`, fuso America/Sao_Paulo) é um
  texto fixo, declarado **uma vez** no topo do arquivo. Atualizar em toda
  entrega, com o mesmo valor usado no `VERSOES.md` e na mensagem do commit.

  Até 07/08/2026 ele era calculado de `document.lastModified` (a hora em que
  o GitHub publicou o arquivo), e a string no código era só um *fallback*.
  Resultado: o número na tela nunca batia com o do código nem com o do
  histórico — publicado às 13:11 GMT, o aparelho mostrava 10:11, enquanto a
  entrega estava registrada como 10:30. Perguntar "você está na versão X?"
  não tinha resposta. Agora **o que está no código é o que aparece na tela**.
  Não voltar a derivá-lo da data do arquivo.

## Arquiteturas que não podem ser "corrigidas" por engano

- **CAMADA_FOTOS**: fotos ficam como referência curta `idbfoto:<id>` dentro
  de `STATE`; os bytes reais moram no IndexedDB sob a chave `foto:<id>`.
  Nunca tratar foto como base64 inline dentro de `STATE`.
- **Sincronização**: texto e foto sobem em qualquer conexão (a regra "foto só
  no Wi-Fi" foi removida em 25/08/2026: o Safari do iPhone nunca informa o
  tipo de rede, então "foto só no Wi-Fi" significava, na prática, "foto nunca
  sobe" — um dia inteiro de campo terminava com tudo parado no aparelho).
  RECEBER foto automaticamente continua exigindo Wi-Fi confirmado. Bug fixes
  no motor de sync são sempre **aditivos** (ex.: um listener novo), nunca
  alteram a lógica central existente. Last-write-wins por timestamp resolve
  conflito de conteúdo no mesmo endereço — não resolve conflito de posição
  (mesmo item em caminhos diferentes em aparelhos diferentes).
- **Excel**: nunca reexportar o `.xlsm` original do cliente (perde macros
  VBA e imagens embutidas). Entregas de laudo geram tabela estruturada ou
  `.xlsx` só com a aba relevante.
- **Rotina de fundo NUNCA decide apagar lendo o `STATE` global.** `STATE` é
  reatribuído inteiro em três momentos — abertura do app (começa vazio até a
  leitura do banco terminar), volta pelo bfcache, e restauração de ponto.
  Qualquer rotina disparada sem `await` que leia `STATE` depois de um `await`
  pode pegá-lo vazio. Foi assim que `fotosLimparOrfasSeForHora` apagou fotos
  de campo em 25/08/2026: montava a lista de "fotos ainda usadas" a partir do
  `STATE` e removia do IndexedDB tudo que sobrava. Ler a fonte **persistida**
  (`DB_KEY`), somar todas as fontes possíveis (STATE, pontos de restauração,
  rascunho) e desistir da operação inteira quando a fonte de verdade não puder
  ser lida. Ver seção 73 do `estrutura.py` e t116 do `testes2.js`.
- **Um item tem UM endereço na nuvem, identificado pelo id, não pelo nome.**
  O caminho é montado com o nome legível de cada nível, mas o nome é
  decoração — quem identifica é o sufixo de id no fim da pasta. Comparar o
  caminho inteiro fazia toda renomeação virar "mudou de endereço": o app
  apagava a cópia antiga e reenviava o item e todos os filhos, a cada ciclo,
  sem convergir nunca. Usar `onedriveMesmoEnderecoLogico`. E, entre pastas
  irmãs de mesmo id (herança das renomeações antigas — na nuvem real do
  usuário o mesmo projeto existe em três pastas), só a canônica é lida:
  `onedriveDuplicatasParaIgnorar`. Seções 73 e 77; ensaios 22, 23 e 24.
- **Nunca substituir um arquivo da nuvem por um muito menor**
  (`onedriveEnvioEncolheDemais`). Nos arquivos no formato antigo a foto vai
  embutida no arquivo do item; se o que vai subir é uma fração do que está
  lá, falta alguma coisa neste aparelho e regravar apaga a última cópia. Vale
  também para pacote de fotos: `completarFotosDeItem` nunca reduz a
  quantidade de fotos REAIS de quem recebe — contar `data:image`, nunca o
  `length` da lista (uma lista danificada mantém o tamanho e perde o
  conteúdo). Seções 75 e 79; t118 e t121.
- **Módulo de impressão A4**: vive inteiro entre as marcas
  `INÍCIO DO MÓDULO DE IMPRESSÃO DO LAUDO — BLOCO REMOVÍVEL` e
  `FIM DO MÓDULO DE IMPRESSÃO DO LAUDO`. Removível sem tocar em mais nada
  do arquivo — `estrutura.py` testa isso de verdade (remove e roda
  `node --check`).

## O que NÃO está neste pacote (e onde buscar)

O `index.html` não é sozinho o app publicado. Ele referencia arquivos
irmãos que vivem no repositório `github.com/Mecsete/NR12`:

- `manifest.json` — manifesto do PWA
- `sw.js` — service worker (é ele que faz a atualização automática nos
  aparelhos)
- `icons/icon-192.png` — ícone de instalação

**Por isso o ponto de partida correto é `git clone` do repositório**, e não
esta pasta isolada. Copie para dentro do clone só os arquivos que faltam
lá: `CLAUDE.md` e os quatro scripts de validação.

Também não estão aqui — e **não devem** ser commitados:

- **Modelo `.xlsm` da Corteva** e **PDFs das normas** (NR-12, NBR ISO
  12100, NBR 14153, manual de aplicação, procedimentos do cliente).

  No uso normal da aplicação, esses arquivos são enviados pelo próprio
  usuário dentro do app (o `.xlsm` na aba Laudo; os PDFs na configuração
  de IA, de onde o PDF.js extrai o texto). São dados do usuário, não do
  código — nada a fazer aqui.

  **Nunca commitar as normas no repositório:** `Mecsete/NR12` é público
  (serve o GitHub Pages) e as normas ABNT são pagas. Subi-las seria
  distribuição indevida. Manter numa pasta local ignorada pelo Git:

  ```
  # .gitignore
  normas/
  modelos/
  original.html
  ```

  **Quando o Claude Code precisa delas:** apenas em tarefas que criam ou
  alteram **citação de norma** — acrescentar uma medida à
  `BIBLIOTECA_MEDIDAS`, mexer nas tabelas HRN, preencher `PLR_GRAFICO`.
  Nessas tarefas, copiar o PDF para `normas/` antes de começar e conferir
  o item no documento, nunca de memória: é laudo assinado por engenheiro
  responsável, com ART. Uma citação errada é responsabilidade técnica, não
  bug.

  Para todo o resto (interface, sincronização, impressão, layout,
  exportação), os PDFs não fazem falta.

## ⚠️ Textos do laudo: a fonte é o CAMPO, nunca o `laudoIA`

Constatado em 27/08/2026 e confirmado pelo engenheiro responsável: os textos
gravados em `laudoIA` **estão trocados entre equipamentos**. 52 máquinas
(26 em "Corteva Agriscience", 26 em "Teste do Onedrive", área Debulha)
receberam o mesmo texto de escopo — a descrição de um *silo de armazenagem* —
aplicada a debulhadores, trippers, esteiras, correias, mesa e máquinas de
pré-limpeza. **Todas com `st:"ok"`**, isto é, prontas para sair no laudo
impresso exatamente assim.

Em qualquer tarefa de gerar, revisar ou conferir texto de laudo, ler apenas
os campos de campo. O mapeamento oficial já existe no código, em
`laudoTextoOriginal`:

| Campo do laudo | Origem |
|---|---|
| escopo | `nomeMaquinaS(maquina)` + `maquina.descricao` |
| tarefa | `tarefa.descricao`, ou o nome da tarefa |
| risco | `risco.descricao` |
| existente | `risco.descMedida` |
| solucao | `risco.sugestaoMitigacao`, caindo para `descMedida` |

**Também não confiar em `maquina.tipoEquip`**: está errado em vários itens
(QD-NDC-01 marcado "Debulhador" quando é máquina de pré-limpeza; Silo 2107
marcado "Esteira transportadora") e vazio em 33 de 48. Agrupar por nome e
descrição reais — e **quando a descrição de campo disser o tipo, ela manda
sobre o nome** (ex.: "Correia CNV-002" tem descrição "Mesa que alimenta a
CV-3404": é uma mesa).

### O import não conserta isso

`importarTextosLaudo` pula todo campo que já tenha `sug`, `fin` ou `st` — é a
proteção correta contra sobrescrever decisão, mas impede corrigir o que está
errado. Medido na Debulha/Corteva (75 riscos): escopo 35/35 decididos, tarefa
39/39, risco 75/75, solução 75/75; só os 49 campos vazios de "mitigação
existente" aceitariam importação.

**Não existe hoje ação de "devolver campo para pendente".** Se for preciso
criá-la, ela é destrutiva de decisão: tem de ser explícita, listar antes o
que vai mudar, e nunca rodar em massa sem confirmação (REGRA ZERO).

## `PLR_GRAFICO` — conferido em 11/08/2026

A coluna **Categoria** foi conferida contra a **ABNT NBR 14153:2022, Figura
B.1**, lida diretamente da imagem do PDF. Foram encontrados e corrigidos
**dois valores errados**: `S1F1P1` trazia Categoria B e `S1F2P2` trazia
Categoria 2.

A causa do erro é conceitual e vale registrar, porque é fácil reintroduzi-la:
são **dois gráficos de risco diferentes**.

- **NBR 14153 (Figura B.1)** tem **cinco** saídas. O ramo `S1` vai direto
  para a Categoria 1 — **não se divide em F e P**. Só `S2` se ramifica.
- **ISO 13849-1 (Anexo A)** tem **oito** saídas, porque ali `S1` também se
  divide em F e P, gerando PLr a/b/b/c.

Aplicar o gráfico de oito saídas da 13849 à coluna de Categoria é o que
produzia os valores errados. **Nunca derivar uma coluna da outra.** A própria
NR-12 registra que "existe uma correlação, embora não linear, entre os
conceitos de PL e categoria", e a 13849-1 confirma: um PL "c" pode ser
atingido por categoria 1, 2 ou 3.

A coluna **PLr** foi conferida na **Figura A.1 da ISO 13849-1:2023** em
13/08/2026, uma a uma: S1F1P1→a, S1F1P2→b, S1F2P1→b, S1F2P2→c, S2F1P1→c,
S2F1P2→d, S2F2P1→d, S2F2P2→e. Bate com as duas células que já haviam sido
confirmadas no texto (exemplos do Anexo I). **As duas colunas estão fechadas.**

### Decisão sobre o PLr (11/08/2026)

**Um valor só, o exigido. Não existe "PLr antes e depois" no app.** Decidido
pelo Luiz depois da conferência nas normas. As razões, para não voltar atrás
por engano:

- PLr é o nível **requerido** pela função de segurança, derivado do risco
  encontrado. Não é resultado de medida, é requisito.
- Reivindicar o PL **alcançado** exige MTTFd, DC e CCF dos componentes reais
  (a NR-12 fala em "análise quantitativa"), dado que só existe depois da
  solução comprada — laudo de campo não tem como afirmar.
- O que tem antes e depois é o **risco** (HRN), não o PLr.

Se um dia entrar um "depois", o campo certo é **Categoria requerida da
solução**, que é o que o item 12.39 "a" da NR-12 pede.

### Como ler figura que é imagem dentro de PDF

`pdftoppm` não está instalado neste ambiente, mas `pdftotext` sim (poppler em
`/mingw64/bin`). Para figuras, extrair o XObject de imagem da página direto do
PDF com Python (`/Subtype /Image`, `zlib.decompress`), montar um PNG à mão
(cabeçalho IHDR + IDAT) e abrir com a ferramenta Read, que lê imagem. Recortar
e ampliar a região com repetição de pixels resolve os casos em que os símbolos
são pequenos. Foi assim que a Figura B.1 foi lida.

Os PDFs das normas ficam em `C:\Users\luiza\OneDrive\Engenharia Mecânica\
Materiais para Estudo\NR12\` — fora do repositório, que é público.

## Aviso sobre `original.html`

`original.html` é a referência de comparação dos scripts. Ele precisa ser
uma versão **anterior e já validada** — não uma cópia do `index.html`
atual. Copiar o atual faz `frozen.py` comparar o arquivo com ele mesmo e
passar sempre, o que anula a proteção.

Fluxo correto com git: antes de começar a editar, gerar a referência a
partir do último commit bom.

```bash
git show HEAD:index.html > original.html
```

Refazer isso a cada nova sessão de trabalho.

## Ao acrescentar checagens em `estrutura.py`

Editar `estrutura.py` por script com `s.replace(...)` **sem conferir a
contagem** falha em silêncio: se o trecho procurado não bater, o script
grava o arquivo igualzinho e ainda imprime "atualizado". Foi assim que as
seções 22 a 26 deixaram de existir durante cinco entregas seguidas, sem
ninguém perceber — `estrutura.py` continuava dando "TODAS OK" porque as
checagens novas simplesmente não estavam lá.

Depois de acrescentar uma seção, **confirmar que ela roda**:

```bash
python3 estrutura.py original.html index.html | grep '=== '
```

O número de seções tem que ter crescido. Vale o mesmo princípio da função
`rep()` dos patches: nenhuma substituição sem contagem verificada.

## APP_BUILD: ler o relógio EM TODA entrega

O carimbo tem de vir de uma execução de `date '+%d/%m/%Y %H:%M'` feita
**naquela entrega** — nunca do carimbo anterior mais um tanto, nunca de
estimativa. Em 25/08/2026, numa sessão com seis publicações seguidas, o
relógio foi lido uma vez e os cinco carimbos seguintes foram escritos de
cabeça: o desvio cresceu até 74 minutos e o número perdeu a única serventia
que tem (o Luiz olhar o rodapé e saber qual versão está no aparelho).

Na prática, passar a hora como argumento em vez de digitá-la:

```bash
AGORA=$(date '+%d/%m/%Y %H:%M') && python patch.py "$AGORA"
```

Se um carimbo errado já foi publicado, **não reescrever os títulos antigos do
`VERSOES.md`** — é por eles que se identifica a versão que está num aparelho.
Acrescentar uma tabela de correspondência "carimbo mostrado → hora real".

## Cuidado ao gravar com script Python

Um script de patch que faz várias substituições e só grava no fim **perde
tudo** se uma substituição intermediária falhar (`sys.exit` antes do
`write`). Isso aconteceu três vezes em 25/08/2026, sempre com o mesmo
sintoma: o script imprime "OK" para as primeiras e some com elas. Ou gravar
a cada substituição, ou usar a ferramenta de edição direta quando forem
poucas mudanças.

Lembrar também que `estrutura.py` ancora várias checagens na **assinatura**
de funções (`find("async function X(a, b){")`). Acrescentar um parâmetro
derruba a seção inteira por um motivo que nada tem a ver com o que ela
prova — ancorar pelo NOME (`find("async function X(")`).

## Aviso sobre `estrutura.py`

As checagens de `estrutura.py` foram escritas sob medida para as entregas
já feitas (contagens exatas como "8 carimbos `atualizadoEm` novos",
"delta de bytes entre 20.000 e 220.000"). Elas provam que ESSAS entregas
específicas ficaram corretas — não são um teste genérico que qualquer
mudança futura precise satisfazer com os mesmos números.

Para uma tarefa nova: usar `estrutura.py` como **modelo de estilo** de
checagem (comparar antes/depois, contar ocorrências de marcadores,
verificar que blocos removíveis continuam isolados), mas escrever
checagens novas com os números certos para o que mudou daquela vez —
não reaproveitar os números antigos achando que vão bater.

## Scripts de validação incluídos nesta pasta

- `frozen.py` — verificação SHA256 dos identificadores congelados
- `check.py` — `node --check` em todos os blocos `<script>`
- `estrutura.py` — checagens estruturais específicas do projeto
- `testes2.js` — suíte funcional (Node, sem dependências externas — os
  módulos do app são extraídos por regex direto do `index.html` e rodados
  em `vm.createContext`)
- `banco.js` — banco de ensaio do motor de sincronização: dois aparelhos e
  uma nuvem de mentira em memória, rodando em ciclos até parar. Aceita o
  caminho do arquivo como argumento (`node banco.js index.html`)

Ao adicionar uma funcionalidade nova, o padrão do projeto é: escrever o
código, extrair o trecho novo do `index.html` já modificado (não de um
rascunho `.js` solto), rodar os testes sobre esse trecho extraído, e só
então considerar a tarefa pronta. Isso garante que o que foi testado é
exatamente o que foi entregue.

## Estilo de comunicação do responsável pelo projeto

Luiz (engenheiro responsável) prefere respostas diretas, sem explicação de
processo intermediário, sem perguntas de acompanhamento não solicitadas, e
comunica em português. Ao concluir uma tarefa: confirmar o que passou na
validação e explicar o resultado em linguagem acessível para quem não é
programador — ele é engenheiro mecânico, não desenvolvedor.
