/* ============================================
   GO TOOLLY - DUPLICATE LINE REMOVER v2
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var textInput = document.getElementById('text-input');
    var removeBtn = document.getElementById('remove-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var statOriginal = document.getElementById('stat-original');
    var statUnique = document.getElementById('stat-unique');
    var statRemoved = document.getElementById('stat-removed');
    var statPercent = document.getElementById('stat-percent');
    var statTime = document.getElementById('stat-time');
    var sortCheck = document.getElementById('sort-lines');
    var caseSensitive = document.getElementById('case-sensitive');
    var trimWhitespace = document.getElementById('trim-whitespace');
    var originalText = document.getElementById('original-text');
    var originalHeaderStats = document.getElementById('original-header-stats');
    var uniqueHeaderStats = document.getElementById('unique-header-stats');
    var resultsActions = document.getElementById('results-actions');
    var optionsList = document.getElementById('options-list');
    var optionsCard = document.getElementById('options-card');
    var copyMainBtn = document.getElementById('copy-main-btn');
    var copyOriginalBtn = document.getElementById('copy-original-btn');
    var downloadTxtBtn = document.getElementById('download-txt-btn');
    var downloadCsvBtn = document.getElementById('download-csv-btn');
    var swapBtn = document.getElementById('swap-btn');
    var removeAnotherBtn = document.getElementById('remove-another-btn');
    var actionBar = document.getElementById('action-bar');
    var resultHeading = document.getElementById('result-heading');
    var resultLine1 = document.getElementById('result-line-1');
    var resultLine2 = document.getElementById('result-line-2');
    var statOrderPreserved = document.getElementById('stat-order-preserved');
    var statCaseComparison = document.getElementById('stat-case-comparison');
    var statWhitespaceHandling = document.getElementById('stat-whitespace-handling');

    var lastResult = '';

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    removeBtn.addEventListener('click', removeDuplicates);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);
    if (copyMainBtn) copyMainBtn.addEventListener('click', copyResult);
    if (copyOriginalBtn) copyOriginalBtn.addEventListener('click', copyOriginal);
    if (downloadTxtBtn) downloadTxtBtn.addEventListener('click', downloadTxt);
    if (downloadCsvBtn) downloadCsvBtn.addEventListener('click', downloadCsv);
    if (swapBtn) swapBtn.addEventListener('click', swapToInput);
    if (removeAnotherBtn) removeAnotherBtn.addEventListener('click', resetTool);

    function removeDuplicates() {
        var startTime = performance.now();
        var text = textInput.value;
        if (!text.trim()) {
            showNotification('Please enter some text', true);
            return;
        }

        var lines = text.split('\n');
        var originalCount = lines.length;
        var seen = {};
        var counts = {};
        var unique = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var key = trimWhitespace.checked ? line.trim() : line;
            if (!caseSensitive.checked) key = key.toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
            if (!seen[key]) {
                seen[key] = true;
                unique.push(line);
            }
        }

        if (sortCheck.checked) {
            unique.sort(function(a, b) {
                var x = caseSensitive.checked ? a : a.toLowerCase();
                var y = caseSensitive.checked ? b : b.toLowerCase();
                return x.localeCompare(y);
            });
        }

        var result = unique.join('\n');
        var removedCount = originalCount - unique.length;
        var charsAfter = result.length;
        var elapsed = performance.now() - startTime;
        var dupPercent = originalCount > 0 ? ((removedCount / originalCount) * 100).toFixed(1) : '0.0';
        lastResult = result;

        var originalHtml = '';
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var key = trimWhitespace.checked ? line.trim() : line;
            if (!caseSensitive.checked) key = key.toLowerCase();
            var escaped = escapeHtml(line);
            if (counts[key] > 1) {
                originalHtml += '<span class="line-duplicate">' + (escaped || '\u00A0') + '</span>\n';
            } else {
                originalHtml += escaped + '\n';
            }
        }

        resultText.textContent = result;
        originalText.innerHTML = originalHtml;
        resultArea.style.display = 'block';

        statOriginal.textContent = originalCount.toLocaleString();
        statUnique.textContent = unique.length.toLocaleString();
        statRemoved.textContent = removedCount.toLocaleString();
        if (statPercent) statPercent.textContent = dupPercent + '%';
        if (statTime) statTime.textContent = elapsed < 1 ? '<1 ms' : elapsed.toFixed(0) + ' ms';

        if (statOrderPreserved) statOrderPreserved.textContent = sortCheck.checked ? 'Alphabetically Sorted' : 'Preserved';
        if (statCaseComparison) statCaseComparison.textContent = caseSensitive.checked ? 'Sensitive' : 'Insensitive';
        if (statWhitespaceHandling) statWhitespaceHandling.textContent = trimWhitespace.checked ? 'Trimmed' : 'Preserved';

        if (originalHeaderStats) {
            originalHeaderStats.innerHTML = '<span class="header-stat">' + originalCount.toLocaleString() + ' Lines</span><span class="header-stat">' + text.length.toLocaleString() + ' Characters</span>';
        }
        if (uniqueHeaderStats) {
            uniqueHeaderStats.innerHTML = '<span class="header-stat">' + unique.length.toLocaleString() + ' Lines</span><span class="header-stat">' + charsAfter.toLocaleString() + ' Characters</span>';
        }

        if (removedCount === 0) {
            if (resultHeading) resultHeading.textContent = '✅ No duplicate lines were found.';
            if (resultLine1) resultLine1.style.display = 'none';
            if (resultLine2) {
                resultLine2.style.display = 'block';
                resultLine2.textContent = 'Your text already contains only unique lines.';
            }
        } else {
            if (resultHeading) resultHeading.textContent = '✓ Duplicate Lines Removed Successfully';
            if (resultLine1) {
                resultLine1.style.display = 'block';
                resultLine1.textContent = 'Removed ' + removedCount.toLocaleString() + ' duplicate line' + (removedCount === 1 ? '' : 's') + ' while preserving the first occurrence of every unique line.';
            }
            if (resultLine2) resultLine2.style.display = 'none';
        }

        renderOptions();

        if (resultsActions) resultsActions.style.display = 'flex';
        if (actionBar) actionBar.style.display = 'none';
    }

    function renderOptions() {
        if (!optionsList || !optionsCard) return;
        var opts = [
            { id: 'trim-whitespace', label: 'Trim Whitespace' },
            { id: 'case-sensitive', label: 'Case Sensitive' },
            { id: 'sort-lines', label: 'Alphabetical Sorting' }
        ];
        var hasAny = false;
        var html = '';
        opts.forEach(function(o) {
            var el = document.getElementById(o.id);
            var checked = el && el.checked;
            if (!checked) return;
            hasAny = true;
            html += '<span class="option-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' + o.label + '</span>';
        });
        optionsList.innerHTML = html;
        optionsCard.style.display = hasAny ? 'block' : 'none';
    }

    function copyResult() {
        var text = lastResult || resultText.textContent;
        try {
            navigator.clipboard.writeText(text).then(function() {
                var btn = copyMainBtn || copyBtn;
                if (btn) {
                    btn.textContent = '✓ Copied to clipboard';
                    setTimeout(function() { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Result'; }, 2000);
                }
            }).catch(function() { fallbackCopy(text, true); });
        } catch (e) { fallbackCopy(text, true); }
    }

    function copyOriginal() {
        var text = textInput.value;
        try {
            navigator.clipboard.writeText(text).then(function() {
                if (copyOriginalBtn) {
                    copyOriginalBtn.textContent = '✓ Copied to clipboard';
                    setTimeout(function() { copyOriginalBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy'; }, 2000);
                }
            }).catch(function() { fallbackCopy(text, false); });
        } catch (e) { fallbackCopy(text, false); }
    }

    function downloadTxt() {
        var text = lastResult || resultText.textContent;
        var blob = new Blob([text], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'unique-lines.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Downloaded TXT file', false);
    }

    function downloadCsv() {
        var text = lastResult || resultText.textContent;
        var lines = text.split('\n');
        var csvContent = lines.map(function(line) {
            return '"' + line.replace(/"/g, '""') + '"';
        }).join('\r\n');
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'unique-lines.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Downloaded CSV file', false);
    }

    function swapToInput() {
        var text = lastResult || resultText.textContent;
        if (!textInput) return;
        textInput.value = text;
        resultArea.style.display = 'none';
        resultText.textContent = '';
        if (originalText) originalText.textContent = '';
        if (resultsActions) resultsActions.style.display = 'none';
        if (actionBar) actionBar.style.display = 'grid';
        textInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function fallbackCopy(text, isMain) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            var btn = isMain ? (copyMainBtn || copyBtn) : copyOriginalBtn;
            if (btn) {
                btn.textContent = '✓ Copied to clipboard';
                var restore = isMain ? function() { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Result'; } : function() { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy'; };
                setTimeout(restore, 2000);
            }
        } catch (e) {
            if (isMain && copyMainBtn) copyMainBtn.textContent = 'Failed';
        }
        document.body.removeChild(ta);
    }

    function resetTool() {
        textInput.value = '';
        lastResult = '';
        resultArea.style.display = 'none';
        resultText.textContent = '';
        if (originalText) originalText.textContent = '';
        if (resultsActions) resultsActions.style.display = 'none';
        if (actionBar) actionBar.style.display = 'grid';
        trimWhitespace.checked = true;
        sortCheck.checked = false;
        caseSensitive.checked = false;
        textInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showNotification(msg, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }
});