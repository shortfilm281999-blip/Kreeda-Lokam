import React, {
  useEffect,
  useRef,
  useState,
} from "react";

const EMPTY = {
  account: {
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
  },

  phonepe: {
    upiId: "",
    qrImage: "",
  },

  gpay: {
    upiId: "",
    qrImage: "",
  },

  paytm: {
    upiId: "",
    qrImage: "",
  },
};

const METHODS = {
  account: "BANK ACCOUNT",
  phonepe: "PHONEPE",
  gpay: "GOOGLE PAY",
  paytm: "PAYTM",
};

const FIELD =
  "mt-2 w-full rounded-lg border border-[#9b833e] bg-[#080d27] px-3 py-3 text-sm text-white outline-none focus:border-[#f8d559]";

async function settingsApi(
  method = "GET",
  settings,
  signal
) {
  const response = await fetch(
    "/api/admin/settings/payment",
    {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal,

      ...(settings
        ? {
            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              settings,
            }),
          }
        : {}),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to load or save payment settings."
    );
  }

  if (!data.settings?.account) {
    throw new Error(
      "Invalid settings response."
    );
  }

  return data.settings;
}

export default function AdminPaymentSettings({
  onBack,
}) {
  const [method, setMethod] = useState("account");
  const [settings, setSettings] = useState(EMPTY);

  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const alive = useRef(false);
  const pending = useRef(false);
  const reader = useRef(null);
  const request = useRef(null);

  async function load() {
    if (pending.current) return;

    request.current?.abort();

    const controller = new AbortController();
    request.current = controller;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const saved = await settingsApi(
        "GET",
        undefined,
        controller.signal
      );

      if (
        alive.current &&
        !controller.signal.aborted
      ) {
        setSettings(saved);
        setLoaded(true);
      }
    } catch (failure) {
      if (
        alive.current &&
        !controller.signal.aborted
      ) {
        setLoaded(false);
        setError(failure.message);
      }
    } finally {
      if (
        alive.current &&
        !controller.signal.aborted
      ) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    alive.current = true;

    void load();

    return () => {
      alive.current = false;
      request.current?.abort();
      reader.current?.abort();
    };
  }, []);

  function update(section, key, value) {
    setSettings((previous) => ({
      ...previous,

      [section]: {
        ...previous[section],
        [key]: value,
      },
    }));

    setMessage("");
    setError("");
  }

  function upload(file) {
    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Select a PNG, JPG or WEBP image."
      );

      return;
    }

    if (file.size > 350 * 1024) {
      setError(
        "QR image must be 350 KB or smaller."
      );

      return;
    }

    reader.current?.abort();

    const target = method;
    const fileReader = new FileReader();

    reader.current = fileReader;

    fileReader.onload = () => {
      if (!alive.current) return;

      update(
        target,
        "qrImage",
        String(fileReader.result)
      );

      setMessage(
        "QR selected. Press Save Payment Details to save it."
      );
    };

    fileReader.onerror = () => {
      if (alive.current) {
        setError(
          "Unable to read the QR image."
        );
      }
    };

    fileReader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();

    if (
      pending.current ||
      !loaded ||
      loading
    ) {
      return;
    }

    pending.current = true;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const saved = await settingsApi(
        "PUT",
        settings
      );

      if (alive.current) {
        setSettings(saved);

        setMessage(
          "Payment details saved on the server. Customers can see them on their Deposit page."
        );
      }
    } catch (failure) {
      if (alive.current) {
        setError(failure.message);
      }
    } finally {
      pending.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  }

  const disabled =
    loading || busy || !loaded;

  return (
    <div className="min-h-screen bg-[#060b24] text-white">
      <header className="border-b border-[#f8d559]/40 bg-[#101530] p-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="rounded-lg border border-[#f8d559]/50 px-3 py-2 text-xs font-bold"
          >
            ‹ BACK
          </button>

          <div className="text-right">
            <p className="text-xs font-bold text-[#f8d559]">
              KREEDA LOKAM
            </p>

            <h1 className="font-black">
              PAYMENT SETTINGS
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <p className="text-sm leading-6 text-slate-300">
          Configure the bank, UPI and QR details
          shown on the customer Deposit page.
          Saving here does not transfer money.
        </p>

        {loading && (
          <p
            role="status"
            className="text-[#f8d559]"
          >
            Loading saved settings…
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          >
            {error}

            {!loaded && (
              <button
                type="button"
                onClick={load}
                className="ml-3 underline"
              >
                RETRY
              </button>
            )}
          </div>
        )}

        {message && (
          <p
            role="status"
            className="rounded-lg border border-[#f8d559]/30 p-3 text-sm text-[#f8d559]"
          >
            {message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(METHODS).map(
            ([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                aria-pressed={method === id}
                onClick={() => setMethod(id)}
                className={
                  `rounded-lg border px-2 py-3 text-xs font-bold ${
                    method === id
                      ? "border-[#f8d559] bg-[#f8d559] text-[#080b1f]"
                      : "border-[#9b833e] bg-[#0b1030] text-white"
                  }`
                }
              >
                {label}
              </button>
            )
          )}
        </div>

        <form
          onSubmit={save}
          className="rounded-2xl border border-[#f8d559]/40 bg-[#0b1030] p-5"
        >
          <h2 className="mb-5 font-black text-[#f8d559]">
            {METHODS[method]} DETAILS
          </h2>

          <fieldset
            disabled={disabled}
            className="space-y-4 disabled:opacity-60"
          >
            {method === "account" ? (
              [
                [
                  "accountName",
                  "ACCOUNT HOLDER NAME",
                ],
                [
                  "bankName",
                  "BANK NAME",
                ],
                [
                  "accountNumber",
                  "ACCOUNT NUMBER",
                ],
                [
                  "ifsc",
                  "IFSC CODE",
                ],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="block text-xs font-bold"
                >
                  {label}

                  <input
                    className={FIELD}
                    value={settings.account[key]}
                    maxLength={
                      key === "accountNumber"
                        ? 40
                        : 120
                    }
                    inputMode={
                      key === "accountNumber"
                        ? "numeric"
                        : "text"
                    }
                    autoComplete="off"
                    onChange={(event) =>
                      update(
                        "account",
                        key,
                        key === "ifsc"
                          ? event.target.value.toUpperCase()
                          : event.target.value
                      )
                    }
                  />
                </label>
              ))
            ) : (
              <>
                <label className="block text-xs font-bold">
                  {METHODS[method]} UPI ID

                  <input
                    className={FIELD}
                    value={settings[method].upiId}
                    maxLength={320}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={(event) =>
                      update(
                        method,
                        "upiId",
                        event.target.value
                      )
                    }
                    placeholder="name@bank"
                  />
                </label>

                <label className="block text-xs font-bold">
                  UPLOAD QR IMAGE

                  <input
                    key={method}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="mt-2 block w-full text-sm"
                    onChange={(event) => {
                      upload(
                        event.target.files?.[0]
                      );

                      event.target.value = "";
                    }}
                  />
                </label>

                <p className="text-xs text-slate-400">
                  PNG, JPG or WEBP · maximum 350 KB.
                </p>

                {settings[method].qrImage && (
                  <div className="space-y-3">
                    <img
                      src={
                        settings[method].qrImage
                      }
                      alt={
                        `${METHODS[method]} QR preview`
                      }
                      className="mx-auto h-48 w-48 rounded-lg bg-white p-3 object-contain"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        reader.current?.abort();

                        update(
                          method,
                          "qrImage",
                          ""
                        );
                      }}
                      className="rounded-lg border border-rose-400/50 px-4 py-2 text-xs text-rose-200"
                    >
                      REMOVE QR
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-amber-200 to-amber-400 px-4 py-3 text-sm font-black text-[#080b1f]"
            >
              {busy
                ? "SAVING…"
                : "SAVE PAYMENT DETAILS"}
            </button>
          </fieldset>
        </form>

        <p className="text-center text-xs text-slate-400">
          Demo request configuration only.
          No payment is processed on this page.
        </p>
      </main>
    </div>
  );
}
