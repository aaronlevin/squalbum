/**

TODO:
* key state by image hash
* don't render image in modal when not valid url
* difficulty level is not interacting with completed game state well. to trigger: complete the game then change difficulty.

*/

document.addEventListener('DOMContentLoaded', (event) => {
  const albums = [
    {
      artist: "Mr. Fingers",
      title: "Ammnesia",
      date: new Date(2022,0,19),
      image: "amnesia.jpg",
    },
    {
      artist: "John Martyn",
      title: "Solid Air",
      date: new Date(2022,0,20),
      image: "solidair.jpg",
    },
    {
      artist: "Simon & Garfunkel",
      title: "Bookends",
      date: new Date(2022,0,21),
      image: "bookends.jpg",
    }
  ];
  const urlParams = new URLSearchParams(window.location.search);

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  var todaysAlbum;

  const gameFromUrl = urlParams.get('game');
  if(gameFromUrl == null) {
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


  const difficultyDOM = document.getElementById('difficulty');
  var numRects = difficultyDOM.value;

  const now = new Date();
  // day beginning at 00:00
  // we use Math.floor to convert the date
  // into an integer (milliseconds since epoch)
  const today = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  /////////// admin functions /////////////////////
  const adminMode = urlParams.get('admin') || false;

  if(adminMode) {
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
    const length = parseInt(decoded.substring(0,3));
    const title = decoded.substring(3,3+length);
    const imageUrl = decoded.substring(3+length);
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

  // fetch existing gameobject from local storage
  // if it exists. Also mark all historical guess
  // as "historical"
  var events = localStorage.getItem(today.toString());
  if(events === null) {
    events = []
  } else {
    events = JSON.parse(events);
    events.forEach((event) => {
      if(event.type === 'guess') {
        event.historical = true;
      }
    });
  }

  function persistEvents(events) {
    localStorage.setItem(today.toString(), JSON.stringify(events));
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

    for (let iy=0; iy<numRects; iy++) {
      for(let ix=0; ix<numRects; ix++) {
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
          clicked: false
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
      if(rect.clicked) {
        // don't draw
      } else {
        ctx.fillRect(rect.tile.x, rect.tile.y, width-0.25, height-0.25);
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
      y: eventY - rect.top
    };
  }

  function findIntersectingRectangle(obj, clickX, clickY) {
    var returnRect;
    // do the dumb brute force thing.
    obj.rectangles.forEach((rect) => {
      if(
        clickX >= rect.tile.x &&
        clickX < rect.tile.x + obj.tile.width &&
        clickY >= rect.tile.y &&
        clickY < rect.tile.y + obj.tile.height
      ) {
        returnRect = rect;
      }
    });

    return returnRect;

  }

  // * queue of events.
  // * events are applied to gameState
  // * gameState is used for rendering
  // * queue of events are persisted
  function updateGameState(gameObject, event, canvas) {
    if(event.type === 'click') {
      handleClickEvent(gameObject, event, canvas);
    } else if(event.type === 'guess') {
      handleGuessEvent(gameObject, event, canvas);
    }
  }
  // handle click events by updating the rectangle
  // that was clicked
  function handleClickEvent(gameObject, event, canvas) {
    let mouseCoords = getMousePosition(canvas, event.x, event.y);
    let intersectingRect = findIntersectingRectangle(gameObject, mouseCoords.x, mouseCoords.y);
    if(intersectingRect == undefined) {
      // do nothing
    } else {
      intersectingRect.clicked = true;
    }
  }

  // utility function to clean strings for
  // guess comparison
  function cleanString(str) {
    return str.trim().toLowerCase();
  }
  // render a summary string for a 
  // correct guess
  function renderSummary(gameObject) {
    let numRects = gameObject.numRects;
    let buffer = "";
    gameObject.rectangles.forEach((rect, index) => {
      if(index % numRects == 0 && index != 0) {
        buffer += "\n";
      }
      if(rect.clicked) {
        buffer += " * ";
      } else {
        buffer += "[-]";
      }
    });
    return buffer;
  }
  // handle a guess
  function handleGuessEvent(gameObject, event, canvas) {
    let guess = event.guess;
    let guessedCorrectly = cleanString(guess) === cleanString(todaysAlbum.title);
    let dialogDOM = document.getElementById('dialog');
    if(guessedCorrectly) {
      // if they guessed correctly, congradulate them.
      let p = document.createElement('p');
      let text = document.createTextNode('YAY!!! YOU GOT IT!!!!');
      p.appendChild(text);
      dialogDOM.appendChild(p);
      let code = document.createElement('p');
      code.style.whiteSpace = 'pre';
      code.style.fontFamily = 'monospace';
      let summary = document.createTextNode(renderSummary(gameObject));
      code.appendChild(summary);
      dialogDOM.appendChild(code);
    } else if(!event.historical) {
      // if it's a new guess and not a "historical" one
      // render a message to the user
      let p = document.createElement('p');
      let text = document.createTextNode("Sorry, you guessed wrong :(");
      p.appendChild(text);
      dialogDOM.appendChild(p);
      setTimeout(() => {dialogDOM.removeChild(p);}, 3000);
    } else {
      // this is a historical guess, do nothing.
      // we keep these around for statistics or
      // score keeping
    }
  }

  function generalEventHandler(gameObject, event, events, canvas, ctx) {
    events.push(event);
    updateGameState(gameObject, event, canvas);
    persistEvents(events);
    draw(gameObject, canvas, ctx);
  }

  var img = new Image();
  img.addEventListener('load', function() {
    var gameObject = createGameObject(img, canvas, numRects);

    // update the game state with the persisted events
    events.forEach((event) => {
      updateGameState(gameObject, event, canvas);
    });

    // finally, draw initial image.
    draw(gameObject, canvas, ctx);

    // add canvas listener
    canvas.addEventListener('click', (domEvent) => {
      let storedEvent = {
        type: 'click',
        x: domEvent.clientX,
        y: domEvent.clientY,
      };
      generalEventHandler(gameObject, storedEvent, events, canvas, ctx);
    });

    // add difficult listener
    difficultyDOM.addEventListener('input', (event) => {
      numRects = event.target.value
      gameObject = createGameObject(img, canvas, numRects);
      events.forEach((event) => {
        updateGameState(gameObject, event, canvas);
      });
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
      generalEventHandler(gameObject, guessEvent, events, canvas, ctx);
    })

  }, false);


  img.src = todaysAlbum.image;


});
