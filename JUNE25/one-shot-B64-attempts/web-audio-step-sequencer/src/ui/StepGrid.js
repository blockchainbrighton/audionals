import { h } from "preact";
import htm from "htm";
const html = htm.bind(h);

export default function StepGrid({ project, playhead }) {
  return html\`
    <div class="step-grid">
      $\{project.channels.map((ch) =>
        html\`
          <div class="step-row">
            $\{ch.steps.map((on, col) => {
              const playing = playhead === col;
              return html\`<div
                class=$\{"step " + (on ? "on " : "") + (playing ? "playhead" : "")}
                onClick=\${() => ch.toggleStep(col)}
              ></div>\`;
            })}
          </div>\`
      )}
    </div>
  \`;
}
