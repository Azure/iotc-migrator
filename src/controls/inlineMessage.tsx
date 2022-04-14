import classnames from 'classnames/bind';

import { FontIcon } from '@fluentui/react/lib/Icon';
const cx = classnames.bind(require('./inlineMessage.scss'));

export function InlineMessage({ message, type }: { message: string, type: 'error' | 'info' | 'warning' }) {
    return (<div className={cx('inline-message inline-message-' + type)}>
        {!!(type === 'error' || type === 'warning')
            && <FontIcon iconName={type === 'warning' ? 'Warning' : 'Error'} className={cx('arrow-icon')} />
        }
        {!!message && <div>{message}</div>}
    </div>)
}