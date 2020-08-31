/**
 * @jest-environment jsdom
 */

import { putMiddle } from '../src/centerContent';

test('Check putMiddle function able to put video section in middle', () => {
  document.body.innerHTML = `
  <div id="card31" style="width: 1000px; height: 500px;">
    <div id="video-section" style="position: absolute";>
      <video id="video-preview" width="400px" height="400px" style="position: absolute;"></video>
      <svg style="position: absolute;">
        <rect id="middleBox" x="0" y="0" width="200" height="200"/>
      </svg>
    </div>
    <div id="video-play-control" style="position:relative; top:800px;"></div>
  </div>
`;
});
