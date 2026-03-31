export type PublicFiles = {
    files: string[];
};
export declare function build(openNextConfigPath?: string, nodeExternals?: string, allowUnsupportedNextVersion?: boolean): Promise<void>;
