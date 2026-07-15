/* ============================================
   GO TOOLLY - UUID v7 GENERATOR
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    const output = document.getElementById('uuid7-output');
    const batchOutput = document.getElementById('batch-output');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const countInput = document.getElementById('uuid7-count');

    generateBtn.addEventListener('click', generateUUIDs);
    copyBtn.addEventListener('click', copyOutput);
    downloadBtn.addEventListener('click', downloadOutput);

    function generateUUIDs() {
        const count = Math.min(Math.max(parseInt(countInput.value) || 1, 1), 100);

        if (count === 1) {
            const uuid = generateUUIDv7();
            output.textContent = uuid;
            output.style.color = 'var(--color-primary)';
            output.style.borderColor = 'var(--color-primary)';
            batchOutput.style.display = 'none';
        } else {
            const uuids = [];
            for (let i = 0; i < count; i++) {
                uuids.push(generateUUIDv7());
            }
            output.textContent = count + ' UUIDs generated';
            output.style.color = 'var(--color-text)';
            output.style.borderColor = 'var(--color-border)';
            displayBatch(uuids);
        }
    }

    function generateUUIDv7() {
        const timestamp = Date.now();
        const bytes = new Uint8Array(16);

        bytes[0] = (timestamp >> 40) & 0xFF;
        bytes[1] = (timestamp >> 32) & 0xFF;
        bytes[2] = (timestamp >> 24) & 0xFF;
        bytes[3] = (timestamp >> 16) & 0xFF;
        bytes[4] = (timestamp >> 8) & 0xFF;
        bytes[5] = timestamp & 0xFF;

        const rand1 = new Uint8Array(2);
        crypto.getRandomValues(rand1);
        bytes[6] = (rand1[0] & 0x0F) | 0x70;
        bytes[7] = rand1[1];

        const rand2 = new Uint8Array(8);
        crypto.getRandomValues(rand2);
        bytes[8] = (rand2[0] & 0x3F) | 0x80;
        bytes[9] = rand2[1];
        bytes[10] = rand2[2];
        bytes[11] = rand2[3];
        bytes[12] = rand2[4];
        bytes[13] = rand2[5];
        bytes[14] = rand2[6];
        bytes[15] = rand2[7];

        return hex(bytes, 0, 4) + '-' + hex(bytes, 4, 2) + '-' + hex(bytes, 6, 2) + '-' + hex(bytes, 8, 2) + '-' + hex(bytes, 10, 6);
    }

    function hex(bytes, start, len) {
        let s = '';
        for (let i = start; i < start + len; i++) {
            s += ('0' + bytes[i].toString(16)).slice(-2);
        }
        return s;
    }

    function displayBatch(uuids) {
        batchOutput.style.display = 'block';
        batchOutput.innerHTML = '';
        uuids.forEach(function(u, i) {
            const div = document.createElement('div');
            div.className = 'uuid7-batch-item';
            div.innerHTML = '<span class="num">' + (i + 1) + '.</span><span class="val">' + u + '</span>';
            batchOutput.appendChild(div);
        });
    }

    function getAllUUIDs() {
        const count = Math.min(Math.max(parseInt(countInput.value) || 1, 1), 100);
        if (count === 1) {
            const v = output.textContent;
            if (v === 'Click generate to create a UUID v7') return null;
            return [v];
        }
        const items = batchOutput.querySelectorAll('.val');
        if (!items.length) return null;
        return Array.from(items).map(function(el) { return el.textContent; });
    }

    function copyOutput() {
        const uuids = getAllUUIDs();
        if (!uuids) return;
        const text = uuids.join('\n');
        navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
        });
    }

    function downloadOutput() {
        const uuids = getAllUUIDs();
        if (!uuids) return;
        const text = uuids.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.download = 'uuids-v7.txt';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }
});
