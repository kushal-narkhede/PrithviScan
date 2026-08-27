document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      });
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  const video = document.querySelector(".hero-video");
  if (video instanceof HTMLVideoElement) {
    const tryPlay = () => {
      video.play().catch(() => {
        /* Autoplay may be blocked; muted + playsinline usually works. */
      });
    };
    tryPlay();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) tryPlay();
    });
  }

  // Gentle hero parallax — presence without noise
  const heroMedia = document.querySelector(".hero-media");
  const heroContent = document.querySelector(".hero-content");
  const reduceMotion =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && heroMedia && heroContent) {
    const onHeroScroll = () => {
      const y = Math.min(window.scrollY, 420);
      heroMedia.style.transform = `translateY(${y * 0.22}px) scale(${1 + y * 0.00015})`;
      heroContent.style.transform = `translateY(${y * 0.08}px)`;
      heroContent.style.opacity = String(Math.max(0.25, 1 - y / 520));
    };
    onHeroScroll();
    window.addEventListener("scroll", onHeroScroll, { passive: true });
  }

  // CTA magnetic tilt on pointer
  document.querySelectorAll(".hero-actions .btn").forEach((btn) => {
    if (reduceMotion) return;
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      btn.style.transform = `translate(${dx * 4}px, ${dy * 3 - 2}px)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
    });
  });
});
