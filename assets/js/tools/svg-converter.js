document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var convertBtn = document.getElementById('convert-btn');
    var resetBtn = document.getElementById('reset-btn');
    var downloadBtn = document.getElementById('download-btn');
    var previewContainer = document.getElementById('preview-container');
    var resultContainer = document.getElementById('result-container');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');
    var resultsArea = document.getElementById('results-area');
    var outputFormat = document.getElementById('output-format');
    var qualitySlider = document.getElementById('quality');
    var qualityValue = document.getElementById('quality-value');
    var qualityGroup = document.getElementById('quality-group');
    var bgColor = document.getElementById('bg-color');
    var bgColorHex = document.getElementById('bg-color-hex');
    var bgTransparent = document.getElementById('bg-transparent');
    var svgDims = document.getElementById('svg-dims');
    var resultDims = document.getElementById('result-dims');
    var resultSize = document.getElementById('result-size');
    var customScale = document.getElementById('custom-scale');
    var customScaleValue = document.getElementById('custom-scale-value');
    var customScaleGroup = document.getElementById('custom-scale-group');

    var currentFile = null;
    var currentSvgDataUrl = null;
    var currentImage = null;
    var resultBlob = null;
    var svgWidth = 0;
    var svgHeight = 0;
    var activeScale = 1;
    var scaleBtns = document.querySelectorAll('.resolution-btn');

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

    outputFormat.addEventListener('change', function() {
        qualityGroup.style.display = outputFormat.value === 'image/png' ? 'none' : '';
        bgTransparent.disabled = outputFormat.value !== 'image/png';
        if (outputFormat.value !== 'image/png' && bgTransparent.checked) {
            bgTransparent.checked = false;
        }
    });

    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = qualitySlider.value + '%';
    });

    bgColor.addEventListener('input', function() {
        bgColorHex.textContent = bgColor.value;
    });

    bgTransparent.addEventListener('change', function() {
        if (bgTransparent.checked) {
            bgColor.disabled = true;
            bgColorHex.textContent = 'transparent';
        } else {
            bgColor.disabled = false;
            bgColorHex.textContent = bgColor.value;
        }
    });

    scaleBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            scaleBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var scale = btn.getAttribute('data-scale');
            if (scale === 'custom') {
                customScaleGroup.style.display = '';
                activeScale = parseFloat(customScale.value) || 2;
                customScaleValue.textContent = activeScale + 'x';
            } else {
                customScaleGroup.style.display = 'none';
                activeScale = parseInt(scale) || 1;
            }
        });
    });

    customScale.addEventListener('input', function() {
        activeScale = parseFloat(customScale.value) || 2;
        customScaleValue.textContent = activeScale + 'x';
    });

    function readSvgFile(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var svgContent = e.target.result;
            var svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            var url = URL.createObjectURL(svgBlob);

            var img = new Image();
            img.onload = function() {
                URL.revokeObjectURL(url);
                currentImage = img;
                svgWidth = img.naturalWidth;
                svgHeight = img.naturalHeight;
                svgDims.textContent = svgWidth + ' x ' + svgHeight;

                previewContainer.innerHTML = '';
                var previewImg = document.createElement('img');
                previewImg.src = url;
                previewImg.style.maxWidth = '100%';
                previewImg.style.maxHeight = '300px';
                previewImg.style.borderRadius = '8px';
                previewImg.alt = 'SVG preview';
                previewContainer.appendChild(previewImg);

                settingsPanel.classList.add('show');
                convertBtn.disabled = false;
            };
            img.onerror = function() {
                showNotification('Failed to render SVG. The file may use unsupported features or external references.', true);
                convertBtn.disabled = true;
            };
            img.src = url;
            currentSvgDataUrl = url;
        };
        reader.readAsText(file);
    }

    fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (!file.name.match(/\.svg$/i) && file.type !== 'image/svg+xml') {
            showNotification('Please select an SVG file', true);
            return;
        }
        currentFile = file;
        readSvgFile(file);
    });

    function renderToCanvas() {
        if (!currentImage) return;

        var w = svgWidth * activeScale;
        var h = svgHeight * activeScale;
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');

        if (outputFormat.value !== 'image/png' || !bgTransparent.checked) {
            var hex = bgColor.value || '#ffffff';
            ctx.fillStyle = hex;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.drawImage(currentImage, 0, 0, w, h);

        var fmt = outputFormat.value;
        var quality = fmt === 'image/png' ? undefined : (qualitySlider.value / 100);

        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (!blob) {
                    reject(new Error('Failed to encode image'));
                    return;
                }
                resultBlob = blob;
                resolve({ blob: blob, width: w, height: h, canvas: canvas });
            }, fmt, quality);
        });
    }

    convertBtn.addEventListener('click', function() {
        if (!currentImage) return;

        progressSection.style.display = 'block';
        convertBtn.disabled = true;
        progressText.textContent = 'Rendering SVG to canvas...';
        progressFill.style.width = '30%';
        progressPercent.textContent = '30%';

        setTimeout(function() {
            renderToCanvas().then(function(data) {
                progressFill.style.width = '70%';
                progressPercent.textContent = '70%';
                progressText.textContent = 'Encoding...';

                setTimeout(function() {
                    progressFill.style.width = '100%';
                    progressPercent.textContent = '100%';
                    progressText.textContent = 'Done!';

                    resultContainer.innerHTML = '';
                    var resultImg = document.createElement('img');
                    if (window._svgResultUrl) URL.revokeObjectURL(window._svgResultUrl);
                    var url = URL.createObjectURL(data.blob);
                    window._svgResultUrl = url;
                    resultImg.src = url;
                    resultImg.style.maxWidth = '100%';
                    resultImg.style.maxHeight = '200px';
                    resultImg.style.borderRadius = '4px';
                    resultContainer.appendChild(resultImg);

                    resultDims.textContent = data.width + ' x ' + data.height;
                    resultSize.textContent = formatSize(data.blob.size);
                    resultsArea.style.display = 'block';
                    convertBtn.disabled = false;
                }, 100);
            }).catch(function(err) {
                showNotification('Error: ' + err.message, true);
                convertBtn.disabled = false;
                progressSection.style.display = 'none';
            });
        }, 150);
    });

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    downloadBtn.addEventListener('click', function() {
        if (!resultBlob) return;
        var ext = outputFormat.value === 'image/png' ? '.png' : '.jpg';
        var baseName = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'svg';
        var url = URL.createObjectURL(resultBlob);
        var a = document.createElement('a');
        a.href = url;
        a.download = baseName + '_' + Math.round(svgWidth * activeScale) + 'x' + Math.round(svgHeight * activeScale) + ext;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    });

    resetBtn.addEventListener('click', function() {
        currentFile = null;
        currentImage = null;
        currentSvgDataUrl = null;
        resultBlob = null;
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        resultsArea.style.display = 'none';
        convertBtn.disabled = true;
        previewContainer.innerHTML = '';
        svgDims.textContent = '-';
    });
});
