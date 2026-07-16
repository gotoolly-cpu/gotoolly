document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePagesEl = document.getElementById('file-pages');
    var formFieldsSection = document.getElementById('form-fields-section');
    var fieldsContent = document.getElementById('fields-content');
    var fillBtn = document.getElementById('fill-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressContainer = document.getElementById('progress-container');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var progressFill = document.getElementById('progress-fill');
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');

    var currentFile = null;
    var pdfDocRef = null;
    var formFields = [];
    var filledBytes = null;

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

    function updateProgress(text, pct) {
        progressText.textContent = text;
        progressPercent.textContent = pct + '%';
        progressFill.style.width = pct + '%';
    }

    function getFieldTypeName(field) {
        if (typeof field.getText === 'function' && typeof field.setText === 'function') return 'Text';
        if (typeof field.isChecked === 'function' && typeof field.check === 'function') return 'Checkbox';
        if (typeof field.getOptions === 'function') return 'Dropdown';
        if (typeof field.getSelected === 'function') return 'Radio';
        try {
            var cn = field.constructor.name;
            if (cn === 'PDFTextField') return 'Text';
            if (cn === 'PDFCheckBox') return 'Checkbox';
            if (cn === 'PDFDropdown') return 'Dropdown';
            if (cn === 'PDFRadioGroup') return 'Radio';
        } catch (e) {}
        return 'Unknown';
    }

    function isTextField(field) {
        return typeof field.getText === 'function' && typeof field.setText === 'function';
    }

    function isCheckBox(field) {
        return typeof field.isChecked === 'function' && typeof field.check === 'function';
    }

    function isDropdown(field) {
        return typeof field.getOptions === 'function';
    }

    function renderFields(fields) {
        fieldsContent.innerHTML = '';
        if (!fields || fields.length === 0) {
            fillBtn.disabled = true;
            return;
        }
        fillBtn.disabled = false;
        fields.forEach(function(field, index) {
            var item = document.createElement('div');
            item.className = 'form-field-item';
            var typeName = getFieldTypeName(field);
            var name = field.getName() || 'Field ' + (index + 1);
            item.innerHTML = '<div class="field-header"><span class="field-name">' + escapeHtml(name) + '</span><span class="field-type">' + typeName + '</span></div>';
            var inputWrap = document.createElement('div');
            if (isTextField(field)) {
                var inp = document.createElement('input');
                inp.type = 'text';
                inp.className = 'field-input';
                inp.placeholder = 'Enter ' + name.toLowerCase() + '...';
                try { inp.value = field.getText() || ''; } catch (e) {}
                inp.dataset.fieldIndex = index;
                inputWrap.appendChild(inp);
            } else if (isCheckBox(field)) {
                var cbWrap = document.createElement('div');
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'field-checkbox';
                cb.dataset.fieldIndex = index;
                try { cb.checked = field.isChecked(); } catch (e) {}
                cbWrap.appendChild(cb);
                cbWrap.appendChild(document.createTextNode(' Checked'));
                inputWrap.appendChild(cbWrap);
            } else if (isDropdown(field)) {
                var sel = document.createElement('select');
                sel.className = 'field-select';
                sel.dataset.fieldIndex = index;
                sel.appendChild(document.createElement('option'));
                try {
                    var opts = field.getOptions();
                    if (opts && opts.length > 0) {
                        opts.forEach(function(o) {
                            var opt = document.createElement('option');
                            var val = o.value !== undefined ? o.value : o;
                            var label = o.displayValue || val;
                            opt.value = val;
                            opt.textContent = label;
                            sel.appendChild(opt);
                        });
                        try { sel.value = field.getSelected(); } catch (e) {}
                    }
                } catch (e) {}
                inputWrap.appendChild(sel);
            } else {
                inputWrap.innerHTML = '<span style="font-size:var(--text-xs);color:var(--color-text-light)">Field type not editable in browser</span>';
            }
            item.appendChild(inputWrap);
            fieldsContent.appendChild(item);
        });
    }

    function escapeHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function collectValues() {
        var values = {};
        fieldsContent.querySelectorAll('.field-input').forEach(function(inp) {
            values[inp.dataset.fieldIndex] = inp.value;
        });
        fieldsContent.querySelectorAll('.field-checkbox').forEach(function(cb) {
            values[cb.dataset.fieldIndex] = cb.checked;
        });
        fieldsContent.querySelectorAll('.field-select').forEach(function(sel) {
            values[sel.dataset.fieldIndex] = sel.value;
        });
        return values;
    }

    function resetTool() {
        currentFile = null;
        pdfDocRef = null;
        formFields = [];
        filledBytes = null;
        fileInput.value = '';
        fileInfo.classList.remove('show');
        formFieldsSection.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        fillBtn.disabled = true;
        fieldsContent.innerHTML = '';
        updateProgress('Processing form...', 0);
    }

    function showStatus(msg, pct) {
        progressContainer.classList.add('show');
        updateProgress(msg, pct);
    }

    function hideStatus() {
        progressContainer.classList.remove('show');
        updateProgress('Processing form...', 0);
    }

    function loadPdf(file) {
        if (typeof PDFLib === 'undefined') {
            showNotification('PDF library not loaded yet. Please refresh and try again.', true);
            return;
        }
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showNotification('Please select a valid PDF file', true);
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showNotification('File size must be less than 50 MB', true);
            return;
        }
        currentFile = file;
        fileName.textContent = file.name;
        fileSizeEl.textContent = formatFileSize(file.size);
        fileStatus.textContent = 'Loaded';
        fileInfo.classList.add('show');
        formFieldsSection.classList.remove('show');
        resultsPanel.classList.remove('show');
        hideStatus();
        showStatus('Parsing PDF...', 20);
        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var arr = new Uint8Array(e.target.result);
                showStatus('Loading PDF structure...', 40);
                pdfDocRef = await PDFLib.PDFDocument.load(arr, { ignoreEncryption: true });
                var count = pdfDocRef.getPageCount();
                filePagesEl.textContent = count + ' page' + (count !== 1 ? 's' : '');
                showStatus('Detecting form fields...', 60);
                var form = pdfDocRef.getForm();
                formFields = [];
                if (form) {
                    try {
                        formFields = form.getFields();
                    } catch (ffErr) {
                        formFields = [];
                    }
                }
                formFieldsSection.classList.add('show');
                renderFields(formFields);
                if (formFields.length > 0) {
                    hideStatus();
                    showNotification('Detected ' + formFields.length + ' form field(s)', false);
                } else {
                    showStatus('No fillable fields found', 100);
                    setTimeout(hideStatus, 1500);
                    fieldsContent.innerHTML = '<div class="empty-fields"><div class="empty-icon">&#128196;</div><p><strong>This PDF doesn\'t have fillable form fields.</strong></p><p style="font-size:var(--text-sm);color:var(--color-text-light);margin-top:var(--space-2);line-height:1.6">This tool works with <strong>interactive PDF forms</strong> (AcroForm) that have clickable text fields, checkboxes, or dropdowns.<br><br>Your PDF appears to be a regular (non-fillable) document. To fill it, you\'ll need a PDF editor or a fillable version of the form.</p></div>';
                }
            } catch (err) {
                hideStatus();
                showNotification('Failed to load PDF: ' + err.message, true);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    dropZone.addEventListener('click', function() { fileInput.click(); });
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) loadPdf(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) loadPdf(e.target.files[0]);
    });

    fillBtn.addEventListener('click', async function() {
        if (!currentFile || !pdfDocRef) return;
        if (typeof PDFLib === 'undefined') { showNotification('PDF library is loading', true); return; }
        fillBtn.disabled = true;
        progressContainer.classList.add('show');
        resultsPanel.classList.remove('show');
        updateProgress('Loading PDF...', 10);
        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            updateProgress('Applying form values...', 40);
            var pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            var form = pdfDoc.getForm();
            if (form) {
                var fields = form.getFields();
                var values = collectValues();
                Object.keys(values).forEach(function(idx) {
                    var field = fields[parseInt(idx)];
                    if (!field) return;
                    try {
                        if (isTextField(field)) {
                            field.setText(values[idx]);
                        } else if (isCheckBox(field)) {
                            if (values[idx]) field.check(); else field.uncheck();
                        } else if (isDropdown(field)) {
                            if (values[idx]) field.select(values[idx]);
                        }
                    } catch (e) {}
                });
                try { form.flatten(); } catch (e) {}
            }
            updateProgress('Saving filled PDF...', 75);
            filledBytes = await pdfDoc.save();
            updateProgress('Complete!', 100);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                downloadBtn.download = 'filled-' + currentFile.name;
                showNotification('Form filled successfully!', false);
            }, 500);
        } catch (err) {
            showNotification('Error filling form: ' + err.message, true);
            progressContainer.classList.remove('show');
            fillBtn.disabled = false;
        }
    });

    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!filledBytes) return;
        var blob = new Blob([filledBytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = downloadBtn.download;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    });

    resetBtn.addEventListener('click', resetTool);
    newFileBtn.addEventListener('click', resetTool);
});
