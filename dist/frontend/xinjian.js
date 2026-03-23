(function () {
    'use strict';

    var countNode = document.getElementById('xinjianCount');
    if (!countNode || !window.XinjianStore) {
        return;
    }

    (async function init() {
        try {
            var admin = await window.XinjianStore.isAdmin();
            if (!admin) {
                countNode.textContent = '管理员可见';
                return;
            }
            var letters = await window.XinjianStore.getLetters();
            countNode.textContent = String(letters.length);
        } catch (e) {
            countNode.textContent = '--';
        }
    })();
})();
