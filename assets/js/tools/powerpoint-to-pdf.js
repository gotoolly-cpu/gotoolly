document.addEventListener('DOMContentLoaded', function () {
    function waitForLibs(callback) {
        if (typeof pdfjsLib !== 'undefined' && typeof PDFLib !== 'undefined') {
            callback();
            return;
        }
        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (typeof pdfjsLib !== 'undefined' && typeof PDFLib !== 'undefined') {
                clearInterval(interval);
                callback();
            } else if (attempts > 50) {
                clearInterval(interval);
                notify('Libraries failed to load. Please refresh the page.', 'error');
            }
        }, 200);
    }

    waitForLibs(function () {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        var fileInput = document.getElementById('pptx-input');
        var dropZone = document.getElementById('drop-zone');
        var fileInfo = document.getElementById('file-info');
        var fileName = document.getElementById('file-name');
        var fileSize = document.getElementById('file-size');
        var fileStatus = document.getElementById('file-status');
        var settingsPanel = document.getElementById('settings-panel');
        var convertBtn = document.getElementById('convert-btn');
        var resetBtn = document.getElementById('reset-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var progressContainer = document.getElementById('progress-container');
        var progressFill = document.getElementById('progress-fill');
        var progressText = document.getElementById('progress-text');
        var progressPercent = document.getElementById('progress-percent');
        var slideCount = document.getElementById('slide-count');
        var resultsPanel = document.getElementById('results-panel');
        var resultsDesc = document.getElementById('results-desc');
        var resultPages = document.getElementById('result-pages');
        var resultSize = document.getElementById('result-size');
        var downloadBtn = document.getElementById('download-btn');
        var newFileBtn = document.getElementById('new-file-btn');

        var pptxData = null;
        var totalSlides = 0;
        var cancelled = false;

        function init() {
            fileInput.addEventListener('change', handleFileSelect);
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            convertBtn.addEventListener('click', startConversion);
            resetBtn.addEventListener('click', resetTool);
            cancelBtn.addEventListener('click', function () { cancelled = true; });
            newFileBtn.addEventListener('click', resetTool);
        }

        function handleFileSelect(e) {
            var file = e.target.files[0];
            if (!file) return;
            loadFile(file);
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            var file = e.dataTransfer.files[0];
            if (file) loadFile(file);
        }

        function loadFile(file) {
            if (file.size > 50 * 1024 * 1024) {
                notify('File too large. Maximum size is 50 MB.', 'error');
                return;
            }
            var ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'pptx') {
                notify('Please select a PowerPoint file (.pptx)', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                pptxData = e.target.result;
                fileName.textContent = file.name;
                fileSize.textContent = formatSize(file.size);
                fileStatus.textContent = 'Loaded';
                fileInfo.classList.add('show');
                settingsPanel.classList.add('show');
                resultsPanel.classList.remove('show');
                dropZone.style.display = 'none';

                try {
                    var zip = new JSZip();
                    zip.loadAsync(new Uint8Array(pptxData)).then(function () {
                        return zip.file('[Content_Types].xml').async('string');
                    }).then(function () {
                        return zip.folder('ppt/slides');
                    }).then(function (slides) {
                        totalSlides = Object.keys(slides.files).filter(function (k) {
                            return k.indexOf('slide') === 0 && k.indexOf('.xml') > -1;
                        }).length;
                        slideCount.textContent = totalSlides + ' slide' + (totalSlides !== 1 ? 's' : '');
                        notify('PowerPoint loaded: ' + totalSlides + ' slides', 'success');
                    }).catch(function () {
                        totalSlides = 0;
                        notify('Could not parse PowerPoint structure. Slides rendered as images.', 'info');
                    });
                } catch (err) {
                    notify('Failed to load PowerPoint: ' + err.message, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        }

        async function startConversion() {
            if (!pptxData) {
                notify('Please load a PowerPoint file first', 'error');
                return;
            }
            cancelled = false;
            convertBtn.disabled = true;
            resetBtn.disabled = true;
            progressContainer.classList.add('show');
            progressFill.style.width = '0%';
            progressText.textContent = 'Analyzing slides...';
            progressPercent.textContent = '0%';

            try {
                var pdfDoc = await PDFLib.PDFDocument.create();
                var slideImages = await extractSlideImages(pptxData);

                for (var i = 0; i < slideImages.length; i++) {
                    if (cancelled) {
                        notify('Conversion cancelled', 'error');
                        break;
                    }
                    progressText.textContent = 'Processing slide ' + (i + 1) + ' of ' + slideImages.length + '...';
                    progressPercent.textContent = Math.round(((i + 1) / slideImages.length) * 100) + '%';
                    progressFill.style.width = Math.round(((i + 1) / slideImages.length) * 100) + '%';

                    var imgData = slideImages[i];
                    var img = null;
                    if (imgData.type === 'png') {
                        img = await pdfDoc.embedPng(imgData.data);
                    } else {
                        img = await pdfDoc.embedJpg(imgData.data);
                    }
                    var page = pdfDoc.addPage([img.width, img.height]);
                    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
                }

                progressText.textContent = 'Finalizing PDF...';
                progressPercent.textContent = '100%';
                progressFill.style.width = '100%';

                var pdfBytes = await pdfDoc.save();
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                downloadBtn.href = url;
                downloadBtn.download = 'presentation.pdf';

                resultPages.textContent = pdfDoc.getPageCount() + ' page' + (pdfDoc.getPageCount() !== 1 ? 's' : '');
                resultSize.textContent = formatSize(blob.size);
                resultsPanel.classList.add('show');
                progressContainer.classList.remove('show');
                notify('Conversion complete!', 'success');
            } catch (err) {
                notify('Conversion failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            convertBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function extractSlideImages(arrayBuffer) {
            return new Promise(function (resolve, reject) {
                try {
                    JSZip.loadAsync(new Uint8Array(arrayBuffer)).then(function (zip) {
                        var slideFiles = [];
                        zip.folder('ppt/slides/').forEach(function (path, file) {
                            if (!file.dir) slideFiles.push(file);
                        });
                        slideFiles.sort(function (a, b) {
                            var numA = parseInt(a.name.match(/\d+/)[0], 10);
                            var numB = parseInt(b.name.match(/\d+/)[0], 10);
                            return numA - numB;
                        });

                        if (slideFiles.length === 0) {
                            resolve([]);
                            return;
                        }

                        var mediaImages = {};
                        var mediaFolder = zip.folder('ppt/media/');
                        if (mediaFolder) {
                            mediaFolder.forEach(function (path, file) {
                                if (!file.dir) {
                                    var ext = path.split('.').pop().toLowerCase();
                                    if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].indexOf(ext) !== -1) {
                                        mediaImages[path] = file;
                                    }
                                }
                            });
                        }

                        var slidePromises = slideFiles.map(function (slideFile, idx) {
                            return slideFile.async('string').then(function (slideXml) {
                                var parser = new DOMParser();
                                var xmlDoc = parser.parseFromString(slideXml, 'text/xml');

                                var textElements = xmlDoc.querySelectorAll('a\\:t, a\\:r');
                                var slideTexts = [];
                                textElements.forEach(function (el) {
                                    var text = el.textContent.trim();
                                    if (text) slideTexts.push(text);
                                });

                                var relsFile = zip.file('ppt/slides/_rels/slide' + (idx + 1) + '.xml.rels');
                                var relsPromise = relsFile ? relsFile.async('string') : Promise.resolve(null);

                                return relsPromise.then(function (relsXml) {
                                    var slideImageFiles = [];
                                    if (relsXml) {
                                        var relsDoc = parser.parseFromString(relsXml, 'text/xml');
                                        var relationships = relsDoc.querySelectorAll('Relationship');
                                        relationships.forEach(function (rel) {
                                            var target = rel.getAttribute('Target');
                                            var type = rel.getAttribute('Type') || '';
                                            if (type.indexOf('image') !== -1 && target) {
                                                var normalised = target.replace(/\\/g, '/');
                                                if (normalised.indexOf('/') === 0) normalised = normalised.substring(1);
                                                var mediaPath = normalised;
                                                if (mediaImages[mediaPath]) {
                                                    slideImageFiles.push(mediaImages[mediaPath]);
                                                } else {
                                                    var tryPath = 'ppt/slides/' + normalised;
                                                    if (mediaImages[tryPath]) {
                                                        slideImageFiles.push(mediaImages[tryPath]);
                                                    } else {
                                                        var filename = normalised.split('/').pop();
                                                        Object.keys(mediaImages).forEach(function (k) {
                                                            if (k.split('/').pop() === filename && slideImageFiles.indexOf(mediaImages[k]) === -1) {
                                                                slideImageFiles.push(mediaImages[k]);
                                                            }
                                                        });
                                                    }
                                                }
                                            }
                                        });
                                    }

                                    var loadImages = slideImageFiles.map(function (imgFile) {
                                        return imgFile.async('base64').then(function (b64) {
                                            var ext = imgFile.name.split('.').pop().toLowerCase();
                                            var mime = ext === 'png' ? 'png' : 'jpeg';
                                            var dataUrl = 'data:image/' + mime + ';base64,' + b64;
                                            return new Promise(function (res, rej) {
                                                var img = new Image();
                                                img.onload = function () { res(img); };
                                                img.onerror = function () { res(null); };
                                                img.src = dataUrl;
                                            });
                                        });
                                    });

                                    return Promise.all(loadImages).then(function (loadedImages) {
                                        var canvas = document.createElement('canvas');
                                        var ctx = canvas.getContext('2d');
                                        canvas.width = 960;
                                        canvas.height = 540;
                                        ctx.fillStyle = '#ffffff';
                                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                                        ctx.fillStyle = '#1a1a2e';
                                        ctx.font = 'bold 28px Arial, sans-serif';
                                        ctx.textAlign = 'center';
                                        ctx.fillText('Slide ' + (idx + 1), canvas.width / 2, 45);

                                        var yPos = 80;
                                        ctx.font = '16px Arial, sans-serif';
                                        ctx.fillStyle = '#555555';
                                        ctx.textAlign = 'left';
                                        ctx.fillText('Content extracted from slide:', 30, yPos);
                                        yPos += 30;

                                        ctx.font = '14px Arial, sans-serif';
                                        ctx.fillStyle = '#333333';

                                        var maxLines = Math.min(slideTexts.length, 25);
                                        for (var t = 0; t < maxLines; t++) {
                                            var line = slideTexts[t];
                                            var maxChars = 80;
                                            while (line.length > maxChars) {
                                                ctx.fillText(line.substring(0, maxChars), 30, yPos);
                                                yPos += 20;
                                                line = line.substring(maxChars);
                                                if (yPos > 480) break;
                                            }
                                            if (yPos > 480) break;
                                            ctx.fillText(line, 30, yPos);
                                            yPos += 22;
                                        }

                                        if (slideTexts.length > maxLines) {
                                            ctx.fillStyle = '#999';
                                            ctx.fillText('... and ' + (slideTexts.length - maxLines) + ' more text elements', 30, yPos + 5);
                                        }

                                        if (slideTexts.length === 0) {
                                            ctx.fillStyle = '#999';
                                            ctx.font = 'italic 14px Arial, sans-serif';
                                            ctx.fillText('(No text content found on this slide)', 30, yPos + 5);
                                        }

                                        var validImages = loadedImages.filter(function (img) { return img !== null; });
                                        if (validImages.length > 0) {
                                            var imgAreaTop = Math.max(yPos + 20, 100);
                                            var availWidth = canvas.width - 60;
                                            var availHeight = canvas.height - imgAreaTop - 20;
                                            var totalImgWidth = validImages.length * 200 + (validImages.length - 1) * 10;
                                            var scale = Math.min(1, availWidth / totalImgWidth, availHeight / 150);
                                            var drawW = Math.round(200 * scale);
                                            var drawH = Math.round(150 * scale);
                                            var gap = Math.round(10 * scale);
                                            var totalW = validImages.length * drawW + (validImages.length - 1) * gap;
                                            var startX = (canvas.width - totalW) / 2;

                                            for (var mi = 0; mi < validImages.length; mi++) {
                                                var img = validImages[mi];
                                                var ratio = img.width / img.height;
                                                var w = drawW;
                                                var h = Math.round(w / ratio);
                                                if (h > drawH) { h = drawH; w = Math.round(h * ratio); }
                                                var x = startX + mi * (drawW + gap) + (drawW - w) / 2;
                                                var y = imgAreaTop + (drawH - h) / 2;
                                                try { ctx.drawImage(img, x, y, w, h); } catch (e) {}
                                            }
                                        }

                                        return new Promise(function (res) {
                                            canvas.toBlob(function (blob) {
                                                var reader = new FileReader();
                                                reader.onload = function (e) {
                                                    res({ data: e.target.result, type: 'png' });
                                                };
                                                reader.readAsArrayBuffer(blob);
                                            }, 'image/png');
                                        });
                                    });
                                });
                            });
                        });

                        Promise.all(slidePromises).then(function (images) {
                            resolve(images);
                        }).catch(function (err) {
                            reject(err);
                        });
                    }).catch(function (err) {
                        reject(err);
                    });
                } catch (err) {
                    reject(err);
                }
            });
        }

        function resetTool() {
            fileInput.value = '';
            pptxData = null;
            totalSlides = 0;
            cancelled = false;
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            dropZone.style.display = '';
            slideCount.textContent = '';
        }

        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1048576).toFixed(1) + ' MB';
        }

        function notify(msg, type) {
            var el = document.createElement('div');
            el.className = 'notification ' + (type || 'success');
            el.textContent = msg;
            document.body.appendChild(el);
            setTimeout(function () {
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.3s ease';
                setTimeout(function () { el.remove(); }, 300);
            }, 3000);
        }

        init();
    });
});
