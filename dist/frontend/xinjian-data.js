(function (window) {
    'use strict';

    var API_BASE = window.API_BASE_URL || window.location.origin;
    var ADMIN_TOKEN_KEY = 'adminToken';
    var VISITOR_ID_KEY = 'visitorId';

    function getAdminToken() {
        try { return window.localStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch (e) { return ''; }
    }

    function getVisitorId() {
        try {
            var existing = window.localStorage.getItem(VISITOR_ID_KEY);
            if (existing) return existing;
            var created = 'v-' + Date.now() + '-' + Math.random().toString(16).slice(2);
            window.localStorage.setItem(VISITOR_ID_KEY, created);
            return created;
        } catch (e) {
            return 'v-anon';
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
            body: typeof opts.body === 'undefined' ? undefined : JSON.stringify(opts.body)
        });
        var data = {};
        try { data = await resp.json(); } catch (e) {}
        if (!resp.ok) {
            var err = new Error((data && data.error) || ('HTTP ' + resp.status));
            err.status = resp.status;
            throw err;
        }
        return data;
    }

    function normalizeLetters(letters) {
        return (letters || []).map(function (letter, index) {
            var fallbackId = 'letter-' + index + '-' + Date.now();
            var normalizedRecipient = letter.recipient === '舟舟' ? '舟舟' : '大福';
            return {
                id: letter.id || fallbackId,
                title: letter.title || '未命名信件',
                recipient: normalizedRecipient,
                content: letter.content || '',
                date: letter.date || new Date().toISOString().slice(0, 10),
                status: letter.status === 'processed' ? 'processed' : 'pending',
                scheduledAt: letter.scheduled_at || letter.scheduledAt || '',
                read: Boolean(letter.read)
            };
        });
    }

    async function isAdmin() {
        try {
            await apiRequest('/api/admin?action=me');
            return true;
        } catch (e) {
            return false;
        }
    }

    async function getLetters() {
        var data = await apiRequest('/api/letters');
        var letters = normalizeLetters(data.items || []);
        var unreadData = await apiRequest('/api/letter-reads?visitorId=' + encodeURIComponent(getVisitorId()));
        var unreadByDate = unreadData.unreadByDate || {};
        return letters.map(function (letter) {
            return Object.assign({}, letter, { read: !unreadByDate[letter.date] });
        });
    }

    async function addLetter(letter) {
        var data = await apiRequest('/api/letters', {
            method: 'POST',
            body: {
                recipient: letter.recipient,
                title: letter.title,
                content: letter.content,
                date: letter.date,
                status: letter.status || 'pending',
                scheduledAt: letter.scheduledAt || ''
            }
        });
        return normalizeLetters([data.item])[0];
    }

    async function deleteLetter(letterId) {
        await apiRequest('/api/letters?id=' + encodeURIComponent(letterId), { method: 'DELETE' });
        return true;
    }

    async function getLettersByDate(date) {
        var data = await apiRequest('/api/letters?date=' + encodeURIComponent(date));
        return normalizeLetters(data.items || []);
    }

    async function markDateAsRead(date) {
        await apiRequest('/api/letter-reads', {
            method: 'POST',
            body: {
                visitorId: getVisitorId(),
                date: date
            }
        });
        return true;
    }

    window.XinjianStore = {
        getLetters: getLetters,
        addLetter: addLetter,
        deleteLetter: deleteLetter,
        getLettersByDate: getLettersByDate,
        markDateAsRead: markDateAsRead,
        isAdmin: isAdmin,
        getVisitorId: getVisitorId
    };
})(window);
