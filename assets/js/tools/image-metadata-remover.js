document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var fileInfo = document.getElementById('file-info');
    var exifPreview = document.getElementById('exif-preview');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');

    var currentFile = null;
    var currentImageUrl = null;

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 4000);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
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
        if (file.size > 25 * 1024 * 1024) {
            showNotification('File too large (max 25 MB)', true);
            return;
        }
        currentFile = file;
        currentImageUrl = URL.createObjectURL(file);

        var img = new Image();
        img.onload = function() {
            fileInfo.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">' +
                '<div><strong>File:</strong> ' + (file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name) + '</div>' +
                '<div><strong>Size:</strong> ' + formatFileSize(file.size) + '</div>' +
                '<div><strong>Dimensions:</strong> ' + img.width + ' x ' + img.height + '</div>' +
                '<div><strong>Type:</strong> ' + file.type + '</div>' +
                '</div>';
            URL.revokeObjectURL(currentImageUrl);
        };
        img.src = currentImageUrl;

        exifPreview.innerHTML = '<div style="padding:var(--space-3);background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px">' +
            '<p style="margin:0;color:#dc2626;font-weight:600;font-size:var(--text-sm)"><i class="fas fa-exclamation-triangle" aria-hidden="true"></i> The following metadata will be removed:</p>' +
            '<ul style="margin:var(--space-2) 0 0;padding-left:var(--space-4);font-size:var(--text-sm);color:var(--color-text-light)">' +
            '<li>Camera make and model</li>' +
            '<li>Date and time taken</li>' +
            '<li>GPS coordinates (location)</li>' +
            '<li>Software used to edit</li>' +
            '<li>Thumbnail image</li>' +
            '<li>Orientation data</li>' +
            '<li>All other EXIF/IPTC/XMP data</li>' +
            '</ul></div>';

        settingsPanel.classList.add('show');
        applyBtn.disabled = false;
    });

    applyBtn.addEventListener('click', function() {
        if (!currentFile) return;
        progressSection.style.display = 'block';
        progressSection.classList.add('show');
        applyBtn.disabled = true;
        progressText.textContent = 'Removing metadata...';
        progressFill.style.width = '30%';
        progressPercent.textContent = '30%';

        var img = new Image();
        img.onload = function() {
            progressFill.style.width = '60%';
            progressPercent.textContent = '60%';
            progressText.textContent = 'Re-drawing image on canvas...';

            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0);

            progressFill.style.width = '85%';
            progressPercent.textContent = '85%';
            progressText.textContent = 'Encoding clean image...';

            var outputType = currentFile.type;
            if (outputType !== 'image/png' && outputType !== 'image/jpeg' && outputType !== 'image/webp') {
                outputType = 'image/jpeg';
            }
            var outputExt = outputType === 'image/png' ? '.png' : '.jpg';
            var quality = outputType === 'image/jpeg' ? 0.92 : undefined;

            canvas.toBlob(function(blob) {
                if (!blob) {
                    showNotification('Failed to process image. Try a different format.', true);
                    applyBtn.disabled = false;
                    progressSection.style.display = 'none';
                    return;
                }

                progressFill.style.width = '100%';
                progressPercent.textContent = '100%';
                progressText.textContent = 'Done!';

                var savings = ((1 - blob.size / currentFile.size) * 100).toFixed(1);
                var baseName = currentFile.name.replace(/\.[^.]+$/, '');
                var newName = baseName + '_clean' + outputExt;

                // Show result panel instead of auto-downloading
                var resultHtml = '<div style="padding:var(--space-4);background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:12px;margin-top:var(--space-4)">' +
                    '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">' +
                    '<div style="width:40px;height:40px;border-radius:50%;background:rgba(16,185,129,.15);display:flex;align-items:center;justify-content:center"><i class="fas fa-check" style="color:#10b981;font-size:1.1rem"></i></div>' +
                    '<div><p style="margin:0;font-weight:600;color:#10b981">Metadata Removed Successfully</p>' +
                    '<p style="margin:2px 0 0;font-size:var(--text-xs);color:var(--color-text-light)">' + formatFileSize(currentFile.size) + ' → ' + formatFileSize(blob.size) + ' (' + savings + '% smaller)</p></div></div>' +
                    '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap">' +
                    '<button id="download-result-btn" class="btn btn-primary" style="flex:1;min-width:150px"><i class="fas fa-download" aria-hidden="true"></i> Download ' + newName + '</button>' +
                    '<button id="new-file-btn" class="btn btn-secondary" style="flex:1;min-width:120px"><i class="fas fa-plus" aria-hidden="true"></i> Process Another</button>' +
                    '</div></div>';

                exifPreview.innerHTML = resultHtml;

                // Wire up download button
                var dlBtn = document.getElementById('download-result-btn');
                if (dlBtn) {
                    dlBtn.addEventListener('click', function() {
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        a.download = newName;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
                    });
                }

                // Wire up new file button
                var newBtn = document.getElementById('new-file-btn');
                if (newBtn) {
                    newBtn.addEventListener('click', function() {
                        resetBtn.click();
                    });
                }

                showNotification('Metadata removed! File size reduced by ' + savings + '%');
            }, outputType, quality);
        };
        img.src = URL.createObjectURL(currentFile);
    });

    resetBtn.addEventListener('click', function() {
        currentFile = null;
        currentImageUrl = null;
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        progressSection.classList.remove('show');
        progressFill.style.width = '0%';
        applyBtn.disabled = true;
    });
});
