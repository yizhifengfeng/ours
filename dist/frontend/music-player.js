/**
 * 全站通用壳层：
 * 1) 顶部固定导航栏
 * 2) 左下角背景音乐播放器（点击图标切换播放/暂停，并弹出音乐卡片）
 * 3) 音乐通过持久宿主窗口承载，尽量避免整页切换时断音
 */
(function () {
    'use strict';

    var API_BASE = window.API_BASE_URL || window.location.origin;
    var SETTINGS_KEY = 'siteMusicSettings';
    var PROGRESS_KEY = 'siteMusicProgress';
    var HOST_HEARTBEAT_KEY = 'siteMusicHostHeartbeat';
    var DB_NAME = 'siteMusicDB';
    var DB_VERSION = 1;
    var STORE_NAME = 'tracks';
    var CUSTOM_TRACK_ID = 'custom-track';
    var DEFAULT_TRACK_SRC = 'assets/default-music.ogg';
    var DEFAULT_TRACK_NAME = 'Chopin Nocturne';
    var PANEL_AUTO_CLOSE_MS = 3800;
    var HOST_WINDOW_NAME = 'siteMusicPersistentHost';
    var HOST_AUDIO_ID = 'siteMusicHostAudio';
    var HOST_HEARTBEAT_TTL = 5000;

    var settings = loadSettings();
    var currentObjectUrl = '';
    var localAudio;
    var audio;
    var hostWindow = null;
    var widgetEl;
    var toggleButton;
    var toggleGlyph;
    var uploadInput;
    var trackNameEl;
    var panelTimer = 0;
    var lastProgressWriteAt = 0;
    var boundAudio = null;
    var isRestoringProgress = false;
    var isAdmin = false;
    var adminNavLabelEl = null;

    function loadSettings() {
        try {
            var raw = window.localStorage.getItem(SETTINGS_KEY);
            if (!raw) {
                return {
                    source: 'default',
                    trackName: DEFAULT_TRACK_NAME,
                    isPlaying: true,
                    hasInteracted: false
                };
            }
            var parsed = JSON.parse(raw);
            return {
                source: parsed.source === 'custom' ? 'custom' : 'default',
                trackName: parsed.trackName || DEFAULT_TRACK_NAME,
                isPlaying: parsed.isPlaying !== false,
                hasInteracted: !!parsed.hasInteracted
            };
        } catch (error) {
            return {
                source: 'default',
                trackName: DEFAULT_TRACK_NAME,
                isPlaying: true,
                hasInteracted: false
            };
        }
    }

    function saveSettings() {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function getSourceKey() {
        return settings.source === 'custom' ? 'custom' : 'default';
    }

    function saveProgress(force) {
        if (!audio || !isFinite(audio.currentTime)) return;
        var now = Date.now();
        if (!force && now - lastProgressWriteAt < 1000) return;
        lastProgressWriteAt = now;
        window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({
            source: getSourceKey(),
            time: audio.currentTime,
            updatedAt: now
        }));
    }

    function loadProgress() {
        try {
            var raw = window.localStorage.getItem(PROGRESS_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.time !== 'number') return null;
            return parsed;
        } catch (error) {
            return null;
        }
    }

    function openDb() {
        return new Promise(function (resolve, reject) {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB unavailable'));
                return;
            }

            var request = window.indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function () {
                var db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error || new Error('IndexedDB open failed')); };
        });
    }

    function saveCustomTrack(file) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var transaction = db.transaction(STORE_NAME, 'readwrite');
                var store = transaction.objectStore(STORE_NAME);
                store.put({ id: CUSTOM_TRACK_ID, blob: file, name: file.name, type: file.type });
                transaction.oncomplete = function () { db.close(); resolve(); };
                transaction.onerror = function () { db.close(); reject(transaction.error || new Error('Save custom track failed')); };
            });
        });
    }

    function readCustomTrack() {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var transaction = db.transaction(STORE_NAME, 'readonly');
                var store = transaction.objectStore(STORE_NAME);
                var request = store.get(CUSTOM_TRACK_ID);
                request.onsuccess = function () { db.close(); resolve(request.result || null); };
                request.onerror = function () { db.close(); reject(request.error || new Error('Read custom track failed')); };
            });
        }).catch(function () {
            return null;
        });
    }

    function getHeartbeatAge() {
        try {
            var raw = Number(window.localStorage.getItem(HOST_HEARTBEAT_KEY) || 0);
            return raw ? Date.now() - raw : Number.POSITIVE_INFINITY;
        } catch (error) {
            return Number.POSITIVE_INFINITY;
        }
    }

    function hasFreshHostHeartbeat() {
        return getHeartbeatAge() < HOST_HEARTBEAT_TTL;
    }

    function getHostAudio(win) {
        try {
            if (!win || win.closed || !win.document) return null;
            return win.document.getElementById(HOST_AUDIO_ID) || null;
        } catch (error) {
            return null;
        }
    }

    function writeHostMarkup(win) {
        win.document.open();
        win.document.write(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Music Host</title>' +
            '<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff;}audio{display:none;}</style>' +
            '</head><body><audio id="' + HOST_AUDIO_ID + '" loop preload="auto" aria-hidden="true"></audio></body></html>'
        );
        win.document.close();
    }

    function setupHostWindow(win) {
        if (!win || win.closed) return null;

        try {
            if (!getHostAudio(win)) {
                writeHostMarkup(win);
            }
            if (!win.__siteMusicHeartbeatTimer) {
                win.__siteMusicHeartbeatTimer = win.setInterval(function () {
                    try {
                        win.localStorage.setItem(HOST_HEARTBEAT_KEY, String(Date.now()));
                    } catch (error) {}
                }, 1000);
            }
            if (!win.__siteMusicBeforeUnloadBound) {
                win.__siteMusicBeforeUnloadBound = true;
                win.addEventListener('beforeunload', function () {
                    try {
                        win.localStorage.removeItem(HOST_HEARTBEAT_KEY);
                    } catch (error) {}
                    if (win.__siteMusicObjectUrl) {
                        try {
                            win.URL.revokeObjectURL(win.__siteMusicObjectUrl);
                        } catch (error) {}
                        win.__siteMusicObjectUrl = '';
                    }
                });
            }
            try {
                win.localStorage.setItem(HOST_HEARTBEAT_KEY, String(Date.now()));
            } catch (error) {}
            hostWindow = win;
            return getHostAudio(win);
        } catch (error) {
            return null;
        }
    }

    function connectToExistingHost() {
        if (hostWindow && !hostWindow.closed) {
            var directAudio = getHostAudio(hostWindow);
            if (directAudio) {
                audio = directAudio;
                return directAudio;
            }
        }

        if (!hasFreshHostHeartbeat()) return null;

        try {
            hostWindow = window.open('', HOST_WINDOW_NAME);
        } catch (error) {
            hostWindow = null;
        }

        var hostAudio = getHostAudio(hostWindow);
        if (hostAudio) {
            audio = hostAudio;
            return hostAudio;
        }
        return null;
    }

    function ensureHostWindowFromGesture() {
        var existing = connectToExistingHost();
        if (existing) return existing;
        // 禁止自动弹窗：未连接到已存在宿主窗口时，保持当前页本地播放。
        audio = localAudio || audio;
        return audio;
    }

    function createTopNav() {
        var nav = document.createElement('nav');
        nav.className = 'site-top-nav';
        nav.setAttribute('aria-label', '全站导航');
        nav.innerHTML = '' +
            '<div class="site-top-nav-main">' +
                '<a href="index.html">首页</a>' +
                '<a href="where.html">去哪儿</a>' +
                '<a href="xinjian.html">信间</a>' +
                '<a href="diandi.html">点滴</a>' +
                '<a href="liuyan.html">留言板</a>' +
                '<a href="first.html">初时</a>' +
                '<a href="keyword.html">关键词</a>' +
            '</div>' +
            '<div class="site-top-nav-admin">' +
                '<a href="admin-login.html" class="site-admin-entry" aria-label="管理员登录">' +
                    '<span class="site-admin-avatar" aria-hidden="true">管</span>' +
                    '<span class="site-admin-name">管理员</span>' +
                '</a>' +
            '</div>';
        document.body.appendChild(nav);
        document.body.classList.add('has-top-nav');
        adminNavLabelEl = nav.querySelector('.site-admin-name');

        var currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        Array.prototype.forEach.call(nav.querySelectorAll('a'), function (link) {
            var href = (link.getAttribute('href') || '').toLowerCase();
            if (href === currentFile) {
                link.classList.add('is-active');
            }
        });
    }

    function createMusicUi() {
        widgetEl = document.createElement('div');
        widgetEl.className = 'music-widget';
        widgetEl.innerHTML = '' +
            '<button type="button" class="music-toggle" aria-label="播放或暂停背景音乐">' +
                '<span class="music-toggle-glyph" aria-hidden="true">♪</span>' +
            '</button>' +
            '<div class="music-panel" aria-hidden="true">' +
                '<div class="music-track-name" title=""></div>' +
                '<label class="music-upload-btn" aria-label="上传背景音乐">' +
                    '<input class="music-upload-input" type="file" accept="audio/*">' +
                    '<span>上传音乐</span>' +
                '</label>' +
            '</div>';
        document.body.appendChild(widgetEl);

        toggleButton = widgetEl.querySelector('.music-toggle');
        toggleGlyph = widgetEl.querySelector('.music-toggle-glyph');
        uploadInput = widgetEl.querySelector('.music-upload-input');
        trackNameEl = widgetEl.querySelector('.music-track-name');

        localAudio = document.createElement('audio');
        localAudio.loop = true;
        localAudio.preload = 'auto';
        localAudio.setAttribute('aria-hidden', 'true');
        localAudio.style.display = 'none';
        document.body.appendChild(localAudio);
        audio = localAudio;
    }

    function getAdminToken() {
        try {
            return window.localStorage.getItem('adminToken') || '';
        } catch (e) {
            return '';
        }
    }

    function checkAdmin() {
        var token = getAdminToken();
        if (!token) return Promise.resolve(false);
        return fetch(API_BASE + '/api/admin?action=me', {
            headers: { Authorization: 'Bearer ' + token }
        }).then(function (resp) {
            return resp.ok;
        }).catch(function () {
            return false;
        });
    }

    function mapAdminName(username) {
        var key = String(username || '').trim().toLowerCase();
        if (key === 'yizhifengfeng') return '大福';
        if (key === 'zhouzhou') return '舟舟';
        return '管理员';
    }

    function fetchAdminProfile() {
        var token = getAdminToken();
        if (!token) return Promise.resolve(null);
        return fetch(API_BASE + '/api/admin?action=me', {
            headers: { Authorization: 'Bearer ' + token }
        }).then(function (resp) {
            if (!resp.ok) return null;
            return resp.json();
        }).then(function (data) {
            return data && data.admin ? data.admin : null;
        }).catch(function () {
            return null;
        });
    }

    function updateAdminNavDisplay(adminProfile) {
        if (!adminNavLabelEl) return;
        if (!adminProfile) {
            adminNavLabelEl.textContent = '管理员';
            return;
        }
        adminNavLabelEl.textContent = mapAdminName(adminProfile.username);
    }

    function getFileExt(name) {
        var base = String(name || '').toLowerCase();
        var idx = base.lastIndexOf('.');
        if (idx < 0) return 'mp3';
        return base.slice(idx + 1).replace(/[^a-z0-9]/g, '') || 'mp3';
    }

    function toPublicMusicUrl(bucket, path) {
        var customBase = window.SUPABASE_PUBLIC_BASE_URL || '';
        if (customBase) {
            return customBase.replace(/\/$/, '') + '/storage/v1/object/public/' + encodeURIComponent(bucket) + '/' + path.split('/').map(encodeURIComponent).join('/');
        }
        return '';
    }

    function fetchCurrentMusicMeta() {
        return fetch(API_BASE + '/api/music?resource=current')
            .then(function (resp) { return resp.ok ? resp.json() : { item: null }; })
            .then(function (data) { return data && data.item ? data.item : null; })
            .catch(function () { return null; });
    }

    function uploadMusicToCloud(file) {
        var apiBase = API_BASE;
        var ext = getFileExt(file.name);
        return fetch(apiBase + '/api/music-upload-sign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + getAdminToken()
            },
            body: JSON.stringify({
                bucket: 'uploads-music',
                ext: ext,
                contentType: file.type || 'audio/mpeg'
            })
        }).then(function (resp) {
            return resp.json().then(function (data) {
                if (!resp.ok) throw new Error((data && data.error) || '签名失败');
                return data;
            });
        }).then(function (signData) {
            var signedUrl = signData.signedUrl;
            if (!signedUrl) throw new Error('签名地址缺失');
            return fetch(signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                body: file
            }).then(function (putResp) {
                if (!putResp.ok) throw new Error('上传文件失败');
                return signData;
            });
        }).then(function (signData) {
            return fetch(apiBase + '/api/music?resource=tracks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + getAdminToken()
                },
                body: JSON.stringify({
                    title: file.name || '管理员上传音乐',
                    bucket: signData.bucket,
                    path: signData.path
                })
            }).then(function (resp) {
                return resp.json().then(function (data) {
                    if (!resp.ok) throw new Error((data && data.error) || '写入曲目失败');
                    return data.item;
                });
            });
        }).then(function (trackItem) {
            return fetch(apiBase + '/api/music?resource=current', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + getAdminToken()
                },
                body: JSON.stringify({ trackId: trackItem.id })
            }).then(function (resp) {
                return resp.json().then(function (data) {
                    if (!resp.ok) throw new Error((data && data.error) || '设置当前曲目失败');
                    return trackItem;
                });
            });
        });
    }

    function applyUploadPermission() {
        var uploadLabel = widgetEl ? widgetEl.querySelector('.music-upload-btn') : null;
        if (!uploadLabel) return;
        uploadLabel.style.display = isAdmin ? '' : 'none';
    }

    function setPanelOpen(open) {
        if (!widgetEl) return;
        widgetEl.classList.toggle('is-open', open);
        var panel = widgetEl.querySelector('.music-panel');
        if (panel) {
            panel.setAttribute('aria-hidden', String(!open));
        }
    }

    function openPanelTemporarily() {
        setPanelOpen(true);
        if (panelTimer) window.clearTimeout(panelTimer);
        panelTimer = window.setTimeout(function () {
            setPanelOpen(false);
        }, PANEL_AUTO_CLOSE_MS);
    }

    function updateUi() {
        var isPaused = !audio || audio.paused;
        if (toggleButton) {
            toggleButton.classList.toggle('is-playing', !isPaused);
            toggleButton.classList.toggle('is-paused', isPaused);
            toggleButton.setAttribute('aria-pressed', String(!isPaused));
        }
        if (toggleGlyph) {
            toggleGlyph.textContent = isPaused ? '♪' : 'Ⅱ';
        }
        if (trackNameEl) {
            trackNameEl.textContent = settings.trackName || DEFAULT_TRACK_NAME;
            trackNameEl.title = settings.trackName || DEFAULT_TRACK_NAME;
        }
    }

    function handleTimeUpdate() {
        if (isRestoringProgress) return;
        saveProgress(false);
    }

    function bindAudioEvents() {
        if (!audio || audio === boundAudio) return;
        if (boundAudio) {
            boundAudio.removeEventListener('play', updateUi);
            boundAudio.removeEventListener('pause', updateUi);
            boundAudio.removeEventListener('timeupdate', handleTimeUpdate);
        }
        audio.addEventListener('play', updateUi);
        audio.addEventListener('pause', updateUi);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        boundAudio = audio;
    }

    function revokeObjectUrl() {
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = '';
        }
    }

    function revokeHostObjectUrl() {
        if (!hostWindow || hostWindow.closed || !hostWindow.__siteMusicObjectUrl) return;
        try {
            hostWindow.URL.revokeObjectURL(hostWindow.__siteMusicObjectUrl);
        } catch (error) {}
        hostWindow.__siteMusicObjectUrl = '';
    }

    function resolveTrackSrc(forceReload) {
        var sourceKey = getSourceKey();
        if (audio && !forceReload && audio.dataset && audio.dataset.sourceKey === sourceKey && audio.currentSrc) {
            return Promise.resolve(audio.currentSrc);
        }

        return fetchCurrentMusicMeta().then(function (musicItem) {
            if (musicItem && (musicItem.publicUrl || musicItem.path)) {
                var cloudUrl = musicItem.publicUrl || toPublicMusicUrl(musicItem.bucket || 'uploads-music', musicItem.path);
                if (cloudUrl) {
                    settings.trackName = musicItem.title || DEFAULT_TRACK_NAME;
                    settings.source = 'default';
                    saveSettings();
                    if (audio === localAudio) revokeObjectUrl();
                    else revokeHostObjectUrl();
                    return cloudUrl;
                }
            }

            if (settings.source !== 'custom') {
                if (audio === localAudio) revokeObjectUrl();
                else revokeHostObjectUrl();
                return DEFAULT_TRACK_SRC;
            }

            return readCustomTrack().then(function (record) {
                if (!record || !record.blob) {
                    settings.source = 'default';
                    settings.trackName = DEFAULT_TRACK_NAME;
                    saveSettings();
                    if (audio === localAudio) revokeObjectUrl();
                    else revokeHostObjectUrl();
                    return DEFAULT_TRACK_SRC;
                }

                if (audio === localAudio) {
                    revokeObjectUrl();
                    currentObjectUrl = URL.createObjectURL(record.blob);
                    return currentObjectUrl;
                }

                revokeHostObjectUrl();
                hostWindow.__siteMusicObjectUrl = hostWindow.URL.createObjectURL(record.blob);
                return hostWindow.__siteMusicObjectUrl;
            });
        });
    }

    function ensureTrackLoaded(forceReload) {
        bindAudioEvents();
        return resolveTrackSrc(forceReload).then(function (src) {
            var sourceKey = getSourceKey();
            if (!forceReload && audio && audio.dataset && audio.dataset.sourceKey === sourceKey && audio.currentSrc) {
                updateUi();
                return;
            }
            audio.src = src;
            if (audio.dataset) {
                audio.dataset.sourceKey = sourceKey;
            }
            audio.load();
            return restoreProgressWhenReady().then(function () {
                updateUi();
            });
        });
    }

    function playAudio() {
        settings.isPlaying = true;
        saveSettings();
        bindAudioEvents();
        return audio.play().then(function () {
            updateUi();
        }).catch(function () {
            updateUi();
        });
    }

    function pauseAudio() {
        audio.pause();
        settings.isPlaying = false;
        saveSettings();
        updateUi();
    }

    function restoreProgressWhenReady() {
        var progress = loadProgress();
        if (!progress) return Promise.resolve();
        if (progress.source !== getSourceKey()) return Promise.resolve();
        if (!isFinite(progress.time) || progress.time < 0) return Promise.resolve();
        var maxResumeSeconds = 60 * 60 * 6;
        if (Date.now() - (progress.updatedAt || 0) > maxResumeSeconds * 1000) return Promise.resolve();

        return new Promise(function (resolve) {
            var settled = false;
            var settle = function () {
                if (settled) return;
                settled = true;
                isRestoringProgress = false;
                resolve();
            };
            var onMeta = function () {
                audio.removeEventListener('loadedmetadata', onMeta);
                try {
                    var maxSeek = Math.max(0, (audio.duration || 0) - 1);
                    audio.currentTime = Math.min(progress.time, maxSeek || progress.time);
                } catch (error) {}
                settle();
            };

            isRestoringProgress = true;
            if (audio.readyState >= 1) {
                onMeta();
                return;
            }

            audio.addEventListener('loadedmetadata', onMeta);
            window.setTimeout(settle, 1200);
        });
    }

    function attachFirstInteractionAutoplay() {
        var activated = false;
        function handleFirstInteraction() {
            if (activated) return;
            activated = true;
            settings.hasInteracted = true;
            saveSettings();
            ensureHostWindowFromGesture();
            ensureTrackLoaded(false).then(function () {
                if (settings.isPlaying) {
                    return playAudio();
                }
                return null;
            });
            window.removeEventListener('pointerdown', handleFirstInteraction, true);
            window.removeEventListener('keydown', handleFirstInteraction, true);
            window.removeEventListener('touchstart', handleFirstInteraction, true);
        }
        window.addEventListener('pointerdown', handleFirstInteraction, true);
        window.addEventListener('keydown', handleFirstInteraction, true);
        window.addEventListener('touchstart', handleFirstInteraction, true);
    }

    function isInternalNavigationTarget(anchor, event) {
        if (!anchor) return false;
        if (event.defaultPrevented) return false;
        if (anchor.target && anchor.target !== '_self') return false;
        if (anchor.hasAttribute('download')) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

        var href = anchor.getAttribute('href') || '';
        if (!href || href.indexOf('javascript:') === 0 || href.charAt(0) === '#') return false;

        try {
            var url = new URL(href, window.location.href);
            if (url.origin !== window.location.origin) return false;
            if (!/\.html(?:$|\?)/i.test(url.pathname + url.search)) return false;
            return true;
        } catch (error) {
            return false;
        }
    }

    function preparePlaybackForNavigation() {
        if (!audio || audio.paused) return;
        bindAudioEvents();
        saveProgress(true);
    }

    function bindEvents() {
        toggleButton.addEventListener('click', function () {
            settings.hasInteracted = true;
            saveSettings();
            ensureHostWindowFromGesture();
            ensureTrackLoaded(false).then(function () {
                if (audio.paused) return playAudio();
                pauseAudio();
                return null;
            }).finally(function () {
                openPanelTemporarily();
            });
        });

        uploadInput.addEventListener('change', function () {
            if (!isAdmin) {
                window.alert('仅管理员可上传音乐');
                uploadInput.value = '';
                return;
            }
            var file = uploadInput.files && uploadInput.files[0];
            if (!file) return;

            ensureHostWindowFromGesture();
            uploadMusicToCloud(file).then(function () {
                settings.trackName = file.name || '管理员上传音乐';
                settings.source = 'default';
                settings.isPlaying = true;
                settings.hasInteracted = true;
                saveSettings();
                return ensureTrackLoaded(true);
            }).then(function () {
                return playAudio();
            }).then(function () {
                openPanelTemporarily();
                window.alert('已上传并切换为全站共享音乐');
            }).catch(function () {
                window.alert('上传音乐失败，请检查管理员登录和 Supabase 配置');
            }).finally(function () {
                uploadInput.value = '';
            });
        });

        document.addEventListener('click', function (event) {
            var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
            if (isInternalNavigationTarget(anchor, event)) {
                preparePlaybackForNavigation();
            }

            if (!widgetEl || !widgetEl.classList.contains('is-open')) return;
            if (!widgetEl.contains(event.target)) setPanelOpen(false);
        }, true);

        window.addEventListener('beforeunload', function () {
            saveProgress(true);
        });
    }

    function init() {
        createTopNav();
        createMusicUi();
        fetchAdminProfile().then(function (adminProfile) {
            updateAdminNavDisplay(adminProfile);
            isAdmin = !!adminProfile;
            applyUploadPermission();
        }).catch(function () {
            isAdmin = false;
            updateAdminNavDisplay(null);
            applyUploadPermission();
        });
        connectToExistingHost();
        bindAudioEvents();
        bindEvents();

        ensureTrackLoaded(false).then(function () {
            if (settings.hasInteracted) {
                if (settings.isPlaying && audio && audio.paused) {
                    return playAudio();
                }
                updateUi();
                return null;
            }
            attachFirstInteractionAutoplay();
            return null;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
