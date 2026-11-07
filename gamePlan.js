// Server-only repeating plans:
// Admin Control 01, 02, 03 and 04.
// Each plan contains 50 multiplier boxes.

const PLAN_KEYS = Object.freeze({
  "01": ["adminPlan", "adminPlanCursor"],
  "02": ["adminPlan2", "adminPlanCursor2"],
  "03": ["adminPlan3", "adminPlanCursor3"],
  "04": ["adminPlan4", "adminPlanCursor4"],
});

function keysFor(bank) {
  if (!Object.hasOwn(PLAN_KEYS, bank)) {
    throw new Error("Invalid admin plan.");
  }

  return PLAN_KEYS[bank];
}

export function normalizePlan(values, allowEmpty = false) {
  if (!Array.isArray(values) || values.length > 50) {
    throw new Error("Use up to 50 multiplier boxes.");
  }

  const slots = Array(50).fill(null);

  for (let index = 0; index < values.length; index++) {
    const value = values[index];

    if (value === null) {
      continue;
    }

    if (
      !Number.isFinite(value) ||
      value < 1 ||
      value > 50 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.00001
    ) {
      throw new Error(
        `Box ${index + 1}: enter 1.00–50.00, with at most two decimals.`,
      );
    }

    slots[index] = Math.round(value * 100) / 100;
  }

  if (
    !allowEmpty &&
    !slots.some((value) => value !== null)
  ) {
    throw new Error(
      "Fill at least one multiplier box for Admin Control.",
    );
  }

  return slots;
}

export function savedPlan(settings, bank = "01") {
  const [planKey] = keysFor(bank);

  let plan;

  try {
    plan = normalizePlan(
      JSON.parse(settings[planKey] || "[]"),
      true,
    );
  } catch {
    plan = Array(50).fill(null);
  }

  // Preserve the existing Plan 01 legacy multiplier.
  if (
    bank === "01" &&
    !plan.some((value) => value !== null) &&
    !settings.adminPlan
  ) {
    const legacy = Number(settings.manualMultiplier);

    plan[0] =
      Number.isFinite(legacy) &&
      legacy >= 1 &&
      legacy <= 50
        ? legacy
        : 2;
  }

  return plan;
}

export async function takeAdminTarget(ctx, bank = "01") {
  const [, cursorKey] = keysFor(bank);

  return await ctx.tx(async () => {
    const settings = await ctx.settings();

    const entries = savedPlan(settings, bank)
      .map((value, index) => ({
        value,
        slot: index + 1,
      }))
      .filter((entry) => entry.value !== null);

    // Defensive fallback for damaged settings.
    // Admin settings must reject an empty plan before activation.
    if (!entries.length) {
      return {
        value: 2,
        slot: null,
      };
    }

    const storedCursor = Number(
      settings[cursorKey] || 0,
    );

    const cursor =
      Number.isSafeInteger(storedCursor) &&
      storedCursor >= 0
        ? storedCursor % entries.length
        : 0;

    const entry = entries[cursor];

    await ctx.run(
      "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      cursorKey,
      String((cursor + 1) % entries.length),
    );

    return entry;
  });
}
