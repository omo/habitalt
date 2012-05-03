

S3_BUCKET_PUBLIC   = s3://www.habitalt.me
CRX_JS_THIRD_PARTY = crx/third_party
GAE_PUBLIC         = gae/public/
GAE_JS_THIRD_PARTY = gae/public/js/third_party
GAESDK_PATH = ~/local/google_appengine
PYTHON=python
CHROME=google-chrome
PACK_CRX_KEY = ${HOME}/memo/keys/crx.pem

CRX_MANIFEST = crx/manifest.json
CRX_BIN_ZIP = habitalt.zip
CRX_BIN_DIR = gae/public
CRX_BIN_CRX = ${CRX_BIN_DIR}/crx

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
	cp node_modules/less/dist/less-1.3.0.min.js $@
	cp node_modules/mustache/mustache.js $@
	cp third_party/jquery-1.7.2.min.js $@

pytest:
	cd gae && ${PYTHON} test.py ${GAESDK_PATH}

package: build ${CRX_BIN_ZIP} ${CRX_BIN_CRX}

${CRX_BIN_ZIP}: ${CRX_MANIFEST}
	zip -r $@ ./crx
${CRX_BIN_CRX}: ${CRX_MANIFEST}
	${CHROME} --pack-extension=./crx --pack-extension-key=${PACK_CRX_KEY}
	mv crx.crx ${CRX_BIN_CRX}

deploy: build package 
	make gaeup
	make s3sync

s3sync:
	s3cmd sync --acl-public ${GAE_PUBLIC} ${S3_BUCKET_PUBLIC}
s3fixup:
	s3cmd put --acl-public --mime-type="application/x-chrome-extension" ${CRX_BIN_CRX} ${S3_BUCKET_PUBLIC}
gaeup:
	${GAESDK_PATH}/appcfg.py update ./gae

clean: 
	-rm -r ${CRX_JS_THIRD_PARTY} ${GAE_JS_THIRD_PARTY}
	-rm ${CRX_BIN_ZIP} ${CRX_BIN_CRX}

bootstrap:
	npm install

.PHONY: bootstrap clean s3sync d3fixup deploy
