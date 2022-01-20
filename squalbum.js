/**

TODO:
* key state by image hash
* don't render image in modal when not valid url
* difficulty level is not interacting with completed game state well. to trigger: complete the game then change difficulty.
* rendered image is large. shrink rendered image

*/

document.addEventListener('DOMContentLoaded', (event) => {
  const fac = new FastAverageColor();

  const albums = [
    {
      artist: "Mr. Fingers",
      title: "Ammnesia",
      date: new Date(2022, 0, 19),
      image: "amnesia.jpg",
    },
    {
      artist: "John Martyn",
      title: "Solid Air",
      date: new Date(2022, 0, 20),
      image: "solidair.jpg",
    },
    {
      artist: "Simon & Garfunkel",
      title: "Bookends",
      date: new Date(2022, 0, 21),
      image: "bookends.jpg",
    }
  ];
  const urlParams = new URLSearchParams(window.location.search);

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  var todaysAlbum;

  const gameFromUrl = urlParams.get('game');
  if (gameFromUrl == null) {
    const albumIndex = urlParams.get('album') || 2;
    todaysAlbum = albums[albumIndex];
  } else {
    const decoded = decodeGameUrl(gameFromUrl);
    imageUrl = decoded.url;
    todaysAlbum = {
      image: decoded.url,
      title: decoded.title
    };
  }


  const now = new Date();
  // day beginning at 00:00
  // we use Math.floor to convert the date
  // into an integer (milliseconds since epoch)
  const today = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  /////////// admin functions /////////////////////
  const adminMode = urlParams.get('admin') || false;

  if (adminMode) {
    let adminSection = document.getElementById('admin');
    let btn = document.createElement('button');
    btn.innerHTML = 'clear state';
    btn.addEventListener('click', (event) => {
      localStorage.clear();
    });
    adminSection.appendChild(btn);

  }
  /////////////// /admin ////////////

  /////////////// image URL functions  ////////////
  // return a three character integer
  function intToString(integer) {
    return ("000" + integer).slice(-3);
  }
  // we are encoding an entire game into a url.
  // it has the following structure:
  // * base64(gzip([4-char title length][title][image url]))
  function encodeGameUrl(title, url) {
    return encodeURIComponent(
      LZString.compressToBase64(
        intToString(title.length) +
        title +
        url
      )
    );
  }
  function decodeGameUrl(encodedUrl) {
    const decoded = decodeURIComponent(LZString.decompressFromBase64(encodedUrl));
    const length = parseInt(decoded.substring(0, 3));
    const title = decoded.substring(3, 3 + length);
    const imageUrl = decoded.substring(3 + length);
    return {
      title: title,
      url: imageUrl
    };
  }
  function createLink(encodedGame) {
    const link =
      "https://aaronlevin.github.io/squalbum/?" +
      `game=${encodedGame}`;
    return link;
  }
  /////////////// /image URL functions /////////////

  /////////////// create modal  /////////////
  const createImageBtn = document.getElementById('create-image-modal-btn');
  createImageBtn.addEventListener('click', (event) => {
    const modal = document.getElementById('create-dialog');
    modal.showModal();
  });

  const createImgInput = document.getElementById('create-image-url');
  createImgInput.addEventListener('input', (event) => {
    // when the input changes, remove all contents
    // in the create-dialog-div and then insert
    // an image there
    const div = document.getElementById('create-dialog-img');
    div.innerHTML = '';
    const imageUrl = event.target.value;
    var img = new Image();
    img.src = imageUrl;
    div.appendChild(img);
  });

  const generateGameUrl = document.getElementById('generate-game-url');
  generateGameUrl.addEventListener('click', (event) => {
    const div = document.getElementById('generated-img-url');
    // clear contents
    div.innerHTML = '';

    const imageUrl = document.getElementById('create-image-url').value;
    const title = document.getElementById('create-image-title').value;
    const encodedGame = encodeGameUrl(title, imageUrl);
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = createLink(encodedGame);
    const copyBtn = document.createElement('button');
    const copyBtnText = document.createTextNode('copy');
    copyBtn.addEventListener('click', () => {
      urlInput.select();
      document.execCommand("copy");
    });
    copyBtn.appendChild(copyBtnText);
    const p = document.createElement('p');
    p.innerHTML = 'copy the URL to play a game with your image!';
    div.appendChild(p);
    div.appendChild(urlInput);
    div.appendChild(copyBtn);
    const hr = document.createElement('hr');
    div.appendChild(hr);
    return false;
  }, false);

  /////////////// /create modal /////////////

  function getNumRects() {
    const difficultyDOM = document.getElementById('difficulty');
    return difficultyDOM.value;
  }
  ////// /admin ////////////

  // fetch existing gameobject from local storage
  // if it exists. Also mark all historical guess
  // as "historical"
  const fileName = `squalbum-${gameFromUrl || today.toString()}`

  function persistEvents(gameObject) {
    localStorage.setItem(fileName, JSON.stringify(gameObject));
  }


  // draw an image by splitting it into
  // numRects rectangles and rescaling them
  // into the canvas width and height
  //
  // This function returns an array of rectangles
  // representing the original square on the image
  // and the tile associated with it.
  function createGameObject(img, canvas, numRects) {
    var canvasTileWidth = Math.ceil(canvas.width / numRects);
    var canvasTileHeight = Math.ceil(canvas.height / numRects);
    var imageTileWidth = Math.ceil(img.width / numRects);
    var imageTileHeight = Math.ceil(img.height / numRects);

    var rectangles = new Array();

    for (let iy = 0; iy < numRects; iy++) {
      for (let ix = 0; ix < numRects; ix++) {
        let sx = ix * imageTileWidth;
        let sy = iy * imageTileHeight;
        let dx = ix * canvasTileWidth;
        let dy = iy * canvasTileHeight;

        let rect = {
          image: {
            x: sx,
            y: sy,
          },
          tile: {
            x: dx,
            y: dy,
          },
          x: ix,
          y: iy,
          clicked: false,
        }
        rectangles.push(rect);
      }
    }
    return {
      rectangles: rectangles,
      numRects: numRects,
      image: {
        width: imageTileWidth,
        height: imageTileHeight,
        // TODO(aaronlevin): we may not want this in
        // case we ever want to serialize and store
        // the game object
        ref: img,
      },
      tile: {
        width: canvasTileWidth,
        height: canvasTileHeight
      }
    }
  }

  function drawImage(obj, ctx) {
    obj.rectangles.forEach((rect) => {
      let sx = rect.image.x;
      let sy = rect.image.y;
      let dx = rect.tile.x;
      let dy = rect.tile.y;
      ctx.drawImage(img, sx, sy, obj.image.width, obj.image.height, dx, dy, obj.tile.width, obj.tile.height);
    });
  }

  function drawRectangles(obj, ctx) {
    let width = obj.tile.width;
    let height = obj.tile.height;
    obj.rectangles.forEach((rect) => {
      if (!rect.clicked) {
        ctx.fillRect(rect.tile.x, rect.tile.y, width - 0.25, height - 0.25);
      }
    });
  }

  function draw(obj, canvas, ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawImage(obj, ctx);
    drawRectangles(obj, ctx);
  }

  function getMousePosition(canvas, eventX, eventY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: eventX - rect.left,
      y: eventY - rect.top,
      height: rect.height,
      width: rect.width,
    };
  }

  function checkOverlap(rectA, rectB) {
    const { left: leftA, right: rightA, top: topA, bottom: bottomA } = rectA
    const { left: leftB, right: rightB, top: topB, bottom: bottomB } = rectB
    const overlaps = leftA < rightB && rightA > leftB && topA < bottomB && bottomA > topB
    return overlaps
  }

  function getBounds(x, y, resolution) {
    return {
      left: x / resolution,
      right: (x + 1) / resolution,
      top: y / resolution,
      bottom: (y + 1) / resolution,
    }
  }

  function rescaleGuesses(oldGame, newGame) {
    const guessedRectangles = oldGame.rectangles.filter(rect => rect.clicked)
    newGame.rectangles.forEach(rectangle => {
      const bounds = getBounds(rectangle.x, rectangle.y, newGame.numRects)
      const overlap = guessedRectangles.find(oldRect => {
        const oldBounds = getBounds(oldRect.x, oldRect.y, oldGame.numRects)
        return checkOverlap(bounds, oldBounds)
      })
      if (overlap) { rectangle.clicked = true }
    })
    return newGame
  }

  function updateGuesses(obj, { x, y, width, height }) {
    const numRects = getNumRects()
    const pctX = x / width
    const pctY = y / height
    const currentX = Math.floor(numRects * pctX)
    const currentY = Math.floor(numRects * pctY)
    obj.rectangles[currentX + (currentY * numRects)].clicked = true
  }

  // * queue of events.
  // * events are applied to gameState
  // * gameState is used for rendering
  // * queue of events are persisted
  function updateGameState(gameObject, event, canvas) {
    if (event.type === 'click') {
      handleClickEvent(gameObject, event, canvas);
    } else if (event.type === 'guess') {
      handleGuessEvent(gameObject, event, canvas);
    }
  }
  // handle click events by updating the rectangle
  // that was clicked
  function handleClickEvent(gameObject, event, canvas) {
    let mouseCoords = getMousePosition(canvas, event.x, event.y);
    updateGuesses(gameObject, mouseCoords);
  }

  // utility function to clean strings for
  // guess comparison
  function cleanString(str) {
    return str.trim().toLowerCase();
  }

  // returns a promise containing the image
  function renderGameObjectAsImage(gameObject, albumImage, canvas) {
    const imageCanvas = document.createElement('canvas');
    const imageCtx = imageCanvas.getContext('2d');
    imageCanvas.width = albumImage.width;
    imageCanvas.height = albumImage.height;

    let promises = [];

    gameObject.rectangles.forEach((rect) => {
      if(rect.clicked) {
        const tmpCanvas = document.createElement('canvas');
        const width = gameObject.image.width;
        const height = gameObject.image.height;
        tmpCanvas.width = width;
        tmpCanvas.height = height;
        const tmpCtx = tmpCanvas.getContext('2d');
        let sx = rect.image.x;
        let sy = rect.image.y;
        tmpCtx.drawImage(albumImage, sx, sy, width, height, 0, 0, width, height);

        let image = new Image(width, height);
        image.crossOrigin = "anonymous";
        image.src = tmpCanvas.toDataURL();

        promises.push(fac.getColorAsync(image).then(color => {
          let value = {
            color: color,
            fill: [rect.image.x, rect.image.y, width, height]
          };
          return value;
        }));

      } else {
        imageCtx.fillStyle = '#000000';
        imageCtx.fillRect(rect.image.x, rect.image.y, gameObject.image.width, gameObject.image.height);
        imageCtx.fillStyle = '#AAAAAA';
        let cx = rect.image.x + gameObject.image.width / 2;
        let cy = rect.image.y + gameObject.image.height / 2;
        imageCtx.beginPath();
        imageCtx.arc(cx, cy, 4, 0, 2 * Math.PI);
        imageCtx.fill();
        imageCtx.closePath();
      }
    });

    let returnPromise = Promise.all(promises).then((drawings) => {
      drawings.forEach((draw) => {
        let [x,y,w,h] = draw.fill;
        imageCtx.fillStyle = draw.color.hex;
        imageCtx.fillRect(x,y,w,h);
      });
      let returnImage = new Image(200,200);
      returnImage.crossOrigin = "anonymous";
      returnImage.src = imageCanvas.toDataURL();
      return returnImage;
    });

    return returnPromise;

  }
  // handle a guess
  function handleGuessEvent(gameObject, event, canvas) {
    let guess = event.guess;
    let guessedCorrectly = cleanString(guess) === cleanString(todaysAlbum.title);
    let dialogDOM = document.getElementById('dialog');
    if (guessedCorrectly) {
      // if they guessed correctly, congradulate them.
      let p = document.createElement('p');
      let text = document.createTextNode('YAY!!! YOU GOT IT!!!! Copy the image below and share with your friends!');
      p.appendChild(text);
      dialogDOM.appendChild(p);
      renderGameObjectAsImage(gameObject, img, canvas).then((img) => {
        dialogDOM.appendChild(img);
      });
    } else if (!event.historical) {
      // if it's a new guess and not a "historical" one
      // render a message to the user
      let p = document.createElement('p');
      let text = document.createTextNode("Sorry, you guessed wrong :(");
      p.appendChild(text);
      dialogDOM.appendChild(p);
      setTimeout(() => { dialogDOM.removeChild(p); }, 3000);
    } else {
      // this is a historical guess, do nothing.
      // we keep these around for statistics or
      // score keeping
    }
  }

  function generalEventHandler(gameObject, event, canvas, ctx) {
    updateGameState(gameObject, event, canvas);
    draw(gameObject, canvas, ctx);
    persistEvents(gameObject)
  }

  var img = new Image();
  img.crossOrigin = "anonymous";
  img.addEventListener('load', function () {
    const numRects = getNumRects()
    const oldState = localStorage.getItem(fileName);
    let gameObject
    if (oldState) {
      const parsedState = JSON.parse(oldState)
      document.getElementById('difficulty').value = parsedState.numRects
      gameObject = parsedState
    } else {
      gameObject = createGameObject(img, canvas, numRects);
    }

    // finally, draw initial image.
    draw(gameObject, canvas, ctx);

    // add canvas listener
    canvas.addEventListener('click', (domEvent) => {
      let storedEvent = {
        type: 'click',
        x: domEvent.clientX,
        y: domEvent.clientY,
      };
      generalEventHandler(gameObject, storedEvent, canvas, ctx);
    });

    // add difficult listener
    const difficultyDOM = document.getElementById('difficulty');
    difficultyDOM.addEventListener('input', (event) => {
      const numRects = event.target.value
      const newGameObject = createGameObject(img, canvas, numRects);
      gameObject = rescaleGuesses(gameObject, newGameObject)
      // events.forEach((event) => {
      //   updateGameState(gameObject, event, canvas);
      // });
      draw(gameObject, canvas, ctx);
    });


    // add guess listener
    const guessInput = document.getElementById('album-guess');
    const guessInputButton = document.getElementById('album-guess-btn');
    guessInputButton.addEventListener('click', (event) => {
      let guessEvent = {
        type: 'guess',
        guess: guessInput.value,
        // a historical guess means one we
        // don't want to replay into the UI
        historical: false
      };
      generalEventHandler(gameObject, guessEvent, canvas, ctx);
    })

  }, false);


  img.src = todaysAlbum.image;


});
