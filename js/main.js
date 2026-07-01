/* ============================================================
   TOYOTA NUÑEZ — main.js
   Mobile menu · Form validation · GTM events · Utils
   ============================================================ */

'use strict';

/* ── UTILS ────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function pushGTM(event, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
}

/* ── YEAR ─────────────────────────────────────────────────── */
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


/* ── MOBILE MENU ──────────────────────────────────────────── */
(function initMobileMenu() {
  const toggle = $('#menuToggle');
  const nav    = $('#mainNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('is-open', !expanded);
  });

  // Close on nav link click (mobile)
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
  });
})();


/* ── HEADER SCROLL SHADOW ─────────────────────────────────── */
(function initHeaderScroll() {
  const header = $('.header');
  if (!header) return;
  const update = () => header.classList.toggle('header--scrolled', window.scrollY > 10);
  window.addEventListener('scroll', update, { passive: true });
  update();
})();


/* ── HERO CAROUSEL ─────────────────────────────────────────── */
(function initHeroCarousel() {
  const hero = $('.hero');
  const slides = $$('.hero__slide', hero);
  const dots = $$('.hero__dot', hero);
  if (!hero || slides.length < 2) return;

  let current = 0;
  let timer;

  function showSlide(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
  }

  function startAutoplay() {
    clearInterval(timer);
    timer = window.setInterval(() => showSlide(current + 1), 5000);
  }

  showSlide(0);
  startAutoplay();

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      showSlide(Number(dot.dataset.slide));
      startAutoplay();
    });
  });

  hero.addEventListener('mouseenter', () => clearInterval(timer));
  hero.addEventListener('mouseleave', startAutoplay);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else startAutoplay();
  });
})();


/* ── VEHICLE CARD → FORM PRE-FILL ─────────────────────────── */
(function initCardButtons() {
  $$('[data-model]').forEach(el => {
    el.addEventListener('click', (e) => {
      const model = el.dataset.model;
      if (!model) return;

      // Pre-fill the select
      const modelSelect = $('#modelo');
      if (modelSelect) {
        const option = [...modelSelect.options].find(o => o.value === model || o.text === model);
        if (option) modelSelect.value = option.value;
      }

      // GTM event
      pushGTM('vehicle_cta_click', { vehicle_model: model });
    });
  });
})();


/* ── CONTACT FORM ─────────────────────────────────────────── */
(function initContactForm() {
  const form       = $('#contactForm');
  const submitBtn  = $('#submitBtn');
  const btnText    = submitBtn ? $('.btn__text', submitBtn) : null;
  const btnLoading = submitBtn ? $('.btn__loading', submitBtn) : null;
  const successMsg = $('#formSuccess');
  const errorMsg   = $('#formError');

  if (!form) return;

  /* Validation rules */
  const rules = {
    nombre:   { required: true, label: 'Nombre' },
    apellido: { required: true, label: 'Apellido' },
    email:    { required: true, type: 'email', label: 'Email' },
    telefono: { required: true, label: 'Teléfono' },
    modelo:   { required: true, label: 'Modelo' },
  };

  function validateField(name, value) {
    const rule = rules[name];
    if (!rule) return '';
    if (rule.required && !value.trim()) return `${rule.label} es obligatorio.`;
    if (rule.type === 'email' && value.trim()) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(value.trim())) return 'Ingresá un email válido.';
    }
    return '';
  }

  function showFieldError(name, msg) {
    const input = form.elements[name];
    const errEl = $(`#${name}-error`);
    if (input)  input.classList.toggle('is-invalid', !!msg);
    if (errEl)  errEl.textContent = msg;
  }

  // Live validation on blur
  Object.keys(rules).forEach(name => {
    const input = form.elements[name];
    if (!input) return;
    input.addEventListener('blur', () => {
      showFieldError(name, validateField(name, input.value));
    });
    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) {
        showFieldError(name, validateField(name, input.value));
      }
    });
  });

  function validateAll() {
    let valid = true;
    Object.keys(rules).forEach(name => {
      const input = form.elements[name];
      if (!input) return;
      const msg = validateField(name, input.value);
      showFieldError(name, msg);
      if (msg) valid = false;
    });
    return valid;
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    if (btnText)    btnText.hidden    = loading;
    if (btnLoading) btnLoading.hidden = !loading;
  }

  function collectFormData() {
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => { data[k] = v; });
    return data;
  }

  /* GTM — form submit attempt */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      // Focus first invalid
      const firstErr = form.querySelector('.is-invalid');
      if (firstErr) firstErr.focus();
      return;
    }

    setLoading(true);
    successMsg.hidden = true;
    errorMsg.hidden   = true;

    const data = collectFormData();
    pushGTM('form_submit_attempt', { vehicle_model: data.modelo });

    try {
      // GTM handles the actual submission via tags — we simulate a brief delay
      // If you need a direct endpoint, replace the block below.
      await new Promise(r => setTimeout(r, 600)); // simulated async

      // Re-use GTM's own form submit (Duda used GTM tags that can be preserved)
      // Dispatch a custom event GTM can listen to
      window.dataLayer.push({
        event: 'form_lead_submitted',
        form_name: 'contact_form',
        vehicle_model: data.modelo,
        plan_type: data.plan || 'not_selected',
      });

      // Show success
      successMsg.hidden = false;
      form.reset();
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      errorMsg.hidden = false;
      pushGTM('form_submit_error', { error: err.message });
    } finally {
      setLoading(false);
    }
  });
})();


/* ── SMOOTH SCROLL POLYFILL for older iOS ─────────────────── */
(function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL without jump
      history.pushState(null, '', `#${id}`);
    });
  });
})();


/* ── INTERSECTION OBSERVER — fade-in cards ────────────────── */
(function initFadeIn() {
  if (!('IntersectionObserver' in window)) return;

  const style = document.createElement('style');
  style.textContent = `
    .vehicle-card, .benefit, .branch, .hours-block {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.45s ease, transform 0.45s ease;
    }
    .vehicle-card.is-visible, .benefit.is-visible,
    .branch.is-visible, .hours-block.is-visible {
      opacity: 1;
      transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .vehicle-card, .benefit, .branch, .hours-block {
        opacity: 1; transform: none; transition: none;
      }
    }
  `;
  document.head.appendChild(style);

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger delay based on sibling index
        const siblings = [...entry.target.parentElement.children];
        const idx = siblings.indexOf(entry.target);
        entry.target.style.transitionDelay = `${Math.min(idx * 60, 300)}ms`;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  $$('.vehicle-card, .benefit, .branch, .hours-block').forEach(el => obs.observe(el));
})();

