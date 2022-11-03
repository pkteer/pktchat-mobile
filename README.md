# PktChat
## Pull code

Pull the code from our fork of the `mattermost-mobile/main` code.

```
git clone https://github.com/pkteer/PktChat
cd pktchat-mattermost-mobile
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

## Module Installation

Currently, `npm install` fails due to dependency conflicts and missing packages.

Therefore, we must run with the `--legacy-peer-deps` and `--force` flag

```console
npm install --legacy-peer-deps
```

## Configure build environment

Copy the `.env` and configure the settings for your Fastlane and AppStoreConnect accounts.

```
cp fastlane/env_vars_example .env
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
