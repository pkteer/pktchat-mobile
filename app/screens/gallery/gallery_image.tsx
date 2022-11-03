// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import FastImage from 'react-native-fast-image';
import Animated from 'react-native-reanimated';

import {DeviceTypes} from '@constants';
import {GalleryItemProps} from '@mm-types/screens/gallery';
import {calculateDimensions} from '@utils/images';

// @ts-expect-error: Ignore the typescript error for createAnimatedComponent
const AnimatedImage = Animated.createAnimatedComponent(FastImage);

const GalleryImage = ({file, deviceHeight, deviceWidth, style}: GalleryItemProps) => {
    const {height, width, uri: imageUri, localPath} = file;
    const statusBar = DeviceTypes.IS_IPHONE_WITH_INSETS ? 60 : 20;
    const calculatedDimensions = calculateDimensions(height, width, deviceWidth, deviceHeight - statusBar);
    const uri = localPath || imageUri;

    return (
        <AnimatedImage
            source={{uri}}
            style={[{...calculatedDimensions}, style]}
            nativeID={`gallery-${file.id}`}
        />
    );
};

export default GalleryImage;
