/* ============================================
   GO TOOLLY - TEXT SUMMARIZER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var textInput = document.getElementById('text-input');
    var summarizeBtn = document.getElementById('summarize-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var statsArea = document.getElementById('stats');
    var statOriginal = document.getElementById('stat-original');
    var statSummary = document.getElementById('stat-summary');
    var statReduction = document.getElementById('stat-reduction');
    var lengthSlider = document.getElementById('summary-length');
    var lengthValue = document.getElementById('length-value');

    summarizeBtn.addEventListener('click', summarizeText);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);

    if (lengthSlider) {
        lengthSlider.addEventListener('input', function() {
            lengthValue.textContent = lengthSlider.value + '%';
        });
    }

    function summarizeText() {
        var text = textInput.value.trim();
        if (!text) {
            showNotification('Please enter some text to summarize', true);
            return;
        }

        var sentences = text.match(/[^.!?]+[.!?]+/g);
        if (!sentences || sentences.length <= 2) {
            resultText.textContent = text;
            resultArea.style.display = 'block';
            statOriginal.textContent = text.split(/\s+/).length;
            statSummary.textContent = text.split(/\s+/).length;
            statReduction.textContent = '0%';
            statsArea.style.display = 'grid';
            return;
        }

        var ratio = lengthSlider ? parseInt(lengthSlider.value) / 100 : 0.5;
        var targetCount = Math.max(1, Math.round(sentences.length * ratio));

        var wordFreq = getWordFrequency(text);
        var scored = [];
        for (var i = 0; i < sentences.length; i++) {
            var score = scoreSentence(sentences[i].trim(), wordFreq, i, sentences.length);
            scored.push({ text: sentences[i].trim(), score: score, index: i });
        }

        scored.sort(function(a, b) { return b.score - a.score; });
        var topSentences = scored.slice(0, targetCount);
        topSentences.sort(function(a, b) { return a.index - b.index; });

        var summary = topSentences.map(function(s) { return s.text; }).join(' ');
        var originalWords = text.split(/\s+/).length;
        var summaryWords = summary.split(/\s+/).length;
        var reduction = ((1 - summaryWords / originalWords) * 100).toFixed(0);

        resultText.textContent = summary;
        resultArea.style.display = 'block';

        statOriginal.textContent = originalWords;
        statSummary.textContent = summaryWords;
        statReduction.textContent = Math.max(0, reduction) + '%';
        statsArea.style.display = 'grid';
    }

    function getWordFrequency(text) {
        var words = text.toLowerCase().match(/[a-z]+/g) || {};
        var freq = {};
        var stopWords = {'the':'1','a':'1','an':'1','is':'1','are':'1','was':'1','were':'1','be':'1','been':'1','being':'1','have':'1','has':'1','had':'1','do':'1','does':'1','did':'1','will':'1','would':'1','could':'1','should':'1','may':'1','might':'1','shall':'1','can':'1','to':'1','of':'1','in':'1','for':'1','on':'1','with':'1','at':'1','by':'1','from':'1','as':'1','into':'1','through':'1','during':'1','before':'1','after':'1','and':'1','but':'1','or':'1','nor':'1','not':'1','so':'1','if':'1','then':'1','than':'1','that':'1','this':'1','these':'1','those':'1','it':'1','its':'1','i':'1','me':'1','my':'1','we':'1','our':'1','you':'1','your':'1','he':'1','him':'1','his':'1','she':'1','her':'1','they':'1','them':'1','their':'1','what':'1','which':'1','who':'1','whom':'1','when':'1','where':'1','why':'1','how':'1','all':'1','each':'1','every':'1','both':'1','few':'1','more':'1','most':'1','other':'1','some':'1','such':'1','no':'1','only':'1','own':'1','same':'1','than':'1','too':'1','very':'1','just':'1','about':'1','also':'1','up':'1','out':'1','if':'1','said':'1'};
        for (var i = 0; i < words.length; i++) {
            var w = words[i];
            if (w.length > 2 && !stopWords[w]) {
                freq[w] = (freq[w] || 0) + 1;
            }
        }
        var maxFreq = 0;
        for (var k in freq) { if (freq[k] > maxFreq) maxFreq = freq[k]; }
        for (var k in freq) { freq[k] = freq[k] / maxFreq; }
        return freq;
    }

    function scoreSentence(sentence, wordFreq, index, total) {
        var words = sentence.toLowerCase().match(/[a-z]+/g) || [];
        var score = 0;
        for (var i = 0; i < words.length; i++) {
            if (wordFreq[words[i]]) score += wordFreq[words[i]];
        }
        if (words.length > 0) score = score / words.length;

        if (index === 0) score *= 1.3;
        else if (index === 1) score *= 1.15;
        else if (index === total - 1) score *= 1.1;

        return score;
    }

    function copyResult() {
        var text = resultText.textContent;
        try {
            navigator.clipboard.writeText(text).then(function() {
                copyBtn.textContent = 'Copied!';
                setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 2000);
            }).catch(function() { fallbackCopy(text); });
        } catch (e) { fallbackCopy(text); }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); copyBtn.textContent = 'Copied!'; }
        catch (e) { copyBtn.textContent = 'Failed'; }
        document.body.removeChild(ta);
        setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 2000);
    }

    function resetTool() {
        textInput.value = '';
        resultArea.style.display = 'none';
        statsArea.style.display = 'none';
        resultText.textContent = '';
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
