document.addEventListener('DOMContentLoaded', function() {
    if (typeof PDFLib === 'undefined') { console.error('pdf-lib not loaded'); return; }
    var PDFDocument = PDFLib.PDFDocument;
    var rgb = PDFLib.rgb;
    var StandardFonts = PDFLib.StandardFonts;
    var degrees = PDFLib.degrees;

    var $ = function(id) { return document.getElementById(id); };
    var fileInput = $('file-input');
    var dropZone = $('drop-zone');
    var fileBadge = $('file-status-text');
    var previewEmpty = $('preview-empty');
    var canvasStage = $('canvas-stage');
    var previewCanvas = $('preview-canvas');
    var elementsStage = $('elements-stage');
    var zoomLabel = $('zoom-label');
    var pageInfo = $('page-info');
    var applyBtn = $('apply-btn');
    var resetBtn = $('reset-btn');
    var downloadBtn = $('download-btn');
    var newBtn = $('new-btn');
    var progressSection = $('progress-section');
    var progressFill = $('progress-fill');
    var progressPercent = $('progress-percent');
    var progressText = $('progress-text');
    var resultOverlay = $('result-overlay');
    var resultInfo = $('result-info');
    var elementsList = $('elements-list');
    var elCount = $('el-count');
    var propsContent = $('props-content');
    var propsTitle = $('props-title');
    var toolBtns = document.querySelectorAll('.tool-btn');
    var canvasWrap = $('preview-canvas-wrap');

    var state = {
        pdfBytes: null,
        fileName: '',
        pdfDoc: null,
        pdfJsDoc: null,
        currentPage: 1,
        totalPages: 0,
        elementsByPage: {},
        elementIdCounter: 0,
        selectedElementId: null,
        zoom: 1,
        activeTool: 'text',
        isCreateMode: false,
        isDragging: false,
        isResizing: false,
        dragStartX: 0,
        dragStartY: 0,
        elementStartX: 0,
        elementStartY: 0,
        dragHandle: null,
        resizeStartW: 0,
        resizeStartH: 0,
        dragOrigX: 0,
        dragOrigY: 0,
        dragMoved: false,
        pdfPageCache: null,
        pdfRenderBusy: false,
        pdfRenderQueued: false,
        rafId: null,
        pendingRender: false,
        resultBytes: null,
        isRotating: false,
        rotateStartAngle: 0,
        elementStartRotation: 0,
        undoStack: [],
        redoStack: []
    };

    function genId() { return 'el_' + (++state.elementIdCounter); }
    function getEls(page) { return state.elementsByPage[page] || []; }

    function getSelected() {
        var id = state.selectedElementId;
        if (!id) return null;
        var els = getEls(state.currentPage);
        for (var i = 0; i < els.length; i++) { if (els[i].id === id) return els[i]; }
        return null;
    }

    function elIndex(page, id) {
        var els = getEls(page);
        for (var i = 0; i < els.length; i++) { if (els[i].id === id) return i; }
        return -1;
    }

    function hitTest(pos, page) {
        page = page || state.currentPage;
        var els = getEls(page);
        for (var i = els.length - 1; i >= 0; i--) {
            var e = els[i];
            if (e.hidden) continue;
            if (pos.x >= e.x && pos.x <= e.x + e.width && pos.y >= e.y && pos.y <= e.y + e.height) {
                return e;
            }
        }
        return null;
    }

    function updateUI() {
        renderPage(state.currentPage);
        updateElementsList();
        updatePropertiesPanel();
        updateEditorState();
    }

    function notify(msg, isError) {
        var existing = document.querySelector('.notification');
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
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function hexToRgbObj(hex) {
        var r = parseInt(hex.slice(1, 3), 16) / 255;
        var g = parseInt(hex.slice(3, 5), 16) / 255;
        var b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
    }

    var imageFileInput = document.createElement('input');
    imageFileInput.type = 'file';
    imageFileInput.accept = 'image/png,image/jpeg,image/jpg,image/svg+xml';
    imageFileInput.style.display = 'none';
    document.body.appendChild(imageFileInput);

    var stampUploadInput = document.createElement('input');
    stampUploadInput.type = 'file';
    stampUploadInput.accept = 'image/png,image/jpeg,image/jpg,image/svg+xml';
    stampUploadInput.style.display = 'none';
    document.body.appendChild(stampUploadInput);

    var stampPickerEl = document.createElement('div');
    stampPickerEl.id = 'stamp-picker-popup';
    stampPickerEl.style.cssText = 'display:none;position:fixed;z-index:99999;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);padding:12px;width:240px';
    stampPickerEl.innerHTML = '<div style="font-size:11px;font-weight:600;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Choose Stamp</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px" id="stamp-grid"></div><div style="border-top:1px solid #e2e8f0;margin-top:8px;padding-top:8px;text-align:center"><button id="stamp-upload-btn" style="width:100%;padding:6px;border:1px dashed #d1d5db;border-radius:6px;background:#fafbfc;cursor:pointer;font-size:10px;font-weight:500;color:#64748b">Upload Custom Stamp</button></div>';
    document.body.appendChild(stampPickerEl);

    var stampGrid = stampPickerEl.querySelector('#stamp-grid');
    var stampDefs = [
        { type: 'approved', text: 'APPROVED', bg: '#16a34a', fg: '#ffffff' },
        { type: 'draft', text: 'DRAFT', bg: '#ea580c', fg: '#ffffff' },
        { type: 'confidential', text: 'CONFIDENTIAL', bg: '#dc2626', fg: '#ffffff' },
        { type: 'paid', text: 'PAID', bg: '#2563eb', fg: '#ffffff' },
        { type: 'void', text: 'VOID', bg: '#b91c1c', fg: '#ffffff' },
        { type: 'copy', text: 'COPY', bg: '#6b7280', fg: '#ffffff' }
    ];
    stampDefs.forEach(function(s) {
        var btn = document.createElement('div');
        btn.dataset.stampType = s.type;
        btn.style.cssText = 'padding:8px 4px;border-radius:6px;text-align:center;font-size:9px;font-weight:700;letter-spacing:.5px;cursor:pointer;transition:all .15s;border:2px solid transparent;color:' + s.fg + ';background:' + s.bg;
        btn.textContent = s.text;
        btn.addEventListener('mouseenter', function() { this.style.borderColor = '#2563eb'; this.style.transform = 'scale(1.05)'; });
        btn.addEventListener('mouseleave', function() { this.style.borderColor = 'transparent'; this.style.transform = ''; });
        btn.addEventListener('click', function() { hideStampPicker(); handleStampSelection(s.type); });
        stampGrid.appendChild(btn);
    });

    stampPickerEl.querySelector('#stamp-upload-btn').addEventListener('click', function() { hideStampPicker(); stampUploadInput.click(); });

    function showStampPicker() {
        var btn = document.querySelector('.tool-btn[data-tool="stamp"]');
        if (!btn) return;
        var rect = btn.getBoundingClientRect();
        stampPickerEl.style.display = 'block';
        var pw = stampPickerEl.offsetWidth, ph = stampPickerEl.offsetHeight;
        var left = rect.left, top = rect.bottom + 4;
        if (top + ph > window.innerHeight) top = rect.top - ph - 4;
        if (left + pw > window.innerWidth) left = window.innerWidth - pw - 8;
        stampPickerEl.style.left = Math.max(4, left) + 'px';
        stampPickerEl.style.top = Math.max(4, top) + 'px';
    }
    function hideStampPicker() { stampPickerEl.style.display = 'none'; }

    document.addEventListener('click', function(e) {
        if (stampPickerEl.style.display === 'block' && !stampPickerEl.contains(e.target) && !e.target.closest('.tool-btn[data-tool="stamp"]')) {
            hideStampPicker();
            if (state.activeTool === 'stamp' && state.isCreateMode) { state.isCreateMode = false; updateToolButtonStates(); }
        }
    });

    var imageCache = {};
    function loadImageToCache(el) {
        if (!el.src || imageCache[el.id]) return;
        var img = new Image();
        img.onload = function() { imageCache[el.id] = img; state.pdfPageCache = null; renderPage(state.currentPage); };
        img.src = el.src;
    }
    function loadPageImages() {
        var els = getEls(state.currentPage);
        for (var i = 0; i < els.length; i++) {
            var e = els[i];
            if ((e.type === 'image' || (e.type === 'stamp' && e.stampType === 'custom')) && e.src && !imageCache[e.id]) loadImageToCache(e);
        }
    }
    function handleImageFile(file, callback) {
        if (!file || !file.type.match(/^image\/(png|jpeg|jpg|svg\+xml)$/)) { notify('Please select a PNG, JPG, or SVG image', true); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
            var dataUrl = ev.target.result;
            var img = new Image();
            img.onload = function() { callback(dataUrl, img.naturalWidth, img.naturalHeight); };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }
    function handleStampSelection(stampType) {
        var sDef = null;
        for (var i = 0; i < stampDefs.length; i++) { if (stampDefs[i].type === stampType) { sDef = stampDefs[i]; break; } }
        if (!sDef) return;
        createElement('stamp', state.currentPage, 100, 100, { width: 160, height: 60, stampType: sDef.type, stampText: sDef.text, stampColor: sDef.bg, stampTextColor: sDef.fg });
        state.isCreateMode = false;
        updateToolButtonStates();
    }
    function wrapCanvasText(ctx, text, maxW) {
        var lines = [];
        var paragraphs = text.split('\n');
        for (var pi = 0; pi < paragraphs.length; pi++) {
            if (pi > 0 && paragraphs[pi].length === 0) { lines.push(''); continue; }
            var words = paragraphs[pi].match(/\S+/g) || [];
            var cur = '';
            for (var wi = 0; wi < words.length; wi++) {
                var testLine = cur ? cur + ' ' + words[wi] : words[wi];
                if (ctx.measureText(testLine).width > maxW && cur) { lines.push(cur); cur = words[wi]; }
                else { cur = testLine; }
            }
            if (cur) lines.push(cur);
        }
        return lines;
    }

    function downloadPdf(bytes, filename) {
        var blob = new Blob([bytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    function saveState() {
        var snap = JSON.stringify(state.elementsByPage);
        state.undoStack.push(snap);
        if (state.undoStack.length > 50) state.undoStack.shift();
        state.redoStack = [];
    }

    function restoreState(snap) {
        state.elementsByPage = JSON.parse(snap);
        state.selectedElementId = null;
        imageCache = {};
        var allP = [];
        for (var p in state.elementsByPage) allP = allP.concat(state.elementsByPage[p]);
        allP.forEach(function(e) { if ((e.type === 'image' || (e.type === 'stamp' && e.stampType === 'custom')) && e.src) loadImageToCache(e); });
        updateUI();
    }

    function undo() {
        if (state.undoStack.length < 2) return;
        state.redoStack.push(state.undoStack.pop());
        restoreState(state.undoStack[state.undoStack.length - 1]);
    }

    function redo() {
        if (state.redoStack.length === 0) return;
        state.undoStack.push(state.redoStack.pop());
        restoreState(state.undoStack[state.undoStack.length - 1]);
    }

    // ========== ELEMENT CREATION ==========
    function createElement(type, page, x, y, opts) {
        opts = opts || {};
        saveState();
        var el = {
            id: genId(),
            type: type,
            page: page || state.currentPage,
            x: x || 100,
            y: y || 100,
            width: opts.width || 120,
            height: opts.height || 60,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
            zIndex: 0,
            fill: opts.fill || '#3b82f6',
            stroke: opts.stroke || 'transparent',
            strokeWidth: opts.strokeWidth || 2,
            text: opts.text || '',
            fontSize: opts.fontSize || 20,
            fontColor: opts.fontColor || '#1e293b',
            highlightColor: opts.highlightColor || '#fef08a',
            src: opts.src || '',
            naturalWidth: opts.naturalWidth || 0,
            naturalHeight: opts.naturalHeight || 0,
            stampType: opts.stampType || '',
            stampText: opts.stampText || '',
            stampColor: opts.stampColor || '#dc2626',
            stampTextColor: opts.stampTextColor || '#ffffff',
            arrowColor: opts.arrowColor || '#1e293b',
            arrowThickness: opts.arrowThickness || 3
        };
        if (!state.elementsByPage[el.page]) state.elementsByPage[el.page] = [];
        el.zIndex = state.elementsByPage[el.page].length;
        state.elementsByPage[el.page].push(el);
        state.selectedElementId = el.id;
        state.pdfPageCache = null;
        if (el.type === 'image' || (el.type === 'stamp' && el.stampType === 'custom')) loadImageToCache(el);
        updateUI();
        return el;
    }

    // ========== ELEMENT MANIPULATION ==========
    function deleteSelected() {
        var el = getSelected();
        if (!el) return;
        saveState();
        if (imageCache[el.id]) delete imageCache[el.id];
        var els = getEls(state.currentPage);
        var idx = elIndex(state.currentPage, el.id);
        if (idx !== -1) els.splice(idx, 1);
        state.selectedElementId = null;
        state.pdfPageCache = null;
        updateUI();
    }

    function duplicateSelected() {
        var el = getSelected();
        if (!el) return;
        saveState();
        var copy = JSON.parse(JSON.stringify(el));
        copy.id = genId();
        copy.x += 15;
        copy.y += 15;
        if (!state.elementsByPage[copy.page]) state.elementsByPage[copy.page] = [];
        copy.zIndex = state.elementsByPage[copy.page].length;
        state.elementsByPage[copy.page].push(copy);
        state.selectedElementId = copy.id;
        if ((copy.type === 'image' || (copy.type === 'stamp' && copy.stampType === 'custom')) && copy.src) loadImageToCache(copy);
        state.pdfPageCache = null;
        updateUI();
    }

    function toggleLock() {
        var el = getSelected();
        if (!el) return;
        saveState();
        el.locked = !el.locked;
        state.pdfPageCache = null;
        renderPage(state.currentPage);
        updatePropertiesPanel();
    }

    function toggleHidden() {
        var el = getSelected();
        if (!el) return;
        saveState();
        el.hidden = !el.hidden;
        state.pdfPageCache = null;
        updateUI();
    }

    function moveLayer(dir) {
        var el = getSelected();
        if (!el) return;
        saveState();
        var els = getEls(state.currentPage);
        var idx = elIndex(state.currentPage, el.id);
        if (idx === -1) return;
        if (dir === 'up' && idx < els.length - 1) {
            els.splice(idx, 1); els.splice(idx + 1, 0, el);
        } else if (dir === 'down' && idx > 0) {
            els.splice(idx, 1); els.splice(idx - 1, 0, el);
        } else if (dir === 'top') {
            els.splice(idx, 1); els.push(el);
        } else if (dir === 'bottom') {
            els.splice(idx, 1); els.unshift(el);
        }
        for (var i = 0; i < els.length; i++) els[i].zIndex = i;
        state.pdfPageCache = null;
        renderPage(state.currentPage);
        updateElementsList();
    }

    function updateElementProp(prop, value) {
        var el = getSelected();
        if (!el) return;
        saveState();
        el[prop] = value;
        state.pdfPageCache = null;
        updateUI();
    }

    // ========== CANVAS RENDERING ==========
    function renderPage(pageNum) {
        if (!state.pdfJsDoc) return;
        loadPageImages();
        renderPdfPage(pageNum);
        renderElementOverlays(pageNum);
    }

    function renderPdfPage(pageNum) {
        if (state.pdfRenderBusy) { state.pdfRenderQueued = true; return; }
        state.pdfRenderBusy = true;
        var pdfDoc = state.pdfJsDoc;
        pdfDoc.getPage(pageNum).then(function(page) {
            var viewport = page.getViewport({ scale: state.zoom });
            previewCanvas.width = viewport.width;
            previewCanvas.height = viewport.height;
            var ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function() {
                state.pdfPageCache = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
                state.pdfRenderBusy = false;
                drawElementsOverCache(pageNum);
                if (state.pdfRenderQueued) { state.pdfRenderQueued = false; renderPdfPage(pageNum); }
            }).catch(function(err) {
                console.error('page.render error:', err);
                state.pdfRenderBusy = false;
                if (state.pdfRenderQueued) { state.pdfRenderQueued = false; renderPdfPage(pageNum); }
            });
        }).catch(function(err) {
            console.error('getPage error:', err);
            state.pdfRenderBusy = false;
            if (state.pdfRenderQueued) { state.pdfRenderQueued = false; renderPdfPage(pageNum); }
        });
    }

    function drawElementsOverCache(pageNum) {
        var ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
        var els = getEls(pageNum);
        for (var i = 0; i < els.length; i++) {
            if (els[i].hidden) continue;
            drawElementOnCanvas(ctx, els[i], state.zoom);
        }
        drawSelectionHandles(ctx);
    }

    function renderDragFrame() {
        var ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
        if (state.pdfPageCache) {
            ctx.putImageData(state.pdfPageCache, 0, 0);
        } else {
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
        drawElementsOverCache(state.currentPage);
    }

    function renderElementOverlays(pageNum) {
        elementsStage.innerHTML = '';
        var els = getEls(pageNum);
        if (els.length === 0) return;
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.hidden) continue;
            var div = document.createElement('div');
            div.className = 'el-overlay';
            div.dataset.elId = el.id;
            var z = state.zoom;
            var ovW = Math.max(el.width * z, 10);
            var ovH = Math.max(el.height * z, 10);
            var isSelected = el.id === state.selectedElementId;
            var borderStr = isSelected ? '2px solid #2563eb' : '1px dashed transparent';
            var bgStr = isSelected ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0)';
            var baseCss = 'position:absolute;left:' + (el.x * z) + 'px;top:' + (el.y * z) + 'px;width:' + ovW + 'px;height:' + ovH + 'px;cursor:' + (el.locked ? 'default' : 'move') + ';z-index:' + (el.zIndex + 10) + ';border:' + borderStr + ';border-radius:2;background:' + bgStr + ';pointer-events:auto;box-sizing:border-box';
            if (el.type === 'text') {
                var tp = 4;
                var fsz = el.fontSize || 20;
                baseCss += ';padding:' + (tp * z) + 'px;font-size:' + (fsz * z) + 'px;font-family:Arial,sans-serif;color:' + (el.fontColor || '#1e293b') + ';line-height:' + (fsz * z * 1.2) + 'px;white-space:pre-wrap;word-wrap:break-word;overflow:hidden;text-overflow:ellipsis;user-select:none';
                div.style.cssText = baseCss;
                div.textContent = el.text || '';
                div.addEventListener('pointerdown', onElementPointerDown);
                elementsStage.appendChild(div);
                if (div.scrollHeight > ovH) {
                    el.height = div.scrollHeight / z;
                    div.style.height = div.scrollHeight + 'px';
                }
            } else if (el.type === 'callout') {
                var cBoxW = ovW * 0.65;
                var cBoxH = ovH * 0.65;
                var cPad = 4 * z;
                baseCss += ';left:' + (el.x * z) + 'px;top:' + (el.y * z) + 'px;width:' + cBoxW + 'px;height:' + cBoxH + 'px;padding:' + cPad + 'px;font-size:' + ((el.fontSize || 14) * z) + 'px;font-family:Arial,sans-serif;color:' + (el.fontColor || '#1e293b') + ';line-height:' + ((el.fontSize || 14) * z * 1.3) + 'px;white-space:pre-wrap;word-wrap:break-word;overflow:hidden;text-overflow:ellipsis;user-select:none;background:transparent;border:none';
                div.style.cssText = baseCss;
                div.textContent = el.text || '';
                div.addEventListener('pointerdown', onElementPointerDown);
                elementsStage.appendChild(div);
            } else {
                div.style.cssText = baseCss;
                div.addEventListener('pointerdown', onElementPointerDown);
                elementsStage.appendChild(div);
            }
        }
    }

    function drawElementOnCanvas(ctx, el, zoom) {
        ctx.save();
        var x = el.x * zoom, y = el.y * zoom, w = el.width * zoom, h = el.height * zoom;
        var cx = x + w / 2, cy = y + h / 2;
        if (el.rotation) { ctx.translate(cx, cy); ctx.rotate(el.rotation * Math.PI / 180); ctx.translate(-cx, -cy); }
        ctx.globalAlpha = el.opacity;

        if (el.type === 'rectangle' || el.type === 'redact') {
            ctx.fillStyle = el.type === 'redact' ? '#000000' : el.fill;
            ctx.fillRect(x, y, w, h);
            if (el.stroke !== 'transparent' && el.type !== 'redact') {
                ctx.strokeStyle = el.stroke;
                ctx.lineWidth = el.strokeWidth;
                ctx.strokeRect(x, y, w, h);
            }
        } else if (el.type === 'rounded-rect') {
            var r = Math.min(w, h) * 0.15;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fillStyle = el.fill;
            ctx.fill();
            if (el.stroke !== 'transparent') {
                ctx.strokeStyle = el.stroke;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke();
            }
        } else if (el.type === 'circle') {
            var rad = Math.min(w, h) / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fillStyle = el.fill;
            ctx.fill();
            if (el.stroke !== 'transparent') {
                ctx.strokeStyle = el.stroke;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke();
            }
        } else if (el.type === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fillStyle = el.fill;
            ctx.fill();
            if (el.stroke !== 'transparent') {
                ctx.strokeStyle = el.stroke;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke();
            }
        } else if (el.type === 'line' || el.type === 'arrow') {
            ctx.beginPath();
            ctx.moveTo(x, y + h);
            ctx.lineTo(x + w, y);
            ctx.strokeStyle = el.stroke !== 'transparent' ? el.stroke : el.fill;
            ctx.lineWidth = el.strokeWidth || 3;
            ctx.stroke();
            if (el.type === 'arrow') {
                var angle = Math.atan2(-h, w);
                var headLen = 12 * zoom;
                ctx.beginPath();
                ctx.moveTo(x + w, y);
                ctx.lineTo(x + w - headLen * Math.cos(angle - Math.PI / 6), y + headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(x + w, y);
                ctx.lineTo(x + w - headLen * Math.cos(angle + Math.PI / 6), y + headLen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
            }
        } else if (el.type === 'highlight') {
            ctx.fillStyle = el.highlightColor || '#fef08a';
            ctx.globalAlpha = 0.4;
            ctx.fillRect(x, y, w, h);
        } else if (el.type === 'text') {
            // Text is rendered by the HTML overlay div in renderElementOverlays
        } else if (el.type === 'image') {
            var img = imageCache[el.id];
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x, y, w, h);
            } else {
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(x, y, w, h);
                ctx.setLineDash([]);
                ctx.fillStyle = '#94a3b8';
                ctx.font = (12 * zoom) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Image', cx, cy);
            }
        } else if (el.type === 'stamp') {
            if (el.stampType === 'custom' && el.src) {
                var sImg = imageCache[el.id];
                if (sImg && sImg.complete && sImg.naturalWidth > 0) {
                    ctx.drawImage(sImg, x, y, w, h);
                } else {
                    ctx.fillStyle = '#f1f5f9';
                    ctx.fillRect(x, y, w, h);
                }
            } else {
                var sR = Math.min(w, h) * 0.1;
                ctx.beginPath();
                ctx.moveTo(x + sR, y);
                ctx.lineTo(x + w - sR, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + sR);
                ctx.lineTo(x + w, y + h - sR);
                ctx.quadraticCurveTo(x + w, y + h, x + w - sR, y + h);
                ctx.lineTo(x + sR, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - sR);
                ctx.lineTo(x, y + sR);
                ctx.quadraticCurveTo(x, y, x + sR, y);
                ctx.closePath();
                ctx.fillStyle = el.stampColor || '#dc2626';
                ctx.globalAlpha = 0.2;
                ctx.fill();
                ctx.globalAlpha = el.opacity;
                ctx.lineWidth = 3 * zoom;
                ctx.strokeStyle = el.stampColor || '#dc2626';
                ctx.stroke();
                var sFontSize = Math.min(w * 0.32, h * 0.45);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(-5 * Math.PI / 180);
                ctx.fillStyle = el.stampColor || '#dc2626';
                ctx.font = 'bold ' + Math.max(sFontSize, 8) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.stampText || 'STAMP', 0, 0);
                ctx.restore();
            }
        } else if (el.type === 'callout') {
            var cBoxW = w * 0.65;
            var cBoxH = h * 0.65;
            var aStartX = x + cBoxW * 0.7;
            var aStartY = y + cBoxH;
            var aEndX = x + w;
            var aEndY = y + h;
            ctx.beginPath();
            ctx.moveTo(aStartX, aStartY);
            ctx.lineTo(aEndX, aEndY);
            ctx.strokeStyle = el.arrowColor || el.stroke || '#1e293b';
            ctx.lineWidth = el.arrowThickness || 3;
            ctx.stroke();
            var aAngle = Math.atan2(aEndY - aStartY, aEndX - aStartX);
            var aHeadLen = 10 * zoom;
            ctx.beginPath();
            ctx.moveTo(aEndX, aEndY);
            ctx.lineTo(aEndX - aHeadLen * Math.cos(aAngle - Math.PI / 6), aEndY - aHeadLen * Math.sin(aAngle - Math.PI / 6));
            ctx.moveTo(aEndX, aEndY);
            ctx.lineTo(aEndX - aHeadLen * Math.cos(aAngle + Math.PI / 6), aEndY - aHeadLen * Math.sin(aAngle + Math.PI / 6));
            ctx.stroke();
            ctx.fillStyle = el.fill || '#ffffff';
            ctx.fillRect(x, y, cBoxW, cBoxH);
            if (el.stroke && el.stroke !== 'transparent') {
                ctx.strokeStyle = el.stroke;
                ctx.lineWidth = el.strokeWidth || 2;
                ctx.strokeRect(x, y, cBoxW, cBoxH);
            }
            var cPad = 6 * zoom;
            var cFS = (el.fontSize || 14) * zoom;
            ctx.fillStyle = el.fontColor || '#1e293b';
            ctx.font = cFS + 'px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            var cLines = wrapCanvasText(ctx, el.text || 'Callout', cBoxW - cPad * 2);
            var cLH = cFS * 1.3;
            var maxCLines = Math.floor((cBoxH - cPad * 2) / cLH);
            for (var cli = 0; cli < Math.min(cLines.length, maxCLines); cli++) {
                ctx.fillText(cLines[cli], x + cPad, y + cPad + cli * cLH);
            }
        }
        ctx.restore();
    }

    function drawSelectionHandles(ctx) {
        var el = getSelected();
        if (!el || el.locked) return;
        var z = state.zoom;
        var x = el.x * z, y = el.y * z, w = el.width * z, h = el.height * z;
        ctx.save();
        ctx.fillStyle = '#2563eb';
        var hs = 6;
        var handles = [[x, y], [x + w, y], [x, y + h], [x + w, y + h],
                       [x + w/2, y], [x + w/2, y + h], [x, y + h/2], [x + w, y + h/2]];
        for (var i = 0; i < handles.length; i++) {
            ctx.fillRect(handles[i][0] - hs/2, handles[i][1] - hs/2, hs, hs);
        }
        var rcx = x + w / 2;
        var rcy = y - 30;
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.moveTo(rcx, y);
        ctx.lineTo(rcx, rcy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(rcx, rcy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // ========== PDF LOADING ==========
    function loadPdf(file) {
        if (!file || file.type !== 'application/pdf') { notify('Please select a PDF file', true); return; }
        if (file.size > 25 * 1024 * 1024) { notify('File too large (max 25 MB)', true); return; }

        fileBadge.textContent = file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name;
        fileBadge.style.color = '#0f172a';
        state.fileName = file.name;

        file.arrayBuffer().then(function(buf) {
            state.pdfBytes = buf;
            return PDFDocument.load(buf);
        }).then(function(pdfDoc) {
            state.pdfDoc = pdfDoc;
            state.totalPages = pdfDoc.getPageCount();
            pageInfo.textContent = '1 / ' + state.totalPages;
            $('prev-page').disabled = true;
            $('next-page').disabled = state.totalPages <= 1;
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                return pdfjsLib.getDocument({ data: state.pdfBytes.slice(0) }).promise;
            }
            return null;
        }).then(function(pdfJsDoc) {
            if (pdfJsDoc) {
                state.pdfJsDoc = pdfJsDoc;
                previewEmpty.style.display = 'none';
                canvasStage.style.display = 'inline-block';
                state.currentPage = 1;
                state.zoom = 1;
                zoomLabel.textContent = '100%';
                applyBtn.disabled = false;
                state.pdfPageCache = null;
                renderPage(1);
            } else {
                previewEmpty.innerHTML = '<p style="font-size:13px;font-weight:500;margin:0">PDF loaded</p><small style="font-size:11px">' + state.totalPages + ' page(s) detected. pdf.js not loaded for preview.</small>';
                previewEmpty.style.display = 'flex';
                applyBtn.disabled = false;
            }
            state.elementsByPage = {};
            state.elementIdCounter = 0;
            state.selectedElementId = null;
            state.undoStack = [];
            state.redoStack = [];
            imageCache = {};
            updateElementsList();
            updatePropertiesPanel();
            updateEditorState();
        }).catch(function(err) {
            console.error('Load error:', err);
            notify('Error loading PDF: ' + err.message, true);
        });
    }

    // ========== NAVIGATION ==========
    function goToPage(num) {
        if (num < 1 || num > state.totalPages) return;
        state.selectedElementId = null;
        state.currentPage = num;
        state.pdfPageCache = null;
        pageInfo.textContent = num + ' / ' + state.totalPages;
        $('prev-page').disabled = num <= 1;
        $('next-page').disabled = num >= state.totalPages;
        updateUI();
    }

    // ========== ZOOM ==========
    function setZoom(level) {
        level = Math.max(0.25, Math.min(5, level));
        state.zoom = level;
        state.pdfPageCache = null;
        zoomLabel.textContent = Math.round(level * 100) + '%';
        renderPage(state.currentPage);
    }

    function zoomFit() {
        if (!state.pdfJsDoc) return;
        var wrapW = canvasWrap.clientWidth - 48;
        var wrapH = canvasWrap.clientHeight - 48;
        var pageViewport = null;
        state.pdfJsDoc.getPage(state.currentPage).then(function(page) {
            pageViewport = page.getViewport({ scale: 1 });
            var scaleW = wrapW / pageViewport.width;
            var scaleH = wrapH / pageViewport.height;
            state.zoom = Math.max(0.25, Math.min(scaleW, scaleH));
            state.pdfPageCache = null;
            zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
            renderPage(state.currentPage);
        });
    }

    // ========== ELEMENTS LIST ==========
    function updateElementsList() {
        var els = getEls(state.currentPage);
        elCount.textContent = '(' + els.length + ')';
        if (els.length === 0) {
            elementsList.innerHTML = '<div class="el-empty">No elements on this page</div>';
            return;
        }
        var html = '';
        for (var i = els.length - 1; i >= 0; i--) {
            var e = els[i];
            var sel = e.id === state.selectedElementId ? ' style="background:#eff6ff;border-color:#2563eb"' : '';
            html += '<div class="el-list-item" data-el-id="' + e.id + '"' + sel + '>' +
                '<span class="el-type-badge">' + e.type + '</span>' +
                '<span class="el-label">' + (e.text || e.stampText || e.type) + '</span>' +
                (e.locked ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10" class="el-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' : '') +
                (e.hidden ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10" class="el-icon"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' : '') +
                '</div>';
        }
        elementsList.innerHTML = html;
        elementsList.querySelectorAll('.el-list-item').forEach(function(item) {
            item.addEventListener('click', function() {
                state.selectedElementId = item.dataset.elId;
                updateElementsList();
                renderPage(state.currentPage);
                updatePropertiesPanel();
            });
        });
    }

    // ========== PROPERTIES PANEL ==========
    function updatePropertiesPanel() {
        var el = getSelected();
        if (!el) {
            propsTitle.textContent = 'Properties';
            propsContent.innerHTML = '<p class="props-empty">Select an element to edit its properties</p>';
            return;
        }
        propsTitle.textContent = el.type.charAt(0).toUpperCase() + el.type.slice(1) + ' Properties';
        propsContent.innerHTML = buildPropsHtml(el);
        bindPropsEvents(el);
    }

    function buildPropsHtml(el) {
        var h = '';
        h += '<div class="prop-row"><label>X</label><input type="number" class="prop-input" data-prop="x" value="' + Math.round(el.x) + '" step="1"></div>';
        h += '<div class="prop-row"><label>Y</label><input type="number" class="prop-input" data-prop="y" value="' + Math.round(el.y) + '" step="1"></div>';
        h += '<div class="prop-row"><label>Width</label><input type="number" class="prop-input" data-prop="width" value="' + Math.round(el.width) + '" step="1" min="5"></div>';
        h += '<div class="prop-row"><label>Height</label><input type="number" class="prop-input" data-prop="height" value="' + Math.round(el.height) + '" step="1" min="5"></div>';
        h += '<div class="prop-row"><label>Rotation</label><input type="number" class="prop-input" data-prop="rotation" value="' + Math.round(el.rotation) + '" step="5"></div>';
        h += '<div class="prop-row"><label>Opacity</label><input type="range" class="prop-range" data-prop="opacity" value="' + (el.opacity * 100) + '" min="0" max="100" step="5"><span class="range-val">' + Math.round(el.opacity * 100) + '%</span></div>';
        if (el.type === 'highlight') {
            var colors = ['#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff','#fed7aa'];
            h += '<div class="prop-row prop-row-swatches"><label>Color</label>';
            for (var ci = 0; ci < colors.length; ci++) {
                var act = el.highlightColor === colors[ci] ? ' prop-swatch-active' : '';
                h += '<div class="swatch' + act + '" data-prop="highlightColor" data-color="' + colors[ci] + '"></div>';
            }
            h += '</div>';
        }
        if (el.type === 'text') {
            h += '<div class="prop-row prop-row-col"><label class="prop-label-full">Text</label><textarea class="prop-textarea" data-prop="text" rows="2">' + (el.text || '') + '</textarea></div>';
            h += '<div class="prop-row"><label>Font Size</label><input type="number" class="prop-input" data-prop="fontSize" value="' + el.fontSize + '" step="1" min="6" max="200"></div>';
            h += '<div class="prop-row"><label>Color</label><input type="color" class="prop-color" data-prop="fontColor" value="' + (el.fontColor || '#1e293b') + '"></div>';
        }
        if (el.type === 'rectangle' || el.type === 'rounded-rect' || el.type === 'circle' || el.type === 'ellipse') {
            h += '<div class="prop-row"><label>Fill</label><input type="color" class="prop-color" data-prop="fill" value="' + (el.fill || '#3b82f6') + '"></div>';
            h += '<div class="prop-row"><label>Stroke</label><input type="color" class="prop-color" data-prop="stroke" value="' + (el.stroke && el.stroke !== 'transparent' ? el.stroke : '#000000') + '"></div>';
        }
        if (el.type === 'line' || el.type === 'arrow') {
            h += '<div class="prop-row"><label>Color</label><input type="color" class="prop-color" data-prop="stroke" value="' + (el.stroke !== 'transparent' ? el.stroke : '#000000') + '"></div>';
        }
        if (el.type === 'stamp' && el.stampType !== 'custom') {
            h += '<div class="prop-row"><label>Stamp</label><span style="font-size:10px;font-weight:600;color:#0f172a;text-transform:uppercase">' + (el.stampText || el.stampType) + '</span></div>';
            h += '<div class="prop-row"><label>Fill</label><input type="color" class="prop-color" data-prop="stampColor" value="' + (el.stampColor || '#dc2626') + '"></div>';
            h += '<div class="prop-row"><label>Text</label><input type="color" class="prop-color" data-prop="stampTextColor" value="' + (el.stampTextColor || '#ffffff') + '"></div>';
        }
        if (el.type === 'callout') {
            h += '<div class="prop-row prop-row-col"><label class="prop-label-full">Text</label><textarea class="prop-textarea" data-prop="text" rows="2">' + (el.text || '') + '</textarea></div>';
            h += '<div class="prop-row"><label>Font Size</label><input type="number" class="prop-input" data-prop="fontSize" value="' + (el.fontSize || 14) + '" step="1" min="6" max="100"></div>';
            h += '<div class="prop-row"><label>Text Clr</label><input type="color" class="prop-color" data-prop="fontColor" value="' + (el.fontColor || '#1e293b') + '"></div>';
            h += '<div class="prop-row"><label>Fill</label><input type="color" class="prop-color" data-prop="fill" value="' + (el.fill || '#ffffff') + '"></div>';
            h += '<div class="prop-row"><label>Border</label><input type="color" class="prop-color" data-prop="stroke" value="' + (el.stroke && el.stroke !== 'transparent' ? el.stroke : '#3b82f6') + '"></div>';
            h += '<div class="prop-row"><label>Border W</label><input type="number" class="prop-input" data-prop="strokeWidth" value="' + (el.strokeWidth || 2) + '" step="1" min="0" max="20"></div>';
            h += '<div class="prop-row"><label>Arr. Clr</label><input type="color" class="prop-color" data-prop="arrowColor" value="' + (el.arrowColor || '#1e293b') + '"></div>';
            h += '<div class="prop-row"><label>Arr. W</label><input type="number" class="prop-input" data-prop="arrowThickness" value="' + (el.arrowThickness || 3) + '" step="1" min="1" max="20"></div>';
        }
        h += '<div class="prop-actions"><button class="prop-btn" data-action="duplicate">Duplicate</button><button class="prop-btn" data-action="lock">' + (el.locked ? 'Unlock' : 'Lock') + '</button><button class="prop-btn" data-action="hide">' + (el.hidden ? 'Show' : 'Hide') + '</button><button class="prop-btn danger" data-action="delete">Delete</button></div>';
        h += '<div class="prop-actions"><button class="prop-btn" data-action="layer-up">Up</button><button class="prop-btn" data-action="layer-down">Down</button><button class="prop-btn" data-action="layer-top">Front</button><button class="prop-btn" data-action="layer-bottom">Back</button></div>';
        return h;
    }

    function bindPropsEvents(el) {
        propsContent.querySelectorAll('.prop-input').forEach(function(inp) {
            inp.addEventListener('change', function() { updateElementProp(this.dataset.prop, parseFloat(this.value) || 0); });
        });
        propsContent.querySelectorAll('.prop-input:not([data-prop="fontSize"])').forEach(function(inp) {
            inp.addEventListener('input', function() {
                var e = getSelected();
                if (!e) return;
                e[this.dataset.prop] = parseFloat(this.value) || 0;
                state.pdfPageCache = null;
                renderPage(state.currentPage);
            });
        });
        propsContent.querySelectorAll('.prop-range').forEach(function(inp) {
            var valEl = inp.parentElement.querySelector('.range-val');
            inp.addEventListener('input', function() { if (valEl) valEl.textContent = this.value + '%'; });
            inp.addEventListener('change', function() { updateElementProp(this.dataset.prop, parseFloat(this.value) / 100); });
        });
        propsContent.querySelectorAll('.prop-color').forEach(function(inp) {
            inp.addEventListener('change', function() { updateElementProp(this.dataset.prop, this.value); });
            inp.addEventListener('input', function() { updateElementProp(this.dataset.prop, this.value); });
        });
        propsContent.querySelectorAll('.prop-textarea').forEach(function(ta) {
            ta.addEventListener('change', function() { updateElementProp(this.dataset.prop, this.value); });
            ta.addEventListener('input', function() {
                var e = getSelected();
                if (!e) return;
                e.text = this.value;
                state.pdfPageCache = null;
                renderPage(state.currentPage);
            });
        });
        propsContent.querySelectorAll('.prop-input[data-prop="fontSize"]').forEach(function(inp) {
            inp.addEventListener('input', function() {
                var e = getSelected();
                if (!e) return;
                e.fontSize = parseFloat(this.value) || 6;
                state.pdfPageCache = null;
                renderPage(state.currentPage);
            });
        });
        propsContent.querySelectorAll('.swatch').forEach(function(sw) {
            sw.addEventListener('click', function() { updateElementProp('highlightColor', this.dataset.color); });
        });
        propsContent.querySelectorAll('.prop-btn[data-action="duplicate"]').forEach(function(b) { b.addEventListener('click', duplicateSelected); });
        propsContent.querySelectorAll('.prop-btn[data-action="lock"]').forEach(function(b) { b.addEventListener('click', toggleLock); });
        propsContent.querySelectorAll('.prop-btn[data-action="hide"]').forEach(function(b) { b.addEventListener('click', toggleHidden); });
        propsContent.querySelectorAll('.prop-btn[data-action="delete"]').forEach(function(b) { b.addEventListener('click', deleteSelected); });
        propsContent.querySelectorAll('.prop-btn[data-action="layer-up"]').forEach(function(b) { b.addEventListener('click', function() { moveLayer('up'); }); });
        propsContent.querySelectorAll('.prop-btn[data-action="layer-down"]').forEach(function(b) { b.addEventListener('click', function() { moveLayer('down'); }); });
        propsContent.querySelectorAll('.prop-btn[data-action="layer-top"]').forEach(function(b) { b.addEventListener('click', function() { moveLayer('top'); }); });
        propsContent.querySelectorAll('.prop-btn[data-action="layer-bottom"]').forEach(function(b) { b.addEventListener('click', function() { moveLayer('bottom'); }); });
    }

    // ========== POINTER INTERACTION ==========
    function getCanvasCoords(e) {
        var rect = canvasStage.getBoundingClientRect();
        var z = state.zoom;
        if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
        return { x: (e.clientX - rect.left) / z, y: (e.clientY - rect.top) / z };
    }

    function getHandleAt(pos, el) {
        if (!el) return null;
        var z = state.zoom;
        var hs = 10 / z;
        var cx = el.x + el.width / 2;
        var cy = el.y + el.height / 2;
        var rotDist = Math.sqrt(Math.pow(pos.x - cx, 2) + Math.pow(pos.y - (el.y - 30 / z), 2));
        if (rotDist < hs * 1.5) return 'rotate';
        var pts = {
            'nw': { x: el.x, y: el.y },
            'ne': { x: el.x + el.width, y: el.y },
            'sw': { x: el.x, y: el.y + el.height },
            'se': { x: el.x + el.width, y: el.y + el.height },
            'n': { x: el.x + el.width / 2, y: el.y },
            's': { x: el.x + el.width / 2, y: el.y + el.height },
            'w': { x: el.x, y: el.y + el.height / 2 },
            'e': { x: el.x + el.width, y: el.y + el.height / 2 }
        };
        for (var k in pts) {
            if (Math.abs(pos.x - pts[k].x) < hs && Math.abs(pos.y - pts[k].y) < hs) return k;
        }
        return null;
    }

    function onPointerDown(e) {
        if (e.button && e.button !== 0) return;
        var el = getSelected();
        if (!el) return;
        var pos = getCanvasCoords(e);
        var handle = getHandleAt(pos, el);
        if (handle === 'rotate' && !el.locked) {
            state.isRotating = true;
            var cx = el.x + el.width / 2;
            var cy = el.y + el.height / 2;
            state.rotateStartAngle = Math.atan2(pos.y - cy, pos.x - cx);
            state.elementStartRotation = el.rotation || 0;
            state.dragStartX = e.clientX;
            state.dragStartY = e.clientY;
            state.dragMoved = false;
            saveState();
            canvasWrap.setPointerCapture(e.pointerId);
            e.preventDefault();
            return;
        }
        if (handle && !el.locked) {
            state.isResizing = true;
            state.dragHandle = handle;
            state.dragStartX = e.clientX;
            state.dragStartY = e.clientY;
            state.elementStartX = el.x;
            state.elementStartY = el.y;
            state.resizeStartW = el.width;
            state.resizeStartH = el.height;
            state.dragMoved = false;
            saveState();
            canvasWrap.setPointerCapture(e.pointerId);
            e.preventDefault();
            return;
        }
        var found = hitTest(pos);
        if (found && found.id !== state.selectedElementId) {
            state.selectedElementId = found.id;
            renderPage(state.currentPage);
            updateElementsList();
            updatePropertiesPanel();
        }
        if (found && !found.locked) {
            state.isDragging = true;
            state.dragStartX = e.clientX;
            state.dragStartY = e.clientY;
            state.elementStartX = found.x;
            state.elementStartY = found.y;
            state.dragOrigX = pos.x;
            state.dragOrigY = pos.y;
            state.dragMoved = false;
            saveState();
            canvasWrap.setPointerCapture(e.pointerId);
            e.preventDefault();
        }
    }

    function onPointerMove(e) {
        if (!state.isDragging && !state.isResizing && !state.isRotating) return;
        e.preventDefault();
        state.dragMoved = true;

        if (state.isRotating) {
            var el = getSelected();
            if (!el) return;
            var pos = getCanvasCoords(e);
            var cx = el.x + el.width / 2;
            var cy = el.y + el.height / 2;
            var curAngle = Math.atan2(pos.y - cy, pos.x - cx);
            var delta = (curAngle - state.rotateStartAngle) * 180 / Math.PI;
            el.rotation = Math.round((state.elementStartRotation + delta) % 360);
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    renderDragFrame();
                    updatePropertiesPanel();
                });
            }
            return;
        }

        if (state.isDragging) {
            var pos = getCanvasCoords(e);
            var el = getSelected();
            if (!el) return;
            var dx = pos.x - state.dragOrigX;
            var dy = pos.y - state.dragOrigY;
            el.x = Math.max(0, state.elementStartX + dx);
            el.y = Math.max(0, state.elementStartY + dy);
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    renderDragFrame();
                    var overlayDiv = elementsStage.querySelector('[data-el-id="' + el.id + '"]');
                    if (overlayDiv) {
                        overlayDiv.style.left = (el.x * state.zoom) + 'px';
                        overlayDiv.style.top = (el.y * state.zoom) + 'px';
                    }
                });
            }
        } else if (state.isResizing) {
            var el = getSelected();
            if (!el) return;
            var dx = (e.clientX - state.dragStartX) / state.zoom;
            var dy = (e.clientY - state.dragStartY) / state.zoom;
            var h = state.dragHandle;
            var nx = el.x, ny = el.y, nw = el.width, nh = el.height;
            if (h.indexOf('e') !== -1) nw = Math.max(5, state.resizeStartW + dx);
            if (h.indexOf('w') !== -1) { nw = Math.max(5, state.resizeStartW - dx); nx = state.elementStartX + state.resizeStartW - nw; }
            if (h.indexOf('s') !== -1) nh = Math.max(5, state.resizeStartH + dy);
            if (h.indexOf('n') !== -1) { nh = Math.max(5, state.resizeStartH - dy); ny = state.elementStartY + state.resizeStartH - nh; }
            el.x = nx; el.y = ny; el.width = nw; el.height = nh;
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    renderDragFrame();
                    var overlayDiv = elementsStage.querySelector('[data-el-id="' + el.id + '"]');
                    if (overlayDiv) {
                        overlayDiv.style.left = (el.x * state.zoom) + 'px';
                        overlayDiv.style.top = (el.y * state.zoom) + 'px';
                        overlayDiv.style.width = Math.max(el.width * state.zoom, 10) + 'px';
                        overlayDiv.style.height = Math.max(el.height * state.zoom, 10) + 'px';
                    }
                });
            }
        }
    }

    function onPointerUp(e) {
        if (state.isDragging || state.isResizing || state.isRotating) {
            var moved = state.dragMoved;
            state.isDragging = false;
            state.isResizing = false;
            state.isRotating = false;
            state.dragHandle = null;
            state.dragMoved = false;
            if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
            state.pendingRender = false;
            if (moved) {
                state.pdfPageCache = null;
                renderPage(state.currentPage);
                updateElementsList();
                updatePropertiesPanel();
            }
        }
    }

    function onElementPointerDown(e) {
        var id = e.currentTarget.dataset.elId;
        if (id !== state.selectedElementId) {
            state.selectedElementId = id;
            renderPage(state.currentPage);
            updateElementsList();
            updatePropertiesPanel();
        }
    }

    function onCanvasClick(e) {
        if (state.dragMoved) return;
        var pos = getCanvasCoords(e);
        var found = hitTest(pos);
        if (!found) {
            state.selectedElementId = null;
            renderPage(state.currentPage);
            updateElementsList();
            updatePropertiesPanel();
        }
        if (!found && state.isCreateMode) {
            var opts;
            if (state.activeTool === 'text') {
                opts = { text: 'Text', fontSize: 20, fontColor: '#1e293b', width: 120, height: 32, fill: 'transparent' };
                createElement('text', state.currentPage, pos.x - 60, pos.y - 16, opts);
            } else if (state.activeTool === 'callout') {
                opts = { text: 'Callout text', fontSize: 14, fontColor: '#1e293b', fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 2, arrowColor: '#1e293b', arrowThickness: 3, width: 200, height: 160 };
                createElement('callout', state.currentPage, pos.x - 100, pos.y - 60, opts);
            } else {
                opts = { fill: '#3b82f6', stroke: 'transparent', strokeWidth: 2 };
                if (state.activeTool === 'highlight') opts = { highlightColor: '#fef08a' };
                if (state.activeTool === 'redact') opts = { fill: '#000000' };
                if (state.activeTool === 'line' || state.activeTool === 'arrow') opts = { stroke: '#1e293b', strokeWidth: 3, width: 150, height: 3 };
                createElement(state.activeTool, state.currentPage, pos.x - 50, pos.y - 30, opts);
            }
            state.isCreateMode = false;
            updateToolButtonStates();
        }
    }

    function updateToolButtonStates() {
        toolBtns.forEach(function(b) {
            b.classList.remove('active');
            b.style.background = '#fff';
            b.style.color = '#64748b';
        });
        if (state.isCreateMode) {
            toolBtns.forEach(function(b) {
                if (b.dataset.tool === state.activeTool) {
                    b.classList.add('active');
                    b.style.background = '#eff6ff';
                    b.style.color = '#2563eb';
                }
            });
        }
    }

    function updateEditorState() {
        var hasPdf = !!state.pdfBytes;
        var hasElements = false;
        for (var p in state.elementsByPage) {
            if (state.elementsByPage[p].length > 0) { hasElements = true; break; }
        }
        toolBtns.forEach(function(b) {
            b.style.pointerEvents = hasPdf ? '' : 'none';
            b.style.opacity = hasPdf ? '' : '0.4';
        });
        $('zoom-in').disabled = !hasPdf;
        $('zoom-out').disabled = !hasPdf;
        $('zoom-fit').disabled = !hasPdf;
        $('prev-page').disabled = !hasPdf || state.currentPage <= 1;
        $('next-page').disabled = !hasPdf || state.currentPage >= state.totalPages;
        applyBtn.disabled = !hasPdf || !hasElements;
    }

    // ========== EXPORT ==========
    function applyChanges() {
        if (!state.pdfBytes) { notify('No PDF loaded', true); return; }

        var hasElements = false;
        for (var p in state.elementsByPage) {
            if (state.elementsByPage[p].length > 0) { hasElements = true; break; }
        }
        if (!hasElements) { notify('No elements to apply', true); return; }

        progressSection.style.display = 'block';
        applyBtn.disabled = true;
        applyBtn.style.opacity = '0.5';
        resultOverlay.style.display = 'none';

        var totalEls = 0;
        for (var p2 in state.elementsByPage) totalEls += state.elementsByPage[p2].length;
        var processed = 0;

        PDFDocument.load(state.pdfBytes).then(async function(pdfDoc) {
            var font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            var boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            var unicodeFont = null;
            try {
                var fontResp = await fetch('https://fonts.gstatic.com/s/notosans/v28/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf');
                if (fontResp.ok) { var fontBytes = await fontResp.arrayBuffer(); unicodeFont = await pdfDoc.embedFont(new Uint8Array(fontBytes)); }
            } catch (e) { unicodeFont = null; }
            function pickFont(text) { if (unicodeFont && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0100-\u024F]/.test(text)) return unicodeFont; return font; }
            function pickBoldFont(text) { if (unicodeFont && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0100-\u024F]/.test(text)) return unicodeFont; return boldFont; }
            var pages = pdfDoc.getPages();

            for (var pi = 0; pi < pages.length; pi++) {
                var pageNum = pi + 1;
                var page = pages[pi];
                var dims = page.getSize();
                var els = state.elementsByPage[pageNum] || [];
                var pw = dims.width;
                var ph = dims.height;
                var scaleX = 1;
                var scaleY = 1;

                for (var ei = 0; ei < els.length; ei++) {
                    var el = els[ei];
                    if (el.hidden) continue;
                    var x = el.x * scaleX;
                    var y = ph - (el.y * scaleY) - (el.height * scaleY);
                    var w = el.width * scaleX;
                    var h = el.height * scaleY;

                    if (el.type === 'redact') {
                        page.drawRectangle({ x: x, y: y, width: w, height: h, color: rgb(0, 0, 0) });
                    } else if (el.type === 'rectangle') {
                        page.drawRectangle({
                            x: x, y: y, width: w, height: h,
                            color: hexToRgbObj(el.fill),
                            opacity: el.opacity,
                            borderColor: el.stroke !== 'transparent' ? hexToRgbObj(el.stroke) : undefined,
                            borderWidth: el.stroke !== 'transparent' ? el.strokeWidth : 0
                        });
                    } else if (el.type === 'rounded-rect') {
                        var rr = Math.min(w, h) * 0.15;
                        var svgRR = 'M ' + (x + rr) + ' ' + y +
                            ' L ' + (x + w - rr) + ' ' + y +
                            ' Q ' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + rr) +
                            ' L ' + (x + w) + ' ' + (y + h - rr) +
                            ' Q ' + (x + w) + ' ' + (y + h) + ' ' + (x + w - rr) + ' ' + (y + h) +
                            ' L ' + (x + rr) + ' ' + (y + h) +
                            ' Q ' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - rr) +
                            ' L ' + x + ' ' + (y + rr) +
                            ' Q ' + x + ' ' + y + ' ' + (x + rr) + ' ' + y + ' Z';
                        var drawOpts = { path: svgRR, color: hexToRgbObj(el.fill), opacity: el.opacity };
                        if (el.stroke !== 'transparent') {
                            drawOpts.borderColor = hexToRgbObj(el.stroke);
                            drawOpts.borderWidth = el.strokeWidth;
                        }
                        page.drawSvgPath(svgRR, drawOpts);
                    } else if (el.type === 'circle') {
                        var radX = w / 2;
                        var radY = h / 2;
                        var centerX = x + radX;
                        var centerY = y + radY;
                        page.drawEllipse({
                            x: centerX, y: centerY,
                            xScale: radX, yScale: radY,
                            color: hexToRgbObj(el.fill),
                            opacity: el.opacity,
                            borderColor: el.stroke !== 'transparent' ? hexToRgbObj(el.stroke) : undefined,
                            borderWidth: el.stroke !== 'transparent' ? el.strokeWidth : 0
                        });
                    } else if (el.type === 'ellipse') {
                        page.drawEllipse({
                            x: x + w / 2, y: y + h / 2,
                            xScale: w / 2, yScale: h / 2,
                            color: hexToRgbObj(el.fill),
                            opacity: el.opacity,
                            borderColor: el.stroke !== 'transparent' ? hexToRgbObj(el.stroke) : undefined,
                            borderWidth: el.stroke !== 'transparent' ? el.strokeWidth : 0
                        });
                    } else if (el.type === 'line' || el.type === 'arrow') {
                        var lineColor = el.stroke !== 'transparent' ? hexToRgbObj(el.stroke) : hexToRgbObj(el.fill);
                        var rotRad = (el.rotation || 0) * Math.PI / 180;
                        var cEx = x + w / 2, cEy = y + h / 2;
                        var sOffX = -w / 2, sOffY = h / 2;
                        var eOffX = w / 2, eOffY = -h / 2;
                        var cosR = Math.cos(rotRad), sinR = Math.sin(rotRad);
                        var sx = cEx + sOffX * cosR - sOffY * sinR;
                        var sy = cEy + sOffX * sinR + sOffY * cosR;
                        var ex = cEx + eOffX * cosR - eOffY * sinR;
                        var ey = cEy + eOffX * sinR + eOffY * cosR;
                        page.drawLine({
                            start: { x: sx, y: sy },
                            end: { x: ex, y: ey },
                            color: lineColor,
                            thickness: el.strokeWidth || 3,
                            opacity: el.opacity
                        });
                        if (el.type === 'arrow') {
                            var hl = 12 * scaleX;
                            var aAngle = Math.atan2(-(ey - sy), ex - sx);
                            page.drawLine({
                                start: { x: ex, y: ey },
                                end: { x: ex - hl * Math.cos(aAngle - Math.PI / 6), y: ey + hl * Math.sin(aAngle - Math.PI / 6) },
                                color: lineColor,
                                thickness: el.strokeWidth || 3,
                                opacity: el.opacity
                            });
                            page.drawLine({
                                start: { x: ex, y: ey },
                                end: { x: ex - hl * Math.cos(aAngle + Math.PI / 6), y: ey + hl * Math.sin(aAngle + Math.PI / 6) },
                                color: lineColor,
                                thickness: el.strokeWidth || 3,
                                opacity: el.opacity
                            });
                        }
                    } else if (el.type === 'highlight') {
                        page.drawRectangle({
                            x: x, y: y, width: w, height: h,
                            color: hexToRgbObj(el.highlightColor || '#fef08a'),
                            opacity: 0.4
                        });
                    } else if (el.type === 'text') {
                        var tp = 4;
                        var text = el.text || '';
                        var fs = el.fontSize;
                        var availW = el.width - tp * 2;
                        var maxW = Math.max(availW * scaleX, 1);
                        var lines = [];
                        var paragraphs = text.split('\n');
                        for (var tpi = 0; tpi < paragraphs.length; tpi++) {
                            if (tpi > 0 && paragraphs[tpi].length === 0) {
                                lines.push('');
                                continue;
                            }
                            var words = paragraphs[tpi].split(' ');
                            var cur = '';
                            for (var wi = 0; wi < words.length; wi++) {
                                var wd = words[wi];
                                if (wd.length === 0) continue;
                                var testLine = cur ? cur + ' ' + wd : wd;
                                var tw = pickFont(testLine).widthOfTextAtSize(testLine, fs);
                                if (tw > maxW && cur) {
                                    lines.push(cur);
                                    cur = wd;
                                } else {
                                    cur = testLine;
                                }
                            }
                            if (cur) lines.push(cur);
                        }
                        var ascent = fs * 0.714;
                        var lh = fs * 1.2;
                        var yTop = ph - (el.y + tp) * scaleY;
                        var tx = x + tp * scaleX;
                        for (var li = 0; li < lines.length; li++) {
                            page.drawText(lines[li], {
                                x: tx,
                                y: yTop + ascent - li * lh,
                                size: fs,
                                font: pickFont(lines[li]),
                                color: hexToRgbObj(el.fontColor || '#1e293b'),
                                opacity: el.opacity
                            });
                        }
                    } else if (el.type === 'image' && el.src) {
                        try {
                            var imgBytes = Uint8Array.from(atob(el.src.split(',')[1]), function(c) { return c.charCodeAt(0); });
                            var isPng = el.src.indexOf('data:image/png') !== -1;
                            var embeddedImg = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
                            page.drawImage(embeddedImg, { x: x, y: y, width: w, height: h, rotate: degrees(el.rotation || 0), opacity: el.opacity });
                        } catch (imgErr) { console.error('Image export error:', imgErr); }
                    } else if (el.type === 'stamp') {
                        if (el.stampType === 'custom' && el.src) {
                            var sImgBytes = Uint8Array.from(atob(el.src.split(',')[1]), function(c) { return c.charCodeAt(0); });
                            var isSPng = el.src.indexOf('data:image/png') !== -1;
                            var sEmbedded = isSPng ? await pdfDoc.embedPng(sImgBytes) : await pdfDoc.embedJpg(sImgBytes);
                            page.drawImage(sEmbedded, { x: x, y: y, width: w, height: h, rotate: degrees(el.rotation || 0), opacity: el.opacity });
                        } else {
                            page.drawRectangle({ x: x, y: y, width: w, height: h, color: hexToRgbObj(el.stampColor || '#dc2626'), opacity: 0.2, rotate: degrees(el.rotation || 0) });
                            page.drawRectangle({ x: x, y: y, width: w, height: h, borderColor: hexToRgbObj(el.stampColor || '#dc2626'), borderWidth: 3, opacity: el.opacity, rotate: degrees(el.rotation || 0) });
                            var stampFS = Math.min(w * 0.32, h * 0.45);
                            var stampTextW = pickBoldFont(el.stampText || 'STAMP').widthOfTextAtSize(el.stampText || 'STAMP', stampFS);
                            page.drawText(el.stampText || 'STAMP', {
                                x: x + (w - stampTextW) / 2,
                                y: y + h / 2 - stampFS * 0.35,
                                size: stampFS,
                                font: pickBoldFont(el.stampText || 'STAMP'),
                                color: hexToRgbObj(el.stampColor || '#dc2626'),
                                opacity: el.opacity,
                                rotate: degrees((el.rotation || 0) - 5)
                            });
                        }
                    } else if (el.type === 'callout') {
                        var cBoxW = w * 0.65;
                        var cBoxH = h * 0.65;
                        var rotRad2 = (el.rotation || 0) * Math.PI / 180;
                        var cosR2 = Math.cos(rotRad2), sinR2 = Math.sin(rotRad2);
                        var ccx = x + w / 2, ccy = y + h / 2;
                        function rotatePoint(px, py) {
                            return { x: ccx + (px - ccx) * cosR2 - (py - ccy) * sinR2, y: ccy + (px - ccx) * sinR2 + (py - ccy) * cosR2 };
                        }
                        var cp1 = rotatePoint(x, y), cp2 = rotatePoint(x + cBoxW, y + cBoxH);
                        var cRx = Math.min(cp1.x, cp2.x), cRy = Math.min(cp1.y, cp2.y);
                        var cRw = Math.abs(cp2.x - cp1.x), cRh = Math.abs(cp2.y - cp1.y);
                        page.drawRectangle({ x: cRx, y: cRy, width: cRw, height: cRh, color: hexToRgbObj(el.fill || '#ffffff'), opacity: el.opacity, borderColor: el.stroke && el.stroke !== 'transparent' ? hexToRgbObj(el.stroke) : undefined, borderWidth: el.stroke && el.stroke !== 'transparent' ? el.strokeWidth : 0, rotate: degrees(el.rotation || 0) });
                        var as1 = rotatePoint(x + cBoxW * 0.7, y + cBoxH);
                        var ae1 = rotatePoint(x + w, y + h);
                        page.drawLine({ start: { x: as1.x, y: as1.y }, end: { x: ae1.x, y: ae1.y }, color: hexToRgbObj(el.arrowColor || el.stroke || '#1e293b'), thickness: el.arrowThickness || 3, opacity: el.opacity });
                        var hl2 = 12 * scaleX;
                        var aA2 = Math.atan2(ae1.y - as1.y, ae1.x - as1.x);
                        page.drawLine({ start: { x: ae1.x, y: ae1.y }, end: { x: ae1.x - hl2 * Math.cos(aA2 - Math.PI / 6), y: ae1.y - hl2 * Math.sin(aA2 - Math.PI / 6) }, color: hexToRgbObj(el.arrowColor || el.stroke || '#1e293b'), thickness: el.arrowThickness || 3, opacity: el.opacity });
                        page.drawLine({ start: { x: ae1.x, y: ae1.y }, end: { x: ae1.x - hl2 * Math.cos(aA2 + Math.PI / 6), y: ae1.y - hl2 * Math.sin(aA2 + Math.PI / 6) }, color: hexToRgbObj(el.arrowColor || el.stroke || '#1e293b'), thickness: el.arrowThickness || 3, opacity: el.opacity });
                        var cText = el.text || '';
                        var cFS = el.fontSize || 14;
                        var cAvailW = cBoxW - 10;
                        var cMaxW = Math.max(cAvailW * scaleX, 1);
                        var cLines = [];
                        var cParas = cText.split('\n');
                        for (var cpi = 0; cpi < cParas.length; cpi++) {
                            if (cpi > 0 && cParas[cpi].length === 0) { cLines.push(''); continue; }
                            var cWords = cParas[cpi].split(' ');
                            var cCur = '';
                            for (var cwi = 0; cwi < cWords.length; cwi++) {
                                var cwd = cWords[cwi];
                                if (cwd.length === 0) continue;
                                var cTestLine = cCur ? cCur + ' ' + cwd : cwd;
                                var ctw = pickFont(cTestLine).widthOfTextAtSize(cTestLine, cFS);
                                if (ctw > cMaxW && cCur) { cLines.push(cCur); cCur = cwd; }
                                else { cCur = cTestLine; }
                            }
                            if (cCur) cLines.push(cCur);
                        }
                        var cLh = cFS * 1.2;
                        var cAscent = cFS * 0.714;
                        var cPadEx = 5 * scaleX;
                        var cyTop = ph - (el.y * scaleY) - cPadEx;
                        var ctx2 = x + cPadEx;
                        for (var cli2 = 0; cli2 < Math.min(cLines.length, Math.floor(cBoxH * scaleY / cLh)); cli2++) {
                            var rawPt = { x: ctx2, y: cyTop + cAscent - cli2 * cLh };
                            var rotPt = { x: ccx + (rawPt.x - ccx) * cosR2 - (rawPt.y - ccy) * sinR2, y: ccy + (rawPt.x - ccx) * sinR2 + (rawPt.y - ccy) * cosR2 };
                            page.drawText(cLines[cli2], {
                                x: rotPt.x, y: rotPt.y,
                                size: cFS, font: pickFont(cLines[cli2]),
                                color: hexToRgbObj(el.fontColor || '#1e293b'),
                                opacity: el.opacity,
                                rotate: degrees(el.rotation || 0)
                            });
                        }
                    }

                    processed++;
                    var pct = Math.round((processed / totalEls) * 90) + 10;
                    progressFill.style.width = Math.min(pct, 95) + '%';
                    progressPercent.textContent = Math.min(pct, 95) + '%';
                    progressText.textContent = 'Applying ' + el.type + ' (' + processed + '/' + totalEls + ')';
                }
            }
            progressText.textContent = 'Saving PDF...';
            progressFill.style.width = '95%';
            progressPercent.textContent = '95%';
            return pdfDoc.save();
        }).then(function(bytes) {
            progressFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';

            state.resultBytes = bytes;

            var baseName = state.fileName.replace(/\.pdf$/i, '') || 'document';
            var filename = baseName + '_edited.pdf';

            downloadPdf(bytes, filename);
            notify('PDF exported and downloaded successfully');

            setTimeout(function() {
                progressSection.style.display = 'none';
                resetAll();
            }, 400);
        }).catch(function(err) {
            console.error('Export error:', err);
            notify('Export error: ' + err.message, true);
            progressSection.style.display = 'none';
            applyBtn.disabled = false;
            applyBtn.style.opacity = '';
        });
    }

    function downloadResult() {
        if (!state.resultBytes) { notify('Apply changes first', true); return; }
        var baseName = state.fileName.replace(/\.pdf$/i, '') || 'document';
        var filename = baseName + '_edited.pdf';
        downloadPdf(state.resultBytes, filename);
    }

    // ========== RESET ==========
    function resetAll() {
        state.pdfBytes = null;
        state.fileName = '';
        state.pdfDoc = null;
        state.pdfJsDoc = null;
        state.currentPage = 1;
        state.totalPages = 0;
        state.elementsByPage = {};
        state.elementIdCounter = 0;
        state.selectedElementId = null;
        state.zoom = 1;
        state.activeTool = 'text';
        state.isCreateMode = false;
        state.isDragging = false;
        state.isResizing = false;
        state.isRotating = false;
        state.dragHandle = null;
        state.dragMoved = false;
        state.pdfPageCache = null;
        state.resultBytes = null;
        state.undoStack = [];
        state.redoStack = [];
        if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
        state.pendingRender = false;
        state.pdfRenderQueued = false;
        imageCache = {};
        fileInput.value = '';
        fileBadge.textContent = 'No file';
        fileBadge.style.color = '#94a3b8';
        previewEmpty.style.display = 'flex';
        canvasStage.style.display = 'none';
        elementsStage.innerHTML = '';
        applyBtn.disabled = true;
        applyBtn.style.opacity = '';
        progressSection.style.display = 'none';
        resultOverlay.style.display = 'none';
        pageInfo.textContent = '1 / 1';
        $('prev-page').disabled = true;
        $('next-page').disabled = true;
        zoomLabel.textContent = '100%';
        hideStampPicker();
        updateToolButtonStates();
        updateElementsList();
        updatePropertiesPanel();
        updateEditorState();
    }

    // ========== EVENT BINDING ==========
    fileInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) loadPdf(e.target.files[0]);
    });

    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) loadPdf(e.dataTransfer.files[0]);
        });
    }

    toolBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!state.pdfBytes) { notify('Load a PDF first', true); return; }
            toolBtns.forEach(function(b) { b.classList.remove('active'); b.style.background = '#fff'; b.style.color = '#64748b'; });
            btn.classList.add('active');
            btn.style.background = '#eff6ff';
            btn.style.color = '#2563eb';
            state.activeTool = btn.dataset.tool;

            if (btn.dataset.tool === 'image') {
                imageFileInput.click();
                return;
            }
            if (btn.dataset.tool === 'stamp') {
                showStampPicker();
                state.isCreateMode = true;
                return;
            }

            state.isCreateMode = true;
        });
    });

    canvasWrap.addEventListener('pointerdown', onPointerDown);
    canvasWrap.addEventListener('pointermove', onPointerMove);
    canvasWrap.addEventListener('pointerup', onPointerUp);
    canvasWrap.addEventListener('pointercancel', onPointerUp);
    canvasWrap.addEventListener('click', onCanvasClick);

    imageFileInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0], function(dataUrl, nw, nh) {
                var maxDim = 250;
                var scale = Math.min(maxDim / nw, maxDim / nh, 1);
                createElement('image', state.currentPage, 100, 100, {
                    src: dataUrl, naturalWidth: nw, naturalHeight: nh,
                    width: Math.round(nw * scale), height: Math.round(nh * scale)
                });
            });
        }
        imageFileInput.value = '';
        state.isCreateMode = false;
        updateToolButtonStates();
    });

    stampUploadInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0], function(dataUrl, nw, nh) {
                var maxDim = 150;
                var scale = Math.min(maxDim / nw, maxDim / nh, 1);
                createElement('stamp', state.currentPage, 100, 100, {
                    src: dataUrl, stampType: 'custom', stampText: 'Custom',
                    width: Math.round(nw * scale), height: Math.round(nh * scale)
                });
            });
        }
        stampUploadInput.value = '';
        state.isCreateMode = false;
        updateToolButtonStates();
    });

    $('prev-page').addEventListener('click', function() { goToPage(state.currentPage - 1); });
    $('next-page').addEventListener('click', function() { goToPage(state.currentPage + 1); });
    $('zoom-in').addEventListener('click', function() { setZoom(state.zoom + 0.25); });
    $('zoom-out').addEventListener('click', function() { setZoom(state.zoom - 0.25); });
    $('zoom-fit').addEventListener('click', zoomFit);
    applyBtn.addEventListener('click', applyChanges);
    resetBtn.addEventListener('click', function() {
        if (state.pdfBytes && !confirm('Reset all changes? This cannot be undone.')) return;
        resetAll();
    });
    downloadBtn.addEventListener('click', function() { if (state.resultBytes) { downloadResult(); } });
    newBtn.addEventListener('click', function() { resetAll(); });

    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
        if (e.key === 'Escape') { state.selectedElementId = null; state.isCreateMode = false; updateToolButtonStates(); renderPage(state.currentPage); updateElementsList(); updatePropertiesPanel(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
    });

    var resizeTimer = null;
    window.addEventListener('resize', function() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (state.pdfJsDoc) {
                state.pdfPageCache = null;
                renderPage(state.currentPage);
            }
        }, 150);
    });

    console.log('PDF Editor initialized');
});