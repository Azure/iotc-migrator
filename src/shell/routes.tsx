import { Switch, Route } from 'react-router-dom';
import NewMigration from '../pages/newMigration/newMigration';
import Status from '../pages/status/status';

export const Paths = {
    new: {
        index: '/',
    },
    status: {
        index: '/status',
    }
};

export function Routes({ application }: { application: string }) {
    return (
        <Switch>
            <Route exact path={Paths.new.index} component={NewMigration} />
            <Route path={Paths.status.index} component={Status} />
        </Switch>
    );
}