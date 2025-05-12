// ==UserScript==
// @name         GitHub Copilot Chat Sync
// @namespace    https://github.com/BrandonStudio/BrowserScripts/GitHub-Copilot-Sync
// @version      0.2
// @description  同步 GitHub Copilot 聊天记录到WebDAV
// @author       BrandonStudio
// @match        https://github.com/copilot/*
// @include      https://github.com/copilot/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

/// <reference path="./types/tampermonkey.d.ts" />

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .copilot-sync-btn {
            margin-left: 8px;
            padding: 4px 8px;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            background-color: #f6f8fa;
            color: #24292f;
            font-size: 12px;
            cursor: pointer;
        }
        .copilot-sync-btn:hover {
            background-color: #eaeef2;
        }
        .webdav-config-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            width: 400px;
        }
        .webdav-config-modal input {
            width: 100%;
            margin: 8px 0;
            padding: 6px;
            border: 1px solid #d0d7de;
            border-radius: 4px;
        }
        .webdav-config-modal button {
            margin: 8px 8px 0 0;
            padding: 6px 12px;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            background-color: #f6f8fa;
            cursor: pointer;
        }
        .webdav-config-modal button.primary {
            background-color: #2da44e;
            color: white;
            border-color: #2da44e;
        }
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        }
    `);

    // 配置模块
    const CONFIG = {
        API_BASE: 'https://api.individual.githubcopilot.com/github/chat',
    };

    // WebDAV配置UI
    const WebDAVConfigUI = {
        async showConfigDialog() {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const modal = document.createElement('div');
            modal.className = 'webdav-config-modal';
            modal.innerHTML = `
                <h3 style="margin-top:0">WebDAV 配置</h3>
                <div>
                    <input type="text" id="webdav-url" placeholder="WebDAV URL (例如: https://example.com/dav/)" />
                    <input type="text" id="webdav-user" placeholder="用户名" />
                    <input type="password" id="webdav-password" placeholder="密码" />
                    <div style="margin-top:16px">
                        <button class="primary" id="webdav-save">保存</button>
                        <button id="webdav-test">测试连接</button>
                        <button id="webdav-cancel">取消</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);

            // 填充已有配置
            const config = await AUTH.getWebDAVConfig();
            if (config) {
                modal.querySelector('#webdav-url').value = config.url || '';
                modal.querySelector('#webdav-user').value = config.username || '';
                // 出于安全考虑，不回填密码
            }

            // 事件处理
            modal.querySelector('#webdav-cancel').onclick = () => {
                document.body.removeChild(overlay);
                document.body.removeChild(modal);
            };

            modal.querySelector('#webdav-test').onclick = async () => {
                const url = modal.querySelector('#webdav-url').value;
                const username = modal.querySelector('#webdav-user').value;
                const password = modal.querySelector('#webdav-password').value;

                try {
                    await WebDAV.testConnection(url, username, password);
                    alert('连接成功！');
                } catch (e) {
                    alert('连接失败：' + e.message);
                }
            };

            modal.querySelector('#webdav-save').onclick = async () => {
                const url = modal.querySelector('#webdav-url').value;
                const username = modal.querySelector('#webdav-user').value;
                const password = modal.querySelector('#webdav-password').value;

                try {
                    await AUTH.saveWebDAVConfig(url, username, password);
                    alert('配置已保存');
                    document.body.removeChild(overlay);
                    document.body.removeChild(modal);
                } catch (e) {
                    alert('保存失败：' + e.message);
                }
            };
        }
    };

    // 认证相关
    const AUTH = {
        async getGitHubToken() {
            const token = localStorage.getItem('COPILOT_AUTH_TOKEN');
            if (!token) {
                throw new Error('No GitHub Copilot auth token found');
            }
            return JSON.parse(token).value;
        },

        async getWebDAVConfig() {
            const config = await GM_getValue('webdav_config');
            return config ? JSON.parse(config) : null;
        },

        async saveWebDAVConfig(url, username, password) {
            // 简单的配置验证
            if (!url || !username || !password) {
                throw new Error('所有字段都必须填写');
            }
            if (!url.endsWith('/')) {
                url += '/';
            }

            const config = {
                url,
                username,
                password,
                authHeader: 'Basic ' + btoa(`${username}:${password}`)
            };

            await GM_setValue('webdav_config', JSON.stringify(config));
        }
    };

    // WebDAV操作
    const WebDAV = {
        async testConnection(url, username, password) {
            if (!url.endsWith('/')) url += '/';
            const authHeader = 'Basic ' + btoa(`${username}:${password}`);

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'PROPFIND',
                    url: url,
                    headers: {
                        'Authorization': authHeader,
                        'Depth': '0'
                    },
                    onload: response => {
                        if (response.status === 207) {
                            resolve(true);
                        } else {
                            reject(new Error(`服务器返回状态码: ${response.status}`));
                        }
                    },
                    onerror: () => reject(new Error('连接失败'))
                });
            });
        },

        async request(path, method, data = null) {
            const config = await AUTH.getWebDAVConfig();
            if (!config) {
                throw new Error('WebDAV未配置');
            }

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method,
                    url: config.url + path,
                    headers: {
                        'Authorization': config.authHeader,
                        'Content-Type': 'application/json',
                    },
                    data: data ? JSON.stringify(data) : undefined,
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response);
                        } else {
                            reject(response);
                        }
                    },
                    onerror: reject
                });
            });
        },

        async readJson(path) {
            try {
                const response = await this.request(path, 'GET');
                return JSON.parse(response.responseText);
            } catch (e) {
                if (e.status === 404) {
                    return null;
                }
                throw e;
            }
        },

        async writeJson(path, data) {
            await this.request(path, 'PUT', data);
        }
    };

    // 同步管理器
    const SyncManager = {
        async syncThread(threadId) {
            try {
                // 获取消息
                const messages = await API.getThreadMessages(threadId);

                // 获取已存储的数据
                const storedData = await WebDAV.readJson(`threads/${threadId}.json`);
                const currentVersion = {
                    syncedAt: new Date().toISOString(),
                    messages: messages.messages,
                    messageIds: messages.messages.map(m => m.id).sort()
                };

                // 检查是否需要更新
                if (!storedData) {
                    // 新会话
                    await WebDAV.writeJson(`threads/${threadId}.json`, {
                        id: threadId,
                        versions: [currentVersion]
                    });
                    return;
                }

                const lastVersion = storedData.versions[storedData.versions.length - 1];
                if (!lastVersion ||
                    currentVersion.messageIds.join(',') !== lastVersion.messageIds.join(',')) {
                    // 需要更新
                    storedData.versions.push(currentVersion);
                    await WebDAV.writeJson(`threads/${threadId}.json`, storedData);
                }
            } catch (error) {
                console.error(`Failed to sync thread ${threadId}:`, error);
                throw error; // 向上传递错误以便UI处理
            }
        },

        async syncAllThreads() {
            try {
                const { threads } = await API.getAllThreads();
                console.log(`Found ${threads.length} threads`);

                for (const thread of threads) {
                    try {
                        await this.syncThread(thread.id);
                        console.debug(`${thread.id} synced.`);
                    } catch (error) {
                        console.error(`Sync failed on ${thread.id}, skip... `, error);
                    }
                }

                console.log('Sync completed');
            } catch (error) {
                console.error('Sync failed:', error);
                throw error;
            }
        }
    };

    // API请求封装
    const API = {
        async request(endpoint) {
            const token = await AUTH.getGitHubToken();
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `${CONFIG.API_BASE}${endpoint}`,
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `GitHub-Bearer ${token}`
                    },
                    onload: function(response) {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(JSON.parse(response.responseText));
                        } else {
                            reject(new Error(`Request failed: ${response.status}`));
                        }
                    },
                    onerror: reject
                });
            });
        },

        async getAllThreads() {
            return this.request('/threads');
        },

        async getThreadMessages(threadId) {
            return this.request(`/threads/${threadId}/messages`);
        }
    };

    // 初始化
    async function initialize() {
        registerMenuCommands();
        await UI.addPageButtons();
    }

    // UI操作
    const UI = {
        addSyncButton(container, text, onClick, className = '') {
            const button = document.createElement('button');
            button.className = `copilot-sync-btn ${className}`;
            button.textContent = text;
            button.onclick = async () => {
                button.disabled = true;
                button.textContent = '同步中...';
                try {
                    await onClick();
                    button.textContent = '同步成功';
                    setTimeout(() => {
                        button.textContent = text;
                        button.disabled = false;
                    }, 2000);
                } catch (e) {
                    button.textContent = '同步失败';
                    alert(e.message);
                    setTimeout(() => {
                        button.textContent = text;
                        button.disabled = false;
                    }, 2000);
                }
            };
            container.appendChild(button);
            return button;
        },

        async addPageButtons() {
            // 在 Copilot 页面添加按钮
            if (location.pathname === '/copilot') {
                const headerActions = document.querySelector('.Subhead-actions');
                if (headerActions) {
                    this.addSyncButton(headerActions, '同步全部会话', () => SyncManager.syncAllThreads());
                }
            }
            // 在具体会话页面添加按钮
            else if (location.pathname.startsWith('/copilot/c/')) {
                const threadId = location.pathname.split('/').pop();
                const headerActions = document.querySelector('.Subhead-actions');
                if (headerActions) {
                    this.addSyncButton(headerActions, '同步本会话', () => SyncManager.syncThread(threadId));
                }
            }
        }
    };

    // 注册菜单命令
    function registerMenuCommands() {
        GM_registerMenuCommand('设置WebDAV', () => WebDAVConfigUI.showConfigDialog());
        GM_registerMenuCommand('同步全部会话', async () => {
            try {
                await SyncManager.syncAllThreads();
                alert('同步完成');
            } catch (e) {
                alert('同步失败: ' + e.message);
            }
        });

        // 只在会话页面启用"同步本会话"菜单
        if (location.pathname.startsWith('/copilot/c/')) {
            const threadId = location.pathname.split('/').pop();
            GM_registerMenuCommand('同步本会话', async () => {
                try {
                    await SyncManager.syncThread(threadId);
                    alert('同步完成');
                } catch (e) {
                    alert('同步失败: ' + e.message);
                }
            });
        }
    }

    // 页面加载完成时初始化
    if (document.readyState === 'complete') {
        initialize();
    } else {
        window.addEventListener('load', initialize);
    }
})();
