document.addEventListener('DOMContentLoaded', function () {
    function waitForLibs(callback) {
        if (typeof XLSX !== 'undefined' && typeof PDFLib !== 'undefined') {
            callback();
            return;
        }
        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (typeof XLSX !== 'undefined' && typeof PDFLib !== 'undefined') {
                clearInterval(interval);
                callback();
            } else if (attempts > 50) {
                clearInterval(interval);
                notify('Libraries failed to load. Please refresh the page.', 'error');
            }
        }, 200);
    }

    waitForLibs(function () {
        var fileInput = document.getElementById('excel-input');
        var dropZone = document.getElementById('drop-zone');
        var fileInfo = document.getElementById('file-info');
        var fileName = document.getElementById('file-name');
        var fileSize = document.getElementById('file-size');
        var fileStatus = document.getElementById('file-status');
        var settingsPanel = document.getElementById('settings-panel');
        var sheetSelect = document.getElementById('sheet-select');
        var orientationSelect = document.getElementById('orientation');
        var fitToPage = document.getElementById('fit-to-page');
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

        var workbook = null;
        var cancelled = false;

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
            if (file.size > 50 * 1024 * 1024) {
                notify('File too large. Maximum size is 50 MB.', 'error');
                return;
            }
            var ext = file.name.split('.').pop().toLowerCase();
            if (!['xlsx', 'xls'].includes(ext)) {
                notify('Please select an Excel file (.xlsx or .xls)', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    var data = new Uint8Array(e.target.result);
                    workbook = XLSX.read(data, { type: 'array' });
                    fileName.textContent = file.name;
                    fileSize.textContent = formatSize(file.size);
                    fileStatus.textContent = 'Loaded';
                    fileInfo.classList.add('show');
                    settingsPanel.classList.add('show');
                    resultsPanel.classList.remove('show');
                    dropZone.style.display = 'none';

                    sheetSelect.innerHTML = '';
                    workbook.SheetNames.forEach(function (name) {
                        var opt = document.createElement('option');
                        opt.value = name;
                        opt.textContent = name;
                        sheetSelect.appendChild(opt);
                    });
                    notify('Excel file loaded successfully', 'success');
                } catch (err) {
                    notify('Failed to load Excel: ' + err.message, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        }

        async function startConversion() {
            if (!workbook) {
                notify('Please load an Excel file first', 'error');
                return;
            }
            cancelled = false;
            convertBtn.disabled = true;
            resetBtn.disabled = true;
            progressContainer.classList.add('show');
            progressFill.style.width = '0%';
            progressText.textContent = 'Reading data...';
            progressPercent.textContent = '0%';

            try {
                var sheetName = sheetSelect.value;
                var ws = workbook.Sheets[sheetName];
                var json = XLSX.utils.sheet_to_json(ws, { header: 1 });
                var orientation = orientationSelect.value;
                var fit = fitToPage.checked;

                progressText.textContent = 'Generating PDF...';
                progressPercent.textContent = '50%';
                progressFill.style.width = '50%';

                var pdfDoc = await PDFLib.PDFDocument.create();
                var pageWidth = orientation === 'landscape' ? 842 : 595;
                var pageHeight = orientation === 'landscape' ? 595 : 842;
                var margin = 40;
                var usableWidth = pageWidth - 2 * margin;
                var fontSize = 9;
                var lineHeight = fontSize * 1.5;
                var colWidths = [];
                var headerRow = json[0] || [];

                for (var c = 0; c < headerRow.length; c++) {
                    colWidths[c] = Math.min(usableWidth / Math.max(headerRow.length, 1) * 1.2, 120);
                }

                var page = pdfDoc.addPage([pageWidth, pageHeight]);
                var y = pageHeight - margin;

                if (headerRow.length > 0) {
                    var headerText = headerRow.map(function (h, i) {
                        return padCell(String(h || ''), colWidths[i], fontSize);
                    }).join(' | ');
                    page.drawText(headerText, { x: margin, y: y, size: fontSize, color: PDFLib.rgb(0.2, 0.2, 0.2) });
                    y -= lineHeight + 4;
                    page.drawLine({
                        start: { x: margin, y: y },
                        end: { x: pageWidth - margin, y: y },
                        thickness: 0.5,
                        color: PDFLib.rgb(0.6, 0.6, 0.6)
                    });
                    y -= 4;
                }

                for (var r = 1; r < json.length; r++) {
                    if (cancelled) {
                        notify('Conversion cancelled', 'error');
                        break;
                    }
                    var row = json[r];
                    if (y < margin + 20) {
                        page = pdfDoc.addPage([pageWidth, pageHeight]);
                        y = pageHeight - margin;
                    }
                    var text = '';
                    for (var c2 = 0; c2 < Math.max(row.length, 1); c2++) {
                        var val = row[c2] !== undefined ? String(row[c2]) : '';
                        text += padCell(val, colWidths[c2] || 80, fontSize);
                        if (c2 < Math.max(row.length, 1) - 1) text += ' | ';
                    }
                    page.drawText(text, { x: margin, y: y, size: fontSize, color: PDFLib.rgb(0, 0, 0) });
                    y -= lineHeight;

                    var pct = Math.round((r / json.length) * 100);
                    progressPercent.textContent = pct + '%';
                    progressFill.style.width = pct + '%';
                    progressText.textContent = 'Processing row ' + r + ' of ' + json.length + '...';
                }

                progressText.textContent = 'Finalizing...';
                progressPercent.textContent = '100%';
                progressFill.style.width = '100%';

                var pdfBytes = await pdfDoc.save();
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                downloadBtn.href = url;
                downloadBtn.download = fileInfo.classList.contains('show') ? (document.getElementById('file-name').textContent.replace(/\.[^.]+$/, '') + '.pdf') : 'output.pdf';

                resultPages.textContent = pdfDoc.getPageCount() + ' page' + (pdfDoc.getPageCount() !== 1 ? 's' : '');
                resultSize.textContent = formatSize(blob.size);
                resultsPanel.classList.add('show');
                progressContainer.classList.remove('show');

                notify('Conversion complete!', 'success');
            } catch (err) {
                notify('Conversion failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            convertBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function padCell(text, width, fontSize) {
            var approxCharWidth = fontSize * 0.6;
            var maxChars = Math.floor(width / approxCharWidth);
            if (text.length > maxChars) {
                return text.substring(0, maxChars - 1) + '\u2026';
            }
            return text + ' '.repeat(maxChars - text.length);
        }

        function resetTool() {
            fileInput.value = '';
            workbook = null;
            cancelled = false;
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            dropZone.style.display = '';
            sheetSelect.innerHTML = '<option value="">Select a sheet</option>';
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
