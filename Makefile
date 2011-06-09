
ALL_TESTS = $(shell find test/ -name '*.test.js')

run-tests:
	@~/node_modules/.bin/expresso \
		-I lib \
		-I support \
		--serial \
		$(TESTS)

test:
	@$(MAKE) TESTS="$(ALL_TESTS)" run-tests

build:
	./bin/build

.PHONY: test
