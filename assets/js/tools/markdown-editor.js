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
    var statusBadge = document.querySelector('.status-badge');

    var isFullscreen = false;
    var prevScroll = 0;
    var MAX_SIZE = 1048576;
    var debounceTimer = null;

    function cleanHtml(html) {
        if (!html) return '';
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var body = doc.body;

        function removeEmpty(node) {
            var child = node.firstChild;
            while (child) {
                var next = child.nextSibling;
                if (child.nodeType === 1) {
                    removeEmpty(child);
                    var tag = child.tagName.toLowerCase();
                    if (['p', 'div', 'blockquote', 'section', 'article', 'ul', 'ol', 'li', 'span'].indexOf(tag) !== -1 && !child.innerHTML.trim()) {
                        node.removeChild(child);
                    }
                }
                child = next;
            }
        }
        removeEmpty(body);

        var links = body.querySelectorAll('a');
        for (var i = links.length - 1; i >= 0; i--) {
            var link = links[i];
            var href = link.getAttribute('href');
            if (href === null || href === '' || /^\s*javascript\s*:/i.test(href)) {
                var span = doc.createElement('span');
                while (link.firstChild) {
                    span.appendChild(link.firstChild);
                }
                link.parentNode.replaceChild(span, link);
            }
        }

        var imgs = body.querySelectorAll('img');
        for (var i = 0; i < imgs.length; i++) {
            if (!imgs[i].hasAttribute('alt')) {
                imgs[i].setAttribute('alt', '');
            }
        }

        var walker = doc.createTreeWalker(body, 4, null, false);
        var textNodes = [];
        while (walker.nextNode()) {
            var node = walker.currentNode;
            var parent = node.parentElement;
            var skip = false;
            while (parent) {
                var tag = parent.tagName.toLowerCase();
                if (tag === 'pre' || tag === 'code') {
                    skip = true;
                    break;
                }
                parent = parent.parentElement;
            }
            if (!skip) textNodes.push(node);
        }

        for (var i = 0; i < textNodes.length; i++) {
            var node = textNodes[i];
            if (!node.textContent.trim()) {
                node.parentNode.removeChild(node);
            }
        }

        return body.innerHTML.trim();
    }

    function parseAndSanitize(text) {
        var html;
        if (typeof marked !== 'undefined') {
            try {
                html = marked.parse(text);
            } catch (e) {
                console.error('Markdown parsing failed:', e);
                html = text ? simpleRender(text) : '';
            }
        } else {
            html = text ? simpleRender(text) : '';
        }
        html = html.replace(/<input[^>]*type\s*=\s*["']checkbox["'][^>]*>/gi, function(match) {
            return /\bchecked\b/i.test(match) ? '✅ ' : '⬜ ';
        });
        if (typeof DOMPurify !== 'undefined') {
            html = DOMPurify.sanitize(html, { FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'option'] });
        }
        html = cleanHtml(html);
        return html;
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

    function updateStats() {
        var text = mdInput.value;
        wordCount.textContent = text.trim() ? text.trim().split(/\s+/).length : 0;
        charCount.textContent = text.length;
    }

    function updatePreview() {
        var text = mdInput.value;

        if (text.length > MAX_SIZE) {
            mdPreview.innerHTML = '<p style="color:#dc2626;padding:16px;text-align:center">This document exceeds the maximum supported size (1 MB).</p>';
            return;
        }

        mdPreview.innerHTML = parseAndSanitize(text);
    }

    function debouncedUpdatePreview() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updatePreview, 200);
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

    function getExportStyles() {
        return 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;color:#1a1a2e}'
            + 'h1,h2,h3,h4,h5,h6{margin-top:24px;margin-bottom:16px;font-weight:600;line-height:1.25}'
            + 'h1{font-size:2em;border-bottom:1px solid #e2e8f0;padding-bottom:8px}'
            + 'h2{font-size:1.5em;border-bottom:1px solid #e2e8f0;padding-bottom:6px}'
            + 'h3{font-size:1.25em}'
            + 'p{margin-bottom:16px}'
            + 'ul,ol{padding-left:2em;margin-bottom:16px}'
            + 'li{margin-bottom:4px}'
            + 'blockquote{margin:0 0 16px;padding:8px 16px;border-left:4px solid #2563eb;background:#f8fafc;color:#475569}'
            + 'pre{background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;margin-bottom:16px}'
            + 'code{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;font-size:0.9em}'
            + 'pre code{background:none;color:inherit;padding:0}'
            + 'p code{background:#f1f5f9;padding:2px 6px;border-radius:4px}'
            + 'table{width:100%;border-collapse:collapse;margin-bottom:16px}'
            + 'th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}'
            + 'th{background:#f8fafc;font-weight:600}'
            + 'img{max-width:100%;border-radius:8px}'
            + 'a{color:#2563eb;text-decoration:none}'
            + 'a:hover{text-decoration:underline}'
            + 'hr{border:none;border-top:1px solid #e2e8f0;margin:24px 0}';
    }

    function downloadHtml() {
        var text = mdInput.value;
        if (!text.trim()) { showNotification('Nothing to download', true); return; }
        if (text.length > MAX_SIZE) { showNotification('Document exceeds maximum size (1 MB).', true); return; }
        var html = parseAndSanitize(text);
        var styles = getExportStyles();
        var fullHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Converted</title><style>' + styles + '</style></head><body>' + html + '</body></html>';
        downloadFile(fullHtml, 'document.html', 'text/html');
    }

    function copyHtml() {
        var text = mdInput.value;
        if (!text.trim()) { showNotification('Nothing to copy', true); return; }
        if (text.length > MAX_SIZE) { showNotification('Document exceeds maximum size (1 MB).', true); return; }
        var html = parseAndSanitize(text);
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
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
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

    function handleKeyboardShortcuts(e) {
        var isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) { return; }

        var ta = mdInput;
        var start = ta.selectionStart;
        var end = ta.selectionEnd;
        var val = ta.value;
        var selected = val.substring(start, end);

        if (e.key === 'b') {
            e.preventDefault();
            ta.value = val.substring(0, start) + '**' + selected + '**' + val.substring(end);
            ta.selectionStart = start + 2;
            ta.selectionEnd = end + 2;
            updatePreview();
        } else if (e.key === 'i') {
            e.preventDefault();
            ta.value = val.substring(0, start) + '*' + selected + '*' + val.substring(end);
            ta.selectionStart = start + 1;
            ta.selectionEnd = end + 1;
            updatePreview();
        } else if (e.key === 'k') {
            e.preventDefault();
            if (selected) {
                ta.value = val.substring(0, start) + '[' + selected + '](url)' + val.substring(end);
                ta.selectionStart = end + 3;
                ta.selectionEnd = end + 6;
            } else {
                ta.value = val.substring(0, start) + '[text](url)' + val.substring(end);
                ta.selectionStart = start + 1;
                ta.selectionEnd = start + 5;
            }
            updatePreview();
        }
    }

    function init() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({ breaks: true, gfm: true });
            if (statusBadge) {
                statusBadge.textContent = 'Ready';
                statusBadge.classList.add('ready');
            }
        } else {
            if (statusBadge) {
                statusBadge.textContent = 'Basic';
                statusBadge.classList.remove('ready');
            }
            showNotification('Advanced Markdown rendering is unavailable. Using the basic renderer.', true);
        }

        mdInput.addEventListener('input', function() {
            updateStats();
            debouncedUpdatePreview();
        });

        mdInput.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                var start = mdInput.selectionStart;
                var end = mdInput.selectionEnd;
                mdInput.value = mdInput.value.substring(0, start) + '    ' + mdInput.value.substring(end);
                mdInput.selectionStart = mdInput.selectionEnd = start + 4;
                updatePreview();
            } else {
                handleKeyboardShortcuts(e);
            }
        });

        fullscreenBtn.addEventListener('click', toggleFullscreen);
        fullscreenExitBtn.addEventListener('click', toggleFullscreen);

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isFullscreen) {
                toggleFullscreen();
            }
        });

        downloadMdBtn.addEventListener('click', downloadMd);
        downloadHtmlBtn.addEventListener('click', downloadHtml);
        copyHtmlBtn.addEventListener('click', copyHtml);

        updatePreview();
        updateStats();
    }

    init();
});