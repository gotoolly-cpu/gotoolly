document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var workspaceContent = document.getElementById('workspace-content');
    var thumbList = document.getElementById('thumb-list');
    var pageCount = document.getElementById('page-count');
    var generateBtn = document.getElementById('generate-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var pageSizeSelect = document.getElementById('page-size');
    var orientationSelect = document.getElementById('orientation');
    var marginInput = document.getElementById('margin');

    var images = [];
    var dragSrcIndex = null;

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

    function handleFiles(fileListObj) {
        var incoming = Array.from(fileListObj).filter(function(f) { return f.type.match(/^image\/(png|jpeg|webp)$/); });
        if (!incoming.length) { showNotification('Please select PNG, JPG, or WebP images', true); return; }
        var added = 0;
        incoming.forEach(function(file) {
            if (images.length >= 50) return;
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    images.push({
                        file: file,
                        dataUrl: e.target.result,
                        img: img,
                        name: file.name
                    });
                    renderThumbnails();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            added++;
        });
    }

    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length) handleFiles(e.target.files);
    });

    function renderThumbnails() {
        workspaceContent.style.display = images.length ? 'grid' : 'none';
        pageCount.textContent = images.length + ' page' + (images.length !== 1 ? 's' : '');
        thumbList.innerHTML = '';
        images.forEach(function(item, index) {
            var div = document.createElement('div');
            div.className = 'thumb-item';
            div.draggable = true;
            div.setAttribute('data-index', index);
            div.innerHTML = '<img class="thumb-img" src="' + item.dataUrl + '" alt="' + item.name + '">'
                + '<div class="thumb-info"><div class="thumb-name">' + item.name + '</div><div class="thumb-dims">' + item.img.naturalWidth + 'x' + item.img.naturalHeight + '</div></div>'
                + '<div class="thumb-actions">'
                + '<button class="thumb-move-up" title="Move up"><i class="fas fa-chevron-up"></i></button>'
                + '<button class="thumb-move-down" title="Move down"><i class="fas fa-chevron-down"></i></button>'
                + '<button class="thumb-remove" title="Remove"><i class="fas fa-times"></i></button>'
                + '</div>';

            div.addEventListener('dragstart', function(e) {
                dragSrcIndex = parseInt(div.getAttribute('data-index'));
                div.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            div.addEventListener('dragend', function() {
                div.classList.remove('dragging');
            });
            div.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            div.addEventListener('drop', function(e) {
                e.preventDefault();
                var targetIndex = parseInt(div.getAttribute('data-index'));
                if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
                    var item = images.splice(dragSrcIndex, 1)[0];
                    images.splice(targetIndex, 0, item);
                    renderThumbnails();
                }
                dragSrcIndex = null;
            });

            div.querySelector('.thumb-move-up').addEventListener('click', function() {
                if (index > 0) {
                    var temp = images[index];
                    images[index] = images[index - 1];
                    images[index - 1] = temp;
                    renderThumbnails();
                }
            });
            div.querySelector('.thumb-move-down').addEventListener('click', function() {
                if (index < images.length - 1) {
                    var temp = images[index];
                    images[index] = images[index + 1];
                    images[index + 1] = temp;
                    renderThumbnails();
                }
            });
            div.querySelector('.thumb-remove').addEventListener('click', function() {
                images.splice(index, 1);
                renderThumbnails();
            });

            thumbList.appendChild(div);
        });
    }

    function getPageDimensions() {
        var size = pageSizeSelect.value;
        var orient = orientationSelect.value;
        var marginMm = parseFloat(marginInput.value) || 10;
        var marginPts = marginMm * 2.83465;
        var w, h;
        if (size === 'a4') { w = 595.28; h = 841.89; }
        else { w = 612; h = 792; }
        if (orient === 'landscape') { var tmp = w; w = h; h = tmp; }
        return { width: w, height: h, margin: marginPts, innerW: w - 2 * marginPts, innerH: h - 2 * marginPts };
    }

    generateBtn.addEventListener('click', async function() {
        if (!images.length) { showNotification('Please add at least one image', true); return; }
        if (typeof PDFLib === 'undefined') { showNotification('pdf-lib library not loaded. Check your internet connection.', true); return; }

        progressSection.style.display = 'block';
        generateBtn.disabled = true;
        var total = images.length;

        try {
            var pdfDoc = await PDFLib.PDFDocument.create();
            var dims = getPageDimensions();

            for (var i = 0; i < total; i++) {
                var pct = Math.round(((i) / total) * 100);
                progressFill.style.width = pct + '%';
                progressPercent.textContent = pct + '%';
                progressText.textContent = 'Processing page ' + (i + 1) + ' of ' + total + '...';

                var item = images[i];
                var imgData = item.dataUrl;
                var ext = item.file.type.split('/')[1];
                var isPng = ext === 'png';

                var pdfImage;
                if (isPng) {
                    var pngBytes = dataUrlToBytes(imgData);
                    pdfImage = await pdfDoc.embedPng(pngBytes);
                } else {
                    var jpgBytes = dataUrlToBytes(imgData);
                    pdfImage = await pdfDoc.embedJpg(jpgBytes);
                }

                var imgW = pdfImage.width;
                var imgH = pdfImage.height;
                var scale = Math.min(dims.innerW / imgW, dims.innerH / imgH);
                var finalW = imgW * scale;
                var finalH = imgH * scale;
                var x = (dims.width - finalW) / 2;
                var y = (dims.height - finalH) / 2;

                var page = pdfDoc.addPage([dims.width, dims.height]);
                page.drawImage(pdfImage, {
                    x: x,
                    y: y,
                    width: finalW,
                    height: finalH
                });
            }

            progressFill.style.width = '95%';
            progressPercent.textContent = '95%';
            progressText.textContent = 'Saving PDF...';

            var pdfBytes = await pdfDoc.save();
            var blob = new Blob([pdfBytes], { type: 'application/pdf' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'screenshots.pdf';
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

            progressFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';
            showNotification('PDF generated successfully with ' + total + ' page' + (total !== 1 ? 's' : '') + '!');
        } catch (err) {
            showNotification('Error generating PDF: ' + err.message, true);
        }

        generateBtn.disabled = false;
    });

    function dataUrlToBytes(dataUrl) {
        var parts = dataUrl.split(',');
        var binary = atob(parts[1]);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    resetBtn.addEventListener('click', function() {
        images = [];
        fileInput.value = '';
        renderThumbnails();
        workspaceContent.style.display = 'none';
        progressSection.style.display = 'none';
        generateBtn.disabled = false;
    });
});
