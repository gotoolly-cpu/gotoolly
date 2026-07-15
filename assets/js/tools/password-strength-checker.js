/* ============================================
   GO TOOLLY - PASSWORD STRENGTH CHECKER
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('password-input');
    const toggleVis = document.getElementById('toggle-visibility');
    const meterFill = document.getElementById('meter-fill');
    const scoreText = document.getElementById('score-text');
    const commonCheck = document.getElementById('common-check');
    const details = document.getElementById('ps-details');
    const chars = document.getElementById('ps-chars');
    const suggestionsDiv = document.getElementById('ps-suggestions');
    const suggestionsList = document.getElementById('suggestions-list');
    const lengthValue = document.getElementById('length-value');
    const entropyValue = document.getElementById('entropy-value');
    const poolValue = document.getElementById('pool-value');
    const crackValue = document.getElementById('crack-value');
    const upperCount = document.getElementById('upper-count');
    const lowerCount = document.getElementById('lower-count');
    const digitCount = document.getElementById('digit-count');
    const symbolCount = document.getElementById('symbol-count');
    const charUpper = document.getElementById('char-upper');
    const charLower = document.getElementById('char-lower');
    const charDigit = document.getElementById('char-digit');
    const charSymbol = document.getElementById('char-symbol');

    const COMMON = [
        '123456','password','12345678','qwerty','123456789','12345','1234','111111','1234567',
        'sunshine','qwerty123','iloveyou','princess','admin','welcome','666666','abc123','football',
        '123123','monkey','654321','!@#$%^&*','charlie','aa123456','donald','password1','qwerty12345',
        '1234567890','letmein','password123','dragon','baseball','adobe123','admin123','master',
        'photoshop','1234','ashley','batman','trustno1','hottie','starwars','hello','whatever',
        '1q2w3e4r','qwertyuiop','access','flower','555555','lovely','passw0rd','shadow','michael',
        '!@#$%^&*()','jennifer','password!','superman','andrew','asshole','charlie1','helpme',
        'freedom','hello123','hooters','hunter','jessica','jordan','killer','master123','matrix',
        'merlin','michal','michelle','midnight','miller','mistress','mookie','morgan','ncc1701',
        'newyork','nicole','nothing','nothing1','oliver','orange','orlando','pass','password12',
        'patrick','pepper','peter','phantom','phoenix','pookie','porsche','puppy','qazwsx','qwerty1',
        'ranger','rascal','redsox','redwings','remember','rightnow','robert','robin','rocker'
    ];

    input.addEventListener('input', analyze);
    toggleVis.addEventListener('click', function() {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
    });

    function analyze() {
        const pw = input.value;
        if (!pw) {
            resetDisplay();
            return;
        }

        const len = pw.length;
        const hasUpper = /[A-Z]/.test(pw);
        const hasLower = /[a-z]/.test(pw);
        const hasDigit = /\d/.test(pw);
        const hasSymbol = /[^A-Za-z0-9]/.test(pw);

        const upper = (pw.match(/[A-Z]/g) || []).length;
        const lower = (pw.match(/[a-z]/g) || []).length;
        const digit = (pw.match(/\d/g) || []).length;
        const symbol = (pw.match(/[^A-Za-z0-9]/g) || []).length;

        let poolSize = 0;
        if (hasLower) poolSize += 26;
        if (hasUpper) poolSize += 26;
        if (hasDigit) poolSize += 10;
        if (hasSymbol) poolSize += 33;

        const entropy = len > 0 && poolSize > 0 ? len * Math.log2(poolSize) : 0;
        const score = Math.min(100, Math.round((entropy / 128) * 100));

        const isCommon = COMMON.indexOf(pw.toLowerCase()) !== -1;

        const suggestions = [];
        if (len < 8) suggestions.push('Use at least 8 characters (12+ recommended)');
        if (len < 12) suggestions.push('Consider using 12 or more characters for strong security');
        if (!hasLower) suggestions.push('Add lowercase letters');
        if (!hasUpper) suggestions.push('Add uppercase letters');
        if (!hasDigit) suggestions.push('Add digits');
        if (!hasSymbol) suggestions.push('Add symbols (!@#$%^&*)');
        if (isCommon) suggestions.push('This password is too common. Choose something unique');
        if (/^[a-zA-Z]+$/.test(pw) && len > 4) suggestions.push('Mix letters with digits and symbols');
        if (/^(.)\1+$/.test(pw)) suggestions.push('Avoid repeated characters like "' + pw[0] + '"');
        if (/password/i.test(pw) && pw.toLowerCase() !== 'password') suggestions.push('Avoid the word "password" in your password');
        if (/123|abc|qwerty/i.test(pw)) suggestions.push('Avoid sequential patterns like 123, abc, or qwerty');

        updateMeter(score, entropy, isCommon);
        updateDetails(len, entropy, poolSize, score, isCommon);
        updateChars(upper, lower, digit, symbol, hasUpper, hasLower, hasDigit, hasSymbol);
        updateSuggestions(suggestions, score, pw);

        details.style.display = 'grid';
        chars.style.display = 'grid';
    }

    function updateMeter(score, entropy, isCommon) {
        let color;
        let label;
        if (isCommon || entropy < 20) {
            color = '#dc2626';
            label = 'Very Weak';
        } else if (entropy < 36) {
            color = '#f97316';
            label = 'Weak';
        } else if (entropy < 60) {
            color = '#eab308';
            label = 'Fair';
        } else if (entropy < 80) {
            color = '#84cc16';
            label = 'Strong';
        } else {
            color = '#059669';
            label = 'Very Strong';
        }

        if (isCommon) {
            color = '#dc2626';
            label = 'Compromised';
        }

        meterFill.style.width = score + '%';
        meterFill.style.background = color;
        scoreText.textContent = label;
        scoreText.style.color = color;
    }

    function updateDetails(len, entropy, pool, score, isCommon) {
        lengthValue.textContent = len + ' chars';
        entropyValue.textContent = entropy.toFixed(1) + ' bits';
        poolValue.textContent = pool + ' chars';

        const cracked = isCommon ? 'instantly (common)' : estimateCrackTime(entropy);
        crackValue.textContent = cracked;
        crackValue.className = 'value';
        if (isCommon || entropy < 28) crackValue.classList.add('bad');
        else if (entropy < 50) crackValue.classList.add('warn');
        else crackValue.classList.add('good');
    }

    function updateChars(upper, lower, digit, symbol, hasUpper, hasLower, hasDigit, hasSymbol) {
        upperCount.textContent = upper;
        lowerCount.textContent = lower;
        digitCount.textContent = digit;
        symbolCount.textContent = symbol;

        charUpper.className = 'ps-char-type' + (hasUpper ? ' present' : ' missing');
        charLower.className = 'ps-char-type' + (hasLower ? ' present' : ' missing');
        charDigit.className = 'ps-char-type' + (hasDigit ? ' present' : ' missing');
        charSymbol.className = 'ps-char-type' + (hasSymbol ? ' present' : ' missing');
    }

    function updateSuggestions(suggestions, score, pw) {
        if (suggestions.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        suggestionsDiv.style.display = 'block';
        suggestionsList.innerHTML = '';
        suggestions.forEach(function(s) {
            const li = document.createElement('li');
            li.textContent = s;
            suggestionsList.appendChild(li);
        });
    }

    function estimateCrackTime(entropy) {
        if (entropy < 28) return 'less than a second';
        if (entropy < 36) return 'seconds to minutes';
        if (entropy < 44) return 'minutes to hours';
        if (entropy < 52) return 'hours to days';
        if (entropy < 60) return 'days to months';
        if (entropy < 68) return 'months to years';
        if (entropy < 80) return 'centuries';
        return 'millions of years';
    }

    function resetDisplay() {
        meterFill.style.width = '0%';
        meterFill.style.background = 'var(--color-border)';
        scoreText.textContent = '--';
        scoreText.style.color = 'var(--color-text-light)';
        commonCheck.style.display = 'none';
        details.style.display = 'none';
        chars.style.display = 'none';
        suggestionsDiv.style.display = 'none';
    }
});
