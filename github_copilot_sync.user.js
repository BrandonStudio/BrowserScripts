// ==UserScript==
// @name         GitHub Copilot Chat Sync
// @namespace    https://github.com/BrandonStudio/BrowserScripts/GitHub-Copilot-Sync
// @version      0.1
// @description  同步 GitHub Copilot 聊天记录到WebDAV
// @author       BrandonStudio
// @match        https://github.com/copilot/c/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        WEBDAV_URL: 'https://your-webdav-server.com/copilot-chats/',
        SYNC_INTERVAL: 5 * 60 * 1000,  // 5分钟
        API_BASE: 'https://api.individual.githubcopilot.com/github/chat',
    };

    const AUTH = {
        // 从页面的localStorage中获取GitHub的认证token
        async getGitHubToken() {
            const token = localStorage.getItem('COPILOT_AUTH_TOKEN');
            if (!token) {
                throw new Error('No GitHub Copilot auth token found');
            }
            return token;
        },

        // WebDAV认证相关
        async getWebDAVAuth() {
            let auth = await GM_getValue('webdav_auth');
            if (!auth) {
                if (!await this.setupWebDAVAuth()) {
                    throw new Error('WebDAV auth not configured');
                }
                auth = await GM_getValue('webdav_auth');
            }
            return auth;
        },

        // 设置WebDAV认证信息
        async setupWebDAVAuth() {
            const username = prompt("输入WebDAV用户名：");
            const password = prompt("输入WebDAV密码：");
            if (!username || !password) {
                return false;
            }
            
            // 使用简单的加密存储密码（这只是基本的混淆，不是真正的加密）
            const encodedAuth = btoa(`${username}:${password}`);
            await GM_setValue('webdav_auth', encodedAuth);
            return true;
        }
    };

    // WebDAV操作封装
    const WebDAV = {
        async request(path, method, data = null) {
            const auth = await AUTH.getWebDAVAuth();
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method,
                    url: CONFIG.WEBDAV_URL + path,
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json',
                    },
                    data: data ? JSON.stringify(data) : undefined,
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response);
                        } else {
                            reject(new Error(`WebDAV request failed: ${response.status}`));
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
        async syncThread(thread) {
            try {
                // 获取消息
                const messages = await API.getThreadMessages(thread.id);
                
                // 获取已存储的数据
                const storedData = await WebDAV.readJson(`threads/${thread.id}.json`);
                const currentVersion = {
                    syncedAt: new Date().toISOString(),
                    name: thread.name,
                    messages: messages.messages,
                    messageIds: messages.messages.map(m => m.id).sort()
                };

                // 检查是否需要更新
                if (!storedData) {
                    // 新会话
                    await WebDAV.writeJson(`threads/${thread.id}.json`, {
                        id: thread.id,
                        versions: [currentVersion]
                    });
                    return;
                }

                const lastVersion = storedData.versions[storedData.versions.length - 1];
                if (!lastVersion || 
                    currentVersion.messageIds.join(',') !== lastVersion.messageIds.join(',')) {
                    // 需要更新
                    storedData.versions.push(currentVersion);
                    await WebDAV.writeJson(`threads/${thread.id}.json`, storedData);
                }
            } catch (error) {
                console.error(`Failed to sync thread ${thread.id}:`, error);
                // 如果是404错误（GitHub已删除），保留最后同步的数据
            }
        },

        async syncAllThreads() {
            try {
                const { threads } = await API.getAllThreads();
                console.log(`Found ${threads.length} threads`);
                
                for (const thread of threads) {
                    await this.syncThread(thread);
                }
                
                console.log('Sync completed');
            } catch (error) {
                console.error('Sync failed:', error);
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
                        'Authorization': `Bearer ${token}`,
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
        // 简单的状态指示器
        const statusDiv = document.createElement('div');
        statusDiv.style.position = 'fixed';
        statusDiv.style.bottom = '20px';
        statusDiv.style.right = '20px';
        statusDiv.style.padding = '5px';
        statusDiv.style.background = '#f0f0f0';
        statusDiv.style.border = '1px solid #ccc';
        statusDiv.style.zIndex = '9999';
        document.body.appendChild(statusDiv);

        const sync = async () => {
            statusDiv.textContent = '同步中...';
            try {
                await SyncManager.syncAllThreads();
                statusDiv.textContent = `同步完成 (${new Date().toLocaleTimeString()})`;
            } catch (e) {
                statusDiv.textContent = `同步失败 (${new Date().toLocaleTimeString()})`;
                console.error(e);
            }
        };

        setInterval(sync, CONFIG.SYNC_INTERVAL);
        sync(); // 首次同步
    }

    // 页面加载完成时初始化
    if (document.readyState === 'complete') {
        initialize();
    } else {
        window.addEventListener('load', initialize);
    }
})();
