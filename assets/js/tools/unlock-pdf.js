document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSize = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePages = document.getElementById('file-pages');
    var settingsPanel = document.getElementById('settings-panel');
    var passwordInput = document.getElementById('pdf-password');
    var togglePw = document.getElementById('toggle-password');
    var unlockBtn = document.getElementById('unlock-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressContainer = document.getElementById('progress-container');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var progressFill = document.getElementById('progress-fill');
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');

    var currentFile = null;
    var unlockedBytes = null;

    function showNotification(msg, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function updateProgress(text, pct) {
        progressText.textContent = text;
        progressPercent.textContent = pct + '%';
        progressFill.style.width = pct + '%';
    }

    function resetTool() {
        currentFile = null;
        unlockedBytes = null;
        fileInput.value = '';
        passwordInput.value = '';
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        unlockBtn.disabled = true;
        updateProgress('Unlocking PDF...', 0);
    }

    function handleFile(file) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showNotification('Please select a valid PDF file', true);
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showNotification('File size must be less than 50 MB', true);
            return;
        }
        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileStatus.textContent = 'Password required';
        fileStatus.className = 'file-status warn';
        filePages.textContent = '';
        fileInfo.classList.add('show');
        settingsPanel.classList.add('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        unlockBtn.disabled = false;
        passwordInput.focus();
    }

    dropZone.addEventListener('click', function() { fileInput.click(); });
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    togglePw.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePw.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            togglePw.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });

    unlockBtn.addEventListener('click', async function() {
        if (!currentFile) return;
        var password = passwordInput.value || '';
        if (typeof window.decryptPDF === 'undefined') {
            if (window.__decryptReady) {
                showNotification('Encryption library is loading, please wait a moment...', true);
                await window.__decryptReady;
            } else {
                showNotification('Encryption library failed to load. Please refresh.', true);
                return;
            }
        }
        unlockBtn.disabled = true;
        progressContainer.classList.add('show');
        resultsPanel.classList.remove('show');
        updateProgress('Reading PDF...', 10);
        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            var pdfBytes = new Uint8Array(arrayBuffer);
            updateProgress('Decrypting PDF...', 40);
            unlockedBytes = await window.decryptPDF(pdfBytes, password);
            updateProgress('Complete!', 100);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                downloadBtn.download = 'unlocked-' + currentFile.name;
                showNotification('PDF unlocked successfully!', false);
            }, 500);
        } catch (err) {
            showNotification('Failed to unlock: ' + (err.message || 'Incorrect password or unsupported encryption'), true);
            progressContainer.classList.remove('show');
            unlockBtn.disabled = false;
        }
    });

    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!unlockedBytes) return;
        var blob = new Blob([unlockedBytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = downloadBtn.download;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    });

    resetBtn.addEventListener('click', resetTool);
    newFileBtn.addEventListener('click', resetTool);
});
