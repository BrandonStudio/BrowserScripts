export {};

declare global {
    // https://www.tampermonkey.net/documentation.php#api:GM_registerMenuCommand
    function GM_registerMenuCommand(name: string, callback: Function, accessKey?: string, options?: {
        id?: string;
        accessKey?: string;
        autoClose?: boolean;
        title?: string;
    }): void;
}
