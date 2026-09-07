document.addEventListener('DOMContentLoaded', function() {
    var textInput = document.getElementById('text-input');
    var cleanBtn = document.getElementById('clean-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var copyOriginalBtn = document.getElementById('copy-original-btn');
    var copyMainBtn = document.getElementById('copy-main-btn');
    var copySingleBtn = document.getElementById('copy-single-btn');
    var clearResultsBtn = document.getElementById('clear-results-btn');
    var downloadTxtBtn = document.getElementById('download-txt-btn');
    var swapResultBtn = document.getElementById('swap-result-btn');
    var resultPlaceholder = document.getElementById('result-placeholder');
    var resultsPanel = document.getElementById('results-panel');
    var resultText = document.getElementById('result-text');
    var originalText = document.getElementById('original-text');
    var removeExtraSpaces = document.getElementById('remove-extra-spaces');
    var removeEmptyLines = document.getElementById('remove-empty-lines');
    var trimLines = document.getElementById('trim-lines');
    var removeSpecialChars = document.getElementById('remove-special-chars');
    var statusBadge = document.getElementById('status-badge');
    var resultHeading = document.getElementById('result-heading');
    var resultLine1 = document.getElementById('result-line-1');
    var resultLine2 = document.getElementById('result-line-2');
    var resultLine3 = document.getElementById('result-line-3');
    var successBanner = document.getElementById('success-banner');
    var summarySelected = document.getElementById('summary-selected');
    var summaryApplied = document.getElementById('summary-applied');
    var summaryChanges = document.getElementById('summary-changes');
    var summaryStatus = document.getElementById('summary-status');
    var statsChanges = document.getElementById('stats-changes');
    var statsClean = document.getElementById('stats-clean');
    var statCharsBefore = document.getElementById('stat-chars-before');
    var statCharsAfter = document.getElementById('stat-chars-after');
    var statCharsRemoved = document.getElementById('stat-chars-removed');
    var statWordsBefore = document.getElementById('stat-words-before');
    var statWordsAfter = document.getElementById('stat-words-after');
    var statLinesBefore = document.getElementById('stat-lines-before');
    var statLinesAfter = document.getElementById('stat-lines-after');
    var statWsRemoved = document.getElementById('stat-ws-removed');
    var statTime = document.getElementById('stat-time');
    var statCleanChars = document.getElementById('stat-clean-chars');
    var statCleanWords = document.getElementById('stat-clean-words');
    var statCleanLines = document.getElementById('stat-clean-lines');
    var operationsList = document.getElementById('operations-list');
    var textSingle = document.getElementById('text-single');
    var textDual = document.getElementById('text-dual');
    var singleText = document.getElementById('single-text');
    var singleHeaderStats = document.getElementById('single-header-stats');
    var originalHeaderStats = document.getElementById('original-header-stats');
    var cleanedHeaderStats = document.getElementById('cleaned-header-stats');

    var lastCleanedText = '';

    function showToast(message, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();
        var t = document.createElement('div');
        t.className = 'toast ' + (type || 'success');
        var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        if (type === 'error') {
            icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        }
        t.innerHTML = icon + '<span>' + message + '</span>';
        document.body.appendChild(t);
        requestAnimationFrame(function() {
            t.classList.add('show');
        });
        setTimeout(function() {
            t.classList.remove('show');
            setTimeout(function() { t.remove(); }, 300);
        }, 3000);
    }

    function countWords(text) {
        return text.split(/\s+/).filter(function(w) { return w.length > 0; }).length;
    }

    function countLines(text) {
        return text.split('\n').length;
    }

    function countWhitespace(text) {
        return (text.match(/\s/g) || []).length;
    }

    function copyToClipboard(text, callback) {
        try {
            navigator.clipboard.writeText(text).then(function() {
                if (callback) callback(true);
            }).catch(function() {
                fallbackCopy(text, callback);
            });
        } catch (e) {
            fallbackCopy(text, callback);
        }
    }

    function fallbackCopy(text, callback) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            if (callback) callback(true);
        } catch (e) {
            if (callback) callback(false);
        }
        document.body.removeChild(textarea);
    }

    function setSmallCopyBtn(btn, copied) {
        if (copied) {
            btn.classList.add('copied');
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        } else {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
        }
    }

    function setMainCopyBtn(copied) {
        if (copied) {
            copyMainBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        } else {
            copyMainBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Cleaned Text';
        }
    }

    function formatTime(ms) {
        if (ms < 1) return '<1 ms';
        return ms + ' ms';
    }

    function downloadTxt(text, filename) {
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function setHeaderStats(el, chars, words, lines) {
        el.innerHTML = '<span class="header-stat">' + chars + ' chars</span><span class="header-stat">' + words + ' words</span><span class="header-stat">' + lines + ' lines</span>';
    }

    function buildOperations(allOps) {
        operationsList.innerHTML = '';
        allOps.forEach(function(op) {
            var item = document.createElement('div');
            item.className = 'operation-item ' + op.state;

            var iconWrap = document.createElement('div');
            iconWrap.className = 'op-icon';
            if (op.state === 'changed') {
                iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            } else if (op.state === 'no-change') {
                iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
            } else {
                iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
            }

            var content = document.createElement('div');
            content.className = 'operation-content';
            var name = document.createElement('span');
            name.className = 'operation-name';
            name.textContent = op.name;
            content.appendChild(name);
            var sub = document.createElement('span');
            sub.className = 'operation-subtext';
            sub.textContent = op.subtext;
            content.appendChild(sub);

            item.appendChild(iconWrap);
            item.appendChild(content);
            operationsList.appendChild(item);
        });
    }

    cleanBtn.addEventListener('click', cleanText);
    resetBtn.addEventListener('click', resetTool);
    clearResultsBtn.addEventListener('click', resetTool);

    copyBtn.addEventListener('click', function() { copyCleanedText(); });
    copyOriginalBtn.addEventListener('click', function() {
        var text = originalText.textContent;
        if (!text) return;
        copyToClipboard(text, function(ok) {
            if (ok) {
                setSmallCopyBtn(copyOriginalBtn, true);
                showToast('Original text copied successfully');
                setTimeout(function() { setSmallCopyBtn(copyOriginalBtn, false); }, 2000);
            }
        });
    });
    copyMainBtn.addEventListener('click', function() { copyCleanedText(); });
    copySingleBtn.addEventListener('click', function() {
        if (!lastCleanedText) return;
        copyToClipboard(lastCleanedText, function(ok) {
            if (ok) {
                setSmallCopyBtn(copySingleBtn, true);
                setMainCopyBtn(true);
                showToast('Cleaned text copied successfully');
                setTimeout(function() {
                    setSmallCopyBtn(copySingleBtn, false);
                    setMainCopyBtn(false);
                }, 2000);
            }
        });
    });

    downloadTxtBtn.addEventListener('click', function() {
        if (!lastCleanedText) return;
        downloadTxt(lastCleanedText, 'gotoolly-cleaned-text.txt');
        showToast('Downloaded as gotoolly-cleaned-text.txt');
    });

    swapResultBtn.addEventListener('click', function() {
        if (!lastCleanedText) return;
        var textToSwap = lastCleanedText;

        resultPlaceholder.style.display = '';
        resultsPanel.classList.remove('show');
        statusBadge.className = 'status-badge ready';
        statusBadge.textContent = 'Ready';
        textSingle.style.display = 'none';
        textDual.style.display = '';
        resultText.textContent = '';
        originalText.textContent = '';
        singleText.textContent = '';
        singleHeaderStats.innerHTML = '';
        originalHeaderStats.innerHTML = '';
        cleanedHeaderStats.innerHTML = '';
        setSmallCopyBtn(copyBtn, false);
        setSmallCopyBtn(copyOriginalBtn, false);
        setSmallCopyBtn(copySingleBtn, false);
        setMainCopyBtn(false);

        textInput.value = textToSwap;
        textInput.focus();
        showToast('Cleaned text moved back to the input area');
    });

    function copyCleanedText() {
        var text = resultText.textContent;
        if (!text) return;
        copyToClipboard(text, function(ok) {
            if (ok) {
                setSmallCopyBtn(copyBtn, true);
                setMainCopyBtn(true);
                showToast('Cleaned text copied successfully');
                setTimeout(function() {
                    setSmallCopyBtn(copyBtn, false);
                    setMainCopyBtn(false);
                }, 2000);
            } else {
                showToast('Failed to copy text', 'error');
            }
        });
    }

    function cleanText() {
        var text = textInput.value;
        if (!text.trim()) {
            showToast('Please enter some text to clean', 'error');
            textInput.focus();
            return;
        }

        var startTime = performance.now();
        var before = text.length;
        var cleaned = text;
        var ops = [];

        if (removeSpecialChars.checked) {
            var stepBefore = cleaned;
            cleaned = cleaned.replace(/[^a-zA-Z0-9\s\.\,\!\?\-]/g, '');
            ops.push({ name: 'Remove Special Characters', changed: cleaned !== stepBefore, before: stepBefore.length, after: cleaned.length });
        }

        if (trimLines.checked) {
            var stepBefore = cleaned;
            cleaned = cleaned.split('\n').map(function(line) { return line.trim(); }).join('\n');
            ops.push({ name: 'Trim Line Starts/Ends', changed: cleaned !== stepBefore, before: stepBefore.length, after: cleaned.length });
        }

        if (removeEmptyLines.checked) {
            var stepBefore = cleaned;
            cleaned = cleaned.split('\n').filter(function(line) { return line.trim(); }).join('\n');
            ops.push({ name: 'Remove Empty Lines', changed: cleaned !== stepBefore, before: stepBefore.length, after: cleaned.length });
        }

        if (removeExtraSpaces.checked) {
            var stepBefore = cleaned;
            cleaned = cleaned.replace(/  +/g, ' ');
            ops.push({ name: 'Remove Extra Spaces', changed: cleaned !== stepBefore, before: stepBefore.length, after: cleaned.length });
        }

        var endTime = performance.now();
        var after = cleaned.length;
        var removed = before - after;
        var processingTime = Math.round(endTime - startTime);
        var isAlreadyClean = cleaned === text;
        var appliedCount = ops.filter(function(op) { return op.changed; }).length;
        var selectedCount = ops.length;

        var wordsBefore = countWords(text);
        var wordsAfter = countWords(cleaned);
        var linesBefore = countLines(text);
        var linesAfter = countLines(cleaned);
        var wsBefore = countWhitespace(text);
        var wsAfter = countWhitespace(cleaned);
        var wsRemoved = wsBefore - wsAfter;

        lastCleanedText = cleaned;

        resultPlaceholder.style.display = 'none';
        resultsPanel.classList.add('show');

        statusBadge.className = 'status-badge done';
        statusBadge.textContent = 'Done';

        summarySelected.textContent = selectedCount;
        summaryApplied.textContent = appliedCount;
        summaryChanges.textContent = isAlreadyClean ? 'No' : 'Yes';
        summaryChanges.className = 'summary-value' + (isAlreadyClean ? ' neutral' : ' positive');
        summaryStatus.textContent = isAlreadyClean ? 'Already Clean' : 'Cleaned';
        summaryStatus.className = 'summary-value' + (isAlreadyClean ? ' neutral' : ' positive');

        if (isAlreadyClean) {
            resultHeading.textContent = 'No Cleaning Required';
            resultLine1.textContent = 'Your text was already clean.';
            resultLine2.textContent = 'No modifications were necessary.';
            resultLine3.textContent = '';
            successBanner.className = 'success-banner clean';
            statsChanges.style.display = 'none';
            statsClean.style.display = '';
            statCleanChars.textContent = before;
            statCleanWords.textContent = wordsBefore;
            statCleanLines.textContent = linesBefore;
        } else {
            resultHeading.textContent = 'Cleaning Complete';
            var opWord = appliedCount === 1 ? 'operation' : 'operations';
            resultLine1.textContent = appliedCount + ' cleaning ' + opWord + ' modified your text.';
            if (removed > 0) {
                var charWord = removed === 1 ? 'character was' : 'characters were';
                resultLine2.textContent = removed + ' ' + charWord + ' removed.';
            } else {
                resultLine2.textContent = '';
            }
            resultLine3.textContent = 'Your cleaned text is ready to copy or download.';
            successBanner.className = 'success-banner';
            statsChanges.style.display = '';
            statsClean.style.display = 'none';
            statCharsBefore.textContent = before;
            statCharsAfter.textContent = after;
            statCharsRemoved.textContent = removed;
            statWordsBefore.textContent = wordsBefore;
            statWordsAfter.textContent = wordsAfter;
            statLinesBefore.textContent = linesBefore;
            statLinesAfter.textContent = linesAfter;
            statWsRemoved.textContent = wsRemoved;
        }

        statTime.textContent = formatTime(processingTime);

        var allOps = [];
        var allOpDefs = [
            { name: 'Remove Extra Spaces', checked: removeExtraSpaces },
            { name: 'Remove Empty Lines', checked: removeEmptyLines },
            { name: 'Trim Line Starts/Ends', checked: trimLines },
            { name: 'Remove Special Characters', checked: removeSpecialChars }
        ];
        allOpDefs.forEach(function(def) {
            var found = null;
            for (var i = 0; i < ops.length; i++) {
                if (ops[i].name === def.name) { found = ops[i]; break; }
            }
            if (found) {
                if (found.changed) {
                    var diff = found.before - found.after;
                    var subtext = diff > 0 ? diff + ' characters removed' : 'Changes applied';
                    allOps.push({ name: def.name, state: 'changed', subtext: subtext });
                } else {
                    allOps.push({ name: def.name, state: 'no-change', subtext: 'No changes required' });
                }
            } else {
                allOps.push({ name: def.name, state: 'not-selected', subtext: 'Not selected' });
            }
        });
        buildOperations(allOps);

        if (isAlreadyClean) {
            textSingle.style.display = '';
            textDual.style.display = 'none';
            singleText.textContent = text;
            setHeaderStats(singleHeaderStats, before, wordsBefore, linesBefore);
        } else {
            textSingle.style.display = 'none';
            textDual.style.display = '';
            originalText.textContent = text;
            resultText.textContent = cleaned;
            setHeaderStats(originalHeaderStats, before, wordsBefore, linesBefore);
            setHeaderStats(cleanedHeaderStats, after, wordsAfter, linesAfter);
        }

        setSmallCopyBtn(copyBtn, false);
        setSmallCopyBtn(copyOriginalBtn, false);
        setSmallCopyBtn(copySingleBtn, false);
        setMainCopyBtn(false);

        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function resetTool() {
        textInput.value = '';
        lastCleanedText = '';
        resultText.textContent = '';
        originalText.textContent = '';
        singleText.textContent = '';
        resultPlaceholder.style.display = '';
        resultsPanel.classList.remove('show');
        statsChanges.style.display = '';
        statsClean.style.display = 'none';
        statCharsBefore.textContent = '0';
        statCharsAfter.textContent = '0';
        statCharsRemoved.textContent = '0';
        statWordsBefore.textContent = '0';
        statWordsAfter.textContent = '0';
        statLinesBefore.textContent = '0';
        statLinesAfter.textContent = '0';
        statWsRemoved.textContent = '0';
        statTime.textContent = '<1 ms';
        statCleanChars.textContent = '0';
        statCleanWords.textContent = '0';
        statCleanLines.textContent = '0';
        summarySelected.textContent = '0';
        summaryApplied.textContent = '0';
        summaryChanges.textContent = 'No';
        summaryChanges.className = 'summary-value neutral';
        summaryStatus.textContent = 'Already Clean';
        summaryStatus.className = 'summary-value neutral';
        operationsList.innerHTML = '';
        statusBadge.className = 'status-badge ready';
        statusBadge.textContent = 'Ready';
        textSingle.style.display = 'none';
        textDual.style.display = '';
        singleHeaderStats.innerHTML = '';
        originalHeaderStats.innerHTML = '';
        cleanedHeaderStats.innerHTML = '';
        setSmallCopyBtn(copyBtn, false);
        setSmallCopyBtn(copyOriginalBtn, false);
        setSmallCopyBtn(copySingleBtn, false);
        setMainCopyBtn(false);
        textInput.focus();
    }
});
