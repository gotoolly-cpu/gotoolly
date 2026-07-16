document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePagesEl = document.getElementById('file-pages');
    var settingsPanel = document.getElementById('settings-panel');
    var previewCanvas = document.getElementById('preview-canvas');
    var previewWrap = document.getElementById('preview-wrap');
    var sigOverlay = document.getElementById('sig-overlay');
    var sigOverlayImg = document.getElementById('sig-overlay-img');
    var prevPageBtn = document.getElementById('prev-page');
    var nextPageBtn = document.getElementById('next-page');
    var previewPageNum = document.getElementById('preview-page-num');
    var sigCanvas = document.getElementById('sig-canvas');
    var sigClear = document.getElementById('sig-clear');
    var sigAcceptDraw = document.getElementById('sig-accept-draw');
    var sigTypeInput = document.getElementById('sig-type-input');
    var sigAcceptType = document.getElementById('sig-accept-type');
    var sigUploadInput = document.getElementById('sig-upload-input');
    var sigUploadArea = document.getElementById('sig-upload-area');
    var sigAcceptUpload = document.getElementById('sig-accept-upload');
    var sigColor = document.getElementById('sig-color');
    var sigSize = document.getElementById('sig-size');
    var sigX = document.getElementById('sig-x');
    var sigY = document.getElementById('sig-y');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressContainer = document.getElementById('progress-container');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var progressFill = document.getElementById('progress-fill');
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');

    var currentFile = null;
    var pdfPagesData = [];
    var currentPage = 0;
    var pdfDocRef = null;
    var signatureDataUrl = null;
    var outputBytes = null;
    var activeMethod = 'draw';

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

    function initSigCanvas() {
        var ctx = sigCanvas.getContext('2d');
        sigCanvas.width = sigCanvas.parentElement.clientWidth || 300;
        sigCanvas.height = 150;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    var isDrawing = false;

    function setupDrawSignature() {
        var ctx = sigCanvas.getContext('2d');
        sigCanvas.addEventListener('mousedown', function(e) {
            isDrawing = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        });
        sigCanvas.addEventListener('mousemove', function(e) {
            if (!isDrawing) return;
            ctx.strokeStyle = sigColor.value;
            ctx.lineWidth = 2;
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
        });
        sigCanvas.addEventListener('mouseup', function() { isDrawing = false; });
        sigCanvas.addEventListener('mouseleave', function() { isDrawing = false; });
        sigCanvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            var touch = e.touches[0];
            var rect = sigCanvas.getBoundingClientRect();
            isDrawing = true;
            ctx.beginPath();
            ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
        });
        sigCanvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (!isDrawing) return;
            var touch = e.touches[0];
            var rect = sigCanvas.getBoundingClientRect();
            ctx.strokeStyle = sigColor.value;
            ctx.lineWidth = 2;
            ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
            ctx.stroke();
        });
        sigCanvas.addEventListener('touchend', function(e) { e.preventDefault(); isDrawing = false; });
    }

    sigClear.addEventListener('click', function() {
        var ctx = sigCanvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
        signatureDataUrl = null;
    });

    sigAcceptDraw.addEventListener('click', function() {
        signatureDataUrl = sigCanvas.toDataURL('image/png');
        showNotification('Signature created! Position it on the page.', false);
        updateSigOverlay();
    });

    sigAcceptType.addEventListener('click', function() {
        var text = sigTypeInput.value.trim();
        if (!text) { showNotification('Please type your name', true); return; }
        var c = document.createElement('canvas');
        c.width = 400;
        c.height = 120;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = sigColor.value;
        ctx.font = '60px "Brush Script MT","Segoe Script",cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, c.width / 2, c.height / 2);
        signatureDataUrl = c.toDataURL('image/png');
        showNotification('Signature created! Position it on the page.', false);
        updateSigOverlay();
    });

    sigUploadInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                sigUploadArea.innerHTML = '<img src="' + ev.target.result + '" alt="Uploaded signature" style="max-width:200px;max-height:80px">';
                sigAcceptUpload.style.display = 'block';
                sigUploadInput.dataset.dataUrl = ev.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    sigAcceptUpload.addEventListener('click', function() {
        var dataUrl = sigUploadInput.dataset.dataUrl;
        if (!dataUrl) { showNotification('Please upload a signature image first', true); return; }
        signatureDataUrl = dataUrl;
        showNotification('Signature uploaded! Position it on the page.', false);
        updateSigOverlay();
    });

    function updateSigOverlay() {
        if (signatureDataUrl) {
            sigOverlayImg.src = signatureDataUrl;
            sigOverlay.classList.add('active');
            applyBtn.disabled = false;
            updateSigPosition();
        } else {
            sigOverlay.classList.remove('active');
            applyBtn.disabled = true;
        }
    }

    function updateSigPosition() {
        if (!signatureDataUrl) return;
        var size = parseInt(sigSize.value) || 100;
        var x = parseInt(sigX.value) || 50;
        var y = parseInt(sigY.value) || 50;
        sigOverlay.style.left = x + 'px';
        sigOverlay.style.top = y + 'px';
        sigOverlayImg.style.width = size + 'px';
        sigOverlayImg.style.height = 'auto';
    }

    document.querySelectorAll('.sig-method-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sig-method-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            activeMethod = btn.dataset.method;
            document.getElementById('sig-draw').style.display = activeMethod === 'draw' ? '' : 'none';
            document.getElementById('sig-type').style.display = activeMethod === 'type' ? '' : 'none';
            document.getElementById('sig-upload').style.display = activeMethod === 'upload' ? '' : 'none';
        });
    });

    sigColor.addEventListener('input', function() {
        if (activeMethod === 'draw') {
            var ctx = sigCanvas.getContext('2d');
            ctx.strokeStyle = sigColor.value;
        }
    });

    sigSize.addEventListener('input', updateSigPosition);
    sigX.addEventListener('input', updateSigPosition);
    sigY.addEventListener('input', updateSigPosition);

    function makeSignatureDraggable() {
        var isDragging = false;
        var dragOffsetX = 0, dragOffsetY = 0;
        sigOverlay.addEventListener('mousedown', function(e) {
            isDragging = true;
            var rect = sigOverlay.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            sigOverlay.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            var wrapRect = previewWrap.getBoundingClientRect();
            var newLeft = e.clientX - wrapRect.left - dragOffsetX;
            var newTop = e.clientY - wrapRect.top - dragOffsetY;
            newLeft = Math.max(0, Math.min(newLeft, wrapRect.width - sigOverlay.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, wrapRect.height - sigOverlay.offsetHeight));
            sigOverlay.style.left = newLeft + 'px';
            sigOverlay.style.top = newTop + 'px';
            sigX.value = Math.round(newLeft);
            sigY.value = Math.round(newTop);
        });
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                sigOverlay.style.cursor = 'move';
            }
        });
    }

    async function renderPreviewPage(pageNum) {
        if (!pdfDocRef || !window['pdfjsLib']) return;
        var pageIdx = pageNum;
        if (pageIdx < 0 || pageIdx >= pdfPagesData.length) return;
        previewPageNum.textContent = pageIdx + 1;
        prevPageBtn.disabled = pageIdx === 0;
        nextPageBtn.disabled = pageIdx >= pdfPagesData.length - 1;
        try {
            var pdfjsDoc = await pdfjsLib.getDocument({ data: pdfPagesData[pageIdx].slice() }).promise;
            var page = await pdfjsDoc.getPage(1);
            var wrapWidth = previewWrap.clientWidth || 500;
            var viewport = page.getViewport({ scale: 1 });
            var scale = Math.min(wrapWidth / viewport.width, 1.5);
            var scaledViewport = page.getViewport({ scale: scale });
            previewCanvas.width = scaledViewport.width;
            previewCanvas.height = scaledViewport.height;
            var ctx = previewCanvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
            await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
            previewWrap.scrollTop = 0;
            if (signatureDataUrl) updateSigPosition();
        } catch (err) {
            showNotification('Preview error: ' + err.message, true);
        }
    }

    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 0) { currentPage--; renderPreviewPage(currentPage); }
    });

    nextPageBtn.addEventListener('click', function() {
        if (currentPage < pdfPagesData.length - 1) { currentPage++; renderPreviewPage(currentPage); }
    });

    function resetTool() {
        currentFile = null;
        pdfPagesData = [];
        currentPage = 0;
        pdfDocRef = null;
        signatureDataUrl = null;
        outputBytes = null;
        fileInput.value = '';
        sigTypeInput.value = '';
        sigUploadInput.value = '';
        sigUploadArea.innerHTML = '<span style="font-size:var(--text-xs);color:var(--color-text-light)">Click to upload signature image</span>';
        sigAcceptUpload.style.display = 'none';
        sigOverlay.classList.remove('active');
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        applyBtn.disabled = true;
        previewCanvas.width = 0;
        previewCanvas.height = 0;
        initSigCanvas();
        updateProgress('Adding signature...', 0);
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
                    var pdfBytes = await pdfDocRef.save();
                    pdfPagesData.push(pdfBytes);
                }
                currentPage = 0;
                if (window['pdfjsLib']) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    await renderPreviewPage(0);
                }
                showNotification('PDF loaded with ' + count + ' pages', false);
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
        if (!currentFile || !pdfDocRef || !signatureDataUrl) return;
        if (typeof PDFLib === 'undefined') { showNotification('PDF library is loading', true); return; }
        applyBtn.disabled = true;
        progressContainer.classList.add('show');
        resultsPanel.classList.remove('show');
        updateProgress('Loading PDF...', 10);
        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            updateProgress('Embedding signature...', 40);
            var pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            var pages = pdfDoc.getPages();
            var targetPage = pages[currentPage];
            if (!targetPage) { showNotification('Invalid page', true); return; }
            var pngImage = await pdfDoc.embedPng(signatureDataUrl);
            var size = parseInt(sigSize.value) || 100;
            var dims = pngImage.scale(1);
            var scaleFactor = size / dims.width;
            var x = parseInt(sigX.value) || 50;
            var y = parseInt(sigY.value) || 50;
            var pageHeight = targetPage.getHeight();
            targetPage.drawImage(pngImage, {
                x: x,
                y: pageHeight - y - (dims.height * scaleFactor),
                width: dims.width * scaleFactor,
                height: dims.height * scaleFactor
            });
            updateProgress('Saving signed PDF...', 80);
            outputBytes = await pdfDoc.save();
            updateProgress('Complete!', 100);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                downloadBtn.download = 'signed-' + currentFile.name;
                showNotification('PDF signed successfully!', false);
            }, 500);
        } catch (err) {
            showNotification('Error signing PDF: ' + err.message, true);
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

    initSigCanvas();
    setupDrawSignature();
    makeSignatureDraggable();
});
