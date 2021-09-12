var LIST_RESOLUTIONS = ["480p", "720p", "1080p"];
var LIST_LINK_TYPE = ["Magnet", "Torrent", "FF", "UL", "TF"];
var LIST_WEEKDAY = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
var LIST_TIME_FORMAT = ["Disabled", "d h:m:s", "d h:m"];

var MAP_STORAGE = { SERIES: JSON.stringify([]), RESOLUTION: 2, LINK_TYPE: 1, TIME_FORMAT: 1, DOWNLOADED_EPISODES: JSON.stringify([]), HEADER_IMG: "" };
var URL_MAL_SEARCH = "http://bettermyanimelist.net";
var URI_HBS_UPDATE = "/lib/latest.php";
var URI_HBS_SEARCH = "/lib/search.php";
var ARRAY_EPISODES = [];
var ARRAY_SERIES = [];
var ARRAY_WEEKDAYS = null;

var isHomePage = window.location.pathname.substr(1) === "";
var isSchedulePage = window.location.pathname.substr(1, 16) === "release-schedule";
var observer = null;

var lastRefreshedSerie = null;
var lastRefresh = 0;
var lastRefreshInterval = 0;
var refreshInterval = 2000;
var cooldown = null;

var dst = {
    2015: { start: new Date(2015, 3, 8, 2, 0, 0, 0), end: new Date(2015, 11, 1, 2, 0, 0, 0) },
    2016: { start: new Date(2016, 3, 13, 2, 0, 0, 0), end: new Date(2016, 11, 6, 2, 0, 0, 0) },
    2017: { start: new Date(2017, 3, 12, 2, 0, 0, 0), end: new Date(2017, 11, 5, 2, 0, 0, 0) },
    2018: { start: new Date(2018, 3, 11, 2, 0, 0, 0), end: new Date(2018, 11, 4, 2, 0, 0, 0) },
    2019: { start: new Date(2019, 3, 10, 2, 0, 0, 0), end: new Date(2019, 11, 3, 2, 0, 0, 0) }
};

(function() {
    for (var key in MAP_STORAGE) {
        if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, MAP_STORAGE[key]);
        }
    }
    observer = new(window.MutationObserver || window.MozMutationObserver || window.WebKitMutationObserver)(function(mutations) {
        var mutationsLength = mutations.length;
        mutations: for (var i = 0; i < mutationsLength; ++i) {
            var mutation = mutations[i];
            if (mutation.target.className === "latest") {
                var removedNodesLength = mutation.removedNodes.length;
                for (var j = 0; j < removedNodesLength; ++j) {
                    var node = mutation.removedNodes[j];
                    if (node.className === "episode") {
                        ARRAY_EPISODES = [];
                        if (lastRefreshedSerie !== null) {
                            lastRefreshedSerie.isRefreshing = false;
                        }
                        break;
                    }
                }
            }
            var addedNodesLength = mutation.addedNodes.length;
            for (var j = 0; j < addedNodesLength; ++j) {
                var node = mutations[i].addedNodes[j];
                if (node.id === "headerimg") {
                    var headerImgNode = node;
                    var oldHeaderSrc = node.src;
                    node.src = localStorage.HEADER_IMG !== "" ? localStorage.HEADER_IMG : oldHeaderSrc;
                    var headerButtons = document.createElement("div");
                    headerButtons.className = "headerButtons";

                    var changeHeaderButton = document.createElement("a");
                    changeHeaderButton.className = "headerButton";
                    changeHeaderButton.href = "javascript:;";
                    changeHeaderButton.textContent = "Header";
                    changeHeaderButton.onclick = function() {
                        var str = window.prompt("Enter the image URL:", headerImgNode.src !== oldHeaderSrc ? oldHeaderSrc : "");
                        if (str !== null && str !== "") {
                            localStorage.HEADER_IMG = str;
                            headerImgNode.src = str;
                        }
                    };

                    var optionsButton = document.createElement("a");
                    optionsButton.className = "headerButton";
                    optionsButton.href = "javascript:;";
                    optionsButton.textContent = "Options";
                    var optionsPopup = document.createElement("div");
                    var resolutionsSelect = document.createElement("select");
                    for (var y = 0; y < LIST_RESOLUTIONS.length; y++) {
                        var option = document.createElement("option");
                        option.value = y + 1;
                        option.text = LIST_RESOLUTIONS[y];
                        if (String(y + 1) === localStorage.RESOLUTION) {
                            option.selected = "selected";
                        }
                        resolutionsSelect.add(option);
                    }
                    resolutionsSelect.onchange = function() {
                        localStorage.RESOLUTION = this.value;
                    };
                    optionsPopup.appendChild(resolutionsSelect);
                    var linksTypesSelect = document.createElement("select");
                    for (var y = 0; y < LIST_LINK_TYPE.length; y++) {
                        var option = document.createElement("option");
                        option.value = y;
                        option.text = LIST_LINK_TYPE[y];
                        if (String(y) === localStorage.LINK_TYPE) {
                            option.selected = "selected";
                        }
                        linksTypesSelect.add(option);
                    }
                    linksTypesSelect.onchange = function() {
                        localStorage.LINK_TYPE = this.value;
                    };
                    optionsPopup.appendChild(linksTypesSelect);
                    var timeFormatSelect = document.createElement("select");
                    for (var y = 0; y < LIST_TIME_FORMAT.length; y++) {
                        var option = document.createElement("option");
                        option.value = y;
                        option.text = LIST_TIME_FORMAT[y];
                        if (String(y) === localStorage.TIME_FORMAT) {
                            option.selected = "selected";
                        }
                        timeFormatSelect.add(option);
                    }
                    timeFormatSelect.onchange = function() {
                        localStorage.TIME_FORMAT = this.value;
                    };
                    optionsPopup.appendChild(timeFormatSelect);
                    optionsPopup.className = "optionsPopup";
                    var overlay = document.createElement("div");
                    overlay.className = "overlay";
                    optionsButton.onclick = function() {
                        if (optionsPopup.style.display === "none") {
                            overlay.style.display = "block";
                            optionsPopup.style.display = "block";
                        } else {
                            overlay.onclick = function() {
                                overlay.style.display = "none";
                                optionsPopup.style.display = "none";
                            };
                        }
                        document.body.insertBefore(optionsPopup, document.body.firstChild);
                        document.body.insertBefore(overlay, document.body.firstChild);
                    };
                    var text = document.createElement("p");
                    var downloadedEpisodes = JSON.parse(localStorage.DOWNLOADED_EPISODES);
                    text.innerHTML = "Downloaded Animes: <b>" + downloadedEpisodes.length + "</b><br />" +
                        "Last Downloaded Episode: " + (downloadedEpisodes.length > 0 ? "<a href=" + downloadedEpisodes[downloadedEpisodes.length - 1].downloadLink + ">" + downloadedEpisodes[downloadedEpisodes.length - 1].str + "</a>" : "N\A");
                    optionsPopup.appendChild(text);
                    headerButtons.appendChild(changeHeaderButton);
                    headerButtons.appendChild(optionsButton);
                    node.parentNode.appendChild(headerButtons);
                }
                if (node.parentNode != null && node.parentNode.parentNode != null && node.nodeName === "TR" && (node.parentNode.parentNode.className === "schedule-table" || node.parentNode.parentNode.className === "schedule-today-table")) {
                    if (!isHomePage) {
                        if (node.parentNode.parentNode.className === "schedule-table" && ARRAY_SERIES.length === 0) {
                            observer.disconnect();
                            console.log("The mutation observer is no longer observing.");
                        }
                        if (ARRAY_WEEKDAYS === null && localStorage.TIME_FORMAT > 0 && node.parentNode.parentNode.className === "schedule-today-table") {
                            ARRAY_WEEKDAYS = [];


                            var weekdays = document.querySelectorAll(".weekday");
                            for (var d = 0; d < weekdays.length; d++) {
                                var table = weekdays[d].nextElementSibling;
                                var series = table.firstElementChild.childNodes;
                                if (LIST_WEEKDAY.indexOf(weekdays[d].textContent.toLowerCase()) === animesDate().getDay()) {
                                    weekdays[d].id = "today";
                                }
                                for (var dd = 0; dd < series.length; dd++) {
                                    var serie = series[dd];
                                    if (serie.nodeType === 3) {
                                        continue;
                                    }
                                    ARRAY_WEEKDAYS[serie.firstElementChild.textContent] = weekdays[d].textContent;
                                }
                            }
                        }
                        if (!isHomePage && ARRAY_EPISODES.length === 0) {
                            createVirtualEpisodeNode();
                        }
                    } else if (node.parentNode.parentNode.className === "schedule-table" && ARRAY_SERIES.length === 0) {
                        observer.disconnect();
                        console.log("The mutation observer is no longer observing.");
                        observer.observe(document.body.getElementsByClassName("latest")[0], { childList: true });
                        console.log("The mutation observer is observing.");
                    }
                    parseSerie(node);
                    if (node.parentNode.parentNode.className === "schedule-table" && node.parentNode.lastElementChild === node) {
                        if (localStorage.TIME_FORMAT > 0) {
                            initCooldown();
                        }
                        if (!isHomePage) {
                            break;
                        }
                    }
                } else if (node.className === "release-info") {
                    if (node.parentNode.firstElementChild === node) {
                        observer.disconnect();
                        console.log("The mutation observer is no longer observing.");
                    }
                    parseEpisode(node.firstElementChild.firstElementChild);
                    if (node.parentNode.getElementsByClassName("release-info")[node.parentNode.getElementsByClassName("release-info").length - 1] === node) {
                        observer.observe(node.parentNode, { childList: true });
                        console.log("The mutation observer is observing.");
                        break mutations;
                    }
                }
            }
        }
    });
    observer.observe(document, { childList: true, subtree: true, attributes: false, characterData: false });
    console.log("The mutation observer is observing.");
})();


function parseEpisode(node) {
    var episode = new Episode(node);
    episode.refreshData();
    ARRAY_EPISODES.push(episode);
}

function parseSerie(node) {
    var serie = new Serie(node);
    serie.refreshData();
    ARRAY_SERIES.push(serie);
}

function Serie(div) {
    this.div = div;
    this.title = this.div.firstElementChild.textContent.replace('\u2013', '-');
    this.latestEpisode = null;
    this.isDelayed = false;
    this.isFirstRefresh = true;
    this.hasAlreadyBeenRefreshed = false;
    this.isRefreshing = false;
    if (localStorage.TIME_FORMAT > 0) {
        var animeDate = animesDate();
        this.day = this.div.parentNode.parentNode.className !== "schedule-table" && typeof ARRAY_WEEKDAYS[this.title] !== "undefined" ? LIST_WEEKDAY.indexOf(ARRAY_WEEKDAYS[this.title].toLowerCase()) : animeDate.getDay();
        var releaseDay = animeDate.getDate() + (this.day + 7 - animeDate.getDay()) % 7;
        this.releaseTime = this.div.getElementsByClassName("schedule-time")[0];
        this.releaseTime.title = this.releaseTime.textContent;
        this.releaseDate = animesDate();
        this.releaseDate.setDate(releaseDay);
        this.releaseDate.setHours(this.releaseTime.textContent.split(":")[0]);
        this.releaseDate.setMinutes(this.releaseTime.textContent.split(":")[1]);
        this.releaseDate.setSeconds(60);
    }
    this.refreshData = function() {
        this.isLiked = JSON.parse(localStorage.SERIES).indexOf(this.title) !== -1;
        if (!isHomePage) {
            this.latestEpisode = getEpisodeBySerie(this);
        }
        this.div.className = "series " + (this.isLiked ? (this.latestEpisode === null && this.releaseDate <= animesDate() ? "delayed" : this.latestEpisode !== null ? "available" : "unavailable") : "unreleased");
        if (localStorage.TIME_FORMAT > 0) {
            if (this.latestEpisode !== null) {
                this.releaseTime.textContent = "Released";
            } else {
                this.refreshCooldown();
            }
        }
        refreshIconsSet(this);
    };
    this.refreshCooldown = function() {
        if (this.div.parentNode.parentNode.className == 'schedule-today-table' && this.div.parentNode.parentNode.previousElementSibling != null) {
            if (LIST_WEEKDAY.indexOf(this.div.parentNode.parentNode.previousElementSibling.textContent.toLowerCase()) === -1) {
                return;
            }
        }
        if (this.latestEpisode !== null || this.isDelayed || this.isRefreshing) {
            return;
        }
        if (this.releaseDate > animesDate()) {
            this.milliseconds = this.releaseDate.getTime() - animesDate().getTime();
            var e = this.milliseconds / 1000;
            var seconds = e % 60;
            e /= 60;
            var minutes = e % 60;
            e /= 60;
            var hours = e % 24;
            e /= 24;
            var days = e;
            this.releaseTime.textContent = (parseInt(days) > 0 ? parseInt(days) + "d " : "") + (parseInt(hours) < 10 ? "0" : "") + parseInt(hours) + ":" +
                (parseInt(minutes) < 10 ? "0" : "") + parseInt(minutes) + (localStorage.TIME_FORMAT === "1" ? (":" + (parseInt(seconds) < 10 ? "0" : "") + parseInt(seconds)) : "");
        } else if (!this.isFirstRefresh && !this.hasAlreadyBeenRefreshed) {
            this.isRefreshing = true;
            this.hasAlreadyBeenRefreshed = true;
            refreshEpisodesNode(this);
        } else {
            this.releaseTime.textContent = "Delayed";
            this.isDelayed = true;
            if (this.isLiked) {
                this.div.className = "delayed";
            }
        }
        if (this.isFirstRefresh) {
            this.isFirstRefresh = false;
        }
    };
}

function Episode(div) {
    this.div = div;
    var content = this.div.firstElementChild.textContent;
    this.date = content.slice(0, content.indexOf(" "));
    this.title = content.slice(content.indexOf(" "), content.lastIndexOf("-")).trim().replace('\u2013', '-');
    this.id = this.div.parentNode.parentNode.id;
    this.refreshData = function() {
        this.isLiked = JSON.parse(localStorage.SERIES).indexOf(this.title) !== -1;
        this.currentResolution = localStorage.RESOLUTION;
        this.resolution = this.div.childNodes[this.currentResolution];
        this.div.className = "episode" + (this.isLiked ? (isAnewEpisode(this) ? " new" : " old") : "");
        if (this.resolution.childNodes.length === 0) {
            var $480p = this.div.childNodes[1];
            var $720p = this.div.childNodes[2];
            var $1080p = this.div.childNodes[3];
            var resolution = localStorage.RESOLUTION === 0 ? ($720p.childNodes.length > 1 ? $720p : $1080p) :
                localStorage.RESOLUTION === 1 ? ($1080p.childNodes.length > 1 ? $1080p : $480p) :
                ($720p.childNodes.length > 1 ? $720p : $480p);
            this.resolution = resolution === 0 ? $480p : resolution === 1 ? $720p : $1080p;
            this.currentResolution = resolution === 0 ? 0 : resolution === 1 ? 1 : 2;
        }
        this.downloadLink = "#";
        if (document.getElementById(this.div.id + '-' + LIST_RESOLUTIONS[this.currentResolution - 1]) != null) {
            var links = document.getElementById(this.div.id + '-' + LIST_RESOLUTIONS[this.currentResolution - 1]).firstElementChild.childNodes;
            var linksLength = links.length;
            for (var i = 0; i < linksLength; i++) {
                if (links[i].firstElementChild.textContent === LIST_LINK_TYPE[localStorage.LINK_TYPE]) {
                    this.downloadLink = links[i].firstElementChild.firstElementChild.href;
                    break;
                }
            }
        }
        if (isHomePage && isTheLatestEpisode(this)) {
            var seriesLength = ARRAY_SERIES.length;
            for (var i = 0; i < seriesLength; i++) {
                var serie = ARRAY_SERIES[i];
                if (serie.title === this.title) {
                    serie.latestEpisode = this;
                    serie.refreshData();
                }
            }
        }
        refreshIconsSet(this);
    };
    this.toString = function() {
        return this.title + " episode " + this.id + " [" + LIST_RESOLUTIONS[this.currentResolution - 1] + "] via " + LIST_LINK_TYPE[localStorage.LINK_TYPE];
    };
}

function refreshIconsSet(obj) {
    var icons = [];
    icons[0] = { name: obj.isLiked ? "dislike" : "like", title: (obj.isLiked ? "Dislike " : "Like ") + obj.title };
    var ep = isASerie(obj) ? obj.latestEpisode : obj;
    if (ep !== null) {
        if (obj.div.parentNode.parentNode.className !== 'schedule-today-table') {
            icons[1] = { name: "download", title: "Download " + ep.toString() };
            icons[2] = { name: "mal", title: "Watch " + obj.title + " on MyAnimeList.net" };
        } else {
            icons[1] = { name: "mal", title: "Watch " + obj.title + " on MyAnimeList.net" };
        }
    } else {
        icons[1] = { name: "mal", title: "Watch " + obj.title + " on MyAnimeList.net" };
    }
    var iconsSet = document.createElement("div");
    iconsSet.className = "iconsSet";
    var iconsLength = icons.length;
    for (var i = 0; i < iconsLength; i++) {
        var icon = document.createElement("p");
        icon.className = icons[i].name;
        icon.title = icons[i].title;
        icon.onclick = function() {
            switch (this.className) {
                case "like":
                case "dislike":
                    var list = JSON.parse(localStorage["SERIES"]);
                    if (list.indexOf(obj.title) === -1) {
                        list.push(obj.title);
                    } else {
                        list.splice(list.indexOf(obj.title), 1);
                    }
                    localStorage["SERIES"] = JSON.stringify(list);
                    obj.refreshData();
                    if (isHomePage || isSchedulePage) {
                        var array;
                        if (isAnEpisode(obj) || isSchedulePage) {
                            array = ARRAY_SERIES.concat(ARRAY_EPISODES);
                        } else {
                            array = ARRAY_EPISODES;
                        }
                        var arrayLength = array.length;
                        for (var l = 0; l < arrayLength; l++) {
                            if (array[l].title === obj.title && obj !== array[l]) {
                                array[l].refreshData();
                            }
                        }
                    }
                    break;
                case "download":
                    var list = JSON.parse(localStorage.DOWNLOADED_EPISODES);
                    list.push({ title: ep.title, id: ep.id, downloadLink: ep.downloadLink, str: ep.toString() });
                    localStorage.DOWNLOADED_EPISODES = JSON.stringify(list);
                    if (ep.downloadLink === "#") {
                        alert("This type of link is not yet available for this episode.\u000APlease try another.");
                        return;
                    }
                    if (localStorage.LINK_TYPE > 2) {
                        window.open(ep.downloadLink);
                    } else {
                        window.location = ep.downloadLink;
                    }
                    break;
                case "mal":
                    window.open(URL_MAL_SEARCH);
                    break;
            }
        };
        iconsSet.appendChild(icon);
    }
    if (obj.div.getElementsByClassName("iconsSet").length > 0) {
        obj.div.removeChild(obj.div.getElementsByClassName("iconsSet")[0]);
    }
    obj.div.insertBefore(iconsSet, obj.div.firstChild);
}

function getEpisodeBySerie(serie) {
    console.log(serie.title);
    var episode = null;
    var arrayEpisodeLength = ARRAY_EPISODES.length;
    for (var i = 0; i < arrayEpisodeLength; i++) {
        if (ARRAY_EPISODES[i].title === serie.title && isTheLatestEpisode(ARRAY_EPISODES[i])) {
            episode = ARRAY_EPISODES[i];
            break;
        }
    }
    console.log('=> ' + episode);
    return episode;
}

function isAnewEpisode(episode) {
    var currentEpisodeDate = episode.div.textContent.split(" ")[0];
    var firstEpisodeDate = episode.div.parentNode.textContent.split(" ")[0];
    return currentEpisodeDate === firstEpisodeDate;
}

function isTheLatestEpisode(episode) {
    var content = episode.div.textContent.split(" ")[0].slice(1, episode.div.textContent.split(" ")[0].length - 1);
    var month = content.split("/")[0];
    var day = content.split("/")[1];
    var releaseDate = animesDate();
    releaseDate.setMonth(month - 1, day);
    if (content.split("/").length > 2) {
        releaseDate.setYear(content.split("/")[2]);
    }
    return (releaseDate >= animesDate());
}

function animesDate() {
    var d = new Date();
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    var nd = new Date(utc + (3600000 * -8));
    if (dst[nd.getFullYear()].start >= nd && dst[nd.getFullYear()].end >= nd) {
        nd.setHours(nd.getHours() + 1);
    }
    return nd;
}

function initCooldown() {
    cooldown = setInterval(function() {
        for (var name in ARRAY_SERIES) {
            var serie = ARRAY_SERIES[name];
            serie.refreshCooldown();
        }
    }, localStorage.TIME_FORMAT === "1" ? 1000 : 60000);
    console.log("Cooldown initialized");
}

function createVirtualEpisodeNode() {
    console.log("Creating a virtual episode node...");
    ARRAY_EPISODES = [];
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
                var serie = document.createElement("div");
                serie.innerHTML = xmlhttp.responseText;
                for (var p = 0; p < serie.childNodes.length; p++) {
                    if (serie.childNodes[p].nodeType === 3) {
                        continue;
                    }
                    if (serie.childNodes[p].classList.contains('release-links')) {
                        continue;
                    }
                    parseEpisode(serie.childNodes[p].firstElementChild.firstElementChild);
                }
            } else {
                alert("An error occurred: You should contact the developer of this extension.");
            }
        }
    };
    xmlhttp.open("GET", URI_HBS_UPDATE, false);
    xmlhttp.send();
}

function isASerie(obj) {
    return obj.constructor.name === "Serie";
}

function isAnEpisode(obj) {
    return obj.constructor.name === "Episode";
}

function refreshEpisodesNode(e) {
    var date = new Date();
    var diff = lastRefresh > 0 ? (date.getTime() - lastRefresh) : refreshInterval;
    lastRefresh = date.getTime();
    lastRefreshInterval = diff < refreshInterval ? refreshInterval + lastRefreshInterval : refreshInterval;
    e.releaseTime.textContent = "Waiting...";
    setTimeout(function() {
        e.releaseTime.textContent = "Refreshing...";
        lastRefreshedSerie = e;
        if (isHomePage) {
            document.body.getElementsByClassName("refreshbutton")[0].click();
        } else {
            createVirtualEpisodeNode(function() {
                e.isRefreshing = false;
            });
        }
    }, lastRefreshInterval);
}
