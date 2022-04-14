import { Routes as ReactRoutes, Route, } from 'react-router-dom';
import NewMigration from '../pages/newMigration/newMigration';
import Status from '../pages/status/status';
import Shell from './shell';

export const Paths = {
    home: '/',
    status: '/status',
};

export function Routes({ appReady }: { appReady: boolean }) {

    if (!appReady) {
        return <Shell />;
    }

    return (
        <ReactRoutes>
            <Route path={Paths.home} element={<NewMigration />} />
            <Route path={Paths.status} element={<Status />} />
        </ReactRoutes>
    );
}