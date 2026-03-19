import { createBlaqCeaserAppShell } from './runtime-shell.js';
import character from './character.js';

export { character };
export { createBlaqCeaserAppShell } from './runtime-shell.js';

function printShellSummary() {
  const shell = createBlaqCeaserAppShell();

  console.log(
    JSON.stringify(
      {
        agent: shell.character.name,
        readOnly: shell.config.readOnly,
        executionAuthority: shell.config.executionAuthority,
        modelProvider: shell.config.modelProvider ?? 'TODO',
        modelName: shell.config.modelName ?? 'TODO',
        telegram: shell.config.telegram,
        notes: shell.notes,
      },
      null,
      2
    )
  );
}

// Placeholder entry point for later Eliza integration.
// Today it only prints the runtime shell summary so the package has a clear, safe launch target.
if (import.meta.url === `file://${process.argv[1]}`) {
  printShellSummary();
}
