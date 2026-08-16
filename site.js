/* h — свет в комнате идёт за настройкой системы.
   Тумблер перекидывает свет на время сеанса и ничего не запоминает.
   Как только система меняет тему, страница снова следует за ней. */

(function () {
  var root = document.documentElement;
  var box = document.querySelector('.theme__input');
  var dark = window.matchMedia('(prefers-color-scheme: dark)');

  if (!box) return;

  function system() {
    return dark.matches ? 'dark' : 'light';
  }

  function effective() {
    var t = root.dataset.theme;
    return (t === 'dark' || t === 'light') ? t : system();
  }

  function follow() {           /* вернуться к настройке системы */
    delete root.dataset.theme;
    root.style.colorScheme = '';
  }

  function sync() {
    box.checked = effective() === 'dark';
  }

  box.addEventListener('change', function () {
    var theme = box.checked ? 'dark' : 'light';
    if (theme === system()) {
      follow();                 /* совпало с системой — снимаем ручной выбор */
    } else {
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    }
  });

  function onSystemChange() {
    follow();
    sync();
  }

  if (dark.addEventListener) dark.addEventListener('change', onSystemChange);
  else dark.addListener(onSystemChange);

  sync();
})();


/* h — строка брони: комната, дата, время.
   Открыта всегда одна панель. Выбранное помечается охряной волосяной. */

(function () {
  var booking = document.querySelector('.booking');
  if (!booking) return;

  var MONTHS     = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня',
                    'июля','августа','сентября','октября','ноября','декабря'];

  var FIRST_HOUR = 12;   /* первый час */
  var LAST_HOUR  = 21;   /* последний час, он же 21:00 → 22:00 */

  var triggers = Array.prototype.slice.call(booking.querySelectorAll('.field__value'));

  /* ── панели ──────────────────────────────────────────────── */

  function panelOf(trigger) {
    return document.getElementById('panel-' + trigger.dataset.panel);
  }

  function close(trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    panelOf(trigger).classList.remove('is-open');
  }

  function closeAll(except) {
    triggers.forEach(function (t) { if (t !== except) close(t); });
  }

  function toggle(trigger) {
    var open = trigger.getAttribute('aria-expanded') === 'true';
    closeAll(trigger);
    if (open) { close(trigger); return; }

    var panel = panelOf(trigger);
    trigger.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');

    /* на телефоне панель раскрывается вниз и может уйти за нижний край —
       подтягиваем страницу ровно настолько, чтобы панель была видна.
       Прокрутка мгновенная: анимаций, кроме проявления, в системе нет. */
    var over = panel.getBoundingClientRect().bottom - window.innerHeight;
    if (over > 0) window.scrollBy(0, over + 16);
  }

  triggers.forEach(function (t) {
    t.addEventListener('click', function () { toggle(t); });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.field')) closeAll(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = triggers.filter(function (t) {
      return t.getAttribute('aria-expanded') === 'true';
    })[0];
    if (!open) return;
    close(open);
    open.focus();
  });

  function setValue(trigger, text) {
    trigger.textContent = text;
    close(trigger);
    trigger.focus();
  }

  function mark(list, chosen) {
    list.forEach(function (el) {
      if (el === chosen) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  }

  /* ── комната: список и двери на чертеже — одно и то же ────── */

  var hallTrigger = document.getElementById('v-hall');
  var halls = Array.prototype.slice.call(
    document.querySelectorAll('#panel-hall .opt')
  );
  var doors = Array.prototype.slice.call(
    document.querySelectorAll('.facade__door')
  );

  function byValue(list, key, value) {
    return list.filter(function (el) { return el.dataset[key] === value; })[0];
  }

  function chooseHall(value, fromPanel) {
    mark(halls, byValue(halls, 'value', value));

    doors.forEach(function (door) {
      var chosen = door.dataset.hall === value;
      door.classList.toggle('is-chosen', chosen);
      if (chosen) door.setAttribute('aria-current', 'true');
      else door.removeAttribute('aria-current');
    });

    hallTrigger.textContent = value;

    /* из списка возвращаем фокус на поле, с чертежа — оставляем на двери */
    if (fromPanel) {
      close(hallTrigger);
      hallTrigger.focus();
    }
  }

  halls.forEach(function (opt) {
    opt.addEventListener('click', function () {
      chooseHall(opt.dataset.value, true);
    });
  });

  doors.forEach(function (door) {
    door.addEventListener('click', function () {
      chooseHall(door.dataset.hall, false);
      closeAll(null);
    });
  });

  /* ── время ───────────────────────────────────────────────── */

  var timeTrigger = document.getElementById('v-time');
  var timePanel = document.getElementById('panel-time');
  var slots = [];

  for (var h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    var slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'opt';
    slot.textContent = h + ':00 → ' + (h + 1) + ':00';
    timePanel.appendChild(slot);
    slots.push(slot);
  }

  slots.forEach(function (slot) {
    slot.addEventListener('click', function () {
      mark(slots, slot);
      setValue(timeTrigger, slot.textContent);
    });
  });

  /* ── дата ────────────────────────────────────────────────── */

  var dateTrigger = document.getElementById('v-date');
  var monthLabel = document.querySelector('#panel-date .cal__month');
  var grid = document.querySelector('#panel-date .cal__grid');
  var navs = Array.prototype.slice.call(document.querySelectorAll('#panel-date .cal__nav'));

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var chosen = null;

  function sameDay(a, b) {
    return a && b && a.getTime() === b.getTime();
  }

  function render() {
    monthLabel.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
    grid.textContent = '';

    var first = new Date(view.getFullYear(), view.getMonth(), 1);
    var shift = (first.getDay() + 6) % 7;              /* неделя с понедельника */
    var total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

    for (var i = 0; i < shift; i++) {
      grid.appendChild(document.createElement('span'));
    }

    for (var d = 1; d <= total; d++) {
      (function (day) {
        var date = new Date(view.getFullYear(), view.getMonth(), day);
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cal__day';
        cell.textContent = day;
        cell.setAttribute('aria-label',
          day + ' ' + MONTHS_GEN[view.getMonth()] + ' ' + view.getFullYear());

        if (date < today) {
          cell.disabled = true;                        /* прошедшее не выбирается */
        } else {
          cell.addEventListener('click', function () {
            chosen = date;
            render();
            setValue(dateTrigger,
              day + ' ' + MONTHS_GEN[date.getMonth()] + ' ' + date.getFullYear());
          });
        }

        if (sameDay(date, chosen)) cell.setAttribute('aria-current', 'true');
        grid.appendChild(cell);
      })(d);
    }

    /* назад дальше текущего месяца не уходим */
    navs[0].disabled = view.getFullYear() === today.getFullYear()
                    && view.getMonth() === today.getMonth();
  }

  navs.forEach(function (nav) {
    nav.addEventListener('click', function () {
      view = new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.step), 1);
      render();
    });
  });

  render();
})();
