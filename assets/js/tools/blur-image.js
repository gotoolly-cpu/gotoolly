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
    var blurSlider = document.getElementById('blur-strength');
    var blurValue = document.getElementById('blur-value');

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

    function applyBlur() {
        if (!currentImage || !previewCanvas) return;
        var radius = parseFloat(blurSlider.value) || 0;
        previewCtx.filter = 'blur(' + radius + 'px)';
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.drawImage(currentImage, 0, 0);
        previewCtx.filter = 'none';
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
            previewCanvas.width = img.naturalWidth;
            previewCanvas.height = img.naturalHeight;
            previewCanvas.style.maxWidth = '100%';
            previewCanvas.style.borderRadius = '8px';
            previewContainer.appendChild(previewCanvas);
            previewCtx = previewCanvas.getContext('2d');
            document.getElementById('original-dims').textContent = img.naturalWidth + ' x ' + img.naturalHeight;
            applyBlur();
        };
        img.src = URL.createObjectURL(file);
        settingsPanel.classList.add('show');
        applyBtn.disabled = false;
    });

    blurSlider.addEventListener('input', function() {
        blurValue.textContent = this.value + 'px';
        applyBlur();
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;
        var radius = parseFloat(blurSlider.value) || 0;

        progressSection.style.display = 'block';
        applyBtn.disabled = true;
        progressText.textContent = 'Applying blur...';
        progressFill.style.width = '50%';
        progressPercent.textContent = '50%';

        setTimeout(function() {
            var canvas = document.createElement('canvas');
            canvas.width = currentImage.naturalWidth;
            canvas.height = currentImage.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.filter = 'blur(' + radius + 'px)';
            ctx.drawImage(currentImage, 0, 0);
            ctx.filter = 'none';

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
                a.download = baseName + '_blurred' + ext;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                showNotification('Blur applied successfully!');
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
        blurSlider.value = '5';
        blurValue.textContent = '5px';
    });
});
