export {};

declare global {
    /**
     * @description `GM_registerMenuCommand` allows userscripts to add a new entry to the userscript's menu in the browser, and specify a function to be called when the menu item is selected. Menu items created from different frames are merged into a single menu entry if name, title and accessKey are the same.
     * @param name A string containing the text to display for the menu item.
     * @param callback A function to be called when the menu item is selected. The function will be passed a single parameter, which is the currently active tab. As of Tampermonkey 4.14 a MouseEvent or KeyboardEvent is passed as function argument.
     * @param accessKey An optional access key. Please see the description below. Either `options` or `accessKey` can be specified.
     * @returns A menu entry ID that can be used to unregister the command.
     * @see https://www.tampermonkey.net/documentation.php#api:GM_registerMenuCommand
     */
    function GM_registerMenuCommand(name: string, callback: Function, accessKey?: string): number;

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
    function GM_registerMenuCommand(name: string, callback: Function, options?:  {
        id?: number | string;
        accessKey?: string;
        autoClose?: boolean;
        title?: string;
    }): number;
}
