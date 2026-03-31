
import {Buffer} from "node:buffer";
globalThis.Buffer = Buffer;

import {AsyncLocalStorage} from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;


const defaultDefineProperty = Object.defineProperty;
Object.defineProperty = function(o, p, a) {
  if(p=== '__import_unsupported' && Boolean(globalThis.__import_unsupported)) {
    return;
  }
  return defaultDefineProperty(o, p, a);
};

  
  
  globalThis.openNextDebug = false;globalThis.openNextVersion = "3.9.16";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var init_error = __esm({
  "node_modules/@opennextjs/aws/dist/utils/error.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}
var DOWNPLAYED_ERROR_LOGS, isDownplayedErrorLog;
var init_logger = __esm({
  "node_modules/@opennextjs/aws/dist/adapters/logger.js"() {
    init_error();
    DOWNPLAYED_ERROR_LOGS = [
      {
        clientName: "S3Client",
        commandName: "GetObjectCommand",
        errorName: "NoSuchKey"
      }
    ];
    isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
  }
});

// node_modules/@opennextjs/aws/node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "node_modules/@opennextjs/aws/node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCookie = parseCookie;
    exports.parse = parseCookie;
    exports.stringifyCookie = stringifyCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    exports.parseSetCookie = parseSetCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var maxAgeRegExp = /^-?\d+$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parseCookie(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
          break;
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const key = valueSlice(str, index, eqIdx);
        if (obj[key] === void 0) {
          obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function stringifyCookie(cookie, options) {
      const enc = options?.encode || encodeURIComponent;
      const cookieStrings = [];
      for (const name of Object.keys(cookie)) {
        const val = cookie[name];
        if (val === void 0)
          continue;
        if (!cookieNameRegExp.test(name)) {
          throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
          throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
      }
      return cookieStrings.join("; ");
    }
    function stringifySetCookie(_name, _val, _opts) {
      const cookie = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) };
      const options = typeof _val === "object" ? _val : _opts;
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(cookie.name)) {
        throw new TypeError(`argument name is invalid: ${cookie.name}`);
      }
      const value = cookie.value ? enc(cookie.value) : "";
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie.value}`);
      }
      let str = cookie.name + "=" + value;
      if (cookie.maxAge !== void 0) {
        if (!Number.isInteger(cookie.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
        }
        str += "; Max-Age=" + cookie.maxAge;
      }
      if (cookie.domain) {
        if (!domainValueRegExp.test(cookie.domain)) {
          throw new TypeError(`option domain is invalid: ${cookie.domain}`);
        }
        str += "; Domain=" + cookie.domain;
      }
      if (cookie.path) {
        if (!pathValueRegExp.test(cookie.path)) {
          throw new TypeError(`option path is invalid: ${cookie.path}`);
        }
        str += "; Path=" + cookie.path;
      }
      if (cookie.expires) {
        if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${cookie.expires}`);
        }
        str += "; Expires=" + cookie.expires.toUTCString();
      }
      if (cookie.httpOnly) {
        str += "; HttpOnly";
      }
      if (cookie.secure) {
        str += "; Secure";
      }
      if (cookie.partitioned) {
        str += "; Partitioned";
      }
      if (cookie.priority) {
        const priority = typeof cookie.priority === "string" ? cookie.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${cookie.priority}`);
        }
      }
      if (cookie.sameSite) {
        const sameSite = typeof cookie.sameSite === "string" ? cookie.sameSite.toLowerCase() : cookie.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
        }
      }
      return str;
    }
    function parseSetCookie(str, options) {
      const dec = options?.decode || decode;
      const len = str.length;
      const endIdx = endIndex(str, 0, len);
      const eqIdx = eqIndex(str, 0, endIdx);
      const setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : {
        name: valueSlice(str, 0, eqIdx),
        value: dec(valueSlice(str, eqIdx + 1, endIdx))
      };
      let index = endIdx + 1;
      while (index < len) {
        const endIdx2 = endIndex(str, index, len);
        const eqIdx2 = eqIndex(str, index, endIdx2);
        const attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2);
        const val = eqIdx2 === -1 ? void 0 : valueSlice(str, eqIdx2 + 1, endIdx2);
        switch (attr.toLowerCase()) {
          case "httponly":
            setCookie.httpOnly = true;
            break;
          case "secure":
            setCookie.secure = true;
            break;
          case "partitioned":
            setCookie.partitioned = true;
            break;
          case "domain":
            setCookie.domain = val;
            break;
          case "path":
            setCookie.path = val;
            break;
          case "max-age":
            if (val && maxAgeRegExp.test(val))
              setCookie.maxAge = Number(val);
            break;
          case "expires":
            if (!val)
              break;
            const date = new Date(val);
            if (Number.isFinite(date.valueOf()))
              setCookie.expires = date;
            break;
          case "priority":
            if (!val)
              break;
            const priority = val.toLowerCase();
            if (priority === "low" || priority === "medium" || priority === "high") {
              setCookie.priority = priority;
            }
            break;
          case "samesite":
            if (!val)
              break;
            const sameSite = val.toLowerCase();
            if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
              setCookie.sameSite = sameSite;
            }
            break;
        }
        index = endIdx2 + 1;
      }
      return setCookie;
    }
    function endIndex(str, min, len) {
      const index = str.indexOf(";", min);
      return index === -1 ? len : index;
    }
    function eqIndex(str, min, max) {
      const index = str.indexOf("=", min);
      return index < max ? index : -1;
    }
    function valueSlice(str, min, max) {
      let start = min;
      let end = max;
      do {
        const code = str.charCodeAt(start);
        if (code !== 32 && code !== 9)
          break;
      } while (++start < end);
      while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 32 && code !== 9)
          break;
        end--;
      }
      return str.slice(start, end);
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});

// node_modules/@opennextjs/aws/dist/http/util.js
function parseSetCookieHeader(cookies) {
  if (!cookies) {
    return [];
  }
  if (typeof cookies === "string") {
    return cookies.split(/(?<!Expires=\w+),/i).map((c) => c.trim());
  }
  return cookies;
}
function getQueryFromIterator(it) {
  const query = {};
  for (const [key, value] of it) {
    if (key in query) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  return query;
}
var init_util = __esm({
  "node_modules/@opennextjs/aws/dist/http/util.js"() {
    init_logger();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/utils.js
function getQueryFromSearchParams(searchParams) {
  return getQueryFromIterator(searchParams.entries());
}
var init_utils = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/utils.js"() {
    init_util();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/edge.js
var edge_exports = {};
__export(edge_exports, {
  default: () => edge_default
});
import { Buffer as Buffer2 } from "node:buffer";
var import_cookie, NULL_BODY_STATUSES, converter, edge_default;
var init_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/edge.js"() {
    import_cookie = __toESM(require_dist(), 1);
    init_util();
    init_utils();
    NULL_BODY_STATUSES = /* @__PURE__ */ new Set([101, 103, 204, 205, 304]);
    converter = {
      convertFrom: async (event) => {
        const url = new URL(event.url);
        const searchParams = url.searchParams;
        const query = getQueryFromSearchParams(searchParams);
        const headers = {};
        event.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const rawPath = url.pathname;
        const method = event.method;
        const shouldHaveBody = method !== "GET" && method !== "HEAD";
        const body = shouldHaveBody ? Buffer2.from(await event.arrayBuffer()) : void 0;
        const cookieHeader = event.headers.get("cookie");
        const cookies = cookieHeader ? import_cookie.default.parse(cookieHeader) : {};
        return {
          type: "core",
          method,
          rawPath,
          url: event.url,
          body,
          headers,
          remoteAddress: event.headers.get("x-forwarded-for") ?? "::1",
          query,
          cookies
        };
      },
      convertTo: async (result) => {
        if ("internalEvent" in result) {
          const request = new Request(result.internalEvent.url, {
            body: result.internalEvent.body,
            method: result.internalEvent.method,
            headers: {
              ...result.internalEvent.headers,
              "x-forwarded-host": result.internalEvent.headers.host
            }
          });
          if (globalThis.__dangerous_ON_edge_converter_returns_request === true) {
            return request;
          }
          const cfCache = (result.isISR || result.internalEvent.rawPath.startsWith("/_next/image")) && process.env.DISABLE_CACHE !== "true" ? { cacheEverything: true } : {};
          return fetch(request, {
            // This is a hack to make sure that the response is cached by Cloudflare
            // See https://developers.cloudflare.com/workers/examples/cache-using-fetch/#caching-html-resources
            // @ts-expect-error - This is a Cloudflare specific option
            cf: cfCache
          });
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(result.headers)) {
          if (key === "set-cookie" && typeof value === "string") {
            const cookies = parseSetCookieHeader(value);
            for (const cookie of cookies) {
              headers.append(key, cookie);
            }
            continue;
          }
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, value);
          }
        }
        const body = NULL_BODY_STATUSES.has(result.statusCode) ? null : result.body;
        return new Response(body, {
          status: result.statusCode,
          headers
        });
      },
      name: "edge"
    };
    edge_default = converter;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js
var cloudflare_edge_exports = {};
__export(cloudflare_edge_exports, {
  default: () => cloudflare_edge_default
});
var cfPropNameMapping, handler, cloudflare_edge_default;
var init_cloudflare_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js"() {
    cfPropNameMapping = {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: [encodeURIComponent, "x-open-next-city"],
      country: "x-open-next-country",
      regionCode: "x-open-next-region",
      latitude: "x-open-next-latitude",
      longitude: "x-open-next-longitude"
    };
    handler = async (handler3, converter2) => async (request, env, ctx) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const cfProperties = request.cf;
      for (const [propName, mapping] of Object.entries(cfPropNameMapping)) {
        const propValue = cfProperties?.[propName];
        if (propValue != null) {
          const [encode, headerName] = Array.isArray(mapping) ? mapping : [null, mapping];
          internalEvent.headers[headerName] = encode ? encode(propValue) : propValue;
        }
      }
      const response = await handler3(internalEvent, {
        waitUntil: ctx.waitUntil.bind(ctx)
      });
      const result = await converter2.convertTo(response);
      return result;
    };
    cloudflare_edge_default = {
      wrapper: handler,
      name: "cloudflare-edge",
      supportStreaming: true,
      edgeRuntime: true
    };
  }
});

// node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js
var pattern_env_exports = {};
__export(pattern_env_exports, {
  default: () => pattern_env_default
});
function initializeOnce() {
  if (initialized)
    return;
  cachedOrigins = JSON.parse(process.env.OPEN_NEXT_ORIGIN ?? "{}");
  const functions = globalThis.openNextConfig.functions ?? {};
  for (const key in functions) {
    if (key !== "default") {
      const value = functions[key];
      const regexes = [];
      for (const pattern of value.patterns) {
        const regexPattern = `/${pattern.replace(/\*\*/g, "(.*)").replace(/\*/g, "([^/]*)").replace(/\//g, "\\/").replace(/\?/g, ".")}`;
        regexes.push(new RegExp(regexPattern));
      }
      cachedPatterns.push({
        key,
        patterns: value.patterns,
        regexes
      });
    }
  }
  initialized = true;
}
var cachedOrigins, cachedPatterns, initialized, envLoader, pattern_env_default;
var init_pattern_env = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js"() {
    init_logger();
    cachedPatterns = [];
    initialized = false;
    envLoader = {
      name: "env",
      resolve: async (_path) => {
        try {
          initializeOnce();
          for (const { key, patterns, regexes } of cachedPatterns) {
            for (const regex of regexes) {
              if (regex.test(_path)) {
                debug("Using origin", key, patterns);
                return cachedOrigins[key];
              }
            }
          }
          if (_path.startsWith("/_next/image") && cachedOrigins.imageOptimizer) {
            debug("Using origin", "imageOptimizer", _path);
            return cachedOrigins.imageOptimizer;
          }
          if (cachedOrigins.default) {
            debug("Using default origin", cachedOrigins.default, _path);
            return cachedOrigins.default;
          }
          return false;
        } catch (e) {
          error("Error while resolving origin", e);
          return false;
        }
      }
    };
    pattern_env_default = envLoader;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js
var dummy_exports = {};
__export(dummy_exports, {
  default: () => dummy_default
});
var resolver, dummy_default;
var init_dummy = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js"() {
    resolver = {
      name: "dummy"
    };
    dummy_default = resolver;
  }
});

// node_modules/@opennextjs/aws/dist/utils/stream.js
import { ReadableStream } from "node:stream/web";
function toReadableStream(value, isBase64) {
  return new ReadableStream({
    pull(controller) {
      controller.enqueue(Buffer.from(value, isBase64 ? "base64" : "utf8"));
      controller.close();
    }
  }, { highWaterMark: 0 });
}
function emptyReadableStream() {
  if (process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
    return new ReadableStream({
      pull(controller) {
        maybeSomethingBuffer ??= Buffer.from("SOMETHING");
        controller.enqueue(maybeSomethingBuffer);
        controller.close();
      }
    }, { highWaterMark: 0 });
  }
  return new ReadableStream({
    start(controller) {
      controller.close();
    }
  });
}
var maybeSomethingBuffer;
var init_stream = __esm({
  "node_modules/@opennextjs/aws/dist/utils/stream.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js
var fetch_exports = {};
__export(fetch_exports, {
  default: () => fetch_default
});
var fetchProxy, fetch_default;
var init_fetch = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js"() {
    init_stream();
    fetchProxy = {
      name: "fetch-proxy",
      // @ts-ignore
      proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
          method,
          headers,
          body
        });
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        return {
          type: "core",
          headers: responseHeaders,
          statusCode: response.status,
          isBase64Encoded: true,
          body: response.body ?? emptyReadableStream()
        };
      }
    };
    fetch_default = fetchProxy;
  }
});

// .next/server/edge-runtime-webpack.js
var require_edge_runtime_webpack = __commonJS({
  ".next/server/edge-runtime-webpack.js"() {
    "use strict";
    (() => {
      "use strict";
      var a = {}, b = {};
      function c(d) {
        var e = b[d];
        if (void 0 !== e) return e.exports;
        var f = b[d] = { exports: {} }, g = true;
        try {
          a[d](f, f.exports, c), g = false;
        } finally {
          g && delete b[d];
        }
        return f.exports;
      }
      c.m = a, c.amdO = {}, (() => {
        var a2 = [];
        c.O = (b2, d, e, f) => {
          if (d) {
            f = f || 0;
            for (var g = a2.length; g > 0 && a2[g - 1][2] > f; g--) a2[g] = a2[g - 1];
            a2[g] = [d, e, f];
            return;
          }
          for (var h = 1 / 0, g = 0; g < a2.length; g++) {
            for (var [d, e, f] = a2[g], i = true, j = 0; j < d.length; j++) (false & f || h >= f) && Object.keys(c.O).every((a3) => c.O[a3](d[j])) ? d.splice(j--, 1) : (i = false, f < h && (h = f));
            if (i) {
              a2.splice(g--, 1);
              var k = e();
              void 0 !== k && (b2 = k);
            }
          }
          return b2;
        };
      })(), c.n = (a2) => {
        var b2 = a2 && a2.__esModule ? () => a2.default : () => a2;
        return c.d(b2, { a: b2 }), b2;
      }, c.d = (a2, b2) => {
        for (var d in b2) c.o(b2, d) && !c.o(a2, d) && Object.defineProperty(a2, d, { enumerable: true, get: b2[d] });
      }, c.g = function() {
        if ("object" == typeof globalThis) return globalThis;
        try {
          return this || Function("return this")();
        } catch (a2) {
          if ("object" == typeof window) return window;
        }
      }(), c.o = (a2, b2) => Object.prototype.hasOwnProperty.call(a2, b2), c.r = (a2) => {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(a2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(a2, "__esModule", { value: true });
      }, (() => {
        var a2 = { 149: 0 };
        c.O.j = (b3) => 0 === a2[b3];
        var b2 = (b3, d2) => {
          var e, f, [g, h, i] = d2, j = 0;
          if (g.some((b4) => 0 !== a2[b4])) {
            for (e in h) c.o(h, e) && (c.m[e] = h[e]);
            if (i) var k = i(c);
          }
          for (b3 && b3(d2); j < g.length; j++) f = g[j], c.o(a2, f) && a2[f] && a2[f][0](), a2[f] = 0;
          return c.O(k);
        }, d = self.webpackChunk_N_E = self.webpackChunk_N_E || [];
        d.forEach(b2.bind(null, 0)), d.push = b2.bind(null, d.push.bind(d));
      })();
    })();
  }
});

// node-built-in-modules:node:buffer
var node_buffer_exports = {};
import * as node_buffer_star from "node:buffer";
var init_node_buffer = __esm({
  "node-built-in-modules:node:buffer"() {
    __reExport(node_buffer_exports, node_buffer_star);
  }
});

// node-built-in-modules:node:async_hooks
var node_async_hooks_exports = {};
import * as node_async_hooks_star from "node:async_hooks";
var init_node_async_hooks = __esm({
  "node-built-in-modules:node:async_hooks"() {
    __reExport(node_async_hooks_exports, node_async_hooks_star);
  }
});

// .next/server/src/middleware.js
var require_middleware = __commonJS({
  ".next/server/src/middleware.js"() {
    "use strict";
    (self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[550], { 1: (a, b, c) => {
      "use strict";
      c.r(b), c.d(b, { NIL: () => D, parse: () => q, stringify: () => m, v1: () => p, v3: () => z, v4: () => A, v5: () => C, validate: () => j, version: () => E });
      var d, e, f, g = new Uint8Array(16);
      function h() {
        if (!d && !(d = "undefined" != typeof crypto && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || "undefined" != typeof msCrypto && "function" == typeof msCrypto.getRandomValues && msCrypto.getRandomValues.bind(msCrypto))) throw Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
        return d(g);
      }
      let i = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i, j = function(a2) {
        return "string" == typeof a2 && i.test(a2);
      };
      for (var k = [], l = 0; l < 256; ++l) k.push((l + 256).toString(16).substr(1));
      let m = function(a2) {
        var b2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0, c2 = (k[a2[b2 + 0]] + k[a2[b2 + 1]] + k[a2[b2 + 2]] + k[a2[b2 + 3]] + "-" + k[a2[b2 + 4]] + k[a2[b2 + 5]] + "-" + k[a2[b2 + 6]] + k[a2[b2 + 7]] + "-" + k[a2[b2 + 8]] + k[a2[b2 + 9]] + "-" + k[a2[b2 + 10]] + k[a2[b2 + 11]] + k[a2[b2 + 12]] + k[a2[b2 + 13]] + k[a2[b2 + 14]] + k[a2[b2 + 15]]).toLowerCase();
        if (!j(c2)) throw TypeError("Stringified UUID is invalid");
        return c2;
      };
      var n = 0, o = 0;
      let p = function(a2, b2, c2) {
        var d2 = b2 && c2 || 0, g2 = b2 || Array(16), i2 = (a2 = a2 || {}).node || e, j2 = void 0 !== a2.clockseq ? a2.clockseq : f;
        if (null == i2 || null == j2) {
          var k2 = a2.random || (a2.rng || h)();
          null == i2 && (i2 = e = [1 | k2[0], k2[1], k2[2], k2[3], k2[4], k2[5]]), null == j2 && (j2 = f = (k2[6] << 8 | k2[7]) & 16383);
        }
        var l2 = void 0 !== a2.msecs ? a2.msecs : Date.now(), p2 = void 0 !== a2.nsecs ? a2.nsecs : o + 1, q2 = l2 - n + (p2 - o) / 1e4;
        if (q2 < 0 && void 0 === a2.clockseq && (j2 = j2 + 1 & 16383), (q2 < 0 || l2 > n) && void 0 === a2.nsecs && (p2 = 0), p2 >= 1e4) throw Error("uuid.v1(): Can't create more than 10M uuids/sec");
        n = l2, o = p2, f = j2;
        var r2 = ((268435455 & (l2 += 122192928e5)) * 1e4 + p2) % 4294967296;
        g2[d2++] = r2 >>> 24 & 255, g2[d2++] = r2 >>> 16 & 255, g2[d2++] = r2 >>> 8 & 255, g2[d2++] = 255 & r2;
        var s2 = l2 / 4294967296 * 1e4 & 268435455;
        g2[d2++] = s2 >>> 8 & 255, g2[d2++] = 255 & s2, g2[d2++] = s2 >>> 24 & 15 | 16, g2[d2++] = s2 >>> 16 & 255, g2[d2++] = j2 >>> 8 | 128, g2[d2++] = 255 & j2;
        for (var t2 = 0; t2 < 6; ++t2) g2[d2 + t2] = i2[t2];
        return b2 || m(g2);
      }, q = function(a2) {
        if (!j(a2)) throw TypeError("Invalid UUID");
        var b2, c2 = new Uint8Array(16);
        return c2[0] = (b2 = parseInt(a2.slice(0, 8), 16)) >>> 24, c2[1] = b2 >>> 16 & 255, c2[2] = b2 >>> 8 & 255, c2[3] = 255 & b2, c2[4] = (b2 = parseInt(a2.slice(9, 13), 16)) >>> 8, c2[5] = 255 & b2, c2[6] = (b2 = parseInt(a2.slice(14, 18), 16)) >>> 8, c2[7] = 255 & b2, c2[8] = (b2 = parseInt(a2.slice(19, 23), 16)) >>> 8, c2[9] = 255 & b2, c2[10] = (b2 = parseInt(a2.slice(24, 36), 16)) / 1099511627776 & 255, c2[11] = b2 / 4294967296 & 255, c2[12] = b2 >>> 24 & 255, c2[13] = b2 >>> 16 & 255, c2[14] = b2 >>> 8 & 255, c2[15] = 255 & b2, c2;
      };
      function r(a2, b2, c2) {
        function d2(a3, d3, e2, f2) {
          if ("string" == typeof a3 && (a3 = function(a4) {
            a4 = unescape(encodeURIComponent(a4));
            for (var b3 = [], c3 = 0; c3 < a4.length; ++c3) b3.push(a4.charCodeAt(c3));
            return b3;
          }(a3)), "string" == typeof d3 && (d3 = q(d3)), 16 !== d3.length) throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
          var g2 = new Uint8Array(16 + a3.length);
          if (g2.set(d3), g2.set(a3, d3.length), (g2 = c2(g2))[6] = 15 & g2[6] | b2, g2[8] = 63 & g2[8] | 128, e2) {
            f2 = f2 || 0;
            for (var h2 = 0; h2 < 16; ++h2) e2[f2 + h2] = g2[h2];
            return e2;
          }
          return m(g2);
        }
        try {
          d2.name = a2;
        } catch (a3) {
        }
        return d2.DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8", d2.URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8", d2;
      }
      function s(a2) {
        return (a2 + 64 >>> 9 << 4) + 14 + 1;
      }
      function t(a2, b2) {
        var c2 = (65535 & a2) + (65535 & b2);
        return (a2 >> 16) + (b2 >> 16) + (c2 >> 16) << 16 | 65535 & c2;
      }
      function u(a2, b2, c2, d2, e2, f2) {
        var g2;
        return t((g2 = t(t(b2, a2), t(d2, f2))) << e2 | g2 >>> 32 - e2, c2);
      }
      function v(a2, b2, c2, d2, e2, f2, g2) {
        return u(b2 & c2 | ~b2 & d2, a2, b2, e2, f2, g2);
      }
      function w(a2, b2, c2, d2, e2, f2, g2) {
        return u(b2 & d2 | c2 & ~d2, a2, b2, e2, f2, g2);
      }
      function x(a2, b2, c2, d2, e2, f2, g2) {
        return u(b2 ^ c2 ^ d2, a2, b2, e2, f2, g2);
      }
      function y(a2, b2, c2, d2, e2, f2, g2) {
        return u(c2 ^ (b2 | ~d2), a2, b2, e2, f2, g2);
      }
      let z = r("v3", 48, function(a2) {
        if ("string" == typeof a2) {
          var b2 = unescape(encodeURIComponent(a2));
          a2 = new Uint8Array(b2.length);
          for (var c2 = 0; c2 < b2.length; ++c2) a2[c2] = b2.charCodeAt(c2);
        }
        return function(a3) {
          for (var b3 = [], c3 = 32 * a3.length, d2 = "0123456789abcdef", e2 = 0; e2 < c3; e2 += 8) {
            var f2 = a3[e2 >> 5] >>> e2 % 32 & 255, g2 = parseInt(d2.charAt(f2 >>> 4 & 15) + d2.charAt(15 & f2), 16);
            b3.push(g2);
          }
          return b3;
        }(function(a3, b3) {
          a3[b3 >> 5] |= 128 << b3 % 32, a3[s(b3) - 1] = b3;
          for (var c3 = 1732584193, d2 = -271733879, e2 = -1732584194, f2 = 271733878, g2 = 0; g2 < a3.length; g2 += 16) {
            var h2 = c3, i2 = d2, j2 = e2, k2 = f2;
            c3 = v(c3, d2, e2, f2, a3[g2], 7, -680876936), f2 = v(f2, c3, d2, e2, a3[g2 + 1], 12, -389564586), e2 = v(e2, f2, c3, d2, a3[g2 + 2], 17, 606105819), d2 = v(d2, e2, f2, c3, a3[g2 + 3], 22, -1044525330), c3 = v(c3, d2, e2, f2, a3[g2 + 4], 7, -176418897), f2 = v(f2, c3, d2, e2, a3[g2 + 5], 12, 1200080426), e2 = v(e2, f2, c3, d2, a3[g2 + 6], 17, -1473231341), d2 = v(d2, e2, f2, c3, a3[g2 + 7], 22, -45705983), c3 = v(c3, d2, e2, f2, a3[g2 + 8], 7, 1770035416), f2 = v(f2, c3, d2, e2, a3[g2 + 9], 12, -1958414417), e2 = v(e2, f2, c3, d2, a3[g2 + 10], 17, -42063), d2 = v(d2, e2, f2, c3, a3[g2 + 11], 22, -1990404162), c3 = v(c3, d2, e2, f2, a3[g2 + 12], 7, 1804603682), f2 = v(f2, c3, d2, e2, a3[g2 + 13], 12, -40341101), e2 = v(e2, f2, c3, d2, a3[g2 + 14], 17, -1502002290), d2 = v(d2, e2, f2, c3, a3[g2 + 15], 22, 1236535329), c3 = w(c3, d2, e2, f2, a3[g2 + 1], 5, -165796510), f2 = w(f2, c3, d2, e2, a3[g2 + 6], 9, -1069501632), e2 = w(e2, f2, c3, d2, a3[g2 + 11], 14, 643717713), d2 = w(d2, e2, f2, c3, a3[g2], 20, -373897302), c3 = w(c3, d2, e2, f2, a3[g2 + 5], 5, -701558691), f2 = w(f2, c3, d2, e2, a3[g2 + 10], 9, 38016083), e2 = w(e2, f2, c3, d2, a3[g2 + 15], 14, -660478335), d2 = w(d2, e2, f2, c3, a3[g2 + 4], 20, -405537848), c3 = w(c3, d2, e2, f2, a3[g2 + 9], 5, 568446438), f2 = w(f2, c3, d2, e2, a3[g2 + 14], 9, -1019803690), e2 = w(e2, f2, c3, d2, a3[g2 + 3], 14, -187363961), d2 = w(d2, e2, f2, c3, a3[g2 + 8], 20, 1163531501), c3 = w(c3, d2, e2, f2, a3[g2 + 13], 5, -1444681467), f2 = w(f2, c3, d2, e2, a3[g2 + 2], 9, -51403784), e2 = w(e2, f2, c3, d2, a3[g2 + 7], 14, 1735328473), d2 = w(d2, e2, f2, c3, a3[g2 + 12], 20, -1926607734), c3 = x(c3, d2, e2, f2, a3[g2 + 5], 4, -378558), f2 = x(f2, c3, d2, e2, a3[g2 + 8], 11, -2022574463), e2 = x(e2, f2, c3, d2, a3[g2 + 11], 16, 1839030562), d2 = x(d2, e2, f2, c3, a3[g2 + 14], 23, -35309556), c3 = x(c3, d2, e2, f2, a3[g2 + 1], 4, -1530992060), f2 = x(f2, c3, d2, e2, a3[g2 + 4], 11, 1272893353), e2 = x(e2, f2, c3, d2, a3[g2 + 7], 16, -155497632), d2 = x(d2, e2, f2, c3, a3[g2 + 10], 23, -1094730640), c3 = x(c3, d2, e2, f2, a3[g2 + 13], 4, 681279174), f2 = x(f2, c3, d2, e2, a3[g2], 11, -358537222), e2 = x(e2, f2, c3, d2, a3[g2 + 3], 16, -722521979), d2 = x(d2, e2, f2, c3, a3[g2 + 6], 23, 76029189), c3 = x(c3, d2, e2, f2, a3[g2 + 9], 4, -640364487), f2 = x(f2, c3, d2, e2, a3[g2 + 12], 11, -421815835), e2 = x(e2, f2, c3, d2, a3[g2 + 15], 16, 530742520), d2 = x(d2, e2, f2, c3, a3[g2 + 2], 23, -995338651), c3 = y(c3, d2, e2, f2, a3[g2], 6, -198630844), f2 = y(f2, c3, d2, e2, a3[g2 + 7], 10, 1126891415), e2 = y(e2, f2, c3, d2, a3[g2 + 14], 15, -1416354905), d2 = y(d2, e2, f2, c3, a3[g2 + 5], 21, -57434055), c3 = y(c3, d2, e2, f2, a3[g2 + 12], 6, 1700485571), f2 = y(f2, c3, d2, e2, a3[g2 + 3], 10, -1894986606), e2 = y(e2, f2, c3, d2, a3[g2 + 10], 15, -1051523), d2 = y(d2, e2, f2, c3, a3[g2 + 1], 21, -2054922799), c3 = y(c3, d2, e2, f2, a3[g2 + 8], 6, 1873313359), f2 = y(f2, c3, d2, e2, a3[g2 + 15], 10, -30611744), e2 = y(e2, f2, c3, d2, a3[g2 + 6], 15, -1560198380), d2 = y(d2, e2, f2, c3, a3[g2 + 13], 21, 1309151649), c3 = y(c3, d2, e2, f2, a3[g2 + 4], 6, -145523070), f2 = y(f2, c3, d2, e2, a3[g2 + 11], 10, -1120210379), e2 = y(e2, f2, c3, d2, a3[g2 + 2], 15, 718787259), d2 = y(d2, e2, f2, c3, a3[g2 + 9], 21, -343485551), c3 = t(c3, h2), d2 = t(d2, i2), e2 = t(e2, j2), f2 = t(f2, k2);
          }
          return [c3, d2, e2, f2];
        }(function(a3) {
          if (0 === a3.length) return [];
          for (var b3 = 8 * a3.length, c3 = new Uint32Array(s(b3)), d2 = 0; d2 < b3; d2 += 8) c3[d2 >> 5] |= (255 & a3[d2 / 8]) << d2 % 32;
          return c3;
        }(a2), 8 * a2.length));
      }), A = function(a2, b2, c2) {
        var d2 = (a2 = a2 || {}).random || (a2.rng || h)();
        if (d2[6] = 15 & d2[6] | 64, d2[8] = 63 & d2[8] | 128, b2) {
          c2 = c2 || 0;
          for (var e2 = 0; e2 < 16; ++e2) b2[c2 + e2] = d2[e2];
          return b2;
        }
        return m(d2);
      };
      function B(a2, b2) {
        return a2 << b2 | a2 >>> 32 - b2;
      }
      let C = r("v5", 80, function(a2) {
        var b2 = [1518500249, 1859775393, 2400959708, 3395469782], c2 = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
        if ("string" == typeof a2) {
          var d2 = unescape(encodeURIComponent(a2));
          a2 = [];
          for (var e2 = 0; e2 < d2.length; ++e2) a2.push(d2.charCodeAt(e2));
        } else Array.isArray(a2) || (a2 = Array.prototype.slice.call(a2));
        a2.push(128);
        for (var f2 = Math.ceil((a2.length / 4 + 2) / 16), g2 = Array(f2), h2 = 0; h2 < f2; ++h2) {
          for (var i2 = new Uint32Array(16), j2 = 0; j2 < 16; ++j2) i2[j2] = a2[64 * h2 + 4 * j2] << 24 | a2[64 * h2 + 4 * j2 + 1] << 16 | a2[64 * h2 + 4 * j2 + 2] << 8 | a2[64 * h2 + 4 * j2 + 3];
          g2[h2] = i2;
        }
        g2[f2 - 1][14] = (a2.length - 1) * 8 / 4294967296, g2[f2 - 1][14] = Math.floor(g2[f2 - 1][14]), g2[f2 - 1][15] = (a2.length - 1) * 8 | 0;
        for (var k2 = 0; k2 < f2; ++k2) {
          for (var l2 = new Uint32Array(80), m2 = 0; m2 < 16; ++m2) l2[m2] = g2[k2][m2];
          for (var n2 = 16; n2 < 80; ++n2) l2[n2] = B(l2[n2 - 3] ^ l2[n2 - 8] ^ l2[n2 - 14] ^ l2[n2 - 16], 1);
          for (var o2 = c2[0], p2 = c2[1], q2 = c2[2], r2 = c2[3], s2 = c2[4], t2 = 0; t2 < 80; ++t2) {
            var u2 = Math.floor(t2 / 20), v2 = B(o2, 5) + function(a3, b3, c3, d3) {
              switch (a3) {
                case 0:
                  return b3 & c3 ^ ~b3 & d3;
                case 1:
                case 3:
                  return b3 ^ c3 ^ d3;
                case 2:
                  return b3 & c3 ^ b3 & d3 ^ c3 & d3;
              }
            }(u2, p2, q2, r2) + s2 + b2[u2] + l2[t2] >>> 0;
            s2 = r2, r2 = q2, q2 = B(p2, 30) >>> 0, p2 = o2, o2 = v2;
          }
          c2[0] = c2[0] + o2 >>> 0, c2[1] = c2[1] + p2 >>> 0, c2[2] = c2[2] + q2 >>> 0, c2[3] = c2[3] + r2 >>> 0, c2[4] = c2[4] + s2 >>> 0;
        }
        return [c2[0] >> 24 & 255, c2[0] >> 16 & 255, c2[0] >> 8 & 255, 255 & c2[0], c2[1] >> 24 & 255, c2[1] >> 16 & 255, c2[1] >> 8 & 255, 255 & c2[1], c2[2] >> 24 & 255, c2[2] >> 16 & 255, c2[2] >> 8 & 255, 255 & c2[2], c2[3] >> 24 & 255, c2[3] >> 16 & 255, c2[3] >> 8 & 255, 255 & c2[3], c2[4] >> 24 & 255, c2[4] >> 16 & 255, c2[4] >> 8 & 255, 255 & c2[4]];
      }), D = "00000000-0000-0000-0000-000000000000", E = function(a2) {
        if (!j(a2)) throw TypeError("Invalid UUID");
        return parseInt(a2.substr(14, 1), 16);
      };
    }, 28: (a, b, c) => {
      "use strict";
      c.d(b, { Ud: () => d.stringifyCookie, VO: () => d.ResponseCookies, tm: () => d.RequestCookies });
      var d = c(443);
    }, 58: (a, b, c) => {
      "use strict";
      c.d(b, { xl: () => g });
      let d = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class e {
        disable() {
          throw d;
        }
        getStore() {
        }
        run() {
          throw d;
        }
        exit() {
          throw d;
        }
        enterWith() {
          throw d;
        }
        static bind(a2) {
          return a2;
        }
      }
      let f = "undefined" != typeof globalThis && globalThis.AsyncLocalStorage;
      function g() {
        return f ? new f() : new e();
      }
    }, 115: (a, b, c) => {
      "use strict";
      c.d(b, { l: () => d });
      class d {
        static get(a2, b2, c2) {
          let d2 = Reflect.get(a2, b2, c2);
          return "function" == typeof d2 ? d2.bind(a2) : d2;
        }
        static set(a2, b2, c2, d2) {
          return Reflect.set(a2, b2, c2, d2);
        }
        static has(a2, b2) {
          return Reflect.has(a2, b2);
        }
        static deleteProperty(a2, b2) {
          return Reflect.deleteProperty(a2, b2);
        }
      }
    }, 128: (a, b, c) => {
      "use strict";
      c.d(b, { M1: () => e, FP: () => d });
      let d = (0, c(58).xl)();
      function e(a2) {
        throw Object.defineProperty(Error(`\`${a2}\` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context`), "__NEXT_ERROR_CODE", { value: "E251", enumerable: false, configurable: true });
      }
    }, 153: (a, b, c) => {
      "use strict";
      c.r(b), c.d(b, { default: () => f, hkdf: () => f });
      let d = async (a2, b2, c2, d2, e2) => {
        let { crypto: { subtle: f2 } } = (() => {
          if ("undefined" != typeof globalThis) return globalThis;
          if ("undefined" != typeof self) return self;
          if ("undefined" != typeof window) return window;
          throw Error("unable to locate global object");
        })();
        return new Uint8Array(await f2.deriveBits({ name: "HKDF", hash: `SHA-${a2.substr(3)}`, salt: c2, info: d2 }, await f2.importKey("raw", b2, "HKDF", false, ["deriveBits"]), e2 << 3));
      };
      function e(a2, b2) {
        if ("string" == typeof a2) return new TextEncoder().encode(a2);
        if (!(a2 instanceof Uint8Array)) throw TypeError(`"${b2}"" must be an instance of Uint8Array or a string`);
        return a2;
      }
      async function f(a2, b2, c2, f2, g) {
        return d(function(a3) {
          switch (a3) {
            case "sha256":
            case "sha384":
            case "sha512":
            case "sha1":
              return a3;
            default:
              throw TypeError('unsupported "digest" value');
          }
        }(a2), function(a3) {
          let b3 = e(a3, "ikm");
          if (!b3.byteLength) throw TypeError('"ikm" must be at least one byte in length');
          return b3;
        }(b2), e(c2, "salt"), function(a3) {
          let b3 = e(a3, "info");
          if (b3.byteLength > 1024) throw TypeError('"info" must not contain more than 1024 bytes');
          return b3;
        }(f2), function(a3, b3) {
          if ("number" != typeof a3 || !Number.isInteger(a3) || a3 < 1) throw TypeError('"keylen" must be a positive integer');
          if (a3 > 255 * (parseInt(b3.substr(3), 10) >> 3 || 20)) throw TypeError('"keylen" too large');
          return a3;
        }(g, a2));
      }
    }, 164: (a, b, c) => {
      "use strict";
      function d() {
        throw Object.defineProperty(Error('ImageResponse moved from "next/server" to "next/og" since Next.js 14, please import from "next/og" instead'), "__NEXT_ERROR_CODE", { value: "E183", enumerable: false, configurable: true });
      }
      c.r(b), c.d(b, { ImageResponse: () => d, NextRequest: () => f.J, NextResponse: () => g.R, URLPattern: () => l, after: () => n, connection: () => C, unstable_rootParams: () => V, userAgent: () => k, userAgentFromString: () => j });
      var e, f = c(742), g = c(388), h = c(449), i = c.n(h);
      function j(a2) {
        return { ...i()(a2), isBot: void 0 !== a2 && /Googlebot|Mediapartners-Google|AdsBot-Google|googleweblight|Storebot-Google|Google-PageRenderer|Google-InspectionTool|Bingbot|BingPreview|Slurp|DuckDuckBot|baiduspider|yandex|sogou|LinkedInBot|bitlybot|tumblr|vkShare|quora link preview|facebookexternalhit|facebookcatalog|Twitterbot|applebot|redditbot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|ia_archiver/i.test(a2) };
      }
      function k({ headers: a2 }) {
        return j(a2.get("user-agent") || void 0);
      }
      let l = "undefined" == typeof URLPattern ? void 0 : URLPattern;
      var m = c(379);
      function n(a2) {
        let b2 = m.J.getStore();
        if (!b2) throw Object.defineProperty(Error("`after` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context"), "__NEXT_ERROR_CODE", { value: "E468", enumerable: false, configurable: true });
        let { afterContext: c2 } = b2;
        return c2.after(a2);
      }
      var o = c(128), p = c(814);
      class q extends Error {
        constructor(a2) {
          super("Dynamic server usage: " + a2), this.description = a2, this.digest = "DYNAMIC_SERVER_USAGE";
        }
      }
      class r extends Error {
        constructor(...a2) {
          super(...a2), this.code = "NEXT_STATIC_GEN_BAILOUT";
        }
      }
      class s extends Error {
        constructor(a2, b2) {
          super(`During prerendering, ${b2} rejects when the prerender is complete. Typically these errors are handled by React but if you move ${b2} to a different context by using \`setTimeout\`, \`after\`, or similar functions you may observe this error and you should handle it in that context. This occurred at route "${a2}".`), this.route = a2, this.expression = b2, this.digest = "HANGING_PROMISE_REJECTION";
        }
      }
      let t = /* @__PURE__ */ new WeakMap();
      function u(a2, b2, c2) {
        if (a2.aborted) return Promise.reject(new s(b2, c2));
        {
          let d2 = new Promise((d3, e2) => {
            let f2 = e2.bind(null, new s(b2, c2)), g2 = t.get(a2);
            if (g2) g2.push(f2);
            else {
              let b3 = [f2];
              t.set(a2, b3), a2.addEventListener("abort", () => {
                for (let a3 = 0; a3 < b3.length; a3++) b3[a3]();
              }, { once: true });
            }
          });
          return d2.catch(v), d2;
        }
      }
      function v() {
      }
      var w = c(809);
      let x = "function" == typeof p.unstable_postpone;
      function y(a2, b2, c2) {
        let d2 = Object.defineProperty(new q(`Route ${b2.route} couldn't be rendered statically because it used \`${a2}\`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error`), "__NEXT_ERROR_CODE", { value: "E558", enumerable: false, configurable: true });
        throw c2.revalidate = 0, b2.dynamicUsageDescription = a2, b2.dynamicUsageStack = d2.stack, d2;
      }
      function z(a2, b2, c2) {
        (function() {
          if (!x) throw Object.defineProperty(Error("Invariant: React.unstable_postpone is not defined. This suggests the wrong version of React was loaded. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E224", enumerable: false, configurable: true });
        })(), c2 && c2.dynamicAccesses.push({ stack: c2.isDebugDynamicAccesses ? Error().stack : void 0, expression: b2 }), p.unstable_postpone(A(a2, b2));
      }
      function A(a2, b2) {
        return `Route ${a2} needs to bail out of prerendering at this point because it used ${b2}. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error`;
      }
      if (false === function(a2) {
        return a2.includes("needs to bail out of prerendering at this point because it used") && a2.includes("Learn more: https://nextjs.org/docs/messages/ppr-caught-error");
      }(A("%%%", "^^^"))) throw Object.defineProperty(Error("Invariant: isDynamicPostpone misidentified a postpone reason. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E296", enumerable: false, configurable: true });
      RegExp(`\\n\\s+at Suspense \\(<anonymous>\\)(?:(?!\\n\\s+at (?:body|div|main|section|article|aside|header|footer|nav|form|p|span|h1|h2|h3|h4|h5|h6) \\(<anonymous>\\))[\\s\\S])*?\\n\\s+at __next_root_layout_boundary__ \\([^\\n]*\\)`), RegExp(`\\n\\s+at __next_metadata_boundary__[\\n\\s]`), RegExp(`\\n\\s+at __next_viewport_boundary__[\\n\\s]`), RegExp(`\\n\\s+at __next_outlet_boundary__[\\n\\s]`);
      var B = c(566);
      function C() {
        let a2 = m.J.getStore(), b2 = o.FP.getStore();
        if (a2) {
          if (b2 && "after" === b2.phase && !function() {
            let a3 = B.Z.getStore();
            return (null == a3 ? void 0 : a3.rootTaskSpawnPhase) === "action";
          }()) throw Object.defineProperty(Error(`Route ${a2.route} used "connection" inside "after(...)". The \`connection()\` function is used to indicate the subsequent code must only run when there is an actual Request, but "after(...)" executes after the request, so this function is not allowed in this scope. See more info here: https://nextjs.org/docs/canary/app/api-reference/functions/after`), "__NEXT_ERROR_CODE", { value: "E186", enumerable: false, configurable: true });
          if (a2.forceStatic) return Promise.resolve(void 0);
          if (a2.dynamicShouldError) throw Object.defineProperty(new r(`Route ${a2.route} with \`dynamic = "error"\` couldn't be rendered statically because it used \`connection\`. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", { value: "E562", enumerable: false, configurable: true });
          if (b2) switch (b2.type) {
            case "cache": {
              let b3 = Object.defineProperty(Error(`Route ${a2.route} used "connection" inside "use cache". The \`connection()\` function is used to indicate the subsequent code must only run when there is an actual request, but caches must be able to be produced before a request, so this function is not allowed in this scope. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", { value: "E752", enumerable: false, configurable: true });
              throw Error.captureStackTrace(b3, C), a2.invalidDynamicUsageError ??= b3, b3;
            }
            case "private-cache": {
              let b3 = Object.defineProperty(Error(`Route ${a2.route} used "connection" inside "use cache: private". The \`connection()\` function is used to indicate the subsequent code must only run when there is an actual navigation request, but caches must be able to be produced before a navigation request, so this function is not allowed in this scope. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", { value: "E753", enumerable: false, configurable: true });
              throw Error.captureStackTrace(b3, C), a2.invalidDynamicUsageError ??= b3, b3;
            }
            case "unstable-cache":
              throw Object.defineProperty(Error(`Route ${a2.route} used "connection" inside a function cached with "unstable_cache(...)". The \`connection()\` function is used to indicate the subsequent code must only run when there is an actual Request, but caches must be able to be produced before a Request so this function is not allowed in this scope. See more info here: https://nextjs.org/docs/app/api-reference/functions/unstable_cache`), "__NEXT_ERROR_CODE", { value: "E1", enumerable: false, configurable: true });
            case "prerender":
            case "prerender-client":
            case "prerender-runtime":
              return u(b2.renderSignal, a2.route, "`connection()`");
            case "prerender-ppr":
              return z(a2.route, "connection", b2.dynamicTracking);
            case "prerender-legacy":
              return y("connection", a2, b2);
            case "request":
              return !function(a3) {
                switch (a3.type) {
                  case "cache":
                  case "unstable-cache":
                  case "private-cache":
                    return;
                }
              }(b2), Promise.resolve(void 0);
          }
        }
        (0, o.M1)("connection");
      }
      let D = /^[A-Za-z_$][A-Za-z0-9_$]*$/, E = /* @__PURE__ */ new Set(["hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toString", "valueOf", "toLocaleString", "then", "catch", "finally", "status", "displayName", "_debugInfo", "toJSON", "$$typeof", "__esModule"]);
      (0, c(58).xl)();
      let { env: F, stdout: G } = (null == (e = globalThis) ? void 0 : e.process) ?? {}, H = F && !F.NO_COLOR && (F.FORCE_COLOR || (null == G ? void 0 : G.isTTY) && !F.CI && "dumb" !== F.TERM), I = (a2, b2, c2, d2) => {
        let e2 = a2.substring(0, d2) + c2, f2 = a2.substring(d2 + b2.length), g2 = f2.indexOf(b2);
        return ~g2 ? e2 + I(f2, b2, c2, g2) : e2 + f2;
      }, J = (a2, b2, c2 = a2) => H ? (d2) => {
        let e2 = "" + d2, f2 = e2.indexOf(b2, a2.length);
        return ~f2 ? a2 + I(e2, b2, c2, f2) + b2 : a2 + e2 + b2;
      } : String, K = J("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m");
      J("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"), J("\x1B[3m", "\x1B[23m"), J("\x1B[4m", "\x1B[24m"), J("\x1B[7m", "\x1B[27m"), J("\x1B[8m", "\x1B[28m"), J("\x1B[9m", "\x1B[29m"), J("\x1B[30m", "\x1B[39m");
      let L = J("\x1B[31m", "\x1B[39m"), M = J("\x1B[32m", "\x1B[39m"), N = J("\x1B[33m", "\x1B[39m");
      J("\x1B[34m", "\x1B[39m");
      let O = J("\x1B[35m", "\x1B[39m");
      J("\x1B[38;2;173;127;168m", "\x1B[39m"), J("\x1B[36m", "\x1B[39m");
      let P = J("\x1B[37m", "\x1B[39m");
      J("\x1B[90m", "\x1B[39m"), J("\x1B[40m", "\x1B[49m"), J("\x1B[41m", "\x1B[49m"), J("\x1B[42m", "\x1B[49m"), J("\x1B[43m", "\x1B[49m"), J("\x1B[44m", "\x1B[49m"), J("\x1B[45m", "\x1B[49m"), J("\x1B[46m", "\x1B[49m"), J("\x1B[47m", "\x1B[49m");
      var Q = c(788);
      let R = { wait: P(K("\u25CB")), error: L(K("\u2A2F")), warn: N(K("\u26A0")), ready: "\u25B2", info: P(K(" ")), event: M(K("\u2713")), trace: O(K("\xBB")) }, S = { log: "log", warn: "warn", error: "error" }, T = new Q.q(1e4, (a2) => a2.length), U = /* @__PURE__ */ new WeakMap();
      async function V() {
        !function(...a3) {
          let b3 = a3.join(" ");
          T.has(b3) || (T.set(b3, b3), function(...a4) {
            !function(a5, ...b4) {
              ("" === b4[0] || void 0 === b4[0]) && 1 === b4.length && b4.shift();
              let c2 = a5 in S ? S[a5] : "log", d2 = R[a5];
              0 === b4.length ? console[c2]("") : 1 === b4.length && "string" == typeof b4[0] ? console[c2](" " + d2 + " " + b4[0]) : console[c2](" " + d2, ...b4);
            }("warn", ...a4);
          }(...a3));
        }("`unstable_rootParams()` is deprecated and will be removed in an upcoming major release. Import specific root params from `next/root-params` instead.");
        let a2 = m.J.getStore();
        if (!a2) throw Object.defineProperty(new w.z("Missing workStore in unstable_rootParams"), "__NEXT_ERROR_CODE", { value: "E615", enumerable: false, configurable: true });
        let b2 = o.FP.getStore();
        if (!b2) throw Object.defineProperty(Error(`Route ${a2.route} used \`unstable_rootParams()\` in Pages Router. This API is only available within App Router.`), "__NEXT_ERROR_CODE", { value: "E641", enumerable: false, configurable: true });
        switch (b2.type) {
          case "cache":
          case "unstable-cache":
            throw Object.defineProperty(Error(`Route ${a2.route} used \`unstable_rootParams()\` inside \`"use cache"\` or \`unstable_cache\`. Support for this API inside cache scopes is planned for a future version of Next.js.`), "__NEXT_ERROR_CODE", { value: "E642", enumerable: false, configurable: true });
          case "prerender":
          case "prerender-client":
          case "prerender-ppr":
          case "prerender-legacy":
            return function(a3, b3, c2) {
              switch (c2.type) {
                case "prerender-client": {
                  let a4 = "`unstable_rootParams`";
                  throw Object.defineProperty(new w.z(`${a4} must not be used within a client component. Next.js should be preventing ${a4} from being included in client components statically, but did not in this case.`), "__NEXT_ERROR_CODE", { value: "E693", enumerable: false, configurable: true });
                }
                case "prerender": {
                  let d2 = c2.fallbackRouteParams;
                  if (d2) {
                    for (let e2 in a3) if (d2.has(e2)) {
                      let d3 = U.get(a3);
                      if (d3) return d3;
                      let e3 = u(c2.renderSignal, b3.route, "`unstable_rootParams`");
                      return U.set(a3, e3), e3;
                    }
                  }
                  break;
                }
                case "prerender-ppr": {
                  let d2 = c2.fallbackRouteParams;
                  if (d2) {
                    for (let e2 in a3) if (d2.has(e2)) return function(a4, b4, c3, d3) {
                      let e3 = U.get(a4);
                      if (e3) return e3;
                      let f2 = { ...a4 }, g2 = Promise.resolve(f2);
                      return U.set(a4, g2), Object.keys(a4).forEach((e4) => {
                        E.has(e4) || (b4.has(e4) ? Object.defineProperty(f2, e4, { get() {
                          var a5;
                          let b5 = (a5 = "unstable_rootParams", D.test(e4) ? "`" + a5 + "." + e4 + "`" : "`" + a5 + "[" + JSON.stringify(e4) + "]`");
                          "prerender-ppr" === d3.type ? z(c3.route, b5, d3.dynamicTracking) : y(b5, c3, d3);
                        }, enumerable: true }) : g2[e4] = a4[e4]);
                      }), g2;
                    }(a3, d2, b3, c2);
                  }
                }
              }
              return Promise.resolve(a3);
            }(b2.rootParams, a2, b2);
          case "private-cache":
          case "prerender-runtime":
          case "request":
            return Promise.resolve(b2.rootParams);
          default:
            return b2;
        }
      }
    }, 165: (a, b, c) => {
      "use strict";
      var d = c(356).Buffer;
      Object.defineProperty(b, "__esModule", { value: true }), !function(a2, b2) {
        for (var c2 in b2) Object.defineProperty(a2, c2, { enumerable: true, get: b2[c2] });
      }(b, { handleFetch: function() {
        return h;
      }, interceptFetch: function() {
        return i;
      }, reader: function() {
        return f;
      } });
      let e = c(392), f = { url: (a2) => a2.url, header: (a2, b2) => a2.headers.get(b2) };
      async function g(a2, b2) {
        let { url: c2, method: e2, headers: f2, body: g2, cache: h2, credentials: i2, integrity: j, mode: k, redirect: l, referrer: m, referrerPolicy: n } = b2;
        return { testData: a2, api: "fetch", request: { url: c2, method: e2, headers: [...Array.from(f2), ["next-test-stack", function() {
          let a3 = (Error().stack ?? "").split("\n");
          for (let b3 = 1; b3 < a3.length; b3++) if (a3[b3].length > 0) {
            a3 = a3.slice(b3);
            break;
          }
          return (a3 = (a3 = (a3 = a3.filter((a4) => !a4.includes("/next/dist/"))).slice(0, 5)).map((a4) => a4.replace("webpack-internal:///(rsc)/", "").trim())).join("    ");
        }()]], body: g2 ? d.from(await b2.arrayBuffer()).toString("base64") : null, cache: h2, credentials: i2, integrity: j, mode: k, redirect: l, referrer: m, referrerPolicy: n } };
      }
      async function h(a2, b2) {
        let c2 = (0, e.getTestReqInfo)(b2, f);
        if (!c2) return a2(b2);
        let { testData: h2, proxyPort: i2 } = c2, j = await g(h2, b2), k = await a2(`http://localhost:${i2}`, { method: "POST", body: JSON.stringify(j), next: { internal: true } });
        if (!k.ok) throw Object.defineProperty(Error(`Proxy request failed: ${k.status}`), "__NEXT_ERROR_CODE", { value: "E146", enumerable: false, configurable: true });
        let l = await k.json(), { api: m } = l;
        switch (m) {
          case "continue":
            return a2(b2);
          case "abort":
          case "unhandled":
            throw Object.defineProperty(Error(`Proxy request aborted [${b2.method} ${b2.url}]`), "__NEXT_ERROR_CODE", { value: "E145", enumerable: false, configurable: true });
          case "fetch":
            let { status: n, headers: o, body: p } = l.response;
            return new Response(p ? d.from(p, "base64") : null, { status: n, headers: new Headers(o) });
          default:
            return m;
        }
      }
      function i(a2) {
        return c.g.fetch = function(b2, c2) {
          var d2;
          return (null == c2 || null == (d2 = c2.next) ? void 0 : d2.internal) ? a2(b2, c2) : h(a2, new Request(b2, c2));
        }, () => {
          c.g.fetch = a2;
        };
      }
    }, 183: (a, b, c) => {
      "use strict";
      c.d(b, { AA: () => d, gW: () => h, h: () => e, kz: () => f, r4: () => g });
      let d = "nxtP", e = "nxtI", f = "x-prerender-revalidate", g = "x-prerender-revalidate-if-generated", h = "_N_T_", i = { shared: "shared", reactServerComponents: "rsc", serverSideRendering: "ssr", actionBrowser: "action-browser", apiNode: "api-node", apiEdge: "api-edge", middleware: "middleware", instrument: "instrument", edgeAsset: "edge-asset", appPagesBrowser: "app-pages-browser", pagesDirBrowser: "pages-dir-browser", pagesDirEdge: "pages-dir-edge", pagesDirNode: "pages-dir-node" };
      ({ ...i, GROUP: { builtinReact: [i.reactServerComponents, i.actionBrowser], serverOnly: [i.reactServerComponents, i.actionBrowser, i.instrument, i.middleware], neutralTarget: [i.apiNode, i.apiEdge], clientOnly: [i.serverSideRendering, i.appPagesBrowser], bundled: [i.reactServerComponents, i.actionBrowser, i.serverSideRendering, i.appPagesBrowser, i.shared, i.instrument, i.middleware], appPages: [i.reactServerComponents, i.serverSideRendering, i.appPagesBrowser, i.actionBrowser] } });
    }, 206: (a, b, c) => {
      "use strict";
      c.d(b, { Cu: () => g, RD: () => f, p$: () => e, qU: () => h, wN: () => i });
      var d = c(183);
      function e(a2) {
        let b2 = new Headers();
        for (let [c2, d2] of Object.entries(a2)) for (let a3 of Array.isArray(d2) ? d2 : [d2]) void 0 !== a3 && ("number" == typeof a3 && (a3 = a3.toString()), b2.append(c2, a3));
        return b2;
      }
      function f(a2) {
        var b2, c2, d2, e2, f2, g2 = [], h2 = 0;
        function i2() {
          for (; h2 < a2.length && /\s/.test(a2.charAt(h2)); ) h2 += 1;
          return h2 < a2.length;
        }
        for (; h2 < a2.length; ) {
          for (b2 = h2, f2 = false; i2(); ) if ("," === (c2 = a2.charAt(h2))) {
            for (d2 = h2, h2 += 1, i2(), e2 = h2; h2 < a2.length && "=" !== (c2 = a2.charAt(h2)) && ";" !== c2 && "," !== c2; ) h2 += 1;
            h2 < a2.length && "=" === a2.charAt(h2) ? (f2 = true, h2 = e2, g2.push(a2.substring(b2, d2)), b2 = h2) : h2 = d2 + 1;
          } else h2 += 1;
          (!f2 || h2 >= a2.length) && g2.push(a2.substring(b2, a2.length));
        }
        return g2;
      }
      function g(a2) {
        let b2 = {}, c2 = [];
        if (a2) for (let [d2, e2] of a2.entries()) "set-cookie" === d2.toLowerCase() ? (c2.push(...f(e2)), b2[d2] = 1 === c2.length ? c2[0] : c2) : b2[d2] = e2;
        return b2;
      }
      function h(a2) {
        try {
          return String(new URL(String(a2)));
        } catch (b2) {
          throw Object.defineProperty(Error(`URL is malformed "${String(a2)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, { cause: b2 }), "__NEXT_ERROR_CODE", { value: "E61", enumerable: false, configurable: true });
        }
      }
      function i(a2) {
        for (let b2 of [d.AA, d.h]) if (a2 !== b2 && a2.startsWith(b2)) return a2.substring(b2.length);
        return null;
      }
    }, 213: (a) => {
      (() => {
        "use strict";
        var b = { 993: (a2) => {
          var b2 = Object.prototype.hasOwnProperty, c2 = "~";
          function d2() {
          }
          function e2(a3, b3, c3) {
            this.fn = a3, this.context = b3, this.once = c3 || false;
          }
          function f(a3, b3, d3, f2, g2) {
            if ("function" != typeof d3) throw TypeError("The listener must be a function");
            var h2 = new e2(d3, f2 || a3, g2), i = c2 ? c2 + b3 : b3;
            return a3._events[i] ? a3._events[i].fn ? a3._events[i] = [a3._events[i], h2] : a3._events[i].push(h2) : (a3._events[i] = h2, a3._eventsCount++), a3;
          }
          function g(a3, b3) {
            0 == --a3._eventsCount ? a3._events = new d2() : delete a3._events[b3];
          }
          function h() {
            this._events = new d2(), this._eventsCount = 0;
          }
          Object.create && (d2.prototype = /* @__PURE__ */ Object.create(null), new d2().__proto__ || (c2 = false)), h.prototype.eventNames = function() {
            var a3, d3, e3 = [];
            if (0 === this._eventsCount) return e3;
            for (d3 in a3 = this._events) b2.call(a3, d3) && e3.push(c2 ? d3.slice(1) : d3);
            return Object.getOwnPropertySymbols ? e3.concat(Object.getOwnPropertySymbols(a3)) : e3;
          }, h.prototype.listeners = function(a3) {
            var b3 = c2 ? c2 + a3 : a3, d3 = this._events[b3];
            if (!d3) return [];
            if (d3.fn) return [d3.fn];
            for (var e3 = 0, f2 = d3.length, g2 = Array(f2); e3 < f2; e3++) g2[e3] = d3[e3].fn;
            return g2;
          }, h.prototype.listenerCount = function(a3) {
            var b3 = c2 ? c2 + a3 : a3, d3 = this._events[b3];
            return d3 ? d3.fn ? 1 : d3.length : 0;
          }, h.prototype.emit = function(a3, b3, d3, e3, f2, g2) {
            var h2 = c2 ? c2 + a3 : a3;
            if (!this._events[h2]) return false;
            var i, j, k = this._events[h2], l = arguments.length;
            if (k.fn) {
              switch (k.once && this.removeListener(a3, k.fn, void 0, true), l) {
                case 1:
                  return k.fn.call(k.context), true;
                case 2:
                  return k.fn.call(k.context, b3), true;
                case 3:
                  return k.fn.call(k.context, b3, d3), true;
                case 4:
                  return k.fn.call(k.context, b3, d3, e3), true;
                case 5:
                  return k.fn.call(k.context, b3, d3, e3, f2), true;
                case 6:
                  return k.fn.call(k.context, b3, d3, e3, f2, g2), true;
              }
              for (j = 1, i = Array(l - 1); j < l; j++) i[j - 1] = arguments[j];
              k.fn.apply(k.context, i);
            } else {
              var m, n = k.length;
              for (j = 0; j < n; j++) switch (k[j].once && this.removeListener(a3, k[j].fn, void 0, true), l) {
                case 1:
                  k[j].fn.call(k[j].context);
                  break;
                case 2:
                  k[j].fn.call(k[j].context, b3);
                  break;
                case 3:
                  k[j].fn.call(k[j].context, b3, d3);
                  break;
                case 4:
                  k[j].fn.call(k[j].context, b3, d3, e3);
                  break;
                default:
                  if (!i) for (m = 1, i = Array(l - 1); m < l; m++) i[m - 1] = arguments[m];
                  k[j].fn.apply(k[j].context, i);
              }
            }
            return true;
          }, h.prototype.on = function(a3, b3, c3) {
            return f(this, a3, b3, c3, false);
          }, h.prototype.once = function(a3, b3, c3) {
            return f(this, a3, b3, c3, true);
          }, h.prototype.removeListener = function(a3, b3, d3, e3) {
            var f2 = c2 ? c2 + a3 : a3;
            if (!this._events[f2]) return this;
            if (!b3) return g(this, f2), this;
            var h2 = this._events[f2];
            if (h2.fn) h2.fn !== b3 || e3 && !h2.once || d3 && h2.context !== d3 || g(this, f2);
            else {
              for (var i = 0, j = [], k = h2.length; i < k; i++) (h2[i].fn !== b3 || e3 && !h2[i].once || d3 && h2[i].context !== d3) && j.push(h2[i]);
              j.length ? this._events[f2] = 1 === j.length ? j[0] : j : g(this, f2);
            }
            return this;
          }, h.prototype.removeAllListeners = function(a3) {
            var b3;
            return a3 ? (b3 = c2 ? c2 + a3 : a3, this._events[b3] && g(this, b3)) : (this._events = new d2(), this._eventsCount = 0), this;
          }, h.prototype.off = h.prototype.removeListener, h.prototype.addListener = h.prototype.on, h.prefixed = c2, h.EventEmitter = h, a2.exports = h;
        }, 213: (a2) => {
          a2.exports = (a3, b2) => (b2 = b2 || (() => {
          }), a3.then((a4) => new Promise((a5) => {
            a5(b2());
          }).then(() => a4), (a4) => new Promise((a5) => {
            a5(b2());
          }).then(() => {
            throw a4;
          })));
        }, 574: (a2, b2) => {
          Object.defineProperty(b2, "__esModule", { value: true }), b2.default = function(a3, b3, c2) {
            let d2 = 0, e2 = a3.length;
            for (; e2 > 0; ) {
              let f = e2 / 2 | 0, g = d2 + f;
              0 >= c2(a3[g], b3) ? (d2 = ++g, e2 -= f + 1) : e2 = f;
            }
            return d2;
          };
        }, 821: (a2, b2, c2) => {
          Object.defineProperty(b2, "__esModule", { value: true });
          let d2 = c2(574);
          class e2 {
            constructor() {
              this._queue = [];
            }
            enqueue(a3, b3) {
              let c3 = { priority: (b3 = Object.assign({ priority: 0 }, b3)).priority, run: a3 };
              if (this.size && this._queue[this.size - 1].priority >= b3.priority) return void this._queue.push(c3);
              let e3 = d2.default(this._queue, c3, (a4, b4) => b4.priority - a4.priority);
              this._queue.splice(e3, 0, c3);
            }
            dequeue() {
              let a3 = this._queue.shift();
              return null == a3 ? void 0 : a3.run;
            }
            filter(a3) {
              return this._queue.filter((b3) => b3.priority === a3.priority).map((a4) => a4.run);
            }
            get size() {
              return this._queue.length;
            }
          }
          b2.default = e2;
        }, 816: (a2, b2, c2) => {
          let d2 = c2(213);
          class e2 extends Error {
            constructor(a3) {
              super(a3), this.name = "TimeoutError";
            }
          }
          let f = (a3, b3, c3) => new Promise((f2, g) => {
            if ("number" != typeof b3 || b3 < 0) throw TypeError("Expected `milliseconds` to be a positive number");
            if (b3 === 1 / 0) return void f2(a3);
            let h = setTimeout(() => {
              if ("function" == typeof c3) {
                try {
                  f2(c3());
                } catch (a4) {
                  g(a4);
                }
                return;
              }
              let d3 = "string" == typeof c3 ? c3 : `Promise timed out after ${b3} milliseconds`, h2 = c3 instanceof Error ? c3 : new e2(d3);
              "function" == typeof a3.cancel && a3.cancel(), g(h2);
            }, b3);
            d2(a3.then(f2, g), () => {
              clearTimeout(h);
            });
          });
          a2.exports = f, a2.exports.default = f, a2.exports.TimeoutError = e2;
        } }, c = {};
        function d(a2) {
          var e2 = c[a2];
          if (void 0 !== e2) return e2.exports;
          var f = c[a2] = { exports: {} }, g = true;
          try {
            b[a2](f, f.exports, d), g = false;
          } finally {
            g && delete c[a2];
          }
          return f.exports;
        }
        d.ab = "//";
        var e = {};
        (() => {
          Object.defineProperty(e, "__esModule", { value: true });
          let a2 = d(993), b2 = d(816), c2 = d(821), f = () => {
          }, g = new b2.TimeoutError();
          class h extends a2 {
            constructor(a3) {
              var b3, d2, e2, g2;
              if (super(), this._intervalCount = 0, this._intervalEnd = 0, this._pendingCount = 0, this._resolveEmpty = f, this._resolveIdle = f, !("number" == typeof (a3 = Object.assign({ carryoverConcurrencyCount: false, intervalCap: 1 / 0, interval: 0, concurrency: 1 / 0, autoStart: true, queueClass: c2.default }, a3)).intervalCap && a3.intervalCap >= 1)) throw TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${null != (d2 = null == (b3 = a3.intervalCap) ? void 0 : b3.toString()) ? d2 : ""}\` (${typeof a3.intervalCap})`);
              if (void 0 === a3.interval || !(Number.isFinite(a3.interval) && a3.interval >= 0)) throw TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${null != (g2 = null == (e2 = a3.interval) ? void 0 : e2.toString()) ? g2 : ""}\` (${typeof a3.interval})`);
              this._carryoverConcurrencyCount = a3.carryoverConcurrencyCount, this._isIntervalIgnored = a3.intervalCap === 1 / 0 || 0 === a3.interval, this._intervalCap = a3.intervalCap, this._interval = a3.interval, this._queue = new a3.queueClass(), this._queueClass = a3.queueClass, this.concurrency = a3.concurrency, this._timeout = a3.timeout, this._throwOnTimeout = true === a3.throwOnTimeout, this._isPaused = false === a3.autoStart;
            }
            get _doesIntervalAllowAnother() {
              return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
            }
            get _doesConcurrentAllowAnother() {
              return this._pendingCount < this._concurrency;
            }
            _next() {
              this._pendingCount--, this._tryToStartAnother(), this.emit("next");
            }
            _resolvePromises() {
              this._resolveEmpty(), this._resolveEmpty = f, 0 === this._pendingCount && (this._resolveIdle(), this._resolveIdle = f, this.emit("idle"));
            }
            _onResumeInterval() {
              this._onInterval(), this._initializeIntervalIfNeeded(), this._timeoutId = void 0;
            }
            _isIntervalPaused() {
              let a3 = Date.now();
              if (void 0 === this._intervalId) {
                let b3 = this._intervalEnd - a3;
                if (!(b3 < 0)) return void 0 === this._timeoutId && (this._timeoutId = setTimeout(() => {
                  this._onResumeInterval();
                }, b3)), true;
                this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
              }
              return false;
            }
            _tryToStartAnother() {
              if (0 === this._queue.size) return this._intervalId && clearInterval(this._intervalId), this._intervalId = void 0, this._resolvePromises(), false;
              if (!this._isPaused) {
                let a3 = !this._isIntervalPaused();
                if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
                  let b3 = this._queue.dequeue();
                  return !!b3 && (this.emit("active"), b3(), a3 && this._initializeIntervalIfNeeded(), true);
                }
              }
              return false;
            }
            _initializeIntervalIfNeeded() {
              this._isIntervalIgnored || void 0 !== this._intervalId || (this._intervalId = setInterval(() => {
                this._onInterval();
              }, this._interval), this._intervalEnd = Date.now() + this._interval);
            }
            _onInterval() {
              0 === this._intervalCount && 0 === this._pendingCount && this._intervalId && (clearInterval(this._intervalId), this._intervalId = void 0), this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0, this._processQueue();
            }
            _processQueue() {
              for (; this._tryToStartAnother(); ) ;
            }
            get concurrency() {
              return this._concurrency;
            }
            set concurrency(a3) {
              if (!("number" == typeof a3 && a3 >= 1)) throw TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${a3}\` (${typeof a3})`);
              this._concurrency = a3, this._processQueue();
            }
            async add(a3, c3 = {}) {
              return new Promise((d2, e2) => {
                let f2 = async () => {
                  this._pendingCount++, this._intervalCount++;
                  try {
                    let f3 = void 0 === this._timeout && void 0 === c3.timeout ? a3() : b2.default(Promise.resolve(a3()), void 0 === c3.timeout ? this._timeout : c3.timeout, () => {
                      (void 0 === c3.throwOnTimeout ? this._throwOnTimeout : c3.throwOnTimeout) && e2(g);
                    });
                    d2(await f3);
                  } catch (a4) {
                    e2(a4);
                  }
                  this._next();
                };
                this._queue.enqueue(f2, c3), this._tryToStartAnother(), this.emit("add");
              });
            }
            async addAll(a3, b3) {
              return Promise.all(a3.map(async (a4) => this.add(a4, b3)));
            }
            start() {
              return this._isPaused && (this._isPaused = false, this._processQueue()), this;
            }
            pause() {
              this._isPaused = true;
            }
            clear() {
              this._queue = new this._queueClass();
            }
            async onEmpty() {
              if (0 !== this._queue.size) return new Promise((a3) => {
                let b3 = this._resolveEmpty;
                this._resolveEmpty = () => {
                  b3(), a3();
                };
              });
            }
            async onIdle() {
              if (0 !== this._pendingCount || 0 !== this._queue.size) return new Promise((a3) => {
                let b3 = this._resolveIdle;
                this._resolveIdle = () => {
                  b3(), a3();
                };
              });
            }
            get size() {
              return this._queue.size;
            }
            sizeBy(a3) {
              return this._queue.filter(a3).length;
            }
            get pending() {
              return this._pendingCount;
            }
            get isPaused() {
              return this._isPaused;
            }
            get timeout() {
              return this._timeout;
            }
            set timeout(a3) {
              this._timeout = a3;
            }
          }
          e.default = h;
        })(), a.exports = e;
      })();
    }, 345: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
    }, 356: (a) => {
      "use strict";
      a.exports = (init_node_buffer(), __toCommonJS(node_buffer_exports));
    }, 379: (a, b, c) => {
      "use strict";
      c.d(b, { J: () => d });
      let d = (0, c(58).xl)();
    }, 388: (a, b, c) => {
      "use strict";
      c.d(b, { R: () => k });
      var d = c(28), e = c(700), f = c(206), g = c(115);
      let h = Symbol("internal response"), i = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
      function j(a2, b2) {
        var c2;
        if (null == a2 || null == (c2 = a2.request) ? void 0 : c2.headers) {
          if (!(a2.request.headers instanceof Headers)) throw Object.defineProperty(Error("request.headers must be an instance of Headers"), "__NEXT_ERROR_CODE", { value: "E119", enumerable: false, configurable: true });
          let c3 = [];
          for (let [d2, e2] of a2.request.headers) b2.set("x-middleware-request-" + d2, e2), c3.push(d2);
          b2.set("x-middleware-override-headers", c3.join(","));
        }
      }
      class k extends Response {
        constructor(a2, b2 = {}) {
          super(a2, b2);
          let c2 = this.headers, i2 = new Proxy(new d.VO(c2), { get(a3, e2, f2) {
            switch (e2) {
              case "delete":
              case "set":
                return (...f3) => {
                  let g2 = Reflect.apply(a3[e2], a3, f3), h2 = new Headers(c2);
                  return g2 instanceof d.VO && c2.set("x-middleware-set-cookie", g2.getAll().map((a4) => (0, d.Ud)(a4)).join(",")), j(b2, h2), g2;
                };
              default:
                return g.l.get(a3, e2, f2);
            }
          } });
          this[h] = { cookies: i2, url: b2.url ? new e.X(b2.url, { headers: (0, f.Cu)(c2), nextConfig: b2.nextConfig }) : void 0 };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, url: this.url, body: this.body, bodyUsed: this.bodyUsed, headers: Object.fromEntries(this.headers), ok: this.ok, redirected: this.redirected, status: this.status, statusText: this.statusText, type: this.type };
        }
        get cookies() {
          return this[h].cookies;
        }
        static json(a2, b2) {
          let c2 = Response.json(a2, b2);
          return new k(c2.body, c2);
        }
        static redirect(a2, b2) {
          let c2 = "number" == typeof b2 ? b2 : (null == b2 ? void 0 : b2.status) ?? 307;
          if (!i.has(c2)) throw Object.defineProperty(RangeError('Failed to execute "redirect" on "response": Invalid status code'), "__NEXT_ERROR_CODE", { value: "E529", enumerable: false, configurable: true });
          let d2 = "object" == typeof b2 ? b2 : {}, e2 = new Headers(null == d2 ? void 0 : d2.headers);
          return e2.set("Location", (0, f.qU)(a2)), new k(null, { ...d2, headers: e2, status: c2 });
        }
        static rewrite(a2, b2) {
          let c2 = new Headers(null == b2 ? void 0 : b2.headers);
          return c2.set("x-middleware-rewrite", (0, f.qU)(a2)), j(b2, c2), new k(null, { ...b2, headers: c2 });
        }
        static next(a2) {
          let b2 = new Headers(null == a2 ? void 0 : a2.headers);
          return b2.set("x-middleware-next", "1"), j(a2, b2), new k(null, { ...a2, headers: b2 });
        }
      }
    }, 392: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), !function(a2, b2) {
        for (var c2 in b2) Object.defineProperty(a2, c2, { enumerable: true, get: b2[c2] });
      }(b, { getTestReqInfo: function() {
        return g;
      }, withRequest: function() {
        return f;
      } });
      let d = new (c(521)).AsyncLocalStorage();
      function e(a2, b2) {
        let c2 = b2.header(a2, "next-test-proxy-port");
        if (!c2) return;
        let d2 = b2.url(a2);
        return { url: d2, proxyPort: Number(c2), testData: b2.header(a2, "next-test-data") || "" };
      }
      function f(a2, b2, c2) {
        let f2 = e(a2, b2);
        return f2 ? d.run(f2, c2) : c2();
      }
      function g(a2, b2) {
        let c2 = d.getStore();
        return c2 || (a2 && b2 ? e(a2, b2) : void 0);
      }
    }, 426: (a, b, c) => {
      "use strict";
      var d = c(522);
      Object.defineProperty(b, "__esModule", { value: true });
      var e = { encode: true, decode: true, getToken: true };
      b.decode = l, b.encode = k, b.getToken = m;
      var f = c(743), g = d(c(153)), h = c(1), i = c(674), j = c(345);
      async function k(a2) {
        let { token: b2 = {}, secret: c2, maxAge: d2 = 2592e3, salt: e2 = "" } = a2, g2 = await n(c2, e2);
        return await new f.EncryptJWT(b2).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setIssuedAt().setExpirationTime((Date.now() / 1e3 | 0) + d2).setJti((0, h.v4)()).encrypt(g2);
      }
      async function l(a2) {
        let { token: b2, secret: c2, salt: d2 = "" } = a2;
        if (!b2) return null;
        let e2 = await n(c2, d2), { payload: g2 } = await (0, f.jwtDecrypt)(b2, e2, { clockTolerance: 15 });
        return g2;
      }
      async function m(a2) {
        var b2, c2, d2, e2;
        let { req: f2, secureCookie: g2 = null != (b2 = null == (c2 = process.env.NEXTAUTH_URL) ? void 0 : c2.startsWith("https://")) ? b2 : !!process.env.VERCEL, cookieName: h2 = g2 ? "__Secure-next-auth.session-token" : "next-auth.session-token", raw: j2, decode: k2 = l, logger: m2 = console, secret: n2 = null != (d2 = process.env.NEXTAUTH_SECRET) ? d2 : process.env.AUTH_SECRET } = a2;
        if (!f2) throw Error("Must pass `req` to JWT getToken()");
        let o = new i.SessionStore({ name: h2, options: { secure: g2 } }, { cookies: f2.cookies, headers: f2.headers }, m2).value, p = f2.headers instanceof Headers ? f2.headers.get("authorization") : null == (e2 = f2.headers) ? void 0 : e2.authorization;
        if (o || (null == p ? void 0 : p.split(" ")[0]) !== "Bearer" || (o = decodeURIComponent(p.split(" ")[1])), !o) return null;
        if (j2) return o;
        try {
          return await k2({ token: o, secret: n2 });
        } catch (a3) {
          return null;
        }
      }
      async function n(a2, b2) {
        return await (0, g.default)("sha256", a2, b2, `NextAuth.js Generated Encryption Key${b2 ? ` (${b2})` : ""}`, 32);
      }
      Object.keys(j).forEach(function(a2) {
        !("default" === a2 || "__esModule" === a2 || Object.prototype.hasOwnProperty.call(e, a2)) && (a2 in b && b[a2] === j[a2] || Object.defineProperty(b, a2, { enumerable: true, get: function() {
          return j[a2];
        } }));
      });
    }, 440: (a, b) => {
      "use strict";
      var c = { H: null, A: null };
      function d(a2) {
        var b2 = "https://react.dev/errors/" + a2;
        if (1 < arguments.length) {
          b2 += "?args[]=" + encodeURIComponent(arguments[1]);
          for (var c2 = 2; c2 < arguments.length; c2++) b2 += "&args[]=" + encodeURIComponent(arguments[c2]);
        }
        return "Minified React error #" + a2 + "; visit " + b2 + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
      }
      var e = Array.isArray;
      function f() {
      }
      var g = Symbol.for("react.transitional.element"), h = Symbol.for("react.portal"), i = Symbol.for("react.fragment"), j = Symbol.for("react.strict_mode"), k = Symbol.for("react.profiler"), l = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), n = Symbol.for("react.memo"), o = Symbol.for("react.lazy"), p = Symbol.iterator, q = Object.prototype.hasOwnProperty, r = Object.assign;
      function s(a2, b2, c2) {
        var d2 = c2.ref;
        return { $$typeof: g, type: a2, key: b2, ref: void 0 !== d2 ? d2 : null, props: c2 };
      }
      function t(a2) {
        return "object" == typeof a2 && null !== a2 && a2.$$typeof === g;
      }
      var u = /\/+/g;
      function v(a2, b2) {
        var c2, d2;
        return "object" == typeof a2 && null !== a2 && null != a2.key ? (c2 = "" + a2.key, d2 = { "=": "=0", ":": "=2" }, "$" + c2.replace(/[=:]/g, function(a3) {
          return d2[a3];
        })) : b2.toString(36);
      }
      function w(a2, b2, c2) {
        if (null == a2) return a2;
        var i2 = [], j2 = 0;
        return !function a3(b3, c3, i3, j3, k2) {
          var l2, m2, n2, q2 = typeof b3;
          ("undefined" === q2 || "boolean" === q2) && (b3 = null);
          var r2 = false;
          if (null === b3) r2 = true;
          else switch (q2) {
            case "bigint":
            case "string":
            case "number":
              r2 = true;
              break;
            case "object":
              switch (b3.$$typeof) {
                case g:
                case h:
                  r2 = true;
                  break;
                case o:
                  return a3((r2 = b3._init)(b3._payload), c3, i3, j3, k2);
              }
          }
          if (r2) return k2 = k2(b3), r2 = "" === j3 ? "." + v(b3, 0) : j3, e(k2) ? (i3 = "", null != r2 && (i3 = r2.replace(u, "$&/") + "/"), a3(k2, c3, i3, "", function(a4) {
            return a4;
          })) : null != k2 && (t(k2) && (l2 = k2, m2 = i3 + (null == k2.key || b3 && b3.key === k2.key ? "" : ("" + k2.key).replace(u, "$&/") + "/") + r2, k2 = s(l2.type, m2, l2.props)), c3.push(k2)), 1;
          r2 = 0;
          var w2 = "" === j3 ? "." : j3 + ":";
          if (e(b3)) for (var x2 = 0; x2 < b3.length; x2++) q2 = w2 + v(j3 = b3[x2], x2), r2 += a3(j3, c3, i3, q2, k2);
          else if ("function" == typeof (x2 = null === (n2 = b3) || "object" != typeof n2 ? null : "function" == typeof (n2 = p && n2[p] || n2["@@iterator"]) ? n2 : null)) for (b3 = x2.call(b3), x2 = 0; !(j3 = b3.next()).done; ) q2 = w2 + v(j3 = j3.value, x2++), r2 += a3(j3, c3, i3, q2, k2);
          else if ("object" === q2) {
            if ("function" == typeof b3.then) return a3(function(a4) {
              switch (a4.status) {
                case "fulfilled":
                  return a4.value;
                case "rejected":
                  throw a4.reason;
                default:
                  switch ("string" == typeof a4.status ? a4.then(f, f) : (a4.status = "pending", a4.then(function(b4) {
                    "pending" === a4.status && (a4.status = "fulfilled", a4.value = b4);
                  }, function(b4) {
                    "pending" === a4.status && (a4.status = "rejected", a4.reason = b4);
                  })), a4.status) {
                    case "fulfilled":
                      return a4.value;
                    case "rejected":
                      throw a4.reason;
                  }
              }
              throw a4;
            }(b3), c3, i3, j3, k2);
            throw Error(d(31, "[object Object]" === (c3 = String(b3)) ? "object with keys {" + Object.keys(b3).join(", ") + "}" : c3));
          }
          return r2;
        }(a2, i2, "", "", function(a3) {
          return b2.call(c2, a3, j2++);
        }), i2;
      }
      function x(a2) {
        if (-1 === a2._status) {
          var b2 = a2._result;
          (b2 = b2()).then(function(b3) {
            (0 === a2._status || -1 === a2._status) && (a2._status = 1, a2._result = b3);
          }, function(b3) {
            (0 === a2._status || -1 === a2._status) && (a2._status = 2, a2._result = b3);
          }), -1 === a2._status && (a2._status = 0, a2._result = b2);
        }
        if (1 === a2._status) return a2._result.default;
        throw a2._result;
      }
      function y() {
        return /* @__PURE__ */ new WeakMap();
      }
      function z() {
        return { s: 0, v: void 0, o: null, p: null };
      }
      b.Children = { map: w, forEach: function(a2, b2, c2) {
        w(a2, function() {
          b2.apply(this, arguments);
        }, c2);
      }, count: function(a2) {
        var b2 = 0;
        return w(a2, function() {
          b2++;
        }), b2;
      }, toArray: function(a2) {
        return w(a2, function(a3) {
          return a3;
        }) || [];
      }, only: function(a2) {
        if (!t(a2)) throw Error(d(143));
        return a2;
      } }, b.Fragment = i, b.Profiler = k, b.StrictMode = j, b.Suspense = m, b.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = c, b.cache = function(a2) {
        return function() {
          var b2 = c.A;
          if (!b2) return a2.apply(null, arguments);
          var d2 = b2.getCacheForType(y);
          void 0 === (b2 = d2.get(a2)) && (b2 = z(), d2.set(a2, b2)), d2 = 0;
          for (var e2 = arguments.length; d2 < e2; d2++) {
            var f2 = arguments[d2];
            if ("function" == typeof f2 || "object" == typeof f2 && null !== f2) {
              var g2 = b2.o;
              null === g2 && (b2.o = g2 = /* @__PURE__ */ new WeakMap()), void 0 === (b2 = g2.get(f2)) && (b2 = z(), g2.set(f2, b2));
            } else null === (g2 = b2.p) && (b2.p = g2 = /* @__PURE__ */ new Map()), void 0 === (b2 = g2.get(f2)) && (b2 = z(), g2.set(f2, b2));
          }
          if (1 === b2.s) return b2.v;
          if (2 === b2.s) throw b2.v;
          try {
            var h2 = a2.apply(null, arguments);
            return (d2 = b2).s = 1, d2.v = h2;
          } catch (a3) {
            throw (h2 = b2).s = 2, h2.v = a3, a3;
          }
        };
      }, b.cacheSignal = function() {
        var a2 = c.A;
        return a2 ? a2.cacheSignal() : null;
      }, b.captureOwnerStack = function() {
        return null;
      }, b.cloneElement = function(a2, b2, c2) {
        if (null == a2) throw Error(d(267, a2));
        var e2 = r({}, a2.props), f2 = a2.key;
        if (null != b2) for (g2 in void 0 !== b2.key && (f2 = "" + b2.key), b2) q.call(b2, g2) && "key" !== g2 && "__self" !== g2 && "__source" !== g2 && ("ref" !== g2 || void 0 !== b2.ref) && (e2[g2] = b2[g2]);
        var g2 = arguments.length - 2;
        if (1 === g2) e2.children = c2;
        else if (1 < g2) {
          for (var h2 = Array(g2), i2 = 0; i2 < g2; i2++) h2[i2] = arguments[i2 + 2];
          e2.children = h2;
        }
        return s(a2.type, f2, e2);
      }, b.createElement = function(a2, b2, c2) {
        var d2, e2 = {}, f2 = null;
        if (null != b2) for (d2 in void 0 !== b2.key && (f2 = "" + b2.key), b2) q.call(b2, d2) && "key" !== d2 && "__self" !== d2 && "__source" !== d2 && (e2[d2] = b2[d2]);
        var g2 = arguments.length - 2;
        if (1 === g2) e2.children = c2;
        else if (1 < g2) {
          for (var h2 = Array(g2), i2 = 0; i2 < g2; i2++) h2[i2] = arguments[i2 + 2];
          e2.children = h2;
        }
        if (a2 && a2.defaultProps) for (d2 in g2 = a2.defaultProps) void 0 === e2[d2] && (e2[d2] = g2[d2]);
        return s(a2, f2, e2);
      }, b.createRef = function() {
        return { current: null };
      }, b.forwardRef = function(a2) {
        return { $$typeof: l, render: a2 };
      }, b.isValidElement = t, b.lazy = function(a2) {
        return { $$typeof: o, _payload: { _status: -1, _result: a2 }, _init: x };
      }, b.memo = function(a2, b2) {
        return { $$typeof: n, type: a2, compare: void 0 === b2 ? null : b2 };
      }, b.use = function(a2) {
        return c.H.use(a2);
      }, b.useCallback = function(a2, b2) {
        return c.H.useCallback(a2, b2);
      }, b.useDebugValue = function() {
      }, b.useId = function() {
        return c.H.useId();
      }, b.useMemo = function(a2, b2) {
        return c.H.useMemo(a2, b2);
      }, b.version = "19.2.0-canary-0bdb9206-20250818";
    }, 443: (a) => {
      "use strict";
      var b = Object.defineProperty, c = Object.getOwnPropertyDescriptor, d = Object.getOwnPropertyNames, e = Object.prototype.hasOwnProperty, f = {};
      function g(a2) {
        var b2;
        let c2 = ["path" in a2 && a2.path && `Path=${a2.path}`, "expires" in a2 && (a2.expires || 0 === a2.expires) && `Expires=${("number" == typeof a2.expires ? new Date(a2.expires) : a2.expires).toUTCString()}`, "maxAge" in a2 && "number" == typeof a2.maxAge && `Max-Age=${a2.maxAge}`, "domain" in a2 && a2.domain && `Domain=${a2.domain}`, "secure" in a2 && a2.secure && "Secure", "httpOnly" in a2 && a2.httpOnly && "HttpOnly", "sameSite" in a2 && a2.sameSite && `SameSite=${a2.sameSite}`, "partitioned" in a2 && a2.partitioned && "Partitioned", "priority" in a2 && a2.priority && `Priority=${a2.priority}`].filter(Boolean), d2 = `${a2.name}=${encodeURIComponent(null != (b2 = a2.value) ? b2 : "")}`;
        return 0 === c2.length ? d2 : `${d2}; ${c2.join("; ")}`;
      }
      function h(a2) {
        let b2 = /* @__PURE__ */ new Map();
        for (let c2 of a2.split(/; */)) {
          if (!c2) continue;
          let a3 = c2.indexOf("=");
          if (-1 === a3) {
            b2.set(c2, "true");
            continue;
          }
          let [d2, e2] = [c2.slice(0, a3), c2.slice(a3 + 1)];
          try {
            b2.set(d2, decodeURIComponent(null != e2 ? e2 : "true"));
          } catch {
          }
        }
        return b2;
      }
      function i(a2) {
        if (!a2) return;
        let [[b2, c2], ...d2] = h(a2), { domain: e2, expires: f2, httponly: g2, maxage: i2, path: l2, samesite: m2, secure: n, partitioned: o, priority: p } = Object.fromEntries(d2.map(([a3, b3]) => [a3.toLowerCase().replace(/-/g, ""), b3]));
        {
          var q, r, s = { name: b2, value: decodeURIComponent(c2), domain: e2, ...f2 && { expires: new Date(f2) }, ...g2 && { httpOnly: true }, ..."string" == typeof i2 && { maxAge: Number(i2) }, path: l2, ...m2 && { sameSite: j.includes(q = (q = m2).toLowerCase()) ? q : void 0 }, ...n && { secure: true }, ...p && { priority: k.includes(r = (r = p).toLowerCase()) ? r : void 0 }, ...o && { partitioned: true } };
          let a3 = {};
          for (let b3 in s) s[b3] && (a3[b3] = s[b3]);
          return a3;
        }
      }
      ((a2, c2) => {
        for (var d2 in c2) b(a2, d2, { get: c2[d2], enumerable: true });
      })(f, { RequestCookies: () => l, ResponseCookies: () => m, parseCookie: () => h, parseSetCookie: () => i, stringifyCookie: () => g }), a.exports = ((a2, f2, g2, h2) => {
        if (f2 && "object" == typeof f2 || "function" == typeof f2) for (let i2 of d(f2)) e.call(a2, i2) || i2 === g2 || b(a2, i2, { get: () => f2[i2], enumerable: !(h2 = c(f2, i2)) || h2.enumerable });
        return a2;
      })(b({}, "__esModule", { value: true }), f);
      var j = ["strict", "lax", "none"], k = ["low", "medium", "high"], l = class {
        constructor(a2) {
          this._parsed = /* @__PURE__ */ new Map(), this._headers = a2;
          let b2 = a2.get("cookie");
          if (b2) for (let [a3, c2] of h(b2)) this._parsed.set(a3, { name: a3, value: c2 });
        }
        [Symbol.iterator]() {
          return this._parsed[Symbol.iterator]();
        }
        get size() {
          return this._parsed.size;
        }
        get(...a2) {
          let b2 = "string" == typeof a2[0] ? a2[0] : a2[0].name;
          return this._parsed.get(b2);
        }
        getAll(...a2) {
          var b2;
          let c2 = Array.from(this._parsed);
          if (!a2.length) return c2.map(([a3, b3]) => b3);
          let d2 = "string" == typeof a2[0] ? a2[0] : null == (b2 = a2[0]) ? void 0 : b2.name;
          return c2.filter(([a3]) => a3 === d2).map(([a3, b3]) => b3);
        }
        has(a2) {
          return this._parsed.has(a2);
        }
        set(...a2) {
          let [b2, c2] = 1 === a2.length ? [a2[0].name, a2[0].value] : a2, d2 = this._parsed;
          return d2.set(b2, { name: b2, value: c2 }), this._headers.set("cookie", Array.from(d2).map(([a3, b3]) => g(b3)).join("; ")), this;
        }
        delete(a2) {
          let b2 = this._parsed, c2 = Array.isArray(a2) ? a2.map((a3) => b2.delete(a3)) : b2.delete(a2);
          return this._headers.set("cookie", Array.from(b2).map(([a3, b3]) => g(b3)).join("; ")), c2;
        }
        clear() {
          return this.delete(Array.from(this._parsed.keys())), this;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map((a2) => `${a2.name}=${encodeURIComponent(a2.value)}`).join("; ");
        }
      }, m = class {
        constructor(a2) {
          var b2, c2, d2;
          this._parsed = /* @__PURE__ */ new Map(), this._headers = a2;
          let e2 = null != (d2 = null != (c2 = null == (b2 = a2.getSetCookie) ? void 0 : b2.call(a2)) ? c2 : a2.get("set-cookie")) ? d2 : [];
          for (let a3 of Array.isArray(e2) ? e2 : function(a4) {
            if (!a4) return [];
            var b3, c3, d3, e3, f2, g2 = [], h2 = 0;
            function i2() {
              for (; h2 < a4.length && /\s/.test(a4.charAt(h2)); ) h2 += 1;
              return h2 < a4.length;
            }
            for (; h2 < a4.length; ) {
              for (b3 = h2, f2 = false; i2(); ) if ("," === (c3 = a4.charAt(h2))) {
                for (d3 = h2, h2 += 1, i2(), e3 = h2; h2 < a4.length && "=" !== (c3 = a4.charAt(h2)) && ";" !== c3 && "," !== c3; ) h2 += 1;
                h2 < a4.length && "=" === a4.charAt(h2) ? (f2 = true, h2 = e3, g2.push(a4.substring(b3, d3)), b3 = h2) : h2 = d3 + 1;
              } else h2 += 1;
              (!f2 || h2 >= a4.length) && g2.push(a4.substring(b3, a4.length));
            }
            return g2;
          }(e2)) {
            let b3 = i(a3);
            b3 && this._parsed.set(b3.name, b3);
          }
        }
        get(...a2) {
          let b2 = "string" == typeof a2[0] ? a2[0] : a2[0].name;
          return this._parsed.get(b2);
        }
        getAll(...a2) {
          var b2;
          let c2 = Array.from(this._parsed.values());
          if (!a2.length) return c2;
          let d2 = "string" == typeof a2[0] ? a2[0] : null == (b2 = a2[0]) ? void 0 : b2.name;
          return c2.filter((a3) => a3.name === d2);
        }
        has(a2) {
          return this._parsed.has(a2);
        }
        set(...a2) {
          let [b2, c2, d2] = 1 === a2.length ? [a2[0].name, a2[0].value, a2[0]] : a2, e2 = this._parsed;
          return e2.set(b2, function(a3 = { name: "", value: "" }) {
            return "number" == typeof a3.expires && (a3.expires = new Date(a3.expires)), a3.maxAge && (a3.expires = new Date(Date.now() + 1e3 * a3.maxAge)), (null === a3.path || void 0 === a3.path) && (a3.path = "/"), a3;
          }({ name: b2, value: c2, ...d2 })), function(a3, b3) {
            for (let [, c3] of (b3.delete("set-cookie"), a3)) {
              let a4 = g(c3);
              b3.append("set-cookie", a4);
            }
          }(e2, this._headers), this;
        }
        delete(...a2) {
          let [b2, c2] = "string" == typeof a2[0] ? [a2[0]] : [a2[0].name, a2[0]];
          return this.set({ ...c2, name: b2, value: "", expires: /* @__PURE__ */ new Date(0) });
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map(g).join("; ");
        }
      };
    }, 449: (a, b, c) => {
      var d;
      (() => {
        var e = { 226: function(e2, f2) {
          !function(g2, h) {
            "use strict";
            var i = "function", j = "undefined", k = "object", l = "string", m = "major", n = "model", o = "name", p = "type", q = "vendor", r = "version", s = "architecture", t = "console", u = "mobile", v = "tablet", w = "smarttv", x = "wearable", y = "embedded", z = "Amazon", A = "Apple", B = "ASUS", C = "BlackBerry", D = "Browser", E = "Chrome", F = "Firefox", G = "Google", H = "Huawei", I = "Microsoft", J = "Motorola", K = "Opera", L = "Samsung", M = "Sharp", N = "Sony", O = "Xiaomi", P = "Zebra", Q = "Facebook", R = "Chromium OS", S = "Mac OS", T = function(a2, b2) {
              var c2 = {};
              for (var d2 in a2) b2[d2] && b2[d2].length % 2 == 0 ? c2[d2] = b2[d2].concat(a2[d2]) : c2[d2] = a2[d2];
              return c2;
            }, U = function(a2) {
              for (var b2 = {}, c2 = 0; c2 < a2.length; c2++) b2[a2[c2].toUpperCase()] = a2[c2];
              return b2;
            }, V = function(a2, b2) {
              return typeof a2 === l && -1 !== W(b2).indexOf(W(a2));
            }, W = function(a2) {
              return a2.toLowerCase();
            }, X = function(a2, b2) {
              if (typeof a2 === l) return a2 = a2.replace(/^\s\s*/, ""), typeof b2 === j ? a2 : a2.substring(0, 350);
            }, Y = function(a2, b2) {
              for (var c2, d2, e3, f3, g3, j2, l2 = 0; l2 < b2.length && !g3; ) {
                var m2 = b2[l2], n2 = b2[l2 + 1];
                for (c2 = d2 = 0; c2 < m2.length && !g3 && m2[c2]; ) if (g3 = m2[c2++].exec(a2)) for (e3 = 0; e3 < n2.length; e3++) j2 = g3[++d2], typeof (f3 = n2[e3]) === k && f3.length > 0 ? 2 === f3.length ? typeof f3[1] == i ? this[f3[0]] = f3[1].call(this, j2) : this[f3[0]] = f3[1] : 3 === f3.length ? typeof f3[1] !== i || f3[1].exec && f3[1].test ? this[f3[0]] = j2 ? j2.replace(f3[1], f3[2]) : void 0 : this[f3[0]] = j2 ? f3[1].call(this, j2, f3[2]) : void 0 : 4 === f3.length && (this[f3[0]] = j2 ? f3[3].call(this, j2.replace(f3[1], f3[2])) : h) : this[f3] = j2 || h;
                l2 += 2;
              }
            }, Z = function(a2, b2) {
              for (var c2 in b2) if (typeof b2[c2] === k && b2[c2].length > 0) {
                for (var d2 = 0; d2 < b2[c2].length; d2++) if (V(b2[c2][d2], a2)) return "?" === c2 ? h : c2;
              } else if (V(b2[c2], a2)) return "?" === c2 ? h : c2;
              return a2;
            }, $ = { ME: "4.90", "NT 3.11": "NT3.51", "NT 4.0": "NT4.0", 2e3: "NT 5.0", XP: ["NT 5.1", "NT 5.2"], Vista: "NT 6.0", 7: "NT 6.1", 8: "NT 6.2", 8.1: "NT 6.3", 10: ["NT 6.4", "NT 10.0"], RT: "ARM" }, _ = { browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [r, [o, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [r, [o, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [o, r], [/opios[\/ ]+([\w\.]+)/i], [r, [o, K + " Mini"]], [/\bopr\/([\w\.]+)/i], [r, [o, K]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i, /(ba?idubrowser)[\/ ]?([\w\.]+)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [o, r], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [r, [o, "UC" + D]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i], [r, [o, "WeChat(Win) Desktop"]], [/micromessenger\/([\w\.]+)/i], [r, [o, "WeChat"]], [/konqueror\/([\w\.]+)/i], [r, [o, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [r, [o, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [r, [o, "Yandex"]], [/(avast|avg)\/([\w\.]+)/i], [[o, /(.+)/, "$1 Secure " + D], r], [/\bfocus\/([\w\.]+)/i], [r, [o, F + " Focus"]], [/\bopt\/([\w\.]+)/i], [r, [o, K + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [r, [o, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [r, [o, "Dolphin"]], [/coast\/([\w\.]+)/i], [r, [o, K + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [r, [o, "MIUI " + D]], [/fxios\/([-\w\.]+)/i], [r, [o, F]], [/\bqihu|(qi?ho?o?|360)browser/i], [[o, "360 " + D]], [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i], [[o, /(.+)/, "$1 " + D], r], [/(comodo_dragon)\/([\w\.]+)/i], [[o, /_/g, " "], r], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i], [o, r], [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i], [o], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[o, Q], r], [/(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(chromium|instagram)[\/ ]([-\w\.]+)/i], [o, r], [/\bgsa\/([\w\.]+) .*safari\//i], [r, [o, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [r, [o, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [r, [o, E + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[o, E + " WebView"], r], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [r, [o, "Android " + D]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [o, r], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [r, [o, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [r, o], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [o, [r, Z, { "1.0": "/8", 1.2: "/1", 1.3: "/3", "2.0": "/412", "2.0.2": "/416", "2.0.3": "/417", "2.0.4": "/419", "?": "/" }]], [/(webkit|khtml)\/([\w\.]+)/i], [o, r], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[o, "Netscape"], r], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [r, [o, F + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [o, r], [/(cobalt)\/([\w\.]+)/i], [o, [r, /master.|lts./, ""]]], cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[s, "amd64"]], [/(ia32(?=;))/i], [[s, W]], [/((?:i[346]|x)86)[;\)]/i], [[s, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[s, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[s, "armhf"]], [/windows (ce|mobile); ppc;/i], [[s, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[s, /ower/, "", W]], [/(sun4\w)[;\)]/i], [[s, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[s, W]]], device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [n, [q, L], [p, v]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [n, [q, L], [p, u]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [n, [q, A], [p, u]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [n, [q, A], [p, v]], [/(macintosh);/i], [n, [q, A]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [n, [q, M], [p, u]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [n, [q, H], [p, v]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [n, [q, H], [p, u]], [/\b(poco[\w ]+)(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[n, /_/g, " "], [q, O], [p, u]], [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[n, /_/g, " "], [q, O], [p, v]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [n, [q, "OPPO"], [p, u]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [n, [q, "Vivo"], [p, u]], [/\b(rmx[12]\d{3})(?: bui|;|\))/i], [n, [q, "Realme"], [p, u]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [n, [q, J], [p, u]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [n, [q, J], [p, v]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [n, [q, "LG"], [p, v]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [n, [q, "LG"], [p, u]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [n, [q, "Lenovo"], [p, v]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[n, /_/g, " "], [q, "Nokia"], [p, u]], [/(pixel c)\b/i], [n, [q, G], [p, v]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [n, [q, G], [p, u]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [n, [q, N], [p, u]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[n, "Xperia Tablet"], [q, N], [p, v]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [n, [q, "OnePlus"], [p, u]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [n, [q, z], [p, v]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[n, /(.+)/g, "Fire Phone $1"], [q, z], [p, u]], [/(playbook);[-\w\),; ]+(rim)/i], [n, q, [p, v]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [n, [q, C], [p, u]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [n, [q, B], [p, v]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [n, [q, B], [p, u]], [/(nexus 9)/i], [n, [q, "HTC"], [p, v]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [q, [n, /_/g, " "], [p, u]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [n, [q, "Acer"], [p, v]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [n, [q, "Meizu"], [p, u]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [q, n, [p, u]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [q, n, [p, v]], [/(surface duo)/i], [n, [q, I], [p, v]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [n, [q, "Fairphone"], [p, u]], [/(u304aa)/i], [n, [q, "AT&T"], [p, u]], [/\bsie-(\w*)/i], [n, [q, "Siemens"], [p, u]], [/\b(rct\w+) b/i], [n, [q, "RCA"], [p, v]], [/\b(venue[\d ]{2,7}) b/i], [n, [q, "Dell"], [p, v]], [/\b(q(?:mv|ta)\w+) b/i], [n, [q, "Verizon"], [p, v]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [n, [q, "Barnes & Noble"], [p, v]], [/\b(tm\d{3}\w+) b/i], [n, [q, "NuVision"], [p, v]], [/\b(k88) b/i], [n, [q, "ZTE"], [p, v]], [/\b(nx\d{3}j) b/i], [n, [q, "ZTE"], [p, u]], [/\b(gen\d{3}) b.+49h/i], [n, [q, "Swiss"], [p, u]], [/\b(zur\d{3}) b/i], [n, [q, "Swiss"], [p, v]], [/\b((zeki)?tb.*\b) b/i], [n, [q, "Zeki"], [p, v]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[q, "Dragon Touch"], n, [p, v]], [/\b(ns-?\w{0,9}) b/i], [n, [q, "Insignia"], [p, v]], [/\b((nxa|next)-?\w{0,9}) b/i], [n, [q, "NextBook"], [p, v]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[q, "Voice"], n, [p, u]], [/\b(lvtel\-)?(v1[12]) b/i], [[q, "LvTel"], n, [p, u]], [/\b(ph-1) /i], [n, [q, "Essential"], [p, u]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [n, [q, "Envizen"], [p, v]], [/\b(trio[-\w\. ]+) b/i], [n, [q, "MachSpeed"], [p, v]], [/\btu_(1491) b/i], [n, [q, "Rotor"], [p, v]], [/(shield[\w ]+) b/i], [n, [q, "Nvidia"], [p, v]], [/(sprint) (\w+)/i], [q, n, [p, u]], [/(kin\.[onetw]{3})/i], [[n, /\./g, " "], [q, I], [p, u]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [n, [q, P], [p, v]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [n, [q, P], [p, u]], [/smart-tv.+(samsung)/i], [q, [p, w]], [/hbbtv.+maple;(\d+)/i], [[n, /^/, "SmartTV"], [q, L], [p, w]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[q, "LG"], [p, w]], [/(apple) ?tv/i], [q, [n, A + " TV"], [p, w]], [/crkey/i], [[n, E + "cast"], [q, G], [p, w]], [/droid.+aft(\w)( bui|\))/i], [n, [q, z], [p, w]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [n, [q, M], [p, w]], [/(bravia[\w ]+)( bui|\))/i], [n, [q, N], [p, w]], [/(mitv-\w{5}) bui/i], [n, [q, O], [p, w]], [/Hbbtv.*(technisat) (.*);/i], [q, n, [p, w]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[q, X], [n, X], [p, w]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[p, w]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [q, n, [p, t]], [/droid.+; (shield) bui/i], [n, [q, "Nvidia"], [p, t]], [/(playstation [345portablevi]+)/i], [n, [q, N], [p, t]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [n, [q, I], [p, t]], [/((pebble))app/i], [q, n, [p, x]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [n, [q, A], [p, x]], [/droid.+; (glass) \d/i], [n, [q, G], [p, x]], [/droid.+; (wt63?0{2,3})\)/i], [n, [q, P], [p, x]], [/(quest( 2| pro)?)/i], [n, [q, Q], [p, x]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [q, [p, y]], [/(aeobc)\b/i], [n, [q, z], [p, y]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i], [n, [p, u]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [n, [p, v]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[p, v]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[p, u]], [/(android[-\w\. ]{0,9});.+buil/i], [n, [q, "Generic"]]], engine: [[/windows.+ edge\/([\w\.]+)/i], [r, [o, "EdgeHTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [r, [o, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [o, r], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [r, o]], os: [[/microsoft (windows) (vista|xp)/i], [o, r], [/(windows) nt 6\.2; (arm)/i, /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i, /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i], [o, [r, Z, $]], [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[o, "Windows"], [r, Z, $]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /ios;fbsv\/([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[r, /_/g, "."], [o, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[o, S], [r, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [r, o], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [o, r], [/\(bb(10);/i], [r, [o, C]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [r, [o, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [r, [o, F + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [r, [o, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [r, [o, "watchOS"]], [/crkey\/([\d\.]+)/i], [r, [o, E + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[o, R], r], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [o, r], [/(sunos) ?([\w\.\d]*)/i], [[o, "Solaris"], r], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [o, r]] }, aa = function(a2, b2) {
              if (typeof a2 === k && (b2 = a2, a2 = h), !(this instanceof aa)) return new aa(a2, b2).getResult();
              var c2 = typeof g2 !== j && g2.navigator ? g2.navigator : h, d2 = a2 || (c2 && c2.userAgent ? c2.userAgent : ""), e3 = c2 && c2.userAgentData ? c2.userAgentData : h, f3 = b2 ? T(_, b2) : _, t2 = c2 && c2.userAgent == d2;
              return this.getBrowser = function() {
                var a3, b3 = {};
                return b3[o] = h, b3[r] = h, Y.call(b3, d2, f3.browser), b3[m] = typeof (a3 = b3[r]) === l ? a3.replace(/[^\d\.]/g, "").split(".")[0] : h, t2 && c2 && c2.brave && typeof c2.brave.isBrave == i && (b3[o] = "Brave"), b3;
              }, this.getCPU = function() {
                var a3 = {};
                return a3[s] = h, Y.call(a3, d2, f3.cpu), a3;
              }, this.getDevice = function() {
                var a3 = {};
                return a3[q] = h, a3[n] = h, a3[p] = h, Y.call(a3, d2, f3.device), t2 && !a3[p] && e3 && e3.mobile && (a3[p] = u), t2 && "Macintosh" == a3[n] && c2 && typeof c2.standalone !== j && c2.maxTouchPoints && c2.maxTouchPoints > 2 && (a3[n] = "iPad", a3[p] = v), a3;
              }, this.getEngine = function() {
                var a3 = {};
                return a3[o] = h, a3[r] = h, Y.call(a3, d2, f3.engine), a3;
              }, this.getOS = function() {
                var a3 = {};
                return a3[o] = h, a3[r] = h, Y.call(a3, d2, f3.os), t2 && !a3[o] && e3 && "Unknown" != e3.platform && (a3[o] = e3.platform.replace(/chrome os/i, R).replace(/macos/i, S)), a3;
              }, this.getResult = function() {
                return { ua: this.getUA(), browser: this.getBrowser(), engine: this.getEngine(), os: this.getOS(), device: this.getDevice(), cpu: this.getCPU() };
              }, this.getUA = function() {
                return d2;
              }, this.setUA = function(a3) {
                return d2 = typeof a3 === l && a3.length > 350 ? X(a3, 350) : a3, this;
              }, this.setUA(d2), this;
            };
            aa.VERSION = "1.0.35", aa.BROWSER = U([o, r, m]), aa.CPU = U([s]), aa.DEVICE = U([n, q, p, t, u, w, v, x, y]), aa.ENGINE = aa.OS = U([o, r]), typeof f2 !== j ? (e2.exports && (f2 = e2.exports = aa), f2.UAParser = aa) : c.amdO ? void 0 === (d = function() {
              return aa;
            }.call(b, c, b, a)) || (a.exports = d) : typeof g2 !== j && (g2.UAParser = aa);
            var ab = typeof g2 !== j && (g2.jQuery || g2.Zepto);
            if (ab && !ab.ua) {
              var ac = new aa();
              ab.ua = ac.getResult(), ab.ua.get = function() {
                return ac.getUA();
              }, ab.ua.set = function(a2) {
                ac.setUA(a2);
                var b2 = ac.getResult();
                for (var c2 in b2) ab.ua[c2] = b2[c2];
              };
            }
          }("object" == typeof window ? window : this);
        } }, f = {};
        function g(a2) {
          var b2 = f[a2];
          if (void 0 !== b2) return b2.exports;
          var c2 = f[a2] = { exports: {} }, d2 = true;
          try {
            e[a2].call(c2.exports, c2, c2.exports, g), d2 = false;
          } finally {
            d2 && delete f[a2];
          }
          return c2.exports;
        }
        g.ab = "//", a.exports = g(226);
      })();
    }, 521: (a) => {
      "use strict";
      a.exports = (init_node_async_hooks(), __toCommonJS(node_async_hooks_exports));
    }, 522: (a) => {
      a.exports = function(a2) {
        return a2 && a2.__esModule ? a2 : { default: a2 };
      }, a.exports.__esModule = true, a.exports.default = a.exports;
    }, 566: (a, b, c) => {
      "use strict";
      c.d(b, { Z: () => d });
      let d = (0, c(669).xl)();
    }, 583: (a, b, c) => {
      "use strict";
      c.d(b, { CB: () => d, Yq: () => e, l_: () => f });
      class d extends Error {
        constructor({ page: a2 }) {
          super(`The middleware "${a2}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
        }
      }
      class e extends Error {
        constructor() {
          super(`The request.page has been deprecated in favour of \`URLPattern\`.
  Read more: https://nextjs.org/docs/messages/middleware-request-page
  `);
        }
      }
      class f extends Error {
        constructor() {
          super(`The request.ua has been removed in favour of \`userAgent\` function.
  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
  `);
        }
      }
    }, 663: (a) => {
      (() => {
        "use strict";
        "undefined" != typeof __nccwpck_require__ && (__nccwpck_require__.ab = "//");
        var b = {};
        (() => {
          b.parse = function(b2, c2) {
            if ("string" != typeof b2) throw TypeError("argument str must be a string");
            for (var e2 = {}, f = b2.split(d), g = (c2 || {}).decode || a2, h = 0; h < f.length; h++) {
              var i = f[h], j = i.indexOf("=");
              if (!(j < 0)) {
                var k = i.substr(0, j).trim(), l = i.substr(++j, i.length).trim();
                '"' == l[0] && (l = l.slice(1, -1)), void 0 == e2[k] && (e2[k] = function(a3, b3) {
                  try {
                    return b3(a3);
                  } catch (b4) {
                    return a3;
                  }
                }(l, g));
              }
            }
            return e2;
          }, b.serialize = function(a3, b2, d2) {
            var f = d2 || {}, g = f.encode || c;
            if ("function" != typeof g) throw TypeError("option encode is invalid");
            if (!e.test(a3)) throw TypeError("argument name is invalid");
            var h = g(b2);
            if (h && !e.test(h)) throw TypeError("argument val is invalid");
            var i = a3 + "=" + h;
            if (null != f.maxAge) {
              var j = f.maxAge - 0;
              if (isNaN(j) || !isFinite(j)) throw TypeError("option maxAge is invalid");
              i += "; Max-Age=" + Math.floor(j);
            }
            if (f.domain) {
              if (!e.test(f.domain)) throw TypeError("option domain is invalid");
              i += "; Domain=" + f.domain;
            }
            if (f.path) {
              if (!e.test(f.path)) throw TypeError("option path is invalid");
              i += "; Path=" + f.path;
            }
            if (f.expires) {
              if ("function" != typeof f.expires.toUTCString) throw TypeError("option expires is invalid");
              i += "; Expires=" + f.expires.toUTCString();
            }
            if (f.httpOnly && (i += "; HttpOnly"), f.secure && (i += "; Secure"), f.sameSite) switch ("string" == typeof f.sameSite ? f.sameSite.toLowerCase() : f.sameSite) {
              case true:
              case "strict":
                i += "; SameSite=Strict";
                break;
              case "lax":
                i += "; SameSite=Lax";
                break;
              case "none":
                i += "; SameSite=None";
                break;
              default:
                throw TypeError("option sameSite is invalid");
            }
            return i;
          };
          var a2 = decodeURIComponent, c = encodeURIComponent, d = /; */, e = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
        })(), a.exports = b;
      })();
    }, 669: (a, b, c) => {
      "use strict";
      c.d(b, { $p: () => i, cg: () => h, xl: () => g });
      let d = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class e {
        disable() {
          throw d;
        }
        getStore() {
        }
        run() {
          throw d;
        }
        exit() {
          throw d;
        }
        enterWith() {
          throw d;
        }
        static bind(a2) {
          return a2;
        }
      }
      let f = "undefined" != typeof globalThis && globalThis.AsyncLocalStorage;
      function g() {
        return f ? new f() : new e();
      }
      function h(a2) {
        return f ? f.bind(a2) : e.bind(a2);
      }
      function i() {
        return f ? f.snapshot() : function(a2, ...b2) {
          return a2(...b2);
        };
      }
    }, 674: (a, b) => {
      "use strict";
      function c(a2, b2, c2) {
        d(a2, b2), b2.set(a2, c2);
      }
      function d(a2, b2) {
        if (b2.has(a2)) throw TypeError("Cannot initialize the same private elements twice on an object");
      }
      function e(a2, b2) {
        return a2.get(g(a2, b2));
      }
      function f(a2, b2, c2) {
        return a2.set(g(a2, b2), c2), c2;
      }
      function g(a2, b2, c2) {
        if ("function" == typeof a2 ? a2 === b2 : a2.has(b2)) return arguments.length < 3 ? b2 : c2;
        throw TypeError("Private element is not present on this object");
      }
      Object.defineProperty(b, "__esModule", { value: true }), b.SessionStore = void 0, b.defaultCookies = function(a2) {
        let b2 = a2 ? "__Secure-" : "";
        return { sessionToken: { name: `${b2}next-auth.session-token`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: a2 } }, callbackUrl: { name: `${b2}next-auth.callback-url`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: a2 } }, csrfToken: { name: `${a2 ? "__Host-" : ""}next-auth.csrf-token`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: a2 } }, pkceCodeVerifier: { name: `${b2}next-auth.pkce.code_verifier`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: a2, maxAge: 900 } }, state: { name: `${b2}next-auth.state`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: a2, maxAge: 900 } }, nonce: { name: `${b2}next-auth.nonce`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: a2 } } };
      };
      var h = /* @__PURE__ */ new WeakMap(), i = /* @__PURE__ */ new WeakMap(), j = /* @__PURE__ */ new WeakMap(), k = /* @__PURE__ */ new WeakSet();
      class l {
        constructor(a2, b2, g2) {
          !function(a3, b3) {
            d(a3, b3), b3.add(a3);
          }(this, k), c(this, h, {}), c(this, i, void 0), c(this, j, void 0), f(j, this, g2), f(i, this, a2);
          let { cookies: l2 } = b2, { name: m2 } = a2;
          if ("function" == typeof (null == l2 ? void 0 : l2.getAll)) for (let { name: a3, value: b3 } of l2.getAll()) a3.startsWith(m2) && (e(h, this)[a3] = b3);
          else if (l2 instanceof Map) for (let a3 of l2.keys()) a3.startsWith(m2) && (e(h, this)[a3] = l2.get(a3));
          else for (let a3 in l2) a3.startsWith(m2) && (e(h, this)[a3] = l2[a3]);
        }
        get value() {
          return Object.keys(e(h, this)).sort((a2, b2) => {
            var c2, d2;
            return parseInt(null != (c2 = a2.split(".").pop()) ? c2 : "0") - parseInt(null != (d2 = b2.split(".").pop()) ? d2 : "0");
          }).map((a2) => e(h, this)[a2]).join("");
        }
        chunk(a2, b2) {
          let c2 = g(k, this, n).call(this);
          for (let d2 of g(k, this, m).call(this, { name: e(i, this).name, value: a2, options: { ...e(i, this).options, ...b2 } })) c2[d2.name] = d2;
          return Object.values(c2);
        }
        clean() {
          return Object.values(g(k, this, n).call(this));
        }
      }
      function m(a2) {
        let b2 = Math.ceil(a2.value.length / 3933);
        if (1 === b2) return e(h, this)[a2.name] = a2.value, [a2];
        let c2 = [];
        for (let d2 = 0; d2 < b2; d2++) {
          let b3 = `${a2.name}.${d2}`, f2 = a2.value.substr(3933 * d2, 3933);
          c2.push({ ...a2, name: b3, value: f2 }), e(h, this)[b3] = f2;
        }
        return e(j, this).debug("CHUNKING_SESSION_COOKIE", { message: "Session cookie exceeds allowed 4096 bytes.", emptyCookieSize: 163, valueSize: a2.value.length, chunks: c2.map((a3) => a3.value.length + 163) }), c2;
      }
      function n() {
        let a2 = {};
        for (let c2 in e(h, this)) {
          var b2;
          null == (b2 = e(h, this)) || delete b2[c2], a2[c2] = { name: c2, value: "", options: { ...e(i, this).options, maxAge: 0 } };
        }
        return a2;
      }
      b.SessionStore = l;
    }, 675: (a, b) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), b.default = function(a2) {
        var b2;
        let c = new URL("http://localhost:3000/api/auth");
        a2 && !a2.startsWith("http") && (a2 = `https://${a2}`);
        let d = new URL(null != (b2 = a2) ? b2 : c), e = ("/" === d.pathname ? c.pathname : d.pathname).replace(/\/$/, ""), f = `${d.origin}${e}`;
        return { origin: d.origin, host: d.host, path: e, base: f, toString: () => f };
      };
    }, 700: (a, b, c) => {
      "use strict";
      function d(a2) {
        return a2.replace(/\/$/, "") || "/";
      }
      function e(a2) {
        let b2 = a2.indexOf("#"), c2 = a2.indexOf("?"), d2 = c2 > -1 && (b2 < 0 || c2 < b2);
        return d2 || b2 > -1 ? { pathname: a2.substring(0, d2 ? c2 : b2), query: d2 ? a2.substring(c2, b2 > -1 ? b2 : void 0) : "", hash: b2 > -1 ? a2.slice(b2) : "" } : { pathname: a2, query: "", hash: "" };
      }
      function f(a2, b2) {
        if (!a2.startsWith("/") || !b2) return a2;
        let { pathname: c2, query: d2, hash: f2 } = e(a2);
        return "" + b2 + c2 + d2 + f2;
      }
      function g(a2, b2) {
        if (!a2.startsWith("/") || !b2) return a2;
        let { pathname: c2, query: d2, hash: f2 } = e(a2);
        return "" + c2 + b2 + d2 + f2;
      }
      function h(a2, b2) {
        if ("string" != typeof a2) return false;
        let { pathname: c2 } = e(a2);
        return c2 === b2 || c2.startsWith(b2 + "/");
      }
      c.d(b, { X: () => n });
      let i = /* @__PURE__ */ new WeakMap();
      function j(a2, b2) {
        let c2;
        if (!b2) return { pathname: a2 };
        let d2 = i.get(b2);
        d2 || (d2 = b2.map((a3) => a3.toLowerCase()), i.set(b2, d2));
        let e2 = a2.split("/", 2);
        if (!e2[1]) return { pathname: a2 };
        let f2 = e2[1].toLowerCase(), g2 = d2.indexOf(f2);
        return g2 < 0 ? { pathname: a2 } : (c2 = b2[g2], { pathname: a2 = a2.slice(c2.length + 1) || "/", detectedLocale: c2 });
      }
      let k = /(?!^https?:\/\/)(127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)/;
      function l(a2, b2) {
        return new URL(String(a2).replace(k, "localhost"), b2 && String(b2).replace(k, "localhost"));
      }
      let m = Symbol("NextURLInternal");
      class n {
        constructor(a2, b2, c2) {
          let d2, e2;
          "object" == typeof b2 && "pathname" in b2 || "string" == typeof b2 ? (d2 = b2, e2 = c2 || {}) : e2 = c2 || b2 || {}, this[m] = { url: l(a2, d2 ?? e2.base), options: e2, basePath: "" }, this.analyze();
        }
        analyze() {
          var a2, b2, c2, d2, e2;
          let f2 = function(a3, b3) {
            var c3, d3;
            let { basePath: e3, i18n: f3, trailingSlash: g3 } = null != (c3 = b3.nextConfig) ? c3 : {}, i3 = { pathname: a3, trailingSlash: "/" !== a3 ? a3.endsWith("/") : g3 };
            e3 && h(i3.pathname, e3) && (i3.pathname = function(a4, b4) {
              if (!h(a4, b4)) return a4;
              let c4 = a4.slice(b4.length);
              return c4.startsWith("/") ? c4 : "/" + c4;
            }(i3.pathname, e3), i3.basePath = e3);
            let k2 = i3.pathname;
            if (i3.pathname.startsWith("/_next/data/") && i3.pathname.endsWith(".json")) {
              let a4 = i3.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
              i3.buildId = a4[0], k2 = "index" !== a4[1] ? "/" + a4.slice(1).join("/") : "/", true === b3.parseData && (i3.pathname = k2);
            }
            if (f3) {
              let a4 = b3.i18nProvider ? b3.i18nProvider.analyze(i3.pathname) : j(i3.pathname, f3.locales);
              i3.locale = a4.detectedLocale, i3.pathname = null != (d3 = a4.pathname) ? d3 : i3.pathname, !a4.detectedLocale && i3.buildId && (a4 = b3.i18nProvider ? b3.i18nProvider.analyze(k2) : j(k2, f3.locales)).detectedLocale && (i3.locale = a4.detectedLocale);
            }
            return i3;
          }(this[m].url.pathname, { nextConfig: this[m].options.nextConfig, parseData: true, i18nProvider: this[m].options.i18nProvider }), g2 = function(a3, b3) {
            let c3;
            if ((null == b3 ? void 0 : b3.host) && !Array.isArray(b3.host)) c3 = b3.host.toString().split(":", 1)[0];
            else {
              if (!a3.hostname) return;
              c3 = a3.hostname;
            }
            return c3.toLowerCase();
          }(this[m].url, this[m].options.headers);
          this[m].domainLocale = this[m].options.i18nProvider ? this[m].options.i18nProvider.detectDomainLocale(g2) : function(a3, b3, c3) {
            if (a3) for (let f3 of (c3 && (c3 = c3.toLowerCase()), a3)) {
              var d3, e3;
              if (b3 === (null == (d3 = f3.domain) ? void 0 : d3.split(":", 1)[0].toLowerCase()) || c3 === f3.defaultLocale.toLowerCase() || (null == (e3 = f3.locales) ? void 0 : e3.some((a4) => a4.toLowerCase() === c3))) return f3;
            }
          }(null == (b2 = this[m].options.nextConfig) || null == (a2 = b2.i18n) ? void 0 : a2.domains, g2);
          let i2 = (null == (c2 = this[m].domainLocale) ? void 0 : c2.defaultLocale) || (null == (e2 = this[m].options.nextConfig) || null == (d2 = e2.i18n) ? void 0 : d2.defaultLocale);
          this[m].url.pathname = f2.pathname, this[m].defaultLocale = i2, this[m].basePath = f2.basePath ?? "", this[m].buildId = f2.buildId, this[m].locale = f2.locale ?? i2, this[m].trailingSlash = f2.trailingSlash;
        }
        formatPathname() {
          var a2;
          let b2;
          return b2 = function(a3, b3, c2, d2) {
            if (!b3 || b3 === c2) return a3;
            let e2 = a3.toLowerCase();
            return !d2 && (h(e2, "/api") || h(e2, "/" + b3.toLowerCase())) ? a3 : f(a3, "/" + b3);
          }((a2 = { basePath: this[m].basePath, buildId: this[m].buildId, defaultLocale: this[m].options.forceLocale ? void 0 : this[m].defaultLocale, locale: this[m].locale, pathname: this[m].url.pathname, trailingSlash: this[m].trailingSlash }).pathname, a2.locale, a2.buildId ? void 0 : a2.defaultLocale, a2.ignorePrefix), (a2.buildId || !a2.trailingSlash) && (b2 = d(b2)), a2.buildId && (b2 = g(f(b2, "/_next/data/" + a2.buildId), "/" === a2.pathname ? "index.json" : ".json")), b2 = f(b2, a2.basePath), !a2.buildId && a2.trailingSlash ? b2.endsWith("/") ? b2 : g(b2, "/") : d(b2);
        }
        formatSearch() {
          return this[m].url.search;
        }
        get buildId() {
          return this[m].buildId;
        }
        set buildId(a2) {
          this[m].buildId = a2;
        }
        get locale() {
          return this[m].locale ?? "";
        }
        set locale(a2) {
          var b2, c2;
          if (!this[m].locale || !(null == (c2 = this[m].options.nextConfig) || null == (b2 = c2.i18n) ? void 0 : b2.locales.includes(a2))) throw Object.defineProperty(TypeError(`The NextURL configuration includes no locale "${a2}"`), "__NEXT_ERROR_CODE", { value: "E597", enumerable: false, configurable: true });
          this[m].locale = a2;
        }
        get defaultLocale() {
          return this[m].defaultLocale;
        }
        get domainLocale() {
          return this[m].domainLocale;
        }
        get searchParams() {
          return this[m].url.searchParams;
        }
        get host() {
          return this[m].url.host;
        }
        set host(a2) {
          this[m].url.host = a2;
        }
        get hostname() {
          return this[m].url.hostname;
        }
        set hostname(a2) {
          this[m].url.hostname = a2;
        }
        get port() {
          return this[m].url.port;
        }
        set port(a2) {
          this[m].url.port = a2;
        }
        get protocol() {
          return this[m].url.protocol;
        }
        set protocol(a2) {
          this[m].url.protocol = a2;
        }
        get href() {
          let a2 = this.formatPathname(), b2 = this.formatSearch();
          return `${this.protocol}//${this.host}${a2}${b2}${this.hash}`;
        }
        set href(a2) {
          this[m].url = l(a2), this.analyze();
        }
        get origin() {
          return this[m].url.origin;
        }
        get pathname() {
          return this[m].url.pathname;
        }
        set pathname(a2) {
          this[m].url.pathname = a2;
        }
        get hash() {
          return this[m].url.hash;
        }
        set hash(a2) {
          this[m].url.hash = a2;
        }
        get search() {
          return this[m].url.search;
        }
        set search(a2) {
          this[m].url.search = a2;
        }
        get password() {
          return this[m].url.password;
        }
        set password(a2) {
          this[m].url.password = a2;
        }
        get username() {
          return this[m].url.username;
        }
        set username(a2) {
          this[m].url.username = a2;
        }
        get basePath() {
          return this[m].basePath;
        }
        set basePath(a2) {
          this[m].basePath = a2.startsWith("/") ? a2 : `/${a2}`;
        }
        toString() {
          return this.href;
        }
        toJSON() {
          return this.href;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { href: this.href, origin: this.origin, protocol: this.protocol, username: this.username, password: this.password, host: this.host, hostname: this.hostname, port: this.port, pathname: this.pathname, search: this.search, searchParams: this.searchParams, hash: this.hash };
        }
        clone() {
          return new n(String(this), this[m].options);
        }
      }
    }, 720: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true }), !function(a2, b2) {
        for (var c2 in b2) Object.defineProperty(a2, c2, { enumerable: true, get: b2[c2] });
      }(b, { interceptTestApis: function() {
        return f;
      }, wrapRequestHandler: function() {
        return g;
      } });
      let d = c(392), e = c(165);
      function f() {
        return (0, e.interceptFetch)(c.g.fetch);
      }
      function g(a2) {
        return (b2, c2) => (0, d.withRequest)(b2, e.reader, () => a2(b2, c2));
      }
    }, 742: (a, b, c) => {
      "use strict";
      c.d(b, { J: () => i });
      var d = c(700), e = c(206), f = c(583), g = c(28);
      let h = Symbol("internal request");
      class i extends Request {
        constructor(a2, b2 = {}) {
          let c2 = "string" != typeof a2 && "url" in a2 ? a2.url : String(a2);
          (0, e.qU)(c2), a2 instanceof Request ? super(a2, b2) : super(c2, b2);
          let f2 = new d.X(c2, { headers: (0, e.Cu)(this.headers), nextConfig: b2.nextConfig });
          this[h] = { cookies: new g.tm(this.headers), nextUrl: f2, url: f2.toString() };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, nextUrl: this.nextUrl, url: this.url, bodyUsed: this.bodyUsed, cache: this.cache, credentials: this.credentials, destination: this.destination, headers: Object.fromEntries(this.headers), integrity: this.integrity, keepalive: this.keepalive, method: this.method, mode: this.mode, redirect: this.redirect, referrer: this.referrer, referrerPolicy: this.referrerPolicy, signal: this.signal };
        }
        get cookies() {
          return this[h].cookies;
        }
        get nextUrl() {
          return this[h].nextUrl;
        }
        get page() {
          throw new f.Yq();
        }
        get ua() {
          throw new f.l_();
        }
        get url() {
          return this[h].url;
        }
      }
    }, 743: (a, b, c) => {
      "use strict";
      c.r(b), c.d(b, { CompactEncrypt: () => bc, CompactSign: () => bf, EmbeddedJWK: () => bo, EncryptJWT: () => bk, FlattenedEncrypt: () => aY, FlattenedSign: () => be, GeneralEncrypt: () => a$, GeneralSign: () => bh, SignJWT: () => bj, UnsecuredJWT: () => bx, base64url: () => e, calculateJwkThumbprint: () => bm, calculateJwkThumbprintUri: () => bn, compactDecrypt: () => aQ, compactVerify: () => a3, createLocalJWKSet: () => bt, createRemoteJWKSet: () => bw, cryptoRuntime: () => bH, decodeJwt: () => bB, decodeProtectedHeader: () => bA, errors: () => d, exportJWK: () => aV, exportPKCS8: () => aU, exportSPKI: () => aT, flattenedDecrypt: () => aP, flattenedVerify: () => a2, generalDecrypt: () => aR, generalVerify: () => a4, generateKeyPair: () => bF, generateSecret: () => bG, importJWK: () => aF, importPKCS8: () => aE, importSPKI: () => aC, importX509: () => aD, jwtDecrypt: () => bb, jwtVerify: () => ba });
      var d = {};
      c.r(d), c.d(d, { JOSEAlgNotAllowed: () => w, JOSEError: () => t, JOSENotSupported: () => x, JWEDecompressionFailed: () => z, JWEDecryptionFailed: () => y, JWEInvalid: () => A, JWKInvalid: () => D, JWKSInvalid: () => E, JWKSMultipleMatchingKeys: () => G, JWKSNoMatchingKey: () => F, JWKSTimeout: () => H, JWSInvalid: () => B, JWSSignatureVerificationFailed: () => I, JWTClaimValidationFailed: () => u, JWTExpired: () => v, JWTInvalid: () => C });
      var e = {};
      c.r(e), c.d(e, { decode: () => bz, encode: () => by });
      let f = crypto, g = async (a10, b2) => {
        let c2 = `SHA-${a10.slice(-3)}`;
        return new Uint8Array(await f.subtle.digest(c2, b2));
      }, h = new TextEncoder(), i = new TextDecoder();
      function j(...a10) {
        let b2 = new Uint8Array(a10.reduce((a11, { length: b3 }) => a11 + b3, 0)), c2 = 0;
        return a10.forEach((a11) => {
          b2.set(a11, c2), c2 += a11.length;
        }), b2;
      }
      function k(a10, b2, c2) {
        if (b2 < 0 || b2 >= 4294967296) throw RangeError(`value must be >= 0 and <= ${4294967296 - 1}. Received ${b2}`);
        a10.set([b2 >>> 24, b2 >>> 16, b2 >>> 8, 255 & b2], c2);
      }
      function l(a10) {
        let b2 = Math.floor(a10 / 4294967296), c2 = new Uint8Array(8);
        return k(c2, b2, 0), k(c2, a10 % 4294967296, 4), c2;
      }
      function m(a10) {
        let b2 = new Uint8Array(4);
        return k(b2, a10), b2;
      }
      function n(a10) {
        return j(m(a10.length), a10);
      }
      async function o(a10, b2, c2) {
        let d2 = Math.ceil((b2 >> 3) / 32), e2 = new Uint8Array(32 * d2);
        for (let b3 = 0; b3 < d2; b3++) {
          let d3 = new Uint8Array(4 + a10.length + c2.length);
          d3.set(m(b3 + 1)), d3.set(a10, 4), d3.set(c2, 4 + a10.length), e2.set(await g("sha256", d3), 32 * b3);
        }
        return e2.slice(0, b2 >> 3);
      }
      let p = (a10) => {
        let b2 = a10;
        "string" == typeof b2 && (b2 = h.encode(b2));
        let c2 = [];
        for (let a11 = 0; a11 < b2.length; a11 += 32768) c2.push(String.fromCharCode.apply(null, b2.subarray(a11, a11 + 32768)));
        return btoa(c2.join(""));
      }, q = (a10) => p(a10).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"), r = (a10) => {
        let b2 = atob(a10), c2 = new Uint8Array(b2.length);
        for (let a11 = 0; a11 < b2.length; a11++) c2[a11] = b2.charCodeAt(a11);
        return c2;
      }, s = (a10) => {
        let b2 = a10;
        b2 instanceof Uint8Array && (b2 = i.decode(b2)), b2 = b2.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
        try {
          return r(b2);
        } catch (a11) {
          throw TypeError("The input to be decoded is not correctly encoded.");
        }
      };
      class t extends Error {
        static get code() {
          return "ERR_JOSE_GENERIC";
        }
        constructor(a10) {
          var b2;
          super(a10), this.code = "ERR_JOSE_GENERIC", this.name = this.constructor.name, null == (b2 = Error.captureStackTrace) || b2.call(Error, this, this.constructor);
        }
      }
      class u extends t {
        static get code() {
          return "ERR_JWT_CLAIM_VALIDATION_FAILED";
        }
        constructor(a10, b2 = "unspecified", c2 = "unspecified") {
          super(a10), this.code = "ERR_JWT_CLAIM_VALIDATION_FAILED", this.claim = b2, this.reason = c2;
        }
      }
      class v extends t {
        static get code() {
          return "ERR_JWT_EXPIRED";
        }
        constructor(a10, b2 = "unspecified", c2 = "unspecified") {
          super(a10), this.code = "ERR_JWT_EXPIRED", this.claim = b2, this.reason = c2;
        }
      }
      class w extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
        }
        static get code() {
          return "ERR_JOSE_ALG_NOT_ALLOWED";
        }
      }
      class x extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JOSE_NOT_SUPPORTED";
        }
        static get code() {
          return "ERR_JOSE_NOT_SUPPORTED";
        }
      }
      class y extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWE_DECRYPTION_FAILED", this.message = "decryption operation failed";
        }
        static get code() {
          return "ERR_JWE_DECRYPTION_FAILED";
        }
      }
      class z extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWE_DECOMPRESSION_FAILED", this.message = "decompression operation failed";
        }
        static get code() {
          return "ERR_JWE_DECOMPRESSION_FAILED";
        }
      }
      class A extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWE_INVALID";
        }
        static get code() {
          return "ERR_JWE_INVALID";
        }
      }
      class B extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWS_INVALID";
        }
        static get code() {
          return "ERR_JWS_INVALID";
        }
      }
      class C extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWT_INVALID";
        }
        static get code() {
          return "ERR_JWT_INVALID";
        }
      }
      class D extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWK_INVALID";
        }
        static get code() {
          return "ERR_JWK_INVALID";
        }
      }
      class E extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_INVALID";
        }
        static get code() {
          return "ERR_JWKS_INVALID";
        }
      }
      class F extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_NO_MATCHING_KEY", this.message = "no applicable key found in the JSON Web Key Set";
        }
        static get code() {
          return "ERR_JWKS_NO_MATCHING_KEY";
        }
      }
      class G extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS", this.message = "multiple matching keys found in the JSON Web Key Set";
        }
        static get code() {
          return "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
        }
      }
      Symbol.asyncIterator;
      class H extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_TIMEOUT", this.message = "request timed out";
        }
        static get code() {
          return "ERR_JWKS_TIMEOUT";
        }
      }
      class I extends t {
        constructor() {
          super(...arguments), this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED", this.message = "signature verification failed";
        }
        static get code() {
          return "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
        }
      }
      let J = f.getRandomValues.bind(f);
      function K(a10) {
        switch (a10) {
          case "A128GCM":
          case "A128GCMKW":
          case "A192GCM":
          case "A192GCMKW":
          case "A256GCM":
          case "A256GCMKW":
            return 96;
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return 128;
          default:
            throw new x(`Unsupported JWE Algorithm: ${a10}`);
        }
      }
      let L = (a10) => J(new Uint8Array(K(a10) >> 3)), M = (a10, b2) => {
        if (b2.length << 3 !== K(a10)) throw new A("Invalid Initialization Vector length");
      }, N = (a10, b2) => {
        let c2 = a10.byteLength << 3;
        if (c2 !== b2) throw new A(`Invalid Content Encryption Key length. Expected ${b2} bits, got ${c2} bits`);
      };
      function O(a10, b2 = "algorithm.name") {
        return TypeError(`CryptoKey does not support this operation, its ${b2} must be ${a10}`);
      }
      function P(a10, b2) {
        return a10.name === b2;
      }
      function Q(a10) {
        return parseInt(a10.name.slice(4), 10);
      }
      function R(a10, b2) {
        if (b2.length && !b2.some((b3) => a10.usages.includes(b3))) {
          let a11 = "CryptoKey does not support this operation, its usages must include ";
          if (b2.length > 2) {
            let c2 = b2.pop();
            a11 += `one of ${b2.join(", ")}, or ${c2}.`;
          } else 2 === b2.length ? a11 += `one of ${b2[0]} or ${b2[1]}.` : a11 += `${b2[0]}.`;
          throw TypeError(a11);
        }
      }
      function S(a10, b2, ...c2) {
        switch (b2) {
          case "A128GCM":
          case "A192GCM":
          case "A256GCM": {
            if (!P(a10.algorithm, "AES-GCM")) throw O("AES-GCM");
            let c3 = parseInt(b2.slice(1, 4), 10);
            if (a10.algorithm.length !== c3) throw O(c3, "algorithm.length");
            break;
          }
          case "A128KW":
          case "A192KW":
          case "A256KW": {
            if (!P(a10.algorithm, "AES-KW")) throw O("AES-KW");
            let c3 = parseInt(b2.slice(1, 4), 10);
            if (a10.algorithm.length !== c3) throw O(c3, "algorithm.length");
            break;
          }
          case "ECDH":
            switch (a10.algorithm.name) {
              case "ECDH":
              case "X25519":
              case "X448":
                break;
              default:
                throw O("ECDH, X25519, or X448");
            }
            break;
          case "PBES2-HS256+A128KW":
          case "PBES2-HS384+A192KW":
          case "PBES2-HS512+A256KW":
            if (!P(a10.algorithm, "PBKDF2")) throw O("PBKDF2");
            break;
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512": {
            if (!P(a10.algorithm, "RSA-OAEP")) throw O("RSA-OAEP");
            let c3 = parseInt(b2.slice(9), 10) || 1;
            if (Q(a10.algorithm.hash) !== c3) throw O(`SHA-${c3}`, "algorithm.hash");
            break;
          }
          default:
            throw TypeError("CryptoKey does not support this operation");
        }
        R(a10, c2);
      }
      function T(a10, b2, ...c2) {
        if (c2.length > 2) {
          let b3 = c2.pop();
          a10 += `one of type ${c2.join(", ")}, or ${b3}.`;
        } else 2 === c2.length ? a10 += `one of type ${c2[0]} or ${c2[1]}.` : a10 += `of type ${c2[0]}.`;
        return null == b2 ? a10 += ` Received ${b2}` : "function" == typeof b2 && b2.name ? a10 += ` Received function ${b2.name}` : "object" == typeof b2 && null != b2 && b2.constructor && b2.constructor.name && (a10 += ` Received an instance of ${b2.constructor.name}`), a10;
      }
      let U = (a10, ...b2) => T("Key must be ", a10, ...b2);
      function V(a10, b2, ...c2) {
        return T(`Key for the ${a10} algorithm must be `, b2, ...c2);
      }
      let W = ["CryptoKey"];
      async function X(a10, b2, c2, d2, e2, g2) {
        let h2, i2;
        if (!(b2 instanceof Uint8Array)) throw TypeError(U(b2, "Uint8Array"));
        let k2 = parseInt(a10.slice(1, 4), 10), m2 = await f.subtle.importKey("raw", b2.subarray(k2 >> 3), "AES-CBC", false, ["decrypt"]), n2 = await f.subtle.importKey("raw", b2.subarray(0, k2 >> 3), { hash: `SHA-${k2 << 1}`, name: "HMAC" }, false, ["sign"]), o2 = j(g2, d2, c2, l(g2.length << 3)), p2 = new Uint8Array((await f.subtle.sign("HMAC", n2, o2)).slice(0, k2 >> 3));
        try {
          h2 = ((a11, b3) => {
            if (!(a11 instanceof Uint8Array)) throw TypeError("First argument must be a buffer");
            if (!(b3 instanceof Uint8Array)) throw TypeError("Second argument must be a buffer");
            if (a11.length !== b3.length) throw TypeError("Input buffers must have the same length");
            let c3 = a11.length, d3 = 0, e3 = -1;
            for (; ++e3 < c3; ) d3 |= a11[e3] ^ b3[e3];
            return 0 === d3;
          })(e2, p2);
        } catch (a11) {
        }
        if (!h2) throw new y();
        try {
          i2 = new Uint8Array(await f.subtle.decrypt({ iv: d2, name: "AES-CBC" }, m2, c2));
        } catch (a11) {
        }
        if (!i2) throw new y();
        return i2;
      }
      async function Y(a10, b2, c2, d2, e2, g2) {
        let h2;
        b2 instanceof Uint8Array ? h2 = await f.subtle.importKey("raw", b2, "AES-GCM", false, ["decrypt"]) : (S(b2, a10, "decrypt"), h2 = b2);
        try {
          return new Uint8Array(await f.subtle.decrypt({ additionalData: g2, iv: d2, name: "AES-GCM", tagLength: 128 }, h2, j(c2, e2)));
        } catch (a11) {
          throw new y();
        }
      }
      let Z = async (a10, b2, c2, d2, e2, f2) => {
        if (!(b2 instanceof CryptoKey) && !(b2 instanceof Uint8Array)) throw TypeError(U(b2, ...W, "Uint8Array"));
        switch (M(a10, d2), a10) {
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return b2 instanceof Uint8Array && N(b2, parseInt(a10.slice(-3), 10)), X(a10, b2, c2, d2, e2, f2);
          case "A128GCM":
          case "A192GCM":
          case "A256GCM":
            return b2 instanceof Uint8Array && N(b2, parseInt(a10.slice(1, 4), 10)), Y(a10, b2, c2, d2, e2, f2);
          default:
            throw new x("Unsupported JWE Content Encryption Algorithm");
        }
      }, $ = async () => {
        throw new x('JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `inflateRaw` decrypt option to provide Inflate Raw implementation.');
      }, _ = async () => {
        throw new x('JWE "zip" (Compression Algorithm) Header Parameter is not supported by your javascript runtime. You need to use the `deflateRaw` encrypt option to provide Deflate Raw implementation.');
      }, aa = (...a10) => {
        let b2, c2 = a10.filter(Boolean);
        if (0 === c2.length || 1 === c2.length) return true;
        for (let a11 of c2) {
          let c3 = Object.keys(a11);
          if (!b2 || 0 === b2.size) {
            b2 = new Set(c3);
            continue;
          }
          for (let a12 of c3) {
            if (b2.has(a12)) return false;
            b2.add(a12);
          }
        }
        return true;
      };
      function ab(a10) {
        if ("object" != typeof a10 || null === a10 || "[object Object]" !== Object.prototype.toString.call(a10)) return false;
        if (null === Object.getPrototypeOf(a10)) return true;
        let b2 = a10;
        for (; null !== Object.getPrototypeOf(b2); ) b2 = Object.getPrototypeOf(b2);
        return Object.getPrototypeOf(a10) === b2;
      }
      let ac = [{ hash: "SHA-256", name: "HMAC" }, true, ["sign"]];
      function ad(a10, b2) {
        if (a10.algorithm.length !== parseInt(b2.slice(1, 4), 10)) throw TypeError(`Invalid key size for alg: ${b2}`);
      }
      function ae(a10, b2, c2) {
        if (a10 instanceof CryptoKey) return S(a10, b2, c2), a10;
        if (a10 instanceof Uint8Array) return f.subtle.importKey("raw", a10, "AES-KW", true, [c2]);
        throw TypeError(U(a10, ...W, "Uint8Array"));
      }
      let af = async (a10, b2, c2) => {
        let d2 = await ae(b2, a10, "wrapKey");
        ad(d2, a10);
        let e2 = await f.subtle.importKey("raw", c2, ...ac);
        return new Uint8Array(await f.subtle.wrapKey("raw", e2, d2, "AES-KW"));
      }, ag = async (a10, b2, c2) => {
        let d2 = await ae(b2, a10, "unwrapKey");
        ad(d2, a10);
        let e2 = await f.subtle.unwrapKey("raw", c2, d2, "AES-KW", ...ac);
        return new Uint8Array(await f.subtle.exportKey("raw", e2));
      };
      async function ah(a10, b2, c2, d2, e2 = new Uint8Array(0), g2 = new Uint8Array(0)) {
        let i2;
        if (!(a10 instanceof CryptoKey)) throw TypeError(U(a10, ...W));
        if (S(a10, "ECDH"), !(b2 instanceof CryptoKey)) throw TypeError(U(b2, ...W));
        S(b2, "ECDH", "deriveBits");
        let k2 = j(n(h.encode(c2)), n(e2), n(g2), m(d2));
        return i2 = "X25519" === a10.algorithm.name ? 256 : "X448" === a10.algorithm.name ? 448 : Math.ceil(parseInt(a10.algorithm.namedCurve.substr(-3), 10) / 8) << 3, o(new Uint8Array(await f.subtle.deriveBits({ name: a10.algorithm.name, public: a10 }, b2, i2)), d2, k2);
      }
      async function ai(a10) {
        if (!(a10 instanceof CryptoKey)) throw TypeError(U(a10, ...W));
        return f.subtle.generateKey(a10.algorithm, true, ["deriveBits"]);
      }
      function aj(a10) {
        if (!(a10 instanceof CryptoKey)) throw TypeError(U(a10, ...W));
        return ["P-256", "P-384", "P-521"].includes(a10.algorithm.namedCurve) || "X25519" === a10.algorithm.name || "X448" === a10.algorithm.name;
      }
      async function ak(a10, b2, c2, d2) {
        if (!(a10 instanceof Uint8Array) || a10.length < 8) throw new A("PBES2 Salt Input must be 8 or more octets");
        let e2 = j(h.encode(b2), new Uint8Array([0]), a10), g2 = parseInt(b2.slice(13, 16), 10), i2 = { hash: `SHA-${b2.slice(8, 11)}`, iterations: c2, name: "PBKDF2", salt: e2 }, k2 = await function(a11, b3) {
          if (a11 instanceof Uint8Array) return f.subtle.importKey("raw", a11, "PBKDF2", false, ["deriveBits"]);
          if (a11 instanceof CryptoKey) return S(a11, b3, "deriveBits", "deriveKey"), a11;
          throw TypeError(U(a11, ...W, "Uint8Array"));
        }(d2, b2);
        if (k2.usages.includes("deriveBits")) return new Uint8Array(await f.subtle.deriveBits(i2, k2, g2));
        if (k2.usages.includes("deriveKey")) return f.subtle.deriveKey(i2, k2, { length: g2, name: "AES-KW" }, false, ["wrapKey", "unwrapKey"]);
        throw TypeError('PBKDF2 key "usages" must include "deriveBits" or "deriveKey"');
      }
      let al = async (a10, b2, c2, d2 = 2048, e2 = J(new Uint8Array(16))) => {
        let f2 = await ak(e2, a10, d2, b2);
        return { encryptedKey: await af(a10.slice(-6), f2, c2), p2c: d2, p2s: q(e2) };
      }, am = async (a10, b2, c2, d2, e2) => {
        let f2 = await ak(e2, a10, d2, b2);
        return ag(a10.slice(-6), f2, c2);
      };
      function an(a10) {
        switch (a10) {
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            return "RSA-OAEP";
          default:
            throw new x(`alg ${a10} is not supported either by JOSE or your javascript runtime`);
        }
      }
      let ao = (a10, b2) => {
        if (a10.startsWith("RS") || a10.startsWith("PS")) {
          let { modulusLength: c2 } = b2.algorithm;
          if ("number" != typeof c2 || c2 < 2048) throw TypeError(`${a10} requires key modulusLength to be 2048 bits or larger`);
        }
      }, ap = async (a10, b2, c2) => {
        if (!(b2 instanceof CryptoKey)) throw TypeError(U(b2, ...W));
        if (S(b2, a10, "encrypt", "wrapKey"), ao(a10, b2), b2.usages.includes("encrypt")) return new Uint8Array(await f.subtle.encrypt(an(a10), b2, c2));
        if (b2.usages.includes("wrapKey")) {
          let d2 = await f.subtle.importKey("raw", c2, ...ac);
          return new Uint8Array(await f.subtle.wrapKey("raw", d2, b2, an(a10)));
        }
        throw TypeError('RSA-OAEP key "usages" must include "encrypt" or "wrapKey" for this operation');
      }, aq = async (a10, b2, c2) => {
        if (!(b2 instanceof CryptoKey)) throw TypeError(U(b2, ...W));
        if (S(b2, a10, "decrypt", "unwrapKey"), ao(a10, b2), b2.usages.includes("decrypt")) return new Uint8Array(await f.subtle.decrypt(an(a10), b2, c2));
        if (b2.usages.includes("unwrapKey")) {
          let d2 = await f.subtle.unwrapKey("raw", c2, b2, an(a10), ...ac);
          return new Uint8Array(await f.subtle.exportKey("raw", d2));
        }
        throw TypeError('RSA-OAEP key "usages" must include "decrypt" or "unwrapKey" for this operation');
      };
      function ar(a10) {
        switch (a10) {
          case "A128GCM":
            return 128;
          case "A192GCM":
            return 192;
          case "A256GCM":
          case "A128CBC-HS256":
            return 256;
          case "A192CBC-HS384":
            return 384;
          case "A256CBC-HS512":
            return 512;
          default:
            throw new x(`Unsupported JWE Algorithm: ${a10}`);
        }
      }
      let as = (a10) => J(new Uint8Array(ar(a10) >> 3)), at = (a10, b2) => {
        let c2 = (a10.match(/.{1,64}/g) || []).join("\n");
        return `-----BEGIN ${b2}-----
${c2}
-----END ${b2}-----`;
      }, au = async (a10, b2, c2) => {
        if (!(c2 instanceof CryptoKey)) throw TypeError(U(c2, ...W));
        if (!c2.extractable) throw TypeError("CryptoKey is not extractable");
        if (c2.type !== a10) throw TypeError(`key is not a ${a10} key`);
        return at(p(new Uint8Array(await f.subtle.exportKey(b2, c2))), `${a10.toUpperCase()} KEY`);
      }, av = (a10, b2, c2 = 0) => {
        0 === c2 && (b2.unshift(b2.length), b2.unshift(6));
        let d2 = a10.indexOf(b2[0], c2);
        if (-1 === d2) return false;
        let e2 = a10.subarray(d2, d2 + b2.length);
        return e2.length === b2.length && (e2.every((a11, c3) => a11 === b2[c3]) || av(a10, b2, d2 + 1));
      }, aw = (a10) => {
        switch (true) {
          case av(a10, [42, 134, 72, 206, 61, 3, 1, 7]):
            return "P-256";
          case av(a10, [43, 129, 4, 0, 34]):
            return "P-384";
          case av(a10, [43, 129, 4, 0, 35]):
            return "P-521";
          case av(a10, [43, 101, 110]):
            return "X25519";
          case av(a10, [43, 101, 111]):
            return "X448";
          case av(a10, [43, 101, 112]):
            return "Ed25519";
          case av(a10, [43, 101, 113]):
            return "Ed448";
          default:
            throw new x("Invalid or unsupported EC Key Curve or OKP Key Sub Type");
        }
      }, ax = async (a10, b2, c2, d2, e2) => {
        var g2;
        let h2, i2, j2 = new Uint8Array(atob(c2.replace(a10, "")).split("").map((a11) => a11.charCodeAt(0))), k2 = "spki" === b2;
        switch (d2) {
          case "PS256":
          case "PS384":
          case "PS512":
            h2 = { name: "RSA-PSS", hash: `SHA-${d2.slice(-3)}` }, i2 = k2 ? ["verify"] : ["sign"];
            break;
          case "RS256":
          case "RS384":
          case "RS512":
            h2 = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${d2.slice(-3)}` }, i2 = k2 ? ["verify"] : ["sign"];
            break;
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            h2 = { name: "RSA-OAEP", hash: `SHA-${parseInt(d2.slice(-3), 10) || 1}` }, i2 = k2 ? ["encrypt", "wrapKey"] : ["decrypt", "unwrapKey"];
            break;
          case "ES256":
            h2 = { name: "ECDSA", namedCurve: "P-256" }, i2 = k2 ? ["verify"] : ["sign"];
            break;
          case "ES384":
            h2 = { name: "ECDSA", namedCurve: "P-384" }, i2 = k2 ? ["verify"] : ["sign"];
            break;
          case "ES512":
            h2 = { name: "ECDSA", namedCurve: "P-521" }, i2 = k2 ? ["verify"] : ["sign"];
            break;
          case "ECDH-ES":
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            let a11 = aw(j2);
            h2 = a11.startsWith("P-") ? { name: "ECDH", namedCurve: a11 } : { name: a11 }, i2 = k2 ? [] : ["deriveBits"];
            break;
          }
          case "EdDSA":
            h2 = { name: aw(j2) }, i2 = k2 ? ["verify"] : ["sign"];
            break;
          default:
            throw new x('Invalid or unsupported "alg" (Algorithm) value');
        }
        return f.subtle.importKey(b2, j2, h2, null != (g2 = null == e2 ? void 0 : e2.extractable) && g2, i2);
      }, ay = (a10, b2, c2) => ax(/(?:-----(?:BEGIN|END) PUBLIC KEY-----|\s)/g, "spki", a10, b2, c2);
      function az(a10) {
        let b2 = [], c2 = 0;
        for (; c2 < a10.length; ) {
          let d2 = aA(a10.subarray(c2));
          b2.push(d2), c2 += d2.byteLength;
        }
        return b2;
      }
      function aA(a10) {
        let b2 = 0, c2 = 31 & a10[0];
        if (b2++, 31 === c2) {
          for (c2 = 0; a10[b2] >= 128; ) c2 = 128 * c2 + a10[b2] - 128, b2++;
          c2 = 128 * c2 + a10[b2] - 128, b2++;
        }
        let d2 = 0;
        if (a10[b2] < 128) d2 = a10[b2], b2++;
        else if (128 === d2) {
          for (d2 = 0; 0 !== a10[b2 + d2] || 0 !== a10[b2 + d2 + 1]; ) {
            if (d2 > a10.byteLength) throw TypeError("invalid indefinite form length");
            d2++;
          }
          let c3 = b2 + d2 + 2;
          return { byteLength: c3, contents: a10.subarray(b2, b2 + d2), raw: a10.subarray(0, c3) };
        } else {
          let c3 = 127 & a10[b2];
          b2++, d2 = 0;
          for (let e3 = 0; e3 < c3; e3++) d2 = 256 * d2 + a10[b2], b2++;
        }
        let e2 = b2 + d2;
        return { byteLength: e2, contents: a10.subarray(b2, e2), raw: a10.subarray(0, e2) };
      }
      let aB = async (a10) => {
        var b2, c2;
        if (!a10.alg) throw TypeError('"alg" argument is required when "jwk.alg" is not present');
        let { algorithm: d2, keyUsages: e2 } = function(a11) {
          let b3, c3;
          switch (a11.kty) {
            case "oct":
              switch (a11.alg) {
                case "HS256":
                case "HS384":
                case "HS512":
                  b3 = { name: "HMAC", hash: `SHA-${a11.alg.slice(-3)}` }, c3 = ["sign", "verify"];
                  break;
                case "A128CBC-HS256":
                case "A192CBC-HS384":
                case "A256CBC-HS512":
                  throw new x(`${a11.alg} keys cannot be imported as CryptoKey instances`);
                case "A128GCM":
                case "A192GCM":
                case "A256GCM":
                case "A128GCMKW":
                case "A192GCMKW":
                case "A256GCMKW":
                  b3 = { name: "AES-GCM" }, c3 = ["encrypt", "decrypt"];
                  break;
                case "A128KW":
                case "A192KW":
                case "A256KW":
                  b3 = { name: "AES-KW" }, c3 = ["wrapKey", "unwrapKey"];
                  break;
                case "PBES2-HS256+A128KW":
                case "PBES2-HS384+A192KW":
                case "PBES2-HS512+A256KW":
                  b3 = { name: "PBKDF2" }, c3 = ["deriveBits"];
                  break;
                default:
                  throw new x('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "RSA":
              switch (a11.alg) {
                case "PS256":
                case "PS384":
                case "PS512":
                  b3 = { name: "RSA-PSS", hash: `SHA-${a11.alg.slice(-3)}` }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "RS256":
                case "RS384":
                case "RS512":
                  b3 = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${a11.alg.slice(-3)}` }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "RSA-OAEP":
                case "RSA-OAEP-256":
                case "RSA-OAEP-384":
                case "RSA-OAEP-512":
                  b3 = { name: "RSA-OAEP", hash: `SHA-${parseInt(a11.alg.slice(-3), 10) || 1}` }, c3 = a11.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
                  break;
                default:
                  throw new x('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "EC":
              switch (a11.alg) {
                case "ES256":
                  b3 = { name: "ECDSA", namedCurve: "P-256" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ES384":
                  b3 = { name: "ECDSA", namedCurve: "P-384" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ES512":
                  b3 = { name: "ECDSA", namedCurve: "P-521" }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ECDH-ES":
                case "ECDH-ES+A128KW":
                case "ECDH-ES+A192KW":
                case "ECDH-ES+A256KW":
                  b3 = { name: "ECDH", namedCurve: a11.crv }, c3 = a11.d ? ["deriveBits"] : [];
                  break;
                default:
                  throw new x('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "OKP":
              switch (a11.alg) {
                case "EdDSA":
                  b3 = { name: a11.crv }, c3 = a11.d ? ["sign"] : ["verify"];
                  break;
                case "ECDH-ES":
                case "ECDH-ES+A128KW":
                case "ECDH-ES+A192KW":
                case "ECDH-ES+A256KW":
                  b3 = { name: a11.crv }, c3 = a11.d ? ["deriveBits"] : [];
                  break;
                default:
                  throw new x('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            default:
              throw new x('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
          }
          return { algorithm: b3, keyUsages: c3 };
        }(a10), g2 = [d2, null != (b2 = a10.ext) && b2, null != (c2 = a10.key_ops) ? c2 : e2];
        if ("PBKDF2" === d2.name) return f.subtle.importKey("raw", s(a10.k), ...g2);
        let h2 = { ...a10 };
        return delete h2.alg, delete h2.use, f.subtle.importKey("jwk", h2, ...g2);
      };
      async function aC(a10, b2, c2) {
        if ("string" != typeof a10 || 0 !== a10.indexOf("-----BEGIN PUBLIC KEY-----")) throw TypeError('"spki" must be SPKI formatted string');
        return ay(a10, b2, c2);
      }
      async function aD(a10, b2, c2) {
        let d2;
        if ("string" != typeof a10 || 0 !== a10.indexOf("-----BEGIN CERTIFICATE-----")) throw TypeError('"x509" must be X.509 formatted string');
        try {
          d2 = at(function(a11) {
            let b3 = az(az(aA(a11).contents)[0].contents);
            return p(b3[160 === b3[0].raw[0] ? 6 : 5].raw);
          }(r(a10.replace(/(?:-----(?:BEGIN|END) CERTIFICATE-----|\s)/g, ""))), "PUBLIC KEY");
        } catch (a11) {
          throw TypeError("Failed to parse the X.509 certificate", { cause: a11 });
        }
        return ay(d2, b2, c2);
      }
      async function aE(a10, b2, c2) {
        if ("string" != typeof a10 || 0 !== a10.indexOf("-----BEGIN PRIVATE KEY-----")) throw TypeError('"pkcs8" must be PKCS#8 formatted string');
        return ax(/(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g, "pkcs8", a10, b2, c2);
      }
      async function aF(a10, b2, c2) {
        var d2;
        if (!ab(a10)) throw TypeError("JWK must be an object");
        switch (b2 || (b2 = a10.alg), a10.kty) {
          case "oct":
            if ("string" != typeof a10.k || !a10.k) throw TypeError('missing "k" (Key Value) Parameter value');
            if (null != c2 || (c2 = true !== a10.ext), c2) return aB({ ...a10, alg: b2, ext: null != (d2 = a10.ext) && d2 });
            return s(a10.k);
          case "RSA":
            if (void 0 !== a10.oth) throw new x('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
          case "EC":
          case "OKP":
            return aB({ ...a10, alg: b2 });
          default:
            throw new x('Unsupported "kty" (Key Type) Parameter value');
        }
      }
      let aG = (a10, b2, c2) => {
        a10.startsWith("HS") || "dir" === a10 || a10.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(a10) ? ((a11, b3) => {
          if (!(b3 instanceof Uint8Array)) {
            if (!(b3 instanceof CryptoKey)) throw TypeError(V(a11, b3, ...W, "Uint8Array"));
            if ("secret" !== b3.type) throw TypeError(`${W.join(" or ")} instances for symmetric algorithms must be of type "secret"`);
          }
        })(a10, b2) : ((a11, b3, c3) => {
          if (!(b3 instanceof CryptoKey)) throw TypeError(V(a11, b3, ...W));
          if ("secret" === b3.type) throw TypeError(`${W.join(" or ")} instances for asymmetric algorithms must not be of type "secret"`);
          if ("sign" === c3 && "public" === b3.type) throw TypeError(`${W.join(" or ")} instances for asymmetric algorithm signing must be of type "private"`);
          if ("decrypt" === c3 && "public" === b3.type) throw TypeError(`${W.join(" or ")} instances for asymmetric algorithm decryption must be of type "private"`);
          if (b3.algorithm && "verify" === c3 && "private" === b3.type) throw TypeError(`${W.join(" or ")} instances for asymmetric algorithm verifying must be of type "public"`);
          if (b3.algorithm && "encrypt" === c3 && "private" === b3.type) throw TypeError(`${W.join(" or ")} instances for asymmetric algorithm encryption must be of type "public"`);
        })(a10, b2, c2);
      };
      async function aH(a10, b2, c2, d2, e2) {
        if (!(c2 instanceof Uint8Array)) throw TypeError(U(c2, "Uint8Array"));
        let g2 = parseInt(a10.slice(1, 4), 10), h2 = await f.subtle.importKey("raw", c2.subarray(g2 >> 3), "AES-CBC", false, ["encrypt"]), i2 = await f.subtle.importKey("raw", c2.subarray(0, g2 >> 3), { hash: `SHA-${g2 << 1}`, name: "HMAC" }, false, ["sign"]), k2 = new Uint8Array(await f.subtle.encrypt({ iv: d2, name: "AES-CBC" }, h2, b2)), m2 = j(e2, d2, k2, l(e2.length << 3));
        return { ciphertext: k2, tag: new Uint8Array((await f.subtle.sign("HMAC", i2, m2)).slice(0, g2 >> 3)) };
      }
      async function aI(a10, b2, c2, d2, e2) {
        let g2;
        c2 instanceof Uint8Array ? g2 = await f.subtle.importKey("raw", c2, "AES-GCM", false, ["encrypt"]) : (S(c2, a10, "encrypt"), g2 = c2);
        let h2 = new Uint8Array(await f.subtle.encrypt({ additionalData: e2, iv: d2, name: "AES-GCM", tagLength: 128 }, g2, b2)), i2 = h2.slice(-16);
        return { ciphertext: h2.slice(0, -16), tag: i2 };
      }
      let aJ = async (a10, b2, c2, d2, e2) => {
        if (!(c2 instanceof CryptoKey) && !(c2 instanceof Uint8Array)) throw TypeError(U(c2, ...W, "Uint8Array"));
        switch (M(a10, d2), a10) {
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return c2 instanceof Uint8Array && N(c2, parseInt(a10.slice(-3), 10)), aH(a10, b2, c2, d2, e2);
          case "A128GCM":
          case "A192GCM":
          case "A256GCM":
            return c2 instanceof Uint8Array && N(c2, parseInt(a10.slice(1, 4), 10)), aI(a10, b2, c2, d2, e2);
          default:
            throw new x("Unsupported JWE Content Encryption Algorithm");
        }
      };
      async function aK(a10, b2, c2, d2) {
        let e2 = a10.slice(0, 7);
        d2 || (d2 = L(e2));
        let { ciphertext: f2, tag: g2 } = await aJ(e2, c2, b2, d2, new Uint8Array(0));
        return { encryptedKey: f2, iv: q(d2), tag: q(g2) };
      }
      async function aL(a10, b2, c2, d2, e2) {
        return Z(a10.slice(0, 7), b2, c2, d2, e2, new Uint8Array(0));
      }
      async function aM(a10, b2, c2, d2, e2) {
        switch (aG(a10, b2, "decrypt"), a10) {
          case "dir":
            if (void 0 !== c2) throw new A("Encountered unexpected JWE Encrypted Key");
            return b2;
          case "ECDH-ES":
            if (void 0 !== c2) throw new A("Encountered unexpected JWE Encrypted Key");
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            let e3, f2;
            if (!ab(d2.epk)) throw new A('JOSE Header "epk" (Ephemeral Public Key) missing or invalid');
            if (!aj(b2)) throw new x("ECDH with the provided key is not allowed or not supported by your javascript runtime");
            let g2 = await aF(d2.epk, a10);
            if (void 0 !== d2.apu) {
              if ("string" != typeof d2.apu) throw new A('JOSE Header "apu" (Agreement PartyUInfo) invalid');
              try {
                e3 = s(d2.apu);
              } catch (a11) {
                throw new A("Failed to base64url decode the apu");
              }
            }
            if (void 0 !== d2.apv) {
              if ("string" != typeof d2.apv) throw new A('JOSE Header "apv" (Agreement PartyVInfo) invalid');
              try {
                f2 = s(d2.apv);
              } catch (a11) {
                throw new A("Failed to base64url decode the apv");
              }
            }
            let h2 = await ah(g2, b2, "ECDH-ES" === a10 ? d2.enc : a10, "ECDH-ES" === a10 ? ar(d2.enc) : parseInt(a10.slice(-5, -2), 10), e3, f2);
            if ("ECDH-ES" === a10) return h2;
            if (void 0 === c2) throw new A("JWE Encrypted Key missing");
            return ag(a10.slice(-6), h2, c2);
          }
          case "RSA1_5":
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            if (void 0 === c2) throw new A("JWE Encrypted Key missing");
            return aq(a10, b2, c2);
          case "PBES2-HS256+A128KW":
          case "PBES2-HS384+A192KW":
          case "PBES2-HS512+A256KW": {
            let f2;
            if (void 0 === c2) throw new A("JWE Encrypted Key missing");
            if ("number" != typeof d2.p2c) throw new A('JOSE Header "p2c" (PBES2 Count) missing or invalid');
            let g2 = (null == e2 ? void 0 : e2.maxPBES2Count) || 1e4;
            if (d2.p2c > g2) throw new A('JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds');
            if ("string" != typeof d2.p2s) throw new A('JOSE Header "p2s" (PBES2 Salt) missing or invalid');
            try {
              f2 = s(d2.p2s);
            } catch (a11) {
              throw new A("Failed to base64url decode the p2s");
            }
            return am(a10, b2, c2, d2.p2c, f2);
          }
          case "A128KW":
          case "A192KW":
          case "A256KW":
            if (void 0 === c2) throw new A("JWE Encrypted Key missing");
            return ag(a10, b2, c2);
          case "A128GCMKW":
          case "A192GCMKW":
          case "A256GCMKW": {
            let e3, f2;
            if (void 0 === c2) throw new A("JWE Encrypted Key missing");
            if ("string" != typeof d2.iv) throw new A('JOSE Header "iv" (Initialization Vector) missing or invalid');
            if ("string" != typeof d2.tag) throw new A('JOSE Header "tag" (Authentication Tag) missing or invalid');
            try {
              e3 = s(d2.iv);
            } catch (a11) {
              throw new A("Failed to base64url decode the iv");
            }
            try {
              f2 = s(d2.tag);
            } catch (a11) {
              throw new A("Failed to base64url decode the tag");
            }
            return aL(a10, b2, c2, e3, f2);
          }
          default:
            throw new x('Invalid or unsupported "alg" (JWE Algorithm) header value');
        }
      }
      let aN = function(a10, b2, c2, d2, e2) {
        let f2;
        if (void 0 !== e2.crit && void 0 === d2.crit) throw new a10('"crit" (Critical) Header Parameter MUST be integrity protected');
        if (!d2 || void 0 === d2.crit) return /* @__PURE__ */ new Set();
        if (!Array.isArray(d2.crit) || 0 === d2.crit.length || d2.crit.some((a11) => "string" != typeof a11 || 0 === a11.length)) throw new a10('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
        for (let g2 of (f2 = void 0 !== c2 ? new Map([...Object.entries(c2), ...b2.entries()]) : b2, d2.crit)) {
          if (!f2.has(g2)) throw new x(`Extension Header Parameter "${g2}" is not recognized`);
          if (void 0 === e2[g2]) throw new a10(`Extension Header Parameter "${g2}" is missing`);
          if (f2.get(g2) && void 0 === d2[g2]) throw new a10(`Extension Header Parameter "${g2}" MUST be integrity protected`);
        }
        return new Set(d2.crit);
      }, aO = (a10, b2) => {
        if (void 0 !== b2 && (!Array.isArray(b2) || b2.some((a11) => "string" != typeof a11))) throw TypeError(`"${a10}" option must be an array of strings`);
        if (b2) return new Set(b2);
      };
      async function aP(a10, b2, c2) {
        var d2;
        let e2, f2, g2, k2, l2, m2, n2;
        if (!ab(a10)) throw new A("Flattened JWE must be an object");
        if (void 0 === a10.protected && void 0 === a10.header && void 0 === a10.unprotected) throw new A("JOSE Header missing");
        if ("string" != typeof a10.iv) throw new A("JWE Initialization Vector missing or incorrect type");
        if ("string" != typeof a10.ciphertext) throw new A("JWE Ciphertext missing or incorrect type");
        if ("string" != typeof a10.tag) throw new A("JWE Authentication Tag missing or incorrect type");
        if (void 0 !== a10.protected && "string" != typeof a10.protected) throw new A("JWE Protected Header incorrect type");
        if (void 0 !== a10.encrypted_key && "string" != typeof a10.encrypted_key) throw new A("JWE Encrypted Key incorrect type");
        if (void 0 !== a10.aad && "string" != typeof a10.aad) throw new A("JWE AAD incorrect type");
        if (void 0 !== a10.header && !ab(a10.header)) throw new A("JWE Shared Unprotected Header incorrect type");
        if (void 0 !== a10.unprotected && !ab(a10.unprotected)) throw new A("JWE Per-Recipient Unprotected Header incorrect type");
        if (a10.protected) try {
          let b3 = s(a10.protected);
          e2 = JSON.parse(i.decode(b3));
        } catch (a11) {
          throw new A("JWE Protected Header is invalid");
        }
        if (!aa(e2, a10.header, a10.unprotected)) throw new A("JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint");
        let o2 = { ...e2, ...a10.header, ...a10.unprotected };
        if (aN(A, /* @__PURE__ */ new Map(), null == c2 ? void 0 : c2.crit, e2, o2), void 0 !== o2.zip) {
          if (!e2 || !e2.zip) throw new A('JWE "zip" (Compression Algorithm) Header MUST be integrity protected');
          if ("DEF" !== o2.zip) throw new x('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value');
        }
        let { alg: p2, enc: q2 } = o2;
        if ("string" != typeof p2 || !p2) throw new A("missing JWE Algorithm (alg) in JWE Header");
        if ("string" != typeof q2 || !q2) throw new A("missing JWE Encryption Algorithm (enc) in JWE Header");
        let r2 = c2 && aO("keyManagementAlgorithms", c2.keyManagementAlgorithms), t2 = c2 && aO("contentEncryptionAlgorithms", c2.contentEncryptionAlgorithms);
        if (r2 && !r2.has(p2)) throw new w('"alg" (Algorithm) Header Parameter not allowed');
        if (t2 && !t2.has(q2)) throw new w('"enc" (Encryption Algorithm) Header Parameter not allowed');
        if (void 0 !== a10.encrypted_key) try {
          f2 = s(a10.encrypted_key);
        } catch (a11) {
          throw new A("Failed to base64url decode the encrypted_key");
        }
        let u2 = false;
        "function" == typeof b2 && (b2 = await b2(e2, a10), u2 = true);
        try {
          g2 = await aM(p2, b2, f2, o2, c2);
        } catch (a11) {
          if (a11 instanceof TypeError || a11 instanceof A || a11 instanceof x) throw a11;
          g2 = as(q2);
        }
        try {
          k2 = s(a10.iv);
        } catch (a11) {
          throw new A("Failed to base64url decode the iv");
        }
        try {
          l2 = s(a10.tag);
        } catch (a11) {
          throw new A("Failed to base64url decode the tag");
        }
        let v2 = h.encode(null != (d2 = a10.protected) ? d2 : "");
        m2 = void 0 !== a10.aad ? j(v2, h.encode("."), h.encode(a10.aad)) : v2;
        try {
          n2 = s(a10.ciphertext);
        } catch (a11) {
          throw new A("Failed to base64url decode the ciphertext");
        }
        let y2 = await Z(q2, g2, n2, k2, l2, m2);
        "DEF" === o2.zip && (y2 = await ((null == c2 ? void 0 : c2.inflateRaw) || $)(y2));
        let z2 = { plaintext: y2 };
        if (void 0 !== a10.protected && (z2.protectedHeader = e2), void 0 !== a10.aad) try {
          z2.additionalAuthenticatedData = s(a10.aad);
        } catch (a11) {
          throw new A("Failed to base64url decode the aad");
        }
        return (void 0 !== a10.unprotected && (z2.sharedUnprotectedHeader = a10.unprotected), void 0 !== a10.header && (z2.unprotectedHeader = a10.header), u2) ? { ...z2, key: b2 } : z2;
      }
      async function aQ(a10, b2, c2) {
        if (a10 instanceof Uint8Array && (a10 = i.decode(a10)), "string" != typeof a10) throw new A("Compact JWE must be a string or Uint8Array");
        let { 0: d2, 1: e2, 2: f2, 3: g2, 4: h2, length: j2 } = a10.split(".");
        if (5 !== j2) throw new A("Invalid Compact JWE");
        let k2 = await aP({ ciphertext: g2, iv: f2 || void 0, protected: d2 || void 0, tag: h2 || void 0, encrypted_key: e2 || void 0 }, b2, c2), l2 = { plaintext: k2.plaintext, protectedHeader: k2.protectedHeader };
        return "function" == typeof b2 ? { ...l2, key: k2.key } : l2;
      }
      async function aR(a10, b2, c2) {
        if (!ab(a10)) throw new A("General JWE must be an object");
        if (!Array.isArray(a10.recipients) || !a10.recipients.every(ab)) throw new A("JWE Recipients missing or incorrect type");
        if (!a10.recipients.length) throw new A("JWE Recipients has no members");
        for (let d2 of a10.recipients) try {
          return await aP({ aad: a10.aad, ciphertext: a10.ciphertext, encrypted_key: d2.encrypted_key, header: d2.header, iv: a10.iv, protected: a10.protected, tag: a10.tag, unprotected: a10.unprotected }, b2, c2);
        } catch (a11) {
        }
        throw new y();
      }
      let aS = async (a10) => {
        if (a10 instanceof Uint8Array) return { kty: "oct", k: q(a10) };
        if (!(a10 instanceof CryptoKey)) throw TypeError(U(a10, ...W, "Uint8Array"));
        if (!a10.extractable) throw TypeError("non-extractable CryptoKey cannot be exported as a JWK");
        let { ext: b2, key_ops: c2, alg: d2, use: e2, ...g2 } = await f.subtle.exportKey("jwk", a10);
        return g2;
      };
      async function aT(a10) {
        return au("public", "spki", a10);
      }
      async function aU(a10) {
        return au("private", "pkcs8", a10);
      }
      async function aV(a10) {
        return aS(a10);
      }
      async function aW(a10, b2, c2, d2, e2 = {}) {
        let f2, g2, h2;
        switch (aG(a10, c2, "encrypt"), a10) {
          case "dir":
            h2 = c2;
            break;
          case "ECDH-ES":
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            if (!aj(c2)) throw new x("ECDH with the provided key is not allowed or not supported by your javascript runtime");
            let { apu: i2, apv: j2 } = e2, { epk: k2 } = e2;
            k2 || (k2 = (await ai(c2)).privateKey);
            let { x: l2, y: m2, crv: n2, kty: o2 } = await aV(k2), p2 = await ah(c2, k2, "ECDH-ES" === a10 ? b2 : a10, "ECDH-ES" === a10 ? ar(b2) : parseInt(a10.slice(-5, -2), 10), i2, j2);
            if (g2 = { epk: { x: l2, crv: n2, kty: o2 } }, "EC" === o2 && (g2.epk.y = m2), i2 && (g2.apu = q(i2)), j2 && (g2.apv = q(j2)), "ECDH-ES" === a10) {
              h2 = p2;
              break;
            }
            h2 = d2 || as(b2);
            let r2 = a10.slice(-6);
            f2 = await af(r2, p2, h2);
            break;
          }
          case "RSA1_5":
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            h2 = d2 || as(b2), f2 = await ap(a10, c2, h2);
            break;
          case "PBES2-HS256+A128KW":
          case "PBES2-HS384+A192KW":
          case "PBES2-HS512+A256KW": {
            h2 = d2 || as(b2);
            let { p2c: i2, p2s: j2 } = e2;
            ({ encryptedKey: f2, ...g2 } = await al(a10, c2, h2, i2, j2));
            break;
          }
          case "A128KW":
          case "A192KW":
          case "A256KW":
            h2 = d2 || as(b2), f2 = await af(a10, c2, h2);
            break;
          case "A128GCMKW":
          case "A192GCMKW":
          case "A256GCMKW": {
            h2 = d2 || as(b2);
            let { iv: i2 } = e2;
            ({ encryptedKey: f2, ...g2 } = await aK(a10, c2, h2, i2));
            break;
          }
          default:
            throw new x('Invalid or unsupported "alg" (JWE Algorithm) header value');
        }
        return { cek: h2, encryptedKey: f2, parameters: g2 };
      }
      let aX = Symbol();
      class aY {
        constructor(a10) {
          if (!(a10 instanceof Uint8Array)) throw TypeError("plaintext must be an instance of Uint8Array");
          this._plaintext = a10;
        }
        setKeyManagementParameters(a10) {
          if (this._keyManagementParameters) throw TypeError("setKeyManagementParameters can only be called once");
          return this._keyManagementParameters = a10, this;
        }
        setProtectedHeader(a10) {
          if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this._protectedHeader = a10, this;
        }
        setSharedUnprotectedHeader(a10) {
          if (this._sharedUnprotectedHeader) throw TypeError("setSharedUnprotectedHeader can only be called once");
          return this._sharedUnprotectedHeader = a10, this;
        }
        setUnprotectedHeader(a10) {
          if (this._unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
          return this._unprotectedHeader = a10, this;
        }
        setAdditionalAuthenticatedData(a10) {
          return this._aad = a10, this;
        }
        setContentEncryptionKey(a10) {
          if (this._cek) throw TypeError("setContentEncryptionKey can only be called once");
          return this._cek = a10, this;
        }
        setInitializationVector(a10) {
          if (this._iv) throw TypeError("setInitializationVector can only be called once");
          return this._iv = a10, this;
        }
        async encrypt(a10, b2) {
          let c2, d2, e2, f2, g2, k2, l2;
          if (!this._protectedHeader && !this._unprotectedHeader && !this._sharedUnprotectedHeader) throw new A("either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()");
          if (!aa(this._protectedHeader, this._unprotectedHeader, this._sharedUnprotectedHeader)) throw new A("JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint");
          let m2 = { ...this._protectedHeader, ...this._unprotectedHeader, ...this._sharedUnprotectedHeader };
          if (aN(A, /* @__PURE__ */ new Map(), null == b2 ? void 0 : b2.crit, this._protectedHeader, m2), void 0 !== m2.zip) {
            if (!this._protectedHeader || !this._protectedHeader.zip) throw new A('JWE "zip" (Compression Algorithm) Header MUST be integrity protected');
            if ("DEF" !== m2.zip) throw new x('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value');
          }
          let { alg: n2, enc: o2 } = m2;
          if ("string" != typeof n2 || !n2) throw new A('JWE "alg" (Algorithm) Header Parameter missing or invalid');
          if ("string" != typeof o2 || !o2) throw new A('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
          if ("dir" === n2) {
            if (this._cek) throw TypeError("setContentEncryptionKey cannot be called when using Direct Encryption");
          } else if ("ECDH-ES" === n2 && this._cek) throw TypeError("setContentEncryptionKey cannot be called when using Direct Key Agreement");
          {
            let e3;
            ({ cek: d2, encryptedKey: c2, parameters: e3 } = await aW(n2, o2, a10, this._cek, this._keyManagementParameters)), e3 && (b2 && aX in b2 ? this._unprotectedHeader ? this._unprotectedHeader = { ...this._unprotectedHeader, ...e3 } : this.setUnprotectedHeader(e3) : this._protectedHeader ? this._protectedHeader = { ...this._protectedHeader, ...e3 } : this.setProtectedHeader(e3));
          }
          if (this._iv || (this._iv = L(o2)), f2 = this._protectedHeader ? h.encode(q(JSON.stringify(this._protectedHeader))) : h.encode(""), this._aad ? (g2 = q(this._aad), e2 = j(f2, h.encode("."), h.encode(g2))) : e2 = f2, "DEF" === m2.zip) {
            let a11 = await ((null == b2 ? void 0 : b2.deflateRaw) || _)(this._plaintext);
            ({ ciphertext: k2, tag: l2 } = await aJ(o2, a11, d2, this._iv, e2));
          } else ({ ciphertext: k2, tag: l2 } = await aJ(o2, this._plaintext, d2, this._iv, e2));
          let p2 = { ciphertext: q(k2), iv: q(this._iv), tag: q(l2) };
          return c2 && (p2.encrypted_key = q(c2)), g2 && (p2.aad = g2), this._protectedHeader && (p2.protected = i.decode(f2)), this._sharedUnprotectedHeader && (p2.unprotected = this._sharedUnprotectedHeader), this._unprotectedHeader && (p2.header = this._unprotectedHeader), p2;
        }
      }
      class aZ {
        constructor(a10, b2, c2) {
          this.parent = a10, this.key = b2, this.options = c2;
        }
        setUnprotectedHeader(a10) {
          if (this.unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
          return this.unprotectedHeader = a10, this;
        }
        addRecipient(...a10) {
          return this.parent.addRecipient(...a10);
        }
        encrypt(...a10) {
          return this.parent.encrypt(...a10);
        }
        done() {
          return this.parent;
        }
      }
      class a$ {
        constructor(a10) {
          this._recipients = [], this._plaintext = a10;
        }
        addRecipient(a10, b2) {
          let c2 = new aZ(this, a10, { crit: null == b2 ? void 0 : b2.crit });
          return this._recipients.push(c2), c2;
        }
        setProtectedHeader(a10) {
          if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this._protectedHeader = a10, this;
        }
        setSharedUnprotectedHeader(a10) {
          if (this._unprotectedHeader) throw TypeError("setSharedUnprotectedHeader can only be called once");
          return this._unprotectedHeader = a10, this;
        }
        setAdditionalAuthenticatedData(a10) {
          return this._aad = a10, this;
        }
        async encrypt(a10) {
          var b2, c2, d2;
          let e2;
          if (!this._recipients.length) throw new A("at least one recipient must be added");
          if (a10 = { deflateRaw: null == a10 ? void 0 : a10.deflateRaw }, 1 === this._recipients.length) {
            let [b3] = this._recipients, c3 = await new aY(this._plaintext).setAdditionalAuthenticatedData(this._aad).setProtectedHeader(this._protectedHeader).setSharedUnprotectedHeader(this._unprotectedHeader).setUnprotectedHeader(b3.unprotectedHeader).encrypt(b3.key, { ...b3.options, ...a10 }), d3 = { ciphertext: c3.ciphertext, iv: c3.iv, recipients: [{}], tag: c3.tag };
            return c3.aad && (d3.aad = c3.aad), c3.protected && (d3.protected = c3.protected), c3.unprotected && (d3.unprotected = c3.unprotected), c3.encrypted_key && (d3.recipients[0].encrypted_key = c3.encrypted_key), c3.header && (d3.recipients[0].header = c3.header), d3;
          }
          for (let a11 = 0; a11 < this._recipients.length; a11++) {
            let b3 = this._recipients[a11];
            if (!aa(this._protectedHeader, this._unprotectedHeader, b3.unprotectedHeader)) throw new A("JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint");
            let c3 = { ...this._protectedHeader, ...this._unprotectedHeader, ...b3.unprotectedHeader }, { alg: d3 } = c3;
            if ("string" != typeof d3 || !d3) throw new A('JWE "alg" (Algorithm) Header Parameter missing or invalid');
            if ("dir" === d3 || "ECDH-ES" === d3) throw new A('"dir" and "ECDH-ES" alg may only be used with a single recipient');
            if ("string" != typeof c3.enc || !c3.enc) throw new A('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
            if (e2) {
              if (e2 !== c3.enc) throw new A('JWE "enc" (Encryption Algorithm) Header Parameter must be the same for all recipients');
            } else e2 = c3.enc;
            if (aN(A, /* @__PURE__ */ new Map(), b3.options.crit, this._protectedHeader, c3), void 0 !== c3.zip && (!this._protectedHeader || !this._protectedHeader.zip)) throw new A('JWE "zip" (Compression Algorithm) Header MUST be integrity protected');
          }
          let f2 = as(e2), g2 = { ciphertext: "", iv: "", recipients: [], tag: "" };
          for (let h2 = 0; h2 < this._recipients.length; h2++) {
            let i2 = this._recipients[h2], j2 = {};
            g2.recipients.push(j2);
            let k2 = { ...this._protectedHeader, ...this._unprotectedHeader, ...i2.unprotectedHeader }.alg.startsWith("PBES2") ? 2048 + h2 : void 0;
            if (0 === h2) {
              let b3 = await new aY(this._plaintext).setAdditionalAuthenticatedData(this._aad).setContentEncryptionKey(f2).setProtectedHeader(this._protectedHeader).setSharedUnprotectedHeader(this._unprotectedHeader).setUnprotectedHeader(i2.unprotectedHeader).setKeyManagementParameters({ p2c: k2 }).encrypt(i2.key, { ...i2.options, ...a10, [aX]: true });
              g2.ciphertext = b3.ciphertext, g2.iv = b3.iv, g2.tag = b3.tag, b3.aad && (g2.aad = b3.aad), b3.protected && (g2.protected = b3.protected), b3.unprotected && (g2.unprotected = b3.unprotected), j2.encrypted_key = b3.encrypted_key, b3.header && (j2.header = b3.header);
              continue;
            }
            let { encryptedKey: l2, parameters: m2 } = await aW((null == (b2 = i2.unprotectedHeader) ? void 0 : b2.alg) || (null == (c2 = this._protectedHeader) ? void 0 : c2.alg) || (null == (d2 = this._unprotectedHeader) ? void 0 : d2.alg), e2, i2.key, f2, { p2c: k2 });
            j2.encrypted_key = q(l2), (i2.unprotectedHeader || m2) && (j2.header = { ...i2.unprotectedHeader, ...m2 });
          }
          return g2;
        }
      }
      function a_(a10, b2) {
        let c2 = `SHA-${a10.slice(-3)}`;
        switch (a10) {
          case "HS256":
          case "HS384":
          case "HS512":
            return { hash: c2, name: "HMAC" };
          case "PS256":
          case "PS384":
          case "PS512":
            return { hash: c2, name: "RSA-PSS", saltLength: a10.slice(-3) >> 3 };
          case "RS256":
          case "RS384":
          case "RS512":
            return { hash: c2, name: "RSASSA-PKCS1-v1_5" };
          case "ES256":
          case "ES384":
          case "ES512":
            return { hash: c2, name: "ECDSA", namedCurve: b2.namedCurve };
          case "EdDSA":
            return { name: b2.name };
          default:
            throw new x(`alg ${a10} is not supported either by JOSE or your javascript runtime`);
        }
      }
      function a0(a10, b2, c2) {
        if (b2 instanceof CryptoKey) return !function(a11, b3, ...c3) {
          switch (b3) {
            case "HS256":
            case "HS384":
            case "HS512": {
              if (!P(a11.algorithm, "HMAC")) throw O("HMAC");
              let c4 = parseInt(b3.slice(2), 10);
              if (Q(a11.algorithm.hash) !== c4) throw O(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "RS256":
            case "RS384":
            case "RS512": {
              if (!P(a11.algorithm, "RSASSA-PKCS1-v1_5")) throw O("RSASSA-PKCS1-v1_5");
              let c4 = parseInt(b3.slice(2), 10);
              if (Q(a11.algorithm.hash) !== c4) throw O(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "PS256":
            case "PS384":
            case "PS512": {
              if (!P(a11.algorithm, "RSA-PSS")) throw O("RSA-PSS");
              let c4 = parseInt(b3.slice(2), 10);
              if (Q(a11.algorithm.hash) !== c4) throw O(`SHA-${c4}`, "algorithm.hash");
              break;
            }
            case "EdDSA":
              if ("Ed25519" !== a11.algorithm.name && "Ed448" !== a11.algorithm.name) throw O("Ed25519 or Ed448");
              break;
            case "ES256":
            case "ES384":
            case "ES512": {
              if (!P(a11.algorithm, "ECDSA")) throw O("ECDSA");
              let c4 = function(a12) {
                switch (a12) {
                  case "ES256":
                    return "P-256";
                  case "ES384":
                    return "P-384";
                  case "ES512":
                    return "P-521";
                  default:
                    throw Error("unreachable");
                }
              }(b3);
              if (a11.algorithm.namedCurve !== c4) throw O(c4, "algorithm.namedCurve");
              break;
            }
            default:
              throw TypeError("CryptoKey does not support this operation");
          }
          R(a11, c3);
        }(b2, a10, c2), b2;
        if (b2 instanceof Uint8Array) {
          if (!a10.startsWith("HS")) throw TypeError(U(b2, ...W));
          return f.subtle.importKey("raw", b2, { hash: `SHA-${a10.slice(-3)}`, name: "HMAC" }, false, [c2]);
        }
        throw TypeError(U(b2, ...W, "Uint8Array"));
      }
      let a1 = async (a10, b2, c2, d2) => {
        let e2 = await a0(a10, b2, "verify");
        ao(a10, e2);
        let g2 = a_(a10, e2.algorithm);
        try {
          return await f.subtle.verify(g2, e2, c2, d2);
        } catch (a11) {
          return false;
        }
      };
      async function a2(a10, b2, c2) {
        var d2;
        let e2, f2;
        if (!ab(a10)) throw new B("Flattened JWS must be an object");
        if (void 0 === a10.protected && void 0 === a10.header) throw new B('Flattened JWS must have either of the "protected" or "header" members');
        if (void 0 !== a10.protected && "string" != typeof a10.protected) throw new B("JWS Protected Header incorrect type");
        if (void 0 === a10.payload) throw new B("JWS Payload missing");
        if ("string" != typeof a10.signature) throw new B("JWS Signature missing or incorrect type");
        if (void 0 !== a10.header && !ab(a10.header)) throw new B("JWS Unprotected Header incorrect type");
        let g2 = {};
        if (a10.protected) try {
          let b3 = s(a10.protected);
          g2 = JSON.parse(i.decode(b3));
        } catch (a11) {
          throw new B("JWS Protected Header is invalid");
        }
        if (!aa(g2, a10.header)) throw new B("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
        let k2 = { ...g2, ...a10.header }, l2 = aN(B, /* @__PURE__ */ new Map([["b64", true]]), null == c2 ? void 0 : c2.crit, g2, k2), m2 = true;
        if (l2.has("b64") && "boolean" != typeof (m2 = g2.b64)) throw new B('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
        let { alg: n2 } = k2;
        if ("string" != typeof n2 || !n2) throw new B('JWS "alg" (Algorithm) Header Parameter missing or invalid');
        let o2 = c2 && aO("algorithms", c2.algorithms);
        if (o2 && !o2.has(n2)) throw new w('"alg" (Algorithm) Header Parameter not allowed');
        if (m2) {
          if ("string" != typeof a10.payload) throw new B("JWS Payload must be a string");
        } else if ("string" != typeof a10.payload && !(a10.payload instanceof Uint8Array)) throw new B("JWS Payload must be a string or an Uint8Array instance");
        let p2 = false;
        "function" == typeof b2 && (b2 = await b2(g2, a10), p2 = true), aG(n2, b2, "verify");
        let q2 = j(h.encode(null != (d2 = a10.protected) ? d2 : ""), h.encode("."), "string" == typeof a10.payload ? h.encode(a10.payload) : a10.payload);
        try {
          e2 = s(a10.signature);
        } catch (a11) {
          throw new B("Failed to base64url decode the signature");
        }
        if (!await a1(n2, b2, e2, q2)) throw new I();
        if (m2) try {
          f2 = s(a10.payload);
        } catch (a11) {
          throw new B("Failed to base64url decode the payload");
        }
        else f2 = "string" == typeof a10.payload ? h.encode(a10.payload) : a10.payload;
        let r2 = { payload: f2 };
        return (void 0 !== a10.protected && (r2.protectedHeader = g2), void 0 !== a10.header && (r2.unprotectedHeader = a10.header), p2) ? { ...r2, key: b2 } : r2;
      }
      async function a3(a10, b2, c2) {
        if (a10 instanceof Uint8Array && (a10 = i.decode(a10)), "string" != typeof a10) throw new B("Compact JWS must be a string or Uint8Array");
        let { 0: d2, 1: e2, 2: f2, length: g2 } = a10.split(".");
        if (3 !== g2) throw new B("Invalid Compact JWS");
        let h2 = await a2({ payload: e2, protected: d2, signature: f2 }, b2, c2), j2 = { payload: h2.payload, protectedHeader: h2.protectedHeader };
        return "function" == typeof b2 ? { ...j2, key: h2.key } : j2;
      }
      async function a4(a10, b2, c2) {
        if (!ab(a10)) throw new B("General JWS must be an object");
        if (!Array.isArray(a10.signatures) || !a10.signatures.every(ab)) throw new B("JWS Signatures missing or incorrect type");
        for (let d2 of a10.signatures) try {
          return await a2({ header: d2.header, payload: a10.payload, protected: d2.protected, signature: d2.signature }, b2, c2);
        } catch (a11) {
        }
        throw new I();
      }
      let a5 = (a10) => Math.floor(a10.getTime() / 1e3), a6 = /^(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)$/i, a7 = (a10) => {
        let b2 = a6.exec(a10);
        if (!b2) throw TypeError("Invalid time period format");
        let c2 = parseFloat(b2[1]);
        switch (b2[2].toLowerCase()) {
          case "sec":
          case "secs":
          case "second":
          case "seconds":
          case "s":
            return Math.round(c2);
          case "minute":
          case "minutes":
          case "min":
          case "mins":
          case "m":
            return Math.round(60 * c2);
          case "hour":
          case "hours":
          case "hr":
          case "hrs":
          case "h":
            return Math.round(3600 * c2);
          case "day":
          case "days":
          case "d":
            return Math.round(86400 * c2);
          case "week":
          case "weeks":
          case "w":
            return Math.round(604800 * c2);
          default:
            return Math.round(31557600 * c2);
        }
      }, a8 = (a10) => a10.toLowerCase().replace(/^application\//, ""), a9 = (a10, b2, c2 = {}) => {
        let d2, e2, { typ: f2 } = c2;
        if (f2 && ("string" != typeof a10.typ || a8(a10.typ) !== a8(f2))) throw new u('unexpected "typ" JWT header value', "typ", "check_failed");
        try {
          d2 = JSON.parse(i.decode(b2));
        } catch (a11) {
        }
        if (!ab(d2)) throw new C("JWT Claims Set must be a top-level JSON object");
        let { requiredClaims: g2 = [], issuer: h2, subject: j2, audience: k2, maxTokenAge: l2 } = c2;
        for (let a11 of (void 0 !== l2 && g2.push("iat"), void 0 !== k2 && g2.push("aud"), void 0 !== j2 && g2.push("sub"), void 0 !== h2 && g2.push("iss"), new Set(g2.reverse()))) if (!(a11 in d2)) throw new u(`missing required "${a11}" claim`, a11, "missing");
        if (h2 && !(Array.isArray(h2) ? h2 : [h2]).includes(d2.iss)) throw new u('unexpected "iss" claim value', "iss", "check_failed");
        if (j2 && d2.sub !== j2) throw new u('unexpected "sub" claim value', "sub", "check_failed");
        if (k2 && !((a11, b3) => "string" == typeof a11 ? b3.includes(a11) : !!Array.isArray(a11) && b3.some(Set.prototype.has.bind(new Set(a11))))(d2.aud, "string" == typeof k2 ? [k2] : k2)) throw new u('unexpected "aud" claim value', "aud", "check_failed");
        switch (typeof c2.clockTolerance) {
          case "string":
            e2 = a7(c2.clockTolerance);
            break;
          case "number":
            e2 = c2.clockTolerance;
            break;
          case "undefined":
            e2 = 0;
            break;
          default:
            throw TypeError("Invalid clockTolerance option type");
        }
        let { currentDate: m2 } = c2, n2 = a5(m2 || /* @__PURE__ */ new Date());
        if ((void 0 !== d2.iat || l2) && "number" != typeof d2.iat) throw new u('"iat" claim must be a number', "iat", "invalid");
        if (void 0 !== d2.nbf) {
          if ("number" != typeof d2.nbf) throw new u('"nbf" claim must be a number', "nbf", "invalid");
          if (d2.nbf > n2 + e2) throw new u('"nbf" claim timestamp check failed', "nbf", "check_failed");
        }
        if (void 0 !== d2.exp) {
          if ("number" != typeof d2.exp) throw new u('"exp" claim must be a number', "exp", "invalid");
          if (d2.exp <= n2 - e2) throw new v('"exp" claim timestamp check failed', "exp", "check_failed");
        }
        if (l2) {
          let a11 = n2 - d2.iat;
          if (a11 - e2 > ("number" == typeof l2 ? l2 : a7(l2))) throw new v('"iat" claim timestamp check failed (too far in the past)', "iat", "check_failed");
          if (a11 < 0 - e2) throw new u('"iat" claim timestamp check failed (it should be in the past)', "iat", "check_failed");
        }
        return d2;
      };
      async function ba(a10, b2, c2) {
        var d2;
        let e2 = await a3(a10, b2, c2);
        if ((null == (d2 = e2.protectedHeader.crit) ? void 0 : d2.includes("b64")) && false === e2.protectedHeader.b64) throw new C("JWTs MUST NOT use unencoded payload");
        let f2 = { payload: a9(e2.protectedHeader, e2.payload, c2), protectedHeader: e2.protectedHeader };
        return "function" == typeof b2 ? { ...f2, key: e2.key } : f2;
      }
      async function bb(a10, b2, c2) {
        let d2 = await aQ(a10, b2, c2), e2 = a9(d2.protectedHeader, d2.plaintext, c2), { protectedHeader: f2 } = d2;
        if (void 0 !== f2.iss && f2.iss !== e2.iss) throw new u('replicated "iss" claim header parameter mismatch', "iss", "mismatch");
        if (void 0 !== f2.sub && f2.sub !== e2.sub) throw new u('replicated "sub" claim header parameter mismatch', "sub", "mismatch");
        if (void 0 !== f2.aud && JSON.stringify(f2.aud) !== JSON.stringify(e2.aud)) throw new u('replicated "aud" claim header parameter mismatch', "aud", "mismatch");
        let g2 = { payload: e2, protectedHeader: f2 };
        return "function" == typeof b2 ? { ...g2, key: d2.key } : g2;
      }
      class bc {
        constructor(a10) {
          this._flattened = new aY(a10);
        }
        setContentEncryptionKey(a10) {
          return this._flattened.setContentEncryptionKey(a10), this;
        }
        setInitializationVector(a10) {
          return this._flattened.setInitializationVector(a10), this;
        }
        setProtectedHeader(a10) {
          return this._flattened.setProtectedHeader(a10), this;
        }
        setKeyManagementParameters(a10) {
          return this._flattened.setKeyManagementParameters(a10), this;
        }
        async encrypt(a10, b2) {
          let c2 = await this._flattened.encrypt(a10, b2);
          return [c2.protected, c2.encrypted_key, c2.iv, c2.ciphertext, c2.tag].join(".");
        }
      }
      let bd = async (a10, b2, c2) => {
        let d2 = await a0(a10, b2, "sign");
        return ao(a10, d2), new Uint8Array(await f.subtle.sign(a_(a10, d2.algorithm), d2, c2));
      };
      class be {
        constructor(a10) {
          if (!(a10 instanceof Uint8Array)) throw TypeError("payload must be an instance of Uint8Array");
          this._payload = a10;
        }
        setProtectedHeader(a10) {
          if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this._protectedHeader = a10, this;
        }
        setUnprotectedHeader(a10) {
          if (this._unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
          return this._unprotectedHeader = a10, this;
        }
        async sign(a10, b2) {
          let c2;
          if (!this._protectedHeader && !this._unprotectedHeader) throw new B("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
          if (!aa(this._protectedHeader, this._unprotectedHeader)) throw new B("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
          let d2 = { ...this._protectedHeader, ...this._unprotectedHeader }, e2 = aN(B, /* @__PURE__ */ new Map([["b64", true]]), null == b2 ? void 0 : b2.crit, this._protectedHeader, d2), f2 = true;
          if (e2.has("b64") && "boolean" != typeof (f2 = this._protectedHeader.b64)) throw new B('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
          let { alg: g2 } = d2;
          if ("string" != typeof g2 || !g2) throw new B('JWS "alg" (Algorithm) Header Parameter missing or invalid');
          aG(g2, a10, "sign");
          let k2 = this._payload;
          f2 && (k2 = h.encode(q(k2)));
          let l2 = j(c2 = this._protectedHeader ? h.encode(q(JSON.stringify(this._protectedHeader))) : h.encode(""), h.encode("."), k2), m2 = { signature: q(await bd(g2, a10, l2)), payload: "" };
          return f2 && (m2.payload = i.decode(k2)), this._unprotectedHeader && (m2.header = this._unprotectedHeader), this._protectedHeader && (m2.protected = i.decode(c2)), m2;
        }
      }
      class bf {
        constructor(a10) {
          this._flattened = new be(a10);
        }
        setProtectedHeader(a10) {
          return this._flattened.setProtectedHeader(a10), this;
        }
        async sign(a10, b2) {
          let c2 = await this._flattened.sign(a10, b2);
          if (void 0 === c2.payload) throw TypeError("use the flattened module for creating JWS with b64: false");
          return `${c2.protected}.${c2.payload}.${c2.signature}`;
        }
      }
      class bg {
        constructor(a10, b2, c2) {
          this.parent = a10, this.key = b2, this.options = c2;
        }
        setProtectedHeader(a10) {
          if (this.protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this.protectedHeader = a10, this;
        }
        setUnprotectedHeader(a10) {
          if (this.unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
          return this.unprotectedHeader = a10, this;
        }
        addSignature(...a10) {
          return this.parent.addSignature(...a10);
        }
        sign(...a10) {
          return this.parent.sign(...a10);
        }
        done() {
          return this.parent;
        }
      }
      class bh {
        constructor(a10) {
          this._signatures = [], this._payload = a10;
        }
        addSignature(a10, b2) {
          let c2 = new bg(this, a10, b2);
          return this._signatures.push(c2), c2;
        }
        async sign() {
          if (!this._signatures.length) throw new B("at least one signature must be added");
          let a10 = { signatures: [], payload: "" };
          for (let b2 = 0; b2 < this._signatures.length; b2++) {
            let c2 = this._signatures[b2], d2 = new be(this._payload);
            d2.setProtectedHeader(c2.protectedHeader), d2.setUnprotectedHeader(c2.unprotectedHeader);
            let { payload: e2, ...f2 } = await d2.sign(c2.key, c2.options);
            if (0 === b2) a10.payload = e2;
            else if (a10.payload !== e2) throw new B("inconsistent use of JWS Unencoded Payload (RFC7797)");
            a10.signatures.push(f2);
          }
          return a10;
        }
      }
      class bi {
        constructor(a10) {
          if (!ab(a10)) throw TypeError("JWT Claims Set MUST be an object");
          this._payload = a10;
        }
        setIssuer(a10) {
          return this._payload = { ...this._payload, iss: a10 }, this;
        }
        setSubject(a10) {
          return this._payload = { ...this._payload, sub: a10 }, this;
        }
        setAudience(a10) {
          return this._payload = { ...this._payload, aud: a10 }, this;
        }
        setJti(a10) {
          return this._payload = { ...this._payload, jti: a10 }, this;
        }
        setNotBefore(a10) {
          return "number" == typeof a10 ? this._payload = { ...this._payload, nbf: a10 } : this._payload = { ...this._payload, nbf: a5(/* @__PURE__ */ new Date()) + a7(a10) }, this;
        }
        setExpirationTime(a10) {
          return "number" == typeof a10 ? this._payload = { ...this._payload, exp: a10 } : this._payload = { ...this._payload, exp: a5(/* @__PURE__ */ new Date()) + a7(a10) }, this;
        }
        setIssuedAt(a10) {
          return void 0 === a10 ? this._payload = { ...this._payload, iat: a5(/* @__PURE__ */ new Date()) } : this._payload = { ...this._payload, iat: a10 }, this;
        }
      }
      class bj extends bi {
        setProtectedHeader(a10) {
          return this._protectedHeader = a10, this;
        }
        async sign(a10, b2) {
          var c2;
          let d2 = new bf(h.encode(JSON.stringify(this._payload)));
          if (d2.setProtectedHeader(this._protectedHeader), Array.isArray(null == (c2 = this._protectedHeader) ? void 0 : c2.crit) && this._protectedHeader.crit.includes("b64") && false === this._protectedHeader.b64) throw new C("JWTs MUST NOT use unencoded payload");
          return d2.sign(a10, b2);
        }
      }
      class bk extends bi {
        setProtectedHeader(a10) {
          if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
          return this._protectedHeader = a10, this;
        }
        setKeyManagementParameters(a10) {
          if (this._keyManagementParameters) throw TypeError("setKeyManagementParameters can only be called once");
          return this._keyManagementParameters = a10, this;
        }
        setContentEncryptionKey(a10) {
          if (this._cek) throw TypeError("setContentEncryptionKey can only be called once");
          return this._cek = a10, this;
        }
        setInitializationVector(a10) {
          if (this._iv) throw TypeError("setInitializationVector can only be called once");
          return this._iv = a10, this;
        }
        replicateIssuerAsHeader() {
          return this._replicateIssuerAsHeader = true, this;
        }
        replicateSubjectAsHeader() {
          return this._replicateSubjectAsHeader = true, this;
        }
        replicateAudienceAsHeader() {
          return this._replicateAudienceAsHeader = true, this;
        }
        async encrypt(a10, b2) {
          let c2 = new bc(h.encode(JSON.stringify(this._payload)));
          return this._replicateIssuerAsHeader && (this._protectedHeader = { ...this._protectedHeader, iss: this._payload.iss }), this._replicateSubjectAsHeader && (this._protectedHeader = { ...this._protectedHeader, sub: this._payload.sub }), this._replicateAudienceAsHeader && (this._protectedHeader = { ...this._protectedHeader, aud: this._payload.aud }), c2.setProtectedHeader(this._protectedHeader), this._iv && c2.setInitializationVector(this._iv), this._cek && c2.setContentEncryptionKey(this._cek), this._keyManagementParameters && c2.setKeyManagementParameters(this._keyManagementParameters), c2.encrypt(a10, b2);
        }
      }
      let bl = (a10, b2) => {
        if ("string" != typeof a10 || !a10) throw new D(`${b2} missing or invalid`);
      };
      async function bm(a10, b2) {
        let c2;
        if (!ab(a10)) throw TypeError("JWK must be an object");
        if (null != b2 || (b2 = "sha256"), "sha256" !== b2 && "sha384" !== b2 && "sha512" !== b2) throw TypeError('digestAlgorithm must one of "sha256", "sha384", or "sha512"');
        switch (a10.kty) {
          case "EC":
            bl(a10.crv, '"crv" (Curve) Parameter'), bl(a10.x, '"x" (X Coordinate) Parameter'), bl(a10.y, '"y" (Y Coordinate) Parameter'), c2 = { crv: a10.crv, kty: a10.kty, x: a10.x, y: a10.y };
            break;
          case "OKP":
            bl(a10.crv, '"crv" (Subtype of Key Pair) Parameter'), bl(a10.x, '"x" (Public Key) Parameter'), c2 = { crv: a10.crv, kty: a10.kty, x: a10.x };
            break;
          case "RSA":
            bl(a10.e, '"e" (Exponent) Parameter'), bl(a10.n, '"n" (Modulus) Parameter'), c2 = { e: a10.e, kty: a10.kty, n: a10.n };
            break;
          case "oct":
            bl(a10.k, '"k" (Key Value) Parameter'), c2 = { k: a10.k, kty: a10.kty };
            break;
          default:
            throw new x('"kty" (Key Type) Parameter missing or unsupported');
        }
        let d2 = h.encode(JSON.stringify(c2));
        return q(await g(b2, d2));
      }
      async function bn(a10, b2) {
        null != b2 || (b2 = "sha256");
        let c2 = await bm(a10, b2);
        return `urn:ietf:params:oauth:jwk-thumbprint:sha-${b2.slice(-3)}:${c2}`;
      }
      async function bo(a10, b2) {
        let c2 = { ...a10, ...null == b2 ? void 0 : b2.header };
        if (!ab(c2.jwk)) throw new B('"jwk" (JSON Web Key) Header Parameter must be a JSON object');
        let d2 = await aF({ ...c2.jwk, ext: true }, c2.alg, true);
        if (d2 instanceof Uint8Array || "public" !== d2.type) throw new B('"jwk" (JSON Web Key) Header Parameter must be a public key');
        return d2;
      }
      function bp(a10) {
        return a10 && "object" == typeof a10 && Array.isArray(a10.keys) && a10.keys.every(bq);
      }
      function bq(a10) {
        return ab(a10);
      }
      class br {
        constructor(a10) {
          if (this._cached = /* @__PURE__ */ new WeakMap(), !bp(a10)) throw new E("JSON Web Key Set malformed");
          this._jwks = function(a11) {
            return "function" == typeof structuredClone ? structuredClone(a11) : JSON.parse(JSON.stringify(a11));
          }(a10);
        }
        async getKey(a10, b2) {
          let { alg: c2, kid: d2 } = { ...a10, ...null == b2 ? void 0 : b2.header }, e2 = function(a11) {
            switch ("string" == typeof a11 && a11.slice(0, 2)) {
              case "RS":
              case "PS":
                return "RSA";
              case "ES":
                return "EC";
              case "Ed":
                return "OKP";
              default:
                throw new x('Unsupported "alg" value for a JSON Web Key Set');
            }
          }(c2), f2 = this._jwks.keys.filter((a11) => {
            let b3 = e2 === a11.kty;
            if (b3 && "string" == typeof d2 && (b3 = d2 === a11.kid), b3 && "string" == typeof a11.alg && (b3 = c2 === a11.alg), b3 && "string" == typeof a11.use && (b3 = "sig" === a11.use), b3 && Array.isArray(a11.key_ops) && (b3 = a11.key_ops.includes("verify")), b3 && "EdDSA" === c2 && (b3 = "Ed25519" === a11.crv || "Ed448" === a11.crv), b3) switch (c2) {
              case "ES256":
                b3 = "P-256" === a11.crv;
                break;
              case "ES256K":
                b3 = "secp256k1" === a11.crv;
                break;
              case "ES384":
                b3 = "P-384" === a11.crv;
                break;
              case "ES512":
                b3 = "P-521" === a11.crv;
            }
            return b3;
          }), { 0: g2, length: h2 } = f2;
          if (0 === h2) throw new F();
          if (1 !== h2) {
            let a11 = new G(), { _cached: b3 } = this;
            throw a11[Symbol.asyncIterator] = async function* () {
              for (let a12 of f2) try {
                yield await bs(b3, a12, c2);
              } catch (a13) {
                continue;
              }
            }, a11;
          }
          return bs(this._cached, g2, c2);
        }
      }
      async function bs(a10, b2, c2) {
        let d2 = a10.get(b2) || a10.set(b2, {}).get(b2);
        if (void 0 === d2[c2]) {
          let a11 = await aF({ ...b2, ext: true }, c2);
          if (a11 instanceof Uint8Array || "public" !== a11.type) throw new E("JSON Web Key Set members must be public keys");
          d2[c2] = a11;
        }
        return d2[c2];
      }
      function bt(a10) {
        let b2 = new br(a10);
        return async function(a11, c2) {
          return b2.getKey(a11, c2);
        };
      }
      let bu = async (a10, b2, c2) => {
        let d2, e2, f2 = false;
        "function" == typeof AbortController && (d2 = new AbortController(), e2 = setTimeout(() => {
          f2 = true, d2.abort();
        }, b2));
        let g2 = await fetch(a10.href, { signal: d2 ? d2.signal : void 0, redirect: "manual", headers: c2.headers }).catch((a11) => {
          if (f2) throw new H();
          throw a11;
        });
        if (void 0 !== e2 && clearTimeout(e2), 200 !== g2.status) throw new t("Expected 200 OK from the JSON Web Key Set HTTP response");
        try {
          return await g2.json();
        } catch (a11) {
          throw new t("Failed to parse the JSON Web Key Set HTTP response as JSON");
        }
      };
      class bv extends br {
        constructor(a10, b2) {
          if (super({ keys: [] }), this._jwks = void 0, !(a10 instanceof URL)) throw TypeError("url must be an instance of URL");
          this._url = new URL(a10.href), this._options = { agent: null == b2 ? void 0 : b2.agent, headers: null == b2 ? void 0 : b2.headers }, this._timeoutDuration = "number" == typeof (null == b2 ? void 0 : b2.timeoutDuration) ? null == b2 ? void 0 : b2.timeoutDuration : 5e3, this._cooldownDuration = "number" == typeof (null == b2 ? void 0 : b2.cooldownDuration) ? null == b2 ? void 0 : b2.cooldownDuration : 3e4, this._cacheMaxAge = "number" == typeof (null == b2 ? void 0 : b2.cacheMaxAge) ? null == b2 ? void 0 : b2.cacheMaxAge : 6e5;
        }
        coolingDown() {
          return "number" == typeof this._jwksTimestamp && Date.now() < this._jwksTimestamp + this._cooldownDuration;
        }
        fresh() {
          return "number" == typeof this._jwksTimestamp && Date.now() < this._jwksTimestamp + this._cacheMaxAge;
        }
        async getKey(a10, b2) {
          this._jwks && this.fresh() || await this.reload();
          try {
            return await super.getKey(a10, b2);
          } catch (c2) {
            if (c2 instanceof F && false === this.coolingDown()) return await this.reload(), super.getKey(a10, b2);
            throw c2;
          }
        }
        async reload() {
          this._pendingFetch && ("undefined" != typeof WebSocketPair || "undefined" != typeof navigator && "Cloudflare-Workers" === navigator.userAgent) && (this._pendingFetch = void 0), this._pendingFetch || (this._pendingFetch = bu(this._url, this._timeoutDuration, this._options).then((a10) => {
            if (!bp(a10)) throw new E("JSON Web Key Set malformed");
            this._jwks = { keys: a10.keys }, this._jwksTimestamp = Date.now(), this._pendingFetch = void 0;
          }).catch((a10) => {
            throw this._pendingFetch = void 0, a10;
          })), await this._pendingFetch;
        }
      }
      function bw(a10, b2) {
        let c2 = new bv(a10, b2);
        return async function(a11, b3) {
          return c2.getKey(a11, b3);
        };
      }
      class bx extends bi {
        encode() {
          let a10 = q(JSON.stringify({ alg: "none" })), b2 = q(JSON.stringify(this._payload));
          return `${a10}.${b2}.`;
        }
        static decode(a10, b2) {
          let c2;
          if ("string" != typeof a10) throw new C("Unsecured JWT must be a string");
          let { 0: d2, 1: e2, 2: f2, length: g2 } = a10.split(".");
          if (3 !== g2 || "" !== f2) throw new C("Invalid Unsecured JWT");
          try {
            if (c2 = JSON.parse(i.decode(s(d2))), "none" !== c2.alg) throw Error();
          } catch (a11) {
            throw new C("Invalid Unsecured JWT");
          }
          return { payload: a9(c2, s(e2), b2), header: c2 };
        }
      }
      let by = q, bz = s;
      function bA(a10) {
        let b2;
        if ("string" == typeof a10) {
          let c2 = a10.split(".");
          (3 === c2.length || 5 === c2.length) && ([b2] = c2);
        } else if ("object" == typeof a10 && a10) if ("protected" in a10) b2 = a10.protected;
        else throw TypeError("Token does not contain a Protected Header");
        try {
          if ("string" != typeof b2 || !b2) throw Error();
          let a11 = JSON.parse(i.decode(bz(b2)));
          if (!ab(a11)) throw Error();
          return a11;
        } catch (a11) {
          throw TypeError("Invalid Token or Protected Header formatting");
        }
      }
      function bB(a10) {
        let b2, c2;
        if ("string" != typeof a10) throw new C("JWTs must use Compact JWS serialization, JWT must be a string");
        let { 1: d2, length: e2 } = a10.split(".");
        if (5 === e2) throw new C("Only JWTs using Compact JWS serialization can be decoded");
        if (3 !== e2) throw new C("Invalid JWT");
        if (!d2) throw new C("JWTs must contain a payload");
        try {
          b2 = bz(d2);
        } catch (a11) {
          throw new C("Failed to base64url decode the payload");
        }
        try {
          c2 = JSON.parse(i.decode(b2));
        } catch (a11) {
          throw new C("Failed to parse the decoded payload as JSON");
        }
        if (!ab(c2)) throw new C("Invalid JWT Claims Set");
        return c2;
      }
      async function bC(a10, b2) {
        var c2;
        let d2, e2, g2;
        switch (a10) {
          case "HS256":
          case "HS384":
          case "HS512":
            d2 = parseInt(a10.slice(-3), 10), e2 = { name: "HMAC", hash: `SHA-${d2}`, length: d2 }, g2 = ["sign", "verify"];
            break;
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return J(new Uint8Array((d2 = parseInt(a10.slice(-3), 10)) >> 3));
          case "A128KW":
          case "A192KW":
          case "A256KW":
            e2 = { name: "AES-KW", length: d2 = parseInt(a10.slice(1, 4), 10) }, g2 = ["wrapKey", "unwrapKey"];
            break;
          case "A128GCMKW":
          case "A192GCMKW":
          case "A256GCMKW":
          case "A128GCM":
          case "A192GCM":
          case "A256GCM":
            e2 = { name: "AES-GCM", length: d2 = parseInt(a10.slice(1, 4), 10) }, g2 = ["encrypt", "decrypt"];
            break;
          default:
            throw new x('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
        }
        return f.subtle.generateKey(e2, null != (c2 = null == b2 ? void 0 : b2.extractable) && c2, g2);
      }
      function bD(a10) {
        var b2;
        let c2 = null != (b2 = null == a10 ? void 0 : a10.modulusLength) ? b2 : 2048;
        if ("number" != typeof c2 || c2 < 2048) throw new x("Invalid or unsupported modulusLength option provided, 2048 bits or larger keys must be used");
        return c2;
      }
      async function bE(a10, b2) {
        var c2, d2, e2;
        let g2, h2;
        switch (a10) {
          case "PS256":
          case "PS384":
          case "PS512":
            g2 = { name: "RSA-PSS", hash: `SHA-${a10.slice(-3)}`, publicExponent: new Uint8Array([1, 0, 1]), modulusLength: bD(b2) }, h2 = ["sign", "verify"];
            break;
          case "RS256":
          case "RS384":
          case "RS512":
            g2 = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${a10.slice(-3)}`, publicExponent: new Uint8Array([1, 0, 1]), modulusLength: bD(b2) }, h2 = ["sign", "verify"];
            break;
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            g2 = { name: "RSA-OAEP", hash: `SHA-${parseInt(a10.slice(-3), 10) || 1}`, publicExponent: new Uint8Array([1, 0, 1]), modulusLength: bD(b2) }, h2 = ["decrypt", "unwrapKey", "encrypt", "wrapKey"];
            break;
          case "ES256":
            g2 = { name: "ECDSA", namedCurve: "P-256" }, h2 = ["sign", "verify"];
            break;
          case "ES384":
            g2 = { name: "ECDSA", namedCurve: "P-384" }, h2 = ["sign", "verify"];
            break;
          case "ES512":
            g2 = { name: "ECDSA", namedCurve: "P-521" }, h2 = ["sign", "verify"];
            break;
          case "EdDSA":
            h2 = ["sign", "verify"];
            let i2 = null != (c2 = null == b2 ? void 0 : b2.crv) ? c2 : "Ed25519";
            switch (i2) {
              case "Ed25519":
              case "Ed448":
                g2 = { name: i2 };
                break;
              default:
                throw new x("Invalid or unsupported crv option provided");
            }
            break;
          case "ECDH-ES":
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            h2 = ["deriveKey", "deriveBits"];
            let a11 = null != (d2 = null == b2 ? void 0 : b2.crv) ? d2 : "P-256";
            switch (a11) {
              case "P-256":
              case "P-384":
              case "P-521":
                g2 = { name: "ECDH", namedCurve: a11 };
                break;
              case "X25519":
              case "X448":
                g2 = { name: a11 };
                break;
              default:
                throw new x("Invalid or unsupported crv option provided, supported values are P-256, P-384, P-521, X25519, and X448");
            }
            break;
          }
          default:
            throw new x('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
        }
        return f.subtle.generateKey(g2, null != (e2 = null == b2 ? void 0 : b2.extractable) && e2, h2);
      }
      async function bF(a10, b2) {
        return bE(a10, b2);
      }
      async function bG(a10, b2) {
        return bC(a10, b2);
      }
      let bH = "WebCryptoAPI";
    }, 788: (a, b, c) => {
      "use strict";
      c.d(b, { q: () => f });
      class d {
        constructor(a2, b2, c2) {
          this.prev = null, this.next = null, this.key = a2, this.data = b2, this.size = c2;
        }
      }
      class e {
        constructor() {
          this.prev = null, this.next = null;
        }
      }
      class f {
        constructor(a2, b2, c2) {
          this.cache = /* @__PURE__ */ new Map(), this.totalSize = 0, this.maxSize = a2, this.calculateSize = b2, this.onEvict = c2, this.head = new e(), this.tail = new e(), this.head.next = this.tail, this.tail.prev = this.head;
        }
        addToHead(a2) {
          a2.prev = this.head, a2.next = this.head.next, this.head.next.prev = a2, this.head.next = a2;
        }
        removeNode(a2) {
          a2.prev.next = a2.next, a2.next.prev = a2.prev;
        }
        moveToHead(a2) {
          this.removeNode(a2), this.addToHead(a2);
        }
        removeTail() {
          let a2 = this.tail.prev;
          return this.removeNode(a2), a2;
        }
        set(a2, b2) {
          let c2 = (null == this.calculateSize ? void 0 : this.calculateSize.call(this, b2)) ?? 1;
          if (c2 <= 0) throw Object.defineProperty(Error(`LRUCache: calculateSize returned ${c2}, but size must be > 0. Items with size 0 would never be evicted, causing unbounded cache growth.`), "__NEXT_ERROR_CODE", { value: "E789", enumerable: false, configurable: true });
          if (c2 > this.maxSize) return console.warn("Single item size exceeds maxSize"), false;
          let e2 = this.cache.get(a2);
          if (e2) e2.data = b2, this.totalSize = this.totalSize - e2.size + c2, e2.size = c2, this.moveToHead(e2);
          else {
            let e3 = new d(a2, b2, c2);
            this.cache.set(a2, e3), this.addToHead(e3), this.totalSize += c2;
          }
          for (; this.totalSize > this.maxSize && this.cache.size > 0; ) {
            let a3 = this.removeTail();
            this.cache.delete(a3.key), this.totalSize -= a3.size, null == this.onEvict || this.onEvict.call(this, a3.key, a3.data);
          }
          return true;
        }
        has(a2) {
          return this.cache.has(a2);
        }
        get(a2) {
          let b2 = this.cache.get(a2);
          if (b2) return this.moveToHead(b2), b2.data;
        }
        *[Symbol.iterator]() {
          let a2 = this.head.next;
          for (; a2 && a2 !== this.tail; ) {
            let b2 = a2;
            yield [b2.key, b2.data], a2 = a2.next;
          }
        }
        remove(a2) {
          let b2 = this.cache.get(a2);
          b2 && (this.removeNode(b2), this.cache.delete(a2), this.totalSize -= b2.size);
        }
        get size() {
          return this.cache.size;
        }
        get currentSize() {
          return this.totalSize;
        }
      }
    }, 809: (a, b, c) => {
      "use strict";
      c.d(b, { z: () => d });
      class d extends Error {
        constructor(a2, b2) {
          super("Invariant: " + (a2.endsWith(".") ? a2 : a2 + ".") + " This is a bug in Next.js.", b2), this.name = "InvariantError";
        }
      }
    }, 814: (a, b, c) => {
      "use strict";
      a.exports = c(440);
    }, 817: (a, b, c) => {
      (() => {
        "use strict";
        var b2 = { 491: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ContextAPI = void 0;
          let d2 = c2(223), e2 = c2(172), f2 = c2(930), g = "context", h = new d2.NoopContextManager();
          class i {
            constructor() {
            }
            static getInstance() {
              return this._instance || (this._instance = new i()), this._instance;
            }
            setGlobalContextManager(a3) {
              return (0, e2.registerGlobal)(g, a3, f2.DiagAPI.instance());
            }
            active() {
              return this._getContextManager().active();
            }
            with(a3, b4, c3, ...d3) {
              return this._getContextManager().with(a3, b4, c3, ...d3);
            }
            bind(a3, b4) {
              return this._getContextManager().bind(a3, b4);
            }
            _getContextManager() {
              return (0, e2.getGlobal)(g) || h;
            }
            disable() {
              this._getContextManager().disable(), (0, e2.unregisterGlobal)(g, f2.DiagAPI.instance());
            }
          }
          b3.ContextAPI = i;
        }, 930: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.DiagAPI = void 0;
          let d2 = c2(56), e2 = c2(912), f2 = c2(957), g = c2(172);
          class h {
            constructor() {
              function a3(a4) {
                return function(...b5) {
                  let c3 = (0, g.getGlobal)("diag");
                  if (c3) return c3[a4](...b5);
                };
              }
              let b4 = this;
              b4.setLogger = (a4, c3 = { logLevel: f2.DiagLogLevel.INFO }) => {
                var d3, h2, i;
                if (a4 === b4) {
                  let a5 = Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
                  return b4.error(null != (d3 = a5.stack) ? d3 : a5.message), false;
                }
                "number" == typeof c3 && (c3 = { logLevel: c3 });
                let j = (0, g.getGlobal)("diag"), k = (0, e2.createLogLevelDiagLogger)(null != (h2 = c3.logLevel) ? h2 : f2.DiagLogLevel.INFO, a4);
                if (j && !c3.suppressOverrideMessage) {
                  let a5 = null != (i = Error().stack) ? i : "<failed to generate stacktrace>";
                  j.warn(`Current logger will be overwritten from ${a5}`), k.warn(`Current logger will overwrite one already registered from ${a5}`);
                }
                return (0, g.registerGlobal)("diag", k, b4, true);
              }, b4.disable = () => {
                (0, g.unregisterGlobal)("diag", b4);
              }, b4.createComponentLogger = (a4) => new d2.DiagComponentLogger(a4), b4.verbose = a3("verbose"), b4.debug = a3("debug"), b4.info = a3("info"), b4.warn = a3("warn"), b4.error = a3("error");
            }
            static instance() {
              return this._instance || (this._instance = new h()), this._instance;
            }
          }
          b3.DiagAPI = h;
        }, 653: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.MetricsAPI = void 0;
          let d2 = c2(660), e2 = c2(172), f2 = c2(930), g = "metrics";
          class h {
            constructor() {
            }
            static getInstance() {
              return this._instance || (this._instance = new h()), this._instance;
            }
            setGlobalMeterProvider(a3) {
              return (0, e2.registerGlobal)(g, a3, f2.DiagAPI.instance());
            }
            getMeterProvider() {
              return (0, e2.getGlobal)(g) || d2.NOOP_METER_PROVIDER;
            }
            getMeter(a3, b4, c3) {
              return this.getMeterProvider().getMeter(a3, b4, c3);
            }
            disable() {
              (0, e2.unregisterGlobal)(g, f2.DiagAPI.instance());
            }
          }
          b3.MetricsAPI = h;
        }, 181: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.PropagationAPI = void 0;
          let d2 = c2(172), e2 = c2(874), f2 = c2(194), g = c2(277), h = c2(369), i = c2(930), j = "propagation", k = new e2.NoopTextMapPropagator();
          class l {
            constructor() {
              this.createBaggage = h.createBaggage, this.getBaggage = g.getBaggage, this.getActiveBaggage = g.getActiveBaggage, this.setBaggage = g.setBaggage, this.deleteBaggage = g.deleteBaggage;
            }
            static getInstance() {
              return this._instance || (this._instance = new l()), this._instance;
            }
            setGlobalPropagator(a3) {
              return (0, d2.registerGlobal)(j, a3, i.DiagAPI.instance());
            }
            inject(a3, b4, c3 = f2.defaultTextMapSetter) {
              return this._getGlobalPropagator().inject(a3, b4, c3);
            }
            extract(a3, b4, c3 = f2.defaultTextMapGetter) {
              return this._getGlobalPropagator().extract(a3, b4, c3);
            }
            fields() {
              return this._getGlobalPropagator().fields();
            }
            disable() {
              (0, d2.unregisterGlobal)(j, i.DiagAPI.instance());
            }
            _getGlobalPropagator() {
              return (0, d2.getGlobal)(j) || k;
            }
          }
          b3.PropagationAPI = l;
        }, 997: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.TraceAPI = void 0;
          let d2 = c2(172), e2 = c2(846), f2 = c2(139), g = c2(607), h = c2(930), i = "trace";
          class j {
            constructor() {
              this._proxyTracerProvider = new e2.ProxyTracerProvider(), this.wrapSpanContext = f2.wrapSpanContext, this.isSpanContextValid = f2.isSpanContextValid, this.deleteSpan = g.deleteSpan, this.getSpan = g.getSpan, this.getActiveSpan = g.getActiveSpan, this.getSpanContext = g.getSpanContext, this.setSpan = g.setSpan, this.setSpanContext = g.setSpanContext;
            }
            static getInstance() {
              return this._instance || (this._instance = new j()), this._instance;
            }
            setGlobalTracerProvider(a3) {
              let b4 = (0, d2.registerGlobal)(i, this._proxyTracerProvider, h.DiagAPI.instance());
              return b4 && this._proxyTracerProvider.setDelegate(a3), b4;
            }
            getTracerProvider() {
              return (0, d2.getGlobal)(i) || this._proxyTracerProvider;
            }
            getTracer(a3, b4) {
              return this.getTracerProvider().getTracer(a3, b4);
            }
            disable() {
              (0, d2.unregisterGlobal)(i, h.DiagAPI.instance()), this._proxyTracerProvider = new e2.ProxyTracerProvider();
            }
          }
          b3.TraceAPI = j;
        }, 277: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.deleteBaggage = b3.setBaggage = b3.getActiveBaggage = b3.getBaggage = void 0;
          let d2 = c2(491), e2 = (0, c2(780).createContextKey)("OpenTelemetry Baggage Key");
          function f2(a3) {
            return a3.getValue(e2) || void 0;
          }
          b3.getBaggage = f2, b3.getActiveBaggage = function() {
            return f2(d2.ContextAPI.getInstance().active());
          }, b3.setBaggage = function(a3, b4) {
            return a3.setValue(e2, b4);
          }, b3.deleteBaggage = function(a3) {
            return a3.deleteValue(e2);
          };
        }, 993: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.BaggageImpl = void 0;
          class c2 {
            constructor(a3) {
              this._entries = a3 ? new Map(a3) : /* @__PURE__ */ new Map();
            }
            getEntry(a3) {
              let b4 = this._entries.get(a3);
              if (b4) return Object.assign({}, b4);
            }
            getAllEntries() {
              return Array.from(this._entries.entries()).map(([a3, b4]) => [a3, b4]);
            }
            setEntry(a3, b4) {
              let d2 = new c2(this._entries);
              return d2._entries.set(a3, b4), d2;
            }
            removeEntry(a3) {
              let b4 = new c2(this._entries);
              return b4._entries.delete(a3), b4;
            }
            removeEntries(...a3) {
              let b4 = new c2(this._entries);
              for (let c3 of a3) b4._entries.delete(c3);
              return b4;
            }
            clear() {
              return new c2();
            }
          }
          b3.BaggageImpl = c2;
        }, 830: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.baggageEntryMetadataSymbol = void 0, b3.baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
        }, 369: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.baggageEntryMetadataFromString = b3.createBaggage = void 0;
          let d2 = c2(930), e2 = c2(993), f2 = c2(830), g = d2.DiagAPI.instance();
          b3.createBaggage = function(a3 = {}) {
            return new e2.BaggageImpl(new Map(Object.entries(a3)));
          }, b3.baggageEntryMetadataFromString = function(a3) {
            return "string" != typeof a3 && (g.error(`Cannot create baggage metadata from unknown type: ${typeof a3}`), a3 = ""), { __TYPE__: f2.baggageEntryMetadataSymbol, toString: () => a3 };
          };
        }, 67: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.context = void 0, b3.context = c2(491).ContextAPI.getInstance();
        }, 223: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NoopContextManager = void 0;
          let d2 = c2(780);
          class e2 {
            active() {
              return d2.ROOT_CONTEXT;
            }
            with(a3, b4, c3, ...d3) {
              return b4.call(c3, ...d3);
            }
            bind(a3, b4) {
              return b4;
            }
            enable() {
              return this;
            }
            disable() {
              return this;
            }
          }
          b3.NoopContextManager = e2;
        }, 780: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ROOT_CONTEXT = b3.createContextKey = void 0, b3.createContextKey = function(a3) {
            return Symbol.for(a3);
          };
          class c2 {
            constructor(a3) {
              let b4 = this;
              b4._currentContext = a3 ? new Map(a3) : /* @__PURE__ */ new Map(), b4.getValue = (a4) => b4._currentContext.get(a4), b4.setValue = (a4, d2) => {
                let e2 = new c2(b4._currentContext);
                return e2._currentContext.set(a4, d2), e2;
              }, b4.deleteValue = (a4) => {
                let d2 = new c2(b4._currentContext);
                return d2._currentContext.delete(a4), d2;
              };
            }
          }
          b3.ROOT_CONTEXT = new c2();
        }, 506: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.diag = void 0, b3.diag = c2(930).DiagAPI.instance();
        }, 56: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.DiagComponentLogger = void 0;
          let d2 = c2(172);
          class e2 {
            constructor(a3) {
              this._namespace = a3.namespace || "DiagComponentLogger";
            }
            debug(...a3) {
              return f2("debug", this._namespace, a3);
            }
            error(...a3) {
              return f2("error", this._namespace, a3);
            }
            info(...a3) {
              return f2("info", this._namespace, a3);
            }
            warn(...a3) {
              return f2("warn", this._namespace, a3);
            }
            verbose(...a3) {
              return f2("verbose", this._namespace, a3);
            }
          }
          function f2(a3, b4, c3) {
            let e3 = (0, d2.getGlobal)("diag");
            if (e3) return c3.unshift(b4), e3[a3](...c3);
          }
          b3.DiagComponentLogger = e2;
        }, 972: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.DiagConsoleLogger = void 0;
          let c2 = [{ n: "error", c: "error" }, { n: "warn", c: "warn" }, { n: "info", c: "info" }, { n: "debug", c: "debug" }, { n: "verbose", c: "trace" }];
          class d2 {
            constructor() {
              for (let a3 = 0; a3 < c2.length; a3++) this[c2[a3].n] = /* @__PURE__ */ function(a4) {
                return function(...b4) {
                  if (console) {
                    let c3 = console[a4];
                    if ("function" != typeof c3 && (c3 = console.log), "function" == typeof c3) return c3.apply(console, b4);
                  }
                };
              }(c2[a3].c);
            }
          }
          b3.DiagConsoleLogger = d2;
        }, 912: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.createLogLevelDiagLogger = void 0;
          let d2 = c2(957);
          b3.createLogLevelDiagLogger = function(a3, b4) {
            function c3(c4, d3) {
              let e2 = b4[c4];
              return "function" == typeof e2 && a3 >= d3 ? e2.bind(b4) : function() {
              };
            }
            return a3 < d2.DiagLogLevel.NONE ? a3 = d2.DiagLogLevel.NONE : a3 > d2.DiagLogLevel.ALL && (a3 = d2.DiagLogLevel.ALL), b4 = b4 || {}, { error: c3("error", d2.DiagLogLevel.ERROR), warn: c3("warn", d2.DiagLogLevel.WARN), info: c3("info", d2.DiagLogLevel.INFO), debug: c3("debug", d2.DiagLogLevel.DEBUG), verbose: c3("verbose", d2.DiagLogLevel.VERBOSE) };
          };
        }, 957: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.DiagLogLevel = void 0, function(a3) {
            a3[a3.NONE = 0] = "NONE", a3[a3.ERROR = 30] = "ERROR", a3[a3.WARN = 50] = "WARN", a3[a3.INFO = 60] = "INFO", a3[a3.DEBUG = 70] = "DEBUG", a3[a3.VERBOSE = 80] = "VERBOSE", a3[a3.ALL = 9999] = "ALL";
          }(b3.DiagLogLevel || (b3.DiagLogLevel = {}));
        }, 172: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.unregisterGlobal = b3.getGlobal = b3.registerGlobal = void 0;
          let d2 = c2(200), e2 = c2(521), f2 = c2(130), g = e2.VERSION.split(".")[0], h = Symbol.for(`opentelemetry.js.api.${g}`), i = d2._globalThis;
          b3.registerGlobal = function(a3, b4, c3, d3 = false) {
            var f3;
            let g2 = i[h] = null != (f3 = i[h]) ? f3 : { version: e2.VERSION };
            if (!d3 && g2[a3]) {
              let b5 = Error(`@opentelemetry/api: Attempted duplicate registration of API: ${a3}`);
              return c3.error(b5.stack || b5.message), false;
            }
            if (g2.version !== e2.VERSION) {
              let b5 = Error(`@opentelemetry/api: Registration of version v${g2.version} for ${a3} does not match previously registered API v${e2.VERSION}`);
              return c3.error(b5.stack || b5.message), false;
            }
            return g2[a3] = b4, c3.debug(`@opentelemetry/api: Registered a global for ${a3} v${e2.VERSION}.`), true;
          }, b3.getGlobal = function(a3) {
            var b4, c3;
            let d3 = null == (b4 = i[h]) ? void 0 : b4.version;
            if (d3 && (0, f2.isCompatible)(d3)) return null == (c3 = i[h]) ? void 0 : c3[a3];
          }, b3.unregisterGlobal = function(a3, b4) {
            b4.debug(`@opentelemetry/api: Unregistering a global for ${a3} v${e2.VERSION}.`);
            let c3 = i[h];
            c3 && delete c3[a3];
          };
        }, 130: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.isCompatible = b3._makeCompatibilityCheck = void 0;
          let d2 = c2(521), e2 = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
          function f2(a3) {
            let b4 = /* @__PURE__ */ new Set([a3]), c3 = /* @__PURE__ */ new Set(), d3 = a3.match(e2);
            if (!d3) return () => false;
            let f3 = { major: +d3[1], minor: +d3[2], patch: +d3[3], prerelease: d3[4] };
            if (null != f3.prerelease) return function(b5) {
              return b5 === a3;
            };
            function g(a4) {
              return c3.add(a4), false;
            }
            return function(a4) {
              if (b4.has(a4)) return true;
              if (c3.has(a4)) return false;
              let d4 = a4.match(e2);
              if (!d4) return g(a4);
              let h = { major: +d4[1], minor: +d4[2], patch: +d4[3], prerelease: d4[4] };
              if (null != h.prerelease || f3.major !== h.major) return g(a4);
              if (0 === f3.major) return f3.minor === h.minor && f3.patch <= h.patch ? (b4.add(a4), true) : g(a4);
              return f3.minor <= h.minor ? (b4.add(a4), true) : g(a4);
            };
          }
          b3._makeCompatibilityCheck = f2, b3.isCompatible = f2(d2.VERSION);
        }, 886: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.metrics = void 0, b3.metrics = c2(653).MetricsAPI.getInstance();
        }, 901: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ValueType = void 0, function(a3) {
            a3[a3.INT = 0] = "INT", a3[a3.DOUBLE = 1] = "DOUBLE";
          }(b3.ValueType || (b3.ValueType = {}));
        }, 102: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.createNoopMeter = b3.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = b3.NOOP_OBSERVABLE_GAUGE_METRIC = b3.NOOP_OBSERVABLE_COUNTER_METRIC = b3.NOOP_UP_DOWN_COUNTER_METRIC = b3.NOOP_HISTOGRAM_METRIC = b3.NOOP_COUNTER_METRIC = b3.NOOP_METER = b3.NoopObservableUpDownCounterMetric = b3.NoopObservableGaugeMetric = b3.NoopObservableCounterMetric = b3.NoopObservableMetric = b3.NoopHistogramMetric = b3.NoopUpDownCounterMetric = b3.NoopCounterMetric = b3.NoopMetric = b3.NoopMeter = void 0;
          class c2 {
            constructor() {
            }
            createHistogram(a3, c3) {
              return b3.NOOP_HISTOGRAM_METRIC;
            }
            createCounter(a3, c3) {
              return b3.NOOP_COUNTER_METRIC;
            }
            createUpDownCounter(a3, c3) {
              return b3.NOOP_UP_DOWN_COUNTER_METRIC;
            }
            createObservableGauge(a3, c3) {
              return b3.NOOP_OBSERVABLE_GAUGE_METRIC;
            }
            createObservableCounter(a3, c3) {
              return b3.NOOP_OBSERVABLE_COUNTER_METRIC;
            }
            createObservableUpDownCounter(a3, c3) {
              return b3.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
            }
            addBatchObservableCallback(a3, b4) {
            }
            removeBatchObservableCallback(a3) {
            }
          }
          b3.NoopMeter = c2;
          class d2 {
          }
          b3.NoopMetric = d2;
          class e2 extends d2 {
            add(a3, b4) {
            }
          }
          b3.NoopCounterMetric = e2;
          class f2 extends d2 {
            add(a3, b4) {
            }
          }
          b3.NoopUpDownCounterMetric = f2;
          class g extends d2 {
            record(a3, b4) {
            }
          }
          b3.NoopHistogramMetric = g;
          class h {
            addCallback(a3) {
            }
            removeCallback(a3) {
            }
          }
          b3.NoopObservableMetric = h;
          class i extends h {
          }
          b3.NoopObservableCounterMetric = i;
          class j extends h {
          }
          b3.NoopObservableGaugeMetric = j;
          class k extends h {
          }
          b3.NoopObservableUpDownCounterMetric = k, b3.NOOP_METER = new c2(), b3.NOOP_COUNTER_METRIC = new e2(), b3.NOOP_HISTOGRAM_METRIC = new g(), b3.NOOP_UP_DOWN_COUNTER_METRIC = new f2(), b3.NOOP_OBSERVABLE_COUNTER_METRIC = new i(), b3.NOOP_OBSERVABLE_GAUGE_METRIC = new j(), b3.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new k(), b3.createNoopMeter = function() {
            return b3.NOOP_METER;
          };
        }, 660: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NOOP_METER_PROVIDER = b3.NoopMeterProvider = void 0;
          let d2 = c2(102);
          class e2 {
            getMeter(a3, b4, c3) {
              return d2.NOOP_METER;
            }
          }
          b3.NoopMeterProvider = e2, b3.NOOP_METER_PROVIDER = new e2();
        }, 200: function(a2, b3, c2) {
          var d2 = this && this.__createBinding || (Object.create ? function(a3, b4, c3, d3) {
            void 0 === d3 && (d3 = c3), Object.defineProperty(a3, d3, { enumerable: true, get: function() {
              return b4[c3];
            } });
          } : function(a3, b4, c3, d3) {
            void 0 === d3 && (d3 = c3), a3[d3] = b4[c3];
          }), e2 = this && this.__exportStar || function(a3, b4) {
            for (var c3 in a3) "default" === c3 || Object.prototype.hasOwnProperty.call(b4, c3) || d2(b4, a3, c3);
          };
          Object.defineProperty(b3, "__esModule", { value: true }), e2(c2(46), b3);
        }, 651: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3._globalThis = void 0, b3._globalThis = "object" == typeof globalThis ? globalThis : c.g;
        }, 46: function(a2, b3, c2) {
          var d2 = this && this.__createBinding || (Object.create ? function(a3, b4, c3, d3) {
            void 0 === d3 && (d3 = c3), Object.defineProperty(a3, d3, { enumerable: true, get: function() {
              return b4[c3];
            } });
          } : function(a3, b4, c3, d3) {
            void 0 === d3 && (d3 = c3), a3[d3] = b4[c3];
          }), e2 = this && this.__exportStar || function(a3, b4) {
            for (var c3 in a3) "default" === c3 || Object.prototype.hasOwnProperty.call(b4, c3) || d2(b4, a3, c3);
          };
          Object.defineProperty(b3, "__esModule", { value: true }), e2(c2(651), b3);
        }, 939: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.propagation = void 0, b3.propagation = c2(181).PropagationAPI.getInstance();
        }, 874: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NoopTextMapPropagator = void 0;
          class c2 {
            inject(a3, b4) {
            }
            extract(a3, b4) {
              return a3;
            }
            fields() {
              return [];
            }
          }
          b3.NoopTextMapPropagator = c2;
        }, 194: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.defaultTextMapSetter = b3.defaultTextMapGetter = void 0, b3.defaultTextMapGetter = { get(a3, b4) {
            if (null != a3) return a3[b4];
          }, keys: (a3) => null == a3 ? [] : Object.keys(a3) }, b3.defaultTextMapSetter = { set(a3, b4, c2) {
            null != a3 && (a3[b4] = c2);
          } };
        }, 845: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.trace = void 0, b3.trace = c2(997).TraceAPI.getInstance();
        }, 403: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NonRecordingSpan = void 0;
          let d2 = c2(476);
          class e2 {
            constructor(a3 = d2.INVALID_SPAN_CONTEXT) {
              this._spanContext = a3;
            }
            spanContext() {
              return this._spanContext;
            }
            setAttribute(a3, b4) {
              return this;
            }
            setAttributes(a3) {
              return this;
            }
            addEvent(a3, b4) {
              return this;
            }
            setStatus(a3) {
              return this;
            }
            updateName(a3) {
              return this;
            }
            end(a3) {
            }
            isRecording() {
              return false;
            }
            recordException(a3, b4) {
            }
          }
          b3.NonRecordingSpan = e2;
        }, 614: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NoopTracer = void 0;
          let d2 = c2(491), e2 = c2(607), f2 = c2(403), g = c2(139), h = d2.ContextAPI.getInstance();
          class i {
            startSpan(a3, b4, c3 = h.active()) {
              var d3;
              if (null == b4 ? void 0 : b4.root) return new f2.NonRecordingSpan();
              let i2 = c3 && (0, e2.getSpanContext)(c3);
              return "object" == typeof (d3 = i2) && "string" == typeof d3.spanId && "string" == typeof d3.traceId && "number" == typeof d3.traceFlags && (0, g.isSpanContextValid)(i2) ? new f2.NonRecordingSpan(i2) : new f2.NonRecordingSpan();
            }
            startActiveSpan(a3, b4, c3, d3) {
              let f3, g2, i2;
              if (arguments.length < 2) return;
              2 == arguments.length ? i2 = b4 : 3 == arguments.length ? (f3 = b4, i2 = c3) : (f3 = b4, g2 = c3, i2 = d3);
              let j = null != g2 ? g2 : h.active(), k = this.startSpan(a3, f3, j), l = (0, e2.setSpan)(j, k);
              return h.with(l, i2, void 0, k);
            }
          }
          b3.NoopTracer = i;
        }, 124: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.NoopTracerProvider = void 0;
          let d2 = c2(614);
          class e2 {
            getTracer(a3, b4, c3) {
              return new d2.NoopTracer();
            }
          }
          b3.NoopTracerProvider = e2;
        }, 125: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ProxyTracer = void 0;
          let d2 = new (c2(614)).NoopTracer();
          class e2 {
            constructor(a3, b4, c3, d3) {
              this._provider = a3, this.name = b4, this.version = c3, this.options = d3;
            }
            startSpan(a3, b4, c3) {
              return this._getTracer().startSpan(a3, b4, c3);
            }
            startActiveSpan(a3, b4, c3, d3) {
              let e3 = this._getTracer();
              return Reflect.apply(e3.startActiveSpan, e3, arguments);
            }
            _getTracer() {
              if (this._delegate) return this._delegate;
              let a3 = this._provider.getDelegateTracer(this.name, this.version, this.options);
              return a3 ? (this._delegate = a3, this._delegate) : d2;
            }
          }
          b3.ProxyTracer = e2;
        }, 846: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.ProxyTracerProvider = void 0;
          let d2 = c2(125), e2 = new (c2(124)).NoopTracerProvider();
          class f2 {
            getTracer(a3, b4, c3) {
              var e3;
              return null != (e3 = this.getDelegateTracer(a3, b4, c3)) ? e3 : new d2.ProxyTracer(this, a3, b4, c3);
            }
            getDelegate() {
              var a3;
              return null != (a3 = this._delegate) ? a3 : e2;
            }
            setDelegate(a3) {
              this._delegate = a3;
            }
            getDelegateTracer(a3, b4, c3) {
              var d3;
              return null == (d3 = this._delegate) ? void 0 : d3.getTracer(a3, b4, c3);
            }
          }
          b3.ProxyTracerProvider = f2;
        }, 996: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.SamplingDecision = void 0, function(a3) {
            a3[a3.NOT_RECORD = 0] = "NOT_RECORD", a3[a3.RECORD = 1] = "RECORD", a3[a3.RECORD_AND_SAMPLED = 2] = "RECORD_AND_SAMPLED";
          }(b3.SamplingDecision || (b3.SamplingDecision = {}));
        }, 607: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.getSpanContext = b3.setSpanContext = b3.deleteSpan = b3.setSpan = b3.getActiveSpan = b3.getSpan = void 0;
          let d2 = c2(780), e2 = c2(403), f2 = c2(491), g = (0, d2.createContextKey)("OpenTelemetry Context Key SPAN");
          function h(a3) {
            return a3.getValue(g) || void 0;
          }
          function i(a3, b4) {
            return a3.setValue(g, b4);
          }
          b3.getSpan = h, b3.getActiveSpan = function() {
            return h(f2.ContextAPI.getInstance().active());
          }, b3.setSpan = i, b3.deleteSpan = function(a3) {
            return a3.deleteValue(g);
          }, b3.setSpanContext = function(a3, b4) {
            return i(a3, new e2.NonRecordingSpan(b4));
          }, b3.getSpanContext = function(a3) {
            var b4;
            return null == (b4 = h(a3)) ? void 0 : b4.spanContext();
          };
        }, 325: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.TraceStateImpl = void 0;
          let d2 = c2(564);
          class e2 {
            constructor(a3) {
              this._internalState = /* @__PURE__ */ new Map(), a3 && this._parse(a3);
            }
            set(a3, b4) {
              let c3 = this._clone();
              return c3._internalState.has(a3) && c3._internalState.delete(a3), c3._internalState.set(a3, b4), c3;
            }
            unset(a3) {
              let b4 = this._clone();
              return b4._internalState.delete(a3), b4;
            }
            get(a3) {
              return this._internalState.get(a3);
            }
            serialize() {
              return this._keys().reduce((a3, b4) => (a3.push(b4 + "=" + this.get(b4)), a3), []).join(",");
            }
            _parse(a3) {
              !(a3.length > 512) && (this._internalState = a3.split(",").reverse().reduce((a4, b4) => {
                let c3 = b4.trim(), e3 = c3.indexOf("=");
                if (-1 !== e3) {
                  let f2 = c3.slice(0, e3), g = c3.slice(e3 + 1, b4.length);
                  (0, d2.validateKey)(f2) && (0, d2.validateValue)(g) && a4.set(f2, g);
                }
                return a4;
              }, /* @__PURE__ */ new Map()), this._internalState.size > 32 && (this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, 32))));
            }
            _keys() {
              return Array.from(this._internalState.keys()).reverse();
            }
            _clone() {
              let a3 = new e2();
              return a3._internalState = new Map(this._internalState), a3;
            }
          }
          b3.TraceStateImpl = e2;
        }, 564: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.validateValue = b3.validateKey = void 0;
          let c2 = "[_0-9a-z-*/]", d2 = `[a-z]${c2}{0,255}`, e2 = `[a-z0-9]${c2}{0,240}@[a-z]${c2}{0,13}`, f2 = RegExp(`^(?:${d2}|${e2})$`), g = /^[ -~]{0,255}[!-~]$/, h = /,|=/;
          b3.validateKey = function(a3) {
            return f2.test(a3);
          }, b3.validateValue = function(a3) {
            return g.test(a3) && !h.test(a3);
          };
        }, 98: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.createTraceState = void 0;
          let d2 = c2(325);
          b3.createTraceState = function(a3) {
            return new d2.TraceStateImpl(a3);
          };
        }, 476: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.INVALID_SPAN_CONTEXT = b3.INVALID_TRACEID = b3.INVALID_SPANID = void 0;
          let d2 = c2(475);
          b3.INVALID_SPANID = "0000000000000000", b3.INVALID_TRACEID = "00000000000000000000000000000000", b3.INVALID_SPAN_CONTEXT = { traceId: b3.INVALID_TRACEID, spanId: b3.INVALID_SPANID, traceFlags: d2.TraceFlags.NONE };
        }, 357: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.SpanKind = void 0, function(a3) {
            a3[a3.INTERNAL = 0] = "INTERNAL", a3[a3.SERVER = 1] = "SERVER", a3[a3.CLIENT = 2] = "CLIENT", a3[a3.PRODUCER = 3] = "PRODUCER", a3[a3.CONSUMER = 4] = "CONSUMER";
          }(b3.SpanKind || (b3.SpanKind = {}));
        }, 139: (a2, b3, c2) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.wrapSpanContext = b3.isSpanContextValid = b3.isValidSpanId = b3.isValidTraceId = void 0;
          let d2 = c2(476), e2 = c2(403), f2 = /^([0-9a-f]{32})$/i, g = /^[0-9a-f]{16}$/i;
          function h(a3) {
            return f2.test(a3) && a3 !== d2.INVALID_TRACEID;
          }
          function i(a3) {
            return g.test(a3) && a3 !== d2.INVALID_SPANID;
          }
          b3.isValidTraceId = h, b3.isValidSpanId = i, b3.isSpanContextValid = function(a3) {
            return h(a3.traceId) && i(a3.spanId);
          }, b3.wrapSpanContext = function(a3) {
            return new e2.NonRecordingSpan(a3);
          };
        }, 847: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.SpanStatusCode = void 0, function(a3) {
            a3[a3.UNSET = 0] = "UNSET", a3[a3.OK = 1] = "OK", a3[a3.ERROR = 2] = "ERROR";
          }(b3.SpanStatusCode || (b3.SpanStatusCode = {}));
        }, 475: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.TraceFlags = void 0, function(a3) {
            a3[a3.NONE = 0] = "NONE", a3[a3.SAMPLED = 1] = "SAMPLED";
          }(b3.TraceFlags || (b3.TraceFlags = {}));
        }, 521: (a2, b3) => {
          Object.defineProperty(b3, "__esModule", { value: true }), b3.VERSION = void 0, b3.VERSION = "1.6.0";
        } }, d = {};
        function e(a2) {
          var c2 = d[a2];
          if (void 0 !== c2) return c2.exports;
          var f2 = d[a2] = { exports: {} }, g = true;
          try {
            b2[a2].call(f2.exports, f2, f2.exports, e), g = false;
          } finally {
            g && delete d[a2];
          }
          return f2.exports;
        }
        e.ab = "//";
        var f = {};
        (() => {
          Object.defineProperty(f, "__esModule", { value: true }), f.trace = f.propagation = f.metrics = f.diag = f.context = f.INVALID_SPAN_CONTEXT = f.INVALID_TRACEID = f.INVALID_SPANID = f.isValidSpanId = f.isValidTraceId = f.isSpanContextValid = f.createTraceState = f.TraceFlags = f.SpanStatusCode = f.SpanKind = f.SamplingDecision = f.ProxyTracerProvider = f.ProxyTracer = f.defaultTextMapSetter = f.defaultTextMapGetter = f.ValueType = f.createNoopMeter = f.DiagLogLevel = f.DiagConsoleLogger = f.ROOT_CONTEXT = f.createContextKey = f.baggageEntryMetadataFromString = void 0;
          var a2 = e(369);
          Object.defineProperty(f, "baggageEntryMetadataFromString", { enumerable: true, get: function() {
            return a2.baggageEntryMetadataFromString;
          } });
          var b3 = e(780);
          Object.defineProperty(f, "createContextKey", { enumerable: true, get: function() {
            return b3.createContextKey;
          } }), Object.defineProperty(f, "ROOT_CONTEXT", { enumerable: true, get: function() {
            return b3.ROOT_CONTEXT;
          } });
          var c2 = e(972);
          Object.defineProperty(f, "DiagConsoleLogger", { enumerable: true, get: function() {
            return c2.DiagConsoleLogger;
          } });
          var d2 = e(957);
          Object.defineProperty(f, "DiagLogLevel", { enumerable: true, get: function() {
            return d2.DiagLogLevel;
          } });
          var g = e(102);
          Object.defineProperty(f, "createNoopMeter", { enumerable: true, get: function() {
            return g.createNoopMeter;
          } });
          var h = e(901);
          Object.defineProperty(f, "ValueType", { enumerable: true, get: function() {
            return h.ValueType;
          } });
          var i = e(194);
          Object.defineProperty(f, "defaultTextMapGetter", { enumerable: true, get: function() {
            return i.defaultTextMapGetter;
          } }), Object.defineProperty(f, "defaultTextMapSetter", { enumerable: true, get: function() {
            return i.defaultTextMapSetter;
          } });
          var j = e(125);
          Object.defineProperty(f, "ProxyTracer", { enumerable: true, get: function() {
            return j.ProxyTracer;
          } });
          var k = e(846);
          Object.defineProperty(f, "ProxyTracerProvider", { enumerable: true, get: function() {
            return k.ProxyTracerProvider;
          } });
          var l = e(996);
          Object.defineProperty(f, "SamplingDecision", { enumerable: true, get: function() {
            return l.SamplingDecision;
          } });
          var m = e(357);
          Object.defineProperty(f, "SpanKind", { enumerable: true, get: function() {
            return m.SpanKind;
          } });
          var n = e(847);
          Object.defineProperty(f, "SpanStatusCode", { enumerable: true, get: function() {
            return n.SpanStatusCode;
          } });
          var o = e(475);
          Object.defineProperty(f, "TraceFlags", { enumerable: true, get: function() {
            return o.TraceFlags;
          } });
          var p = e(98);
          Object.defineProperty(f, "createTraceState", { enumerable: true, get: function() {
            return p.createTraceState;
          } });
          var q = e(139);
          Object.defineProperty(f, "isSpanContextValid", { enumerable: true, get: function() {
            return q.isSpanContextValid;
          } }), Object.defineProperty(f, "isValidTraceId", { enumerable: true, get: function() {
            return q.isValidTraceId;
          } }), Object.defineProperty(f, "isValidSpanId", { enumerable: true, get: function() {
            return q.isValidSpanId;
          } });
          var r = e(476);
          Object.defineProperty(f, "INVALID_SPANID", { enumerable: true, get: function() {
            return r.INVALID_SPANID;
          } }), Object.defineProperty(f, "INVALID_TRACEID", { enumerable: true, get: function() {
            return r.INVALID_TRACEID;
          } }), Object.defineProperty(f, "INVALID_SPAN_CONTEXT", { enumerable: true, get: function() {
            return r.INVALID_SPAN_CONTEXT;
          } });
          let s = e(67);
          Object.defineProperty(f, "context", { enumerable: true, get: function() {
            return s.context;
          } });
          let t = e(506);
          Object.defineProperty(f, "diag", { enumerable: true, get: function() {
            return t.diag;
          } });
          let u = e(886);
          Object.defineProperty(f, "metrics", { enumerable: true, get: function() {
            return u.metrics;
          } });
          let v = e(939);
          Object.defineProperty(f, "propagation", { enumerable: true, get: function() {
            return v.propagation;
          } });
          let w = e(845);
          Object.defineProperty(f, "trace", { enumerable: true, get: function() {
            return w.trace;
          } }), f.default = { context: s.context, diag: t.diag, metrics: u.metrics, propagation: v.propagation, trace: w.trace };
        })(), a.exports = f;
      })();
    }, 825: (a, b, c) => {
      "use strict";
      var d = c(522);
      Object.defineProperty(b, "__esModule", { value: true }), b.default = void 0, b.withAuth = i;
      var e = c(164), f = c(426), g = d(c(675));
      async function h(a2, b2, c2) {
        var d2, h2, i2, j, k, l, m, n, o, p, q;
        let { pathname: r, search: s, origin: t, basePath: u } = a2.nextUrl, v = null != (d2 = null == b2 || null == (h2 = b2.pages) ? void 0 : h2.signIn) ? d2 : "/api/auth/signin", w = null != (i2 = null == b2 || null == (j = b2.pages) ? void 0 : j.error) ? i2 : "/api/auth/error", x = (0, g.default)(process.env.NEXTAUTH_URL).path;
        if (`${u}${r}`.startsWith(x) || [v, w].includes(r) || ["/_next", "/favicon.ico"].some((a3) => r.startsWith(a3))) return;
        let y = null != (k = null != (l = null == b2 ? void 0 : b2.secret) ? l : process.env.NEXTAUTH_SECRET) ? k : process.env.AUTH_SECRET;
        if (!y) {
          console.error("[next-auth][error][NO_SECRET]", `
https://next-auth.js.org/errors#no_secret`);
          let a3 = new URL(`${u}${w}`, t);
          return a3.searchParams.append("error", "Configuration"), e.NextResponse.redirect(a3);
        }
        let z = await (0, f.getToken)({ req: a2, decode: null == b2 || null == (m = b2.jwt) ? void 0 : m.decode, cookieName: null == b2 || null == (n = b2.cookies) || null == (n = n.sessionToken) ? void 0 : n.name, secret: y });
        if (null != (o = await (null == b2 || null == (p = b2.callbacks) || null == (q = p.authorized) ? void 0 : q.call(p, { req: a2, token: z }))) ? o : !!z) return await (null == c2 ? void 0 : c2(z));
        let A = new URL(`${u}${v}`, t);
        return A.searchParams.append("callbackUrl", `${u}${r}${s}`), e.NextResponse.redirect(A);
      }
      function i(...a2) {
        if (!a2.length || a2[0] instanceof Request) return h(...a2);
        if ("function" == typeof a2[0]) {
          let b3 = a2[0], c2 = a2[1];
          return async (...a3) => await h(a3[0], c2, async (c3) => (a3[0].nextauth = { token: c3 }, await b3(...a3)));
        }
        let b2 = a2[0];
        return async (...a3) => await h(a3[0], b2);
      }
      b.default = i;
    }, 863: (a, b, c) => {
      "use strict";
      let d;
      c.r(b), c.d(b, { default: () => aW });
      var e = {};
      async function f() {
        return "_ENTRIES" in globalThis && _ENTRIES.middleware_instrumentation && await _ENTRIES.middleware_instrumentation;
      }
      c.r(e), c.d(e, { config: () => aS, default: () => aR });
      let g = null;
      async function h() {
        if ("phase-production-build" === process.env.NEXT_PHASE) return;
        g || (g = f());
        let a2 = await g;
        if (null == a2 ? void 0 : a2.register) try {
          await a2.register();
        } catch (a3) {
          throw a3.message = `An error occurred while loading instrumentation hook: ${a3.message}`, a3;
        }
      }
      async function i(...a2) {
        let b2 = await f();
        try {
          var c2;
          await (null == b2 || null == (c2 = b2.onRequestError) ? void 0 : c2.call(b2, ...a2));
        } catch (a3) {
          console.error("Error in instrumentation.onRequestError:", a3);
        }
      }
      let j = null;
      function k() {
        return j || (j = h()), j;
      }
      function l(a2) {
        return `The edge runtime does not support Node.js '${a2}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`;
      }
      process !== c.g.process && (process.env = c.g.process.env, c.g.process = process);
      try {
        Object.defineProperty(globalThis, "__import_unsupported", { value: function(a2) {
          let b2 = new Proxy(function() {
          }, { get(b3, c2) {
            if ("then" === c2) return {};
            throw Object.defineProperty(Error(l(a2)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, construct() {
            throw Object.defineProperty(Error(l(a2)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, apply(c2, d2, e2) {
            if ("function" == typeof e2[0]) return e2[0](b2);
            throw Object.defineProperty(Error(l(a2)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          } });
          return new Proxy({}, { get: () => b2 });
        }, enumerable: false, configurable: false });
      } catch {
      }
      k();
      var m = c(583), n = c(206);
      let o = Symbol("response"), p = Symbol("passThrough"), q = Symbol("waitUntil");
      class r {
        constructor(a2, b2) {
          this[p] = false, this[q] = b2 ? { kind: "external", function: b2 } : { kind: "internal", promises: [] };
        }
        respondWith(a2) {
          this[o] || (this[o] = Promise.resolve(a2));
        }
        passThroughOnException() {
          this[p] = true;
        }
        waitUntil(a2) {
          if ("external" === this[q].kind) return (0, this[q].function)(a2);
          this[q].promises.push(a2);
        }
      }
      class s extends r {
        constructor(a2) {
          var b2;
          super(a2.request, null == (b2 = a2.context) ? void 0 : b2.waitUntil), this.sourcePage = a2.page;
        }
        get request() {
          throw Object.defineProperty(new m.CB({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new m.CB({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      var t = c(742), u = c(388);
      function v(a2, b2) {
        let c2 = "string" == typeof b2 ? new URL(b2) : b2, d2 = new URL(a2, b2), e2 = d2.origin === c2.origin;
        return { url: e2 ? d2.toString().slice(c2.origin.length) : d2.toString(), isRelative: e2 };
      }
      var w = c(700);
      let x = "next-router-prefetch", y = ["rsc", "next-router-state-tree", x, "next-hmr-refresh", "next-router-segment-prefetch"], z = "_rsc";
      var A = c(115);
      class B extends Error {
        constructor() {
          super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers");
        }
        static callable() {
          throw new B();
        }
      }
      class C extends Headers {
        constructor(a2) {
          super(), this.headers = new Proxy(a2, { get(b2, c2, d2) {
            if ("symbol" == typeof c2) return A.l.get(b2, c2, d2);
            let e2 = c2.toLowerCase(), f2 = Object.keys(a2).find((a3) => a3.toLowerCase() === e2);
            if (void 0 !== f2) return A.l.get(b2, f2, d2);
          }, set(b2, c2, d2, e2) {
            if ("symbol" == typeof c2) return A.l.set(b2, c2, d2, e2);
            let f2 = c2.toLowerCase(), g2 = Object.keys(a2).find((a3) => a3.toLowerCase() === f2);
            return A.l.set(b2, g2 ?? c2, d2, e2);
          }, has(b2, c2) {
            if ("symbol" == typeof c2) return A.l.has(b2, c2);
            let d2 = c2.toLowerCase(), e2 = Object.keys(a2).find((a3) => a3.toLowerCase() === d2);
            return void 0 !== e2 && A.l.has(b2, e2);
          }, deleteProperty(b2, c2) {
            if ("symbol" == typeof c2) return A.l.deleteProperty(b2, c2);
            let d2 = c2.toLowerCase(), e2 = Object.keys(a2).find((a3) => a3.toLowerCase() === d2);
            return void 0 === e2 || A.l.deleteProperty(b2, e2);
          } });
        }
        static seal(a2) {
          return new Proxy(a2, { get(a3, b2, c2) {
            switch (b2) {
              case "append":
              case "delete":
              case "set":
                return B.callable;
              default:
                return A.l.get(a3, b2, c2);
            }
          } });
        }
        merge(a2) {
          return Array.isArray(a2) ? a2.join(", ") : a2;
        }
        static from(a2) {
          return a2 instanceof Headers ? a2 : new C(a2);
        }
        append(a2, b2) {
          let c2 = this.headers[a2];
          "string" == typeof c2 ? this.headers[a2] = [c2, b2] : Array.isArray(c2) ? c2.push(b2) : this.headers[a2] = b2;
        }
        delete(a2) {
          delete this.headers[a2];
        }
        get(a2) {
          let b2 = this.headers[a2];
          return void 0 !== b2 ? this.merge(b2) : null;
        }
        has(a2) {
          return void 0 !== this.headers[a2];
        }
        set(a2, b2) {
          this.headers[a2] = b2;
        }
        forEach(a2, b2) {
          for (let [c2, d2] of this.entries()) a2.call(b2, d2, c2, this);
        }
        *entries() {
          for (let a2 of Object.keys(this.headers)) {
            let b2 = a2.toLowerCase(), c2 = this.get(b2);
            yield [b2, c2];
          }
        }
        *keys() {
          for (let a2 of Object.keys(this.headers)) {
            let b2 = a2.toLowerCase();
            yield b2;
          }
        }
        *values() {
          for (let a2 of Object.keys(this.headers)) {
            let b2 = this.get(a2);
            yield b2;
          }
        }
        [Symbol.iterator]() {
          return this.entries();
        }
      }
      var D = c(28), E = c(379);
      class F extends Error {
        constructor() {
          super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options");
        }
        static callable() {
          throw new F();
        }
      }
      class G {
        static seal(a2) {
          return new Proxy(a2, { get(a3, b2, c2) {
            switch (b2) {
              case "clear":
              case "delete":
              case "set":
                return F.callable;
              default:
                return A.l.get(a3, b2, c2);
            }
          } });
        }
      }
      let H = Symbol.for("next.mutated.cookies");
      class I {
        static wrap(a2, b2) {
          let c2 = new D.VO(new Headers());
          for (let b3 of a2.getAll()) c2.set(b3);
          let d2 = [], e2 = /* @__PURE__ */ new Set(), f2 = () => {
            let a3 = E.J.getStore();
            if (a3 && (a3.pathWasRevalidated = true), d2 = c2.getAll().filter((a4) => e2.has(a4.name)), b2) {
              let a4 = [];
              for (let b3 of d2) {
                let c3 = new D.VO(new Headers());
                c3.set(b3), a4.push(c3.toString());
              }
              b2(a4);
            }
          }, g2 = new Proxy(c2, { get(a3, b3, c3) {
            switch (b3) {
              case H:
                return d2;
              case "delete":
                return function(...b4) {
                  e2.add("string" == typeof b4[0] ? b4[0] : b4[0].name);
                  try {
                    return a3.delete(...b4), g2;
                  } finally {
                    f2();
                  }
                };
              case "set":
                return function(...b4) {
                  e2.add("string" == typeof b4[0] ? b4[0] : b4[0].name);
                  try {
                    return a3.set(...b4), g2;
                  } finally {
                    f2();
                  }
                };
              default:
                return A.l.get(a3, b3, c3);
            }
          } });
          return g2;
        }
      }
      function J(a2, b2) {
        if ("action" !== a2.phase) throw new F();
      }
      var K = c(183), L = function(a2) {
        return a2.handleRequest = "BaseServer.handleRequest", a2.run = "BaseServer.run", a2.pipe = "BaseServer.pipe", a2.getStaticHTML = "BaseServer.getStaticHTML", a2.render = "BaseServer.render", a2.renderToResponseWithComponents = "BaseServer.renderToResponseWithComponents", a2.renderToResponse = "BaseServer.renderToResponse", a2.renderToHTML = "BaseServer.renderToHTML", a2.renderError = "BaseServer.renderError", a2.renderErrorToResponse = "BaseServer.renderErrorToResponse", a2.renderErrorToHTML = "BaseServer.renderErrorToHTML", a2.render404 = "BaseServer.render404", a2;
      }(L || {}), M = function(a2) {
        return a2.loadDefaultErrorComponents = "LoadComponents.loadDefaultErrorComponents", a2.loadComponents = "LoadComponents.loadComponents", a2;
      }(M || {}), N = function(a2) {
        return a2.getRequestHandler = "NextServer.getRequestHandler", a2.getServer = "NextServer.getServer", a2.getServerRequestHandler = "NextServer.getServerRequestHandler", a2.createServer = "createServer.createServer", a2;
      }(N || {}), O = function(a2) {
        return a2.compression = "NextNodeServer.compression", a2.getBuildId = "NextNodeServer.getBuildId", a2.createComponentTree = "NextNodeServer.createComponentTree", a2.clientComponentLoading = "NextNodeServer.clientComponentLoading", a2.getLayoutOrPageModule = "NextNodeServer.getLayoutOrPageModule", a2.generateStaticRoutes = "NextNodeServer.generateStaticRoutes", a2.generateFsStaticRoutes = "NextNodeServer.generateFsStaticRoutes", a2.generatePublicRoutes = "NextNodeServer.generatePublicRoutes", a2.generateImageRoutes = "NextNodeServer.generateImageRoutes.route", a2.sendRenderResult = "NextNodeServer.sendRenderResult", a2.proxyRequest = "NextNodeServer.proxyRequest", a2.runApi = "NextNodeServer.runApi", a2.render = "NextNodeServer.render", a2.renderHTML = "NextNodeServer.renderHTML", a2.imageOptimizer = "NextNodeServer.imageOptimizer", a2.getPagePath = "NextNodeServer.getPagePath", a2.getRoutesManifest = "NextNodeServer.getRoutesManifest", a2.findPageComponents = "NextNodeServer.findPageComponents", a2.getFontManifest = "NextNodeServer.getFontManifest", a2.getServerComponentManifest = "NextNodeServer.getServerComponentManifest", a2.getRequestHandler = "NextNodeServer.getRequestHandler", a2.renderToHTML = "NextNodeServer.renderToHTML", a2.renderError = "NextNodeServer.renderError", a2.renderErrorToHTML = "NextNodeServer.renderErrorToHTML", a2.render404 = "NextNodeServer.render404", a2.startResponse = "NextNodeServer.startResponse", a2.route = "route", a2.onProxyReq = "onProxyReq", a2.apiResolver = "apiResolver", a2.internalFetch = "internalFetch", a2;
      }(O || {}), P = function(a2) {
        return a2.startServer = "startServer.startServer", a2;
      }(P || {}), Q = function(a2) {
        return a2.getServerSideProps = "Render.getServerSideProps", a2.getStaticProps = "Render.getStaticProps", a2.renderToString = "Render.renderToString", a2.renderDocument = "Render.renderDocument", a2.createBodyResult = "Render.createBodyResult", a2;
      }(Q || {}), R = function(a2) {
        return a2.renderToString = "AppRender.renderToString", a2.renderToReadableStream = "AppRender.renderToReadableStream", a2.getBodyResult = "AppRender.getBodyResult", a2.fetch = "AppRender.fetch", a2;
      }(R || {}), S = function(a2) {
        return a2.executeRoute = "Router.executeRoute", a2;
      }(S || {}), T = function(a2) {
        return a2.runHandler = "Node.runHandler", a2;
      }(T || {}), U = function(a2) {
        return a2.runHandler = "AppRouteRouteHandlers.runHandler", a2;
      }(U || {}), V = function(a2) {
        return a2.generateMetadata = "ResolveMetadata.generateMetadata", a2.generateViewport = "ResolveMetadata.generateViewport", a2;
      }(V || {}), W = function(a2) {
        return a2.execute = "Middleware.execute", a2;
      }(W || {});
      let X = /* @__PURE__ */ new Set(["Middleware.execute", "BaseServer.handleRequest", "Render.getServerSideProps", "Render.getStaticProps", "AppRender.fetch", "AppRender.getBodyResult", "Render.renderDocument", "Node.runHandler", "AppRouteRouteHandlers.runHandler", "ResolveMetadata.generateMetadata", "ResolveMetadata.generateViewport", "NextNodeServer.createComponentTree", "NextNodeServer.findPageComponents", "NextNodeServer.getLayoutOrPageModule", "NextNodeServer.startResponse", "NextNodeServer.clientComponentLoading"]), Y = /* @__PURE__ */ new Set(["NextNodeServer.findPageComponents", "NextNodeServer.createComponentTree", "NextNodeServer.clientComponentLoading"]);
      function Z(a2) {
        return null !== a2 && "object" == typeof a2 && "then" in a2 && "function" == typeof a2.then;
      }
      let $ = process.env.NEXT_OTEL_PERFORMANCE_PREFIX, { context: _, propagation: aa, trace: ab, SpanStatusCode: ac, SpanKind: ad, ROOT_CONTEXT: ae } = d = c(817);
      class af extends Error {
        constructor(a2, b2) {
          super(), this.bubble = a2, this.result = b2;
        }
      }
      let ag = (a2, b2) => {
        (function(a3) {
          return "object" == typeof a3 && null !== a3 && a3 instanceof af;
        })(b2) && b2.bubble ? a2.setAttribute("next.bubble", true) : (b2 && (a2.recordException(b2), a2.setAttribute("error.type", b2.name)), a2.setStatus({ code: ac.ERROR, message: null == b2 ? void 0 : b2.message })), a2.end();
      }, ah = /* @__PURE__ */ new Map(), ai = d.createContextKey("next.rootSpanId"), aj = 0, ak = { set(a2, b2, c2) {
        a2.push({ key: b2, value: c2 });
      } };
      class al {
        getTracerInstance() {
          return ab.getTracer("next.js", "0.0.1");
        }
        getContext() {
          return _;
        }
        getTracePropagationData() {
          let a2 = _.active(), b2 = [];
          return aa.inject(a2, b2, ak), b2;
        }
        getActiveScopeSpan() {
          return ab.getSpan(null == _ ? void 0 : _.active());
        }
        withPropagatedContext(a2, b2, c2) {
          let d2 = _.active();
          if (ab.getSpanContext(d2)) return b2();
          let e2 = aa.extract(d2, a2, c2);
          return _.with(e2, b2);
        }
        trace(...a2) {
          var b2;
          let [c2, d2, e2] = a2, { fn: f2, options: g2 } = "function" == typeof d2 ? { fn: d2, options: {} } : { fn: e2, options: { ...d2 } }, h2 = g2.spanName ?? c2;
          if (!X.has(c2) && "1" !== process.env.NEXT_OTEL_VERBOSE || g2.hideSpan) return f2();
          let i2 = this.getSpanContext((null == g2 ? void 0 : g2.parentSpan) ?? this.getActiveScopeSpan()), j2 = false;
          i2 ? (null == (b2 = ab.getSpanContext(i2)) ? void 0 : b2.isRemote) && (j2 = true) : (i2 = (null == _ ? void 0 : _.active()) ?? ae, j2 = true);
          let k2 = aj++;
          return g2.attributes = { "next.span_name": h2, "next.span_type": c2, ...g2.attributes }, _.with(i2.setValue(ai, k2), () => this.getTracerInstance().startActiveSpan(h2, g2, (a3) => {
            let b3;
            $ && c2 && Y.has(c2) && (b3 = "performance" in globalThis && "measure" in performance ? globalThis.performance.now() : void 0);
            let d3 = false, e3 = () => {
              !d3 && (d3 = true, ah.delete(k2), b3 && performance.measure(`${$}:next-${(c2.split(".").pop() || "").replace(/[A-Z]/g, (a4) => "-" + a4.toLowerCase())}`, { start: b3, end: performance.now() }));
            };
            if (j2 && ah.set(k2, new Map(Object.entries(g2.attributes ?? {}))), f2.length > 1) try {
              return f2(a3, (b4) => ag(a3, b4));
            } catch (b4) {
              throw ag(a3, b4), b4;
            } finally {
              e3();
            }
            try {
              let b4 = f2(a3);
              if (Z(b4)) return b4.then((b5) => (a3.end(), b5)).catch((b5) => {
                throw ag(a3, b5), b5;
              }).finally(e3);
              return a3.end(), e3(), b4;
            } catch (b4) {
              throw ag(a3, b4), e3(), b4;
            }
          }));
        }
        wrap(...a2) {
          let b2 = this, [c2, d2, e2] = 3 === a2.length ? a2 : [a2[0], {}, a2[1]];
          return X.has(c2) || "1" === process.env.NEXT_OTEL_VERBOSE ? function() {
            let a3 = d2;
            "function" == typeof a3 && "function" == typeof e2 && (a3 = a3.apply(this, arguments));
            let f2 = arguments.length - 1, g2 = arguments[f2];
            if ("function" != typeof g2) return b2.trace(c2, a3, () => e2.apply(this, arguments));
            {
              let d3 = b2.getContext().bind(_.active(), g2);
              return b2.trace(c2, a3, (a4, b3) => (arguments[f2] = function(a5) {
                return null == b3 || b3(a5), d3.apply(this, arguments);
              }, e2.apply(this, arguments)));
            }
          } : e2;
        }
        startSpan(...a2) {
          let [b2, c2] = a2, d2 = this.getSpanContext((null == c2 ? void 0 : c2.parentSpan) ?? this.getActiveScopeSpan());
          return this.getTracerInstance().startSpan(b2, c2, d2);
        }
        getSpanContext(a2) {
          return a2 ? ab.setSpan(_.active(), a2) : void 0;
        }
        getRootSpanAttributes() {
          let a2 = _.active().getValue(ai);
          return ah.get(a2);
        }
        setRootSpanAttribute(a2, b2) {
          let c2 = _.active().getValue(ai), d2 = ah.get(c2);
          d2 && d2.set(a2, b2);
        }
      }
      let am = (() => {
        let a2 = new al();
        return () => a2;
      })(), an = "__prerender_bypass";
      Symbol("__next_preview_data"), Symbol(an);
      class ao {
        constructor(a2, b2, c2, d2) {
          var e2;
          let f2 = a2 && function(a3, b3) {
            let c3 = C.from(a3.headers);
            return { isOnDemandRevalidate: c3.get(K.kz) === b3.previewModeId, revalidateOnlyGenerated: c3.has(K.r4) };
          }(b2, a2).isOnDemandRevalidate, g2 = null == (e2 = c2.get(an)) ? void 0 : e2.value;
          this._isEnabled = !!(!f2 && g2 && a2 && g2 === a2.previewModeId), this._previewModeId = null == a2 ? void 0 : a2.previewModeId, this._mutableCookies = d2;
        }
        get isEnabled() {
          return this._isEnabled;
        }
        enable() {
          if (!this._previewModeId) throw Object.defineProperty(Error("Invariant: previewProps missing previewModeId this should never happen"), "__NEXT_ERROR_CODE", { value: "E93", enumerable: false, configurable: true });
          this._mutableCookies.set({ name: an, value: this._previewModeId, httpOnly: true, sameSite: "none", secure: true, path: "/" }), this._isEnabled = true;
        }
        disable() {
          this._mutableCookies.set({ name: an, value: "", httpOnly: true, sameSite: "none", secure: true, path: "/", expires: /* @__PURE__ */ new Date(0) }), this._isEnabled = false;
        }
      }
      function ap(a2, b2) {
        if ("x-middleware-set-cookie" in a2.headers && "string" == typeof a2.headers["x-middleware-set-cookie"]) {
          let c2 = a2.headers["x-middleware-set-cookie"], d2 = new Headers();
          for (let a3 of (0, n.RD)(c2)) d2.append("set-cookie", a3);
          for (let a3 of new D.VO(d2).getAll()) b2.set(a3);
        }
      }
      var aq = c(128), ar = c(213), as = c.n(ar), at = c(809), au = c(788);
      c(356).Buffer, new au.q(52428800, (a2) => a2.size), process.env.NEXT_PRIVATE_DEBUG_CACHE && console.debug.bind(console, "DefaultCacheHandler:"), process.env.NEXT_PRIVATE_DEBUG_CACHE && ((a2, ...b2) => {
        console.log(`use-cache: ${a2}`, ...b2);
      }), Symbol.for("@next/cache-handlers");
      let av = Symbol.for("@next/cache-handlers-map"), aw = Symbol.for("@next/cache-handlers-set"), ax = globalThis;
      function ay() {
        if (ax[av]) return ax[av].entries();
      }
      async function az(a2, b2) {
        if (!a2) return b2();
        let c2 = aA(a2);
        try {
          return await b2();
        } finally {
          let b3 = function(a3, b4) {
            let c3 = new Set(a3.pendingRevalidatedTags), d2 = new Set(a3.pendingRevalidateWrites);
            return { pendingRevalidatedTags: b4.pendingRevalidatedTags.filter((a4) => !c3.has(a4)), pendingRevalidates: Object.fromEntries(Object.entries(b4.pendingRevalidates).filter(([b5]) => !(b5 in a3.pendingRevalidates))), pendingRevalidateWrites: b4.pendingRevalidateWrites.filter((a4) => !d2.has(a4)) };
          }(c2, aA(a2));
          await aC(a2, b3);
        }
      }
      function aA(a2) {
        return { pendingRevalidatedTags: a2.pendingRevalidatedTags ? [...a2.pendingRevalidatedTags] : [], pendingRevalidates: { ...a2.pendingRevalidates }, pendingRevalidateWrites: a2.pendingRevalidateWrites ? [...a2.pendingRevalidateWrites] : [] };
      }
      async function aB(a2, b2) {
        if (0 === a2.length) return;
        let c2 = [];
        b2 && c2.push(b2.revalidateTag(a2));
        let d2 = function() {
          if (ax[aw]) return ax[aw].values();
        }();
        if (d2) for (let b3 of d2) c2.push(b3.expireTags(...a2));
        await Promise.all(c2);
      }
      async function aC(a2, b2) {
        let c2 = (null == b2 ? void 0 : b2.pendingRevalidatedTags) ?? a2.pendingRevalidatedTags ?? [], d2 = (null == b2 ? void 0 : b2.pendingRevalidates) ?? a2.pendingRevalidates ?? {}, e2 = (null == b2 ? void 0 : b2.pendingRevalidateWrites) ?? a2.pendingRevalidateWrites ?? [];
        return Promise.all([aB(c2, a2.incrementalCache), ...Object.values(d2), ...e2]);
      }
      var aD = c(669), aE = c(566);
      class aF {
        constructor({ waitUntil: a2, onClose: b2, onTaskError: c2 }) {
          this.workUnitStores = /* @__PURE__ */ new Set(), this.waitUntil = a2, this.onClose = b2, this.onTaskError = c2, this.callbackQueue = new (as())(), this.callbackQueue.pause();
        }
        after(a2) {
          if (Z(a2)) this.waitUntil || aG(), this.waitUntil(a2.catch((a3) => this.reportTaskError("promise", a3)));
          else if ("function" == typeof a2) this.addCallback(a2);
          else throw Object.defineProperty(Error("`after()`: Argument must be a promise or a function"), "__NEXT_ERROR_CODE", { value: "E50", enumerable: false, configurable: true });
        }
        addCallback(a2) {
          this.waitUntil || aG();
          let b2 = aq.FP.getStore();
          b2 && this.workUnitStores.add(b2);
          let c2 = aE.Z.getStore(), d2 = c2 ? c2.rootTaskSpawnPhase : null == b2 ? void 0 : b2.phase;
          this.runCallbacksOnClosePromise || (this.runCallbacksOnClosePromise = this.runCallbacksOnClose(), this.waitUntil(this.runCallbacksOnClosePromise));
          let e2 = (0, aD.cg)(async () => {
            try {
              await aE.Z.run({ rootTaskSpawnPhase: d2 }, () => a2());
            } catch (a3) {
              this.reportTaskError("function", a3);
            }
          });
          this.callbackQueue.add(e2);
        }
        async runCallbacksOnClose() {
          return await new Promise((a2) => this.onClose(a2)), this.runCallbacks();
        }
        async runCallbacks() {
          if (0 === this.callbackQueue.size) return;
          for (let a3 of this.workUnitStores) a3.phase = "after";
          let a2 = E.J.getStore();
          if (!a2) throw Object.defineProperty(new at.z("Missing workStore in AfterContext.runCallbacks"), "__NEXT_ERROR_CODE", { value: "E547", enumerable: false, configurable: true });
          return az(a2, () => (this.callbackQueue.start(), this.callbackQueue.onIdle()));
        }
        reportTaskError(a2, b2) {
          if (console.error("promise" === a2 ? "A promise passed to `after()` rejected:" : "An error occurred in a function passed to `after()`:", b2), this.onTaskError) try {
            null == this.onTaskError || this.onTaskError.call(this, b2);
          } catch (a3) {
            console.error(Object.defineProperty(new at.z("`onTaskError` threw while handling an error thrown from an `after` task", { cause: a3 }), "__NEXT_ERROR_CODE", { value: "E569", enumerable: false, configurable: true }));
          }
        }
      }
      function aG() {
        throw Object.defineProperty(Error("`after()` will not work correctly, because `waitUntil` is not available in the current environment."), "__NEXT_ERROR_CODE", { value: "E91", enumerable: false, configurable: true });
      }
      function aH(a2) {
        let b2, c2 = { then: (d2, e2) => (b2 || (b2 = a2()), b2.then((a3) => {
          c2.value = a3;
        }).catch(() => {
        }), b2.then(d2, e2)) };
        return c2;
      }
      class aI {
        onClose(a2) {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot subscribe to a closed CloseController"), "__NEXT_ERROR_CODE", { value: "E365", enumerable: false, configurable: true });
          this.target.addEventListener("close", a2), this.listeners++;
        }
        dispatchClose() {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot close a CloseController multiple times"), "__NEXT_ERROR_CODE", { value: "E229", enumerable: false, configurable: true });
          this.listeners > 0 && this.target.dispatchEvent(new Event("close")), this.isClosed = true;
        }
        constructor() {
          this.target = new EventTarget(), this.listeners = 0, this.isClosed = false;
        }
      }
      function aJ() {
        return { previewModeId: process.env.__NEXT_PREVIEW_MODE_ID || "", previewModeSigningKey: process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY || "", previewModeEncryptionKey: process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY || "" };
      }
      let aK = Symbol.for("@next/request-context");
      async function aL(a2, b2, c2) {
        let d2 = [], e2 = c2 && c2.size > 0;
        for (let b3 of ((a3) => {
          let b4 = ["/layout"];
          if (a3.startsWith("/")) {
            let c3 = a3.split("/");
            for (let a4 = 1; a4 < c3.length + 1; a4++) {
              let d3 = c3.slice(0, a4).join("/");
              d3 && (d3.endsWith("/page") || d3.endsWith("/route") || (d3 = `${d3}${!d3.endsWith("/") ? "/" : ""}layout`), b4.push(d3));
            }
          }
          return b4;
        })(a2)) b3 = `${K.gW}${b3}`, d2.push(b3);
        if (b2.pathname && !e2) {
          let a3 = `${K.gW}${b2.pathname}`;
          d2.push(a3);
        }
        return { tags: d2, expirationsByCacheKind: function(a3) {
          let b3 = /* @__PURE__ */ new Map(), c3 = ay();
          if (c3) for (let [d3, e3] of c3) "getExpiration" in e3 && b3.set(d3, aH(async () => e3.getExpiration(...a3)));
          return b3;
        }(d2) };
      }
      class aM extends t.J {
        constructor(a2) {
          super(a2.input, a2.init), this.sourcePage = a2.page;
        }
        get request() {
          throw Object.defineProperty(new m.CB({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new m.CB({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        waitUntil() {
          throw Object.defineProperty(new m.CB({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      let aN = { keys: (a2) => Array.from(a2.keys()), get: (a2, b2) => a2.get(b2) ?? void 0 }, aO = (a2, b2) => am().withPropagatedContext(a2.headers, b2, aN), aP = false;
      async function aQ(a2) {
        var b2;
        let d2, e2;
        if (!aP && (aP = true, "true" === process.env.NEXT_PRIVATE_TEST_PROXY)) {
          let { interceptTestApis: a3, wrapRequestHandler: b3 } = c(720);
          a3(), aO = b3(aO);
        }
        await k();
        let f2 = void 0 !== globalThis.__BUILD_MANIFEST;
        a2.request.url = a2.request.url.replace(/\.rsc($|\?)/, "$1");
        let g2 = a2.bypassNextUrl ? new URL(a2.request.url) : new w.X(a2.request.url, { headers: a2.request.headers, nextConfig: a2.request.nextConfig });
        for (let a3 of [...g2.searchParams.keys()]) {
          let b3 = g2.searchParams.getAll(a3), c2 = (0, n.wN)(a3);
          if (c2) {
            for (let a4 of (g2.searchParams.delete(c2), b3)) g2.searchParams.append(c2, a4);
            g2.searchParams.delete(a3);
          }
        }
        let h2 = process.env.__NEXT_BUILD_ID || "";
        "buildId" in g2 && (h2 = g2.buildId || "", g2.buildId = "");
        let i2 = (0, n.p$)(a2.request.headers), j2 = i2.has("x-nextjs-data"), l2 = "1" === i2.get("rsc");
        j2 && "/index" === g2.pathname && (g2.pathname = "/");
        let m2 = /* @__PURE__ */ new Map();
        if (!f2) for (let a3 of y) {
          let b3 = i2.get(a3);
          null !== b3 && (m2.set(a3, b3), i2.delete(a3));
        }
        let o2 = g2.searchParams.get(z), p2 = new aM({ page: a2.page, input: function(a3) {
          let b3 = "string" == typeof a3, c2 = b3 ? new URL(a3) : a3;
          return c2.searchParams.delete(z), b3 ? c2.toString() : c2;
        }(g2).toString(), init: { body: a2.request.body, headers: i2, method: a2.request.method, nextConfig: a2.request.nextConfig, signal: a2.request.signal } });
        j2 && Object.defineProperty(p2, "__isData", { enumerable: false, value: true }), !globalThis.__incrementalCacheShared && a2.IncrementalCache && (globalThis.__incrementalCache = new a2.IncrementalCache({ CurCacheHandler: a2.incrementalCacheHandler, minimalMode: true, fetchCacheKeyPrefix: "", dev: false, requestHeaders: a2.request.headers, getPrerenderManifest: () => ({ version: -1, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: aJ() }) }));
        let r2 = a2.request.waitUntil ?? (null == (b2 = function() {
          let a3 = globalThis[aK];
          return null == a3 ? void 0 : a3.get();
        }()) ? void 0 : b2.waitUntil), t2 = new s({ request: p2, page: a2.page, context: r2 ? { waitUntil: r2 } : void 0 });
        if ((d2 = await aO(p2, () => {
          if ("/middleware" === a2.page || "/src/middleware" === a2.page) {
            let b3 = t2.waitUntil.bind(t2), c2 = new aI();
            return am().trace(W.execute, { spanName: `middleware ${p2.method} ${p2.nextUrl.pathname}`, attributes: { "http.target": p2.nextUrl.pathname, "http.method": p2.method } }, async () => {
              try {
                var d3, f3, g3, i3, j3, k2;
                let l3 = aJ(), m3 = await aL("/", p2.nextUrl, null), n2 = (j3 = p2.nextUrl, k2 = (a3) => {
                  e2 = a3;
                }, function(a3, b4, c3, d4, e3, f4, g4, h3, i4, j4, k3, l4) {
                  function m4(a4) {
                    c3 && c3.setHeader("Set-Cookie", a4);
                  }
                  let n3 = {};
                  return { type: "request", phase: a3, implicitTags: f4, url: { pathname: d4.pathname, search: d4.search ?? "" }, rootParams: e3, get headers() {
                    return n3.headers || (n3.headers = function(a4) {
                      let b5 = C.from(a4);
                      for (let a5 of y) b5.delete(a5);
                      return C.seal(b5);
                    }(b4.headers)), n3.headers;
                  }, get cookies() {
                    if (!n3.cookies) {
                      let a4 = new D.tm(C.from(b4.headers));
                      ap(b4, a4), n3.cookies = G.seal(a4);
                    }
                    return n3.cookies;
                  }, set cookies(value) {
                    n3.cookies = value;
                  }, get mutableCookies() {
                    if (!n3.mutableCookies) {
                      let a4 = function(a5, b5) {
                        let c4 = new D.tm(C.from(a5));
                        return I.wrap(c4, b5);
                      }(b4.headers, g4 || (c3 ? m4 : void 0));
                      ap(b4, a4), n3.mutableCookies = a4;
                    }
                    return n3.mutableCookies;
                  }, get userspaceMutableCookies() {
                    return n3.userspaceMutableCookies || (n3.userspaceMutableCookies = function(a4) {
                      let b5 = new Proxy(a4.mutableCookies, { get(c4, d5, e4) {
                        switch (d5) {
                          case "delete":
                            return function(...d6) {
                              return J(a4, "cookies().delete"), c4.delete(...d6), b5;
                            };
                          case "set":
                            return function(...d6) {
                              return J(a4, "cookies().set"), c4.set(...d6), b5;
                            };
                          default:
                            return A.l.get(c4, d5, e4);
                        }
                      } });
                      return b5;
                    }(this)), n3.userspaceMutableCookies;
                  }, get draftMode() {
                    return n3.draftMode || (n3.draftMode = new ao(i4, b4, this.cookies, this.mutableCookies)), n3.draftMode;
                  }, renderResumeDataCache: h3 ?? null, isHmrRefresh: j4, serverComponentsHmrCache: k3 || globalThis.__serverComponentsHmrCache, devFallbackParams: null };
                }("action", p2, void 0, j3, {}, m3, k2, void 0, l3, false, void 0, null)), o3 = function({ page: a3, renderOpts: b4, isPrefetchRequest: c3, buildId: d4, previouslyRevalidatedTags: e3 }) {
                  var f4;
                  let g4 = !b4.shouldWaitOnAllReady && !b4.supportsDynamicResponse && !b4.isDraftMode && !b4.isPossibleServerAction, h3 = b4.dev ?? false, i4 = h3 || g4 && (!!process.env.NEXT_DEBUG_BUILD || "1" === process.env.NEXT_SSG_FETCH_METRICS), j4 = { isStaticGeneration: g4, page: a3, route: (f4 = a3.split("/").reduce((a4, b5, c4, d5) => b5 ? "(" === b5[0] && b5.endsWith(")") || "@" === b5[0] || ("page" === b5 || "route" === b5) && c4 === d5.length - 1 ? a4 : a4 + "/" + b5 : a4, "")).startsWith("/") ? f4 : "/" + f4, incrementalCache: b4.incrementalCache || globalThis.__incrementalCache, cacheLifeProfiles: b4.cacheLifeProfiles, isRevalidate: b4.isRevalidate, isBuildTimePrerendering: b4.nextExport, hasReadableErrorStacks: b4.hasReadableErrorStacks, fetchCache: b4.fetchCache, isOnDemandRevalidate: b4.isOnDemandRevalidate, isDraftMode: b4.isDraftMode, isPrefetchRequest: c3, buildId: d4, reactLoadableManifest: (null == b4 ? void 0 : b4.reactLoadableManifest) || {}, assetPrefix: (null == b4 ? void 0 : b4.assetPrefix) || "", afterContext: function(a4) {
                    let { waitUntil: b5, onClose: c4, onAfterTaskError: d5 } = a4;
                    return new aF({ waitUntil: b5, onClose: c4, onTaskError: d5 });
                  }(b4), cacheComponentsEnabled: b4.experimental.cacheComponents, dev: h3, previouslyRevalidatedTags: e3, refreshTagsByCacheKind: function() {
                    let a4 = /* @__PURE__ */ new Map(), b5 = ay();
                    if (b5) for (let [c4, d5] of b5) "refreshTags" in d5 && a4.set(c4, aH(async () => d5.refreshTags()));
                    return a4;
                  }(), runInCleanSnapshot: (0, aD.$p)(), shouldTrackFetchMetrics: i4 };
                  return b4.store = j4, j4;
                }({ page: "/", renderOpts: { cacheLifeProfiles: null == (f3 = a2.request.nextConfig) || null == (d3 = f3.experimental) ? void 0 : d3.cacheLife, experimental: { isRoutePPREnabled: false, cacheComponents: false, authInterrupts: !!(null == (i3 = a2.request.nextConfig) || null == (g3 = i3.experimental) ? void 0 : g3.authInterrupts) }, supportsDynamicResponse: true, waitUntil: b3, onClose: c2.onClose.bind(c2), onAfterTaskError: void 0 }, isPrefetchRequest: "1" === p2.headers.get(x), buildId: h2 ?? "", previouslyRevalidatedTags: [] });
                return await E.J.run(o3, () => aq.FP.run(n2, a2.handler, p2, t2));
              } finally {
                setTimeout(() => {
                  c2.dispatchClose();
                }, 0);
              }
            });
          }
          return a2.handler(p2, t2);
        })) && !(d2 instanceof Response)) throw Object.defineProperty(TypeError("Expected an instance of Response to be returned"), "__NEXT_ERROR_CODE", { value: "E567", enumerable: false, configurable: true });
        d2 && e2 && d2.headers.set("set-cookie", e2);
        let B2 = null == d2 ? void 0 : d2.headers.get("x-middleware-rewrite");
        if (d2 && B2 && (l2 || !f2)) {
          let b3 = new w.X(B2, { forceLocale: true, headers: a2.request.headers, nextConfig: a2.request.nextConfig });
          f2 || b3.host !== p2.nextUrl.host || (b3.buildId = h2 || b3.buildId, d2.headers.set("x-middleware-rewrite", String(b3)));
          let { url: c2, isRelative: e3 } = v(b3.toString(), g2.toString());
          !f2 && j2 && d2.headers.set("x-nextjs-rewrite", c2), l2 && e3 && (g2.pathname !== b3.pathname && d2.headers.set("x-nextjs-rewritten-path", b3.pathname), g2.search !== b3.search && d2.headers.set("x-nextjs-rewritten-query", b3.search.slice(1)));
        }
        if (d2 && B2 && l2 && o2) {
          let a3 = new URL(B2);
          a3.searchParams.has(z) || (a3.searchParams.set(z, o2), d2.headers.set("x-middleware-rewrite", a3.toString()));
        }
        let F2 = null == d2 ? void 0 : d2.headers.get("Location");
        if (d2 && F2 && !f2) {
          let b3 = new w.X(F2, { forceLocale: false, headers: a2.request.headers, nextConfig: a2.request.nextConfig });
          d2 = new Response(d2.body, d2), b3.host === g2.host && (b3.buildId = h2 || b3.buildId, d2.headers.set("Location", b3.toString())), j2 && (d2.headers.delete("Location"), d2.headers.set("x-nextjs-redirect", v(b3.toString(), g2.toString()).url));
        }
        let H2 = d2 || u.R.next(), K2 = H2.headers.get("x-middleware-override-headers"), L2 = [];
        if (K2) {
          for (let [a3, b3] of m2) H2.headers.set(`x-middleware-request-${a3}`, b3), L2.push(a3);
          L2.length > 0 && H2.headers.set("x-middleware-override-headers", K2 + "," + L2.join(","));
        }
        return { response: H2, waitUntil: ("internal" === t2[q].kind ? Promise.all(t2[q].promises).then(() => {
        }) : void 0) ?? Promise.resolve(), fetchMetrics: p2.fetchMetrics };
      }
      let aR = (0, c(942).withAuth)({ callbacks: { authorized: ({ token: a2 }) => !!a2 } }), aS = { matcher: ["/dashboard/:path*", "/api/employees/:path*", "/api/advances/:path*", "/api/salary/:path*", "/api/upload/:path*", "/api/checklists/:path*", "/api/assignments/:path*", "/api/qc/:path*", "/api/reports/:path*", "/api/departments/:path*", "/api/leave/:path*", "/api/forms/:path*"] };
      Object.values({ NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHORIZED: 401 });
      let aT = { ...e }, aU = aT.middleware || aT.default, aV = "/src/middleware";
      if ("function" != typeof aU) throw Object.defineProperty(Error(`The Middleware "${aV}" must export a \`middleware\` or a \`default\` function`), "__NEXT_ERROR_CODE", { value: "E120", enumerable: false, configurable: true });
      function aW(a2) {
        return aQ({ ...a2, page: aV, handler: async (...a3) => {
          try {
            return await aU(...a3);
          } catch (e2) {
            let b2 = a3[0], c2 = new URL(b2.url), d2 = c2.pathname + c2.search;
            throw await i(e2, { path: d2, method: b2.method, headers: Object.fromEntries(b2.headers.entries()) }, { routerKind: "Pages Router", routePath: "/middleware", routeType: "middleware", revalidateReason: void 0 }), e2;
          }
        } });
      }
    }, 942: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
      var d = {};
      Object.defineProperty(b, "default", { enumerable: true, get: function() {
        return e.default;
      } });
      var e = function(a2, b2) {
        if (a2 && a2.__esModule) return a2;
        if (null === a2 || "object" != typeof a2 && "function" != typeof a2) return { default: a2 };
        var c2 = f(b2);
        if (c2 && c2.has(a2)) return c2.get(a2);
        var d2 = { __proto__: null }, e2 = Object.defineProperty && Object.getOwnPropertyDescriptor;
        for (var g in a2) if ("default" !== g && {}.hasOwnProperty.call(a2, g)) {
          var h = e2 ? Object.getOwnPropertyDescriptor(a2, g) : null;
          h && (h.get || h.set) ? Object.defineProperty(d2, g, h) : d2[g] = a2[g];
        }
        return d2.default = a2, c2 && c2.set(a2, d2), d2;
      }(c(825));
      function f(a2) {
        if ("function" != typeof WeakMap) return null;
        var b2 = /* @__PURE__ */ new WeakMap(), c2 = /* @__PURE__ */ new WeakMap();
        return (f = function(a3) {
          return a3 ? c2 : b2;
        })(a2);
      }
      Object.keys(e).forEach(function(a2) {
        !("default" === a2 || "__esModule" === a2 || Object.prototype.hasOwnProperty.call(d, a2)) && (a2 in b && b[a2] === e[a2] || Object.defineProperty(b, a2, { enumerable: true, get: function() {
          return e[a2];
        } }));
      });
    } }, (a) => {
      var b = a(a.s = 863);
      (_ENTRIES = "undefined" == typeof _ENTRIES ? {} : _ENTRIES)["middleware_src/middleware"] = b;
    }]);
  }
});

// node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js
var edgeFunctionHandler_exports = {};
__export(edgeFunctionHandler_exports, {
  default: () => edgeFunctionHandler
});
async function edgeFunctionHandler(request) {
  const path3 = new URL(request.url).pathname;
  const routes = globalThis._ROUTES;
  const correspondingRoute = routes.find((route) => route.regex.some((r) => new RegExp(r).test(path3)));
  if (!correspondingRoute) {
    throw new Error(`No route found for ${request.url}`);
  }
  const entry = await self._ENTRIES[`middleware_${correspondingRoute.name}`];
  const result = await entry.default({
    page: correspondingRoute.page,
    request: {
      ...request,
      page: {
        name: correspondingRoute.name
      }
    }
  });
  globalThis.__openNextAls.getStore()?.pendingPromiseRunner.add(result.waitUntil);
  const response = result.response;
  return response;
}
var init_edgeFunctionHandler = __esm({
  "node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js"() {
    globalThis._ENTRIES = {};
    globalThis.self = globalThis;
    globalThis._ROUTES = [{ "name": "src/middleware", "page": "/", "regex": ["^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/dashboard(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/employees(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/advances(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/salary(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/upload(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/checklists(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/assignments(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/qc(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/reports(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/departments(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/leave(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/forms(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$"] }];
    require_edge_runtime_webpack();
    require_middleware();
  }
});

// node_modules/@opennextjs/aws/dist/utils/promise.js
init_logger();
var DetachedPromise = class {
  resolve;
  reject;
  promise;
  constructor() {
    let resolve;
    let reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolve = resolve;
    this.reject = reject;
  }
};
var DetachedPromiseRunner = class {
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
};
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
  const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
  const store = globalThis.__openNextAls.getStore();
  const waitUntil = store?.waitUntil ?? ((promise) => store?.pendingPromiseRunner.add(promise));
  const nextAfterContext = {
    get: () => ({
      waitUntil
    })
  };
  globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
    globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  }
}
function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil, requestId = Math.random().toString(36) }, fn) {
  return globalThis.__openNextAls.run({
    requestId,
    pendingPromiseRunner: new DetachedPromiseRunner(),
    isISRRevalidation,
    waitUntil,
    writtenTags: /* @__PURE__ */ new Set()
  }, async () => {
    provideNextAfterProvider();
    let result;
    try {
      result = await fn();
    } finally {
      await awaitAllDetachedPromise();
    }
    return result;
  });
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/resolve.js
async function resolveConverter(converter2) {
  if (typeof converter2 === "function") {
    return converter2();
  }
  const m_1 = await Promise.resolve().then(() => (init_edge(), edge_exports));
  return m_1.default;
}
async function resolveWrapper(wrapper) {
  if (typeof wrapper === "function") {
    return wrapper();
  }
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_edge(), cloudflare_edge_exports));
  return m_1.default;
}
async function resolveOriginResolver(originResolver) {
  if (typeof originResolver === "function") {
    return originResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_pattern_env(), pattern_env_exports));
  return m_1.default;
}
async function resolveAssetResolver(assetResolver) {
  if (typeof assetResolver === "function") {
    return assetResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy(), dummy_exports));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
async function createGenericHandler(handler3) {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  globalThis.openNextConfig = config;
  const handlerConfig = config[handler3.type];
  const override = handlerConfig && "override" in handlerConfig ? handlerConfig.override : void 0;
  const converter2 = await resolveConverter(override?.converter);
  const { name, wrapper } = await resolveWrapper(override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(handler3.handler, converter2);
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto2 from "node:crypto";
import { parse as parseQs, stringify as stringifyQs } from "node:querystring";

// node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": {}, "webpack": null, "eslint": { "ignoreDuringBuilds": false }, "typescript": { "ignoreBuildErrors": true, "tsconfigPath": "tsconfig.json" }, "typedRoutes": false, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.mjs", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "poweredByHeader": true, "compress": true, "images": { "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840], "imageSizes": [16, 32, 48, 64, 96, 128, 256, 384], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 60, "formats": ["image/webp"], "maximumResponseBody": 5e7, "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "remotePatterns": [], "unoptimized": false }, "devIndicators": { "position": "bottom-left" }, "onDemandEntries": { "maxInactiveAge": 6e4, "pagesBufferLength": 5 }, "amp": { "canonicalBase": "" }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "serverRuntimeConfig": {}, "publicRuntimeConfig": {}, "reactProductionProfiling": false, "reactStrictMode": null, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": {}, "compiler": {}, "expireTime": 31536e3, "staticPageGenerationTimeout": 60, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "C:\\Users\\96277\\Desktop\\drinkat_management", "experimental": { "useSkewCookie": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 30, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 4294967294 } }, "cacheHandlers": {}, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "serverSourceMaps": false, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "clientSegmentCache": false, "clientParamParsing": false, "dynamicOnHover": false, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "middlewarePrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 7, "memoryBasedWorkersCount": false, "imgOptConcurrency": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "imgOptSkipMetadata": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "largePageDataBytes": 128e3, "typedEnv": false, "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": false, "optimizeServerReact": true, "viewTransition": false, "routerBFCache": false, "removeUncaughtErrorAndRejectionListeners": false, "validateRSCRequestHeaders": false, "staleTimes": { "dynamic": 0, "static": 300 }, "serverComponentsHmrCache": true, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "cacheComponents": false, "inlineCss": false, "useCache": false, "globalNotFound": false, "devtoolSegmentExplorer": true, "browserDebugInfoInTerminal": false, "optimizeRouterScrolling": false, "middlewareClientMaxBodySize": 10485760, "serverActions": { "bodySizeLimit": "10mb" }, "optimizePackageImports": ["lucide-react", "date-fns", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "rxjs", "@mui/material", "@mui/icons-material", "recharts", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-sqlite-node", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-wasm", "@effect/sql-sqlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight", "bundlePagesRouterDependencies": false, "configFileName": "next.config.mjs", "serverExternalPackages": ["@prisma/client", ".prisma/client"], "turbopack": { "root": "C:\\Users\\96277\\Desktop\\drinkat_management" } };
var BuildId = "2YFXnNZthg-1jidaqLlHz";
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [], "fallback": [] }, "redirects": [{ "source": "/:path+/", "destination": "/:path+", "internal": true, "statusCode": 308, "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$" }], "routes": { "static": [{ "page": "/", "regex": "^/(?:/)?$", "routeKeys": {}, "namedRegex": "^/(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/dashboard", "regex": "^/dashboard(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard(?:/)?$" }, { "page": "/dashboard/forms", "regex": "^/dashboard/forms(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard/forms(?:/)?$" }, { "page": "/dashboard/hr", "regex": "^/dashboard/hr(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard/hr(?:/)?$" }, { "page": "/dashboard/qc", "regex": "^/dashboard/qc(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard/qc(?:/)?$" }, { "page": "/dashboard/reports", "regex": "^/dashboard/reports(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard/reports(?:/)?$" }, { "page": "/login", "regex": "^/login(?:/)?$", "routeKeys": {}, "namedRegex": "^/login(?:/)?$" }], "dynamic": [{ "page": "/api/advances/[id]", "regex": "^/api/advances/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/advances/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/assignments/[id]", "regex": "^/api/assignments/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/assignments/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/auth/[...nextauth]", "regex": "^/api/auth/(.+?)(?:/)?$", "routeKeys": { "nxtPnextauth": "nxtPnextauth" }, "namedRegex": "^/api/auth/(?<nxtPnextauth>.+?)(?:/)?$" }, { "page": "/api/checklists/[id]", "regex": "^/api/checklists/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/checklists/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/checklists/[id]/items", "regex": "^/api/checklists/([^/]+?)/items(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/checklists/(?<nxtPid>[^/]+?)/items(?:/)?$" }, { "page": "/api/checklists/[id]/items/[itemId]", "regex": "^/api/checklists/([^/]+?)/items/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid", "nxtPitemId": "nxtPitemId" }, "namedRegex": "^/api/checklists/(?<nxtPid>[^/]+?)/items/(?<nxtPitemId>[^/]+?)(?:/)?$" }, { "page": "/api/departments/[id]", "regex": "^/api/departments/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/departments/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/employees/[id]", "regex": "^/api/employees/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/employees/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/employees/[id]/documents", "regex": "^/api/employees/([^/]+?)/documents(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/employees/(?<nxtPid>[^/]+?)/documents(?:/)?$" }, { "page": "/api/employees/[id]/documents/[docId]", "regex": "^/api/employees/([^/]+?)/documents/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid", "nxtPdocId": "nxtPdocId" }, "namedRegex": "^/api/employees/(?<nxtPid>[^/]+?)/documents/(?<nxtPdocId>[^/]+?)(?:/)?$" }, { "page": "/api/employees/[id]/reset-password", "regex": "^/api/employees/([^/]+?)/reset\\-password(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/employees/(?<nxtPid>[^/]+?)/reset\\-password(?:/)?$" }, { "page": "/api/employees/[id]/reviews", "regex": "^/api/employees/([^/]+?)/reviews(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/employees/(?<nxtPid>[^/]+?)/reviews(?:/)?$" }, { "page": "/api/employees/[id]/salary-history", "regex": "^/api/employees/([^/]+?)/salary\\-history(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/employees/(?<nxtPid>[^/]+?)/salary\\-history(?:/)?$" }, { "page": "/api/employees/[id]/transfer", "regex": "^/api/employees/([^/]+?)/transfer(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/employees/(?<nxtPid>[^/]+?)/transfer(?:/)?$" }, { "page": "/api/forms/submissions/[id]", "regex": "^/api/forms/submissions/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/forms/submissions/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/forms/templates/[id]", "regex": "^/api/forms/templates/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/forms/templates/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/leave/[id]", "regex": "^/api/leave/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/leave/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/qc/submissions/[id]", "regex": "^/api/qc/submissions/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/qc/submissions/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/uploads/[[...segments]]", "regex": "^/api/uploads(?:/(.+?))?(?:/)?$", "routeKeys": { "nxtPsegments": "nxtPsegments" }, "namedRegex": "^/api/uploads(?:/(?<nxtPsegments>.+?))?(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var ConfigHeaders = [];
var PrerenderManifest = { "version": 4, "routes": {}, "dynamicRoutes": {}, "notFoundRoutes": [], "preview": { "previewModeId": "93d1a443bda70f1ac057c7a69bdf3d97", "previewModeSigningKey": "f6fd1ca99e20cf2c3ec3ed005159a79f021fb6f9cfd67334dcadc9e388475d1a", "previewModeEncryptionKey": "6e81cf3e54273500ef18b1d6a2f4d9c2b4b5fc830b258fc39325a50622d2afad" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge-runtime-webpack.js", "server/src/middleware.js"], "name": "src/middleware", "page": "/", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/dashboard(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/dashboard/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/employees(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/employees/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/advances(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/advances/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/salary(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/salary/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/upload(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/upload/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/checklists(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/checklists/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/assignments(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/assignments/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/qc(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/qc/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/reports(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/reports/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/departments(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/departments/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/leave(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/leave/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/api\\/forms(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/api/forms/:path*" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "2YFXnNZthg-1jidaqLlHz", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "O2DfzUFB+Otd/sulbuXkrIEpQrGuTu1iFJsHF8upb+A=", "__NEXT_PREVIEW_MODE_ID": "93d1a443bda70f1ac057c7a69bdf3d97", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "f6fd1ca99e20cf2c3ec3ed005159a79f021fb6f9cfd67334dcadc9e388475d1a", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "6e81cf3e54273500ef18b1d6a2f4d9c2b4b5fc830b258fc39325a50622d2afad" } } }, "functions": {}, "sortedMiddleware": ["/"] };
var AppPathRoutesManifest = { "/_not-found/page": "/_not-found", "/api/advances/[id]/route": "/api/advances/[id]", "/api/advances/route": "/api/advances", "/api/assignments/[id]/route": "/api/assignments/[id]", "/api/assignments/route": "/api/assignments", "/api/auth/[...nextauth]/route": "/api/auth/[...nextauth]", "/api/checklists/[id]/items/[itemId]/route": "/api/checklists/[id]/items/[itemId]", "/api/checklists/[id]/items/route": "/api/checklists/[id]/items", "/api/checklists/[id]/route": "/api/checklists/[id]", "/api/checklists/route": "/api/checklists", "/api/departments/[id]/route": "/api/departments/[id]", "/api/departments/route": "/api/departments", "/api/employees/[id]/documents/[docId]/route": "/api/employees/[id]/documents/[docId]", "/api/employees/[id]/documents/route": "/api/employees/[id]/documents", "/api/employees/[id]/reset-password/route": "/api/employees/[id]/reset-password", "/api/employees/[id]/reviews/route": "/api/employees/[id]/reviews", "/api/employees/[id]/route": "/api/employees/[id]", "/api/employees/[id]/transfer/route": "/api/employees/[id]/transfer", "/api/employees/[id]/salary-history/route": "/api/employees/[id]/salary-history", "/api/employees/route": "/api/employees", "/api/forms/submissions/[id]/route": "/api/forms/submissions/[id]", "/api/forms/submissions/route": "/api/forms/submissions", "/api/forms/templates/[id]/route": "/api/forms/templates/[id]", "/api/forms/templates/route": "/api/forms/templates", "/api/health-db/route": "/api/health-db", "/api/leave/[id]/route": "/api/leave/[id]", "/api/leave/route": "/api/leave", "/api/qc/submissions/[id]/route": "/api/qc/submissions/[id]", "/api/qc/submissions/route": "/api/qc/submissions", "/api/reports/route": "/api/reports", "/api/review-notifications/route": "/api/review-notifications", "/api/salary/deductions/route": "/api/salary/deductions", "/api/salary/route": "/api/salary", "/api/salary/upload/route": "/api/salary/upload", "/api/upload/route": "/api/upload", "/api/uploads/[[...segments]]/route": "/api/uploads/[[...segments]]", "/login/page": "/login", "/page": "/", "/dashboard/hr/page": "/dashboard/hr", "/dashboard/page": "/dashboard", "/dashboard/qc/page": "/dashboard/qc", "/dashboard/reports/page": "/dashboard/reports", "/dashboard/forms/page": "/dashboard/forms" };
var FunctionsConfigManifest = { "version": 1, "functions": {} };
var PagesManifest = { "/_app": "pages/_app.js", "/_error": "pages/_error.js", "/_document": "pages/_document.js" };
process.env.NEXT_BUILD_ID = BuildId;
process.env.NEXT_PREVIEW_MODE_ID = PrerenderManifest?.preview?.previewModeId;

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
init_util();
import { Transform } from "node:stream";

// node_modules/@opennextjs/aws/dist/core/routing/util.js
init_util();
init_logger();
import { ReadableStream as ReadableStream2 } from "node:stream/web";

// node_modules/@opennextjs/aws/dist/utils/binary.js
var commonBinaryMimeTypes = /* @__PURE__ */ new Set([
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
  // Serialized data
  "application/x-protobuf"
]);
function isBinaryContentType(contentType) {
  if (!contentType)
    return false;
  const value = contentType.split(";")[0];
  return commonBinaryMimeTypes.has(value);
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/i18n/accept-header.js
function parse(raw, preferences, options) {
  const lowers = /* @__PURE__ */ new Map();
  const header = raw.replace(/[ \t]/g, "");
  if (preferences) {
    let pos = 0;
    for (const preference of preferences) {
      const lower = preference.toLowerCase();
      lowers.set(lower, { orig: preference, pos: pos++ });
      if (options.prefixMatch) {
        const parts2 = lower.split("-");
        while (parts2.pop(), parts2.length > 0) {
          const joined = parts2.join("-");
          if (!lowers.has(joined)) {
            lowers.set(joined, { orig: preference, pos: pos++ });
          }
        }
      }
    }
  }
  const parts = header.split(",");
  const selections = [];
  const map = /* @__PURE__ */ new Set();
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const params = part.split(";");
    if (params.length > 2) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const token = params[0].toLowerCase();
    if (!token) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const selection = { token, pos: i, q: 1 };
    if (preferences && lowers.has(token)) {
      selection.pref = lowers.get(token).pos;
    }
    map.add(selection.token);
    if (params.length === 2) {
      const q = params[1];
      const [key, value] = q.split("=");
      if (!value || key !== "q" && key !== "Q") {
        throw new Error(`Invalid ${options.type} header`);
      }
      const score = Number.parseFloat(value);
      if (score === 0) {
        continue;
      }
      if (Number.isFinite(score) && score <= 1 && score >= 1e-3) {
        selection.q = score;
      }
    }
    selections.push(selection);
  }
  selections.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    if (b.pref !== a.pref) {
      if (a.pref === void 0) {
        return 1;
      }
      if (b.pref === void 0) {
        return -1;
      }
      return a.pref - b.pref;
    }
    return a.pos - b.pos;
  });
  const values = selections.map((selection) => selection.token);
  if (!preferences || !preferences.length) {
    return values;
  }
  const preferred = [];
  for (const selection of values) {
    if (selection === "*") {
      for (const [preference, value] of lowers) {
        if (!map.has(preference)) {
          preferred.push(value.orig);
        }
      }
    } else {
      const lower = selection.toLowerCase();
      if (lowers.has(lower)) {
        preferred.push(lowers.get(lower).orig);
      }
    }
  }
  return preferred;
}
function acceptLanguage(header = "", preferences) {
  return parse(header, preferences, {
    type: "accept-language",
    prefixMatch: true
  })[0] || void 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
function isLocalizedPath(path3) {
  return NextConfig.i18n?.locales.includes(path3.split("/")[1].toLowerCase()) ?? false;
}
function getLocaleFromCookie(cookies) {
  const i18n = NextConfig.i18n;
  const nextLocale = cookies.NEXT_LOCALE?.toLowerCase();
  return nextLocale ? i18n?.locales.find((locale) => nextLocale === locale.toLowerCase()) : void 0;
}
function detectDomainLocale({ hostname, detectedLocale }) {
  const i18n = NextConfig.i18n;
  const domains = i18n?.domains;
  if (!domains) {
    return;
  }
  const lowercasedLocale = detectedLocale?.toLowerCase();
  for (const domain of domains) {
    const domainHostname = domain.domain.split(":", 1)[0].toLowerCase();
    if (hostname === domainHostname || lowercasedLocale === domain.defaultLocale.toLowerCase() || domain.locales?.some((locale) => lowercasedLocale === locale.toLowerCase())) {
      return domain;
    }
  }
}
function detectLocale(internalEvent, i18n) {
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  if (i18n.localeDetection === false) {
    return domainLocale?.defaultLocale ?? i18n.defaultLocale;
  }
  const cookiesLocale = getLocaleFromCookie(internalEvent.cookies);
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  debug({
    cookiesLocale,
    preferredLocale,
    defaultLocale: i18n.defaultLocale,
    domainLocale
  });
  return domainLocale?.defaultLocale ?? cookiesLocale ?? preferredLocale ?? i18n.defaultLocale;
}
function localizePath(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n) {
    return internalEvent.rawPath;
  }
  if (isLocalizedPath(internalEvent.rawPath)) {
    return internalEvent.rawPath;
  }
  const detectedLocale = detectLocale(internalEvent, i18n);
  return `/${detectedLocale}${internalEvent.rawPath}`;
}
function handleLocaleRedirect(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n || i18n.localeDetection === false || internalEvent.rawPath !== "/") {
    return false;
  }
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  const detectedLocale = detectLocale(internalEvent, i18n);
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  const preferredDomain = detectDomainLocale({
    detectedLocale: preferredLocale
  });
  if (domainLocale && preferredDomain) {
    const isPDomain = preferredDomain.domain === domainLocale.domain;
    const isPLocale = preferredDomain.defaultLocale === preferredLocale;
    if (!isPDomain || !isPLocale) {
      const scheme = `http${preferredDomain.http ? "" : "s"}`;
      const rlocale = isPLocale ? "" : preferredLocale;
      return {
        type: "core",
        statusCode: 307,
        headers: {
          Location: `${scheme}://${preferredDomain.domain}/${rlocale}`
        },
        body: emptyReadableStream(),
        isBase64Encoded: false
      };
    }
  }
  const defaultLocale = domainLocale?.defaultLocale ?? i18n.defaultLocale;
  if (detectedLocale.toLowerCase() !== defaultLocale.toLowerCase()) {
    return {
      type: "core",
      statusCode: 307,
      headers: {
        Location: constructNextUrl(internalEvent.url, `/${detectedLocale}`)
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}

// node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateShardId(rawPath, maxConcurrency, prefix) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `${prefix}-${randomInt}`;
}
function generateMessageGroupId(rawPath) {
  const maxConcurrency = Number.parseInt(process.env.MAX_REVALIDATE_CONCURRENCY ?? "10");
  return generateShardId(rawPath, maxConcurrency, "revalidate");
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
function isExternal(url, host) {
  if (!url)
    return false;
  const pattern = /^https?:\/\//;
  if (!pattern.test(url))
    return false;
  if (host) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.host !== host;
    } catch {
      return !url.includes(host);
    }
  }
  return true;
}
function convertFromQueryString(query) {
  if (query === "")
    return {};
  const queryParts = query.split("&");
  return getQueryFromIterator(queryParts.map((p) => {
    const [key, value] = p.split("=");
    return [key, value];
  }));
}
function getUrlParts(url, isExternal2) {
  if (!isExternal2) {
    const regex2 = /\/([^?]*)\??(.*)/;
    const match3 = url.match(regex2);
    return {
      hostname: "",
      pathname: match3?.[1] ? `/${match3[1]}` : url,
      protocol: "",
      queryString: match3?.[2] ?? ""
    };
  }
  const regex = /^(https?:)\/\/?([^\/\s]+)(\/[^?]*)?(\?.*)?/;
  const match2 = url.match(regex);
  if (!match2) {
    throw new Error(`Invalid external URL: ${url}`);
  }
  return {
    protocol: match2[1] ?? "https:",
    hostname: match2[2],
    pathname: match2[3] ?? "",
    queryString: match2[4]?.slice(1) ?? ""
  };
}
function constructNextUrl(baseUrl, path3) {
  const nextBasePath = NextConfig.basePath ?? "";
  const url = new URL(`${nextBasePath}${path3}`, baseUrl);
  return url.href;
}
function convertToQueryString(query) {
  const queryStrings = [];
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => queryStrings.push(`${key}=${entry}`));
    } else {
      queryStrings.push(`${key}=${value}`);
    }
  });
  return queryStrings.length > 0 ? `?${queryStrings.join("&")}` : "";
}
function getMiddlewareMatch(middlewareManifest2, functionsManifest) {
  if (functionsManifest?.functions?.["/_middleware"]) {
    return functionsManifest.functions["/_middleware"].matchers?.map(({ regexp }) => new RegExp(regexp)) ?? [/.*/];
  }
  const rootMiddleware = middlewareManifest2.middleware["/"];
  if (!rootMiddleware?.matchers)
    return [];
  return rootMiddleware.matchers.map(({ regexp }) => new RegExp(regexp));
}
function escapeRegex(str, { isPath } = {}) {
  const result = str.replaceAll("(.)", "_\xB51_").replaceAll("(..)", "_\xB52_").replaceAll("(...)", "_\xB53_");
  return isPath ? result : result.replaceAll("+", "_\xB54_");
}
function unescapeRegex(str) {
  return str.replaceAll("_\xB51_", "(.)").replaceAll("_\xB52_", "(..)").replaceAll("_\xB53_", "(...)").replaceAll("_\xB54_", "+");
}
function convertBodyToReadableStream(method, body) {
  if (method === "GET" || method === "HEAD")
    return void 0;
  if (!body)
    return void 0;
  return new ReadableStream2({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    }
  });
}
var CommonHeaders;
(function(CommonHeaders2) {
  CommonHeaders2["CACHE_CONTROL"] = "cache-control";
  CommonHeaders2["NEXT_CACHE"] = "x-nextjs-cache";
})(CommonHeaders || (CommonHeaders = {}));
function normalizeLocationHeader(location, baseUrl, encodeQuery = false) {
  if (!URL.canParse(location)) {
    return location;
  }
  const locationURL = new URL(location);
  const origin = new URL(baseUrl).origin;
  let search = locationURL.search;
  if (encodeQuery && search) {
    search = `?${stringifyQs(parseQs(search.slice(1)))}`;
  }
  const href = `${locationURL.origin}${locationURL.pathname}${search}${locationURL.hash}`;
  if (locationURL.origin === origin) {
    return href.slice(origin.length);
  }
  return href;
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
import { createHash } from "node:crypto";
init_stream();

// node_modules/@opennextjs/aws/dist/utils/cache.js
init_logger();
async function hasBeenRevalidated(key, tags, cacheEntry) {
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  const value = cacheEntry.value;
  if (!value) {
    return true;
  }
  if ("type" in cacheEntry && cacheEntry.type === "page") {
    return false;
  }
  const lastModified = cacheEntry.lastModified ?? Date.now();
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.hasBeenRevalidated(tags, lastModified);
  }
  const _lastModified = await globalThis.tagCache.getLastModified(key, lastModified);
  return _lastModified === -1;
}
function getTagsFromValue(value) {
  if (!value) {
    return [];
  }
  try {
    const cacheTags = value.meta?.headers?.["x-next-cache-tags"]?.split(",") ?? [];
    delete value.meta?.headers?.["x-next-cache-tags"];
    return cacheTags;
  } catch (e) {
    return [];
  }
}

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;
var VARY_HEADER = "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url";
var NEXT_SEGMENT_PREFETCH_HEADER = "next-router-segment-prefetch";
var NEXT_PRERENDER_HEADER = "x-nextjs-prerender";
var NEXT_POSTPONED_HEADER = "x-nextjs-postponed";
async function computeCacheControl(path3, body, host, revalidate, lastModified) {
  let finalRevalidate = CACHE_ONE_YEAR;
  const existingRoute = Object.entries(PrerenderManifest?.routes ?? {}).find((p) => p[0] === path3)?.[1];
  if (revalidate === void 0 && existingRoute) {
    finalRevalidate = existingRoute.initialRevalidateSeconds === false ? CACHE_ONE_YEAR : existingRoute.initialRevalidateSeconds;
  } else if (revalidate !== void 0) {
    finalRevalidate = revalidate === false ? CACHE_ONE_YEAR : revalidate;
  }
  const age = Math.round((Date.now() - (lastModified ?? 0)) / 1e3);
  const hash = (str) => createHash("md5").update(str).digest("hex");
  const etag = hash(body);
  if (revalidate === 0) {
    return {
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "x-opennext-cache": "ERROR",
      etag
    };
  }
  if (finalRevalidate !== CACHE_ONE_YEAR) {
    const sMaxAge = Math.max(finalRevalidate - age, 1);
    debug("sMaxAge", {
      finalRevalidate,
      age,
      lastModified,
      revalidate
    });
    const isStale = sMaxAge === 1;
    if (isStale) {
      let url = NextConfig.trailingSlash ? `${path3}/` : path3;
      if (NextConfig.basePath) {
        url = `${NextConfig.basePath}${url}`;
      }
      await globalThis.queue.send({
        MessageBody: {
          host,
          url,
          eTag: etag,
          lastModified: lastModified ?? Date.now()
        },
        MessageDeduplicationId: hash(`${path3}-${lastModified}-${etag}`),
        MessageGroupId: generateMessageGroupId(path3)
      });
    }
    return {
      "cache-control": `s-maxage=${sMaxAge}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
      "x-opennext-cache": isStale ? "STALE" : "HIT",
      etag
    };
  }
  return {
    "cache-control": `s-maxage=${CACHE_ONE_YEAR}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
    "x-opennext-cache": "HIT",
    etag
  };
}
function getBodyForAppRouter(event, cachedValue) {
  if (cachedValue.type !== "app") {
    throw new Error("getBodyForAppRouter called with non-app cache value");
  }
  try {
    const segmentHeader = `${event.headers[NEXT_SEGMENT_PREFETCH_HEADER]}`;
    const isSegmentResponse = Boolean(segmentHeader) && segmentHeader in (cachedValue.segmentData || {});
    const body = isSegmentResponse ? cachedValue.segmentData[segmentHeader] : cachedValue.rsc;
    return {
      body,
      additionalHeaders: isSegmentResponse ? { [NEXT_PRERENDER_HEADER]: "1", [NEXT_POSTPONED_HEADER]: "2" } : {}
    };
  } catch (e) {
    error("Error while getting body for app router from cache:", e);
    return { body: cachedValue.rsc, additionalHeaders: {} };
  }
}
async function generateResult(event, localizedPath, cachedValue, lastModified) {
  debug("Returning result from experimental cache");
  let body = "";
  let type = "application/octet-stream";
  let isDataRequest = false;
  let additionalHeaders = {};
  if (cachedValue.type === "app") {
    isDataRequest = Boolean(event.headers.rsc);
    if (isDataRequest) {
      const { body: appRouterBody, additionalHeaders: appHeaders } = getBodyForAppRouter(event, cachedValue);
      body = appRouterBody;
      additionalHeaders = appHeaders;
    } else {
      body = cachedValue.html;
    }
    type = isDataRequest ? "text/x-component" : "text/html; charset=utf-8";
  } else if (cachedValue.type === "page") {
    isDataRequest = Boolean(event.query.__nextDataReq);
    body = isDataRequest ? JSON.stringify(cachedValue.json) : cachedValue.html;
    type = isDataRequest ? "application/json" : "text/html; charset=utf-8";
  } else {
    throw new Error("generateResult called with unsupported cache value type, only 'app' and 'page' are supported");
  }
  const cacheControl = await computeCacheControl(localizedPath, body, event.headers.host, cachedValue.revalidate, lastModified);
  return {
    type: "core",
    // Sometimes other status codes can be cached, like 404. For these cases, we should return the correct status code
    // Also set the status code to the rewriteStatusCode if defined
    // This can happen in handleMiddleware in routingHandler.
    // `NextResponse.rewrite(url, { status: xxx})
    // The rewrite status code should take precedence over the cached one
    statusCode: event.rewriteStatusCode ?? cachedValue.meta?.status ?? 200,
    body: toReadableStream(body, false),
    isBase64Encoded: false,
    headers: {
      ...cacheControl,
      "content-type": type,
      ...cachedValue.meta?.headers,
      vary: VARY_HEADER,
      ...additionalHeaders
    }
  };
}
function escapePathDelimiters(segment, escapeEncoded) {
  return segment.replace(new RegExp(`([/#?]${escapeEncoded ? "|%(2f|23|3f|5c)" : ""})`, "gi"), (char) => encodeURIComponent(char));
}
function decodePathParams(pathname) {
  return pathname.split("/").map((segment) => {
    try {
      return escapePathDelimiters(decodeURIComponent(segment), true);
    } catch (e) {
      return segment;
    }
  }).join("/");
}
async function cacheInterceptor(event) {
  if (Boolean(event.headers["next-action"]) || Boolean(event.headers["x-prerender-revalidate"]))
    return event;
  const cookies = event.headers.cookie || "";
  const hasPreviewData = cookies.includes("__prerender_bypass") || cookies.includes("__next_preview_data");
  if (hasPreviewData) {
    debug("Preview mode detected, passing through to handler");
    return event;
  }
  let localizedPath = localizePath(event);
  if (NextConfig.basePath) {
    localizedPath = localizedPath.replace(NextConfig.basePath, "");
  }
  localizedPath = localizedPath.replace(/\/$/, "");
  localizedPath = decodePathParams(localizedPath);
  debug("Checking cache for", localizedPath, PrerenderManifest);
  const isISR = Object.keys(PrerenderManifest?.routes ?? {}).includes(localizedPath ?? "/") || Object.values(PrerenderManifest?.dynamicRoutes ?? {}).some((dr) => new RegExp(dr.routeRegex).test(localizedPath));
  debug("isISR", isISR);
  if (isISR) {
    try {
      const cachedData = await globalThis.incrementalCache.get(localizedPath ?? "/index");
      debug("cached data in interceptor", cachedData);
      if (!cachedData?.value) {
        return event;
      }
      if (cachedData.value?.type === "app" || cachedData.value?.type === "route") {
        const tags = getTagsFromValue(cachedData.value);
        const _hasBeenRevalidated = cachedData.shouldBypassTagCache ? false : await hasBeenRevalidated(localizedPath, tags, cachedData);
        if (_hasBeenRevalidated) {
          return event;
        }
      }
      const host = event.headers.host;
      switch (cachedData?.value?.type) {
        case "app":
        case "page":
          return generateResult(event, localizedPath, cachedData.value, cachedData.lastModified);
        case "redirect": {
          const cacheControl = await computeCacheControl(localizedPath, "", host, cachedData.value.revalidate, cachedData.lastModified);
          return {
            type: "core",
            statusCode: cachedData.value.meta?.status ?? 307,
            body: emptyReadableStream(),
            headers: {
              ...cachedData.value.meta?.headers ?? {},
              ...cacheControl
            },
            isBase64Encoded: false
          };
        }
        case "route": {
          const cacheControl = await computeCacheControl(localizedPath, cachedData.value.body, host, cachedData.value.revalidate, cachedData.lastModified);
          const isBinary = isBinaryContentType(String(cachedData.value.meta?.headers?.["content-type"]));
          return {
            type: "core",
            statusCode: event.rewriteStatusCode ?? cachedData.value.meta?.status ?? 200,
            body: toReadableStream(cachedData.value.body, isBinary),
            headers: {
              ...cacheControl,
              ...cachedData.value.meta?.headers,
              vary: VARY_HEADER
            },
            isBase64Encoded: isBinary
          };
        }
        default:
          return event;
      }
    } catch (e) {
      debug("Error while fetching cache", e);
      return event;
    }
  }
  return event;
}

// node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path3 = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  var isSafe = function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  };
  var safePattern = function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path3 += prefix;
        prefix = "";
      }
      if (path3) {
        result.push(path3);
        path3 = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path3 += value;
      continue;
    }
    if (path3) {
      result.push(path3);
      path3 = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function compile(str, options) {
  return tokensToFunction(parse2(str, options), options);
}
function tokensToFunction(tokens, options) {
  if (options === void 0) {
    options = {};
  }
  var reFlags = flags(options);
  var _a = options.encode, encode = _a === void 0 ? function(x) {
    return x;
  } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
  var matches = tokens.map(function(token) {
    if (typeof token === "object") {
      return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
    }
  });
  return function(data) {
    var path3 = "";
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (typeof token === "string") {
        path3 += token;
        continue;
      }
      var value = data ? data[token.name] : void 0;
      var optional = token.modifier === "?" || token.modifier === "*";
      var repeat = token.modifier === "*" || token.modifier === "+";
      if (Array.isArray(value)) {
        if (!repeat) {
          throw new TypeError('Expected "'.concat(token.name, '" to not repeat, but got an array'));
        }
        if (value.length === 0) {
          if (optional)
            continue;
          throw new TypeError('Expected "'.concat(token.name, '" to not be empty'));
        }
        for (var j = 0; j < value.length; j++) {
          var segment = encode(value[j], token);
          if (validate && !matches[i].test(segment)) {
            throw new TypeError('Expected all "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
          }
          path3 += token.prefix + segment + token.suffix;
        }
        continue;
      }
      if (typeof value === "string" || typeof value === "number") {
        var segment = encode(String(value), token);
        if (validate && !matches[i].test(segment)) {
          throw new TypeError('Expected "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
        }
        path3 += token.prefix + segment + token.suffix;
        continue;
      }
      if (optional)
        continue;
      var typeOfMessage = repeat ? "an array" : "a string";
      throw new TypeError('Expected "'.concat(token.name, '" to be ').concat(typeOfMessage));
    }
    return path3;
  };
}
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path3 = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path: path3, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path3, keys) {
  if (!keys)
    return path3;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path3.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path3.source);
  }
  return path3;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path3) {
    return pathToRegexp(path3, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path3, keys, options) {
  return tokensToRegexp(parse2(path3, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path3, keys, options) {
  if (path3 instanceof RegExp)
    return regexpToRegexp(path3, keys);
  if (Array.isArray(path3))
    return arrayToRegexp(path3, keys, options);
  return stringToRegexp(path3, keys, options);
}

// node_modules/@opennextjs/aws/dist/utils/normalize-path.js
import path2 from "node:path";
function normalizeRepeatedSlashes(url) {
  const urlNoQuery = url.host + url.pathname;
  return `${url.protocol}//${urlNoQuery.replace(/\\/g, "/").replace(/\/\/+/g, "/")}${url.search}`;
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/routeMatcher.js
var optionalLocalePrefixRegex = `^/(?:${RoutesManifest.locales.map((locale) => `${locale}/?`).join("|")})?`;
var optionalBasepathPrefixRegex = RoutesManifest.basePath ? `^${RoutesManifest.basePath}/?` : "^/";
var optionalPrefix = optionalLocalePrefixRegex.replace("^/", optionalBasepathPrefixRegex);
function routeMatcher(routeDefinitions) {
  const regexp = routeDefinitions.map((route) => ({
    page: route.page,
    regexp: new RegExp(route.regex.replace("^/", optionalPrefix))
  }));
  const appPathsSet = /* @__PURE__ */ new Set();
  const routePathsSet = /* @__PURE__ */ new Set();
  for (const [k, v] of Object.entries(AppPathRoutesManifest)) {
    if (k.endsWith("page")) {
      appPathsSet.add(v);
    } else if (k.endsWith("route")) {
      routePathsSet.add(v);
    }
  }
  return function matchRoute(path3) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path3));
    return foundRoutes.map((foundRoute) => {
      let routeType = "page";
      if (appPathsSet.has(foundRoute.page)) {
        routeType = "app";
      } else if (routePathsSet.has(foundRoute.page)) {
        routeType = "route";
      }
      return {
        route: foundRoute.page,
        type: routeType
      };
    });
  };
}
var staticRouteMatcher = routeMatcher([
  ...RoutesManifest.routes.static,
  ...getStaticAPIRoutes()
]);
var dynamicRouteMatcher = routeMatcher(RoutesManifest.routes.dynamic);
function getStaticAPIRoutes() {
  const createRouteDefinition = (route) => ({
    page: route,
    regex: `^${route}(?:/)?$`
  });
  const dynamicRoutePages = new Set(RoutesManifest.routes.dynamic.map(({ page }) => page));
  const pagesStaticAPIRoutes = Object.keys(PagesManifest).filter((route) => route.startsWith("/api/") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  const appPathsStaticAPIRoutes = Object.values(AppPathRoutesManifest).filter((route) => (route.startsWith("/api/") || route === "/api") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  return [...pagesStaticAPIRoutes, ...appPathsStaticAPIRoutes];
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
var routeHasMatcher = (headers, cookies, query) => (redirect) => {
  switch (redirect.type) {
    case "header":
      return !!headers?.[redirect.key.toLowerCase()] && new RegExp(redirect.value ?? "").test(headers[redirect.key.toLowerCase()] ?? "");
    case "cookie":
      return !!cookies?.[redirect.key] && new RegExp(redirect.value ?? "").test(cookies[redirect.key] ?? "");
    case "query":
      return query[redirect.key] && Array.isArray(redirect.value) ? redirect.value.reduce((prev, current) => prev || new RegExp(current).test(query[redirect.key]), false) : new RegExp(redirect.value ?? "").test(query[redirect.key] ?? "");
    case "host":
      return headers?.host !== "" && new RegExp(redirect.value ?? "").test(headers.host);
    default:
      return false;
  }
};
function checkHas(matcher, has, inverted = false) {
  return has ? has.reduce((acc, cur) => {
    if (acc === false)
      return false;
    return inverted ? !matcher(cur) : matcher(cur);
  }, true) : true;
}
var getParamsFromSource = (source) => (value) => {
  debug("value", value);
  const _match = source(value);
  return _match ? _match.params : {};
};
var computeParamHas = (headers, cookies, query) => (has) => {
  if (!has.value)
    return {};
  const matcher = new RegExp(`^${has.value}$`);
  const fromSource = (value) => {
    const matches = value.match(matcher);
    return matches?.groups ?? {};
  };
  switch (has.type) {
    case "header":
      return fromSource(headers[has.key.toLowerCase()] ?? "");
    case "cookie":
      return fromSource(cookies[has.key] ?? "");
    case "query":
      return Array.isArray(query[has.key]) ? fromSource(query[has.key].join(",")) : fromSource(query[has.key] ?? "");
    case "host":
      return fromSource(headers.host ?? "");
  }
};
function convertMatch(match2, toDestination, destination) {
  if (!match2) {
    return destination;
  }
  const { params } = match2;
  const isUsingParams = Object.keys(params).length > 0;
  return isUsingParams ? toDestination(params) : destination;
}
function getNextConfigHeaders(event, configHeaders) {
  if (!configHeaders) {
    return {};
  }
  const matcher = routeHasMatcher(event.headers, event.cookies, event.query);
  const requestHeaders = {};
  const localizedRawPath = localizePath(event);
  for (const { headers, has, missing, regex, source, locale } of configHeaders) {
    const path3 = locale === false ? event.rawPath : localizedRawPath;
    if (new RegExp(regex).test(path3) && checkHas(matcher, has) && checkHas(matcher, missing, true)) {
      const fromSource = match(source);
      const _match = fromSource(path3);
      headers.forEach((h) => {
        try {
          const key = convertMatch(_match, compile(h.key), h.key);
          const value = convertMatch(_match, compile(h.value), h.value);
          requestHeaders[key] = value;
        } catch {
          debug(`Error matching header ${h.key} with value ${h.value}`);
          requestHeaders[h.key] = h.value;
        }
      });
    }
  }
  return requestHeaders;
}
function handleRewrites(event, rewrites) {
  const { rawPath, headers, query, cookies, url } = event;
  const localizedRawPath = localizePath(event);
  const matcher = routeHasMatcher(headers, cookies, query);
  const computeHas = computeParamHas(headers, cookies, query);
  const rewrite = rewrites.find((route) => {
    const path3 = route.locale === false ? rawPath : localizedRawPath;
    return new RegExp(route.regex).test(path3) && checkHas(matcher, route.has) && checkHas(matcher, route.missing, true);
  });
  let finalQuery = query;
  let rewrittenUrl = url;
  const isExternalRewrite = isExternal(rewrite?.destination);
  debug("isExternalRewrite", isExternalRewrite);
  if (rewrite) {
    const { pathname, protocol, hostname, queryString } = getUrlParts(rewrite.destination, isExternalRewrite);
    const pathToUse = rewrite.locale === false ? rawPath : localizedRawPath;
    debug("urlParts", { pathname, protocol, hostname, queryString });
    const toDestinationPath = compile(escapeRegex(pathname, { isPath: true }));
    const toDestinationHost = compile(escapeRegex(hostname));
    const toDestinationQuery = compile(escapeRegex(queryString));
    const params = {
      // params for the source
      ...getParamsFromSource(match(escapeRegex(rewrite.source, { isPath: true })))(pathToUse),
      // params for the has
      ...rewrite.has?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {}),
      // params for the missing
      ...rewrite.missing?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {})
    };
    const isUsingParams = Object.keys(params).length > 0;
    let rewrittenQuery = queryString;
    let rewrittenHost = hostname;
    let rewrittenPath = pathname;
    if (isUsingParams) {
      rewrittenPath = unescapeRegex(toDestinationPath(params));
      rewrittenHost = unescapeRegex(toDestinationHost(params));
      rewrittenQuery = unescapeRegex(toDestinationQuery(params));
    }
    if (NextConfig.i18n && !isExternalRewrite) {
      const strippedPathLocale = rewrittenPath.replace(new RegExp(`^/(${NextConfig.i18n.locales.join("|")})`), "");
      if (strippedPathLocale.startsWith("/api/")) {
        rewrittenPath = strippedPathLocale;
      }
    }
    rewrittenUrl = isExternalRewrite ? `${protocol}//${rewrittenHost}${rewrittenPath}` : new URL(rewrittenPath, event.url).href;
    finalQuery = {
      ...query,
      ...convertFromQueryString(rewrittenQuery)
    };
    rewrittenUrl += convertToQueryString(finalQuery);
    debug("rewrittenUrl", { rewrittenUrl, finalQuery, isUsingParams });
  }
  return {
    internalEvent: {
      ...event,
      query: finalQuery,
      rawPath: new URL(rewrittenUrl).pathname,
      url: rewrittenUrl
    },
    __rewrite: rewrite,
    isExternalRewrite
  };
}
function handleRepeatedSlashRedirect(event) {
  if (event.rawPath.match(/(\\|\/\/)/)) {
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: normalizeRepeatedSlashes(new URL(event.url))
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}
function handleTrailingSlashRedirect(event) {
  const url = new URL(event.rawPath, "http://localhost");
  if (
    // Someone is trying to redirect to a different origin, let's not do that
    url.host !== "localhost" || NextConfig.skipTrailingSlashRedirect || // We should not apply trailing slash redirect to API routes
    event.rawPath.startsWith("/api/")
  ) {
    return false;
  }
  const emptyBody = emptyReadableStream();
  if (NextConfig.trailingSlash && !event.headers["x-nextjs-data"] && !event.rawPath.endsWith("/") && !event.rawPath.match(/[\w-]+\.[\w]+$/g)) {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0]}/${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  if (!NextConfig.trailingSlash && event.rawPath.endsWith("/") && event.rawPath !== "/") {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0].replace(/\/$/, "")}${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  return false;
}
function handleRedirects(event, redirects) {
  const repeatedSlashRedirect = handleRepeatedSlashRedirect(event);
  if (repeatedSlashRedirect)
    return repeatedSlashRedirect;
  const trailingSlashRedirect = handleTrailingSlashRedirect(event);
  if (trailingSlashRedirect)
    return trailingSlashRedirect;
  const localeRedirect = handleLocaleRedirect(event);
  if (localeRedirect)
    return localeRedirect;
  const { internalEvent, __rewrite } = handleRewrites(event, redirects.filter((r) => !r.internal));
  if (__rewrite && !__rewrite.internal) {
    return {
      type: event.type,
      statusCode: __rewrite.statusCode ?? 308,
      headers: {
        Location: internalEvent.url
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
}
function fixDataPage(internalEvent, buildId) {
  const { rawPath, query } = internalEvent;
  const basePath = NextConfig.basePath ?? "";
  const dataPattern = `${basePath}/_next/data/${buildId}`;
  if (rawPath.startsWith("/_next/data") && !rawPath.startsWith(dataPattern)) {
    return {
      type: internalEvent.type,
      statusCode: 404,
      body: toReadableStream("{}"),
      headers: {
        "Content-Type": "application/json"
      },
      isBase64Encoded: false
    };
  }
  if (rawPath.startsWith(dataPattern) && rawPath.endsWith(".json")) {
    const newPath = `${basePath}${rawPath.slice(dataPattern.length, -".json".length).replace(/^\/index$/, "/")}`;
    query.__nextDataReq = "1";
    return {
      ...internalEvent,
      rawPath: newPath,
      query,
      url: new URL(`${newPath}${convertToQueryString(query)}`, internalEvent.url).href
    };
  }
  return internalEvent;
}
function handleFallbackFalse(internalEvent, prerenderManifest) {
  const { rawPath } = internalEvent;
  const { dynamicRoutes = {}, routes = {} } = prerenderManifest ?? {};
  const prerenderedFallbackRoutes = Object.entries(dynamicRoutes).filter(([, { fallback }]) => fallback === false);
  const routeFallback = prerenderedFallbackRoutes.some(([, { routeRegex }]) => {
    const routeRegexExp = new RegExp(routeRegex);
    return routeRegexExp.test(rawPath);
  });
  const locales = NextConfig.i18n?.locales;
  const routesAlreadyHaveLocale = locales?.includes(rawPath.split("/")[1]) || // If we don't use locales, we don't need to add the default locale
  locales === void 0;
  let localizedPath = routesAlreadyHaveLocale ? rawPath : `/${NextConfig.i18n?.defaultLocale}${rawPath}`;
  if (
    // Not if localizedPath is "/" tho, because that would not make it find `isPregenerated` below since it would be try to match an empty string.
    localizedPath !== "/" && NextConfig.trailingSlash && localizedPath.endsWith("/")
  ) {
    localizedPath = localizedPath.slice(0, -1);
  }
  const matchedStaticRoute = staticRouteMatcher(localizedPath);
  const prerenderedFallbackRoutesName = prerenderedFallbackRoutes.map(([name]) => name);
  const matchedDynamicRoute = dynamicRouteMatcher(localizedPath).filter(({ route }) => !prerenderedFallbackRoutesName.includes(route));
  const isPregenerated = Object.keys(routes).includes(localizedPath);
  if (routeFallback && !isPregenerated && matchedStaticRoute.length === 0 && matchedDynamicRoute.length === 0) {
    return {
      event: {
        ...internalEvent,
        rawPath: "/404",
        url: constructNextUrl(internalEvent.url, "/404"),
        headers: {
          ...internalEvent.headers,
          "x-invoke-status": "404"
        }
      },
      isISR: false
    };
  }
  return {
    event: internalEvent,
    isISR: routeFallback || isPregenerated
  };
}

// node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
init_utils();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);
var REDIRECTS = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function defaultMiddlewareLoader() {
  return Promise.resolve().then(() => (init_edgeFunctionHandler(), edgeFunctionHandler_exports));
}
async function handleMiddleware(internalEvent, initialSearch, middlewareLoader = defaultMiddlewareLoader) {
  const headers = internalEvent.headers;
  if (headers["x-isr"] && headers["x-prerender-revalidate"] === PrerenderManifest?.preview?.previewModeId)
    return internalEvent;
  const normalizedPath = localizePath(internalEvent);
  const hasMatch = middleMatch.some((r) => r.test(normalizedPath));
  if (!hasMatch)
    return internalEvent;
  const initialUrl = new URL(normalizedPath, internalEvent.url);
  initialUrl.search = initialSearch;
  const url = initialUrl.href;
  const middleware = await middlewareLoader();
  const result = await middleware.default({
    // `geo` is pre Next 15.
    geo: {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: decodeURIComponent(headers["x-open-next-city"]),
      country: headers["x-open-next-country"],
      region: headers["x-open-next-region"],
      latitude: headers["x-open-next-latitude"],
      longitude: headers["x-open-next-longitude"]
    },
    headers,
    method: internalEvent.method || "GET",
    nextConfig: {
      basePath: NextConfig.basePath,
      i18n: NextConfig.i18n,
      trailingSlash: NextConfig.trailingSlash
    },
    url,
    body: convertBodyToReadableStream(internalEvent.method, internalEvent.body)
  });
  const statusCode = result.status;
  const responseHeaders = result.headers;
  const reqHeaders = {};
  const resHeaders = {};
  const filteredHeaders = [
    "x-middleware-override-headers",
    "x-middleware-next",
    "x-middleware-rewrite",
    // We need to drop `content-encoding` because it will be decoded
    "content-encoding"
  ];
  const xMiddlewareKey = "x-middleware-request-";
  responseHeaders.forEach((value, key) => {
    if (key.startsWith(xMiddlewareKey)) {
      const k = key.substring(xMiddlewareKey.length);
      reqHeaders[k] = value;
    } else {
      if (filteredHeaders.includes(key.toLowerCase()))
        return;
      if (key.toLowerCase() === "set-cookie") {
        resHeaders[key] = resHeaders[key] ? [...resHeaders[key], value] : [value];
      } else if (REDIRECTS.has(statusCode) && key.toLowerCase() === "location") {
        resHeaders[key] = normalizeLocationHeader(value, internalEvent.url);
      } else {
        resHeaders[key] = value;
      }
    }
  });
  const rewriteUrl = responseHeaders.get("x-middleware-rewrite");
  let isExternalRewrite = false;
  let middlewareQuery = internalEvent.query;
  let newUrl = internalEvent.url;
  if (rewriteUrl) {
    newUrl = rewriteUrl;
    if (isExternal(newUrl, internalEvent.headers.host)) {
      isExternalRewrite = true;
    } else {
      const rewriteUrlObject = new URL(rewriteUrl);
      middlewareQuery = getQueryFromSearchParams(rewriteUrlObject.searchParams);
      if ("__nextDataReq" in internalEvent.query) {
        middlewareQuery.__nextDataReq = internalEvent.query.__nextDataReq;
      }
    }
  }
  if (!rewriteUrl && !responseHeaders.get("x-middleware-next")) {
    const body = result.body ?? emptyReadableStream();
    return {
      type: internalEvent.type,
      statusCode,
      headers: resHeaders,
      body,
      isBase64Encoded: false
    };
  }
  return {
    responseHeaders: resHeaders,
    url: newUrl,
    rawPath: new URL(newUrl).pathname,
    type: internalEvent.type,
    headers: { ...internalEvent.headers, ...reqHeaders },
    body: internalEvent.body,
    method: internalEvent.method,
    query: middlewareQuery,
    cookies: internalEvent.cookies,
    remoteAddress: internalEvent.remoteAddress,
    isExternalRewrite,
    rewriteStatusCode: rewriteUrl && !isExternalRewrite ? statusCode : void 0
  };
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var INTERNAL_HEADER_REWRITE_STATUS_CODE = `${INTERNAL_HEADER_PREFIX}rewrite-status-code`;
var INTERNAL_EVENT_REQUEST_ID = `${INTERNAL_HEADER_PREFIX}request-id`;
var geoHeaderToNextHeader = {
  "x-open-next-city": "x-vercel-ip-city",
  "x-open-next-country": "x-vercel-ip-country",
  "x-open-next-region": "x-vercel-ip-country-region",
  "x-open-next-latitude": "x-vercel-ip-latitude",
  "x-open-next-longitude": "x-vercel-ip-longitude"
};
function applyMiddlewareHeaders(eventOrResult, middlewareHeaders) {
  const isResult = isInternalResult(eventOrResult);
  const headers = eventOrResult.headers;
  const keyPrefix = isResult ? "" : MIDDLEWARE_HEADER_PREFIX;
  Object.entries(middlewareHeaders).forEach(([key, value]) => {
    if (value) {
      headers[keyPrefix + key] = Array.isArray(value) ? value.join(",") : value;
    }
  });
}
async function routingHandler(event, { assetResolver }) {
  try {
    for (const [openNextGeoName, nextGeoName] of Object.entries(geoHeaderToNextHeader)) {
      const value = event.headers[openNextGeoName];
      if (value) {
        event.headers[nextGeoName] = value;
      }
    }
    for (const key of Object.keys(event.headers)) {
      if (key.startsWith(INTERNAL_HEADER_PREFIX) || key.startsWith(MIDDLEWARE_HEADER_PREFIX)) {
        delete event.headers[key];
      }
    }
    let headers = getNextConfigHeaders(event, ConfigHeaders);
    let eventOrResult = fixDataPage(event, BuildId);
    if (isInternalResult(eventOrResult)) {
      return eventOrResult;
    }
    const redirect = handleRedirects(eventOrResult, RoutesManifest.redirects);
    if (redirect) {
      redirect.headers.Location = normalizeLocationHeader(redirect.headers.Location, event.url, true);
      debug("redirect", redirect);
      return redirect;
    }
    const middlewareEventOrResult = await handleMiddleware(
      eventOrResult,
      // We need to pass the initial search without any decoding
      // TODO: we'd need to refactor InternalEvent to include the initial querystring directly
      // Should be done in another PR because it is a breaking change
      new URL(event.url).search
    );
    if (isInternalResult(middlewareEventOrResult)) {
      return middlewareEventOrResult;
    }
    const middlewareHeadersPrioritized = globalThis.openNextConfig.dangerous?.middlewareHeadersOverrideNextConfigHeaders ?? false;
    if (middlewareHeadersPrioritized) {
      headers = {
        ...headers,
        ...middlewareEventOrResult.responseHeaders
      };
    } else {
      headers = {
        ...middlewareEventOrResult.responseHeaders,
        ...headers
      };
    }
    let isExternalRewrite = middlewareEventOrResult.isExternalRewrite ?? false;
    eventOrResult = middlewareEventOrResult;
    if (!isExternalRewrite) {
      const beforeRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.beforeFiles);
      eventOrResult = beforeRewrite.internalEvent;
      isExternalRewrite = beforeRewrite.isExternalRewrite;
      if (!isExternalRewrite) {
        const assetResult = await assetResolver?.maybeGetAssetResult?.(eventOrResult);
        if (assetResult) {
          applyMiddlewareHeaders(assetResult, headers);
          return assetResult;
        }
      }
    }
    const foundStaticRoute = staticRouteMatcher(eventOrResult.rawPath);
    const isStaticRoute = !isExternalRewrite && foundStaticRoute.length > 0;
    if (!(isStaticRoute || isExternalRewrite)) {
      const afterRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.afterFiles);
      eventOrResult = afterRewrite.internalEvent;
      isExternalRewrite = afterRewrite.isExternalRewrite;
    }
    let isISR = false;
    if (!isExternalRewrite) {
      const fallbackResult = handleFallbackFalse(eventOrResult, PrerenderManifest);
      eventOrResult = fallbackResult.event;
      isISR = fallbackResult.isISR;
    }
    const foundDynamicRoute = dynamicRouteMatcher(eventOrResult.rawPath);
    const isDynamicRoute = !isExternalRewrite && foundDynamicRoute.length > 0;
    if (!(isDynamicRoute || isStaticRoute || isExternalRewrite)) {
      const fallbackRewrites = handleRewrites(eventOrResult, RoutesManifest.rewrites.fallback);
      eventOrResult = fallbackRewrites.internalEvent;
      isExternalRewrite = fallbackRewrites.isExternalRewrite;
    }
    const isNextImageRoute = eventOrResult.rawPath.startsWith("/_next/image");
    const isRouteFoundBeforeAllRewrites = isStaticRoute || isDynamicRoute || isExternalRewrite;
    if (!(isRouteFoundBeforeAllRewrites || isNextImageRoute || // We need to check again once all rewrites have been applied
    staticRouteMatcher(eventOrResult.rawPath).length > 0 || dynamicRouteMatcher(eventOrResult.rawPath).length > 0)) {
      eventOrResult = {
        ...eventOrResult,
        rawPath: "/404",
        url: constructNextUrl(eventOrResult.url, "/404"),
        headers: {
          ...eventOrResult.headers,
          "x-middleware-response-cache-control": "private, no-cache, no-store, max-age=0, must-revalidate"
        }
      };
    }
    if (globalThis.openNextConfig.dangerous?.enableCacheInterception && !isInternalResult(eventOrResult)) {
      debug("Cache interception enabled");
      eventOrResult = await cacheInterceptor(eventOrResult);
      if (isInternalResult(eventOrResult)) {
        applyMiddlewareHeaders(eventOrResult, headers);
        return eventOrResult;
      }
    }
    applyMiddlewareHeaders(eventOrResult, headers);
    const resolvedRoutes = [
      ...foundStaticRoute,
      ...foundDynamicRoute
    ];
    debug("resolvedRoutes", resolvedRoutes);
    return {
      internalEvent: eventOrResult,
      isExternalRewrite,
      origin: false,
      isISR,
      resolvedRoutes,
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(eventOrResult, NextConfig.i18n) : void 0,
      rewriteStatusCode: middlewareEventOrResult.rewriteStatusCode
    };
  } catch (e) {
    error("Error in routingHandler", e);
    return {
      internalEvent: {
        type: "core",
        method: "GET",
        rawPath: "/500",
        url: constructNextUrl(event.url, "/500"),
        headers: {
          ...event.headers
        },
        query: event.query,
        cookies: event.cookies,
        remoteAddress: event.remoteAddress
      },
      isExternalRewrite: false,
      origin: false,
      isISR: false,
      resolvedRoutes: [],
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(event, NextConfig.i18n) : void 0
    };
  }
}
function isInternalResult(eventOrResult) {
  return eventOrResult != null && "statusCode" in eventOrResult;
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
globalThis.internalFetch = fetch;
globalThis.__openNextAls = new AsyncLocalStorage();
var defaultHandler = async (internalEvent, options) => {
  const middlewareConfig = globalThis.openNextConfig.middleware;
  const originResolver = await resolveOriginResolver(middlewareConfig?.originResolver);
  const externalRequestProxy = await resolveProxyRequest(middlewareConfig?.override?.proxyExternalRequest);
  const assetResolver = await resolveAssetResolver(middlewareConfig?.assetResolver);
  const requestId = Math.random().toString(36);
  return runWithOpenNextRequestContext({
    isISRRevalidation: internalEvent.headers["x-isr"] === "1",
    waitUntil: options?.waitUntil,
    requestId
  }, async () => {
    const result = await routingHandler(internalEvent, { assetResolver });
    if ("internalEvent" in result) {
      debug("Middleware intercepted event", internalEvent);
      if (!result.isExternalRewrite) {
        const origin = await originResolver.resolve(result.internalEvent.rawPath);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_HEADER_INITIAL_URL]: internalEvent.url,
              [INTERNAL_HEADER_RESOLVED_ROUTES]: JSON.stringify(result.resolvedRoutes),
              [INTERNAL_EVENT_REQUEST_ID]: requestId,
              [INTERNAL_HEADER_REWRITE_STATUS_CODE]: String(result.rewriteStatusCode)
            }
          },
          isExternalRewrite: result.isExternalRewrite,
          origin,
          isISR: result.isISR,
          initialURL: result.initialURL,
          resolvedRoutes: result.resolvedRoutes
        };
      }
      try {
        return externalRequestProxy.proxy(result.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_EVENT_REQUEST_ID]: requestId
            },
            rawPath: "/500",
            url: constructNextUrl(result.internalEvent.url, "/500"),
            method: "GET"
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          origin: false,
          isISR: result.isISR,
          initialURL: result.internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    if (process.env.OPEN_NEXT_REQUEST_ID_HEADER || globalThis.openNextDebug) {
      result.headers[INTERNAL_EVENT_REQUEST_ID] = requestId;
    }
    debug("Middleware response", result);
    return result;
  });
};
var handler2 = await createGenericHandler({
  handler: defaultHandler,
  type: "middleware"
});
var middleware_default = {
  fetch: handler2
};
export {
  middleware_default as default,
  handler2 as handler
};
