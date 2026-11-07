import React, { useRef, useState } from "react";

export default function AdminLoginPage({
  onLogin,
  onBack,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const busy = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy.current) return;

    setError("");
    busy.current = true;
    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/admin-login",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to login."
        );
      }

      try {
        localStorage.setItem(
          "telugu_sports_demo_admin",
          JSON.stringify(data.admin)
        );
      } catch {
        // Authentication uses the server session cookie.
      }

      setPassword("");
      onLogin?.(data.admin);
    } catch (loginError) {
      setError(
        loginError.message || "Admin login failed."
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060b24] text-white">
      <header className="border-b border-[#f8d559]/40 bg-[#101530] px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-[#f8d559] px-3 py-2 text-xs font-bold text-[#f8d559]"
          >
            ‹ BACK
          </button>

          <div className="text-right">
            <p className="text-xs font-black tracking-wider text-[#f8d559]">
              KREEDA LOKAM
            </p>

            <h1 className="mt-1 text-sm font-bold">
              ADMIN PANEL
            </h1>
          </div>
        </div>
      </header>

      <main className="flex min-h-[80vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-7 text-center">
            <img
              src="/kreeda/kreeda-lokam-logo.png"
              alt="Kreeda Lokam · క్రీడా లోకం"
              className="mx-auto mb-6 w-full max-w-xs"
            />

            <h2 className="text-2xl font-black text-[#f8d559]">
              ADMIN LOGIN
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Management Panel
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#f8d559]/50 bg-[#0b1030] p-6 shadow-2xl"
          >
            <label
              htmlFor="admin-username"
              className="block text-sm font-bold text-slate-200"
            >
              ADMIN ID
            </label>

            <input
              id="admin-username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter Admin ID"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 h-12 w-full rounded-lg border border-[#9b833e] bg-[#080d27] px-3 text-base text-white outline-none focus:border-[#f8d559]"
            />

            <label
              htmlFor="admin-password"
              className="mt-5 block text-sm font-bold text-slate-200"
            >
              ADMIN PASSWORD
            </label>

            <input
              id="admin-password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter Admin Password"
              autoComplete="current-password"
              className="mt-2 h-12 w-full rounded-lg border border-[#9b833e] bg-[#080d27] px-3 text-base text-white outline-none focus:border-[#f8d559]"
            />

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3"
              >
                <p className="text-sm text-rose-200">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 h-12 w-full rounded-lg bg-gradient-to-r from-amber-200 to-amber-400 text-sm font-black text-[#080b1f] shadow-lg disabled:cursor-wait disabled:opacity-50"
            >
              {loading
                ? "CHECKING…"
                : "LOGIN TO ADMIN"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            Use the Admin credentials configured
            on your server. Customer and Game
            Controller credentials do not grant
            Admin access.
          </p>
        </div>
      </main>
    </div>
  );
}
