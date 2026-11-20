// =====================================================================
//  Asistente de chat de Casa Pirul (sin IA: respuestas y pedidos guiados)
//  Usa window.CasaPirul (definido en script.js) para compartir el carrito.
// =====================================================================
(() => {
  const CP = window.CasaPirul;
  if (!CP) return;

  // ---------- Datos del negocio (edítalos aquí) ----------
  const INFO = {
    nombre: "Casa Pirul",
    direccion: "El Maravilla, Arboledas #7, San Luis de la Paz, Gto.",
    mapa: "https://www.google.com/maps/search/?api=1&query=21.2859389,-100.5598438",
    telefono: "428 168 8990",
    horario: [["Lunes a viernes", "8:00 – 16:00"], ["Sábado y domingo", "8:00 – 17:00"]],
  };

  const PRODUCTOS = [
    { id: "pareja",   name: "Promo En Pareja",       price: 190, desc: "4 quesabirrias, 2 consomés y 2 bebidas", keys: ["pareja"] },
    { id: "indiv",    name: "Promo Individual",      price: 135, desc: "3 quesabirrias, 1 consomé y 1 bebida",   keys: ["individual"] },
    { id: "peques",   name: "Promo Peques",          price: 40,  desc: "2 tacos y 1 agua fresca",                keys: ["peque", "nino", "nina"] },
    { id: "carne",    name: "Carne extra (consomé)", price: 10,  desc: "Carne para tu consomé",                  keys: ["con carne", "carne extra", "extra"] },
    { id: "cmed",     name: "Consomé mediano",       price: 35,  desc: "",                                       keys: ["consome mediano", "consome grande", "mediano", "grande"] },
    { id: "cchico",   name: "Consomé chico",         price: 20,  desc: "",                                       keys: ["consome chico", "chico", "consome"] },
    { id: "harina",   name: "Quesabirria de harina", price: 40,  desc: "",                                       keys: ["harina"] },
    { id: "maiz",     name: "Quesabirria de maíz",   price: 35,  desc: "",                                       keys: ["maiz", "quesabirria", "quesa"] },
    { id: "taco",     name: "Taco de birria",        price: 20,  desc: "",                                       keys: ["taco"] },
    { id: "jamaica",  name: "Agua de jamaica",       price: 20,  desc: "",                                       keys: ["jamaica", "agua"] },
    { id: "refresco", name: "Refresco",              price: 15,  desc: "Coca, Sprite, Fanta, Fresca o Manzanita", keys: ["refresco", "coca", "sprite", "fanta", "fresca", "manzanita", "soda"] },
  ];

  const NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, media: 6, docena: 12 };
  const money = CP.money;
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,;:]/g, " ");
  const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const has = (t, words) => words.some(w => t.includes(w));

  // ---------- Interfaz ----------
  const root = document.createElement("div");
  root.className = "chat";
  root.innerHTML = `
    <button class="chat__launcher" id="chatLauncher" aria-label="Abrir asistente de chat" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6A.5.5 0 0 1 5 19.2V16h-.5A.5.5 0 0 1 4 15.5z"/></svg>
      <span class="chat__dot" aria-hidden="true"></span>
    </button>
    <section class="chat__panel" id="chatPanel" role="dialog" aria-label="Asistente de ${INFO.nombre}" hidden>
      <header class="chat__head">
        <div class="chat__avatar" aria-hidden="true">CP</div>
        <div><strong>Asistente ${INFO.nombre}</strong><span class="chat__online">Responde al instante</span></div>
        <button class="chat__close" id="chatClose" aria-label="Cerrar chat">×</button>
      </header>
      <div class="chat__body" id="chatBody" aria-live="polite"></div>
      <div class="chat__chips" id="chatChips"></div>
      <form class="chat__form" id="chatForm" autocomplete="off">
        <input id="chatInput" type="text" placeholder="Escribe, ej. 2 de harina y un consomé" aria-label="Escribe tu mensaje">
        <button type="submit" aria-label="Enviar">➤</button>
      </form>
    </section>`;
  document.body.appendChild(root);

  const launcher = root.querySelector("#chatLauncher"), panel = root.querySelector("#chatPanel");
  const body = root.querySelector("#chatBody"), chipsEl = root.querySelector("#chatChips");
  const form = root.querySelector("#chatForm"), input = root.querySelector("#chatInput");
  let started = false, state = null, cliente = "", busy = Promise.resolve();

  function toggle(open) {
    panel.hidden = !open;
    root.classList.toggle("is-open", open);
    launcher.setAttribute("aria-expanded", open);
    if (open && !started) { started = true; saludo(); }
    if (open && window.matchMedia("(pointer: fine)").matches) setTimeout(() => input.focus(), 250);
  }
  launcher.addEventListener("click", () => toggle(panel.hidden));
  root.querySelector("#chatClose").addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) toggle(false); });

  const scroll = () => body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });

  function userMsg(text) {
    const m = document.createElement("div");
    m.className = "msg msg--user";
    m.textContent = text;
    body.appendChild(m); scroll();
  }

  // Encola mensajes del bot con indicador "escribiendo..."
  function bot(html, chips) {
    busy = busy.then(() => new Promise(res => {
      const typing = document.createElement("div");
      typing.className = "msg msg--bot msg--typing";
      typing.innerHTML = "<i></i><i></i><i></i>";
      body.appendChild(typing); scroll();
      setTimeout(() => {
        typing.remove();
        const m = document.createElement("div");
        m.className = "msg msg--bot";
        m.innerHTML = html;
        body.appendChild(m); scroll();
        if (chips) setChips(chips);
        res();
      }, Math.min(350 + html.length * 4, 1100));
    }));
    return busy;
  }

  function setChips(list) {
    chipsEl.innerHTML = "";
    list.forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = label;
      b.addEventListener("click", () => { userMsg(label); setChips([]); fn(); });
      chipsEl.appendChild(b);
    });
  }

  // ---------- Respuestas ----------
  const MAIN = () => [
    ["🌮 Hacer pedido", pedir], ["📋 Menú", menu], ["🔥 Promociones", promos],
    ["🕗 Horario", horario], ["📍 Ubicación", ubicacion], ["💬 Hablar con alguien", humano],
  ];
  const AFTER_ADD = () => [["➕ Agregar más", pedir], ["🧾 Ver mi pedido", verPedido], ["✅ Terminar pedido", terminar]];

  function abiertoAhora() {
    const n = new Date(), d = n.getDay(), h = n.getHours() + n.getMinutes() / 60;
    return h >= 8 && h < ((d === 0 || d === 6) ? 17 : 16);
  }

  function saludo() {
    bot(`¡Hola! 👋 Soy el asistente de <b>${INFO.nombre}</b>.`);
    bot(`Puedo mostrarte el menú, darte la ubicación o tomar tu pedido. También puedes escribirme algo como <i>"2 de harina y un consomé mediano"</i>.`, MAIN());
  }

  function menu() {
    const fila = p => `<li><span>${p.name}</span><b>${money(p.price)}</b></li>`;
    const ids = ["maiz", "harina", "taco", "cchico", "cmed", "carne", "jamaica", "refresco"];
    bot(`<b>Menú</b><ul class="msg__list">${ids.map(id => fila(PRODUCTOS.find(p => p.id === id))).join("")}</ul>Refrescos: Coca, Sprite, Fanta, Fresca y Manzanita.`,
      [["🌮 Hacer pedido", pedir], ["🔥 Promociones", promos], ["🏠 Inicio", inicio]]);
  }

  function promos() {
    const ps = ["indiv", "pareja", "peques"].map(id => PRODUCTOS.find(p => p.id === id));
    bot(`<b>Promociones</b><ul class="msg__list">${ps.map(p => `<li><span>${p.name}<small>${p.desc}</small></span><b>${money(p.price)}</b></li>`).join("")}</ul>`,
      [...ps.map(p => [`Agregar ${p.name.replace("Promo ", "")}`, () => agregar([[p, 1]])]), ["🏠 Inicio", inicio]]);
  }

  function horario() {
    const estado = abiertoAhora() ? "🟢 Ahora estamos <b>abiertos</b>." : "🔴 Ahora estamos <b>cerrados</b>. Abrimos a las 8:00.";
    bot(`<b>Horario</b><ul class="msg__list">${INFO.horario.map(([d, h]) => `<li><span>${d}</span><b>${h}</b></li>`).join("")}</ul>${estado}`,
      [["📍 Ubicación", ubicacion], ["🌮 Hacer pedido", pedir], ["🏠 Inicio", inicio]]);
  }

  function ubicacion() {
    bot(`📍 Estamos en <b>${INFO.direccion}</b><br><a class="msg__btn" href="${INFO.mapa}" target="_blank" rel="noopener">Abrir en Google Maps ↗</a>`,
      [["🕗 Horario", horario], ["🌮 Hacer pedido", pedir], ["🏠 Inicio", inicio]]);
  }

  function humano() {
    const url = `https://wa.me/${CP.WHATSAPP}?text=${encodeURIComponent(`¡Hola ${INFO.nombre}! Tengo una pregunta:`)}`;
    bot(`Con gusto. Escríbenos por WhatsApp o llámanos al <b>${INFO.telefono}</b>.<br><a class="msg__btn" href="${url}" target="_blank" rel="noopener">Abrir WhatsApp ↗</a>`,
      [["🏠 Inicio", inicio]]);
  }

  function inicio() { state = null; bot("¿En qué más te ayudo?", MAIN()); }

  function pedir() {
    state = null;
    const opciones = ["maiz", "harina", "taco", "cchico", "cmed", "jamaica", "refresco", "pareja", "indiv", "peques"]
      .map(id => PRODUCTOS.find(p => p.id === id));
    bot("¿Qué te gustaría? Toca una opción o escríbeme cantidad y producto (ej. <i>3 de maíz y una jamaica</i>).",
      [...opciones.map(p => [`${p.name.replace("Quesabirria", "Quesa")} · ${money(p.price)}`, () => agregar([[p, 1]])]),
       ["🧾 Ver mi pedido", verPedido]]);
  }

  function agregar(items) {
    items.forEach(([p, q]) => CP.addToCart(p.name, p.price, q));
    const txt = items.map(([p, q]) => `${q} × ${p.name}`).join(", ");
    const total = CP.getCart().reduce((s, i) => s + i.price * i.qty, 0);
    bot(`✅ Agregué <b>${txt}</b>. Tu total va en <b>${money(total)}</b>.`, AFTER_ADD());
  }

  function resumen() {
    const items = CP.getCart();
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    return { items, total, html: `<ul class="msg__list">${items.map(i => `<li><span>${i.qty} × ${i.name}</span><b>${money(i.price * i.qty)}</b></li>`).join("")}<li class="msg__total"><span>Total</span><b>${money(total)}</b></li></ul>` };
  }

  function verPedido() {
    const r = resumen();
    if (!r.items.length) return bot("Tu pedido está vacío por ahora.", [["🌮 Hacer pedido", pedir], ["🏠 Inicio", inicio]]);
    bot(`<b>Tu pedido</b>${r.html}`, [["➕ Agregar más", pedir], ["✅ Terminar pedido", terminar], ["🗑️ Vaciar", vaciar]]);
  }

  function vaciar() { CP.clearCart(); bot("Listo, vacié tu pedido.", [["🌮 Hacer pedido", pedir], ["🏠 Inicio", inicio]]); }

  function terminar() {
    if (!CP.getCart().length) return bot("Primero agrega algo a tu pedido 🙂", [["🌮 Hacer pedido", pedir]]);
    state = "nombre";
    bot("¡Perfecto! ¿A nombre de quién va el pedido? Escríbelo abajo 👇");
    setChips([]);
  }

  function preguntarModo() {
    state = "modo";
    bot(`Gracias, <b>${esc(cliente)}</b>. ¿Cómo lo quieres?`, [
      ["🥡 Para llevar", () => confirmar("Para llevar")],
      ["🍽️ Comer aquí", () => confirmar("Comer en el local")],
      ["🛵 A domicilio", () => confirmar("A domicilio (confirmar costo de envío)")],
    ]);
  }

  function confirmar(modo) {
    state = null;
    const r = resumen();
    const lineas = r.items.map(i => `• ${i.qty} x ${i.name} — ${money(i.price * i.qty)}`).join("\n");
    const msg = `¡Hola ${INFO.nombre}! Quiero hacer un pedido:\n${lineas}\n\nTotal: ${money(r.total)}\nNombre: ${cliente}\nEntrega: ${modo}`;
    const url = `https://wa.me/${CP.WHATSAPP}?text=${encodeURIComponent(msg)}`;
    bot(`<b>Resumen</b>${r.html}<small class="msg__meta">${esc(cliente)} · ${esc(modo)}</small>
      <a class="msg__btn msg__btn--wa" href="${url}" target="_blank" rel="noopener">Enviar pedido por WhatsApp ↗</a>
      <small class="msg__meta">Se abrirá WhatsApp con tu pedido ya escrito; solo presiona enviar.</small>`,
      [["➕ Agregar más", pedir], ["🏠 Inicio", inicio]]);
  }

  // ---------- Interpretar texto libre ----------
  function detectarProductos(t) {
    const out = [];
    t.split(/\s+y\s+|\s+mas\s+|\s+con\s+(?!carne)|\+|\n/).forEach(seg => {
      seg = seg.trim(); if (!seg) return;
      const p = PRODUCTOS.find(p => has(seg, p.keys));
      if (!p) return;
      const m = seg.match(/\d+/);
      let q = m ? +m[0] : 1;
      if (!m) for (const w of seg.split(/\s+/)) if (NUM[w]) { q = NUM[w]; break; }
      out.push([p, Math.min(Math.max(q, 1), 50)]);
    });
    return out;
  }

  function responder(raw) {
    const t = " " + norm(raw) + " ";

    if (state === "nombre") {
      cliente = raw.trim().slice(0, 40) || "Cliente";
      return preguntarModo();
    }
    if (state === "modo") {
      if (has(t, ["llevar"])) return confirmar("Para llevar");
      if (has(t, ["aqui", "local", "comer"])) return confirmar("Comer en el local");
      if (has(t, ["domicilio", "envio", "casa"])) return confirmar("A domicilio (confirmar costo de envío)");
    }

    const prods = has(t, ["precio", "cuanto cuesta", "cuanto vale", "cuanto es"]) ? [] : detectarProductos(t);
    if (prods.length) return agregar(prods);

    if (has(t, [" hola", "buenas", "buen dia", "que tal"])) return bot(`¡Hola! ¿Qué se te antoja hoy? 😋`, MAIN());
    if (has(t, ["gracias", "grax", "thank"])) return bot("¡A ti! Aquí estoy si necesitas algo más. 🌮", MAIN());
    if (has(t, ["promo", "oferta", "paquete", "combo"])) return promos();
    if (has(t, ["menu", "carta", "precio", "cuanto", "que venden", "que tienen", "que hay"])) return menu();
    if (has(t, ["horario", "hora", "abren", "cierran", "abierto", "cerrado", "dias"])) return horario();
    if (has(t, ["donde", "direccion", "ubicacion", "llegar", "mapa", "ubicados"])) return ubicacion();
    if (has(t, ["mi pedido", "carrito", "total", "llevo"])) return verPedido();
    if (has(t, ["terminar", "listo", "es todo", "seria todo", "finalizar"])) return terminar();
    if (has(t, ["pedir", "ordenar", "pedido", "quiero", "dame", "me da", "orden"])) return pedir();
    if (has(t, ["domicilio", "envio", "entregan", "reparto"]))
      return bot("Para entregas a domicilio, confirma zona y costo de envío por WhatsApp. Puedes armar tu pedido aquí y elegir <b>A domicilio</b> al final.", [["🌮 Hacer pedido", pedir], ["💬 Hablar con alguien", humano]]);
    if (has(t, ["pago", "pagar", "tarjeta", "efectivo", "transferencia"]))
      return bot("Las formas de pago se confirman por WhatsApp al hacer tu pedido.", [["💬 Hablar con alguien", humano], ["🏠 Inicio", inicio]]);
    if (has(t, ["persona", "humano", "whatsapp", "telefono", "llamar", "contacto", "numero"])) return humano();
    if (has(t, ["vegetarian", "sin carne", "vegano"]))
      return bot("Nuestra especialidad es la birria de res, así que todos los platillos llevan carne. Para algo especial, pregúntanos por WhatsApp.", [["💬 Hablar con alguien", humano], ["📋 Menú", menu]]);

    bot("Mmm, no entendí bien 🤔. Puedes elegir una opción o escribirme algo como <i>\"2 de harina y una jamaica\"</i>.", MAIN());
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = "";
    userMsg(v); setChips([]);
    responder(v);
  });
})();
