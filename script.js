document.addEventListener('DOMContentLoaded', () => {

    // --- LOADER ---
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => { loader.classList.add('hidden'); }, 150);
    }

    // --- HEADER SCROLL BEHAVIOR ---
    const header = document.getElementById('mainHeader');
    function changeHeaderOnScroll() {
        if (!header) return;
        if (window.pageYOffset > 50) {
            header.classList.add('header-scrolled-full');
        } else {
            header.classList.remove('header-scrolled-full');
        }
    }
    
    // --- ACTIVE NAV LINK & SCROLL OBSERVERS ---
    const navLinks = document.querySelectorAll('header nav a.nav-link');
    const sections = document.querySelectorAll('main section[id]');
    function updateActiveNavLink() {
        let currentSectionId = '';
        const offset = header ? header.offsetHeight + 40 : 120;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.pageYOffset >= sectionTop - offset) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active-link');
            const href = link.getAttribute('href');
            if (href && href.includes('#') && href.endsWith(currentSectionId)) {
                link.classList.add('active-link');
            }
        });
    }

    // --- EVENT LISTENERS ---
    window.addEventListener('scroll', () => {
        changeHeaderOnScroll();
        updateActiveNavLink();
    }, { passive: true });
    // Initial calls
    changeHeaderOnScroll();
    updateActiveNavLink();

    // --- MOBILE MENU ---
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const mainNav = document.querySelector('header nav');

    if (mobileMenuButton && mobileMenu && mainNav) {
        const mobileNavContainer = document.createElement('div');
        mobileNavContainer.classList.add('flex', 'flex-col', 'items-center', 'space-y-4');
        
        mainNav.querySelectorAll('a').forEach(link => {
            const mobileLink = link.cloneNode(true);
            mobileLink.classList.remove('nav-link');
            mobileLink.classList.add('mobile-nav-link');
            mobileNavContainer.appendChild(mobileLink);
        });
        mobileMenu.appendChild(mobileNavContainer);

        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const icon = mobileMenuButton.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                const icon = mobileMenuButton.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            });
        });
    }

    // --- INTERSECTION OBSERVER FOR SCROLL ANIMATIONS ---
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const scrollObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                obs.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px', threshold: 0.1 });
    animatedElements.forEach(el => scrollObserver.observe(el));


    // --- IGNITER NODES (This is the ONLY form-related JS we need) ---
    const igniterNodes = document.querySelectorAll('.igniter-node');
    const subjectInput = document.getElementById('subject');
    let selectedNeeds = new Set();

    igniterNodes.forEach(node => {
        node.addEventListener('click', () => {
            const need = node.dataset.need;
            node.classList.toggle('active');
            
            if (node.classList.contains('active')) {
                selectedNeeds.add(need);
            } else {
                selectedNeeds.delete(need);
            }
            if (subjectInput) {
                subjectInput.value = Array.from(selectedNeeds).join(', ');
            }
        });
    });

    // --- MODIFIED: The custom fetch submission logic has been REMOVED. ---
    // Netlify will handle the form submission automatically.


    // --- MODALS ---
    const modalTriggers = document.querySelectorAll('[data-modal-target]');
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const modalId = trigger.dataset.modalTarget;
            if (modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        });
    });

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            const video = modal.querySelector('video');
            if (video) video.pause();
        }
    }

    document.querySelectorAll('[data-modal-close]').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => closeModal(closeBtn.closest('.modal')));
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(closeModal);
        }
    });

    // --- PROJECT SCROLLER & FILTERING (IMPROVED LOGIC) ---
    const projectScroller = document.getElementById('projectScroller');
    const scrollLeftBtn = document.getElementById('scrollProjectsLeft');
    const scrollRightBtn = document.getElementById('scrollProjectsRight');
    const filterButtons = document.querySelectorAll('#projectFilterControls .filter-btn');
    const projectCards = document.querySelectorAll('#projectScroller .project-card-kinetic');

    function updateScrollButtonsVisibility() {
        if (!projectScroller || !scrollLeftBtn || !scrollRightBtn) return;
        const visibleCards = Array.from(projectCards).filter(card => !card.classList.contains('hidden-card') && card.offsetWidth > 0);
        if (visibleCards.length === 0 || projectScroller.scrollWidth <= projectScroller.clientWidth + 5) {
            scrollLeftBtn.classList.add('hidden');
            scrollRightBtn.classList.add('hidden');
            return;
        }
        const tolerance = 5;
        const scrollAmount = Math.round(projectScroller.scrollLeft);
        const maxScroll = Math.round(projectScroller.scrollWidth - projectScroller.clientWidth);
        scrollLeftBtn.classList.toggle('hidden', scrollAmount <= tolerance);
        scrollRightBtn.classList.toggle('hidden', scrollAmount >= maxScroll - tolerance);
    }

    if (projectScroller && scrollLeftBtn && scrollRightBtn) {
        const scrollDistance = 355;
        scrollLeftBtn.addEventListener('click', () => { projectScroller.scrollBy({ left: -scrollDistance, behavior: 'smooth' }); });
        scrollRightBtn.addEventListener('click', () => { projectScroller.scrollBy({ left: scrollDistance, behavior: 'smooth' }); });
        projectScroller.addEventListener('scroll', updateScrollButtonsVisibility, { passive: true });
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(updateScrollButtonsVisibility).observe(projectScroller);
        } else {
            window.addEventListener('resize', updateScrollButtonsVisibility, { passive: true });
        }
        setTimeout(updateScrollButtonsVisibility, 350); 
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterValue = button.dataset.filter;
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            projectCards.forEach(card => {
                const cardCategories = card.dataset.category ? card.dataset.category.split(' ') : [];
                if (filterValue === 'all' || cardCategories.includes(filterValue)) {
                    card.classList.remove('hidden-card');
                } else {
                    card.classList.add('hidden-card');
                }
            });
            setTimeout(() => { 
                projectScroller.scrollLeft = 0; 
                updateScrollButtonsVisibility();
            }, 350); 
        });
    });

    // --- FOOTER YEAR ---
    const currentYearEl = document.getElementById('currentYear');
    if (currentYearEl) {
         currentYearEl.textContent = new Date().getFullYear();
    }

    // --- STORYBOOK PARALLAX MOTIFS ---
    const horseMotif = document.getElementById('horse-motif');
    const lilyMotif = document.getElementById('lily-motif');

    function handleStorybookScroll() {
        if (!horseMotif || !lilyMotif) return;

        const storybookSection = document.getElementById('storybook-start');
        if (!storybookSection) return;

        const rect = storybookSection.getBoundingClientRect();
        const scrollY = window.scrollY;

        // Check if the section is in the viewport
        if (rect.top < window.innerHeight && rect.bottom >= 0) {
            const speed = 0.1;
            const offset = (scrollY - storybookSection.offsetTop) * speed;

            horseMotif.style.transform = `translateY(${offset}px)`;
            lilyMotif.style.transform = `translateY(${-offset}px)`;
        }
    }

    window.addEventListener('scroll', handleStorybookScroll, { passive: true });

    // --- STORYBOOK PROCESS CARD SEQUENTIAL ANIMATION ---
    const processContainer = document.querySelector('#storybook-start .grid');
    if (processContainer) {
        const elementsToAnimate = processContainer.querySelectorAll('.process-card'); // Animate cards only now

        const processObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    elementsToAnimate.forEach((el, index) => {
                        setTimeout(() => {
                            el.classList.add('animated');
                        }, index * 250); // Stagger the animation by 250ms
                    });
                    drawArrowLines(); // Draw arrows after cards are animated
                    observer.unobserve(entry.target); // Stop observing once animated
                }
            });
        }, { threshold: 0.2, rootMargin: '0px' });

        elementsToAnimate.forEach(el => el.classList.add('animate-on-scroll'));
        processObserver.observe(processContainer);
    }

    // --- SVG ARROW DRAWING ---
    const svgCanvas = document.getElementById('arrow-svg-canvas');
    const cards = document.querySelectorAll('#storybook-start .process-card');

    function drawArrowLines() {
        if (!svgCanvas || cards.length < 2) return;

        // Clear any existing lines
        svgCanvas.innerHTML = '';

        const containerRect = processContainer.getBoundingClientRect();

        for (let i = 0; i < cards.length - 1; i++) {
            const startCard = cards[i];
            const endCard = cards[i+1];

            const startRect = startCard.getBoundingClientRect();
            const endRect = endCard.getBoundingClientRect();

            // Calculate center points relative to the container
            const startX = startRect.left + startRect.width / 2 - containerRect.left;
            const startY = startRect.top + startRect.height / 2 - containerRect.top;
            const endX = endRect.left + endRect.width / 2 - containerRect.left;
            const endY = endRect.top + endRect.height / 2 - containerRect.top;

            // Create a path element
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M${startX},${startY} C${startX},${(startY+endY)/2} ${endX},${(startY+endY)/2} ${endX},${endY}`);
            path.setAttribute('stroke', 'var(--accent-orange)');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-dasharray', '5, 5');
            path.style.opacity = '0.7';

            svgCanvas.appendChild(path);
        }
    }

    // Redraw arrows on window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(drawArrowLines, 100);
    }, { passive: true });

    // --- SKILL CARD FLIPPING ---
    const skillCards = document.querySelectorAll('.skill-card-container');
    skillCards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });
});