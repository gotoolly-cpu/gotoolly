document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileList = document.getElementById('file-list');
    var filesContainer = document.getElementById('files');
    var mergeBtn = document.getElementById('merge-btn');
    var resetBtn = document.getElementById('reset-btn');
    var resultArea = document.getElementById('result-area');
    var downloadBtn = document.getElementById('download-btn');
    var mergeAnotherBtn = document.getElementById('merge-another-btn');
    var fileCount = document.getElementById('file-count');
    var progressSection = document.getElementById('merge-loading');
    var progressFill = document.getElementById('merge-progress-fill');
    var progressPercent = document.getElementById('merge-progress-percent');
    var progressText = document.getElementById('merge-progress-text');
    var actionPanel = document.getElementById('action-panel');

    var selectedFiles = [];
    var draggedIndex = null;

    function showNotification(msg, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function updateUI() {
        fileCount.textContent = selectedFiles.length + ' file' + (selectedFiles.length !== 1 ? 's' : '');
        mergeBtn.disabled = selectedFiles.length < 2;
    }

    function updateFileList() {
        if (selectedFiles.length === 0) {
            fileList.style.display = 'none';
            updateUI();
            return;
        }

        filesContainer.innerHTML = selectedFiles.map(function(file, index) {
            return '<div class="file-item" draggable="true" data-index="' + index + '">' +
                '<div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>' +
                '<div class="file-order">' + (index + 1) + '</div>' +
                '<div class="file-info">' +
                    '<div class="file-name">' + escapeHtml(file.name) + '</div>' +
                    '<div class="file-size">' + formatFileSize(file.size) + '</div>' +
                '</div>' +
                '<button class="file-remove" type="button" data-index="' + index + '" aria-label="Remove ' + escapeHtml(file.name) + '">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>';
        }).join('');

        var items = filesContainer.querySelectorAll('.file-item');
        items.forEach(function(item) {
            item.addEventListener('dragstart', function(e) {
                draggedIndex = parseInt(item.dataset.index);
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', function() {
                item.classList.remove('dragging');
                draggedIndex = null;
            });

            item.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('drop', function(e) {
                e.preventDefault();
                var targetIndex = parseInt(item.dataset.index);
                if (draggedIndex !== null && draggedIndex !== targetIndex) {
                    var temp = selectedFiles[draggedIndex];
                    selectedFiles.splice(draggedIndex, 1);
                    selectedFiles.splice(targetIndex, 0, temp);
                    updateFileList();
                }
            });
        });

        var removeBtns = filesContainer.querySelectorAll('.file-remove');
        removeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(btn.dataset.index);
                selectedFiles.splice(idx, 1);
                updateFileList();
                updateUI();
            });
        });

        fileList.style.display = '';
        updateUI();
    }

    dropZone.addEventListener('click', function(e) {
        if (e.target.tagName !== 'INPUT') fileInput.click();
    });

    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function() {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        var files = Array.from(e.dataTransfer.files).filter(function(f) { return f.type === 'application/pdf'; });
        if (files.length !== e.dataTransfer.files.length) {
            showNotification('Only PDF files are allowed', true);
        }
        if (files.length > 0) {
            selectedFiles.push.apply(selectedFiles, files);
            updateFileList();
        }
    });

    fileInput.addEventListener('change', function(e) {
        var files = Array.from(e.target.files).filter(function(f) { return f.type === 'application/pdf'; });
        if (files.length !== e.target.files.length) {
            showNotification('Only PDF files are allowed', true);
        }
        if (files.length > 0) {
            selectedFiles.push.apply(selectedFiles, files);
            updateFileList();
        }
        fileInput.value = '';
    });

    mergeBtn.addEventListener('click', async function() {
        if (selectedFiles.length < 2) {
            showNotification('Please select at least 2 PDF files', true);
            return;
        }

        if (typeof PDFLib === 'undefined') {
            showNotification('PDF library is loading. Please wait and try again.', true);
            return;
        }

        mergeBtn.disabled = true;
        mergeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Merging...';
        progressSection.style.display = '';
        actionPanel.style.display = 'none';

        try {
            var PDFDocument = PDFLib.PDFDocument;
            var mergedPdf = await PDFDocument.create();
            var totalPages = 0;

            for (var i = 0; i < selectedFiles.length; i++) {
                var pct = Math.round(((i) / selectedFiles.length) * 80);
                progressFill.style.width = pct + '%';
                progressPercent.textContent = pct + '%';
                progressText.textContent = 'Processing file ' + (i + 1) + ' of ' + selectedFiles.length + '...';

                var arrayBuffer = await selectedFiles[i].arrayBuffer();
                var pdf = await PDFDocument.load(arrayBuffer);
                var copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(function(page) { mergedPdf.addPage(page); });
                totalPages += copiedPages.length;
            }

            progressFill.style.width = '90%';
            progressPercent.textContent = '90%';
            progressText.textContent = 'Saving merged PDF...';

            var pdfBytes = await mergedPdf.save();
            var blob = new Blob([pdfBytes], { type: 'application/pdf' });
            var url = URL.createObjectURL(blob);

            downloadBtn.href = url;
            downloadBtn.download = 'merged-document.pdf';

            progressFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';

            setTimeout(function() {
                progressSection.style.display = 'none';
                fileList.style.display = 'none';
                resultArea.style.display = '';
                actionPanel.style.display = 'none';
            }, 800);

        } catch (error) {
            showNotification('Error merging PDFs: ' + error.message, true);
            progressSection.style.display = 'none';
            actionPanel.style.display = '';
            mergeBtn.disabled = false;
            mergeBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i> Merge PDFs';
        }
    });

    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        var link = document.createElement('a');
        link.href = downloadBtn.href;
        link.download = downloadBtn.download;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    function resetTool() {
        selectedFiles = [];
        fileInput.value = '';
        fileList.style.display = 'none';
        resultArea.style.display = 'none';
        filesContainer.innerHTML = '';
        draggedIndex = null;
        progressSection.style.display = 'none';
        actionPanel.style.display = '';
        mergeBtn.disabled = true;
        mergeBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i> Merge PDFs';
        fileCount.textContent = '0 files';
    }

    resetBtn.addEventListener('click', resetTool);
    mergeAnotherBtn.addEventListener('click', resetTool);

    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
        updateUI();
    };
});