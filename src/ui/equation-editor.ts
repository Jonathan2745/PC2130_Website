/** EDIT HERE: presets, toolbar insertions, draft/apply/reset behaviour.
 * Applying an equation is separate from typing a draft. */
import { DEFAULT_EQUATION, type WavefunctionEquation } from "../equation";
import { envelope, examples } from "../config/presets";
import { must } from "./dom";
export function setupEquationEditor(equation: WavefunctionEquation, onChange: () => void): void {
  const equationInput = must<HTMLTextAreaElement>("equation");
  equationInput.value = DEFAULT_EQUATION;
  // The editor is a draft until Apply succeeds. Insertion helpers never change the
  // running wavefunction; ψ is the left-hand-side label, not a recursive variable.
  function markDraft(): void {
    const status = must<HTMLElement>('equation-status');
    status.className = 'status draft';
    status.textContent = 'Draft changes — click Apply equation to update the visualization.';
  }
  equationInput.addEventListener('input', markDraft);
  must<HTMLButtonElement>('load-example').addEventListener('click', () => {
    equationInput.value = examples[must<HTMLSelectElement>('equation-example').value];
    markDraft();
    equationInput.focus();
  });
  const toolbar = must<HTMLElement>('equation-toolbar');
  // Preserve the textarea selection on mouse presses; keyboard activation also
  // uses selectionStart/End, which remain available after focus leaves the field.
  toolbar.addEventListener('mousedown', event => event.preventDefault());
  toolbar.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-insert]');
    if (!button) return;
    const token = button.dataset.insert!;
    const start = equationInput.selectionStart, end = equationInput.selectionEnd;
    const selected = equationInput.value.slice(start, end);
    let text = token;
    let selectFrom = 0, selectTo = 0;
    if (['exp', 'sin', 'cos', 'sqrt'].includes(token)) {
      const argument = selected || (token === 'sqrt' ? '1' : '0');
      text = `${token}(${argument})`;
      selectFrom = token.length + 1;
      selectTo = selectFrom + argument.length;
    } else if (token === 'square') {
      text = `(${selected || 'x'})^2`;
      selectFrom = 1;
      selectTo = 1 + (selected || 'x').length;
    } else if (token === 'gaussian') {
      text = envelope;
    }
    equationInput.setRangeText(text, start, end, 'end');
    equationInput.focus();
    if (selectTo) equationInput.setSelectionRange(start + selectFrom, start + selectTo);
    markDraft();
  });

  must<HTMLButtonElement>('apply-equation').addEventListener('click', () => {
    const status = must<HTMLElement>('equation-status');
    try {
      // Compile once; subsequent frames evaluate this expression at spatial samples.
      equation.set(equationInput.value);
      status.className = 'status ok';
      status.textContent = 'Equation compiled successfully and is driving position space. Other observables remain Gaussian diagnostics.';
      onChange();
    } catch (error) {
      status.className = 'status error';
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  });

  must<HTMLButtonElement>('reset-equation').addEventListener('click', () => {
    equation.reset();
    equationInput.value = equation.value;
    const status = must<HTMLElement>('equation-status');
    status.className = 'status ok';
    status.textContent = 'Restored the exact Gaussian solution for a uniform constant force.';
    onChange();
  });

}
