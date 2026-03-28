(function () {
    'use strict';

    if (!window.FirstStore) {
        return;
    }

    var params = new URLSearchParams(window.location.search);
    var recordId = params.get('id');

    var card = document.getElementById('firstDetailCard');
    var emptyState = document.getElementById('firstDetailEmpty');
    var titleNode = document.getElementById('firstDetailTitle');
    var dateNode = document.getElementById('firstDetailDate');
    var descriptionNode = document.getElementById('firstDetailDescription');
    var mediaWrap = document.getElementById('firstDetailMedia');
    var imageNode = document.getElementById('firstDetailImage');

    function formatDate(dateString) {
        var date = new Date(dateString);
        var minutes = String(date.getMinutes()).padStart(2, '0');
        return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + date.getHours() + ':' + minutes;
    }

    function showRecord(record) {
        if (!record) {
            emptyState.hidden = false;
            return;
        }

        titleNode.textContent = record.title;
        dateNode.textContent = formatDate(record.date);
        descriptionNode.textContent = record.description;

        if (record.photo) {
            mediaWrap.hidden = false;
            imageNode.src = record.photo;
            imageNode.alt = record.title;
        }

        card.hidden = false;
    }

    if (window.FirstStore.ensureLoaded) {
        window.FirstStore.ensureLoaded().then(function () {
            showRecord(window.FirstStore.getRecordById(recordId));
        }).catch(function () {
            showRecord(window.FirstStore.getRecordById(recordId));
        });
    } else {
        showRecord(window.FirstStore.getRecordById(recordId));
    }
})();
