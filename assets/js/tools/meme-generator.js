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

    var currentFile = null;
    var currentImage = null;
    var previewCanvas = null;
    var previewCtx = null;

    var fontSizeSlider = document.getElementById('font-size');
    var fontSizeValue = document.getElementById('font-size-value');
    var strokeWidthSlider = document.getElementById('stroke-width');
    var strokeWidthValue = document.getElementById('stroke-width-value');

    fontSizeSlider.addEventListener('input', function() { fontSizeValue.textContent = fontSizeSlider.value + 'px'; });
    strokeWidthSlider.addEventListener('input', function() { strokeWidthValue.textContent = strokeWidthSlider.value + 'px'; });

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    function drawMeme() {
        if (!currentImage || !previewCanvas) return;
        var topText = document.getElementById('top-text').value.toUpperCase();
        var bottomText = document.getElementById('bottom-text').value.toUpperCase();
        var fontSize = parseInt(document.getElementById('font-size').value) || 48;
        var textColor = document.getElementById('text-color').value;
        var strokeColor = document.getElementById('stroke-color').value;
        var strokeWidth = parseInt(document.getElementById('stroke-width').value) || 3;

        var w = currentImage.naturalWidth;
        var h = currentImage.naturalHeight;
        previewCanvas.width = w;
        previewCanvas.height = h;
        previewCtx.drawImage(currentImage, 0, 0);

        previewCtx.save();
        previewCtx.font = 'bold ' + fontSize + 'px Impact, Arial Black, sans-serif';
        previewCtx.textAlign = 'center';
        previewCtx.textBaseline = 'top';
        previewCtx.fillStyle = textColor;
        previewCtx.strokeStyle = strokeColor;
        previewCtx.lineWidth = strokeWidth;
        previewCtx.lineJoin = 'round';

        if (topText) {
            var topY = h * 0.05;
            previewCtx.strokeText(topText, w / 2, topY);
            previewCtx.fillText(topText, w / 2, topY);
        }

        if (bottomText) {
            var bottomY = h * 0.85;
            previewCtx.strokeText(bottomText, w / 2, bottomY);
            previewCtx.fillText(bottomText, w / 2, bottomY);
        }
        previewCtx.restore();
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
            previewCanvas.style.maxWidth = '100%';
            previewCanvas.style.borderRadius = '8px';
            previewContainer.appendChild(previewCanvas);
            previewCtx = previewCanvas.getContext('2d');
            drawMeme();
        };
        img.src = URL.createObjectURL(file);
        settingsPanel.classList.add('show');
        applyBtn.disabled = false;
    });

    ['top-text', 'bottom-text', 'font-size', 'text-color', 'stroke-color', 'stroke-width'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', drawMeme);
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;
        var topText = document.getElementById('top-text').value.toUpperCase();
        var bottomText = document.getElementById('bottom-text').value.toUpperCase();
        if (!topText && !bottomText) { showNotification('Enter some text for the meme', true); return; }

        progressSection.style.display = '';
        applyBtn.disabled = true;
        progressText.textContent = 'Creating meme...';
        progressFill.style.width = '50%';
        progressPercent.textContent = '50%';

        setTimeout(function() {
            var fontSize = parseInt(document.getElementById('font-size').value) || 48;
            var textColor = document.getElementById('text-color').value;
            var strokeColor = document.getElementById('stroke-color').value;
            var strokeWidth = parseInt(document.getElementById('stroke-width').value) || 3;

            var canvas = document.createElement('canvas');
            canvas.width = currentImage.naturalWidth;
            canvas.height = currentImage.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(currentImage, 0, 0);
            ctx.save();
            ctx.font = 'bold ' + fontSize + 'px Impact, Arial Black, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = textColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineJoin = 'round';

            if (topText) {
                ctx.strokeText(topText, canvas.width / 2, canvas.height * 0.05);
                ctx.fillText(topText, canvas.width / 2, canvas.height * 0.05);
            }
            if (bottomText) {
                ctx.strokeText(bottomText, canvas.width / 2, canvas.height * 0.85);
                ctx.fillText(bottomText, canvas.width / 2, canvas.height * 0.85);
            }
            ctx.restore();

            progressFill.style.width = '80%';
            progressPercent.textContent = '80%';
            progressText.textContent = 'Encoding...';

            canvas.toBlob(function(blob) {
                progressFill.style.width = '100%';
                progressPercent.textContent = '100%';
                progressText.textContent = 'Done!';

                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                var baseName = currentFile.name.replace(/\.[^.]+$/, '');
                a.download = baseName + '_meme.jpg';
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                showNotification('Meme created successfully!');
            }, 'image/jpeg', 0.95);
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
        document.getElementById('top-text').value = 'TOP TEXT';
        document.getElementById('bottom-text').value = 'BOTTOM TEXT';
        fontSizeSlider.value = 48;
        fontSizeValue.textContent = '48px';
        document.getElementById('text-color').value = '#ffffff';
        document.getElementById('stroke-color').value = '#000000';
        strokeWidthSlider.value = 3;
        strokeWidthValue.textContent = '3px';
    });
});
