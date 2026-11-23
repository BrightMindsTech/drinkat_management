/** Side effects after a row is saved must never fail the user's submit. */
export async function runSubmitSideEffects(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[submit:${label}] side effect failed; the record is already saved`, e);
  }
}
