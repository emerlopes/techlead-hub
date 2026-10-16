export type LockoutState = {
  failedLoginCount: number;
  lockedUntil: Date | null;
};

export type LockoutPolicy = {
  maxAttempts: number;
  lockMinutes: number;
};

/** Segundos restantes de bloqueio, ou 0 se o login está liberado (§44.2). */
export function lockRemainingSeconds(lockedUntil: Date | null, now: Date): number {
  if (!lockedUntil) return 0;
  return Math.max(0, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
}

/**
 * Registra uma falha. Ao atingir o limite, bloqueia por `lockMinutes` e zera o contador,
 * de modo que, após o bloqueio, o ciclo de tentativas recomeça.
 */
export function registerFailedLogin(
  state: LockoutState,
  policy: LockoutPolicy,
  now: Date,
): LockoutState {
  // Falhas antigas de um bloqueio já expirado não contam para o novo ciclo.
  const previous = state.lockedUntil && state.lockedUntil <= now ? 0 : state.failedLoginCount;
  const failedLoginCount = previous + 1;
  if (failedLoginCount >= policy.maxAttempts) {
    return {
      failedLoginCount: 0,
      lockedUntil: new Date(now.getTime() + policy.lockMinutes * 60_000),
    };
  }
  return { failedLoginCount, lockedUntil: state.lockedUntil };
}
