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
    var rotateSlider = document.getElementById('rotate-angle');
    var angleValue = document.getElementById('angle-value');
    var currentAngleDisplay = document.getElementById('current-angle');
    var currentDims = document.getElementById('current-dims');

    var currentFile = null;
    var currentImage = null;
    var previewCanvas = null;
    var previewCtx = null;
    var currentAngle = 0;

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

    function rotateCanvasSize(w, h, angle) {
        var rad = angle * Math.PI / 180;
        var cos = Math.abs(Math.cos(rad));
        var sin = Math.abs(Math.sin(rad));
        return {
            width: Math.ceil(w * cos + h * sin),
            height: Math.ceil(w * sin + h * cos)
        };
    }

    function applyRotation() {
        if (!currentImage || !previewCanvas) return;
        var w = currentImage.naturalWidth;
        var h = currentImage.naturalHeight;
        var angle = currentAngle;
        var rad = angle * Math.PI / 180;
        var newSize = rotateCanvasSize(w, h, angle);

        previewCanvas.width = newSize.width;
        previewCanvas.height = newSize.height;
        previewCtx.save();
        previewCtx.clearRect(0, 0, newSize.width, newSize.height);
        previewCtx.translate(newSize.width / 2, newSize.height / 2);
        previewCtx.rotate(rad);
        previewCtx.drawImage(currentImage, -w / 2, -h / 2);
        previewCtx.restore();

        currentDims.textContent = newSize.width + ' x ' + newSize.height;
        currentAngleDisplay.textContent = angle + '\u00B0';
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
            currentAngle = 0;
            rotateSlider.value = 0;
            angleValue.textContent = '0\u00B0';
            applyRotation();
        };
        img.src = URL.createObjectURL(file);
        settingsPanel.classList.add('show');
        applyBtn.disabled = false;
    });

    rotateSlider.addEventListener('input', function() {
        currentAngle = parseInt(this.value);
        angleValue.textContent = currentAngle + '\u00B0';
        applyRotation();
    });

    document.querySelectorAll('.rotate-preset-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var angle = parseInt(btn.getAttribute('data-angle'));
            currentAngle = ((currentAngle + angle) % 360 + 360) % 360;
            rotateSlider.value = currentAngle;
            angleValue.textContent = currentAngle + '\u00B0';
            applyRotation();
        });
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;

        progressSection.style.display = 'block';
        applyBtn.disabled = true;
        progressText.textContent = 'Rotating...';
        progressFill.style.width = '50%';
        progressPercent.textContent = '50%';

        setTimeout(function() {
            var w = currentImage.naturalWidth;
            var h = currentImage.naturalHeight;
            var angle = currentAngle;
            var rad = angle * Math.PI / 180;
            var newSize = rotateCanvasSize(w, h, angle);

            var canvas = document.createElement('canvas');
            canvas.width = newSize.width;
            canvas.height = newSize.height;
            var ctx = canvas.getContext('2d');
            ctx.save();
            ctx.translate(newSize.width / 2, newSize.height / 2);
            ctx.rotate(rad);
            ctx.drawImage(currentImage, -w / 2, -h / 2);
            ctx.restore();

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
                a.download = baseName + '_rotated_' + angle + 'deg' + ext;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                showNotification('Image rotated ' + angle + '\u00B0 successfully!');
                applyBtn.disabled = false;
            }, outputType, quality);
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
        applyBtn.disabled = true;
        previewContainer.innerHTML = '';
        currentAngle = 0;
        rotateSlider.value = 0;
        angleValue.textContent = '0\u00B0';
    });
});
