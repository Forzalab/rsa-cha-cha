CXX      = g++
CCFLAGS  = -Iinclude -I. \
           -std=c++26 \
           -Wfatal-errors -Wno-sign-compare \
           -fsanitize=undefined -fsanitize=address
LDLIBS   = -lcurl -lpthread

SRCS  = $(wildcard *.cc)
OBJS  = $(SRCS:.cc=.o)
DEPS  = $(OBJS:.o=.d)
HDRS  = $(wildcard *.h)

# from raincheck
server.out: $(OBJS)
	@$(CXX) $(CCFLAGS) $^ -o $@ $(LDLIBS)
	@echo "linked -> ./svr"

%.o: %.cc
	@$(CXX) $(CCFLAGS) -MMD -MP -c $< -o $@
	@echo "compiled $<"

-include $(DEPS)

# syntax check w/o linking
check:
	@fail=0; \
	for h in $(HDRS); do \
	  if $(CXX) $(CCFLAGS) -Wall -fsyntax-only -x c++ $$h 2>&1; then \
	    echo "  ok    $$h"; \
	  else \
	    echo "  FAIL  $$h"; fail=1; \
	  fi; \
	done; \
	if [ $$fail -eq 0 ]; then echo "all headers compile."; \
	else echo "^^^ fix these before pushing."; exit 1; fi

clean:
	@rm -f *.o *.d *.out
	@echo "cleaned"

.PHONY: check clean
