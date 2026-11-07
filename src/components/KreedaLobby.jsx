import React, { useState } from "react";

export const GAME_LIST = [
  ["aviator", "AVIATOR", "/games/tsb-flight"],
  ["roulette", "ROULETTE", "/games/roulette"],
  ["super-over", "SUPER OVER", "/games/super-over"],
  [
    "color-prediction",
    "COLOR PREDICTION",
    "/games/color-prediction",
  ],
  ["dragon-tiger", "DRAGON TIGER", "/games/dragon-tiger"],
  ["andar-bahar", "ANDAR BAHAR", "/games/andar-bahar"],
  ["lucky-seven", "LUCKY SEVEN", "/games/lucky-seven"],
  [
    "deal-or-no-deal",
    "DEAL OR NO DEAL",
    "/games/deal-or-no-deal",
  ],
  ["twist-x", "TWIST X", "/games/twist-x"],
  ["lankesh", "LANKESH", "/games/lankesh"],
  ["jhandi-munda", "JHANDI MUNDA", "/games/jhandi-munda"],
  ["extra-sic-bo", "EXTRA SIC BO", "/games/extra-sic-bo"],
  ["dream-wheel", "DREAM WHEEL", "/games/dream-wheel"],
  [
    "chicken-road-cross",
    "CHICKEN ROAD CROSS",
    "/games/chicken-road-cross",
  ],
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
  onLogin,
  onSignup,
  onMenu,
  onHome,
}) {
  return (
    <header className="kl-header">
      <button
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
        <button
          className="kl-menu-icon"
          onClick={onMenu}
          aria-label="Open account menu"
        >
          ☰
        </button>
      ) : (
        <div className="kl-auth-actions">
          <button
            className="kl-button kl-outline"
            onClick={onLogin}
          >
            Log In
          </button>

          <button
            className="kl-button kl-gold"
            onClick={onSignup}
          >
            Sign Up
          </button>
        </div>
      )}
    </header>
  );
}

export default function KreedaLobby({
  user,
  onLogin,
  onSignup,
  onGame,
  onMenu,
  onHome,
  onSupport,
}) {
  const [bonus, setBonus] = useState(null);

  const labels = [
    "Welcome Bonus",
    "Promo Code Bonus",
    "Losing Bonus",
  ];

  return (
    <div className="kl-page">
      <KreedaHeader
        user={user}
        onLogin={onLogin}
        onSignup={onSignup}
        onMenu={onMenu}
        onHome={onHome}
      />

      <main className="kl-lobby">
        {!user && (
          <section
            className="kl-bonuses"
            aria-label="Bonus offers"
          >
            {labels.map((label, index) => (
              <button
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

        <section
          className="kl-games"
          aria-label="Choose your game"
        >
          {GAME_LIST.map(([id, name, href], index) => (
            <button
              key={id}
              className="kl-tile"
              onClick={() => onGame(href)}
              aria-label={`Open ${name}`}
            >
              <Artwork index={index} />
            </button>
          ))}
        </section>

        <button
          className="kl-support"
          onClick={onSupport}
        >
          <span className="kl-headset">♧</span>
          <span>24/7 CUSTOMER SUPPORT</span>
        </button>
      </main>

      {bonus !== null && (
        <div
          className="kl-modal-backdrop"
          role="presentation"
        >
          <section
            className="kl-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bonus-title"
          >
            <button
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Login failed."
        );
      }

      const customer = {
        ...data.customer,
        isAuthenticated: true,
        isDemo: true,
      };

      onLogin(customer, remember);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kl-page">
      <div className="kl-login-heading">
        <button
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
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <main className="kl-login-main">
        <section className="kl-login-card">
          <div className="kl-login-tabs">
            <button
              className="active"
              type="button"
            >
              Log In
            </button>

            <button
              type="button"
              onClick={onSignup}
            >
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

            <label htmlFor="password">
              Password
            </label>

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
                  show
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() => setShow(!show)}
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
                />
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
              <p
                role="alert"
                className="kl-error"
              >
                {error || notice}
              </p>
            )}

            <button
              className="kl-button kl-gold kl-submit"
              disabled={busy}
            >
              {busy ? "Logging in…" : "Log In"}
            </button>
          </form>

          <p className="kl-new">
            New here?{" "}
            <button onClick={onSignup}>
              Sign Up
            </button>
          </p>
        </section>

        <button
          className="kl-support"
          onClick={onSupport}
        >
          ♧ &nbsp; 24/7 CUSTOMER SUPPORT
        </button>
      </main>
    </div>
  );
}
