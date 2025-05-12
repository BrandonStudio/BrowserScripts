export interface MenuCommandCallback {
    /** @deprecated use before 4.14*/
    (tab: Tab): void;
    (event: MouseEvent | KeyboardEvent): void;
}

type Tab = {
    id: number;
    index: number;
    windowId: number;
    highlighted: boolean;
    active: boolean;
    pinned: boolean;
    status: string;
    url: string;
    title: string;
}

export interface XMLHttpRequestParams {
    method: string;
    url: string;
    headers?: Record<string, string>;
    data?: string | Document | Blob | ArrayBufferView | FormData;
    binary?: boolean;
    timeout?: number;
    context?: any;
    responseType?: "arraybuffer" | "blob" | "json" | "document";
    overrideMimeType?: string;
    anonymous?: boolean;
    fetch?: boolean;
    user?: string;
    password?: string;
    onabort?: (response: XMLHttpResponse) => void;
    onerror?: (response: XMLHttpResponse) => void;
    onloadstart?: (response: XMLHttpResponse) => void;
    onprogress?: (response: XMLHttpResponse) => void;
    onreadystatechange?: (response: XMLHttpResponse) => void;
    ontimeout?: (response: XMLHttpResponse) => void;
    onload?: (response: XMLHttpResponse) => void;
}

export interface XMLHttpResponse {
    finalUrl: string;
    readyState: number;
    status: number;
    statusText: string;
    responseHeaders: string;
    response: any;
    responseXML: Document | null;
    responseText: string;
}

declare global {
    /**
     * @description `GM_registerMenuCommand` allows userscripts to add a new entry to the userscript's menu in the browser, and specify a function to be called when the menu item is selected. Menu items created from different frames are merged into a single menu entry if name, title and accessKey are the same.
     * @param name A string containing the text to display for the menu item.
     * @param callback A function to be called when the menu item is selected. The function will be passed a single parameter, which is the currently active tab. As of Tampermonkey 4.14 a MouseEvent or KeyboardEvent is passed as function argument.
     * @param accessKey An optional access key. Please see the description below. Either `options` or `accessKey` can be specified.
     * @returns A menu entry ID that can be used to unregister the command.
     * @see https://www.tampermonkey.net/documentation.php#api:GM_registerMenuCommand
     */
    function GM_registerMenuCommand(name: string, callback: MenuCommandCallback, accessKey?: string): number;

    /**
     * @description `GM_registerMenuCommand` allows userscripts to add a new entry to the userscript's menu in the browser, and specify a function to be called when the menu item is selected. Menu items created from different frames are merged into a single menu entry if name, title and accessKey are the same.
     * @param name A string containing the text to display for the menu item.
     * @param callback A function to be called when the menu item is selected. The function will be passed a single parameter, which is the currently active tab. As of Tampermonkey 4.14 a MouseEvent or KeyboardEvent is passed as function argument.
     * @param options (v4.20+) Optional options that can be used to customize the menu item. The options are specified as an object with the following properties:
     *   - id (v5.0+): An optional number that was returned by a previous `GM_registerMenuCommand` call. If specified, the according menu item will be updated with the new options. If not specified or the menu item can't be found, a new menu item will be created.
     *   - accessKey: An optional access key for the menu item. This can be used to create a shortcut for the menu item. For example, if the access key is "s", the user can select the menu item by pressing "s" when Tampermonkey's popup-menu is open. Please note that there are browser-wide shortcuts configurable to open Tampermonkey's popup-menu. (`chrome://extensions/shortcuts` in Chrome, `about:addons` + "Manage Extension Shortcuts" in Firefox)
     *   - autoClose: An optional boolean parameter that specifies whether the popup menu should be closed after the menu item is clicked. The default value is `true`. Please note that this setting has no effect on the menu command section that is added to the page's context menu.
     *   - title (v5.0+): An optional string that specifies the title of the menu item. This is displayed as a tooltip when the user hovers the mouse over the menu item.
     * @returns A menu entry ID that can be used to unregister the command.
     * @see https://www.tampermonkey.net/documentation.php#api:GM_registerMenuCommand
     */
    function GM_registerMenuCommand(name: string, callback: MenuCommandCallback, options?:  {
        id?: number | string;
        accessKey?: string;
        autoClose?: boolean;
        title?: string;
    }): number;

    /**
     * @description `GM_xmlhttpRequest` allows userscripts to make arbitrary HTTP requests to any URL, regardless of cross-domain/cross-origin restrictions. It is similar to the standard XMLHttpRequest API, but with some additional features, and some differences in behavior.
     * @param details An object containing the details of the request. Must contain at least the method and url properties.
     * @returns An object with an abort() method, used to cancel the request.
     * @see https://www.tampermonkey.net/documentation.php#api:GM_xmlhttpRequest
     */
    function GM_xmlhttpRequest(details: XMLHttpRequestParams): { abort: () => void };

    /**
     * @description `GM_getValue` allows userscripts to access values that were previously set using `GM_setValue`. Values can be of any type that can be serialized to JSON (strings, numbers, booleans, arrays, objects), as well as undefined.
     * @param name The name of the value to retrieve.
     * @param defaultValue The value to return if the named value is not found.
     * @returns The value previously set using GM_setValue, or defaultValue if the named value is not found.
     * @see https://www.tampermonkey.net/documentation.php#api:GM_getValue
     */
    function GM_getValue<T>(name: string, defaultValue?: T): T | undefined;

    /**
     * @description `GM_setValue` allows userscripts to store values that can be retrieved later using `GM_getValue`. Values can be of any type that can be serialized to JSON (strings, numbers, booleans, arrays, objects), as well as undefined.
     * @param name The name of the value to set.
     * @param value The value to set. Can be any type that can be serialized to JSON.
     * @see https://www.tampermonkey.net/documentation.php#api:GM_setValue
     */
    function GM_setValue<T>(name: string, value: T): void;

    /**
     * @description `GM_addStyle` allows userscripts to add CSS styles to the document. The added styles will be active for the entire page, and will be automatically removed when the page is unloaded.
     * @param css The CSS to add to the document.
     * @returns A style object that can be used to later remove the styles.
     * @see https://www.tampermonkey.net/documentation.php#api:GM_addStyle
     */
    function GM_addStyle(css: string): HTMLStyleElement;

    interface GM {
        /**
         * @description `GM_xmlhttpRequest` allows userscripts to make arbitrary HTTP requests to any URL, regardless of cross-domain/cross-origin restrictions. It is similar to the standard XMLHttpRequest API, but with some additional features, and some differences in behavior.
         * @param details An object containing the details of the request. Must contain at least the method and url properties.
         * @returns A promise that resolves with an object containing the response data.
         * @see https://www.tampermonkey.net/documentation.php#api:GM_xmlhttpRequest
         */
        xmlhttpRequest(details: XMLHttpRequestParams): Promise<XMLHttpResponse & {
            abort: () => void;
        }>;
    }
}
