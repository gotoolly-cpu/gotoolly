document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var backBtn = document.getElementById('back-btn');
    var downloadBtn = document.getElementById('download-btn');
    var imagePreview = document.getElementById('image-preview');
    var resultPreview = document.getElementById('result-preview');
    var resultSlot = document.getElementById('result-slot');
    var previewCompare = document.getElementById('preview-compare');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');

    var currentFile = null;
    var currentImage = null;
    var resultBlobUrl = null;
    var resultExt = '.jpg';

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
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

    function getSelectedPosition() {
        var btn = document.querySelector('.position-btn.active');
        return btn ? btn.getAttribute('data-pos') : 'bottom-right';
    }

    function getPositionCoords(pos, canvasW, canvasH, textW, textH) {
        var margin = 30;
        var x = margin, y = canvasH - margin - textH;
        if (pos.indexOf('top') !== -1) y = margin;
        else if (pos.indexOf('middle') !== -1) y = (canvasH - textH) / 2;
        else if (pos.indexOf('bottom') !== -1) y = canvasH - margin - textH;
        if (pos.indexOf('left') !== -1) x = margin;
        else if (pos.indexOf('center') !== -1) x = (canvasW - textW) / 2;
        else if (pos.indexOf('right') !== -1) x = canvasW - margin - textW;
        return { x: Math.max(0, x), y: Math.max(0, y) };
    }

    var dropZone = document.querySelector('.upload-area');
    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.style.borderColor = 'var(--color-primary)'; });
        dropZone.addEventListener('dragleave', function() { dropZone.style.borderColor = ''; });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropZone.style.borderColor = '';
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    }

    setupPositionButtons(document.getElementById('settings-panel'));

    var opacitySlider = document.getElementById('watermark-opacity');
    var opacityVal = document.getElementById('watermark-opacity-value');
    opacitySlider.addEventListener('input', function() { opacityVal.textContent = opacitySlider.value + '%'; });
    var rotationSlider = document.getElementById('watermark-rotation');
    var rotationVal = document.getElementById('watermark-rotation-value');
    rotationSlider.addEventListener('input', function() { rotationVal.textContent = rotationSlider.value + '\u00B0'; });

    fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
            showNotification('Please select a JPG, PNG, or WebP image', true);
            return;
        }
        currentFile = file;
        var img = new Image();
        img.onload = function() {
            currentImage = img;
            var maxDim = 300;
            var scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
            var previewCanvas = document.createElement('canvas');
            previewCanvas.width = img.width * scale;
            previewCanvas.height = img.height * scale;
            var pctx = previewCanvas.getContext('2d');
            pctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
            imagePreview.innerHTML = '';
            imagePreview.appendChild(previewCanvas);
            previewCompare.style.display = 'grid';
        };
        img.src = URL.createObjectURL(file);
        settingsPanel.classList.add('show');
        applyBtn.disabled = false;

        resultSlot.style.display = 'none';
        resultPreview.innerHTML = '';
        downloadBtn.style.display = 'none';
        backBtn.style.display = 'none';
        applyBtn.style.display = '';
        if (resultBlobUrl) { URL.revokeObjectURL(resultBlobUrl); resultBlobUrl = null; }
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;
        var text = document.getElementById('watermark-text').value.trim();
        if (!text) { showNotification('Enter watermark text', true); return; }
        var fontSize = parseInt(document.getElementById('watermark-font-size').value) || 36;
        var color = document.getElementById('watermark-color').value;
        var opacity = parseInt(opacitySlider.value) / 100;
        var rotation = parseInt(rotationSlider.value);
        var pos = getSelectedPosition();

        progressSection.style.display = 'block';
        applyBtn.disabled = true;
        progressText.textContent = 'Adding watermark...';
        progressFill.style.width = '30%';
        progressPercent.textContent = '30%';

        var canvas = document.createElement('canvas');
        canvas.width = currentImage.naturalWidth;
        canvas.height = currentImage.naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        progressFill.style.width = '50%';
        progressPercent.textContent = '50%';

        ctx.drawImage(currentImage, 0, 0);
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.font = fontSize + 'px Arial, sans-serif';
        ctx.textBaseline = 'top';

        var textWidth = ctx.measureText(text).width;
        var coords = getPositionCoords(pos, canvas.width, canvas.height, textWidth, fontSize);

        ctx.translate(coords.x + textWidth / 2, coords.y + fontSize / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.fillText(text, -textWidth / 2, -fontSize / 2);
        ctx.restore();

        progressFill.style.width = '80%';
        progressPercent.textContent = '80%';
        progressText.textContent = 'Encoding image...';

        var outputType = currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
        var quality = outputType === 'image/jpeg' ? 0.92 : undefined;
        resultExt = outputType === 'image/png' ? '.png' : '.jpg';

        canvas.toBlob(function(blob) {
            progressFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';

            if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
            resultBlobUrl = URL.createObjectURL(blob);

            var resultImg = new Image();
            resultImg.onload = function() {
                resultPreview.innerHTML = '';
                resultPreview.appendChild(resultImg);
                resultSlot.style.display = 'block';
                progressSection.style.display = 'none';

                applyBtn.style.display = 'none';
                downloadBtn.style.display = '';
                backBtn.style.display = '';
                applyBtn.disabled = false;
            };
            resultImg.src = resultBlobUrl;
            showNotification('Watermark added — preview ready');
        }, outputType, quality);
    });

    backBtn.addEventListener('click', function() {
        resultSlot.style.display = 'none';
        resultPreview.innerHTML = '';
        downloadBtn.style.display = 'none';
        backBtn.style.display = 'none';
        applyBtn.style.display = '';
        progressSection.style.display = 'none';
    });

    downloadBtn.addEventListener('click', function() {
        if (!resultBlobUrl || !currentFile) return;
        var a = document.createElement('a');
        a.href = resultBlobUrl;
        var baseName = currentFile.name.replace(/\.[^.]+$/, '');
        a.download = baseName + '_watermarked' + resultExt;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); }, 100);
        showNotification('Image downloaded');
    });

    resetBtn.addEventListener('click', function() {
        currentFile = null;
        currentImage = null;
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        applyBtn.disabled = true;
        imagePreview.innerHTML = '';
        previewCompare.style.display = 'none';
        resultSlot.style.display = 'none';
        resultPreview.innerHTML = '';
        downloadBtn.style.display = 'none';
        backBtn.style.display = 'none';
        applyBtn.style.display = '';
        if (resultBlobUrl) { URL.revokeObjectURL(resultBlobUrl); resultBlobUrl = null; }
    });
});
