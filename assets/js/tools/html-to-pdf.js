document.addEventListener('DOMContentLoaded', function () {
    function waitForLibs(callback) {
        if (typeof PDFLib !== 'undefined') { callback(); return; }
        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (typeof PDFLib !== 'undefined') { clearInterval(interval); callback(); }
            else if (attempts > 50) { clearInterval(interval); notify('Libraries failed to load. Please refresh.', 'error'); }
        }, 200);
    }

    waitForLibs(function () {
        var htmlTextarea = document.getElementById('html-input');
        var htmlFileInput = document.getElementById('html-file-input');
        var dropZone = document.getElementById('drop-zone');
        var fileInfo = document.getElementById('file-info');
        var fileName = document.getElementById('file-name');
        var fileStatus = document.getElementById('file-status');
        var settingsPanel = document.getElementById('settings-panel');
        var pageSizeSelect = document.getElementById('page-size');
        var orientationSelect = document.getElementById('orientation');
        var marginsSelect = document.getElementById('margins');
        var convertBtn = document.getElementById('convert-btn');
        var resetBtn = document.getElementById('reset-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var progressContainer = document.getElementById('progress-container');
        var progressFill = document.getElementById('progress-fill');
        var progressText = document.getElementById('progress-text');
        var progressPercent = document.getElementById('progress-percent');
        var resultsPanel = document.getElementById('results-panel');
        var resultPages = document.getElementById('result-pages');
        var resultSize = document.getElementById('result-size');
        var downloadBtn = document.getElementById('download-btn');
        var newFileBtn = document.getElementById('new-file-btn');
        var charCount = document.getElementById('char-count');
        var cancelled = false;

        var SKIP_TAGS = [
            'script', 'style', 'noscript', 'template',
            'meta', 'link', 'input', 'select', 'textarea', 'button',
            'svg', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon',
            'g', 'defs', 'use', 'symbol', 'pattern', 'clipPath', 'mask',
            'filter', 'linearGradient', 'radialGradient', 'stop', 'image',
            'source', 'track', 'wbr', 'area', 'base', 'col', 'embed', 'object', 'param'
        ];

        var VOID_TAGS = ['meta', 'link', 'input', 'img', 'br', 'hr', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr', 'select', 'textarea', 'button', 'object', 'param'];

        var DEFAULT_STYLES = {
            body:     { fontSize: 11, marginBottom: 6, color: '#1a1a1a' },
            h1:       { fontSize: 22, fontWeight: 'bold', marginTop: 14, marginBottom: 8, color: '#111827' },
            h2:       { fontSize: 18, fontWeight: 'bold', marginTop: 12, marginBottom: 6, color: '#1f2937' },
            h3:       { fontSize: 15, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#374151' },
            h4:       { fontSize: 13, fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: '#4b5563' },
            h5:       { fontSize: 12, fontWeight: 'bold', marginTop: 6, marginBottom: 3, color: '#6b7280' },
            h6:       { fontSize: 11, fontWeight: 'bold', marginTop: 4, marginBottom: 3, color: '#9ca3af' },
            p:        { fontSize: 11, marginTop: 0, marginBottom: 8, color: '#1a1a1a' },
            li:       { fontSize: 11, marginTop: 0, marginBottom: 3, color: '#1a1a1a' },
            th:       { fontSize: 10, fontWeight: 'bold', color: '#ffffff', bgColor: '#1e3a5f' },
            td:       { fontSize: 10, color: '#1a1a1a' },
            tr:       { },
            blockquote: { fontSize: 11, fontStyle: 'italic', color: '#6b7280', marginLeft: 20, marginTop: 6, marginBottom: 6 },
            pre:      { fontSize: 9, bgColor: '#f3f4f6', marginTop: 6, marginBottom: 6 },
            code:     { fontSize: 10, bgColor: '#f3f4f6' },
            hr:       { marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#d1d5db' },
            a:        { color: '#2563eb' },
            strong:   { fontWeight: 'bold' },
            b:        { fontWeight: 'bold' },
            em:       { fontStyle: 'italic' },
            i:        { fontStyle: 'italic' },
            u:        { textDecoration: 'underline' },
            s:        { textDecoration: 'line-through' },
            del:      { textDecoration: 'line-through' },
            small:    { fontSize: 9 },
            big:      { fontSize: 14 }
        };

        function parseCssLength(val) {
            if (typeof val === 'number') return val;
            if (!val || typeof val !== 'string') return 0;
            val = val.trim();
            if (val.endsWith('rem')) return parseFloat(val) * 12;
            if (val.endsWith('em')) return parseFloat(val) * 12;
            if (val.endsWith('px')) return parseFloat(val);
            if (val.endsWith('pt')) return parseFloat(val);
            return parseFloat(val) || 0;
        }

        function parseHexColor(hex) {
            hex = hex.replace('#', '');
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            if (hex.length !== 6) return null;
            return { r: parseInt(hex.substring(0, 2), 16) / 255, g: parseInt(hex.substring(2, 4), 16) / 255, b: parseInt(hex.substring(4, 6), 16) / 255 };
        }

        function parseColor(str) {
            if (!str || str === 'transparent' || str.indexOf('var(') === 0) return null;
            if (str.charAt(0) === '#') return parseHexColor(str);
            var m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (m) return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255 };
            return parseHexColor(str);
        }

        function parseInlineStyle(cssText) {
            var s = {};
            if (!cssText) return s;
            var parts = cssText.split(';');
            for (var i = 0; i < parts.length; i++) {
                var colonIdx = parts[i].indexOf(':');
                if (colonIdx < 0) continue;
                var key = parts[i].substring(0, colonIdx).trim().toLowerCase();
                var val = parts[i].substring(colonIdx + 1).trim();
                if (!key || !val) continue;
                if (key === 'font-size') s.fontSize = parseCssLength(val);
                else if (key === 'font-weight') s.fontWeight = val;
                else if (key === 'font-style') s.fontStyle = val;
                else if (key === 'text-decoration') s.textDecoration = val;
                else if (key === 'color') { if (val.indexOf('var(') === -1) s.color = val; }
                else if (key === 'background-color') { if (val.indexOf('var(') === -1) s.bgColor = val; }
                else if (key === 'background') { if ((val.indexOf('#') >= 0 || val.indexOf('rgb') >= 0) && val.indexOf('var(') === -1) s.bgColor = val; }
                else if (key === 'margin-top') s.marginTop = parseCssLength(val);
                else if (key === 'margin-bottom') s.marginBottom = parseCssLength(val);
                else if (key === 'margin-left') s.marginLeft = parseCssLength(val);
                else if (key === 'margin-right') s.marginRight = parseCssLength(val);
                else if (key === 'margin') {
                    var mp = val.split(/\s+/).map(function(v) { return parseCssLength(v); });
                    if (mp.length === 1) { s.marginTop = mp[0]; s.marginBottom = mp[0]; s.marginLeft = mp[0]; s.marginRight = mp[0]; }
                    else if (mp.length === 2) { s.marginTop = mp[0]; s.marginBottom = mp[0]; s.marginLeft = mp[1]; s.marginRight = mp[1]; }
                    else if (mp.length >= 4) { s.marginTop = mp[0]; s.marginRight = mp[1]; s.marginBottom = mp[2]; s.marginLeft = mp[3]; }
                }
                else if (key === 'padding-top') s.paddingTop = parseCssLength(val);
                else if (key === 'padding-bottom') s.paddingBottom = parseCssLength(val);
                else if (key === 'padding-left') s.paddingLeft = parseCssLength(val);
                else if (key === 'padding-right') s.paddingRight = parseCssLength(val);
                else if (key === 'padding') {
                    var pp = val.split(/\s+/).map(function(v) { return parseCssLength(v); });
                    if (pp.length === 1) { s.paddingTop = pp[0]; s.paddingBottom = pp[0]; s.paddingLeft = pp[0]; s.paddingRight = pp[0]; }
                    else if (pp.length === 2) { s.paddingTop = pp[0]; s.paddingBottom = pp[0]; s.paddingLeft = pp[1]; s.paddingRight = pp[1]; }
                    else if (pp.length >= 4) { s.paddingTop = pp[0]; s.paddingRight = pp[1]; s.paddingBottom = pp[2]; s.paddingLeft = pp[3]; }
                }
                else if (key === 'text-align') s.textAlign = val;
                else if (key === 'line-height') s.lineHeight = parseFloat(val) || 1.5;
                else if (key === 'list-style-type') s.listStyleType = val;
                else if (key === 'border') {
                    var bp = val.split(' ');
                    s.borderWidth = parseFloat(bp[0]) || 0;
                    s.borderColor = bp[2] || '#000000';
                }
                else if (key === 'border-width') s.borderWidth = parseFloat(val) || 0;
                else if (key === 'border-color') s.borderColor = val;
            }
            return s;
        }

        function cleanHtml(html) {
            html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
            html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
            html = html.replace(/<!--[\s\S]*?-->/g, '');
            html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
            html = html.replace(/<head[\s\S]*?<\/head>/gi, '');
            html = html.replace(/<body[^>]*>/gi, '');
            html = html.replace(/<\/body>/gi, '');
            html = html.replace(/<html[^>]*>/gi, '');
            html = html.replace(/<\/html>/gi, '');
            return html;
        }

        function tokenize(html) {
            var tokens = [];
            var i = 0;
            while (i < html.length) {
                if (html[i] === '<') {
                    var end = html.indexOf('>', i);
                    if (end === -1) end = html.length - 1;
                    var tagStr = html.substring(i, end + 1);
                    var closing = tagStr.length > 1 && tagStr[1] === '/';
                    var selfClosing = tagStr.length > 2 && tagStr[tagStr.length - 2] === '/';
                    var inner = tagStr.slice(closing ? 2 : 1, selfClosing ? -2 : -1).trim();
                    var spaceIdx = inner.indexOf(' ');
                    if (spaceIdx < 0) spaceIdx = inner.length;
                    var tagName = inner.substring(0, spaceIdx).toLowerCase();
                    var attrs = {};
                    if (spaceIdx < inner.length) {
                        var attrStr = inner.substring(spaceIdx + 1);
                        var aRe = /([a-zA-Z\-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
                        var aMatch;
                        while ((aMatch = aRe.exec(attrStr)) !== null) {
                            attrs[aMatch[1].toLowerCase()] = aMatch[2] !== undefined ? aMatch[2] : (aMatch[3] !== undefined ? aMatch[3] : (aMatch[4] || ''));
                        }
                    }
                    if (closing) {
                        tokens.push({ type: 'close', tag: tagName });
                    } else {
                        tokens.push({ type: 'open', tag: tagName, attrs: attrs, selfClosing: selfClosing || VOID_TAGS.indexOf(tagName) !== -1 });
                    }
                    i = end + 1;
                } else {
                    var nextTag = html.indexOf('<', i);
                    if (nextTag === -1) nextTag = html.length;
                    var text = html.substring(i, nextTag);
                    if (text.length > 0) tokens.push({ type: 'text', text: text });
                    i = nextTag;
                }
            }
            return tokens;
        }

        function buildTree(tokens) {
            var root = { tag: 'body', children: [], attrs: {}, style: {} };
            var stack = [root];
            for (var i = 0; i < tokens.length; i++) {
                var tk = tokens[i];
                if (tk.type === 'text') {
                    var txt = tk.text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'").replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"').replace(/&bull;/g, '-').replace(/&copy;/g, '(c)').replace(/&reg;/g, '(r)').replace(/&trade;/g, '(tm)').replace(/&mdash;/g, '--').replace(/&ndash;/g, '-').replace(/&hellip;/g, '...').replace(/&laquo;/g, '"').replace(/&raquo;/g, '"').replace(/&deg;/g, '*').replace(/&middot;/g, '*').replace(/&#(\d+);/g, function(m, d) {
                        d = parseInt(d, 10);
                        var e = { 8216: "'", 8217: "'", 8218: "'", 8220: '"', 8221: '"', 8222: '"', 8226: '-', 8230: '...', 8240: '%', 8482: '(tm)', 169: '(c)', 174: '(r)', 215: 'x', 247: '/' };
                        return e[d] !== undefined ? e[d] : (d >= 32 && d <= 126 ? String.fromCharCode(d) : '?');
                    }).replace(/&#x([0-9a-fA-F]+);/g, function(m, h) {
                        h = parseInt(h, 16);
                        var e = { 0x2018: "'", 0x2019: "'", 0x201A: "'", 0x201C: '"', 0x201D: '"', 0x201E: '"', 0x2022: '-', 0x2026: '...', 0x2030: '%', 0x2122: '(tm)', 0xA9: '(c)', 0xAE: '(r)', 0xD7: 'x', 0xF7: '/' };
                        return e[h] !== undefined ? e[h] : (h >= 0x20 && h <= 0x7E ? String.fromCharCode(h) : '?');
                    });
                    if (txt.trim()) stack[stack.length - 1].children.push({ type: 'text', text: txt });
                } else if (tk.type === 'open') {
                    if (SKIP_TAGS.indexOf(tk.tag) !== -1) continue;
                    if (tk.tag === 'br') { stack[stack.length - 1].children.push({ type: 'br' }); continue; }
                    if (tk.tag === 'hr') { stack[stack.length - 1].children.push({ type: 'hr' }); continue; }
                    if (tk.tag === 'img') {
                        stack[stack.length - 1].children.push({ type: 'img', src: tk.attrs.src || '', alt: tk.attrs.alt || '', width: parseInt(tk.attrs.width) || 0, height: parseInt(tk.attrs.height) || 0 });
                        continue;
                    }
                    var node = { tag: tk.tag, children: [], attrs: tk.attrs, style: tk.attrs.style ? parseInlineStyle(tk.attrs.style) : {} };
                    stack[stack.length - 1].children.push(node);
                    if (!tk.selfClosing) stack.push(node);
                } else if (tk.type === 'close') {
                    for (var s = stack.length - 1; s > 0; s--) {
                        if (stack[s].tag === tk.tag) { stack.splice(s); break; }
                    }
                }
            }
            return root;
        }

        function getStyle(node) {
            var def = DEFAULT_STYLES[node.tag] || {};
            var s = {};
            for (var k in def) s[k] = def[k];
            if (node.style) for (var k2 in node.style) s[k2] = node.style[k2];
            return s;
        }

        function isBlockTag(tag) {
            return tag === 'div' || tag === 'p' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' ||
                   tag === 'ul' || tag === 'ol' || tag === 'li' ||
                   tag === 'table' || tag === 'thead' || tag === 'tbody' || tag === 'tfoot' || tag === 'tr' || tag === 'th' || tag === 'td' ||
                   tag === 'blockquote' || tag === 'pre' || tag === 'section' || tag === 'article' || tag === 'aside' || tag === 'header' || tag === 'footer' || tag === 'main' || tag === 'nav' || tag === 'figure' || tag === 'figcaption' || tag === 'address' || tag === 'details' || tag === 'summary' || tag === 'dialog';
        }

        var _measureCanvas = null;
        function measureTextWidth(text, fontSize, bold) {
            if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
            var ctx = _measureCanvas.getContext('2d');
            ctx.font = (bold ? 'bold ' : '') + fontSize + 'px Helvetica, Arial, sans-serif';
            return ctx.measureText(text || '').width;
        }

        function wrapWords(text, fontSize, bold, maxWidth) {
            if (!text || !text.trim()) return [];
            if (maxWidth <= 0) maxWidth = 500;
            var words = text.split(/(\s+)/);
            var lines = [];
            var line = '';
            var lineW = 0;
            for (var i = 0; i < words.length; i++) {
                var w = words[i];
                if (!w) continue;
                var isSpace = /^\s+$/.test(w);
                var ww = measureTextWidth(w, fontSize, bold);
                if (isSpace) {
                    if (lineW + ww <= maxWidth) { line += w; lineW += ww; }
                    else { if (line.trim()) lines.push(line); line = ''; lineW = 0; }
                } else {
                    if (ww > maxWidth) {
                        if (line.trim()) lines.push(line);
                        lines.push(w);
                        line = '';
                        lineW = 0;
                    } else if (lineW + ww <= maxWidth) {
                        line += w;
                        lineW += ww;
                    } else {
                        if (line.trim()) lines.push(line);
                        line = w;
                        lineW = ww;
                    }
                }
            }
            if (line.trim()) lines.push(line);
            return lines;
        }

        function extractText(node) {
            if (!node) return '';
            if (node.type === 'text') return node.text || '';
            if (node.type === 'br') return ' ';
            if (node.type === 'hr') return '';
            var parts = [];
            if (node.children) { for (var i = 0; i < node.children.length; i++) parts.push(extractText(node.children[i])); }
            return parts.join('');
        }

        function parseFontSize(val) {
            if (typeof val === 'number') return val;
            return parseCssLength(val) || 11;
        }

        function pushPageBreak(blocks) {
            blocks.push({ type: 'pageBreak' });
        }

        function ensureSpace(ctx, needed) {
            if (ctx.y - needed < ctx.margin) {
                pushPageBreak(ctx.blocks);
                ctx.y = ctx.pageH - ctx.margin;
                return true;
            }
            return false;
        }

        function mergeStyle(parent, node) {
            var s = {};
            for (var k in parent) s[k] = parent[k];
            var nodeDefaults = DEFAULT_STYLES[node.tag] || {};
            for (var k2 in nodeDefaults) s[k2] = nodeDefaults[k2];
            if (node.style) for (var k3 in node.style) s[k3] = node.style[k3];
            return s;
        }

        function layoutText(text, ctx, blocks, inheritedStyle) {
            var fs = parseFontSize(inheritedStyle.fontSize || 11);
            var fw = inheritedStyle.fontWeight || 'normal';
            var bold = fw === 'bold' || fw >= 700;
            var lh = fs * 1.5;
            var lines = wrapWords(text, fs, bold, ctx.availWidth);
            for (var i = 0; i < lines.length; i++) {
                ensureSpace(ctx, lh);
                blocks.push({
                    type: 'text',
                    text: lines[i],
                    x: ctx.x,
                    y: ctx.y,
                    fontSize: fs,
                    fontWeight: fw,
                    fontStyle: inheritedStyle.fontStyle || 'normal',
                    textDecoration: inheritedStyle.textDecoration || 'none',
                    color: inheritedStyle.color || '#1a1a1a'
                });
                ctx.y -= lh;
            }
        }

        function layoutInlineChildren(children, ctx, blocks, inheritedStyle) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (child.type === 'text') {
                    layoutText(child.text, ctx, blocks, inheritedStyle);
                } else if (child.type === 'br') {
                    var brFs = parseFontSize(inheritedStyle.fontSize || 11);
                    ctx.y -= brFs * 1.5;
                } else if (child.type === 'hr') {
                    ensureSpace(ctx, 12);
                    blocks.push({ type: 'hr', x: ctx.x, y: ctx.y - 4, width: ctx.availWidth, color: '#d1d5db' });
                    ctx.y -= 12;
                } else if (child.type === 'img') {
                    var imgW = child.width || 200;
                    var imgH = child.height || 150;
                    if (imgW > ctx.availWidth) { imgH = imgH * (ctx.availWidth / imgW); imgW = ctx.availWidth; }
                    ensureSpace(ctx, imgH + 8);
                    blocks.push({ type: 'img', x: ctx.x, y: ctx.y - imgH, width: imgW, height: imgH, src: child.src });
                    ctx.y -= imgH + 4;
                } else {
                    var childStyle = mergeStyle(inheritedStyle, child);
                    if (isBlockTag(child.tag)) {
                        layoutBlock(child, ctx, blocks, childStyle);
                    } else {
                        layoutInlineChildren(child.children || [], ctx, blocks, childStyle);
                    }
                }
            }
        }

        function layoutBlock(node, ctx, blocks, inheritedStyle) {
            var style = inheritedStyle || mergeStyle({ fontSize: 11, color: '#1a1a1a' }, node);
            var tag = node.tag;
            var mt = style.marginTop || 0;
            var mb = style.marginBottom || 0;
            var ml = style.marginLeft || 0;
            var mr = style.marginRight || 0;
            var pt = style.paddingTop || 0;
            var pb = style.paddingBottom || 0;
            var pl = style.paddingLeft || 0;
            var pr = style.paddingRight || 0;

            if (tag === 'li') { ml += 16; }
            if (tag === 'blockquote') { ml += 20; pl += 12; }

            ensureSpace(ctx, mt + 16);
            ctx.y -= mt;

            var innerX = ctx.x + ml + pl;
            var innerW = Math.max(50, ctx.availWidth - ml - mr - pl - pr);
            var startY = ctx.y;

            if (pt > 0) ctx.y -= pt;

            if (tag === 'table') {
                layoutTable(node, ctx, blocks, innerX, innerW, style);
            } else if (tag === 'ul' || tag === 'ol') {
                var items = [];
                for (var ci = 0; ci < node.children.length; ci++) {
                    if (node.children[ci].tag === 'li') items.push(node.children[ci]);
                    else if (node.children[ci].type === 'text' && node.children[ci].text && node.children[ci].text.trim()) {
                        items.push({ tag: 'li', children: [node.children[ci]], attrs: {}, style: {} });
                    }
                }
                for (var ii = 0; ii < items.length; ii++) {
                    var bulletText = tag === 'ol' ? (ii + 1) + '.' : '-';
                    var bulletW = measureTextWidth(bulletText, 10, false);
                    ensureSpace(ctx, 16);
                    blocks.push({
                        type: 'text', text: bulletText, x: innerX, y: ctx.y,
                        fontSize: 10, fontWeight: 'normal', fontStyle: 'normal',
                        textDecoration: 'none', color: style.color || '#1a1a1a'
                    });
                    var itemCtx = { x: innerX + bulletW + 4, y: ctx.y, availWidth: innerW - bulletW - 4, pageH: ctx.pageH, margin: ctx.margin, blocks: blocks };
                    var itemStyle = mergeStyle(style, items[ii]);
                    layoutInlineChildren(items[ii].children || [], itemCtx, blocks, itemStyle);
                    ctx.y = itemCtx.y;
                }
            } else {
                var childCtx = { x: innerX, y: ctx.y, availWidth: innerW, pageH: ctx.pageH, margin: ctx.margin, blocks: blocks };
                layoutInlineChildren(node.children || [], childCtx, blocks, style);
                ctx.y = childCtx.y;
            }

            if (pb > 0) ctx.y -= pb;
            var endY = ctx.y;
            var blockH = startY - endY;

            if (style.bgColor && blockH > 0) {
                blocks.push({ type: 'rect', x: innerX - pl, y: endY, width: innerW + pl + pr, height: blockH, color: style.bgColor, borderWidth: 0 });
            }
            if (style.borderWidth && style.borderWidth > 0 && blockH > 0) {
                blocks.push({ type: 'rect', x: innerX - pl, y: endY, width: innerW + pl + pr, height: blockH, color: null, borderColor: style.borderColor || '#000000', borderWidth: style.borderWidth });
            }

            ctx.y -= mb;
        }

        function layoutTable(tableNode, ctx, blocks, x, availW, tableStyle) {
            var rows = [];
            for (var si = 0; si < tableNode.children.length; si++) {
                var sec = tableNode.children[si];
                if (sec.tag === 'thead' || sec.tag === 'tbody' || sec.tag === 'tfoot') {
                    for (var ri = 0; ri < sec.children.length; ri++) {
                        if (sec.children[ri].tag === 'tr') rows.push(sec.children[ri]);
                    }
                } else if (sec.tag === 'tr') {
                    rows.push(sec);
                }
            }
            if (rows.length === 0) return;

            var maxCols = 0;
            for (var r = 0; r < rows.length; r++) {
                var cc = 0;
                for (var ci = 0; ci < rows[r].children.length; ci++) {
                    var ct = rows[r].children[ci].tag;
                    if (ct === 'td' || ct === 'th') cc++;
                }
                maxCols = Math.max(maxCols, cc);
            }
            if (maxCols === 0) return;

            var cellPad = 6;
            var colWidths = [];
            for (var c = 0; c < maxCols; c++) colWidths.push(availW / maxCols);

            for (var r2 = 0; r2 < rows.length; r2++) {
                var ci3 = 0;
                for (var c3 = 0; c3 < rows[r2].children.length; c3++) {
                    var cell = rows[r2].children[c3];
                    if (cell.tag !== 'td' && cell.tag !== 'th') continue;
                    if (ci3 >= maxCols) break;
                    var cellText = extractText(cell).trim();
                    var cellStyle = mergeStyle(tableStyle, cell);
                    var fs = parseFontSize(cellStyle.fontSize || 10);
                    var bold = (cellStyle.fontWeight === 'bold' || cellStyle.fontWeight >= 700);
                    var tw = measureTextWidth(cellText, fs, bold) + cellPad * 2;
                    if (tw > colWidths[ci3]) colWidths[ci3] = Math.min(tw, availW * 0.5);
                    ci3++;
                }
            }

            var totalCW = 0;
            for (var c4 = 0; c4 < maxCols; c4++) totalCW += colWidths[c4];
            if (totalCW > availW) {
                var scale = availW / totalCW;
                for (var c5 = 0; c5 < maxCols; c5++) colWidths[c5] *= scale;
            }

            var rowH = 24;

            for (var r3 = 0; r3 < rows.length; r3++) {
                var row = rows[r3];
                var maxCellH = rowH;
                var cellDataArr = [];
                var cx = x;
                var ci6 = 0;

                for (var c6 = 0; c6 < row.children.length; c6++) {
                    var cellNode = row.children[c6];
                    if (cellNode.tag !== 'td' && cellNode.tag !== 'th') continue;
                    if (ci6 >= maxCols) break;
                    var isH = cellNode.tag === 'th';
                    var cs = mergeStyle(tableStyle, cellNode);
                    var cText = extractText(cellNode).trim();
                    var cFs = parseFontSize(cs.fontSize || 10);
                    var cBold = (cs.fontWeight === 'bold' || cs.fontWeight >= 700);
                    var cLines = wrapWords(cText, cFs, cBold, colWidths[ci6] - cellPad * 2);
                    var cContentH = cLines.length * cFs * 1.5;
                    var cH = Math.max(rowH, cContentH + cellPad * 2);
                    cellDataArr.push({
                        x: cx, width: colWidths[ci6], height: cH,
                        text: cLines, fontSize: cFs, fontWeight: cs.fontWeight || 'normal',
                        bgColor: cs.bgColor || (isH ? '#1e3a5f' : null),
                        textColor: isH ? '#ffffff' : (cs.color || '#1a1a1a'),
                        isHeader: isH
                    });
                    if (cH > maxCellH) maxCellH = cH;
                    cx += colWidths[ci6];
                    ci6++;
                }

                ensureSpace(ctx, maxCellH + 2);
                var curY = ctx.y;

                for (var ci7 = 0; ci7 < cellDataArr.length; ci7++) {
                    var cd = cellDataArr[ci7];
                    cd.height = maxCellH;
                    var cellY = curY - maxCellH;

                    blocks.push({ type: 'tableCellBg', x: cd.x, y: cellY, width: cd.width, height: maxCellH, bgColor: cd.bgColor, borderColor: '#d1d5db' });

                    var textY = cellY + maxCellH - cellPad - cd.fontSize;
                    for (var li = 0; li < cd.text.length; li++) {
                        if (textY > cellY + 2) {
                            blocks.push({
                                type: 'text', text: cd.text[li], x: cd.x + cellPad, y: textY,
                                fontSize: cd.fontSize, fontWeight: cd.fontWeight, fontStyle: 'normal',
                                textDecoration: 'none', color: cd.textColor
                            });
                            textY -= cd.fontSize * 1.5;
                        }
                    }
                }

                ctx.y -= maxCellH;
            }
        }

        function normalizeText(t) {
            if (!t) return ' ';
            var m = {
                '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
                '\u2022': '-', '\u2023': '>', '\u25E6': 'o',
                '\u00A9': '(c)', '\u00AE': '(r)', '\u2122': '(tm)',
                '\u2013': '-', '\u2014': '--',
                '\u00AB': '"', '\u00BB': '"',
                '\u2039': '<', '\u203A': '>',
                '\u00A0': ' ', '\u2002': ' ', '\u2003': ' ',
                '\u2026': '...',
                '\u00B7': '*'
            };
            var r = '';
            for (var i = 0; i < t.length; i++) {
                var c = t[i];
                var code = t.charCodeAt(i);
                if (code >= 0x20 && code <= 0x7E) { r += c; }
                else if (m[c] !== undefined) { r += m[c]; }
                else if (code >= 0xC0 && code <= 0xFF) {
                    var latin = {
                        0xC0: 'A', 0xC1: 'A', 0xC2: 'A', 0xC3: 'A', 0xC4: 'A', 0xC5: 'A',
                        0xC6: 'AE', 0xC7: 'C', 0xC8: 'E', 0xC9: 'E', 0xCA: 'E', 0xCB: 'E',
                        0xCC: 'I', 0xCD: 'I', 0xCE: 'I', 0xCF: 'I', 0xD0: 'D',
                        0xD1: 'N', 0xD2: 'O', 0xD3: 'O', 0xD4: 'O', 0xD5: 'O', 0xD6: 'O',
                        0xD8: 'O', 0xD9: 'U', 0xDA: 'U', 0xDB: 'U', 0xDC: 'U',
                        0xDD: 'Y', 0xDE: 'Th', 0xDF: 'ss',
                        0xE0: 'a', 0xE1: 'a', 0xE2: 'a', 0xE3: 'a', 0xE4: 'a', 0xE5: 'a',
                        0xE6: 'ae', 0xE7: 'c', 0xE8: 'e', 0xE9: 'e', 0xEA: 'e', 0xEB: 'e',
                        0xEC: 'i', 0xED: 'i', 0xEE: 'i', 0xEF: 'i', 0xF0: 'd',
                        0xF1: 'n', 0xF2: 'o', 0xF3: 'o', 0xF4: 'o', 0xF5: 'o', 0xF6: 'o',
                        0xF8: 'o', 0xF9: 'u', 0xFA: 'u', 0xFB: 'u', 0xFC: 'u',
                        0xFD: 'y', 0xFE: 'th', 0xFF: 'y'
                    };
                    if (latin[code] !== undefined) r += latin[code];
                    else r += '?';
                } else { r += '?'; }
            }
            return r;
        }

        function renderBlocks(pdfDoc, blocks, pageW, pageH, margin, fonts) {
            var page = pdfDoc.addPage([pageW, pageH]);

            function pickFont(bold, italic) {
                if (bold && italic) return fonts.helveticaBoldOblique;
                if (bold) return fonts.helveticaBold;
                if (italic) return fonts.helveticaOblique;
                return fonts.helvetica;
            }

            for (var i = 0; i < blocks.length; i++) {
                var b = blocks[i];

                if (b.type === 'pageBreak') {
                    page = pdfDoc.addPage([pageW, pageH]);
                    continue;
                }

                if (b.type === 'rect') {
                    var rc = parseColor(b.color);
                    if (rc) {
                        page.drawRectangle({ x: b.x, y: b.y, width: b.width, height: b.height, color: PDFLib.rgb(rc.r, rc.g, rc.b) });
                    }
                    if (b.borderWidth > 0) {
                        var rbc = parseColor(b.borderColor) || { r: 0, g: 0, b: 0 };
                        page.drawRectangle({ x: b.x, y: b.y, width: b.width, height: b.height, borderColor: PDFLib.rgb(rbc.r, rbc.g, rbc.b), borderWidth: b.borderWidth });
                    }
                } else if (b.type === 'tableCellBg') {
                    var tbc = parseColor(b.bgColor);
                    if (tbc) {
                        page.drawRectangle({ x: b.x, y: b.y, width: b.width, height: b.height, color: PDFLib.rgb(tbc.r, tbc.g, tbc.b) });
                    }
                    var bdc = parseColor(b.borderColor);
                    if (bdc) {
                        page.drawRectangle({ x: b.x, y: b.y, width: b.width, height: b.height, borderColor: PDFLib.rgb(bdc.r, bdc.g, bdc.b), borderWidth: 0.5 });
                    }
                } else if (b.type === 'hr') {
                    var hrc = parseColor(b.color) || { r: 0.82, g: 0.84, b: 0.86 };
                    page.drawRectangle({ x: b.x, y: b.y, width: b.width, height: 1, color: PDFLib.rgb(hrc.r, hrc.g, hrc.b) });
                } else if (b.type === 'text') {
                    var tc = parseColor(b.color) || { r: 0.1, g: 0.1, b: 0.1 };
                    var bold = b.fontWeight === 'bold' || b.fontWeight >= 700;
                    var italic = b.fontStyle === 'italic';
                    var font = pickFont(bold, italic);
                    var textStr = normalizeText(b.text || ' ');
                    if (!textStr.trim()) textStr = ' ';
                    try {
                        page.drawText(textStr, { x: b.x, y: b.y, size: b.fontSize, font: font, color: PDFLib.rgb(tc.r, tc.g, tc.b) });
                    } catch (e) {
                        try {
                            page.drawText(textStr.substring(0, 200), { x: b.x, y: b.y, size: b.fontSize, font: fonts.helvetica, color: PDFLib.rgb(tc.r, tc.g, tc.b) });
                        } catch (e2) { }
                    }
                    if (b.textDecoration === 'underline') {
                        var tw = measureTextWidth(b.text, b.fontSize, bold);
                        page.drawRectangle({ x: b.x, y: b.y - 1, width: tw, height: 0.5, color: PDFLib.rgb(tc.r, tc.g, tc.b) });
                    }
                    if (b.textDecoration === 'line-through') {
                        var tw2 = measureTextWidth(b.text, b.fontSize, bold);
                        page.drawRectangle({ x: b.x, y: b.y + b.fontSize * 0.35, width: tw2, height: 0.5, color: PDFLib.rgb(tc.r, tc.g, tc.b) });
                    }
                }
            }
        }

        function init() {
            htmlTextarea.addEventListener('input', function () {
                charCount.textContent = htmlTextarea.value.length + ' characters';
            });
            htmlFileInput.addEventListener('change', handleFileSelect);
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            convertBtn.addEventListener('click', startConversion);
            resetBtn.addEventListener('click', resetTool);
            cancelBtn.addEventListener('click', function () { cancelled = true; });
            newFileBtn.addEventListener('click', resetTool);
        }

        function handleFileSelect(e) { if (e.target.files[0]) loadFile(e.target.files[0]); }
        function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover'); }
        function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragover'); }
        function handleDrop(e) { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); }

        function loadFile(file) {
            var ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'html' && ext !== 'htm') { notify('Please select an HTML file', 'error'); return; }
            var reader = new FileReader();
            reader.onload = function (e) {
                htmlTextarea.value = e.target.result;
                charCount.textContent = htmlTextarea.value.length + ' characters';
                fileName.textContent = file.name;
                fileStatus.textContent = 'Loaded';
                fileInfo.classList.add('show');
                notify('HTML file loaded', 'success');
            };
            reader.readAsText(file);
        }

        async function startConversion() {
            var html = htmlTextarea.value.trim();
            if (!html) { notify('Please enter or upload HTML content', 'error'); return; }
            cancelled = false;
            convertBtn.disabled = true;
            resetBtn.disabled = true;
            progressContainer.classList.add('show');
            progressFill.style.width = '0%';
            progressText.textContent = 'Parsing HTML...';
            progressPercent.textContent = '10%';

            try {
                var pdfDoc = await PDFLib.PDFDocument.create();
                var fonts = {
                    helvetica: await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica),
                    helveticaBold: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold),
                    helveticaOblique: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaOblique),
                    helveticaBoldOblique: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBoldOblique)
                };

                var sizeMap = { a4: [595, 842], letter: [612, 792], a3: [842, 1191] };
                var orientation = orientationSelect.value;
                var marginVal = parseInt(marginsSelect.value, 10);
                var baseSize = sizeMap[pageSizeSelect.value] || [595, 842];
                var pageW = orientation === 'landscape' ? baseSize[1] : baseSize[0];
                var pageH = orientation === 'landscape' ? baseSize[0] : baseSize[1];
                var m = marginVal;

                if (cancelled) { notify('Cancelled', 'error'); return; }

                var cleaned = cleanHtml(html);

                progressPercent.textContent = '30%';
                progressFill.style.width = '30%';
                progressText.textContent = 'Building document tree...';

                var tokens = tokenize(cleaned);
                var tree = buildTree(tokens);

                if (cancelled) { notify('Cancelled', 'error'); return; }

                progressPercent.textContent = '50%';
                progressFill.style.width = '50%';
                progressText.textContent = 'Calculating layout...';

                var blocks = [];
                var ctx = {
                    x: m,
                    y: pageH - m,
                    availWidth: pageW - 2 * m,
                    pageH: pageH,
                    margin: m,
                    blocks: blocks
                };

                var bodyStyle = getStyle(tree);
                layoutInlineChildren(tree.children, ctx, blocks, bodyStyle);

                if (cancelled) { notify('Cancelled', 'error'); return; }

                progressPercent.textContent = '75%';
                progressFill.style.width = '75%';
                progressText.textContent = 'Generating PDF pages...';

                renderBlocks(pdfDoc, blocks, pageW, pageH, m, fonts);

                progressText.textContent = 'Finalizing...';
                progressPercent.textContent = '100%';
                progressFill.style.width = '100%';

                var pdfBytes = await pdfDoc.save();
                var blob = new Blob([pdfBytes], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                downloadBtn.href = url;
                downloadBtn.download = 'document.pdf';

                resultPages.textContent = pdfDoc.getPageCount() + ' page' + (pdfDoc.getPageCount() !== 1 ? 's' : '');
                resultSize.textContent = formatSize(blob.size);
                resultsPanel.classList.add('show');
                progressContainer.classList.remove('show');
                notify('PDF created!', 'success');
            } catch (err) {
                notify('Failed: ' + err.message, 'error');
                progressContainer.classList.remove('show');
            }

            convertBtn.disabled = false;
            resetBtn.disabled = false;
        }

        function resetTool() {
            htmlTextarea.value = '';
            htmlFileInput.value = '';
            cancelled = false;
            fileInfo.classList.remove('show');
            settingsPanel.classList.remove('show');
            resultsPanel.classList.remove('show');
            progressContainer.classList.remove('show');
            charCount.textContent = '0 characters';
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
            setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s ease'; setTimeout(function () { el.remove(); }, 300); }, 3000);
        }

        init();
    });
});
