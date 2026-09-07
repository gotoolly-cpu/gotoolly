document.addEventListener('DOMContentLoaded', function() {
    var $ = function(id) { return document.getElementById(id); };
    var fileInput = $('file-input');
    var dropZone = $('drop-zone');
    var fileBadge = $('file-status-text');
    var previewEmpty = $('preview-empty');
    var canvasStage = $('canvas-stage');
    var previewCanvas = $('preview-canvas');
    var elementsOverlay = $('elements-overlay');
    var zoomLabel = $('zoom-label');
    var applyBtn = $('apply-btn');
    var resetBtn = $('reset-btn');
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
    var imageInfoPanel = $('image-info-panel');
    var imageInfoContent = $('image-info-content');
    var toolBtns = document.querySelectorAll('.tool-btn');
    var canvasWrap = $('preview-canvas-wrap');

    var ctx = previewCanvas.getContext('2d');
    var tempCanvas = null;
    var tempCtx = null;

    var state = {
        image: null,
        imageFileName: '',
        imageFileSize: 0,
        imageWidth: 0,
        imageHeight: 0,
        zoom: 1,
        panX: 0,
        panY: 0,
        activeTool: 'select',
        elements: [],
        elementIdCounter: 0,
        selectedElementId: null,
        isDragging: false,
        isPanning: false,
        isResizing: false,
        dragStartX: 0,
        dragStartY: 0,
        dragMoved: false,
        resizeHandle: null,
        resizeStartW: 0,
        resizeStartH: 0,
        dragOrigX: 0,
        dragOrigY: 0,
        elementStartX: 0,
        elementStartY: 0,
        panStartX: 0,
        panStartY: 0,
        rafId: null,
        pendingRender: false,
        isCropping: false,
        cropRect: { x: 0, y: 0, w: 0, h: 0 },
        cropDragging: false,
        cropHandle: null,
        cropStartX: 0,
        cropStartY: 0,
        cropOrigRect: null,
        isDrawing: false,
        drawStartX: 0,
        drawStartY: 0,
        drawStartImgX: 0,
        drawStartImgY: 0,
        drawingElement: null,
        shapeType: 'rectangle',
        historyStack: [],
        historyIndex: -1,
        historyIdCounter: 0,
        originalImageData: null,
        isFreehand: false,
        freehandPoints: [],
        brushSize: 10,
        brushColor: '#000000',
        highlightOpacity: 0.4,
        pickedColor: '#000000',
        fillTolerance: 32,
        isRectTool: false,
        rectToolStartX: 0,
        rectToolStartY: 0,
        rectToolEndX: 0,
        rectToolEndY: 0,
        snapGuides: [],
        snapThreshold: 6,
        layerDragId: null,
        layerDragOverId: null,
        isEditingText: false,
        editingTextId: null,
    };

    function genId() { return 'el_' + (++state.elementIdCounter); }

    function getSelected() {
        var id = state.selectedElementId;
        if (!id) return null;
        for (var i = 0; i < state.elements.length; i++) {
            if (state.elements[i].id === id) return state.elements[i];
        }
        return null;
    }

    function hitTest(pos) {
        for (var i = state.elements.length - 1; i >= 0; i--) {
            var e = state.elements[i];
            if (e.hidden) continue;
            if (pos.x >= e.x && pos.x <= e.x + e.width && pos.y >= e.y && pos.y <= e.y + e.height) {
                return e;
            }
        }
        return null;
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

    function saveHistory(label, withImage) {
        if (state.historyIndex < state.historyStack.length - 1) {
            state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
        }
        var imageDataUrl = null;
        if (withImage && state.image) {
            var c = document.createElement('canvas');
            c.width = state.imageWidth;
            c.height = state.imageHeight;
            var cx = c.getContext('2d');
            cx.drawImage(state.image, 0, 0);
            imageDataUrl = c.toDataURL();
        }
        var entry = {
            id: 'hist_' + (++state.historyIdCounter),
            label: label || 'Edit',
            timestamp: Date.now(),
            elements: JSON.stringify(state.elements),
            imageWidth: state.imageWidth,
            imageHeight: state.imageHeight,
            imageDataUrl: imageDataUrl,
        };
        state.historyStack.push(entry);
        state.historyIndex = state.historyStack.length - 1;
        while (state.historyStack.length > 50) {
            state.historyStack.shift();
            state.historyIndex--;
        }
        updateHistoryUI();
    }

    function restoreHistory(index) {
        if (index < 0 || index >= state.historyStack.length || index === state.historyIndex) return;
        var entry = state.historyStack[index];
        state.elements = JSON.parse(entry.elements);
        state.selectedElementId = null;
        state.historyIndex = index;
        if (entry.imageDataUrl) {
            var img = new Image();
            img.onload = function() {
                state.image = img;
                state.imageWidth = entry.imageWidth;
                state.imageHeight = entry.imageHeight;
                zoomFit();
                updateUI();
                updateHistoryUI();
            };
            img.src = entry.imageDataUrl;
        } else {
            updateUI();
            updateHistoryUI();
        }
    }

    function undo() {
        if (state.historyIndex > 0) {
            restoreHistory(state.historyIndex - 1);
        }
    }

    function redo() {
        if (state.historyIndex < state.historyStack.length - 1) {
            restoreHistory(state.historyIndex + 1);
        }
    }

    function updateUI() {
        redraw();
        updateElementsList();
        updatePropsPanel();
        updateHistoryUI();
    }

    function updateHistoryUI() {
        var ub = $('undo-btn'), rb = $('redo-btn'), rtb = $('reset-original-btn');
        if (ub) { ub.disabled = state.historyIndex <= 0; ub.style.opacity = ub.disabled ? '0.4' : '1'; }
        if (rb) { rb.disabled = state.historyIndex >= state.historyStack.length - 1; rb.style.opacity = rb.disabled ? '0.4' : '1'; }
        if (rtb) { rtb.disabled = state.historyIndex <= 0; rtb.style.opacity = rtb.disabled ? '0.4' : '1'; }
        updateHistoryPanel();
    }

    function updateHistoryPanel() {
        var panel = $('history-list');
        var count = $('hist-count');
        if (!panel) return;
        if (count) count.textContent = '(' + state.historyStack.length + ')';
        if (state.historyStack.length === 0) {
            panel.innerHTML = '<div class="hist-empty">No history yet</div>';
            return;
        }
        var html = '';
        for (var i = state.historyStack.length - 1; i >= 0; i--) {
            var e = state.historyStack[i];
            var active = i === state.historyIndex ? ' hist-active' : '';
            var icon = '';
            if (i === 0) icon = '<span class="hist-icon">\uD83D\uDDBC</span>';
            else if (e.label.indexOf('Crop') === 0) icon = '<span class="hist-icon">\u2702</span>';
            else if (e.label.indexOf('Rotate') === 0) icon = '<span class="hist-icon">\u21BB</span>';
            else if (e.label.indexOf('Flip') === 0) icon = '<span class="hist-icon">\u2194</span>';
            else if (e.label.indexOf('Resize') === 0) icon = '<span class="hist-icon">\u2197</span>';
            else if (e.label.indexOf('Fill') === 0) icon = '<span class="hist-icon">\u2B1B</span>';
            else if (e.label.indexOf('Brush') === 0 || e.label.indexOf('Pencil') === 0 || e.label.indexOf('Draw') === 0) icon = '<span class="hist-icon">\u270F</span>';
            else if (e.label.indexOf('Eraser') === 0) icon = '<span class="hist-icon">\u2710</span>';
            else if (e.label.indexOf('Highlight') === 0) icon = '<span class="hist-icon">\uD83D\uDCA1</span>';
            else if (e.label.indexOf('Blur') === 0 || e.label.indexOf('Pixelate') === 0 || e.label.indexOf('Redact') === 0) icon = '<span class="hist-icon">\uD83C\uDF2D</span>';
            else if (e.label.indexOf('Add ') === 0) icon = '<span class="hist-icon">+</span>';
            else if (e.label.indexOf('Delete') === 0) icon = '<span class="hist-icon">\u2716</span>';
            else if (e.label.indexOf('Duplicate') === 0) icon = '<span class="hist-icon">\uD83D\uDCCB</span>';
            else if (e.label.indexOf('Move') === 0 || e.label.indexOf('Resize') === 0) icon = '<span class="hist-icon">\u2194</span>';
            else icon = '<span class="hist-icon">\u25CF</span>';
            html += '<div class="hist-item' + active + '" data-hist-idx="' + i + '">' + icon + '<span class="hist-label">' + e.label + '</span></div>';
        }
        panel.innerHTML = html;
        panel.querySelectorAll('.hist-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var idx = parseInt(this.dataset.histIdx);
                if (!isNaN(idx) && idx !== state.historyIndex) {
                    restoreHistory(idx);
                }
            });
        });
    }

    // ========== FILE LOADING ==========
    function handleFile(file) {
        if (!file || !file.type.match(/^image\/(png|jpeg|jpg|gif|webp|svg\+xml|bmp)$/)) {
            notify('Please select a valid image file (PNG, JPG, GIF, WebP, SVG, BMP)', true);
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            notify('File too large (max 50 MB)', true);
            return;
        }

        fileBadge.textContent = file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name;
        fileBadge.style.color = '#0f172a';
        state.imageFileName = file.name;
        state.imageFileSize = file.size;

        var reader = new FileReader();
        reader.onload = function(ev) {
            var img = new Image();
            img.onload = function() {
                state.image = img;
                state.imageWidth = img.naturalWidth;
                state.imageHeight = img.naturalHeight;
                state.elements = [];
                state.elementIdCounter = 0;
                state.selectedElementId = null;
                state.historyStack = [];
                state.historyIndex = -1;
                state.historyIdCounter = 0;
                state.originalImageData = ev.target.result;
                state.panX = 0;
                state.panY = 0;
                previewEmpty.style.display = 'none';
                canvasStage.style.display = 'inline-block';
                zoomFit();
                updateImageInfo();
                saveHistory('Original Image', true);
                updateUI();
                updateEditorState();
                notify('Image loaded: ' + file.name);
            };
            img.onerror = function() {
                notify('Failed to load image', true);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    function updateImageInfo() {
        if (!state.image) {
            if (imageInfoPanel) imageInfoPanel.style.display = 'none';
            return;
        }
        if (imageInfoPanel) imageInfoPanel.style.display = '';
        if (imageInfoContent) {
            imageInfoContent.innerHTML =
                '<div class="image-info-row"><span class="image-info-label">File</span><span class="image-info-value">' + state.imageFileName + '</span></div>' +
                '<div class="image-info-row"><span class="image-info-label">Size</span><span class="image-info-value">' + formatSize(state.imageFileSize) + '</span></div>' +
                '<div class="image-info-row"><span class="image-info-label">Dimensions</span><span class="image-info-value">' + state.imageWidth + ' x ' + state.imageHeight + ' px</span></div>' +
                '<div class="image-info-row"><span class="image-info-label">Zoom</span><span class="image-info-value" id="image-info-zoom">' + Math.round(state.zoom * 100) + '%</span></div>';
        }
    }

    // ========== CANVAS RENDERING ==========
    function redraw() {
        if (!state.image) return;
        var wrapW = canvasWrap ? canvasWrap.clientWidth : 800;
        var wrapH = canvasWrap ? canvasWrap.clientHeight : 600;
        var cw = Math.max(1, Math.round(state.imageWidth * state.zoom));
        var ch = Math.max(1, Math.round(state.imageHeight * state.zoom));
        previewCanvas.width = cw;
        previewCanvas.height = ch;
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(state.panX, state.panY);
        ctx.drawImage(state.image, 0, 0, cw, ch);
        for (var i = 0; i < state.elements.length; i++) {
            if (state.elements[i].hidden) continue;
            renderElement(ctx, state.elements[i]);
        }
        var sel = getSelected();
        if (sel) {
            drawSelectionBox(sel);
        }
        drawSnapGuides();
        ctx.restore();
        zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
        updateImageInfo();
    }

    function renderElement(context, el) {
        context.save();
        var x = el.x * state.zoom;
        var y = el.y * state.zoom;
        var w = el.width * state.zoom;
        var h = el.height * state.zoom;
        context.globalAlpha = el.opacity;
        context.globalCompositeOperation = el.blendMode || 'source-over';
        if (el.rotation) {
            var cx = x + w / 2;
            var cy = y + h / 2;
            context.translate(cx, cy);
            context.rotate(el.rotation * Math.PI / 180);
            context.translate(-cx, -cy);
        }
        if (el.type === 'rectangle') {
            var br = (el.borderRadius || 0) * state.zoom;
            if (br > 0) {
                context.beginPath();
                context.moveTo(x + br, y);
                context.lineTo(x + w - br, y);
                context.quadraticCurveTo(x + w, y, x + w, y + br);
                context.lineTo(x + w, y + h - br);
                context.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
                context.lineTo(x + br, y + h);
                context.quadraticCurveTo(x, y + h, x, y + h - br);
                context.lineTo(x, y + br);
                context.quadraticCurveTo(x, y, x + br, y);
                context.closePath();
                context.fillStyle = el.fill || '#3b82f6';
                context.fill();
                if (el.stroke && el.stroke !== 'transparent') {
                    context.strokeStyle = el.stroke;
                    context.lineWidth = (el.strokeWidth || 2) * state.zoom;
                    context.stroke();
                }
            } else {
                context.fillStyle = el.fill || '#3b82f6';
                context.fillRect(x, y, w, h);
                if (el.stroke && el.stroke !== 'transparent') {
                    context.strokeStyle = el.stroke;
                    context.lineWidth = (el.strokeWidth || 2) * state.zoom;
                    context.strokeRect(x, y, w, h);
                }
            }
        } else if (el.type === 'ellipse') {
            context.beginPath();
            var ecx = x + w / 2, ecy = y + h / 2, erx = Math.abs(w / 2), ery = Math.abs(h / 2);
            if (context.ellipse) {
                context.ellipse(ecx, ecy, erx, ery, 0, 0, Math.PI * 2);
            } else {
                var k = 0.5522847498, kx = erx * k, ky = ery * k;
                context.moveTo(ecx + erx, ecy);
                context.bezierCurveTo(ecx + erx, ecy - ky, ecx + kx, ecy - ery, ecx, ecy - ery);
                context.bezierCurveTo(ecx - kx, ecy - ery, ecx - erx, ecy - ky, ecx - erx, ecy);
                context.bezierCurveTo(ecx - erx, ecy + ky, ecx - kx, ecy + ery, ecx, ecy + ery);
                context.bezierCurveTo(ecx + kx, ecy + ery, ecx + erx, ecy + ky, ecx + erx, ecy);
                context.closePath();
            }
            context.fillStyle = el.fill || '#3b82f6';
            context.fill();
            if (el.stroke && el.stroke !== 'transparent') {
                context.strokeStyle = el.stroke;
                context.lineWidth = (el.strokeWidth || 2) * state.zoom;
                context.stroke();
            }
        } else if (el.type === 'line') {
            var x1 = el.x * state.zoom;
            var y1 = el.y * state.zoom;
            var x2 = (el.lineX2 !== undefined ? el.lineX2 : el.x + el.width) * state.zoom;
            var y2 = (el.lineY2 !== undefined ? el.lineY2 : el.y) * state.zoom;
            context.beginPath();
            context.moveTo(x1, y1);
            context.lineTo(x2, y2);
            context.strokeStyle = el.stroke || el.fontColor || '#1e293b';
            context.lineWidth = (el.strokeWidth || 3) * state.zoom;
            context.lineCap = 'round';
            context.stroke();
        } else if (el.type === 'arrow') {
            var ax1 = el.x * state.zoom;
            var ay1 = el.y * state.zoom;
            var ax2 = (el.lineX2 !== undefined ? el.lineX2 : el.x + el.width) * state.zoom;
            var ay2 = (el.lineY2 !== undefined ? el.lineY2 : el.y) * state.zoom;
            context.beginPath();
            context.moveTo(ax1, ay1);
            context.lineTo(ax2, ay2);
            context.strokeStyle = el.stroke || el.fontColor || '#1e293b';
            context.lineWidth = (el.strokeWidth || 3) * state.zoom;
            context.lineCap = 'round';
            context.stroke();
            var angle = Math.atan2(ay2 - ay1, ax2 - ax1);
            var headLen = 16 * state.zoom;
            context.beginPath();
            context.moveTo(ax2, ay2);
            context.lineTo(ax2 - headLen * Math.cos(angle - Math.PI / 6), ay2 - headLen * Math.sin(angle - Math.PI / 6));
            context.moveTo(ax2, ay2);
            context.lineTo(ax2 - headLen * Math.cos(angle + Math.PI / 6), ay2 - headLen * Math.sin(angle + Math.PI / 6));
            context.stroke();
        } else if (el.type === 'text') {
            var fs = (el.fontSize || 20) * state.zoom;
            var style = (el.italic ? 'italic ' : '') + (el.bold ? 'bold ' : '');
            context.font = style + fs + 'px ' + (el.fontFamily || 'Arial, sans-serif');
            context.fillStyle = el.fontColor || '#1e293b';
            context.textAlign = el.textAlign || 'left';
            context.textBaseline = 'top';
            var tx = x;
            if (el.textAlign === 'center') tx = x + w / 2;
            else if (el.textAlign === 'right') tx = x + w;
            var lines = (el.text || 'Text').split('\n');
            var lineH = fs * 1.3;
            for (var li = 0; li < lines.length; li++) {
                context.fillText(lines[li], tx, y + li * lineH);
                if (el.underline) {
                    var tw = context.measureText(lines[li]).width;
                    var ux = tx;
                    if (el.textAlign === 'center') ux = tx - tw / 2;
                    else if (el.textAlign === 'right') ux = tx - tw;
                    context.beginPath();
                    context.moveTo(ux, y + li * lineH + fs + 2);
                    context.lineTo(ux + tw, y + li * lineH + fs + 2);
                    context.strokeStyle = el.fontColor || '#1e293b';
                    context.lineWidth = Math.max(1, fs / 15);
                    context.stroke();
                }
            }
            if (state.selectedElementId === el.id && el.text === '') {
                context.fillStyle = 'rgba(148,163,184,0.5)';
                context.font = style + fs + 'px ' + (el.fontFamily || 'Arial, sans-serif');
                context.fillText('Type here...', tx, y);
            }
        } else {
            context.fillStyle = 'rgba(37,99,235,0.15)';
            context.strokeStyle = '#2563eb';
            context.lineWidth = 1 * state.zoom;
            context.setLineDash([4 * state.zoom, 4 * state.zoom]);
            context.fillRect(x, y, w, h);
            context.strokeRect(x, y, w, h);
            context.setLineDash([]);
        }
        context.restore();
    }

    function drawSelectionBox(el) {
        var z = state.zoom;
        var x = el.x * z;
        var y = el.y * z;
        var w = el.width * z;
        var h = el.height * z;
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#2563eb';
        var hs = 7;
        var handles = [
            [x, y], [x + w, y], [x, y + h], [x + w, y + h],
            [x + w / 2, y], [x + w / 2, y + h],
            [x, y + h / 2], [x + w, y + h / 2]
        ];
        for (var i = 0; i < handles.length; i++) {
            ctx.fillRect(handles[i][0] - hs / 2, handles[i][1] - hs / 2, hs, hs);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(handles[i][0] - hs / 2, handles[i][1] - hs / 2, hs, hs);
        }
        ctx.restore();
    }

    // ========== ZOOM ==========
    function setZoom(newZoom) {
        newZoom = Math.max(0.05, Math.min(20, newZoom));
        if (!state.image) { state.zoom = newZoom; zoomLabel.textContent = Math.round(newZoom * 100) + '%'; return; }
        var oldZoom = state.zoom;
        state.zoom = newZoom;
        var cw = canvasWrap ? canvasWrap.clientWidth / 2 : 400;
        var ch = canvasWrap ? canvasWrap.clientHeight / 2 : 300;
        state.panX = cw - (cw - state.panX) * (newZoom / oldZoom);
        state.panY = ch - (ch - state.panY) * (newZoom / oldZoom);
        redraw();
    }

    function zoomIn() { setZoom(state.zoom * 1.25); }

    function zoomOut() { setZoom(state.zoom / 1.25); }

    function zoomFit() {
        if (!state.image) return;
        var wrapW = canvasWrap ? canvasWrap.clientWidth - 48 : 800;
        var wrapH = canvasWrap ? canvasWrap.clientHeight - 48 : 600;
        if (wrapW < 100) wrapW = 800;
        if (wrapH < 100) wrapH = 600;
        var scaleX = wrapW / state.imageWidth;
        var scaleY = wrapH / state.imageHeight;
        state.zoom = Math.min(scaleX, scaleY, 1);
        state.panX = 0;
        state.panY = 0;
        zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
        if (state.image) redraw();
    }

    // ========== CROP TOOL ==========
    function startCrop() {
        if (!state.image) return;
        state.isCropping = true;
        state.cropRect = { x: 0, y: 0, w: state.imageWidth, h: state.imageHeight };
        setActiveTool('crop');
        var cropBar = $('crop-bar');
        var exportBar = $('export-bar');
        if (cropBar) cropBar.style.display = 'flex';
        if (exportBar) exportBar.style.display = 'none';
        updatePropsPanel();
        redraw();
        drawCropOverlay();
    }

    function cancelCrop() {
        state.isCropping = false;
        state.cropDragging = false;
        state.cropHandle = null;
        elementsOverlay.innerHTML = '';
        var cropBar = $('crop-bar');
        var exportBar = $('export-bar');
        if (cropBar) cropBar.style.display = 'none';
        if (exportBar) exportBar.style.display = 'flex';
        redraw();
    }

    function applyCrop() {
        if (!state.isCropping || !state.image) return;
        var r = state.cropRect;
        if (r.w < 1 || r.h < 1) { notify('Invalid crop area', true); return; }
        var oc = document.createElement('canvas');
        oc.width = r.w;
        oc.height = r.h;
        var octx = oc.getContext('2d');
        octx.drawImage(state.image, -r.x, -r.y);
        var newImg = new Image();
        newImg.onload = function() {
            state.image = newImg;
            state.imageWidth = r.w;
            state.imageHeight = r.h;
            state.isCropping = false;
            state.cropDragging = false;
            state.cropHandle = null;
            elementsOverlay.innerHTML = '';
            var cropBar = $('crop-bar');
            var exportBar = $('export-bar');
            if (cropBar) cropBar.style.display = 'none';
            if (exportBar) exportBar.style.display = 'flex';
            zoomFit();
            updateImageInfo();
            saveHistory('Crop', true);
            redraw();
            notify('Image cropped to ' + r.w + ' x ' + r.h);
        };
        newImg.src = oc.toDataURL();
    }

    function drawCropOverlay() {
        if (!state.isCropping) return;
        elementsOverlay.innerHTML = '';
        var z = state.zoom;
        var r = state.cropRect;
        var cx = r.x * z + state.panX, cy = r.y * z + state.panY, cw = r.w * z, ch = r.h * z;
        var iw = state.imageWidth * z, ih = state.imageHeight * z;

        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;top:' + state.panY + 'px;left:' + state.panX + 'px;width:' + iw + 'px;height:' + ih + 'px;pointer-events:none;';
        var darkStyle = 'position:absolute;background:rgba(0,0,0,0.5);pointer-events:none;';
        overlay.innerHTML =
            '<div style="' + darkStyle + 'top:0;left:0;width:' + iw + 'px;height:' + cy + 'px"></div>' +
            '<div style="' + darkStyle + 'top:' + cy + 'px;left:0;width:' + cx + 'px;height:' + ch + 'px"></div>' +
            '<div style="' + darkStyle + 'top:' + cy + 'px;left:' + (cx + cw) + 'px;width:' + (iw - cx - cw) + 'px;height:' + ch + 'px"></div>' +
            '<div style="' + darkStyle + 'top:' + (cy + ch) + 'px;left:0;width:' + iw + 'px;height:' + (ih - cy - ch) + 'px"></div>';
        elementsOverlay.appendChild(overlay);

        var box = document.createElement('div');
        box.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + cy + 'px;width:' + cw + 'px;height:' + ch + 'px;border:2px dashed #fff;pointer-events:auto;cursor:crosshair;box-sizing:border-box;z-index:10;';
        box.className = 'crop-box';
        elementsOverlay.appendChild(box);

        var handles = [
            { name: 'nw', x: cx, y: cy }, { name: 'ne', x: cx + cw, y: cy },
            { name: 'sw', x: cx, y: cy + ch }, { name: 'se', x: cx + cw, y: cy + ch },
            { name: 'n', x: cx + cw / 2, y: cy }, { name: 's', x: cx + cw / 2, y: cy + ch },
            { name: 'w', x: cx, y: cy + ch / 2 }, { name: 'e', x: cx + cw, y: cy + ch / 2 }
        ];
        for (var i = 0; i < handles.length; i++) {
            var hd = document.createElement('div');
            hd.className = 'resize-handle';
            hd.dataset.handle = handles[i].name;
            hd.style.cssText = 'position:absolute;width:10px;height:10px;background:#fff;border:2px solid #2563eb;border-radius:2px;pointer-events:auto;cursor:' + getHandleCursor(handles[i].name) + ';left:' + (handles[i].x - 5) + 'px;top:' + (handles[i].y - 5) + 'px;z-index:11;';
            elementsOverlay.appendChild(hd);
        }

        var info = document.createElement('div');
        info.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + (cy - 22) + 'px;background:#0f172a;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;font-family:JetBrains Mono,monospace;pointer-events:none;white-space:nowrap;z-index:12;';
        info.textContent = Math.round(r.w) + ' x ' + Math.round(r.h);
        elementsOverlay.appendChild(info);
    }

    function getCropHandleAt(pos) {
        var z = state.zoom;
        var r = state.cropRect;
        var hs = 12 / z;
        var pts = {
            'nw': { x: r.x, y: r.y }, 'ne': { x: r.x + r.w, y: r.y },
            'sw': { x: r.x, y: r.y + r.h }, 'se': { x: r.x + r.w, y: r.y + r.h },
            'n': { x: r.x + r.w / 2, y: r.y }, 's': { x: r.x + r.w / 2, y: r.y + r.h },
            'w': { x: r.x, y: r.y + r.h / 2 }, 'e': { x: r.x + r.w, y: r.y + r.h / 2 }
        };
        for (var k in pts) {
            if (Math.abs(pos.x - pts[k].x) < hs && Math.abs(pos.y - pts[k].y) < hs) return k;
        }
        return null;
    }

    function resizeCropRect(handle, dx, dy) {
        var r = state.cropRect;
        var o = state.cropOrigRect;
        var nw = o.w, nh = o.h, nx = o.x, ny = o.y;
        if (handle.indexOf('e') !== -1) nw = Math.max(10, o.w + dx);
        if (handle.indexOf('w') !== -1) { nw = Math.max(10, o.w - dx); nx = o.x + o.w - nw; }
        if (handle.indexOf('s') !== -1) nh = Math.max(10, o.h + dy);
        if (handle.indexOf('n') !== -1) { nh = Math.max(10, o.h - dy); ny = o.y + o.h - nh; }
        nx = Math.max(0, Math.min(state.imageWidth - 10, nx));
        ny = Math.max(0, Math.min(state.imageHeight - 10, ny));
        nw = Math.min(nw, state.imageWidth - nx);
        nh = Math.min(nh, state.imageHeight - ny);
        state.cropRect = { x: nx, y: ny, w: nw, h: nh };
    }

    // ========== ROTATE ==========
    function rotateImage(degrees) {
        if (!state.image) return;
        var rad = degrees * Math.PI / 180;
        var absW = Math.abs(Math.round(state.imageWidth * Math.cos(rad) + state.imageHeight * Math.sin(rad)));
        var absH = Math.abs(Math.round(state.imageWidth * Math.sin(rad) + state.imageHeight * Math.cos(rad)));
        var oc = document.createElement('canvas');
        oc.width = absW;
        oc.height = absH;
        var octx = oc.getContext('2d');
        octx.translate(absW / 2, absH / 2);
        octx.rotate(rad);
        octx.drawImage(state.image, -state.imageWidth / 2, -state.imageHeight / 2);
        var newImg = new Image();
        newImg.onload = function() {
            state.image = newImg;
            state.imageWidth = absW;
            state.imageHeight = absH;
            zoomFit();
            updateImageInfo();
            saveHistory('Rotate ' + degrees + '°', true);
            redraw();
            notify('Rotated ' + degrees + '°');
        };
        newImg.src = oc.toDataURL();
    }

    // ========== FLIP ==========
    function flipImage(horizontal) {
        if (!state.image) return;
        var oc = document.createElement('canvas');
        oc.width = state.imageWidth;
        oc.height = state.imageHeight;
        var octx = oc.getContext('2d');
        if (horizontal) {
            octx.translate(state.imageWidth, 0);
            octx.scale(-1, 1);
        } else {
            octx.translate(0, state.imageHeight);
            octx.scale(1, -1);
        }
        octx.drawImage(state.image, 0, 0);
        var newImg = new Image();
        newImg.onload = function() {
            state.image = newImg;
            saveHistory('Flip ' + (horizontal ? 'Horizontal' : 'Vertical'), true);
            redraw();
            notify('Flipped ' + (horizontal ? 'horizontally' : 'vertically'));
        };
        newImg.src = oc.toDataURL();
    }

    // ========== RESIZE CANVAS ==========
    function showResizeDialog() {
        if (!state.image) return;
        var existing = document.querySelector('.resize-dialog-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.className = 'resize-dialog-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        var dialog = document.createElement('div');
        dialog.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:320px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,.15);';
        dialog.innerHTML =
            '<h3 style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0f172a">Resize Canvas</h3>' +
            '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">' +
            '<label style="font-size:12px;color:#64748b;width:60px">Width</label>' +
            '<input type="number" id="resize-w" value="' + state.imageWidth + '" min="1" max="10000" style="flex:1;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:JetBrains Mono,monospace">' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">' +
            '<label style="font-size:12px;color:#64748b;width:60px">Height</label>' +
            '<input type="number" id="resize-h" value="' + state.imageHeight + '" min="1" max="10000" style="flex:1;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:JetBrains Mono,monospace">' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">' +
            '<label style="font-size:12px;color:#64748b;width:60px">Background</label>' +
            '<input type="color" id="resize-bg" value="#ffffff" style="width:32px;height:28px;padding:0;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer">' +
            '<span style="font-size:11px;color:#94a3b8">(for padding area)</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end">' +
            '<button id="resize-cancel" style="padding:7px 14px;background:#fff;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer">Cancel</button>' +
            '<button id="resize-apply" style="padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">Apply</button>' +
            '</div>';
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        $('resize-cancel').addEventListener('click', function() { overlay.remove(); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
        $('resize-apply').addEventListener('click', function() {
            var nw = parseInt($('resize-w').value) || state.imageWidth;
            var nh = parseInt($('resize-h').value) || state.imageHeight;
            var bg = $('resize-bg').value || '#ffffff';
            if (nw < 1 || nh < 1 || nw > 10000 || nh > 10000) { notify('Invalid dimensions', true); return; }
            var oc = document.createElement('canvas');
            oc.width = nw;
            oc.height = nh;
            var octx = oc.getContext('2d');
            octx.fillStyle = bg;
            octx.fillRect(0, 0, nw, nh);
            octx.drawImage(state.image, 0, 0);
            var newImg = new Image();
            newImg.onload = function() {
                state.image = newImg;
                state.imageWidth = nw;
                state.imageHeight = nh;
                zoomFit();
                updateImageInfo();
                saveHistory('Resize to ' + nw + ' x ' + nh, true);
                redraw();
                overlay.remove();
                notify('Canvas resized to ' + nw + ' x ' + nh);
            };
            newImg.src = oc.toDataURL();
        });
    }

    // ========== TEMP CANVAS ==========
    function ensureTempCanvas() {
        if (!tempCanvas) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.id = 'temp-draw-canvas';
            tempCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5;';
            canvasStage.appendChild(tempCanvas);
            tempCtx = tempCanvas.getContext('2d');
        }
        tempCanvas.width = previewCanvas.width;
        tempCanvas.height = previewCanvas.height;
        tempCanvas.style.width = previewCanvas.width + 'px';
        tempCanvas.style.height = previewCanvas.height + 'px';
        tempCanvas.style.display = '';
    }

    function removeTempCanvas() {
        if (tempCtx) tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        if (tempCanvas) tempCanvas.style.display = 'none';
    }

    function replaceImage(canvas, historyLabel) {
        var label = historyLabel || state.activeTool || 'Edit';
        var newImg = new Image();
        newImg.onload = function() {
            state.image = newImg;
            state.imageWidth = canvas.width;
            state.imageHeight = canvas.height;
            saveHistory(label, true);
            redraw();
            updateUI();
            notify('Applied ' + (historyLabel || state.activeTool));
        };
        newImg.src = canvas.toDataURL();
    }

    // ========== INLINE TEXT EDITOR ==========
    function showTextEditor(el) {
        commitTextEditor();
        state.isEditingText = true;
        state.editingTextId = el.id;
        var z = state.zoom;
        var sx = el.x * z + state.panX;
        var sy = el.y * z + state.panY;
        var sw = Math.max(80, el.width * z);
        var sh = Math.max(30, el.height * z);
        var fs = (el.fontSize || 20) * z;
        var style = (el.italic ? 'italic ' : '') + (el.bold ? 'bold ' : '');
        var ta = document.createElement('textarea');
        ta.id = 'inline-text-editor';
        ta.value = el.text || '';
        ta.style.cssText = 'position:absolute;z-index:200;border:2px solid #2563eb;border-radius:4px;background:rgba(255,255,255,0.95);color:' +
            (el.fontColor || '#1e293b') + ';font:' + style + fs + 'px ' + (el.fontFamily || 'Arial, sans-serif') +
            ';text-align:' + (el.textAlign || 'left') +
            ';padding:4px 6px;outline:none;resize:both;overflow:hidden;line-height:1.3;min-width:80px;min-height:30px;box-shadow:0 2px 12px rgba(0,0,0,.15);' +
            'left:' + sx + 'px;top:' + sy + 'px;width:' + sw + 'px;height:' + sh + 'px;';
        canvasStage.appendChild(ta);
        ta.focus();
        ta.select();
        ta.addEventListener('blur', function() {
            setTimeout(function() { commitTextEditor(); }, 100);
        });
        ta.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                commitTextEditor();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitTextEditor();
            }
            e.stopPropagation();
        });
        ta.addEventListener('input', function() {
            autoResizeTextElement(el, this.value);
            var sw2 = Math.max(80, el.width * z);
            var sh2 = Math.max(30, el.height * z);
            ta.style.width = sw2 + 'px';
            ta.style.height = sh2 + 'px';
        });
    }

    function commitTextEditor() {
        var ta = document.getElementById('inline-text-editor');
        if (!ta) return;
        var el = null;
        for (var i = 0; i < state.elements.length; i++) {
            if (state.elements[i].id === state.editingTextId) { el = state.elements[i]; break; }
        }
        if (el) {
            var newText = ta.value;
            if (newText !== el.text) {
                el.text = newText;
                autoResizeTextElement(el, newText);
                saveHistory('Edit Text', false);
            }
        }
        ta.remove();
        state.isEditingText = false;
        state.editingTextId = null;
        updateUI();
        if (el) drawSelectionOverlay(el);
    }

    function autoResizeTextElement(el, text) {
        if (!text) return;
        var c = document.createElement('canvas');
        var cx = c.getContext('2d');
        var fs = el.fontSize || 20;
        var style = (el.italic ? 'italic ' : '') + (el.bold ? 'bold ' : '');
        cx.font = style + fs + 'px ' + (el.fontFamily || 'Arial, sans-serif');
        var lines = text.split('\n');
        var maxW = 0;
        for (var i = 0; i < lines.length; i++) {
            var w = cx.measureText(lines[i]).width;
            if (w > maxW) maxW = w;
        }
        el.width = Math.max(60, Math.ceil(maxW) + 20);
        el.height = Math.max(30, Math.ceil(lines.length * fs * 1.3) + 10);
    }

    // ========== FREEHAND TOOLS (Brush / Pencil / Eraser / Highlight) ==========
    function startFreehand(pos) {
        state.isFreehand = true;
        state.freehandPoints = [{ x: pos.x, y: pos.y }];
        ensureTempCanvas();
    }

    function continueFreehand(pos) {
        if (!state.isFreehand) return;
        state.freehandPoints.push({ x: pos.x, y: pos.y });
        drawFreehandPreview();
    }

    function drawFreehandPreview() {
        if (!tempCtx || state.freehandPoints.length < 2) return;
        var z = state.zoom;
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.save();
        var pts = state.freehandPoints;
        var size = state.brushSize * z;
        if (state.activeTool === 'eraser') {
            tempCtx.globalCompositeOperation = 'destination-out';
            tempCtx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (state.activeTool === 'highlight') {
            tempCtx.globalAlpha = state.highlightOpacity;
            tempCtx.strokeStyle = state.brushColor;
        } else {
            tempCtx.strokeStyle = state.brushColor;
        }
        tempCtx.lineWidth = size;
        tempCtx.lineCap = 'round';
        tempCtx.lineJoin = 'round';
        if (state.activeTool === 'pencil') {
            tempCtx.imageSmoothingEnabled = false;
            tempCtx.lineWidth = Math.max(1, Math.round(size));
        }
        tempCtx.beginPath();
        tempCtx.moveTo(pts[0].x * z, pts[0].y * z);
        for (var i = 1; i < pts.length; i++) {
            tempCtx.lineTo(pts[i].x * z, pts[i].y * z);
        }
        tempCtx.stroke();
        tempCtx.restore();
    }

    function commitFreehand() {
        if (!state.freehandPoints || state.freehandPoints.length < 2) {
            state.isFreehand = false;
            state.freehandPoints = [];
            removeTempCanvas();
            return;
        }
        var oc = document.createElement('canvas');
        oc.width = state.imageWidth;
        oc.height = state.imageHeight;
        var octx = oc.getContext('2d');
        octx.drawImage(state.image, 0, 0);
        var pts = state.freehandPoints;
        var size = state.brushSize;
        if (state.activeTool === 'eraser') {
            octx.globalCompositeOperation = 'destination-out';
            octx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (state.activeTool === 'highlight') {
            octx.globalAlpha = state.highlightOpacity;
            octx.strokeStyle = state.brushColor;
        } else {
            octx.strokeStyle = state.brushColor;
        }
        octx.lineWidth = size;
        octx.lineCap = 'round';
        octx.lineJoin = 'round';
        if (state.activeTool === 'pencil') {
            octx.imageSmoothingEnabled = false;
            octx.lineWidth = Math.max(1, Math.round(size));
        }
        octx.beginPath();
        octx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) {
            octx.lineTo(pts[i].x, pts[i].y);
        }
        octx.stroke();
        var fhLabel = state.activeTool === 'eraser' ? 'Eraser' : (state.activeTool === 'highlight' ? 'Highlight' : (state.activeTool === 'pencil' ? 'Pencil' : 'Brush'));
        var newImg = new Image();
        newImg.onload = function() {
            state.image = newImg;
            state.isFreehand = false;
            state.freehandPoints = [];
            removeTempCanvas();
            saveHistory(fhLabel, true);
            redraw();
            notify('Applied ' + state.activeTool);
        };
        newImg.src = oc.toDataURL();
    }

    // ========== RECT-BASED TOOLS (Blur / Pixelate / Redact) ==========
    function startRectTool(pos) {
        state.isRectTool = true;
        state.rectToolStartX = pos.x;
        state.rectToolStartY = pos.y;
        state.rectToolEndX = pos.x;
        state.rectToolEndY = pos.y;
        ensureTempCanvas();
    }

    function continueRectTool(pos) {
        if (!state.isRectTool) return;
        state.rectToolEndX = pos.x;
        state.rectToolEndY = pos.y;
        drawRectToolPreview();
    }

    function drawRectToolPreview() {
        if (!tempCtx) return;
        var z = state.zoom;
        var x1 = state.rectToolStartX * z;
        var y1 = state.rectToolStartY * z;
        var x2 = state.rectToolEndX * z;
        var y2 = state.rectToolEndY * z;
        var rx = Math.min(x1, x2), ry = Math.min(y1, y2);
        var rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.save();
        tempCtx.strokeStyle = '#2563eb';
        tempCtx.lineWidth = 2;
        tempCtx.setLineDash([6, 4]);
        tempCtx.strokeRect(rx, ry, rw, rh);
        tempCtx.fillStyle = 'rgba(37,99,235,0.08)';
        tempCtx.fillRect(rx, ry, rw, rh);
        var label = Math.round(Math.abs(state.rectToolEndX - state.rectToolStartX)) + ' x ' + Math.round(Math.abs(state.rectToolEndY - state.rectToolStartY));
        tempCtx.fillStyle = '#0f172a';
        tempCtx.font = '11px JetBrains Mono, monospace';
        tempCtx.fillText(label, rx + 4, ry - 6);
        tempCtx.restore();
    }

    function commitRectTool() {
        var x1 = Math.min(state.rectToolStartX, state.rectToolEndX);
        var y1 = Math.min(state.rectToolStartY, state.rectToolEndY);
        var x2 = Math.max(state.rectToolStartX, state.rectToolEndX);
        var y2 = Math.max(state.rectToolStartY, state.rectToolEndY);
        var rw = x2 - x1, rh = y2 - y1;
        state.isRectTool = false;
        removeTempCanvas();
        if (rw < 3 || rh < 3) return;
        x1 = Math.max(0, Math.round(x1));
        y1 = Math.max(0, Math.round(y1));
        rw = Math.min(Math.round(rw), state.imageWidth - x1);
        rh = Math.min(Math.round(rh), state.imageHeight - y1);
        if (rw < 3 || rh < 3) return;
        if (state.activeTool === 'redact') {
            var oc = document.createElement('canvas');
            oc.width = state.imageWidth;
            oc.height = state.imageHeight;
            var octx = oc.getContext('2d');
            octx.drawImage(state.image, 0, 0);
            octx.fillStyle = '#000000';
            octx.fillRect(x1, y1, rw, rh);
            replaceImage(oc, 'Redact');
        } else if (state.activeTool === 'pixelate') {
            pixelateRegion(x1, y1, rw, rh);
        } else if (state.activeTool === 'blur') {
            blurRegion(x1, y1, rw, rh);
        }
    }

    function pixelateRegion(x, y, w, h) {
        var blockSize = Math.max(4, Math.round(Math.min(w, h) / 12));
        var oc = document.createElement('canvas');
        oc.width = state.imageWidth;
        oc.height = state.imageHeight;
        var octx = oc.getContext('2d');
        octx.drawImage(state.image, 0, 0);
        var imgData = octx.getImageData(x, y, w, h);
        var data = imgData.data;
        for (var by = 0; by < h; by += blockSize) {
            for (var bx = 0; bx < w; bx += blockSize) {
                var r = 0, g = 0, b = 0, count = 0;
                for (var dy = 0; dy < blockSize && by + dy < h; dy++) {
                    for (var dx = 0; dx < blockSize && bx + dx < w; dx++) {
                        var idx = ((by + dy) * w + (bx + dx)) * 4;
                        r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
                    }
                }
                r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
                for (var dy = 0; dy < blockSize && by + dy < h; dy++) {
                    for (var dx = 0; dx < blockSize && bx + dx < w; dx++) {
                        var idx = ((by + dy) * w + (bx + dx)) * 4;
                        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
                    }
                }
            }
        }
        octx.putImageData(imgData, x, y);
        replaceImage(oc, 'Pixelate');
    }

    function blurRegion(x, y, w, h) {
        var passes = 3;
        var radius = Math.max(3, Math.round(Math.min(w, h) / 20));
        var oc = document.createElement('canvas');
        oc.width = state.imageWidth;
        oc.height = state.imageHeight;
        var octx = oc.getContext('2d');
        octx.drawImage(state.image, 0, 0);
        for (var p = 0; p < passes; p++) {
            var imgData = octx.getImageData(x, y, w, h);
            var data = imgData.data;
            var tmp = new Uint8ClampedArray(data.length);
            var len = 2 * radius + 1;
            for (var py = 0; py < h; py++) {
                var rSum = 0, gSum = 0, bSum = 0, count = 0;
                for (var dx = -radius; dx <= radius; dx++) {
                    var nx = Math.min(w - 1, Math.max(0, dx));
                    var idx = (py * w + nx) * 4;
                    rSum += data[idx]; gSum += data[idx + 1]; bSum += data[idx + 2]; count++;
                }
                for (var px = 0; px < w; px++) {
                    var ti = (py * w + px) * 4;
                    tmp[ti] = rSum / count; tmp[ti + 1] = gSum / count; tmp[ti + 2] = bSum / count; tmp[ti + 3] = data[ti + 3];
                    var removeX = Math.max(0, px - radius);
                    var addX = Math.min(w - 1, px + radius + 1);
                    var ri = (py * w + removeX) * 4;
                    var ai = (py * w + addX) * 4;
                    rSum += data[ai] - data[ri]; gSum += data[ai + 1] - data[ri + 1]; bSum += data[ai + 2] - data[ri + 2];
                }
            }
            for (var i = 0; i < tmp.length; i++) data[i] = tmp[i];
            var tmp2 = new Uint8ClampedArray(data.length);
            for (var px2 = 0; px2 < w; px2++) {
                var rSum2 = 0, gSum2 = 0, bSum2 = 0, count2 = 0;
                for (var dy = -radius; dy <= radius; dy++) {
                    var ny = Math.min(h - 1, Math.max(0, dy));
                    var idx2 = (ny * w + px2) * 4;
                    rSum2 += data[idx2]; gSum2 += data[idx2 + 1]; bSum2 += data[idx2 + 2]; count2++;
                }
                for (var py2 = 0; py2 < h; py2++) {
                    var ti2 = (py2 * w + px2) * 4;
                    tmp2[ti2] = rSum2 / count2; tmp2[ti2 + 1] = gSum2 / count2; tmp2[ti2 + 2] = bSum2 / count2; tmp2[ti2 + 3] = data[ti2 + 3];
                    var removeY = Math.max(0, py2 - radius);
                    var addY = Math.min(h - 1, py2 + radius + 1);
                    var ri2 = (removeY * w + px2) * 4;
                    var ai2 = (addY * w + px2) * 4;
                    rSum2 += data[ai2] - data[ri2]; gSum2 += data[ai2 + 1] - data[ri2 + 1]; bSum2 += data[ai2 + 2] - data[ri2 + 2];
                }
            }
            for (var j = 0; j < tmp2.length; j++) data[j] = tmp2[j];
            octx.putImageData(imgData, x, y);
        }
        replaceImage(oc, 'Blur');
    }

    // ========== COLOR PICKER ==========
    function pickColor(pos) {
        try {
            var px = Math.round(pos.x);
            var py = Math.round(pos.y);
            if (isNaN(px) || isNaN(py)) { notify('Invalid coordinates', true); return; }
            if (px < 0 || px >= state.imageWidth || py < 0 || py >= state.imageHeight) return;
            if (!state.image) { notify('No image loaded', true); return; }
            var oc = document.createElement('canvas');
            oc.width = state.imageWidth;
            oc.height = state.imageHeight;
            var octx = oc.getContext('2d');
            octx.drawImage(state.image, 0, 0);
            var pixel = octx.getImageData(px, py, 1, 1).data;
            var hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
            state.brushColor = hex;
            state.pickedColor = hex;
            notify('Color picked: ' + hex);
            var colorInp = propsContent.querySelector('[data-prop="brushColor"]');
            if (colorInp) colorInp.value = hex;
            setActiveTool('select');
        } catch (err) {
            notify('Picker error: ' + err.message, true);
            console.error('pickColor error:', err);
        }
    }

    // ========== FLOOD FILL ==========
    function floodFill(pos) {
        try {
            var sx = Math.round(pos.x);
            var sy = Math.round(pos.y);
            if (isNaN(sx) || isNaN(sy)) { notify('Invalid coordinates', true); return; }
            if (sx < 0 || sx >= state.imageWidth || sy < 0 || sy >= state.imageHeight) return;
            if (!state.image) { notify('No image loaded', true); return; }
            var oc = document.createElement('canvas');
            oc.width = state.imageWidth;
            oc.height = state.imageHeight;
            var octx = oc.getContext('2d');
            octx.drawImage(state.image, 0, 0);
            var imgData = octx.getImageData(0, 0, state.imageWidth, state.imageHeight);
            var data = imgData.data;
            var w = state.imageWidth, h = state.imageHeight;
            var startIdx = (sy * w + sx) * 4;
            var startR = data[startIdx], startG = data[startIdx + 1], startB = data[startIdx + 2], startA = data[startIdx + 3];
            var tmpC = document.createElement('div');
            tmpC.style.color = state.brushColor;
            document.body.appendChild(tmpC);
            var rgbStr = getComputedStyle(tmpC).color;
            document.body.removeChild(tmpC);
            var m = rgbStr.match(/\d+/g);
            if (!m || m.length < 3) { notify('Fill error: invalid color', true); return; }
            var fillR = parseInt(m[0]), fillG = parseInt(m[1]), fillB = parseInt(m[2]);
        if (startR === fillR && startG === fillG && startB === fillB && startA === 255) return;
        var tol = state.fillTolerance;
        var visited = new Uint8Array(w * h);
        var stack = [[sx, sy]];
        while (stack.length > 0) {
            var c = stack.pop();
            var cx = c[0], cy = c[1];
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
            var vidx = cy * w + cx;
            if (visited[vidx]) continue;
            var didx = vidx * 4;
            if (Math.abs(data[didx] - startR) > tol || Math.abs(data[didx + 1] - startG) > tol ||
                Math.abs(data[didx + 2] - startB) > tol || Math.abs(data[didx + 3] - startA) > tol) continue;
            visited[vidx] = 1;
            data[didx] = fillR; data[didx + 1] = fillG; data[didx + 2] = fillB; data[didx + 3] = 255;
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        octx.putImageData(imgData, 0, 0);
        replaceImage(oc, 'Fill');
        } catch (err) {
            notify('Fill error: ' + err.message, true);
            console.error('floodFill error:', err);
        }
    }

    // ========== SELECTION ==========
    function clearSelection() {
        state.selectedElementId = null;
        elementsOverlay.innerHTML = '';
        updatePropsPanel();
        updateElementsList();
        redraw();
    }

    function selectElement(el) {
        state.selectedElementId = el.id;
        drawSelectionOverlay(el);
        updatePropsPanel();
        updateElementsList();
        redraw();
    }

    function drawSelectionOverlay(el) {
        elementsOverlay.innerHTML = '';
        var z = state.zoom;
        var x = el.x * z + state.panX;
        var y = el.y * z + state.panY;
        var w = el.width * z;
        var h = el.height * z;

        var box = document.createElement('div');
        box.className = 'selection-box';
        box.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;border:2px solid #2563eb;pointer-events:none;box-sizing:border-box;';
        elementsOverlay.appendChild(box);

        var handles = [
            { name: 'nw', cx: x, cy: y },
            { name: 'ne', cx: x + w, cy: y },
            { name: 'sw', cx: x, cy: y + h },
            { name: 'se', cx: x + w, cy: y + h },
            { name: 'n', cx: x + w / 2, cy: y },
            { name: 's', cx: x + w / 2, cy: y + h },
            { name: 'w', cx: x, cy: y + h / 2 },
            { name: 'e', cx: x + w, cy: y + h / 2 }
        ];
        for (var i = 0; i < handles.length; i++) {
            var hd = document.createElement('div');
            hd.className = 'resize-handle handle-' + handles[i].name;
            hd.dataset.handle = handles[i].name;
            hd.style.cssText = 'position:absolute;width:8px;height:8px;background:#2563eb;border:1px solid #fff;box-sizing:border-box;pointer-events:auto;cursor:' + getHandleCursor(handles[i].name) + ';left:' + (handles[i].cx - 4) + 'px;top:' + (handles[i].cy - 4) + 'px;z-index:100;';
            elementsOverlay.appendChild(hd);
        }
    }

    function getHandleCursor(name) {
        var map = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize', n: 'n-resize', s: 's-resize', w: 'w-resize', e: 'e-resize' };
        return map[name] || 'pointer';
    }

    function updateSelectionOverlay() {
        var el = getSelected();
        if (el) drawSelectionOverlay(el);
    }

    // ========== ELEMENTS ==========
    function createElement(type, x, y, opts) {
        opts = opts || {};
        if (type === 'rounded-rect') {
            opts.borderRadius = opts.borderRadius || 12;
            type = 'rectangle';
        }
        var el = {
            id: genId(),
            type: type,
            x: x || 50,
            y: y || 50,
            width: opts.width || 120,
            height: opts.height || 60,
            rotation: 0,
            locked: false,
            hidden: false,
            opacity: 1,
            zIndex: state.elements.length,
            fill: opts.fill || '#3b82f6',
            stroke: opts.stroke || 'transparent',
            strokeWidth: opts.strokeWidth || 2,
            text: opts.text || '',
            fontSize: opts.fontSize || 20,
            fontColor: opts.fontColor || '#1e293b',
            fontFamily: opts.fontFamily || 'Arial, sans-serif',
            bold: opts.bold || false,
            italic: opts.italic || false,
            underline: opts.underline || false,
            textAlign: opts.textAlign || 'left',
            borderRadius: opts.borderRadius || 0,
            lineX2: opts.lineX2 || (x + 120),
            lineY2: opts.lineY2 || y,
            blendMode: opts.blendMode || 'source-over',
            name: opts.name || type.charAt(0).toUpperCase() + type.slice(1),
        };
        el.zIndex = state.elements.length;
        state.elements.push(el);
        state.selectedElementId = el.id;
        saveHistory('Add ' + el.type, false);
        updateUI();
        drawSelectionOverlay(el);
        return el;
    }

    function deleteSelected() {
        var el = getSelected();
        if (!el) return;
        var label = 'Delete ';
        var idx = -1;
        for (var i = 0; i < state.elements.length; i++) {
            if (state.elements[i].id === el.id) { idx = i; break; }
        }
        if (idx !== -1) { label += state.elements[idx].type; state.elements.splice(idx, 1); }
        state.selectedElementId = null;
        elementsOverlay.innerHTML = '';
        if (idx !== -1) saveHistory(label, false);
        updateUI();
    }

    function duplicateSelected() {
        var el = getSelected();
        if (!el) return;
        var copy = JSON.parse(JSON.stringify(el));
        copy.id = genId();
        copy.x += 15;
        copy.y += 15;
        copy.zIndex = state.elements.length;
        state.elements.push(copy);
        state.selectedElementId = copy.id;
        saveHistory('Duplicate ' + el.type, false);
        updateUI();
        drawSelectionOverlay(copy);
    }

    function toggleLock() {
        var el = getSelected();
        if (!el) return;
        el.locked = !el.locked;
        saveHistory(el.locked ? 'Lock ' + el.type : 'Unlock ' + el.type, false);
        updateUI();
        if (el.locked) {
            drawSelectionOverlay(el);
        }
    }

    function toggleHidden() {
        var el = getSelected();
        if (!el) return;
        el.hidden = !el.hidden;
        saveHistory(el.hidden ? 'Hide ' + el.type : 'Show ' + el.type, false);
        if (el.hidden) {
            state.selectedElementId = null;
            elementsOverlay.innerHTML = '';
        }
        updateUI();
    }

    function updateElementProp(prop, value) {
        var el = getSelected();
        if (!el) return;
        el[prop] = value;
        saveHistory('Edit ' + el.type + ' ' + prop, false);
        updateUI();
        drawSelectionOverlay(el);
    }

    // ========== PROPERTIES PANEL ==========
    function updatePropsPanel() {
        var el = getSelected();
        if (!el) {
            propsTitle.textContent = 'Properties';
            var isBrushTool = (state.activeTool === 'brush' || state.activeTool === 'pencil' ||
                               state.activeTool === 'eraser' || state.activeTool === 'highlight');
            if (isBrushTool && state.image) {
                var h = '';
                h += '<div class="prop-row"><label>Color</label><input type="color" class="prop-color" data-prop="brushColor" value="' + state.brushColor + '"></div>';
                h += '<div class="prop-row"><label>Size</label><input type="range" class="prop-range" data-prop="brushSize" value="' + state.brushSize + '" min="1" max="200" step="1"><span class="range-val">' + state.brushSize + 'px</span></div>';
                h += '<div class="prop-row"><label>Preset</label>';
                h += '<button class="prop-btn" data-brush-size="2">2px</button>';
                h += '<button class="prop-btn" data-brush-size="5">5px</button>';
                h += '<button class="prop-btn" data-brush-size="10">10px</button>';
                h += '<button class="prop-btn" data-brush-size="20">20px</button>';
                h += '<button class="prop-btn" data-brush-size="40">40px</button>';
                h += '</div>';
                if (state.activeTool === 'highlight') {
                    h += '<div class="prop-row"><label>Opacity</label><input type="range" class="prop-range" data-prop="highlightOpacity" value="' + Math.round(state.highlightOpacity * 100) + '" min="10" max="90" step="5"><span class="range-val">' + Math.round(state.highlightOpacity * 100) + '%</span></div>';
                }
                propsContent.innerHTML = h;
                bindBrushPropsEvents();
                return;
            }
            if ((state.activeTool === 'fill') && state.image) {
                var h = '';
                h += '<div class="prop-row"><label>Color</label><input type="color" class="prop-color" data-prop="brushColor" value="' + state.brushColor + '"></div>';
                h += '<div class="prop-row"><label>Tolerance</label><input type="range" class="prop-range" data-prop="fillTolerance" value="' + state.fillTolerance + '" min="0" max="128" step="1"><span class="range-val">' + state.fillTolerance + '</span></div>';
                propsContent.innerHTML = h;
                bindBrushPropsEvents();
                return;
            }
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

        if (el.type === 'line' || el.type === 'arrow') {
            h += '<div class="prop-row"><label>X2</label><input type="number" class="prop-input" data-prop="lineX2" value="' + Math.round(el.lineX2 !== undefined ? el.lineX2 : el.x + el.width) + '" step="1"></div>';
            h += '<div class="prop-row"><label>Y2</label><input type="number" class="prop-input" data-prop="lineY2" value="' + Math.round(el.lineY2 !== undefined ? el.lineY2 : el.y) + '" step="1"></div>';
        } else {
            h += '<div class="prop-row"><label>Width</label><input type="number" class="prop-input" data-prop="width" value="' + Math.round(el.width) + '" step="1" min="5"></div>';
            h += '<div class="prop-row"><label>Height</label><input type="number" class="prop-input" data-prop="height" value="' + Math.round(el.height) + '" step="1" min="5"></div>';
        }

        h += '<div class="prop-row"><label>Rotation</label><input type="number" class="prop-input" data-prop="rotation" value="' + Math.round(el.rotation || 0) + '" step="5"></div>';
        h += '<div class="prop-row"><label>Opacity</label><input type="range" class="prop-range" data-prop="opacity" value="' + Math.round((el.opacity || 1) * 100) + '" min="0" max="100" step="5"><span class="range-val">' + Math.round((el.opacity || 1) * 100) + '%</span></div>';

        var blendModes = ['source-over','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity'];
        h += '<div class="prop-row"><label>Blend</label><select class="prop-input" data-prop="blendMode" style="width:110px;text-align:left">';
        for (var bi = 0; bi < blendModes.length; bi++) {
            var bsel = (el.blendMode || 'source-over') === blendModes[bi] ? ' selected' : '';
            h += '<option value="' + blendModes[bi] + '"' + bsel + '>' + blendModes[bi] + '</option>';
        }
        h += '</select></div>';

        if (el.type === 'rectangle') {
            h += '<div class="prop-row"><label>Fill</label><input type="color" class="prop-color" data-prop="fill" value="' + (el.fill || '#3b82f6') + '"></div>';
            h += '<div class="prop-row"><label>Stroke</label><input type="color" class="prop-color" data-prop="stroke" value="' + (el.stroke && el.stroke !== 'transparent' ? el.stroke : '#000000') + '"></div>';
            h += '<div class="prop-row"><label>Border</label><input type="number" class="prop-input" data-prop="strokeWidth" value="' + (el.strokeWidth || 2) + '" step="1" min="0" max="50"></div>';
            h += '<div class="prop-row"><label>Radius</label><input type="number" class="prop-input" data-prop="borderRadius" value="' + (el.borderRadius || 0) + '" step="1" min="0"></div>';
        }
        if (el.type === 'ellipse') {
            h += '<div class="prop-row"><label>Fill</label><input type="color" class="prop-color" data-prop="fill" value="' + (el.fill || '#3b82f6') + '"></div>';
            h += '<div class="prop-row"><label>Stroke</label><input type="color" class="prop-color" data-prop="stroke" value="' + (el.stroke && el.stroke !== 'transparent' ? el.stroke : '#000000') + '"></div>';
            h += '<div class="prop-row"><label>Border</label><input type="number" class="prop-input" data-prop="strokeWidth" value="' + (el.strokeWidth || 2) + '" step="1" min="0" max="50"></div>';
        }
        if (el.type === 'line' || el.type === 'arrow') {
            h += '<div class="prop-row"><label>Color</label><input type="color" class="prop-color" data-prop="stroke" value="' + (el.stroke || '#1e293b') + '"></div>';
            h += '<div class="prop-row"><label>Width</label><input type="number" class="prop-input" data-prop="strokeWidth" value="' + (el.strokeWidth || 3) + '" step="1" min="1" max="50"></div>';
        }
        if (el.type === 'text') {
            h += '<div class="prop-row prop-row-col"><label class="prop-label-full">Text</label><textarea class="prop-textarea" data-prop="text" rows="2">' + (el.text || '') + '</textarea></div>';
            h += '<div class="prop-row"><label>Font</label><select class="prop-input" data-prop="fontFamily" style="width:100px;text-align:left">';
            var fonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Palatino'];
            for (var fi = 0; fi < fonts.length; fi++) {
                var sel = (el.fontFamily || 'Arial') === fonts[fi] ? ' selected' : '';
                h += '<option value="' + fonts[fi] + '"' + sel + '>' + fonts[fi] + '</option>';
            }
            h += '</select></div>';
            h += '<div class="prop-row"><label>Size</label><input type="number" class="prop-input" data-prop="fontSize" value="' + (el.fontSize || 20) + '" step="1" min="6" max="200"></div>';
            h += '<div class="prop-row"><label>Color</label><input type="color" class="prop-color" data-prop="fontColor" value="' + (el.fontColor || '#1e293b') + '"></div>';
            h += '<div class="prop-row" style="gap:4px"><label>Style</label>';
            h += '<button class="prop-btn' + (el.bold ? ' active' : '') + '" data-action="toggle-bold" style="font-weight:700;padding:3px 8px;min-width:28px">B</button>';
            h += '<button class="prop-btn' + (el.italic ? ' active' : '') + '" data-action="toggle-italic" style="font-style:italic;padding:3px 8px;min-width:28px">I</button>';
            h += '<button class="prop-btn' + (el.underline ? ' active' : '') + '" data-action="toggle-underline" style="text-decoration:underline;padding:3px 8px;min-width:28px">U</button>';
            h += '</div>';
            h += '<div class="prop-row" style="gap:4px"><label>Align</label>';
            h += '<button class="prop-btn' + (el.textAlign === 'left' || !el.textAlign ? ' active' : '') + '" data-action="align-left" style="padding:3px 8px;min-width:28px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg></button>';
            h += '<button class="prop-btn' + (el.textAlign === 'center' ? ' active' : '') + '" data-action="align-center" style="padding:3px 8px;min-width:28px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg></button>';
            h += '<button class="prop-btn' + (el.textAlign === 'right' ? ' active' : '') + '" data-action="align-right" style="padding:3px 8px;min-width:28px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg></button>';
            h += '</div>';
        }

        h += '<div class="prop-actions"><button class="prop-btn" data-action="duplicate">Duplicate</button>';
        h += '<button class="prop-btn" data-action="lock">' + (el.locked ? 'Unlock' : 'Lock') + '</button>';
        h += '<button class="prop-btn" data-action="hide">' + (el.hidden ? 'Show' : 'Hide') + '</button>';
        h += '<button class="prop-btn danger" data-action="delete">Delete</button></div>';
        return h;
    }

    function bindPropsEvents(el) {
        propsContent.querySelectorAll('.prop-input').forEach(function(inp) {
            inp.addEventListener('change', function() {
                var val = this.type === 'select-one' ? this.value : (parseFloat(this.value) || 0);
                updateElementProp(this.dataset.prop, val);
            });
        });
        propsContent.querySelectorAll('.prop-input').forEach(function(inp) {
            inp.addEventListener('input', function() {
                if (this.type === 'select-one') return;
                var e = getSelected();
                if (!e) return;
                e[this.dataset.prop] = parseFloat(this.value) || 0;
                updateUI();
                updateSelectionOverlay();
            });
        });
        propsContent.querySelectorAll('.prop-range').forEach(function(inp) {
            var valEl = inp.parentElement.querySelector('.range-val');
            inp.addEventListener('input', function() {
                if (valEl) valEl.textContent = this.value + '%';
            });
            inp.addEventListener('change', function() {
                updateElementProp(this.dataset.prop, parseFloat(this.value) / 100);
            });
        });
        propsContent.querySelectorAll('.prop-color').forEach(function(inp) {
            inp.addEventListener('change', function() {
                updateElementProp(this.dataset.prop, this.value);
            });
            inp.addEventListener('input', function() {
                updateElementProp(this.dataset.prop, this.value);
            });
        });
        propsContent.querySelectorAll('.prop-textarea').forEach(function(ta) {
            ta.addEventListener('change', function() {
                updateElementProp(this.dataset.prop, this.value);
            });
            ta.addEventListener('input', function() {
                var e = getSelected();
                if (!e) return;
                e.text = this.value;
                updateUI();
            });
        });
        propsContent.querySelectorAll('.prop-btn[data-action="duplicate"]').forEach(function(b) { b.addEventListener('click', duplicateSelected); });
        propsContent.querySelectorAll('.prop-btn[data-action="lock"]').forEach(function(b) { b.addEventListener('click', toggleLock); });
        propsContent.querySelectorAll('.prop-btn[data-action="hide"]').forEach(function(b) { b.addEventListener('click', toggleHidden); });
        propsContent.querySelectorAll('.prop-btn[data-action="delete"]').forEach(function(b) { b.addEventListener('click', deleteSelected); });
        propsContent.querySelectorAll('.prop-btn[data-action="toggle-bold"]').forEach(function(b) { b.addEventListener('click', function() { var el = getSelected(); if (el) { el.bold = !el.bold; updateUI(); updatePropsPanel(); } }); });
        propsContent.querySelectorAll('.prop-btn[data-action="toggle-italic"]').forEach(function(b) { b.addEventListener('click', function() { var el = getSelected(); if (el) { el.italic = !el.italic; updateUI(); updatePropsPanel(); } }); });
        propsContent.querySelectorAll('.prop-btn[data-action="toggle-underline"]').forEach(function(b) { b.addEventListener('click', function() { var el = getSelected(); if (el) { el.underline = !el.underline; updateUI(); updatePropsPanel(); } }); });
        propsContent.querySelectorAll('.prop-btn[data-action="align-left"]').forEach(function(b) { b.addEventListener('click', function() { updateElementProp('textAlign', 'left'); }); });
        propsContent.querySelectorAll('.prop-btn[data-action="align-center"]').forEach(function(b) { b.addEventListener('click', function() { updateElementProp('textAlign', 'center'); }); });
        propsContent.querySelectorAll('.prop-btn[data-action="align-right"]').forEach(function(b) { b.addEventListener('click', function() { updateElementProp('textAlign', 'right'); }); });
    }

    function bindBrushPropsEvents() {
        propsContent.querySelectorAll('.prop-color').forEach(function(inp) {
            inp.addEventListener('input', function() {
                state.brushColor = this.value;
            });
            inp.addEventListener('change', function() {
                state.brushColor = this.value;
            });
        });
        propsContent.querySelectorAll('.prop-range[data-prop="brushSize"]').forEach(function(inp) {
            var valEl = inp.parentElement.querySelector('.range-val');
            inp.addEventListener('input', function() {
                state.brushSize = parseInt(this.value) || 10;
                if (valEl) valEl.textContent = state.brushSize + 'px';
            });
        });
        propsContent.querySelectorAll('.prop-range[data-prop="highlightOpacity"]').forEach(function(inp) {
            var valEl = inp.parentElement.querySelector('.range-val');
            inp.addEventListener('input', function() {
                state.highlightOpacity = parseInt(this.value) / 100;
                if (valEl) valEl.textContent = this.value + '%';
            });
        });
        propsContent.querySelectorAll('.prop-range[data-prop="fillTolerance"]').forEach(function(inp) {
            var valEl = inp.parentElement.querySelector('.range-val');
            inp.addEventListener('input', function() {
                state.fillTolerance = parseInt(this.value) || 32;
                if (valEl) valEl.textContent = state.fillTolerance;
            });
        });
        propsContent.querySelectorAll('[data-brush-size]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                state.brushSize = parseInt(this.dataset.brushSize) || 10;
                var rangeInp = propsContent.querySelector('.prop-range[data-prop="brushSize"]');
                if (rangeInp) rangeInp.value = state.brushSize;
                var valEl = rangeInp ? rangeInp.parentElement.querySelector('.range-val') : null;
                if (valEl) valEl.textContent = state.brushSize + 'px';
            });
        });
    }

    // ========== ALIGNMENT GUIDES / SNAP ==========
    function computeSnap(el) {
        state.snapGuides = [];
        var z = state.zoom;
        var cx = el.x + el.width / 2;
        var cy = el.y + el.height / 2;
        var thresh = state.snapThreshold / z;
        var canvasCx = state.imageWidth / 2;
        var canvasCy = state.imageHeight / 2;
        var snappedX = el.x;
        var snappedY = el.y;
        var guides = [];
        if (Math.abs(cx - canvasCx) < thresh) {
            snappedX = canvasCx - el.width / 2;
            guides.push({ type: 'v', pos: canvasCx });
        }
        if (Math.abs(cy - canvasCy) < thresh) {
            snappedY = canvasCy - el.height / 2;
            guides.push({ type: 'h', pos: canvasCy });
        }
        if (Math.abs(el.x) < thresh) { snappedX = 0; guides.push({ type: 'v', pos: 0 }); }
        if (Math.abs(el.y) < thresh) { snappedY = 0; guides.push({ type: 'h', pos: 0 }); }
        if (Math.abs(el.x + el.width - state.imageWidth) < thresh) { snappedX = state.imageWidth - el.width; guides.push({ type: 'v', pos: state.imageWidth }); }
        if (Math.abs(el.y + el.height - state.imageHeight) < thresh) { snappedY = state.imageHeight - el.height; guides.push({ type: 'h', pos: state.imageHeight }); }
        for (var i = 0; i < state.elements.length; i++) {
            var o = state.elements[i];
            if (o.id === el.id || o.hidden) continue;
            var ocx = o.x + o.width / 2;
            var ocy = o.y + o.height / 2;
            if (Math.abs(cx - ocx) < thresh) { snappedX = ocx - el.width / 2; guides.push({ type: 'v', pos: ocx }); }
            if (Math.abs(cy - ocy) < thresh) { snappedY = ocy - el.height / 2; guides.push({ type: 'h', pos: ocy }); }
            if (Math.abs(el.x - o.x) < thresh) { snappedX = o.x; guides.push({ type: 'v', pos: o.x }); }
            if (Math.abs(el.y - o.y) < thresh) { snappedY = o.y; guides.push({ type: 'h', pos: o.y }); }
            if (Math.abs(el.x + el.width - (o.x + o.width)) < thresh) { snappedX = o.x + o.width - el.width; guides.push({ type: 'v', pos: o.x + o.width }); }
            if (Math.abs(el.y + el.height - (o.y + o.height)) < thresh) { snappedY = o.y + o.height - el.height; guides.push({ type: 'h', pos: o.y + o.height }); }
        }
        state.snapGuides = guides;
        el.x = snappedX;
        el.y = snappedY;
    }

    function drawSnapGuides() {
        if (state.snapGuides.length === 0) return;
        var z = state.zoom;
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (var i = 0; i < state.snapGuides.length; i++) {
            var g = state.snapGuides[i];
            ctx.beginPath();
            if (g.type === 'v') {
                var px = g.pos * z;
                ctx.moveTo(px, 0);
                ctx.lineTo(px, state.imageHeight * z);
            } else {
                var py = g.pos * z;
                ctx.moveTo(0, py);
                ctx.lineTo(state.imageWidth * z, py);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    // ========== ELEMENTS LIST (LAYERS PANEL) ==========
    function updateElementsList() {
        elCount.textContent = '(' + state.elements.length + ')';
        if (state.elements.length === 0) {
            elementsList.innerHTML = '<div class="el-empty">No elements yet</div>';
            return;
        }
        var html = '';
        for (var i = state.elements.length - 1; i >= 0; i--) {
            var e = state.elements[i];
            var sel = e.id === state.selectedElementId ? ' selected' : '';
            html += '<div class="el-list-item' + sel + '" data-el-id="' + e.id + '" draggable="true">' +
                '<span class="el-grip" title="Drag to reorder" style="cursor:grab;color:#cbd5e1;flex-shrink:0;display:flex;align-items:center">&#9776;</span>' +
                '<span class="el-type-badge">' + e.type + '</span>' +
                '<span class="el-label">' + (e.name || e.text || e.type) + '</span>' +
                '<span class="el-actions">' +
                '<button class="el-action-btn" data-action="visibility" title="' + (e.hidden ? 'Show' : 'Hide') + '">' +
                (e.hidden ?
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' :
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                ) + '</button>' +
                '<button class="el-action-btn" data-action="lock" title="' + (e.locked ? 'Unlock' : 'Lock') + '">' +
                (e.locked ?
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' :
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>'
                ) + '</button>' +
                '<button class="el-action-btn el-action-danger" data-action="delete" title="Delete">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
                '</button>' +
                '</span>' +
                '</div>';
        }
        elementsList.innerHTML = html;

        // Click to select
        elementsList.querySelectorAll('.el-list-item').forEach(function(item) {
            item.addEventListener('click', function(ev) {
                if (ev.target.closest('.el-action-btn')) return;
                state.selectedElementId = this.dataset.elId;
                updateElementsList();
                redraw();
                updatePropsPanel();
                var el = getSelected();
                if (el) drawSelectionOverlay(el);
            });
        });

        // Layer action buttons
        elementsList.querySelectorAll('.el-action-btn').forEach(function(btn) {
            btn.addEventListener('click', function(ev) {
                ev.stopPropagation();
                var item = this.closest('.el-list-item');
                var id = item.dataset.elId;
                var action = this.dataset.action;
                var el = null;
                for (var i = 0; i < state.elements.length; i++) {
                    if (state.elements[i].id === id) { el = state.elements[i]; break; }
                }
                if (!el) return;
                if (action === 'visibility') {
                    el.hidden = !el.hidden;
                    if (el.hidden && el.id === state.selectedElementId) {
                        state.selectedElementId = null;
                        elementsOverlay.innerHTML = '';
                    }
                    saveHistory(el.hidden ? 'Hide ' + el.type : 'Show ' + el.type, false);
                    updateUI();
                } else if (action === 'lock') {
                    el.locked = !el.locked;
                    saveHistory(el.locked ? 'Lock ' + el.type : 'Unlock ' + el.type, false);
                    updateUI();
                } else if (action === 'delete') {
                    var delType = el.type;
                    var idx = state.elements.indexOf(el);
                    if (idx !== -1) state.elements.splice(idx, 1);
                    if (el.id === state.selectedElementId) {
                        state.selectedElementId = null;
                        elementsOverlay.innerHTML = '';
                    }
                    saveHistory('Delete ' + delType, false);
                    updateUI();
                }
            });
        });

        // Drag-to-reorder
        elementsList.querySelectorAll('.el-list-item').forEach(function(item) {
            item.addEventListener('dragstart', function(ev) {
                state.layerDragId = this.dataset.elId;
                this.style.opacity = '0.4';
                ev.dataTransfer.effectAllowed = 'move';
                ev.dataTransfer.setData('text/plain', this.dataset.elId);
            });
            item.addEventListener('dragend', function() {
                this.style.opacity = '';
                state.layerDragId = null;
                state.layerDragOverId = null;
                elementsList.querySelectorAll('.el-list-item').forEach(function(it) {
                    it.style.borderTop = '';
                    it.style.borderBottom = '';
                });
            });
            item.addEventListener('dragover', function(ev) {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = 'move';
                var overId = this.dataset.elId;
                if (overId === state.layerDragId) return;
                this.style.borderTop = '2px solid #2563eb';
            });
            item.addEventListener('dragleave', function() {
                this.style.borderTop = '';
            });
            item.addEventListener('drop', function(ev) {
                ev.preventDefault();
                this.style.borderTop = '';
                var fromId = state.layerDragId;
                var toId = this.dataset.elId;
                if (!fromId || fromId === toId) return;
                var fromIdx = -1, toIdx = -1;
                for (var i = 0; i < state.elements.length; i++) {
                    if (state.elements[i].id === fromId) fromIdx = i;
                    if (state.elements[i].id === toId) toIdx = i;
                }
                if (fromIdx === -1 || toIdx === -1) return;
                var moved = state.elements.splice(fromIdx, 1)[0];
                state.elements.splice(toIdx, 0, moved);
                saveHistory('Reorder', false);
                updateUI();
            });
        });
    }

    // ========== MOUSE INTERACTION ==========
    function getCanvasPos(e) {
        var rect = previewCanvas.getBoundingClientRect();
        var z = state.zoom;
        return {
            x: (e.clientX - rect.left - state.panX) / z,
            y: (e.clientY - rect.top - state.panY) / z
        };
    }

    function getHandleAt(pos, el) {
        if (!el) return null;
        var z = state.zoom;
        var hs = 10 / z;
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

    function onMouseDown(e) {
        if (!state.image) return;
        if (e.button && e.button !== 0) return;
        if (state.isEditingText) return;

        var pos;
        try { pos = getCanvasPos(e); } catch (err) { notify('Canvas error', true); return; }
        if (!pos || isNaN(pos.x) || isNaN(pos.y)) return;

        // Crop mode
        if (state.isCropping) {
            var ch = getCropHandleAt(pos);
            if (ch) {
                state.cropDragging = true;
                state.cropHandle = ch;
                state.cropStartX = e.clientX;
                state.cropStartY = e.clientY;
                state.cropOrigRect = { x: state.cropRect.x, y: state.cropRect.y, w: state.cropRect.w, h: state.cropRect.h };
                e.preventDefault();
                return;
            }
            var r = state.cropRect;
            if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
                state.cropDragging = true;
                state.cropHandle = 'move';
                state.cropStartX = e.clientX;
                state.cropStartY = e.clientY;
                state.cropOrigRect = { x: r.x, y: r.y, w: r.w, h: r.h };
                e.preventDefault();
                return;
            }
            return;
        }

        // Freehand tools (brush, pencil, eraser, highlight)
        if (state.activeTool === 'brush' || state.activeTool === 'pencil' ||
            state.activeTool === 'eraser' || state.activeTool === 'highlight') {
            startFreehand(pos);
            e.preventDefault();
            return;
        }

        // Rect-based tools (blur, pixelate, redact)
        if (state.activeTool === 'blur' || state.activeTool === 'pixelate' || state.activeTool === 'redact') {
            startRectTool(pos);
            e.preventDefault();
            return;
        }

        // Color picker
        if (state.activeTool === 'color-picker') {
            pickColor(pos);
            e.preventDefault();
            return;
        }

        // Fill tool
        if (state.activeTool === 'fill') {
            floodFill(pos);
            e.preventDefault();
            return;
        }

        // Drawing mode for shapes, lines, arrows
        if (state.activeTool === 'shape' || state.activeTool === 'line' || state.activeTool === 'arrow') {
            state.isDrawing = true;
            state.drawStartX = e.clientX;
            state.drawStartY = e.clientY;
            state.drawStartImgX = pos.x;
            state.drawStartImgY = pos.y;
            var shapeType = state.activeTool === 'shape' ? state.shapeType : state.activeTool;
            var newEl = createElement(shapeType, pos.x, pos.y, {
                width: 1,
                height: 1,
                lineX2: pos.x,
                lineY2: pos.y,
                fill: shapeType === 'ellipse' ? '#3b82f6' : (shapeType === 'rectangle' ? '#3b82f6' : 'transparent'),
                stroke: (shapeType === 'line' || shapeType === 'arrow') ? '#1e293b' : 'transparent'
            });
            state.drawingElement = newEl;
            e.preventDefault();
            return;
        }
        // Text tool: click to create text element and open editor
        if (state.activeTool === 'text') {
            var tel = createElement('text', pos.x - 40, pos.y - 10, { width: 150, height: 30, text: '' });
            setActiveTool('select');
            e.preventDefault();
            setTimeout(function() { showTextEditor(tel); }, 50);
            return;
        }

        var sel = getSelected();

        // Move tool: always pan
        if (state.activeTool === 'move') {
            state.isPanning = true;
            state.dragStartX = e.clientX;
            state.dragStartY = e.clientY;
            state.panStartX = state.panX;
            state.panStartY = state.panY;
            previewCanvas.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        if (sel && !sel.locked) {
            var handle = getHandleAt(pos, sel);
            if (handle) {
                state.isResizing = true;
                state.resizeHandle = handle;
                state.dragStartX = e.clientX;
                state.dragStartY = e.clientY;
                state.elementStartX = sel.x;
                state.elementStartY = sel.y;
                state.resizeStartW = sel.width;
                state.resizeStartH = sel.height;
                state.dragMoved = false;
                e.preventDefault();
                return;
            }
        }

        var hit = hitTest(pos);
        if (hit) {
            if (hit.id !== state.selectedElementId) {
                selectElement(hit);
            }
            if (!hit.locked) {
                state.isDragging = true;
                state.dragStartX = e.clientX;
                state.dragStartY = e.clientY;
                state.elementStartX = hit.x;
                state.elementStartY = hit.y;
                state.dragOrigX = pos.x;
                state.dragOrigY = pos.y;
                state.dragMoved = false;
                e.preventDefault();
            }
        } else {
            clearSelection();
            state.isPanning = true;
            state.dragStartX = e.clientX;
            state.dragStartY = e.clientY;
            state.panStartX = state.panX;
            state.panStartY = state.panY;
            previewCanvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }

    function onMouseMove(e) {
        if (!state.image) return;

        if (state.cropDragging) {
            var dx = (e.clientX - state.cropStartX) / state.zoom;
            var dy = (e.clientY - state.cropStartY) / state.zoom;
            if (state.cropHandle === 'move') {
                var o = state.cropOrigRect;
                state.cropRect.x = Math.max(0, Math.min(state.imageWidth - o.w, o.x + dx));
                state.cropRect.y = Math.max(0, Math.min(state.imageHeight - o.h, o.y + dy));
            } else {
                resizeCropRect(state.cropHandle, dx, dy);
            }
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    drawCropOverlay();
                });
            }
            return;
        }

        if (state.isFreehand) {
            var pos = getCanvasPos(e);
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    continueFreehand(pos);
                });
            }
            return;
        }

        if (state.isRectTool) {
            var pos = getCanvasPos(e);
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    continueRectTool(pos);
                });
            }
            return;
        }

        if (state.isDrawing && state.drawingElement) {
            var pos = getCanvasPos(e);
            var el = state.drawingElement;
            var dx = pos.x - state.drawStartImgX;
            var dy = pos.y - state.drawStartImgY;
            if (el.type === 'line' || el.type === 'arrow') {
                el.lineX2 = pos.x;
                el.lineY2 = pos.y;
                el.width = Math.abs(dx);
                el.height = Math.abs(dy);
            } else {
                el.x = dx >= 0 ? state.drawStartImgX : pos.x;
                el.y = dy >= 0 ? state.drawStartImgY : pos.y;
                el.width = Math.max(2, Math.abs(dx));
                el.height = Math.max(2, Math.abs(dy));
            }
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    redraw();
                    updateSelectionOverlay();
                });
            }
            return;
        }

        if (state.isDragging) {
            var pos = getCanvasPos(e);
            var el = getSelected();
            if (!el) return;
            var dx = pos.x - state.dragOrigX;
            var dy = pos.y - state.dragOrigY;
            el.x = state.elementStartX + dx;
            el.y = state.elementStartY + dy;
            computeSnap(el);
            state.dragMoved = true;
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    redraw();
                    updateSelectionOverlay();
                    updatePropsPanel();
                });
            }
        } else if (state.isPanning) {
            state.panX = state.panStartX + (e.clientX - state.dragStartX);
            state.panY = state.panStartY + (e.clientY - state.dragStartY);
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    redraw();
                });
            }
        } else if (state.isResizing) {
            var el = getSelected();
            if (!el) return;
            var dx = (e.clientX - state.dragStartX) / state.zoom;
            var dy = (e.clientY - state.dragStartY) / state.zoom;
            var h = state.resizeHandle;
            var nx = el.x, ny = el.y, nw = el.width, nh = el.height;
            if (h.indexOf('e') !== -1) nw = Math.max(5, state.resizeStartW + dx);
            if (h.indexOf('w') !== -1) { nw = Math.max(5, state.resizeStartW - dx); nx = state.elementStartX + state.resizeStartW - nw; }
            if (h.indexOf('s') !== -1) nh = Math.max(5, state.resizeStartH + dy);
            if (h.indexOf('n') !== -1) { nh = Math.max(5, state.resizeStartH - dy); ny = state.elementStartY + state.resizeStartH - nh; }
            el.x = nx; el.y = ny; el.width = nw; el.height = nh;
            state.dragMoved = true;
            if (!state.pendingRender) {
                state.pendingRender = true;
                state.rafId = requestAnimationFrame(function() {
                    state.pendingRender = false;
                    redraw();
                    updateSelectionOverlay();
                });
            }
        } else {
            if ((state.activeTool === 'select' || state.activeTool === 'move') && state.image) {
                var pos = getCanvasPos(e);
                var hit = hitTest(pos);
                var sel = getSelected();
                if (sel && !sel.locked) {
                    var handle = getHandleAt(pos, sel);
                    if (handle) {
                        previewCanvas.style.cursor = getHandleCursor(handle);
                        return;
                    }
                }
                previewCanvas.style.cursor = state.activeTool === 'move' ? 'grab' : (hit ? 'move' : 'grab');
            } else if (state.activeTool === 'brush' || state.activeTool === 'pencil' || state.activeTool === 'highlight') {
                previewCanvas.style.cursor = 'crosshair';
            } else if (state.activeTool === 'eraser') {
                previewCanvas.style.cursor = 'cell';
            } else if (state.activeTool === 'color-picker') {
                previewCanvas.style.cursor = 'crosshair';
            } else if (state.activeTool === 'fill') {
                previewCanvas.style.cursor = 'crosshair';
            } else if (state.activeTool === 'blur' || state.activeTool === 'pixelate' || state.activeTool === 'redact') {
                previewCanvas.style.cursor = 'crosshair';
            }
        }
    }

    function onMouseUp(e) {
        if (state.cropDragging) {
            state.cropDragging = false;
            state.cropHandle = null;
            state.cropOrigRect = null;
            if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
            state.pendingRender = false;
            drawCropOverlay();
            return;
        }

        if (state.isFreehand) {
            if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
            state.pendingRender = false;
            commitFreehand();
            return;
        }

        if (state.isRectTool) {
            if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
            state.pendingRender = false;
            commitRectTool();
            return;
        }

        if (state.isDrawing) {
            state.isDrawing = false;
            var el = state.drawingElement;
            state.drawingElement = null;
            if (el && el.width < 3 && el.height < 3 && (el.type !== 'line' && el.type !== 'arrow')) {
                var idx = state.elements.indexOf(el);
                if (idx !== -1) state.elements.splice(idx, 1);
                state.selectedElementId = null;
            }
            if (el && (el.type === 'line' || el.type === 'arrow')) {
                if (!el.lineX2 && !el.lineY2) {
                    var idx = state.elements.indexOf(el);
                    if (idx !== -1) state.elements.splice(idx, 1);
                    state.selectedElementId = null;
                }
            }
            if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
            state.pendingRender = false;
            updateUI();
            if (el && state.selectedElementId) drawSelectionOverlay(el);
            return;
        }

        if (state.isDragging || state.isPanning || state.isResizing) {
            var wasDragging = state.isDragging;
            var wasResizing = state.isResizing;
            var moved = state.dragMoved;
            state.isDragging = false;
            state.isPanning = false;
            state.isResizing = false;
            state.resizeHandle = null;
            state.dragMoved = false;
            state.snapGuides = [];
            previewCanvas.style.cursor = state.activeTool === 'select' ? 'grab' : '';
            if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
            state.pendingRender = false;
            if (moved) {
                var sel = getSelected();
                if (wasDragging) saveHistory('Move ' + (sel ? sel.type : 'element'), false);
                else if (wasResizing) saveHistory('Resize ' + (sel ? sel.type : 'element'), false);
                redraw();
                updateSelectionOverlay();
                updateElementsList();
                updatePropsPanel();
            }
        }
    }

    // ========== SCROLL ZOOM ==========
    function onWheel(e) {
        if (!state.image) return;
        e.preventDefault();
        var rect = previewCanvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        var oldZoom = state.zoom;
        var factor = e.deltaY > 0 ? 0.9 : 1.1;
        var newZoom = Math.max(0.05, Math.min(20, oldZoom * factor));
        state.zoom = newZoom;
        state.panX = mx - (mx - state.panX) * (newZoom / oldZoom);
        state.panY = my - (my - state.panY) * (newZoom / oldZoom);
        if (!state.pendingRender) {
            state.pendingRender = true;
            state.rafId = requestAnimationFrame(function() {
                state.pendingRender = false;
                redraw();
            });
        }
    }

    // ========== TOOL SELECTION ==========
    function setActiveTool(tool) {
        state.activeTool = tool;
        toolBtns.forEach(function(btn) {
            var isActive = btn.dataset.tool === tool;
            btn.classList.toggle('active', isActive);
        });
        if (!getSelected()) updatePropsPanel();
    }

    // ========== EDITOR STATE ==========
    function updateEditorState() {
        var hasImage = !!state.image;
        toolBtns.forEach(function(b) {
            b.style.pointerEvents = hasImage ? '' : 'none';
            b.style.opacity = hasImage ? '' : '0.4';
        });
        if ($('zoom-in')) $('zoom-in').disabled = !hasImage;
        if ($('zoom-out')) $('zoom-out').disabled = !hasImage;
        if ($('zoom-fit')) $('zoom-fit').disabled = !hasImage;
        applyBtn.disabled = !hasImage;
    }

    // ========== PANEL TOGGLES ==========
    document.querySelectorAll('.panel-section-header').forEach(function(header) {
        header.addEventListener('click', function() {
            this.parentElement.classList.toggle('open');
        });
    });

    // ========== FILE INPUT EVENTS ==========
    fileInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files.length) handleFile(e.target.files[0]);
    });

    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
    }

    document.addEventListener('dragover', function(e) { e.preventDefault(); });
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    // ========== ZOOM BUTTON EVENTS ==========
    if ($('zoom-in')) $('zoom-in').addEventListener('click', zoomIn);
    if ($('zoom-out')) $('zoom-out').addEventListener('click', zoomOut);
    if ($('zoom-fit')) $('zoom-fit').addEventListener('click', zoomFit);

    // ========== CROP BUTTON EVENTS ==========
    if ($('crop-apply')) $('crop-apply').addEventListener('click', applyCrop);
    if ($('crop-cancel')) $('crop-cancel').addEventListener('click', cancelCrop);

    // ========== UNDO/REDO BUTTON EVENTS ==========
    if ($('undo-btn')) $('undo-btn').addEventListener('click', undo);
    if ($('redo-btn')) $('redo-btn').addEventListener('click', redo);
    if ($('shortcuts-btn')) $('shortcuts-btn').addEventListener('click', function() { showShortcutsPanel(); });

    // ========== EXPORT DIALOG ==========
    function showExportDialog() {
        if (!state.image) { notify('No image loaded', true); return; }
        var existing = document.querySelector('.export-dialog-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.className = 'export-dialog-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        var dialog = document.createElement('div');
        dialog.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:380px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,.15);font-family:Inter,sans-serif;';
        dialog.innerHTML =
            '<h3 style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0f172a">Export Image</h3>' +
            '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">' +
            '<label style="font-size:12px;color:#64748b;width:60px">Format</label>' +
            '<select id="export-format" style="flex:1;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:Inter,sans-serif">' +
            '<option value="image/png">PNG (Lossless)</option>' +
            '<option value="image/jpeg">JPEG (Smaller size)</option>' +
            '<option value="image/webp">WebP (Best compression)</option>' +
            '</select></div>' +
            '<div id="export-quality-row" style="display:none;gap:8px;margin-bottom:12px;align-items:center">' +
            '<label style="font-size:12px;color:#64748b;width:60px">Quality</label>' +
            '<input type="range" id="export-quality" value="92" min="10" max="100" step="1" style="flex:1;height:4px;accent-color:#2563eb">' +
            '<span id="export-quality-val" style="font-size:11px;color:#94a3b8;min-width:28px;text-align:right;font-family:JetBrains Mono,monospace">92%</span></div>' +
            '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">' +
            '<label style="font-size:12px;color:#64748b;width:60px">Scale</label>' +
            '<select id="export-scale" style="flex:1;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:Inter,sans-serif">' +
            '<option value="0.5">0.5x (' + Math.round(state.imageWidth * 0.5) + ' x ' + Math.round(state.imageHeight * 0.5) + ')</option>' +
            '<option value="1" selected>1x (' + state.imageWidth + ' x ' + state.imageHeight + ')</option>' +
            '<option value="2">2x (' + (state.imageWidth * 2) + ' x ' + (state.imageHeight * 2) + ')</option>' +
            '</select></div>' +
            '<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">' +
            '<label style="font-size:12px;color:#64748b;width:60px">Filename</label>' +
            '<input type="text" id="export-filename" value="' + (state.imageFileName || 'image').replace(/\.[^.]+$/, '') + '_edited" style="flex:1;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-family:Inter,sans-serif">' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end">' +
            '<button id="export-cancel" style="padding:7px 14px;background:#fff;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer">Cancel</button>' +
            '<button id="export-download" style="padding:7px 14px;background:#16a34a;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px">Download</button>' +
            '</div>';
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        var formatSelect = $('export-format');
        var qualityRow = $('export-quality-row');
        var qualityInput = $('export-quality');
        var qualityVal = $('export-quality-val');

        formatSelect.addEventListener('change', function() {
            qualityRow.style.display = this.value === 'image/png' ? 'none' : 'flex';
        });
        qualityInput.addEventListener('input', function() {
            qualityVal.textContent = this.value + '%';
        });

        $('export-cancel').addEventListener('click', function() { overlay.remove(); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

        $('export-download').addEventListener('click', function() {
            var format = formatSelect.value;
            var quality = parseInt(qualityInput.value) / 100;
            var scale = parseFloat($('export-scale').value) || 1;
            var filename = ($('export-filename').value || 'image').replace(/[<>:"/\\|?*]/g, '_');

            var ext = format === 'image/jpeg' ? '.jpg' : (format === 'image/webp' ? '.webp' : '.png');

            var exportCanvas = document.createElement('canvas');
            var ew = Math.round(state.imageWidth * scale);
            var eh = Math.round(state.imageHeight * scale);
            exportCanvas.width = ew;
            exportCanvas.height = eh;
            var ectx = exportCanvas.getContext('2d');
            ectx.drawImage(state.image, 0, 0, ew, eh);

            var zSave = state.zoom;
            state.zoom = scale;
            for (var i = 0; i < state.elements.length; i++) {
                if (state.elements[i].hidden) continue;
                renderElement(ectx, state.elements[i]);
            }
            state.zoom = zSave;

            try {
                var link = document.createElement('a');
                link.download = filename + ext;
                link.href = exportCanvas.toDataURL(format, quality);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                overlay.remove();
                notify('Image exported as ' + format.split('/')[1].toUpperCase() + ' (' + scale + 'x)');
            } catch (err) {
                notify('Export failed', true);
            }
        });
    }

    // ========== NEW/DOWNLOAD BUTTON EVENTS ==========
    if ($('new-btn')) $('new-btn').addEventListener('click', function() { resetAll(); });
    if ($('download-btn')) $('download-btn').addEventListener('click', function() { showExportDialog(); });

    // ========== CANVAS MOUSE EVENTS ==========
    if (canvasStage) {
        canvasStage.addEventListener('mousedown', onMouseDown);
        canvasStage.addEventListener('dblclick', function(e) {
            if (!state.image || state.isEditingText) return;
            var pos = getCanvasPos(e);
            var hit = hitTest(pos);
            if (hit && hit.type === 'text' && !hit.locked) {
                e.preventDefault();
                showTextEditor(hit);
            }
        });
    } else {
        previewCanvas.addEventListener('mousedown', onMouseDown);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    previewCanvas.addEventListener('wheel', onWheel, { passive: false });

    function showToolOptions(tool, anchorEl) {
        var existing = document.querySelector('.tool-options-popup');
        if (existing) existing.remove();
        var popup = document.createElement('div');
        popup.className = 'tool-options-popup';
        popup.style.cssText = 'position:fixed;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:9999;padding:4px;min-width:140px;';
        var rect = anchorEl.getBoundingClientRect();
        popup.style.left = rect.left + 'px';
        popup.style.top = (rect.bottom + 4) + 'px';

        var options = [];
        if (tool === 'rotate') {
            options = [
                { label: 'Rotate 90° CW', action: function() { rotateImage(90); } },
                { label: 'Rotate 90° CCW', action: function() { rotateImage(-90); } },
                { label: 'Rotate 180°', action: function() { rotateImage(180); } }
            ];
        } else if (tool === 'flip') {
            options = [
                { label: 'Flip Horizontal', action: function() { flipImage(true); } },
                { label: 'Flip Vertical', action: function() { flipImage(false); } }
            ];
        } else if (tool === 'shape') {
            options = [
                { label: 'Rectangle', action: function() { state.shapeType = 'rectangle'; if (state.isCropping) cancelCrop(); setActiveTool('shape'); notify('Click and drag to draw rectangle'); } },
                { label: 'Rounded Rect', action: function() { state.shapeType = 'rounded-rect'; if (state.isCropping) cancelCrop(); setActiveTool('shape'); notify('Click and drag to draw rounded rect'); } },
                { label: 'Ellipse', action: function() { state.shapeType = 'ellipse'; if (state.isCropping) cancelCrop(); setActiveTool('shape'); notify('Click and drag to draw ellipse'); } }
            ];
        } else if (tool === 'brush' || tool === 'pencil' || tool === 'eraser' || tool === 'highlight') {
            options = [
                { label: 'Size: 2px', action: function() { state.brushSize = 2; if (state.isCropping) cancelCrop(); setActiveTool(tool); notify(tool + ' size set to 2px'); } },
                { label: 'Size: 5px', action: function() { state.brushSize = 5; if (state.isCropping) cancelCrop(); setActiveTool(tool); notify(tool + ' size set to 5px'); } },
                { label: 'Size: 10px', action: function() { state.brushSize = 10; if (state.isCropping) cancelCrop(); setActiveTool(tool); notify(tool + ' size set to 10px'); } },
                { label: 'Size: 20px', action: function() { state.brushSize = 20; if (state.isCropping) cancelCrop(); setActiveTool(tool); notify(tool + ' size set to 20px'); } },
                { label: 'Size: 40px', action: function() { state.brushSize = 40; if (state.isCropping) cancelCrop(); setActiveTool(tool); notify(tool + ' size set to 40px'); } },
                { label: 'Custom Size...', action: function() { var s = prompt('Brush size (1-200):', state.brushSize); if (s && parseInt(s) > 0) { state.brushSize = Math.min(200, parseInt(s)); if (state.isCropping) cancelCrop(); setActiveTool(tool); notify(tool + ' size set to ' + state.brushSize + 'px'); } } }
            ];
        }
        options.forEach(function(opt) {
            var btn = document.createElement('button');
            btn.textContent = opt.label;
            btn.style.cssText = 'display:block;width:100%;padding:6px 10px;border:none;background:none;font-size:11px;color:#0f172a;cursor:pointer;text-align:left;border-radius:4px;';
            btn.addEventListener('mouseenter', function() { this.style.background = '#f1f5f9'; });
            btn.addEventListener('mouseleave', function() { this.style.background = 'none'; });
            btn.addEventListener('click', function() { popup.remove(); opt.action(); });
            popup.appendChild(btn);
        });

        document.body.appendChild(popup);
        function closePopup(ev) {
            if (!popup.contains(ev.target) && ev.target !== anchorEl) {
                popup.remove();
                document.removeEventListener('mousedown', closePopup);
            }
        }
        setTimeout(function() { document.addEventListener('mousedown', closePopup); }, 0);
    }

    // ========== TOOL BUTTON EVENTS ==========
    toolBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!state.image) { notify('Load an image first', true); return; }
            var tool = this.dataset.tool;
            if (tool === 'crop') {
                startCrop();
            } else if (tool === 'rotate') {
                showToolOptions('rotate', this);
            } else if (tool === 'flip') {
                showToolOptions('flip', this);
            } else if (tool === 'resize') {
                showResizeDialog();
                setActiveTool('select');
            } else if (tool === 'shape') {
                showToolOptions('shape', this);
            } else if (tool === 'line') {
                if (state.isCropping) cancelCrop();
                setActiveTool('line');
            } else if (tool === 'arrow') {
                if (state.isCropping) cancelCrop();
                setActiveTool('arrow');
            } else if (tool === 'brush') {
                showToolOptions('brush', this);
            } else if (tool === 'pencil') {
                showToolOptions('pencil', this);
            } else if (tool === 'eraser') {
                showToolOptions('eraser', this);
            } else if (tool === 'highlight') {
                showToolOptions('highlight', this);
            } else if (tool === 'blur') {
                if (state.isCropping) cancelCrop();
                setActiveTool('blur');
                notify('Draw a rectangle to blur that area');
            } else if (tool === 'pixelate') {
                if (state.isCropping) cancelCrop();
                setActiveTool('pixelate');
                notify('Draw a rectangle to pixelate that area');
            } else if (tool === 'redact') {
                if (state.isCropping) cancelCrop();
                setActiveTool('redact');
                notify('Draw a rectangle to redact (black out) that area');
            } else if (tool === 'color-picker') {
                if (state.isCropping) cancelCrop();
                if (getSelected()) clearSelection();
                setActiveTool('color-picker');
                notify('Click on the image to pick a color');
            } else if (tool === 'fill') {
                if (state.isCropping) cancelCrop();
                if (getSelected()) clearSelection();
                setActiveTool('fill');
                notify('Click to flood fill with current color');
            } else {
                if (state.isCropping) cancelCrop();
                setActiveTool(tool);
            }
        });
    });

    // ========== SHORTCUTS PANEL ==========
    function showShortcutsPanel() {
        var existing = document.querySelector('.shortcuts-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.className = 'shortcuts-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        var dialog = document.createElement('div');
        dialog.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:480px;max-width:90vw;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.15);font-family:Inter,sans-serif;';
        var shortcuts = [
            ['Ctrl+Z', 'Undo'],
            ['Ctrl+Y / Ctrl+Shift+Z', 'Redo'],
            ['Ctrl+D', 'Duplicate'],
            ['Delete / Backspace', 'Delete selected'],
            ['Escape', 'Deselect / Cancel'],
            ['Ctrl+E', 'Export'],
            ['Ctrl+0', 'Fit to window'],
            ['Ctrl++', 'Zoom in'],
            ['Ctrl+-', 'Zoom out'],
            ['V', 'Select tool'],
            ['H', 'Move / Hand tool'],
            ['B', 'Brush tool'],
            ['P', 'Pencil tool'],
            ['E', 'Eraser tool'],
            ['T', 'Text tool'],
            ['R', 'Crop tool'],
            ['L', 'Line tool'],
            ['A', 'Arrow tool'],
            ['S', 'Shape tool'],
            ['G', 'Fill tool'],
            ['I', 'Color picker'],
            ['Ctrl+Shift+Up', 'Bring to front'],
            ['Ctrl+Shift+Down', 'Send to back'],
            ['[', 'Decrease layer order'],
            [']', 'Increase layer order'],
            ['?', 'Show shortcuts'],
        ];
        var h = '<h3 style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0f172a">Keyboard Shortcuts</h3>';
        h += '<div style="display:flex;flex-direction:column;gap:2px">';
        for (var i = 0; i < shortcuts.length; i++) {
            h += '<div style="display:flex;justify-content:space-between;padding:6px 4px;border-bottom:1px solid #f1f5f9;font-size:12px">' +
                '<span style="font-weight:500;color:#0f172a">' + shortcuts[i][1] + '</span>' +
                '<span style="color:#64748b;font-family:JetBrains Mono,monospace;font-size:11px">' + shortcuts[i][0] + '</span></div>';
        }
        h += '</div>';
        h += '<div style="text-align:center;margin-top:16px"><button onclick="this.closest(\'.shortcuts-overlay\').remove()" style="padding:7px 16px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">Close</button></div>';
        dialog.innerHTML = h;
        overlay.appendChild(dialog);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }

    // ========== KEYBOARD SHORTCUTS ==========
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (state.isCropping) {
            if (e.key === 'Escape') { cancelCrop(); return; }
            if (e.key === 'Enter') { applyCrop(); return; }
        }
        var ctrl = e.ctrlKey || e.metaKey;
        if (ctrl && e.key === 'z') { e.preventDefault(); undo(); return; }
        if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); return; }
        if (ctrl && e.key === 'd') { e.preventDefault(); duplicateSelected(); return; }
        if (ctrl && e.key === '=') { e.preventDefault(); zoomIn(); return; }
        if (ctrl && e.key === '-') { e.preventDefault(); zoomOut(); return; }
        if (ctrl && e.key === '0') { e.preventDefault(); zoomFit(); return; }
        if (ctrl && e.key === 'e') { e.preventDefault(); showExportDialog(); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
        if (e.key === 'Escape') { clearSelection(); return; }
        if (e.key === '?') { showShortcutsPanel(); return; }
        if (e.key === 'v' && !ctrl) { if (state.image) setActiveTool('select'); return; }
        if (e.key === 'h' && !ctrl) { if (state.image) setActiveTool('move'); return; }
        if (e.key === 'b' && !ctrl) { if (state.image) { setActiveTool('brush'); notify('Brush tool selected'); } return; }
        if (e.key === 'p' && !ctrl) { if (state.image) { setActiveTool('pencil'); notify('Pencil tool selected'); } return; }
        if (e.key === 'e' && !ctrl) { if (state.image) { setActiveTool('eraser'); notify('Eraser tool selected'); } return; }
        if (e.key === 't' && !ctrl) { if (state.image) setActiveTool('text'); return; }
        if (e.key === 'r' && !ctrl) { if (state.image) startCrop(); return; }
        if (e.key === 'l' && !ctrl) { if (state.image) setActiveTool('line'); return; }
        if (e.key === 'a' && !ctrl) { if (state.image) setActiveTool('arrow'); return; }
        if (e.key === 's' && !ctrl) { if (state.image) { setActiveTool('shape'); state.shapeType = 'rectangle'; } return; }
        if (e.key === 'g' && !ctrl) { if (state.image) { if (state.isCropping) cancelCrop(); if (getSelected()) clearSelection(); setActiveTool('fill'); notify('Click to flood fill with current color'); } return; }
        if (e.key === 'i' && !ctrl) { if (state.image) { if (state.isCropping) cancelCrop(); if (getSelected()) clearSelection(); setActiveTool('color-picker'); notify('Click on the image to pick a color'); } return; }
        if (e.key === ']') {
            var sel = getSelected();
            if (sel) {
                var idx = state.elements.indexOf(sel);
                if (idx < state.elements.length - 1) {
                    state.elements.splice(idx, 1);
                    state.elements.splice(idx + 1, 0, sel);
                    saveHistory('Reorder', false);
                    updateUI();
                }
            }
            return;
        }
        if (e.key === '[') {
            var sel = getSelected();
            if (sel) {
                var idx = state.elements.indexOf(sel);
                if (idx > 0) {
                    state.elements.splice(idx, 1);
                    state.elements.splice(idx - 1, 0, sel);
                    saveHistory('Reorder', false);
                    updateUI();
                }
            }
            return;
        }
        if (ctrl && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'Up')) {
            var sel = getSelected();
            if (sel) {
                var idx = state.elements.indexOf(sel);
                if (idx !== -1) {
                    state.elements.splice(idx, 1);
                    state.elements.push(sel);
                    saveHistory('Bring to Front', false);
                    updateUI();
                }
            }
            e.preventDefault();
            return;
        }
        if (ctrl && e.shiftKey && (e.key === 'ArrowDown' || e.key === 'Down')) {
            var sel = getSelected();
            if (sel) {
                var idx = state.elements.indexOf(sel);
                if (idx !== -1) {
                    state.elements.splice(idx, 1);
                    state.elements.unshift(sel);
                    saveHistory('Send to Back', false);
                    updateUI();
                }
            }
            e.preventDefault();
            return;
        }
    });

    // ========== APPLY (EXPORT STUB) ==========
    applyBtn.addEventListener('click', function() {
        if (!state.image) { notify('No image loaded', true); return; }
        showExportDialog();
    });

    // ========== RESET ==========
    function resetAll() {
        state.image = null;
        state.imageFileName = '';
        state.imageFileSize = 0;
        state.imageWidth = 0;
        state.imageHeight = 0;
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
        state.activeTool = 'select';
        state.elements = [];
        state.elementIdCounter = 0;
        state.selectedElementId = null;
        state.isDragging = false;
        state.isPanning = false;
        state.isResizing = false;
        state.resizeHandle = null;
        state.dragMoved = false;
        state.isCropping = false;
        state.cropDragging = false;
        state.cropHandle = null;
        state.historyStack = [];
        state.historyIndex = -1;
        state.historyIdCounter = 0;
        state.originalImageData = null;
        state.isFreehand = false;
        state.freehandPoints = [];
        state.isRectTool = false;
        state.snapGuides = [];
        state.layerDragId = null;
        state.layerDragOverId = null;
        state.isEditingText = false;
        state.editingTextId = null;
        var existingTA = document.getElementById('inline-text-editor');
        if (existingTA) existingTA.remove();
        if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
        state.pendingRender = false;
        fileInput.value = '';
        fileBadge.textContent = 'No file';
        fileBadge.style.color = '#94a3b8';
        previewEmpty.style.display = 'flex';
        canvasStage.style.display = 'none';
        previewCanvas.width = 1;
        previewCanvas.height = 1;
        elementsOverlay.innerHTML = '';
        applyBtn.disabled = true;
        if (progressSection) progressSection.style.display = 'none';
        if (resultOverlay) resultOverlay.style.display = 'none';
        var cropBar = $('crop-bar');
        var exportBar = $('export-bar');
        if (cropBar) cropBar.style.display = 'none';
        if (exportBar) exportBar.style.display = 'flex';
        zoomLabel.textContent = '100%';
        setActiveTool('select');
        updateElementsList();
        updatePropsPanel();
        updateEditorState();
        if (imageInfoPanel) imageInfoPanel.style.display = 'none';
    }

    resetBtn.addEventListener('click', function() {
        if (state.image && !confirm('Reset all changes? This cannot be undone.')) return;
        resetAll();
    });

    function resetToOriginal() {
        if (!state.originalImageData) { notify('No original image to restore', true); return; }
        if (state.historyIndex <= 0) return;
        if (!confirm('Reset to the original image? This will clear all editing history.')) return;
        var img = new Image();
        img.onload = function() {
            state.image = img;
            state.elements = [];
            state.elementIdCounter = 0;
            state.selectedElementId = null;
            state.imageWidth = img.naturalWidth;
            state.imageHeight = img.naturalHeight;
            state.historyStack = [];
            state.historyIndex = -1;
            state.historyIdCounter = 0;
            state.isCropping = false;
            state.cropDragging = false;
            state.cropHandle = null;
            elementsOverlay.innerHTML = '';
            var cropBar = $('crop-bar');
            var exportBar = $('export-bar');
            if (cropBar) cropBar.style.display = 'none';
            if (exportBar) exportBar.style.display = 'flex';
            zoomFit();
            updateImageInfo();
            saveHistory('Original Image', true);
            updateUI();
            updateEditorState();
            notify('Reset to original image');
        };
        img.src = state.originalImageData;
    }

    function showResetConfirm() {
        var rtb = $('reset-original-btn');
        if (!rtb) return;
        rtb.addEventListener('click', resetToOriginal);
    }

    // ========== WINDOW RESIZE ==========
    var resizeTimer = null;
    window.addEventListener('resize', function() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (state.image) redraw();
        }, 150);
    });

    // ========== INIT ==========
    updateEditorState();
    updateElementsList();
    updatePropsPanel();
    showResetConfirm();
    updateHistoryUI();
    console.log('Image Editor initialized');
});