#!/bin/bash
SRC_DIR='dist'
DISTRIBUTION_ID='E1QHTGVGYD1DWZ'
RESOURCE_DIR='drawing-tool'
# name of branch to deploy to root of site
PRODUCTION_BRANCH='master'

if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
	echo "skipping deploy to S3: this is a pull request"
	exit 0
fi

# extract current TAG if present
# the 2> is to prevent error messages when no match is found
CURRENT_TAG=`git describe --tags --exact-match $TRAVIS_COMMIT 2> /dev/null`

# strip PT ID from branch name for branch builds
DEPLOY_DIR_NAME=$TRAVIS_BRANCH
PT_PREFIX_REGEX="^([0-9]{8,}-)(.+)$"
PT_SUFFIX_REGEX="^(.+)(-[0-9]{8,})$"
if [[ $DEPLOY_DIR_NAME =~ $PT_PREFIX_REGEX ]]; then
  DEPLOY_DIR_NAME=${BASH_REMATCH[2]}
fi
if [[ $DEPLOY_DIR_NAME =~ $PT_SUFFIX_REGEX ]]; then
  DEPLOY_DIR_NAME=${BASH_REMATCH[1]}
fi

# tagged builds deploy to /version/TAG_NAME
if [ "$TRAVIS_BRANCH" = "$CURRENT_TAG" ]; then
  mkdir -p _site/version
  S3_DEPLOY_DIR="version/$TRAVIS_BRANCH"
  DEPLOY_DEST="_site/$S3_DEPLOY_DIR"
  INVAL_PATH="/$RESOURCE_DIR/version/$TRAVIS_BRANCH/index.html"
  # used by s3_website.yml
  export S3_DEPLOY_DIR

# production branch builds deploy to root of site
elif [ "$TRAVIS_BRANCH" = "$PRODUCTION_BRANCH" ]; then
  DEPLOY_DEST="_site"
  INVAL_PATH="/$RESOURCE_DIR/index.html"

# branch builds deploy to /branch/BRANCH_NAME
else
  mkdir -p _site/branch
  S3_DEPLOY_DIR="branch/$DEPLOY_DIR_NAME"
  DEPLOY_DEST="_site/$S3_DEPLOY_DIR"
  INVAL_PATH="/$RESOURCE_DIR/branch/$DEPLOY_DIR_NAME/index.html"
  # used by s3_website.yml
  export S3_DEPLOY_DIR
fi

# copy files to destination
mv $SRC_DIR $DEPLOY_DEST

# deploy the site contents
s3_website push --site _site

# explicit CloudFront invalidation to workaround s3_website gem invalidation bug
# with origin path (https://github.com/laurilehmijoki/s3_website/issues/207).
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths $INVAL_PATH