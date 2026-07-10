(function () {
    const audio = document.getElementById("ambient-audio") || document.getElementById("audio");

    if (!audio) {
        return;
    }

    const PLACEHOLDER_TOKEN = "REPLACE_WITH_YOUR_AUDIO";
    const START_DELAY_MS = 1000;
    const FADE_IN_MS = 1400;
    const FADE_OUT_MS = 1400;
    const LOOP_GAP_MS = 1000;
    const PEAK_VOLUME = 0.35;
    const FADE_OUT_LEAD_MS = 1500;

    const src = audio.getAttribute("src") || "";

    if (!src || src.indexOf(PLACEHOLDER_TOKEN) !== -1) {
        return;
    }

    audio.loop = false;
    audio.volume = 0;

    let fadeTimer = null;
    let fadeOutTimer = null;
    let startTimer = null;
    let allowAutoStart = true;

    function clearTimer(timerRef) {
        if (timerRef !== null) {
            clearTimeout(timerRef);
        }
    }

    function clearFade() {
        if (fadeTimer !== null) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }
    }

    function fadeTo(targetVolume, durationMs, onDone) {
        clearFade();

        const startVolume = audio.volume;
        const totalSteps = Math.max(1, Math.floor(durationMs / 50));
        const stepDelta = (targetVolume - startVolume) / totalSteps;
        let step = 0;

        fadeTimer = setInterval(function () {
            step += 1;
            const nextVolume = step >= totalSteps ? targetVolume : startVolume + stepDelta * step;
            audio.volume = Math.max(0, Math.min(1, nextVolume));

            if (step >= totalSteps) {
                clearFade();
                if (typeof onDone === "function") {
                    onDone();
                }
            }
        }, 50);
    }

    function scheduleFadeOut() {
        clearTimer(fadeOutTimer);

        const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : NaN;

        if (!Number.isFinite(durationMs) || durationMs <= FADE_OUT_LEAD_MS) {
            return;
        }

        const waitMs = Math.max(0, durationMs - FADE_OUT_LEAD_MS);

        fadeOutTimer = setTimeout(function () {
            fadeTo(0, FADE_OUT_MS);
        }, waitMs);
    }

    function queueStart(delayMs) {
        clearTimer(startTimer);
        startTimer = setTimeout(function () {
            startPlayback();
        }, delayMs);
    }

    function startPlayback() {
        if (!allowAutoStart) {
            return;
        }

        audio.currentTime = 0;
        audio.volume = 0;

        audio.play().then(function () {
            fadeTo(PEAK_VOLUME, FADE_IN_MS);
            scheduleFadeOut();
        }).catch(function () {
            // Browser autoplay policy may block until user interacts.
        });
    }

    function tryStartAfterInteraction() {
        allowAutoStart = true;
        queueStart(0);
    }

    audio.addEventListener("loadedmetadata", scheduleFadeOut);

    audio.addEventListener("ended", function () {
        queueStart(LOOP_GAP_MS);
    });

    document.addEventListener("click", tryStartAfterInteraction, { passive: true });
    document.addEventListener("keydown", tryStartAfterInteraction, { passive: true });
    document.addEventListener("touchstart", tryStartAfterInteraction, { passive: true });

    queueStart(START_DELAY_MS);
})();
