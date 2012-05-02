
var OPTION_VERSION = 1;

var DEFAULT_OPTIONS = {
  version: OPTION_VERSION,
  patterns: [
    "^http(s)?://(www\\.)?facebook\.com/",
    "^http(s)?://(www\\.)?twitter\\.com/",
    "^https://plus\\.google\\.com/",
    "^http(s)?://mixi\\.jp/",
    "^http(s)?://b\\.hatena\\.ne\\.jp/",
    "^http(s)?://d\\.hatena\\.ne\\.jp/$"
  ],

  destinationTemplate: "http://habitalt.appspot.com/#u?%s",
  apiUrl: "http://habitalt.appspot.com/",
  siteUrl: "http://habitalt.appspot.com/"
};

var Habitalt = function() {
  this.loadOptons();
};

Habitalt.prototype.loadDefaultOptons = function() {
  this._options = DEFAULT_OPTIONS;    
  this.saveOptions();
};

Habitalt.prototype.loadOptons = function() {
  var optionsString = window.localStorage["options"];
  this._options = optionsString ? JSON.parse(optionsString) : null;
  if (!this._options)
    this.loadDefaultOptons();
  this._destinationTemplate = this._options.destinationTemplate;
  this._patterns = this._options.patterns.map(
    function(patternString) {
      return new RegExp(patternString);
    });
};

Habitalt.prototype.saveOptions = function() {
  window.localStorage["options"] = JSON.stringify(this._options);
};

Habitalt.prototype.savePatternStrings = function(patterns) {
  this._options.patterns = patterns;
  this.saveOptions();
};

Habitalt.prototype.getPatternStrings = function() {
  return this._options.patterns;
};

Habitalt.prototype.matches = function(url) {
  return this._patterns.some(function(p) { return url.match(p); }, this);
};

Habitalt.prototype.destinationFrom = function(url) {
  return this._destinationTemplate.replace("%s", encodeURIComponent(url));
};

Habitalt.prototype.redirect = function(tab) {
  var prop = {
    url: this.destinationFrom(tab.url)
  };

  chrome.tabs.update(tab.id, prop , function(tab) {});
};

Habitalt.prototype.redirectIfMatches = function(tab) {
  if (tab.url && this.matches(tab.url))
    this.redirect(tab);
};

Habitalt.prototype.onCreated = function(tab) {
  this.redirectIfMatches(tab);
};

Habitalt.prototype.onUpdated = function(tabId, changeInfo, tab) {
  this.redirectIfMatches(tab);
};

Habitalt.prototype.showLanding = function () {
  var props  = {
    url: this._options.siteUrl
  };

  chrome.tabs.create(props);
};

Habitalt.prototype.ensureLogin = function () {
  var url = this._options.apiUrl + "ping";
  $.ajax(
    {
      url: url,
      type: "GET",
      dataType: "json",
      statusCode: {
	403: function() {
	  this.showLanding();
	}.bind(this)
      }
    }).done(function() {});
};

//

Habitalt.OptionPage = function(app) {
  this._app = app;

  this._patternsRoot = $("#patterns");
  $("#patterns-reset").on("click", this.reset.bind(this));
  $("#pattern-add-button").on("click", this.addNewPatternInput.bind(this, ""));
  $("#pattern-save-button").on("click", this.savePatterns.bind(this));
  this._app.getPatternStrings().forEach(
    function(p) { this.addNewPatternInput(p); }, this);
};

Habitalt.OptionPage.prototype.addNewPatternInput = function(initialValue) {
  t = $("#patternEntryTemplate").html();
  var newPatternBox = 
    $("<div class='pattern'>").html(
      Mustache.to_html(t, { value: initialValue }));
  newPatternBox.find(".pattern-delete-button").on(
    "click", function(evt) {
      newPatternBox.remove();
      this.savePatterns();
    }.bind(this));
  this._patternsRoot.append(newPatternBox);
};

Habitalt.OptionPage.prototype.reset = function() {
  this._app.loadDefaultOptons();
  window.location.reload();
  chrome.extension.getBackgroundPage().location.reload();
};

Habitalt.OptionPage.prototype.savePatterns = function() {
  this._app.savePatternStrings(this.getPatternStrings());
  window.location.reload();
  chrome.extension.getBackgroundPage().location.reload();
};

Habitalt.OptionPage.prototype.getPatternStrings = function() {
  return this._patternsRoot.find(".pattern-text").map(
    function(e) { return this.value; }).toArray();
};

Habitalt.initBackgroundPage = function() {
  var ha = new Habitalt();
  chrome.tabs.onCreated.addListener(ha.onCreated.bind(ha));
  chrome.tabs.onUpdated.addListener(ha.onUpdated.bind(ha));
  ha.ensureLogin();
};

Habitalt.initOptionPage = function() {
  var page = new Habitalt.OptionPage(new Habitalt());
};

if (0 < window.location.toString().indexOf("background.html"))
  Habitalt.initBackgroundPage();
if (0 < window.location.toString().indexOf("options.html"))
  $(document).ready(Habitalt.initOptionPage);
