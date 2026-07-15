document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.pc-tab');
    const modes = {
        'pct-of': { inputs: ['pct-of-x', 'pct-of-y'], result: 'pct-of-result', label: 'pct-of-label', calc: calcPctOf },
        'what-pct': { inputs: ['what-pct-x', 'what-pct-y'], result: 'what-pct-result', label: 'what-pct-label', calc: calcWhatPct },
        'increase': { inputs: ['inc-from', 'inc-to'], result: 'inc-result', label: 'inc-label', calc: calcIncrease },
        'decrease': { inputs: ['dec-from', 'dec-to'], result: 'dec-result', label: 'dec-label', calc: calcDecrease },
        'difference': { inputs: ['diff-x', 'diff-y'], result: 'diff-result', label: 'diff-label', calc: calcDifference },
        'reverse': { inputs: ['rev-x', 'rev-y'], result: 'rev-result', label: 'rev-label', calc: calcReverse }
    };
    const copyBtn = document.getElementById('pc-copy-btn');
    const clearBtn = document.getElementById('pc-clear-btn');
    let currentMode = 'pct-of';

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            document.querySelectorAll('.pc-mode').forEach(function(m) { m.classList.remove('active'); });
            currentMode = tab.getAttribute('data-mode');
            document.getElementById('mode-' + currentMode).classList.add('active');
            calculateCurrent();
        });
    });

    function getVal(id) {
        const el = document.getElementById(id);
        if (!el) return NaN;
        return parseFloat(el.value.trim());
    }

    function setResult(id, val, suffix) {
        const el = document.getElementById(id);
        if (!el) return;
        if (isNaN(val)) {
            el.textContent = '--';
            return;
        }
        el.textContent = formatNum(val) + (suffix || '');
    }

    function setLabel(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function formatNum(n) {
        if (Number.isInteger(n)) return n.toString();
        return n.toFixed(2).replace(/\.?0+$/, '');
    }

    function calcPctOf() {
        const x = getVal('pct-of-x');
        const y = getVal('pct-of-y');
        if (isNaN(x) || isNaN(y)) { setResult('pct-of-result', NaN); setLabel('pct-of-label', 'Enter values above'); return; }
        const result = (x / 100) * y;
        setResult('pct-of-result', result);
        setLabel('pct-of-label', x + '% of ' + y + ' = ' + formatNum(result));
    }

    function calcWhatPct() {
        const x = getVal('what-pct-x');
        const y = getVal('what-pct-y');
        if (isNaN(x) || isNaN(y) || y === 0) { setResult('what-pct-result', NaN); setLabel('what-pct-label', 'Enter values above'); return; }
        const result = (x / y) * 100;
        setResult('what-pct-result', result, '%');
        setLabel('what-pct-label', x + ' is ' + formatNum(result) + '% of ' + y);
    }

    function calcIncrease() {
        const from = getVal('inc-from');
        const to = getVal('inc-to');
        if (isNaN(from) || isNaN(to) || from === 0) { setResult('inc-result', NaN); setLabel('inc-label', 'Enter values above'); return; }
        const result = ((to - from) / from) * 100;
        setResult('inc-result', result, '%');
        setLabel('inc-label', 'Increase from ' + from + ' to ' + to + ' = ' + formatNum(result) + '%');
    }

    function calcDecrease() {
        const from = getVal('dec-from');
        const to = getVal('dec-to');
        if (isNaN(from) || isNaN(to) || from === 0) { setResult('dec-result', NaN); setLabel('dec-label', 'Enter values above'); return; }
        const result = ((from - to) / from) * 100;
        setResult('dec-result', result, '%');
        setLabel('dec-label', 'Decrease from ' + from + ' to ' + to + ' = ' + formatNum(result) + '%');
    }

    function calcDifference() {
        const x = getVal('diff-x');
        const y = getVal('diff-y');
        if (isNaN(x) || isNaN(y) || (x + y) === 0) { setResult('diff-result', NaN); setLabel('diff-label', 'Enter values above'); return; }
        const result = (Math.abs(x - y) / ((x + y) / 2)) * 100;
        setResult('diff-result', result, '%');
        setLabel('diff-label', 'Difference between ' + x + ' and ' + y + ' = ' + formatNum(result) + '%');
    }

    function calcReverse() {
        const x = getVal('rev-x');
        const y = getVal('rev-y');
        if (isNaN(x) || isNaN(y) || y === 0) { setResult('rev-result', NaN); setLabel('rev-label', 'Enter values above'); return; }
        const result = (x / y) * 100;
        setResult('rev-result', result);
        setLabel('rev-label', x + ' is ' + y + '% of ' + formatNum(result));
    }

    function calculateCurrent() {
        const mode = modes[currentMode];
        if (mode) mode.calc();
    }

    document.querySelectorAll('.pc-input').forEach(function(input) {
        input.addEventListener('input', function() {
            calculateCurrent();
        });
    });

    copyBtn.addEventListener('click', function() {
        const mode = modes[currentMode];
        const resultEl = document.getElementById(mode.result);
        const labelEl = document.getElementById(mode.label);
        const text = labelEl.textContent + ' = ' + resultEl.textContent;
        if (resultEl.textContent === '--') return;
        navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 1500);
        });
    });

    clearBtn.addEventListener('click', function() {
        document.querySelectorAll('.pc-input').forEach(function(input) {
            input.value = '';
        });
        Object.keys(modes).forEach(function(key) {
            const m = modes[key];
            setLabel(m.label, 'Enter values above');
            setResult(m.result, NaN);
        });
    });

    calculateCurrent();
});
