import React, { useEffect, useRef, useState } from 'react';
import { flightApi, useFlightState } from './flightClient';

const title = mode => Number(mode) === 0
  ? 'Random'
  : `Admin Control ${String(mode).padStart(2, '0')}`;

const validValue = value =>
  /^\d{1,4}(\.\d{1,2})?$/.test(String(value).trim()) &&
  Number(value) >= 1 &&
  Number(value) <= 1000;

const copySettings = settings => ({
  version: Number(settings.version),
  mode: Number(settings.mode),
  plans: settings.plans.map(
    plan => plan.map(value => Number(value).toFixed(2)),
  ),
});

export default function GameControlPage() {
  const {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  } = useFlightState('/api/game-control/state');

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const pending = useRef(false);
  const loggedIn = Boolean(data && !unauthorized);

  async function authenticate(event) {
    event.preventDefault();

    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setMessage('');

    try {
      await flightApi('/api/game-control/login', {
        id: id.trim(),
        password,
        game: 'AVIATOR',
      });

      setPassword('');
      await refresh();
    } catch (err) {
      setPassword('');
      setMessage(err.message || 'Login failed.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function logout() {
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setMessage('');

    try {
      await flightApi('/api/game-control/logout', {});
      window.location.assign('/game-control');
    } catch (err) {
      setMessage(
        err.message || 'Logout failed. Please retry.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="sf-control">
      <style>{CSS}</style>

      <header className="sf-header">
        <div>
          <h1>SUPER FAST AVIATOR</h1>
          <p>Controller panel</p>
        </div>

        {loggedIn ? (
          <button
            type="button"
            className="sf-button"
            disabled={busy}
            onClick={logout}
          >
            Logout
          </button>
        ) : (
          <a href="/">Customer home →</a>
        )}
      </header>

      <main className="sf-main">
        {message && (
          <p role="status" className="sf-notice">
            {message}
          </p>
        )}

        {!loggedIn ? (
          <form
            className="sf-panel sf-login"
            onSubmit={authenticate}
          >
            <h2>Game Controller Login</h2>

            <label>
              Controller ID

              <input
                required
                autoComplete="username"
                value={id}
                disabled={busy}
                onChange={event =>
                  setId(event.target.value)
                }
              />
            </label>

            <label>
              Password

              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={busy}
                onChange={event =>
                  setPassword(event.target.value)
                }
              />
            </label>

            <button
              className="sf-button sf-green"
              disabled={busy}
              type="submit"
            >
              {busy ? 'CHECKING…' : 'LOGIN'}
            </button>

            {error && !unauthorized && (
              <p role="alert">{String(error)}</p>
            )}
          </form>
        ) : data.mustChangePassword ? (
          <ControllerPasswordChange
            onComplete={refresh}
          />
        ) : (
          <FlightPlans
            key={String(data.controllerId)}
            data={data}
            error={error}
            receivedAt={receivedAt}
            refresh={refresh}
            accountBusy={busy}
          />
        )}
      </main>
    </div>
  );
}

function FlightPlans({
  data,
  error,
  receivedAt,
  refresh,
  accountBusy,
}) {
  const settings = data?.settings;

  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [clock, setClock] = useState(Date.now());

  const pending = useRef(false);
  const alive = useRef(false);

  useEffect(() => {
    alive.current = true;

    const timer = setInterval(
      () => setClock(Date.now()),
      500,
    );

    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!settings || dirty || saving) return;

    setDraft(current =>
      !current ||
      Number(settings.version) > current.version
        ? copySettings(settings)
        : current,
    );
  }, [settings, dirty, saving]);

  const fresh = Boolean(
    data &&
    !error &&
    receivedAt &&
    clock - receivedAt < 3500,
  );

  const conflict = Boolean(
    draft &&
    settings &&
    Number(settings.version) > draft.version,
  );

  const locked =
    saving ||
    accountBusy ||
    !fresh ||
    !draft;

  const round = data?.round;

  function editMode(mode) {
    setDraft(current => ({
      ...current,
      mode,
    }));

    setDirty(true);
    setMessage('');
  }

  function editValue(plan, slot, value) {
    setDraft(current => ({
      ...current,

      plans: current.plans.map((values, index) =>
        index === plan
          ? values.map((item, i) =>
              i === slot ? value : item,
            )
          : values,
      ),
    }));

    setDirty(true);
    setMessage('');
  }

  function reloadSaved() {
    if (!settings || pending.current) return;

    setDraft(copySettings(settings));
    setDirty(false);

    setMessage(
      'Saved settings loaded. Unsaved edits were cleared.',
    );
  }

  async function save(event) {
    event.preventDefault();

    if (
      pending.current ||
      locked ||
      conflict
    ) {
      return;
    }

    for (let p = 0; p < 4; p++) {
      for (let i = 0; i < 50; i++) {
        if (!validValue(draft.plans[p][i])) {
          setMessage(
            `${title(p + 1)}, box ${i + 1}: enter 1.00–1000.00, up to two decimals.`,
          );

          return;
        }
      }
    }

    pending.current = true;

    setSaving(true);
    setMessage('');

    try {
      const result = await flightApi(
        '/api/game-control/flight/settings',
        {
          version: draft.version,
          mode: draft.mode,

          plans: draft.plans.map(
            plan => plan.map(
              value => String(value).trim(),
            ),
          ),
        },
      );

      if (alive.current) {
        setDraft(copySettings(result.settings));
        setDirty(false);

        setMessage(
          'Saved. The next round uses these settings. The current round stays locked.',
        );
      }
    } catch (err) {
      if (alive.current) {
        setMessage(
          err.status === 409
            ? 'Settings changed on the server. Review them and press LOAD SAVED SETTINGS before editing again.'
            : `${err.message || 'Save could not be confirmed.'} Refresh state and check saved settings before retrying.`,
        );
      }
    } finally {
      pending.current = false;

      if (alive.current) {
        setSaving(false);
        void refresh();
      }
    }
  }

  return (
    <>
      <section className="sf-panel">
        <p>
          Signed in:{' '}
          <strong>
            {data.controllerName || data.controllerId}
          </strong>
        </p>

        <div className="sf-row">
          <strong>
            {!fresh
              ? 'RECONNECTING…'
              : round
                ? `ROUND #${round.id} · ${round.phase}`
                : 'WAITING'}
          </strong>

          <button
            type="button"
            className="sf-button"
            disabled={saving}
            onClick={() => refresh()}
          >
            Refresh state
          </button>

          <a
            href="/games/tsb-flight"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open customer game ↗
          </a>
        </div>

        <p>
          Current round mode:{' '}
          {round?.mode || '—'}

          {round?.planSlot
            ? ` · Box ${round.planSlot}/50`
            : ''}
        </p>

        {data.lockedMultiplier != null && (
          <p>
            Locked crash:{' '}
            <strong>
              {Number(
                data.lockedMultiplier,
              ).toFixed(2)}×
            </strong>
          </p>
        )}

        {settings && (
          <p>
            Saved mode for next round:{' '}
            <strong>{title(settings.mode)}</strong>
          </p>
        )}

        <p className="sf-muted">
          Shared demo rounds run automatically.
          Mode and value changes apply to the next round.
        </p>
      </section>

      {error && (
        <p role="alert" className="sf-notice">
          {String(error)}
        </p>
      )}

      {!settings && (
        <p className="sf-notice">
          Flight settings unavailable. Install the new
          flightRoutes.js backend and refresh.
        </p>
      )}

      {draft && (
        <form onSubmit={save}>
          <section className="sf-panel">
            <h2>Run mode</h2>

            <div className="sf-modes">
              {[0, 1, 2, 3, 4].map(mode => (
                <button
                  type="button"
                  key={mode}
                  className="sf-button"
                  aria-pressed={draft.mode === mode}
                  disabled={locked}
                  onClick={() => editMode(mode)}
                >
                  {title(mode)}
                </button>
              ))}
            </div>

            <p className="sf-muted">
              Select a mode and press SAVE SETTINGS.
              Random chooses a server-generated result
              each round.
            </p>
          </section>

          {draft.plans.map((plan, p) => (
            <section
              className="sf-panel"
              key={p}
              aria-label={title(p + 1)}
            >
              <div className="sf-row">
                <h2>{title(p + 1)}</h2>

                <span>
                  50 boxes · Next saved position:{' '}
                  {settings?.nextSlots?.[p] || 1}/50
                </span>

                {draft.mode === p + 1 && (
                  <strong className="sf-badge">
                    SELECTED
                  </strong>
                )}
              </div>

              <div className="sf-boxes">
                {plan.map((value, i) => (
                  <label
                    key={i}
                    className={
                      settings?.nextSlots?.[p] === i + 1
                        ? 'sf-box sf-next'
                        : 'sf-box'
                    }
                  >
                    <span>
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={value}
                      disabled={locked}
                      aria-label={
                        `${title(p + 1)} box ${i + 1} multiplier`
                      }
                      aria-invalid={!validValue(value)}
                      onChange={event =>
                        editValue(
                          p,
                          i,
                          event.target.value,
                        )
                      }
                    />

                    <small>×</small>
                  </label>
                ))}
              </div>

              <p className="sf-muted">
                Runs from box 01 to 50, then repeats.
                Switching away preserves this plan’s
                next position.
              </p>
            </section>
          ))}

          <section className="sf-panel sf-save">
            {conflict && (
              <p role="alert">
                Newer settings were saved on the server.
                Your edits are kept here; load saved
                settings to continue.
              </p>
            )}

            <p>
              {dirty
                ? 'You have unsaved changes.'
                : 'Showing saved settings.'}
            </p>

            <div className="sf-row">
              <button
                type="submit"
                className="sf-button sf-green"
                disabled={
                  locked ||
                  conflict ||
                  !dirty
                }
              >
                {saving
                  ? 'SAVING…'
                  : 'SAVE SETTINGS'}
              </button>

              <button
                type="button"
                className="sf-button sf-wine"
                disabled={
                  saving ||
                  !fresh ||
                  accountBusy
                }
                onClick={reloadSaved}
              >
                LOAD SAVED SETTINGS
              </button>
            </div>

            <p className="sf-muted">
              Load Saved Settings clears unsaved edits.
              Saving keeps all four plan positions.
            </p>

            {message && (
              <p
                role="status"
                className="sf-notice"
              >
                {message}
              </p>
            )}
          </section>
        </form>
      )}

      <section className="sf-panel sf-scroll">
        <h2>Flight result history</h2>

        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>Crash</th>
              <th>Mode</th>
              <th>Started (IST)</th>
            </tr>
          </thead>

          <tbody>
            {(data.history || []).map(item => (
              <tr key={item.id}>
                <td>#{item.id}</td>

                <td>
                  {Number(
                    item.crashMultiplier,
                  ).toFixed(2)}×
                </td>

                <td>
                  {item.mode}
                  {item.planSlot
                    ? ` · ${item.planSlot}/50`
                    : ''}
                </td>

                <td>
                  {new Date(
                    item.startsAt,
                  ).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function ControllerPasswordChange({
  onComplete,
}) {
  const [currentPassword, setCurrentPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = useRef(false);

  async function submit(event) {
    event.preventDefault();

    if (pending.current) return;

    if (
      newPassword.length < 12 ||
      new TextEncoder().encode(newPassword).length > 72 ||
      newPassword !== confirmPassword ||
      newPassword === currentPassword
    ) {
      setError(
        'Use a different password: at least 12 characters, at most 72 UTF-8 bytes, and matching confirmation.',
      );

      return;
    }

    pending.current = true;
    setBusy(true);
    setError('');

    try {
      await flightApi(
        '/api/game-control/change-password',
        {
          currentPassword,
          newPassword,
          confirmPassword,
        },
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      await onComplete?.();
    } catch (err) {
      setError(
        err.message || 'Password change failed.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="sf-control">
      <style>{CSS}</style>

      <form
        className="sf-panel sf-login"
        onSubmit={submit}
      >
        <h2>Change Temporary Password</h2>

        {[
          [
            'Current Temporary Password',
            currentPassword,
            setCurrentPassword,
            'current-password',
          ],
          [
            'New Password',
            newPassword,
            setNewPassword,
            'new-password',
          ],
          [
            'Confirm New Password',
            confirmPassword,
            setConfirmPassword,
            'new-password',
          ],
        ].map(
          ([label, value, setValue, autocomplete]) => (
            <label key={label}>
              {label}

              <input
                required
                type="password"
                autoComplete={autocomplete}
                disabled={busy}
                value={value}
                onChange={event =>
                  setValue(event.target.value)
                }
              />
            </label>
          ),
        )}

        <p className="sf-muted">
          Minimum 12 characters;
          maximum 72 UTF-8 bytes.
        </p>

        {error && (
          <p role="alert" className="sf-notice">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="sf-button sf-green"
          disabled={busy}
        >
          {busy
            ? 'SAVING…'
            : 'SAVE PASSWORD & CONTINUE'}
        </button>
      </form>
    </div>
  );
}

const CSS = `
  .sf-control {
    background:#000;
    color:#fff;
    font:14px Arial,sans-serif;
    min-height:100vh;
  }

  .sf-control * {
    box-sizing:border-box;
  }

  .sf-control a {
    color:#fff;
    text-decoration:underline;
  }

  .sf-control button,
  .sf-control input {
    font:inherit;
  }

  .sf-header {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    padding:18px;
    border-bottom:1px solid #ffffff30;
  }

  .sf-header h1 {
    font-size:20px;
    margin:0;
  }

  .sf-header p {
    margin:6px 0 0;
  }

  .sf-main {
    max-width:1100px;
    margin:auto;
    padding:14px;
  }

  .sf-panel {
    border:1px solid #ffffff40;
    border-radius:14px;
    padding:16px;
    margin:0 0 16px;
    background:#000;
  }

  .sf-panel h2 {
    margin:0 0 12px;
    font-size:18px;
  }

  .sf-row {
    display:flex;
    align-items:center;
    gap:12px;
    flex-wrap:wrap;
    margin:12px 0;
  }

  .sf-button {
    cursor:pointer;
    border:1px solid #ffffff60;
    background:#000;
    color:#fff;
    border-radius:9px;
    padding:12px 15px;
    font-weight:bold!important;
  }

  .sf-button[aria-pressed=true],
  .sf-green {
    background:#087f5b;
    border-color:#087f5b;
  }

  .sf-wine {
    background:#701b3e;
    border-color:#701b3e;
  }

  .sf-control button:disabled,
  .sf-control input:disabled {
    opacity:.45;
    cursor:default;
  }

  .sf-modes {
    display:flex;
    flex-wrap:wrap;
    gap:10px;
  }

  .sf-muted {
    color:#ffffffb3;
    line-height:1.7;
    font-size:12px;
  }

  .sf-login {
    max-width:460px;
    margin:35px auto;
  }

  .sf-login>label {
    display:block;
    margin:16px 0;
  }

  .sf-login input {
    display:block;
    width:100%;
    margin-top:8px;
    border:1px solid #ffffff60;
    background:#000;
    color:#fff;
    border-radius:8px;
    padding:12px;
  }

  .sf-notice {
    padding:12px;
    border:1px solid #ffffff50;
    background:#701b3e;
    color:#fff;
    border-radius:8px;
    line-height:1.7;
    overflow-wrap:anywhere;
  }

  .sf-boxes {
    display:grid;
    grid-template-columns:repeat(10,minmax(0,1fr));
    gap:8px;
  }

  .sf-box {
    min-width:0;
    border:1px solid #ffffff50;
    border-radius:9px;
    padding:7px;
    background:#000;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:5px;
  }

  .sf-box>span {
    font-size:11px;
    color:#ffffffb3;
  }

  .sf-box input {
    width:100%;
    min-width:0;
    text-align:center;
    background:#000;
    color:#fff;
    border:1px solid #ffffff40;
    border-radius:5px;
    padding:9px 1px;
    font-weight:bold;
  }

  .sf-box input[aria-invalid=true] {
    border:2px solid #fff;
    background:#701b3e;
  }

  .sf-next {
    border:2px solid #087f5b;
  }

  .sf-badge {
    background:#087f5b;
    color:#fff;
    padding:5px 8px;
    border-radius:6px;
    font-size:11px;
  }

  .sf-save {
    border-color:#087f5b;
  }

  .sf-scroll {
    overflow-x:auto;
  }

  .sf-control table {
    width:100%;
    border-collapse:collapse;
    font-size:12px;
    min-width:570px;
  }

  .sf-control th,
  .sf-control td {
    text-align:left;
    padding:12px 7px;
    border-bottom:1px solid #ffffff30;
  }

  .sf-control :focus-visible {
    outline:3px solid #fff;
    outline-offset:3px;
  }

  @media(max-width:700px) {
    .sf-boxes {
      grid-template-columns:repeat(5,minmax(0,1fr));
    }
  }

  @media(max-width:380px) {
    .sf-main {
      padding:8px;
    }

    .sf-panel {
      padding:11px;
    }

    .sf-boxes {
      gap:5px;
    }

    .sf-box {
      padding:4px;
    }

    .sf-header h1 {
      font-size:17px;
    }

    .sf-box input {
      font-size:12px;
    }
  }
`;
