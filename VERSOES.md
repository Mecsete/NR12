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

## 10/08/2026 18:40

Duas correções: o quadro verde do "Aplicar em vários" e o logotipo do laudo.

### O texto de origem aparece inteiro no "Aplicar em vários"

O quadro verde que mostra o texto que vai ser copiado estava sendo espremido
a uma linha só. A folha é montada em coluna e, quando o conteúdo passava da
altura da tela, **tudo** encolhia junto — inclusive o quadro.

Agora só a lista encolhe (ela rola por dentro, que é o esperado de uma
lista). O quadro mostra o texto inteiro, com teto de 30% da altura da tela
para nunca engolir a lista; passando disso, rola por dentro do próprio
quadro. Em tela baixa o teto cai para 22%.

A mesma correção valeu para a folha **Copiar de outro**, que tinha a mesma
estrutura e o mesmo defeito à espera.

### Logotipo do laudo: fundo transparente de volta

**O que acontecia.** Ao enviar o logotipo, o app convertia a imagem para
JPEG. JPEG não tem canal de transparência: todo pixel transparente do PNG
original virava **preto**. Daí o fundo preto no rodapé. Na capa era pior — lá
o logotipo leva um filtro que inverte as cores, então o retângulo preto virava
um retângulo branco por cima da capa azul.

**A correção.** O logotipo passa a ser salvo em PNG, que guarda a
transparência. Foto continua em JPEG, que é o certo para foto (arquivo bem
menor) — mudou só o logotipo. Como PNG não tem controle de qualidade, o
tamanho é contido reduzindo a imagem quando necessário; logotipo é desenho de
poucas cores e costuma passar direto no tamanho cheio.

**Dava para enviar, mas não para trocar.** O painel do logotipo só aparecia
enquanto não houvesse logotipo nenhum. Depois do primeiro envio ele sumia — e
com ele, qualquer forma de corrigir. Agora o painel fica sempre visível, com:

- **prévia sobre fundo quadriculado**, que mostra a olho nu onde o logotipo é
  transparente e onde tem fundo sólido;
- **Trocar logotipo** e **Remover**;
- **aviso automático** quando o logotipo guardado está no formato antigo (sem
  transparência), explicando o que houve e pedindo o reenvio do PNG original.

Trocar ou remover carimba a alteração para os outros aparelhos e limpa as
páginas já montadas, para a prévia não continuar mostrando o logotipo velho.

**O que fazer:** abra Laudo → Imprimir. Se aparecer o aviso amarelo, toque em
**Trocar logotipo** e envie o PNG original de novo. Uma vez só — sincroniza
para os outros aparelhos.

---

## 07/08/2026 23:45

Mitigação existente separada da Solução, caixas de texto que abrem em tela
cheia, Aplicar item por item com revisão de português, e aplicar o mesmo
texto em vários itens de uma vez.

### Mitigação existente: marque tudo que a máquina já tem

No cadastro do risco, o que existe na máquina deixou de ser **uma escolha só**
numa lista suspensa. Agora é uma **lista de botões para marcar**, agrupada por
família (proteção física, bloqueio de energia, acesso e altura, comando e
parada). Pode marcar quantos quiser, e o que não estiver na lista você escreve
e acrescenta.

O texto da descrição é montado sozinho a partir de tudo que foi marcado, com a
citação de norma de cada item, sem repetir a mesma norma duas vezes. Enquanto
você não editar esse texto à mão, ele continua acompanhando as marcações; a
partir do momento em que você escrever alguma coisa ali, o app nunca mais
mexe.

Medidas que só fazem sentido como proposta (adequar o vão da proteção,
eliminar arestas, projeto habilitado, categoria de segurança, entre outras)
foram tiradas dessa lista — elas continuam disponíveis no quadro **Solução**.
Foi acrescentada **cerca de proteção**.

### Na revisão de textos, dois quadros distintos

No campo **Solução** da aba Revisão, aparece primeiro um quadro só de leitura
com **o que já existe na máquina**: as proteções marcadas, o julgamento
(atende / atende em parte / não atende), a ressalva e a base normativa. Abaixo
dele vem a solução.

Quando não há nada registrado, o quadro diz isso com todas as letras — “a
máquina não tem proteção para este risco; a solução parte do zero”.

**A IA passou a receber os dois.** Antes, havendo mitigação existente, a IA
recebia só a descrição dela e acabava reescrevendo o que já existe em vez de
propor o que fazer. Agora ela recebe a sua proposta como assunto principal e o
que já existe como contexto, com a instrução de **complementar ou corrigir**,
nunca repetir.

O texto que sai no laudo (coluna AT do Excel) não mudou de regra nesta
versão — o ajuste do layout do laudo para mostrar os dois quadros fica para a
próxima.

### Caixa de texto que abre em tela cheia

Toda caixa de texto do app ganhou um **botão no canto superior direito**. Um
toque e ela abre ocupando a tela inteira, na frente do formulário — dá para
escrever um parágrafo longo sem enxergar três linhas por vez. Fecha tocando
fora, no mesmo botão ou na tecla Esc.

**O formulário fica exatamente onde estava.** Ao fechar, você volta para o
mesmo ponto da rolagem, sem ter que procurar de novo onde estava digitando.

### Aplicar item por item

Cada um dos quatro textos da revisão agora tem seu próprio **Aplicar**:

- **Aplicar sugestão** — quando há sugestão da IA aguardando decisão;
- **Aplicar este texto** — quando o que vai para o laudo é o seu texto de
  campo ou um texto que você editou.

Aplicado, **a letra daquele item fica verde no cartão** — é o sinal de que
aquele texto está validado. O botão Aprovar (os quatro de uma vez) continua
existindo.

### Revisão de português automática, com trava

Sempre que um texto é aplicado, a IA revisa o português dele — e, no campo do
risco, também o **título do risco**. É correção de grafia, acento,
concordância e pontuação, não reescrita.

Para garantir que seja só isso, a resposta da IA passa por uma conferência
antes de valer:

- **nenhum número pode mudar** — item de norma, medida, quantidade;
- o texto não pode ganhar nem perder mais de uma palavra;
- o texto tem de continuar quase o mesmo letra a letra.

Reprovando em qualquer uma delas, a correção é descartada em silêncio e vale
o seu texto, exatamente como você escreveu. Sem IA configurada ou sem
internet, nada acontece — o texto aplicado é o seu.

### Aplicar o mesmo texto em vários itens

Depois de aplicar um texto, aparece o botão **Aplicar este texto em vários
itens**. Abre uma lista com seleção múltipla de tudo que está no aparelho.

- **Agrupar por projeto, área, máquina ou tarefa** — ou sem agrupar. Cada
  grupo abre, fecha e tem “Marcar todos”. Trocar o agrupamento não perde o
  que já estava marcado.
- **Filtro por texto** para achar o item rápido.
- **Trava de segurança:** texto de escopo só enxerga máquina, texto de tarefa
  só enxerga tarefa, risco e solução só enxergam risco. Não existe caminho na
  tela que leve um texto de tarefa para dentro de uma máquina.
- Itens que **já têm texto** aparecem com aviso de que serão substituídos, e
  mostrando o que será perdido.

Os itens que receberem o texto já ficam com a letra verde.

---

## 07/08/2026 17:20

Montagem do risco: nome completo, na posição certa, e explicação de cada
evento.

**O nome do risco passa a usar os quatro itens**, em frase corrida com a
concordância certa — as preposições já vêm cadastradas nas listas, e para
item digitado à mão o app deduz pelo termo:

- *Agarramento na correia, na transmissão de potência, com lesão nas mãos*
- *Queda na plataforma*
- *Enroscamento nos roletes, com lesão nos braços*

**O campo do nome desceu para logo abaixo do quadro de montagem.** Assim você
monta, vê o nome que saiu e ajusta se quiser — em vez de preencher o nome
antes de ter escolhido qualquer coisa.

**Cada item de "O que pode acontecer?" ganhou uma explicação curta**, no ícone
de informação ao lado do rótulo. Vários são parecidos no nome e diferentes na
consequência — agarramento, enroscamento e arrastamento, por exemplo — e a
escolha muda o Grau do Dano e, por consequência, o HRN.

**Correção de texto:** sem componente, a frase deixa de ter uma vírgula
sobrando. Era *"Risco de queda, na plataforma da máquina"*; agora é *"Risco de
queda na plataforma da máquina"*. Vale para o nome e para a descrição, que
seguem a mesma regra.

Como sempre: o que você escrever por cima não é mais mexido, e riscos já
cadastrados não são renomeados.

---

## 07/08/2026 16:30

**A barra inferior não fica mais no meio da tela ao digitar no celular.**

A barra de opções (Projetos · Riscos · Laudo · Configurações) é fixada no
"fundo da tela". No iPhone, esse fundo é o da janela **antes** do teclado
subir — e o sistema não avisa a página quando o teclado aparece. Resultado: ao
digitar um texto no laudo, a barra ficava flutuando no meio, por cima do que
estava sendo escrito.

Agora o app percebe o teclado pelo tamanho da área realmente visível e
**esconde a barra enquanto se digita** — o que ainda devolve espaço de tela.
Ao fechar o teclado, ela volta. Os botões flutuantes seguem a mesma regra.

No computador nada muda.

---

## 07/08/2026 15:45

Ajustes no cadastro de risco em campo.

**A tela não volta mais ao topo.** A cada escolha dentro do formulário de risco
— um seletor, um botão de situação, marcar "há medidas" — o modal era
redesenhado inteiro e a rolagem saltava para o começo. Era preciso procurar de
novo onde você estava preenchendo, toda vez. Agora a posição é guardada e
devolvida.

**Os seletores couberam no modal.** Os seletores de medida existente e de
solução ficavam mais largos que a janela, porque estavam fora dos campos
normais e não pegavam a regra de largura — esticavam até o tamanho da opção
mais longa. Também estavam sem estilo (sem borda e sem a setinha). Corrigido.

**"Mitigação proposta" passou a se chamar "Solução"**, para ficar mais direto
para quem preenche.

**O nome do risco passa a incluir o componente.** Antes ficava só o evento
("Agarramento"); agora fica "Agarramento na correia transportadora", que
distingue de verdade numa lista com dezenas de riscos. Continua valendo a
regra de sempre: o que você digitar por cima nunca é sobrescrito.

Riscos **já cadastrados não são renomeados** — a composição vale para os
próximos. Mudar nome de risco em laudo já feito seria alteração retroativa.

---

## 07/08/2026 15:00

**Dá para conferir, na tela, o que a IA recebe das normas.**

Com nove PDFs somando mais de um megabyte de texto, é razoável duvidar que
tudo esteja sendo usado. Em vez de pedir confiança, o app agora mostra.

Em **Configurações → IA → Base de Normas**, o botão **"Conferir o que a IA
recebe destas normas"** abre um campo onde você escreve uma descrição de risco
como escreveria em campo. Ele mostra quais normas entrariam naquele pedido,
quanto de cada uma, e os primeiros trechos escolhidos com o percentual de
semelhança. É o **mesmo cálculo** que a geração usa — não uma simulação
parecida.

**Como os trechos são escolhidos agora.** Antes eu repartia o espaço em partes
iguais entre as normas ativas; com nove normas, cada uma levava um pedaço
pequeno mesmo quando os melhores trechos estavam todos na NR-12. Agora os
trechos de todas as normas **disputam entre si** e entram os melhores, venham
de onde vierem.

**Norma que não tem relação com o risco não aparece naquele pedido** — e isso é
o certo, não um defeito. Encher o espaço com texto sem relação só atrapalharia
a sugestão. Ela volta a entrar quando o assunto for dela.

**Não vale a pena reduzir a quantidade de PDFs.** Quanto mais normas
cadastradas, maior a chance de existir um trecho pertinente para cada risco. O
app escolhe; você não paga por ter normas a mais.

---

## 07/08/2026 14:10

**As normas em PDF passam a servir de verdade para a IA.**

Ao conferir se os PDFs eram usados em todas as sugestões, encontrei um limite
que na prática os anulava. O orçamento de texto era gasto por ordem de lista:
a primeira norma consumia tudo (a NR-12 sozinha é muito maior que o orçamento
inteiro) e as demais não entravam. E dela iam os **primeiros** caracteres —
capa, sumário, definições. Ou seja: as normas eram anexadas em todas as
chamadas, mas o conteúdo enviado quase nunca tinha relação com o risco que
estava sendo descrito.

Agora cada norma é dividida em trechos, e entram os trechos **mais
relacionados ao texto que está sendo escrito**. O orçamento é repartido entre
as normas ativas, então toda norma cadastrada contribui — e foi aumentado de
12 mil para 60 mil caracteres.

Em teste com três normas e um risco de correia: antes só a NR-12 entrava, e só
o sumário; agora entram as três, com os trechos sobre proteção fixa em zona de
perigo e sobre agarramento em elementos móveis.

**Correção nas checagens de validação.** As checagens estruturais das cinco
entregas anteriores (juntar duplicatas, reparo x falha, coerência do
diagnóstico, endereço da API e este item) não haviam sido gravadas de fato — o
script que as adicionava falhava em silêncio. Os testes automatizados sempre
foram reais; o que faltava eram essas checagens. Foram escritas e conferidas:
o arquivo passou de 97 para 125 verificações, todas passando.

---

## 07/08/2026 13:20

**Correção: a IA voltou a funcionar.**

O teste de conexão falhava no computador e no celular, mesmo no 4G — o que já
descartava problema de rede. A mensagem nova, publicada há pouco, mostrou a
causa ao exibir o endereço que estava sendo usado:

`https://generativelanguage.googleapis.com/v1beta/openai`

O endereço correto do Gemini termina em `/v1beta`. O `/openai` sobrando fazia
o app chamar um caminho que não existe; o Google responde a esse caminho sem
os cabeçalhos que o navegador exige, e o erro chegava como "Failed to fetch" —
com cara de falha de internet, quando na verdade era o endereço.

Esse endereço errado ficou guardado (provavelmente de quando o modo
Personalizado esteve ativo), continuou valendo depois da troca de provedor e
ainda viajou para os outros aparelhos pela sincronização.

Agora **provedor da lista usa sempre o endereço dele**; só o modo
Personalizado usa endereço digitado. A configuração se conserta sozinha ao ser
lida — não é preciso fazer nada além de atualizar o app e testar de novo.

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
