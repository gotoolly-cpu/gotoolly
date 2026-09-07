document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // ============================================================
    // UTILITIES
    // ============================================================
    function $(id) { return document.getElementById(id); }
    function qs(sel) { return document.querySelector(sel); }
    function qsa(sel) { return document.querySelectorAll(sel); }

    function notify(msg, isError) {
        var existing = qs('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function dataUrlToBytes(dataUrl) {
        var parts = dataUrl.split(',');
        var binary = atob(parts[1]);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function dataUrlToBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var mime = parts[0].match(/:(.*?);/)[1];
        var binary = atob(parts[1]);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(function(x) { var h = x.toString(16); return h.length === 1 ? '0' + h : h; }).join('');
    }

    function parseHexColor(hex) {
        if (!hex || hex === 'transparent') return null;
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    }

    // ============================================================
    // DOM REFERENCES
    // ============================================================
    var els = {
        fileInput: $('file-input'),
        dropZone: $('drop-zone'),
        imageList: $('image-list'),
        imageListEmpty: $('image-list-empty'),
        imageCountBadge: $('image-count-badge'),
        pageCount: $('page-count'),
        pageSize: $('page-size'),
        orientation: $('orientation'),
        marginBtns: $('margin-btns'),
        marginCustom: $('margin-custom'),
        layoutGrid: $('layout-grid'),
        contactSettings: $('contact-settings'),
        contactGap: $('contact-gap'),
        contactPadding: $('contact-padding'),
        imageGap: $('image-gap'),
        imageScale: $('image-scale'),
        imageQuality: $('image-quality'),
        bgColor: $('bg-color'),
        bgCustomRow: $('bg-custom-row'),
        bgCustomColor: $('bg-custom-color'),
        pageNumberingEnabled: $('page-numbering-enabled'),
        pageNumberingOpts: $('page-numbering-opts'),
        pageNumberPos: $('page-number-pos'),
        pageNumberSize: $('page-number-size'),
        pageNumberColor: $('page-number-color'),
        headerEnabled: $('header-enabled'),
        headerOpts: $('header-opts'),
        headerText: $('header-text'),
        headerSize: $('header-size'),
        headerColor: $('header-color'),
        footerEnabled: $('footer-enabled'),
        footerOpts: $('footer-opts'),
        footerText: $('footer-text'),
        footerSize: $('footer-size'),
        footerColor: $('footer-color'),
        metaTitle: $('meta-title'),
        metaAuthor: $('meta-author'),
        metaSubject: $('meta-subject'),
        metaKeywords: $('meta-keywords'),
        exportQuality: $('export-quality'),
        generateBtn: $('generate-btn'),
        resetBtn: $('reset-btn'),
        downloadBtn: $('download-btn'),
        newBtn: $('new-btn'),
        resultsArea: $('results-area'),
        resultInfo: $('result-info'),
        progressSection: $('progress-section'),
        progressFill: $('progress-fill'),
        progressText: $('progress-text'),
        progressPercent: $('progress-percent'),
        progressImages: $('progress-images'),
        progressEta: $('progress-eta'),
        previewCanvas: $('preview-canvas'),
        previewEmpty: $('preview-empty'),
        previewPageInfo: $('preview-page-info'),
        zoomLabel: $('zoom-label'),
        zoomIn: $('zoom-in'),
        zoomOut: $('zoom-out'),
        zoomFit: $('zoom-fit'),
        previewCanvasWrap: $('preview-canvas-wrap'),
        previewToolbar: $('preview-toolbar'),
        editorBody: $('editor-body')
    };

    // ============================================================
    // STATE
    // ============================================================
    var state = {
        images: [],
        currentPageIndex: 0,
        zoom: 100,
        resultBlob: null,
        isGenerating: false,
        pages: []
    };

    // ============================================================
    // IMAGE MANAGER
    // ============================================================
    var ImageManager = {
        ACCEPTED_TYPES: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
        MAX_IMAGES: 200,

        addFiles: function(fileList) {
            var self = this;
            var incoming = Array.from(fileList).filter(function(f) {
                return self.ACCEPTED_TYPES.indexOf(f.type) !== -1;
            });
            if (!incoming.length) {
                notify('Please select PNG, JPG, WebP, or AVIF images', true);
                return;
            }
            var remaining = self.MAX_IMAGES - state.images.length;
            if (remaining <= 0) {
                notify('Maximum ' + self.MAX_IMAGES + ' images reached', true);
                return;
            }
            incoming = incoming.slice(0, remaining);
            var loaded = 0;
            incoming.forEach(function(file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var img = new Image();
                    img.onload = function() {
                        var thumbCanvas = document.createElement('canvas');
                        var tw = 80, th = 80;
                        var ratio = Math.min(tw / img.naturalWidth, th / img.naturalHeight);
                        thumbCanvas.width = Math.round(img.naturalWidth * ratio);
                        thumbCanvas.height = Math.round(img.naturalHeight * ratio);
                        var tctx = thumbCanvas.getContext('2d');
                        tctx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);

                        state.images.push({
                            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                            file: file,
                            dataUrl: e.target.result,
                            img: img,
                            name: file.name,
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                            size: file.size,
                            type: file.type,
                            thumbUrl: thumbCanvas.toDataURL('image/jpeg', 0.6),
                            rotation: 0
                        });
                        loaded++;
                        if (loaded === incoming.length) {
                            ImageManager.renderList();
                            LayoutManager.recalculate();
                            PreviewManager.render();
                        }
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        },

        removeImage: function(index) {
            state.images.splice(index, 1);
            if (state.currentPageIndex > 0 && state.currentPageIndex >= state.pages.length) {
                state.currentPageIndex = Math.max(0, state.pages.length - 1);
            }
            this.renderList();
            LayoutManager.recalculate();
            PreviewManager.render();
        },

        duplicateImage: function(index) {
            if (state.images.length >= this.MAX_IMAGES) {
                notify('Maximum ' + this.MAX_IMAGES + ' images reached', true);
                return;
            }
            var src = state.images[index];
            state.images.splice(index + 1, 0, {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                file: src.file,
                dataUrl: src.dataUrl,
                img: src.img,
                name: src.name,
                width: src.width,
                height: src.height,
                size: src.size,
                type: src.type,
                thumbUrl: src.thumbUrl,
                rotation: 0
            });
            this.renderList();
            LayoutManager.recalculate();
            PreviewManager.render();
        },

        rotateImage: function(index, deg) {
            var item = state.images[index];
            item.rotation = (item.rotation + deg + 360) % 360;
            var canvas = document.createElement('canvas');
            var w = item.img.naturalWidth, h = item.img.naturalHeight;
            if (deg === 90 || deg === 270) {
                canvas.width = h; canvas.height = w;
            } else {
                canvas.width = w; canvas.height = h;
            }
            var ctx = canvas.getContext('2d');
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((deg * Math.PI) / 180);
            ctx.drawImage(item.img, -w / 2, -h / 2, w, h);
            var newDataUrl = canvas.toDataURL(item.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);

            var newImg = new Image();
            newImg.onload = function() {
                item.img = newImg;
                item.dataUrl = newDataUrl;
                item.width = newImg.naturalWidth;
                item.height = newImg.naturalHeight;
                ImageManager.renderList();
                LayoutManager.recalculate();
                PreviewManager.render();
            };
            newImg.src = newDataUrl;
        },

        moveImage: function(fromIndex, toIndex) {
            if (fromIndex === toIndex) return;
            var item = state.images.splice(fromIndex, 1)[0];
            state.images.splice(toIndex, 0, item);
            this.renderList();
            LayoutManager.recalculate();
            PreviewManager.render();
        },

        clear: function() {
            state.images = [];
            state.pages = [];
            state.currentPageIndex = 0;
            this.renderList();
            LayoutManager.recalculate();
            PreviewManager.render();
        },

        renderList: function() {
            var list = els.imageList;
            var empty = els.imageListEmpty;
            var count = state.images.length;

            els.imageCountBadge.textContent = '(' + count + ')';
            els.pageCount.textContent = count + ' page' + (count !== 1 ? 's' : '');

            if (count === 0) {
                list.innerHTML = '';
                if (empty) empty.style.display = 'flex';
                return;
            }
            if (empty) empty.style.display = 'none';

            list.innerHTML = '';
            state.images.forEach(function(item, index) {
                var card = document.createElement('div');
                card.className = 'image-card';
                card.setAttribute('data-index', index);
                card.innerHTML =
                    '<div style="position:relative"><img class="image-card-thumb" src="' + item.thumbUrl + '" alt="' + item.name + '"><span class="image-card-page">' + (index + 1) + '</span></div>' +
                    '<div class="image-card-info"><div class="image-card-name" title="' + item.name + '">' + item.name + '</div><div class="image-card-meta">' + item.width + 'x' + item.height + ' &middot; ' + formatSize(item.size) + '</div></div>' +
                    '<div class="image-card-actions">' +
                    '<button class="rotate-left-btn" title="Rotate left" data-idx="' + index + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg></button>' +
                    '<button class="rotate-right-btn" title="Rotate right" data-idx="' + index + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-5.64-11.36L23 10"/></svg></button>' +
                    '<button class="duplicate-btn" title="Duplicate" data-idx="' + index + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>' +
                    '<button class="delete-btn" title="Remove" data-idx="' + index + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
                    '</div>';

                card.querySelector('.rotate-left-btn').addEventListener('click', function() { ImageManager.rotateImage(index, -90); });
                card.querySelector('.rotate-right-btn').addEventListener('click', function() { ImageManager.rotateImage(index, 90); });
                card.querySelector('.duplicate-btn').addEventListener('click', function() { ImageManager.duplicateImage(index); });
                card.querySelector('.delete-btn').addEventListener('click', function() { ImageManager.removeImage(index); });

                list.appendChild(card);
            });

            this.initSortable();
        },

        initSortable: function() {
            if (typeof Sortable === 'undefined') return;
            if (this._sortable) this._sortable.destroy();
            this._sortable = Sortable.create(els.imageList, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                handle: '.image-card',
                onEnd: function(evt) {
                    ImageManager.moveImage(evt.oldIndex, evt.newIndex);
                }
            });
        }
    };

    // ============================================================
    // SETTINGS MANAGER
    // ============================================================
    var SettingsManager = {
        getMargin: function() {
            var activeBtn = qs('.margin-btn.active');
            if (!activeBtn) return 10;
            var val = activeBtn.getAttribute('data-margin');
            if (val === 'custom') return parseFloat(els.marginCustom.value) || 10;
            return parseFloat(val) || 10;
        },

        getBgColor: function() {
            var val = els.bgColor.value;
            if (val === 'custom') return els.bgCustomColor.value;
            return val;
        },

        getSettings: function() {
            var activeLayout = qs('.layout-option.active');
            return {
                layout: activeLayout ? activeLayout.getAttribute('data-layout') : '1',
                pageSize: els.pageSize.value,
                orientation: els.orientation.value,
                marginMm: this.getMargin(),
                imageScale: els.imageScale.value,
                imageQuality: els.imageQuality.value,
                bgColor: this.getBgColor(),
                pageNumbering: els.pageNumberingEnabled.checked,
                pageNumberPos: els.pageNumberPos.value,
                pageNumberSize: parseInt(els.pageNumberSize.value) || 10,
                pageNumberColor: els.pageNumberColor.value,
                headerEnabled: els.headerEnabled.checked,
                headerText: els.headerText.value,
                headerSize: parseInt(els.headerSize.value) || 10,
                headerColor: els.headerColor.value,
                footerEnabled: els.footerEnabled.checked,
                footerText: els.footerText.value,
                footerSize: parseInt(els.footerSize.value) || 10,
                footerColor: els.footerColor.value,
                metaTitle: els.metaTitle.value,
                metaAuthor: els.metaAuthor.value,
                metaSubject: els.metaSubject.value,
                metaKeywords: els.metaKeywords.value,
                exportQuality: els.exportQuality.value,
                contactGap: parseInt(els.contactGap.value) || 8,
                contactPadding: parseInt(els.contactPadding.value) || 16,
                imageGap: parseInt(els.imageGap.value) || 0
            };
        }
    };

    // ============================================================
    // PAGE SIZE CALCULATOR
    // ============================================================
    var PageSize = {
        SIZES: {
            a4: { w: 595.28, h: 841.89 },
            letter: { w: 612, h: 792 },
            legal: { w: 612, h: 1008 },
            a3: { w: 841.89, h: 1190.55 },
            a5: { w: 419.53, h: 595.28 }
        },

        get: function(settings, overrideW, overrideH) {
            var mmToPt = 2.83465;
            var marginPts = (settings.marginMm || 0) * mmToPt;
            var w, h;

            if (settings.pageSize === 'auto' && overrideW && overrideH) {
                w = overrideW * 0.75;
                h = overrideH * 0.75;
            } else if (settings.pageSize === 'fit' && overrideW && overrideH) {
                w = overrideW * 0.75 + 2 * marginPts;
                h = overrideH * 0.75 + 2 * marginPts;
            } else {
                var base = this.SIZES[settings.pageSize] || this.SIZES.a4;
                w = base.w;
                h = base.h;
            }

            if (settings.orientation === 'landscape' && settings.pageSize !== 'auto' && settings.pageSize !== 'fit') {
                var tmp = w; w = h; h = tmp;
            } else if (settings.orientation === 'auto' && settings.pageSize !== 'auto' && settings.pageSize !== 'fit') {
                var firstImg = state.images[0];
                if (firstImg) {
                    var imgRatio = firstImg.width / firstImg.height;
                    if (imgRatio > 1) { var t = w; w = h; h = t; }
                }
            }

            return {
                width: w,
                height: h,
                margin: marginPts,
                innerW: w - 2 * marginPts,
                innerH: h - 2 * marginPts
            };
        }
    };

    // ============================================================
    // LAYOUT MANAGER
    // ============================================================
    var LayoutManager = {
        calculatePages: function(settings) {
            var images = state.images;
            if (!images.length) { state.pages = []; return; }
            var layout = settings ? settings.layout : '1';
            var pages = [];

            if (layout === 'contact') {
                var gap = (settings ? settings.contactGap : 8) * 0.75;
                var pad = (settings ? settings.contactPadding : 16) * 0.75;
                var cols = Math.ceil(Math.sqrt(images.length * 1.5));
                var rows = Math.ceil(images.length / cols);
                var imagesPerPage = cols * rows;
                for (var i = 0; i < images.length; i += imagesPerPage) {
                    var chunk = images.slice(i, i + imagesPerPage);
                    var c = Math.ceil(Math.sqrt(chunk.length * 1.5));
                    var r = Math.ceil(chunk.length / c);
                    pages.push({ images: chunk, cols: c, rows: r, gap: gap, pad: pad, mode: 'contact' });
                }
            } else if (layout === 'auto') {
                var idx = 0;
                while (idx < images.length) {
                    var remaining = images.length - idx;
                    var perPage;
                    if (remaining >= 9) perPage = 9;
                    else if (remaining >= 6) perPage = 6;
                    else if (remaining >= 4) perPage = 4;
                    else if (remaining >= 2) perPage = 2;
                    else perPage = 1;
                    pages.push({ images: images.slice(idx, idx + perPage), count: perPage, mode: 'auto' });
                    idx += perPage;
                }
            } else {
                var n = parseInt(layout) || 1;
                for (var i = 0; i < images.length; i += n) {
                    pages.push({ images: images.slice(i, i + n), count: n, mode: 'fixed' });
                }
            }

            state.pages = pages;
            if (state.currentPageIndex >= pages.length) {
                state.currentPageIndex = Math.max(0, pages.length - 1);
            }
        },

        getCells: function(page, pageDims) {
            var count = page.images.length;
            var cells = [];
            var settings = SettingsManager.getSettings();
            var gap = (settings.imageGap || 0) * 0.75;

            if (page.mode === 'contact') {
                var cols = page.cols;
                var rows = page.rows;
                var cGap = page.gap || gap;
                var pad = page.pad || 0;
                var availW = pageDims.innerW - 2 * pad;
                var availH = pageDims.innerH - 2 * pad;
                var cellW = (availW - (cols - 1) * cGap) / cols;
                var cellH = (availH - (rows - 1) * cGap) / rows;
                for (var i = 0; i < count; i++) {
                    var col = i % cols;
                    var row = Math.floor(i / cols);
                    cells.push({
                        x: pageDims.margin + pad + col * (cellW + cGap),
                        y: pageDims.margin + pad + row * (cellH + cGap),
                        w: cellW,
                        h: cellH
                    });
                }
            } else {
                var grid = this._getGrid(count);
                var cols = grid.cols;
                var rows = grid.rows;
                var availW = pageDims.innerW - (cols - 1) * gap;
                var availH = pageDims.innerH - (rows - 1) * gap;
                var cellW = availW / cols;
                var cellH = availH / rows;
                for (var i = 0; i < count; i++) {
                    var col = i % cols;
                    var row = Math.floor(i / cols);
                    cells.push({
                        x: pageDims.margin + col * (cellW + gap),
                        y: pageDims.margin + row * (cellH + gap),
                        w: cellW,
                        h: cellH
                    });
                }
            }
            return cells;
        },

        _getGrid: function(count) {
            if (count <= 1) return { cols: 1, rows: 1 };
            if (count === 2) return { cols: 1, rows: 2 };
            if (count <= 4) return { cols: 2, rows: 2 };
            if (count <= 6) return { cols: 3, rows: 2 };
            return { cols: 3, rows: 3 };
        },

        recalculate: function() {
            var settings = SettingsManager.getSettings();
            this.calculatePages(settings);
            this.updatePageInfo();
        },

        updatePageInfo: function() {
            var total = state.pages.length;
            if (total === 0) {
                els.previewPageInfo.textContent = '';
                return;
            }
            els.previewPageInfo.textContent = 'Page ' + (state.currentPageIndex + 1) + ' of ' + total;
        }
    };

    // ============================================================
    // IMAGE SCALER
    // ============================================================
    var ImageScaler = {
        getDrawRect: function(imgW, imgH, cellW, cellH, mode) {
            switch (mode) {
                case 'fill': {
                    var scale = Math.max(cellW / imgW, cellH / imgH);
                    var w = imgW * scale;
                    var h = imgH * scale;
                    return { x: (cellW - w) / 2, y: (cellH - h) / 2, w: w, h: h, clip: true };
                }
                case 'stretch':
                    return { x: 0, y: 0, w: cellW, h: cellH, clip: false };
                case 'original': {
                    var scale = Math.min(1, Math.min(cellW / imgW, cellH / imgH));
                    var w = imgW * scale;
                    var h = imgH * scale;
                    return { x: (cellW - w) / 2, y: (cellH - h) / 2, w: w, h: h, clip: false };
                }
                case 'fit':
                default: {
                    var scale = Math.min(cellW / imgW, cellH / imgH);
                    var w = imgW * scale;
                    var h = imgH * scale;
                    return { x: (cellW - w) / 2, y: (cellH - h) / 2, w: w, h: h, clip: false };
                }
            }
        }
    };

    // ============================================================
    // PREVIEW MANAGER
    // ============================================================
    var PreviewManager = {
        canvas: null,
        ctx: null,

        init: function() {
            this.canvas = els.previewCanvas;
            this.ctx = this.canvas.getContext('2d');
        },

        render: function() {
            if (!state.pages.length) {
                this.canvas.style.display = 'none';
                if (els.previewEmpty) els.previewEmpty.style.display = 'flex';
                LayoutManager.updatePageInfo();
                return;
            }
            if (els.previewEmpty) els.previewEmpty.style.display = 'none';
            this.canvas.style.display = 'block';
            LayoutManager.updatePageInfo();
            this.renderPage(state.currentPageIndex);
        },

        renderPage: function(pageIndex) {
            if (pageIndex < 0 || pageIndex >= state.pages.length) return;
            var page = state.pages[pageIndex];
            var settings = SettingsManager.getSettings();
            var pageDims = PageSize.get(settings);
            var cells = LayoutManager.getCells(page, pageDims);

            var displayScale = state.zoom / 100;
            var maxPreviewW = els.previewCanvasWrap.clientWidth - 40;
            var maxPreviewH = els.previewCanvasWrap.clientHeight - 40;
            var fitScale = Math.min(maxPreviewW / pageDims.width, maxPreviewH / pageDims.height, 2);
            var scale = fitScale * displayScale;

            var cw = Math.round(pageDims.width * scale);
            var ch = Math.round(pageDims.height * scale);
            this.canvas.width = cw;
            this.canvas.height = ch;
            this.canvas.style.width = cw + 'px';
            this.canvas.style.height = ch + 'px';

            var ctx = this.ctx;
            ctx.clearRect(0, 0, cw, ch);

            var bg = settings.bgColor;
            if (bg && bg !== 'transparent') {
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, cw, ch);
            } else if (bg === 'transparent') {
                this._drawCheckerboard(ctx, cw, ch);
            }

            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, cw, ch);

            for (var i = 0; i < cells.length && i < page.images.length; i++) {
                var cell = cells[i];
                var img = page.images[i];
                var sc = {
                    x: cell.x * scale,
                    y: cell.y * scale,
                    w: cell.w * scale,
                    h: cell.h * scale
                };

                ctx.save();
                ctx.beginPath();
                ctx.rect(sc.x, sc.y, sc.w, sc.h);
                ctx.clip();

                var drawRect = ImageScaler.getDrawRect(img.width, img.height, sc.w, sc.h, settings.imageScale);
                ctx.drawImage(img.img, sc.x + drawRect.x, sc.y + drawRect.y, drawRect.w, drawRect.h);
                ctx.restore();

                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(sc.x, sc.y, sc.w, sc.h);
            }

            if (settings.pageNumbering) {
                this._drawPageNumber(ctx, pageIndex, state.pages.length, cw, ch, settings);
            }
            if (settings.headerEnabled && settings.headerText) {
                this._drawHeaderText(ctx, cw, ch, scale, settings);
            }
            if (settings.footerEnabled && settings.footerText) {
                this._drawFooterText(ctx, cw, ch, scale, settings);
            }
        },

        _drawCheckerboard: function(ctx, w, h) {
            var size = 8;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#f0f0f0';
            for (var y = 0; y < h; y += size * 2) {
                for (var x = 0; x < w; x += size * 2) {
                    ctx.fillRect(x, y, size, size);
                    ctx.fillRect(x + size, y + size, size, size);
                }
            }
        },

        _drawPageNumber: function(ctx, pageIndex, totalPages, cw, ch, settings) {
            var text = (pageIndex + 1) + ' / ' + totalPages;
            var fontSize = Math.max(8, settings.pageNumberSize * 0.75);
            ctx.font = fontSize + 'px Inter, sans-serif';
            ctx.fillStyle = settings.pageNumberColor || '#6b7280';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            var pos = settings.pageNumberPos || 'bottom-center';
            var x = cw / 2;
            var y = ch - fontSize;
            if (pos === 'bottom-left') { ctx.textAlign = 'left'; x = fontSize; }
            else if (pos === 'bottom-right') { ctx.textAlign = 'right'; x = cw - fontSize; }
            else if (pos === 'top-left') { ctx.textAlign = 'left'; x = fontSize; y = fontSize + 2; ctx.textBaseline = 'top'; }
            else if (pos === 'top-right') { ctx.textAlign = 'right'; x = cw - fontSize; y = fontSize + 2; ctx.textBaseline = 'top'; }
            ctx.fillText(text, x, y);
        },

        _drawHeaderText: function(ctx, cw, ch, scale, settings) {
            var fontSize = Math.max(8, settings.headerSize * 0.75);
            ctx.font = fontSize + 'px Inter, sans-serif';
            ctx.fillStyle = settings.headerColor || '#374151';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(settings.headerText, cw / 2, fontSize + 4);
        },

        _drawFooterText: function(ctx, cw, ch, scale, settings) {
            var fontSize = Math.max(8, settings.footerSize * 0.75);
            ctx.font = fontSize + 'px Inter, sans-serif';
            ctx.fillStyle = settings.footerColor || '#374151';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(settings.footerText, cw / 2, ch - fontSize - 4);
        },

        setZoom: function(z) {
            state.zoom = clamp(z, 25, 400);
            els.zoomLabel.textContent = state.zoom + '%';
            if (state.pages.length) this.renderPage(state.currentPageIndex);
        },

        fitToView: function() {
            state.zoom = 100;
            els.zoomLabel.textContent = '100%';
            if (state.pages.length) this.renderPage(state.currentPageIndex);
        },

        prevPage: function() {
            if (state.currentPageIndex > 0) {
                state.currentPageIndex--;
                this.render();
            }
        },

        nextPage: function() {
            if (state.currentPageIndex < state.pages.length - 1) {
                state.currentPageIndex++;
                this.render();
            }
        }
    };

    // ============================================================
    // PDF GENERATOR
    // ============================================================
    var PDFGenerator = {
        compressImage: function(item, quality) {
            var isPng = item.type === 'image/png';
            if (quality === 'original' && isPng) return Promise.resolve({ dataUrl: item.dataUrl, format: 'png' });
            if (quality === 'original' && item.type === 'image/jpeg') return Promise.resolve({ dataUrl: item.dataUrl, format: 'jpg' });
            var canvas = document.createElement('canvas');
            var img = item.img;
            var maxDim;
            switch (quality) {
                case 'high': maxDim = 2400; break;
                case 'medium': maxDim = 1600; break;
                case 'low': maxDim = 1000; break;
                default: maxDim = 2400;
            }
            var w = img.naturalWidth, h = img.naturalHeight;
            if (quality !== 'original' && (w > maxDim || h > maxDim)) {
                var ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            var jpegQuality;
            switch (quality) {
                case 'high': jpegQuality = 0.92; break;
                case 'medium': jpegQuality = 0.78; break;
                case 'low': jpegQuality = 0.55; break;
                default: jpegQuality = 0.92;
            }
            return Promise.resolve({ dataUrl: canvas.toDataURL('image/jpeg', jpegQuality), format: 'jpg' });
        },

        generate: async function() {
            if (state.isGenerating) return;
            if (!state.images.length) { notify('Please add at least one image', true); return; }
            if (typeof PDFLib === 'undefined') { notify('pdf-lib library not loaded. Check your connection.', true); return; }

            state.isGenerating = true;
            els.generateBtn.disabled = true;
            els.resultsArea.classList.remove('show');
            els.progressSection.classList.add('show');
            UI.showProgress();

            var settings = SettingsManager.getSettings();
            var startTime = Date.now();
            var total = state.images.length;
            var processed = 0;

            try {
                var pdfDoc = await PDFLib.PDFDocument.create();

                if (settings.metaTitle) pdfDoc.setTitle(settings.metaTitle);
                if (settings.metaAuthor) pdfDoc.setAuthor(settings.metaAuthor);
                if (settings.metaSubject) pdfDoc.setSubject(settings.metaSubject);
                if (settings.metaKeywords) pdfDoc.setKeywords(settings.metaKeywords.split(',').map(function(s) { return s.trim(); }));
                pdfDoc.setCreator('GoToolly Screenshot to PDF');
                pdfDoc.setProducer('pdf-lib + GoToolly');

                var helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

                LayoutManager.calculatePages(settings);

                for (var pi = 0; pi < state.pages.length; pi++) {
                    var page = state.pages[pi];
                    var pageDims = PageSize.get(settings);
                    if (settings.pageSize === 'auto' || settings.pageSize === 'fit') {
                        var maxW = 0, maxH = 0;
                        page.images.forEach(function(img) {
                            var r = ImageScaler.getDrawRect(img.width, img.height, 1000, 1000, settings.imageScale);
                            if (r.w > maxW) maxW = r.w;
                            if (r.h > maxH) maxH = r.h;
                        });
                        if (settings.pageSize === 'auto') {
                            var ratio = 72 / 96;
                            pageDims.width = maxW * ratio + 2 * pageDims.margin;
                            pageDims.height = maxH * ratio + 2 * pageDims.margin;
                        } else {
                            pageDims.width = maxW + 2 * pageDims.margin;
                            pageDims.height = maxH + 2 * pageDims.margin;
                        }
                        pageDims.innerW = pageDims.width - 2 * pageDims.margin;
                        pageDims.innerH = pageDims.height - 2 * pageDims.margin;
                    }

                    var pdfPage = pdfDoc.addPage([pageDims.width, pageDims.height]);

                    var bg = settings.bgColor;
                    if (bg && bg !== 'transparent') {
                        var bgRgb = parseHexColor(bg);
                        if (bgRgb) {
                            pdfPage.drawRectangle({
                                x: 0, y: 0,
                                width: pageDims.width,
                                height: pageDims.height,
                                color: PDFLib.rgb(bgRgb.r / 255, bgRgb.g / 255, bgRgb.b / 255)
                            });
                        }
                    }

                    var cells = LayoutManager.getCells(page, pageDims);

                    for (var ci = 0; ci < cells.length && ci < page.images.length; ci++) {
                        var cell = cells[ci];
                        var img = page.images[ci];
                        var compressed = await this.compressImage(img, settings.imageQuality);

                        var pdfImage;
                        if (compressed.format === 'png') {
                            pdfImage = await pdfDoc.embedPng(dataUrlToBytes(compressed.dataUrl));
                        } else {
                            pdfImage = await pdfDoc.embedJpg(dataUrlToBytes(compressed.dataUrl));
                        }

                        var drawRect = ImageScaler.getDrawRect(pdfImage.width, pdfImage.height, cell.w, cell.h, settings.imageScale);
                        pdfPage.drawImage(pdfImage, {
                            x: cell.x + drawRect.x,
                            y: pageDims.height - cell.y - drawRect.y - drawRect.h,
                            width: drawRect.w,
                            height: drawRect.h
                        });

                        processed++;
                        var pct = Math.round((processed / total) * 90);
                        UI.updateProgress(pct, processed, total, startTime);
                    }

                    if (settings.pageNumbering) {
                        var text = (pi + 1) + ' / ' + state.pages.length;
                        var fs = settings.pageNumberSize;
                        var pos = settings.pageNumberPos || 'bottom-center';
                        var px, py;
                        var pnRgb = parseHexColor(settings.pageNumberColor) || { r: 107, g: 114, b: 128 };
                        if (pos.indexOf('bottom') !== -1) {
                            py = fs + 4;
                        } else {
                            py = pageDims.height - 4;
                        }
                        if (pos.indexOf('left') !== -1) px = pageDims.margin + 4;
                        else if (pos.indexOf('right') !== -1) px = pageDims.width - pageDims.margin - 4;
                        else px = pageDims.width / 2;

                        var textW = helveticaFont.widthOfTextAtSize(text, fs);
                        if (pos.indexOf('center') !== -1) px = (pageDims.width - textW) / 2;
                        else if (pos.indexOf('right') !== -1) px = pageDims.width - pageDims.margin - textW - 4;

                        pdfPage.drawText(text, {
                            x: px,
                            y: py,
                            size: fs,
                            font: helveticaFont,
                            color: PDFLib.rgb(pnRgb.r / 255, pnRgb.g / 255, pnRgb.b / 255)
                        });
                    }

                    if (settings.headerEnabled && settings.headerText) {
                        var hRgb = parseHexColor(settings.headerColor) || { r: 55, g: 65, b: 81 };
                        var hTextW = helveticaFont.widthOfTextAtSize(settings.headerText, settings.headerSize);
                        pdfPage.drawText(settings.headerText, {
                            x: (pageDims.width - hTextW) / 2,
                            y: pageDims.height - settings.headerSize - 4,
                            size: settings.headerSize,
                            font: helveticaFont,
                            color: PDFLib.rgb(hRgb.r / 255, hRgb.g / 255, hRgb.b / 255)
                        });
                    }
                    if (settings.footerEnabled && settings.footerText) {
                        var fRgb = parseHexColor(settings.footerColor) || { r: 55, g: 65, b: 81 };
                        var fTextW = helveticaFont.widthOfTextAtSize(settings.footerText, settings.footerSize);
                        pdfPage.drawText(settings.footerText, {
                            x: (pageDims.width - fTextW) / 2,
                            y: settings.footerSize + 4,
                            size: settings.footerSize,
                            font: helveticaFont,
                            color: PDFLib.rgb(fRgb.r / 255, fRgb.g / 255, fRgb.b / 255)
                        });
                    }
                }

                UI.updateProgress(95, total, total, startTime);
                els.progressText.textContent = 'Saving PDF...';

                var saveOptions = {};
                if (settings.exportQuality === 'maximum') saveOptions.useObjectStreams = true;
                else if (settings.exportQuality === 'high') saveOptions.useObjectStreams = true;

                var pdfBytes = await pdfDoc.save(saveOptions);
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                state.resultBlob = blob;

                UI.updateProgress(100, total, total, startTime);
                els.progressText.textContent = 'Done!';

                setTimeout(function() {
                    els.progressSection.classList.remove('show');
                    UI.hideProgress();
                    var pageCount = state.pages.length;
                    els.resultInfo.textContent = total + ' image' + (total !== 1 ? 's' : '') + ' \u00B7 ' + pageCount + ' page' + (pageCount !== 1 ? 's' : '') + ' \u00B7 ' + formatSize(blob.size);
                    els.resultsArea.classList.add('show');
                    notify('PDF generated successfully!');
                }, 600);

            } catch (err) {
                console.error('PDF generation error:', err);
                notify('Error: ' + err.message, true);
                els.progressSection.classList.remove('show');
                UI.hideProgress();
            }

            state.isGenerating = false;
            els.generateBtn.disabled = false;
        }
    };

    // ============================================================
    // UI MANAGER
    // ============================================================
    var UI = {
        init: function() {
            this.initPanels();
            this.initDropZone();
            this.initFileInput();
            this.initSettings();
            this.initActions();
            this.initPreview();
            this.initNavButtons();
        },

        initPanels: function() {
            qsa('.panel-section-header[data-toggle]').forEach(function(header) {
                header.addEventListener('click', function() {
                    var section = header.closest('.panel-section');
                    section.classList.toggle('open');
                });
            });
        },

        initDropZone: function() {
            var zone = els.dropZone;
            if (!zone) return;
            zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
            zone.addEventListener('dragleave', function() { zone.classList.remove('dragover'); });
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                zone.classList.remove('dragover');
                if (e.dataTransfer.files.length) ImageManager.addFiles(e.dataTransfer.files);
            });
        },

        initFileInput: function() {
            els.fileInput.addEventListener('change', function(e) {
                if (e.target.files.length) ImageManager.addFiles(e.target.files);
                e.target.value = '';
            });
        },

        initSettings: function() {
            qsa('.layout-option').forEach(function(opt) {
                opt.addEventListener('click', function() {
                    qsa('.layout-option').forEach(function(o) { o.classList.remove('active'); });
                    opt.classList.add('active');
                    var layout = opt.getAttribute('data-layout');
                    els.contactSettings.style.display = layout === 'contact' ? 'block' : 'none';
                    LayoutManager.recalculate();
                    PreviewManager.render();
                });
            });

            qsa('.margin-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    qsa('.margin-btn').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    var val = btn.getAttribute('data-margin');
                    els.marginCustom.style.display = val === 'custom' ? 'block' : 'none';
                    LayoutManager.recalculate();
                    PreviewManager.render();
                });
            });

            var triggerUpdate = function() {
                LayoutManager.recalculate();
                PreviewManager.render();
            };

            els.pageSize.addEventListener('change', triggerUpdate);
            els.orientation.addEventListener('change', triggerUpdate);
            els.marginCustom.addEventListener('input', triggerUpdate);
            els.imageScale.addEventListener('change', triggerUpdate);
            els.imageQuality.addEventListener('change', triggerUpdate);
            els.contactGap.addEventListener('input', triggerUpdate);
            els.contactPadding.addEventListener('input', triggerUpdate);
            els.imageGap.addEventListener('input', triggerUpdate);

            els.bgColor.addEventListener('change', function() {
                els.bgCustomRow.style.display = els.bgColor.value === 'custom' ? 'block' : 'none';
                PreviewManager.render();
            });
            els.bgCustomColor.addEventListener('input', function() { PreviewManager.render(); });

            els.pageNumberingEnabled.addEventListener('change', function() {
                els.pageNumberingOpts.style.display = els.pageNumberingEnabled.checked ? 'block' : 'none';
                PreviewManager.render();
            });
            els.pageNumberPos.addEventListener('change', function() { PreviewManager.render(); });
            els.pageNumberSize.addEventListener('input', function() { PreviewManager.render(); });
            els.pageNumberColor.addEventListener('input', function() { PreviewManager.render(); });

            els.headerEnabled.addEventListener('change', function() {
                els.headerOpts.style.display = els.headerEnabled.checked ? 'block' : 'none';
                PreviewManager.render();
            });
            els.headerText.addEventListener('input', function() { PreviewManager.render(); });
            els.headerSize.addEventListener('input', function() { PreviewManager.render(); });
            els.headerColor.addEventListener('input', function() { PreviewManager.render(); });

            els.footerEnabled.addEventListener('change', function() {
                els.footerOpts.style.display = els.footerEnabled.checked ? 'block' : 'none';
                PreviewManager.render();
            });
            els.footerText.addEventListener('input', function() { PreviewManager.render(); });
            els.footerSize.addEventListener('input', function() { PreviewManager.render(); });
            els.footerColor.addEventListener('input', function() { PreviewManager.render(); });
        },

        initActions: function() {
            els.generateBtn.addEventListener('click', function() { PDFGenerator.generate(); });

            els.resetBtn.addEventListener('click', function() {
                ImageManager.clear();
                state.resultBlob = null;
                els.fileInput.value = '';
                els.resultsArea.classList.remove('show');
                els.progressSection.classList.remove('show');
                UI.hideProgress();
                els.generateBtn.disabled = false;
                PreviewManager.render();
            });

            els.downloadBtn.addEventListener('click', function() {
                if (!state.resultBlob) return;
                var url = URL.createObjectURL(state.resultBlob);
                var a = document.createElement('a');
                a.href = url;
                a.download = (els.metaTitle.value || 'screenshots') + '.pdf';
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            });

            els.newBtn.addEventListener('click', function() {
                els.resultsArea.classList.remove('show');
                state.resultBlob = null;
                els.generateBtn.disabled = false;
                PreviewManager.render();
            });
        },

        initPreview: function() {
            els.zoomIn.addEventListener('click', function() { PreviewManager.setZoom(state.zoom + 25); });
            els.zoomOut.addEventListener('click', function() { PreviewManager.setZoom(state.zoom - 25); });
            els.zoomFit.addEventListener('click', function() { PreviewManager.fitToView(); });

            var wrap = els.previewCanvasWrap;
            wrap.addEventListener('wheel', function(e) {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    var delta = e.deltaY > 0 ? -10 : 10;
                    PreviewManager.setZoom(state.zoom + delta);
                }
            }, { passive: false });
        },

        initNavButtons: function() {
            var toolbar = els.previewToolbar;
            var rightGroup = toolbar.querySelector('.preview-toolbar-group:last-child');

            var prevBtn = document.createElement('button');
            prevBtn.id = 'page-prev';
            prevBtn.title = 'Previous page';
            prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>';
            prevBtn.addEventListener('click', function() { PreviewManager.prevPage(); });

            var nextBtn = document.createElement('button');
            nextBtn.id = 'page-next';
            nextBtn.title = 'Next page';
            nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>';
            nextBtn.addEventListener('click', function() { PreviewManager.nextPage(); });

            var leftGroup = toolbar.querySelector('.preview-toolbar-group');
            leftGroup.appendChild(prevBtn);
            leftGroup.appendChild(nextBtn);
        },

        showProgress: function() {
            els.progressFill.style.width = '0%';
            els.progressPercent.textContent = '0%';
            els.progressText.textContent = 'Generating PDF...';
            els.progressImages.textContent = '0 / ' + state.images.length + ' images';
            els.progressEta.textContent = '';
        },

        hideProgress: function() {
            els.progressFill.style.width = '0%';
        },

        updateProgress: function(pct, processed, total, startTime) {
            els.progressFill.style.width = pct + '%';
            els.progressPercent.textContent = pct + '%';
            els.progressText.textContent = 'Processing page...';
            els.progressImages.textContent = processed + ' / ' + total + ' images';

            var elapsed = (Date.now() - startTime) / 1000;
            if (processed > 0) {
                var perImage = elapsed / processed;
                var remaining = Math.ceil(perImage * (total - processed));
                els.progressEta.textContent = remaining > 0 ? '~' + remaining + 's remaining' : '';
            }
        }
    };

    // ============================================================
    // KEYBOARD SHORTCUTS
    // ============================================================
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key === 'ArrowLeft') { PreviewManager.prevPage(); e.preventDefault(); }
        if (e.key === 'ArrowRight') { PreviewManager.nextPage(); e.preventDefault(); }
        if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); PreviewManager.setZoom(state.zoom + 25); }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); PreviewManager.setZoom(state.zoom - 25); }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); PreviewManager.fitToView(); }
    });

    // ============================================================
    // WINDOW RESIZE
    // ============================================================
    var resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (state.pages.length) PreviewManager.renderPage(state.currentPageIndex);
        }, 150);
    });

    // ============================================================
    // INIT
    // ============================================================
    PreviewManager.init();
    UI.init();
    LayoutManager.recalculate();
    PreviewManager.render();
});
