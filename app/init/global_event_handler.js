// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager from '@react-native-cookies/cookies';

import {AppState, Dimensions, Keyboard, Linking, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {getLocales} from 'react-native-localize';
import {valid as validVersion} from 'semver';

import {setDeviceDimensions, setDeviceOrientation, setDeviceAsTablet} from '@actions/device';
import {dismissAllModals, popToRoot, showOverlay} from '@actions/navigation';
import {selectDefaultChannel} from '@actions/views/channel';
import {loadConfigAndLicense, purgeOfflineStore, setDeepLinkURL, startDataCleanup} from '@actions/views/root';
import {loadMe, logout} from '@actions/views/user';
import {close as closeWebSocket} from '@actions/websocket';
import LocalConfig from '@assets/config';
import {Client4} from '@client/rest';
import {NavigationTypes, ViewTypes} from '@constants';
import {resetMomentLocale} from '@i18n';
import {analytics} from '@init/analytics.ts';
import {setupPermanentSidebar} from '@init/device';
import PushNotifications from '@init/push_notifications';
import mattermostManaged from '@mattermost-managed';
import {setAppState, setServerVersion} from '@mm-redux/actions/general';
import {getTeams} from '@mm-redux/actions/teams';
import {autoUpdateTimezone} from '@mm-redux/actions/timezone';
import {General} from '@mm-redux/constants';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {isPostSelected} from '@mm-redux/selectors/entities/posts';
import {isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import {getCurrentUser, getUser} from '@mm-redux/selectors/entities/users';
import EventEmitter from '@mm-redux/utils/event_emitter';
import EphemeralStore from '@store/ephemeral_store';
import initialState from '@store/initial_state';
import Store from '@store/store';
import {deleteFileCache} from '@utils/file';
import {getDeviceTimezone} from '@utils/timezone';

import mattermostBucket from 'app/mattermost_bucket';

import {getAppCredentials, removeAppCredentials} from './credentials';
import emmProvider from './emm_provider';

const PROMPT_IN_APP_PIN_CODE_AFTER = 5 * 1000;

class GlobalEventHandler {
    constructor() {
        this.pushNotificationListener = false;

        EventEmitter.on(NavigationTypes.NAVIGATION_RESET, this.onLogout);
        EventEmitter.on(NavigationTypes.RESTART_APP, this.onRestartApp);
        EventEmitter.on(General.SERVER_VERSION_CHANGED, this.onServerVersionChanged);
        EventEmitter.on(General.CONFIG_CHANGED, this.onServerConfigChanged);
        EventEmitter.on(General.CRT_PREFERENCE_CHANGED, this.onCRTPreferenceChanged);
        EventEmitter.on(General.SWITCH_TO_DEFAULT_CHANNEL, this.onSwitchToDefaultChannel);
        Dimensions.addEventListener('change', this.onOrientationChange);
        AppState.addEventListener('change', this.onAppStateChange);
        Linking.addEventListener('url', this.onDeepLink);
    }

    appActive = async () => {
        this.turnOnInAppNotificationHandling();
        this.setUserTimezone();

        // if the app is being controlled by an EMM provider
        if (emmProvider.enabled && emmProvider.inAppPinCode) {
            const authExpired = (Date.now() - emmProvider.inBackgroundSince) >= PROMPT_IN_APP_PIN_CODE_AFTER;

            // Once the app becomes active we check if the device needs to have a passcode set
            const prompt = emmProvider.inBackgroundSince && authExpired; // if more than 5 minutes have passed prompt for passcode
            await emmProvider.handleAuthentication(prompt);
        }

        emmProvider.inBackgroundSince = null; /* eslint-disable-line require-atomic-updates */
    };

    appInactive = () => {
        this.turnOffInAppNotificationHandling();

        const {dispatch} = Store.redux;

        // When the app is sent to the background we set the time when that happens
        // and perform a data clean up to improve on performance
        emmProvider.inBackgroundSince = Date.now();

        dispatch(startDataCleanup());
    };

    configure = (opts) => {
        this.launchApp = opts.launchApp;

        // onAppStateChange may be called by the AppState listener before we
        // configure the global event handler so we manually call it here
        this.onAppStateChange('active');

        const window = Dimensions.get('window');
        this.onOrientationChange({window});

        this.JavascriptAndNativeErrorHandler = require('app/utils/error_handling').default;
        this.JavascriptAndNativeErrorHandler.initializeErrorHandling(Store.redux);

        mattermostManaged.addEventListener('managedConfigDidChange', this.onManagedConfigurationChange);
    };

    configureAnalytics = async () => {
        const state = Store.redux.getState();
        const config = getConfig(state);

        if (config && config.DiagnosticsEnabled === 'true' && config.DiagnosticId && LocalConfig.RudderApiKey) {
            await analytics.init(config);
        }
    };

    onAppStateChange = (appState) => {
        const isActive = appState === 'active';
        const isBackground = appState === 'background';

        if (Store.redux) {
            Store.redux.dispatch(setAppState(isActive));

            if (isActive && (!emmProvider.enabled || emmProvider.previousAppState === 'background')) {
                this.appActive();
            } else if (isBackground) {
                this.appInactive();
            }
        }

        emmProvider.previousAppState = appState;
    };

    onCRTPreferenceChanged = () => {
        Keyboard.dismiss();
        requestAnimationFrame(async () => {
            const componentId = EphemeralStore.getNavigationTopComponentId();
            if (componentId) {
                EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
                EventEmitter.emit(NavigationTypes.CLOSE_SETTINGS_SIDEBAR);
                await dismissAllModals();
                await popToRoot();
            }
            Store.redux.dispatch(purgeOfflineStore());
        });
    };

    onDeepLink = (event) => {
        const {url} = event;
        if (url) {
            Store.redux.dispatch(setDeepLinkURL(url));
        }
    };

    onManagedConfigurationChange = () => {
        emmProvider.handleManagedConfig(true);
    };

    clearCookiesAndWebData = async () => {
        try {
            await CookieManager.clearAll(true);

            if (Platform.OS === 'ios') {
                // on iOS we will also detele the Cookies stored by NSCookieStore
                await CookieManager.clearAll(false);
            }
        } catch (error) {
            // Nothing to do
        }
    };

    onLogout = async () => {
        Store.redux.dispatch(closeWebSocket(false));
        Store.redux.dispatch(setServerVersion(''));

        await analytics.reset();

        mattermostBucket.removePreference('cert');
        mattermostBucket.removePreference('emm');
        if (Platform.OS === 'ios') {
            mattermostBucket.removeFile('entities');
        }

        removeAppCredentials();
        deleteFileCache();
        resetMomentLocale();

        await this.clearCookiesAndWebData();
        PushNotifications.clearNotifications();

        if (this.launchApp) {
            this.launchApp();
        }

        // Reset the state after sending
        // the user to the Select server URL screen
        // To avoid unavailable data crashes while components are
        // still mounted.
        this.resetState();
    };

    onOrientationChange = (dimensions) => {
        if (Store.redux) {
            const {dispatch, getState} = Store.redux;
            const deviceState = getState().device;

            if (DeviceInfo.isTablet()) {
                dispatch(setDeviceAsTablet());
            }

            const {height, width} = dimensions.window;
            const orientation = height > width ? 'PORTRAIT' : 'LANDSCAPE';
            const savedOrientation = deviceState?.orientation;
            const savedDimension = deviceState?.dimension;

            if (orientation !== savedOrientation) {
                dispatch(setDeviceOrientation(orientation));
            }

            if (height !== savedDimension?.deviceHeight ||
                width !== savedDimension?.deviceWidth) {
                dispatch(setDeviceDimensions(height, width));
            }
        }
    };

    onRestartApp = async () => {
        const {dispatch, getState} = Store.redux;
        const state = getState();
        const {currentUserId} = state.entities.users;
        const user = getUser(state, currentUserId);

        await dispatch(loadConfigAndLicense());
        await dispatch(loadMe(user));
        dispatch(getTeams());

        const window = Dimensions.get('window');
        this.onOrientationChange({window});
    };

    onServerConfigChanged = (config) => {
        this.configureAnalytics(config);

        if (config.ExtendSessionLengthWithActivity === 'true') {
            PushNotifications.cancelAllLocalNotifications();
        }
    };

    onServerVersionChanged = async (serverVersion) => {
        const {dispatch, getState} = Store.redux;
        const state = getState();
        const {general, users} = state.entities;
        const isValid = validVersion(serverVersion);
        const versionDidChange = general?.serverVersion !== serverVersion;
        if (isValid && serverVersion && versionDidChange && users?.currentUserId) {
            dispatch(setServerVersion(serverVersion));
        }
    };

    onSwitchToDefaultChannel = (teamId) => {
        Store.redux.dispatch(selectDefaultChannel(teamId));
    };

    resetState = async () => {
        try {
            await AsyncStorage.clear();
            await setupPermanentSidebar();
            const state = Store.redux.getState();
            const newState = {
                ...initialState,
                app: {
                    build: DeviceInfo.getBuildNumber(),
                    version: DeviceInfo.getVersion(),
                    previousVersion: DeviceInfo.getVersion(),
                },
                entities: {
                    ...initialState.entities,
                    general: {
                        ...initialState.entities.general,
                        deviceToken: state.entities.general.deviceToken,
                    },
                },
                views: {
                    i18n: {
                        locale: getLocales()[0].languageTag,
                    },
                    root: {
                        hydrationComplete: true,
                    },
                    selectServer: {
                        serverUrl: state.views.selectServer.serverUrl,
                    },
                },
                _persist: {
                    rehydrated: true,
                },
            };

            return Store.redux.dispatch({
                type: General.OFFLINE_STORE_PURGE,
                data: newState,
            });
        } catch (e) {
            // clear error
            return e;
        }
    };

    serverUpgradeNeeded = async () => {
        const {dispatch} = Store.redux;

        dispatch(setServerVersion(''));
        Client4.serverVersion = '';

        const credentials = await getAppCredentials();

        if (credentials) {
            dispatch(logout());
        }
    };

    turnOnInAppNotificationHandling = () => {
        if (!this.pushNotificationListener) {
            this.pushNotificationListener = true;
            EventEmitter.on(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
        }
    };

    turnOffInAppNotificationHandling = () => {
        this.pushNotificationListener = false;
        EventEmitter.off(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
    };

    handleInAppNotification = (notification) => {
        const {payload} = notification;
        const {getState} = Store.redux;
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);

        if (
            payload?.channel_id !== currentChannelId ||
            (payload?.root_id && isCollapsedThreadsEnabled(state) && !isPostSelected(state, payload?.root_id))
        ) {
            const screen = 'Notification';
            const passProps = {
                notification,
            };

            EventEmitter.emit(NavigationTypes.NAVIGATION_SHOW_OVERLAY);
            showOverlay(screen, passProps);
        }
    };

    setUserTimezone = async () => {
        const {dispatch, getState} = Store.redux;
        const state = getState();
        const currentUser = getCurrentUser(state);

        const enableTimezone = isTimezoneEnabled(state);
        if (enableTimezone && currentUser.id) {
            const timezone = getDeviceTimezone();
            const {
                automaticTimezone,
                manualTimezone,
                useAutomaticTimezone,
            } = currentUser.timezone;
            let updateTimeZone = false;

            if (useAutomaticTimezone) {
                updateTimeZone = timezone !== automaticTimezone;
            } else {
                updateTimeZone = timezone !== manualTimezone;
            }

            if (updateTimeZone) {
                dispatch(autoUpdateTimezone(timezone));
            }
        }
    };
}

export default new GlobalEventHandler();
