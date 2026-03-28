(function () {
    'use strict';

    var countNode = document.getElementById('firstCount');
    if (!countNode || !window.FirstStore) {
        return;
    }

    window.FirstStore.ensureLoaded().then(function () {
        countNode.textContent = String(window.FirstStore.getRecords().length);
    }).catch(function () {
        countNode.textContent = '0';
    });
})();
