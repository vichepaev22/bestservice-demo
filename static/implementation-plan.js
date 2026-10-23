(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BestServicePlan = factory();
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const string = v => typeof v === 'string' ? v.trim() : '';
  const strings = v => (Array.isArray(v) ? v : [v]).map(string).filter(Boolean);
  const clean = v => string(v).replace(/^(?:[PRПР][1-3])\s*[:.\-–—]?\s*/i, '');
  const key = v => clean(v).toLocaleLowerCase('ru').replace(/[\s.!?,:;]+/g, ' ').trim();
  const legend = { R: 'Делает', A: 'Отвечает за результат', AR: 'Делает и отвечает', C: 'Консультирует', I: 'В курсе' };
  function selectedRoles(values) {
    const roles = [];
    strings(values).forEach(v => { v = v.slice(0, 80); if (!roles.some(r => key(r) === key(v)) && roles.length < 12) roles.push(v); });
    if (!roles.length) throw new Error('Выберите хотя бы одну роль или режим «Я всё делаю сам».');
    return roles;
  }
  function dateForDay(start, day) {
    if (!start) return '';
    const date = new Date(start + 'T12:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== start
        || !Number.isInteger(day) || day < 1) throw new Error('Укажите корректную дату начала.');
    date.setUTCDate(date.getUTCDate() + day - 1);
    return date.toISOString().slice(0, 10);
  }
  function goalsFrom(source) {
    const goals = [], seen = new Map();
    const stages = Array.isArray(source.stages) ? source.stages : [];
    function add(proposal, stage, origin) {
      const action = clean(proposal); if (!action) return;
      const id = key(action), old = seen.get(id);
      if (old) {
        if (stage && !old.stages.includes(string(stage.name))) old.stages.push(string(stage.name));
        if (stage) { old.pains = [...new Set(old.pains.concat(strings(stage.pains)))]; old.evidence = [...new Set(old.evidence.concat(strings(stage.evidence)))]; }
        return;
      }
      const goal = { action, stages: stage ? [string(stage.name)] : [], pains: strings(stage && stage.pains),
        evidence: strings(stage && stage.evidence), origin, confidence: string(stage && stage.confidence) };
      seen.set(id, goal); goals.push(goal);
    }
    strings(source.recommendations).forEach(v => add(v, null, 'Рекомендация отчёта'));
    stages.forEach(stage => { if (stage && typeof stage === 'object') strings(stage.opportunities).forEach(v => add(v, stage, 'Предложение CJM')); });
    return goals;
  }
  function kindFor(goal) {
    const value = goal.action.toLocaleLowerCase('ru');
    if (/контент|публик|smm|соцсет|социальн|кейс|faq/.test(value)) return 'content';
    if (/цен|стоимост|оплат|прайс|тариф/.test(value)) return 'price';
    if (/запис|звон|ответ|перезвон|коммуникац|статус|ожидан|очеред/.test(value)) return 'contact';
    if (/качеств|тренер|специалист|безопас|чистот|ремонт|процедур|услуг/.test(value)) return 'service';
    return 'general';
  }
  function details(kind) {
    return {
      content: ['Соберите подтверждённые ответы на вопросы клиентов и подготовьте материал по рекомендации. Не публикуйте личные данные и неподтверждённые обещания.', 'Опубликуйте подготовленный материал в используемом вами канале. Проверьте доступность ссылки и понятность следующего шага для клиента.', 'Материал доступен, отвечает на исходный вопрос; способ обращения понятен. Запишите реальные вопросы и отклики.'],
      price: ['Сверьте фактические цены, состав услуги и доплаты; подготовьте понятное объяснение до оплаты.', 'Проверьте объяснение цены на следующем согласованном обращении. Покажите итоговую стоимость до подтверждения заказа.', 'Клиенту до оплаты доступны состав услуги и итоговая цена; расхождения записаны и устранены.'],
      contact: ['Зафиксируйте, в каких каналах теряются обращения. Подготовьте порядок ответа, обратного звонка или сообщения о статусе под эту рекомендацию.', 'Примените новый порядок на ближайших обращениях и запишите время, ответ и нерешённый вопрос.', 'По журналу обращений видно, какие получили ответ, какие остались без ответа и что требует исправления.'],
      service: ['Проверьте проблему на реальном процессе и подготовьте одно изменение по рекомендации; согласуйте безопасность и необходимые ресурсы.', 'Опробуйте изменение на одном подходящем случае, затем уточните у клиента, снята ли исходная проблема.', 'Изменение выполнено, результат проверки и обратная связь записаны; нерешённые вопросы не скрыты.'],
      general: ['Сверьте вывод с доступными данными и определите одно проверяемое изменение по рекомендации. Зафиксируйте текущую ситуацию.', 'Опробуйте выбранное изменение в небольшом масштабе; запишите, что произошло и что нужно скорректировать.', 'Есть запись о выполненном изменении, наблюдаемом результате и решении: оставить, исправить или проверить ещё раз.']
    }[kind];
  }
  function makePlan(source, values, options) {
    source = source || {}; options = options || {};
    const solo = Boolean(options.solo), roles = solo ? ['Собственник'] : selectedRoles(values);
    const start = string(options.start); dateForDay(start, 1);
    const all = goalsFrom(source);
    if (!all.length) throw new Error('В отчёте нет рекомендаций или предложений CJM для плана. Сначала уточните анализ.');
    const goals = all.slice(0, 20), tasks = [];
    const accountable = roles.find(r => /собственник|руководител/i.test(r)) || roles[0];
    goals.forEach((goal, index) => {
      const kind = kindFor(goal), context = details(kind);
      const pattern = { content: /маркет|smm|смм/i, contact: /администрат|менеджер/i, price: /руководител|собственник/i, service: /тренер|специалист|мастер|руководител/i, general: /руководител|собственник/i }[kind];
      const performer = roles.find(r => pattern.test(r)) || accountable;
      const dayBase = solo ? index * 7 : index * 2;
      const steps = [
        { phase: 'Подготовка', action: 'Проверьте основание и подготовьте изменение: ' + goal.action, how: context[0], check: 'Зафиксированы исходная проблема, выбранное изменение и необходимые ресурсы.' },
        { phase: 'Внедрение', action: goal.action, how: context[1], check: 'Рекомендация применена в пробном случае; результат записан.' },
        { phase: 'Проверка', action: 'Проверьте результат: ' + goal.action, how: 'Сравните результат с исходной проблемой. ' + context[2], check: context[2] }
      ];
      steps.forEach((step, i) => {
        const id = 'step-' + (tasks.length + 1), day = dayBase + [1, 3, 7][i];
        tasks.push({ ...step, id, goal: index + 1, source: goal, day, deadline: dateForDay(start, day), manualDate: false,
          after: tasks.length && (solo || i > 0) ? tasks[tasks.length - 1].id : '',
          r: [i === 2 ? accountable : performer], a: accountable, c: [], i: [] });
      });
    });
    return { project: string(source.project), reportDate: string(source.report_date), solo, roles, start, goals, tasks, omitted: all.length - goals.length };
  }
  function reconcilePlan(plan, values) {
    plan.roles = plan.solo ? ['Собственник'] : selectedRoles(values);
    plan.tasks.forEach(t => { ['r', 'c', 'i'].forEach(k => { t[k] = t[k].filter(r => plan.roles.includes(r)); }); if (!plan.roles.includes(t.a)) t.a = ''; });
    return plan;
  }
  function setParticipation(task, role, code) {
    if (!['', 'R', 'A', 'AR', 'C', 'I'].includes(code)) throw new Error('Неизвестное участие в RACI.');
    ['r', 'c', 'i'].forEach(k => { task[k] = task[k].filter(v => v !== role); });
    if (task.a === role) task.a = '';
    if (code.includes('A')) task.a = role;
    if (code.includes('R')) task.r.push(role);
    if (code === 'C') task.c.push(role);
    if (code === 'I') task.i.push(role);
  }
  function participation(t, role) {
    if (t.a === role) return t.r.includes(role) ? 'AR' : 'A';
    return t.r.includes(role) ? 'R' : t.c.includes(role) ? 'C' : t.i.includes(role) ? 'I' : '';
  }
  function planIssues(plan) {
    const issues = [];
    plan.tasks.forEach((t, i) => {
      const prefix = 'Шаг ' + (i + 1) + ': ';
      if (!t.r.length) issues.push(prefix + 'выберите исполнителя R.');
      if (!t.a) issues.push(prefix + 'выберите одного ответственного за результат A.');
      if (!string(t.action) || !string(t.check)) issues.push(prefix + 'заполните действие и критерий проверки.');
      if (t.deadline) {
        try { dateForDay(t.deadline, 1); }
        catch (_) { issues.push(prefix + 'некорректная дата.'); return; }
        if (plan.start && t.deadline < plan.start) issues.push(prefix + 'срок раньше начала плана.');
        const before = plan.tasks.find(v => v.id === t.after);
        if (before && before.deadline && t.deadline < before.deadline) issues.push(prefix + 'срок раньше предыдущего шага.');
      }
    });
    return issues;
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function exportPlan(plan) {
    const e = escapeHtml, issues = planIssues(plan);
    const headers = ['Шаг / действие / основание', 'Как выполнить', 'Срок', 'После шага', ...(!plan.solo ? plan.roles : ['Кто делает']), 'Как проверить'];
    const rows = plan.tasks.map((t, i) => '<tr><th scope="row">' + e('Шаг ' + (i + 1) + ' · ' + t.phase + '\n' + t.action) +
      '<small>' + e(t.source.origin + ' · ' + (t.source.stages.join(', ') || 'Отчёт в целом') + '\nПредложение: ' + t.source.action + '\nБоли: ' + (t.source.pains.join('; ') || 'не указаны') + '\nОснование CJM: ' + (t.source.evidence.join('; ') || 'Цитаты не указаны')) + '</small></th>' +
      [t.how, t.deadline || 'День ' + t.day + ' от старта', t.after ? 'Шаг ' + (plan.tasks.findIndex(v => v.id === t.after) + 1) : 'Можно начать',
        ...(!plan.solo ? plan.roles.map(r => { const code = participation(t, r); return code ? code + ' · ' + legend[code] : 'Не участвует'; }) : ['Собственник']), t.check]
        .map(v => '<td>' + e(v) + '</td>').join('') + '</tr>').join('');
    return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>План внедрения · ' + e(plan.project) + '</title><style>' +
      'body{font:16px/1.5 Georgia,serif;margin:24px;color:#102d50}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bdd2ea;padding:14px;text-align:left;vertical-align:top;min-width:160px;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#edf4fe}small{display:block;font-weight:normal;font-size:12px}.scroll{overflow:auto}@media print{@page{size:A3 landscape;margin:10mm}body{margin:0;font-size:9px}.scroll{overflow:visible}table{table-layout:fixed}th,td{min-width:0;padding:5px}}' +
      '</style><h1>' + (plan.solo ? 'Пошаговый план собственника' : 'План внедрения и RACI') + '</h1><p><strong>Черновик · ' + e(plan.project) + '</strong></p>' +
      '<p>Основа: сохранённый отчёт от ' + e(plan.reportDate || 'даты не указано') + '. Отзывы не подтверждают внутренние процессы. Действия, сроки и роли предложены для проверки собственником, не назначены сотрудникам. Оценки сроков в календарных днях; день 1 — дата старта. Начало: ' + e(plan.start || 'не выбрано') + '.</p>' +
      '<p>R — делает; A — отвечает за результат; A/R — совмещает; C — консультирует; I — в курсе.</p>' +
      (plan.omitted ? '<p>Включены первые 20 улучшений; ещё ' + plan.omitted + ' остались в исходном отчёте.</p>' : '') +
      (issues.length ? '<h2>Нужно уточнить</h2><ul>' + issues.map(s => '<li>' + e(s) + '</li>').join('') + '</ul>' : '') +
      '<div class="scroll"><table><thead><tr>' + headers.map(v => '<th scope="col">' + e(v) + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p>Файл — снимок правок, не совместный трекер задач. Он не отправляет уведомления и не обещает рост рейтинга или выручки. Откройте печать браузера для PDF.</p></html>';
  }
  return { makePlan, reconcilePlan, setParticipation, participation, planIssues, dateForDay, exportPlan, legend };
});
