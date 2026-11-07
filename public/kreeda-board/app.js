const app = document.querySelector("#app");
const BASE = "";

const COLORS = [
  "#f1cb59",
  "#9c9cf5",
  "#69d7af",
  "#ec8ea2",
];

const NAMES = [
  "You",
  "Computer 1",
  "Computer 2",
  "Computer 3",
];

const PATH = [
  22, 23, 24, 19, 14, 9, 4, 3, 2, 1, 0, 5, 10,
  15, 20, 21, 16, 11, 6, 7, 8, 13, 18, 17, 12,
];

const POINTS = [
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

const MILLS = [
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

const TITLES = {
  "asta-chamma": "Asta Chamma",
  dadi: "Dadi",
  chess: "Chess",
  ww: "World Wrestling",
};

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

let game = null;
let data = null;
let pending = false;
let selected = null;
let polling = false;
let signature = "";
let wwPhase = "";
let serverOffset = 0;
let lastGood = 0;
let players = 2;

async function api(url, body) {
  url = url
    .replace("/api/games/", "/api/kl/games/")
    .replace("/api/ww", "/api/kl/ww")
    .replace("/api/session", "/api/kl/session");

  const response = await fetch(BASE + url, {
    method: body ? "POST" : "GET",
    headers: body
      ? { "Content-Type": "application/json" }
      : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  const d = await response.json();

  if (!response.ok) {
    throw Error(d.error || "Please retry.");
  }

  if (d.serverNow) {
    serverOffset = d.serverNow - Date.now();
    lastGood = Date.now();
  }

  return d;
}

let toastTimer;

function toast(msg) {
  const el = document.querySelector("#toast");

  el.textContent = msg;
  el.style.display = "block";

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.style.display = "none";
  }, 5500);
}

function home() {
  if (new URLSearchParams(location.search).has("game")) {
    window.top.location.assign("/");
    return;
  }

  game = null;
  data = null;
  selected = null;
  signature = "";
  wwPhase = "";

  app.innerHTML = `
    <section class="hero">
      <span class="eyebrow">Kreeda Lokam / New games</span>
      <h1>Your move.<br><em>A worthy opponent.</em></h1>
      <p>
        Start your own board. Play a determined computer
        opponent, or watch England and Pakistan meet in the ring.
      </p>
    </section>

    <section class="cards" aria-label="Choose a game">
      ${[
        [
          "asta-chamma",
          "asta",
          "✦",
          "2 or 4 players · Computer opponents",
        ],
        ["dadi", "dadi", "◈", "Nine Men’s Morris · Hard AI"],
        ["chess", "chess", "♞", "Stockfish · Hard AI"],
        ["ww", "ww", "⚔", "10s picks · 60s fight"],
      ]
        .map(
          ([id, css, icon, sub]) => `
            <button class="game-card" data-open="${id}">
              <div class="art ${css}">${icon}</div>
              <div class="caption">
                <span class="arrow">↗</span>
                <strong>${TITLES[id]}</strong>
                <small>${sub}</small>
              </div>
            </button>
          `,
        )
        .join("")}
    </section>

    <div class="notice">
      Practice preview. Board games belong to this browser’s
      private session. Computer opponents are labelled openly.
      WW selections use no money or wallet balance.
    </div>
  `;
}

function toolbar() {
  return `
    <div class="toolbar">
      <button
        class="back"
        data-home
        aria-label="Back to games"
      >←</button>
      <h1>${TITLES[game]}</h1>
      <span class="tag">
        ${game === "ww" ? "SHARED ROUND" : "YOU vs COMPUTER"}
      </span>
    </div>
  `;
}

function rules() {
  return game === "asta-chamma"
    ? `
      <li>
        Choose <strong>2 players</strong> (you + 1 computer),
        or <strong>4 players</strong> (you + 3 computers).
      </li>
      <li>
        Cast four shells: 1, 2, 3, 4, or 8 steps.
        A new piece enters on any cast.
      </li>
      <li>
        4, 8, or a capture earns another cast.
        Crossed cells are safe.
      </li>
      <li>
        Follow your path to the centre, then use an exact
        cast to finish. First to finish all four pieces wins.
      </li>
      <li>
        This is the documented 5×5 race variant;
        capture is not required to enter the inner path.
      </li>
    `
    : game === "dadi"
      ? `
        <li>Place your nine pieces, one at a time.</li>
        <li>
          Make three in a line to capture an opponent’s piece.
          Pieces in mills are protected unless all are in mills.
        </li>
        <li>
          After placement, move to a connected empty point.
          With three pieces, you may fly to any empty point.
        </li>
        <li>
          Reduce the computer to two pieces or block every
          move to win.
        </li>
        <li>
          Threefold repetition or 50 quiet turns is a draw.
        </li>
      `
      : `
        <li>You play White; the computer plays Black.</li>
        <li>
          Tap your piece, then a marked square.
          Castling and en passant follow standard chess rules.
        </li>
        <li>
          Choose Queen, Rook, Bishop, or Knight when
          promoting a pawn.
        </li>
        <li>
          Stockfish runs at full skill setting with a time
          budget per move. Hardware affects strength;
          this is not a perfect-play guarantee.
        </li>
        <li>
          Checkmate, stalemate, repetition, insufficient
          material and 50-move rule are detected.
        </li>
      `;
}

function shell() {
  app.innerHTML =
    toolbar() +
    `
      <div class="layout">
        <section class="board-panel">
          <div id="board-content"></div>
          <div
            id="network"
            class="network"
            role="status"
          ></div>
        </section>

        <aside class="side-panel">
          <span class="eyebrow">
            ${
              game === "chess"
                ? "Stockfish · Skill 20"
                : "Independent game session"
            }
          </span>

          <h2>
            ${
              game === "asta-chamma"
                ? "Choose your table"
                : "Ready when you are"
            }
          </h2>

          <p>
            ${
              game === "asta-chamma"
                ? "You are the only human player. Every other seat is a computer."
                : "Your opponent starts only after you start a game."
            }
          </p>

          ${
            game === "asta-chamma"
              ? `
                <label for="players">Players at the table</label>
                <select id="players">
                  <option value="2">
                    2 Players — You + 1 Computer
                  </option>
                  <option value="4">
                    4 Players — You + 3 Computers
                  </option>
                </select>
              `
              : ""
          }

          <button class="gold" data-start>Start game</button>
          <button class="outline" data-retry hidden>
            Retry computer turn
          </button>

          ${
            game === "chess"
              ? `
                <label for="promotion">Pawn promotion</label>
                <select id="promotion">
                  <option value="q">Queen</option>
                  <option value="r">Rook</option>
                  <option value="b">Bishop</option>
                  <option value="n">Knight</option>
                </select>
              `
              : ""
          }

          <h2 style="margin-top:24px">How to play</h2>
          <ul class="rules">${rules()}</ul>
        </aside>
      </div>
    `;

  if (game === "asta-chamma") {
    document.querySelector("#players").value = String(players);
  }
}

function astaCell(p, index, count) {
  let cell = PATH[index];

  for (let i = 0; i < (count === 4 ? p : p * 2); i++) {
    const r = Math.floor(cell / 5);
    const c = cell % 5;

    cell = c * 5 + 4 - r;
  }

  return cell;
}

function token(p, i, available) {
  return `
    <button
      aria-label="${NAMES[p]} piece ${i + 1}"
      class="piece ${available ? "available" : ""}"
      style="--p:${COLORS[p]}"
      ${available ? 'data-piece="' + i + '"' : ""}
      ${available ? "" : "disabled"}
    >${i + 1}</button>
  `;
}

function turnLabel(s) {
  return s.winner !== null
    ? s.winner === "draw"
      ? "Draw"
      : s.winner === 0
        ? "You won!"
        : NAMES[s.winner] + " won."
    : pending || data.busy
      ? "Computer is thinking…"
      : s.turn === 0
        ? "Your turn"
        : (NAMES[s.turn] || "Computer") + " to move";
}

function drawBoard() {
  if (
    game === "ww" ||
    !document.querySelector("#board-content")
  ) {
    return;
  }

  const started = data?.started;
  const s = started ? data.state : null;
  const legal = data?.legal || [];

  const can =
    started &&
    !pending &&
    !data.busy &&
    s.turn === 0 &&
    s.winner === null;

  let html = "";

  const count =
    game === "asta-chamma"
      ? s?.pieces.length || players
      : 2;

  html += `
    <div class="players">
      ${Array.from(
        { length: count },
        (_, p) => `
          <div class="player ${
            s && s.turn === p && s.winner === null
              ? "active"
              : ""
          }">
            <span
              class="pip"
              style="--p:${COLORS[p]}"
            ></span>
            ${
              p === 0
                ? "You"
                : count === 2
                  ? "Computer"
                  : NAMES[p]
            }
          </div>
        `,
      ).join("")}
    </div>
    <div class="board-wrap">
  `;

  if (game === "chess") {
    const symbols = {
      w: {
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟",
      },
      b: {
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟",
      },
    };

    html += `
      <div
        class="chess-board"
        role="grid"
        aria-label="Chess board"
      >
    `;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = "abcdefgh"[c] + (8 - r);
        const piece = s?.board[r][c];

        const dest =
          selected &&
          legal.some(
            (m) => m.from === selected && m.to === cell,
          );

        html += `
          <button
            class="square
              ${(r + c) % 2 ? "dark" : ""}
              ${
                piece?.color === "w"
                  ? "white-piece"
                  : "black-piece"
              }
              ${selected === cell ? "selected" : ""}
              ${dest ? "legal" : ""}
            "
            data-square="${cell}"
            aria-label="${cell} ${
              piece ? piece.color + " " + piece.type : "empty"
            }"
            ${can ? "" : "disabled"}
          >
            ${piece ? symbols[piece.color][piece.type] : ""}
            <small>${cell}</small>
          </button>
        `;
      }
    }

    html += "</div>";
  }

  if (game === "asta-chamma") {
    html += `
      <div
        class="asta-board"
        aria-label="Asta Chamma board"
      >
    `;

    for (let cell = 0; cell < 25; cell++) {
      html += `
        <div class="asta-cell
          ${[2, 10, 12, 14, 22].includes(cell) ? "safe" : ""}
          ${cell === 12 ? "center" : ""}
        ">
          <span class="cell-num">
            ${cell === 12 ? "HOME" : cell + 1}
          </span>
      `;

      if (s) {
        s.pieces.forEach((pieces, p) => {
          pieces.forEach((v, i) => {
            if (
              v >= 0 &&
              v < 25 &&
              astaCell(p, v, count) === cell
            ) {
              html += token(
                p,
                i,
                can &&
                  p === 0 &&
                  legal.some((m) => m.piece === i),
              );
            }
          });
        });
      }

      html += "</div>";
    }

    html += "</div>";
  }

  if (game === "dadi") {
    html += `
      <svg
        class="dadi-board"
        viewBox="-6 -6 72 72"
        role="group"
        aria-label="Dadi board"
      >
    `;

    for (const m of MILLS) {
      const a = POINTS[m[0]];
      const b = POINTS[m[2]];

      html += `
        <line
          x1="${a[0] * 10}"
          y1="${a[1] * 10}"
          x2="${b[0] * 10}"
          y2="${b[1] * 10}"
        />
      `;
    }

    POINTS.forEach(([x, y], i) => {
      const p = s?.board[i];

      const isTarget =
        can &&
        (s.capture
          ? legal.some((m) => m.capture === i)
          : s.reserve[0]
            ? legal.some((m) => m.to === i)
            : selected !== null &&
              legal.some(
                (m) => m.from === selected && m.to === i,
              ));

      html += `
        <g
          data-point="${i}"
          tabindex="0"
          role="button"
          aria-label="Point ${i + 1}, ${
            p === 0
              ? "your piece"
              : p === 1
                ? "computer piece"
                : "empty"
          }"
        >
          <circle
            cx="${x * 10}"
            cy="${y * 10}"
            r="4.5"
            fill="transparent"
          />
          <circle
            class="node"
            cx="${x * 10}"
            cy="${y * 10}"
            r="1.6"
          />

          ${
            p === 0 || p === 1
              ? `
                <circle
                  class="stone ${
                    selected === i ? "picked" : ""
                  }"
                  cx="${x * 10}"
                  cy="${y * 10}"
                  r="3"
                  fill="${COLORS[p]}"
                />
              `
              : ""
          }

          ${
            isTarget
              ? `
                <circle
                  class="target"
                  cx="${x * 10}"
                  cy="${y * 10}"
                  r="${s.capture ? 3.4 : 2}"
                />
              `
              : ""
          }
        </g>
      `;
    });

    html += "</svg>";
  }

  if (!started) {
    html += `
      <div class="board-idle">
        <strong>Your board is waiting</strong>
        <span>
          Press Start game to meet your computer opponent.
        </span>
      </div>
    `;
  }

  html += "</div>";

  if (s && game === "asta-chamma") {
    html += '<div class="yards">';

    s.pieces.forEach((pieces, p) => {
      html += `
        <div class="yard">
          <span>${NAMES[p]} ·</span>
      `;

      pieces.forEach((v, i) => {
        if (v === -1) {
          html += token(
            p,
            i,
            can &&
              p === 0 &&
              legal.some((m) => m.piece === i),
          );
        }
      });

      html += `
          <span>
            Home ${pieces.filter((v) => v === 25).length}/4
          </span>
        </div>
      `;
    });

    html += `
      </div>

      <div class="shells">
        ${s.shells
          .map(
            (v) => `
              <span class="shell">${v ? "│" : "●"}</span>
            `,
          )
          .join("")}

        <span class="roll-value">${s.roll || "—"}</span>

        <button
          class="gold"
          data-roll
          ${can && s.roll === null ? "" : "disabled"}
        >Cast shells</button>
      </div>
    `;
  }

  if (s && game === "dadi") {
    html += `
      <div class="reserves">
        <span>Your reserve: ${s.reserve[0]}</span>
        <span>Computer reserve: ${s.reserve[1]}</span>
      </div>
    `;
  }

  html += `
    <div
      class="status ${pending || data?.busy ? "pending" : ""}"
      aria-live="polite"
    >
      ${
        s
          ? `
            <strong>${turnLabel(s)}</strong><br>
            ${esc(s.last)}${s.check ? " · Check!" : ""}
          `
          : "Start when you are ready."
      }
    </div>
  `;

  if (s && game === "chess") {
    html += `
      <div class="moves">
        ${
          s.moves
            .map(
              (m, i) =>
                `${
                  i % 2 === 0
                    ? Math.floor(i / 2) + 1 + ". "
                    : ""
                }${esc(m)}`,
            )
            .join(" ") || "No moves yet"
        }
      </div>
    `;
  }

  document.querySelector("#board-content").innerHTML = html;

  const start = document.querySelector("[data-start]");
  start.textContent = started ? "New game" : "Start game";
  start.disabled = pending || Boolean(data?.busy);

  const retry = document.querySelector("[data-retry]");

  retry.hidden =
    !s ||
    s.turn === 0 ||
    s.winner !== null ||
    pending ||
    data.busy;

  if (game === "asta-chamma") {
    document.querySelector("#players").disabled =
      started && s.winner === null;
  }
}

async function open(id) {
  game = id;
  data = null;
  selected = null;
  signature = "";
  wwPhase = "";

  if (id === "ww") {
    drawWW();
  } else {
    shell();
    drawBoard();
  }

  await refresh();
}

async function refresh() {
  if (!game || polling) return;

  const current = game;
  const wasStale = Date.now() - lastGood > 4000;

  polling = true;

  try {
    const d = await api(
      current === "ww"
        ? "/api/ww"
        : "/api/games/" + current,
    );

    if (game !== current) return;

    data = d;

    if (game === "ww") {
      updateWW();
    } else {
      const sig = JSON.stringify([d.version, d.busy]);

      if (sig !== signature || wasStale) {
        signature = sig;
        drawBoard();
      }

      const n = document.querySelector("#network");

      if (n) n.textContent = "";
    }
  } catch (e) {
    const n = document.querySelector("#network");

    if (n) {
      n.textContent =
        "Connection lost. Moves pause until the server is reachable.";
    }
  } finally {
    polling = false;
  }
}

async function mutate(action, extra = {}) {
  if (pending || !game) return;

  if (
    action !== "start" &&
    Date.now() - lastGood > 4000
  ) {
    toast("Reconnect before making a move.");
    await refresh();
    return;
  }

  const current = game;
  pending = true;

  drawBoard();

  try {
    const d = await api(
      "/api/games/" + current + "/" + action,
      {
        version: data?.version,
        ...extra,
      },
    );

    if (game !== current) return;

    data = d;
    selected = null;
    signature = "";
  } catch (e) {
    toast(e.message);
  } finally {
    pending = false;

    if (game === current) {
      await refresh();
      drawBoard();
    }
  }
}

function fighter(x, flip, color, cls) {
  return `
    <g class="${cls}">
      <g transform="translate(${x} 72) scale(${flip} 1)">
        <ellipse
          cx="0" cy="92" rx="27" ry="5" fill="#0005"
        />

        <path
          d="M-8 60 L-16 85 L-27 91 M8 60 L17 87 L29 91"
          fill="none"
          stroke="#dab28e"
          stroke-width="10"
          stroke-linecap="round"
        />

        <path
          d="M-15 50 L16 50 L12 69 L-12 69Z"
          fill="${color}"
        />

        <path
          d="M-12 20 Q-1 9 12 20 L17 50 L-17 50Z"
          fill="#dfb18a"
        />

        <path
          class="punch"
          d="M8 24 L26 37 L34 25"
          fill="none"
          stroke="#dfb18a"
          stroke-width="9"
          stroke-linecap="round"
        />

        <path
          d="M-10 24 L-22 42 L-12 48"
          fill="none"
          stroke="#dfb18a"
          stroke-width="9"
          stroke-linecap="round"
        />

        <circle cy="5" r="13" fill="#e4ba96"/>

        <path
          d="M-12 3 Q-11 -11 0 -10 Q12 -9 13 2"
          stroke="${color}"
          stroke-width="6"
          fill="none"
        />

        <circle cx="5" cy="4" r="1.5" fill="#29222a"/>

        <path
          d="M-24 88 L-29 95 L-8 95 L-12 87
             M13 87 L13 95 L36 95 L29 89"
          fill="${color}"
        />
      </g>
    </g>
  `;
}

function drawWW() {
  app.innerHTML =
    toolbar() +
    `
      <section class="ww-shell">
        <div class="ww-head">
          <div>
            <span class="eyebrow">England vs Pakistan</span>
            <div class="phase" id="phase">Connecting…</div>
          </div>
          <div class="countdown" id="countdown">—</div>
        </div>

        <div class="arena" id="arena">
          <svg
            viewBox="0 0 360 240"
            aria-label="Animated England and Pakistan wrestling match"
            role="img"
          >
            <defs>
              <radialGradient id="mat">
                <stop stop-color="#53718d"/>
                <stop offset="1" stop-color="#26354e"/>
              </radialGradient>
            </defs>

            <path
              class="spot"
              d="M40 0 L160 200 L-20 180Z
                 M320 0 L200 200 L380 180Z"
            />

            ${Array.from(
              { length: 42 },
              (_, i) => `
                <circle
                  class="crowd"
                  cx="${(i % 21) * 18}"
                  cy="${67 + Math.floor(i / 21) * 15}"
                  r="4"
                />
              `,
            ).join("")}

            <polygon
              points="35,122 325,122 355,210 5,210"
              fill="url(#mat)"
              stroke="#94a9bf"
              stroke-width="2"
            />

            <path
              d="M35 122 L35 65 M325 122 L325 65
                 M5 210 L5 135 M355 210 L355 135"
              stroke="#af9e7a"
              stroke-width="6"
            />

            <path
              d="M35 78 L325 78 M35 97 L325 97
                 M35 116 L325 116"
              fill="none"
              stroke="#c8d4ed"
              stroke-width="2"
            />

            ${fighter(125, 1, "#c84957", "fighter1")}
            ${fighter(235, -1, "#269267", "fighter2")}

            <path
              d="M5 147 L355 147 M5 171 L355 171
                 M5 195 L355 195"
              fill="none"
              stroke="#b7c6e0"
              stroke-width="2"
              opacity=".75"
            />

            <text
              x="180"
              y="220"
              text-anchor="middle"
              fill="#eee6"
              font-family="system-ui"
              font-size="8"
              letter-spacing="4"
            >KREEDA LOKAM</text>
          </svg>

          <span class="fighter-name left">ENGLAND</span>
          <span class="fighter-name right">PAKISTAN</span>
          <div class="ring-overlay" id="ring-overlay"></div>
        </div>

        <div class="progress">
          <div id="progress"></div>
        </div>

        <div class="picks">
          <button class="pick" data-side="england">
            <span>🏴</span>
            <strong>England</strong>
            <small>Choose this side</small>
          </button>

          <button
            class="pick pakistan"
            data-side="pakistan"
          >
            <span>🇵🇰</span>
            <strong>Pakistan</strong>
            <small>Choose this side</small>
          </button>
        </div>

        <div
          class="status"
          id="ww-status"
          aria-live="polite"
        >Connecting to the shared round…</div>

        <div class="history" id="ww-history"></div>

        <div class="notice">
          10 seconds to select · 60 seconds of animated
          fighting · 5 seconds for the result.
          Random server result, shared by every viewer.
          Practice selections only; no stake or payout.
        </div>
      </section>
    `;
}

function updateWW() {
  if (!data || game !== "ww") return;

  const d = data;

  document.querySelector("#phase").textContent =
    d.phase === "PICK"
      ? "Choose your side"
      : d.phase === "FIGHT"
        ? "Fight in progress"
        : "Round complete";

  document.querySelector("#arena").className =
    "arena " +
    (d.phase === "FIGHT"
      ? "fighting"
      : d.phase === "RESULT"
        ? "result"
        : "");

  document.querySelector("#ring-overlay").innerHTML =
    d.phase === "RESULT"
      ? `
        <div>
          <span>ROUND ${d.id}</span>
          <strong>${d.winner.toUpperCase()} WINS</strong>
        </div>
      `
      : d.phase === "PICK"
        ? `
          <div>
            <strong>Make your pick</strong>
            <span>The fight starts after the countdown.</span>
          </div>
        `
        : "";

  for (const b of document.querySelectorAll("[data-side]")) {
    b.disabled =
      pending ||
      d.phase !== "PICK" ||
      Boolean(d.pick) ||
      Date.now() - lastGood > 4000;

    b.classList.toggle(
      "selected",
      d.pick === b.dataset.side,
    );
  }

  document.querySelector("#ww-status").textContent =
    d.phase === "RESULT"
      ? (d.pick
          ? d.pick === d.winner
            ? "Your selection won."
            : "Your selection lost."
          : "No selection this round.") +
        " Next round shortly."
      : d.pick
        ? "Your pick: " +
          d.pick.toUpperCase() +
          " · Locked for round " +
          d.id
        : d.phase === "PICK"
          ? "Tap England or Pakistan before the timer ends."
          : "Selection window closed. Watch the fight.";

  document.querySelector("#ww-history").innerHTML =
    "Recent results " +
    d.history
      .map(
        (r) => `
          <span>#${r.id} ${r.winner.toUpperCase()}</span>
        `,
      )
      .join("");

  tickWW();
}

function tickWW() {
  if (game !== "ww" || !data) return;

  const now = Date.now() + serverOffset;

  document.querySelector("#countdown").textContent =
    Math.max(
      0,
      Math.ceil((data.endsAt - now) / 1000),
    ) + "s";

  const phaseExpired = now >= data.endsAt;

  document.querySelector("#progress").style.width =
    (data.phase === "FIGHT"
      ? Math.max(
          0,
          Math.min(
            100,
            (now - data.start - 10000) / 600,
          ),
        )
      : data.phase === "RESULT"
        ? 100
        : 0) + "%";

  if (phaseExpired) {
    document
      .querySelectorAll("[data-side]")
      .forEach((b) => {
        b.disabled = true;
      });

    document
      .querySelector("#arena")
      .classList.remove("fighting");
  }
}

app.addEventListener("click", async (e) => {
  const target = e.target.closest("button,[data-point]");

  if (!target) return;

  if (target.hasAttribute("data-open")) {
    return open(target.dataset.open);
  }

  if (target.hasAttribute("data-home")) {
    return home();
  }

  if (target.hasAttribute("data-start")) {
    if (
      data?.started &&
      data.state.winner === null &&
      !confirm("Start a new game and discard this board?")
    ) {
      return;
    }

    players =
      Number(document.querySelector("#players")?.value) || 2;

    return mutate("start", { players });
  }

  if (target.hasAttribute("data-retry")) {
    return mutate("computer");
  }

  if (target.hasAttribute("data-roll")) {
    return mutate("action", { type: "roll" });
  }

  if (target.hasAttribute("data-piece")) {
    return mutate("action", {
      move: {
        piece: Number(target.dataset.piece),
      },
    });
  }

  if (target.hasAttribute("data-square")) {
    const sq = target.dataset.square;

    if (
      selected &&
      data.legal.some(
        (m) => m.from === selected && m.to === sq,
      )
    ) {
      const promotion =
        document.querySelector("#promotion").value;

      return mutate("action", {
        move: {
          from: selected,
          to: sq,
          promotion,
        },
      });
    }

    selected = data.legal.some((m) => m.from === sq)
      ? sq
      : null;

    return drawBoard();
  }

  if (target.hasAttribute("data-point")) {
    if (
      !data?.started ||
      pending ||
      data.busy ||
      data.state.turn !== 0 ||
      data.state.winner !== null
    ) {
      return;
    }

    const to = Number(target.dataset.point);
    const s = data.state;

    if (s.capture) {
      return mutate("action", {
        move: { capture: to },
      });
    }

    if (s.reserve[0]) {
      return mutate("action", {
        move: { from: -1, to },
      });
    }

    if (
      selected !== null &&
      data.legal.some(
        (m) => m.from === selected && m.to === to,
      )
    ) {
      return mutate("action", {
        move: { from: selected, to },
      });
    }

    selected = s.board[to] === 0 ? to : null;

    return drawBoard();
  }

  if (target.hasAttribute("data-side")) {
    if (
      pending ||
      !data ||
      data.phase !== "PICK"
    ) {
      return;
    }

    pending = true;
    updateWW();

    try {
      await api("/api/ww/pick", {
        roundId: data.id,
        side: target.dataset.side,
      });
    } catch (error) {
      toast(error.message);
    } finally {
      pending = false;
      await refresh();
    }
  }
});

app.addEventListener("keydown", (e) => {
  if (
    ["Enter", " "].includes(e.key) &&
    e.target.hasAttribute("data-point")
  ) {
    e.preventDefault();

    e.target.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  }
});

app.addEventListener("change", (e) => {
  if (
    e.target.id === "players" &&
    !data?.started
  ) {
    players = Number(e.target.value);
    drawBoard();
  }
});

setInterval(refresh, 1000);

setInterval(() => {
  tickWW();

  if (
    game &&
    Date.now() - lastGood > 4000
  ) {
    document
      .querySelectorAll(
        "[data-roll],[data-piece],[data-square]," +
          "[data-side],[data-start],[data-retry]",
      )
      .forEach((b) => {
        b.disabled = true;
      });

    const n = document.querySelector("#network");

    if (n) {
      n.textContent = "Reconnecting… moves are paused.";
    }
  }
}, 200);

await api("/api/session").catch(() => {
  toast("Server unavailable. Start the Node server and reload.");
});

const requested = new URLSearchParams(
  location.search,
).get("game");

if (
  ["asta-chamma", "dadi", "chess", "ww"].includes(requested)
) {
  document.body.classList.add("embedded");
  await open(requested);
} else {
  home();
}
