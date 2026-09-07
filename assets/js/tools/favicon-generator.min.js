/* ============================================
   GO TOOLLY - FAVICON GENERATOR v2
   Professional-Quality Favicons
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    /* ------------------------------------------
       STATE
    ------------------------------------------ */
    const state = {
        mode: 'text',
        /* text */
        text: 'A',
        maxChars: 4,
        font: 'Arial',
        fontWeight: '700',
        fontSize: 'auto',
        uppercase: true,
        letterSpacing: 0,
        lineHeight: 1,
        offsetX: 0,
        offsetY: 0,
        textAlign: 'center',
        /* shared */
        bgColor: '#2563eb',
        bgMode: 'solid',
        gradientColor1: '#2563eb',
        gradientColor2: '#7c3aed',
        gradientDir: 'to-br',
        shape: 'rounded',
        cornerRadius: 30,
        padding: 20,
        /* text color */
        textColorMode: 'auto',
        textColor: '#ffffff',
        /* border */
        borderWidth: 0,
        borderColor: '#000000',
        /* shadow */
        shadow: 'none',
        /* emoji */
        emoji: '',
        emojiBgMode: 'colored',
        emojiBgColor: '#2563eb',
        emojiSize: 'auto',
        emojiOffsetX: 0,
        emojiOffsetY: 0,
        emojiShape: 'rounded',
        /* image */
        uploadedImage: null,
        imageFit: 'cover',
        imageBgColor: '#ffffff',
        imageZoom: 1,
        imageScale: 1,
        imageRotation: 0,
        imageFlipH: false,
        imageFlipV: false,
        imageOffsetX: 0,
        imageOffsetY: 0,
        imageTransparentBg: false,
        /* site name for manifest */
        siteName: 'Website',
        siteShortName: 'Site'
    };

    /* ------------------------------------------
       DOM REFERENCES
    ------------------------------------------ */
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    const previewCanvas = $('preview-canvas');
    const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;
    const downloadBtn = $('download-btn');
    const svgExportBtn = $('svg-export-btn');
    const singlePngBtn = $('single-png-btn');
    const charCount = $('char-count');
    const previewContainer = $('preview-container');
    const previewGrid = $('preview-grid');
    const browserPreview = $('browser-preview');

    /* text controls */
    const textInput = $('text-input');
    const textMaxChars = $('text-max-chars');
    const textFontFamily = $('text-font-family');
    const textFontWeight = $('text-font-weight');
    const textFontSizeCtrl = $('text-font-size');
    const textBold = $('text-bold');
    const textUppercase = $('text-uppercase');
    const textLetterSpacing = $('text-letter-spacing');
    const textLineHeight = $('text-line-height');
    const textOffsetX = $('text-offset-x');
    const textOffsetY = $('text-offset-y');
    const textBgColor = $('text-bg-color');
    const textColorMode = $('text-color-mode');
    const textColorPicker = $('text-color-picker');
    const textColorPickerGroup = $('text-color-picker-group');
    const textShape = $('text-shape');
    const textPadding = $('text-padding');
    const textPaddingVal = $('text-padding-val');
    const textCornerRadius = $('text-corner-radius');
    const textCornerRadiusVal = $('text-corner-radius-val');
    const textBorderWidth = $('text-border-width');
    const textBorderColor = $('text-border-color');
    const textShadow = $('text-shadow');
    const textBgMode = $('text-bg-mode');
    const textGradColor1 = $('text-grad-color1');
    const textGradColor2 = $('text-grad-color2');
    const textGradDir = $('text-grad-dir');
    const textGradGroup = $('text-grad-group');
    const siteNameInput = $('site-name');
    const siteShortNameInput = $('site-short-name');
    const textAlignGroup = $('text-align-group');

    /* emoji controls */
    const emojiInput = $('emoji-input');
    const emojiBgMode = $('emoji-bg-mode');
    const emojiBgColor = $('emoji-bg-color');
    const emojiBgColorGroup = $('emoji-bg-color-group');
    const emojiSizeCtrl = $('emoji-size');
    const emojiOffsetX = $('emoji-offset-x');
    const emojiOffsetXVal = $('emoji-offset-x-val');
    const emojiOffsetY = $('emoji-offset-y');
    const emojiOffsetYVal = $('emoji-offset-y-val');
    const emojiShape = $('emoji-shape');
    const emojiQualityWarning = $('emoji-quality-warning');

    /* image controls */
    const imageInput = $('image-input');
    const imageFit = $('image-fit');
    const imageBgColorCtrl = $('image-bg-color');
    const imageZoom = $('image-zoom');
    const imageZoomVal = $('image-zoom-val');
    const imageRotation = $('image-rotation');
    const imageRotationVal = $('image-rotation-val');
    const imageFlipH = $('image-flip-h');
    const imageFlipV = $('image-flip-v');
    const imageCenterBtn = $('image-center-btn');
    const imageTransparentBg = $('image-transparent-bg');
    const imageControlsGroup = $('image-controls-group');

    var previewSizes = [16, 32, 48, 64, 128, 180, 192, 256, 512];

    /* ------------------------------------------
       INIT
    ------------------------------------------ */
    initEventListeners();
    updateCharCount();
    generatePreview();

    /* ------------------------------------------
       EVENT LISTENERS
    ------------------------------------------ */
    function initEventListeners() {
        /* tabs */
        $$('.tab-button').forEach(function (btn) {
            btn.addEventListener('click', switchTab);
        });

        /* text mode */
        if (textInput) {
            textInput.addEventListener('input', function () {
                state.text = this.value;
                updateCharCount();
                generatePreview();
            });
        }
        if (textMaxChars) {
            textMaxChars.addEventListener('change', function () {
                state.maxChars = parseInt(this.value);
                textInput.maxLength = state.maxChars;
                if (textInput.value.length > state.maxChars) {
                    textInput.value = textInput.value.substring(0, state.maxChars);
                    state.text = textInput.value;
                }
                updateCharCount();
                generatePreview();
            });
        }
        if (textFontFamily) {
            textFontFamily.addEventListener('change', function () {
                state.font = this.value;
                generatePreview();
            });
        }
        if (textFontWeight) {
            textFontWeight.addEventListener('change', function () {
                state.fontWeight = this.value;
                generatePreview();
            });
        }
        if (textBold) {
            textBold.addEventListener('change', function () {
                state.fontWeight = this.checked ? '700' : '400';
                if (textFontWeight) textFontWeight.value = state.fontWeight;
                generatePreview();
            });
        }
        if (textFontSizeCtrl) {
            textFontSizeCtrl.addEventListener('change', function () {
                state.fontSize = this.value;
                generatePreview();
            });
        }
        if (textUppercase) {
            textUppercase.addEventListener('change', function () {
                state.uppercase = this.checked;
                generatePreview();
            });
        }
        if (textLetterSpacing) {
            textLetterSpacing.addEventListener('input', function () {
                state.letterSpacing = parseInt(this.value);
                var v = $('text-letter-spacing-val');
                if (v) v.textContent = this.value + 'px';
                generatePreview();
            });
        }
        if (textLineHeight) {
            textLineHeight.addEventListener('input', function () {
                state.lineHeight = parseFloat(this.value);
                var v = $('text-line-height-val');
                if (v) v.textContent = parseFloat(this.value).toFixed(1);
                generatePreview();
            });
        }
        if (textOffsetX) {
            textOffsetX.addEventListener('input', function () {
                state.offsetX = parseInt(this.value);
                var v = $('text-offset-x-val');
                if (v) v.textContent = this.value + 'px';
                generatePreview();
            });
        }
        if (textOffsetY) {
            textOffsetY.addEventListener('input', function () {
                state.offsetY = parseInt(this.value);
                var v = $('text-offset-y-val');
                if (v) v.textContent = this.value + 'px';
                generatePreview();
            });
        }
        if (textBgColor) {
            textBgColor.addEventListener('input', function () {
                state.bgColor = this.value;
                generatePreview();
            });
        }
        if (textBgMode) {
            textBgMode.addEventListener('change', function () {
                state.bgMode = this.value;
                if (textGradGroup) {
                    textGradGroup.style.display = this.value === 'gradient' ? '' : 'none';
                }
                generatePreview();
            });
        }
        if (textGradColor1) {
            textGradColor1.addEventListener('input', function () {
                state.gradientColor1 = this.value;
                generatePreview();
            });
        }
        if (textGradColor2) {
            textGradColor2.addEventListener('input', function () {
                state.gradientColor2 = this.value;
                generatePreview();
            });
        }
        if (textGradDir) {
            textGradDir.addEventListener('change', function () {
                state.gradientDir = this.value;
                generatePreview();
            });
        }
        if (textColorMode) {
            textColorMode.addEventListener('change', function () {
                state.textColorMode = this.value;
                if (textColorPickerGroup) {
                    textColorPickerGroup.style.display = this.value === 'custom' ? '' : 'none';
                }
                generatePreview();
            });
        }
        if (textColorPicker) {
            textColorPicker.addEventListener('input', function () {
                state.textColor = this.value;
                generatePreview();
            });
        }
        if (textShape) {
            textShape.addEventListener('change', function () {
                state.shape = this.value;
                var isRound = this.value === 'rounded';
                var crWrap = $('corner-radius-group');
                if (crWrap) crWrap.style.display = isRound ? '' : 'none';
                generatePreview();
            });
        }
        if (textPadding) {
            textPadding.addEventListener('input', function () {
                state.padding = parseInt(this.value);
                if (textPaddingVal) textPaddingVal.textContent = this.value + 'px';
                generatePreview();
            });
        }
        if (textCornerRadius) {
            textCornerRadius.addEventListener('input', function () {
                state.cornerRadius = parseInt(this.value);
                if (textCornerRadiusVal) textCornerRadiusVal.textContent = this.value + '%';
                generatePreview();
            });
        }
        if (textBorderWidth) {
            textBorderWidth.addEventListener('input', function () {
                state.borderWidth = parseInt(this.value);
                var v = $('text-border-width-val');
                if (v) v.textContent = this.value + 'px';
                generatePreview();
            });
        }
        if (textBorderColor) {
            textBorderColor.addEventListener('input', function () {
                state.borderColor = this.value;
                generatePreview();
            });
        }
        if (textShadow) {
            textShadow.addEventListener('change', function () {
                state.shadow = this.value;
                generatePreview();
            });
        }
        if (siteNameInput) {
            siteNameInput.addEventListener('input', function () {
                state.siteName = this.value || 'Website';
                renderBrowserPreviews();
            });
        }
        if (siteShortNameInput) {
            siteShortNameInput.addEventListener('input', function () {
                state.siteShortName = this.value || 'Site';
            });
        }

        /* text alignment buttons */
        if (textAlignGroup) {
            textAlignGroup.addEventListener('click', function (e) {
                var btn = e.target.closest('.align-btn');
                if (!btn) return;
                textAlignGroup.querySelectorAll('.align-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.textAlign = btn.getAttribute('data-align');
                generatePreview();
            });
        }

        /* collapsible sections - accordion */
        document.addEventListener('click', function (e) {
            var header = e.target.closest('.collapse-header');
            if (!header) return;
            var section = header.parentElement;
            var body = section.querySelector('.collapse-body');
            if (!body) return;
            var isCollapsed = section.classList.contains('collapsed');
            if (isCollapsed) {
                section.classList.remove('collapsed');
                body.style.display = '';
            } else {
                section.classList.add('collapsed');
                body.style.display = 'none';
            }
        });

        /* emoji mode */
        if (emojiInput) {
            emojiInput.addEventListener('input', function () {
                state.emoji = this.value;
                generatePreview();
            });
            emojiInput.addEventListener('paste', function () {
                setTimeout(function () {
                    state.emoji = emojiInput.value;
                    generatePreview();
                }, 0);
            });
        }
        if (emojiBgMode) {
            emojiBgMode.addEventListener('change', function () {
                state.emojiBgMode = this.value;
                if (emojiBgColorGroup) {
                    emojiBgColorGroup.style.display = this.value === 'colored' ? '' : 'none';
                }
                generatePreview();
            });
        }
        if (emojiBgColor) {
            emojiBgColor.addEventListener('input', function () {
                state.emojiBgColor = this.value;
                generatePreview();
            });
        }
        if (emojiSizeCtrl) {
            emojiSizeCtrl.addEventListener('change', function () {
                state.emojiSize = this.value;
                generatePreview();
            });
        }
        if (emojiOffsetX) {
            emojiOffsetX.addEventListener('input', function () {
                state.emojiOffsetX = parseInt(this.value);
                if (emojiOffsetXVal) emojiOffsetXVal.textContent = this.value + 'px';
                generatePreview();
            });
        }
        if (emojiOffsetY) {
            emojiOffsetY.addEventListener('input', function () {
                state.emojiOffsetY = parseInt(this.value);
                if (emojiOffsetYVal) emojiOffsetYVal.textContent = this.value + 'px';
                generatePreview();
            });
        }
        if (emojiShape) {
            emojiShape.addEventListener('change', function () {
                state.emojiShape = this.value;
                generatePreview();
            });
        }

        /* image mode */
        if (imageInput) {
            imageInput.addEventListener('change', handleImageUpload);
        }
        if (imageFit) {
            imageFit.addEventListener('change', function () {
                state.imageFit = this.value;
                generatePreview();
            });
        }
        if (imageBgColorCtrl) {
            imageBgColorCtrl.addEventListener('input', function () {
                state.imageBgColor = this.value;
                generatePreview();
            });
        }
        if (imageZoom) {
            imageZoom.addEventListener('input', function () {
                state.imageZoom = parseFloat(this.value);
                if (imageZoomVal) imageZoomVal.textContent = Math.round(state.imageZoom * 100) + '%';
                generatePreview();
            });
        }
        if (imageRotation) {
            imageRotation.addEventListener('input', function () {
                state.imageRotation = parseInt(this.value);
                if (imageRotationVal) imageRotationVal.textContent = this.value + '°';
                generatePreview();
            });
        }
        if (imageFlipH) {
            imageFlipH.addEventListener('change', function () {
                state.imageFlipH = this.checked;
                generatePreview();
            });
        }
        if (imageFlipV) {
            imageFlipV.addEventListener('change', function () {
                state.imageFlipV = this.checked;
                generatePreview();
            });
        }
        if (imageCenterBtn) {
            imageCenterBtn.addEventListener('click', function () {
                state.imageOffsetX = 0;
                state.imageOffsetY = 0;
                state.imageZoom = 1;
                state.imageScale = 1;
                state.imageRotation = 0;
                state.imageFlipH = false;
                state.imageFlipV = false;
                if (imageZoom) { imageZoom.value = 1; if (imageZoomVal) imageZoomVal.textContent = '100%'; }
                if (imageRotation) { imageRotation.value = 0; if (imageRotationVal) imageRotationVal.textContent = '0°'; }
                if (imageFlipH) imageFlipH.checked = false;
                if (imageFlipV) imageFlipV.checked = false;
                generatePreview();
            });
        }
        if (imageTransparentBg) {
            imageTransparentBg.addEventListener('change', function () {
                state.imageTransparentBg = this.checked;
                generatePreview();
            });
        }

        /* image drag */
        if (previewCanvas) {
            (function () {
                var dragging = false, dragStartX = 0, dragStartY = 0;
                previewCanvas.addEventListener('mousedown', function (e) {
                    if (state.mode !== 'image' || !state.uploadedImage) return;
                    dragging = true;
                    var rect = previewCanvas.getBoundingClientRect();
                    var scaleX = 256 / rect.width;
                    var scaleY = 256 / rect.height;
                    dragStartX = (e.clientX - rect.left) * scaleX - state.imageOffsetX;
                    dragStartY = (e.clientY - rect.top) * scaleY - state.imageOffsetY;
                    previewCanvas.style.cursor = 'grabbing';
                });
                document.addEventListener('mousemove', function (e) {
                    if (!dragging) return;
                    var rect = previewCanvas.getBoundingClientRect();
                    var scaleX = 256 / rect.width;
                    var scaleY = 256 / rect.height;
                    state.imageOffsetX = (e.clientX - rect.left) * scaleX - dragStartX;
                    state.imageOffsetY = (e.clientY - rect.top) * scaleY - dragStartY;
                    generatePreview();
                });
                document.addEventListener('mouseup', function () {
                    if (dragging) {
                        dragging = false;
                        previewCanvas.style.cursor = 'grab';
                    }
                });
                previewCanvas.addEventListener('touchstart', function (e) {
                    if (state.mode !== 'image' || !state.uploadedImage) return;
                    var t = e.touches[0];
                    dragging = true;
                    var rect = previewCanvas.getBoundingClientRect();
                    var scaleX = 256 / rect.width;
                    var scaleY = 256 / rect.height;
                    dragStartX = (t.clientX - rect.left) * scaleX - state.imageOffsetX;
                    dragStartY = (t.clientY - rect.top) * scaleY - state.imageOffsetY;
                }, { passive: true });
                document.addEventListener('touchmove', function (e) {
                    if (!dragging) return;
                    var t = e.touches[0];
                    var rect = previewCanvas.getBoundingClientRect();
                    var scaleX = 256 / rect.width;
                    var scaleY = 256 / rect.height;
                    state.imageOffsetX = (t.clientX - rect.left) * scaleX - dragStartX;
                    state.imageOffsetY = (t.clientY - rect.top) * scaleY - dragStartY;
                    generatePreview();
                }, { passive: true });
                document.addEventListener('touchend', function () { dragging = false; });
            })();
        }

        /* download buttons */
        if (downloadBtn) downloadBtn.addEventListener('click', downloadBundle);
        if (svgExportBtn) svgExportBtn.addEventListener('click', downloadSVG);
        if (singlePngBtn) singlePngBtn.addEventListener('click', downloadSinglePNG);
    }

    /* ------------------------------------------
       TAB SWITCHING
    ------------------------------------------ */
    function switchTab(e) {
        var tabName = e.target.getAttribute('data-tab');
        state.mode = tabName;

        $$('.tab-button').forEach(function (b) { b.classList.remove('active'); });
        e.target.classList.add('active');
        $$('.tab-content').forEach(function (c) { c.classList.remove('active'); });
        var content = $(tabName);
        if (content) content.classList.add('active');

        if (imageControlsGroup) {
            imageControlsGroup.style.display = tabName === 'image' ? '' : 'none';
        }

        generatePreview();

        if (tabName === 'text' && textInput) textInput.focus();
        else if (tabName === 'emoji' && emojiInput) emojiInput.focus();
        else if (tabName === 'image' && imageInput) imageInput.focus();
    }

    /* ------------------------------------------
       CHAR COUNT
    ------------------------------------------ */
    function updateCharCount() {
        var current = textInput ? textInput.value.length : 0;
        var max = state.maxChars;
        if (charCount) charCount.textContent = '(' + current + '/' + max + ')';
    }

    /* ------------------------------------------
       IMAGE UPLOAD
    ------------------------------------------ */
    function handleImageUpload(e) {
        var file = e.target.files[0];
        if (!file) { state.uploadedImage = null; return; }

        if (!file.type.startsWith('image/')) {
            notify('Please upload an image file', 'error');
            imageInput.value = '';
            state.uploadedImage = null;
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            notify('Image too large (max 10 MB)', 'error');
            imageInput.value = '';
            state.uploadedImage = null;
            return;
        }

        var reader = new FileReader();
        reader.onload = function (ev) {
            var img = new Image();
            img.onload = function () {
                state.uploadedImage = img;
                state.imageOffsetX = 0;
                state.imageOffsetY = 0;
                generatePreview();
            };
            img.onerror = function () {
                notify('Failed to load image', 'error');
                state.uploadedImage = null;
                imageInput.value = '';
            };
            img.src = ev.target.result;
        };
        reader.onerror = function () {
            notify('Failed to read file', 'error');
            imageInput.value = '';
            state.uploadedImage = null;
        };
        reader.readAsDataURL(file);
    }

    /* ------------------------------------------
       GENERATE PREVIEW (main entry)
    ------------------------------------------ */
    function generatePreview() {
        if (!previewCtx) return;
        previewCtx.clearRect(0, 0, 256, 256);

        try {
            if (state.mode === 'text') drawTextFavicon(previewCtx, 256);
            else if (state.mode === 'emoji') drawEmojiFavicon(previewCtx, 256);
            else if (state.mode === 'image') drawImageFavicon(previewCtx, 256);
        } catch (e) {
            console.error('Draw error:', e);
        }

        if (previewContainer) {
            previewContainer.style.display = 'block';
            previewContainer.style.opacity = '1';
        }

        renderPreviewGrid();
        renderBrowserPreviews();
        updateEmojiQualityWarning();
    }

    /* ------------------------------------------
       EMOJI QUALITY WARNING
    ------------------------------------------ */
    function isEmojiComplex(emoji) {
        if (!emoji) return false;
        var codePoints = [];
        for (var i = 0; i < emoji.length; i++) {
            var cp = emoji.codePointAt(i);
            if (cp > 0xFFFF) { i++; }
            codePoints.push(cp);
        }
        if (codePoints.length > 2) return true;
        for (var j = 0; j < codePoints.length; j++) {
            var cp = codePoints[j];
            if (cp === 0xFE0F || cp === 0xFE0E) return true;
            if (cp >= 0x1F3FB && cp <= 0x1F3FF) return true;
            if (cp === 0x200D) return true;
        }
        return false;
    }

    function updateEmojiQualityWarning() {
        if (!emojiQualityWarning) return;
        if (state.mode !== 'emoji') {
            emojiQualityWarning.style.display = 'none';
            return;
        }
        var emoji = (state.emoji || '').trim();
        if (!emoji) emoji = '\uD83D\uDC4D';
        var graphemes = Array.from(emoji);
        emoji = graphemes[0] || '\uD83D\uDC4D';
        if (isEmojiComplex(emoji)) {
            emojiQualityWarning.style.display = '';
        } else {
            emojiQualityWarning.style.display = 'none';
        }
    }

    /* ------------------------------------------
       DRAW TEXT FAVICON
    ------------------------------------------ */
    function drawTextFavicon(ctx, size) {
        var text = (state.text || 'A');
        if (state.uppercase) text = text.toUpperCase();
        var s = size / 256;

        /* background */
        drawBackground(ctx, size, state.bgMode, state.bgColor, state.gradientColor1, state.gradientColor2, state.gradientDir, state.shape, state.cornerRadius * s);

        /* border */
        if (state.borderWidth > 0) {
            var bw = state.borderWidth * s;
            ctx.strokeStyle = state.borderColor;
            ctx.lineWidth = bw;
            if (state.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2 - bw / 2, 0, Math.PI * 2);
                ctx.stroke();
            } else if (state.shape === 'rounded') {
                roundRect(ctx, bw / 2, bw / 2, size - bw, size - bw, state.cornerRadius * s * 0.4);
                ctx.stroke();
            } else {
                ctx.strokeRect(bw / 2, bw / 2, size - bw, size - bw);
            }
        }

        /* shadow */
        if (state.shadow !== 'none') {
            if (state.shadow === 'soft') ctx.shadowColor = 'rgba(0,0,0,0.15)';
            else if (state.shadow === 'medium') ctx.shadowColor = 'rgba(0,0,0,0.3)';
            else ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = (state.shadow === 'soft' ? 4 : state.shadow === 'medium' ? 8 : 14) * s;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2 * s;
        }

        /* text color */
        var textColor;
        if (state.textColorMode === 'custom') {
            textColor = state.textColor;
        } else {
            textColor = getContrastColor(state.bgColor);
        }

        /* font size calculation */
        var fontSize;
        if (state.fontSize === 'auto') {
            var len = text.length;
            if (len === 1) fontSize = 160;
            else if (len === 2) fontSize = 120;
            else if (len === 3) fontSize = 90;
            else if (len === 4) fontSize = 70;
            else if (len === 5) fontSize = 58;
            else fontSize = 48;
        } else if (state.fontSize === 'small') fontSize = 50;
        else if (state.fontSize === 'medium') fontSize = 80;
        else if (state.fontSize === 'large') fontSize = 120;
        else fontSize = 100;

        /* adjust for padding */
        fontSize *= (1 - state.padding / 300);

        var px = fontSize * s;

        /* build font string */
        var familyMap = {
            'Inter': "'Inter', sans-serif",
            'Roboto': "'Roboto', sans-serif",
            'Poppins': "'Poppins', sans-serif",
            'Montserrat': "'Montserrat', sans-serif",
            'Arial': "Arial, sans-serif",
            'Georgia': "Georgia, serif",
            'Times New Roman': "'Times New Roman', serif",
            'Courier New': "'Courier New', monospace",
            'Verdana': "Verdana, sans-serif",
            'Trebuchet MS': "'Trebuchet MS', sans-serif"
        };
        var familyStr = familyMap[state.font] || (state.font + ', sans-serif');

        ctx.fillStyle = textColor;
        ctx.font = state.fontWeight + ' ' + px + 'px ' + familyStr;
        ctx.textAlign = state.textAlign || 'center';
        ctx.textBaseline = 'middle';

        /* letter spacing via char-by-char if needed */
        var cx = size / 2 + state.offsetX * s;
        if (state.textAlign === 'left') cx = (state.padding || 20) * s * 0.8 + state.offsetX * s;
        else if (state.textAlign === 'right') cx = size - (state.padding || 20) * s * 0.8 + state.offsetX * s;
        var cy = size / 2 + state.offsetY * s;

        if (state.letterSpacing !== 0) {
            drawTextWithSpacing(ctx, text, cx, cy, px, state.letterSpacing * s);
        } else {
            ctx.fillText(text, cx, cy);
        }

        /* reset shadow */
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    function drawTextWithSpacing(ctx, text, x, y, fontSize, spacing) {
        var chars = text.split('');
        var totalWidth = 0;
        var widths = [];
        for (var i = 0; i < chars.length; i++) {
            var w = ctx.measureText(chars[i]).width;
            widths.push(w);
            totalWidth += w;
        }
        totalWidth += spacing * (chars.length - 1);
        var align = state.textAlign || 'center';
        var startX;
        if (align === 'left') startX = x;
        else if (align === 'right') startX = x - totalWidth;
        else startX = x - totalWidth / 2;
        var curX = startX;
        for (var j = 0; j < chars.length; j++) {
            ctx.fillText(chars[j], curX + widths[j] / 2, y);
            curX += widths[j] + spacing;
        }
    }

    /* ------------------------------------------
       DRAW EMOJI FAVICON
    ------------------------------------------ */
    function drawEmojiFavicon(ctx, size) {
        var emoji = (state.emoji || '').trim();
        if (!emoji) emoji = '\uD83D\uDC4D';
        var graphemes = Array.from(emoji);
        emoji = graphemes[0] || '\uD83D\uDC4D';
        var s = size / 256;
        var shape = state.emojiShape || 'rounded';

        /* background */
        if (state.emojiBgMode === 'colored') {
            ctx.fillStyle = state.emojiBgColor;
            if (shape === 'circle') {
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (shape === 'rounded') {
                roundRect(ctx, 0, 0, size, size, state.cornerRadius * s * 0.4);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, size, size);
            }
        }

        /* emoji size */
        var emojiFontPx;
        if (state.emojiSize === 'small') emojiFontPx = 120;
        else if (state.emojiSize === 'medium') emojiFontPx = 160;
        else if (state.emojiSize === 'large') emojiFontPx = 210;
        else emojiFontPx = 200; /* auto */

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.clip();

        ctx.font = 'bold ' + (emojiFontPx * s) + 'px system-ui, -apple-system, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var ex = size / 2 + (state.emojiOffsetX || 0) * s;
        var ey = size / 2 + (state.emojiOffsetY || 0) * s;
        try {
            ctx.fillText(emoji, ex, ey);
        } catch (e) {
            ctx.font = (emojiFontPx * 0.9 * s) + 'px Arial';
            ctx.fillText(emoji, ex, ey);
        }

        ctx.restore();
    }

    /* ------------------------------------------
       DRAW IMAGE FAVICON
    ------------------------------------------ */
    function drawImageFavicon(ctx, size) {
        var s = size / 256;

        if (!state.uploadedImage) {
            ctx.fillStyle = '#f1f5f9';
            if (state.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (state.shape === 'rounded') {
                roundRect(ctx, 0, 0, size, size, state.cornerRadius * s * 0.4);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, size, size);
            }
            ctx.fillStyle = '#94a3b8';
            ctx.font = (14 * s) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Upload an image', size / 2, size / 2);
            return;
        }

        /* background */
        if (!state.imageTransparentBg) {
            ctx.fillStyle = state.imageBgColor;
            ctx.fillRect(0, 0, size, size);
        }

        var img = state.uploadedImage;
        var zoom = state.imageZoom;
        var rotation = state.imageRotation * Math.PI / 180;

        ctx.save();
        ctx.translate(size / 2 + state.imageOffsetX * s, size / 2 + state.imageOffsetY * s);
        ctx.rotate(rotation);
        ctx.scale(state.imageFlipH ? -1 : 1, state.imageFlipV ? -1 : 1);

        if (state.imageFit === 'cover') {
            var ratio = Math.max(size / img.width, size / img.height);
            var w = img.width * ratio * zoom;
            var h = img.height * ratio * zoom;
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
            var ratio2 = Math.min(size / img.width, size / img.height);
            var w2 = img.width * ratio2 * zoom;
            var h2 = img.height * ratio2 * zoom;
            ctx.drawImage(img, -w2 / 2, -h2 / 2, w2, h2);
        }

        ctx.restore();

        /* clip to shape */
        clipToShape(ctx, size, s);
    }

    function clipToShape(ctx, size, s) {
        if (state.shape === 'circle') {
            ctx.globalCompositeOperation = 'destination-in';
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        } else if (state.shape === 'rounded') {
            ctx.globalCompositeOperation = 'destination-in';
            roundRect(ctx, 0, 0, size, size, state.cornerRadius * s * 0.4);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    /* ------------------------------------------
       SHARED DRAW HELPERS
    ------------------------------------------ */
    function drawBackground(ctx, size, mode, color1, gradColor1, gradColor2, gradDir, shape, radius) {
        if (mode === 'gradient') {
            var g;
            var x0 = 0, y0 = 0, x1 = size, y1 = size;
            if (gradDir === 'to-r') { x1 = size; y1 = 0; }
            else if (gradDir === 'to-b') { x1 = 0; y1 = size; }
            else if (gradDir === 'to-tr') { x1 = size; y1 = 0; }
            else if (gradDir === 'to-bl') { x1 = 0; y1 = size; }
            else { /* to-br default */ x1 = size; y1 = size; }
            g = ctx.createLinearGradient(x0, y0, x1, y1);
            g.addColorStop(0, gradColor1);
            g.addColorStop(1, gradColor2);
            ctx.fillStyle = g;
        } else {
            ctx.fillStyle = color1;
        }

        if (shape === 'circle') {
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (shape === 'rounded') {
            roundRect(ctx, 0, 0, size, size, radius);
            ctx.fill();
        } else {
            ctx.fillRect(0, 0, size, size);
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function getContrastColor(hexColor) {
        var r = parseInt(hexColor.substr(1, 2), 16);
        var g = parseInt(hexColor.substr(3, 2), 16);
        var b = parseInt(hexColor.substr(5, 2), 16);
        var brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 155 ? '#000000' : '#ffffff';
    }

    /* ------------------------------------------
       RENDER TO CANVAS (at arbitrary size)
    ------------------------------------------ */
    function renderToCanvas(size) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (state.mode === 'text') drawTextFavicon(ctx, size);
        else if (state.mode === 'emoji') drawEmojiFavicon(ctx, size);
        else if (state.mode === 'image') drawImageFavicon(ctx, size);

        return canvas;
    }

    /* ------------------------------------------
       MULTI-SIZE PREVIEW GRID
    ------------------------------------------ */

    function renderPreviewGrid() {
        if (!previewGrid) return;
        previewGrid.innerHTML = '';

        for (var i = 0; i < previewSizes.length; i++) {
            var sz = previewSizes[i];
            var wrapper = document.createElement('div');
            wrapper.className = 'preview-size-item';

            var canvas = document.createElement('canvas');
            var displaySize = sz > 128 ? 128 : sz;
            canvas.width = sz;
            canvas.height = sz;
            canvas.style.width = '100%';
            canvas.style.maxWidth = displaySize + 'px';
            canvas.style.height = 'auto';
            canvas.style.aspectRatio = '1 / 1';
            canvas.style.border = '1px solid var(--color-border)';
            canvas.style.borderRadius = '6px';
            canvas.style.background = 'repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%) 50% / 8px 8px';

            try {
                var ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                if (state.mode === 'text') drawTextFavicon(ctx, sz);
                else if (state.mode === 'emoji') drawEmojiFavicon(ctx, sz);
                else if (state.mode === 'image') drawImageFavicon(ctx, sz);
            } catch (e) {
                console.error('Preview grid draw error for size ' + sz + ':', e);
            }

            var label = document.createElement('span');
            label.className = 'preview-size-label';
            label.textContent = sz + 'x' + sz;

            wrapper.appendChild(canvas);
            wrapper.appendChild(label);
            previewGrid.appendChild(wrapper);
        }
    }

    /* ------------------------------------------
       BROWSER TAB PREVIEWS
    ------------------------------------------ */
    function renderBrowserPreviews() {
        if (!browserPreview) return;
        browserPreview.innerHTML = '';

        var browsers = [
            { name: 'Chrome', style: 'chrome' },
            { name: 'Firefox', style: 'firefox' },
            { name: 'Edge', style: 'edge' },
            { name: 'Safari', style: 'safari' }
        ];

        var favDataURL = '';
        try {
            var favCanvas = renderToCanvas(16);
            favDataURL = favCanvas.toDataURL('image/png');
        } catch (e) {
            console.error('Browser preview favicon error:', e);
        }

        for (var i = 0; i < browsers.length; i++) {
            var b = browsers[i];
            var card = document.createElement('div');
            card.className = 'browser-tab-card';

            var bar = document.createElement('div');
            bar.className = 'browser-tab-bar browser-' + b.style;

            var tab = document.createElement('div');
            tab.className = 'browser-tab';

            var favImg = document.createElement('img');
            favImg.src = favDataURL;
            favImg.width = 16;
            favImg.height = 16;
            favImg.className = 'browser-tab-fav';

            var title = document.createElement('span');
            title.className = 'browser-tab-title';
            title.textContent = state.siteName || 'My Website';

            tab.appendChild(favImg);
            tab.appendChild(title);

            var dots = document.createElement('div');
            dots.className = 'browser-tab-dots';
            if (b.style === 'safari') {
                dots.innerHTML = '<span></span><span></span><span></span>';
            }

            bar.appendChild(dots);
            bar.appendChild(tab);

            var body = document.createElement('div');
            body.className = 'browser-tab-body';
            body.textContent = b.name;

            var name = document.createElement('div');
            name.className = 'browser-tab-name';
            name.textContent = b.name + ' Tab';

            card.appendChild(bar);
            card.appendChild(body);
            card.appendChild(name);
            browserPreview.appendChild(card);
        }
    }

    /* ------------------------------------------
       SVG EXPORT (Text & Emoji)
    ------------------------------------------ */
    function generateSVGString() {
        var size = 256;
        var bgColorStr = '';
        var shapeStr = '';

        if (state.mode === 'emoji' && state.emojiBgMode === 'colored') {
            bgColorStr = state.emojiBgColor;
        } else if (state.mode === 'text') {
            if (state.bgMode === 'gradient') {
                bgColorStr = state.gradientColor1;
            } else {
                bgColorStr = state.bgColor;
            }
        }

        /* shape clip */
        var activeShape = state.shape;
        if (state.mode === 'emoji') activeShape = state.emojiShape || 'rounded';
        if (activeShape === 'circle') {
            shapeStr = '<circle cx="128" cy="128" r="128" fill="' + bgColorStr + '"/>';
        } else if (activeShape === 'rounded') {
            var r = state.cornerRadius * 0.4;
            shapeStr = '<rect x="0" y="0" width="256" height="256" rx="' + r + '" fill="' + bgColorStr + '"/>';
        } else {
            shapeStr = '<rect x="0" y="0" width="256" height="256" fill="' + bgColorStr + '"/>';
        }

        /* gradient def */
        var gradientDef = '';
        if (state.mode === 'text' && state.bgMode === 'gradient') {
            var x1 = 0, y1 = 0, x2 = 256, y2 = 256;
            if (state.gradientDir === 'to-r') { x2 = 256; y2 = 0; }
            else if (state.gradientDir === 'to-b') { x2 = 0; y2 = 256; }
            else if (state.gradientDir === 'to-tr') { x2 = 256; y2 = 0; }
            else if (state.gradientDir === 'to-bl') { x2 = 0; y2 = 256; }
            gradientDef = '<defs><linearGradient id="bg-grad" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' +
                '<stop offset="0%" stop-color="' + state.gradientColor1 + '"/>' +
                '<stop offset="100%" stop-color="' + state.gradientColor2 + '"/>' +
                '</linearGradient></defs>';
            if (state.shape === 'circle') {
                shapeStr = '<circle cx="128" cy="128" r="128" fill="url(#bg-grad)"/>';
            } else if (state.shape === 'rounded') {
                shapeStr = '<rect x="0" y="0" width="256" height="256" rx="' + r + '" fill="url(#bg-grad)"/>';
            } else {
                shapeStr = '<rect x="0" y="0" width="256" height="256" fill="url(#bg-grad)"/>';
            }
        }

        /* shadow filter */
        var shadowFilter = '';
        var filterAttr = '';
        if (state.mode === 'text' && state.shadow !== 'none') {
            var stdDev = state.shadow === 'soft' ? 2 : state.shadow === 'medium' ? 4 : 7;
            var opacity = state.shadow === 'soft' ? 0.15 : state.shadow === 'medium' ? 0.3 : 0.5;
            shadowFilter = '<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">' +
                '<feDropShadow dx="0" dy="2" stdDeviation="' + stdDev + '" flood-opacity="' + opacity + '"/></filter></defs>';
            filterAttr = ' filter="url(#shadow)"';
        }

        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">' +
            gradientDef + shadowFilter +
            shapeStr;

        if (state.mode === 'text') {
            var text = state.text || 'A';
            if (state.uppercase) text = text.toUpperCase();

            var textColor;
            if (state.textColorMode === 'custom') textColor = state.textColor;
            else textColor = getContrastColor(state.bgColor);

            var fontSize;
            if (state.fontSize === 'auto') {
                var len = text.length;
                if (len === 1) fontSize = 160;
                else if (len === 2) fontSize = 120;
                else if (len === 3) fontSize = 90;
                else if (len === 4) fontSize = 70;
                else if (len === 5) fontSize = 58;
                else fontSize = 48;
            } else if (state.fontSize === 'small') fontSize = 50;
            else if (state.fontSize === 'medium') fontSize = 80;
            else if (state.fontSize === 'large') fontSize = 120;
            else fontSize = 100;

            fontSize *= (1 - state.padding / 300);

            var fontFamily = state.font === 'Arial' ? 'Arial, sans-serif' :
                state.font === 'Georgia' ? 'Georgia, serif' :
                state.font + ', sans-serif';

            var tx = 128 + state.offsetX;
            if (state.textAlign === 'left') tx = Math.round(state.padding * 0.8) + state.offsetX;
            else if (state.textAlign === 'right') tx = 256 - Math.round(state.padding * 0.8) + state.offsetX;
            var ty = 128 + state.offsetY;
            var anchor = state.textAlign === 'left' ? 'start' : state.textAlign === 'right' ? 'end' : 'middle';

            svg += '<text x="' + tx + '" y="' + ty + '" text-anchor="' + anchor + '" dominant-baseline="central" ' +
                'font-family="' + fontFamily + '" font-size="' + fontSize + '" font-weight="' + state.fontWeight + '" ' +
                'fill="' + textColor + '"' + filterAttr +
                (state.letterSpacing !== 0 ? ' letter-spacing="' + state.letterSpacing + '"' : '') +
                '>' + escapeXml(text) + '</text>';
        } else if (state.mode === 'emoji') {
            var emoji = (state.emoji || '').trim();
            if (!emoji) emoji = '\uD83D\uDC4D';
            var graphemes = Array.from(emoji);
            emoji = graphemes[0] || '\uD83D\uDC4D';
            var emojiFontPx;
            if (state.emojiSize === 'small') emojiFontPx = 120;
            else if (state.emojiSize === 'medium') emojiFontPx = 160;
            else if (state.emojiSize === 'large') emojiFontPx = 210;
            else emojiFontPx = 200;
            var ex = 128 + (state.emojiOffsetX || 0);
            var ey = 128 + (state.emojiOffsetY || 0);
            svg += '<text x="' + ex + '" y="' + ey + '" text-anchor="middle" dominant-baseline="central" font-size="' + emojiFontPx + '">' + emoji + '</text>';
        }

        svg += '</svg>';
        return svg;
    }

    function escapeXml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function downloadSVG() {
        if (state.mode === 'image') {
            notify('SVG export is only available for Text and Emoji modes', 'info');
            return;
        }
        var svgStr = generateSVGString();
        var blob = new Blob([svgStr], { type: 'image/svg+xml' });
        downloadBlob(blob, 'favicon.svg');
        notify('SVG downloaded!', 'success');
    }

    /* ------------------------------------------
       SINGLE PNG DOWNLOAD
    ------------------------------------------ */
    function downloadSinglePNG() {
        var canvas = renderToCanvas(512);
        canvas.toBlob(function (blob) {
            downloadBlob(blob, 'favicon-512x512.png');
            notify('PNG 512x512 downloaded!', 'success');
        }, 'image/png');
    }

    /* ------------------------------------------
       ICO BINARY GENERATION
    ------------------------------------------ */
    function createICOBlob(callback) {
        var icoSizes = [16, 32, 48];
        var images = [];
        var loaded = 0;

        for (var i = 0; i < icoSizes.length; i++) {
            (function (sz) {
                var canvas = renderToCanvas(sz);
                canvas.toBlob(function (blob) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        images.push({ size: sz, data: new Uint8Array(e.target.result) });
                        loaded++;
                        if (loaded === icoSizes.length) {
                            images.sort(function (a, b) { return a.size - b.size; });
                            var icoData = buildICO(images);
                            callback(new Blob([icoData], { type: 'image/x-icon' }));
                        }
                    };
                    reader.readAsArrayBuffer(blob);
                }, 'image/png');
            })(icoSizes[i]);
        }
    }

    function buildICO(images) {
        var totalSize = 0;
        var imageDataList = [];
        for (var i = 0; i < images.length; i++) {
            var pngData = images[i].data;
            imageDataList.push(pngData);
            totalSize += pngData.length;
        }

        var headerSize = 6 + images.length * 16;
        var buffer = new ArrayBuffer(headerSize + totalSize);
        var view = new DataView(buffer);

        /* ICO header */
        view.setUint16(0, 0, true); /* reserved */
        view.setUint16(2, 1, true); /* type: ICO */
        view.setUint16(4, images.length, true); /* number of images */

        var dataOffset = headerSize;
        for (var j = 0; j < images.length; j++) {
            var sz = images[j].size;
            var pngD = imageDataList[j];
            var entryOffset = 6 + j * 16;

            view.setUint8(entryOffset, sz === 256 ? 0 : sz); /* width */
            view.setUint8(entryOffset + 1, sz === 256 ? 0 : sz); /* height */
            view.setUint8(entryOffset + 2, 0); /* color palette */
            view.setUint8(entryOffset + 3, 0); /* reserved */
            view.setUint16(entryOffset + 4, 1, true); /* color planes */
            view.setUint16(entryOffset + 6, 32, true); /* bits per pixel */
            view.setUint32(entryOffset + 8, pngD.length, true); /* data size */
            view.setUint32(entryOffset + 12, dataOffset, true); /* data offset */

            var bytes = new Uint8Array(buffer);
            bytes.set(pngD, dataOffset);
            dataOffset += pngD.length;
        }

        return new Uint8Array(buffer);
    }

    /* ------------------------------------------
       DOWNLOAD FULL BUNDLE
    ------------------------------------------ */
    async function downloadBundle() {
        if (!downloadBtn) return;
        downloadBtn.disabled = true;
        var origText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            var JSZip = window.JSZip;
            if (!JSZip) {
                notify('ZIP library not loaded. Downloading single file...', 'info');
                downloadSinglePNG();
                return;
            }

            var zip = new JSZip();

            /* all required PNG sizes */
            var pngSizes = [16, 32, 48, 64, 96, 128, 180, 192, 256, 512];
            for (var i = 0; i < pngSizes.length; i++) {
                var sz = pngSizes[i];
                var canvas = renderToCanvas(sz);
                var blob = await canvasToBlob(canvas, 'image/png');

                if (sz === 180) {
                    zip.file('apple-touch-icon.png', blob);
                } else if (sz === 192) {
                    zip.file('android-chrome-192x192.png', blob);
                    zip.file('favicon-192x192.png', blob);
                } else if (sz === 512) {
                    zip.file('android-chrome-512x512.png', blob);
                    zip.file('favicon-512x512.png', blob);
                } else {
                    zip.file('favicon-' + sz + 'x' + sz + '.png', blob);
                }

                if (sz === 64) {
                    zip.file('mstile-150x150.png', blob);
                }
            }

            /* 96x96 also as mstile */
            var mstile96 = renderToCanvas(96);
            var mstileBlob = await canvasToBlob(mstile96, 'image/png');
            zip.file('mstile-310x310.png', mstileBlob);
            zip.file('mstile-70x70.png', renderToCanvasBlobData(70));
            zip.file('mstile-150x150.png', await canvasToBlob(renderToCanvas(150), 'image/png'));

            /* ICO */
            var icoBlob = await new Promise(function (resolve) {
                createICOBlob(resolve);
            });
            zip.file('favicon.ico', icoBlob);

            /* SVG (if text or emoji) */
            if (state.mode !== 'image') {
                var svgStr = generateSVGString();
                zip.file('safari-pinned-tab.svg', svgStr);
            } else {
                var svgCanvas = renderToCanvas(256);
                var svgBlob = await canvasToBlob(svgCanvas, 'image/png');
                zip.file('safari-pinned-tab.svg', createMinimalSVG(svgCanvas));
            }

            /* site.webmanifest */
            zip.file('site.webmanifest', generateWebManifest());

            /* browserconfig.xml */
            zip.file('browserconfig.xml', generateBrowserConfig());

            /* README.txt */
            zip.file('README.txt', generateREADME());

            /* download */
            var zipBlob = await zip.generateAsync({ type: 'blob' });
            downloadBlob(zipBlob, 'favicon-bundle.zip');
            notify('Favicon bundle downloaded!', 'success');

        } catch (error) {
            console.error('Bundle error:', error);
            notify('Error generating bundle. Downloading single PNG...', 'error');
            downloadSinglePNG();
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = origText;
        }
    }

    async function renderToCanvasBlobData(size) {
        var canvas = renderToCanvas(size);
        return await canvasToBlob(canvas, 'image/png');
    }

    function createMinimalSVG(canvas) {
        var dataUrl = canvas.toDataURL('image/png');
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><image href="' + dataUrl + '" width="256" height="256"/></svg>';
    }

    /* ------------------------------------------
       WEB MANIFEST GENERATOR
    ------------------------------------------ */
    function generateWebManifest() {
        var bgColor = state.bgColor;
        if (state.mode === 'emoji' && state.emojiBgMode === 'colored') bgColor = state.emojiBgColor;

        var manifest = {
            name: state.siteName,
            short_name: state.siteShortName,
            icons: [
                { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
                { src: 'favicon-16x16.png', sizes: '16x16', type: 'image/png' },
                { src: 'favicon-32x32.png', sizes: '32x32', type: 'image/png' },
                { src: 'favicon-48x48.png', sizes: '48x48', type: 'image/png' },
                { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
            ],
            theme_color: bgColor,
            background_color: bgColor,
            display: 'standalone',
            start_url: '/'
        };
        return JSON.stringify(manifest, null, 2);
    }

    /* ------------------------------------------
       BROWSERCONFIG.XML GENERATOR
    ------------------------------------------ */
    function generateBrowserConfig() {
        var bgColor = state.bgColor;
        if (state.mode === 'emoji' && state.emojiBgMode === 'colored') bgColor = state.emojiBgColor;

        return '<?xml version="1.0" encoding="utf-8"?>\n' +
            '<browserconfig>\n' +
            '  <msapplication>\n' +
            '    <tile>\n' +
            '      <square70x70logo src="mstile-70x70.png"/>\n' +
            '      <square150x150logo src="mstile-150x150.png"/>\n' +
            '      <square310x310logo src="mstile-310x310.png"/>\n' +
            '      <wide310x150logo src="mstile-310x150.png"/>\n' +
            '      <TileColor>' + bgColor + '</TileColor>\n' +
            '    </tile>\n' +
            '  </msapplication>\n' +
            '</browserconfig>';
    }

    /* ------------------------------------------
       README GENERATOR
    ------------------------------------------ */
    function generateREADME() {
        return '====================================================\n' +
            '  FAVICON INSTALLATION GUIDE\n' +
            '  Generated by GoToolly Favicon Generator\n' +
            '====================================================\n\n' +
            'FILES INCLUDED\n' +
            '--------------\n\n' +
            '  favicon.ico                   - Classic ICO format (16, 32, 48 px)\n' +
            '  favicon-16x16.png             - Small browser tab icon\n' +
            '  favicon-32x32.png             - Standard browser tab icon\n' +
            '  favicon-48x48.png             - Windows site icon\n' +
            '  favicon-64x64.png             - High-DPI browser tab\n' +
            '  favicon-96x96.png             - Desktop shortcut icon\n' +
            '  favicon-128x128.png           - Chrome Web Store icon\n' +
            '  favicon-180x180.png           - Apple Touch Icon\n' +
            '  favicon-192x192.png           - Android Chrome icon\n' +
            '  favicon-256x256.png           - High-resolution icon\n' +
            '  favicon-512x512.png           - Maximum resolution icon\n' +
            '  apple-touch-icon.png          - iOS home screen (180x180)\n' +
            '  android-chrome-192x192.png    - Android Chrome (192x192)\n' +
            '  android-chrome-512x512.png    - Android Chrome (512x512)\n' +
            '  mstile-150x150.png            - Microsoft Tile (150x150)\n' +
            '  safari-pinned-tab.svg         - Safari pinned tab (vector)\n' +
            '  site.webmanifest              - Web App Manifest\n' +
            '  browserconfig.xml             - Microsoft Browser Config\n' +
            '  README.txt                    - This file\n\n' +
            'INSTALLATION\n' +
            '------------\n\n' +
            '1. Upload ALL files to your website root directory (public_html, www, etc.)\n\n' +
            '2. Add the following HTML to the <head> section of your pages:\n\n' +
            '   <!-- Standard favicon -->\n' +
            '   <link rel="icon" href="/favicon.ico">\n\n' +
            '   <!-- PNG favicons (multiple sizes) -->\n' +
            '   <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n' +
            '   <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n' +
            '   <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">\n\n' +
            '   <!-- Apple Touch Icon (iOS) -->\n' +
            '   <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n\n' +
            '   <!-- Web App Manifest -->\n' +
            '   <link rel="manifest" href="/site.webmanifest">\n\n' +
            '   <!-- Safari Pinned Tab -->\n' +
            '   <link rel="mask-icon" href="/safari-pinned-tab.svg">\n\n' +
            '   <!-- Theme Color -->\n' +
            '   <meta name="theme-color" content="' + state.bgColor + '">\n\n' +
            'FILE PLACEMENT\n' +
            '--------------\n\n' +
            '  Root directory (public_html / www /):\n' +
            '    favicon.ico\n' +
            '    favicon-16x16.png\n' +
            '    favicon-32x32.png\n' +
            '    favicon-48x48.png\n' +
            '    favicon-64x64.png\n' +
            '    favicon-96x96.png\n' +
            '    favicon-128x128.png\n' +
            '    favicon-180x180.png\n' +
            '    favicon-192x192.png\n' +
            '    favicon-256x256.png\n' +
            '    favicon-512x512.png\n' +
            '    apple-touch-icon.png\n' +
            '    android-chrome-192x192.png\n' +
            '    android-chrome-512x512.png\n' +
            '    mstile-150x150.png\n' +
            '    safari-pinned-tab.svg\n' +
            '    site.webmanifest\n' +
            '    browserconfig.xml\n' +
            '    README.txt\n\n' +
            'PLATFORM SUPPORT\n' +
            '----------------\n\n' +
            '  Chrome / Edge / Opera  : favicon.ico, favicon-*.png, webmanifest\n' +
            '  Firefox               : favicon.ico, favicon-*.png\n' +
            '  Safari                : apple-touch-icon.png, safari-pinned-tab.svg\n' +
            '  iOS                   : apple-touch-icon.png\n' +
            '  Android               : android-chrome-*.png, webmanifest\n' +
            '  Windows               : mstile-*.png, browserconfig.xml\n\n' +
            'NOTES\n' +
            '-----\n\n' +
            '  - Place all files in the root of your domain (not in a subdirectory)\n' +
            '    unless you update the paths in site.webmanifest and browserconfig.xml\n' +
            '  - Clear browser cache after uploading new favicons\n' +
            '  - Some browsers aggressively cache favicons; use ?v=2 in the URL\n' +
            '  - Generated by GoToolly Favicon Generator (https://gotoolly.com)\n';
    }

    /* ------------------------------------------
       UTILITY
    ------------------------------------------ */
    function canvasToBlob(canvas, type) {
        return new Promise(function (resolve) {
            canvas.toBlob(function (blob) { resolve(blob); }, type);
        });
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function notify(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
});