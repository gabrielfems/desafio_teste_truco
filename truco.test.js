'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
    ORDEM,
    NAIPES,
    baralho,
    embaralhar,
    proxima,
    forca,
    comparar,
    criarPartida,
    maoDeOnze,
    distribuir,
    jogar,
    resultadoMao,
    pedirTruco,
    responderTruco,
    correrMaoDeOnze,
    vencedorPartida
} = require('./truco');

// ---------------------------------------------------------------------------
// Helpers
// Cartas em formato curto: valor + naipe (o = ouros, e = espadas, c = copas, p = paus)
// Exemplo: '4o' = 4 de ouros, 'Qp' = Q de paus
// ---------------------------------------------------------------------------

const NAIPE = { o: 'ouros', e: 'espadas', c: 'copas', p: 'paus' };
const c = s => ({ valor: s.slice(0, -1), naipe: NAIPE[s.slice(-1)] });
const chave = carta => `${carta.valor}-${carta.naipe}`;

// Monta um baralho de 40 cartas com as mãos e a vira escolhidas no início
function deckCom(maos, vira) {
    const escolhidas = [...maos.flat(), vira].map(c);
    const usadas = new Set(escolhidas.map(chave));
    const resto = baralho().filter(carta => !usadas.has(chave(carta)));
    return [...escolhidas, ...resto];
}

// Cria uma partida com a mão já distribuída
function novaMao({ maos = MAOS_PADRAO, vira = '7o', pontos = [0, 0], quemComeca = 0 } = {}) {
    const p = criarPartida();
    p.pontos = [...pontos];
    p.quemComeca = quemComeca;
    return distribuir(p, deckCom(maos, vira));
}

// Joga uma rodada completa. `cartas` é indexado por jogador: cartas[0] é do jogador 0, etc.
function rodada(p, cartas) {
    for (let k = 0; k < 4; k++) {
        const jogador = p.vez;
        jogar(p, jogador, c(cartas[jogador]));
    }
}

// Vira 7 de ouros: a manilha é o Q, que não aparece nas mãos abaixo,
// então as rodadas são decididas só pela ordem das cartas comuns.
const VIRA = c('7o');

const MAOS_PADRAO = [
    ['4o', '5o', '6o'],
    ['4e', '5e', '6e'],
    ['4c', '5c', '6c'],
    ['4p', '5p', '6p']
];

// Mãos em que a dupla 0 vence as duas primeiras rodadas
const MAOS_DUPLA_0 = [
    ['3o', '3e', '4o'],
    ['4e', '5e', '6e'],
    ['5c', '6c', '4c'],
    ['4p', '5p', '6p']
];
const R1_DUPLA_0 = ['3o', '4e', '5c', '4p'];
const R2_DUPLA_0 = ['3e', '5e', '6c', '5p'];

function dupla0VenceAMao(p) {
    rodada(p, R1_DUPLA_0);
    rodada(p, R2_DUPLA_0);
}

// ---------------------------------------------------------------------------
// Preparação da partida
// ---------------------------------------------------------------------------

describe('Preparação da partida', () => {
    test('CT01 - cria partida com 4 jogadores em duas duplas alternadas', () => {
        const p = criarPartida();

        assert.equal(p.jogadores.length, 4);
        assert.deepEqual(p.jogadores.map(j => j.id), [0, 1, 2, 3]);
        assert.deepEqual(p.jogadores.map(j => j.dupla), [0, 1, 0, 1]);
    });

    test('CT01 - estado inicial da partida', () => {
        const p = criarPartida();

        assert.deepEqual(p.pontos, [0, 0]);
        assert.equal(p.valorMao, 1);
        assert.equal(p.vira, null);
        assert.equal(p.maoEmAndamento, false);
        assert.equal(p.encerrada, false);
        p.jogadores.forEach(j => assert.deepEqual(j.cartas, []));
    });

    test('CT02 - baralho com 40 cartas sem repetição', () => {
        const cartas = baralho();

        assert.equal(cartas.length, 40);
        assert.equal(new Set(cartas.map(chave)).size, 40);
    });

    test('CT02 - cada valor aparece uma vez em cada naipe', () => {
        const cartas = baralho();

        for (const valor of ORDEM) {
            for (const naipe of NAIPES) {
                const quantidade = cartas.filter(x => x.valor === valor && x.naipe === naipe).length;
                assert.equal(quantidade, 1, `${valor} de ${naipe}`);
            }
        }
    });

    test('CT02 - baralho sem 8, 9 e 10', () => {
        assert.deepEqual(ORDEM, ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3']);
        assert.equal(baralho().some(x => ['8', '9', '10'].includes(x.valor)), false);
    });

    test('CT03 - embaralhar mantém as mesmas 40 cartas', () => {
        const original = baralho();
        const embaralhado = embaralhar(original);

        assert.equal(embaralhado.length, 40);
        assert.deepEqual(embaralhado.map(chave).sort(), original.map(chave).sort());
    });

    test('CT03 - embaralhar muda a ordem das cartas', () => {
        const original = baralho();

        assert.notDeepEqual(embaralhar(original).map(chave), original.map(chave));
    });

    test('CT03 - embaralhar não altera o baralho original', () => {
        const original = baralho();
        const copia = original.map(chave);

        embaralhar(original);

        assert.deepEqual(original.map(chave), copia);
    });

    test('CT04 - distribui 3 cartas por jogador e uma vira', () => {
        const p = novaMao();

        p.jogadores.forEach(j => assert.equal(j.cartas.length, 3));
        assert.deepEqual(p.vira, VIRA);
        assert.equal(p.maoEmAndamento, true);
    });

    test('CT04 - cada jogador recebe as cartas na ordem do baralho', () => {
        const p = novaMao();

        MAOS_PADRAO.forEach((mao, i) => {
            assert.deepEqual(p.jogadores[i].cartas, mao.map(c));
        });
    });

    test('CT04 - distribuição aleatória não repete cartas', () => {
        const p = distribuir(criarPartida());
        const usadas = [...p.jogadores.flatMap(j => j.cartas), p.vira];

        assert.equal(usadas.length, 13);
        assert.equal(new Set(usadas.map(chave)).size, 13);
    });

    test('CT04 - a mão começa com o estado zerado', () => {
        const p = novaMao();

        assert.equal(p.valorMao, 1);
        assert.deepEqual(p.rodadas, []);
        assert.deepEqual(p.jogadas, []);
        assert.equal(p.pedido, null);
        assert.equal(p.vez, 0);
    });

    test('CT04 - a vez começa em quem deve abrir a mão', () => {
        const p = novaMao({ quemComeca: 2 });

        assert.equal(p.vez, 2);
    });

    test('CT05 - rejeita baralho com menos de 40 cartas', () => {
        assert.throws(
            () => distribuir(criarPartida(), baralho().slice(0, 39)),
            { message: 'Baralho inválido' }
        );
    });

    test('CT05 - rejeita baralho com mais de 40 cartas', () => {
        assert.throws(
            () => distribuir(criarPartida(), [...baralho(), c('4o')]),
            { message: 'Baralho inválido' }
        );
    });

    test('CT05 - rejeita 40 cartas com repetição', () => {
        const repetido = baralho();
        repetido[39] = { ...repetido[0] };

        assert.throws(() => distribuir(criarPartida(), repetido), { message: 'Baralho inválido' });
    });

    test('CT05 - baralho inválido não altera a partida', () => {
        const p = criarPartida();

        assert.throws(() => distribuir(p, baralho().slice(0, 39)));

        assert.equal(p.maoEmAndamento, false);
        assert.equal(p.vira, null);
        p.jogadores.forEach(j => assert.deepEqual(j.cartas, []));
    });

    test('CT05 - rejeita distribuir em partida encerrada', () => {
        const p = criarPartida();
        p.pontos = [12, 0];
        p.encerrada = true;

        assert.throws(() => distribuir(p), { message: 'Partida encerrada' });
    });
});

// ---------------------------------------------------------------------------
// Força das cartas
// ---------------------------------------------------------------------------

describe('Força das cartas', () => {
    // [vira, manilha]
    const PARES = [
        ['4', '5'], ['5', '6'], ['6', '7'], ['7', 'Q'], ['Q', 'J'],
        ['J', 'K'], ['K', 'A'], ['A', '2'], ['2', '3'], ['3', '4']
    ];

    for (const [valorVira, valorManilha] of PARES) {
        test(`CT06 - vira ${valorVira}: a manilha é o ${valorManilha}`, () => {
            const vira = c(valorVira + 'o');

            assert.equal(proxima(valorVira), valorManilha);

            for (const naipe of ['o', 'e', 'c', 'p']) {
                assert.ok(forca(c(valorManilha + naipe), vira) >= 100, `${valorManilha}${naipe}`);
            }

            // a própria vira não vira manilha
            assert.ok(forca(c(valorVira + 'e'), vira) < 100);
        });
    }

    test('CT06 - o 3 volta para o 4 (vira 3, manilha 4)', () => {
        const vira = c('3o');

        assert.equal(proxima('3'), '4');
        assert.ok(forca(c('4p'), vira) >= 100);
        assert.ok(forca(c('3p'), vira) < 100);
    });

    test('CT06 - valor inválido é rejeitado', () => {
        assert.throws(() => proxima('8'), { message: 'Carta inválida' });
        assert.throws(() => forca(c('8o'), VIRA), { message: 'Carta inválida' });
    });

    test('CT07 - a carta mais forte vence', () => {
        const ordem = ['4', '5', '6', '7', 'J', 'K', 'A', '2', '3'];

        for (let i = 0; i < ordem.length - 1; i++) {
            const fraca = c(ordem[i] + 'p');
            const forte = c(ordem[i + 1] + 'p');

            assert.equal(comparar(forte, fraca, VIRA), 1, `${ordem[i + 1]} > ${ordem[i]}`);
            assert.equal(comparar(fraca, forte, VIRA), -1, `${ordem[i]} < ${ordem[i + 1]}`);
        }
    });

    test('CT07 - a manilha vence o 3', () => {
        assert.equal(comparar(c('Qo'), c('3p'), VIRA), 1);
        assert.equal(comparar(c('3p'), c('Qo'), VIRA), -1);
    });

    test('CT07 - cartas de mesmo valor empatam', () => {
        assert.equal(comparar(c('3o'), c('3p'), VIRA), 0);
        assert.equal(comparar(c('4e'), c('4e'), VIRA), 0);
    });

    test('CT07 - a manilha depende da vira', () => {
        // vira K: manilha A, que passa a vencer o 3
        assert.equal(comparar(c('Ao'), c('3p'), c('Ko')), 1);
        // vira 7: o A é carta comum e perde para o 3
        assert.equal(comparar(c('Ao'), c('3p'), VIRA), -1);
        // vira 2: manilha 3
        assert.equal(comparar(c('3o'), c('2p'), c('2e')), 1);
    });

    test('CT08 - entre manilhas: paus > copas > espadas > ouros', () => {
        const vira = c('4o'); // manilha: 5
        const fracaParaForte = ['o', 'e', 'c', 'p'];

        for (let i = 0; i < fracaParaForte.length; i++) {
            for (let j = i + 1; j < fracaParaForte.length; j++) {
                const fraca = c('5' + fracaParaForte[i]);
                const forte = c('5' + fracaParaForte[j]);

                assert.equal(comparar(forte, fraca, vira), 1, `5${fracaParaForte[j]} > 5${fracaParaForte[i]}`);
                assert.equal(comparar(fraca, forte, vira), -1);
            }
        }
    });

    test('CT08 - a manilha mais fraca ainda vence qualquer carta comum', () => {
        const vira = c('4o'); // manilha: 5

        assert.equal(comparar(c('5o'), c('3p'), vira), 1);
    });
});

// ---------------------------------------------------------------------------
// Jogadas
// ---------------------------------------------------------------------------

describe('Jogadas', () => {
    test('jogada válida remove a carta da mão e passa a vez', () => {
        const p = novaMao();

        jogar(p, 0, c('5o'));

        assert.deepEqual(p.jogadores[0].cartas, [c('4o'), c('6o')]);
        assert.deepEqual(p.jogadas, [{ jogador: 0, carta: c('5o') }]);
        assert.equal(p.vez, 1);
    });

    test('CT09 - rejeita jogada fora da vez', () => {
        const p = novaMao();

        assert.throws(() => jogar(p, 1, c('4e')), { message: 'Fora da vez' });

        assert.equal(p.jogadores[1].cartas.length, 3);
        assert.deepEqual(p.jogadas, []);
        assert.equal(p.vez, 0);
    });

    test('CT09 - rejeita o mesmo jogador jogando duas vezes seguidas', () => {
        const p = novaMao();

        jogar(p, 0, c('4o'));

        assert.throws(() => jogar(p, 0, c('5o')), { message: 'Fora da vez' });
        assert.equal(p.jogadores[0].cartas.length, 2);
    });

    test('CT10 - rejeita carta que está na mão de outro jogador', () => {
        const p = novaMao();

        assert.throws(() => jogar(p, 0, c('4e')), { message: 'Carta não está na mão' });
        assert.equal(p.jogadores[0].cartas.length, 3);
        assert.equal(p.vez, 0);
    });

    test('CT10 - rejeita carta que não foi distribuída', () => {
        const p = novaMao();

        assert.throws(() => jogar(p, 0, c('Ao')), { message: 'Carta não está na mão' });
    });

    test('CT10 - rejeita mesmo valor com naipe diferente', () => {
        const p = novaMao();

        assert.throws(() => jogar(p, 0, c('4p')), { message: 'Carta não está na mão' });
    });

    test('CT11 - rejeita jogada com truco pendente', () => {
        const p = novaMao();

        pedirTruco(p, 1);

        assert.throws(() => jogar(p, 0, c('4o')), { message: 'Truco pendente' });
        assert.equal(p.jogadores[0].cartas.length, 3);
    });

    test('CT12 - a dupla que vence a rodada é registrada e o vencedor abre a próxima', () => {
        const p = novaMao();

        // jogador 2 faz o 6, a maior carta da rodada
        rodada(p, ['4o', '5e', '6c', '4p']);

        assert.deepEqual(p.rodadas, [0]);
        assert.equal(p.vez, 2);
        assert.deepEqual(p.jogadas, []);
        assert.equal(p.maoEmAndamento, true);
        p.jogadores.forEach(j => assert.equal(j.cartas.length, 2));
    });

    test('CT12 - vitória da dupla 1 na rodada', () => {
        const p = novaMao();

        rodada(p, ['4o', '6e', '5c', '4p']);

        assert.deepEqual(p.rodadas, [1]);
        assert.equal(p.vez, 1);
    });

    test('CT13 - parceiros empatam na maior carta: a dupla ganha a rodada', () => {
        const p = novaMao();

        // jogadores 0 e 2 (mesma dupla) fazem o 6
        rodada(p, ['6o', '4e', '6c', '4p']);

        assert.deepEqual(p.rodadas, [0]);
        assert.equal(p.vez, 0);
    });

    test('CT13 - parceiros da dupla 1 empatam na maior carta', () => {
        const p = novaMao();

        // jogadores 1 e 3 fazem o 6
        rodada(p, ['4o', '6e', '4c', '6p']);

        assert.deepEqual(p.rodadas, [1]);
        assert.equal(p.vez, 1);
    });

    test('CT14 - adversários empatam na maior carta: rodada empatada', () => {
        const p = novaMao();

        // jogadores 0 e 1 (duplas diferentes) fazem o 6
        rodada(p, ['6o', '6e', '4c', '4p']);

        assert.deepEqual(p.rodadas, [null]);
        assert.deepEqual(p.jogadas, []);
        assert.equal(p.maoEmAndamento, true);
    });
});

// ---------------------------------------------------------------------------
// Resultado da mão
// ---------------------------------------------------------------------------

describe('Resultado da mão', () => {
    test('CT15 - vencer duas rodadas: a dupla ganha a mão e soma 1 ponto', () => {
        const p = novaMao({ maos: MAOS_DUPLA_0 });

        dupla0VenceAMao(p);

        assert.deepEqual(p.rodadas, [0, 0]);
        assert.deepEqual(p.pontos, [1, 0]);
        assert.equal(p.maoEmAndamento, false);
        assert.equal(p.encerrada, false);
        assert.equal(p.quemComeca, 1);
    });

    test('CT15 - resultadoMao com duas rodadas da mesma dupla', () => {
        assert.equal(resultadoMao([0, 0]), 0);
        assert.equal(resultadoMao([1, 1]), 1);
    });

    test('CT15 - jogar depois do fim da mão é rejeitado', () => {
        const p = novaMao({ maos: MAOS_DUPLA_0 });

        dupla0VenceAMao(p);

        assert.throws(() => jogar(p, 0, c('4o')), { message: 'Nenhuma mão em andamento' });
    });

    test('CT16 - menos de duas rodadas: a mão continua', () => {
        assert.equal(resultadoMao([]), undefined);
        assert.equal(resultadoMao([0]), undefined);
        assert.equal(resultadoMao([1]), undefined);
        assert.equal(resultadoMao([null]), undefined);
    });

    test('CT16 - uma rodada para cada dupla: a mão continua', () => {
        assert.equal(resultadoMao([0, 1]), undefined);
        assert.equal(resultadoMao([1, 0]), undefined);
    });

    test('CT16 - na prática, 1 a 1 deixa a mão em andamento', () => {
        const p = novaMao();

        rodada(p, ['6o', '4e', '4c', '4p']); // dupla 0
        rodada(p, ['4o', '6e', '5c', '5p']); // dupla 1

        assert.deepEqual(p.rodadas, [0, 1]);
        assert.equal(p.maoEmAndamento, true);
        assert.deepEqual(p.pontos, [0, 0]);
        assert.equal(p.vez, 1);
    });

    test('CT17 - empate na primeira rodada: leva quem vencer a segunda', () => {
        assert.equal(resultadoMao([null, 0]), 0);
        assert.equal(resultadoMao([null, 1]), 1);
    });

    test('CT17 - na prática, a dupla 1 vence a segunda e leva a mão', () => {
        const p = novaMao();

        rodada(p, ['4o', '4e', '4c', '4p']); // todos empatam
        rodada(p, ['5o', '6e', '5c', '5p']); // jogador 1 vence

        assert.deepEqual(p.rodadas, [null, 1]);
        assert.deepEqual(p.pontos, [0, 1]);
        assert.equal(p.maoEmAndamento, false);
    });

    test('CT18 - vence a primeira e empata a segunda: leva quem venceu a primeira', () => {
        assert.equal(resultadoMao([0, null]), 0);
        assert.equal(resultadoMao([1, null]), 1);
    });

    test('CT18 - na prática, a dupla 0 vence a primeira e empata a segunda', () => {
        const p = novaMao();

        rodada(p, ['6o', '4e', '4c', '4p']); // dupla 0
        rodada(p, ['5o', '5e', '5c', '5p']); // empate

        assert.deepEqual(p.rodadas, [0, null]);
        assert.deepEqual(p.pontos, [1, 0]);
        assert.equal(p.maoEmAndamento, false);
    });

    test('CT19 - empate na terceira rodada: leva quem venceu a primeira', () => {
        assert.equal(resultadoMao([0, 1, null]), 0);
        assert.equal(resultadoMao([1, 0, null]), 1);
    });

    test('CT19 - terceira rodada decisiva quando não há empate', () => {
        assert.equal(resultadoMao([0, 1, 1]), 1);
        assert.equal(resultadoMao([0, 1, 0]), 0);
        assert.equal(resultadoMao([1, 0, 0]), 0);
    });

    test('CT19 - na prática, a terceira empata e a dupla 0 leva pela primeira', () => {
        const p = novaMao();

        rodada(p, ['6o', '4e', '4c', '4p']); // dupla 0
        rodada(p, ['4o', '6e', '5c', '5p']); // dupla 1
        rodada(p, ['5o', '5e', '6c', '6p']); // jogadores 2 e 3 empatam no 6

        assert.deepEqual(p.rodadas, [0, 1, null]);
        assert.deepEqual(p.pontos, [1, 0]);
        assert.equal(p.maoEmAndamento, false);
    });

    test('CT20 - três rodadas empatadas: ninguém marca ponto', () => {
        assert.equal(resultadoMao([null, null, null]), null);
        assert.equal(resultadoMao([null, null]), undefined);
    });

    test('CT20 - na prática, três empates encerram a mão sem pontuar', () => {
        const p = novaMao();

        rodada(p, ['4o', '4e', '4c', '4p']);
        rodada(p, ['5o', '5e', '5c', '5p']);
        rodada(p, ['6o', '6e', '6c', '6p']);

        assert.deepEqual(p.rodadas, [null, null, null]);
        assert.deepEqual(p.pontos, [0, 0]);
        assert.equal(p.maoEmAndamento, false);
        assert.equal(p.encerrada, false);
    });
});

// ---------------------------------------------------------------------------
// Truco
// ---------------------------------------------------------------------------

describe('Truco', () => {
    test('CT21 - pedir truco: o valor da mão só muda após a resposta', () => {
        const p = novaMao();

        pedirTruco(p, 0);

        assert.deepEqual(p.pedido, { dupla: 0, valor: 3 });
        assert.equal(p.valorMao, 1);
    });

    test('CT21 - rejeita novo pedido enquanto há um pendente', () => {
        const p = novaMao();

        pedirTruco(p, 0);

        assert.throws(() => pedirTruco(p, 1), { message: 'Pedido pendente' });
        assert.throws(() => pedirTruco(p, 0), { message: 'Pedido pendente' });
    });

    test('CT21 - rejeita dupla inválida', () => {
        const p = novaMao();

        assert.throws(() => pedirTruco(p, 2), { message: 'Dupla inválida' });
        assert.throws(() => pedirTruco(p, -1), { message: 'Dupla inválida' });
        assert.equal(p.pedido, null);
    });

    test('CT22 - aceitar o truco: a mão passa a valer 3', () => {
        const p = novaMao();

        pedirTruco(p, 0);
        responderTruco(p, 1, true);

        assert.equal(p.valorMao, 3);
        assert.equal(p.pedido, null);
        assert.equal(p.ultimoAumento, 0);
        assert.equal(p.maoEmAndamento, true);
    });

    test('CT22 - depois de aceitar, as jogadas voltam a ser permitidas', () => {
        const p = novaMao();

        pedirTruco(p, 0);
        responderTruco(p, 1, true);

        assert.doesNotThrow(() => jogar(p, 0, c('4o')));
    });

    test('CT23 - recusar o truco: quem pediu ganha 1 ponto', () => {
        const p = novaMao();

        pedirTruco(p, 0);
        responderTruco(p, 1, false);

        assert.deepEqual(p.pontos, [1, 0]);
        assert.equal(p.pedido, null);
        assert.equal(p.maoEmAndamento, false);
        assert.equal(p.encerrada, false);
    });

    test('CT23 - a partida continua com uma nova mão', () => {
        const p = novaMao();

        pedirTruco(p, 0);
        responderTruco(p, 1, false);

        assert.equal(p.quemComeca, 1);
        assert.doesNotThrow(() => distribuir(p, deckCom(MAOS_PADRAO, '7o')));
        assert.equal(p.maoEmAndamento, true);
        assert.equal(p.valorMao, 1);
        assert.equal(p.vez, 1);
    });

    test('CT23 - recusar um aumento paga o valor anterior', () => {
        const p = novaMao();

        pedirTruco(p, 0);
        responderTruco(p, 1, true); // mão vale 3
        pedirTruco(p, 1);           // pede 6
        responderTruco(p, 0, false);

        assert.deepEqual(p.pontos, [0, 3]);
    });

    test('CT24 - escalada: 3, 6, 9 e 12', () => {
        const p = novaMao();

        // [quem pede, quem responde, valor]
        const passos = [[0, 1, 3], [1, 0, 6], [0, 1, 9], [1, 0, 12]];

        for (const [pede, responde, valor] of passos) {
            pedirTruco(p, pede);
            assert.equal(p.pedido.valor, valor);

            responderTruco(p, responde, true);
            assert.equal(p.valorMao, valor);
        }
    });

    test('CT24 - não passa de 12', () => {
        const p = novaMao();

        for (const [pede, responde] of [[0, 1], [1, 0], [0, 1], [1, 0]]) {
            pedirTruco(p, pede);
            responderTruco(p, responde, true);
        }

        assert.equal(p.valorMao, 12);
        assert.throws(() => pedirTruco(p, 0), { message: 'Limite de pontos' });
        assert.throws(() => pedirTruco(p, 1), { message: 'Limite de pontos' });
        assert.equal(p.valorMao, 12);
    });

    test('CT25 - a mesma dupla não pode aumentar duas vezes seguidas', () => {
        const p = novaMao();

        pedirTruco(p, 0);
        responderTruco(p, 1, true);

        assert.throws(() => pedirTruco(p, 0), { message: 'Só a outra dupla pode aumentar' });
        assert.equal(p.pedido, null);
        assert.equal(p.valorMao, 3);
    });

    test('CT25 - a outra dupla pode aumentar', () => {
        const p = novaMao();

        pedirTruco(p, 0);
        responderTruco(p, 1, true);

        assert.doesNotThrow(() => pedirTruco(p, 1));
        assert.deepEqual(p.pedido, { dupla: 1, valor: 6 });
    });

    test('CT26 - rejeita resposta sem pedido pendente', () => {
        const p = novaMao();

        assert.throws(() => responderTruco(p, 1, true), { message: 'Resposta inválida' });
        assert.throws(() => responderTruco(p, 0, false), { message: 'Resposta inválida' });
        assert.equal(p.valorMao, 1);
    });

    test('CT26 - a dupla que pediu não pode responder o próprio pedido', () => {
        const p = novaMao();

        pedirTruco(p, 0);

        assert.throws(() => responderTruco(p, 0, true), { message: 'Resposta inválida' });
        assert.throws(() => responderTruco(p, 0, false), { message: 'Resposta inválida' });
        assert.deepEqual(p.pedido, { dupla: 0, valor: 3 });
        assert.equal(p.valorMao, 1);
    });

    test('CT26 - rejeita dupla inexistente na resposta', () => {
        const p = novaMao();

        pedirTruco(p, 0);

        assert.throws(() => responderTruco(p, 2, true), { message: 'Resposta inválida' });
        assert.throws(() => responderTruco(p, -1, true), { message: 'Resposta inválida' });
        assert.deepEqual(p.pedido, { dupla: 0, valor: 3 });
    });

    test('CT27 - ganhar a mão trucada soma 3 pontos', () => {
        const p = novaMao({ maos: MAOS_DUPLA_0 });

        pedirTruco(p, 0);
        responderTruco(p, 1, true);
        dupla0VenceAMao(p);

        assert.deepEqual(p.pontos, [3, 0]);
        assert.equal(p.maoEmAndamento, false);
    });

    test('CT27 - ganhar a mão de 6 soma 6 pontos', () => {
        const p = novaMao({ maos: MAOS_DUPLA_0 });

        pedirTruco(p, 0);
        responderTruco(p, 1, true);
        pedirTruco(p, 1);
        responderTruco(p, 0, true);
        dupla0VenceAMao(p);

        assert.deepEqual(p.pontos, [6, 0]);
    });
});

// ---------------------------------------------------------------------------
// Mão de onze e fim de jogo
// ---------------------------------------------------------------------------

describe('Mão de onze e fim de jogo', () => {
    test('CT28 - mão de onze vale 3', () => {
        const p = novaMao({ pontos: [11, 3] });

        assert.equal(maoDeOnze(p), 0);
        assert.equal(p.valorMao, 3);
    });

    test('CT28 - mão de onze da dupla 1', () => {
        const p = novaMao({ pontos: [3, 11] });

        assert.equal(maoDeOnze(p), 1);
        assert.equal(p.valorMao, 3);
    });

    test('CT28 - fora da mão de onze a mão vale 1', () => {
        const p = novaMao({ pontos: [10, 10] });

        assert.equal(maoDeOnze(p), null);
        assert.equal(p.valorMao, 1);
    });

    test('CT28 - mão de onze não aceita pedido de truco', () => {
        const p = novaMao({ pontos: [11, 3] });

        assert.throws(() => pedirTruco(p, 0), { message: 'Não pode pedir truco na mão de onze' });
        assert.throws(() => pedirTruco(p, 1), { message: 'Não pode pedir truco na mão de onze' });
        assert.equal(p.pedido, null);
        assert.equal(p.valorMao, 3);
    });

    test('CT29 - correr da mão de onze: o adversário ganha 1 ponto', () => {
        const p = novaMao({ pontos: [11, 3] });

        correrMaoDeOnze(p);

        assert.deepEqual(p.pontos, [11, 4]);
        assert.equal(p.maoEmAndamento, false);
        assert.equal(p.encerrada, false);
    });

    test('CT29 - correr da mão de onze da dupla 1', () => {
        const p = novaMao({ pontos: [3, 11] });

        correrMaoDeOnze(p);

        assert.deepEqual(p.pontos, [4, 11]);
    });

    test('CT29 - só é possível correr numa mão de onze em andamento', () => {
        const normal = novaMao({ pontos: [5, 5] });
        assert.throws(() => correrMaoDeOnze(normal), { message: 'Não é mão de onze' });

        const p = novaMao({ pontos: [11, 3] });
        correrMaoDeOnze(p);
        assert.throws(() => correrMaoDeOnze(p), { message: 'Não é mão de onze' });
    });

    test('CT30 - duas duplas com 11: truco não é permitido', () => {
        const p = novaMao({ pontos: [11, 11] });

        assert.throws(() => pedirTruco(p, 0), { message: 'Não pode pedir truco na mão de onze' });
        assert.throws(() => pedirTruco(p, 1), { message: 'Não pode pedir truco na mão de onze' });
        assert.equal(p.pedido, null);
    });

    test('CT30 - com as duas duplas em 11 não há mão de onze', () => {
        const p = novaMao({ pontos: [11, 11] });

        assert.equal(maoDeOnze(p), null);
        assert.equal(p.valorMao, 1);
        assert.throws(() => correrMaoDeOnze(p), { message: 'Não é mão de onze' });
    });

    test('CT31 - chegar a 12 pontos: a dupla vence e a partida encerra', () => {
        const p = novaMao({ maos: MAOS_DUPLA_0, pontos: [9, 0] });

        pedirTruco(p, 0);
        responderTruco(p, 1, true);
        dupla0VenceAMao(p);

        assert.deepEqual(p.pontos, [12, 0]);
        assert.equal(p.encerrada, true);
        assert.equal(vencedorPartida(p), 0);
    });

    test('CT31 - vitória da dupla 1', () => {
        const p = criarPartida();
        p.pontos = [3, 12];

        assert.equal(vencedorPartida(p), 1);
    });

    test('CT31 - com 11 pontos a partida ainda não encerra', () => {
        const p = novaMao({ maos: MAOS_DUPLA_0, pontos: [10, 0] });

        dupla0VenceAMao(p);

        assert.deepEqual(p.pontos, [11, 0]);
        assert.equal(p.encerrada, false);
        assert.equal(vencedorPartida(p), -1);
    });

    test('CT31 - sem vencedor, vencedorPartida retorna -1', () => {
        assert.equal(vencedorPartida(criarPartida()), -1);
    });

    test('CT31 - vencer a mão de onze passa de 12 e encerra', () => {
        const p = novaMao({ maos: MAOS_DUPLA_0, pontos: [11, 3] });

        dupla0VenceAMao(p);

        assert.deepEqual(p.pontos, [14, 3]);
        assert.equal(p.encerrada, true);
        assert.equal(vencedorPartida(p), 0);
    });

    test('CT31 - depois de encerrada, nenhuma ação é aceita', () => {
        const p = novaMao({ maos: MAOS_DUPLA_0, pontos: [11, 3] });

        dupla0VenceAMao(p);

        assert.throws(() => distribuir(p), { message: 'Partida encerrada' });
        assert.throws(() => jogar(p, 0, c('4o')), { message: 'Partida encerrada' });
        assert.throws(() => pedirTruco(p, 0), { message: 'Partida encerrada' });
    });
});