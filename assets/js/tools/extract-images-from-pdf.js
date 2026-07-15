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
        var minSizeSelect = document.getElementById('min-size');
        var extractBtn = document.getElementById('extract-btn');
        var resetBtn = document.getElementById('reset-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var progressContainer = document.getElementById('progress-container');
        var progressFill = document.getElementById('progress-fill');
        var progressText = document.getElementById('progress-text');
        var progressPercent = document.getElementById('progress-percent');
        var resultsPanel = document.getElementById('results-panel');
        var resultsDesc = document.getElementById('results-desc');
        var resultCount = document.getElementById('result-count');
        var resultTotalSize = document.getElementById('result-total-size');
        var downloadBtn = document.getElementById('download-btn');
        var newFileBtn = document.getElementById('new-file-btn');
        var extractedGrid = document.getElementById('extracted-grid');

        var pdfDoc = null;
        var totalPages = 0;
        var cancelled = false;
        var extractedImages = [];

        function init() {
            fileInput.addEventListener('change', handleFileSelect);
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            extractBtn.addEventListener('click', startExtraction);
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

        function tryConvertImageObj(imgObj) {
            var w = imgObj.width;
            var h = imgObj.height;
            if (!w || !h || w > 4000 || h > 4000) return null;
            var rawData = imgObj.data;
            if (!rawData) return null;
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            var imageData = ctx.createImageData(w, h);
            var pixels = imageData.data;
            try {
                if (rawData.length === w * h * 4) {
                    for (var pi = 0; pi < pixels.length; pi++) {
                        pixels[pi] = rawData[pi];
                    }
                } else if (rawData.length === w * h * 3) {
                    for (var pj = 0; pj < w * h; pj++) {
                        pixels[pj * 4] = rawData[pj * 3];
                        pixels[pj * 4 + 1] = rawData[pj * 3 + 1];
                        pixels[pj * 4 + 2] = rawData[pj * 3 + 2];
                        pixels[pj * 4 + 3] = 255;
                    }
                } else if (rawData.length === w * h) {
                    for (var pk = 0; pk < w * h; pk++) {
                        pixels[pk * 4] = rawData[pk];
                        pixels[pk * 4 + 1] = rawData[pk];
                        pixels[pk * 4 + 2] = rawData[pk];
                        pixels[pk * 4 + 3] = 255;
                    }
                } else {
                    return null;
                }
                ctx.putImageData(imageData, 0, 0);
                return canvas;
            } catch (e) {
                return null;
            }
        }

        async function startExtraction() {
            if (!pdfDoc) {
                notify('Please load a PDF first', 'error');
                return;
            }
            cancelled = false;
            extractBtn.disabled = true;
            resetBtn.disabled = true;
            progressContainer.classList.add('show');
            progressFill.style.width = '0%';
            progressText.textContent = 'Analyzing PDF structure...';
            progressPercent.textContent = '0%';
            extractedImages = [];
            extractedGrid.innerHTML = '';

            try {
                var minSize = parseInt(minSizeSelect.value, 10) * 1024;

                for (var i = 1; i <= totalPages; i++) {
                    if (cancelled) {
                        notify('Cancelled', 'error');
                        break;
                    }
                    progressText.textContent = 'Scanning page ' + i + ' of ' + totalPages + '...';
                    progressPercent.textContent = Math.round((i / totalPages) * 50) + '%';
                    progressFill.style.width = Math.round((i / totalPages) * 50) + '%';

                    var page = await pdfDoc.getPage(i);
                    var ops = await page.getOperatorList();
                    var pageImages = [];
                    var imgIndex = 0;

                    for (var j = 0; j < ops.fnArray.length; j++) {
                        if (cancelled) break;
                        if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject ||
                            ops.fnArray[j] === pdfjsLib.OPS.paintInlineImageXObject) {
                            var imgName = ops.argsArray[j][0];
                            if (typeof imgName === 'string') {
                                try {
                                    if (page.objs && typeof page.objs.get === 'function') {
                                        var imgObj = await page.objs.get(imgName);
                                        if (imgObj && imgObj.width > 0 && imgObj.height > 0) {
                                            var imgCanvas = tryConvertImageObj(imgObj);
                                            if (imgCanvas) {
                                                var blob = await new Promise(function (resolve) {
                                                    imgCanvas.toBlob(function (b) { resolve(b); }, 'image/png');
                                                });
                                                if (blob && blob.size >= minSize) {
                                                    var url = URL.createObjectURL(blob);
                                                    var name = 'page' + i + '_img' + (++imgIndex) + '.png';
                                                    pageImages.push({ blob: blob, url: url, name: name, page: i, width: imgObj.width, height: imgObj.height });
                                                }
                                            }
                                        }
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                        }
                    }

                    for (var k = 0; k < pageImages.length; k++) {
                        extractedImages.push(pageImages[k]);
                        var thumb = document.createElement('div');
                        thumb.className = 'image-thumb';
                        thumb.innerHTML = '<img src="' + pageImages[k].url + '" alt="' + pageImages[k].name + '">' +
                            '<div class="thumb-info">' +
                            '<span class="thumb-name">' + pageImages[k].width + 'x' + pageImages[k].height + '</span>' +
                            '<span class="thumb-size">' + formatSize(pageImages[k].blob.size) + '</span>' +
                            '<a href="' + pageImages[k].url + '" download="' + pageImages[k].name + '" class="btn btn-sm btn-secondary">Save</a>' +
                            '</div>';
                        extractedGrid.appendChild(thumb);
                    }

                    var scanPct = Math.round((i / totalPages) * 50);
                    progressPercent.textContent = scanPct + '%';
                    progressFill.style.width = scanPct + '%';
                }

                if (!cancelled) {
                    progressText.textContent = 'Finalizing...';
                    progressPercent.textContent = '100%';
                    progressFill.style.width = '100%';

                    resultCount.textContent = extractedImages.length + ' image' + (extractedImages.length !== 1 ? 's' : '');
                    var totalBytes = extractedImages.reduce(function (s, img) { return s + img.blob.size; }, 0);
                    resultTotalSize.textContent = formatSize(totalBytes);
                    resultsPanel.classList.add('show');
                    if (extractedImages.length > 0) {
                        resultsDesc.textContent = 'Found and extracted images from your PDF.';
                        downloadBtn.style.display = 'inline-flex';
                        downloadBtn.onclick = function () { downloadAll(); };
                    } else {
                        resultsDesc.textContent = 'No embedded images detected via browser parsing. PDF image extraction from internal streams has limited browser support.';
                        downloadBtn.style.display = 'none';
                    }

                    progressContainer.classList.remove('show');
                    notify('Extraction complete!', 'success');
                } else {
                    progressContainer.classList.remove('show');
                }
            } catch (err) {
                notify('Extraction failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            extractBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function downloadAll() {
            if (typeof JSZip !== 'undefined') {
                var zip = new JSZip();
                extractedImages.forEach(function (img) {
                    zip.file(img.name, img.blob);
                });
                zip.generateAsync({ type: 'blob' }).then(function (blob) {
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'extracted-images.zip';
                    a.click();
                    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
                });
            } else {
                extractedImages.forEach(function (img) {
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
            extractedImages = [];
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            extractedGrid.innerHTML = '';
            dropZone.style.display = '';
            downloadBtn.style.display = 'none';
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
