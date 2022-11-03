// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ViewTypes} from '@constants';

export default function search(state = '', action) {
    switch (action.type) {
    case ViewTypes.SEARCH_DRAFT_CHANGED: {
        return action.text;
    }

    default:
        return state;
    }
}
