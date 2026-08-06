(() => {
  "use strict";

  const WORDS_PER_MINUTE = 200;
  const ARTICLE_SELECTOR = "#markdown-content";
  const WIDGET_ID = "reading-progress";

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function countReadableWords(article) {
    const clone = article.cloneNode(true);

    // Exclude elements that should not contribute directly to reading time.
    clone.querySelectorAll("script, style, noscript, pre, figure, .bibliography, .related-posts").forEach((element) => element.remove());

    const text = clone.innerText.trim();
    const words = text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu);

    return words ? words.length : 0;
  }

  function createWidget(totalMinutes) {
    const widget = document.createElement("aside");
    widget.id = WIDGET_ID;
    widget.setAttribute("aria-label", `Approximately ${totalMinutes} minute read`);
    widget.innerHTML = `
      <div class="reading-progress-clock" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <circle class="reading-progress-track" cx="24" cy="24" r="20"></circle>
          <circle class="reading-progress-ring" cx="24" cy="24" r="20"></circle>
          <line class="reading-progress-hand" x1="24" y1="24" x2="24" y2="13"></line>
          <line class="reading-progress-hand" x1="24" y1="24" x2="31" y2="24"></line>
        </svg>
      </div>
      <div class="reading-progress-text">
        <span class="reading-progress-value">~${totalMinutes} min</span>
        <span class="reading-progress-caption">remaining</span>
      </div>
    `;

    document.body.appendChild(widget);

    return {
      widget,
      ring: widget.querySelector(".reading-progress-ring"),
      value: widget.querySelector(".reading-progress-value"),
      caption: widget.querySelector(".reading-progress-caption"),
    };
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #progress {
        display: none;
      }

      #${WIDGET_ID} {
        position: fixed;
        right: 1.25rem;
        bottom: 5.25rem;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.45rem 0.65rem 0.45rem 0.45rem;
        color: var(--global-text-color);
        background: color-mix(in srgb, var(--global-bg-color) 90%, transparent);
        border: 1px solid var(--global-divider-color);
        border-radius: 999px;
        box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 12%);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        font-variant-numeric: tabular-nums;
        user-select: none;
        transition:
          opacity 180ms ease,
          transform 180ms ease;
      }

      #${WIDGET_ID}.reading-complete {
        transform: scale(0.96);
      }

      .reading-progress-clock {
        width: 2.5rem;
        height: 2.5rem;
        flex: 0 0 auto;
      }

      .reading-progress-clock svg {
        display: block;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
        overflow: visible;
      }

      .reading-progress-track,
      .reading-progress-ring {
        fill: none;
        stroke-width: 3;
      }

      .reading-progress-track {
        stroke: var(--global-divider-color);
      }

      .reading-progress-ring {
        stroke: var(--global-theme-color);
        stroke-linecap: round;
        stroke-dasharray: 125.664;
        stroke-dashoffset: 125.664;
        transition: stroke-dashoffset 100ms linear;
      }

      .reading-progress-hand {
        stroke: var(--global-text-color);
        stroke-width: 2.25;
        stroke-linecap: round;
        transform-origin: 24px 24px;
      }

      .reading-progress-text {
        display: flex;
        min-width: 3.65rem;
        flex-direction: column;
        line-height: 1.05;
      }

      .reading-progress-value {
        font-size: 0.78rem;
        font-weight: 600;
        white-space: nowrap;
      }

      .reading-progress-caption {
        margin-top: 0.15rem;
        color: var(--global-text-color-light);
        font-size: 0.62rem;
        white-space: nowrap;
      }

      @media (max-width: 575px) {
        #${WIDGET_ID} {
          right: 0.75rem;
          bottom: 4.75rem;
          padding-right: 0.45rem;
        }

        .reading-progress-text {
          min-width: 2.25rem;
        }

        .reading-progress-caption {
          display: none;
        }

        .reading-progress-value {
          font-size: 0.7rem;
        }
      }

      @media print {
        #${WIDGET_ID} {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${WIDGET_ID},
        .reading-progress-ring {
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function initializeReadingProgress() {
    const article = document.querySelector(ARTICLE_SELECTOR);

    // This limits the component to blog posts using the standard post layout.
    if (!article) {
      return;
    }

    const wordCount = countReadableWords(article);
    const totalMinutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
    const circumference = 2 * Math.PI * 20;

    injectStyles();

    const elements = createWidget(totalMinutes);
    let scheduled = false;

    function update() {
      scheduled = false;

      const articleBox = article.getBoundingClientRect();
      const articleTop = articleBox.top + window.scrollY;
      const articleBottom = articleTop + articleBox.height;

      // Begin when the article reaches the upper part of the viewport.
      const startPosition = articleTop - window.innerHeight * 0.15;

      // Finish when the bottom of the article reaches the bottom of the viewport.
      const endPosition = articleBottom - window.innerHeight;
      const scrollRange = Math.max(endPosition - startPosition, 1);
      const progress = clamp((window.scrollY - startPosition) / scrollRange, 0, 1);

      const remainingMinutes = Math.ceil(totalMinutes * (1 - progress));
      const dashOffset = circumference * (1 - progress);

      elements.ring.style.strokeDashoffset = dashOffset.toFixed(3);

      // Rotate the clock hands as the reader progresses.
      const hourHand = elements.widget.querySelectorAll(".reading-progress-hand")[0];
      const minuteHand = elements.widget.querySelectorAll(".reading-progress-hand")[1];

      hourHand.style.transform = `rotate(${progress * 360}deg)`;
      minuteHand.style.transform = `rotate(${progress * 1440}deg)`;

      if (progress >= 0.995) {
        elements.value.textContent = "Done";
        elements.caption.textContent = "finished";
        elements.widget.classList.add("reading-complete");
        elements.widget.setAttribute("aria-label", "Article completed");
      } else {
        elements.value.textContent = `~${Math.max(1, remainingMinutes)} min`;
        elements.caption.textContent = "remaining";
        elements.widget.classList.remove("reading-complete");
        elements.widget.setAttribute("aria-label", `Approximately ${Math.max(1, remainingMinutes)} minutes remaining`);
      }
    }

    function requestUpdate() {
      if (scheduled) {
        return;
      }

      scheduled = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    // Images and equations can change the article height after initial rendering.
    window.addEventListener("load", requestUpdate);

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(requestUpdate);
      observer.observe(article);
    }

    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeReadingProgress);
  } else {
    initializeReadingProgress();
  }
})();