/* ============================================
   GO TOOLLY - QR CODE / BARCODE GENERATOR
   ============================================ */
document.addEventListener('DOMContentLoaded', function () {
    var typeFormMap = {
        code128: 'form-generic', code39: 'form-generic', code93: 'form-generic', itf14: 'form-generic',
        qrcode: 'form-generic', datamatrix: 'form-generic', pdf417: 'form-generic',
        ean13: 'form-ean', ean8: 'form-ean', upca: 'form-ean', upce: 'form-ean',
        isbn13: 'form-isbn', isbn10: 'form-isbn',
        vcard: 'form-vcard', mecard: 'form-generic'
    };
    var typeCategoryMap = {
        code128: 'linear', code39: 'linear', code93: 'linear', itf14: 'linear',
        qrcode: '2d', datamatrix: '2d', pdf417: '2d',
        ean13: 'ean', ean8: 'ean', upca: 'ean', upce: 'ean',
        isbn13: 'isbn', isbn10: 'isbn',
        vcard: 'business', mecard: 'business'
    };
    var typeNames = {
        code128: 'Code-128', code39: 'Code-39', code93: 'Code-93', itf14: 'ITF-14',
        qrcode: 'QR Code', datamatrix: 'Data Matrix', pdf417: 'PDF417',
        ean13: 'EAN-13', ean8: 'EAN-8', upca: 'UPC-A', upce: 'UPC-E',
        isbn13: 'ISBN-13', isbn10: 'ISBN-10',
        vcard: 'vCard QR', mecard: 'MeCard QR'
    };
    var typeHelpTexts = {
        code128: 'Accepts any ASCII text. Most versatile barcode format.',
        code39: 'Uppercase letters (A-Z), digits (0-9), and special chars: - . $ / + % SPACE',
        code93: 'Uppercase letters (A-Z), digits (0-9), and special chars: - . $ / + % SPACE',
        itf14: 'Exactly 13 or 14 digits. Used for shipping cartons.',
        qrcode: 'Enter any text, URL, or data. Max 4296 alphanumeric characters.',
        datamatrix: 'Enter text data. Great for small items and packaging.',
        pdf417: 'Enter text data. Used for documents and IDs.',
        ean13: 'Enter 12 digits. Check digit will be auto-calculated.',
        ean8: 'Enter 7 digits. Check digit will be auto-calculated.',
        upca: 'Enter 11 digits. Check digit will be auto-calculated.',
        upce: 'Enter 6 digits. Compressed UPC-A code.',
        isbn13: 'Enter 12 digits. Check digit will be auto-calculated.',
        isbn10: 'Enter 9 digits. Check digit will be auto-calculated.',
        vcard: 'Fill in contact details below to generate a vCard QR code.',
        mecard: 'Enter name, phone, and email separated by commas in the text area.'
    };
    var jsBarcodeFormats = {
        code128: 'CODE128', code39: 'CODE39', code93: 'CODE93', itf14: 'ITF-14',
        ean13: 'EAN13', ean8: 'EAN8', upca: 'UPC', upce: 'UPCE',
        datamatrix: 'DATAMATRIX', pdf417: 'PDF417',
        isbn13: 'ISBN', isbn10: 'EAN13'
    };

    var barcodeDisplay = document.getElementById('barcodeDisplay');
    var barcodeInfo = document.getElementById('barcodeInfo');
    var resultStatus = document.getElementById('result-status');
    var formStatus = document.getElementById('form-status');
    var typeHelp = document.getElementById('type-help');
    var copyBtn = document.getElementById('copyBtn');
    var viewBtn = document.getElementById('viewBtn');
    var downloadBtn = document.getElementById('downloadBtn');
    var clearBtn = document.getElementById('clearBtn');
    var fullscreenModal = document.getElementById('fullscreenModal');
    var fullscreenClose = document.getElementById('fullscreenClose');
    var fullscreenImage = document.getElementById('fullscreenImage');
    var contentTextarea = document.getElementById('content');
    var numericCodeInput = document.getElementById('numericCode');
    var eanHelp = document.getElementById('ean-help');
    var isbnNumberInput = document.getElementById('isbnNumber');
    var isbnHelp = document.getElementById('form-isbn') ? document.querySelector('#form-isbn .form-help') : null;

    var selectedType = null;
    var currentCanvas = null;
    var currentDataURL = null;

    function showStatus(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'status-message ' + type;
    }

    function clearStatus(el) {
        if (!el) return;
        el.textContent = '';
        el.className = 'status-message';
    }

    function calculateCheckDigitEAN(code) {
        var sum = 0;
        for (var i = 0; i < code.length; i++) {
            sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        return (10 - (sum % 10)) % 10;
    }

    function calculateCheckDigitISBN10(code) {
        var sum = 0;
        for (var i = 0; i < code.length; i++) {
            sum += parseInt(code[i], 10) * (10 - i);
        }
        var remainder = sum % 11;
        return remainder === 0 ? '0' : (11 - remainder === 10 ? 'X' : String(11 - remainder));
    }

    function validateInput(type, data) {
        if (!data || !data.trim()) {
            return { valid: false, message: 'Please enter data to generate.' };
        }
        var trimmed = data.trim();
        var digits;
        switch (type) {
            case 'code128':
                if (!/^[\x20-\x7E]+$/.test(trimmed)) {
                    return { valid: false, message: 'Code-128 accepts any ASCII printable character.' };
                }
                break;
            case 'code39':
                if (!/^[A-Z0-9\-. $/+%]+$/.test(trimmed.toUpperCase())) {
                    return { valid: false, message: 'Code-39 accepts uppercase letters, digits, and - . $ / + % SPACE.' };
                }
                break;
            case 'code93':
                if (!/^[A-Z0-9\-. $/+%]+$/.test(trimmed.toUpperCase())) {
                    return { valid: false, message: 'Code-93 accepts uppercase letters, digits, and - . $ / + % SPACE.' };
                }
                break;
            case 'itf14':
                digits = trimmed.replace(/\D/g, '');
                if (digits.length < 13 || digits.length > 14) {
                    return { valid: false, message: 'ITF-14 requires exactly 13 or 14 digits.' };
                }
                break;
            case 'qrcode':
            case 'datamatrix':
            case 'pdf417':
                break;
            case 'ean13':
                digits = trimmed.replace(/\D/g, '');
                if (digits.length < 12 || digits.length > 13) {
                    return { valid: false, message: 'EAN-13 requires 12 or 13 digits.' };
                }
                break;
            case 'ean8':
                digits = trimmed.replace(/\D/g, '');
                if (digits.length < 7 || digits.length > 8) {
                    return { valid: false, message: 'EAN-8 requires 7 or 8 digits.' };
                }
                break;
            case 'upca':
                digits = trimmed.replace(/\D/g, '');
                if (digits.length < 11 || digits.length > 12) {
                    return { valid: false, message: 'UPC-A requires 11 or 12 digits.' };
                }
                break;
            case 'upce':
                digits = trimmed.replace(/\D/g, '');
                if (digits.length < 6 || digits.length > 8) {
                    return { valid: false, message: 'UPC-E requires 6 to 8 digits.' };
                }
                break;
            case 'isbn13':
                digits = trimmed.replace(/\D/g, '');
                if (digits.length < 12 || digits.length > 13) {
                    return { valid: false, message: 'ISBN-13 requires 12 or 13 digits.' };
                }
                break;
            case 'isbn10':
                digits = trimmed.replace(/[^0-9Xx]/g, '');
                if (digits.length < 9 || digits.length > 10) {
                    return { valid: false, message: 'ISBN-10 requires 9 or 10 digits (check digit can be X).' };
                }
                break;
            case 'vcard':
                break;
            case 'mecard':
                break;
            default:
                return { valid: false, message: 'Unknown barcode type.' };
        }
        return { valid: true };
    }

    function prepareBarcodeData(type, raw) {
        var trimmed = raw.trim();
        var digits;
        switch (type) {
            case 'ean13':
                digits = trimmed.replace(/\D/g, '').slice(0, 12);
                while (digits.length < 12) digits += '0';
                return digits + calculateCheckDigitEAN(digits);
            case 'ean8':
                digits = trimmed.replace(/\D/g, '').slice(0, 7);
                while (digits.length < 7) digits += '0';
                return digits + calculateCheckDigitEAN(digits);
            case 'upca':
                digits = trimmed.replace(/\D/g, '').slice(0, 11);
                while (digits.length < 11) digits += '0';
                return digits + calculateCheckDigitEAN(digits);
            case 'upce':
                digits = trimmed.replace(/\D/g, '').slice(0, 6);
                while (digits.length < 6) digits += '0';
                return digits;
            case 'isbn13':
                digits = trimmed.replace(/\D/g, '').slice(0, 12);
                while (digits.length < 12) digits += '0';
                return digits + calculateCheckDigitEAN(digits);
            case 'isbn10':
                digits = trimmed.replace(/[^0-9Xx]/g, '').slice(0, 9).toUpperCase();
                while (digits.length < 9) digits += '0';
                return digits + calculateCheckDigitISBN10(digits);
            case 'code39':
            case 'code93':
                return trimmed.toUpperCase();
            default:
                return trimmed;
        }
    }

    function openCategory(category) {
        var headers = document.querySelectorAll('.category-header');
        headers.forEach(function (h) {
            var cat = h.getAttribute('data-category');
            var content = h.nextElementSibling;
            if (cat === category) {
                h.classList.add('active');
                if (content) content.classList.add('active');
            } else {
                h.classList.remove('active');
                if (content) content.classList.remove('active');
            }
        });
    }

    var categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(function (header) {
        header.addEventListener('click', function () {
            var cat = this.getAttribute('data-category');
            var content = this.nextElementSibling;
            var isActive = this.classList.contains('active');
            categoryHeaders.forEach(function (h) {
                h.classList.remove('active');
                var c = h.nextElementSibling;
                if (c) c.classList.remove('active');
            });
            if (!isActive && content) {
                this.classList.add('active');
                content.classList.add('active');
            }
        });
    });

    var typeButtons = document.querySelectorAll('.type-option');
    typeButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var type = this.getAttribute('data-type');
            if (!type || !typeFormMap[type]) return;
            typeButtons.forEach(function (b) { b.classList.remove('selected'); });
            this.classList.add('selected');
            selectedType = type;
            var cat = typeCategoryMap[type];
            if (cat) openCategory(cat);
            showFormForType(type);
            updateHelpText(type);
        });
    });

    function showFormForType(type) {
        var formId = typeFormMap[type];
        var forms = document.querySelectorAll('.form-container');
        forms.forEach(function (f) { f.classList.remove('active'); });
        var target = document.getElementById(formId);
        if (target) target.classList.add('active');
    }

    function updateHelpText(type) {
        var help = typeHelpTexts[type] || 'Select a barcode type and enter data.';
        if (typeHelp) typeHelp.textContent = help;
        if (eanHelp) {
            switch (type) {
                case 'ean13':
                    eanHelp.textContent = 'EAN-13 requires 12 digits (13th check digit auto-calculated).';
                    break;
                case 'ean8':
                    eanHelp.textContent = 'EAN-8 requires 7 digits (8th check digit auto-calculated).';
                    break;
                case 'upca':
                    eanHelp.textContent = 'UPC-A requires 11 digits (12th check digit auto-calculated).';
                    break;
                case 'upce':
                    eanHelp.textContent = 'UPC-E requires 6 digits (compressed format).';
                    break;
                default:
                    eanHelp.textContent = 'Enter numeric code for the selected type.';
            }
        }
        if (isbnHelp) {
            switch (type) {
                case 'isbn13':
                    isbnHelp.textContent = 'ISBN-13 requires 12 digits (13th check digit auto-calculated).';
                    break;
                case 'isbn10':
                    isbnHelp.textContent = 'ISBN-10 requires 9 digits (10th check digit can be X).';
                    break;
                default:
                    isbnHelp.textContent = 'Enter ISBN with or without hyphens.';
            }
        }
        if (contentTextarea) {
            if (type === 'mecard') {
                contentTextarea.placeholder = 'Enter: Name, Phone, Email (comma-separated)';
            } else if (type === 'qrcode') {
                contentTextarea.placeholder = 'Enter URL, text, or any content...';
            } else {
                contentTextarea.placeholder = 'Enter URL, text, or any content...';
            }
        }
    }

    function getDataForType(type) {
        switch (type) {
            case 'vcard':
                var fn = (document.getElementById('firstName') || {}).value || '';
                var ln = (document.getElementById('lastName') || {}).value || '';
                var ph = (document.getElementById('phone') || {}).value || '';
                var em = (document.getElementById('email') || {}).value || '';
                var co = (document.getElementById('company') || {}).value || '';
                var ti = (document.getElementById('title') || {}).value || '';
                var lines = [
                    'BEGIN:VCARD', 'VERSION:3.0',
                    'FN:' + fn + ' ' + ln,
                    'N:' + ln + ';' + fn + ';;;',
                    'TEL:' + ph,
                    'EMAIL:' + em,
                    'ORG:' + co,
                    'TITLE:' + ti,
                    'END:VCARD'
                ];
                return lines.join('\n');
            case 'mecard':
                var raw = contentTextarea ? contentTextarea.value.trim() : '';
                var parts = raw.split(',').map(function (p) { return p.trim(); });
                var name = parts[0] || '';
                var tel = parts[1] || '';
                var email = parts[2] || '';
                var mcard = 'MECARD:N:' + name;
                if (tel) mcard += ';TEL:' + tel;
                if (email) mcard += ';EMAIL:' + email;
                mcard += ';;';
                return mcard;
            case 'ean13':
            case 'ean8':
            case 'upca':
            case 'upce':
                return numericCodeInput ? numericCodeInput.value : '';
            case 'isbn13':
            case 'isbn10':
                return isbnNumberInput ? isbnNumberInput.value : '';
            default:
                return contentTextarea ? contentTextarea.value : '';
        }
    }

    function generateDisplay(type, dataURL, width, height) {
        var placeholder = barcodeDisplay.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();
        barcodeDisplay.classList.add('has-content');
        var existing = barcodeDisplay.querySelector('canvas, img');
        if (existing) existing.remove();
        var img = document.createElement('img');
        img.src = dataURL;
        img.className = 'barcode-image';
        img.alt = typeNames[type] + ' barcode';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '360px';
        img.style.width = 'auto';
        img.style.height = 'auto';
        barcodeDisplay.appendChild(img);
        currentDataURL = dataURL;
        copyBtn.disabled = false;
        viewBtn.disabled = false;
        downloadBtn.disabled = false;
        barcodeInfo.textContent = typeNames[type] + ' | ' + width + 'x' + height + 'px';
        showStatus(resultStatus, typeNames[type] + ' generated successfully!', 'success');
    }

    function generateFromCanvas(type, canvas) {
        var dataURL = canvas.toDataURL('image/png');
        generateDisplay(type, dataURL, canvas.width, canvas.height);
    }

    function generateBarcode() {
        clearStatus(formStatus);
        clearStatus(resultStatus);
        var type = selectedType;
        if (!type) {
            showStatus(formStatus, 'Please select a barcode type first.', 'error');
            return;
        }
        var raw = getDataForType(type);
        var validation = validateInput(type, raw);
        if (!validation.valid) {
            showStatus(formStatus, validation.message, 'error');
            return;
        }
        var data = prepareBarcodeData(type, raw);

        if (type === 'qrcode' || type === 'vcard' || type === 'mecard') {
            if (typeof qrcode === 'undefined') {
                showStatus(formStatus, 'QR code library failed to load. Please refresh the page.', 'error');
                return;
            }
            generateQRCode(type, data);
        } else if (type === 'datamatrix' || type === 'pdf417') {
            if (typeof JsBarcode === 'undefined') {
                showStatus(formStatus, 'Barcode library failed to load. Please refresh the page.', 'error');
                return;
            }
            generate2DBarcode(type, data);
        } else {
            if (typeof JsBarcode === 'undefined') {
                showStatus(formStatus, 'Barcode library failed to load. Please refresh the page.', 'error');
                return;
            }
            generateLinearBarcode(type, data);
        }
    }

    function generateQRCode(type, data) {
        try {
            var qr = qrcode(0, 'M');
            qr.addData(data);
            qr.make();
            var moduleCount = qr.getModuleCount();
            var cellSize = Math.max(1, Math.floor(300 / moduleCount));
            var margin = cellSize * 4;
            var size = moduleCount * cellSize + margin * 2;
            var canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#000000';
            for (var r = 0; r < moduleCount; r++) {
                for (var c = 0; c < moduleCount; c++) {
                    if (qr.isDark(r, c)) {
                        ctx.fillRect(c * cellSize + margin, r * cellSize + margin, cellSize, cellSize);
                    }
                }
            }
            currentCanvas = canvas;
            generateFromCanvas(type, canvas);
        } catch (e) {
            showStatus(formStatus, 'QR Code generation failed: ' + (e.message || e), 'error');
        }
    }

    function generateLinearBarcode(type, data) {
        var canvas = document.createElement('canvas');
        try {
            JsBarcode(canvas, data, {
                format: jsBarcodeFormats[type],
                width: 2,
                height: 120,
                displayValue: true,
                font: 'monospace',
                fontSize: 16,
                margin: 10,
                background: '#ffffff',
                lineColor: '#000000'
            });
            currentCanvas = canvas;
            generateFromCanvas(type, canvas);
        } catch (e) {
            showStatus(formStatus, 'Barcode generation failed: ' + e.message, 'error');
        }
    }

    function generate2DBarcode(type, data) {
        var canvas = document.createElement('canvas');
        try {
            JsBarcode(canvas, data, {
                format: jsBarcodeFormats[type],
                width: 2,
                height: 100,
                displayValue: true,
                margin: 10,
                background: '#ffffff',
                lineColor: '#000000'
            });
            currentCanvas = canvas;
            generateFromCanvas(type, canvas);
        } catch (e) {
            showStatus(formStatus, typeNames[type] + ' generation failed: ' + e.message + '. This format may require an additional library.', 'error');
        }
    }

    var generateBtns = document.querySelectorAll('.generate-btn');
    generateBtns.forEach(function (btn) {
        btn.addEventListener('click', generateBarcode);
    });

    copyBtn.addEventListener('click', function () {
        if (!currentDataURL) return;
        if (navigator.clipboard && navigator.clipboard.write) {
            fetch(currentDataURL)
                .then(function (res) { return res.blob(); })
                .then(function (blob) {
                    var item = new ClipboardItem({ 'image/png': blob });
                    return navigator.clipboard.write([item]);
                })
                .then(function () {
                    showStatus(resultStatus, 'Image copied to clipboard!', 'success');
                })
                .catch(function () {
                    fallbackCopy();
                });
        } else {
            fallbackCopy();
        }
        function fallbackCopy() {
            var tempInput = document.createElement('input');
            tempInput.value = currentDataURL;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showStatus(resultStatus, 'Image data URL copied to clipboard.', 'success');
        }
    });

    viewBtn.addEventListener('click', function () {
        if (!currentDataURL) return;
        fullscreenImage.src = currentDataURL;
        fullscreenModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    downloadBtn.addEventListener('click', function () {
        if (!currentDataURL) return;
        var link = document.createElement('a');
        link.download = (typeNames[selectedType] || 'barcode').replace(/\s+/g, '-').toLowerCase() + '.png';
        link.href = currentDataURL;
        link.click();
        showStatus(resultStatus, 'Image downloaded!', 'success');
    });

    clearBtn.addEventListener('click', function () {
        var placeholder = barcodeDisplay.querySelector('.placeholder-text');
        if (!placeholder) {
            var pDiv = document.createElement('div');
            pDiv.className = 'placeholder-text';
            pDiv.innerHTML = '<i class="fas fa-barcode"></i><h3>No Barcode Generated</h3><p>Select a barcode type, enter your data, and click "Generate Barcode" to create your first barcode.</p>';
            barcodeDisplay.appendChild(pDiv);
        }
        var generated = barcodeDisplay.querySelector('canvas, img.barcode-image');
        if (generated) generated.remove();
        barcodeDisplay.classList.remove('has-content');
        currentCanvas = null;
        currentDataURL = null;
        copyBtn.disabled = true;
        viewBtn.disabled = true;
        downloadBtn.disabled = true;
        barcodeInfo.textContent = '';
        clearStatus(resultStatus);
        clearStatus(formStatus);
    });

    fullscreenClose.addEventListener('click', function () {
        fullscreenModal.classList.remove('active');
        document.body.style.overflow = '';
    });
    fullscreenModal.addEventListener('click', function (e) {
        if (e.target === fullscreenModal) {
            fullscreenModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && fullscreenModal.classList.contains('active')) {
            fullscreenModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    (function init() {
        var initialBtn = document.querySelector('.type-option.selected');
        if (initialBtn) {
            selectedType = initialBtn.getAttribute('data-type');
            var cat = typeCategoryMap[selectedType];
            if (cat) openCategory(cat);
            showFormForType(selectedType);
            updateHelpText(selectedType);
        } else {
            selectedType = 'qrcode';
            openCategory('2d');
            var qrBtn = document.querySelector('.type-option[data-type="qrcode"]');
            if (qrBtn) qrBtn.classList.add('selected');
            showFormForType('qrcode');
            updateHelpText('qrcode');
        }
    })();
});
