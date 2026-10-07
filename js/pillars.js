(() => {
  const root = document.querySelector("[data-pillars]");
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
  if (!tabs.length || panels.includes(null)) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = Math.max(0, tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"));
  let hovering = false;
  let focused = false;
  let visible = false;
  let stopped = false;

  // Sur mobile, les onglets forment un carrousel horizontal (balayage au doigt)
  const list = root.querySelector(".pillars-list");
  const carousel = window.matchMedia("(max-width: 900px)");
  let programmaticScroll = false;
  let programmaticTimer;
  let scrollTimer;

  root.setAttribute("data-js", "");

  // Centre de l'élément, en pixels depuis le bord gauche de l'écran
  const centerOf = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.left + rect.width / 2;
  };

  // Centre l'onglet actif dans le carrousel, sans faire défiler la page. Le navigateur
  // bloque aux extrémités : la 1re carte reste à gauche, la dernière à droite.
  const scrollToTab = (index) => {
    if (!list || !carousel.matches) return;
    programmaticScroll = true;
    clearTimeout(programmaticTimer);
    programmaticTimer = setTimeout(() => { programmaticScroll = false; }, 700);
    list.scrollTo({
      left: list.scrollLeft + centerOf(tabs[index]) - centerOf(list),
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  };

  // Chiffres qui défilent (1 248 €, 64…) quand un écran apparaît dans le téléphone
  const numberFormat = new Intl.NumberFormat("fr-FR");
  const counters = new Map();

  const setCount = (el, value) => {
    el.textContent = numberFormat.format(value) + (el.dataset.countSuffix || "");
  };

  const countUp = (panel) => {
    if (!root.hasAttribute("data-inview")) return;
    panel.querySelectorAll("[data-count]").forEach((el) => {
      const end = Number(el.dataset.count);
      cancelAnimationFrame(counters.get(el));
      if (reducedMotion.matches) {
        setCount(el, end);
        return;
      }
      const duration = 1100;
      const delay = 250; // laisse la carte commencer à monter avant de compter
      let start;
      setCount(el, 0);
      const tick = (now) => {
        if (start === undefined) start = now + delay;
        const t = Math.min(Math.max((now - start) / duration, 0), 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setCount(el, Math.round(end * eased));
        if (t < 1) counters.set(el, requestAnimationFrame(tick));
      };
      counters.set(el, requestAnimationFrame(tick));
    });
  };

  const setState = (elements, index, previous) => {
    elements.forEach((el, i) => {
      if (i === index) el.setAttribute("data-state", "active");
      else if (i === previous) el.setAttribute("data-state", "leaving");
      else el.removeAttribute("data-state");
    });
  };

  const select = (index, moveFocus) => {
    const next = (index + tabs.length) % tabs.length;
    if (next !== current) {
      tabs.forEach((tab, i) => {
        const isActive = i === next;
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });
      setState(panels, next, current);
      current = next;
      scrollToTab(next);
      countUp(panels[next]);
    }
    if (moveFocus) tabs[next].focus({ preventScroll: true });
  };

  const syncPause = () => {
    root.toggleAttribute("data-paused", hovering || focused || !visible || document.hidden);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    root.removeAttribute("data-autoplay");
  };

  if (reducedMotion.matches) {
    stopped = true;
  } else {
    root.setAttribute("data-autoplay", "");
  }

  const onMotionChange = () => {
    if (reducedMotion.matches) stop();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", onMotionChange);
  else if (reducedMotion.addListener) reducedMotion.addListener(onMotionChange);

  // La barre de progression CSS sert d'horloge : sa fin déclenche l'onglet suivant.
  root.addEventListener("animationend", (event) => {
    if (stopped || event.animationName !== "pillars-progress") return;
    select(current + 1, false);
  });

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      stop();
      select(i, false);
    });
  });

  // Balayage du carrousel : la carte la plus proche du centre devient l'onglet actif
  if (list) {
    list.addEventListener("scroll", () => {
      if (!carousel.matches || programmaticScroll) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const middle = centerOf(list);
        let closest = current;
        let best = Infinity;
        tabs.forEach((tab, i) => {
          const distance = Math.abs(centerOf(tab) - middle);
          if (distance < best) { best = distance; closest = i; }
        });
        if (closest !== current) {
          stop();
          select(closest, false);
        }
      }, 120);
    }, { passive: true });

    const syncOrientation = () => {
      list.setAttribute("aria-orientation", carousel.matches ? "horizontal" : "vertical");
    };
    syncOrientation();
    if (carousel.addEventListener) carousel.addEventListener("change", syncOrientation);
  }

  root.addEventListener("keydown", (event) => {
    const i = tabs.indexOf(event.target);
    if (i === -1) return;

    let next;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = i + 1;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = i - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    stop();
    select(next, true);
  });

  root.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hovering = true;
    syncPause();
  });
  root.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    hovering = false;
    syncPause();
  });
  root.addEventListener("focusin", () => {
    focused = true;
    syncPause();
  });
  root.addEventListener("focusout", (event) => {
    if (root.contains(event.relatedTarget)) return;
    focused = false;
    syncPause();
  });
  document.addEventListener("visibilitychange", syncPause);

  const device = root.querySelector(".pillars-device") || root;
  const markInView = () => {
    if (root.hasAttribute("data-inview")) return;
    root.setAttribute("data-inview", "");
    countUp(panels[current]);
  };

  // Le téléphone s'incline doucement vers la souris (souris uniquement, max ~7°)
  const phone = root.querySelector(".pillars-phone");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (phone && device !== root) {
    let tiltFrame;
    const resetTilt = () => {
      cancelAnimationFrame(tiltFrame);
      device.removeAttribute("data-tilting");
      phone.style.removeProperty("--pillars-tilt-x");
      phone.style.removeProperty("--pillars-tilt-y");
    };
    device.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" || !finePointer.matches || reducedMotion.matches) return;
      cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(() => {
        const rect = device.getBoundingClientRect();
        // Position de la souris de -1 à 1 par rapport au centre de la zone
        const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
        const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
        device.setAttribute("data-tilting", "");
        phone.style.setProperty("--pillars-tilt-x", `${(-y * 6).toFixed(2)}deg`);
        phone.style.setProperty("--pillars-tilt-y", `${(x * 7).toFixed(2)}deg`);
      });
    });
    device.addEventListener("pointerleave", resetTilt);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const shown = entry.isIntersecting && entry.intersectionRatio > 0.2;
          if (entry.target === root) {
            visible = shown || (visible && entry.isIntersecting);
            syncPause();
          }
          if (entry.target === device && shown) markInView();
        });
      },
      { threshold: [0, 0.25] }
    );
    observer.observe(root);
    if (device !== root) observer.observe(device);
  } else {
    visible = true;
    markInView();
  }

  syncPause();
})();
