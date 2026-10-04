import { AKTIONSPUNKTE, type Aktionsart } from "./aktionen";
import { bonus, charakter, type Charakter, type CharakterId } from "./charaktere";
import { abstand, erreichbar, gleich, kannTreffen, schrittZurueck, ziele, type Feld, type Form } from "./karte";
import { probe, vergleich, w100, ZONE_NAME, type Treffer, type Zone } from "./regeln";
import { kritZeile, patzerZeile } from "./tafeln";

export type Seite = "A" | "B";

export type BlickArt = "treffer" | "daneben" | "pariert" | "ausgewichen" | "gebrochen" | "patzer";

export interface Blick {
  angreifer: CharakterId;
  ziel: CharakterId;
  art: BlickArt;
  text: string;
}

export interface Kaempfer {
  id: CharakterId;
  name: string;
  seite: Seite;
  feld: Feld;
  wunden: number;
  wundenMax: number;
  vorteil: number;
  abwehr: "keine" | "parieren" | "ausweichen";
  malusAngriff: number;
  malusAbwehr: number;
  malusBewegung: number;
  liegt: boolean;
  blutung: boolean;
  armHin: boolean;
  beinHin: boolean;
  bewusstlos: number;
  wenigerAktionen: number;
  waffeHin: boolean;
  zoneWahl: boolean;
}

export interface Ansage {
  von: Seite;
  feld: Feld;
  form: Form;
  zone: Zone | null;
}

export interface Kampf {
  kaempfer: Record<Seite, Kaempfer>;
  amZug: Seite;
  punkte: number;
  eingehend: Ansage | null;
  angesetzt: Ansage | null;
  log: string[];
  blick: Blick | null;
  vorbei: boolean;
  sieger: Seite | null;
  rng: () => number;
}

function kaempfer(id: CharakterId, seite: Seite, feld: Feld): Kaempfer {
  const c = charakter(id);
  return {
    id,
    name: c.name,
    seite,
    feld,
    wunden: c.wunden,
    wundenMax: c.wunden,
    vorteil: 0,
    abwehr: "keine",
    malusAngriff: 0,
    malusAbwehr: 0,
    malusBewegung: 0,
    liegt: false,
    blutung: false,
    armHin: false,
    beinHin: false,
    bewusstlos: 0,
    wenigerAktionen: 0,
    waffeHin: false,
    zoneWahl: charakter(id).ortwahl,
  };
}

export function neuerKampf(a: CharakterId, b: CharakterId, rng: () => number = Math.random): Kampf {
  return {
    kaempfer: {
      A: kaempfer(a, "A", { x: 8, y: 48 }),
      B: kaempfer(b, "B", { x: 48, y: 8 }),
    },
    amZug: "A",
    punkte: AKTIONSPUNKTE,
    eingehend: null,
    angesetzt: null,
    log: ["Beide stehen. Die Form auf der Karte zeigt, wo ein Schlag treffen kann."],
    blick: null,
    vorbei: false,
    sieger: null,
    rng,
  };
}

export function andere(seite: Seite): Seite {
  return seite === "A" ? "B" : "A";
}

function bewegung(k: Kaempfer): number {
  const c = charakter(k.id);
  let weite = Math.max(1, c.bewegung - k.malusBewegung);
  if (k.beinHin) weite = 0;
  return weite;
}

export function laufFelder(state: Kampf, seite: Seite): Feld[] {
  const k = state.kaempfer[seite];
  if (k.liegt || k.bewusstlos > 0 || state.vorbei) return [];
  const gegner = state.kaempfer[andere(seite)].feld;
  return erreichbar(k.feld, bewegung(k), [gegner]);
}

export function schlagFelder(state: Kampf, seite: Seite): Feld[] {
  const k = state.kaempfer[seite];
  if (k.liegt || k.armHin || k.bewusstlos > 0 || state.vorbei) return [];
  const c = charakter(k.id);
  const gegner = state.kaempfer[andere(seite)].feld;
  return ziele(c.form, k.feld, c.reichweite, gegner, c.mindest);
}

export function kann(state: Kampf, art: Aktionsart): boolean {
  if (state.vorbei || state.punkte <= 0 && art !== "passen") return false;
  const k = state.kaempfer[state.amZug];
  if (k.bewusstlos > 0) return art === "passen";
  if (art === "passen") return true;
  if (art === "bewegen") return state.punkte >= 1 && (k.liegt || laufFelder(state, state.amZug).length > 0);
  if (art === "schlagen") return state.punkte >= 1 && schlagFelder(state, state.amZug).some((feld) => gleich(feld, state.kaempfer[andere(state.amZug)].feld));
  if (art === "parieren" || art === "ausweichen") return state.punkte >= 1 && k.abwehr === "keine";
  return false;
}

export function bewegen(state: Kampf, feld: Feld): Kampf {
  if (!kann(state, "bewegen")) return state;
  const next = klon(state);
  const k = next.kaempfer[next.amZug];
  if (k.liegt) {
    k.liegt = false;
    next.punkte -= 1;
    next.log.unshift(`${k.name} steht auf.`);
    return next;
  }
  if (!laufFelder(next, next.amZug).some((item) => gleich(item, feld))) return state;
  k.feld = feld;
  next.punkte -= 1;
  next.log.unshift(`${k.name} geht nach ${feld.x + 1},${feld.y + 1}.`);
  if (next.punkte <= 0) return abschluss(next);
  return next;
}

export function abwehrWaehlen(state: Kampf, art: "parieren" | "ausweichen"): Kampf {
  if (!kann(state, art)) return state;
  const next = klon(state);
  next.kaempfer[next.amZug].abwehr = art;
  next.punkte -= 1;
  next.log.unshift(`${next.kaempfer[next.amZug].name} setzt auf ${art === "parieren" ? "Parieren" : "Ausweichen"}.`);
  if (next.punkte <= 0) return abschluss(next);
  return next;
}

export function ankuendigen(state: Kampf, zone: Zone | null = null): Kampf {
  if (!kann(state, "schlagen")) return state;
  const next = klon(state);
  const k = next.kaempfer[next.amZug];
  const gegnerSeite = andere(next.amZug);
  const zoneFest = zone && charakter(k.id).ortwahl ? zone : null;
  next.punkte -= 1;
  schlagAufloesen(next, next.amZug, gegnerSeite, zoneFest);
  if (next.vorbei || next.punkte <= 0) return next.vorbei ? next : abschluss(next);
  return next;
}

export function passen(state: Kampf): Kampf {
  if (state.vorbei) return state;
  return abschluss(klon(state));
}

function abschluss(state: Kampf): Kampf {
  if (state.vorbei) return state;
  const naechste = andere(state.amZug);
  state.amZug = naechste;
  const k = state.kaempfer[naechste];
  k.abwehr = "keine";
  if (k.blutung && k.wunden > 0) {
    k.wunden -= 1;
    state.log.unshift(`${k.name} blutet. 1 Wunde.`);
    if (k.wunden <= 0) fallen(state, k, "Die Blutung entscheidet.");
  }
  if (k.bewusstlos > 0) {
    k.bewusstlos -= 1;
    state.log.unshift(k.bewusstlos > 0 ? `${k.name} ist bewusstlos.` : `${k.name} kommt zu sich.`);
  }
  state.punkte = k.bewusstlos > 0 ? 0 : Math.max(0, AKTIONSPUNKTE - k.wenigerAktionen);
  k.wenigerAktionen = 0;
  if (state.punkte === 0 && !state.vorbei) return abschluss(state);
  return state;
}

function laengenMalus(angriff: Charakter, abwehr: Charakter, distanz: number): number {
  if (angriff.form !== "nah" || abwehr.form !== "nah") return 0;
  const gedrangt = distanz <= 8;
  if (!gedrangt && angriff.laenge < abwehr.laenge) return 10;
  if (gedrangt && angriff.laenge > abwehr.laenge) return 10;
  return 0;
}

function schwaechsteZone(ruestung: Charakter["ruestung"]): Zone {
  const zonen: Zone[] = ["kopf", "arm-links", "arm-rechts", "koerper", "bein-links", "bein-rechts"];
  return zonen.reduce((beste, zone) => (ruestung[zone] < ruestung[beste] ? zone : beste));
}

function schlagAufloesen(state: Kampf, von: Seite, nach: Seite, festeZone: Zone | null): void {
  const a = state.kaempfer[von];
  const b = state.kaempfer[nach];
  const ac = charakter(a.id);
  const bc = charakter(b.id);
  const malus = laengenMalus(ac, bc, abstand(a.feld, b.feld));
  const fertigkeit = (ac.form === "nah" ? ac.ws : ac.bs) + a.vorteil * 10 - a.malusAngriff - (a.waffeHin ? 20 : 0) - malus;
  const wurf = w100(state.rng);
  const angriff = probe(fertigkeit, wurf);
  let abwehrProbe = null;
  if (b.abwehr !== "keine") {
    const wert = (b.abwehr === "parieren" ? bc.ws : bc.ausweichen) + b.vorteil * 10 - b.malusAbwehr;
    abwehrProbe = probe(wert, w100(state.rng));
  }
  const waffe = ac.schaden + (ac.laenge > 0 ? bonus(ac.staerke) : 0);
  const treffer = vergleich(angriff, abwehrProbe, waffe, bonus(bc.widerstand), 0);
  if (!treffer.getroffen || !treffer.zone) {
    if (abwehrProbe && abwehrProbe.sl > angriff.sl) b.vorteil += 1;
    a.vorteil = 0;
    const art: BlickArt = b.abwehr === "parieren" ? "pariert" : b.abwehr === "ausweichen" ? "ausgewichen" : treffer.patzer ? "patzer" : "daneben";
    state.blick = { angreifer: a.id, ziel: b.id, art, text: treffer.text };
    state.log.unshift(`${a.name}: ${treffer.text}${malus ? " Waffenlänge −10." : ""}`);
    if (treffer.patzer) patzerAnwenden(state, a);
    return;
  }
  const spanne = angriff.sl - (abwehrProbe?.sl ?? 0);
  const ort = ac.ortwahl && (spanne >= 2 || angriff.kritisch);
  let zone = treffer.zone;
  if (ort && festeZone) zone = festeZone;
  else if (ort) zone = schwaechsteZone(bc.ruestung);
  const ruestung = angriff.kritisch ? 0 : bc.ruestung[zone];
  const korrigiert = vergleich(angriff, abwehrProbe, waffe, bonus(bc.widerstand), ruestung);
  korrigiert.zone = zone;
  korrigiert.text = korrigiert.text.replace(ZONE_NAME[treffer.zone], ZONE_NAME[zone]);
  b.wunden -= korrigiert.wunden;
  a.vorteil += 1;
  b.vorteil = 0;
  state.blick = { angreifer: a.id, ziel: b.id, art: "treffer", text: korrigiert.text };
  const extra: string[] = [];
  if (malus) extra.push("Waffenlänge −10.");
  if (festeZone && !ort) extra.push("Die Zone bleibt dem Wurf, der Vorsprung fehlt.");
  if (ort && zone !== treffer.zone) extra.push(`Ort gewählt: ${ZONE_NAME[zone]}.`);
  if (angriff.kritisch) extra.push("Die Rüstung wird umgangen.");
  if (korrigiert.wunden > 0 && spanne >= 2) extra.push(effektAnwenden(a.id, b));
  state.log.unshift(`${a.name} gegen ${b.name}: ${korrigiert.text} ${extra.join(" ")}`.trim());
  if (korrigiert.kritisch) kritischAnwenden(state, b, zone);
  if (b.wunden <= 0) fallen(state, b, "Die Wunden sind auf 0.");
}

function effektAnwenden(von: CharakterId, ziel: Kaempfer): string {
  const effekt = charakter(von).effekt;
  if (effekt === "sturz") {
    ziel.liegt = true;
    return "Sturz.";
  }
  if (effekt === "blutung") {
    ziel.blutung = true;
    return "Blutung.";
  }
  if (effekt === "fessel") {
    ziel.wenigerAktionen += 1;
    return "Gefesselt, eine Aktion weniger.";
  }
  return "";
}

function kritischAnwenden(state: Kampf, ziel: Kaempfer, zone: Zone): void {
  const wurf = w100(state.rng);
  const zeile = kritZeile(zone, wurf);
  if (zeile.wunden > 0) ziel.wunden -= zeile.wunden;
  if (/Blutung/.test(zeile.folge)) ziel.blutung = true;
  if (/Aktion weniger/.test(zeile.folge)) ziel.wenigerAktionen += 1;
  if (/−20|−10/.test(zeile.folge)) ziel.malusAngriff += /−20/.test(zeile.folge) ? 20 : 10;
  if (/Bewegung −1/.test(zeile.folge)) ziel.malusBewegung += 1;
  if (/halbiert/.test(zeile.folge)) ziel.malusBewegung += 2;
  if (/nicht mehr gehen/.test(zeile.folge)) ziel.beinHin = true;
  if (/schlägt nicht mehr/.test(zeile.folge)) ziel.armHin = true;
  if (/Keine Aktion/.test(zeile.folge)) ziel.bewusstlos = Math.max(ziel.bewusstlos, 1);
  if (/zurück/.test(zeile.folge)) {
    const weg = schrittZurueck(ziel.feld, state.kaempfer[andere(ziel.seite)].feld);
    if (weg) ziel.feld = weg;
  }
  state.log.unshift(`Kritisch ${zeile.name} (${wurf}). ${zeile.folge}`);
  if (zeile.tot) fallen(state, ziel, zeile.folge);
}

function patzerAnwenden(state: Kampf, wer: Kaempfer): void {
  const wurf = w100(state.rng);
  const zeile = patzerZeile(wurf);
  if (zeile.name === "Eigenhieb") wer.wunden -= 1;
  if (zeile.name === "Verhakt") wer.wenigerAktionen += 1;
  if (zeile.name === "Stolpern") {
    const weg = schrittZurueck(wer.feld, state.kaempfer[andere(wer.seite)].feld);
    if (weg) wer.feld = weg;
  }
  if (zeile.name === "Bloßgelegt") wer.malusAbwehr += 20;
  if (zeile.name === "Gestürzt") wer.liegt = true;
  if (zeile.name === "Waffe hin") wer.waffeHin = true;
  state.log.unshift(`Patzer ${zeile.name} (${wurf}). ${zeile.folge}`);
  if (wer.wunden <= 0) fallen(state, wer, "Der Patzer war genug.");
}

function fallen(state: Kampf, wer: Kaempfer, grund: string): void {
  wer.wunden = Math.min(wer.wunden, 0);
  state.vorbei = true;
  state.sieger = andere(wer.seite);
  state.punkte = 0;
  state.blick = { angreifer: state.kaempfer[andere(wer.seite)].id, ziel: wer.id, art: "gebrochen", text: grund };
  state.log.unshift(`${wer.name} fällt. ${grund}`);
}

function klon(state: Kampf): Kampf {
  return {
    ...state,
    kaempfer: { A: { ...state.kaempfer.A, feld: { ...state.kaempfer.A.feld } }, B: { ...state.kaempfer.B, feld: { ...state.kaempfer.B.feld } } },
    eingehend: state.eingehend ? { ...state.eingehend, feld: { ...state.eingehend.feld } } : null,
    angesetzt: state.angesetzt ? { ...state.angesetzt, feld: { ...state.angesetzt.feld } } : null,
    log: [...state.log],
    blick: state.blick,
  };
}

export function bot(state: Kampf): Kampf {
  const seite = state.amZug;
  let next = state;
  const noch = () => next.amZug === seite && !next.vorbei;
  const gegner = () => next.kaempfer[andere(seite)];
  const ich = () => next.kaempfer[seite];
  let geschlagen = false;
  let gewichen = false;
  while (noch()) {
    const c = charakter(ich().id);
    if (!geschlagen && kann(next, "schlagen")) {
      next = ankuendigen(next, null);
      geschlagen = true;
      continue;
    }
    if (geschlagen && !gewichen && c.bewegung >= 40 && kann(next, "bewegen")) {
      gewichen = true;
      const weit = laufFelder(next, seite).sort((a, b) => abstand(b, gegner().feld) - abstand(a, gegner().feld))[0];
      if (weit && abstand(weit, gegner().feld) >= 32) {
        next = bewegen(next, weit);
      }
      break;
    }
    if (kann(next, "schlagen")) {
      next = ankuendigen(next, null);
      continue;
    }
    if (gegnerTrifft(next, seite, ich().feld)) {
      const fertig = c.ausweichen > c.ws ? c.ausweichen : c.ws;
      if (fertig >= 45 && c.ausweichen > c.ws && kann(next, "ausweichen")) {
        next = abwehrWaehlen(next, "ausweichen");
        continue;
      }
      if (fertig >= 45 && kann(next, "parieren")) {
        next = abwehrWaehlen(next, "parieren");
        continue;
      }
    }
    if (!kann(next, "bewegen")) break;
    const schritte = laufFelder(next, seite);
    const nah = charakter(gegner().id).form === "nah";
    const treffend = schritte.filter((feld) => kannTreffen(c.form, feld, c.reichweite, gegner().feld, c.mindest));
    const ziel = (treffend.length ? treffend : schritte).sort((a, b) => {
      const da = abstand(a, gegner().feld);
      const db = abstand(b, gegner().feld);
      if (c.form !== "nah" && nah) return db - da;
      return da - db;
    })[0];
    if (!ziel) break;
    const vorher = ich().feld;
    next = bewegen(next, ziel);
    if (gleich(vorher, ich().feld)) break;
  }
  if (noch()) next = passen(next);
  return next;
}

export function gegnerTrifft(state: Kampf, seite: Seite, feld: Feld): boolean {
  const gegner = state.kaempfer[andere(seite)];
  const c = charakter(gegner.id);
  return kannTreffen(c.form, gegner.feld, c.reichweite, feld, c.mindest);
}

export function imMuster(state: Kampf, seite: Seite, feld: Feld): boolean {
  return gegnerTrifft(state, seite, feld);
}

export function bedroht(state: Kampf, seite: Seite): boolean {
  return gegnerTrifft(state, seite, state.kaempfer[seite].feld);
}

export function formName(form: Form): string {
  if (form === "nah") return "Nahkampf";
  if (form === "schuss") return "Schuss";
  return "Bogen";
}

export type { Treffer };
