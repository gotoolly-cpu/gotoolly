/* ============================================
   GO TOOLLY v2.0 - PERCENTAGE CALCULATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var tabs = document.querySelectorAll('.pc-tab');
    var modes = {
        'pct-of': { inputs: ['pct-of-x', 'pct-of-y'], result: 'pct-of-result', label: 'pct-of-label', calc: calcPctOf },
        'what-pct': { inputs: ['what-pct-x', 'what-pct-y'], result: 'what-pct-result', label: 'what-pct-label', calc: calcWhatPct },
        'increase': { inputs: ['inc-from', 'inc-to'], result: 'inc-result', label: 'inc-label', calc: calcIncrease },
        'decrease': { inputs: ['dec-from', 'dec-to'], result: 'dec-result', label: 'dec-label', calc: calcDecrease },
        'difference': { inputs: ['diff-x', 'diff-y'], result: 'diff-result', label: 'diff-label', calc: calcDifference },
        'reverse': { inputs: ['rev-x', 'rev-y'], result: 'rev-result', label: 'rev-label', calc: calcReverse }
    };
    var copyBtn = document.getElementById('pc-copy-btn');
    var clearBtn = document.getElementById('pc-clear-btn');
    var currentMode = 'pct-of';

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
        var el = document.getElementById(id);
        if (!el) return NaN;
        return parseFloat(el.value.trim());
    }

    function setResult(id, val, suffix) {
        var el = document.getElementById(id);
        if (!el) return;
        if (isNaN(val)) {
            el.textContent = '--';
            return;
        }
        el.textContent = formatNum(val) + (suffix || '');
    }

    function setLabel(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function formatNum(n) {
        if (isInteger(n)) return n.toString();
        return n.toFixed(2).replace(/\.?0+$/, '');
    }

    function isInteger(n) {
        return n === Math.floor(n);
    }

    function calcPctOf() {
        var x = getVal('pct-of-x');
        var y = getVal('pct-of-y');
        if (isNaN(x) || isNaN(y)) { setResult('pct-of-result', NaN); setLabel('pct-of-label', 'Enter values above'); return; }
        var result = (x / 100) * y;
        setResult('pct-of-result', result);
        setLabel('pct-of-label', x + '% of ' + y + ' = ' + formatNum(result));
    }

    function calcWhatPct() {
        var x = getVal('what-pct-x');
        var y = getVal('what-pct-y');
        if (isNaN(x) || isNaN(y) || y === 0) { setResult('what-pct-result', NaN); setLabel('what-pct-label', 'Enter values above'); return; }
        var result = (x / y) * 100;
        setResult('what-pct-result', result, '%');
        setLabel('what-pct-label', x + ' is ' + formatNum(result) + '% of ' + y);
    }

    function calcIncrease() {
        var from = getVal('inc-from');
        var to = getVal('inc-to');
        if (isNaN(from) || isNaN(to) || from === 0) { setResult('inc-result', NaN); setLabel('inc-label', 'Enter values above'); return; }
        var result = ((to - from) / from) * 100;
        setResult('inc-result', result, '%');
        setLabel('inc-label', 'Increase from ' + from + ' to ' + to + ' = ' + formatNum(result) + '%');
    }

    function calcDecrease() {
        var from = getVal('dec-from');
        var to = getVal('dec-to');
        if (isNaN(from) || isNaN(to) || from === 0) { setResult('dec-result', NaN); setLabel('dec-label', 'Enter values above'); return; }
        var result = ((from - to) / from) * 100;
        setResult('dec-result', result, '%');
        setLabel('dec-label', 'Decrease from ' + from + ' to ' + to + ' = ' + formatNum(result) + '%');
    }

    function calcDifference() {
        var x = getVal('diff-x');
        var y = getVal('diff-y');
        if (isNaN(x) || isNaN(y) || (x + y) === 0) { setResult('diff-result', NaN); setLabel('diff-label', 'Enter values above'); return; }
        var result = (Math.abs(x - y) / ((x + y) / 2)) * 100;
        setResult('diff-result', result, '%');
        setLabel('diff-label', 'Difference between ' + x + ' and ' + y + ' = ' + formatNum(result) + '%');
    }

    function calcReverse() {
        var x = getVal('rev-x');
        var y = getVal('rev-y');
        if (isNaN(x) || isNaN(y) || y === 0) { setResult('rev-result', NaN); setLabel('rev-label', 'Enter values above'); return; }
        var result = (x / y) * 100;
        setResult('rev-result', result);
        setLabel('rev-label', x + ' is ' + y + '% of ' + formatNum(result));
    }

    function calculateCurrent() {
        var mode = modes[currentMode];
        if (mode) mode.calc();
    }

    document.querySelectorAll('.pc-input').forEach(function(input) {
        input.addEventListener('input', function() {
            calculateCurrent();
        });
    });

    copyBtn.addEventListener('click', function() {
        var mode = modes[currentMode];
        var resultEl = document.getElementById(mode.result);
        var labelEl = document.getElementById(mode.label);
        if (resultEl.textContent === '--') return;
        var text = labelEl.textContent + ' = ' + resultEl.textContent;
        var done = function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 1500);
        };
        copyText(text, done);
    });

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

    clearBtn.addEventListener('click', function() {
        document.querySelectorAll('.pc-input').forEach(function(input) {
            input.value = '';
        });
        Object.keys(modes).forEach(function(key) {
            var m = modes[key];
            setLabel(m.label, 'Enter values above');
            setResult(m.result, NaN);
        });
    });

    calculateCurrent();
});
})();
