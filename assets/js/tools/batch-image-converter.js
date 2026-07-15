document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var fileList = document.getElementById('file-list');
    var fileListItems = document.getElementById('file-list-items');
    var fileCount = document.getElementById('file-count');
    var convertBtn = document.getElementById('convert-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var perFileProgress = document.getElementById('per-file-progress');
    var resultsArea = document.getElementById('results-area');
    var resultsGrid = document.getElementById('results-grid');
    var downloadAllBtn = document.getElementById('download-all-btn');
    var qualitySlider = document.getElementById('quality-slider');
    var qualityValue = document.getElementById('quality-value');
    var targetFormat = document.getElementById('target-format');

    var files = [];
    var results = [];
    var MAX_FILES = 20;

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
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        });
    }

    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = this.value + '%';
    });

    function handleFiles(fileListObj) {
        var incoming = Array.from(fileListObj).filter(function(f) { return f.type.match(/^image\/(jpeg|png|webp)$/); });
        var combined = files.concat(incoming);
        if (combined.length > MAX_FILES) {
            showNotification('Maximum ' + MAX_FILES + ' files allowed. Extra files ignored.', true);
            combined = combined.slice(0, MAX_FILES);
        }
        files = combined;
        renderFileList();
        convertBtn.disabled = files.length === 0;
    }

    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length) handleFiles(e.target.files);
    });

    function renderFileList() {
        fileList.style.display = files.length ? 'block' : 'none';
        fileCount.textContent = files.length + ' file' + (files.length !== 1 ? 's' : '');
        fileListItems.innerHTML = '';
        files.forEach(function(file, i) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var div = document.createElement('div');
                div.className = 'file-list-item';
                div.innerHTML = '<img src="' + e.target.result + '" alt="' + file.name + '">'
                    + '<div class="file-info"><strong>' + file.name + '</strong><div class="file-format">' + (file.type.split('/')[1] || '').toUpperCase() + ' &middot; ' + (file.size / 1024).toFixed(1) + ' KB</div></div>'
                    + '<button class="btn btn-outline btn-sm" data-index="' + i + '" style="flex-shrink:0"><i class="fas fa-times"></i></button>';
                div.querySelector('button').addEventListener('click', function() {
                    files.splice(i, 1);
                    renderFileList();
                    if (files.length === 0) convertBtn.disabled = true;
                });
                fileListItems.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }

    convertBtn.addEventListener('click', async function() {
        if (!files.length) return;
        results = [];
        resultsArea.style.display = 'none';
        resultsGrid.innerHTML = '';
        progressSection.style.display = 'block';
        convertBtn.disabled = true;
        var format = targetFormat.value;
        var quality = parseInt(qualitySlider.value) / 100;
        var mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
        var ext = format === 'jpeg' ? 'jpg' : format;

        perFileProgress.innerHTML = '';
        var total = files.length;
        var done = 0;

        for (var i = 0; i < total; i++) {
            var file = files[i];
            var pItem = document.createElement('div');
            pItem.className = 'per-file-item';
            pItem.innerHTML = '<span style="min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + file.name + '</span>'
                + '<div class="file-progress-bar"><div class="file-progress-fill" id="pf-' + i + '"></div></div>'
                + '<span id="pfp-' + i + '" style="font-size:var(--text-xs);min-width:40px;text-align:right">0%</span>';
            perFileProgress.appendChild(pItem);

            try {
                progressText.textContent = 'Converting: ' + file.name;
                var result = await convertFile(file, mimeType, ext, quality);
                results.push(result);
                document.getElementById('pf-' + i).style.width = '100%';
                document.getElementById('pfp-' + i).textContent = '100%';
            } catch (err) {
                showNotification('Failed: ' + file.name, true);
                if (document.getElementById('pf-' + i)) document.getElementById('pf-' + i).style.width = '0%';
            }

            done++;
            var pct = Math.round((done / total) * 100);
            progressFill.style.width = pct + '%';
            progressPercent.textContent = pct + '%';
        }

        progressText.textContent = 'Done!';
        convertBtn.disabled = false;
        renderResults();
    });

    function convertFile(file, mimeType, ext, quality) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    var ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0);
                    var q = mimeType === 'image/png' ? undefined : quality;
                    canvas.toBlob(function(blob) {
                        if (!blob) { reject(new Error('Encoding failed')); return; }
                        var url = URL.createObjectURL(blob);
                        var baseName = file.name.replace(/\.[^.]+$/, '');
                        resolve({ blob: blob, url: url, name: baseName + '.' + ext, size: blob.size });
                    }, mimeType, q);
                };
                img.onerror = function() { reject(new Error('Image load failed')); };
                img.src = e.target.result;
            };
            reader.onerror = function() { reject(new Error('File read failed')); };
            reader.readAsDataURL(file);
        });
    }

    function renderResults() {
        resultsGrid.innerHTML = '';
        results.forEach(function(r) {
            var div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = '<img src="' + r.url + '" alt="' + r.name + '">'
                + '<div class="result-name">' + r.name + '</div>'
                + '<div style="font-size:var(--text-xs);color:var(--color-text-light);margin-bottom:var(--space-2)">' + (r.size / 1024).toFixed(1) + ' KB</div>'
                + '<button class="btn btn-primary btn-sm download-single" style="width:100%"><i class="fas fa-download"></i> Download</button>';
            div.querySelector('.download-single').addEventListener('click', function() {
                var a = document.createElement('a');
                a.href = r.url;
                a.download = r.name;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { document.body.removeChild(a); }, 100);
            });
            resultsGrid.appendChild(div);
        });
        resultsArea.style.display = 'block';
    }

    downloadAllBtn.addEventListener('click', async function() {
        if (typeof JSZip === 'undefined') {
            showNotification('JSZip not available. Download files individually.', true);
            return;
        }
        var zip = new JSZip();
        results.forEach(function(r) {
            zip.file(r.name, r.blob);
        });
        var content = await zip.generateAsync({ type: 'blob' });
        var url = URL.createObjectURL(content);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'converted-images.zip';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        showNotification('ZIP download started!');
    });

    resetBtn.addEventListener('click', function() {
        files = [];
        results = [];
        fileInput.value = '';
        renderFileList();
        fileList.style.display = 'none';
        fileCount.textContent = '0 files';
        progressSection.style.display = 'none';
        resultsArea.style.display = 'none';
        resultsGrid.innerHTML = '';
        perFileProgress.innerHTML = '';
        convertBtn.disabled = true;
    });
});
