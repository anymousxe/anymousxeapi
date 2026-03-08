// the interactivity layer - copy buttons tabs and vibes 🎭

// tab switching for code examples
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.example-content').forEach(c => c.style.display = 'none');
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).style.display = 'block';
    });
});

// copy buttons - the whole operation depends on these
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        let text = '';

        if (btn.dataset.copy) {
            text = btn.dataset.copy;
        } else if (btn.dataset.copyId) {
            const el = document.getElementById(btn.dataset.copyId);
            text = el ? el.textContent : '';
        }

        try {
            await navigator.clipboard.writeText(text);
            const original = btn.innerHTML;
            btn.innerHTML = '✓ Copied';
            btn.classList.add('copied');
            // reset after a sec
            setTimeout(() => {
                btn.innerHTML = original;
                btn.classList.remove('copied');
            }, 1500);
        } catch {
            // clipboard api not available, oh well
        }
    });
});

// smooth reveal animations on scroll
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

// observe all sections and cards
document.querySelectorAll('.model-card, .step, .ref-card, .error-row, .code-block').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// add the visible class styles
const style = document.createElement('style');
style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(style);

// stagger animation for model cards
document.querySelectorAll('.model-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
});

// stagger for steps
document.querySelectorAll('.step').forEach((step, i) => {
    step.style.transitionDelay = `${i * 0.12}s`;
});

// stagger for error rows
document.querySelectorAll('.error-row').forEach((row, i) => {
    row.style.transitionDelay = `${i * 0.08}s`;
});

// nav background on scroll
const nav = document.querySelector('.nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const scroll = window.scrollY;

    if (scroll > 50) {
        nav.style.borderBottomColor = 'rgba(42, 42, 58, 0.8)';
        nav.style.background = 'rgba(10, 10, 15, 0.95)';
    } else {
        nav.style.borderBottomColor = 'rgba(42, 42, 58, 0.3)';
        nav.style.background = 'rgba(10, 10, 15, 0.8)';
    }

    lastScroll = scroll;
}, { passive: true });

// thats it thats the whole script no cap
