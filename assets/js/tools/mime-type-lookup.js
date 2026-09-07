/* ============================================
   GO TOOLLY - MIME TYPE LOOKUP v2.0
   Premium reference for MIME content types
   ============================================ */

(function () {
    'use strict';

    /* ============ STATE ============ */
    var state = {
        activeCat: 'all',
        query: '',
        lastResults: []
    };

    /* ============ DOM CACHE ============ */
    var elements = {};

    function cacheDom() {
        elements = {
            searchInput: document.getElementById('mime-search'),
            catFilters: document.getElementById('cat-filters'),
            mimeOutput: document.getElementById('mime-output'),
            resultCount: document.getElementById('result-count'),
            toolStats: document.getElementById('tool-stats'),
            emptyState: document.getElementById('empty-state'),
            resultsPanel: document.getElementById('results-panel'),
            statusBadge: document.getElementById('status-badge'),
            lookupBtn: document.getElementById('lookup-btn'),
            clearBtn: document.getElementById('clear-btn'),
            exportSection: document.getElementById('export-section'),
            exportJson: document.getElementById('export-json'),
            exportTxt: document.getElementById('export-txt'),
            exportCsv: document.getElementById('export-csv'),
            exportPrint: document.getElementById('export-print'),
            exportCopy: document.getElementById('export-copy'),
            srAnnounce: document.getElementById('sr-announce')
        };
    }

    var HERO_GRADIENTS = {
        text: 'linear-gradient(135deg,#3b82f6,#2563eb)',
        image: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
        audio: 'linear-gradient(135deg,#ec4899,#db2777)',
        video: 'linear-gradient(135deg,#f43f5e,#dc2626)',
        application: 'linear-gradient(135deg,#f59e0b,#d97706)',
        font: 'linear-gradient(135deg,#10b981,#059669)'
    };

    var CAT_COLORS = {
        text: '#2563eb',
        image: '#7c3aed',
        audio: '#db2777',
        video: '#dc2626',
        application: '#d97706',
        font: '#059669'
    };

    var CAT_NAMES = {
        text: 'Text',
        image: 'Image',
        audio: 'Audio',
        video: 'Video',
        application: 'Application',
        font: 'Font'
    };

    function setStatus(type, label) {
        var b = elements.statusBadge;
        if (!b) return;
        b.className = 'status-badge' + (type ? ' ' + type : '');
        if (label) b.textContent = label;
    }

    function animateCount(el, target) {
        if (typeof requestAnimationFrame !== 'function') {
            el.textContent = target;
            return;
        }
        var dur = 550;
        var t0 = null;
        function step(ts) {
            if (t0 === null) t0 = ts;
            var p = Math.min((ts - t0) / dur, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ============ UTILS ============ */
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    var toastTimer;
    function showToast(msg, type) {
        var t = document.querySelector('.tool-toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'tool-toast';
            t.setAttribute('role', 'status');
            document.body.appendChild(t);
        }
        t.className = 'tool-toast ' + (type || 'success');
        t.textContent = msg;
        requestAnimationFrame(function () { t.classList.add('show'); });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    function announce(msg) {
        if (elements.srAnnounce) elements.srAnnounce.textContent = msg;
    }

    function copyText(text, okMsg) {
        if (!text) return;
        function done() { showToast(okMsg || 'Copied to clipboard'); }
        function fail() { showToast('Copy failed — select manually', 'error'); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fail);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                done();
            } catch (e) {
                fail();
            }
            document.body.removeChild(ta);
        }
    }

    function downloadFile(filename, content, mime) {
        var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 500);
        showToast('Downloaded ' + filename);
    }

    /* ============ DATA ============ */
    function def(ext, mime, cat, desc, extra) {
        extra = extra || {};
        return {
            ext: ext,
            mime: mime,
            cat: cat,
            desc: desc,
            binary: cat === 'text' ? false : (extra.binary !== undefined ? extra.binary : true),
            iana: extra.iana !== undefined ? extra.iana : true,
            aliases: extra.aliases || [],
            apps: extra.apps || [],
            usage: extra.usage || '',
            security: extra.security || '',
            examples: extra.examples || []
        };
    }

    var MIMES = [
        def('.txt', 'text/plain', 'text', 'Plain text documents with the widest possible compatibility.', { usage: 'Logs, config files, notes, and any human-readable text.', apps: ['Notepad', 'VS Code', 'Sublime Text'], examples: ['README.txt', '.env', '.log'] }),
        def('.html', 'text/html', 'text', 'HyperText Markup Language used for web pages.', { usage: 'The standard content type for web pages and emails.', apps: ['Browsers', 'VS Code'], security: 'Can contain scripts; treat as active content.', examples: ['index.html', 'Emails'] }),
        def('.htm', 'text/html', 'text', 'Legacy filename extension for HTML documents.', { usage: 'Older Windows-era web pages.', examples: ['index.htm'] }),
        def('.css', 'text/css', 'text', 'Cascading Style Sheets used to style HTML documents.', { usage: 'Styling web pages and user interfaces.', apps: ['Browsers', 'Style editors'], examples: ['style.css'] }),
        def('.csv', 'text/csv', 'text', 'Comma-Separated Values for tabular data exchange.', { usage: 'Spreadsheet data, data import/export, machine learning datasets.', apps: ['Excel', 'Google Sheets', 'Numbers'], security: 'Beware CSV formula injection (cells starting with =, +, -).', examples: ['data.csv'] }),
        def('.xml', 'text/xml', 'text', 'Extensible Markup Language for structured data.', { usage: 'RSS feeds, configuration, data interchange (SOAP, XHTML).', apps: ['XML editors', 'Browsers'], examples: ['config.xml', 'sitemap.xml'] }),
        def('.xml', 'application/xml', 'application', 'XML served as an application type with stricter MIME handling.', { usage: 'SOAP services and XML documents consumed by applications.', examples: ['feed.xml'] }),
        def('.js', 'text/javascript', 'text', 'JavaScript source code. Historically also served as application/javascript.', { usage: 'Client-side web scripts and Node.js modules.', apps: ['VS Code', 'Browsers'], security: 'Executable code — only run trusted scripts.', examples: ['app.js', 'main.js'] }),
        def('.mjs', 'text/javascript', 'text', 'ECMAScript modules (ESM) with import/export syntax.', { usage: 'Modern JavaScript modules in browsers and Node.js.', apps: ['VS Code', 'Node.js'], examples: ['module.mjs'] }),
        def('.cjs', 'text/javascript', 'text', 'CommonJS module files for Node.js.', { usage: 'Node.js modules using require()/module.exports.', apps: ['Node.js', 'VS Code'], examples: ['index.cjs'] }),
        def('.jsx', 'text/javascript', 'text', 'JavaScript with embedded XML-like syntax used by React.', { usage: 'React components authored with JSX.', apps: ['VS Code'], examples: ['App.jsx'] }),
        def('.ts', 'text/typescript', 'text', 'TypeScript source — JavaScript with static typing.', { usage: 'Typed web and server applications.', apps: ['VS Code'], examples: ['app.ts'] }),
        def('.tsx', 'text/typescript', 'text', 'TypeScript with JSX syntax for React.', { usage: 'Typed React components.', apps: ['VS Code'], examples: ['Component.tsx'] }),
        def('.md', 'text/markdown', 'text', 'Markdown lightweight markup for formatted plain text.', { usage: 'Documentation, README files, forum posts.', apps: ['VS Code', 'Obsidian', 'GitHub'], examples: ['README.md'] }),
        def('.rtf', 'text/rtf', 'text', 'Rich Text Format with basic formatting from Microsoft.', { usage: 'Cross-platform formatted documents.', apps: ['WordPad', 'Pages'], examples: ['document.rtf'] }),
        def('.vcard', 'text/vcard', 'text', 'vCard contact information exchange format.', { usage: 'Contact cards, QR codes with contact data.', apps: ['Contacts apps'], examples: ['contact.vcf'] }),
        def('.yaml', 'text/yaml', 'text', 'YAML Ain\u2019t Markup Language — human-friendly data serialization.', { usage: 'Config files, CI/CD pipelines, Kubernetes manifests.', apps: ['VS Code', 'GitHub Actions'], examples: ['config.yaml', 'docker-compose.yml'] }),
        def('.yml', 'text/yaml', 'text', 'Shortened extension for YAML documents.', { usage: 'Same as .yaml — common in CI/CD.', examples: ['deploy.yml'] }),
        def('.toml', 'application/toml', 'application', 'Tom\u2019s Obvious Minimal Language — config-focused data format.', { usage: 'Rust Cargo, Python pyproject.toml, Go modules.', apps: ['VS Code'], examples: ['pyproject.toml', 'Cargo.toml'] }),
        def('.json', 'application/json', 'application', 'JavaScript Object Notation for structured data interchange.', { usage: 'APIs, configuration, and web storage.', apps: ['VS Code', 'Postman', 'Browsers'], examples: ['package.json', 'API responses'] }),
        def('.jsonld', 'application/ld+json', 'application', 'JSON for Linked Data — embedded structured data.', { usage: 'Schema.org structured data for SEO.', apps: ['Google Rich Results'], examples: ['JSON-LD markup'] }),
        def('.map', 'application/json', 'application', 'Source map files that link compiled code to original sources.', { usage: 'Debugging minified JavaScript.', apps: ['DevTools'], examples: ['app.js.map'] }),
        def('.pdf', 'application/pdf', 'application', 'Portable Document Format for fixed-layout documents.', { usage: 'Print-ready documents, forms, invoices, reports.', apps: ['Acrobat Reader', 'Browsers'], security: 'PDFs can contain JavaScript and exploits; scan untrusted files.', examples: ['report.pdf'] }),
        def('.zip', 'application/zip', 'application', 'ZIP archive format for compressed file collections.', { usage: 'Software distribution, backups, bundling assets.', apps: ['7-Zip', 'WinRAR', 'Windows Explorer'], examples: ['bundle.zip'] }),
        def('.gz', 'application/gzip', 'application', 'gzip-compressed single file.', { usage: 'Compressed HTTP responses, Linux packages, logs.', apps: ['7-Zip', 'gzip'], examples: ['file.gz', 'Content-Encoding: gzip'] }),
        def('.tar', 'application/x-tar', 'application', 'Tape Archive — uncompressed archive bundling files.', { usage: 'Linux source distributions (often paired with gzip).', apps: ['7-Zip', 'tar'], examples: ['archive.tar'] }),
        def('.7z', 'application/x-7z-compressed', 'application', '7-Zip high-ratio compression archive.', { usage: 'High-compression file distribution.', apps: ['7-Zip'], examples: ['package.7z'] }),
        def('.rar', 'application/vnd.rar', 'application', 'RAR archive with proprietary compression.', { usage: 'File sharing and multi-volume archives.', apps: ['WinRAR', '7-Zip'], examples: ['archive.rar'] }),
        def('.bz2', 'application/x-bzip2', 'application', 'bzip2-compressed file with strong compression.', { usage: 'Linux source tarballs, scientific data.', apps: ['7-Zip'], examples: ['file.tar.bz2'] }),
        def('.xz', 'application/x-xz', 'application', 'XZ-compressed file (LZMA2).', { usage: 'Linux package archives (.tar.xz).', apps: ['7-Zip'], examples: ['file.tar.xz'] }),
        def('.iso', 'application/x-iso9660-image', 'application', 'ISO disc image of optical media.', { usage: 'OS installation discs, backups.', apps: ['Windows Explorer', 'PowerISO'], examples: ['ubuntu.iso'] }),
        def('.img', 'application/x-raw-disk-image', 'application', 'Raw disk image.', { usage: 'Disk imaging and VM images.', apps: ['Win32DiskImager'], examples: ['disk.img'] }),
        def('.cab', 'application/vnd.ms-cab-compressed', 'application', 'Microsoft Cabinet archive.', { usage: 'Windows installer payloads and driver packages.', apps: ['Windows'], examples: ['setup.cab'] }),
        def('.doc', 'application/msword', 'application', 'Microsoft Word document (legacy binary format).', { usage: 'Word-processed documents.', apps: ['Word', 'LibreOffice'], security: 'May contain macros; scan untrusted .doc files.', examples: ['letter.doc'] }),
        def('.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application', 'Office Open XML Word document (ZIP-based).', { usage: 'Modern Word documents, resumes, reports.', apps: ['Word', 'Google Docs', 'LibreOffice'], examples: ['report.docx'] }),
        def('.docm', 'application/vnd.ms-word.document.macroenabled.12', 'application', 'Word document that can contain macros.', { usage: 'Macro-enabled Word templates and documents.', security: 'Macros can execute code — enable only from trusted sources.', examples: ['template.docm'] }),
        def('.xls', 'application/vnd.ms-excel', 'application', 'Microsoft Excel spreadsheet (legacy binary format).', { usage: 'Spreadsheets, data tables.', apps: ['Excel', 'LibreOffice'], examples: ['budget.xls'] }),
        def('.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application', 'Office Open XML Excel spreadsheet.', { usage: 'Modern spreadsheets, data analysis.', apps: ['Excel', 'Google Sheets'], examples: ['data.xlsx'] }),
        def('.xlsm', 'application/vnd.ms-excel.sheet.macroenabled.12', 'application', 'Excel spreadsheet that can contain macros.', { usage: 'Macro-enabled Excel workbooks.', security: 'Macros can execute code — enable only from trusted sources.', examples: ['automation.xlsm'] }),
        def('.ppt', 'application/vnd.ms-powerpoint', 'application', 'Microsoft PowerPoint presentation (legacy binary format).', { usage: 'Slide presentations.', apps: ['PowerPoint', 'LibreOffice'], examples: ['deck.ppt'] }),
        def('.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application', 'Office Open XML PowerPoint presentation.', { usage: 'Modern slide decks.', apps: ['PowerPoint', 'Google Slides'], examples: ['slides.pptx'] }),
        def('.pptm', 'application/vnd.ms-powerpoint.presentation.macroenabled.12', 'application', 'PowerPoint presentation that can contain macros.', { usage: 'Macro-enabled presentations.', security: 'Macros can execute code — enable only from trusted sources.', examples: ['deck.pptm'] }),
        def('.odt', 'application/vnd.oasis.opendocument.text', 'application', 'OpenDocument Text.', { usage: 'Open-standard word processing.', apps: ['LibreOffice', 'Word'], examples: ['doc.odt'] }),
        def('.ods', 'application/vnd.oasis.opendocument.spreadsheet', 'application', 'OpenDocument Spreadsheet.', { usage: 'Open-standard spreadsheets.', apps: ['LibreOffice', 'Excel'], examples: ['data.ods'] }),
        def('.odp', 'application/vnd.oasis.opendocument.presentation', 'application', 'OpenDocument Presentation.', { usage: 'Open-standard slide decks.', apps: ['LibreOffice'], examples: ['deck.odp'] }),
        def('.odg', 'application/vnd.oasis.opendocument.graphics', 'application', 'OpenDocument Graphics.', { usage: 'Open-standard vector drawings.', apps: ['LibreOffice Draw'], examples: ['drawing.odg'] }),
        def('.epub', 'application/epub+zip', 'application', 'EPUB e-book format.', { usage: 'E-books for readers and tablets.', apps: ['Apple Books', 'Calibre'], examples: ['book.epub'] }),
        def('.wasm', 'application/wasm', 'application', 'WebAssembly binary module.', { usage: 'High-performance web application code.', apps: ['Browsers'], security: 'Executable binary — only load trusted modules.', examples: ['module.wasm'] }),
        def('.sh', 'application/x-sh', 'application', 'Shell script.', { usage: 'Bash and Unix automation scripts.', apps: ['Terminal', 'VS Code'], security: 'Executes commands — review before running.', examples: ['install.sh'] }),
        def('.php', 'application/x-httpd-php', 'application', 'PHP source code.', { usage: 'Server-side web applications.', apps: ['VS Code'], examples: ['index.php'] }),
        def('.jar', 'application/java-archive', 'application', 'Java ARchive of classes and resources.', { usage: 'Java applications and libraries.', apps: ['Java Runtime'], examples: ['app.jar'] }),
        def('.war', 'application/java-archive', 'application', 'Web Application ARchive for Java web apps.', { usage: 'Deployable Java web applications.', apps: ['Tomcat'], examples: ['webapp.war'] }),
        def('.soap', 'application/soap+xml', 'application', 'SOAP web service messages (XML).', { usage: 'SOAP API request/response envelopes.', apps: ['SOAP clients'], examples: ['SOAP envelope'] }),
        def('.graphql', 'application/graphql', 'application', 'GraphQL query documents.', { usage: 'GraphQL API queries and mutations.', apps: ['GraphiQL'], examples: ['query.graphql'] }),
        def('.bin', 'application/octet-stream', 'application', 'Generic binary data; the catch-all MIME type.', { usage: 'Unknown binaries, downloads, firmware.', apps: ['Any'], security: 'Never open unknown binary files.', examples: ['firmware.bin', 'Download fallback'] }),
        def('.exe', 'application/vnd.microsoft.portable-executable', 'application', 'Windows executable (PE format).', { usage: 'Windows applications and installers.', security: 'Can run arbitrary code — highest risk file type.', examples: ['setup.exe'] }),
        def('.dll', 'application/vnd.microsoft.portable-executable', 'application', 'Windows dynamic-link library.', { usage: 'Shared Windows code libraries.', security: 'Can execute code when loaded.', examples: ['lib.dll'] }),
        def('.msi', 'application/x-msdownload', 'application', 'Windows Installer package.', { usage: 'Windows software installation.', security: 'Installs software — run only trusted packages.', examples: ['setup.msi'] }),
        def('.apk', 'application/vnd.android.package-archive', 'application', 'Android application package.', { usage: 'Android apps sideloaded from APK files.', security: 'Can request dangerous permissions — install from trusted sources.', examples: ['app.apk'] }),
        def('.dmg', 'application/x-apple-diskimage', 'application', 'Apple macOS disk image.', { usage: 'macOS application distribution.', security: 'Mounts as a volume — scan before opening.', examples: ['app.dmg'] }),
        def('.deb', 'application/vnd.debian.binary-package', 'application', 'Debian/Ubuntu software package.', { usage: 'Linux package installation (dpkg/apt).', apps: ['APT'], examples: ['package.deb'] }),
        def('.rpm', 'application/x-rpm', 'application', 'Red Hat package manager package.', { usage: 'RHEL/Fedora Linux package installation.', apps: ['dnf/yum'], examples: ['package.rpm'] }),
        def('.sql', 'application/sql', 'application', 'Structured Query Language scripts.', { usage: 'Database schemas, queries, migrations.', apps: ['MySQL Workbench', 'psql'], examples: ['schema.sql'] }),
        def('.ics', 'text/calendar', 'text', 'iCalendar event and calendar data.', { usage: 'Calendar events, meeting invitations.', apps: ['Calendar apps'], examples: ['event.ics', 'Outlook invites'] }),
        def('.vtt', 'text/vtt', 'text', 'Web Video Text Tracks for captions and subtitles.', { usage: 'HTML5 video subtitles.', apps: ['Browsers'], examples: ['captions.vtt'] }),
        def('.srt', 'application/x-subrip', 'application', 'SubRip subtitle format.', { usage: 'Movie and video subtitles.', apps: ['VLC', 'video editors'], examples: ['movie.srt'] }),
        def('.form-data', 'multipart/form-data', 'application', 'Multipart form encoding for file uploads.', { usage: 'HTML forms that upload files.', examples: ['HTML file inputs'] }),
        def('.xhtml', 'application/xhtml+xml', 'application', 'XML-serialized XHTML documents.', { usage: 'Strict XML-compliant web documents.', apps: ['Browsers'], examples: ['page.xhtml'] }),
        def('.manifest', 'text/cache-manifest', 'text', 'HTML5 app cache manifest (deprecated).', { usage: 'Legacy offline web app caching.', examples: ['app.manifest'] }),
        def('.xsl', 'application/xslt+xml', 'application', 'XSL Transformations stylesheet.', { usage: 'Transforming XML documents.', apps: ['XML tools'], examples: ['transform.xsl'] }),
        def('.xslt', 'application/xslt+xml', 'application', 'XSLT stylesheet (long form).', { usage: 'XML-to-HTML/XML conversion.', examples: ['style.xslt'] }),
        def('.rss', 'application/rss+xml', 'application', 'RSS feed for syndicated content.', { usage: 'Blog and news feed subscriptions.', apps: ['Feed readers'], examples: ['feed.rss'] }),
        def('.atom', 'application/atom+xml', 'application', 'Atom feed for syndicated content.', { usage: 'Blog and software feed subscriptions.', apps: ['Feed readers'], examples: ['feed.atom'] }),
        def('.opml', 'application/xml', 'application', 'OPML outline format for feed lists.', { usage: 'Importing/exporting podcast and blog subscriptions.', apps: ['Podcast apps'], examples: ['subscriptions.opml'] }),
        def('.kml', 'application/vnd.google-earth.kml+xml', 'application', 'Keyhole Markup Language for geographic data.', { usage: 'Google Earth and GIS overlays.', apps: ['Google Earth'], examples: ['places.kml'] }),
        def('.gpx', 'application/gpx+xml', 'application', 'GPS Exchange Format for tracks and waypoints.', { usage: 'GPS data exchange between devices.', apps: ['Strava', 'Garmin'], examples: ['route.gpx'] }),
        def('.svg', 'image/svg+xml', 'image', 'Scalable Vector Graphics — resolution-independent vector images.', { usage: 'Icons, logos, illustrations on the web.', apps: ['Figma', 'Illustrator', 'Browsers'], binary: false, security: 'SVG can contain scripts — sanitize user-uploaded SVG.', examples: ['logo.svg'] }),
        def('.png', 'image/png', 'image', 'Portable Network Graphics with lossless compression and alpha transparency.', { usage: 'Web images, icons, screenshots.', apps: ['Photoshop', 'Browsers'], examples: ['logo.png'] }),
        def('.jpg', 'image/jpeg', 'image', 'Joint Photographic Experts Group — lossy compression for photos.', { usage: 'Photographs and web images.', apps: ['Photoshop', 'Browsers'], examples: ['photo.jpg'] }),
        def('.jpeg', 'image/jpeg', 'image', 'Long-form extension for JPEG images.', { usage: 'Same as .jpg.', examples: ['photo.jpeg'] }),
        def('.jfif', 'image/jpeg', 'image', 'JPEG File Interchange Format.', { usage: 'Legacy camera JPEGs.', examples: ['camera.jfif'] }),
        def('.gif', 'image/gif', 'image', 'Graphics Interchange Format — supports animation, limited to 256 colors.', { usage: 'Simple animations and memes.', apps: ['Browsers'], examples: ['anim.gif'] }),
        def('.webp', 'image/webp', 'image', 'WebP image with both lossy and lossless compression plus animation.', { usage: 'Modern, smaller web images.', apps: ['Browsers', 'Photoshop'], examples: ['hero.webp'] }),
        def('.avif', 'image/avif', 'image', 'AV1 Image File Format with excellent compression.', { usage: 'Next-generation web images.', apps: ['Browsers'], examples: ['photo.avif'] }),
        def('.apng', 'image/apng', 'image', 'Animated Portable Network Graphics.', { usage: 'High-quality animated images.', apps: ['Browsers'], examples: ['anim.apng'] }),
        def('.ico', 'image/x-icon', 'image', 'Windows icon / favicon format.', { usage: 'Browser favicons.', apps: ['Browsers'], examples: ['favicon.ico'] }),
        def('.bmp', 'image/bmp', 'image', 'Bitmap image with uncompressed pixel data.', { usage: 'Legacy graphics and Windows wallpapers.', apps: ['Paint'], examples: ['image.bmp'] }),
        def('.tiff', 'image/tiff', 'image', 'Tagged Image File Format — high-quality, often uncompressed.', { usage: 'Print, publishing, and professional photography.', apps: ['Photoshop'], examples: ['scan.tiff'] }),
        def('.tif', 'image/tiff', 'image', 'Short extension for TIFF files.', { usage: 'Same as .tiff.', examples: ['scan.tif'] }),
        def('.heic', 'image/heic', 'image', 'High Efficiency Image Format (HEIF/HEVC) used by Apple devices.', { usage: 'iPhone/iPad photos and screenshots.', apps: ['Photos', 'Preview'], examples: ['IMG_0001.heic'] }),
        def('.heif', 'image/heif', 'image', 'High Efficiency Image Format container.', { usage: 'Modern compressed images (AVIF is the web variant).', apps: ['Photos'], examples: ['photo.heif'] }),
        def('.jxl', 'image/jxl', 'image', 'JPEG XL next-generation image codec.', { usage: 'High-quality compression successor to JPEG.', apps: ['Browsers (experimental)'], examples: ['photo.jxl'] }),
        def('.psd', 'image/vnd.adobe.photoshop', 'image', 'Adobe Photoshop layered document.', { usage: 'Design source files with layers and masks.', apps: ['Photoshop'], examples: ['design.psd'] }),
        def('.psb', 'image/vnd.adobe.photoshop', 'image', 'Adobe Photoshop large-format document (2GB+).', { usage: 'Very large Photoshop documents.', apps: ['Photoshop'], examples: ['huge.psb'] }),
        def('.xcf', 'image/x-xcf', 'image', 'GIMP native layered document.', { usage: 'GIMP design source files.', apps: ['GIMP'], examples: ['art.xcf'] }),
        def('.ai', 'application/postscript', 'image', 'Adobe Illustrator vector document.', { usage: 'Vector design source files.', apps: ['Illustrator'], examples: ['logo.ai'] }),
        def('.eps', 'application/postscript', 'image', 'Encapsulated PostScript vector graphics.', { usage: 'Print-ready vector graphics.', apps: ['Illustrator', 'Inkscape'], examples: ['art.eps'] }),
        def('.emf', 'image/emf', 'image', 'Enhanced Metafile vector graphics (Windows).', { usage: 'Windows clipboard and Office graphics.', apps: ['Word', 'Paint'], examples: ['chart.emf'] }),
        def('.wmf', 'image/wmf', 'image', 'Windows Metafile vector graphics.', { usage: 'Legacy Windows graphics.', apps: ['Word'], examples: ['logo.wmf'] }),
        def('.tga', 'image/x-tga', 'image', 'Targa image format.', { usage: 'Game textures and video production.', apps: ['Photo editors'], examples: ['texture.tga'] }),
        def('.exr', 'image/x-exr', 'image', 'OpenEXR high dynamic range image.', { usage: 'HDR film and VFX pipelines.', apps: ['Nuke', 'Blender'], examples: ['hdr.exr'] }),
        def('.hdr', 'image/vnd.radiance', 'image', 'Radiance HDR image.', { usage: 'High dynamic range lighting data.', apps: ['3D tools'], examples: ['lightprobe.hdr'] }),
        def('.cr2', 'image/x-canon-cr2', 'image', 'Canon RAW photo.', { usage: 'Unprocessed Canon camera photos.', apps: ['Lightroom', 'Camera Raw'], examples: ['IMG_0001.CR2'] }),
        def('.nef', 'image/x-nikon-nef', 'image', 'Nikon RAW photo.', { usage: 'Unprocessed Nikon camera photos.', apps: ['Lightroom', 'Capture NX'], examples: ['DSC_0001.NEF'] }),
        def('.arw', 'image/x-sony-arw', 'image', 'Sony RAW photo.', { usage: 'Unprocessed Sony camera photos.', apps: ['Lightroom'], examples: ['DSC00001.ARW'] }),
        def('.dng', 'image/x-adobe-dng', 'image', 'Adobe Digital Negative — open RAW format.', { usage: 'Universal RAW photo archival.', apps: ['Lightroom'], examples: ['photo.dng'] }),
        def('.mp3', 'audio/mpeg', 'audio', 'MPEG-1/2 Audio Layer 3 — ubiquitous compressed audio.', { usage: 'Music, podcasts, streaming.', apps: ['Music players', 'Browsers'], examples: ['song.mp3'] }),
        def('.wav', 'audio/wav', 'audio', 'Waveform Audio File Format — uncompressed PCM audio.', { usage: 'Professional audio, sound design, recordings.', apps: ['Audacity', 'DAWs'], examples: ['recording.wav'] }),
        def('.ogg', 'audio/ogg', 'audio', 'Ogg container with Vorbis audio.', { usage: 'Open-format streaming audio.', apps: ['VLC', 'Browsers'], examples: ['track.ogg'] }),
        def('.oga', 'audio/ogg', 'audio', 'Ogg audio file.', { usage: 'Open-format audio.', examples: ['track.oga'] }),
        def('.opus', 'audio/opus', 'audio', 'Opus low-latency audio codec.', { usage: 'Voice calls and web audio streaming.', apps: ['Browsers', 'Discord'], examples: ['call.opus'] }),
        def('.flac', 'audio/flac', 'audio', 'Free Lossless Audio Codec.', { usage: 'Lossless music archival.', apps: ['Music players'], examples: ['album.flac'] }),
        def('.aac', 'audio/aac', 'audio', 'Advanced Audio Coding.', { usage: 'Streaming audio and iTunes music.', apps: ['Music players'], examples: ['track.aac'] }),
        def('.m4a', 'audio/mp4', 'audio', 'MPEG-4 audio (AAC).', { usage: 'Apple audio files.', apps: ['Apple Music'], examples: ['track.m4a'] }),
        def('.wma', 'audio/x-ms-wma', 'audio', 'Windows Media Audio.', { usage: 'Legacy Windows audio.', apps: ['Windows Media Player'], examples: ['track.wma'] }),
        def('.mid', 'audio/midi', 'audio', 'MIDI instrument note data.', { usage: 'Music notation and electronic instruments.', apps: ['DAWs'], examples: ['song.mid'] }),
        def('.midi', 'audio/midi', 'audio', 'MIDI file (long form).', { usage: 'Same as .mid.', examples: ['song.midi'] }),
        def('.weba', 'audio/webm', 'audio', 'WebM audio.', { usage: 'Open web audio format.', apps: ['Browsers'], examples: ['track.weba'] }),
        def('.mp4', 'video/mp4', 'video', 'MPEG-4 video container (H.264/H.265).', { usage: 'Universal web and mobile video.', apps: ['Browsers', 'VLC'], examples: ['movie.mp4'] }),
        def('.m4v', 'video/mp4', 'video', 'MPEG-4 video optimized for Apple.', { usage: 'iTunes/Apple TV video.', apps: ['Apple TV'], examples: ['movie.m4v'] }),
        def('.webm', 'video/webm', 'video', 'WebM open video format (VP8/VP9/AV1).', { usage: 'HTML5 web video.', apps: ['Browsers', 'YouTube'], examples: ['clip.webm'] }),
        def('.ogv', 'video/ogg', 'video', 'Ogg video.', { usage: 'Open-format video.', apps: ['VLC'], examples: ['clip.ogv'] }),
        def('.avi', 'video/x-msvideo', 'video', 'Audio Video Interleave — legacy Windows video.', { usage: 'Older video files and camcorders.', apps: ['VLC'], examples: ['clip.avi'] }),
        def('.mov', 'video/quicktime', 'video', 'Apple QuickTime movie.', { usage: 'ProRes and Apple ecosystem video.', apps: ['QuickTime', 'Final Cut'], examples: ['movie.mov'] }),
        def('.wmv', 'video/x-ms-wmv', 'video', 'Windows Media Video.', { usage: 'Legacy Windows video.', apps: ['Windows Media Player'], examples: ['clip.wmv'] }),
        def('.flv', 'video/x-flv', 'video', 'Flash Video.', { usage: 'Legacy Flash streaming.', apps: ['VLC'], examples: ['clip.flv'] }),
        def('.mkv', 'video/x-matroska', 'video', 'Matroska video container.', { usage: 'High-quality rips with multiple tracks.', apps: ['VLC'], examples: ['movie.mkv'] }),
        def('.m2ts', 'video/mp2t', 'video', 'MPEG-2 transport stream for Blu-ray.', { usage: 'Blu-ray and broadcast video.', apps: ['VLC'], examples: ['movie.m2ts'] }),
        def('.3gp', 'video/3gpp', 'video', '3GPP mobile video.', { usage: 'Mobile phone recordings.', apps: ['Phones'], examples: ['clip.3gp'] }),
        def('.ts', 'video/mp2t', 'video', 'MPEG transport stream.', { usage: 'Streaming segments and broadcast.', apps: ['VLC'], examples: ['segment.ts'] }),
        def('.m3u8', 'application/x-mpegURL', 'video', 'HLS playlist referencing video segments.', { usage: 'HTTP Live Streaming playlists.', apps: ['Browsers', 'VLC'], examples: ['stream.m3u8'] }),
        def('.woff', 'font/woff', 'font', 'Web Open Font Format.', { usage: 'Web fonts (older).', apps: ['Browsers'], examples: ['font.woff'] }),
        def('.woff2', 'font/woff2', 'font', 'Web Open Font Format 2 — smaller web fonts.', { usage: 'Modern web fonts.', apps: ['Browsers'], examples: ['font.woff2'] }),
        def('.ttf', 'font/ttf', 'font', 'TrueType Font.', { usage: 'Desktop and web fonts.', apps: ['OS Font Books', 'Browsers'], examples: ['font.ttf'] }),
        def('.otf', 'font/otf', 'font', 'OpenType Font.', { usage: 'Desktop and web fonts with advanced features.', apps: ['OS Font Books'], examples: ['font.otf'] }),
        def('.eot', 'application/vnd.ms-fontobject', 'font', 'Embedded OpenType font (IE).', { usage: 'Legacy Internet Explorer web fonts.', apps: ['IE'], examples: ['font.eot'] }),
        def('.gltf', 'model/gltf+json', 'application', 'glTF 3D model (JSON).', { usage: '3D content for web and AR/VR.', apps: ['Blender', 'Three.js'], examples: ['scene.gltf'] }),
        def('.glb', 'model/gltf-binary', 'application', 'glTF binary 3D model.', { usage: 'Compiled 3D assets for web.', apps: ['Blender', 'Three.js'], examples: ['scene.glb'] }),
        def('.usdz', 'model/vnd.usdz+zip', 'application', 'Universal Scene Description (Apple AR).', { usage: 'AR Quick Look 3D assets.', apps: ['Xcode'], examples: ['chair.usdz'] }),
        def('.stl', 'model/stl', 'application', 'STL mesh for 3D printing.', { usage: '3D printing models.', apps: ['Cura', 'PrusaSlicer'], examples: ['part.stl'] }),
        def('.obj', 'model/obj', 'application', 'Wavefront OBJ 3D model.', { usage: 'Exchange 3D geometry.', apps: ['Blender', 'MeshLab'], examples: ['model.obj'] }),
        def('.fbx', 'application/octet-stream', 'application', 'Autodesk FBX 3D exchange format.', { usage: '3D animation and game assets.', apps: ['Blender', 'Unity'], examples: ['asset.fbx'] }),
        def('.step', 'application/step', 'application', 'STEP CAD exchange format.', { usage: 'CAD model interchange.', apps: ['CAD tools'], examples: ['part.step'] }),
        def('.iges', 'model/iges', 'application', 'IGES CAD exchange format.', { usage: 'Legacy CAD data exchange.', apps: ['CAD tools'], examples: ['part.iges'] }),
        def('.tsv', 'text/tab-separated-values', 'text', 'Tab-Separated Values.', { usage: 'Tabular data exchange.', apps: ['Excel', 'Google Sheets'], examples: ['data.tsv'] }),
        def('.sass', 'text/x-sass', 'text', 'Sass preprocessor stylesheet (indented syntax).', { usage: 'Preprocessed CSS authoring.', apps: ['VS Code'], examples: ['style.sass'] }),
        def('.scss', 'text/x-scss', 'text', 'SCSS preprocessor stylesheet.', { usage: 'Preprocessed CSS with variables and nesting.', apps: ['VS Code'], examples: ['style.scss'] }),
        def('.less', 'text/less', 'text', 'LESS preprocessor stylesheet.', { usage: 'Preprocessed CSS.', apps: ['VS Code'], examples: ['style.less'] })
    ];

    var CATEGORIES = [
        { id: 'all', label: 'All' },
        { id: 'text', label: 'Text' },
        { id: 'image', label: 'Image' },
        { id: 'audio', label: 'Audio' },
        { id: 'video', label: 'Video' },
        { id: 'application', label: 'Application' },
        { id: 'font', label: 'Font' }
    ];

    var CAT_BADGE = {
        text: 'cat-text',
        image: 'cat-image',
        audio: 'cat-audio',
        video: 'cat-video',
        application: 'cat-application',
        font: 'cat-font'
    };

    /* ============ ANALYSIS ============ */
    function normalizeToken(v) {
        return String(v).toLowerCase().replace(/[^a-z0-9+#.\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function matchesMime(m, q) {
        if (!q) return true;
        var hay = normalizeToken(m.ext + ' ' + m.mime + ' ' + m.cat + ' ' + m.desc + ' ' + m.usage + ' ' + m.security + ' ' + (m.aliases || []).join(' ') + ' ' + (m.apps || []).join(' ') + ' ' + (m.examples || []).join(' '));
        var tokens = q.split(/\s+/);
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i] && hay.indexOf(tokens[i]) === -1) return false;
        }
        return true;
    }

    function filterMimes() {
        var q = normalizeToken(state.query);
        var cat = state.activeCat;
        return MIMES.filter(function (m) {
            if (cat !== 'all' && m.cat !== cat) return false;
            return matchesMime(m, q);
        });
    }

    /* ============ STATS ============ */
    function renderStats(filtered) {
        if (!elements.toolStats) return;
        var counts = { text: 0, image: 0, audio: 0, video: 0, application: 0, font: 0 };
        filtered.forEach(function (m) { counts[m.cat] = (counts[m.cat] || 0) + 1; });
        var binaryCount = filtered.filter(function (m) { return m.binary; }).length;
        var html = '';
        html += '<span class="stats-chip"><strong data-count="' + filtered.length + '">0</strong> of ' + MIMES.length + ' types</span>';
        html += '<span class="stats-chip"><strong data-count="' + (filtered.length - binaryCount) + '">0</strong> text</span>';
        html += '<span class="stats-chip"><strong data-count="' + binaryCount + '">0</strong> binary</span>';
        CATEGORIES.forEach(function (c) {
            if (c.id === 'all') return;
            if (state.activeCat === 'all' || state.activeCat === c.id) {
                html += '<span class="stats-chip" style="cursor:pointer" data-stats-cat="' + c.id + '" title="Filter by ' + c.label + '"><span class="dot" style="background:' + CAT_COLORS[c.id] + '"></span>' + c.label + ': <strong data-count="' + (counts[c.id] || 0) + '">0</strong></span>';
            }
        });
        elements.toolStats.innerHTML = html;
        var counters = elements.toolStats.querySelectorAll('[data-count]');
        for (var i = 0; i < counters.length; i++) {
            animateCount(counters[i], parseInt(counters[i].getAttribute('data-count'), 10));
        }
    }

    function onStatsClick(e) {
        var chip = e.target.closest('[data-stats-cat]');
        if (!chip) return;
        state.activeCat = chip.getAttribute('data-stats-cat');
        renderFilters();
        render();
    }

    /* ============ RENDERING ============ */
    function renderFilters() {
        if (!elements.catFilters) return;
        elements.catFilters.innerHTML = CATEGORIES.map(function (c) {
            var count = c.id === 'all' ? MIMES.length : MIMES.filter(function (m) { return m.cat === c.id; }).length;
            var active = state.activeCat === c.id ? ' active' : '';
            return '<button class="cat-btn' + active + '" data-cat="' + c.id + '" aria-pressed="' + (state.activeCat === c.id) + '">' + c.label + ' <span class="cat-count">' + count + '</span></button>';
        }).join('');
    }

    function fieldRow(label, value, copyValue) {
        if (!value) return '';
        return '<div class="field-row"><span class="field-label">' + label + '</span><span class="field-value">' + escapeHtml(value) +
            (copyValue ? ' <button type="button" class="mini-copy" data-copy="' + escapeHtml(copyValue) + '" aria-label="Copy ' + label + '" title="Copy ' + label + '"><i class="fas fa-copy" aria-hidden="true"></i></button>' : '') +
            '</span></div>';
    }

    function renderEmpty() {
        return '<div class="no-results" role="status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><h4>No MIME types found</h4><p>Try a different extension such as <em>.pdf</em>, <em>.png</em>, or a type like <em>application/json</em>.</p></div>';
    }

    function renderHero(m) {
        var icon;
        switch (m.cat) {
            case 'text':
                icon = '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>';
                break;
            case 'image':
                icon = '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>';
                break;
            case 'audio':
                icon = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/>';
                break;
            case 'video':
                icon = '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>';
                break;
            case 'font':
                icon = '<path d="M4 7V4h16v3"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>';
                break;
            default:
                icon = '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>';
        }
        var html = '';
        html += '<div class="status-hero" aria-label="' + escapeHtml(m.ext) + ' ' + escapeHtml(m.mime) + '" style="background:' + (HERO_GRADIENTS[m.cat] || 'linear-gradient(135deg,#64748b,#334155)') + '">';
        html += '<div class="sh-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg></div>';
        html += '<div class="sh-code">' + escapeHtml(m.mime) + '</div>';
        html += '<div class="sh-info">';
        html += '<p class="sh-name">' + escapeHtml(m.ext) + ' &middot; ' + CAT_NAMES[m.cat] + '</p>';
        html += '<p class="sh-desc">' + escapeHtml(m.desc) + '</p>';
        html += '<div class="sh-badges">';
        html += '<span class="sh-badge">' + CAT_NAMES[m.cat] + '</span>';
        html += '<span class="sh-badge">' + (m.iana ? 'IANA registered' : 'Vendor type') + '</span>';
        html += '<span class="sh-badge">' + (m.binary ? 'Binary' : 'Text') + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<button type="button" class="sh-copy" data-copy="' + escapeHtml(m.mime) + '" aria-label="Copy MIME type" title="Copy MIME type"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>';
        html += '</div>';
        return html;
    }

    function renderCard(m) {
        var color = CAT_COLORS[m.cat];
        var html = '';
        html += '<div class="mime-card" style="--cat-color:' + color + '" tabindex="0" data-mime="' + escapeHtml(m.mime) + '" role="button" aria-label="' + escapeHtml(m.ext) + ' ' + escapeHtml(m.mime) + '. Press Ctrl+C to copy the MIME type.">';
        html += '<div class="mime-card-top">';
        html += '<span class="mime-ext">' + escapeHtml(m.ext) +
            ' <button type="button" class="mini-copy" data-copy="' + escapeHtml(m.ext) + '" aria-label="Copy extension ' + escapeHtml(m.ext) + '" title="Copy extension"><i class="fas fa-copy" aria-hidden="true"></i></button></span>';
        html += '<span class="mime-cat-badge ' + CAT_BADGE[m.cat] + '">' + CAT_NAMES[m.cat] + '</span>';
        html += '</div>';
        html += '<div class="mime-type-val">' + escapeHtml(m.mime) +
            ' <button type="button" class="mini-copy" data-copy="' + escapeHtml(m.mime) + '" aria-label="Copy MIME type" title="Copy MIME type"><i class="fas fa-copy" aria-hidden="true"></i></button></div>';
        html += '<div class="mime-desc">' + escapeHtml(m.desc) + '</div>';
        html += '<div class="meta-badges">';
        html += m.binary
            ? '<span class="badge-chip badge-neutral"><i class="fas fa-file" aria-hidden="true"></i> Binary</span>'
            : '<span class="badge-chip badge-yes"><i class="fas fa-font" aria-hidden="true"></i> Text</span>';
        html += m.iana
            ? '<span class="badge-chip badge-yes"><i class="fas fa-check" aria-hidden="true"></i> IANA</span>'
            : '<span class="badge-chip badge-neutral"><i class="fas fa-question" aria-hidden="true"></i> Vendor</span>';
        html += '</div>';
        html += fieldRow('Usage', m.usage);
        html += fieldRow('Security', m.security);
        if (m.aliases && m.aliases.length) {
            html += '<div class="alias-row"><span class="field-label">Aliases</span><div class="alias-tags">' + m.aliases.map(function (a) {
                return '<span class="example-tag" data-copy="' + escapeHtml(a) + '" title="Click to copy">' + escapeHtml(a) + '</span>';
            }).join('') + '</div></div>';
        }
        if (m.apps && m.apps.length) {
            html += '<div class="field-row"><span class="field-label">Apps</span><span class="field-value">' + m.apps.map(function (a) { return escapeHtml(a); }).join(', ') + '</span></div>';
        }
        html += '<details>';
        html += '<summary>Details &amp; guidance</summary>';
        html += '<div class="detail-grid">';
        html += '<div class="detail-cell"><span class="detail-label">Type</span><span class="detail-value">' + (m.binary ? 'Binary' : 'Text') + '</span></div>';
        html += '<div class="detail-cell"><span class="detail-label">IANA</span><span class="detail-value">' + (m.iana ? 'Registered' : 'Vendor') + '</span></div>';
        html += '<div class="detail-cell"><span class="detail-label">Category</span><span class="detail-value">' + CAT_NAMES[m.cat] + '</span></div>';
        html += '<div class="detail-cell"><span class="detail-label">Common uses</span><span class="detail-value">' + escapeHtml(m.usage || '—') + '</span></div>';
        html += '</div>';
        html += '</details>';
        if (m.examples && m.examples.length) {
            html += '<div class="example-tags">' + m.examples.map(function (ex) {
                return '<span class="example-tag" data-copy="' + escapeHtml(ex) + '">' + escapeHtml(ex) + '</span>';
            }).join('') + '</div>';
        }
        html += '</div>';
        return html;
    }

    function render() {
        var searching = state.query !== '' || state.activeCat !== 'all';
        if (!searching) {
            if (elements.emptyState) elements.emptyState.style.display = '';
            if (elements.resultsPanel) elements.resultsPanel.classList.remove('show');
            if (elements.mimeOutput) elements.mimeOutput.innerHTML = '';
            if (elements.resultCount) elements.resultCount.textContent = '';
            if (elements.toolStats) elements.toolStats.innerHTML = '';
            setStatus('ready', 'Ready');
            return;
        }
        if (elements.emptyState) elements.emptyState.style.display = 'none';
        if (elements.resultsPanel) elements.resultsPanel.classList.add('show');

        var filtered = filterMimes();
        state.lastResults = filtered;
        if (elements.resultCount) {
            elements.resultCount.innerHTML = 'Showing <strong>' + filtered.length + '</strong> of ' + MIMES.length + ' MIME types';
        }
        renderStats(filtered);

        if (!filtered.length) {
            elements.mimeOutput.innerHTML = renderEmpty();
            announce('No MIME types match your search');
            setStatus('done', 'Done');
            return;
        }

        var html = '';
        if (filtered.length === 1) html += renderHero(filtered[0]);
        html += '<div class="mime-card-grid">';
        filtered.forEach(function (m) {
            html += renderCard(m);
        });
        html += '</div>';
        elements.mimeOutput.innerHTML = html;
        setStatus('done', 'Done');
        announce('Showing ' + filtered.length + ' MIME types');
    }

    /* ============ EXPORTS ============ */
    function exportPayload() {
        return state.lastResults.map(function (m) {
            return {
                extension: m.ext,
                mimeType: m.mime,
                category: m.cat,
                binary: m.binary,
                ianaRegistered: m.iana,
                aliases: m.aliases || [],
                description: m.desc,
                usage: m.usage,
                security: m.security,
                commonApps: m.apps || [],
                examples: m.examples || []
            };
        });
    }

    function exportJson() {
        downloadFile('mime-types.json', JSON.stringify(exportPayload(), null, 2), 'application/json');
    }

    function exportTxt() {
        var lines = [];
        lines.push('MIME TYPE REFERENCE');
        lines.push('Generated: ' + new Date().toLocaleString());
        lines.push('Types: ' + state.lastResults.length);
        lines.push('');
        state.lastResults.forEach(function (m) {
            lines.push(m.ext + ' -> ' + m.mime + ' [' + m.cat + ', ' + (m.binary ? 'binary' : 'text') + ']');
            lines.push('  ' + m.desc);
            if (m.usage) lines.push('  Usage: ' + m.usage);
            lines.push('');
        });
        downloadFile('mime-types.txt', lines.join('\n'));
    }

    function exportCsv() {
        var rows = [['Extension', 'MIME Type', 'Category', 'Text/Binary', 'IANA', 'Description', 'Usage']];
        state.lastResults.forEach(function (m) {
            rows.push([m.ext, m.mime, m.cat, m.binary ? 'binary' : 'text', m.iana ? 'yes' : 'no', m.desc, m.usage || '']);
        });
        var csv = rows.map(function (r) {
            return r.map(function (c) {
                var v = String(c);
                if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
                return v;
            }).join(',');
        }).join('\r\n');
        downloadFile('mime-types.csv', csv, 'text/csv');
    }

    function exportPrint() {
        window.print();
    }

    function exportCopyReport() {
        var lines = state.lastResults.map(function (m) {
            return m.ext + ' -> ' + m.mime + ' (' + m.cat + ')';
        });
        copyText(lines.join('\n'), 'Report copied to clipboard');
    }

    function clearSearch() {
        state.query = '';
        state.activeCat = 'all';
        if (elements.searchInput) elements.searchInput.value = '';
        renderFilters();
        render();
        if (elements.searchInput) elements.searchInput.focus();
    }

    /* ============ EVENTS ============ */
    function onSearchInput() {
        state.query = elements.searchInput.value;
        render();
    }

    function onCatClick(e) {
        var btn = e.target.closest('.cat-btn');
        if (!btn) return;
        state.activeCat = btn.getAttribute('data-cat');
        renderFilters();
        render();
    }

    function onOutputClick(e) {
        var copyBtn = e.target.closest('[data-copy]');
        if (copyBtn) {
            e.stopPropagation();
            copyText(copyBtn.getAttribute('data-copy'));
            return;
        }
        var card = e.target.closest('.mime-card');
        if (card) {
            copyText(card.getAttribute('data-mime'));
        }
    }

    function onOutputKeydown(e) {
        if (e.key.toLowerCase() === 'c' && (e.ctrlKey || e.metaKey)) {
            var card = e.target.closest('.mime-card');
            if (card) {
                e.preventDefault();
                copyText(card.getAttribute('data-mime'));
            }
        }
    }

    function onGlobalKeydown(e) {
        if (e.key === 'Escape') {
            var dirty = state.query !== '' || state.activeCat !== 'all' || (elements.searchInput && elements.searchInput.value);
            if (dirty) {
                e.preventDefault();
                clearSearch();
                showToast('Cleared search and filters', 'info');
            }
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            if (elements.searchInput && document.activeElement === elements.searchInput && state.lastResults.length) {
                e.preventDefault();
                copyText(state.lastResults[0].mime, 'Copied first result: ' + state.lastResults[0].mime);
            }
        }
    }

    function bindEvents() {
        if (elements.searchInput) elements.searchInput.addEventListener('input', onSearchInput);
        if (elements.catFilters) elements.catFilters.addEventListener('click', onCatClick);
        if (elements.mimeOutput) {
            elements.mimeOutput.addEventListener('click', onOutputClick);
            elements.mimeOutput.addEventListener('keydown', onOutputKeydown);
        }
        if (elements.toolStats) elements.toolStats.addEventListener('click', onStatsClick);
        if (elements.exportJson) elements.exportJson.addEventListener('click', exportJson);
        if (elements.exportTxt) elements.exportTxt.addEventListener('click', exportTxt);
        if (elements.exportCsv) elements.exportCsv.addEventListener('click', exportCsv);
        if (elements.exportPrint) elements.exportPrint.addEventListener('click', exportPrint);
        if (elements.exportCopy) elements.exportCopy.addEventListener('click', exportCopyReport);
        if (elements.lookupBtn) elements.lookupBtn.addEventListener('click', function (e) {
            e.preventDefault();
            render();
            if (elements.searchInput) elements.searchInput.focus();
        });
        if (elements.clearBtn) elements.clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            clearSearch();
            showToast('Cleared search and filters', 'info');
        });
        if (elements.emptyState) {
            elements.emptyState.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-example]');
                if (!btn) return;
                var val = btn.getAttribute('data-example');
                if (elements.searchInput) elements.searchInput.value = val;
                state.query = val;
                render();
            });
        }
        document.addEventListener('keydown', onGlobalKeydown);
    }

    /* ============ INIT ============ */
    function init() {
        cacheDom();
        if (!elements.mimeOutput || !elements.searchInput) return;
        bindEvents();
        renderFilters();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
