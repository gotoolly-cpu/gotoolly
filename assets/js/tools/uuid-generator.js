/* ============================================
   GO TOOLLY - UUID GENERATOR
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    var output = document.getElementById('uuid-output');
    var batchOutput = document.getElementById('batch-output');
    var generateBtn = document.getElementById('generate-btn');
    var copyBtn = document.getElementById('copy-btn');
    var formatSelect = document.getElementById('uuid-format');
    var countSelect = document.getElementById('uuid-count');
    var lastUUID = '';

    generateBtn.addEventListener('click', generate);
    copyBtn.addEventListener('click', copyUUID);
    formatSelect.addEventListener('change', generate);

    function generate() {
        var count = parseInt(countSelect.value);
        var format = formatSelect.value;
        var uuids = [];

        for (var i = 0; i < count; i++) {
            uuids.push(formatUUID(crypto.randomUUID(), format));
        }

        lastUUID = uuids[0];
        output.textContent = uuids[0];

        if (count === 1) {
            batchOutput.style.display = 'none';
        } else {
            batchOutput.style.display = 'block';
            batchOutput.innerHTML = '';
            uuids.forEach(function(uuid, idx) {
                var item = document.createElement('div');
                item.className = 'uuid-batch-item';
                item.innerHTML = '<span class="num">' + (idx + 1) + '.</span>' +
                    '<span class="val">' + escapeHtml(uuid) + '</span>' +
                    '<button class="copy-single" data-uuid="' + escapeHtml(uuid) + '" aria-label="Copy UUID ' + (idx + 1) + '">Copy</button>';
                batchOutput.appendChild(item);
            });

            batchOutput.querySelectorAll('.copy-single').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    navigator.clipboard.writeText(btn.dataset.uuid).then(function() {
                        btn.textContent = 'Copied!';
                        setTimeout(function() { btn.textContent = 'Copy'; }, 1200);
                    });
                });
            });
        }
    }

    function formatUUID(uuid, format) {
        switch (format) {
            case 'raw': return uuid.replace(/-/g, '');
            case 'upper': return uuid.toUpperCase();
            case 'braces': return '{' + uuid + '}';
            default: return uuid;
        }
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function copyUUID() {
        if (!lastUUID) return;
        navigator.clipboard.writeText(lastUUID).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
        });
    }

    generate();
});