/* ============================================
   GO TOOLLY v2.0 - LOREM IPSUM GENERATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var generateBtn = document.getElementById('generate-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var textType = document.getElementById('text-type');
    var quantity = document.getElementById('quantity');
    var startWithLorem = document.getElementById('start-with-lorem');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var resultCount = document.getElementById('result-count');

    var loremWords = [
        'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
        'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
        'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
        'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
        'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
        'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
        'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
        'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
    ];

    var sentences = [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        'Nisi ut aliquip ex ea commodo consequat duis aute irure dolor.',
        'In reprehenderit in voluptate velit esse cillum dolore eu fugiat.',
        'Nulla pariatur excepteur sint occaecat cupidatat non proident.',
        'Sunt in culpa qui officia deserunt mollit anim id est laborum.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
        'Cillum dolore eu fugiat nulla pariatur excepteur sint occaecat.',
        'Cupidatat non proident sunt in culpa qui officia deserunt mollit.'
    ];

    generateBtn.addEventListener('click', generateText);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);

    function generateText() {
        var type = textType.value;
        var qty = parseInt(quantity.value, 10);
        if (!qty || qty < 1) qty = 1;
        if (qty > 100) qty = 100;
        var result = '';

        if (startWithLorem.checked && type === 'paragraphs') {
            result = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
        }

        if (type === 'paragraphs') {
            for (var i = 0; i < qty; i++) {
                var sentInPar = Math.floor(Math.random() * 4) + 4;
                for (var j = 0; j < sentInPar; j++) {
                    var sLen = Math.floor(Math.random() * 8) + 5;
                    var sWords = [];
                    for (var k = 0; k < sLen; k++) sWords.push(getRandomWord());
                    var s = sWords.join(' ');
                    result += s.charAt(0).toUpperCase() + s.slice(1) + '. ';
                }
                result += '\n\n';
            }
        } else if (type === 'sentences') {
            for (var s2 = 0; s2 < qty; s2++) {
                var len2 = Math.floor(Math.random() * 8) + 5;
                var words2 = [];
                for (var k2 = 0; k2 < len2; k2++) words2.push(getRandomWord());
                var sent2 = words2.join(' ');
                result += sent2.charAt(0).toUpperCase() + sent2.slice(1) + '. ';
                if ((s2 + 1) % 3 === 0) result += '\n';
            }
        } else if (type === 'words') {
            var ws = [];
            for (var w = 0; w < qty; w++) ws.push(getRandomWord());
            result = ws.join(' ');
        }

        resultText.textContent = result.trim();
        if (resultCount) resultCount.textContent = result.trim().length.toLocaleString() + ' chars';
        resultArea.style.display = 'block';
    }

    function getRandomWord() {
        return loremWords[Math.floor(Math.random() * loremWords.length)];
    }

    function copyResult() {
        var text = resultText.textContent;
        var done = function () {
            copyBtn.textContent = 'Copied!';
            setTimeout(function () { copyBtn.textContent = 'Copy Text'; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function(){});
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            ta.remove();
        }
    }

    function resetTool() {
        quantity.value = 5;
        resultArea.style.display = 'none';
        resultText.textContent = '';
        if (resultCount) resultCount.textContent = '0 chars';
    }
});
})();
