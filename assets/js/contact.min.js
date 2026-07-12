// Client-side contact form handler with Web3Forms + rate limiting
class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = new Map();
    }

    canMakeRequest(identifier) {
        const now = Date.now();
        const userRequests = this.requests.get(identifier) || [];
        const validRequests = userRequests.filter(time => now - time < this.timeWindow);

        if (validRequests.length >= this.maxRequests) {
            this.requests.set(identifier, validRequests);
            return false;
        }

        validRequests.push(now);
        this.requests.set(identifier, validRequests);

        for (const [key, timestamps] of this.requests) {
            const filtered = timestamps.filter(t => now - t < this.timeWindow);
            if (filtered.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, filtered);
            }
        }

        return true;
    }

    getRemainingRequests(identifier) {
        const now = Date.now();
        const userRequests = this.requests.get(identifier) || [];
        const validRequests = userRequests.filter(time => now - time < this.timeWindow);
        return Math.max(0, this.maxRequests - validRequests.length);
    }
}

const rateLimiter = new RateLimiter(5, 15 * 60 * 1000);

function getClientIdentifier() {
    return navigator.userAgent + '|' + navigator.language + '|' + screen.width + '|' + screen.height;
}

async function submitContactForm(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const statusEl = document.getElementById('contact-form-status');
    const originalText = submitBtn ? submitBtn.textContent : 'Send';

    // Honeypot check
    const honeypot = form.querySelector('input[name="website"]');
    if (honeypot && honeypot.value) {
        console.log('Bot detected via honeypot');
        if (statusEl) {
            statusEl.textContent = 'Message submitted.';
            statusEl.style.color = 'var(--color-text-light)';
        }
        return;
    }

    // Botcheck field
    const botcheck = form.querySelector('input[name="botcheck"]');
    if (botcheck && botcheck.checked) {
        return;
    }

    // Rate limit check
    const clientId = getClientIdentifier();
    if (!rateLimiter.canMakeRequest(clientId)) {
        const waitMsg = 'Please wait before sending another message. You can send up to 5 messages every 15 minutes.';
        if (statusEl) {
            statusEl.textContent = waitMsg;
            statusEl.style.color = 'var(--color-danger)';
        }
        return;
    }

    if (submitBtn) {
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
    }

    try {
        const formData = new FormData(form);
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            form.reset();
            if (statusEl) {
                statusEl.textContent = "Thank you! Your message was sent successfully. We'll respond within 1-3 business days.";
                statusEl.style.color = 'var(--color-success)';
            }
        } else {
            const errMsg = result.message || 'Something went wrong. Please try again.';
            if (statusEl) {
                statusEl.textContent = errMsg;
                statusEl.style.color = 'var(--color-danger)';
            }
            console.error('Web3Forms error:', result);
        }
    } catch (err) {
        console.error('Network error while sending contact form:', err);
        if (statusEl) {
            statusEl.textContent = 'Network error — please check your connection and try again.';
            statusEl.style.color = 'var(--color-danger)';
        }
    } finally {
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
        console.log('Remaining messages:', rateLimiter.getRemainingRequests(clientId));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        if (!contactForm.querySelector('input[name="website"]')) {
            const honeypot = document.createElement('input');
            honeypot.type = 'text';
            honeypot.name = 'website';
            honeypot.style.position = 'absolute';
            honeypot.style.left = '-10000px';
            honeypot.setAttribute('aria-hidden', 'true');
            honeypot.tabIndex = -1;
            contactForm.appendChild(honeypot);
        }

        contactForm.addEventListener('submit', submitContactForm);
    }
});
