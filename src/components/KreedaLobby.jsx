import React, { useEffect, useRef, useState } from "react";

export const GAME_LIST = [
  ["aviator", "AVIATOR", "/games/tsb-flight"],
  ["roulette", "ROULETTE", "/games/roulette"],
  ["super-over", "SUPER OVER", "/games/super-over"],
  ["color-prediction", "COLOR PREDICTION", "/games/color-prediction"],
  ["dragon-tiger", "DRAGON TIGER", "/games/dragon-tiger"],
  ["andar-bahar", "ANDAR BAHAR", "/games/andar-bahar"],
  ["lucky-seven", "LUCKY SEVEN", "/games/lucky-seven"],
  ["deal-or-no-deal", "DEAL OR NO DEAL", "/games/deal-or-no-deal"],
  ["twist-x", "TWIST X", "/games/twist-x"],
  ["lankesh", "LANKESH", "/games/lankesh"],
  ["jhandi-munda", "JHANDI MUNDA", "/games/jhandi-munda"],
  ["extra-sic-bo", "EXTRA SIC BO", "/games/extra-sic-bo"],
  ["dream-wheel", "DREAM WHEEL", "/games/dream-wheel"],
  ["chicken-road-cross", "CHICKEN ROAD CROSS", "/games/chicken-road-cross"],
  ["mini-roulette", "MINI ROULETTE", "/games/mini-roulette"],
  ["keno-80", "KENO 80", "/games/keno-80"],
  ["asta-chamma", "ASTA CHAMMA", "/games/asta-chamma"],
  ["dadi", "DADI", "/games/dadi"],
  ["chess", "CHESS", "/games/chess"],
  ["ww", "WW ANIMATION", "/games/ww-animation"],
];

const ROWS = [
  [451, 219],
  [679, 204],
  [890, 185],
  [1083, 197],
  [1287, 267],
];

const COLS = [
  [10, 220],
  [239, 216],
  [464, 214],
  [687, 218],
];

const PAUSE_MS = 5000;

const STYLES = `
.kl-fixed-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: #080d25;
}

.kl-fixed-header .kl-header {
  position: static;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}

.kl-fixed-header .kl-brand {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 52%;
  padding: 0;
}

.kl-fixed-header .kl-brand img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 82px;
  object-fit: contain;
  object-position: left center;
}

.kl-fixed-header .kl-menu-icon {
  flex: 0 0 32px;
  width: 32px;
  font-size: 30px;
  line-height: 1;
  padding: 0;
  margin: 0 0 0 auto;
}

.kl-small-wallet {
  flex: 0 0 auto;
  max-width: 34%;
  min-width: 88px;
  padding: 5px 7px;
  border: 1px solid #e2c465;
  border-radius: 10px;
  background: #10152f;
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  text-align: center;
}

.kl-small-wallet span {
  display: block;
  color: #efd474;
  font-size: 9px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0.6px;
}

.kl-small-wallet strong {
  display: block;
  margin-top: 2px;
  font-size: clamp(11px, 3vw, 16px);
  line-height: 1.2;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

.kl-small-wallet small {
  display: block;
  margin-top: 2px;
  color: #efd474;
  font-size: 8px;
}

.kl-money-actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 14px 10px;
  border-bottom: 1px solid #bba35a;
}

.kl-money-actions button {
  min-height: 36px;
  padding: 8px 16px;
  border: 1px solid #e2c465;
  border-radius: 9px;
  background: linear-gradient(110deg, #ffe997, #ffca30);
  color: #080d25;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  cursor: pointer;
}

.kl-scrolling-games {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
  gap: 8px;
  width: 100%;
  isolation: isolate;
}

.kl-game-column {
  position: relative;
  overflow: hidden;
  overflow: clip;
  width: 100%;
  min-width: 0;
  aspect-ratio: 1 / 5.8;
  border: 0;
  margin: 0;
  padding: 0;
  box-shadow: none;
  touch-action: pan-y;
  background: transparent;
}

.kl-column-track {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  will-change: transform;
  animation: kl-column-down
    var(--kl-column-duration, 36s)
    linear infinite;
  animation-delay: var(--kl-column-delay, 0s);
}

.kl-column-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: none;
  width: 100%;
  padding: 0 0 8px;
  margin: 0;
  box-sizing: border-box;
}

.kl-column-group .kl-column-card {
  position: relative;
  display: block !important;
  flex: none;
  width: 100%;
  height: auto !important;
  min-width: 0;
  min-height: 0;
  aspect-ratio: 1 / 1.08 !important;
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 12px;
  line-height: 0;
}

.kl-column-card .kl-artwork {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden !important;
}

.kl-pause-badge {
  position: absolute;
  z-index: 2;
  right: 5px;
  top: 5px;
  padding: 3px 6px;
  border-radius: 6px;
  background: #080d25e8;
  color: #efd474;
  border: 1px solid #bba35a;
  font-size: 10px;
  pointer-events: none;
}

.kl-scroll-help {
  margin: 10px 0;
  color: #efd474;
  text-align: center;
  font-size: 11px;
  line-height: 1.5;
}

.kl-fixed-header button:focus-visible,
.kl-game-column button:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: -3px;
}

@keyframes kl-column-down {
  from {
    transform: translateY(-50%);
  }

  to {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .kl-column-track {
    animation: none;
    transform: none;
  }

  .kl-motion-help {
    display: none;
  }
}

@media (min-width: 700px) {
  .kl-fixed-header .kl-header,
  .kl-money-actions {
    max-width: 1000px;
    margin: 0 auto;
  }

  .kl-small-wallet {
    min-width: 110px;
  }

  .kl-fixed-header .kl-brand {
    max-width: 330px;
  }
}
`;

export function Artwork({ index, bonus = false }) {
  let x;
  let y;
  let w;
  let h;

  if (bonus) {
    [x, w] = [
      [8, 302],
      [318, 283],
      [609, 300],
    ][index];

    y = 108;
    h = 324;
  } else {
    [x, w] = COLS[index % 4];
    [y, h] = ROWS[Math.floor(index / 4)];
  }

  return (
    <svg
      className="kl-artwork"
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <image
        href="/kreeda/approved-lobby.png"
        width="916"
        height="1717"
      />
    </svg>
  );
}

export function KreedaHeader({
  user,
  balance = null,
  balanceError = false,
  onLogin,
  onSignup,
  onMenu,
  onHome,
  onDeposit,
  onWithdrawal,
  onRefreshBalance,
}) {
  const hasBalance =
    balance !== null &&
    balance !== undefined &&
    Number.isFinite(Number(balance));

  const amount = hasBalance
    ? Number(balance).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;

  return (
    <div className="kl-fixed-header">
      <style>{STYLES}</style>

      <header className="kl-header">
        <button
          type="button"
          className="kl-brand"
          onClick={onHome}
          aria-label="Kreeda Lokam home"
        >
          <img
            src="/kreeda/kreeda-lokam-logo.png"
            alt="Kreeda Lokam · క్రీడా లోకం"
          />
        </button>

        {user ? (
          <>
            <button
              type="button"
              className="kl-small-wallet"
              onClick={onRefreshBalance}
              aria-label="Refresh wallet balance"
            >
              <span>WALLET</span>

              <strong>
                {hasBalance
                  ? `₹ ${amount}`
                  : balanceError
                    ? "Retry"
                    : "Loading…"}
              </strong>

              {balanceError && (
                <small>
                  {hasBalance
                    ? "Last balance · Retry"
                    : "Tap to retry"}
                </small>
              )}
            </button>

            <button
              type="button"
              className="kl-menu-icon"
              onClick={onMenu}
              aria-label="Open account menu"
            >
              ☰
            </button>
          </>
        ) : (
          <div className="kl-auth-actions">
            <button
              type="button"
              className="kl-button kl-outline"
              onClick={onLogin}
            >
              Log In
            </button>

            <button
              type="button"
              className="kl-button kl-gold"
              onClick={onSignup}
            >
              Sign Up
            </button>
          </div>
        )}
      </header>

      {user && (
        <div className="kl-money-actions">
          <button type="button" onClick={onDeposit}>
            Deposit
          </button>

          <button type="button" onClick={onWithdrawal}>
            Withdrawal
          </button>
        </div>
      )}
    </div>
  );
}

function ScrollingGameColumn({ columnIndex, onGame }) {
  const track = useRef(null);
  const group = useRef(null);
  const timer = useRef(null);
  const deadline = useRef(0);
  const selecting = useRef(false);
  const pointerTap = useRef(false);
  const pointerHeld = useRef(false);
  const keyboardFocus = useRef(false);

  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [height, setHeight] = useState(null);

  const games = GAME_LIST.map((game, index) => ({
    game,
    index,
  })).filter((item) => item.index % 4 === columnIndex);

  useEffect(() => {
    const element = group.current;

    if (!element) return undefined;

    const measure = () => {
      const next =
        element.getBoundingClientRect().height - 8;

      if (next > 0) setHeight(next);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);

      return () =>
        window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  function resume() {
    if (
      pointerHeld.current ||
      keyboardFocus.current
    ) {
      return;
    }

    const remaining = deadline.current - Date.now();

    window.clearTimeout(timer.current);

    if (remaining > 0) {
      timer.current = window.setTimeout(
        resume,
        remaining,
      );
      return;
    }

    if (track.current) {
      track.current.style.animationPlayState = "running";
    }

    setPaused(false);
    selecting.current = false;
  }

  function pause() {
    deadline.current = Date.now() + PAUSE_MS;

    if (track.current) {
      track.current.style.animationPlayState = "paused";
    }

    setPaused(true);
    setSeconds(5);

    window.clearTimeout(timer.current);

    timer.current = window.setTimeout(
      resume,
      PAUSE_MS,
    );
  }

  useEffect(() => {
    if (!paused) return undefined;

    const interval = window.setInterval(() => {
      setSeconds(
        Math.max(
          0,
          Math.ceil(
            (deadline.current - Date.now()) / 1000,
          ),
        ),
      );
    }, 200);

    return () => window.clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  return (
    <section
      className="kl-game-column"
      aria-label={`Game line ${columnIndex + 1}. Tap to pause, then choose a game.`}
      style={{
        height:
          height === null ? undefined : `${height}px`,
        "--kl-column-duration":
          `${[32, 40, 35, 44][columnIndex]}s`,
        "--kl-column-delay":
          `${[0, -6, -3, -9][columnIndex]}s`,
      }}
      onPointerDownCapture={(event) => {
        event.preventDefault();

        pointerTap.current = true;
        selecting.current =
          deadline.current > Date.now();

        pointerHeld.current = true;
        pause();
      }}
      onPointerUp={() => {
        pointerHeld.current = false;
        pause();
      }}
      onPointerCancel={() => {
        pointerHeld.current = false;
        pointerTap.current = false;
        pause();
      }}
      onKeyDownCapture={() => {
        pointerTap.current = false;
      }}
      onPointerLeave={() => {
        if (pointerHeld.current) {
          pointerHeld.current = false;
          pause();
        }
      }}
      onFocusCapture={(event) => {
        if (!event.target.matches(":focus-visible")) {
          return;
        }

        keyboardFocus.current = true;
        pause();

        if (track.current) {
          track.current.style.animationName = "none";
          track.current.style.transform =
            "translateY(0)";
        }
      }}
      onBlurCapture={(event) => {
        if (
          event.currentTarget.contains(
            event.relatedTarget,
          )
        ) {
          return;
        }

        if (
          keyboardFocus.current &&
          track.current
        ) {
          track.current.style.animationName = "";
          track.current.style.transform = "";
        }

        keyboardFocus.current = false;
        resume();
      }}
    >
      <div ref={track} className="kl-column-track">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            ref={copy === 0 ? group : undefined}
            className="kl-column-group"
            aria-hidden={copy === 1 ? true : undefined}
          >
            {games.map(
              ({
                game: [id, name, href],
                index,
              }) => (
                <button
                  key={id}
                  type="button"
                  className="kl-tile kl-column-card"
                  tabIndex={copy === 0 ? 0 : -1}
                  aria-label={`Open ${name}`}
                  onClick={(event) => {
                    const keyboardActivation =
                      event.detail === 0 &&
                      !pointerTap.current;

                    pointerTap.current = false;

                    const reducedMotion =
                      window.matchMedia?.(
                        "(prefers-reduced-motion: reduce)",
                      ).matches;

                    if (
                      keyboardActivation ||
                      selecting.current ||
                      reducedMotion
                    ) {
                      onGame(href);
                    } else {
                      pause();
                    }
                  }}
                >
                  <Artwork index={index} />
                </button>
              ),
            )}
          </div>
        ))}
      </div>

      {paused && (
        <span className="kl-pause-badge">
          {seconds > 0 ? `${seconds}s` : "Select"}
        </span>
      )}
    </section>
  );
}

export default function KreedaLobby(props) {
  const { user, onGame, onSupport } = props;

  const [bonus, setBonus] = useState(null);

  const labels = [
    "Welcome Bonus",
    "Promo Code Bonus",
    "Losing Bonus",
  ];

  return (
    <div className="kl-page">
      <KreedaHeader {...props} />

      <main className="kl-lobby">
        {!user && (
          <section
            className="kl-bonuses"
            aria-label="Bonus offers"
          >
            {labels.map((label, index) => (
              <button
                type="button"
                key={label}
                className="kl-bonus"
                onClick={() => setBonus(index)}
                aria-label={`${label} 10 percent`}
              >
                <Artwork index={index} bonus />
              </button>
            ))}
          </section>
        )}

        <div
          className="kl-scrolling-games"
          aria-label="Choose your game"
        >
          {Array.from(
            { length: 4 },
            (_, columnIndex) => (
              <ScrollingGameColumn
                key={columnIndex}
                columnIndex={columnIndex}
                onGame={onGame}
              />
            ),
          )}
        </div>

        <p className="kl-scroll-help kl-motion-help">
          ఒక లైన్‌ను టచ్ చేయండి → ఆ లైన్ 5 సెకండ్లు
          ఆగుతుంది → గేమ్‌ను మళ్లీ టచ్ చేయండి.
        </p>

        <button
          type="button"
          className="kl-support"
          onClick={onSupport}
        >
          <span className="kl-headset">♧</span>
          <span>24/7 CUSTOMER SUPPORT</span>
        </button>
      </main>

      {bonus !== null && (
        <div className="kl-modal-backdrop">
          <section
            className="kl-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bonus-title"
          >
            <button
              type="button"
              className="kl-close"
              onClick={() => setBonus(null)}
              aria-label="Close bonus information"
            >
              ×
            </button>

            <h2 id="bonus-title">
              {labels[bonus]} <b>10%</b>
            </h2>

            <p>
              {bonus === 0
                ? "Welcome offer for eligible new accounts."
                : bonus === 1
                  ? "Contact support for an eligible promo code."
                  : "Losing bonus eligibility is reviewed by the administrator."}
            </p>

            <p>
              Bonus is subject to administrator review.
              No bonus is credited automatically.
            </p>

            <button
              type="button"
              className="kl-button kl-gold"
              onClick={onSupport}
            >
              Contact support
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export function KreedaLogin({
  onLogin,
  onClose,
  onSignup,
  onSupport,
  notice = "",
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/auth/customer-login",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            loginId: identifier.trim(),
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.customer) {
        throw new Error(data.error || "Login failed.");
      }

      onLogin(
        {
          ...data.customer,
          isAuthenticated: true,
          isDemo: true,
        },
        remember,
      );
    } catch (err) {
      setError(
        err.message || "Login failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kl-page">
      <div className="kl-login-heading">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
        >
          ←
        </button>

        <img
          src="/kreeda/kreeda-lokam-logo.png"
          alt="Kreeda Lokam · క్రీడా లోకం"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <main className="kl-login-main">
        <section className="kl-login-card">
          <div className="kl-login-tabs">
            <button className="active" type="button">
              Log In
            </button>

            <button type="button" onClick={onSignup}>
              Sign Up
            </button>
          </div>

          <h1>Log In</h1>

          <form onSubmit={submit}>
            <label htmlFor="login-id">
              Login ID / Mobile Number
            </label>

            <input
              id="login-id"
              autoComplete="username"
              value={identifier}
              onChange={(event) =>
                setIdentifier(event.target.value)
              }
              required
            />

            <label htmlFor="password">Password</label>

            <div className="kl-password">
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

              <button
                type="button"
                aria-label={
                  show ? "Hide password" : "Show password"
                }
                onClick={() => setShow((value) => !value)}
              >
                ◉
              </button>
            </div>

            <div className="kl-login-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) =>
                    setRemember(event.target.checked)
                  }
                />{" "}
                Remember me
              </label>

              <button
                type="button"
                onClick={onSupport}
              >
                Forgot Password?
              </button>
            </div>

            {(error || notice) && (
              <p role="alert" className="kl-error">
                {error || notice}
              </p>
            )}

            <button
              type="submit"
              className="kl-button kl-gold kl-submit"
              disabled={busy}
            >
              {busy ? "Logging in…" : "Log In"}
            </button>
          </form>

          <p className="kl-new">
            New here?{" "}
            <button type="button" onClick={onSignup}>
              Sign Up
            </button>
          </p>
        </section>

        <button
          type="button"
          className="kl-support"
          onClick={onSupport}
        >
          ♧ &nbsp; 24/7 CUSTOMER SUPPORT
        </button>
      </main>
    </div>
  );
}
