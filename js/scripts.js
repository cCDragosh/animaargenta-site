document.querySelectorAll('.flip-container').forEach(container => {
  container.addEventListener('click', () => {
    container.querySelector('.flip-inner').classList.toggle('rotated');
  });
});