(function () {
    'use strict';

    var API_BASE = window.API_BASE_URL || '';
    var ADMIN_TOKEN_KEY = 'adminToken';
    var wall = document.getElementById('liuyanWall');
    var form = document.getElementById('liuyanForm');
    var rangeNode = document.getElementById('liuyanRange');
    var isAdmin = false;
    var messagesCache = [];

    function getRange() {
        var end = new Date();
        var start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        return start.getFullYear() + '.' + (start.getMonth() + 1) + '.' + start.getDate() + '-' +
            end.getFullYear() + '.' + (end.getMonth() + 1) + '.' + end.getDate();
    }

    function getAdminToken() {
        try {
            return window.localStorage.getItem(ADMIN_TOKEN_KEY) || '';
        } catch (err) {
            return '';
        }
    }

    async function apiRequest(path, options) {
        var opts = options || {};
        var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
        var token = getAdminToken();
        if (token) headers.Authorization = 'Bearer ' + token;

        var resp = await fetch(API_BASE + path, {
            method: opts.method || 'GET',
            headers: headers,
            body: typeof opts.body === 'undefined' ? undefined : JSON.stringify(opts.body),
        });
        var data = {};
        try { data = await resp.json(); } catch (e) {}
        if (!resp.ok) throw new Error(data && data.error ? data.error : ('HTTP ' + resp.status));
        return data;
    }

    function normalize(messages) {
        return (messages || []).map(function (message, index) {
            return {
                id: message.id || 'm-' + index + '-' + Date.now(),
                from: message.from === '舟舟' ? '舟舟' : '大福',
                to: message.to === '舟舟' ? '舟舟' : '大福',
                content: message.content || '',
                date: message.date || formatNow(),
                x: typeof message.x === 'number' ? message.x : 10,
                y: typeof message.y === 'number' ? message.y : 10
            };
        });
    }

    async function loadMessages() {
        try {
            var data = await apiRequest('/api/messages');
            messagesCache = normalize(data.items || []);
        } catch (error) {
            messagesCache = [];
        }
        return messagesCache;
    }

    async function checkAdmin() {
        var token = getAdminToken();
        if (!token) {
            isAdmin = false;
            return false;
        }
        try {
            await apiRequest('/api/admin/me');
            isAdmin = true;
            return true;
        } catch (e) {
            isAdmin = false;
            return false;
        }
    }

    function formatNow() {
        var d = new Date();
        return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function render() {
        var messages = messagesCache;
        wall.innerHTML = messages.map(function (message) {
            var cls = message.from === '舟舟' ? 'liuyan-card liuyan-card--boy' : 'liuyan-card liuyan-card--girl';
            return '' +
                '<article class="' + cls + '" data-id="' + message.id + '" style="left:' + message.x + '%;top:' + message.y + '%;">' +
                    '<span class="liuyan-pin" aria-hidden="true"></span>' +
                    '<div class="liuyan-card-head">' +
                        '<h2 class="liuyan-name">' + escapeHtml(message.from) + '</h2>' +
                        (isAdmin ? '<button type="button" class="liuyan-delete" data-id="' + message.id + '" aria-label="删除">×</button>' : '') +
                    '</div>' +
                    '<div class="liuyan-divider"></div>' +
                    '<p class="liuyan-content">' + escapeHtml(message.content) + '</p>' +
                    '<p class="liuyan-date">' + message.date + '</p>' +
                '</article>';
        }).join('');

        wall.querySelectorAll('.liuyan-delete[data-id]').forEach(function (button) {
            button.addEventListener('click', async function () {
                var id = button.getAttribute('data-id');
                if (!id) return;
                try {
                    await apiRequest('/api/messages?id=' + encodeURIComponent(id), { method: 'DELETE' });
                    messagesCache = messagesCache.filter(function (message) { return message.id !== id; });
                } catch (err) {
                    window.alert('删除失败：' + err.message);
                }
                render();
            });
        });

        bindDragEvents();
    }

    function bindDragEvents() {
        wall.querySelectorAll('.liuyan-card').forEach(function (card) {
            card.addEventListener('pointerdown', function (event) {
                if (event.target.closest('.liuyan-delete')) {
                    return;
                }

                var cardId = card.getAttribute('data-id');
                if (!cardId) {
                    return;
                }

                var wallRect = wall.getBoundingClientRect();
                var cardRect = card.getBoundingClientRect();
                var offsetX = event.clientX - cardRect.left;
                var offsetY = event.clientY - cardRect.top;

                card.classList.add('is-dragging');
                card.setPointerCapture(event.pointerId);

                function clamp(value, min, max) {
                    return Math.max(min, Math.min(max, value));
                }

                function updateCardPosition(clientX, clientY) {
                    var xPx = clamp(clientX - wallRect.left - offsetX, 0, wallRect.width - cardRect.width);
                    var yPx = clamp(clientY - wallRect.top - offsetY, 0, wallRect.height - cardRect.height);
                    var xPercent = (xPx / wallRect.width) * 100;
                    var yPercent = (yPx / wallRect.height) * 100;
                    card.style.left = xPercent + '%';
                    card.style.top = yPercent + '%';
                    return { x: xPercent, y: yPercent };
                }

                function handleMove(moveEvent) {
                    updateCardPosition(moveEvent.clientX, moveEvent.clientY);
                }

                async function handleUp(upEvent) {
                    card.releasePointerCapture(upEvent.pointerId);
                    card.classList.remove('is-dragging');
                    card.removeEventListener('pointermove', handleMove);
                    card.removeEventListener('pointerup', handleUp);
                    card.removeEventListener('pointercancel', handleUp);

                    var finalPos = updateCardPosition(upEvent.clientX, upEvent.clientY);
                    var target = messagesCache.find(function (message) { return message.id === cardId; });
                    if (target) {
                        target.x = Number(finalPos.x.toFixed(2));
                        target.y = Number(finalPos.y.toFixed(2));
                        try {
                            await apiRequest('/api/messages-position', {
                                method: 'PATCH',
                                body: { id: cardId, x: target.x, y: target.y }
                            });
                        } catch (err) {
                            // 拖拽失败不阻断 UI，静默回落
                        }
                    }
                }

                card.addEventListener('pointermove', handleMove);
                card.addEventListener('pointerup', handleUp);
                card.addEventListener('pointercancel', handleUp);
            });
        });
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!isAdmin) {
            window.alert('仅管理员可新增留言。');
            return;
        }
        var formData = new FormData(form);
        var content = String(formData.get('content') || '').trim();
        if (!content) return;

        var payload = {
            from: String(formData.get('from') || '大福'),
            to: String(formData.get('to') || '舟舟'),
            content: content,
            date: formatNow(),
            x: Math.floor(Math.random() * 80) + 6,
            y: Math.floor(Math.random() * 76) + 6
        };
        try {
            var data = await apiRequest('/api/messages', { method: 'POST', body: payload });
            messagesCache.unshift(normalize([data.item])[0]);
        } catch (err) {
            window.alert('新增失败：' + err.message);
            return;
        }
        form.reset();
        form.querySelector('[name="from"]').value = '大福';
        form.querySelector('[name="to"]').value = '舟舟';
        render();
    });

    (async function init() {
        rangeNode.textContent = getRange();
        await checkAdmin();
        await loadMessages();
        render();
    })();
})();
