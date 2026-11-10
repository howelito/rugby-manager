(function () {
'use strict';
var KEY = 'rugby-manager-2627', G = null, MT = null;
var UI = {scr:'news', modal:null, msg:'', tf:{pos:'',club:'',listed:false,sort:'ca'}, clubView:null, fixRound:null, memory:false};
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
var money = E.money, club = E.club;

function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); UI.memory = false; } catch (e) { UI.memory = true; } }
function load() { try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} }

function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(s); }
function encodeSave() { var raw = new TextEncoder().encode(JSON.stringify(G)); if (!window.CompressionStream) return Promise.resolve('RM0:' + b64(raw));
  return new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(function (b) { return 'RM1:' + b64(new Uint8Array(b)); }); }
function decodeSave(code) { code = code.replace(/\s+/g, ''); var head = code.slice(0, 4); if (head !== 'RM0:' && head !== 'RM1:') return Promise.reject(new Error('bad'));
  var bin = atob(code.slice(4)), bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  var text = head === 'RM0:' ? Promise.resolve(new TextDecoder().decode(bytes)) : new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return text.then(function (t) { var g = JSON.parse(t); if (!g || !g.players || !g.clubs || !g.fix || !club(g.user)) throw new Error('bad'); return g; }); }
function loadPanel() { return panel('Load a save code', '<p class="dim">Paste a code made on another phone or computer to carry on from there.</p><textarea id="loadcode" rows="3" spellcheck="false" placeholder="RM1:..."></textarea><p class="row">' + btn('Load save code', 'loadsave') + '</p>' + (UI.loadErr ? '<p class="bad">' + esc(UI.loadErr) + '</p>' : '')); }
// ---------- shared bits ----------
function condCls(c) { return c >= 85 ? 'good' : c >= 70 ? 'warn' : 'bad'; }
function flags(p) { return (p.inj ? ' <b class="tag bad" title="Injured">INJ ' + p.inj + 'w</b>' : '') + (p.susp ? ' <b class="tag bad" title="Suspended">SUS ' + p.susp + '</b>' : '') + (p.listed ? ' <b class="tag warn" title="Transfer listed">LIST</b>' : '') + (p.acad ? ' <b class="tag dim" title="Academy player (fictional)">ACA</b>' : ''); }
function pl(p) { return '<a href="#" data-a="player" data-id="' + p.id + '">' + esc(p.n) + '</a>' + flags(p); }
function avgR(p) { return p.apps ? (p.rs / p.apps).toFixed(2) : '-'; }
function formS(p) { return p.form.length ? E.formAvg(p).toFixed(1) : '-'; }
function table(head, rows, cls) { return '<div class="scroll"><table class="' + (cls || '') + '"><thead><tr>' + head.map(function (h) { return '<th' + (h[1] ? ' class="' + h[1] + '"' : '') + '>' + h[0] + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'; }
function squadTable(list, own) {
  var order = E.POS;
  list = list.slice().sort(function (a, b) { return order.indexOf(a.pos) - order.indexOf(b.pos) || b.ca - a.ca; });
  return table([['Player'], ['Pos'], ['Age', 'n'], ['Ovr', 'n'], ['Con', 'n'], ['Frm', 'n'], ['App', 'n'], ['Tr', 'n'], ['Pts', 'n'], ['AvR', 'n'], [own ? 'Wage' : 'Value', 'n']],
    list.map(function (p) { return '<tr><td class="nm">' + pl(p) + '</td><td>' + p.pos + '</td><td class="n">' + p.age + '</td><td class="n hi">' + p.ca + '</td><td class="n ' + condCls(p.cond) + '">' + p.cond + '</td><td class="n">' + formS(p) + '</td><td class="n">' + p.apps + '</td><td class="n">' + p.tries + '</td><td class="n">' + p.pts + '</td><td class="n">' + avgR(p) + '</td><td class="n">' + money(own ? p.wage : E.value(p)) + '</td></tr>'; }));
}
function leagueTable(mark) {
  return table([['#', 'n'], ['Club'], ['P', 'n'], ['W', 'n'], ['D', 'n'], ['L', 'n'], ['PF', 'n'], ['PA', 'n'], ['+/-', 'n'], ['TB', 'n'], ['LB', 'n'], ['Pts', 'n']],
    E.standings(G).map(function (x, i) { var t = x.t; return '<tr class="' + (x.id === G.user ? 'me ' : '') + (mark && i === 3 ? 'cut' : '') + '"><td class="n">' + (i + 1) + '</td><td class="nm"><a href="#" data-a="club" data-id="' + x.id + '">' + club(x.id).name + '</a></td><td class="n">' + t.p + '</td><td class="n">' + t.w + '</td><td class="n">' + t.d + '</td><td class="n">' + t.l + '</td><td class="n">' + t.pf + '</td><td class="n">' + t.pa + '</td><td class="n">' + (x.diff > 0 ? '+' : '') + x.diff + '</td><td class="n">' + t.tb + '</td><td class="n">' + t.lb + '</td><td class="n hi">' + t.pts + '</td></tr>'; }));
}
function resLine(f) { var r = f.res, u = f.h === G.user || f.a === G.user; return '<tr class="' + (u ? 'me' : '') + '"><td class="r">' + club(f.h).name + '</td><td class="sc">' + (r ? r.hs + ' - ' + r.as : 'v') + '</td><td>' + club(f.a).name + (r && r.pk != null ? ' <span class="dim">(' + club(r.pk === 0 ? f.h : f.a).name + ' go through)</span>' : '') + '</td></tr>'; }
function resTable(fx) { return '<div class="scroll"><table class="res"><tbody>' + fx.map(resLine).join('') + '</tbody></table></div>'; }
function panel(title, body, extra) { return '<section class="panel"><h2>' + title + (extra ? '<span class="h2x">' + extra + '</span>' : '') + '</h2>' + body + '</section>'; }
function btn(label, act, attrs, cls) { return '<button type="button" class="btn ' + (cls || '') + '" data-a="' + act + '" ' + (attrs || '') + '>' + label + '</button>'; }
function sel(id, opts, cur, act) { return '<select id="' + id + '" data-c="' + act + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }

// ---------- start ----------
function startScreen() {
  var saved = load();
  var rows = CLUBS.map(function (c) {
    var all = []; E.POS.forEach(function (k) { (c.squad[k] || []).forEach(function (s) { all.push(+s.split('|')[1]); }); }); all.sort(function (a, b) { return b - a; });
    var top = all.slice(0, 15).reduce(function (a, b) { return a + b; }, 0) / 15;
    return '<button type="button" class="clubpick" data-a="new" data-id="' + c.id + '" style="--c1:' + c.c1 + ';--c2:' + c.c2 + '"><span class="sw"></span><span class="cn">' + c.name + '</span><span class="cg">' + c.ground + ' · ' + c.cap.toLocaleString('en-GB') + '</span><span class="cs">Squad ' + top.toFixed(0) + '</span></button>';
  }).join('');
  return '<div class="start"><header class="title"><p class="eyebrow">English top flight · season 2026/27</p><h1>Rugby Manager 26/27</h1><p class="sub">Pick your XV, set the tactics, work the transfer market and take your club to Twickenham.</p></header>' +
    (saved ? '<section class="panel"><h2>Saved game</h2><p>' + esc(saved.mgr) + ' at ' + club(saved.user).name + ', ' + E.roundLabel(saved) + '.</p><p>' + btn('Continue saved game', 'resume', '', 'go') + '</p></section>' : '') +
    '<section class="panel"><h2>New game</h2><p><label for="mgr">Manager name</label> <input id="mgr" type="text" maxlength="24" value="' + (saved ? esc(saved.mgr) : 'J. Howell') + '"></p><p class="dim">Choose a club to start.' + (saved ? ' This replaces the saved game.' : '') + '</p><div class="clubs">' + rows + '</div></section>' +
    loadPanel() + '<p class="dim small">An unofficial, fan-made game. Squads are the published 2026/27 lists; player ratings, ages and all money figures are estimates made for the game.</p></div>';
}

// ---------- frame ----------
var NAV = [['news', 'News'], ['squad', 'Squad'], ['select', 'Team'], ['tactics', 'Tactics'], ['fixtures', 'Fixtures'], ['table', 'Table'], ['stats', 'Stats'], ['transfers', 'Transfers'], ['finance', 'Finances'], ['clubs', 'Clubs'], ['options', 'Options']];
function frame(body, inMatch) {
  var c = club(G.user), u = G.clubs[G.user], f = E.userFixture(G);
  var next = G.phase === 'done' ? 'Season review' : f ? (f.h === G.user ? 'v ' + club(f.a).name + ' (H)' : 'v ' + club(f.h).name + (G.phase === 'final' ? ' (N)' : ' (A)')) : 'No fixture';
  return '<div class="shell" style="--c1:' + c.c1 + ';--c2:' + c.c2 + '"><header class="top"><div class="crest"></div><div class="who"><strong>' + c.name + '</strong><span>' + esc(G.mgr) + ' · ' + E.dateLabel(G) + ' · ' + E.roundLabel(G) + '</span></div><div class="bank"><span>Bank</span><strong>' + money(u.bal) + '</strong></div>' +
    (inMatch ? '' : '<button type="button" class="btn go cont" data-a="continue">Continue<small>' + next + '</small></button>') + '</header>' +
    (inMatch ? '' : '<nav class="nav">' + NAV.map(function (n) { var badge = n[0] === 'transfers' && G.bids.length ? ' <i>' + G.bids.length + '</i>' : ''; return '<button type="button" data-a="go" data-id="' + n[0] + '" class="' + (UI.scr === n[0] ? 'on' : '') + '">' + n[1] + badge + '</button>'; }).join('') + '</nav>') +
    '<main class="main">' + (UI.msg ? '<p class="msg" role="status">' + esc(UI.msg) + '</p>' : '') + body + '</main></div>';
}

// ---------- screens ----------
var S = {};
S.news = function () {
  var f = E.userFixture(G), st = E.standings(G), pos = st.map(function (x) { return x.id; }).indexOf(G.user) + 1;
  var sum = '<div class="tiles"><div><span>League position</span><strong>' + pos + (pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th') + '</strong></div><div><span>Board target</span><strong class="sm">' + G.clubs[G.user].exp + '</strong></div><div><span>Next match</span><strong class="sm">' + (f ? club(f.h).name + ' v ' + club(f.a).name : G.phase === 'done' ? 'Season over' : 'Not involved') + '</strong></div></div>';
  return sum + panel('News', G.news.length ? '<ul class="news">' + G.news.slice(0, 40).map(function (n) { return '<li><span class="when">' + n.r + '</span><strong>' + esc(n.t) + '</strong><span>' + esc(n.b) + '</span></li>'; }).join('') + '</ul>' : '<p class="dim">Nothing to report.</p>');
};
S.squad = function () { var sq = E.squad(G, G.user); return panel('First-team squad', squadTable(sq, true), sq.length + ' players'); };
S.select = function () {
  var c = G.clubs[G.user], s = c.sel || [], probs = E.selProblems(G, G.user, c.sel);
  var rows = E.SLOTS.map(function (slot, i) { var p = s[i] != null ? G.players[s[i]] : null;
    return (i === 15 ? '<tr class="sep"><td colspan="6">Replacements</td></tr>' : '') + '<tr data-a="slot" data-id="' + i + '" class="pickrow"><td class="n hi">' + (i + 1) + '</td><td>' + slot + '</td><td class="nm">' + (p ? esc(p.n) + flags(p) + (p.pos !== slot ? ' <span class="dim">(' + p.pos + ')</span>' : '') : '<span class="bad">Empty</span>') + '</td><td class="n hi">' + (p ? p.ca : '') + '</td><td class="n ' + (p ? condCls(p.cond) : '') + '">' + (p ? p.cond : '') + '</td><td class="n">' + (p ? formS(p) : '') + '</td></tr>'; });
  return panel('Team selection', '<p class="row">' + btn('Pick best team', 'autopick') + btn('Clear', 'clearsel') + '</p>' + (probs.length ? '<p class="bad">' + probs.map(esc).join(' ') + '</p>' : '<p class="good">Team is ready.</p>') + '<p class="dim small">Tap a shirt number to choose who wears it.</p>' +
    table([['No', 'n'], ['Slot'], ['Player'], ['Ovr', 'n'], ['Con', 'n'], ['Frm', 'n']], rows, 'pick'));
};
function tacForm(tac, live) {
  var sq = live ? [] : E.squad(G, G.user).filter(function (p) { return p.at.Gk >= 8; }).sort(function (a, b) { return b.at.Gk - a.at.Gk; });
  var f = function (label, id, opts, help) { return '<div class="field"><label for="t_' + id + '">' + label + '</label>' + sel('t_' + id, opts, tac[id], 'tac') + '<span class="dim small">' + help + '</span></div>'; };
  return f('Attacking style', 'style', [['tight', 'Keep it tight'], ['bal', 'Balanced'], ['wide', 'Run it wide']], 'Tight leans on the forwards and wins more penalties. Wide leans on the backs and scores more tries when they are better than the defence.') +
    f('Penalties', 'pens', [['goal', 'Kick at goal'], ['mix', 'Mixed'], ['corner', 'Kick to the corner']], 'The corner needs a good lineout and a strong maul.') +
    f('Defence', 'def', [['drift', 'Drift'], ['bal', 'Balanced'], ['blitz', 'Blitz']], 'Blitz concedes fewer tries and more penalties and cards. Drift is the reverse.') +
    f('Tempo', 'tempo', [['slow', 'Slow'], ['norm', 'Normal'], ['fast', 'Fast']], 'Fast makes more happen for both sides and tires your players sooner.') +
    (live ? '' : '<div class="field"><label for="t_kicker">Goal kicker</label>' + sel('t_kicker', [['', 'Best kicker on the pitch']].concat(sq.slice(0, 12).map(function (p) { return [p.id, p.n + ' (' + p.at.Gk + ')']; })), tac.kicker == null ? '' : tac.kicker, 'tac') + '<span class="dim small">Goal kicking out of 20.</span></div>') +
    '<div class="field"><label for="t_autoSubs">Replacements</label>' + sel('t_autoSubs', [['1', 'Assistant makes them'], ['0', 'I make them myself']], tac.autoSubs ? '1' : '0', 'tac') + '<span class="dim small">Pause the match to make changes yourself.</span></div>';
}
S.tactics = function () { return panel('Tactics', '<div class="fields">' + tacForm(G.clubs[G.user].tac, false) + '</div>'); };
S.fixtures = function () {
  var mine = [], r;
  G.fix.forEach(function (rd, i) { rd.forEach(function (f) { if (f.h === G.user || f.a === G.user) mine.push('<tr class="' + (i === G.round && G.phase === 'league' ? 'me' : '') + '"><td class="n">' + (i + 1) + '</td><td>' + (f.h === G.user ? 'H' : 'A') + '</td><td class="nm">' + club(f.h === G.user ? f.a : f.h).name + '</td><td class="sc">' + (f.res ? (f.h === G.user ? f.res.hs + ' - ' + f.res.as : f.res.as + ' - ' + f.res.hs) : '') + '</td><td>' + (f.res ? (f.res.hs === f.res.as ? 'D' : (f.res.hs > f.res.as) === (f.h === G.user) ? '<b class="good">W</b>' : '<b class="bad">L</b>') : '') + '</td></tr>'); }); });
  r = UI.fixRound == null ? Math.min(G.round, E.ROUNDS - 1) : UI.fixRound;
  var opts = []; for (var i = 0; i < E.ROUNDS; i++) opts.push([i, 'Round ' + (i + 1)]);
  var po = G.po ? panel('Play-offs', resTable(G.po.sf.concat(G.po.final ? [G.po.final] : []))) : '';
  return po + panel('Your fixtures', table([['Rd', 'n'], [''], ['Opponent'], ['Score'], ['']], mine)) + panel('All results', '<p>' + sel('fixround', opts, r, 'fixround') + '</p>' + resTable(G.fix[r]));
};
S.table = function () { return panel('League table', leagueTable(true) + '<p class="dim small">Win 4, draw 2. TB: bonus point for four tries. LB: bonus point for losing by seven or fewer. The top four reach the play-offs.</p>'); };
S.stats = function () {
  var lb = function (title, key, fmt) { return panel(title, table([['#', 'n'], ['Player'], ['Club'], ['', 'n']], E.leaders(G, key, 12).map(function (p, i) { return '<tr class="' + (p.club === G.user ? 'me' : '') + '"><td class="n">' + (i + 1) + '</td><td class="nm">' + pl(p) + '</td><td>' + club(p.club).name + '</td><td class="n hi">' + fmt(p) + '</td></tr>'; }))); };
  return '<div class="cols">' + lb('Top try scorers', 'tries', function (p) { return p.tries; }) + lb('Top points scorers', 'pts', function (p) { return p.pts; }) + lb('Best average rating', 'avg', avgR) + '</div>';
};
S.transfers = function () {
  var open = E.windowOpen(G), tf = UI.tf, h = '';
  if (G.bids.length) h += panel('Offers received', table([['Player'], ['From'], ['Fee', 'n'], ['Value', 'n'], ['']], G.bids.map(function (b) { var p = G.players[b.pid]; return '<tr><td class="nm">' + pl(p) + '</td><td>' + club(b.from).name + '</td><td class="n hi">' + money(b.fee) + '</td><td class="n">' + money(E.value(p)) + '</td><td>' + btn('Accept', 'acceptbid', 'data-id="' + b.id + '"', 'sm go') + btn('Reject', 'rejectbid', 'data-id="' + b.id + '"', 'sm') + '</td></tr>'; })));
  if (G.offers.length) h += panel('Your offers', table([['Player'], ['Fee', 'n'], ['Wage', 'n'], ['Status']], G.offers.slice(0, 10).map(function (o) { var p = G.players[o.pid]; return '<tr><td class="nm">' + pl(p) + '</td><td class="n">' + money(o.fee) + '</td><td class="n">' + money(o.wage) + '</td><td class="' + (o.status === 'accepted' ? 'good' : o.status === 'rejected' ? 'bad' : 'warn') + '">' + esc(o.msg) + '</td></tr>'; })));
  var list = G.players.filter(function (p) { return p.club !== G.user && (!tf.pos || p.pos === tf.pos) && (!tf.club || p.club === tf.club) && (!tf.listed || p.listed); });
  list.sort(tf.sort === 'value' ? function (a, b) { return E.value(a) - E.value(b); } : tf.sort === 'age' ? function (a, b) { return a.age - b.age || b.ca - a.ca; } : function (a, b) { return b.ca - a.ca; });
  h += panel('Player search', '<p class="' + (open ? 'dim' : 'bad') + '">' + (open ? 'The market is open until round ' + E.DEADLINE + ' has been played. Tap a player to make an offer; clubs reply after the next match.' : 'The transfer deadline has passed.') + '</p><div class="filters">' +
    sel('f_pos', [['', 'All positions']].concat(E.POS.map(function (k) { return [k, E.POSN[k]]; })), tf.pos, 'tf') + sel('f_club', [['', 'All clubs']].concat(CLUBS.filter(function (c) { return c.id !== G.user; }).map(function (c) { return [c.id, c.name]; })), tf.club, 'tf') +
    sel('f_listed', [['', 'Everyone'], ['1', 'Transfer listed only']], tf.listed ? '1' : '', 'tf') + sel('f_sort', [['ca', 'Best first'], ['value', 'Cheapest first'], ['age', 'Youngest first']], tf.sort, 'tf') + '</div>' +
    table([['Player'], ['Pos'], ['Club'], ['Age', 'n'], ['Ovr', 'n'], ['Value', 'n'], ['Wage', 'n']], list.slice(0, 60).map(function (p) { return '<tr><td class="nm">' + pl(p) + '</td><td>' + p.pos + '</td><td>' + club(p.club).name + '</td><td class="n">' + p.age + '</td><td class="n hi">' + p.ca + '</td><td class="n">' + money(E.value(p)) + '</td><td class="n">' + money(p.wage) + '</td></tr>'; })) +
    (list.length > 60 ? '<p class="dim small">Showing 60 of ' + list.length + '. Narrow the search to see more.</p>' : ''));
  return h;
};
S.finance = function () {
  var u = G.clubs[G.user], bill = E.wageBill(G, G.user), L = G.ledger, pct = Math.min(100, bill / E.CAP * 100);
  var row = function (k, v, c) { return '<tr><td>' + k + '</td><td class="n ' + (c || '') + '">' + money(v) + '</td></tr>'; };
  return '<div class="tiles"><div><span>Bank balance</span><strong>' + money(u.bal) + '</strong></div><div><span>Wage bill</span><strong>' + money(bill) + '</strong></div><div><span>Cap room</span><strong class="' + (E.CAP - bill < 200000 ? 'warn' : '') + '">' + money(E.CAP - bill) + '</strong></div></div>' +
    panel('Salary cap', '<div class="bar"><div style="width:' + pct.toFixed(1) + '%"></div></div><p class="dim small">' + money(bill) + ' of ' + money(E.CAP) + ' used. Squad: ' + E.squad(G, G.user).length + ' of ' + E.MAXSQUAD + '.</p>') +
    panel('Season so far', '<div class="scroll"><table class="led"><tbody>' + row('Gate receipts', L.gate, 'good') + row('Central and commercial income', L.central, 'good') + row('Player sales', L.sales, 'good') + row('Prize money', L.prize, 'good') + row('Wages', -L.wages, 'bad') + row('Running costs', -L.costs, 'bad') + row('Player purchases', -L.buys, 'bad') + '</tbody></table></div>');
};
S.clubs = function () {
  var id = UI.clubView || CLUBS.filter(function (c) { return c.id !== G.user; })[0].id, c = club(id), t = G.clubs[id];
  return panel('Clubs', '<p>' + sel('clubsel', CLUBS.map(function (x) { return [x.id, x.name]; }), id, 'clubsel') + '</p><p class="dim">' + c.ground + ' (' + c.cap.toLocaleString('en-GB') + '). Best XV rating ' + E.xvStrength(G, id).toFixed(1) + '. Wage bill ' + money(E.wageBill(G, id)) + '. Board target: ' + t.exp.toLowerCase() + '.</p>' + squadTable(E.squad(G, id), false));
};
S.options = function () {
  return panel('Options', '<p>' + (UI.memory ? '<span class="bad">This browser is not letting the game save, so progress lasts only while the page stays open.</span>' : 'The game saves itself in this browser after every match.') + '</p><p class="row">' + btn('Quit to title screen', 'quit') + btn('Delete saved game', 'wipe', '', 'danger') + '</p>') +
    panel('Move your game to another device', '<p class="dim">A save code holds your whole season. Copy it, send it to yourself, and load it on the other device.</p><p class="row">' + btn('Create save code', 'makecode') + (UI.code ? btn(UI.copied ? 'Copied' : 'Copy code', 'copycode', '', 'go') : '') + '</p>' + (UI.code ? '<textarea id="savecode" rows="4" readonly spellcheck="false">' + UI.code + '</textarea>' : '')) + loadPanel() +
    panel('How it plays', '<ul class="help"><li>Press Continue to move to your next match. Everything else can be done from the menu first.</li><li>Ovr is a player\'s overall rating out of 100. Con is match fitness. Frm is the average of his last five match ratings.</li><li>Players out of position, tired or out of form play below their rating.</li><li>Eighteen league rounds, then semi-finals and a final at Twickenham.</li></ul>');
};
S.prematch = function () {
  var f = E.userFixture(G); if (!f) { UI.scr = 'news'; return S.news(); }
  var st = E.standings(G).map(function (x) { return x.id; }), side = function (id) { var t = G.clubs[id].t; return '<div class="pm"><strong>' + club(id).name + '</strong><span>' + (st.indexOf(id) + 1) + ' in the table · W' + t.w + ' D' + t.d + ' L' + t.l + '</span><span>Best XV ' + E.xvStrength(G, id).toFixed(1) + '</span></div>'; };
  var opp = f.h === G.user ? f.a : f.h, xv = E.pickXV(G, opp).slice(0, 15).map(function (id, i) { var p = G.players[id]; return '<tr><td class="n hi">' + (i + 1) + '</td><td class="nm">' + (p ? pl(p) : '-') + '</td><td class="n">' + (p ? p.ca : '') + '</td></tr>'; });
  return panel(E.roundLabel(G) + ' · ' + (G.phase === 'final' ? 'Allianz Stadium, Twickenham' : club(f.h).ground), '<div class="pmrow">' + side(f.h) + '<span class="vs">v</span>' + side(f.a) + '</div><p class="row">' + btn('Kick off', 'kickoff', '', 'go') + btn('Instant result', 'instant') + btn('Change team', 'go', 'data-id="select"') + '</p>') +
    panel(club(opp).name + ': likely XV', table([['No', 'n'], ['Player'], ['Ovr', 'n']], xv));
};
S.results = function () {
  var L = G.last; if (!L) return S.news();
  var h = panel(L.label + ' results', resTable(L.fx));
  if (L.rat) h += panel('Your player ratings', table([['Player'], ['Pos'], ['Min', 'n'], ['Tr', 'n'], ['Pts', 'n'], ['Rating', 'n']], L.rat.map(function (r) { var p = G.players[r.id]; return '<tr><td class="nm">' + pl(p) + '</td><td>' + p.pos + '</td><td class="n">' + r.mins + '</td><td class="n">' + (r.tr || '') + '</td><td class="n">' + (r.pts || '') + '</td><td class="n hi">' + r.r.toFixed(1) + '</td></tr>'; })));
  return h + (G.phase === 'done' ? S.season() : panel('League table', leagueTable(true)));
};
S.season = function () {
  var v = G.verdict;
  return panel('Season review', '<p class="big">' + club(G.champion).name + ' are champions.</p><p>' + club(G.user).name + ' finished ' + v.pos + (v.pos === 1 ? 'st' : v.pos === 2 ? 'nd' : v.pos === 3 ? 'rd' : 'th') + ' in the league. ' + esc(v.text) + '</p><p class="row">' + btn('Start a new game', 'quit', '', 'go') + '</p>') + panel('Play-offs', resTable(G.po.sf.concat([G.po.final]))) + panel('Final table', leagueTable(true));
};

// ---------- modals ----------
function modal() {
  var m = UI.modal; if (!m) return '';
  var body = '';
  if (m.t === 'player') {
    var p = G.players[m.id], mine = p.club === G.user, open = E.windowOpen(G);
    body = '<h2>' + esc(p.n) + flags(p) + '</h2><p class="dim">' + E.POSN[p.pos] + ' · ' + club(p.club).name + ' · age ' + p.age + ' · contract to June ' + p.contract + '</p>' +
      '<div class="tiles t4"><div><span>Overall</span><strong>' + p.ca + '</strong></div><div><span>Fitness</span><strong class="' + condCls(p.cond) + '">' + p.cond + '%</strong></div><div><span>Value</span><strong class="sm">' + money(E.value(p)) + '</strong></div><div><span>Wage</span><strong class="sm">' + money(p.wage) + '</strong></div></div>' +
      '<div class="attrs">' + E.ATTR.map(function (k) { var v = p.at[k]; return '<div><span>' + E.ATTRN[k] + '</span><b class="' + (v >= 16 ? 'good' : v >= 11 ? '' : 'dim') + '">' + v + '</b></div>'; }).join('') + '</div>' +
      '<p class="dim small">Season: ' + p.apps + ' apps, ' + p.tries + ' tries, ' + p.pts + ' points, average rating ' + avgR(p) + ', ' + p.yc + ' yellow, ' + p.rc + ' red.</p>';
    if (mine) body += '<p class="row">' + btn(p.listed ? 'Take off the transfer list' : 'Put on the transfer list', 'list', 'data-id="' + p.id + '"') + '</p>';
    else if (open) { var v0 = E.value(p); body += '<div class="offer"><div class="field"><label for="o_fee">Fee (£ thousands)</label><input id="o_fee" type="number" min="0" step="5" value="' + Math.round(v0 * (p.listed ? 0.8 : 1.2) / 1000) + '"></div><div class="field"><label for="o_wage">Wage per year (£ thousands)</label><input id="o_wage" type="number" min="0" step="1" value="' + Math.ceil(p.wage * 1.1 / 1000) + '"></div>' + btn('Make offer', 'offer', 'data-id="' + p.id + '"', 'go') + '</div>' + (m.err ? '<p class="bad">' + esc(m.err) + '</p>' : '') + '<p class="dim small">You have ' + money(G.clubs[G.user].bal) + ' in the bank and ' + money(E.CAP - E.wageBill(G, G.user)) + ' of cap room.</p>'; }
  } else if (m.t === 'slot') {
    var slot = E.SLOTS[m.i], cur = G.clubs[G.user].sel || [];
    var cands = E.squad(G, G.user).sort(function (a, b) { return (E.avail(b) ? 1 : 0) - (E.avail(a) ? 1 : 0) || E.effSlot(b, slot) - E.effSlot(a, slot); });
    body = '<h2>Number ' + (m.i + 1) + ': ' + E.POSN[slot] + '</h2>' + table([['Player'], ['Pos'], ['Ovr', 'n'], ['Con', 'n'], ['In', 'n']], cands.map(function (p) { var at = cur.indexOf(p.id), ok = E.avail(p);
      return '<tr class="' + (ok ? 'pickrow' : 'off') + (at === m.i ? ' me' : '') + '"' + (ok ? ' data-a="assign" data-id="' + p.id + '"' : '') + '><td class="nm">' + esc(p.n) + flags(p) + '</td><td class="' + (E.fam(p, slot) === 1 ? 'good' : E.fam(p, slot) >= 0.85 ? 'warn' : 'bad') + '">' + p.pos + '</td><td class="n hi">' + p.ca + '</td><td class="n ' + condCls(p.cond) + '">' + p.cond + '</td><td class="n dim">' + (at >= 0 ? at + 1 : '') + '</td></tr>'; }), 'pick') +
      '<p class="row">' + btn('Leave empty', 'assign', 'data-id="-1"') + '</p>';
  } else if (m.t === 'sub') {
    var s = MT.M.sides[MT.u];
    body = '<h2>Replace ' + esc(G.players[s.xv[m.i]].n) + '</h2>' + table([['Player'], ['Pos'], ['Ovr', 'n'], ['Con', 'n']], s.bench.map(function (id, bi) { var p = G.players[id]; return '<tr class="pickrow" data-a="dosub" data-id="' + bi + '"><td class="nm">' + esc(p.n) + '</td><td class="' + (E.fam(p, E.SLOTS[m.i]) >= 0.85 ? 'good' : 'bad') + '">' + p.pos + '</td><td class="n hi">' + p.ca + '</td><td class="n">' + Math.round(MT.M.cond[id]) + '</td></tr>'; }), 'pick');
  }
  return '<div class="veil" data-a="close"><div class="modal" role="dialog" aria-modal="true">' + body + '<p class="row end">' + btn('Close', 'close') + '</p></div></div>';
}

// ---------- match ----------
function matchScreen() {
  var M = MT.M, s0 = M.sides[0], s1 = M.sides[1], last = M.log[M.log.length - 1], me = M.sides[MT.u];
  var half = M.min === 40 && MT.paused && !MT.resumed40, ev = s0.ev + s1.ev || 1;
  var stat = function (k, a, b) { return '<tr><td class="n hi">' + a + '</td><td class="c dim">' + k + '</td><td class="hi">' + b + '</td></tr>'; };
  var h = '<section class="board"><div class="bd"><span class="tn" style="--k:' + club(M.h).c1 + '">' + club(M.h).name + '</span><span class="bs">' + s0.score + '</span><span class="clock">' + (M.done ? 'FT' : half ? 'HT' : M.min + "'") + '</span><span class="bs">' + s1.score + '</span><span class="tn" style="--k:' + club(M.a).c1 + '">' + club(M.a).name + '</span></div><p class="ticker k-' + last.k + '">' + esc(last.t) + '</p></section>';
  h += '<p class="row ctl">' + (M.done ? btn('Continue', 'fulltime', '', 'go') : btn(half ? 'Start second half' : MT.paused ? 'Resume' : 'Pause', 'pause', '', MT.paused ? 'go' : '') + btn(MT.fast ? 'Speed: fast' : 'Speed: normal', 'speed') + btn('Skip to the end', 'skip') + btn(MT.panel ? 'Hide team' : 'Team and tactics', 'mpanel')) + '</p>';
  if (MT.panel && !M.done) {
    h += panel('Your team', (MT.paused ? '' : '<p class="warn small">Pause the match to make changes.</p>') + '<p class="dim small">Replacements used: ' + me.subs + ' of 8. Tap a player to replace him.</p>' + table([['No', 'n'], ['Player'], ['Pos'], ['Con', 'n']], me.xv.map(function (id, i) { if (id == null) return '<tr class="off"><td class="n">' + (i + 1) + '</td><td colspan="3">Off the field</td></tr>'; var p = G.players[id], bin = me.bin.some(function (b) { return b.slot === i; }), c = Math.round(M.cond[id]);
      return '<tr class="' + (MT.paused && me.bench.length && me.subs < 8 && !bin ? 'pickrow' : '') + '"' + (MT.paused && me.bench.length && me.subs < 8 && !bin ? ' data-a="subpick" data-id="' + i + '"' : '') + '><td class="n hi">' + (i + 1) + '</td><td class="nm">' + esc(p.n) + (bin ? ' <b class="tag warn">BIN</b>' : '') + '</td><td>' + p.pos + '</td><td class="n ' + condCls(c) + '">' + c + '</td></tr>'; }), 'pick') +
      '<div class="fields">' + tacForm(me.tac, true) + '</div>');
  }
  h += '<div class="cols"><section class="panel"><h2>Commentary</h2><ol class="feed">' + M.log.slice(-60).reverse().map(function (l) { return '<li class="k-' + l.k + '"><span>' + l.m + "'</span>" + esc(l.t) + '</li>'; }).join('') + '</ol></section>' +
    panel('Match stats', '<div class="scroll"><table class="ms"><tbody>' + stat('Tries', s0.tries, s1.tries) + stat('Conversions', s0.cons, s1.cons) + stat('Penalty goals', s0.pens, s1.pens) + stat('Drop goals', s0.dgs, s1.dgs) + stat('Attacking share', Math.round(s0.ev / ev * 100) + '%', Math.round(s1.ev / ev * 100) + '%') + stat('Yellow cards', s0.yc, s1.yc) + stat('Red cards', s0.rc, s1.rc) + '</tbody></table></div>') + '</div>';
  return h;
}
function tick() { if (!MT || MT.paused || MT.M.done) return; E.stepMinute(G, MT.M); if (MT.M.min === 40 && !MT.M.done) { MT.paused = true; MT.resumed40 = false; } if (MT.M.done) stopTimer(); render(); }
function startTimer() { stopTimer(); MT.timer = setInterval(tick, MT.fast ? 220 : 750); }
function stopTimer() { if (MT && MT.timer) { clearInterval(MT.timer); MT.timer = null; } }
function finishRound(f, M) {
  var label = E.roundLabel(G), fx = E.curFixtures(G), rat = null;
  if (f) { E.record(G, f, M); rat = Object.keys(M.pr).filter(function (id) { return G.players[id].club === G.user && M.pr[id].mins > 0; }).map(function (id) { var r = M.pr[id]; return {id: +id, mins: r.mins, tr: r.tr, pts: r.pts, r: r.r}; }).sort(function (a, b) { return b.r - a.r; }); }
  E.simOthers(G);
  G.last = {label: label, fx: fx.map(function (x) { return {h: x.h, a: x.a, res: x.res}; }), rat: rat};
  E.advance(G); MT = null; UI.scr = 'results'; UI.modal = null; save();
}

// ---------- actions ----------
var A = {
  'new': function (d) { var name = ($('mgr') && $('mgr').value.trim()) || 'Manager'; G = E.newGame(d.id, name, (Date.now() % 2147483647) | 0); UI.scr = 'news'; save(); },
  resume: function () { G = load(); UI.scr = 'news'; },
  go: function (d) { UI.scr = d.id; },
  'continue': function () {
    if (G.phase === 'done') { UI.scr = 'season'; return; }
    var f = E.userFixture(G);
    if (!f) return finishRound(null, null);
    var probs = E.selProblems(G, G.user, G.clubs[G.user].sel);
    if (probs.length) { UI.scr = 'select'; UI.msg = 'Sort out your team before kick-off. ' + probs[0]; return 'keepmsg'; }
    UI.scr = 'prematch';
  },
  kickoff: function () { var f = E.userFixture(G); MT = {f: f, M: E.matchFor(G, f), paused: false, fast: false, panel: false, u: f.h === G.user ? 0 : 1, resumed40: true}; startTimer(); },
  instant: function () { var f = E.userFixture(G); finishRound(f, E.playOut(G, E.matchFor(G, f))); },
  pause: function () { MT.paused = !MT.paused; if (!MT.paused) MT.resumed40 = true; },
  speed: function () { MT.fast = !MT.fast; startTimer(); },
  skip: function () { stopTimer(); MT.M.sides[MT.u].auto = true; E.playOut(G, MT.M); },
  mpanel: function () { MT.panel = !MT.panel; },
  subpick: function (d) { UI.modal = {t: 'sub', i: +d.id}; },
  dosub: function (d) { E.doSub(G, MT.M, MT.u, UI.modal.i, +d.id, false); UI.modal = null; },
  fulltime: function () { stopTimer(); finishRound(MT.f, MT.M); },
  player: function (d) { UI.modal = {t: 'player', id: +d.id}; },
  club: function (d) { UI.clubView = d.id; UI.scr = 'clubs'; },
  close: function () { UI.modal = null; },
  slot: function (d) { UI.modal = {t: 'slot', i: +d.id}; },
  assign: function (d) { var c = G.clubs[G.user], s = c.sel || (c.sel = []), i = UI.modal.i, id = +d.id; for (var k = 0; k < 23; k++) if (s[k] === undefined) s[k] = null;
    if (id < 0) s[i] = null; else { var at = s.indexOf(id); if (at >= 0) s[at] = s[i]; s[i] = id; } UI.modal = null; save(); },
  autopick: function () { G.clubs[G.user].sel = E.pickXV(G, G.user); save(); },
  clearsel: function () { G.clubs[G.user].sel = E.SLOTS.map(function () { return null; }); save(); },
  list: function (d) { var p = G.players[+d.id]; p.listed = !p.listed; save(); },
  offer: function (d) { var fee = Math.max(0, Math.round(+$('o_fee').value || 0)) * 1000, wage = Math.max(0, Math.round(+$('o_wage').value || 0)) * 1000, err = E.makeOffer(G, +d.id, fee, wage);
    if (err) UI.modal.err = err; else { UI.modal = null; UI.msg = 'Offer sent. You will hear back after the next match.'; save(); return 'keepmsg'; } },
  acceptbid: function (d) { E.acceptBid(G, +d.id); save(); },
  rejectbid: function (d) { E.rejectBid(G, +d.id); save(); },
  quit: function () { G = null; MT = null; UI.code = ''; },
  makecode: function () { encodeSave().then(function (c) { UI.code = c; UI.copied = false; render(); }); },
  copycode: function () { var done = function () { UI.copied = true; render(); }; try { navigator.clipboard.writeText(UI.code).then(done, function () { $('savecode').select(); }); } catch (e) { $('savecode').select(); } return 'norender'; },
  loadsave: function () { var v = $('loadcode').value; UI.loadErr = '';
    decodeSave(v).then(function (g) { G = g; MT = null; UI.scr = 'news'; UI.code = ''; save(); render(); }, function () { UI.loadErr = 'That code could not be read. Copy the whole code, starting with RM1: or RM0:, and try again.'; render(); }); return 'norender'; },
  wipe: function () { wipe(); G = null; }
};
var C = {
  tac: function (el) { var k = el.id.slice(2), tac = MT ? MT.M.sides[MT.u].tac : G.clubs[G.user].tac, v = el.value;
    if (k === 'kicker') tac.kicker = v === '' ? null : +v; else if (k === 'autoSubs') { tac.autoSubs = v === '1'; if (MT) MT.M.sides[MT.u].auto = tac.autoSubs; } else tac[k] = v;
    if (MT) { var keep = G.clubs[G.user].tac; if (k !== 'kicker') keep[k] = tac[k]; } save(); },
  tf: function () { UI.tf = {pos: $('f_pos').value, club: $('f_club').value, listed: $('f_listed').value === '1', sort: $('f_sort').value}; },
  fixround: function (el) { UI.fixRound = +el.value; },
  clubsel: function (el) { UI.clubView = el.value; }
};

var lastScr = '';
function render() {
  var y = window.scrollY, key = (G ? UI.scr : 'start') + (MT ? 'm' : '');
  $('app').innerHTML = !G ? startScreen() : MT ? frame(matchScreen(), true) + modal() : frame((S[UI.scr] || S.news)()) + modal();
  if (key === lastScr) window.scrollTo(0, y); else window.scrollTo(0, 0);
  lastScr = key;
}
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-a]'); if (!t) return;
  if (t.dataset.a === 'close' && t.classList.contains('veil') && e.target !== t) return;
  if (t.tagName === 'A') e.preventDefault();
  var keep = A[t.dataset.a](t.dataset); if (keep !== 'keepmsg') UI.msg = '';
  if (keep !== 'norender') render();
});
document.addEventListener('change', function (e) { var t = e.target.closest('[data-c]'); if (!t) return; C[t.dataset.c](t); render(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && UI.modal) { UI.modal = null; render(); } });
render();
})();
