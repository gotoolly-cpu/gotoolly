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
    var flipHBtn = document.getElementById('flip-horizontal');
    var flipVBtn = document.getElementById('flip-vertical');

    var currentFile = null;
    var currentImage = null;
    var previewCanvas = null;
    var previewCtx = null;
    var flipH = false;
    var flipV = false;

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

    function applyFlip() {
        if (!currentImage || !previewCanvas) return;
        previewCtx.save();
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.translate(previewCanvas.width / 2, previewCanvas.height / 2);
        previewCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        previewCtx.drawImage(currentImage, -currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);
        previewCtx.restore();
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
            document.getElementById('file-name').textContent = file.name;
            flipH = false;
            flipV = false;
            flipHBtn.classList.remove('active');
            flipVBtn.classList.remove('active');
            applyFlip();
        };
        img.src = URL.createObjectURL(file);
        settingsPanel.classList.add('show');
        applyBtn.disabled = false;
    });

    flipHBtn.addEventListener('click', function() {
        flipH = !flipH;
        flipHBtn.classList.toggle('active');
        applyFlip();
    });

    flipVBtn.addEventListener('click', function() {
        flipV = !flipV;
        flipVBtn.classList.toggle('active');
        applyFlip();
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;

        progressSection.style.display = 'block';
        applyBtn.disabled = true;
        progressText.textContent = 'Applying flip...';
        progressFill.style.width = '50%';
        progressPercent.textContent = '50%';

        setTimeout(function() {
            var canvas = document.createElement('canvas');
            canvas.width = currentImage.naturalWidth;
            canvas.height = currentImage.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
            ctx.drawImage(currentImage, -currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);
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
                var suffix = '';
                if (flipH && flipV) suffix = '_flipped_both';
                else if (flipH) suffix = '_flipped_h';
                else if (flipV) suffix = '_flipped_v';
                if (!suffix) suffix = '_original';
                a.download = baseName + suffix + ext;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                showNotification('Image flipped successfully!');
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
        flipH = false;
        flipV = false;
        flipHBtn.classList.remove('active');
        flipVBtn.classList.remove('active');
    });
});
