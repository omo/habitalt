import os
from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext import testbed

class DataStoreTestHelper:

    def setUpBed(self):
        # First, create an instance of the Testbed class.
        self.testbed = testbed.Testbed()
        # Then activate the testbed, which prepares the service stubs for use.
        self.testbed.activate()
        # Next, declare which service stubs you want to use.
        self.testbed.init_datastore_v3_stub()
        self.testbed.init_memcache_stub()
        self.testbed.init_user_stub()

    def tearDownBed(self):
        self.testbed.deactivate()
        if os.environ.get('USER_EMAIL'):
            del os.environ['USER_EMAIL']
        if os.environ.get('USER_ID'):
            del os.environ['USER_ID']

    def giveUser(self):
        os.environ['USER_EMAIL'] = 'alice@example.com'
        os.environ['USER_ID'] = '12345'
