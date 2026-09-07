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
    var qualitySlider = document.getElementById('quality');
    var qualityValue = document.getElementById('quality-value');
    var bgColor = document.getElementById('bg-color');
    var bgColorHex = document.getElementById('bg-color-hex');

    var files = [];
    var results = [];
    var isConverting = false;

    var ICONS = {
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        fail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
    };

    function showToast(msg, type) {
        var el = document.getElementById('gt-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gt-toast';
            el.className = 'gt-toast';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        var icon = type === 'success' ? ICONS.check : type === 'error' ? ICONS.fail : ICONS.info;
        el.innerHTML = icon + msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        el.className = 'gt-toast show ' + (type || 'info');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function() { el.className = 'gt-toast'; }, 2600);
    }

    function stickyBtn(action, label, extra, icon) {
        return '<button type="button" class="gt-sa-btn' + (extra ? ' ' + extra : '') + '" data-sa="' + action + '">' + ICONS[icon] + label + '</button>';
    }

    var stickyBar;
    function renderSticky() {
        var bar = document.getElementById('gt-sticky');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'gt-sticky';
            bar.className = 'gt-sticky-actions';
            bar.setAttribute('role', 'toolbar');
            bar.setAttribute('aria-label', 'Image converter actions');
            document.body.appendChild(bar);
            bar.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-sa]');
                if (!btn) return;
                var action = btn.getAttribute('data-sa');
                if (action === 'convert') { if (!isConverting && files.length) convertAll(); }
                else if (action === 'download') { downloadAll(); }
                else if (action === 'clear') { reset(); }
                else if (action === 'again') { reset(); fileInput.click(); }
            });
        }
        bar.innerHTML =
            stickyBtn('convert', 'Convert', 'primary', 'play') +
            stickyBtn('download', 'Download All', '', 'download') +
            stickyBtn('again', 'Convert Another', '', 'upload') +
            stickyBtn('clear', 'Clear', '', 'clear');
        stickyBar = bar;
    }

    function updateSticky() {
        if (!stickyBar) return;
        var hasFiles = files.length > 0;
        var hasResults = results.length > 0;
        var btnConvert = stickyBar.querySelector('[data-sa="convert"]');
        var btnDownload = stickyBar.querySelector('[data-sa="download"]');
        var btnAgain = stickyBar.querySelector('[data-sa="again"]');
        var btnClear = stickyBar.querySelector('[data-sa="clear"]');
        btnConvert.disabled = !hasFiles || isConverting;
        btnDownload.disabled = !hasResults;
        btnAgain.disabled = !hasFiles && !hasResults;
        btnClear.disabled = !hasFiles && !hasResults && !isConverting;
        if (hasFiles || hasResults || isConverting) {
            stickyBar.classList.add('show');
        } else {
            stickyBar.classList.remove('show');
        }
    }

    var dropZone = document.querySelector('.upload-area');
    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
        dropZone.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
    }

    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = qualitySlider.value + '%';
    });

    bgColor.addEventListener('input', function() {
        bgColorHex.textContent = bgColor.value;
    });

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function renderFileList() {
        fileItems.innerHTML = '';
        files.forEach(function(f) {
            var item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML =
                '<img class="file-thumb" src="' + f.dataUrl + '" alt="' + f.file.name.replace(/"/g, '&quot;') + '">' +
                '<div class="file-info">' +
                    '<div class="file-name">' + f.file.name.replace(/[<>&]/g, function(m) { return m === '<' ? '&lt;' : m === '>' ? '&gt;' : '&amp;'; }) + '</div>' +
                    '<div class="file-size">' + formatSize(f.file.size) + '</div>' +
                '</div>';
            fileItems.appendChild(item);
        });
        fileCount.textContent = files.length;
        fileList.style.display = files.length ? '' : 'none';
        convertBtn.disabled = files.length === 0 || isConverting;
        updateSticky();
    }

    fileInput.addEventListener('change', function(e) {
        var selected = Array.from(e.target.files);
        var count = 0;
        selected.forEach(function(file) {
            if (!file.type.match(/^image\/png$/)) return;
            count++;
            var reader = new FileReader();
            reader.onload = function(ev) {
                files.push({ file: file, dataUrl: ev.target.result });
                renderFileList();
            };
            reader.readAsDataURL(file);
        });
        if (!count && selected.length) {
            showToast('Only PNG images are supported', 'error');
        }
    });

    function convertAll() {
        if (!files.length || isConverting) return;
        results = [];
        resultsGrid.innerHTML = '';
        resultsArea.classList.remove('on');
        progressSection.classList.add('show');
        convertBtn.disabled = true;
        downloadAllBtn.disabled = true;
        isConverting = true;
        updateSticky();

        var total = files.length;
        var done = 0;
        var quality = qualitySlider.value / 100;
        var bg = bgColor.value;

        function hexToRgb(hex) {
            return {
                r: parseInt(hex.slice(1, 3), 16),
                g: parseInt(hex.slice(3, 5), 16),
                b: parseInt(hex.slice(5, 7), 16)
            };
        }

        function processNext(idx) {
            if (idx >= total) {
                progressFill.style.width = '100%';
                progressPercent.textContent = '100%';
                progressText.textContent = 'All done!';
                progressSection.classList.remove('show');
                resultsArea.classList.add('on');
                convertBtn.disabled = false;
                downloadAllBtn.disabled = false;
                isConverting = false;
                updateSticky();
                showToast(total + ' image' + (total === 1 ? '' : 's') + ' converted successfully', 'success');
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

                var rgb = hexToRgb(bg);
                ctx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                ctx.canvas.toBlob(function(blob) {
                    var baseName = f.file.name.replace(/\.[^.]+$/, '');
                    results.push({ blob: blob, name: baseName + '.jpg', originalSize: f.file.size, compressedSize: blob.size });

                    var item = document.createElement('div');
                    item.className = 'result-item';
                    var imgUrl = URL.createObjectURL(blob);
                    item.innerHTML =
                        '<img src="' + imgUrl + '" alt="Converted ' + baseName.replace(/"/g, '&quot;') + '">' +
                        '<div class="result-name">' + baseName + '.jpg</div>' +
                        '<div class="result-sizes">' + formatSize(f.file.size) + ' &rarr; ' + formatSize(blob.size) + '</div>' +
                        '<button class="btn-sm btn-success download-single" data-idx="' + (results.length - 1) + '">' + ICONS.download + 'Download</button>';
                    resultsGrid.appendChild(item);

                    done++;
                    var pct = Math.round((done / total) * 100);
                    progressFill.style.width = pct + '%';
                    progressPercent.textContent = pct + '%';

                    processNext(idx + 1);
                }, 'image/jpeg', quality);
            };
            img.onerror = function() {
                done++;
                showToast('Could not read ' + f.file.name, 'error');
                processNext(idx + 1);
            };
            img.src = f.dataUrl;
        }

        processNext(0);
    }

    convertBtn.addEventListener('click', convertAll);

    resultsGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('.download-single');
        if (!btn) return;
        var r = results[parseInt(btn.getAttribute('data-idx'), 10)];
        if (!r) return;
        var url = URL.createObjectURL(r.blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = r.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    });

    function downloadAll() {
        if (!results.length) return;
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
            showToast('JSZip not available - downloading files individually', 'info');
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
            showToast(results.length > 1 ? 'ZIP downloaded - ' + results.length + ' images' : 'Image downloaded', 'success');
        });
    }

    downloadAllBtn.addEventListener('click', downloadAll);

    function reset() {
        files = [];
        results = [];
        isConverting = false;
        fileInput.value = '';
        fileList.style.display = 'none';
        fileItems.innerHTML = '';
        fileCount.textContent = '0';
        convertBtn.disabled = true;
        downloadAllBtn.disabled = true;
        progressSection.classList.remove('show');
        progressFill.style.width = '0';
        progressPercent.textContent = '0%';
        progressText.textContent = 'Processing...';
        resultsArea.classList.remove('on');
        resultsGrid.innerHTML = '';
        updateSticky();
    }

    resetBtn.addEventListener('click', function() {
        reset();
        showToast('Cleared', 'info');
    });

    renderSticky();
    updateSticky();
});