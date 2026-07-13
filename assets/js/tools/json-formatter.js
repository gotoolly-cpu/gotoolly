/* ============================================
   GO TOOLLY - JSON FORMATTER & VALIDATOR
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('json-input');
    const output = document.getElementById('json-output');
    const status = document.getElementById('json-status');
    const stats = document.getElementById('json-stats');
    const formatBtn = document.getElementById('format-btn');
    const minifyBtn = document.getElementById('minify-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');

    formatBtn.addEventListener('click', formatJSON);
    minifyBtn.addEventListener('click', minifyJSON);
    copyBtn.addEventListener('click', copyOutput);
    clearBtn.addEventListener('click', clearAll);

    input.addEventListener('input', debounce(formatJSON, 500));

    function debounce(fn, ms) {
        let t;
        return function() { clearTimeout(t); t = setTimeout(fn, ms); };
    }

    function formatJSON() {
        const raw = input.value.trim();
        if (!raw) { reset(); return; }
        try {
            const parsed = JSON.parse(raw);
            const formatted = JSON.stringify(parsed, null, 2);
            output.innerHTML = syntaxHighlight(formatted);
            showStatus(true);
            showStats(parsed, formatted);
        } catch (e) {
            output.innerHTML = '<div class="json-error">Error: ' + escapeHtml(e.message) + '</div>';
            showStatus(false, e.message);
            stats.style.display = 'none';
        }
    }

    function minifyJSON() {
        const raw = input.value.trim();
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            const minified = JSON.stringify(parsed);
            input.value = minified;
            output.innerHTML = syntaxHighlight(minified);
            showStatus(true);
        } catch (e) {
            output.innerHTML = '<div class="json-error">Error: ' + escapeHtml(e.message) + '</div>';
            showStatus(false, e.message);
        }
    }

    function syntaxHighlight(json) {
        json = escapeHtml(json);
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g, function(match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                    match = match.replace(/:$/, '') + ':';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        }).split('\n').map(function(line, i) {
            return '<div class="json-line">' + (i + 1) + ': ' + line + '</div>';
        }).join('\n');
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function showStatus(valid, msg) {
        status.style.display = 'inline-block';
        status.className = 'json-status ' + (valid ? 'valid' : 'invalid');
        status.textContent = valid ? 'Valid JSON' : 'Invalid: ' + (msg || 'Parse error');
    }

    function showStats(obj, str) {
        stats.style.display = 'flex';
        document.getElementById('stat-keys').textContent = countKeys(obj);
        document.getElementById('stat-depth').textContent = getDepth(obj);
        document.getElementById('stat-size').textContent = formatBytes(new Blob([str]).size);
    }

    function countKeys(obj) {
        if (typeof obj !== 'object' || obj === null) return 0;
        let c = Array.isArray(obj) ? obj.length : Object.keys(obj).length;
        for (const v of Object.values(obj)) c += countKeys(v);
        return c;
    }

    function getDepth(obj) {
        if (typeof obj !== 'object' || obj === null) return 0;
        let d = 1;
        for (const v of Object.values(obj)) d = Math.max(d, 1 + getDepth(v));
        return d;
    }

    function formatBytes(b) {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(2) + ' MB';
    }

    function copyOutput() {
        const text = input.value.trim();
        if (!text) return;
        navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Output'; }, 1500);
        });
    }

    function clearAll() {
        input.value = '';
        output.innerHTML = '<div style="color:var(--color-text-light);text-align:center;padding:var(--space-8)">Formatted JSON will appear here</div>';
        status.style.display = 'none';
        stats.style.display = 'none';
    }

    function reset() {
        output.innerHTML = '<div style="color:var(--color-text-light);text-align:center;padding:var(--space-8)">Formatted JSON will appear here</div>';
        status.style.display = 'none';
        stats.style.display = 'none';
    }
});