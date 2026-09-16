// Naseeb Mind: shared page scripts. Requires characters.js to be loaded first.
// ES5 string concat on purpose: plenty of school phones here still run an old
// Android browser.

var TILE='#2E8FA8', TILE_D='#1F6B80';
var STONE='#E8DCC0', STONE_D='#D5C6A2', STONE_L='#F2E9D5';
var GOLD='#C08A2E', DEEP='#16505F';
var FOOT = 238;   // y of the feet inside a character's own 200x250 viewBox

function inner(k, side){ return charSvg(k, '', side).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); }

/* ================= Registan hero scene ================= */

function finial(x, y){
  return '<path d="M'+x+' '+y+' v-14" stroke="'+GOLD+'" stroke-width="3.5" stroke-linecap="round"/>'
       + '<circle cx="'+x+'" cy="'+(y-18)+'" r="4.5" fill="'+GOLD+'"/>';
}

// Ribbed melon dome on a drum; y is the bottom of the drum.
function ribbedDome(x, y, r){
  var dh = r*1.68, drum = r*0.78, i, f;
  var s = '<g transform="translate('+x+','+y+')">'
    + '<rect x="'+(-r*0.66)+'" y="'+(-drum)+'" width="'+(r*1.32)+'" height="'+drum+'" fill="'+STONE+'"/>'
    + '<rect x="'+(-r*0.66)+'" y="'+(-drum)+'" width="'+(r*1.32)+'" height="9" fill="'+STONE_D+'"/>'
    + '<path d="M'+(-r)+' '+(-drum)+' C'+(-r)+' '+(-drum-r*0.85)+' '+(-r*0.44)+' '+(-drum-dh*0.72)
    + ' 0 '+(-drum-dh)+' C'+(r*0.44)+' '+(-drum-dh*0.72)+' '+r+' '+(-drum-r*0.85)+' '+r+' '+(-drum)
    + ' Z" fill="'+TILE+'"/><g stroke="'+TILE_D+'" stroke-width="1.8" fill="none" opacity=".45">';
  for (i = -2; i <= 2; i++){
    if (!i){ s += '<path d="M0 '+(-drum-dh)+' V'+(-drum)+'"/>'; continue; }
    f = i/2.6;
    s += '<path d="M'+(f*r*0.5)+' '+(-drum-dh*0.86)+' C'+(f*r*0.8)+' '+(-drum-dh*0.5)
       + ' '+(f*r)+' '+(-drum-dh*0.24)+' '+(f*r)+' '+(-drum)+'"/>';
  }
  return s + '</g>' + finial(0, -drum-dh) + '</g>';
}

function minaret(x, g, h){
  return '<g transform="translate('+x+','+g+')">'
    + '<path d="M-14 0 L-9.5 '+(-h)+' h19 L14 0 Z" fill="'+STONE+'"/>'
    + '<g fill="'+TILE+'" opacity=".7">'
    + '<rect x="-12.6" y="'+(-h*0.34)+'" width="25" height="10"/>'
    + '<rect x="-11.4" y="'+(-h*0.60)+'" width="23" height="10"/>'
    + '<rect x="-10.4" y="'+(-h*0.84)+'" width="21" height="10"/></g>'
    + '<rect x="-17" y="'+(-h-14)+'" width="34" height="14" rx="3" fill="'+TILE_D+'"/>'
    + '<path d="M-11 '+(-h-14)+' C-11 '+(-h-32)+' 0 '+(-h-39)+' 0 '+(-h-52)
    + ' C0 '+(-h-39)+' 11 '+(-h-32)+' 11 '+(-h-14)+' Z" fill="'+TILE+'"/>'
    + finial(0, -h-52) + '</g>';
}

// Sherdor's sun. The real mosaic is a lion with a human-faced sun rising behind it;
// the lion does not survive being drawn this small, the sun does.
function sherMotif(x, y, sc, flip){
  return '<g transform="translate('+x+','+y+') scale('+(flip?-sc:sc)+','+sc+')">'
    + '<g stroke="'+GOLD+'" stroke-width="2.4" stroke-linecap="round">'
    + '<path d="M0 -17 v-6"/><path d="M12 -12 l4.5 -4.5"/><path d="M17 0 h6"/>'
    + '<path d="M12 12 l4.5 4.5"/><path d="M0 17 v6"/><path d="M-12 12 l-4.5 4.5"/>'
    + '<path d="M-17 0 h-6"/><path d="M-12 -12 l-4.5 -4.5"/></g>'
    + '<circle r="12" fill="'+GOLD+'"/>'
    + '<g fill="#6B4A12"><circle cx="-4" cy="-2" r="1.5"/><circle cx="4" cy="-2" r="1.5"/></g>'
    + '<path d="M-4.5 3.5 q4.5 4 9 0" stroke="#6B4A12" stroke-width="1.6" fill="none" '
    + 'stroke-linecap="round"/></g>';
}

// A madrasa: arcaded wings, a tall central pishtoq, optional domes and minarets.
function madrasa(cx, g, w, h, o){
  o = o || {};
  var pw = w*0.40, wingH = h*0.60, s = '', i, side, nx, nw = 26, gap = 14;
  if (o.domes) for (i = 0; i < o.domes.length; i++)
    s += ribbedDome(cx + o.domes[i][0], g - wingH + 6, o.domes[i][1]);
  s += '<g transform="translate('+cx+','+g+')">'
     + '<rect x="'+(-w/2)+'" y="'+(-wingH)+'" width="'+w+'" height="'+wingH+'" fill="'+STONE+'"/>'
     + '<rect x="'+(-w/2)+'" y="'+(-wingH)+'" width="'+w+'" height="12" fill="'+STONE_D+'"/>';
  for (side = -1; side <= 1; side += 2){
    for (i = 0; i < 3; i++){
      nx = side*(pw/2 + 16 + i*(nw+gap)) - (side < 0 ? nw : 0);
      s += '<path d="M'+nx+' -8 v'+(-wingH*0.44)+' q0 -20 '+(nw/2)+' -20 q'+(nw/2)+' 0 '+(nw/2)
         + ' 20 v'+(wingH*0.44)+' Z" fill="'+DEEP+'" opacity=".82"/>';
    }
  }
  s += '<rect x="'+(-pw/2)+'" y="'+(-h)+'" width="'+pw+'" height="'+h+'" fill="'+STONE_L+'"/>'
     + '<rect x="'+(-pw/2)+'" y="'+(-h)+'" width="'+pw+'" height="14" fill="'+STONE_D+'"/>'
     + '<path d="M'+(-pw*0.32)+' 0 V'+(-h*0.52)+' Q'+(-pw*0.32)+' '+(-h*0.86)+' 0 '+(-h*0.90)
     + ' Q'+(pw*0.32)+' '+(-h*0.86)+' '+(pw*0.32)+' '+(-h*0.52)+' V0 Z" fill="'+TILE_D+'"/>'
     + '<path d="M'+(-pw*0.24)+' 0 V'+(-h*0.52)+' Q'+(-pw*0.24)+' '+(-h*0.80)+' 0 '+(-h*0.84)
     + ' Q'+(pw*0.24)+' '+(-h*0.80)+' '+(pw*0.24)+' '+(-h*0.52)+' V0 Z" fill="'+DEEP+'"/>'
     + '<g fill="'+TILE+'" opacity=".8">';
  for (i = 0; i < 4; i++){
    s += '<rect x="'+(-pw/2+5)+'" y="'+(-h+22+i*20)+'" width="9" height="9"/>'
       + '<rect x="'+(pw/2-14)+'" y="'+(-h+22+i*20)+'" width="9" height="9"/>';
  }
  s += '</g>';
  if (o.sher) s += sherMotif(-pw*0.34, -h*0.76, 1.15, false) + sherMotif(pw*0.34, -h*0.76, 1.15, true);
  s += '</g>';
  if (o.minarets) s += minaret(cx - w/2 - 4, g, o.minarets) + minaret(cx + w/2 + 4, g, o.minarets);
  return s;
}

// The photographed backdrop. One layer, drawn first; the characters stay
// separate <g> elements on top of it so they can still be repositioned, rescaled
// or swapped one at a time.
var SCENE_BG = 'assets/backgrounds/islom-sivilizatsiyasi-markazi.webp';
var SCENE_BG_W = 2172, SCENE_BG_H = 724;

// Where the open plaza starts in the source image, as a fraction of its height.
// Measured off the artwork, not guessed: the drawing this replaces gave the cast
// a quarter of the scene to stand in, the photograph gives about an eighth.
//
// Two ways to buy back the depth were tried and both cost more than they gave --
// zooming in crops the wings and minarets away, and lifting the image to paint
// extra floor underneath leaves a flat band no single colour can blend into,
// because the real plaza has perspective and this one would not. So the cast
// moves instead. It sits deeper in frame than it did, which is simply what this
// photograph's own perspective asks for.
//
// Every character's feet must land below this line or they stand on the steps.
// i18n_test.js checks that against SCENE_CAST so a future reposition cannot
// quietly float someone again.
var SCENE_BG_PLAZA = 0.87;

// Hoisted out of buildScene so the tests can read the positions without having
// to parse the emitted SVG. [key, x, footY, scale] in viewBox units.
// Further away reads as higher and smaller, which is the order of these rows.
// Nobody stands closer than ~515: a figure needs floor BELOW its feet as well as
// under them, or its shadow and reflection fall off the bottom of the frame and
// it goes back to looking pasted on. Learned the hard way at 522.
var SCENE_CAST = [['ES|O',300,468,0.56], ['A|C',906,470,0.58],
                  ['E|A',420,490,0.76],  ['O|C',786,492,0.76],
                  ['ES|E',548,512,0.96], ['E|O',664,515,0.94]];

function buildScene(){
  var W = 1200, H = 530, s = '', i;
  // Cover, not fit: scale by height so the image fills the box top to bottom and
  // the sides overhang. That is what crops the outer minarets on a narrow screen
  // while keeping the dome and the entrance centred, which is the same trade the
  // outer preserveAspectRatio="xMidYMax slice" already makes for the characters.
  var bsc = H / SCENE_BG_H, bw = SCENE_BG_W * bsc, bx = (W - bw) / 2;
  s += '<image href="' + tmAssetPath(SCENE_BG) + '" x="' + bx.toFixed(1) + '" y="0"'
     + ' width="' + bw.toFixed(1) + '" height="' + H + '"'
     + ' preserveAspectRatio="xMidYMid slice"/>';

  // Contact shadow and reflection. Every character used to be vector art with a
  // shadow ellipse drawn into it; the redesigned ones are photographs with no
  // shadow at all, so against a real floor they read as stickers laid on top of
  // the picture rather than people standing on it. Both are drawn here, per
  // figure and scaled with it, so the approved artwork is never touched.
  s += '<defs>'
     // Two ellipses, not one. The wide soft pool is ambient occlusion -- it says
     // "something is standing here". The tight dark one right under the soles is
     // the contact patch, and it is the part that actually makes a figure touch
     // the floor instead of hover a few centimetres above it.
     + '<radialGradient id="tmsh"><stop offset="0" stop-color="#4A3A28" stop-opacity=".30"/>'
     + '<stop offset=".5" stop-color="#4A3A28" stop-opacity=".14"/>'
     + '<stop offset="1" stop-color="#4A3A28" stop-opacity="0"/></radialGradient>'
     + '<radialGradient id="tmsh2"><stop offset="0" stop-color="#3A2C1E" stop-opacity=".50"/>'
     + '<stop offset=".6" stop-color="#3A2C1E" stop-opacity=".22"/>'
     + '<stop offset="1" stop-color="#3A2C1E" stop-opacity="0"/></radialGradient>'
     // Local figure coords: y=238 is the sole, y=150 is roughly the waist. The
     // reflection is strongest at the sole and gone by the waist, which is what
     // a polished floor does -- a full-length mirror image would look like ice.
     + '<linearGradient id="tmrg" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="238">'
     + '<stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>'
     + '<mask id="tmrefl"><rect x="0" y="0" width="200" height="250" fill="url(#tmrg)"/></mask>'
     + '</defs>';

  var cast = SCENE_CAST;
  for (i = 0; i < cast.length; i++){
    var c = cast[i], sc = c[3], fig = inner(c[0]);
    // Mirrored about the sole: local (100, FOOT) still lands on (x, footY), but
    // everything above the feet is thrown downward instead of up.
    s += '<g transform="translate('+(c[1]-100*sc)+','+(c[2]+FOOT*sc)+') scale('+sc+','+(-sc)+')">'
       + '<g mask="url(#tmrefl)" opacity=".26">' + fig + '</g></g>';
    s += '<ellipse cx="'+c[1]+'" cy="'+c[2]+'" rx="'+(58*sc).toFixed(1)+'" ry="'+(13*sc).toFixed(1)
       + '" fill="url(#tmsh)"/>'
       + '<ellipse cx="'+c[1]+'" cy="'+(c[2]-1).toFixed(1)+'" rx="'+(27*sc).toFixed(1)+'" ry="'+(6*sc).toFixed(1)
       + '" fill="url(#tmsh2)"/>';
    s += '<g transform="translate('+(c[1]-100*sc)+','+(c[2]-FOOT*sc)+') scale('+sc+')">'+fig+'</g>';
  }
  // slice keeps the characters large on a phone by cropping the sides instead of shrinking
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMax slice" '
       + 'xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}

/* ================= small vignettes for the explainer panels ================= */

// The vignettes are composed on a 400x272 field, but the ink only lands in
// x 26..373, y 42..270 of it -- an empty band 42 deep across the top and about
// 26 down each side. The <svg> was showing the field rather than the drawing,
// so a good part of the width the page gives these boxes went to margin and the
// figures came out small, floating in the middle. This window is the drawing
// plus an even margin. The box keeps its width on the page, so cropping the
// empty band is what makes everything inside it bigger.
var VG_VIEW = {x: 14, y: 30, w: 372, h: 242};

// The sample result card carries five bars, so it needs a taller window than the
// two drawn vignettes below it. It used to be 300 to fit two lines of small
// print under a rule; that caption is gone and the height came down with it,
// because leaving the box at 300 would have left 68px of white under the last
// bar and read as a rendering fault rather than as space.
var VG_CARD_VIEW = {x: 14, y: 30, w: 372, h: 252};

function esc(s){
  return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
  });
}

function vgFrame(body, view){
  var v = view || VG_VIEW;
  return '<svg viewBox="'+v.x+' '+v.y+' '+v.w+' '+v.h+'" xmlns="http://www.w3.org/2000/svg">'
       + '<rect x="'+v.x+'" y="'+v.y+'" width="'+v.w+'" height="'+v.h+'" rx="16" fill="#FFFFFF"/>'
       + body + '</svg>';
}
function figAt(k, cx, footY, sc, side){
  return '<g transform="translate('+(cx-100*sc)+','+(footY-FOOT*sc)+') scale('+sc+')">'+inner(k, side)+'</g>';
}

// 1. A student in front of a result card that carries their own face.
//
// A real archetype, and everything about the card is read from the same data the
// result screen uses -- name, family colour, artwork -- so the preview cannot
// drift from the page it is previewing. That is why the card header turned teal
// when the figure became Amir Temur: he is the male figure of Tashkilotchi, and
// Tashkilotchi is a Leader. Painting a Leader's card in the Anchors' bronze
// would have made the homepage prettier by showing something the test never
// produces. Nothing else on this page draws E|C, so no character appears twice.
var VG_CARD = 'E|C';
// Which of the two figures to draw. The archetype's default artwork here is
// Nodirabegim; Amir Temur is the male variant and has to be asked for by name.
var VG_CARD_FIGURE = 'male';

// The five bars. Values are a plausible Tashkilotchi profile as fractions of the
// 1..5 scale, sorted the way the result sorts them, and the two that DEFINE the
// archetype are painted in the family colour while the other three sit in a
// tint. That is the whole idea of the test in one picture: your two strongest
// traits are your obraz, the other three are still yours and still shown.
var VG_BARS = [
  {t: 'E',  v: 0.86},
  {t: 'C',  v: 0.80},
  {t: 'A',  v: 0.58},
  {t: 'ES', v: 0.52},
  {t: 'O',  v: 0.46}
];

var VG_LABEL_W = 150, VG_LABEL_SIZE = 11.5;

function vgTrait(t){ return (typeof tmTrait === 'function') ? tmTrait(t) : t; }
function vgUi(k, fallback){
  var s = (typeof tmUi === 'function') ? tmUi(k) : '';
  return s || fallback;
}

function vgResult(){
  var k = VG_CARD, side = VG_CARD_FIGURE;
  var arch = (typeof tmArch === 'function') ? tmArch(k) : ARCHETYPES[k];
  var fam = FAMILIES[ARCHETYPES[k].fam];
  var famName = (typeof tmFam === 'function') ? tmFam(ARCHETYPES[k].fam) : fam.name;
  var defining = k.split('|');
  var v = VG_CARD_VIEW, L = v.x + 20, R = v.x + v.w - 20, i, r, y;

  // Portrait, in a tinted well. Clipped, because a raster figure is fitted to
  // its own box and a few of them lean past it.
  var cid = 'vgclip' + (++TM_UID);
  var b = '<clipPath id="' + cid + '"><rect x="' + L + '" y="' + (v.y + 20)
        + '" width="82" height="96" rx="12"/></clipPath>'
    + '<rect x="' + L + '" y="' + (v.y + 20) + '" width="82" height="96" rx="12" fill="'
    + fam.soft + '"/>'
    + '<g clip-path="url(#' + cid + ')"><g transform="translate(' + (L + 41 - 100 * 0.40)
    + ',' + (v.y + 22) + ') scale(0.40)">' + inner(k, side) + '</g></g>';

  // Who this is.
  var tx = L + 96;
  b += '<text x="' + tx + '" y="' + (v.y + 40) + '" font-family="Inter,Segoe UI,sans-serif" '
    + 'font-size="12" fill="#6E6558">' + esc(vgUi('vgYours', 'Sizning obrazingiz')) + '</text>'
    + '<text x="' + tx + '" y="' + (v.y + 64) + '" font-family="Bitter,Georgia,serif" '
    + 'font-size="21" font-weight="700" class="vgname" fill="' + fam.c + '">'
    + esc(arch.name) + '</text>'
    + '<text x="' + tx + '" y="' + (v.y + 84) + '" font-family="Inter,Segoe UI,sans-serif" '
    + 'font-size="12" fill="#6E6558">' + esc(famName) + '</text>';

  // The five bars.
  // The label column has to hold «Эмоциональная стабильность», which is twice the
  // length of its Uzbek original. Wide enough that no language is squeezed by
  // default, and fitBarLabels below shrinks anything that still does not fit
  // rather than letting it run under the bar.
  var barL = L + VG_LABEL_W, barR = R, barW = barR - barL;
  for (i = 0; i < VG_BARS.length; i++){
    r = VG_BARS[i];
    y = v.y + 140 + i * 22;
    b += '<text x="' + L + '" y="' + (y + 4) + '" font-family="Inter,Segoe UI,sans-serif" '
      + 'font-size="' + VG_LABEL_SIZE + '" class="vglabel" fill="#2B2620">'
      + esc(vgTrait(r.t)) + '</text>'
      + '<rect x="' + barL + '" y="' + (y - 4) + '" width="' + barW + '" height="8" rx="4" fill="#EFE9DD"/>'
      + '<rect x="' + barL + '" y="' + (y - 4) + '" width="' + (barW * r.v).toFixed(1)
      + '" height="8" rx="4" fill="' + fam.c + '"'
      + (defining.indexOf(r.t) < 0 ? ' opacity=".38"' : '') + '/>';
  }

  // A rule and two lines of small print used to sit here saying this was a
  // sample and that you could send your own to friends. The surrounding section
  // already says both, and the card reads as an illustration on sight, so the
  // caption was explaining the obvious in the smallest type on the page.
  return vgFrame(b, v);
}

// The archetype name on that card is translated, and a Russian name runs half
// again as long as its Uzbek original -- «Устойчивый Стратег» is 189px in a card
// 176px wide. Nothing can measure text before it is in the document, so the name
// is sized once it is, and only where it has to be: no language gets a smaller
// name than it needs. Re-run after the webfont lands, because Georgia's metrics
// are not Bitter's, and always from the same starting size so repeated calls
// cannot compound.
//
// Selected by class, not by being the first <text> in the card. It used to be
// the first one; the card now opens with a "your character" label, and picking
// by position would shrink that instead and leave the long name overflowing.
var VG_NAME_SIZE = 21;
function fitCardName(box){
  var t = box.querySelector('text.vgname');
  if (!t || !t.getComputedTextLength) return;
  // Room from where the name starts to the right edge of the card.
  var max = VG_CARD_VIEW.x + VG_CARD_VIEW.w - 20 - (parseFloat(t.getAttribute('x')) || 0);
  function fit(){
    t.setAttribute('font-size', String(VG_NAME_SIZE));
    var w;
    try { w = t.getComputedTextLength(); } catch (e) { return; }
    if (w > max) t.setAttribute('font-size', (VG_NAME_SIZE * max / w).toFixed(2));
  }
  fit();
  if (document.fonts && document.fonts.ready && document.fonts.ready.then)
    document.fonts.ready.then(fit);
  fitBarLabels(box);
}

// Same idea for the five trait names beside the bars. Uzbek and English fit the
// column; Russian «Эмоциональная стабильность» does not, and before this it was
// drawn straight through the bar next to it.
function fitBarLabels(box){
  var labels = box.querySelectorAll('text.vglabel');
  if (!labels.length || !labels[0].getComputedTextLength) return;
  var max = VG_LABEL_W - 10;
  function fit(){
    for (var i = 0; i < labels.length; i++){
      var t = labels[i], w;
      t.setAttribute('font-size', String(VG_LABEL_SIZE));
      try { w = t.getComputedTextLength(); } catch (e) { return; }
      if (w > max) t.setAttribute('font-size', (VG_LABEL_SIZE * max / w).toFixed(2));
    }
  }
  fit();
  if (document.fonts && document.fonts.ready && document.fonts.ready.then)
    document.fonts.ready.then(fit);
}

// 2. Two students, different results, understanding each other.
function vgOthers(){
  var b = '<ellipse cx="200" cy="252" rx="170" ry="12" fill="#0B2027" opacity=".05"/>'
    + figAt('E|A', 112, 250, 0.86) + figAt('ES|E', 292, 250, 0.86)
    + '<g fill="#237A5E" opacity=".55">'
    + '<circle cx="176" cy="70" r="6"/><circle cx="200" cy="60" r="8"/><circle cx="228" cy="70" r="6"/></g>'
    + '<path d="M150 96 q50 -30 104 0" stroke="#237A5E" stroke-width="3" fill="none"'
    + ' stroke-linecap="round" stroke-dasharray="2 9" opacity=".6"/>';
  return vgFrame(b);
}

// 3. A signpost: the same person, several possible directions.
//
// Toʻmaris, the female figure of Barqaror Strateg. She is asked for by name
// because the archetype's own artwork is al-Xorazmiy; and she replaced Bahouddin
// Naqshband here, who was already standing in the hero scene and in the vignette
// above this one -- three appearances on one page made the homepage look like it
// had one character rather than ten.
function vgFuture(){
  var b = '<ellipse cx="200" cy="252" rx="170" ry="12" fill="#0B2027" opacity=".05"/>'
    + '<g transform="translate(286,0)">'
    + '<rect x="-5" y="72" width="10" height="178" fill="#A5866040"/>'
    + '<rect x="-5" y="72" width="10" height="178" fill="#9C7C52"/>'
    + '<g font-family="Inter,Segoe UI,sans-serif" font-size="13" font-weight="600" fill="#FFFFFF">'
    + '<path d="M-78 84 h140 l16 15 -16 15 h-140 z" fill="#0F6E8C"/>'
    + '<text x="-68" y="104">Kasb</text>'
    + '<path d="M-92 126 h154 l16 15 -16 15 h-154 z" fill="#C08A2E"/>'
    + '<text x="-82" y="146">Yoʻnalish</text>'
    + '<path d="M-70 168 h132 l16 15 -16 15 h-132 z" fill="#237A5E"/>'
    + '<text x="-60" y="188">Fan</text></g></g>'
    + figAt('ES|C', 120, 250, 0.86, 'female');
  return vgFrame(b);
}

/* ================= character gallery ================= */

var FAM_ORDER = ['lead','crea','care','base'];
// FAM_NOTES moved to characters.js: the page generators read it from there, and
// two copies of the same four lines had no way of staying in step.

// full=true adds the first description line (used on the Obrazlar page).
function buildGallery(full){
  var byFam = {}, html = '', i, j, k, f, fam, keys, a;
  for (k in ARCHETYPES){ a = ARCHETYPES[k]; (byFam[a.fam] = byFam[a.fam] || []).push(k); }
  for (i = 0; i < FAM_ORDER.length; i++){
    f = FAM_ORDER[i]; fam = FAMILIES[f]; keys = byFam[f] || [];
    // heading levels stay in order: page h1 -> family h2 -> card h3
    html += '<div class="fam" style="--famc:'+fam.c+';--famsoft:'+fam.soft+';--famdark:'+fam.dark+';--famlit:'+fam.lit+'">'
          + '<div class="famhead"><h2 class="famname">'+tmFam(f)+'</h2>'
          + '<span class="famnote">'+tmFamNote(f)+'</span></div><div class="cards">';
    for (j = 0; j < keys.length; j++){
      a = tmArch(keys[j]);
      html += '<a class="ccard" href="obraz-'+a.slug+'.html">'
            + '<div class="cart">'+charSvg(keys[j], a.name)+'</div>'
            + '<div class="cbody"><h3 class="cname">'+a.name+'</h3>'
            + (full ? '<p class="cline">'+a.lines[0]+'</p>' : '')
            + '<p class="cstr">'+tmUi('strength')+a.strength+'</p>'
            + (full ? '<p class="cwatch">'+tmUi('watch')+a.watch+'</p>' : '')
            + '<p class="cfig">'+tmUi('fig')+'<b>'+a.figure.who+'</b> · '+a.figure.years+'</p>'
            + '</div></a>';
    }
    html += '</div></div>';
  }
  return html;
}

// Full-bleed colour band per family, characters in a row - the layout used by
// 16personalities.com/personality-types. Each character links to its own page.
function buildBands(){
  var byFam = {}, html = '', i, j, k, f, fam, keys, a;
  for (k in ARCHETYPES){ a = ARCHETYPES[k]; (byFam[a.fam] = byFam[a.fam] || []).push(k); }
  for (i = 0; i < FAM_ORDER.length; i++){
    f = FAM_ORDER[i]; fam = FAMILIES[f]; keys = byFam[f] || [];
    html += '<section class="famband" style="--famc:'+fam.c+';--famsoft:'+fam.soft+';--famdark:'+fam.dark+';--famlit:'+fam.lit+'">'
          + '<div class="wrap"><h2 class="famtitle">'+tmFam(f)+'</h2>'
          + '<p class="famsub">'+tmFamNote(f)+'</p><div class="famrow">';
    for (j = 0; j < keys.length; j++){
      a = tmArch(keys[j]);
      html += '<a class="ftype" href="obraz-'+a.slug+'.html">'
            + '<span class="ftart">'+charSvg(keys[j], a.name)+'</span>'
            + '<span class="ftname">'+a.name+'</span>'
            + '<span class="ftdesc">'+a.lines[0]+'</span>'
            + '<span class="ftfig">'+a.figure.who+'</span></a>';
    }
    html += '</div></div></section>';
  }
  return html;
}

/* ================= shared behaviour ================= */

// If an unfinished test is saved on this device, say so on every start button.
// The nav button is the account control. It ships signed-out ("Kirish"), because
// that is what a first-time visitor and every crawler must see; if this device
// has a session, the label and destination are swapped here.
//
// Reads the stored session directly rather than loading account.js: these pages
// need one boolean, not a whole auth client, and account.js talks to Supabase on
// load. A present refresh token, not the access token's expiry, is what says
// "signed in" -- an expired access token is refreshed by the test page itself.
/* The account control in the header. These are ordinary pages, not the test, so
   "my results" and "carry on" are links to test.html and the module lets them
   behave as links; only signing out happens here, and it happens in place so the
   pill goes back to saying "Kirish" without a reload. */
function mountAccountNav(){
  if (typeof NMNav === 'undefined') return;
  NMNav.mount({});
}

/* The light/dark switch beside it. The theme itself was already applied by
   the inline script in <head>; this only wires the button. */
function mountThemeSwitch(){
  if (typeof NMTheme !== 'undefined') NMTheme.mount();
}

function markResumeCtas(){
  try {
    var d = JSON.parse(localStorage.getItem('testmind_draft_v1'));
    if (!d || !d.answers) return;
    var done = 0, i;
    for (i = 0; i < d.answers.length; i++) if (d.answers[i] > 0) done++;
    if (!done) return;
    var els = document.querySelectorAll('[data-cta]');
    for (i = 0; i < els.length; i++) els[i].textContent = tmUi('resume');
  } catch (e) {}
}


/* ================= historical-figure portraits ================= */
// The archetype page names two people but showed neither, so the names read as
// footnotes. Each one now opens its portrait.
//
// Built here rather than baked into the 30 generated pages: the markup only
// carries data-art, and the button is made at runtime. A reader with no
// JavaScript therefore sees the page exactly as it was, instead of a name
// styled to look pressable that does nothing when pressed.
var figBox = null, figLastFocus = null;

function closeFigure(){
  if (!figBox) return;
  figBox.parentNode.removeChild(figBox);
  figBox = null;
  document.removeEventListener('keydown', figKey, true);
  if (figLastFocus && figLastFocus.focus){
    try { figLastFocus.focus({preventScroll: true}); } catch (e) { figLastFocus.focus(); }
  }
}

function figKey(e){
  if (e.key === 'Escape' || e.keyCode === 27){ e.preventDefault(); closeFigure(); }
}

// Just the picture. No name, no dates, no explanation, no close button -- all of
// that is already on the page directly under the name that was pressed, and
// repeating it in a card turns "show me his face" into a second page to read.
//
// The page must not move a pixel while this is open, so the body scroll is NOT
// locked: hiding the scrollbar reclaims its width and shifts the whole layout
// sideways, which is exactly the jump this is supposed to avoid. The overlay is
// position:fixed, so it covers the view without touching the flow behind it.
function openFigure(art, who, returnTo){
  closeFigure();
  figLastFocus = returnTo || document.activeElement;
  figBox = document.createElement('div');
  figBox.className = 'figpop';
  figBox.setAttribute('role', 'dialog');
  figBox.setAttribute('aria-modal', 'true');
  figBox.setAttribute('aria-label', who);
  figBox.tabIndex = -1;   // focusable so Escape reaches it for keyboard readers
  // alt carries the name for anyone not seeing the picture. It renders nothing.
  figBox.innerHTML = '<img src="' + art + '" alt="' + who + '">';
  // Anywhere, including the picture itself: there is no other control to hit.
  figBox.addEventListener('click', closeFigure);
  document.body.appendChild(figBox);
  document.addEventListener('keydown', figKey, true);
  // Moving focus is what announces the picture to a screen reader, but focusing
  // an element scrolls it into view -- and this one is pinned to the viewport,
  // so the browser scrolled the page to "reach" it and the article jumped under
  // the overlay. preventScroll stops that where it is supported; the restore
  // afterwards covers the browsers that ignore the option.
  var sx = window.pageXOffset, sy = window.pageYOffset;
  if (figBox.focus){
    try { figBox.focus({preventScroll: true}); } catch (e) { figBox.focus(); }
  }
  if (window.pageXOffset !== sx || window.pageYOffset !== sy) window.scrollTo(sx, sy);
}

function mountFigures(){
  var rows = document.querySelectorAll('.afig[data-art]'), i;
  for (i = 0; i < rows.length; i++){
    (function(row){
      var who = row.querySelector('.afigwho');
      if (!who) return;
      var span = who.querySelector('span');
      // Keep the years out of the button: the name is the thing you press.
      var name = who.childNodes[0] ? who.childNodes[0].nodeValue.replace(/\s+$/, '') : '';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'afigbtn';
      b.textContent = name;
      who.replaceChild(b, who.childNodes[0]);
      // Pressing a button focuses it, and focusing it makes the browser scroll
      // it clear of the sticky nav -- a few pixels of drift at exactly the
      // moment the reader is looking somewhere else. Suppressing focus on mouse
      // press costs nothing: the click still fires, and a keyboard reader still
      // reaches the button with Tab, where the scroll is wanted.
      b.addEventListener('mousedown', function(e){ e.preventDefault(); });
      b.addEventListener('click', function(){
        openFigure(row.getAttribute('data-art'), name, b);
      });
    })(rows[i]);
  }
}

/* ============ Keeping your place across a language switch ============ */
// UZ, RU and EN are three separate pages, so pressing RU is a real navigation
// and the reader lands back at the top -- halfway down a long archetype page
// that means losing the paragraph they were on. Note the section they were
// reading before leaving, find the same section on the other side.
//
// The anchor is a heading index, not a pixel offset: a Russian paragraph is not
// as tall as the Uzbek one, so the same y is a different sentence, but the fifth
// <h2> is the same section in all three languages.

var SPOT_KEY = 'testmind_langspot_v1';
var spotWant = null;   // {i, f} we still owe the reader, once the page settles
var spotAt = null;     // where we last put them, to tell our scroll from theirs

function spotDocH(){ return document.documentElement.scrollHeight; }

// The reader's eye sits just under the sticky nav, not at y=0.
function spotLine(){
  var nav = document.querySelector('.nav');
  return nav ? nav.getBoundingClientRect().bottom : 0;
}

function spotHeads(){ return document.querySelectorAll('h2'); }

// Absolute page y of a heading, or the foot of the document past the last one.
function spotTop(hs, i){
  return i < hs.length ? hs[i].getBoundingClientRect().top + window.pageYOffset
                       : spotDocH();
}

function saveLangSpot(){
  var hs = spotHeads(), line = spotLine(), y = window.pageYOffset + line;
  var i, idx = -1, top, next, f = 0;
  for (i = 0; i < hs.length; i++){
    if (spotTop(hs, i) - y <= 1) idx = i; else break;
  }
  // idx -1 means the reader is still in the hero, above every heading; measure
  // that stretch against the run-up to the first one.
  top = idx < 0 ? 0 : spotTop(hs, idx);
  next = spotTop(hs, idx + 1);
  if (next > top) f = (y - top) / (next - top);
  try {
    sessionStorage.setItem(SPOT_KEY, JSON.stringify(
      {i: idx, f: Math.max(0, Math.min(1, f)), n: hs.length, t: (new Date()).getTime()}));
  } catch (e) {}   // private mode: the switch still works, it just starts at the top
}

function readLangSpot(){
  var raw = null, s;
  try {
    raw = sessionStorage.getItem(SPOT_KEY);
    sessionStorage.removeItem(SPOT_KEY);   // one switch, one restore
  } catch (e) { return null; }
  if (!raw) return null;
  try { s = JSON.parse(raw); } catch (e) { return null; }
  if (!s || (new Date()).getTime() - s.t > 60000) return null;   // a later visit, not this switch
  // A different number of headings means the two pages are not the same shape
  // and the index would point at the wrong section. Starting at the top is the
  // honest answer there.
  return s.n === spotHeads().length ? s : null;
}

function placeLangSpot(){
  if (!spotWant) return;
  var hs = spotHeads(), top = spotWant.i < 0 ? 0 : spotTop(hs, spotWant.i);
  var y = top + spotWant.f * (spotTop(hs, spotWant.i + 1) - top) - spotLine();
  spotAt = Math.max(0, Math.round(y));
  // Instant: html has scroll-behavior:smooth, which would visibly glide down
  // from the top of the new page instead of just being there.
  try { window.scrollTo({ top: spotAt, left: 0, behavior: 'instant' }); }
  catch (e) { window.scrollTo(0, spotAt); }
}

function mountLangSpot(){
  var sw = document.querySelectorAll('.langsw a'), i;
  for (i = 0; i < sw.length; i++) sw[i].addEventListener('click', saveLangSpot);
  spotWant = readLangSpot();
  if (!spotWant) return;
  placeLangSpot();
  // Portraits and the built-in scenes land after this, and each one that lands
  // above the reader pushes their section further down. Measure again once the
  // page has stopped growing -- but only if they have not started reading and
  // scrolled somewhere themselves.
  window.addEventListener('load', function(){
    if (spotAt !== null && Math.abs(window.pageYOffset - spotAt) <= 2) placeLangSpot();
  });
}

function mountPage(){
  var scene = document.getElementById('scene');
  if (scene) scene.innerHTML = buildScene();
  var bandBox = document.getElementById('bands');
  if (bandBox) bandBox.innerHTML = buildBands();
  var gal = document.getElementById('gallery');
  if (gal) gal.innerHTML = buildGallery(gal.getAttribute('data-full') === '1');
  var v;
  if ((v = document.getElementById('vg-result'))){ v.innerHTML = vgResult(); fitCardName(v); }
  if ((v = document.getElementById('vg-others'))) v.innerHTML = vgOthers();
  if ((v = document.getElementById('vg-future'))) v.innerHTML = vgFuture();
  mountFigures();
  markResumeCtas();
  mountAccountNav();
  mountThemeSwitch();
  // Last: the scenes above just changed the height of the page, and the spot is
  // measured against that height.
  mountLangSpot();
}
// This file is loaded at the bottom of <body>, so the DOM is already parsed, but
// guard anyway, so nothing silently fails to render if the tag is ever moved to
// <head> or given defer/async.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountPage);
else mountPage();

// Parent-letter page: the button prints only the letter (print CSS hides the rest).
var _pl = document.getElementById('printLetter');
if (_pl) _pl.onclick = function(){ window.print(); };
