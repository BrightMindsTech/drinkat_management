// Do we need Buffer here?
import { Buffer } from "node:buffer";
globalThis.Buffer = Buffer;
// AsyncLocalStorage is needed to be defined globally
import { AsyncLocalStorage } from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;
let _module;
export default async function middlewareHandler(request) {
    if (!_module) {
        // We use await import here so that we are sure that it is loaded after AsyncLocalStorage is defined on globalThis
        // We need both await here, same way as in https://github.com/opennextjs/opennextjs-aws/pull/704
        //@ts-expect-error - This file should be bundled with esbuild
        _module = await (await import("./.next/server/middleware.js")).default;
    }
    const adapterFn = _module.default || _module;
    const result = await adapterFn({
        handler: _module.middleware || _module,
        request: request,
        page: "middleware",
    });
    globalThis.__openNextAls
        .getStore()
        ?.pendingPromiseRunner.add(result.waitUntil);
    return result.response;
}
