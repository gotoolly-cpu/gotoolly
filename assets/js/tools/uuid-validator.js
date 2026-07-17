(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    var uuidInput = $('uuid-input');
    var validateBtn = $('validate-btn');
    var clearBtn = $('clear-btn');
    var uuidResults = $('uuid-results');
    var uuidStats = $('uuid-stats');
    var resultArea = $('result-area');
    var srAnnounce = $('sr-announce');

    if (!validateBtn) return;

    var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i;

    var versionNames = {
        '0': 'Nil UUID',
        '1': 'Version 1 (Time-based)',
        '2': 'Version 2 (DCE Security)',
        '3': 'Version 3 (Name-based MD5)',
        '4': 'Version 4 (Random)',
        '5': 'Version 5 (Name-based SHA-1)',
        '6': 'Version 6 (Improved Time-based)',
        '7': 'Version 7 (Unix Epoch Time-based)',
        '8': 'Version 8 (Custom)',
        '9': 'Version 9 (Custom)',
        '10': 'Version 10 (Custom)',
        '15': 'Max UUID'
    };

    var variantNames = {
        '0': 'NCS backward compatibility',
        '1': 'RFC 4122 / Leach-Salz',
        '2': 'Microsoft (backward compat)',
        '3': 'Reserved'
    };

    validateBtn.addEventListener('click', doValidate);
    if (clearBtn) clearBtn.addEventListener('click', doClear);
    if (uuidInput) uuidInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            doValidate();
        }
    });

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getVariant(variantHex) {
        var highNibble = parseInt(variantHex[0], 16);
        if (highNibble < 8) return '0';
        if (highNibble < 12) return '1';
        if (highNibble < 14) return '2';
        return '3';
    }

    function validateUUID(raw) {
        var cleaned = raw.trim().toLowerCase();
        if (!cleaned) return null;

        var noDash = cleaned.replace(/-/g, '');
        if (noDash.length === 32 && /^[0-9a-f]{32}$/i.test(noDash)) {
            cleaned = noDash.slice(0, 8) + '-' + noDash.slice(8, 12) + '-' + noDash.slice(12, 16) + '-' + noDash.slice(16, 20) + '-' + noDash.slice(20, 32);
        }

        var match = cleaned.match(uuidRegex);
        if (!match) {
            return { raw: raw, cleaned: cleaned, valid: false, version: null, variant: null, versionName: null, variantName: null };
        }

        var versionHex = match[1][0];
        var variantHex = match[2][0];
        var version = parseInt(versionHex, 16);
        var variant = getVariant(variantHex);

        return {
            raw: raw,
            cleaned: cleaned,
            valid: true,
            version: version,
            variant: variant,
            versionName: versionNames[String(version)] || 'Unknown (' + version + ')',
            variantName: variantNames[variant] || 'Unknown',
            parts: {
                timeLow: cleaned.slice(0, 8),
                timeMid: cleaned.slice(9, 13),
                timeHigh: cleaned.slice(14, 18),
                clockSeq: cleaned.slice(19, 23),
                node: cleaned.slice(24, 36)
            }
        };
    }

    function renderResult(r) {
        var cls = r.valid ? 'valid' : 'invalid';
        var html = '<div class="uuid-result ' + cls + '">';
        html += '<div class="uuid-raw">' + escapeHtml(r.raw) + '</div>';

        if (r.valid) {
            html += '<span class="uuid-status status-valid"><i class="fas fa-check-circle" aria-hidden="true"></i> Valid</span>';
            html += '<div class="uuid-meta">';
            html += '<span><i class="fas fa-tag" aria-hidden="true"></i> ' + r.versionName + '</span>';
            html += '<span><i class="fas fa-layer-group" aria-hidden="true"></i> Variant: ' + r.variantName + '</span>';
            html += '</div>';
            html += '<div class="uuid-breakdown">';
            html += '<span class="ub-part ub-time-low" title="time-low">' + r.parts.timeLow + '</span>';
            html += '<span class="ub-dash">-</span>';
            html += '<span class="ub-part ub-time-mid" title="time-mid">' + r.parts.timeMid + '</span>';
            html += '<span class="ub-dash">-</span>';
            html += '<span class="ub-part ub-time-high" title="time-high-and-version">' + r.parts.timeHigh + '</span>';
            html += '<span class="ub-dash">-</span>';
            html += '<span class="ub-part ub-clock" title="clock-seq">' + r.parts.clockSeq + '</span>';
            html += '<span class="ub-dash">-</span>';
            html += '<span class="ub-part ub-node" title="node">' + r.parts.node + '</span>';
            html += '</div>';
        } else {
            html += '<span class="uuid-status status-invalid"><i class="fas fa-times-circle" aria-hidden="true"></i> Invalid</span>';
            html += '<div class="uuid-meta"><span>Does not match UUID format (8-4-4-4-12 hex characters)</span></div>';
        }

        html += '</div>';
        return html;
    }

    function doValidate() {
        var lines = uuidInput.value.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
        if (!lines.length) {
            uuidResults.innerHTML = '';
            uuidStats.style.display = 'none';
            announce('No UUIDs to validate');
            return;
        }

        var results = lines.map(validateUUID);
        var validCount = results.filter(function (r) { return r && r.valid; }).length;
        var invalidCount = results.filter(function (r) { return r && !r.valid; }).length;
        var versionCounts = {};
        results.forEach(function (r) {
            if (r && r.valid) versionCounts[r.version] = (versionCounts[r.version] || 0) + 1;
        });

        uuidStats.style.display = 'flex';
        var statsHtml = '<div><strong>' + validCount + '</strong> Valid</div><div><strong>' + invalidCount + '</strong> Invalid</div>';
        Object.keys(versionCounts).sort().forEach(function (v) {
            statsHtml += '<div><strong>' + versionCounts[v] + '</strong> V' + v + '</div>';
        });
        uuidStats.innerHTML = statsHtml;

        uuidResults.innerHTML = results.filter(function (r) { return r; }).map(renderResult).join('');

        if (resultArea) resultArea.style.display = 'block';
        announce(validCount + ' valid, ' + invalidCount + ' invalid out of ' + lines.length + ' UUIDs');
    }

    function doClear() {
        uuidInput.value = '';
        uuidResults.innerHTML = '';
        uuidStats.style.display = 'none';
        if (resultArea) resultArea.style.display = 'none';
        announce('Cleared');
    }

    function announce(msg) {
        if (srAnnounce) srAnnounce.textContent = msg;
    }

    doValidate();
})();
