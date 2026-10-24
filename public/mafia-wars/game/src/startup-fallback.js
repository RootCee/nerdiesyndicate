const feedback = document.getElementById('entryFeedback');
const message = document.getElementById('entryFeedbackMessage');
const retry = document.getElementById('entryRetry');
let retryAction = () => location.reload();

function showEntryFeedback(text, { error = false, retryLabel = '', onRetry } = {}) {
  if (!feedback || !message || !retry) return;
  message.textContent = text;
  feedback.hidden = !text;
  feedback.classList.toggle('error', error);
  retry.hidden = !retryLabel;
  retry.textContent = retryLabel || 'Reload and retry';
  retryAction = onRetry || (() => location.reload());
}

retry?.addEventListener('click', () => retryAction());
window.__showGameEntryFeedback = showEntryFeedback;
window.__markGameReady = () => {
  document.documentElement.dataset.gameReady = 'true';
  showEntryFeedback('');
};

function showStartupFailure(text) {
  if (document.documentElement.dataset.gameReady === 'true') return;
  showEntryFeedback(text, { error: true, retryLabel: 'Reload and retry' });
}

window.addEventListener('error', (event) => {
  if (event.target !== window && event.target?.localName !== 'script') return;
  showStartupFailure(event.message || 'A game file could not be loaded. Check your connection and retry.');
});
window.addEventListener('unhandledrejection', (event) => {
  showStartupFailure(event.reason?.message || 'Game startup failed unexpectedly. Reload and retry.');
});
