import './waffle.scss';
import React from 'react';
import { FontIcon } from '@fluentui/react/lib/Icon';

function Waffle() {

    const [apps, setApps] = React.useState([
        {
            icon: 'TurnRight',
            name: 'Migrator',
            url: 'http://localhost:4006'
        },
        {
            icon: 'AnalyticsQuery',
            name: 'Query',
            url: 'http://localhost:4005'
        },
        {
            icon: 'DoubleColumn',
            name: 'Twin Viewer',
            url: 'http://localhost:4002'
        },
        {
            icon: 'AuthenticatorApp',
            name: 'AAD Test',
            url: 'http://localhost:4001'
        }
    ])

    return <div className='waffle'>
        <div className='waffle-apps'>
            <h1>Tools</h1>
            <div className='waffle-apps-tiles'>
                {apps && apps.map((element: any) => {
                    return <button className='waffle-apps-tile'>
                        <div><FontIcon iconName={element.icon} className='arrow-icon' /></div>
                        <div>{element.name}</div>
                    </button>
                })}
            </div>
            <a href="https://apps.azureiotcentral.com/">All tools <FontIcon iconName='Forward' className='arrow-icon' /></a>
        </div>
    </div>
}

export default Waffle;
