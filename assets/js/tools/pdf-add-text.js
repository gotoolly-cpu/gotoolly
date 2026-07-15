document.addEventListener('DOMContentLoaded', function () {
    if (typeof PDFLib === 'undefined') {
        console.error('pdf-lib not loaded');
        return;
    }
    var { PDFDocument } = PDFLib;

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 3500);
    }

    function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16) / 255;
        var g = parseInt(hex.slice(3, 5), 16) / 255;
        var b = parseInt(hex.slice(5, 7), 16) / 255;
        return PDFLib.rgb(r, g, b);
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
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
        });
    }

    function downloadPdf(bytes, filename) {
        var blob = new Blob([bytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    function setupFileInput(input, settings, applyBtn) {
        var currentFile = null;
        input.addEventListener('change', function (e) {
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
            settings.classList.add('show');
            applyBtn.disabled = false;
        });
        var dropZone = document.querySelector('.upload-area');
        if (dropZone) {
            dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.style.borderColor = 'var(--color-primary)'; });
            dropZone.addEventListener('dragleave', function () { dropZone.style.borderColor = ''; });
            dropZone.addEventListener('drop', function (e) {
                e.preventDefault();
                dropZone.style.borderColor = '';
                if (e.dataTransfer.files.length) {
                    input.files = e.dataTransfer.files;
                    input.dispatchEvent(new Event('change'));
                }
            });
        }
        return {
            getFile: function () { return currentFile; },
            reset: function () {
                currentFile = null;
                input.value = '';
                settings.classList.remove('show');
                applyBtn.disabled = true;
            }
        };
    }

    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var fileHandler = setupFileInput(fileInput, settingsPanel, applyBtn);
    setupPositionButtons(settingsPanel);

    applyBtn.addEventListener('click', async function () {
        var file = fileHandler.getFile();
        if (!file) return;
        var content = document.getElementById('text-content').value.trim();
        if (!content) { showNotification('Enter some text', true); return; }
        var fontSize = parseInt(document.getElementById('text-font-size').value) || 16;
        var color = hexToRgb(document.getElementById('text-color').value);
        var pos = getSelectedPosition(settingsPanel);
        var xOffset = parseInt(document.getElementById('text-x-offset').value) || 0;
        var yOffset = parseInt(document.getElementById('text-y-offset').value) || 0;

        var progressSection = document.getElementById('progress-section');
        var progressFill = document.getElementById('progress-fill');
        var progressPercent = document.getElementById('progress-percent');
        var progressText = document.getElementById('progress-text');

        progressSection.style.display = 'block';
        applyBtn.disabled = true;

        try {
            var arrayBuffer = await file.arrayBuffer();
            var pdfDoc = await PDFDocument.load(arrayBuffer);
            var pages = pdfDoc.getPages();
            var font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

            for (var i = 0; i < pages.length; i++) {
                var pct = 10 + (80 * (i + 1) / pages.length);
                progressFill.style.width = pct + '%';
                progressPercent.textContent = Math.round(pct) + '%';
                progressText.textContent = 'Adding text to page ' + (i + 1) + '...';
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

            progressFill.style.width = '95%';
            progressPercent.textContent = '95%';
            progressText.textContent = 'Saving...';
            var pdfBytes = await pdfDoc.save();
            var baseName = file.name.replace(/\.pdf$/i, '');
            downloadPdf(pdfBytes, baseName + '_text.pdf');
            progressFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';
            showNotification('Text added successfully!');
        } catch (err) {
            console.error(err);
            showNotification('Error: ' + err.message, true);
            progressSection.style.display = 'none';
        }
        applyBtn.disabled = false;
    });

    resetBtn.addEventListener('click', function () {
        fileHandler.reset();
        document.getElementById('progress-section').style.display = 'none';
    });
});
