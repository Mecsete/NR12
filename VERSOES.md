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

> **Atenção às versões entre 31/07/2026 e 07/08/2026 10:30.** Até essa data, o
> número mostrado no app era calculado da hora em que o GitHub publicou o
> arquivo, e **não** batia com o número registrado aqui — a diferença era de
> alguns minutos e do fuso (o app mostrava o horário de Brasília da
> publicação). A partir de **07/08/2026 10:25**, o número na tela é
> exatamente o mesmo desta lista.

---

## 07/08/2026 12:40

**Correção:** o diagnóstico dizia "Nada pendente" enquanto a linha logo acima
mostrava itens para receber.

Os dois números vinham de fontes diferentes. A linha de cima usa a **última
verificação da nuvem** — o que existe lá e ainda não veio para cá. O
diagnóstico usava só a **fila local de download**, que guarda apenas itens
grandes e pacotes de foto esperando Wi-Fi; item de texto pequeno é aplicado na
hora e nunca passa por essa fila. Com a fila local vazia, o diagnóstico dava
"tudo em dia" ignorando o que faltava receber.

Agora o diagnóstico lê **as duas fontes**. Só diz "nada pendente" quando as
duas estão zeradas, e mostra uma linha nova — **"Encontrado na nuvem, ainda
não recebido"** — com a hora em que essa contagem foi feita, deixando claro
que é uma foto de um momento e não um número recalculado a cada toque.

Também: registros de correção automática gravados **antes** da versão anterior
ficaram no histórico marcados como falha e continuavam sujando o placar. Agora
são reconhecidos pelo próprio texto e classificados corretamente, sem esperar
o histórico rodar.

---

## 07/08/2026 12:05

Três acertos vindos do diagnóstico em uso real.

**Correção automática deixou de aparecer como erro.** Quando o app percebe que
um arquivo que ele julgava enviado não está na nuvem, ele reagenda o envio —
isso é o sistema funcionando, não um defeito. Só que era registrado como
falha: o diagnóstico mostrava "65 envios com sucesso, 15 falhas" e escondia o
aviso de que estava tudo bem. Agora essas correções aparecem numa seção
própria, **"Correções automáticas (não são erros)"**, e não entram no placar.

**Fila da nuvem: botão para limpar.** Arquivos de projetos que você já excluiu
deste aparelho continuam na nuvem e ficam esperando para sempre um "pai" que
não vai chegar — chegaram a mais de 300. Não atrapalham o envio, mas poluem.
Quando a fila passa de 30, aparece o botão **"Limpar a fila da nuvem"**.
Limpar é seguro: só a lista de avisos é descartada, nenhum dado do app é
tocado, e a verificação completa que roda a cada 30 minutos redescobre o que
ainda for necessário.

**Teste de conexão da IA: mensagem correta e útil.** A mensagem antiga dizia
"falha de rede ou bloqueio de CORS" sem dizer qual provedor nem o que fazer. E
havia um aviso, no app, de que a OpenAI bloquearia chamadas do navegador —
**isso estava errado**: em teste, a OpenAI respondeu normalmente. A mensagem
agora nomeia o provedor e o endereço testados e explica a diferença que
importa: se a chave estivesse errada, o provedor responderia com um erro
explicando; quando aparece essa mensagem, o navegador **não conseguiu sequer
alcançar o endereço** — é internet, endereço da API errado, ou a rede/antivírus
barrando a saída. Sugere testar no 4G do celular para separar as duas coisas.

---

## 07/08/2026 11:15

**A sincronização que não terminava: causa encontrada e conserto disponível.**

O diagnóstico apontou o problema com precisão. Os 80 itens presos na fila
tinham **todos** a mesma marca: "trocando de endereço na nuvem a cada ciclo".
E os endereços revelaram o que estava acontecendo — dois itens trocando de
lugar **entre si**, ida e volta, sem parar.

**A causa.** Existiam itens duplicados: o mesmo equipamento, tarefa ou risco
gravado em dois lugares da árvore ao mesmo tempo. Isso sobrou de antes da
correção de 03/08, quando mover um item de lugar fazia o outro aparelho criar
uma segunda cópia em vez de movê-lo.

O registro de envio é guardado por item. Com duas cópias do mesmo item, elas
disputam o mesmo registro: o app envia a primeira e anota o endereço dela;
depois processa a segunda, vê que o endereço anotado é outro, conclui que o
item "mudou de lugar", **apaga a primeira da nuvem** e envia a segunda. No
ciclo seguinte, o contrário. Para sempre — e sempre com sucesso, e é por isso
que o histórico mostrava 80 envios bem-sucedidos e nenhuma falha, enquanto a
fila não saía de 80.

**O conserto.** Em Configurações → OneDrive → Diagnóstico da sincronização,
quando houver duplicatas aparece um aviso vermelho com o botão **"Juntar as
duplicatas"**. De cada par fica a versão alterada por último, e tudo que
existir só na outra cópia (tarefas, riscos) é trazido junto — **nada é
descartado**. Uma cópia de segurança é criada antes, então dá para voltar
atrás. Depois de juntar, sincronize: a fila deve zerar.

Novas duplicatas não acontecem mais desde 03/08. Este botão limpa o que
ficou para trás.

---

## 07/08/2026 10:25

**Correção:** a versão mostrada no app agora é a mesma registrada aqui.

O número que aparecia em Configurações era calculado da hora em que o GitHub
publicou o arquivo — não do que estava escrito no código. Publicado às 13:11
GMT, o aparelho mostrava 10:11, enquanto a entrega estava registrada como
10:30. Na prática, não dava para responder "você está na versão X?", porque o
X da tela nunca era o X do histórico.

Agora a versão é um texto fixo: o mesmo no código, nesta lista e na tela do
aparelho. Continua servindo para saber se o aparelho já atualizou — quando o
arquivo é antigo, tudo nele é antigo, inclusive esse texto.

---

## 07/08/2026 10:30

O diagnóstico passa a mostrar **os dois carimbos** de cada item pendente e a
**troca de endereço na nuvem**.

O diagnóstico anterior revelou uma situação que ninguém esperava: **todos os
envios dão certo, zero falhas — e a fila continua no mesmo número**. Também
apareceram, no histórico, envios de "0 byte", que só acontecem quando o app
apaga a cópia antiga de um item que mudou de endereço na nuvem.

Um item é considerado pendente quando o carimbo de alteração dele é diferente
do carimbo registrado no último envio. Ver só um dos dois números não diz
nada. Agora cada linha mostra **os dois**, e mais:

- **"ENDEREÇO MUDOU"**, com o endereço antigo e o novo, quando o caminho
  calculado agora não bate com o que ficou registrado. Se isso se repete a
  cada ciclo, o app fica apagando e reenviando o mesmo item para sempre — o
  envio "dá certo" e a fila nunca baixa.
- **"REGISTRO MAIS NOVO QUE O ITEM"**, quando o registro do envio está à
  frente do próprio item — sinal de relógio fora de hora ou de registro
  sobrescrito por outro aparelho.

Dois avisos em destaque contam quantos itens estão em cada situação.

Isto ainda é instrumentação, não a correção: serve para identificar a causa
com precisão antes de mexer no motor de sincronização.

---

## 07/08/2026 09:40

O diagnóstico passa a mostrar **por que** o envio não conclui.

Ele dizia o que estava pendente, mas não por que a fila não andava — e sem
isso não dá para distinguir "fila grande, só demorando" de "envio batendo
sempre no mesmo erro". O app já registrava cada tentativa com o motivo da
falha; faltava onde ver.

Agora o diagnóstico mostra, além da lista de pendentes:

- **Falhas recentes**, com o motivo registrado (sessão expirada, limite de
  requisições, erro de rede, arquivo recusado etc.) e a hora da tentativa;
- **Últimas tentativas**, com sucesso ou falha;
- **Um placar**: quantos envios deram certo e quantos falharam no histórico
  guardado;
- **Um veredito em destaque**: se nenhum envio concluiu, avisa que a fila não
  vai diminuir sozinha; se os envios estão funcionando, avisa que é só volume
  e orienta a deixar o app aberto no Wi-Fi.

Continua sendo só leitura — não envia, não apaga, não altera nada.

---

## 06/08/2026 20:45

O diagnóstico da sincronização passa a abrir **na própria tela**.

Ele só existia dentro de uma janela sobreposta, e num aparelho ela não abriu —
o toque não produziu nada e não houve nem mensagem de erro, justamente no
recurso que existe para dar informação. Agora o diagnóstico é um bloco que
abre e fecha na própria tela de Configurações → OneDrive, sem janela nenhuma
para falhar. E se algo der errado ao montá-lo, o erro **aparece escrito** em
vez de simplesmente não acontecer nada.

A versão em janela foi removida, para não existirem dois caminhos fazendo a
mesma coisa.

---

## 06/08/2026 19:30

**Diagnóstico da sincronização.** Em Configurações → OneDrive, o botão
"Diagnóstico da sincronização" mostra **item por item** o que está pendente e o
motivo de cada um: "nunca subiu", "editado aqui depois do último envio",
"faltam as fotos (esperando Wi-Fi)", "esperando o item pai", "arquivo ilegível
na nuvem". Também há um botão para copiar tudo como texto.

Serve para responder de forma objetiva à sensação de que a sincronização não
termina. Se a lista sair vazia, o selo "sincronizando" que aparece de vez em
quando é apenas o ciclo automático de 2 em 2 minutos conferindo a nuvem — não
há trabalho parado. Se a lista trouxer itens, ela diz exatamente quais e por
quê. O diagnóstico é só leitura: não envia, não apaga, não altera nada.

**Chave de API compartilhada.** A chave já viajava entre os aparelhos, mas só
a partir do momento em que fosse digitada de novo. Quem já tinha a chave antes
da atualização nunca a compartilhava. Agora uma chave já existente é
reconhecida e enviada aos outros aparelhos sozinha. Aparelho que nunca teve
chave continua sem apagar a de ninguém.

**Confirmação ao restaurar as instruções da IA.** O botão "Restaurar
instruções padrão" apagava todo o texto personalizado dos 5 campos num toque
só — e a mudança ia para todos os aparelhos. Agora pede confirmação e avisa
disso antes.

---

## 05/08/2026 22:30

Botão para recuperar normas em PDF que sumiram.

Normas que estavam cadastradas desapareceram da aba IA. A causa foi o defeito
corrigido na versão de 05/08 17:30: até ali, a configuração de IA sincronizava
como bloco único, e um aparelho **sem** normas podia sobrescrever o arquivo da
nuvem, apagando as normas de todo mundo. A correção impede que isso volte a
acontecer, mas não desfaz o que já tinha sido apagado.

Em **Configurações → Inteligência Artificial → Base de Normas** existe agora
**"Recuperar normas de uma cópia salva"**. Ele procura nas cópias de segurança
guardadas no aparelho (as mesmas usadas para restaurar dados) e traz de volta
**apenas a base de normas** — projetos, áreas, máquinas, tarefas e riscos
ficam exatamente como estão. Restaurar uma cópia inteira desfaria o trabalho
dos laudos; este botão não.

Normas recuperadas são reenviadas automaticamente para os outros aparelhos.

Se as cópias deste aparelho também estiverem sem as normas, tente em outro
aparelho da equipe. Vale também procurar na lixeira do OneDrive, na pasta
`Apps/APR_Campo_NR12/Backup/Config`, por arquivos `ia_*.json` apagados.

---

## 05/08/2026 21:40

**Correção importante:** a revisão do laudo não chegava nos outros aparelhos.

Aprovar uma sugestão, recusar, editar o texto ou receber uma sugestão nova da
IA gravava tudo corretamente **no aparelho de quem fez** — e parava por aí. A
alteração não era marcada como pendente de envio, então nunca subia para a
nuvem. Na prática: o item aparecia "Aplicado" para quem decidiu e continuava
"Aguardando sua decisão" para o outro, indefinidamente. Dois inspetores
revisando o mesmo laudo refaziam o trabalho um do outro sem perceber.

Agora toda decisão marca o item para sincronizar, no nível certo: escopo marca
o equipamento, descrição da tarefa marca a tarefa, risco e solução marcam o
risco.

**O que isso muda no dia a dia.** Duas pessoas passam a poder revisar o mesmo
laudo: o que um decide aparece para o outro na sincronização seguinte (no
máximo 2 minutos com o app aberto e internet). O contador de "prontas" na aba
Revisão passa a refletir o trabalho dos dois somado.

**O que ainda não é.** Isto não é edição simultânea ao vivo. A tela não muda
sozinha no instante em que a outra pessoa decide — ela atualiza no próximo
ciclo de sincronização. E se as duas pessoas editarem **o mesmo campo do mesmo
risco** antes de sincronizar, vale a última alteração; a outra se perde sem
aviso. Para trabalhar em paralelo com segurança, o combinado continua sendo
dividir por área ou por equipamento.

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
