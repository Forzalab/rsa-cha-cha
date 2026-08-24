cd svr; \
make && lsof -ti:6868 | xargs -r kill -9 && ./server 6868
