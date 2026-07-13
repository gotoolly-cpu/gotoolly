/* ============================================
   GO TOOLLY - COLOR PICKER & CONVERTER
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('color-wheel');
    const ctx = canvas.getContext('2d');
    const nativePicker = document.getElementById('native-picker');
    const preview = document.getElementById('color-preview');
    const valHex = document.getElementById('val-hex');
    const valRgb = document.getElementById('val-rgb');
    const valHsl = document.getElementById('val-hsl');
    const valCmyk = document.getElementById('val-cmyk');
    const shadesGrid = document.getElementById('shades-grid');

    let currentColor = { r: 37, g: 99, b: 235 };

    drawColorWheel();
    updateAll('#2563EB');

    canvas.addEventListener('click', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * canvas.width;
        const y = (e.clientY - rect.top) / rect.height * canvas.height;
        const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        nativePicker.value = hex;
        updateAll(hex);
    });

    nativePicker.addEventListener('input', function() {
        updateAll(nativePicker.value);
    });

    document.querySelectorAll('.copy-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const target = document.getElementById(btn.dataset.target);
            if (target) {
                navigator.clipboard.writeText(target.value).then(function() {
                    btn.textContent = 'Copied!';
                    setTimeout(function() { btn.textContent = 'Copy'; }, 1200);
                });
            }
        });
    });

    function updateAll(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return;
        currentColor = rgb;
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

        preview.style.background = hex;
        valHex.value = hex.toUpperCase();
        valRgb.value = 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
        valHsl.value = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';
        valCmyk.value = 'cmyk(' + cmyk.c + '%, ' + cmyk.m + '%, ' + cmyk.y + '%, ' + cmyk.k + '%)';

        generateShades(hsl);
        checkContrast(rgb);
    }

    function drawColorWheel() {
        const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = w / 2;
        for (let angle = 0; angle < 360; angle += 0.5) {
            const startAngle = (angle - 0.5) * Math.PI / 180;
            const endAngle = (angle + 0.5) * Math.PI / 180;
            for (let rad = 0; rad < r; rad += 1) {
                const x = cx + rad * Math.cos(startAngle);
                const y = cy + rad * Math.sin(startAngle);
                const sat = (rad / r) * 100;
                const light = 50;
                ctx.fillStyle = 'hsl(' + angle + ', ' + sat + '%, ' + light + '%)';
                ctx.fillRect(x, y, 2, 2);
            }
        }
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    function generateShades(hsl) {
        shadesGrid.innerHTML = '';
        var percents = [10, 20, 30, 40, 50, 60, 70, 80, 90];
        percents.forEach(function(p) {
            var rgb = hslToRgb(hsl.h, hsl.s, p);
            var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            var cell = document.createElement('div');
            cell.className = 'shade-cell';
            cell.style.background = hex;
            cell.title = hex;
            cell.addEventListener('click', function() {
                nativePicker.value = hex;
                updateAll(hex);
            });
            shadesGrid.appendChild(cell);
        });
    }

    function checkContrast(rgb) {
        var lumi = relativeLuminance(rgb.r, rgb.g, rgb.b);
        var ratioW = (1.05) / (lumi + 0.05);
        var ratioB = (lumi + 0.05) / 0.05;
        setContrast('ratio-white', 'contrast-white', ratioW, '#fff', rgb);
        setContrast('ratio-black', 'contrast-black', ratioB, '#000', rgb);
    }

    function setContrast(ratioId, pairId, ratio, bg, fg) {
        var el = document.getElementById(ratioId);
        var pair = document.getElementById(pairId);
        var r = ratio.toFixed(2);
        var pass = ratio >= 4.5;
        el.textContent = r + ':1 ' + (pass ? 'AA Pass' : 'Fail');
        el.className = 'contrast-badge ' + (pass ? 'contrast-pass' : 'contrast-fail');
        pair.style.background = bg;
        pair.style.color = bg === '#fff' ? 'rgb(' + fg.r + ',' + fg.g + ',' + fg.b + ')' : '#fff';
    }

    function relativeLuminance(r, g, b) {
        var a = [r, g, b].map(function(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        var n = parseInt(hex, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(function(x) { var h = x.toString(16); return h.length === 1 ? '0' + h : h; }).join('');
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b), h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        var r, g, b;
        if (s === 0) { r = g = b = l; } else {
            function hue2rgb(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; }
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    function rgbToCmyk(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var k = 1 - Math.max(r, g, b);
        if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
        return {
            c: Math.round(((1 - r - k) / (1 - k)) * 100),
            m: Math.round(((1 - g - k) / (1 - k)) * 100),
            y: Math.round(((1 - b - k) / (1 - k)) * 100),
            k: Math.round(k * 100)
        };
    }
});