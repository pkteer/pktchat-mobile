// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Preferences
// See https://api.mattermost.com/#tag/preferences
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Save the user's favorite channel preference.
 * @param {string} userId - the user ID
 * @param {string} channelId - the channel id to be favorited
 * @return {string} returns {status} on success or {error, status} on error
 */
export const apiSaveFavoriteChannelPreference = (userId, channelId) => {
    const preference = {
        user_id: userId,
        category: 'favorite_channel',
        name: channelId,
        value: 'true',
    };

    return apiSaveUserPreferences(userId, [preference]);
};

/**
 * Save the user's teammate name display preference.
 * @param {string} userId - the user ID
 * @param {string} nameFormat - one of "username" (default), "nickname_full_name" or "full_name"
 * @returns
 */
export const apiSaveTeammateNameDisplayPreference = (userId, nameFormat = 'username') => {
    const preference = {
        user_id: userId,
        category: 'display_settings',
        name: 'name_format',
        value: nameFormat,
    };

    return apiSaveUserPreferences(userId, [preference]);
};

/**
 * Save the user's teams order preference.
 * @param {string} userId - the user ID
 * @param {Array} orderedTeamIds - ordered array of team IDs
 * @return {string} returns {status} on success or {error, status} on error
 */
export const apiSaveTeamsOrderPreference = (userId, orderedTeamIds = []) => {
    const preference = {
        user_id: userId,
        category: 'teams_order',
        name: '',
        value: orderedTeamIds.toString(),
    };

    return apiSaveUserPreferences(userId, [preference]);
};

/**
 * Save the user's preferences.
 * See https://api.mattermost.com/#operation/UpdatePreferences
 * @param {string} userId - the user ID
 * @param {Array} preferences - a list of user's preferences
 * @return {string} returns {status} on success or {error, status} on error
 */
export const apiSaveUserPreferences = async (userId, preferences = []) => {
    try {
        const response = await client.put(
            `/api/v4/users/${userId}/preferences`,
            preferences,
        );

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const Preference = {
    apiSaveFavoriteChannelPreference,
    apiSaveTeammateNameDisplayPreference,
    apiSaveTeamsOrderPreference,
    apiSaveUserPreferences,
};

export default Preference;
