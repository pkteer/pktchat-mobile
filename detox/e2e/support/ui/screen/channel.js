// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CameraQuickAction,
    FileQuickAction,
    ImageQuickAction,
    InputQuickAction,
    MainSidebar,
    PostDraft,
    PostList,
    PostOptions,
    ProfilePicture,
    SendButton,
    SettingsSidebar,
} from '@support/ui/component';
import {
    LoginScreen,
    SelectServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {isAndroid} from '@support/utils';

class ChannelScreen {
    testID = {
        channelScreenPrefix: 'channel.',
        channelIntroProfilePicturePrefix: 'channel_intro.profile_picture.',
        channelScreen: 'channel.screen',
        channelPostList: 'channel.post_list',
        mainSidebarDrawerButton: 'main_sidebar_drawer.button',
        mainSidebarDrawerButtonBadge: 'main_sidebar_drawer.button.badge',
        mainSidebarDrawerButtonBadgeUnreadCount: 'main_sidebar_drawer.button.badge.unread_count',
        mainSidebarDrawerButtonBadgeUnreadIndicator: 'main_sidebar_drawer.button.badge.unread_indicator',
        channelIntro: 'channel_intro.beginning.text',
        channelNavBarTitle: 'channel.nav_bar.title',
        channelSearchButton: 'channel.search.button',
        channelTitleButton: 'channel.title.button',
        settingsSidebarDrawerButton: 'settings_sidebar_drawer.button',
    };

    channelScreen = element(by.id(this.testID.channelScreen));
    channelPostList = element(by.id(this.testID.channelPostList));
    mainSidebarDrawerButton = element(by.id(this.testID.mainSidebarDrawerButton));
    mainSidebarDrawerButtonBadge = element(by.id(this.testID.mainSidebarDrawerButtonBadge));
    mainSidebarDrawerButtonBadgeUnreadCount = element(by.id(this.testID.mainSidebarDrawerButtonBadgeUnreadCount));
    mainSidebarDrawerButtonBadgeUnreadIndicator = element(by.id(this.testID.mainSidebarDrawerButtonBadgeUnreadIndicator));
    channelIntro = element(by.id(this.testID.channelIntro));
    channelNavBarTitle = element(by.id(this.testID.channelNavBarTitle));
    channelSearchButton = element(by.id(this.testID.channelSearchButton));
    channelTitleButton = element(by.id(this.testID.channelTitleButton));
    settingsSidebarDrawerButton = element(by.id(this.testID.settingsSidebarDrawerButton));

    // convenience props
    atInputQuickAction = InputQuickAction.getAtInputQuickAction(this.testID.channelScreenPrefix);
    atInputQuickActionDisabled = InputQuickAction.getAtInputQuickActionDisabled(this.testID.channelScreenPrefix);
    slashInputQuickAction = InputQuickAction.getSlashInputQuickAction(this.testID.channelScreenPrefix);
    slashInputQuickActionDisabled = InputQuickAction.getSlashInputQuickActionDisabled(this.testID.channelScreenPrefix);
    fileQuickAction = FileQuickAction.getFileQuickAction(this.testID.channelScreenPrefix);
    fileQuickActionDisabled = FileQuickAction.getFileQuickActionDisabled(this.testID.channelScreenPrefix);
    imageQuickAction = ImageQuickAction.getImageQuickAction(this.testID.channelScreenPrefix);
    imageQuickActionDisabled = ImageQuickAction.getImageQuickActionDisabled(this.testID.channelScreenPrefix);
    cameraQuickAction = CameraQuickAction.getCameraQuickAction(this.testID.channelScreenPrefix);
    cameraQuickActionDisabled = CameraQuickAction.getCameraQuickActionDisabled(this.testID.channelScreenPrefix);
    postDraft = PostDraft.getPostDraft(this.testID.channelScreenPrefix);
    postDraftArchived = PostDraft.getPostDraftArchived(this.testID.channelScreenPrefix);
    postDraftReadOnly = PostDraft.getPostDraftReadOnly(this.testID.channelScreenPrefix);
    postInput = PostDraft.getPostInput(this.testID.channelScreenPrefix);
    sendButton = SendButton.getSendButton(this.testID.channelScreenPrefix);
    sendButtonDisabled = SendButton.getSendButtonDisabled(this.testID.channelScreenPrefix);

    postList = new PostList(this.testID.channelScreenPrefix);

    getChannelIntroProfilePicture = (userId) => {
        const profilePictureItemMatcher = ProfilePicture.getProfilePictureItemMatcher(this.testID.channelIntroProfilePicturePrefix, userId);
        return element(profilePictureItemMatcher);
    };

    getMoreMessagesButton = () => {
        return this.postList.getMoreMessagesButton();
    };

    getNewMessagesDivider = () => {
        return this.postList.getNewMessagesDivider();
    };

    getPostListPostItem = (postId, text, postProfileOptions = {}) => {
        return this.postList.getPost(postId, text, postProfileOptions);
    };

    getPostMessageAtIndex = (index) => {
        return this.postList.getPostMessageAtIndex(index);
    };

    toBeVisible = async () => {
        await expect(this.channelScreen).toBeVisible();

        return this.channelScreen;
    };

    open = async (user) => {
        // # Open channel screen
        await LoginScreen.open();
        await LoginScreen.login(user);

        return this.toBeVisible();
    };

    logout = async () => {
        await this.openSettingsSidebar();
        await SettingsSidebar.tapLogoutAction();
        await SelectServerScreen.toBeVisible();
    };

    closeMainSidebar = async () => {
        if (isAndroid()) {
            // # Close main sidebar
            await this.swipeLeft();
            await this.toBeVisible();
        } else {
            // # iOS workaround for now
            await device.reloadReactNative();
        }
    };

    closeSettingsSidebar = async () => {
        if (isAndroid()) {
            // # Close settings sidebar
            await this.swipeRight();
            await this.toBeVisible();
        } else {
            // # iOS workaround for now
            await device.reloadReactNative();
        }
    };

    closeTeamSidebar = async () => {
        // # Close team sidebar
        await MainSidebar.closeTeamSidebar();
        await this.closeMainSidebar();
    };

    deletePost = async (postId, text, {confirm = true} = {}) => {
        await this.openPostOptionsFor(postId, text);

        // # Delete post
        await PostOptions.deletePost({confirm});
        await this.toBeVisible();
    };

    goToChannel = async (displayName) => {
        await this.openMainSidebar();
        const channelItem = MainSidebar.getChannelByDisplayName(displayName);
        await channelItem.tap();
        await expect(this.channelNavBarTitle).toHaveText(displayName);
    };

    openMainSidebar = async () => {
        // # Open main sidebar
        await this.mainSidebarDrawerButton.tap();
        await expect(MainSidebar.channelsList).toBeVisible();
        await MainSidebar.toBeVisible();
    };

    openSettingsSidebar = async () => {
        // # Open settings sidebar
        await this.settingsSidebarDrawerButton.tap();
        await SettingsSidebar.toBeVisible();
    };

    openTeamSidebar = async () => {
        // # Open team sidebar
        await this.openMainSidebar();
        await MainSidebar.openTeamSidebar();
    };

    openPostOptionsFor = async (postId, text) => {
        const {postListPostItem} = await this.getPostListPostItem(postId, text);
        await expect(postListPostItem).toBeVisible();

        // # Open post options
        await postListPostItem.longPress();
        await PostOptions.toBeVisible();
    };

    openReplyThreadFor = async (postId, text) => {
        await this.openPostOptionsFor(postId, text);

        // # Open reply thread screen
        await PostOptions.replyAction.tap();
        await ThreadScreen.toBeVisible();
    };

    postMessage = async (message, {quickReplace = false} = {}) => {
        // # Post message
        await this.postInput.tap();
        if (quickReplace) {
            await this.postInput.replaceText(message);
        } else {
            await this.postInput.typeText(message);
        }
        await this.tapSendButton();
    };

    swipeLeft = async () => {
        await this.channelScreen.swipe('left');
    };

    swipeRight = async () => {
        await this.channelScreen.swipe('right');
    };

    tapSendButton = async () => {
        // # Tap send button
        await this.sendButton.tap();
        await expect(this.sendButton).not.toExist();
        await expect(this.sendButtonDisabled).toBeVisible();
    };

    hasLongPostMessage = async (postMessage) => {
        await expect(
            this.getLongPostMessage(),
        ).toHaveText(postMessage);
    };

    hasPostMessage = async (postId, postMessage) => {
        const {postListPostItem} = this.getPostListPostItem(postId, postMessage);
        await expect(postListPostItem).toBeVisible();
    };

    hasPostMessageAtIndex = async (index, postMessage) => {
        await expect(
            this.getPostMessageAtIndex(index),
        ).toHaveText(postMessage);
    };
}

const channelScreen = new ChannelScreen();
export default channelScreen;
