import React, { useEffect, useState } from "react";

import KreedaLobby, {
  KreedaHeader,
  KreedaLogin,
} from "./components/KreedaLobby";

import AdminLoginPage from "./components/AdminLoginPage";
import AdminManagementShell from "./components/AdminManagementShell";
import NewAdminPortal from "./components/NewAdminPortal";
import ChangePasswordPage from "./components/ChangePasswordPage";
import GameControlPage from "./components/GameControlPage";

import RoulettePage from "./components/RoulettePage";
import AviatorXXPage from "./components/AviatorXXPage";
import CardGamesPage from "./components/CardGamesPage";
import ColorPredictionPage from "./components/ColorPredictionPage";
import AnimatedSuperOverPage from "./components/AnimatedSuperOverPage";

import DealOrNoDealPage from "./components/DealOrNoDealPage";
import DealOrNoDealControlPage from "./components/DealOrNoDealControlPage";

import InstantGamesPage from "./components/InstantGamesPage";
import DiceGamesPage from "./components/DiceGamesPage";
import SicBoPage from "./components/SicBoPage";
import ChickenRoadPage from "./components/ChickenRoadPage";
import TwistXPage from "./components/TwistXPage";

import DreamWheelPage from "./components/DreamWheelPage";
import DreamWheelControlPage from "./components/DreamWheelControlPage";

import DepositPage from "./components/DepositPage";
import WithdrawalPage from "./components/WithdrawalPage";
import BetHistoryPage from "./components/BetHistoryPage";
import AccountStatementPage from "./components/AccountStatementPage";

import "./kreeda.css";

const AUTH_KEY = "telugu_sports_auth_user";

function BoardPage({ game }) {
  return (
    <iframe
      className="kl-board-frame"
      title={game + " game"}
      src={
        "/kreeda-board/index.html?game=" +
        encodeURIComponent(game)
      }
    />
  );
}

const CUSTOMER_GAMES = {
  "/games/asta-chamma": {
    title: "ASTA CHAMMA",
    Page: BoardPage,
    game: "asta-chamma",
  },

  "/games/dadi": {
    title: "DADI",
    Page: BoardPage,
    game: "dadi",
  },

  "/games/chess": {
    title: "CHESS",
    Page: BoardPage,
    game: "chess",
  },

  "/games/ww-animation": {
    title: "WW ANIMATION",
    Page: BoardPage,
    game: "ww",
  },

  "/games/tsb-flight": {
    title: "AVIATOR XX",
    Page: AviatorXXPage,
  },

  "/games/aviator-xx": {
    title: "AVIATOR XX",
    Page: AviatorXXPage,
  },

  "/games/roulette": {
    title: "ROULETTE",
    Page: RoulettePage,
  },

  "/games/super-over": {
    title: "INSTANT SUPER OVER",
    Page: AnimatedSuperOverPage,
  },

  "/games/color-prediction": {
    title: "COLOR PREDICTION",
    Page: ColorPredictionPage,
  },

  "/games/dragon-tiger": {
    title: "DRAGON TIGER",
    Page: CardGamesPage,
    game: "dragon-tiger",
  },

  "/games/andar-bahar": {
    title: "ANDAR BAHAR",
    Page: CardGamesPage,
    game: "andar-bahar",
  },

  "/games/lucky-seven": {
    title: "LUCKY SEVEN",
    Page: CardGamesPage,
    game: "lucky-seven",
  },

  "/games/deal-or-no-deal": {
    title: "DEAL OR NO DEAL",
    Page: DealOrNoDealPage,
    description:
      "Random demo results are locked before betting opens.",
  },

  "/games/mini-roulette": {
    title: "MINI ROULETTE",
    Page: InstantGamesPage,
    game: "mini-roulette",
    description:
      "Single-player random demo. Demo coins only.",
  },

  "/games/keno-80": {
    title: "KENO 80",
    Page: InstantGamesPage,
    game: "keno-80",
    description:
      "Pick up to 10 numbers. Twenty numbers are drawn randomly. Demo coins only.",
  },

  "/games/lankesh": {
    title: "LANKESH",
    Page: DiceGamesPage,
    game: "lankesh",
    description:
      "Shared random demo rounds. Choose F1-F10. Demo coins only.",
  },

  "/games/jhandi-munda": {
    title: "JHANDI MUNDA",
    Page: DiceGamesPage,
    game: "jhandi-munda",
    description:
      "Six dice, six symbols and shared random demo rounds. Demo coins only.",
  },

  "/games/twist-x": {
    title: "TWIST X",
    Page: TwistXPage,
    description:
      "Random single-player demo with three progress rings. Each spin uses demo coins.",
  },

  "/games/extra-sic-bo": {
    title: "EXTRA SIC BO",
    Page: SicBoPage,
    description:
      "Three dice, shared random rounds and demo ExtraPay. Demo coins only.",
  },

  "/games/dream-wheel": {
    title: "DREAM WHEEL",
    Page: DreamWheelPage,
    description:
      "Controller-planned demo. The full spin plan is locked before betting opens. The robot is animated.",
  },

  "/games/chicken-road-cross": {
    title: "CHICKEN ROAD CROSS",
    Page: ChickenRoadPage,
    description:
      "Manual jumps with server-generated random outcomes. Waiting does not change the odds. Demo coins only.",
  },

  "/games/animated-super-over": {
    title: "INSTANT SUPER OVER",
    Page: AnimatedSuperOverPage,
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [login, setLogin] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [menu, setMenu] = useState(false);

  const [view, setView] = useState(() => {
    const next = sessionStorage.getItem("kl-menu-next");

    sessionStorage.removeItem("kl-menu-next");

    return [
      "deposit",
      "withdrawal",
      "history",
      "statement",
    ].includes(next)
      ? next
      : "home";
  });

  const [number, setNumber] = useState("");
  const [notice, setNotice] = useState("");

  const [admin, setAdmin] = useState(null);
  const [adminChecking, setAdminChecking] = useState(true);

  const path =
    location.pathname.replace(/\/+$/, "") || "/";

  const selected = CUSTOMER_GAMES[path];

  useEffect(() => {
    let active = true;

    const adminRoute = path === "/admin";

    const url = adminRoute
      ? "/api/auth/admin-session"
      : "/api/kl/session";

    fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();

        if (!active) return;

        if (adminRoute) {
          setAdmin(
            response.ok && !data.admin?.historyOnly
              ? data.admin
              : null
          );
        } else {
          const customer = response.ok
            ? data.customer
            : null;

          setUser(customer);

          if (customer) {
            sessionStorage.setItem(
              AUTH_KEY,
              JSON.stringify(customer)
            );
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setChecking(false);
          setAdminChecking(false);
        }
      });

    fetch("/api/public/settings", {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setNumber(
            String(data.whatsappNumber || "")
              .replace(/\D/g, "")
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [path]);

  function support() {
    if (!/^[1-9][0-9]{9,14}$/.test(number)) {
      setNotice(
        "Support number is unavailable. Please try again after it is configured in Admin Payment Settings."
      );

      return;
    }

    window.open(
      "https://wa.me/" +
        number +
        "?text=" +
        encodeURIComponent(
          "Hello, I would like help with my Kreeda Lokam account."
        ),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function onLogin(customer, remember = true) {
    const next = {
      ...customer,
      isAuthenticated: true,
      isDemo: true,
    };

    setUser(next);

    sessionStorage.setItem(
      AUTH_KEY,
      JSON.stringify(next)
    );

    if (remember) {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(next)
      );
    } else {
      localStorage.removeItem(AUTH_KEY);
    }

    setLogin(false);

    if (
      pendingPath &&
      !customer.mustChangePassword &&
      !customer.mustChangeWithdrawalPassword
    ) {
      location.assign(pendingPath);
    }
  }

  async function logout() {
    try {
      const response = await fetch(
        "/api/kl/logout",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: "{}",
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);

      setUser(null);
      setMenu(false);
      setView("home");

      if (path !== "/") {
        location.assign("/");
      }
    } catch {
      setNotice(
        "Logout could not be confirmed. Please reconnect and retry."
      );
    }
  }

  async function adminLogout() {
    await fetch("/api/auth/admin-logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});

    localStorage.removeItem(
      "telugu_sports_demo_admin"
    );

    setAdmin(null);
  }

  function openGame(href) {
    if (user) {
      location.assign(href);
    } else {
      setPendingPath(href);
      setLogin(true);
    }
  }

  const home = () => location.assign("/");

  function openAccountView(nextView) {
    setMenu(false);

    if (selected) {
      sessionStorage.setItem(
        "kl-menu-next",
        nextView
      );

      home();
    } else {
      setView(nextView);
    }
  }

  if (path === "/admin") {
    return adminChecking ? (
      <div className="kl-loading">
        Checking Admin session…
      </div>
    ) : admin?.isAuthenticated ? (
      <AdminManagementShell
        admin={admin}
        onLogout={adminLogout}
      />
    ) : (
      <AdminLoginPage
        onLogin={setAdmin}
        onBack={home}
      />
    );
  }

  if (path === "/new-admin") {
    return <NewAdminPortal />;
  }

  if (path === "/game-control") {
    return <GameControlPage />;
  }

  if (path === "/game-control/roulette") {
    return <RoulettePage controller />;
  }

  if (path === "/game-control/deal-or-no-deal") {
    return <DealOrNoDealControlPage />;
  }

  if (path === "/game-control/dream-wheel") {
    return (
      <DreamWheelControlPage onBack={home} />
    );
  }

  if (checking) {
    return (
      <div className="kl-loading">
        <img
          src="/kreeda/kreeda-lokam-logo.png"
          alt="Kreeda Lokam"
        />

        <span>Loading your arena…</span>
      </div>
    );
  }

  if (
    user &&
    (
      user.mustChangePassword ||
      user.mustChangeWithdrawalPassword
    )
  ) {
    return (
      <div className="kl-game-frame">
        <ChangePasswordPage
          user={user}
          onComplete={(customer) => {
            onLogin({
              ...user,
              ...customer,
              mustChangePassword: false,
              mustChangeWithdrawalPassword: false,
            });

            if (pendingPath) {
              location.assign(pendingPath);
            }
          }}
          onLogout={logout}
        />
      </div>
    );
  }

  if (login || (selected && !user)) {
    return (
      <KreedaLogin
        notice={notice}
        onLogin={onLogin}
        onClose={() => {
          setLogin(false);
          setPendingPath(null);

          if (path !== "/") {
            home();
          }
        }}
        onSignup={support}
        onSupport={support}
      />
    );
  }

  let content;

  if (selected) {
    const Game = selected.Page;

    content = (
      <div className="kl-game-frame">
        <Game
          game={selected.game}
          user={user}
          onBack={home}
          onLogout={logout}
          onDeposit={() => openAccountView("deposit")}
          onWithdrawal={() => openAccountView("withdrawal")}
        />
      </div>
    );
  } else if (user && view !== "home") {
    const Page = {
      deposit: DepositPage,
      withdrawal: WithdrawalPage,
      history: BetHistoryPage,
      statement: AccountStatementPage,
    }[view];

    content = (
      <div className="kl-game-frame">
        <Page
          user={user}
          onBack={() => setView("home")}
          onLogout={logout}
        />
      </div>
    );
  } else {
    content = (
      <KreedaLobby
        user={user}
        onLogin={() => setLogin(true)}
        onSignup={support}
        onGame={openGame}
        onMenu={() => setMenu(true)}
        onHome={home}
        onSupport={support}
      />
    );
  }

  return (
    <>
      {selected || view !== "home" ? (
        <KreedaHeader
          user={user}
          onLogin={() => setLogin(true)}
          onSignup={support}
          onMenu={() => setMenu(true)}
          onHome={home}
        />
      ) : null}

      {content}

      {menu && (
        <div className="kl-modal-backdrop">
          <section
            className="kl-dialog kl-account"
            role="dialog"
            aria-modal="true"
            aria-label="Account menu"
          >
            <button
              className="kl-close"
              onClick={() => setMenu(false)}
              aria-label="Close menu"
            >
              ×
            </button>

            <h2>
              {user?.name || user?.loginId}
            </h2>

            <p>
              Simulation balance · ₹
              {Number(
                user?.demoCoinBalance || 0
              ).toLocaleString("en-IN")}
            </p>

            {[
              ["home", "Games"],
              ["deposit", "Deposit requests"],
              ["withdrawal", "Withdrawal requests"],
              ["history", "Playing history"],
              ["statement", "Account statement"],
            ].map(([id, label]) => (
              <button
                key={id}
                className="kl-button kl-outline"
                onClick={() => {
                  setMenu(false);

                  if (selected) {
                    sessionStorage.setItem(
                      "kl-menu-next",
                      id
                    );

                    home();
                  } else {
                    setView(id);
                  }
                }}
              >
                {label}
              </button>
            ))}

            <button
              className="kl-button kl-outline"
              onClick={() => {
                setMenu(false);

                setNotice(
                  "Welcome Bonus 10%, Promo Code Bonus 10%, Losing Bonus 10%. Eligibility is reviewed by the administrator; contact support for details."
                );
              }}
            >
              Bonus / Promo information
            </button>

            <button
              className="kl-button kl-gold"
              onClick={support}
            >
              Customer support
            </button>

            <button
              className="kl-button kl-outline"
              onClick={logout}
            >
              Log Out
            </button>
          </section>
        </div>
      )}

      {notice && (
        <div className="kl-modal-backdrop">
          <section
            className="kl-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label="Notice"
          >
            <p>{notice}</p>

            <button
              className="kl-button kl-gold"
              onClick={() => setNotice("")}
            >
              OK
            </button>
          </section>
        </div>
      )}
    </>
  );
}
