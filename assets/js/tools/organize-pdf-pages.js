document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePages = document.getElementById('file-pages');
    var settingsPanel = document.getElementById('settings-panel');
    var pagesGrid = document.getElementById('pages-grid');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressContainer = document.getElementById('progress-container');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var progressFill = document.getElementById('progress-fill');
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');
    var rotateLeftAll = document.getElementById('rotate-left-all');
    var rotateRightAll = document.getElementById('rotate-right-all');
    var deleteSelected = document.getElementById('delete-selected');

    var currentFile = null;
    var pageOrder = [];
    var pageRotations = [];
    var pagesToDelete = new Set();
    var pdfDocRef = null;
    var outputBytes = null;
    var pdfJsDoc = null;

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

    function renderPages() {
        pagesGrid.innerHTML = '';
        pageOrder.forEach(function(pageIdx, order) {
            var card = document.createElement('div');
            card.className = 'page-card';
            card.draggable = true;
            card.dataset.index = pageIdx;
            var isMarked = pagesToDelete.has(pageIdx);
            if (isMarked) card.classList.add('marked');
            card.innerHTML = '<div class="page-thumb" id="thumb-' + pageIdx + '"><div style="text-align:center"><div style="font-size:28px;margin-bottom:4px">&#128196;</div><div>Page ' + (pageIdx + 1) + '</div></div><div class="page-number">#' + (order + 1) + '</div></div>' +
                '<div class="page-body"><span class="page-label">Page ' + (pageIdx + 1) + '</span><div class="page-actions">' +
                '<button class="rotate-l" title="Rotate Left" data-idx="' + pageIdx + '"><i class="fas fa-undo"></i></button>' +
                '<button class="rotate-r" title="Rotate Right" data-idx="' + pageIdx + '"><i class="fas fa-redo"></i></button>' +
                '<button class="delete ' + (isMarked ? 'marked' : '') + '" title="' + (isMarked ? 'Undo delete' : 'Delete') + '" data-idx="' + pageIdx + '"><i class="fas fa-trash"></i></button></div></div>';
            pagesGrid.appendChild(card);
            renderThumbnail(pageIdx);
        });
        attachDragHandlers();
        attachCardActions();
        applyBtn.disabled = pageOrder.length === 0 || pageOrder.every(function(_, i) {
            return pageRotations[i] === 0 && !pagesToDelete.has(i) && pageOrder.indexOf(i) === i;
        });
    }

    async function renderThumbnail(pageIdx) {
        if (!pdfJsDoc) return;
        try {
            var page = await pdfJsDoc.getPage(pageIdx + 1);
            var viewport = page.getViewport({ scale: 0.4 });
            var canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            var ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            var container = document.getElementById('thumb-' + pageIdx);
            if (container) {
                container.innerHTML = '';
                container.appendChild(canvas);
                var num = document.createElement('div');
                num.className = 'page-number';
                num.textContent = '#' + (pageOrder.indexOf(pageIdx) + 1);
                container.appendChild(num);
            }
        } catch (e) {}
    }

    var dragSrcIdx = null;

    function attachDragHandlers() {
        var cards = pagesGrid.querySelectorAll('.page-card');
        cards.forEach(function(card) {
            card.addEventListener('dragstart', function(e) {
                dragSrcIdx = parseInt(card.dataset.index);
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            card.addEventListener('dragend', function() { card.classList.remove('dragging'); dragSrcIdx = null; });
            card.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
            card.addEventListener('dragenter', function(e) { e.preventDefault(); card.classList.add('drag-over'); });
            card.addEventListener('dragleave', function() { card.classList.remove('drag-over'); });
            card.addEventListener('drop', function(e) {
                e.preventDefault();
                card.classList.remove('drag-over');
                var targetIdx = parseInt(card.dataset.index);
                if (dragSrcIdx !== null && dragSrcIdx !== targetIdx) {
                    var srcPos = pageOrder.indexOf(dragSrcIdx);
                    var tgtPos = pageOrder.indexOf(targetIdx);
                    if (srcPos > -1 && tgtPos > -1) {
                        pageOrder.splice(srcPos, 1);
                        pageOrder.splice(tgtPos, 0, dragSrcIdx);
                        renderPages();
                    }
                }
            });
        });
    }

    function applyRotationVisual(idx) {
        var container = document.getElementById('thumb-' + idx);
        if (!container) return;
        var canvas = container.querySelector('canvas');
        var rot = pageRotations[idx] || 0;
        if (canvas) {
            canvas.style.transform = 'rotate(' + rot + 'deg)';
            canvas.style.transition = 'transform 0.3s ease';
        }
    }

    function attachCardActions() {
        pagesGrid.querySelectorAll('.rotate-l').forEach(function(btn) {
            btn.addEventListener('click', function(e) { e.stopPropagation();
                var idx = parseInt(btn.dataset.idx);
                pageRotations[idx] = ((pageRotations[idx] || 0) - 90) % 360;
                applyRotationVisual(idx);
                showNotification('Rotated page ' + (idx + 1), false);
                applyBtn.disabled = false; });
        });
        pagesGrid.querySelectorAll('.rotate-r').forEach(function(btn) {
            btn.addEventListener('click', function(e) { e.stopPropagation();
                var idx = parseInt(btn.dataset.idx);
                pageRotations[idx] = ((pageRotations[idx] || 0) + 90) % 360;
                applyRotationVisual(idx);
                showNotification('Rotated page ' + (idx + 1), false);
                applyBtn.disabled = false; });
        });
        pagesGrid.querySelectorAll('.delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) { e.stopPropagation();
                var idx = parseInt(btn.dataset.idx);
                if (pagesToDelete.has(idx)) {
                    pagesToDelete.delete(idx);
                    showNotification('Page ' + (idx + 1) + ' restored', false);
                } else {
                    if (pagesToDelete.size >= pageOrder.length - 1) {
                        showNotification('You must keep at least one page', true);
                        return;
                    }
                    pagesToDelete.add(idx);
                    showNotification('Page ' + (idx + 1) + ' marked for deletion', false);
                }
                applyBtn.disabled = false;
                renderPages(); });
        });
    }

    rotateLeftAll.addEventListener('click', function() {
        pageOrder.forEach(function(idx) { pageRotations[idx] = ((pageRotations[idx] || 0) - 90) % 360; applyRotationVisual(idx); });
        applyBtn.disabled = false;
        showNotification('Rotated all pages left', false);
    });

    rotateRightAll.addEventListener('click', function() {
        pageOrder.forEach(function(idx) { pageRotations[idx] = ((pageRotations[idx] || 0) + 90) % 360; applyRotationVisual(idx); });
        applyBtn.disabled = false;
        showNotification('Rotated all pages right', false);
    });

    deleteSelected.addEventListener('click', function() {
        if (pagesToDelete.size === 0) { showNotification('No pages selected for deletion', true); return; }
        var remaining = pageOrder.filter(function(idx) { return !pagesToDelete.has(idx); });
        if (remaining.length === 0) { showNotification('You must keep at least one page', true); return; }
        pageOrder = remaining;
        pagesToDelete.clear();
        applyBtn.disabled = false;
        renderPages();
        showNotification('Selected pages deleted', false);
    });

    function resetTool() {
        currentFile = null;
        pageOrder = [];
        pageRotations = [];
        pagesToDelete.clear();
        pdfDocRef = null;
        outputBytes = null;
        fileInput.value = '';
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        applyBtn.disabled = true;
        pagesGrid.innerHTML = '';
        updateProgress('Applying changes...', 0);
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
        fileStatus.textContent = 'Loading...';
        fileInfo.classList.add('show');
        settingsPanel.classList.add('show');
        resultsPanel.classList.remove('show');
        pagesGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:var(--space-8);color:var(--color-text-light)"><i class="fas fa-spinner fa-spin" style="font-size:2rem;margin-bottom:var(--space-2);display:block"></i>Loading pages...</div>';
        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var arr = new Uint8Array(e.target.result);
                var pdfDoc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
                var count = pdfDoc.getPageCount();
                filePages.textContent = count + ' page' + (count !== 1 ? 's' : '');
                fileStatus.textContent = 'Loaded';
                pageOrder = [];
                pageRotations = [];
                pagesToDelete.clear();
                for (var i = 0; i < count; i++) { pageOrder.push(i);
                    pageRotations[i] = 0; }
                renderPages();
                if (typeof pdfjsLib !== 'undefined') {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    try {
                        pdfJsDoc = await pdfjsLib.getDocument({ data: arr.slice(0) }).promise;
                        renderPages();
                    } catch (e) { pdfJsDoc = null; }
                }
            } catch (err) {
                showNotification('Failed to load PDF: ' + err.message, true);
                pagesGrid.innerHTML = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

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

    applyBtn.addEventListener('click', async function() {
        if (!currentFile) return;
        if (typeof PDFLib === 'undefined') { showNotification('PDF library is loading', true); return; }
        applyBtn.disabled = true;
        progressContainer.classList.add('show');
        resultsPanel.classList.remove('show');
        updateProgress('Loading PDF...', 10);
        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            updateProgress('Processing PDF...', 30);
            var pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            var newPdf = await PDFLib.PDFDocument.create();
            var totalPages = pageOrder.length;
            for (var i = 0; i < totalPages; i++) {
                var idx = pageOrder[i];
                if (pagesToDelete.has(idx)) continue;
                updateProgress('Processing page ' + (i + 1) + ' of ' + totalPages + '...', Math.round((i / totalPages) * 70) + 10);
                var [copiedPage] = await newPdf.copyPages(pdfDoc, [idx]);
                var rot = pageRotations[idx] || 0;
                if (rot !== 0) copiedPage.setRotation(PDFLib.degrees(rot));
                newPdf.addPage(copiedPage);
            }
            updateProgress('Saving PDF...', 85);
            outputBytes = await newPdf.save();
            updateProgress('Complete!', 100);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                downloadBtn.download = 'organized-' + currentFile.name;
                showNotification('PDF organized successfully!', false);
            }, 500);
        } catch (err) {
            showNotification('Error: ' + err.message, true);
            progressContainer.classList.remove('show');
            applyBtn.disabled = false;
        }
    });

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

    resetBtn.addEventListener('click', resetTool);
    newFileBtn.addEventListener('click', resetTool);
});
