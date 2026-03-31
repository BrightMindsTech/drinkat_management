import logger from "../logger.js";
export function safeParseJsonFile(input, filePath, fallback) {
    try {
        return JSON.parse(input);
    }
    catch (err) {
        logger.warn(`Failed to parse JSON file "${filePath}". Error: ${err.message}`);
        return fallback;
    }
}
