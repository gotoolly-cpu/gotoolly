/* ============================================
   GO TOOLLY v2.0 - BARCODE GENERATOR
   ============================================ */
(function(){
'use strict';
document.addEventListener('DOMContentLoaded', function() {
    var typeSelect = document.getElementById('barcode-type');
    var textInput = document.getElementById('barcode-text');
    var sizeInput = document.getElementById('barcode-size');
    var sizeValue = document.getElementById('size-value');
    var marginInput = document.getElementById('barcode-margin');
    var marginValue = document.getElementById('margin-value');
    var generateBtn = document.getElementById('generate-btn');
    var downloadPng = document.getElementById('download-png');
    var downloadSvg = document.getElementById('download-svg');
    var canvas = document.getElementById('barcode-canvas');
    var placeholder = document.getElementById('barcode-placeholder');
    var status = document.getElementById('barcode-status');

    var currentBarcodeData = null;

    sizeInput.addEventListener('input', function() { sizeValue.textContent = this.value + 'px'; });
    marginInput.addEventListener('input', function() { marginValue.textContent = this.value + 'px'; });

    typeSelect.addEventListener('change', function() {
        var hints = {
            code128: 'Enter alphanumeric text',
            code39: 'Uppercase letters, digits, and -.$/+%',
            ean13: 'Enter 12 digits (checksum auto-calculated)',
            ean8: 'Enter 7 digits (checksum auto-calculated)',
            upca: 'Enter 11 digits (checksum auto-calculated)',
            upce: 'Enter 6 digits (checksum auto-calculated)'
        };
        textInput.placeholder = hints[this.value] || 'Enter text';
        if (['ean13','ean8','upca','upce'].indexOf(this.value) !== -1) {
            textInput.value = textInput.value.replace(/\D/g,'').slice(0,12);
        }
    });

    generateBtn.addEventListener('click', generateBarcode);

    function generateBarcode() {
        var type = typeSelect.value;
        var text = textInput.value.trim();
        if (!text) { status.textContent = 'Please enter data'; return; }
        try {
            var bars = [];
            var encodedText = text;
            switch (type) {
                case 'code128': bars = encodeCode128(text); encodedText = text; break;
                case 'code39': bars = encodeCode39(text); encodedText = text.toUpperCase(); break;
                case 'ean13': bars = encodeEAN13(text); encodedText = formatEAN13(text); break;
                case 'ean8': bars = encodeEAN8(text); encodedText = formatEAN8(text); break;
                case 'upca': bars = encodeUPCA(text); encodedText = formatUPCA(text); break;
                case 'upce': bars = encodeUPCE(text); encodedText = formatUPCE(text); break;
            }
            if (!bars || bars.length === 0) throw new Error('Encoding failed');
            currentBarcodeData = { type: type, text: text, bars: bars, encodedText: encodedText };
            drawBarcode(currentBarcodeData);
            placeholder.style.display = 'none';
            canvas.style.display = 'block';
            downloadPng.disabled = false;
            downloadSvg.disabled = false;
            status.textContent = 'Barcode generated: ' + type.toUpperCase() + ' | Text: ' + encodedText;
        } catch (e) {
            status.textContent = 'Error: ' + e.message;
        }
    }

    function drawBarcode(data) {
        var size = parseInt(sizeInput.value);
        var margin = parseInt(marginInput.value);
        var barHeight = size * 0.55;
        var ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = barHeight + margin * 2 + 40;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var totalModules = data.bars.reduce(function(s, b) { return s + b; }, 0);
        var availableWidth = size - margin * 2;
        var moduleWidth = availableWidth / totalModules;

        var x = margin;
        ctx.fillStyle = '#000000';
        for (var i = 0; i < data.bars.length; i++) {
            if (i % 2 === 0) {
                var w = data.bars[i] * moduleWidth;
                ctx.fillRect(x, margin, w, barHeight);
            }
            x += data.bars[i] * moduleWidth;
        }

        ctx.fillStyle = '#000000';
        ctx.font = (barHeight * 0.08) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(data.encodedText, size / 2, margin + barHeight + 24);
    }

    downloadPng.addEventListener('click', function() {
        if (!currentBarcodeData) return;
        drawBarcode(currentBarcodeData);
        var link = document.createElement('a');
        link.download = 'barcode-' + currentBarcodeData.type + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });

    downloadSvg.addEventListener('click', function() {
        if (!currentBarcodeData) return;
        var size = parseInt(sizeInput.value);
        var margin = parseInt(marginInput.value);
        var barHeight = size * 0.55;
        var totalModules = currentBarcodeData.bars.reduce(function(s, b) { return s + b; }, 0);
        var availableWidth = size - margin * 2;
        var moduleWidth = availableWidth / totalModules;
        var svgH = barHeight + margin * 2 + 40;

        var rects = '';
        var x = margin;
        for (var i = 0; i < currentBarcodeData.bars.length; i++) {
            if (i % 2 === 0) {
                var w = currentBarcodeData.bars[i] * moduleWidth;
                rects += '<rect x="' + x.toFixed(2) + '" y="' + margin + '" width="' + w.toFixed(2) + '" height="' + barHeight + '" fill="#000"/>';
            }
            x += currentBarcodeData.bars[i] * moduleWidth;
        }

        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + svgH + '" viewBox="0 0 ' + size + ' ' + svgH + '">' +
            '<rect width="' + size + '" height="' + svgH + '" fill="#fff"/>' +
            rects +
            '<text x="' + (size / 2) + '" y="' + (margin + barHeight + 24) + '" font-family="monospace" font-size="' + (barHeight * 0.08) + '" text-anchor="middle" fill="#000">' + escapeXml(currentBarcodeData.encodedText) + '</text></svg>';

        var blob = new Blob([svg], { type: 'image/svg+xml' });
        var link = document.createElement('a');
        link.download = 'barcode-' + currentBarcodeData.type + '.svg';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    });

    function escapeXml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function calculateCheckDigit(code) {
        var sum = 0;
        for (var i = 0; i < code.length; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
        }
        return (10 - (sum % 10)) % 10;
    }

    function encodeCode39(s) {
        var code39Map = {
            '0':'101001101101','1':'110100101011','2':'101100101011','3':'110110010101',
            '4':'101001101011','5':'110100110101','6':'101100110101','7':'101001011011',
            '8':'110100101101','9':'101100101101','A':'110101001011','B':'101101001011',
            'C':'110110100101','D':'101011001011','E':'110101100101','F':'101101100101',
            'G':'101010011011','H':'110101001101','I':'101101001101','J':'101011001101',
            'K':'110101010011','L':'101101010011','M':'110110101001','N':'101011010011',
            'O':'110101101001','P':'101101101001','Q':'101010110011','R':'110101011001',
            'S':'101101011001','T':'101011011001','U':'110010101011','V':'100110101011',
            'W':'110011010101','X':'100101101011','Y':'110010110101','Z':'100110110101',
            '-':'100101011011','.':'110010101101',' ':'100110101101','$':'100100100101',
            '/':'100100101001','+':'100101001001','%':'101001001001','*':'100101101101'
        };
        var upper = s.toUpperCase();
        var result = [1,0,1,0,0,1,0,1,1,0,1]; // start *
        for (var c = 0; c < upper.length; c++) {
            var ch = upper.charAt(c);
            var pattern = code39Map[ch];
            if (!pattern) throw new Error('Character "' + ch + '" not supported in Code 39');
            for (var b = 0; b < pattern.length; b++) result.push(parseInt(pattern.charAt(b)));
            result.push(0); // intercharacter gap
        }
        // end *
        var endPattern = code39Map['*'];
        for (var b = 0; b < endPattern.length; b++) result.push(parseInt(endPattern.charAt(b)));
        result.push(1,0,0,1,0,1,1,0,1);
        return result;
    }

    function encodeCode128(s) {
        var code128B = {
            ' ':0,'!':1,'"':2,'#':3,'$':4,'%':5,'&':6,'\'':7,'(':8,')':9,'*':10,'+':11,
            ',':12,'-':13,'.':14,'/':15,'0':16,'1':17,'2':18,'3':19,'4':20,'5':21,'6':22,
            '7':23,'8':24,'9':25,':':26,';':27,'<':28,'=':29,'>':30,'?':31,'@':32,'A':33,
            'B':34,'C':35,'D':36,'E':37,'F':38,'G':39,'H':40,'I':41,'J':42,'K':43,'L':44,
            'M':45,'N':46,'O':47,'P':48,'Q':49,'R':50,'S':51,'T':52,'U':53,'V':54,'W':55,
            'X':56,'Y':57,'Z':58,'[':59,'\\':60,']':61,'^':62,'_':63,'`':64,'a':65,'b':66,
            'c':67,'d':68,'e':69,'f':70,'g':71,'h':72,'i':73,'j':74,'k':75,'l':76,'m':77,
            'n':78,'o':79,'p':80,'q':81,'r':82,'s':83,'t':84,'u':85,'v':86,'w':87,'x':88,
            'y':89,'z':90,'{':91,'|':92,'}':93,'~':94
        };
        var encTable = [
            [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
            [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
            [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
            [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
            [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
            [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
            [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
            [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
            [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
            [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
            [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
            [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
            [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
            [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
            [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
            [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
            [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
            [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
            [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
            [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
            [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
            [2,1,1,2,3,2],[2,3,3,1,1,1,2]
        ];
        var chars = [];
        for (var c = 0; c < s.length; c++) {
            var charCode = code128B[s.charAt(c)];
            if (charCode === undefined) throw new Error('Character "' + s.charAt(c) + '" not supported in Code 128');
            chars.push(charCode);
        }
        var check = 104; // Start Code B
        var values = [104];
        for (var i = 0; i < chars.length; i++) {
            values.push(chars[i]);
            check += chars[i] * (i + 1);
        }
        values.push(check % 103);
        values.push(106); // Stop
        var result = [];
        for (var v = 0; v < values.length; v++) {
            var enc = encTable[values[v]];
            if (!enc) continue;
            for (var w = 0; w < enc.length; w++) result.push(enc[w]);
            if (values[v] !== values[values.length - 1]) result.push(1);
        }
        return result;
    }

    function encodeEAN13(s) {
        var parity = [
            [1,1,1,1,1,1],[1,1,0,1,0,0],[1,1,0,0,1,0],[1,1,0,0,0,1],[1,0,1,1,0,0],
            [1,0,0,1,1,0],[1,0,0,0,1,1],[1,0,1,0,0,1],[1,0,1,0,1,0],[1,0,0,1,0,1]
        ];
        var Lcodes = [
            [3,2,1,1],[2,2,2,1],[2,1,2,2],[1,4,1,1],[1,1,3,2],[1,2,3,1],[1,1,1,4],[1,3,1,2],[1,2,1,3],[3,1,1,2]
        ];
        var Rcodes = [
            [1,1,2,3],[1,2,2,2],[2,2,1,2],[1,1,4,1],[2,3,1,1],[1,2,1,3],[4,1,1,1],[2,1,3,1],[3,1,2,1],[2,1,1,3]
        ];
        var digits = s.replace(/\D/g,'').split('').map(Number);
        if (digits.length < 12) throw new Error('EAN-13 requires at least 12 digits');
        digits = digits.slice(0,12);
        var check = calculateCheckDigit(digits.join(''));
        digits.push(check);
        var result = [1,1,1]; // start guard
        var p = parity[digits[0]];
        for (var i = 1; i <= 6; i++) {
            var d = digits[i];
            var enc = p[i - 1] ? Rcodes[d] : Lcodes[d];
            for (var w = 0; w < enc.length; w++) result.push(enc[w]);
            if (i < 6) result.push(0,1);
        }
        result.push(1,1,1,1,1); // middle guard
        for (var i = 7; i <= 12; i++) {
            var enc = Rcodes[digits[i]];
            for (var w = 0; w < enc.length; w++) result.push(enc[w]);
            if (i < 12) result.push(0,1);
        }
        result.push(1,1,1); // end guard
        return result;
    }

    function formatEAN13(s) {
        var d = s.replace(/\D/g,'').slice(0,12);
        if (d.length < 12) d = d + '000000000000'.slice(0, 12 - d.length);
        d += calculateCheckDigit(d);
        return d;
    }

    function encodeEAN8(s) {
        var Lcodes = [
            [3,2,1,1],[2,2,2,1],[2,1,2,2],[1,4,1,1],[1,1,3,2],[1,2,3,1],[1,1,1,4],[1,3,1,2],[1,2,1,3],[3,1,1,2]
        ];
        var Rcodes = [
            [1,1,2,3],[1,2,2,2],[2,2,1,2],[1,1,4,1],[2,3,1,1],[1,2,1,3],[4,1,1,1],[2,1,3,1],[3,1,2,1],[2,1,1,3]
        ];
        var digits = s.replace(/\D/g,'').split('').map(Number);
        if (digits.length < 7) throw new Error('EAN-8 requires at least 7 digits');
        digits = digits.slice(0,7);
        var check = calculateCheckDigit(digits.join(''));
        digits.push(check);
        var result = [1,1,1];
        for (var i = 0; i < 4; i++) {
            var enc = Lcodes[digits[i]];
            for (var w = 0; w < enc.length; w++) result.push(enc[w]);
            if (i < 3) result.push(0,1);
        }
        result.push(1,1,1,1,1);
        for (var i = 4; i < 8; i++) {
            var enc = Rcodes[digits[i]];
            for (var w = 0; w < enc.length; w++) result.push(enc[w]);
            if (i < 7) result.push(0,1);
        }
        result.push(1,1,1);
        return result;
    }

    function formatEAN8(s) {
        var d = s.replace(/\D/g,'').slice(0,7);
        if (d.length < 7) d = d + '0000000'.slice(0, 7 - d.length);
        d += calculateCheckDigit(d);
        return d;
    }

    function encodeUPCA(s) {
        var Lcodes = [
            [3,2,1,1],[2,2,2,1],[2,1,2,2],[1,4,1,1],[1,1,3,2],[1,2,3,1],[1,1,1,4],[1,3,1,2],[1,2,1,3],[3,1,1,2]
        ];
        var Rcodes = [
            [1,1,2,3],[1,2,2,2],[2,2,1,2],[1,1,4,1],[2,3,1,1],[1,2,1,3],[4,1,1,1],[2,1,3,1],[3,1,2,1],[2,1,1,3]
        ];
        var digits = s.replace(/\D/g,'').split('').map(Number);
        if (digits.length < 11) throw new Error('UPC-A requires at least 11 digits');
        digits = digits.slice(0,11);
        var check = calculateCheckDigit(digits.join(''));
        digits.push(check);
        var result = [1,1,1];
        for (var i = 0; i < 6; i++) {
            var enc = Lcodes[digits[i]];
            for (var w = 0; w < enc.length; w++) result.push(enc[w]);
            if (i < 5) result.push(0,1);
        }
        result.push(1,1,1,1,1);
        for (var i = 6; i < 12; i++) {
            var enc = Rcodes[digits[i]];
            for (var w = 0; w < enc.length; w++) result.push(enc[w]);
            if (i < 11) result.push(0,1);
        }
        result.push(1,1,1);
        return result;
    }

    function formatUPCA(s) {
        var d = s.replace(/\D/g,'').slice(0,11);
        if (d.length < 11) d = d + '00000000000'.slice(0, 11 - d.length);
        d += calculateCheckDigit(d);
        return d;
    }

    function encodeUPCE(s) {
        var patterns = [
            [3,2,1,1],[2,2,2,1],[2,1,2,2],[1,4,1,1],[1,1,3,2],[1,2,3,1],[1,1,1,4],[1,3,1,2],[1,2,1,3],[3,1,1,2]
        ];
        var digits = s.replace(/\D/g,'').split('').map(Number);
        if (digits.length < 6) throw new Error('UPC-E requires at least 6 digits');
        digits = digits.slice(0,6);
        var result = [1,1,1];
        for (var i = 0; i < 6; i++) {
            var enc = patterns[digits[i]];
            for (var w = 0; w < enc.length; w++) result.push(enc[w]);
            if (i < 5) result.push(0,1);
        }
        result.push(1,1,1,1,1,1);
        return result;
    }

    function formatUPCE(s) {
        var d = s.replace(/\D/g,'').slice(0,6);
        while (d.length < 6) d += '0';
        return d;
    }
});
})();
