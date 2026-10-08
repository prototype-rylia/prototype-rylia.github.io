(() => {
  const root = document.querySelector("[data-pillars]");
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
  if (!tabs.length || panels.includes(null)) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = Math.max(0, tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"));
  let visible = false;
  let stopped = false;

  // Sur mobile, les onglets passent en ligne au-dessus du téléphone
  const list = root.querySelector(".pillars-list");
  const mobile = window.matchMedia("(max-width: 900px)");

  root.setAttribute("data-js", "");

  // Mobile : le texte du pilier choisi s'affiche dans une carte posée sur le bas du téléphone.
  // C'est une copie visuelle du texte des onglets (déjà lu par les lecteurs d'écran), d'où aria-hidden.
  const detail = document.createElement("div");
  detail.className = "pillars-detail";
  detail.setAttribute("aria-hidden", "true");
  const detailItems = tabs.map((tab, i) => {
    const item = document.createElement("div");
    item.className = "pillars-detail-item";
    if (i === current) item.setAttribute("data-state", "active");
    const title = document.createElement("p");
    title.className = "pillars-detail-title";
    title.textContent = tab.querySelector(".pillars-title").textContent;
    item.appendChild(title);
    tab.querySelectorAll(".pillars-desc, .pillars-points").forEach((el) => item.appendChild(el.cloneNode(true)));
    detail.appendChild(item);
    return item;
  });
  root.appendChild(detail);

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
      setState(detailItems, next, current);
      current = next;
      countUp(panels[next]);
    }
    if (moveFocus) tabs[next].focus({ preventScroll: true });
  };

  // Pause seulement hors écran ou onglet du navigateur caché (plus au survol ni au focus)
  const syncPause = () => {
    root.toggleAttribute("data-paused", !visible || document.hidden);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    root.removeAttribute("data-autoplay");
  };

  // Choix manuel (clic, clavier, balayage) : l'onglet choisi reste affiché, sa barre
  // repart 3,5 s plus tard (délai CSS posé par data-resume), puis le défilement reprend
  const chooseManually = (index, moveFocus) => {
    const next = (index + tabs.length) % tabs.length;
    root.setAttribute("data-resume", "");
    if (next === current) {
      // Même onglet : on relance sa barre depuis le début
      const fill = tabs[current].querySelector(".pillars-progress-fill");
      if (fill) {
        fill.style.animation = "none";
        void fill.offsetWidth;
        fill.style.animation = "";
      }
    }
    select(next, moveFocus);
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
    if (stopped || !event.animationName.startsWith("pillars-progress")) return;
    root.removeAttribute("data-resume");
    select(current + 1, false);
  });

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => chooseManually(i, false));
  });

  // Mobile : un balayage horizontal sur le téléphone ou la carte passe au pilier voisin
  let swipeStart = null;
  [root.querySelector(".pillars-device"), detail].forEach((zone) => {
    if (!zone) return;
    zone.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || !mobile.matches) return;
      swipeStart = { x: event.clientX, y: event.clientY };
    });
    zone.addEventListener("pointerup", (event) => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) chooseManually(current + (dx < 0 ? 1 : -1), false);
    });
    zone.addEventListener("pointercancel", () => { swipeStart = null; });
  });

  if (list) {
    const syncOrientation = () => {
      list.setAttribute("aria-orientation", mobile.matches ? "horizontal" : "vertical");
    };
    syncOrientation();
    if (mobile.addEventListener) mobile.addEventListener("change", syncOrientation);
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
    chooseManually(next, true);
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
