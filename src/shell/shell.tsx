
import React from 'react';

import { AuthContext } from '../context/authContext';
import { AppDataContext } from '../context/appDataContext';
import { Shell as FluentShell, NavigationProperties } from '@microsoft/azure-iot-ux-fluent-controls';
import { Navigation } from './navigation';
import { Routes } from './routes';
import { FontIcon } from '@fluentui/react/lib/Icon';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import classnames from 'classnames/bind';
import { Config } from '../config';
import Modal from '../controls/modal';
const cx = classnames.bind(require('./shell.scss'));

function signOut(signOutHandler) {
  return <div className='sign-out'>
    <button title='Sign Out' onClick={signOutHandler}><FontIcon iconName='SignOut' className='global-nav-item-icon' /></button>
  </div>
}



export default React.memo(function Shell() {
  const authContext = React.useContext(AuthContext);
  const appDataContext = React.useContext(AppDataContext);

  const [expanded, setExpanded] = React.useState(true);
  const [error, setError] = React.useState<{ title: string | undefined, message: string | undefined; }>({
    title: undefined,
    message: undefined
  });
  const nav: NavigationProperties = {
    isExpanded: expanded,
    onClick: (() => setExpanded(!expanded)),
    children: <Navigation />
  }

  React.useEffect(() => {
    if (!authContext.authenticated && authContext?.error?.name !== 'BrowserAuthError') {
      authContext.signIn(false);
    } else if (!appDataContext.appDataReady && !appDataContext.error) {
      appDataContext.fetchAppData(authContext);
    }
  }, [authContext, appDataContext.fetchAppData, authContext.authenticated, appDataContext]);

  React.useEffect(() => {
    if (!!authContext.error) {
      setError({
        title: 'Error during the authentication',
        message: authContext.error.message
      });
    } else if (!!appDataContext.error) {
      setError({
        title: 'Error fetching data from IoT Central',
        message: appDataContext.error.message
      });
    }
  }, [authContext.error, appDataContext.error]);

  const closeErrorModal = React.useCallback(() => setError({ title: undefined, message: undefined }), []);

  const loadingText = React.useMemo(() => {
    if (!authContext.authenticated) {
      return 'Waiting for authentication...';
    }
    return `Loading application data from ${Config.applicationHost}...`;

  }, [authContext]);


  let content: JSX.Element =
    <div className={cx("shell-initial")}>
      <h2>Please wait</h2>
      <ProgressIndicator label={loadingText} />
    </div>;

  if (!!error.title) {
    content = <Modal closeModal={closeErrorModal} error={error} />;
  }

  if (authContext.authenticated && appDataContext.appDataReady) {
    content = <Routes appReady={true} />;
  }


  return <div className={cx("shell")}>
    <FluentShell
      masthead={{
        branding: `IoTC Migrator ${!!authContext.applicationHost && `- ${authContext.applicationHost}`}`,
        user: signOut(authContext.signOut),
      }}
      navigation={nav}>
      {content}
    </FluentShell>
  </div >
});

