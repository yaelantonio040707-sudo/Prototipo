// ===== Configuración: cambia este número por el WhatsApp real del negocio =====
const WHATSAPP = "524281688990";

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

// ----- Loader -----
document.body.classList.add("is-loading");
window.addEventListener("load", () => {
  setTimeout(() => {
    $(".loader").classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  }, reduceMotion ? 0 : 700);
});
// Respaldo por si alguna imagen tarda demasiado
setTimeout(() => { $(".loader").classList.add("is-done"); document.body.classList.remove("is-loading"); document.body.classList.add("is-ready"); }, 3000);

// ----- Imágenes rotas: deja el fondo degradado -----
$$("img").forEach(img => img.addEventListener("error", () => { img.style.opacity = 0; }));

// ----- Reveal con IntersectionObserver (con escalonado) -----
const groups = new Map();
$$(".reveal").forEach(el => {
  const parent = el.parentElement;
  const i = groups.get(parent) || 0;
  el.style.setProperty("--d", `${Math.min(i, 5) * 0.1}s`);
  groups.set(parent, i + 1);
});
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
$$(".reveal").forEach(el => io.observe(el));

// ----- Contadores -----
const countIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, pre = el.dataset.prefix || "";
    const dur = 1600, t0 = performance.now();
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = pre + Math.round(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countIO.unobserve(el);
  });
}, { threshold: 0.6 });
$$("[data-count]").forEach(el => countIO.observe(el));

// ----- Scroll: barra de progreso, nav, parallax, fab -----
const nav = $(".nav"), bar = $(".progress"), fab = $("#fab");
const parallax = $$(".parallax");
let lastY = 0, ticking = false;
function onScroll() {
  const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  nav.classList.toggle("is-scrolled", y > 40);
  nav.classList.toggle("is-hidden", y > lastY && y > 400 && !nav.classList.contains("is-open"));
  lastY = y;
  if (!reduceMotion) {
    parallax.forEach(el => {
      if (!el.classList.contains("is-in")) return;
      const r = el.getBoundingClientRect();
      const off = (r.top + r.height / 2 - innerHeight / 2) * +el.dataset.speed;
      el.style.translate = `0 ${off}px`;
    });
  }
  ticking = false;
}
window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
onScroll();

// ----- Menú móvil -----
const toggle = $("#navToggle");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
});
$$("#navLinks a").forEach(a => a.addEventListener("click", () => {
  nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", false); document.body.style.overflow = "";
}));

// ----- Tabs del menú -----
const tabs = $$(".tab"), pill = $(".tabs__pill");
function movePill(tab) {
  pill.style.width = tab.offsetWidth + "px";
  pill.style.transform = `translateX(${tab.offsetLeft}px)`;
}
tabs.forEach(tab => tab.addEventListener("click", () => {
  tabs.forEach(t => { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", t === tab); });
  $$(".menu__list").forEach(p => p.classList.toggle("is-active", p.dataset.panel === tab.dataset.tab));
  movePill(tab);
}));
window.addEventListener("load", () => movePill($(".tab.is-active")));
window.addEventListener("resize", () => movePill($(".tab.is-active")));
document.fonts && document.fonts.ready.then(() => movePill($(".tab.is-active")));

// ----- Botones magnéticos y tarjetas con inclinación 3D -----
if (finePointer && !reduceMotion) {
  $$(".magnetic").forEach(btn => {
    btn.addEventListener("mousemove", e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });
  $$(".tilt").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

// ----- Pedido -----
const cart = new Map();
const cartEl = $("#cart"), totalEl = $("#cartTotal"), sendBtn = $("#sendOrder"), fabCount = $("#fabCount");
const money = n => "$" + n.toLocaleString("es-MX");

function renderCart() {
  cartEl.innerHTML = "";
  let total = 0, count = 0;
  if (!cart.size) cartEl.innerHTML = '<li class="cart__empty">Tu pedido está vacío 🌮</li>';
  cart.forEach((it, name) => {
    total += it.price * it.qty; count += it.qty;
    const li = document.createElement("li");
    li.innerHTML = `<span class="cart__name"></span>
      <span class="cart__qty"><button data-act="-" aria-label="Quitar uno">−</button><b>${it.qty}</b><button data-act="+" aria-label="Agregar uno">+</button></span>
      <span class="cart__sub">${money(it.price * it.qty)}</span>`;
    li.querySelector(".cart__name").textContent = name;
    li.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      it.qty += b.dataset.act === "+" ? 1 : -1;
      if (it.qty <= 0) cart.delete(name);
      renderCart();
    }));
    cartEl.appendChild(li);
  });
  totalEl.textContent = money(total);
  fabCount.textContent = count;
  fab.classList.toggle("is-visible", count > 0);
  sendBtn.classList.toggle("is-disabled", !count);

  const lines = [...cart].map(([n, it]) => `• ${it.qty} x ${n} — ${money(it.price * it.qty)}`);
  const msg = `¡Hola! Quiero hacer un pedido:\n${lines.join("\n")}\n\nTotal: ${money(total)}`;
  sendBtn.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

$$(".add").forEach(btn => btn.addEventListener("click", () => {
  const { name, price } = btn.dataset;
  const it = cart.get(name) || { price: +price, qty: 0 };
  it.qty++; cart.set(name, it);
  renderCart();
  btn.classList.remove("is-pop"); void btn.offsetWidth; btn.classList.add("is-pop");
  fab.classList.remove("is-bump"); void fab.offsetWidth; fab.classList.add("is-bump");
}));
renderCart();

// ----- Abierto / cerrado según horario -----
(function openStatus() {
  const now = new Date(), d = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
  const close = (d === 0 || d === 6) ? 17 : 16;
  const open = h >= 8 && h < close;
  const el = $("#openStatus");
  el.textContent = open ? "Abierto ahora" : "Cerrado ahora · abrimos a las 8:00";
  el.classList.add(open ? "open" : "closed");
})();

$("#year").textContent = new Date().getFullYear();
