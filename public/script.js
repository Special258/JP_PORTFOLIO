(function () {
  'use strict';

  document.documentElement.classList.add('js-enabled');

  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  function closeMenu() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation');
    navMenu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
      navMenu.classList.toggle('is-open', !isOpen);
      document.body.classList.toggle('menu-open', !isOpen);
    });

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 720) closeMenu();
    });
  }

  const filterButtons = document.querySelectorAll('.filter-button');
  const projectCards = document.querySelectorAll('.project-card');

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const filter = button.dataset.filter;
      filterButtons.forEach(function (item) {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });

      projectCards.forEach(function (card) {
        const categories = (card.dataset.category || '').split(/\s+/);
        card.hidden = filter !== 'all' && !categories.includes(filter);
      });
    });
  });

  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  const progressBar = document.getElementById('scroll-progress-bar');
  let scrollUpdateScheduled = false;

  function updateScrollProgress() {
    if (!progressBar) return;
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    progressBar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
  }

  function scheduleScrollProgress() {
    if (scrollUpdateScheduled) return;
    scrollUpdateScheduled = true;
    window.requestAnimationFrame(function () {
      updateScrollProgress();
      scrollUpdateScheduled = false;
    });
  }

  if (progressBar) {
    updateScrollProgress();
    window.addEventListener('scroll', scheduleScrollProgress, { passive: true });
    window.addEventListener('resize', scheduleScrollProgress);
  }

  const sectionLinks = Array.from(document.querySelectorAll('.nav__link[href^="#"]'));
  if ('IntersectionObserver' in window && sectionLinks.length > 0) {
    const sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const sectionHref = `#${entry.target.id}`;
        sectionLinks.forEach(function (link) {
          if (link.getAttribute('href') === sectionHref) {
            link.setAttribute('aria-current', 'location');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      });
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });

    sectionLinks.forEach(function (link) {
      const section = document.querySelector(link.getAttribute('href'));
      if (section) sectionObserver.observe(section);
    });
  }

  const pageRailLinks = Array.from(document.querySelectorAll('.page-rail__link'));
  const railIndex = document.getElementById('page-rail-index');
  const railTitle = document.getElementById('page-rail-title');
  const railNote = document.getElementById('page-rail-note');
  const railSections = [
    { id: 'hero', target: '.hero--editorial', title: 'Introduction', note: 'Start with a useful question.', dark: true },
    { id: 'work', target: '#work', title: 'Selected work', note: 'Ideas become working prototypes.' },
    { id: 'about', target: '#about', title: 'Approach', note: 'Frame the problem before tools.', dark: true },
    { id: 'stack', target: '#stack', title: 'Toolkit', note: 'Choose tools for the job.' },
    { id: 'experience', target: '#experience', title: 'Experience', note: 'Learn through real team work.', dark: true },
    { id: 'credentials', target: '#credentials', title: 'Credentials', note: 'Keep learning; show the proof.' },
    { id: 'profiles', target: '#profiles', title: 'Elsewhere', note: 'Follow the work in public.' },
    { id: 'contact', target: '#contact', title: 'Contact', note: 'Good ideas start with a conversation.', dark: true }
  ];

  function setActiveRailSection(section) {
    const sectionIndex = railSections.indexOf(section);
    if (sectionIndex < 0) return;

    pageRailLinks.forEach(function (link, index) {
      if (index === sectionIndex) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    if (railIndex) railIndex.textContent = String(sectionIndex + 1).padStart(2, '0');
    if (railTitle) railTitle.textContent = section.title;
    if (railNote) railNote.textContent = section.note;

    document.querySelectorAll('.page-rail').forEach(function (rail) {
      const railIsOnDark = Boolean(section.dark) && section.id !== 'hero';
      rail.classList.toggle('is-on-dark', railIsOnDark);
    });
  }

  setActiveRailSection(railSections[0]);

  if ('IntersectionObserver' in window && pageRailLinks.length > 0) {
    const railObserver = new IntersectionObserver(function (entries) {
      const visibleSections = entries.filter(function (entry) {
        return entry.isIntersecting;
      });
      if (visibleSections.length === 0) return;

      visibleSections.sort(function (a, b) {
        const viewportAnchor = window.innerHeight * 0.38;
        return Math.abs(a.boundingClientRect.top - viewportAnchor) -
          Math.abs(b.boundingClientRect.top - viewportAnchor);
      });

      const activeId = visibleSections[0].target.dataset.railSection;
      const activeSection = railSections.find(function (section) {
        return section.id === activeId;
      });
      if (activeSection) setActiveRailSection(activeSection);
    }, { rootMargin: '-28% 0px -55% 0px', threshold: 0 });

    railSections.forEach(function (section) {
      const target = document.querySelector(section.target);
      if (target) {
        target.dataset.railSection = section.id;
        railObserver.observe(target);
      }
    });
  }

  const copyEmailButton = document.getElementById('copy-email');
  const copyEmailStatus = document.getElementById('copy-email-status');

  if (copyEmailButton && copyEmailStatus) {
    copyEmailButton.addEventListener('click', async function () {
      const email = copyEmailButton.dataset.email;
      if (!email) {
        copyEmailStatus.textContent = 'Email address is unavailable. Use the email link above.';
        return;
      }

      try {
        if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(email);
        } else {
          const helper = document.createElement('textarea');
          helper.className = 'clipboard-helper';
          helper.value = email;
          helper.setAttribute('readonly', '');
          document.body.appendChild(helper);
          helper.select();
          let copied;
          try {
            copied = document.execCommand('copy');
          } finally {
            helper.remove();
            copyEmailButton.focus();
          }
          if (!copied) throw new Error('The browser did not allow clipboard access.');
        }
        copyEmailStatus.textContent = 'Email address copied.';
      } catch (error) {
        copyEmailStatus.textContent = 'Copy failed. Use the email link above: ' + email;
        console.error('Unable to copy the contact email:', error);
      }
    });
  }

  const revealItems = document.querySelectorAll(
    '.section-heading, .proof-item, .project-card, .about-intro, .about-copy, .about-facts > div, .expertise-card, .experience-item, .credential-card, .profile-card, .hero__side-note'
  );
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

    revealItems.forEach(function (item, index) {
      item.classList.add('reveal');
      item.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
      observer.observe(item);
    });
  }

}());
