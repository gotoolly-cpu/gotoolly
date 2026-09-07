/* ============================================
   GO TOOLLY v2.0 - UNIX TIMESTAMP CONVERTER
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var tsInput = document.getElementById('ts-input');
    var tsFormat = document.getElementById('ts-format');
    var tsUtc = document.getElementById('ts-utc');
    var tsLocal = document.getElementById('ts-local');
    var tsNowBtn = document.getElementById('ts-now-btn');
    var tsCopyBtn = document.getElementById('ts-copy-btn');
    var tsClearBtn = document.getElementById('ts-clear-btn');
    var dtDatetime = document.getElementById('ts-datetime');
    var dtSeconds = document.getElementById('dt-seconds');
    var dtMilliseconds = document.getElementById('dt-milliseconds');
    var dtNowBtn = document.getElementById('dt-now-btn');
    var dtCopyBtn = document.getElementById('dt-copy-btn');
    var currentTimestamp = document.getElementById('current-timestamp');

    var liveInterval;

    function updateCurrentTimestamp() {
        currentTimestamp.textContent = Math.floor(Date.now() / 1000);
    }
    updateCurrentTimestamp();
    liveInterval = setInterval(updateCurrentTimestamp, 1000);

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

    function convertTimestampToDate() {
        var raw = tsInput.value.trim();
        if (!raw) { resetTsToDate(); return; }
        var num = parseFloat(raw);
        if (isNaN(num)) { resetTsToDate(); return; }
        var isMs = tsFormat.value === 'milliseconds';
        var date = isMs ? new Date(num) : new Date(num * 1000);
        if (isNaN(date.getTime())) { resetTsToDate(); return; }
        tsUtc.textContent = date.toUTCString();
        tsLocal.textContent = date.toLocaleString();
    }

    function resetTsToDate() {
        tsUtc.textContent = '--';
        tsLocal.textContent = '--';
    }

    function convertDateToTimestamp() {
        var val = dtDatetime.value;
        if (!val) { resetDtToTs(); return; }
        var date = new Date(val);
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
        if (tsUtc.textContent === '--') return;
        var text = 'UTC: ' + tsUtc.textContent + '\nLocal: ' + tsLocal.textContent;
        var done = function() {
            tsCopyBtn.textContent = 'Copied!';
            setTimeout(function() { tsCopyBtn.textContent = 'Copy Results'; }, 1500);
        };
        copyText(text, done);
    });

    tsClearBtn.addEventListener('click', function() {
        tsInput.value = '';
        tsFormat.value = 'seconds';
        resetTsToDate();
    });

    dtNowBtn.addEventListener('click', function() {
        var now = new Date();
        var offset = now.getTimezoneOffset();
        var local = new Date(now.getTime() - offset * 60000);
        dtDatetime.value = local.toISOString().slice(0, 16);
        convertDateToTimestamp();
    });

    dtCopyBtn.addEventListener('click', function() {
        if (dtSeconds.textContent === '--') return;
        var text = 'Seconds: ' + dtSeconds.textContent + '\nMilliseconds: ' + dtMilliseconds.textContent;
        var done = function() {
            dtCopyBtn.textContent = 'Copied!';
            setTimeout(function() { dtCopyBtn.textContent = 'Copy Results'; }, 1500);
        };
        copyText(text, done);
    });
});
})();
