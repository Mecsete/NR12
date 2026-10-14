# Pendências do cálculo do memorial (zona livre de queda)

Registradas na revisão técnica de 13/10/2026. **Nenhuma foi aplicada.** Elas também aparecem na tela
Configurações → Planilha de cálculo → aba "Pendências" (dados em `CHK_CALC_PENDENCIAS`, no `index.html`).

Casos de referência usados nos testes: ver `CHK_CALC_CASOS` (caso 1: vão único; caso 2: multi-vão; caso 3: linha rígida; caso 4: fator de queda).

| ID | Status | Assunto |
|---|---|---|
| P1 | Pendente | Eficiência do terminal do cabo |
| P2 | Pendente | Flexibilidade das ancoragens e da estrutura |
| P3 | Aguardando decisão | Acomodação do cinturão no Hp do trava-quedas |
| P4 | Aguardando decisão | Linha de restrição: vão máximo e ocultar a ZLQ |
| P5 | Aguardando decisão | Carga do primeiro usuário: 6 kN exatos |
| P6 | Aguardando decisão | Linha rígida: verificar a viga e as fixações |
| P7 | Pendente | Multi-vão com apoio que trava o cabo |

## P1 — Eficiência do terminal do cabo
- **Descrição:** `Fadm = η · Frup / FS`, com η por tipo de terminal (grampos ≈ 0,8).
- **Base normativa:** NBR 16325-2:2024 D.2.4. O Guia Prático e a planilha usam `Frup/2 · 0,8`.
- **Efeito:** no exemplo (vão 10 m, flecha 3%, Ø 9,53 mm) a utilização do cabo vai de 0,83 para cerca de 1,04: reprova.
- **Como aplicar:** acrescentar a constante η (por terminal) no registro e trocar a fórmula de `Fadm` para `eta * Frup / FS`.
- **Teste associado:** caso 1 com η = 0,8: utilização ≈ 1,04.
- **Aviso na tela:** "Eficiência do terminal ainda não considerada" (aba Memorial da linha, no cálculo novo).

## P2 — Flexibilidade das ancoragens e da estrutura
- **Descrição:** somar a deflexão do apoio à zona livre de queda.
- **Base normativa:** Branchtein; a NBR 16325-2 pede o registro da deflexão.
- **Efeito:** a ZLQ necessária aumenta pelo valor da deflexão.
- **Como aplicar:** nova entrada (deflexão do apoio, em m) somada em `f3` ou diretamente nas ZLQ.
- **Teste associado:** caso 1 com deflexão de 0,05 m: ZLQ +0,05 m.

## P3 — Acomodação do cinturão (AGUARDANDO DECISÃO)
- **Descrição:** somar cerca de 0,30 m (acomodação do cinturão) ao Hp do trava-quedas.
- **Base normativa:** manual Athenas; NBR 14628:2020.
- **Efeito:** o Hp do trava-quedas aumenta cerca de 0,30 m.
- **Como aplicar:** constante nova (acomodação) somada na fórmula de `Hp_trava`.
- **Teste associado:** caso 1: Hp trava = 2,823 m.

## P4 — Linha de restrição (AGUARDANDO DECISÃO)
- **Descrição:** validar o vão máximo de 4 m entre intermediárias e ocultar ZLQ/talabarte/trava-quedas na restrição.
- **Base normativa:** Guia Prático 2.4.6.1.
- **Efeito:** a linha de restrição deixa de mostrar zona livre de queda e alerta vão maior que 4 m.
- **Como aplicar:** validação do vão e ocultação dos blocos quando `restricao = 1`.
- **Teste associado:** linha de restrição com vão de 5 m: alerta.

## P5 — Carga do primeiro usuário (AGUARDANDO DECISÃO)
- **Descrição:** usar 6 kN exatos (611,8 kgf) em vez de 600 kgf.
- **Base normativa:** NBR 16325-2:2024.
- **Efeito:** a força no cabo sobe cerca de 2% no primeiro usuário.
- **Como aplicar:** trocar a constante `P1` de 600 para 611.8 (Configurações → Planilha de cálculo → Constantes).
- **Teste associado:** caso 1: T1 sobe cerca de 2%.

## P6 — Linha rígida: viga e fixações (AGUARDANDO DECISÃO)
- **Descrição:** verificar esforços, flecha (≈ P·L³/48EI), registrar a deflexão declarada (NBR 16325-1) e a origem do número de usuários.
- **Base normativa:** NBR 16325-1:2024.
- **Efeito:** a linha rígida passa a ter verificação de resistência e deflexão (hoje `f1 = f3 = 0`).
- **Como aplicar:** novas entradas (perfil, E, I) e fórmulas de flecha e esforço no registro da linha rígida.
- **Teste associado:** viga W200x26,6 com P = 600 kgf e vão de 5 m.

## P7 — Multi-vão com apoio que trava o cabo
- **Descrição:** avaliar a força com vão independente quando o intermediário trava o cabo.
- **Base normativa:** NBR 16325-2, 4.3.14.
- **Efeito:** força maior que a do modelo de deslizamento.
- **Como aplicar:** terceiro modelo multi-vão (`mv = 3`) com vão independente.
- **Teste associado:** caso 2 com `mv = 3`.
