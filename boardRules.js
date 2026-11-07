import { randomInt } from "node:crypto";

export const clone = (value) => structuredClone(value);

export const fail = (message) => {
  throw Object.assign(new Error(message), { status: 400 });
};

export const other = (p) => 1 - p;

// 5x5 race variant; supports two or four players.
export const ASTA_PATH = [
  22, 23, 24, 19, 14, 9, 4, 3, 2, 1, 0, 5, 10, 15, 20, 21,
  16, 11, 6, 7, 8, 13, 18, 17, 12,
];

export const astaCell = (player, index, count = 2) => {
  let cell = ASTA_PATH[index];

  for (let i = 0; i < (count === 4 ? player : player * 2); i++) {
    const r = Math.floor(cell / 5);
    const c = cell % 5;
    cell = c * 5 + 4 - r;
  }

  return cell;
};

export const SAFE = [2, 10, 12, 14, 22];

export const CASTS = [
  [1, 4 / 16],
  [2, 6 / 16],
  [3, 4 / 16],
  [4, 1 / 16],
  [8, 1 / 16],
];

export function castShells() {
  const shells = Array.from({ length: 4 }, () => randomInt(2));

  return {
    shells,
    roll: shells.reduce((a, b) => a + b, 0) || 8,
  };
}

export function newAsta(count = 2) {
  if (![2, 4].includes(count)) fail("Choose 2 or 4 players.");

  return {
    pieces: Array.from({ length: count }, () => [-1, -1, -1, -1]),
    turn: 0,
    roll: null,
    shells: [],
    winner: null,
    last: "Your turn — cast the shells.",
    ply: 0,
  };
}

export function astaMoves(s, p = s.turn, roll = s.roll) {
  if (s.winner !== null || !roll) return [];

  const count = s.pieces.length;

  return s.pieces[p].flatMap((pos, i) => {
    const to = pos < 0 ? 0 : pos + roll;

    if (pos === 25 || to > 25) return [];

    const cell = to === 25 ? null : astaCell(p, to, count);

    if (
      cell !== null &&
      !SAFE.includes(cell) &&
      s.pieces[p].some(
        (v, j) =>
          j !== i &&
          v >= 0 &&
          v < 25 &&
          astaCell(p, v, count) === cell,
      )
    ) {
      return [];
    }

    return [{ piece: i, to }];
  });
}

export function astaApply(state, move) {
  const s = clone(state);
  const p = s.turn;
  const count = s.pieces.length;

  const legal = astaMoves(s).find((m) => m.piece === move?.piece);

  if (!legal) fail("Choose a highlighted piece.");

  const roll = s.roll;

  s.pieces[p][legal.piece] = legal.to;

  let capture = false;

  if (legal.to < 25) {
    const cell = astaCell(p, legal.to, count);

    if (!SAFE.includes(cell)) {
      for (let side = 0; side < count; side++) {
        if (side !== p) {
          s.pieces[side] = s.pieces[side].map((v) => {
            if (
              v >= 0 &&
              v < 25 &&
              astaCell(side, v, count) === cell
            ) {
              capture = true;
              return -1;
            }

            return v;
          });
        }
      }
    }
  }

  s.ply++;
  s.roll = null;

  s.last = capture
    ? "Capture! Cast again."
    : legal.to === 25
      ? "A piece reached home."
      : "Piece moved.";

  if (s.pieces[p].every((v) => v === 25)) {
    s.winner = p;
    s.last = p === 0 ? "You won!" : "Computer " + p + " won.";
  } else if (!capture && ![4, 8].includes(roll)) {
    s.turn = (p + 1) % count;
  }

  return s;
}

function astaEval(s) {
  return s.pieces.map((pieces, p) =>
    pieces.reduce(
      (value, v) =>
        value +
        (v < 0
          ? -10
          : v === 25
            ? 95
            : v * 1.8 +
              (SAFE.includes(astaCell(p, v, s.pieces.length)) ? 4 : 0)),
      0,
    ),
  );
}

export function chooseAsta(s) {
  const p = s.turn;
  const count = s.pieces.length;

  function expect(state, depth) {
    if (state.winner !== null) {
      return state.pieces.map((_, i) =>
        i === state.winner ? 10000 : -10000,
      );
    }

    if (!depth) return astaEval(state);

    const total = Array(count).fill(0);

    for (const [roll, prob] of CASTS) {
      const t = clone(state);
      t.roll = roll;

      const moves = astaMoves(t);
      let scores;

      if (!moves.length) {
        t.turn = (t.turn + 1) % count;
        t.roll = null;
        scores = expect(t, depth - 1);
      } else {
        scores = moves
          .map((m) => expect(astaApply(t, m), depth - 1))
          .sort((a, b) => b[t.turn] - a[t.turn])[0];
      }

      scores.forEach((v, i) => {
        total[i] += prob * v;
      });
    }

    return total;
  }

  return astaMoves(s)
    .map((move) => ({
      move,
      score: expect(astaApply(s, move), 2)[p],
    }))
    .sort((a, b) => b.score - a.score)[0]?.move;
}

export const DADI_POINTS = [
  [0, 0],
  [3, 0],
  [6, 0],
  [6, 3],
  [6, 6],
  [3, 6],
  [0, 6],
  [0, 3],
  [1, 1],
  [3, 1],
  [5, 1],
  [5, 3],
  [5, 5],
  [3, 5],
  [1, 5],
  [1, 3],
  [2, 2],
  [3, 2],
  [4, 2],
  [4, 3],
  [4, 4],
  [3, 4],
  [2, 4],
  [2, 3],
];

export const MILLS = [
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 0],
  [8, 9, 10],
  [10, 11, 12],
  [12, 13, 14],
  [14, 15, 8],
  [16, 17, 18],
  [18, 19, 20],
  [20, 21, 22],
  [22, 23, 16],
  [1, 9, 17],
  [3, 11, 19],
  [5, 13, 21],
  [7, 15, 23],
];

export const EDGES = MILLS.flatMap((m) => [
  [m[0], m[1]],
  [m[1], m[2]],
]);

export const neighbors = (n) =>
  EDGES.flatMap(([a, b]) =>
    a === n ? [b] : b === n ? [a] : [],
  );

const millAt = (board, p, n) =>
  MILLS.some(
    (m) => m.includes(n) && m.every((i) => board[i] === p),
  );

export function newDadi() {
  return {
    board: Array(24).fill(null),
    reserve: [9, 9],
    turn: 0,
    capture: false,
    winner: null,
    quiet: 0,
    seen: {},
    last: "Place your first piece.",
    ply: 0,
  };
}

const positions = (s, p) =>
  s.board.flatMap((v, i) => (v === p ? [i] : []));

export function dadiMoves(s) {
  if (s.winner !== null) return [];

  const p = s.turn;
  const own = positions(s, p);
  const empty = positions(s, null);

  if (s.capture) {
    const targets = positions(s, 1 - p);
    const open = targets.filter(
      (i) => !millAt(s.board, 1 - p, i),
    );

    return (open.length ? open : targets).map((to) => ({
      capture: to,
    }));
  }

  if (s.reserve[p]) {
    return empty.map((to) => ({ from: -1, to }));
  }

  return own.flatMap((from) =>
    (own.length === 3
      ? empty
      : neighbors(from).filter((i) => s.board[i] === null)
    ).map((to) => ({ from, to })),
  );
}

export function dadiApply(state, move) {
  const s = clone(state);
  const p = s.turn;

  const legal = dadiMoves(s).find(
    (m) => JSON.stringify(m) === JSON.stringify(move),
  );

  if (!legal) fail("That Dadi move is not legal.");

  s.ply++;

  if (s.capture) {
    s.board[legal.capture] = null;
    s.capture = false;
    s.quiet = 0;
    s.last = "Piece captured.";
  } else {
    if (legal.from === -1) {
      s.reserve[p]--;
      s.quiet = 0;
    } else {
      s.board[legal.from] = null;
      s.quiet++;
    }

    s.board[legal.to] = p;

    if (
      millAt(s.board, p, legal.to) &&
      positions(s, 1 - p).length
    ) {
      s.capture = true;
      s.last = "Three in a line! Remove an opponent piece.";
      return s;
    }

    s.last = s.reserve[p] ? "Piece placed." : "Piece moved.";
  }

  s.turn = 1 - p;

  if (!s.reserve[s.turn] && positions(s, s.turn).length < 3) {
    s.winner = p;
    s.last = p === 0 ? "You won!" : "Computer won.";
  } else if (!dadiMoves(s).length) {
    s.winner = p;
    s.last =
      "No legal moves. " +
      (p === 0 ? "You won!" : "Computer won.");
  } else {
    const key = JSON.stringify([
      s.board,
      s.reserve,
      s.turn,
    ]);

    s.seen[key] = (s.seen[key] || 0) + 1;

    if (s.seen[key] >= 3 || s.quiet >= 100) {
      s.winner = "draw";
      s.last = "Draw by repetition or 50 quiet turns.";
    }
  }

  return s;
}

function dadiEval(s, p) {
  if (s.winner !== null) {
    return s.winner === "draw"
      ? 0
      : s.winner === p
        ? 100000
        : -100000;
  }

  let total = 0;

  for (const side of [p, 1 - p]) {
    let v =
      positions(s, side).length * 110 +
      s.reserve[side] * 100;

    for (const m of MILLS) {
      const own = m.filter(
        (i) => s.board[i] === side,
      ).length;

      const enemy = m.filter(
        (i) => s.board[i] === 1 - side,
      ).length;

      if (own === 3) v += 65;
      else if (own === 2 && !enemy) v += 35;
      else if (own === 1 && !enemy) v += 4;
    }

    v +=
      positions(s, side).reduce(
        (a, n) =>
          a +
          neighbors(n).filter(
            (i) => s.board[i] === null,
          ).length,
        0,
      ) * 3;

    total += (side === p ? 1 : -1) * v;
  }

  return total;
}

export function chooseDadi(
  s,
  { time = 600, maxDepth = 5 } = {},
) {
  const p = s.turn;
  const deadline = Date.now() + time;

  let nodes = 0;
  let best = dadiMoves(s)[0];

  const ordered = (t) =>
    dadiMoves(t)
      .map((m) => ({ m, t: dadiApply(t, m) }))
      .sort(
        (a, b) =>
          (dadiEval(b.t, p) - dadiEval(a.t, p)) *
          (t.turn === p ? 1 : -1),
      );

  function search(t, depth, alpha, beta) {
    if (
      ++nodes % 128 === 0 &&
      Date.now() > deadline
    ) {
      throw new Error("budget");
    }

    if (!depth || t.winner !== null) {
      return dadiEval(t, p);
    }

    const max = t.turn === p;
    let v = max ? -Infinity : Infinity;

    for (const child of ordered(t)) {
      const score = search(
        child.t,
        depth - 1,
        alpha,
        beta,
      );

      v = max
        ? Math.max(v, score)
        : Math.min(v, score);

      if (max) alpha = Math.max(alpha, v);
      else beta = Math.min(beta, v);

      if (beta <= alpha) break;
    }

    return v;
  }

  for (let depth = 1; depth <= maxDepth; depth++) {
    let candidate = best;
    let score = -Infinity;

    try {
      for (const child of ordered(s)) {
        const value = search(
          child.t,
          depth - 1,
          -Infinity,
          Infinity,
        );

        if (value > score) {
          score = value;
          candidate = child.m;
        }
      }

      best = candidate;
    } catch {
      break;
    }
  }

  return best;
}

export const WW_BET_MS = 10000;
export const WW_FIGHT_MS = 60000;
export const WW_RESULT_MS = 5000;
export const WW_CYCLE_MS = 75000;

export function newWW(now = Date.now(), id = 1) {
  return {
    id,
    start: now,
    winner:
      randomInt(2) === 0 ? "england" : "pakistan",
  };
}

export function publicWW(round, now = Date.now()) {
  const elapsed = Math.max(0, now - round.start);

  const phase =
    elapsed < WW_BET_MS
      ? "PICK"
      : elapsed < WW_BET_MS + WW_FIGHT_MS
        ? "FIGHT"
        : "RESULT";

  const endsAt =
    round.start +
    (phase === "PICK"
      ? WW_BET_MS
      : phase === "FIGHT"
        ? WW_BET_MS + WW_FIGHT_MS
        : WW_CYCLE_MS);

  return {
    id: round.id,
    start: round.start,
    phase,
    endsAt,
    serverNow: now,
    fightProgress: Math.max(
      0,
      Math.min(
        1,
        (elapsed - WW_BET_MS) / WW_FIGHT_MS,
      ),
    ),
    winner:
      phase === "RESULT" ? round.winner : null,
  };
}
