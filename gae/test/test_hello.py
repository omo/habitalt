import unittest
import os
import webapp2
import json
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
        self.assertEquals(response.status_int, 403, 
                          "Needs to be authenticated")
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

    def test_options(self):
        self.giveUser()
        request = webapp2.Request.blank('/reflect')
        request.method = "OPTIONS"
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 200)
        
    def test_get_with_origin(self):
        self.giveUser()
        extension_id = "chrome-extension://oncoblpnhjikioeiokkcaeckgcncbfcf"
        request = webapp2.Request.blank('/reflect')
        request.headers["Origin"] = extension_id
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 200) 
        self.assertEquals(response.headers["Access-Control-Allow-Origin"], "chrome-extension://oncoblpnhjikioeiokkcaeckgcncbfcf")

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

    def test_logout(self):
        request = webapp2.Request.blank('/logout')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 302)
        self.giveUser()
        request = webapp2.Request.blank('/logout')
        response = request.get_response(main.app)
        self.assertEquals(response.status_int, 302)
