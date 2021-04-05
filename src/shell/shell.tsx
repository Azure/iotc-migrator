import './shell.scss';

import React from 'react';

import { AuthContext } from '../context/authContext';
import { Shell as FluentShell, NavigationProperties } from '@microsoft/azure-iot-ux-fluent-controls/lib/components/Shell';
import { Navigation } from './navigation';
import { Routes } from './routes';
import { Panel, PanelType, IPanelProps } from '@fluentui/react/lib/Panel';
import { IRenderFunction } from '@fluentui/react/lib/Utilities';
import { FontIcon } from '@fluentui/react/lib/Icon';

function signOut(signOutHandler: any) {
  return <div className='sign-out'>
    <button title='Sign Out' onClick={signOutHandler}><FontIcon iconName='SignOut' className='global-nav-item-icon' /></button>
  </div>
}

function waffleDOM(showWaffle: any, value: boolean) {
  return <div className='waffle-button'>
    <button title='Additional tools' onClick={() => showWaffle(value)}><FontIcon iconName='WaffleOffice365' className='global-nav-item-icon' /></button>
  </div>
}

function Shell() {
  const authContext: any = React.useContext(AuthContext);
  const [expanded, setExpanded] = React.useState(true);
  const [waffle, showWaffle] = React.useState<boolean>(false);

  const nav: NavigationProperties = {
    isExpanded: expanded,
    onClick: (() => setExpanded(!expanded)),
    children: <Navigation />
  }

  React.useEffect(() => {
    if (!authContext.authenticated && authContext.directoryId !== '') {
      authContext.signIn();
    }
  }, [authContext, authContext.authenticated]);

  const onRenderNavigationContent: IRenderFunction<IPanelProps> = React.useCallback(
    (props, defaultRender) => (
      <div className="waffle-panel-nav">
        {waffleDOM(showWaffle, false)}
        {defaultRender!(props)}
      </div>
    ),
    [],
  );

  return <div className="shell">
    <Panel
      headerText=""
      hasCloseButton={false}
      isLightDismiss={true}
      type={PanelType.customNear}
      isOpen={waffle}
      customWidth={'320px'}
      onDismiss={() => { showWaffle(false) }}
      onRenderNavigationContent={onRenderNavigationContent}
    >
      <h2>Waffle</h2>
    </Panel>
    <FluentShell
      masthead={{
        branding: "Migrator" + (authContext.applicationHost !== '' ? 'for application - ' + authContext.applicationHost : ''),
        user: signOut(authContext.signOut),
        waffle: waffleDOM(showWaffle, true)
      }}
      navigation={nav}>
      <Routes application={`http://${authContext.applicationHost}`} />
      {authContext.authenticated ? null : <div className='no-auth'>Not authenticated</div>}
    </FluentShell>
  </div >
}

export default Shell;
