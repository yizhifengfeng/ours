(function () {
    'use strict';

    if (!window.FirstStore) {
        return;
    }

    var form = document.getElementById('firstComposeForm');
    var photoInput = document.getElementById('firstPhotoInput');
    var cancelButton = document.getElementById('firstComposeCancel');
    var feedback = document.getElementById('firstComposeFeedback');
    var previewDate = document.getElementById('firstPreviewDate');
    var previewTitle = document.getElementById('firstPreviewTitle');
    var previewDescription = document.getElementById('firstPreviewDescription');
    var previewPhotoWrap = document.getElementById('firstPreviewPhotoWrap');
    var previewPhoto = document.getElementById('firstPreviewPhoto');

    var currentPhotoData = '';
    var dateInput = form.querySelector('[name="date"]');
    dateInput.value = new Date().toISOString().slice(0, 16);

    function formatDate(dateString) {
        if (!dateString) {
            return '';
        }
        var date = new Date(dateString);
        var minutes = String(date.getMinutes()).padStart(2, '0');
        return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + date.getHours() + ':' + minutes;
    }

    function updatePreview() {
        var formData = new FormData(form);
        var title = String(formData.get('title') || '').trim() || '写下这次 FIRST 的名字';
        var description = String(formData.get('description') || '').trim() || '这里会显示详细描述预览。';

        previewDate.textContent = formatDate(String(formData.get('date') || ''));
        previewTitle.textContent = title;
        previewDescription.textContent = description;

        if (currentPhotoData) {
            previewPhotoWrap.hidden = false;
            previewPhoto.src = currentPhotoData;
            previewPhoto.alt = title;
        } else {
            previewPhotoWrap.hidden = true;
            previewPhoto.removeAttribute('src');
        }
    }

    photoInput.addEventListener('change', function () {
        var file = photoInput.files && photoInput.files[0];
        if (!file) {
            currentPhotoData = '';
            updatePreview();
            return;
        }

        if (!file.type.match(/^image\//)) {
            currentPhotoData = '';
            updatePreview();
            return;
        }

        var reader = new FileReader();
        reader.onload = function () {
            currentPhotoData = typeof reader.result === 'string' ? reader.result : '';
            updatePreview();
        };
        reader.readAsDataURL(file);
    });

    form.addEventListener('input', updatePreview);
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        var formData = new FormData(form);

        window.FirstStore.addRecord({
            title: String(formData.get('title') || '').trim(),
            date: String(formData.get('date') || '').trim(),
            photo: currentPhotoData,
            description: String(formData.get('description') || '').trim()
        });

        feedback.hidden = false;
        feedback.textContent = '已添加一条 FIRST 记录，正在跳转到回顾列表...';

        window.setTimeout(function () {
            window.location.href = 'first-list.html';
        }, 700);
    });

    cancelButton.addEventListener('click', function () {
        window.location.href = 'first.html';
    });

    updatePreview();
})();
