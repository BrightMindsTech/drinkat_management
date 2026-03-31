declare const _default: {
    name: string;
    mode: "nextMode";
    getLastRevalidated: (tags: string[]) => Promise<number>;
    hasBeenRevalidated: (tags: string[], lastModified?: number) => Promise<boolean>;
    writeTags: (tags: string[]) => Promise<void>;
};
export default _default;
