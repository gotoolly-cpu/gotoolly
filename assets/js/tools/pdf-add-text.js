document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    if (typeof PDFLib === 'undefined') { console.error('pdf-lib not loaded'); return; }
    var PDFDocument = PDFLib.PDFDocument;

    var elements = [];
    var selectedId = null;
    var historyStack = [];
    var historyIdx = -1;
    var idCounter = 0;
    var currentFile = null;
    var totalPages = 0;
    var currentPage = 0;
    var currentScale = 1;
    var pdfBytesRef = null;
    var outputBytes = null;
    var isDragging = false;
    var dragElId = null;
    var dragOffsetX = 0;
    var dragOffsetY = 0;
    var isResizing = false;
    var resizeElId = null;
    var resizeHandle = '';
    var resizeStartX = 0;
    var resizeStartY = 0;
    var resizeStartW = 0;
    var resizeStartH = 0;
    var resizeStartLeft = 0;
    var resizeStartTop = 0;
    var isRotating = false;
    var rotateElId = null;
    var rotateCenterX = 0;
    var rotateCenterY = 0;
    var rotateStartAngle = 0;
    var fitWidthScale = 1;

    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('file-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePages = document.getElementById('file-pages');
    var workspaceArea = document.getElementById('workspace-area');
    var canvasContainer = document.getElementById('canvas-container');
    var canvasWrap = document.getElementById('canvas-wrap');
    var previewCanvas = document.getElementById('preview-canvas');
    var emptyState = document.getElementById('empty-state');
    var zoomPctEl = document.getElementById('zoom-pct');
    var zoomInBtn = document.getElementById('zoom-in');
    var zoomOutBtn = document.getElementById('zoom-out');
    var zoomFitBtn = document.getElementById('zoom-fit');
    var prevPageBtn = document.getElementById('prev-page');
    var nextPageBtn = document.getElementById('next-page');
    var pageIndicator = document.getElementById('page-indicator');
    var leftPanel = document.getElementById('left-panel');
    var drawerToggle = document.getElementById('drawer-toggle');
    var elementsListEl = document.getElementById('elements-list');
    var elementCountEl = document.getElementById('element-count');
    var editorPanelBody = document.getElementById('editor-panel-body');
    var editorPanelTitle = document.getElementById('editor-panel-title');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');
    var statusBadge = document.getElementById('status-badge');
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');

    var FONTS = ['Helvetica', 'Times Roman', 'Courier', 'Helvetica Bold', 'Helvetica Oblique'];

    function showNotification(msg, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 3500);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16) / 255;
        var g = parseInt(hex.slice(3, 5), 16) / 255;
        var b = parseInt(hex.slice(5, 7), 16) / 255;
        return PDFLib.rgb(r, g, b);
    }

    function hexToRgba(hex, opacity) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
    }

    function setStatus(text, type) {
        statusBadge.textContent = text;
        statusBadge.className = 'status-badge ' + type;
    }

    function updateProgress(text, pct) {
        progressText.textContent = text;
        progressPercent.textContent = pct + '%';
        progressFill.style.width = pct + '%';
    }

    function escapeHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function getEl(id) {
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].id === id) return elements[i];
        }
        return null;
    }

    function getElementsOnPage(page) {
        return elements.filter(function (el) { return el.page === page; });
    }

    function getElIndex(id) {
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].id === id) return i;
        }
        return -1;
    }

    function pushHistory() {
        historyStack = historyStack.slice(0, historyIdx + 1);
        var snap = { elements: JSON.parse(JSON.stringify(elements)), selectedId: selectedId, idCounter: idCounter };
        historyStack.push(snap);
        historyIdx = historyStack.length - 1;
        if (historyStack.length > 200) { historyStack.shift(); historyIdx--; }
    }

    function undo() {
        if (historyIdx <= 0) return;
        historyIdx--;
        var snap = historyStack[historyIdx];
        elements = JSON.parse(JSON.stringify(snap.elements));
        selectedId = snap.selectedId != null && getEl(snap.selectedId) ? snap.selectedId : null;
        idCounter = snap.idCounter;
        renderOverlays();
        renderElementsList();
        renderEditorPanel();
    }

    function redo() {
        if (historyIdx >= historyStack.length - 1) return;
        historyIdx++;
        var snap = historyStack[historyIdx];
        elements = JSON.parse(JSON.stringify(snap.elements));
        selectedId = snap.selectedId != null && getEl(snap.selectedId) ? snap.selectedId : null;
        idCounter = snap.idCounter;
        renderOverlays();
        renderElementsList();
        renderEditorPanel();
    }

    function saveSession() {
        try {
            var data = { elements: elements, idCounter: idCounter, totalPages: totalPages, currentPage: currentPage };
            sessionStorage.setItem('pdf-add-text-session', JSON.stringify(data));
        } catch (e) { }
    }

    function loadSession() {
        try {
            var raw = sessionStorage.getItem('pdf-add-text-session');
            if (!raw) return false;
            var data = JSON.parse(raw);
            if (data && data.elements && data.elements.length > 0) {
                elements = data.elements;
                idCounter = data.idCounter || elements.length;
                totalPages = data.totalPages || 0;
                currentPage = data.currentPage || 0;
                return true;
            }
        } catch (e) { }
        return false;
    }

    function clearSession() {
        try { sessionStorage.removeItem('pdf-add-text-session'); } catch (e) { }
    }

    function updateApplyState() {
        applyBtn.disabled = elements.length === 0 || !currentFile;
    }

    function measureTextWidth(text, fontSize, fontFamily) {
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d');
        ctx.font = fontSize + 'px ' + (fontFamily === 'Helvetica Bold' ? 'Helvetica' : fontFamily === 'Helvetica Oblique' ? 'Helvetica' : fontFamily) + (fontFamily === 'Helvetica Bold' ? ', sans-serif' : fontFamily === 'Helvetica Oblique' ? ', sans-serif' : ', sans-serif');
        ctx.font = (fontFamily === 'Helvetica Bold' ? 'bold ' : fontFamily === 'Helvetica Oblique' ? 'italic ' : '') + fontSize + 'px ' + (fontFamily === 'Helvetica Bold' ? 'Arial' : fontFamily === 'Helvetica Oblique' ? 'Arial' : fontFamily === 'Times Roman' ? 'serif' : fontFamily === 'Courier' ? 'monospace' : 'Arial');
        return ctx.measureText(text).width;
    }

    function addElement(text, page, opts) {
        opts = opts || {};
        var fontSize = opts.fontSize || 16;
        var color = opts.color || '#000000';
        var opacity = opts.opacity != null ? opts.opacity : 1;
        var rotation = opts.rotation || 0;
        var fontFamily = opts.fontFamily || 'Helvetica';
        var textW = measureTextWidth(text, fontSize, fontFamily);
        var textH = fontSize * 1.3;
        var x = opts.x != null ? opts.x : 50;
        var y = opts.y != null ? opts.y : 50;

        var el = {
            id: ++idCounter, type: 'text', content: text, page: page,
            fontSize: fontSize, fontFamily: fontFamily, color: color,
            opacity: opacity, rotation: rotation,
            x: x, y: y, width: Math.max(40, textW), height: Math.max(20, textH),
            visible: true, locked: false, zIndex: elements.length,
            align: opts.align || 'left'
        };
        elements.push(el);
        pushHistory();
        saveSession();
        selectedId = el.id;
        renderOverlays();
        renderElementsList();
        updateApplyState();
        return el;
    }

    function duplicateElement(id) {
        var src = getEl(id);
        if (!src) return;
        var el = {
            id: ++idCounter, type: 'text', content: src.content, page: src.page,
            fontSize: src.fontSize, fontFamily: src.fontFamily, color: src.color,
            opacity: src.opacity, rotation: src.rotation,
            x: src.x + 20, y: src.y + 20,
            width: src.width, height: src.height,
            visible: true, locked: false, zIndex: elements.length,
            align: src.align || 'left'
        };
        elements.push(el);
        pushHistory();
        saveSession();
        renderOverlays();
        renderElementsList();
        updateApplyState();
        selectElement(el.id);
    }

    function deleteElement(id) {
        var el = getEl(id);
        if (!el || el.locked) return;
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].id === id) { elements.splice(i, 1); break; }
        }
        if (selectedId === id) { selectedId = null; renderEditorPanel(); }
        pushHistory();
        saveSession();
        renderOverlays();
        renderElementsList();
        updateApplyState();
    }

    function selectElement(id) {
        selectedId = id;
        renderOverlays();
        renderElementsList();
        renderEditorPanel();
    }

    function getCanvasOffset() {
        var canvas = previewCanvas;
        if (!canvas || !canvas.width) return { left: 0, top: 0 };
        var rect = canvas.getBoundingClientRect();
        var containerRect = canvasContainer.getBoundingClientRect();
        return {
            left: rect.left - containerRect.left + canvasContainer.scrollLeft,
            top: rect.top - containerRect.top + canvasContainer.scrollTop
        };
    }

    function renderOverlays() {
        var existing = canvasContainer.querySelectorAll('.element-overlay');
        existing.forEach(function (o) { o.remove(); });
        if (!pdfBytesRef) return;
        var pageEls = getElementsOnPage(currentPage);
        var off = getCanvasOffset();
        pageEls.forEach(function (el) {
            if (!el.visible) return;
            var overlay = document.createElement('div');
            overlay.className = 'element-overlay' + (el.id === selectedId ? ' selected' : '') + (el.locked ? ' locked' : '');
            overlay.setAttribute('data-el-id', el.id);
            var sx = el.x * currentScale;
            var sy = el.y * currentScale;
            var sw = el.width * currentScale;
            var sh = el.height * currentScale;
            overlay.style.left = (off.left + sx) + 'px';
            overlay.style.top = (off.top + sy) + 'px';
            overlay.style.width = sw + 'px';
            overlay.style.height = sh + 'px';
            if (el.rotation) overlay.style.transform = 'rotate(' + el.rotation + 'deg)';
            overlay.style.opacity = el.opacity;

            var label = document.createElement('span');
            var fs = Math.max(10, el.fontSize * currentScale);
            var align = el.align || 'left';
            var posStyle = align === 'center' ? 'top:50%;left:50%;transform:translate(-50%,-50%);width:100%;text-align:center' : align === 'right' ? 'top:50%;right:4px;transform:translate(0,-50%);width:calc(100% - 8px);text-align:right' : 'top:50%;left:4px;transform:translate(0,-50%);width:calc(100% - 8px);text-align:left';
            label.style.cssText = 'position:absolute;' + posStyle + ';font-size:' + fs + 'px;color:' + el.color + ';white-space:nowrap;pointer-events:none;font-family:' + (el.fontFamily === 'Times Roman' ? 'serif' : el.fontFamily === 'Courier' ? 'monospace' : 'Arial') + ',sans-serif;font-weight:' + (el.fontFamily === 'Helvetica Bold' ? 'bold' : '600') + ';font-style:' + (el.fontFamily === 'Helvetica Oblique' ? 'italic' : 'normal') + ';max-width:100%;overflow:hidden;text-overflow:ellipsis;';
            label.textContent = el.content;
            overlay.appendChild(label);

            if (el.id === selectedId && !el.locked) {
                var handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
                handles.forEach(function (h) {
                    var handle = document.createElement('div');
                    handle.className = 'resize-handle ' + h;
                    handle.setAttribute('data-handle', h);
                    overlay.appendChild(handle);
                });
                var rotHandle = document.createElement('div');
                rotHandle.className = 'rotate-handle';
                overlay.appendChild(rotHandle);
            }
            if (el.locked && el.id === selectedId) {
                var lockBadge = document.createElement('div');
                lockBadge.style.cssText = 'position:absolute;top:-8px;right:-8px;width:20px;height:20px;background:#475569;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;z-index:10;font-size:10px;';
                lockBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
                overlay.appendChild(lockBadge);
            }
            overlay.addEventListener('mousedown', function (e) {
                if (el.locked) { selectElement(el.id); return; }
                e.stopPropagation();
                selectElement(el.id);
                var rotEl = e.target.closest('.rotate-handle');
                if (rotEl) { startRotate(el.id, e); return; }
                var handleEl = e.target.closest('.resize-handle');
                if (handleEl) { startResize(el.id, handleEl.getAttribute('data-handle'), e); return; }
                startDrag(el.id, e);
            });
            overlay.addEventListener('dblclick', function (e) {
                if (el.locked) return;
                e.stopPropagation();
                renderEditorPanel(true);
            });
            overlay.addEventListener('touchstart', function (e) {
                if (el.locked) { selectElement(el.id); return; }
                e.stopPropagation();
                selectElement(el.id);
                var touch = e.touches[0];
                var fakeEv = { clientX: touch.clientX, clientY: touch.clientY, target: e.target, stopPropagation: function () {} };
                var rotEl = e.target.closest('.rotate-handle');
                if (rotEl) { startRotate(el.id, fakeEv); return; }
                var handleEl = e.target.closest('.resize-handle');
                if (handleEl) { startResize(el.id, handleEl.getAttribute('data-handle'), fakeEv); return; }
                startDrag(el.id, fakeEv);
            }, { passive: true });
            canvasContainer.appendChild(overlay);
        });
    }

    function startDrag(id, e) {
        isDragging = true;
        dragElId = id;
        var el = getEl(id);
        if (!el) return;
        var off = getCanvasOffset();
        var sx = el.x * currentScale;
        var sy = el.y * currentScale;
        dragOffsetX = e.clientX - (off.left + sx);
        dragOffsetY = e.clientY - (off.top + sy);
    }

    function onDrag(e) {
        if (!isDragging || !dragElId) return;
        var el = getEl(dragElId);
        if (!el) return;
        var off = getCanvasOffset();
        var x = (e.clientX - dragOffsetX - off.left) / currentScale;
        var y = (e.clientY - dragOffsetY - off.top) / currentScale;
        el.x = Math.max(0, x);
        el.y = Math.max(0, y);
        renderOverlays();
    }

    function endDrag() {
        if (isDragging) { pushHistory(); saveSession(); }
        isDragging = false;
        dragElId = null;
    }

    function startResize(id, handle, e) {
        isResizing = true;
        resizeElId = id;
        resizeHandle = handle;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        var el = getEl(id);
        if (el) {
            resizeStartW = el.width;
            resizeStartH = el.height;
            resizeStartLeft = el.x;
            resizeStartTop = el.y;
        }
    }

    function onResize(e) {
        if (!isResizing || !resizeElId) return;
        var el = getEl(resizeElId);
        if (!el) return;
        var dx = (e.clientX - resizeStartX) / currentScale;
        var dy = (e.clientY - resizeStartY) / currentScale;
        var newW = resizeStartW;
        var newH = resizeStartH;
        var newX = resizeStartLeft;
        var newY = resizeStartTop;
        switch (resizeHandle) {
            case 'e': newW = Math.max(30, resizeStartW + dx); break;
            case 'w': newW = Math.max(30, resizeStartW - dx); newX = resizeStartLeft + (resizeStartW - newW); break;
            case 's': newH = Math.max(20, resizeStartH + dy); break;
            case 'n': newH = Math.max(20, resizeStartH - dy); newY = resizeStartTop + (resizeStartH - newH); break;
            case 'se': newW = Math.max(30, resizeStartW + dx); newH = Math.max(20, resizeStartH + dy); break;
            case 'sw': newW = Math.max(30, resizeStartW - dx); newX = resizeStartLeft + (resizeStartW - newW); newH = Math.max(20, resizeStartH + dy); break;
            case 'ne': newW = Math.max(30, resizeStartW + dx); newH = Math.max(20, resizeStartH - dy); newY = resizeStartTop + (resizeStartH - newH); break;
            case 'nw': newW = Math.max(30, resizeStartW - dx); newX = resizeStartLeft + (resizeStartW - newW); newH = Math.max(20, resizeStartH - dy); newY = resizeStartTop + (resizeStartH - newH); break;
        }
        el.width = Math.round(newW);
        el.height = Math.round(newH);
        el.x = Math.max(0, newX);
        el.y = Math.max(0, newY);
        el.fontSize = Math.max(6, Math.round(newH / 1.3));
        renderOverlays();
    }

    function endResize() {
        if (isResizing) { pushHistory(); saveSession(); }
        isResizing = false;
        resizeElId = null;
        resizeHandle = '';
    }

    function startRotate(id, e) {
        isRotating = true;
        rotateElId = id;
        var el = getEl(id);
        if (!el) return;
        var off = getCanvasOffset();
        rotateCenterX = off.left + (el.x + el.width / 2) * currentScale;
        rotateCenterY = off.top + (el.y + el.height / 2) * currentScale;
        rotateStartAngle = Math.atan2(e.clientY - rotateCenterY, e.clientX - rotateCenterX) * (180 / Math.PI);
    }

    function onRotate(e) {
        if (!isRotating || !rotateElId) return;
        var el = getEl(rotateElId);
        if (!el) return;
        var angle = Math.atan2(e.clientY - rotateCenterY, e.clientX - rotateCenterX) * (180 / Math.PI);
        el.rotation = Math.round(((angle - rotateStartAngle + 360) % 360 + 360) % 360);
        renderOverlays();
    }

    function endRotate() {
        if (isRotating) { pushHistory(); saveSession(); }
        isRotating = false;
        rotateElId = null;
    }

    document.addEventListener('mousemove', function (e) {
        if (isDragging) onDrag(e);
        else if (isResizing) onResize(e);
        else if (isRotating) onRotate(e);
    });
    document.addEventListener('mouseup', function () {
        if (isDragging) endDrag();
        if (isResizing) endResize();
        if (isRotating) endRotate();
    });
    document.addEventListener('touchmove', function (e) {
        if (isDragging || isResizing || isRotating) {
            var t = e.touches[0];
            var fe = { clientX: t.clientX, clientY: t.clientY };
            if (isDragging) onDrag(fe);
            else if (isResizing) onResize(fe);
            else if (isRotating) onRotate(fe);
        }
    }, { passive: true });
    document.addEventListener('touchend', function () {
        if (isDragging) endDrag();
        if (isResizing) endResize();
        if (isRotating) endRotate();
    });

    function renderElementsList() {
        elementCountEl.textContent = elements.length;
        if (elements.length === 0) {
            elementsListEl.innerHTML = '<div class="empty-list">No elements yet.</div>';
            return;
        }
        var sorted = elements.slice().sort(function (a, b) { return b.zIndex - a.zIndex; });
        var html = '';
        for (var i = 0; i < sorted.length; i++) {
            var el = sorted[i];
            var active = el.id === selectedId ? ' active' : '';
            var visIcon = el.visible ? 'fa-eye' : 'fa-eye-slash';
            var lockIcon = el.locked ? 'fa-lock' : 'fa-unlock';
            html += '<div class="element-item' + active + '" data-el-id="' + el.id + '">' +
                '<div class="el-icon">T</div>' +
                '<div class="el-info">' +
                '<div class="el-name">' + escapeHtml(el.content.substring(0, 24)) + (el.locked ? ' <span style="color:#94a3b8">&#128274;</span>' : '') + '</div>' +
                '<div class="el-detail">p' + (el.page + 1) + ' | ' + el.fontSize + 'px | ' + el.fontFamily + '</div>' +
                '</div>' +
                '<button class="el-delete" data-delete-id="' + el.id + '" title="Delete" aria-label="Delete element">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button></div>';
        }
        elementsListEl.innerHTML = html;

        elementsListEl.querySelectorAll('.element-item').forEach(function (item) {
            item.addEventListener('click', function (e) {
                if (e.target.closest('.el-delete')) return;
                var id = parseInt(item.getAttribute('data-el-id'));
                selectElement(id);
            });
        });
        elementsListEl.querySelectorAll('.el-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = parseInt(btn.getAttribute('data-delete-id'));
                deleteElement(id);
            });
        });
    }

    function renderEditorPanel(editMode) {
        if (selectedId != null && !editMode) {
            renderPropertiesMode();
        } else if (selectedId != null && editMode) {
            renderCreationMode(true);
        } else {
            renderCreationMode(false);
        }
    }

    function renderCreationMode(isEdit) {
        editorPanelTitle.textContent = isEdit ? 'Edit Text' : 'Add Text';
        var el = isEdit ? getEl(selectedId) : null;
        var content = el ? el.content : '';
        var fontSize = el ? el.fontSize : 16;
        var color = el ? el.color : '#000000';
        var opacity = el ? Math.round(el.opacity * 100) : 100;
        var rotation = el ? (el.rotation || 0) : 0;
        var fontFamily = el ? el.fontFamily : 'Helvetica';
        var alignVal = el ? (el.align || 'left') : 'left';
        var btnText = isEdit ? 'Update Text' : 'Add Text Element';
        var btnDisabled = isEdit ? '' : (currentFile ? '' : ' disabled');

        var html = '';
        html += '<div class="field-group"><label class="field-label">Text Content</label><input type="text" id="create-content" class="field-input" placeholder="Enter your text..." value="' + escapeHtml(content) + '"></div>';
        html += '<div class="field-group" style="margin-top:8px"><label class="field-label">Font</label><select id="create-font" class="field-input">';
        FONTS.forEach(function (f) {
            html += '<option value="' + f + '"' + (fontFamily === f ? ' selected' : '') + '>' + f + '</option>';
        });
        html += '</select></div>';
        var createAlign = alignVal;
        html += '<div class="field-group" style="margin-top:8px"><label class="field-label">Alignment</label><div class="position-grid" id="create-align-grid">';
        html += '<button class="pos-btn' + (alignVal === 'left' ? ' active' : '') + '" data-align="left" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="19" y2="18"/></svg></button>';
        html += '<button class="pos-btn' + (alignVal === 'center' ? ' active' : '') + '" data-align="center" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>';
        html += '<button class="pos-btn' + (alignVal === 'right' ? ' active' : '') + '" data-align="right" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="5" y1="18" x2="21" y2="18"/></svg></button>';
        html += '</div></div>';
        html += '<div class="field-row" style="margin-top:8px"><div class="field-group"><label class="field-label">Font Size</label><input type="number" id="create-font-size" class="field-input" value="' + fontSize + '" min="6" max="120"></div><div class="field-group"><label class="field-label">Color</label><input type="color" id="create-color" class="field-input" value="' + color + '" style="height:36px;padding:4px"></div></div>';
        html += '<div class="field-group" style="margin-top:8px"><label class="field-label">Opacity</label><div class="range-row"><input type="range" id="create-opacity" class="field-range" min="0" max="100" value="' + opacity + '"><span class="range-value" id="create-opacity-val">' + opacity + '%</span></div></div>';
        html += '<div class="field-group" style="margin-top:8px"><label class="field-label">Rotation</label><div class="range-row"><input type="range" id="create-rotation" class="field-range" min="-180" max="180" value="' + rotation + '"><span class="range-value" id="create-rotation-val">' + rotation + '°</span></div></div>';
        html += '<button class="btn-add-text" id="create-btn" style="margin-top:12px"' + btnDisabled + '>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ' +
            btnText + '</button>';
        editorPanelBody.innerHTML = html;

        var opacityRange = document.getElementById('create-opacity');
        var opacityVal = document.getElementById('create-opacity-val');
        if (opacityRange) {
            opacityRange.addEventListener('input', function () { opacityVal.textContent = opacityRange.value + '%'; });
        }
        var rotationRange = document.getElementById('create-rotation');
        var rotationVal = document.getElementById('create-rotation-val');
        if (rotationRange) {
            rotationRange.addEventListener('input', function () { rotationVal.textContent = rotationRange.value + '\u00B0'; });
        }

        var createAlignGrid = document.getElementById('create-align-grid');
        if (createAlignGrid) {
            createAlignGrid.querySelectorAll('.pos-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    createAlignGrid.querySelectorAll('.pos-btn').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    createAlign = btn.getAttribute('data-align');
                });
            });
        }

        var createBtn = document.getElementById('create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', function () {
                var text = document.getElementById('create-content').value.trim();
                if (!text) { showNotification('Enter some text', true); return; }
                var fs = parseInt(document.getElementById('create-font-size').value) || 16;
                var col = document.getElementById('create-color').value;
                var op = parseInt(document.getElementById('create-opacity').value) / 100;
                var rot = parseInt(document.getElementById('create-rotation').value) || 0;
                var ff = document.getElementById('create-font').value;
                if (isEdit && el) {
                    pushHistory();
                    el.content = text;
                    el.fontSize = fs;
                    el.color = col;
                    el.opacity = op;
                    el.rotation = rot;
                    el.fontFamily = ff;
                    el.align = createAlign;
                    var textW = measureTextWidth(text, fs, ff);
                    el.width = Math.max(40, textW);
                    el.height = Math.max(20, fs * 1.3);
                    saveSession();
                    renderOverlays();
                    renderElementsList();
                    renderEditorPanel();
                } else {
                    addElement(text, currentPage, { fontSize: fs, color: col, opacity: op, rotation: rot, fontFamily: ff, align: createAlign });
                    document.getElementById('create-content').value = '';
                    document.getElementById('create-content').focus();
                }
            });
        }
    }

    function renderPropertiesMode() {
        editorPanelTitle.textContent = 'Properties';
        var el = getEl(selectedId);
        if (!el) { renderCreationMode(false); return; }

        var html = '';
        html += '<div class="prop-field"><label class="prop-label">Content</label><input type="text" class="prop-input" id="prop-content" value="' + escapeHtml(el.content) + '"></div>';
        html += '<div class="prop-field"><label class="prop-label">Font</label><select class="prop-input" id="prop-font-family">';
        FONTS.forEach(function (f) { html += '<option value="' + f + '"' + (el.fontFamily === f ? ' selected' : '') + '>' + f + '</option>'; });
        html += '</select></div>';
        html += '<div class="field-row"><div class="prop-field"><label class="prop-label">Font Size</label><input type="number" class="prop-input" id="prop-font-size" value="' + el.fontSize + '" min="6" max="120"></div>';
        html += '<div class="prop-field"><label class="prop-label">Color</label><input type="color" class="prop-input" id="prop-color" value="' + el.color + '" style="height:32px;padding:2px"></div></div>';
        html += '<div class="prop-field"><label class="prop-label">Opacity</label><input type="range" class="field-range" id="prop-opacity" min="0" max="100" value="' + Math.round(el.opacity * 100) + '"></div>';
        html += '<div class="prop-field"><label class="prop-label">Rotation</label><input type="range" class="field-range" id="prop-rotation" min="-180" max="180" value="' + (el.rotation || 0) + '"></div>';
        html += '<div class="prop-field"><label class="prop-label">Alignment</label><div class="position-grid" id="prop-align-grid">';
        var alignments = [
            { value: 'left', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="19" y2="18"/></svg>' },
            { value: 'center', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' },
            { value: 'right', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="5" y1="18" x2="21" y2="18"/></svg>' }
        ];
        alignments.forEach(function (a) {
            html += '<button class="pos-btn' + ((el.align || 'left') === a.value ? ' active' : '') + '" data-align="' + a.value + '" type="button">' + a.svg + '</button>';
        });
        html += '</div></div>';
        html += '<div class="field-row"><div class="prop-field"><label class="prop-label">Page</label><input type="number" class="prop-input" id="prop-page" value="' + (el.page + 1) + '" min="1" max="' + totalPages + '"></div>';
        html += '<div class="prop-field"><label class="prop-label">X</label><input type="number" class="prop-input" id="prop-x" value="' + Math.round(el.x) + '" min="0"></div></div>';
        html += '<div class="field-row"><div class="prop-field"><label class="prop-label">Y</label><input type="number" class="prop-input" id="prop-y" value="' + Math.round(el.y) + '" min="0"></div>';
        html += '<div class="prop-field"><label class="prop-label">Width</label><input type="number" class="prop-input" id="prop-width" value="' + Math.round(el.width) + '" min="30"></div></div>';
        html += '<div class="action-row">';
        html += '<button class="action-btn" data-action="duplicate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Duplicate</button>';
        html += '<button class="action-btn" data-action="forward"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> Forward</button>';
        html += '<button class="action-btn" data-action="backward"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> Backward</button>';
        html += '<button class="action-btn" data-action="lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> ' + (el.locked ? 'Unlock' : 'Lock') + '</button>';
        html += '<button class="action-btn" data-action="visibility"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ' + (el.visible ? 'Hide' : 'Show') + '</button>';
        html += '<button class="action-btn danger" data-action="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Delete</button>';
        html += '</div>';
        editorPanelBody.innerHTML = html;

        var propContent = document.getElementById('prop-content');
        var propFontFamily = document.getElementById('prop-font-family');
        var propFontSize = document.getElementById('prop-font-size');
        var propColor = document.getElementById('prop-color');
        var propOpacity = document.getElementById('prop-opacity');
        var propRotation = document.getElementById('prop-rotation');
        var propPage = document.getElementById('prop-page');
        var propX = document.getElementById('prop-x');
        var propY = document.getElementById('prop-y');
        var propWidth = document.getElementById('prop-width');

        function updateProp() {
            el.content = propContent.value || 'Text';
            el.fontFamily = propFontFamily.value;
            el.fontSize = clamp(parseInt(propFontSize.value) || 16, 6, 120);
            el.color = propColor.value;
            el.opacity = parseInt(propOpacity.value) / 100;
            el.rotation = parseInt(propRotation.value) || 0;
            var alignGrid = document.getElementById('prop-align-grid');
            if (alignGrid) {
                var activeAlign = alignGrid.querySelector('.pos-btn.active');
                if (activeAlign) el.align = activeAlign.getAttribute('data-align');
            }
            el.x = parseFloat(propX.value) || 0;
            el.y = parseFloat(propY.value) || 0;
            el.width = Math.max(30, parseFloat(propWidth.value) || 30);
            el.height = Math.max(20, el.fontSize * 1.3);
            var newPage = clamp(parseInt(propPage.value) || 1, 1, totalPages) - 1;
            if (newPage !== el.page) { el.page = newPage; currentPage = newPage; renderPreviewPage(); }
            pushHistory();
            saveSession();
            renderOverlays();
            renderElementsList();
        }

        if (propContent) propContent.addEventListener('input', updateProp);
        if (propFontFamily) propFontFamily.addEventListener('change', updateProp);
        if (propFontSize) propFontSize.addEventListener('input', updateProp);
        if (propColor) propColor.addEventListener('input', updateProp);
        if (propOpacity) propOpacity.addEventListener('input', updateProp);
        if (propRotation) propRotation.addEventListener('input', updateProp);
        if (propPage) propPage.addEventListener('change', updateProp);
        if (propX) propX.addEventListener('input', updateProp);
        if (propY) propY.addEventListener('input', updateProp);
        if (propWidth) propWidth.addEventListener('input', updateProp);

        var propAlignGrid = document.getElementById('prop-align-grid');
        if (propAlignGrid) {
            propAlignGrid.querySelectorAll('.pos-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    propAlignGrid.querySelectorAll('.pos-btn').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    updateProp();
                });
            });
        }

        editorPanelBody.querySelectorAll('[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var action = btn.getAttribute('data-action');
                pushHistory();
                if (action === 'delete') deleteElement(el.id);
                else if (action === 'duplicate') duplicateElement(el.id);
                else if (action === 'forward') {
                    var idx = getElIndex(el.id);
                    if (idx < elements.length - 1) { var tmp = elements[idx].zIndex; elements[idx].zIndex = elements[idx + 1].zIndex; elements[idx + 1].zIndex = tmp; }
                    saveSession(); renderOverlays(); renderElementsList();
                } else if (action === 'backward') {
                    var idx = getElIndex(el.id);
                    if (idx > 0) { var tmp = elements[idx].zIndex; elements[idx].zIndex = elements[idx - 1].zIndex; elements[idx - 1].zIndex = tmp; }
                    saveSession(); renderOverlays(); renderElementsList();
                } else if (action === 'lock') { el.locked = !el.locked; saveSession(); renderOverlays(); renderEditorPanel(); }
                else if (action === 'visibility') { el.visible = !el.visible; saveSession(); renderOverlays(); renderElementsList(); renderEditorPanel(); }
            });
        });
    }

    var pdfDocJs = null;

    async function renderPreviewPage() {
        if (!pdfBytesRef || !pdfDocJs) return;
        try {
            var pdf = await pdfjsLib.getDocument({ data: pdfBytesRef.slice(0) }).promise;
            pdfDocJs = pdf;
            var page = await pdf.getPage(currentPage + 1);
            var viewport = page.getViewport({ scale: currentScale });
            previewCanvas.width = viewport.width;
            previewCanvas.height = viewport.height;
            var ctx = previewCanvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            canvasWrap.style.display = '';
            emptyState.style.display = 'none';
            renderOverlays();
        } catch (e) {
            console.error('Render error:', e);
        }
    }

    function updateZoomDisplay() {
        zoomPctEl.textContent = Math.round(currentScale * 100) + '%';
    }

    async function zoomIn() {
        currentScale = clamp(currentScale + 0.15, 0.3, 4);
        updateZoomDisplay();
        await renderPreviewPage();
    }

    async function zoomOut() {
        currentScale = clamp(currentScale - 0.15, 0.3, 4);
        updateZoomDisplay();
        await renderPreviewPage();
    }

    async function fitWidth() {
        if (!previewCanvas || !canvasContainer) return;
        var containerW = canvasContainer.clientWidth - 32;
        if (!pdfBytesRef || !pdfDocJs) return;
        try {
            var pdf = await pdfjsLib.getDocument({ data: pdfBytesRef.slice(0) }).promise;
            var page = await pdf.getPage(currentPage + 1);
            var viewport = page.getViewport({ scale: 1 });
            currentScale = clamp(containerW / viewport.width, 0.3, 4);
            fitWidthScale = currentScale;
            updateZoomDisplay();
            await renderPreviewPage();
        } catch (e) { }
    }

    function updatePageNav() {
        pageIndicator.textContent = (currentPage + 1) + ' / ' + totalPages;
        prevPageBtn.disabled = currentPage <= 0;
        nextPageBtn.disabled = currentPage >= totalPages - 1;
    }

    async function goToPage(p) {
        currentPage = clamp(p, 0, totalPages - 1);
        updatePageNav();
        await renderPreviewPage();
    }

    function loadPdf(file) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showNotification('Please select a valid PDF file', true);
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            showNotification('File size must be less than 25 MB', true);
            return;
        }
        currentFile = file;
        fileName.textContent = file.name;
        fileSizeEl.textContent = formatFileSize(file.size);
        fileStatus.textContent = 'Ready';
        fileInfo.classList.add('show');
        setStatus('Ready', 'ready');

        var reader = new FileReader();
        reader.onload = async function (e) {
            try {
                var arr = new Uint8Array(e.target.result);
                pdfBytesRef = arr;
                var pdfDoc = await PDFDocument.load(arr, { ignoreEncryption: true });
                totalPages = pdfDoc.getPageCount();
                currentPage = 0;
                filePages.textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                workspaceArea.style.display = '';
                updatePageNav();
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                pdfDocJs = await pdfjsLib.getDocument({ data: arr.slice(0) }).promise;
                await fitWidth();
                updateApplyState();
                renderEditorPanel();
                pushHistory();
                showNotification('PDF loaded with ' + totalPages + ' page' + (totalPages !== 1 ? 's' : ''), false);
            } catch (err) {
                showNotification('Failed to load PDF: ' + err.message, true);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function resetTool() {
        currentFile = null;
        totalPages = 0;
        currentPage = 0;
        pdfBytesRef = null;
        pdfDocJs = null;
        outputBytes = null;
        elements = [];
        selectedId = null;
        historyStack = [];
        historyIdx = -1;
        idCounter = 0;
        fileInput.value = '';
        fileInfo.classList.remove('show');
        workspaceArea.style.display = 'none';
        resultsPanel.classList.remove('show');
        progressSection.classList.remove('show');
        canvasWrap.style.display = 'none';
        emptyState.style.display = '';
        statusBadge.className = 'status-badge';
        statusBadge.textContent = '';
        updateProgress('Processing...', 0);
        renderElementsList();
        renderEditorPanel();
        updateApplyState();
        clearSession();
    }

    async function applyToPdf() {
        if (!currentFile || elements.length === 0) return;
        progressSection.classList.add('show');
        setStatus('Processing', 'processing');
        updateProgress('Loading PDF...', 10);

        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            var pdfDoc = await PDFDocument.load(arrayBuffer);
            var pages = pdfDoc.getPages();
            var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

            for (var i = 0; i < pages.length; i++) {
                var pct = 10 + (80 * (i + 1) / pages.length);
                updateProgress('Adding text to page ' + (i + 1) + '...', Math.round(pct));
                var page = pages[i];
                var dims = page.getSize();
                var sorted = getElementsOnPage(i).filter(function (el) { return el.visible; }).sort(function (a, b) { return a.zIndex - b.zIndex; });

                for (var j = 0; j < sorted.length; j++) {
                    var el = sorted[j];
                    var x = el.x;
                    var y = dims.height - el.y - el.height;
                    x = Math.max(0, x);
                    y = Math.max(0, y);

                    var alignMap = { left: 0, center: 1, right: 2 };
                    var opts = {
                        x: x, y: y, size: el.fontSize, font: font,
                        color: hexToRgb(el.color),
                        opacity: el.opacity,
                        textAlign: alignMap[el.align] || 0
                    };
                    if (el.rotation) {
                        opts.rotate = PDFLib.degrees(el.rotation);
                    }
                    page.drawText(el.content, opts);
                }
            }

            updateProgress('Saving PDF...', 95);
            var pdfBytes = await pdfDoc.save();
            outputBytes = pdfBytes;
            updateProgress('Complete!', 100);

            var baseName = currentFile.name.replace(/\.pdf$/i, '');
            var blob = new Blob([pdfBytes], { type: 'application/pdf' });
            var url = URL.createObjectURL(blob);
            downloadBtn.href = url;
            downloadBtn.download = baseName + '_text.pdf';

            setTimeout(function () {
                progressSection.classList.remove('show');
                resultsPanel.classList.add('show');
                pdfBytesRef = pdfBytes;
                pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise.then(function (pdf) {
                    pdfDocJs = pdf;
                    totalPages = pdf.numPages;
                    updatePageNav();
                    renderPreviewPage();
                });
                setStatus('Done', 'done');
                setTimeout(function () { statusBadge.className = 'status-badge'; statusBadge.textContent = ''; }, 3000);
            }, 500);
        } catch (err) {
            console.error(err);
            showNotification('Error: ' + err.message, true);
            progressSection.classList.remove('show');
            setStatus('Error', 'error');
        }
    }

    // EVENT LISTENERS
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) loadPdf(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) loadPdf(e.target.files[0]);
    });

    drawerToggle.addEventListener('click', function () {
        leftPanel.classList.toggle('open');
        var isOpen = leftPanel.classList.contains('open');
        drawerToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    zoomFitBtn.addEventListener('click', fitWidth);
    prevPageBtn.addEventListener('click', function () { goToPage(currentPage - 1); });
    nextPageBtn.addEventListener('click', function () { goToPage(currentPage + 1); });

    applyBtn.addEventListener('click', applyToPdf);
    resetBtn.addEventListener('click', resetTool);
    newFileBtn.addEventListener('click', resetTool);

    canvasContainer.addEventListener('click', function (e) {
        if (e.target === canvasContainer || e.target === canvasWrap || e.target === previewCanvas || e.target === emptyState) {
            selectedId = null;
            renderOverlays();
            renderElementsList();
            renderEditorPanel();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedId != null) { deleteElement(selectedId); e.preventDefault(); }
        }
        if (e.key === 'Escape') {
            selectedId = null;
            renderOverlays();
            renderElementsList();
            renderEditorPanel();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    });

    var resizeObserver = new ResizeObserver(function () {
        if (pdfBytesRef && pdfDocJs) {
            fitWidth();
        }
    });
    resizeObserver.observe(canvasContainer);
});