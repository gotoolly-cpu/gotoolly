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

    var analysisPanel = document.getElementById('analysis-panel');
    var analysisEntries = document.getElementById('analysis-entries');

    var pdfDoc = null;
    var pdfRawBytes = null;
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
            setAnalysisStatus('error', 'File too large', ['Maximum file size is 50 MB']);
            return;
        }
        clearAnalysis();
        setAnalysisStatus('pending', 'Opening PDF...');
        var reader = new FileReader();
        reader.onload = function (e) {
            pdfRawBytes = new Uint8Array(e.target.result);
            setAnalysisStatus('success', 'PDF opened successfully');
            setAnalysisStatus('pending', 'Reading document structure...');
            pdfjsLib.getDocument({ data: pdfRawBytes, cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/', cMapPacked: true }).promise.then(function (pdf) {
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
                setAnalysisStatus('success', totalPages + ' pages detected');
            }).catch(function (err) {
                var errMsg = err.message || 'Unknown error';
                if (errMsg.indexOf('password') !== -1 || errMsg.indexOf('encrypted') !== -1) {
                    setAnalysisStatus('error', 'Password protected PDF', [
                        'This PDF is password-protected and cannot be opened.',
                        'Please unlock the file first using a PDF unlocker tool.'
                    ]);
                } else if (errMsg.indexOf('Invalid PDF') !== -1 || errMsg.indexOf('corrupt') !== -1) {
                    setAnalysisStatus('error', 'Corrupted PDF', ['The PDF file appears to be damaged or invalid.']);
                } else {
                    setAnalysisStatus('error', 'Failed to load PDF', [errMsg]);
                }
                notify('Failed to load PDF: ' + errMsg, 'error');
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

    // ── Raw PDF byte scanning (fallback for when pdf.js misses AcroForm) ──
    function scanPDFBytes(rawBytes) {
        var result = { hasAcroForm: false, hasXFA: false, hasWidgets: false, fieldTypes: {}, fieldNames: [] };
        if (!rawBytes || rawBytes.length === 0) return result;

        var searchLimit = Math.min(rawBytes.length, 20 * 1024 * 1024);
        var str = '';
        try {
            str = new TextDecoder('latin1', { fatal: false }).decode(rawBytes.subarray(0, searchLimit));
        } catch (e) {
            for (var si = 0; si < searchLimit; si++) {
                str += String.fromCharCode(rawBytes[si]);
            }
        }

        if (str.indexOf('/AcroForm') !== -1) result.hasAcroForm = true;
        if (str.indexOf('/XFA') !== -1) result.hasXFA = true;
        if (str.indexOf('/Subtype /Widget') !== -1 || str.indexOf('/Subtype/Widget') !== -1) result.hasWidgets = true;

        if (str.indexOf('/FT /Tx') !== -1 || str.indexOf('/FT/Tx') !== -1) result.fieldTypes['Tx'] = true;
        if (str.indexOf('/FT /Btn') !== -1 || str.indexOf('/FT/Btn') !== -1) result.fieldTypes['Btn'] = true;
        if (str.indexOf('/FT /Ch') !== -1 || str.indexOf('/FT/Ch') !== -1) result.fieldTypes['Ch'] = true;

        var nameRegex = /\/T[ \n\r]*\(([^)]{1,200})\)/g;
        var match;
        while ((match = nameRegex.exec(str)) !== null) {
            if (result.fieldNames.indexOf(match[1]) === -1) {
                result.fieldNames.push(match[1]);
            }
        }

        return result;
    }

    // ── PDF Structure Analysis ──────────────────────────────────────
    async function analyzePDFStructure(pagesToProcess) {
        var structure = {
            hasAcroForm: false,
            hasXFA: false,
            acroFormFields: 0,
            widgetAnnotations: [],
            textAnnotations: [],
            annotationTypes: {},
            pagesWithText: 0,
            pagesScanned: 0,
            totalPagesChecked: 0,
            totalPageTextChars: 0,
            rawByteDetected: false
        };

        // ── Method 1: pdf.js getFieldObjects() API (public, most reliable) ──
        try {
            var fieldObjects = await pdfDoc.getFieldObjects();
            if (fieldObjects && Object.keys(fieldObjects).length > 0) {
                structure.hasAcroForm = true;
                structure.acroFormFields = 0;
                for (var foName in fieldObjects) {
                    var foArr = fieldObjects[foName];
                    if (foArr && foArr.length > 0) {
                        var fo = foArr[0];
                        structure.acroFormFields++;
                        structure.widgetAnnotations.push({
                            page: 0,
                            fieldtype: fo.fieldType || 'unknown',
                            fieldname: fo.fieldName || foName,
                            value: fo.fieldValue || '',
                            altText: fo.alternativeText || ''
                        });
                    }
                }
                console.log('[PDF2Word] getFieldObjects() found ' + structure.acroFormFields + ' fields');
            }
        } catch (e) {
            console.log('[PDF2Word] getFieldObjects() not available:', e.message);
        }

        // ── Method 2: Raw byte scanning ─────────────────────────────
        var byteInfo = scanPDFBytes(pdfRawBytes);
        if (byteInfo.hasAcroForm && !structure.hasAcroForm) {
            structure.hasAcroForm = true;
            structure.rawByteDetected = true;
            console.log('[PDF2Word] Raw bytes detected AcroForm');
        }
        if (byteInfo.hasXFA) {
            structure.hasXFA = true;
            console.log('[PDF2Word] Raw bytes detected XFA');
        }
        if (byteInfo.hasWidgets && structure.widgetAnnotations.length === 0) {
            console.log('[PDF2Word] Raw bytes detected Widget annotations');
        }
        if (byteInfo.fieldNames.length > 0 && structure.widgetAnnotations.length === 0) {
            structure.acroFormFields = byteInfo.fieldNames.length;
            for (var fn = 0; fn < byteInfo.fieldNames.length; fn++) {
                structure.widgetAnnotations.push({
                    page: 0,
                    fieldtype: 'raw-detected',
                    fieldname: byteInfo.fieldNames[fn],
                    value: '',
                    altText: ''
                });
            }
            console.log('[PDF2Word] Raw bytes found ' + byteInfo.fieldNames.length + ' field names:', byteInfo.fieldNames);
        }

        // ── Try catalog access (internal API) ───────────────────────
        try {
            var catalog = null;
            if (typeof pdfDoc._ensureCatalog === 'function') {
                catalog = await pdfDoc._ensureCatalog();
            } else if (pdfDoc._transport && pdfDoc._transport._catalog) {
                catalog = pdfDoc._transport._catalog;
            }
            if (catalog) {
                var acroForm = catalog.acroForm || catalog.AcroForm;
                if (acroForm) {
                    if (!structure.hasAcroForm) structure.hasAcroForm = true;
                    if (acroForm.XFA && !structure.hasXFA) structure.hasXFA = true;
                }
            }
        } catch (e) { /* catalog not accessible */ }

        // ── Method 3: Try annotation storage ─────────────────────────
        try {
            if (pdfDoc.annotationStorage) {
                var storedData = pdfDoc.annotationStorage.getAll();
                if (storedData && Object.keys(storedData).length > 0) {
                    if (!structure.hasAcroForm) structure.hasAcroForm = true;
                    for (var stKey in storedData) {
                        var exists = false;
                        for (var ws = 0; ws < structure.widgetAnnotations.length; ws++) {
                            if (structure.widgetAnnotations[ws].fieldname === stKey) { exists = true; break; }
                        }
                        if (!exists) {
                            structure.acroFormFields++;
                            structure.widgetAnnotations.push({
                                page: 0,
                                fieldtype: 'annotation-storage',
                                fieldname: stKey,
                                value: storedData[stKey] || '',
                                altText: ''
                            });
                        }
                    }
                    console.log('[PDF2Word] Annotation storage found ' + Object.keys(storedData).length + ' values');
                }
            }
        } catch (e) { /* annotation storage not available */ }

        for (var i = 0; i < pagesToProcess.length; i++) {
            var pageNum = pagesToProcess[i];
            try {
                var page = await pdfDoc.getPage(pageNum);

                var textContent = await page.getTextContent();
                var pageTextLength = 0;
                if (textContent.items && textContent.items.length > 0) {
                    pageTextLength = textContent.items.reduce(function (sum, item) {
                        return sum + (item.str ? item.str.length : 0);
                    }, 0);
                }
                structure.totalPageTextChars += pageTextLength;

                if (pageTextLength > 0) {
                    structure.pagesWithText++;
                } else {
                    structure.pagesScanned++;
                }

                // ── Try page.getAnnotations() with multiple intents ──
                var annotations = [];
                try {
                    var annotsDisplay = await page.getAnnotations({ intent: 'display' });
                    if (annotsDisplay) annotations = annotations.concat(annotsDisplay);
                } catch (e2) { /* display annotations not available */ }
                try {
                    var annotsSave = await page.getAnnotations({ intent: 'save' });
                    if (annotsSave) annotations = annotations.concat(annotsSave);
                } catch (e3) { /* save annotations not available */ }
                try {
                    var annotsDefault = await page.getAnnotations();
                    if (annotsDefault) annotations = annotations.concat(annotsDefault);
                } catch (e4) { /* default annotations not available */ }

                if (annotations && annotations.length > 0) {
                    for (var j = 0; j < annotations.length; j++) {
                        var ann = annotations[j];
                        var subtype = ann.subtype || 'unknown';
                        structure.annotationTypes[subtype] = (structure.annotationTypes[subtype] || 0) + 1;

                        if (subtype === 'Widget') {
                            var wa = {
                                page: pageNum,
                                fieldtype: ann.fieldType || ann.type || 'unknown',
                                fieldname: ann.fieldName || ann.aname || '',
                                value: ann.fieldValue || ann.value || '',
                                altText: ann.alternativeText || ''
                            };
                            var wdup = false;
                            for (var wc = 0; wc < structure.widgetAnnotations.length; wc++) {
                                if (structure.widgetAnnotations[wc].fieldname === wa.fieldname &&
                                    structure.widgetAnnotations[wc].page === wa.page) { wdup = true; break; }
                            }
                            if (!wdup) structure.widgetAnnotations.push(wa);
                        }

                        if (subtype === 'Text' || subtype === 'FreeText') {
                            var td = { page: pageNum, content: ann.contents || ann.alternativeText || '' };
                            if (td.content) structure.textAnnotations.push(td);
                        }
                    }
                }

                structure.totalPagesChecked++;
            } catch (e) {
                console.warn('[PDF2Word] Could not analyze page ' + pageNum + ':', e.message);
            }
        }

        if (structure.widgetAnnotations.length > 0) {
            structure.hasAcroForm = true;
            if (structure.acroFormFields === 0 || structure.acroFormFields < structure.widgetAnnotations.length) {
                structure.acroFormFields = structure.widgetAnnotations.length;
            }
        }

        for (var key in structure.annotationTypes) {
            if (key.indexOf('XF') !== -1 || key.indexOf('xfa') !== -1) {
                structure.hasXFA = true;
            }
        }

        console.log('[PDF2Word] Final structure analysis: hasAcroForm=' + structure.hasAcroForm +
            ' hasXFA=' + structure.hasXFA + ' acroFormFields=' + structure.acroFormFields +
            ' widgetAnnotations=' + structure.widgetAnnotations.length +
            ' textAnnotations=' + structure.textAnnotations.length +
            ' pagesWithText=' + structure.pagesWithText +
            ' pagesScanned=' + structure.pagesScanned +
            ' totalPageTextChars=' + structure.totalPageTextChars +
            ' rawByteDetected=' + structure.rawByteDetected);

        return structure;
    }

    // ── Form Field Text Extraction ──────────────────────────────────
    function extractFormFieldsText(structure) {
        var lines = [];
        var seen = {};

        for (var i = 0; i < structure.widgetAnnotations.length; i++) {
            var field = structure.widgetAnnotations[i];
            var name = field.fieldname || ('Field ' + (i + 1));
            var value = field.value || '';
            var altText = field.altText || '';

            // Deduplicate by name
            if (seen[name]) continue;
            seen[name] = true;

            var displayValue = value || altText || '';
            // Always include the field — even with empty values — so the output is never blank
            lines.push({ label: name, value: displayValue.trim() || '(empty)' });
        }

        for (var j = 0; j < structure.textAnnotations.length; j++) {
            var ann = structure.textAnnotations[j];
            if (ann.content && ann.content.trim()) {
                lines.push({ label: 'Annotation (page ' + ann.page + ')', value: ann.content });
            }
        }

        return lines;
    }

    // ── Empty-output reason builder ─────────────────────────────────
    function getEmptyReason(structure) {
        var reasons = [];

        if (structure.hasXFA) {
            reasons.push('This PDF uses XFA (LiveCycle) forms, which are not supported.');
        } else if (structure.hasAcroForm && structure.acroFormFields > 0) {
            reasons.push('Form fields detected (' + structure.acroFormFields + ' fields), but their values could not be extracted as text.');
        } else if (structure.pagesScanned === structure.totalPagesChecked && structure.totalPagesChecked > 0) {
            reasons.push('This appears to be a scanned/image-based PDF with no extractable text layer.');
        } else if (structure.pagesWithText === 0 && structure.totalPagesChecked > 0) {
            reasons.push('No text content was found on any of the processed pages.');
        }

        return reasons;
    }

    // ── Analysis Status Panel ───────────────────────────────────────
    var analysisSvgCache = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>'
    };

    function setAnalysisStatus(type, message, details) {
        if (!analysisEntries) return;
        analysisPanel.style.display = 'block';
        analysisPanel.classList.add('show');

        var entry = document.createElement('div');
        entry.className = 'analysis-entry ' + type;

        var icon = document.createElement('span');
        icon.className = 'analysis-entry-icon';
        icon.innerHTML = analysisSvgCache[type] || analysisSvgCache.info;
        entry.appendChild(icon);

        var text = document.createElement('span');
        text.className = 'analysis-entry-text';
        text.textContent = message;
        entry.appendChild(text);

        if (details && details.length > 0) {
            var ul = document.createElement('ul');
            ul.className = 'analysis-details';
            for (var d = 0; d < details.length; d++) {
                var li = document.createElement('li');
                li.textContent = details[d];
                ul.appendChild(li);
            }
            entry.appendChild(ul);
        }

        analysisEntries.appendChild(entry);
    }

    function clearAnalysis() {
        if (!analysisEntries) return;
        analysisEntries.innerHTML = '';
        analysisPanel.style.display = 'none';
        analysisPanel.classList.remove('show');
    }

    // ── Main Conversion ─────────────────────────────────────────────
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
            // ── Phase 1: Analyze PDF structure ────────────────────────
            setAnalysisStatus('pending', 'Detecting document structure...');
            console.log('[PDF2Word] Starting conversion for ' + pages.length + ' page(s)');
            var structure = await analyzePDFStructure(pages);

            console.log('[PDF2Word] Structure analysis:', {
                hasAcroForm: structure.hasAcroForm,
                hasXFA: structure.hasXFA,
                acroFormFields: structure.acroFormFields,
                widgetCount: structure.widgetAnnotations.length,
                textAnnotations: structure.textAnnotations.length,
                pagesWithText: structure.pagesWithText,
                pagesScanned: structure.pagesScanned,
                totalPageTextChars: structure.totalPageTextChars,
                totalPagesChecked: structure.totalPagesChecked,
                annotationTypes: structure.annotationTypes
            });

            var structDetails = [];
            if (structure.pagesWithText > 0) structDetails.push(structure.pagesWithText + ' page(s) with text layer');
            if (structure.pagesScanned > 0) structDetails.push(structure.pagesScanned + ' page(s) appear scanned');
            if (structure.acroFormFields > 0) structDetails.push(structure.acroFormFields + ' form field(s) detected');
            if (structure.textAnnotations.length > 0) structDetails.push(structure.textAnnotations.length + ' annotation(s)');
            if (structure.hasXFA) structDetails.push('XFA form detected');
            if (structDetails.length > 0) {
                setAnalysisStatus('info', 'Document structure analyzed', structDetails);
            } else {
                setAnalysisStatus('info', 'Document structure analyzed');
            }

            // ── Phase 2: Extract page content ────────────────────────
            var docPages = [];
            var pageTextLengths = [];
            for (var i = 0; i < pages.length; i++) {
                if (i === 0 || i === Math.floor(pages.length / 2) || i === pages.length - 1) {
                    setAnalysisStatus('pending', 'Reading page ' + (i + 1) + ' of ' + pages.length + '...');
                }
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

                // Log per-page stats
                var pageCharCount = 0;
                if (textContent.items) {
                    pageCharCount = textContent.items.reduce(function (s, it) { return s + (it.str ? it.str.length : 0); }, 0);
                }
                pageTextLengths.push({ page: pages[i], chars: pageCharCount });
                console.log('[PDF2Word] Page ' + pages[i] + ': ' + pageCharCount + ' chars (' + (textContent.items ? textContent.items.length : 0) + ' items)');

                if (selectedMode === 'best') {
                    docPages.push(analyzePage(textContent, viewport, page));
                } else {
                    docPages.push(extractFast(textContent, viewport));
                }

                await new Promise(function (r) { setTimeout(r, 0); });
            }

            if (cancelled) {
                setAnalysisStatus('warning', 'Conversion cancelled by user');
                progressContainer.classList.remove('show');
                convertBtn.disabled = false;
                resetBtn.disabled = false;
                return;
            }

            // ── Phase 3: Count total extracted characters ─────────────
            var totalExtractedChars = 0;
            for (var p = 0; p < docPages.length; p++) {
                var dp = docPages[p];
                if (dp.lines) {
                    totalExtractedChars += dp.lines.reduce(function (s, l) { return s + l.length; }, 0);
                } else if (dp.blocks) {
                    totalExtractedChars += dp.blocks.reduce(function (s, b) { return s + (b.text ? b.text.length : 0); }, 0);
                }
            }
            console.log('[PDF2Word] Total extracted characters from page text: ' + totalExtractedChars);
            console.log('[PDF2Word] Per-page breakdown:', pageTextLengths);

            // ── Phase 4: Handle empty or form-only extraction ────────
            var formFieldsData = [];
            if (structure.acroFormFields > 0) {
                formFieldsData = extractFormFieldsText(structure);
                console.log('[PDF2Word] Extracted ' + formFieldsData.length + ' form field entries');
                setAnalysisStatus('success', 'Form fields detected: ' + structure.acroFormFields + ' field(s)');
            }

            // Only block if there are truly ZERO sources of content
            var hasFormFields = formFieldsData.length > 0;
            if (totalExtractedChars === 0 && !hasFormFields && !structure.hasXFA) {
                // Completely empty
                var reasons = getEmptyReason(structure);
                console.warn('[PDF2Word] No text extracted. Reasons:', reasons);
                console.warn('[PDF2Word] Raw byte detected AcroForm:', structure.rawByteDetected);

                var warningMsg = 'No extractable text found. ';
                var analysisDetails = [];
                if (structure.rawByteDetected && structure.acroFormFields > 0) {
                    warningMsg = 'Form fields detected (' + structure.acroFormFields + '), but no field values could be extracted. ';
                    analysisDetails.push('Interactive form fields detected');
                    analysisDetails.push('Form field values could not be extracted as text');
                } else if (structure.pagesScanned > 0 && structure.pagesScanned === structure.totalPagesChecked) {
                    warningMsg += 'This appears to be a scanned/image-based PDF. ';
                    analysisDetails.push('All pages appear to be scanned images');
                    analysisDetails.push('No text layer found in the PDF');
                    analysisDetails.push('Try the PDF OCR tool to extract text from images');
                } else {
                    analysisDetails.push('No text content found on any page');
                    analysisDetails.push('Try the PDF OCR tool for scanned documents');
                }
                warningMsg += 'For scanned documents, try the PDF OCR tool.';

                setAnalysisStatus('warning', 'No extractable text found', analysisDetails);

                console.warn('[PDF2Word] === CONVERSION DIAGNOSTIC ===');
                console.warn('[PDF2Word] Pages processed: ' + structure.totalPagesChecked);
                console.warn('[PDF2Word] Pages with text: ' + structure.pagesWithText);
                console.warn('[PDF2Word] Pages scanned/image: ' + structure.pagesScanned);
                console.warn('[PDF2Word] AcroForm fields: ' + structure.acroFormFields);
                console.warn('[PDF2Word] Has XFA: ' + structure.hasXFA);
                console.warn('[PDF2Word] Raw byte detected: ' + structure.rawByteDetected);
                console.warn('[PDF2Word] Annotation types:', structure.annotationTypes);
                console.warn('[PDF2Word] Widget annotations:', structure.widgetAnnotations);
                console.warn('[PDF2Word] Reason(s):', reasons);
                console.warn('[PDF2Word] Recommendation: Use OCR tool for scanned documents');
                console.warn('[PDF2Word] ==============================');

                progressContainer.classList.remove('show');
                convertBtn.disabled = false;
                resetBtn.disabled = false;
                return; // Do NOT generate empty file
            }

            // We have form fields (with or without page text) — include them
            if (hasFormFields) {
                if (totalExtractedChars === 0) {
                    console.log('[PDF2Word] Page text is empty. Using form field structure for output.');
                    var formLines = [];
                    for (var ff = 0; ff < formFieldsData.length; ff++) {
                        formLines.push(formFieldsData[ff].label + ': ' + formFieldsData[ff].value);
                    }
                    docPages = [{ lines: formLines, pageWidth: 0, pageHeight: 0 }];
                } else {
                    console.log('[PDF2Word] Appending ' + formFieldsData.length + ' form field entries to output');
                    var formLines2 = ['=== FORM FIELD VALUES ==='];
                    for (var ff2 = 0; ff2 < formFieldsData.length; ff2++) {
                        formLines2.push(formFieldsData[ff2].label + ': ' + formFieldsData[ff2].value);
                    }
                    docPages.push({ lines: formLines2, pageWidth: 0, pageHeight: 0 });
                }
            }

            // XFA-only PDF with no other content — generate a diagnostic docx
            if (totalExtractedChars === 0 && !hasFormFields && structure.hasXFA) {
                console.log('[PDF2Word] XFA form detected with no extractable content.');
                var xfaLines = [
                    'XFA FORM DETECTED',
                    'This PDF uses XFA (LiveCycle) forms.',
                    'XFA forms store data in XML format that cannot be extracted as plain text.',
                    'Please use Adobe Acrobat or a compatible XFA viewer to access the form data.',
                    '',
                    'Annotation types found on pages:'
                ];
                for (var key in structure.annotationTypes) {
                    xfaLines.push('  - ' + key + ': ' + structure.annotationTypes[key]);
                }
                docPages = [{ lines: xfaLines, pageWidth: 0, pageHeight: 0 }];
            }

            // ── Phase 5: Generate DOCX ───────────────────────────────
            var actualContentChars = 0;
            for (var ac = 0; ac < docPages.length; ac++) {
                var acPage = docPages[ac];
                if (acPage.lines) {
                    actualContentChars += acPage.lines.reduce(function (s, l) { return s + l.length; }, 0);
                } else if (acPage.blocks) {
                    actualContentChars += acPage.blocks.reduce(function (s, b) { return s + (b.text ? b.text.length : 0); }, 0);
                }
            }
            console.log('[PDF2Word] Actual content characters (before DOCX generation): ' + actualContentChars);

            if (actualContentChars === 0) {
                setAnalysisStatus('error', 'Conversion produced no output', [
                    'The PDF may be scanned or contain only images',
                    'Try the PDF OCR tool for scanned documents'
                ]);
                console.warn('[PDF2Word] All text content is empty after cleaning.');
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

            console.log('[PDF2Word] Generated DOCX: ' + formatSize(blob.size));

            // Safety check: if blob is suspiciously small (< 200 bytes for an empty docx)
            if (blob.size < 200) {
                console.warn('[PDF2Word] Generated file is suspiciously small (' + blob.size + ' bytes)');
            }

            var url = URL.createObjectURL(blob);
            downloadBtn.href = url;
            downloadBtn.download = 'document.docx';
            downloadBtn.onclick = function() { setTimeout(function() { URL.revokeObjectURL(url); }, 100); };

            resultPages.textContent = pages.length + ' page' + (pages.length !== 1 ? 's' : '');
            resultSize.textContent = formatSize(blob.size);
            resultMode.textContent = selectedMode === 'best' ? 'Best Formatting' : 'Fast';
            resultsPanel.classList.add('show');
            progressContainer.classList.remove('show');

            progressPercent.textContent = '100%';
            progressFill.style.width = '100%';

            var warnings = [];
            if (structure.hasAcroForm) warnings.push('form fields');
            if (structure.pagesScanned > 0) {
                warnings.push(structure.pagesScanned === structure.totalPagesChecked
                    ? 'all ' + structure.pagesScanned + ' page(s) appear scanned'
                    : structure.pagesScanned + ' page(s) appear scanned');
            }
            if (structure.hasXFA) warnings.push('XFA forms (partial extraction)');

            var successDetails = [
                formatSize(blob.size) + ' DOCX generated from ' + pages.length + ' page(s)',
                'Mode: ' + (selectedMode === 'best' ? 'Best Formatting' : 'Fast')
            ];
            if (warnings.length > 0) successDetails.push('Note: ' + warnings.join('; '));

            setAnalysisStatus('success', 'Conversion completed successfully', successDetails);
        } catch (err) {
            setAnalysisStatus('error', 'Conversion failed', [err.message]);
            notify('Conversion failed: ' + err.message, 'error');
            console.error('[PDF2Word] Conversion error:', err);
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
        var invisibleRegex = /[\u200B\u200C\u200D\uFEFF\u2060\u2061\u2062\u2063\u180E]/g;

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

        var cleanedLines = [];
        for (var c = 0; c < lines.length; c++) {
            var cleaned = lines[c].replace(invisibleRegex, '').trim();
            if (cleaned) cleanedLines.push(cleaned);
        }

        return { lines: cleanedLines, pageWidth: viewport.width, pageHeight: viewport.height };
    }

    function analyzePage(textContent, viewport) {
        var invisibleRegex = /[\u200B\u200C\u200D\uFEFF\u2060\u2061\u2062\u2063\u180E]/g;
        var items = textContent.items.filter(function (it) { return it.str.replace(invisibleRegex, '').trim() !== ''; });
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
            // If this is a form field values section, add a heading
            if (page.lines && page.lines.length > 0 && page.lines[0] === '=== FORM FIELD VALUES ===') {
                children.push(new docx.Paragraph({
                    children: [new docx.TextRun({ text: 'Form Field Values', font: 'Arial', size: 28, bold: true })],
                    heading: docx.HeadingLevel.HEADING_3,
                    spacing: { before: 240, after: 120 }
                }));
                for (var ff = 1; ff < page.lines.length; ff++) {
                    children.push(new docx.Paragraph({
                        children: [new docx.TextRun({ text: page.lines[ff], font: 'Arial', size: 24 })],
                        spacing: { after: 80 }
                    }));
                }
            } else {
                for (var j = 0; j < page.lines.length; j++) {
                    var line = page.lines[j];
                    if (line) {
                        children.push(new docx.Paragraph({
                            children: [new docx.TextRun({ text: line, font: 'Arial', size: 24 })],
                            spacing: { after: 120 }
                        }));
                    }
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

            // Handle form field sections
            if (page.lines && page.lines.length > 0 && page.lines[0] === '=== FORM FIELD VALUES ===') {
                allChildren.push(new docx.Paragraph({
                    children: [new docx.TextRun({ text: 'Form Field Values', font: 'Arial', size: 28, bold: true })],
                    heading: docx.HeadingLevel.HEADING_3,
                    spacing: { before: 240, after: 120 }
                }));
                for (var ff = 1; ff < page.lines.length; ff++) {
                    allChildren.push(new docx.Paragraph({
                        children: [new docx.TextRun({ text: page.lines[ff], font: 'Arial', size: 24 })],
                        spacing: { after: 80 }
                    }));
                }
            } else if (page.blocks) {
                for (var j = 0; j < page.blocks.length; j++) {
                    var block = page.blocks[j];
                    var runs = [];
                    var text = block.text.replace(/[\u200B\u200C\u200D\uFEFF\u2060\u2061\u2062\u2063\u180E]/g, '').trim();
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
        clearAnalysis();
        pdfInput.value = '';
        pdfDoc = null;
        pdfRawBytes = null;
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
