# Truco para 4 jogadores

Lógica de uma partida de Truco (paulista) para **quatro jogadores em duas duplas**, escrita em JavaScript (CommonJS) e coberta por 31 casos de teste automatizados com o executor nativo do Node.js (`node:test`).

## Como rodar

Requisito: Node.js 18 ou mais novo. Não há dependências para instalar.

```bash
npm test
```

O comando executa os 31 casos de teste (CT01 a CT31). Alguns casos têm mais de um teste, então o total de testes executados é maior que 31. No `package.json`, o script é:

```json
{
  "scripts": {
    "test": "node --test truco.test.js"
  }
}
```

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `truco.js` | Regras da partida: baralho, força das cartas, jogadas, resultado da mão, truco, mão de onze e fim de jogo |
| `truco.test.js` | Casos de teste automatizados (CT01 a CT31) |
| `package.json` | Configuração do projeto e script `npm test` |

## Regras implementadas

### Jogadores e baralho

- 4 jogadores, com ids de `0` a `3`, em duas duplas alternadas: jogadores `0` e `2` formam a dupla `0`, e jogadores `1` e `3` formam a dupla `1`.
- O baralho tem 40 cartas, sem 8, 9 e 10, com 4 naipes: ouros, espadas, copas e paus.
- Ordem das cartas, da mais fraca para a mais forte: `4, 5, 6, 7, Q, J, K, A, 2, 3`.
- Cada jogador recebe 3 cartas e uma carta fica virada (a vira).
- O baralho passado para a distribuição precisa ter exatamente 40 cartas, sem repetição.

### Manilhas

- A manilha é a carta seguinte à vira na ordem acima. Quando a vira é `3`, a manilha é o `4`.
- Toda manilha vence qualquer carta comum, inclusive o `3`.
- Entre manilhas, a ordem é: paus > copas > espadas > ouros.
- Cartas comuns de mesmo valor empatam, independente do naipe.

### Rodadas e mão

- Uma mão tem até 3 rodadas, e cada jogador joga uma carta por rodada.
- Quem faz a maior carta abre a rodada seguinte.
- Se os dois parceiros fazem a maior carta, a dupla ganha a rodada.
- Se jogadores de duplas diferentes empatam na maior carta, a rodada empata.
- Resultado da mão:
  - quem vence duas rodadas leva a mão;
  - se a primeira rodada empata, leva quem vencer a segunda;
  - se vence a primeira e empata a segunda, leva quem venceu a primeira;
  - se a terceira empata, leva quem venceu a primeira;
  - se as três rodadas empatam, ninguém pontua.
- A mão vale 1 ponto, ou mais se houver truco.

### Truco

- Qualquer dupla pode pedir truco durante a mão. O pedido fica pendente e a mão só muda de valor depois da resposta.
- Com um pedido pendente, ninguém joga carta.
- Só a dupla adversária responde. Quem pediu não pode responder o próprio pedido.
- Se aceitar, a mão passa a valer o valor pedido. Se recusar, quem pediu ganha o valor que a mão valia antes do pedido, e a mão termina.
- A escalada é `1 → 3 → 6 → 9 → 12`.
- A mesma dupla não aumenta duas vezes seguidas. O aumento seguinte é sempre da outra dupla.
- Não é possível pedir mais que 12.

### Mão de onze

- Quando uma dupla tem 11 pontos e a outra não, a mão vale 3 e não aceita truco.
- A dupla com 11 pode correr, e o adversário ganha 1 ponto.
- Se as duas duplas têm 11 pontos, não há mão de onze: a mão vale 1 e também não aceita truco.

### Fim da partida

- A partida acaba quando uma dupla chega a 12 pontos ou mais.
- Pontos acima de 12 são aceitos, por exemplo vencer a mão de onze (11 + 3 = 14).
- Depois do encerramento, distribuir, jogar e pedir truco são rejeitados.
- `vencedorPartida` retorna `0` ou `1`, ou `-1` se ainda não há vencedor.

## Uso

```js
const { criarPartida, distribuir, jogar, pedirTruco, responderTruco } = require('./truco');

const partida = criarPartida();
distribuir(partida);

const carta = partida.jogadores[partida.vez].cartas[0];
jogar(partida, partida.vez, carta);

pedirTruco(partida, 0);
responderTruco(partida, 1, true);
```

Para cenários controlados, `distribuir(partida, cartas)` aceita um baralho já montado. Sem o segundo argumento, o baralho é embaralhado.

### Funções exportadas

| Função | O que faz |
|---|---|
| `baralho()` | Retorna as 40 cartas em ordem |
| `embaralhar(cartas)` | Retorna uma cópia embaralhada, sem alterar a original |
| `proxima(valor)` | Retorna o valor seguinte na ordem das cartas (a manilha da vira) |
| `forca(carta, vira)` | Retorna a força da carta, com as manilhas acima das comuns |
| `comparar(a, b, vira)` | Retorna `1`, `-1` ou `0` conforme `a` vença, perca ou empate com `b` |
| `criarPartida()` | Cria a partida com 4 jogadores e placar zerado |
| `distribuir(partida, cartas)` | Dá 3 cartas a cada jogador, vira uma carta e inicia a mão |
| `jogar(partida, jogador, carta)` | Joga uma carta e fecha a rodada quando os 4 jogaram |
| `resultadoMao(rodadas)` | Retorna a dupla vencedora, `null` (ninguém pontua) ou `undefined` (mão em andamento) |
| `pedirTruco(partida, dupla)` | Registra um pedido de truco ou aumento |
| `responderTruco(partida, dupla, aceita)` | Aceita ou recusa o pedido pendente |
| `maoDeOnze(partida)` | Retorna a dupla com 11 pontos, ou `null` |
| `correrMaoDeOnze(partida)` | A dupla com 11 corre e o adversário ganha 1 ponto |
| `vencedorPartida(partida)` | Retorna a dupla com 12 pontos ou mais, ou `-1` |

Também são exportadas as constantes `ORDEM` e `NAIPES`.

## Casos de teste

Usam `node:test` e `node:assert/strict`. Os testes montam baralhos controlados, com as mãos e a vira escolhidas, para que o resultado de cada rodada seja previsível.

### Preparação da partida

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT01 | Criar partida | 4 jogadores em duas duplas alternadas |
| CT02 | Validar baralho | 40 cartas sem repetição |
| CT03 | Embaralhar | Mesmas 40 cartas, em outra ordem |
| CT04 | Distribuir | 3 cartas por jogador e uma vira |
| CT05 | Baralho inválido | Distribuição rejeitada |

### Força das cartas

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT06 | Manilha | Carta seguinte à vira, com o 3 voltando para o 4 |
| CT07 | Comparar cartas | A mais forte vence e a manilha vence o 3 |
| CT08 | Comparar manilhas | Paus > copas > espadas > ouros |

### Jogadas

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT09 | Jogar fora da vez | Jogada rejeitada |
| CT10 | Jogar carta que não está na mão | Jogada rejeitada |
| CT11 | Jogar com truco pendente | Jogada rejeitada |
| CT12 | Vencer uma rodada | O vencedor começa a próxima |
| CT13 | Parceiros empatam na maior carta | A dupla ganha a rodada |
| CT14 | Adversários empatam na maior carta | Rodada empatada |

### Resultado da mão

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT15 | Vencer duas rodadas | A dupla ganha a mão e soma 1 ponto |
| CT16 | Mão ainda indefinida | A mão continua |
| CT17 | Empate na primeira rodada | Leva quem vencer a segunda |
| CT18 | Vence a primeira e empata a segunda | Leva quem venceu a primeira |
| CT19 | Empate na terceira rodada | Leva quem venceu a primeira |
| CT20 | Três rodadas empatadas | Ninguém marca ponto |

### Truco

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT21 | Pedir truco | O valor só muda após a resposta |
| CT22 | Aceitar truco | A mão passa a valer 3 |
| CT23 | Recusar truco | Quem pediu ganha 1 ponto e a partida continua |
| CT24 | Escalada | 3, 6, 9 e 12, sem passar de 12 |
| CT25 | Mesma dupla aumentar duas vezes | Pedido rejeitado |
| CT26 | Responder pedido de forma inválida | Resposta rejeitada |
| CT27 | Ganhar mão trucada | A dupla soma 3 pontos |

### Mão de onze e fim de jogo

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT28 | Mão de onze | Vale 3 e não aceita truco |
| CT29 | Correr da mão de onze | O adversário ganha 1 ponto |
| CT30 | Duas duplas com 11 | Truco não é permitido |
| CT31 | Chegar a 12 pontos | A dupla vence e a partida encerra |

## Colaboradores

Gabriel Felipe Martins, RA 26005039-2
