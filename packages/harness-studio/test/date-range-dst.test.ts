import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const moduleUrl = pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), "../src/app/date-range.ts")).href;

/** Local calendar date components, month first as `Date` takes them. */
type Day = [year: number, month: number, day: number];

interface WindowProbe {
  resolved: { preset: string; from?: string; to?: string };
  fromMs: number;
  toMs: number;
  fromKey: string;
  toKey: string;
  hours: number;
  lateInWindow: boolean;
  afterMidnightInWindow: boolean;
}

/**
 * Resolve a window inside a child process with a fixed `TZ`.
 *
 * The module works on the reader's local calendar, so the only way to exercise
 * a DST transition deterministically is to give the whole process a zone. Every
 * date is built from local components inside the child; an ISO string made in
 * this process would carry the wrong zone.
 */
function probeWindow(
  zone: string,
  preset: "today" | "yesterday",
  now: Day,
  late: Day,
  afterMidnight: Day,
): WindowProbe {
  const script = `
(async () => {
  const { dateRangeBounds, resolveDateRange, localDayKey } = await import(${JSON.stringify(moduleUrl)});
  const at = (parts, hours, minutes) => new Date(parts[0], parts[1] - 1, parts[2], hours, minutes, 0, 0);
  const now = at(${JSON.stringify(now)}, 12, 0);
  const range = { preset: ${JSON.stringify(preset)} };
  const bounds = dateRangeBounds(range, now);
  const late = at(${JSON.stringify(late)}, 23, 30).getTime();
  const after = at(${JSON.stringify(afterMidnight)}, 0, 30).getTime();
  console.log(JSON.stringify({
    resolved: resolveDateRange(range, now),
    fromMs: bounds.fromMs,
    toMs: bounds.toMs,
    fromKey: localDayKey(new Date(bounds.fromMs)),
    toKey: localDayKey(new Date(bounds.toMs)),
    hours: (bounds.toMs - bounds.fromMs + 1) / 3_600_000,
    lateInWindow: late >= bounds.fromMs && late <= bounds.toMs,
    afterMidnightInWindow: after >= bounds.fromMs && after <= bounds.toMs,
  }));
})();
`;
  const output = execFileSync(process.execPath, ["-e", script], {
    env: { ...process.env, TZ: zone },
    encoding: "utf8",
  });
  return JSON.parse(output) as WindowProbe;
}

function offsetIn(zone: string): number {
  const output = execFileSync(
    process.execPath,
    ["-e", "console.log(new Date(2020, 0, 1).getTimezoneOffset())"],
    { env: { ...process.env, TZ: zone }, encoding: "utf8" },
  );
  return Number(output.trim());
}

// Two unrelated zones: a host that ignores TZ cannot fake both.
const tzControllable = offsetIn("Asia/Tokyo") === -540 && offsetIn("America/New_York") === 300;

describe("yesterday across DST transitions", () => {
  it.skipIf(!tzControllable)("ends the 23-hour spring-forward day at its own midnight", () => {
    const probe = probeWindow("America/New_York", "yesterday", [2026, 3, 9], [2026, 3, 8], [2026, 3, 9]);
    expect(probe.resolved).toEqual({ preset: "yesterday", from: "2026-03-08", to: "2026-03-08" });
    expect(probe.fromKey).toBe("2026-03-08");
    expect(probe.toKey).toBe("2026-03-08");
    expect(probe.hours).toBe(23);
    expect(probe.lateInWindow).toBe(true);
    // A fixed 24-hour window used to spill into 00:00-00:59 of the next day.
    expect(probe.afterMidnightInWindow).toBe(false);
  });

  it.skipIf(!tzControllable)("does not lose the last hour of the 25-hour fall-back day", () => {
    const probe = probeWindow("America/New_York", "yesterday", [2026, 11, 2], [2026, 11, 1], [2026, 11, 2]);
    expect(probe.resolved).toEqual({ preset: "yesterday", from: "2026-11-01", to: "2026-11-01" });
    expect(probe.fromKey).toBe("2026-11-01");
    expect(probe.toKey).toBe("2026-11-01");
    expect(probe.hours).toBe(25);
    // A fixed 24-hour window used to stop at 22:59:59.999.
    expect(probe.lateInWindow).toBe(true);
    expect(probe.afterMidnightInWindow).toBe(false);
  });

  it.skipIf(!tzControllable)("fixes today on both transition days too", () => {
    const spring = probeWindow("America/New_York", "today", [2026, 3, 8], [2026, 3, 8], [2026, 3, 9]);
    expect(spring.hours).toBe(23);
    expect(spring.toKey).toBe("2026-03-08");
    expect(spring.afterMidnightInWindow).toBe(false);

    const fall = probeWindow("America/New_York", "today", [2026, 11, 1], [2026, 11, 1], [2026, 11, 2]);
    expect(fall.hours).toBe(25);
    expect(fall.toKey).toBe("2026-11-01");
    expect(fall.lateInWindow).toBe(true);
  });

  it.skipIf(!tzControllable)("follows a second zone's transitions", () => {
    const spring = probeWindow("Europe/Berlin", "yesterday", [2026, 3, 30], [2026, 3, 29], [2026, 3, 30]);
    expect(spring.hours).toBe(23);
    expect(spring.toKey).toBe("2026-03-29");

    const fall = probeWindow("Europe/Berlin", "yesterday", [2026, 10, 26], [2026, 10, 25], [2026, 10, 26]);
    expect(fall.hours).toBe(25);
    expect(fall.toKey).toBe("2026-10-25");
    expect(fall.lateInWindow).toBe(true);
  });

  it.skipIf(!tzControllable)("keeps a 24-hour day in a zone without DST", () => {
    const probe = probeWindow("Asia/Tokyo", "yesterday", [2026, 9, 8], [2026, 9, 7], [2026, 9, 8]);
    expect(probe.resolved).toEqual({ preset: "yesterday", from: "2026-09-07", to: "2026-09-07" });
    expect(probe.fromKey).toBe("2026-09-07");
    expect(probe.toKey).toBe("2026-09-07");
    expect(probe.hours).toBe(24);
    expect(probe.lateInWindow).toBe(true);
    expect(probe.afterMidnightInWindow).toBe(false);
  });
});
