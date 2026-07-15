/* ============================================
   GO TOOLLY - URL ENCODER / DECODER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var inputText = document.getElementById('input-text');
    var outputText = document.getElementById('output-text');
    var encodeBtn = document.getElementById('encode-btn');
    var decodeBtn = document.getElementById('decode-btn');
    var copyBtn = document.getElementById('copy-btn');
    var clearBtn = document.getElementById('clear-btn');
    var liveMode = document.getElementById('live-mode');
    var charCount = document.getElementById('char-count');

    var currentMode = 'encode';

    function init() {
        encodeBtn.addEventListener('click', function() { currentMode = 'encode'; doConvert(); });
        decodeBtn.addEventListener('click', function() { currentMode = 'decode'; doConvert(); });
        copyBtn.addEventListener('click', copyResult);
        clearBtn.addEventListener('click', clearAll);
        inputText.addEventListener('input', onInput);
    }

    function onInput() {
        charCount.textContent = inputText.value.length;
        if (liveMode.checked) doConvert();
    }

    function doConvert() {
        var text = inputText.value;
        if (!text.trim()) { outputText.textContent = ''; return; }
        try {
            var result;
            if (currentMode === 'encode') {
                result = encodeURIComponent(text);
            } else {
                result = decodeURIComponent(text.replace(/\+/g, ' '));
            }
            outputText.textContent = result;
        } catch (e) {
            outputText.textContent = 'Error: ' + e.message;
        }
    }

    function copyResult() {
        var text = outputText.textContent;
        if (!text) { showNotification('Nothing to copy', true); return; }
        try {
            navigator.clipboard.writeText(text).then(function() {
                copyBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!';
                setTimeout(function() { copyBtn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copy Output'; }, 2000);
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
        setTimeout(function() { copyBtn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i> Copy Output'; }, 2000);
    }

    function clearAll() {
        inputText.value = '';
        outputText.textContent = '';
        charCount.textContent = '0';
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

    init();
});
