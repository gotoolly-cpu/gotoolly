/* ============================================
   GO TOOLLY - CRON EXPRESSION GENERATOR
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    var minuteMode = document.getElementById('cron-minute-mode');
    var minuteEvery = document.getElementById('cron-minute-every');
    var minuteSpecific = document.getElementById('cron-minute-specific');
    var hourMode = document.getElementById('cron-hour-mode');
    var hourEvery = document.getElementById('cron-hour-every');
    var hourSpecific = document.getElementById('cron-hour-specific');
    var domMode = document.getElementById('cron-dom-mode');
    var domSpecific = document.getElementById('cron-dom-specific');
    var month = document.getElementById('cron-month');
    var dow = document.getElementById('cron-dow');
    var expressionDisplay = document.getElementById('cron-expression');
    var description = document.getElementById('cron-description');
    var copyBtn = document.getElementById('copy-btn');
    var resetBtn = document.getElementById('reset-btn');

    var inputs = [
        minuteMode, minuteEvery, minuteSpecific,
        hourMode, hourEvery, hourSpecific,
        domMode, domSpecific,
        month, dow
    ];

    inputs.forEach(function(el) {
        if (el) el.addEventListener('change', update);
        if (el && el.tagName === 'INPUT') el.addEventListener('input', update);
    });

    minuteMode.addEventListener('change', toggleMinuteFields);
    hourMode.addEventListener('change', toggleHourFields);
    domMode.addEventListener('change', toggleDomFields);

    document.querySelectorAll('.cron-preset-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            applyPreset(this.dataset.preset);
        });
    });

    copyBtn.addEventListener('click', copyExpression);
    resetBtn.addEventListener('click', resetForm);

    function toggleMinuteFields() {
        var mode = minuteMode.value;
        minuteEvery.style.display = mode === 'every' ? 'inline-block' : 'none';
        minuteSpecific.style.display = mode === 'specific' ? 'inline-block' : 'none';
    }

    function toggleHourFields() {
        var mode = hourMode.value;
        hourEvery.style.display = mode === 'every' ? 'inline-block' : 'none';
        hourSpecific.style.display = mode === 'specific' ? 'inline-block' : 'none';
    }

    function toggleDomFields() {
        var mode = domMode.value;
        domSpecific.style.display = mode === 'specific' ? 'inline-block' : 'none';
    }

    function getFieldValue(modeEl, everyEl, specificEl, max) {
        if (modeEl.value === 'every') {
            var n = parseInt(everyEl.value);
            if (isNaN(n) || n < 1) n = 1;
            if (n > max) n = max;
            return '*/' + n;
        }
        return specificEl.value;
    }

    function update() {
        var minute = getFieldValue(minuteMode, minuteEvery, minuteSpecific, 59);
        var hour = getFieldValue(hourMode, hourEvery, hourSpecific, 23);
        var dayOfMonth = domMode.value === 'every' ? '*' : domSpecific.value;
        var monthVal = month.value;
        var dowVal = dow.value;

        var expr = minute + ' ' + hour + ' ' + dayOfMonth + ' ' + monthVal + ' ' + dowVal;
        expressionDisplay.textContent = expr;
        description.textContent = describe(expr);
    }

    function describe(expr) {
        var parts = expr.split(' ');
        var min = parts[0], hr = parts[1], dom = parts[2], mon = parts[3], dowVal = parts[4];

        if (min === '*' && hr === '*' && dom === '*' && mon === '*' && dowVal === '*') return 'Every minute';
        if (min === '0' && hr === '*' && dom === '*' && mon === '*' && dowVal === '*') return 'Every hour';
        if (min === '0' && hr === '0' && dom === '*' && mon === '*' && dowVal === '*') return 'Daily at midnight';
        if (min === '0' && hr === '0' && dom === '1' && mon === '*' && dowVal === '*') return 'First day of every month at midnight';
        if (min === '0' && hr === '0' && dom === '1' && mon === '1' && dowVal === '*') return 'Yearly on January 1st at midnight';
        if (min === '0' && hr === '0' && dom === '*' && mon === '*' && dowVal !== '*' && dowVal !== '?') {
            var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            var dayName = days[parseInt(dowVal)] || dowVal;
            return 'Every ' + dayName + ' at midnight';
        }
        if (min.startsWith('*/')) {
            var n = min.replace('*/', '');
            if (hr === '*' && dom === '*' && mon === '*' && dowVal === '*') return 'Every ' + n + ' minutes';
        }
        if (hr.startsWith('*/')) {
            var h = hr.replace('*/', '');
            if (min === '0' && dom === '*' && mon === '*' && dowVal === '*') return 'Every ' + h + ' hours';
        }

        var desc = '';
        desc += parseMinuteDesc(min) + ' ';
        desc += parseHourDesc(hr) + ' ';
        desc += parseDomDesc(dom) + ' ';
        desc += parseMonthDesc(mon) + ' ';
        desc += parseDowDesc(dowVal);
        return desc.trim().replace(/\s+/g, ' ');
    }

    function parseMinuteDesc(val) {
        if (val === '*') return '';
        if (val.startsWith('*/')) return 'every ' + val.replace('*/', '') + ' minutes';
        return 'at minute ' + val;
    }

    function parseHourDesc(val) {
        if (val === '*') return '';
        if (val.startsWith('*/')) return 'every ' + val.replace('*/', '') + ' hours';
        var hour = parseInt(val);
        if (hour === 0) return 'at midnight';
        if (hour === 12) return 'at noon';
        return 'at ' + (hour > 12 ? (hour - 12) + ' PM' : hour + ' AM');
    }

    function parseDomDesc(val) {
        if (val === '*') return '';
        return 'on day ' + val;
    }

    function parseMonthDesc(val) {
        if (val === '*') return 'of every month';
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return 'in ' + (months[parseInt(val) - 1] || val);
    }

    function parseDowDesc(val) {
        if (val === '*') return '';
        var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        return 'on ' + (days[parseInt(val)] || val);
    }

    function applyPreset(preset) {
        switch (preset) {
            case 'every-minute':
                minuteMode.value = 'every'; minuteEvery.value = '1';
                hourMode.value = 'every'; hourEvery.value = '1';
                domMode.value = 'every';
                month.value = '*'; dow.value = '*';
                break;
            case 'hourly':
                minuteMode.value = 'specific'; minuteSpecific.value = '0';
                hourMode.value = 'every'; hourEvery.value = '1';
                domMode.value = 'every';
                month.value = '*'; dow.value = '*';
                break;
            case 'daily':
                minuteMode.value = 'specific'; minuteSpecific.value = '0';
                hourMode.value = 'specific'; hourSpecific.value = '0';
                domMode.value = 'every';
                month.value = '*'; dow.value = '*';
                break;
            case 'weekly':
                minuteMode.value = 'specific'; minuteSpecific.value = '0';
                hourMode.value = 'specific'; hourSpecific.value = '0';
                domMode.value = 'every';
                month.value = '*'; dow.value = '0';
                break;
            case 'monthly':
                minuteMode.value = 'specific'; minuteSpecific.value = '0';
                hourMode.value = 'specific'; hourSpecific.value = '0';
                domMode.value = 'specific'; domSpecific.value = '1';
                month.value = '*'; dow.value = '*';
                break;
            case 'yearly':
                minuteMode.value = 'specific'; minuteSpecific.value = '0';
                hourMode.value = 'specific'; hourSpecific.value = '0';
                domMode.value = 'specific'; domSpecific.value = '1';
                month.value = '1'; dow.value = '*';
                break;
        }
        toggleMinuteFields();
        toggleHourFields();
        toggleDomFields();
        update();
    }

    function copyExpression() {
        var text = expressionDisplay.textContent;
        if (!text) return;
        navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Expression'; }, 1500);
        });
    }

    function resetForm() {
        minuteMode.value = 'every'; minuteEvery.value = '5';
        hourMode.value = 'every'; hourEvery.value = '1';
        domMode.value = 'every';
        month.value = '*'; dow.value = '*';
        toggleMinuteFields();
        toggleHourFields();
        toggleDomFields();
        update();
    }

    toggleMinuteFields();
    toggleHourFields();
    toggleDomFields();
    update();
});
