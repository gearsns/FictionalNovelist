import { renderHeader } from "./header";
import { renderRail, stepHtml } from "./rail";
import { renderFooter } from "./footer";
import { renderPrepPanel } from "./panels/prepPanel";
import { renderInitPanel } from "./panels/initPanel";
import { renderOutlinePanel } from "./panels/outlinePanel";
import { renderWritePanel } from "./panels/writePanel";
import { renderReconstructPanel } from "./panels/reconstructPanel";
import { renderEditPanel } from "./panels/editPanel";
import { renderConvertPanel } from "./panels/convertPanel";

export { stepHtml };

export function renderAppLayout(app: HTMLDivElement): void {
  app.innerHTML = `
    ${renderHeader()}
    <div class="layout">
      ${renderRail()}
      <main class="main">
        ${renderPrepPanel()}
        ${renderInitPanel()}
        ${renderOutlinePanel()}
        ${renderWritePanel()}
        ${renderReconstructPanel()}
        ${renderEditPanel()}
        ${renderConvertPanel()}
      </main>
    </div>
    ${renderFooter()}
  `;
}
