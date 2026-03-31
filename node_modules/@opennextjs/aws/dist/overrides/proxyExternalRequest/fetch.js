import { emptyReadableStream } from "../../utils/stream";
const fetchProxy = {
    name: "fetch-proxy",
    // @ts-ignore
    proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
            method,
            headers,
            body: body,
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
            body: response.body ?? emptyReadableStream(),
        };
    },
};
export default fetchProxy;
