import { createHash, randomInt } from "node:crypto";
import { Chess } from "chess.js";
import { bestChessMove } from "./chess-engine.js";

import {
  newAsta,
  astaMoves,
  astaApply,
  castShells,
  chooseAsta,
  newDadi,
  dadiMoves,
  dadiApply,
  chooseDadi,
  publicWW,
  WW_CYCLE_MS,
} from "./boardRules.js";

const IDS = ["asta-chamma", "dadi", "chess"];

const rejected = (message, status = 400) =>
  Object.assign(new Error(message), { status });

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function sessionToken(req) {
  return (
    String(req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("tsb_demo_session="))
      ?.slice(17) || ""
  );
}

export async function authenticatedCustomer(
  pool,
  req,
  ready = false,
) {
  const token = sessionToken(req);

  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw rejected("Please log in.", 401);
  }

  const hash = createHash("sha256")
    .update(token)
    .digest("hex");

  const c = (
    await pool.query(
      `SELECT c.*
       FROM demo_customer_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()
         AND c.status = 'ACTIVE'
       LIMIT 1`,
      [hash],
    )
  ).rows[0];

  if (!c) {
    throw rejected(
      "Your session expired. Please log in again.",
      401,
    );
  }

  if (
    ready &&
    (c.must_change_password ||
      c.must_change_withdrawal_password)
  ) {
    throw rejected(
      "Complete password setup before playing.",
      403,
    );
  }

  return c;
}

export const safeCustomer = (c) => ({
  id: c.id,
  name: c.name,
  loginId: c.login_id,
  identifier: c.login_id,
  isAuthenticated: true,
  isDemo: true,
  status: c.status,
  demoCoinBalance: Number(c.demo_coin_balance || 0),
  mustChangePassword: Boolean(c.must_change_password),
  mustChangeWithdrawalPassword: Boolean(
    c.must_change_withdrawal_password,
  ),
  withdrawalPasswordConfigured: Boolean(
    c.withdrawal_password_hash,
  ),
});

export async function initializeBoardGames(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kl_board_games (
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      game TEXT NOT NULL,
      state JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(customer_id, game)
    );

    CREATE TABLE IF NOT EXISTS kl_ww_rounds (
      id BIGSERIAL PRIMARY KEY,
      start_ms BIGINT NOT NULL,
      winner TEXT NOT NULL
        CHECK(winner IN ('england', 'pakistan'))
    );

    CREATE TABLE IF NOT EXISTS kl_ww_picks (
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      round_id BIGINT NOT NULL REFERENCES kl_ww_rounds(id),
      side TEXT NOT NULL
        CHECK(side IN ('england', 'pakistan')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(customer_id, round_id)
    );
  `);
}

const chessFrom = (s) => {
  const c = new Chess();

  for (const m of s.moves) {
    c.move(m);
  }

  return c;
};

export function publicBoard(
  row,
  game,
  now = Date.now(),
) {
  if (!row) {
    return {
      started: false,
      serverNow: now,
    };
  }

  const s = structuredClone(row.state);

  let legal = [];

  if (game === "chess") {
    const c = chessFrom(s);

    legal = c.moves({ verbose: true }).map((m) => ({
      from: m.from,
      to: m.to,
      promotion: m.promotion,
    }));

    Object.assign(s, {
      fen: c.fen(),
      board: c.board(),
      turn: c.turn() === "w" ? 0 : 1,
      winner: c.isCheckmate()
        ? c.turn() === "w"
          ? 1
          : 0
        : c.isDraw()
          ? "draw"
          : null,
      check: c.isCheck(),
    });
  } else {
    legal = game === "dadi"
      ? dadiMoves(s)
      : astaMoves(s);
  }

  return {
    started: true,
    state: s,
    legal,
    version: row.version,
    busy: false,
    serverNow: now,
  };
}

export async function runComputers(
  game,
  state,
  { chessTime = 1400, dadiTime = 600 } = {},
) {
  let s = structuredClone(state);

  if (game === "chess") {
    const c = chessFrom(s);

    if (c.turn() === "b" && !c.isGameOver()) {
      const uci = await bestChessMove(c.fen(), {
        time: chessTime,
      });

      const m = c.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] || "q",
      });

      s.moves.push(m.san);
      s.last = "Computer played " + m.san;
    }
  } else if (game === "dadi") {
    for (
      let n = 0;
      n < 3 && s.turn === 1 && s.winner === null;
      n++
    ) {
      s = dadiApply(
        s,
        chooseDadi(s, { time: dadiTime }),
      );
    }
  } else {
    for (
      let n = 0;
      n < 48 && s.turn !== 0 && s.winner === null;
      n++
    ) {
      if (s.roll === null) {
        Object.assign(s, castShells());

        if (!astaMoves(s).length) {
          s.roll = null;
          s.turn = (s.turn + 1) % s.pieces.length;
          s.last = "No legal move. Next player.";
          continue;
        }
      }

      s = astaApply(s, chooseAsta(s));
    }
  }

  return s;
}

export function registerBoardGames(
  app,
  pool,
  {
    clock = Date.now,
    chessTime = 1400,
    dadiTime = 600,
  } = {},
) {
  const origin = (req, res, next) => {
    res.set("Cache-Control", "no-store");

    if (
      req.method !== "GET" &&
      req.headers.origin
    ) {
      try {
        if (
          new URL(req.headers.origin).host !==
          req.headers.host
        ) {
          return res.status(403).json({
            error: "Invalid request origin.",
          });
        }
      } catch {
        return res.status(403).json({
          error: "Invalid request origin.",
        });
      }
    }

    next();
  };

  app.use("/api/kl", origin);

  app.get(
    "/api/kl/session",
    wrap(async (req, res) => {
      res.json({
        customer: safeCustomer(
          await authenticatedCustomer(pool, req),
        ),
        serverNow: clock(),
      });
    }),
  );

  app.post(
    "/api/kl/logout",
    wrap(async (req, res) => {
      const token = sessionToken(req);

      if (token) {
        await pool.query(
          `DELETE FROM demo_customer_sessions
           WHERE token_hash = $1`,
          [
            createHash("sha256")
              .update(token)
              .digest("hex"),
          ],
        );
      }

      res.clearCookie("tsb_demo_session", {
        path: "/",
      });

      res.json({ success: true });
    }),
  );

  app.get(
    "/api/kl/games/:game",
    wrap(async (req, res) => {
      const c = await authenticatedCustomer(
        pool,
        req,
        true,
      );

      const game = req.params.game;

      if (!IDS.includes(game)) {
        throw rejected("Unknown board game.", 404);
      }

      const row = (
        await pool.query(
          `SELECT state, version
           FROM kl_board_games
           WHERE customer_id = $1 AND game = $2`,
          [c.id, game],
        )
      ).rows[0];

      res.json(publicBoard(row, game, clock()));
    }),
  );

  app.post(
    "/api/kl/games/:game/:action",
    wrap(async (req, res) => {
      const customer = await authenticatedCustomer(
        pool,
        req,
        true,
      );

      const game = req.params.game;
      const action = req.params.action;
      const b = req.body || {};

      if (
        !IDS.includes(game) ||
        !["start", "action", "computer"].includes(action)
      ) {
        throw rejected("Unknown board action.", 404);
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext($1))",
          [
            "kl-board:" +
              customer.id +
              ":" +
              game,
          ],
        );

        const row = (
          await client.query(
            `SELECT state, version
             FROM kl_board_games
             WHERE customer_id = $1 AND game = $2
             FOR UPDATE`,
            [customer.id, game],
          )
        ).rows[0];

        let state;

        if (action === "start") {
          if (row && b.version !== row.version) {
            throw rejected(
              "Board changed. Refresh before starting again.",
              409,
            );
          }

          state =
            game === "chess"
              ? {
                  moves: [],
                  last: "You play White. Your turn.",
                }
              : game === "dadi"
                ? newDadi()
                : newAsta(b.players ?? 2);
        } else {
          if (!row) {
            throw rejected("Start a game first.");
          }

          if (b.version !== row.version) {
            throw rejected(
              "This move was processed or the board changed. Refresh.",
              409,
            );
          }

          state = structuredClone(row.state);

          const view = publicBoard(row, game);

          if (view.state.winner !== null) {
            throw rejected(
              "Game complete. Start a new game.",
            );
          }

          if (action === "computer") {
            if (view.state.turn === 0) {
              throw rejected("It is your turn.");
            }
          } else {
            if (view.state.turn !== 0) {
              throw rejected(
                "Wait for the computer turn.",
              );
            }

            if (game === "chess") {
              const c = chessFrom(state);

              let m;

              try {
                m = c.move(b.move);
              } catch {
                throw rejected(
                  "That chess move is not legal.",
                );
              }

              state.moves.push(m.san);
              state.last = "You played " + m.san;
            } else if (game === "dadi") {
              state = dadiApply(state, b.move);
            } else if (b.type === "roll") {
              if (state.roll !== null) {
                throw rejected(
                  "Move a piece before casting again.",
                );
              }

              Object.assign(state, castShells());
              state.last = "Cast: " + state.roll;

              if (!astaMoves(state).length) {
                state.roll = null;
                state.turn = 1;
                state.last = "No legal move. Next player.";
              }
            } else {
              state = astaApply(state, b.move);
            }
          }

          state = await runComputers(game, state, {
            chessTime,
            dadiTime,
          });
        }

        const version = (row?.version || 0) + 1;

        await client.query(
          `INSERT INTO kl_board_games(
             customer_id, game, state, version
           )
           VALUES($1, $2, $3, $4)
           ON CONFLICT(customer_id, game)
           DO UPDATE SET
             state = EXCLUDED.state,
             version = EXCLUDED.version,
             updated_at = NOW()`,
          [
            customer.id,
            game,
            JSON.stringify(state),
            version,
          ],
        );

        await client.query("COMMIT");

        res.json(
          publicBoard(
            { state, version },
            game,
            clock(),
          ),
        );
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }),
  );

  async function wwRound() {
    const c = await pool.connect();

    try {
      await c.query("BEGIN");

      await c.query(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        ["kl-ww-round"],
      );

      let r = (
        await c.query(
          `SELECT id, start_ms, winner
           FROM kl_ww_rounds
           ORDER BY id DESC
           LIMIT 1`,
        )
      ).rows[0];

      const now = clock();

      if (
        !r ||
        now >= Number(r.start_ms) + WW_CYCLE_MS
      ) {
        const start = r
          ? Number(r.start_ms) +
            Math.floor(
              (now - Number(r.start_ms)) /
                WW_CYCLE_MS,
            ) *
              WW_CYCLE_MS
          : now;

        const winner =
          randomInt(2) === 0
            ? "england"
            : "pakistan";

        r = (
          await c.query(
            `INSERT INTO kl_ww_rounds(start_ms, winner)
             VALUES($1, $2)
             RETURNING id, start_ms, winner`,
            [start, winner],
          )
        ).rows[0];
      }

      await c.query("COMMIT");

      return {
        id: Number(r.id),
        start: Number(r.start_ms),
        winner: r.winner,
      };
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }

  app.get(
    "/api/kl/ww",
    wrap(async (req, res) => {
      const c = await authenticatedCustomer(
        pool,
        req,
        true,
      );

      const r = await wwRound();

      const pick =
        (
          await pool.query(
            `SELECT side
             FROM kl_ww_picks
             WHERE customer_id = $1 AND round_id = $2`,
            [c.id, r.id],
          )
        ).rows[0]?.side || null;

      const history = (
        await pool.query(
          `SELECT id, winner
           FROM kl_ww_rounds
           WHERE start_ms + 70000 <= $1
           ORDER BY id DESC
           LIMIT 6`,
          [clock()],
        )
      ).rows.map((v) => ({
        ...v,
        id: Number(v.id),
      }));

      res.json({
        ...publicWW(r, clock()),
        pick,
        history,
      });
    }),
  );

  app.post(
    "/api/kl/ww/pick",
    wrap(async (req, res) => {
      const customer = await authenticatedCustomer(
        pool,
        req,
        true,
      );

      const r = await wwRound();
      const b = req.body || {};

      if (
        b.roundId !== r.id ||
        publicWW(r, clock()).phase !== "PICK"
      ) {
        throw rejected("Selection window closed.");
      }

      if (
        !["england", "pakistan"].includes(b.side)
      ) {
        throw rejected(
          "Choose England or Pakistan.",
        );
      }

      const c = await pool.connect();

      try {
        await c.query("BEGIN");

        await c.query(
          "SELECT pg_advisory_xact_lock(hashtext($1))",
          [
            "kl-ww-pick:" +
              customer.id +
              ":" +
              r.id,
          ],
        );

        if (publicWW(r, clock()).phase !== "PICK") {
          throw rejected("Selection window closed.");
        }

        const old = (
          await c.query(
            `SELECT side
             FROM kl_ww_picks
             WHERE customer_id = $1 AND round_id = $2`,
            [customer.id, r.id],
          )
        ).rows[0];

        if (old && old.side !== b.side) {
          throw rejected(
            "Your selection is already locked.",
          );
        }

        await c.query(
          `INSERT INTO kl_ww_picks(
             customer_id, round_id, side
           )
           VALUES($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [customer.id, r.id, b.side],
        );

        await c.query("COMMIT");

        res.json({ success: true });
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
    }),
  );
}
