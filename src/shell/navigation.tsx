import classnames from 'classnames/bind';

import { Paths } from './routes';
import { NavLink } from 'react-router-dom';
import { FontIcon } from '@fluentui/react/lib/Icon';

const cx = classnames.bind(require('./shell.scss'));

export function Navigation() {
    return (
        <>
            <NavItem to={Paths.home} title='Define a new migration' icon='TurnRight' text='New migration' />
            <NavItem to={Paths.status} title='Check the status of your migration' icon='Sync' text='Migration status' />
        </>
    );
}

function NavItem({ to, title, icon, text }: {
    to: string;
    title: string;
    icon: string;
    text: string;
}) {
    return (
        <NavLink to={to} title={title} className={(navData) => cx('global-nav-item', { 'global-nav-item-active': navData.isActive })} >
            <FontIcon iconName={icon} className={cx('global-nav-item-icon')} />
            <span className={cx('inline-text-overflow', 'global-nav-item-text')}>{text}</span>
        </ NavLink >
    );
}