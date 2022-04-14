import * as React from 'react';
import * as IotcAPI from '../iotcAPI';
import { AuthContextInterface } from './authContext';


export interface AppDataContextInterface {
    appDataReady: boolean;
    groups: {key: string, text: string}[];
    templates: {key: string, text: string}[];
    fetchAppData: (authContext: AuthContextInterface) => Promise<void>;
    error: any;
}

export const AppDataContext = React.createContext<AppDataContextInterface>({} as AppDataContextInterface);

export function AppDataProvider({ children }: { children: any }) {

    // turns the results array into an associative array with the id as key. Used for look ups
    const getDeviceGroups = async (authContext: AuthContextInterface) => {
        const res = await IotcAPI.getGroups(authContext);
        return res.map(x => {
            return {
                key: x.id,
                text: x.displayName
            }; 
        });
    }

    // turns the results array into an associative array with the id as key. Used for look ups
    const getTemplates = async (authContext: AuthContextInterface) => {
        const res = await IotcAPI.getTemplates(authContext);
        return res.map(x => {
            return {
                key: x.id,
                text: x.displayName
            }; 
        });
    }

    // this works because its single app
    const fetchAppData = async (authContext: AuthContextInterface) => {
        try {
            const groups = await getDeviceGroups(authContext);
            const templates = await getTemplates(authContext);
            setAppState({
                ...appState,
                groups: groups || [],
                templates: templates || [],
                appDataReady: true,
                error: undefined
            });
        } catch (error) {
            setAppState({
                ...appState,
                appDataReady: false,
                error,
            });
        }
    }

    const [appState, setAppState] = React.useState<AppDataContextInterface>({
        appDataReady: false,
        groups: [],
        templates: [],
        fetchAppData,
        error: undefined
    });

    return (
        <AppDataContext.Provider value={appState}>
            {children}
        </AppDataContext.Provider>
    )
}