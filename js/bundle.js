(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // Busca cualquier contenedor que tenga tarjetas flip
    const parentContainer = document.querySelector('.grid, .contenedor, .galeria, #gallery');

    if (parentContainer) {
      // Delegación de clic
      parentContainer.addEventListener('click', (event) => {
        const container = event.target.closest('.flip-container');
        if (container) {
          toggleFlip(container);
        }
      });

      // Delegación de teclado
      parentContainer.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          const container = event.target.closest('.flip-container');
          if (container) {
            toggleFlip(container);
            event.preventDefault();
          }
        }
      });

      // Atributos de accesibilidad para cualquier flip-container visible
      parentContainer.querySelectorAll('.flip-container').forEach(container => {
        container.setAttribute('tabindex', '0');
        container.setAttribute('role', 'button');
        container.setAttribute('aria-pressed', 'false');
      });
    }
  });

  /**
   * Activa o desactiva el giro de la tarjeta
   * @param {HTMLElement} container
   */
  function toggleFlip(container) {
    const inner = container.querySelector('.flip-inner');
    if (inner) {
      inner.classList.toggle('rotated');
      const isRotated = inner.classList.contains('rotated');
      container.setAttribute('aria-pressed', isRotated.toString());
    }
  }

})();
