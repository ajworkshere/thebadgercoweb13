// A presentation of existing questions, not an assessment or a second rule engine.
(() => {
  const preview = document.querySelector('[data-fit-preview]');
  if (!preview) return;
  const questions = {
    heel: { question: 'What happens at the back?', options: ['It lifts or slips out as I walk', 'It rubs or catches at the back', 'My whole foot slides forward'] },
    forefoot: { question: 'What happens at the front?', options: ['Squeezed or cramped across the toes', 'Rubbing on the outer edge or little toe', 'Narrow across the widest part'] },
    top: { question: 'What does the top of the foot feel like?', options: ['Pressure or tightness', 'Numbness or tingling'] },
  };
  const buttons = preview.querySelectorAll('[data-area]');
  buttons.forEach(button => button.addEventListener('click', () => {
    const selected = questions[button.dataset.area];
    if (!selected) return;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    preview.querySelector('[data-preview-question]').textContent = selected.question;
    const options = selected.options.map(text => { const li = document.createElement('li'); li.textContent = text; return li; });
    preview.querySelector('[data-preview-options]').replaceChildren(...options);
  }));
})();
