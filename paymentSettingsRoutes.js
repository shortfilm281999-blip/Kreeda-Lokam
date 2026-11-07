import {
  authenticatedCustomer,
} from "./boardGameRoutes.js";

const KEY = "kreeda_payment_settings";

const reject = (message) =>
  Object.assign(
    new Error(message),
    { status: 400 }
  );

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(
    fn(req, res, next)
  ).catch(next);

export const EMPTY_PAYMENT_SETTINGS = {
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

export function normalizePaymentSettings(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw reject(
      "Invalid payment settings."
    );
  }

  const out = structuredClone(
    EMPTY_PAYMENT_SETTINGS
  );

  function field(value, maxLength) {
    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    if (
      typeof value !== "string" ||
      value.length > maxLength
    ) {
      throw reject(
        "A payment field is too long or invalid."
      );
    }

    return value.trim();
  }

  for (const key of [
    "accountName",
    "bankName",
    "accountNumber",
    "ifsc",
  ]) {
    out.account[key] = field(
      value.account?.[key],
      key === "accountNumber" ? 40 : 120
    );
  }

  out.account.ifsc =
    out.account.ifsc.toUpperCase();

  if (
    out.account.accountNumber &&
    !/^\d{5,40}$/.test(
      out.account.accountNumber
    )
  ) {
    throw reject(
      "Account number must contain 5–40 digits."
    );
  }

  if (
    out.account.ifsc &&
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
      out.account.ifsc
    )
  ) {
    throw reject(
      "Enter a valid 11-character IFSC code."
    );
  }

  for (const method of [
    "phonepe",
    "gpay",
    "paytm",
  ]) {
    out[method].upiId = field(
      value[method]?.upiId,
      320
    );

    if (
      out[method].upiId &&
      !/^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(
        out[method].upiId
      )
    ) {
      throw reject(
        "Enter a valid UPI ID."
      );
    }

    const image = field(
      value[method]?.qrImage,
      480000
    );

    if (
      image &&
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        image
      )
    ) {
      throw reject(
        "QR must be a PNG, JPG or WEBP image."
      );
    }

    if (
      image &&
      Buffer.from(
        image.split(",")[1],
        "base64"
      ).length > 350 * 1024
    ) {
      throw reject(
        "Each QR image must be 350 KB or smaller."
      );
    }

    out[method].qrImage = image;
  }

  return out;
}

export function registerPaymentSettings(
  app,
  pool,
  requireAdmin
) {
  if (
    typeof requireAdmin !== "function"
  ) {
    throw new Error(
      "Admin session middleware is required."
    );
  }

  function sameOrigin(req, res, next) {
    res.set(
      "Cache-Control",
      "no-store"
    );

    if (
      req.method !== "GET" &&
      req.headers.origin
    ) {
      try {
        if (
          new URL(
            req.headers.origin
          ).host !== req.headers.host
        ) {
          return res.status(403).json({
            error:
              "Invalid request origin.",
          });
        }
      } catch {
        return res.status(403).json({
          error:
            "Invalid request origin.",
        });
      }
    }

    next();
  }

  async function read() {
    const result = await pool.query(
      `
        SELECT setting_value
        FROM site_settings
        WHERE setting_key=$1
      `,
      [KEY]
    );

    const row = result.rows[0];

    if (!row) {
      return structuredClone(
        EMPTY_PAYMENT_SETTINGS
      );
    }

    return normalizePaymentSettings(
      JSON.parse(row.setting_value)
    );
  }

  app.get(
    "/api/admin/settings/payment",
    requireAdmin,
    sameOrigin,

    wrap(async (req, res) => {
      res.json({
        settings: await read(),
      });
    })
  );

  app.put(
    "/api/admin/settings/payment",
    requireAdmin,
    sameOrigin,

    wrap(async (req, res) => {
      const settings =
        normalizePaymentSettings(
          req.body?.settings
        );

      await pool.query(
        `
          INSERT INTO site_settings (
            setting_key,
            setting_value,
            updated_at
          )
          VALUES ($1, $2, NOW())

          ON CONFLICT (setting_key)
          DO UPDATE SET
            setting_value =
              EXCLUDED.setting_value,
            updated_at = NOW()
        `,
        [
          KEY,
          JSON.stringify(settings),
        ]
      );

      res.json({
        success: true,
        settings,
      });
    })
  );

  app.get(
    "/api/kl/payment-settings",
    sameOrigin,

    wrap(async (req, res) => {
      await authenticatedCustomer(
        pool,
        req,
        true
      );

      res.json({
        settings: await read(),
      });
    })
  );
}
