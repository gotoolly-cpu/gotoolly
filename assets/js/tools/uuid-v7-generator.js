/* ============================================
   GO TOOLLY v2.0 - UUID v7 GENERATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var output = document.getElementById('uuid7-output');
    var batchOutput = document.getElementById('batch-output');
    var generateBtn = document.getElementById('generate-btn');
    var copyBtn = document.getElementById('copy-btn');
    var downloadBtn = document.getElementById('download-btn');
    var countInput = document.getElementById('uuid7-count');

    generateBtn.addEventListener('click', generateUUIDs);
    copyBtn.addEventListener('click', copyOutput);
    downloadBtn.addEventListener('click', downloadOutput);

    function generateUUIDs() {
        var count = Math.min(Math.max(parseInt(countInput.value) || 1, 1), 100);

        if (count === 1) {
            var uuid = generateUUIDv7();
            output.textContent = uuid;
            batchOutput.style.display = 'none';
        } else {
            var uuids = [];
            for (var i = 0; i < count; i++) {
                uuids.push(generateUUIDv7());
            }
            output.textContent = count + ' UUIDs generated';
            displayBatch(uuids);
        }
    }

    function generateUUIDv7() {
        var timestamp = Date.now();
        var bytes = new Uint8Array(16);

        bytes[0] = (timestamp >> 40) & 0xFF;
        bytes[1] = (timestamp >> 32) & 0xFF;
        bytes[2] = (timestamp >> 24) & 0xFF;
        bytes[3] = (timestamp >> 16) & 0xFF;
        bytes[4] = (timestamp >> 8) & 0xFF;
        bytes[5] = timestamp & 0xFF;

        var rand1 = new Uint8Array(2);
        crypto.getRandomValues(rand1);
        bytes[6] = (rand1[0] & 0x0F) | 0x70;
        bytes[7] = rand1[1];

        var rand2 = new Uint8Array(8);
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
        var s = '';
        for (var i = start; i < start + len; i++) {
            s += ('0' + bytes[i].toString(16)).slice(-2);
        }
        return s;
    }

    function displayBatch(uuids) {
        batchOutput.style.display = 'block';
        batchOutput.innerHTML = '';
        uuids.forEach(function(u, i) {
            var div = document.createElement('div');
            div.className = 'uuid7-batch-item';
            div.innerHTML = '<span class="num">' + (i + 1) + '.</span><span class="val">' + u + '</span>';
            batchOutput.appendChild(div);
        });
    }

    function getAllUUIDs() {
        var count = Math.min(Math.max(parseInt(countInput.value) || 1, 1), 100);
        if (count === 1) {
            var v = output.textContent;
            if (v === 'Click generate to create a UUID v7') return null;
            return [v];
        }
        var items = batchOutput.querySelectorAll('.val');
        if (!items.length) return null;
        return Array.prototype.map.call(items, function(el) { return el.textContent; });
    }

    function copyText(text, done) {
        var fallback = function () {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            ta.remove();
            done();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallback);
        } else {
            fallback();
        }
    }

    function copyOutput() {
        var uuids = getAllUUIDs();
        if (!uuids) return;
        var text = uuids.join('\n');
        copyText(text, function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
        });
    }

    function downloadOutput() {
        var uuids = getAllUUIDs();
        if (!uuids) return;
        var text = uuids.join('\n');
        var blob = new Blob([text], { type: 'text/plain' });
        var link = document.createElement('a');
        link.download = 'uuids-v7.txt';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }
});
})();
