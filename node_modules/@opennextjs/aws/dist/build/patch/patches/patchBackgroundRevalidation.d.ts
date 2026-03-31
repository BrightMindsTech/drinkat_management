export declare const rule = "\nrule:\n  kind: binary_expression\n  all:\n    - has:\n        kind: unary_expression\n        regex: \"!cachedResponse.isStale\"\n    -  has:\n         kind: member_expression\n         regex: \"context.isPrefetch\"\nfix:\n  'true'";
export declare const patchBackgroundRevalidation: {
    name: string;
    patches: {
        versions: ">=14.1.0";
        pathFilter: RegExp;
        patchCode: import("../codePatcher.js").PatchCodeFn;
    }[];
};
