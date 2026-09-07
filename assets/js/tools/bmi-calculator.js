/* ============================================
   GO TOOLLY v2.0 - BMI CALCULATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var metricBtn = document.getElementById('bmi-metric-btn');
    var imperialBtn = document.getElementById('bmi-imperial-btn');
    var metricSection = document.getElementById('bmi-metric');
    var imperialSection = document.getElementById('bmi-imperial');
    var heightCm = document.getElementById('bmi-height-cm');
    var weightKg = document.getElementById('bmi-weight-kg');
    var heightFt = document.getElementById('bmi-height-ft');
    var heightIn = document.getElementById('bmi-height-in');
    var weightLbs = document.getElementById('bmi-weight-lbs');
    var calcBtn = document.getElementById('bmi-calculate-btn');
    var resultDiv = document.getElementById('bmi-result');
    var bmiValue = document.getElementById('bmi-value');
    var bmiCategory = document.getElementById('bmi-category');
    var barIndicator = document.getElementById('bmi-bar-indicator');
    var rangeValue = document.getElementById('bmi-range-value');
    var copyBtn = document.getElementById('bmi-copy-btn');
    var clearBtn = document.getElementById('bmi-clear-btn');

    var isMetric = true;

    function setActiveToggle(metric) {
        isMetric = metric;
        metricBtn.classList.toggle('active', metric);
        imperialBtn.classList.toggle('active', !metric);
        metricSection.style.display = metric ? 'block' : 'none';
        imperialSection.style.display = metric ? 'none' : 'block';
    }

    metricBtn.addEventListener('click', function() { setActiveToggle(true); });
    imperialBtn.addEventListener('click', function() { setActiveToggle(false); });

    function calculateBMI() {
        var bmi, heightM, weightK;
        if (isMetric) {
            var hCm = parseFloat(heightCm.value);
            var wKg = parseFloat(weightKg.value);
            if (isNaN(hCm) || isNaN(wKg) || hCm <= 0 || wKg <= 0) { hideResult(); return; }
            heightM = hCm / 100;
            weightK = wKg;
            bmi = weightK / (heightM * heightM);
        } else {
            var hFt = parseFloat(heightFt.value) || 0;
            var hIn = parseFloat(heightIn.value) || 0;
            var wLbs = parseFloat(weightLbs.value);
            if ((hFt <= 0 && hIn <= 0) || isNaN(wLbs) || wLbs <= 0) { hideResult(); return; }
            var totalIn = (hFt * 12) + hIn;
            if (totalIn <= 0) { hideResult(); return; }
            bmi = (wLbs / (totalIn * totalIn)) * 703;
            heightM = totalIn * 0.0254;
            weightK = wLbs * 0.453592;
        }

        showResult(bmi, heightM);
    }

    function getCategory(bmi) {
        if (bmi < 18.5) return { label: 'Underweight', class: 'underweight', pct: (bmi / 40) * 100 };
        if (bmi < 25) return { label: 'Normal', class: 'normal', pct: (bmi / 40) * 100 };
        if (bmi < 30) return { label: 'Overweight', class: 'overweight', pct: (bmi / 40) * 100 };
        return { label: 'Obese', class: 'obese', pct: Math.min((bmi / 40) * 100, 100) };
    }

    function showResult(bmi, heightM) {
        var cat = getCategory(bmi);
        resultDiv.style.display = 'block';
        resultDiv.className = 'bmi-result ' + cat.class;
        bmiValue.textContent = bmi.toFixed(1);
        bmiCategory.textContent = cat.label;
        barIndicator.style.left = Math.min(cat.pct, 100) + '%';

        var healthyMin = 18.5 * heightM * heightM;
        var healthyMax = 24.9 * heightM * heightM;
        if (isMetric) {
            rangeValue.textContent = healthyMin.toFixed(1) + ' kg - ' + healthyMax.toFixed(1) + ' kg';
        } else {
            rangeValue.textContent = (healthyMin * 2.20462).toFixed(1) + ' lbs - ' + (healthyMax * 2.20462).toFixed(1) + ' lbs';
        }
    }

    function hideResult() {
        resultDiv.style.display = 'none';
    }

    calcBtn.addEventListener('click', calculateBMI);

    [heightCm, weightKg, heightFt, heightIn, weightLbs].forEach(function(el) {
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') calculateBMI();
        });
    });

    copyBtn.addEventListener('click', function() {
        if (resultDiv.style.display === 'none') return;
        var text = 'BMI: ' + bmiValue.textContent + ' (' + bmiCategory.textContent + ')';
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
        heightCm.value = '';
        weightKg.value = '';
        heightFt.value = '';
        heightIn.value = '';
        weightLbs.value = '';
        hideResult();
    });
});
})();
