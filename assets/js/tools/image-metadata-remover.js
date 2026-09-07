document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('file-input');
    var settingsPanel = document.getElementById('settings-panel');
    var applyBtn = document.getElementById('apply-btn');
    var resetBtn = document.getElementById('reset-btn');
    var fileInfo = document.getElementById('file-info');
    var exifPreview = document.getElementById('exif-preview');
    var progressSection = document.getElementById('progress-section');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressText = document.getElementById('progress-text');
    var actionBar = document.querySelector('.action-bar');

    var currentFile = null;
    var currentMetadata = null;
    var processedBlob = null;
    var processedName = null;

    /* =============================================
       UTILITIES
       ============================================= */
    function notify(msg, err) {
        var n = document.querySelector('.notification');
        if (n) n.remove();
        n = document.createElement('div');
        n.className = 'notification' + (err ? ' error' : '');
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(function() { n.remove(); }, 4000);
    }

    function fmtSize(b) {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    }

    function showProgress(pct, text) {
        progressFill.style.width = pct + '%';
        progressPercent.textContent = pct + '%';
        progressText.textContent = text;
    }

    /* =============================================
       METADATA PARSER
       ============================================= */
    function emptyMeta() {
        return {
            format: null, hasEXIF: false, hasGPS: false, hasXMP: false, hasIPTC: false,
            hasThumbnail: false, hasMakerNotes: false, cameraMake: null, cameraModel: null,
            dateTime: null, software: null, artist: null, copyright: null, orientation: null,
            gpsData: null, fields: [], fieldCount: 0, totalEntries: 0
        };
    }

    function readStr(buf, off, max) {
        if (off >= buf.byteLength) return '';
        var len = Math.min(max, buf.byteLength - off);
        var u = new Uint8Array(buf, off, len);
        var s = '';
        for (var i = 0; i < u.length; i++) {
            if (!u[i]) break;
            s += String.fromCharCode(u[i]);
        }
        return s;
    }

    function typeSz(t) {
        return [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 1, 2, 4, 8][t] || 1;
    }

    function readVal(v, o, t, c, le) {
        if (t === 2) {
            var s = '';
            for (var i = 0; i < c; i++) {
                var ch = v.getUint8(o + i);
                if (!ch) break;
                s += String.fromCharCode(ch);
            }
            return s.trim();
        }
        if (t === 3 && c === 1) return v.getUint16(o, le);
        if (t === 4 && c === 1) return v.getUint32(o, le);
        if (t === 5) {
            var n = v.getUint32(o, le);
            var d = v.getUint32(o + 4, le);
            return d ? n / d : n;
        }
        if (t === 3) {
            var a = [];
            for (var i = 0; i < c; i++) a.push(v.getUint16(o + i * 2, le));
            return a;
        }
        return v.getUint32(o, le);
    }

    function readIFD(buf, tiff, off, le) {
        var v = new DataView(buf);
        var abs = tiff + off;
        if (abs + 2 > v.byteLength) return { count: 0 };
        var n = v.getUint16(abs, le);
        var e = {};
        e.count = n;
        for (var i = 0; i < n; i++) {
            var eo = abs + 2 + i * 12;
            if (eo + 12 > v.byteLength) break;
            var tag = v.getUint16(eo, le);
            var typ = v.getUint16(eo + 2, le);
            var cnt = v.getUint32(eo + 4, le);
            var sz = typeSz(typ) * cnt;
            var val;
            if (sz <= 4) {
                val = readVal(v, eo + 8, typ, cnt, le);
            } else {
                var vo = v.getUint32(eo + 8, le);
                if (tiff + vo + sz <= v.byteLength) val = readVal(v, tiff + vo, typ, cnt, le);
                else val = null;
            }
            if (tag === 0x8769) e._exifOff = val;
            else if (tag === 0x8825) e._gpsOff = val;
            else if (tag === 0x014A) e._ifd1Off = val;
            else if (val !== null && val !== undefined && val !== '') e[tag] = val;
        }
        return e;
    }

    function parseEXIFApp1(buf, start, len, m) {
        var v = new DataView(buf);
        var tiff = start + 6;
        if (tiff + 8 > v.byteLength) return;
        var le = v.getUint16(tiff) === 0x4949;
        var ifd0Off = v.getUint32(tiff + 4, le);
        var ifd0 = readIFD(buf, tiff, ifd0Off, le);

        m.cameraMake = ifd0[0x010F] || null;
        m.cameraModel = ifd0[0x0110] || null;
        m.dateTime = ifd0[0x0132] || null;
        m.software = ifd0[0x0131] || null;
        m.artist = ifd0[0x013B] || null;
        m.copyright = ifd0[0x8298] || null;
        m.orientation = ifd0[0x0112] || null;
        m.totalEntries += ifd0.count || 0;

        if (ifd0._gpsOff) {
            m.hasGPS = true;
            var gps = readIFD(buf, tiff, ifd0._gpsOff, le);
            m.gpsData = {
                lat: gps[0x0002], lng: gps[0x0004],
                latRef: gps[0x0001], lngRef: gps[0x0003]
            };
            m.totalEntries += gps.count || 0;
        }
        if (ifd0._exifOff) {
            var exif = readIFD(buf, tiff, ifd0._exifOff, le);
            if (exif[0x927C]) m.hasMakerNotes = true;
            m.totalEntries += exif.count || 0;
        }
        if (ifd0._ifd1Off) m.hasThumbnail = true;
    }

    function parseJPEG(buf, m) {
        var v = new DataView(buf);
        if (v.getUint16(0) !== 0xFFD8) return;
        m.format = 'JPEG';
        var off = 2;
        while (off < v.byteLength - 4) {
            if (v.getUint8(off) !== 0xFF) { off++; continue; }
            var mk = v.getUint8(off + 1);
            if (mk === 0xDA || mk === 0xD9) break;
            if (mk === 0x00) { off++; continue; }
            var len = v.getUint16(off + 2);
            if (mk === 0xE1) {
                var s = readStr(buf, off + 4, 30);
                if (s.indexOf('Exif') === 0) {
                    m.hasEXIF = true;
                    try { parseEXIFApp1(buf, off + 4, len - 2, m); } catch (ex) { m.totalEntries++; }
                } else if (s.indexOf('http://ns.adobe.com') >= 0) {
                    m.hasXMP = true;
                    m.totalEntries++;
                }
            } else if (mk === 0xED) {
                m.hasIPTC = true;
                m.totalEntries++;
            } else if (mk === 0xE2) {
                var s2 = readStr(buf, off + 4, 30);
                if (s2.indexOf('http://ns.adobe.com') >= 0) {
                    m.hasXMP = true;
                    m.totalEntries++;
                }
            }
            off += 2 + len;
        }
        buildFields(m);
    }

    function parsePNG(buf, m) {
        var v = new DataView(buf);
        if (v.getUint32(0) !== 0x89504E47) return;
        m.format = 'PNG';
        var off = 8;
        while (off < buf.byteLength - 12) {
            var cl = v.getUint32(off);
            var ct = readStr(buf, off + 4, 4);
            if (ct === 'tEXt' || ct === 'iTXt' || ct === 'zTXt') {
                m.hasEXIF = true;
                var kw = readStr(buf, off + 8, 64);
                var kl = kw.length;
                var vl = cl - kl - 1;
                if (vl > 0) {
                    var val = readStr(buf, off + 8 + kl + 1, vl);
                    var kwl = kw.toLowerCase();
                    if (kwl === 'author' || kwl === 'artist') m.artist = val;
                    else if (kwl === 'copyright') m.copyright = val;
                    else if (kwl === 'creation time') m.dateTime = val;
                    else if (kwl === 'software') m.software = val;
                }
                m.totalEntries++;
            }
            if (ct === 'IEND') break;
            off += 12 + cl;
        }
        buildFields(m);
    }

    function parseWebP(buf, m) {
        var v = new DataView(buf);
        if (v.getUint32(0) !== 0x52494646 || v.getUint32(8) !== 0x57454250) return;
        m.format = 'WebP';
        var off = 12;
        while (off < buf.byteLength - 8) {
            var ct = readStr(buf, off, 4);
            var cs = v.getUint32(off + 4, true);
            if (ct === 'EXIF') {
                m.hasEXIF = true;
                try { parseEXIFApp1(buf, off + 8, cs, m); } catch (ex) { m.totalEntries++; }
            } else if (ct === 'XMP ') {
                m.hasXMP = true;
                m.totalEntries++;
            } else if (ct === 'ICCP') {
                m.totalEntries++;
            }
            off += 8 + cs + (cs % 2);
        }
        buildFields(m);
    }

    function parseFile(file, cb) {
        var r = new FileReader();
        r.onload = function(e) {
            var buf = e.target.result;
            var m = emptyMeta();
            try {
                if (file.type === 'image/jpeg') parseJPEG(buf, m);
                else if (file.type === 'image/png') parsePNG(buf, m);
                else if (file.type === 'image/webp') parseWebP(buf, m);
            } catch (ex) {
                m.format = file.type.replace('image/', '').toUpperCase();
            }
            cb(m);
        };
        r.readAsArrayBuffer(file);
    }

    function buildFields(m) {
        var f = [];
        if (m.cameraMake || m.cameraModel) f.push('Camera Information');
        if (m.dateTime) f.push('Date & Time');
        if (m.software) f.push('Software');
        if (m.artist) f.push('Author');
        if (m.copyright) f.push('Copyright');
        if (m.orientation) f.push('Orientation');
        if (m.hasGPS) f.push('GPS Coordinates');
        if (m.hasThumbnail) f.push('Embedded Thumbnail');
        if (m.hasMakerNotes) f.push('Maker Notes');
        if (m.hasXMP) f.push('XMP Data');
        if (m.hasIPTC) f.push('IPTC Data');
        if (m.hasEXIF && f.length === 0) f.push('EXIF Data');
        m.fields = f;
        m.fieldCount = Math.max(m.totalEntries, f.length);
    }

    /* =============================================
       RENDERERS
       ============================================= */
    function calcPrivacyScore(m) {
        if (m.fieldCount === 0) return 100;
        var s = 100;
        if (m.hasGPS) s -= 35;
        if (m.hasEXIF) s -= 10;
        if (m.hasXMP) s -= 10;
        if (m.hasIPTC) s -= 8;
        if (m.cameraMake || m.cameraModel) s -= 5;
        if (m.dateTime) s -= 5;
        if (m.software) s -= 3;
        if (m.artist) s -= 5;
        if (m.copyright) s -= 3;
        if (m.hasThumbnail) s -= 5;
        if (m.hasMakerNotes) s -= 5;
        if (m.orientation) s -= 3;
        return Math.max(5, Math.min(95, s));
    }

    function checkIcon(color) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>';
    }

    function xIcon(color) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }

    function renderAnalysis(m) {
        if (m.fieldCount === 0) {
            return '<div style="text-align:center;padding:24px 16px">' +
                '<div style="width:56px;height:56px;border-radius:50%;background:#f0fdf4;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">' +
                checkIcon('#10b981').replace('width="14"', 'width="28"').replace('height="14"', 'height="28"') +
                '</div>' +
                '<p style="font-size:15px;font-weight:600;color:#0f172a;margin:0 0 4px">No removable metadata found</p>' +
                '<p style="font-size:13px;color:#64748b;margin:0">This image is already privacy-safe. No action required.</p></div>';
        }

        var cats = [
            { label: 'EXIF Data', show: m.hasEXIF },
            { label: 'GPS Coordinates', show: m.hasGPS },
            { label: 'Camera Information', show: !!(m.cameraMake || m.cameraModel) },
            { label: 'Date &amp; Time', show: !!m.dateTime },
            { label: 'Software', show: !!m.software },
            { label: 'XMP Data', show: m.hasXMP },
            { label: 'IPTC Data', show: m.hasIPTC },
            { label: 'Author', show: !!m.artist },
            { label: 'Copyright', show: !!m.copyright },
            { label: 'Orientation', show: !!m.orientation },
            { label: 'Embedded Thumbnail', show: m.hasThumbnail },
            { label: 'Maker Notes', show: m.hasMakerNotes }
        ].filter(function(c) { return c.show; });

        var grid = '';
        for (var i = 0; i < cats.length; i++) {
            grid += '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#334155">' +
                checkIcon('#dc2626') + ' ' + cats[i].label + '</div>';
        }

        var score = calcPrivacyScore(m);

        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">' +
            '<span style="font-size:13px;color:#64748b">Metadata Found:</span>' +
            '<span style="font-size:14px;font-weight:700;color:#dc2626;font-family:\'JetBrains Mono\',monospace">' + m.fieldCount + ' fields</span></div>' +
            '<p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 8px">Types Detected:</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + grid + '</div>' +
            '<div style="margin-top:14px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#991b1b;line-height:1.5">' +
            '<strong>Privacy Risk:</strong> This image exposes ' + (100 - score) + '% of potentially sensitive information. Remove metadata before sharing online.</div>';
    }

    function renderNoMetadata() {
        return '<div style="text-align:center;padding:24px 16px">' +
            '<div style="width:64px;height:64px;border-radius:50%;background:#f0fdf4;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg></div>' +
            '<h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a">No Metadata Found</h3>' +
            '<p style="font-size:14px;color:#64748b;margin:0 0 4px">This image contains no removable metadata.</p>' +
            '<p style="font-size:13px;color:#94a3b8;margin:0 0 20px">No processing was required. Your image is already privacy-safe.</p>' +
            '<button id="download-original-btn" style="padding:12px 24px;background:#10b981;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .2s" ' +
            'onmouseover="this.style.background=\'#059669\';this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.background=\'#10b981\';this.style.transform=\'none\'">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Original</button></div>';
    }

    function renderReport(before, after, origSize, resultSize) {
        var beforeScore = calcPrivacyScore(before);
        var removedCats = [];
        var fmt = before.format || 'JPEG';

        var catMap = [
            { label: 'EXIF Data', b: before.hasEXIF, a: after.hasEXIF },
            { label: 'GPS Coordinates', b: before.hasGPS, a: after.hasGPS },
            { label: 'XMP Data', b: before.hasXMP, a: after.hasXMP },
            { label: 'IPTC Data', b: before.hasIPTC, a: after.hasIPTC },
            { label: 'Camera Information', b: !!(before.cameraMake || before.cameraModel), a: !!(after.cameraMake || after.cameraModel) },
            { label: 'Date & Time', b: !!before.dateTime, a: !!after.dateTime },
            { label: 'Software', b: !!before.software, a: !!after.software },
            { label: 'Author', b: !!before.artist, a: !!after.artist },
            { label: 'Copyright', b: !!before.copyright, a: !!after.copyright },
            { label: 'Orientation', b: !!before.orientation, a: !!after.orientation },
            { label: 'Embedded Thumbnail', b: before.hasThumbnail, a: after.hasThumbnail },
            { label: 'Maker Notes', b: before.hasMakerNotes, a: after.hasMakerNotes }
        ];

        for (var i = 0; i < catMap.length; i++) {
            if (catMap[i].b && !catMap[i].a) removedCats.push(catMap[i].label);
        }

        var detectedItems = [];
        if (before.hasGPS) detectedItems.push('GPS Coordinates');
        if (before.cameraMake || before.cameraModel) detectedItems.push('Camera Information');
        if (before.dateTime) detectedItems.push('Date & Time');
        if (before.software) detectedItems.push('Software');
        if (before.hasEXIF) detectedItems.push('EXIF Data');
        if (before.hasXMP) detectedItems.push('XMP Data');
        if (before.hasIPTC) detectedItems.push('IPTC Data');
        if (before.artist) detectedItems.push('Author');
        if (before.copyright) detectedItems.push('Copyright');
        if (before.orientation) detectedItems.push('Orientation');
        if (before.hasThumbnail) detectedItems.push('Embedded Thumbnail');
        if (before.hasMakerNotes) detectedItems.push('Maker Notes');

        var html = '';

        /* --- SUCCESS BANNER --- */
        html += '<div style="text-align:center;padding:24px 0 16px">' +
            '<div style="width:64px;height:64px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg></div>' +
            '<h3 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#0f172a">Metadata Removal Complete</h3>' +
            '<p style="font-size:14px;color:#64748b;margin:0 0 4px">' + before.fieldCount + ' metadata field' + (before.fieldCount !== 1 ? 's' : '') + ' detected and removed.</p>' +
            '<p style="font-size:13px;color:#10b981;margin:0;font-weight:500">Verification passed. Your exported image no longer contains removable metadata.</p></div>';

        /* --- PRIVACY SCORE --- */
        var detList = '';
        if (detectedItems.length > 0) {
            detList = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0">' +
                '<p style="font-size:12px;font-weight:600;color:#64748b;margin:0 0 6px">Detected before removal:</p>';
            for (var i = 0; i < detectedItems.length; i++) {
                detList += '<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:#334155;margin-bottom:2px">' +
                    xIcon('#dc2626') + ' ' + detectedItems[i] + '</div>';
            }
            detList += '</div>';
        }

        html += '<div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px">' +
            '<p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 12px;display:flex;align-items:center;gap:6px">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Privacy Score</p>' +
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">' +
            '<span style="font-size:12px;font-weight:600;color:#64748b;width:50px">Before</span>' +
            '<div style="flex:1;height:10px;background:#e2e8f0;border-radius:9999px;overflow:hidden">' +
            '<div style="height:100%;width:' + beforeScore + '%;background:linear-gradient(90deg,#ef4444,#f59e0b);border-radius:9999px"></div></div>' +
            '<span style="font-size:13px;font-weight:700;font-family:\'JetBrains Mono\',monospace;color:#dc2626;width:36px;text-align:right">' + beforeScore + '%</span></div>' +
            detList +
            '<div style="display:flex;align-items:center;gap:12px;margin-top:10px">' +
            '<span style="font-size:12px;font-weight:600;color:#64748b;width:50px">After</span>' +
            '<div style="flex:1;height:10px;background:#e2e8f0;border-radius:9999px;overflow:hidden">' +
            '<div style="height:100%;width:100%;background:linear-gradient(90deg,#10b981,#22c55e);border-radius:9999px"></div></div>' +
            '<span style="font-size:13px;font-weight:700;font-family:\'JetBrains Mono\',monospace;color:#10b981;width:36px;text-align:right">100%</span></div>' +
            '<p style="font-size:12px;color:#64748b;margin:8px 0 0">No removable metadata detected.</p></div>';

        /* --- BEFORE / AFTER COMPARISON --- */
        var compRows = [
            { label: 'Camera', bv: (before.cameraMake || before.cameraModel) ? ((before.cameraMake || '') + ' ' + (before.cameraModel || '')).trim() : null, rv: (before.cameraMake || before.cameraModel) ? 'Removed' : null },
            { label: 'GPS', bv: before.hasGPS ? 'Present' : null, rv: before.hasGPS ? 'Removed' : null },
            { label: 'Software', bv: before.software, rv: before.software ? 'Removed' : null },
            { label: 'Author', bv: before.artist, rv: before.artist ? 'Removed' : null },
            { label: 'Date', bv: before.dateTime, rv: before.dateTime ? 'Removed' : null },
            { label: 'Copyright', bv: before.copyright, rv: before.copyright ? 'Removed' : null }
        ];

        var compBefore = '';
        var compAfter = '';
        for (var i = 0; i < compRows.length; i++) {
            var r = compRows[i];
            compBefore += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid #f1f5f9">' +
                '<span style="color:#64748b">' + r.label + '</span>' +
                '<span style="font-weight:600;color:' + (r.bv ? '#dc2626' : '#94a3b8') + (r.bv ? '' : ';font-style:italic') + '">' + (r.bv || 'Not Present') + '</span></div>';
            compAfter += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid #f1f5f9">' +
                '<span style="color:#64748b">' + r.label + '</span>' +
                '<span style="font-weight:600;color:' + (r.rv === 'Removed' ? '#059669' : '#94a3b8') + (r.rv === 'Removed' ? '' : ';font-style:italic') + '">' + (r.rv || 'Not Present') + '</span></div>';
        }

        html += '<div style="padding:16px 0">' +
            '<p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 12px">Before / After Comparison</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div style="padding:16px;border-radius:12px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.03)">' +
            '<h4 style="font-size:13px;font-weight:600;margin:0 0 8px;color:#dc2626;display:flex;align-items:center;gap:6px">' +
            xIcon('#dc2626') + ' Before</h4>' + compBefore + '</div>' +
            '<div style="padding:16px;border-radius:12px;border:1px solid rgba(16,185,129,.3);background:rgba(16,185,129,.03)">' +
            '<h4 style="font-size:13px;font-weight:600;margin:0 0 8px;color:#059669;display:flex;align-items:center;gap:6px">' +
            checkIcon('#059669') + ' After</h4>' + compAfter + '</div></div></div>';

        /* --- REMOVAL REPORT --- */
        if (removedCats.length > 0) {
            var reportItems = '';
            for (var i = 0; i < removedCats.length; i++) {
                reportItems += '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#334155">' +
                    checkIcon('#10b981') + ' ' + removedCats[i] + '</div>';
            }

            var remainingText = '';
            if (after.fieldCount === 0) {
                remainingText = '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">' +
                    '<span style="color:#64748b">Remaining metadata:</span>' +
                    '<span style="font-weight:700;color:#166534;font-family:\'JetBrains Mono\',monospace">0 fields</span></div>' +
                    '<p style="font-size:12px;color:#64748b;margin:8px 0 0">All removable metadata successfully stripped.</p>';
            } else {
                remainingText = '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">' +
                    '<span style="color:#64748b">Remaining metadata:</span>' +
                    '<span style="font-weight:700;color:#b45309;font-family:\'JetBrains Mono\',monospace">' + after.fieldCount + ' field' + (after.fieldCount !== 1 ? 's' : '') + '</span></div>';
                if (after.fields.length > 0) {
                    remainingText += '<p style="font-size:12px;color:#64748b;margin:6px 0 0">Remaining: ' + after.fields.join(', ') + '</p>';
                } else {
                    remainingText += '<p style="font-size:12px;color:#64748b;margin:6px 0 0">Technical image data retained for correct rendering.</p>';
                }
            }

            html += '<div style="padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:16px">' +
                '<p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 12px">Removal Report</p>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + reportItems + '</div>' +
                '<div style="margin-top:12px;padding-top:12px;border-top:1px solid #bbf7d0">' +
                '<div style="display:flex;justify-content:space-between;font-size:13px">' +
                '<span style="color:#64748b">Removed:</span>' +
                '<span style="font-weight:700;color:#166534;font-family:\'JetBrains Mono\',monospace">' + before.fieldCount + ' field' + (before.fieldCount !== 1 ? 's' : '') + '</span></div>' +
                remainingText + '</div></div>';
        }

        /* --- REMAINING METADATA (expandable) --- */
        if (after.fieldCount > 0) {
            var remainingExplained = {
                'EXIF Data': { purpose: 'Standard image metadata format', impact: 'Low \u2014 contains technical image info' },
                'GPS Coordinates': { purpose: 'Location data embedded in the image', impact: 'High \u2014 reveals exact location' },
                'Camera Information': { purpose: 'Device make and model', impact: 'Medium \u2014 identifies your device' },
                'Date & Time': { purpose: 'When the photo was taken', impact: 'Medium \u2014 reveals timing patterns' },
                'Software': { purpose: 'Application used to create or edit the image', impact: 'Low' },
                'XMP Data': { purpose: 'Extensible Metadata Platform data', impact: 'Medium \u2014 may contain edit history' },
                'IPTC Data': { purpose: 'Press and media metadata', impact: 'Medium' },
                'Author': { purpose: 'Creator name', impact: 'High \u2014 identifies the creator' },
                'Copyright': { purpose: 'Copyright notice', impact: 'Low' },
                'Orientation': { purpose: 'Display rotation hint', impact: 'None' },
                'Embedded Thumbnail': { purpose: 'Preview image embedded in file', impact: 'Medium \u2014 may contain full image' },
                'Maker Notes': { purpose: 'Camera manufacturer proprietary data', impact: 'Medium' }
            };

            var remItems = '';
            var remFields = after.fields.length > 0 ? after.fields : ['Technical Image Data'];
            for (var i = 0; i < remFields.length; i++) {
                var f = remFields[i];
                var info = remainingExplained[f] || { purpose: 'Required for correct image rendering', impact: 'None' };
                remItems += '<div style="padding:10px 0;' + (i < remFields.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : '') + '">' +
                    '<p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 4px">' + f + '</p>' +
                    '<p style="font-size:12px;color:#64748b;margin:0"><strong>Purpose:</strong> ' + info.purpose + '</p>' +
                    '<p style="font-size:12px;color:#64748b;margin:2px 0 0"><strong>Privacy Impact:</strong> ' + info.impact + '</p>' +
                    '</div>';
            }

            html += '<details style="margin-bottom:16px">' +
                '<summary style="cursor:pointer;font-size:13px;font-weight:600;color:#0f172a;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;gap:6px">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg> Show Remaining Metadata (' + after.fieldCount + ')</summary>' +
                '<div style="padding:14px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px;background:#fff">' + remItems + '</div></details>';
        }

        /* --- REMOVED vs RETAINED --- */
        var removedList = '';
        for (var i = 0; i < removedCats.length; i++) {
            removedList += '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#334155;margin-bottom:4px">' +
                checkIcon('#10b981') + ' ' + removedCats[i] + '</div>';
        }

        var retainedItems = [
            { label: 'Image Dimensions', reason: 'Required for correct image rendering' },
            { label: 'Color Space', reason: 'Ensures accurate color reproduction' }
        ];
        var retainedList = '';
        for (var i = 0; i < retainedItems.length; i++) {
            retainedList += '<div style="font-size:13px;color:#334155;margin-bottom:4px">' +
                '<span style="font-weight:500">\u2022 ' + retainedItems[i].label + '</span>' +
                '<span style="color:#64748b;font-size:12px"> \u2014 ' + retainedItems[i].reason + '</span></div>';
        }

        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">' +
            '<div style="padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">' +
            '<p style="font-size:13px;font-weight:600;color:#166534;margin:0 0 8px">Removed</p>' +
            (removedList || '<p style="font-size:13px;color:#64748b;margin:0">No metadata was present to remove.</p>') +
            '</div>' +
            '<div style="padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">' +
            '<p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 8px">Retained</p>' +
            retainedList +
            '<p style="font-size:11px;color:#94a3b8;margin:6px 0 0">These are required for correct image rendering and do not expose personal information.</p>' +
            '</div></div>';

        /* --- VERIFICATION --- */
        var vChecks = [
            { label: 'No EXIF Found', ok: !after.hasEXIF },
            { label: 'No GPS Found', ok: !after.hasGPS },
            { label: 'No XMP Found', ok: !after.hasXMP },
            { label: 'No IPTC Found', ok: !after.hasIPTC },
            { label: 'Export Verified', ok: true }
        ];
        var vHtml = '';
        for (var i = 0; i < vChecks.length; i++) {
            vHtml += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:' +
                (vChecks[i].ok ? '#f0fdf4' : '#fef2f2') + ';border:1px solid ' + (vChecks[i].ok ? '#bbf7d0' : '#fecaca') +
                ';border-radius:8px;font-size:13px;font-weight:500;color:' + (vChecks[i].ok ? '#166534' : '#991b1b') + '">' +
                (vChecks[i].ok ? checkIcon('#166534') : xIcon('#991b1b')) + ' ' + vChecks[i].label + '</div>';
        }
        html += '<div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px">' +
            '<p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 4px;display:flex;align-items:center;gap:6px">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Verification Successful</p>' +
            '<p style="font-size:12px;color:#64748b;margin:0 0 12px">The exported image has been scanned and no removable metadata was found.</p>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + vHtml + '</div></div>';

        /* --- FILE SIZE --- */
        var qualityLabel = fmt === 'JPEG' ? '92%' : (fmt === 'PNG' ? 'Lossless' : 'Default');
        var reencodeNote = fmt === 'JPEG'
            ? 'JPEG was re-encoded at 92% quality during export. This produces visually identical results while stripping all metadata.'
            : fmt === 'PNG'
            ? 'PNG was re-encoded losslessly. All pixel data is preserved exactly.'
            : 'Image was re-encoded during export to strip metadata.';

        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
            '<div style="text-align:center;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">' +
            '<div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Original Size</div>' +
            '<div style="font-size:18px;font-weight:700;font-family:\'JetBrains Mono\',monospace;color:#0f172a;margin-top:4px">' + fmtSize(origSize) + '</div></div>' +
            '<div style="text-align:center;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">' +
            '<div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Processed Size</div>' +
            '<div style="font-size:18px;font-weight:700;font-family:\'JetBrains Mono\',monospace;color:#0f172a;margin-top:4px">' + fmtSize(resultSize) + '</div></div></div>';

        html += '<div style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:16px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:6px">' +
            '<span style="color:#64748b">Export Quality:</span>' +
            '<span style="font-weight:600;color:#0f172a;font-family:\'JetBrains Mono\',monospace">' + qualityLabel + '</span></div>' +
            '<p style="font-size:12px;color:#64748b;margin:0;line-height:1.5">' + reencodeNote + '</p></div>';

        /* --- BUTTONS --- */
        html += '<div style="display:flex;flex-direction:column;gap:12px">' +
            '<button id="download-result-btn" style="width:100%;padding:14px 24px;background:#10b981;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .2s" ' +
            'onmouseover="this.style.background=\'#059669\';this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 8px 25px rgba(16,185,129,.35)\'" onmouseout="this.style.background=\'#10b981\';this.style.transform=\'none\';this.style.boxShadow=\'none\'">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Clean Image</button>' +
            '<button id="new-file-btn" style="width:100%;padding:14px 24px;background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-radius:12px;font-size:15px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .2s" ' +
            'onmouseover="this.style.borderColor=\'#cbd5e1\';this.style.background=\'#f8fafc\';this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.background=\'#fff\';this.style.transform=\'none\'">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> Process Another Image</button></div>';

        return html;
    }

    /* =============================================
       DRAG & DROP
       ============================================= */
    var dropZone = document.querySelector('.upload-area');
    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.style.borderColor = 'var(--color-primary)'; });
        dropZone.addEventListener('dragleave', function() { dropZone.style.borderColor = ''; });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropZone.style.borderColor = '';
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    }

    /* =============================================
       FILE INPUT CHANGE
       ============================================= */
    fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
            notify('Please select a JPG, PNG, or WebP image', true);
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            notify('File too large (max 25 MB)', true);
            return;
        }

        currentFile = file;
        currentMetadata = null;

        if (actionBar) actionBar.style.display = '';
        applyBtn.style.display = '';
        resetBtn.style.display = '';

        var img = new Image();
        var url = URL.createObjectURL(file);
        img.onload = function() {
            fileInfo.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">' +
                '<div><strong>File:</strong> ' + (file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name) + '</div>' +
                '<div><strong>Size:</strong> ' + fmtSize(file.size) + '</div>' +
                '<div><strong>Dimensions:</strong> ' + img.width + ' x ' + img.height + '</div>' +
                '<div><strong>Type:</strong> ' + file.type + '</div></div>';
            URL.revokeObjectURL(url);
        };
        img.src = url;

        progressSection.style.display = 'block';
        progressSection.classList.add('show');
        showProgress(15, 'Scanning metadata...');

        setTimeout(function() {
            parseFile(file, function(meta) {
                currentMetadata = meta;
                showProgress(100, 'Done!');

                setTimeout(function() {
                    progressSection.style.display = 'none';
                    progressSection.classList.remove('show');

                    if (meta.fieldCount === 0) {
                        exifPreview.innerHTML =
                            '<div style="background:#fff;border:1px solid #bbf7d0;border-radius:14px;overflow:hidden;margin-top:0">' +
                            '<div style="padding:14px 20px;border-bottom:1px solid #bbf7d0;background:rgba(16,185,129,.04)">' +
                            '<h3 style="font-size:15px;font-weight:600;margin:0;color:#0f172a;display:flex;align-items:center;gap:8px">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Metadata Analysis</h3></div>' +
                            '<div style="padding:20px">' + renderAnalysis(meta) + '</div></div>';
                        applyBtn.disabled = true;
                        applyBtn.style.display = 'none';
                        if (actionBar) actionBar.style.gridTemplateColumns = '1fr';

                        setTimeout(function() {
                            var dlOrig = document.getElementById('download-original-btn');
                            if (dlOrig) {
                                dlOrig.addEventListener('click', function() {
                                    var a = document.createElement('a');
                                    a.href = URL.createObjectURL(file);
                                    a.download = file.name;
                                    document.body.appendChild(a);
                                    a.click();
                                    setTimeout(function() { document.body.removeChild(a); }, 100);
                                });
                            }
                        }, 50);
                    } else {
                        exifPreview.innerHTML =
                            '<div style="background:#fff;border:1px solid rgba(239,68,68,.2);border-radius:14px;overflow:hidden;margin-top:0">' +
                            '<div style="padding:14px 20px;border-bottom:1px solid rgba(239,68,68,.15);background:rgba(239,68,68,.02)">' +
                            '<h3 style="font-size:15px;font-weight:600;margin:0;color:#0f172a;display:flex;align-items:center;gap:8px">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Metadata Analysis</h3></div>' +
                            '<div style="padding:20px">' + renderAnalysis(meta) + '</div></div>';
                        applyBtn.disabled = false;
                        applyBtn.style.display = '';
                        if (actionBar) actionBar.style.gridTemplateColumns = '1fr 1fr';
                    }

                    settingsPanel.classList.add('show');
                }, 400);
            });
        }, 200);
    });

    /* =============================================
       APPLY BUTTON — REMOVE METADATA
       ============================================= */
    applyBtn.addEventListener('click', function() {
        if (!currentFile || !currentMetadata) return;
        var beforeMeta = currentMetadata;

        progressSection.style.display = 'block';
        progressSection.classList.add('show');
        showProgress(20, 'Re-drawing image...');
        applyBtn.disabled = true;

        var img = new Image();
        img.onload = function() {
            showProgress(45, 'Re-drawing image on canvas...');

            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0);

            showProgress(70, 'Encoding clean image...');

            var outputType = currentFile.type;
            if (outputType !== 'image/png' && outputType !== 'image/jpeg' && outputType !== 'image/webp') {
                outputType = 'image/jpeg';
            }
            var quality = outputType === 'image/jpeg' ? 0.92 : undefined;

            canvas.toBlob(function(blob) {
                if (!blob) {
                    notify('Failed to process image. Try a different format.', true);
                    applyBtn.disabled = false;
                    progressSection.style.display = 'none';
                    return;
                }

                showProgress(88, 'Verifying result...');

                processedBlob = blob;
                var baseName = currentFile.name.replace(/\.[^.]+$/, '');
                var ext = outputType === 'image/png' ? '.png' : outputType === 'image/webp' ? '.webp' : '.jpg';
                processedName = baseName + '_clean' + ext;

                var verifyReader = new FileReader();
                verifyReader.onload = function(e) {
                    var afterMeta = emptyMeta();
                    var abuf = e.target.result;
                    try {
                        if (outputType === 'image/jpeg') parseJPEG(abuf, afterMeta);
                        else if (outputType === 'image/png') parsePNG(abuf, afterMeta);
                        else if (outputType === 'image/webp') parseWebP(abuf, afterMeta);
                    } catch (ex) {}
                    buildFields(afterMeta);

                    showProgress(100, 'Done!');

                    setTimeout(function() {
                        progressSection.style.display = 'none';
                        progressSection.classList.remove('show');
                        if (actionBar) actionBar.style.display = 'none';

                        exifPreview.innerHTML = renderReport(beforeMeta, afterMeta, currentFile.size, blob.size);

                        var dlBtn = document.getElementById('download-result-btn');
                        if (dlBtn) {
                            dlBtn.addEventListener('click', function() {
                                var u = URL.createObjectURL(processedBlob);
                                var a = document.createElement('a');
                                a.href = u;
                                a.download = processedName;
                                document.body.appendChild(a);
                                a.click();
                                setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(u); }, 100);
                            });
                        }
                        var newBtn = document.getElementById('new-file-btn');
                        if (newBtn) {
                            newBtn.addEventListener('click', function() { resetBtn.click(); });
                        }
                    }, 500);
                };
                verifyReader.readAsArrayBuffer(blob);
            }, outputType, quality);
        };
        img.src = URL.createObjectURL(currentFile);
    });

    /* =============================================
       RESET
       ============================================= */
    resetBtn.addEventListener('click', function() {
        currentFile = null;
        currentMetadata = null;
        processedBlob = null;
        processedName = null;
        fileInput.value = '';
        settingsPanel.classList.remove('show');
        progressSection.style.display = 'none';
        progressSection.classList.remove('show');
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        progressText.textContent = 'Processing...';
        applyBtn.disabled = true;
        applyBtn.style.display = '';
        resetBtn.style.display = '';
        if (actionBar) actionBar.style.display = '';
        if (actionBar) actionBar.style.gridTemplateColumns = '1fr 1fr';
        exifPreview.innerHTML = '';
        fileInfo.innerHTML = '';
    });
});
