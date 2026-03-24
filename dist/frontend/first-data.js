(function (window) {
    'use strict';

    var STORAGE_KEY = 'firstRecords';

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

    function getRecords() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                var seed = createSeedRecords();
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
                return seed;
            }
            return normalizeRecords(JSON.parse(raw));
        } catch (error) {
            return createSeedRecords();
        }
    }

    function saveRecords(records) {
        var normalized = normalizeRecords(records);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function addRecord(record) {
        var records = getRecords();
        records.unshift(normalizeRecord({
            id: 'first-' + Date.now(),
            title: record.title,
            date: record.date,
            photo: record.photo,
            description: record.description,
            createdAt: new Date().toISOString().slice(0, 16)
        }, 0));
        return saveRecords(records);
    }

    function getRecordById(recordId) {
        var records = getRecords();
        for (var i = 0; i < records.length; i += 1) {
            if (records[i].id === recordId) {
                return records[i];
            }
        }
        return null;
    }

    function deleteRecord(recordId) {
        var records = getRecords().filter(function (record) {
            return record.id !== recordId;
        });
        return saveRecords(records);
    }

    window.FirstStore = {
        getRecords: getRecords,
        saveRecords: saveRecords,
        addRecord: addRecord,
        getRecordById: getRecordById,
        deleteRecord: deleteRecord
    };
})(window);
