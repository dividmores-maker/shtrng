var firebaseConfig = {
  apiKey: "AIzaSyCHpkIlf8A13cL6TLggr7-3u8FM-PxzfSY",
  authDomain: "activitiescommittee-5b22c.firebaseapp.com",
  projectId: "activitiescommittee-5b22c",
  storageBucket: "activitiescommittee-5b22c.firebasestorage.app",
  messagingSenderId: "378991885059",
  appId: "1:378991885059:web:d8db039a6fc569fffb8736"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var tournamentDoc = db.collection('tournaments').doc('chess-main');

var AUTH = { user: 'admin', pass: '1234' };
var state = {
  players: [],
  groups: {},
  standings: {},
  matches: {},
  knockout: {}
};

var isLoadingFromFirebase = false;

function loadFromFirestore() {
  isLoadingFromFirebase = true;
  tournamentDoc.get().then(function(doc) {
    if (doc.exists) {
      var data = doc.data();
      state.players = data.players || [];
      state.groups = data.groups || {};
      state.standings = data.standings || {};
      state.matches = data.matches || {};
      state.knockout = data.knockout || {};
    }
    isLoadingFromFirebase = false;
    renderPlayersList();
  }).catch(function(error) {
    console.error('Error loading:', error);
    isLoadingFromFirebase = false;
  });
}

function saveToFirestore() {
  if (isLoadingFromFirebase) return;
  tournamentDoc.set({
    players: state.players,
    groups: state.groups,
    standings: state.standings,
    matches: state.matches,
    knockout: state.knockout,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function(error) {
    console.error('Error saving:', error);
  });
}

tournamentDoc.onSnapshot(function(doc) {
  if (!isLoadingFromFirebase && doc.exists) {
    var data = doc.data();
    state.players = data.players || [];
    state.groups = data.groups || {};
    state.standings = data.standings || {};
    state.matches = data.matches || {};
    state.knockout = data.knockout || {};

    if (document.getElementById('players-list')) renderPlayersList();
    if (document.getElementById('org-groups')) renderGroupsOrg();
    if (document.getElementById('org-brackets')) renderBracketsOrg();
    if (document.getElementById('audience-groups')) renderAudience();
  }
});

function saveAll() {
  saveToFirestore();
}

function show(id) {
  var pages = document.querySelectorAll('[id^="page-"]');
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.add('hidden');
  }
  document.getElementById(id).classList.remove('hidden');
}

function goHome() {
  show('page-main');
}

function enterOrganizer() {
  show('page-login');
}

function enterAudience() {
  show('page-audience');
  renderAudience();
}

function doLogin() {
  var u = document.getElementById('login-user').value.trim();
  var p = document.getElementById('login-pass').value.trim();
  if (u === AUTH.user && p === AUTH.pass) {
    show('page-org');
    renderOrganizer();
  } else {
    alert('بيانات الدخول غلط');
  }
}

function addPlayer() {
  var v = document.getElementById('player-input').value.trim();
  if (!v) return;
  if (state.players.indexOf(v) !== -1) {
    alert('اللاعب موجود');
    return;
  }
  state.players.push(v);
  document.getElementById('player-input').value = '';
  saveAll();
  renderPlayersList();
}

function renderPlayersList() {
  var wrap = document.getElementById('players-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  
  for (var i = 0; i < state.players.length; i++) {
    var el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = '<span>♟ ' + state.players[i] + '</span> <button class="ghost" onclick="removePlayer(' + i + ')">حذف</button>';
    wrap.appendChild(el);
  }
}

function removePlayer(i) {
  state.players.splice(i, 1);
  saveAll();
  renderPlayersList();
}

function getGroupCount() {
  return Object.keys(state.groups).length;
}

function runGroupsDraw() {
  if (state.players.length < 4) {
    alert('سجل 4 لاعبين على الأقل');
    return;
  }
  
  var shuffled = state.players.slice().sort(function() {
    return Math.random() - 0.5;
  });
  
  state.groups = {};
  var groupIndex = 0;
  for (var i = 0; i < shuffled.length; i += 4) {
    state.groups[groupIndex] = shuffled.slice(i, i + 4);
    groupIndex++;
  }
  
  state.standings = {};
  var groupKeys = Object.keys(state.groups);
  for (var gi = 0; gi < groupKeys.length; gi++) {
    var gKey = groupKeys[gi];
    var g = state.groups[gKey];
    state.standings[gKey] = [];
    for (var pi = 0; pi < g.length; pi++) {
      state.standings[gKey].push({
        name: g[pi],
        played: 0,
        win: 0,
        draw: 0,
        lose: 0,
        pts: 0
      });
    }
  }
  
  state.matches = {};
  for (var gi = 0; gi < groupKeys.length; gi++) {
    var gKey = groupKeys[gi];
    var g = state.groups[gKey];
    var pairs = [];
    for (var i = 0; i < g.length; i++) {
      for (var j = i + 1; j < g.length; j++) {
        pairs.push({
          white: g[i],
          black: g[j],
          result: null,
          played: false
        });
      }
    }
    state.matches[gKey] = pairs;
  }
  
  state.knockout = {};
  saveAll();
  renderGroupsOrg();
  renderAudience();
  alert('تم عمل القرعة وإنشاء جدول المباريات');
}

function sortGroup(arr) {
  return arr.slice().sort(function(A, B) {
    if (B.pts !== A.pts) return B.pts - A.pts;
    if (B.win !== A.win) return B.win - A.win;
    return A.name.localeCompare(B.name, 'ar');
  });
}

function rebuildStandings() {
  state.standings = {};
  var groupKeys = Object.keys(state.groups);
  
  for (var gi = 0; gi < groupKeys.length; gi++) {
    var gKey = groupKeys[gi];
    var g = state.groups[gKey];
    state.standings[gKey] = [];
    for (var pi = 0; pi < g.length; pi++) {
      state.standings[gKey].push({
        name: g[pi],
        played: 0,
        win: 0,
        draw: 0,
        lose: 0,
        pts: 0
      });
    }
  }
  
  var matchKeys = Object.keys(state.matches);
  for (var gi = 0; gi < matchKeys.length; gi++) {
    var gKey = matchKeys[gi];
    var groupMatches = state.matches[gKey];
    
    for (var mi = 0; mi < groupMatches.length; mi++) {
      var m = groupMatches[mi];
      if (m.played && m.result !== null) {
        var standing = state.standings[gKey];
        var W = null;
        var B = null;
        
        for (var si = 0; si < standing.length; si++) {
          if (standing[si].name === m.white) W = standing[si];
          if (standing[si].name === m.black) B = standing[si];
        }
        
        if (!W || !B) continue;
        
        W.played++;
        B.played++;
        
        if (m.result === 1) {
          W.win++;
          B.lose++;
          W.pts += 1;
        } else if (m.result === 0) {
          B.win++;
          W.lose++;
          B.pts += 1;
        } else {
          W.draw++;
          B.draw++;
          W.pts += 0.5;
          B.pts += 0.5;
        }
      }
    }
  }
  
  saveAll();
}

function renderGroupsOrg() {
  var host = document.getElementById('org-groups');
  if (!host) return;
  host.innerHTML = '';
  
  if (getGroupCount() === 0) {
    host.innerHTML = '<div class="muted">لا توجد مجموعات بعد — قم بالقرعة</div>';
    return;
  }
  
  var groupKeys = Object.keys(state.groups).sort(function(a, b) {
    return a - b;
  });
  
  for (var gi = 0; gi < groupKeys.length; gi++) {
    var gKey = groupKeys[gi];
    var sorted = sortGroup(state.standings[gKey] || []);
    
    var c = document.createElement('div');
    c.className = 'card';
    
    var html = '<h3>المجموعة ' + (parseInt(gKey) + 1) + '</h3>';
    html += '<div class="table"><table><thead><tr>';
    html += '<th>اللاعب</th><th>لعب</th><th>فوز</th><th>تعادل</th><th>خسارة</th><th>نقاط</th>';
    html += '</tr></thead><tbody>';
    
    for (var si = 0; si < sorted.length; si++) {
      var t = sorted[si];
      var rowClass = si === 0 ? 'rank-1' : si === 1 ? 'rank-2' : si === 2 ? 'rank-3' : '';
      html += '<tr class="' + rowClass + '">';
      html += '<td>' + t.name + '</td>';
      html += '<td>' + t.played + '</td>';
      html += '<td>' + t.win + '</td>';
      html += '<td>' + t.draw + '</td>';
      html += '<td>' + t.lose + '</td>';
      html += '<td><b>' + t.pts + '</b></td>';
      html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    html += '<div style="margin-top:10px"><h4>جدول المباريات</h4>';
    
    var matches = state.matches[gKey] || [];
    if (matches.length === 0) {
      html += '<div class="muted" style="font-size:14px">لا توجد مباريات</div>';
    }
    
    for (var mi = 0; mi < matches.length; mi++) {
      var m = matches[mi];
      html += '<div class="pair" id="m-' + gKey + '-' + mi + '">';
      html += '<span>⚪ ' + m.white + '</span>';
      html += '<span class="vs">VS</span>';
      html += '<span>⚫ ' + m.black + '</span>';
      html += '<select id="m-' + gKey + '-' + mi + '-result" style="width:150px">';
      html += '<option value="">اختر النتيجة</option>';
      html += '<option value="1"' + (m.result === 1 ? ' selected' : '') + '>فوز الأبيض</option>';
      html += '<option value="0.5"' + (m.result === 0.5 ? ' selected' : '') + '>تعادل</option>';
      html += '<option value="0"' + (m.result === 0 ? ' selected' : '') + '>فوز الأسود</option>';
      html += '</select>';
      html += '<button onclick="saveMatchResult(\'' + gKey + '\',' + mi + ')">' + (m.played ? 'تحديث' : 'حفظ') + '</button>';
      html += '<button class="ghost" onclick="clearMatchResult(\'' + gKey + '\',' + mi + ')">مسح نتيجة</button>';
      html += '</div>';
    }
    
    html += '</div>';
    c.innerHTML = html;
    host.appendChild(c);
  }
}

function saveMatchResult(gi, mi) {
  var m = state.matches[gi][mi];
  var resultValue = document.getElementById('m-' + gi + '-' + mi + '-result').value;
  
  if (resultValue === '') {
    alert('اختر النتيجة أولاً');
    return;
  }
  
  m.result = parseFloat(resultValue);
  m.played = true;
  
  rebuildStandings();
  renderGroupsOrg();
  renderAudience();
  saveAll();
}

function clearMatchResult(gi, mi) {
  if (!confirm('هل أنت متأكد من مسح نتيجة هذه المباراة؟')) return;
  
  var m = state.matches[gi][mi];
  m.result = null;
  m.played = false;
  
  rebuildStandings();
  renderGroupsOrg();
  renderAudience();
  saveAll();
}

function topTwoFromGroupIndex(gi) {
  var sorted = sortGroup(state.standings[gi] || []).slice(0, 2);
  var result = [];
  for (var i = 0; i < sorted.length; i++) {
    result.push(sorted[i].name);
  }
  return result;
}

function createKnockoutFromGroups() {
  if (getGroupCount() === 0) {
    alert('لا توجد مجموعات');
    return;
  }
  
  var qualified = [];
  var groupKeys = Object.keys(state.groups);
  for (var i = 0; i < groupKeys.length; i++) {
    var top = topTwoFromGroupIndex(groupKeys[i]);
    qualified = qualified.concat(top);
  }
  
  if (qualified.length < 2) {
    alert('المتأهلون أقل من اللازم');
    return;
  }
  
  var shuffled = qualified.sort(function() {
    return Math.random() - 0.5;
  });
  var pairs = [];
  
  // حل المشكلة: التعامل مع الأعداد الفردية
  for (var i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      pairs.push({
        white: shuffled[i],
        black: shuffled[i + 1],
        result: null,
        winner: null
      });
    } else {
      // لو اللاعب الأخير لوحده (عدد فردي)، يتأهل تلقائياً للدور التالي
      pairs.push({
        white: shuffled[i],
        black: '(تأهل مباشر)',
        result: 1,
        winner: shuffled[i],
        autoAdvance: true
      });
    }
  }
  
  state.knockout.R2 = pairs;
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert('تم إنشاء الدور الثاني من المتأهلين');
}

function advanceKnockout(fromKey, toKey) {
  var from = state.knockout[fromKey];
  if (!from || from.length === 0) {
    alert('لا توجد مباريات في هذا الدور');
    return;
  }
  
  var winners = [];
  for (var i = 0; i < from.length; i++) {
    if (from[i].winner) {
      winners.push(from[i].winner);
    }
  }
  
  if (winners.length !== from.length) {
    alert('سجّل نتائج كل مباريات هذا الدور أولاً');
    return;
  }
  
  var shuffled = winners.sort(function() {
    return Math.random() - 0.5;
  });
  var next = [];
  
  // حل المشكلة: التعامل مع الأعداد الفردية
  for (var i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      // لو في خصم، اعمل مباراة عادية
      next.push({
        white: shuffled[i],
        black: shuffled[i + 1],
        result: null,
        winner: null
      });
    } else {
      // لو اللاعب الأخير لوحده (عدد فردي)، يتأهل تلقائياً للدور التالي
      next.push({
        white: shuffled[i],
        black: '(تأهل مباشر)',
        result: 1,
        winner: shuffled[i],
        autoAdvance: true
      });
    }
  }
  
  state.knockout[toKey] = next;
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert('تم إنشاء الدور التالي');
}

function advanceFinals() {
  var sf = state.knockout.SF;
  if (!sf || sf.length === 0) {
    alert('لا يوجد نصف نهائي');
    return;
  }
  
  // لازم يكون عندنا بالظبط 2 مباريات في نصف النهائي
  if (sf.length !== 2) {
    alert('نصف النهائي لازم يكون فيه مباراتين بالظبط');
    return;
  }
  
  for (var i = 0; i < sf.length; i++) {
    if (!sf[i].winner) {
      alert('سجل نتائج نصف النهائي أولاً');
      return;
    }
  }
  
  var winners = [];
  var losers = [];
  for (var i = 0; i < sf.length; i++) {
    winners.push(sf[i].winner);
    // نحدد الخاسر: اللي مش فائز
    if (sf[i].winner === sf[i].white) {
      losers.push(sf[i].black);
    } else {
      losers.push(sf[i].white);
    }
  }
  
  state.knockout.F = [{
    white: winners[0],
    black: winners[1],
    result: null,
    winner: null
  }];
  
  state.knockout.P3 = [{
    white: losers[0],
    black: losers[1],
    result: null,
    winner: null
  }];
  
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert('تم إنشاء النهائي ومباراة المركز الثالث');
}

function renderBracketsOrg() {
  var host = document.getElementById('org-brackets');
  if (!host) return;
  host.innerHTML = '';
  
  var order = [
    ['R2', 'الدور الثاني'],
    ['R3', 'الدور الثالث'],
    ['SF', 'نصف النهائي'],
    ['F', 'النهائي'],
    ['P3', 'مركز ثالث']
  ];
  
  for (var oi = 0; oi < order.length; oi++) {
    var k = order[oi][0];
    var label = order[oi][1];
    var list = state.knockout[k] || [];
    
    var card = document.createElement('div');
    card.className = 'card';
    
    var html = '<h4>' + label + '</h4>';
    if (list.length === 0) {
      html += '<div class="muted" style="font-size:14px">لا يوجد</div>';
    }
    
    for (var idx = 0; idx < list.length; idx++) {
      var p = list[idx];
      html += '<div class="pair">';
      html += '<span>⚪ ' + p.white + '</span>';
      html += '<span class="vs">VS</span>';
      html += '<span>⚫ ' + p.black + '</span>';
      
      // لو تأهل مباشر، عرضه بدون select
      if (p.autoAdvance) {
        html += '<span class="ok" style="font-weight:bold">✓ تأهل مباشر</span>';
      } else {
        html += '<select id="' + k + '-result-' + idx + '" style="width:150px">';
        html += '<option value="">اختر النتيجة</option>';
        html += '<option value="1"' + (p.result === 1 ? ' selected' : '') + '>فوز الأبيض</option>';
        html += '<option value="0"' + (p.result === 0 ? ' selected' : '') + '>فوز الأسود</option>';
        html += '</select>';
        html += '<button onclick="saveBracketResult(\'' + k + '\',' + idx + ')">حفظ</button>';
      }
      
      if (p.winner) {
        html += '<span class="ok">الفائز: ' + p.winner + '</span>';
      }
      html += '</div>';
    }
    
    card.innerHTML = html;
    host.appendChild(card);
  }
}

function saveBracketResult(stage, idx) {
  var list = state.knockout[stage];
  if (!list) return;
  
  var p = list[idx];
  
  // لو تأهل مباشر، متعملش حاجة
  if (p.autoAdvance) {
    alert('هذا اللاعب متأهل مباشرة');
    return;
  }
  
  var resultValue = document.getElementById(stage + '-result-' + idx).value;
  
  if (resultValue === '') {
    alert('اختر النتيجة أولاً');
    return;
  }
  
  var result = parseFloat(resultValue);
  p.result = result;
  
  if (result === 1) {
    p.winner = p.white;
    p.loser = p.black;
  } else if (result === 0) {
    p.winner = p.black;
    p.loser = p.white;
  }
  
  saveAll();
  renderBracketsOrg();
  renderAudience();
}

function renderAudience() {
  var gHost = document.getElementById('audience-groups');
  if (!gHost) return;
  gHost.innerHTML = '';
  
  var groupKeys = Object.keys(state.groups).sort(function(a, b) {
    return a - b;
  });
  
  for (var gi = 0; gi < groupKeys.length; gi++) {
    var gKey = groupKeys[gi];
    var sorted = sortGroup(state.standings[gKey] || []);
    var card = document.createElement('div');
    card.className = 'card';
    
    var html = '<h3>المجموعة ' + (parseInt(gKey) + 1) + '</h3>';
    html += '<div class="table"><table><thead><tr>';
    html += '<th>اللاعب</th><th>لعب</th><th>فوز</th><th>تعادل</th><th>خسارة</th><th>نقاط</th>';
    html += '</tr></thead><tbody>';
    
    for (var si = 0; si < sorted.length; si++) {
      var t = sorted[si];
      var rowClass = si === 0 ? 'rank-1' : si === 1 ? 'rank-2' : si === 2 ? 'rank-3' : '';
      html += '<tr class="' + rowClass + '">';
      html += '<td>' + t.name + '</td>';
      html += '<td>' + t.played + '</td>';
      html += '<td>' + t.win + '</td>';
      html += '<td>' + t.draw + '</td>';
      html += '<td>' + t.lose + '</td>';
      html += '<td><b>' + t.pts + '</b></td>';
      html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    html += '<details><summary>عرض جدول المباريات</summary>';
    
    var matches = state.matches[gKey] || [];
    for (var mi = 0; mi < matches.length; mi++) {
      var m = matches[mi];
      var resultText = 'لم تُسجَّل';
      var resultClass = '';
      
      if (m.played) {
        if (m.result === 1) {
          resultText = 'فوز ⚪';
          resultClass = 'result-win';
        } else if (m.result === 0) {
          resultText = 'فوز ⚫';
          resultClass = 'result-loss';
        } else {
          resultText = 'تعادل';
          resultClass = 'result-draw';
        }
      }
      
      html += '<div class="pair">';
      html += '<span>⚪ ' + m.white + '</span>';
      html += '<span class="vs">VS</span>';
      html += '<span>⚫ ' + m.black + '</span>';
      html += '<span class="' + resultClass + '">' + resultText + '</span>';
      html += '</div>';
    }
    
    html += '</details>';
    card.innerHTML = html;
    gHost.appendChild(card);
  }
  
  var bHost = document.getElementById('audience-brackets');
  if (!bHost) return;
  bHost.innerHTML = '';
  
  var order = [
    ['R2', 'الدور الثاني'],
    ['R3', 'الدور الثالث'],
    ['SF', 'نصف النهائي'],
    ['F', 'النهائي'],
    ['P3', 'مركز ثالث']
  ];
  
  for (var oi = 0; oi < order.length; oi++) {
    var k = order[oi][0];
    var label = order[oi][1];
    var list = state.knockout[k];
    if (!list || list.length === 0) continue;
    
    var card = document.createElement('div');
    card.className = 'card';
    var html = '<h3>' + label + '</h3>';
    
    for (var pi = 0; pi < list.length; pi++) {
      var p = list[pi];
      html += '<div class="pair">';
      html += '<span>⚪ ' + p.white + '</span>';
      html += '<span class="vs">VS</span>';
      html += '<span>⚫ ' + p.black + '</span>';
      
      if (p.winner) {
        html += '<span class="ok">(فائز: ' + p.winner + ')</span>';
      } else {
        html += '<span class="muted" style="font-size:14px">(لم تُسجَّل)</span>';
      }
      
      html += '</div>';
    }
    
    card.innerHTML = html;
    bHost.appendChild(card);
  }
}

function renderOrganizer() {
  renderPlayersList();
  renderGroupsOrg();
  renderBracketsOrg();
}

function resetAll() {
  if (!confirm('مسح كل البيانات؟')) return;
  
  state.players = [];
  state.groups = {};
  state.standings = {};
  state.matches = {};
  state.knockout = {};
  
  saveAll();
  renderOrganizer();
  renderAudience();
  alert('تم المسح');
}

loadFromFirestore();