(function (window) {
    'use strict';

    var API_BASE = window.API_BASE_URL || 'https://ours-i83n.vercel.app';
    var ADMIN_TOKEN_KEY = 'adminToken';
    var recordsCache = [];
    var hasLoaded = false;

    function createSeedRecords() {
        return [
            {
                id: 'first-1',
                title: '第一次牵手',
                date: '2024-05-20T19:30',
                photo: '',
                description: '晚风很轻，路灯把影子拉得很长，你悄悄牵住了我的手。',
                createdAt: '2024-05-20T19:30'
            },
            {
                id: 'first-2',
                title: '第一次一起看海',
                date: '2024-07-13T17:40',
                photo: '',
                description: '海边的风有点大，但落日很好看，我们一起在沙滩上留下了脚印。',
                createdAt: '2024-07-13T17:40'
            },
            {
                id: 'first-3',
                title: '第一次一起做饭',
                date: '2024-09-08T18:15',
                photo: '',
                description: '厨房有点手忙脚乱，但最后做出来的味道意外不错，也很好笑。',
                createdAt: '2024-09-08T18:15'
            }
        ];
    }

    function normalizeRecord(record, index) {
        return {
            id: record.id || 'first-' + index + '-' + Date.now(),
            title: record.title || '未命名记录',
            date: record.date || new Date().toISOString().slice(0, 16),
            photo: record.photo || '',
            description: record.description || '',
            createdAt: record.createdAt || record.date || new Date().toISOString().slice(0, 16)
        };
    }

    function normalizeRecords(records) {
        return (records || []).map(normalizeRecord);
    }

    function getAdminToken() {
        try {
            return window.localStorage.getItem(ADMIN_TOKEN_KEY) || '';
        } catch (error) {
            return '';
        }
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
                if (!resp.ok) {
                    throw new Error((data && data.error) || ('HTTP ' + resp.status));
                }
                return data;
            });
        });
    }

    function getRecords() {
        return recordsCache.slice();
    }

    function seedServerRecords(seed) {
        return Promise.all((seed || []).map(function (item) {
            return apiRequest('/api/first-records', {
                method: 'POST',
                body: {
                    title: item.title,
                    date: item.date,
                    photo: item.photo,
                    description: item.description,
                    created_at: item.createdAt
                }
            }).catch(function () {
                return null;
            });
        }));
    }

    function getRecordById(recordId) {
        return getRecords().find(function (record) {
            return record.id === recordId;
        }) || null;
    }

    function loadRecords() {
        return apiRequest('/api/first-records').then(function (data) {
            var items = normalizeRecords(data.items || []);
            if (items.length) {
                recordsCache = items;
                hasLoaded = true;
                return getRecords();
            }
            recordsCache = createSeedRecords();
            if (getAdminToken()) {
                return seedServerRecords(recordsCache).then(function () {
                    return apiRequest('/api/first-records');
                }).then(function (seededData) {
                    var seededItems = normalizeRecords(seededData.items || []);
                    if (seededItems.length) recordsCache = seededItems;
                    hasLoaded = true;
                    return getRecords();
                }).catch(function () {
                    hasLoaded = true;
                    return getRecords();
                });
            }
            hasLoaded = true;
            return getRecords();
        }).catch(function () {
            recordsCache = createSeedRecords();
            hasLoaded = true;
            return getRecords();
        });
    }

    function ensureLoaded() {
        if (hasLoaded) return Promise.resolve(getRecords());
        return loadRecords();
    }

    function addRecord(record) {
        return apiRequest('/api/first-records', {
            method: 'POST',
            body: {
                title: record.title,
                date: record.date,
                photo: record.photo,
                description: record.description,
                created_at: new Date().toISOString()
            }
        }).then(function () {
            return loadRecords();
        });
    }

    function deleteRecord(recordId) {
        return apiRequest('/api/first-records?id=' + encodeURIComponent(recordId), {
            method: 'DELETE'
        }).then(function () {
            recordsCache = recordsCache.filter(function (record) {
                return record.id !== recordId;
            });
            return getRecords();
        });
    }

    window.FirstStore = {
        ensureLoaded: ensureLoaded,
        loadRecords: loadRecords,
        getRecords: getRecords,
        addRecord: addRecord,
        getRecordById: getRecordById,
        deleteRecord: deleteRecord
    };
})(window);
