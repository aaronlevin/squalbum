/**

TODO:

* cancel timeouts when modal is closed
* persist difficulty settings per image in state so they work after refresh.
* persist completed game
* don't render image in modal when not valid image

*/

document.addEventListener('DOMContentLoaded', (event) => {
  const fac = new FastAverageColor();

  const difficulties = [1, 2, 4, 6, 8, 12, 24];

  const albums = [
    {
      artist: "Mr. Fingers",
      title: "Ammnesia",
      date: new Date(2022, 0, 21),
      image: "images/2022-01-21.jpg",
      trivia: "<em>Ammnesia</em> was the first album released by <a href=\"https://en.wikipedia.org/wiki/Larry_Heard\">Larry Heard</a> as Mr. Fingers. The song \"<a href=\"https://www.youtube.com/watch?v=lwObuf_hgfE\">The Juice</a>\" was recently popularized on TikTok."
    },
    {
      artist: "Drake",
      title: "Views",
      date: new Date(2022, 0, 22),
      image: "images/2022-01-22.jpg",
      trivia: "<a href=\"https://www.youtube.com/watch?v=uxpDa-c-4Mc\">Drake</a> is a Canadian rapper most known for purchasing hundreds of <a href=\"https://en.wikipedia.org/wiki/Aaliyah\">Aaliyah</a> t-shirts that in turn helped fund the infamous Toronto DIY venue Halo Halo. You can't fact check this, but it's true."
    },
    {
      artist: "Beyoncé",
      title: "Lemonade",
      date: new Date(2022, 0, 23),
      image: "images/2022-01-23.jpg",
      trivia: "<em><a href=\"https://en.wikipedia.org/wiki/Beyonc%C3%A9:_Lemonade\">Lemonade</a></em> is the sixth album from Beyoncé, and her second \"visual\" album. The album received universal critical acclaim, including MTV\'s best music of the year for the song \"<a href=\"https://www.youtube.com/watch?v=WDZJPJV__bQ\">Formation</a>\""
    },
    {
      artist: "Drexciya",
      title: "Neptune's Lair",
      date: new Date(2022, 0, 24),
      image: "images/2022-01-24.jpg",
      trivia: "<em>Neptune\'s Lair</em> is the second album from Detroit-based techno duo <a href=\"https://en.wikipedia.org/wiki/Drexciya\">Drexciya</a> and their first on the <a href=\"https://en.wikipedia.org/wiki/Tresor_(club)\">Tresor</a> label. While relatively late in their career, tracks like \"<a href=\"https://www.youtube.com/watch?v=e1Kg_BvCuy4\">Andreaen Sand Dunes</a>\" capture them in all their aquatic glory."
    },
    {
      artist: "Boards of Canada",
      title: "Music Has The Right To Children",
      date: new Date(2022, 0, 25),
      image: "images/2022-01-25.jpg",
      trivia: "Internet people spend their entire lives trying to figure out what synthesizers are used on Boards of Canada's <a href=\"https://www.youtube.com/playlist?list=OLAK5uy_mt1uPu5r3DeEptU-yQ5_DYLS5t_qU0C30\">breakthrough album</a> from 1998."
    },
    {
      artist: "Steely Dan",
      title: "Katy Lied",
      date: new Date(2022, 0, 26),
      image: "images/2022-01-26.jpg",
      trivia: "Who are these children that scheme and run wild? What are the secrets they trace in the sky? And why do you tremble each time they ride by? Throw out <a href=\"https://www.youtube.com/watch?v=QzAJqKll6hI\">your gold teeth</a> and see how they roll."
    },
    {
      artist: "Kanye West",
      title: "808s & Heartbreak",
      date: new Date(2022, 0, 27),
      image: "images/2022-01-27.jpg",
      trivia: ""
    }
  ];
  const urlParams = new URLSearchParams(window.location.search);

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  var todaysAlbum;

  const now = new Date();
  // day beginning at 00:00
  // we use Math.floor to convert the date
  // into an integer (milliseconds since epoch)
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = Math.floor(todayDate);

  const gameFromUrl = urlParams.get('game');
  if (gameFromUrl == null) {
    var albumIndex = urlParams.get('album');
    if(albumIndex == null) {
      const index = albums.findIndex((a) => a.date.getTime() == today);
      if(index == -1) {
        albumIndex = 2;
      } else {
        albumIndex = index;
      }
    }

    todaysAlbum = albums[albumIndex];
  } else {
    const decoded = decodeGameUrl(gameFromUrl);
    imageUrl = decoded.url;
    todaysAlbum = {
      image: decoded.url,
      title: decoded.title
    };
  }

  /////////// admin functions /////////////////////
  let btn = document.getElementById('clear-state');
  btn.addEventListener('click', (event) => {
    localStorage.clear();
    location.reload();
  });

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
      `${window.location.origin}/?` +
      `game=${encodedGame}`;
    return link;
  }
  /////////////// /image URL functions /////////////

  /////////////// create modal /////////////
  const createImgInput = document.getElementById('create-image-url');
  createImgInput.addEventListener('input', (event) => {
    // when the input changes, remove all contents
    // in the create-dialog-div and then insert
    // an image there
    const div = document.getElementById('create-dialog-img');
    div.innerHTML = '';
    const imageUrl = event.target.value;
    var img = new Image(200,200);
    img.setAttribute('id', 'generated-image');
    img.src = imageUrl;
    div.appendChild(img);
  });

  const generateGameUrl = document.getElementById('generate-game-url');
  generateGameUrl.addEventListener('click', (event) => {
    const generateImageForm = document.getElementById('generate-image-form');

    const imageUrl = document.getElementById('create-image-url').value;
    const title = document.getElementById('create-image-title').value;
    const encodedGame = encodeGameUrl(title, imageUrl);
    const urlInput = document.createElement('input');
    urlInput.setAttribute('id', 'generated-link');
    urlInput.type = 'text';
    urlInput.value = createLink(encodedGame);
    const copyBtn = document.createElement('button');
    copyBtn.setAttribute('id', 'copy-button');
    const copyBtnText = document.createTextNode('copy');
    copyBtn.addEventListener('click', () => {
      urlInput.select();
      document.execCommand("copy");
    });
    copyBtn.appendChild(copyBtnText);
    const div1 = document.createElement('div');
    div1.setAttribute('id', 'copy-custom-url-form');
    const p = document.createElement('p');
    p.setAttribute('id', 'copy-custom-url');
    p.innerHTML = 'copy the URL to play your custom game with your image!';

    generateImageForm.innerHTML = '';
    generateImageForm.appendChild(div1);
    div1.appendChild(p);
    div1.appendChild(urlInput);
    div1.appendChild(copyBtn);

    const hr = document.createElement('hr');
    generateImageForm.appendChild(hr);
    return false;
  }, false);

  /////////////// /create modal /////////////

  function getNumRects() {
    const difficultyDOM = document.getElementById('difficulty');
    const numRects = difficulties[parseInt(difficultyDOM.value) - 1];
    return numRects
  }
  ////// /admin ////////////

  // fetch existing gameobject from local storage
  // if it exists. Also mark all historical guess
  // as "historical"
  const fileName = `uncvr-${gameFromUrl || today.toString()}`

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

  const ACCESS_ALLOWED_DOMAINS = [
    'imgur',
    'localhost',
    'uncvr'
  ];

  function accessAllowed(imageSrc) {
    try {
      const { hostname } = new URL(imageSrc);
      return ACCESS_ALLOWED_DOMAINS.some((domain) => {
        return hostname.includes(domain);
      });
    } catch(_) {
      return true;
    }
  }

  // returns a promise containing the image
  function renderGameObjectAsImage(gameObject, albumImage, canvas) {
    const imageCanvas = document.createElement('canvas');
    const imageCtx = imageCanvas.getContext('2d');
    imageCanvas.width = albumImage.width;
    imageCanvas.height = albumImage.height;

    let promises = [];

    gameObject.rectangles.forEach((rect) => {
      if (rect.clicked && accessAllowed(albumImage.src)) {
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

      } else if (rect.clicked) {
        imageCtx.fillStyle = '#5da173';
        imageCtx.fillRect(rect.image.x, rect.image.y, gameObject.image.width, gameObject.image.height);
        imageCtx.fillStyle = '#AAAAAA';
        let cx = rect.image.x + gameObject.image.width / 2;
        let cy = rect.image.y + gameObject.image.height / 2;
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
        let [x, y, w, h] = draw.fill;
        imageCtx.fillStyle = draw.color.hex;
        imageCtx.fillRect(x, y, w, h);
      });
      let returnImage = new Image(200,200);
      returnImage.crossOrigin = "anonymous";
      returnImage.src = imageCanvas.toDataURL();

      /*
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = 200;
      tmpCanvas.height = 200;
      const ctx = tmpCanvas.getContext('2d');
      ctx.drawImage(returnImage, 0, 0, 200, 200);

      let finalImage = new Image(200,200);
      finalImage.crossOrigin = "anonymous";
      finalImage.src = tmpCanvas.toDataURL();
      */

      return returnImage;
    });

    return returnPromise;

  }
  function guessStats(gameObject) {
    var total = 0;
    var clicked = 0;
    gameObject.rectangles.forEach((rect) => {
      total++;
      if(rect.clicked) {
        clicked++;
      }
    });
    return {
      total: total,
      clicked: clicked
    };
  }
  // handle a guess
  function handleGuessEvent(gameObject, event, canvas) {
    let guess = event.guess;
    let guessedCorrectly = cleanString(guess) === cleanString(todaysAlbum.title);
    if (guessedCorrectly) {
      let successClickModal = document.getElementById('success-click');
      successClickModal.dispatchEvent(new Event('click'));

      const {total, clicked} = guessStats(gameObject);
      const numGuessesP = document.getElementById('success-game-stats');
      numGuessesP.innerHTML = `${clicked}/${total}`;

      const twitterShare = document.getElementById('twitter-share');
      var twitterShareDataText;
      if(gameFromUrl == null) {
        twitterShareDataText = `uncvr.it - ${todayYYYYhhmm} - ${clicked}/${total}`;
      } else {
        twitterShareDataText = `uncvr.it - custom - ${clicked}/${total}`;
      }
      const twitterShareData = {
        text: twitterShareDataText
      };
      if(gameFromUrl != null) {
        twitterShareData['url'] = window.location.href;
      }
      const searchParams = new URLSearchParams(twitterShareData);
      twitterShare.setAttribute('href', `https://twitter.com/intent/tweet?${searchParams.toString()}`);

      var answerText = '';
      if('artist' in todaysAlbum) {
        answerText += `${todaysAlbum.artist} - `
      }
      answerText += todaysAlbum.title;
      const answer = document.getElementById('answer');
      answer.innerHTML = answerText;

      if('trivia' in todaysAlbum) {
        let p = document.createElement('p');
        p.setAttribute('id', 'trivia');
        p.innerHTML = todaysAlbum.trivia
        document.getElementById('answer').appendChild(p);
      }

      let dialogDOM = document.getElementById('dialog');
      // if they guessed correctly, congradulate them.
      renderGameObjectAsImage(gameObject, img, canvas).then((img) => {
        // clear old images
        for(let child of dialogDOM.children) {
          if(child.tagName == 'IMG') {
            child.remove();
          }
        };
        dialogDOM.appendChild(img);
      });
      updateTimeRemainingRecur();
    } else if (!event.historical) {
      // TODO(aaronlevin): this causes a failure on iOS.
      //navigator.vibrate(200);
      // if it's a new guess and not a "historical" one
      // render a message to the user
      let p = document.createElement('p');
      let text = document.createTextNode("Sorry, you guessed wrong :(");
      let dialogDOMFailure = document.getElementById('dialog-failure');
      p.appendChild(text);
      dialogDOMFailure.appendChild(p);
      setTimeout(() => { dialogDOMFailure.removeChild(p); }, 3000);
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
  img.addEventListener('load', function () {
    const numRects = getNumRects()
    const oldState = localStorage.getItem(fileName);
    let gameObject
    if (oldState) {
      const parsedState = JSON.parse(oldState)
      const difficultyIndex = difficulties.indexOf(parsedState.numRects) + 1
      document.getElementById('difficulty').value = difficultyIndex
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
      const numRects = difficulties[event.target.value - 1];
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


  if (accessAllowed(todaysAlbum.image)) {
    img.crossOrigin = "anonymous";
  }
  img.src = todaysAlbum.image;

  ///////// settings and menu stuff//////
  const gameDOM = document.getElementById('game');
  const modals = document.querySelectorAll("[data-modal]");

  modals.forEach(function (trigger) {
    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      // blur game background.
      gameDOM.classList.add('blur');

      const modal = document.getElementById(trigger.dataset.modal);
      modal.classList.add("open");
      const exits = modal.querySelectorAll(".modal-exit");
      exits.forEach(function (exit) {
        exit.addEventListener("click", function (event) {
          event.preventDefault();
          // remove blur
          gameDOM.classList.remove('blur');
          modal.classList.remove("open");
        });
      });
    });
  });

  //////// copy success image and text ///////////
  const successCopy = document.getElementById('success-copy');
  successCopy.addEventListener('click', (event) => {
    const d = document.getElementById('dialog');
    d.setAttribute('contenteditable','true');
    const range = document.createRange();
    range.selectNodeContents(d);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    sel.removeAllRanges();
    d.setAttribute('contenteditable','false');
  });


  // insert the name of the game into the
  // the success message
  const successP = document.getElementById('success-game-name');
  const todayYYYYhhmm = new Date(today).toISOString().split('T')[0];
  if(gameFromUrl == null) {
    successP.innerHTML = `uncvr.it - ${todayYYYYhhmm}`;
  } else {
    successP.innerHTML = `uncvr.it - custom`;
  }

  function timeRemaining(todayDate) {
    const tmrDate = new Date(todayDate.getTime() + 60 * 60 * 24 * 1000);
    // defensively reset to beginning of day.
    const tomorrowDate = new Date(new Date(tmrDate.getFullYear(), tmrDate.getMonth(), tmrDate.getDate()));

    const todayMs = todayDate.getTime();
    const tomorrowMs = tomorrowDate.getTime();
    const secondsDiff = Math.floor((tomorrowMs - todayMs) / 1000);
    const hoursLeft = Math.floor(secondsDiff / 3600);
    const minutesLeft = Math.floor((secondsDiff % 3600) / 60);
    const secondsLeft = Math.floor( ((secondsDiff % 3600) % 60));

    return {
      hours: hoursLeft,
      minutes: minutesLeft,
      seconds: secondsLeft
    };

  }

  const timeRemainingDiv = document.getElementById('time-remaining');
  function updateTimeRemaining() {
    const { hours, minutes, seconds } = timeRemaining(new Date());
    const text = `next uncvr.it in: ${hours} : ${minutes} : ${seconds}`;
    timeRemainingDiv.innerHTML = text;
  }
  function updateTimeRemainingRecur() {
    updateTimeRemaining();
    setTimeout(updateTimeRemainingRecur, 500);
  }


});
