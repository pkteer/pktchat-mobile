# PktChat
## Pull code

Pull the code from our fork of the `mattermost-mobile/main` code.

```
git clone https://github.com/pkteer/PktChat
```

## Setup environment

[Official Mattermost Tutorial](https://developers.mattermost.com/contribute/mobile/developer-setup/)

Install dependencies:

Need to install:
* [Android Studio](https://developer.android.com/studio)
* [Xcode](https://developer.apple.com/xcode/), and `xcode-select`
* [Java 11](https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html) (no newer)
```
# install Homebrew
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

# Install NodeJS
brew install nvm 
mkdir ~/.nvm 
echo "NVM_DIR=~/.nvm" >> ~/.bash_profile
echo "source $(brew --prefix nvm)/nvm.sh" >> ~/.bash_profile
source ~/.profile
nvm install node
nvm install 16

# Install Watchman
brew install watchman

# install Ruby
curl -sSL https://get.rvm.io | bash -s stable --ruby
source .bash_profile
rvm install 2.7.6
rvm use 2.7.6

# install bundler
gem install bundler --version 2.1.4

# install cocoapods
sudo gem install cocoapods -v 1.11.3

# Set github user.email
git config --global user.email "email@example.com"
```

## Set Android sdk path

You should create `local.properties` file to `android` directory and set sdk path `sdk.dir = /Users/username/Library/Android/sdk` like this.
The path can be other for different PC

## Module Installation

Currently, `npm install` fails due to dependency conflicts and missing packages.

Therefore, we must run with the `--legacy-peer-deps` and `--force` flag

```console
npm install --legacy-peer-deps
cd ios pod install
```

## Compiling

[Official Mattermost Tutorial](https://developers.mattermost.com/contribute/mobile/build-your-own/)

### iOS Simulator

```
npm run ios
```

### Android Emulator

```
npm run android
```

## Build for release
### Android
1. `cd android`
2. `sudo ./gralew clean`
3. `cd ../`
4. `react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res`
5. `sudo ./gradlew assembleRelease -x bundleReleaseJsAndAssets` this for .apk file
6. `sudo ./gradlew bundleRelease -x bundleReleaseJsAndAssets` this for .aab file (Play Store)

### IOS
1. done with Xcode

> **_NOTE:_**  Don't forget change versions in any new release.

