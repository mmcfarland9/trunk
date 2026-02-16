export function buildSidebar(): HTMLElement {
  const sidePanel = document.createElement('aside')
  sidePanel.className = 'side-panel'
  sidePanel.innerHTML = `
    <section class="panel-section focus-section">
      <p class="focus-meta"></p>
      <p class="focus-title"></p>
      <p class="focus-note"></p>
      <p class="focus-goal"></p>
    </section>
    <section class="panel-section progress-section">
      <p class="progress-count"></p>
      <div class="progress-track">
        <span class="progress-fill" style="width: 0%"></span>
      </div>
    </section>
    <section class="panel-section sprouts-section">
      <button type="button" class="panel-button back-to-trunk">← Back to trunk</button>
      <button type="button" class="panel-button back-to-branch">← Back to branch</button>
      <button type="button" class="sprouts-toggle is-expanded" data-section="active">
        <span class="sprouts-toggle-arrow">▼</span>
        <span class="sprouts-toggle-label">Growing</span>
        <span class="sprouts-toggle-count">(0)</span>
      </button>
      <div class="sprouts-list" data-section="active"></div>
      <button type="button" class="sprouts-toggle" data-section="cultivated">
        <span class="sprouts-toggle-arrow">▼</span>
        <span class="sprouts-toggle-label">Cultivated</span>
        <span class="sprouts-toggle-count">(0)</span>
      </button>
      <div class="sprouts-list" data-section="cultivated"></div>
    </section>
    <section class="panel-section keyboard-hints">
      <p class="keyboard-hint hint-escape" title="Press Escape to go back"><kbd>Esc</kbd> Back</p>
      <p class="keyboard-hint hint-arrows" title="Cmd+Arrow to cycle"><kbd>⌘←</kbd><kbd>⌘→</kbd> Cycle</p>
      <p class="keyboard-hint hint-numbers" title="Number keys to select"><kbd>1-8</kbd> Select</p>
    </section>
  `
  return sidePanel
}
