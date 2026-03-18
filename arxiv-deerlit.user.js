// ==UserScript==
// @name         Deerlit for arXiv.org
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Navigate to deerlit.com
// @author       BrandonStudio
// @homepage     https://github.com/BrandonStudio/BrowserScripts/
// @updateURL    https://github.com/BrandonStudio/BrowserScripts/raw/refs/heads/main/arxiv-deerlit.user.js
// @downloadURL  https://github.com/BrandonStudio/BrowserScripts/raw/refs/heads/main/arxiv-deerlit.user.js
// @supportURL   https://github.com/BrandonStudio/BrowserScripts/issues
// @match        https://arxiv.org/abs/*
// @icon         https://deerlit.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const div = document.querySelector('div.full-text');
    const ul = div.getElementsByTagName('ul')[0];
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'abs-button';
    link.text = 'Deerlit';
    link.target = '_blank';
    const arxivIds = document.querySelectorAll('span.arxivid > a');
    const arxivId = arxivIds[arxivIds.length - 1].text.replace('arXiv:', '');
    // const arxivNumber = location.pathname.split('/').at(-1);
    link.href = `https://deerlit.com/paper/${arxivId}`;
    li.appendChild(link);
    ul.appendChild(li);
})();
