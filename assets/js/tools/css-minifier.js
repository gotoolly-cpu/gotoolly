/* ============================================
   GO TOOLLY - CSS MINIFIER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('css-input');
    var minifyBtn = document.getElementById('minify-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var statsArea = document.getElementById('stats');
    var statOriginal = document.getElementById('stat-original');
    var statMinified = document.getElementById('stat-minified');
    var statSavings = document.getElementById('stat-savings');

    minifyBtn.addEventListener('click', minifyCss);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);

    function minifyCss() {
        var css = input.value;
        if (!css.trim()) {
            showNotification('Please enter CSS code', true);
            return;
        }

        var originalSize = css.length;
        var minified = css
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .replace(/\s*([{}:;,])\s*/g, '$1')
            .replace(/;}/g, '}')
            .trim();

        var minifiedSize = minified.length;
        var savings = originalSize > 0 ? Math.round((1 - minifiedSize / originalSize) * 100) : 0;

        resultText.textContent = minified;
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
