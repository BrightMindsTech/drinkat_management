import { readFileSync } from "node:fs";
import { createGenericHandler } from "../core/createGenericHandler.js";
import { resolveTagCache } from "../core/resolve.js";
const PHYSICAL_RESOURCE_ID = "dynamodb-cache";
const tagCache = await resolveTagCache(globalThis.openNextConfig?.initializationFunction?.tagCache);
export const handler = await createGenericHandler({
    handler: defaultHandler,
    type: "initializationFunction",
});
async function defaultHandler(event) {
    switch (event.requestType) {
        case "delete":
            return remove();
        default:
            return insert(event.requestType);
    }
}
async function insert(requestType) {
    // If it is in nextMode, we don't need to do anything
    if (tagCache.mode === "nextMode") {
        return {
            type: "initializationFunction",
            requestType,
            resourceId: PHYSICAL_RESOURCE_ID,
        };
    }
    const file = readFileSync("dynamodb-cache.json", "utf8");
    const data = JSON.parse(file);
    const parsedData = data.map((item) => ({
        tag: item.tag.S,
        path: item.path.S,
        revalidatedAt: Number.parseInt(item.revalidatedAt.N),
    }));
    await tagCache.writeTags(parsedData);
    return {
        type: "initializationFunction",
        requestType,
        resourceId: PHYSICAL_RESOURCE_ID,
    };
}
async function remove() {
    // Do we want to actually delete anything here?
    return {
        type: "initializationFunction",
        requestType: "delete",
        resourceId: PHYSICAL_RESOURCE_ID,
    };
}
