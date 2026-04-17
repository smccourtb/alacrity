CC         = gcc
MGBA_SRC   = $(HOME)/mgba
MGBA_BUILD = $(MGBA_SRC)/build

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
  # @loader_path = the binary's own directory, used when libmgba is copied alongside (CI/packaged).
  # Second rpath keeps existing dev builds working when libmgba lives in the build tree.
  ORIGIN_RPATH = -Wl,-rpath,@loader_path
else
  # Single-quote so the shell doesn't expand $ORIGIN; $$ then escapes Make
  # so the literal $ORIGIN reaches the linker as a runtime token.
  ORIGIN_RPATH = '-Wl,-rpath,$$ORIGIN'
endif

CFLAGS   = -Wall -Wextra -O2 -I$(MGBA_SRC)/include $(shell pkg-config --cflags vpx opus)
LDFLAGS  = -L$(MGBA_BUILD) $(ORIGIN_RPATH) -Wl,-rpath,$(MGBA_BUILD) -lmgba $(shell pkg-config --libs vpx opus)
TARGET   = mgba-stream
SRC      = mgba-stream.c

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

clean:
	rm -f $(TARGET)
