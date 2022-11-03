// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannel, isCurrentChannelReadOnly} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {showManagementOptions} from '@mm-redux/utils/channel_utils';

import EditChannel from './edit_channel';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);
    const currentUserId = getCurrentUserId(state);

    let channelIsReadOnly = false;
    if (currentUserId && currentChannel.id) {
        channelIsReadOnly = isCurrentChannelReadOnly(state) || false;
    }

    const canEdit = !channelIsReadOnly && showManagementOptions(state, currentChannel);

    return {
        canEdit,
    };
}

export default connect(mapStateToProps)(EditChannel);
