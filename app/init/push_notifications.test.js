// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-import-assign */

import {Notifications} from 'react-native-notifications';

import * as Preferences from '@mm-redux/selectors/entities/preferences';
import * as ViewSelectors from '@selectors/views';
import Store from '@store/store';

import PushNotification from './push_notifications';

describe('PushNotification', () => {
    const channel1ID = 'channel-1-id';
    const channel2ID = 'channel-2-id';

    it('should clear channel notifications', async () => {
        const deliveredNotifications = [

            // Three channel1 delivered notifications
            {
                identifier: 'channel1-1',
                channel_id: channel1ID,
            },
            {
                identifier: 'channel1-2',
                channel_id: channel1ID,
            },
            {
                identifier: 'channel1-3',
                channel_id: channel1ID,
            },

            // Two channel2 delivered notifications
            {
                identifier: 'channel2-1',
                channel_id: channel2ID,
            },
            {
                identifier: 'channel2-2',
                channel_id: channel2ID,
            },
        ];
        Notifications.setDeliveredNotifications(deliveredNotifications);

        const notificationCount = deliveredNotifications.length;
        expect(notificationCount).toBe(5);

        // Clear channel1 notifications
        await PushNotification.clearChannelNotifications(channel1ID);

        const deliveredNotifs = await Notifications.ios.getDeliveredNotifications();
        expect(deliveredNotifs.length).toBe(2);
        const channel1DeliveredNotifications = deliveredNotifs.filter((n) => n.channel_id === channel1ID);
        const channel2DeliveredNotifications = deliveredNotifs.filter((n) => n.channel_id === channel2ID);
        expect(channel1DeliveredNotifications.length).toBe(0);
        expect(channel2DeliveredNotifications.length).toBe(2);
    });

    it('should clear root posts only from the channel notifications when CRT is enabled', async () => {
        Store.redux = {
            getState: jest.fn(),
        };

        Preferences.isCollapsedThreadsEnabled = jest.fn().mockImplementation(() => true);
        ViewSelectors.getBadgeCount = jest.fn().mockReturnValue(5);

        const deliveredNotifications = [

            // Three channel1 delivered notifications
            {
                identifier: 'channel1-1',
                channel_id: channel1ID,
                root_id: 'root-id-1',
            },
            {
                identifier: 'channel1-2',
                channel_id: channel1ID,
            },
            {
                identifier: 'channel1-3',
                channel_id: channel1ID,
            },

            // Two channel2 delivered notifications
            {
                identifier: 'channel2-1',
                channel_id: channel2ID,
                root_id: 'root-id-2',
            },
            {
                identifier: 'channel2-2',
                channel_id: channel2ID,
            },
        ];
        Notifications.setDeliveredNotifications(deliveredNotifications);

        const notificationCount = deliveredNotifications.length;
        expect(notificationCount).toBe(5);

        // Clear channel1 notifications
        await PushNotification.clearChannelNotifications(channel1ID);

        const deliveredNotifs = await Notifications.ios.getDeliveredNotifications();
        expect(deliveredNotifs.length).toBe(3);
        const channel1DeliveredNotifications = deliveredNotifs.filter((n) => n.channel_id === channel1ID);
        const channel2DeliveredNotifications = deliveredNotifs.filter((n) => n.channel_id === channel2ID);
        expect(channel1DeliveredNotifications.length).toBe(1);
        expect(channel2DeliveredNotifications.length).toBe(2);
    });

    it('should clear all thread notifications', async () => {
        Store.redux = null;

        ViewSelectors.getBadgeCount = jest.fn().mockReturnValue(5);

        const root1ID = 'root-1-id';
        const root2ID = 'root-2-id';
        const root3ID = 'root-3-id';
        const deliveredNotifications = [

            // Three channel1 delivered notifications
            {
                identifier: 'channel1-1',
                channel_id: channel1ID,
                root_id: root1ID,
            },
            {
                identifier: 'channel1-2',
                channel_id: channel1ID,
                root_id: root1ID,
            },
            {
                identifier: 'channel1-3',
                channel_id: channel1ID,
                root_id: root2ID,
            },

            // Two channel2 delivered notifications
            {
                identifier: 'channel2-2',
                channel_id: channel2ID,
            },
            {
                identifier: 'channel2-2',
                channel_id: channel2ID,
                root_id: root3ID,
            },
        ];
        Notifications.setDeliveredNotifications(deliveredNotifications);

        const notificationCount = deliveredNotifications.length;
        expect(notificationCount).toBe(5);

        // Clear channel1 notifications
        await PushNotification.clearChannelNotifications(channel1ID, root1ID);

        const deliveredNotifs = await Notifications.ios.getDeliveredNotifications();
        expect(deliveredNotifs.length).toBe(3);
        const channel1DeliveredNotifications = deliveredNotifs.filter((n) => n.channel_id === channel1ID);
        const channel2DeliveredNotifications = deliveredNotifs.filter((n) => n.channel_id === channel2ID);
        expect(channel1DeliveredNotifications.length).toBe(1);
        expect(channel2DeliveredNotifications.length).toBe(2);
    });

    it('should clear all notifications', async () => {
        const setApplicationIconBadgeNumber = jest.spyOn(Notifications.ios, 'setBadgeCount');
        const cancelAllLocalNotifications = jest.spyOn(PushNotification, 'cancelAllLocalNotifications');

        PushNotification.clearNotifications();
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(0);
        expect(Notifications.ios.setBadgeCount).toHaveBeenCalledWith(0);
        expect(cancelAllLocalNotifications).toHaveBeenCalled();
        expect(Notifications.cancelAllLocalNotifications).toHaveBeenCalled();
    });

    it('clearChannelNotifications should set app badge number from to delivered notification count when redux store is not set', async () => {
        Store.redux = null;
        const setApplicationIconBadgeNumber = jest.spyOn(Notifications.ios, 'setBadgeCount');
        const deliveredNotifications = [{identifier: 1}, {identifier: 2}];
        Notifications.setDeliveredNotifications(deliveredNotifications);

        await PushNotification.clearChannelNotifications('some other channel');
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(deliveredNotifications.length);

        await PushNotification.clearChannelNotifications();
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(0);
    });

    it('clearChannelNotifications should set app badge number from redux store when set', async () => {
        Store.redux = {
            getState: jest.fn(),
        };
        const setApplicationIconBadgeNumber = jest.spyOn(Notifications.ios, 'setBadgeCount');
        const deliveredNotifications = [{identifier: 1}, {identifier: 2}];
        Notifications.setDeliveredNotifications(deliveredNotifications);

        const stateBadgeCount = 2 * deliveredNotifications.length;
        ViewSelectors.getBadgeCount = jest.fn().mockReturnValue(stateBadgeCount);

        await PushNotification.clearChannelNotifications('some other channel');
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(stateBadgeCount);
    });

    test('setApplicationIconBadgeNumber should only set badge to 0 if there are no delivered notifications', async () => {
        const setBadgeCount = jest.spyOn(Notifications.ios, 'setBadgeCount');

        let deliveredNotifications = [{identifier: 1}];
        Notifications.setDeliveredNotifications(deliveredNotifications);
        await Notifications.ios.setBadgeCount(0);

        deliveredNotifications = [];
        Notifications.setDeliveredNotifications(deliveredNotifications);
        await PushNotification.clearChannelNotifications('some other channel');
        expect(setBadgeCount).toHaveBeenCalledWith(0);
    });
});
