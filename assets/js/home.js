document.getElementById('current-year').textContent = new Date().getFullYear();

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({ top: targetElement.offsetTop - 100, behavior: 'smooth' });
        }
    });
});

// FAQ Accordion
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', function() {
        const answer = this.nextElementSibling;
        const isActive = this.classList.contains('active');
        
        // Close all others
        document.querySelectorAll('.faq-question').forEach(q => {
            q.classList.remove('active');
            q.setAttribute('aria-expanded', 'false');
            q.nextElementSibling.classList.remove('active');
        });
        
        // Toggle clicked
        if (!isActive) {
            this.classList.add('active');
            this.setAttribute('aria-expanded', 'true');
            answer.classList.add('active');
        }
    });
});
