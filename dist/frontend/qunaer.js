/**
 * 去哪儿 - 地图页逻辑
 * 地标点击跳转详情；添加新地址弹窗
 */
(function () {
    var dialog = document.getElementById('addPlaceDialog');
    var btnAdd = document.getElementById('btnAddPlace');
    var btnCancel = document.getElementById('btnCancelAdd');
    var form = document.getElementById('addPlaceForm');

    if (!dialog || !btnAdd) return;

    // 打开弹窗
    btnAdd.addEventListener('click', function () {
        dialog.showModal();
    });

    // 取消关闭
    if (btnCancel) {
        btnCancel.addEventListener('click', function () {
            dialog.close();
        });
    }

    dialog.addEventListener('cancel', function () {
        dialog.close();
    });

    // 表单提交：可在此把新地点存到 localStorage 并动态加一个地标（此处仅关闭弹窗并清空）
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = (form.name && form.name.value) || '';
            var note = (form.note && form.note.value) || '';
            var x = (form.x && form.x.value) || 300;
            var y = (form.y && form.y.value) || 200;
            // 可扩展：写入数据、在 SVG 中插入新 <g class="marker"> 等
            console.log('添加地点:', { name: name, note: note, x: x, y: y });
            dialog.close();
            form.reset();
        });
    }

    // 地标点击 -> 跳转详情页
    var markers = document.querySelectorAll('.marker');
    markers.forEach(function (g) {
        g.addEventListener('click', function () {
            var id = g.getAttribute('data-id');
            var name = g.getAttribute('data-name') || '';
            if (id) {
                window.location.href = 'place-detail.html?id=' + encodeURIComponent(id) + '&name=' + encodeURIComponent(name);
            }
        });
    });
})();
