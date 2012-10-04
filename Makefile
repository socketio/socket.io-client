
ALL_TESTS = $(shell find test/ -name '*.test.js')

# Expresso's --include option no longer works
# as node no longer supports require.paths so instead
# we have to add our include paths to the NODE_PATH
export NODE_PATH := lib:support:$(NODE_PATH)

run-tests:
	@./node_modules/.bin/expresso \
		--serial \
		$(TESTS)

test:
	@$(MAKE) TESTS="$(ALL_TESTS)" run-tests

test-acceptance:
	@node support/test-runner/app $(TRANSPORT)

build:
	@node ./bin/builder.js

.PHONY: test
