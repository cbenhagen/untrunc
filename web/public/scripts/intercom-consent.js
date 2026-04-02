(() => {
  const INTERCOM_APP_ID = "zomaha7u";
  const CONSENT_KEY = "rsv_intercom_consent";
  const CONSENT_ACCEPTED = "accepted";

  const launcherId = "rsv-chat-launcher";
  const manageId = "rsv-chat-manage";
  const modalId = "rsv-chat-consent-modal";
  const noticeId = "rsv-chat-decline-notice";

  let intercomScriptPromise = null;
  let intercomBooted = false;

  function injectStyles() {
    if (document.getElementById("rsv-chat-consent-styles")) return;

    const style = document.createElement("style");
    style.id = "rsv-chat-consent-styles";
    style.textContent = `
      :root {
        --ac-bg:           hsl(0, 0%, 4%);
        --ac-surface:      hsl(0, 0%, 8%);
        --ac-surface-alt:  hsl(0, 0%, 14%);
        --ac-border:       hsl(0, 0%, 24%);
        --ac-text:         hsl(0, 0%, 96%);
        --ac-text-muted:   hsl(0, 0%, 72%);
        --ac-primary:      hsl(0, 0%, 92%);
        --ac-primary-fg:   hsl(0, 0%, 8%);
        --ac-radius:       0.5rem;
        --ac-ring:         hsl(0, 0%, 80%);
      }

      #${launcherId} {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 9999;
        border: 1px solid var(--ac-border);
        border-radius: 999px;
        width: 52px;
        height: 52px;
        background: var(--ac-surface);
        color: var(--ac-text-muted);
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      }
      #${launcherId}:hover {
        background: var(--ac-surface-alt);
        color: var(--ac-text);
      }
      #${launcherId}:focus-visible {
        outline: 3px solid var(--ac-ring);
        outline-offset: 2px;
      }
      #${launcherId} svg {
        width: 24px;
        height: 24px;
        display: block;
      }
      #${launcherId} .rsv-chat-glyph {
        fill: currentColor;
      }

      #${manageId} {
        position: fixed;
        right: 33px;
        bottom: 84px;
        z-index: 9998;
        border: 1px solid var(--ac-border);
        border-radius: 999px;
        background: var(--ac-surface);
        color: var(--ac-text-muted);
        width: 34px;
        height: 34px;
        padding: 0 10px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        overflow: hidden;
        white-space: nowrap;
        font: 500 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        cursor: pointer;
        transition: width 0.2s ease, background-color 0.2s ease, color 0.2s ease;
      }
      #${manageId}:hover,
      #${manageId}:focus-visible {
        width: 116px;
        background: var(--ac-surface-alt);
        color: var(--ac-text);
      }
      #${manageId}:focus-visible {
        outline: 3px solid var(--ac-ring);
        outline-offset: 2px;
      }
      #${manageId} .rsv-manage-icon {
        flex: 0 0 14px;
        width: 14px;
        height: 14px;
        stroke: currentColor;
        stroke-width: 1.7;
        fill: none;
      }
      #${manageId} .rsv-manage-label {
        opacity: 0;
        transform: translateX(4px);
        transition: opacity 0.18s ease, transform 0.18s ease;
      }
      #${manageId}:hover .rsv-manage-label,
      #${manageId}:focus-visible .rsv-manage-label {
        opacity: 1;
        transform: translateX(0);
      }
      #${manageId}[hidden] {
        display: none;
      }

      #${modalId} {
        position: fixed;
        inset: 0;
        display: none;
        z-index: 10000;
      }
      #${modalId}[data-open="true"] { display: block; }
      #${modalId} .rsv-chat-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
      }
      #${modalId} .rsv-chat-dialog {
        position: relative;
        margin: min(12vh, 96px) auto 0;
        width: min(540px, calc(100vw - 32px));
        background: var(--ac-surface);
        color: var(--ac-text);
        border: 1px solid var(--ac-border);
        border-radius: calc(var(--ac-radius) + 4px);
        padding: 20px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
      }
      #${modalId} h2 {
        margin: 0 0 8px;
        font: 700 18px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      #${modalId} p {
        margin: 0 0 14px;
        color: var(--ac-text-muted);
        font: 400 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      #${modalId} .rsv-chat-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      #${modalId} button {
        border: 1px solid var(--ac-border);
        border-radius: var(--ac-radius);
        padding: 9px 12px;
        cursor: pointer;
        font: 600 13px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      #${modalId} .rsv-chat-accept {
        background: var(--ac-primary);
        color: var(--ac-primary-fg);
      }
      #${modalId} .rsv-chat-decline {
        background: var(--ac-surface-alt);
        color: var(--ac-text);
      }
      #${modalId} .rsv-chat-revoke {
        background: var(--ac-surface-alt);
        color: var(--ac-text);
      }
      #${modalId} .rsv-chat-keep {
        background: var(--ac-primary);
        color: var(--ac-primary-fg);
      }

      #${noticeId} {
        position: fixed;
        right: 24px;
        bottom: 82px;
        z-index: 10001;
        max-width: min(420px, calc(100vw - 32px));
        background: var(--ac-surface);
        color: var(--ac-text);
        border: 1px solid var(--ac-border);
        border-radius: var(--ac-radius);
        padding: 10px 12px;
        padding-right: 34px;
        font: 500 13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
      }
      #${noticeId} a {
        color: var(--ac-primary);
        text-decoration: underline;
      }
      #${noticeId} .rsv-chat-notice-close {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 22px;
        height: 22px;
        border: 1px solid var(--ac-border);
        border-radius: 999px;
        background: var(--ac-surface-alt);
        color: var(--ac-text);
        display: grid;
        place-items: center;
        font: 600 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        cursor: pointer;
      }
      #${noticeId} .rsv-chat-notice-close:hover {
        opacity: 0.9;
      }
    `;
    document.head.appendChild(style);
  }

  function hasConsent() {
    return localStorage.getItem(CONSENT_KEY) === CONSENT_ACCEPTED;
  }

  function persistConsentAccepted() {
    localStorage.setItem(CONSENT_KEY, CONSENT_ACCEPTED);
  }

  function clearConsent() {
    localStorage.removeItem(CONSENT_KEY);
  }

  function updateManageButtonVisibility() {
    const manageButton = document.getElementById(manageId);
    if (!(manageButton instanceof HTMLButtonElement)) return;
    manageButton.hidden = !hasConsent();
  }

  function showDeclineNotice(message) {
    const existing = document.getElementById(noticeId);
    if (existing) existing.remove();

    const notice = document.createElement("div");
    notice.id = noticeId;
    notice.setAttribute("role", "status");
    notice.innerHTML = `
      <button type="button" class="rsv-chat-notice-close" aria-label="Dismiss support notice">×</button>
      ${
        message ||
        'Prefer not to enable chat cookies? Email us at <a href="mailto:support@ottomatic.io">support@ottomatic.io</a>.'
      }
    `;
    document.body.appendChild(notice);

    const closeButton = notice.querySelector(".rsv-chat-notice-close");
    if (closeButton instanceof HTMLButtonElement) {
      closeButton.addEventListener("click", () => {
        notice.remove();
      });
    }

    window.setTimeout(() => {
      notice.remove();
    }, 7000);
  }

  function bootIntercom() {
    window.intercomSettings = {
      app_id: INTERCOM_APP_ID,
      hide_default_launcher: true,
    };
    window.Intercom("boot", window.intercomSettings);
    intercomBooted = true;
  }

  function ensureIntercomLoaded() {
    if (window.Intercom) {
      if (!intercomBooted) {
        bootIntercom();
      }
      return Promise.resolve();
    }
    if (intercomScriptPromise) {
      return intercomScriptPromise.then(() => {
        if (window.Intercom && !intercomBooted) {
          bootIntercom();
        }
      });
    }

    intercomScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://widget.intercom.io/widget/${INTERCOM_APP_ID}`;
      script.async = true;
      script.onload = () => {
        if (window.Intercom) {
          bootIntercom();
        }
        resolve();
      };
      script.onerror = () => {
        reject(new Error("Failed to load Intercom widget script."));
      };
      document.head.appendChild(script);
    });

    return intercomScriptPromise;
  }

  async function openIntercom() {
    if (INTERCOM_APP_ID === "YOUR_INTERCOM_APP_ID") {
      showDeclineNotice(
        'Chat is not configured yet. Please email <a href="mailto:support@ottomatic.io">support@ottomatic.io</a>.'
      );
      return;
    }

    try {
      await ensureIntercomLoaded();
      window.Intercom("show");
    } catch (error) {
      showDeclineNotice(
        'Unable to open chat right now. Please email <a href="mailto:support@ottomatic.io">support@ottomatic.io</a>.'
      );
      console.error(error);
    }
  }

  function closeConsentModal() {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.setAttribute("data-open", "false");
  }

  function setConsentModalMode(mode) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const title = modal.querySelector("#rsv-chat-consent-title");
    const body = modal.querySelector("#rsv-chat-consent-body");
    const acceptButton = modal.querySelector(".rsv-chat-accept");
    const declineButton = modal.querySelector(".rsv-chat-decline");
    const revokeButton = modal.querySelector(".rsv-chat-revoke");
    const keepButton = modal.querySelector(".rsv-chat-keep");

    if (
      !(title instanceof HTMLElement) ||
      !(body instanceof HTMLElement) ||
      !(acceptButton instanceof HTMLButtonElement) ||
      !(declineButton instanceof HTMLButtonElement) ||
      !(revokeButton instanceof HTMLButtonElement) ||
      !(keepButton instanceof HTMLButtonElement)
    ) {
      return;
    }

    if (mode === "manage") {
      title.textContent = "Chat privacy settings";
      body.textContent =
        "Support chat is enabled. You can disable chat cookies at any time.";
      acceptButton.hidden = true;
      declineButton.hidden = true;
      revokeButton.hidden = false;
      keepButton.hidden = false;
      revokeButton.focus();
      return;
    }

    title.textContent = "Enable support chat?";
    body.textContent =
      "We use Intercom to provide chat support. Enabling chat may set cookies so the conversation can work correctly.";
    acceptButton.hidden = false;
    declineButton.hidden = false;
    revokeButton.hidden = true;
    keepButton.hidden = true;
    acceptButton.focus();
  }

  function revokeConsent() {
    clearConsent();
    updateManageButtonVisibility();
    if (window.Intercom) {
      window.Intercom("shutdown");
      intercomBooted = false;
    }
    showDeclineNotice("Chat cookies disabled. You can enable chat again any time.");
  }

  function openConsentModal(mode = "prompt") {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    setConsentModalMode(mode);
    modal.setAttribute("data-open", "true");
  }

  function createConsentModal() {
    if (document.getElementById(modalId)) return;

    const modal = document.createElement("div");
    modal.id = modalId;
    modal.setAttribute("data-open", "false");
    modal.innerHTML = `
      <div class="rsv-chat-backdrop" data-action="close"></div>
      <section class="rsv-chat-dialog" role="dialog" aria-modal="true" aria-labelledby="rsv-chat-consent-title">
        <h2 id="rsv-chat-consent-title">Enable support chat?</h2>
        <p id="rsv-chat-consent-body">
          We use Intercom to provide chat support. Enabling chat may set cookies so the conversation can work correctly.
        </p>
        <div class="rsv-chat-actions">
          <button type="button" class="rsv-chat-decline">Decline</button>
          <button type="button" class="rsv-chat-accept">Accept and open chat</button>
          <button type="button" class="rsv-chat-revoke" hidden>Disable chat cookies</button>
          <button type="button" class="rsv-chat-keep" hidden>Keep enabled</button>
        </div>
      </section>
    `;

    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === "close") {
        closeConsentModal();
      }
      if (target.classList.contains("rsv-chat-decline")) {
        closeConsentModal();
        showDeclineNotice();
      }
      if (target.classList.contains("rsv-chat-accept")) {
        persistConsentAccepted();
        updateManageButtonVisibility();
        closeConsentModal();
        void openIntercom();
      }
      if (target.classList.contains("rsv-chat-revoke")) {
        revokeConsent();
        closeConsentModal();
      }
      if (target.classList.contains("rsv-chat-keep")) {
        closeConsentModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeConsentModal();
      }
    });

    document.body.appendChild(modal);
  }

  function createManageButton() {
    if (document.getElementById(manageId)) return;

    const manageButton = document.createElement("button");
    manageButton.id = manageId;
    manageButton.type = "button";
    manageButton.innerHTML = `
      <svg class="rsv-manage-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3l7 3v5c0 5-3.4 8.7-7 10-3.6-1.3-7-5-7-10V6l7-3z" />
      </svg>
      <span class="rsv-manage-label">Privacy</span>
    `;
    manageButton.setAttribute("aria-label", "Manage chat privacy settings");
    manageButton.hidden = !hasConsent();
    manageButton.addEventListener("click", () => {
      openConsentModal("manage");
    });
    document.body.appendChild(manageButton);
  }

  function createLauncher() {
    if (document.getElementById(launcherId)) return;

    const launcher = document.createElement("button");
    launcher.id = launcherId;
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open support chat");
    launcher.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 32" aria-hidden="true" focusable="false">
        <path
          class="rsv-chat-glyph"
          d="M28 32s-4.714-1.855-8.527-3.34H3.437C1.54 28.66 0 27.026 0 25.013V3.644C0 1.633 1.54 0 3.437 0h21.125c1.898 0 3.437 1.632 3.437 3.645v18.404H28V32zm-4.139-11.982a.88.88 0 00-1.292-.105c-.03.026-3.015 2.681-8.57 2.681-5.486 0-8.517-2.636-8.571-2.684a.88.88 0 00-1.29.107 1.01 1.01 0 00-.219.708.992.992 0 00.318.664c.142.128 3.537 3.15 9.762 3.15 6.226 0 9.621-3.022 9.763-3.15a.992.992 0 00.317-.664 1.01 1.01 0 00-.218-.707z"
        />
      </svg>
    `;
    launcher.addEventListener("click", () => {
      if (hasConsent()) {
        void openIntercom();
      } else {
        openConsentModal();
      }
    });
    document.body.appendChild(launcher);
  }

  function registerOpenChatTriggers() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const trigger = target.closest("[data-rsv-open-chat]");
      if (!(trigger instanceof HTMLElement)) return;

      event.preventDefault();
      if (hasConsent()) {
        void openIntercom();
      } else {
        openConsentModal();
      }
    });
  }

  function init() {
    injectStyles();
    createConsentModal();
    createManageButton();
    createLauncher();
    registerOpenChatTriggers();
    updateManageButtonVisibility();
    if (hasConsent() && INTERCOM_APP_ID !== "YOUR_INTERCOM_APP_ID") {
      void ensureIntercomLoaded().catch((error) => {
        console.error(error);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
