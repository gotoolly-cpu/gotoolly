document.addEventListener('DOMContentLoaded', function() {
    if (typeof PDFLib === 'undefined') {
        console.error('pdf-lib not loaded');
        return;
    }

    const { PDFDocument, rgb, degrees } = PDFLib;

    function showNotification(message, isError) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
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
        return rgb(r, g, b);
    }

    function getPositionCoords(pos, pageW, pageH, textW, textH, xOffset, yOffset) {
        var margin = 50;
        var x = margin, y = pageH - margin - textH;
        if (pos.indexOf('top') !== -1) y = pageH - margin - textH;
        else if (pos.indexOf('middle') !== -1) y = (pageH - textH) / 2;
        else if (pos.indexOf('bottom') !== -1) y = margin;
        if (pos.indexOf('left') !== -1) x = margin;
        else if (pos.indexOf('center') !== -1) x = (pageW - textW) / 2;
        else if (pos.indexOf('right') !== -1) x = pageW - margin - textW;
        x += xOffset;
        y += yOffset;
        return { x: Math.max(0, x), y: Math.max(0, y) };
    }

    function getSelectedPosition(panel) {
        var btn = panel.querySelector('.position-btn.active');
        return btn ? btn.getAttribute('data-pos') : 'middle-center';
    }

    function setupPositionButtons(container) {
        var btns = container.querySelectorAll('.position-btn');
        btns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                btns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
        });
    }

    function setupFileInput(input, settings, countEl, applyBtn, callback) {
        var currentFile = null;
        input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file || file.type !== 'application/pdf') {
                showNotification('Please select a PDF file', true);
                return;
            }
            if (file.size > 25 * 1024 * 1024) {
                showNotification('File too large (max 25 MB)', true);
                return;
            }
            currentFile = file;
            settings.style.display = '';
            applyBtn.disabled = false;
            countEl.textContent = file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name;
            callback(file);
        });

        var dropZone = input.parentElement.querySelector('.upload-area') || input.nextElementSibling;
        if (dropZone && dropZone.classList.contains('upload-area')) {
            dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.style.borderColor = 'var(--color-primary)'; });
            dropZone.addEventListener('dragleave', function() { dropZone.style.borderColor = ''; });
            dropZone.addEventListener('drop', function(e) {
                e.preventDefault();
                dropZone.style.borderColor = '';
                if (e.dataTransfer.files.length) {
                    input.files = e.dataTransfer.files;
                    input.dispatchEvent(new Event('change'));
                }
            });
        }

        return {
            getFile: function() { return currentFile; },
            reset: function() {
                currentFile = null;
                input.value = '';
                settings.style.display = 'none';
                applyBtn.disabled = true;
                countEl.textContent = 'No file';
            }
        };
    }

    function setupProgress(prefix) {
        return {
            show: function() { document.getElementById(prefix + '-progress').style.display = ''; },
            hide: function() { document.getElementById(prefix + '-progress').style.display = 'none'; },
            update: function(pct, text) {
                document.getElementById(prefix + '-progress-fill').style.width = pct + '%';
                document.getElementById(prefix + '-progress-percent').textContent = Math.round(pct) + '%';
                if (text) document.getElementById(prefix + '-progress-text').textContent = text;
            }
        };
    }

    function downloadPdf(bytes, filename) {
        var blob = new Blob([bytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    // ========== TAB SWITCHING ==========
    var toolOptions = document.querySelectorAll('.tool-option');
    toolOptions.forEach(function(opt) {
        opt.addEventListener('click', function() {
            toolOptions.forEach(function(o) { o.classList.remove('active'); });
            opt.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
            document.getElementById('tab-' + opt.getAttribute('data-tab')).classList.add('active');
        });
    });

    // ========== ADD TEXT ==========
    (function() {
        var textInput = document.getElementById('text-file-input');
        var textSettings = document.getElementById('text-settings');
        var textApplyBtn = document.getElementById('text-apply-btn');
        var textResetBtn = document.getElementById('text-reset-btn');
        var progress = setupProgress('text');
        var fileHandler = setupFileInput(textInput, textSettings, document.getElementById('text-file-count'), textApplyBtn, function() {});
        setupPositionButtons(document.getElementById('text-settings'));

        textApplyBtn.addEventListener('click', async function() {
            var file = fileHandler.getFile();
            if (!file) return;
            var content = document.getElementById('text-content').value.trim();
            if (!content) { showNotification('Enter some text', true); return; }

            var fontSize = parseInt(document.getElementById('text-font-size').value) || 16;
            var color = hexToRgb(document.getElementById('text-color').value);
            var pos = getSelectedPosition(document.getElementById('text-settings'));
            var xOffset = parseInt(document.getElementById('text-x-offset').value) || 0;
            var yOffset = parseInt(document.getElementById('text-y-offset').value) || 0;

            progress.show();
            progress.update(10, 'Loading PDF...');
            textApplyBtn.disabled = true;

            try {
                var arrayBuffer = await file.arrayBuffer();
                var pdfDoc = await PDFDocument.load(arrayBuffer);
                var pages = pdfDoc.getPages();
                var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

                for (var i = 0; i < pages.length; i++) {
                    progress.update(10 + (80 * (i + 1) / pages.length), 'Adding text to page ' + (i + 1) + '...');
                    var page = pages[i];
                    var dims = page.getSize();
                    var textWidth = font.widthOfTextAtSize(content, fontSize);
                    var coords = getPositionCoords(pos, dims.width, dims.height, textWidth, fontSize, xOffset, yOffset);
                    page.drawText(content, {
                        x: coords.x,
                        y: coords.y,
                        size: fontSize,
                        font: font,
                        color: color
                    });
                }

                progress.update(95, 'Saving...');
                var pdfBytes = await pdfDoc.save();
                var baseName = file.name.replace(/\.pdf$/i, '');
                downloadPdf(pdfBytes, baseName + '_text.pdf');
                progress.update(100, 'Done!');
                showNotification('Text added successfully!');
            } catch (err) {
                console.error(err);
                showNotification('Error: ' + err.message, true);
                progress.hide();
            }
            textApplyBtn.disabled = false;
        });

        textResetBtn.addEventListener('click', function() {
            fileHandler.reset();
            progress.hide();
        });
    })();

    // ========== WATERMARK ==========
    (function() {
        var wmInput = document.getElementById('watermark-file-input');
        var wmSettings = document.getElementById('watermark-settings');
        var wmApplyBtn = document.getElementById('watermark-apply-btn');
        var wmResetBtn = document.getElementById('watermark-reset-btn');
        var progress = setupProgress('watermark');
        var fileHandler = setupFileInput(wmInput, wmSettings, document.getElementById('watermark-file-count'), wmApplyBtn, function() {});

        var opacitySlider = document.getElementById('watermark-opacity');
        var opacityVal = document.getElementById('watermark-opacity-value');
        opacitySlider.addEventListener('input', function() { opacityVal.textContent = opacitySlider.value + '%'; });

        var rotationSlider = document.getElementById('watermark-rotation');
        var rotationVal = document.getElementById('watermark-rotation-value');
        rotationSlider.addEventListener('input', function() { rotationVal.textContent = rotationSlider.value + '°'; });

        wmApplyBtn.addEventListener('click', async function() {
            var file = fileHandler.getFile();
            if (!file) return;
            var text = document.getElementById('watermark-text').value.trim();
            if (!text) { showNotification('Enter watermark text', true); return; }

            var fontSize = parseInt(document.getElementById('watermark-font-size').value) || 50;
            var opacity = parseInt(opacitySlider.value) / 100;
            var rotation = parseInt(rotationSlider.value);
            var colorHex = document.getElementById('watermark-color').value;
            var baseColor = hexToRgb(colorHex);

            progress.show();
            progress.update(10, 'Loading PDF...');
            wmApplyBtn.disabled = true;

            try {
                var arrayBuffer = await file.arrayBuffer();
                var pdfDoc = await PDFDocument.load(arrayBuffer);
                var pages = pdfDoc.getPages();
                var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

                for (var i = 0; i < pages.length; i++) {
                    progress.update(10 + (80 * (i + 1) / pages.length), 'Adding watermark to page ' + (i + 1) + '...');
                    var page = pages[i];
                    var dims = page.getSize();
                    var textWidth = font.widthOfTextAtSize(text, fontSize);
                    var x = (dims.width - textWidth) / 2;
                    var y = dims.height / 2;
                    page.drawText(text, {
                        x: x,
                        y: y,
                        size: fontSize,
                        font: font,
                        color: baseColor,
                        opacity: opacity,
                        rotate: degrees(rotation)
                    });
                }

                progress.update(95, 'Saving...');
                var pdfBytes = await pdfDoc.save();
                var baseName = file.name.replace(/\.pdf$/i, '');
                downloadPdf(pdfBytes, baseName + '_watermarked.pdf');
                progress.update(100, 'Done!');
                showNotification('Watermark added successfully!');
            } catch (err) {
                console.error(err);
                showNotification('Error: ' + err.message, true);
                progress.hide();
            }
            wmApplyBtn.disabled = false;
        });

        wmResetBtn.addEventListener('click', function() {
            fileHandler.reset();
            progress.hide();
        });
    })();

    // ========== PAGE NUMBERS ==========
    (function() {
        var pnInput = document.getElementById('pagenum-file-input');
        var pnSettings = document.getElementById('pagenum-settings');
        var pnApplyBtn = document.getElementById('pagenum-apply-btn');
        var pnResetBtn = document.getElementById('pagenum-reset-btn');
        var progress = setupProgress('pagenum');
        var fileHandler = setupFileInput(pnInput, pnSettings, document.getElementById('pagenum-file-count'), pnApplyBtn, function() {});
        setupPositionButtons(document.getElementById('pagenum-settings'));

        function formatNumber(num, format) {
            switch (format) {
                case '01': return num.toString().padStart(2, '0');
                case 'page': return 'Page ' + num;
                case 'paren': return '(' + num + ')';
                case 'dash': return '- ' + num + ' -';
                default: return num.toString();
            }
        }

        pnApplyBtn.addEventListener('click', async function() {
            var file = fileHandler.getFile();
            if (!file) return;

            var format = document.getElementById('pagenum-format').value;
            var fontSize = parseInt(document.getElementById('pagenum-font-size').value) || 12;
            var color = hexToRgb(document.getElementById('pagenum-color').value);
            var pos = getSelectedPosition(document.getElementById('pagenum-settings'));

            progress.show();
            progress.update(10, 'Loading PDF...');
            pnApplyBtn.disabled = true;

            try {
                var arrayBuffer = await file.arrayBuffer();
                var pdfDoc = await PDFDocument.load(arrayBuffer);
                var pages = pdfDoc.getPages();
                var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

                for (var i = 0; i < pages.length; i++) {
                    progress.update(10 + (80 * (i + 1) / pages.length), 'Adding page number ' + (i + 1) + '...');
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

                progress.update(95, 'Saving...');
                var pdfBytes = await pdfDoc.save();
                var baseName = file.name.replace(/\.pdf$/i, '');
                downloadPdf(pdfBytes, baseName + '_numbered.pdf');
                progress.update(100, 'Done!');
                showNotification('Page numbers added successfully!');
            } catch (err) {
                console.error(err);
                showNotification('Error: ' + err.message, true);
                progress.hide();
            }
            pnApplyBtn.disabled = false;
        });

        pnResetBtn.addEventListener('click', function() {
            fileHandler.reset();
            progress.hide();
        });
    })();
});