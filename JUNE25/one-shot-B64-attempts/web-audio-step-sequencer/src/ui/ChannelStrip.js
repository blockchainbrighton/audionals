import { h } from "preact";
import htm from "htm";
const html = htm.bind(h);

export default function ChannelStrip({ channel }) {
  return html\`
    <div class="channel-strip">
      <h4>$\{channel.name || "Channel"}</h4>
      <button onClick=\${() => (channel.mute = !channel.mute)}>$\{channel.mute ? "Unmute" : "Mute"}</button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value=\${channel.gain}
        onInput=\${(e) => (channel.gain = +e.target.value)}
      />
    </div>
  \`;
}
