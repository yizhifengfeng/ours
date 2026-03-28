(function () {
    'use strict';

    var API_BASE = window.API_BASE_URL || 'https://ours-i83n.vercel.app';
    var ADMIN_TOKEN_KEY = 'adminToken';
    var tableBody = document.getElementById('whereListBody');
    var isAdmin = false;
    var photoCounts = {};

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
            return resp.json().catch(function () {
                return {};
            }).then(function (data) {
                if (!resp.ok) throw new Error((data && data.error) || ('HTTP ' + resp.status));
                return data;
            });
        });
    }

    function checkAdmin() {
        var token = getAdminToken();
        if (!token) return Promise.resolve(false);
        return apiRequest('/api/admin?action=me').then(function () {
            isAdmin = true;
            return true;
        }).catch(function () {
            isAdmin = false;
            return false;
        });
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function loadPhotoCounts() {
        return apiRequest('/api/place-photos').then(function (data) {
            photoCounts = {};
            (data.items || []).forEach(function (item) {
                var city = item.place_city || '';
                if (!city) return;
                photoCounts[city] = (photoCounts[city] || 0) + 1;
            });
        }).catch(function () {
            photoCounts = {};
        });
    }

    function coverCell(place) {
        if (place.image_url) {
            return '<img class="where-list-cover" src="' + escapeHtml(place.image_url) + '" alt="' + escapeHtml(place.city) + '">';
        }
        return '<span class="where-list-cover where-list-cover--empty">暂无封面</span>';
    }

    function inputCell(name, value, type) {
        var safeType = type || 'text';
        return '<input class="where-list-input" name="' + name + '" type="' + safeType + '" value="' + escapeHtml(value) + '">';
    }

    function renderPlaces(items) {
        if (!items.length) {
            tableBody.innerHTML = '<tr><td colspan="8" class="where-list-empty">还没有地点数据。</td></tr>';
            return;
        }

        tableBody.innerHTML = items.map(function (place) {
            return '' +
                '<tr data-place-id="' + escapeHtml(place.id) + '">' +
                    '<td>' + coverCell(place) + '</td>' +
                    '<td>' + inputCell('city', place.city) + '</td>' +
                    '<td>' + inputCell('province', place.province) + '</td>' +
                    '<td>' + inputCell('lng', place.lng, 'number') + '</td>' +
                    '<td>' + inputCell('lat', place.lat, 'number') + '</td>' +
                    '<td>' + inputCell('note', place.note || '') + '</td>' +
                    '<td>' + String(photoCounts[place.city] || 0) + ' 张</td>' +
                    '<td>' +
                        '<div class="where-list-actions">' +
                            (isAdmin ? '<button type="button" class="where-list-btn where-list-btn--save" data-save-place>保存</button>' : '') +
                            '<a class="where-list-btn where-list-btn--open" href="place-detail.html?name=' + encodeURIComponent(place.city) + '">打开</a>' +
                        '</div>' +
                    '</td>' +
                '</tr>';
        }).join('');
    }

    function readRowPayload(row) {
        function val(name) {
            var node = row.querySelector('[name="' + name + '"]');
            return node ? node.value : '';
        }

        return {
            city: String(val('city') || '').trim(),
            province: String(val('province') || '').trim(),
            lng: Number(val('lng')),
            lat: Number(val('lat')),
            note: String(val('note') || '').trim()
        };
    }

    function bindEvents() {
        tableBody.addEventListener('click', function (event) {
            var saveBtn = event.target && event.target.closest && event.target.closest('[data-save-place]');
            if (!saveBtn) return;
            if (!isAdmin) {
                window.alert('仅管理员可编辑地点。');
                return;
            }
            var row = saveBtn.closest('tr[data-place-id]');
            var placeId = row && row.getAttribute('data-place-id');
            if (!row || !placeId) return;
            var payload = readRowPayload(row);
            if (!payload.city || !payload.province || isNaN(payload.lng) || isNaN(payload.lat)) {
                window.alert('请完整填写名字、省份、经纬度。');
                return;
            }
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中...';
            apiRequest('/api/places?id=' + encodeURIComponent(placeId), {
                method: 'PATCH',
                body: payload
            }).then(function () {
                return Promise.all([loadPhotoCounts(), apiRequest('/api/places')]);
            }).then(function (results) {
                renderPlaces(results[1].items || []);
            }).catch(function (error) {
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
                window.alert('保存失败：' + error.message);
            });
        });
    }

    Promise.all([
        checkAdmin(),
        loadPhotoCounts(),
        apiRequest('/api/places')
    ]).then(function (results) {
        renderPlaces(results[2].items || []);
    }).catch(function (error) {
        tableBody.innerHTML = '<tr><td colspan="8" class="where-list-empty">加载失败：' + escapeHtml(error.message) + '</td></tr>';
    });

    bindEvents();
})();
