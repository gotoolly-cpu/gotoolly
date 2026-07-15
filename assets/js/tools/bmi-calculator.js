document.addEventListener('DOMContentLoaded', function() {
    const metricBtn = document.getElementById('bmi-metric-btn');
    const imperialBtn = document.getElementById('bmi-imperial-btn');
    const metricSection = document.getElementById('bmi-metric');
    const imperialSection = document.getElementById('bmi-imperial');
    const heightCm = document.getElementById('bmi-height-cm');
    const weightKg = document.getElementById('bmi-weight-kg');
    const heightFt = document.getElementById('bmi-height-ft');
    const heightIn = document.getElementById('bmi-height-in');
    const weightLbs = document.getElementById('bmi-weight-lbs');
    const calcBtn = document.getElementById('bmi-calculate-btn');
    const resultDiv = document.getElementById('bmi-result');
    const bmiValue = document.getElementById('bmi-value');
    const bmiCategory = document.getElementById('bmi-category');
    const barIndicator = document.getElementById('bmi-bar-indicator');
    const rangeValue = document.getElementById('bmi-range-value');
    const copyBtn = document.getElementById('bmi-copy-btn');
    const clearBtn = document.getElementById('bmi-clear-btn');

    let isMetric = true;

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
        let bmi, heightM, weightK;
        if (isMetric) {
            const hCm = parseFloat(heightCm.value);
            const wKg = parseFloat(weightKg.value);
            if (isNaN(hCm) || isNaN(wKg) || hCm <= 0 || wKg <= 0) { hideResult(); return; }
            heightM = hCm / 100;
            weightK = wKg;
            bmi = weightK / (heightM * heightM);
        } else {
            const hFt = parseFloat(heightFt.value) || 0;
            const hIn = parseFloat(heightIn.value) || 0;
            const wLbs = parseFloat(weightLbs.value);
            if ((hFt <= 0 && hIn <= 0) || isNaN(wLbs) || wLbs <= 0) { hideResult(); return; }
            const totalIn = (hFt * 12) + hIn;
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
        const cat = getCategory(bmi);
        resultDiv.style.display = 'block';
        resultDiv.className = 'bmi-result ' + cat.class;
        bmiValue.textContent = bmi.toFixed(1);
        bmiCategory.textContent = cat.label;
        barIndicator.style.left = Math.min(cat.pct, 100) + '%';

        const healthyMin = 18.5 * heightM * heightM;
        const healthyMax = 24.9 * heightM * heightM;
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
        const text = 'BMI: ' + bmiValue.textContent + ' (' + bmiCategory.textContent + ')';
        navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 1500);
        });
    });

    clearBtn.addEventListener('click', function() {
        heightCm.value = '';
        weightKg.value = '';
        heightFt.value = '';
        heightIn.value = '';
        weightLbs.value = '';
        hideResult();
    });
});
