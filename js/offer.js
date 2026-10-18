// ---------- Offre temporaire ----------
// Réglages. Après une modification de ce fichier, incrémenter ?v=N dans index.html.
const OFFRE = {
  nom: "Offre de lancement : -50 % pendant 6 mois",
  fin: "2026-11-01T00:00:00+01:00", // samedi 31 octobre à minuit, heure de Paris
  placesTotal: 10,
  joursAffichageApresFin: 2, // l'offre reste affichée « terminée » pendant 2 jours, puis disparaît

  // Compteur automatique : renseigner l'URL et la clé publique du projet Supabase
  // (voir supabase/offre.sql). Laissés vides, ce sont les deux valeurs manuelles ci-dessous qui comptent.
  supabaseUrl: "https://egdfgltaizlcbrrkewgh.supabase.co",
  supabaseCle: "sb_publishable_ta-WwmbRLynCvZFkfjh2yw_nKYDIzjJ", // clé publique : sans risque dans le site

  // Mode manuel (utilisé seulement si Supabase n'est pas renseigné)
  placesPrises: 0,
  completLe: "", // date de la 10e inscription, ex. "2026-10-24T15:30:00+02:00"
};

(() => {
  const bar = document.querySelector(".offer-bar");
  const section = document.getElementById("offre");
  const blocks = document.querySelectorAll("[data-offer]");
  if (!blocks.length) return;

  const DAY = 86400000;
  const fin = new Date(OFFRE.fin).getTime();
  const total = OFFRE.placesTotal;
  const dateFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
  const pad = (n) => String(n).padStart(2, "0");

  // Compte à rebours en rouleaux : chaque chiffre défile sur une bande « 9 0 1 2 … 9 »,
  // le 9 du haut permet de passer de 0 à 9 en continuant à descendre
  const REEL = "90123456789";
  const reelHtml = `<span class="offer__digit"><span class="offer__reel">${[...REEL].map((d) => `<span>${d}</span>`).join("")}</span></span>`;
  const setReel = (el, text) => {
    if (el.dataset.len !== String(text.length)) {
      el.innerHTML = reelHtml.repeat(text.length);
      el.dataset.len = text.length;
    }
    el.querySelectorAll(".offer__reel").forEach((reel, i) => {
      const d = Number(text[i]);
      const prev = reel.dataset.d === undefined ? null : Number(reel.dataset.d);
      reel.dataset.d = d;
      const go = (index, animate) => {
        reel.style.transition = animate ? "" : "none";
        reel.style.transform = `translateY(${(-index * 100) / REEL.length}%)`;
      };
      if (prev === 0 && d === 9) {
        go(0, true);
        setTimeout(() => { if (reel.dataset.d === "9") go(10, false); }, 650);
      } else {
        go(d + 1, prev !== null && prev !== d);
      }
    });
  };
  const plural = (n, one, many) => (n > 1 ? many : one);
  const setAll = (selector, fn) => document.querySelectorAll(selector).forEach(fn);
  let timer;

  const remove = () => {
    clearTimeout(timer);
    blocks.forEach((block) => block.remove());
    document.documentElement.style.removeProperty("--offer-bar-h");
  };

  // Calcule l'état à partir du nombre de places prises et de la date de la dernière place
  const stateOf = ({ prises, completLe }) => {
    const now = Date.now();
    const full = prises >= total;
    let endedAt = fin;
    if (full) endedAt = Math.min(fin, completLe ? new Date(completLe).getTime() : now);
    if (now < endedAt) return { status: "active", prises };
    if (now < endedAt + OFFRE.joursAffichageApresFin * DAY) return { status: "ended", prises, full, endedAt };
    return { status: "gone" };
  };

  const setCta = (link, label) => {
    if (!link) return;
    link.querySelectorAll(".btn__roll > span").forEach((span) => { span.textContent = label; });
  };

  const render = (state) => {
    clearTimeout(timer);
    if (state.status === "gone") { remove(); return; }

    const prises = Math.min(state.prises, total);
    const left = total - prises;
    setAll("[data-offer-total]", (el) => { el.textContent = total; });
    setAll("[data-offer-taken]", (el) => { el.textContent = prises; });
    setAll(".offer__bar-fill", (el) => el.style.setProperty("--offer-taken", `${(prises / total) * 100}%`));

    if (state.status === "active") {
      setAll('[data-offer-left="bar"]', (el) => { el.innerHTML = `<b>${left}</b>&nbsp;${plural(left, "place restante", "places restantes")}`; });
      setAll('[data-offer-left="card"]', (el) => { el.innerHTML = `Plus que <b>${left}</b>&nbsp;${plural(left, "place", "places")}`; });
      tick();
      return;
    }

    // Offre terminée : affichée encore quelques jours, sans compte à rebours
    const raison = state.full
      ? `les ${total} places ont trouvé preneur`
      : `terminée le ${dateFormat.format(state.endedAt - 1000)}`;
    if (bar) {
      bar.classList.add("is-ended");
      bar.setAttribute("href", "#contact");
      bar.querySelector("[data-offer-bar-title]").textContent = state.full ? "Offre complète" : "Offre terminée";
      setAll('[data-offer-left="bar"]', (el) => { el.textContent = raison; });
      setAll("[data-offer-countdown]", (el) => el.remove());
      bar.querySelector("[data-offer-bar-cta]").textContent = "Être prévenu de la prochaine";
    }
    if (section) {
      section.classList.add("is-ended");
      const label = section.querySelector("[data-offer-label]");
      if (label) label.textContent = state.full ? "Offre complète" : "Offre terminée";
      setAll("[data-offer-unit]", (el) => setReel(el, "00"));
      setAll('[data-offer-left="card"]', (el) => {
        el.textContent = state.full ? `Merci aux ${total} restaurants inscrits` : `${prises} ${plural(prises, "restaurant inscrit", "restaurants inscrits")}`;
      });
      setCta(section.querySelector("[data-offer-cta]"), "Être prévenu de la prochaine offre");
    }
    const hideIn = state.endedAt + OFFRE.joursAffichageApresFin * DAY - Date.now();
    if (hideIn < 2147483647) timer = setTimeout(remove, hideIn);
  };

  // Compte à rebours
  const units = {};
  setAll("[data-offer-unit]", (el) => { units[el.dataset.offerUnit] = el; });
  const tick = () => {
    const s = Math.floor((fin - Date.now()) / 1000);
    if (s <= 0) { render(stateOf(current)); return; }
    const parts = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    Object.keys(units).forEach((k) => setReel(units[k], pad(parts[k])));
    setAll("[data-offer-countdown]", (el) => { el.textContent = `${parts.d}j ${pad(parts.h)}h ${pad(parts.m)}m ${pad(parts.s)}s`; });
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 20);
  };

  const timerBox = document.querySelector("[data-offer-timer]");
  if (timerBox) {
    const end = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    }).format(fin - 1000);
    timerBox.setAttribute("aria-label", `Fin de l'offre le ${end}`);
    timerBox.querySelectorAll(".offer__unit").forEach((unit) => unit.setAttribute("aria-hidden", "true"));
  }

  // Premier affichage avec les valeurs manuelles, puis mise à jour depuis Supabase si configuré
  let current = { prises: OFFRE.placesPrises, completLe: OFFRE.completLe };
  render(stateOf(current));

  const hasSupabase = Boolean(OFFRE.supabaseUrl && OFFRE.supabaseCle);
  const rpc = async (name, body) => {
    const response = await fetch(`${OFFRE.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: OFFRE.supabaseCle,
        Authorization: `Bearer ${OFFRE.supabaseCle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    return response.json();
  };

  const refresh = async () => {
    try {
      const data = await rpc("offre_etat", { total });
      current = { prises: Number(data.prises) || 0, completLe: data.complet_le || "" };
      if (document.body.contains(blocks[0])) render(stateOf(current));
    } catch (error) {
      // Réseau ou Supabase indisponible : on garde l'affichage actuel
    }
  };
  if (hasSupabase) {
    refresh();
    // Le compteur se met à jour sans recharger la page, et au retour sur l'onglet
    setInterval(() => { if (!document.hidden) refresh(); }, 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  }

  // Bandeau collé en haut : le menu se place dessous, et le bandeau s'efface sur l'offre et le formulaire
  if (bar) {
    const root = document.documentElement;
    const measure = () => {
      if (document.body.contains(bar)) root.style.setProperty("--offer-bar-h", `${bar.offsetHeight}px`);
    };
    measure();
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(bar);
    else window.addEventListener("resize", measure);

    const zones = [section, document.getElementById("contact")].filter(Boolean);
    if ("IntersectionObserver" in window && zones.length) {
      const inView = new Set();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? inView.add(entry.target) : inView.delete(entry.target)));
        bar.classList.toggle("is-tucked", inView.size > 0);
      }, { rootMargin: "-35% 0px -35% 0px" });
      zones.forEach((zone) => observer.observe(zone));
    }
  }

  // Les demandes envoyées depuis l'offre sont signalées dans l'email reçu
  const form = document.getElementById("contact-form");
  const flagRequest = () => {
    if (!form) return;
    let field = form.querySelector('input[name="offre"]');
    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = "offre";
      form.prepend(field);
    }
    const ended = section && section.classList.contains("is-ended");
    field.value = ended ? `${OFFRE.nom} (terminée : être prévenu de la prochaine)` : OFFRE.nom;
  };
  document.querySelectorAll("[data-offer-cta], a.offer-bar").forEach((link) => link.addEventListener("click", flagRequest));

  // Appelé par le formulaire juste avant l'envoi (js/script.js) : si la demande vient de l'offre
  // et que l'offre est ouverte, la personne est inscrite et l'email reçu le précise.
  window.RyliaOffre = {
    inscrire: async (contactForm) => {
      const field = contactForm.querySelector('input[name="offre"]');
      if (!field) return null;
      const subject = contactForm.querySelector('input[name="_subject"]');
      const setNote = (note, subjectTag) => {
        field.value = note;
        if (subject) subject.value = `Nouvelle demande · ${subjectTag} · Rylia`;
      };
      if (stateOf(current).status !== "active") {
        setNote(field.value, "Offre terminée");
        return null;
      }
      if (!hasSupabase) {
        setNote(`${OFFRE.nom} : demande d'inscription (à confirmer)`, "OFFRE -50 %");
        return null;
      }
      const value = (name) => (contactForm.elements[name] ? contactForm.elements[name].value.trim() : "");
      try {
        const result = await rpc("offre_inscrire", {
          p_restaurant: value("establishment"),
          p_nom: value("name"),
          p_email: value("email"),
          p_telephone: value("phone_full") || value("phone"),
        });
        const notes = {
          inscrit: [`INSCRIT · place ${result.place} sur ${result.total} (${OFFRE.nom})`, `OFFRE -50 % · place ${result.place}/${result.total}`],
          deja_inscrit: [`Déjà inscrit à l'offre avec cet email (${OFFRE.nom})`, "OFFRE -50 % · déjà inscrit"],
          complet: [`Offre complète au moment de l'envoi : non inscrit (${OFFRE.nom})`, "Offre complète"],
          termine: [`Offre terminée au moment de l'envoi : non inscrit (${OFFRE.nom})`, "Offre terminée"],
        };
        const [note, tag] = notes[result.statut] || [`Inscription refusée (${result.statut}) : à vérifier (${OFFRE.nom})`, "OFFRE -50 % · à vérifier"];
        setNote(note, tag);
        return result;
      } catch (error) {
        // Supabase injoignable : la demande part quand même, marquée à vérifier
        setNote(`Inscription automatique impossible : à inscrire à la main (${OFFRE.nom})`, "OFFRE -50 % · à vérifier");
        return null;
      }
    },
  };
})();

// Barre des places : l'avant est plein, l'arrière se défait en pixels qui scintillent
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const bar = document.querySelector(".offer__bar");
  const fillEl = bar && bar.querySelector(".offer__bar-fill");
  const card = bar && bar.closest(".offer__card");
  if (!fillEl || !card) return;
  const canvas = document.createElement("canvas");
  canvas.className = "offer__bar-canvas";
  if (!canvas.getContext) return;
  bar.appendChild(canvas);
  bar.classList.add("has-canvas");
  const ctx = canvas.getContext("2d");

  const CELL = 3; // taille d'une cellule de pixel (px)
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  let shown = 0;
  let running = false;
  let started = false;

  const target = () => (parseFloat(fillEl.style.getPropertyValue("--offer-taken")) || 0) / 100;

  const draw = (now) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
    }
    const W = rect.width;
    const H = rect.height;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (started) shown += (target() - shown) * 0.045;
    const head = shown * W;
    if (head < 1) return;
    const time = now / 1000;
    const ended = Boolean(card.closest(".is-ended"));

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, head, H, H / 2);
    else ctx.rect(0, 0, head, H);
    ctx.clip();

    // Zone de pixels : de 0 à 62 % du remplissage, de plus en plus dense vers l'avant
    const zone = ended ? 0 : head * 0.62;
    for (let x = 0; x < zone; x += CELL) {
      const f = x / zone;
      for (let y = 0; y < H; y += CELL) {
        const id = (x / CELL) * 31 + (y / CELL) * 7;
        // Chaque pixel se rallume à son rythme (environ 2,5 fois par seconde)
        const flick = hash(id + Math.floor(time * 2.5 + hash(id) * 4));
        const density = 0.3 + 0.7 * Math.pow(f, 0.7);
        if (flick > density) continue;
        const glow = 0.5 + 0.5 * Math.sin(time * 3 + hash(id) * 6.28);
        ctx.fillStyle = `rgba(249, ${118 + ((hash(id + 3) * 40) | 0)}, 22, ${0.45 + 0.35 * f + 0.2 * glow})`;
        ctx.fillRect(x, y, CELL - 0.5, CELL - 0.5);
      }
    }

    // Barre pleine : son dégradé part transparent au milieu de la traînée pour se fondre dans les pixels
    const fadeFrom = ended ? 0 : head * 0.28;
    const g = ctx.createLinearGradient(fadeFrom, 0, head, 0);
    g.addColorStop(0, "rgba(251, 146, 60, 0)");
    g.addColorStop(ended ? 0 : 0.45, "rgba(251, 146, 60, 0.95)");
    g.addColorStop(1, "rgb(249, 115, 22)");
    ctx.fillStyle = g;
    ctx.fillRect(fadeFrom, 0, head - fadeFrom, H);
    ctx.restore();
  };

  const loop = (now) => {
    if (!running) return;
    draw(now);
    requestAnimationFrame(loop);
  };

  // L'animation ne tourne que quand la barre est à l'écran
  new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        started = true;
        if (!running) { running = true; requestAnimationFrame(loop); }
      } else {
        running = false;
      }
    });
  }).observe(bar);
})();
