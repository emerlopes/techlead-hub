import { describe, expect, it } from "vitest";
import { lockRemainingSeconds, registerFailedLogin } from "./login-lockout";

const policy = { maxAttempts: 3, lockMinutes: 15 };
const now = new Date("2026-01-01T12:00:00Z");

describe("registerFailedLogin", () => {
  it("conta falhas até o limite e então bloqueia", () => {
    let state = { failedLoginCount: 0, lockedUntil: null as Date | null };
    state = registerFailedLogin(state, policy, now);
    state = registerFailedLogin(state, policy, now);
    expect(state).toEqual({ failedLoginCount: 2, lockedUntil: null });

    state = registerFailedLogin(state, policy, now);
    expect(state.failedLoginCount).toBe(0);
    expect(lockRemainingSeconds(state.lockedUntil, now)).toBe(15 * 60);
  });

  it("recomeça a contagem após um bloqueio expirado", () => {
    const expired = { failedLoginCount: 2, lockedUntil: new Date(now.getTime() - 1000) };
    expect(registerFailedLogin(expired, policy, now).failedLoginCount).toBe(1);
  });
});

describe("lockRemainingSeconds", () => {
  it("é zero sem bloqueio ou com bloqueio vencido", () => {
    expect(lockRemainingSeconds(null, now)).toBe(0);
    expect(lockRemainingSeconds(new Date(now.getTime() - 1), now)).toBe(0);
  });
});
