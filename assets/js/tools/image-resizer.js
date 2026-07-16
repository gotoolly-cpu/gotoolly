document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var resizeBtn = document.getElementById('resize-btn');
    var downloadBtn = document.getElementById('download-btn');
    var resetBtn = document.getElementById('reset-btn');
    var previewContainer = document.getElementById('image-preview-container');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');

    var currentFile = null;
    var currentImage = null;
    var originalWidth = 0;
    var originalHeight = 0;
    var downloadBlobUrl = null;

    var resizeMode = document.getElementById('resize-mode');
    var resizeWidth = document.getElementById('resize-width');
    var resizeHeight = document.getElementById('resize-height');
    var resizePercent = document.getElementById('resize-percent');
    var percentValue = document.getElementById('percent-value');
    var keepAspect = document.getElementById('keep-aspect');
    var outputFormat = document.getElementById('output-format');
    var qualitySlider = document.getElementById('quality');
    var qualityValue = document.getElementById('quality-value');
    var newDims = document.getElementById('new-dims');
    var originalDims = document.getElementById('original-dims');

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

    function updatePreview() {
        if (!currentImage) return;
        var canvas = previewContainer.querySelector('canvas');
        if (!canvas) return;
        var maxW = previewContainer.clientWidth || 400;
        var scale = Math.min(1, maxW / currentImage.naturalWidth);
        canvas.width = currentImage.naturalWidth * scale;
        canvas.height = currentImage.naturalHeight * scale;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    }

    function updateDimensions() {
        if (!currentImage) return;
        var mode = resizeMode.value;
        var w = originalWidth;
        var h = originalHeight;

        if (mode === 'width') {
            var newW = parseInt(resizeWidth.value) || w;
            if (keepAspect.checked) {
                var newH = Math.round(newW * (h / w));
                resizeHeight.value = newH;
            }
            var newH = parseInt(resizeHeight.value) || h;
            newDims.textContent = newW + ' x ' + newH;
        } else if (mode === 'height') {
            var newH = parseInt(resizeHeight.value) || h;
            if (keepAspect.checked) {
                var newW = Math.round(newH * (w / h));
                resizeWidth.value = newW;
            }
            var newW = parseInt(resizeWidth.value) || w;
            newDims.textContent = newW + ' x ' + newH;
        } else if (mode === 'percentage') {
            var pct = parseInt(resizePercent.value) || 50;
            var newW = Math.round(w * pct / 100);
            var newH = Math.round(h * pct / 100);
            resizeWidth.value = newW;
            resizeHeight.value = newH;
            newDims.textContent = newW + ' x ' + newH;
        }
    }

    resizeMode.addEventListener('change', function() {
        var mode = resizeMode.value;
        document.getElementById('dimension-fields').style.display = mode === 'percentage' ? 'none' : '';
        document.getElementById('percent-field').style.display = mode === 'percentage' ? '' : 'none';
        updateDimensions();
    });

    resizeWidth.addEventListener('input', function() {
        if (resizeMode.value === 'width') updateDimensions();
    });
    resizeHeight.addEventListener('input', function() {
        if (resizeMode.value === 'height') updateDimensions();
    });
    resizePercent.addEventListener('input', function() {
        percentValue.textContent = resizePercent.value + '%';
        if (resizeMode.value === 'percentage') updateDimensions();
    });
    keepAspect.addEventListener('change', function() {
        if (resizeMode.value === 'width' || resizeMode.value === 'height') updateDimensions();
    });

    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = qualitySlider.value + '%';
    });

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
            originalWidth = img.naturalWidth;
            originalHeight = img.naturalHeight;

            previewContainer.innerHTML = '';
            var canvas = document.createElement('canvas');
            canvas.style.maxWidth = '100%';
            canvas.style.borderRadius = '8px';
            previewContainer.appendChild(canvas);

            originalDims.textContent = originalWidth + ' x ' + originalHeight;
            resizeWidth.value = originalWidth;
            resizeHeight.value = originalHeight;

            settingsPanel.classList.add('show');
            resizeBtn.disabled = false;
            updatePreview();
            updateDimensions();
        };
        img.src = URL.createObjectURL(file);
    });

    resizeBtn.addEventListener('click', function() {
        if (!currentImage) return;

        var mode = resizeMode.value;
        var newW = parseInt(resizeWidth.value) || originalWidth;
        var newH = parseInt(resizeHeight.value) || originalHeight;

        if (newW < 1 || newH < 1) {
            showNotification('Dimensions must be at least 1 pixel', true);
            return;
        }

        progressSection.style.display = 'block';
        resizeBtn.disabled = true;
        progressText.textContent = 'Resizing image...';
        progressFill.style.width = '30%';
        progressPercent.textContent = '30%';

        setTimeout(function() {
            var canvas = document.createElement('canvas');
            canvas.width = newW;
            canvas.height = newH;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(currentImage, 0, 0, newW, newH);

            progressFill.style.width = '60%';
            progressPercent.textContent = '60%';
            progressText.textContent = 'Encoding...';

            var format = outputFormat.value;
            var quality = format === 'image/jpeg' ? qualitySlider.value / 100 : (format === 'image/webp' ? qualitySlider.value / 100 : undefined);

            canvas.toBlob(function(blob) {
                progressFill.style.width = '100%';
                progressPercent.textContent = '100%';
                progressText.textContent = 'Done!';

                if (downloadBlobUrl) URL.revokeObjectURL(downloadBlobUrl);
                downloadBlobUrl = URL.createObjectURL(blob);

                previewContainer.innerHTML = '';
                var img = document.createElement('img');
                img.src = downloadBlobUrl;
                img.alt = 'Resized image preview';
                img.style.maxWidth = '100%';
                img.style.borderRadius = '8px';
                previewContainer.appendChild(img);

                newDims.textContent = newW + ' x ' + newH;
                downloadBtn.style.display = '';
                resizeBtn.disabled = false;
                progressSection.style.display = 'none';
                showNotification('Resized to ' + newW + 'x' + newH);
            }, format, quality);
        }, 150);
    });

    downloadBtn.addEventListener('click', function() {
        if (!downloadBlobUrl) return;
        var format = outputFormat.value;
        var extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
        var baseName = currentFile.name.replace(/\.[^.]+$/, '');
        var newW = parseInt(resizeWidth.value) || originalWidth;
        var newH = parseInt(resizeHeight.value) || originalHeight;
        var a = document.createElement('a');
        a.href = downloadBlobUrl;
        a.download = baseName + '_resized_' + newW + 'x' + newH + (extMap[format] || '.jpg');
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); }, 100);
    });

    resetBtn.addEventListener('click', function() {
        currentFile = null;
        currentImage = null;
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        resizeBtn.disabled = true;
        downloadBtn.style.display = 'none';
        previewContainer.innerHTML = '';
        originalDims.textContent = '0 x 0';
        newDims.textContent = '-';
        if (downloadBlobUrl) { URL.revokeObjectURL(downloadBlobUrl); downloadBlobUrl = null; }
    });
});
