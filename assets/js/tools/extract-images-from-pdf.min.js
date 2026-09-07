document.addEventListener('DOMContentLoaded', function () {
    var attempts = 0;
    var libsReady = false;

    function waitForLibs(callback) {
        var interval = setInterval(function () {
            attempts++;
            if (typeof pdfjsLib !== 'undefined' && typeof JSZip !== 'undefined' && !libsReady) {
                libsReady = true;
                clearInterval(interval);
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                callback();
            } else if (attempts > 50) {
                clearInterval(interval);
                notify('Libraries failed to load. Please refresh the page.', 'error');
            }
        }, 200);
    }

    waitForLibs(function () {
        var fileInput = document.getElementById('pdf-input');
        var dropZone = document.getElementById('drop-zone');
        var fileInfo = document.getElementById('file-info');
        var fileName = document.getElementById('file-name');
        var fileSize = document.getElementById('file-size');
        var fileStatus = document.getElementById('file-status');
        var filePages = document.getElementById('file-pages');
        var settingsPanel = document.getElementById('settings-panel');
        var minSizeSelect = document.getElementById('min-size');
        var extractBtn = document.getElementById('extract-btn');
        var resetBtn = document.getElementById('reset-btn');
        var progressContainer = document.getElementById('progress-container');
        var progressFill = document.getElementById('progress-fill');
        var progressText = document.getElementById('progress-text');
        var progressPercent = document.getElementById('progress-percent');
        var resultsPanel = document.getElementById('results-panel');
        var resultsDesc = document.getElementById('results-desc');
        var resultCount = document.getElementById('result-count');
        var resultTotalSize = document.getElementById('result-total-size');
        var downloadBtn = document.getElementById('download-btn');
        var newFileBtn = document.getElementById('new-file-btn');
        var extractedGrid = document.getElementById('extracted-grid');

        var pdfBytes = null;
        var totalPages = 0;
        var extractedImages = [];
        var unsupportedFilters = [];

        function init() {
            fileInput.addEventListener('change', handleFileSelect);
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            extractBtn.addEventListener('click', startExtraction);
            resetBtn.addEventListener('click', resetTool);
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
                pdfBytes = new Uint8Array(e.target.result);
                totalPages = getPageCount(bytesToText(pdfBytes));
                fileName.textContent = file.name;
                fileSize.textContent = formatSize(file.size);
                filePages.textContent = totalPages + ' page' + (totalPages !== 1 ? 's' : '');
                fileStatus.textContent = 'Ready';
                fileInfo.classList.add('show');
                settingsPanel.classList.add('show');
                resultsPanel.classList.remove('show');
                dropZone.style.display = 'none';
                notify('PDF loaded successfully', 'success');
            };
            reader.readAsArrayBuffer(file);
        }

        // =============================================
        // SECTION 1: PDF Binary Parser
        // =============================================

        function bytesToText(bytes) {
            if (typeof TextDecoder !== 'undefined') {
                return new TextDecoder('latin1').decode(bytes);
            }
            var parts = [];
            var chunkSize = 8192;
            for (var i = 0; i < bytes.length; i += chunkSize) {
                var chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
                var s = '';
                for (var j = 0; j < chunk.length; j++) {
                    s += String.fromCharCode(chunk[j]);
                }
                parts.push(s);
            }
            return parts.join('');
        }

        function getPageCount(text) {
            var re = /\/Type\s*\/Pages\b[\s\S]{0,200}?\/Count\s+(\d+)/;
            var match = text.match(re);
            if (match) return parseInt(match[1], 10);
            var re2 = /\/Count\s+(\d+)[\s\S]{0,200}?\/Type\s*\/Pages\b/;
            var match2 = text.match(re2);
            if (match2) return parseInt(match2[1], 10);
            return 0;
        }

        function findObjects(text) {
            var re = /(\d{1,10})\s+(\d{1,5})\s+obj\b/g;
            var objects = [];
            var seen = {};
            var m;
            while ((m = re.exec(text)) !== null) {
                var num = parseInt(m[1], 10);
                var gen = parseInt(m[2], 10);
                var key = num + '_' + gen;
                if (!seen[key]) {
                    seen[key] = true;
                    objects.push({
                        num: num,
                        gen: gen,
                        offset: m.index
                    });
                }
            }
            objects.sort(function (a, b) { return a.offset - b.offset; });
            return objects;
        }

        function buildObjectMap(objects) {
            var map = {};
            for (var i = 0; i < objects.length; i++) {
                map[objects[i].num] = objects[i];
            }
            return map;
        }

        function getObjEnd(text, objOffset, allObjects, objIndex) {
            var nextOffset = text.length;
            if (objIndex + 1 < allObjects.length) {
                nextOffset = allObjects[objIndex + 1].offset;
            }
            return nextOffset;
        }

        function getObjContent(text, objOffset, objEnd) {
            var objKwIdx = text.indexOf('obj', objOffset);
            if (objKwIdx === -1 || objKwIdx > objEnd) return '';
            var start = objKwIdx + 3;
            if (start >= objEnd) return '';
            return text.substring(start, objEnd);
        }

        function getObjContentWithOffset(text, objOffset, objEnd) {
            var objKwIdx = text.indexOf('obj', objOffset);
            if (objKwIdx === -1 || objKwIdx > objEnd) return null;
            var start = objKwIdx + 3;
            if (start >= objEnd) return null;
            return { content: text.substring(start, objEnd), byteOffset: start };
        }

        function getDictText(content) {
            var trimmed = content.replace(/^\s+/, '');
            if (trimmed.indexOf('<<') !== 0) return '';
            var depth = 0;
            var start = -1;
            var end = -1;
            for (var i = 0; i < content.length - 1; i++) {
                if (content[i] === '<' && content[i + 1] === '<') {
                    if (depth === 0) start = i;
                    depth++;
                    i++;
                } else if (content[i] === '>' && content[i + 1] === '>') {
                    depth--;
                    if (depth === 0) {
                        end = i + 2;
                        break;
                    }
                    i++;
                }
            }
            if (start === -1 || end === -1) return '';
            return content.substring(start, end);
        }

        function findStreamData(content, bytes, contentByteOffset) {
            var streamRe = /\bstream(\r\n|\r|\n)/;
            var streamMatch = streamRe.exec(content);
            if (!streamMatch) return null;
            var dataStart = contentByteOffset + streamMatch.index + streamMatch[0].length;
            var searchFrom = streamMatch.index + streamMatch[0].length;
            var endstreamRe = /\bendstream\b/;
            endstreamRe.lastIndex = searchFrom;
            var endMatch = endstreamRe.exec(content);
            if (!endMatch) return null;
            var dataEnd = contentByteOffset + endMatch.index;
            while (dataEnd > dataStart && (bytes[dataEnd - 1] === 0x20 || bytes[dataEnd - 1] === 0x0A || bytes[dataEnd - 1] === 0x0D)) {
                dataEnd--;
            }
            return { start: dataStart, end: dataEnd };
        }

        function getDictValue(dictText, key) {
            var re = new RegExp('\\/' + key + '\\s*<<([\\s\\S]*?)>>');
            var dictMatch = dictText.match(re);
            if (dictMatch) return { type: 'dict', value: dictMatch[1] };

            var arrRe = new RegExp('\\/' + key + '\\s*\\[([^\\]]+)\\]');
            var arrMatch = dictText.match(arrRe);
            if (arrMatch) return { type: 'array', value: arrMatch[1] };

            var refRe = new RegExp('\\/' + key + '\\s+(\\d+\\s+\\d+\\s+R)');
            var refMatch = dictText.match(refRe);
            if (refMatch) return { type: 'ref', value: refMatch[1] };

            var numRe = new RegExp('\\/' + key + '\\s+(-?\\d+\\.?\\d*)');
            var numMatch = dictText.match(numRe);
            if (numMatch) return { type: 'number', value: parseFloat(numMatch[1]) };

            var nameRe = new RegExp('\\/' + key + '\\s*\\/([\\w.]+)');
            var nameMatch = dictText.match(nameRe);
            if (nameMatch) return { type: 'name', value: nameMatch[1] };

            return null;
        }

        function getNameFromValue(v) {
            if (!v) return '';
            if (v.type === 'name') return v.value;
            if (v.type === 'ref') return v.value;
            return '';
        }

        function getNumberFromValue(v) {
            if (!v) return -1;
            if (v.type === 'number') return v.value;
            if (v.type === 'name') return parseInt(v.value, 10);
            return -1;
        }

        function isImageObject(dictText) {
            var subtype = getDictValue(dictText, 'Subtype');
            return subtype && subtype.type === 'name' && subtype.value === 'Image';
        }

        function getFilterList(dictText) {
            var filterVal = getDictValue(dictText, 'Filter');
            if (!filterVal) return [];
            if (filterVal.type === 'array') {
                var filters = [];
                var re = /\/([\w.]+)/g;
                var m;
                while ((m = re.exec(filterVal.value)) !== null) {
                    filters.push(m[1]);
                }
                return filters;
            }
            if (filterVal.type === 'name') return [filterVal.value];
            if (filterVal.type === 'ref') return [filterVal.value];
            return [];
        }

        function getDecodeParmsList(dictText) {
            var re = /\/DecodeParms\s*(<<[\s\S]*?>>|\[[\s\S]*?\]|\d+\s+\d+\s+R)/g;
            var parms = [];
            var m;
            while ((m = re.exec(dictText)) !== null) {
                var val = m[1];
                if (val.charAt(0) === '<' && val.charAt(1) === '<') {
                    var inner = val.substring(2, val.length - 2);
                    var pred = getDictValue(inner, 'Predictor');
                    var cols = getDictValue(inner, 'Columns');
                    var colors = getDictValue(inner, 'Colors');
                    var bpc = getDictValue(inner, 'BitsPerComponent');
                    parms.push({
                        predictor: pred ? getNumberFromValue(pred) : 1,
                        columns: cols ? getNumberFromValue(cols) : 0,
                        colors: colors ? getNumberFromValue(colors) : 3,
                        bpc: bpc ? getNumberFromValue(bpc) : 8
                    });
                } else if (val.charAt(0) === '[') {
                    var re2 = /<<([\s\S]*?)>>/g;
                    var innerMatch;
                    while ((innerMatch = re2.exec(val)) !== null) {
                        var inner2 = innerMatch[1];
                        var pred2 = getDictValue(inner2, 'Predictor');
                        var cols2 = getDictValue(inner2, 'Columns');
                        parms.push({
                            predictor: pred2 ? getNumberFromValue(pred2) : 1,
                            columns: cols2 ? getNumberFromValue(cols2) : 0,
                            colors: 3,
                            bpc: 8
                        });
                    }
                } else {
                    parms.push(null);
                }
            }
            return parms;
        }

        function getColorSpaceInfo(dictText) {
            var csVal = getDictValue(dictText, 'ColorSpace');
            if (!csVal) return 3;
            if (csVal.type === 'name') {
                var name = csVal.value;
                if (name === 'DeviceGray' || name === 'CalGray') return 1;
                if (name === 'DeviceCMYK') return 4;
                return 3;
            }
            if (csVal.type === 'array') {
                var arrText = csVal.value;
                if (arrText.indexOf('DeviceGray') !== -1 || arrText.indexOf('CalGray') !== -1) return 1;
                if (arrText.indexOf('DeviceCMYK') !== -1) return 4;
                if (arrText.indexOf('ICCBased') !== -1) {
                    var nMatch = arrText.match(/\/N\s+(\d+)/);
                    if (nMatch) return parseInt(nMatch[1], 10);
                    var numMatch = arrText.match(/(\d+)\s*$/);
                    if (numMatch) return parseInt(numMatch[1], 10);
                    return 3;
                }
                if (arrText.indexOf('DeviceRGB') !== -1 || arrText.indexOf('CalRGB') !== -1) return 3;
                return 3;
            }
            if (csVal.type === 'ref') return 3;
            return 3;
        }

        function parseXref(text) {
            var xrefMap = {};
            var trailerDict = null;

            var startXrefMatch = text.match(/startxref\s+(\d+)\s*%%EOF/);
            if (!startXrefMatch) {
                startXrefMatch = text.match(/startxref\s+(\d+)/);
            }
            if (!startXrefMatch) return { xref: xrefMap, trailer: trailerDict };

            var xrefOffset = parseInt(startXrefMatch[1], 10);
            var atOffset = text.substring(xrefOffset, xrefOffset + 10);

            if (atOffset.trim().indexOf('xref') === 0) {
                var lines = text.substring(xrefOffset).split(/\r?\n/);
                var lineIdx = 1;
                while (lineIdx < lines.length) {
                    var line = lines[lineIdx].trim();
                    if (line.indexOf('trailer') === 0) {
                        var trailerText = lines.slice(lineIdx).join('\n');
                        var dictMatch = trailerText.match(/<<([\s\S]*?)>>/);
                        if (dictMatch) {
                            trailerDict = dictMatch[1];
                        }
                        break;
                    }
                    var parts = line.split(/\s+/);
                    if (parts.length === 2 && !isNaN(parseInt(parts[0]))) {
                        var startObj = parseInt(parts[0], 10);
                        var count = parseInt(parts[1], 10);
                        lineIdx++;
                        for (var j = 0; j < count && lineIdx < lines.length; j++) {
                            var entryLine = lines[lineIdx].trim().split(/\s+/);
                            if (entryLine.length >= 3 && entryLine[2] === 'n') {
                                xrefMap[startObj + j] = {
                                    offset: parseInt(entryLine[0], 10),
                                    gen: parseInt(entryLine[1], 10)
                                };
                            }
                            lineIdx++;
                        }
                    } else {
                        lineIdx++;
                    }
                }
            }

            return { xref: xrefMap, trailer: trailerDict };
        }

        function resolveRef(refStr, objectMap, text) {
            var match = refStr.match(/(\d+)\s+(\d+)\s+R/);
            if (!match) return null;
            var num = parseInt(match[1], 10);
            var obj = objectMap[num];
            if (!obj) return null;
            var content = getObjContent(text, obj.offset, obj.offset + 10000);
            return getDictText(content);
        }

        function getArrayRefs(dictText, key) {
            var val = getDictValue(dictText, key);
            if (!val || val.type !== 'array') return [];
            var refs = [];
            var re = /(\d+)\s+(\d+)\s+R/g;
            var m;
            while ((m = re.exec(val.value)) !== null) {
                refs.push({ num: parseInt(m[1], 10), gen: parseInt(m[2], 10) });
            }
            return refs;
        }

        function getStringValue(dictText, key) {
            var val = getDictValue(dictText, key);
            if (!val) return '';
            if (val.type === 'name') return val.value;
            if (val.type === 'number') return String(val.value);
            return '';
        }

        // =============================================
        // SECTION 2: Stream Decoders
        // =============================================

        async function decodeFlate(data) {
            try {
                var ds = new DecompressionStream('deflate-raw');
                var writer = ds.writable.getWriter();
                writer.write(data);
                writer.close();
                var reader = ds.readable.getReader();
                var chunks = [];
                while (true) {
                    var result = await reader.read();
                    if (result.done) break;
                    chunks.push(result.value);
                }
                var totalLen = 0;
                for (var i = 0; i < chunks.length; i++) totalLen += chunks[i].length;
                var out = new Uint8Array(totalLen);
                var offset = 0;
                for (var j = 0; j < chunks.length; j++) {
                    out.set(chunks[j], offset);
                    offset += chunks[j].length;
                }
                return out;
            } catch (e) {
                throw new Error('FlateDecode failed: ' + e.message);
            }
        }

        function decodeLZW(data) {
            var clearCode = 256;
            var eoiCode = 257;
            var codeSize = 9;
            var nextCode = 258;
            var table = [];
            var output = [];
            var bitPos = 0;
            var prevCode = -1;

            for (var i = 0; i < 256; i++) table[i] = [i];

            function readCode() {
                var code = 0;
                for (var b = 0; b < codeSize; b++) {
                    var byteIdx = bitPos >> 3;
                    var bitIdx = 7 - (bitPos & 7);
                    if (byteIdx < data.length) {
                        code |= ((data[byteIdx] >> bitIdx) & 1) << (codeSize - 1 - b);
                    }
                    bitPos++;
                }
                return code;
            }

            while (true) {
                var code = readCode();
                if (code === eoiCode) break;
                if (code === clearCode) {
                    table = [];
                    for (var ci = 0; ci < 256; ci++) table[ci] = [ci];
                    nextCode = 258;
                    codeSize = 9;
                    prevCode = -1;
                    continue;
                }
                if (code < 0 || code > 4095) break;

                var entry;
                if (code < table.length && table[code]) {
                    entry = table[code].slice();
                } else if (code === nextCode && prevCode !== -1 && prevCode < table.length) {
                    entry = table[prevCode].slice();
                    entry.push(table[prevCode][0]);
                } else {
                    break;
                }

                for (var k = 0; k < entry.length; k++) output.push(entry[k]);

                if (prevCode !== -1 && prevCode < table.length && nextCode < 4096) {
                    var newEntry = table[prevCode].slice();
                    newEntry.push(entry[0]);
                    table[nextCode] = newEntry;
                    nextCode++;
                    if (nextCode === (1 << codeSize) && codeSize < 12) codeSize++;
                }
                prevCode = code;
            }

            return new Uint8Array(output);
        }

        function decodeASCII85(data) {
            var chars = [];
            for (var i = 0; i < data.length; i++) {
                if (data[i] === 0x7E) break;
                if (data[i] === 0x7A) {
                    chars.push('z');
                    continue;
                }
                if (data[i] >= 33 && data[i] <= 117) {
                    chars.push(String.fromCharCode(data[i]));
                }
            }
            var output = [];
            var group = [];
            for (var j = 0; j < chars.length; j++) {
                if (chars[j] === 'z') {
                    output.push(0, 0, 0, 0);
                    continue;
                }
                group.push(chars[j].charCodeAt(0) - 33);
                if (group.length === 5) {
                    var val = 0;
                    for (var k = 0; k < 5; k++) val = val * 85 + group[k];
                    output.push((val >> 24) & 0xFF, (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF);
                    group = [];
                }
            }
            if (group.length > 1) {
                while (group.length < 5) group.push(84);
                var val2 = 0;
                for (var m = 0; m < 5; m++) val2 = val2 * 85 + group[m];
                var padCount = 5 - group.length;
                for (var n = 0; n < 4 - padCount; n++) {
                    output.push((val2 >> (24 - n * 8)) & 0xFF);
                }
            }
            return new Uint8Array(output);
        }

        function decodeASCIIHex(data) {
            var hex = '';
            for (var i = 0; i < data.length; i++) {
                if (data[i] === 0x3E) break;
                var ch = String.fromCharCode(data[i]);
                if ((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) {
                    hex += ch;
                }
            }
            if (hex.length % 2 === 1) hex += '0';
            var out = new Uint8Array(hex.length / 2);
            for (var j = 0; j < hex.length; j += 2) {
                out[j / 2] = parseInt(hex.substring(j, j + 2), 16);
            }
            return out;
        }

        function paethPredictor(a, b, c) {
            var p = a + b - c;
            var pa = Math.abs(p - a);
            var pb = Math.abs(p - b);
            var pc = Math.abs(p - c);
            if (pa <= pb && pa <= pc) return a;
            if (pb <= pc) return b;
            return c;
        }

        function unfilterPNG(data, columns, rows, bytesPerPixel) {
            var rowLength = columns * bytesPerPixel;
            var expectedLen = (rowLength + 1) * rows;
            if (data.length < expectedLen) return data;

            var output = new Uint8Array(columns * rows * bytesPerPixel);
            var prevRow = new Uint8Array(rowLength);

            for (var y = 0; y < rows; y++) {
                var filterType = data[y * (rowLength + 1)];
                var srcStart = y * (rowLength + 1) + 1;
                var curRow = new Uint8Array(rowLength);
                for (var x = 0; x < rowLength; x++) {
                    curRow[x] = data[srcStart + x];
                }

                switch (filterType) {
                    case 0: break;
                    case 1:
                        for (var x1 = bytesPerPixel; x1 < rowLength; x1++) {
                            curRow[x1] = (curRow[x1] + curRow[x1 - bytesPerPixel]) & 0xFF;
                        }
                        break;
                    case 2:
                        for (var x2 = 0; x2 < rowLength; x2++) {
                            curRow[x2] = (curRow[x2] + prevRow[x2]) & 0xFF;
                        }
                        break;
                    case 3:
                        for (var x3 = 0; x3 < rowLength; x3++) {
                            var left = x3 >= bytesPerPixel ? curRow[x3 - bytesPerPixel] : 0;
                            curRow[x3] = (curRow[x3] + Math.floor((left + prevRow[x3]) / 2)) & 0xFF;
                        }
                        break;
                    case 4:
                        for (var x4 = 0; x4 < rowLength; x4++) {
                            var left4 = x4 >= bytesPerPixel ? curRow[x4 - bytesPerPixel] : 0;
                            var upLeft = x4 >= bytesPerPixel ? prevRow[x4 - bytesPerPixel] : 0;
                            curRow[x4] = (curRow[x4] + paethPredictor(left4, prevRow[x4], upLeft)) & 0xFF;
                        }
                        break;
                }

                for (var c = 0; c < rowLength; c++) {
                    output[y * rowLength + c] = curRow[c];
                }
                prevRow = curRow;
            }
            return output;
        }

        async function decodeFilterChain(data, filters, decodeParmsList) {
            var result = data;
            for (var i = 0; i < filters.length; i++) {
                var filter = filters[i];
                var parms = (decodeParmsList && i < decodeParmsList.length) ? decodeParmsList[i] : null;

                if (filter === 'DCTDecode') {
                    return { data: result, type: 'jpeg' };
                } else if (filter === 'JPXDecode') {
                    return { data: result, type: 'jp2' };
                } else if (filter === 'CCITTFaxDecode') {
                    unsupportedFilters.push('CCITTFaxDecode');
                    return null;
                } else if (filter === 'JBIG2Decode') {
                    unsupportedFilters.push('JBIG2Decode');
                    return null;
                } else if (filter === 'FlateDecode') {
                    result = await decodeFlate(result);
                    if (parms && parms.predictor >= 10 && parms.predictor <= 15 && parms.columns > 0) {
                        var bpp = parms.colors * Math.ceil(parms.bpc / 8);
                        if (bpp < 1) bpp = 1;
                        var rows = Math.ceil(result.length / (parms.columns * bpp + 1));
                        result = unfilterPNG(result, parms.columns, rows, bpp);
                    }
                } else if (filter === 'LZWDecode') {
                    result = decodeLZW(result);
                } else if (filter === 'ASCII85Decode') {
                    result = decodeASCII85(result);
                } else if (filter === 'ASCIIHexDecode') {
                    result = decodeASCIIHex(result);
                } else if (filter === 'RunLengthDecode') {
                    result = decodeRunLength(result);
                } else if (filter === 'Crypt') {
                    continue;
                } else {
                    unsupportedFilters.push(filter);
                    return null;
                }
            }
            return { data: result, type: 'raw' };
        }

        function decodeRunLength(data) {
            var output = [];
            var i = 0;
            while (i < data.length) {
                var code = data[i++];
                if (code === 128) break;
                if (code < 128) {
                    var count = code + 1;
                    for (var j = 0; j < count && i < data.length; j++) {
                        output.push(data[i++]);
                    }
                } else {
                    var count2 = 257 - code;
                    var val = i < data.length ? data[i++] : 0;
                    for (var k = 0; k < count2; k++) {
                        output.push(val);
                    }
                }
            }
            return new Uint8Array(output);
        }

        // =============================================
        // SECTION 3: Image Conversion
        // =============================================

        function canvasToBlob(canvas) {
            var dataUrl = canvas.toDataURL('image/png');
            var parts = dataUrl.split(',');
            var byteStr = atob(parts[1]);
            var ab = new ArrayBuffer(byteStr.length);
            var ia = new Uint8Array(ab);
            for (var i = 0; i < byteStr.length; i++) {
                ia[i] = byteStr.charCodeAt(i);
            }
            return new Blob([ab], { type: 'image/png' });
        }

        function rawToImageBlob(data, width, height, numComponents) {
            if (data.length < width * height * numComponents) return null;
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            var imgData = ctx.createImageData(width, height);
            var pixels = imgData.data;

            if (numComponents === 1) {
                for (var p = 0; p < width * height; p++) {
                    pixels[p * 4] = data[p];
                    pixels[p * 4 + 1] = data[p];
                    pixels[p * 4 + 2] = data[p];
                    pixels[p * 4 + 3] = 255;
                }
            } else if (numComponents === 3) {
                for (var p2 = 0; p2 < width * height; p2++) {
                    var si = p2 * 3;
                    pixels[p2 * 4] = data[si];
                    pixels[p2 * 4 + 1] = data[si + 1];
                    pixels[p2 * 4 + 2] = data[si + 2];
                    pixels[p2 * 4 + 3] = 255;
                }
            } else if (numComponents === 4) {
                for (var p3 = 0; p3 < width * height; p3++) {
                    var si2 = p3 * 4;
                    var c = data[si2] / 255;
                    var m = data[si2 + 1] / 255;
                    var y = data[si2 + 2] / 255;
                    var k = data[si2 + 3] / 255;
                    pixels[p3 * 4] = Math.round(255 * (1 - c) * (1 - k));
                    pixels[p3 * 4 + 1] = Math.round(255 * (1 - m) * (1 - k));
                    pixels[p3 * 4 + 2] = Math.round(255 * (1 - y) * (1 - k));
                    pixels[p3 * 4 + 3] = 255;
                }
            }

            ctx.putImageData(imgData, 0, 0);
            return canvasToBlob(canvas);
        }

        // =============================================
        // SECTION 4: Main Extraction - Method 1: Direct Object Scan
        // =============================================

        async function extractByDirectScan(bytes, text, objects) {
            var images = [];
            var objectMap = buildObjectMap(objects);

            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
                var nextObjEnd = getObjEnd(text, obj.offset, objects, i);
                var objInfo = getObjContentWithOffset(text, obj.offset, nextObjEnd);
                if (!objInfo) continue;
                var content = objInfo.content;
                var contentByteOffset = objInfo.byteOffset;
                var dictText = getDictText(content);

                if (!dictText || !isImageObject(dictText)) continue;

                var width = getNumberFromValue(getDictValue(dictText, 'Width'));
                var height = getNumberFromValue(getDictValue(dictText, 'Height'));
                if (width <= 0 || height <= 0 || width > 8000 || height > 8000) continue;

                var filters = getFilterList(dictText);
                var decodeParmsList = getDecodeParmsList(dictText);
                var numComponents = getColorSpaceInfo(dictText);
                var bpcVal = getNumberFromValue(getDictValue(dictText, 'BitsPerComponent'));
                if (bpcVal <= 0 || bpcVal > 32) bpcVal = 8;

                var streamBounds = findStreamData(content, bytes, contentByteOffset);
                if (!streamBounds) continue;
                if (streamBounds.end <= streamBounds.start) continue;

                var streamData = bytes.slice(streamBounds.start, streamBounds.end);

                try {
                    var decoded = await decodeFilterChain(streamData, filters, decodeParmsList);
                    if (!decoded) continue;

                    var blob = null;
                    if (decoded.type === 'jpeg') {
                        blob = new Blob([decoded.data], { type: 'image/jpeg' });
                    } else if (decoded.type === 'jp2') {
                        blob = new Blob([decoded.data], { type: 'image/jp2' });
                    } else {
                        if (bpcVal === 1) {
                            numComponents = 1;
                        }
                        blob = rawToImageBlob(decoded.data, width, height, numComponents);
                    }

                    if (blob && blob.size > 0) {
                        var ext = blob.type === 'image/jpeg' ? '.jpg' : blob.type === 'image/jp2' ? '.jp2' : '.png';
                        images.push({
                            blob: blob,
                            url: URL.createObjectURL(blob),
                            name: 'image_' + (images.length + 1) + ext,
                            width: width,
                            height: height
                        });
                    }
                } catch (e) {
                    continue;
                }
            }

            return images;
        }

        // =============================================
        // SECTION 5: Extraction - Method 2: Page Tree Traversal
        // =============================================

        async function extractByPageTree(bytes, text, objects, xrefMap) {
            var images = [];
            var objectMap = buildObjectMap(objects);

            var catalogDict = null;
            for (var i = 0; i < objects.length; i++) {
                var content = getObjContent(text, objects[i].offset, getObjEnd(text, objects[i].offset, objects, i));
                var dict = getDictText(content);
                if (dict && /\/Type\s*\/Catalog\b/.test(dict)) {
                    catalogDict = dict;
                    break;
                }
            }
            if (!catalogDict) return images;

            var pagesRef = getDictValue(catalogDict, 'Pages');
            if (!pagesRef || pagesRef.type !== 'ref') return images;

            var pagesObj = resolveRef(pagesRef.value, objectMap, text);
            if (!pagesObj) return images;

            var pageRefs = getArrayRefs(pagesObj, 'Kids');
            if (pageRefs.length === 0) return images;

            var allImageRefs = [];

            function collectImageRefs(nodeDict, depth) {
                if (depth > 20) return;
                var typeVal = getDictValue(nodeDict, 'Type');
                if (typeVal && typeVal.type === 'name' && typeVal.value === 'Page') {
                    var resources = getDictValue(nodeDict, 'Resources');
                    if (resources && resources.type === 'ref') {
                        var resDict = resolveRef(resources.value, objectMap, text);
                        if (resDict) {
                            var xobjRefs = getArrayRefs(resDict, 'XObject');
                            if (xobjRefs.length === 0) {
                                var xobjVal = getDictValue(resDict, 'XObject');
                                if (xobjVal && xobjVal.type === 'ref') {
                                    var xobjDict = resolveRef(xobjVal.value, objectMap, text);
                                    if (xobjDict) {
                                        var keys = xobjDict.match(/\/\w[\w.]*/g) || [];
                                        for (var k = 0; k < keys.length; k++) {
                                            var kName = keys[k].substring(1);
                                            if (kName === 'Subtype' || kName === 'Type') continue;
                                            var refVal = getDictValue(xobjDict, kName);
                                            if (refVal && refVal.type === 'ref') {
                                                xobjRefs.push({ num: parseInt(refVal.value), gen: 0 });
                                            }
                                        }
                                    }
                                }
                            }
                            for (var xi = 0; xi < xobjRefs.length; xi++) {
                                var xobjContent = getObjContent(text,
                                    objectMap[xobjRefs[xi].num] ? objectMap[xobjRefs[xi].num].offset : 0,
                                    (objectMap[xobjRefs[xi].num] ? objectMap[xobjRefs[xi].num].offset : 0) + 5000
                                );
                                var xobjDict = getDictText(xobjContent);
                                if (xobjDict && /\/Subtype\s*\/Image\b/.test(xobjDict)) {
                                    allImageRefs.push({ objNum: xobjRefs[xi].num, dict: xobjDict });
                                }
                            }
                        }
                    }
                } else if (typeVal && typeVal.type === 'name' && typeVal.value === 'Pages') {
                    var kids = getArrayRefs(nodeDict, 'Kids');
                    for (var ki = 0; ki < kids.length; ki++) {
                        var kidObj = objectMap[kids[ki].num];
                        if (!kidObj) continue;
                        var kidContent = getObjContent(text, kidObj.offset, getObjEnd(text, kidObj.offset, objects, objects.indexOf(kidObj)));
                        var kidDict = getDictText(kidContent);
                        if (kidDict) collectImageRefs(kidDict, depth + 1);
                    }
                }
            }

            collectImageRefs(pagesObj, 0);

            for (var j = 0; j < allImageRefs.length; j++) {
                var imgRef = allImageRefs[j];
                var imgObj = objectMap[imgRef.objNum];
                if (!imgObj) continue;

                var imgNextEnd = getObjEnd(text, imgObj.offset, objects, objects.indexOf(imgObj));
                var imgObjInfo = getObjContentWithOffset(text, imgObj.offset, imgNextEnd);
                if (!imgObjInfo) continue;
                var imgContent = imgObjInfo.content;
                var imgContentByteOffset = imgObjInfo.byteOffset;
                var imgDict = getDictText(imgContent);
                if (!imgDict) imgDict = imgRef.dict;

                var w = getNumberFromValue(getDictValue(imgDict, 'Width'));
                var h = getNumberFromValue(getDictValue(imgDict, 'Height'));
                if (w <= 0 || h <= 0 || w > 8000 || h > 8000) continue;

                var filters = getFilterList(imgDict);
                var decodeParmsList = getDecodeParmsList(imgDict);
                var nc = getColorSpaceInfo(imgDict);
                var bpc = getNumberFromValue(getDictValue(imgDict, 'BitsPerComponent'));
                if (bpc <= 0 || bpc > 32) bpc = 8;

                var bounds = findStreamData(imgContent, bytes, imgContentByteOffset);
                if (!bounds) continue;

                var sData = bytes.slice(bounds.start, bounds.end);
                try {
                    var dec = await decodeFilterChain(sData, filters, decodeParmsList);
                    if (!dec) continue;

                    var blob = null;
                    if (dec.type === 'jpeg') {
                        blob = new Blob([dec.data], { type: 'image/jpeg' });
                    } else if (dec.type === 'jp2') {
                        blob = new Blob([dec.data], { type: 'image/jp2' });
                    } else {
                        if (bpc === 1) nc = 1;
                        blob = rawToImageBlob(dec.data, w, h, nc);
                    }

                    if (blob && blob.size > 0) {
                        var ext = blob.type === 'image/jpeg' ? '.jpg' : blob.type === 'image/jp2' ? '.jp2' : '.png';
                        images.push({
                            blob: blob,
                            url: URL.createObjectURL(blob),
                            name: 'image_' + (images.length + 1) + ext,
                            width: w,
                            height: h
                        });
                    }
                } catch (e) {
                    continue;
                }
            }

            return images;
        }

        // =============================================
        // SECTION 6: Fallback - pdf.js Page Rendering
        // =============================================

        async function extractByPageRendering(bytes, minSize) {
            var images = [];
            try {
                var pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
                var numPages = pdf.numPages;

                for (var p = 1; p <= numPages; p++) {
                    var page = await pdf.getPage(p);
                    var scale = 2;
                    var viewport = page.getViewport({ scale: scale });
                    var canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    var ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                    var blob = canvasToBlob(canvas);
                    if (blob && blob.size >= minSize) {
                        images.push({
                            blob: blob,
                            url: URL.createObjectURL(blob),
                            name: 'page_' + p + '.png',
                            width: viewport.width,
                            height: viewport.height
                        });
                    }
                }
            } catch (e) {
                console.error('Page rendering fallback failed:', e);
            }
            return images;
        }

        // =============================================
        // SECTION 7: Main Extraction Orchestrator
        // =============================================

        async function extractImagesFromPDF(bytes) {
            var text = bytesToText(bytes);
            var objects = findObjects(text);
            unsupportedFilters = [];

            setProgress('Scanning PDF objects...', 10);
            await delay(80);
            var allImages = [];

            setProgress('Extracting embedded images (direct scan)...', 25);
            await delay(80);
            var directImages = await extractByDirectScan(bytes, text, objects);
            allImages = allImages.concat(directImages);

            if (allImages.length === 0) {
                setProgress('Trying page tree traversal...', 50);
                await delay(80);
                var xresult = parseXref(text);
                var treeImages = await extractByPageTree(bytes, text, objects, xresult.xref);
                allImages = allImages.concat(treeImages);
            }

            if (allImages.length === 0) {
                setProgress('No embedded images found. Rendering pages as fallback...', 70);
                await delay(80);
                var minSize = parseInt(minSizeSelect.value, 10) * 1024;
                var pageImages = await extractByPageRendering(bytes, minSize);
                allImages = allImages.concat(pageImages);
            }

            return allImages;
        }

        // =============================================
        // SECTION 8: UI
        // =============================================

        function setProgress(text, pct) {
            if (progressText) progressText.textContent = text;
            if (progressPercent) progressPercent.textContent = pct + '%';
            if (progressFill) progressFill.style.width = pct + '%';
        }

        function delay(ms) {
            return new Promise(function (r) { setTimeout(r, ms); });
        }

        async function startExtraction() {
            if (!pdfBytes) {
                notify('Please load a PDF first', 'error');
                return;
            }

            extractBtn.disabled = true;
            resetBtn.disabled = true;
            resultsPanel.classList.remove('show');
            extractedGrid.innerHTML = '';
            extractedImages = [];
            progressContainer.classList.add('show');
            setProgress('Starting extraction...', 0);
            await delay(50);

            try {
                var minSize = parseInt(minSizeSelect.value, 10) * 1024;

                setProgress('Parsing PDF structure...', 10);
                var foundImages = await extractImagesFromPDF(pdfBytes);

                setProgress('Filtering results...', 85);

                for (var i = 0; i < foundImages.length; i++) {
                    if (foundImages[i].blob.size >= minSize) {
                        extractedImages.push(foundImages[i]);

                        var thumb = document.createElement('div');
                        thumb.className = 'image-thumb';
                        thumb.innerHTML = '<img src="' + foundImages[i].url + '" alt="' + foundImages[i].name + '">' +
                            '<div class="thumb-info">' +
                            '<span class="thumb-name">' + foundImages[i].width + 'x' + foundImages[i].height + '</span>' +
                            '<span class="thumb-size">' + formatSize(foundImages[i].blob.size) + '</span>' +
                            '<a href="' + foundImages[i].url + '" download="' + foundImages[i].name + '" class="btn btn-sm btn-secondary">Save</a>' +
                            '</div>';
                        extractedGrid.appendChild(thumb);
                    }
                }

                resultCount.textContent = extractedImages.length + ' image' + (extractedImages.length !== 1 ? 's' : '');
                var totalBytes = extractedImages.reduce(function (s, img) { return s + img.blob.size; }, 0);
                resultTotalSize.textContent = formatSize(totalBytes);
                resultsPanel.classList.add('show');

                if (extractedImages.length > 0) {
                    resultsDesc.textContent = 'Found and extracted images from your PDF.';
                    downloadBtn.onclick = function () { downloadAll(); };
                } else {
                    var msg = 'No images found in this PDF.';
                    if (unsupportedFilters.length > 0) {
                        msg += ' Some images use unsupported compression: ' + unsupportedFilters.join(', ') + '.';
                    }
                    resultsDesc.textContent = msg;
                }

                setProgress('Done!', 100);
                await delay(600);
                progressContainer.classList.remove('show');
                notify('Extraction complete!', 'success');
            } catch (err) {
                notify('Extraction failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            extractBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function downloadAll() {
            if (extractedImages.length === 0) return;
            if (typeof JSZip !== 'undefined') {
                var zip = new JSZip();
                extractedImages.forEach(function (img) {
                    zip.file(img.name, img.blob);
                });
                zip.generateAsync({ type: 'blob' }).then(function (blob) {
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'extracted-images.zip';
                    a.click();
                    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
                });
            } else {
                extractedImages.forEach(function (img) {
                    var a = document.createElement('a');
                    a.href = img.url;
                    a.download = img.name;
                    a.click();
                });
            }
        }

        function resetTool() {
            fileInput.value = '';
            pdfBytes = null;
            totalPages = 0;
            extractedImages = [];
            unsupportedFilters = [];
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            extractedGrid.innerHTML = '';
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
