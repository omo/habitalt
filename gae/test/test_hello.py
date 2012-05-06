import unittest
import os
import webapp2
import json
import urllib
from google.appengine.api import users

import main
import helpers
from main import Reflect, User

class ReflectTest(unittest.TestCase, helpers.DataStoreTestHelper):

    def setUp(self):
        self.setUpBed()

    def tearDown(self):
        self.tearDownBed()
        
    def test_auth(self):
        request = webapp2.Request.blank('/reflect')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 403)

        request = webapp2.Request.blank('/reflect', POST="")
        request.method = "PUT"
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 403, 
                          "Needs to be authenticated")

    def test_get(self):
        self.giveUser()
        request = webapp2.Request.blank('/reflect')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 200) 
        
    def test_post(self):
        self.giveUser()
        me = User.ensure_current()
        self.assertEquals(0, Reflect.count_for(me))
        request = webapp2.Request.blank('/reflect', POST='{"note":"Hello","source":"http://google.com/"}')
        request.method = "PUT"
        request.content_type = "application/json"
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 200)
        self.assertEquals(1, Reflect.count_for(me))
        json.loads(response.body)        

    def test_delete(self):
        self.giveUser()
        me = User.ensure_current()
        toput = Reflect(parent=me, source="http://example.com", note="Hello")
        toput.put()
        self.assertEquals(1, Reflect.count_for(me))

        request = webapp2.Request.blank('/reflect?id=%s' % str(toput.key()))
        request.method = "DELETE"
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 200)
        self.assertEquals(0, Reflect.count_for(me))
        json.loads(response.body)

    def test_options(self):
        self.giveUser()
        request = webapp2.Request.blank('/reflect')
        request.method = "OPTIONS"
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 200)
        
    def test_get_with_origin(self):
        self.giveUser()
        request = webapp2.Request.blank('/reflect')
        request.headers["Origin"] = main.EXTENSION_URLS[0]
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 200) 
        self.assertEquals(response.headers["Access-Control-Allow-Origin"], main.EXTENSION_URLS[0])

class LoginTest(unittest.TestCase, helpers.DataStoreTestHelper):

    def setUp(self):
        self.setUpBed()

    def tearDown(self):
        self.tearDownBed()

    def test_login(self):
        request = webapp2.Request.blank('/login')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 302)
        self.giveUser()
        request = webapp2.Request.blank('/login')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 302)

    def test_login_to(self):
        self.giveUser()
        dest = u'http://localhost:8080/#u=' + urllib.quote('http://example.com');
        url = '/login?to=' + urllib.quote(dest)
        request = webapp2.Request.blank(url)
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 302)
        self.assertEquals(response.headers["Location"], dest)

    def test_logout(self):
        request = webapp2.Request.blank('/logout')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 302)
        self.giveUser()
        request = webapp2.Request.blank('/logout')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 302)


class RedirectTest(unittest.TestCase, helpers.DataStoreTestHelper):

    def setUp(self):
        self.setUpBed()

    def tearDown(self):
        self.tearDownBed()

    def test_hello(self):
        request = webapp2.Request.blank('/redirect')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 400)
        self.giveUser()
        request = webapp2.Request.blank('/redirect?to=http%3A%2F%2Fwww.habitalt.me%2F')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 302)
        self.assertEquals(response.headers["Location"], "http://www.habitalt.me/")
        request = webapp2.Request.blank('/redirect?to=http%3A%2F%2Fwww.example.com%2F')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 400)
