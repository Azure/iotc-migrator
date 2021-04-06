import { Config } from '../config'
import * as msal from '@azure/msal-browser';
import * as React from 'react';

export interface AppConfig {
    applicationId: string;
    directoryId: string;
    applicationHost: string;
}

const KEY = 'MigratorApp'

function getAccessTokenForScope(silentFail: boolean, msalInstance: any, scope: string, options: any) {
    const tokenRequest: any = Object.assign({}, options, {
        scopes: Array.isArray(scope) ? scope : [scope],
        forceRefresh: false,
        redirectUri: msalConfig.auth.redirectUri
    });

    return new Promise((resolve, reject) => {
        msalInstance.acquireTokenSilent(tokenRequest)
            .then((res: any) => {
                resolve(res)
            })
            .catch((err: any) => {
                if (silentFail) {
                    reject(err);
                    return;
                }
                msalInstance.acquireTokenPopup(tokenRequest)
                    .then((res: any) => {
                        resolve(res)
                    })
                    .catch((err: any) => {
                        if (err.name === 'BrowserAuthError') {
                            msalInstance.acquireTokenPopup(tokenRequest)
                                .then((res: any) => {
                                    resolve(res)
                                })
                                .catch((err: any) => {
                                    reject(err);
                                })

                        } else {
                            reject(err);
                        }
                    });
            });
    });
}

export const msalConfig = {
    auth: {
        clientId: Config.AADClientID,
        authority: Config.AADLoginServer + '/' + Config.AADDirectoryID,
        redirectUri: Config.AADRedirectURI
    },
    cache: {
        cacheLocation: 'localStorage'
    }
}

export const Scopes = {
    Graph: 'User.Read',
    Central: 'https://apps.azureiotcentral.com/user_impersonation',
    ARM: 'https://management.azure.com/user_impersonation'
}

export const AuthContext = React.createContext({});

export class AuthProvider extends React.Component {

    private msalInstance: any = null;

    constructor(props: any) {
        super(props);
        const cache: any = localStorage.getItem(KEY);
        if (cache !== null && cache !== '') {
            const c: AppConfig = JSON.parse(cache);
            this.state.applicationId = c.applicationId;
            this.state.directoryId = c.directoryId;
            this.state.applicationHost = c.applicationHost;
        } else {
            this.state.applicationId = Config.AADClientID;
            this.state.directoryId = Config.AADDirectoryID;
            this.state.applicationHost = Config.applicationHost;
        }
        msalConfig.auth.clientId = this.state.applicationId;
        msalConfig.auth.authority = Config.AADLoginServer + '/' + this.state.directoryId;
        this.msalInstance = new msal.PublicClientApplication(msalConfig);
    }

    signIn = (silent: boolean) => {
        if (this.state.authenticated) { return; }

        let loginAccount: any = {};

        this.msalInstance.handleRedirectPromise()
            .then((res: any) => {
                loginAccount = res ? res.data.value[0] : this.msalInstance.getAllAccounts()[0];
                return getAccessTokenForScope(silent, this.msalInstance, Scopes.Graph, loginAccount ? { account: loginAccount } : null);
            })
            .then((res: any) => {
                loginAccount = res.account;
                return getAccessTokenForScope(silent, this.msalInstance, Scopes.Central, loginAccount ? { account: loginAccount } : null);
            })
            .then((res: any) => {
                loginAccount = res.account;
                return getAccessTokenForScope(silent, this.msalInstance, Scopes.ARM, loginAccount ? { account: loginAccount } : null);
            })
            .then(() => {
                this.setState({
                    loginAccount,
                    authenticated: true,
                    initialized: false
                })
            })
            .catch((err: any) => {
                console.log(err);
                console.log('Silent auth failed. User must sign in');
            });
    }

    getAccessToken = async () => {
        const res: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.Central, { account: this.state.loginAccount });
        return res.accessToken;
    }

    getArmAccessToken = async () => {
        const res: any = await getAccessTokenForScope(true, this.msalInstance, Scopes.ARM, { account: this.state.loginAccount });
        return res.accessToken;
    }

    signOut = () => {
        this.msalInstance.logout();
    }

    resetApplication = (payload: any) => {
        localStorage.setItem(KEY, JSON.stringify(payload));
        window.location.href = '/';
    }

    clearApplication = () => {
        localStorage.removeItem(KEY);
        window.location.href = '/';
    }

    state: any = {
        authenticated: false,
        applicationId: '',
        directoryId: '',
        applicationHost: '',
        loginAccount: {},
        signIn: this.signIn,
        signOut: this.signOut,
        getAccessToken: this.getAccessToken,
        getArmAccessToken: this.getArmAccessToken,
        resetApplication: this.resetApplication,
        clearApplication: this.clearApplication
    }

    render() {
        return (
            <AuthContext.Provider value={this.state}>
                {this.props.children}
            </AuthContext.Provider>
        )
    }
}