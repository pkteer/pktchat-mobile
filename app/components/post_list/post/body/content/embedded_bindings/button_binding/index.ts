// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {handleBindingClick, postEphemeralCallResponseForPost} from '@actions/apps';
import {handleGotoLocation} from '@mm-redux/actions/integrations';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getPost} from '@mm-redux/selectors/entities/posts';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';

import ButtonBinding from './button_binding';

import type {AppBinding} from '@mm-redux/types/apps';
import type {GlobalState} from '@mm-redux/types/store';
import type {Theme} from '@mm-redux/types/theme';

type OwnProps = {
    binding: AppBinding;
    postId: string;
    theme: Theme;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const post = getPost(state, ownProps.postId);
    const channel = getChannel(state, post.channel_id);

    return {
        post,
        teamID: channel?.team_id || getCurrentTeamId(state),
    };
}

const mapDispatchToProps = {
    handleBindingClick,
    postEphemeralCallResponseForPost,
    handleGotoLocation,
};

export default connect(mapStateToProps, mapDispatchToProps)(ButtonBinding);
