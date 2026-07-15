document.addEventListener('DOMContentLoaded', () => {
    if (typeof PDFLib === 'undefined') {
        if (typeof window.showNotification === 'function') { window.showNotification('PDF library failed to load. Please refresh the page.', 'error'); }
        return;
    }
    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    let currentFile = null;
    let originalFileSize = 0;
    let compressedPDFBytes = null;
    let processingActive = false;
    let excludedPages = new Set();

    const pdfInput = document.getElementById('pdf-input');
    const dropZone = document.getElementById('drop-zone');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');
    const fileStatus = document.getElementById('file-status');
    const pageCount = document.getElementById('page-count');
    const fileCounter = document.getElementById('file-counter');
    const settingsPanel = document.getElementById('settings-panel');
    const pagesSection = document.getElementById('pages-section');
    const pagesGrid = document.getElementById('pages-grid');
    const progressSection = document.getElementById('progress-section');
    const progressText = document.getElementById('progress-text');
    const progressPercent = document.getElementById('progress-percent');
    const progressFill = document.getElementById('progress-fill');
    const compressBtn = document.getElementById('compress-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultSection = document.getElementById('result-section');
    const statOriginal = document.getElementById('stat-original');
    const statCompressed = document.getElementById('stat-compressed');
    const statReduction = document.getElementById('stat-reduction');
    const downloadBtn = document.getElementById('download-btn');
    const compressAnotherBtn = document.getElementById('compress-another-btn');

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
                showNotification('Please drop a valid PDF file.', 'error');
            }
        });

        compressBtn.addEventListener('click', compressPDF);
        resetBtn.addEventListener('click', resetInterface);
        downloadBtn.addEventListener('click', handleDownload);
        compressAnotherBtn.addEventListener('click', resetInterface);

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            processFile(file);
        } else {
            showNotification('Please select a valid PDF file.', 'error');
        }
    }

    function processFile(file) {
        if (processingActive) {
            showNotification('Please wait for current operation to complete.', 'error');
            return;
        }

        currentFile = file;
        originalFileSize = file.size;
        excludedPages.clear();

        fileName.textContent = file.name;
        fileSizeEl.textContent = formatFileSize(file.size);

        if (file.size > MAX_FILE_SIZE) {
            fileStatus.textContent = 'Too large';
            fileStatus.className = 'file-status warn';
            showNotification('File exceeds 50 MB limit.', 'error');
            return;
        }

        fileStatus.textContent = 'Ready';
        fileStatus.className = 'file-status ok';
        fileCounter.textContent = '1 file';
        fileInfo.classList.add('show');
        settingsPanel.classList.add('show');
        compressBtn.disabled = false;

        loadPDFPages(file);
    }

    async function loadPDFPages(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPageCount();

            pageCount.textContent = `${pages} page${pages !== 1 ? 's' : ''}`;
            pagesGrid.innerHTML = '';
            excludedPages.clear();

            for (let i = 1; i <= pages; i++) {
                const chip = document.createElement('div');
                chip.className = 'page-chip';
                chip.dataset.page = i;
                chip.innerHTML = `<span class="page-num">${i}</span>`;
                chip.addEventListener('click', () => {
                    if (excludedPages.has(i)) {
                        excludedPages.delete(i);
                        chip.classList.remove('selected');
                    } else {
                        if (excludedPages.size >= pages - 1) {
                            showNotification('You must keep at least one page.', 'error');
                            return;
                        }
                        excludedPages.add(i);
                        chip.classList.add('selected');
                    }
                });
                pagesGrid.appendChild(chip);
            }

            pagesSection.classList.add('show');
        } catch (err) {
            console.error('Failed to load PDF:', err);
            showNotification('Failed to read PDF. The file may be corrupted.', 'error');
        }
    }

    async function compressPDF() {
        if (!currentFile || processingActive) return;

        processingActive = true;
        compressBtn.disabled = true;
        progressSection.classList.add('show');
        resultSection.classList.remove('show');

        const activePreset = document.querySelector('.preset-btn.active')?.dataset.preset || 'balanced';
        const removeMetadata = document.getElementById('opt-remove-metadata').checked;
        const removeAnnotations = document.getElementById('opt-remove-annotations').checked;
        const removeForms = document.getElementById('opt-remove-forms').checked;
        const useObjectStreams = document.getElementById('opt-object-streams').checked;
        const linearize = document.getElementById('opt-linearize').checked;

        try {
            updateProgress('Loading PDF document...', 10);
            const arrayBuffer = await currentFile.arrayBuffer();

            updateProgress('Parsing PDF structure...', 25);
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

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

            updateProgress('Finalizing...', 90);
            await new Promise(r => setTimeout(r, 300));

            compressedPDFBytes = compressedBytes;
            const reduction = ((originalFileSize - compressedBytes.byteLength) / originalFileSize * 100).toFixed(1);

            statOriginal.textContent = formatFileSize(originalFileSize);
            statCompressed.textContent = formatFileSize(compressedBytes.byteLength);
            statReduction.textContent = reduction > 0 ? `${reduction}%` : '0%';

            updateProgress('Compression complete!', 100);

            setTimeout(() => {
                progressSection.classList.remove('show');
                resultSection.classList.add('show');
            }, 400);

        } catch (err) {
            console.error('Compression error:', err);
            showNotification('Failed to compress PDF. The file may use unsupported features.', 'error');
            progressSection.classList.remove('show');
        } finally {
            processingActive = false;
            compressBtn.disabled = false;
        }
    }

    function handleDownload() {
        if (!compressedPDFBytes) {
            showNotification('No compressed PDF available.', 'error');
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
    }

    function resetInterface() {
        pdfInput.value = '';
        currentFile = null;
        originalFileSize = 0;
        compressedPDFBytes = null;
        processingActive = false;
        excludedPages.clear();

        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        pagesSection.classList.remove('show');
        progressSection.classList.remove('show');
        resultSection.classList.remove('show');
        compressBtn.disabled = true;
        fileCounter.textContent = 'No file';
        pagesGrid.innerHTML = '';

        document.querySelectorAll('.preset-btn').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });
    }

    function updateProgress(text, percent) {
        progressText.textContent = text;
        progressPercent.textContent = `${percent}%`;
        progressFill.style.width = `${percent}%`;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        const div = document.createElement('div');
        div.className = `notification ${type}`;
        div.textContent = message;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }

    init();
});
