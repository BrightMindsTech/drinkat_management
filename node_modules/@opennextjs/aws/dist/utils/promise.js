import { debug, error } from "../adapters/logger";
/**
 * A `Promise.withResolvers` implementation that exposes the `resolve` and
 * `reject` functions on a `Promise`.
 * Copied from next https://github.com/vercel/next.js/blob/canary/packages/next/src/lib/detached-promise.ts
 * @see https://tc39.es/proposal-promise-with-resolvers/
 */
export class DetachedPromise {
    resolve;
    reject;
    promise;
    constructor() {
        let resolve;
        let reject;
        // Create the promise and assign the resolvers to the object.
        this.promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        // We know that resolvers is defined because the Promise constructor runs
        // synchronously.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.resolve = resolve;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.reject = reject;
    }
}
export class DetachedPromiseRunner {
    promises = [];
    withResolvers() {
        const detachedPromise = new DetachedPromise();
        this.promises.push(detachedPromise);
        return detachedPromise;
    }
    add(promise) {
        const detachedPromise = new DetachedPromise();
        this.promises.push(detachedPromise);
        promise.then(detachedPromise.resolve, detachedPromise.reject);
    }
    async await() {
        debug(`Awaiting ${this.promises.length} detached promises`);
        const results = await Promise.allSettled(this.promises.map((p) => p.promise));
        const rejectedPromises = results.filter((r) => r.status === "rejected");
        rejectedPromises.forEach((r) => {
            error(r.reason);
        });
    }
}
async function awaitAllDetachedPromise() {
    const store = globalThis.__openNextAls.getStore();
    const promisesToAwait = store?.pendingPromiseRunner.await() ?? Promise.resolve();
    if (store?.waitUntil) {
        store.waitUntil(promisesToAwait);
        return;
    }
    await promisesToAwait;
}
function provideNextAfterProvider() {
    const NEXT_REQUEST_CONTEXT_SYMBOL = Symbol.for("@next/request-context");
    // This is needed by some lib that relies on the vercel request context to properly await stuff.
    // Remove this when vercel builder is updated to provide '@next/request-context'.
    const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
    const store = globalThis.__openNextAls.getStore();
    const waitUntil = store?.waitUntil ??
        ((promise) => store?.pendingPromiseRunner.add(promise));
    const nextAfterContext = {
        get: () => ({
            waitUntil,
        }),
    };
    //@ts-expect-error
    globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
    // We probably want to avoid providing this everytime since some lib may incorrectly think they are running in Vercel
    // It may break stuff, but at the same time it will allow libs like `@vercel/otel` to work as expected
    if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
        //@ts-expect-error
        globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
    }
}
export function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil, requestId = Math.random().toString(36), }, fn) {
    return globalThis.__openNextAls.run({
        requestId,
        pendingPromiseRunner: new DetachedPromiseRunner(),
        isISRRevalidation,
        waitUntil,
        writtenTags: new Set(),
    }, async () => {
        provideNextAfterProvider();
        let result;
        try {
            result = await fn();
            // We always await all detached promises before returning the result
            // However we don't want to catch errors here, we want to let the parent handle it
        }
        finally {
            await awaitAllDetachedPromise();
        }
        return result;
    });
}
