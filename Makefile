

CRX_JS_THIRD_PARTY = crx/third_party
GAE_JS_THIRD_PARTY = gae/public/js/third_party
GAESDK_PATH = ~/local/google_appengine/
PYTHON=python

build: ${CRX_JS_THIRD_PARTY} ${GAE_JS_THIRD_PARTY}

${GAE_JS_THIRD_PARTY}:
	mkdir -p $@
	cp node_modules/mustache/mustache.js $@
	cp node_modules/backbone/backbone-min.js $@
	cp node_modules/underscore/underscore-min.js $@
	cp third_party/jquery-1.7.2.min.js $@
	cp node_modules/less/dist/less-1.3.0.min.js $@

${CRX_JS_THIRD_PARTY}:
	mkdir -p $@
	cp node_modules/mustache/mustache.js $@
	cp third_party/jquery-1.7.2.min.js $@

pytest:
	cd gae && ${PYTHON} test.py ${GAESDK_PATH}

clean: 
	-rm -r ${CRX_JS_THIRD_PARTY} ${GAE_JS_THIRD_PARTY}

bootstrap:
	npm install

.PHONY: bootstrap clean
