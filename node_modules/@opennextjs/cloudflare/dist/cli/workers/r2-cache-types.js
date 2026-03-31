/**
 * Shared types and error codes for the R2 cache worker and its caller.
 */
/** The R2 bucket binding is not configured in the worker environment. */
export const ERR_BINDING_NOT_FOUND = "ERR_BINDING_NOT_FOUND";
/** The request is missing required cache metadata or body. */
export const ERR_INVALID_REQUEST = "ERR_INVALID_REQUEST";
/** The R2 put operation failed. */
export const ERR_WRITE_FAILED = "ERR_WRITE_FAILED";
