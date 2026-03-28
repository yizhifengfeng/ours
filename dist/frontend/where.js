/**
 * 去哪儿模块：地图页 + 详情页 共用脚本
 * 地图页：渲染城市圆点、添加新城市表单
 * 详情页：根据 URL ?name= 从 localStorage 加载对应城市数据
 */

(function () {
    'use strict';

    var API_BASE = window.API_BASE_URL || 'https://ours-i83n.vercel.app';
    var ADMIN_TOKEN_KEY = 'adminToken';
    var IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i;
    var isAdmin = false;
    var placesCache = [];

    // 地图经纬度边界（对应 china-map.svg 1200x1200 画布）
    // 如果点位整体偏移，微调这四个值：
    //   整体右移 → 减小 minLng；整体左移 → 增大 minLng
    //   整体下移 → 增大 maxLat；整体上移 → 减小 maxLat
    var MAP_BOUNDS = {
        minLng: 71.5,
        maxLng: 137.5,
        minLat: 10.0,
        maxLat: 56.0
    };

    // 各省会的大致经纬度，用于用户未填经纬度时的默认值
    var provincePositions = {
        '北京': { lng: 116.40, lat: 39.90 },
        '天津': { lng: 117.20, lat: 39.12 },
        '上海': { lng: 121.47, lat: 31.23 },
        '重庆': { lng: 106.55, lat: 29.56 },
        '河北': { lng: 114.48, lat: 38.03 },   // 石家庄
        '河南': { lng: 113.62, lat: 34.75 },   // 郑州
        '云南': { lng: 102.71, lat: 25.04 },   // 昆明
        '辽宁': { lng: 123.43, lat: 41.80 },   // 沈阳
        '黑龙江': { lng: 126.63, lat: 45.75 }, // 哈尔滨
        '湖南': { lng: 112.93, lat: 28.23 },   // 长沙
        '安徽': { lng: 117.25, lat: 31.83 },   // 合肥
        '山东': { lng: 117.00, lat: 36.65 },   // 济南
        '新疆': { lng: 87.62,  lat: 43.82 },   // 乌鲁木齐
        '江苏': { lng: 118.78, lat: 32.07 },   // 南京
        '浙江': { lng: 120.15, lat: 30.27 },   // 杭州
        '江西': { lng: 115.85, lat: 28.68 },   // 南昌
        '湖北': { lng: 114.30, lat: 30.60 },   // 武汉
        '广西': { lng: 108.32, lat: 22.82 },   // 南宁
        '甘肃': { lng: 103.82, lat: 36.07 },   // 兰州
        '山西': { lng: 112.55, lat: 37.87 },   // 太原
        '内蒙古': { lng: 111.73, lat: 40.83 }, // 呼和浩特
        '陕西': { lng: 108.95, lat: 34.27 },   // 西安
        '吉林': { lng: 125.32, lat: 43.90 },   // 长春
        '福建': { lng: 119.30, lat: 26.08 },   // 福州
        '贵州': { lng: 106.72, lat: 26.57 },   // 贵阳
        '广东': { lng: 113.27, lat: 23.13 },   // 广州
        '青海': { lng: 101.78, lat: 36.62 },   // 西宁
        '西藏': { lng: 91.13,  lat: 29.65 },   // 拉萨
        '四川': { lng: 104.07, lat: 30.67 },   // 成都
        '宁夏': { lng: 106.27, lat: 38.47 },   // 银川
        '海南': { lng: 110.32, lat: 20.03 },   // 海口
        '台湾': { lng: 121.51, lat: 25.05 },   // 台北
        '香港': { lng: 114.17, lat: 22.28 },
        '澳门': { lng: 113.54, lat: 22.19 }
    };

    /* ========== 公共数据方法 ========== */

    function lngLatToPercent(lng, lat) {
        var x = (lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng) * 100;
        var y = (MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat) * 100;
        x += 2; // 整体往右 1.5%
        y += 12;   // 整体往下 2%
        return { x: x, y: y };
    }

    function percentToLngLat(x, y) {
        var lng = MAP_BOUNDS.minLng + (x / 100) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
        var lat = MAP_BOUNDS.maxLat - (y / 100) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
        return { lng: lng, lat: lat };
    }

    function getAdminToken() {
        try { return window.localStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch (e) { return ''; }
    }

    async function apiRequest(path, options) {
        var opts = options || {};
        var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
        var token = getAdminToken();
        if (token) headers.Authorization = 'Bearer ' + token;
        var resp = await fetch(API_BASE + path, {
            method: opts.method || 'GET',
            headers: headers,
            body: typeof opts.body === 'undefined' ? undefined : JSON.stringify(opts.body)
        });
        var data = {};
        try { data = await resp.json(); } catch (e) {}
        if (!resp.ok) {
            var err = new Error((data && data.error) || ('HTTP ' + resp.status));
            err.status = resp.status;
            throw err;
        }
        return data;
    }

    function normalizePlaceFromApi(row) {
        if (!row) return null;
        return {
            id: row.id,
            city: row.city,
            province: row.province,
            lng: Number(row.lng),
            lat: Number(row.lat),
            note: row.note || '',
            image: row.image_url || ''
        };
    }

    async function checkAdmin() {
        var token = getAdminToken();
        if (!token) {
            isAdmin = false;
            return false;
        }
        try {
            await apiRequest('/api/admin?action=me');
            isAdmin = true;
            return true;
        } catch (e) {
            isAdmin = false;
            return false;
        }
    }

    async function loadPlaces() {
        var data = await apiRequest('/api/places');
        placesCache = (data.items || []).map(normalizePlaceFromApi).filter(function (p) {
            return p && typeof p.city === 'string' && !isNaN(p.lng) && !isNaN(p.lat);
        });
        return placesCache;
    }

    function findPlace(cityName) {
        for (var i = 0; i < placesCache.length; i++) {
            if (placesCache[i].city === cityName) return placesCache[i];
        }
        return null;
    }

    async function getDanmaku(cityName) {
        var data = await apiRequest('/api/danmaku?city=' + encodeURIComponent(cityName));
        return (data.items || []).map(function (row) {
            return { id: row.id, text: row.text || '', identity: row.identity || 'dafu' };
        });
    }

    async function addDanmaku(cityName, identity, text) {
        return apiRequest('/api/danmaku', {
            method: 'POST',
            body: { place_city: cityName, identity: identity, text: text }
        });
    }

    async function getPhotos(cityName) {
        var data = await apiRequest('/api/place-photos?city=' + encodeURIComponent(cityName));
        return (data.items || []).map(function (row) { return row.image_url; }).filter(Boolean);
    }

    async function addPhoto(cityName, imageUrl) {
        return apiRequest('/api/place-photos', {
            method: 'POST',
            body: { place_city: cityName, image_url: imageUrl }
        });
    }

    function isImageFile(file) {
        if (!file) return false;
        if (file.type && /^image\//i.test(file.type)) return true;
        return IMAGE_EXT_RE.test(file.name || '');
    }

    function compressImageDataUrl(dataUrl, callback) {
        var img = new Image();
        img.onload = function () {
            var maxSide = 1600;
            var width = img.naturalWidth || img.width;
            var height = img.naturalHeight || img.height;
            var scale = Math.min(1, maxSide / Math.max(width, height));
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));

            if (!ctx) {
                callback(dataUrl);
                return;
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            try {
                callback(canvas.toDataURL('image/jpeg', 0.82));
            } catch (e) {
                callback(dataUrl);
            }
        };
        img.onerror = function () {
            callback(dataUrl);
        };
        img.src = dataUrl;
    }

    function readImageForStorage(file, onSuccess, onError) {
        if (!isImageFile(file)) {
            if (onError) onError('请选择图片文件后再上传。');
            return;
        }

        var reader = new FileReader();
        reader.onload = function (evt) {
            compressImageDataUrl(evt.target.result, function (result) {
                onSuccess(result);
            });
        };
        reader.onerror = function () {
            if (onError) onError('图片读取失败，请换一张图片重试。');
        };
        reader.readAsDataURL(file);
    }

    /* ========== 地图页逻辑（仅在 where.html 生效） ========== */

    var markerLayer = document.getElementById('mapMarkerLayer');
    var modal = document.getElementById('modalForm');
    var btnAdd = document.getElementById('btnAddPlace');
    var btnCancel = document.getElementById('btnCancel');
    var form = document.getElementById('formAddPlace');
    var provinceSelect = document.getElementById('provinceSelect');
    var imageInput = document.getElementById('placeImageInput');

    function renderProvinceOptions() {
        if (!provinceSelect) return;
        provinceSelect.innerHTML = Object.keys(provincePositions).sort().map(function (name) {
            return '<option value="' + name + '">' + name + '</option>';
        }).join('');
    }

    function renderMarkers() {
        if (!markerLayer) return;
        var places = placesCache;
        markerLayer.innerHTML = places.map(function (place) {
            var pos = lngLatToPercent(place.lng, place.lat);
            return '<a href="place-detail.html?name=' + encodeURIComponent(place.city) + '" ' +
                'class="map-marker map-marker--visited" ' +
                'style="left:' + pos.x + '%;top:' + pos.y + '%;" ' +
                'aria-label="' + place.city + ' - 已去过">' +
                '<span class="map-marker-dot"></span>' +
                '<span class="map-marker-label">' + place.city + '</span>' +
                '</a>';
        }).join('');
    }

    if (modal && btnAdd) {
        btnAdd.addEventListener('click', function () { modal.hidden = false; });
    }
    if (modal && btnCancel) {
        btnCancel.addEventListener('click', function () { modal.hidden = true; });
    }
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) modal.hidden = true;
        });
    }

    function parsePosition(input, province) {
        var trimmed = (input || '').trim();
        if (trimmed) {
            var parts = trimmed.split(',');
            if (parts.length === 2) {
                var lng = parseFloat(parts[0]);
                var lat = parseFloat(parts[1]);
                if (!isNaN(lng) && !isNaN(lat)) return { lng: lng, lat: lat };
            }
        }
        var fallback = provincePositions[province];
        if (fallback) return { lng: fallback.lng, lat: fallback.lat };
        // 如果没有省份匹配，就大致放在地图中心
        return { lng: (MAP_BOUNDS.minLng + MAP_BOUNDS.maxLng) / 2, lat: (MAP_BOUNDS.minLat + MAP_BOUNDS.maxLat) / 2 };
    }

    async function addPlaceFromForm(city, province, positionStr, note, imageDataUrl) {
        var coord = parsePosition(positionStr, province);
        await apiRequest('/api/places', {
            method: 'POST',
            body: {
                city: city,
                province: province,
                lng: coord.lng,
                lat: coord.lat,
                note: note || '',
                image_url: imageDataUrl || ''
            }
        });
        placesCache.push({
            city: city,
            province: province,
            lng: coord.lng,
            lat: coord.lat,
            note: note || '',
            image: imageDataUrl || ''
        });
        renderMarkers();
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!isAdmin) {
                alert('仅管理员可新增或编辑地点。');
                return;
            }
            var city = (form.querySelector('[name="city"]') || {}).value || '';
            city = city.trim();
            var province = (form.querySelector('[name="province"]') || {}).value || '';
            var positionStr = (form.querySelector('[name="position"]') || {}).value || '';
            var note = (form.querySelector('[name="note"]') || {}).value || '';
            if (!city || !province) {
                alert('请填写城市名称并选择省份');
                return;
            }
            var file = imageInput && imageInput.files && imageInput.files[0];
            if (file) {
                readImageForStorage(file, function (dataUrl) {
                    addPlaceFromForm(city, province, positionStr, note, dataUrl).then(function () {
                        alert('已点亮城市：「' + city + '」');
                        modal.hidden = true;
                        form.reset();
                    }).catch(function (err) {
                        alert('保存失败：' + err.message);
                    });
                }, function (message) {
                    alert(message);
                });
            } else {
                addPlaceFromForm(city, province, positionStr, note, '').then(function () {
                    alert('已点亮城市：「' + city + '」');
                    modal.hidden = true;
                    form.reset();
                }).catch(function (err) {
                    alert('保存失败：' + err.message);
                });
            }
        });
    }

    renderProvinceOptions();
    checkAdmin().then(function () {
        return loadPlaces();
    }).then(function () {
        renderMarkers();
    }).catch(function () {
        renderMarkers();
    });

    /* ========== 详情页逻辑（仅在 place-detail.html 生效） ========== */

    var params = new URLSearchParams(window.location.search);
    var currentCity = params.get('name') ? decodeURIComponent(params.get('name')) : '';
    var placeNameEl = document.getElementById('placeName');
    var placeHeroImg = document.getElementById('placeHeroImg');
    var placeNote = document.getElementById('placeNote');
    var btnHeroEdit = document.getElementById('btnHeroEdit');
    var heroUpload = document.getElementById('heroUpload');

    if (currentCity && placeNameEl) {
        document.title = currentCity + ' - 去哪儿';
        placeNameEl.textContent = currentCity;

        function applyPlaceMeta(place) {
            if (placeHeroImg) {
                if (place && place.image) {
                    placeHeroImg.src = place.image;
                    placeHeroImg.style.display = '';
                } else {
                    placeHeroImg.style.display = 'none';
                }
            }
            if (placeNote) {
                if (place && place.note) {
                    placeNote.textContent = place.note;
                    placeNote.style.display = '';
                } else {
                    placeNote.style.display = 'none';
                }
            }
        }

        applyPlaceMeta(findPlace(currentCity));
        loadPlaces().then(function () {
            applyPlaceMeta(findPlace(currentCity));
        });

        if (btnHeroEdit && heroUpload) {
            btnHeroEdit.addEventListener('click', function () {
                if (!isAdmin) {
                    alert('仅管理员可修改地点封面。');
                    return;
                }
                heroUpload.click();
            });

            heroUpload.addEventListener('change', function () {
                var file = heroUpload.files && heroUpload.files[0];
                if (!file) {
                    heroUpload.value = '';
                    return;
                }

                readImageForStorage(file, function (dataUrl) {
                    if (placeHeroImg) {
                        placeHeroImg.src = dataUrl;
                        placeHeroImg.style.display = '';
                    }
                    var target = findPlace(currentCity);
                    if (!target || !target.id) {
                        heroUpload.value = '';
                        return;
                    }
                    apiRequest('/api/places?id=' + encodeURIComponent(target.id), {
                        method: 'PATCH',
                        body: { image_url: dataUrl }
                    }).then(function () {
                        target.image = dataUrl;
                        renderMarkers();
                        heroUpload.value = '';
                    }).catch(function () {
                        alert('图片预览成功，但保存失败。请重试。');
                        heroUpload.value = '';
                    });
                }, function (message) {
                    alert(message);
                    heroUpload.value = '';
                });
            });
        }

        // 弹幕墙：加载该城市的弹幕
        var danmakuList = document.getElementById('danmakuList');
        if (danmakuList) {
            getDanmaku(currentCity).then(function (storedDanmaku) {
                if (storedDanmaku.length > 0) {
                    danmakuList.innerHTML = '';
                    storedDanmaku.forEach(function (d) {
                        var span = document.createElement('span');
                        span.className = 'danmaku-item danmaku-item--' + d.identity;
                        span.textContent = d.text;
                        danmakuList.appendChild(span);
                    });
                    storedDanmaku.forEach(function (d) {
                        var span = document.createElement('span');
                        span.className = 'danmaku-item danmaku-item--' + d.identity;
                        span.textContent = d.text;
                        danmakuList.appendChild(span);
                    });
                }
            });
        }

        // 弹幕发送
        var danmakuIdentity = document.getElementById('danmakuIdentity');
        var danmakuInput = document.getElementById('danmakuInput');
        var btnDanmakuAdd = document.getElementById('btnDanmakuAdd');
        if (danmakuList && danmakuIdentity && danmakuInput && btnDanmakuAdd) {
            btnDanmakuAdd.addEventListener('click', function () {
                if (!isAdmin) {
                    alert('仅管理员可新增弹幕。');
                    return;
                }
                var text = (danmakuInput.value || '').trim();
                if (!text) return;
                var identity = danmakuIdentity.value === 'zhouzhou' ? 'zhouzhou' : 'dafu';
                var span = document.createElement('span');
                span.className = 'danmaku-item danmaku-item--' + identity;
                span.textContent = text;
                // 只追加一条弹幕，避免“一次发送出现两条”的视觉重复
                danmakuList.appendChild(span);
                danmakuInput.value = '';
                addDanmaku(currentCity, identity, text).catch(function (err) {
                    alert('保存弹幕失败：' + err.message);
                });
            });
            danmakuInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') btnDanmakuAdd.click();
            });
        }

        // 照片墙：加载该城市的照片
        var photoWall = document.getElementById('photoWall');
        var photoModal = document.getElementById('photoModal');
        var photoModalImg = document.getElementById('photoModalImg');
        var photoModalClose = document.getElementById('photoModalClose');
        var photoModalBackdrop = document.getElementById('photoModalBackdrop');

        function openPhotoModal(src) {
            if (!photoModal || !photoModalImg) return;
            photoModalImg.src = src;
            photoModal.hidden = false;
            photoModal.setAttribute('aria-hidden', 'false');
        }

        function closePhotoModal() {
            if (!photoModal || !photoModalImg) return;
            photoModal.hidden = true;
            photoModal.setAttribute('aria-hidden', 'true');
            photoModalImg.src = '';
        }

        if (photoModalClose) {
            photoModalClose.addEventListener('click', closePhotoModal);
        }
        if (photoModalBackdrop) {
            photoModalBackdrop.addEventListener('click', closePhotoModal);
        }
        if (photoModal) {
            photoModal.addEventListener('click', function (e) {
                if (e.target === photoModal) closePhotoModal();
            });
        }

        if (photoWall) {
            var uploadWrap = photoWall.querySelector('.photo-upload-wrap');
            getPhotos(currentCity).then(function (storedPhotos) {
                storedPhotos.forEach(function (src) {
                    var div = document.createElement('div');
                    div.className = 'photo-item in-view';
                    div.innerHTML = '<a href="javascript:void(0)" class="photo-thumb"><img src="' + src + '" alt="照片"></a>';
                    if (uploadWrap) {
                        photoWall.insertBefore(div, uploadWrap.nextSibling);
                    } else {
                        photoWall.appendChild(div);
                    }
                });
            });

            photoWall.addEventListener('click', function (e) {
                var img = e.target && e.target.closest && e.target.closest('.photo-item img');
                if (!img) return;
                openPhotoModal(img.src);
            });

            // 上传照片
            var photoUpload = document.getElementById('photoUpload');
            if (photoUpload) {
                photoUpload.addEventListener('change', function () {
                    if (!isAdmin) {
                        alert('仅管理员可上传地点照片。');
                        this.value = '';
                        return;
                    }
                    var files = this.files;
                    if (!files || !files.length) return;
                    var wrap = photoUpload.closest('.photo-upload-wrap');
                    for (var i = 0; i < files.length; i++) {
                        (function (file) {
                            readImageForStorage(file, function (dataUrl) {
                                var div = document.createElement('div');
                                div.className = 'photo-item in-view';
                                div.innerHTML = '<a href="javascript:void(0)" class="photo-thumb"><img src="' + dataUrl + '" alt="照片"></a>';
                                if (wrap) {
                                    wrap.parentNode.insertBefore(div, wrap.nextSibling);
                                } else {
                                    photoWall.appendChild(div);
                                }
                                addPhoto(currentCity, dataUrl).catch(function () {
                                    alert('图片预览成功，但保存失败。请重试。');
                                });
                            });
                        })(files[i]);
                    }
                    this.value = '';
                });
            }
        }
    }
})();
