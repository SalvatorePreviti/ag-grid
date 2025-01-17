import React from 'react';
import { Helmet } from 'react-helmet';
import { StyleGuide } from '../design-system/style-guide/StyleGuide';

const StyleGuidePage = () => {
    const meta = [
        {
            name: 'robots',
            content: 'noindex',
        },
    ];

    return (
        <>
            <Helmet title='AG Style Guide' meta={meta}/>
            <StyleGuide />
        </>
    );
};

export default StyleGuidePage;
