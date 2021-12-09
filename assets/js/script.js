const api = "http://9166-105-112-38-5.ngrok.io";


//Create DB for storing cart items

let db = new NOdb({
    database: "CartDB",
    path: "./CartDB.nodb",
    encrypt: false,
});

//Create Tables
db.query("CREATE TABLE cart(hash,name,image,price,amount,currency)");
db.query("CREATE TABLE organization(name,image,hash)");

//update ui with name and image
db.query("SELECT * FROM organization");

if (db.length != 0) {
    byId("floatPayTo").src = db.result.image[0];
    byId("payNow").innerHTML = "Pay To<p id='payTo'> " + db.result.name[0].toUpperCase() + "</p>";
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

    if (tabName != "qrTab") {
        stopScanner();
    } else {
        startScanner();
        try {
            openFullscreen();
        } catch (e) {
            console.error(e);
        }
    }

    if (tabName == "cardTab") {
        db.query("SELECT * FROM cart");
        if (db.length == 0) {
            byId("cardTab").style.display = "none";
        } else {
            byId("cardTab").style.display = "block";
            createSummaryList();
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
}

//Item image slider

let itemSwiper = new Swiper('#itemSwipe',{
    slidesPerView: 'auto',
    centeredSlides: true,
    spaceBetween: 0,
    allowTouchMove: true,
    grabCursor: true,
    effect: 'creative',
    observer: true,
    observeParents: true,
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
    autoplay: {
        delay: 5000,
        pauseOnMouseEnter: true,
        disableOnInteraction: false,
    },
});

//Card Payment Swiper

let cardSwiper = new Swiper('#cardSwipe',{
    slidesPerView: 1,
    centeredSlides: true,
    spaceBetween: 0,
    allowTouchMove: true,
    effect: 'creative',
    observer: true,
    observeParents: true,
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    }
});

// Get the video element
const video = document.querySelector('#qrScanner')
// Check if device has camera
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // Use video without audio
    const constraints = {
        video: {
            facingMode: 'environment',
        },
        audio: false
    }

    // Start video stream
    navigator.mediaDevices.getUserMedia(constraints).then(stream=>video.srcObject = stream);
}

// Create new barcode detector
const qrScanner = new QrScanner(video,function(hash) {
    //Reset Color of Sign
    byId("Artboard").setAttribute("fill", "#FED200");
    //handle hash
    if (hash.startsWith("org")) {
        setPayer(hash);
    } else {
        getItem(hash);
    }

    stopScanner();
    byId("Artboard").setAttribute("fill", "#008000");
}
);

//get Organization
function setPayer(hash) {
    showLoader();
    stopScanner();
    xhr(function(res) {
        hideLoader();

        let json = JSON.parse(res);
        console.log(json);

        if (json.length == 0) {
            modal("Store Not Found");
            return false;
        }

        json = json[0];

        //check if an organization already exists
        db.query("SELECT * FROM organization");
        if (db.length != 0) {
            //organization already exists so lets just replace it 
            db.query(`UPDATE organization SET name = "${json.name}" WHERE id = 1`);
            db.query(`UPDATE organization SET image = "${json.logo}" WHERE id = 1`);
            db.query(`UPDATE organization SET hash = "${hash}" WHERE id = 1`);
        } else {
            //add new organization
            db.query(`INSERT INTO organization VALUES ("${json.name}","${json.logo}","${hash}")`);
        }

        //update ui with name and image
        byId("floatPayTo").src = json.logo;
        byId("payNow").innerHTML = "Pay To<p id='payTo'> " + json.name.toUpperCase() + "</p>";

        //restart Scanner
        startScanner();

    }, "orgHash=" + hash, api + "/kwickquick/api/all/getOrganizations")
}

//get item with hash
function getItem(hash) {
    //start loading
    showLoader();

    xhr(function(res) {
        let json = JSON.parse(res);
        console.log(json);

        //handle item data

        //check if its valid item
        if (json.length == 0) {
            hideLoader();
            stopScanner();
            modal("Item Not Found");
            return false;
        }

        json = json[0];

        let m = moment(json.pDate, 'YYYY-MM-DD H:mm:ss');
        m.format();
        let now = m.fromNow();

        //Remove all slides 
        itemSwiper.removeAllSlides();

        //Add image to slide
        itemSwiper.appendSlide(`<img class="swiper-slide" src="${json.pImage}">`);

        byId("itemName").innerHTML = json.pName;
        byId("itemExpiry").innerHTML = now;
        byId("itemPrice").innerHTML = json.pCurrency + " " + json.pPrice;
        byId("itemPrice").dataset.price = json.pPrice;
        byId("eachOption").innerHTML = "1";
        byId("eachOption").dataset.hash = hash;
        byId("eachOption").dataset.currency = json.pCurrency;

        //check if item is already in db and restore amount from db
        db.query(`SELECT amount,currency FROM cart WHERE hash = "${hash}"`);
        if (db.length != 0) {
            byId("eachOption").innerHTML = db.result.amount[0];
            byId("itemPrice").innerHTML = db.result.currency[0] + " " + (json.pPrice * db.result.amount[0]);
        }

        //stop loading
        hideLoader();

        //lauch page2
        openPage("page2");

        //Added this onclick listener here so it has access to hash variable
        let addToCart = byId("addToCart");
        addToCart.onclick = function() {
            //check if item is already in cart
            db.query(`SELECT amount,price FROM cart WHERE hash = "${hash}"`);
            let amount = Number(byId("eachOption").innerHTML) || 1;
            let price = json.pPrice;
            if (db.length == 0) {
                //not in cart so lets add item
                db.query(`INSERT INTO cart(hash,name,image,price,amount,currency) VALUES ("${hash}","${json.pName}","${db.escape(json.pImage)}","${json.pPrice}","${amount}","${json.pCurrency}")`);
            } else {
                //already in cart so lets just update amount
                db.query(`UPDATE cart SET amount = ${amount} WHERE hash = "${hash}"`);
                //update price incase of (price changes)
                db.query(`UPDATE cart SET price = ${price} WHERE hash = "${hash}"`);
            }
            //go back to scanner page
            openPage("page1");
        }
    }, "pId=" + hash, api + "/kwickquick/api/getProductsId")
}

function startScanner() {
    qrScanner.start();
}

// Stop Scanner
function stopScanner() {
    qrScanner.stop();
}

//start scanner
startScanner();

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

function increment() {
    let count = Number(byId("eachOption").innerHTML);
    let price = Number(byId("itemPrice").dataset.price);
    let currency = byId("eachOption").dataset.currency;
    count++;
    byId("itemPrice").innerHTML = currency + " " + (price * count);
    byId("eachOption").innerHTML = count;
}

function decrement() {
    let count = Number(byId("eachOption").innerHTML);
    let hash = byId("eachOption").dataset.hash;
    let currency = byId("eachOption").dataset.currency;
    let price = Number(byId("itemPrice").dataset.price);
    count--;
    if (count == 0) {
        //Remove from db
        db.query(`DELETE FROM cart WHERE hash = "${hash}"`);
        openPage("page1");
        return false;
    }
    byId("itemPrice").innerHTML = currency + " " + (price * count);
    byId("eachOption").innerHTML = count;
}

function createCartList() {
    let cartList = byId("cartList");
    cartList.innerHTML = "";
    db.query("SELECT * FROM cart ORDER BY price");
    let result = db.result;
    let total = 0;
    let cur = "";

    result.id.forEach(function(each, i) {
        let name = result.name[i];
        let price = result.price[i];
        let amount = result.amount[i];
        let image = unescape(result.image[i]);
        let hash = db.result.hash[i];
        let currency = db.result.currency[i];
        cur = currency;

        cartList.innerHTML += `<div class="cart">
        <img src="${image}">
        <div class="cartsub">
        <p>${currency} ${price}</p>
        <p class="cartItemName">${name}</p>
        </div>
        <div class="itemCount" onclick="getItem('${hash}')">${amount}</div>
        </div>`;

        total += (price * amount);
    })

    if (db.length == 0) {
        cartList.innerHTML = `<img class="empty" src="./assets/img/icon/cart.svg">`;
    }
    byId("total").innerHTML = cur + " " + total;
}

function createSummaryList() {
    let cartList = byId("summary");
    cartList.innerHTML = "";
    db.query("SELECT * FROM cart ORDER BY price");
    console.log(db.result)
    let result = db.result;
    let total = 0;
    let cur = "";

    result.id.forEach(function(each, i) {
        let name = result.name[i];
        let price = result.price[i];
        let amount = result.amount[i];
        let image = unescape(result.image[i]);
        let hash = db.result.hash[i];
        let currency = db.result.currency[i];
        cur = currency;

        cartList.innerHTML += `<div class="summarySub">
            <img src="${image}">
            <span>${currency} ${price * amount}</span>
        </div>`;

        total += (price * amount);
    })

    cartList.innerHTML += `<div class="summarySub">
        <p id="total">Total</p>
        <span>${cur} ${total}</span>
    </div>`;
}

function modal(msg, title="Alert") {
    new Attention.Alert({
        title: title,
        content: msg,
        afterClose: ()=>{
            startScanner();
            createCartList();
        }
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

function formatCard(value) {
    var v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    var matches = v.match(/\d{4,16}/g);
    var match = matches && matches[0] || ''
    var parts = []

    for (i = 0,
    len = match.length; i < len; i += 4) {
        parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
        return parts.join(' ')
    } else {
        return value
    }
}

byId("card").oninput = function() {
    this.value = formatCard(this.value);
}

function formatExipry(value) {
    var v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    var matches = v.match(/\d{2,5}/g);
    var match = matches && matches[0] || ''
    var parts = []

    for (i = 0,
    len = match.length; i < len; i += 2) {
        parts.push(match.substring(i, i + 2))
    }

    if (parts.length) {
        return parts.join('/')
    } else {
        return value
    }
}

byId("expiryDate").oninput = function() {
    this.value = formatExipry(this.value);
}

byId("payNow").onclick = function() {
    let name = byId("cardName");
    let card = byId("card");
    let password = byId("password");
    let cvv = byId("cvv");
    let expiryDate = byId("expiryDate");

    let address = byId("address");
    let city = byId("city");
    let state = byId("state");
    let zip = byId("zip");

    if (name.value.length < 5) {
        modal("Name too short!");
        cardSwiper.slideTo(0)
        name.focus();
    } else if (card.value.trim() == "") {
        modal("Card Number Required!");
        cardSwiper.slideTo(0)
        card.focus();
    } else if (card.value.length < 19 || card.value.startsWith("0")) {
        modal("Invalid Card Number!");
        cardSwiper.slideTo(0)
        card.focus();
    } else if (password.value.trim() == "") {
        modal("Password Required!");
        cardSwiper.slideTo(0)
        password.focus();
    } else if (password.value.length < 8) {
        modal("Password too short!");
        cardSwiper.slideTo(0)
        password.focus();
    } else if (cvv.value.length < 3) {
        modal("CVV2 too short!");
        cardSwiper.slideTo(0)
        cvv.focus();
    } else if (expiryDate.value.length != 5) {
        modal("Expiry Date Not Valid!");
        cardSwiper.slideTo(0)
        expiryDate.focus();
    } else if (!name.checkValidity()) {
        cardSwiper.slideTo(0)
        name.focus();
    } else if (!card.checkValidity()) {
        cardSwiper.slideTo(0)
        card.focus();
    } else if (!password.checkValidity()) {
        cardSwiper.slideTo(0)
        password.focus();
    } else if (!cvv.checkValidity()) {
        cardSwiper.slideTo(0)
        cvv.focus();
    } else if (!expiryDate.checkValidity()) {
        cardSwiper.slideTo(0)
        expiryDate.focus();
    } else if (!address.checkValidity()) {
        cardSwiper.slideTo(1)
        address.focus();
    } else if (!city.checkValidity()) {
        cardSwiper.slideTo(1)
        city.focus();
    } else if (!state.checkValidity()) {
        cardSwiper.slideTo(1)
        state.focus();
    } else if (!zip.checkValidity()) {
        cardSwiper.slideTo(1)
        zip.focus();
    } else {
        db.query("SELECT hash FROM organization");
        if (db.length == 0) {
            byId("qrBtn").click();
            modal("Scan Store QRcode To Continue!");
            return false;
        }
        let org = db.result;

        db.query("SELECT hash,amount FROM cart");
        let data = {
            name: name.value,
            card: card.value.replaceAll(" ", ""),
            password: password.value,
            cvv: cvv.value,
            expiry: expiryDate.value,
            address: address.value,
            city: city.value,
            state: state.value,
            zip: zip.value,
            organization: org,
            hash: db.result.hash,
            amount: db.result.amount,
        }
        console.log(data);

        createSummaryList();
        openPage("page3");
        byId("payBtn").onclick = function() {
            showLoader();
            //you will have to handle this properly
            //this is just a demo
            setTimeout(function(){
                hideLoader();
                showSuccess();
            },3000)
        }
    }
}

function clearAllInputs() {
    let inputs = document.querySelectorAll("input");
    for (let input of inputs) {
        input.value = "";
    }
}

function showSuccess() {
    byId("success").style.display = "block";

    //Empty all inputs
    clearAllInputs();

    //Generate Reciept
    createReceipt()

    //Go to first page
    openPage("page1");
}

function createReceipt() {
    let table = byId("receipt");
    table.innerHTML = `<tr>
        <th class="left">Product</th>
        <th>Quantity</th>
        <th class="right">Price</th>
    </tr>`;
    db.query("SELECT * FROM cart ORDER BY name ASC");
    let result = db.result;
    let cur = "";
    let total = 0;

    result.id.forEach(function(each, i) {
        let name = result.name[i];
        let price = result.price[i];
        let amount = result.amount[i];
        let currency = db.result.currency[i];
        cur = currency;

        table.innerHTML += `<tr>
            <td class="left">${name}</td>
            <td>${amount}</td>
            <td class="right">${currency} ${price}</td>
        </tr>`;

        total += (price * amount);
    })
    table.innerHTML += `<br>`;
    table.innerHTML += `<tr>
        <th class="left">Total</th>
        <th></th>
        <th class="right">${cur} ${total}</th>
    </tr>`;
}

function saveReceipt() {
    setTimeout(function() {
        openPage("page1");
        clearTables()
    }, 5000)
    window.print();
}

byId("save").onclick = function() {
    saveReceipt();
}

function seeDetails() {
    byId("success").style.display = "none";
    createReceipt();
    openPage("page4");
}

//Service Worker

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

function clearTables(){
    //Empty Table Cart and Organization
    db.query("TRUNCATE TABLE organization");
    db.query("TRUNCATE TABLE cart");
}

/*

let DB = new NOdb({
    database: "TestDB",
    path: "./TestDB.nodb",
    encrypt: false,
});

DB.query("CREATE TABLE payments(cName,total,paymentMethod,orgId,status,pDate)");
DB.query("CREATE TABLE purchased(paymentId,pHash,pQuantity)");

//demo payment data from client side
let paymentData = {
    "name": "John Doe",
    "card": "5454444444444444",
    "password": "password",
    "cvv": "112",
    "expiry": "11/21",
    "address": "1502 Ridgeview DR",
    "city": "Somerset",
    "state": "PA",
    "zip": "15501",
    "organization": {
        "hash": ["org-12b70a8e-112c-4391-a44e-a32904172bf6"]
    },
    "hash": ["1febf89b-a0bf-4584-bfdd-6dc9eb6643cb", "f6c133cd-57ba-4e58-8856-e55b3243c07d", "3d34fac9-b8b4-4d1c-acf0-7f55ffbd9a4a", "95ff0aaf-b9a6-402b-8276-a5196e39a87c"],
    "amount": [1, 10, 5, 2]
}

//When i receive the payment data and finish transaction with stripe

let total = 0;

paymentData.hash.forEach(function(hash,i){
    //get the amount with the index
    let amount = paymentData.amount[i];
    //I will use the hash to get the data of this product from the products table
    //this is a demo, that data is now stored in item variable
    let item = {
        "pName":"Tomato",
        "pPrice":100,
    }

    //calculate the total price of items
    total += (item.pPrice * amount);
})

//now add data to payment table and get the id
DB.query(`INSERT INTO payments(cName,total,orgId,status,pDate) VALUES ("${paymentData.name}",${total},"${paymentData.organization.hash}","pending","${Date.now()}")`);

//In nodb an id column with auto increment is added on default
//This will return the lastId of the inserted item in the db.
let id = DB.lastId;

//Now lets use it to store the products 

paymentData.hash.forEach(function(theHash,i){
    //hash and theHash are the same
    let hash = paymentData.hash[i];
    let amount = paymentData.amount[i];

    DB.query(`INSERT INTO purchased VALUES (${id},"${hash}",${amount})`);
})

//When the organization wants to view the purchases
DB.query("SELECT * FROM payments ORDER BY status DESC");

let allData = DB.result;
let items = [];

allData.id.forEach(function(id,i){
    let item = {};
    //You will get the data here
})

*/