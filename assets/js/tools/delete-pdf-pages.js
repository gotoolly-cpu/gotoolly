document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePagesEl = document.getElementById('file-pages');
    var settingsPanel = document.getElementById('settings-panel');
    var pagesGrid = document.getElementById('pages-grid');
    var rangeInput = document.getElementById('range-input');
    var applyRangeBtn = document.getElementById('apply-range-btn');
    var clearAllBtn = document.getElementById('clear-all-btn');
    var deleteCount = document.getElementById('delete-count');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressContainer = document.getElementById('progress-container');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var progressFill = document.getElementById('progress-fill');
    var resultsPanel = document.getElementById('results-panel');
    var resultPages = document.getElementById('result-pages');
    var resultSize = document.getElementById('result-size');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');

    var currentFile = null;
    var totalPages = 0;
    var markedPages = new Set();
    var outputBytes = null;

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
        for (var i = 1; i <= totalPages; i++) {
            var card = document.createElement('div');
            card.className = 'page-card' + (markedPages.has(i) ? ' marked' : '');
            card.innerHTML = '<div class="page-thumb"><div style="text-align:center"><div style="font-size:24px;margin-bottom:4px">&#128196;</div><span>Page ' + i + '</span></div><div class="page-number">' + i + '</div></div>' +
                '<div class="page-body"><span class="page-label">Page ' + i + '</span>' +
                '<button class="delete-btn' + (markedPages.has(i) ? ' marked' : '') + '" data-page="' + i + '" title="' + (markedPages.has(i) ? 'Restore page' : 'Mark for deletion') + '"><i class="fas fa-trash"></i></button></div>';
            pagesGrid.appendChild(card);
        }
        pagesGrid.querySelectorAll('.delete-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var p = parseInt(btn.dataset.page);
                if (markedPages.has(p)) {
                    markedPages.delete(p);
                } else {
                    if (markedPages.size >= totalPages - 1) {
                        showNotification('You must keep at least one page', true);
                        return;
                    }
                    markedPages.add(p);
                }
                updateUI();
            });
        });
        updateUI();
    }

    function updateUI() {
        document.querySelectorAll('.page-card').forEach(function(card) {
            var num = parseInt(card.querySelector('.delete-btn').dataset.page);
            var btn = card.querySelector('.delete-btn');
            if (markedPages.has(num)) {
                card.classList.add('marked');
                btn.classList.add('marked');
                btn.title = 'Restore page';
            } else {
                card.classList.remove('marked');
                btn.classList.remove('marked');
                btn.title = 'Mark for deletion';
            }
        });
        deleteCount.textContent = markedPages.size + ' page' + (markedPages.size !== 1 ? 's' : '') + ' marked for deletion';
        applyBtn.disabled = markedPages.size === 0;
    }

    function parsePageRange(str, max) {
        var parts = str.split(',');
        var result = new Set();
        parts.forEach(function(part) {
            part = part.trim();
            var m = part.match(/^(\d+)$/);
            if (m) { var n = parseInt(m[1]); if (n >= 1 && n <= max) result.add(n); return; }
            var r = part.match(/^(\d+)\s*-\s*(\d+)$/);
            if (r) {
                var start = parseInt(r[1]), end = parseInt(r[2]);
                for (var i = Math.max(1, start); i <= Math.min(max, end); i++) result.add(i);
            }
        });
        return result;
    }

    applyRangeBtn.addEventListener('click', function() {
        var val = rangeInput.value.trim();
        if (!val) { showNotification('Please enter a page range', true); return; }
        var pages = parsePageRange(val, totalPages);
        pages.forEach(function(p) {
            if (markedPages.size >= totalPages - 1) return;
            markedPages.add(p);
        });
        updateUI();
        showNotification(pages.size + ' page(s) marked', false);
    });

    clearAllBtn.addEventListener('click', function() {
        markedPages.clear();
        updateUI();
    });

    function resetTool() {
        currentFile = null;
        totalPages = 0;
        markedPages.clear();
        outputBytes = null;
        fileInput.value = '';
        rangeInput.value = '';
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        applyBtn.disabled = true;
        pagesGrid.innerHTML = '';
        deleteCount.textContent = '0 pages marked for deletion';
        updateProgress('Deleting pages...', 0);
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
        fileStatus.textContent = 'Ready';
        fileInfo.classList.add('show');
        settingsPanel.classList.add('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var arr = new Uint8Array(e.target.result);
                var pdfDoc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
                totalPages = pdfDoc.getPageCount();
                filePagesEl.textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                markedPages.clear();
                renderPages();
                showNotification('PDF loaded with ' + totalPages + ' pages', false);
            } catch (err) {
                showNotification('Failed to load PDF: ' + err.message, true);
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
        if (!currentFile || markedPages.size === 0) return;
        if (typeof PDFLib === 'undefined') { showNotification('PDF library is loading', true); return; }
        applyBtn.disabled = true;
        progressContainer.classList.add('show');
        resultsPanel.classList.remove('show');
        updateProgress('Loading PDF...', 10);
        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            updateProgress('Removing pages...', 30);
            var pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            var indicesToRemove = Array.from(markedPages).sort(function(a, b) { return b - a; });
            indicesToRemove.forEach(function(p) { pdfDoc.removePage(p - 1); });
            updateProgress('Saving PDF...', 80);
            outputBytes = await pdfDoc.save();
            updateProgress('Complete!', 100);
            var remainingPages = totalPages - markedPages.size;
            resultPages.textContent = remainingPages + ' page' + (remainingPages !== 1 ? 's' : '') + ' remaining';
            resultSize.textContent = formatFileSize(outputBytes.byteLength);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                downloadBtn.download = 'trimmed-' + currentFile.name;
                showNotification('Pages deleted successfully!', false);
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
