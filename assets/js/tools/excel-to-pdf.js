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
                progressPercent.textContent = '30%';
                progressFill.style.width = '30%';

                var pdfDoc = await PDFLib.PDFDocument.create();
                var pageWidth = orientation === 'landscape' ? 842 : 595;
                var pageHeight = orientation === 'landscape' ? 595 : 842;
                var margin = 36;
                var usableWidth = pageWidth - 2 * margin;
                var fontSize = 8;
                var rowH = fontSize * 2;
                var pad = 4;
                var headerBg = PDFLib.rgb(0.25, 0.35, 0.55);
                var headerFg = PDFLib.rgb(1, 1, 1);
                var altBg = PDFLib.rgb(0.93, 0.94, 0.96);
                var whiteBg = PDFLib.rgb(1, 1, 1);
                var borderC = PDFLib.rgb(0.78, 0.78, 0.78);
                var textC = PDFLib.rgb(0.1, 0.1, 0.1);
                var emptyC = PDFLib.rgb(0.55, 0.55, 0.55);

                while (json.length > 0) {
                    var lastRow = json[json.length - 1];
                    var hasData = lastRow.some(function(c) { return c !== undefined && c !== null && c !== ''; });
                    if (hasData) break;
                    json.pop();
                }

                var numCols = 0;
                json.forEach(function(row) { numCols = Math.max(numCols, row.length); });
                if (numCols === 0) { notify('No data found in sheet', 'error'); return; }

                var colW = [];
                for (var ci = 0; ci < numCols; ci++) {
                    var mx = 0;
                    for (var ri = 0; ri < json.length; ri++) {
                        var cv = json[ri] && json[ri][ci] !== undefined ? String(json[ri][ci]) : '';
                        mx = Math.max(mx, cv.length);
                    }
                    colW[ci] = Math.max(mx * fontSize * 0.52 + pad * 2, 18);
                }

                var totalW = colW.reduce(function(a, b) { return a + b; }, 0);
                if (fit && totalW > usableWidth) {
                    var s = (usableWidth - (numCols - 1) * 0.5) / totalW;
                    colW = colW.map(function(w) { return w * s; });
                    totalW = colW.reduce(function(a, b) { return a + b; }, 0);
                }

                var startX = margin + Math.max(0, (usableWidth - totalW) / 2);

                function trunc(t, w) {
                    var maxC = Math.floor((w - pad * 2) / (fontSize * 0.52));
                    if (t.length > maxC && maxC > 2) return t.substring(0, maxC - 2) + '\u2026';
                    return t;
                }

                function drawHeaderRow(pageRef, yPos) {
                    var x = startX;
                    for (var ci = 0; ci < numCols; ci++) {
                        var w = colW[ci] || 50;
                        pageRef.drawRectangle({ x: x, y: yPos, width: w, height: rowH, color: headerBg, borderColor: borderC, borderWidth: 0.5 });
                        var txt = json[0] && json[0][ci] !== undefined ? String(json[0][ci]) : '';
                        pageRef.drawText(trunc(txt, w), { x: x + pad, y: yPos + (rowH - fontSize) / 2 - 1, size: fontSize, color: headerFg });
                        x += w;
                    }
                }

                function drawDataRow(pageRef, yPos, rowData, isEven) {
                    var x = startX;
                    var bg = isEven ? altBg : whiteBg;
                    for (var ci = 0; ci < numCols; ci++) {
                        var w = colW[ci] || 50;
                        pageRef.drawRectangle({ x: x, y: yPos, width: w, height: rowH, color: bg, borderColor: borderC, borderWidth: 0.5 });
                        var val = rowData && rowData[ci] !== undefined ? String(rowData[ci]) : '';
                        var display = val === '' ? '-' : val;
                        pageRef.drawText(trunc(display, w), { x: x + pad, y: yPos + (rowH - fontSize) / 2 - 1, size: fontSize, color: val === '' ? emptyC : textC });
                        x += w;
                    }
                }

                var page = pdfDoc.addPage([pageWidth, pageHeight]);
                var y = pageHeight - margin - rowH;

                drawHeaderRow(page, y);
                y -= rowH;

                var drawnRowCount = 0;
                for (var r = 1; r < json.length; r++) {
                    if (cancelled) { notify('Conversion cancelled', 'error'); break; }
                    if (y < margin + rowH) {
                        page = pdfDoc.addPage([pageWidth, pageHeight]);
                        y = pageHeight - margin - rowH;
                        drawHeaderRow(page, y);
                        y -= rowH;
                    }
                    drawDataRow(page, y, json[r], drawnRowCount % 2 === 1);
                    y -= rowH;
                    drawnRowCount++;

                    var pct = 30 + Math.round((r / json.length) * 70);
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
