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
    var supportNotice = document.getElementById('avif-support-notice');
    var supportNoticeText = document.getElementById('support-notice-text');

    var files = [];
    var results = [];
    var avifSupported = false;

    function checkAvifSupport() {
        var canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        if (canvas.getContext) {
            var dataUrl = canvas.toDataURL('image/avif');
            avifSupported = dataUrl.indexOf('image/avif') === 5;
        }
        if (avifSupported) {
            supportNotice.className = 'support-notice support-ok';
            supportNoticeText.textContent = 'Your browser supports AVIF encoding. You can convert directly to AVIF format.';
            supportNotice.style.display = 'block';
        } else {
            supportNotice.className = 'support-notice';
            supportNotice.style.display = 'block';
            supportNoticeText.innerHTML = '<strong>AVIF encoding is not supported in your browser.</strong> Chrome 85+ supports it, but most other browsers do not yet support AVIF encoding. You can still convert to WebP, JPEG, or PNG as a fallback.';
            if (targetFormat.value === 'image/avif') {
                targetFormat.value = 'image/webp';
            }
        }
    }

    checkAvifSupport();

    targetFormat.addEventListener('change', function() {
        if (targetFormat.value === 'image/avif' && !avifSupported) {
            showNotification('AVIF encoding is not supported in your browser. Please choose WebP, JPEG, or PNG.', true);
            targetFormat.value = 'image/webp';
        }
        var isPng = targetFormat.value === 'image/png';
        qualitySlider.disabled = isPng;
        if (isPng) {
            qualityValue.textContent = 'N/A';
        } else {
            qualityValue.textContent = qualitySlider.value + '%';
        }
    });

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 4000);
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
        if (!qualitySlider.disabled) {
            qualityValue.textContent = qualitySlider.value + '%';
        }
    });

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function getExtension(mimeType) {
        var map = { 'image/avif': '.avif', 'image/webp': '.webp', 'image/jpeg': '.jpg', 'image/png': '.png' };
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
                    '<div class="file-size">' + formatSize(f.file.size) + '</div>' +
                '</div>';
            fileItems.appendChild(item);
        });
        fileCount.textContent = files.length;
        fileList.style.display = files.length ? 'block' : 'none';
        convertBtn.disabled = files.length === 0;
    }

    fileInput.addEventListener('change', function(e) {
        var selected = Array.from(e.target.files);
        selected.forEach(function(file) {
            if (!file.type.match(/^image\/(jpeg|png|webp|avif)$/)) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                files.push({ file: file, dataUrl: ev.target.result });
                renderFileList();
            };
            reader.readAsDataURL(file);
        });
    });

    function tryConvertWithFallback(f, fmt, useQuality, callback) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(function(blob) {
                if (blob === null) {
                    var fallbackMap = {
                        'image/avif': 'image/webp',
                        'image/webp': 'image/jpeg',
                        'image/jpeg': 'image/png',
                        'image/png': null
                    };
                    var fallback = fallbackMap[fmt];
                    if (fallback) {
                        showNotification(fmt.split('/')[1].toUpperCase() + ' encoding failed, trying ' + fallback.split('/')[1].toUpperCase() + '...', false);
                        var fallbackQ = fallback === 'image/png' ? undefined : useQuality;
                        canvas.toBlob(function(blob2) {
                            callback(blob2, fallback, img);
                        }, fallback, fallbackQ);
                    } else {
                        callback(null, fmt, img);
                    }
                    return;
                }
                callback(blob, fmt, img);
            }, fmt, useQuality);
        };
        img.onerror = function() {
            showNotification('Failed to load ' + f.file.name, true);
            callback(null, fmt, null);
        };
        img.src = f.dataUrl;
    }

    convertBtn.addEventListener('click', function() {
        if (!files.length) return;
        if (targetFormat.value === 'image/avif' && !avifSupported) {
            showNotification('AVIF encoding is not supported in your browser. Please choose WebP, JPEG, or PNG.', true);
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
        var fmt = targetFormat.value;
        var useQuality = fmt === 'image/png' ? undefined : (qualitySlider.value / 100);

        function processNext(idx) {
            if (idx >= total) {
                progressFill.style.width = '100%';
                progressPercent.textContent = '100%';
                progressText.textContent = 'All done!';
                convertBtn.disabled = false;
                if (results.length > 0) {
                    resultsArea.style.display = 'block';
                    if (results.length > 1) downloadAllBtn.style.display = '';
                } else {
                    showNotification('Conversion failed. Try a different target format.', true);
                }
                return;
            }

            var f = files[idx];
            var pct = Math.round((idx / total) * 100);
            progressFill.style.width = pct + '%';
            progressPercent.textContent = pct + '%';
            progressText.textContent = 'Converting ' + f.file.name + '...';

            tryConvertWithFallback(f, fmt, useQuality, function(blob, actualFmt, loadedImg) {
                if (blob) {
                    var baseName = f.file.name.replace(/\.[^.]+$/, '');
                    var ext = getExtension(actualFmt);
                    results.push({ blob: blob, name: baseName + ext, originalSize: f.file.size, compressedSize: blob.size });

                    var item = document.createElement('div');
                    item.className = 'result-item';
                    item.innerHTML =
                        '<canvas width="120" height="90" style="max-width:100%;max-height:120px;border-radius:4px;"></canvas>' +
                        '<div class="result-name">' + baseName + ext + '</div>' +
                        '<div class="result-sizes">' + formatSize(f.file.size) + ' &rarr; ' + formatSize(blob.size) + '</div>' +
                        '<button class="btn btn-primary btn-sm download-single" data-idx="' + (results.length - 1) + '"><i class="fas fa-download"></i> Download</button>';
                    resultsGrid.appendChild(item);

                    if (loadedImg) {
                        var previewCanvas = item.querySelector('canvas');
                        var pCtx = previewCanvas.getContext('2d');
                        pCtx.fillStyle = '#fff';
                        pCtx.fillRect(0, 0, 120, 90);
                        var scale = Math.min(120 / loadedImg.naturalWidth, 90 / loadedImg.naturalHeight);
                        var dx = (120 - loadedImg.naturalWidth * scale) / 2;
                        var dy = (90 - loadedImg.naturalHeight * scale) / 2;
                        pCtx.drawImage(loadedImg, 0, 0, loadedImg.naturalWidth, loadedImg.naturalHeight, dx, dy, loadedImg.naturalWidth * scale, loadedImg.naturalHeight * scale);
                    }
                }

                done++;
                processNext(idx + 1);
            });
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
