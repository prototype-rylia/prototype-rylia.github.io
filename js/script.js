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

// Suggestions d'adresse (API Adresse - data.gouv.fr, gratuite, sans clé)
const addressInput = document.getElementById("address");
const addressSuggestions = document.getElementById("address-suggestions");

if (addressInput && addressSuggestions) {
  let debounceTimer;
  let activeIndex = -1;
  let abortController;

  const closeSuggestions = () => {
    addressSuggestions.classList.remove("is-open");
    activeIndex = -1;
  };

  const renderSuggestions = (features) => {
    addressSuggestions.innerHTML = "";
    if (!features.length) {
      closeSuggestions();
      return;
    }
    features.forEach((feature) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.textContent = feature.properties.label;
      li.addEventListener("click", () => {
        addressInput.value = feature.properties.label;
        closeSuggestions();
      });
      addressSuggestions.appendChild(li);
    });
    addressSuggestions.classList.add("is-open");
  };

  addressInput.addEventListener("input", () => {
    const query = addressInput.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      if (abortController) abortController.abort();
      closeSuggestions();
      return;
    }

    debounceTimer = setTimeout(async () => {
      if (abortController) abortController.abort();
      abortController = new AbortController();

      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
          { signal: abortController.signal }
        );
        if (!response.ok) throw new Error("Requête échouée");
        const data = await response.json();
        renderSuggestions(data.features || []);
      } catch (error) {
        if (error.name !== "AbortError") closeSuggestions();
      }
    }, 120);
  });

  addressInput.addEventListener("keydown", (event) => {
    const items = addressSuggestions.querySelectorAll("li");
    if (!addressSuggestions.classList.contains("is-open") || !items.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      items[activeIndex].click();
      return;
    } else if (event.key === "Enter") {
      // Aucune suggestion surlignée : on ferme et on laisse passer au champ suivant
      closeSuggestions();
      return;
    } else if (event.key === "Escape") {
      closeSuggestions();
      return;
    } else {
      return;
    }

    items.forEach((item, index) => item.classList.toggle("is-active", index === activeIndex));
  });

  document.addEventListener("click", (event) => {
    if (!addressInput.contains(event.target) && !addressSuggestions.contains(event.target)) {
      closeSuggestions();
    }
  });
}

// Le champ "Votre projet" grandit tout seul selon le contenu
const messageInput = document.getElementById("message");

if (messageInput) {
  const autoResize = () => {
    messageInput.style.height = "auto";
    const maxHeight = parseInt(getComputedStyle(messageInput).maxHeight, 10) || Infinity;
    const nextHeight = Math.min(messageInput.scrollHeight, maxHeight);
    messageInput.style.height = `${nextHeight}px`;
    messageInput.style.overflowY = messageInput.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  autoResize();
  messageInput.addEventListener("input", autoResize);
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

// Mesure la largeur réelle d'un texte dans la police du champ. Le ch ne convient
// pas ici : il vaut la largeur d'un chiffre, pas celle des espaces séparateurs.
// On mesure avec un élément réel (et non un canvas) pour que tabular-nums compte.
function measureText(text, element) {
  const style = getComputedStyle(element);
  const ruler = document.createElement("span");

  ruler.style.cssText = "position:absolute;top:-9999px;left:-9999px;white-space:pre";
  ["fontStyle", "fontWeight", "fontSize", "fontFamily", "letterSpacing", "fontVariantNumeric"]
    .forEach((prop) => { ruler.style[prop] = style[prop]; });
  ruler.textContent = text;

  document.body.appendChild(ruler);
  const width = ruler.getBoundingClientRect().width;
  ruler.remove();
  return width;
}

function updatePhoneWidth(prefix) {
  const format = PHONE_FORMATS[prefix] || { groups: [2, 2, 2, 2, 2] };
  const style = getComputedStyle(phoneInput);
  const fullNumber = format.groups.map((size) => "0".repeat(size)).join(" ");
  const horizontal =
    parseFloat(style.paddingLeft) +
    parseFloat(style.paddingRight) +
    parseFloat(style.borderLeftWidth) +
    parseFloat(style.borderRightWidth);

  // La bulle fait exactement la largeur d'un numéro complet (+2px pour le curseur) :
  // la saisie part de gauche et remplit le bloc, donc elle tombe centrée une fois complète
  phoneInput.style.width = `${Math.ceil(measureText(fullNumber, phoneInput) + horizontal) + 2}px`;
  // Fond neutre qui montre le groupement sans afficher de vrais chiffres
  const placeholderText = format.groups.map((size) => "•".repeat(size)).join(" ");
  phoneInput.placeholder = placeholderText;

  // Les points sont plus étroits que les chiffres qu'ils représentent : on décale
  // le texte (curseur compris) de la moitié de cet écart pour que le curseur
  // démarre pile au début des points affichés, qui restent visuellement centrés.
  // Le décalage ne s'applique que champ vide (CSS :placeholder-shown), sinon un
  // numéro complet déborderait de la bulle.
  const slack = measureText(fullNumber, phoneInput) - measureText(placeholderText, phoneInput);
  phoneInput.style.setProperty("--phone-indent", `${Math.max(slack, 0) / 2}px`);
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
  phoneError.classList.toggle("is-visible", show);
  // Empêche aussi l'envoi du formulaire tant que le numéro est incomplet
  phoneInput.setCustomValidity(show ? phoneError.textContent : "");
}

if (phoneInput && phonePrefixInput) {
  updatePhoneWidth(phonePrefixInput.value);

  // Les polices Google arrivent après le script : on remesure une fois chargées
  if (document.fonts) {
    document.fonts.ready.then(() => updatePhoneWidth(phonePrefixInput.value));
  }

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

      prefixLabel.textContent = `${option.dataset.short} (+${option.dataset.code})`;
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

// Formulaire en 3 étapes : chaque étape est validée avant de passer à la suivante.
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
    establishment: "Indiquez le nom de votre établissement",
    address: "Indiquez l'adresse de votre commerce",
  };
  let currentStep = 0;
  let resizeTimer;

  // Message d'erreur du champ, ou "" s'il est valide
  const fieldStatus = (field) => {
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

  // « Je ne sais pas encore » exclut les autres choix, et inversement
  const featureBoxes = Array.from(contactForm.querySelectorAll("input[name='features[]']"));
  featureBoxes.forEach((box) => {
    box.addEventListener("change", () => {
      if (!box.checked) return;
      featureBoxes.forEach((other) => {
        if (other !== box && (box.hasAttribute("data-exclusive") || other.hasAttribute("data-exclusive"))) {
          other.checked = false;
        }
      });
    });
  });
}

// Mur d'avis : déplier / replier
const reviews = document.getElementById("reviews");
const reviewsToggle = document.getElementById("reviews-toggle");

if (reviews && reviewsToggle) {
  reviewsToggle.addEventListener("click", () => {
    const expanded = reviews.classList.toggle("is-expanded");
    reviewsToggle.setAttribute("aria-expanded", String(expanded));
    reviewsToggle.textContent = expanded ? "Voir moins d'avis" : "Voir plus d'avis";
    if (!expanded) reviews.scrollIntoView({ behavior: "smooth", block: "start" });
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
  if (hash.length < 2) return;
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
      // Les éléments qui entrent ensemble (cartes d'avis…) apparaissent l'un après l'autre,
      // dans l'ordre de lecture, avec ~60ms d'écart
      const shown = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return Math.abs(ra.top - rb.top) > 8 ? ra.top - rb.top : ra.left - rb.left;
        });

      shown.forEach((el, i) => {
        if (i > 0 && el.classList.contains("review")) {
          el.style.setProperty("--reveal-delay", `${Math.min(i, 8) * 60}ms`);
          // Une fois apparu, le délai ne doit plus ralentir les effets de survol
          setTimeout(() => el.style.removeProperty("--reveal-delay"), Math.min(i, 8) * 60 + 600);
        }
        el.classList.add("is-visible");
        observer.unobserve(el);
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}
