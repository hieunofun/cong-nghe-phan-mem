// Dung lich su cua tab hien tai, chi ve trang du phong khi khong co trang truoc.
(function setupHistoryBackControls() {
  function fallbackUrlFor(control) {
    return control.dataset.fallback || control.getAttribute('href') || '/index.html';
  }

  function sameOriginReferrer() {
    if (!document.referrer) return null;

    try {
      const referrerUrl = new URL(document.referrer);
      const currentUrl = new URL(window.location.href);
      const referrerPage = `${referrerUrl.pathname}${referrerUrl.search}`;
      const currentPage = `${currentUrl.pathname}${currentUrl.search}`;

      if (referrerUrl.origin === currentUrl.origin && referrerPage !== currentPage) {
        return referrerUrl.href;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function canGoBack() {
    if (window.navigation && typeof window.navigation.canGoBack === 'boolean') {
      return window.navigation.canGoBack;
    }

    return window.history.length > 1;
  }

  function goBackWithFallback(fallbackUrl) {
    let navigationStarted = false;
    const markNavigationStarted = () => {
      navigationStarted = true;
    };

    window.addEventListener('popstate', markNavigationStarted, { once: true });
    window.addEventListener('pagehide', markNavigationStarted, { once: true });
    window.history.back();

    window.setTimeout(() => {
      window.removeEventListener('popstate', markNavigationStarted);
      window.removeEventListener('pagehide', markNavigationStarted);

      if (!navigationStarted && document.visibilityState === 'visible') {
        window.location.assign(fallbackUrl);
      }
    }, 250);
  }

  document.querySelectorAll('[data-history-back]').forEach((control) => {
    control.addEventListener('click', (event) => {
      event.preventDefault();

      const fallbackUrl = fallbackUrlFor(control);
      if (canGoBack()) {
        goBackWithFallback(fallbackUrl);
        return;
      }

      const referrerUrl = sameOriginReferrer();
      if (referrerUrl) {
        window.location.assign(referrerUrl);
        return;
      }

      window.location.assign(fallbackUrl);
    });
  });
})();
