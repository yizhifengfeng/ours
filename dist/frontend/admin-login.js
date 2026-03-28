;(function () {
    'use strict';

    var USERNAME_ALIASES = {
        '大福': 'yizhifengfeng',
        '舟舟': 'zhouzhou'
    };

    function fixAppHost(hostOrUrl) {
        return String(hostOrUrl || '').replace(/vercel\.ap(\/|$)/i, 'vercel.app$1');
    }

    function toAbsoluteBase(input, fallback) {
        var raw = fixAppHost(input || '').trim();
        if (!raw) return fallback;
        if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
        return ('https://' + raw).replace(/\/+$/, '');
    }

    var API_BASE = toAbsoluteBase(window.API_BASE_URL, (window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'https://our-records.xyz');
    var FRONTEND_HOME = fixAppHost(window.FRONTEND_HOME_URL || (window.location.origin + '/index.html'));
    var form = document.getElementById('adminLoginForm');
    var tip = document.getElementById('adminLoginTip');
    var logoutBtn = document.getElementById('adminLogoutBtn');
    var TOKEN_KEY = 'adminToken';

    function setTip(text, isError) {
        tip.textContent = text || '';
        tip.style.color = isError ? '#d14c6a' : '#4DA39F';
    }

    function normalizeUsername(raw) {
        var name = String(raw || '').trim();
        if (!name) return '';
        if (USERNAME_ALIASES[name]) return USERNAME_ALIASES[name];
        return name.toLowerCase();
    }

    async function login(username, password) {
        var resp = await fetch(API_BASE + '/api/admin?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
        var data = {};
        try { data = await resp.json(); } catch (e) {}
        if (!resp.ok) throw new Error((data && data.error) || '登录失败');
        if (!data.token) throw new Error('登录失败：缺少 token');
        window.localStorage.setItem(TOKEN_KEY, data.token);
        return data;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        var fd = new FormData(form);
        var username = normalizeUsername(fd.get('username'));
        var password = String(fd.get('password') || '');
        if (!username || !password) return;
        setTip('登录中...');
        login(username, password).then(function (data) {
            setTip('登录成功：' + (data.admin && data.admin.username ? data.admin.username : username));
            window.setTimeout(function () {
                window.location.href = FRONTEND_HOME;
            }, 450);
        }).catch(function (err) {
            var msg = err && err.message ? err.message : '登录失败';
            if (/invalid credentials/i.test(msg)) {
                msg = '账号或密码错误';
            }
            setTip(msg, true);
        });
    });

    logoutBtn.addEventListener('click', function () {
        window.localStorage.removeItem(TOKEN_KEY);
        setTip('已退出登录');
    });
})();
