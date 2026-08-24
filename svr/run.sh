cd svr; \
lsof -ti:6868 | xargs -r kill -9; \
make && ./server 6868
