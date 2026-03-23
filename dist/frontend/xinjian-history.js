(function () {
    'use strict';

    if (!window.XinjianStore) {
        return;
    }

    var calendarGrid = document.getElementById('calendarGrid');
    var calendarTitle = document.querySelector('.calendar-title');
    var letterList = document.getElementById('letterList');
    var historyCount = document.getElementById('historyCount');
    var emptyState = document.getElementById('emptyState');
    var detailModal = document.getElementById('detailModal');
    var detailModalTitle = document.getElementById('detailModalTitle');
    var detailModalList = document.getElementById('detailModalList');
    var closeDetailModal = document.getElementById('closeDetailModal');
    var prevMonthBtn = document.getElementById('prevMonthBtn');
    var nextMonthBtn = document.getElementById('nextMonthBtn');
    var adminAllowed = false;

    var activeMonth = getInitialMonth();

    async function getLetters() {
        var rows = await window.XinjianStore.getLetters();
        return rows.slice().sort(function (a, b) {
            return new Date(b.date) - new Date(a.date);
        });
    }

    function getInitialMonth() {
        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    function computeInitialMonthFromLetters(letters) {
        if (!letters.length) {
            var now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), 1);
        }

        var latestDate = letters.reduce(function (latest, letter) {
            return new Date(letter.date) > new Date(latest.date) ? letter : latest;
        });

        return new Date(new Date(latestDate.date).getFullYear(), new Date(latestDate.date).getMonth(), 1);
    }

    function formatDate(dateString) {
        var date = new Date(dateString);
        var month = date.getMonth() + 1;
        var day = date.getDate();
        return date.getFullYear() + '年' + month + '月' + day + '日';
    }

    function formatDateTime(dateTimeString) {
        if (!dateTimeString) {
            return '';
        }
        var date = new Date(dateTimeString);
        var minutes = String(date.getMinutes()).padStart(2, '0');
        return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + date.getHours() + ':' + minutes;
    }

    async function renderCalendar() {
        var letters = await getLetters();
        var countsByDate = letters.reduce(function (map, letter) {
            if (!map[letter.date]) {
                map[letter.date] = { count: 0, unreadCount: 0, recipients: [] };
            }
            map[letter.date].count += 1;
            if (!letter.read) {
                map[letter.date].unreadCount += 1;
            }
            if (map[letter.date].recipients.indexOf(letter.recipient) === -1) {
                map[letter.date].recipients.push(letter.recipient);
            }
            return map;
        }, {});

        var year = activeMonth.getFullYear();
        var month = activeMonth.getMonth();
        var firstDay = new Date(year, month, 1);
        var totalDays = new Date(year, month + 1, 0).getDate();
        var startWeekday = (firstDay.getDay() + 6) % 7;
        var cells = [];

        calendarTitle.textContent = year + '年 ' + (month + 1) + '月';

        for (var i = 0; i < startWeekday; i += 1) {
            cells.push('<div class="calendar-day calendar-day--empty" aria-hidden="true"></div>');
        }

        for (var day = 1; day <= totalDays; day += 1) {
            var dateKey = [
                year,
                String(month + 1).padStart(2, '0'),
                String(day).padStart(2, '0')
            ].join('-');
            var dayInfo = countsByDate[dateKey] || { count: 0, unreadCount: 0, recipients: [] };
            var count = dayInfo.count;
            var dayClass = count ? 'calendar-day calendar-day--has-letter' : 'calendar-day';
            var recipientText = count ? '<span class="calendar-day-recipients">' + escapeHtml(dayInfo.recipients.join(' / ')) + '</span>' : '';
            var dayCountText = count ? '<span class="calendar-day-count">' + count + ' 封信</span>' : '<span class="calendar-day-count">暂无</span>';
            var unreadBadge = dayInfo.unreadCount ? '<span class="calendar-day-unread" aria-label="未读 ' + dayInfo.unreadCount + '">' + dayInfo.unreadCount + '</span>' : '';

            cells.push(
                '<button type="button" class="' + dayClass + '" data-date="' + dateKey + '">' +
                    unreadBadge +
                    '<span class="calendar-day-number">' + day + '</span>' +
                    dayCountText +
                    recipientText +
                '</button>'
            );
        }

        calendarGrid.innerHTML = cells.join('');
        calendarGrid.querySelectorAll('.calendar-day[data-date]').forEach(function (button) {
            button.addEventListener('click', function () {
                openDetailModal(button.getAttribute('data-date'));
            });
        });
    }

    async function renderList() {
        var letters = await getLetters();
        historyCount.textContent = String(letters.length);
        emptyState.hidden = letters.length !== 0;

        if (!letters.length) {
            letterList.innerHTML = '';
            return;
        }

        letterList.innerHTML = letters.map(function (letter) {
            var readClass = letter.read ? '' : ' is-unread';
            return '' +
                '<article class="letter-item">' +
                    '<div class="letter-card' + readClass + '" data-letter-id="' + letter.id + '" data-date="' + letter.date + '">' +
                        '<div>' +
                            '<h3 class="letter-card-title">' + escapeHtml(letter.title) + '</h3>' +
                            '<p class="letter-card-meta">收信人：' + escapeHtml(letter.recipient) + '</p>' +
                            '<p class="letter-card-content">' + escapeHtml(letter.content) + '</p>' +
                        '</div>' +
                        '<div class="letter-card-side">' +
                            (adminAllowed ? '<button type="button" class="letter-card-delete" data-letter-id="' + escapeHtml(letter.id) + '" aria-label="删除这封信">×</button>' : '') +
                            '<span class="letter-card-date">' + formatDate(letter.date) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</article>';
        }).join('');

        letterList.querySelectorAll('.letter-card-delete[data-letter-id]').forEach(function (button) {
            button.addEventListener('click', async function (event) {
                event.preventDefault();
                event.stopPropagation();
                var letterId = button.getAttribute('data-letter-id');
                if (!letterId) return;
                try {
                    await window.XinjianStore.deleteLetter(letterId);
                } catch (err) {
                    window.alert('删除失败：' + (err && err.message ? err.message : '请重试'));
                    return;
                }
                // 如果详情弹窗打开，删除后先关闭，避免展示已不存在的数据
                if (detailModal) detailModal.hidden = true;
                await renderCalendar();
                await renderList();
            });
        });

        attachOpenDetailEvents();
    }

    function attachOpenDetailEvents() {
        letterList.querySelectorAll('.letter-card').forEach(function (card) {
            card.addEventListener('click', function (event) {
                if (event.target && event.target.closest && event.target.closest('.letter-card-delete')) return;
                openDetailModal(card.getAttribute('data-date'));
            });
        });
    }

    async function openDetailModal(date) {
        var lettersRaw = await window.XinjianStore.getLettersByDate(date);
        var letters = lettersRaw.slice().sort(function (a, b) {
            return new Date(b.date) - new Date(a.date);
        });

        await window.XinjianStore.markDateAsRead(date);
        await renderCalendar();
        await renderList();

        detailModalTitle.textContent = formatDate(date);
        detailModalList.innerHTML = letters.length ? letters.map(function (letter) {
            var timingText = letter.scheduledAt
                ? '定时发送：' + formatDateTime(letter.scheduledAt)
                : (letter.status === 'processed' ? '已发送' : '待发送');

            return '' +
                '<article class="detail-paper">' +
                    '<div class="detail-paper-head">' +
                        '<div>' +
                            '<span class="detail-paper-tag">' + escapeHtml(letter.recipient) + '的一封信</span>' +
                            '<h3 class="detail-paper-title">' + escapeHtml(letter.title) + '</h3>' +
                        '</div>' +
                        '<div class="detail-paper-date">' +
                            '<strong>' + formatDate(letter.date) + '</strong>' +
                            '<span>' + escapeHtml(timingText) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="detail-letter-meta">' +
                        '<span>收信人：' + escapeHtml(letter.recipient) + '</span>' +
                        '<span>主题：信间详情</span>' +
                    '</div>' +
                    '<p class="detail-letter-content">' + escapeHtml(letter.content) + '</p>' +
                    '<p class="detail-letter-sign">寄自信间</p>' +
                '</article>';
        }).join('') : '<p class="letter-empty">这一天还没有信件。</p>';
        detailModal.hidden = false;
    }

    function closeModal() {
        detailModal.hidden = true;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    prevMonthBtn.addEventListener('click', function () {
        activeMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', function () {
        activeMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1);
        renderCalendar();
    });

    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', closeModal);
    }
    if (detailModal) {
        detailModal.addEventListener('click', function (event) {
            if (event.target === detailModal) {
                closeModal();
            }
        });
    }

    (async function init() {
        try {
            adminAllowed = await window.XinjianStore.isAdmin();
        } catch (e) {
            adminAllowed = false;
        }
        if (!adminAllowed) {
            historyCount.textContent = '0';
            emptyState.hidden = false;
            emptyState.textContent = '仅管理员可查看信件内容，请先登录管理员账号。';
            letterList.innerHTML = '';
            calendarGrid.innerHTML = '';
            return;
        }
        var letters = await getLetters();
        activeMonth = computeInitialMonthFromLetters(letters);
        await renderCalendar();
        await renderList();
    })();
})();
