/* Galactic Reaver — DOM UI: panels, screens, sector map, campaign flow */
'use strict';

const UI = {
  el: {},
  panState: null,
  squelchClick: false,

  init() {
    ['topbar', 'missionTag', 'pipTurn', 'pipMove', 'pipFire', 'pipRes', 'reqTag',
      'btnMute', 'btnHelp', 'btnMenu', 'btnSpeed', 'btnAuto', 'roster', 'context', 'btnAction', 'map',
      'hint', 'tip', 'inspector', 'banner', 'bannerText', 'bannerSub', 'bannerBtn',
      'log', 'screen', 'screenInner'].forEach(id => UI.el[id] = document.getElementById(id));

    Game.loadSpeed();
    UI.el.btnSpeed.textContent = Game.speed + '×';

    const cv = UI.el.map;
    Rend.init(cv);

    /* ---- pointer: click / hover / pan ---- */
    cv.addEventListener('click', e => {
      if (UI.squelchClick) { UI.squelchClick = false; return; }
      Snd.init(); Snd.resume();
      const p = Rend.toWorld(e);
      Game.mapClick(p.x, p.y);
    });
    cv.addEventListener('mousemove', e => {
      if (UI.panState) {
        const dx = UI.panState.x - e.clientX, dy = UI.panState.y - e.clientY;
        Rend.pan(dx, dy);
        UI.panState.x = e.clientX; UI.panState.y = e.clientY;
        UI.panState.moved += Math.abs(dx) + Math.abs(dy);
        return;
      }
      const p = Rend.toWorld(e);
      Game.mapMove(p.x, p.y);
      UI.updateTip(e);
    });
    cv.addEventListener('mousedown', e => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault();
        UI.panState = { x: e.clientX, y: e.clientY, moved: 0 };
      }
    });
    window.addEventListener('mouseup', e => {
      if (UI.panState) {
        if (UI.panState.moved > 6) UI.squelchClick = true;
        UI.panState = null;
      }
    });
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      Rend.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0012));
    }, { passive: false });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); Game.cancel(); });

    UI.el.btnAction.addEventListener('click', () => { Snd.init(); UI.mainAction(); });
    UI.el.btnAuto.addEventListener('click', () => { Snd.init(); Game.autoAssign(); });
    UI.el.btnSpeed.addEventListener('click', () => {
      UI.el.btnSpeed.textContent = Game.cycleSpeed() + '×';
      Snd.click();
    });
    UI.el.btnMute.addEventListener('click', () => {
      Snd.init();
      const m = Snd.toggleMute();
      UI.el.btnMute.classList.toggle('off', m);
    });
    UI.el.btnHelp.addEventListener('click', () => UI.showHelp());
    UI.el.btnMenu.addEventListener('click', () => UI.confirmAbandon());
    UI.el.bannerBtn.addEventListener('click', () => UI.afterBattle());

    document.addEventListener('keydown', e => {
      if (!UI.el.screen.classList.contains('hidden')) return;
      if (!Game.b) return;
      const pan = 90 / Rend.cam.z;
      switch (e.key) {
        case 'w': case 'W': case 'ArrowUp': e.preventDefault(); Rend.pan(0, -pan / 3); return;
        case 's': case 'S': case 'ArrowDown': e.preventDefault(); Rend.pan(0, pan / 3); return;
        case 'a': case 'A': case 'ArrowLeft': e.preventDefault(); Rend.pan(-pan / 3, 0); return;
        case 'd': case 'D': case 'ArrowRight': e.preventDefault(); Rend.pan(pan / 3, 0); return;
        case 'c': case 'C': Rend.fitCamera(); return;
        case '+': case '=': Rend.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.2); return;
        case '-': case '_': Rend.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.2); return;
      }
      if (e.repeat) return;
      Snd.init();
      if (e.key === ' ') { e.preventDefault(); if (UI.el.banner.classList.contains('hidden')) UI.mainAction(); else UI.afterBattle(); }
      else if (e.key === 'Escape') Game.cancel();
      else if (e.key === 'm' || e.key === 'M') UI.el.btnMute.click();
      else if (e.key === 'h' || e.key === 'H') UI.showHelp();
      else if (e.key === 'b' || e.key === 'B') { if (Game.b.phase === 'fire') Game.autoAssign(); }
      else if (e.key === 'f' || e.key === 'F') UI.el.btnSpeed.click();
      else if (/^[1-9]$/.test(e.key)) {
        const ships = Game.playerShips(Game.b);
        const s = ships[Number(e.key) - 1];
        if (s) Game.selectShip(s.id);
      }
    });

    UI.showTitle();
  },

  /* ================= main action button ================= */
  mainAction() {
    const b = Game.b;
    if (!b || b.banner) return;
    if (b.phase === 'move' && Game.allPlotted()) Game.engage();
    else if (b.phase === 'fire') Game.openFire();
    else if (b.phase === 'resolve') Game.endTurn();
  },

  /* ================= refresh ================= */
  refresh() {
    const b = Game.b;
    if (!b) return;
    UI.renderTopbar(b);
    UI.renderRoster(b);
    UI.renderContext(b);
    UI.renderAction(b);
    UI.renderHint(b);
    UI.renderInspector(b);
  },

  renderTopbar(b) {
    UI.el.pipTurn.textContent = 'TURN ' + U.padTurn(b.turn);
    UI.el.pipTurn.className = 'pip on';
    const move = b.phase === 'move' || b.phase === 'anim';
    const fire = b.phase === 'fire' || b.phase === 'firing' || b.phase === 'firewait';
    const res = b.phase === 'resolve';
    UI.el.pipMove.className = 'pip' + (move ? ' on' : ' done');
    UI.el.pipFire.className = 'pip' + (fire ? ' fire' : (res || b.phase === 'over' ? ' done' : ''));
    UI.el.pipRes.className = 'pip' + (res ? ' res' : '');
    UI.el.missionTag.textContent = b.mission.name + ' · ' + (b.mission.sub || '');
    UI.el.reqTag.textContent = Game.mode === 'campaign' ? '⬡ ' + Game.save.req + ' REQ' : '';
  },

  renderRoster(b) {
    const host = UI.el.roster;
    host.innerHTML = '<div class="paneltitle">FLEET</div>';
    b.ships.filter(s => s.side !== 'enemy').forEach(s => {
      const card = U.el('div', 'shipcard' + (b.sel === s.id ? ' sel' : '') + (!s.alive || s.exited ? ' dead' : ''));
      const hp = Math.max(0, s.hull / s.maxHull);
      const hclass = hp > 0.55 ? '' : (hp > 0.25 ? 'warn' : 'crit');
      let status = '';
      if (!s.alive) status = '<span class="st" style="color:#ff6159">LOST</span>';
      else if (s.exited) status = '<span class="st">JUMPED</span>';
      else if (b.phase === 'move' && s.side === 'player') status = s.plotted ? '<span class="st">PLOTTED ✓</span>' : '<span class="st" style="color:#ffb454">AWAITING</span>';
      const rank = DATA.RANKS[s.rank];
      const meta = [];
      if (s.alive && !s.exited) {
        meta.push('SHD F' + s.sh.F + ' S' + s.sh.S + ' A' + s.sh.A);
        DATA.SYS.forEach(n => { if (s.sys[n] > 0) meta.push('<span class="bad">' + n.split(' ')[0] + (s.sys[n] >= 2 ? '✖' : '!') + '</span>'); });
        if (s.fires > 0) meta.push('<span class="bad">FIRE×' + s.fires + '</span>');
        if (s.order) meta.push('<span class="ord">' + s.order.name + '</span>');
      }
      card.innerHTML =
        '<div class="nm">' + (rank.chev ? '<span style="color:#ffd465">' + rank.chev + '</span> ' : '') + U.esc(s.name) + status + '</div>' +
        '<div class="cls">' + U.esc(s.short) + (s.side === 'player' && rank.name !== 'GREEN' ? ' · ' + rank.name : '') + ' · HULL ' + Math.max(0, s.hull) + '/' + s.maxHull + '</div>' +
        '<div class="hullbar"><i class="' + hclass + '" style="width:' + Math.round(hp * 100) + '%"></i></div>' +
        (meta.length ? '<div class="meta">' + meta.join(' ') + '</div>' : '');
      if (s.alive && !s.exited && s.side === 'player') card.addEventListener('click', () => Game.selectShip(s.id));
      host.appendChild(card);
    });
  },

  renderContext(b) {
    const host = UI.el.context;
    host.innerHTML = '';
    const s = Game.ship(b.sel);

    if (b.phase === 'move') {
      host.appendChild(U.el('div', 'paneltitle', s ? 'HELM ORDERS — ' + U.esc(s.name.replace('VSS ', '')) : 'HELM ORDERS'));
      if (!s) {
        host.appendChild(U.el('div', '', '<div style="font:400 10px \'IBM Plex Mono\',monospace;color:#5c7089;line-height:1.6">Select a ship from the fleet roster (or press 1–4).</div>'));
        return;
      }
      DATA.orders(s).forEach(o => {
        const card = U.el('div', 'ordercard' + (b.curOrder && b.curOrder.id === o.id ? ' sel' : ''));
        card.innerHTML = '<div class="nm">' + o.name + '</div><div class="ds">' + o.desc + '</div>';
        card.addEventListener('click', () => Game.selectOrder(o));
        host.appendChild(card);
      });
    } else if (b.phase === 'fire' || b.phase === 'firing' || b.phase === 'firewait') {
      host.appendChild(U.el('div', 'paneltitle', s ? 'WEAPONS — ' + U.esc(s.name.replace('VSS ', '')) : 'WEAPONS'));
      if (!s) {
        host.appendChild(U.el('div', '', '<div style="font:400 10px \'IBM Plex Mono\',monospace;color:#5c7089;line-height:1.6">Select a ship to direct its batteries.</div>'));
        return;
      }
      s.weapons.forEach((w, i) => {
        const armed = b.armed && b.armed.shipId === s.id && b.armed.wIdx === i;
        const offline = s.sys['WEAPONS'] >= 2;
        const braced = (w.type === 'torp' || w.type === 'bay') && s.order && s.order.brace;
        const charging = w.reload > 0;
        const isFighters = w.type === 'bay' && w.craft === 'fighters';
        let ds, dsCls = '';
        if (offline) { ds = 'WEAPONS DESTROYED'; dsCls = 'cold'; }
        else if (braced) { ds = 'crews braced — decks sealed'; dsCls = 'cold'; }
        else if (charging) { ds = (w.type === 'bay' ? 'rearming' : 'reloading') + ' — ' + w.reload + ' turn' + (w.reload > 1 ? 's' : ''); dsCls = 'cold'; }
        else if (w.target) {
          const t = Game.ship(w.target);
          const sol = (t && !isFighters) ? Game.solution(s, w, t) : null;
          ds = '→ ' + (t ? t.name.replace('DKV ', '').replace('VSS ', '') : '?') +
            (sol && sol.ok && sol.dice ? ' · ' + sol.dice + 'd6 on ' + sol.need + '+' : '') + ' · click to clear';
          dsCls = 'hot';
        }
        else if (armed) { ds = isFighters ? 'ARMED — click a FRIENDLY ship to cover' : 'ARMED — click a target on the map'; dsCls = 'hot'; }
        else {
          if (w.type === 'torp') ds = 'salvo of ' + w.salvo + ' · ignores shields · ' + w.arc + ' arc';
          else if (w.type === 'bay') ds = w.craft === 'bombers'
            ? 'wave of ' + w.salvo + ' · homes on target · flak & fighters can stop it'
            : 'screen of ' + w.salvo + ' · escorts a ship · intercepts ordnance';
          else ds = w.dice + 'd6 hit on ' + w.need + '+ · ' + w.dmgPer + ' dmg/hit · ' + w.arc + ' arc · rng ' + w.range;
        }
        const card = U.el('div', 'weaponcard' + (armed ? ' armed' : '') + (w.target ? ' assigned' : '') + (offline || charging || braced ? ' disabled' : ''));
        card.innerHTML = '<div class="nm">' + w.name + '</div><div class="ds ' + dsCls + '">' + ds + '</div>';
        card.addEventListener('click', () => Game.armWeapon(s.id, i));
        host.appendChild(card);
      });
      // boarding action
      const targets = s ? Game.boardTargets(s) : [];
      const boardable = s && !s.boarded && targets.length > 0 && b.phase === 'fire';
      const boarding = b.boardMode === s.id;
      const bCard = U.el('div', 'weaponcard board' + (boarding ? ' armed' : '') + (!boardable ? ' disabled' : ''));
      let bds;
      if (s.boarded) bds = 'boarding parties committed this turn';
      else if (!targets.length) bds = 'no enemy ship or hulk within ' + DATA.BOARD_RANGE + ' — close alongside';
      else if (boarding) bds = 'click an adjacent enemy or hulk';
      else bds = targets.length + ' target' + (targets.length > 1 ? 's' : '') + ' alongside · raid a live ship or seize a hulk';
      bCard.innerHTML = '<div class="nm">⚔ BOARDING ACTION</div><div class="ds ' + (boarding ? 'hot' : '') + '">' + bds + '</div>';
      if (boardable) bCard.addEventListener('click', () => Game.toggleBoardMode(s.id));
      host.appendChild(bCard);
      host.appendChild(U.el('div', '', '<div style="font:400 9px \'IBM Plex Mono\',monospace;color:#43536a;margin-top:8px;line-height:1.6">Ordnance travels the map and strikes whatever it meets — friend or foe.</div>'));
    } else if (b.phase === 'resolve') {
      host.appendChild(U.el('div', 'paneltitle', 'RESOLUTION'));
      host.appendChild(U.el('div', '', '<div style="font:400 10.5px \'IBM Plex Mono\',monospace;color:#8ba0b8;line-height:1.7">Review the engagement log, then end the turn. Damage-control crews will fight fires, attempt repairs — and shields recharge on any ship that wasn\'t hit.</div>'));
    } else if (b.phase === 'anim') {
      host.appendChild(U.el('div', 'paneltitle', 'MANEUVERING'));
    }
  },

  renderAction(b) {
    const btn = UI.el.btnAction;
    UI.el.btnAuto.classList.toggle('hidden', b.phase !== 'fire');
    btn.className = '';
    if (b.phase === 'move') {
      const ready = Game.allPlotted();
      btn.textContent = ready ? 'ENGAGE ▸' : 'PLOT ALL SHIPS…';
      btn.disabled = !ready;
    } else if (b.phase === 'anim') {
      btn.textContent = 'MANEUVERING…';
      btn.disabled = true;
    } else if (b.phase === 'fire') {
      btn.textContent = Game.anyAssigned() ? 'OPEN FIRE ▸' : 'HOLD FIRE ▸';
      btn.classList.add('fire');
      btn.disabled = false;
    } else if (b.phase === 'firing' || b.phase === 'firewait') {
      btn.textContent = 'FIRING…';
      btn.classList.add('fire');
      btn.disabled = true;
    } else if (b.phase === 'resolve') {
      btn.textContent = 'END TURN ▸';
      btn.disabled = false;
    } else {
      btn.textContent = '—';
      btn.disabled = true;
    }
  },

  renderHint(b) {
    let h = '';
    if (b.phase === 'move') {
      const s = Game.ship(b.sel);
      if (!s) h = Game.allPlotted() ? 'ALL SHIPS PLOTTED — PRESS ENGAGE (SPACE)' : 'SELECT A SHIP TO PLOT ITS MOVE';
      else if (b.plotStep === 'order') h = '① ' + s.name.replace('VSS ', '') + ' — SELECT A HELM ORDER · right-click to cancel';
      else if (b.plotStep === 'dest') h = '② CLICK DESTINATION — cone shows max turn ±' + b.curOrder.maxTurn + '°';
      else if (b.plotStep === 'angle') h = '③ MOVE MOUSE TO SET FACING · CLICK TO LOCK';
    }
    else if (b.phase === 'anim') h = 'ALL SHIPS MANEUVERING…';
    else if (b.phase === 'fire') {
      if (b.boardMode) h = '⚔ CLICK AN ADJACENT ENEMY OR HULK TO BOARD';
      else h = b.armed ? 'CLICK A TARGET ON THE MAP' : 'ASSIGN TARGETS — B = BROADSIDES AT WILL — THEN OPEN FIRE (SPACE)';
    }
    else if (b.phase === 'firing' || b.phase === 'firewait') h = 'EXCHANGING FIRE…';
    else if (b.phase === 'resolve') h = 'RESULTS LOGGED — END TURN (SPACE)';
    UI.el.hint.textContent = h;
    UI.el.hint.style.display = h ? '' : 'none';
  },

  updateTip(e) {
    const b = Game.b;
    const tip = UI.el.tip;
    if (!b || b.phase !== 'fire' || !b.armed || !b.hover) { tip.classList.add('hidden'); return; }
    const s = Game.ship(b.armed.shipId);
    const w = s && s.weapons[b.armed.wIdx];
    const t = Game.ship(b.hover);
    if (!s || !w || !t || !t.alive) { tip.classList.add('hidden'); return; }
    if (w.type === 'bay' && w.craft === 'fighters') { tip.classList.add('hidden'); return; }
    const sol = Game.solution(s, w, t);
    let html;
    if (sol.ok && w.type === 'torp') {
      html = '<div class="t1">' + w.name + ' → ' + U.esc(t.name) + '</div>' +
        '<div class="t2">SALVO OF ' + w.salvo + ' · RANGE ' + sol.dist + '</div>' +
        '<div class="t3">torpedoes run 270/turn · D6 hull per fish · point defense can thin the salvo<br>bypasses shields · heavy crits</div>';
    } else if (sol.ok && w.type === 'bay') {
      html = '<div class="t1">' + w.name + ' → ' + U.esc(t.name) + '</div>' +
        '<div class="t2">WAVE OF ' + w.salvo + ' · RANGE ' + sol.dist + '</div>' +
        '<div class="t3">bombers home on their mark each turn · 2 hull per hit, bypasses shields<br>flak turrets and fighter screens can break the wave</div>';
    } else if (sol.ok) {
      html = '<div class="t1">' + w.name + ' → ' + U.esc(t.name) + '</div>' +
        '<div class="t2">' + sol.dice + 'd6 · HIT ON ' + sol.need + '+ · ' + sol.dmgPer + ' DMG/HIT · RANGE ' + sol.dist + '</div>' +
        '<div class="t3">expected ~' + sol.exp + ' hull · shields soak hits one-for-one' +
        (sol.stern ? '<br>⚅ STERN SHOT — bypasses shields · crits on 5+' : '<br>⚅ crit on 6 per damaging volley (4+ hits: on 5+)') + '</div>';
    } else {
      html = '<div class="t1">' + w.name + ' → ' + U.esc(t.name) + '</div>' +
        '<div class="t2">' + sol.why + '</div><div class="t3">reposition next movement phase</div>';
    }
    tip.innerHTML = html;
    tip.style.left = (e.clientX + 18) + 'px';
    tip.style.top = (e.clientY + 14) + 'px';
    tip.classList.remove('hidden');
  },

  renderInspector(b) {
    const host = UI.el.inspector;
    if (!b.inspect) { host.classList.add('hidden'); return; }
    const s = Game.ship(b.inspect);
    if (!s) { host.classList.add('hidden'); return; }
    const enemy = s.side === 'enemy';
    host.className = enemy ? 'enemy' : '';
    const hp = Math.max(0, s.hull / s.maxHull);
    const rank = DATA.RANKS[s.rank];
    let html = '<div class="close" id="insClose">✕</div>' +
      '<h3>' + U.esc(s.name) + '</h3>' +
      '<div class="sub">' + U.esc(s.label) +
      (s.hulked ? ' · DRIFTING HULK' : (enemy ? ' · HOSTILE' : (s.side === 'ally' ? ' · PROTECTED' : ' · YOUR SHIP'))) +
      (s.routing ? ' · ⚑ DISENGAGING' : '') +
      (s.vip ? ' · ◆ PRIORITY TARGET' : '') + '</div>';
    if (s.side === 'player' && rank.name !== 'GREEN') {
      html += '<div class="row"><span>' + rank.chev + ' ' + rank.name + ' CREW</span><span class="ok">' + rank.desc + '</span></div>';
    }
    if (s.hulked) {
      html += '<div class="sect">STATUS</div>' +
        '<div class="row"><span>' + (s.captured ? '⚑ PRIZE SECURED — salvage or commission after battle' : 'Adrift and burning. Board her (within ' + DATA.BOARD_RANGE + ') to take a prize.') + '</span></div>';
    } else {
      html += '<div class="sect">HULL ' + Math.max(0, s.hull) + '/' + s.maxHull + '</div>' +
        '<div class="hullbar" style="margin-bottom:4px"><i class="' + (hp > 0.55 ? '' : hp > 0.25 ? 'warn' : 'crit') + '" style="width:' + Math.round(hp * 100) + '%"></i></div>' +
        '<div class="sect">SHIELDS</div>' +
        '<div class="row"><span>FORE ' + '▮'.repeat(s.sh.F) + '▯'.repeat(Math.max(0, s.shMax.F - s.sh.F)) +
        ' · SIDE ' + '▮'.repeat(s.sh.S) + '▯'.repeat(Math.max(0, s.shMax.S - s.sh.S)) +
        ' · AFT ' + '▮'.repeat(s.sh.A) + '▯'.repeat(Math.max(0, s.shMax.A - s.sh.A)) + '</span></div>' +
        '<div class="sect">INTERNAL SYSTEMS</div>';
      DATA.SYS.forEach(n => {
        const lvl = s.sys[n];
        const st = lvl === 0 ? '<span class="ok">OK</span>' : (lvl === 1 ? '<span class="warn">DAMAGED</span>' : '<span class="bad">DESTROYED</span>');
        html += '<div class="row' + (lvl > 0 ? ' dmg' : '') + '"><span>' + n + '</span>' + st + '</div>';
      });
      if (s.fires > 0) html += '<div class="row dmg"><span>FIRES BURNING</span><span class="bad">×' + s.fires + '</span></div>';
      if (s.weapons.length) {
        html += '<div class="sect">ARMAMENT</div>';
        s.weapons.forEach(w => {
          const st = w.reload > 0 ? '<span class="warn">RELOAD ' + w.reload + '</span>' : '<span class="ok">READY</span>';
          const stat = w.type === 'torp' ? ' ×' + w.salvo : (w.type === 'bay' ? ' ' + w.craft.toUpperCase() + ' ×' + w.salvo : ' ' + w.dice + 'd6@' + w.need + '+');
          html += '<div class="row"><span>' + w.name + ' · ' + w.arc.toUpperCase() + stat + '</span>' + st + '</div>';
        });
      }
      html += '<div class="sect">SPEED ' + Math.round(Game.effSpeed(s)) + ' · TURN ±' + s.maxTurn + '° · TURRETS ' + s.turrets +
        (s.side === 'player' ? ' · KILLS ' + s.kills : '') + '</div>';
    }
    host.innerHTML = html;
    host.classList.remove('hidden');
    document.getElementById('insClose').addEventListener('click', () => { Game.b.inspect = null; UI.refresh(); });
  },

  /* ================= log ================= */
  pushLog(e) {
    const host = UI.el.log;
    if (!host) return;
    const line = U.el('div', 'logline' + (e.die ? ' box' + (e.crit ? ' critbox' : '') : '') + (e.big ? ' big' : ''));
    line.innerHTML = (e.die ? '<span class="die">' + e.die + '</span>' : '') +
      '<span style="color:' + e.c + '">' + U.esc(e.t) + '</span>';
    host.appendChild(line);
    host.scrollTop = host.scrollHeight;
    while (host.children.length > 220) host.removeChild(host.firstChild);
  },

  rebuildLog() {
    UI.el.log.innerHTML = '';
    if (Game.b) Game.b.log.forEach(e => UI.pushLog(e));
  },

  /* ================= battle end / banner ================= */
  onBattleEnd(win) {
    UI.refresh();
    setTimeout(() => {
      const b = Game.b;
      if (!b || !b.banner) return;
      UI.el.bannerText.textContent = b.banner.win ? 'VICTORY' : 'DEFEAT';
      UI.el.bannerText.className = b.banner.win ? 'win' : 'lose';
      UI.el.bannerSub.textContent = b.banner.msg;
      UI.el.bannerBtn.textContent = 'CONTINUE ▸';
      UI.el.banner.classList.remove('hidden');
    }, 1400);
  },

  afterBattle() {
    const b = Game.b;
    if (!b || !b.banner) return;
    UI.el.banner.classList.add('hidden');
    const win = b.banner.win;
    if (Game.mode === 'skirmish') {
      UI.showSkirmishResult(win);
      return;
    }
    if (win) {
      const earned = Game.earnings();
      Game.save.req += earned;
      const report = Game.applyBattleResults();
      const node = DATA.sectorNode(Game.currentNode);
      if (!Game.save.completed.includes(Game.currentNode)) Game.save.completed.push(Game.currentNode);
      Game.save.node = Game.currentNode;
      if (node.final) {
        Game.save.done = true;
        Game.persist();
        UI.showCampaignVictory();
      } else {
        Game.persist();
        UI.showDebrief(report, earned);
      }
    } else {
      UI.showRetry();
    }
  },

  confirmAbandon() {
    if (!Game.b) { UI.showTitle(); return; }
    UI.screen(
      '<div class="brieftitle">ABANDON ENGAGEMENT?</div>' +
      '<div class="briefsub">PROGRESS THIS BATTLE WILL BE LOST</div>' +
      '<button class="menu-btn danger" id="mnAbandon">ABANDON — RETURN TO MENU</button>' +
      '<button class="menu-btn" id="mnBack">KEEP FIGHTING</button>'
    );
    document.getElementById('mnAbandon').addEventListener('click', () => { Game.b = null; UI.showTitle(); });
    document.getElementById('mnBack').addEventListener('click', () => UI.closeScreen());
  },

  /* ================= full screens ================= */
  screen(html) {
    UI.el.screenInner.innerHTML = html;
    UI.el.screen.classList.remove('hidden');
  },
  closeScreen() { UI.el.screen.classList.add('hidden'); },

  showTitle() {
    const save = Game.loadSave();
    UI.screen(
      '<div class="title-big">GALACTIC <span>REAVER</span></div>' +
      '<div class="title-sub">BATTLE FOR THE KESSEL DRIFT</div>' +
      (save && !save.done ? '<button class="menu-btn primary" id="mnContinue">CONTINUE CAMPAIGN — ' + save.completed.length + '/4 ENGAGEMENTS</button>' : '') +
      '<button class="menu-btn' + (save && !save.done ? '' : ' primary') + '" id="mnNew">NEW CAMPAIGN</button>' +
      '<button class="menu-btn" id="mnSkirmish">SKIRMISH</button>' +
      '<button class="menu-btn" id="mnHelp">HOW TO PLAY</button>' +
      '<div style="margin-top:34px;font:400 9.5px \'IBM Plex Mono\',monospace;color:#3a4a5e">a Battlefleet Gothic–inspired tactical space combat game<br>dice-pool broadsides · torpedo salvos · bomber waves · boarding actions · the Verge keeps what it takes</div>'
    );
    const cont = document.getElementById('mnContinue');
    if (cont) cont.addEventListener('click', () => { Snd.init(); Game.save = save; UI.showSector(); });
    document.getElementById('mnNew').addEventListener('click', () => {
      Snd.init();
      Game.save = Game.freshSave();
      Game.persist();
      UI.showSector();
    });
    document.getElementById('mnSkirmish').addEventListener('click', () => { Snd.init(); UI.showSkirmishSetup(); });
    document.getElementById('mnHelp').addEventListener('click', () => UI.showHelp());
  },

  /* ---------------- sector map ---------------- */
  showSector() {
    const sv = Game.save;
    const avail = DATA.sectorNext(sv.node).filter(id => !sv.completed.includes(id));
    const nodes = DATA.SECTOR.nodes;
    const pos = {};
    nodes.forEach(n => pos[n.id] = n);
    const lines = DATA.SECTOR.edges.map(e => {
      const a = pos[e[0]], b2 = pos[e[1]];
      const done = sv.completed.includes(e[0]) && (sv.completed.includes(e[1]) || avail.includes(e[1]));
      return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b2.x + '" y2="' + b2.y + '" stroke="' +
        (done ? 'rgba(111,224,168,.5)' : 'rgba(76,215,234,.22)') + '" stroke-width="0.4" stroke-dasharray="1.6 1.2"/>';
    }).join('');
    const nodeHtml = nodes.map(n => {
      const m = DATA.MISSION_DEFS[n.mission];
      const done = sv.completed.includes(n.id);
      const open = avail.includes(n.id);
      const cls = done ? 'done' : (open ? 'open' : 'locked');
      return '<div class="secnode ' + cls + '" data-node="' + n.id + '" style="left:' + n.x + '%;top:' + n.y + '%">' +
        '<div class="dot"></div>' +
        '<div class="lbl">' + (done ? '✓ ' : '') + m.name + (n.final ? ' ◆' : '') + '</div>' +
        '<div class="sub2">' + (done ? 'SECURED' : (open ? 'ENGAGE ▸' : 'NO ROUTE')) + '</div></div>';
    }).join('');
    UI.screen(
      '<div class="brieftitle">KESSEL DRIFT — SECTOR MAP</div>' +
      '<div class="briefsub">CHOOSE YOUR NEXT ENGAGEMENT · ROUTES BRANCH — EACH CAMPAIGN FIGHTS 4 OF 6 BATTLES</div>' +
      '<div id="secmap">' +
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + lines + '</svg>' +
      nodeHtml +
      '</div>' +
      '<div class="fleetline">⬡ ' + sv.req + ' REQ · FLEET: ' + sv.fleet.map(f => f.name.replace('VSS ', '')).join(' · ') + '</div>' +
      '<button class="menu-btn" id="mnFleetMgmt">FLEET & REQUISITION</button>' +
      '<button class="menu-btn" id="mnTitleSec">BACK TO MENU</button>'
    );
    UI.el.screenInner.querySelectorAll('.secnode.open').forEach(el => {
      el.addEventListener('click', () => { Snd.select(); UI.showBriefing(el.dataset.node); });
    });
    document.getElementById('mnFleetMgmt').addEventListener('click', () => UI.showDebrief(null, 0));
    document.getElementById('mnTitleSec').addEventListener('click', () => UI.showTitle());
  },

  showBriefing(nodeId) {
    Game.mode = 'campaign';
    const node = DATA.sectorNode(nodeId);
    const m = node && DATA.MISSION_DEFS[node.mission];
    if (!m) { UI.showTitle(); return; }
    const fleet = Game.save.fleet.map(f => f.name + ' (' + DATA.CLASSES[f.cls].short + ')').join(' · ');
    UI.screen(
      '<div class="brieftitle">' + m.name + '</div>' +
      '<div class="briefsub">' + m.sub + '</div>' +
      '<div class="briefbody">' + m.briefing.map(p =>
        '<p class="' + (p.startsWith('OBJECTIVE') ? 'obj' : '') + '">' + U.esc(p) + '</p>').join('') + '</div>' +
      '<div class="fleetline">YOUR FLEET — ' + U.esc(fleet) + '</div>' +
      '<button class="menu-btn primary" id="mnBegin">BEGIN ENGAGEMENT ▸</button>' +
      '<button class="menu-btn" id="mnBackSec">SECTOR MAP</button>'
    );
    document.getElementById('mnBegin').addEventListener('click', () => {
      Snd.init(); Snd.click();
      UI.closeScreen();
      Game.startMission(nodeId);
      UI.rebuildLog();
    });
    document.getElementById('mnBackSec').addEventListener('click', () => UI.showSector());
  },

  showRetry() {
    const node = DATA.sectorNode(Game.currentNode);
    const m = node && DATA.MISSION_DEFS[node.mission];
    UI.screen(
      '<div class="brieftitle" style="color:#ff6159">MISSION FAILED</div>' +
      '<div class="briefsub">' + (m ? m.name : '') + '</div>' +
      '<div class="briefbody"><p>' + U.esc(Game.b && Game.b.banner ? Game.b.banner.msg : '') + '</p>' +
      '<p>The Coalition tows what\'s left of your fleet back to the tender. Hulls are patched, crews replaced. The mission remains.</p></div>' +
      '<button class="menu-btn primary" id="mnRetry">RETRY MISSION ▸</button>' +
      '<button class="menu-btn" id="mnTitleR">SECTOR MAP</button>'
    );
    document.getElementById('mnRetry').addEventListener('click', () => UI.showBriefing(Game.currentNode));
    document.getElementById('mnTitleR').addEventListener('click', () => UI.showSector());
    Game.b = null;
  },

  /* ---------------- debrief + fleet management ---------------- */
  showDebrief(report, earned) {
    const sv = Game.save;
    let reportHtml = '';
    if (report) {
      const rows = [];
      report.gains.forEach(g => rows.push('<div class="row"><span>' + U.esc(g.name) + ' — +' + g.xp + ' XP' +
        (g.kills ? ' · ' + g.kills + ' kill' + (g.kills > 1 ? 's' : '') : '') + '</span>' +
        (g.rankUp ? '<span class="ok">▲ PROMOTED — ' + g.rankUp + '</span>' : '<span></span>') + '</div>'));
      report.losses.forEach(n => rows.push('<div class="row dmg"><span>' + U.esc(n) + '</span><span class="bad">LOST WITH ALL HANDS</span></div>'));
      if (report.replacement) rows.push('<div class="row"><span>' + report.replacement + ' commissioned to replace the fleet</span><span class="ok">NEW</span></div>');
      if (report.salvage) rows.push('<div class="row"><span>Scavenger teams strip the drifting wrecks</span><span class="ok">+' + report.salvage + ' REQ</span></div>');
      report.prizes.forEach((p, i) => {
        const c = DATA.CLASSES[p.cls];
        const full = sv.fleet.length >= DATA.MAX_FLEET;
        rows.push('<div class="row prize"><span>⚑ PRIZE — ' + U.esc(p.name) + ' (' + c.short + ')</span>' +
          '<span><button class="pbtn" data-salv="' + i + '">SALVAGE +' + Math.round(p.pts * 0.6) + ' REQ</button> ' +
          '<button class="pbtn" data-comm="' + i + '" ' + (full ? 'disabled' : '') + '>COMMISSION</button></span></div>');
      });
      reportHtml = '<div class="paneltitle" style="text-align:left">BATTLE REPORT · +' + earned + ' REQ EARNED</div>' +
        '<div class="reportbox">' + (rows.join('') || '<div class="row"><span>No changes to report.</span></div>') + '</div>';
    }
    const fleetHtml = sv.fleet.map((f, i) => {
      const c = DATA.CLASSES[f.cls];
      const rank = DATA.RANKS[Game.rankOf(f.xp)];
      const nextRank = DATA.RANKS[Game.rankOf(f.xp) + 1];
      const cost = DATA.refitCost(f.cls);
      return '<div class="storecard"><h4>' + (rank.chev ? '<span style="color:#ffd465">' + rank.chev + '</span> ' : '') + U.esc(f.name) + '</h4>' +
        '<div class="ds">' + c.short + ' · ' + rank.name + (rank.desc ? ' — ' + rank.desc : '') +
        '<br>XP ' + f.xp + (nextRank ? ' / ' + nextRank.xp + ' → ' + nextRank.name : ' · MAX RANK') +
        (f.refit ? '<br>✓ GUNNERY REFIT (+1 die, all guns)' : '') + '</div>' +
        (f.refit ? '<button disabled>REFITTED ✓</button>'
          : '<button data-refit="' + i + '" ' + (sv.req < cost ? 'disabled' : '') + '>GUNNERY REFIT +1 DIE — ' + cost + ' REQ</button>') +
        '</div>';
    }).join('');
    const shipRows = DATA.STORE_SHIPS.map((st, i) => {
      const c = DATA.CLASSES[st.cls];
      const full = sv.fleet.length >= DATA.MAX_FLEET;
      const afford = sv.req >= st.cost;
      return '<div class="storecard"><h4>' + c.label + '</h4><div class="ds">' + c.desc +
        '<br>HULL ' + c.hull + ' · SPD ' + c.speed + ' · TURRETS ' + c.turrets + '</div>' +
        '<button data-buy="' + i + '" ' + (full || !afford ? 'disabled' : '') + '>' +
        (full ? 'FLEET FULL (MAX ' + DATA.MAX_FLEET + ')' : 'COMMISSION — ' + st.cost + ' REQ') + '</button></div>';
    }).join('');
    const upRows = DATA.UPGRADES.map(u => {
      const owned = !!sv.upgrades[u.id];
      const afford = sv.req >= u.cost;
      return '<div class="storecard' + (owned ? ' owned' : '') + '"><h4>' + u.name + '</h4><div class="ds">' + u.desc + '</div>' +
        '<button data-up="' + u.id + '" ' + (owned || !afford ? 'disabled' : '') + '>' +
        (owned ? 'INSTALLED ✓' : 'INSTALL — ' + u.cost + ' REQ') + '</button></div>';
    }).join('');
    UI.screen(
      (report
        ? '<div class="brieftitle" style="color:#6fe0a8">MISSION COMPLETE</div><div class="briefsub">HULLS REPAIRED · CREWS RESTED</div>'
        : '<div class="brieftitle">FLEET COMMAND</div><div class="briefsub">TENDER & REQUISITION</div>') +
      '<div class="reqbig">⬡ ' + sv.req + ' REQUISITION</div>' +
      reportHtml +
      '<div class="paneltitle" style="text-align:left">YOUR FLEET — ' + sv.fleet.length + '/' + DATA.MAX_FLEET + ' · veterans keep their crews as long as they live</div>' +
      '<div class="storegrid">' + fleetHtml + '</div>' +
      '<div class="paneltitle" style="text-align:left">COMMISSION SHIPS</div>' +
      '<div class="storegrid">' + shipRows + '</div>' +
      '<div class="paneltitle" style="text-align:left">FLEET UPGRADES</div>' +
      '<div class="storegrid">' + upRows + '</div>' +
      '<button class="menu-btn primary" id="mnToSector">SECTOR MAP ▸</button>'
    );
    const rerender = () => { Game.persist(); UI.showDebrief(report, earned); };
    UI.el.screenInner.querySelectorAll('[data-salv]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = report.prizes.splice(Number(btn.dataset.salv), 1)[0];
        sv.req += Math.round(p.pts * 0.6);
        Snd.repair();
        rerender();
      });
    });
    UI.el.screenInner.querySelectorAll('[data-comm]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (sv.fleet.length >= DATA.MAX_FLEET) return;
        const p = report.prizes.splice(Number(btn.dataset.comm), 1)[0];
        sv.fleet.push({ cls: p.cls, name: p.name.replace('DKV ', 'VSS ') + ' ⚑', xp: 0, refit: false });
        Snd.repair();
        rerender();
      });
    });
    UI.el.screenInner.querySelectorAll('[data-refit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = sv.fleet[Number(btn.dataset.refit)];
        const cost = DATA.refitCost(f.cls);
        if (f.refit || sv.req < cost) return;
        sv.req -= cost;
        f.refit = true;
        Snd.repair();
        rerender();
      });
    });
    UI.el.screenInner.querySelectorAll('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const st = DATA.STORE_SHIPS[Number(btn.dataset.buy)];
        if (sv.req < st.cost || sv.fleet.length >= DATA.MAX_FLEET) return;
        sv.req -= st.cost;
        const used = sv.fleet.map(f => f.name);
        const name = DATA.SHIP_NAMES.find(n => !used.includes(n)) || ('VSS ESCORT ' + (sv.fleet.length + 1));
        sv.fleet.push({ cls: st.cls, name, xp: 0, refit: false });
        Snd.repair();
        rerender();
      });
    });
    UI.el.screenInner.querySelectorAll('[data-up]').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = DATA.UPGRADES.find(x => x.id === btn.dataset.up);
        if (!u || sv.upgrades[u.id] || sv.req < u.cost) return;
        sv.req -= u.cost;
        sv.upgrades[u.id] = true;
        Snd.repair();
        rerender();
      });
    });
    document.getElementById('mnToSector').addEventListener('click', () => { Game.persist(); UI.showSector(); });
    Game.b = null;
  },

  showCampaignVictory() {
    UI.screen(
      '<div class="title-big" style="font-size:44px">DRIFT <span>SECURED</span></div>' +
      '<div class="title-sub">CAMPAIGN COMPLETE</div>' +
      '<div class="briefbody"><p>The DREADMAW is gone, and with her the Dominion\'s claim on the Kessel Drift. Coalition traffic moves under its own lights again.</p>' +
      '<p>Voss: "They\'ll be back — they always come back. But not this year, and not through you. Good gunnery, Captain. Log it and move on."</p>' +
      '<p>Fleet honours: ' + Game.save.fleet.map(f => f.name + ' (' + DATA.RANKS[Game.rankOf(f.xp)].name + ', ' + f.xp + ' XP)').join(' · ') + '</p></div>' +
      '<button class="menu-btn primary" id="mnAgain">NEW CAMPAIGN</button>' +
      '<button class="menu-btn" id="mnSk2">SKIRMISH</button>'
    );
    document.getElementById('mnAgain').addEventListener('click', () => {
      Game.save = Game.freshSave(); Game.persist(); UI.showSector();
    });
    document.getElementById('mnSk2').addEventListener('click', () => UI.showSkirmishSetup());
    Game.b = null;
  },

  showSkirmishResult(win) {
    UI.screen(
      '<div class="brieftitle" style="color:' + (win ? '#6fe0a8' : '#ff6159') + '">' + (win ? 'SKIRMISH WON' : 'SKIRMISH LOST') + '</div>' +
      '<div class="briefsub">' + U.esc(Game.b && Game.b.banner ? Game.b.banner.msg : '') + '</div>' +
      '<button class="menu-btn primary" id="mnSkAgain">FIGHT ANOTHER ▸</button>' +
      '<button class="menu-btn" id="mnTitleS">BACK TO MENU</button>'
    );
    document.getElementById('mnSkAgain').addEventListener('click', () => UI.showSkirmishSetup());
    document.getElementById('mnTitleS').addEventListener('click', () => UI.showTitle());
    Game.b = null;
  },

  showSkirmishSetup() {
    const picks = ['corvette'];
    const HULLS = ['corvette', 'frigate', 'lcruiser', 'argus'];
    const render = () => {
      const cards = HULLS.map(cls => {
        const c = DATA.CLASSES[cls];
        const n = picks.filter(p => p === cls).length;
        return '<div class="pickcard' + (n ? ' sel' : '') + '" data-cls="' + cls + '">' +
          '<h4>' + c.short + (n ? ' ×' + n : '') + '</h4>' +
          '<div class="ds">' + c.desc + '</div>' +
          '<div class="pt">' + c.pts + ' PTS · HULL ' + c.hull + ' · SPD ' + c.speed + '</div></div>';
      }).join('');
      const pts = picks.reduce((a, p) => a + DATA.CLASSES[p].pts, 0);
      UI.screen(
        '<div class="brieftitle">SKIRMISH</div>' +
        '<div class="briefsub">BUILD YOUR FLEET — CLICK TO ADD, RIGHT-CLICK TO REMOVE · MAX ' + DATA.MAX_FLEET + ' SHIPS</div>' +
        '<div class="pickrow">' + cards + '</div>' +
        '<div class="fleetline">FLEET: ' + picks.map(p => DATA.CLASSES[p].short).join(' · ') + ' — ' + pts + ' PTS · Dominion gets a matched force</div>' +
        '<button class="menu-btn primary" id="mnLaunch"' + (picks.length ? '' : ' disabled') + '>LAUNCH ▸</button>' +
        '<button class="menu-btn" id="mnTitleK">BACK</button>'
      );
      UI.el.screenInner.querySelectorAll('.pickcard').forEach(card => {
        card.addEventListener('click', () => {
          if (picks.length < DATA.MAX_FLEET) { picks.push(card.dataset.cls); Snd.click(); render(); }
        });
        card.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const i = picks.lastIndexOf(card.dataset.cls);
          if (i >= 0) { picks.splice(i, 1); Snd.click(); render(); }
        });
      });
      document.getElementById('mnLaunch').addEventListener('click', () => {
        if (!picks.length) return;
        Snd.init(); Snd.click();
        UI.closeScreen();
        Game.startSkirmish(picks);
        UI.rebuildLog();
      });
      document.getElementById('mnTitleK').addEventListener('click', () => UI.showTitle());
    };
    render();
  },

  showHelp() {
    const inBattle = !!Game.b;
    UI.screen(
      '<div class="brieftitle">HOW TO PLAY</div>' +
      '<div class="briefsub">CAPITAL SHIPS TURN SLOWLY · FACING IS EVERYTHING</div>' +
      '<div class="helpbody">' +
      '<h4>THE TURN</h4>Each turn has three phases. <b>MOVE</b> — give every ship a helm order, click a destination inside the cone, set its final facing, and press ENGAGE. All ships (yours and theirs) maneuver simultaneously along smooth inertial arcs. <b>FIRE</b> — select a ship, arm a weapon, click a target, then OPEN FIRE. <b>RESOLVE</b> — read the log, END TURN.' +
      '<h4>CAMERA</h4><b>Mouse wheel</b> zooms to the cursor · <b>shift-drag</b> or <b>middle-drag</b> pans · <b>WASD / arrows</b> pan · <b>C</b> re-fits the whole battle on screen.' +
      '<h4>GUNNERY — DICE POOLS</h4>Every gun throws a pool of D6 — a light escort flicks 3 dice, a capital broadside hurls 12. Each die <b>hits on its to-hit number</b> (lances 3+, batteries 4+), and each hit deals its damage. Orders, criticals, evasion and nebulae shift the to-hit number; the log shows every die rolled.' +
      '<h4>FACING & SHIELDS</h4>Ships have separate <b>fore / side / aft</b> shields, and each shield point soaks one hit from a volley — but <b>the stern has no protection</b>: aft hits bypass shields entirely and critical-hit on 5+ instead of 6. Shields recharge only on turns a ship wasn\'t hit.' +
      '<h4>TORPEDOES & ATTACK CRAFT</h4><b>Torpedoes</b> run straight each movement phase and strike whatever crosses their path — friend or foe — D6 hull per fish, shields bypassed. <b>Bombers</b> (from carriers) home on their mark each turn and bomb through shields; flak turrets thin both. <b>Fighters</b> fly cover over a friendly ship and intercept incoming torpedoes and bomber waves. Bays and tubes take 2 turns to rearm.' +
      '<h4>BOARDING & PRIZES</h4>Ships killed by gunfire sometimes <b>break into drifting hulks</b> instead of exploding. Close to within 150 and use <b>BOARDING ACTION</b>: raid a live enemy (hit-and-run criticals) or board a hulk to <b>capture it as a prize</b> — after victory, salvage prizes for requisition or commission them into your fleet. Beware: <b>the Dominion boards back</b> — enemy ships alongside will raid your decks, and their scuttling parties will try to blow up prizes you\'ve taken.' +
      '<h4>MORALE</h4>The Dominion fights to win, not to die. Kill the flagship and <b>the whole line breaks and runs</b>; batter their fleet below strength and ships start disengaging one by one (crippled ships may bolt on their own). A routing ship stops firing and runs for the map edge — the battle is <b>won the moment no willing combatant remains</b>, but escapees pay no bounty and leave no salvage. Chase or let them go.' +
      '<h4>CRITICAL HITS</h4>Every damaging volley rolls a die (massed volleys of 4+ hits crit one easier): <b>WEAPONS</b> · <b>ENGINES</b> · <b>SHIELD EMITTER</b> · <b>BRIDGE</b> · <b>FIRE</b> (burns until contained) · <b>HULL BREACH</b>. Damage crews attempt repairs each turn.' +
      '<h4>VETERANCY</h4>Named ships earn XP for kills, boarding actions and surviving missions: <b>SEASONED</b> ' + DATA.RANKS[1].desc + ' · <b>VETERAN</b> ' + DATA.RANKS[2].desc + ' · <b>ELITE</b> ' + DATA.RANKS[3].desc + '. Ships lost in battle are gone for good — with all their experience.' +
      '<h4>HELM ORDERS</h4><b>ALL AHEAD FULL</b> covers ground but barely turns. <b>COME ABOUT</b> swings you around a short arc. <b>EVASIVE</b> makes you +1 to hit and dodges torpedoes. <b>HOLD & LOCK</b> steadies your guns to −1. <b>BRACE FOR IMPACT</b> halves incoming damage but seals tubes and bays.' +
      '<h4>TERRAIN</h4>Asteroid shoals block line of fire and grind 1–3 hull off ships that pass through (torpedoes die in the rocks; bombers fly over). Nebulae hide ships inside (+1 to be hit).' +
      '<h4>KEYS</h4><b>1–4</b> select ship · <b>SPACE</b> engage / open fire / end turn · <b>B</b> broadsides at will (auto-assign every idle gun, then adjust) · <b>F</b> game speed 1×/2×/3× · <b>right-click / ESC</b> cancel · <b>M</b> mute · click any ship to inspect it.' +
      '</div>' +
      '<button class="menu-btn primary" id="mnCloseHelp">' + (inBattle ? 'RETURN TO BATTLE' : 'BACK') + '</button>'
    );
    document.getElementById('mnCloseHelp').addEventListener('click', () => {
      if (inBattle) UI.closeScreen(); else UI.showTitle();
    });
  }
};

window.UI = UI;
