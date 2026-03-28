(function () {
    'use strict';

    var API_BASE = window.API_BASE_URL || 'https://ours-i83n.vercel.app';
    var ADMIN_TOKEN_KEY = 'adminToken';
    var isAdmin = false;
    var eventsCache = [];
    var todosCache = [];
    var statsCache = [];

    var timelineTrack = document.getElementById('timelineTrack');
    var timelineTrackWrap = document.getElementById('timelineTrackWrap');
    var timelineYearTabs = document.getElementById('timelineYearTabs');
    var openEventFormBtn = document.getElementById('openEventFormBtn');
    var timelineModal = document.getElementById('timelineModal');
    var timelineModalTitle = document.getElementById('timelineModalTitle');
    var timelineModalDate = document.getElementById('timelineModalDate');
    var timelineModalContent = document.getElementById('timelineModalContent');
    var closeTimelineModal = document.getElementById('closeTimelineModal');
    var editEventBtn = document.getElementById('editEventBtn');
    var deleteEventBtn = document.getElementById('deleteEventBtn');
    var prevEventBtn = document.getElementById('prevEventBtn');
    var nextEventBtn = document.getElementById('nextEventBtn');
    var timelineFormModal = document.getElementById('timelineFormModal');
    var closeEventFormBtn = document.getElementById('closeEventFormBtn');
    var cancelEventFormBtn = document.getElementById('cancelEventFormBtn');
    var timelineEventForm = document.getElementById('timelineEventForm');
    var timelineFormTitle = document.getElementById('timelineFormTitle');

    var todoList = document.getElementById('todoList');
    var todoEmpty = document.getElementById('todoEmpty');
    var todoForm = document.getElementById('todoForm');
    var statsCards = document.getElementById('statsCards');

    var activeEventIndex = -1;
    var selectedYear = '';

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

    function apiRequest(path, options) {
        var opts = options || {};
        var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
        var token = getAdminToken();
        if (token) headers.Authorization = 'Bearer ' + token;
        return fetch(API_BASE + path, {
            method: opts.method || 'GET',
            headers: headers,
            body: typeof opts.body === 'undefined' ? undefined : JSON.stringify(opts.body)
        }).then(function (resp) {
            return resp.json().catch(function () {
                return {};
            }).then(function (data) {
                if (!resp.ok) {
                    throw new Error((data && data.error) || ('HTTP ' + resp.status));
                }
                return data;
            });
        });
    }

    function seedEvents() {
        return [
            { id: 'e1', date: '2019-04-17', title: '第一次相遇', desc: '那天在楼下碰见你，后来才发现我们有很多共同话题。' },
            { id: 'e2', date: '2020-08-06', title: '第一次牵手', desc: '走夜路的时候你突然牵住我，心跳快了很久。' },
            { id: 'e3', date: '2021-11-09', title: '第一次告白', desc: '你说"我们认真在一起吧"，这句话我记到现在。' },
            { id: 'e4', date: '2022-02-14', title: '第一个纪念日', desc: '我们去海边看日落，风很大但特别开心。' },
            { id: 'e5', date: '2023-06-25', title: '第一次远行', desc: '一起去陌生城市旅行，走错路也很好玩。' },
            { id: 'e6', date: '2024-12-31', title: '第一次跨年', desc: '在人群里倒数，零点那一刻你抱住了我。' }
        ];
    }

    function seedTodos() {
        return [
            { id: 't1', title: '去云南', desc: '看雪山和日照金山', done: false },
            { id: 't2', title: '见家长', desc: '找一个舒服的周末安排', done: false },
            { id: 't3', title: '一起学潜水', desc: '先把游泳技术练好', done: false }
        ];
    }

    function seedStats() {
        var today = new Date();
        var lastMeet = new Date(today);
        lastMeet.setDate(lastMeet.getDate() - 12);
        var endDistance = new Date(today);
        endDistance.setFullYear(endDistance.getFullYear() + 2);
        endDistance.setMonth(endDistance.getMonth() + 6);
        return [
            { id: 's1', theme: 'butter', label: '已经在一起', type: 'elapsed_days', date: '2021-11-09', unit: '天' },
            { id: 's2', theme: 'pink', label: '距离上次见面已经', type: 'elapsed_days', date: lastMeet.toISOString().slice(0, 10), unit: '天' },
            { id: 's3', theme: 'mint', label: '距离异地结束还有', type: 'remaining_years', date: endDistance.toISOString().slice(0, 10), unit: '年' }
        ];
    }

    function normalizeTodo(todo, index) {
        return {
            id: todo.id || 't-' + index + '-' + Date.now(),
            title: todo.title || '未命名事项',
            desc: todo.desc || '',
            done: !!todo.done
        };
    }

    function normalizeTodos(todos) {
        return (todos || []).map(normalizeTodo);
    }

    function getEvents() {
        return normalizeEvents(eventsCache);
    }

    function getStats() {
        return normalizeStats(statsCache);
    }

    function getTodos() {
        return normalizeTodos(todosCache);
    }

    function normalizeEvents(events) {
        return (events || []).map(function (event, index) {
            var normalizedDate = String(event.date || '').replace(/\./g, '-');
            if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalizedDate)) {
                var parts = normalizedDate.split('-');
                normalizedDate = parts[0] + '-' + String(parts[1]).padStart(2, '0') + '-' + String(parts[2]).padStart(2, '0');
            }
            return {
                id: event.id || 'e-' + index + '-' + Date.now(),
                date: normalizedDate || new Date().toISOString().slice(0, 10),
                title: event.title || '未命名节点',
                desc: event.desc || ''
            };
        }).sort(function (a, b) {
            return new Date(a.date) - new Date(b.date);
        });
    }

    function normalizeStats(stats) {
        return (stats || []).map(function (item, index) {
            var normalized = {
                id: item.id || 's-' + index,
                theme: item.theme || (index === 0 ? 'butter' : index === 1 ? 'pink' : 'mint'),
                label: item.label || '统计卡片',
                type: item.type || 'elapsed_days',
                date: String(item.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
                unit: item.unit || (item.type === 'remaining_years' ? '年' : '天')
            };

            if (normalized.id === 's2' && normalized.type === 'remaining_days') {
                normalized.type = 'elapsed_days';
                if (!item.label || item.label === '距离上次见面还有') {
                    normalized.label = '距离上次见面已经';
                }
                if (!item.unit) {
                    normalized.unit = '天';
                }
            }

            return normalized;
        });
    }

    function seedApiCollection(endpoint, items) {
        return Promise.all((items || []).map(function (item) {
            return apiRequest(endpoint, { method: 'POST', body: item }).catch(function () {
                return null;
            });
        }));
    }

    function loadEvents() {
        return apiRequest('/api/diandi-events').then(function (data) {
            var items = normalizeEvents(data.items || []);
            if (items.length) {
                eventsCache = items;
                return getEvents();
            }
            eventsCache = seedEvents();
            if (isAdmin) {
                return seedApiCollection('/api/diandi-events', eventsCache).then(function () {
                    return apiRequest('/api/diandi-events');
                }).then(function (seeded) {
                    var seededItems = normalizeEvents(seeded.items || []);
                    if (seededItems.length) eventsCache = seededItems;
                    return getEvents();
                }).catch(function () {
                    return getEvents();
                });
            }
            return getEvents();
        }).catch(function () {
            eventsCache = seedEvents();
            return getEvents();
        });
    }

    function loadTodos() {
        return apiRequest('/api/diandi-todos').then(function (data) {
            var items = normalizeTodos(data.items || []);
            if (items.length) {
                todosCache = items;
                return getTodos();
            }
            todosCache = seedTodos();
            if (isAdmin) {
                return seedApiCollection('/api/diandi-todos', todosCache).then(function () {
                    return apiRequest('/api/diandi-todos');
                }).then(function (seeded) {
                    var seededItems = normalizeTodos(seeded.items || []);
                    if (seededItems.length) todosCache = seededItems;
                    return getTodos();
                }).catch(function () {
                    return getTodos();
                });
            }
            return getTodos();
        }).catch(function () {
            todosCache = seedTodos();
            return getTodos();
        });
    }

    function loadStats() {
        return apiRequest('/api/diandi-stats').then(function (data) {
            var items = normalizeStats(data.items || []);
            if (items.length) {
                statsCache = items;
                return getStats();
            }
            statsCache = seedStats();
            if (isAdmin) {
                return seedApiCollection('/api/diandi-stats', statsCache).then(function () {
                    return apiRequest('/api/diandi-stats');
                }).then(function (seeded) {
                    var seededItems = normalizeStats(seeded.items || []);
                    if (seededItems.length) statsCache = seededItems;
                    return getStats();
                }).catch(function () {
                    return getStats();
                });
            }
            return getStats();
        }).catch(function () {
            statsCache = seedStats();
            return getStats();
        });
    }

    function getEventYear(event) {
        return String(event.date).slice(0, 4);
    }

    function getVisibleEvents() {
        var events = getEvents();
        return events.filter(function (event) {
            return !selectedYear || getEventYear(event) === selectedYear;
        });
    }

    function formatEventDate(dateString) {
        var parts = String(dateString).split('-');
        return parts[0] + '.' + parts[1] + '.' + parts[2];
    }

    function getMonthDayParts(dateString) {
        var parts = String(dateString).split('-');
        return {
            month: Number(parts[1] || 1),
            day: Number(parts[2] || 1)
        };
    }

    function renderYearTabs() {
        var years = [];
        getEvents().forEach(function (event) {
            var year = getEventYear(event);
            if (years.indexOf(year) === -1) {
                years.push(year);
            }
        });
        years.sort();

        if (years.length && years.indexOf(selectedYear) === -1) {
            selectedYear = years[years.length - 1];
        }

        if (!selectedYear && years.length) {
            selectedYear = years[years.length - 1];
        }

        timelineYearTabs.innerHTML = years.map(function (year) {
            var activeClass = year === selectedYear ? 'timeline-year-tab is-active' : 'timeline-year-tab';
            return '<button type="button" class="' + activeClass + '" data-year="' + year + '">' + year + '</button>';
        }).join('');

        timelineYearTabs.querySelectorAll('[data-year]').forEach(function (button) {
            button.addEventListener('click', function () {
                selectedYear = button.getAttribute('data-year') || '';
                renderTimeline();
                renderYearTabs();
            });
        });
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function calculateStatValue(item) {
        var today = startOfDay(new Date());
        var target = startOfDay(new Date(item.date));
        var diffDays = Math.round((target - today) / 86400000);

        if (item.type === 'elapsed_days') {
            return Math.max(0, Math.round((today - target) / 86400000));
        }

        if (item.type === 'remaining_years') {
            var years = Math.max(0, (target - today) / 86400000 / 365);
            return years.toFixed(years >= 10 ? 0 : 1);
        }

        return Math.max(0, diffDays);
    }

    function renderStats() {
        if (!statsCards) return;
        var items = getStats();
        statsCards.innerHTML = items.map(function (item) {
            return '' +
                '<button type="button" class="stats-card stats-card--' + item.theme + '" data-stat-id="' + item.id + '">' +
                    '<p class="stats-card-label">' + escapeHtml(item.label) + '</p>' +
                    '<div class="stats-card-value">' +
                        '<span class="stats-card-number">' + calculateStatValue(item) + '</span>' +
                        '<span class="stats-card-unit">' + escapeHtml(item.unit) + '</span>' +
                    '</div>' +
                    '<p class="stats-card-tip">点击修改文案和日期</p>' +
                '</button>';
        }).join('');

        statsCards.querySelectorAll('[data-stat-id]').forEach(function (button) {
            button.addEventListener('click', function () {
                var id = button.getAttribute('data-stat-id');
                editStatCard(id);
            });
        });
    }

    function editStatCard(id) {
        if (!isAdmin) {
            window.alert('仅管理员可编辑统计卡片');
            return;
        }
        var items = getStats();
        var target = items.find(function (item) { return item.id === id; });
        if (!target) return;

        var nextLabel = window.prompt('编辑卡片文案', target.label);
        if (nextLabel === null) return;
        var nextDate = window.prompt('编辑日期（格式：YYYY-MM-DD）', target.date);
        if (nextDate === null) return;
        var nextUnit = window.prompt('编辑单位（例如：天 / 年）', target.unit);
        if (nextUnit === null) return;

        if (/^\d{4}-\d{2}-\d{2}$/.test(nextDate.trim())) {
            target.date = nextDate.trim();
        }
        target.label = nextLabel.trim() || target.label;
        target.unit = nextUnit.trim() || target.unit;
        apiRequest('/api/diandi-stats?id=' + encodeURIComponent(target.id), {
            method: 'PATCH',
            body: {
                label: target.label,
                date: target.date,
                unit: target.unit
            }
        }).then(function () {
            statsCache = items;
            renderStats();
        }).catch(function (error) {
            window.alert('保存统计卡片失败：' + error.message);
        });
    }

    function renderTimeline() {
        var events = getVisibleEvents();
        timelineTrack.style.minWidth = Math.max(events.length * 160 + 120, timelineTrackWrap.clientWidth || 0) + 'px';
        timelineTrack.innerHTML = events.map(function (event, index) {
            var cls = index % 2 === 0 ? 'timeline-node timeline-node--mint' : 'timeline-node timeline-node--pink';
            var monthDay = getMonthDayParts(event.date);
            return '' +
                '<button type="button" class="' + cls + '" data-index="' + index + '">' +
                    '<p class="timeline-node-date">' + monthDay.month + '月' + monthDay.day + '日</p>' +
                    '<p class="timeline-node-label">' + escapeHtml(event.title) + '</p>' +
                    '<p class="timeline-node-desc">' + escapeHtml(event.desc).slice(0, 24) + (event.desc.length > 24 ? '...' : '') + '</p>' +
                '</button>';
        }).join('');

        timelineTrack.querySelectorAll('.timeline-node').forEach(function (node) {
            node.addEventListener('click', function () {
                var idx = Number(node.getAttribute('data-index'));
                openEventModal(idx);
            });
        });
    }

    function openEventModal(index) {
        var events = getVisibleEvents();
        if (!events.length) return;
        activeEventIndex = Math.max(0, Math.min(index, events.length - 1));
        var event = events[activeEventIndex];
        timelineModalTitle.textContent = event.title;
        timelineModalDate.textContent = formatEventDate(event.date);
        timelineModalContent.textContent = event.desc;
        timelineModal.hidden = false;
    }

    function closeEventModal() {
        timelineModal.hidden = true;
    }

    function showPrevEvent() {
        var events = getVisibleEvents();
        if (!events.length) return;
        var nextIndex = activeEventIndex - 1 < 0 ? events.length - 1 : activeEventIndex - 1;
        openEventModal(nextIndex);
    }

    function showNextEvent() {
        var events = getVisibleEvents();
        if (!events.length) return;
        var nextIndex = activeEventIndex + 1 >= events.length ? 0 : activeEventIndex + 1;
        openEventModal(nextIndex);
    }

    function openEventForm(eventItem) {
        if (!isAdmin) {
            window.alert('仅管理员可新增或编辑时间节点');
            return;
        }
        timelineFormModal.hidden = false;
        if (eventItem) {
            timelineFormTitle.textContent = '编辑时间轴节点';
            timelineEventForm.querySelector('[name="eventId"]').value = eventItem.id;
            timelineEventForm.querySelector('[name="eventDate"]').value = eventItem.date;
            timelineEventForm.querySelector('[name="eventTitle"]').value = eventItem.title;
            timelineEventForm.querySelector('[name="eventDesc"]').value = eventItem.desc;
        } else {
            timelineFormTitle.textContent = '新增时间轴节点';
            timelineEventForm.reset();
            timelineEventForm.querySelector('[name="eventId"]').value = '';
            timelineEventForm.querySelector('[name="eventDate"]').value = (selectedYear || new Date().getFullYear()) + '-01-01';
        }
    }

    function closeEventForm() {
        timelineFormModal.hidden = true;
        timelineEventForm.reset();
    }

    function editActiveEvent() {
        if (!isAdmin) {
            window.alert('仅管理员可编辑时间节点');
            return;
        }
        var events = getVisibleEvents();
        if (activeEventIndex < 0 || !events[activeEventIndex]) return;
        closeEventModal();
        openEventForm(events[activeEventIndex]);
    }

    function deleteActiveEvent() {
        if (!isAdmin) {
            window.alert('仅管理员可删除时间节点');
            return;
        }
        var events = getEvents();
        var visibleEvents = getVisibleEvents();
        if (activeEventIndex < 0 || !visibleEvents[activeEventIndex]) return;
        var currentId = visibleEvents[activeEventIndex].id;
        apiRequest('/api/diandi-events?id=' + encodeURIComponent(currentId), {
            method: 'DELETE'
        }).then(function () {
            eventsCache = events.filter(function (event) {
                return event.id !== currentId;
            });
            closeEventModal();
            renderYearTabs();
            renderTimeline();
        }).catch(function (error) {
            window.alert('删除节点失败：' + error.message);
        });
    }

    function renderTodos() {
        var todos = getTodos();
        var orderedTodos = todos.slice().sort(function (a, b) {
            return Number(!!a.done) - Number(!!b.done);
        });
        todoEmpty.hidden = todos.length !== 0;

        if (!todos.length) {
            todoList.innerHTML = '';
            return;
        }

        todoList.innerHTML = orderedTodos.map(function (todo) {
            var doneClass = todo.done ? ' todo-item--done' : '';
            return '' +
                '<article class="todo-item' + doneClass + '">' +
                    '<input type="checkbox" class="todo-check" data-check-id="' + todo.id + '" ' + (todo.done ? 'checked' : '') + '>' +
                    '<div>' +
                        '<h3 class="todo-item-title">' + escapeHtml(todo.title) + '</h3>' +
                        '<p class="todo-item-desc">' + escapeHtml(todo.desc || '') + '</p>' +
                    '</div>' +
                    '<button type="button" class="todo-item-remove" data-remove-id="' + todo.id + '">删除</button>' +
                '</article>';
        }).join('');

        todoList.querySelectorAll('[data-check-id]').forEach(function (check) {
            check.addEventListener('change', function () {
                if (!isAdmin) {
                    check.checked = !check.checked;
                    window.alert('仅管理员可修改"未来要一起做的事情"');
                    return;
                }
                var id = check.getAttribute('data-check-id');
                var next = getTodos();
                var target = next.find(function (todo) { return todo.id === id; });
                if (target) {
                    target.done = !!check.checked;
                }
                apiRequest('/api/diandi-todos?id=' + encodeURIComponent(id), {
                    method: 'PATCH',
                    body: { done: !!check.checked }
                }).then(function () {
                    todosCache = next;
                    renderTodos();
                }).catch(function (error) {
                    check.checked = !check.checked;
                    window.alert('保存清单失败：' + error.message);
                });
            });
        });

        todoList.querySelectorAll('[data-remove-id]').forEach(function (button) {
            button.addEventListener('click', function () {
                if (!isAdmin) {
                    window.alert('仅管理员可修改"未来要一起做的事情"');
                    return;
                }
                var id = button.getAttribute('data-remove-id');
                var left = getTodos().filter(function (todo) {
                    return todo.id !== id;
                });
                apiRequest('/api/diandi-todos?id=' + encodeURIComponent(id), {
                    method: 'DELETE'
                }).then(function () {
                    todosCache = left;
                    renderTodos();
                }).catch(function (error) {
                    window.alert('删除清单失败：' + error.message);
                });
            });
        });
    }

    todoForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!isAdmin) {
            window.alert('仅管理员可新增"未来要一起做的事情"');
            return;
        }
        var formData = new FormData(todoForm);
        var title = String(formData.get('todoTitle') || '').trim();
        if (!title) return;

        var todos = getTodos();
        todos.push({
            title: title,
            desc: String(formData.get('todoDesc') || '').trim(),
            done: false
        });
        apiRequest('/api/diandi-todos', {
            method: 'POST',
            body: todos[todos.length - 1]
        }).then(function () {
            return loadTodos();
        }).then(function () {
            todoForm.reset();
            renderTodos();
        }).catch(function (error) {
            window.alert('新增清单失败：' + error.message);
        });
    });

    timelineEventForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!isAdmin) {
            window.alert('仅管理员可新增或编辑时间节点');
            return;
        }
        var formData = new FormData(timelineEventForm);
        var id = String(formData.get('eventId') || '').trim();
        var payload = {
            date: String(formData.get('eventDate') || '').trim(),
            title: String(formData.get('eventTitle') || '').trim(),
            desc: String(formData.get('eventDesc') || '').trim()
        };
        var request = id
            ? apiRequest('/api/diandi-events?id=' + encodeURIComponent(id), { method: 'PATCH', body: payload })
            : apiRequest('/api/diandi-events', { method: 'POST', body: payload });

        request.then(function () {
            selectedYear = getEventYear(payload);
            closeEventForm();
            return loadEvents();
        }).then(function () {
            renderYearTabs();
            renderTimeline();
        }).catch(function (error) {
            window.alert('保存时间节点失败：' + error.message);
        });
    });

    closeTimelineModal.addEventListener('click', closeEventModal);
    timelineModal.addEventListener('click', function (event) {
        if (event.target === timelineModal) {
            closeEventModal();
        }
    });
    prevEventBtn.addEventListener('click', showPrevEvent);
    nextEventBtn.addEventListener('click', showNextEvent);
    editEventBtn.addEventListener('click', editActiveEvent);
    deleteEventBtn.addEventListener('click', deleteActiveEvent);
    openEventFormBtn.addEventListener('click', function () {
        openEventForm(null);
    });
    closeEventFormBtn.addEventListener('click', closeEventForm);
    cancelEventFormBtn.addEventListener('click', closeEventForm);
    timelineFormModal.addEventListener('click', function (event) {
        if (event.target === timelineFormModal) {
            closeEventForm();
        }
    });

    checkAdmin().then(function (ok) {
        isAdmin = ok;
        if (!isAdmin) {
            openEventFormBtn.style.opacity = '0.55';
            openEventFormBtn.title = '仅管理员可新增';
            if (editEventBtn) editEventBtn.style.display = 'none';
            if (deleteEventBtn) deleteEventBtn.style.display = 'none';
        }
        return Promise.all([loadEvents(), loadStats(), loadTodos()]);
    }).then(function () {
        renderYearTabs();
        renderTimeline();
        renderStats();
        renderTodos();
    }).catch(function () {
        renderYearTabs();
        renderTimeline();
        renderStats();
        renderTodos();
    });
    window.setInterval(renderStats, 60000);
})();
