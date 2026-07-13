/* ============================================
   GO TOOLLY - SMART PDF TO WORD CONVERTER
   Client-side PDF to DOCX Conversion
   Uses pdf.js + docx library
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    function waitForLibs(callback) {
        if (typeof pdfjsLib !== 'undefined' && typeof docx !== 'undefined') {
            callback();
            return;
        }
        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (typeof pdfjsLib !== 'undefined' && typeof docx !== 'undefined') {
                clearInterval(interval);
                callback();
            } else if (attempts > 50) {
                clearInterval(interval);
                notify('Libraries failed to load. Please refresh the page.', 'error');
            }
        }, 200);
    }

    waitForLibs(function () {
    var pdfInput = document.getElementById('pdf-input');
    var dropZone = document.getElementById('drop-zone');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSize = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePages = document.getElementById('file-pages');
    var settingsPanel = document.getElementById('settings-panel');
    var modeFast = document.getElementById('mode-fast');
    var modeBest = document.getElementById('mode-best');
    var pagesOption = document.getElementById('pages-option');
    var pagesSection = document.getElementById('pages-section');
    var pageRange = document.getElementById('page-range');
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
    var resultMode = document.getElementById('result-mode');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');

    var pdfDoc = null;
    var totalPages = 0;
    var cancelled = false;
    var selectedMode = 'fast';

    function init() {
        pdfInput.addEventListener('change', handleFileSelect);
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        modeFast.addEventListener('click', function () { selectMode('fast'); });
        modeBest.addEventListener('click', function () { selectMode('best'); });
        pagesOption.addEventListener('change', function () {
            pagesSection.classList.toggle('show', pagesOption.value === 'range');
        });
        convertBtn.addEventListener('click', startConversion);
        resetBtn.addEventListener('click', resetTool);
        cancelBtn.addEventListener('click', function () { cancelled = true; });
        newFileBtn.addEventListener('click', resetTool);
    }

    function handleFileSelect(e) {
        var file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            notify('Please select a PDF file', 'error');
            return;
        }
        loadFile(file);
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
        var file = e.dataTransfer.files[0];
        if (!file || file.type !== 'application/pdf') {
            notify('Please drop a PDF file', 'error');
            return;
        }
        loadFile(file);
    }

    function loadFile(file) {
        if (file.size > 50 * 1024 * 1024) {
            notify('File too large. Maximum size is 50 MB.', 'error');
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            var data = new Uint8Array(e.target.result);
            pdfjsLib.getDocument({ data: data, cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/', cMapPacked: true }).promise.then(function (pdf) {
                pdfDoc = pdf;
                totalPages = pdf.numPages;
                fileName.textContent = file.name;
                fileSize.textContent = formatSize(file.size);
                filePages.textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                fileStatus.textContent = 'Ready';
                fileInfo.classList.add('show');
                settingsPanel.classList.add('show');
                resultsPanel.classList.remove('show');
                dropZone.style.display = 'none';
                notify('PDF loaded successfully', 'success');
            }).catch(function (err) {
                notify('Failed to load PDF: ' + err.message, 'error');
            });
        };
        reader.readAsArrayBuffer(file);
    }

    function selectMode(mode) {
        selectedMode = mode;
        modeFast.classList.toggle('active', mode === 'fast');
        modeBest.classList.toggle('active', mode === 'best');
        modeFast.setAttribute('aria-pressed', mode === 'fast' ? 'true' : 'false');
        modeBest.setAttribute('aria-pressed', mode === 'best' ? 'true' : 'false');
    }

    function getPageList() {
        if (pagesOption.value === 'all') {
            var pages = [];
            for (var i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }
        var raw = pageRange.value.trim();
        if (!raw) {
            notify('Please enter a page range', 'error');
            return null;
        }
        var set = new Set();
        var parts = raw.split(',');
        for (var p = 0; p < parts.length; p++) {
            var part = parts[p].trim();
            if (part.indexOf('-') !== -1) {
                var range = part.split('-');
                var start = parseInt(range[0], 10);
                var end = parseInt(range[1], 10);
                for (var j = start; j <= end && j <= totalPages; j++) {
                    if (j > 0) set.add(j);
                }
            } else {
                var num = parseInt(part, 10);
                if (num > 0 && num <= totalPages) set.add(num);
            }
        }
        var arr = Array.from(set);
        arr.sort(function (a, b) { return a - b; });
        return arr;
    }

    async function startConversion() {
        if (!pdfDoc) {
            notify('Please load a PDF first', 'error');
            return;
        }
        var pages = getPageList();
        if (!pages || pages.length === 0) {
            notify('Invalid page range', 'error');
            return;
        }

        cancelled = false;
        convertBtn.disabled = true;
        resetBtn.disabled = true;
        progressContainer.classList.add('show');
        progressFill.style.width = '0%';
        progressText.textContent = 'Analyzing PDF...';
        progressPercent.textContent = '0%';

        try {
            var docPages = [];
            for (var i = 0; i < pages.length; i++) {
                if (cancelled) {
                    notify('Conversion cancelled', 'error');
                    break;
                }
                progressText.textContent = 'Processing page ' + (i + 1) + ' of ' + pages.length + '...';
                progressPercent.textContent = Math.round(((i) / pages.length) * 100) + '%';
                progressFill.style.width = Math.round(((i) / pages.length) * 100) + '%';

                var page = await pdfDoc.getPage(pages[i]);
                var viewport = page.getViewport({ scale: 1.0 });
                var textContent = await page.getTextContent();

                if (selectedMode === 'best') {
                    docPages.push(analyzePage(textContent, viewport, page));
                } else {
                    docPages.push(extractFast(textContent, viewport));
                }

                await new Promise(function (r) { setTimeout(r, 0); });
            }

            if (cancelled) {
                progressContainer.classList.remove('show');
                convertBtn.disabled = false;
                resetBtn.disabled = false;
                return;
            }

            progressText.textContent = 'Generating Word document...';
            progressPercent.textContent = '95%';
            progressFill.style.width = '95%';

            var docxContent = selectedMode === 'best' ? buildBestDocx(docPages) : buildFastDocx(docPages);
            var blob = await docx.Packer.toBlob(docxContent);

            var url = URL.createObjectURL(blob);
            downloadBtn.href = url;
            downloadBtn.download = 'document.docx';

            resultPages.textContent = pages.length + ' page' + (pages.length !== 1 ? 's' : '');
            resultSize.textContent = formatSize(blob.size);
            resultMode.textContent = selectedMode === 'best' ? 'Best Formatting' : 'Fast';
            resultsPanel.classList.add('show');
            progressContainer.classList.remove('show');

            progressPercent.textContent = '100%';
            progressFill.style.width = '100%';

            notify('Conversion complete!', 'success');
        } catch (err) {
            notify('Conversion failed: ' + err.message, 'error');
            progressContainer.classList.remove('show');
        }

        convertBtn.disabled = false;
        resetBtn.disabled = false;
    }

    function extractFast(textContent, viewport) {
        var items = textContent.items;
        var lines = [];
        var currentLine = '';
        var lastY = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.str === '' && !item.hasEOL) continue;

            if (lastY !== null && Math.abs(lastY - item.y) > 3) {
                if (currentLine.trim()) lines.push(currentLine.trim());
                currentLine = '';
            }

            if (lastY !== null && Math.abs(lastY - item.y) <= 3 && currentLine && item.str) {
                var gap = item.x - (item._prevEndX || 0);
                if (gap > 5) currentLine += ' ';
            }

            currentLine += item.str;
            item._prevEndX = item.x + (item.width || 0);
            lastY = item.y;

            if (item.hasEOL) {
                if (currentLine.trim()) lines.push(currentLine.trim());
                currentLine = '';
                lastY = null;
            }
        }
        if (currentLine.trim()) lines.push(currentLine.trim());

        return { lines: lines, pageWidth: viewport.width, pageHeight: viewport.height };
    }

    function analyzePage(textContent, viewport) {
        var items = textContent.items.filter(function (it) { return it.str.trim() !== ''; });
        if (items.length === 0) return { blocks: [], pageWidth: viewport.width, pageHeight: viewport.height };

        var fontSizes = {};
        for (var i = 0; i < items.length; i++) {
            var size = Math.round((items[i].transform[3] || 12) * 10) / 10;
            fontSizes[size] = (fontSizes[size] || 0) + 1;
        }

        var bodySize = 0;
        var maxCount = 0;
        for (var s in fontSizes) {
            if (fontSizes[s] > maxCount) {
                maxCount = fontSizes[s];
                bodySize = parseFloat(s);
            }
        }

        var headingThresholds = [];
        if (bodySize > 0) {
            headingThresholds = [
                { level: 3, minSize: bodySize + 6 },
                { level: 4, minSize: bodySize + 3 },
                { level: 5, minSize: bodySize + 1 }
            ];
        }

        var sortedItems = items.slice().sort(function (a, b) {
            var yDiff = b.y - a.y;
            if (Math.abs(yDiff) > 3) return yDiff;
            return a.x - b.x;
        });

        var blocks = [];
        var currentBlock = null;

        for (var j = 0; j < sortedItems.length; j++) {
            var it = sortedItems[j];
            var fontSize = Math.round((it.transform[3] || 12) * 10) / 10;
            var isBold = detectBold(it);
            var isList = detectList(it.str);

            if (!currentBlock || Math.abs(currentBlock.y - it.y) > fontSize * 0.8) {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = {
                    text: '',
                    fontSize: fontSize,
                    isBold: isBold,
                    isList: isList,
                    listType: isList,
                    y: it.y,
                    x: it.x
                };
            }
            if (currentBlock.text && it.str) {
                var gap = it.x - (currentBlock._lastEndX || 0);
                if (gap > 3) currentBlock.text += ' ';
            }
            currentBlock.text += it.str;
            currentBlock._lastEndX = it.x + (it.width || 0);
        }
        if (currentBlock) blocks.push(currentBlock);

        for (var k = 0; k < blocks.length; k++) {
            var b = blocks[k];
            b.level = null;
            for (var t = 0; t < headingThresholds.length; t++) {
                if (b.fontSize >= headingThresholds[t].minSize && b.isBold) {
                    b.level = headingThresholds[t].level;
                    break;
                }
            }
            if (!b.level && b.fontSize >= bodySize + 8) {
                b.level = 3;
            }
        }

        return { blocks: blocks, pageWidth: viewport.width, pageHeight: viewport.height };
    }

    function detectBold(item) {
        var fontName = (item.fontName || '').toLowerCase();
        if (fontName.indexOf('bold') !== -1) return true;
        if (fontName.indexOf('heavy') !== -1) return true;
        if (fontName.indexOf('black') !== -1) return true;
        var tx = item.transform;
        if (tx && tx[0] !== undefined) {
            var sx = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
            var sy = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
            if (sx > 1.05 || sy > 1.05) return true;
        }
        return false;
    }

    function detectList(text) {
        var trimmed = text.trim();
        if (/^[\u2022\u2023\u25E6\u2043\u2219\-\*\u25CF\u25A0\u25CB\u25B6\u25B8]/.test(trimmed)) return 'bullet';
        if (/^\d+[\.\)\]]\s/.test(trimmed)) return 'numbered';
        return null;
    }

    function buildFastDocx(pages) {
        var children = [];
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            for (var j = 0; j < page.lines.length; j++) {
                var line = page.lines[j];
                if (line) {
                    children.push(new docx.Paragraph({
                        children: [new docx.TextRun({ text: line, font: 'Arial', size: 24 })],
                        spacing: { after: 120 }
                    }));
                }
            }
            if (i < pages.length - 1) {
                children.push(new docx.Paragraph({
                    children: [new docx.PageBreak()]
                }));
            }
        }
        return new docx.Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                    }
                },
                children: children
            }]
        });
    }

    function buildBestDocx(pages) {
        var allChildren = [];
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            if (page.blocks) {
                for (var j = 0; j < page.blocks.length; j++) {
                    var block = page.blocks[j];
                    var runs = [];
                    var text = block.text.trim();
                    if (!text) continue;

                    var textOpts = { text: text, font: 'Arial', size: 24 };

                    if (block.level) {
                        textOpts.size = (block.level === 3 ? 32 : block.level === 4 ? 28 : 26);
                        textOpts.bold = true;
                    }

                    runs.push(new docx.TextRun(textOpts));

                    var paragraphOpts = { children: runs };

                    if (block.level) {
                        var headingLevel = block.level === 3 ? docx.HeadingLevel.HEADING_3 :
                            block.level === 4 ? docx.HeadingLevel.HEADING_4 : docx.HeadingLevel.HEADING_5;
                        paragraphOpts.heading = headingLevel;
                        paragraphOpts.spacing = { before: 240, after: 120 };
                    } else if (block.listType === 'bullet') {
                        paragraphOpts.bullet = { level: 0 };
                        paragraphOpts.spacing = { after: 80 };
                    } else if (block.listType === 'numbered') {
                        var numText = text.replace(/^\d+[\.\)]\s*/, '');
                        runs.length = 0;
                        runs.push(new docx.TextRun({ text: numText, font: 'Arial', size: 24 }));
                        paragraphOpts.children = runs;
                        paragraphOpts.bullet = { level: 0 };
                        paragraphOpts.spacing = { after: 80 };
                    } else {
                        paragraphOpts.spacing = { after: 120 };
                    }

                    allChildren.push(new docx.Paragraph(paragraphOpts));
                }
            } else if (page.lines) {
                for (var k = 0; k < page.lines.length; k++) {
                    if (page.lines[k]) {
                        allChildren.push(new docx.Paragraph({
                            children: [new docx.TextRun({ text: page.lines[k], font: 'Arial', size: 24 })],
                            spacing: { after: 120 }
                        }));
                    }
                }
            }
            if (i < pages.length - 1) {
                allChildren.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
            }
        }

        return new docx.Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                    }
                },
                children: allChildren
            }]
        });
    }

    function resetTool() {
        pdfInput.value = '';
        pdfDoc = null;
        totalPages = 0;
        cancelled = false;
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        pagesOption.value = 'all';
        pagesSection.classList.remove('show');
        pageRange.value = '';
        dropZone.style.display = '';
        selectMode('fast');
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
