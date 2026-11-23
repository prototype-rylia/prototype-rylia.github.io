document.getElementById("year").textContent = new Date().getFullYear();

// Au rafraîchissement, la page repart toujours du haut : le navigateur ne restaure plus
// la position, et l'ancre éventuelle (#contact…) est retirée de l'adresse.
// Un lien partagé vers une ancre continue de fonctionner à la première ouverture.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const navEntry = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
if (navEntry && navEntry.type === "reload") {
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: "instant" });
  window.addEventListener("load", () => window.scrollTo({ top: 0, behavior: "instant" }));
}

// Menu mobile
const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

burger.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", String(isOpen));
});

nav.querySelectorAll(".nav__link").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  });
});

// Menu : le lien de la section en cours est souligné ;
// sur la section Contact, le bouton « Nous contacter » s'efface
const spyHeader = document.getElementById("header");
const spySections = [
  ["accueil", "#accueil"],
  ["contact", "#contact"],
]
  .map(([id, href]) => [document.getElementById(id), href])
  .filter(([section]) => section);
if (spySections.length) {
  const navLinks = Array.from(nav.querySelectorAll(".nav__link"));
  let current = null;
  let ticking = false;
  const spy = () => {
    ticking = false;
    // Dernière section dont le haut a passé le tiers de l'écran
    const line = window.innerHeight * 0.35;
    let section = spySections[0];
    spySections.forEach((entry) => { if (entry[0].getBoundingClientRect().top <= line) section = entry; });
    // Tout en bas de la page, c'est forcément le contact
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) section = spySections[spySections.length - 1];
    const key = section[0].id;
    if (key === current) return;
    current = key;
    navLinks.forEach((link) => {
      const on = link.getAttribute("href") === section[1];
      link.classList.toggle("is-current", on);
      if (on) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    if (spyHeader) spyHeader.classList.toggle("is-on-contact", key === "contact");
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(spy); }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  spy();
}

// Validation de l'email à la sortie du champ (pas pendant la saisie)
const emailInput = document.getElementById("email");
const emailError = document.getElementById("email-error");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (emailInput && emailError) {
  emailInput.addEventListener("blur", () => {
    const isValid = emailInput.value === "" || EMAIL_PATTERN.test(emailInput.value);
    if (!isValid) emailError.textContent = "Adresse email invalide (ex : nom@domaine.fr)";
    emailInput.classList.toggle("is-invalid", !isValid);
    emailError.classList.toggle("is-visible", !isValid);
  });

  emailInput.addEventListener("input", () => {
    if (!emailInput.classList.contains("is-invalid")) return;
    const isValid = EMAIL_PATTERN.test(emailInput.value);
    if (isValid) {
      emailInput.classList.remove("is-invalid");
      emailError.classList.remove("is-visible");
    }
  });
}

// Formatage dynamique du numéro de téléphone selon l'indicatif
const PHONE_FORMATS = {
  "33": { groups: [2, 2, 2, 2, 2] }, // France : •• •• •• •• ••
  "32": { groups: [3, 2, 2, 2] },    // Belgique : ••• •• •• ••
};

const phonePrefixInput = document.getElementById("phone-prefix");
const phoneInput = document.getElementById("phone");
const phoneFullInput = document.getElementById("phone-full");

function maxDigitsFor(prefix) {
  const format = PHONE_FORMATS[prefix] || { groups: [2, 2, 2, 2, 2] };
  return format.groups.reduce((sum, n) => sum + n, 0);
}

function formatPhone(rawDigits, prefix) {
  const format = PHONE_FORMATS[prefix] || { groups: [2, 2, 2, 2, 2] };
  const digits = rawDigits.slice(0, maxDigitsFor(prefix));

  const parts = [];
  let cursor = 0;
  for (const size of format.groups) {
    if (cursor >= digits.length) break;
    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }
  return parts.join(" ");
}

function updateFullPhone() {
  const digits = phoneInput.value.replace(/\D/g, "");
  phoneFullInput.value = digits ? `+${phonePrefixInput.value} ${digits}` : "";
}

// Exemple de numéro affiché dans le champ vide, selon le pays choisi
const PHONE_EXAMPLES = { "33": "06 12 34 56 78", "32": "470 12 34 56" };
function updatePhoneWidth(prefix) {
  phoneInput.placeholder = PHONE_EXAMPLES[prefix] || "";
}

// Validation du téléphone : même logique que l'email (erreur à la sortie du champ)
const phoneError = document.getElementById("phone-error");

function isPhoneComplete() {
  const digits = phoneInput.value.replace(/\D/g, "");
  return digits.length === maxDigitsFor(phonePrefixInput.value);
}

function showPhoneError(show) {
  if (!phoneError) return;
  phoneError.textContent = `Numéro incomplet : ${maxDigitsFor(phonePrefixInput.value)} chiffres attendus`;
  phoneInput.classList.toggle("is-invalid", show);
  phoneInput.closest(".phone-group").classList.toggle("is-invalid", show);
  phoneError.classList.toggle("is-visible", show);
  // Empêche aussi l'envoi du formulaire tant que le numéro est incomplet
  phoneInput.setCustomValidity(show ? phoneError.textContent : "");
}

if (phoneInput && phonePrefixInput) {
  updatePhoneWidth(phonePrefixInput.value);

  phoneInput.addEventListener("input", () => {
    const digits = phoneInput.value.replace(/\D/g, "");
    phoneInput.value = formatPhone(digits, phonePrefixInput.value);
    updateFullPhone();
    // Une fois le numéro complété, l'erreur disparaît immédiatement
    if (phoneInput.classList.contains("is-invalid") && isPhoneComplete()) showPhoneError(false);
  });

  phoneInput.addEventListener("blur", () => {
    showPhoneError(phoneInput.value !== "" && !isPhoneComplete());
  });

  // Bloque toute frappe qui n'est pas un chiffre (espaces, lettres, symboles impossibles à saisir)
  phoneInput.addEventListener("keydown", (event) => {
    const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End", "Enter"];
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      return;
    }
    const digits = phoneInput.value.replace(/\D/g, "");
    if (digits.length >= maxDigitsFor(phonePrefixInput.value)) {
      event.preventDefault();
    }
  });

  phoneInput.addEventListener("paste", (event) => {
    event.preventDefault();
    const pasted = (event.clipboardData || window.clipboardData).getData("text");
    const digits = (phoneInput.value + pasted).replace(/\D/g, "");
    phoneInput.value = formatPhone(digits, phonePrefixInput.value);
    updateFullPhone();
  });
}

// Sélecteur d'indicatif personnalisé (FR replié, nom complet dans la liste)
const prefixSelect = document.getElementById("phone-prefix-select");
const prefixToggle = document.getElementById("phone-prefix-toggle");
const prefixLabel = document.getElementById("phone-prefix-label");
const prefixFlag = document.getElementById("phone-prefix-flag");
const prefixList = document.getElementById("phone-prefix-list");

if (prefixSelect && prefixToggle && prefixList) {
  const openList = () => {
    prefixList.hidden = false;
    prefixSelect.classList.add("is-open");
    prefixToggle.setAttribute("aria-expanded", "true");
  };
  const closeList = () => {
    prefixList.hidden = true;
    prefixSelect.classList.remove("is-open");
    prefixToggle.setAttribute("aria-expanded", "false");
  };

  prefixToggle.addEventListener("click", () => {
    prefixList.hidden ? openList() : closeList();
  });

  prefixList.querySelectorAll("li").forEach((option) => {
    option.addEventListener("click", () => {
      prefixList.querySelectorAll("li").forEach((li) => li.setAttribute("aria-selected", "false"));
      option.setAttribute("aria-selected", "true");

      prefixLabel.textContent = `+${option.dataset.code}`;
      prefixFlag.innerHTML = option.querySelector(".custom-select__flag").innerHTML;
      phonePrefixInput.value = option.dataset.code;
      updatePhoneWidth(phonePrefixInput.value);

      const digits = phoneInput.value.replace(/\D/g, "");
      phoneInput.value = formatPhone(digits, phonePrefixInput.value);
      updateFullPhone();
      // Le nombre de chiffres attendu change avec l'indicatif : on réévalue
      showPhoneError(phoneInput.value !== "" && !isPhoneComplete());

      closeList();
    });
  });

  document.addEventListener("click", (event) => {
    if (!prefixSelect.contains(event.target)) closeList();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeList();
  });
}

// Formulaire en 2 étapes : chaque étape est validée avant de passer à la suivante.
// Sans JS, toutes les étapes restent affichées et la validation native du navigateur s'applique.
const contactForm = document.getElementById("contact-form");

if (contactForm) {
  const steps = Array.from(contactForm.querySelectorAll(".form-step"));
  const stepsNav = contactForm.querySelector(".form-steps");
  const stepItems = Array.from(contactForm.querySelectorAll(".form-steps__item"));
  const stepButtons = Array.from(contactForm.querySelectorAll(".form-steps__btn"));
  const stepStatus = document.getElementById("form-steps-status");
  const panels = contactForm.querySelector(".form-panels");
  const backBtn = contactForm.querySelector("[data-step-back]");
  const nextBtn = contactForm.querySelector("[data-step-next]");
  const submitBtn = contactForm.querySelector(".form-nav__submit");
  const stepTitles = steps.map((step) => step.querySelector(".form-step__title").textContent.trim());
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const requiredSelector = "input[required], textarea[required]";
  const EMPTY_MESSAGES = {
    name: "Indiquez votre nom",
    email: "Indiquez votre adresse email",
    phone: "Indiquez votre numéro de téléphone",
  };
  let currentStep = 0;
  let resizeTimer;

  // Message d'erreur du champ, ou "" s'il est valide
  const fieldStatus = (field) => {
    // Choix « email ou téléphone » : un des boutons doit être coché
    if (field.type === "radio") {
      return contactForm.querySelector(`input[name="${field.name}"]:checked`) ? "" : "Choisissez un moyen de contact";
    }
    const value = field.value.trim();
    if (field.required && !value) return EMPTY_MESSAGES[field.id] || "Ce champ est requis";
    if (field === emailInput && !EMAIL_PATTERN.test(value)) return "Adresse email invalide (ex : nom@domaine.fr)";
    if (field === phoneInput && !isPhoneComplete()) {
      return `Numéro incomplet : ${maxDigitsFor(phonePrefixInput.value)} chiffres attendus`;
    }
    return "";
  };

  const showFieldError = (field, message) => {
    const error = document.getElementById(`${field.id}-error`);
    field.classList.toggle("is-invalid", Boolean(message));
    if (!error) return;
    if (message) error.textContent = message;
    error.classList.toggle("is-visible", Boolean(message));
  };

  // Pastille verte à côté du libellé dès que le champ obligatoire est valide
  const refreshValid = (field) => {
    field.closest(".field").classList.toggle("is-valid", !fieldStatus(field));
  };

  contactForm.querySelectorAll(requiredSelector).forEach((field) => {
    field.addEventListener("input", () => {
      refreshValid(field);
      if (field.classList.contains("is-invalid") && !fieldStatus(field)) showFieldError(field, "");
    });
    field.addEventListener("blur", () => refreshValid(field));
  });
  if (prefixList && phoneInput) prefixList.addEventListener("click", () => refreshValid(phoneInput));
  // Un clic sur « Par email » ou « Par téléphone » efface l'erreur du choix
  const prefFirst = document.getElementById("pref-email");
  contactForm.querySelectorAll('input[name="contact_prefere"]').forEach((radio) => {
    radio.addEventListener("change", () => { if (prefFirst) showFieldError(prefFirst, ""); });
  });

  contactForm.addEventListener("animationend", (event) => {
    if (event.animationName === "field-shake") event.target.classList.remove("is-shaking");
  });

  const validateStep = (index) => {
    const invalid = Array.from(steps[index].querySelectorAll(requiredSelector)).filter((field) => {
      const message = fieldStatus(field);
      showFieldError(field, message);
      return Boolean(message);
    });
    invalid.forEach((field) => {
      const wrapper = field.closest(".field");
      wrapper.classList.remove("is-shaking");
      void wrapper.offsetWidth; // relance l'animation si elle vient de jouer
      wrapper.classList.add("is-shaking");
    });
    if (invalid.length) invalid[0].focus();
    return !invalid.length;
  };

  const updateStepUI = () => {
    stepItems.forEach((item, i) => {
      item.classList.toggle("is-done", i < currentStep);
      item.classList.toggle("is-current", i === currentStep);
    });
    stepButtons.forEach((btn, i) => {
      if (i === currentStep) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
      // On revient librement sur une étape faite, sans pouvoir sauter en avant
      btn.disabled = i > currentStep;
    });
    // La barre orange du haut de la carte se remplit à chaque étape
    contactForm.style.setProperty("--form-progress", (currentStep + 1) / steps.length);
    const isLast = currentStep === steps.length - 1;
    backBtn.hidden = currentStep === 0;
    nextBtn.hidden = isLast;
    submitBtn.hidden = !isLast;
  };

  const endResize = () => {
    clearTimeout(resizeTimer);
    panels.classList.remove("is-resizing");
    panels.style.height = "";
  };

  const showStep = (index, moveFocus = true) => {
    if (index === currentStep || !steps[index]) return;
    const forward = index > currentStep;
    const startHeight = panels.offsetHeight;

    steps[currentStep].hidden = true;
    const step = steps[index];
    step.hidden = false;
    step.classList.remove("is-entering", "is-entering-back");
    void step.offsetWidth;
    step.classList.add(forward ? "is-entering" : "is-entering-back");
    currentStep = index;
    updateStepUI();
    stepStatus.textContent = `Étape ${index + 1} sur ${steps.length} : ${stepTitles[index]}`;
    if (index === 0 && phoneInput) updatePhoneWidth(phonePrefixInput.value);

    // La carte passe en douceur de la hauteur de l'ancienne étape à celle de la nouvelle
    endResize();
    const endHeight = panels.offsetHeight;
    if (!reduceMotion && startHeight !== endHeight) {
      panels.style.height = `${startHeight}px`;
      panels.classList.add("is-resizing");
      void panels.offsetHeight;
      panels.style.height = `${endHeight}px`;
      resizeTimer = setTimeout(endResize, 450);
    }

    if (contactForm.getBoundingClientRect().top < 0) {
      contactForm.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    if (moveFocus) {
      const first = step.querySelector("input:not([type='hidden']):not([type='checkbox']), textarea");
      if (first) first.focus({ preventScroll: true });
    }
  };

  panels.addEventListener("transitionend", (event) => {
    if (event.target === panels && event.propertyName === "height") endResize();
  });

  // Activation du mode étapes
  contactForm.classList.add("is-stepped");
  contactForm.noValidate = true;
  stepsNav.hidden = false;
  steps.forEach((step, i) => { step.hidden = i !== 0; });
  updateStepUI();

  nextBtn.addEventListener("click", () => {
    if (validateStep(currentStep)) showStep(currentStep + 1);
  });
  backBtn.addEventListener("click", () => showStep(currentStep - 1));
  stepButtons.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      if (i < currentStep) showStep(i);
    });
  });

  // Filet de sécurité à l'envoi : on renvoie vers la première étape incomplète
  contactForm.addEventListener("submit", (event) => {
    const invalidIndex = steps.findIndex((step) =>
      Array.from(step.querySelectorAll(requiredSelector)).some((field) => fieldStatus(field))
    );
    event.preventDefault();
    if (invalidIndex !== -1) {
      showStep(invalidIndex, false);
      validateStep(invalidIndex);
      return;
    }
    sendForm();
  });

  // Envoi en arrière-plan puis redirection vers la page de remerciement du site
  // (sans JS, le formulaire s'envoie normalement et Formspree affiche sa propre page)
  const submitLabels = submitBtn.querySelectorAll(".btn__roll > span");
  const sendError = document.getElementById("form-send-error");
  let sending = false;

  const setSending = (state) => {
    sending = state;
    submitBtn.disabled = state;
    submitBtn.classList.toggle("is-loading", state);
    submitLabels.forEach((label) => { label.textContent = state ? "Envoi en cours…" : "Envoyer ma demande"; });
  };

  const sendForm = async () => {
    if (sending) return;
    if (sendError) sendError.classList.remove("is-visible");
    setSending(true);
    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Envoi refusé");
      window.location.href = "merci.html";
    } catch (error) {
      setSending(false);
      if (sendError) sendError.classList.add("is-visible");
    }
  };

  // Entrée dans un champ = passe au champ suivant de l'étape, puis à l'étape suivante
  contactForm.addEventListener("keydown", (event) => {
    // defaultPrevented : un autre handler a déjà traité la touche (ex : choix d'une suggestion d'adresse)
    if (event.key !== "Enter" || event.shiftKey || event.defaultPrevented) return;

    const current = event.target;
    // Le textarea garde le retour à la ligne, les boutons gardent leur comportement
    if (!(current instanceof HTMLInputElement) || current.type === "hidden") return;
    // Une case à cocher n'envoie pas le formulaire
    if (current.type === "checkbox") {
      event.preventDefault();
      return;
    }

    const fields = Array.from(
      contactForm.querySelectorAll("input:not([type='hidden']):not([type='checkbox']), textarea")
    ).filter((field) => !field.disabled && !field.readOnly && !field.closest("[hidden]"));

    const next = fields[fields.indexOf(current) + 1];
    if (next) {
      event.preventDefault();
      next.focus();
    } else if (!nextBtn.hidden) {
      event.preventDefault();
      nextBtn.click();
    }
  });
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// En-tête compact et barre de progression de lecture, mis à jour une fois par image
const header = document.getElementById("header");
const progress = document.querySelector(".scroll-progress");
let scrollTicking = false;

const onScrollFrame = () => {
  scrollTicking = false;
  const y = window.scrollY;
  // Seuils différents à l'aller et au retour : pas de clignotement autour de la limite
  if (header) {
    if (y > 24) header.classList.add("is-scrolled");
    else if (y < 8) header.classList.remove("is-scrolled");
  }
  if (progress) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty("--scroll-progress", max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);
  }
};
const requestScrollFrame = () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(onScrollFrame);
};
window.addEventListener("scroll", requestScrollFrame, { passive: true });
window.addEventListener("resize", requestScrollFrame);
onScrollFrame();

// Liens internes : défilement doux, puis léger fondu de la section à l'arrivée
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  const hash = link.getAttribute("href");
  // Les boutons qui ouvrent le formulaire en mode focus ont leur propre logique (plus bas)
  if (hash.length < 2 || link.hasAttribute("data-open-form")) return;
  const target = document.getElementById(hash.slice(1));
  const section = target && target.closest("main > section");
  if (!section) return;

  link.addEventListener("click", (event) => {
    if (prefersReducedMotion.matches || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();

    const arrive = () => {
      section.classList.remove("section-arrive");
      void section.offsetWidth; // relance l'animation si on reclique sur le même lien
      section.classList.add("section-arrive");
    };
    const startY = window.scrollY;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.pushState(null, "", hash);
    // Focus pour le clavier et les lecteurs d'écran, sans relancer de défilement
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });

    // Le fondu part quand le défilement se termine (scrollend, avec un filet de secours)
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("scrollend", finish);
      arrive();
    };
    if ("onscrollend" in window) window.addEventListener("scrollend", finish);
    setTimeout(finish, 1200);
    // Déjà sur place (rien n'a bougé après deux images) : le fondu part tout de suite
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - startY) < 1) finish();
    }));
  });
});

document.addEventListener("animationend", (event) => {
  if (event.animationName === "section-arrive") event.target.closest("section").classList.remove("section-arrive");
});

// Apparition au scroll
const revealEls = document.querySelectorAll(".reveal");

// Les éléments d'une liste en cascade connaissent leur rang
document.querySelectorAll(".reveal--stagger").forEach((list) => {
  Array.from(list.children).forEach((child, i) => child.style.setProperty("--stagger-index", i));
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// Tarifs (à gauche du formulaire) : bascule Application / Site web, puis Restauration / Institut
// (application seulement), puis la durée dans la carte.
const plans = document.querySelector("[data-plans]");
const plansData = (() => {
  try { return JSON.parse(document.getElementById("plans-data").textContent); } catch (error) { return null; }
})();
if (plans && plansData) {
  const productSwitch = plans.querySelector(".plans__switch--product");
  const durationSwitch = plans.querySelector(".plans__switch--duration");
  const sectorBox = plans.querySelector("[data-plan-sector]");
  const sectors = Array.from(plans.querySelectorAll(".plans__switch--sector .plans__option"));
  const products = Array.from(productSwitch.querySelectorAll(".plans__option"));
  const durations = Array.from(durationSwitch.querySelectorAll(".plans__option"));
  const head = plans.querySelector("[data-plan-head]");
  const features = plans.querySelector("[data-plan-features]");
  const featureIcon = features.querySelector("svg").outerHTML;
  const field = (name) => plans.querySelector(`[data-plan-${name}]`);
  const canAnimate = () => !prefersReducedMotion.matches && typeof head.animate === "function";
  const euros = (n) => `${n.toLocaleString("fr-FR")}&nbsp;€`;
  let fadeTimer = 0;

  const checked = (group) => group.find((o) => o.getAttribute("aria-checked") === "true") || group[0];
  // Offre affichée : le site web, ou l'application du type de commerce choisi
  const isSite = () => checked(products).dataset.product === "site";
  const offer = () => (isSite() ? plansData.site : plansData[checked(sectors).dataset.sector]);
  const listOf = (product) => product.inclus.map((text) => `<li>${featureIcon}${text}</li>`).join("");

  // Remise d'une durée par rapport au sans engagement, en %
  const discount = (product, i) => Math.round(((product.prix[0] - product.prix[i]) / product.prix[0]) * 100);

  // Nom de la durée, prix et prix barré pour une durée donnée
  const showPrice = (index) => {
    const product = offer();
    field("name").textContent = plansData.durees[index];
    field("price").textContent = product.prix[index];
    field("was").innerHTML = euros(product.prix[0]);
    field("was").hidden = index === 0;
  };

  const fill = () => {
    const product = offer();
    const index = Number(checked(durations).dataset.duration);
    // Pour le site web, une phrase remplace le choix Restauration / Institut
    plans.classList.toggle("is-site", isSite());
    sectorBox.firstElementChild.inert = isSite();
    sectorBox.lastElementChild.setAttribute("aria-hidden", String(!isSite()));
    showPrice(index);
    // Pastilles « -% » en haut à droite de 1 an et 2 ans
    durations.forEach((option, i) => {
      const badge = option.querySelector("[data-plan-badge]");
      if (!badge) return;
      const percent = discount(product, i);
      badge.innerHTML = `-${percent}&nbsp;%`;
      badge.hidden = percent <= 0;
    });
    const list = listOf(product);
    const listChanged = features.dataset.list !== undefined && features.dataset.list !== list;
    features.dataset.list = list;
    features.innerHTML = list;
    return listChanged;
  };

  // Changement : le prix (et la liste si elle change) s'efface, se met à jour, puis revient
  const update = () => {
    if (!canAnimate()) { fill(); return; }
    clearTimeout(fadeTimer);
    const productChanged = features.dataset.list !== listOf(offer());
    plans.classList.toggle("is-site", isSite());
    const targets = productChanged ? [head, features] : [head];
    targets.forEach((el) => el.classList.add("is-out"));
    fadeTimer = setTimeout(() => {
      fill();
      targets.forEach((el) => el.classList.remove("is-out"));
    }, 220);
  };

  // Pastille orange de la bascule Application / Site web : glisse sous l'option choisie
  // (option : par défaut celle choisie ; pour la durée, aussi celle survolée)
  const moveThumb = (group, animate, option = checked(group)) => {
    const thumb = option.parentElement.querySelector(".plans__thumb");
    if (!thumb) return;
    // Le texte passe en blanc sous la pilule noire de la durée
    if (group === durations) group.forEach((o) => o.classList.toggle("is-lit", o === option));
    thumb.style.transition = animate ? "" : "none";
    thumb.style.width = `${option.offsetWidth}px`;
    thumb.style.transform = `translateX(${option.offsetLeft}px)`;
  };
  productSwitch.classList.add("has-thumb");
  sectorBox.firstElementChild.classList.add("has-thumb");
  durationSwitch.classList.add("has-thumb");

  const choose = (group, option, moveFocus) => {
    if (option.getAttribute("aria-checked") === "true") return;
    group.forEach((o) => {
      const on = o === option;
      o.setAttribute("aria-checked", String(on));
      o.tabIndex = on ? 0 : -1;
    });
    moveThumb(group, !prefersReducedMotion.matches);
    update();
    if (moveFocus) option.focus();
  };


  [products, sectors, durations].forEach((group) => {
    group.forEach((option, i) => {
      option.tabIndex = option.getAttribute("aria-checked") === "true" ? 0 : -1;
      option.addEventListener("click", () => choose(group, option, false));
      option.addEventListener("keydown", (event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        choose(group, group[(i + step + group.length) % group.length], true);
      });
    });
  });

  // Placement initial, puis à chaque changement de taille (polices chargées, rotation, etc.)
  let lastWidth = 0;
  const layout = () => {
    if (plans.offsetWidth === lastWidth) return;
    lastWidth = plans.offsetWidth;
    moveThumb(products, false);
    moveThumb(sectors, false);
    moveThumb(durations, false);
  };
  fill();
  layout();
  if (document.fonts) document.fonts.ready.then(() => { lastWidth = 0; layout(); });
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(plans);
  else window.addEventListener("resize", layout);
}

// Mode focus du formulaire : sur ordinateur, il vient au centre de l'écran et la page se floute ;
// sur mobile, il passe en plein écran. Sortie : bouton Quitter, Échap, clic à côté, ou défilement.
const focusForm = document.getElementById("contact-form");
if (focusForm) {
  const root = document.documentElement;
  const phone = window.matchMedia("(max-width: 900px)");
  const backdrop = document.createElement("div");
  backdrop.className = "form-focus-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  document.body.appendChild(backdrop);

  const quit = document.createElement("button");
  quit.type = "button";
  quit.className = "form-focus-quit";
  // Hors de l'ordre de tabulation : après le dernier champ, Tab va directement à « Suivant »
  // (Échap quitte aussi le mode focus au clavier)
  quit.tabIndex = -1;
  quit.innerHTML = 'Quitter<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  // Dans la barre du bas du formulaire, à l'opposé de « Suivant »
  const formNav = focusForm.querySelector(".form-nav");
  if (formNav) formNav.prepend(quit);
  else focusForm.appendChild(quit);

  let active = false;
  let placeholder = null;
  let savedScroll = 0;
  let anchor = 0;
  let closest = Infinity;

  const open = () => {
    if (active) return;
    active = true;
    if (phone.matches) {
      // Plein écran : une cale garde la place du formulaire pour que la page ne saute pas
      savedScroll = window.scrollY;
      const style = getComputedStyle(focusForm);
      placeholder = document.createElement("div");
      placeholder.style.height = `${focusForm.offsetHeight}px`;
      placeholder.style.order = style.order;
      placeholder.style.marginTop = style.marginTop;
      focusForm.after(placeholder);
      root.classList.add("is-form-fullscreen");
    } else {
      // Le formulaire glisse jusqu'au centre de l'écran (hauteur et largeur), quelle que soit sa place dans la page
      // (en bas de page, le défilement seul ne suffit pas à le centrer)
      const rect = focusForm.getBoundingClientRect();
      const margin = 20;
      const top = rect.height > window.innerHeight - margin * 2 ? margin : (window.innerHeight - rect.height) / 2;
      anchor = window.scrollY;
      closest = Infinity;
      focusForm.style.transition = prefersReducedMotion.matches ? "none" : "translate 480ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms ease";
      const left = (document.documentElement.clientWidth - rect.width) / 2;
      focusForm.style.translate = `${Math.round(left - rect.left)}px ${Math.round(top - rect.top)}px`;
    }
    root.classList.add("is-form-focus");
  };

  const close = () => {
    if (!active) return;
    active = false;
    root.classList.remove("is-form-focus", "is-form-fullscreen");
    focusForm.style.translate = "";
    if (placeholder) {
      placeholder.remove();
      placeholder = null;
      window.scrollTo(0, savedScroll);
    }
  };

  // Le navigateur pose sa liste de saisie automatique (emails, noms déjà tapés) sous le champ
  // au moment du focus, puis ne la déplace plus : pendant que le formulaire glisse au centre,
  // le champ perd le focus et le retrouve une fois arrivé, pour que la liste s'ouvre au bon endroit
  const SLIDE_MS = 520;
  const isSliding = () => !phone.matches && !prefersReducedMotion.matches && focusForm.style.translate !== "" && focusForm.style.translate !== "0px 0px" && focusForm.style.translate !== "0px";
  const focusAfterSlide = (field) => {
    if (!isSliding()) { field.focus({ preventScroll: true }); return; }
    setTimeout(() => { if (active) field.focus({ preventScroll: true }); }, SLIDE_MS);
  };
  focusForm.addEventListener("focusin", (event) => {
    if (!event.target.matches("input:not([type='hidden']), textarea, select")) return;
    if (active) return;
    open();
    if (isSliding()) {
      event.target.blur();
      focusAfterSlide(event.target);
    }
  });
  quit.addEventListener("click", () => {
    close();
    if (document.activeElement) document.activeElement.blur();
  });
  backdrop.addEventListener("click", close);
  focusForm.addEventListener("transitionend", (event) => {
    if (event.target === focusForm && event.propertyName === "translate" && !active) focusForm.style.transition = "";
  });

  // « Nous contacter » : on va au formulaire et il s'ouvre directement en mode focus
  const firstField = focusForm.querySelector("input:not([type='hidden']):not([tabindex='-1'])");
  const openFromButton = () => {
    open();
    if (firstField) focusAfterSlide(firstField);
  };
  document.querySelectorAll("[data-open-form]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      if (active) { openFromButton(); return; }
      if (phone.matches) { openFromButton(); return; }
      // Ordinateur : défilement jusqu'au formulaire, puis ouverture une fois arrivé
      const rect = focusForm.getBoundingClientRect();
      const target = Math.max(0, window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2);
      if (Math.abs(target - window.scrollY) < 4 || prefersReducedMotion.matches) {
        window.scrollTo(0, target);
        openFromButton();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.removeEventListener("scrollend", finish);
        openFromButton();
      };
      window.addEventListener("scrollend", finish);
      setTimeout(finish, 1100);
      window.scrollTo({ top: target, behavior: "smooth" });
    });
  });
  document.addEventListener("keydown", (event) => {
    // Échap ferme d'abord une liste de suggestions ouverte
    if (event.key !== "Escape" || !active || focusForm.querySelector("[aria-expanded='true']")) return;
    close();
  });
  // Sur ordinateur, s'éloigner du formulaire en faisant défiler la page quitte le mode focus
  window.addEventListener("scroll", () => {
    if (!active || phone.matches) return;
    const distance = Math.abs(window.scrollY - anchor);
    closest = Math.min(closest, distance);
    if (distance > closest + 240) close();
  }, { passive: true });
  if (phone.addEventListener) phone.addEventListener("change", close);
}
