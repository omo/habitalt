
var Ha = function() {
};


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

    addListItem: function(item) {
      var itemRoot = $("<div>");
      itemRoot[0].dataset.id = item.id;
      itemRoot[0].className = "reflect-list-item";
      itemRoot.html(Mustache.to_html($("#reflectingItemTemplate").html(), item));
      this.listRoot.append(itemRoot);
    },

    listWasLoaded: function(list) {
      list.forEach(this.addListItem.bind(this));
    }
  });

Ha.LoginoutView = Backbone.View.extend(
  {
    initialize: function(opts, app) {
      this.el = $(".loginout");
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
    }
  });


Ha.App = Backbone.Router.extend(
  {

    routes: {
      "reflecting": "reflecting",
      "welcome": "welcome",
      "?:url": "index",
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

    reflecting: function() {
      this.checkLogin();
      this.renderOnly([this._reflectingView, this._loginoutView]);
      this.loadReflectList();
    },

    index: function(path) {
      this._source = path ? decodeURIComponent(path) : null;
      this.checkLogin();
      this.renderOnly([this._askingView, this._loginoutView]);
      // We need this to handle backward history navs.
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
	  else
	    v.el.show();
	    v.render();
	}.bind(this));
    },

    postReflect: function(topost) {
      $.ajax(
	{
	  url: "/reflect",
	  type: "POST",
	  contentType: "application/json",
	  data: JSON.stringify(topost)
	}).done(
	  function() {
	    this.navigate("reflecting", { trigger: true });
	  }.bind(this));
    },

    loadReflectList: function() {
      $.ajax(
	{
	  url: "/reflect",
	  type: "GET",
	  dataType: "json"
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
	  url: "/ping",
	  type: "GET",
	  dataType: "json",
	  statusCode: {
	    403: function() {
	      this.loginWasChecked(false);
	    }.bind(this)
	  }
	}).done(
	  function(result) {
	    this.loginWasChecked(true);
	  }.bind(this));
    }

});

$(document).ready(
  function() {
    var app = new Ha.App();
    Backbone.history.start({ pushState: true });
});