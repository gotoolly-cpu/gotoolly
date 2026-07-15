document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var imagePreviewContainer = document.getElementById('image-preview-container');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');

    var currentFile = null;
    var currentImage = null;
    var cropCanvas = null;
    var cropCtx = null;

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    // Drag and drop
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

    function updateCropPreview() {
        if (!currentImage || !cropCanvas) return;
        var w = parseInt(document.getElementById('crop-width').value) || currentImage.naturalWidth;
        var h = parseInt(document.getElementById('crop-height').value) || currentImage.naturalHeight;
        var x = parseInt(document.getElementById('crop-x').value) || 0;
        var y = parseInt(document.getElementById('crop-y').value) || 0;

        // Clamp values
        w = Math.min(w, currentImage.naturalWidth - x);
        h = Math.min(h, currentImage.naturalHeight - y);
        if (w < 1) w = 1;
        if (h < 1) h = 1;

        // Draw image
        cropCanvas.width = currentImage.naturalWidth;
        cropCanvas.height = currentImage.naturalHeight;
        cropCtx.drawImage(currentImage, 0, 0);

        // Draw crop overlay (dim outside, highlight inside)
        cropCtx.save();
        cropCtx.fillStyle = 'rgba(0,0,0,0.5)';
        // Top
        cropCtx.fillRect(0, 0, cropCanvas.width, y);
        // Bottom
        cropCtx.fillRect(0, y + h, cropCanvas.width, cropCanvas.height - y - h);
        // Left
        cropCtx.fillRect(0, y, x, h);
        // Right
        cropCtx.fillRect(x + w, y, cropCanvas.width - x - w, h);
        // Crop border
        cropCtx.strokeStyle = '#fff';
        cropCtx.lineWidth = 2;
        cropCtx.strokeRect(x, y, w, h);
        cropCtx.restore();
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
            // Create preview canvas
            imagePreviewContainer.innerHTML = '';
            cropCanvas = document.createElement('canvas');
            cropCanvas.style.maxWidth = '100%';
            cropCanvas.style.borderRadius = '8px';
            cropCanvas.style.cursor = 'crosshair';
            imagePreviewContainer.appendChild(cropCanvas);
            cropCtx = cropCanvas.getContext('2d');

            // Set default crop to full image
            document.getElementById('crop-width').value = img.naturalWidth;
            document.getElementById('crop-height').value = img.naturalHeight;
            document.getElementById('crop-x').value = 0;
            document.getElementById('crop-y').value = 0;
            document.getElementById('original-dims').textContent = img.naturalWidth + ' x ' + img.naturalHeight;

            updateCropPreview();
        };
        img.src = URL.createObjectURL(file);
        settingsPanel.classList.add('show');
        applyBtn.disabled = false;
    });

    // Aspect ratio presets
    var aspectBtns = document.querySelectorAll('.aspect-btn');
    aspectBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            aspectBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (!currentImage) return;
            var ratio = btn.getAttribute('data-ratio');
            var w = currentImage.naturalWidth;
            var h = currentImage.naturalHeight;
            if (ratio === 'free') {
                // Keep current
            } else if (ratio === '1:1') {
                var s = Math.min(w, h);
                document.getElementById('crop-width').value = s;
                document.getElementById('crop-height').value = s;
            } else if (ratio === '4:3') {
                document.getElementById('crop-height').value = Math.round(w * 3 / 4);
                document.getElementById('crop-width').value = w;
            } else if (ratio === '16:9') {
                document.getElementById('crop-height').value = Math.round(w * 9 / 16);
                document.getElementById('crop-width').value = w;
            } else if (ratio === '3:2') {
                document.getElementById('crop-height').value = Math.round(w * 2 / 3);
                document.getElementById('crop-width').value = w;
            }
            updateCropPreview();
        });
    });

    // Update on input change
    ['crop-width', 'crop-height', 'crop-x', 'crop-y'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', updateCropPreview);
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;
        var w = parseInt(document.getElementById('crop-width').value) || currentImage.naturalWidth;
        var h = parseInt(document.getElementById('crop-height').value) || currentImage.naturalHeight;
        var x = parseInt(document.getElementById('crop-x').value) || 0;
        var y = parseInt(document.getElementById('crop-y').value) || 0;

        progressSection.style.display = 'block';
        applyBtn.disabled = true;
        progressText.textContent = 'Cropping image...';
        progressFill.style.width = '50%';
        progressPercent.textContent = '50%';

        setTimeout(function() {
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(currentImage, x, y, w, h, 0, 0, w, h);

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
                a.download = baseName + '_cropped' + ext;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                showNotification('Image cropped successfully! (' + w + 'x' + h + ')');
            }, outputType, quality);
        }, 100);
    });

    resetBtn.addEventListener('click', function() {
        currentFile = null;
        currentImage = null;
        cropCanvas = null;
        cropCtx = null;
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        applyBtn.disabled = true;
        imagePreviewContainer.innerHTML = '';
    });
});
