/* ============================================
   GO TOOLLY - DUPLICATE LINE REMOVER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var textInput = document.getElementById('text-input');
    var removeBtn = document.getElementById('remove-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var statsArea = document.getElementById('stats');
    var statOriginal = document.getElementById('stat-original');
    var statUnique = document.getElementById('stat-unique');
    var statRemoved = document.getElementById('stat-removed');
    var sortCheck = document.getElementById('sort-lines');
    var caseSensitive = document.getElementById('case-sensitive');
    var trimWhitespace = document.getElementById('trim-whitespace');

    removeBtn.addEventListener('click', removeDuplicates);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);

    function removeDuplicates() {
        var text = textInput.value;
        if (!text.trim()) {
            showNotification('Please enter some text', true);
            return;
        }

        var lines = text.split('\n');
        var originalCount = lines.length;
        var seen = {};
        var unique = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var key = trimWhitespace.checked ? line.trim() : line;
            if (!caseSensitive.checked) key = key.toLowerCase();

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

        resultText.textContent = result;
        resultArea.style.display = 'block';

        statOriginal.textContent = originalCount;
        statUnique.textContent = unique.length;
        statRemoved.textContent = removedCount;
        statsArea.style.display = 'grid';
    }

    function copyResult() {
        var text = resultText.textContent;
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
        textInput.value = '';
        resultArea.style.display = 'none';
        statsArea.style.display = 'none';
        resultText.textContent = '';
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
