// ---------- Datos y configuración ----------
var CATS = [
  { n: "Bajo",     c: "cat1" },   // menos de 3,0
  { n: "Básico",   c: "cat2" },   // 3,0 a 3,9
  { n: "Alto",     c: "cat3" },   // 4,0 a 4,5
  { n: "Superior", c: "cat4" }    // 4,6 a 5,0
];

var S = {
  curso: "",
  acts: [
    { id: 1, n: "Parcial 1", w: 30 },
    { id: 2, n: "Taller",    w: 30 },
    { id: 3, n: "Parcial 2", w: 40 }
  ],
  est: []
};

// Cargar datos guardados en el navegador
try {
  var raw = localStorage.getItem("gestor-notas");
  if (raw) {
    var p = JSON.parse(raw);
    if (p && p.acts && p.est) S = p;
  }
} catch (e) {}

function save() {
  try { localStorage.setItem("gestor-notas", JSON.stringify(S)); } catch (e) {}
}

// ---------- Utilidades ----------
function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function fmt(x) { return x.toFixed(1).replace(".", ","); }

function err(m) { $("err").textContent = m; }

// Promedio ponderado con las actividades que ya tienen nota
function avg(e) {
  var total = 0, pesos = 0;
  S.acts.forEach(function (a) {
    var v = e.g[a.id];
    if (v !== undefined && v !== null && v !== "") {
      total += v * a.w;
      pesos += a.w;
    }
  });
  return pesos ? total / pesos : null;
}

// Ubica el promedio en una categoría
function cat(a) {
  if (a < 3) return 0;
  if (a < 4) return 1;
  if (a <= 4.5) return 2;
  return 3;
}

// ---------- Dibujar la pantalla ----------
function render() {
  $("curso").value = S.curso || "";

  var h = "<thead><tr><th>Estudiante</th>";
  S.acts.forEach(function (a) {
    h += "<th>" + esc(a.n) + "<br><small>" + a.w + '% <button class="ghost" data-da="' + a.id +
         '" aria-label="Quitar actividad ' + esc(a.n) + '">×</button></small></th>';
  });
  h += "<th>Promedio</th><th>Desempeño</th><th></th></tr></thead><tbody>";

  var cnt = [0, 0, 0, 0], suma = 0, n = 0;

  S.est.forEach(function (e) {
    h += "<tr><td>" + esc(e.n) + "</td>";
    S.acts.forEach(function (a) {
      var v = e.g[a.id];
      h += '<td><input class="n" type="number" min="0" max="5" step="0.1" data-e="' + e.id +
           '" data-a="' + a.id + '" value="' + (v === undefined ? "" : v) +
           '" aria-label="Nota de ' + esc(e.n) + " en " + esc(a.n) + '"></td>';
    });

    var m = avg(e);
    if (m === null) {
      h += '<td class="avg">–</td><td><span class="pill" style="color:var(--mut)">Sin notas</span></td>';
    } else {
      var k = cat(Math.round(m * 10) / 10);
      cnt[k]++; suma += m; n++;
      h += '<td class="avg">' + fmt(m) + '</td><td><span class="pill ' + CATS[k].c + '">' + CATS[k].n + "</span></td>";
    }
    h += '<td><button class="ghost" data-de="' + e.id + '" aria-label="Quitar a ' + esc(e.n) + '">Quitar</button></td></tr>';
  });
  h += "</tbody>";

  if (!S.est.length) {
    h += '<tbody><tr><td colspan="' + (S.acts.length + 4) +
         '" class="empty">Aún no hay estudiantes. Agrega el primero arriba.</td></tr></tbody>';
  }
  $("tabla").innerHTML = h;

  // Resumen del curso
  var st = '<div class="stat s0"><b>' + S.est.length + "</b><small>Estudiantes</small></div>" +
           '<div class="stat s0"><b>' + (n ? fmt(suma / n) : "–") + "</b><small>Promedio del curso</small></div>";
  CATS.forEach(function (c, i) {
    st += '<div class="stat ' + c.c + '"><b>' + cnt[i] + "</b><small>" + c.n + "</small></div>";
  });
  $("stats").innerHTML = st;
}

// ---------- Eventos ----------
$("curso").addEventListener("input", function (e) {
  S.curso = e.target.value;
  save();
});

$("addE").onclick = function () {
  var v = $("nom").value.trim();
  if (!v) { err("Escribe el nombre del estudiante."); return; }
  S.est.push({ id: Date.now(), n: v, g: {} });
  $("nom").value = "";
  err("");
  save();
  render();
};
$("nom").addEventListener("keydown", function (e) {
  if (e.key === "Enter") $("addE").click();
});

$("addA").onclick = function () {
  var v = $("act").value.trim();
  var w = parseFloat($("peso").value);
  if (!v || !(w > 0 && w <= 100)) {
    err("Escribe el nombre de la actividad y un peso entre 1 y 100.");
    return;
  }
  S.acts.push({ id: Date.now(), n: v, w: w });
  $("act").value = "";
  err("");
  save();
  render();
};

// Al escribir una nota se recalcula todo y se conserva el foco
$("tabla").addEventListener("input", function (ev) {
  var t = ev.target;
  if (!t.dataset.e) return;

  var e = S.est.filter(function (x) { return x.id == t.dataset.e; })[0];
  var v = t.value === "" ? undefined : parseFloat(t.value);

  if (v !== undefined && (isNaN(v) || v < 0 || v > 5)) {
    err("Las notas van de 0,0 a 5,0.");
    return;
  }
  err("");
  if (v === undefined) delete e.g[t.dataset.a];
  else e.g[t.dataset.a] = v;
  save();

  var ide = t.dataset.e, ida = t.dataset.a;
  render();
  var r = document.querySelector('input[data-e="' + ide + '"][data-a="' + ida + '"]');
  if (r) r.focus();
});

// Quitar estudiantes o actividades
$("tabla").addEventListener("click", function (ev) {
  var t = ev.target;
  if (t.dataset.de) {
    S.est = S.est.filter(function (x) { return x.id != t.dataset.de; });
    save(); render();
  }
  if (t.dataset.da) {
    S.acts = S.acts.filter(function (x) { return x.id != t.dataset.da; });
    save(); render();
  }
});

render();