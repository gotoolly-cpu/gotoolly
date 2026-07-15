document.addEventListener('DOMContentLoaded', function () {
    function waitForLibs(callback) {
        if (typeof pdfjsLib !== 'undefined') {
            callback();
            return;
        }
        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (typeof pdfjsLib !== 'undefined') {
                clearInterval(interval);
                callback();
            } else if (attempts > 50) {
                clearInterval(interval);
                notify('Libraries failed to load. Please refresh the page.', 'error');
            }
        }, 200);
    }

    waitForLibs(function () {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        var fileInput = document.getElementById('pdf-input');
        var dropZone = document.getElementById('drop-zone');
        var fileInfo = document.getElementById('file-info');
        var fileName = document.getElementById('file-name');
        var fileSize = document.getElementById('file-size');
        var fileStatus = document.getElementById('file-status');
        var filePages = document.getElementById('file-pages');
        var settingsPanel = document.getElementById('settings-panel');
        var qualitySelect = document.getElementById('quality');
        var pageRangeInput = document.getElementById('page-range');
        var convertBtn = document.getElementById('convert-btn');
        var resetBtn = document.getElementById('reset-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var progressContainer = document.getElementById('progress-container');
        var progressFill = document.getElementById('progress-fill');
        var progressText = document.getElementById('progress-text');
        var progressPercent = document.getElementById('progress-percent');
        var resultsPanel = document.getElementById('results-panel');
        var resultsDesc = document.getElementById('results-desc');
        var resultPages = document.getElementById('result-pages');
        var resultSize = document.getElementById('result-size');
        var downloadBtn = document.getElementById('download-btn');
        var newFileBtn = document.getElementById('new-file-btn');
        var imagePreviewGrid = document.getElementById('image-preview-grid');

        var pdfDoc = null;
        var totalPages = 0;
        var cancelled = false;
        var generatedImages = [];

        function init() {
            fileInput.addEventListener('change', handleFileSelect);
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            convertBtn.addEventListener('click', startConversion);
            resetBtn.addEventListener('click', resetTool);
            cancelBtn.addEventListener('click', function () { cancelled = true; });
            newFileBtn.addEventListener('click', resetTool);
        }

        function handleFileSelect(e) {
            var file = e.target.files[0];
            if (!file || file.type !== 'application/pdf') {
                notify('Please select a PDF file', 'error');
                return;
            }
            loadFile(file);
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            var file = e.dataTransfer.files[0];
            if (!file || file.type !== 'application/pdf') {
                notify('Please drop a PDF file', 'error');
                return;
            }
            loadFile(file);
        }

        function loadFile(file) {
            if (file.size > 50 * 1024 * 1024) {
                notify('File too large. Maximum size is 50 MB.', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                var data = new Uint8Array(e.target.result);
                pdfjsLib.getDocument({ data: data }).promise.then(function (pdf) {
                    pdfDoc = pdf;
                    totalPages = pdf.numPages;
                    fileName.textContent = file.name;
                    fileSize.textContent = formatSize(file.size);
                    filePages.textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                    fileStatus.textContent = 'Ready';
                    fileInfo.classList.add('show');
                    settingsPanel.classList.add('show');
                    resultsPanel.classList.remove('show');
                    dropZone.style.display = 'none';
                    notify('PDF loaded successfully', 'success');
                }).catch(function (err) {
                    notify('Failed to load PDF: ' + err.message, 'error');
                });
            };
            reader.readAsArrayBuffer(file);
        }

        function getPageList() {
            var raw = pageRangeInput.value.trim();
            if (!raw) {
                var pages = [];
                for (var i = 1; i <= totalPages; i++) pages.push(i);
                return pages;
            }
            var set = new Set();
            var parts = raw.split(',');
            for (var p = 0; p < parts.length; p++) {
                var part = parts[p].trim();
                if (part.indexOf('-') !== -1) {
                    var range = part.split('-');
                    var start = parseInt(range[0], 10);
                    var end = parseInt(range[1], 10);
                    for (var j = start; j <= end && j <= totalPages; j++) {
                        if (j > 0) set.add(j);
                    }
                } else {
                    var num = parseInt(part, 10);
                    if (num > 0 && num <= totalPages) set.add(num);
                }
            }
            var arr = Array.from(set);
            arr.sort(function (a, b) { return a - b; });
            return arr;
        }

        async function startConversion() {
            if (!pdfDoc) {
                notify('Please load a PDF first', 'error');
                return;
            }
            var pages = getPageList();
            if (pages.length === 0) {
                notify('No valid pages selected', 'error');
                return;
            }
            cancelled = false;
            convertBtn.disabled = true;
            resetBtn.disabled = true;
            progressContainer.classList.add('show');
            progressFill.style.width = '0%';
            progressText.textContent = 'Rendering pages...';
            progressPercent.textContent = '0%';
            generatedImages = [];
            imagePreviewGrid.innerHTML = '';

            try {
                var quality = parseFloat(qualitySelect.value);
                var scale = quality >= 0.9 ? 2 : quality >= 0.7 ? 1.5 : 1;
                var dpiScale = scale;
                var pageImages = [];

                for (var i = 0; i < pages.length; i++) {
                    if (cancelled) {
                        notify('Cancelled', 'error');
                        break;
                    }
                    progressText.textContent = 'Rendering page ' + (i + 1) + ' of ' + pages.length + '...';
                    progressPercent.textContent = Math.round(((i + 1) / pages.length) * 100) + '%';
                    progressFill.style.width = Math.round(((i + 1) / pages.length) * 100) + '%';

                    var page = await pdfDoc.getPage(pages[i]);
                    var viewport = page.getViewport({ scale: dpiScale });
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                    var blob = await new Promise(function (resolve) {
                        canvas.toBlob(function (b) { resolve(b); }, 'image/jpeg', quality);
                    });
                    var url = URL.createObjectURL(blob);
                    pageImages.push({ blob: blob, url: url, name: 'page-' + pages[i] + '.jpg', page: pages[i] });
                    generatedImages.push({ blob: blob, url: url, name: 'page-' + pages[i] + '.jpg' });

                    var thumb = document.createElement('div');
                    thumb.className = 'image-thumb';
                    thumb.innerHTML = '<img src="' + url + '" alt="Page ' + pages[i] + '"><div class="thumb-info"><span class="thumb-name">Page ' + pages[i] + '</span></div>';
                    imagePreviewGrid.appendChild(thumb);

                    await new Promise(function (r) { setTimeout(r, 0); });
                }

                if (!cancelled) {
                    progressText.textContent = 'Finalizing...';
                    progressPercent.textContent = '100%';
                    progressFill.style.width = '100%';

                    var totalSize = pageImages.reduce(function (sum, img) { return sum + img.blob.size; }, 0);
                    resultPages.textContent = pageImages.length + ' image' + (pageImages.length !== 1 ? 's' : '');
                    resultSize.textContent = formatSize(totalSize);
                    resultsPanel.classList.add('show');

                    if (pageImages.length === 1) {
                        downloadBtn.textContent = 'Download JPG';
                        downloadBtn.href = pageImages[0].url;
                        downloadBtn.download = pageImages[0].name;
                    } else {
                        downloadBtn.textContent = 'Download All as ZIP';
                        downloadBtn.onclick = function () { downloadAll(pageImages); };
                    }
                    progressContainer.classList.remove('show');
                    notify('Conversion complete!', 'success');
                } else {
                    progressContainer.classList.remove('show');
                }
            } catch (err) {
                notify('Failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            convertBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function downloadAll(images) {
            try {
                var zip = new JSZip();
                images.forEach(function (img) {
                    zip.file(img.name, img.blob);
                });
                zip.generateAsync({ type: 'blob' }).then(function (blob) {
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'pdf-images.zip';
                    a.click();
                    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
                });
            } catch (e) {
                images.forEach(function (img) {
                    var a = document.createElement('a');
                    a.href = img.url;
                    a.download = img.name;
                    a.click();
                });
            }
        }

        function resetTool() {
            fileInput.value = '';
            pdfDoc = null;
            totalPages = 0;
            cancelled = false;
            generatedImages = [];
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            pageRangeInput.value = '';
            imagePreviewGrid.innerHTML = '';
            dropZone.style.display = '';
            downloadBtn.onclick = null;
            downloadBtn.textContent = 'Download';
        }

        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1048576).toFixed(1) + ' MB';
        }

        function notify(msg, type) {
            var el = document.createElement('div');
            el.className = 'notification ' + (type || 'success');
            el.textContent = msg;
            document.body.appendChild(el);
            setTimeout(function () {
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.3s ease';
                setTimeout(function () { el.remove(); }, 300);
            }, 3000);
        }

        init();
    });
});
