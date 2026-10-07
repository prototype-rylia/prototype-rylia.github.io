(function () {
  var root = document.querySelector(".showcase-wrap");
  if (!root) return;

  var stage = root.querySelector(".showcase-stage");
  var video = root.querySelector(".showcase-video");
  if (!stage || !video) return;

  var controls = root.querySelector(".showcase-controls");
  var soundBtn = root.querySelector(".showcase-sound");
  var soundLabel = root.querySelector(".showcase-sound-label");
  var toggleBtn = root.querySelector(".showcase-toggle");
  var playBtn = root.querySelector(".showcase-play");
  var fallback = root.querySelector(".showcase-fallback");
  var timeline = root.querySelector(".showcase-timeline");
  var seek = root.querySelector(".showcase-seek");
  var timeLabel = root.querySelector(".showcase-time");
  var rewindBtn = root.querySelector(".showcase-rewind");
  var volumeRange = root.querySelector(".showcase-volume-range");

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // Lecture automatique en muet à l'arrivée (seule façon autorisée par les navigateurs) ;
  // la première activation du son relance la vidéo depuis le début.
  var userPaused = false;
  var soundStarted = false;
  var inView = false;
  var failed = false;
  var progressRaf = 0;

  // Interface qui s'efface pour laisser toute la place à la vidéo :
  // à la sortie de la souris, ou après 3 s sans toucher l'écran sur mobile
  var screen = root.querySelector(".showcase-screen") || stage;
  var IDLE_DELAY = 3000;
  var idleTimer = 0;
  var pointerInside = false;
  var tapWasIdle = false;

  function setIdle(idle) {
    root.classList.toggle("showcase-ui-idle", idle);
  }

  function wakeUI(autoHide) {
    clearTimeout(idleTimer);
    setIdle(false);
    if (autoHide) idleTimer = setTimeout(function () { setIdle(true); }, IDLE_DELAY);
  }

  function hideUI() {
    clearTimeout(idleTimer);
    setIdle(true);
  }

  root.classList.add("showcase-js");
  video.muted = true;

  function formatTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function updateProgress() {
    if (!seek) return;
    var duration = video.duration || Number(seek.max) || 0;
    var current = video.currentTime || 0;
    seek.max = String(duration);
    seek.value = String(current);
    seek.style.setProperty("--showcase-seek", (duration ? (current / duration) * 100 : 0) + "%");
    if (timeLabel) timeLabel.textContent = formatTime(current) + " / " + formatTime(duration);
  }

  function progressLoop() {
    updateProgress();
    progressRaf = video.paused ? 0 : window.requestAnimationFrame(progressLoop);
  }

  function updateUI() {
    root.classList.toggle("showcase-is-paused", userPaused);
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-label", userPaused ? "Lire la vidéo" : "Mettre la vidéo en pause");
    }
    if (playBtn) {
      playBtn.hidden = failed || !userPaused;
      playBtn.setAttribute("aria-label", video.ended ? "Revoir la vidéo depuis le début" : "Lire la vidéo de présentation");
    }
  }

  function updateSound() {
    if (!soundBtn) return;
    var soundOn = !video.muted;
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    if (soundLabel) soundLabel.textContent = soundOn ? "Couper le son" : "Activer le son";
    if (volumeRange) {
      var level = video.muted ? 0 : video.volume;
      volumeRange.value = String(level);
      volumeRange.style.setProperty("--showcase-volume", level * 100 + "%");
    }
  }

  function showControls() {
    if (failed) return;
    if (controls) controls.hidden = false;
    if (timeline) timeline.hidden = false;
  }

  function attemptPlay() {
    if (failed) return;
    var promise = video.play();
    if (!promise || typeof promise.catch !== "function") return;
    promise.catch(function (err) {
      if (!err || err.name !== "NotAllowedError") return;
      if (!video.muted) {
        video.muted = true;
        updateSound();
        attemptPlay();
        return;
      }
      // Lecture bloquée même en muet (ex. iOS mode économie d'énergie)
      userPaused = true;
      updateUI();
    });
  }

  function sync() {
    if (failed) return;
    var shouldPlay = inView && !userPaused && !document.hidden;
    if (shouldPlay) {
      if (video.paused) attemptPlay();
    } else if (!video.paused) {
      video.pause();
    }
  }

  function markLoaded() {
    if (failed) return;
    root.classList.add("showcase-is-loaded");
    showControls();
    // Les contrôles se montrent à l'arrivée, puis s'effacent si la souris n'est pas sur la vidéo
    if (!pointerInside) wakeUI(true);
  }

  function markError() {
    if (failed) return;
    failed = true;
    root.classList.remove("showcase-is-loaded");
    root.classList.add("showcase-is-error");
    if (fallback) fallback.hidden = false;
    if (controls) controls.hidden = true;
    if (timeline) timeline.hidden = true;
    updateUI();
  }

  video.addEventListener("loadeddata", markLoaded);
  video.addEventListener("error", markError);
  // Avec plusieurs <source>, l'échec arrive sur la dernière source et non sur la vidéo
  var sources = video.querySelectorAll("source");
  if (sources.length) sources[sources.length - 1].addEventListener("error", markError);
  video.addEventListener("volumechange", updateSound);
  video.addEventListener("loadedmetadata", updateProgress);
  video.addEventListener("seeked", updateProgress);
  video.addEventListener("play", function () {
    if (!progressRaf) progressRaf = window.requestAnimationFrame(progressLoop);
  });
  video.addEventListener("pause", updateProgress);

  // Fin de la présentation : on reste en pause et on propose de la revoir
  video.addEventListener("ended", function () {
    userPaused = true;
    root.classList.add("showcase-is-ended");
    updateUI();
    updateProgress();
  });
  video.addEventListener("play", function () {
    root.classList.remove("showcase-is-ended");
  });
  // Revenir en arrière dans la barre après la fin retire l'état « terminé »
  video.addEventListener("seeked", function () {
    if (!video.ended) {
      root.classList.remove("showcase-is-ended");
      updateUI();
    }
  });

  if (seek) {
    seek.addEventListener("input", function () {
      video.currentTime = Number(seek.value);
      updateProgress();
    });
  }

  // Retour au début : après la fin, la vidéo repart aussitôt
  if (rewindBtn) {
    rewindBtn.addEventListener("click", function () {
      if (video.ended) {
        setPaused(false);
        return;
      }
      video.currentTime = 0;
      updateProgress();
    });
  }

  if (video.error) {
    markError();
  } else if (video.readyState >= 2) {
    markLoaded();
  }

  // Première fois que le son est activé : la présentation repart de zéro, avec le son
  function startWithSound() {
    if (soundStarted || video.muted) return;
    soundStarted = true;
    video.currentTime = 0;
    updateProgress();
    if (userPaused) setPaused(false);
    else sync();
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      video.muted = !video.muted;
      // Réactiver le son avec un volume à zéro ne s'entendrait pas : on remonte au maximum
      if (!video.muted && video.volume === 0) video.volume = 1;
      updateSound();
      startWithSound();
    });
  }

  if (volumeRange) {
    volumeRange.addEventListener("input", function () {
      var level = Number(volumeRange.value);
      video.volume = level;
      video.muted = level === 0;
      updateSound();
      startWithSound();
    });
  }

  function setPaused(paused) {
    if (failed) return;
    userPaused = paused;
    updateUI();
    if (paused) {
      video.pause();
    } else if (video.ended) {
      // Après la fin, on attend que le retour au début soit fait avant de relancer :
      // un play() lancé pendant ce retour peut être interrompu par le navigateur
      video.addEventListener("seeked", attemptPlay, { once: true });
      video.currentTime = 0;
    } else {
      attemptPlay();
      showControls();
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      setPaused(!userPaused);
    });
  }

  // Souris : l'interface suit la présence du pointeur sur la vidéo
  screen.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse") return;
    if (!pointerInside || root.classList.contains("showcase-ui-idle")) wakeUI(false);
    pointerInside = true;
  });
  screen.addEventListener("pointerleave", function (event) {
    if (event.pointerType !== "mouse") return;
    pointerInside = false;
    hideUI();
  });

  // Tactile : chaque contact réaffiche l'interface, qui repart pour 3 s une fois le doigt levé
  screen.addEventListener("pointerdown", function (event) {
    tapWasIdle = event.pointerType !== "mouse" && root.classList.contains("showcase-ui-idle");
    if (event.pointerType !== "mouse") wakeUI(false);
  });
  ["pointerup", "pointercancel"].forEach(function (type) {
    screen.addEventListener(type, function (event) {
      if (event.pointerType !== "mouse") wakeUI(true);
    });
  });
  // Un contact ailleurs sur la page la fait disparaître tout de suite
  document.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse" || screen.contains(event.target)) return;
    hideUI();
  });

  // Un clic sur l'image met en pause ou relance, comme sur un lecteur classique.
  // Sur mobile, si l'interface était cachée, le premier contact la réaffiche seulement.
  video.addEventListener("click", function () {
    if (tapWasIdle) {
      tapWasIdle = false;
      return;
    }
    setPaused(!userPaused);
  });

  if (playBtn) {
    playBtn.addEventListener("click", function () {
      setPaused(false);
      if (toggleBtn && controls && !controls.hidden) toggleBtn.focus();
    });
  }

  // Barre d'espace : lecture / pause, quand la vidéo est bien visible à l'écran
  // et que l'on n'est pas en train d'écrire ou sur un bouton (qui garde son propre comportement)
  document.addEventListener("keydown", function (event) {
    if (event.key !== " " && event.code !== "Space") return;
    if (failed || event.ctrlKey || event.metaKey || event.altKey) return;
    var target = event.target;
    if (target && target.closest) {
      var inShowcaseRange = target.closest(".showcase-seek, .showcase-volume-range");
      if (!inShowcaseRange && target.closest("input, textarea, select, button, a, [contenteditable='true']")) return;
    }
    var rect = stage.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    if (visible < rect.height * 0.5) return;
    event.preventDefault();
    if (!event.repeat) setPaused(!userPaused);
    wakeUI(!pointerInside);
  });

  updateSound();
  updateUI();
  updateProgress();

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      var entry = entries[entries.length - 1];
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(stage);
  } else {
    inView = true;
    sync();
  }

  document.addEventListener("visibilitychange", sync);

  if (!reduceMotion && typeof window.requestAnimationFrame === "function") {
    var ticking = false;
    var lastProgress = -1;

    var updateTilt = function () {
      ticking = false;
      var rect = stage.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      // 0 quand le haut du cadre entre en bas d'écran, 1 quand il atteint 35 % de la hauteur
      var progress = (vh * 0.95 - rect.top) / (vh * 0.6);
      progress = Math.round(Math.min(1, Math.max(0, progress)) * 1000) / 1000;
      if (progress !== lastProgress) {
        lastProgress = progress;
        stage.style.setProperty("--showcase-p", String(progress));
      }
    };

    var requestTilt = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateTilt);
    };

    updateTilt();
    root.classList.add("showcase-has-tilt");
    window.addEventListener("scroll", requestTilt, { passive: true });
    window.addEventListener("resize", requestTilt);
  }
})();
