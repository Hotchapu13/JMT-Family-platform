/**
 * Wires up every [data-dropzone] upload box on the page: click-to-browse,
 * drag-and-drop (assigning dropped files onto the underlying
 * <input type="file">), the selected-filename readout, and the radiating
 * highlight that tracks the pointer while a file is dragged over the box.
 */
export function initDropzones(root = document) {
  root.querySelectorAll('[data-dropzone]').forEach(initDropzone);
}

/**
 * Clears the filename readout inside a dropzone. Needed after
 * `form.reset()`, which clears the underlying <input> but — unlike a real
 * user action — doesn't fire a `change` event, so the readout wouldn't
 * otherwise notice.
 */
export function resetDropzones(root) {
  root.querySelectorAll('[data-dropzone-filename]').forEach((el) => {
    el.textContent = '';
  });
}

function initDropzone(box) {
  const input = box.querySelector('[data-dropzone-input]');
  const trigger = box.querySelector('[data-dropzone-button]');
  const filenameEl = box.querySelector('[data-dropzone-filename]');
  if (!input) return;

  function describeSelection() {
    if (!filenameEl) return;
    const files = input.files;
    if (!files?.length) {
      filenameEl.textContent = '';
    } else if (files.length === 1) {
      filenameEl.textContent = files[0].name;
    } else {
      filenameEl.textContent = `${files.length} files selected`;
    }
  }

  function trackPointer(event) {
    const rect = box.getBoundingClientRect();
    box.style.setProperty('--drop-x', `${event.clientX - rect.left}px`);
    box.style.setProperty('--drop-y', `${event.clientY - rect.top}px`);
  }

  box.addEventListener('click', (event) => {
    if (event.target === input) return;
    input.click();
  });

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    input.click();
  });

  ['dragenter', 'dragover'].forEach((evt) =>
    box.addEventListener(evt, (event) => {
      event.preventDefault();
      trackPointer(event);
      box.classList.add('is-dragover');
    }),
  );

  box.addEventListener('dragleave', (event) => {
    // Moving between child elements fires dragleave too — only clear the
    // highlight once the pointer has actually left the box itself.
    if (event.relatedTarget && box.contains(event.relatedTarget)) return;
    box.classList.remove('is-dragover');
  });

  box.addEventListener('drop', (event) => {
    event.preventDefault();
    box.classList.remove('is-dragover');
    const files = event.dataTransfer?.files;
    if (files?.length) {
      input.files = files;
      describeSelection();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  input.addEventListener('change', describeSelection);
}
