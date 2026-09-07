/* ============================================
   GO TOOLLY - UUID VALIDATOR v2.0
   Premium validation with structure analysis
   ============================================ */

(function () {
    'use strict';

    /* ============ STATE ============ */
    var state = {
        lastResults: [],
        lastTiming: 0
    };

    /* ============ DOM CACHE ============ */
    var elements = {};

    function cacheDom() {
        elements = {
            uuidInput: document.getElementById('uuid-input'),
            acceptCompact: document.getElementById('accept-compact'),
            validateBtn: document.getElementById('validate-btn'),
            clearBtn: document.getElementById('clear-btn'),
            uuidResults: document.getElementById('uuid-results'),
            uuidStats: document.getElementById('tool-stats'),
            resultCount: document.getElementById('result-count'),
            emptyState: document.getElementById('empty-state'),
            resultsPanel: document.getElementById('results-panel'),
            statusBadge: document.getElementById('status-badge'),
            exportSection: document.getElementById('export-section'),
            exportJson: document.getElementById('export-json'),
            exportTxt: document.getElementById('export-txt'),
            exportCsv: document.getElementById('export-csv'),
            exportPrint: document.getElementById('export-print'),
            exportCopy: document.getElementById('export-copy'),
            srAnnounce: document.getElementById('sr-announce')
        };
    }

    function setStatus(type, label) {
        var b = elements.statusBadge;
        if (!b) return;
        b.className = 'status-badge' + (type ? ' ' + type : '');
        if (label) b.textContent = label;
    }

    function animateCount(el, target) {
        if (typeof requestAnimationFrame !== 'function') {
            el.textContent = target;
            return;
        }
        var dur = 550;
        var t0 = null;
        function step(ts) {
            if (t0 === null) t0 = ts;
            var p = Math.min((ts - t0) / dur, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ============ UTILS ============ */
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    var toastTimer;
    function showToast(msg, type) {
        var t = document.querySelector('.tool-toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'tool-toast';
            t.setAttribute('role', 'status');
            document.body.appendChild(t);
        }
        t.className = 'tool-toast ' + (type || 'success');
        t.textContent = msg;
        requestAnimationFrame(function () { t.classList.add('show'); });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    function announce(msg) {
        if (elements.srAnnounce) elements.srAnnounce.textContent = msg;
    }

    function copyText(text, okMsg) {
        if (!text) return;
        function done() { showToast(okMsg || 'Copied to clipboard'); }
        function fail() { showToast('Copy failed — select manually', 'error'); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fail);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                done();
            } catch (e) {
                fail();
            }
            document.body.removeChild(ta);
        }
    }

    function downloadFile(filename, content, mime) {
        var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 500);
        showToast('Downloaded ' + filename);
    }

    /* ============ DATA ============ */
    var VERSION_NAMES = {
        0: 'Nil UUID',
        1: 'Version 1 — Time-based',
        2: 'Version 2 — DCE Security',
        3: 'Version 3 — Name-based (MD5)',
        4: 'Version 4 — Random',
        5: 'Version 5 — Name-based (SHA-1)',
        6: 'Version 6 — Reordered time-based',
        7: 'Version 7 — Unix Epoch time-based',
        8: 'Version 8 — Custom',
        9: 'Version 9 — Custom (non-standard)',
        10: 'Version 10 — Custom (non-standard)',
        11: 'Version 11 — Custom (non-standard)',
        12: 'Version 12 — Custom (non-standard)',
        13: 'Version 13 — Custom (non-standard)',
        14: 'Version 14 — Custom (non-standard)',
        15: 'Max UUID'
    };

    var VERSION_INFO = {
        0: 'All-zero UUID used as a "no value" or "unset" sentinel.',
        1: 'Generated from a 60-bit Gregorian timestamp (100-ns intervals), the clock sequence, and the node (usually a MAC address).',
        2: 'DCE Security UUID embedding a POSIX UID/GID alongside a time-based timestamp.',
        3: 'Deterministic UUID derived from an MD5 hash of a namespace identifier and a name.',
        4: 'Generated from random or pseudo-random data — by far the most common version on the web.',
        5: 'Deterministic UUID derived from a SHA-1 hash of a namespace identifier and a name.',
        6: 'Time-based UUID with the fields reordered so values sort sequentially by creation time.',
        7: 'Generated from a 48-bit Unix Epoch millisecond timestamp plus random data; sortable, compact, and fast.',
        8: 'Reserved for custom, implementation-specific UUID layouts defined by applications.',
        15: 'All-f UUID used as a "maximum value" sentinel.'
    };

    var VARIANT_NAMES = {
        '1': 'RFC 4122 / RFC 9562',
        '0': 'NCS backward compatibility (legacy)',
        '2': 'Microsoft GUID (legacy)',
        '3': 'Reserved for future definition'
    };

    var VARIANT_DESC = {
        '1': 'The standard 10xx variant used by all modern UUIDs.',
        '0': 'Legacy NCS variant (0xxx) — not standard, rarely seen.',
        '2': 'Legacy Microsoft variant (110x) used by some Windows GUIDs.',
        '3': 'Reserved variant (111x) for future standards.'
    };

    /* ============ ANALYSIS ============ */
    var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    function getVariant(nibbleHex) {
        var n = parseInt(nibbleHex, 16);
        if (n < 8) return '0';
        if (n < 12) return '1';
        if (n < 14) return '2';
        return '3';
    }

    function getStandard(version, variant, isNil, isMax) {
        if (isNil || isMax) return 'RFC 9562 (defined)';
        if (variant !== '1') return 'None (legacy variant)';
        if (version === 7 || version === 8) return 'RFC 9562';
        if (version >= 1 && version <= 6) return 'RFC 4122';
        return 'None (non-standard version)';
    }

    function gregorianTimestamp(low, mid, high) {
        try {
            var hi = BigInt('0x' + high) & 0xfffn;
            var midB = BigInt('0x' + mid);
            var lowB = BigInt('0x' + low);
            var t = (hi << 48n) | (midB << 32n) | lowB;
            var msSinceGregorian = Number(t / 10000n);
            var epochDiff = Date.UTC(1582, 9, 15);
            var d = new Date(epochDiff + msSinceGregorian);
            if (isNaN(d.getTime())) return null;
            return { iso: d.toISOString(), ms: epochDiff + msSinceGregorian, raw: t.toString() };
        } catch (e) {
            return null;
        }
    }

    function unixEpochTimestamp(first48) {
        try {
            var ms = Number(BigInt('0x' + first48));
            var d = new Date(ms);
            if (isNaN(d.getTime())) return null;
            return { iso: d.toISOString(), ms: ms, raw: first48 };
        } catch (e) {
            return null;
        }
    }

    function diagnose(cleaned, normalized) {
        var errors = [];
        var dashCount = (normalized.match(/-/g) || []).length;
        var hexClean = normalized.replace(/-/g, '');
        var allHex = /^[0-9a-f]+$/.test(hexClean);

        if (!allHex) {
            errors.push('Invalid hexadecimal character: only 0-9 and a-f are allowed.');
        }
        if (dashCount > 0) {
            var groups = normalized.split('-');
            errors.push('Incorrect hyphen positions: expected 8-4-4-4-12 grouping, found ' + groups.map(function (g) { return g.length; }).join('-') + '.');
        }
        if (allHex && hexClean.length !== 32) {
            errors.push('Invalid length: found ' + hexClean.length + ' hex characters, expected 32.');
        }
        return errors;
    }

    function invalidResult(original, cleaned, errors, warnings, hexOnly, parts) {
        return {
            raw: original,
            cleaned: cleaned,
            valid: false,
            formatOk: false,
            version: null,
            variant: null,
            versionName: '—',
            variantName: '—',
            standard: '—',
            timestamp: null,
            errors: errors,
            warnings: warnings,
            parts: parts || null,
            hexOnly: !!hexOnly,
            compact: false
        };
    }

    function analyze(raw, opts) {
        var acceptCompact = !!(opts && opts.acceptCompact);
        var original = raw;
        var trimmed = raw.trim();
        if (!trimmed) return null;

        var errors = [];
        var warnings = [];

        if (trimmed !== raw) {
            warnings.push('Normalized before validation: leading/trailing whitespace trimmed.');
        }

        var cleaned = trimmed;

        if (/^urn:uuid:/i.test(cleaned)) {
            cleaned = cleaned.slice(9);
            warnings.push('URN prefix "urn:uuid:" stripped before validation.');
        }
        if (cleaned.charAt(0) === '{' && cleaned.charAt(cleaned.length - 1) === '}') {
            cleaned = cleaned.slice(1, -1);
            warnings.push('Braces stripped before validation.');
        }

        var normalized = cleaned.toLowerCase();

        if (!UUID_RE.test(normalized)) {
            if (/^[0-9a-f]{32}$/.test(normalized)) {
                if (!acceptCompact) {
                    errors.push('Compact UUID not allowed: 32 hexadecimal characters without hyphens. Enable "Accept compact UUIDs" to allow this form.');
                    return invalidResult(original, cleaned, errors, warnings, true);
                }
                normalized = normalized.slice(0, 8) + '-' + normalized.slice(8, 12) + '-' + normalized.slice(12, 16) + '-' + normalized.slice(16, 20) + '-' + normalized.slice(20, 32);
                warnings.push('Compact 32-character form normalized to the standard 8-4-4-4-12 layout.');
            } else {
                var diag = diagnose(cleaned, normalized);
                if (!diag.length) diag.push('Invalid UUID format.');
                return invalidResult(original, cleaned, diag, warnings, false);
            }
        }

        var timeLow = normalized.slice(0, 8);
        var timeMid = normalized.slice(9, 13);
        var timeHigh = normalized.slice(14, 18);
        var clockSeq = normalized.slice(19, 23);
        var node = normalized.slice(24, 36);
        var versionHex = timeHigh.charAt(0);
        var variantHex = clockSeq.charAt(0);
        var version = parseInt(versionHex, 16);
        var variant = getVariant(variantHex);

        var isNil = normalized === '00000000-0000-0000-0000-000000000000';
        var isMax = normalized === 'ffffffff-ffff-ffff-ffff-ffffffffffff';

        if (!isNil && !isMax) {
            if (version < 1 || version > 8) {
                errors.push('Unsupported UUID version: ' + version + ' (version nibble 0x' + versionHex + '). RFC 4122 / RFC 9562 define versions 1-8.');
            }
            if (variant !== '1') {
                errors.push('Invalid RFC variant: variant nibble 0x' + variantHex + ' (' + VARIANT_NAMES[variant].toLowerCase() + '). Expected the standard 10xx variant.');
            }
        }

        if (errors.length) {
            return invalidResult(original, normalized, errors, warnings, true, {
                timeLow: timeLow, timeMid: timeMid, timeHigh: timeHigh,
                clockSeq: clockSeq, node: node, versionHex: versionHex, variantHex: variantHex
            });
        }

        var standard = getStandard(version, variant, isNil, isMax);

        var timestamp = null;
        if (isNil || isMax) {
            timestamp = null;
        } else if (version === 1 || version === 2 || version === 6) {
            timestamp = gregorianTimestamp(timeLow, timeMid, timeHigh);
        } else if (version === 7) {
            timestamp = unixEpochTimestamp(timeLow + timeMid);
        }

        var clockSeqValue = null;
        var nodeMulticast = null;
        if (version === 1 || version === 2 || version === 6) {
            var clockSeqHi = parseInt(clockSeq.slice(0, 2), 16) & 0x3f;
            var clockSeqLo = parseInt(clockSeq.slice(2, 4), 16);
            clockSeqValue = (clockSeqHi << 8) | clockSeqLo;
            nodeMulticast = (parseInt(node.slice(0, 2), 16) & 0x01) === 1;
        }

        return {
            raw: original,
            cleaned: normalized,
            valid: true,
            formatOk: true,
            version: version,
            variant: variant,
            versionName: VERSION_NAMES[version] || ('Version ' + version + ' (non-standard)'),
            versionInfo: VERSION_INFO[version] || 'Application-specific version not defined by any RFC.',
            variantName: VARIANT_NAMES[variant],
            variantInfo: VARIANT_DESC[variant],
            standard: standard,
            timestamp: timestamp,
            isNil: isNil,
            isMax: isMax,
            sortable: version === 6 || version === 7,
            randomBits: version === 4 ? 122 : (version === 7 ? 74 : null),
            clockSeqValue: clockSeqValue,
            nodeMulticast: nodeMulticast,
            errors: errors,
            warnings: warnings,
            parts: { timeLow: timeLow, timeMid: timeMid, timeHigh: timeHigh, clockSeq: clockSeq, node: node, versionHex: versionHex, variantHex: variantHex }
        };
    }

    function parseLines() {
        var t0 = performance.now();
        var acceptCompact = !!(elements.acceptCompact && elements.acceptCompact.checked);
        var lines = elements.uuidInput.value.split('\n').filter(function (l) { return l.trim().length > 0; });
        var results = lines.map(function (l) { return analyze(l, { acceptCompact: acceptCompact }); }).filter(function (r) { return r; });
        state.lastResults = results;
        state.lastTiming = Math.round((performance.now() - t0) * 100) / 100;
        return results;
    }

    /* ============ STATS ============ */
    function renderStats(results) {
        if (!elements.uuidStats) return;
        var total = results.length;
        var valid = results.filter(function (r) { return r.valid; }).length;
        var invalid = total - valid;
        var warnings = results.reduce(function (n, r) { return n + r.warnings.length; }, 0);
        var unique = new Set(results.map(function (r) { return r.cleaned; })).size;
        var versionCounts = {};
        results.forEach(function (r) {
            if (r.valid) {
                var key = r.isNil ? 'Nil' : (r.isMax ? 'Max' : ('v' + r.version));
                versionCounts[key] = (versionCounts[key] || 0) + 1;
            }
        });

        var html = '<span class="stats-chip"><strong data-count="' + total + '">0</strong> total</span>';
        html += '<span class="stats-chip"><span class="dot" style="background:#10b981"></span>valid: <strong data-count="' + valid + '">0</strong></span>';
        html += '<span class="stats-chip"><span class="dot" style="background:#ef4444"></span>invalid: <strong data-count="' + invalid + '">0</strong></span>';
        html += '<span class="stats-chip"><span class="dot" style="background:#f59e0b"></span>warnings: <strong data-count="' + warnings + '">0</strong></span>';
        html += '<span class="stats-chip">unique: <strong data-count="' + unique + '">0</strong></span>';
        html += '<span class="stats-chip">time: <strong>' + state.lastTiming + 'ms</strong></span>';
        Object.keys(versionCounts).sort().forEach(function (k) {
            html += '<span class="stats-chip">' + k + ': <strong data-count="' + versionCounts[k] + '">0</strong></span>';
        });
        elements.uuidStats.innerHTML = html;
        var counters = elements.uuidStats.querySelectorAll('[data-count]');
        for (var i = 0; i < counters.length; i++) {
            animateCount(counters[i], parseInt(counters[i].getAttribute('data-count'), 10));
        }
    }

    function setProcessing(on) {
        if (!elements.uuidStats) return;
        if (on) {
            elements.uuidStats.innerHTML = '<span class="stats-chip"><strong>Validating...</strong></span>';
        }
    }

    /* ============ RENDERING ============ */
    function breakdownHtml(parts) {
        var seg = function (cls, text, title) {
            return '<span class="ub-part ' + cls + '" title="' + title + '">' + text + '</span>';
        };
        var html = '';
        html += seg('ub-time-low', parts.timeLow, 'time_low — first 32 bits of the timestamp');
        html += '<span class="ub-dash">-</span>';
        html += seg('ub-time-mid', parts.timeMid, 'time_mid — bits 32-47 of the timestamp');
        html += '<span class="ub-dash">-</span>';
        html += seg('ub-time-high', '<span class="ub-version">' + parts.versionHex + '</span>' + parts.timeHigh.slice(1), 'time_hi_and_version — most significant 4 bits are the version');
        html += '<span class="ub-dash">-</span>';
        html += seg('ub-clock', '<span class="ub-variant">' + parts.variantHex + '</span>' + parts.clockSeq.slice(1), 'clock_seq_hi_and_reserved (first 2 bits are the variant) + clock_seq_low');
        html += '<span class="ub-dash">-</span>';
        html += seg('ub-node', parts.node, 'node — 48-bit node identifier');
        return html;
    }

    function reportRow(label, value, note) {
        return '<div class="rep-row"><span class="rep-label">' + label + '</span><span class="rep-value">' + value + '</span>' + (note ? '<span class="rep-note">' + escapeHtml(note) + '</span>' : '') + '</div>';
    }

    function renderResult(r, index) {
        var cls = r.valid ? 'valid' : 'invalid';
        var html = '<div class="uuid-result ' + cls + '" tabindex="0" role="button" aria-label="UUID ' + escapeHtml(r.raw) + '. Press Ctrl+C to copy.">';
        html += '<div class="uuid-result-top">';
        html += '<div class="uuid-raw">' + escapeHtml(r.raw) + '</div>';
        html += '<button type="button" class="mini-copy" data-copy="' + escapeHtml(r.cleaned || r.raw) + '" aria-label="Copy UUID" title="Copy UUID"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>';
        html += '</div>';

        if (r.valid) {
            var statusText = r.isNil ? 'Valid — Nil UUID' : (r.isMax ? 'Valid — Max UUID' : 'Valid');
            html += '<span class="uuid-status status-valid"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ' + statusText + '</span>';
            html += '<div class="uuid-meta">';
            html += '<span class="meta-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> ' + escapeHtml(r.versionName) + '</span>';
            html += '<span class="meta-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Variant: ' + escapeHtml(r.variantName) + '</span>';
            html += '<span class="meta-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> ' + escapeHtml(r.standard) + '</span>';
            html += '</div>';

            html += '<div class="uuid-breakdown">' + breakdownHtml(r.parts) + '</div>';

            html += '<div class="report">';
            html += reportRow('Version', '<strong>' + r.version + '</strong>', r.versionInfo);
            html += reportRow('Variant', '<strong>' + r.variantHex + '</strong> (' + r.variantName + ')', r.variantInfo);
            html += reportRow('Standard', r.standard, 'RFC 4122 (2005) and RFC 9562 (2025) define the standard 8-4-4-4-12 layout.');
            if (r.timestamp) {
                html += reportRow('Timestamp', r.timestamp.iso, 'Reconstructed from the embedded time fields.');
                html += reportRow('Raw time', r.timestamp.raw, r.version === 7 ? 'Unix Epoch milliseconds' : '100-nanosecond intervals since 1582-10-15 (Gregorian).');
            }
            if (r.version === 4) html += reportRow('Randomness', '122 random bits', '122 of the 128 bits come from a random source.');
            if (r.version === 7) html += reportRow('Randomness', '74 random bits', 'Bits 62-74 carry random data alongside the timestamp.');
            if (r.clockSeqValue !== null) html += reportRow('Clock sequence', String(r.clockSeqValue), '14-bit counter that avoids duplicate UUIDs for equal timestamps.');
            if (r.nodeMulticast !== null) html += reportRow('Node', r.parts.node, r.nodeMulticast ? 'Multicast bit set (random node — privacy).' : 'Usually derived from the MAC address.');
            if (r.sortable) html += reportRow('Sortable', 'Yes', 'Time-ordered — values sort by creation time.');
            if (r.isNil) html += reportRow('Sentinel', 'Nil UUID', 'Represents "no value"; never generated as a real identifier.');
            if (r.isMax) html += reportRow('Sentinel', 'Max UUID', 'Represents the maximum possible value.');
            html += '</div>';

            if (r.warnings.length) {
                html += '<div class="warn-list">' + r.warnings.map(function (w) {
                    return '<div class="warn-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ' + escapeHtml(w) + '</div>';
                }).join('') + '</div>';
            }
        } else {
            html += '<span class="uuid-status status-invalid"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Invalid UUID</span>';
            if (r.errors.length) {
                html += '<div class="error-list">' + r.errors.map(function (e) {
                    return '<div class="error-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> ' + escapeHtml(e) + '</div>';
                }).join('') + '</div>';
            }
            if (r.warnings.length) {
                html += '<div class="warn-list">' + r.warnings.map(function (w) {
                    return '<div class="warn-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ' + escapeHtml(w) + '</div>';
                }).join('') + '</div>';
            }
        }
        html += '</div>';
        return html;
    }

    function renderEmpty() {
        return '<div class="no-results" role="status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/><line x1="7" y1="15" x2="11" y2="15"/><line x1="13" y1="15" x2="17" y2="15"/></svg><h4>No UUIDs to show</h4><p>Enter one or more UUIDs above and click <strong>Validate</strong>, or press <strong>Ctrl+Enter</strong>.</p></div>';
    }

    function render() {
        if (!elements.uuidResults) return;
        var results = state.lastResults;
        if (!results.length) {
            if (elements.emptyState) elements.emptyState.style.display = '';
            if (elements.resultsPanel) elements.resultsPanel.classList.remove('show');
            elements.uuidResults.innerHTML = '';
            if (elements.resultCount) elements.resultCount.textContent = '';
            if (elements.uuidStats) elements.uuidStats.innerHTML = '';
            setStatus('ready', 'Ready');
            return;
        }
        if (elements.emptyState) elements.emptyState.style.display = 'none';
        if (elements.resultsPanel) elements.resultsPanel.classList.add('show');
        if (elements.resultCount) {
            elements.resultCount.innerHTML = 'Validated <strong>' + results.length + '</strong> UUIDs';
        }
        elements.uuidResults.innerHTML = results.map(renderResult).join('');
        renderStats(results);
        var valid = results.filter(function (r) { return r.valid; }).length;
        setStatus('done', 'Done');
        announce(valid + ' valid, ' + (results.length - valid) + ' invalid of ' + results.length + ' UUIDs');
    }

    /* ============ EXPORTS ============ */
    function payload() {
        return state.lastResults.map(function (r) {
            return {
                input: r.raw,
                valid: r.valid,
                normalized: r.valid ? r.cleaned : null,
                version: r.valid ? r.version : null,
                versionName: r.valid ? r.versionName : null,
                variant: r.valid ? r.variant : null,
                variantName: r.valid ? r.variantName : null,
                standard: r.valid ? r.standard : null,
                timestamp: r.valid && r.timestamp ? r.timestamp.iso : null,
                sortable: r.valid ? !!r.sortable : null,
                errors: r.errors,
                warnings: r.warnings
            };
        });
    }

    function exportJson() {
        downloadFile('uuid-validation-report.json', JSON.stringify({ generated: new Date().toISOString(), count: state.lastResults.length, results: payload() }, null, 2), 'application/json');
    }

    function exportTxt() {
        var lines = [];
        lines.push('UUID VALIDATION REPORT');
        lines.push('Generated: ' + new Date().toLocaleString());
        lines.push('UUIDs: ' + state.lastResults.length);
        lines.push('');
        state.lastResults.forEach(function (r) {
            lines.push((r.valid ? 'VALID   ' : 'INVALID ') + r.raw + (r.valid ? ' [' + r.versionName + ']' : ''));
            if (r.valid && r.timestamp) lines.push('         Timestamp: ' + r.timestamp.iso);
            r.warnings.forEach(function (w) { lines.push('  ! ' + w); });
            r.errors.forEach(function (e) { lines.push('  x ' + e); });
            lines.push('');
        });
        downloadFile('uuid-validation-report.txt', lines.join('\n'));
    }

    function exportCsv() {
        var rows = [['Input', 'Valid', 'Normalized', 'Version', 'Version Name', 'Variant', 'Standard', 'Timestamp', 'Errors', 'Warnings']];
        state.lastResults.forEach(function (r) {
            rows.push([
                r.raw,
                r.valid ? 'yes' : 'no',
                r.valid ? r.cleaned : '',
                r.valid ? r.version : '',
                r.valid ? r.versionName : '',
                r.valid ? r.variant : '',
                r.valid ? r.standard : '',
                r.valid && r.timestamp ? r.timestamp.iso : '',
                r.errors.join(' | '),
                r.warnings.join(' | ')
            ]);
        });
        var csv = rows.map(function (r) {
            return r.map(function (c) {
                var v = String(c);
                if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
                return v;
            }).join(',');
        }).join('\r\n');
        downloadFile('uuid-validation-report.csv', csv, 'text/csv');
    }

    function exportPrint() {
        window.print();
    }

    function exportCopyReport() {
        var lines = state.lastResults.map(function (r) {
            return (r.valid ? 'VALID' : 'INVALID') + '\t' + r.raw + (r.valid ? '\t' + r.versionName : '');
        });
        copyText(lines.join('\n'), 'Report copied to clipboard');
    }

    function clearSearch() {
        if (elements.uuidInput) elements.uuidInput.value = '';
        state.lastResults = [];
        render();
        showToast('Cleared', 'info');
        if (elements.uuidInput) elements.uuidInput.focus();
        announce('Cleared');
    }

    /* ============ EVENTS ============ */
    function doValidate() {
        var results = parseLines();
        render();
    }

    function doValidateWithFeedback() {
        if (!elements.uuidInput.value.trim()) {
            showToast('Enter at least one UUID to validate', 'info');
            return;
        }
        setStatus('processing', 'Validating');
        setProcessing(true);
        setTimeout(function () {
            doValidate();
        }, 90);
    }

    function doClear() {
        clearSearch();
    }

    function onInputKeydown(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            doValidateWithFeedback();
        }
    }

    function onResultsClick(e) {
        var copyBtn = e.target.closest('[data-copy]');
        if (copyBtn) {
            e.stopPropagation();
            copyText(copyBtn.getAttribute('data-copy'));
            return;
        }
        var card = e.target.closest('.uuid-result');
        if (card) {
            var btn = card.querySelector('[data-copy]');
            if (btn) copyText(btn.getAttribute('data-copy'));
        }
    }

    function onResultsKeydown(e) {
        if (e.key.toLowerCase() === 'c' && (e.ctrlKey || e.metaKey)) {
            var card = e.target.closest('.uuid-result');
            if (card) {
                e.preventDefault();
                var btn = card.querySelector('[data-copy]');
                if (btn) copyText(btn.getAttribute('data-copy'));
            }
        }
    }

    function onGlobalKeydown(e) {
        if (e.key === 'Escape') {
            if (elements.uuidInput && (elements.uuidInput.value || state.lastResults.length)) {
                e.preventDefault();
                doClear();
            }
        }
    }

    function bindEvents() {
        if (elements.validateBtn) elements.validateBtn.addEventListener('click', doValidateWithFeedback);
        if (elements.clearBtn) elements.clearBtn.addEventListener('click', doClear);
        if (elements.uuidInput) elements.uuidInput.addEventListener('keydown', onInputKeydown);
        if (elements.uuidResults) {
            elements.uuidResults.addEventListener('click', onResultsClick);
            elements.uuidResults.addEventListener('keydown', onResultsKeydown);
        }
        if (elements.exportJson) elements.exportJson.addEventListener('click', exportJson);
        if (elements.exportTxt) elements.exportTxt.addEventListener('click', exportTxt);
        if (elements.exportCsv) elements.exportCsv.addEventListener('click', exportCsv);
        if (elements.exportPrint) elements.exportPrint.addEventListener('click', exportPrint);
        if (elements.exportCopy) elements.exportCopy.addEventListener('click', exportCopyReport);
        if (elements.emptyState) {
            elements.emptyState.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-example]');
                if (!btn) return;
                var val = btn.getAttribute('data-example');
                if (elements.uuidInput) elements.uuidInput.value = val;
                doValidateWithFeedback();
            });
        }
        document.addEventListener('keydown', onGlobalKeydown);
    }

    /* ============ INIT ============ */
    function init() {
        cacheDom();
        if (!elements.uuidInput || !elements.validateBtn) return;
        bindEvents();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
