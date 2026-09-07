document.addEventListener('DOMContentLoaded', () => {
    if (typeof PDFLib === 'undefined') {
        showToast('PDF library failed to load. Please refresh the page.', 'error');
        return;
    }
    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    let currentFile = null;
    let originalFileSize = 0;
    let compressedPDFBytes = null;
    let processingActive = false;
    let excludedPages = new Set();
    let cancelRequested = false;
    let cancelTimer = null;

    const pdfInput = document.getElementById('pdf-input');
    const dropZone = document.getElementById('drop-zone');
    const uploadZone = document.getElementById('upload-zone');
    const fileInfo = document.getElementById('file-info');
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');
    const fileStatusEl = document.getElementById('file-status');
    const pageCountEl = document.getElementById('page-count');
    const fileRemoveBtn = document.getElementById('file-remove-btn');
    const statusBadge = document.getElementById('status-badge');
    const settingsPanel = document.getElementById('settings-panel');
    const optimizationCard = document.getElementById('optimization-card');
    const pagesCard = document.getElementById('pages-card');
    const pagesGrid = document.getElementById('pages-grid');
    const progressSection = document.getElementById('progress-section');
    const progressPhase = document.getElementById('progress-phase');
    const progressPct = document.getElementById('progress-pct');
    const progressFill = document.getElementById('progress-fill');
    const progressCancel = document.getElementById('progress-cancel');
    const cancelBtn = document.getElementById('cancel-btn');
    const compressBtn = document.getElementById('compress-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultsPanel = document.getElementById('results-panel');
    const resultIconWrap = document.getElementById('result-icon-wrap');
    const resultHeading = document.getElementById('result-heading');
    const resultSub = document.getElementById('result-sub');
    const statOriginal = document.getElementById('stat-original');
    const statCompressed = document.getElementById('stat-compressed');
    const statReduction = document.getElementById('stat-reduction');
    const downloadBtn = document.getElementById('download-btn');
    const compressAnotherBtn = document.getElementById('compress-another-btn');
    const actionBar = document.getElementById('action-bar');
    const limitationsBox = document.getElementById('limitations-box');
    const presetBtns = document.querySelectorAll('.preset-btn');

    function init() {
        pdfInput.addEventListener('change', handleFileSelect);

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                processFile(file);
            } else {
                showToast('Please drop a valid PDF file.', 'error');
            }
        });

        compressBtn.addEventListener('click', compressPDF);
        resetBtn.addEventListener('click', resetInterface);
        downloadBtn.addEventListener('click', handleDownload);
        compressAnotherBtn.addEventListener('click', resetInterface);
        fileRemoveBtn.addEventListener('click', resetInterface);
        cancelBtn.addEventListener('click', cancelCompression);

        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                presetBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-checked', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-checked', 'true');
                updateAdvancedVisibility(btn.dataset.preset);
            });
        });
    }

    const optRemoveMetadata = document.getElementById('opt-remove-metadata');
    const optRemoveAnnotations = document.getElementById('opt-remove-annotations');
    const optRemoveForms = document.getElementById('opt-remove-forms');
    const optObjectStreams = document.getElementById('opt-object-streams');
    const optLinearize = document.getElementById('opt-linearize');

    const PRESET_OPTIONS = {
        balanced: { metadata: true, annotations: true, forms: false, objectStreams: true, linearize: false },
        maximum: { metadata: true, annotations: true, forms: true, objectStreams: true, linearize: true },
        custom: { metadata: false, annotations: false, forms: false, objectStreams: false, linearize: false }
    };

    function updateAdvancedVisibility(preset) {
        const opts = PRESET_OPTIONS[preset];
        optRemoveMetadata.checked = opts.metadata;
        optRemoveAnnotations.checked = opts.annotations;
        optRemoveForms.checked = opts.forms;
        optObjectStreams.checked = opts.objectStreams;
        optLinearize.checked = opts.linearize;

        if (preset === 'custom') {
            optimizationCard.classList.remove('hidden');
            pagesCard.classList.remove('hidden');
        } else {
            optimizationCard.classList.add('hidden');
            pagesCard.classList.add('hidden');
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            processFile(file);
        } else {
            showToast('Please select a valid PDF file.', 'error');
        }
    }

    function processFile(file) {
        if (processingActive) {
            showToast('Please wait for current operation to complete.', 'error');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;
        excludedPages.clear();

        fileNameEl.textContent = file.name;
        fileNameEl.title = file.name;
        fileSizeEl.textContent = formatFileSize(file.size);

        if (file.size > MAX_FILE_SIZE) {
            fileStatusEl.textContent = 'Too large';
            fileStatusEl.className = 'file-info-status warn';
            statusBadge.textContent = 'Error';
            statusBadge.className = 'status-badge error';
            showToast('File exceeds 50 MB limit.', 'error');
            return;
        }

        fileStatusEl.textContent = 'Ready';
        fileStatusEl.className = 'file-info-status ok';
        statusBadge.textContent = 'Ready';
        statusBadge.className = 'status-badge ready';

        fileInfo.classList.add('show');
        settingsPanel.classList.add('show');
        limitationsBox.classList.add('show');
        uploadZone.style.display = 'none';
        compressBtn.disabled = false;

        loadPDFPages(file);
    }

    async function loadPDFPages(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPageCount();

            pageCountEl.textContent = `${pages} page${pages !== 1 ? 's' : ''}`;
            pagesGrid.innerHTML = '';
            excludedPages.clear();

            for (let i = 1; i <= pages; i++) {
                const chip = document.createElement('div');
                chip.className = 'page-chip';
                chip.dataset.page = i;
                chip.textContent = i;
                chip.setAttribute('role', 'button');
                chip.setAttribute('tabindex', '0');
                chip.setAttribute('aria-pressed', 'false');
                chip.addEventListener('click', () => togglePageExclusion(i, chip, pages));
                chip.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        togglePageExclusion(i, chip, pages);
                    }
                });
                pagesGrid.appendChild(chip);
            }
        } catch (err) {
            console.error('Failed to load PDF:', err);
            showToast('Failed to read PDF. The file may be corrupted.', 'error');
        }
    }

    function togglePageExclusion(pageNum, chip, totalPages) {
        if (excludedPages.has(pageNum)) {
            excludedPages.delete(pageNum);
            chip.classList.remove('excluded');
            chip.setAttribute('aria-pressed', 'false');
        } else {
            if (excludedPages.size >= totalPages - 1) {
                showToast('You must keep at least one page.', 'error');
                return;
            }
            excludedPages.add(pageNum);
            chip.classList.add('excluded');
            chip.setAttribute('aria-pressed', 'true');
        }
    }

    async function compressPDF() {
        if (!currentFile || processingActive) return;

        processingActive = true;
        cancelRequested = false;
        compressBtn.disabled = true;
        resultsPanel.classList.remove('show');
        actionBar.style.display = 'none';
        progressSection.classList.add('show');
        progressCancel.classList.remove('show');

        const activePreset = document.querySelector('.preset-btn.active')?.dataset.preset || 'balanced';
        const removeMetadata = document.getElementById('opt-remove-metadata').checked;
        const removeAnnotations = document.getElementById('opt-remove-annotations').checked;
        const removeForms = document.getElementById('opt-remove-forms').checked;
        const useObjectStreams = document.getElementById('opt-object-streams').checked;
        const linearize = document.getElementById('opt-linearize').checked;

        try {
            updateProgress('Loading PDF document...', 10);
            const arrayBuffer = await currentFile.arrayBuffer();

            if (cancelRequested) return handleCancel();

            updateProgress('Parsing PDF structure...', 25);
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

            if (cancelRequested) return handleCancel();

            updateProgress('Applying compression settings...', 40);

            if (removeMetadata) {
                pdfDoc.setTitle('');
                pdfDoc.setAuthor('');
                pdfDoc.setSubject('');
                pdfDoc.setKeywords([]);
                pdfDoc.setProducer('');
                pdfDoc.setCreator('');
                pdfDoc.setCreationDate(new Date(0));
                pdfDoc.setModificationDate(new Date(0));
            }

            if (excludedPages.size > 0) {
                updateProgress('Removing selected pages...', 55);
                const sortedPages = Array.from(excludedPages).sort((a, b) => b - a);
                for (const pageNum of sortedPages) {
                    pdfDoc.removePage(pageNum - 1);
                }
            }

            if (cancelRequested) return handleCancel();

            updateProgress('Saving optimized PDF...', 75);
            const saveOptions = {
                useObjectStreams: useObjectStreams,
                addDefaultPage: false,
                objectsPerTick: 50,
                updateFieldAppearances: false
            };

            if (linearize) {
                saveOptions.linearize = true;
            }

            const compressedBytes = await pdfDoc.save(saveOptions);

            if (cancelRequested) return handleCancel();

            updateProgress('Finalizing...', 90);
            await new Promise(r => setTimeout(r, 300));

            if (cancelRequested) return handleCancel();

            compressedPDFBytes = compressedBytes;
            const reductionPct = ((originalFileSize - compressedBytes.byteLength) / originalFileSize * 100);
            const reductionStr = reductionPct.toFixed(1);

            statOriginal.textContent = formatFileSize(originalFileSize);
            statCompressed.textContent = formatFileSize(compressedBytes.byteLength);
            statReduction.textContent = reductionPct > 0 ? `${reductionStr}%` : '0%';

            if (reductionPct < 5) {
                resultHeading.textContent = 'Already optimized';
                resultSub.textContent = 'This PDF is already highly optimized. No significant size reduction was possible.';
                resultIconWrap.className = 'result-icon-wrap success';
                resultIconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            } else {
                resultHeading.textContent = `${reductionStr}% smaller`;
                resultSub.textContent = `Reduced from ${formatFileSize(originalFileSize)} to ${formatFileSize(compressedBytes.byteLength)}`;
                resultIconWrap.className = 'result-icon-wrap success';
                resultIconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            }

            updateProgress('Compression complete!', 100);

            setTimeout(() => {
                progressSection.classList.remove('show');
                actionBar.style.display = 'none';
                resultsPanel.classList.add('show');
                statusBadge.textContent = 'Done';
                statusBadge.className = 'status-badge done';
                fileStatusEl.textContent = 'Done';
                fileStatusEl.className = 'file-info-status ok';
            }, 400);

        } catch (err) {
            console.error('Compression error:', err);
            showToast('Failed to compress PDF. The file may use unsupported features.', 'error');
            progressSection.classList.remove('show');
            actionBar.style.display = '';
            statusBadge.textContent = 'Error';
            statusBadge.className = 'status-badge error';
        } finally {
            processingActive = false;
            compressBtn.disabled = false;
            clearTimeout(cancelTimer);
            cancelTimer = null;
        }
    }

    function cancelCompression() {
        cancelRequested = true;
        showToast('Compression cancelled.', 'info');
    }

    function handleCancel() {
        progressSection.classList.remove('show');
        actionBar.style.display = '';
        statusBadge.textContent = 'Ready';
        statusBadge.className = 'status-badge ready';
        fileStatusEl.textContent = 'Ready';
        fileStatusEl.className = 'file-info-status ok';
        processingActive = false;
        cancelRequested = false;
        compressBtn.disabled = false;
        clearTimeout(cancelTimer);
        cancelTimer = null;
    }

    function handleDownload() {
        if (!compressedPDFBytes) {
            showToast('No compressed PDF available.', 'error');
            return;
        }

        const blob = new Blob([compressedPDFBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed-${currentFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);

        showToast('File downloaded', 'success');
    }

    function resetInterface() {
        pdfInput.value = '';
        currentFile = null;
        originalFileSize = 0;
        compressedPDFBytes = null;
        processingActive = false;
        cancelRequested = false;
        excludedPages.clear();
        clearTimeout(cancelTimer);
        cancelTimer = null;

        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        optimizationCard.classList.add('hidden');
        pagesCard.classList.add('hidden');
        progressSection.classList.remove('show');
        resultsPanel.classList.remove('show');
        limitationsBox.classList.remove('show');
        uploadZone.style.display = '';
        actionBar.style.display = '';
        compressBtn.disabled = true;
        pagesGrid.innerHTML = '';

        statusBadge.textContent = '';
        statusBadge.className = 'status-badge';

        presetBtns.forEach((b, i) => {
            b.classList.toggle('active', i === 0);
            b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
        });
    }

    function updateProgress(text, percent) {
        progressPhase.textContent = text;
        progressPct.textContent = `${percent}%`;
        progressFill.style.width = `${percent}%`;
        progressSection.setAttribute('aria-valuenow', percent);

        if (percent > 20 && !cancelTimer) {
            cancelTimer = setTimeout(() => {
                progressCancel.classList.add('show');
            }, 5000);
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 200);
        }, type === 'error' ? 5000 : 3500);
    }

    init();
});
