cd cli; \
lsof -ti:6767 | xargs -r kill -9; \
rm -rf dist; \
npm install; \
npm run build; \
cd dist; \
python3 -m http.server 6767
