// tabs, copy, scroll reveals

// init lucide icons
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
});

// tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(`tab-${tab.dataset.tab}`);
        if (panel) panel.classList.add('active');
    });
});

// copy buttons
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
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1200);
        } catch { }
    });
});

// scroll reveal
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
);

document.querySelectorAll('.model-card, .step, .ref-card, .error-row, .code-block, .info-card').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(i * 0.05, 0.3)}s`;
    observer.observe(el);
});

// nav scroll effect
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
        nav.style.borderBottomColor = 'rgba(31, 31, 36, 0.9)';
    } else {
        nav.style.borderBottomColor = 'rgba(31, 31, 36, 0.4)';
    }
}, { passive: true });
