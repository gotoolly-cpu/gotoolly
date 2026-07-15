/* ============================================
   GO TOOLLY - MARKDOWN EDITOR
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var mdInput = document.getElementById('md-input');
    var mdPreview = document.getElementById('md-preview');
    var wordCount = document.getElementById('word-count');
    var charCount = document.getElementById('char-count');
    var fullscreenBtn = document.getElementById('fullscreen-btn');
    var downloadMdBtn = document.getElementById('download-md-btn');
    var downloadHtmlBtn = document.getElementById('download-html-btn');
    var copyHtmlBtn = document.getElementById('copy-html-btn');
    var editor = document.getElementById('md-editor');
    var fullscreenExitBtn = document.getElementById('fullscreen-exit-btn');

    var isFullscreen = false;
    var prevScroll = 0;

    function init() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({ breaks: true, gfm: true });
        }
        mdInput.addEventListener('input', updatePreview);
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        fullscreenExitBtn.addEventListener('click', toggleFullscreen);
        downloadMdBtn.addEventListener('click', downloadMd);
        downloadHtmlBtn.addEventListener('click', downloadHtml);
        copyHtmlBtn.addEventListener('click', copyHtml);
        updatePreview();
    }

    function simpleRender(md) {
        var escapeHtml = function(t) {
            return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };
        var html = escapeHtml(md);
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        html = html.replace(/^(\d+)\. (.+)$/gm, '<li value="$1">$2</li>');
        html = html.replace(/(<li value=".*<\/li>\n?)+/g, '<ol>$&</ol>');
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><\/p>/g, '');
        return html;
    }

    function updatePreview() {
        var text = mdInput.value;
        var html;
        if (typeof marked !== 'undefined') {
            html = marked.parse(text);
        } else {
            html = text ? simpleRender(text) : '';
        }
        mdPreview.innerHTML = html;

        var words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = words;
        charCount.textContent = text.length;
    }

    function toggleFullscreen() {
        isFullscreen = !isFullscreen;
        editor.classList.toggle('fullscreen', isFullscreen);
        fullscreenBtn.innerHTML = isFullscreen
            ? '<i class="fas fa-compress" aria-hidden="true"></i> Exit Fullscreen'
            : '<i class="fas fa-expand" aria-hidden="true"></i> Fullscreen';
        if (isFullscreen) {
            prevScroll = window.scrollY;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            window.scrollTo(0, prevScroll);
        }
    }

    function downloadMd() {
        var text = mdInput.value;
        if (!text.trim()) { showNotification('Nothing to download', true); return; }
        downloadFile(text, 'document.md', 'text/markdown');
    }

    function downloadHtml() {
        var text = mdInput.value;
        if (!text.trim()) { showNotification('Nothing to download', true); return; }
        var html;
        if (typeof marked !== 'undefined') {
            html = marked.parse(text);
        } else {
            html = simpleRender(text);
        }
        var fullHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Converted</title></head><body>' + html + '</body></html>';
        downloadFile(fullHtml, 'document.html', 'text/html');
    }

    function copyHtml() {
        var text = mdInput.value;
        if (!text.trim()) { showNotification('Nothing to copy', true); return; }
        var html;
        if (typeof marked !== 'undefined') {
            html = marked.parse(text);
        } else {
            html = simpleRender(text);
        }
        copyToClipboard(html, copyHtmlBtn);
    }

    function downloadFile(content, filename, mimeType) {
        var blob = new Blob([content], { type: mimeType });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function copyToClipboard(text, btn) {
        try {
            navigator.clipboard.writeText(text).then(function() {
                btn.textContent = 'Copied!';
                setTimeout(function() { btn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copy HTML'; }, 2000);
            }).catch(function() { fallbackCopy(text, btn); });
        } catch (e) { fallbackCopy(text, btn); }
    }

    function fallbackCopy(text, btn) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); btn.textContent = 'Copied!'; }
        catch (e) { btn.textContent = 'Failed'; }
        document.body.removeChild(ta);
        setTimeout(function() { btn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copy HTML'; }, 2000);
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

    function waitForMarked() {
        if (typeof marked !== 'undefined') {
            init();
            return;
        }
        var attempts = 0;
        var interval = setInterval(function() {
            attempts++;
            if (typeof marked !== 'undefined') {
                clearInterval(interval);
                init();
            } else if (attempts > 50) {
                clearInterval(interval);
                init();
            }
        }, 200);
    }

    waitForMarked();
});
