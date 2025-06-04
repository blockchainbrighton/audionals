import { h, render } from "preact";
import htm from "htm";
import { createStore } from "../store/store.js";
import { createScheduler } from "../audio/scheduler.js";
import ChannelStrip from "./ChannelStrip.js";
import StepGrid from "./StepGrid.js";
import { setupAutosave } from "../utils/persistence.js";

const html = htm.bind(h);

const initialProject = {
  channels: [],
  meta: { bpm: 120, steps: 16 },
};

const store = createStore({ project: initialProject, playhead: 0 });
setupAutosave(store);

const scheduler = createScheduler(store.getState("project"), store);

function App() {
  const { project, playhead } = store.getState();
  return html\`
    <div class="app">
      <button onClick=\${() => scheduler.toggle()}>$\{scheduler.isPlaying() ? "Stop" : "Play"}</button>
      <label>
        BPM
        <input
          type="number"
          value=\${project.meta.bpm}
          onInput=\${(e) => {
            project.meta.bpm = +e.target.value;
            store.setState({ project: { ...project } });
          }}
        />
      </label>
      <div class="channels">
        $\{project.channels.map((ch) => html\`<\${ChannelStrip} channel=\${ch} />\`)}
      </div>
      <\${StepGrid} project=\${project} playhead=\${playhead} />
    </div>
  \`;
}

render(html\`<\${App} />\`, document.getElementById("app"));
