(function () {
    'use strict';

    if (!window.XinjianStore) {
        return;
    }

    var form = document.getElementById('composeForm');
    var feedback = document.getElementById('composeFeedback');
    var cancelButton = document.getElementById('cancelCompose');
    var toggleScheduleButton = document.getElementById('toggleSchedule');
    var scheduleField = document.getElementById('scheduleField');
    var previewStatus = document.getElementById('previewStatus');
    var previewTitle = document.getElementById('previewTitleText');
    var previewRecipient = document.getElementById('previewRecipient');
    var previewDate = document.getElementById('previewDate');
    var previewSchedule = document.getElementById('previewSchedule');
    var previewContent = document.getElementById('previewContent');
    var dateInput = form.querySelector('[name="date"]');
    var scheduleInput = form.querySelector('[name="scheduledAt"]');
    var scheduleEnabled = false;

    dateInput.value = new Date().toISOString().slice(0, 10);

    function updatePreview() {
        var formData = new FormData(form);
        var title = String(formData.get('title') || '').trim() || '写下你的标题';
        var recipient = String(formData.get('recipient') || '').trim() || '大福';
        var date = String(formData.get('date') || '').trim();
        var scheduledAt = scheduleEnabled ? String(formData.get('scheduledAt') || '').trim() : '';
        var content = String(formData.get('content') || '').trim() || '这里会显示信件正文预览。';
        var status = scheduledAt ? '定时发送' : '立即发送';

        previewStatus.textContent = status;
        previewStatus.style.color = scheduledAt ? '#ED688D' : '#4DA39F';
        previewTitle.textContent = title;
        previewRecipient.textContent = '收信人：' + recipient;
        previewDate.textContent = date ? '日期：' + formatDate(date) : '';
        previewSchedule.textContent = scheduledAt ? '发送时间：' + formatDateTime(scheduledAt) : '';
        previewContent.textContent = content;
    }

    function formatDate(dateString) {
        var date = new Date(dateString);
        return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
    }

    function formatDateTime(dateTimeString) {
        var date = new Date(dateTimeString);
        var minutes = String(date.getMinutes()).padStart(2, '0');
        return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + date.getHours() + ':' + minutes;
    }

    function resetForm() {
        form.reset();
        dateInput.value = new Date().toISOString().slice(0, 10);
        form.querySelector('[name="recipient"]').value = '大福';
        scheduleInput.value = '';
        scheduleEnabled = false;
        scheduleField.hidden = true;
        toggleScheduleButton.textContent = '定时发送';
        feedback.hidden = true;
        updatePreview();
    }

    form.addEventListener('input', updatePreview);
    form.addEventListener('change', updatePreview);
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var formData = new FormData(form);
        var scheduledAt = scheduleEnabled ? String(formData.get('scheduledAt') || '').trim() : '';
        var letterDate = String(formData.get('date') || '').trim();

        if (scheduledAt && scheduledAt.slice(0, 10) !== letterDate) {
            letterDate = scheduledAt.slice(0, 10);
        }

        try {
            await window.XinjianStore.addLetter({
                recipient: String(formData.get('recipient') || '').trim(),
                title: String(formData.get('title') || '').trim(),
                date: letterDate,
                content: String(formData.get('content') || '').trim(),
                status: scheduledAt ? 'pending' : 'processed',
                scheduledAt: scheduledAt,
                read: false
            });
        } catch (err) {
            feedback.hidden = false;
            feedback.textContent = '保存失败：' + (err && err.message ? err.message : '请检查管理员登录状态');
            return;
        }

        feedback.hidden = false;
        feedback.textContent = scheduledAt ? '已设置定时发送，正在跳转到信件列表...' : '已发送这封信，正在跳转到信件列表...';
        resetForm();
        feedback.hidden = false;
        feedback.textContent = scheduledAt ? '已设置定时发送，正在跳转到信件列表...' : '已发送这封信，正在跳转到信件列表...';

        window.setTimeout(function () {
            window.location.href = 'xinjian-history.html';
        }, 700);
    });

    cancelButton.addEventListener('click', function () {
        window.location.href = 'xinjian.html';
    });

    toggleScheduleButton.addEventListener('click', function () {
        scheduleEnabled = !scheduleEnabled;
        scheduleField.hidden = !scheduleEnabled;
        if (!scheduleEnabled) {
            scheduleInput.value = '';
        } else if (!scheduleInput.value) {
            var now = new Date();
            now.setHours(now.getHours() + 1);
            scheduleInput.value = now.toISOString().slice(0, 16);
        }
        toggleScheduleButton.textContent = scheduleEnabled ? '取消定时' : '定时发送';
        updatePreview();
    });

    (async function init() {
        var admin = false;
        try {
            admin = await window.XinjianStore.isAdmin();
        } catch (e) {}
        if (!admin) {
            feedback.hidden = false;
            feedback.textContent = '仅管理员可以新增信件，请先登录管理员账号。';
            Array.prototype.forEach.call(form.querySelectorAll('input,select,textarea,button'), function (el) {
                if (el.id === 'cancelCompose') return;
                el.disabled = true;
            });
        }
        updatePreview();
    })();
})();
