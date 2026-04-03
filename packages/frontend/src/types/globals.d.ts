declare global {
    const grecaptcha: {
        execute(siteKey: string, options: { action: string }): Promise<string>;
        ready(callback: () => void): void;
    };

    interface Window {
        API_URL: string;
    }
}

export { };