/* ============================================
   GO TOOLLY - READABILITY CHECKER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var textInput = document.getElementById('text-input');
    var analyzeBtn = document.getElementById('analyze-btn');
    var resetBtn = document.getElementById('reset-btn');
    var resultArea = document.getElementById('result-area');

    analyzeBtn.addEventListener('click', analyzeText);
    resetBtn.addEventListener('click', resetTool);

    function analyzeText() {
        var text = textInput.value.trim();
        if (!text) {
            showNotification('Please enter some text to analyze', true);
            return;
        }

        var words = text.split(/\s+/).filter(function(w) { return w.length > 0; });
        var sentences = text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 0; });
        var syllables = 0;
        for (var i = 0; i < words.length; i++) {
            syllables += countSyllables(words[i]);
        }

        var wordCount = words.length;
        var sentenceCount = sentences.length || 1;
        var syllableCount = syllables;
        var avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);
        var avgSyllablesPerWord = (syllableCount / wordCount).toFixed(2);

        var fleschKincaid = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;
        fleschKincaid = Math.max(0, fleschKincaid).toFixed(1);

        var fleschEase = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);
        fleschEase = Math.max(0, Math.min(100, fleschEase)).toFixed(1);

        var readingTime = Math.ceil(wordCount / 200);
        var readingLevel = getReadingLevel(parseFloat(fleschEase));

        document.getElementById('fk-grade').textContent = fleschKincaid;
        document.getElementById('fk-ease').textContent = fleschEase;
        document.getElementById('reading-level').textContent = readingLevel;
        document.getElementById('reading-time').textContent = readingTime + ' min';
        document.getElementById('word-count').textContent = wordCount;
        document.getElementById('sentence-count').textContent = sentenceCount;
        document.getElementById('syllable-count').textContent = syllableCount;
        document.getElementById('avg-wps').textContent = avgWordsPerSentence;
        document.getElementById('avg-spw').textContent = avgSyllablesPerWord;

        var easeBar = document.getElementById('ease-bar');
        if (easeBar) easeBar.style.width = fleschEase + '%';

        resultArea.style.display = 'block';
    }

    function countSyllables(word) {
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        var m = word.match(/[aeiouy]{1,2}/g);
        return m ? m.length : 1;
    }

    function getReadingLevel(ease) {
        if (ease >= 90) return 'Very Easy';
        if (ease >= 80) return 'Easy';
        if (ease >= 70) return 'Fairly Easy';
        if (ease >= 60) return 'Standard';
        if (ease >= 50) return 'Fairly Difficult';
        if (ease >= 30) return 'Difficult';
        return 'Very Confusing';
    }

    function resetTool() {
        textInput.value = '';
        resultArea.style.display = 'none';
    }

    function showNotification(msg, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }
});
