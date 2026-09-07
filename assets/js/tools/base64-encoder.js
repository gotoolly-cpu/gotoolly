/* ============================================
   GO TOOLLY - BASE64 ENCODER / DECODER v2.0
   Encode and decode Base64 with UTF-8 support
   ============================================ */

(function() {
    'use strict';

    var state = {
        currentMode: 'encode',
        lastOutput: ''
    };

    var elements = {};

    function init() {
        elements = {
            textInput: document.getElementById('text-input'),
            encodeBtn: document.getElementById('encode-btn'),
            decodeBtn: document.getElementById('decode-btn'),
            copyBtn: document.getElementById('copy-btn'),
            downloadBtn: document.getElementById('download-btn'),
            charCount: document.getElementById('char-count'),
            lineCount: document.getElementById('line-count'),
            statusBadge: document.getElementById('status-badge'),
            emptyState: document.getElementById('empty-state'),
            resultsPanel: document.getElementById('results-panel'),
            resultOutput: document.getElementById('result-output'),
            resultChars: document.getElementById('result-chars'),
            resultLines: document.getElementById('result-lines'),
            resultCopy: document.getElementById('btn-copy-output'),
            resultDownload: document.getElementById('btn-download-output'),
            resultClear: document.getElementById('btn-clear-output'),
            btnPaste: document.getElementById('btn-paste'),
            btnSample: document.getElementById('btn-sample'),
            btnClear: document.getElementById('btn-clear'),
            editorWrapper: document.getElementById('editor-wrapper'),
            limitationsBox: document.getElementById('limitations-box')
        };

        elements.encodeBtn.addEventListener('click', function() { doConvert('encode'); });
        elements.decodeBtn.addEventListener('click', function() { doConvert('decode'); });
        elements.copyBtn.addEventListener('click', copyOutput);
        elements.downloadBtn.addEventListener('click', downloadOutput);
        elements.textInput.addEventListener('input', onInput);
        elements.btnPaste.addEventListener('click', pasteFromClipboard);
        elements.btnSample.addEventListener('click', loadSample);
        elements.btnClear.addEventListener('click', clearAll);
        elements.resultCopy.addEventListener('click', copyOutput);
        elements.resultDownload.addEventListener('click', downloadOutput);
        elements.resultClear.addEventListener('click', clearOutput);

        setupDragDrop();

        showEmptyState();
    }

    function onInput() {
        updateInputCounts();
        if (elements.textInput.value.trim().length > 0) {
            updateStatus('ready', 'Ready');
        } else {
            updateStatus('', '');
            showEmptyState();
        }
    }

    function updateInputCounts() {
        var text = elements.textInput.value;
        var chars = text.length;
        var lines = text === '' ? 0 : text.split('\n').length;
        elements.charCount.textContent = chars + ' char' + (chars !== 1 ? 's' : '');
        elements.lineCount.textContent = lines + ' line' + (lines !== 1 ? 's' : '');
    }

    function updateResultCounts(text) {
        var chars = text.length;
        var lines = text === '' ? 0 : text.split('\n').length;
        elements.resultChars.textContent = chars + ' char' + (chars !== 1 ? 's' : '');
        elements.resultLines.textContent = lines + ' line' + (lines !== 1 ? 's' : '');
    }

    function doConvert(mode) {
        state.currentMode = mode;
        var text = elements.textInput.value;

        if (!text.trim()) {
            showToast('Please enter some text to process.', 'error');
            return;
        }

        updateStatus('encoding', mode === 'encode' ? 'Encoding...' : 'Decoding...');

        setTimeout(function() {
            try {
                var result;
                if (mode === 'encode') {
                    result = btoa(unescape(encodeURIComponent(text)));
                } else {
                    result = decodeURIComponent(escape(atob(text)));
                }
                state.lastOutput = result;
                showResults(result);
                updateStatus('done', mode === 'encode' ? 'Encoded' : 'Decoded');
                showToast(mode === 'encode' ? 'Base64 encoded successfully.' : 'Base64 decoded successfully.', 'success');
            } catch (err) {
                updateStatus('error', 'Error');
                showToast(mode === 'decode' ? 'Invalid Base64 input. Please check your data.' : 'Encoding failed. Please check your input.', 'error');
            }
        }, 50);
    }

    function updateStatus(type, text) {
        elements.statusBadge.className = 'status-badge' + (type ? ' ' + type : '');
        elements.statusBadge.textContent = text;
    }

    function showEmptyState() {
        elements.emptyState.style.display = 'flex';
        elements.resultsPanel.classList.remove('show');
        elements.resultsPanel.style.display = 'none';
    }

    function showResults(text) {
        elements.emptyState.style.display = 'none';
        elements.resultOutput.textContent = text;
        updateResultCounts(text);
        elements.resultsPanel.style.display = 'block';
        elements.resultsPanel.classList.add('show');
    }

    function copyOutput() {
        var text = state.lastOutput;
        if (!text) { showToast('Nothing to copy.', 'error'); return; }
        try {
            navigator.clipboard.writeText(text).then(function() {
                showToast('Copied to clipboard.', 'success');
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
        try { document.execCommand('copy'); showToast('Copied to clipboard.', 'success'); }
        catch (e) { showToast('Failed to copy.', 'error'); }
        document.body.removeChild(ta);
    }

    function downloadOutput() {
        var text = state.lastOutput;
        if (!text) { showToast('Nothing to download.', 'error'); return; }
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'base64-output.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('File downloaded.', 'success');
    }

    function pasteFromClipboard() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function(text) {
                elements.textInput.value = text;
                onInput();
                showToast('Pasted from clipboard.', 'success');
            }).catch(function() { showToast('Unable to paste. Check browser permissions.', 'error'); });
        } else { showToast('Clipboard API not available in this browser.', 'error'); }
    }

    function loadSample() {
        var sample = 'Hello, World! This is a sample text with special characters:\n- Accents: caf\u00e9, na\u00efve, \u00fcber\n- Emoji: \ud83d\ude00 \ud83c\udf89 \u2764\ufe0f\n- Symbols: \u00a9 2026 GoToolly\n\nURL: https://example.com/path?key=value&foo=bar\nHTML: <div class="test">Hello & goodbye</div>';
        elements.textInput.value = sample;
        onInput();
        showToast('Sample loaded.', 'info');
    }

    function clearAll() {
        elements.textInput.value = '';
        elements.charCount.textContent = '0 chars';
        elements.lineCount.textContent = '0 lines';
        state.lastOutput = '';
        updateStatus('', '');
        showEmptyState();
    }

    function clearOutput() {
        state.lastOutput = '';
        showEmptyState();
    }

    function setupDragDrop() {
        var wrapper = elements.editorWrapper;
        wrapper.addEventListener('dragover', function(e) { e.preventDefault(); wrapper.classList.add('dragover'); });
        wrapper.addEventListener('dragleave', function() { wrapper.classList.remove('dragover'); });
        wrapper.addEventListener('drop', function(e) {
            e.preventDefault();
            wrapper.classList.remove('dragover');
            var files = e.dataTransfer.files;
            if (files.length > 0) {
                var file = files[0];
                if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5 MB.', 'error'); return; }
                var reader = new FileReader();
                reader.onload = function(ev) {
                    elements.textInput.value = ev.target.result;
                    onInput();
                    showToast('File "' + file.name + '" loaded.', 'success');
                };
                reader.readAsText(file);
            }
        });
    }

    function showToast(message, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { toast.classList.add('show'); });
        });
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doConvert(state.currentMode); }
    });

    init();
})();
