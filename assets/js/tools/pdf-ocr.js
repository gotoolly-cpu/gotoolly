document.addEventListener('DOMContentLoaded', function () {
    function waitForLibs(callback) {
        if (typeof pdfjsLib !== 'undefined' && typeof Tesseract !== 'undefined') {
            callback();
            return;
        }
        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (typeof pdfjsLib !== 'undefined' && typeof Tesseract !== 'undefined') {
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
        var langSelect = document.getElementById('ocr-lang');
        var outputFormat = document.getElementById('output-format');
        var convertBtn = document.getElementById('ocr-btn');
        var resetBtn = document.getElementById('reset-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var progressContainer = document.getElementById('progress-container');
        var progressFill = document.getElementById('progress-fill');
        var progressText = document.getElementById('progress-text');
        var progressPercent = document.getElementById('progress-percent');
        var resultsPanel = document.getElementById('results-panel');
        var resultsDesc = document.getElementById('results-desc');
        var downloadBtn = document.getElementById('download-btn');
        var newFileBtn = document.getElementById('new-file-btn');
        var ocrOutput = document.getElementById('ocr-output');
        var resultsActions = document.getElementById('results-actions');

        var pdfDoc = null;
        var totalPages = 0;
        var cancelled = false;
        var ocrResults = [];

        function init() {
            fileInput.addEventListener('change', handleFileSelect);
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            convertBtn.addEventListener('click', startOCR);
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
            if (file.size > 30 * 1024 * 1024) {
                notify('File too large. Maximum size is 30 MB for OCR.', 'error');
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
                    notify('PDF loaded. Ready for OCR.', 'success');
                }).catch(function (err) {
                    notify('Failed to load PDF: ' + err.message, 'error');
                });
            };
            reader.readAsArrayBuffer(file);
        }

        async function startOCR() {
            if (!pdfDoc) {
                notify('Please load a PDF first', 'error');
                return;
            }
            cancelled = false;
            convertBtn.disabled = true;
            resetBtn.disabled = true;
            progressContainer.classList.add('show');
            progressFill.style.width = '0%';
            progressText.textContent = 'Initializing OCR engine...';
            progressPercent.textContent = '0%';
            ocrResults = [];
            ocrOutput.innerHTML = '';

            try {
                var lang = langSelect.value;
                var format = outputFormat.value;

                for (var i = 1; i <= totalPages; i++) {
                    if (cancelled) {
                        notify('OCR cancelled', 'error');
                        break;
                    }

                    progressText.textContent = 'Rendering page ' + i + ' of ' + totalPages + '...';
                    var pagePct = Math.round(((i - 1) / totalPages) * 100 * 0.3);
                    progressPercent.textContent = pagePct + '%';
                    progressFill.style.width = pagePct + '%';

                    var page = await pdfDoc.getPage(i);
                    var viewport = page.getViewport({ scale: 2 });
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                    var imageData = canvas.toDataURL('image/png');

                    progressText.textContent = 'Running OCR on page ' + i + ' (this may take a while)...';
                    var ocrPct = Math.round(((i - 1) / totalPages) * 100 * 0.7 + 30);
                    progressPercent.textContent = ocrPct + '%';
                    progressFill.style.width = ocrPct + '%';

                    try {
                        var result = await Tesseract.recognize(imageData, lang, {
                            logger: function (m) {
                                if (m.status === 'recognizing text') {
                                    var subPct = Math.round(((i - 1) / totalPages) * 100 * 0.7 + 30 + (m.progress || 0) * 70 / totalPages);
                                    progressPercent.textContent = Math.min(subPct, 99) + '%';
                                    progressFill.style.width = Math.min(subPct, 99) + '%';
                                }
                            }
                        });
                        ocrResults.push({ page: i, text: result.data.text });
                    } catch (ocrErr) {
                        ocrResults.push({ page: i, text: '(OCR failed on this page: ' + ocrErr.message + ')' });
                    }

                    var displayPct = Math.round((i / totalPages) * 100);
                    progressPercent.textContent = displayPct + '%';
                    progressFill.style.width = displayPct + '%';
                }

                if (!cancelled) {
                    progressText.textContent = 'Generating output...';
                    progressPercent.textContent = '100%';
                    progressFill.style.width = '100%';

                    var fullText = ocrResults.map(function (r) {
                        return '--- Page ' + r.page + ' ---\n' + r.text;
                    }).join('\n\n');

                    ocrOutput.textContent = fullText;
                    resultsPanel.classList.add('show');
                    resultsActions.classList.add('show');

                    if (format === 'text') {
                        downloadBtn.textContent = 'Download Text';
                        downloadBtn.onclick = function () {
                            var blob = new Blob([fullText], { type: 'text/plain' });
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url;
                            a.download = 'ocr-output.txt';
                            a.click();
                        };
                    } else {
                        downloadBtn.textContent = 'Download Searchable PDF (Text)';
                        downloadBtn.onclick = function () {
                            var blob = new Blob([fullText], { type: 'text/plain' });
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url;
                            a.download = 'ocr-output.txt';
                            a.click();
                        };
                    }

                    progressContainer.classList.remove('show');
                    notify('OCR complete!', 'success');
                } else {
                    progressContainer.classList.remove('show');
                }
            } catch (err) {
                notify('OCR failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            convertBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function resetTool() {
            fileInput.value = '';
            pdfDoc = null;
            totalPages = 0;
            cancelled = false;
            ocrResults = [];
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            ocrOutput.innerHTML = '';
            resultsActions.classList.remove('show');
            dropZone.style.display = '';
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
