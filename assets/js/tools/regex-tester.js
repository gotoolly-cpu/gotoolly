/* ============================================
   GO TOOLLY - REGEX TESTER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var pattern = document.getElementById('pattern');
    var testText = document.getElementById('test-text');
    var highlighted = document.getElementById('highlighted');
    var matchArea = document.getElementById('match-area');
    var matchCount = document.getElementById('match-count');
    var matchTable = document.getElementById('match-table-wrapper');
    var errorDiv = document.getElementById('regex-error');
    var flagG = document.getElementById('flag-g');
    var flagI = document.getElementById('flag-i');
    var flagM = document.getElementById('flag-m');
    var flagS = document.getElementById('flag-s');
    var flagU = document.getElementById('flag-u');

    var flagInputs = [flagG, flagI, flagM, flagS, flagU];

    function init() {
        pattern.addEventListener('input', test);
        testText.addEventListener('input', test);
        flagInputs.forEach(function(el) { el.addEventListener('change', test); });
        test();
    }

    function test() {
        var pat = pattern.value;
        var text = testText.value;
        errorDiv.style.display = 'none';

        if (!pat.trim()) {
            highlighted.innerHTML = text ? escapeHtml(text) : '<span style="color:var(--color-text-light)">Enter a pattern and test text to see matches...</span>';
            matchArea.style.display = 'none';
            return;
        }
        if (!text.trim()) {
            highlighted.innerHTML = '<span style="color:var(--color-text-light)">Enter test text to see matches...</span>';
            matchArea.style.display = 'none';
            return;
        }

        try {
            var flags = '';
            if (flagG.checked) flags += 'g';
            if (flagI.checked) flags += 'i';
            if (flagM.checked) flags += 'm';
            if (flagS.checked) flags += 's';
            if (flagU.checked) flags += 'u';

            var regex;
            try {
                regex = new RegExp(pat, flags);
            } catch (e) {
                errorDiv.textContent = 'Invalid regex: ' + e.message;
                errorDiv.style.display = 'block';
                highlighted.innerHTML = escapeHtml(text);
                matchArea.style.display = 'none';
                return;
            }

            var matches = [];
            var hasGlobal = regex.global || flags.indexOf('g') !== -1;
            if (hasGlobal) {
                var m;
                while ((m = regex.exec(text)) !== null) {
                    var groups = [];
                    for (var k = 0; k < m.length; k++) {
                        groups.push(m[k] !== undefined ? m[k] : undefined);
                    }
                    matches.push({ full: m[0], index: m.index, groups: groups });
                    if (m.index === regex.lastIndex) regex.lastIndex++;
                }
            } else {
                var single = regex.exec(text);
                if (single) {
                    var groups = [];
                    for (var k = 0; k < single.length; k++) {
                        groups.push(single[k] !== undefined ? single[k] : undefined);
                    }
                    matches.push({ full: single[0], index: single.index, groups: groups });
                }
            }

            if (matches.length === 0) {
                highlighted.innerHTML = escapeHtml(text);
                matchCount.textContent = '0 matches';
                matchTable.innerHTML = '';
                matchArea.style.display = 'block';
                return;
            }

            var sorted = matches.slice().sort(function(a, b) { return a.index - b.index; });
            var html = '';
            var lastIdx = 0;
            for (var i = 0; i < sorted.length; i++) {
                var m = sorted[i];
                if (m.index > lastIdx) {
                    html += escapeHtml(text.substring(lastIdx, m.index));
                }
                html += '<mark>' + escapeHtml(m.full) + '</mark>';
                lastIdx = m.index + m.full.length;
            }
            if (lastIdx < text.length) {
                html += escapeHtml(text.substring(lastIdx));
            }
            highlighted.innerHTML = html;

            matchCount.textContent = matches.length + ' match' + (matches.length !== 1 ? 'es' : '');

            var tableHtml = '<table><thead><tr><th>#</th><th>Match</th><th>Position</th>';
            var maxGroups = 0;
            for (var i = 0; i < matches.length; i++) {
                if (matches[i].groups && matches[i].groups.length > 1) {
                    maxGroups = Math.max(maxGroups, matches[i].groups.length - 1);
                }
            }
            for (var g = 1; g <= maxGroups; g++) {
                tableHtml += '<th>Group ' + g + '</th>';
            }
            tableHtml += '</tr></thead><tbody>';
            for (var i = 0; i < matches.length; i++) {
                tableHtml += '<tr class="match-row"><td>' + (i + 1) + '</td><td>' + escapeHtml(matches[i].full) + '</td><td>' + matches[i].index + '</td>';
                if (matches[i].groups) {
                    for (var g = 1; g <= maxGroups; g++) {
                        var val = matches[i].groups[g] !== undefined ? matches[i].groups[g] : '';
                        tableHtml += '<td>' + escapeHtml(val) + '</td>';
                    }
                }
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table>';
            matchTable.innerHTML = tableHtml;
            matchArea.style.display = 'block';

        } catch (e) {
            errorDiv.textContent = 'Error: ' + e.message;
            errorDiv.style.display = 'block';
            highlighted.innerHTML = escapeHtml(text);
            matchArea.style.display = 'none';
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    init();
});
