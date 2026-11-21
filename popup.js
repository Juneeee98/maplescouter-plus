const $ = (id) => document.getElementById(id);
const status = (t) => ($("status").textContent = t);
const opts = { sourceLanguage: "ko", targetLanguage: "en" };

function reloadTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab && /maplescouter\.com/.test(tab.url || "")) chrome.tabs.reload(tab.id);
  });
}

chrome.storage.sync.get({ enabled: true, machine: true, region: "msea", hideAds: true }, (s) => {
  $("hideAds").checked = s.hideAds;
  $("enabled").checked = s.enabled;
  $("machine").checked = s.machine;
  $("region").value = s.region;
});
$("region").addEventListener("change", () => chrome.storage.sync.set({ region: $("region").value }, reloadTab));
$("hideAds").addEventListener("change", async () => {
  const on = $("hideAds").checked;
  await chrome.declarativeNetRequest.updateEnabledRulesets(on ? { enableRulesetIds: ["ads"] } : { disableRulesetIds: ["ads"] });
  chrome.storage.sync.set({ hideAds: on }, reloadTab);
});
for (const id of ["enabled", "machine"]) {
  $(id).addEventListener("change", () => {
    chrome.storage.sync.set({ [id]: $(id).checked }, reloadTab);
  });
}

async function checkTranslator() {
  if (!("Translator" in self)) {
    $("dl").disabled = true;
    status("Backup translator needs Chrome 138 or newer. The dictionary still works.");
    return;
  }
  const a = await Translator.availability(opts);
  if (a === "available") { $("dl").disabled = true; $("dl").textContent = "Backup translator ready ✓"; status(""); }
  else if (a === "unavailable") { $("dl").disabled = true; status("Korean→English isn't supported on this device."); }
}

$("dl").addEventListener("click", async () => {
  $("dl").disabled = true;
  status("Downloading language pack…");
  try {
    const t = await Translator.create({
      ...opts,
      monitor(m) { m.addEventListener("downloadprogress", (e) => status(`Downloading… ${Math.round(e.loaded * 100)}%`)); },
    });
    t.destroy();
    status("Done. Reloading the page…");
    reloadTab();
  } catch (e) {
    status("Couldn't download: " + e.message);
    $("dl").disabled = false;
  }
  checkTranslator();
});

checkTranslator();
