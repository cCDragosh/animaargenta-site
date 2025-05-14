document.querySelectorAll('.flip-container').forEach(container => {
  container.addEventListener('click', () => {
    const inner = container.querySelector('.flip-inner');
    inner.classList.toggle('rotated');
  });
});
