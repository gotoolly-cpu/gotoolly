document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var fileList = document.getElementById('file-list');
    var fileItems = document.getElementById('file-items');
    var fileCount = document.getElementById('file-count');
    var convertBtn = document.getElementById('convert-btn');
    var downloadAllBtn = document.getElementById('download-all-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');
    var resultsArea = document.getElementById('results-area');
    var resultsGrid = document.getElementById('results-grid');
    var targetFormat = document.getElementById('target-format');
    var qualitySlider = document.getElementById('quality');
    var qualityValue = document.getElementById('quality-value');
    var webpStatus = document.getElementById('webp-status');
    var webpNotice = document.getElementById('webp-notice');
    var webpNoticeText = document.getElementById('webp-notice-text');

    var files = [];
    var results = [];
    var webpSupported = false;

    function checkWebpSupport() {
        var canvas = document.createElement('canvas');
        if (canvas.getContext) {
            var dataUrl = canvas.toDataURL('image/webp');
            webpSupported = dataUrl.indexOf('image/webp') === 5;
        }
        if (webpSupported) {
            webpStatus.textContent = 'WebP supported';
            webpStatus.style.background = 'rgba(255,255,255,0.15)';
        } else {
            webpStatus.textContent = 'WebP encoding not supported';
            webpStatus.style.background = 'rgba(255,200,0,0.25)';
            if (targetFormat.value === 'image/webp') {
                webpNotice.style.display = 'block';
                webpNoticeText.textContent = 'Your browser does not support WebP encoding. Please choose JPEG or PNG as the target format.';
            }
        }
    }

    checkWebpSupport();

    targetFormat.addEventListener('change', function() {
        if (targetFormat.value === 'image/webp' && !webpSupported) {
            webpNotice.style.display = 'block';
            webpNoticeText.textContent = 'Your browser does not support WebP encoding. Please choose JPEG or PNG as the target format.';
        } else {
            webpNotice.style.display = 'none';
        }
        document.getElementById('quality-group').style.display = targetFormat.value === 'image/png' ? 'none' : '';
    });

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

    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = qualitySlider.value + '%';
    });

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function getFormatLabel(mimeType) {
        var map = { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP' };
        return map[mimeType] || mimeType;
    }

    function getExtension(mimeType) {
        var map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
        return map[mimeType] || '.bin';
    }

    function renderFileList() {
        fileItems.innerHTML = '';
        files.forEach(function(f, idx) {
            var item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML =
                '<img class="file-thumb" src="' + f.dataUrl + '" alt="' + f.file.name + '">' +
                '<div class="file-info">' +
                    '<div class="file-name">' + f.file.name + '</div>' +
                    '<div class="file-size">' + formatSize(f.file.size) + ' &middot; <span class="file-format-badge">' + getFormatLabel(f.file.type) + '</span></div>' +
                '</div>';
            fileItems.appendChild(item);
        });
        fileCount.textContent = files.length;
        fileList.style.display = files.length ? '' : 'none';
        convertBtn.disabled = files.length === 0;
    }

    fileInput.addEventListener('change', function(e) {
        var selected = Array.from(e.target.files);
        selected.forEach(function(file) {
            if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                files.push({ file: file, dataUrl: ev.target.result });
                renderFileList();
            };
            reader.readAsDataURL(file);
        });
    });

    convertBtn.addEventListener('click', function() {
        if (!files.length) return;
        if (targetFormat.value === 'image/webp' && !webpSupported) {
            showNotification('WebP encoding is not supported in your browser. Please choose JPEG or PNG instead.', true);
            return;
        }

        results = [];
        resultsGrid.innerHTML = '';
        resultsArea.style.display = 'none';
        downloadAllBtn.style.display = 'none';
        progressSection.style.display = 'block';
        convertBtn.disabled = true;

        var total = files.length;
        var done = 0;
        var quality = qualitySlider.value / 100;
        var fmt = targetFormat.value;
        var useQuality = fmt === 'image/png' ? undefined : quality;

        function processNext(idx) {
            if (idx >= total) {
                progressFill.style.width = '100%';
                progressPercent.textContent = '100%';
                progressText.textContent = 'All done!';
                resultsArea.style.display = 'block';
                convertBtn.disabled = false;
                if (results.length > 1) downloadAllBtn.style.display = '';
                return;
            }

            var f = files[idx];
            progressText.textContent = 'Converting ' + f.file.name + '...';

            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                var ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(function(blob) {
                    var baseName = f.file.name.replace(/\.[^.]+$/, '');
                    var ext = getExtension(fmt);
                    results.push({ blob: blob, name: baseName + ext, originalSize: f.file.size, compressedSize: blob.size });

                    var item = document.createElement('div');
                    item.className = 'result-item';
                    item.innerHTML =
                        '<canvas width="120" height="90" style="max-width:100%;max-height:120px;border-radius:4px;"></canvas>' +
                        '<div class="result-name">' + baseName + ext + '</div>' +
                        '<div class="result-sizes">' + formatSize(f.file.size) + ' &rarr; ' + formatSize(blob.size) + '</div>' +
                        '<button class="btn btn-primary btn-sm download-single" data-idx="' + idx + '"><i class="fas fa-download"></i> Download</button>';
                    resultsGrid.appendChild(item);

                    var previewCanvas = item.querySelector('canvas');
                    var pCtx = previewCanvas.getContext('2d');
                    pCtx.fillStyle = '#fff';
                    pCtx.fillRect(0, 0, 120, 90);
                    var scale = Math.min(120 / img.naturalWidth, 90 / img.naturalHeight);
                    var dx = (120 - img.naturalWidth * scale) / 2;
                    var dy = (90 - img.naturalHeight * scale) / 2;
                    pCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, img.naturalWidth * scale, img.naturalHeight * scale);

                    done++;
                    var pct = Math.round((done / total) * 100);
                    progressFill.style.width = pct + '%';
                    progressPercent.textContent = pct + '%';

                    processNext(idx + 1);
                }, fmt, useQuality);
            };
            img.src = f.dataUrl;
        }

        processNext(0);
    });

    resultsGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('.download-single');
        if (!btn) return;
        var idx = parseInt(btn.getAttribute('data-idx'));
        var r = results[idx];
        if (!r) return;
        var url = URL.createObjectURL(r.blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = r.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    });

    downloadAllBtn.addEventListener('click', function() {
        if (typeof JSZip === 'undefined') {
            results.forEach(function(r) {
                var url = URL.createObjectURL(r.blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = r.name;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            });
            showNotification('JSZip not available - downloading files individually');
            return;
        }

        var zip = new JSZip();
        results.forEach(function(r) {
            zip.file(r.name, r.blob);
        });
        zip.generateAsync({ type: 'blob' }).then(function(content) {
            var url = URL.createObjectURL(content);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'converted-images.zip';
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        });
    });

    resetBtn.addEventListener('click', function() {
        files = [];
        results = [];
        fileInput.value = '';
        fileList.style.display = 'none';
        fileItems.innerHTML = '';
        fileCount.textContent = '0';
        convertBtn.disabled = true;
        downloadAllBtn.style.display = 'none';
        progressSection.style.display = 'none';
        resultsArea.style.display = 'none';
        resultsGrid.innerHTML = '';
    });
});
