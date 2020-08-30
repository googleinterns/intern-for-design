import {
  card31,
  middleBox,
  leftWidth,
  topDownHeight,
  topBox,
  videoPreview,
  videoSection,
} from './globals';

/** Centers video section indludes video and SVG masking elements. */
export function putMiddle(): void {
  let left =
    (card31.offsetWidth - middleBox.getBoundingClientRect().width) / 2 -
    leftWidth;
  let top =
    (330 - middleBox.getBoundingClientRect().height) / 2 - topDownHeight;
  if (topBox.getBoundingClientRect().width === 0) {
    left = (card31.offsetWidth - videoPreview.offsetWidth) / 2;
    videoSection.style.width = `100%`;
    top = (330 - videoPreview.height) / 2;
  } else {
    if (left < 0) {
      left = 0;
    }
    if (top < 0) {
      top = 0;
    }
  }
  videoSection.style.marginLeft = `${left}px`;
  videoSection.style.marginTop = `${top}px`;
}

/** Centers the section of card3 with all the SVG elements. */
$(window).resize((): void => {
  let left =
    (card31.offsetWidth - middleBox.getBoundingClientRect().width) / 2 -
    leftWidth;
  if (topBox.getBoundingClientRect().width === 0) {
    left = (card31.offsetWidth - videoPreview.offsetWidth) / 2;
    videoSection.style.width = `100%`;
  } else {
    if (left < 0) {
      left = 0;
    }
  }
  videoSection.style.marginLeft = `${left}px`;
});
