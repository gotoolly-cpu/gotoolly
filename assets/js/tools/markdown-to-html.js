/* ============================================
   GO TOOLLY - MARKDOWN TO HTML
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var mdInput = document.getElementById('md-input');
    var htmlPreview = document.getElementById('html-preview');
    var rawHtml = document.getElementById('raw-html');
    var rawArea = document.getElementById('raw-area');
    var copyBtn = document.getElementById('copy-html-btn');
    var downloadBtn = document.getElementById('download-html-btn');
    var clearBtn = document.getElementById('clear-btn');

    function init() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({ breaks: true, gfm: true });
        }
        mdInput.addEventListener('input', convert);
        copyBtn.addEventListener('click', copyResult);
        downloadBtn.addEventListener('click', downloadResult);
        clearBtn.addEventListener('click', clearAll);
        convert();
    }

    function convert() {
        var text = mdInput.value;
        if (!text.trim()) {
            htmlPreview.innerHTML = '<p style="color:var(--color-text-light);font-style:italic">Preview will appear here...</p>';
            rawArea.style.display = 'none';
            return;
        }
        var html;
        if (typeof marked !== 'undefined') {
            html = marked.parse(text);
        } else {
            html = simpleRender(text);
        }
        htmlPreview.innerHTML = html;
        rawHtml.textContent = html;
        rawArea.style.display = 'block';
    }

    function simpleRender(md) {
        var h = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
        h = h.replace(/`(.+?)`/g, '<code>$1</code>');
        h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        h = h.replace(/^\- (.+)$/gm, '<li>$1</li>');
        h = h.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        h = h.replace(/\n\n/g, '</p><p>');
        h = '<p>' + h + '</p>';
        h = h.replace(/<p><\/p>/g, '');
        return h;
    }

    function copyResult() {
        var html = rawHtml.textContent;
        if (!html) { showNotification('Nothing to copy', true); return; }
        try {
            navigator.clipboard.writeText(html).then(function() {
                copyBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!';
                setTimeout(function() { copyBtn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copy HTML'; }, 2000);
            }).catch(function() { fallbackCopy(html); });
        } catch (e) { fallbackCopy(html); }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); copyBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!'; }
        catch (e) { copyBtn.textContent = 'Failed'; }
        document.body.removeChild(ta);
        setTimeout(function() { copyBtn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copy HTML'; }, 2000);
    }

    function downloadResult() {
        var html = rawHtml.textContent;
        if (!html) { showNotification('Nothing to download', true); return; }
        var full = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Converted</title></head><body>' + html + '</body></html>';
        var blob = new Blob([full], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'output.html';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    function clearAll() {
        mdInput.value = '';
        htmlPreview.innerHTML = '<p style="color:var(--color-text-light);font-style:italic">Preview will appear here...</p>';
        rawArea.style.display = 'none';
        rawHtml.textContent = '';
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

    function waitForLib() {
        if (typeof marked !== 'undefined') { init(); return; }
        var a = 0, i = setInterval(function() {
            a++;
            if (typeof marked !== 'undefined') { clearInterval(i); init(); }
            else if (a > 50) { clearInterval(i); init(); }
        }, 200);
    }

    waitForLib();
});
