cd cli; \
lsof -ti:6767 | xargs -r kill -9; \
npm install; \
npm run build; \
cd dist; \
python3 -m http.server 6767
