import fs from "node:fs";
import path from "node:path";
import { NextConfig } from "../../adapters/config/index";
import { getMonorepoRelativePath } from "../../utils/normalize-path";
export default {
    name: "fs-dev",
    load: async (url) => {
        const urlWithoutBasePath = NextConfig.basePath
            ? url.slice(NextConfig.basePath.length)
            : url;
        const imagePath = path.join(getMonorepoRelativePath(), "assets", urlWithoutBasePath);
        const body = fs.createReadStream(imagePath);
        const contentType = url.endsWith(".png") ? "image/png" : "image/jpeg";
        return {
            body,
            contentType,
            cacheControl: "public, max-age=31536000, immutable",
        };
    },
};
