import './inlineMessage.scss';
import { FontIcon } from '@fluentui/react/lib/Icon';

export function InlineMessage({ message, type }: { message: string, type: 'error' | 'info' | 'warning' }) {
    return (<div className={'inline-message inline-message-' + type}>
        {type === 'error' || type === 'warning' ? <FontIcon iconName={type === 'warning' ? 'Warning' : 'Error'} className='arrow-icon' /> : null}
        {message ? <div>{message}</div> : null}
    </div>)
}