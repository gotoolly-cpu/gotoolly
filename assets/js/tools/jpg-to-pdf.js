document.addEventListener('DOMContentLoaded', function () {
    function waitForLibs(callback) {
        if (typeof PDFLib !== 'undefined') {
            callback();
            return;
        }
        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (typeof PDFLib !== 'undefined') {
                clearInterval(interval);
                callback();
            } else if (attempts > 50) {
                clearInterval(interval);
                notify('Libraries failed to load. Please refresh the page.', 'error');
            }
        }, 200);
    }

    waitForLibs(function () {
        var fileInput = document.getElementById('jpg-input');
        var dropZone = document.getElementById('drop-zone');
        var fileInfo = document.getElementById('file-info');
        var fileStatus = document.getElementById('file-status');
        var fileCount = document.getElementById('file-count');
        var imageGrid = document.getElementById('image-grid');
        var settingsPanel = document.getElementById('settings-panel');
        var pageSizeSelect = document.getElementById('page-size');
        var orientationSelect = document.getElementById('orientation');
        var marginsSelect = document.getElementById('margins');
        var convertBtn = document.getElementById('convert-btn');
        var resetBtn = document.getElementById('reset-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var progressContainer = document.getElementById('progress-container');
        var progressFill = document.getElementById('progress-fill');
        var progressText = document.getElementById('progress-text');
        var progressPercent = document.getElementById('progress-percent');
        var resultsPanel = document.getElementById('results-panel');
        var resultsDesc = document.getElementById('results-desc');
        var resultPages = document.getElementById('result-pages');
        var resultSize = document.getElementById('result-size');
        var downloadBtn = document.getElementById('download-btn');
        var newFileBtn = document.getElementById('new-file-btn');

        var images = [];
        var cancelled = false;
        var dragIndex = null;

        function init() {
            fileInput.addEventListener('change', handleFileSelect);
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            convertBtn.addEventListener('click', startConversion);
            resetBtn.addEventListener('click', resetTool);
            cancelBtn.addEventListener('click', function () { cancelled = true; });
            newFileBtn.addEventListener('click', resetTool);
        }

        function handleFileSelect(e) {
            var files = Array.from(e.target.files);
            addFiles(files);
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            var files = Array.from(e.dataTransfer.files).filter(function (f) {
                return f.type === 'image/jpeg';
            });
            addFiles(files);
        }

        function addFiles(files) {
            var valid = files.filter(function (f) { return f.type === 'image/jpeg'; });
            if (valid.length === 0) {
                notify('Please select JPG files only', 'error');
                return;
            }
            valid.forEach(function (file) {
                if (file.size > 50 * 1024 * 1024) {
                    notify('File too large: ' + file.name, 'error');
                    return;
                }
                var reader = new FileReader();
                reader.onload = function (e) {
                    images.push({ file: file, data: e.target.result, name: file.name });
                    updateUI();
                };
                reader.readAsDataURL(file);
            });
        }

        function updateUI() {
            fileInfo.classList.toggle('show', images.length > 0);
            settingsPanel.classList.toggle('show', images.length > 0);
            imageGrid.innerHTML = '';
            fileCount.textContent = images.length + ' image' + (images.length !== 1 ? 's' : '');
            fileStatus.textContent = images.length > 0 ? 'Ready' : '';
            dropZone.style.display = images.length > 0 ? 'none' : '';

            images.forEach(function (img, idx) {
                var div = document.createElement('div');
                div.className = 'image-thumb';
                div.draggable = true;
                div.innerHTML = '<img src="' + img.data + '" alt="' + img.name + '">' +
                    '<div class="thumb-info">' +
                    '<span class="thumb-name">' + img.name + '</span>' +
                    '<span class="thumb-size">' + formatSize(img.file.size) + '</span>' +
                    '</div>' +
                    '<button class="thumb-remove" data-idx="' + idx + '" aria-label="Remove">&times;</button>';
                div.addEventListener('dragstart', function () { dragIndex = idx; div.classList.add('dragging'); });
                div.addEventListener('dragend', function () { div.classList.remove('dragging'); dragIndex = null; });
                div.addEventListener('dragover', function (e) { e.preventDefault(); });
                div.addEventListener('drop', function (e) {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== idx) {
                        var moved = images.splice(dragIndex, 1)[0];
                        images.splice(idx, 0, moved);
                        updateUI();
                    }
                });
                div.querySelector('.thumb-remove').addEventListener('click', function () {
                    images.splice(idx, 1);
                    updateUI();
                });
                imageGrid.appendChild(div);
            });
        }

        async function startConversion() {
            if (images.length === 0) {
                notify('Please add JPG images first', 'error');
                return;
            }
            cancelled = false;
            convertBtn.disabled = true;
            resetBtn.disabled = true;
            progressContainer.classList.add('show');
            progressFill.style.width = '0%';
            progressText.textContent = 'Creating PDF...';
            progressPercent.textContent = '0%';

            try {
                var pdfDoc = await PDFLib.PDFDocument.create();
                var sizeMap = { 'a4': [595, 842], 'letter': [612, 792], 'a3': [842, 1191] };
                var orientation = orientationSelect.value;
                var marginVal = parseInt(marginsSelect.value, 10);
                var baseSize = sizeMap[pageSizeSelect.value] || [595, 842];
                var pageW = orientation === 'landscape' ? baseSize[1] : baseSize[0];
                var pageH = orientation === 'landscape' ? baseSize[0] : baseSize[1];
                var m = marginVal;

                for (var i = 0; i < images.length; i++) {
                    if (cancelled) {
                        notify('Cancelled', 'error');
                        break;
                    }
                    progressText.textContent = 'Processing image ' + (i + 1) + ' of ' + images.length + '...';
                    progressPercent.textContent = Math.round(((i + 1) / images.length) * 100) + '%';
                    progressFill.style.width = Math.round(((i + 1) / images.length) * 100) + '%';

                    var img = await pdfDoc.embedJpg(images[i].data);
                    var imgW = img.width;
                    var imgH = img.height;
                    var maxW = pageW - 2 * m;
                    var maxH = pageH - 2 * m;
                    var scale = Math.min(maxW / imgW, maxH / imgH, 1);
                    var drawW = imgW * scale;
                    var drawH = imgH * scale;
                    var x = (pageW - drawW) / 2;
                    var y = (pageH - drawH) / 2;

                    var page = pdfDoc.addPage([pageW, pageH]);
                    page.drawImage(img, { x: x, y: y, width: drawW, height: drawH });
                }

                progressText.textContent = 'Finalizing...';
                progressPercent.textContent = '100%';
                progressFill.style.width = '100%';

                var pdfBytes = await pdfDoc.save();
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                downloadBtn.href = url;
                downloadBtn.download = 'images.pdf';

                resultPages.textContent = pdfDoc.getPageCount() + ' page' + (pdfDoc.getPageCount() !== 1 ? 's' : '');
                resultSize.textContent = formatSize(blob.size);
                resultsPanel.classList.add('show');
                progressContainer.classList.remove('show');
                notify('PDF created!', 'success');
            } catch (err) {
                notify('Failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            convertBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function resetTool() {
            fileInput.value = '';
            images = [];
            cancelled = false;
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            imageGrid.innerHTML = '';
            dropZone.style.display = '';
        }

        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1048576).toFixed(1) + ' MB';
        }

        function notify(msg, type) {
            var el = document.createElement('div');
            el.className = 'notification ' + (type || 'success');
            el.textContent = msg;
            document.body.appendChild(el);
            setTimeout(function () {
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.3s ease';
                setTimeout(function () { el.remove(); }, 300);
            }, 3000);
        }

        init();
    });
});
