import cookieParser from "cookie";
import { extractHostFromHeaders, getQueryFromSearchParams } from "./utils.js";
const converter = {
    convertFrom: async (req) => {
        const body = await new Promise((resolve) => {
            const chunks = [];
            req.on("data", (chunk) => {
                chunks.push(chunk);
            });
            req.on("end", () => {
                resolve(Buffer.concat(chunks));
            });
        });
        const headers = Object.fromEntries(Object.entries(req.headers ?? {})
            .map(([key, value]) => [
            key.toLowerCase(),
            Array.isArray(value) ? value.join(",") : value,
        ])
            .filter(([key]) => key));
        // https://nodejs.org/api/http.html#messageurl
        const url = new URL(`${req.protocol ? req.protocol : "http"}://${extractHostFromHeaders(headers)}${req.url}`);
        const query = getQueryFromSearchParams(url.searchParams);
        const cookieHeader = req.headers.cookie;
        const cookies = cookieHeader
            ? cookieParser.parse(cookieHeader)
            : {};
        return {
            type: "core",
            method: req.method ?? "GET",
            rawPath: url.pathname,
            url: url.href,
            body,
            headers,
            remoteAddress: req.headers["x-forwarded-for"] ??
                req.socket.remoteAddress ??
                "::1",
            query,
            cookies,
        };
    },
    // Nothing to do here, it's streaming
    convertTo: async (internalResult) => ({
        body: internalResult.body,
        headers: internalResult.headers,
        statusCode: internalResult.statusCode,
    }),
    name: "node",
};
export default converter;
