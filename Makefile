TESTS = test/
REPORTER = dot

all: test

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 2000 \
		--growl \
		--ignore-leaks \
		--recursive \
		$(TESTS)

#test-cov: lib-cov
#	SUPERAGENT_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

#lib-cov:
#	jscoverage lib lib-cov

.PHONY: test
