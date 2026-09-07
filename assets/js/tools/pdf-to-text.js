/* ============================================
   GO TOOLLY - PDF TO TEXT CONVERTER
   Professional PDF to Text Conversion Tool
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const pdfInput = document.getElementById('pdf-input');
    const dropZone = document.getElementById('drop-zone');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const filePages = document.getElementById('file-pages');
    
    const settingsSection = document.getElementById('settings-section');
    const pagesOption = document.getElementById('pages-option');
    const pageRangeGroup = document.getElementById('page-range-group');
    const pageRange = document.getElementById('page-range');
    const convertBtn = document.getElementById('convert-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    
    const resultsSection = document.getElementById('results-section');
    const resultFilename = document.getElementById('result-filename');
    const resultPages = document.getElementById('result-pages');
    const downloadBtn = document.getElementById('download-btn');
    
    const analysisPanel = document.getElementById('analysis-panel');
    const analysisEntries = document.getElementById('analysis-entries');
    
    // State
    let pdfDoc = null;
    let pdfRawBytes = null;
    let totalPages = 0;
    
    // Initialize
    setupEventListeners();
    
    function setupEventListeners() {
        pdfInput.addEventListener('change', handleFileSelect);
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        
        pagesOption.addEventListener('change', function() {
            pageRangeGroup.style.display = this.value === 'range' ? 'flex' : 'none';
        });
        
        convertBtn.addEventListener('click', performConversion);
        resetBtn.addEventListener('click', resetTool);
        
        const anotherBtn = document.getElementById('another-btn');
        if (anotherBtn) {
            anotherBtn.addEventListener('click', resetTool);
        }
    }
    
    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        const pdfFiles = files.filter(f => f.type === 'application/pdf');
        
        if (pdfFiles.length === 0) {
            showNotification('Please select a PDF file', 'error');
            return;
        }
        
        loadPDF(pdfFiles[0]);
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
        
        const files = Array.from(e.dataTransfer.files);
        const pdfFiles = files.filter(f => f.type === 'application/pdf');
        
        if (pdfFiles.length === 0) {
            showNotification('Please drop a PDF file', 'error');
            return;
        }
        
        loadPDF(pdfFiles[0]);
    }
    
    function loadPDF(file) {
        clearAnalysis();
        setAnalysisStatus('pending', 'Opening PDF...');

        const reader = new FileReader();
        
        reader.onload = function(e) {
            pdfRawBytes = new Uint8Array(e.target.result);
            setAnalysisStatus('success', 'PDF opened successfully');
            setAnalysisStatus('pending', 'Reading document structure...');

            pdfjsLib.getDocument(pdfRawBytes).promise.then(function(pdf) {
                pdfDoc = pdf;
                totalPages = pdf.numPages;
                
                fileName.textContent = '\u{1F4C4} ' + file.name;
                filePages.textContent = 'Pages: ' + totalPages;
                fileInfo.style.display = 'block';
                
                settingsSection.style.display = 'block';
                resultsSection.style.display = 'none';

                setAnalysisStatus('success', totalPages + ' pages detected');
            }).catch(function(error) {
                var errMsg = error.message || 'Unknown error';
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
                showNotification('Failed to load PDF: ' + errMsg, 'error');
            });
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    function getPageRanges() {
        if (pagesOption.value === 'all') {
            const pages = [];
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages;
        } else {
            const rangStr = pageRange.value.trim();
            if (!rangStr) {
                showNotification('Please enter a page range', 'error');
                return null;
            }
            
            const pages = new Set();
            const parts = rangStr.split(',');
            
            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed.includes('-')) {
                    const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
                    for (let i = start; i <= end && i <= totalPages; i++) {
                        pages.add(i);
                    }
                } else {
                    const page = parseInt(trimmed);
                    if (page > 0 && page <= totalPages) {
                        pages.add(page);
                    }
                }
            }
            
            return Array.from(pages).sort((a, b) => a - b);
        }
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
        const structure = {
            hasAcroForm: false,
            hasXFA: false,
            acroFormFields: 0,
            annotationTypes: {},
            widgetAnnotations: [],
            textAnnotations: [],
            pagesWithText: 0,
            pagesScanned: 0,
            totalPagesChecked: 0,
            totalPageTextChars: 0,
            perPageTextLengths: [],
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
                console.log('[PDF2Text] getFieldObjects() found ' + structure.acroFormFields + ' fields');
            }
        } catch (e) {
            console.log('[PDF2Text] getFieldObjects() not available:', e.message);
        }

        // ── Method 2: Raw byte scanning ─────────────────────────────
        var byteInfo = scanPDFBytes(pdfRawBytes);
        if (byteInfo.hasAcroForm && !structure.hasAcroForm) {
            structure.hasAcroForm = true;
            structure.rawByteDetected = true;
            console.log('[PDF2Text] Raw bytes detected AcroForm');
        }
        if (byteInfo.hasXFA) {
            structure.hasXFA = true;
            console.log('[PDF2Text] Raw bytes detected XFA');
        }
        if (byteInfo.hasWidgets && structure.widgetAnnotations.length === 0) {
            console.log('[PDF2Text] Raw bytes detected Widget annotations');
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
            console.log('[PDF2Text] Raw bytes found ' + byteInfo.fieldNames.length + ' field names:', byteInfo.fieldNames);
        }

        // ── Check document metadata for AcroForm hints ──────────────
        try {
            const metadata = await pdfDoc.getMetadata();
            const info = metadata.info || {};
            const custom = info.Custom || {};
            if (custom && (custom['AcroForm'] || custom['XFAPackage'] || custom['Form'] === 'AcroForm')) {
                if (!structure.hasAcroForm) structure.hasAcroForm = true;
            }
        } catch (e) { /* metadata not available */ }

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
                    console.log('[PDF2Text] Annotation storage found ' + Object.keys(storedData).length + ' values');
                }
            }
        } catch (e) { /* annotation storage not available */ }

        for (let i = 0; i < pagesToProcess.length; i++) {
            const pageNum = pagesToProcess[i];
            try {
                const page = await pdfDoc.getPage(pageNum);

                const textContent = await page.getTextContent();
                let pageTextLength = 0;
                if (textContent.items && textContent.items.length > 0) {
                    pageTextLength = textContent.items.reduce(function(sum, item) {
                        return sum + (item.str ? item.str.length : 0);
                    }, 0);
                }
                structure.perPageTextLengths.push({ page: pageNum, textLength: pageTextLength });
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
                    for (let j = 0; j < annotations.length; j++) {
                        const ann = annotations[j];
                        const subtype = ann.subtype || 'unknown';
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
                console.warn('[PDF2Text] Could not analyze page ' + pageNum + ':', e.message);
            }
        }

        if (structure.widgetAnnotations.length > 0) {
            structure.hasAcroForm = true;
            if (structure.acroFormFields === 0 || structure.acroFormFields < structure.widgetAnnotations.length) {
                structure.acroFormFields = structure.widgetAnnotations.length;
            }
        }

        for (const key in structure.annotationTypes) {
            if (key.indexOf('XF') !== -1 || key.indexOf('xfa') !== -1) {
                structure.hasXFA = true;
            }
        }

        console.log('[PDF2Text] Final structure analysis: hasAcroForm=' + structure.hasAcroForm +
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
        const lines = [];
        const seen = {};

        for (let i = 0; i < structure.widgetAnnotations.length; i++) {
            const field = structure.widgetAnnotations[i];
            const name = field.fieldname || ('Field ' + (i + 1));
            const value = field.value || '';
            const altText = field.altText || '';

            // Deduplicate by name
            if (seen[name]) continue;
            seen[name] = true;

            const displayValue = value || altText || '';
            // Always include the field — even with empty values — so the output is never blank
            lines.push('[' + name + ']: ' + (displayValue.trim() || '(empty)'));
        }

        // Also extract text from Text/FreeText annotations
        for (let i = 0; i < structure.textAnnotations.length; i++) {
            const ann = structure.textAnnotations[i];
            if (ann.content && ann.content.trim()) {
                lines.push('[Annotation p.' + ann.page + ']: ' + ann.content);
            }
        }

        return lines;
    }

    // ── Empty-output reason builder ─────────────────────────────────
    function getEmptyReason(structure) {
        const reasons = [];

        if (structure.hasXFA) {
            reasons.push('This PDF uses XFA (LiveCycle) forms, which are not supported for text extraction.');
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
    
    async function performConversion() {
        if (!pdfDoc) {
            showNotification('Please load a PDF first', 'error');
            return;
        }
        
        const pages = getPageRanges();
        if (!pages || pages.length === 0) {
            showNotification('Invalid page range', 'error');
            return;
        }
        
        progressContainer.style.display = 'block';
        convertBtn.disabled = true;
        
        try {
            // ── Phase 1: Analyze PDF structure ────────────────────────
            setAnalysisStatus('pending', 'Detecting document structure...');
            console.log('[PDF2Text] Starting conversion for ' + pages.length + ' page(s)');
            const structure = await analyzePDFStructure(pages);

            console.log('[PDF2Text] Structure analysis:', {
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

            // ── Phase 2: Extract page text ───────────────────────────
            const textContent = [];
            const pageTextLengths = [];
            var invisibleRegex = /[\u200B\u200C\u200D\uFEFF\u2060\u2061\u2062\u2063\u180E]/g;
            
            for (let i = 0; i < pages.length; i++) {
                if (i === 0 || i === Math.floor(pages.length / 2) || i === pages.length - 1) {
                    setAnalysisStatus('pending', 'Reading page ' + (i + 1) + ' of ' + pages.length + '...');
                }
                const page = await pdfDoc.getPage(pages[i]);
                const text = await page.getTextContent();
                
                let pageText = '';
                let lastY = null;
                let lastX = null;
                
                for (const item of text.items) {
                    if (!item.str) continue;
                    
                    if (lastY !== null && Math.abs(lastY - item.y) > 5) {
                        pageText += '\n';
                        lastX = null;
                    }
                    
                    if (lastX !== null && item.x - lastX > 2) {
                        const needsSpace = shouldAddSpace(pageText, item.str);
                        if (needsSpace) {
                            pageText += ' ';
                        }
                    }
                    
                    pageText += item.str;
                    lastY = item.y;
                    lastX = item.x + (item.width || 0);
                }
                
                var cleaned = pageText.replace(invisibleRegex, '').trim();
                textContent.push(cleaned);
                pageTextLengths.push({ page: pages[i], chars: cleaned.length });
                console.log('[PDF2Text] Page ' + pages[i] + ': ' + cleaned.length + ' visible chars (' + (text.items ? text.items.length : 0) + ' items)');
                progressFill.style.width = ((i + 1) / pages.length * 100) + '%';
            }
            
            const totalExtractedChars = textContent.reduce(function(sum, t) { return sum + t.length; }, 0);
            console.log('[PDF2Text] Total extracted characters from page text: ' + totalExtractedChars);
            console.log('[PDF2Text] Per-page breakdown:', pageTextLengths);

            // ── Phase 3: Handle empty or form-only extraction ────────
            let formFieldsText = [];
            if (structure.acroFormFields > 0) {
                formFieldsText = extractFormFieldsText(structure);
                console.log('[PDF2Text] Extracted ' + formFieldsText.length + ' form field lines');
                setAnalysisStatus('success', 'Form fields detected: ' + structure.acroFormFields + ' field(s)');
            }

            // Only block if there are truly ZERO sources of content
            const hasFormFields = formFieldsText.length > 0;
            if (totalExtractedChars === 0 && !hasFormFields && !structure.hasXFA) {
                // Completely empty - no text, no form fields, no annotations
                const reasons = getEmptyReason(structure);
                console.warn('[PDF2Text] No text extracted. Reasons:', reasons);
                console.warn('[PDF2Text] Raw byte detected AcroForm:', structure.rawByteDetected);

                let warningMsg = 'No extractable text found. ';
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
                warningMsg += 'For scanned documents, try the PDF OCR tool to recognize text from images.';

                setAnalysisStatus('warning', 'No extractable text found', analysisDetails);

                // Log full diagnostic
                console.warn('[PDF2Text] === CONVERSION DIAGNOSTIC ===');
                console.warn('[PDF2Text] Pages processed: ' + structure.totalPagesChecked);
                console.warn('[PDF2Text] Pages with text: ' + structure.pagesWithText);
                console.warn('[PDF2Text] Pages scanned/image: ' + structure.pagesScanned);
                console.warn('[PDF2Text] AcroForm fields: ' + structure.acroFormFields);
                console.warn('[PDF2Text] Has XFA: ' + structure.hasXFA);
                console.warn('[PDF2Text] Raw byte detected: ' + structure.rawByteDetected);
                console.warn('[PDF2Text] Annotation types:', structure.annotationTypes);
                console.warn('[PDF2Text] Widget annotations:', structure.widgetAnnotations);
                console.warn('[PDF2Text] Reason(s):', reasons);
                console.warn('[PDF2Text] Recommendation: Use OCR tool for scanned documents');
                console.warn('[PDF2Text] ==============================');

                progressContainer.style.display = 'none';
                convertBtn.disabled = false;
                return; // Do NOT generate empty file
            }

            // We have form fields (with or without page text) — include them
            if (hasFormFields) {
                if (totalExtractedChars === 0) {
                    console.log('[PDF2Text] Page text is empty. Using form field structure for output.');
                    for (let f = 0; f < formFieldsText.length; f++) {
                        textContent.push(formFieldsText[f]);
                    }
                } else {
                    console.log('[PDF2Text] Appending ' + formFieldsText.length + ' form field entries to extracted text');
                    textContent.push('');
                    textContent.push('=== FORM FIELD VALUES ===');
                    for (let f = 0; f < formFieldsText.length; f++) {
                        textContent.push(formFieldsText[f]);
                    }
                }
            }

            // XFA-only PDF with no other content — generate a diagnostic file
            if (totalExtractedChars === 0 && !hasFormFields && structure.hasXFA) {
                console.log('[PDF2Text] XFA form detected with no extractable content.');
                textContent.push('=== XFA FORM DETECTED ===');
                textContent.push('This PDF uses XFA (LiveCycle) forms.');
                textContent.push('XFA forms store data in XML format that cannot be extracted as plain text.');
                textContent.push('Please use Adobe Acrobat or a compatible XFA viewer to access the form data.');
                textContent.push('');
                textContent.push('Annotation types found on pages:');
                for (const key in structure.annotationTypes) {
                    textContent.push('  - ' + key + ': ' + structure.annotationTypes[key]);
                }
            }

            // ── Phase 4: Generate output ─────────────────────────────
            var actualContentChars = textContent.reduce(function(sum, t) { return sum + t.length; }, 0);
            console.log('[PDF2Text] Actual content characters (before separators): ' + actualContentChars);

            if (actualContentChars === 0) {
                setAnalysisStatus('error', 'Conversion produced no output', [
                    'The PDF may be scanned or contain only images',
                    'Try the PDF OCR tool for scanned documents'
                ]);
                console.warn('[PDF2Text] All text content is empty after cleaning.');
                progressContainer.style.display = 'none';
                convertBtn.disabled = false;
                return;
            }

            let finalText = '';
            textContent.forEach(function(page, index) {
                if (index > 0) {
                    if (page === '=== FORM FIELD VALUES ===') {
                        finalText += '\n\n' + '='.repeat(80) + '\n' + page + '\n' + '='.repeat(80) + '\n\n';
                    } else {
                        finalText += '\n\n' + '='.repeat(80) + '\nPAGE ' + (index + 1) + '\n' + '='.repeat(80) + '\n\n';
                    }
                }
                finalText += page;
            });

            const finalCharCount = finalText.length;
            console.log('[PDF2Text] Final output: ' + finalCharCount + ' characters (including separators)');

            const textBlob = new Blob([finalText], { type: 'text/plain;charset=utf-8' });
            
            const url = URL.createObjectURL(textBlob);
            downloadBtn.href = url;
            downloadBtn.download = 'document.txt';
            downloadBtn.onclick = function() { setTimeout(function() { URL.revokeObjectURL(url); }, 100); };
            
            resultFilename.textContent = 'document.txt';
            resultPages.textContent = 'Pages: ' + pages.length;
            resultsSection.style.display = 'block';
            progressContainer.style.display = 'none';
            convertBtn.disabled = false;

            const warnings = [];
            if (structure.hasAcroForm) warnings.push('form fields');
            if (structure.pagesScanned > 0) warnings.push(scannedWarning(structure));
            if (structure.hasXFA) warnings.push('XFA forms (partial extraction)');

            var successDetails = [
                finalCharCount + ' characters extracted from ' + pages.length + ' page(s)'
            ];
            if (warnings.length > 0) successDetails.push('Note: ' + warnings.join('; '));

            setAnalysisStatus('success', 'Conversion completed successfully', successDetails);
        } catch (error) {
            setAnalysisStatus('error', 'Conversion failed', [error.message]);
            showNotification('Conversion failed: ' + error.message, 'error');
            console.error('[PDF2Text] Conversion error:', error);
            progressContainer.style.display = 'none';
            convertBtn.disabled = false;
        }
    }

    function scannedWarning(structure) {
        if (structure.pagesScanned === structure.totalPagesChecked) {
            return 'all ' + structure.pagesScanned + ' page(s) appear scanned';
        }
        return structure.pagesScanned + ' page(s) appear scanned';
    }
    
    function shouldAddSpace(previousText, currentText) {
        if (!previousText || !currentText) return false;
        
        // Get the last character of previous text
        const lastChar = previousText.charAt(previousText.length - 1);
        // Get the first character of current text
        const firstChar = currentText.charAt(0);
        
        // Check if characters are Arabic/Persian/Urdu
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        const englishRegex = /[A-Za-z0-9]/;
        
        const lastIsArabic = arabicRegex.test(lastChar);
        const lastIsEnglish = englishRegex.test(lastChar);
        const currentIsArabic = arabicRegex.test(firstChar);
        const currentIsEnglish = englishRegex.test(firstChar);
        
        // Don't add space if last char is punctuation or whitespace already
        if (/[\s\-\(\[\{]/.test(lastChar)) {
            return false;
        }
        
        // Don't add space if current char is punctuation or closing bracket
        if (/[\-\)\]\}\,\.\!\?\:\;]/.test(firstChar)) {
            return false;
        }
        
        // If same script (both Arabic or both English), add space between words
        if ((lastIsArabic && currentIsArabic) || (lastIsEnglish && currentIsEnglish)) {
            return true;
        }
        
        // If switching between Arabic and English, add space
        if ((lastIsArabic && currentIsEnglish) || (lastIsEnglish && currentIsArabic)) {
            return true;
        }
        
        // For other cases (numbers, symbols), be conservative
        return /[A-Za-z0-9\u0600-\u06FF]/.test(lastChar) && /[A-Za-z0-9\u0600-\u06FF]/.test(firstChar);
    }
    
    function resetTool() {
        clearAnalysis();
        pdfInput.value = '';
        pdfDoc = null;
        pdfRawBytes = null;
        totalPages = 0;
        
        fileInfo.style.display = 'none';
        settingsSection.style.display = 'none';
        resultsSection.style.display = 'none';
        progressContainer.style.display = 'none';
        
        pagesOption.value = 'all';
        pageRangeGroup.style.display = 'none';
    }
    
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification ' + (type === 'error' ? 'error' : '');
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                notification.parentNode.removeChild(notification);
            }, 300);
        }, 3000);
    }
});
