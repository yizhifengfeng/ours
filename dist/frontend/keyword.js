(function () {
    'use strict';

    var STORAGE_KEY = 'annualKeywords';
    var API_BASE = window.API_BASE_URL || '';
    var ADMIN_TOKEN_KEY = 'adminToken';
    var wall = document.getElementById('bubbleWall');
    var form = document.getElementById('keywordForm');
    var rangeNode = document.getElementById('keywordRange');
    var isAdmin = false;

    function getAdminToken() {
        try { return window.localStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch (e) { return ''; }
    }

    function checkAdmin() {
        var token = getAdminToken();
        if (!token) return Promise.resolve(false);
        return fetch(API_BASE + '/api/admin?action=me', {
            headers: { Authorization: 'Bearer ' + token }
        }).then(function (resp) { return resp.ok; }).catch(function () { return false; });
    }

    function getYearRange() {
        var end = new Date();
        var start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        return {
            start: start.getFullYear() + '.' + (start.getMonth() + 1) + '.' + start.getDate(),
            end: end.getFullYear() + '.' + (end.getMonth() + 1) + '.' + end.getDate()
        };
    }

    function createSeedKeywords() {
        return [
            { id: 'k1', text: '勇敢', owner: 'girl', size: 130, x: 38, y: 36 },
            { id: 'k2', text: '不焦虑', owner: 'boy', size: 150, x: 52, y: 58 },
            { id: 'k3', text: '松弛', owner: 'girl', size: 100, x: 72, y: 34 },
            { id: 'k4', text: '成长', owner: 'boy', size: 96, x: 18, y: 52 },
            { id: 'k5', text: '热爱', owner: 'girl', size: 92, x: 84, y: 50 },
            { id: 'k6', text: '信任', owner: 'boy', size: 118, x: 67, y: 25 },
            { id: 'k7', text: '自在', owner: 'girl', size: 82, x: 11, y: 28 },
            { id: 'k8', text: '坚定', owner: 'boy', size: 78, x: 30, y: 18 }
        ];
    }

    function normalizeItems(items) {
        return (items || []).map(function (item, index) {
            return {
                id: item.id || 'k-' + index + '-' + Date.now(),
                text: item.text || '关键词',
                owner: item.owner === 'boy' ? 'boy' : 'girl',
                size: Number(item.size) > 60 ? Number(item.size) : 92,
                x: Number(item.x),
                y: Number(item.y)
            };
        });
    }

    function getItems() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                var seed = createSeedKeywords();
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
                return seed;
            }
            return normalizeItems(JSON.parse(raw));
        } catch (error) {
            return createSeedKeywords();
        }
    }

    function saveItems(items) {
        var normalized = normalizeItems(items);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function isOverlapping(candidate, others) {
        var r1 = candidate.size / 2;
        var cx1 = candidate.x;
        var cy1 = candidate.y;
        for (var i = 0; i < others.length; i++) {
            var o = others[i];
            var r2 = o.size / 2;
            var dx = cx1 - o.x;
            var dy = cy1 - o.y;
            var distSq = dx * dx + dy * dy;
            var minDist = (r1 + r2) * 0.9;
            if (distSq < minDist * minDist) return true;
        }
        return false;
    }

    function createRandomBubble(word, owner, existing) {
        var base = {
            id: 'k-' + Date.now(),
            text: word,
            owner: owner === 'boy' ? 'boy' : 'girl',
            size: randomBetween(78, 156),
            x: 50,
            y: 40
        };
        var attempts = 0;
        var maxAttempts = 40;
        var items = existing || [];
        while (attempts < maxAttempts) {
            attempts++;
            base.x = randomBetween(12, 84);
            base.y = randomBetween(14, 70);
            if (!isOverlapping(base, items)) break;
        }
        return base;
    }

    function render() {
        var items = getItems();
        wall.innerHTML = items.map(function (item, index) {
            return '' +
                '<button type="button" class="bubble-item bubble-item--' + item.owner + '" data-id="' + item.id + '" ' +
                'style="width:' + item.size + 'px;height:' + item.size + 'px;left:' + item.x + '%;top:' + item.y + '%;animation-delay:' + (index * 0.2) + 's">' +
                    '<span class="bubble-text">' + escapeHtml(item.text) + '</span>' +
                '</button>';
        }).join('');

        bindBubbleDragAndClick();
    }

    function bindBubbleDragAndClick() {
        wall.querySelectorAll('.bubble-item').forEach(function (node) {
            var dragging = false;
            var moved = false;
            var pointerId = null;
            var wallRect;
            var nodeRect;
            var offsetX = 0;
            var offsetY = 0;
            var bubbleId = node.getAttribute('data-id');

            function clamp(value, min, max) {
                return Math.max(min, Math.min(max, value));
            }

            function updatePosition(clientX, clientY) {
                var xPx = clamp(clientX - wallRect.left - offsetX, 0, wallRect.width - nodeRect.width);
                var yPx = clamp(clientY - wallRect.top - offsetY, 0, wallRect.height - nodeRect.height);
                var xPercent = (xPx / wallRect.width) * 100;
                var yPercent = (yPx / wallRect.height) * 100;
                node.style.left = xPercent + '%';
                node.style.top = yPercent + '%';
                return { x: xPercent, y: yPercent };
            }

            function onPointerMove(event) {
                if (!dragging) return;
                moved = true;
                updatePosition(event.clientX, event.clientY);
            }

            function onPointerUp(event) {
                if (!dragging) return;
                dragging = false;
                node.releasePointerCapture(pointerId);
                node.removeEventListener('pointermove', onPointerMove);
                node.removeEventListener('pointerup', onPointerUp);
                node.removeEventListener('pointercancel', onPointerUp);

                if (!moved) {
                    onBubbleClick(bubbleId);
                    return;
                }

                var pos = updatePosition(event.clientX, event.clientY);
                var items = getItems();
                var target = items.find(function (item) { return item.id === bubbleId; });
                if (target) {
                    target.x = Number(pos.x.toFixed(2));
                    target.y = Number(pos.y.toFixed(2));
                    saveItems(items);
                }
            }

            node.addEventListener('pointerdown', function (event) {
                if (!isAdmin) return;
                pointerId = event.pointerId;
                dragging = true;
                moved = false;
                wallRect = wall.getBoundingClientRect();
                nodeRect = node.getBoundingClientRect();
                offsetX = event.clientX - nodeRect.left;
                offsetY = event.clientY - nodeRect.top;
                node.setPointerCapture(pointerId);
                node.addEventListener('pointermove', onPointerMove);
                node.addEventListener('pointerup', onPointerUp);
                node.addEventListener('pointercancel', onPointerUp);
            });
        });
    }

    function onBubbleClick(id) {
        if (!isAdmin) {
            window.alert('仅管理员可编辑关键词');
            return;
        }
        var items = getItems();
        var target = items.find(function (item) { return item.id === id; });
        if (!target) return;

        var action = window.prompt('输入 1 编辑关键词，输入 2 删除关键词', '1');
        if (!action) return;

        if (action === '2') {
            var confirmed = window.confirm('确定删除这个关键词吗？');
            if (!confirmed) return;
            saveItems(items.filter(function (item) { return item.id !== id; }));
            render();
            return;
        }

        var nextText = window.prompt('编辑关键词文字', target.text);
        if (!nextText) return;
        target.text = nextText.trim() || target.text;
        saveItems(items);
        render();
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!isAdmin) {
            window.alert('仅管理员可添加关键词');
            return;
        }
        var formData = new FormData(form);
        var word = String(formData.get('word') || '').trim();
        if (!word) return;

        var items = getItems();
        items.push(createRandomBubble(word, String(formData.get('owner') || 'girl'), items));
        saveItems(items);
        form.reset();
        form.querySelector('[name="owner"]').value = 'girl';
        render();
    });

    var range = getYearRange();
    rangeNode.textContent = range.start + '-' + range.end;
    checkAdmin().then(function (ok) {
        isAdmin = ok;
        if (!isAdmin) {
            form.style.opacity = '0.6';
        }
        render();
    });
})();
