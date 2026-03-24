;(function () {
    'use strict';

    var HOME_PHOTO_KEY = 'homeCenterPhoto';
    var photoImg = document.getElementById('homePhotoImg');
    var photoPlaceholder = document.getElementById('homePhotoPlaceholder');
    var photoCard = document.getElementById('homePhotoCard');
    var photoEdit = document.getElementById('homePhotoEdit');
    var photoUpload = document.getElementById('homePhotoUpload');
    var IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i;
    var API_BASE = window.API_BASE_URL || window.location.origin;
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
        try {
            setHomePhoto(window.localStorage.getItem(HOME_PHOTO_KEY) || '');
        } catch (err) {
            setHomePhoto('');
        }
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
                    try {
                        window.localStorage.setItem(HOME_PHOTO_KEY, compressed);
                    } catch (err) {
                        // 如果仍然超出容量，至少保证预览不丢；提示一下即可
                        window.alert('图片已预览，但本地存储空间不足，刷新后可能不会保留。请换一张更小的图片重试。');
                    }
                    photoUpload.value = '';
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
