# Auditoria de perda de dados — APR Campo NR-12

Levantamento de **todo** ponto do código capaz de destruir informação, o
estado de cada um, e o que continua sendo risco aceito.

Feita em 26/08/2026, depois de uma sequência de perdas de foto descobertas
**em campo, com dado real de cliente**, por quem não é programador. Todas
já estavam publicadas quando foram descobertas. Este documento existe para
que a próxima seja encontrada aqui, e não lá.

O princípio que organiza tudo, como o engenheiro responsável o enunciou:

> **"Só excluir o que for apagado pelo usuário."**

Generalizando: **o app só destrói dado quando existe intenção declarada do
usuário para aquele dado específico.** Ausência, silêncio, divergência de
versão, erro de leitura, campo vazio vindo de fora — nada disso é intenção.

---

## Como ler a tabela

| Marca | Significado |
|---|---|
| 🟢 | Protegido, com ensaio automatizado que prova |
| 🟡 | Protegido por lógica, sem ensaio dedicado |
| 🔴 | Risco aceito conscientemente — explicado abaixo |

---

## 1. Sincronização — o caminho mais perigoso

A nuvem costuma ser a **última cópia** da foto de campo. Todo `DELETE` lá é
potencialmente irreversível.

| # | Caminho | Estado | Proteção |
|---|---|---|---|
| 1.1 | Exclusão **confirmada** pelo usuário propaga para a nuvem | 🟢 | É o caminho correto: lápide de intenção declarada. ENSAIO 21 |
| 1.2 | Exclusão **inferida** ("sumiu da árvore local") | 🟢 | **Corrigido 26/08 23:00.** Automático nunca apaga; manual pergunta, seja 1 item ou 500. Antes: até 516 itens sumiam sem pergunta num projeto de 1722. ENSAIO 21 |
| 1.3 | Item que sumiu por acidente volta sozinho | 🟢 | Como a nuvem manteve o arquivo, o recebimento devolve o item. ENSAIO 21 |
| 1.4 | Aparelho **sem** foto sobrescreve aparelho **com** foto | 🟢 | **Corrigido 26/08 21:39.** Campo de foto só aceita foto de verdade; lista nunca reduz. ENSAIO 28 |
| 1.5 | Pacote de fotos com `[null, null]` reduz lista boa | 🟢 | `completarFotosDeItem` conta fotos reais dos dois lados. t118 |
| 1.6 | Duplicata (mesmo id em 2 lugares) apaga foto boa na nuvem | 🟢 | Enquanto houver id duplicado, nenhuma cópia sobe. ENSAIO 26 |
| 1.7 | `sincJuntarDuplicata` descarta a cópia com foto | 🟢 | Preserva foto embutida e a lista com mais fotos reais |
| 1.8 | Envio regrava por cima de arquivo maior na nuvem | 🟢 | `onedriveEnvioEncolheDemais` bloqueia. t121 |
| 1.9 | Renomear item apaga o endereço antigo com as fotos | 🟢 | Comparação por esqueleto de ids. ENSAIO 22/23 |
| 1.10 | Risco órfão em fila infinita | 🟢 | Cache de órfãos conhecidos. ENSAIO 25, t122 |
| 1.11 | Arquivo ilegível na nuvem em laço eterno | 🟢 | Quarentena por caminho+tamanho |
| 1.12 | Fila do delta presa para sempre no diagnóstico | 🟢 | **Corrigido 26/08 21:07.** Drenada após varredura completa |

---

## 2. Armazenamento local

| # | Caminho | Estado | Proteção |
|---|---|---|---|
| 2.1 | Leitura do banco falha → app abre com cópia velha do `localStorage` → **primeira gravação destrói o registro bom** | 🟢 | **Corrigido 26/08 23:00.** `__leituraDegradada` faz `dbSet` reler o banco antes de gravar por cima; se o banco responde, a gravação é recusada e o chip mostra erro |
| 2.2 | Faxina de fotos órfãs apaga foto viva | 🟢 | Lê o registro **gravado** (não o STATE em memória, que é trocado inteiro na abertura), soma pontos de restauração e rascunho, e tem disjuntor: desiste se >60% parecer órfã |
| 2.3 | Gravação falha em silêncio e a sessão inteira roda sem salvar | 🟢 | `dbSet` tenta o caminho completo a cada chamada; erro aparece no chip de status |
| 2.4 | Foto perdida vira indistinguível de "nunca fotografado" | 🟢 | `__fotosPerdidas` + quadro vermelho hachurado na tela |
| 2.5 | Foto perdida **sem** marca (perda por mesclagem) | 🟢 | **Corrigido 26/08 22:04.** Varredura ampla usa o pacote na nuvem como prova. ENSAIO 29 |

---

## 3. Formulários e edição

| # | Caminho | Estado | Proteção |
|---|---|---|---|
| 3.1 | Tocar fora do formulário descarta foto recém-tirada | 🟢 | **Corrigido 26/08 13:41.** Fechar salva sozinho quando há mudança |
| 3.2 | App fechado no meio de uma edição | 🟡 | `gravarDraftPersistente` guarda o rascunho no IndexedDB |
| 3.3 | Texto do laudo aplicado é sobrescrito pela IA | 🟢 | Campo com decisão nunca é tocado por geração nem por importação |
| 3.4 | Recompor frases do risco apaga frase digitada à mão | 🟢 | Só reescreve o que o próprio app tinha montado. t120 |

---

## 4. Importação e restauração

| # | Caminho | Estado | Proteção |
|---|---|---|---|
| 4.1 | Importar backup substitui dados mais novos | 🟡 | Prévia recalculada no momento de confirmar + ponto de restauração automático antes |
| 4.2 | Restaurar ponto descarta trabalho posterior | 🟡 | Confirmação explícita mostrando o que tem no ponto |
| 4.3 | Importar textos do laudo por cima de decisão | 🟢 | Só preenche campo vazio e sem decisão. t113 |
| 4.4 | Importar plaqueta sobrescreve inventário | 🟢 | Só preenche campo vazio. t115 |
| 4.5 | Pontos de restauração apagados antes da hora | 🟢 | Só descarta ponto antigo depois que tudo está confirmado na nuvem |

---

## 5. Exclusões pedidas pelo usuário

Estas **devem** apagar — é intenção declarada. O que se garante é o alcance.

| # | Caminho | Estado | Proteção |
|---|---|---|---|
| 5.1 | Excluir área/máquina leva junto os filhos | 🟢 | `idsSincronizaveisDe` reúne a subárvore inteira |
| 5.2 | Pergunta "apagar também na nuvem?" | 🟢 | Feita **na hora**, não escondida dentro da sincronização |
| 5.3 | Item apagado volta do outro aparelho | 🟢 | Lápides sincronizadas. ENSAIO 20/21 |
| 5.4 | Lápide apaga versão mais nova legítima | 🟢 | `lapideVenceDadosRemotos` compara carimbos |
| 5.5 | "Apagar todos os dados" | 🟡 | Exige digitar APAGAR |

---

## 6. Riscos aceitos conscientemente 🔴

Documentados porque a decisão foi deliberada, não por descuido.

### 6.1 Exclusão de foto não se propaga mais entre aparelhos
Desde 26/08 21:39, apagar uma foto de propósito num aparelho não a remove
dos outros. **Por quê:** a regra que impede um aparelho sem foto de apagar
a foto boa de outro não tem como distinguir "não tenho a foto" de "apaguei
a foto". Refazer uma exclusão custa um toque; recuperar foto de campo custa
uma viagem de volta à planta. **Consequência prática:** apagar em cada
aparelho, ou usar o "X" no quadro da foto.

### 6.2 Conflito de posição não é resolvido
Last-write-wins por carimbo resolve conflito de **conteúdo** no mesmo
endereço. Não resolve o **mesmo item em caminhos diferentes** em aparelhos
diferentes. "Juntar duplicatas" existe para isso, e preserva foto.

### 6.3 Histórico de sincronização é truncado em 80 eventos
`logSincronizacao` corta os mais antigos. É diagnóstico, não dado de campo.

### 6.4 Fila do delta expira em 14 dias
Item que só dá erro por 14 dias sai da fila. A varredura completa de 30 em
30 minutos redescobre qualquer item real.

---

## 7. O que ainda não tem ensaio dedicado (dívida)

Ordem de prioridade para quando houver tempo:

1. **Importação de backup** (4.1) — o caminho que substitui a maior
   quantidade de dado de uma vez, e o que tem menos teste automatizado.
2. **Restauração de ponto** (4.2) — idem, e interage com a faxina de fotos.
3. **Rascunho persistente** (3.2) — depende do IndexedDB, sem ensaio de
   interrupção real.
4. **Faxina de fotos órfãs** (2.2) — tem disjuntor, mas o disjuntor em si
   nunca foi exercitado por ensaio.

---

## 8. Lições que valem para toda mudança futura

1. **Ausência não é intenção.** O app não pode concluir que algo foi
   apagado só porque não o encontra.
2. **Vazio nunca vence cheio.** Em nenhuma mesclagem, importação,
   restauração ou complemento.
3. **O aparelho danificado é o que mais envia.** A sincronização precisa
   presumir que quem chega pode estar pior do que quem está aqui.
4. **Perda silenciosa é pior que erro barulhento.** Se não dá para
   preservar, tem que dar para perceber.
5. **Um teste que não prova o estrago não prova nada.** O padrão do projeto
   é rodar a regra ANTIGA no mesmo cenário e confirmar que ela destruiria o
   dado (ENSAIO 26, 28, 29).
6. **Freio proporcional falha em projeto grande.** O freio de "exclusão em
   massa" era 30% do total — inofensivo em projeto pequeno, e liberava 516
   exclusões silenciosas em projeto real. Limite proporcional precisa sempre
   ser conferido no tamanho REAL do cliente, não no do teste.
