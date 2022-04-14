import { Routes as ReactRoutes, Route, } from 'react-router-dom';
import NewMigration from '../pages/newMigration/newMigration';
import Status from '../pages/status/status';
import Shell from './shell';

export const Paths = {
    home: '/',
    status: '/status',
};

export function Routes({ appReady }: { appReady: boolean }) {

    return (
        <ReactRoutes>
            <Route path={Paths.home} element={appReady ? <NewMigration /> : <Shell />} />
            <Route path={Paths.status} element={appReady ? <Status /> : <Shell />} />
            <Route
                path="*"
                element={<Route path={Paths.home} element={<Shell />} />}
            />
        </ReactRoutes>
    );
}