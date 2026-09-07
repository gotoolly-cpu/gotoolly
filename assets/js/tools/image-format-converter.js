/* ============================================
   GO TOOLLY - IMAGE FORMAT CONVERTER
   Enhanced conversion engine v3
   Multi-format client-side image conversion
   ============================================ */
(function(){
    'use strict';

    var el = {
        fileInput: document.getElementById('file-input'),
        dropZone: document.getElementById('drop-zone'),
        settingsCard: document.getElementById('settings-card'),
        outputFormat: document.getElementById('output-format'),
        qualitySlider: document.getElementById('quality-slider'),
        qualityValue: document.getElementById('quality-value'),
        qualityDisplay: document.getElementById('quality-display'),
        qualityFill: document.getElementById('quality-fill'),
        preserveMetadata: document.getElementById('preserve-metadata'),
        optimizePng: document.getElementById('optimize-png'),
        progressiveJpeg: document.getElementById('progressive-jpeg'),
        bgColor: document.getElementById('bg-color'),
        icoOptions: document.getElementById('ico-options'),
        previewSection: document.getElementById('preview-section'),
        previewOriginal: document.getElementById('preview-original'),
        previewCanvas: document.getElementById('preview-canvas'),
        originalDimensions: document.getElementById('original-dimensions'),
        originalSize: document.getElementById('original-size'),
        originalFormat: document.getElementById('original-format'),
        convertedDimensions: document.getElementById('converted-dimensions'),
        convertedSize: document.getElementById('converted-size'),
        convertedFormat: document.getElementById('converted-format'),
        progressArea: document.getElementById('progress-area'),
        progressFill: document.getElementById('progress-fill'),
        progressText: document.getElementById('progress-text'),
        progressPercent: document.getElementById('progress-percent'),
        convertBtn: document.getElementById('convert-btn'),
        resetBtn: document.getElementById('reset-btn'),
        resultsArea: document.getElementById('results-area'),
        resultsContent: document.getElementById('results-content'),
        successText: document.getElementById('success-text'),
        successInfo: document.getElementById('success-info'),
        fileCount: document.getElementById('file-count')
    };

    var state = {
        files: [],
        results: [],
        objectUrls: []
    };

    var features = { webp: null, avif: null };

    var canvasPool = [];
    var previewScheduleTimer = null;

    /* ── Format registry ─────────────────────── */
    var FORMATS = {
        jpeg: { mime: 'image/jpeg', ext: 'jpg',  alpha: false, native: true },
        png:  { mime: 'image/png',  ext: 'png',  alpha: true,  native: true },
        webp: { mime: 'image/webp', ext: 'webp', alpha: true,  native: true },
        avif: { mime: 'image/avif', ext: 'avif', alpha: true,  native: true },
        tiff: { mime: 'image/tiff', ext: 'tif',  alpha: true,  native: false },
        gif:  { mime: 'image/gif',  ext: 'gif',  alpha: true,  native: false },
        ico:  { mime: 'image/x-icon', ext:'ico', alpha: true,  native: false }
    };

    function fmt(key) { return FORMATS[key] || FORMATS.jpeg; }

    /* ── Canvas helpers ──────────────────────── */
    function getCanvas(w, h) {
        var c = canvasPool.pop();
        if (!c) c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }

    function releaseCanvas(c) {
        if (c && canvasPool.length < 8) { c.width = 0; c.height = 0; canvasPool.push(c); }
    }

    function getImageData(canvas) {
        return canvas.getContext('2d', { alpha: true }).getImageData(0, 0, canvas.width, canvas.height);
    }

    function checkCanvasLimit(w, h) {
        if (w > 32767 || h > 32767) return 'Image dimensions exceed maximum supported size (32767\u00D732767).';
        if (w * h > 268435456) {
            try {
                var t = document.createElement('canvas');
                t.width = w; t.height = h;
                var tc = t.getContext('2d');
                if (!tc) return 'Your browser cannot process images of this size.';
                tc.fillStyle = 'red'; tc.fillRect(0, 0, 1, 1);
            } catch(e) { return 'Image too large for your browser to process.'; }
        }
        return null;
    }

    /* ── Feature detection ──────────────────── */
    function detectWebPSupport() {
        if (features.webp !== null) return Promise.resolve(features.webp);
        return new Promise(function(resolve) {
            var img = new Image();
            img.onload = function() { features.webp = (img.width > 0); resolve(features.webp); };
            img.onerror = function() { features.webp = false; resolve(false); };
            img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoCAAEAAQAcJaQAA3AA/v3AgAA=';
        });
    }

    function detectAVIFSupport() {
        if (features.avif !== null) return Promise.resolve(features.avif);
        return new Promise(function(resolve) {
            var c = document.createElement('canvas');
            c.width = 1; c.height = 1;
            var ctx = c.getContext('2d');
            if (!ctx) { features.avif = false; resolve(false); return; }
            ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 1, 1);
            c.toBlob(function(blob) { features.avif = !!blob; resolve(features.avif); }, 'image/avif');
        });
    }

    /* HEIC & JPEG XL are impossible client-side (no browser API, no viable pure-JS encoder).
       We detect and permanently disable them. */
    function checkFormatSupport(format) {
        switch (format) {
            case 'webp': return detectWebPSupport();
            case 'avif': return detectAVIFSupport();
            default:     return Promise.resolve(true);
        }
    }

    /* ── GIF Encoder ────────────────────────────
         Static GIF89a with LZW, global colour table,
         optional transparency via Graphics Control Extension. */
    function encodeGIF(canvas) {
        var id = getImageData(canvas);
        var d = id.data, imgW = canvas.width, imgH = canvas.height;

        var px = [], trIdx = -1;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
            if (a < 128) { px.push(-1); continue; }
            px.push(((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF));
        }

        var unique = {}, hasTr = false;
        for (i = 0; i < px.length; i++) {
            if (px[i] === -1) { hasTr = true; continue; }
            unique[px[i]] = (unique[px[i]] || 0) + 1;
        }

        var cols = Object.keys(unique).map(function(k) {
            return { rgb: +k, count: unique[k],
                     r: (+k >> 16) & 0xFF, g: (+k >> 8) & 0xFF, b: +k & 0xFF };
        });
        cols.sort(function(a,b){ return b.count - a.count; });

        var palette, nColors;
        if (cols.length <= 256) {
            palette = cols; nColors = cols.length;
        } else {
            palette = cols.slice(0, 256);
            nColors = 256;
        }
        if (hasTr && nColors >= 256) { palette.pop(); nColors--; }

        var colorCount = nColors;
        var colorBits = colorCount <= 2 ? 2 : colorCount <= 4 ? 3 : colorCount <= 8 ? 4 :
                        colorCount <= 16 ? 5 : colorCount <= 32 ? 6 : colorCount <= 64 ? 7 : 8;

        function dist2(ri, gi, bi) {
            var best = Infinity, bestIdx = 0;
            for (var j = 0; j < palette.length; j++) {
                var dr = ri - palette[j].r, dg = gi - palette[j].g, db = bi - palette[j].b;
                var d = dr*dr + dg*dg + db*db;
                if (d < best) { best = d; bestIdx = j; }
            }
            return bestIdx;
        }

        var indices = [];
        for (i = 0; i < px.length; i++) {
            if (px[i] === -1) { indices.push(trIdx >= 0 ? trIdx : 0); continue; }
            var c = px[i];
            var ri = (c >> 16) & 0xFF, gi = (c >> 8) & 0xFF, bi = c & 0xFF;
            var matched = false;
            for (var j = 0; j < palette.length; j++) {
                if (palette[j].rgb === c) { indices.push(j); matched = true; break; }
            }
            if (!matched) indices.push(dist2(ri, gi, bi));
        }

        if (hasTr) {
            trIdx = palette.length;
            for (i = 0; i < px.length; i++) {
                if (px[i] === -1) indices[i] = trIdx;
            }
        }

        var gcSize = 1 << colorBits;
        while (palette.length < gcSize) palette.push({ r:0, g:0, b:0 });

        /* ---- LZW ---- */
        var minCodeSize = colorBits;
        var clearCode = 1 << minCodeSize;
        var eoiCode = clearCode + 1;
        var codeSize = minCodeSize + 1;
        var maxCodeVal = (1 << codeSize) - 1;

        var lzwOut = [], bits = 0, nBits = 0;
        function putCode(code, sz) {
            bits |= (code << nBits);
            nBits += sz;
            while (nBits >= 8) { lzwOut.push(bits & 0xFF); bits >>>= 8; nBits -= 8; }
        }

        putCode(clearCode, codeSize);
        var dict = {}, nxt = eoiCode + 1;
        var cur = indices[0];

        for (i = 1; i < indices.length; i++) {
            var nxtIdx = indices[i];
            var key = cur + ',' + nxtIdx;
            if (dict[key] !== void 0) {
                cur = dict[key];
            } else {
                putCode(cur, codeSize);
                if (nxt < 4096) {
                    dict[key] = nxt++;
                    if (nxt > maxCodeVal && codeSize < 12) {
                        codeSize++; maxCodeVal = (1 << codeSize) - 1;
                    }
                } else {
                    putCode(clearCode, codeSize);
                    dict = {}; nxt = eoiCode + 1;
                    codeSize = minCodeSize + 1; maxCodeVal = (1 << codeSize) - 1;
                }
                cur = nxtIdx;
            }
        }
        putCode(cur, codeSize);
        putCode(eoiCode, codeSize);
        if (nBits > 0) lzwOut.push(bits & 0xFF);

        /* ---- build GIF binary ---- */
        function u16(v) { return [v & 0xFF, (v >> 8) & 0xFF]; }

        var gif = [];
        function pb(byte) { gif.push(byte & 0xFF); }
        function pbs(s) { for (var i = 0; i < s.length; i++) pb(s.charCodeAt(i)); }

        pbs('GIF89a');
        u16(imgW).forEach(pb); u16(imgH).forEach(pb);
        var packed = 0x80 | ((7) << 4) | (colorBits - 1);
        pb(packed); pb(0); pb(0);

        for (i = 0; i < gcSize; i++) {
            pb(palette[i].r); pb(palette[i].g); pb(palette[i].b);
        }

        if (hasTr) {
            pb(0x21); pb(0xF9); pb(4);
            pb(0x01);
            u16(0).forEach(pb);
            pb(trIdx);
            pb(0);
        }

        pb(0x2C);
        u16(0).forEach(pb); u16(0).forEach(pb);
        u16(imgW).forEach(pb); u16(imgH).forEach(pb);
        pb(0x00);

        pb(minCodeSize);
        var pos = 0;
        while (pos < lzwOut.length) {
            var chunk = Math.min(lzwOut.length - pos, 255);
            pb(chunk);
            for (var k = 0; k < chunk; k++) pb(lzwOut[pos++]);
        }
        pb(0);
        pb(0x3B);

        return new Blob([new Uint8Array(gif)], { type: 'image/gif' });
    }

    /* ── TIFF Encoder ──────────────────────────
         Little-endian uncompressed RGB(A) TIFF. */
    function encodeTIFF(canvas) {
        var id = getImageData(canvas);
        var w = canvas.width, h = canvas.height;
        var d = id.data, spp = 3, extra = 0;
        var hasAlpha = false;
        for (var i = 3; i < d.length; i += 4) {
            if (d[i] < 255) { hasAlpha = true; break; }
        }
        if (hasAlpha) { spp = 4; extra = 2; } // unassociated alpha

        var ifdEntries = 0;
        var tags = {};
        function addTag(tag, type, count, val) { tags[tag] = [type, count, val]; ifdEntries++; }

        addTag(256,  3, 1, w);   // ImageWidth
        addTag(257,  3, 1, h);   // ImageLength
        addTag(258,  3, spp, spp === 4 ? [8,8,8,8] : [8,8,8]); // BitsPerSample
        addTag(259,  3, 1, 1);   // Compression (1=none)
        addTag(262,  3, 1, 2);   // PhotometricInterpretation (RGB)
        addTag(273,  4, 1, 0);   // StripOffsets (patched later)
        addTag(277,  3, 1, spp); // SamplesPerPixel
        addTag(278,  3, 1, h);   // RowsPerStrip
        addTag(279,  4, 1, 0);   // StripByteCounts (patched later)
        addTag(282,  5, 1, [72,1]); // XResolution
        addTag(283,  5, 1, [72,1]); // YResolution
        addTag(296,  3, 1, 2);   // ResolutionUnit (inch)
        if (extra) addTag(338, 3, 1, extra); // ExtraSamples

        // Pixel data (uncompressed)
        var stride = w * spp;
        var pixelData = new Uint8Array(stride * h);
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var si = (y * w + x) * 4;
                var di = y * stride + x * spp;
                pixelData[di]     = d[si];
                pixelData[di + 1] = d[si + 1];
                pixelData[di + 2] = d[si + 2];
                if (spp === 4) pixelData[di + 3] = d[si + 3];
            }
        }

        // Patch offsets
        var headerSize = 8;
        var ifdOffset = headerSize;
        var tagDataSize = 2 + ifdEntries * 12 + 4;
        var extraData = [];
        var bitsPerSampleOffset = ifdOffset + tagDataSize;
        var xResOffset = bitsPerSampleOffset + spp * 2;
        var yResOffset = xResOffset + 8;

        function write16(buf, off, v) { buf[off] = v & 0xFF; buf[off+1] = (v>>8) & 0xFF; }
        function write32(buf, off, v) { buf[off]=v & 0xFF; buf[off+1]=(v>>8)&0xFF; buf[off+2]=(v>>16)&0xFF; buf[off+3]=(v>>24)&0xFF; }

        var totalLen = yResOffset + 8 + pixelData.length;
        var buf = new ArrayBuffer(totalLen);
        var b = new Uint8Array(buf);

        // TIFF header (little-endian)
        b[0] = 0x49; b[1] = 0x49; b[2] = 42; b[3] = 0;
        write32(b, 4, ifdOffset);

        // IFD
        write16(b, ifdOffset, ifdEntries);
        var pos = ifdOffset + 2;
        var tagKeys = Object.keys(tags).map(Number).sort(function(a,b){return a-b;});
        var tagOrder = {};
        tagKeys.forEach(function(k, idx) { tagOrder[k] = idx; });

        var dataOffset = ifdOffset + 2 + ifdEntries * 12 + 4;
        var extraPtr = dataOffset;

        tagKeys.forEach(function(tag) {
            var t = tags[tag];
            write16(b, pos, tag);
            write16(b, pos+2, t[0]); // type
            write32(b, pos+4, t[1]); // count
            var val = t[2];
            if (t[0] === 3 && t[1] === 1) {
                write16(b, pos+8, val); write16(b, pos+10, 0);
            }
            else if (t[0] === 4 && t[1] === 1) {
                write32(b, pos+8, val);
            }
            else if (t[0] === 3 && t[1] > 1) {
                var arr = val;
                write32(b, pos+8, extraPtr);
                for (var vi = 0; vi < arr.length; vi++) write16(b, extraPtr + vi*2, arr[vi]);
                extraPtr += arr.length * 2;
            }
            else if (t[0] === 5) {
                write32(b, pos+8, extraPtr);
                write32(b, extraPtr, val[0]); write32(b, extraPtr+4, val[1]);
                extraPtr += 8;
            }
            else if (t[0] === 4 && t[1] > 1) {
                write32(b, pos+8, extraPtr);
                for (vi = 0; vi < t[1]; vi++) write32(b, extraPtr + vi*4, val);
                extraPtr += t[1] * 4;
            }
            pos += 12;
        });

        // next IFD offset = 0
        write32(b, pos, 0);

        // StripOffsets: write value at the position we reserved
        var stripOffset = extraPtr;
        write32(b, ifdOffset + 2 + tagOrder[273] * 12 + 8, stripOffset); // StripOffsets
        write32(b, ifdOffset + 2 + tagOrder[279] * 12 + 8, pixelData.length); // StripByteCounts

        // Pixel data
        for (i = 0; i < pixelData.length; i++) b[stripOffset + i] = pixelData[i];

        return new Blob([buf], { type: 'image/tiff' });
    }

    /* ── ICO Encoder ───────────────────────────
         PNG-compressed entries inside ICO container.
         Processes sizes SEQUENTIALLY — each size creates a fresh canvas,
         draws from the original, waits for toBlob, then moves to the next.
         Returns { icoBlob: Blob, entries: [{size, w, h, blob}] }. */
    function encodeICO(canvas, sizes) {
        if (!sizes || sizes.length === 0) sizes = [32];
        var entries = [];
        var srcW = canvas.width, srcH = canvas.height;
        return new Promise(function(resolve, reject) {
            var idx = 0;
            function next() {
                if (idx >= sizes.length) {
                    entries.sort(function(a,b){ return (a.w*a.h) - (b.w*b.h); });
                    resolve({ icoBlob: buildICO(entries), entries: entries });
                    return;
                }
                var sz = sizes[idx];
                var dstW, dstH;
                if (sz === -1) { dstW = srcW; dstH = srcH; }
                else {
                    var scale = Math.min(sz / srcW, sz / srcH, 1);
                    dstW = Math.round(srcW * scale) || 1;
                    dstH = Math.round(srcH * scale) || 1;
                }
                var c = getCanvas(dstW, dstH);
                var ctx = c.getContext('2d', { alpha: true });
                ctx.clearRect(0, 0, dstW, dstH);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(canvas, 0, 0, dstW, dstH);
                c.toBlob(function(blob) {
                    releaseCanvas(c);
                    if (!blob) { reject(new Error('Failed to encode PNG entry at ' + sz + 'px')); return; }
                    entries.push({ size: sz, w: dstW, h: dstH, blob: blob });
                    idx++;
                    next();
                }, 'image/png');
            }
            next();
        });
    }

    /* ── ICO binary assembly (pure, no async) ─── */
    function buildICO(entries) {
        entries.sort(function(a,b){ return (a.w*a.h) - (b.w*b.h); });
        var offset = 6 + 16 * entries.length;
        var parts = [];
        var header = new ArrayBuffer(6);
        var dv = new DataView(header);
        dv.setUint16(0, 0, true); dv.setUint16(2, 1, true); dv.setUint16(4, entries.length, true);
        parts.push(header);
        entries.forEach(function(entry) {
            var w8 = entry.w >= 256 ? 0 : entry.w;
            var h8 = entry.h >= 256 ? 0 : entry.h;
            var dir = new ArrayBuffer(16);
            var dd = new DataView(dir);
            dd.setUint8(0, w8); dd.setUint8(1, h8); dd.setUint8(2, 0); dd.setUint8(3, 0);
            dd.setUint16(4, 1, true); dd.setUint16(6, 32, true);
            dd.setUint32(8, entry.blob.size, true); dd.setUint32(12, offset, true);
            parts.push(dir); offset += entry.blob.size;
        });
        entries.forEach(function(entry) { parts.push(entry.blob); });
        return new Blob(parts, { type: 'image/x-icon' });
    }

    /* ── ZIP Encoder ──────────────────────────────
         Lightweight ZIP generator (store method, no compression).
         Takes [{name: String, data: Blob}], returns Promise<Blob>. */
    function createZIP(fileList) {
        var crcTable = [];
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            crcTable[n] = c;
        }
        function crc32(buf) {
            var crc = 0xFFFFFFFF;
            for (var i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
            return (crc ^ 0xFFFFFFFF) >>> 0;
        }

        return Promise.all(fileList.map(function(f) { return f.data.arrayBuffer(); })).then(function(buffers) {
            var localOffset = 0;
            var centralParts = [];
            var localParts = [];

            fileList.forEach(function(f, idx) {
                var data = new Uint8Array(buffers[idx]);
                var crc = crc32(data);
                var size = data.length;
                var nameBytes = [];

                for (var i = 0; i < f.name.length; i++) {
                    var cc = f.name.charCodeAt(i);
                    if (cc < 128) nameBytes.push(cc);
                    else { nameBytes.push(0xC0 | (cc >> 6)); nameBytes.push(0x80 | (cc & 0x3F)); }
                }

                var nameLen = nameBytes.length;

                // Local file header
                var local = new ArrayBuffer(30 + nameLen + size);
                var lv = new DataView(local);
                lv.setUint32(0, 0x04034b50, true); // signature
                lv.setUint16(4, 20, true); // version needed
                lv.setUint16(6, 0, true);  // flags
                lv.setUint16(8, 0, true);  // method: stored
                lv.setUint16(10, 0, true); // mod time
                lv.setUint16(12, 0, true); // mod date
                lv.setUint32(14, crc, true);
                lv.setUint32(18, size, true); // compressed size
                lv.setUint32(22, size, true); // uncompressed size
                lv.setUint16(26, nameLen, true);
                lv.setUint16(28, 0, true); // extra field length

                var localBytes = new Uint8Array(local);
                for (i = 0; i < nameLen; i++) localBytes[30 + i] = nameBytes[i];
                for (i = 0; i < size; i++) localBytes[30 + nameLen + i] = data[i];
                localParts.push(localBytes);

                // Central directory entry
                var central = new ArrayBuffer(46 + nameLen);
                var cv = new DataView(central);
                cv.setUint32(0, 0x02014b50, true);
                cv.setUint16(4, 20, true);
                cv.setUint16(6, 20, true);
                cv.setUint16(8, 0, true);
                cv.setUint16(10, 0, true);
                cv.setUint16(12, 0, true);
                cv.setUint16(14, 0, true);
                cv.setUint32(16, crc, true);
                cv.setUint32(20, size, true);
                cv.setUint32(24, size, true);
                cv.setUint16(28, nameLen, true);
                cv.setUint16(30, 0, true);
                cv.setUint16(32, 0, true);
                cv.setUint16(34, 0, true);
                cv.setUint16(36, 0, true);
                cv.setUint32(38, 0, true);
                cv.setUint32(42, localOffset, true);

                var centralBytes = new Uint8Array(central);
                for (i = 0; i < nameLen; i++) centralBytes[46 + i] = nameBytes[i];
                centralParts.push(centralBytes);

                localOffset += 30 + nameLen + size;
            });

            // End of central directory
            var centralTotalSize = 0;
            centralParts.forEach(function(p) { centralTotalSize += p.length; });

            var eocd = new ArrayBuffer(22);
            var ev = new DataView(eocd);
            ev.setUint32(0, 0x06054b50, true);
            ev.setUint16(4, 0, true);
            ev.setUint16(6, 0, true);
            ev.setUint16(8, fileList.length, true);
            ev.setUint16(10, fileList.length, true);
            ev.setUint32(12, centralTotalSize, true);
            ev.setUint32(16, localOffset, true);
            ev.setUint16(20, 0, true);

            var result = [];
            localParts.forEach(function(p) { result.push(p); });
            centralParts.forEach(function(p) { result.push(p); });
            result.push(new Uint8Array(eocd));

            return new Blob(result, { type: 'application/zip' });
        });
    }

    /* ── Init ─────────────────────────────────── */
    function init() {
        el.fileInput.addEventListener('change', handleFileSelect);
        el.qualitySlider.addEventListener('input', handleQualityChange);
        el.outputFormat.addEventListener('change', onFormatChange);
        if (el.bgColor) el.bgColor.addEventListener('input', schedulePreviewUpdate);
        el.convertBtn.addEventListener('click', convertImages);
        el.resetBtn.addEventListener('click', resetTool);

        el.dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            el.dropZone.classList.add('dragover');
        });
        el.dropZone.addEventListener('dragleave', function() {
            el.dropZone.classList.remove('dragover');
        });
        el.dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            el.dropZone.classList.remove('dragover');
            var files = e.dataTransfer.files;
            if (files.length === 0) return;
            el.fileInput.files = files;
            handleFileSelect({ target: { files: files } });
        });

        detectWebPSupport();
        detectAVIFSupport();
    }

    function onFormatChange() {
        var fmtKey = el.outputFormat.value;
        var info = fmt(fmtKey);
        // Toggle ICO size options
        if (el.icoOptions) {
            el.icoOptions.style.display = (fmtKey === 'ico') ? 'block' : 'none';
        }
        // Disable quality slider for lossless formats where it's meaningless
        // (quality still applies to native encoders, but for custom encoders it's fixed)
        schedulePreviewUpdate();
    }

    /* ── Event handlers ──────────────────────── */
    function handleQualityChange() {
        var val = parseInt(el.qualitySlider.value);
        el.qualityValue.textContent = val + '%';
        el.qualityDisplay.textContent = val + '%';
        el.qualityFill.style.width = val + '%';
        schedulePreviewUpdate();
    }

    function schedulePreviewUpdate() {
        if (previewScheduleTimer) clearTimeout(previewScheduleTimer);
        previewScheduleTimer = setTimeout(updateConvertedPreview, 150);
    }

    function handleFileSelect(e) {
        var files = e.target.files;
        if (!files || files.length === 0) return;
        state.files = Array.from(files).filter(function(f) { return f.type.startsWith('image/'); });
        if (state.files.length === 0) {
            showToast('Please select image files', 'error'); return;
        }
        el.convertBtn.disabled = false;
        el.settingsCard.style.display = 'block';

        var first = state.files[0];
        var reader = new FileReader();
        reader.onload = function(ev) {
            var img = new Image();
            img.onload = function() {
                el.previewOriginal.src = ev.target.result;
                el.originalDimensions.textContent = img.width + ' \u00D7 ' + img.height + ' px';
                el.originalSize.textContent = formatSize(first.size);
                el.originalFormat.textContent = first.type.split('/')[1].toUpperCase();
                el.previewSection.style.display = 'block';
                updateConvertedPreview();
            };
            img.onerror = function() { showToast('Failed to load preview image', 'error'); };
            img.src = ev.target.result;
        };
        reader.onerror = function() { showToast('Failed to read file', 'error'); };
        reader.readAsDataURL(first);
    }

    /* ── Preview ──────────────────────────────── */
    function updateConvertedPreview() {
        if (!el.previewOriginal.src) return;
        var quality = parseInt(el.qualitySlider.value) / 100;
        var formatKey = el.outputFormat.value;
        var info = fmt(formatKey);
        var mimeType = info.mime;
        var ext = info.ext;

        var img = new Image();
        img.onload = function() {
            var canvas = el.previewCanvas;
            var alpha = info.alpha;
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d', { alpha: alpha });

            if (!alpha) {
                ctx.fillStyle = el.bgColor ? el.bgColor.value : '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0);

            el.convertedDimensions.textContent = img.width + ' \u00D7 ' + img.height + ' px';
            el.convertedFormat.textContent = ext.toUpperCase();

            if (info.native) {
                canvas.toBlob(function(blob) {
                    el.convertedSize.textContent = blob ? formatSize(blob.size) : 'N/A';
                }, mimeType, quality);
            } else {
                el.convertedSize.textContent = '(see after conversion)';
            }
        };
        img.src = el.previewOriginal.src;
    }

    /* ── Batch conversion ────────────────────── */
    async function convertImages() {
        if (state.files.length === 0) {
            showToast('Please select images first', 'error'); return;
        }

        var formatKey = el.outputFormat.value;
        var info = fmt(formatKey);

        if (!(await checkFormatSupport(formatKey))) {
            showToast(formatKey.toUpperCase() + ' is not supported by your browser.', 'error'); return;
        }

        el.progressArea.style.display = 'block';
        el.convertBtn.disabled = true;
        cleanupResults();
        state.results = [];

        var quality = parseInt(el.qualitySlider.value) / 100;
        var mimeType = info.mime;
        var ext = info.ext;
        var bgColor = el.bgColor ? el.bgColor.value : '#ffffff';
        var options = {
            preserveMetadata: el.preserveMetadata.checked,
            optimizePng: el.optimizePng.checked,
            progressiveJpeg: el.progressiveJpeg.checked
        };
        var processed = 0;
        var hasErrors = false;

        for (var i = 0; i < state.files.length; i++) {
            var file = state.files[i];
            try {
                var pct = Math.round((processed / state.files.length) * 100);
                el.progressText.textContent = 'Converting: ' + file.name;
                el.progressPercent.textContent = pct + '%';
                el.progressFill.style.width = pct + '%';

                var result = await convertSingleImage(file, quality, mimeType, ext, bgColor, options, formatKey);
                state.results.push(result);
                el.previewCanvas.width = 0;
                el.previewCanvas.height = 0;

                if (i > 0 && state.results[i - 1]) {
                    var prevObjUrl = state.objectUrls[state.objectUrls.length - 2];
                    if (prevObjUrl) URL.revokeObjectURL(prevObjUrl);
                }

                processed++;
                pct = Math.round((processed / state.files.length) * 100);
                el.progressPercent.textContent = pct + '%';
                el.progressFill.style.width = pct + '%';

                if (i % 5 === 4) await new Promise(function(r) { setTimeout(r, 0); });
            } catch (err) {
                hasErrors = true;
                showToast('Failed: ' + file.name + ' - ' + err.message, 'error');
                processed++;
                pct = Math.round((processed / state.files.length) * 100);
                el.progressPercent.textContent = pct + '%';
                el.progressFill.style.width = pct + '%';
            }
        }

        el.progressArea.style.display = 'none';
        el.convertBtn.disabled = false;

        if (state.results.length > 0) {
            displayResults();
            var msg = 'Converted ' + state.results.length + ' image' + (state.results.length > 1 ? 's' : '');
            if (hasErrors) msg += ' (with some errors)';
            showToast(msg, 'success');
        } else if (!hasErrors) {
            showToast('No images were converted', 'info');
        }
    }

    /* ── Single-image conversion ──────────────── */
    function convertSingleImage(file, quality, mimeType, ext, bgColor, options, formatKey) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var limitMsg = checkCanvasLimit(img.width, img.height);
                    if (limitMsg) { reject(new Error(limitMsg)); return; }

                    var info = fmt(formatKey);
                    var alpha = info.alpha;
                    var canvas = getCanvas(img.width, img.height);
                    var ctx = canvas.getContext('2d', { alpha: alpha });

                    if (!alpha) {
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    } else {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0);

                    function resolveResult(blob) {
                        releaseCanvas(canvas);
                        if (!blob) {
                            reject(new Error('Browser could not encode the image.'));
                            return;
                        }
                        var url = URL.createObjectURL(blob);
                        state.objectUrls.push(url);
                        resolve({
                            blob: blob,
                            originalName: file.name,
                            originalSize: file.size,
                            convertedSize: blob.size,
                            sizeChange: ((blob.size - file.size) / file.size * 100).toFixed(1),
                            width: img.width,
                            height: img.height,
                            extension: ext,
                            mimeType: mimeType,
                            url: url
                        });
                    }

                    /* ── Native (toBlob) encoders ── */
                    if (info.native) {
                        function doNativeExport() {
                            canvas.toBlob(function(blob) {
                                resolveResult(blob);
                            }, mimeType, quality);
                        }

                        if (mimeType === 'image/avif' && features.avif === null) {
                            var tc = getCanvas(1, 1);
                            var tctx = tc.getContext('2d');
                            tctx.fillStyle = 'red'; tctx.fillRect(0, 0, 1, 1);
                            tc.toBlob(function(blob) {
                                releaseCanvas(tc);
                                if (!blob) { features.avif = false; reject(new Error('AVIF is not supported by your browser.')); return; }
                                features.avif = true;
                                doNativeExport();
                            }, 'image/avif');
                            return;
                        }
                        doNativeExport();
                        return;
                    }

                    /* ── Custom encoders ── */
                    if (formatKey === 'gif') {
                        try {
                            var blob = encodeGIF(canvas);
                            resolveResult(blob);
                        } catch(ex) {
                            reject(new Error('GIF encoding failed: ' + (ex.message || 'unknown error')));
                        }
                        return;
                    }

                    if (formatKey === 'tiff') {
                        try {
                            var blob = encodeTIFF(canvas);
                            resolveResult(blob);
                        } catch(ex) {
                            reject(new Error('TIFF encoding failed: ' + (ex.message || 'unknown error')));
                        }
                        return;
                    }

                    if (formatKey === 'ico') {
                        var icoSizes = getSelectedIcoSizes(img.width, img.height);
                        if (!icoSizes || icoSizes.length === 0) {
                            reject(new Error('Please select at least one ICO size.'));
                            return;
                        }
                        encodeICO(canvas, icoSizes).then(function(icoResult) {
                            var isMulti = icoSizes.length > 1;
                            function doResolve(res) {
                                releaseCanvas(canvas);
                                resolve(res);
                            }
                            if (isMulti) {
                                var zipFiles = [{ name: 'favicon.ico', data: icoResult.icoBlob }];
                                icoResult.entries.forEach(function(entry) {
                                    var isOrig = entry.w === img.width && entry.h === img.height;
                                    zipFiles.push({
                                        name: isOrig ? 'favicon-original.ico' : 'favicon-' + entry.w + 'x' + entry.h + '.ico',
                                        data: buildICO([entry])
                                    });
                                });
                                createZIP(zipFiles).then(function(zipBlob) {
                                    var url = URL.createObjectURL(zipBlob);
                                    state.objectUrls.push(url);
                                    doResolve({
                                        blob: zipBlob,
                                        originalName: file.name,
                                        originalSize: file.size,
                                        convertedSize: zipBlob.size,
                                        sizeChange: ((zipBlob.size - file.size) / file.size * 100).toFixed(1),
                                        width: img.width,
                                        height: img.height,
                                        extension: 'zip',
                                        mimeType: 'application/zip',
                                        url: url,
                                        icoData: icoResult
                                    });
                                }).catch(function(zipErr) {
                                    releaseCanvas(canvas);
                                    reject(new Error('ZIP creation failed: ' + (zipErr.message || 'unknown error')));
                                });
                            } else {
                                var b = icoResult.icoBlob;
                                var url = URL.createObjectURL(b);
                                state.objectUrls.push(url);
                                doResolve({
                                    blob: b,
                                    originalName: file.name,
                                    originalSize: file.size,
                                    convertedSize: b.size,
                                    sizeChange: ((b.size - file.size) / file.size * 100).toFixed(1),
                                    width: img.width,
                                    height: img.height,
                                    extension: 'ico',
                                    mimeType: 'image/x-icon',
                                    url: url,
                                    icoData: icoResult
                                });
                            }
                        }).catch(function(err) {
                            releaseCanvas(canvas);
                            reject(new Error('ICO encoding failed: ' + (err.message || 'unknown error')));
                        });
                        return;
                    }

                    reject(new Error('Unsupported format: ' + formatKey));
                };
                img.onerror = function() { reject(new Error('Failed to load image - file may be corrupted or unsupported.')); };
                img.src = e.target.result;
            };
            reader.onerror = function() { reject(new Error('Failed to read file.')); };
            reader.readAsDataURL(file);
        });
    }

    function getSelectedIcoSizes(imgW, imgH) {
        var checkboxes = document.querySelectorAll('.ico-size');
        var sizes = [];
        checkboxes.forEach(function(cb) {
            if (!cb.checked) return;
            if (cb.value === 'original') { sizes.push(-1); return; }
            sizes.push(parseInt(cb.value));
        });
        return sizes;
    }

    /* ── Results display ──────────────────────── */
    function displayResults() {
        var html = '';

        state.results.forEach(function(result) {
            var change = parseFloat(result.sizeChange);
            var changeText = change > 0 ? '+' + change + '%' : change + '%';
            var changeColor = change <= 0 ? '#16a34a' : '#64748b';
            var origName = result.originalName;
            var newName = (result.extension === 'zip') ? 'favicon-package.zip' : (result.extension === 'ico' ? 'favicon.ico' : origName.replace(/\.[^/.]+$/, '') + '.' + result.extension);
            var formatLabel = (result.extension === 'zip') ? 'ICO Package (ZIP)' : result.extension.toUpperCase();

            html += '<div class="result-item" style="margin-bottom:16px;padding:16px;border:1px solid #e2e8f0;border-radius:12px">';
            html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">';
            html += '<img src="' + result.url + '" alt="Converted" style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0">';
            html += '<div style="flex:1">';
            html += '<div style="font-weight:600;margin-bottom:4px">' + origName.replace(/</g,'&lt;').replace(/>/g,'&gt;') + ' \u2192 ' + newName.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
            html += '<div style="font-size:13px;color:#64748b">' + result.width + ' \u00D7 ' + result.height + ' px \u00B7 ' + formatLabel + '</div>';
            html += '</div>';
            html += '<a href="' + result.url + '" download="' + newName.replace(/"/g,'&quot;') + '" style="white-space:nowrap;flex-shrink:0;padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .2s">Download</a>';
            html += '</div>';
            html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:13px">';
            html += '<div style="text-align:center"><div style="font-weight:600">Original</div><div style="color:#64748b">' + formatSize(result.originalSize) + '</div></div>';
            html += '<div style="text-align:center"><div style="font-weight:600">Converted</div><div style="color:#2563eb">' + formatSize(result.convertedSize) + '</div></div>';
            html += '<div style="text-align:center"><div style="font-weight:600">Change</div><div style="color:' + changeColor + '">' + changeText + '</div></div>';
            html += '</div></div>';
        });

        el.resultsContent.innerHTML = html;
        el.resultsArea.style.display = 'block';
        el.resultsArea.scrollIntoView({ behavior: 'smooth' });

        el.successText.textContent = state.results.length + ' image' + (state.results.length > 1 ? 's' : '') + ' converted successfully!';
        el.successInfo.textContent = 'All files are ready to download';
    }

    /* ── Cleanup & reset ──────────────────────── */
    function cleanupResults() {
        state.objectUrls.forEach(function(url) { URL.revokeObjectURL(url); });
        state.objectUrls = [];
        state.results.forEach(function(r) { if (r.blob) r.blob = null; });
    }

    function resetTool() {
        cleanupResults();
        el.fileInput.value = '';
        state.files = [];
        state.results = [];
        el.convertBtn.disabled = true;
        el.settingsCard.style.display = 'none';
        el.previewSection.style.display = 'none';
        el.progressArea.style.display = 'none';
        el.resultsArea.style.display = 'none';
        el.resultsContent.innerHTML = '';
        el.previewOriginal.src = '';
        el.previewCanvas.width = 0;
        el.previewCanvas.height = 0;
        showToast('Tool reset', 'info');
    }

    /* ── Helpers ──────────────────────────────── */
    function formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        var u = ['Bytes', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i >= u.length) i = u.length - 1;
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + u[i];
    }

    function showToast(msg, type) {
        var existing = document.querySelector('.ifc-toast');
        if (existing) existing.remove();
        var n = document.createElement('div');
        n.className = 'ifc-toast';
        n.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:12px 24px;background:' + (type === 'error' ? '#dc2626' : '#0f172a') + ';color:#fff;border-radius:8px;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15);animation:ifc-slide .3s ease;max-width:90vw;text-align:center';
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(function() {
            n.style.opacity = '0';
            n.style.transition = 'opacity .3s';
            setTimeout(function() { if (n.parentNode) n.parentNode.removeChild(n); }, 300);
        }, 4000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
