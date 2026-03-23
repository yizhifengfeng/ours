(function () {
    'use strict';

    var countNode = document.getElementById('firstCount');
    if (!countNode || !window.FirstStore) {
        return;
    }

    countNode.textContent = String(window.FirstStore.getRecords().length);
})();
