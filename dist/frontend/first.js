(function () {
    'use strict';

    var countNode = document.getElementById('firstCount');
    if (!countNode || !window.FirstStore) {
        return;
    }

    function renderCount() {
        countNode.textContent = String(window.FirstStore.getRecords().length);
    }

    if (window.FirstStore.ensureLoaded) {
        window.FirstStore.ensureLoaded().then(renderCount).catch(renderCount);
        return;
    }

    renderCount();
})();
