
import os
import webapp2
import webob.exc as exc
import jinja2
import json
from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import login_required

ALLOWED_DOMAINS = ["http://localhost:8080", "http://habitalt.appspot.com", "http://www.habitalt.me", "chrome-extension://oncoblpnhjikioeiokkcaeckgcncbfcf"]
REDIRECT_HOME = "http://localhost:8080/" if 0 <= os.environ['SERVER_SOFTWARE'].find('Development')  else "http://www.habitalt.me/"

class User(db.Model):
  account = db.UserProperty(required=True)

  @classmethod
  def ensure(cls, api_user):
    found = cls.all().filter('account = ', api_user).get()
    if found:
      return found
    fresh = User(account = api_user)
    fresh.put()
    return fresh

  @classmethod
  def ensure_current(cls):
    return cls.ensure(users.get_current_user())


class Reflect(db.Model):
  source = db.StringProperty(default="")
  note = db.TextProperty(default="")
  created_at = db.DateTimeProperty(auto_now_add=True)

  def to_dict(self):
    return { "id": str(self.key()), "source": self.source, "note": self.note, "created_at": self.created_at.ctime() }

  @classmethod
  def count_for(cls, me):
    return cls.all().ancestor(me).count()

jinja_environment = jinja2.Environment(
  loader=jinja2.FileSystemLoader(
    os.path.join(os.path.dirname(__file__), "template")))

routes = []


def make_sharable(fn):
  def wrap(*args):
    callee = args[0]
    callee.make_sharable()
    return fn(*args)
  return wrap

def login_required_unless_forbidden(fn):
  def wrap(*args):
    if not users.get_current_user():
      callee = args[0]
      callee.response.status = 403
      callee.response.out.write('Need to be logged in.')
      return
    return fn(*args)
  return wrap

def body_json_of(request, mandated_fields):
    if request.content_type != "application/json":
      raise exc.HTTPClientError("Needs JSON")
    req = json.loads(request.body)
    for f in mandated_fields:
      if not req.get(f):
        raise exc.HTTPClientError("Needs property %s" % f)
    return req


class ResourceSharableHandler(webapp2.RequestHandler):
  def make_sharable(self):
    origin = self.request.headers.get("Origin")
    if origin in ALLOWED_DOMAINS:
      # HACK: It looks chrome extension doesn't recognize space deliminated values.
      self.response.headers.add_header("Access-Control-Allow-Origin", origin)
    else:
      self.response.headers.add_header("Access-Control-Allow-Origin", " ".join(ALLOWED_DOMAINS))
    self.response.headers.add_header("Access-Control-Allow-Credentials", "true")

  def options(self):
    self.make_sharable()
  

class ReflectHandler(ResourceSharableHandler):
  @make_sharable
  @login_required_unless_forbidden
  def get(self):
    me = User.ensure_current()
    found = Reflect.all().ancestor(me).order("-created_at").fetch(limit=100)
    result = { "list": [ f.to_dict() for f in found ] }
    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(json.dumps(result))

  @make_sharable
  @login_required_unless_forbidden
  def put(self):
    req = body_json_of(self.request, ["source", "note"])
    me = User.ensure_current()
    data = Reflect(parent=me, source=req.get("source"), note=req.get("note"))
    data.put()

    self.response.content_type = "application/json"
    self.response.write(json.dumps(data.to_dict()))

  @make_sharable
  @login_required_unless_forbidden
  def delete(self):
    id = self.request.get("id")
    if not id:
      raise exc.HTTPClientError("Needs ID")
    me = User.ensure_current()
    found = Reflect.get_by_id(db.Key(encoded=id).id(), me)
    if not found:
      raise exc.HTTPNotFound("ID %s is not found" % id)
    found.delete()
    self.response.content_type = "application/json"
    self.response.write(json.dumps(found.to_dict()))

routes.append(('/reflect', ReflectHandler))


# Omits CORS headers to make this accessible from extension pages.
class PingHandler(ResourceSharableHandler):
  @make_sharable
  @login_required_unless_forbidden
  def get(self):
    self.response.out.write(json.dumps({}))
routes.append(('/ping', PingHandler))


class LoginHandler(webapp2.RequestHandler):
  def get(self):
    if not users.get_current_user():
      self.redirect(users.create_login_url(REDIRECT_HOME))
      return
    self.redirect(REDIRECT_HOME)
routes.append(('/login', LoginHandler))

class LogoutHandler(webapp2.RequestHandler):
  def get(self):
    if users.get_current_user():
      self.redirect(users.create_logout_url(REDIRECT_HOME))
      return
    self.redirect(REDIRECT_HOME)
routes.append(('/logout', LogoutHandler))



app = webapp2.WSGIApplication(routes, debug=True)
