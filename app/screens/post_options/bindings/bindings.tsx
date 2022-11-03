// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {intlShape, injectIntl} from 'react-intl';
import {Alert} from 'react-native';
import {HandleBindingClick, PostEphemeralCallResponseForPost} from 'types/actions/apps';

import {showAppForm} from '@actions/navigation';
import {Client4} from '@client/rest';
import {AppBindingLocations, AppCallResponseTypes} from '@mm-redux/constants/apps';
import {ActionResult} from '@mm-redux/types/actions';
import {AppBinding, AppCallResponse} from '@mm-redux/types/apps';
import {Post} from '@mm-redux/types/posts';
import {Theme} from '@mm-redux/types/theme';
import {UserProfile} from '@mm-redux/types/users';
import {isSystemMessage} from '@mm-redux/utils/post_utils';
import {createCallContext} from '@utils/apps';

import PostOption from '../post_option';

type Props = {
    bindings: AppBinding[] | null;
    theme: Theme;
    post: Post;
    currentUser: UserProfile;
    teamID: string;
    closeWithAnimation: (cb?: () => void) => void;
    appsEnabled: boolean;
    intl: typeof intlShape;
    actions: {
        handleBindingClick: HandleBindingClick;
        postEphemeralCallResponseForPost: PostEphemeralCallResponseForPost;
        handleGotoLocation: (href: string, intl: any) => Promise<ActionResult>;
    };
}

const fetchBindings = (userId: string, channelId: string, teamId: string, setState: React.Dispatch<React.SetStateAction<AppBinding[] | null>>) => {
    Client4.getAppsBindings(userId, channelId, teamId).then(
        (allBindings) => {
            const headerBindings = allBindings.filter((b) => b.location === AppBindingLocations.POST_MENU_ITEM);
            const postMenuBindings = headerBindings.reduce((accum: AppBinding[], current: AppBinding) => accum.concat(current.bindings || []), []);
            setState(postMenuBindings);
        },
        () => {/* Do nothing */},
    ).catch(() => {/* Do nothing */});
};

const Bindings = injectIntl((props: Props) => {
    const [bindings, setBindings] = useState(props.bindings);
    useEffect(() => {
        if (bindings) {
            return;
        }

        setBindings([]);
        if (!props.appsEnabled) {
            return;
        }

        fetchBindings(props.currentUser.id, props.post.channel_id, props.teamID, setBindings);
    }, []);

    if (!props.appsEnabled) {
        return null;
    }

    const {post, ...optionProps} = props;
    if (!bindings || bindings.length === 0) {
        return null;
    }

    if (isSystemMessage(post)) {
        return null;
    }

    const options = bindings.map((b) => (
        <Option
            key={b.app_id + b.location}
            binding={b}
            post={post}
            {...optionProps}
        />
    ));

    return (
        <>
            {options}
        </>
    );
});

export default Bindings;

type OptionProps = {
    binding: AppBinding;
    theme: Theme;
    post: Post;
    currentUser: UserProfile;
    teamID: string;
    closeWithAnimation: (cb?: () => void) => void;
    intl: typeof intlShape;
    actions: {
        handleBindingClick: HandleBindingClick;
        postEphemeralCallResponseForPost: PostEphemeralCallResponseForPost;
        handleGotoLocation: (href: string, intl: any) => Promise<ActionResult>;
    };
}

class Option extends React.PureComponent<OptionProps> {
    onPress = async () => {
        const {post, teamID, binding, intl, theme} = this.props;
        const {handleBindingClick, postEphemeralCallResponseForPost} = this.props.actions;

        const context = createCallContext(
            binding.app_id,
            binding.location,
            post.channel_id,
            teamID,
            post.id,
            post.root_id,
        );

        const callPromise = handleBindingClick(binding, context, intl);
        await this.close();

        const res = await callPromise;
        if (res.error) {
            const errorResponse = res.error;
            const title = intl.formatMessage({
                id: 'mobile.general.error.title',
                defaultMessage: 'Error',
            });
            const errorMessage = errorResponse.text || intl.formatMessage({
                id: 'apps.error.unknown',
                defaultMessage: 'Unknown error occurred.',
            });
            Alert.alert(title, errorMessage);
            return;
        }

        const callResp = (res as {data: AppCallResponse}).data;
        switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.text) {
                postEphemeralCallResponseForPost(callResp, callResp.text, post);
            }
            break;
        case AppCallResponseTypes.NAVIGATE:
            this.props.actions.handleGotoLocation(callResp.navigate_to_url!, intl);
            break;
        case AppCallResponseTypes.FORM:
            showAppForm(callResp.form, context, theme);
            break;
        default: {
            const title = intl.formatMessage({
                id: 'mobile.general.error.title',
                defaultMessage: 'Error',
            });
            const errMessage = intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            });
            Alert.alert(title, errMessage);
        }
        }
    };

    close = (): Promise<void> => {
        return new Promise((resolve) => {
            this.props.closeWithAnimation(resolve);
        });
    };

    render() {
        const {binding, theme} = this.props;
        if (!binding.label) {
            return null;
        }

        return (
            <PostOption
                icon={{uri: binding.icon!}}
                text={binding.label}
                onPress={this.onPress}
                theme={theme}
            />
        );
    }
}
