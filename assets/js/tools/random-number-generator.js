/* ============================================
   GO TOOLLY - RANDOM NUMBER GENERATOR
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    const minInput = document.getElementById('rng-min');
    const maxInput = document.getElementById('rng-max');
    const countInput = document.getElementById('rng-count');
    const decimalsSelect = document.getElementById('rng-decimals');
    const uniqueCheck = document.getElementById('rng-unique');
    const generateBtn = document.getElementById('generate-numbers');
    const numberList = document.getElementById('rng-number-list');
    const countDisplay = document.getElementById('rng-count-display');
    const summary = document.getElementById('rng-summary');
    const copyBtn = document.getElementById('copy-numbers');
    const downloadBtn = document.getElementById('download-numbers');

    generateBtn.addEventListener('click', generateNumbers);

    function generateNumbers() {
        const min = parseFloat(minInput.value) || 0;
        const max = parseFloat(maxInput.value) || 100;
        const count = Math.min(Math.max(parseInt(countInput.value) || 10, 1), 1000);
        const decimals = parseInt(decimalsSelect.value);
        const unique = uniqueCheck.checked;

        if (min >= max) {
            summary.textContent = 'Error: Maximum must be greater than minimum';
            return;
        }

        const range = max - min;
        const numbers = [];
        const used = new Set();

        if (unique) {
            const possible = countUniquePossible(range, decimals);
            if (count > possible) {
                summary.textContent = 'Error: Cannot generate ' + count + ' unique values with this range and precision (max ' + possible + ')';
                return;
            }
        }

        let attempts = 0;
        const maxAttempts = count * 100;

        while (numbers.length < count && attempts < maxAttempts) {
            attempts++;
            let num = generateOne(min, range, decimals);

            if (unique) {
                const key = num.toFixed(decimals);
                if (used.has(key)) continue;
                used.add(key);
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
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        const r = buf[0] / 4294967296;
        let num = min + r * range;
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
            const li = document.createElement('li');
            li.innerHTML = '<span class="idx">' + (i + 1) + '.</span><span class="num">' + n + '</span>';
            numberList.appendChild(li);
        });
    }

    copyBtn.addEventListener('click', function() {
        const items = numberList.querySelectorAll('.num');
        if (!items.length) return;
        const text = Array.from(items).map(function(el) { return el.textContent; }).join('\n');
        navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy All'; }, 1500);
        });
    });

    downloadBtn.addEventListener('click', function() {
        const items = numberList.querySelectorAll('.num');
        if (!items.length) return;
        const text = Array.from(items).map(function(el) { return el.textContent; }).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.download = 'random-numbers.txt';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    });
});
