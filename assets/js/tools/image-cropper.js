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

    var cropInputsWrap = document.getElementById('crop-inputs');
    var marginInputsWrap = document.getElementById('margin-inputs');
    var cropResultInfo = document.getElementById('crop-result-info');
    var cropResultText = document.getElementById('crop-result-text');

    var currentFile = null;
    var currentImage = null;
    var cropCanvas = null;
    var cropCtx = null;
    var currentMode = 'free';

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

    function getCropValues() {
        return {
            x: parseInt(document.getElementById('crop-x').value) || 0,
            y: parseInt(document.getElementById('crop-y').value) || 0,
            w: parseInt(document.getElementById('crop-width').value) || 1,
            h: parseInt(document.getElementById('crop-height').value) || 1
        };
    }

    function setCropValues(x, y, w, h) {
        document.getElementById('crop-x').value = x;
        document.getElementById('crop-y').value = y;
        document.getElementById('crop-width').value = w;
        document.getElementById('crop-height').value = h;
    }

    function getMargins() {
        return {
            top: parseInt(document.getElementById('crop-top').value) || 0,
            right: parseInt(document.getElementById('crop-right').value) || 0,
            bottom: parseInt(document.getElementById('crop-bottom').value) || 0,
            left: parseInt(document.getElementById('crop-left').value) || 0
        };
    }

    function setMargins(top, right, bottom, left) {
        document.getElementById('crop-top').value = top;
        document.getElementById('crop-right').value = right;
        document.getElementById('crop-bottom').value = bottom;
        document.getElementById('crop-left').value = left;
    }

    function marginsToCrop() {
        if (!currentImage) return;
        var m = getMargins();
        var ow = currentImage.naturalWidth;
        var oh = currentImage.naturalHeight;
        var w = Math.max(1, ow - m.left - m.right);
        var h = Math.max(1, oh - m.top - m.bottom);
        setCropValues(m.left, m.top, w, h);
    }

    function cropToMargins() {
        if (!currentImage) return;
        var c = getCropValues();
        var ow = currentImage.naturalWidth;
        var oh = currentImage.naturalHeight;
        var left = Math.max(0, Math.min(c.x, ow));
        var top = Math.max(0, Math.min(c.y, oh));
        var right = Math.max(0, Math.min(ow - left - c.w, ow));
        var bottom = Math.max(0, Math.min(oh - top - c.h, oh));
        setMargins(top, right, bottom, left);
    }

    function clampMarginInput(changedId) {
        if (!currentImage) return;
        var m = getMargins();
        var ow = currentImage.naturalWidth;
        var oh = currentImage.naturalHeight;

        m.top = Math.max(0, Math.min(m.top, oh));
        m.right = Math.max(0, Math.min(m.right, ow));
        m.bottom = Math.max(0, Math.min(m.bottom, oh - m.top));
        m.left = Math.max(0, Math.min(m.left, ow - m.right));

        setMargins(m.top, m.right, m.bottom, m.left);
        marginsToCrop();

        var c = getCropValues();
        cropResultText.textContent = c.w + ' x ' + c.h + ' (at ' + c.x + ', ' + c.y + ')';
    }

    function clampCropInput() {
        if (!currentImage) return;
        var c = getCropValues();
        var ow = currentImage.naturalWidth;
        var oh = currentImage.naturalHeight;

        c.x = Math.max(0, Math.min(c.x, ow - 1));
        c.y = Math.max(0, Math.min(c.y, oh - 1));
        c.w = Math.max(1, Math.min(c.w, ow - c.x));
        c.h = Math.max(1, Math.min(c.h, oh - c.y));

        setCropValues(c.x, c.y, c.w, c.h);
    }

    function updateCropPreview() {
        if (!currentImage || !cropCanvas) return;
        var c = getCropValues();

        if (currentMode === 'custom') {
            clampMarginInput();
        } else {
            clampCropInput();
            c = getCropValues();
        }

        cropCanvas.width = currentImage.naturalWidth;
        cropCanvas.height = currentImage.naturalHeight;
        cropCtx.drawImage(currentImage, 0, 0);

        cropCtx.save();
        cropCtx.fillStyle = 'rgba(0,0,0,0.5)';
        cropCtx.fillRect(0, 0, cropCanvas.width, c.y);
        cropCtx.fillRect(0, c.y + c.h, cropCanvas.width, cropCanvas.height - c.y - c.h);
        cropCtx.fillRect(0, c.y, c.x, c.h);
        cropCtx.fillRect(c.x + c.w, c.y, cropCanvas.width - c.x - c.w, c.h);
        cropCtx.strokeStyle = '#fff';
        cropCtx.lineWidth = 2;
        cropCtx.strokeRect(c.x, c.y, c.w, c.h);
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
            imagePreviewContainer.innerHTML = '';
            cropCanvas = document.createElement('canvas');
            cropCanvas.style.maxWidth = '100%';
            cropCanvas.style.borderRadius = '8px';
            cropCanvas.style.cursor = 'crosshair';
            imagePreviewContainer.appendChild(cropCanvas);
            cropCtx = cropCanvas.getContext('2d');

            setCropValues(0, 0, img.naturalWidth, img.naturalHeight);
            setMargins(0, 0, 0, 0);
            document.getElementById('original-dims').textContent = img.naturalWidth + ' x ' + img.naturalHeight;

            currentMode = 'free';
            cropInputsWrap.style.display = '';
            marginInputsWrap.style.display = 'none';
            cropResultInfo.style.display = 'none';

            var aspectBtns = document.querySelectorAll('.aspect-btn');
            aspectBtns.forEach(function(b) { b.classList.remove('active'); });
            aspectBtns[0].classList.add('active');

            settingsPanel.classList.add('show');
            applyBtn.disabled = false;
            updateCropPreview();
        };
        img.src = URL.createObjectURL(file);
        settingsPanel.classList.add('show');
        applyBtn.disabled = false;
    });

    var aspectBtns = document.querySelectorAll('.aspect-btn');
    aspectBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            aspectBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (!currentImage) return;

            var ratio = btn.getAttribute('data-ratio');
            var ow = currentImage.naturalWidth;
            var oh = currentImage.naturalHeight;

            if (ratio === 'custom') {
                cropToMargins();
                cropInputsWrap.style.display = 'none';
                marginInputsWrap.style.display = '';
                cropResultInfo.style.display = '';
                currentMode = 'custom';
                clampMarginInput();
            } else {
                if (currentMode === 'custom') {
                    marginsToCrop();
                }
                cropInputsWrap.style.display = '';
                marginInputsWrap.style.display = 'none';
                cropResultInfo.style.display = 'none';
                currentMode = ratio;

                if (ratio === 'free') {
                    setCropValues(0, 0, ow, oh);
                } else if (ratio === '1:1') {
                    var s = Math.min(ow, oh);
                    setCropValues(0, 0, s, s);
                } else if (ratio === '4:3') {
                    setCropValues(0, 0, ow, Math.round(ow * 3 / 4));
                } else if (ratio === '16:9') {
                    setCropValues(0, 0, ow, Math.round(ow * 9 / 16));
                } else if (ratio === '3:2') {
                    setCropValues(0, 0, ow, Math.round(ow * 2 / 3));
                }
            }
            updateCropPreview();
        });
    });

    ['crop-x', 'crop-y', 'crop-width', 'crop-height'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', function() {
            if (currentMode !== 'custom') updateCropPreview();
        });
    });

    ['crop-top', 'crop-right', 'crop-bottom', 'crop-left'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', function() {
            if (currentMode === 'custom') {
                clampMarginInput(id);
                updateCropPreview();
            }
        });
    });

    applyBtn.addEventListener('click', function() {
        if (!currentImage) return;
        var c = getCropValues();
        var w = c.w;
        var h = c.h;
        var x = c.x;
        var y = c.y;

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
        currentMode = 'free';
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        applyBtn.disabled = true;
        imagePreviewContainer.innerHTML = '';
        cropResultInfo.style.display = 'none';
    });
});
