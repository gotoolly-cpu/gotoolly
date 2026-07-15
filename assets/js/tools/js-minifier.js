/* ============================================
   GO TOOLLY - JAVASCRIPT MINIFIER
   ============================================
   NOTE: This is a BASIC whitespace/comment removal
   minifier. It is NOT a full AST-based minifier.
   It removes comments and unnecessary whitespace
   but does NOT perform variable renaming, dead code
   elimination, or other advanced optimizations.
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('js-input');
    var minifyBtn = document.getElementById('minify-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var statsArea = document.getElementById('stats');
    var statOriginal = document.getElementById('stat-original');
    var statMinified = document.getElementById('stat-minified');
    var statSavings = document.getElementById('stat-savings');

    minifyBtn.addEventListener('click', minifyJs);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);

    function minifyJs() {
        var code = input.value;
        if (!code.trim()) {
            showNotification('Please enter JavaScript code', true);
            return;
        }

        var originalSize = code.length;
        var result;

        try {
            result = code
                .replace(/\/\/[^\n]*/g, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/[ \t]+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();

            new Function(result);
        } catch (e) {
            showNotification('Syntax error: ' + e.message, true);
            return;
        }

        var minifiedSize = result.length;
        var savings = originalSize > 0 ? Math.round((1 - minifiedSize / originalSize) * 100) : 0;

        resultText.textContent = result;
        resultArea.style.display = 'block';

        statOriginal.textContent = originalSize + ' bytes';
        statMinified.textContent = minifiedSize + ' bytes';
        statSavings.textContent = savings + '%';
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
        input.value = '';
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
