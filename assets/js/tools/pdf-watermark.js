document.addEventListener('DOMContentLoaded', function () {
    if (typeof PDFLib === 'undefined') {
        console.error('pdf-lib not loaded');
        return;
    }
    var { PDFDocument, degrees } = PDFLib;

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
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');
    var statusBadge = document.getElementById('status-badge');

    var currentFile = null;
    var outputBytes = null;
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
        outputBytes = null;
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
        updateProgress('Adding watermark...', 0);
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
        resultsPanel.classList.remove('show');
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

    var opacitySlider = document.getElementById('watermark-opacity');
    var opacityVal = document.getElementById('watermark-opacity-value');
    opacitySlider.addEventListener('input', function () { opacityVal.textContent = opacitySlider.value + '%'; });
    var rotationSlider = document.getElementById('watermark-rotation');
    var rotationVal = document.getElementById('watermark-rotation-value');
    rotationSlider.addEventListener('input', function () { rotationVal.textContent = rotationSlider.value + '\u00B0'; });

    applyBtn.addEventListener('click', async function () {
        if (!currentFile) return;
        var text = document.getElementById('watermark-text').value.trim();
        if (!text) { showNotification('Enter watermark text', true); return; }
        var fontSize = parseInt(document.getElementById('watermark-font-size').value) || 50;
        var opacity = parseInt(opacitySlider.value) / 100;
        var rotation = parseInt(rotationSlider.value);
        var color = hexToRgb(document.getElementById('watermark-color').value);

        progressSection.classList.add('show');
        resultsPanel.classList.remove('show');
        setStatus('Processing', 'processing');
        updateProgress('Loading PDF...', 10);

        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            var pdfDoc = await PDFDocument.load(arrayBuffer);
            var pages = pdfDoc.getPages();
            var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

            var rad = rotation * Math.PI / 180;
            var cosA = Math.cos(rad);
            var sinA = Math.sin(rad);

            for (var i = 0; i < pages.length; i++) {
                var pct = 10 + (80 * (i + 1) / pages.length);
                updateProgress('Adding watermark to page ' + (i + 1) + '...', Math.round(pct));
                var page = pages[i];
                var dims = page.getSize();
                var textWidth = font.widthOfTextAtSize(text, fontSize);
                var x = dims.width / 2 - textWidth / 2 * cosA - fontSize / 2 * sinA;
                var y = dims.height / 2 - textWidth / 2 * sinA + fontSize / 2 * cosA;
                page.drawText(text, {
                    x: x,
                    y: y,
                    size: fontSize,
                    font: font,
                    color: color,
                    opacity: opacity,
                    rotate: degrees(rotation)
                });
            }

            updateProgress('Saving PDF...', 95);
            outputBytes = await pdfDoc.save();
            updateProgress('Complete!', 100);

            var baseName = currentFile.name.replace(/\.pdf$/i, '');

            setTimeout(function () {
                progressSection.classList.remove('show');
                resultsPanel.classList.add('show');
                document.getElementById('result-pages').textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                document.getElementById('result-size').textContent = formatFileSize(outputBytes.length);
                var blob = new Blob([outputBytes], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                downloadBtn.href = url;
                downloadBtn.download = baseName + '_watermarked.pdf';
                setStatus('Done', 'done');
                renderPreview(outputBytes);
                setTimeout(function () { statusBadge.className = 'status-badge'; statusBadge.textContent = ''; }, 3000);
            }, 500);
        } catch (err) {
            console.error(err);
            showNotification('Error: ' + err.message, true);
            progressSection.classList.remove('show');
            setStatus('Error', 'error');
        }
    });

    resetBtn.addEventListener('click', resetTool);
    newFileBtn.addEventListener('click', resetTool);
});
