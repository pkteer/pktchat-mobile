// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as reselect from 'reselect';

import {General, Preferences} from '@mm-redux/constants';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/common';
import {getConfig, getFeatureFlagValue, getLicense} from '@mm-redux/selectors/entities/general';
import {PreferenceType} from '@mm-redux/types/preferences';
import {GlobalState} from '@mm-redux/types/store';
import {Theme} from '@mm-redux/types/theme';
import {createShallowSelector, isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {getPreferenceKey} from '@mm-redux/utils/preference_utils';
import {setThemeDefaults} from '@mm-redux/utils/theme_utils';

export function getMyPreferences(state: GlobalState) {
    return state.entities.preferences.myPreferences;
}

export function get(state: GlobalState, category: string, name: string, defaultValue: any = '') {
    const key = getPreferenceKey(category, name);
    const prefs = getMyPreferences(state);

    if (!(key in prefs)) {
        return defaultValue;
    }

    return prefs[key].value;
}

export function getBool(state: GlobalState, category: string, name: string, defaultValue = false) {
    const value = get(state, category, name, String(defaultValue));
    return value !== 'false';
}

export function getInt(state: GlobalState, category: string, name: string, defaultValue = 0) {
    const value = get(state, category, name, defaultValue);
    return parseInt(value, 10);
}

export function makeGetCategory() {
    return reselect.createSelector(
        getMyPreferences,
        (state: GlobalState, category: string) => category,
        (preferences, category) => {
            const prefix = category + '--';
            const prefsInCategory: PreferenceType[] = [];

            for (const key in preferences) {
                if (key.startsWith(prefix)) {
                    prefsInCategory.push(preferences[key]);
                }
            }

            return prefsInCategory;
        },
    );
}

const getDirectShowCategory = makeGetCategory();

export function getDirectShowPreferences(state: GlobalState) {
    return getDirectShowCategory(state, Preferences.CATEGORY_DIRECT_CHANNEL_SHOW);
}

const getGroupShowCategory = makeGetCategory();

export function getGroupShowPreferences(state: GlobalState) {
    return getGroupShowCategory(state, Preferences.CATEGORY_GROUP_CHANNEL_SHOW);
}

const getFavoritesCategory = makeGetCategory();

export function getFavoritesPreferences(state: GlobalState) {
    const favorites = getFavoritesCategory(state, Preferences.CATEGORY_FAVORITE_CHANNEL);
    return favorites.filter((f) => f.value === 'true').map((f) => f.name);
}

export const getVisibleTeammate = reselect.createSelector(
    getDirectShowPreferences,
    (direct) => {
        return direct.filter((dm) => dm.value === 'true' && dm.name).map((dm) => dm.name);
    },
);

export const getVisibleGroupIds = reselect.createSelector(
    getGroupShowPreferences,
    (groups) => {
        return groups.filter((dm) => dm.value === 'true' && dm.name).map((dm) => dm.name);
    },
);

export const getTeammateNameDisplaySetting = reselect.createSelector(
    getConfig,
    getMyPreferences,
    getLicense,
    (config, preferences, license) => {
        const useAdminTeammateNameDisplaySetting = (license && license.LockTeammateNameDisplay === 'true') && config.LockTeammateNameDisplay === 'true';
        const key = getPreferenceKey(Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT);
        if (preferences[key] && !useAdminTeammateNameDisplaySetting) {
            return preferences[key].value;
        } else if (config.TeammateNameDisplay) {
            return config.TeammateNameDisplay;
        }
        return General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME;
    },
);

const getThemePreference = reselect.createSelector(
    getMyPreferences,
    getCurrentTeamId,
    (myPreferences, currentTeamId) => {
        // Prefer the user's current team-specific theme over the user's current global theme
        let themePreference;

        if (currentTeamId) {
            themePreference = myPreferences[getPreferenceKey(Preferences.CATEGORY_THEME, currentTeamId)];
        }

        if (!themePreference) {
            themePreference = myPreferences[getPreferenceKey(Preferences.CATEGORY_THEME, '')];
        }

        return themePreference;
    },
);

const getDefaultTheme = reselect.createSelector(getConfig, (config) => {
    if (config.DefaultTheme) {
        const theme = Preferences.THEMES[config.DefaultTheme];
        if (theme) {
            return theme;
        }
    }

    // If no config.DefaultTheme or value doesn't refer to a valid theme name...
    return Preferences.THEMES.denim;
});

export const getTheme = createShallowSelector(
    getThemePreference,
    getDefaultTheme,
    (themePreference, defaultTheme) => {
        const themeValue: Theme | string = themePreference?.value ?? defaultTheme;

        // A custom theme will be a JSON-serialized object stored in a preference
        // At this point, the theme should be a plain object
        const theme: Theme = typeof themeValue === 'string' ? JSON.parse(themeValue) : themeValue;

        return setThemeDefaults(theme);
    },
);

export function makeGetStyleFromTheme() {
    return reselect.createSelector(
        getTheme,
        (state: GlobalState, getStyleFromTheme: Function) => getStyleFromTheme,
        (theme, getStyleFromTheme) => {
            return getStyleFromTheme(theme);
        },
    );
}

const defaultSidebarPrefs = {
    grouping: 'by_type',
    unreads_at_top: 'true',
    favorite_at_top: 'true',
    sorting: 'alpha',
};

export const getSidebarPreferences = reselect.createSelector(
    (state: GlobalState) => {
        return getBool(
            state,
            Preferences.CATEGORY_SIDEBAR_SETTINGS,
            'show_unread_section',
        );
    },
    (state) => {
        return get(
            state,
            Preferences.CATEGORY_SIDEBAR_SETTINGS,
            '',
            null,
        );
    },
    (showUnreadSection, sidebarPreference) => {
        let sidebarPrefs = JSON.parse(sidebarPreference);
        if (sidebarPrefs === null) {
            // Support unread settings for old implementation
            sidebarPrefs = {
                ...defaultSidebarPrefs,

                unreads_at_top: showUnreadSection ? 'true' : 'false',
            };
        }

        return sidebarPrefs;
    },
);

export const getNewSidebarPreference = reselect.createSelector(
    (state: GlobalState) => {
        const config = getConfig(state);
        return config.ExperimentalChannelSidebarOrganization;
    },
    (state) => {
        return get(
            state,
            Preferences.CATEGORY_SIDEBAR_SETTINGS,
            Preferences.CHANNEL_SIDEBAR_ORGANIZATION,
            null,
        );
    },
    (globalSetting, userSetting) => {
        switch (globalSetting) {
        case General.DISABLED:
            return false;
        case General.DEFAULT_ON:
            return userSetting ? (userSetting === 'true') : true;
        case General.DEFAULT_OFF:
            return userSetting ? (userSetting === 'true') : false;
        default:
            return false;
        }
    },
);

export function shouldAutocloseDMs(state: GlobalState) {
    const config = getConfig(state);
    const {serverVersion} = state.entities.general;
    if ((!config.CloseUnusedDirectMessages || config.CloseUnusedDirectMessages === 'false') && !isMinimumServerVersion(serverVersion, 6)) {
        return false;
    }

    const preference = get(state, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_AUTOCLOSE_DMS, Preferences.AUTOCLOSE_DMS_ENABLED);
    return preference === Preferences.AUTOCLOSE_DMS_ENABLED;
}

export function getCollapsedThreadsPreference(state: GlobalState): string {
    const configValue = getConfig(state)?.CollapsedThreads;
    let preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_OFF;

    if (configValue === 'default_on') {
        preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_ON;
    }

    return get(
        state,
        Preferences.CATEGORY_DISPLAY_SETTINGS,
        Preferences.COLLAPSED_REPLY_THREADS,
        preferenceDefault ?? Preferences.COLLAPSED_REPLY_THREADS_FALLBACK_DEFAULT,
    );
}

export function isCollapsedThreadsAllowed(state: GlobalState): boolean {
    return (
        getFeatureFlagValue(state, 'CollapsedThreads') === 'true' &&
        getConfig(state).CollapsedThreads !== 'disabled'
    );
}

export function isCollapsedThreadsEnabled(state: GlobalState): boolean {
    const isAllowed = isCollapsedThreadsAllowed(state);
    const userPreference = getCollapsedThreadsPreference(state);
    return isAllowed && (userPreference === Preferences.COLLAPSED_REPLY_THREADS_ON || getConfig(state).CollapsedThreads as string === 'always_on');
}
