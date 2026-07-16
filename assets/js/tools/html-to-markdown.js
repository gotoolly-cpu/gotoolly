/* ============================================
   GO TOOLLY - HTML TO MARKDOWN
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var htmlInput = document.getElementById('html-input');
    var mdOutput = document.getElementById('md-output');
    var copyBtn = document.getElementById('copy-btn');
    var downloadBtn = document.getElementById('download-btn');
    var clearBtn = document.getElementById('clear-btn');

    var turndownService = null;

    function init() {
        if (typeof TurndownService !== 'undefined') {
            turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
        }
        htmlInput.addEventListener('input', convert);
        copyBtn.addEventListener('click', copyResult);
        downloadBtn.addEventListener('click', downloadResult);
        clearBtn.addEventListener('click', clearAll);
    }

    function convert() {
        var html = htmlInput.value;
        if (!html.trim()) {
            mdOutput.textContent = '';
            return;
        }
        var md;
        if (turndownService) {
            try { md = turndownService.turndown(html); }
            catch (e) { md = htmlToMarkdownSimple(html); }
        } else {
            md = htmlToMarkdownSimple(html);
        }
        mdOutput.textContent = md;
    }

    function htmlToMarkdownSimple(html) {
        var text = html;
        text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
        text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
        text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
        text = text.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
        text = text.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
        text = text.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
        text = text.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
        text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
        text = text.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');
        text = text.replace(/<li>([\s\S]*?)<\/li>/gi, '- $1\n');
        text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<[^>]*>/g, '');
        text = text.replace(/\n{3,}/g, '\n\n').trim();
        return text;
    }

    function copyResult() {
        var text = mdOutput.textContent;
        if (!text) { showNotification('Nothing to copy', true); return; }
        try {
            navigator.clipboard.writeText(text).then(function() {
                copyBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!';
                setTimeout(function() { copyBtn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copy Markdown'; }, 2000);
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
        try { document.execCommand('copy'); copyBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!'; }
        catch (e) { copyBtn.textContent = 'Failed'; }
        document.body.removeChild(ta);
        setTimeout(function() { copyBtn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copy Markdown'; }, 2000);
    }

    function downloadResult() {
        var text = mdOutput.textContent;
        if (!text) { showNotification('Nothing to download', true); return; }
        var blob = new Blob([text], { type: 'text/markdown' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'output.md';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    function clearAll() {
        htmlInput.value = '';
        mdOutput.textContent = '';
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
        if (typeof TurndownService !== 'undefined') { init(); return; }
        var a = 0, i = setInterval(function() {
            a++;
            if (typeof TurndownService !== 'undefined') { clearInterval(i); init(); }
            else if (a > 50) { clearInterval(i); init(); }
        }, 200);
    }

    waitForLib();
});
