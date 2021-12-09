let db = new NOdb({
    database: "TextDB",
    path: "./text.nodb",
    encrypt: false,
})

db.query("CREATE TABLE notes(text)");

// Grab elements, create settings, etc.
var video = document.getElementById('video');

// Use video without audio
const constraints = {
    video: {
        facingMode: 'environment',
    },
    audio: false
}

// Get access to the camera!
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // Not adding `{ audio: true }` since we only want video now
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        //video.src = window.URL.createObjectURL(stream);
        video.srcObject = stream;
        video.play();
    });
} else if (navigator.getUserMedia) {
    // Standard
    navigator.getUserMedia(constraints, function(stream) {
        video.src = stream;
        video.play();
    }, errBack);
} else if (navigator.webkitGetUserMedia) {
    // WebKit-prefixed
    navigator.webkitGetUserMedia(constraints, function(stream) {
        video.src = window.webkitURL.createObjectURL(stream);
        video.play();
    }, errBack);
} else if (navigator.mozGetUserMedia) {
    // Mozilla-prefixed
    navigator.mozGetUserMedia(constraints, function(stream) {
        video.srcObject = stream;
        video.play();
    }, errBack);
}

function errBack(err) {
    console.warn(err);
}

function toCanvas() {
    // Elements for taking the snapshot
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    let video = document.getElementById('video');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Trigger photo take
    context.drawImage(video, 0, 0, 640, 480);

    let file = toFile(canvas.toDataURL());
    getText(file);
    byId("image").src = URL.createObjectURL(file);
}

function toFile(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    let byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);
    // separate out the mime component
    let mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
    // write the bytes of the string to a typed array
    let ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new File([ia],'image.jpg',{
        type: mime
    });
}

function getText(file) {
    let url = "https://api.ocr.space/parse/image"
    let filetype = file.type.substring(6);
    let xhr = new XMLHttpRequest();
    xhr.addEventListener('progress', function(e) {
        let done = e.position || e.loaded
          , total = e.totalSize || e.total;
    }, false);
    if (xhr.upload) {
        xhr.upload.onprogress = function(e) {
            let done = e.position || e.loaded
              , total = e.totalSize || e.total;
        }
    }
    xhr.onreadystatechange = function(e) {
        if (this.readyState == 4) {
            byId("video").play();
            hideLoader();

            if(this.responseText.trim() == ""){
                return false;
            }

            let json = JSON.parse(this.responseText);
            console.log(json);

            if(!Object.keys(json).includes("ParsedResults")){
                byId("Artboard").setAttribute("fill", "#ff0000");
                setTimeout(function() {
                    byId("Artboard").setAttribute("fill", "#007bff");
                }, 1000)
                modal("An Error Occured!")
                return false;
            }

            if (json.ParsedResults.length == 0) {
                byId("Artboard").setAttribute("fill", "#ff0000");
                setTimeout(function() {
                    byId("Artboard").setAttribute("fill", "#007bff");
                }, 1000)
                return false;
            }

            if (json.ParsedResults[0].ParsedText.trim() == "") {
                byId("Artboard").setAttribute("fill", "#ff0000");
                setTimeout(function() {
                    byId("Artboard").setAttribute("fill", "#007bff");
                }, 1000)
                return false;
            }

            byId("Artboard").setAttribute("fill", "#008000");
            setTimeout(function() {
                byId("Artboard").setAttribute("fill", "#007bff");
            }, 1000)

            let result = json.ParsedResults[0].ParsedText.trim();
            modal(result);
            db.query(`INSERT INTO notes VALUES(${db.escape(result)})`);
            console.log(db.result);
        }
    }
    xhr.onerror = function(){
        modal("An Error Occured","Error");
    }
    xhr.open('POST', url, true);
    xhr.setRequestHeader("apikey", "helloworld");
    //xhr.setRequestHeader("Content-Type", file.type);

    let formData = new FormData();
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('file', file);
    //formData.append("filetype",filetype);
    xhr.send(formData);
}

function snap() {
    byId("video").pause();
    showLoader();
    toCanvas();
}

function copyTextToClipboard(text) {
  var textArea = document.createElement("textarea");

  //
  // *** This styling is an extra step which is likely not required. ***
  //
  // Why is it here? To ensure:
  // 1. the element is able to have focus and selection.
  // 2. if the element was to flash render it has minimal visual impact.
  // 3. less flakyness with selection and copying which **might** occur if
  //    the textarea element is not visible.
  //
  // The likelihood is the element won't even render, not even a
  // flash, so some of these are just precautions. However in
  // Internet Explorer the element is visible whilst the popup
  // box asking the user for permission for the web page to
  // copy to the clipboard.
  //

  // Place in the top-left corner of screen regardless of scroll position.
  textArea.style.position = 'fixed';
  textArea.style.top = 0;
  textArea.style.left = 0;

  // Ensure it has a small width and height. Setting to 1px / 1em
  // doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = '2em';
  textArea.style.height = '2em';

  // We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = 0;

  // Clean up any borders.
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';

  // Avoid flash of the white box if rendered for any reason.
  textArea.style.background = 'transparent';


  textArea.value = text;

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    modal("Copied to clipboard!");
  } catch (err) {
    console.log('Oops, unable to copy');
    modal("Failed to Copy!");
  }

  document.body.removeChild(textArea);
}

function copyText(id){
    db.query(`SELECT text FROM notes WHERE id = ${id}`);
    copyTextToClipboard(unescape(db.result.text[0]));
}

function createNoteList(){
    db.query("SELECT * FROM notes ORDER BY time DESC");
    let result = db.result;
    byId("wordList").innerHTML = "";

    result.id.forEach(function(j,i){
        let note = unescape(result.text[i]);
        byId("wordList").innerHTML += `<div id="word">
            <p>${nl2br(note)}</p><img src="./assets/img/icon/copy.svg" onclick="copyText(${j})">
        </div>`;
    })
}

//Get element by id shortcut
function byId(id) {
    return document.getElementById(id);
}

//Open Page in full screen
let elem = document.body;

function openFullscreen() {
    if (getPWADisplayMode() != "browser") {
        return false;
    }
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        /* IE11 */
        elem.msRequestFullscreen();
    }
}

function openTab(evt, tabName) {

    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    if (tabName != "qrTab") {} else {
        try {
            openFullscreen();
        } catch (e) {
            console.error(e);
        }
    }

    history.pushState({}, '');
}

//handle back button click

window.onpopstate = function(e) {
    back();
    history.pushState({}, '');
}

function back() {
    if (byId("page2").style.display == "block" || byId("page3").style.display == "block") {
        openPage("page1");
    }
}

//page switcher

function openPage(page) {
    let length = 10;
    for (i = 0; i < length; i++) {
        try {
            let page = byId("page" + i).style.display = "none";
        } catch (e) {}
    }
    byId(page).style.display = "block";

    if (page == "page1") {
        //start scanner
        startScanner();

        //recreate list 
        createCartList();
    } else {
        stopScanner();
    }
}

//show loader
function showLoader() {
    byId("load_cov").style.display = "flex";
}

//hide loader
function hideLoader() {
    byId("load_cov").style.display = "none";
    byId("video").play();
}

//xhr shortcut

function xhr(func, params, url) {
    let request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.onload = function() {
        let res = this.responseText;
        func(res);
    }
    request.onerror = function(e) {
        hideLoader();
        modal("An Error Occured!");
    }
    request.send(params);
}
function modal(msg, title="Alert") {
    new Attention.Alert({
        title: title,
        content: msg,
        afterClose: ()=>{}
    });
}

const options = {
    bottom: '64px',
    // default: '32px'
    right: 'unset',
    // default: '32px'
    left: '32px',
    // default: 'unset'
    time: '0.5s',
    // default: '0.3s'
    mixColor: '#fff',
    // default: '#fff'
    backgroundColor: '#fff',
    // default: '#fff'
    buttonColorDark: '#2C2C36',
    // default: '#100f2c'
    buttonColorLight: '#fff',
    // default: '#fff'
    saveInCookies: true,
    // default: true,
    label: '🌓',
    // default: ''
    autoMatchOsTheme: true // default: true
}

const darkmode = new Darkmode(options);

if (darkmode.isActivated()) {
    byId("switch").checked = true;
}

byId("switch").onchange = function() {
    darkmode.toggle();
}

//Service Worker
/*
if ('serviceWorker'in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js', {
            scope: '/'
        }).then((reg)=>{
            // registration success
            console.log('Registration success');

        }
        ).catch((err)=>{
            //registration failed
            console.log('Registration failed: ' + err);
        }
        );
    });
}
*/

//PWA

window.addEventListener('beforeinstallprompt', (event)=>{
    // Prevent the mini-infobar from appearing on mobile.
    event.preventDefault();
    // Stash the event so it can be triggered later.
    window.deferredPrompt = event;
    // Show installApp button
    byId("installApp").style.display = "block";
}
);

byId("installApp").addEventListener('click', async()=>{
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) {
        // The deferred prompt isn't available.

        // Hide installApp button
        byId("installApp").style.display = "none";
        return;
    }
    // Show the install prompt.
    promptEvent.prompt();
    // Log the result
    const result = await promptEvent.userChoice;
    // Reset the deferred prompt variable, since
    // prompt() can only be called once.
    window.deferredPrompt = null;
    // Hide installApp button
    byId("installApp").style.display = "none";
}
);

window.addEventListener('appinstalled', (event)=>{
    // Clear the deferredPrompt so it can be garbage collected
    window.deferredPrompt = null;
    // Hide installApp button
    byId("installApp").style.display = "none";
}
);

function getPWADisplayMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (document.referrer.startsWith('android-app://')) {
        return 'twa';
    } else if (navigator.standalone || isStandalone) {
        return 'standalone';
    }
    return 'browser';
}

function upload() {
    let input = document.createElement("INPUT");
    input.type = "file";
    input.onchange = function() {
        if (input.files.length != 0) {
            showLoader();
            let file = input.files[0];
            getText(file);
            input.remove();
            byId("image").src = URL.createObjectURL(file);
        }
    }
    document.body.appendChild(input);
    input.click();
}

function nl2br(text){
    return text.replaceAll("\n","<br>");
}