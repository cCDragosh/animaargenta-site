document.querySelectorAll('.flip-container').forEach(container => {
  const inner = container.querySelector('.flip-inner');
  if (!inner) return;

  container.addEventListener('click', () => {
    inner.classList.toggle('rotated');
  });
});
