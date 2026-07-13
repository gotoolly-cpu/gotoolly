/* ============================================
   GO TOOLLY - TEXT DIFF / COMPARE
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var textA = document.getElementById('text-a');
    var textB = document.getElementById('text-b');
    var compareBtn = document.getElementById('compare-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var resultArea = document.getElementById('result-area');
    var resultContent = document.getElementById('result-content');
    var statsArea = document.getElementById('stats');
    var statAdded = document.getElementById('stat-added');
    var statRemoved = document.getElementById('stat-removed');
    var statUnchanged = document.getElementById('stat-unchanged');

    compareBtn.addEventListener('click', compareTexts);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);

    function compareTexts() {
        var a = textA.value;
        var b = textB.value;
        if (!a.trim() && !b.trim()) {
            showNotification('Please enter text in both fields', true);
            return;
        }

        var linesA = a.split('\n');
        var linesB = b.split('\n');
        var lcs = computeLCS(linesA, linesB);
        var result = buildDiff(linesA, linesB, lcs);

        var added = 0, removed = 0, unchanged = 0;
        for (var i = 0; i < result.length; i++) {
            if (result[i].type === 'added') added++;
            else if (result[i].type === 'removed') removed++;
            else unchanged++;
        }

        var html = '';
        for (var i = 0; i < result.length; i++) {
            var line = result[i];
            var escaped = escapeHtml(line.text);
            if (line.type === 'added') {
                html += '<div class="diff-line diff-added"><span class="diff-prefix">+</span>' + escaped + '</div>';
            } else if (line.type === 'removed') {
                html += '<div class="diff-line diff-removed"><span class="diff-prefix">-</span>' + escaped + '</div>';
            } else {
                html += '<div class="diff-line diff-unchanged"><span class="diff-prefix">&nbsp;</span>' + escaped + '</div>';
            }
        }

        resultContent.innerHTML = html;
        resultArea.style.display = 'block';

        statAdded.textContent = added;
        statRemoved.textContent = removed;
        statUnchanged.textContent = unchanged;
        statsArea.style.display = 'grid';
    }

    function computeLCS(a, b) {
        var m = a.length, n = b.length;
        var dp = [];
        for (var i = 0; i <= m; i++) {
            dp[i] = [];
            for (var j = 0; j <= n; j++) {
                if (i === 0 || j === 0) dp[i][j] = 0;
                else if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }

        var result = [];
        var i = m, j = n;
        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) {
                result.unshift({ type: 'unchanged', text: a[i - 1] });
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        return result;
    }

    function buildDiff(linesA, linesB, lcs) {
        var result = [];
        var ai = 0, bi = 0, li = 0;

        while (ai < linesA.length || bi < linesB.length) {
            if (li < lcs.length && ai < linesA.length && bi < linesB.length &&
                linesA[ai] === lcs[li].text && linesB[bi] === lcs[li].text) {
                result.push({ type: 'unchanged', text: linesA[ai] });
                ai++; bi++; li++;
            } else if (ai < linesA.length && (li >= lcs.length || linesA[ai] !== lcs[li].text)) {
                result.push({ type: 'removed', text: linesA[ai] });
                ai++;
            } else if (bi < linesB.length) {
                result.push({ type: 'added', text: linesB[bi] });
                bi++;
            }
        }
        return result;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function copyResult() {
        var text = resultContent.textContent || resultContent.innerText;
        try {
            navigator.clipboard.writeText(text).then(function() {
                copyBtn.textContent = 'Copied!';
                setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 2000);
            }).catch(function() { fallbackCopy(text); });
        } catch (e) { fallbackCopy(text); }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); copyBtn.textContent = 'Copied!'; }
        catch (e) { copyBtn.textContent = 'Failed'; }
        document.body.removeChild(ta);
        setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 2000);
    }

    function resetTool() {
        textA.value = '';
        textB.value = '';
        resultArea.style.display = 'none';
        statsArea.style.display = 'none';
        resultContent.innerHTML = '';
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
