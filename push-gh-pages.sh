#!/bin/sh

echo "- running brunch build -e production"
rm -rf public
brunch build -e production

echo "- cloning drawing-tool repo into temporary dir"
git clone git@github.com:concord-consortium/drawing-tool.git --branch gh-pages __gh-pages-tmp__

echo "- copying /public content into temporary dir"
rsync -av --delete public/ __gh-pages-tmp__/ --exclude=".git/"
cd __gh-pages-tmp__

echo "- committing changes in gh-pages branch"
git add --all .
git commit -m "Auto-generated build commit"

echo "- pushing gh-pages branch"
git push origin gh-pages -f
cd ..

echo "- removing temporary dir"
rm -rf __gh-pages-tmp__
