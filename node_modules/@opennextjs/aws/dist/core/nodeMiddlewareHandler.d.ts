import type { RequestData } from "../types/global";
type EdgeRequest = Omit<RequestData, "page">;
export default function middlewareHandler(request: EdgeRequest): Promise<Response>;
export {};
