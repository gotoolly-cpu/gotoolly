document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // ==========================================
    // STATE
    // ==========================================
    var elements = [];
    var selectedId = null;
    var historyStack = [];
    var historyIdx = -1;
    var idCounter = 0;
    var currentFile = null;
    var pdfDocRef = null;
    var pdfPagesData = [];
    var currentPage = 0;
    var currentScale = 1;
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
    var sigModalType = 'signature';
    var sigModalDataUrl = null;
    var isDrawing = false;

    // ==========================================
    // DOM REFERENCES
    // ==========================================
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePagesEl = document.getElementById('file-pages');
    var settingsPanel = document.getElementById('settings-panel');
    var canvasContainer = document.getElementById('canvas-container');
    var previewCanvas = document.getElementById('preview-canvas');
    var previewWrap = document.getElementById('preview-wrap');
    var prevPageBtn = document.getElementById('prev-page');
    var nextPageBtn = document.getElementById('next-page');
    var previewPageNum = document.getElementById('preview-page-num');
    var elementsListEl = document.getElementById('elements-list');
    var elementCountEl = document.getElementById('element-count');
    var propertiesPanelEl = document.getElementById('properties-panel');
    var propertiesBodyEl = document.getElementById('properties-body');
    var sigModal = document.getElementById('sig-modal');
    var sigModalTitle = document.getElementById('sig-modal-title');
    var sigModalClose = document.getElementById('sig-modal-close');
    var sigCanvas = document.getElementById('sig-canvas');
    var sigClear = document.getElementById('sig-clear');
    var sigTypeInput = document.getElementById('sig-type-input');
    var sigUploadInput = document.getElementById('sig-upload-input');
    var sigUploadArea = document.getElementById('sig-upload-area');
    var sigColor = document.getElementById('sig-color');
    var sigApplyBtn = document.getElementById('sig-apply-btn');
    var imageUploadInput = document.getElementById('image-upload-input');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressContainer = document.getElementById('progress-container');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var progressFill = document.getElementById('progress-fill');
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');

    // ==========================================
    // UTILITIES
    // ==========================================
    function showNotification(msg, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
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

    function getElementById(id) {
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].id === id) return elements[i];
        }
        return null;
    }

    function getElementsOnPage(page) {
        return elements.filter(function(el) { return el.page === page; });
    }

    function getTypeCount(type) {
        var count = 0;
        elements.forEach(function(el) { if (el.type === type) count++; });
        return count;
    }

    function getDefaultSize(type) {
        if (type === 'initials') return { width: 80, height: 40 };
        if (type === 'signature') return { width: 160, height: 60 };
        if (type === 'image') return { width: 120, height: 120 };
        if (type === 'text') return { width: 180, height: 30 };
        if (type === 'date') return { width: 130, height: 24 };
        return { width: 100, height: 50 };
    }

    function getDefaultName(type) {
        var count = getTypeCount(type) + 1;
        var labels = { signature: 'Signature', initials: 'Initials', image: 'Image', text: 'Text', date: 'Date' };
        return (labels[type] || 'Element') + ' ' + count;
    }

    function getTodayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function formatDate(val, fmt) {
        if (!val) return '';
        var parts = val.split('-');
        if (parts.length !== 3) return val;
        var y = parts[0], m = parts[1], d = parts[2];
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var mNum = parseInt(m) - 1;
        if (fmt === 'DD/MM/YYYY') return d + '/' + m + '/' + y;
        if (fmt === 'YYYY-MM-DD') return val;
        if (fmt === 'Month D, YYYY') return months[mNum] + ' ' + parseInt(d) + ', ' + y;
        if (fmt === 'D Month YYYY') return parseInt(d) + ' ' + months[mNum] + ' ' + y;
        return m + '/' + d + '/' + y;
    }

    // ==========================================
    // ELEMENT MANAGEMENT
    // ==========================================
    function createElement(type, data, skipSave) {
        var size = getDefaultSize(type);
        var wrapRect = previewWrap.getBoundingClientRect();
        var canvasRect = previewCanvas.getBoundingClientRect();
        var centerX = (canvasRect.width / 2) - (size.width / 2);
        var centerY = (canvasRect.height / 2) - (size.height / 2);

        var el = {
            id: 'el_' + (++idCounter),
            type: type,
            name: data.name || getDefaultName(type),
            page: currentPage,
            x: Math.max(0, centerX),
            y: Math.max(0, centerY),
            width: size.width,
            height: size.height,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: elements.length + 1,
            dataUrl: data.dataUrl || '',
            color: data.color || '#000000',
            content: data.content || '',
            fontFamily: data.fontFamily || 'Inter',
            fontSize: data.fontSize || 14,
            bold: data.bold || false,
            italic: data.italic || false,
            underline: data.underline || false,
            textAlign: data.textAlign || 'left',
            dateValue: data.dateValue || getTodayStr(),
            dateFormat: data.dateFormat || 'MM/DD/YYYY'
        };

        elements.push(el);
        if (!skipSave) saveState();
        createOverlayDom(el);
        selectElement(el.id);
        renderElementsList();
        applyBtn.disabled = elements.length === 0;
        saveSession();
        return el;
    }

    function deleteElement(id) {
        var el = getElementById(id);
        if (!el || el.locked) return;
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].id === id) {
                elements.splice(i, 1);
                break;
            }
        }
        removeOverlayDom(id);
        if (selectedId === id) {
            selectedId = null;
            renderProperties();
        }
        renderElementsList();
        applyBtn.disabled = elements.length === 0;
        saveSession();
    }

    function duplicateElement(id) {
        var src = getElementById(id);
        if (!src) return;
        var data = {
            name: src.name + ' Copy',
            dataUrl: src.dataUrl,
            color: src.color,
            content: src.content,
            fontFamily: src.fontFamily,
            fontSize: src.fontSize,
            bold: src.bold,
            italic: src.italic,
            underline: src.underline,
            textAlign: src.textAlign,
            dateValue: src.dateValue,
            dateFormat: src.dateFormat
        };
        var el = createElement(src.type, data, true);
        el.x = src.x + 20;
        el.y = src.y + 20;
        el.width = src.width;
        el.height = src.height;
        el.rotation = src.rotation;
        el.opacity = src.opacity;
        el.page = src.page;
        updateOverlayDom(el);
        saveState();
        saveSession();
    }

    function bringForward(id) {
        var el = getElementById(id);
        if (!el) return;
        var sorted = elements.slice().sort(function(a, b) { return a.zIndex - b.zIndex; });
        var idx = sorted.indexOf(el);
        if (idx < sorted.length - 1) {
            var above = sorted[idx + 1];
            var tempZ = el.zIndex;
            el.zIndex = above.zIndex;
            above.zIndex = tempZ;
            updateOverlayDom(el);
            updateOverlayDom(above);
            saveState();
            saveSession();
            renderElementsList();
        }
    }

    function sendBackward(id) {
        var el = getElementById(id);
        if (!el) return;
        var sorted = elements.slice().sort(function(a, b) { return a.zIndex - b.zIndex; });
        var idx = sorted.indexOf(el);
        if (idx > 0) {
            var below = sorted[idx - 1];
            var tempZ = el.zIndex;
            el.zIndex = below.zIndex;
            below.zIndex = tempZ;
            updateOverlayDom(el);
            updateOverlayDom(below);
            saveState();
            saveSession();
            renderElementsList();
        }
    }

    function selectElement(id) {
        selectedId = id;
        document.querySelectorAll('.el-overlay').forEach(function(dom) {
            dom.classList.toggle('selected', dom.dataset.id === id);
        });
        renderProperties();
        renderElementsList();
    }

    function deselectAll() {
        selectedId = null;
        document.querySelectorAll('.el-overlay').forEach(function(dom) {
            dom.classList.remove('selected');
        });
        renderProperties();
        renderElementsList();
    }

    // ==========================================
    // OVERLAY RENDERING
    // ==========================================
    function renderAllOverlays() {
        canvasContainer.querySelectorAll('.el-overlay').forEach(function(dom) { dom.remove(); });
        elements.forEach(function(el) {
            if (el.page === currentPage) {
                createOverlayDom(el);
            }
        });
    }

    function createOverlayDom(el) {
        var existing = canvasContainer.querySelector('[data-id="' + el.id + '"]');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.className = 'el-overlay' + (el.id === selectedId ? ' selected' : '');
        overlay.dataset.id = el.id;
        overlay.style.left = el.x + 'px';
        overlay.style.top = el.y + 'px';
        overlay.style.zIndex = el.zIndex;
        overlay.style.display = el.visible ? '' : 'none';

        var inner = document.createElement('div');
        inner.className = 'el-inner';
        inner.style.width = el.width + 'px';
        inner.style.height = el.height + 'px';
        inner.style.transform = 'rotate(' + el.rotation + 'deg)';
        inner.style.opacity = el.opacity;

        if (el.type === 'signature' || el.type === 'image' || el.type === 'initials') {
            var img = document.createElement('img');
            img.src = el.dataUrl;
            img.alt = el.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.draggable = false;
            inner.appendChild(img);
        } else if (el.type === 'text' || el.type === 'date') {
            var textDiv = document.createElement('div');
            textDiv.className = 'el-text-content';
            var displayText = el.type === 'date' ? formatDate(el.dateValue, el.dateFormat) : el.content;
            textDiv.textContent = displayText;
            textDiv.style.fontFamily = el.fontFamily;
            textDiv.style.fontSize = el.fontSize + 'px';
            textDiv.style.fontWeight = el.bold ? 'bold' : 'normal';
            textDiv.style.fontStyle = el.italic ? 'italic' : 'normal';
            textDiv.style.textDecoration = el.underline ? 'underline' : 'none';
            textDiv.style.color = el.color;
            textDiv.style.textAlign = el.textAlign;
            textDiv.style.lineHeight = '1.3';
            textDiv.style.overflow = 'hidden';
            textDiv.style.width = '100%';
            textDiv.style.height = '100%';
            textDiv.style.whiteSpace = 'pre-wrap';
            textDiv.style.wordBreak = 'break-word';
            textDiv.draggable = false;
            inner.appendChild(textDiv);
        }

        overlay.appendChild(inner);

        if (!el.locked) {
            var handles = ['nw', 'ne', 'sw', 'se'];
            handles.forEach(function(h) {
                var handle = document.createElement('div');
                handle.className = 'el-handle el-handle-' + h;
                handle.dataset.handle = h;
                overlay.appendChild(handle);
            });

            var rotateWrapper = document.createElement('div');
            rotateWrapper.className = 'el-rotate-wrapper';
            var rotateLine = document.createElement('div');
            rotateLine.className = 'el-rotate-line';
            var rotateDot = document.createElement('div');
            rotateDot.className = 'el-rotate-dot';
            rotateWrapper.appendChild(rotateLine);
            rotateWrapper.appendChild(rotateDot);
            overlay.appendChild(rotateWrapper);
        }

        canvasContainer.appendChild(overlay);

        if (el.locked && !overlay.querySelector('.el-lock-indicator')) {
            var indicator = document.createElement('div');
            indicator.className = 'el-lock-indicator';
            indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
            overlay.appendChild(indicator);
        }
    }

    function updateOverlayDom(el) {
        var overlay = canvasContainer.querySelector('[data-id="' + el.id + '"]');
        if (!overlay) { createOverlayDom(el); return; }

        overlay.style.left = el.x + 'px';
        overlay.style.top = el.y + 'px';
        overlay.style.zIndex = el.zIndex;
        overlay.style.display = el.visible ? '' : 'none';
        overlay.classList.toggle('selected', el.id === selectedId);

        var oldIndicator = overlay.querySelector('.el-lock-indicator');
        if (el.locked && !oldIndicator) {
            var indicator = document.createElement('div');
            indicator.className = 'el-lock-indicator';
            indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
            overlay.appendChild(indicator);
        } else if (!el.locked && oldIndicator) {
            oldIndicator.remove();
        }

        var inner = overlay.querySelector('.el-inner');
        if (inner) {
            inner.style.width = el.width + 'px';
            inner.style.height = el.height + 'px';
            inner.style.transform = 'rotate(' + el.rotation + 'deg)';
            inner.style.opacity = el.opacity;
        }

        if (el.type === 'text' || el.type === 'date') {
            var textDiv = inner.querySelector('.el-text-content');
            if (textDiv) {
                var displayText = el.type === 'date' ? formatDate(el.dateValue, el.dateFormat) : el.content;
                textDiv.textContent = displayText;
                textDiv.style.fontFamily = el.fontFamily;
                textDiv.style.fontSize = el.fontSize + 'px';
                textDiv.style.fontWeight = el.bold ? 'bold' : 'normal';
                textDiv.style.fontStyle = el.italic ? 'italic' : 'normal';
                textDiv.style.textDecoration = el.underline ? 'underline' : 'none';
                textDiv.style.color = el.color;
                textDiv.style.textAlign = el.textAlign;
            }
        }
    }

    function removeOverlayDom(id) {
        var overlay = canvasContainer.querySelector('[data-id="' + id + '"]');
        if (overlay) overlay.remove();
    }

    // ==========================================
    // INTERACTION (DRAG / RESIZE / ROTATE)
    // ==========================================
    function getCanvasCoords(e) {
        var rect = canvasContainer.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    canvasContainer.addEventListener('mousedown', function(e) {
        var target = e.target;

        if (target.classList.contains('el-handle')) {
            var overlay = target.closest('.el-overlay');
            if (!overlay) return;
            var el = getElementById(overlay.dataset.id);
            if (!el || el.locked) return;
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            resizeElId = el.id;
            resizeHandle = target.dataset.handle;
            var coords = getCanvasCoords(e);
            resizeStartX = coords.x;
            resizeStartY = coords.y;
            resizeStartW = el.width;
            resizeStartH = el.height;
            resizeStartLeft = el.x;
            resizeStartTop = el.y;
            return;
        }

        if (target.classList.contains('el-rotate-dot') || target.classList.contains('el-rotate-wrapper')) {
            var overlay = target.closest('.el-overlay');
            if (!overlay) return;
            var el = getElementById(overlay.dataset.id);
            if (!el || el.locked) return;
            e.preventDefault();
            e.stopPropagation();
            isRotating = true;
            rotateElId = el.id;
            rotateCenterX = el.x + el.width / 2;
            rotateCenterY = el.y + el.height / 2;
            return;
        }

        var overlay = target.closest('.el-overlay');
        if (overlay) {
            var el = getElementById(overlay.dataset.id);
            if (!el) return;
            selectElement(el.id);
            if (el.locked) return;
            e.preventDefault();
            isDragging = true;
            dragElId = el.id;
            var coords = getCanvasCoords(e);
            dragOffsetX = coords.x - el.x;
            dragOffsetY = coords.y - el.y;
            return;
        }

        deselectAll();
    });

    canvasContainer.addEventListener('touchstart', function(e) {
        var target = e.target;
        if (target.classList.contains('el-handle') || target.classList.contains('el-rotate-dot') || target.classList.contains('el-rotate-wrapper')) {
            return;
        }
        var overlay = target.closest('.el-overlay');
        if (overlay) {
            var el = getElementById(overlay.dataset.id);
            if (!el) return;
            selectElement(el.id);
            if (el.locked) return;
            e.preventDefault();
            isDragging = true;
            dragElId = el.id;
            var coords = getCanvasCoords(e);
            dragOffsetX = coords.x - el.x;
            dragOffsetY = coords.y - el.y;
        }
    }, { passive: false });

    function handleResize(e) {
        if (!isResizing) return;
        var el = getElementById(resizeElId);
        if (!el) return;
        var coords = getCanvasCoords(e);
        var dx = coords.x - resizeStartX;
        var dy = coords.y - resizeStartY;
        var newW = resizeStartW;
        var newH = resizeStartH;
        var newLeft = resizeStartLeft;
        var newTop = resizeStartTop;
        var isImage = el.type === 'signature' || el.type === 'image' || el.type === 'initials';
        var aspect = resizeStartW / resizeStartH;

        if (resizeHandle === 'se') {
            newW = Math.max(30, resizeStartW + dx);
            if (isImage) newH = newW / aspect; else newH = Math.max(20, resizeStartH + dy);
        } else if (resizeHandle === 'sw') {
            newW = Math.max(30, resizeStartW - dx);
            newLeft = resizeStartLeft + (resizeStartW - newW);
            if (isImage) newH = newW / aspect; else newH = Math.max(20, resizeStartH + dy);
        } else if (resizeHandle === 'ne') {
            newW = Math.max(30, resizeStartW + dx);
            newH = Math.max(20, resizeStartH - dy);
            newTop = resizeStartTop + (resizeStartH - newH);
            if (isImage) { newH = newW / aspect; newTop = resizeStartTop + (resizeStartH - newH); }
        } else if (resizeHandle === 'nw') {
            newW = Math.max(30, resizeStartW - dx);
            newH = Math.max(20, resizeStartH - dy);
            newLeft = resizeStartLeft + (resizeStartW - newW);
            newTop = resizeStartTop + (resizeStartH - newH);
            if (isImage) { newH = newW / aspect; newLeft = resizeStartLeft + (resizeStartW - newW); newTop = resizeStartTop + (resizeStartH - newH); }
        }

        el.x = newLeft;
        el.y = newTop;
        el.width = newW;
        el.height = newH;
        updateOverlayDom(el);
    }

    function handleRotate(e) {
        if (!isRotating) return;
        var el = getElementById(rotateElId);
        if (!el) return;
        var coords = getCanvasCoords(e);
        var angle = Math.atan2(coords.y - rotateCenterY, coords.x - rotateCenterX) * (180 / Math.PI) + 90;
        el.rotation = Math.round(((angle % 360) + 360) % 360);
        updateOverlayDom(el);
    }

    function handleDrag(e) {
        if (!isDragging) return;
        var el = getElementById(dragElId);
        if (!el) return;
        var coords = getCanvasCoords(e);
        var canvasRect = previewCanvas.getBoundingClientRect();
        var maxX = canvasRect.width - el.width;
        var maxY = canvasRect.height - el.height;
        el.x = clamp(coords.x - dragOffsetX, 0, Math.max(0, maxX));
        el.y = clamp(coords.y - dragOffsetY, 0, Math.max(0, maxY));
        updateOverlayDom(el);
    }

    document.addEventListener('mousemove', function(e) {
        if (isDragging) handleDrag(e);
        else if (isResizing) handleResize(e);
        else if (isRotating) handleRotate(e);
    });

    document.addEventListener('touchmove', function(e) {
        if (isDragging || isResizing || isRotating) {
            e.preventDefault();
            if (isDragging) handleDrag(e);
            else if (isResizing) handleResize(e);
            else if (isRotating) handleRotate(e);
        }
    }, { passive: false });

    document.addEventListener('mouseup', function() {
        if (isDragging || isResizing || isRotating) {
            isDragging = false;
            isResizing = false;
            isRotating = false;
            saveState();
            saveSession();
            if (selectedId) renderProperties();
        }
    });

    document.addEventListener('touchend', function() {
        if (isDragging || isResizing || isRotating) {
            isDragging = false;
            isResizing = false;
            isRotating = false;
            saveState();
            saveSession();
            if (selectedId) renderProperties();
        }
    });

    // ==========================================
    // PROPERTIES PANEL
    // ==========================================
    function renderProperties() {
        if (!selectedId) {
            propertiesPanelEl.style.display = 'none';
            return;
        }
        propertiesPanelEl.style.display = '';
        var el = getElementById(selectedId);
        if (!el) { propertiesPanelEl.style.display = 'none'; return; }

        var h = '';
        h += '<div class="prop-section">';
        h += '<div class="prop-section-title">Position & Size</div>';
        h += '<div class="prop-grid">';
        h += '<div class="prop-field"><label>X</label><input type="number" data-prop="x" value="' + Math.round(el.x) + '"></div>';
        h += '<div class="prop-field"><label>Y</label><input type="number" data-prop="y" value="' + Math.round(el.y) + '"></div>';
        h += '<div class="prop-field"><label>W</label><input type="number" data-prop="width" value="' + Math.round(el.width) + '" min="10"></div>';
        h += '<div class="prop-field"><label>H</label><input type="number" data-prop="height" value="' + Math.round(el.height) + '" min="10"></div>';
        h += '</div>';
        h += '<div class="prop-grid">';
        h += '<div class="prop-field"><label>Rotation</label><input type="number" data-prop="rotation" value="' + el.rotation + '" min="0" max="360"></div>';
        h += '<div class="prop-field"><label>Opacity</label><input type="range" data-prop="opacity" value="' + Math.round(el.opacity * 100) + '" min="0" max="100" class="prop-slider"><span class="prop-slider-val">' + Math.round(el.opacity * 100) + '%</span></div>';
        h += '</div>';
        h += '</div>';

        if (el.type === 'text') {
            h += '<div class="prop-section">';
            h += '<div class="prop-section-title">Text</div>';
            h += '<div class="prop-field prop-field-full"><label>Content</label><textarea data-prop="content" rows="2">' + escapeHtml(el.content) + '</textarea></div>';
            h += '<div class="prop-grid">';
            h += '<div class="prop-field"><label>Font</label><select data-prop="fontFamily">';
            ['Inter','Arial','Times New Roman','Courier New','Georgia','Verdana','Courier'].forEach(function(f) {
                h += '<option value="' + f + '"' + (el.fontFamily === f ? ' selected' : '') + '>' + f + '</option>';
            });
            h += '</select></div>';
            h += '<div class="prop-field"><label>Size</label><input type="number" data-prop="fontSize" value="' + el.fontSize + '" min="6" max="120"></div>';
            h += '</div>';
            h += '<div class="prop-row-btns">';
            h += '<button class="prop-toggle' + (el.bold ? ' active' : '') + '" data-toggle="bold"><b>B</b></button>';
            h += '<button class="prop-toggle' + (el.italic ? ' active' : '') + '" data-toggle="italic"><i>I</i></button>';
            h += '<button class="prop-toggle' + (el.underline ? ' active' : '') + '" data-toggle="underline"><u>U</u></button>';
            h += '<input type="color" data-prop="color" value="' + el.color + '" class="prop-color">';
            h += '<div class="prop-sep"></div>';
            h += '<button class="prop-toggle' + (el.textAlign === 'left' ? ' active' : '') + '" data-toggle="textAlign" data-val="left"><i class="fas fa-align-left"></i></button>';
            h += '<button class="prop-toggle' + (el.textAlign === 'center' ? ' active' : '') + '" data-toggle="textAlign" data-val="center"><i class="fas fa-align-center"></i></button>';
            h += '<button class="prop-toggle' + (el.textAlign === 'right' ? ' active' : '') + '" data-toggle="textAlign" data-val="right"><i class="fas fa-align-right"></i></button>';
            h += '</div>';
            h += '</div>';
        }

        if (el.type === 'date') {
            h += '<div class="prop-section">';
            h += '<div class="prop-section-title">Date</div>';
            h += '<div class="prop-grid">';
            h += '<div class="prop-field"><label>Date</label><input type="date" data-prop="dateValue" value="' + el.dateValue + '"></div>';
            h += '<div class="prop-field"><label>Format</label><select data-prop="dateFormat">';
            ['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD','Month D, YYYY','D Month YYYY'].forEach(function(f) {
                h += '<option value="' + f + '"' + (el.dateFormat === f ? ' selected' : '') + '>' + f + '</option>';
            });
            h += '</select></div>';
            h += '</div>';
            h += '<div class="prop-grid">';
            h += '<div class="prop-field"><label>Font</label><select data-prop="fontFamily">';
            ['Inter','Arial','Times New Roman','Courier New','Georgia','Verdana'].forEach(function(f) {
                h += '<option value="' + f + '"' + (el.fontFamily === f ? ' selected' : '') + '>' + f + '</option>';
            });
            h += '</select></div>';
            h += '<div class="prop-field"><label>Size</label><input type="number" data-prop="fontSize" value="' + el.fontSize + '" min="6" max="120"></div>';
            h += '</div>';
            h += '<div class="prop-row-btns">';
            h += '<input type="color" data-prop="color" value="' + el.color + '" class="prop-color">';
            h += '</div>';
            h += '</div>';
        }

        h += '<div class="prop-section">';
        h += '<div class="prop-section-title">Actions</div>';
        h += '<div class="prop-actions">';
        h += '<button class="prop-action" data-action="duplicate"><i class="fas fa-copy"></i> Duplicate</button>';
        h += '<button class="prop-action" data-action="forward"><i class="fas fa-arrow-up"></i> Forward</button>';
        h += '<button class="prop-action" data-action="backward"><i class="fas fa-arrow-down"></i> Backward</button>';
        h += '<button class="prop-action" data-action="lock"><i class="fas fa-' + (el.locked ? 'unlock' : 'lock') + '"></i> ' + (el.locked ? 'Unlock' : 'Lock') + '</button>';
        h += '<button class="prop-action" data-action="visibility"><i class="fas fa-eye"></i> ' + (el.visible ? 'Hide' : 'Show') + '</button>';
        h += '<button class="prop-action prop-action-danger" data-action="delete"><i class="fas fa-trash"></i> Delete</button>';
        h += '</div>';
        h += '</div>';

        propertiesBodyEl.innerHTML = h;

        propertiesBodyEl.querySelectorAll('[data-prop]').forEach(function(input) {
            var prop = input.dataset.prop;
            var evtType = (input.type === 'range' || input.type === 'color') ? 'input' : 'change';
            input.addEventListener(evtType, function() {
                var val;
                if (prop === 'opacity') {
                    val = parseInt(input.value) / 100;
                    var span = input.nextElementSibling;
                    if (span) span.textContent = input.value + '%';
                } else if (prop === 'x' || prop === 'y' || prop === 'width' || prop === 'height' || prop === 'rotation' || prop === 'fontSize') {
                    val = parseFloat(input.value) || 0;
                } else {
                    val = input.value;
                }
                saveState();
                el[prop] = val;
                updateOverlayDom(el);
                if (prop === 'dateValue' || prop === 'dateFormat') updateOverlayDom(el);
                saveSession();
            });
        });

        propertiesBodyEl.querySelectorAll('[data-toggle]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var prop = btn.dataset.toggle;
                var val = btn.dataset.val;
                saveState();
                if (prop === 'bold') el.bold = !el.bold;
                else if (prop === 'italic') el.italic = !el.italic;
                else if (prop === 'underline') el.underline = !el.underline;
                else if (prop === 'textAlign') el.textAlign = val;
                updateOverlayDom(el);
                renderProperties();
                saveSession();
            });
        });

        propertiesBodyEl.querySelectorAll('[data-action]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var action = btn.dataset.action;
                saveState();
                if (action === 'delete') deleteElement(el.id);
                else if (action === 'duplicate') duplicateElement(el.id);
                else if (action === 'forward') bringForward(el.id);
                else if (action === 'backward') sendBackward(el.id);
                else if (action === 'lock') { el.locked = !el.locked; updateOverlayDom(el); renderProperties(); renderElementsList(); saveSession(); }
                else if (action === 'visibility') { el.visible = !el.visible; updateOverlayDom(el); renderProperties(); renderElementsList(); saveSession(); }
            });
        });
    }

    // ==========================================
    // ELEMENTS LIST
    // ==========================================
    function renderElementsList() {
        var typeIcons = { signature: 'fa-pen-fancy', initials: 'fa-signature', image: 'fa-image', text: 'fa-font', date: 'fa-calendar' };
        var typeColors = { signature: '#6366f1', initials: '#8b5cf6', image: '#10b981', text: '#3b82f6', date: '#f59e0b' };

        if (elements.length === 0) {
            elementsListEl.innerHTML = '<div class="elements-empty">No elements added yet</div>';
            elementCountEl.textContent = '0';
            return;
        }

        elementCountEl.textContent = elements.length;
        var sorted = elements.slice().sort(function(a, b) { return b.zIndex - a.zIndex; });
        var h = '';
        sorted.forEach(function(el) {
            var isSelected = el.id === selectedId;
            h += '<div class="element-item' + (isSelected ? ' selected' : '') + (!el.visible ? ' hidden-el' : '') + '" data-id="' + el.id + '">';
            h += '<div class="element-item-icon" style="color:' + typeColors[el.type] + '"><i class="fas ' + typeIcons[el.type] + '"></i></div>';
            h += '<div class="element-item-info">';
            h += '<div class="element-item-name">' + escapeHtml(el.name) + '</div>';
            h += '<div class="element-item-type">' + el.type.charAt(0).toUpperCase() + el.type.slice(1) + ' &middot; Page ' + (el.page + 1) + '</div>';
            h += '</div>';
            h += '<div class="element-item-actions">';
            h += '<button class="el-action-btn" data-el-action="visibility" data-el-id="' + el.id + '" title="' + (el.visible ? 'Hide' : 'Show') + '"><i class="fas fa-eye' + (!el.visible ? '-slash' : '') + '"></i></button>';
            h += '<button class="el-action-btn" data-el-action="lock" data-el-id="' + el.id + '" title="' + (el.locked ? 'Unlock' : 'Lock') + '"><i class="fas fa-' + (el.locked ? 'lock' : 'unlock') + '"></i></button>';
            h += '<button class="el-action-btn" data-el-action="delete" data-el-id="' + el.id + '" title="Delete"><i class="fas fa-trash"></i></button>';
            h += '</div>';
            h += '</div>';
        });
        elementsListEl.innerHTML = h;

        elementsListEl.querySelectorAll('.element-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.el-action-btn')) return;
                selectElement(item.dataset.id);
            });
        });

        elementsListEl.querySelectorAll('[data-el-action]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var action = btn.dataset.elAction;
                var id = btn.dataset.elId;
                saveState();
                if (action === 'delete') deleteElement(id);
                else if (action === 'visibility') {
                    var el = getElementById(id);
                    if (el) { el.visible = !el.visible; updateOverlayDom(el); renderElementsList(); if (el.id === selectedId) renderProperties(); saveSession(); }
                } else if (action === 'lock') {
                    var el = getElementById(id);
                    if (el) { el.locked = !el.locked; updateOverlayDom(el); renderElementsList(); renderProperties(); saveSession(); }
                }
            });
        });
    }

    // ==========================================
    // HISTORY (UNDO / REDO)
    // ==========================================
    function saveState() {
        var snapshot = JSON.parse(JSON.stringify(elements));
        historyStack = historyStack.slice(0, historyIdx + 1);
        historyStack.push({ elements: snapshot, selectedId: selectedId, idCounter: idCounter });
        historyIdx = historyStack.length - 1;
        if (historyStack.length > 100) {
            historyStack.shift();
            historyIdx--;
        }
    }

    function undo() {
        if (historyIdx <= 0) return;
        historyIdx--;
        restoreState(historyStack[historyIdx]);
    }

    function redo() {
        if (historyIdx >= historyStack.length - 1) return;
        historyIdx++;
        restoreState(historyStack[historyIdx]);
    }

    function restoreState(state) {
        elements = JSON.parse(JSON.stringify(state.elements));
        selectedId = state.selectedId;
        idCounter = state.idCounter;
        renderAllOverlays();
        renderElementsList();
        renderProperties();
        applyBtn.disabled = elements.length === 0;
        saveSession();
    }

    // ==========================================
    // SIGNATURE MODAL
    // ==========================================
    function openSigModal(type) {
        sigModalType = type;
        sigModalDataUrl = null;
        sigModal.style.display = 'flex';
        sigModalTitle.textContent = type === 'initials' ? 'Create Initials' : 'Create Signature';
        sigTypeInput.value = '';
        sigUploadArea.innerHTML = '<span style="font-size:var(--text-xs);color:var(--color-text-light)">Click to upload image</span>';
        sigUploadInput.value = '';
        document.querySelectorAll('#sig-modal .sig-method-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelector('#sig-modal .sig-method-btn[data-method="draw"]').classList.add('active');
        document.getElementById('sig-draw-panel').style.display = '';
        document.getElementById('sig-type-panel').style.display = 'none';
        document.getElementById('sig-upload-panel').style.display = 'none';
        initSigCanvas();
    }

    function closeSigModal() {
        sigModal.style.display = 'none';
        sigModalDataUrl = null;
    }

    function initSigCanvas() {
        var ctx = sigCanvas.getContext('2d');
        sigCanvas.width = sigCanvas.parentElement.clientWidth || 300;
        sigCanvas.height = 150;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    function setupDrawOnSigCanvas() {
        var ctx = sigCanvas.getContext('2d');
        function getPos(e) {
            var rect = sigCanvas.getBoundingClientRect();
            var clientX = e.touches ? e.touches[0].clientX : e.clientX;
            var clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        }
        sigCanvas.addEventListener('mousedown', function(e) {
            isDrawing = true;
            var pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        });
        sigCanvas.addEventListener('mousemove', function(e) {
            if (!isDrawing) return;
            ctx.strokeStyle = sigColor.value;
            ctx.lineWidth = 2;
            var pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        });
        sigCanvas.addEventListener('mouseup', function() { isDrawing = false; });
        sigCanvas.addEventListener('mouseleave', function() { isDrawing = false; });
        sigCanvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            isDrawing = true;
            var pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        });
        sigCanvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (!isDrawing) return;
            ctx.strokeStyle = sigColor.value;
            ctx.lineWidth = 2;
            var pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        });
        sigCanvas.addEventListener('touchend', function(e) { e.preventDefault(); isDrawing = false; });
    }

    function acceptSig() {
        var dataUrl = null;
        var method = document.querySelector('#sig-modal .sig-method-btn.active').dataset.method;

        if (method === 'draw') {
            dataUrl = sigCanvas.toDataURL('image/png');
        } else if (method === 'type') {
            var text = sigTypeInput.value.trim();
            if (!text) { showNotification('Please type your name', true); return; }
            var c = document.createElement('canvas');
            c.width = 400;
            c.height = 120;
            var ctx = c.getContext('2d');
            ctx.fillStyle = sigColor.value;
            ctx.font = '60px "Brush Script MT","Segoe Script",cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, c.width / 2, c.height / 2);
            dataUrl = c.toDataURL('image/png');
        } else if (method === 'upload') {
            dataUrl = sigUploadInput.dataset.dataUrl;
            if (!dataUrl) { showNotification('Please upload an image first', true); return; }
        }

        if (!dataUrl) return;
        var namePrefix = sigModalType === 'initials' ? 'Initials' : 'Signature';
        createElement(sigModalType, { dataUrl: dataUrl, color: sigColor.value, name: getDefaultName(sigModalType) });
        closeSigModal();
        showNotification(sigModalType.charAt(0).toUpperCase() + sigModalType.slice(1) + ' added to PDF', false);
    }

    sigModalClose.addEventListener('click', closeSigModal);
    sigModal.addEventListener('click', function(e) { if (e.target === sigModal) closeSigModal(); });

    document.querySelectorAll('#sig-modal .sig-method-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#sig-modal .sig-method-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var method = btn.dataset.method;
            document.getElementById('sig-draw-panel').style.display = method === 'draw' ? '' : 'none';
            document.getElementById('sig-type-panel').style.display = method === 'type' ? '' : 'none';
            document.getElementById('sig-upload-panel').style.display = method === 'upload' ? '' : 'none';
            if (method === 'draw') initSigCanvas();
        });
    });

    sigClear.addEventListener('click', function() { initSigCanvas(); sigModalDataUrl = null; });

    sigUploadInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                sigUploadArea.innerHTML = '<img src="' + ev.target.result + '" alt="Upload" style="max-width:200px;max-height:80px">';
                sigUploadInput.dataset.dataUrl = ev.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    sigApplyBtn.addEventListener('click', acceptSig);

    // ==========================================
    // IMAGE UPLOAD
    // ==========================================
    imageUploadInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                createElement('image', { dataUrl: ev.target.result });
                showNotification('Image added to PDF', false);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        imageUploadInput.value = '';
    });

    // ==========================================
    // EXPORT
    // ==========================================
    function getErrorMessage(err) {
        if (!err) return 'Unknown error';
        if (typeof err === 'string') return err;
        if (err.message) return err.message;
        if (err.error && err.error.message) return err.error.message;
        try { return String(err); } catch (e) { return 'Unknown error'; }
    }

    function dataUrlToBytes(dataUrl) {
        if (!dataUrl) return null;
        var parts = dataUrl.split(',');
        if (parts.length !== 2) return null;
        var base64 = parts[1];
        try {
            var binStr = atob(base64);
            var bytes = new Uint8Array(binStr.length);
            for (var i = 0; i < binStr.length; i++) {
                bytes[i] = binStr.charCodeAt(i);
            }
            return bytes;
        } catch (e) {
            console.error('[Image Debug] atob failed:', e.message);
            return null;
        }
    }

    function sanitizeFilename(name) {
        return name
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    function getMimeType(dataUrl) {
        if (!dataUrl) return '';
        var match = dataUrl.match(/^data:([^;,]+)/i);
        return match ? match[1].toLowerCase() : '';
    }

    function convertToPngDataUrl(dataUrl) {
        return new Promise(function(resolve, reject) {
            var img = new Image();
            img.onload = function() {
                var c = document.createElement('canvas');
                c.width = img.naturalWidth;
                c.height = img.naturalHeight;
                var ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(c.toDataURL('image/png'));
            };
            img.onerror = function() { reject(new Error('Failed to decode image')); };
            img.src = dataUrl;
        });
    }

    async function embedImagePdf(pdfDoc, dataUrl) {
        console.log('[Image Debug] embedImagePdf called, dataUrl length:', dataUrl ? dataUrl.length : 0);
        var mime = getMimeType(dataUrl);
        console.log('[Image Debug] MIME type:', mime);
        var isPng = mime === 'image/png';
        var isJpeg = mime === 'image/jpeg' || mime === 'image/jpg';

        var bytes = dataUrlToBytes(dataUrl);
        if (!bytes) {
            console.error('[Image Debug] dataUrlToBytes returned null, falling back to PNG conversion');
            var pngDataUrl = await convertToPngDataUrl(dataUrl);
            console.log('[Image Debug] PNG conversion complete, new dataUrl length:', pngDataUrl.length);
            var pngBytes = dataUrlToBytes(pngDataUrl);
            if (pngBytes) {
                try { return await pdfDoc.embedPng(pngBytes); } catch (e) { throw new Error('PNG conversion embed failed: ' + e.message); }
            }
            throw new Error('Unable to embed image: unsupported format (' + mime + ')');
        }

        console.log('[Image Debug] Converted to bytes, length:', bytes.length);

        if (isPng) {
            try {
                var result = await pdfDoc.embedPng(bytes);
                console.log('[Image Debug] PNG embedded successfully');
                return result;
            } catch (e) {
                console.error('[Image Debug] PNG embed failed:', e.message);
                throw e;
            }
        }

        if (isJpeg) {
            try {
                var result = await pdfDoc.embedJpg(bytes);
                console.log('[Image Debug] JPEG embedded successfully');
                return result;
            } catch (e) {
                console.error('[Image Debug] JPEG embed failed:', e.message);
                throw e;
            }
        }

        console.log('[Image Debug] Format not PNG or JPEG, converting to PNG');
        var pngDataUrl = await convertToPngDataUrl(dataUrl);
        console.log('[Image Debug] PNG conversion complete');
        var pngBytes = dataUrlToBytes(pngDataUrl);
        if (pngBytes) {
            try { return await pdfDoc.embedPng(pngBytes); } catch (e) { throw new Error('Fallback PNG embed failed: ' + e.message); }
        }
        throw new Error('Unable to embed image: unsupported format (' + mime + ')');
    }

    async function signPdf() {
        if (!currentFile || !pdfDocRef || elements.length === 0) return;
        if (typeof PDFLib === 'undefined') { showNotification('PDF library is loading', true); return; }

        console.log('[Image Debug] === EXPORT START ===');
        console.log('[Image Debug] Total elements:', elements.length);
        console.table(elements.map(function(el) {
            return {
                id: el.id, type: el.type, name: el.name, page: el.page,
                visible: el.visible, dataUrlLen: el.dataUrl ? el.dataUrl.length : 0,
                x: Math.round(el.x), y: Math.round(el.y), w: Math.round(el.width), h: Math.round(el.height)
            };
        }));

        applyBtn.disabled = true;
        progressContainer.classList.add('show');
        resultsPanel.classList.remove('show');
        updateProgress('Loading PDF...', 10);

        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            updateProgress('Preparing elements...', 30);
            var pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            var pages = pdfDoc.getPages();
            var sortedElements = elements.slice().sort(function(a, b) { return a.zIndex - b.zIndex; });

            for (var i = 0; i < sortedElements.length; i++) {
                var el = sortedElements[i];
                console.log('[Image Debug] Processing element', i, ':', el.name, '(type:', el.type, ', visible:', el.visible, ')');
                if (!el.visible) { console.log('[Image Debug] SKIPPED: not visible'); continue; }
                var targetPage = pages[el.page];
                if (!targetPage) { console.log('[Image Debug] SKIPPED: page', el.page, 'not found'); continue; }
                var pageH = targetPage.getHeight();
                var pageW = targetPage.getWidth();
                var canvasRect = previewCanvas.getBoundingClientRect();
                var pdfScaleX = canvasRect.width / pageW;
                var pdfScaleY = canvasRect.height / pageH;
                console.log('[Image Debug] Target page height:', pageH, 'width:', pageW);

                var pct = 30 + Math.round((i / elements.length) * 50);
                updateProgress('Embedding ' + el.name + '...', pct);

                try {
                    if (el.type === 'signature' || el.type === 'image' || el.type === 'initials') {
                        if (!el.dataUrl) { console.log('[Image Debug] SKIPPED: no dataUrl'); continue; }
                        console.log('[Image Debug] Embedding image element, dataUrl length:', el.dataUrl.length);
                        var embeddedImage = await embedImagePdf(pdfDoc, el.dataUrl);
                        console.log('[Image Debug] Embedding successful, image dimensions:', embeddedImage.width, 'x', embeddedImage.height);
                        var pdfX = el.x / pdfScaleX;
                        var pdfW = el.width / pdfScaleX;
                        var pdfH_el = el.height / pdfScaleY;
                        var pdfY = pageH - (el.y / pdfScaleY) - pdfH_el;
                        console.log('[Image Debug] Drawing image at x:', pdfX, 'y:', pdfY, 'w:', pdfW, 'h:', pdfH_el, 'rotate:', el.rotation, 'opacity:', el.opacity);
                        targetPage.drawImage(embeddedImage, {
                            x: pdfX,
                            y: pdfY,
                            width: pdfW,
                            height: pdfH_el,
                            rotate: PDFLib.degrees(el.rotation),
                            opacity: el.opacity
                        });
                        console.log('[Image Debug] Image drawn successfully on page', el.page);
                    } else if (el.type === 'text' || el.type === 'date') {
                        console.log('[Image Debug] Processing text/date element:', el.name);
                        var displayText = el.type === 'date' ? formatDate(el.dateValue, el.dateFormat) : el.content;
                        if (!displayText) { console.log('[Image Debug] SKIPPED: empty text'); continue; }
                        var textCanvas = document.createElement('canvas');
                        var scale2x = 2;
                        textCanvas.width = Math.max(1, el.width * scale2x);
                        textCanvas.height = Math.max(1, el.height * scale2x);
                        var tCtx = textCanvas.getContext('2d');
                        tCtx.scale(scale2x, scale2x);
                        tCtx.font = (el.italic ? 'italic ' : '') + (el.bold ? 'bold ' : '') + el.fontSize + 'px ' + el.fontFamily;
                        tCtx.fillStyle = el.color;
                        tCtx.textAlign = el.textAlign || 'left';
                        tCtx.textBaseline = 'top';
                        tCtx.clearRect(0, 0, el.width, el.height);

                        var lines = displayText.split('\n');
                        var lineH = el.fontSize * 1.3;
                        var wrappedLines = [];
                        lines.forEach(function(line) {
                            if (tCtx.measureText(line).width <= el.width) { wrappedLines.push(line); return; }
                            var words = line.split(' ');
                            var current = '';
                            words.forEach(function(word) {
                                var test = current ? current + ' ' + word : word;
                                if (tCtx.measureText(test).width > el.width && current) {
                                    wrappedLines.push(current);
                                    current = word;
                                } else {
                                    current = test;
                                }
                            });
                            if (current) wrappedLines.push(current);
                        });

                        wrappedLines.forEach(function(line, li) {
                            var lx = 0;
                            if (el.textAlign === 'center') lx = el.width / 2;
                            else if (el.textAlign === 'right') lx = el.width;
                            tCtx.fillText(line, lx, li * lineH);
                            if (el.underline) {
                                var lw = tCtx.measureText(line).width;
                                var ux = el.textAlign === 'center' ? (el.width - lw) / 2 : (el.textAlign === 'right' ? el.width - lw : 0);
                                tCtx.fillRect(ux, li * lineH + el.fontSize + 1, lw, 1);
                            }
                        });

                        var textDataUrl = textCanvas.toDataURL('image/png');
                        var textPng;
                        try {
                            textPng = await pdfDoc.embedPng(textDataUrl);
                        } catch (embedErr) {
                            var txtBytes = dataUrlToBytes(textDataUrl);
                            if (txtBytes) {
                                textPng = await pdfDoc.embedPng(txtBytes);
                            } else {
                                showNotification('Skipping ' + el.name + ': invalid text image', true);
                                continue;
                            }
                        }
                        var pdfX = el.x / pdfScaleX;
                        var pdfW = el.width / pdfScaleX;
                        var pdfH_el = el.height / pdfScaleY;
                        var pdfY = pageH - (el.y / pdfScaleY) - pdfH_el;
                        targetPage.drawImage(textPng, {
                            x: pdfX,
                            y: pdfY,
                            width: pdfW,
                            height: pdfH_el,
                            rotate: PDFLib.degrees(el.rotation),
                            opacity: el.opacity
                        });
                        console.log('[Image Debug] Text element drawn successfully on page', el.page);
                    }
                } catch (elErr) {
                    console.error('[Image Debug] ERROR processing element "' + el.name + '":', elErr);
                    showNotification('Error with element "' + el.name + '": ' + getErrorMessage(elErr), true);
                }
            }

            console.log('[Image Debug] === EXPORT COMPLETE ===');
            updateProgress('Saving PDF...', 90);
            outputBytes = await pdfDoc.save();
            updateProgress('Complete!', 100);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                downloadBtn.download = 'signed-' + sanitizeFilename(currentFile.name);
                showNotification('PDF signed successfully!', false);
            }, 500);
        } catch (err) {
            console.error('[Image Debug] FATAL export error:', err);
            showNotification('Error signing PDF: ' + getErrorMessage(err), true);
            progressContainer.classList.remove('show');
            applyBtn.disabled = false;
        }
    }

    // ==========================================
    // FILE HANDLING
    // ==========================================
    async function renderPreviewPage(pageNum) {
        if (!pdfDocRef || !window['pdfjsLib']) return;
        if (pageNum < 0 || pageNum >= pdfPagesData.length) return;
        previewPageNum.textContent = pageNum + 1;
        prevPageBtn.disabled = pageNum === 0;
        nextPageBtn.disabled = pageNum >= pdfPagesData.length - 1;
        try {
            var pdfjsDoc = await pdfjsLib.getDocument({ data: pdfPagesData[pageNum].slice() }).promise;
            var page = await pdfjsDoc.getPage(1);
            var wrapWidth = previewWrap.clientWidth || 500;
            var viewport = page.getViewport({ scale: 1 });
            var scale = Math.min(wrapWidth / viewport.width, 1.5);
            currentScale = scale;
            var scaledViewport = page.getViewport({ scale: scale });
            previewCanvas.width = scaledViewport.width;
            previewCanvas.height = scaledViewport.height;
            var ctx = previewCanvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
            await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
            previewWrap.scrollTop = 0;
            renderAllOverlays();
        } catch (err) {
            showNotification('Preview error: ' + getErrorMessage(err), true);
        }
    }

    function loadPdf(file) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showNotification('Please select a valid PDF file', true);
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showNotification('File size must be less than 50 MB', true);
            return;
        }
        currentFile = file;
        fileName.textContent = file.name;
        fileSizeEl.textContent = formatFileSize(file.size);
        fileStatus.textContent = 'Loaded';
        fileInfo.classList.add('show');
        settingsPanel.classList.add('show');
        resultsPanel.classList.remove('show');
        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var arr = new Uint8Array(e.target.result);
                pdfDocRef = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
                var count = pdfDocRef.getPageCount();
                filePagesEl.textContent = count + ' page' + (count !== 1 ? 's' : '');
                pdfPagesData = [];
                for (var i = 0; i < count; i++) {
                    pdfPagesData.push(await pdfDocRef.save());
                }
                currentPage = 0;
                if (window['pdfjsLib']) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    await renderPreviewPage(0);
                }
                showNotification('PDF loaded with ' + count + ' pages', false);
            } catch (err) {
                showNotification('Failed to load PDF: ' + getErrorMessage(err), true);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ==========================================
    // AUTO SAVE
    // ==========================================
    function saveSession() {
        try {
            var data = {
                elements: elements,
                selectedId: selectedId,
                idCounter: idCounter,
                currentPage: currentPage,
                fileName: currentFile ? currentFile.name : null
            };
            sessionStorage.setItem('signPdf_session', JSON.stringify(data));
        } catch (e) {}
    }

    function loadSession() {
        try {
            var raw = sessionStorage.getItem('signPdf_session');
            if (!raw) return false;
            var data = JSON.parse(raw);
            if (data.elements && data.elements.length > 0 && currentFile && data.fileName === currentFile.name) {
                elements = data.elements;
                selectedId = null;
                idCounter = data.idCounter || elements.length;
                return true;
            }
        } catch (e) {}
        return false;
    }

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedId) {
                e.preventDefault();
                saveState();
                deleteElement(selectedId);
            }
        }
        if (e.key === 'Escape') {
            if (sigModal.style.display === 'flex') { closeSigModal(); return; }
            deselectAll();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
            e.preventDefault();
            redo();
        }
    });

    // ==========================================
    // RESET
    // ==========================================
    function resetTool() {
        currentFile = null;
        pdfDocRef = null;
        pdfPagesData = [];
        currentPage = 0;
        currentScale = 1;
        outputBytes = null;
        elements = [];
        selectedId = null;
        historyStack = [];
        historyIdx = -1;
        idCounter = 0;
        fileInput.value = '';
        sigTypeInput.value = '';
        sigUploadInput.value = '';
        sigUploadArea.innerHTML = '<span style="font-size:var(--text-xs);color:var(--color-text-light)">Click to upload image</span>';
        canvasContainer.querySelectorAll('.el-overlay').forEach(function(dom) { dom.remove(); });
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        propertiesPanelEl.style.display = 'none';
        applyBtn.disabled = true;
        previewCanvas.width = 0;
        previewCanvas.height = 0;
        renderElementsList();
        renderProperties();
        updateProgress('Signing PDF...', 0);
        try { sessionStorage.removeItem('signPdf_session'); } catch (e) {}
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    dropZone.addEventListener('click', function() { fileInput.click(); });
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) loadPdf(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) loadPdf(e.target.files[0]);
    });

    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 0) { currentPage--; renderPreviewPage(currentPage); }
    });
    nextPageBtn.addEventListener('click', function() {
        if (currentPage < pdfPagesData.length - 1) { currentPage++; renderPreviewPage(currentPage); }
    });

    document.getElementById('btn-add-signature').addEventListener('click', function() { openSigModal('signature'); });
    document.getElementById('btn-add-initials').addEventListener('click', function() { openSigModal('initials'); });
    document.getElementById('btn-add-image').addEventListener('click', function() { imageUploadInput.click(); });
    document.getElementById('btn-add-text').addEventListener('click', function() {
        createElement('text', { content: 'Text', name: getDefaultName('text') });
        showNotification('Text added. Edit in properties panel.', false);
    });
    document.getElementById('btn-add-date').addEventListener('click', function() {
        createElement('date', { dateValue: getTodayStr(), name: getDefaultName('date') });
        showNotification('Date added to PDF', false);
    });

    applyBtn.addEventListener('click', signPdf);
    resetBtn.addEventListener('click', resetTool);
    newFileBtn.addEventListener('click', resetTool);

    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!outputBytes) return;
        var blob = new Blob([outputBytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = downloadBtn.download;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    });

    // ==========================================
    // INIT
    // ==========================================
    function init() {
        setupDrawOnSigCanvas();
        renderElementsList();
        renderProperties();
        saveState();

        if (loadSession()) {
            applyBtn.disabled = elements.length === 0;
            renderElementsList();
            renderProperties();
        }
    }

    init();
});