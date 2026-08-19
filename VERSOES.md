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

> **Atenção à versão de 17/08/2026 21:55.** Ela foi escrita com a data
> errada — publicada de manhã em 18/08/2026, mas com o carimbo ainda de
> 17/08. O registro abaixo já está com a data corrigida (18/08/2026
> 09:57). Se o rodapé de Configurações de algum aparelho ainda mostrar
> "17/08/2026 21:55", é a mesma versão — só o número que estava errado.

---

## 19/08/2026 08:41

Sincronização deixa de ser interrompida quando você troca de aplicativo — e
o que já baixou não precisa mais ser refeito.

**O que estava acontecendo.** Havia um cronômetro de segurança: se a
sincronização passasse 90 segundos sem nenhum avanço, o app concluía que
tinha travado e a interrompia. Isso existe para o caso de a conexão morrer
de vez. Só que, quando a janela do app sai da frente (você troca de
aplicativo ou minimiza), o navegador passa a segurar os temporizadores da
página — as pausas de 0,2 segundo entre um item e outro viram quase um
minuto cada. A sincronização continuava andando, só que devagar; passava
dos 90 segundos sem avanço aparente e era morta pelo próprio cronômetro
de segurança. Não era falha de rede: era o vigia disparando à toa.

Agora, com a janela fora da frente, o cronômetro fica de sobreaviso em vez
de desistir — ele volta a valer assim que você retorna ao app. Travamento
de verdade continua sendo detectado normalmente.

**O que já baixou não é mais refeito.** A lista de pacotes de fotos que
faltam encolhia só na memória e só era gravada no disco no fim do lote
inteiro. Fechar o app no meio de um lote de 18 pacotes fazia reabrir com os
18 de volta na fila — as fotos já estavam salvas, mas o app não sabia
disso e baixava tudo outra vez. Agora essa lista é gravada durante o lote,
no máximo a cada 4 segundos.

**Correção da barra de progresso.** Na fase de recebimento o app não sabe
de antemão quantos itens virão (cada passada descobre uma camada nova).
A barra aparecia cheia nessa fase, dando a impressão de "concluído mas
travado". Voltou a ser a barra animada de "andando", que é o que a fase
realmente é.

---

## 19/08/2026 08:09

Página de Backup reorganizada: um painel só, com o que falta em tamanho e
em tempo, e o erro à vista quando houver.

**O problema.** A página tinha nove seções que ficavam alternando de
assunto — Sincronização, Backup, Sincronização, Backup — com "Aparência"
no meio, sem pertencer a nenhum dos dois. E, dentro da parte de
sincronização, havia **quatro** blocos de informação empilhados, cada um
criado numa investigação diferente e nenhum removido depois. Sobrava
informação e faltava resposta: nenhum deles dizia direto "falta muito?".

**O que mudou.** Os blocos viraram **um cartão só**, no topo, respondendo
na ordem em que a pergunta aparece:

1. está fazendo alguma coisa agora? (com barra e porcentagem)
2. quanto falta — em itens, em MB e em **tempo**
3. deu erro? qual foi, em qual arquivo e quando

A estimativa de tempo é nova. Ela usa a velocidade **medida neste
aparelho, nesta rede** — a diferença entre o Wi-Fi do escritório e o 4G da
fazenda é grande demais para chutar. Enquanto o app ainda não tiver medido
nada, ele mostra só o tamanho e não inventa um tempo.

O erro também é novo ali: antes era preciso abrir o diagnóstico para
descobrir o motivo de uma falha. Agora ele aparece no próprio cartão, com
a frase que explica que o item continua na fila e nada foi perdido.

**Reorganização.** As seções agora vêm agrupadas por assunto: primeiro
tudo de **Sincronização** (situação, botão, fotos e dados, conta), depois
tudo de **Backup** (pasta, arquivo .json, pontos de restauração), e por
último **Dados**. "Alto contraste" foi para a tela de Configurações.

**Nada foi removido.** O histórico de transferências e o diagnóstico
detalhado continuam iguais — só passaram a ficar recolhidos, a um toque de
distância, em vez de ocupar a tela o tempo todo. Também foi corrigido um
detalhe antigo: tamanhos pequenos apareciam como "0.0 MB" e agora aparecem
em KB.

---

## 19/08/2026 07:51

Correção de um detalhe da entrega anterior, encontrado ao investigar o
conflito de posição.

Quando o mesmo item é movido para lugares diferentes em dois aparelhos, a
nuvem fica com duas cópias dele, em endereços diferentes. A anotação nova
criada ontem procurava o item pela árvore inteira — então, ao ler o arquivo
da cópia abandonada, ela encontrava o item (no endereço certo) e anotava o
endereço **errado**. Agora a busca desce pelo caminho que o próprio arquivo
informa: a cópia abandonada simplesmente não é reconhecida, que é o
comportamento correto.

Sem efeito visível no uso normal — é uma correção de precisão em quem só
tem duas cópias do mesmo item na nuvem.

---

## 18/08/2026 22:10

Corrigido o defeito de fundo da sincronização: aparelho que não criou nada
reenviando tudo para o OneDrive.

**O que estava acontecendo.** O app tinha duas memórias separadas
respondendo à mesma pergunta. Na hora de receber, ele perguntava "eu já
tenho este arquivo?". Na hora de enviar, perguntava "eu já enviei este
arquivo?" — e consultava outro lugar. Quando as duas discordavam, dava o
pior resultado possível: o recebimento via o arquivo, concluía "já tenho,
pulo" e ia embora **sem anotar nada**; o envio olhava o mesmo item, não
achava anotação nenhuma, concluía "nunca mandei isto" e mandava a árvore
inteira de volta para a nuvem — com fotos, gastando dados móveis, num
aparelho onde ninguém tinha criado nada.

**Quando isso acontecia.** Sempre que o aparelho tinha os dados mas perdia
o caderno de anotações: ao restaurar um backup (o caderno é de propósito
deixado de fora do backup, por ser de cada aparelho), ao limpar os dados do
navegador, ao reinstalar, ou ao trocar de navegador.

**Por que as tentativas anteriores não pegaram.** Já existiam quatro
proteções para isso, mas todas dependiam de um índice da nuvem que também
fica de fora do backup, vence em 24 horas e só é montado pela sincronização
**manual**. O ciclo automático — o que dispara sozinho dois minutos depois
de abrir o app — não tinha nenhuma delas. A proteção chegava depois do
estrago.

**O que mudou.** Quando não há anotação sobre um arquivo, o app deixa de
tratar isso como "não mudou" e passa a tratar como o que realmente é: "não
sei". Aí ele confere o arquivo de texto (poucos KB — as fotos viajam à
parte e não entram nessa conta) e, se estiver igual ao que já existe aqui,
**anota e pronto: nada é enviado**. O caderno se reconstrói sozinho, de
graça. Além disso, enquanto a primeira conferência não termina, o envio
automático espera — para não sair mandando coisa antes de saber o que já
está na nuvem.

**Proteção contra perder trabalho de campo.** O app nunca considera um item
sincronizado só porque o tamanho do arquivo bateu: dois textos diferentes
podem ocupar exatamente os mesmos bytes. Se este aparelho tiver uma edição
mais nova que a da nuvem, ela é preservada e continua na fila para subir —
isso está travado por teste automático.

**O que esta entrega não resolve.** Continua valendo a limitação já
conhecida: quando o mesmo item é movido para lugares diferentes em dois
aparelhos, a sincronização não sabe decidir sozinha qual posição vale.

---

## 18/08/2026 15:00

Geração de textos pela IA mais rápida: descrição do risco, mitigação
existente e solução agora são pedidas ao mesmo tempo, não uma atrás da
outra.

Até agora, para cada risco, o app pedia a descrição do risco, depois
esperava a resposta pra pedir a mitigação existente, e só depois disso
pedia a solução — três idas e voltas sequenciais. Como nenhum desses
textos depende do que os outros vão gerar (cada um parte só do que foi
preenchido em campo), os 3 passam a ser pedidos juntos, do mesmo jeito
que o app já fazia para o nome e o escopo do equipamento. Na prática,
esperar as 3 respostas ao mesmo tempo é bem mais rápido do que esperar
uma de cada vez — o ganho é maior quanto mais riscos o laudo tiver.

O restante continua igual: o que já tinha sido aprovado antes é
reaproveitado na hora, sem gastar uma chamada nova, e a parada automática
depois de falhas seguidas (da entrega anterior) continua funcionando do
mesmo jeito.

---

## 18/08/2026 14:50

Geração de textos pela IA: quando a chave bate no limite de uso (ou a IA
para de responder por qualquer outro motivo), o app agora para sozinho e
avisa na hora, em vez de continuar tentando os campos um por um até o
fim.

Um usuário relatou que a IA tinha estourado o limite de uso pouco antes
de clicar em "Gerar o que falta", e não tinha certeza se estava
funcionando ou não. O que estava acontecendo: cada campo já tentava até
5 vezes antes de desistir, e o app seguia assim, campo após campo, sem
dar nenhum sinal de que estava tudo falhando — só no final, minutos
depois, é que aparecia o aviso do motivo.

Agora, quando duas tentativas seguidas falham (cada uma já passou pelas
5 tentativas internas de sempre), o app entende que não é um problema
passageiro e para o lote sozinho — o painel de progresso já mostra o
motivo (por exemplo, "limite de uso da IA atingido") enquanto ainda está
rodando, não só depois de tudo terminar. O que já tinha sido gerado até
ali continua salvo normalmente. Uma falha isolada (um soluço de rede,
por exemplo) não aciona essa parada — o app segue tentando os campos
seguintes normalmente.

---

## 18/08/2026 14:30

Cabeçalho do risco, na tela ampla (computador/tablet deitado): fotos
maiores e os 4 selos de campo aplicado.

Nas telas largas (a partir de 900px, o mesmo ponto em que o laudo já
passa a usar duas colunas), as miniaturas de foto do equipamento e do
risco, no topo da revisão de cada risco, ficam com o dobro do tamanho
anterior — mais fáceis de reconhecer sem precisar abrir a galeria. Ao
lado do nome do risco também passam a aparecer 4 selinhos **E T R S**
(Escopo, Tarefa, Risco, Solução) — os mesmos que já apareciam nos
cartões da lista, agora também aqui dentro: verde quando aquele texto
já foi aplicado ao laudo, e nas outras cores de sempre quando ainda
falta gerar, está aguardando decisão ou foi editado. No celular nada
muda — os selos ficam escondidos e as fotos continuam do tamanho de
sempre, para não apertar a tela pequena.

---

## 18/08/2026 12:10

Menu de opções (três pontinhos) nos riscos do laudo: Visualizar, Copiar e
Excluir.

Cada cartão de risco, na lista de revisão do laudo, ganhou um botão de
três pontinhos no canto superior direito. Ele abre um menu com três
opções: **Visualizar / editar o risco** (abre o cadastro do risco, com
botão para voltar sem alterar nada), **Copiar risco** (duplica o risco
dentro da mesma tarefa e já abre a cópia na revisão do laudo, pronta para
editar) e **Excluir risco** (pede confirmação antes de apagar). O mesmo
botão e o mesmo menu também foram colocados dentro da tela de revisão de
cada risco, ao lado dos botões "Gerar" e da galeria de fotos.

Ao testar antes de publicar, as três ações apareciam mas falhavam
silenciosamente quando a pessoa entrava na aba Laudo sem antes passar por
Área → Máquina → Tarefa no cadastro em campo (o caminho normal de quem só
está revisando o laudo, sem editar nada em campo naquela sessão). A causa:
essas ações foram reaproveitadas do menu que já existia no cadastro em
campo, e esse menu original depende de qual projeto/área/máquina/tarefa
está "em aberto" na tela — algo que a aba Laudo nunca precisou marcar até
agora. Corrigido: ao abrir o menu de um risco pela aba Laudo, o app agora
identifica e marca sozinho o projeto/área/máquina/tarefa daquele risco
antes de abrir as opções, então elas funcionam normalmente não importa por
onde a pessoa entrou.

---

## 18/08/2026 11:40

Corrigido o resto do problema da página pulando para o topo ao digitar.

A entrega anterior parou o redesenho que acontecia a CADA TECLA digitada
na descrição da mitigação existente — mas o problema continuava
aparecendo, bem mais raro. A causa que sobrava era diferente: uma
varredura de fundo que roda a cada 2 minutos (sincronização automática,
estimativa de pendente para baixar, estatística de espaço ocupado)
redesenha a tela sozinha quase toda vez que roda, mesmo sem nada
relevante ter mudado. Rodando a cada 2 minutos, é raro coincidir
exatamente com alguém digitando — mas, coincidindo, o campo em que a
pessoa está escrevendo é reconstruído do mesmo jeito, derrubando o
cursor.

Agora, sempre que esse redesenho de fundo aconteceria com o cursor dentro
de uma caixa de texto, ele é adiado — o dado já foi gravado, só a tela
espera até a pessoa sair do campo para se atualizar. Nenhuma ação que
você mesmo faz (aplicar, gerar, salvar) foi afetada — essas continuam
redesenhando na hora, como sempre.

---

## 18/08/2026 10:55

Três mudanças na revisão do laudo, todas sobre os dados preenchidos em
campo aparecerem por completo para a avaliação final do engenheiro.

**Tipo de equipamento e Manual de operação agora aparecem no laudo.**
Esses dois campos são preenchidos no cadastro da máquina, mas não
apareciam em nenhum lugar da revisão — só no inventário (Excel e
impressão). Agora entram no cartão "Plaqueta do equipamento", junto com
Modelo, Marca, Nº de série, Ano, Capacidade e Tensão — o contador passou
de "X/6" para "X/8 campos".

**Frequência e Nº de pessoas sem preenchimento na tarefa ficam em
vermelho.** Existia uma estimativa silenciosa (o app calculava um valor
mesmo sem a tarefa ter frequência ou número de pessoas informado). Agora,
quando falta esse dado, o campo aparece com borda e fundo vermelhos na
Avaliação HRN, com uma frase dizendo o que fazer — sem precisar de nenhum
botão, o vermelho já é o aviso.

**Frequência e Nº de pessoas passam a ser sempre da tarefa, sem exceção.**
Existia uma opção de escolher um valor diferente para UM risco específico,
sobrepondo o da tarefa. Um teste revelou dois riscos da mesma tarefa com
número de pessoas diferente — o app estava se comportando como projetado,
mas não era o que fazia sentido: se dois riscos são da mesma tarefa, o
número de pessoas exposto é o mesmo para os dois. Essa opção foi removida.
O que continua ajustável risco a risco é o **Nível de desempenho
requerido** (PLr/Categoria) — assunto e tabela diferentes.

---

## 18/08/2026 10:10

Corrigida a própria data do número de versão, que tinha ficado errada na
entrega anterior.

O número que aparece no rodapé de Configurações (e nesta lista) é escrito
à mão a cada entrega, com o horário de Brasília. Na virada da meia-noite
de 17 para 18/08, a entrega seguinte foi escrita ainda com a data de
17/08 — publicada de manhã em 18/08, mas com o carimbo do dia anterior.

Sem efeito em nenhuma funcionalidade — só o número mostrado estava errado.
O registro da entrega anterior, logo abaixo, já está com a data corrigida.

---

## 18/08/2026 09:57

Corrigido: digitar na descrição da mitigação existente rolava a página
sozinha.

A caixa "Descrição da mitigação existente (editável)", que virou editável
nesta mesma sessão junto com o checklist, redesenhava a tela inteira a
cada letra digitada. Isso destruía e recriava a própria caixa de texto em
que a pessoa estava escrevendo — derrubando o foco e o cursor, e é isso
que aparecia como a página pulando para baixo sozinha.

Os outros campos de texto do laudo (nome da empresa, cidade, dados da
plaqueta) nunca tiveram esse problema, porque nunca precisaram redesenhar
a tela a cada tecla — só a caixa nova tinha esse comportamento, e só
nela.

O texto continua sendo gravado a cada letra digitada, normalmente — só
não força mais um redesenho da tela inteira para isso.

---

## 17/08/2026 21:25

O checklist de Mitigação Existente agora abre em grupos recolhidos, em vez
de mostrar os cinco grupos inteiros de uma vez.

Proteção física, Dispositivos de segurança, Elétrica e energia, Acesso e
altura e Organizacional — cada um trazia todas as suas opções abertas na
tela o tempo todo, o que deixava a revisão de um risco só bem extensa,
principalmente quando pouca coisa daquele grupo se aplicava.

Agora cada grupo começa fechado, com uma seta. Fechado, mostra só o que já
foi marcado em campo — se nada do grupo foi marcado, ele fica praticamente
invisível, só o nome. Tocar no grupo abre a lista inteira, para marcar mais
opções ou tirar alguma marcada.

---

## 17/08/2026 20:45

"Gerar o que falta" passa a respeitar os filtros de área, equipamento e
tarefa.

O botão já mostrava o número certo — "Gerar o que falta (6)" quando havia
um equipamento escolhido no filtro — mas o clique ignorava esse filtro e
gerava para o laudo inteiro, todas as áreas incluídas na exportação. O
número no botão e o que ele fazia de verdade não batiam: por isso o painel
de progresso apareceu com "de 250" e mostrando uma máquina de outra área,
mesmo com o filtro em uma única máquina.

Agora os dois usam a mesma base. Com um filtro ativo, só o que está
contado no número do botão é gerado. Sem filtro nenhum, continua cobrindo
o laudo inteiro, como sempre foi.

O botão **"Refazer sugestões"** não mudou — ele já avisa no próprio texto
de confirmação que reescreve "todas as linhas", então não tinha a mesma
confusão.

---

## 17/08/2026 20:15

"Pedir um ajuste à IA" agora mostra que está trabalhando, em vez de deixar
você sem saber se funcionou.

O botão "Refazer esta sugestão" só mostrava um aviso rápido ("Pedindo à
IA… aguarde") que passa e some sozinho. Se a resposta demorasse mais que
esse aviso — o que acontece — não sobrava nenhum sinal na tela: parecia
que não tinha acontecido nada.

Agora o próprio botão muda enquanto espera: fica desabilitado, ganha um
ícone girando e conta os segundos — "Pensando… 4s", "Pensando… 5s" — até a
resposta chegar. Funciona nos cinco campos que têm esse recurso (Escopo,
Tarefa, Descrição do risco, Mitigação Existente e Solução).

Não coloquei uma barra de porcentagem: cada pedido desses é uma única
pergunta à IA, não várias etapas — uma porcentagem aqui seria só decoração,
sem nada de real por trás. O contador de segundos é a informação verdadeira
que existe: quanto tempo já se passou.

---

## 17/08/2026 19:20

Cartão "Nível de desempenho requerido" passou a ficar sempre logo abaixo
da "Avaliação HRN", em vez de cair perto de um cartão qualquer.

A tela organiza os cartões da revisão numa grade (2 ou 3 colunas,
conforme a largura da tela). Como HRN e Nível de desempenho eram dois
cartões soltos na mesma grade dos textos maiores, a posição de cada um
dependia de quantos cartões vinham antes — às vezes ficavam lado a lado,
às vezes o Nível de desempenho caía sozinho numa linha, longe do HRN.
Agora os dois viajam grudados: contam como uma única posição na grade, um
embaixo do outro, sempre juntos.

---

## 17/08/2026 18:50

Mitigação Existente ganha as mesmas ferramentas de IA da Solução, e o
checklist agora é editável direto na revisão do laudo.

Antes, para mudar o que está marcado como existente na máquina (que
proteção tem, se atende à norma, o que falta), era preciso sair do laudo e
editar o risco em outro lugar. E não havia nenhuma ajuda da IA nesse
cartão — só em Solução.

Agora o cartão de Mitigação Existente tem:

- O mesmo checklist de sempre (marcar proteções, acrescentar outras,
  dizer se atende à norma, o que falta) — só que editável ali mesmo, sem
  precisar sair da tela;
- Sugestão da IA, com o mesmo texto final, aprovar, editar, copiar de
  outro item e aplicar em vários — os mesmos botões da Solução;
- "Pedir um ajuste à IA", igual à Solução.

A IA aqui tem uma instrução diferente da Solução: ela descreve o que já
existe, sem propor nada novo — é sempre a Solução que propõe a ação. E só
escreve quando há algo marcado; máquina sem nenhuma proteção registrada
não gera texto à toa.

O texto final, uma vez aprovado, vai para o mesmo lugar de sempre no
laudo, no Word e no Excel — nada de coluna nova. E o botão **"Aplicar N"**
no topo do cartão de risco continua contando só os 4 campos de sempre;
para aplicar a sugestão da Mitigação Existente, use o botão dentro do
próprio cartão dela (ou gere tudo de uma vez pela aba IA).

---

## 17/08/2026 16:35

Mitigação existente e Solução agora são dois cartões separados na revisão.

Os dois viviam dentro do mesmo cartão "Solução / Mitigação" — o quadro
cinza do que já existe na máquina, seguido logo abaixo do que você propôs,
da sugestão da IA e do texto final. Na tela pequena do celular, sem uma
separação forte entre os dois, dava a impressão de ser uma coisa só.

Agora são dois cartões brancos distintos, um depois do outro: primeiro
**Mitigação existente na máquina** (só leitura — para alterar, ainda é no
cadastro do risco), depois **Solução**, com tudo que já existia ali: o que
você escreveu em campo, a sugestão da IA, o texto que vai para o laudo, a
biblioteca de medidas e o pedido de ajuste à IA.

O nome do campo também mudou de "Solução / Mitigação" para só **Solução**
— no cartão, nos dois atalhos (Aplicar em vários / Copiar de outro) e no
laudo impresso. Faz mais sentido agora que a Mitigação tem endereço
próprio.

Nada de conteúdo mudou — só a organização visual.

---

## 17/08/2026 15:20

Ícone de informação nos quatro campos do HRN, na revisão do laudo.

O cadastro do risco em campo já tinha um ícone (i) ao lado de "Probabilidade",
que abre uma caixa explicando o que significa cada opção. Na tela de revisão
do laudo — onde os quatro campos (Probabilidade, Frequência, Grau do dano e
Nº de pessoas) podem ser ajustados — não havia nada parecido.

Agora os quatro têm o mesmo ícone. Tocando nele, abre uma caixa com cada
opção e uma frase curta explicando o que ela quer dizer — por exemplo, em
Grau do dano, "Fratura osso maior" ganha a nota "Fratura em braço, perna ou
costela, por exemplo". Frequência e Nº de pessoas, que antes não tinham
nenhum texto de apoio, também passaram a ter.

Esse texto é só ajuda de tela — não entra no laudo impresso nem em nenhuma
exportação.

---

## 17/08/2026 14:10

Corrigido: com mitigação existente marcada, a Solução podia sair errada no
laudo, no Excel e no Word.

Ao investigar por que "Mitigação existente" e "O que você propôs em campo"
apareciam com o mesmo texto na revisão, achei a causa: sempre que qualquer
mitigação era marcada como existente na máquina, o app trocava — em
silêncio — o texto da sua proposta de solução pela descrição do que já
existe. Mesmo que você tivesse escrito uma solução de verdade.

Isso não era só uma confusão na tela. Se ninguém clicasse em Gerar ou
Aplicar naquele item, o texto trocado ia para o laudo, para o Excel e —
neste último caso, de um jeito ainda pior — **o Word já sofria mesmo depois
de aprovado**: ele lê o campo certo, mas o app estava GRAVANDO a solução
aprovada no campo errado, então o Word saía com a proposta antiga, sem a
revisão da IA nem a sua edição.

Agora a Solução é sempre a sua proposta (com ou sem edição/IA), em todos os
lugares. A descrição da mitigação existente só entra como texto da Solução
no caso em que não sobra outra opção: quando nada foi proposto — e nesse
caso a tela já avisa, não esconde.

Nenhuma máquina que já foi exportada precisa ser reaberta por causa disto —
mas se algum laudo já assinado tinha mitigação existente marcada, vale
conferir se o texto da Solução saiu correto.

---

## 17/08/2026 12:40

A caixa "Editar" do laudo não perde mais o que você está digitando.

Ao editar um texto na revisão e a sincronização com o OneDrive chegar em
segundo plano (o app confere a nuvem a cada 2 minutos), a tela era
redesenhada e a caixa voltava para o último texto salvo — o que tinha sido
digitado e ainda não salvo sumia.

Agora o que está sendo digitado fica guardado enquanto a caixa está aberta e
sobrevive a esse redesenho. Só some de fato ao **Salvar**, **Cancelar**, ou
trocar de campo ou de item.

---

## 15/08/2026 17:05

A barra de progresso da IA passa a contar campos, não itens.

Gerando os textos de **um** equipamento com **um** risco, a tela mostrava
"0 de 1" do começo ao fim, virando "1 de 1" só no último instante. Parecia
travado — mas estava escrevendo quatro textos, um por vez, com pausa entre
eles.

Agora a conta é por campo. O mesmo caso mostra **de 4**, andando a cada texto
pronto, e a linha de cima diz o que está sendo escrito naquele momento:
*"Debulhador — descrição do risco"*.

O total é levantado antes de começar, com as mesmas regras da geração: o
escopo sai uma vez por equipamento, a descrição da tarefa uma vez por tarefa,
e risco e solução por linha. Nada que já esteja pronto entra na conta.

Exemplo com dois equipamentos de dois riscos cada: **12 campos** — dois
escopos, duas tarefas e oito textos de risco e solução. Antes mostraria
"de 4", contando só as linhas.

---

## 15/08/2026 16:20

Apagar da nuvem passa a aparecer no histórico de sincronização.

Enviar e receber já ficavam registrados. **Apagar não.** Quando arquivos sumiam
do OneDrive, não havia dentro do app nenhuma forma de saber o que tinha sido
apagado, quando, nem por quê.

Agora cada exclusão entra no histórico com marca própria (**✕**, em vermelho),
o caminho do arquivo e **o motivo**, que diz qual dos dois caminhos foi:

- *exclusão confirmada no aparelho* — alguém excluiu o item no app, e a
  sincronização levou a exclusão para a nuvem;
- *sumiu do aparelho, confirmado na sincronização* — o item desapareceu do
  aparelho sem registro de exclusão, e alguém confirmou na pergunta que a
  sincronização manual faz.

O diagnóstico também passou a nomear a exclusão corretamente, em vez de
chamá-la de "falha ao receber".

**Nada mudou na regra de segurança**, que continua a mesma: a sincronização
automática **nunca** apaga em massa sozinha — ela só avisa. Apagar vários itens
de uma vez exige sincronização manual e confirmação na tela.

---

## 13/08/2026 18:00

Exportar Excel agora pergunta o que você quer.

O botão **Exportar Excel** deixou de gerar direto. Ele abre um modal com duas
escolhas.

### O que vai no arquivo

| Opção | Arquivo | Macro |
|---|---|---|
| **Todos** | .xlsm oficial completo | funciona |
| **Laudo** | .xlsm oficial, com tudo menos o Resumo preenchido | funciona |
| **Só Base Completa** | .xlsx limpo, uma aba | sem macro |
| **Só Resumo** | .xlsx limpo, só a tabela dos riscos | sem macro |

As duas de aba única saem sempre em `.xlsx`, **mesmo com o modelo da Corteva
enviado**. É de propósito: para uma aba só não há motivo para mexer no arquivo
do cliente, e assim nenhuma macro corre risco.

No **Laudo**, a aba Resumo continua existindo no arquivo — ela só não é
preenchida. Apagar aba de planilha com macro pode quebrar VBA que a
referencie, e isso não teria como ser testado sem o modelo original em mãos.

### Como separar

- **Um arquivo por área** — o de sempre; havendo mais de uma, vêm num `.zip`.
- **Um arquivo só, com todas as áreas juntas**.

### Sobre o tamanho

Marcando uma aba só, o arquivo cai de 37 KB para 26–28 KB no teste — e abre
sem nenhum aviso de reparo, o que era o ponto delicado: a planilha guarda o
filtro de cada aba pelo **índice** dela na lista, não pelo nome. Tirando a
Base Completa da frente, o Resumo passa a ser a primeira, e esse índice
precisa ser recalculado. A aba oculta que alimenta as fórmulas de HRN nunca
sai, em nenhuma das opções.

---

## 13/08/2026 16:10

Dois defeitos da versão anterior.

### A legenda da figura aparecia duas vezes

A imagem do fluxograma **já traz a legenda desenhada dentro dela**, e o app
acrescentava outra por baixo. Tirei a do app. Quem trocar a figura precisa
mandar uma que já tenha a própria legenda — o modal passou a avisar isso.

### Meia página em branco antes da tabela de ações

A tabela "AÇÕES EM FUNÇÃO DO RISCO" ficava grudada no parágrafo anterior, e os
dois desciam juntos quando não cabiam — deixando o resto da página vazio.
Agora tabelas e fórmulas são unidades próprias e se movem sozinhas.

O aproveitamento das páginas da metodologia foi de 77/75/70% para 77/75/70/73%,
sem nenhuma tabela partida ao meio.

---

## 13/08/2026 15:20

Figura do processo já vem no app, texto do laudo maior e metodologia mais
compacta.

### A figura do processo não precisa mais ser enviada

O fluxograma da apreciação de riscos passou a vir **dentro do app**. Nada a
fazer: ele aparece na metodologia de todo laudo. Quem quiser trocar continua
podendo, em Laudo → Imprimir → Figura, e o botão **Remover** volta para a
figura padrão em vez de deixar a página vazia.

### O texto do laudo ficou maior

A prosa do laudo estava em **8,6 pt** — apertada para leitura impressa e mais
fina que o seu documento de referência. Passou para **10 pt**. Vale para os
parágrafos, títulos e listas; tabelas e cartões de risco têm tamanho próprio e
não mudaram.

### Quebra de página natural na metodologia

Cada seção era um bloco indivisível: não cabendo no que restava da página, ela
descia inteira e deixava meia folha em branco. Agora **cada parágrafo é uma
unidade**, então o texto escorre de uma página para a outra.

O título nunca fica sozinho no pé da página — ele acompanha o primeiro
parágrafo. Tabelas e a figura continuam inteiras.

Resultado medido: o aproveitamento das páginas da metodologia subiu de
66/46/55% para 75/64/79%, e o laudo **manteve o mesmo número de páginas mesmo
com a fonte 16% maior**.

### Coluna PLr conferida

As oito células da coluna PLr foram conferidas na Figura A.1 da ISO
13849-1:2023, uma a uma, e todas conferem. Com isso a tabela do gráfico de
risco está **inteira verificada** — a coluna Categoria já tinha sido conferida
na NBR 14153 em 11/08 (quando foram achados os dois erros).

---

## 11/08/2026 22:10

Frequência semanal, mensal e afins passam a responder a exposição também.

Na versão anterior, só "1x por turno" e "Mais de 2x por turno" alimentavam o
campo Exposição à zona de perigo. As demais continuavam sendo pedidas.

Agora **Diário, Semanal, Quinzenal, Mensal e Esporádico** caem em "Menos de 1x
por turno", que é **F1** no gráfico. Uma tarefa semanal é, por definição, menos
de uma entrada por turno. A NBR 14153, item B.2.2, respalda: *"se o acesso
somente for necessário de tempo em tempo, pode-se selecionar F1"*.

**Uma ressalva que o app agora lembra na tela.** O parâmetro F depende de duas
coisas, não uma: a norma fala em "frequente a contínuo **e/ou** tempo de
exposição longo". Uma tarefa semanal que mantenha a pessoa horas dentro da zona
de perigo é F2, não F1. Por isso a herança é ponto de partida, não veredito — o
aviso no campo passou a dizer isso, e trocar ali continua valendo.

**"1 Turno" e "2 Turnos" continuam sem dedução, de propósito.** Elas dizem que
a tarefa ocupa o turno, não quantas vezes se entra na zona de perigo. Deduzir
F1 subestimaria o risco e F2 o exageraria — nesse caso o campo continua sendo
pedido.

---

## 11/08/2026 21:15

A frequência da tarefa passa a responder pela exposição do PLr.

### Duas opções novas na frequência da tarefa

Entraram **"1x por turno"** e **"Mais de 2x por turno"**, no topo da lista.
Diferente das outras, elas contam repetições **dentro do turno**, e não
periodicidade — e é justamente isso que o gráfico de risco da NBR 14153 quer
saber.

As opções antigas (1 Turno, 2 Turnos, Diário, Semanal, Quinzenal, Mensal,
Esporádico) continuam ali; nada que você já cadastrou mudou.

### A exposição do PLr vem sozinha

Escolhendo uma das duas na tarefa, o campo **Exposição à zona de perigo (F)**
do PLr já vem respondido em todos os riscos daquela tarefa — não precisa
preencher de novo, risco por risco.

| Frequência da tarefa | Exposição | Parâmetro |
|---|---|---|
| 1x por turno | 1x por turno | F1 |
| Mais de 2x por turno | Mais de 2x por turno | F2 |

O campo mostra "Da tarefa: …" e explica de onde o valor saiu. **Escolher algo
ali continua valendo**, e vale só para aquele risco — a escolha manual sempre
vence a herança.

Com as frequências de periodicidade (Semanal, Mensal, Diário…) nada é
deduzido, e o campo continua sendo pedido: de "Semanal" não dá para saber
quantas vezes por turno a pessoa entra na zona de perigo.

### PLr: um valor só

Fica decidido que o app mostra **apenas o PLr exigido**, sem "antes e depois".
O PLr é o nível que a função de segurança precisa atingir, derivado do risco
encontrado — não é resultado de medida. Afirmar o PL alcançado exigiria MTTFd,
DC e CCF dos componentes instalados, que é dado de projeto, não de inspeção.
O que tem antes e depois é o risco, pelo HRN.

---

## 11/08/2026 19:40

O texto sugerido não aparece mais duas vezes.

Nos quadros **Solução** e **Mitigação existente**, o mesmo texto era mostrado
em dois lugares: num quadro de leitura e no campo editável logo abaixo.

A duplicação era real. Ao escolher a medida na lista, o app **já preenche o
campo editável sozinho** — então o quadro de cima passava a exibir exatamente a
mesma frase, sem nem oferecer botão.

Agora o quadro do texto sugerido só aparece **quando ele difere do que está no
campo**, que é justamente quando serve para alguma coisa: você editou o texto à
mão e quer ver o sugerido, ou voltar para ele. Nessa situação ele vem com
rótulo — "Texto sugerido pela medida escolhida" — e com o botão de aplicar.

Na tela de revisão do laudo vale a mesma regra: o quadro some quando o texto da
medida já é igual ao que está em "Vai para o laudo".

---

## 11/08/2026 18:30

Metodologia completa, quadro do PLr numa linha, zoom até 200% e a prévia parou
de voltar para a primeira página.

### A prévia voltava para a página 1

A correção anterior tratou a rolagem da **janela**. Só que a pré-visualização
do laudo tem rolagem **própria** — ela rola por dentro do quadro cinza. Trocar
o conteúdo da tela zerava essa segunda rolagem, e era isso que jogava o
documento de volta para a primeira página. Agora as duas são devolvidas.

### Zoom até 200%

Os passos passaram a ser 30%, 40%, 50%, 65%, 80%, 100%, 125%, 150% e 200%.

### Quadro do PLr numa linha só

"Função de segurança (PLr)" estava quebrando em duas linhas. A coluna foi de
118 px para 156 px, e o espaço saiu das cinco colunas do HRN, que ficaram com
106 px cada — conferido que nenhuma delas corta ou quebra o texto.

### Metodologia: duas páginas que faltavam

- **Página com os itens da NR-12**: quando a ABNT NBR ISO 12100:2013 foi
  publicada, o que é apreciação de riscos, e os itens 12.1.9 e 12.1.1 da NR-12.
- **Página da figura do processo**, com a legenda "Figura 1: Representação
  esquemática do processo de apreciação de riscos".
- No método HRN entrou o parágrafo sobre o **risco residual** — nova estimativa
  após as medidas, e medidas adicionais quando o residual continuar acima do
  aceitável.

**A figura você envia uma vez**, em Laudo → Imprimir → **Figura**. Ela fica
guardada no aparelho e sincroniza, igual ao logotipo. Enquanto não for enviada,
a página sai com um aviso no lugar dela em vez de sair em branco.

O motivo de a figura não vir pronta dentro do app: o aplicativo é publicado num
repositório **público**, e essa figura é adaptada de uma norma ABNT, que é
paga. Deixá-la embutida no arquivo seria distribuí-la. É a mesma razão pela
qual as normas em PDF também não ficam no repositório.

---

## 11/08/2026 15:05

Aba Imprimir mais enxuta, controles dentro da visualização, e a página parou
de subir sozinha.

### A página que voltava ao topo enquanto você lia

`render()` reconstrói a tela inteira, e isso zera a rolagem. Como a
sincronização redesenha a tela de tempos em tempos por conta própria, a página
pulava para o topo no meio da leitura, sem ninguém ter pedido.

Agora a regra é: **continuando na mesma tela, a rolagem é devolvida**; tendo
mudado de tela, começa do topo, que é o certo. A correção ficou dentro do
próprio `render()`, então vale para os 132 pontos do app que redesenham.

### Controles dentro da visualização

**Imprimir**, **aumentar** e **diminuir zoom** saíram da barra do topo e viraram
botões redondos flutuando sobre a pré-visualização, com ícone de lupa e o
percentual do zoom ao lado. Antes era preciso rolar a página inteira de volta
ao topo só para dar um zoom.

### O logotipo virou uma linha

A caixa grande do logotipo, que ocupava meia tela toda vez que se abria a aba,
virou um **botão** que abre um modal. No lugar dela ficou uma linha discreta
com a miniatura e a ficha do arquivo: **nome, tamanho e data** do que está
anexado.

### Texto do rodapé configurável

Botão **Rodapé** novo na barra. Você escreve o que quiser no canto direito do
rodapé antes de gerar o laudo — uma linha por linha escrita. Deixando em
branco, o app usa os dados do responsável cadastrados em Configurações, como
sempre fez.

### Ajustes no laudo

- A numeração agora diz **"Página X de Y"**.
- **O selo do HRN saiu do cabeçalho do cartão** — ele já aparece na tabela do
  rodapé do próprio cartão. No lugar dele, o rótulo **"Evidência do risco"**
  subiu para a linha do nome, liberando altura para a foto.
- O rótulo do PLr virou **"Função de segurança (PLr)"**.
- **O texto do cartão ficou maior**: de 8,5 px para 10 px, que no papel é de
  6,4 pt para 7,5 pt.
- **A faixa vermelha da tarefa não fecha mais a página** com os riscos dela na
  página seguinte. O paginador passou a medir o bloco seguinte junto antes de
  decidir onde quebrar.

---

## 11/08/2026 12:45

Correção de uma Categoria errada no gráfico de risco, e a página do risco do
laudo passa a ser um cartão.

### Categoria de segurança: dois valores estavam errados

A tabela que converte Severidade, Frequência e Possibilidade de evitar em PLr
e Categoria trazia **Categoria B** para o caso *S1·F1·P1* e **Categoria 2**
para *S1·F2·P2*. Os dois estavam errados. O certo é **Categoria 1** nos dois.

A Figura B.1 da ABNT NBR 14153:2022 foi lida direto da imagem do PDF e tem
**cinco saídas, não oito**: o ramo S1 (ferimento leve) vai direto para a
Categoria 1, sem se dividir em Frequência e Possibilidade de evitar. Só o
ramo S2 se ramifica.

| Caminho | Categoria preferencial |
|---|---|
| S1 | 1 |
| S2 · F1 · P1 | 2 |
| S2 · F1 · P2 | 3 |
| S2 · F2 · P1 | 3 |
| S2 · F2 · P2 | 4 |

A origem do erro: o gráfico da ISO 13849-1, que gera o PLr, tem oito saídas
porque nele o S1 *se divide*. Esse gráfico acabou aplicado também à coluna de
Categoria, que segue outra norma. **As duas colunas não podem ser derivadas
uma da outra** — a própria NR-12 registra que a correlação entre PL e
Categoria "não é linear", e a ISO 13849-1 confirma que um PL "c" pode ser
atingido por Categoria 1, 2 ou 3.

O aviso "TABELA A CONFERIR ANTES DE ASSINAR" que estava no código saiu: a
conferência foi feita, e no lugar dele ficou registrado de qual norma e de
qual figura vem cada coluna.

**Laudos já emitidos podem ter saído com a Categoria errada** nos riscos de
ferimento leve. Vale reconferir os que classificaram algum risco como
Categoria B.

### A página do risco virou um cartão

No lugar da linha de tabela, cada risco agora é um bloco:

- **Cabeçalho** com o número, o nome do risco e o selo do HRN.
- **Corpo em duas colunas**: descrição, mitigação existente e solução à
  esquerda; evidência à direita.
- **Rodapé** com a tabela do HRN na horizontal (PO, FE, GPD, NP e o nível).

**A mitigação existente passou a aparecer no laudo**, com o julgamento
(atende / atende em parte / não atende). Antes ela ficava só no app.

**O PLr exigido e a Categoria** ficam num bloco estreito à direita da tabela
do HRN, de forma discreta. Quando a medida é mecânica e não depende do
sistema de comando, ele diz "Não aplicável" em vez de ficar em branco.

### Duas fotos por risco

Havendo duas, entram a **foto principal do risco** e a **primeira foto
extra**, uma sobre a outra. Havendo uma só, ela ocupa a coluna inteira. Sem
foto nenhuma, a coluna nem é desenhada. Nenhuma das fotos leva legenda, então
o caso de uma foto é visualmente igual ao de duas — nada sugere que esteja
faltando alguma coisa.

As fotos ficaram maiores: 173 px cada, contra 150 px para as duas juntas no
formato anterior.

---

## 10/08/2026 22:05

Logotipo do rodapé centralizado e dedução do tipo do equipamento corrigida.

**O logotipo do rodapé estava 76 px à esquerda do centro.** O rodapé é uma
linha com três blocos — número da página (5 px), logotipo e dados do
engenheiro (158 px) — e o bloco do meio se centralizava no espaço que sobrava,
não na página. A diferença era exatamente (158 − 5) ÷ 2. Agora os dois lados
têm a mesma largura e o logotipo cai no centro real, tanto na página em pé
quanto na deitada.

**A dedução do tipo do equipamento cortava letra que faz par.** "Esteira do
Descarte mesa A e B" virava "Esteira do Descarte mesa A e", com a conjunção
solta. Agora a letra do fim só é cortada quando não faz par com outra — "A e
B" e "A ou B" ficam inteiros. As demais deduções seguem iguais.

---

## 10/08/2026 21:10

Inventário de máquinas passa a sair em página deitada (paisagem), como no
modelo em Excel.

### O ganho

| | Largura útil |
|---|---|
| Página em pé | 688 px |
| Página deitada | 1017 px |

São 48% mais largura. As colunas passaram de Modelo 50 px, Marca 50, Nº Série
54, Ano 28, Capacidade 40 e Tensão 34 para 78, 78, 85, 40, 66 e 70 — e Nome foi
a 150, Descrição a 140, Imagem a 120. Com dados reais, cada campo agora cabe em
uma linha só ("SN-2021-10137", "Kepler Weber", "380V") em vez de quebrar em
três.

Conferido na prévia: as 12 colunas somam exatos 1017 px, ficam idênticas entre
o cabeçalho e todas as linhas, e a tabela não passa da borda da página. Cabem
até 14 máquinas por página deitada.

### Como funciona

Só a seção do inventário vira. O laudo continua em pé do começo ao fim, e a
troca de orientação abre página nova automaticamente dos dois lados — não
existe meia página deitada.

Ao imprimir, **deixe a orientação em Retrato** na janela do navegador. O
inventário já sai deitado sozinho; forçar Paisagem ali viraria o laudo inteiro.
O próprio app passou a avisar isso no quadro de instruções.

### Coluna Local corrigida

Área e Local saíam com o mesmo texto. A tabela impressa estava lendo o **nome
da área** na coluna Local, enquanto o Excel lia o campo Local da área — por
isso o Excel mostrava "Despalha 100" e o laudo repetia "Seleção manual 100".
Agora os dois leem o mesmo campo.

---

## 10/08/2026 20:05

Barra de progresso com tempo e botão de parar nas exportações.

### O problema

Ao exportar, o app mostrava um aviso ("Gerando Excel…") que dura 2,2 segundos e
some. Como ele era reemitido a cada item, ficava aceso o tempo todo — parecendo
travado sem estar. E não dizia quanto faltava, nem tinha como cancelar: quem
tocasse no botão sem querer ficava esperando o fim.

A demora é real e tem explicação: para cada risco sem texto, a IA é chamada até
quatro vezes, e cada chamada que falha é repetida com espera crescente (2s, 5s,
12s, 25s). Com muitos riscos, isso passa de meia hora.

### O que mudou

Agora aparece um painel com:

- a etapa (Escrevendo textos da IA → Gerando Excel) e o item da vez;
- barra de progresso e **porcentagem**;
- contagem (**12 de 48**);
- **tempo decorrido** e **estimativa do que falta**;
- botão **Parar**.

A estimativa só aparece depois do segundo item: o primeiro carrega o índice de
casos aprovados e demoraria mais que os outros, dando um número irreal logo de
cara.

### Parar é seguro

Cada texto gerado é gravado no item antes de o próximo começar. Parar não
descarta nada: o que já ficou pronto continua valendo, e a próxima exportação
recomeça de onde parou, porque ela só procura o que ainda não tem sugestão.

A parada respeita a chamada em andamento — o app sai do laço antes de disparar
a próxima, nunca no meio de uma, para não deixar texto pela metade. E
exportação parada **não gera arquivo incompleto**: nada é baixado.

Vale para o Excel e para o Word, que tinham o mesmo comportamento.

---

## 10/08/2026 19:15

Inventário de máquinas: colunas alinhadas e coluna Descrição enxuta.

### Por que a tabela saía deformada

Não era estética, era estrutura. O inventário é montado em **várias tabelas** —
uma para o cabeçalho e uma por máquina — porque cada máquina precisa poder cair
sozinha numa página. Só que tabela HTML calcula a largura das colunas pelo
conteúdo **dela mesma**: cada linha decidia larguras diferentes, nenhuma
batendo com o cabeçalho. Como a coluna Descrição recebia o parágrafo inteiro da
máquina, ela engolia a linha e espremia Modelo, Marca, Nº Série, Ano,
Capacidade e Tensão até virarem tiras.

Agora as larguras são fixas e as mesmas em todas as tabelas, somando exatamente
a área útil da página A4 (688 px = 210 mm menos as margens). Conferido: as 12
colunas do cabeçalho e de todas as linhas ficam idênticas ao pixel.

### Coluna Descrição = tipo do equipamento

A coluna passa a trazer o **tipo** em duas ou três palavras — "Mesa de seleção
manual", "Esteira transportadora", "Vision sorter" — que é o que cabe numa
célula de tabela. O parágrafo descritivo continua existindo e continua indo
para o corpo do laudo; ele só saiu da tabela.

Para isso, o cadastro da máquina ganhou o campo **Tipo do equipamento**, com
lista pronta de 28 tipos do beneficiamento de sementes e grãos (mesa de
seleção, esteira, elevador de canecas, despalhador, debulhador, mesa
densimétrica, vision sorter, secador, ciclone, painel elétrico e outros) e
opção de escrever o que não estiver na lista.

**Máquina cadastrada antes deste campo não fica com a coluna em branco:** o
app deduz o tipo do próprio nome, tirando o identificador do fim ("Mesa de
seleção manual B" → "Mesa de seleção manual"; "Elevador de Canecas 01" →
"Elevador de Canecas"). É só uma sugestão de exibição — nada é gravado sozinho,
e o que você escolher no campo sempre manda.

Vale para os dois lados: o laudo em A4 e a aba Inventário do Excel.

### Logotipo da capa

Confirmado que continua saindo **todo branco** na capa, como você pediu. A capa
aplica um filtro que pinta o logotipo inteiro de branco; com o PNG transparente
da correção anterior, só o desenho fica branco e o fundo continua vazio. Nas
demais posições o logotipo sai nas cores originais do arquivo enviado.

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
