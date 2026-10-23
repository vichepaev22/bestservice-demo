(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./implementation-plan.js'));
  else factory(root.BestServicePlan).init(root);
})(typeof window === 'undefined' ? null : window, function (Plan) {
  'use strict';

  function text(value) { return typeof value === 'string' ? value : ''; }
  function lines(value) { return Array.isArray(value) ? value.map(text).filter(Boolean).join('\n') : text(value); }
  function minimumRating(values) {
    let minimum = null;
    (Array.isArray(values) ? values : []).forEach(function (value) {
      if (typeof value !== 'number' && !(typeof value === 'string' && value.trim())) return;
      const rating = Number(value);
      if (Number.isFinite(rating) && rating >= 1 && rating <= 5) minimum = minimum === null ? rating : Math.min(minimum, rating);
    });
    return minimum;
  }
  function rolesFrom(values) {
    const roles = [], seen = new Set();
    (values || []).forEach(function (value) {
      const role = text(value).trim().slice(0, 80);
      const key = role.toLocaleLowerCase('ru');
      if (role && !seen.has(key) && roles.length < 12) { roles.push(role); seen.add(key); }
    });
    if (!roles.length) throw new Error('Выберите хотя бы одну роль. Можно оставить только собственника.');
    return roles;
  }

  function makeDraft(source, roles) {
    if (!source || !Array.isArray(source.stages) || !source.stages.length) {
      throw new Error('Для схемы нужны этапы CJM. Сначала сформируйте отчёт с картой клиентского пути.');
    }
    return {
      project: text(source.project), reportDate: text(source.report_date), roles: rolesFrom(roles),
      recommendations: lines(source.recommendations),
      stages: source.stages.map(function (stage, index) {
        stage = stage || {};
        return { name: text(stage.name) || 'Этап ' + (index + 1),
          goal: text(stage.customer_goal), customer: lines(stage.actions), touchpoints: lines(stage.touchpoints),
          pains: lines(stage.pains), evidence: lines(stage.evidence), proposal: lines(stage.opportunities),
          confidence: { high: 'высокая', medium: 'средняя', low: 'низкая' }[stage.confidence] || 'не указана',
          frontstage: '', backstage: '', support: '', owner: '', deadline: '', check: '' };
      })
    };
  }

  function reconcileRoles(draft, roles) {
    draft.roles = rolesFrom(roles);
    draft.stages.forEach(function (stage) { if (!draft.roles.includes(stage.owner)) stage.owner = ''; });
    return draft;
  }

  const rows = [
    ['goal', 'Что важно клиенту', false, 'Из CJM'],
    ['customer', 'Что делает клиент', false, 'Из CJM'],
    ['touchpoints', 'Где встречается с сервисом', false, 'Из CJM'],
    ['pains', 'Проблемы на этапе', false, 'Выводы анализа отзывов'],
    ['evidence', 'Основание из отзывов', false, 'Цитаты из CJM; не независимая проверка'],
    ['proposal', 'Предлагаемое улучшение', true, 'Гипотеза из CJM. Уточните её перед внедрением'],
    ['frontstage', 'Что клиент увидит после изменения', true, 'Действия перед клиентом: заполните сами'],
    ['backstage', 'Что подготовить внутри бизнеса', true, 'За кулисами: заполните сами'],
    ['support', 'Что для этого понадобится', true, 'Ресурсы, системы, регламенты: заполните сами'],
    ['owner', 'Кто отвечает', true, 'Назначаете вы, а не модель'],
    ['deadline', 'К какому сроку', true, 'Выберите реалистичную дату'],
    ['check', 'Как проверить результат', true, 'Наблюдаемый критерий, не обещание выручки']
  ];
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function exportHtml(draft) {
    const e = escapeHtml;
    const header = '<tr><th scope="col">Слой сервиса</th>' + draft.stages.map(function (s) {
      return '<th scope="col">' + e(s.name) + '<small>Уверенность CJM: ' + e(s.confidence) + '</small></th>';
    }).join('') + '</tr>';
    const body = rows.map(function (row) {
      return '<tr><th scope="row">' + e(row[1]) + '<small>' + e(row[3]) + '</small></th>' + draft.stages.map(function (s) {
        return '<td>' + e(s[row[0]] || (row[2] ? 'Не заполнено' : 'Нет данных в CJM')) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Схема улучшения сервиса · ' + e(draft.project) + '</title><style>' +
      'body{font:16px/1.5 Georgia,serif;color:#122e4f;background:#f4f8ff;margin:32px}h1{line-height:1.15}' +
      'table{border-collapse:collapse;background:white;min-width:900px;width:100%}td,th{border:1px solid #c9daee;padding:14px;vertical-align:top;text-align:left;min-width:190px;white-space:pre-wrap;overflow-wrap:anywhere}' +
      'th{background:#e9f2ff}small{display:block;font-weight:normal;color:#365371}p{max-width:1000px}.scroll{overflow:auto}' +
      '@media print{@page{size:A3 landscape;margin:10mm}body{margin:0;background:white;font-size:10px}.scroll{overflow:visible}table{min-width:0;table-layout:fixed}td,th{min-width:0;padding:6px}thead{display:table-header-group}}</style>' +
      '<h1>Кто и что меняет в сервисе</h1><p><strong>Черновик будущего сервиса · ' + e(draft.project) + '</strong></p>' +
      '<p>Основа: сохранённый CJM. Дата исходного отчёта: ' + e(draft.reportDate || 'не указана') + '. ' +
      'Отзывы не подтверждают внутренние процессы. Выводы CJM и предложения требуют проверки; роли, сроки и внутренние действия заполняет собственник. Это не автоматически назначенные задачи.</p>' +
      '<p>Роли: ' + draft.roles.map(e).join(', ') + '</p><div class="scroll"><table><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<h2>Рекомендации исходного отчёта</h2><p style="white-space:pre-wrap">' + e(draft.recommendations || 'Нет данных') + '</p>' +
      '<p>Чтобы сохранить в PDF, откройте печать браузера. Проверяйте процессы с сотрудниками; финансовый эффект пока не измерен.</p></html>';
  }

  function mount(section, win) {
    const doc = win.document, sourceNode = section.querySelector('[data-blueprint-source]');
    const builder = section.querySelector('[data-blueprint-builder]');
    const status = section.querySelector('[data-blueprint-status]');
    let source, draft = null;
    function say(message, error) { status.textContent = message; status.classList.toggle('is-error', Boolean(error)); }
    try { source = JSON.parse(sourceNode.textContent); }
    catch (_) {
      section.querySelector('[data-blueprint-setup]').hidden = false;
      section.querySelector('[data-blueprint-build]').disabled = true;
      say('Не удалось прочитать CJM. Обновите страницу или сформируйте отчёт заново.', true);
      return;
    }
    const scene = section.querySelector('.blueprint-scene');
    if (scene) {
      const minimum = minimumRating(source.ratings);
      scene.dataset.ratingKnown = String(minimum !== null);
      scene.dataset.ratingMax = String(minimum === 5);
      scene.querySelector('[data-blueprint-min-rating]').textContent = minimum === null ? '—' : minimum.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      scene.style.setProperty('--bp-rating-start', minimum === null ? 0 : minimum / 5);
      scene.style.setProperty('--bp-rating-color', minimum === 5 ? '#6cddb1' : minimum !== null && minimum < 3 ? '#f69a83' : '#f4ce79');
      scene.querySelector('[data-blueprint-rating-source]').textContent = minimum === null
        ? 'В выборке нет оценок. Начальную оценку не подставляем.'
        : 'Старт — минимальная оценка в загруженных отзывах, не рейтинг всей карточки.';
      scene.querySelector('[data-motion-toggle]').hidden = false;
    }
    function element(tag, content) {
      const node = doc.createElement(tag);
      if (content !== undefined) node.textContent = content;
      return node;
    }
    const rolesBox = section.querySelector('[data-blueprint-roles]');
    const solo = section.querySelector('[data-blueprint-solo]'), start = section.querySelector('[data-blueprint-start]');
    const drafts = { team: null, solo: null };
    function currentRoles() {
      return Array.from(rolesBox.querySelectorAll('input:checked')).map(function (input) { return input.value; });
    }
    function fitEditors() {
      section.querySelectorAll('[data-blueprint-table] textarea').forEach(function (control) {
        control.style.height = 'auto'; control.style.height = Math.min(480, control.scrollHeight + 2) + 'px';
      });
    }
    win.addEventListener('resize', fitEditors);
    function warnings() {
      const issues = Plan.planIssues(draft), notice = section.querySelector('[data-blueprint-issues]');
      notice.textContent = issues.length ? 'Нужно уточнить: ' + issues.join(' ') : 'Все шаги имеют исполнителя и одного ответственного за результат. Проверьте предложенные действия и сроки перед внедрением.';
      notice.classList.toggle('is-error', issues.length > 0);
      if (draft.omitted) notice.textContent += ' В план вошли первые 20 улучшений; ещё ' + draft.omitted + ' остались в исходном отчёте.';
    }
    function editor(cell, task, key, label, type) {
      const control = element(type === 'date' ? 'input' : 'textarea');
      if (type === 'date') control.type = 'date';
      else { control.rows = key === 'action' ? 3 : 4; control.maxLength = 4000; }
      control.value = task[key]; control.setAttribute('aria-label', label);
      const printed = element('span', control.value || (key === 'deadline' ? 'День ' + task.day + ' от старта' : 'Не заполнено'));
      printed.className = 'blueprint-print-value';
      control.addEventListener('input', function () {
        task[key] = control.value; if (key === 'deadline') task.manualDate = true;
        if (control.tagName === 'TEXTAREA') { control.style.height = 'auto'; control.style.height = Math.min(480, control.scrollHeight + 2) + 'px'; }
        printed.textContent = control.value || (key === 'deadline' ? 'День ' + task.day + ' от старта' : 'Не заполнено'); warnings();
      });
      cell.append(control, printed);
    }
    function render() {
      const table = section.querySelector('[data-blueprint-table]');
      table.replaceChildren();
      const caption = element('caption', draft.solo ? 'Личный пошаговый план собственника' : 'RACI-матрица внедрения'); caption.className = 'cjm-sr-only'; table.append(caption);
      section.querySelector('[data-blueprint-title]').textContent = draft.solo ? 'Ваш пошаговый план' : 'План внедрения и RACI-матрица';
      section.querySelector('[data-blueprint-legend]').hidden = draft.solo;
      const head = element('thead'), headRow = element('tr');
      const headings = ['Шаг / действие', 'Как выполнить', 'Срок', 'После шага', ...(draft.solo ? [] : draft.roles), 'Как проверить'];
      headings.forEach(function (label, i) {
        const cell = element('th', label); cell.scope = 'col';
        if (i === 0) cell.className = 'cjm-row-heading';
        if (i === 2 || i === 3) cell.classList.add('blueprint-narrow');
        if (!draft.solo && i >= 4 && i < headings.length - 1) cell.classList.add('blueprint-role-cell');
        headRow.append(cell);
      });
      head.append(headRow); table.append(head);
      const body = element('tbody');
      draft.tasks.forEach(function (task, index) {
        const tr = element('tr'), heading = element('th'); heading.scope = 'row'; heading.className = 'cjm-row-heading';
        const label = 'Шаг ' + (index + 1);
        const badge = element('span', label + ' · ' + task.phase); badge.className = 'blueprint-step-badge'; heading.append(badge);
        editor(heading, task, 'action', label + ': действие');
        const evidence = element('details'), summary = element('summary', 'Основание из отчёта');
        evidence.className = 'blueprint-task-source'; evidence.append(summary,
          element('p', task.source.origin + ' · ' + (task.source.stages.join(', ') || 'Отчёт в целом')),
          element('p', 'Предложение: ' + task.source.action),
          element('p', 'Проблема: ' + (task.source.pains.join('; ') || 'Отдельная боль не указана')),
          element('p', 'Основание CJM: ' + (task.source.evidence.join('; ') || 'Цитаты не указаны')));
        heading.append(evidence); tr.append(heading);
        const how = element('td'); editor(how, task, 'how', label + ': как выполнить'); tr.append(how);
        const deadline = element('td'); deadline.className = 'blueprint-narrow';
        deadline.append(element('small', 'Ориентир: день ' + task.day + ' от старта'));
        editor(deadline, task, 'deadline', label + ': срок', 'date'); tr.append(deadline);
        const dependency = element('td', task.after ? 'После шага ' + (draft.tasks.findIndex(t => t.id === task.after) + 1) : 'Можно начать');
        dependency.className = 'blueprint-narrow'; tr.append(dependency);
        const roleEditors = [];
        if (!draft.solo) draft.roles.forEach(function (role) {
          const cell = element('td'); cell.className = 'blueprint-role-cell';
          const control = element('select'); control.setAttribute('aria-label', label + ': участие роли ' + role);
          ['', 'R', 'A', 'AR', 'C', 'I'].forEach(function (code) { const option = element('option', code ? (code === 'AR' ? 'A/R' : code) + ' · ' + Plan.legend[code] : 'Не участвует'); option.value = code; control.append(option); });
          const printed = element('span'); printed.className = 'blueprint-print-value';
          const item = { role, cell, control, printed }; roleEditors.push(item);
          function refreshRow() { roleEditors.forEach(function (v) { const code = Plan.participation(task, v.role); v.control.value = code; v.cell.dataset.participation = code; v.printed.textContent = code ? code + ' · ' + Plan.legend[code] : 'Не участвует'; }); }
          control.addEventListener('change', function () { Plan.setParticipation(task, role, control.value); refreshRow(); warnings(); });
          cell.append(control, printed); tr.append(cell); refreshRow();
        });
        const check = element('td'); editor(check, task, 'check', label + ': как проверить'); tr.append(check); body.append(tr);
      });
      table.append(body); warnings();
      win.requestAnimationFrame(function () {
        fitEditors();
        win.dispatchEvent(new win.Event('resize'));
      });
    }
    function applyRoles() {
      if (!draft) return;
      try {
        Plan.reconcilePlan(draft, currentRoles()); render();
        say('Роли обновлены, правки сохранены. Если роль удалена, назначьте её работу заново.');
      } catch (error) { say(error.message, true); }
    }
    rolesBox.addEventListener('change', applyRoles);
    function addRole() {
      const input = section.querySelector('[data-blueprint-custom]'), role = input.value.trim();
      if (!role) { say('Введите название роли, например «Старший тренер».', true); input.focus(); return; }
      const existing = Array.from(rolesBox.querySelectorAll('input'));
      const duplicate = existing.find(function (item) { return item.value.toLocaleLowerCase('ru') === role.toLocaleLowerCase('ru'); });
      if (duplicate) { duplicate.checked = true; input.value = ''; applyRoles(); say('Эта роль уже есть и теперь выбрана.'); return; }
      if (existing.length >= 12) { say('В первой схеме можно указать до 12 ролей. Объедините похожие роли.', true); return; }
      const label = element('label'), check = element('input'); check.type = 'checkbox'; check.value = role; check.checked = true;
      label.append(check, doc.createTextNode(role)); rolesBox.append(label); input.value = ''; applyRoles();
      say('Роль добавлена: ' + role + '.');
    }
    section.querySelector('[data-blueprint-add]').addEventListener('click', addRole);
    section.querySelector('[data-blueprint-custom]').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); addRole(); }
    });
    section.querySelector('[data-blueprint-build]').addEventListener('click', function () {
      try {
        const mode = solo.checked ? 'solo' : 'team';
        if (draft) Plan.reconcilePlan(draft, currentRoles());
        else draft = Plan.makePlan(source, currentRoles(), { solo: solo.checked, start: start.value });
        drafts[mode] = draft;
        section.querySelector('[data-blueprint-result]').hidden = false; render();
        const list = section.querySelector('[data-blueprint-recommendations]'); list.replaceChildren();
        (Array.isArray(source.recommendations) ? source.recommendations : ['Рекомендации не указаны']).forEach(function (item) { list.append(element('li', item)); });
        say('Черновик готов: ' + draft.goals.length + ' улучшений, ' + draft.tasks.length + ' шагов. ' + (draft.solo ? 'Все действия выполняете вы.' : 'Участие ролей предложено, проверьте его перед внедрением.'));
        section.querySelector('[data-blueprint-build]').textContent = 'Обновить роли, сохранив правки';
        section.querySelector('[data-blueprint-title]').focus();
      } catch (error) { say(error.message, true); }
    });
    solo.addEventListener('change', function () {
      section.querySelector('[data-blueprint-team-fields]').hidden = solo.checked;
      const hadDraft = Boolean(draft), mode = solo.checked ? 'solo' : 'team';
      draft = drafts[mode];
      section.querySelector('[data-blueprint-result]').hidden = !draft;
      try {
        if (draft) { Plan.reconcilePlan(draft, currentRoles()); render(); }
        else if (hadDraft) { draft = Plan.makePlan(source, currentRoles(), { solo: solo.checked, start: start.value }); drafts[mode] = draft; section.querySelector('[data-blueprint-result]').hidden = false; render(); }
      } catch (error) { say(error.message, true); return; }
      say(solo.checked ? 'Личный план: вы выполняете все шаги. Черновик команды сохранён до обновления страницы.' : 'Командный план: роли и правки этого режима сохранены до обновления страницы.');
    });
    start.addEventListener('change', function () {
      try {
        Plan.dateForDay(start.value, 1);
        Object.values(drafts).filter(Boolean).forEach(function (plan) {
          plan.start = start.value;
          plan.tasks.forEach(function (task) { if (!task.manualDate) task.deadline = Plan.dateForDay(plan.start, task.day); });
        });
        if (draft) render();
        say('Ориентировочные даты пересчитаны. Сроки, которые вы меняли вручную, сохранены.');
      } catch (error) { say(error.message, true); }
    });
    section.querySelector('[data-blueprint-export]').addEventListener('click', function () {
      let url;
      try {
        Plan.reconcilePlan(draft, currentRoles());
        url = win.URL.createObjectURL(new win.Blob([Plan.exportPlan(draft)], { type: 'text/html;charset=utf-8' }));
        const link = element('a'); link.href = url; link.download = draft.solo ? 'bestservice-personal-plan.html' : 'bestservice-raci-plan.html';
        doc.body.append(link); link.click(); link.remove();
        say('План передан браузеру для скачивания: правки, сроки, основания и замечания включены. Откройте файл для просмотра или печати в PDF.');
      } catch (error) { say('Не удалось скачать план: ' + error.message, true); }
      finally { if (url) win.setTimeout(function () { win.URL.revokeObjectURL(url); }, 1000); }
    });
    let printState = null;
    win.addEventListener('beforeprint', function () {
      if (printState) return;
      printState = { open: builder.open, sources: Array.from(section.querySelectorAll('.blueprint-task-source')).map(node => ({ node, open: node.open })) };
      if (draft) builder.open = true;
      printState.sources.forEach(item => { item.node.open = true; });
    });
    win.addEventListener('afterprint', function () {
      if (!printState) return;
      builder.open = printState.open; printState.sources.forEach(item => { item.node.open = item.open; }); printState = null;
    });
    section.querySelector('[data-blueprint-setup]').hidden = false;
  }

  function init(win) {
    const section = win.document.querySelector('[data-blueprint]');
    if (!section) return;
    const builder = section.querySelector('[data-blueprint-builder]');
    mount(section, win);
    win.document.querySelectorAll('[data-blueprint-open]').forEach(function (link) {
      link.addEventListener('click', function () { builder.open = true; });
    });
    if (win.location.hash === '#service-blueprint') builder.open = true;
  }
  return { makeDraft: makeDraft, reconcileRoles: reconcileRoles, exportHtml: exportHtml, minimumRating: minimumRating, init: init };
});
