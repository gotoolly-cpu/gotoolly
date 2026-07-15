/* ============================================
   GO TOOLLY - XML FORMATTER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('xml-input');
    var formatBtn = document.getElementById('format-btn');
    var minifyBtn = document.getElementById('minify-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var lineNumbers = document.getElementById('line-numbers');

    formatBtn.addEventListener('click', function() { formatXml(false); });
    minifyBtn.addEventListener('click', function() { formatXml(true); });
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);

    function formatXml(minify) {
        var xml = input.value;
        if (!xml.trim()) {
            showNotification('Please enter XML code', true);
            return;
        }

        var formatted;
        try {
            var parser = new DOMParser();
            var doc = parser.parseFromString(xml, 'text/xml');
            var errors = doc.getElementsByTagName('parsererror');
            if (errors.length > 0) {
                showNotification('Invalid XML: ' + errors[0].textContent, true);
                return;
            }

            if (minify) {
                var serializer = new XMLSerializer();
                formatted = serializer.serializeToString(doc);
            } else {
                formatted = prettyPrintXml(doc);
            }
        } catch (e) {
            showNotification('Error: ' + e.message, true);
            return;
        }

        resultText.textContent = formatted;
        resultArea.style.display = 'block';

        if (lineNumbers.checked) {
            var lines = formatted.split('\n');
            var numbered = lines.map(function(line, idx) {
                var num = idx + 1;
                var padding = '     ';
                var numStr = String(num);
                return padding.slice(numStr.length) + numStr + '  ' + line;
            }).join('\n');
            resultText.textContent = numbered;
        }
    }

    function prettyPrintXml(doc) {
        var serializer = new XMLSerializer();
        var xml = serializer.serializeToString(doc);
        xml = xml.replace(/>\s*</g, '>\n<');
        var lines = xml.split('\n');
        var indent = 0;
        var result = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith('</')) {
                indent--;
            }

            result.push('  '.repeat(Math.max(0, indent)) + line);

            if (line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<?') && !line.endsWith('/>') && line.indexOf('</') === -1) {
                indent++;
            }
        }

        return result.join('\n');
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
