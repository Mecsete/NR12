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
4. `node testes2.js` — suíte funcional (~250 testes) que roda sobre o
   código **extraído do próprio `index.html` entregue**, não sobre um
   rascunho separado

Todos os quatro precisam passar limpo antes de considerar uma tarefa
concluída. Se qualquer um falhar, o trabalho não está pronto — não existe
"passa na maioria".

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
- **Sincronização**: texto sincroniza em qualquer conexão; foto só em
  Wi-Fi. Bug fixes no motor de sync são sempre **aditivos** (ex.: um
  listener novo), nunca alteram a lógica central existente. Last-write-wins
  por timestamp resolve conflito de conteúdo no mesmo endereço — não
  resolve conflito de posição (mesmo item em caminhos diferentes em
  aparelhos diferentes).
- **Excel**: nunca reexportar o `.xlsm` original do cliente (perde macros
  VBA e imagens embutidas). Entregas de laudo geram tabela estruturada ou
  `.xlsx` só com a aba relevante.
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

## Pendência conhecida

`PLR_GRAFICO` (correspondência S/F/P → PLr e Categoria) está marcada no
código com o aviso `ATENÇÃO: TABELA A CONFERIR CONTRA AS NORMAS ANTES DE
ASSINAR`. A coluna PLr segue o Anexo A da ABNT NBR ISO 13849-1; a coluna
Categoria segue a categoria preferencial da Figura B.1 da NBR 14153. Essa
figura é imagem dentro do PDF e não pôde ser lida — é a única parte do
código cuja correspondência não foi verificada item a item. Conferir uma
vez com as normas em mãos e remover o aviso.

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
