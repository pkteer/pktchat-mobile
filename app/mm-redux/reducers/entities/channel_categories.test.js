// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TeamTypes} from '@mm-redux/action_types';

import {CategoryTypes} from '../../constants/channel_categories';

import * as Reducers from './channel_categories';

describe('byId', () => {
    test('should remove corresponding categories when leaving a team', () => {
        const initialState = {
            category1: {id: 'category1', team_id: 'team1', type: CategoryTypes.CUSTOM},
            category2: {id: 'category2', team_id: 'team1', type: CategoryTypes.CUSTOM},
            dmCategory1: {id: 'dmCategory1', team_id: 'team1', type: CategoryTypes.DIRECT_MESSAGES},
            category3: {id: 'category3', team_id: 'team2', type: CategoryTypes.CUSTOM},
            category4: {id: 'category4', team_id: 'team2', type: CategoryTypes.CUSTOM},
            dmCategory2: {id: 'dmCategory1', team_id: 'team2', type: CategoryTypes.DIRECT_MESSAGES},
        };

        const state = Reducers.byId(
            initialState,
            {
                type: TeamTypes.LEAVE_TEAM,
                data: {
                    id: 'team1',
                },
            },
        );

        expect(state).toEqual({
            category3: state.category3,
            category4: state.category4,
            dmCategory2: state.dmCategory2,
        });
    });
});

describe('orderByTeam', () => {
    test('should remove correspoding order when leaving a team', () => {
        const initialState = {
            team1: ['category1', 'category2', 'dmCategory1'],
            team2: ['category3', 'category4', 'dmCategory2'],
        };

        const state = Reducers.orderByTeam(
            initialState,
            {
                type: TeamTypes.LEAVE_TEAM,
                data: {
                    id: 'team1',
                },
            },
        );

        expect(state).toEqual({
            team2: initialState.team2,
        });
    });
});
