/* ============================================
   GO TOOLLY v2.0 - PASSWORD GENERATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var lengthSlider = document.getElementById('password-length');
    var lengthDisplay = document.getElementById('length-display');
    var generateBtn = document.getElementById('generate-btn');
    var generateMultipleBtn = document.getElementById('generate-multiple-btn');
    var copyBtn = document.getElementById('copy-btn');
    var passwordText = document.getElementById('password-text');
    var strengthBar = document.getElementById('strength-bar');
    var strengthText = document.getElementById('strength-text');

    var CHARS = {
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    lengthSlider.addEventListener('input', function () {
        lengthDisplay.textContent = lengthSlider.value;
    });
    generateBtn.addEventListener('click', generatePassword);
    generateMultipleBtn.addEventListener('click', generateMultiple);
    copyBtn.addEventListener('click', copyPassword);

    function selectedChars() {
        var out = '';
        Object.keys(CHARS).forEach(function (k) {
            var el = document.querySelector('input[name="' + k + '"]');
            if (el && el.checked) out += CHARS[k];
        });
        return out;
    }

    function randomPw(chars, len) {
        var pw = '';
        var vals = new Uint32Array(len);
        crypto.getRandomValues(vals);
        for (var i = 0; i < len; i++) pw += chars.charAt(vals[i] % chars.length);
        return pw;
    }

    function generatePassword() {
        var len = parseInt(lengthSlider.value, 10) || 16;
        var chars = selectedChars();
        if (!chars) {
            alert('Select at least one character type');
            return;
        }
        var pw = randomPw(chars, len);
        passwordText.textContent = pw;
        updateStrength(pw);
    }

    function generateMultiple() {
        var chars = selectedChars();
        if (!chars) chars = CHARS.lowercase;
        var len = parseInt(lengthSlider.value, 10) || 16;
        var list = [];
        for (var i = 0; i < 5; i++) list.push(randomPw(chars, len));
        passwordText.textContent = list.join('\n');
        updateStrength(list[0]);
    }

    function updateStrength(pw) {
        var s = 0;
        if (pw.length >= 8) s += 25;
        if (pw.length >= 12) s += 25;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 25;
        if (/\d/.test(pw)) s += 12.5;
        if (/[!@#$%^&*]/.test(pw)) s += 12.5;
        var label = s >= 75 ? 'Strong' : (s >= 50 ? 'Medium' : 'Weak');
        strengthBar.style.width = s + '%';
        strengthBar.style.backgroundColor = s < 50 ? '#ef4444' : (s < 75 ? '#f59e0b' : '#10b981');
        strengthText.textContent = label;
    }

    function copyPassword() {
        var pw = passwordText.textContent;
        var done = function () {
            copyBtn.textContent = 'Copied!';
            setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000);
        };
        var fallback = function () {
            var ta = document.createElement('textarea');
            ta.value = pw;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            ta.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(pw).then(done, fallback);
        } else {
            fallback();
        }
    }

    window.passwordGenerator = { generatePassword: generatePassword, copyPassword: copyPassword };
});
})();
