/* ============================================
   GO TOOLLY - JWT GENERATOR
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    var algoSelect = document.getElementById('jwtg-algo');
    var headerInput = document.getElementById('jwtg-header');
    var payloadInput = document.getElementById('jwtg-payload');
    var secretInput = document.getElementById('jwtg-secret');
    var secretField = document.getElementById('jwtg-secret-field');
    var generateBtn = document.getElementById('generate-btn');
    var copyBtn = document.getElementById('copy-btn');
    var clearBtn = document.getElementById('clear-btn');
    var output = document.getElementById('jwtg-output');

    var generatedToken = '';

    algoSelect.addEventListener('change', function() {
        secretField.style.display = this.value === 'none' ? 'none' : 'block';
        if (this.value === 'none') {
            try {
                var h = JSON.parse(headerInput.value);
                h.alg = 'none';
                headerInput.value = JSON.stringify(h, null, 2);
            } catch(e) {}
        } else {
            try {
                var h = JSON.parse(headerInput.value);
                h.alg = this.value;
                headerInput.value = JSON.stringify(h, null, 2);
            } catch(e) {}
        }
    });

    generateBtn.addEventListener('click', generate);
    copyBtn.addEventListener('click', copyToken);
    clearBtn.addEventListener('click', clearAll);

    function generate() {
        try {
            var algo = algoSelect.value;
            var header = JSON.parse(headerInput.value);
            var payload = JSON.parse(payloadInput.value);
            var secret = secretInput.value;

            var headerB64 = base64UrlEncode(JSON.stringify(header));
            var payloadB64 = base64UrlEncode(JSON.stringify(payload));
            var signingInput = headerB64 + '.' + payloadB64;

            if (algo === 'none') {
                generatedToken = signingInput + '.';
                output.textContent = generatedToken;
                output.className = 'jwtg-output has-token';
                return;
            }

            var algoName = algo === 'HS256' ? 'SHA-256' : algo === 'HS384' ? 'SHA-384' : 'SHA-512';
            var keyData = new TextEncoder().encode(secret);

            crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: { name: algoName } }, false, ['sign']).then(function(key) {
                return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
            }).then(function(sig) {
                var sigArray = Array.from(new Uint8Array(sig));
                var sigB64 = base64UrlEncodeFromBytes(sigArray);
                generatedToken = signingInput + '.' + sigB64;
                output.textContent = generatedToken;
                output.className = 'jwtg-output has-token';
            }).catch(function(err) {
                output.textContent = 'Error: ' + err.message;
                output.className = 'jwtg-output';
            });
        } catch (e) {
            output.textContent = 'Error: Invalid JSON. Please check your header and payload.';
            output.className = 'jwtg-output';
        }
    }

    function base64UrlEncode(str) {
        var b64 = btoa(unescape(encodeURIComponent(str)));
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function base64UrlEncodeFromBytes(bytes) {
        var binary = '';
        for (var i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        var b64 = btoa(binary);
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function copyToken() {
        if (!generatedToken) return;
        navigator.clipboard.writeText(generatedToken).then(function() {
            copyBtn.textContent = 'Copied!';
            setTimeout(function() { copyBtn.textContent = 'Copy Token'; }, 1500);
        });
    }

    function clearAll() {
        headerInput.value = '{"alg":"HS256","typ":"JWT"}';
        payloadInput.value = '{"sub":"1234567890","name":"John Doe","iat":1516239022}';
        secretInput.value = 'your-secret-key';
        output.textContent = 'Generated JWT will appear here';
        output.className = 'jwtg-output';
        generatedToken = '';
    }
});
