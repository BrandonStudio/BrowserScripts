// ==UserScript==
// @name         Dump Page
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Dump HTML Page
// @homepage     https://github.com/BrandonStudio/BrowserScripts/
// @author       Brandon Studio
// @downloadURL  https://github.com/BrandonStudio/BrowserScripts/raw/refs/heads/main/dump_page.user.js
// @updateURL    https://github.com/BrandonStudio/BrowserScripts/raw/refs/heads/main/dump_page.user.js
// @match        <all_urls>
// @include      *
// @grant        GM_registerMenuCommand
// ==/UserScript==

/// <reference path="./types.d.ts" />

// 这个脚本将外部资源转换为base64并使所有链接转为绝对路径，不改变当前页面
(function() {
    'use strict';
    // 克隆当前页面DOM，避免修改当前页面
    const originalDoc = document.cloneNode(true);

    /**
     * @param {string} url
     */
    async function fetchWithFallback(url) {
        /** @type {Response} */
        let response;
        try {
            response = await fetch(url, { mode: 'cors' });
        } catch (error) {
            console.warn('Failed to fetch with cors, try without cors', error);
            response = await fetch(url, { mode: 'no-cors' });
        }
        return response
    }

    // 函数：将图片/资源转为base64
    async function resourceToBase64(url) {
        try {
            const response = await fetchWithFallback(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Failed to convert resource to base64:', error);
            return url; // 转换失败时返回原始URL
        }
    }

    // 将所有URL转为绝对URL（在克隆的文档上操作）
    /**
     * 
     * @param {Element} doc 
     */
    async function makeUrlsAbsolute(doc) {
        // 转换所有href属性为绝对URL，但保留纯页内书签链接的原始形式
        doc.querySelectorAll('[href]').forEach(el => {
            try {
                const hrefValue = el.getAttribute('href');

                // 如果是纯页内书签链接（以#开头），保留原始形式
                if (hrefValue && hrefValue.startsWith('#')) {
                    return;
                }
                el.href = new URL(hrefValue, document.baseURI).href;
            } catch (e) {
                console.error('Error converting href to absolute URL:', e);
            }
        });

        // 转换所有src属性为绝对URL
        doc.querySelectorAll('[src]').forEach(el => {
            try {
                const srcValue = el.getAttribute('src');
                if (srcValue) {
                    el.src = new URL(srcValue, document.baseURI).href;
                }
            } catch (e) {
                console.error('Error converting src to absolute URL:', e);
            }
        });
    }

    // 处理CSS中的所有URL引用
    /**
     * 
     * @param {string} cssText 
     * @param {string} baseUrl 
     */
    async function processCssUrls(cssText, baseUrl) {
        // 匹配所有CSS中的url()
        const urlRegex = /url\(['"]?([^'"()]+)['"]?\)/g;
        let match;
        let processedCss = cssText;
        const promises = [];

        // 收集所有需要处理的URL
        while ((match = urlRegex.exec(cssText)) !== null) {
            const fullMatch = match[0];
            const url = match[1];

            // 如果不是data:URL
            if (!url.startsWith('data:')) {
                try {
                    const absoluteUrl = new URL(url, baseUrl).href;
                    promises.push(
                        resourceToBase64(absoluteUrl).then(base64Url => {
                            processedCss = processedCss.replace(fullMatch, `url(${base64Url})`);
                        })
                    );
                } catch (e) {
                    console.error('Error processing CSS URL:', e);
                }
            }
        }

        await Promise.all(promises);
        return processedCss;
    }

    // 处理所有外部资源转为base64（在克隆的文档上操作）
    /**
     * 
     * @param {Element} doc 
     */
    async function processExternalResources(doc) {
        // 处理图片
        const imgPromises = Array.from(doc.querySelectorAll('img[src]')).map(async img => {
            if (!img.src.startsWith('data:')) {
                try {
                    img.src = await resourceToBase64(img.src);
                } catch (e) {
                    console.error('Error processing image:', e);
                }
            }
        });

        // 处理CSS文件
        const linkPromises = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(async link => {
            if (link.href && !link.href.startsWith('data:')) {
                try {
                    let cssText = await (await fetchWithFallback(link.href)).text();

                    // 处理CSS中的所有URL引用
                    cssText = await processCssUrls(cssText, link.href);

                    const newStyle = doc.createElement('style');
                    newStyle.textContent = cssText;
                    if (link.parentNode) {
                        link.parentNode.replaceChild(newStyle, link);
                    }
                } catch (e) {
                    console.error('Error processing CSS:', e);
                }
            }
        });

        // 处理JavaScript文件
        const scriptPromises = Array.from(doc.querySelectorAll('script[src]')).map(async script => {
            if (!script.src.startsWith('data:')) {
                try {
                    const jsText = await (await fetchWithFallback(script.src)).text();
                    const newScript = doc.createElement('script');
                    newScript.textContent = jsText;
                    if (script.parentNode) {
                        script.parentNode.replaceChild(newScript, script);
                    }
                } catch (e) {
                    console.error('Error processing JavaScript:', e);
                }
            }
        });

        // 处理所有内联样式中的URL
        const elementsWithStyle = Array.from(doc.querySelectorAll('[style*="url("]'));
        const stylePromises = elementsWithStyle.map(async element => {
            const style = element.getAttribute('style');
            if (style) {
                const urlRegex = /url\(['"]?([^'"()]+)['"]?\)/g;
                let match;
                let newStyle = style;
                const urlPromises = [];

                while ((match = urlRegex.exec(style)) !== null) {
                    const fullMatch = match[0];
                    const url = match[1];
                    
                    if (!url.startsWith('data:')) {
                        try {
                            const absoluteUrl = new URL(url, document.baseURI).href;
                            urlPromises.push(
                                resourceToBase64(absoluteUrl).then(base64Url => {
                                    newStyle = newStyle.replace(fullMatch, `url(${base64Url})`);
                                })
                            );
                        } catch (e) {
                            console.error('Error processing inline style URL:', e);
                        }
                    }
                }

                await Promise.all(urlPromises);
                element.setAttribute('style', newStyle);
            }
        });

        // 处理内联样式表
        const styleElements = Array.from(doc.querySelectorAll('style'));
        const inlineStylePromises = styleElements.map(async styleEl => {
            try {
                styleEl.textContent = await processCssUrls(styleEl.textContent, document.baseURI);
            } catch (e) {
                console.error('Error processing inline stylesheet:', e);
            }
        });

        // 等待所有转换完成
        await Promise.all([
            ...imgPromises, 
            ...linkPromises, 
            ...scriptPromises, 
            ...stylePromises,
            ...inlineStylePromises
        ]);
    }

    // 主函数
    function createSelfContainedPage() {
        try {
            // 创建用户选择界面
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0,0,0,0.2);
                z-index: 9999;
                font-family: Arial, sans-serif;
            `;

            dialog.innerHTML = `
                <h3 style="margin-top: 0;">选择操作</h3>
                <p>请选择如何查看转换后的页面：</p>
                <button id="openNewTab" style="margin: 5px; padding: 8px 15px;">在新标签页中打开</button>
                <button id="downloadHtml" style="margin: 5px; padding: 8px 15px;">下载HTML文件</button>
                <button id="cancel" style="margin: 5px; padding: 8px 15px;">取消</button>
                <div id="status" style="margin-top: 15px;"></div>
            `;

            document.body.appendChild(dialog);
            
            // 设置状态更新函数
            const updateStatus = (msg) => {
                document.getElementById('status').textContent = msg;
            };

            // 处理取消按钮
            document.getElementById('cancel').addEventListener('click', () => {
                document.body.removeChild(dialog);
            });

            // 处理新标签页按钮
            document.getElementById('openNewTab').addEventListener('click', async () => {
                updateStatus('正在处理页面资源，请稍候...');

                const clonedDoc = originalDoc.cloneNode(true);
                await makeUrlsAbsolute(clonedDoc);
                await processExternalResources(clonedDoc);

                // 创建带有处理后内容的新文档
                const html = clonedDoc.documentElement.outerHTML;
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);

                // 在新标签页中打开
                window.open(url, '_blank');

                // 清理
                setTimeout(() => URL.revokeObjectURL(url), 60000);
                updateStatus('页面已在新标签页中打开');
            });

            // 处理下载按钮
            document.getElementById('downloadHtml').addEventListener('click', async () => {
                updateStatus('正在处理页面资源，请稍候...');

                const clonedDoc = originalDoc.cloneNode(true);
                await makeUrlsAbsolute(clonedDoc);
                await processExternalResources(clonedDoc);

                // 创建带有处理后内容的新文档
                const html = clonedDoc.documentElement.outerHTML;
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);

                // 创建下载链接
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = document.title + '_embedded.html';
                downloadLink.style.display = 'none';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

                // 清理
                setTimeout(() => URL.revokeObjectURL(url), 60000);
                updateStatus('下载已开始');
            });
        } catch (e) {
            console.error('Error creating self-contained page:', e);
            alert('创建自包含页面时出错: ' + e.message);
        }
    }

    // 执行脚本
    if (GM_registerMenuCommand) {
        GM_registerMenuCommand('Dump', createSelfContainedPage);
    } else {
        createSelfContainedPage();
    }
})();
