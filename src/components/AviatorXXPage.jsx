import React, { useEffect, useRef, useState } from 'react';
import {
  flightApi, useFlightState, flightRequestKey, notifyFlightWallet,
} from './flightClient';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;

export default function AviatorXXPage({
  user, onBack, onLogout, onDeposit, onWithdrawal,
}) {
  const { data, error, receivedAt, refresh } = useFlightState('/api/flight/state');
  const [stake, setStake] = useState('100');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const busyRef = useRef(false);
  const pendingRef = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setClock(Date.now()), 50);
    return () => { alive.current = false; clearInterval(timer); };
  }, []);

  const customerId = user?.id ?? user?.customerId ?? user?.customer_id;
  const wrongAccount = Boolean(data && (!customerId ||
    String(data.customerId) !== String(customerId)));
  const round = data?.round;
  const age = receivedAt ? Math.max(0, clock - receivedAt) : Infinity;
  const serverTime = Date.parse(data?.serverTime);
  const start = Date.parse(round?.startsAt);
  const serverNow = serverTime + age;
  const fresh = Boolean(data && !error && !wrongAccount && age < 3500 &&
    Number.isFinite(serverTime));
  const phase = !round ? 'WAITING' : round.phase === 'CRASHED' ? 'CRASHED' :
    !Number.isFinite(start) ? 'WAITING' : serverNow < start ? 'COUNTDOWN' : 'RUNNING';
  const growth = Number(data?.growthRate) > 0 ? Number(data.growthRate) : 0.085;
  const multiplier = phase === 'CRASHED' ? Number(round.crashMultiplier || 1) :
    phase === 'RUNNING' ? Math.floor(Math.exp(growth * Math.max(0,
      serverNow - start) / 1000) * 100) / 100 : 1;
  const bets = Array.isArray(data?.bets) ? data.bets : [];
  const currentBet = round && bets.find((bet) => String(bet.roundId) === String(round.id));
  const canCashout = currentBet?.status === 'PLACED' && phase === 'RUNNING';

  useEffect(() => {
    if (pendingRef.current && round?.id != null &&
      String(pendingRef.current.roundId) !== String(round.id) && !busyRef.current) {
      pendingRef.current = null;
      setMessage('Previous round ended. Check your history before placing another bet.');
    }
  }, [round?.id, busy]);

  async function act(cashout = false) {
    if (busyRef.current || !fresh || !round) return;
    if (cashout ? !canCashout : phase !== 'COUNTDOWN' || currentBet) return;
    busyRef.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (cashout) {
        const result = await flightApi(`/api/flight/bets/${encodeURIComponent(currentBet.id)}/cashout`, {});
        if (alive.current) setMessage(`Cashed out at ${Number(result.bet.cashoutMultiplier).toFixed(2)}×. Returned ${money(result.bet.payout)}.`);
      } else {
        const amount = Number(stake);
        if (!Number.isSafeInteger(amount) || amount < 10 || amount > 25000)
          throw new Error('Enter a whole amount from ₹10 to ₹25,000.');
        if (!pendingRef.current && amount > Number(data.balance))
          throw new Error('LOW BALANCE');
        const payload = pendingRef.current || {
          roundId: round.id, stake: amount, requestKey: flightRequestKey(),
        };
        pendingRef.current = payload;
        const result = await flightApi('/api/flight/bets', payload);
        pendingRef.current = null;
        if (alive.current) setMessage(`Bet saved. Balance: ${money(result.balance)}.`);
      }
      notifyFlightWallet();
    } catch (err) {
      if (alive.current) setMessage(err.message || 'Request failed. Please retry.');
    } finally {
      busyRef.current = false;
      if (alive.current) { setBusy(false); refresh(); }
    }
  }

  const button = 'rounded-xl border border-white/20 px-3 py-3 text-sm font-bold disabled:opacity-40';
  const panel = 'rounded-2xl border border-white/15 bg-black p-4';

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/15 bg-black p-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <button type="button" className={`${button} bg-[#087f5b]`}
            onClick={() => onDeposit ? onDeposit() : setMessage('Open Deposit from your account menu.')}>Deposit</button>
          <div className="text-center">
            <h1 className="text-lg font-black text-white">AVIATOR XX</h1>
            <p className="text-sm font-bold text-[#40d99a]">{fresh ? money(data.balance) : '₹ —'}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={`${button} bg-[#701b3e]`}
              onClick={() => onWithdrawal ? onWithdrawal() : setMessage('Open Withdrawal from your account menu.')}>Withdrawal</button>
            <button type="button" className={button} aria-label="Open menu"
              aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 p-3 sm:p-5">
        {menu && <aside className={`${panel} space-y-3`}>
          <h2 className="font-bold">Menu</h2>
          <details><summary className="cursor-pointer">Rules</summary>
            <p className="mt-2 text-sm text-white/70">Place a bet before takeoff. Cash out before the flight crashes. Minimum bet ₹10; maximum ₹25,000. The server confirms every result and payout.</p></details>
          <details><summary className="cursor-pointer">Bonus / Promo Code</summary>
            <p className="mt-2 text-sm text-white/70">Welcome Bonus 10% · Promo Code Bonus 10% · Losing Bonus 10%. Eligibility and credits are managed by your account settings.</p></details>
          <p className="text-sm text-white/70">24/7 Customer Support</p>
          {onBack && <button type="button" className={button} onClick={onBack}>← Home</button>}
          {onLogout && <button type="button" className={`${button} ml-2 bg-[#701b3e]`} onClick={onLogout}>Logout</button>}
        </aside>}

        {(error || wrongAccount) && <div role="alert" className={`${panel} bg-[#701b3e]`}>
          {wrongAccount ? 'Session mismatch. Log out and log in again.' : String(error)}
          <button type="button" className={`${button} ml-2`} onClick={refresh}>Retry</button>
        </div>}

        <div className="flex gap-2 overflow-x-auto py-1" aria-label="Recent rounds">
          {(Array.isArray(data?.history) ? data.history : []).map((item) =>
            <span key={item.id} className="shrink-0 rounded-full border border-white/20 bg-[#701b3e] px-3 py-1 text-xs font-bold">{Number(item.crashMultiplier).toFixed(2)}×</span>)}
        </div>

        <section className={`${panel} relative flex min-h-[330px] flex-col items-center justify-center overflow-hidden text-center`}>
          <p className="text-xs tracking-widest text-white/60">{round ? `ROUND #${round.id}` : 'AVIATOR XX'}</p>
          <p className={`z-10 my-6 text-5xl font-black sm:text-7xl ${phase === 'CRASHED' ? 'text-white' : 'text-[#40d99a]'}`}>
            {!fresh ? 'CONNECTING…' : phase === 'WAITING' ? 'WAITING' :
              phase === 'COUNTDOWN' ? Math.max(0, Math.ceil((start - serverNow) / 1000)) : `${multiplier.toFixed(2)}×`}
          </p>
          <p className="z-10 text-sm font-bold">{!fresh ? 'Waiting for server update' : phase === 'CRASHED' ? 'FLEW AWAY' :
            phase === 'COUNTDOWN' ? 'PLACE YOUR BET' : phase === 'RUNNING' ? 'FLIGHT RUNNING' : 'Waiting for next round'}</p>
          <div aria-hidden="true" className="mt-5 text-5xl text-[#40d99a] transition-transform duration-100"
            style={{ transform: phase === 'RUNNING' && fresh ? `translate(${Math.min(80, (multiplier - 1) * 12)}px, -${Math.min(40, (multiplier - 1) * 6)}px) rotate(-15deg)` : 'none' }}>✈</div>
          <p className="mt-4 text-xs text-white/60">{fresh ? 'Animation is an estimate. Server confirmation determines cash-out.' : 'Actions are paused until the connection is current.'}</p>
        </section>

        <section className={panel}>
          <label htmlFor="aviator-xx-stake" className="text-sm font-bold">Bet amount · ₹10–₹25,000</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input id="aviator-xx-stake" type="text" inputMode="numeric" value={stake}
              disabled={busy || Boolean(currentBet) || Boolean(pendingRef.current)}
              onChange={(event) => { if (/^\d*$/.test(event.target.value)) setStake(event.target.value); }}
              className="min-w-0 rounded-xl border border-white/25 bg-black px-4 py-3 text-xl font-bold disabled:opacity-40" />
            <button type="button" disabled={busy || !fresh || (!canCashout && (phase !== 'COUNTDOWN' || Boolean(currentBet)))}
              onClick={() => act(canCashout)} className={`${button} ${canCashout ? 'bg-[#701b3e]' : 'bg-[#087f5b]'}`}>
              {busy ? 'PROCESSING…' : canCashout ? `CASH OUT ≈ ${money(Math.floor(Number(currentBet.stake) * multiplier * 100) / 100)}` :
                currentBet ? 'BET RECORDED' : pendingRef.current ? 'RETRY SAME BET' : 'PLACE BET'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{[10, 100, 200, 500, 1000, 5000].map((amount) =>
            <button key={amount} type="button" className={button} disabled={busy || Boolean(currentBet) || Boolean(pendingRef.current)}
              onClick={() => setStake(String(amount))}>₹{amount}</button>)}</div>
          {currentBet && <p className="mt-3 text-sm">This round: {money(currentBet.stake)} · {currentBet.status}</p>}
          {message && <p role="status" className="mt-3 rounded-xl border border-white/15 p-3 text-sm">{message}</p>}
        </section>

        <section className={`${panel} overflow-x-auto`}>
          <h2 className="font-bold">My Bets</h2>
          <table className="mt-3 w-full text-left text-xs">
            <thead><tr className="text-white/60"><th className="py-2">Round</th><th>Amount</th><th>Result</th><th>Returned</th></tr></thead>
            <tbody>{bets.map((bet) => <tr key={bet.id} className="border-t border-white/15">
              <td className="py-3">#{bet.roundId}</td><td>{money(bet.stake)}</td>
              <td>{bet.status}{bet.cashoutMultiplier ? ` · ${Number(bet.cashoutMultiplier).toFixed(2)}×` : ''}</td>
              <td>{money(bet.payout)}</td></tr>)}</tbody>
          </table>
          {!bets.length && <p className="py-3 text-sm text-white/60">No bets yet.</p>}
        </section>
      </main>
    </div>
  );
}
