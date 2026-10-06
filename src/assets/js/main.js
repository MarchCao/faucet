// HAICE Apparel — minimal interactions
(function(){
  "use strict";

  // Mobile nav
  var toggle = document.getElementById("navToggle");
  if (toggle) {
    toggle.addEventListener("click", function(){
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.getElementById("mainNav").addEventListener("click", function(e){
      if (e.target.tagName === "A") {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Active nav highlight
  var page = document.body.getAttribute("data-page") || "home";
  document.querySelectorAll(".main-nav a").forEach(function(a){
    if (a.getAttribute("data-nav") === page) a.classList.add("active");
  });

  // Footer year
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Prefill inquiry message from ?model= (product page deep link)
  (function(){
    try {
      var model = new URLSearchParams(window.location.search).get("model");
      if (!model) return;
      var msg = document.getElementById("f-message");
      if (msg && !msg.value) {
        msg.value = (window.MODEL_PREFIX || "Model: ") + model;
      }
    } catch (e) { /* ignore */ }
  })();

  // Contact form -> server-side API (Cloudflare Worker + Resend).
  // The API key lives only as a Worker secret; the frontend only knows the endpoint URL.
  var INQUIRY_ENDPOINT = "https://haice-faucet-inquiry.junhcao.workers.dev/api/inquiry";
  var form = document.getElementById("inquiryForm");
  if (form) {
    var statusEl = document.getElementById("formStatus");
    var submitBtn = document.getElementById("submitBtn");
    var S = window.FORM_STATUS || {};
    var setStatus = function(kind, text){
      if (!statusEl) return;
      statusEl.className = "form-status" + (kind ? " is-"+kind : "");
      statusEl.textContent = text || "";
    };
    form.addEventListener("submit", function(e){
      e.preventDefault();
      // Honeypot
      if (form.querySelector(".hp input").value) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var v = function(name){
        var el = form.querySelector('[name="'+name+'"]');
        return el ? el.value.trim() : "";
      };
      var payload = {
        name: v("name"), company: v("company"), email: v("email"),
        country: v("country"), category: v("category"), type: v("type"),
        quantity: v("quantity"), delivery: v("delivery"),
        message: v("message"), website: "",
        lang: document.body.getAttribute("data-lang") || "en"
      };
      if (submitBtn) submitBtn.disabled = true;
      setStatus("sending", S.sending || "Sending\u2026");
      fetch(INQUIRY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function(res){
        return res.json().then(function(data){ return { ok: res.ok && data && data.ok, autoReply: data && data.autoReply }; });
      }).then(function(r){
        if (r.ok) {
          // autoReply === false: inquiry reached us, but the confirmation email failed.
          setStatus("success", (r.autoReply === false ? (S.partial || S.success) : S.success) || "Sent.");
          form.reset();
        } else {
          setStatus("error", S.error || "Failed to send.");
        }
      }).catch(function(){
        setStatus("error", S.error || "Failed to send.");
      }).then(function(){
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }
})();
