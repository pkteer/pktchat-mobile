// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {batchActions} from 'redux-batched-actions';

import {updateThreadLastViewedAt} from '@actions/views/threads';
import {handleThreadArrived, handleReadChanged, handleAllMarkedRead, handleFollowChanged, getThread as fetchThread} from '@mm-redux/actions/threads';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getSelectedPost} from '@mm-redux/selectors/entities/posts';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getThread} from '@mm-redux/selectors/entities/threads';
import {ActionResult, DispatchFunc, GenericAction, GetStateFunc} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';

export function handleThreadUpdated(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc): ActionResult => {
        try {
            const threadData = JSON.parse(msg.data.thread);
            dispatch(handleThreadArrived(threadData, msg.broadcast.team_id));
        } catch {
            // does nothing
        }

        return {data: true};
    };
}

export function handleThreadReadChanged(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc, getState: GetStateFunc): ActionResult => {
        if (msg.data.thread_id) {
            const state = getState();
            const thread = getThread(state, msg.data.thread_id);

            // Mark only following threads as read.
            if (thread) {
                const actions: GenericAction[] = [];
                const selectedPost = getSelectedPost(state);
                if (selectedPost?.id !== thread.id) {
                    actions.push(updateThreadLastViewedAt(thread.id, msg.data.timestamp));
                }
                if (thread.is_following) {
                    actions.push(
                        handleReadChanged(
                            msg.data.thread_id,
                            msg.broadcast.team_id,
                            msg.data.channel_id,
                            {
                                lastViewedAt: msg.data.timestamp,
                                prevUnreadMentions: thread.unread_mentions,
                                newUnreadMentions: msg.data.unread_mentions,
                                prevUnreadReplies: thread.unread_replies,
                                newUnreadReplies: msg.data.unread_replies,
                            },
                        ),
                    );
                }
                if (actions.length) {
                    dispatch(batchActions(actions));
                }
            }
        } else {
            dispatch(handleAllMarkedRead(msg.broadcast.team_id));
        }
        return {data: true};
    };
}

export function handleThreadFollowChanged(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const state = getState();
        const thread = getThread(state, msg.data.thread_id);
        if (!thread && msg.data.state) {
            await dispatch(fetchThread(getCurrentUserId(state), getCurrentTeamId(state), msg.data.thread_id, true));
        }
        dispatch(handleFollowChanged(msg.data.thread_id, msg.broadcast.team_id, msg.data.state));
        return {data: true};
    };
}
