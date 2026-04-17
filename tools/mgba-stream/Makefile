CC         = gcc
MGBA_SRC   = $(HOME)/mgba
MGBA_BUILD = $(MGBA_SRC)/build

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
  # @loader_path = the binary's own directory, used when libmgba is copied alongside (CI/packaged).
  # Second rpath keeps existing dev builds working when libmgba lives in the build tree.
  ORIGIN_RPATH = -Wl,-rpath,@loader_path
  # Homebrew's opus.pc emits `-I$prefix/include/opus`, which makes `#include <opus.h>` work
  # but not `#include <opus/opus.h>` (as our source does). Linux gcc has `/usr/include` in its
  # default search path, so the angled include resolves there; macOS Clang doesn't search
  # `/opt/homebrew/include` by default. Add it explicitly so the angled path resolves.
  EXTRA_CFLAGS = -I$(shell brew --prefix)/include
else
  # Single-quote so the shell doesn't expand $ORIGIN; $$ then escapes Make
  # so the literal $ORIGIN reaches the linker as a runtime token.
  ORIGIN_RPATH = '-Wl,-rpath,$$ORIGIN'
  EXTRA_CFLAGS =
endif

CFLAGS   = -Wall -Wextra -O2 -I$(MGBA_SRC)/include $(EXTRA_CFLAGS) $(shell pkg-config --cflags vpx opus)
LDFLAGS  = -L$(MGBA_BUILD) $(ORIGIN_RPATH) -Wl,-rpath,$(MGBA_BUILD) -lmgba $(shell pkg-config --libs vpx opus)
TARGET   = mgba-stream
SRC      = mgba-stream.c

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

clean:
	rm -f $(TARGET)
