// 这个脚本将外部资源转换为base64并使所有链接转为绝对路径，不改变当前页面
(function() {
    // 克隆当前页面DOM，避免修改当前页面
    const originalDoc = document.cloneNode(true);
    
    // 函数：将图片转为base64
    async function imageToBase64(imgUrl) {
        try {
            const response = await fetch(imgUrl, { mode: 'cors' });
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Failed to convert image to base64:', error);
            return imgUrl; // 转换失败时返回原始URL
        }
    }

    // 函数：将CSS/JS文件转为base64
    async function fileToBase64(fileUrl, fileType) {
        try {
            const response = await fetch(fileUrl, { mode: 'cors' });
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error(`Failed to convert ${fileType} to base64:`, error);
            return fileUrl; // 转换失败时返回原始URL
        }
    }

    // 将所有URL转为绝对URL（在克隆的文档上操作）
    async function makeUrlsAbsolute(doc) {
        // 转换所有href属性为绝对URL
        doc.querySelectorAll('[href]').forEach(el => {
            try {
                const hrefValue = el.getAttribute('href');
                if (hrefValue && hrefValue.startsWith('#') {
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
                el.src = new URL(el.getAttribute('src'), document.baseURI).href;
            } catch (e) {
                console.error('Error converting src to absolute URL:', e);
            }
        });
    }

    // 处理所有外部资源转为base64（在克隆的文档上操作）
    async function processExternalResources(doc) {
        // 处理图片
        const imgPromises = Array.from(doc.querySelectorAll('img[src]')).map(async img => {
            if (!img.src.startsWith('data:')) {
                try {
                    img.src = await imageToBase64(img.src);
                } catch (e) {
                    console.error('Error processing image:', e);
                }
            }
        });

        // 处理CSS文件
        const linkPromises = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(async link => {
            if (link.href && !link.href.startsWith('data:')) {
                try {
                    const cssText = await (await fetch(link.href)).text();
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
                    const jsText = await (await fetch(script.src)).text();
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

        // 处理样式中的背景图片
        const elementsWithStyle = Array.from(doc.querySelectorAll('[style*="background"]'));
        const stylePromises = elementsWithStyle.map(async element => {
            const style = element.getAttribute('style');
            if (style && style.includes('url(')) {
                const urlMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
                if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
                    try {
                        const imgUrl = new URL(urlMatch[1], document.baseURI).href;
                        const base64Url = await imageToBase64(imgUrl);
                        element.setAttribute('style', style.replace(urlMatch[0], `url(${base64Url})`));
                    } catch (e) {
                        console.error('Error processing background image:', e);
                    }
                }
            }
        });

        // 等待所有转换完成
        await Promise.all([...imgPromises, ...linkPromises, ...scriptPromises, ...stylePromises]);
    }

    // 主函数
    async function createSelfContainedPage() {
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
    createSelfContainedPage();
})();
