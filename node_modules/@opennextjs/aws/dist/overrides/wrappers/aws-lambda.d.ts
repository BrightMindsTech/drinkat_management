import type { WrapperHandler } from "../../types/overrides";
import type { WarmerEvent, WarmerResponse } from "../../adapters/warmer-function";
export declare function formatWarmerResponse(event: WarmerEvent): Promise<WarmerResponse>;
declare const _default: {
    wrapper: WrapperHandler;
    name: string;
    supportStreaming: boolean;
};
export default _default;
