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

const ACCOUNT_VIEWS = [
  "deposit",
  "withdrawal",
  "history",
  "statement",
];

function BoardPage({ game }) {
  return (
    <iframe
      className="kl-board-frame"
      title={`${game} game`}
      src={`/kreeda-board/index.html?game=${encodeURIComponent(game)}`}
    />
  );
}

const CUSTOMER_GAMES = {
  "/games/asta-chamma": {
    Page: BoardPage,
    game: "asta-chamma",
  },
  "/games/dadi": {
    Page: BoardPage,
    game: "dadi",
  },
  "/games/chess": {
    Page: BoardPage,
    game: "chess",
  },
  "/games/ww-animation": {
    Page: BoardPage,
    game: "ww",
  },
  "/games/tsb-flight": {
    Page: AviatorXXPage,
  },
  "/games/aviator": {
    Page: AviatorXXPage,
  },
  "/games/roulette": {
    Page: RoulettePage,
  },
  "/games/super-over": {
    Page: AnimatedSuperOverPage,
  },
  "/games/animated-super-over": {
    Page: AnimatedSuperOverPage,
  },
  "/games/color-prediction": {
    Page: ColorPredictionPage,
  },
  "/games/dragon-tiger": {
    Page: CardGamesPage,
    game: "dragon-tiger",
  },
  "/games/andar-bahar": {
    Page: CardGamesPage,
    game: "andar-bahar",
  },
  "/games/lucky-seven": {
    Page: CardGamesPage,
    game: "lucky-seven",
  },
  "/games/deal-or-no-deal": {
    Page: DealOrNoDealPage,
  },
  "/games/mini-roulette": {
    Page: InstantGamesPage,
    game: "mini-roulette",
  },
  "/games/keno-80": {
    Page: InstantGamesPage,
    game: "keno-80",
  },
  "/games/lankesh": {
    Page: DiceGamesPage,
    game: "lankesh",
  },
  "/games/jhandi-munda": {
    Page: DiceGamesPage,
    game: "jhandi-munda",
  },
  "/games/twist-x": {
    Page: TwistXPage,
  },
  "/games/extra-sic-bo": {
    Page: SicBoPage,
  },
  "/games/dream-wheel": {
    Page: DreamWheelPage,
  },
  "/games/chicken-road-cross": {
    Page: ChickenRoadPage,
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [login, setLogin] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [menu, setMenu] = useState(false);
  const [number, setNumber] = useState("");
  const [notice, setNotice] = useState("");
  const [admin, setAdmin] = useState(null);
  const [adminChecking, setAdminChecking] = useState(true);
  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState(false);
  const [balanceRefresh, setBalanceRefresh] = useState(0);

  const [view, setView] = useState(() => {
    const next = sessionStorage.getItem("kl-menu-next");
    sessionStorage.removeItem("kl-menu-next");

    return ACCOUNT_VIEWS.includes(next)
      ? next
      : "home";
  });

  const path =
    window.location.pathname.replace(/\/+$/, "") || "/";

  const selected = CUSTOMER_GAMES[path];

  const customerId =
    user?.id ??
    user?.customerId ??
    user?.customer_id;

  useEffect(() => {
    let active = true;

    const controller = new AbortController();
    const adminRoute = path === "/admin";

    fetch(
      adminRoute
        ? "/api/auth/admin-session"
        : "/api/kl/session",
      {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const data = await response.json();

        if (!active) return;

        if (adminRoute) {
          setAdmin(
            response.ok && !data.admin?.historyOnly
              ? data.admin
              : null,
          );
        } else {
          const customer = response.ok
            ? data.customer
            : null;

          setUser(customer);

          if (customer) {
            sessionStorage.setItem(
              AUTH_KEY,
              JSON.stringify(customer),
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
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setNumber(
            String(data.whatsappNumber || "")
              .replace(/\D/g, ""),
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      controller.abort();
    };
  }, [path]);

  useEffect(() => {
    setBalance(null);
    setBalanceError(false);
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;

    let active = true;
    let busy = false;

    const controller = new AbortController();

    async function refreshBalance() {
      if (
        !active ||
        busy ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      busy = true;

      try {
        const response = await fetch(
          `/api/customers/${encodeURIComponent(customerId)}/demo-balance`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (
          !response.ok ||
          data.balance == null ||
          !Number.isFinite(Number(data.balance))
        ) {
          throw new Error("Balance unavailable.");
        }

        if (active) {
          setBalance(Number(data.balance));
          setBalanceError(false);
        }
      } catch {
        if (active) setBalanceError(true);
      } finally {
        busy = false;
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshBalance();
      }
    };

    refreshBalance();

    const timer = window.setInterval(
      refreshBalance,
      15000,
    );

    window.addEventListener("focus", refreshBalance);
    window.addEventListener(
      "demo-balance-updated",
      refreshBalance,
    );
    window.addEventListener(
      "demo-bets-updated",
      refreshBalance,
    );

    document.addEventListener(
      "visibilitychange",
      onVisible,
    );

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);

      window.removeEventListener(
        "focus",
        refreshBalance,
      );
      window.removeEventListener(
        "demo-balance-updated",
        refreshBalance,
      );
      window.removeEventListener(
        "demo-bets-updated",
        refreshBalance,
      );

      document.removeEventListener(
        "visibilitychange",
        onVisible,
      );
    };
  }, [customerId, view, balanceRefresh]);

  function support() {
    if (!/^[1-9][0-9]{9,14}$/.test(number)) {
      setNotice(
        "Support number is unavailable. Please check Admin Payment Settings.",
      );
      return;
    }

    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(
        "Hello, I would like help with my Kreeda Lokam account.",
      )}`,
      "_blank",
      "noopener,noreferrer",
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
      JSON.stringify(next),
    );

    if (remember) {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(next),
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
      window.location.assign(pendingPath);
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/kl/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem("kl-menu-next");

      setUser(null);
      setBalance(null);
      setMenu(false);
      setView("home");
      setPendingPath(null);
      setLogin(false);

      if (path !== "/") {
        window.location.assign("/");
      }
    } catch {
      setMenu(false);
      setNotice(
        "Logout could not be confirmed. Please reconnect and retry.",
      );
    }
  }

  async function adminLogout() {
    await fetch("/api/auth/admin-logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});

    localStorage.removeItem(
      "telugu_sports_demo_admin",
    );

    setAdmin(null);
  }

  function home() {
    window.location.assign("/");
  }

  function openGame(href) {
    if (user) {
      window.location.assign(href);
    } else {
      setPendingPath(href);
      setLogin(true);
    }
  }

  function openView(next) {
    if (
      next !== "home" &&
      !ACCOUNT_VIEWS.includes(next)
    ) {
      return;
    }

    setMenu(false);

    if (!user) {
      setLogin(true);
      return;
    }

    if (selected) {
      sessionStorage.setItem("kl-menu-next", next);
      home();
    } else {
      setView(next);
      setBalanceRefresh((value) => value + 1);

      window.scrollTo({
        top: 0,
        behavior: "auto",
      });
    }
  }

  function showInformation(message) {
    setMenu(false);
    setNotice(message);
  }

  const headerProps = {
    user,
    balance,
    balanceError,
    onLogin: () => setLogin(true),
    onSignup: support,
    onMenu: () => setMenu(true),
    onHome: home,
    onDeposit: () => openView("deposit"),
    onWithdrawal: () => openView("withdrawal"),
    onRefreshBalance: () =>
      setBalanceRefresh((value) => value + 1),
  };

  if (path === "/admin") {
    if (adminChecking) {
      return (
        <div className="kl-loading">
          Checking Admin session…
        </div>
      );
    }

    return admin?.isAuthenticated ? (
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
              window.location.assign(pendingPath);
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

          if (path !== "/") home();
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
          onDeposit={() => openView("deposit")}
          onWithdrawal={() =>
            openView("withdrawal")
          }
        />
      </div>
    );
  } else if (
    user &&
    ACCOUNT_VIEWS.includes(view)
  ) {
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
          onBack={() => openView("home")}
          onLogout={logout}
        />
      </div>
    );
  } else {
    content = (
      <KreedaLobby
        {...headerProps}
        onGame={openGame}
        onSupport={support}
      />
    );
  }

  return (
    <>
      {selected || (user && view !== "home") ? (
        <KreedaHeader {...headerProps} />
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
              type="button"
              className="kl-close"
              onClick={() => setMenu(false)}
              aria-label="Close menu"
            >
              ×
            </button>

            <h2>
              {user?.name ||
                user?.loginId ||
                "My Account"}
            </h2>

            <button
              type="button"
              className="kl-button kl-outline"
              onClick={() => openView("home")}
            >
              Games
            </button>

            <button
              type="button"
              className="kl-button kl-outline"
              onClick={() =>
                showInformation(
                  "Each game has its own rules and limits. Read the rules shown inside that game before placing a selection. Contact Customer Support for account assistance.",
                )
              }
            >
              Rules
            </button>

            <button
              type="button"
              className="kl-button kl-outline"
              onClick={() =>
                showInformation(
                  "Welcome Bonus 10%, Promo Code Bonus 10%, Losing Bonus 10%. Eligibility is reviewed by the administrator. Contact support for details. Bonuses are not credited automatically.",
                )
              }
            >
              Bonus / Promo Code
            </button>

            <button
              type="button"
              className="kl-button kl-outline"
              onClick={() => openView("history")}
            >
              Playing History
            </button>

            <button
              type="button"
              className="kl-button kl-outline"
              onClick={() => openView("statement")}
            >
              Account Statement
            </button>

            <button
              type="button"
              className="kl-button kl-gold"
              onClick={() => {
                setMenu(false);
                support();
              }}
            >
              Customer Support
            </button>

            <button
              type="button"
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
              type="button"
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
