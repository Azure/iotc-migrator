import * as msal from '@azure/msal-browser';
import * as React from 'react';
import { Config } from '../config';

export interface AppConfig {
    applicationId: string;
    directoryId: string;
    applicationHost: string;
}

export const Scopes = {
    Graph: 'User.Read',
    Central: 'https://apps.azureiotcentral.com/user_impersonation',
    ARM: 'https://management.azure.com/user_impersonation'
}

export interface AuthContextInterface {
    authenticated: boolean;
    applicationHost: string;
    loginAccount: msal.AccountInfo | undefined;
    signIn: (silent: boolean) => Promise<void>;
    signOut: () => Promise<void>;
    getAccessToken: (authContext?: msal.AccountInfo, scope?: string) => Promise<string>;
    error: any;
}

export const AuthContext = React.createContext<AuthContextInterface>({} as AuthContextInterface);

export function AuthProvider({ children }: { children: any }) {

    const urlParams = new URLSearchParams(window.location.search);
    const applicationHost = urlParams?.get?.('appHost');

    const msalConfig = React.useMemo(() => {
        return {
            auth: {
                clientId: Config.AADClientID,
                authority: `${Config.AADLoginServer}/${Config.AADDirectoryID}`,
                redirectUri: Config.AADRedirectURI
            },
            cache: {
                cacheLocation: 'localStorage'
            }
        };
    }, []);

    const msalInstance = new msal.PublicClientApplication(msalConfig);

    async function signIn(silent = false) {
        if (state.authenticated) {
            return;
        }

        if(Config.AADClientID === '<your-AAD-client-id>'){
            setState({
                ...state,
                loginAccount: undefined,
                authenticated: true,
                error: {
                    message: 'Please update the config object in src/config.ts'
                }
            });
            return;
        }

        let loginAccount: msal.AuthenticationResult = {} as msal.AuthenticationResult;

        // @returns Token response or null. If the return value is null, then no auth redirect was detected.
        let res = await msalInstance.handleRedirectPromise();

        try {
            loginAccount = res
                ? (res as any).data.value[0]
                : msalInstance.getAllAccounts()[0];

            try {
                res = await getAccessTokenForScope({ silentFail: silent, msalInstance, scope: Scopes.Graph, options: loginAccount ? { account: loginAccount } : null });
            } catch (error) {
                //swallow error and try with a IoTCentral scope
                try {
                    res = await getAccessTokenForScope({ silentFail: silent, msalInstance, scope: Scopes.Central, options: loginAccount ? { account: loginAccount } : null });
                } catch (error) {
                    //swallow error and try with a ARM scope
                    res = await getAccessTokenForScope({ silentFail: silent, msalInstance, scope: Scopes.ARM, options: loginAccount ? { account: loginAccount } : null });
                }
            }

            // at this point we should have a token otherwise the catch will have thrown an error on the modal

            msalInstance.setActiveAccount(res?.account as msal.AccountInfo);

            setState({
                ...state,
                loginAccount: res?.account as msal.AccountInfo,
                authenticated: true,
                error: undefined
            });

        } catch (err) {
            setState({
                ...state,
                error: err,
            });
        }
    }

    async function getAccessToken(authContext?: msal.AccountInfo | undefined, scope?: string) {
        const res = await getAccessTokenForScope({ silentFail: true, msalInstance, scope: scope || Scopes.Central, options: { account: state.loginAccount || authContext } });
        return res?.accessToken;
    }

    async function signOut() {
        await msalInstance.logoutRedirect();
    }

    const [state, setState] = React.useState<AuthContextInterface>({
        authenticated: false,
        applicationHost: applicationHost || Config.applicationHost,
        loginAccount: undefined,
        signIn,
        signOut,
        getAccessToken,
        error: undefined,
    });

    return (
        <AuthContext.Provider value={state}>
            {children}
        </AuthContext.Provider>
    )
}

interface AccessTokenForScope {
    silentFail: boolean;
    msalInstance: msal.PublicClientApplication;
    scope: string;
    options: any;
}

async function getAccessTokenForScope({ msalInstance, scope, options }: AccessTokenForScope): Promise<msal.AuthenticationResult | null> {
    const tokenRequest = {
        scopes: Array.isArray(scope) ? scope : [scope],
        forceRefresh: false,
        redirectUri: Config.AADRedirectURI,
        ...options,
    };

    try {
        // try to get token silently if the user is already signed in
        return await msalInstance.acquireTokenSilent(tokenRequest);
    } catch (err) {
        console.log('login error', err);
        try {
            // show the login popup if the user is not signed in
            return await msalInstance.acquireTokenPopup(tokenRequest)
        } catch (error: any) {
            console.log('login error', error);
            if (error.name === 'BrowserAuthError') {
                return await msalInstance.acquireTokenPopup(tokenRequest);
            } else {
                throw error;
            }
        }
    }
}