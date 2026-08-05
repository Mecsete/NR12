# Histórico de versões — APR Campo NR-12

Cada linha é uma versão publicada em <https://mecsete.github.io/NR12>.
O código da versão aparece dentro do app, no rodapé de Configurações
(“Versão DD/MM/AAAA HH:MM”, horário de Brasília) — é por ele que se confere
qual versão está rodando num aparelho.

Os aparelhos se atualizam sozinhos: ao abrir o app com internet, o service
worker (`sw.js`) baixa a versão nova. Se a tela continuar mostrando o código
antigo, feche e abra o app novamente.

> As versões anteriores a 31/07/2026 foram enviadas pela interface web do
> GitHub, sem descrição do que mudou — por isso aparecem aqui apenas com a
> data. As descrições passam a existir a partir de 31/07/2026.

---

## 05/08/2026 19:05

A IA passa a aprender com os laudos que você já aprovou.

**Como era.** Cada texto nascia do zero. A IA recebia a instrução configurada,
os trechos das normas em PDF e a anotação que o inspetor escreveu naquele item
— nada mais. Dois riscos de correia idênticos, em laudos diferentes, podiam
sair redigidos de formas diferentes, e uma correção feita à mão no laudo
passado não influenciava em nada o laudo seguinte.

**Como ficou.** Ao gerar um texto, o app procura nos laudos deste aparelho os
casos parecidos em que você já **aplicou** ou **editou** a sugestão, e envia
os mais próximos como exemplo. A IA passa a escrever no padrão já consolidado
pela engenharia em vez de começar do zero.

- A semelhança considera, nesta ordem de peso: o texto do próprio campo, o
  risco, a tarefa e o equipamento.
- No máximo 3 casos entram em cada pedido — os mais parecidos.
- Campos **recusados** ficam de fora de propósito: ali o texto que valeu foi o
  do inspetor, e usá-lo como exemplo ensinaria a IA a repetir a anotação em
  vez de redigi-la.
- Tarefa e equipamento iguais **não bastam**: se o assunto não tem relação, o
  caso não entra. Sem essa trava, um risco de choque elétrico num painel
  puxaria como exemplo um risco de agarramento em correia, só por estarem na
  mesma tarefa de limpeza.

**Rastreabilidade.** Cada sugestão mostra na tela de revisão em quais casos ela
se baseou, com o percentual de semelhança. O laudo é assinado com ART: se um
texto antigo tiver um erro, é preciso conseguir descobrir por onde ele se
propagou. A etapa de aprovação continua igual — nada é aplicado sozinho.

**Onde ligar ou desligar.** Configurações → Inteligência Artificial, em
"Aprender com os laudos já aprovados". Nasce ligado e mostra quantos casos
aprovados já existem. Desligado, tudo volta a funcionar como antes.

Todo o cálculo de semelhança é feito dentro do aparelho, comparando palavras.
Não há serviço externo nem treinamento de modelo, e nada é enviado à IA além
do que já era enviado antes.

---

## 05/08/2026 17:30

Instruções da IA e normas em PDF deixam de se perder entre aparelhos.

**O problema.** A configuração de IA (chave, instruções e normas em PDF) já
viajava entre os aparelhos, mas como um bloco único: o pacote mais recente
substituía o outro **inteiro**. Na prática, se uma pessoa subisse uma norma no
celular enquanto a outra subia outra norma no computador, quem sincronizasse
por último **apagava a da outra** — e o mesmo valia para as instruções
personalizadas. Com quatro aparelhos em uso, isso acontecia com facilidade.

**A correção.** Cada parte passa a ser mesclada separadamente:

- **Normas em PDF** — união por documento. As duas aparecem, nenhuma se perde.
  Remover uma norma continua funcionando e a remoção viaja para os outros
  aparelhos (ela não volta sozinha).
- **Instruções (prompts)** — cada instrução tem seu próprio registro de
  alteração. Editar a instrução de Risco num aparelho e a de Escopo em outro
  mantém as duas.
- **Chave de API** — ganhou registro próprio. Antes, um aparelho que nunca
  tinha recebido a chave podia apagar a chave dos outros ao sincronizar.

Quando um aparelho percebe que tem uma norma ou instrução que ainda não está
na nuvem, ele reenvia a versão completa automaticamente — então nada fica só
num aparelho.

---

## 03/08/2026 20:35

Correções no motor de sincronização e na lista de inspetores.

**Sincronização — item movido de lugar.** Mover uma máquina para outra área
(ou uma tarefa para outra máquina, ou um risco para outra tarefa) não saía do
aparelho: o app não marcava a mudança, o arquivo nunca subia para o endereço
novo e nos outros aparelhos o item continuava no lugar antigo. Quando a
mudança chegava por outro caminho, o item virava **duas cópias com o mesmo
código**, em dois lugares ao mesmo tempo. As duas cópias disputavam o mesmo
registro de sincronização, e por isso um aparelho que só tinha **recebido**
dados passava a ter itens “para enviar” indefinidamente — a sincronização
nunca terminava. Os quatro níveis (área, máquina, tarefa e risco) passam a
mover o item de verdade, levando junto o que está dentro dele.

**Sincronização — relógio do aparelho errado.** Quem vence um conflito é a
edição com o carimbo de hora maior. Um aparelho com a data atrasada (celular
que ficou sem bateria, data ajustada à mão) tinha todas as suas edições
descartadas em silêncio pelos outros. Agora cada carimbo novo é sempre maior
que qualquer carimbo já visto, inclusive os que chegaram da nuvem: quem editou
por último vence, mesmo com a data do aparelho errada. Fuso horário e horário
de verão nunca influenciaram — o carimbo sempre foi contado em horário global.

**Inspetores — padrão e código fixo.** O app passa a vir com dois inspetores
cadastrados: Daniel Costa Gonçalves (Técnico Mecânico) e Luiz Hermelino Araujo
(Engenheiro Mecânico). Antes, o inspetor padrão nascia com um código sorteado
em cada aparelho — o mesmo Daniel era uma pessoa diferente no celular e no
computador, e por isso a capa do laudo saía com “Nome Inspetor” e “Cargo
Inspetor” em branco no aparelho que não tinha cadastrado. Aparelhos que já
usam o app são convertidos automaticamente, sem duplicar ninguém.

**Inspetores — compartilhados entre aparelhos.** A lista de inspetores e os
dados da MecSete (CREA, endereço, telefone, responsável técnico) agora
sincronizam pelo OneDrive. Quem for cadastrado num aparelho aparece nos
demais. Dois cadastros feitos ao mesmo tempo em aparelhos diferentes somam-se;
não se sobrescrevem. Remoção também viaja — quem for apagado não volta.

**Inspetores — o laudo nunca sai em branco.** O nome e o cargo ficam gravados
dentro do próprio projeto. Mesmo num aparelho que ainda não recebeu a lista, o
laudo imprime o inspetor correto.

**Aba Projeto.** Ao lado do seletor de Inspetor, o botão **+** cadastra um nome
novo e o botão de lápis corrige ou remove o que está escolhido, sem sair da
tela. Corrigir um nome atualiza também os laudos que já citavam a pessoa. Se o
inspetor do projeto veio de outro aparelho e a lista ainda não chegou, a tela
avisa em vez de deixar o campo vazio.

**Central do Laudo.** As abas passam a seguir a ordem do trabalho:
Projeto · Áreas · IA · Revisão · Exportar · Imprimir. A aba que abre continua
sendo Revisão.

---

## 31/07/2026 23:55

Versão que estava em teste e não chegou a ser publicada — entrou junto com a
de 03/08/2026. Traz a Central do Laudo: revisão dos textos gerados pela IA,
escolha das áreas do escopo, aba Projeto com os dados administrativos, HRN
editável por risco, plaqueta do equipamento, montador de risco em campo,
biblioteca de medidas de mitigação, classificação PLr/Categoria e o módulo de
impressão do laudo em A4.

---

## Versões anteriores

Publicadas pela interface web do GitHub, sem descrição registrada na época.

| Versão (APP_BUILD) | Publicada em     |
|--------------------|------------------|
| 29/07/2026 08:44   | 29/07/2026 08:49 |
| 26/07/2026 14:48   | 26/07/2026 14:56 |
| 26/07/2026 14:05   | 26/07/2026 14:37 |
| 26/07/2026 12:20   | 26/07/2026 12:32 |
| 26/07/2026 00:59   | 26/07/2026 10:50 |
| 26/07/2026 00:32   | 26/07/2026 00:36 |
| 25/07/2026 23:54   | 26/07/2026 00:08 |
| 25/07/2026 23:08   | 25/07/2026 23:21 |
| 25/07/2026 18:09   | 25/07/2026 18:38 |
| 24/07/2026 12:19   | 24/07/2026 14:58 |

---

## Como manter este arquivo

A cada versão publicada, acrescentar uma seção nova **no topo** da lista (logo
abaixo do aviso), com o mesmo `APP_BUILD` gravado no `index.html`, descrevendo
o que mudou em relação à versão anterior — em linguagem de quem usa o app, não
de quem programa. Manter pelo menos as 10 últimas.

O histórico completo, com o código linha a linha, fica nos commits do próprio
repositório: <https://github.com/Mecsete/NR12/commits/main>
