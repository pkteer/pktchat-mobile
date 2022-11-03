// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';

import {doAppSubmit, postEphemeralCallResponseForCommandArgs} from '@actions/apps';
import {AppCommandParser} from '@components/autocomplete/slash_suggestion/app_command_parser/app_command_parser';
import {IntegrationTypes} from '@mm-redux/action_types';
import {executeCommand as executeCommandService} from '@mm-redux/actions/integrations';
import {AppCallResponseTypes} from '@mm-redux/constants/apps';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {DispatchFunc, GetStateFunc, ActionFunc} from '@mm-redux/types/actions';
import {AppCallResponse} from '@mm-redux/types/apps';
import {CommandArgs} from '@mm-redux/types/integrations';
import {appsEnabled} from '@utils/apps';

export function executeCommand(message: string, channelId: string, rootId: string, intl: typeof intlShape): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();

        const teamId = getCurrentTeamId(state);

        const args: CommandArgs = {
            channel_id: channelId,
            team_id: teamId,
            root_id: rootId,
        };

        let msg = message;
        msg = filterEmDashForCommand(msg);

        let cmdLength = msg.indexOf(' ');
        if (cmdLength < 0) {
            cmdLength = msg.length;
        }

        const cmd = msg.substring(0, cmdLength).toLowerCase();
        msg = cmd + msg.substring(cmdLength, msg.length);

        const appsAreEnabled = appsEnabled(state);
        if (appsAreEnabled) {
            const parser = new AppCommandParser({dispatch, getState}, intl, args.channel_id, args.team_id, args.root_id);
            if (parser.isAppCommand(msg)) {
                const {creq, errorMessage} = await parser.composeCommandSubmitCall(msg);
                const createErrorMessage = (errMessage: string) => {
                    return {error: {message: errMessage}};
                };

                if (!creq) {
                    return createErrorMessage(errorMessage!);
                }

                const res = await dispatch(doAppSubmit(creq, intl));
                if (res.error) {
                    const errorResponse = res.error as AppCallResponse;
                    return createErrorMessage(errorResponse.text || intl.formatMessage({
                        id: 'apps.error.unknown',
                        defaultMessage: 'Unknown error.',
                    }));
                }
                const callResp = res.data as AppCallResponse;
                switch (callResp.type) {
                case AppCallResponseTypes.OK:
                    if (callResp.text) {
                        dispatch(postEphemeralCallResponseForCommandArgs(callResp, callResp.text, args));
                    }
                    return {data: {}};
                case AppCallResponseTypes.FORM:
                    return {data: {
                        form: callResp.form,
                        call: creq,
                    }};
                case AppCallResponseTypes.NAVIGATE:
                    return {data: {
                        goto_location: callResp.navigate_to_url,
                    }};
                default:
                    return createErrorMessage(intl.formatMessage({
                        id: 'apps.error.responses.unknown_type',
                        defaultMessage: 'App response type not supported. Response type: {type}.',
                    }, {
                        type: callResp.type,
                    }));
                }
            }
        }

        const {data, error} = await dispatch(executeCommandService(msg, args));

        if (data?.trigger_id) { //eslint-disable-line camelcase
            dispatch({type: IntegrationTypes.RECEIVED_DIALOG_TRIGGER_ID, data: data.trigger_id});
        }

        return {data, error};
    };
}

const filterEmDashForCommand = (command: string): string => {
    return command.replace(/\u2014/g, '--');
};
