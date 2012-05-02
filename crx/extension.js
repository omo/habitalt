
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

  filters: [
    "http://facebook.com/*",
    "http://*.facebook.com/*",
    "http://twitter.com/*",
    "https://plus.google.com/*",
    "http://mixi.jp/*",
    "https://mixi.jp/*",
    "http://*.hatena.ne.jp/*",
    "https://*.hatena.ne.jp/*"
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

Habitalt.prototype.setPatternStrings = function(values) {
  this._options.patterns = values;
};

Habitalt.prototype.getPatternStrings = function() {
  return this._options.patterns;
};

Habitalt.prototype.setFilterStrings = function(values) {
  this._options.filters = values;
};

Habitalt.prototype.getFilterStrings = function() {
  return this._options.filters;
};

Habitalt.prototype.setUrls = function(values) {
  ["destinationTemplate", "apiUrl", "siteUrl"].forEach(
    function(x) {
      this._options[x] = values[x];      
    }, this);
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
      },
      xhrFields: { withCredentials: true }
    }).done(function() {});
};

Habitalt.prototype.requstMatches = function(details) {
  return this.matches(details.url);
};

Habitalt.prototype.beforeRequestFilter = function(details) {
  var cancel = this.requstMatches(details);
  return { cancel: cancel };
};

Habitalt.prototype.makeFilteringUrls = function() {
  return this._options.filters;
};

Habitalt.prototype.addRequestFilters = function() {
  chrome.webRequest.onBeforeRequest.addListener(
    this.beforeRequestFilter.bind(this),
    { urls: this.makeFilteringUrls() },
    ["blocking"]);
};

Habitalt.OptionPage = function(app) {
  this._app = app;

  this._patternsRoot = $("#patterns");
  this._filtersRoot = $("#filters");
  $("#reset").on("click", this.reset.bind(this));
  $("#pattern-add-button").on("click", this.addNewPatternInput.bind(this, ""));
  $("#filter-add-button").on("click", this.addNewFilterInput.bind(this, ""));
  $("#save-button").on("click", this.save.bind(this));
  this._app.getPatternStrings().forEach(
    function(p) { this.addNewPatternInput(p); }, this);
  this._app.getFilterStrings().forEach(
    function(p) { this.addNewFilterInput(p); }, this);
  $("#api-server").val(this._app._options.apiUrl).on("input", this.markDirty.bind(this));
  $("#site-url").val(this._app._options.siteUrl).on("input", this.markDirty.bind(this));
  $("#destination").val(this._app._options.destinationTemplate).on("input", this.markDirty.bind(this));
};

Habitalt.OptionPage.prototype.addNewPatternInput = function(initialValue) {
  t = $("#patternEntryTemplate").html();
  var newBox = 
    $("<div class='pattern'>").html(
      Mustache.to_html(t, { value: initialValue }));
  newBox.find(".text").on("input", this.markDirty.bind(this));
  newBox.find(".delete-button").on(
    "click", function(evt) {
      newBox.remove();
      this.markDirty();
    }.bind(this));
  this._patternsRoot.append(newBox);
};

Habitalt.OptionPage.prototype.addNewFilterInput = function(initialValue) {
  t = $("#patternEntryTemplate").html();
  var newBox = 
    $("<div class='filter'>").html(
      Mustache.to_html(t, { value: initialValue }));
  newBox.find(".text").on("input", this.markDirty.bind(this));
  newBox.find(".delete-button").on(
    "click", function(evt) {
      newBox.remove();
      this.markDirty();
    }.bind(this));
  this._filtersRoot.append(newBox);
};

Habitalt.OptionPage.prototype.markDirty = function() {
  $("#save-button").removeAttr("disabled");
};

Habitalt.OptionPage.prototype.reset = function() {
  this._app.loadDefaultOptons();
  window.location.reload();
  chrome.extension.getBackgroundPage().location.reload();
};

Habitalt.OptionPage.prototype.save = function() {
  this._app.setPatternStrings(this.getPatternStrings());
  this._app.setFilterStrings(this.getFilterStrings());
  this._app.setUrls(
    {
      destinationTemplate: $("#destination").val(),
      apiUrl: $("#api-server").val(),
      siteUrl: $("#site-url").val()
    }
  );
  this._app.saveOptions();
  window.location.reload();
  chrome.extension.getBackgroundPage().location.reload();
};

Habitalt.OptionPage.prototype.getPatternStrings = function() {
  return this._patternsRoot.find(".text").map(
    function(e) { return this.value; }).toArray();
};

Habitalt.OptionPage.prototype.getFilterStrings = function() {
  return this._filtersRoot.find(".text").map(
    function(e) { return this.value; }).toArray();
};

Habitalt.initBackgroundPage = function() {
  var ha = new Habitalt();
  ha.addRequestFilters();
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
