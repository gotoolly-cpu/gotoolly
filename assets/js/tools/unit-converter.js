document.addEventListener('DOMContentLoaded', function() {
    const category = document.getElementById('uc-category');
    const fromValue = document.getElementById('uc-from-value');
    const toValue = document.getElementById('uc-to-value');
    const fromUnit = document.getElementById('uc-from-unit');
    const toUnit = document.getElementById('uc-to-unit');
    const swapBtn = document.getElementById('uc-swap-btn');
    const resultDisplay = document.getElementById('uc-result-display');
    const resultLabel = document.getElementById('uc-result-label');
    const formulaEl = document.getElementById('uc-formula');
    const validation = document.getElementById('uc-validation');
    const copyBtn = document.getElementById('uc-copy-btn');
    const swapValuesBtn = document.getElementById('uc-swap-values-btn');
    const clearBtn = document.getElementById('uc-clear-btn');

    const units = {
        length: {
            base: 'm',
            units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 }
        },
        weight: {
            base: 'kg',
            units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, st: 6.35029, ton: 907.185, tonne: 1000 }
        },
        temperature: {
            base: 'C',
            units: { C: 'C', F: 'F', K: 'K' },
            special: true
        },
        area: {
            base: 'm2',
            units: { m2: 1, km2: 1000000, ha: 10000, acre: 4046.86, ft2: 0.092903, in2: 0.00064516, yd2: 0.836127, cm2: 0.0001 }
        },
        volume: {
            base: 'L',
            units: { L: 1, mL: 0.001, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, floz: 0.0295735, m3: 1000, in3: 0.0163871 }
        },
        speed: {
            base: 'm/s',
            units: { 'm/s': 1, 'km/h': 0.277778, 'mph': 0.44704, knot: 0.514444, 'ft/s': 0.3048, 'in/s': 0.0254 }
        },
        pressure: {
            base: 'Pa',
            units: { Pa: 1, kPa: 1000, MPa: 1000000, bar: 100000, psi: 6894.76, atm: 101325, mmHg: 133.322, inHg: 3386.39 }
        },
        energy: {
            base: 'J',
            units: { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3600000, Btu: 1055.06, ftlb: 1.35582 }
        },
        power: {
            base: 'W',
            units: { W: 1, kW: 1000, MW: 1000000, hp: 745.7, 'hp-m': 735.499, Btu_h: 0.293071, ftlb_s: 1.35582 }
        },
        storage: {
            base: 'B',
            units: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, PB: 1125899906842624, b: 0.125, Kb: 128, Mb: 131072, Gb: 134217728 }
        },
        time: {
            base: 's',
            units: { s: 1, ms: 0.001, min: 60, hr: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 }
        }
    };

    const unitLabels = {
        m: 'Meters', km: 'Kilometers', cm: 'Centimeters', mm: 'Millimeters', mi: 'Miles', yd: 'Yards', ft: 'Feet', in: 'Inches', nmi: 'Nautical Miles',
        kg: 'Kilograms', g: 'Grams', mg: 'Milligrams', lb: 'Pounds', oz: 'Ounces', st: 'Stones', ton: 'US Tons', tonne: 'Tonnes',
        C: 'Celsius', F: 'Fahrenheit', K: 'Kelvin',
        m2: 'Square Meters', km2: 'Square Kilometers', ha: 'Hectares', acre: 'Acres', ft2: 'Square Feet', in2: 'Square Inches', yd2: 'Square Yards', cm2: 'Square Centimeters',
        L: 'Liters', mL: 'Milliliters', gal: 'Gallons', qt: 'Quarts', pt: 'Pints', cup: 'Cups', floz: 'Fluid Ounces', m3: 'Cubic Meters', in3: 'Cubic Inches',
        'm/s': 'Meters/Second', 'km/h': 'Kilometers/Hour', 'mph': 'Miles/Hour', knot: 'Knots', 'ft/s': 'Feet/Second', 'in/s': 'Inches/Second',
        Pa: 'Pascals', kPa: 'Kilopascals', MPa: 'Megapascals', bar: 'Bars', psi: 'PSI', atm: 'Atmospheres', mmHg: 'mmHg', inHg: 'inHg',
        J: 'Joules', kJ: 'Kilojoules', cal: 'Calories', kcal: 'Kilocalories', Wh: 'Watt-hours', kWh: 'Kilowatt-hours', Btu: 'BTU', ftlb: 'Foot-pounds',
        W: 'Watts', kW: 'Kilowatts', MW: 'Megawatts', hp: 'Horsepower (mech)', 'hp-m': 'Horsepower (metric)', Btu_h: 'BTU/hour', ftlb_s: 'Foot-pounds/sec',
        B: 'Bytes', KB: 'Kilobytes', MB: 'Megabytes', GB: 'Gigabytes', TB: 'Terabytes', PB: 'Petabytes', b: 'Bits', Kb: 'Kilobits', Mb: 'Megabits', Gb: 'Gigabits',
        s: 'Seconds', ms: 'Milliseconds', min: 'Minutes', hr: 'Hours', day: 'Days', week: 'Weeks', month: 'Months (avg)', year: 'Years (avg)'
    };

    function populateUnits() {
        const cat = category.value;
        const data = units[cat];
        const unitKeys = Object.keys(data.units);
        fromUnit.innerHTML = '';
        toUnit.innerHTML = '';
        unitKeys.forEach(function(key) {
            const label = unitLabels[key] || key;
            fromUnit.innerHTML += '<option value="' + key + '">' + label + '</option>';
            toUnit.innerHTML += '<option value="' + key + '">' + label + '</option>';
        });
        if (unitKeys.length > 1) {
            toUnit.selectedIndex = unitKeys.length > 1 ? 1 : 0;
        }
    }

    function convert(val, from, to, cat) {
        const data = units[cat];
        if (data.special) {
            return convertTemperature(val, from, to);
        }
        const baseVal = val * data.units[from];
        return baseVal / data.units[to];
    }

    function convertTemperature(val, from, to) {
        if (from === to) return val;
        var celsius;
        if (from === 'C') celsius = val;
        else if (from === 'F') celsius = (val - 32) * 5 / 9;
        else if (from === 'K') celsius = val - 273.15;
        if (to === 'C') return celsius;
        if (to === 'F') return celsius * 9 / 5 + 32;
        if (to === 'K') return celsius + 273.15;
        return val;
    }

    function getFormula(from, to, cat) {
        if (cat === 'temperature') {
            if (from === 'C' && to === 'F') return '(°C × 9/5) + 32 = °F';
            if (from === 'F' && to === 'C') return '(°F - 32) × 5/9 = °C';
            if (from === 'C' && to === 'K') return '°C + 273.15 = K';
            if (from === 'K' && to === 'C') return 'K - 273.15 = °C';
            if (from === 'F' && to === 'K') return '(°F - 32) × 5/9 + 273.15 = K';
            if (from === 'K' && to === 'F') return '(K - 273.15) × 9/5 + 32 = °F';
            return '';
        }
        const data = units[cat];
        const fromFactor = data.units[from];
        const toFactor = data.units[to];
        if (fromFactor === 1 && toFactor === 1) return '';
        if (fromFactor === 1) return '× 1/' + toFactor;
        if (toFactor === 1) return '× ' + fromFactor;
        return '× ' + (fromFactor / toFactor).toFixed(6);
    }

    function doConversion() {
        const raw = fromValue.value.trim();
        if (!raw) { clearResult(); return; }
        const val = parseFloat(raw);
        if (isNaN(val)) {
            validation.style.display = 'block';
            clearResult();
            return;
        }
        validation.style.display = 'none';
        const cat = category.value;
        const from = fromUnit.value;
        const to = toUnit.value;
        const result = convert(val, from, to, cat);
        const display = typeof result === 'number' && !Number.isInteger(result) ? result.toFixed(10).replace(/\.?0+$/, '') : result;
        toValue.value = display;
        resultDisplay.textContent = display + ' ' + unitLabels[to] || to;
        resultLabel.textContent = val + ' ' + (unitLabels[from] || from);
        const formula = getFormula(from, to, cat);
        formulaEl.textContent = formula ? 'Formula: ' + formula : '';
    }

    function clearResult() {
        toValue.value = '';
        resultDisplay.textContent = '--';
        resultLabel.textContent = 'Enter a value to convert';
        formulaEl.textContent = '';
        validation.style.display = 'none';
    }

    category.addEventListener('change', function() {
        populateUnits();
        doConversion();
    });

    fromUnit.addEventListener('change', doConversion);
    toUnit.addEventListener('change', doConversion);
    fromValue.addEventListener('input', doConversion);

    swapBtn.addEventListener('click', function() {
        const fromIdx = fromUnit.selectedIndex;
        const toIdx = toUnit.selectedIndex;
        fromUnit.selectedIndex = toIdx;
        toUnit.selectedIndex = fromIdx;
        doConversion();
    });

    swapValuesBtn.addEventListener('click', function() {
        const fromIdx = fromUnit.selectedIndex;
        const toIdx = toUnit.selectedIndex;
        fromUnit.selectedIndex = toIdx;
        toUnit.selectedIndex = fromIdx;
        doConversion();
    });

    copyBtn.addEventListener('click', function() {
        const text = resultDisplay.textContent;
        if (text === '--') return;
        navigator.clipboard.writeText(text).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 1500);
        });
    });

    clearBtn.addEventListener('click', function() {
        fromValue.value = '';
        clearResult();
    });

    populateUnits();
});
