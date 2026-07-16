document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var backBtn = document.getElementById('back-btn');
    var downloadBtn = document.getElementById('download-btn');
    var previewContainer = document.getElementById('preview-container');
    var resultPreview = document.getElementById('result-preview');
    var resultSlot = document.getElementById('result-slot');
    var previewCompare = document.getElementById('preview-compare');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');

    var currentFile = null;
    var currentImage = null;
    var previewCanvas = null;
    var previewCtx = null;
    var resultBlobUrl = null;

    var fontSizeSlider = document.getElementById('font-size');
    var fontSizeValue = document.getElementById('font-size-value');
    var strokeWidthSlider = document.getElementById('stroke-width');
    var strokeWidthValue = document.getElementById('stroke-width-value');

    if (fontSizeSlider) fontSizeSlider.addEventListener('input', function() { fontSizeValue.textContent = fontSizeSlider.value + 'px'; });
    if (strokeWidthSlider) strokeWidthSlider.addEventListener('input', function() { strokeWidthValue.textContent = strokeWidthSlider.value + 'px'; });

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    function drawMeme(targetCanvas, targetCtx) {
        if (!currentImage || !targetCanvas) return;
        var topText = document.getElementById('top-text').value.toUpperCase();
        var bottomText = document.getElementById('bottom-text').value.toUpperCase();
        var fontSize = parseInt(document.getElementById('font-size').value) || 48;
        var textColor = document.getElementById('text-color').value;
        var strokeColor = document.getElementById('stroke-color').value;
        var strokeWidth = parseInt(document.getElementById('stroke-width').value) || 3;

        var w = currentImage.naturalWidth;
        var h = currentImage.naturalHeight;
        targetCanvas.width = w;
        targetCanvas.height = h;
        targetCtx.drawImage(currentImage, 0, 0);

        targetCtx.save();
        targetCtx.font = 'bold ' + fontSize + 'px Impact, Arial Black, sans-serif';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'top';
        targetCtx.fillStyle = textColor;
        targetCtx.strokeStyle = strokeColor;
        targetCtx.lineWidth = strokeWidth;
        targetCtx.lineJoin = 'round';

        if (topText) {
            var topY = h * 0.05;
            targetCtx.strokeText(topText, w / 2, topY);
            targetCtx.fillText(topText, w / 2, topY);
        }
        if (bottomText) {
            var bottomY = h * 0.85;
            targetCtx.strokeText(bottomText, w / 2, bottomY);
            targetCtx.fillText(bottomText, w / 2, bottomY);
        }
        targetCtx.restore();
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
            previewContainer.innerHTML = '';
            previewCanvas = document.createElement('canvas');
            previewContainer.appendChild(previewCanvas);
            previewCtx = previewCanvas.getContext('2d');
            drawMeme(previewCanvas, previewCtx);
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

    ['top-text', 'bottom-text', 'font-size', 'text-color', 'stroke-color', 'stroke-width'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', function() {
            drawMeme(previewCanvas, previewCtx);
        });
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;
        var topText = document.getElementById('top-text').value.toUpperCase();
        var bottomText = document.getElementById('bottom-text').value.toUpperCase();
        if (!topText && !bottomText) { showNotification('Enter some text for the meme', true); return; }

        progressSection.style.display = 'block';
        applyBtn.disabled = true;
        progressText.textContent = 'Creating meme...';
        progressFill.style.width = '50%';
        progressPercent.textContent = '50%';

        setTimeout(function() {
            var canvas = document.createElement('canvas');
            canvas.width = currentImage.naturalWidth;
            canvas.height = currentImage.naturalHeight;
            var ctx = canvas.getContext('2d');
            drawMeme(canvas, ctx);

            progressFill.style.width = '80%';
            progressPercent.textContent = '80%';
            progressText.textContent = 'Encoding...';

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
                showNotification('Meme created — preview ready');
            }, 'image/jpeg', 0.95);
        }, 100);
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
        a.download = baseName + '_meme.jpg';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); }, 100);
        showNotification('Meme downloaded');
    });

    resetBtn.addEventListener('click', function() {
        currentFile = null;
        currentImage = null;
        previewCanvas = null;
        previewCtx = null;
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        applyBtn.disabled = true;
        previewContainer.innerHTML = '';
        previewCompare.style.display = 'none';
        resultSlot.style.display = 'none';
        resultPreview.innerHTML = '';
        downloadBtn.style.display = 'none';
        backBtn.style.display = 'none';
        applyBtn.style.display = '';
        document.getElementById('top-text').value = 'TOP TEXT';
        document.getElementById('bottom-text').value = 'BOTTOM TEXT';
        fontSizeSlider.value = 48;
        fontSizeValue.textContent = '48px';
        document.getElementById('text-color').value = '#ffffff';
        document.getElementById('stroke-color').value = '#000000';
        strokeWidthSlider.value = 3;
        strokeWidthValue.textContent = '3px';
        if (resultBlobUrl) { URL.revokeObjectURL(resultBlobUrl); resultBlobUrl = null; }
    });
});
