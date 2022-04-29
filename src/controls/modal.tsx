import React from 'react';
import classnames from 'classnames/bind';

import { IIconProps } from '@fluentui/react/lib/Icon';
import { IconButton, Modal as FluentModal } from '@fluentui/react';
const cx = classnames.bind(require('./modal.scss'));

export default React.memo(function Modal({ error, closeModal }: {
    error: any;
    closeModal?: () => void;
}): JSX.Element {

    const cancelIcon: IIconProps = { iconName: 'Cancel' };


    return <FluentModal
        titleAriaId={'Error Modal'}
        isOpen={!!error.title}
        onDismiss={closeModal}
        isBlocking={true}
    >
        <div className={cx('modal-content')}>
            <div className={cx('modal-title-container')}>
                <h3 className={cx('modal-title')} id={'Error Modal'}>{error.title}</h3>
                {closeModal && <IconButton
                    iconProps={cancelIcon}
                    ariaLabel="Close popup modal"
                    onClick={closeModal}
                />}
            </div>
            <div className={cx('modal-message')}>
                {error.message}
                <br />
                <span>Check the browser console for more details or refresh the page.</span>
            </div>
        </div>
    </FluentModal>;

});