(function () {
    'use strict';

    if (!window.FirstStore) {
        return;
    }

    var countNode = document.getElementById('firstListCount');
    var rangeNode = document.getElementById('firstListRange');
    var grid = document.getElementById('firstListGrid');
    var thumbList = document.getElementById('firstThumbList');
    var galleryGrid = document.getElementById('firstGalleryGrid');
    var emptyState = document.getElementById('firstListEmpty');
    var openComposerButton = document.getElementById('openFirstComposer');
    var composeModal = document.getElementById('firstComposeModal');
    var closeComposerButton = document.getElementById('closeFirstComposer');
    var cancelComposerButton = document.getElementById('cancelFirstComposer');
    var composeForm = document.getElementById('firstComposeForm');
    var photoInput = document.getElementById('firstPhotoInput');
    var composeFeedback = document.getElementById('firstComposeFeedback');
    var currentPhotoData = '';
    var API_BASE = window.API_BASE_URL || window.location.origin;
    var ADMIN_TOKEN_KEY = 'adminToken';
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

    function formatDate(dateString) {
        var date = new Date(dateString);
        var minutes = String(date.getMinutes()).padStart(2, '0');
        return date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0') + ' ' + date.getHours() + ':' + minutes;
    }

    function formatRangeDate(dateString) {
        var date = new Date(dateString);
        return date.getFullYear() + '.' + (date.getMonth() + 1) + '.' + date.getDate();
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
        var records = window.FirstStore.getRecords().slice().sort(function (a, b) {
            return new Date(b.date) - new Date(a.date);
        });

        countNode.textContent = String(records.length);
        emptyState.hidden = records.length !== 0;
        rangeNode.textContent = records.length
            ? formatRangeDate(records[records.length - 1].date) + ' - ' + formatRangeDate(records[0].date)
            : '还没有记录';

        if (!records.length) {
            grid.innerHTML = '';
            thumbList.innerHTML = '';
            galleryGrid.innerHTML = '';
            return;
        }

        thumbList.innerHTML = records.map(function (record, index) {
            return '' +
                '<a href="first-detail.html?id=' + encodeURIComponent(record.id) + '" class="first-thumb-item">' +
                    '<span class="first-thumb-dot">' + (index + 1) + '</span>' +
                    '<span class="first-thumb-title">' + escapeHtml(record.title) + '</span>' +
                    '<span class="first-thumb-arrow">›</span>' +
                '</a>';
        }).join('');

        grid.innerHTML = records.map(function (record) {
            var media = record.photo
                ? '<div class="first-card-media"><img src="' + record.photo + '" alt="' + escapeHtml(record.title) + '"></div>'
                : '';

            return '' +
                '<article class="first-card" data-id="' + escapeHtml(record.id) + '">' +
                    (isAdmin ? '<button type="button" class="first-card-delete" data-id="' + escapeHtml(record.id) + '" aria-label="删除这条 FIRST 记录">×</button>' : '') +
                    '<a href="first-detail.html?id=' + encodeURIComponent(record.id) + '" class="first-card-link">' +
                        '<div class="first-card-main">' +
                            '<div class="first-card-text">' +
                                '<span class="first-card-date">' + formatDate(record.date) + '</span>' +
                                '<h2 class="first-card-title">' + escapeHtml(record.title) + '</h2>' +
                                '<p class="first-card-description">' + escapeHtml(record.description).slice(0, 72) + (record.description.length > 72 ? '...' : '') + '</p>' +
                            '</div>' +
                            media +
                        '</div>' +
                    '</a>' +
                '</article>';
        }).join('');

        grid.querySelectorAll('.first-card-delete[data-id]').forEach(function (button) {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                var recordId = button.getAttribute('data-id');
                if (!recordId) return;
                window.FirstStore.deleteRecord(recordId);
                render();
            });
        });

        var galleryRecords = records.filter(function (record) {
            return Boolean(record.photo);
        });
        var galleryItems = galleryRecords.map(function (record) {
            return '' +
                '<a href="first-detail.html?id=' + encodeURIComponent(record.id) + '" class="first-gallery-item">' +
                    '<img src="' + record.photo + '" alt="' + escapeHtml(record.title) + '">' +
                '</a>';
        });
        while (galleryItems.length < 8) {
            galleryItems.push('<div class="first-gallery-item first-gallery-item--empty" aria-hidden="true"></div>');
        }
        galleryGrid.innerHTML = galleryItems.slice(0, 8).join('');
    }

    function openComposer() {
        if (!isAdmin) {
            window.alert('仅管理员可添加 FIRST 记录');
            return;
        }
        composeModal.hidden = false;
    }

    function closeComposer() {
        composeModal.hidden = true;
        composeForm.reset();
        currentPhotoData = '';
        composeFeedback.hidden = true;
        composeFeedback.textContent = '';
        composeForm.querySelector('[name="date"]').value = new Date().toISOString().slice(0, 16);
    }

    function handlePhotoChange() {
        var file = photoInput.files && photoInput.files[0];
        if (!file) {
            currentPhotoData = '';
            return;
        }

        if (!file.type.match(/^image\//)) {
            currentPhotoData = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function () {
            currentPhotoData = typeof reader.result === 'string' ? reader.result : '';
        };
        reader.readAsDataURL(file);
    }

    function handleSubmit(event) {
        event.preventDefault();
        if (!isAdmin) {
            window.alert('仅管理员可添加 FIRST 记录');
            return;
        }
        var formData = new FormData(composeForm);

        window.FirstStore.addRecord({
            title: String(formData.get('title') || '').trim(),
            date: String(formData.get('date') || '').trim(),
            photo: currentPhotoData,
            description: String(formData.get('description') || '').trim()
        });

        composeFeedback.hidden = false;
        composeFeedback.textContent = '已新增一条 FIRST 记录。';
        render();

        window.setTimeout(function () {
            closeComposer();
        }, 350);
    }

    function bindComposerEvents() {
        composeForm.querySelector('[name="date"]').value = new Date().toISOString().slice(0, 16);

        openComposerButton.addEventListener('click', openComposer);
        closeComposerButton.addEventListener('click', closeComposer);
        cancelComposerButton.addEventListener('click', closeComposer);
        photoInput.addEventListener('change', handlePhotoChange);
        composeForm.addEventListener('submit', handleSubmit);

        composeModal.addEventListener('click', function (event) {
            if (event.target === composeModal) {
                closeComposer();
            }
        });
    }

    checkAdmin().then(function (ok) {
        isAdmin = ok;
        if (!isAdmin && openComposerButton) {
            openComposerButton.style.opacity = '0.55';
            openComposerButton.title = '仅管理员可添加';
        }
        render();
    });
    bindComposerEvents();

    var params = new URLSearchParams(window.location.search);
    if (params.get('openComposer') === '1') {
        openComposer();
    }
})();
