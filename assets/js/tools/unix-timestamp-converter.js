document.addEventListener('DOMContentLoaded', function() {
    const tsInput = document.getElementById('ts-input');
    const tsFormat = document.getElementById('ts-format');
    const tsUtc = document.getElementById('ts-utc');
    const tsLocal = document.getElementById('ts-local');
    const tsNowBtn = document.getElementById('ts-now-btn');
    const tsCopyBtn = document.getElementById('ts-copy-btn');
    const tsClearBtn = document.getElementById('ts-clear-btn');
    const dtDatetime = document.getElementById('ts-datetime');
    const dtSeconds = document.getElementById('dt-seconds');
    const dtMilliseconds = document.getElementById('dt-milliseconds');
    const dtNowBtn = document.getElementById('dt-now-btn');
    const dtCopyBtn = document.getElementById('dt-copy-btn');
    const currentTimestamp = document.getElementById('current-timestamp');

    let liveInterval;

    function updateCurrentTimestamp() {
        currentTimestamp.textContent = Math.floor(Date.now() / 1000);
    }
    updateCurrentTimestamp();
    liveInterval = setInterval(updateCurrentTimestamp, 1000);

    function convertTimestampToDate() {
        const raw = tsInput.value.trim();
        if (!raw) { resetTsToDate(); return; }
        const num = parseFloat(raw);
        if (isNaN(num)) { resetTsToDate(); return; }
        const isMs = tsFormat.value === 'milliseconds';
        const date = isMs ? new Date(num) : new Date(num * 1000);
        if (isNaN(date.getTime())) { resetTsToDate(); return; }
        tsUtc.textContent = date.toUTCString();
        tsLocal.textContent = date.toLocaleString();
    }

    function resetTsToDate() {
        tsUtc.textContent = '--';
        tsLocal.textContent = '--';
    }

    function convertDateToTimestamp() {
        const val = dtDatetime.value;
        if (!val) { resetDtToTs(); return; }
        const date = new Date(val);
        if (isNaN(date.getTime())) { resetDtToTs(); return; }
        dtSeconds.textContent = Math.floor(date.getTime() / 1000);
        dtMilliseconds.textContent = date.getTime();
    }

    function resetDtToTs() {
        dtSeconds.textContent = '--';
        dtMilliseconds.textContent = '--';
    }

    tsInput.addEventListener('input', convertTimestampToDate);
    tsFormat.addEventListener('change', convertTimestampToDate);

    dtDatetime.addEventListener('input', convertDateToTimestamp);

    tsNowBtn.addEventListener('click', function() {
        tsInput.value = Math.floor(Date.now() / 1000);
        tsFormat.value = 'seconds';
        convertTimestampToDate();
    });

    tsCopyBtn.addEventListener('click', function() {
        const text = 'UTC: ' + tsUtc.textContent + '\nLocal: ' + tsLocal.textContent;
        if (tsUtc.textContent === '--') return;
        navigator.clipboard.writeText(text).then(function() {
            tsCopyBtn.textContent = 'Copied!';
            setTimeout(function() { tsCopyBtn.textContent = 'Copy Results'; }, 1500);
        });
    });

    tsClearBtn.addEventListener('click', function() {
        tsInput.value = '';
        tsFormat.value = 'seconds';
        resetTsToDate();
    });

    dtNowBtn.addEventListener('click', function() {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const local = new Date(now.getTime() - offset * 60000);
        dtDatetime.value = local.toISOString().slice(0, 16);
        convertDateToTimestamp();
    });

    dtCopyBtn.addEventListener('click', function() {
        const text = 'Seconds: ' + dtSeconds.textContent + '\nMilliseconds: ' + dtMilliseconds.textContent;
        if (dtSeconds.textContent === '--') return;
        navigator.clipboard.writeText(text).then(function() {
            dtCopyBtn.textContent = 'Copied!';
            setTimeout(function() { dtCopyBtn.textContent = 'Copy Results'; }, 1500);
        });
    });

    function formatNumber(n) {
        return n.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2});
    }
});
