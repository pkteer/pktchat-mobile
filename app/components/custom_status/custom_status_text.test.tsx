// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {shallow} from 'enzyme';
import React from 'react';

import CustomStatusText from '@components/custom_status/custom_status_text';
import Preferences from '@mm-redux/constants/preferences';

describe('components/custom_status/custom_status_text', () => {
    const baseProps = {
        text: 'In a meeting',
        theme: Preferences.THEMES.denim,
    };

    it('should match snapshot', () => {
        const wrapper = shallow(
            <CustomStatusText
                {...baseProps}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    it('should match snapshot with empty text', () => {
        const wrapper = shallow(
            <CustomStatusText
                {...baseProps}
                text={''}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
