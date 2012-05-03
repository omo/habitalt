/*
 * JavaScript Pretty Date
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(date){
	var diff = (((new Date()).getTime() - date.getTime()) / 1000),
	    day_diff = Math.floor(diff / 86400);
			
	if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
		return undefined;
			
	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 minute ago" ||
			diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
		day_diff == 1 && "Yesterday" ||
		day_diff < 7 && day_diff + " days ago" ||
		day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

//

var Ha = function() {
};

Ha.TZ_OFFSET = (new Date()).getTimezoneOffset() * 60*1000;

Ha.toPrintableDateFromString = function(str) {
  // This approach seems suck...
  return new Date(Date.parse(str) - Ha.TZ_OFFSET);
};

Ha.URL = {
  API_BASE: "http://habitalt.appspot.com",

  getApiBase: function() {
    if (window.location.hostname == "localhost")
      return "http://localhost:8080";
    return Ha.URL.API_BASE;
  },

  getApiURL: function(path) {
    return Ha.URL.getApiBase() + path;
  },

  addPath: function(pathName) {
    Object.defineProperty(Ha.URL, pathName, { get: Ha.URL.getApiURL.bind(Ha.URL, "/" + pathName) });
  }
};

Ha.URL.addPath("logout");
Ha.URL.addPath("login");
Ha.URL.addPath("reflect");
Ha.URL.addPath("ping");

Ha.AskingView = Backbone.View.extend(
  {
    initialize: function(opts, app) {
      this.el = $(".asking");
      this._app = app;
    },

    render: function() {
      var viewParams = { source: this._app.getSource() };
      this.el.html(Mustache.to_html($("#askingViewTemplate").html(), viewParams));
      this.textarea = this.el.find("textarea");
      this.textarea.on("input", this.textDidCange.bind(this));
      this.button = this.el.find(".answering-button");
      this.button.on("click", this.buttonDidClick.bind(this));

      this.textarea.focus();
      this.textDidCange(null);
    },

    textDidCange: function(evt) {
      this.button.attr("disabled", this.textarea.val().length ? false : true);
    },

    buttonDidClick: function(evt) {
      this._app.postReflect({
	note: this.el.find(".answering-note").val(),
	source: this._app.getSource()
      });
    }
  });

Ha.makePresentationForReflectingItem = function(item) {
  var dateStr = Ha.dateToStringWithSecs(Ha.toPrintableDateFromString(item.created_at));

  return {
    readableSource: item.source.match(/https?:\/\/(.*?)\//)[1],
    fullSource: item.source,
    readableTime: dateStr,
    note: item.note
  };

};

Ha.instantiateTemplate = function(templateId, className, vars) {
  var itemRoot = $("<div>");
  itemRoot[0].className = className;
  itemRoot.html(
    Mustache.to_html($(templateId).html(), vars));
  return itemRoot;
};

Ha.listGroupByDate = function(list) {
  var result = {};
  for (var i = 0; i < list.length; ++i) {
    var item = list[i];
    // XXX: should take care of timezones.
    var createdAtMs = Date.parse(item.created_at);
    var groupKey = Math.round(-createdAtMs/(24*60*60*1000)).toString();
    if (!(groupKey in result))
      result[groupKey] = [];
    result[groupKey].push(item);
  }

  return result;
};

Ha.dateToStringWithSecs = function(date) {
    return date.toString().match(/\S+ \S+ \S+ \S+ \d+:\d+/)[0];
};

Ha.dateToStringWithDay = function(date) {
    return date.toString().match(/\S+ \S+ \S+ \S+/)[0];
};

Ha.ReflectingView = Backbone.View.extend(
  {
    initialize: function(opts, app) {
      this.el = $(".reflecting");
      this._app = app;
    },

    render: function() {
      var viewParams = {};
      this.el.html(Mustache.to_html($("#reflectingViewTemplate").html(), viewParams));
      this.listRoot = this.el.find(".reflecting-list");
    },

    addListDailyHeader: function(date) {
      var itemRoot = Ha.instantiateTemplate(
	"#reflectingDailyHeader", "reflect-list-daily-header", {
	   date: Ha.dateToStringWithDay(date)
	});
      this.listRoot.append(itemRoot);
    },

    addListItem: function(item) {
      var itemRoot = Ha.instantiateTemplate(
	"#reflectingItemTemplate", "reflect-list-item",
	Ha.makePresentationForReflectingItem(item));
      itemRoot[0].dataset.id = item.id;
      itemRoot.find(".ref-delete-button").on("click", itemRoot, this.didDeleteButtonClick.bind(this));
      this.listRoot.append(itemRoot);
    },

    didDeleteButtonClick: function(evt) {
      evt.preventDefault();
      var itemRoot = evt.data;
      itemRoot.addClass("deleting-element").on("webkitAnimationEnd", function() { itemRoot.remove(); });
      this._app.deleteReflectItem(itemRoot[0].dataset.id);
    },

    listWasLoaded: function(list) {
      if (list.length) {
	var itemsByDate = Ha.listGroupByDate(list);
	for (var key in itemsByDate) {
	  var items = itemsByDate[key];
	  this.addListDailyHeader(Ha.toPrintableDateFromString(items[0].created_at));
	  items.forEach(this.addListItem.bind(this));
	}
      }	else {
	this.listRoot.append(
	  Ha.instantiateTemplate(
	    "#reflectingNoItemTemplate", "reflect-no-item", {}));
      }
    }
  });

Ha.LoginoutView = Backbone.View.extend(
  {
    initialize: function(opts, app) {
      this.el = $(".loginout");
      this.el.find(".login").attr("href", Ha.URL.login);
      this.el.find(".logout").attr("href", Ha.URL.logout);
      this._app = app;
      this.loginStatusDidUpdated(app.isLogin());
    },

    render: function() {
      var viewParams = {};
      if (this._app.isLogin()) {
	this.el.find(".login").hide();
	this.el.find(".logout").show();
      } else {
	this.el.find(".login").show();
	this.el.find(".logout").hide();
      }
    },

    loginStatusDidUpdated: function() {
      this.render(this._app.isLogin());
    }
  });

Ha.WelcomeView = Backbone.View.extend(
  {
    initialize: function(opts, app) {
      this.el = $(".welcome");
      this._app = app;
    },

    render: function() {
      var viewParams = {};
      this.el.html(Mustache.to_html($("#welcomeViewTemplate").html(), viewParams));
      this.el.find(".login").attr("href", Ha.URL.login);
    }
  });


Ha.App = Backbone.Router.extend(
  {

    routes: {
      "reflecting": "reflecting",
      "welcome": "welcome",
      "u?:url": "asking",
      "": "index"
    },

    initialize: function(opts) {
      this._source = null;
      this._login = null;
      this._views = [];

      this._askingView = this.addView(new Ha.AskingView(opts, this));
      this._reflectingView = this.addView(new Ha.ReflectingView(opts, this));
      this._welcomeView = this.addView(new Ha.WelcomeView(opts, this));
      this._loginoutView = this.addView(new Ha.LoginoutView(opts, this));
    },

    isLogin: function() { return this._login; },
    getSource: function() { return this._source; },
    
    welcome: function() {
      this.renderOnly([this._welcomeView]);
    },

    reflectingWithoutLoad: function() {
      this.checkLogin();
      this.renderOnly([this._reflectingView, this._loginoutView]);
    },

    reflecting: function() {
      this.reflectingWithoutLoad();
      this.loadReflectList();
    },

    asking: function(path) {
      this._source = path ? decodeURIComponent(path) : null;
      this.checkLogin();
      this.renderOnly([this._askingView, this._loginoutView]);
      // We need this to handle backward history navs.
    },

    index: function() {
      this.checkLogin();
    },

    addView: function(view) {
      this._views.push(view);
      return view;
    },

    renderOnly: function(viewsToRender) {
      this._views.forEach(
	function(v) {
	  if (viewsToRender.indexOf(v) < 0)
	    v.el.hide();
	  else {
	    v.el.show();
	    v.render();
	  }
	}.bind(this));
    },

    postReflect: function(topost) {
      this.navigate("reflecting", { trigger: false });
      this.reflectingWithoutLoad();

      $.ajax(
	{
	  url: Ha.URL.reflect,
	  type: "PUT",
	  contentType: "application/json",
	  data: JSON.stringify(topost),
	  xhrFields: { withCredentials: true }
	}).done(
	  function() {
	    this.loadReflectList();
	  }.bind(this));
    },

    deleteReflectItem: function(id) {
      $.ajax(
	{
	  url: Ha.URL.reflect + "?id=" + id,
	  type: "DELETE",
	  xhrFields: { withCredentials: true }
	}).done(
	  function(result) {
	    //
	  }.bind(this));
    },

    loadReflectList: function() {
      $.ajax(
	{
	  url: Ha.URL.reflect,
	  type: "GET",
	  dataType: "json",
	  xhrFields: { withCredentials: true }
	}).done(
	  function(result) {
	    this._reflectingView.listWasLoaded(result.list);
	  }.bind(this));
    },

    navigateByLoginState: function() {
      if (!this.isLogin()) {
	this.navigate("welcome", { trigger: true });	
      } else if (!this.getSource()) {
	this.navigate("reflecting", { trigger: true });	
      }
    },

    loginWasChecked: function(pred) {
      this._login = pred;
      this._loginoutView.loginStatusDidUpdated(pred);
      window.setTimeout(this.navigateByLoginState.bind(this), 0);
    },

    checkLogin: function() {
      if (this._login !== null) {
	this.loginWasChecked(this._login);
	return;
      }

      $.ajax(
	{
	  url: Ha.URL.ping,
	  type: "GET",
	  dataType: "json",
	  xhrFields: { withCredentials: true }
	}).done(
	  function(result) {
	    this.loginWasChecked(true);
	  }.bind(this)).error(
	    function (jqXHR, textStatus, errorThrown) {
	      this.loginWasChecked(false);
	    }.bind(this));
    }

});

$(document).ready(
  function() {
    var app = new Ha.App();
    Backbone.history.start();
});