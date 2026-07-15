document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var previewContainer = document.getElementById('preview-container');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');
    var comparisonArea = document.getElementById('comparison-area');
    var beforeImg = document.getElementById('before-img');
    var afterImg = document.getElementById('after-img');

    var currentFile = null;
    var currentImage = null;
    var previewCanvas = null;
    var previewCtx = null;

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
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

    function applyUnsharpMask(ctx, width, height, amount) {
        var imageData = ctx.getImageData(0, 0, width, height);
        var data = imageData.data;
        var copy = new Uint8ClampedArray(data);
        var w = width, h = height;
        var factor = amount / 100;

        for (var y = 1; y < h - 1; y++) {
            for (var x = 1; x < w - 1; x++) {
                var idx = (y * w + x) * 4;
                for (var c = 0; c < 3; c++) {
                    var orig = copy[idx + c];
                    var blur = (
                        copy[((y - 1) * w + (x - 1)) * 4 + c] +
                        copy[((y - 1) * w + x) * 4 + c] +
                        copy[((y - 1) * w + (x + 1)) * 4 + c] +
                        copy[(y * w + (x - 1)) * 4 + c] +
                        copy[(y * w + x) * 4 + c] +
                        copy[(y * w + (x + 1)) * 4 + c] +
                        copy[((y + 1) * w + (x - 1)) * 4 + c] +
                        copy[((y + 1) * w + x) * 4 + c] +
                        copy[((y + 1) * w + (x + 1)) * 4 + c]
                    ) / 9;
                    var diff = orig - blur;
                    data[idx + c] = Math.min(255, Math.max(0, Math.round(orig + diff * factor)));
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    function updatePreview() {
        if (!currentImage || !previewCanvas) return;
        var w = currentImage.naturalWidth;
        var h = currentImage.naturalHeight;
        var scaleEl = document.querySelector('.scale-btn.active');
        var scale = scaleEl ? scaleEl.getAttribute('data-scale') : '2';
        var newW, newH;

        if (scale === 'custom') {
            newW = parseInt(document.getElementById('upscale-width').value) || w;
            newH = parseInt(document.getElementById('upscale-height').value) || h;
        } else {
            var factor = parseInt(scale) || 2;
            newW = w * factor;
            newH = h * factor;
        }

        previewCanvas.width = newW;
        previewCanvas.height = newH;
        previewCtx.imageSmoothingEnabled = true;
        previewCtx.imageSmoothingQuality = 'high';
        previewCtx.drawImage(currentImage, 0, 0, newW, newH);
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
            previewCanvas.style.maxWidth = '100%';
            previewCanvas.style.borderRadius = '8px';
            previewContainer.appendChild(previewCanvas);
            previewCtx = previewCanvas.getContext('2d');
            document.getElementById('original-dims').textContent = img.naturalWidth + ' x ' + img.naturalHeight;
            document.getElementById('upscale-width').value = img.naturalWidth * 2;
            document.getElementById('upscale-height').value = img.naturalHeight * 2;
            updatePreview();
        };
        img.src = URL.createObjectURL(file);
        settingsPanel.classList.add('show');
        applyBtn.disabled = false;
    });

    document.querySelectorAll('.scale-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.scale-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            document.getElementById('custom-dims').style.display = btn.getAttribute('data-scale') === 'custom' ? 'grid' : 'none';
            if (currentImage) updatePreview();
        });
    });

    document.getElementById('upscale-width').addEventListener('input', function() {
        if (currentImage && document.querySelector('.scale-btn.active').getAttribute('data-scale') === 'custom') updatePreview();
    });
    document.getElementById('upscale-height').addEventListener('input', function() {
        if (currentImage && document.querySelector('.scale-btn.active').getAttribute('data-scale') === 'custom') updatePreview();
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;
        var w = currentImage.naturalWidth;
        var h = currentImage.naturalHeight;
        var scaleEl = document.querySelector('.scale-btn.active');
        var scale = scaleEl ? scaleEl.getAttribute('data-scale') : '2';
        var newW, newH;

        if (scale === 'custom') {
            newW = parseInt(document.getElementById('upscale-width').value) || w;
            newH = parseInt(document.getElementById('upscale-height').value) || h;
        } else {
            var factor = parseInt(scale) || 2;
            newW = w * factor;
            newH = h * factor;
        }

        progressSection.style.display = 'block';
        applyBtn.disabled = true;
        progressText.textContent = 'Upscaling...';
        progressFill.style.width = '30%';
        progressPercent.textContent = '30%';

        setTimeout(function() {
            var canvas = document.createElement('canvas');
            canvas.width = newW;
            canvas.height = newH;
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(currentImage, 0, 0, newW, newH);

            progressFill.style.width = '60%';
            progressPercent.textContent = '60%';
            progressText.textContent = 'Applying sharpness...';

            setTimeout(function() {
                applyUnsharpMask(ctx, newW, newH, 30);

                progressFill.style.width = '80%';
                progressPercent.textContent = '80%';
                progressText.textContent = 'Encoding...';

                var outputType = currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
                var quality = outputType === 'image/jpeg' ? 0.92 : undefined;

                canvas.toBlob(function(blob) {
                    progressFill.style.width = '100%';
                    progressPercent.textContent = '100%';
                    progressText.textContent = 'Done!';

                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    var baseName = currentFile.name.replace(/\.[^.]+$/, '');
                    var ext = outputType === 'image/png' ? '.png' : '.jpg';
                    a.download = baseName + '_upscaled_' + newW + 'x' + newH + ext;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

                    beforeImg.src = URL.createObjectURL(currentFile);
                    afterImg.src = URL.createObjectURL(blob);
                    comparisonArea.style.display = 'block';
                    if (resetBtn) {
                        resetBtn.addEventListener('click', function() {
                            if (beforeImg.src) URL.revokeObjectURL(beforeImg.src);
                            if (afterImg.src) URL.revokeObjectURL(afterImg.src);
                        });
                    }

                    showNotification('Image upscaled to ' + newW + 'x' + newH);
                    applyBtn.disabled = false;
                }, outputType, quality);
            }, 50);
        }, 100);
    });

    resetBtn.addEventListener('click', function() {
        currentFile = null;
        currentImage = null;
        previewCanvas = null;
        previewCtx = null;
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        comparisonArea.style.display = 'none';
        applyBtn.disabled = true;
        previewContainer.innerHTML = '';
    });
});
