/* ============================================
   GO TOOLLY v2.0 - RANDOM NUMBER GENERATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var minInput = document.getElementById('rng-min');
    var maxInput = document.getElementById('rng-max');
    var countInput = document.getElementById('rng-count');
    var decimalsSelect = document.getElementById('rng-decimals');
    var uniqueCheck = document.getElementById('rng-unique');
    var generateBtn = document.getElementById('generate-numbers');
    var numberList = document.getElementById('rng-number-list');
    var countDisplay = document.getElementById('rng-count-display');
    var summary = document.getElementById('rng-summary');
    var copyBtn = document.getElementById('copy-numbers');
    var downloadBtn = document.getElementById('download-numbers');

    generateBtn.addEventListener('click', generateNumbers);

    function generateNumbers() {
        var min = parseFloat(minInput.value) || 0;
        var max = parseFloat(maxInput.value) || 100;
        var count = Math.min(Math.max(parseInt(countInput.value) || 10, 1), 1000);
        var decimals = parseInt(decimalsSelect.value);
        var unique = uniqueCheck.checked;

        if (min >= max) {
            summary.textContent = 'Error: Maximum must be greater than minimum';
            return;
        }

        var range = max - min;
        var numbers = [];
        var used = {};

        if (unique) {
            var possible = countUniquePossible(range, decimals);
            if (count > possible) {
                summary.textContent = 'Error: Cannot generate ' + count + ' unique values with this range and precision (max ' + possible + ')';
                return;
            }
        }

        var attempts = 0;
        var maxAttempts = count * 100;

        while (numbers.length < count && attempts < maxAttempts) {
            attempts++;
            var num = generateOne(min, range, decimals);

            if (unique) {
                var key = num.toFixed(decimals);
                if (used[key]) continue;
                used[key] = true;
            }

            numbers.push(num);
        }

        if (numbers.length < count) {
            summary.textContent = 'Warning: Could only generate ' + numbers.length + ' unique values';
        } else {
            summary.textContent = 'Generated ' + numbers.length + ' number' + (numbers.length !== 1 ? 's' : '');
        }

        displayNumbers(numbers);
    }

    function generateOne(min, range, decimals) {
        var buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        var r = buf[0] / 4294967296;
        var num = min + r * range;
        if (decimals === 0) {
            num = Math.floor(num);
        } else {
            num = parseFloat(num.toFixed(decimals));
        }
        return num;
    }

    function countUniquePossible(range, decimals) {
        if (decimals === 0) return Math.floor(range) + 1;
        return Math.floor(range * Math.pow(10, decimals)) + 1;
    }

    function displayNumbers(numbers) {
        numberList.innerHTML = '';
        countDisplay.textContent = numbers.length + ' number' + (numbers.length !== 1 ? 's' : '');
        numbers.forEach(function(n, i) {
            var li = document.createElement('li');
            li.innerHTML = '<span class="idx">' + (i + 1) + '.</span><span class="num">' + n + '</span>';
            numberList.appendChild(li);
        });
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

    copyBtn.addEventListener('click', function() {
        var items = numberList.querySelectorAll('.num');
        if (!items.length) return;
        var text = Array.prototype.map.call(items, function(el) { return el.textContent; }).join('\n');
        copyText(text, function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy All'; }, 1500);
        });
    });

    downloadBtn.addEventListener('click', function() {
        var items = numberList.querySelectorAll('.num');
        if (!items.length) return;
        var text = Array.prototype.map.call(items, function(el) { return el.textContent; }).join('\n');
        var blob = new Blob([text], { type: 'text/plain' });
        var link = document.createElement('a');
        link.download = 'random-numbers.txt';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    });
});
})();
