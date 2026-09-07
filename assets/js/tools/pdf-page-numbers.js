document.addEventListener('DOMContentLoaded', function () {
    if (typeof PDFLib === 'undefined') {
        console.error('pdf-lib not loaded');
        return;
    }
    var { PDFDocument } = PDFLib;

    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('file-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePages = document.getElementById('file-pages');
    var pdfPreview = document.getElementById('pdf-preview');
    var settingsPanel = document.getElementById('settings-panel');
    var actionBar = document.getElementById('action-bar');
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

    var currentFile = null;
    var totalPages = 0;

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
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

    function setStatus(text, type) {
        statusBadge.textContent = text;
        statusBadge.className = 'status-badge ' + type;
    }

    function updateProgress(text, pct) {
        progressText.textContent = text;
        progressPercent.textContent = pct + '%';
        progressFill.style.width = pct + '%';
    }

    async function renderPreview(arr) {
        pdfPreview.innerHTML = '';
        try {
            if (typeof pdfjsLib === 'undefined') return;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            var pdfDoc = await pdfjsLib.getDocument({ data: arr.slice(0) }).promise;
            var page = await pdfDoc.getPage(1);
            var viewport = page.getViewport({ scale: 0.8 });
            var canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            var ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            pdfPreview.appendChild(canvas);
            pdfPreview.classList.add('show');
        } catch (e) {
            pdfPreview.classList.remove('show');
        }
    }

    function resetTool() {
        currentFile = null;
        totalPages = 0;
        fileInput.value = '';
        fileInfo.classList.remove('show');
        pdfPreview.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressSection.classList.remove('show');
        actionBar.style.display = '';
        applyBtn.disabled = true;
        statusBadge.className = 'status-badge';
        statusBadge.textContent = '';
        updateProgress('Processing...', 0);
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
        settingsPanel.classList.add('show');
        progressSection.classList.remove('show');
        actionBar.style.display = '';
        setStatus('Ready', 'ready');

        var reader = new FileReader();
        reader.onload = async function (e) {
            try {
                var arr = new Uint8Array(e.target.result);
                var pdfDoc = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
                totalPages = pdfDoc.getPageCount();
                filePages.textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                applyBtn.disabled = false;
                showNotification('PDF loaded with ' + totalPages + ' page' + (totalPages !== 1 ? 's' : ''), false);
                renderPreview(arr);
            } catch (err) {
                showNotification('Failed to load PDF: ' + err.message, true);
            }
        };
        reader.readAsArrayBuffer(file);
    }

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

    function getPositionCoords(pos, pageW, pageH, textW, textH, xOffset, yOffset) {
        var margin = 50;
        var x = margin, y = pageH - margin - textH;
        if (pos.indexOf('top') !== -1) y = pageH - margin - textH;
        else if (pos.indexOf('middle') !== -1) y = (pageH - textH) / 2;
        else if (pos.indexOf('bottom') !== -1) y = 30;
        if (pos.indexOf('left') !== -1) x = margin;
        else if (pos.indexOf('center') !== -1) x = (pageW - textW) / 2;
        else if (pos.indexOf('right') !== -1) x = pageW - margin - textW;
        x += xOffset;
        y += yOffset;
        return { x: Math.max(0, x), y: Math.max(0, y) };
    }

    function getSelectedPosition() {
        var btn = settingsPanel.querySelector('.position-btn.active');
        return btn ? btn.getAttribute('data-pos') : 'bottom-center';
    }

    var positionBtns = settingsPanel.querySelectorAll('.position-btn');
    positionBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            positionBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    });

    applyBtn.addEventListener('click', async function () {
        if (!currentFile) return;
        var format = document.getElementById('pagenum-format').value;
        var fontSize = parseInt(document.getElementById('pagenum-font-size').value) || 12;
        var color = hexToRgb(document.getElementById('pagenum-color').value);
        var pos = getSelectedPosition();

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
                updateProgress('Adding page number ' + (i + 1) + '...', Math.round(pct));
                var page = pages[i];
                var dims = page.getSize();
                var pageNum = formatNumber(i + 1, format);
                var textWidth = font.widthOfTextAtSize(pageNum, fontSize);
                var coords = getPositionCoords(pos, dims.width, dims.height, textWidth, fontSize, 0, 0);
                page.drawText(pageNum, {
                    x: coords.x,
                    y: coords.y,
                    size: fontSize,
                    font: font,
                    color: color
                });
            }

            updateProgress('Saving PDF...', 95);
            var pdfBytes = await pdfDoc.save();
            updateProgress('Complete!', 100);

            var baseName = currentFile.name.replace(/\.pdf$/i, '');
            var blob = new Blob([pdfBytes], { type: 'application/pdf' });
            var url = URL.createObjectURL(blob);
            downloadBtn.href = url;
            downloadBtn.download = baseName + '_numbered.pdf';

            setTimeout(function () {
                progressSection.classList.remove('show');
                actionBar.style.display = 'none';
                resultsPanel.classList.add('show');
                document.getElementById('result-pages').textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                document.getElementById('result-size').textContent = formatFileSize(blob.size);
                setStatus('Done', 'done');
                setTimeout(function () { statusBadge.className = 'status-badge'; statusBadge.textContent = ''; }, 3000);
            }, 500);
        } catch (err) {
            console.error(err);
            showNotification('Error: ' + err.message, true);
            progressSection.classList.remove('show');
            setStatus('Error', 'error');
        }
    });

    function formatNumber(num, format) {
        switch (format) {
            case '01': return num.toString().padStart(2, '0');
            case 'page': return 'Page ' + num;
            case 'paren': return '(' + num + ')';
            case 'dash': return '- ' + num + ' -';
            default: return num.toString();
        }
    }

    resetBtn.addEventListener('click', resetTool);
    newFileBtn.addEventListener('click', resetTool);
});
