import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const enginePath = path.join(
  path.dirname(require.resolve("stockfish/package.json")),
  "bin/stockfish-19-lite-single.js",
);

let child = null;
let tail = Promise.resolve();
let waiter = null;
let buffer = "";

function line(s) {
  if (waiter?.test(s)) {
    const w = waiter;

    waiter = null;
    clearTimeout(w.timer);
    w.resolve(s);
  }
}

function wait(test, ms = 12000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiter = null;

      child?.kill();
      child = null;

      reject(
        new Error(
          "Chess engine timed out. Retry the computer turn.",
        ),
      );
    }, ms);

    waiter = {
      test,
      resolve,
      reject,
      timer,
    };
  });
}

function send(s) {
  child.stdin.write(s + "\n");
}

async function ready() {
  if (child) return;

  child = spawn(process.execPath, [enginePath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  buffer = "";

  child.stdout.on("data", (chunk) => {
    buffer += chunk;

    const rows = buffer.split("\n");
    buffer = rows.pop();

    rows.forEach((s) => line(s.trim()));
  });

  child.stderr.on("data", () => {});

  child.on("error", () => {
    if (waiter) {
      clearTimeout(waiter.timer);

      waiter.reject(
        new Error("Chess engine unavailable."),
      );

      waiter = null;
    }

    child = null;
  });

  child.on("exit", () => {
    child = null;

    if (waiter) {
      clearTimeout(waiter.timer);

      waiter.reject(
        new Error("Chess engine stopped. Retry."),
      );

      waiter = null;
    }
  });

  let p = wait((s) => s === "uciok");

  send("uci");
  await p;

  send("setoption name Hash value 32");
  send("setoption name Threads value 1");
  send("setoption name Skill Level value 20");
  send("setoption name UCI_LimitStrength value false");

  p = wait((s) => s === "readyok");

  send("isready");
  await p;
}

export function bestChessMove(
  fen,
  { time = 1400 } = {},
) {
  const job = tail.then(async () => {
    await ready();

    let p = wait((s) => s === "readyok");

    send("ucinewgame");
    send("isready");

    await p;

    send("position fen " + fen);

    p = wait((s) => s.startsWith("bestmove "));

    send("go movetime " + time);

    return (await p).split(" ")[1];
  });

  tail = job.catch(() => {});

  return job;
}

export function closeEngine() {
  child?.kill();
  child = null;
}
