document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePagesEl = document.getElementById('file-pages');
    var settingsPanel = document.getElementById('settings-panel');
    var pagesList = document.getElementById('pages-list');
    var rangeInput = document.getElementById('range-input');
    var selectAllBtn = document.getElementById('select-all-btn');
    var deselectAllBtn = document.getElementById('deselect-all-btn');
    var extractBtn = document.getElementById('extract-btn');
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
    var extractedBytes = null;

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

    function getSelectedPages() {
        var checked = pagesList.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checked).map(function(cb) { return parseInt(cb.value) - 1; });
    }

    function updateExtractBtn() {
        var sel = getSelectedPages();
        extractBtn.disabled = sel.length === 0;
    }

    function renderPages(count) {
        pagesList.innerHTML = '';
        for (var i = 1; i <= count; i++) {
            var div = document.createElement('div');
            div.className = 'page-check-item';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = 'page-' + i;
            cb.value = i;
            cb.checked = true;
            cb.addEventListener('change', updateExtractBtn);
            var label = document.createElement('label');
            label.htmlFor = 'page-' + i;
            label.textContent = 'Page ' + i;
            div.appendChild(cb);
            div.appendChild(label);
            div.addEventListener('click', function(e) {
                if (e.target.tagName !== 'INPUT') {
                    var inp = this.querySelector('input');
                    inp.checked = !inp.checked;
                    updateExtractBtn();
                }
            });
            pagesList.appendChild(div);
        }
        updateExtractBtn();
    }

    rangeInput.addEventListener('input', function() {
        var val = rangeInput.value.trim();
        if (!val) return;
        var pages = parsePageRange(val, totalPages);
        var cbs = pagesList.querySelectorAll('input[type="checkbox"]');
        cbs.forEach(function(cb) { cb.checked = pages.indexOf(parseInt(cb.value)) > -1; });
        updateExtractBtn();
    });

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
        return Array.from(result);
    }

    selectAllBtn.addEventListener('click', function() {
        pagesList.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = true; });
        updateExtractBtn();
    });

    deselectAllBtn.addEventListener('click', function() {
        pagesList.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
        updateExtractBtn();
    });

    function resetTool() {
        currentFile = null;
        totalPages = 0;
        extractedBytes = null;
        fileInput.value = '';
        rangeInput.value = '';
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        extractBtn.disabled = true;
        pagesList.innerHTML = '';
        updateProgress('Extracting pages...', 0);
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
        showNotification('Loading PDF...');
        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var arr = new Uint8Array(e.target.result);
                var pdfDoc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
                totalPages = pdfDoc.getPageCount();
                filePagesEl.textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                renderPages(totalPages);
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

    extractBtn.addEventListener('click', async function() {
        if (!currentFile) return;
        var selected = getSelectedPages();
        if (selected.length === 0) { showNotification('Please select at least one page', true); return; }
        if (typeof PDFLib === 'undefined') { showNotification('PDF library is loading', true); return; }
        extractBtn.disabled = true;
        progressContainer.classList.add('show');
        resultsPanel.classList.remove('show');
        updateProgress('Loading PDF...', 10);
        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            updateProgress('Extracting pages...', 30);
            var pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            var newPdf = await PDFLib.PDFDocument.create();
            for (var i = 0; i < selected.length; i++) {
                updateProgress('Copying page ' + (i + 1) + ' of ' + selected.length + '...', Math.round((i / selected.length) * 60) + 20);
                var [copiedPage] = await newPdf.copyPages(pdfDoc, [selected[i]]);
                newPdf.addPage(copiedPage);
            }
            updateProgress('Saving PDF...', 85);
            extractedBytes = await newPdf.save();
            updateProgress('Complete!', 100);
            resultPages.textContent = selected.length + ' page' + (selected.length !== 1 ? 's' : '');
            resultSize.textContent = formatFileSize(extractedBytes.byteLength);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                downloadBtn.download = 'extracted-' + currentFile.name;
                showNotification('Pages extracted successfully!', false);
            }, 500);
        } catch (err) {
            showNotification('Error: ' + err.message, true);
            progressContainer.classList.remove('show');
            extractBtn.disabled = false;
        }
    });

    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!extractedBytes) return;
        var blob = new Blob([extractedBytes], { type: 'application/pdf' });
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
