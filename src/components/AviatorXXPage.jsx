import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  flightApi,
  useFlightState,
} from './flightClient';

const money = value =>
  value == null || !Number.isFinite(Number(value))
    ? '₹ —'
    : `₹${Number(value).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

function readJobs(key) {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(key) || '{}',
    );

    return Object.fromEntries(
      Object.entries(saved).filter(([slot, job]) =>
        ['1', '2'].includes(slot) &&
        ['bet', 'cancel', 'cashout'].includes(
          job?.action,
        ) &&
        (
          job.action === 'bet'
            ? Number(job.body?.slot) === Number(slot) &&
              typeof job.body?.requestKey === 'string'
            : /^\d+$/.test(String(job.betId))
        ),
      ),
    );
  } catch {
    return {};
  }
}

function requestKey() {
  const bytes = new Uint8Array(20);

  window.crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    value => value.toString(16).padStart(2, '0'),
  ).join('');
}

export default function AviatorXXPage(props) {
  const id =
    props.user?.id ??
    props.user?.customerId ??
    props.user?.customer_id;

  if (!id) {
    return (
      <div
        style={{
          background: '#000',
          color: '#fff',
          padding: 24,
        }}
      >
        Customer login required.{' '}

        <button
          type="button"
          onClick={props.onBack}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <AviatorGame
      key={String(id)}
      {...props}
      customerId={id}
    />
  );
}

function AviatorGame({
  customerId,
  onBack,
  onLogout,
  onDeposit,
  onWithdrawal,
}) {
  const {
    data,
    error,
    receivedAt,
    refresh,
  } = useFlightState('/api/flight/state');

  const storageKey =
    `sf_aviator_actions_v2:${customerId}`;

  const [jobs, setJobs] = useState(
    () => readJobs(storageKey),
  );

  const jobsRef = useRef(jobs);

  const [stakes, setStakes] = useState({
    1: '100',
    2: '100',
  });

  const [busySlot, setBusySlot] = useState(null);
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [confirmed, setConfirmed] = useState({});

  const working = useRef(false);
  const alive = useRef(false);
  const walletRound = useRef(null);

  useEffect(() => {
    alive.current = true;

    const timer = setInterval(
      () => setClock(Date.now()),
      100,
    );

    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);

  const wrongAccount = Boolean(
    data &&
    String(data.customerId) !== String(customerId),
  );

  const age = receivedAt
    ? Math.max(0, clock - receivedAt)
    : Infinity;

  const serverTime = Date.parse(data?.serverTime);
  const serverNow = serverTime + age;

  const fresh = Boolean(
    data &&
    !error &&
    !wrongAccount &&
    age < 3500 &&
    Number.isFinite(serverTime),
  );

  const round = wrongAccount
    ? null
    : data?.round;

  const start = Date.parse(round?.startsAt);

  const phase =
    !round || !Number.isFinite(start)
      ? 'WAITING'
      : round.phase === 'CRASHED'
        ? 'CRASHED'
        : serverNow < start
          ? 'COUNTDOWN'
          : 'RUNNING';

  const growth =
    Number(data?.growthRate) > 0
      ? Number(data.growthRate)
      : 0.085;

  const multiplier =
    phase === 'CRASHED'
      ? Number(round.crashMultiplier || 1)
      : phase === 'RUNNING'
        ? Math.min(
            1000,
            Math.floor(
              Math.exp(
                growth *
                Math.max(0, serverNow - start) /
                1000,
              ) * 100,
            ) / 100,
          )
        : 1;

  const bets = wrongAccount
    ? []
    : Array.isArray(data?.bets)
      ? data.bets
      : [];

  const history = Array.isArray(data?.history)
    ? data.history
    : [];

  const balanceOK =
    data?.balance != null &&
    Number.isFinite(Number(data.balance));

  useEffect(() => {
    if (
      fresh &&
      round?.phase === 'CRASHED' &&
      walletRound.current !== String(round.id)
    ) {
      walletRound.current = String(round.id);

      window.dispatchEvent(
        new Event('demo-balance-updated'),
      );
    }
  }, [fresh, round?.id, round?.phase]);

  function currentBet(slot) {
    const rows = bets.filter(
      bet =>
        String(bet.roundId) === String(round?.id) &&
        Number(bet.slot || 1) === slot,
    );

    const latestConfirmed = confirmed[slot];

    const visible =
      rows.find(bet => bet.status !== 'CANCELLED') ||
      rows[0];

    if (
      latestConfirmed &&
      String(latestConfirmed.roundId) ===
        String(round?.id)
    ) {
      const polled = rows.find(
        bet =>
          String(bet.id) ===
          String(latestConfirmed.id),
      );

      // A response can arrive before the next polling snapshot.
      if (
        !polled ||
        (
          polled.status === 'PLACED' &&
          latestConfirmed.status !== 'PLACED'
        )
      ) {
        return latestConfirmed;
      }
    }

    return visible;
  }

  function storeJobs(value) {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(value),
    );

    jobsRef.current = value;

    if (alive.current) {
      setJobs(value);
    }
  }

  function clearJob(slot) {
    const next = { ...jobsRef.current };

    delete next[slot];

    // Old stored requests remain safe to replay.
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify(next),
      );
    } catch {}

    jobsRef.current = next;

    if (alive.current) {
      setJobs(next);
    }
  }

  async function act(slot, action) {
    if (working.current || !fresh) return;

    let job = jobsRef.current[slot];

    if (!job) {
      const bet = currentBet(slot);

      if (action === 'bet') {
        if (
          !round ||
          phase !== 'COUNTDOWN' ||
          (bet && bet.status !== 'CANCELLED')
        ) {
          return;
        }

        const stake = Number(stakes[slot]);

        if (
          !Number.isSafeInteger(stake) ||
          stake < 10 ||
          stake > 25000
        ) {
          setMessage(
            'Enter a whole amount from ₹10 to ₹25,000.',
          );

          return;
        }

        if (!balanceOK) {
          setMessage(
            'Wallet unavailable. Refresh and retry.',
          );

          return;
        }

        if (stake > Number(data.balance)) {
          setMessage('LOW BALANCE');
          return;
        }

        try {
          job = {
            action: 'bet',

            body: {
              roundId: round.id,
              slot,
              stake,
              requestKey: requestKey(),
            },
          };
        } catch {
          setMessage(
            'A secure HTTPS connection is required.',
          );

          return;
        }
      } else {
        if (
          bet?.status !== 'PLACED' ||
          (
            action === 'cancel'
              ? phase !== 'COUNTDOWN'
              : phase !== 'RUNNING'
          )
        ) {
          return;
        }

        job = {
          action,
          betId: String(bet.id),
        };
      }

      try {
        storeJobs({
          ...jobsRef.current,
          [slot]: job,
        });
      } catch {
        setMessage(
          'Enable browser session storage to recover interrupted actions.',
        );

        return;
      }
    }

    working.current = true;
    setBusySlot(slot);
    setMessage('');

    try {
      const result = await flightApi(
        job.action === 'bet'
          ? '/api/flight/bets'
          : `/api/flight/bets/${encodeURIComponent(
              job.betId,
            )}/${job.action}`,
        job.body || {},
      );

      clearJob(slot);

      if (alive.current) {
        setConfirmed(current => ({
          ...current,
          [slot]: result.bet,
        }));

        setMessage(
          job.action === 'bet'
            ? `Box ${slot}: bet confirmed.`
            : job.action === 'cancel'
              ? `Box ${slot}: cancelled. Returned ${money(result.bet.payout)}.`
              : `Box ${slot}: cashed out at ${Number(result.bet.cashoutMultiplier).toFixed(2)}×. Returned ${money(result.bet.payout)}.`,
        );
      }

      window.dispatchEvent(
        new Event('demo-balance-updated'),
      );
    } catch (err) {
      if (
        [400, 404, 409, 422].includes(err.status)
      ) {
        clearJob(slot);
      }

      if (alive.current) {
        setMessage(
          err.message ||
          'Connection interrupted. Use RETRY SAME ACTION.',
        );
      }
    } finally {
      working.current = false;

      if (alive.current) {
        setBusySlot(null);
        void refresh();
      }
    }
  }

  const progress = Math.min(
    1,
    Math.log(Math.max(1, multiplier)) / 3,
  );

  const x =
    phase === 'RUNNING'
      ? 50 + progress * 500
      : 50;

  const y =
    240 -
    (
      phase === 'RUNNING'
        ? progress * progress * 180
        : 0
    );

  const mode =
    round?.mode === 'RANDOM_DEMO'
      ? 'RANDOM'
      : round?.mode?.startsWith('ADMIN_CONTROL')
        ? 'ADMIN CONTROLLED'
        : 'SHARED ROUNDS';

  return (
    <div className="sfa-page">
      <style>{CSS}</style>

      <header className="sfa-header">
        <button
          type="button"
          className="sfa-btn sfa-green"
          onClick={() =>
            onDeposit
              ? onDeposit()
              : setMessage(
                  'Open Deposit from your account menu.',
                )
          }
        >
          Deposit
        </button>

        <div className="sfa-brand">
          <h1>SUPER FAST AVIATOR</h1>

          <strong>
            {fresh && balanceOK
              ? money(data.balance)
              : '₹ —'}
          </strong>
        </div>

        <button
          type="button"
          className="sfa-btn sfa-wine"
          onClick={() =>
            onWithdrawal
              ? onWithdrawal()
              : setMessage(
                  'Open Withdrawal from your account menu.',
                )
          }
        >
          Withdrawal
        </button>

        <button
          type="button"
          className="sfa-btn"
          aria-label="Open menu"
          aria-expanded={menu}
          onClick={() =>
            setMenu(value => !value)
          }
        >
          ☰
        </button>
      </header>

      <main className="sfa-main">
        {menu && (
          <aside className="sfa-card">
            <h2>Menu</h2>

            <details>
              <summary>Rules</summary>

              <p>
                Place a bet before takeoff.
                Cancel before takeoff or cash out
                while the flight runs.
                Each box accepts ₹10–₹25,000.
                Cash out must reach the server
                before the crash.
              </p>
            </details>

            <details>
              <summary>Bonus / Promo Code</summary>

              <p>
                Welcome Bonus 10% ·
                Promo Code Bonus 10% ·
                Losing Bonus 10%.
                Contact support for eligibility.
              </p>
            </details>

            <p>
              Minimum deposit ₹100 ·
              Minimum withdrawal ₹300
            </p>

            <p>24/7 Customer Support</p>

            <div className="sfa-row">
              {onBack && (
                <button
                  type="button"
                  className="sfa-btn"
                  onClick={onBack}
                >
                  ← Home
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  className="sfa-btn sfa-wine"
                  onClick={onLogout}
                >
                  Logout
                </button>
              )}
            </div>
          </aside>
        )}

        {(error || wrongAccount) && (
          <div
            role="alert"
            className="sfa-notice"
          >
            {wrongAccount
              ? 'Session mismatch. Log out and log in again.'
              : String(error)}

            <button
              type="button"
              className="sfa-btn"
              onClick={() => refresh()}
            >
              Refresh
            </button>
          </div>
        )}

        <div
          className="sfa-history"
          aria-label="Recent round results"
        >
          {history.map(item => (
            <span key={item.id}>
              {Number(
                item.crashMultiplier,
              ).toFixed(2)}×
            </span>
          ))}
        </div>

        <section className="sfa-stage sfa-card">
          <p className="sfa-mode">
            {mode} ·{' '}
            {round
              ? `ROUND #${round.id}`
              : 'WAITING'}
          </p>

          <div className="sfa-readout">
            <strong>
              {!fresh
                ? 'CONNECTING…'
                : phase === 'WAITING'
                  ? 'WAITING'
                  : phase === 'COUNTDOWN'
                    ? Math.max(
                        0,
                        Math.ceil(
                          (start - serverNow) / 1000,
                        ),
                      )
                    : `${multiplier.toFixed(2)}×`}
            </strong>

            <p>
              {!fresh
                ? 'Waiting for server update'
                : phase === 'CRASHED'
                  ? 'FLEW AWAY'
                  : phase === 'COUNTDOWN'
                    ? 'PLACE YOUR BET'
                    : phase === 'RUNNING'
                      ? 'FLIGHT RUNNING'
                      : 'Waiting for next round'}
            </p>
          </div>

          <svg
            viewBox="0 0 600 280"
            className="sfa-flight"
            aria-hidden="true"
          >
            <path
              d="M25 250 H575 M35 255 V30"
              fill="none"
              stroke="#ffffff40"
            />

            {phase === 'RUNNING' && fresh && (
              <>
                <path
                  d={
                    `M50 240 Q${
                      50 + (x - 50) / 2
                    } 240 ${x} ${y} ` +
                    `L${x} 250 L50 250 Z`
                  }
                  fill="#701b3e"
                  opacity=".7"
                />

                <path
                  d={
                    `M50 240 Q${
                      50 + (x - 50) / 2
                    } 240 ${x} ${y}`
                  }
                  fill="none"
                  stroke="#40d99a"
                  strokeWidth="4"
                />
              </>
            )}

            {phase !== 'CRASHED' && (
              <text
                x={fresh ? x : 50}
                y={fresh ? y : 240}
                fill="#40d99a"
                fontSize="38"
                textAnchor="middle"
              >
                ✈
              </text>
            )}
          </svg>

          <p className="sfa-caption">
            Animation is an estimate.
            Server confirmation determines the payout.
          </p>
        </section>

        {message && (
          <p role="status" className="sfa-notice">
            {message}
          </p>
        )}

        <div className="sfa-bet-grid">
          {[1, 2].map(slot => {
            const bet = currentBet(slot);
            const job = jobs[slot];

            const placed =
              bet?.status === 'PLACED';

            const canBet =
              phase === 'COUNTDOWN' &&
              (!bet || bet.status === 'CANCELLED');

            const action = job
              ? job.action
              : placed && phase === 'RUNNING'
                ? 'cashout'
                : placed && phase === 'COUNTDOWN'
                  ? 'cancel'
                  : 'bet';

            const allowed =
              job ||
              canBet ||
              (
                placed &&
                ['COUNTDOWN', 'RUNNING'].includes(phase)
              );

            const inputLocked =
              busySlot !== null ||
              Boolean(job) ||
              placed;

            return (
              <section
                key={slot}
                className="sfa-card"
              >
                <h2>BET {slot}</h2>

                <label htmlFor={`sfa-stake-${slot}`}>
                  Bet amount · ₹10–₹25,000
                </label>

                <input
                  id={`sfa-stake-${slot}`}
                  type="text"
                  inputMode="numeric"
                  value={stakes[slot]}
                  disabled={inputLocked}
                  onChange={event => {
                    const value = event.target.value;

                    if (/^\d*$/.test(value)) {
                      setStakes(current => ({
                        ...current,
                        [slot]: value,
                      }));
                    }
                  }}
                />

                <div className="sfa-row">
                  {[10, 100, 200, 500, 1000].map(
                    value => (
                      <button
                        key={value}
                        type="button"
                        className="sfa-btn"
                        disabled={inputLocked}
                        onClick={() =>
                          setStakes(current => ({
                            ...current,
                            [slot]: String(value),
                          }))
                        }
                      >
                        ₹{value}
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  className={
                    `sfa-btn sfa-action ${
                      action === 'bet'
                        ? 'sfa-green'
                        : 'sfa-wine'
                    }`
                  }
                  disabled={
                    busySlot !== null ||
                    !fresh ||
                    !allowed
                  }
                  onClick={() => act(slot, action)}
                >
                  {busySlot === slot
                    ? 'PROCESSING…'
                    : job
                      ? `RETRY SAME ${
                          job.action === 'bet'
                            ? 'BET'
                            : 'ACTION'
                        }`
                      : action === 'cashout'
                        ? `CASH OUT ≈ ${money(
                            Math.floor(
                              Number(bet.stake) *
                              multiplier,
                            ),
                          )}`
                        : action === 'cancel'
                          ? 'CANCEL BET'
                          : canBet
                            ? 'PLACE BET'
                            : 'WAIT FOR NEXT ROUND'}
                </button>

                {job && (
                  <p className="sfa-muted">
                    Recover this action before starting
                    another action in this box.
                  </p>
                )}

                {bet && (
                  <p>
                    This round: {money(bet.stake)}
                    {' · '}
                    {bet.status}
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <section className="sfa-card sfa-scroll">
          <h2>My Bets</h2>

          <table>
            <thead>
              <tr>
                <th>Round</th>
                <th>Box</th>
                <th>Amount</th>
                <th>Result</th>
                <th>Returned</th>
              </tr>
            </thead>

            <tbody>
              {bets.map(bet => (
                <tr key={bet.id}>
                  <td>#{bet.roundId}</td>
                  <td>{bet.slot || 1}</td>
                  <td>{money(bet.stake)}</td>

                  <td>
                    {bet.status}

                    {bet.cashoutMultiplier
                      ? ` · ${Number(
                          bet.cashoutMultiplier,
                        ).toFixed(2)}×`
                      : ''}
                  </td>

                  <td>{money(bet.payout)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!bets.length && (
            <p>No bets yet.</p>
          )}

          <p className="sfa-muted">
            Virtual balance. ₹ is the display symbol.
          </p>
        </section>
      </main>
    </div>
  );
}

const CSS = `
  .sfa-page {
    min-height:100vh;
    background:#000;
    color:#fff;
    font:14px Arial,sans-serif;
    padding-bottom:20px;
  }

  .sfa-page * {
    box-sizing:border-box;
  }

  .sfa-page button,
  .sfa-page input {
    font:inherit;
  }

  .sfa-header {
    display:flex;
    gap:9px;
    align-items:center;
    justify-content:center;
    position:sticky;
    top:0;
    z-index:10;
    padding:12px;
    background:#000;
    border-bottom:1px solid #ffffff35;
  }

  .sfa-brand {
    flex:1;
    text-align:center;
    max-width:480px;
  }

  .sfa-brand h1 {
    font-size:17px;
    margin:0 0 6px;
  }

  .sfa-brand strong {
    color:#40d99a;
  }

  .sfa-main {
    max-width:1000px;
    margin:auto;
    padding:14px;
  }

  .sfa-card {
    border:1px solid #ffffff40;
    background:#000;
    border-radius:14px;
    padding:16px;
    margin-bottom:16px;
  }

  .sfa-card h2 {
    font-size:16px;
    margin:0 0 14px;
  }

  .sfa-card p {
    line-height:1.6;
  }

  .sfa-card details {
    padding:10px 0;
  }

  .sfa-card summary {
    cursor:pointer;
  }

  .sfa-btn {
    cursor:pointer;
    color:#fff;
    background:#000;
    border:1px solid #ffffff50;
    border-radius:9px;
    padding:11px;
    font-weight:bold!important;
  }

  .sfa-green {
    background:#087f5b;
    border-color:#087f5b;
  }

  .sfa-wine {
    background:#701b3e;
    border-color:#701b3e;
  }

  .sfa-page button:disabled,
  .sfa-page input:disabled {
    opacity:.45;
    cursor:default;
  }

  .sfa-row {
    display:flex;
    gap:8px;
    flex-wrap:wrap;
    margin:12px 0;
  }

  .sfa-history {
    display:flex;
    gap:8px;
    overflow:auto;
    margin-bottom:14px;
  }

  .sfa-history span {
    flex-shrink:0;
    padding:7px 12px;
    border-radius:20px;
    background:#701b3e;
    font-weight:bold;
    font-size:12px;
  }

  .sfa-stage {
    position:relative;
    overflow:hidden;
    min-height:320px;
    padding:12px;
  }

  .sfa-mode {
    text-align:center;
    font-size:10px;
    color:#ffffffb3;
    letter-spacing:1px;
  }

  .sfa-readout {
    position:absolute;
    left:0;
    right:0;
    top:60px;
    text-align:center;
    z-index:1;
    pointer-events:none;
  }

  .sfa-readout strong {
    font-size:clamp(26px,7vw,64px);
    color:#40d99a;
  }

  .sfa-readout p {
    font-weight:bold;
    font-size:12px;
  }

  .sfa-flight {
    display:block;
    width:100%;
    height:280px;
  }

  .sfa-caption {
    text-align:center;
    font-size:10px;
    color:#ffffffb3;
    margin:0;
  }

  .sfa-bet-grid {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:14px;
  }

  .sfa-bet-grid input {
    display:block;
    width:100%;
    padding:14px;
    margin-top:10px;
    border:1px solid #ffffff60;
    border-radius:9px;
    background:#000;
    color:#fff;
    font-size:22px;
  }

  .sfa-action {
    width:100%;
    min-height:55px;
  }

  .sfa-notice {
    border:1px solid #ffffff40;
    background:#701b3e;
    padding:13px;
    border-radius:10px;
    line-height:1.7;
    margin:0 0 15px;
  }

  .sfa-notice button {
    margin-left:12px;
  }

  .sfa-muted {
    color:#ffffffb3;
    font-size:12px;
  }

  .sfa-scroll {
    overflow-x:auto;
  }

  .sfa-page table {
    width:100%;
    border-collapse:collapse;
    min-width:510px;
    font-size:12px;
  }

  .sfa-page th,
  .sfa-page td {
    text-align:left;
    border-bottom:1px solid #ffffff30;
    padding:12px 6px;
  }

  .sfa-page :focus-visible {
    outline:3px solid #fff;
    outline-offset:3px;
  }

  @media(max-width:650px) {
    .sfa-bet-grid {
      grid-template-columns:1fr;
    }

    .sfa-header {
      gap:5px;
      padding:9px 6px;
    }

    .sfa-header .sfa-btn {
      font-size:11px;
      padding:9px 7px;
    }

    .sfa-brand h1 {
      font-size:12px;
    }

    .sfa-main {
      padding:9px;
    }

    .sfa-card {
      padding:12px;
    }
  }
`;
