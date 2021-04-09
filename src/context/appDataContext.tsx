import * as React from 'react';
import * as API from '../api';

export const AppDataContext = React.createContext({});

export class AppDataProvider extends React.Component {

    constructor(props: any) {
        super(props)
    }

    // turns the results array into an associative array with the id as key. Used for look ups
    getDeviceGroups = async (authContext: any) => {
        const groups = {};
        const res: any = await API.getGroups(authContext);
        for (const i in res) { groups[res[i].id] = res[i].displayName }
        return groups;
    }

    // turns the results array into an associative array with the id as key. Used for look ups
    getTemplates = async (authContext: any) => {
        const templates = {};
        const res: any = await API.getTemplates(authContext);
        for (const i in res) { templates[res[i].id] = res[i].displayName }
        return templates;
    }

    fetchAppData = async (authContext: any) => {
        const groups = await this.getDeviceGroups(authContext);
        const templates = await this.getTemplates(authContext);
        this.setState({ groups, templates, initialized: true });
    }

    state: any = {
        initialized: false,
        groups: {},
        templates: {},
        fetchAppData: this.fetchAppData
    }

    render() {
        return (
            <AppDataContext.Provider value={this.state}>
                {this.props.children}
            </AppDataContext.Provider>
        )
    }
}