;(function () {
    'use strict';

    var API_BASE = window.API_BASE_URL || '';
    var form = document.getElementById('adminLoginForm');
    var tip = document.getElementById('adminLoginTip');
    var logoutBtn = document.getElementById('adminLogoutBtn');
    var TOKEN_KEY = 'adminToken';

    function setTip(text, isError) {
        tip.textContent = text || '';
        tip.style.color = isError ? '#d14c6a' : '#4DA39F';
    }

    async function login(username, password) {
        var resp = await fetch(API_BASE + '/api/admin/login', {
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
        var username = String(fd.get('username') || '').trim();
        var password = String(fd.get('password') || '');
        if (!username || !password) return;
        setTip('登录中...');
        login(username, password).then(function (data) {
            setTip('登录成功：' + (data.admin && data.admin.username ? data.admin.username : username));
        }).catch(function (err) {
            setTip(err.message || '登录失败', true);
        });
    });

    logoutBtn.addEventListener('click', function () {
        window.localStorage.removeItem(TOKEN_KEY);
        setTip('已退出登录');
    });
})();
