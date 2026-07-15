document.addEventListener('DOMContentLoaded', function () {
    function waitForLibs(callback) {
        if (typeof PDFLib !== 'undefined') {
            callback();
            return;
        }
        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (typeof PDFLib !== 'undefined') {
                clearInterval(interval);
                callback();
            } else if (attempts > 50) {
                clearInterval(interval);
                notify('Libraries failed to load. Please refresh the page.', 'error');
            }
        }, 200);
    }

    waitForLibs(function () {
        var htmlTextarea = document.getElementById('html-input');
        var htmlFileInput = document.getElementById('html-file-input');
        var dropZone = document.getElementById('drop-zone');
        var fileInfo = document.getElementById('file-info');
        var fileName = document.getElementById('file-name');
        var fileStatus = document.getElementById('file-status');
        var settingsPanel = document.getElementById('settings-panel');
        var pageSizeSelect = document.getElementById('page-size');
        var orientationSelect = document.getElementById('orientation');
        var marginsSelect = document.getElementById('margins');
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
        var charCount = document.getElementById('char-count');

        var cancelled = false;

        function init() {
            htmlTextarea.addEventListener('input', function () {
                charCount.textContent = htmlTextarea.value.length + ' characters';
            });
            htmlFileInput.addEventListener('change', handleFileSelect);
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
            if (!file) return;
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
            if (file) loadFile(file);
        }

        function loadFile(file) {
            var ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'html' && ext !== 'htm') {
                notify('Please select an HTML file', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                htmlTextarea.value = e.target.result;
                charCount.textContent = htmlTextarea.value.length + ' characters';
                fileName.textContent = file.name;
                fileStatus.textContent = 'Loaded';
                fileInfo.classList.add('show');
                notify('HTML file loaded', 'success');
            };
            reader.readAsText(file);
        }

        async function startConversion() {
            var html = htmlTextarea.value.trim();
            if (!html) {
                notify('Please enter or upload HTML content', 'error');
                return;
            }
            cancelled = false;
            convertBtn.disabled = true;
            resetBtn.disabled = true;
            progressContainer.classList.add('show');
            progressFill.style.width = '0%';
            progressText.textContent = 'Processing HTML...';
            progressPercent.textContent = '0%';

            try {
                var pdfDoc = await PDFLib.PDFDocument.create();
                var sizeMap = { 'a4': [595, 842], 'letter': [612, 792], 'a3': [842, 1191] };
                var orientation = orientationSelect.value;
                var marginVal = parseInt(marginsSelect.value, 10);
                var baseSize = sizeMap[pageSizeSelect.value] || [595, 842];
                var pageW = orientation === 'landscape' ? baseSize[1] : baseSize[0];
                var pageH = orientation === 'landscape' ? baseSize[0] : baseSize[1];
                var m = marginVal;

                progressPercent.textContent = '30%';
                progressFill.style.width = '30%';
                progressText.textContent = 'Rendering HTML content...';

                var renderDiv = document.createElement('div');
                renderDiv.id = 'html-render-target';
                renderDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + (pageW - 2 * m) + 'px;padding:' + m + 'px;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;background:#fff;';
                renderDiv.innerHTML = html;
                document.body.appendChild(renderDiv);

                await new Promise(function (r) { setTimeout(r, 100); });

                var totalHeight = renderDiv.scrollHeight;
                var usableHeight = pageH - 2 * m;
                var totalPages = Math.ceil(totalHeight / pageH);
                var rendered = 0;

                for (var p = 0; p < totalPages; p++) {
                    if (cancelled) {
                        notify('Cancelled', 'error');
                        break;
                    }
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    canvas.width = pageW;
                    canvas.height = pageH;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, pageW, pageH);

                    ctx.translate(0, -(p * pageH));
                    ctx.beginPath();
                    ctx.rect(0, p * pageH, pageW, pageH);
                    ctx.clip();

                    var elements = renderDiv.querySelectorAll('*');
                    for (var i = 0; i < elements.length; i++) {
                        var el = elements[i];
                        var style = window.getComputedStyle(el);
                        var rect = el.getBoundingClientRect();
                        var renderRect = el.getBoundingClientRect();
                        var elTop = renderRect.top + renderDiv.scrollTop;
                        var elLeft = renderRect.left;

                        if (elTop + rect.height < p * pageH || elTop > (p + 1) * pageH) continue;

                        ctx.font = style.fontSize + ' ' + style.fontFamily;
                        ctx.fillStyle = style.color;
                        var text = el.textContent || '';
                        var lines = text.split('\n');
                        var yPos = elTop - p * pageH + parseInt(style.fontSize, 10);
                        for (var li = 0; li < lines.length; li++) {
                            var line = lines[li].trim();
                            if (line) {
                                ctx.fillText(line, elLeft, yPos);
                            }
                            yPos += parseInt(style.fontSize, 10) * 1.5;
                        }
                    }

                    var imgData = canvas.toDataURL('image/png');
                    var img = await pdfDoc.embedPng(imgData);
                    var page = pdfDoc.addPage([pageW, pageH]);
                    page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
                    canvas = null;

                    rendered++;
                    progressPercent.textContent = Math.round((rendered / totalPages) * 70 + 30) + '%';
                    progressFill.style.width = Math.round((rendered / totalPages) * 70 + 30) + '%';
                    progressText.textContent = 'Rendering page ' + rendered + ' of ' + totalPages + '...';
                }

                document.body.removeChild(renderDiv);

                progressText.textContent = 'Finalizing...';
                progressPercent.textContent = '100%';
                progressFill.style.width = '100%';

                var pdfBytes = await pdfDoc.save();
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                downloadBtn.href = url;
                downloadBtn.download = 'document.pdf';

                resultPages.textContent = pdfDoc.getPageCount() + ' page' + (pdfDoc.getPageCount() !== 1 ? 's' : '');
                resultSize.textContent = formatSize(blob.size);
                resultsPanel.classList.add('show');
                progressContainer.classList.remove('show');
                notify('PDF created!', 'success');
            } catch (err) {
                notify('Failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            convertBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function resetTool() {
            htmlTextarea.value = '';
            htmlFileInput.value = '';
            cancelled = false;
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            charCount.textContent = '0 characters';
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
