;(function () {
    'use strict';
    var API_BASE = window.API_BASE_URL || 'https://ours-i83n.vercel.app';
    var DEFAULT_TRACK_SRC = 'assets/default-music.ogg';
    var DEFAULT_TRACK_NAME = 'Chopin Nocturne';
    var PANEL_AUTO_CLOSE_MS = 3800;
    var SETTINGS_KEY = 'siteMusicSettings';
    var PROGRESS_KEY = 'siteMusicProgress';
    var widgetEl, toggleBtn, glyphEl, panelEl, trackNameEl, uploadInput, audioEl;
    var isAdmin = false;
    var panelTimer = 0;
    var settings = readSettings();
    function readSettings() {
      try {
        var raw = window.localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { isPlaying: true, trackName: DEFAULT_TRACK_NAME };
        var obj = JSON.parse(raw);
        return { isPlaying: obj.isPlaying !== false, trackName: obj.trackName || DEFAULT_TRACK_NAME };
      } catch (e) {
        return { isPlaying: true, trackName: DEFAULT_TRACK_NAME };
      }
    }
    function saveSettings() {
      try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
    }
    function saveProgress() {
      try {
        if (audioEl && isFinite(audioEl.currentTime)) {
          window.localStorage.setItem(PROGRESS_KEY, String(audioEl.currentTime || 0));
        }
      } catch (e) {}
    }
    function restoreProgress() {
      try {
        var raw = Number(window.localStorage.getItem(PROGRESS_KEY) || 0);
        if (isFinite(raw) && raw > 0) audioEl.currentTime = raw;
      } catch (e) {}
    }
    function setPanelOpen(open) {
      widgetEl.classList.toggle('is-open', !!open);
      panelEl.setAttribute('aria-hidden', String(!open));
    }
    function openPanelTemporarily() {
      setPanelOpen(true);
      if (panelTimer) clearTimeout(panelTimer);
      panelTimer = setTimeout(function () { setPanelOpen(false); }, PANEL_AUTO_CLOSE_MS);
    }
    function updateUi() {
      var paused = !audioEl || audioEl.paused;
      glyphEl.textContent = paused ? '♪' : 'Ⅱ';
      toggleBtn.classList.toggle('is-playing', !paused);
      toggleBtn.classList.toggle('is-paused', paused);
      trackNameEl.textContent = settings.trackName || DEFAULT_TRACK_NAME;
    }
    function loadTrack() {
      return fetch(API_BASE + '/api/music?resource=current')
        .then(function (resp) { return resp.ok ? resp.json() : { item: null }; })
        .then(function (data) {
          var item = data && data.item ? data.item : null;
          audioEl.src = item && item.publicUrl ? item.publicUrl : DEFAULT_TRACK_SRC;
          settings.trackName = item && item.title ? item.title : DEFAULT_TRACK_NAME;
          saveSettings();
          audioEl.load();
          audioEl.addEventListener('loadedmetadata', restoreProgress, { once: true });
          updateUi();
        })
        .catch(function () {
          audioEl.src = DEFAULT_TRACK_SRC;
          audioEl.load();
          settings.trackName = DEFAULT_TRACK_NAME;
          saveSettings();
          updateUi();
        });
    }
    function getAdminToken() {
      try { return window.localStorage.getItem('adminToken') || ''; } catch (e) { return ''; }
    }
    function checkAdmin() {
      var token = getAdminToken();
      if (!token) return Promise.resolve(false);
      return fetch(API_BASE + '/api/admin?action=me', {
        headers: { Authorization: 'Bearer ' + token }
      }).then(function (resp) { return resp.ok; }).catch(function () { return false; });
    }
    function uploadMusic(file) {
      var ext = (String(file.name || '').split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
      return fetch(API_BASE + '/api/music-upload-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getAdminToken() },
        body: JSON.stringify({ bucket: 'uploads-music', ext: ext, contentType: file.type || 'audio/mpeg' })
      }).then(function (resp) {
        return resp.json().then(function (d) { if (!resp.ok) throw new Error(d.error || '签名失败'); return d; });
      }).then(function (sign) {
        return fetch(sign.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file
        }).then(function (putResp) {
          if (!putResp.ok) throw new Error('上传文件失败');
          return sign;
        });
      }).then(function (sign) {
        return fetch(API_BASE + '/api/music?resource=tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getAdminToken() },
          body: JSON.stringify({ title: file.name || '管理员上传音乐', bucket: sign.bucket, path: sign.path })
        }).then(function (resp) {
          return resp.json().then(function (d) { if (!resp.ok) throw new Error(d.error || '写入曲目失败'); return d.item; });
        });
      }).then(function (track) {
        return fetch(API_BASE + '/api/music?resource=current', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getAdminToken() },
          body: JSON.stringify({ trackId: track.id })
        }).then(function (resp) {
          return resp.json().then(function (d) { if (!resp.ok) throw new Error(d.error || '设置当前曲目失败'); return d; });
        });
      });
    }
    function init() {
      widgetEl = document.createElement('div');
      widgetEl.className = 'music-widget';
      widgetEl.innerHTML =
        '<button type="button" class="music-toggle" aria-label="播放或暂停背景音乐"><span class="music-toggle-glyph">♪</span></button>' +
        '<div class="music-panel" aria-hidden="true"><div class="music-track-name"></div><label class="music-upload-btn"><input class="music-upload-input" type="file" accept="audio/*"><span>上传音乐</span></label></div>';
      document.body.appendChild(widgetEl);
      toggleBtn = widgetEl.querySelector('.music-toggle');
      glyphEl = widgetEl.querySelector('.music-toggle-glyph');
      panelEl = widgetEl.querySelector('.music-panel');
      trackNameEl = widgetEl.querySelector('.music-track-name');
      uploadInput = widgetEl.querySelector('.music-upload-input');
      audioEl = document.createElement('audio');
      audioEl.loop = true;
      audioEl.preload = 'auto';
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      audioEl.addEventListener('play', updateUi);
      audioEl.addEventListener('pause', updateUi);
      audioEl.addEventListener('timeupdate', saveProgress);
      window.addEventListener('beforeunload', saveProgress);
      toggleBtn.addEventListener('click', function () {
        loadTrack().then(function () {
          if (audioEl.paused) {
            settings.isPlaying = true;
            saveSettings();
            return audioEl.play().catch(function () {});
          }
          audioEl.pause();
          settings.isPlaying = false;
          saveSettings();
        }).finally(openPanelTemporarily);
      });
      uploadInput.addEventListener('change', function () {
        var file = uploadInput.files && uploadInput.files[0];
        if (!file) return;
        if (!isAdmin) {
          window.alert('仅管理员可上传音乐');
          uploadInput.value = '';
          return;
        }
        uploadMusic(file).then(function () {
          settings.trackName = file.name || '管理员上传音乐';
          settings.isPlaying = true;
          saveSettings();
          return loadTrack();
        }).then(function () {
          return audioEl.play().catch(function () {});
        }).then(function () {
          window.alert('已上传并切换为全站共享音乐');
        }).catch(function (err) {
          window.alert('上传音乐失败：' + (err && err.message ? err.message : '请检查配置'));
        }).finally(function () {
          uploadInput.value = '';
        });
      });
      document.addEventListener('click', function (e) {
        if (widgetEl.classList.contains('is-open') && !widgetEl.contains(e.target)) setPanelOpen(false);
      }, true);
      checkAdmin().then(function (ok) {
        isAdmin = ok;
        var uploadBtn = widgetEl.querySelector('.music-upload-btn');
        if (uploadBtn) uploadBtn.style.display = isAdmin ? '' : 'none';
      });
      loadTrack().then(function () {
        if (settings.isPlaying) audioEl.play().catch(function () {});
        updateUi();
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  })();
