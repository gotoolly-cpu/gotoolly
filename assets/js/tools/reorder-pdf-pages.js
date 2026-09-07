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
    var reverseBtn = document.getElementById('reverse-btn');
    var sortBtn = document.getElementById('sort-btn');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressContainer = document.getElementById('progress-container');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var progressFill = document.getElementById('progress-fill');
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');
    var actionBar = document.getElementById('action-bar');

    var currentFile = null;
    var pageOrder = [];
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
            card.innerHTML = '<div class="page-thumb" id="thumb-' + pageIdx + '"><div style="text-align:center"><div style="font-size:28px;margin-bottom:4px">&#128196;</div><div>Page ' + (pageIdx + 1) + '</div></div><div class="page-number">#' + (order + 1) + '</div></div>' +
                '<div class="page-body"><span class="page-order">Position ' + (order + 1) + '</span></div>';
            pagesGrid.appendChild(card);
        });
        pageOrder.forEach(function(pageIdx) {
            renderThumbnail(pageIdx);
        });
        attachDragHandlers();
        checkChanges();
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

    function checkChanges() {
        var changed = false;
        for (var i = 0; i < pageOrder.length; i++) {
            if (pageOrder[i] !== i) { changed = true; break; }
        }
        applyBtn.disabled = !changed;
    }

    reverseBtn.addEventListener('click', function() {
        pageOrder.reverse();
        renderPages();
        showNotification('Page order reversed', false);
    });

    sortBtn.addEventListener('click', function() {
        pageOrder.sort(function(a, b) { return a - b; });
        renderPages();
        showNotification('Pages sorted numerically', false);
    });

    function resetTool() {
        currentFile = null;
        pageOrder = [];
        outputBytes = null;
        pdfJsDoc = null;
        fileInput.value = '';
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        actionBar.style.display = '';
        applyBtn.disabled = true;
        pagesGrid.innerHTML = '';
        updateProgress('Reordering pages...', 0);
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
                var pdfDoc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
                var count = pdfDoc.getPageCount();
                filePages.textContent = count + ' page' + (count !== 1 ? 's' : '');
                pageOrder = [];
                for (var i = 0; i < count; i++) pageOrder.push(i);
                renderPages();
                if (typeof pdfjsLib !== 'undefined') {
                    pdfJsDoc = null;
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    try {
                        pdfJsDoc = await pdfjsLib.getDocument({ data: arr.slice(0) }).promise;
                        renderPages();
                    } catch (e) { pdfJsDoc = null; }
                }
                applyBtn.disabled = true;
                showNotification('PDF loaded with ' + count + ' pages', false);
            } catch (err) {
                showNotification('Failed to load PDF: ' + err.message, true);
            }
        };
        reader.readAsArrayBuffer(file);
    }

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
            updateProgress('Reordering pages...', 30);
            var pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            var newPdf = await PDFLib.PDFDocument.create();
            for (var i = 0; i < pageOrder.length; i++) {
                updateProgress('Processing page ' + (i + 1) + ' of ' + pageOrder.length + '...', Math.round((i / pageOrder.length) * 60) + 20);
                var [copiedPage] = await newPdf.copyPages(pdfDoc, [pageOrder[i]]);
                newPdf.addPage(copiedPage);
            }
            updateProgress('Saving PDF...', 85);
            outputBytes = await newPdf.save();
            updateProgress('Complete!', 100);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                actionBar.style.display = 'none';
                downloadBtn.download = 'reordered-' + currentFile.name;
                showNotification('Pages reordered successfully!', false);
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
