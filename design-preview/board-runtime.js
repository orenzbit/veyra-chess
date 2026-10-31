import { Chessboard, COLOR, INPUT_EVENT_TYPE } from '../public/vendor/cm-chessboard/src/Chessboard.js';
import sprite from '../public/vendor/cm-chessboard/pieces/standard.svg';

export { COLOR, INPUT_EVENT_TYPE };
export function createBoard(host, props) {
  // Embed the unchanged sprite so the actual library also works under file:// without XHR.
  if (!document.getElementById('cm-chessboard-sprite')) {
    const wrapper = document.createElement('div');
    wrapper.id = 'cm-chessboard-sprite';
    wrapper.style.cssText = 'position:absolute;transform:scale(0);pointer-events:none';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = sprite.slice(sprite.indexOf('<svg'));
    document.body.appendChild(wrapper);
  }
  return new Chessboard(host, {
    ...props,
    style: {
      cssClass: 'default',
      borderType: 'none',
      pieces: { file: 'pieces/standard.svg' },
      animationDuration: 200,
      ...props.style
    }
  });
}
