// Hides ad slots on MapleScouter (runs before the page draws, so ads don't flash in).
(() => {
  const CSS = `
    [data-gamera-placement-container], #desktop_takeover, div[id^="slot-"],
    div:has(> #desktop_takeover), div:has(> div[id^="slot-"]),
    body > div:not([class]):has([data-gamera-placement-container]),
    .horizontal_sticky, .horizontal-sticky,
    iframe[id^="google_ads_iframe"], div[id^="google_ads_iframe"], ins.adsbygoogle,
    iframe[src*="vntsm."], iframe[src*="venatusmedia."], iframe[src*="doubleclick."],
    a:has(> img[alt="banner ad"])
    { display: none !important; }`;
  chrome.storage.sync.get({ hideAds: true }, ({ hideAds }) => {
    if (!hideAds) return;
    const style = document.createElement("style");
    style.id = "msx-hide-ads";
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  });
})();
