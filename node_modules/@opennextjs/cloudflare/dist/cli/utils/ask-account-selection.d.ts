interface Account {
    id: string;
    name: string;
}
/**
 * Prompts the user to select a Cloudflare account from a list via an interactive CLI prompt.
 *
 * @param accounts - The list of Cloudflare accounts to choose from.
 * @returns The ID of the selected account, or `undefined` if no selection was made.
 */
export declare function askAccountSelection(accounts: Account[]): Promise<string | undefined>;
export {};
