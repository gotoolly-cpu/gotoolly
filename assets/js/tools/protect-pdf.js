document.addEventListener('DOMContentLoaded', function() {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('pdf-input');
    var fileInfo = document.getElementById('file-info');
    var fileName = document.getElementById('file-name');
    var fileSizeEl = document.getElementById('file-size');
    var fileStatus = document.getElementById('file-status');
    var filePages = document.getElementById('file-pages');
    var settingsPanel = document.getElementById('settings-panel');
    var userPw = document.getElementById('user-password');
    var ownerPw = document.getElementById('owner-password');
    var pwStrength = document.getElementById('user-pw-strength');
    var permPrinting = document.getElementById('perm-printing');
    var permCopying = document.getElementById('perm-copying');
    var permModifying = document.getElementById('perm-modifying');
    var protectBtn = document.getElementById('protect-btn');
    var resetBtn = document.getElementById('reset-btn');
    var progressContainer = document.getElementById('progress-container');
    var progressText = document.getElementById('progress-text');
    var progressPercent = document.getElementById('progress-percent');
    var progressFill = document.getElementById('progress-fill');
    var resultsPanel = document.getElementById('results-panel');
    var downloadBtn = document.getElementById('download-btn');
    var newFileBtn = document.getElementById('new-file-btn');

    var currentFile = null;
    var protectedBytes = null;

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

    function calcStrength(pw) {
        var s = 0;
        if (pw.length > 4) s += 1;
        if (pw.length > 8) s += 1;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
        if (/\d/.test(pw)) s += 1;
        if (/[^a-zA-Z0-9]/.test(pw)) s += 1;
        return s;
    }

    userPw.addEventListener('input', function() {
        var s = calcStrength(userPw.value);
        pwStrength.className = 'password-strength';
        if (userPw.value.length === 0) { pwStrength.style.width = '0'; return; }
        if (s <= 1) { pwStrength.classList.add('weak'); }
        else if (s <= 3) { pwStrength.classList.add('medium'); }
        else { pwStrength.classList.add('strong'); }
    });

    document.querySelectorAll('.toggle-pw').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var target = document.getElementById(btn.dataset.target);
            if (target.type === 'password') {
                target.type = 'text';
                btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                target.type = 'password';
                btn.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });
    });

    function resetTool() {
        currentFile = null;
        protectedBytes = null;
        fileInput.value = '';
        userPw.value = '';
        ownerPw.value = '';
        pwStrength.className = 'password-strength';
        pwStrength.style.width = '0';
        permPrinting.checked = true;
        permCopying.checked = true;
        permModifying.checked = false;
        fileInfo.classList.remove('show');
        settingsPanel.classList.remove('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        protectBtn.disabled = true;
        updateProgress('Protecting PDF...', 0);
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
        fileSizeEl.textContent = formatFileSize(file.size);
        fileStatus.textContent = 'Ready';
        filePages.textContent = '';
        fileInfo.classList.add('show');
        settingsPanel.classList.add('show');
        resultsPanel.classList.remove('show');
        progressContainer.classList.remove('show');
        protectBtn.disabled = false;
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

    protectBtn.addEventListener('click', async function() {
        if (!currentFile) return;
        var uPw = userPw.value;
        var oPw = ownerPw.value || uPw;
        if (!uPw && !oPw) {
            showNotification('Please enter at least one password', true);
            return;
        }
        if (typeof window.encryptPDF === 'undefined') {
            if (window.__encryptReady) {
                showNotification('Encryption library is loading, please wait a moment...', true);
                await window.__encryptReady;
            } else {
                showNotification('Encryption library failed to load. Please refresh.', true);
                return;
            }
        }
        protectBtn.disabled = true;
        progressContainer.classList.add('show');
        resultsPanel.classList.remove('show');
        updateProgress('Loading PDF...', 10);
        try {
            var arrayBuffer = await currentFile.arrayBuffer();
            var pdfBytes = new Uint8Array(arrayBuffer);
            updateProgress('Encrypting PDF...', 50);
            protectedBytes = await window.encryptPDF(pdfBytes, uPw || '', {
                ownerPassword: oPw || uPw || '',
                algorithm: 'RC4',
                allowPrinting: permPrinting.checked,
                allowModifying: permModifying.checked,
                allowCopying: permCopying.checked
            });
            updateProgress('Complete!', 100);
            setTimeout(function() {
                progressContainer.classList.remove('show');
                resultsPanel.classList.add('show');
                downloadBtn.download = 'protected-' + currentFile.name;
                showNotification('PDF protected successfully!', false);
            }, 500);
        } catch (err) {
            showNotification('Error protecting PDF: ' + err.message, true);
            progressContainer.classList.remove('show');
            protectBtn.disabled = false;
        }
    });

    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!protectedBytes) return;
        var blob = new Blob([protectedBytes], { type: 'application/pdf' });
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
