var VeyraBoard = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // design-preview/board-runtime.js
  var board_runtime_exports = {};
  __export(board_runtime_exports, {
    COLOR: () => COLOR,
    INPUT_EVENT_TYPE: () => INPUT_EVENT_TYPE,
    createBoard: () => createBoard
  });

  // public/vendor/cm-chessboard/src/model/Position.js
  var FEN = {
    start: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    empty: "8/8/8/8/8/8/8/8"
  };
  var Position = class _Position {
    constructor(fen = FEN.empty) {
      this.squares = new Array(64).fill(null);
      this.setFen(fen);
    }
    setFen(fen = FEN.empty) {
      const parts = fen.replace(/^\s*/, "").replace(/\s*$/, "").split(/\/|\s/);
      for (let part = 0; part < 8; part++) {
        const row = parts[7 - part].replace(/\d/g, (str) => {
          const numSpaces = parseInt(str);
          let ret = "";
          for (let i = 0; i < numSpaces; i++) {
            ret += "-";
          }
          return ret;
        });
        for (let c = 0; c < 8; c++) {
          const char = row.substring(c, c + 1);
          let piece = null;
          if (char !== "-") {
            if (char.toUpperCase() === char) {
              piece = `w${char.toLowerCase()}`;
            } else {
              piece = `b${char}`;
            }
          }
          this.squares[part * 8 + c] = piece;
        }
      }
    }
    getFen() {
      let parts = new Array(8).fill("");
      for (let part = 0; part < 8; part++) {
        let spaceCounter = 0;
        for (let i = 0; i < 8; i++) {
          const piece = this.squares[part * 8 + i];
          if (!piece) {
            spaceCounter++;
          } else {
            if (spaceCounter > 0) {
              parts[7 - part] += spaceCounter;
              spaceCounter = 0;
            }
            const color = piece.substring(0, 1);
            const name = piece.substring(1, 2);
            if (color === "w") {
              parts[7 - part] += name.toUpperCase();
            } else {
              parts[7 - part] += name;
            }
          }
        }
        if (spaceCounter > 0) {
          parts[7 - part] += spaceCounter;
          spaceCounter = 0;
        }
      }
      return parts.join("/");
    }
    getPieces(pieceColor = void 0, pieceType = void 0, sortBy = ["k", "q", "r", "b", "n", "p"]) {
      const pieces = [];
      const sort = (a, b) => {
        return sortBy.indexOf(a.name) - sortBy.indexOf(b.name);
      };
      for (let i = 0; i < 64; i++) {
        const piece = this.squares[i];
        if (piece) {
          const type = piece.charAt(1);
          const color = piece.charAt(0);
          const square = _Position.indexToSquare(i);
          if (pieceType && pieceType !== type || pieceColor && pieceColor !== color) {
            continue;
          }
          pieces.push({
            name: type,
            // deprecated, use type
            type,
            color,
            position: square,
            // deprecated, use square
            square
          });
        }
      }
      if (sortBy) {
        pieces.sort(sort);
      }
      return pieces;
    }
    movePiece(squareFrom, squareTo) {
      if (!this.squares[_Position.squareToIndex(squareFrom)]) {
        console.warn("no piece on", squareFrom);
        return;
      }
      this.squares[_Position.squareToIndex(squareTo)] = this.squares[_Position.squareToIndex(squareFrom)];
      this.squares[_Position.squareToIndex(squareFrom)] = null;
    }
    setPiece(square, piece) {
      this.squares[_Position.squareToIndex(square)] = piece;
    }
    getPiece(square) {
      return this.squares[_Position.squareToIndex(square)];
    }
    static squareToIndex(square) {
      const coordinates = _Position.squareToCoordinates(square);
      return coordinates[0] + coordinates[1] * 8;
    }
    static indexToSquare(index) {
      return this.coordinatesToSquare([Math.floor(index % 8), index / 8]);
    }
    static squareToCoordinates(square) {
      const file = square.charCodeAt(0) - 97;
      const rank = square.charCodeAt(1) - 49;
      return [file, rank];
    }
    static coordinatesToSquare(coordinates) {
      const file = String.fromCharCode(coordinates[0] + 97);
      const rank = String.fromCharCode(coordinates[1] + 49);
      return file + rank;
    }
    toString() {
      return this.getFen();
    }
    clone() {
      const cloned = Object.create(_Position.prototype);
      cloned.squares = this.squares.slice(0);
      return cloned;
    }
  };

  // public/vendor/cm-chessboard/src/model/ChessboardState.js
  var ChessboardState = class {
    constructor() {
      this.position = new Position();
      this.orientation = void 0;
      this.inputWhiteEnabled = false;
      this.inputBlackEnabled = false;
      this.squareSelectEnabled = false;
      this.moveInputCallback = null;
      this.moveInputAnimate = void 0;
      this.extensionPoints = {};
      this.moveInputProcess = Promise.resolve();
    }
    inputEnabled() {
      return this.inputWhiteEnabled || this.inputBlackEnabled;
    }
    invokeExtensionPoints(name, data = {}) {
      const extensionPoints = this.extensionPoints[name];
      const dataCloned = Object.assign({}, data);
      dataCloned.extensionPoint = name;
      let returnValue = true;
      if (extensionPoints) {
        for (const extensionPoint of extensionPoints) {
          if (extensionPoint(dataCloned) === false) {
            returnValue = false;
          }
        }
      }
      return returnValue;
    }
  };

  // public/vendor/cm-chessboard/src/lib/Svg.js
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  var Svg = class {
    /**
     * create the Svg in the HTML DOM
     * @param containerElement
     * @returns {Element}
     */
    static createSvg(containerElement = void 0) {
      let svg = document.createElementNS(SVG_NAMESPACE, "svg");
      if (containerElement) {
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        containerElement.appendChild(svg);
      }
      return svg;
    }
    /**
     * Add an Element to an SVG DOM
     * @param parent
     * @param name
     * @param attributes
     * @returns {Element}
     */
    static addElement(parent, name, attributes = {}) {
      let element = document.createElementNS(SVG_NAMESPACE, name);
      if (name === "use") {
        attributes["xlink:href"] = attributes["href"];
      }
      for (let attribute in attributes) {
        if (attributes.hasOwnProperty(attribute)) {
          if (attribute.indexOf(":") !== -1) {
            const value = attribute.split(":");
            element.setAttributeNS("http://www.w3.org/1999/" + value[0], value[1], attributes[attribute]);
          } else {
            element.setAttribute(attribute, attributes[attribute]);
          }
        }
      }
      parent.appendChild(element);
      return element;
    }
    /**
     * Remove an element from an SVG DOM
     * @param element
     */
    static removeElement(element) {
      if (!element) {
        console.warn("removeElement, element is", element);
        return;
      }
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      } else {
        console.warn(element, "without parentNode");
      }
    }
  };

  // public/vendor/cm-chessboard/src/model/Extension.js
  var EXTENSION_POINT = {
    positionChanged: "positionChanged",
    // the positions of the pieces was changed
    boardChanged: "boardChanged",
    // the board (orientation) was changed
    moveInputToggled: "moveInputToggled",
    // move input was enabled or disabled
    moveInput: "moveInput",
    // move started, moving over a square, validating or canceled
    beforeRedrawBoard: "beforeRedrawBoard",
    // called before redrawing the board
    afterRedrawBoard: "afterRedrawBoard",
    // called after redrawing the board
    redrawBoard: "redrawBoard",
    // called after redrawing the board, DEPRECATED, use afterRedrawBoard 2023-09-18
    animation: "animation",
    // called on animation start, end, and on every animation frame
    destroy: "destroy"
    // called, before the board is destroyed
  };

  // public/vendor/cm-chessboard/src/lib/Utils.js
  var Utils = class _Utils {
    static delegate(element, eventName, selector, handler) {
      const eventListener = function(event) {
        const match = event.target.closest(selector);
        if (match && this.contains(match)) {
          handler.call(match, event);
        }
      };
      element.addEventListener(eventName, eventListener);
      return {
        remove: function() {
          element.removeEventListener(eventName, eventListener);
        }
      };
    }
    static mergeObjects(target, source) {
      const isObject = (obj) => obj && typeof obj === "object";
      if (!isObject(target) || !isObject(source)) {
        return source;
      }
      for (const key of Object.keys(source)) {
        if (source[key] instanceof Object) {
          Object.assign(source[key], _Utils.mergeObjects(target[key], source[key]));
        }
      }
      Object.assign(target || {}, source);
      return target;
    }
    static createDomElement(html) {
      const template = document.createElement("template");
      template.innerHTML = html.trim();
      return template.content.firstChild;
    }
    static createTask() {
      let resolve, reject;
      const promise = new Promise(function(_resolve, _reject) {
        resolve = _resolve;
        reject = _reject;
      });
      promise.resolve = resolve;
      promise.reject = reject;
      return promise;
    }
    static isAbsoluteUrl(url) {
      return url.indexOf("://") !== -1 || url.startsWith("/");
    }
  };

  // public/vendor/cm-chessboard/src/view/PositionAnimationsQueue.js
  var ANIMATION_EVENT_TYPE = {
    start: "start",
    frame: "frame",
    end: "end"
  };
  var PromiseQueue = class {
    constructor() {
      this.queue = [];
      this.workingOnPromise = false;
      this.stop = false;
    }
    async enqueue(promise) {
      return new Promise((resolve, reject) => {
        this.queue.push({
          promise,
          resolve,
          reject
        });
        this.dequeue();
      });
    }
    dequeue() {
      if (this.workingOnPromise) {
        return;
      }
      if (this.stop) {
        this.queue = [];
        this.stop = false;
        return;
      }
      const entry = this.queue.shift();
      if (!entry) {
        return;
      }
      try {
        this.workingOnPromise = true;
        entry.promise().then((value) => {
          this.workingOnPromise = false;
          entry.resolve(value);
          this.dequeue();
        }).catch((err) => {
          this.workingOnPromise = false;
          entry.reject(err);
          this.dequeue();
        });
      } catch (err) {
        this.workingOnPromise = false;
        entry.reject(err);
        this.dequeue();
      }
      return true;
    }
    destroy() {
      this.stop = true;
    }
  };
  var CHANGE_TYPE = {
    move: 0,
    appear: 1,
    disappear: 2
  };
  var PositionsAnimation = class _PositionsAnimation {
    constructor(view, fromPosition, toPosition, duration, callback) {
      this.view = view;
      if (fromPosition && toPosition) {
        this.animatedElements = this.createAnimation(fromPosition.squares, toPosition.squares);
        this.duration = duration;
        this.callback = callback;
        this.frameHandle = requestAnimationFrame(this.animationStep.bind(this));
      } else {
        console.error("fromPosition", fromPosition, "toPosition", toPosition);
      }
      this.view.positionsAnimationTask = Utils.createTask();
      this.view.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.animation, {
        type: ANIMATION_EVENT_TYPE.start
      });
    }
    static seekChanges(fromSquares, toSquares) {
      const appearedList = [], disappearedList = [], changes = [];
      for (let i = 0; i < 64; i++) {
        const previousSquare = fromSquares[i];
        const newSquare = toSquares[i];
        if (newSquare !== previousSquare) {
          if (newSquare) {
            appearedList.push({ piece: newSquare, index: i });
          }
          if (previousSquare) {
            disappearedList.push({ piece: previousSquare, index: i });
          }
        }
      }
      appearedList.forEach((appeared) => {
        let shortestDistance = 8;
        let foundMoved = null;
        disappearedList.forEach((disappeared) => {
          if (appeared.piece === disappeared.piece) {
            const moveDistance = _PositionsAnimation.squareDistance(appeared.index, disappeared.index);
            if (moveDistance < shortestDistance) {
              foundMoved = disappeared;
              shortestDistance = moveDistance;
            }
          }
        });
        if (foundMoved) {
          disappearedList.splice(disappearedList.indexOf(foundMoved), 1);
          changes.push({
            type: CHANGE_TYPE.move,
            piece: appeared.piece,
            atIndex: foundMoved.index,
            toIndex: appeared.index
          });
        } else {
          changes.push({ type: CHANGE_TYPE.appear, piece: appeared.piece, atIndex: appeared.index });
        }
      });
      disappearedList.forEach((disappeared) => {
        changes.push({ type: CHANGE_TYPE.disappear, piece: disappeared.piece, atIndex: disappeared.index });
      });
      return changes;
    }
    createAnimation(fromSquares, toSquares) {
      const changes = _PositionsAnimation.seekChanges(fromSquares, toSquares);
      const animatedElements = [];
      changes.forEach((change) => {
        const animatedItem = {
          type: change.type
        };
        switch (change.type) {
          case CHANGE_TYPE.move:
            animatedItem.element = this.view.getPieceElement(Position.indexToSquare(change.atIndex));
            animatedItem.element.parentNode.appendChild(animatedItem.element);
            animatedItem.atPoint = this.view.indexToPoint(change.atIndex);
            animatedItem.toPoint = this.view.indexToPoint(change.toIndex);
            break;
          case CHANGE_TYPE.appear:
            animatedItem.element = this.view.drawPieceOnSquare(Position.indexToSquare(change.atIndex), change.piece);
            animatedItem.element.style.opacity = 0;
            break;
          case CHANGE_TYPE.disappear:
            animatedItem.element = this.view.getPieceElement(Position.indexToSquare(change.atIndex));
            break;
        }
        animatedElements.push(animatedItem);
      });
      return animatedElements;
    }
    animationStep(time) {
      if (!this.view || !this.view.chessboard.state) {
        return;
      }
      if (!this.startTime) {
        this.startTime = time;
      }
      const timeDiff = time - this.startTime;
      if (timeDiff <= this.duration) {
        this.frameHandle = requestAnimationFrame(this.animationStep.bind(this));
      } else {
        cancelAnimationFrame(this.frameHandle);
        this.animatedElements.forEach((animatedItem) => {
          if (animatedItem.type === CHANGE_TYPE.disappear) {
            Svg.removeElement(animatedItem.element);
          }
        });
        this.view.positionsAnimationTask.resolve();
        this.view.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.animation, {
          type: ANIMATION_EVENT_TYPE.end
        });
        this.callback();
        return;
      }
      const t = Math.min(1, timeDiff / this.duration);
      let progress = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      if (isNaN(progress) || progress > 0.99) {
        progress = 1;
      }
      this.animatedElements.forEach((animatedItem) => {
        if (animatedItem.element) {
          switch (animatedItem.type) {
            case CHANGE_TYPE.move:
              animatedItem.element.transform.baseVal.removeItem(0);
              const transform = this.view.svg.createSVGTransform();
              transform.setTranslate(
                animatedItem.atPoint.x + (animatedItem.toPoint.x - animatedItem.atPoint.x) * progress,
                animatedItem.atPoint.y + (animatedItem.toPoint.y - animatedItem.atPoint.y) * progress
              );
              animatedItem.element.transform.baseVal.appendItem(transform);
              break;
            case CHANGE_TYPE.appear:
              animatedItem.element.style.opacity = Math.round(progress * 100) / 100;
              break;
            case CHANGE_TYPE.disappear:
              animatedItem.element.style.opacity = Math.round((1 - progress) * 100) / 100;
              break;
          }
        } else {
          console.warn("animatedItem has no element", animatedItem);
        }
      });
      this.view.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.animation, {
        type: ANIMATION_EVENT_TYPE.frame,
        progress
      });
    }
    static squareDistance(index1, index2) {
      const file1 = index1 % 8;
      const rank1 = Math.floor(index1 / 8);
      const file2 = index2 % 8;
      const rank2 = Math.floor(index2 / 8);
      return Math.max(Math.abs(rank2 - rank1), Math.abs(file2 - file1));
    }
  };
  var PositionAnimationsQueue = class extends PromiseQueue {
    constructor(chessboard) {
      super();
      this.chessboard = chessboard;
    }
    async enqueuePositionChange(positionFrom, positionTo, animated) {
      if (positionFrom.getFen() === positionTo.getFen()) {
        return super.enqueue(() => Promise.resolve());
      } else {
        return super.enqueue(() => new Promise((resolve) => {
          let duration = animated ? this.chessboard.props.style.animationDuration : 0;
          if (this.queue.length > 0) {
            duration = duration / (1 + Math.pow(this.queue.length / 5, 2));
          }
          new PositionsAnimation(
            this.chessboard.view,
            positionFrom,
            positionTo,
            animated ? duration : 0,
            () => {
              if (this.chessboard.view) {
                this.chessboard.view.redrawPieces(positionTo.squares);
              }
              resolve();
            }
          );
        }));
      }
    }
    async enqueueTurnBoard(position, color, animated) {
      return super.enqueue(() => new Promise((resolve) => {
        const emptyPosition = new Position(FEN.empty);
        let duration = animated ? this.chessboard.props.style.animationDuration : 0;
        if (this.queue.length > 0) {
          duration = duration / (1 + Math.pow(this.queue.length / 5, 2));
        }
        new PositionsAnimation(
          this.chessboard.view,
          position,
          emptyPosition,
          animated ? duration : 0,
          () => {
            this.chessboard.state.orientation = color;
            this.chessboard.view.redrawBoard();
            this.chessboard.view.redrawPieces(emptyPosition.squares);
            new PositionsAnimation(
              this.chessboard.view,
              emptyPosition,
              position,
              animated ? duration : 0,
              () => {
                this.chessboard.view.redrawPieces(position.squares);
                resolve();
              }
            );
          }
        );
      }));
    }
  };

  // public/vendor/cm-chessboard/src/view/VisualMoveInput.js
  var MOVE_INPUT_STATE = {
    waitForInputStart: "waitForInputStart",
    pieceClickedThreshold: "pieceClickedThreshold",
    clickTo: "clickTo",
    secondClickThreshold: "secondClickThreshold",
    dragTo: "dragTo",
    clickDragTo: "clickDragTo",
    moveDone: "moveDone",
    reset: "reset"
  };
  var MOVE_CANCELED_REASON = {
    secondClick: "secondClick",
    // clicked the same piece
    secondaryClick: "secondaryClick",
    // right click while moving
    movedOutOfBoard: "movedOutOfBoard",
    draggedBack: "draggedBack",
    // dragged to the start square
    clickedAnotherPiece: "clickedAnotherPiece",
    // of the same color
    touchCanceled: "touchCanceled",
    movedPieceChanged: "movedPieceChanged",
    // the held piece changed on the board, most likely got captured
    canceled: "canceled"
    // cancelled programmatically via chessboard.cancelMoveInput()
  };
  var DRAG_THRESHOLD = 4;
  var VisualMoveInput = class {
    constructor(view) {
      this.view = view;
      this.chessboard = view.chessboard;
      this.moveInputState = null;
      this.fromSquare = null;
      this.toSquare = null;
      this.movedPiece = null;
      this.setMoveInputState(MOVE_INPUT_STATE.waitForInputStart);
    }
    moveInputStartedCallback(square) {
      const result = this.view.moveInputStartedCallback(square);
      if (result) {
        this.chessboard.state.moveInputProcess = Utils.createTask();
        this.chessboard.state.moveInputProcess.then((result2) => {
          if (this.moveInputState === MOVE_INPUT_STATE.waitForInputStart || this.moveInputState === MOVE_INPUT_STATE.moveDone) {
            this.view.moveInputFinishedCallback(this.fromSquare, this.toSquare, result2);
          }
        });
      }
      return result;
    }
    movingOverSquareCallback(fromSquare, toSquare) {
      this.view.movingOverSquareCallback(fromSquare, toSquare);
    }
    validateMoveInputCallback(fromSquare, toSquare) {
      const result = this.view.validateMoveInputCallback(fromSquare, toSquare);
      this.chessboard.state.moveInputProcess.resolve(result);
      return result;
    }
    moveInputCanceledCallback(fromSquare, toSquare, reason) {
      this.view.moveInputCanceledCallback(fromSquare, toSquare, reason);
      this.chessboard.state.moveInputProcess.resolve();
    }
    setMoveInputState(newState, params = void 0) {
      const prevState = this.moveInputState;
      this.moveInputState = newState;
      switch (newState) {
        case MOVE_INPUT_STATE.waitForInputStart:
          break;
        case MOVE_INPUT_STATE.pieceClickedThreshold:
          if (MOVE_INPUT_STATE.waitForInputStart !== prevState && MOVE_INPUT_STATE.clickTo !== prevState) {
            throw new Error("moveInputState");
          }
          if (this.pointerMoveListener) {
            removeEventListener(this.pointerMoveListener.type, this.pointerMoveListener);
            this.pointerMoveListener = null;
          }
          if (this.pointerUpListener) {
            removeEventListener(this.pointerUpListener.type, this.pointerUpListener);
            this.pointerUpListener = null;
          }
          if (this.pointerCancelListener) {
            removeEventListener(this.pointerCancelListener.type, this.pointerCancelListener);
            this.pointerCancelListener = null;
          }
          this.fromSquare = params.square;
          this.toSquare = null;
          this.movedPiece = params.piece;
          this.startPoint = params.point;
          if (!this.pointerMoveListener && !this.pointerUpListener) {
            if (params.type === "mousedown") {
              this.pointerMoveListener = this.onPointerMove.bind(this);
              this.pointerMoveListener.type = "mousemove";
              addEventListener("mousemove", this.pointerMoveListener);
              this.pointerUpListener = this.onPointerUp.bind(this);
              this.pointerUpListener.type = "mouseup";
              addEventListener("mouseup", this.pointerUpListener);
            } else if (params.type === "touchstart") {
              this.pointerMoveListener = this.onPointerMove.bind(this);
              this.pointerMoveListener.type = "touchmove";
              addEventListener("touchmove", this.pointerMoveListener);
              this.pointerUpListener = this.onPointerUp.bind(this);
              this.pointerUpListener.type = "touchend";
              addEventListener("touchend", this.pointerUpListener);
              this.pointerCancelListener = this.onPointerCancel.bind(this);
              this.pointerCancelListener.type = "touchcancel";
              addEventListener("touchcancel", this.pointerCancelListener);
            } else {
              throw Error("4b74af");
            }
            if (!this.contextMenuListener) {
              this.contextMenuListener = this.onContextMenu.bind(this);
              this.chessboard.view.svg.addEventListener("contextmenu", this.contextMenuListener);
            }
          } else {
            throw Error("94ad0c");
          }
          break;
        case MOVE_INPUT_STATE.clickTo:
          if (this.draggablePiece) {
            Svg.removeElement(this.draggablePiece);
            this.draggablePiece = null;
          }
          if (prevState === MOVE_INPUT_STATE.dragTo) {
            this.view.setPieceVisibility(params.square, true);
          }
          break;
        case MOVE_INPUT_STATE.secondClickThreshold:
          if (MOVE_INPUT_STATE.clickTo !== prevState) {
            throw new Error("moveInputState");
          }
          this.startPoint = params.point;
          break;
        case MOVE_INPUT_STATE.dragTo:
          if (MOVE_INPUT_STATE.pieceClickedThreshold !== prevState) {
            throw new Error("moveInputState");
          }
          if (this.view.chessboard.state.inputEnabled()) {
            this.view.setPieceVisibility(params.square, false);
            this.createDraggablePiece(params.piece);
          }
          break;
        case MOVE_INPUT_STATE.clickDragTo:
          if (MOVE_INPUT_STATE.secondClickThreshold !== prevState) {
            throw new Error("moveInputState");
          }
          if (this.view.chessboard.state.inputEnabled()) {
            this.view.setPieceVisibility(params.square, false);
            this.createDraggablePiece(params.piece);
          }
          break;
        case MOVE_INPUT_STATE.moveDone:
          if ([MOVE_INPUT_STATE.dragTo, MOVE_INPUT_STATE.clickTo, MOVE_INPUT_STATE.clickDragTo].indexOf(prevState) === -1) {
            throw new Error("moveInputState");
          }
          this.toSquare = params.square;
          const validated = params.validated !== void 0 ? params.validated : this.validateMoveInputCallback(this.fromSquare, this.toSquare);
          if (this.toSquare && validated) {
            const animate = prevState === MOVE_INPUT_STATE.clickTo && this.chessboard.state.moveInputAnimate !== false;
            this.chessboard.movePiece(this.fromSquare, this.toSquare, animate).then(() => {
              if (prevState === MOVE_INPUT_STATE.clickTo) {
                this.view.setPieceVisibility(this.toSquare, true);
              }
              this.setMoveInputState(MOVE_INPUT_STATE.reset);
            });
          } else {
            this.view.setPieceVisibility(this.fromSquare, true);
            this.setMoveInputState(MOVE_INPUT_STATE.reset);
          }
          break;
        case MOVE_INPUT_STATE.reset:
          if (this.fromSquare && !this.toSquare && this.movedPiece) {
            this.chessboard.state.position.setPiece(this.fromSquare, this.movedPiece);
          }
          this.fromSquare = null;
          this.toSquare = null;
          this.movedPiece = null;
          if (this.draggablePiece) {
            Svg.removeElement(this.draggablePiece);
            this.draggablePiece = null;
          }
          if (this.pointerMoveListener) {
            removeEventListener(this.pointerMoveListener.type, this.pointerMoveListener);
            this.pointerMoveListener = null;
          }
          if (this.pointerUpListener) {
            removeEventListener(this.pointerUpListener.type, this.pointerUpListener);
            this.pointerUpListener = null;
          }
          if (this.pointerCancelListener) {
            removeEventListener(this.pointerCancelListener.type, this.pointerCancelListener);
            this.pointerCancelListener = null;
          }
          if (this.contextMenuListener) {
            this.chessboard.view.svg.removeEventListener("contextmenu", this.contextMenuListener);
            this.contextMenuListener = null;
          }
          this.setMoveInputState(MOVE_INPUT_STATE.waitForInputStart);
          const hiddenPieces = this.view.piecesGroup.querySelectorAll("[visibility=hidden]");
          for (let i = 0; i < hiddenPieces.length; i++) {
            hiddenPieces[i].removeAttribute("visibility");
          }
          break;
        default:
          throw Error(`260b09: moveInputState ${newState}`);
      }
    }
    createDraggablePiece(pieceName) {
      if (this.draggablePiece) {
        throw Error("draggablePiece already exists");
      }
      this.draggablePiece = Svg.createSvg(document.body);
      this.draggablePiece.classList.add("cm-chessboard-draggable-piece");
      this.draggablePiece.setAttribute("width", this.view.squareWidth);
      this.draggablePiece.setAttribute("height", this.view.squareHeight);
      this.draggablePiece.setAttribute("style", "pointer-events: none");
      this.draggablePiece.name = pieceName;
      const spriteUrl = this.chessboard.props.assetsCache ? "" : this.view.getSpriteUrl();
      const piece = Svg.addElement(this.draggablePiece, "use", {
        href: `${spriteUrl}#${pieceName}`
      });
      const scaling = this.view.squareHeight / this.chessboard.props.style.pieces.tileSize;
      const transformScale = this.draggablePiece.createSVGTransform();
      transformScale.setScale(scaling, scaling);
      piece.transform.baseVal.appendItem(transformScale);
    }
    moveDraggablePiece(x, y) {
      this.draggablePiece.setAttribute(
        "style",
        `pointer-events: none; position: absolute; left: ${x - this.view.squareHeight / 2}px; top: ${y - this.view.squareHeight / 2}px`
      );
    }
    onPointerDown(e) {
      if (!(e.type === "mousedown" && e.button === 0 || e.type === "touchstart")) {
        return;
      }
      const square = e.target.getAttribute("data-square");
      if (!square) {
        return;
      }
      const pieceName = this.chessboard.getPiece(square);
      let color;
      if (pieceName) {
        color = pieceName ? pieceName.substring(0, 1) : null;
        if (color === "w" && this.chessboard.state.inputWhiteEnabled || color === "b" && this.chessboard.state.inputBlackEnabled) {
          e.preventDefault();
        }
      }
      if (this.moveInputState !== MOVE_INPUT_STATE.waitForInputStart || this.chessboard.state.inputWhiteEnabled && color === "w" || this.chessboard.state.inputBlackEnabled && color === "b") {
        let point;
        if (e.type === "mousedown") {
          point = { x: e.clientX, y: e.clientY };
        } else if (e.type === "touchstart") {
          point = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (this.moveInputState === MOVE_INPUT_STATE.waitForInputStart && pieceName && this.moveInputStartedCallback(square)) {
          this.setMoveInputState(MOVE_INPUT_STATE.pieceClickedThreshold, {
            square,
            piece: pieceName,
            point,
            type: e.type
          });
        } else if (this.moveInputState === MOVE_INPUT_STATE.clickTo) {
          if (square === this.fromSquare) {
            this.setMoveInputState(MOVE_INPUT_STATE.secondClickThreshold, {
              square,
              piece: pieceName,
              point,
              type: e.type
            });
          } else {
            const pieceName2 = this.chessboard.getPiece(square);
            const pieceColor = pieceName2 ? pieceName2.substring(0, 1) : null;
            const startPieceName = this.chessboard.getPiece(this.fromSquare);
            const startPieceColor = startPieceName ? startPieceName.substring(0, 1) : null;
            if (color && startPieceColor === pieceColor) {
              const result = this.validateMoveInputCallback(this.fromSquare, square);
              if (!result) {
                this.moveInputCanceledCallback(this.fromSquare, square, MOVE_CANCELED_REASON.clickedAnotherPiece);
                if (this.moveInputStartedCallback(square)) {
                  this.setMoveInputState(MOVE_INPUT_STATE.pieceClickedThreshold, {
                    square,
                    piece: pieceName2,
                    point,
                    type: e.type
                  });
                } else {
                  this.setMoveInputState(MOVE_INPUT_STATE.reset);
                }
              } else {
                this.setMoveInputState(MOVE_INPUT_STATE.moveDone, { square, validated: true });
              }
            } else {
              this.setMoveInputState(MOVE_INPUT_STATE.moveDone, { square });
            }
          }
        }
      }
    }
    onPointerMove(e) {
      let pageX, pageY, clientX, clientY, target;
      if (e.type === "mousemove") {
        clientX = e.clientX;
        clientY = e.clientY;
        pageX = e.pageX;
        pageY = e.pageY;
        target = e.target;
      } else if (e.type === "touchmove") {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        pageX = e.touches[0].pageX;
        pageY = e.touches[0].pageY;
        target = document.elementFromPoint(clientX, clientY);
      }
      if (this.moveInputState === MOVE_INPUT_STATE.pieceClickedThreshold || this.moveInputState === MOVE_INPUT_STATE.secondClickThreshold) {
        if (Math.abs(this.startPoint.x - clientX) > DRAG_THRESHOLD || Math.abs(this.startPoint.y - clientY) > DRAG_THRESHOLD) {
          if (this.moveInputState === MOVE_INPUT_STATE.secondClickThreshold) {
            this.setMoveInputState(MOVE_INPUT_STATE.clickDragTo, {
              square: this.fromSquare,
              piece: this.movedPiece
            });
          } else {
            this.setMoveInputState(MOVE_INPUT_STATE.dragTo, { square: this.fromSquare, piece: this.movedPiece });
          }
          if (this.view.chessboard.state.inputEnabled()) {
            this.moveDraggablePiece(pageX, pageY);
          }
        }
      } else if (this.moveInputState === MOVE_INPUT_STATE.dragTo || this.moveInputState === MOVE_INPUT_STATE.clickDragTo || this.moveInputState === MOVE_INPUT_STATE.clickTo) {
        if (target && target.getAttribute && target.parentElement === this.view.boardGroup) {
          const square = target.getAttribute("data-square");
          if (square !== this.fromSquare && square !== this.toSquare) {
            this.toSquare = square;
            this.movingOverSquareCallback(this.fromSquare, this.toSquare);
          } else if (square === this.fromSquare && this.toSquare !== null) {
            this.toSquare = null;
            this.movingOverSquareCallback(this.fromSquare, null);
          }
        } else if (this.toSquare !== null) {
          this.toSquare = null;
          this.movingOverSquareCallback(this.fromSquare, null);
        }
        if (this.view.chessboard.state.inputEnabled() && (this.moveInputState === MOVE_INPUT_STATE.dragTo || this.moveInputState === MOVE_INPUT_STATE.clickDragTo)) {
          this.moveDraggablePiece(pageX, pageY);
        }
      }
    }
    onPointerUp(e) {
      let target;
      if (e.type === "mouseup") {
        target = e.target;
      } else if (e.type === "touchend") {
        target = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
      if (target && target.getAttribute) {
        const square = target.getAttribute("data-square");
        if (square) {
          if (this.moveInputState === MOVE_INPUT_STATE.dragTo || this.moveInputState === MOVE_INPUT_STATE.clickDragTo) {
            if (this.fromSquare === square) {
              this.chessboard.state.position.setPiece(this.fromSquare, this.movedPiece);
              this.view.setPieceVisibility(this.fromSquare);
              this.moveInputCanceledCallback(square, null, MOVE_CANCELED_REASON.draggedBack);
              this.setMoveInputState(MOVE_INPUT_STATE.reset);
            } else {
              this.setMoveInputState(MOVE_INPUT_STATE.moveDone, { square });
            }
          } else if (this.moveInputState === MOVE_INPUT_STATE.pieceClickedThreshold) {
            this.setMoveInputState(MOVE_INPUT_STATE.clickTo, { square });
          } else if (this.moveInputState === MOVE_INPUT_STATE.secondClickThreshold) {
            this.setMoveInputState(MOVE_INPUT_STATE.reset);
            this.moveInputCanceledCallback(square, null, MOVE_CANCELED_REASON.secondClick);
          }
        } else {
          this.view.redrawPieces();
          const moveStartSquare = this.fromSquare;
          this.setMoveInputState(MOVE_INPUT_STATE.reset);
          this.moveInputCanceledCallback(moveStartSquare, null, MOVE_CANCELED_REASON.movedOutOfBoard);
        }
      } else {
        this.view.redrawPieces();
        this.setMoveInputState(MOVE_INPUT_STATE.reset);
      }
    }
    onPointerCancel() {
      this.view.redrawPieces();
      const moveStartSquare = this.fromSquare;
      this.setMoveInputState(MOVE_INPUT_STATE.reset);
      this.moveInputCanceledCallback(moveStartSquare, null, MOVE_CANCELED_REASON.touchCanceled);
    }
    onContextMenu(e) {
      e.preventDefault();
      this.view.redrawPieces();
      this.setMoveInputState(MOVE_INPUT_STATE.reset);
      this.moveInputCanceledCallback(this.fromSquare, null, MOVE_CANCELED_REASON.secondaryClick);
    }
    // Cancel a move input that is currently in progress. No-op when idle.
    cancelMoveInput() {
      if (this.moveInputState !== MOVE_INPUT_STATE.waitForInputStart) {
        const moveStartSquare = this.fromSquare;
        this.view.redrawPieces();
        this.setMoveInputState(MOVE_INPUT_STATE.reset);
        this.moveInputCanceledCallback(moveStartSquare, null, MOVE_CANCELED_REASON.canceled);
      }
    }
    // Called after the board position changed (setPosition/movePiece/setPiece).
    // If the piece we are holding changed on its square — most likely captured
    // by an external position update — cancel the in-progress move input.
    positionChanged() {
      const holdingStates = [
        MOVE_INPUT_STATE.pieceClickedThreshold,
        MOVE_INPUT_STATE.clickTo,
        MOVE_INPUT_STATE.secondClickThreshold,
        MOVE_INPUT_STATE.dragTo,
        MOVE_INPUT_STATE.clickDragTo
      ];
      if (this.fromSquare && holdingStates.includes(this.moveInputState) && this.chessboard.getPiece(this.fromSquare) !== this.movedPiece) {
        const moveStartSquare = this.fromSquare;
        this.movedPiece = null;
        this.setMoveInputState(MOVE_INPUT_STATE.reset);
        this.moveInputCanceledCallback(moveStartSquare, null, MOVE_CANCELED_REASON.movedPieceChanged);
      }
    }
    isDragging() {
      return this.moveInputState === MOVE_INPUT_STATE.dragTo || this.moveInputState === MOVE_INPUT_STATE.clickDragTo;
    }
    destroy() {
      this.setMoveInputState(MOVE_INPUT_STATE.reset);
    }
  };

  // public/vendor/cm-chessboard/src/view/ChessboardView.js
  var COLOR = {
    white: "w",
    black: "b"
  };
  var INPUT_EVENT_TYPE = {
    moveInputStarted: "moveInputStarted",
    movingOverSquare: "movingOverSquare",
    // while dragging or hover after click
    validateMoveInput: "validateMoveInput",
    moveInputCanceled: "moveInputCanceled",
    moveInputFinished: "moveInputFinished"
  };
  var POINTER_EVENTS = {
    pointercancel: "pointercancel",
    pointerdown: "pointerdown",
    pointerenter: "pointerenter",
    pointerleave: "pointerleave",
    pointermove: "pointermove",
    pointerout: "pointerout",
    pointerover: "pointerover",
    pointerup: "pointerup"
  };
  var BORDER_TYPE = {
    none: "none",
    // no border
    thin: "thin",
    // thin border
    frame: "frame"
    // wide border with coordinates in it
  };
  var ChessboardView = class {
    constructor(chessboard) {
      this.chessboard = chessboard;
      this.visualMoveInput = new VisualMoveInput(this);
      if (chessboard.props.assetsCache) {
        this.cacheSpriteToDiv("cm-chessboard-sprite", this.getSpriteUrl());
      }
      this.container = document.createElement("div");
      this.chessboard.context.appendChild(this.container);
      if (chessboard.props.responsive) {
        if (typeof ResizeObserver !== "undefined") {
          this.resizeObserver = new ResizeObserver(() => {
            this.resizeTimeout = setTimeout(() => {
              this.resizeTimeout = null;
              this.handleResize();
            });
          });
          this.resizeObserver.observe(this.chessboard.context);
        } else {
          this.resizeListener = this.handleResize.bind(this);
          window.addEventListener("resize", this.resizeListener);
        }
      }
      this.positionsAnimationTask = Promise.resolve();
      this.pointerDownListener = this.pointerDownHandler.bind(this);
      this.container.addEventListener("mousedown", this.pointerDownListener);
      this.container.addEventListener("touchstart", this.pointerDownListener, { passive: false });
      this.contextMenuListener = (e) => e.preventDefault();
      this.container.addEventListener("contextmenu", this.contextMenuListener);
      this.createSvgAndGroups();
      this.handleResize();
    }
    pointerDownHandler(e) {
      this.visualMoveInput.onPointerDown(e);
    }
    destroy() {
      this.visualMoveInput.destroy();
      if (this.resizeObserver) {
        this.resizeObserver.unobserve(this.chessboard.context);
      }
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = null;
      }
      if (this.resizeListener) {
        window.removeEventListener("resize", this.resizeListener);
      }
      this.container.removeEventListener("mousedown", this.pointerDownListener);
      this.container.removeEventListener("touchstart", this.pointerDownListener);
      this.container.removeEventListener("contextmenu", this.contextMenuListener);
      Svg.removeElement(this.svg);
      this.container.remove();
    }
    // Sprite //
    cacheSpriteToDiv(wrapperId, url) {
      if (!document.getElementById(wrapperId)) {
        const wrapper = document.createElement("div");
        wrapper.style.transform = "scale(0)";
        wrapper.style.position = "absolute";
        wrapper.setAttribute("aria-hidden", "true");
        wrapper.id = wrapperId;
        document.body.appendChild(wrapper);
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function() {
          wrapper.insertAdjacentHTML("afterbegin", xhr.response);
        };
        xhr.send();
      }
    }
    createSvgAndGroups() {
      this.svg = Svg.createSvg(this.container);
      let cssClass = this.chessboard.props.style.cssClass ? this.chessboard.props.style.cssClass : "default";
      this.svg.setAttribute("class", "cm-chessboard border-type-" + this.chessboard.props.style.borderType + " " + cssClass);
      this.svg.setAttribute("role", "img");
      this.updateMetrics();
      this.boardGroup = Svg.addElement(this.svg, "g", { class: "board" });
      this.coordinatesGroup = Svg.addElement(this.svg, "g", { class: "coordinates", "aria-hidden": "true" });
      this.markersLayer = Svg.addElement(this.svg, "g", { class: "markers-layer" });
      this.piecesLayer = Svg.addElement(this.svg, "g", { class: "pieces-layer" });
      this.piecesGroup = Svg.addElement(this.piecesLayer, "g", { class: "pieces" });
      this.markersTopLayer = Svg.addElement(this.svg, "g", { class: "markers-top-layer" });
      this.interactiveTopLayer = Svg.addElement(this.svg, "g", { class: "interactive-top-layer" });
    }
    updateMetrics() {
      const piecesTileSize = this.chessboard.props.style.pieces.tileSize;
      this.width = this.container.clientWidth;
      this.height = this.container.clientWidth * (this.chessboard.props.style.aspectRatio || 1);
      if (this.chessboard.props.style.borderType === BORDER_TYPE.frame) {
        this.borderSize = this.width / 25;
      } else if (this.chessboard.props.style.borderType === BORDER_TYPE.thin) {
        this.borderSize = this.width / 320;
      } else {
        this.borderSize = 0;
      }
      this.innerWidth = this.width - 2 * this.borderSize;
      this.innerHeight = this.height - 2 * this.borderSize;
      this.squareWidth = this.innerWidth / 8;
      this.squareHeight = this.innerHeight / 8;
      this.scalingX = this.squareWidth / piecesTileSize;
      this.scalingY = this.squareHeight / piecesTileSize;
      this.pieceXTranslate = this.squareWidth / 2 - piecesTileSize * this.scalingY / 2;
    }
    handleResize() {
      if (!this.chessboard || !this.chessboard.state) {
        return;
      }
      this.container.style.width = this.chessboard.context.clientWidth + "px";
      this.container.style.height = this.chessboard.context.clientWidth * this.chessboard.props.style.aspectRatio + "px";
      if (this.container.clientWidth !== this.width || this.container.clientHeight !== this.height) {
        this.updateMetrics();
        this.redrawBoard();
        this.redrawPieces();
      }
      this.svg.setAttribute("width", "100%");
      this.svg.setAttribute("height", "100%");
    }
    redrawBoard() {
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.beforeRedrawBoard);
      this.redrawSquares();
      this.drawCoordinates();
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.afterRedrawBoard);
      this.visualizeInputState();
    }
    // Board //
    redrawSquares() {
      while (this.boardGroup.firstChild) {
        this.boardGroup.removeChild(this.boardGroup.lastChild);
      }
      let boardBorder = Svg.addElement(this.boardGroup, "rect", { width: this.width, height: this.height });
      boardBorder.setAttribute("class", "border");
      if (this.chessboard.props.style.borderType === BORDER_TYPE.frame) {
        const innerPos = this.borderSize;
        let borderInner = Svg.addElement(this.boardGroup, "rect", {
          x: innerPos,
          y: innerPos,
          width: this.width - innerPos * 2,
          height: this.height - innerPos * 2
        });
        borderInner.setAttribute("class", "border-inner");
      }
      for (let i = 0; i < 64; i++) {
        const index = this.chessboard.state.orientation === COLOR.white ? i : 63 - i;
        const squareColor = (9 * index & 8) === 0 ? "black" : "white";
        const fieldClass = `square ${squareColor}`;
        const point = this.squareToPoint(Position.indexToSquare(index));
        const squareRect = Svg.addElement(this.boardGroup, "rect", {
          x: point.x,
          y: point.y,
          width: this.squareWidth,
          height: this.squareHeight
        });
        squareRect.setAttribute("class", fieldClass);
        squareRect.setAttribute("data-square", Position.indexToSquare(index));
      }
    }
    drawCoordinates() {
      if (!this.chessboard.props.style.showCoordinates) {
        return;
      }
      while (this.coordinatesGroup.firstChild) {
        this.coordinatesGroup.removeChild(this.coordinatesGroup.lastChild);
      }
      const inline = this.chessboard.props.style.borderType !== BORDER_TYPE.frame;
      for (let file = 0; file < 8; file++) {
        let x = this.borderSize + (17 + this.chessboard.props.style.pieces.tileSize * file) * this.scalingX;
        let y = this.height - this.scalingY * 3.5;
        let cssClass = "coordinate file";
        if (inline) {
          x = x + this.scalingX * 15.5;
          cssClass += file % 2 ? " white" : " black";
        }
        const textElement = Svg.addElement(this.coordinatesGroup, "text", {
          class: cssClass,
          x,
          y,
          style: `font-size: ${this.scalingY * 10}px`
        });
        if (this.chessboard.state.orientation === COLOR.white) {
          textElement.textContent = String.fromCharCode(97 + file);
        } else {
          textElement.textContent = String.fromCharCode(104 - file);
        }
      }
      for (let rank = 0; rank < 8; rank++) {
        let x = this.borderSize / 3.7;
        let y = this.borderSize + 25 * this.scalingY + rank * this.squareHeight;
        let cssClass = "coordinate rank";
        if (inline) {
          cssClass += rank % 2 ? " black" : " white";
          if (this.chessboard.props.style.borderType === BORDER_TYPE.frame) {
            x = x + this.scalingX * 10;
            y = y - this.scalingY * 15;
          } else {
            x = x + this.scalingX * 2;
            y = y - this.scalingY * 15;
          }
        }
        const textElement = Svg.addElement(this.coordinatesGroup, "text", {
          class: cssClass,
          x,
          y,
          style: `font-size: ${this.scalingY * 10}px`
        });
        if (this.chessboard.state.orientation === COLOR.white) {
          textElement.textContent = "" + (8 - rank);
        } else {
          textElement.textContent = "" + (1 + rank);
        }
      }
    }
    // Pieces //
    redrawPieces(squares = this.chessboard.state.position.squares) {
      const childNodes = Array.from(this.piecesGroup.childNodes);
      const isDragging = this.visualMoveInput.isDragging();
      for (let i = 0; i < 64; i++) {
        const pieceName = squares[i];
        if (pieceName) {
          const square = Position.indexToSquare(i);
          this.drawPieceOnSquare(square, pieceName, isDragging && square === this.visualMoveInput.fromSquare);
        }
      }
      for (const childNode of childNodes) {
        this.piecesGroup.removeChild(childNode);
      }
    }
    drawPiece(parentGroup, pieceName, point) {
      const pieceGroup = Svg.addElement(parentGroup, "g", {});
      pieceGroup.setAttribute("data-piece", pieceName);
      const transform = this.svg.createSVGTransform();
      transform.setTranslate(point.x, point.y);
      pieceGroup.transform.baseVal.appendItem(transform);
      const spriteUrl = this.chessboard.props.assetsCache ? "" : this.getSpriteUrl();
      const pieceUse = Svg.addElement(pieceGroup, "use", {
        href: `${spriteUrl}#${pieceName}`,
        class: "piece"
      });
      const transformScale = this.svg.createSVGTransform();
      transformScale.setScale(this.scalingY, this.scalingY);
      pieceUse.transform.baseVal.appendItem(transformScale);
      return pieceGroup;
    }
    drawPieceOnSquare(square, pieceName, hidden = false) {
      const pieceGroup = Svg.addElement(this.piecesGroup, "g", {});
      pieceGroup.setAttribute("data-piece", pieceName);
      pieceGroup.setAttribute("data-square", square);
      if (hidden) {
        pieceGroup.setAttribute("visibility", "hidden");
      }
      const point = this.squareToPoint(square);
      const transform = this.svg.createSVGTransform();
      transform.setTranslate(point.x, point.y);
      pieceGroup.transform.baseVal.appendItem(transform);
      const spriteUrl = this.chessboard.props.assetsCache ? "" : this.getSpriteUrl();
      const pieceUse = Svg.addElement(pieceGroup, "use", {
        href: `${spriteUrl}#${pieceName}`,
        class: "piece"
      });
      const transformTranslate = this.svg.createSVGTransform();
      transformTranslate.setTranslate(this.pieceXTranslate, 0);
      pieceUse.transform.baseVal.appendItem(transformTranslate);
      const transformScale = this.svg.createSVGTransform();
      transformScale.setScale(this.scalingY, this.scalingY);
      pieceUse.transform.baseVal.appendItem(transformScale);
      return pieceGroup;
    }
    setPieceVisibility(square, visible = true) {
      const piece = this.getPieceElement(square);
      if (piece) {
        if (visible) {
          piece.setAttribute("visibility", "visible");
        } else {
          piece.setAttribute("visibility", "hidden");
        }
      } else {
        console.warn("no piece on", square);
      }
    }
    getPieceElement(square) {
      if (!square || square.length < 2) {
        console.warn("invalid square", square);
        return null;
      }
      const piece = this.piecesGroup.querySelector(`g[data-square='${square}']`);
      if (!piece) {
        console.warn("no piece on", square);
        return null;
      }
      return piece;
    }
    // enable and disable move input //
    enableMoveInput(eventHandler, color = null) {
      if (this.chessboard.state.moveInputCallback) {
        throw Error("moveInput already enabled");
      }
      if (color === COLOR.white) {
        this.chessboard.state.inputWhiteEnabled = true;
      } else if (color === COLOR.black) {
        this.chessboard.state.inputBlackEnabled = true;
      } else {
        this.chessboard.state.inputWhiteEnabled = true;
        this.chessboard.state.inputBlackEnabled = true;
      }
      this.chessboard.state.moveInputCallback = eventHandler;
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.moveInputToggled, { enabled: true, color });
      this.visualizeInputState();
    }
    disableMoveInput() {
      this.chessboard.state.inputWhiteEnabled = false;
      this.chessboard.state.inputBlackEnabled = false;
      this.chessboard.state.moveInputCallback = null;
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.moveInputToggled, { enabled: false });
      this.visualizeInputState();
    }
    // callbacks //
    moveInputStartedCallback(square) {
      const data = {
        chessboard: this.chessboard,
        type: INPUT_EVENT_TYPE.moveInputStarted,
        square,
        /** square is deprecated, use squareFrom (2023-05-22) */
        squareFrom: square,
        piece: this.chessboard.getPiece(square)
      };
      if (this.chessboard.state.moveInputCallback) {
        data.moveInputCallbackResult = this.chessboard.state.moveInputCallback(data);
      }
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.moveInput, data);
      return data.moveInputCallbackResult;
    }
    movingOverSquareCallback(squareFrom, squareTo) {
      const data = {
        chessboard: this.chessboard,
        type: INPUT_EVENT_TYPE.movingOverSquare,
        squareFrom,
        squareTo,
        piece: this.chessboard.getPiece(squareFrom)
      };
      if (this.chessboard.state.moveInputCallback) {
        data.moveInputCallbackResult = this.chessboard.state.moveInputCallback(data);
      }
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.moveInput, data);
    }
    validateMoveInputCallback(squareFrom, squareTo) {
      const data = {
        chessboard: this.chessboard,
        type: INPUT_EVENT_TYPE.validateMoveInput,
        squareFrom,
        squareTo,
        piece: this.chessboard.getPiece(squareFrom)
      };
      if (this.chessboard.state.moveInputCallback) {
        data.moveInputCallbackResult = this.chessboard.state.moveInputCallback(data);
      }
      this.chessboard.state.moveInputAnimate = data.animate;
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.moveInput, data);
      return data.moveInputCallbackResult;
    }
    moveInputCanceledCallback(squareFrom, squareTo, reason) {
      const data = {
        chessboard: this.chessboard,
        type: INPUT_EVENT_TYPE.moveInputCanceled,
        reason,
        squareFrom,
        squareTo
      };
      if (this.chessboard.state.moveInputCallback) {
        this.chessboard.state.moveInputCallback(data);
      }
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.moveInput, data);
    }
    moveInputFinishedCallback(squareFrom, squareTo, legalMove) {
      const data = {
        chessboard: this.chessboard,
        type: INPUT_EVENT_TYPE.moveInputFinished,
        squareFrom,
        squareTo,
        legalMove
      };
      if (this.chessboard.state.moveInputCallback) {
        this.chessboard.state.moveInputCallback(data);
      }
      this.chessboard.state.invokeExtensionPoints(EXTENSION_POINT.moveInput, data);
    }
    // Helpers //
    visualizeInputState() {
      if (this.chessboard.state) {
        if (this.chessboard.state.inputWhiteEnabled || this.chessboard.state.inputBlackEnabled) {
          this.boardGroup.setAttribute("class", "board input-enabled");
        } else {
          this.boardGroup.setAttribute("class", "board");
        }
      }
    }
    indexToPoint(index) {
      let x, y;
      if (this.chessboard.state.orientation === COLOR.white) {
        x = this.borderSize + index % 8 * this.squareWidth;
        y = this.borderSize + (7 - Math.floor(index / 8)) * this.squareHeight;
      } else {
        x = this.borderSize + (7 - index % 8) * this.squareWidth;
        y = this.borderSize + Math.floor(index / 8) * this.squareHeight;
      }
      return { x, y };
    }
    squareToPoint(square) {
      const index = Position.squareToIndex(square);
      return this.indexToPoint(index);
    }
    getSpriteUrl() {
      if (Utils.isAbsoluteUrl(this.chessboard.props.style.pieces.file)) {
        return this.chessboard.props.style.pieces.file;
      } else {
        return this.chessboard.props.assetsUrl + this.chessboard.props.style.pieces.file;
      }
    }
  };

  // public/vendor/cm-chessboard/src/Chessboard.js
  var PIECES_FILE_TYPE = {
    svgSprite: "svgSprite"
  };
  var Chessboard = class {
    constructor(context, props = {}) {
      if (!context) {
        throw new Error("container element is " + context);
      }
      this.context = context;
      this.id = (Math.random() + 1).toString(36).substring(2, 8);
      this.extensions = [];
      this.props = {
        position: FEN.empty,
        // set position as fen, use FEN.start or FEN.empty as shortcuts
        orientation: COLOR.white,
        // white on bottom
        responsive: true,
        // resize the board automatically to the size of the context element
        assetsUrl: "./assets/",
        // put all css and sprites in this folder, will be ignored for absolute urls of assets files
        assetsCache: true,
        // cache the sprites, deactivate if you want to use multiple pieces sets in one page
        style: {
          cssClass: "default",
          // set the css theme of the board, try "green", "blue" or "chess-club"
          showCoordinates: true,
          // show ranks and files
          borderType: BORDER_TYPE.none,
          // "thin" thin border, "frame" wide border with coordinates in it, "none" no border
          aspectRatio: 1,
          // height/width of the board
          pieces: {
            type: PIECES_FILE_TYPE.svgSprite,
            // pieces are in an SVG sprite, no other type supported for now
            file: "pieces/standard.svg",
            // the filename of the sprite in `assets/pieces/` or an absolute url like `https://…` or `/…`
            tileSize: 40
            // the tile size in the sprite
          },
          animationDuration: 300
          // pieces animation duration in milliseconds. Disable all animations with `0`
        },
        extensions: [
          /* {class: ExtensionClass, props: { ... }} */
        ]
        // add extensions here
      };
      Utils.mergeObjects(this.props, props);
      this.state = new ChessboardState();
      this.view = new ChessboardView(this);
      this.positionAnimationsQueue = new PositionAnimationsQueue(this);
      this.state.orientation = this.props.orientation;
      for (const extensionData of this.props.extensions) {
        this.addExtension(extensionData.class, extensionData.props);
      }
      this.view.redrawBoard();
      this.state.position = new Position(this.props.position);
      this.view.redrawPieces();
      this.state.invokeExtensionPoints(EXTENSION_POINT.positionChanged);
      this.initialized = Promise.resolve();
    }
    // API //
    async setPiece(square, piece, animated = false) {
      const positionFrom = this.state.position.clone();
      this.state.position.setPiece(square, piece);
      this.view.visualMoveInput.positionChanged();
      this.state.invokeExtensionPoints(EXTENSION_POINT.positionChanged);
      return this.positionAnimationsQueue.enqueuePositionChange(positionFrom, this.state.position.clone(), animated);
    }
    async movePiece(squareFrom, squareTo, animated = false) {
      const positionFrom = this.state.position.clone();
      this.state.position.movePiece(squareFrom, squareTo);
      this.view.visualMoveInput.positionChanged();
      this.state.invokeExtensionPoints(EXTENSION_POINT.positionChanged);
      return this.positionAnimationsQueue.enqueuePositionChange(positionFrom, this.state.position.clone(), animated);
    }
    async setPosition(fen, animated = false) {
      const positionFrom = this.state.position.clone();
      const positionTo = new Position(fen);
      if (positionFrom.getFen() !== positionTo.getFen()) {
        this.state.position.setFen(fen);
        this.view.visualMoveInput.positionChanged();
        this.state.invokeExtensionPoints(EXTENSION_POINT.positionChanged);
      }
      return this.positionAnimationsQueue.enqueuePositionChange(positionFrom, this.state.position.clone(), animated);
    }
    async setOrientation(color, animated = false) {
      const position = this.state.position.clone();
      if (this.boardTurning) {
        console.warn("setOrientation is only once in queue allowed");
        return;
      }
      this.boardTurning = true;
      return this.positionAnimationsQueue.enqueueTurnBoard(position, color, animated).then(() => {
        this.boardTurning = false;
        this.state.invokeExtensionPoints(EXTENSION_POINT.boardChanged);
      });
    }
    getPiece(square) {
      return this.state.position.getPiece(square);
    }
    getPosition() {
      return this.state.position.getFen();
    }
    getOrientation() {
      return this.state.orientation;
    }
    enableMoveInput(eventHandler, color = void 0) {
      this.view.enableMoveInput(eventHandler, color);
    }
    disableMoveInput() {
      this.view.disableMoveInput();
    }
    // Cancel a move input that is currently in progress (leaves move input enabled).
    cancelMoveInput() {
      this.view.visualMoveInput.cancelMoveInput();
    }
    isMoveInputEnabled() {
      return this.state.inputWhiteEnabled || this.state.inputBlackEnabled;
    }
    enableSquareSelect(eventType = POINTER_EVENTS.pointerdown, eventHandler) {
      if (!this.squareSelectListener) {
        this.squareSelectListener = function(e) {
          const square = e.target.getAttribute("data-square");
          eventHandler({
            eventType: e.type,
            event: e,
            chessboard: this,
            square
          });
        };
      }
      this.context.addEventListener(eventType, this.squareSelectListener);
      this.state.squareSelectEnabled = true;
      this.view.visualizeInputState();
    }
    disableSquareSelect(eventType) {
      this.context.removeEventListener(eventType, this.squareSelectListener);
      this.squareSelectListener = void 0;
      this.state.squareSelectEnabled = false;
      this.view.visualizeInputState();
    }
    isSquareSelectEnabled() {
      return this.state.squareSelectEnabled;
    }
    addExtension(extensionClass, props) {
      if (this.getExtension(extensionClass)) {
        throw Error('extension "' + extensionClass.name + '" already added');
      }
      this.extensions.push(new extensionClass(this, props));
    }
    getExtension(extensionClass) {
      for (const extension of this.extensions) {
        if (extension instanceof extensionClass) {
          return extension;
        }
      }
      return null;
    }
    destroy() {
      this.state.invokeExtensionPoints(EXTENSION_POINT.destroy);
      this.positionAnimationsQueue.destroy();
      this.view.destroy();
      this.view = void 0;
      this.state = void 0;
    }
  };

  // public/vendor/cm-chessboard/pieces/standard.svg
  var standard_default = '<?xml version="1.0" encoding="UTF-8"?><!--\n\nLICENSE\n=======\n\nChess pieces\n~~~~~~~~~~~~\n\nThe chess pieces in this sprite are copies from Wikimedia Commons\nhttps://commons.wikimedia.org/wiki/Category:SVG_chess_pieces/Standard\n\nLicense: Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)\nhttps://creativecommons.org/licenses/by-sa/3.0/\n\nAuthors:\n- https://en.wikipedia.org/wiki/User:Cburnett\n- https://en.wikipedia.org/wiki/User:Rfc1394\n\nmodified by shaack (https://shaack.com) for the usage in cm-chessboard.\nhttps://github.com/shaack/cm-chessboard\n\n-->\n<svg width="40px" height="40px" viewBox="0 0 40 40" version="1.1" xmlns="http://www.w3.org/2000/svg">\n    <title>cm-chessboard pieces and markers sprite</title>\n    <desc>Chess pieces and markers for the cm-chessboard (https://shaack.com/projekte/cm-chessboard/).</desc>\n\n    <g id="wk" stroke-linecap="round" stroke-linejoin="round" transform="translate(5.000000, 5.000000)" stroke="#000000"\n       stroke-width="1.5">\n        <line x1="15" y1="4.96764706" x2="15" y2="0" id="Shape"/>\n        <line x1="12.8571429" y1="1.76470588" x2="17.1428571" y2="1.76470588" id="Shape"/>\n        <path d="M17.5714286,7.5 C17.5714286,7.5 16.7142857,5.29411765 15,5.29411765 C13.2857143,5.29411765 12.4285714,7.5 12.4285714,7.5 C11.1428571,10.1470588 15,16.7647059 15,16.7647059 C15,16.7647059 18.8571429,10.1470588 17.5714286,7.5 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M5.57142857,27.3529412 C10.2857143,30.4411765 18.8571429,30.4411765 23.5714286,27.3529412 L23.5714286,21.1764706 C23.5714286,21.1764706 31.2857143,17.2058824 28.7142857,11.9117647 C25.2857143,6.17647059 17.1428571,8.82352941 15,15.4411765 L15,18.5294118 L15,15.4411765 C12,8.82352941 3.85714286,6.17647059 1.28571429,11.9117647 C-1.28571429,17.2058824 5.57142857,20.7352941 5.57142857,20.7352941 L5.57142857,27.3529412 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M5.57142857,21.1764706 C10.2857143,18.5294118 18.8571429,18.5294118 23.5714286,21.1764706" id="Shape"\n              fill-opacity="0" fill="#000000"/>\n        <path d="M5.57142857,24.2647059 C10.2857143,21.6176471 18.8571429,21.6176471 23.5714286,24.2647059" id="Shape"\n              fill-opacity="0" fill="#000000" stroke-linecap="square"/>\n        <path d="M5.57142857,27.3529412 C10.2857143,24.7058824 18.8571429,24.7058824 23.5714286,27.3529412" id="Shape"\n              fill-opacity="0" fill="#000000"/>\n    </g>\n    <g id="wq" stroke-linecap="round" stroke-linejoin="round" transform="translate(4.000000, 5.000000)" stroke="#000000"\n       stroke-width="1.5">\n        <path d="M3.45945946,6.2 C3.45945946,7.17833299 2.68503308,7.97142857 1.72972973,7.97142857 C0.774426379,7.97142857 0,7.17833299 0,6.2 C0,5.22166701 0.774426379,4.42857143 1.72972973,4.42857143 C2.68503308,4.42857143 3.45945946,5.22166701 3.45945946,6.2 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M17.7297297,2.21428571 C17.7297297,3.1926187 16.9553034,3.98571429 16,3.98571429 C15.0446966,3.98571429 14.2702703,3.1926187 14.2702703,2.21428571 C14.2702703,1.23595273 15.0446966,0.442857143 16,0.442857143 C16.9553034,0.442857143 17.7297297,1.23595273 17.7297297,2.21428571 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M32,6.2 C32,7.17833299 31.2255736,7.97142857 30.2702703,7.97142857 C29.3149669,7.97142857 28.5405405,7.17833299 28.5405405,6.2 C28.5405405,5.22166701 29.3149669,4.42857143 30.2702703,4.42857143 C31.2255736,4.42857143 32,5.22166701 32,6.2 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M10.3783784,3.1 C10.3783784,4.07833299 9.603952,4.87142857 8.64864865,4.87142857 C7.6933453,4.87142857 6.91891892,4.07833299 6.91891892,3.1 C6.91891892,2.12166701 7.6933453,1.32857143 8.64864865,1.32857143 C9.603952,1.32857143 10.3783784,2.12166701 10.3783784,3.1 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M25.0810811,3.54285714 C25.0810811,4.52119013 24.3066547,5.31428571 23.3513514,5.31428571 C22.396048,5.31428571 21.6216216,4.52119013 21.6216216,3.54285714 C21.6216216,2.56452416 22.396048,1.77142857 23.3513514,1.77142857 C24.3066547,1.77142857 25.0810811,2.56452416 25.0810811,3.54285714 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M4.32432432,18.6 C11.6756757,17.2714286 22.4864865,17.2714286 27.6756757,18.6 L29.4054054,7.97142857 L23.3513514,17.7142857 L23.3513514,5.31428571 L18.5945946,17.2714286 L16,3.98571429 L13.4054054,17.2714286 L8.64864865,4.87142857 L8.64864865,17.7142857 L2.59459459,7.97142857 L4.32432432,18.6 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M4.32432432,18.6 C4.32432432,20.3714286 5.62162162,20.3714286 6.48648649,22.1428571 C7.35135135,23.4714286 7.35135135,23.0285714 6.91891892,25.2428571 C5.62162162,26.1285714 5.62162162,27.4571429 5.62162162,27.4571429 C4.32432432,28.7857143 6.05405405,29.6714286 6.05405405,29.6714286 C11.6756757,30.5571429 20.3243243,30.5571429 25.9459459,29.6714286 C25.9459459,29.6714286 27.2432432,28.7857143 25.9459459,27.4571429 C25.9459459,27.4571429 26.3783784,26.1285714 25.0810811,25.2428571 C24.6486486,23.0285714 24.6486486,23.4714286 25.5135135,22.1428571 C26.3783784,20.3714286 27.6756757,20.3714286 27.6756757,18.6 C20.3243243,17.2714286 11.6756757,17.2714286 4.32432432,18.6 Z"\n              id="Shape" fill="#FFFFFF"/>\n        <path d="M6.48648649,22.1428571 C9.51351351,21.2571429 22.4864865,21.2571429 25.5135135,22.1428571" id="Shape"/>\n        <path d="M6.91891892,25.2428571 C12.1081081,24.3571429 19.8918919,24.3571429 25.0810811,25.2428571" id="Shape"/>\n    </g>\n    <g id="wb" stroke-linecap="round" stroke-linejoin="round" transform="translate(6.000000, 5.000000)" stroke="#000000"\n       stroke-width="1.5">\n        <g id="Group" fill="#FFFFFF">\n            <path d="M2.54545455,27.3529412 C5.42181818,26.4970588 11.1236364,27.7323529 14,25.5882353 C16.8763636,27.7323529 22.5781818,26.4970588 25.4545455,27.3529412 C25.4545455,27.3529412 26.8545455,27.8294118 28,29.1176471 C27.4230303,29.9735294 26.6,29.9911765 25.4545455,29.5588235 C22.5781818,28.7029412 16.8763636,29.9647059 14,28.6764706 C11.1236364,29.9647059 5.42181818,28.7029412 2.54545455,29.5588235 C1.39660606,29.9911765 0.574424242,29.9735294 0,29.1176471 C1.14884848,27.4058824 2.54545455,27.3529412 2.54545455,27.3529412 Z"\n                  id="Shape"/>\n            <path d="M7.63636364,23.8235294 C9.75757576,26.0294118 18.2424242,26.0294118 20.3636364,23.8235294 C20.7878788,22.5 20.3636364,22.0588235 20.3636364,22.0588235 C20.3636364,19.8529412 18.2424242,18.5294118 18.2424242,18.5294118 C22.9090909,17.2058824 23.3333333,8.38235294 14,4.85294118 C4.66666667,8.38235294 5.09090909,17.2058824 9.75757576,18.5294118 C9.75757576,18.5294118 7.63636364,19.8529412 7.63636364,22.0588235 C7.63636364,22.0588235 7.21212121,22.5 7.63636364,23.8235294 Z"\n                  id="Shape"/>\n            <path d="M16.1212121,2.64705882 C16.1212121,3.86533401 15.1715131,4.85294118 14,4.85294118 C12.8284869,4.85294118 11.8787879,3.86533401 11.8787879,2.64705882 C11.8787879,1.42878364 12.8284869,0.441176471 14,0.441176471 C15.1715131,0.441176471 16.1212121,1.42878364 16.1212121,2.64705882 Z"\n                  id="Shape"/>\n        </g>\n        <path d="M9.75757576,18.5294118 L18.2424242,18.5294118 M7.63636364,22.0588235 L20.3636364,22.0588235 M14,9.26470588 L14,13.6764706 M11.8787879,11.4705882 L16.1212121,11.4705882"\n              id="Shape"/>\n    </g>\n    <g id="wn" stroke-linecap="round" stroke-linejoin="round" transform="translate(6.000000, 6.000000)"\n       stroke="#000000">\n        <path d="M13.5757576,2.625 C22.4848485,3.5 27.5757576,9.625 27.1515152,28 L7.63636364,28 C7.63636364,20.125 16.1212121,22.3125 14.4242424,9.625"\n              id="Shape" stroke-width="1.5" fill="#FFFFFF"/>\n        <path d="M15.2727273,9.625 C15.5951515,12.17125 10.5636364,16.07375 8.48484848,17.5 C5.93939394,19.25 6.09212121,21.2975 4.24242424,21 C3.35830303,20.1775 5.43878788,18.34 4.24242424,18.375 C3.39393939,18.375 4.40363636,19.45125 3.39393939,20.125 C2.54545455,20.125 -0.00254545455,21 -1.90580876e-06,16.625 C-1.90580876e-06,14.875 5.09090909,6.125 5.09090909,6.125 C5.09090909,6.125 6.69454545,4.4625 6.78787879,3.0625 C6.16848485,2.19275 6.36363636,1.3125 6.36363636,0.4375 C7.21212121,-0.4375 8.90909091,2.625 8.90909091,2.625 L10.6060606,2.625 C10.6060606,2.625 11.2678788,0.882 12.7272727,0 C13.5757576,0 13.5757576,2.625 13.5757576,2.625"\n              id="Shape" stroke-width="1.5" fill="#FFFFFF"/>\n        <path d="M2.96969697,16.1875 C2.96969697,16.4291246 2.77975717,16.625 2.54545455,16.625 C2.31115192,16.625 2.12121212,16.4291246 2.12121212,16.1875 C2.12121212,15.9458754 2.31115192,15.75 2.54545455,15.75 C2.77975717,15.75 2.96969697,15.9458754 2.96969697,16.1875 Z"\n              id="Shape" stroke-width="1.5" fill="#000000"/>\n        <path d="M7.6363543,7.4375 C7.6363543,8.16235779 7.44641868,8.74997112 7.21212121,8.74997112 C6.97782375,8.74997112 6.78788812,8.16235779 6.78788812,7.4375 C6.78788812,6.71264221 6.97782375,6.12502888 7.21212121,6.12502888 C7.44641868,6.12502888 7.6363543,6.71264221 7.6363543,7.4375 L7.6363543,7.4375 Z"\n              id="Shape" stroke-width="1.499967" fill="#000000"\n              transform="translate(7.212121, 7.437500) rotate(30.000728) translate(-7.212121, -7.437500) "/>\n    </g>\n    <g id="wr" stroke-linecap="round" stroke-linejoin="round" transform="translate(9.000000, 8.000000)" stroke="#000000"\n       stroke-width="1.5">\n        <polygon id="Shape" fill="#FFFFFF" points="0 26 22 26 22 23.4 0 23.4"/>\n        <polygon id="Shape" fill="#FFFFFF"\n                 points="2.44444444 23.4 2.44444444 19.9333333 19.5555556 19.9333333 19.5555556 23.4"/>\n        <polyline id="Shape" fill="#FFFFFF"\n                  points="1.62962963 4.33333333 1.62962963 0 4.88888889 0 4.88888889 1.73333333 8.96296296 1.73333333 8.96296296 0 13.037037 0 13.037037 1.73333333 17.1111111 1.73333333 17.1111111 0 20.3703704 0 20.3703704 4.33333333"/>\n        <polyline id="Shape" fill="#FFFFFF"\n                  points="20.3703704 4.33333333 17.9259259 6.93333333 4.07407407 6.93333333 1.62962963 4.33333333"/>\n        <polyline id="Shape" fill="#FFFFFF"\n                  points="17.9259259 6.93333333 17.9259259 17.7666667 4.07407407 17.7666667 4.07407407 6.93333333"/>\n        <polyline id="Shape" fill="#FFFFFF"\n                  points="17.9259259 17.7666667 19.1481481 19.9333333 2.85185185 19.9333333 4.07407407 17.7666667"/>\n        <line x1="1.62962963" y1="4.33333333" x2="20.3703704" y2="4.33333333" id="Shape"/>\n    </g>\n    <g id="wp" transform="translate(10.000000, 9.000000)" fill="#FFFFFF" stroke="#000000" stroke-linecap="round"\n       stroke-width="1.5">\n        <path d="M10,0 C8.15833333,0 6.66666667,1.50129032 6.66666667,3.35483871 C6.66666667,4.10129032 6.90833333,4.78903226 7.31666667,5.35096774 C5.69166667,6.29032258 4.58333333,8.04322581 4.58333333,10.0645161 C4.58333333,11.7670968 5.36666667,13.2851613 6.59166667,14.2832258 C4.09166667,15.1722581 0.416666667,18.9380645 0.416666667,25.5806452 L19.5833333,25.5806452 C19.5833333,18.9380645 15.9083333,15.1722581 13.4083333,14.2832258 C14.6333333,13.2851613 15.4166667,11.7670968 15.4166667,10.0645161 C15.4166667,8.04322581 14.3083333,6.29032258 12.6833333,5.35096774 C13.0916667,4.78903226 13.3333333,4.10129032 13.3333333,3.35483871 C13.3333333,1.50129032 11.8416667,0 10,0 Z"\n              id="Shape"/>\n    </g>\n    <g id="bk" stroke-linecap="round" stroke-linejoin="round" transform="translate(5.000000, 5.000000)"\n       stroke-width="1.5">\n        <line x1="15" y1="4.96764706" x2="15" y2="0" id="Shape" stroke="#000000"/>\n        <path d="M15,16.7647059 C15,16.7647059 18.8571429,10.1470588 17.5714286,7.5 C17.5714286,7.5 16.7142857,5.29411765 15,5.29411765 C13.2857143,5.29411765 12.4285714,7.5 12.4285714,7.5 C11.1428571,10.1470588 15,16.7647059 15,16.7647059"\n              id="Shape" stroke="#000000" fill="#000000"/>\n        <path d="M5.57142857,27.3529412 C10.2857143,30.4411765 18.8571429,30.4411765 23.5714286,27.3529412 L23.5714286,21.1764706 C23.5714286,21.1764706 31.2857143,17.2058824 28.7142857,11.9117647 C25.2857143,6.17647059 17.1428571,8.82352941 15,15.4411765 L15,18.5294118 L15,15.4411765 C12,8.82352941 3.85714286,6.17647059 1.28571429,11.9117647 C-1.28571429,17.2058824 5.57142857,20.7352941 5.57142857,20.7352941 L5.57142857,27.3529412 Z"\n              id="Shape" stroke="#000000" fill="#000000"/>\n        <line x1="12.8571429" y1="1.76470588" x2="17.1428571" y2="1.76470588" id="Shape" stroke="#000000"/>\n        <path d="M23.1428571,20.7352941 C23.1428571,20.7352941 30.4285714,17.2058824 28.3114286,12.2205882 C24.9857143,7.05882353 17.1428571,10.5882353 15,16.3235294 L15.0085714,18.1764706 L15,16.3235294 C12.8571429,10.5882353 4.20514286,7.05882353 1.71171429,12.2205882 C-0.428571429,17.2058824 5.87142857,20.1617647 5.87142857,20.1617647"\n              id="Shape" stroke="#FFFFFF"/>\n        <path d="M5.57142857,21.1764706 C10.2857143,18.5294118 18.8571429,18.5294118 23.5714286,21.1764706 M5.57142857,24.2647059 C10.2857143,21.6176471 18.8571429,21.6176471 23.5714286,24.2647059 M5.57142857,27.3529412 C10.2857143,24.7058824 18.8571429,24.7058824 23.5714286,27.3529412"\n              id="Shape" stroke="#FFFFFF"/>\n    </g>\n    <g id="bq" stroke-linecap="round" stroke-linejoin="round" transform="translate(3.000000, 4.000000)">\n        <g id="Group" fill="#000000">\n            <ellipse id="Oval" cx="2.61538462" cy="6.22222222" rx="2.3974359" ry="2.44444444"/>\n            <ellipse id="Oval" cx="9.58974359" cy="3.55555556" rx="2.3974359" ry="2.44444444"/>\n            <ellipse id="Oval" cx="17" cy="2.66666667" rx="2.3974359" ry="2.44444444"/>\n            <ellipse id="Oval" cx="24.4102564" cy="3.55555556" rx="2.3974359" ry="2.44444444"/>\n            <ellipse id="Oval" cx="31.3846154" cy="6.22222222" rx="2.3974359" ry="2.44444444"/>\n        </g>\n        <path d="M5.23076923,18.6666667 C12.6410256,17.3333333 23.5384615,17.3333333 28.7692308,18.6666667 L30.9487179,7.55555556 L24.4102564,17.7777778 L24.1487179,5.24444444 L19.6153846,17.3333333 L17,4.44444444 L14.3846154,17.3333333 L9.85128205,5.24444444 L9.58974359,17.7777778 L3.05128205,7.55555556 L5.23076923,18.6666667 Z"\n              id="crown" stroke="#000000" stroke-width="1.5" fill="#000000"/>\n        <path d="M5.23076923,18.6666667 C5.23076923,20.4444444 6.53846154,20.4444444 7.41025641,22.2222222 C8.28205128,23.5555556 8.28205128,23.1111111 7.84615385,25.3333333 C6.53846154,26.2222222 6.53846154,27.5555556 6.53846154,27.5555556 C5.23076923,28.8888889 6.97435897,29.7777778 6.97435897,29.7777778 C12.6410256,30.6666667 21.3589744,30.6666667 27.025641,29.7777778 C27.025641,29.7777778 28.3333333,28.8888889 27.025641,27.5555556 C27.025641,27.5555556 27.4615385,26.2222222 26.1538462,25.3333333 C25.7179487,23.1111111 25.7179487,23.5555556 26.5897436,22.2222222 C27.4615385,20.4444444 28.7692308,20.4444444 28.7692308,18.6666667 C21.3589744,17.3333333 12.6410256,17.3333333 5.23076923,18.6666667 Z"\n              id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000"/>\n        <path d="M6.97435897,29.7777778 C13.4672777,32.080866 20.5327223,32.080866 27.025641,29.7777778" id="Shape"\n              stroke="#000000" stroke-width="1.5"/>\n        <path d="M6.97435897,21.3333333 C13.4672777,19.0302452 20.5327223,19.0302452 27.025641,21.3333333" id="Shape"\n              stroke="#FFFFFF" stroke-width="1.5"/>\n        <line x1="8.28205128" y1="23.5555556" x2="25.7179487" y2="23.5555556" id="Shape" stroke="#FFFFFF"\n              stroke-width="1.5"/>\n        <path d="M7.41025641,26.2222222 C13.6372326,28.3241535 20.3627674,28.3241535 26.5897436,26.2222222" id="Shape"\n              stroke="#FFFFFF" stroke-width="1.5"/>\n        <path d="M6.53846154,28.8888889 C13.2948481,31.4031829 20.7051519,31.4031829 27.4615385,28.8888889" id="Shape"\n              stroke="#FFFFFF" stroke-width="1.5"/>\n    </g>\n    <g id="bb" stroke-linecap="round" stroke-linejoin="round" transform="translate(6.000000, 5.000000)"\n       stroke-width="1.5">\n        <g id="Group" fill="#000000" stroke="#000000">\n            <path d="M2.54545455,27.3529412 C5.42181818,26.4970588 11.1236364,27.7323529 14,25.5882353 C16.8763636,27.7323529 22.5781818,26.4970588 25.4545455,27.3529412 C25.4545455,27.3529412 26.8545455,27.8294118 28,29.1176471 C27.4230303,29.9735294 26.6,29.9911765 25.4545455,29.5588235 C22.5781818,28.7029412 16.8763636,29.9647059 14,28.6764706 C11.1236364,29.9647059 5.42181818,28.7029412 2.54545455,29.5588235 C1.39660606,29.9911765 0.574424242,29.9735294 0,29.1176471 C1.14884848,27.4058824 2.54545455,27.3529412 2.54545455,27.3529412 Z"\n                  id="Shape"/>\n            <path d="M7.63636364,23.8235294 C9.75757576,26.0294118 18.2424242,26.0294118 20.3636364,23.8235294 C20.7878788,22.5 20.3636364,22.0588235 20.3636364,22.0588235 C20.3636364,19.8529412 18.2424242,18.5294118 18.2424242,18.5294118 C22.9090909,17.2058824 23.3333333,8.38235294 14,4.85294118 C4.66666667,8.38235294 5.09090909,17.2058824 9.75757576,18.5294118 C9.75757576,18.5294118 7.63636364,19.8529412 7.63636364,22.0588235 C7.63636364,22.0588235 7.21212121,22.5 7.63636364,23.8235294 Z"\n                  id="Shape"/>\n            <path d="M16.1212121,2.64705882 C16.1212121,3.86533401 15.1715131,4.85294118 14,4.85294118 C12.8284869,4.85294118 11.8787879,3.86533401 11.8787879,2.64705882 C11.8787879,1.42878364 12.8284869,0.441176471 14,0.441176471 C15.1715131,0.441176471 16.1212121,1.42878364 16.1212121,2.64705882 Z"\n                  id="Shape"/>\n        </g>\n        <path d="M9.75757576,18.5294118 L18.2424242,18.5294118 M7.63636364,22.0588235 L20.3636364,22.0588235 M14,9.26470588 L14,13.6764706 M11.8787879,11.4705882 L16.1212121,11.4705882"\n              id="Shape" stroke="#FFFFFF"/>\n    </g>\n    <g id="bn" stroke-linecap="round" stroke-linejoin="round" transform="translate(6.000000, 6.000000)">\n        <path d="M13.5757576,2.63636364 C22.4848485,3.51515152 27.5757576,9.66666667 27.1515152,28.1212121 L7.63636364,28.1212121 C7.63636364,20.2121212 16.1212121,22.4090909 14.4242424,9.66666667"\n              id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000"/>\n        <path d="M15.2727273,9.66666667 C15.5951515,12.2239394 10.5636364,16.1433333 8.48484848,17.5757576 C5.93939394,19.3333333 6.09212121,21.389697 4.24242424,21.0909091 C3.35830303,20.2648485 5.43878788,18.4193939 4.24242424,18.4545455 C3.39393939,18.4545455 4.40363636,19.5354545 3.39393939,20.2121212 C2.54545455,20.2121212 -0.00254545455,21.0909091 -1.90580876e-06,16.6969697 C-1.90580876e-06,14.9393939 5.09090909,6.15151515 5.09090909,6.15151515 C5.09090909,6.15151515 6.69454545,4.48181818 6.78787879,3.07575758 C6.16848485,2.20224242 6.36363636,1.31818182 6.36363636,0.439393939 C7.21212121,-0.439393939 8.90909091,2.63636364 8.90909091,2.63636364 L10.6060606,2.63636364 C10.6060606,2.63636364 11.2678788,0.885818182 12.7272727,0 C13.5757576,0 13.5757576,2.63636364 13.5757576,2.63636364"\n              id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000"/>\n        <path d="M2.96969697,16.2575758 C2.96969697,16.5002463 2.77975717,16.6969697 2.54545455,16.6969697 C2.31115192,16.6969697 2.12121212,16.5002463 2.12121212,16.2575758 C2.12121212,16.0149052 2.31115192,15.8181818 2.54545455,15.8181818 C2.77975717,15.8181818 2.96969697,16.0149052 2.96969697,16.2575758 Z"\n              id="Shape" stroke="#FFFFFF" stroke-width="1.5" fill="#FFFFFF"/>\n        <path d="M7.6363543,7.46969697 C7.6363543,8.19769267 7.44641868,8.78784979 7.21212121,8.78784979 C6.97782375,8.78784979 6.78788812,8.19769267 6.78788812,7.46969697 C6.78788812,6.74170127 6.97782375,6.15154415 7.21212121,6.15154415 C7.44641868,6.15154415 7.6363543,6.74170127 7.6363543,7.46969697 L7.6363543,7.46969697 Z"\n              id="Shape" stroke="#FFFFFF" stroke-width="1.499967" fill="#FFFFFF"\n              transform="translate(7.212121, 7.469697) rotate(30.000728) translate(-7.212121, -7.469697) "/>\n        <path d="M15.7393939,2.98787879 L15.3575758,4.26212121 L15.7818182,4.39393939 C18.4545455,5.27272727 20.5757576,6.58212121 22.4848485,10.3257576 C24.3939394,14.0693939 25.2424242,19.3860606 24.8181818,28.1212121 L24.7757576,28.5606061 L26.6848485,28.5606061 L26.7272727,28.1212121 C27.1515152,19.2806061 25.9806061,13.3136364 23.969697,9.36787879 C21.9587879,5.42212121 19.0569697,3.53272727 16.1721212,3.07575758 L15.7393939,2.98787879 Z"\n              id="Shape" fill="#FFFFFF"/>\n    </g>\n    <g id="br" stroke-linecap="round" stroke-linejoin="round" transform="translate(9.000000, 8.000000)">\n        <polygon id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000" points="0 26 22 26 22 23.4 0 23.4"/>\n        <polygon id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000"\n                 points="2.85185185 19.9333333 4.07407407 17.7666667 17.9259259 17.7666667 19.1481481 19.9333333"/>\n        <polygon id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000"\n                 points="2.44444444 23.4 2.44444444 19.9333333 19.5555556 19.9333333 19.5555556 23.4"/>\n        <polygon id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000"\n                 points="4.07407407 17.7666667 4.07407407 6.5 17.9259259 6.5 17.9259259 17.7666667"/>\n        <polygon id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000"\n                 points="4.07407407 6.5 1.62962963 4.33333333 20.3703704 4.33333333 17.9259259 6.5"/>\n        <polygon id="Shape" stroke="#000000" stroke-width="1.5" fill="#000000"\n                 points="1.62962963 4.33333333 1.62962963 0 4.88888889 0 4.88888889 1.73333333 8.96296296 1.73333333 8.96296296 0 13.037037 0 13.037037 1.73333333 17.1111111 1.73333333 17.1111111 0 20.3703704 0 20.3703704 4.33333333"/>\n        <polyline id="Shape" stroke="#FFFFFF"\n                  points="2.44444444 22.9666667 19.5555556 22.9666667 19.5555556 22.9666667"/>\n        <line x1="3.25925926" y1="19.5" x2="18.7407407" y2="19.5" id="Shape" stroke="#FFFFFF"/>\n        <line x1="4.07407407" y1="17.7666667" x2="17.9259259" y2="17.7666667" id="Shape" stroke="#FFFFFF"/>\n        <line x1="4.07407407" y1="6.5" x2="17.9259259" y2="6.5" id="Shape" stroke="#FFFFFF"/>\n        <line x1="1.62962963" y1="4.33333333" x2="20.3703704" y2="4.33333333" id="Shape" stroke="#FFFFFF"/>\n    </g>\n    <g id="bp" transform="translate(10.000000, 8.000000)" fill="#000000" stroke="#000000" stroke-linecap="round"\n       stroke-width="1.5">\n        <path d="M10,0 C8.15833333,0 6.66666667,1.50129032 6.66666667,3.35483871 C6.66666667,4.10129032 6.90833333,4.78903226 7.31666667,5.35096774 C5.69166667,6.29032258 4.58333333,8.04322581 4.58333333,10.0645161 C4.58333333,11.7670968 5.36666667,13.2851613 6.59166667,14.2832258 C4.09166667,15.1722581 0.416666667,18.9380645 0.416666667,25.5806452 L19.5833333,25.5806452 C19.5833333,18.9380645 15.9083333,15.1722581 13.4083333,14.2832258 C14.6333333,13.2851613 15.4166667,11.7670968 15.4166667,10.0645161 C15.4166667,8.04322581 14.3083333,6.29032258 12.6833333,5.35096774 C13.0916667,4.78903226 13.3333333,4.10129032 13.3333333,3.35483871 C13.3333333,1.50129032 11.8416667,0 10,0 Z"\n              id="Shape"/>\n    </g>\n</svg>\n';

  // design-preview/board-runtime.js
  function createBoard(host, props) {
    if (!document.getElementById("cm-chessboard-sprite")) {
      const wrapper = document.createElement("div");
      wrapper.id = "cm-chessboard-sprite";
      wrapper.style.cssText = "position:absolute;transform:scale(0);pointer-events:none";
      wrapper.setAttribute("aria-hidden", "true");
      wrapper.innerHTML = standard_default.slice(standard_default.indexOf("<svg"));
      document.body.appendChild(wrapper);
    }
    return new Chessboard(host, {
      ...props,
      style: {
        cssClass: "default",
        borderType: "none",
        pieces: { file: "pieces/standard.svg" },
        animationDuration: 200,
        ...props.style
      }
    });
  }
  return __toCommonJS(board_runtime_exports);
})();
