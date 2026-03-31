type LEVEL = "info" | "debug";
declare const _default: {
    setLevel: (level: LEVEL) => LEVEL;
    debug: (...args: any[]) => void;
    info: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    time: {
        (label?: string): void;
        (label?: string): void;
    };
    timeEnd: {
        (label?: string): void;
        (label?: string): void;
    };
};
export default _default;
