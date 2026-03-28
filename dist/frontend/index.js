;(function () {
    'use strict';

    var HOME_PHOTO_KEY = 'home_photo';
    var photoImg = document.getElementById('homePhotoImg');
    var photoPlaceholder = document.getElementById('homePhotoPlaceholder');
    var photoCard = document.getElementById('homePhotoCard');
    var photoEdit = document.getElementById('homePhotoEdit');
    var photoUpload = document.getElementById('homePhotoUpload');
    var IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i;
    var API_BASE = String(window.API_BASE_URL || '').trim().replace(/\/+$/, '') || ((window.location.origin && window.location.origin !== 'null') ? window.location.origin.replace(/\/+$/, '') : 'https://our-records.xyz');
    var ADMIN_TOKEN_KEY = 'adminToken';
    var isAdmin = false;

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

    function isImageFile(file) {
        if (!file) return false;
        if (file.type && /^image\//i.test(file.type)) return true;
        return IMAGE_EXT_RE.test(file.name || '');
    }

    function setHomePhoto(src) {
        if (!photoImg || !photoPlaceholder) return;
        if (src) {
            photoImg.src = src;
            photoImg.hidden = false;
            photoPlaceholder.hidden = true;
        } else {
            photoImg.src = '';
            photoImg.hidden = true;
            photoPlaceholder.hidden = false;
        }
    }

    function loadHomePhoto() {
        return apiRequest('/api/site-settings?key=' + encodeURIComponent(HOME_PHOTO_KEY)).then(function (data) {
            var item = data.items && data.items[0];
            setHomePhoto(item && item.value_text ? item.value_text : '');
        }).catch(function () {
            setHomePhoto('');
        });
    }

    function compressImageDataUrl(dataUrl, maxSide, quality, callback) {
        var img = new Image();
        img.onload = function () {
            try {
                var width = img.naturalWidth || img.width;
                var height = img.naturalHeight || img.height;
                var maxDim = Math.max(width, height);
                var scale = Math.min(1, maxSide / maxDim);

                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                if (!ctx) {
                    callback(dataUrl);
                    return;
                }

                canvas.width = Math.max(1, Math.round(width * scale));
                canvas.height = Math.max(1, Math.round(height * scale));

                // 用白底兜底透明通道（避免导出后透明变黑）
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                var out = '';
                try {
                    out = canvas.toDataURL('image/jpeg', quality);
                } catch (err) {
                    out = dataUrl;
                }
                callback(out);
            } catch (e) {
                callback(dataUrl);
            }
        };
        img.onerror = function () {
            callback(dataUrl);
        };
        img.src = dataUrl;
    }

    if (photoEdit && photoUpload) {
        if (photoCard) {
            photoCard.addEventListener('click', function (evt) {
                if (!isAdmin) {
                    window.alert('仅管理员可编辑首页图片');
                    return;
                }
                if (evt.target && evt.target.closest && evt.target.closest('.home-photo-edit')) return;
                photoUpload.click();
            });
        }

        photoEdit.addEventListener('click', function () {
            if (!isAdmin) {
                window.alert('仅管理员可编辑首页图片');
                return;
            }
            photoUpload.click();
        });

        photoUpload.addEventListener('change', function () {
            var file = photoUpload.files && photoUpload.files[0];
            if (!isImageFile(file)) {
                window.alert('请选择图片文件后再上传。');
                photoUpload.value = '';
                return;
            }

            var reader = new FileReader();
            reader.onload = function (evt) {
                var dataUrl = evt.target.result;

                // 压缩后再预览 + 保存，避免 localStorage 容量不足导致切页图片消失
                compressImageDataUrl(dataUrl, 1200, 0.82, function (compressed) {
                    setHomePhoto(compressed);
                    apiRequest('/api/site-settings?key=' + encodeURIComponent(HOME_PHOTO_KEY), {
                        method: 'PATCH',
                        body: { value_text: compressed }
                    }).catch(function () {
                        return apiRequest('/api/site-settings', {
                            method: 'POST',
                            body: { key: HOME_PHOTO_KEY, value_text: compressed }
                        });
                    }).catch(function () {
                        window.alert('图片预览成功，但同步保存失败，请重试。');
                    }).finally(function () {
                        photoUpload.value = '';
                    });
                });
            };
            reader.onerror = function () {
                window.alert('图片读取失败，请换一张图片重试。');
                photoUpload.value = '';
            };
            reader.readAsDataURL(file);
        });
    }

    checkAdmin().then(function (ok) {
        isAdmin = ok;
        if (photoEdit) photoEdit.style.display = isAdmin ? '' : 'none';
    });
    loadHomePhoto();
})();
