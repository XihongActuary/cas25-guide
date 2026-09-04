/* ============================================================
   gate.js · 实战篇密码门（礼貌性门槛）
   ------------------------------------------------------------
   · 作用对象：ch13–ch20（实战篇完整版章节）
   · 口令发布位置：知识星球「西红精算」置顶帖
   · 解锁后写入 localStorage，本机一次输入、长期有效，
     不打扰后续阅读（免费章节完全不受影响）。
   · 诚实声明：纯前端密码只能挡住"随手翻看"，挡不住懂
     开发者工具的人。2026-09-05 起线上站部署完整版
     （含正文与本文件），口令是软性门槛，定位是"礼貌
     性会员标识"而非硬防线。
   · 修改口令：改下面的 PASS_HASH（djb2 算法，可用
     Python 计算：h=5381; [h:=h*33+ord(c) for c in 口令]，
     取 32 位无符号结果），并同步更新星球置顶帖与
     premium.html 内嵌校验（两处 PASS_HASH 必须一致）。
   ============================================================ */
(function () {
  'use strict';

  /* 口令散列（当前口令：XHJS25 —— 更换口令后需重新计算散列） */
  var PASS_HASH = 3664108585;
  var STORE_KEY = 'cas25_vip_unlocked';

  function djb2(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = (h * 33 + str.charCodeAt(i)) >>> 0;
    }
    return h >>> 0;
  }

  function unlocked() {
    try { return localStorage.getItem(STORE_KEY) === '1'; }
    catch (e) { return false; }
  }

  function buildGate() {
    var pageHeader = document.querySelector('.page-header h1');
    var chapterTitle = pageHeader ? pageHeader.textContent.trim() : '本章内容';

    var gate = document.createElement('div');
    gate.className = 'gate-panel';
    gate.innerHTML =
      '<div class="gate-card">' +
        '<div class="gate-lock">🔒</div>' +
        '<h2>实战篇 · 会员章节</h2>' +
        '<p class="gate-ch"><strong>' + chapterTitle + '</strong> 属于「实战篇 · 懂特例」完整版内容。</p>' +
        '<ul class="gate-points">' +
          '<li>8 章特例全景：VFA · 间接分红 · 亏损 · PAA · 再保 · 列报 · 披露 · 衔接</li>' +
          '<li>官方例题分步演算 + 本站专属演算例（例A–例H）+ 章末自测判分</li>' +
          '<li>与免费章节同样的六段式结构，解锁后阅读体验完全一致</li>' +
        '</ul>' +
        '<div class="gate-input-row">' +
          '<input type="password" id="gate-pass" class="gate-input" placeholder="输入星球公布的阅读口令" autocomplete="off">' +
          '<button id="gate-btn" class="gate-btn">解锁本章</button>' +
        '</div>' +
        '<p class="gate-hint">口令在知识星球置顶帖公布 · 解锁一次，本机长期有效</p>' +
        '<div class="gate-links">' +
          '<a href="premium.html" class="gate-cta">如何获得口令 →</a>' +
          '<a href="ch12.html">← 回免费章节继续读</a>' +
        '</div>' +
      '</div>';

    var container = document.querySelector('.container');
    if (container) container.insertBefore(gate, container.firstChild);

    var input = gate.querySelector('#gate-pass');
    var btn = gate.querySelector('#gate-btn');

    function tryUnlock() {
      var v = (input.value || '').trim();
      if (!v) { input.focus(); return; }
      if (djb2(v) === PASS_HASH) {
        try { localStorage.setItem(STORE_KEY, '1'); } catch (e) {}
        open();
      } else {
        input.classList.add('gate-shake');
        input.value = '';
        setTimeout(function () { input.classList.remove('gate-shake'); }, 400);
        input.focus();
      }
    }

    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') tryUnlock();
    });
  }

  function lock() {
    document.body.classList.add('gated');
    buildGate();
  }

  function open() {
    document.body.classList.remove('gated');
    var g = document.querySelector('.gate-panel');
    if (g) g.remove();
    var badge = document.createElement('div');
    badge.className = 'gate-unlocked-badge';
    badge.title = '完整版已解锁（口令记住在本机）';
    badge.textContent = '🔓 已解锁';
    document.body.appendChild(badge);
  }

  if (unlocked()) { open(); return; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (!unlocked()) lock(); else open();
    });
  } else {
    lock();
  }
})();
