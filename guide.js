/* ========== cas25-guide 学习仪表盘 ==========
 * 纯前端 localStorage 实现，无任何服务器依赖
 * 数据结构：{ chapters: { ch01: { read: 1|0, quiz: {score, total, wrong: [题号]} } } }
 */
(function () {
  'use strict';
  var KEY = 'cas25-guide-progress-v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { chapters: {} }; }
    catch (e) { return { chapters: {} }; }
  }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
  function getChapter(data, ch) {
    if (!data.chapters[ch]) data.chapters[ch] = { read: 0, quiz: null };
    return data.chapters[ch];
  }

  /* ---------- 已读按钮 ---------- */
  function initReadToggle() {
    var btn = document.querySelector('.read-toggle');
    if (!btn) return;
    var ch = btn.getAttribute('data-ch');
    var data = load();
    var rec = getChapter(data, ch);
    function render() {
      if (rec.read) { btn.classList.add('done'); btn.textContent = '✓ 已读完本章'; }
      else { btn.classList.remove('done'); btn.textContent = '○ 标记本章已读'; }
    }
    render();
    btn.addEventListener('click', function () {
      rec.read = rec.read ? 0 : 1;
      save(data);
      render();
    });
  }

  /* ---------- 自测题 ---------- */
  function initQuiz() {
    var blocks = document.querySelectorAll('.quiz-section');
    if (!blocks.length) return;
    var ch = blocks[0].getAttribute('data-ch');
    var data = load();

    blocks.forEach(function (block) {
      var qs = block.querySelectorAll('.quiz-block');
      var answered = {};

      qs.forEach(function (q, qi) {
        var opts = q.querySelectorAll('.quiz-opt');
        var correct = parseInt(q.getAttribute('data-answer'), 10);
        var explain = q.querySelector('.quiz-explain');

        opts.forEach(function (opt, oi) {
          opt.addEventListener('click', function () {
            if (answered[qi]) return;
            answered[qi] = true;
            opts.forEach(function (o) { o.classList.add('locked'); });
            opt.classList.add('selected');
            var isRight = (oi === correct);
            opts[correct].classList.add('correct');
            if (!isRight) opt.classList.add('wrong');
            if (explain) {
              explain.classList.add('show', isRight ? 'ok' : 'no');
            }
            updateScore();
          });
        });
      });

      function updateScore() {
        var total = qs.length;
        var right = 0, wrong = [];
        qs.forEach(function (q, qi) {
          var sel = q.querySelector('.quiz-opt.selected');
          var ans = parseInt(q.getAttribute('data-answer'), 10);
          if (sel) {
            var opts = q.querySelectorAll('.quiz-opt');
            var si = Array.prototype.indexOf.call(opts, sel);
            if (si === ans) right++;
            else wrong.push(qi + 1);
          } else {
            wrong.push(qi + 1);
          }
        });
        var scoreBar = block.querySelector('.quiz-score');
        if (scoreBar) {
          scoreBar.querySelector('.score-text').textContent =
            '本章自测：' + right + ' / ' + total + ' 题正确' + (wrong.length ? '（错题：第 ' + wrong.join('、') + ' 题）' : '，全对！');
        }
        var rec = getChapter(data, ch);
        rec.quiz = { score: right, total: total, wrong: wrong };
        save(data);
      }

      /* 重做按钮 */
      var resetBtn = block.querySelector('.quiz-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          answered = {};
          qs.forEach(function (q) {
            q.querySelectorAll('.quiz-opt').forEach(function (o) {
              o.classList.remove('selected', 'correct', 'wrong', 'locked');
            });
            var ex = q.querySelector('.quiz-explain');
            if (ex) ex.classList.remove('show', 'ok', 'no');
          });
          var scoreBar = block.querySelector('.quiz-score');
          if (scoreBar) scoreBar.querySelector('.score-text').textContent = '点击选项作答，即时判分';
        });
      }
    });
  }

  /* ---------- 首页仪表盘 ---------- */
  function initDashboard() {
    var dash = document.getElementById('dashboard');
    if (!dash) return;
    var allChapters = document.querySelectorAll('.chapter-item[data-ch]');
    var data = load();

    var readCount = 0, quizDone = 0, totalScore = 0, totalQ = 0, wrongList = [];
    allChapters.forEach(function (item) {
      var ch = item.getAttribute('data-ch');
      var rec = data.chapters[ch];
      if (rec && rec.read) {
        readCount++;
        item.querySelector('.ch-state').textContent = '✓ 已读';
        item.querySelector('.ch-state').classList.add('done');
      }
      if (rec && rec.quiz) {
        quizDone++;
        totalScore += rec.quiz.score;
        totalQ += rec.quiz.total;
        (rec.quiz.wrong || []).forEach(function (w) {
          wrongList.push({ ch: ch, q: w, title: item.querySelector('.ch-title').textContent });
        });
      }
    });

    var total = allChapters.length || 1;
    var pct = Math.round(readCount / total * 100);
    document.getElementById('dash-fill').style.width = pct + '%';
    document.getElementById('dash-pct').textContent = pct + '%';
    document.getElementById('stat-read').textContent = readCount;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-quiz').textContent = quizDone;
    document.getElementById('stat-avg').textContent = quizDone ? Math.round(totalScore / quizDone * 10) / 10 : '—';

    var wrongBox = document.getElementById('dash-wrong');
    if (wrongBox) {
      if (wrongList.length) {
        var seen = {};
        var html = wrongList.filter(function (w) {
          var k = w.ch + '-' + w.q;
          if (seen[k]) return false;
          seen[k] = 1;
          return true;
        }).map(function (w) {
          return '<a href="' + w.ch + '.html">【' + w.ch.toUpperCase() + '】' + w.title + ' · 第' + w.q + '题</a>';
        }).join('　');
        wrongBox.innerHTML = '<strong>待攻克错题：</strong>' + html;
      } else {
        wrongBox.innerHTML = '<span style="color:var(--text-muted)">暂无错题记录，完成章节自测后自动汇总到这里。</span>';
      }
    }

    var resetBtn = document.getElementById('dash-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (confirm('确定清空全部学习进度记录？此操作不可恢复。')) {
          localStorage.removeItem(KEY);
          location.reload();
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initReadToggle();
    initQuiz();
    initDashboard();
  });
})();
