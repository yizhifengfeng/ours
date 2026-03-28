(function () {
    'use strict';

    var API_BASE = window.API_BASE_URL || 'https://ours-i83n.vercel.app';
    var ADMIN_TOKEN_KEY = 'adminToken';

    var grid = document.getElementById('whereListGrid');
    var empty = document.getElementById('whereListEmpty');
    var countNode = document.getElementById('whereListCount');

    function getAdminToken() {
        try { return window.localStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch (e) { return ''; }
    }

    function apiRequest(path, options) {
        var opts = options || {};
        var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
        var token = getAdminToken();
        if (token) headers.Authorization = 'Bearer ' + token;
        return fetch(API_BASE + path, {
            method: opts.method || 'GET',
            headers: headers,
            body: typeof opts.body === 'undefined' ? undefined : JSON.stringify(opts.body)
        }).then(function (resp) {
            return resp.json().catch(function () { return {}; }).then(function (data) {
                if (!resp.ok) throw new Error((data && data.error) || ('HTTP ' + resp.status));
                return data;
            });
        });
    }

    function checkAdmin() {
        var token = getAdminToken();
        if (!token) return Promise.resolve(false);
        return apiRequest('/api/admin?action=me').then(function () { return true; }).catch(function () { return false; });
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toFixed(num, digits) {
        var n = Number(num);
        if (!isFinite(n)) return '';
        return n.toFixed(digits);
    }

    function loadAll() {
        return Promise.all([
            apiRequest('/api/places'),
            apiRequest('/api/place-photos')
        ]).then(function (results) {
            var places = results[0].items || [];
            var photos = results[1].items || [];

            var photoCountByCity = {};
            photos.forEach(function (p) {
                var city = p.place_city;
                if (!city) return;
                photoCountByCity[city] = (photoCountByCity[city] || 0) + 1;
            });

            return {
                places: places,
                photoCountByCity: photoCountByCity
            };
        });
    }

    function render(state, isAdmin) {
        var places = (state.places || []).slice().sort(function (a, b) {
            return String(a.city || '').localeCompare(String(b.city || ''), 'zh-Hans-CN');
        });

        if (countNode) {
            countNode.textContent = '共 ' + places.length + ' 个地标';
        }
        if (empty) empty.hidden = places.length !== 0;

        grid.innerHTML = places.map(function (p) {
            var city = String(p.city || '');
            var thumb = p.image_url ? '<img src="' + escapeHtml(p.image_url) + '" alt="">' : '';
            var photoCount = state.photoCountByCity[city] || 0;

            return '' +
                '<article class="where-item" data-place-id="' + escapeHtml(p.id) + '">' +
                    '<div class="where-item-thumb">' + thumb + '</div>' +
                    '<div class="where-item-main">' +
                        '<div class="where-item-row">' +
                            '<label>名字</label>' +
                            '<input ' + (isAdmin ? '' : 'disabled') + ' name="city" value="' + escapeHtml(city) + '">' +
                        '</div>' +
                        '<div class="where-item-row">' +
                            '<label>经度</label>' +
                            '<input ' + (isAdmin ? '' : 'disabled') + ' name="lng" value="' + escapeHtml(toFixed(p.lng, 5)) + '">' +
                        '</div>' +
                        '<div class="where-item-row">' +
                            '<label>纬度</label>' +
                            '<input ' + (isAdmin ? '' : 'disabled') + ' name="lat" value="' + escapeHtml(toFixed(p.lat, 5)) + '">' +
                        '</div>' +
                        '<div class="where-item-meta">' +
                            '<span>省份：' + escapeHtml(p.province || '') + '</span>' +
                            '<span>共计 ' + photoCount + ' 照片</span>' +
                        '</div>' +
                        '<div class="where-item-actions">' +
                            '<a class="where-item-btn where-item-btn--mint" href="place-detail.html?name=' + encodeURIComponent(city) + '">打开详情</a>' +
                            (isAdmin ? '<button type="button" class="where-item-btn where-item-btn--pink" data-save-id="' + escapeHtml(p.id) + '">保存修改</button>' : '') +
                        '</div>' +
                    '</div>' +
                '</article>';
        }).join('');

        if (!isAdmin) return;
        grid.querySelectorAll('[data-save-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-save-id');
                var card = btn.closest('.where-item');
                if (!id || !card) return;
                var city = (card.querySelector('[name="city"]') || {}).value || '';
                var lng = Number((card.querySelector('[name="lng"]') || {}).value);
                var lat = Number((card.querySelector('[name="lat"]') || {}).value);
                if (!city.trim() || !isFinite(lng) || !isFinite(lat)) {
                    window.alert('请填写正确的名字、经度、纬度');
                    return;
                }
                apiRequest('/api/places?id=' + encodeURIComponent(id), {
                    method: 'PATCH',
                    body: { city: city.trim(), lng: lng, lat: lat }
                }).then(function () {
                    window.alert('已保存');
                }).catch(function (err) {
                    window.alert('保存失败：' + err.message);
                });
            });
        });
    }

    if (!grid) return;

    Promise.all([checkAdmin(), loadAll()]).then(function (res) {
        render(res[1], res[0]);
    }).catch(function (err) {
        if (countNode) countNode.textContent = '加载失败';
        window.alert('加载失败：' + err.message);
    });
})();

