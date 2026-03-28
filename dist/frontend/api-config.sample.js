;(function () {
    'use strict';
    // 前后端分开部署时：复制本文件为同目录下的 api-config.js，填写后端地址（不要末尾 /）
    // 并在各 HTML 里、在其他 <script> 之前加入：<script src="api-config.js"></script>
    if (typeof window !== 'undefined' && !window.API_BASE_URL) {
        window.API_BASE_URL = 'https://你的后端项目.vercel.app';
    }
})();
