/* ============================================
   GO TOOLLY - HTML ENCODER / DECODER v2.0
   Encode and decode HTML entities
   ============================================ */

(function() {
    'use strict';

    var state = {
        currentMode: 'encode',
        lastOutput: '',
        liveMode: true
    };

    var elements = {};

    function init() {
        elements = {
            textInput: document.getElementById('text-input'),
            encodeBtn: document.getElementById('encode-btn'),
            decodeBtn: document.getElementById('decode-btn'),
            copyBtn: document.getElementById('copy-btn'),
            downloadBtn: document.getElementById('download-btn'),
            liveMode: document.getElementById('live-mode'),
            modeHint: document.getElementById('mode-hint'),
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
        elements.liveMode.addEventListener('change', onLiveModeToggle);
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

    /* ========================
       LIVE MODE TOGGLE
       ======================== */

    function onLiveModeToggle() {
        state.liveMode = elements.liveMode.checked;
        if (state.liveMode) {
            elements.modeHint.textContent = 'Enabled — results update live';
        } else {
            elements.modeHint.textContent = 'Disabled — click Encode or Decode manually';
        }
    }

    /* ========================
       INPUT HANDLING
       ======================== */

    function onInput() {
        updateInputCounts();
        if (elements.textInput.value.trim().length > 0) {
            updateStatus('ready', 'Ready');
        } else {
            updateStatus('', '');
        }
        if (state.liveMode && elements.textInput.value.trim().length > 0) {
            doConvert(state.currentMode);
        } else if (elements.textInput.value.trim().length === 0) {
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

    /* ========================
       CORE CONVERSION
       ======================== */

    function doConvert(mode) {
        state.currentMode = mode;
        var text = elements.textInput.value;

        if (!text.trim()) {
            showToast('Please enter some HTML to process.', 'error');
            return;
        }

        updateStatus('encoding', mode === 'encode' ? 'Encoding...' : 'Decoding...');

        setTimeout(function() {
            try {
                var result;
                if (mode === 'encode') {
                    result = encodeHtml(text);
                } else {
                    result = decodeHtml(text);
                }
                state.lastOutput = result;
                showResults(result);
                updateStatus('done', mode === 'encode' ? 'Encoded' : 'Decoded');
                showToast(mode === 'encode' ? 'HTML encoded successfully.' : 'HTML decoded successfully.', 'success');
            } catch (err) {
                updateStatus('error', 'Error');
                showToast('An error occurred during conversion.', 'error');
            }
        }, 50);
    }

    function encodeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function decodeHtml(str) {
        var textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        var decoded = textarea.value;
        if (decoded === str) {
            var doc = new DOMParser().parseFromString(str, 'text/html');
            decoded = doc.documentElement.textContent || '';
        }
        return decoded;
    }

    /* ========================
       UI STATE MANAGEMENT
       ======================== */

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

    /* ========================
       TOOLBAR ACTIONS
       ======================== */

    function copyOutput() {
        var text = state.lastOutput;
        if (!text) {
            showToast('Nothing to copy.', 'error');
            return;
        }
        try {
            navigator.clipboard.writeText(text).then(function() {
                showToast('Copied to clipboard.', 'success');
            }).catch(function() {
                fallbackCopy(text);
            });
        } catch (e) {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard.', 'success');
        } catch (e) {
            showToast('Failed to copy.', 'error');
        }
        document.body.removeChild(ta);
    }

    function downloadOutput() {
        var text = state.lastOutput;
        if (!text) {
            showToast('Nothing to download.', 'error');
            return;
        }
        var blob = new Blob([text], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'encoded-output.html';
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
            }).catch(function() {
                showToast('Unable to paste. Check browser permissions.', 'error');
            });
        } else {
            showToast('Clipboard API not available in this browser.', 'error');
        }
    }

    function loadSample() {
        var sample = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Hello &amp; Welcome</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n    <p>This is a "sample" HTML page with <strong>special</strong> characters.</p>\n    <p>Less than: < and Greater than: ></p>\n    <a href="https://example.com/page?a=1&amp;b=2">Click here</a>\n</body>\n</html>';
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

    /* ========================
       DRAG & DROP
       ======================== */

    function setupDragDrop() {
        var wrapper = elements.editorWrapper;

        wrapper.addEventListener('dragover', function(e) {
            e.preventDefault();
            wrapper.classList.add('dragover');
        });

        wrapper.addEventListener('dragleave', function() {
            wrapper.classList.remove('dragover');
        });

        wrapper.addEventListener('drop', function(e) {
            e.preventDefault();
            wrapper.classList.remove('dragover');
            var files = e.dataTransfer.files;
            if (files.length > 0) {
                var file = files[0];
                if (file.size > 5 * 1024 * 1024) {
                    showToast('File too large. Max 5 MB.', 'error');
                    return;
                }
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

    /* ========================
       TOAST NOTIFICATIONS
       ======================== */

    function showToast(message, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toast.classList.add('show');
            });
        });
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    /* ========================
       KEYBOARD SHORTCUTS
       ======================== */

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            doConvert(state.currentMode);
        }
    });

    init();
})();
